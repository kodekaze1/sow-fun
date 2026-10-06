// Auto-recorded harvest loans, stored in Vercel Blob so they reach the
// Harvest Ledger without a commit or deploy.
//
// The harvest sync (lib/harvest-sync.ts) watches the sowfun lender profile on
// Kiva. A newly funded loan that matches an open harvest-plan line is recorded
// with the plan's amount, coin and role ("auto"); one that matches nothing
// waits in /admin as "review" until the operator assigns or ignores it. Kiva
// never exposes how much a lender put into a loan - funding exactly what the
// plan lists is what keeps these amounts true.
//
// Every write is a NEW blob (harvest/loans/<kivaId>/<timestamp>.json), never
// an overwrite, so reads are never served a stale cached version. The newest
// version per loan wins.

import { list, put } from "@vercel/blob";
import { revalidateTag, unstable_cache } from "next/cache";
import type { UpliftWave } from "@/lib/waves";

export type HarvestRecordStatus = "auto" | "confirmed" | "review" | "ignored";

export interface HarvestRecord {
  kiva_id: string;
  status: HarvestRecordStatus;
  borrower: string;
  location: string;
  photo_url: string | null;
  total_loan_cents: number;
  uplift_cents: number; // what sow.fun lent (from the plan, or set in review)
  mint: string | null; // coin whose impact share paid
  symbol: string | null;
  role: "pledge" | "excess" | null;
  detected_at: string; // first seen in the sowfun lender profile
  updated_at: string;
  note?: string;
}

const PREFIX = "harvest/loans/";
export const HARVEST_TAG = "harvest-records";

async function loadRecords(): Promise<HarvestRecord[]> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return [];
  const blobs: { pathname: string; url: string; uploadedAt: Date }[] = [];
  let cursor: string | undefined;
  do {
    const page = await list({ prefix: PREFIX, cursor, limit: 1000 });
    blobs.push(...page.blobs);
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);

  // Newest version per loan
  const latest = new Map<string, { url: string; at: number }>();
  for (const b of blobs) {
    const kivaId = b.pathname.slice(PREFIX.length).split("/")[0];
    const at = new Date(b.uploadedAt).getTime();
    const cur = latest.get(kivaId);
    if (!cur || at > cur.at) latest.set(kivaId, { url: b.url, at });
  }
  const records = await Promise.all(
    [...latest.values()].map(async ({ url }) => {
      try {
        const res = await fetch(url, { cache: "no-store" });
        return res.ok ? ((await res.json()) as HarvestRecord) : null;
      } catch {
        return null;
      }
    })
  );
  return records.filter((r): r is HarvestRecord => r !== null);
}

const loadRecordsCached = unstable_cache(loadRecords, ["harvest-records"], { revalidate: 300, tags: [HARVEST_TAG] });

/** All records, any status (admin). Cached 5 min; writes refresh it. */
export async function getHarvestRecords(): Promise<HarvestRecord[]> {
  try {
    return await loadRecordsCached();
  } catch {
    // Outside a Next request (scripts) the data cache is unavailable
    return loadRecords().catch(() => []);
  }
}

/** Uncached - for the sync, which must not record a loan twice. */
export function getHarvestRecordsFresh(): Promise<HarvestRecord[]> {
  return loadRecords();
}

export async function saveHarvestRecord(record: HarvestRecord): Promise<void> {
  const stamped = { ...record, updated_at: new Date().toISOString() };
  await put(`${PREFIX}${record.kiva_id}/${Date.now()}.json`, JSON.stringify(stamped), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: false,
  });
  try {
    // Expire now: the operator expects the dashboard to show a save at once
    revalidateTag(HARVEST_TAG, { expire: 0 });
  } catch {
    /* outside a request - the 5 min cache expires on its own */
  }
}

/**
 * Counted records as harvest waves (one per UTC day), numbered after the
 * committed waves so the public ledger reads as one sequence. "review" and
 * "ignored" records never appear publicly.
 */
export function recordsToWaves(records: HarvestRecord[], afterWaveNumber: number): UpliftWave[] {
  const counted = records.filter((r) => r.status === "auto" || r.status === "confirmed");
  const byDay = new Map<string, HarvestRecord[]>();
  for (const r of counted) {
    const day = r.detected_at.slice(0, 10);
    byDay.set(day, [...(byDay.get(day) ?? []), r]);
  }
  const days = [...byDay.keys()].sort();
  return days.map((day, i) => {
    const loans = byDay.get(day)!;
    const deployed = loans.reduce((s, l) => s + l.uplift_cents, 0);
    const countries = [...new Set(loans.map((l) => l.location).filter(Boolean))];
    return {
      id: `harvest-${day}`,
      wave_number: afterWaveNumber + i + 1,
      status: "funded",
      display: {
        headline: `Harvest ${day}`,
        summary: "Trading fees from sow.fun coins, lent on Kiva and verified against the sowfun lender profile.",
        countries,
        sectors: [],
      },
      timestamps: { started: `${day}T00:00:00Z`, last_checked: loans[0].updated_at },
      movements: loans.map((l) => ({
        direction: "outflow" as const,
        type: "kiva_funding" as const,
        asset: "USD",
        amount_raw: String(l.uplift_cents),
        value_cents: l.uplift_cents,
      })),
      loans: loans.map((l) => ({
        kiva_id: l.kiva_id,
        status: "funded" as const,
        borrower: l.borrower,
        location: l.location,
        uplift_cents: l.uplift_cents,
        total_loan_cents: l.total_loan_cents,
        repaid_cents: 0,
        ...(l.photo_url ? { photo_url: l.photo_url } : {}),
        verification: {
          verified: true,
          verified_at: l.detected_at,
          source_urls: [`https://www.kiva.org/lend/${l.kiva_id}`, "https://www.kiva.org/lender/sowfun"],
        },
        ...(l.mint ? { mint: l.mint } : {}),
        ...(l.role ? { role: l.role } : {}),
      })),
      totals: {
        uplift_deployed_cents: deployed,
        loan_principal_supported_cents: loans.reduce((s, l) => s + l.total_loan_cents, 0),
      },
    };
  });
}
