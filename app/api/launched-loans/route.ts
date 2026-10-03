import { NextResponse } from "next/server";
import { getLaunches } from "@/lib/launchpad-onchain";

// Which Kiva loans already have a coin. One coin per borrower: the picker
// uses this to mark claimed loans and link to the existing token instead.
// First launch per loan id is canonical (interface-level rule; the chain
// itself cannot prevent duplicates minted by direct contract calls).

export async function GET() {
  try {
    const launches = await getLaunches();
    const taken: Record<number, { mint: string | null; symbol: string; name: string }> = {};
    for (const l of launches) {
      if (l.loanId && !taken[l.loanId]) {
        taken[l.loanId] = { mint: l.mint, symbol: l.symbol, name: l.name };
      }
    }
    return NextResponse.json(
      { taken },
      { headers: { "Cache-Control": "s-maxage=60, stale-while-revalidate=120" } }
    );
  } catch {
    return NextResponse.json({ taken: {} });
  }
}
