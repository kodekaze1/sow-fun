"use client";
import Link from "next/link";
import { useState } from "react";
import Icon from "@/components/icons";

const FAQS = [
  {
    category: "The Token",
    items: [
      {
        q: "What is $SOW?",
        a: "$SOW is a Solana token where every trade does good. A portion of every buy and sell fee flows into a transparent on-chain treasury that funds Kiva microloans for real entrepreneurs in the developing world. It's not a charity token - it's a self-sustaining impact engine.",
      },
      {
        q: "Where can I buy $SOW?",
        a: "$SOW launches on Solana via a Meteora Dynamic Bonding Curve (DBC) pool that we configure and control. Once live, you can trade it through any Solana DEX aggregator (Jupiter, Raydium). The contract address will be published on this site and @sowfunhq on X.",
      },
      {
        q: "Is there a presale or whitelist?",
        a: "No presale. No whitelist. Fair launch only - everyone gets in at the same time, same price. This is intentional: a fair launch creates a level playing field and avoids the insider dumps that kill most tokens.",
      },
      {
        q: "What happens to $SOW's own trading fees?",
        a: "$SOW is a launchpad coin like any other - it launched through the same immutable pool config, so 45% of its fees fund its pledged Kiva borrowers and 10% covers operations. The 45% creator share, which for the genesis coin belongs to the project, accrues to the public Genesis Vault. That vault is committed back to the ecosystem - bonus loans beyond the pledge, $SOW buyback-and-burns, or community rewards, depending on what does the most good as the project grows. The mix stays flexible by design, but every deployment is published in the ledger with transaction receipts. It is never sold off quietly.",
      },
      {
        q: "What is the total supply?",
        a: "1,000,000,000 $SOW (1 billion). 80% is available via fair launch, 10% goes to the liquidity pool (locked for 1 year), 5% to the team (vested 18 months), and 5% to a community/airdrop reserve.",
      },
    ],
  },
  {
    category: "The Fees & Treasury",
    items: [
      {
        q: "What percentage of trades goes to Kiva loans?",
        a: "Every coin on sow.fun trades with a 2% pool fee, split three ways and locked at launch: 45% to the coin's pledged Kiva loan, 45% to the coin's creator (claimed directly from the pool), and 10% to operations. Nobody - including us - can change a coin's split after launch; it is enforced by the pool config on-chain.",
      },
      {
        q: "How do I know the treasury is real?",
        a: "The treasury is a public Solana wallet address listed on this site. Every SOL deposit and spend is permanently recorded on Solana's blockchain - anyone can verify the balance and transaction history at any time using Solana Explorer. No trust required.",
      },
      {
        q: "How do crypto fees actually become Kiva loans?",
        a: "Honestly, over a fiat bridge - Kiva only accepts card or PayPal for loans, not crypto (their crypto donation page funds Kiva's operations, not borrowers). So each harvest works like this: the vault's fee share is claimed on-chain (public transaction), converted to USD on an exchange (trade receipt), deposited to our Kiva lender account, and lent to borrowers with the loan links published. Every hop has a receipt in the harvest ledger, so you never have to trust the middle - you can audit it.",
      },
      {
        q: "What happens when a token raises more than its borrower needs?",
        a: "That is the normal case - a busy token can out-earn a $500 loan in days. The excess follows one public rule, per coin, per harvest: 80% goes to the next borrower (the creator adopts a new fundraising borrower from their dashboard, signed with a free on-chain memo, and the coin's lives-lifted counter keeps climbing); 20% market-buys $SOW, of which half (10 points) is burned with a published transaction and half (10 points) accrues as the creator's reward. Rewards pay out to the creator's wallet each time their coin fully funds a borrower - verified against the Kiva loan, never raw volume, so wash trading earns nothing. Every buy, burn, and payout is listed in the public rewards ledger and on the creator dashboard. If a beneficiary's loan fills or expires before a harvest executes, the whole harvest rolls to the next adopted borrower.",
      },
      {
        q: "Can two coins be launched for the same borrower?",
        a: "No - one coin per borrower. The first coin launched for a Kiva loan claims that borrower, and the launch picker then shows their card as 'Already sown' with a link to the existing token instead. This keeps the story clean: one coin, one borrower, one lives-lifted count - and it means the best way to support a claimed borrower is to trade their existing coin. When a coin's loan fills and it adopts a successor, the new borrower is claimed by that same coin.",
      },
      {
        q: "What if the borrower's loan fills up before my coin's fees are harvested?",
        a: "It can happen - Kiva loans are funded by thousands of lenders worldwide, and a popular loan can close in days while your coin's fees are still accruing. Three things protect the pledge: the launch picker shows each loan's remaining amount, days left, and a 'filling fast' warning so you pick with eyes open; our claims console flags any coin whose loan is over 80% funded so we harvest early, before the crowd closes it; and if the loan closes anyway, 100% of the pledged fees roll to the next borrower the coin adopts. Nothing is ever lost, held back, or quietly rerouted - the token page shows exactly which borrower the fees flow to at any moment.",
      },
      {
        q: "How often are loans funded?",
        a: "We run a harvest whenever a coin's vault share justifies one - and immediately when a coin's borrower is close to fully funded, so its own fees land before the crowd closes the loan. Each harvest is published in the ledger with per-coin claim snapshots, borrower names, amounts, and the transaction hashes proving each hop.",
      },
      {
        q: "Can I see which specific loans were funded?",
        a: "Yes - the Harvest Ledger on the dashboard lists every loan we've funded, including the borrower's name, location, sector, amount, and the Kiva loan link. Full transparency is a core principle.",
      },
    ],
  },
  {
    category: "Kiva & The Borrowers",
    items: [
      {
        q: "What is Kiva?",
        a: "Kiva is a non-profit founded in 2005 that connects lenders with entrepreneurs in the developing world. They've facilitated over $2 billion in loans across 80+ countries with a 97%+ repayment rate. They are one of the most trusted microfinance platforms in the world.",
      },
      {
        q: "Are these real people?",
        a: "Yes. Every borrower on Kiva is a real person with a verified profile, photo, business description, and loan purpose. Kiva's field partners vet borrowers before they appear on the platform. In production, borrower photos come directly from Kiva's API.",
      },
      {
        q: "What happens when loans get repaid?",
        a: "We use the recycling model - repaid principal gets reinvested into new loans rather than withdrawn. One dollar of trading fees can fund multiple borrowers over time as it cycles through repayments. This is how the impact compounds.",
      },
      {
        q: "What sectors do you fund?",
        a: "We prioritize agriculture & food (42%), retail & services (28%), education (18%), and clean energy (12%). These sectors have the highest repayment rates and the most measurable impact on household income.",
      },
    ],
  },
  {
    category: "Trust & Safety",
    items: [
      {
        q: "Is the liquidity locked?",
        a: "Yes - 10% of the total supply goes into the liquidity pool and is locked for 1 year at launch. This prevents rug pulls and ensures trading remains stable regardless of what any single holder does.",
      },
      {
        q: "Is the contract audited?",
        a: "Audit details will be published before launch. On Solana, SPL token mints are fixed at deployment, and our Meteora DBC pool configuration (including the fee split) is immutable once created - it cannot be changed by anyone, including the team.",
      },
      {
        q: "How is this different from other charity tokens?",
        a: "Most charity tokens send fees to a wallet you have to trust. $SOW uses Kiva's public API and publishes every loan funding event with an on-chain proof. The recycling model means funds don't disappear - they keep working. And Kiva is a regulated 501(c)(3) with 20 years of track record.",
      },
    ],
  },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`border border-gray-100 rounded-xl overflow-hidden transition-all ${open ? "bg-[#EDF4F1]" : "bg-white hover:bg-[#F8F2E6]"}`}>
      <button
        className="w-full text-left px-6 py-4 flex items-center justify-between gap-4"
        onClick={() => setOpen(!open)}
      >
        <span className="font-bold text-gray-900 text-sm leading-snug">{q}</span>
        <span className="text-xl text-[#276A43] flex-shrink-0 font-light">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div className="px-6 pb-5 text-sm text-gray-500 leading-relaxed border-t border-gray-100 pt-3">
          {a}
        </div>
      )}
    </div>
  );
}

export default function FAQPage() {
  return (
    <div className="min-h-screen bg-white">

      {/* HERO */}
      <div className="relative overflow-hidden bg-[#223829] text-white py-20 px-6 text-center">
        <img src="/images/vendor-smile.jpg" alt="" aria-hidden="true" className="absolute inset-0 w-full h-full object-cover opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#16261c]/85 to-[#16261c]/55" />
        <div className="relative max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-widest mb-6">
            Got Questions?
          </div>
          <h1 className="text-5xl font-extrabold mb-4"
            style={{ fontFamily: "var(--font-serif)" }}>
            FAQ
          </h1>
          <p className="text-lg opacity-80 leading-relaxed">
            Everything you need to know about $SOW, the treasury, and how your trades fund real lives.
          </p>
        </div>
      </div>

      <div className="max-w-[800px] mx-auto px-6 py-16 flex flex-col gap-12">
        {FAQS.map(({ category, items }) => (
          <div key={category}>
            <h2 className="text-xs font-black uppercase tracking-widest text-[#276A43] mb-4">{category}</h2>
            <div className="flex flex-col gap-2">
              {items.map((item) => (
                <FAQItem key={item.q} q={item.q} a={item.a} />
              ))}
            </div>
          </div>
        ))}

        {/* STILL HAVE QUESTIONS */}
        <div className="bg-white rounded-2xl border border-[#E4EBE7] shadow-[0_4px_15px_rgba(0,0,0,0.05)] transition-shadow duration-300 hover:shadow-[0_10px_28px_rgba(34,56,41,0.10)] p-8 text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-[#EDF4F1] flex items-center justify-center text-[#223829]">
            <Icon name="message" className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-extrabold text-gray-900 mb-2">Still have questions?</h3>
          <p className="text-gray-400 text-sm mb-5">Find us on X or browse the live dashboard to see the treasury and loans in action.</p>
          <div className="flex flex-wrap justify-center gap-3">
            <a href="https://x.com/sowfunhq" target="_blank" rel="noopener noreferrer"
              className="bg-black text-white rounded-full px-6 py-2.5 text-sm font-bold hover:bg-gray-800 transition-all">
              @sowfunhq on X
            </a>
            <Link href="/"
              className="bg-[#276A43] text-white rounded-full px-6 py-2.5 text-sm font-bold hover:bg-[#223829] transition-all">
              View Dashboard
            </Link>
          </div>
        </div>

        <div className="text-center">
          <Link href="/" className="inline-flex items-center gap-2 text-[#276A43] hover:text-[#223829] text-sm font-bold transition-colors">
            ← Back to Dashboard
          </Link>
        </div>
      </div>

    </div>
  );
}
