// One place that assembles everything the ledger needs, so the creator
// dashboard, token pages and the admin harvest plan always agree.

import { getDbcClient, getLaunches, resolveBorrowerClaims, type LaunchSummary } from "@/lib/launchpad-onchain";
import { getCreatorQueues, type CoinQueue } from "@/lib/borrower-queue";
import { computeCoinLedger, type CoinLedger } from "@/lib/coin-ledger";
import { readAllClaimSnapshots } from "@/lib/claim-store";
import { getLoansById, type KivaLoanLive } from "@/lib/kiva-graphql";
import { getAllSuccessions } from "@/lib/succession-store";
import { getAllWaves } from "@/lib/waves";

export interface CoinPlan {
  mint: string;
  symbol: string;
  creator: string | null;
  queue: number[]; // creator queue, then operator fallback assignments
  queueMemoTx: string | null;
  ledger: CoinLedger;
  loans: Record<number, KivaLoanLive>; // launch borrower + queued borrowers
}

/**
 * Plans for the given coins (default: every listed coin). `launches` is the
 * full index, needed to know which borrowers other coins hold.
 */
export async function getCoinPlans(opts: {
  mints?: string[];
  solPrice: number;
  launches?: LaunchSummary[]; // pass an index you already fetched to avoid a second scan
}): Promise<Map<string, CoinPlan>> {
  const launches = opts.launches ?? (await getLaunches());
  const targets = launches.filter((l) => l.mint && (!opts.mints || opts.mints.includes(l.mint)));
  const plans = new Map<string, CoinPlan>();
  if (!targets.length) return plans;

  const { connection } = getDbcClient();
  // Each creator's history is scanned only until their listed coins' queues are found
  const mintsByCreator = new Map<string, string[]>();
  for (const l of targets) {
    if (!l.creator) continue;
    mintsByCreator.set(l.creator, [...(mintsByCreator.get(l.creator) ?? []), l.mint!]);
  }
  const queueMaps = await Promise.all(
    [...mintsByCreator].map(([c, mints]) =>
      getCreatorQueues(connection, c, mints).catch(() => new Map<string, CoinQueue>())
    )
  );
  const queueByMint = new Map<string, CoinQueue>();
  queueMaps.forEach((m) => m.forEach((q, mint) => queueByMint.set(mint, q)));

  // Operator picks: committed file + live picks from /admin
  const successions = await getAllSuccessions().catch(() => []);
  const queueFor = (l: LaunchSummary) => {
    const creatorQueue = queueByMint.get(l.mint!)?.loans ?? [];
    // Operator fallback picks (data/successions.json) run after the creator's own
    const operator = successions
      .filter((s) => s.mint === l.mint)
      .sort((a, b) => a.adopted_at.localeCompare(b.adopted_at))
      .map((s) => s.to_loan_id);
    return [...new Set([...creatorQueue, ...operator])].filter((id) => id !== l.loanId);
  };

  const ids = targets.flatMap((l) => [l.loanId, ...queueFor(l)]).filter(Boolean) as number[];
  const [loans, waves] = await Promise.all([
    ids.length ? getLoansById(ids).catch(() => new Map<number, KivaLoanLive>()) : new Map<number, KivaLoanLive>(),
    getAllWaves(),
  ]);
  // Committed claim files + one-click claims from /admin
  const snapshots = await readAllClaimSnapshots();
  const { holders } = resolveBorrowerClaims(launches);

  for (const l of targets) {
    const queue = queueFor(l);
    const takenByOthers = new Map<number, string>();
    for (const id of queue) {
      const holder = holders.get(id);
      if (holder && holder.mint !== l.mint) takenByOthers.set(id, holder.symbol);
    }
    const ledger = computeCoinLedger({
      mint: l.mint!,
      launchLoanId: l.loanId,
      queue,
      loans,
      takenByOthers,
      waves,
      snapshots,
      pendingVaultSol: l.pendingVaultSol,
      solPrice: opts.solPrice,
    });
    const own: Record<number, KivaLoanLive> = {};
    for (const id of [l.loanId, ...queue]) {
      const loan = id ? loans.get(id) : undefined;
      if (loan) own[loan.id] = loan;
    }
    plans.set(l.mint!, {
      mint: l.mint!,
      symbol: l.symbol,
      creator: l.creator,
      queue,
      queueMemoTx: queueByMint.get(l.mint!)?.memoTx ?? null,
      ledger,
      loans: own,
    });
  }
  return plans;
}
