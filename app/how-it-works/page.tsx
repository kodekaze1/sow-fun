import Link from "next/link";
import Icon from "@/components/icons";

const STEPS = [
  {
    num: "01",
    icon: "coins",
    title: "You Trade $UPLIFT",
    color: "#276A43",
    body: "Every buy or sell of $UPLIFT on Solana generates a trading fee. A portion of every transaction flows automatically into the transparent on-chain treasury wallet — visible to anyone, any time.",
  },
  {
    num: "02",
    icon: "vault",
    title: "Fees Accumulate in Treasury",
    color: "#276A43",
    body: "The treasury wallet is a public Solana address. SOL from trading fees pools there until it reaches a threshold — typically enough to fund 5–10 microloans. Every deposit is verifiable on-chain.",
  },
  {
    num: "03",
    icon: "heart",
    title: "We Select Real Borrowers",
    color: "#276A43",
    body: "Our team browses active Kiva campaigns from entrepreneurs in the developing world — farmers, tailors, market vendors, solar energy resellers. We prioritize high-repayment sectors and underserved regions.",
  },
  {
    num: "04",
    icon: "globe",
    title: "Loans Get Funded",
    color: "#276A43",
    body: "We fund loans directly on Kiva.org using the treasury balance. Each funding event is posted publicly — borrower name, country, sector, amount, and the Solana TX hash proving the treasury spend.",
  },
  {
    num: "05",
    icon: "ledger",
    title: "Batch Ledger Published",
    color: "#276A43",
    body: "Every funding round is recorded as a numbered batch on this dashboard. Batch #, date, loans funded, total deployed, SOL/USD rate, and an on-chain transaction hash — full transparency, no trust required.",
  },
  {
    num: "06",
    icon: "refresh",
    title: "Repayments Get Recycled",
    color: "#276A43",
    body: "Kiva borrowers repay their loans over time. When repayments come in, we reinvest them into new loans rather than withdrawing. Your fees keep giving — one dollar lifts multiple lives over time.",
  },
];

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-white">

      {/* HERO */}
      <div className="text-white py-20 px-6 text-center"
        style={{ background: "#223829" }}>
        <div className="max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-widest mb-6">
            Transparent by Design
          </div>
          <h1 className="text-5xl font-extrabold mb-4"
            style={{ fontFamily: "var(--font-serif)" }}>
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
          <div className="absolute left-[39px] top-8 bottom-8 w-0.5 bg-gradient-to-b from-[#276A43] to-[#EDF4F1]" />

          <div className="flex flex-col gap-10">
            {STEPS.map((step) => (
              <div key={step.num} className="flex gap-6 items-start">
                <div className="w-20 h-20 rounded-full flex items-center justify-center flex-shrink-0 relative z-10 bg-[#EDF4F1] border-2 border-[#D9E6DF] text-[#276A43]">
                  <Icon name={step.icon} className="w-8 h-8" />
                </div>
                <div className="bg-white rounded-2xl border border-[#E4EBE7] shadow-[0_4px_15px_rgba(0,0,0,0.05)] p-6 flex-1">
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
        <div className="mt-16 bg-white rounded-2xl border border-[#E4EBE7] shadow-[0_4px_15px_rgba(0,0,0,0.05)] p-8">
          <h2 className="text-2xl font-extrabold text-[#223829] mb-6">Why You Can Trust This</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { icon: "lock", title: "On-Chain Treasury", body: "Every SOL deposit and spend is recorded on Solana's public ledger. Anyone can verify the wallet balance and transaction history — no middlemen." },
              { icon: "ledger", title: "Public Batch Ledger", body: "Each funding round is published on this dashboard with a numbered batch, borrower names, and the Solana TX hash proving the spend." },
              { icon: "globe", title: "Kiva Verification", body: "Loans are funded through Kiva.org — a non-profit with 97%+ repayment rates and 15+ years of verified impact across 80 countries." },
            ].map(({ icon, title, body }) => (
              <div key={title} className="text-center p-4">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[#EDF4F1] flex items-center justify-center text-[#276A43]">
                  <Icon name={icon} className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-extrabold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-10 text-center">
          <Link href="/" className="inline-flex items-center gap-2 bg-[#276A43] hover:bg-[#223829] text-white rounded-full px-8 py-3.5 text-sm font-bold transition-all shadow-lg">
            ← Back to Dashboard
          </Link>
        </div>
      </div>

    </div>
  );
}
