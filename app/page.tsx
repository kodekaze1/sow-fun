import Ticker from "@/components/Ticker";
import LoanFeed from "@/components/LoanFeed";
import TreasuryCard from "@/components/TreasuryCard";
import MapWrapper from "@/components/MapWrapper";
import Icon from "@/components/icons";
import CountUp from "@/components/CountUp";
import ScrollReveal from "@/components/ScrollReveal";
import { KivaLoan, MOCK_STATS, MOCK_BATCHES, COUNTRY_FLAGS, ALL_KIVA_SECTORS, TOTAL_KIVA_COUNTRIES } from "@/lib/types";
import { getKivaImpactStats } from "@/lib/kiva-stats";
import { getAllWaves } from "@/lib/waves";
import { KIVA_FETCH_HEADERS, KIVA_TEAM_URL, TREASURY_WALLET } from "@/lib/constants";
import badges from "@/data/badges.json";

async function getLoans(): Promise<KivaLoan[]> {
  try {
    const res = await fetch(
      "https://api.kivaws.org/v1/loans/search.json?status=fundraising&sort_by=popularity&per_page=20&country_code=PH,KE,UG,TZ,GH,ML,SN,BD,PE,BO,PK,IN",
      { headers: KIVA_FETCH_HEADERS, next: { revalidate: 300 } }
    );
    if (!res.ok) throw new Error("fetch failed");
    const data = await res.json();
    return (data.loans ?? []).slice(0, 20);
  } catch {
    return getFallbackLoans();
  }
}

export default async function Home() {
  const [loans, kivaData, waves] = await Promise.all([
    getLoans(),
    getKivaImpactStats().catch(() => null),
    getAllWaves(),
  ]);
  const lenderStats = kivaData?.lender?.lenderStats;
  const impactLoans = kivaData?.lender?.loans ?? [];

  // Use real Kiva stats if available, otherwise fallback to MOCK_STATS
  const stats = {
    feesCollected:    MOCK_STATS.feesCollected,
    loansFunded:      lenderStats?.loanCount    ?? MOCK_STATS.loansFunded,
    countriesReached: lenderStats?.numCountries ?? MOCK_STATS.countriesReached,
    repaymentRate:    MOCK_STATS.repaymentRate, 
    recycledCapital:  MOCK_STATS.recycledCapital,
  };

  // The map shows ONLY harvest-funded loans - never browse listings,
  // so the marker count always matches lives actually funded.
  const allMapLoans = waves.flatMap(wave =>
    wave.loans.map(loan => ({
      id: parseInt(loan.kiva_id) || 1001,
      name: loan.borrower,
      activity: "sow.fun Funded",
      sector: "Uplift",
      use: loan.notes || "",
      location: { country: loan.location },
      loan_amount: loan.uplift_cents / 100,
      funded_amount: loan.uplift_cents / 100,
      image: { id: 0, template_id: 1 },
      image_url: loan.photo_url || undefined,
      borrower_count: 1,
      lender_count: 1,
      partner_id: 0,
      posted_date: "",
      planned_expiration_date: "",
    }))
  );

  // The Collection: distinct countries/sectors the treasury lender has reached
  const collectedCountries = [...new Set(impactLoans.map((l) => l.location.country))].filter((c) => c && c !== "Unknown");
  const collectedSectors = [...new Set(impactLoans.map((l) => l.sector))].filter(Boolean);

  return (
    <div className="min-h-screen">
      <ScrollReveal />

      {/* TICKER */}
      <Ticker loans={impactLoans.length > 0 ? impactLoans : loans} />

      {/* HERO */}
      <div className="relative overflow-hidden bg-[#223829]">
        <img src="/images/vendor-smile.jpg" alt="A smiling vendor at her market stall in the Philippines"
          className="absolute inset-0 w-full h-full object-cover object-[50%_25%] kenburns" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#16261c]/95 via-[#16261c]/70 to-[#16261c]/20" />
        <div className="absolute inset-0" style={{ background: "radial-gradient(120% 95% at 50% 40%, transparent 55%, rgba(10,20,14,0.5) 100%)" }} />
        <div className="relative max-w-[1280px] mx-auto px-6 py-16 md:py-32">
          <div className="max-w-xl text-[#EDF4F1]">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/15 rounded-full px-4 py-1.5 text-[10px] sm:text-xs font-semibold uppercase tracking-wider sm:tracking-widest mb-6">
              The launchpad where fees fund real loans
            </div>
            <h1 className="text-[2.6rem] sm:text-5xl md:text-6xl font-medium leading-[1.12] tracking-tight mb-6"
              style={{ fontFamily: "var(--font-serif)" }}>
              Sow a coin,{" "}
              <span className="italic relative inline-block whitespace-nowrap">
                grow a life
                <svg className="absolute -bottom-1.5 left-0 w-full" viewBox="0 0 200 12" preserveAspectRatio="none" fill="none" aria-hidden="true">
                  <path d="M3 9c40-6 120-8 194-3" stroke="#2AA967" strokeWidth="5" strokeLinecap="round" />
                </svg>
              </span>
              .
            </h1>
            <p className="text-base opacity-85 leading-relaxed mb-8 max-w-md">
              Launch a token for a real borrower on Kiva. 45% of every trade funds their microloan -
              locked at launch, receipts for every hop. You reap what you sow.
            </p>
            <div className="flex flex-wrap gap-3 mb-6">
              <a href="/launch"
                className="bg-[#EDF4F1] text-[#223829] hover:bg-white rounded-full px-6 py-2.5 text-sm font-bold transition-colors">
                Launch a coin for a borrower
              </a>
              <a href="https://www.kiva.org/lender/sowfun" target="_blank" rel="noopener noreferrer"
                className="border border-[#EDF4F1]/40 hover:border-[#EDF4F1] rounded-full px-6 py-2.5 text-sm font-bold transition-colors">
                See the funded loans
              </a>
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-2 text-[13px] opacity-85 mb-4">
              <span className="flex items-center gap-1.5"><Icon name="check" className="w-4 h-4 text-[#7FC79E]" />Loans verified on Kiva</span>
              <span className="flex items-center gap-1.5"><Icon name="vault" className="w-4 h-4 text-[#7FC79E]" />Public treasury on Solana</span>
              <span className="flex items-center gap-1.5"><Icon name="refresh" className="w-4 h-4 text-[#7FC79E]" />Repayments recycled</span>
            </div>
            <p className="text-sm opacity-70">Harvest #001 is live - Valeti in Tonga and Monica in Kenya are already funded</p>
          </div>
        </div>
      </div>

      {/* STATS */}
      <div className="bg-[#EDF4F1] border-b border-[#D9E6DF]">
      <div className="max-w-[1280px] mx-auto grid grid-cols-2 md:grid-cols-5 gap-px bg-[#D9E6DF] md:border-x border-[#D9E6DF]">
        {[
          { icon: "coins", value: `$${stats.feesCollected.toLocaleString()}`, label: "Impact Deployed", delta: "founder seed" },
          { icon: "heart", value: stats.loansFunded === 0 ? "-" : String(stats.loansFunded), label: "Loans Funded", delta: "post-harvest" },
          { icon: "globe", value: stats.countriesReached === 0 ? "-" : String(stats.countriesReached), label: "Countries Reached", delta: "post-harvest" },
          { icon: "check", value: stats.repaymentRate === 0 ? "-" : `${stats.repaymentRate}%`, label: "Repayment Rate", delta: "Kiva average" },
          { icon: "refresh", value: `$${stats.recycledCapital.toLocaleString()}`, label: "Recycled Capital", delta: "re-deployed" },
        ].map(({ icon, value, label, delta }) => (
          <div key={label} className="text-center py-5 md:py-6 px-3 bg-[#EDF4F1] last:col-span-2 md:last:col-span-1">
            <div className="w-10 h-10 mx-auto mb-2.5 rounded-full bg-white flex items-center justify-center text-[#223829] shadow-sm">
              <Icon name={icon} className="w-6 h-6" />
            </div>
            <div className="text-2xl font-black text-[#223829] leading-none mb-1"><CountUp value={value} /></div>
            <div className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">{label}</div>
            <div className="mt-1.5 text-[10px] font-bold text-[#276A43] bg-white rounded-full px-2 py-0.5 inline-block">{delta}</div>
          </div>
        ))}
      </div>
      </div>

      {/* SECTION HEADER */}
      <div className="max-w-[1280px] mx-auto px-6 pt-10 md:pt-12 pb-6 flex flex-wrap items-end justify-between gap-4" data-reveal>
        <div className="flex items-center gap-3 md:gap-4 min-w-0">
          <img src="/images/illustrations/lock-sprout.png" alt="" aria-hidden="true"
            className="w-11 md:w-14 rotate-[2deg] mix-blend-multiply flex-shrink-0" />
          <div>
            <div className="text-xs font-black uppercase tracking-widest text-[#276A43] mb-1.5">Live transparency</div>
            <h2 className="font-serif text-[1.7rem] sm:text-3xl md:text-4xl font-medium tracking-tight text-[#223829] leading-tight md:leading-none">Watch the treasury work.</h2>
          </div>
        </div>
        <a href={`https://solscan.io/account/${TREASURY_WALLET}`} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-2 text-xs font-mono text-[#223829]/70 hover:text-[#276A43] bg-[#EDF4F1] border border-[#D9E6DF] rounded-full px-3.5 py-1.5 transition-colors">
          <span className="w-2 h-2 rounded-full bg-[#2AA967] animate-livepulse" />
          Treasury {TREASURY_WALLET.slice(0, 5)}…{TREASURY_WALLET.slice(-3)} · updated live ↗
        </a>
      </div>

      {/* MAIN GRID */}
      <div className="max-w-[1280px] mx-auto grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 px-4 sm:px-6 pb-6">

        {/* LEFT */}
        <div className="flex flex-col gap-6 min-w-0">

          {/* MAP */}
          <div data-reveal className="bg-white rounded-2xl border border-[#E4EBE7] shadow-[0_4px_15px_rgba(0,0,0,0.05)] transition-shadow duration-300 hover:shadow-[0_10px_28px_rgba(34,56,41,0.10)] overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-[#EDF4F1] to-white">
              <h2 className="flex items-center gap-2.5 text-sm font-bold"><span className="w-7 h-7 rounded-lg bg-white border border-[#D9E6DF] flex items-center justify-center text-[#223829]"><Icon name="pin" className="w-4 h-4" /></span>The Global Pulse</h2>
              <span className="text-xs font-bold bg-[#EDF4F1] text-[#223829] px-3 py-1 rounded-full">{allMapLoans.length} {allMapLoans.length === 1 ? "life" : "lives"} funded</span>
            </div>
            <MapWrapper loans={allMapLoans} />
          </div>


          {/* FEED */}
          <div data-reveal className="bg-white rounded-2xl border border-[#E4EBE7] shadow-[0_4px_15px_rgba(0,0,0,0.05)] transition-shadow duration-300 hover:shadow-[0_10px_28px_rgba(34,56,41,0.10)] overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-[#EDF4F1] to-white">
              <h2 className="flex items-center gap-2.5 text-sm font-bold"><span className="w-7 h-7 rounded-lg bg-white border border-[#D9E6DF] flex items-center justify-center text-[#223829]"><Icon name="pulse" className="w-4 h-4" /></span>People We&apos;re Watching</h2>
              <span className="text-xs font-bold bg-[#EDF4F1] text-[#223829] px-3 py-1 rounded-full text-center">Active on Kiva</span>
            </div>
            <div className="px-5 pt-3 pb-1 flex gap-2 overflow-x-auto">
              {[
                ["Women", "women"],
                ["Agriculture", "agriculture"],
                ["Eco-friendly", "eco-friendly"],
                ["Refugees", "refugees-and-i-d-ps"],
                ["Education", "education"],
              ].map(([label, slug]) => (
                <a key={slug} href={`https://www.kiva.org/lend-by-category/${slug}`} target="_blank" rel="noopener noreferrer"
                  className="flex-shrink-0 text-xs font-bold px-3.5 py-1.5 rounded-full bg-white border border-[#D9E6DF] text-[#223829] hover:border-[#276A43] hover:text-[#276A43] transition-colors shadow-sm">
                  {label}
                </a>
              ))}
            </div>
            <LoanFeed loans={impactLoans} />
          </div>

          {/* RIPPLE LEDGER */}
          <div data-reveal className="bg-white rounded-2xl border border-[#E4EBE7] shadow-[0_4px_15px_rgba(0,0,0,0.05)] transition-shadow duration-300 hover:shadow-[0_10px_28px_rgba(34,56,41,0.10)] overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-[#EDF4F1] to-white">
              <h2 className="flex items-center gap-2.5 text-sm font-bold"><span className="w-7 h-7 rounded-lg bg-white border border-[#D9E6DF] flex items-center justify-center text-[#223829]"><Icon name="ledger" className="w-4 h-4" /></span>Harvest Ledger</h2>
              <a href="/treasury" className="text-xs font-bold text-[#276A43] hover:underline">View all</a>
            </div>
            {MOCK_BATCHES.map((batch) => (
              <div key={batch.id} className="px-5 py-4 border-b border-gray-50 last:border-0 hover:bg-[#F8F2E6] transition-colors cursor-pointer">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-extrabold">Harvest #{batch.id} - {batch.date}</span>
                  <span className="text-sm font-extrabold text-[#276A43]">${batch.amount} deployed</span>
                </div>
                <div className="text-xs text-gray-400 mb-2">
                  Proof: <a href={batch.txHash} target="_blank" rel="noopener noreferrer" className="font-mono bg-[#EDF4F1] text-[#276A43] px-1.5 py-0.5 rounded hover:bg-[#D9E6DF] transition-colors">
                    {batch.txHash.includes("kiva.org") ? "Kiva Receipt ↗" : `${batch.txHash.slice(0, 8)}...`}
                  </a>
                  {" "}{batch.loans} {batch.loans === 1 ? "life" : "lives"} touched · Founder Seed
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#EDF4F1] text-[#223829]">
                    🇹🇴 Valeti $25
                  </span>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#EDF4F1] text-[#223829]">
                    🇰🇪 Monica $25
                  </span>
                </div>
              </div>
            ))}
          </div>

        </div>

        {/* RIGHT */}
        <div className="flex flex-col gap-6">

          {/* TREASURY */}
          <div data-reveal className="bg-white rounded-2xl border border-[#E4EBE7] shadow-[0_4px_15px_rgba(0,0,0,0.05)] transition-shadow duration-300 hover:shadow-[0_10px_28px_rgba(34,56,41,0.10)] overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-[#EDF4F1] to-white">
              <h2 className="flex items-center gap-2.5 text-sm font-bold"><span className="w-7 h-7 rounded-lg bg-white border border-[#D9E6DF] flex items-center justify-center text-[#223829]"><Icon name="vault" className="w-4 h-4" /></span>Impact Treasury</h2>
              <span className="flex items-center gap-1.5 text-xs font-bold bg-[#EDF4F1] text-[#276A43] px-3 py-1 rounded-full"><span className="w-1.5 h-1.5 rounded-full bg-[#2AA967] animate-livepulse" />Live</span>
            </div>
            <TreasuryCard />
          </div>

          {/* UNLOCKS AFTER HARVEST */}
          <div data-reveal className="bg-white rounded-2xl border border-[#E4EBE7] shadow-[0_4px_15px_rgba(0,0,0,0.05)] transition-shadow duration-300 hover:shadow-[0_10px_28px_rgba(34,56,41,0.10)] overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-[#EDF4F1] to-white">
              <h2 className="flex items-center gap-2.5 text-sm font-bold"><span className="w-7 h-7 rounded-lg bg-white border border-[#D9E6DF] flex items-center justify-center text-[#223829]"><Icon name="hourglass" className="w-4 h-4" /></span>Unlocks after harvest</h2>
              <span className="text-xs font-bold bg-[#F8F2E6] text-[#996210] px-3 py-1 rounded-full">pending</span>
            </div>
            {[
              { icon: "refresh", title: "The Ripple Effect", detail: "Repayments recycled to the next borrower - Kiva loans repay over 6-18 months." },
              { icon: "chart", title: "Impact Sectors", detail: "Sector breakdown fills in as more harvests are funded." },
            ].map(({ icon, title, detail }) => (
              <div key={title} className="px-5 py-3.5 flex items-start gap-3 border-b border-gray-50 last:border-0">
                <div className="w-8 h-8 rounded-full bg-[#EDF4F1] flex items-center justify-center text-[#223829] flex-shrink-0">
                  <Icon name={icon} className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[13px] font-bold text-[#223829]">{title}</div>
                  <div className="text-xs text-gray-400 leading-relaxed">{detail}</div>
                </div>
              </div>
            ))}
          </div>

          {/* LEND WITH US */}
          <div data-reveal className="bg-[#223829] rounded-2xl overflow-hidden text-[#EDF4F1] p-6 relative">
            <div className="absolute right-4 top-4 w-14 h-14 rounded-2xl bg-white p-1.5 shadow-lg rotate-[4deg]">
              <img src="/images/illustrations/heart-radiate.png" alt="" aria-hidden="true" className="w-full h-full object-contain" />
            </div>
            <div className="text-xs font-black uppercase tracking-widest text-[#7FC79E] mb-2 pr-16">Kiva Lending Team</div>
            <h2 className="font-serif text-xl font-semibold mb-2">Lend alongside the treasury</h2>
            <p className="text-sm opacity-75 leading-relaxed mb-4">
              Join the sow.fun team on Kiva - every loan you make under the team banner counts toward our shared impact.
            </p>
            <div className="flex items-center gap-5 text-sm mb-5">
              <div><span className="font-black">{kivaData?.team?.memberCount ?? 1}</span> <span className="opacity-60">member{(kivaData?.team?.memberCount ?? 1) === 1 ? "" : "s"}</span></div>
              <div><span className="font-black">{kivaData?.team?.loanCount ?? 0}</span> <span className="opacity-60">team loans</span></div>
            </div>
            <a href={KIVA_TEAM_URL} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-[#EDF4F1] text-[#223829] hover:bg-white rounded-full px-5 py-2 text-sm font-bold transition-colors">
              Join the team on Kiva
              <Icon name="arrow" className="w-4 h-4" />
            </a>
          </div>

        </div>
      </div>

      {/* THE COLLECTION */}
      <div className="bg-[#FBF6EA]/80 border-y border-[#F8CD69]/25 mt-10">
      <div className="max-w-[1100px] mx-auto px-6 pt-14 pb-14" data-reveal>
        <div className="text-center mb-8">
          <img src="/images/illustrations/watering.png" alt="" aria-hidden="true"
            className="w-28 mx-auto mb-4 rotate-[-2deg] mix-blend-multiply" />
          <div className="text-xs font-black uppercase tracking-widest text-[#276A43] mb-2.5">The Collection</div>
          <h2 className="font-serif text-3xl md:text-4xl font-medium tracking-tight text-[#223829]">
            Collect the <span className="italic text-[#276A43]">whole world.</span>
          </h2>
          <p className="text-gray-500 text-sm mt-3 max-w-lg mx-auto">
            Every harvest plants a flag. {TOTAL_KIVA_COUNTRIES} countries, {ALL_KIVA_SECTORS.length} sectors,
            one community garden - each launch grows the collection.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {/* COUNTRIES */}
          <div className="bg-white rounded-2xl border border-[#E4EBE7] shadow-[0_4px_15px_rgba(0,0,0,0.05)] p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="flex items-center gap-2 text-sm font-bold"><Icon name="globe" className="w-4 h-4 text-[#223829]" />Countries</h3>
              <span className="text-sm font-black text-[#276A43]">{collectedCountries.length} / {TOTAL_KIVA_COUNTRIES}</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-4">
              <div className="h-full bg-[#2AA967] rounded-full" style={{ width: `${Math.max(2, (collectedCountries.length / TOTAL_KIVA_COUNTRIES) * 100)}%` }} />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {collectedCountries.map((c) => (
                <span key={c} className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#EDF4F1] text-[#223829]">
                  {COUNTRY_FLAGS[c] ?? "🌍"} {c}
                </span>
              ))}
            </div>
            <div className="text-xs text-gray-400 mt-3">{TOTAL_KIVA_COUNTRIES - collectedCountries.length} still unexplored</div>
          </div>

          {/* SECTORS */}
          <div className="bg-white rounded-2xl border border-[#E4EBE7] shadow-[0_4px_15px_rgba(0,0,0,0.05)] p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="flex items-center gap-2 text-sm font-bold"><Icon name="chart" className="w-4 h-4 text-[#223829]" />Sectors</h3>
              <span className="text-sm font-black text-[#276A43]">{collectedSectors.length} / {ALL_KIVA_SECTORS.length}</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-4">
              <div className="h-full bg-[#2AA967] rounded-full" style={{ width: `${Math.max(2, (collectedSectors.length / ALL_KIVA_SECTORS.length) * 100)}%` }} />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {ALL_KIVA_SECTORS.map((s) => {
                const got = collectedSectors.includes(s);
                return (
                  <span key={s} className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                    got ? "bg-[#276A43] text-white" : "bg-gray-50 text-gray-300"
                  }`}>
                    {s}
                  </span>
                );
              })}
            </div>
          </div>

          {/* BADGES */}
          <div className="bg-white rounded-2xl border border-[#E4EBE7] shadow-[0_4px_15px_rgba(0,0,0,0.05)] p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="flex items-center gap-2 text-sm font-bold"><Icon name="sparkle" className="w-4 h-4 text-[#223829]" />Kiva badges</h3>
              <span className="text-sm font-black text-[#276A43]">{badges.length}</span>
            </div>
            <div className="flex flex-col gap-2.5">
              {badges.map((b) => (
                <div key={b.name} className="flex items-center gap-3 bg-[#EDF4F1] rounded-xl px-3.5 py-2.5">
                  <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-[#276A43] flex-shrink-0">
                    <Icon name="sparkle" className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[13px] font-bold text-[#223829]">{b.name}</div>
                    <div className="text-[11px] text-gray-500">{b.detail}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="text-xs text-gray-400 mt-3">Earned on our Kiva lender profile - verify anytime</div>
          </div>
        </div>

        <div className="text-center mt-8">
          <a href="/launch"
            className="inline-flex items-center gap-2 bg-[#276A43] hover:bg-[#223829] text-white rounded-full px-7 py-3 text-sm font-bold transition-colors">
            Sow the next one
            <Icon name="arrow" className="w-4 h-4" />
          </a>
        </div>
      </div>
      </div>

      {/* STORY: WAVE #001 */}
      <div className="bg-[#EDF4F1] mt-6">
        <div data-reveal className="max-w-[1100px] mx-auto px-6 py-16 grid md:grid-cols-2 gap-10 items-center">
          <img src="https://www.kiva.org/img/w960h720/e078314a12027aedad4d2b7069551a72.webp"
            alt="Valeti, a tapa cloth maker in Tonga"
            className="rounded-2xl shadow-[0_4px_15px_rgba(0,0,0,0.08)] w-full object-cover aspect-[4/3]" />
          <div>
            <div className="text-xs font-black uppercase tracking-widest text-[#276A43] mb-3">Harvest #001 · Genesis</div>
            <h2 className="text-3xl md:text-4xl font-medium tracking-tight text-[#223829] mb-4"
              style={{ fontFamily: "var(--font-serif)" }}>
              Meet Valeti - <span className="italic text-[#276A43]">the first seed sown.</span>
            </h2>
            <p className="text-[#223829]/80 leading-relaxed mb-3">
              Valeti makes tapa cloth in Tonga, and her Kiva loan buys the mulberry her craft depends on.
              She was funded alongside Monica, whose posho mill feeds her corner of Kenya - two lives,
              one genesis harvest.
            </p>
            <p className="text-sm text-[#223829]/60 leading-relaxed mb-6">
              Founder-seeded through the card bridge to prove the loop, verifiable on Kiva.
              Every future harvest adds another story here.
            </p>
            <a href="https://www.kiva.org/lend/3246961" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-[#276A43] hover:bg-[#223829] text-white rounded-full px-6 py-2.5 text-sm font-bold transition-colors">
              View her loan on Kiva
              <Icon name="arrow" className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="relative overflow-hidden bg-[#223829]">
        <img src="/images/hands-wide.jpg" alt="" aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover opacity-45" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#16261c]/70 to-[#16261c]/40" />
        <div data-reveal className="relative max-w-2xl mx-auto px-6 py-20 text-center text-[#EDF4F1]">
          <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-[#F8F2E6]/90 p-2.5 shadow-[0_6px_20px_rgba(0,0,0,0.25)] rotate-[-3deg] border border-[#F8CD69]/30">
            <img src="/images/illustrations/plant-coin.png" alt="" aria-hidden="true" className="w-full h-full object-contain mix-blend-multiply" />
          </div>
          <h2 className="text-3xl md:text-4xl font-medium tracking-tight mb-4"
            style={{ fontFamily: "var(--font-serif)" }}>
            Every trade plants a seed.
          </h2>
          <p className="opacity-80 leading-relaxed mb-8 max-w-lg mx-auto">
            Trading fees become microloans. Repayments fund the next borrower.
            One treasury, many lives - all of it public, all of it verifiable.
          </p>
          <a href="https://www.kiva.org/lender/upliftifyfun" target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-[#EDF4F1] text-[#223829] hover:bg-white rounded-full px-7 py-3 text-sm font-bold transition-colors">
            See the proof on Kiva
            <Icon name="arrow" className="w-4 h-4" />
          </a>
        </div>
      </div>

    </div>
  );
}

function getFallbackLoans(): KivaLoan[] {
  return [
    { id: 1001, name: "Maria Santos",   activity: "Food Market",        sector: "Food",         use: "to stock her market stall with fresh vegetables", location: { country: "Philippines", town: "Cebu" },       borrower_count: 1, loan_amount: 25,  funded_amount: 0,  image: { id: 1, template_id: 1 }, lender_count: 0, partner_id: 1, posted_date: "", planned_expiration_date: "", description: { texts: { en: "Maria sells vegetables at the local market to support her 3 children." } } },
    { id: 1002, name: "James Odhiambo", activity: "Solar Energy",       sector: "Clean Energy", use: "to purchase solar panels to resell to families", location: { country: "Kenya", town: "Nairobi" },            borrower_count: 1, loan_amount: 50,  funded_amount: 20, image: { id: 2, template_id: 1 }, lender_count: 3, partner_id: 1, posted_date: "", planned_expiration_date: "", description: { texts: { en: "James wants to bring affordable solar lights to families living off the grid." } } },
    { id: 1003, name: "Amina Diallo",   activity: "Tailoring",          sector: "Retail",       use: "to expand her tailoring workshop", location: { country: "Mali", town: "Bamako" },                           borrower_count: 1, loan_amount: 75,  funded_amount: 30, image: { id: 3, template_id: 1 }, lender_count: 5, partner_id: 1, posted_date: "", planned_expiration_date: "", description: { texts: { en: "Amina sews traditional clothing for weddings and ceremonies." } } },
    { id: 1004, name: "Pedro Quispe",   activity: "Agriculture",        sector: "Agriculture",  use: "to buy better seeds for the quinoa harvest", location: { country: "Peru", town: "Puno" },                   borrower_count: 1, loan_amount: 100, funded_amount: 60, image: { id: 4, template_id: 1 }, lender_count: 8, partner_id: 1, posted_date: "", planned_expiration_date: "", description: { texts: { en: "Pedro family has farmed quinoa for generations." } } },
    { id: 1005, name: "Fatima Nkosi",   activity: "Education Supplies", sector: "Education",    use: "to stock school supplies near her shop", location: { country: "Uganda", town: "Kampala" },                  borrower_count: 1, loan_amount: 30,  funded_amount: 10, image: { id: 5, template_id: 1 }, lender_count: 2, partner_id: 1, posted_date: "", planned_expiration_date: "", description: { texts: { en: "Fatima runs a small school supply shop near a primary school." } } },
    { id: 1006, name: "Rohit Das",      activity: "Transport",          sector: "Retail",       use: "to repair his rickshaw", location: { country: "Bangladesh", town: "Dhaka" },                               borrower_count: 1, loan_amount: 40,  funded_amount: 40, image: { id: 6, template_id: 1 }, lender_count: 6, partner_id: 1, posted_date: "", planned_expiration_date: "", description: { texts: { en: "Rohit rickshaw is his livelihood." } } },
    { id: 1007, name: "Carmen Rivera",  activity: "Weaving",            sector: "Agriculture",  use: "to purchase wool and dyes for the season", location: { country: "Bolivia", town: "Cochabamba" },           borrower_count: 1, loan_amount: 60,  funded_amount: 25, image: { id: 7, template_id: 1 }, lender_count: 4, partner_id: 1, posted_date: "", planned_expiration_date: "", description: { texts: { en: "Carmen weaves traditional textiles passed down through her family." } } },
    { id: 1008, name: "Abena Mensah",   activity: "Market Stall",       sector: "Retail",       use: "to expand her market stall", location: { country: "Ghana", town: "Accra" },                               borrower_count: 1, loan_amount: 35,  funded_amount: 15, image: { id: 8, template_id: 1 }, lender_count: 3, partner_id: 1, posted_date: "", planned_expiration_date: "", description: { texts: { en: "Abena runs a market stall selling household goods." } } },
  ];
}
