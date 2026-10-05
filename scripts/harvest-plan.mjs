// Harvest plan -> draft wave. Reads the same per-coin plan the /admin console
// shows (lib/coin-ledger.ts via /api/admin/claims) and writes a pre-tagged
// draft wave record, so every loan carries its coin "mint" and "role" and every
// $SOW skim is listed - the per-coin ledger depends on those tags.
//
// Usage (after running claim-fees.mjs and committing its snapshot):
//   node scripts/harvest-plan.mjs                       # plan from the local dev server
//   SITE=https://sow.fun node scripts/harvest-plan.mjs  # plan from production
//
// Env: ADMIN_KEY (read from .env.local if unset), SITE (default http://localhost:3000).
//
// Output: data/waves/wave-NNN.json with status "draft" (drafts never show on
// the site). Fund each loan on Kiva (credit team sow.fun at checkout), run
// buyback-burn.mjs per skim, then fill in verification + tx hashes, set the
// status to "funding" or "funded", and commit.

import fs from "node:fs";
import path from "node:path";

function readEnvLocal(name) {
  try {
    const line = fs.readFileSync(".env.local", "utf8").split(/\r?\n/).find((l) => l.startsWith(`${name}=`));
    return line ? line.slice(name.length + 1).trim() : undefined;
  } catch {
    return undefined;
  }
}

const SITE = (process.env.SITE ?? "http://localhost:3000").replace(/\/$/, "");
const ADMIN_KEY = process.env.ADMIN_KEY ?? readEnvLocal("ADMIN_KEY");
if (!ADMIN_KEY) {
  console.error("Set ADMIN_KEY (or add it to .env.local)");
  process.exit(1);
}

const res = await fetch(`${SITE}/api/admin/claims`, { headers: { "x-admin-key": ADMIN_KEY } });
const data = await res.json().catch(() => null);
if (!res.ok || !data) {
  console.error(`plan request failed (${res.status}): ${JSON.stringify(data)}`);
  process.exit(1);
}
if (data.notice) {
  console.log(data.notice);
  process.exit(0);
}

const loans = [];
const skims = [];
const waiting = [];
for (const row of data.pools ?? []) {
  const plan = row.plan;
  if (!plan || !row.mint) continue;
  const tag = { mint: row.mint };
  if (plan.pledge && plan.pledge.cents > 0) {
    loans.push({ ...tag, role: "pledge", kiva_id: String(plan.pledge.loanId), borrower: plan.pledge.name ?? "", uplift_cents: plan.pledge.cents, coin: `$${row.symbol}` });
  }
  for (const q of plan.queue ?? []) {
    if (q.cents > 0) loans.push({ ...tag, role: "excess", kiva_id: String(q.loanId), borrower: q.name ?? "", uplift_cents: q.cents, coin: `$${row.symbol}` });
  }
  if (plan.skimCents > 0) skims.push({ ...tag, cents: plan.skimCents, buy_tx: "", burn_tx: "", coin: `$${row.symbol}` });
  if (plan.waitingCents > 0) waiting.push({ coin: `$${row.symbol}`, cents: plan.waitingCents, fallbackAt: plan.fallbackAt });
}

if (!loans.length && !skims.length) {
  console.log("Nothing to deploy: no claimed, undeployed funds with an eligible borrower.");
  if (waiting.length) console.log("Waiting (no eligible borrower):", waiting);
  process.exit(0);
}

const wavesDir = path.join(process.cwd(), "data", "waves");
const numbers = fs.readdirSync(wavesDir)
  .map((f) => /^wave-(\d+)\.json$/.exec(f)?.[1])
  .filter(Boolean)
  .map(Number);
const next = (numbers.length ? Math.max(...numbers) : 0) + 1;
const id = `wave-${String(next).padStart(3, "0")}`;
const now = new Date().toISOString();

const wave = {
  id,
  wave_number: next,
  status: "draft",
  display: { headline: `Harvest #${String(next).padStart(3, "0")}`, summary: "", countries: [], sectors: [] },
  timestamps: { started: now, last_checked: now },
  movements: [],
  loans: loans.map(({ coin, ...l }) => ({
    ...l,
    status: "funding",
    location: "",
    total_loan_cents: 0,
    repaid_cents: 0,
    verification: { verified: false, verified_at: "", source_urls: [`https://www.kiva.org/lend/${l.kiva_id}`] },
    notes: `Funded by ${coin} (${l.role})`,
  })),
  skims: skims.map(({ coin, ...s }) => s),
  totals: {
    uplift_deployed_cents: loans.reduce((a, l) => a + l.uplift_cents, 0),
    loan_principal_supported_cents: 0,
  },
};

const file = path.join(wavesDir, `${id}.json`);
fs.writeFileSync(file, JSON.stringify(wave, null, 2) + "\n");

const usd = (c) => `$${(c / 100).toFixed(2)}`;
console.log(`draft written: ${file}\n`);
console.log("Fund on Kiva (credit team sow.fun at checkout):");
for (const l of loans) console.log(`  ${usd(l.uplift_cents).padStart(10)}  #${l.kiva_id} ${l.borrower}  <- ${l.coin} (${l.role})`);
if (skims.length) {
  console.log("\n$SOW skims (buyback-burn.mjs with COIN_MINT=<mint>; half burned, half creator rewards):");
  for (const s of skims) console.log(`  ${usd(s.cents).padStart(10)}  ${s.coin}  ${s.mint}`);
}
if (waiting.length) {
  console.log("\nWaiting (no eligible borrower):");
  for (const w of waiting) console.log(`  ${usd(w.cents).padStart(10)}  ${w.coin}${w.fallbackAt ? `  creator deadline ${w.fallbackAt}` : ""}`);
}
console.log(`\nTotal to lend: ${usd(wave.totals.uplift_deployed_cents)}`);
