// One place that assembles everything the ledger needs, so the creator
// dashboard, token pages and the admin harvest plan always agree.

import { getDbcClient, getLaunches, resolveBorrowerClaims, type LaunchSummary } from "@/lib/launchpad-onchain";
import { getCreatorQueues, type CoinQueue } from "@/lib/borrower-queue";
import { computeCoinLedger, readClaimSnapshots, type CoinLedger } from "@/lib/coin-ledger";
import { getLoansById, type KivaLoanLive } from "@/lib/kiva-graphql";
import { getSuccessionChain } from "@/lib/impact-ledger";
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
export async function getCoinPlans(opts: { mints?: string[]; solPrice: number }): Promise<Map<string, CoinPlan>> {
  const launches = await getLaunches();
  const targets = launches.filter((l) => l.mint && (!opts.mints || opts.mints.includes(l.mint)));
  const plans = new Map<string, CoinPlan>();
  if (!targets.length) return plans;

  const { connection } = getDbcClient();
  const creators = [...new Set(targets.map((l) => l.creator).filter(Boolean) as string[])];
  const queueMaps = await Promise.all(
    creators.map((c) => getCreatorQueues(connection, c).catch(() => new Map<string, CoinQueue>()))
  );
  const queueByMint = new Map<string, CoinQueue>();
  queueMaps.forEach((m) => m.forEach((q, mint) => queueByMint.set(mint, q)));

  const queueFor = (l: LaunchSummary) => {
    const creatorQueue = queueByMint.get(l.mint!)?.loans ?? [];
    // Operator fallback picks (data/successions.json) run after the creator's own
    const operator = getSuccessionChain(l.mint!).map((s) => s.to_loan_id);
    return [...new Set([...creatorQueue, ...operator])].filter((id) => id !== l.loanId);
  };

  const ids = targets.flatMap((l) => [l.loanId, ...queueFor(l)]).filter(Boolean) as number[];
  const [loans, waves] = await Promise.all([
    ids.length ? getLoansById(ids).catch(() => new Map<number, KivaLoanLive>()) : new Map<number, KivaLoanLive>(),
    getAllWaves(),
  ]);
  const snapshots = readClaimSnapshots();
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
