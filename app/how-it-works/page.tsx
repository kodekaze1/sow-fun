import Link from "next/link";

const STEPS = [
  {
    num: "01",
    icon: "💱",
    title: "You Trade $UPLIFT",
    color: "#2CAB6A",
    body: "Every buy or sell of $UPLIFT on Solana generates a trading fee. A portion of every transaction flows automatically into the transparent on-chain treasury wallet — visible to anyone, any time.",
  },
  {
    num: "02",
    icon: "🏦",
    title: "Fees Accumulate in Treasury",
    color: "#1a6e43",
    body: "The treasury wallet is a public Solana address. SOL from trading fees pools there until it reaches a threshold — typically enough to fund 5–10 microloans. Every deposit is verifiable on-chain.",
  },
  {
    num: "03",
    icon: "🤝",
    title: "We Select Real Borrowers",
    color: "#f59e0b",
    body: "Our team browses active Kiva campaigns from entrepreneurs in the developing world — farmers, tailors, market vendors, solar energy resellers. We prioritize high-repayment sectors and underserved regions.",
  },
  {
    num: "04",
    icon: "🌍",
    title: "Loans Get Funded",
    color: "#3b82f6",
    body: "We fund loans directly on Kiva.org using the treasury balance. Each funding event is posted publicly — borrower name, country, sector, amount, and the Solana TX hash proving the treasury spend.",
  },
  {
    num: "05",
    icon: "📋",
    title: "Batch Ledger Published",
    color: "#8b5cf6",
    body: "Every funding round is recorded as a numbered batch on this dashboard. Batch #, date, loans funded, total deployed, SOL/USD rate, and an on-chain transaction hash — full transparency, no trust required.",
  },
  {
    num: "06",
    icon: "♻️",
    title: "Repayments Get Recycled",
    color: "#10b981",
    body: "Kiva borrowers repay their loans over time. When repayments come in, we reinvest them into new loans rather than withdrawing. Your fees keep giving — one dollar lifts multiple lives over time.",
  },
];

export default function HowItWorksPage() {
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
            <Link href="/tokenomics" className="text-sm text-gray-500 hover:text-[#1a6e43] font-semibold transition-colors">Tokenomics</Link>
            <Link href="/treasury" className="text-sm text-gray-500 hover:text-[#1a6e43] font-semibold transition-colors">Treasury</Link>
            <Link href="https://www.kiva.org" target="_blank" rel="noopener noreferrer"
              className="bg-[#2CAB6A] hover:bg-[#1a6e43] text-white rounded-full px-5 py-2 text-sm font-bold transition-all">
              Browse Loans
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <div className="text-white py-20 px-6 text-center"
        style={{ background: "linear-gradient(140deg,#0a2e1b 0%,#1a6e43 40%,#2CAB6A 100%)" }}>
        <div className="max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-widest mb-6">
            Transparent by Design
          </div>
          <h1 className="text-5xl font-extrabold mb-4"
            style={{ fontFamily: "'Playfair Display',Georgia,serif" }}>
            How It Works
          </h1>
          <p className="text-lg opacity-80 leading-relaxed">
            From your first trade to a borrower&apos;s funded dream — here&apos;s the full journey, step by step.
          </p>
        </div>
      </div>

      {/* STEPS */}
      <div className="max-w-[900px] mx-auto px-6 py-16">
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-[39px] top-8 bottom-8 w-0.5 bg-gradient-to-b from-[#2CAB6A] to-[#e8f7f0]" />

          <div className="flex flex-col gap-10">
            {STEPS.map((step) => (
              <div key={step.num} className="flex gap-6 items-start">
                <div className="w-20 h-20 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg relative z-10"
                  style={{ background: `linear-gradient(135deg,${step.color}22,${step.color}44)`, border: `2px solid ${step.color}44` }}>
                  <span className="text-3xl">{step.icon}</span>
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 shadow p-6 flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xs font-black uppercase tracking-widest" style={{ color: step.color }}>Step {step.num}</span>
                  </div>
                  <h2 className="text-xl font-extrabold text-gray-900 mb-2">{step.title}</h2>
                  <p className="text-gray-500 leading-relaxed">{step.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* TRUST SECTION */}
        <div className="mt-16 bg-white rounded-2xl border border-gray-100 shadow p-8">
          <h2 className="text-2xl font-extrabold text-[#1a6e43] mb-6">Why You Can Trust This</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { icon: "🔗", title: "On-Chain Treasury", body: "Every SOL deposit and spend is recorded on Solana's public ledger. Anyone can verify the wallet balance and transaction history — no middlemen." },
              { icon: "📖", title: "Public Batch Ledger", body: "Each funding round is published on this dashboard with a numbered batch, borrower names, and the Solana TX hash proving the spend." },
              { icon: "🌐", title: "Kiva Verification", body: "Loans are funded through Kiva.org — a non-profit with 97%+ repayment rates and 15+ years of verified impact across 80 countries." },
            ].map(({ icon, title, body }) => (
              <div key={title} className="text-center p-4">
                <div className="text-4xl mb-3">{icon}</div>
                <h3 className="text-lg font-extrabold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-10 text-center">
          <Link href="/" className="inline-flex items-center gap-2 bg-[#2CAB6A] hover:bg-[#1a6e43] text-white rounded-full px-8 py-3.5 text-sm font-bold transition-all shadow-lg">
            ← Back to Dashboard
          </Link>
        </div>
      </div>

      <footer className="bg-[#0a2e1b] text-white/50 text-center py-8 px-6 text-sm">
        <div className="flex justify-center gap-8 mb-3 flex-wrap">
          <Link href="/tokenomics" className="text-emerald-300 font-semibold hover:text-emerald-200 transition-colors">$UPLIFT Token</Link>
          <a href="https://www.kiva.org" target="_blank" rel="noopener noreferrer" className="text-emerald-300 font-semibold hover:text-emerald-200 transition-colors">Kiva.org</a>
          <Link href="/treasury" className="text-emerald-300 font-semibold hover:text-emerald-200 transition-colors">Impact Treasury</Link>
          <Link href="/how-it-works" className="text-emerald-300 font-semibold hover:text-emerald-200 transition-colors">How It Works</Link>
        </div>
        <div className="font-mono text-xs opacity-70">upliftify.fun · Treasury: 8xKj...4mPq · Built on Solana · Powered by Kiva API</div>
      </footer>
    </div>
  );
}
