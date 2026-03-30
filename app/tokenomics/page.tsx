import Link from "next/link";

export default function TokenomicsPage() {
  return (
    <div className="min-h-screen bg-[#f4f9f6]">
      {/* NAV */}
      <nav className="bg-white/95 backdrop-blur border-b border-gray-100 sticky top-0 z-[500] shadow-sm">
        <div className="max-w-[1100px] mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <img src="/uplift-logo.png" alt="$UPLIFT" className="h-10 w-10 rounded-full object-cover" />
            <span className="text-gray-300 text-lg font-light">×</span>
            <img src="/kiva-logo.png" alt="Kiva" className="h-7 object-contain" />
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/how-it-works" className="text-sm text-gray-500 hover:text-[#1a6e43] font-semibold transition-colors">How It Works</Link>
            <Link href="/treasury" className="text-sm text-gray-500 hover:text-[#1a6e43] font-semibold transition-colors">Treasury</Link>
            <a href="https://www.kiva.org" target="_blank" rel="noopener noreferrer"
              className="bg-[#2CAB6A] hover:bg-[#1a6e43] text-white rounded-full px-5 py-2 text-sm font-bold transition-all">
              Browse Loans
            </a>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <div className="text-white py-20 px-6 text-center"
        style={{ background: "linear-gradient(140deg,#0a2e1b 0%,#1a6e43 40%,#2CAB6A 100%)" }}>
        <div className="max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-widest mb-6">
            $UPLIFT on Solana
          </div>
          <h1 className="text-5xl font-extrabold mb-4"
            style={{ fontFamily: "'Playfair Display',Georgia,serif" }}>
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
          <h2 className="text-2xl font-extrabold text-[#1a6e43] mb-6">Token Overview</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
            {[
              { label: "Ticker", value: "$UPLIFT" },
              { label: "Chain", value: "Solana" },
              { label: "Total Supply", value: "1,000,000,000" },
              { label: "Launch", value: "pump.fun / Meteora" },
            ].map(({ label, value }) => (
              <div key={label} className="p-4 bg-[#f4f9f6] rounded-xl">
                <div className="text-lg font-black text-[#1a6e43] leading-none mb-1">{value}</div>
                <div className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider">{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* FEE STRUCTURE */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow p-8">
          <h2 className="text-2xl font-extrabold text-[#1a6e43] mb-2">Fee Structure</h2>
          <p className="text-gray-400 text-sm mb-6">Every buy and sell of $UPLIFT carries a transaction fee, split across three buckets:</p>
          <div className="flex flex-col gap-4">
            {[
              { pct: "70%", label: "Kiva Microloan Treasury", color: "#2CAB6A", icon: "🌍", desc: "Flows directly into the public treasury wallet to fund real borrowers on Kiva.org." },
              { pct: "20%", label: "Liquidity Pool", color: "#3b82f6", icon: "💧", desc: "Auto-added to the trading pool to reduce slippage and maintain healthy price discovery." },
              { pct: "10%", label: "Operations & Marketing", color: "#f59e0b", icon: "⚙️", desc: "Covers team costs, API fees, dashboard hosting, and community growth initiatives." },
            ].map(({ pct, label, color, icon, desc }) => (
              <div key={label} className="flex items-start gap-4 p-4 rounded-xl border border-gray-100 hover:bg-[#f4f9f6] transition-colors">
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
          <h2 className="text-2xl font-extrabold text-[#1a6e43] mb-6">Token Distribution</h2>
          <div className="flex flex-col gap-3.5">
            {[
              { label: "Public Sale / Fair Launch", pct: 80, color: "#2CAB6A" },
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
          <h2 className="text-2xl font-extrabold text-[#1a6e43] mb-2">The Recycling Model</h2>
          <p className="text-gray-400 text-sm mb-6">Unlike charity tokens where funds disappear, $UPLIFT runs a recycling model:</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
            {[
              { icon: "💰", title: "Fees → Treasury", body: "Trading fees accumulate in the public Solana treasury wallet." },
              { icon: "🤝", title: "Treasury → Kiva", body: "Funds are deployed as Kiva microloans to vetted entrepreneurs." },
              { icon: "♻️", title: "Repayments → New Loans", body: "When borrowers repay, capital gets reinvested — not withdrawn. One dollar, many lives." },
            ].map(({ icon, title, body }) => (
              <div key={title} className="p-5 bg-[#f4f9f6] rounded-xl">
                <div className="text-4xl mb-3">{icon}</div>
                <h3 className="text-base font-extrabold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <Link href="/" className="inline-flex items-center gap-2 bg-[#2CAB6A] hover:bg-[#1a6e43] text-white rounded-full px-8 py-3.5 text-sm font-bold transition-all shadow-lg">
            ← Back to Dashboard
          </Link>
        </div>
      </div>

      <footer className="bg-[#0a2e1b] text-white/50 text-center py-8 px-6 text-sm">
        <div className="flex justify-center gap-8 mb-3 flex-wrap">
          <a href="https://www.kiva.org" target="_blank" rel="noopener noreferrer" className="text-emerald-300 font-semibold hover:text-emerald-200 transition-colors">Kiva.org</a>
          <Link href="/treasury" className="text-emerald-300 font-semibold hover:text-emerald-200 transition-colors">Impact Treasury</Link>
          <Link href="/how-it-works" className="text-emerald-300 font-semibold hover:text-emerald-200 transition-colors">How It Works</Link>
        </div>
        <div className="font-mono text-xs opacity-70">upliftify.fun · Treasury: 8xKj...4mPq · Built on Solana · Powered by Kiva API</div>
      </footer>
    </div>
  );
}
