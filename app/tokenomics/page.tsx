import Link from "next/link";

export default function TokenomicsPage() {
  return (
    <div className="min-h-screen bg-white">

      {/* HERO */}
      <div className="text-white py-20 px-6 text-center"
        style={{ background: "#223829" }}>
        <div className="max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-widest mb-6">
            $UPLIFT on Solana
          </div>
          <h1 className="text-5xl font-extrabold mb-4"
            style={{ fontFamily: "var(--font-serif)" }}>
            Tokenomics
          </h1>
          <p className="text-lg opacity-80 leading-relaxed">
            A deflationary impact token — every trade does good.
          </p>
        </div>
      </div>

      <div className="max-w-[900px] mx-auto px-6 py-16 flex flex-col gap-10">

        {/* TOKEN OVERVIEW */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow p-8">
          <h2 className="text-2xl font-extrabold text-[#223829] mb-6">Token Overview</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
            {[
              { label: "Ticker", value: "$UPLIFT" },
              { label: "Chain", value: "Solana" },
              { label: "Total Supply", value: "1,000,000,000" },
              { label: "Launch", value: "Meteora DBC" },
            ].map(({ label, value }) => (
              <div key={label} className="p-4 bg-[#EDF4F1] rounded-xl">
                <div className="text-lg font-black text-[#223829] leading-none mb-1">{value}</div>
                <div className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider">{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* FEE STRUCTURE */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow p-8">
          <h2 className="text-2xl font-extrabold text-[#223829] mb-2">Fee Structure</h2>
          <p className="text-gray-400 text-sm mb-6">Every buy and sell of $UPLIFT carries a transaction fee, split across three buckets:</p>
          <div className="flex flex-col gap-4">
            {[
              { pct: "70%", label: "Kiva Microloan Treasury", color: "#276A43", icon: "🌍", desc: "Flows directly into the public treasury wallet to fund real borrowers on Kiva.org." },
              { pct: "20%", label: "Liquidity Pool", color: "#3b82f6", icon: "💧", desc: "Auto-added to the trading pool to reduce slippage and maintain healthy price discovery." },
              { pct: "10%", label: "Operations & Marketing", color: "#f59e0b", icon: "⚙️", desc: "Covers team costs, API fees, dashboard hosting, and community growth initiatives." },
            ].map(({ pct, label, color, icon, desc }) => (
              <div key={label} className="flex items-start gap-4 p-4 rounded-xl border border-gray-100 hover:bg-[#EDF4F1] transition-colors">
                <div className="w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0 text-2xl"
                  style={{ background: `${color}18`, border: `2px solid ${color}33` }}>
                  {icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-2xl font-black" style={{ color }}>{pct}</span>
                    <span className="text-base font-extrabold text-gray-800">{label}</span>
                  </div>
                  <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* DISTRIBUTION */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow p-8">
          <h2 className="text-2xl font-extrabold text-[#223829] mb-6">Token Distribution</h2>
          <div className="flex flex-col gap-3.5">
            {[
              { label: "Public Sale / Fair Launch", pct: 80, color: "#276A43" },
              { label: "Liquidity Pool (locked 1 year)", pct: 10, color: "#3b82f6" },
              { label: "Team (vested 18 months)", pct: 5, color: "#f59e0b" },
              { label: "Community / Airdrop Reserve", pct: 5, color: "#8b5cf6" },
            ].map(({ label, pct, color }) => (
              <div key={label}>
                <div className="flex justify-between items-center mb-1.5 text-sm">
                  <span className="font-bold text-gray-800">{label}</span>
                  <span className="text-xs font-bold" style={{ color }}>{pct}%</span>
                </div>
                <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: `linear-gradient(90deg,${color}99,${color})` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* IMPACT MODEL */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow p-8">
          <h2 className="text-2xl font-extrabold text-[#223829] mb-2">The Recycling Model</h2>
          <p className="text-gray-400 text-sm mb-6">Unlike charity tokens where funds disappear, $UPLIFT runs a recycling model:</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
            {[
              { icon: "💰", title: "Fees → Treasury", body: "Trading fees accumulate in the public Solana treasury wallet." },
              { icon: "🤝", title: "Treasury → Kiva", body: "Funds are deployed as Kiva microloans to vetted entrepreneurs." },
              { icon: "♻️", title: "Repayments → New Loans", body: "When borrowers repay, capital gets reinvested — not withdrawn. One dollar, many lives." },
            ].map(({ icon, title, body }) => (
              <div key={title} className="p-5 bg-[#EDF4F1] rounded-xl">
                <div className="text-4xl mb-3">{icon}</div>
                <h3 className="text-base font-extrabold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <Link href="/" className="inline-flex items-center gap-2 bg-[#276A43] hover:bg-[#223829] text-white rounded-full px-8 py-3.5 text-sm font-bold transition-all shadow-lg">
            ← Back to Dashboard
          </Link>
        </div>
      </div>

    </div>
  );
}
