"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { MOCK_BATCHES, MOCK_STATS } from "@/lib/types";
import Icon from "@/components/icons";

interface TreasuryData {
  balance: number;
  usd: number;
  wallet: string;
}

export default function TreasuryPage() {
  const [treasury, setTreasury] = useState<TreasuryData | null>(null);

  useEffect(() => {
    fetch("/api/treasury")
      .then((r) => r.json())
      .then(setTreasury)
      .catch(() => setTreasury({ balance: 0, usd: 0, wallet: "FN7mbeChbKQoVM3Wvctw7aLgVW3eSM1ZAo74b4NgkeAz" }));
  }, []);

  const goal = 10;
  const pct = treasury ? Math.min(100, Math.round((treasury.balance / goal) * 100)) : 0;

  return (
    <div className="min-h-screen bg-white">

      {/* HERO */}
      <div className="relative overflow-hidden bg-[#223829] text-white py-20 px-6 text-center">
        <img src="/images/fruit-man.jpg" alt="" aria-hidden="true" className="absolute inset-0 w-full h-full object-cover opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#16261c]/85 to-[#16261c]/55" />
        <div className="relative max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-widest mb-6">
            On-Chain · Public · Verifiable
          </div>
          <h1 className="text-5xl font-extrabold mb-4"
            style={{ fontFamily: "var(--font-serif)" }}>
            Impact Treasury
          </h1>
          <p className="text-lg opacity-80 leading-relaxed">
            Every SOL in this wallet came from $UPLIFT trading fees. Every spend funds a real microloan.
          </p>
        </div>
      </div>

      <div className="max-w-[900px] mx-auto px-6 py-16 flex flex-col gap-8">

        {/* LIVE BALANCE */}
        <div className="bg-white rounded-2xl border border-[#E4EBE7] shadow-[0_4px_15px_rgba(0,0,0,0.05)] transition-shadow duration-300 hover:shadow-[0_10px_28px_rgba(34,56,41,0.10)] p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-extrabold text-[#223829]">Live Balance</h2>
            <div className="flex items-center gap-2 bg-[#EDF4F1] border border-[#D9E6DF] rounded-full px-4 py-1.5 text-xs font-semibold text-[#223829]">
              <div className="w-2 h-2 bg-[#276A43] rounded-full animate-pulse" />
              Live · Solana Mainnet
            </div>
          </div>

          {treasury ? (
            <>
              <div className="flex flex-wrap gap-8 mb-6">
                <div>
                  <div className="text-5xl font-black text-[#223829]">{treasury.balance.toFixed(2)} SOL</div>
                  <div className="text-gray-400 text-sm mt-1">≈ ${treasury.usd.toLocaleString()} USD</div>
                </div>
                <div className="flex flex-col justify-center">
                  <div className="text-sm text-gray-500 mb-1">Next batch goal: <span className="font-bold text-gray-800">{goal} SOL</span></div>
                  <div className="w-64 h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-[#276A43] to-[#2AA967] transition-all"
                      style={{ width: `${pct}%` }} />
                  </div>
                  <div className="text-xs text-gray-400 mt-1">{pct}% funded toward next batch</div>
                </div>
              </div>
              <div className="bg-[#EDF4F1] rounded-xl p-4 font-mono text-sm">
                <span className="text-gray-400 text-xs uppercase tracking-wider block mb-1">Wallet Address</span>
                <span className="text-[#223829] font-bold break-all">{treasury.wallet}</span>
                <a
                  href={`https://explorer.solana.com/address/${treasury.wallet}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-3 text-xs font-bold text-blue-500 hover:text-blue-700 transition-colors"
                >
                  View on Solana Explorer →
                </a>
              </div>
            </>
          ) : (
            <div className="h-32 flex items-center justify-center text-gray-400 text-sm">Loading balance...</div>
          )}
        </div>

        {/* STATS ROW - real-time genesis data */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { icon: "coins", value: `$${MOCK_STATS.feesCollected}`, label: "Total Deployed" },
            { icon: "heart", value: String(MOCK_STATS.loansFunded), label: "Loans Funded" },
            { icon: "refresh", value: `$${MOCK_STATS.recycledCapital}`, label: "Capital Recycled" },
            { icon: "check", value: MOCK_STATS.repaymentRate === 0 ? "-" : `${MOCK_STATS.repaymentRate}%`, label: "Repayment Rate" },
          ].map(({ icon, value, label }) => (
            <div key={label} className="bg-white rounded-2xl border border-[#E4EBE7] shadow-[0_4px_15px_rgba(0,0,0,0.05)] transition-shadow duration-300 hover:shadow-[0_10px_28px_rgba(34,56,41,0.10)] p-5 text-center hover:bg-[#F8F2E6] transition-colors">
              <div className="w-10 h-10 mx-auto mb-2.5 rounded-full bg-[#EDF4F1] flex items-center justify-center text-[#276A43]">
                <Icon name={icon} className="w-5 h-5" />
              </div>
              <div className="text-2xl font-black text-[#223829] leading-none mb-1">{value}</div>
              <div className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider">{label}</div>
            </div>
          ))}
        </div>

        <div className="text-center text-xs text-gray-400 -mt-2">
          Stats update automatically when Wave #001 is executed and verified.
        </div>

        {/* BATCH LEDGER */}
        <div className="bg-white rounded-2xl border border-[#E4EBE7] shadow-[0_4px_15px_rgba(0,0,0,0.05)] transition-shadow duration-300 hover:shadow-[0_10px_28px_rgba(34,56,41,0.10)] overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-[#EDF4F1] to-white">
            <h2 className="flex items-center gap-2.5 text-lg font-extrabold"><span className="w-8 h-8 rounded-lg bg-white border border-[#D9E6DF] flex items-center justify-center text-[#276A43]"><Icon name="ledger" className="w-5 h-5" /></span>Uplift Ledger</h2>
            <span className="text-xs font-bold bg-[#EDF4F1] text-[#223829] px-3 py-1 rounded-full">{MOCK_BATCHES.length} waves</span>
          </div>
          {MOCK_BATCHES.map((batch) => (
            <div key={batch.id} className="px-6 py-5 border-b border-gray-50 last:border-0 hover:bg-[#F8F2E6] transition-colors">
              <div className="flex justify-between items-center mb-1">
                <span className="font-extrabold text-gray-900">Wave #{batch.id} - {batch.date}</span>
                <span className="font-extrabold text-[#276A43]">${batch.amount} deployed</span>
              </div>
              <div className="text-xs text-gray-400 mb-2">
                {batch.loans} lives touched · ${batch.rate.toFixed(2)}/SOL rate
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">Proof:</span>
                <a
                  href={batch.txHash.includes("kiva.org") ? batch.txHash : `https://explorer.solana.com/tx/${batch.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-xs bg-[#EDF4F1] text-[#276A43] px-2 py-0.5 rounded hover:bg-[#D9E6DF] transition-colors"
                >
                  {batch.txHash.includes("kiva.org") ? "Kiva Receipt" : `${batch.txHash.slice(0, 8)}...`}
                </a>
                <span className="text-xs text-gray-300">↗</span>
              </div>
            </div>
          ))}
        </div>

        {/* HOW FUNDS FLOW */}
        <div className="bg-white rounded-2xl border border-[#E4EBE7] shadow-[0_4px_15px_rgba(0,0,0,0.05)] transition-shadow duration-300 hover:shadow-[0_10px_28px_rgba(34,56,41,0.10)] p-8">
          <h2 className="text-xl font-extrabold text-[#223829] mb-4">How Funds Flow</h2>
          <div className="flex flex-col sm:flex-row items-center gap-4 text-center">
            {[
              { icon: "coins", label: "$UPLIFT Trade" },
              { icon: "arrow", label: "", plain: true },
              { icon: "vault", label: "Impact Treasury" },
              { icon: "arrow", label: "", plain: true },
              { icon: "globe", label: "Kiva Microloan" },
              { icon: "arrow", label: "", plain: true },
              { icon: "refresh", label: "Recycled / New Loan" },
            ].map(({ icon, label, plain }, i) => (
              plain ? (
                <div key={i} className="text-gray-300 hidden sm:block"><Icon name="arrow" className="w-5 h-5" /></div>
              ) : (
                <div key={i} className="flex-1 p-4 bg-[#EDF4F1] rounded-xl">
                  <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-white flex items-center justify-center text-[#276A43]">
                    <Icon name={icon} className="w-5 h-5" />
                  </div>
                  <div className="text-sm font-bold text-gray-700">{label}</div>
                </div>
              )
            ))}
          </div>
          <p className="text-sm text-gray-400 text-center mt-4 leading-relaxed">
            95% of project-controlled fees and treasury inflows are allocated to Kiva funding.
            5% supports operations, reporting, and infrastructure.
            Repayments are reinvested - not withdrawn.
          </p>
        </div>

        <div className="text-center">
          <Link href="/" className="inline-flex items-center gap-2 bg-[#276A43] hover:bg-[#223829] text-white rounded-full px-8 py-3.5 text-sm font-bold transition-all shadow-lg">
            ← Back to Dashboard
          </Link>
        </div>
      </div>

    </div>
  );
}
