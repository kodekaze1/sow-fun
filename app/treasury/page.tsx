"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { MOCK_BATCHES } from "@/lib/types";

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
            <Link href="/how-it-works" className="text-sm text-gray-500 hover:text-[#1a6e43] font-semibold transition-colors">How It Works</Link>
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
            On-Chain · Public · Verifiable
          </div>
          <h1 className="text-5xl font-extrabold mb-4"
            style={{ fontFamily: "'Playfair Display',Georgia,serif" }}>
            Impact Treasury
          </h1>
          <p className="text-lg opacity-80 leading-relaxed">
            Every SOL in this wallet came from $UPLIFT trading fees. Every spend funds a real microloan.
          </p>
        </div>
      </div>

      <div className="max-w-[900px] mx-auto px-6 py-16 flex flex-col gap-8">

        {/* LIVE BALANCE */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-extrabold text-[#1a6e43]">Live Balance</h2>
            <div className="flex items-center gap-2 bg-[#e8f7f0] border border-[#a8dfc0] rounded-full px-4 py-1.5 text-xs font-semibold text-[#1a6e43]">
              <div className="w-2 h-2 bg-[#2CAB6A] rounded-full animate-pulse" />
              Live · Solana Mainnet
            </div>
          </div>

          {treasury ? (
            <>
              <div className="flex flex-wrap gap-8 mb-6">
                <div>
                  <div className="text-5xl font-black text-[#1a6e43]">{treasury.balance.toFixed(2)} SOL</div>
                  <div className="text-gray-400 text-sm mt-1">≈ ${treasury.usd.toLocaleString()} USD</div>
                </div>
                <div className="flex flex-col justify-center">
                  <div className="text-sm text-gray-500 mb-1">Next batch goal: <span className="font-bold text-gray-800">{goal} SOL</span></div>
                  <div className="w-64 h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-[#2CAB6A] to-[#48c98a] transition-all"
                      style={{ width: `${pct}%` }} />
                  </div>
                  <div className="text-xs text-gray-400 mt-1">{pct}% funded toward next batch</div>
                </div>
              </div>
              <div className="bg-[#f4f9f6] rounded-xl p-4 font-mono text-sm">
                <span className="text-gray-400 text-xs uppercase tracking-wider block mb-1">Wallet Address</span>
                <span className="text-[#1a6e43] font-bold break-all">{treasury.wallet}</span>
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

        {/* STATS ROW — shows real zeros until Wave #001 is funded */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { icon: "💰", value: "$0", label: "Total Deployed" },
            { icon: "🤝", value: "0", label: "Loans Funded" },
            { icon: "♻️", value: "$0", label: "Capital Recycled" },
            { icon: "✅", value: "—", label: "Repayment Rate" },
          ].map(({ icon, value, label }) => (
            <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow p-5 text-center hover:bg-[#fdf6ee] transition-colors">
              <div className="text-3xl mb-2">{icon}</div>
              <div className="text-2xl font-black text-[#1a6e43] leading-none mb-1">{value}</div>
              <div className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider">{label}</div>
            </div>
          ))}
        </div>
        <div className="text-center text-xs text-gray-400 -mt-2">
          Stats update automatically when Wave #001 is executed and verified.
        </div>

        {/* BATCH LEDGER */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-[#fdf6ee] to-white">
            <h2 className="text-lg font-extrabold">📋 Uplift Ledger</h2>
            <span className="text-xs font-bold bg-[#e8f7f0] text-[#1a6e43] px-3 py-1 rounded-full">{MOCK_BATCHES.length} waves</span>
          </div>
          {MOCK_BATCHES.map((batch) => (
            <div key={batch.id} className="px-6 py-5 border-b border-gray-50 last:border-0 hover:bg-[#fdf6ee] transition-colors">
              <div className="flex justify-between items-center mb-1">
                <span className="font-extrabold text-gray-900">Wave #{batch.id} — {batch.date}</span>
                <span className="font-extrabold text-[#2CAB6A]">${batch.amount} deployed</span>
              </div>
              <div className="text-xs text-gray-400 mb-2">
                {batch.loans} lives touched · ${batch.rate.toFixed(2)}/SOL rate
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">TX:</span>
                <a
                  href={`https://explorer.solana.com/tx/${batch.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded hover:bg-blue-100 transition-colors"
                >
                  {batch.txHash}
                </a>
                <span className="text-xs text-gray-300">↗</span>
              </div>
            </div>
          ))}
        </div>

        {/* HOW FUNDS FLOW */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow p-8">
          <h2 className="text-xl font-extrabold text-[#1a6e43] mb-4">How Funds Flow</h2>
          <div className="flex flex-col sm:flex-row items-center gap-4 text-center">
            {[
              { icon: "💱", label: "$UPLIFT Trade" },
              { icon: "→", label: "", plain: true },
              { icon: "🏦", label: "Impact Treasury" },
              { icon: "→", label: "", plain: true },
              { icon: "🌍", label: "Kiva Microloan" },
              { icon: "→", label: "", plain: true },
              { icon: "♻️", label: "Recycled / New Loan" },
            ].map(({ icon, label, plain }, i) => (
              plain ? (
                <div key={i} className="text-2xl text-gray-300 hidden sm:block">{icon}</div>
              ) : (
                <div key={i} className="flex-1 p-4 bg-[#f4f9f6] rounded-xl">
                  <div className="text-3xl mb-2">{icon}</div>
                  <div className="text-sm font-bold text-gray-700">{label}</div>
                </div>
              )
            ))}
          </div>
          <p className="text-sm text-gray-400 text-center mt-4 leading-relaxed">
            95% of project-controlled fees and treasury inflows are allocated to Kiva funding.
            5% supports operations, reporting, and infrastructure.
            Repayments are reinvested — not withdrawn.
          </p>
        </div>

        <div className="text-center">
          <Link href="/" className="inline-flex items-center gap-2 bg-[#2CAB6A] hover:bg-[#1a6e43] text-white rounded-full px-8 py-3.5 text-sm font-bold transition-all shadow-lg">
            ← Back to Dashboard
          </Link>
        </div>
      </div>

      <footer className="bg-[#0a2e1b] text-white/50 text-center py-8 px-6 text-sm">
        <div className="flex justify-center gap-8 mb-3 flex-wrap">
          <Link href="/tokenomics" className="text-emerald-300 font-semibold hover:text-emerald-200 transition-colors">$UPLIFT Token</Link>
          <a href="https://www.kiva.org/team/upliftify" target="_blank" rel="noopener noreferrer" className="text-emerald-300 font-semibold hover:text-emerald-200 transition-colors">Upliftify Kiva Team</a>

          <Link href="/how-it-works" className="text-emerald-300 font-semibold hover:text-emerald-200 transition-colors">How It Works</Link>
        </div>
        <div className="font-mono text-xs opacity-70">upliftify.fun · Treasury: FN7m...keAz · Built on Solana · Powered by Kiva API</div>
      </footer>
    </div>
  );
}
