import { NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { getLaunchesByCreator, getSolPrice, getDbcClient, isClaimLapsed } from "@/lib/launchpad-onchain";
import { getOwnerPositions, unclaimedSolLamports } from "@/lib/damm-v2.mjs";
import { getLoansById } from "@/lib/kiva-graphql";
import { getActiveSuccession, getRewardsForCreator } from "@/lib/impact-ledger";

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
    const withSuccession = launches.map((l) => {
      const succession = l.mint ? getActiveSuccession(l.mint) : null;
      return { ...l, activeLoanId: succession?.to_loan_id ?? l.loanId, succession };
    });
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

    return NextResponse.json({
      launches: enriched,
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
