// Harvest sync: turns loans funded from the sowfun Kiva account into harvest
// records, with no commit or deploy (see lib/harvest-auto.ts).
//
// For every loan in the sowfun lender profile that isn't recorded yet:
//   - it matches an open harvest-plan line (a coin's launch borrower or a
//     queued borrower with money planned) -> recorded "auto" with that line's
//     amount, coin and role, and the coin's plan shrinks accordingly
//   - it matches nothing -> recorded "review" (hidden from the public ledger
//     until the operator assigns or ignores it in /admin)
// Loans already in committed wave files (e.g. the founder-seeded genesis
// loans) are skipped.

import fs from "node:fs";
import path from "node:path";
import { KIVA_FETCH_HEADERS, KIVA_LENDER_ID, TEST_CONFIGS } from "@/lib/constants";
import { DBC_CONFIG_KEY } from "@/lib/launchpad";
import { getCoinPlans } from "@/lib/coin-plans";
import { getLaunchesFresh, getSolPrice } from "@/lib/launchpad-onchain";
import { getExpectedLends, getHarvestRecordsFresh, saveHarvestRecord, type HarvestRecord } from "@/lib/harvest-auto";
import type { UpliftWave } from "@/lib/waves";

interface KivaLenderLoan {
  id: number;
  name: string;
  loan_amount: number;
  location?: { country?: string };
  image?: { id?: number };
}

async function fetchLenderLoans(): Promise<KivaLenderLoan[]> {
  const out: KivaLenderLoan[] = [];
  for (let page = 1; page <= 20; page++) {
    const res = await fetch(`https://api.kivaws.org/v1/lenders/${KIVA_LENDER_ID}/loans.json?page=${page}`, {
      headers: KIVA_FETCH_HEADERS,
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Kiva lender loans: HTTP ${res.status}`);
    const data = (await res.json()) as { loans: KivaLenderLoan[]; paging: { page: number; pages: number } };
    out.push(...(data.loans ?? []));
    if (!data.paging || data.paging.page >= data.paging.pages) break;
  }
  return out;
}

function committedKivaIds(): Set<string> {
  const dir = path.join(process.cwd(), "data", "waves");
  if (!fs.existsSync(dir)) return new Set();
  return new Set(
    fs
      .readdirSync(dir)
      .filter((f) => f.endsWith(".json") && !f.endsWith(".fixture.json"))
      .flatMap((f) => (JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")) as UpliftWave).loans.map((l) => l.kiva_id))
  );
}

export interface SyncResult {
  checked: number; // loans in the lender profile
  recorded: { kiva_id: string; borrower: string; status: HarvestRecord["status"]; cents: number; symbol: string | null }[];
}

export async function runHarvestSync(): Promise<SyncResult> {
  const [lenderLoans, existing] = await Promise.all([fetchLenderLoans(), getHarvestRecordsFresh()]);
  const known = new Set([...committedKivaIds(), ...existing.map((r) => r.kiva_id)]);
  const fresh = lenderLoans.filter((l) => !known.has(String(l.id)));
  const result: SyncResult = { checked: lenderLoans.length, recorded: [] };
  if (!fresh.length) return result;

  // Open plan lines: loan id -> the coin and amount the plan set aside for it
  // Plans from every watched config (live + pilot), so pilot harvests match too
  const solPrice = await getSolPrice();
  const watched = [...new Set([DBC_CONFIG_KEY, ...TEST_CONFIGS.map((c) => c.key)].filter((c) => c && c.length >= 30))];
  const planMaps = await Promise.all(watched.map(async (c) => getCoinPlans({ solPrice, launches: await getLaunchesFresh(c) })));
  const lines = new Map<number, { mint: string; symbol: string; role: "pledge" | "excess"; cents: number }>();
  for (const p of planMaps.flatMap((m) => [...m.values()])) {
    const { pledge, queue } = p.ledger.plan;
    if (pledge && pledge.cents > 0 && !lines.has(pledge.loanId)) {
      lines.set(pledge.loanId, { mint: p.mint, symbol: p.symbol, role: "pledge", cents: pledge.cents });
    }
    for (const q of queue) {
      if (q.cents > 0 && !lines.has(q.loanId)) lines.set(q.loanId, { mint: p.mint, symbol: p.symbol, role: "excess", cents: q.cents });
    }
  }

  const now = new Date().toISOString();
  // Lends the operator funded the card for win over the live plan: a lend
  // that completes a loan removes it from the live plan before we look
  const expected = new Map<number, { mint: string; symbol: string; role: "pledge" | "excess"; cents: number }>();
  for (const e of (await getExpectedLends().catch(() => [])).sort((a, b) => a.at.localeCompare(b.at))) expected.set(e.loanId, e);
  for (const loan of fresh) {
    const line = expected.get(loan.id) ?? lines.get(loan.id);
    const record: HarvestRecord = {
      kiva_id: String(loan.id),
      status: line ? "auto" : "review",
      borrower: loan.name,
      location: loan.location?.country ?? "",
      photo_url: loan.image?.id ? `https://www.kiva.org/img/w480h360/${loan.image.id}.jpg` : null,
      total_loan_cents: Math.round(loan.loan_amount * 100),
      uplift_cents: line?.cents ?? 0,
      mint: line?.mint ?? null,
      symbol: line?.symbol ?? null,
      role: line?.role ?? null,
      detected_at: now,
      updated_at: now,
      ...(line ? {} : { note: "Not in any open harvest plan - assign a coin and amount, or ignore." }),
    };
    await saveHarvestRecord(record);
    result.recorded.push({ kiva_id: record.kiva_id, borrower: record.borrower, status: record.status, cents: record.uplift_cents, symbol: record.symbol });
  }
  return result;
}
