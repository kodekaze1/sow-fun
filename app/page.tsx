import Ticker from "@/components/Ticker";
import LoanFeed from "@/components/LoanFeed";
import TreasuryCard from "@/components/TreasuryCard";
import MapWrapper from "@/components/MapWrapper";
import { KivaLoan, MOCK_STATS, MOCK_BATCHES, COUNTRY_FLAGS, getPortrait } from "@/lib/types";

async function getLoans(): Promise<KivaLoan[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/kiva`, { next: { revalidate: 300 } });
    if (!res.ok) throw new Error("fetch failed");
    const data = await res.json();
    return (data.loans ?? []).slice(0, 20);
  } catch {
    return getFallbackLoans();
  }
}

const HERO_PORTRAITS = [
  "women/65", "men/32", "women/44", "men/76", "women/12",
  "men/54", "women/89", "men/23", "women/37",
];

const RECYCLED = [
  { from: { name: "Rohit Das", country: "Bangladesh", photo: "men/54", loan: "Transport" }, to: { name: "Amina Diallo", country: "Mali", loan: "Tailoring", batch: "011" }, amt: 40 },
  { from: { name: "Grace Mensah", country: "Ghana", photo: "women/89", loan: "Market Stall" }, to: { name: "Carmen Rivera", country: "Bolivia", loan: "Weaving", batch: "011" }, amt: 35 },
  { from: { name: "Ali Hassan", country: "Egypt", photo: "men/23", loan: "Agriculture" }, to: { name: "Fatima Nkosi", country: "Uganda", loan: "Education", batch: "010" }, amt: 60 },
];

export default async function Home() {
  const loans = await getLoans();
  const first = loans[0];

  return (
    <div className="min-h-screen">

      {/* NAV */}
      <nav className="bg-white/95 backdrop-blur border-b border-gray-100 sticky top-0 z-[500] shadow-sm">
        <div className="max-w-[1440px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/uplift-logo.png" alt="$UPLIFT" className="h-10 w-10 rounded-full object-cover" />
            <span className="text-gray-300 text-lg font-light">×</span>
            <img src="/kiva-logo.png" alt="Kiva" className="h-7 object-contain" />
            <span className="text-gray-400 text-sm italic hidden sm:block">Every trade lifts a life · upliftify.fun</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-[#e8f7f0] border border-[#a8dfc0] rounded-full px-4 py-1.5 text-xs font-semibold text-[#1a6e43]">
              <div className="w-2 h-2 bg-[#2CAB6A] rounded-full animate-livepulse" />
              Treasury: FN7m...keAz
            </div>
            <a href="https://www.kiva.org" target="_blank" rel="noopener noreferrer"
              className="bg-[#2CAB6A] hover:bg-[#1a6e43] text-white rounded-full px-5 py-2 text-sm font-bold transition-all hover:shadow-lg">
              Browse Loans
            </a>
          </div>
        </div>
      </nav>

      {/* TICKER */}
      <Ticker loans={loans} />

      {/* HERO */}
      <div className="text-white py-16 px-6 text-center relative overflow-hidden"
        style={{ background: "linear-gradient(140deg,#0a2e1b 0%,#1a6e43 35%,#2CAB6A 70%,#48c98a 100%)" }}>
        <div className="relative max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-widest mb-5">
            Powered by $UPLIFT trading fees on Solana
          </div>
          <h1 className="text-5xl font-extrabold leading-tight mb-4"
            style={{ fontFamily: "'Playfair Display',Georgia,serif", textShadow: "0 2px 20px rgba(0,0,0,0.2)" }}>
            Every Trade.<br />
            <span style={{ background: "linear-gradient(135deg,#fbbf24,#fde68a)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Every Life.
            </span><br />
            Real Uplift.
          </h1>
          <p className="text-base opacity-85 leading-relaxed mb-8">
            Every time someone buys or sells $UPLIFT, trading fees flow into a transparent treasury that funds
            microloans for real entrepreneurs across the developing world.
          </p>
          <div className="flex flex-wrap justify-center gap-1.5 mb-3">
            {HERO_PORTRAITS.map((p, i) => (
              <div key={i} className="w-12 h-12 rounded-full border-2 border-white/50 overflow-hidden shadow-lg hover:scale-110 transition-transform cursor-pointer">
                <img src={`https://randomuser.me/api/portraits/${p}.jpg`} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
            <div className="w-12 h-12 rounded-full border-2 border-white/40 bg-white/15 flex items-center justify-center text-xs font-black">soon</div>
          </div>
          <p className="text-sm opacity-75">Wave #001 coming soon — be part of the genesis</p>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-5 bg-white border-b-2 border-[#e8f7f0] shadow-md">
        {[
          { icon: "💰", value: `$${MOCK_STATS.feesCollected.toLocaleString()}`, label: "Fees Collected", delta: "updates live" },
          { icon: "🤝", value: MOCK_STATS.loansFunded === 0 ? "—" : String(MOCK_STATS.loansFunded), label: "Loans Funded", delta: "post-wave" },
          { icon: "🌍", value: MOCK_STATS.countriesReached === 0 ? "—" : String(MOCK_STATS.countriesReached), label: "Countries Reached", delta: "post-wave" },
          { icon: "✅", value: MOCK_STATS.repaymentRate === 0 ? "—" : `${MOCK_STATS.repaymentRate}%`, label: "Repayment Rate", delta: "Kiva average" },
          { icon: "♻️", value: `$${MOCK_STATS.recycledCapital.toLocaleString()}`, label: "Recycled Capital", delta: "re-deployed" },
        ].map(({ icon, value, label, delta }) => (
          <div key={label} className="text-center py-5 px-3 border-r border-gray-100 last:border-0 hover:bg-[#fdf6ee] transition-colors">
            <div className="text-3xl mb-1.5">{icon}</div>
            <div className="text-2xl font-black text-[#1a6e43] leading-none mb-1">{value}</div>
            <div className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">{label}</div>
            <div className="mt-1 text-[10px] font-bold text-[#2CAB6A] bg-[#e8f7f0] rounded-full px-2 py-0.5 inline-block">{delta}</div>
          </div>
        ))}
      </div>

      {/* MAIN GRID */}
      <div className="max-w-[1440px] mx-auto grid grid-cols-[1fr_360px] gap-6 p-6">

        {/* LEFT */}
        <div className="flex flex-col gap-6">

          {/* MAP */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-[#fdf6ee] to-white">
              <h2 className="text-sm font-bold">🌍 The Global Pulse</h2>
              <span className="text-xs font-bold bg-[#e8f7f0] text-[#1a6e43] px-3 py-1 rounded-full">{loans.length} loans on map</span>
            </div>
            <MapWrapper loans={loans} />
          </div>

          {/* FEED */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-[#fdf6ee] to-white">
              <h2 className="text-sm font-bold">⚡ People Being Lifted</h2>
              <span className="text-xs font-bold bg-red-50 text-red-700 px-3 py-1 rounded-full animate-livepulse">Live</span>
            </div>
            <LoanFeed loans={loans} />
          </div>

          {/* RIPPLE LEDGER */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-[#fdf6ee] to-white">
              <h2 className="text-sm font-bold">📋 Uplift Ledger</h2>
              <a href="/treasury" className="text-xs font-bold text-[#2CAB6A] hover:underline">View all</a>
            </div>
            {MOCK_BATCHES.map((batch) => (
              <div key={batch.id} className="px-5 py-4 border-b border-gray-50 last:border-0 hover:bg-[#fdf6ee] transition-colors cursor-pointer">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-extrabold">Wave #{batch.id} — {batch.date}</span>
                  <span className="text-sm font-extrabold text-[#2CAB6A]">${batch.amount} deployed</span>
                </div>
                <div className="text-xs text-gray-400 mb-2">
                  TX: <span className="font-mono bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">{batch.txHash}</span>
                  {" "}{batch.loans} lives touched / ${batch.rate.toFixed(2)}/SOL
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {loans.slice(0, 3).map((loan) => (
                    <span key={loan.id} className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#e8f7f0] text-[#1a6e43]">
                      {COUNTRY_FLAGS[loan.location.country] ?? "🌍"} {loan.name.split(" ")[0]} ${loan.loan_amount}
                    </span>
                  ))}
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">+{batch.loans - 3} more</span>
                </div>
              </div>
            ))}
          </div>

        </div>

        {/* RIGHT */}
        <div className="flex flex-col gap-6">

          {/* TREASURY */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-[#fdf6ee] to-white">
              <h2 className="text-sm font-bold">🏦 Impact Treasury</h2>
              <span className="text-xs font-bold bg-red-50 text-red-700 px-3 py-1 rounded-full animate-livepulse">Live</span>
            </div>
            <TreasuryCard />
          </div>

          {/* RECYCLING */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-[#fdf6ee] to-white">
              <h2 className="text-sm font-bold">♻️ The Ripple Effect</h2>
              <span className="text-xs font-bold bg-amber-50 text-amber-700 px-3 py-1 rounded-full">post-wave</span>
            </div>
            {RECYCLED.map(({ from, to, amt }, i) => (
              <div key={i} className="px-5 py-3.5 border-b border-gray-50 last:border-0 flex items-center gap-2">
                <img src={`https://randomuser.me/api/portraits/${from.photo}.jpg`} alt={from.name}
                  className="w-9 h-9 rounded-full object-cover border-2 border-[#a8dfc0] flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap text-xs">
                    <span className="font-bold text-gray-800">{from.name} {COUNTRY_FLAGS[from.country] ?? "🌍"}</span>
                    <span className="text-amber-500 text-base leading-none">to</span>
                    <span className="font-bold text-[#1a6e43]">{to.name} {COUNTRY_FLAGS[to.country] ?? "🌍"}</span>
                  </div>
                  <div className="text-[11px] text-gray-400 mt-0.5">{from.loan} repaid → {to.loan} funded · Wave #{to.batch}</div>
                </div>
                <div className="text-sm font-extrabold text-amber-500 flex-shrink-0">${amt} ♻️</div>
              </div>
            ))}
          </div>

          {/* SECTORS */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-[#fdf6ee] to-white">
              <h2 className="text-sm font-bold">📊 Impact Sectors</h2>
              <span className="text-xs font-bold bg-[#e8f7f0] text-[#1a6e43] px-3 py-1 rounded-full">post-wave</span>
            </div>
            <div className="p-5 flex flex-col gap-3.5">
              {[
                { icon: "🌾", label: "Agriculture & Food", pct: 42, count: 146, color: "#22c55e" },
                { icon: "🏪", label: "Retail & Services",  pct: 28, count: 97,  color: "#8b5cf6" },
                { icon: "📚", label: "Education",          pct: 18, count: 63,  color: "#3b82f6" },
                { icon: "⚡", label: "Clean Energy",       pct: 12, count: 41,  color: "#f59e0b" },
              ].map(({ icon, label, pct, count, color }) => (
                <div key={label}>
                  <div className="flex justify-between items-center mb-1.5 text-sm">
                    <span className="font-bold">{icon} {label}</span>
                    <span className="text-xs text-gray-400">{pct}% · {count} loans</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: `linear-gradient(90deg,${color}cc,${color})` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* X BOT */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-[#fdf6ee] to-white">
              <h2 className="text-sm font-bold">X Proof-of-Lending Bot</h2>
              <span className="text-xs font-bold bg-blue-50 text-blue-700 px-3 py-1 rounded-full">Auto-posts on X</span>
            </div>
            <div className="bg-black m-4 rounded-2xl p-4 border border-[#2a2a2a]">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#1a6e43] to-[#2CAB6A] flex items-center justify-center text-white font-black text-sm flex-shrink-0">$U</div>
                <div>
                  <div className="text-sm font-bold text-white">$UPLIFT x Kiva</div>
                  <div className="text-xs text-gray-500">@UpliftTokenSOL</div>
                </div>
              </div>
              <div className="text-sm text-gray-200 leading-relaxed mb-3">
                <span className="text-green-400 font-bold">Funded: </span>
                {first?.name ?? "Maria Santos"} in{" "}
                {COUNTRY_FLAGS[first?.location?.country ?? "Philippines"] ?? "🌍"}{" "}
                {first?.location?.country ?? "Philippines"}<br />
                {first?.activity ?? "Food Market"}{" · "}
                <span className="text-amber-400 font-bold">${first?.loan_amount ?? 25}</span><br />
                Funded by <span className="text-green-400 font-bold">$UPLIFT</span> fees, Wave #001<br />
                <span className="text-green-400 font-bold">Genesis Wave</span> · coming soon<br />
                <span className="text-gray-500 text-xs">TX: pending</span>
              </div>
              <div className="flex gap-2 items-center">
                <img src={getPortrait(first?.id ?? 1001)} alt=""
                  className="w-14 h-14 rounded-lg object-cover border border-[#333] flex-shrink-0" />
                <div className="flex-1 bg-[#1a1a1a] rounded-lg p-2.5 border border-[#2a2a2a]">
                  <div className="text-sm font-bold text-white">
                    {first?.name ?? "Maria Santos"}{" "}
                    {COUNTRY_FLAGS[first?.location?.country ?? "Philippines"] ?? ""}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">{first?.activity ?? "Food Market"} · Wave #012</div>
                  <div className="text-sm font-extrabold text-green-400 mt-1">${first?.loan_amount ?? 25} funded</div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* FOOTER */}
      <footer className="bg-[#0a2e1b] text-white/50 text-center py-8 px-6 mt-4 text-sm">
        <div className="flex justify-center gap-8 mb-3 flex-wrap">
          <a href="/tokenomics" className="text-emerald-300 font-semibold hover:text-emerald-200 transition-colors">$UPLIFT Token</a>
          <a href="https://www.kiva.org" target="_blank" rel="noopener noreferrer" className="text-emerald-300 font-semibold hover:text-emerald-200 transition-colors">Kiva.org</a>
          <a href="/treasury" className="text-emerald-300 font-semibold hover:text-emerald-200 transition-colors">Impact Treasury</a>
          <a href="/how-it-works" className="text-emerald-300 font-semibold hover:text-emerald-200 transition-colors">How It Works</a>
          <a href="/roadmap" className="text-emerald-300 font-semibold hover:text-emerald-200 transition-colors">Roadmap</a>
          <a href="/faq" className="text-emerald-300 font-semibold hover:text-emerald-200 transition-colors">FAQ</a>
        </div>
        <div className="font-mono text-xs opacity-70">upliftify.fun · Treasury: FN7m...keAz · Built on Solana · Powered by Kiva API</div>
        <div className="mt-2 opacity-30 text-xs">Placeholder photos replaced by Kiva borrower images in production</div>
      </footer>

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
