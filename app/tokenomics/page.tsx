import Link from "next/link";
import { SOW_TEAM_ALLOCATION, SOW_LOCK_URL, SOW_TEAM_USES } from "@/lib/launchpad";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tokenomics | sow.fun",
  description: "One 2% fee split 45/45/10 and locked at launch. 85 SOL graduation, permanently locked liquidity, and a public rule for excess fees.",
  openGraph: { title: "Tokenomics | sow.fun", description: "One 2% fee, split for impact, locked at launch." },
};
import Icon from "@/components/icons";

export default function TokenomicsPage() {
  return (
    <div className="min-h-screen bg-white">

      {/* HERO */}
      <div className="relative overflow-hidden bg-[#223829] text-white pt-16 pb-14 px-6 text-center">
        <img src="/images/hero-market.jpg" alt="" aria-hidden="true" className="absolute inset-0 w-full h-full object-cover opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#16261c]/85 to-[#16261c]/55" />
        <div className="relative max-w-2xl mx-auto flex flex-col items-center gap-4">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-[11px] font-semibold uppercase tracking-widest">
            $SOW on Solana
          </div>
          <h1 className="font-serif text-4xl md:text-5xl font-medium tracking-tight leading-[1.1] [text-wrap:balance]">
            Tokenomics
          </h1>
          <p className="text-base md:text-lg opacity-85 leading-relaxed max-w-lg [text-wrap:balance]">
            One 2% fee, split for impact, locked at launch - every trade does good.
          </p>
        </div>
      </div>

      <div className="max-w-[900px] mx-auto px-6 py-16 flex flex-col gap-10">

        {/* TOKEN OVERVIEW */}
        <img src="/images/illustrations/seedpacket.png" alt="" aria-hidden="true"
          className="w-40 mx-auto -mb-4 rotate-[2deg] mix-blend-multiply" />
        <div className="bg-white rounded-2xl border border-[#E4EBE7] shadow-[0_4px_15px_rgba(0,0,0,0.05)] transition-shadow duration-300 hover:shadow-[0_10px_28px_rgba(34,56,41,0.10)] p-8">
          <h2 className="text-2xl font-extrabold text-[#223829] mb-6">Token Overview</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
            {[
              { label: "Ticker", value: "$SOW" },
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
        <div className="bg-white rounded-2xl border border-[#E4EBE7] shadow-[0_4px_15px_rgba(0,0,0,0.05)] transition-shadow duration-300 hover:shadow-[0_10px_28px_rgba(34,56,41,0.10)] p-8">
          <h2 className="text-2xl font-extrabold text-[#223829] mb-2">Fee Structure</h2>
          <p className="text-gray-500 text-sm mb-6 max-w-xl [text-wrap:balance]">Every coin here, $SOW included, pays a 2% fee on its bonding curve (1% after graduation), split three ways and locked at launch:</p>
          <div className="flex flex-col gap-4">
            {[
              { pct: "45%", label: "Kiva Loans (Impact Vault)", color: "#276A43", icon: "globe", desc: "Claimed by the public sow.fun vault and deployed as microloans for the coin's pledged borrower - receipts at every hop." },
              { pct: "45%", label: "The Creator", color: "#2AA967", icon: "coins", desc: "Claimed directly from the pool by whoever launched the coin - sow.fun never touches it." },
              { pct: "10%", label: "Operations", color: "#996210", icon: "sliders", desc: "Keeps the lights on: infrastructure, the fiat bridge costs, and the harvest pipeline." },
            ].map(({ pct, label, color, icon, desc }) => (
              <div key={label} className="flex items-start gap-4 p-4 rounded-xl border border-gray-100 hover:bg-[#EDF4F1] transition-colors">
                <div className="w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: `${color}14`, color }}>
                  <Icon name={icon} className="w-7 h-7" />
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
        <div className="bg-white rounded-2xl border border-[#E4EBE7] shadow-[0_4px_15px_rgba(0,0,0,0.05)] transition-shadow duration-300 hover:shadow-[0_10px_28px_rgba(34,56,41,0.10)] p-8">
          <h2 className="text-2xl font-extrabold text-[#223829] mb-6">Token Distribution</h2>
          {/* Public vs team: everything the team does not buy is the public's
              (the curve plus the locked graduation pool) */}
          <div className="flex h-3 rounded-full overflow-hidden mb-5" role="img"
            aria-label={`${100 - SOW_TEAM_ALLOCATION.pct}% public, ${SOW_TEAM_ALLOCATION.pct}% team buy locked on Streamflow`}>
            <div className="h-full bg-[#276A43]" style={{ width: `${100 - SOW_TEAM_ALLOCATION.pct}%` }} />
            <div className="h-full bg-[#C9971F]" style={{ width: `${SOW_TEAM_ALLOCATION.pct}%` }} />
          </div>
          <div className="flex flex-col gap-4">
            <div className="flex gap-3">
              <span className="w-3 h-3 rounded-sm mt-1 flex-shrink-0 bg-[#276A43]" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap justify-between items-baseline gap-x-3 text-sm">
                  <span className="font-bold text-gray-800">Public</span>
                  <span className="font-mono text-xs font-bold text-[#276A43]">{100 - SOW_TEAM_ALLOCATION.pct}% · ~{((100 - SOW_TEAM_ALLOCATION.pct) * 10_000_000).toLocaleString("en-US")}</span>
                </div>
                <p className="text-[13px] text-gray-500 leading-relaxed mt-0.5">
                  Everything outside the team&apos;s share belongs to the market. About {80 - SOW_TEAM_ALLOCATION.pct}% is sold on the
                  bonding curve; the last 20% seeds the trading pool when $SOW graduates at 85 SOL raised, and that
                  liquidity is permanently locked - it can never be pulled and keeps paying the 45/45/10 split at a
                  1% fee. No presale, no private round, no free team tokens.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="w-3 h-3 rounded-sm mt-1 flex-shrink-0 bg-[#C9971F]" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap justify-between items-baseline gap-x-3 text-sm">
                  <span className="font-bold text-gray-800">Team - locked</span>
                  <span className="font-mono text-xs font-bold text-[#996210]">{SOW_TEAM_ALLOCATION.pct}% · ~{(SOW_TEAM_ALLOCATION.pct * 10_000_000).toLocaleString("en-US")}</span>
                </div>
                <p className="text-[13px] text-gray-500 leading-relaxed mt-0.5">
                  Locked on Streamflow: a {SOW_TEAM_ALLOCATION.cliffMonths}-month cliff, then unlocking linearly over{" "}
                  {SOW_TEAM_ALLOCATION.linearMonths} months.
                  {SOW_LOCK_URL && (
                    <>{" "}<a href={SOW_LOCK_URL} target="_blank" rel="noopener noreferrer" className="font-bold text-[#276A43] hover:underline">View the lock ↗</a></>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* What the team's tokens are for - a public commitment, not a bag */}
          <div className="mt-7 pt-6 border-t border-gray-100">
            <h3 className="text-base font-extrabold text-[#223829] mb-1">What the team&apos;s {SOW_TEAM_ALLOCATION.pct}% is for</h3>
            <p className="text-[13px] text-gray-500 leading-relaxed mb-4">
              The team allocation works for the mission, not a cash-out. As tokens unlock, they go where they do the most
              good - things like:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {SOW_TEAM_USES.map((u) => (
                <div key={u.title} className="rounded-xl bg-[#EDF4F1] p-4">
                  <div className="text-sm font-extrabold text-[#223829] mb-1">{u.title}</div>
                  <p className="text-[13px] text-gray-600 leading-relaxed">{u.body}</p>
                </div>
              ))}
            </div>
            <p className="text-[13px] text-gray-500 leading-relaxed mt-4">
              <span className="font-bold text-[#223829]">The rules:</span> nothing can move before the cliff - the
              Streamflow lock enforces it. After that, every move of team tokens is published in the public ledger with
              its transaction receipt.
            </p>
          </div>

          <p className="text-xs text-gray-400 mt-5 leading-relaxed">
            Total supply 1,000,000,000, fixed at launch (mint authority revoked). Launching a coin costs a 0.035 SOL
            launch fee, enforced on-chain, which funds the vault and makes bot squatting expensive.
          </p>
        </div>

        {/* IMPACT MODEL */}
        <div className="bg-white rounded-2xl border border-[#E4EBE7] shadow-[0_4px_15px_rgba(0,0,0,0.05)] transition-shadow duration-300 hover:shadow-[0_10px_28px_rgba(34,56,41,0.10)] p-8">
          <h2 className="text-2xl font-extrabold text-[#223829] mb-2">The Recycling Model</h2>
          <p className="text-gray-400 text-sm mb-6">Unlike charity tokens where funds disappear, $SOW runs a recycling model:</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { icon: "coins", title: "Fees → Treasury", body: "Trading fees accumulate in the public Solana treasury wallet." },
              { icon: "heart", title: "Treasury → Kiva", body: "Funds are deployed as Kiva microloans to vetted entrepreneurs." },
              { icon: "refresh", title: "Repayments → New Loans", body: "When borrowers repay, capital gets reinvested - not withdrawn. One dollar, many lives." },
            ].map(({ icon, title, body }) => (
              <div key={title} className="p-5 bg-[#EDF4F1] rounded-xl flex flex-col gap-2">
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#223829]">
                  <Icon name={icon} className="w-5 h-5" />
                </div>
                <h3 className="text-base font-extrabold text-gray-900">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* WAVE POLICY */}
        <div className="bg-white rounded-2xl border border-[#E4EBE7] shadow-[0_4px_15px_rgba(0,0,0,0.05)] transition-shadow duration-300 hover:shadow-[0_10px_28px_rgba(34,56,41,0.10)] p-8">
          <h2 className="text-2xl font-extrabold text-[#223829] mb-2">Excess Fees & Creator Rewards</h2>
          <p className="text-gray-500 text-sm mb-6 max-w-xl [text-wrap:balance]">
            Coins usually raise more than their borrower needs. Once the launch borrower is funded, every extra dollar follows one public rule:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { icon: "heart", title: "80% - The borrower queue", body: "Funds up to 5 borrowers the creator lines up, in order. Borrowers who close or belong to another coin are skipped." },
              { icon: "refresh", title: "10% - $SOW burned", body: "Half of the $SOW bought back with excess fees is burned. Every successful launch makes $SOW scarcer." },
              { icon: "sparkle", title: "10% - Creator rewards", body: "The other half pays the creator in $SOW for every borrower their coin fully funds. Real loans, not volume." },
            ].map(({ icon, title, body }) => (
              <div key={title} className="p-5 bg-[#EDF4F1] rounded-xl flex flex-col gap-2">
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#223829]">
                  <Icon name={icon} className="w-5 h-5" />
                </div>
                <h3 className="text-base font-extrabold text-gray-900">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
          <ul className="mt-5 flex flex-col gap-1.5 text-[13px] text-gray-500 leading-relaxed">
            <li className="flex gap-2"><span className="text-[#276A43] font-bold">·</span>If the borrower&apos;s loan fills or expires before a harvest, the money flows down the queue instead.</li>
            <li className="flex gap-2"><span className="text-[#276A43] font-bold">·</span>If the queue is empty for 72 hours while money waits, sow.fun funds a borrower in the same category.</li>
            <li className="flex gap-2"><span className="text-[#276A43] font-bold">·</span>Creator rewards are paid only when loans verifiably fund on Kiva.</li>
          </ul>
        </div>

        {/* GENESIS VAULT */}
        <div className="bg-[#FBF6EA]/80 rounded-2xl border border-[#F8CD69]/30 p-8">
          <h2 className="text-2xl font-extrabold text-[#223829] mb-2">$SOW is a launchpad coin too</h2>
          <p className="text-gray-500 text-sm mb-5 max-w-xl [text-wrap:balance]">
            No special treatment: $SOW launched through the same pool config as every other coin.
          </p>
          <div className="flex flex-col gap-4 text-gray-600 leading-relaxed max-w-[65ch]">
            <p>
              Its fees follow the same locked split: 45% to its pledged Kiva borrowers and 10% to operations.
              The 45% creator share belongs to the project and goes to the{" "}
              <span className="font-bold text-[#223829]">Genesis Vault</span>.
            </p>
            <div>
              <p className="mb-2">The Genesis Vault goes back into the garden, as $SOW needs it:</p>
              <ul className="flex flex-col gap-1">
                <li className="flex gap-2"><span className="text-[#276A43] font-bold">·</span>bonus borrower loans beyond the pledge</li>
                <li className="flex gap-2"><span className="text-[#276A43] font-bold">·</span>buying back and burning $SOW</li>
                <li className="flex gap-2"><span className="text-[#276A43] font-bold">·</span>community rewards</li>
              </ul>
            </div>
            <p>
              The mix stays flexible on purpose, but never quiet: every deployment is published in the ledger with
              transaction receipts, the vault&apos;s address is public, and it is never sold off silently.
            </p>
          </div>
          <p className="text-xs text-gray-400 leading-relaxed mt-5 max-w-[65ch]">
            In short: 55% of every $SOW trade is pre-committed (45 loans, 10 ops), and the remaining 45% works for the
            ecosystem in whichever form does the most good - with receipts.
          </p>
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
