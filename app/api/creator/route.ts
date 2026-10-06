import { NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { getLaunchesByCreator, getSolPrice, getDbcClient, isClaimLapsed } from "@/lib/launchpad-onchain";
import { getOwnerPositions, unclaimedSolLamports } from "@/lib/damm-v2.mjs";
import { getLoansById } from "@/lib/kiva-graphql";
import { getRewardsForCreator } from "@/lib/impact-ledger";
import { getSuccessionChainLive } from "@/lib/succession-store";
import { getCoinPlans } from "@/lib/coin-plans";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address") ?? "";
  try {
    new PublicKey(address);
  } catch {
    return NextResponse.json({ error: "invalid address" }, { status: 400 });
  }
  try {
    const [launches, solPrice] = await Promise.all([getLaunchesByCreator(address), getSolPrice()]);

    // Graduated coins earn through the creator's permanently locked DAMM v2
    // LP position instead of the bonding curve - surface those fees too.
    const lpByMint = new Map<string, { pool: string; lamports: string; sol: number }>();
    const coinMints = new Set(launches.map((l) => l.mint).filter(Boolean) as string[]);
    if (coinMints.size) {
      const { connection } = getDbcClient();
      const positions = await getOwnerPositions(connection, new PublicKey(address)).catch(() => []);
      for (const p of positions) {
        const mint = [p.pool.tokenAMint.toBase58(), p.pool.tokenBMint.toBase58()].find((m) => coinMints.has(m));
        if (!mint) continue;
        const prev = lpByMint.get(mint);
        const total = unclaimedSolLamports(p).add(new BN(prev?.lamports ?? "0"));
        lpByMint.set(mint, { pool: p.poolAddress.toBase58(), lamports: total.toString(), sol: total.toNumber() / 1e9 });
      }
    }

    // Resolve each coin's ACTIVE loan (after any adoptions) and its live
    // Kiva status, so the dashboard can prompt adoption when a loan closes.
    const withSuccession = await Promise.all(
      launches.map(async (l) => {
        const chain = l.mint ? await getSuccessionChainLive(l.mint).catch(() => []) : [];
        const succession = chain.length ? chain[chain.length - 1] : null;
        return { ...l, activeLoanId: succession?.to_loan_id ?? l.loanId, succession };
      })
    );
    const loanIds = [...new Set(withSuccession.map((l) => l.activeLoanId).filter(Boolean))] as number[];
    const loans = loanIds.length ? await getLoansById(loanIds).catch(() => new Map()) : new Map();

    const enriched = withSuccession.map((l) => {
      const loan = l.activeLoanId ? loans.get(l.activeLoanId) : undefined;
      return {
        ...l,
        loanStatus: loan?.status ?? null,
        loanRemaining: loan?.remaining ?? null,
        activeBorrowerName: loan?.name ?? l.succession?.borrower ?? l.borrowerName,
        claimLapsed: isClaimLapsed(l),
        dammPool: (l.mint && lpByMint.get(l.mint)?.pool) || null,
        lpPendingLamports: (l.mint && lpByMint.get(l.mint)?.lamports) || "0",
        lpPendingSol: (l.mint && lpByMint.get(l.mint)?.sol) || 0,
      };
    });

    // Borrower queue + impact ledger per coin (on-chain queue memos, claim
    // snapshots, harvest records, live Kiva status)
    const mints = enriched.map((l) => l.mint).filter(Boolean) as string[];
    const plans = mints.length ? await getCoinPlans({ mints, solPrice }).catch(() => new Map()) : new Map();
    const withPlans = enriched.map((l) => {
      const plan = l.mint ? plans.get(l.mint) : undefined;
      // Who the coin funds now: launch borrower, then the on-chain queue
      const cur = plan?.ledger.currentLoanId ?? null;
      const curLoan = cur ? plan?.loans[cur] : undefined;
      const launchLoan = l.loanId ? plan?.loans[l.loanId] : undefined;
      return {
        ...l,
        ...(curLoan ? { activeLoanId: cur, loanStatus: curLoan.status, loanRemaining: curLoan.remaining, activeBorrowerName: curLoan.name } : {}),
        // The 3-coin wallet cap counts launch-borrower claims only
        launchLoanStatus: launchLoan?.status ?? (l.activeLoanId === l.loanId ? l.loanStatus : null),
        queue: plan?.queue ?? [],
        queueMemoTx: plan?.queueMemoTx ?? null,
        ledger: plan?.ledger ?? null,
        queueLoans: plan ? Object.values(plan.loans) : [],
      };
    });

    return NextResponse.json({
      launches: withPlans,
      solPrice,
      rewards: getRewardsForCreator(address),
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "failed to load" },
      { status: 500 }
    );
  }
}
