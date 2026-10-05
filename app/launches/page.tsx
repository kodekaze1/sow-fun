import Link from "next/link";
import Icon from "@/components/icons";
import { getLaunches, getSolPrice } from "@/lib/launchpad-onchain";
import { getLoansById } from "@/lib/kiva-graphql";
import { COUNTRY_FLAGS } from "@/lib/types";

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

      <div className="max-w-4xl mx-auto px-6 py-12">
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
          <div className="grid sm:grid-cols-2 gap-5">
            {launches.map((launch, i) => {
              const loan = launch.loanId ? loans.get(launch.loanId) : undefined;
              const pct = loan && loan.loanAmount > 0 ? Math.round((loan.fundedAmount / loan.loanAmount) * 100) : 0;
              const img = launch.image ?? loan?.image ?? null;
              return (
                <Link key={launch.pool} href={launch.mint ? `/t/${launch.mint}` : "#"} data-reveal
                  className="bg-white rounded-2xl border border-[#E4EBE7] shadow-[0_4px_15px_rgba(0,0,0,0.05)] overflow-hidden hover:border-[#276A43] hover:shadow-[0_10px_28px_rgba(34,56,41,0.12)] transition-all">
                  {img && <img src={img} alt="" className="w-full h-44 object-cover" />}
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-[#223829]">
                        {i === 0 && <span className="text-[#F8CD69] mr-1">★</span>}
                        {launch.name} <span className="font-mono text-xs text-[#276A43]">${launch.symbol}</span>
                      </span>
                      <span className="text-sm font-extrabold text-[#223829]">
                        ≈ ${(launch.impactShareSol * solPrice).toFixed(0)}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mb-3">
                      {loan
                        ? <>for {loan.name} {COUNTRY_FLAGS[loan.country] ?? ""} · {loan.status}</>
                        : launch.borrowerName
                          ? <>for {launch.borrowerName}</>
                          : "independent launch"}
                    </div>
                    {loan && (
                      <>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-[#2AA967] rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <div className="text-[11px] text-gray-400 mt-1">{pct}% of ${loan.loanAmount.toFixed(0)} loan funded on Kiva</div>
                      </>
                    )}
                    <div className="flex justify-between text-[11px] text-gray-400 mt-3">
                      <span>{launch.lifetimeFeesSol.toFixed(3)} SOL lifetime fees</span>
                      <span className="text-[#276A43] font-bold">View token →</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
