import { NextResponse } from "next/server";
import { CLAIM_WINDOW_HOURS, CLAIM_MIN_FEES_SOL } from "@/lib/launchpad";
import { getLaunches, resolveBorrowerClaims } from "@/lib/launchpad-onchain";

// Which Kiva loans already have a coin. One coin per borrower: the picker
// uses this to mark claimed loans and link to the existing token instead.
// First launch per loan id is canonical (interface-level rule; the chain
// itself cannot prevent duplicates minted by direct contract calls), until
// its claim lapses (72h with negligible fees) - then the borrower reopens.

export async function GET() {
  try {
    const launches = await getLaunches();
    const { holders } = resolveBorrowerClaims(launches);
    const taken: Record<number, { mint: string | null; symbol: string; name: string; claimEndsAt: number | null }> = {};
    for (const [loanId, l] of holders) {
      // While a coin is inside its window with low fees, show when the claim could lapse
      const atRisk = !l.migrated && l.launchedAt && l.lifetimeFeesSol < CLAIM_MIN_FEES_SOL;
      taken[loanId] = {
        mint: l.mint,
        symbol: l.symbol,
        name: l.name,
        claimEndsAt: atRisk ? l.launchedAt! + CLAIM_WINDOW_HOURS * 3600 : null,
      };
    }
    return NextResponse.json(
      { taken },
      { headers: { "Cache-Control": "s-maxage=60, stale-while-revalidate=120" } }
    );
  } catch {
    return NextResponse.json({ taken: {} });
  }
}
