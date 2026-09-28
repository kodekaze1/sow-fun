import { NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { getLaunchesByCreator, getSolPrice } from "@/lib/launchpad-onchain";
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
