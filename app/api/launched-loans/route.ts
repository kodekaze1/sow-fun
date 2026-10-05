import { NextResponse } from "next/server";
import { CLAIM_WINDOW_HOURS, CLAIM_MIN_FEES_SOL } from "@/lib/launchpad";
import { getLaunches, getLaunchesFresh, resolveBorrowerClaims } from "@/lib/launchpad-onchain";

// Which Kiva loans already have a coin. One coin per borrower: the picker
// uses this to mark claimed loans and link to the existing token instead.
// First launch per loan id is canonical (interface-level rule; the chain
// itself cannot prevent duplicates minted by direct contract calls), until
// its claim lapses (72h with negligible fees) - then the borrower reopens.
//
// ?fresh=1 bypasses every cache layer - the launch flow calls it right
// before minting. Errors return 503 (never an empty "nothing is taken"), so
// the pre-mint check fails closed; the picker treats 503 as unknown.

export async function GET(request: Request) {
  const fresh = new URL(request.url).searchParams.get("fresh") === "1";
  try {
    const launches = fresh ? await getLaunchesFresh() : await getLaunches();
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
      { headers: { "Cache-Control": fresh ? "no-store" : "s-maxage=30, stale-while-revalidate=30" } }
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "borrower index unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}
