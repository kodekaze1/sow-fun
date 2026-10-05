import Link from "next/link";
import Icon from "@/components/icons";
import { KIVA_LENDER_URL, KIVA_TEAM_URL, X_LINK } from "@/lib/constants";

export const metadata = {
  title: "About | sow.fun",
  description: "Who we are, why we built a launchpad where trading fees fund real microloans, and how every dollar stays verifiable.",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">

      {/* HERO */}
      <div className="relative overflow-hidden bg-[#223829] text-white py-20 px-6 text-center">
        <img src="/images/hands-wide.jpg" alt="" aria-hidden="true" className="absolute inset-0 w-full h-full object-cover opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#16261c]/85 to-[#16261c]/55" />
        <div className="relative max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-widest mb-6">
            About sow.fun
          </div>
          <h1 className="text-5xl font-extrabold mb-4" style={{ fontFamily: "var(--font-serif)" }}>
            Memecoin energy, <span className="italic text-[#F8CD69]">pointed at people.</span>
          </h1>
          <p className="text-lg opacity-80 leading-relaxed">
            We watched crypto route millions in trading fees to celebrities and insiders,
            and asked a simpler question: what if a coin worked for someone who needs $500?
          </p>
        </div>
      </div>

      <div className="max-w-[820px] mx-auto px-6 py-16 flex flex-col gap-10">

        {/* MISSION */}
        <div className="bg-white rounded-2xl border border-[#E4EBE7] shadow-[0_4px_15px_rgba(0,0,0,0.05)] p-8">
          <h2 className="text-2xl font-extrabold text-[#223829] mb-4">What we are</h2>
          <p className="text-gray-600 leading-relaxed mb-4">
            sow.fun is a memecoin launchpad on Solana where every coin is launched for a real
            borrower on Kiva. At launch, the coin&apos;s 2% trading fee is split on-chain:
            45% to the creator, 45% locked for the borrower&apos;s microloan, 10% to operations.
            Nobody can change that split afterward - not the creator, not us.
          </p>
          <p className="text-gray-600 leading-relaxed">
            Fees fund the loan from the very first trade. When a loan fills, excess fees fund
            the borrowers its creator lined up, and repayments recycle into new loans. One coin, many lives,
            every hop published with a receipt.
          </p>
        </div>

        {/* GENESIS */}
        <div className="bg-[#FBF6EA]/80 rounded-2xl border border-[#F8CD69]/30 p-8">
          <h2 className="text-2xl font-extrabold text-[#223829] mb-4">The genesis harvest</h2>
          <p className="text-gray-600 leading-relaxed mb-4">
            Before asking anyone else to trust the pipeline, we ran it ourselves. Harvest #001
            was founder-seeded: $50 crossed the full loop - on-chain treasury, fiat bridge,
            Kiva checkout - and funded two real borrowers: Valeti, a tapa cloth maker in Tonga,
            and Monica, who runs a posho mill in Kenya.
          </p>
          <p className="text-gray-600 leading-relaxed">
            Both loans are public on our{" "}
            <a href={KIVA_LENDER_URL} target="_blank" rel="noopener noreferrer" className="font-bold text-[#276A43] hover:underline">
              Kiva lender profile
            </a>{" "}
            and recorded in the{" "}
            <Link href="/treasury" className="font-bold text-[#276A43] hover:underline">
              Harvest Ledger
            </Link>{" "}
            with every movement documented. That is the standard every future harvest follows.
          </p>
        </div>

        {/* VALUES */}
        <div className="bg-white rounded-2xl border border-[#E4EBE7] shadow-[0_4px_15px_rgba(0,0,0,0.05)] p-8">
          <h2 className="text-2xl font-extrabold text-[#223829] mb-6">How we operate</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { icon: "lock", title: "Immutable by design", body: "Fee splits are enforced by each pool's on-chain config, set once at launch. Liquidity is permanently locked at graduation." },
              { icon: "ledger", title: "Receipts, not promises", body: "Every harvest publishes its claim transactions, conversions, and Kiva loan links. If a hop has no receipt, it did not happen." },
              { icon: "heart", title: "Honest accounting", body: "Kiva loans and Kiva donations are different things, and we never conflate them. Loan dollars are tracked separately, to the cent." },
            ].map(({ icon, title, body }) => (
              <div key={title} className="text-center p-4">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[#EDF4F1] flex items-center justify-center text-[#223829]">
                  <Icon name={icon} className="w-6 h-6" />
                </div>
                <h3 className="text-base font-extrabold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CYCLE ILLUSTRATION */}
        <div className="text-center">
          <img src="/images/illustrations/cycle.png" alt="Sow, grow, harvest, repeat"
            className="w-full max-w-sm mx-auto rotate-[-1.5deg] mix-blend-multiply" />
        </div>

        {/* COMPANY */}
        <div className="bg-white rounded-2xl border border-[#E4EBE7] shadow-[0_4px_15px_rgba(0,0,0,0.05)] p-8">
          <h2 className="text-2xl font-extrabold text-[#223829] mb-4">The company</h2>
          <p className="text-gray-600 leading-relaxed mb-4">
            sow.fun is operated by <span className="font-bold text-[#223829]">SOW FUN LLC</span>,
            a limited liability company registered in New Mexico, United States. We lend on Kiva
            through the public lender account{" "}
            <a href={KIVA_LENDER_URL} target="_blank" rel="noopener noreferrer" className="font-bold text-[#276A43] hover:underline">sowfun</a>{" "}
            and host the community lending team{" "}
            <a href={KIVA_TEAM_URL} target="_blank" rel="noopener noreferrer" className="font-bold text-[#276A43] hover:underline">sow.fun on Kiva</a>.
          </p>
          <p className="text-gray-600 leading-relaxed">
            sow.fun is an independent project. We are not affiliated with, endorsed by, or
            sponsored by Kiva Microfunds - we are simply one of their lenders, at scale.
          </p>
        </div>

        {/* CONTACT */}
        <div className="text-center">
          <p className="text-gray-500 text-sm mb-5">
            Questions, press, or partnerships - we read everything.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <a href={X_LINK} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-[#276A43] hover:bg-[#223829] text-white rounded-full px-7 py-3 text-sm font-bold transition-colors">
              @sowfunhq on X
            </a>
            <a href="mailto:contact@sow.fun"
              className="inline-flex items-center gap-2 border border-[#D9E6DF] hover:border-[#276A43] text-[#223829] rounded-full px-7 py-3 text-sm font-bold transition-colors">
              contact@sow.fun
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}
