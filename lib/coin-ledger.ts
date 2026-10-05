// Per-coin impact ledger and next-harvest plan.
//
// Stateless: rebuilt on every request from public records only -
//   earned   <- data/claims/*.json  (treasury claim snapshots, per pool/mint)
//   deployed <- data/waves/*.json   (loans tagged with mint + role, skims)
//   needs    <- live Kiva loan status
//
// Allocation policy (OPERATIONS.md "Harvest allocation policy"):
//   1. The coin's launch borrower (its pledge) is funded first, up to what
//      their loan still needs.
//   2. Everything beyond that is EXCESS. 20% of every excess dollar is
//      skimmed to $SOW (half burned through the Furnace, half creator
//      rewards); 80% funds the creator's borrower queue, in order.
//   3. Queued borrowers who are no longer fundraising, or who are another
//      coin's launch borrower, are skipped.
//   4. Excess with nowhere to go waits; if the queue stays empty for
//      FALLBACK_HOURS after the claim that produced it, the operator funds a
//      borrower in the same Kiva category instead.

import fs from "node:fs";
import path from "node:path";
import type { UpliftWave } from "@/lib/waves";
import type { KivaLoanLive } from "@/lib/kiva-graphql";
import { CREATOR_FEE_PCT, IMPACT_FEE_PCT } from "@/lib/launchpad";

export const SOW_SKIM_PCT = 20; // of excess: 10 burn + 10 creator rewards
export const FALLBACK_HOURS = 72;

// Loan share of what the treasury claims: treasury holds the non-creator
// part of each fee (loans + ops), of which the loan share is IMPACT_FEE_PCT.
const LOAN_SHARE_OF_TREASURY = IMPACT_FEE_PCT / (100 - CREATOR_FEE_PCT);

interface ClaimSnapshot {
  claimed_at: string;
  sol_price_usd: number | null;
  pools: { mint: string | null; claimed_sol: number }[];
}

const CLAIMS_DIR = path.join(process.cwd(), "data", "claims");

export function readClaimSnapshots(): ClaimSnapshot[] {
  if (!fs.existsSync(CLAIMS_DIR)) return [];
  return fs
    .readdirSync(CLAIMS_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(fs.readFileSync(path.join(CLAIMS_DIR, f), "utf8")) as ClaimSnapshot);
}

export type QueueStatus = "fund" | "waiting" | "closed" | "taken" | "unknown";

export interface QueuePlanEntry {
  loanId: number;
  name: string | null;
  remainingCents: number;
  status: QueueStatus;
  cents: number; // planned for the next harvest
  takenBy?: string; // symbol of the coin that holds this borrower
}

export interface CoinLedger {
  earnedCents: number; // loan share of everything the treasury has claimed for this coin
  accruingCents: number; // loan share still unclaimed on-chain (estimate at current SOL price)
  deployedPledgeCents: number;
  deployedExcessCents: number;
  skimDoneCents: number;
  availableCents: number; // claimed but not yet deployed or skimmed
  excessEverCents: number;
  plan: {
    pledge: { loanId: number; name: string | null; cents: number } | null;
    skimCents: number;
    burnCents: number;
    rewardCents: number;
    queue: QueuePlanEntry[];
    waitingCents: number;
    fallbackAt: string | null; // ISO; set when excess waits with no eligible borrower
  };
  currentLoanId: number | null; // who this coin is funding now
  livesFunded: number; // distinct loans this coin has put money into
}

export function computeCoinLedger(input: {
  mint: string;
  launchLoanId: number | null;
  queue: number[];
  loans: Map<number, KivaLoanLive>;
  takenByOthers: Map<number, string>; // loan id -> symbol of another coin holding it
  waves: UpliftWave[];
  snapshots: ClaimSnapshot[];
  pendingVaultSol: number;
  solPrice: number;
}): CoinLedger {
  const { mint, launchLoanId, queue, loans, takenByOthers, waves, snapshots } = input;

  let earnedCents = 0;
  let lastClaimAt: string | null = null;
  for (const snap of snapshots) {
    for (const pool of snap.pools) {
      if (pool.mint !== mint || !snap.sol_price_usd) continue;
      earnedCents += Math.floor(pool.claimed_sol * LOAN_SHARE_OF_TREASURY * snap.sol_price_usd * 100);
      if (!lastClaimAt || snap.claimed_at > lastClaimAt) lastClaimAt = snap.claimed_at;
    }
  }
  const accruingCents = Math.floor(input.pendingVaultSol * LOAN_SHARE_OF_TREASURY * input.solPrice * 100);

  let deployedPledgeCents = 0;
  let deployedExcessCents = 0;
  let skimDoneCents = 0;
  const fundedLoans = new Set<string>();
  for (const wave of waves) {
    if (wave.status === "draft") continue;
    for (const loan of wave.loans) {
      if (loan.mint !== mint) continue;
      if (loan.role === "excess") deployedExcessCents += loan.uplift_cents;
      else deployedPledgeCents += loan.uplift_cents;
      fundedLoans.add(loan.kiva_id);
    }
    for (const skim of wave.skims ?? []) if (skim.mint === mint) skimDoneCents += skim.cents;
  }

  const availableCents = Math.max(0, earnedCents - deployedPledgeCents - deployedExcessCents - skimDoneCents);

  const launch = launchLoanId ? loans.get(launchLoanId) : undefined;
  const pledgeOpen = !!launch && launch.status === "fundraising" && launch.remaining > 0;
  const pledgeCents = pledgeOpen ? Math.min(availableCents, Math.round(launch!.remaining * 100)) : 0;

  const excessEverCents = Math.max(0, earnedCents - deployedPledgeCents - pledgeCents);
  const skimCents = Math.max(0, Math.round((excessEverCents * SOW_SKIM_PCT) / 100) - skimDoneCents);
  let budget = Math.max(0, excessEverCents - Math.round((excessEverCents * SOW_SKIM_PCT) / 100) - deployedExcessCents);

  const plannedQueue: QueuePlanEntry[] = queue.map((loanId) => {
    const loan = loans.get(loanId);
    const remainingCents = loan ? Math.round(loan.remaining * 100) : 0;
    const base = { loanId, name: loan?.name ?? null, remainingCents };
    if (!loan) return { ...base, status: "unknown" as const, cents: 0 };
    if (loan.status !== "fundraising" || loan.remaining <= 0) return { ...base, status: "closed" as const, cents: 0 };
    const holder = takenByOthers.get(loanId);
    if (holder) return { ...base, status: "taken" as const, cents: 0, takenBy: holder };
    const cents = Math.min(budget, remainingCents);
    budget -= cents;
    return { ...base, status: cents > 0 ? ("fund" as const) : ("waiting" as const), cents };
  });

  const hasEligible = plannedQueue.some((q) => q.status === "fund" || q.status === "waiting");
  const fallbackAt =
    budget > 0 && !hasEligible && lastClaimAt
      ? new Date(Date.parse(lastClaimAt) + FALLBACK_HOURS * 3600_000).toISOString()
      : null;

  const currentLoanId = pledgeOpen
    ? launchLoanId
    : plannedQueue.find((q) => q.status === "fund" || q.status === "waiting")?.loanId ?? null;

  return {
    earnedCents,
    accruingCents,
    deployedPledgeCents,
    deployedExcessCents,
    skimDoneCents,
    availableCents,
    excessEverCents,
    plan: {
      pledge: pledgeOpen ? { loanId: launchLoanId!, name: launch!.name, cents: pledgeCents } : null,
      skimCents,
      burnCents: Math.floor(skimCents / 2),
      rewardCents: skimCents - Math.floor(skimCents / 2),
      queue: plannedQueue,
      waitingCents: budget,
      fallbackAt,
    },
    currentLoanId,
    livesFunded: fundedLoans.size,
  };
}
