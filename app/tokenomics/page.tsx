import Link from "next/link";
import Icon from "@/components/icons";

export default function TokenomicsPage() {
  return (
    <div className="min-h-screen bg-white">

      {/* HERO */}
      <div className="relative overflow-hidden bg-[#223829] text-white py-20 px-6 text-center">
        <img src="/images/hero-market.jpg" alt="" aria-hidden="true" className="absolute inset-0 w-full h-full object-cover opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#16261c]/85 to-[#16261c]/55" />
        <div className="relative max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-widest mb-6">
            $SOW on Solana
          </div>
          <h1 className="text-5xl font-extrabold mb-4"
            style={{ fontFamily: "var(--font-serif)" }}>
            Tokenomics
          </h1>
          <p className="text-lg opacity-80 leading-relaxed">
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
          <p className="text-gray-400 text-sm mb-6">Every coin launched here (including $SOW itself) trades with a 2% pool fee on its bonding curve (1% after graduation), split three ways and locked at launch:</p>
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
          <div className="flex flex-col gap-3.5">
            {[
              { label: "Fair launch on the bonding curve (no presale, no team allocation)", pct: 100, color: "#276A43" },
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
          <p className="text-xs text-gray-400 mt-4 leading-relaxed">
            All 1,000,000,000 tokens start on the Meteora bonding curve. At graduation (85 SOL raised)
            about 20% of supply seeds a Meteora DAMM v2 pool and 100% of that liquidity is permanently
            locked - 55% held by the sow.fun vault, 45% by the creator - so it can never be pulled and
            keeps paying the same 45/45/10 split at a 1% fee. Launching a coin costs a 0.035 SOL
            launch fee, enforced on-chain, which funds the vault and makes bot squatting expensive.
          </p>
        </div>

        {/* IMPACT MODEL */}
        <div className="bg-white rounded-2xl border border-[#E4EBE7] shadow-[0_4px_15px_rgba(0,0,0,0.05)] transition-shadow duration-300 hover:shadow-[0_10px_28px_rgba(34,56,41,0.10)] p-8">
          <h2 className="text-2xl font-extrabold text-[#223829] mb-2">The Recycling Model</h2>
          <p className="text-gray-400 text-sm mb-6">Unlike charity tokens where funds disappear, $SOW runs a recycling model:</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
            {[
              { icon: "coins", title: "Fees → Treasury", body: "Trading fees accumulate in the public Solana treasury wallet." },
              { icon: "heart", title: "Treasury → Kiva", body: "Funds are deployed as Kiva microloans to vetted entrepreneurs." },
              { icon: "refresh", title: "Repayments → New Loans", body: "When borrowers repay, capital gets reinvested - not withdrawn. One dollar, many lives." },
            ].map(({ icon, title, body }) => (
              <div key={title} className="p-5 bg-[#EDF4F1] rounded-xl">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-white flex items-center justify-center text-[#223829]">
                  <Icon name={icon} className="w-6 h-6" />
                </div>
                <h3 className="text-base font-extrabold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* WAVE POLICY */}
        <div className="bg-white rounded-2xl border border-[#E4EBE7] shadow-[0_4px_15px_rgba(0,0,0,0.05)] transition-shadow duration-300 hover:shadow-[0_10px_28px_rgba(34,56,41,0.10)] p-8">
          <h2 className="text-2xl font-extrabold text-[#223829] mb-2">Excess Fees & Creator Rewards</h2>
          <p className="text-gray-400 text-sm mb-6">
            Launchpad tokens usually raise more than their borrower needs. The excess follows one public rule:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
            {[
              { icon: "heart", title: "80% - The next borrower", body: "The token adopts a new fundraising borrower, picked by its creator. The lives-lifted counter keeps climbing, harvest after harvest." },
              { icon: "refresh", title: "10% - $SOW burned", body: "Half of the $SOW bought back with excess fees is burned - every successful launch makes $SOW scarcer." },
              { icon: "sparkle", title: "10% - Creator rewards", body: "The other half pays the token's creator in $SOW for every borrower their token fully funds. Rewards follow real loans, not volume." },
            ].map(({ icon, title, body }) => (
              <div key={title} className="p-5 bg-[#EDF4F1] rounded-xl">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-white flex items-center justify-center text-[#223829]">
                  <Icon name={icon} className="w-6 h-6" />
                </div>
                <h3 className="text-base font-extrabold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 text-center mt-5 leading-relaxed">
            If a beneficiary&apos;s loan fills or expires before a harvest executes, the full harvest rolls to the adopted next borrower.
            Creator rewards are paid only when loans verifiably fund on Kiva.
          </p>
        </div>

        {/* GENESIS VAULT */}
        <div className="bg-[#FBF6EA]/80 rounded-2xl border border-[#F8CD69]/30 p-8">
          <h2 className="text-2xl font-extrabold text-[#223829] mb-2">$SOW is a launchpad coin too</h2>
          <p className="text-gray-400 text-sm mb-5">
            The genesis coin gets no special treatment - it launched through the same pool config as every other coin.
          </p>
          <p className="text-gray-600 leading-relaxed mb-4">
            That means $SOW&apos;s fees follow the same locked split: 45% to its pledged Kiva borrowers,
            10% to operations - and the 45% creator share, which for $SOW belongs to the project itself,
            accrues to the <span className="font-bold text-[#223829]">Genesis Vault</span>.
          </p>
          <p className="text-gray-600 leading-relaxed mb-4">
            The Genesis Vault is committed back to the garden. Depending on what $SOW needs as it grows,
            deployments can fund bonus borrower loans beyond the pledge, buy back and burn $SOW, or
            reward the community. We keep the mix flexible on purpose - but never quiet: every Genesis
            Vault deployment is published in the ledger with transaction receipts, and the vault&apos;s
            address is public. It is never sold off silently.
          </p>
          <p className="text-xs text-gray-400 leading-relaxed">
            In short: 55% of every $SOW trade is pre-committed (45 loans, 10 ops), and the remaining 45%
            works for the ecosystem in whichever form does the most good at the time - with receipts.
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
