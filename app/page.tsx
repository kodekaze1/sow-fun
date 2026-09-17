import Ticker from "@/components/Ticker";
import LoanFeed from "@/components/LoanFeed";
import TreasuryCard from "@/components/TreasuryCard";
import MapWrapper from "@/components/MapWrapper";
import Icon from "@/components/icons";
import { KivaLoan, MOCK_STATS, MOCK_BATCHES, SECTOR_TAGS, SECTOR_COLORS } from "@/lib/types";
import { getKivaImpactStats } from "@/lib/kiva-stats";
import { getAllWaves } from "@/lib/waves";
import { KIVA_FETCH_HEADERS } from "@/lib/constants";

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

  // Compute sectors from waves
  const sectorMap: Record<string, { count: number; cents: number }> = {};
  waves.forEach(wave => {
    if (wave.status === "draft") return;
    wave.display.sectors.forEach(sector => {
      if (!sectorMap[sector]) sectorMap[sector] = { count: 0, cents: 0 };
      sectorMap[sector].count += 1;
    });
    wave.loans.forEach(loan => {
      const primarySector = wave.display.sectors[0] || "General";
      if (!sectorMap[primarySector]) sectorMap[primarySector] = { count: 0, cents: 0 };
      sectorMap[primarySector].cents += loan.uplift_cents;
    });
  });

  const totalCents = Object.values(sectorMap).reduce((sum, s) => sum + s.cents, 0);
  const impactSectors = Object.entries(sectorMap).map(([label, data]) => ({
    label,
    count: data.count,
    pct: totalCents > 0 ? Math.round((data.cents / totalCents) * 100) : 0,
    icon: SECTOR_TAGS[label] || "💼",
    color: SECTOR_COLORS[label] || SECTOR_COLORS.default,
  })).sort((a, b) => b.pct - a.pct);

  // Combine active Kiva loans with our funded Uplift loans for the map
  const fundedLoans = waves.flatMap(wave => 
    wave.loans.map(loan => ({
      id: parseInt(loan.kiva_id) || 1001,
      name: loan.borrower,
      activity: "Uplift Funded",
      sector: "Uplift",
      use: loan.notes || "",
      location: { country: loan.location },
      loan_amount: loan.uplift_cents / 100,
      funded_amount: loan.uplift_cents / 100,
      image: { id: 0, template_id: 1 },
      borrower_count: 1,
      lender_count: 1,
      partner_id: 0,
      posted_date: "",
      planned_expiration_date: "",
    }))
  );

  const allMapLoans = [...fundedLoans, ...loans];

  return (
    <div className="min-h-screen">

      {/* TICKER */}
      <Ticker loans={impactLoans.length > 0 ? impactLoans : loans} />

      {/* HERO */}
      <div className="relative overflow-hidden bg-[#223829]">
        <img src="/images/vendor-smile.jpg" alt="A smiling vendor at her market stall in the Philippines"
          className="absolute inset-0 w-full h-full object-cover object-[50%_25%]" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#16261c]/95 via-[#16261c]/70 to-[#16261c]/20" />
        <div className="relative max-w-[1280px] mx-auto px-6 py-24 md:py-32">
          <div className="max-w-xl text-[#EDF4F1]">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/15 rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-widest mb-6">
              Powered by $UPLIFT trading fees on Solana
            </div>
            <h1 className="text-5xl md:text-6xl font-medium leading-[1.12] tracking-tight mb-6"
              style={{ fontFamily: "var(--font-serif)" }}>
              Every trade,{" "}
              <span className="italic relative inline-block whitespace-nowrap">
                a real loan
                <svg className="absolute -bottom-1.5 left-0 w-full" viewBox="0 0 200 12" preserveAspectRatio="none" fill="none" aria-hidden="true">
                  <path d="M3 9c40-6 120-8 194-3" stroke="#2AA967" strokeWidth="5" strokeLinecap="round" />
                </svg>
              </span>{" "}
              for a real person.
            </h1>
            <p className="text-base opacity-85 leading-relaxed mb-8 max-w-md">
              Every time someone buys or sells $UPLIFT, trading fees flow into a transparent treasury that funds
              microloans for real entrepreneurs across the developing world.
            </p>
            <div className="flex flex-wrap gap-3 mb-6">
              <a href="https://www.kiva.org/lend/3157094" target="_blank" rel="noopener noreferrer"
                className="bg-[#EDF4F1] text-[#223829] hover:bg-white rounded-full px-6 py-2.5 text-sm font-bold transition-colors">
                See the first funded loan
              </a>
              <a href="/how-it-works"
                className="border border-[#EDF4F1]/40 hover:border-[#EDF4F1] rounded-full px-6 py-2.5 text-sm font-bold transition-colors">
                How it works
              </a>
            </div>
            <p className="text-sm opacity-70">Wave #001 is live — Ailyn in the Philippines is already funded</p>
          </div>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-5 bg-[#EDF4F1] border-b border-[#D9E6DF]">
        {[
          { icon: "coins", value: `$${stats.feesCollected.toLocaleString()}`, label: "Impact Deployed", delta: "founder seed" },
          { icon: "heart", value: stats.loansFunded === 0 ? "—" : String(stats.loansFunded), label: "Loans Funded", delta: "post-wave" },
          { icon: "globe", value: stats.countriesReached === 0 ? "—" : String(stats.countriesReached), label: "Countries Reached", delta: "post-wave" },
          { icon: "check", value: stats.repaymentRate === 0 ? "—" : `${stats.repaymentRate}%`, label: "Repayment Rate", delta: "Kiva average" },
          { icon: "refresh", value: `$${stats.recycledCapital.toLocaleString()}`, label: "Recycled Capital", delta: "re-deployed" },
        ].map(({ icon, value, label, delta }) => (
          <div key={label} className="text-center py-6 px-3 border-r border-[#D9E6DF] last:border-0">
            <div className="w-10 h-10 mx-auto mb-2.5 rounded-full bg-white flex items-center justify-center text-[#276A43] shadow-sm">
              <Icon name={icon} className="w-5 h-5" />
            </div>
            <div className="text-2xl font-black text-[#223829] leading-none mb-1">{value}</div>
            <div className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">{label}</div>
            <div className="mt-1.5 text-[10px] font-bold text-[#276A43] bg-white rounded-full px-2 py-0.5 inline-block">{delta}</div>
          </div>
        ))}
      </div>

      {/* MAIN GRID */}
      <div className="max-w-[1440px] mx-auto grid grid-cols-[1fr_360px] gap-6 p-6">

        {/* LEFT */}
        <div className="flex flex-col gap-6">

          {/* MAP */}
          <div className="bg-white rounded-2xl border border-[#E4EBE7] shadow-[0_4px_15px_rgba(0,0,0,0.05)] overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-[#EDF4F1] to-white">
              <h2 className="flex items-center gap-2 text-sm font-bold"><Icon name="pin" className="w-4 h-4 text-[#276A43]" />The Global Pulse</h2>
              <span className="text-xs font-bold bg-[#EDF4F1] text-[#223829] px-3 py-1 rounded-full">{allMapLoans.length} markers on map</span>
            </div>
            <MapWrapper loans={allMapLoans} />
          </div>


          {/* FEED */}
          <div className="bg-white rounded-2xl border border-[#E4EBE7] shadow-[0_4px_15px_rgba(0,0,0,0.05)] overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-[#EDF4F1] to-white">
              <h2 className="flex items-center gap-2 text-sm font-bold"><Icon name="pulse" className="w-4 h-4 text-[#276A43]" />People We&apos;re Watching</h2>
              <span className="text-xs font-bold bg-[#EDF4F1] text-[#223829] px-3 py-1 rounded-full text-center">Active on Kiva</span>
            </div>
            <LoanFeed loans={impactLoans} />
          </div>

          {/* RIPPLE LEDGER */}
          <div className="bg-white rounded-2xl border border-[#E4EBE7] shadow-[0_4px_15px_rgba(0,0,0,0.05)] overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-[#EDF4F1] to-white">
              <h2 className="flex items-center gap-2 text-sm font-bold"><Icon name="ledger" className="w-4 h-4 text-[#276A43]" />Uplift Ledger</h2>
              <a href="/treasury" className="text-xs font-bold text-[#276A43] hover:underline">View all</a>
            </div>
            {MOCK_BATCHES.map((batch) => (
              <div key={batch.id} className="px-5 py-4 border-b border-gray-50 last:border-0 hover:bg-[#F8F2E6] transition-colors cursor-pointer">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-extrabold">Wave #{batch.id} — {batch.date}</span>
                  <span className="text-sm font-extrabold text-[#276A43]">${batch.amount} deployed</span>
                </div>
                <div className="text-xs text-gray-400 mb-2">
                  Proof: <a href={batch.txHash} target="_blank" rel="noopener noreferrer" className="font-mono bg-[#EDF4F1] text-[#276A43] px-1.5 py-0.5 rounded hover:bg-[#D9E6DF] transition-colors">
                    {batch.txHash.includes("kiva.org") ? "Kiva Receipt ↗" : `${batch.txHash.slice(0, 8)}...`}
                  </a>
                  {" "}{batch.loans} life touched · {stats.feesCollected === 25 ? "Founder Seed" : `$${batch.rate.toFixed(2)}/SOL`}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#EDF4F1] text-[#223829]">
                    🇵🇭 Ailyn $25
                  </span>
                </div>
              </div>
            ))}
          </div>

        </div>

        {/* RIGHT */}
        <div className="flex flex-col gap-6">

          {/* TREASURY */}
          <div className="bg-white rounded-2xl border border-[#E4EBE7] shadow-[0_4px_15px_rgba(0,0,0,0.05)] overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-[#EDF4F1] to-white">
              <h2 className="flex items-center gap-2 text-sm font-bold"><Icon name="vault" className="w-4 h-4 text-[#276A43]" />Impact Treasury</h2>
              <span className="text-xs font-bold bg-red-50 text-red-700 px-3 py-1 rounded-full animate-livepulse">Live</span>
            </div>
            <TreasuryCard />
          </div>

          {/* RECYCLING */}
          <div className="bg-white rounded-2xl border border-[#E4EBE7] shadow-[0_4px_15px_rgba(0,0,0,0.05)] overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-[#EDF4F1] to-white">
              <h2 className="flex items-center gap-2 text-sm font-bold"><Icon name="refresh" className="w-4 h-4 text-[#276A43]" />The Ripple Effect</h2>
              <span className="text-xs font-bold bg-[#F8F2E6] text-[#996210] px-3 py-1 rounded-full">post-wave</span>
            </div>
            <div className="px-5 py-8 text-center text-gray-400 text-sm">
              <div className="w-11 h-11 mx-auto mb-3 rounded-full bg-[#EDF4F1] flex items-center justify-center text-[#276A43]">
                <Icon name="hourglass" className="w-5 h-5" />
              </div>
              Repayments from active loans will appear here.<br />
              <span className="text-xs">Kiva loans typically repay over 6–18 months.</span>
            </div>
          </div>

          {/* SECTORS */}
          <div className="bg-white rounded-2xl border border-[#E4EBE7] shadow-[0_4px_15px_rgba(0,0,0,0.05)] overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-[#EDF4F1] to-white">
              <h2 className="flex items-center gap-2 text-sm font-bold"><Icon name="chart" className="w-4 h-4 text-[#276A43]" />Impact Sectors</h2>
              <span className="text-xs font-bold bg-[#EDF4F1] text-[#223829] px-3 py-1 rounded-full">post-wave</span>
            </div>
            <div className="p-5 flex flex-col gap-3.5">
              {impactSectors.length > 0 ? impactSectors.map(({ label, pct, count }) => (
                <div key={label}>
                  <div className="flex justify-between items-center mb-1.5 text-sm">
                    <span className="font-bold">{label}</span>
                    <span className="text-xs text-gray-400">{pct}% · {count} wave{count > 1 ? 's' : ''}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-[#2AA967]" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )) : (
                <div className="py-4 text-center text-gray-400 text-sm">
                  <div className="w-11 h-11 mx-auto mb-3 rounded-full bg-[#EDF4F1] flex items-center justify-center text-[#276A43]">
                    <Icon name="chart" className="w-5 h-5" />
                  </div>
                  Sector breakdown will populate as more loans are funded.
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* STORY: WAVE #001 */}
      <div className="bg-[#EDF4F1] mt-6">
        <div className="max-w-[1100px] mx-auto px-6 py-16 grid md:grid-cols-2 gap-10 items-center">
          <img src="/images/ailyn.webp"
            alt="Ailyn standing in front of her sari-sari store in Barotac Viejo, Philippines"
            className="rounded-2xl shadow-[0_4px_15px_rgba(0,0,0,0.08)] w-full object-cover aspect-[4/3]" />
          <div>
            <div className="text-xs font-black uppercase tracking-widest text-[#276A43] mb-3">Wave #001 · Genesis Loan</div>
            <h2 className="text-3xl md:text-4xl font-medium tracking-tight text-[#223829] mb-4"
              style={{ fontFamily: "var(--font-serif)" }}>
              Meet Ailyn — <span className="italic text-[#276A43]">the first life lifted.</span>
            </h2>
            <p className="text-[#223829]/80 leading-relaxed mb-3">
              Ailyn runs a sari-sari store in Barotac Viejo, Iloilo, Philippines. Her Kiva loan helps her stock
              toothpaste, shampoo, canned sardines, soy sauce and soap — the everyday goods her neighbors count on.
            </p>
            <p className="text-sm text-[#223829]/60 leading-relaxed mb-6">
              Funded as the Upliftify genesis loan and verifiable on Kiva. Every future wave adds another story here.
            </p>
            <a href="https://www.kiva.org/lend/3157094" target="_blank" rel="noopener noreferrer"
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
        <div className="relative max-w-2xl mx-auto px-6 py-20 text-center text-[#EDF4F1]">
          <h2 className="text-3xl md:text-4xl font-medium tracking-tight mb-4"
            style={{ fontFamily: "var(--font-serif)" }}>
            Every trade plants a seed.
          </h2>
          <p className="opacity-80 leading-relaxed mb-8 max-w-lg mx-auto">
            Trading fees become microloans. Repayments fund the next borrower.
            One treasury, many lives — all of it public, all of it verifiable.
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
