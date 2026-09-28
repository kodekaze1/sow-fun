import Link from "next/link";
import Icon from "@/components/icons";

const STEPS = [
  {
    num: "01",
    icon: "heart",
    title: "Pick a Real Borrower",
    color: "#276A43",
    body: "Every launch starts with a person, not a ticker. Browse live fundraising borrowers straight from Kiva - farmers, tailors, market vendors, solar resellers - filter by region and sector, and pick who your coin works for.",
  },
  {
    num: "02",
    icon: "lock",
    title: "Launch With the Split Locked",
    color: "#276A43",
    body: "Your coin launches on its own Meteora bonding curve with a 2% trading fee, split 45% to you, 45% to your borrower's loan, 10% to operations. The split is enforced by the pool config on-chain - nobody, including us, can change it after launch.",
  },
  {
    num: "03",
    icon: "coins",
    title: "Fees Flow From the First Trade",
    color: "#276A43",
    body: "No graduation needed. From the very first swap, the loan's share of every trade accrues in the pool. Most Kiva loans are a few hundred dollars - a coin can fully fund its borrower while still early on its curve.",
  },
  {
    num: "04",
    icon: "vault",
    title: "The Harvest",
    color: "#276A43",
    body: "The public sow.fun vault claims the impact share on-chain, converts it, and pays the loan on Kiva.org. Every hop ships with a receipt: the claim transaction, the conversion, and the Kiva loan link - audit it, don't trust it.",
  },
  {
    num: "05",
    icon: "ledger",
    title: "The Harvest Ledger",
    color: "#276A43",
    body: "Every harvest is recorded publicly: which coin generated which dollars, which borrower received them, and the transaction hashes proving each step. Per-coin attribution is snapshotted at claim time - no hand-waving.",
  },
  {
    num: "06",
    icon: "refresh",
    title: "The Cycle Continues",
    color: "#276A43",
    body: "When a loan fills, excess fees follow one public rule: 80% adopts the creator's next borrower, 10% burns $SOW, 10% rewards the creator for every life their coin lifted. Repayments recycle into new loans. Sow, grow, harvest, repeat.",
  },
];

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-white">

      {/* HERO */}
      <div className="relative overflow-hidden bg-[#223829] text-white py-20 px-6 text-center">
        <img src="/images/hands-wide.jpg" alt="" aria-hidden="true" className="absolute inset-0 w-full h-full object-cover opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#16261c]/85 to-[#16261c]/55" />
        <div className="relative max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-widest mb-6">
            Transparent by Design
          </div>
          <h1 className="text-5xl font-extrabold mb-4"
            style={{ fontFamily: "var(--font-serif)" }}>
            How It Works
          </h1>
          <p className="text-lg opacity-80 leading-relaxed">
            From launching a coin to a borrower&apos;s funded dream - here&apos;s the full journey, step by step.
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
                <div className="w-20 h-20 rounded-full flex items-center justify-center flex-shrink-0 relative z-10 bg-[#EDF4F1] border-2 border-[#D9E6DF] text-[#223829]">
                  <Icon name={step.icon} className="w-8 h-8" />
                </div>
                <div className="bg-white rounded-2xl border border-[#E4EBE7] shadow-[0_4px_15px_rgba(0,0,0,0.05)] transition-shadow duration-300 hover:shadow-[0_10px_28px_rgba(34,56,41,0.10)] p-6 flex-1">
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
        <div className="mt-16 bg-white rounded-2xl border border-[#E4EBE7] shadow-[0_4px_15px_rgba(0,0,0,0.05)] transition-shadow duration-300 hover:shadow-[0_10px_28px_rgba(34,56,41,0.10)] p-8">
          <h2 className="text-2xl font-extrabold text-[#223829] mb-6">Why You Can Trust This</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { icon: "lock", title: "Immutable Splits", body: "The 45/45/10 fee split is enforced by each pool's on-chain config, set once at launch. Liquidity is permanently locked at graduation - no rug, no rewrite." },
              { icon: "ledger", title: "Public Harvest Ledger", body: "Every harvest is published with per-coin claim snapshots, borrower names, and the transaction hashes proving each hop from pool to loan." },
              { icon: "globe", title: "Kiva Verification", body: "Loans are funded through Kiva.org - a non-profit with 96%+ repayment rates and nearly two decades of verified impact across 80 countries." },
            ].map(({ icon, title, body }) => (
              <div key={title} className="text-center p-4">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[#EDF4F1] flex items-center justify-center text-[#223829]">
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
          <Link href="/launch" className="inline-flex items-center gap-2 bg-[#276A43] hover:bg-[#223829] text-white rounded-full px-8 py-3.5 text-sm font-bold transition-all shadow-lg">
            Launch a coin for a borrower →
          </Link>
        </div>
      </div>

    </div>
  );
}
