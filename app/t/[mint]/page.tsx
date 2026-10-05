import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Icon from "@/components/icons";
import { getLaunchByMint, getSolPrice } from "@/lib/launchpad-onchain";
import { getLoansById } from "@/lib/kiva-graphql";
import { getCoinPlans } from "@/lib/coin-plans";
import ShareCoinButton from "@/components/ShareCoinButton";
import { readCoinMeta } from "@/lib/coin-meta";
import { CREATOR_FEE_PCT, IMPACT_FEE_PCT, OPS_FEE_PCT, POOL_FEE_BPS, SITE_URL, MIGRATION_QUOTE_SOL, MIGRATED_POOL_FEE_BPS } from "@/lib/launchpad";
import { COUNTRY_FLAGS } from "@/lib/types";

export const revalidate = 60;

// Preview data for /t/demo - what a launched coin's page looks like
// before any real pools exist. Clearly badged as a preview.
const DEMO_LAUNCH = {
  pool: "PreviewPoo1111111111111111111111111111111111",
  mint: "demo",
  name: "Annie's Solar",
  symbol: "ANNIE",
  image: "/images/vendor-smile.jpg",
  loanId: null as number | null,
  borrowerName: "Annie",
  pendingVaultSol: 3.21,
  lifetimeFeesSol: 41.7,
  impactShareSol: 22.94,
  quoteReserveSol: 19.6, // 23% of the 85 SOL graduation threshold
  curvePct: 23,
  migrated: false,
};
const DEMO_LOAN = {
  id: 0,
  name: "Annie",
  status: "funded",
  country: "Solomon Islands",
  use: "to buy a solar home kit so her family can light their home and charge phones for neighbors",
  loanAmount: 425,
  fundedAmount: 425,
  remaining: 0,
  image: "/images/vendor-smile.jpg",
};

export async function generateMetadata({ params }: { params: Promise<{ mint: string }> }): Promise<Metadata> {
  const { mint } = await params;
  if (mint === "demo") {
    return { title: "Preview: a launched coin | sow.fun", robots: { index: false } };
  }
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
  const isDemo = mint === "demo";
  const launch = isDemo ? DEMO_LAUNCH : await getLaunchByMint(mint).catch(() => null);
  if (!launch) notFound();

  // The coin funds its launch borrower first, then the creator's on-chain
  // borrower queue (lib/coin-plans). Whoever it is funding now is shown as
  // the active beneficiary; the launch borrower becomes history.
  const solPrice = await getSolPrice();
  // Creator's own description and links, saved at launch (lib/coin-meta)
  const details = !isDemo && launch.mint ? await readCoinMeta(launch.mint) : null;
  const plan = !isDemo && launch.mint
    ? (await getCoinPlans({ mints: [launch.mint], solPrice }).catch(() => null))?.get(launch.mint) ?? null
    : null;
  const activeLoanId = plan?.ledger.currentLoanId ?? launch.loanId;
  const movedOn = !!plan && activeLoanId !== launch.loanId;
  const missing = [activeLoanId, launch.loanId].filter(
    (id): id is number => typeof id === "number" && !plan?.loans[id]
  );
  const fetched = isDemo || !missing.length ? new Map() : await getLoansById(missing).catch(() => new Map());
  const loanById = (id: number | null) => (id ? plan?.loans[id] ?? fetched.get(id) : undefined);
  const loan = isDemo ? DEMO_LOAN : loanById(activeLoanId);
  const originalLoan = movedOn ? loanById(launch.loanId) : undefined;
  const upNext = plan ? plan.ledger.plan.queue.filter((q) => q.loanId !== activeLoanId) : [];
  const pct = loan && loan.loanAmount > 0 ? Math.round((loan.fundedAmount / loan.loanAmount) * 100) : 0;
  const img = launch.image ?? loan?.image ?? "/sow-logo.png";

  const shareText = `$${launch.symbol} on @sowfunhq - ${IMPACT_FEE_PCT}% of every trade funds ${loan?.name ?? launch.borrowerName ?? "a Kiva borrower"}'s microloan. Locked at launch, verifiable forever.`;
  const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(`${SITE_URL}/t/${launch.mint}`)}`;

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-12">
        {isDemo && (
          <div className="mb-8 bg-[#F8F2E6] border border-[#F8CD69]/50 rounded-2xl p-4 text-sm text-[#996210] text-center">
            <span className="font-bold">Preview.</span>{" "}This is what a launched coin&apos;s page looks like.{" "}
            <a href="/launch" className="underline font-bold whitespace-nowrap">Sow a real one →</a>
          </div>
        )}
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

        {details && (details.description || details.x || details.telegram || details.website) && (
          <div className="-mt-4 mb-8">
            {details.description && (
              <p className="text-sm text-[#223829]/80 leading-relaxed whitespace-pre-line mb-3 max-w-2xl">{details.description}</p>
            )}
            <div className="flex flex-wrap gap-2 text-xs font-bold">
              {[
                details.x && { href: details.x, label: "X" },
                details.telegram && { href: details.telegram, label: "Telegram" },
                details.website && { href: details.website, label: "Website" },
              ].filter((l): l is { href: string; label: string } => Boolean(l)).map((l) => (
                <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer nofollow ugc"
                  className="bg-[#EDF4F1] hover:bg-[#D9E6DF] text-[#223829] rounded-full px-3 py-1 transition-colors">{l.label} ↗</a>
              ))}
            </div>
          </div>
        )}

        {/* ACTIONS */}
        <div className="flex flex-wrap gap-3 mb-10">
          <a href={isDemo ? "/launch" : `https://jup.ag/swap/SOL-${launch.mint}`}
            {...(isDemo ? {} : { target: "_blank", rel: "noopener noreferrer" })}
            className="inline-flex items-center gap-2 bg-[#276A43] hover:bg-[#223829] text-white rounded-full px-6 py-2.5 text-sm font-bold transition-colors">
            {isDemo ? "Launch a real one" : "Trade on Jupiter"} <Icon name="arrow" className="w-4 h-4" />
          </a>
          {!isDemo && (
            <ShareCoinButton mint={launch.mint!} symbol={launch.symbol} intentUrl={shareUrl} />
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-10">
          {/* BORROWER */}
          <div className="bg-[#EDF4F1] rounded-2xl p-6">
            <div className="text-xs font-black uppercase tracking-widest text-[#276A43] mb-3">
              {movedOn ? "Now funding" : "Beneficiary"}
            </div>
            {movedOn && (
              <div className="mb-4 bg-white/70 rounded-xl p-3 text-[12px] text-[#223829]/70 leading-relaxed">
                Originally pledged to{" "}
                <span className="font-bold text-[#223829]">{originalLoan?.name ?? launch.borrowerName ?? `loan #${launch.loanId}`}</span>
                {originalLoan?.status === "funded" ? " - fully funded ✓." : " - that loan closed."}{" "}
                Fees now flow to the next borrower in the creator&apos;s queue.
                {plan?.queueMemoTx && (
                  <>{" "}
                    <a href={`https://solscan.io/tx/${plan.queueMemoTx}`} target="_blank" rel="noopener noreferrer"
                      className="font-bold text-[#276A43] hover:underline">Queue receipt ↗</a>
                  </>
                )}
              </div>
            )}
            {loan ? (
              <>
                <div className="flex items-center gap-3 mb-3">
                  {loan.image && <img src={loan.image} alt={loan.name} className="w-14 h-14 rounded-xl object-cover" />}
                  <div>
                    <div className="font-bold text-[#223829]">{loan.name} {COUNTRY_FLAGS[loan.country] ?? ""}</div>
                    <div className="text-xs text-gray-500">{loan.country}{loan.id > 0 ? ` · Kiva loan #${loan.id}` : ""} · {loan.status}</div>
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
                  <span>
                    {loan.remaining > 0
                      ? `${loan.remaining.toFixed(0)} to go`
                      : (loan.reservedAmount ?? 0) > 0 ? "rest reserved by lenders" : ""}
                  </span>
                </div>
                {loan.id > 0 ? (
                  <a href={`https://www.kiva.org/lend/${loan.id}`} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm font-bold text-[#276A43] hover:underline">
                    View the loan on Kiva <Icon name="arrow" className="w-3.5 h-3.5" />
                  </a>
                ) : null}
                {loan.status === "fundraising" && loan.remaining <= 0 && (loan.reservedAmount ?? 0) > 0 && (
                  <div className="mt-4 rounded-xl px-3.5 py-2.5 text-[12px] bg-white border border-[#2AA967]/30 text-[#223829]/80">
                    <span className="font-bold text-[#276A43]">Almost there:</span> the last ${(loan.reservedAmount ?? 0).toFixed(0)} is in lenders&apos; baskets.
                  </div>
                )}
                {loan.status !== "fundraising" && (
                  <div className={`mt-4 rounded-xl px-3.5 py-2.5 text-[12px] ${
                    loan.status === "funded"
                      ? "bg-white border border-[#2AA967]/30 text-[#223829]/80"
                      : "bg-[#F8F2E6] border border-[#F8CD69]/50 text-[#996210]"
                  }`}>
                    {loan.status === "funded" ? (
                      <><span className="font-bold text-[#276A43]">Fully funded ✓</span> Fees now go to the creator&apos;s next borrowers.</>
                    ) : (
                      <><span className="font-bold">Closed early.</span> Fees go to the creator&apos;s next borrowers.</>
                    )}
                  </div>
                )}
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
            <div className="flex items-baseline justify-between mb-3">
              <div className="text-xs font-black uppercase tracking-widest text-[#276A43]">Impact engine</div>
              <span className="text-[11px] text-gray-400">this coin</span>
            </div>
            <div className="flex flex-col gap-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Earned for Kiva loans</span>
                <span className="font-black text-[#276A43]">≈ ${(launch.impactShareSol * solPrice).toFixed(2)}</span>
              </div>
              {plan && (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Lent on Kiva so far</span>
                    <span className="font-black text-[#276A43]">${((plan.ledger.deployedPledgeCents + plan.ledger.deployedExcessCents) / 100).toFixed(0)}</span>
                  </div>
                  {/* Only interesting once the coin has spread beyond its own borrower */}
                  {plan.ledger.livesFunded > 1 && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Borrowers funded</span>
                      <span className="font-black">{plan.ledger.livesFunded}</span>
                    </div>
                  )}
                </>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">Waiting for the next harvest</span>
                <span className="font-black">≈ ${(launch.pendingVaultSol * (IMPACT_FEE_PCT / (100 - CREATOR_FEE_PCT)) * solPrice).toFixed(2)}</span>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2 text-[12px] text-gray-500">
              <Icon name="lock" className="w-4 h-4 flex-shrink-0 text-[#223829]" />
              <span title="Locked on-chain by the pool config">{IMPACT_FEE_PCT}% of every fee goes to Kiva loans.</span>
            </div>
          </div>
        </div>

        {/* UP NEXT */}
        {upNext.length > 0 && (
          <div className="bg-white rounded-2xl border border-[#E4EBE7] shadow-[0_4px_15px_rgba(0,0,0,0.05)] p-6 mb-10">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-black uppercase tracking-widest text-[#276A43]">Up next</div>
              <span className="text-[11px] text-gray-400">chosen by the creator, funded in order</span>
            </div>
            <div className="flex flex-col divide-y divide-gray-100">
              {upNext.map((q, i) => (
                <div key={q.loanId} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <div className="min-w-0">
                    <span className="font-mono text-xs text-gray-400 mr-2">{i + 1}</span>
                    <a href={`https://www.kiva.org/lend/${q.loanId}`} target="_blank" rel="noopener noreferrer"
                      className="font-bold text-[#223829] hover:text-[#276A43]">{q.name ?? `Loan #${q.loanId}`}</a>
                    {q.remainingCents > 0 && <span className="text-xs text-gray-500"> · ${(q.remainingCents / 100).toFixed(0)} to go</span>}
                  </div>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${
                    q.status === "fund" ? "bg-[#EDF4F1] text-[#276A43]"
                      : q.status === "taken" ? "bg-[#F8F2E6] text-[#996210]"
                      : "bg-gray-100 text-gray-500"
                  }`}>
                    {q.status === "fund" ? `$${(q.cents / 100).toFixed(0)} next harvest`
                      : q.status === "taken" ? "skipped - another coin's borrower"
                      : q.status === "closed" ? "loan closed - skipped"
                      : q.status === "waiting" ? "waiting for fees" : "not found"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* THE CURVE */}
        <div className="bg-white rounded-2xl border border-[#E4EBE7] shadow-[0_4px_15px_rgba(0,0,0,0.05)] p-6 mb-10">
          <div className="flex items-center justify-between mb-1">
            <div className="text-xs font-black uppercase tracking-widest text-[#276A43]">The curve</div>
            <span className="text-xs font-bold bg-[#EDF4F1] text-[#223829] px-2.5 py-0.5 rounded-full">
              {launch.quoteReserveSol.toFixed(1)} SOL raised
            </span>
          </div>
          {launch.curvePct !== null && (
            <>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden mt-3">
                <div className="h-full bg-[#F8CD69] rounded-full" style={{ width: `${Math.max(2, launch.curvePct)}%` }} />
              </div>
              <div className="flex justify-between text-[11px] text-gray-400 mt-1.5">
                <span>{launch.curvePct}% of the way to graduation</span>
                <span>graduates at {MIGRATION_QUOTE_SOL} SOL · LP locked forever · {MIGRATED_POOL_FEE_BPS / 100}% fee after</span>
              </div>
            </>
          )}
          <div className="mt-4 pt-4 border-t border-gray-100 flex gap-2.5 text-[13px] text-[#223829]/75 leading-relaxed">
            <Icon name="leaf" className="w-5 h-5 flex-shrink-0 text-[#276A43] mt-0.5" />
            {launch.migrated ? (
              <span>
                <span className="font-bold text-[#223829]">Graduated.</span>{" "}
                This coin now trades on a Meteora DAMM v2 pool at a {MIGRATED_POOL_FEE_BPS / 100}% fee. Its liquidity is
                permanently locked and keeps paying the same {CREATOR_FEE_PCT}/{IMPACT_FEE_PCT}/{OPS_FEE_PCT} split.
              </span>
            ) : (
            <span>
              {/* Only claim it when this coin's own money funded the loan */}
              {loan && loan.remaining === 0 && loan.loanAmount > 0 && (plan?.ledger.deployedPledgeCents ?? 0) > 0 && launch.curvePct !== null && launch.curvePct < 100
                ? <>Loan funded at just <span className="font-bold text-[#276A43]">{launch.curvePct}% of the curve</span> - no graduation needed.</>
                : <>No graduation needed - fees fund the loan from the first trade.</>}
            </span>
            )}
          </div>
        </div>

        <div className="text-center">
          <Link href="/launches" className="text-sm font-bold text-[#276A43] hover:underline">← All launches</Link>
        </div>
      </div>
    </div>
  );
}
