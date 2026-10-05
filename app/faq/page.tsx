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
        a: "No presale, no whitelist, no private round. The team holds ~10% of supply, locked on Streamflow (1-month cliff, then unlocking linearly over 6 months) - the lock is public and linked from the tokenomics page.",
      },
      {
        q: "What happens to $SOW's own trading fees?",
        a: "$SOW is a launchpad coin like any other - it launched through the same immutable pool config, so 45% of its fees fund its pledged Kiva borrowers and 10% covers operations. The 45% creator share, which for the genesis coin belongs to the project, accrues to the public Genesis Vault. That vault is committed back to the ecosystem - bonus loans beyond the pledge, $SOW buyback-and-burns, or community rewards, depending on what does the most good as the project grows. The mix stays flexible by design, but every deployment is published in the ledger with transaction receipts. It is never sold off quietly.",
      },
      {
        q: "What is the total supply?",
        a: "1,000,000,000 $SOW (1 billion), fixed forever - the mint authority is revoked at launch. 90% is the public's: about 70% sold on the bonding curve plus the 20% that seeds the trading pool when $SOW graduates, where the liquidity is permanently locked. ~10% is the team's, locked on Streamflow (1-month cliff, then linear over 6 months). As it unlocks it goes to the mission - bonus Kiva loans, creator grants, $SOW burns and building sow.fun - and every move is published with its transaction receipt. No presale, no airdrop reserve.",
      },
    ],
  },
  {
    category: "The Fees & Treasury",
    items: [
      {
        q: "What percentage of trades goes to Kiva loans?",
        a: "Every coin on sow.fun trades with a 2% pool fee, split three ways and locked at launch: 45% to the coin's pledged Kiva loan, 45% to the coin's creator (claimed directly from the pool), and 10% to operations. Nobody - including us - can change a coin's split after launch; it is enforced by the pool config on-chain. When a coin graduates (85 SOL raised on its curve) it moves to a Meteora DAMM v2 pool with a 1% fee, and 100% of its liquidity is permanently locked - 55% held by the sow.fun vault, 45% by the creator - so the same 45/45/10 split keeps flowing after graduation.",
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
        a: "That is the normal case - a busy token can out-earn a $500 loan in days. The excess follows one public rule, per coin, per harvest: 80% funds the creator's borrower queue: up to 5 borrowers they line up, funded in order (set from their dashboard with a free on-chain signature, and the coin's lives-lifted counter keeps climbing); 20% market-buys $SOW, of which half (10 points) is burned with a published transaction and half (10 points) accrues as the creator's reward. Rewards pay out to the creator's wallet each time their coin fully funds a borrower - verified against the Kiva loan, never raw volume, so wash trading earns nothing. Every buy, burn, and payout is listed in the public rewards ledger and on the creator dashboard. If a beneficiary's loan fills or expires before a harvest executes, the whole harvest flows down the queue; if the queue is empty for 72 hours, sow.fun funds a borrower in the same category.",
      },
      {
        q: "Can two coins be launched for the same borrower?",
        a: "No - one coin per borrower. The first coin launched for a Kiva loan claims that borrower, and the launch picker then shows their card as 'Already sown' with a link to the existing token instead. This keeps the story clean: one coin, one borrower, one lives-lifted count - and it means the best way to support a claimed borrower is to trade their existing coin. Only a coin's launch borrower is exclusive: borrowers in a creator's queue are a wish list, and if another coin claims one first, that borrower is simply skipped. Claims are earned, not parked: if a coin has earned less than 0.05 SOL in trading fees 72 hours after launch (and hasn't graduated), its claim lapses and the borrower reopens for someone who will actually trade them up.",
      },
      {
        q: "Can one wallet claim lots of borrowers at once?",
        a: "A wallet can hold up to 3 coins whose loans are still fundraising. Once one of your borrowers' loans fills, a slot opens and you can claim your next - so prolific launchers are the ones actually funding people, not just collecting claims. Like the one-coin-per-borrower rule, this is enforced at the interface level; the deeper protections are that every launch pays a 0.035 SOL launch fee enforced on-chain by the pool program (it funds the treasury, so squatting is expensive and pays for loans), dead coins lose their borrower after 72 hours, abusive coins can be de-indexed (which reopens the borrower), and rewards only flow for verified funded loans. Coins whose claim has lapsed stop counting toward your 3.",
      },
      {
        q: "What if the borrower's loan fills up before my coin's fees are harvested?",
        a: "It can happen - Kiva loans are funded by thousands of lenders worldwide, and a popular loan can close in days while your coin's fees are still accruing. Three things protect the pledge: the launch picker shows each loan's remaining amount, days left, and a 'filling fast' warning so you pick with eyes open; our claims console flags any coin whose loan is over 80% funded so we harvest early, before the crowd closes it; and if the loan closes anyway, the fees flow to the borrowers you've lined up in your coin's queue. Nothing is ever lost, held back, or quietly rerouted - the token page shows exactly which borrower the fees flow to at any moment.",
      },
      {
        q: "What happens when my coin earns more than its borrower needs?",
        a: "That's the goal - most Kiva loans are a few hundred dollars, so a coin that trades well funds many people. From /my you can queue up to 5 next borrowers, signed on-chain from your wallet. Once your launch borrower is funded, 80% of every extra dollar funds your queue in order, and 20% buys $SOW: half is burned, half is paid to you as creator rewards. Queued borrowers whose loans close, or who become another coin's borrower, are skipped automatically. If your queue is empty for 72 hours while money is waiting, sow.fun funds a borrower in the same category so it never sits idle. Your token page shows everything: earned, lent on Kiva, lives funded, and who's up next.",
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
      <div className="relative overflow-hidden bg-[#223829] text-white pt-16 pb-14 px-6 text-center">
        <img src="/images/vendor-smile.jpg" alt="" aria-hidden="true" className="absolute inset-0 w-full h-full object-cover opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#16261c]/85 to-[#16261c]/55" />
        <div className="relative max-w-2xl mx-auto flex flex-col items-center gap-4">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-[11px] font-semibold uppercase tracking-widest">
            Got Questions?
          </div>
          <h1 className="font-serif text-4xl md:text-5xl font-medium tracking-tight leading-[1.1] [text-wrap:balance]">
            FAQ
          </h1>
          <p className="text-base md:text-lg opacity-85 leading-relaxed max-w-lg [text-wrap:balance]">
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
