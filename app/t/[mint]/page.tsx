import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Icon from "@/components/icons";
import { getLaunchByMint, getSolPrice } from "@/lib/launchpad-onchain";
import { getLoansById } from "@/lib/kiva-graphql";
import { CREATOR_FEE_PCT, IMPACT_FEE_PCT, OPS_FEE_PCT, POOL_FEE_BPS, SITE_URL } from "@/lib/launchpad";
import { COUNTRY_FLAGS } from "@/lib/types";

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ mint: string }> }): Promise<Metadata> {
  const { mint } = await params;
  const launch = await getLaunchByMint(mint).catch(() => null);
  if (!launch) return { title: "Token not found | sow.fun" };
  const who = launch.borrowerName ? ` for ${launch.borrowerName}` : "";
  return {
    title: `${launch.name} ($${launch.symbol}) | sow.fun`,
    description: `${IMPACT_FEE_PCT}% of every $${launch.symbol} trade funds${who ? ` ${launch.borrowerName}'s` : " a"} Kiva loan - locked at launch, verifiable forever.`,
    openGraph: launch.image ? { images: [{ url: launch.image }] } : undefined,
  };
}

export default async function TokenPage({ params }: { params: Promise<{ mint: string }> }) {
  const { mint } = await params;
  const launch = await getLaunchByMint(mint).catch(() => null);
  if (!launch) notFound();

  const [loans, solPrice] = await Promise.all([
    getLoansById(launch.loanId ? [launch.loanId] : []).catch(() => new Map()),
    getSolPrice(),
  ]);
  const loan = launch.loanId ? loans.get(launch.loanId) : undefined;
  const pct = loan && loan.loanAmount > 0 ? Math.round((loan.fundedAmount / loan.loanAmount) * 100) : 0;
  const img = launch.image ?? loan?.image ?? "/sow-logo.png";

  const shareText = `$${launch.symbol} on @sowfunhq - ${IMPACT_FEE_PCT}% of every trade funds ${loan?.name ?? launch.borrowerName ?? "a Kiva borrower"}'s microloan. Locked at launch, verifiable forever.`;
  const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(`${SITE_URL}/t/${launch.mint}`)}`;

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-12">
        {/* TOKEN HEAD */}
        <div className="flex items-center gap-5 mb-8">
          <img src={img} alt={launch.name} className="w-20 h-20 rounded-3xl object-cover shadow-[0_4px_15px_rgba(0,0,0,0.08)]" />
          <div>
            <h1 className="font-serif text-3xl md:text-4xl font-medium tracking-tight">{launch.name}</h1>
            <div className="flex items-center gap-3 mt-1">
              <span className="font-mono text-sm font-bold text-[#276A43]">${launch.symbol}</span>
              <span className="text-xs font-bold bg-[#EDF4F1] text-[#276A43] px-2.5 py-0.5 rounded-full">
                Meteora DBC · {POOL_FEE_BPS / 100}% fee
              </span>
            </div>
          </div>
        </div>

        {/* ACTIONS */}
        <div className="flex flex-wrap gap-3 mb-10">
          <a href={`https://jup.ag/swap/SOL-${launch.mint}`} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-[#276A43] hover:bg-[#223829] text-white rounded-full px-6 py-2.5 text-sm font-bold transition-colors">
            Trade on Jupiter <Icon name="arrow" className="w-4 h-4" />
          </a>
          <a href={shareUrl} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 border border-[#D9E6DF] hover:border-[#276A43] rounded-full px-6 py-2.5 text-sm font-bold transition-colors">
            Share on X
          </a>
          {launch.mint && (
            <a href={`https://solscan.io/token/${launch.mint}`} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-[#276A43] px-2 py-2.5 transition-colors">
              Solscan ↗
            </a>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-10">
          {/* BORROWER */}
          <div className="bg-[#EDF4F1] rounded-2xl p-6">
            <div className="text-xs font-black uppercase tracking-widest text-[#276A43] mb-3">Beneficiary</div>
            {loan ? (
              <>
                <div className="flex items-center gap-3 mb-3">
                  {loan.image && <img src={loan.image} alt={loan.name} className="w-14 h-14 rounded-xl object-cover" />}
                  <div>
                    <div className="font-bold text-[#223829]">{loan.name} {COUNTRY_FLAGS[loan.country] ?? ""}</div>
                    <div className="text-xs text-gray-500">{loan.country} · Kiva loan #{loan.id} · {loan.status}</div>
                  </div>
                </div>
                <p className="text-[13px] text-[#223829]/75 leading-relaxed italic mb-4">
                  &quot;A loan {loan.use}&quot;
                </p>
                <div className="h-2 bg-white rounded-full overflow-hidden">
                  <div className="h-full bg-[#2AA967] rounded-full" style={{ width: `${pct}%` }} />
                </div>
                <div className="flex justify-between text-[11px] text-gray-500 mt-1.5 mb-4">
                  <span>{pct}% funded on Kiva</span>
                  <span>${loan.remaining.toFixed(0)} to go</span>
                </div>
                <a href={`https://www.kiva.org/lend/${loan.id}`} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-bold text-[#276A43] hover:underline">
                  View the loan on Kiva <Icon name="arrow" className="w-3.5 h-3.5" />
                </a>
              </>
            ) : (
              <p className="text-sm text-gray-500">
                {launch.borrowerName
                  ? `Pledged to ${launch.borrowerName} - loan details syncing from Kiva.`
                  : "This token was launched without a named beneficiary in its metadata."}
              </p>
            )}
          </div>

          {/* IMPACT */}
          <div className="bg-white rounded-2xl border border-[#E4EBE7] shadow-[0_4px_15px_rgba(0,0,0,0.05)] p-6">
            <div className="text-xs font-black uppercase tracking-widest text-[#276A43] mb-3">Impact engine</div>
            <div className="flex flex-col gap-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Lifetime trading fees</span>
                <span className="font-black">{launch.lifetimeFeesSol.toFixed(4)} SOL</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Impact share generated</span>
                <span className="font-black text-[#276A43]">≈ ${(launch.impactShareSol * solPrice).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Awaiting next harvest</span>
                <span className="font-black">{launch.pendingVaultSol.toFixed(4)} SOL</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Fee split (immutable)</span>
                <span className="font-black">{CREATOR_FEE_PCT} / {IMPACT_FEE_PCT} / {OPS_FEE_PCT}</span>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 flex gap-2.5 text-[12px] text-gray-500 leading-relaxed">
              <Icon name="lock" className="w-4 h-4 flex-shrink-0 text-[#223829] mt-0.5" />
              <span>
                The split is enforced by the pool config on-chain. Excess beyond the loan: 80% adopts the
                next borrower, 20% buys $SOW (half burned, half rewards the creator).
              </span>
            </div>
          </div>
        </div>

        <div className="text-center">
          <Link href="/launches" className="text-sm font-bold text-[#276A43] hover:underline">← All launches</Link>
        </div>
      </div>
    </div>
  );
}
