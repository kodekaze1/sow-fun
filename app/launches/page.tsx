import Link from "next/link";
import Icon from "@/components/icons";
import { getLaunches, getSolPrice } from "@/lib/launchpad-onchain";
import { getLoansById } from "@/lib/kiva-graphql";
import { COUNTRY_FLAGS } from "@/lib/types";
import { Suspense } from "react";
import LaunchesBoard, { type BoardItem } from "@/components/LaunchesBoard";

export const revalidate = 60;

export const metadata = {
  title: "Live Launches | sow.fun",
  description: "Every token launched on sow.fun, the borrower it funds, and the impact it has generated so far.",
};

export default async function LaunchesPage() {
  const [launches, solPrice] = await Promise.all([
    getLaunches().catch(() => []),
    getSolPrice(),
  ]);
  const loans = await getLoansById(launches.map((l) => l.loanId ?? 0)).catch(() => new Map());

  const totalImpactUsd = launches.reduce((s, l) => s + l.impactShareSol * solPrice, 0);

  // Plain rows for the client board (search / sort / filter)
  const items: BoardItem[] = launches.filter((l) => l.mint).map((l) => {
    const loan = l.loanId ? loans.get(l.loanId) : undefined;
    const taken = loan ? loan.fundedAmount + (loan.reservedAmount ?? 0) : 0;
    const raising = !!loan && loan.status === "fundraising" && loan.remaining > 0;
    const done = !!loan && (loan.status === "funded" || (loan.status === "fundraising" && loan.remaining <= 0));
    return {
      mint: l.mint!,
      name: l.name,
      symbol: l.symbol,
      image: l.image ?? loan?.image ?? null,
      borrower: loan?.name ?? l.borrowerName,
      flag: loan ? COUNTRY_FLAGS[loan.country] ?? "" : "",
      loanAmount: loan?.loanAmount ?? 0,
      pct: loan && loan.loanAmount > 0 ? Math.round((taken / loan.loanAmount) * 100) : 0,
      remaining: loan?.remaining ?? 0,
      done,
      raising,
      earnedUsd: l.impactShareSol * solPrice,
      marketCapUsd: l.marketCapSol !== null && l.marketCapSol !== undefined ? l.marketCapSol * solPrice : null,
      migrated: l.migrated,
      launchedAt: l.launchedAt,
    };
  });

  return (
    <div className="min-h-screen bg-white">
      {/* HERO */}
      <div className="bg-[#223829] text-[#EDF4F1] pt-12 pb-10 px-6 text-center">
        <div className="max-w-2xl mx-auto flex flex-col items-center gap-4">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/15 rounded-full px-4 py-1.5 text-[11px] font-semibold uppercase tracking-widest">
            {launches.length} launch{launches.length === 1 ? "" : "es"} · ≈ ${totalImpactUsd.toFixed(0)} impact generated
          </div>
          <h1 className="font-serif text-4xl md:text-5xl font-medium tracking-tight leading-[1.1] [text-wrap:balance]">
            Live launches, <span className="italic text-[#F8CD69]">real beneficiaries.</span>
          </h1>
          <p className="opacity-85 max-w-lg leading-relaxed [text-wrap:balance]">
            Every token here carries an immutable pledge to a real borrower on Kiva.
            The leaderboard is simple: who lifted the most lives.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12">
        {launches.length === 0 ? (
          <div className="py-20 text-center">
            <img src="/images/illustrations/plant-coin.png" alt="" aria-hidden="true"
              className="w-32 mx-auto mb-6 rotate-[-3deg] mix-blend-multiply" />
            <h2 className="font-serif text-2xl font-semibold mb-3">No launches yet - the soil is ready.</h2>
            <p className="text-gray-500 text-sm mb-8 max-w-md mx-auto">
              The first token launched here becomes the genesis of the board. Its borrower becomes the first story.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/launch"
                className="inline-flex items-center gap-2 bg-[#276A43] hover:bg-[#223829] text-white rounded-full px-7 py-3 text-sm font-bold transition-colors">
                Launch the first coin
                <Icon name="arrow" className="w-4 h-4" />
              </Link>
              <Link href="/t/demo"
                className="inline-flex items-center gap-2 border border-[#D9E6DF] hover:border-[#276A43] text-[#223829] rounded-full px-7 py-3 text-sm font-bold transition-colors">
                Preview a token page
              </Link>
            </div>
          </div>
        ) : (
          <Suspense fallback={<div className="py-16 text-center text-sm text-gray-400">Loading launches...</div>}>
            <LaunchesBoard items={items} />
          </Suspense>
        )}
      </div>
    </div>
  );
}
