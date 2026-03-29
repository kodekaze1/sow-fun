"use client";
import Link from "next/link";
import { useState } from "react";

const PRIZE_LADDER = [
  { level: "Daily",   prize: "0.5 SOL",   usd: "$75",    tvl: "50k SOL",   icon: "⚡", color: "#3b82f6", unlocked: true },
  { level: "Weekly",  prize: "5 SOL",     usd: "$750",   tvl: "100k SOL",  icon: "🎯", color: "#2CAB6A", unlocked: true },
  { level: "Monthly", prize: "50 SOL",    usd: "$7,500", tvl: "500k SOL",  icon: "🏆", color: "#f59e0b", unlocked: false },
  { level: "Grand",   prize: "The Lambo", usd: "$300k",  tvl: "1M SOL",    icon: "🚗", color: "#ef4444", unlocked: false },
];

const RECENT_WINNERS = [
  { wallet: "8xKj...4mPq", prize: "0.5 SOL", time: "2h ago",  held: "14 days",  tickets: 280 },
  { wallet: "3mRt...9kAb", prize: "0.5 SOL", time: "1d ago",  held: "31 days",  tickets: 620 },
  { wallet: "Qp7v...2nLx", prize: "5 SOL",   time: "3d ago",  held: "62 days",  tickets: 1240 },
  { wallet: "Yw4c...8fDr", prize: "0.5 SOL", time: "4d ago",  held: "7 days",   tickets: 140 },
];

const FAQS = [
  { q: "Can I lose my SOL?", a: "No. Your principal is always yours. You only give up the yield it would have earned — that yield goes into the prize pool instead. Exit any time (Solana unbonding applies, ~2-3 days)." },
  { q: "How are winners chosen?", a: "On-chain using Switchboard VRF — a verifiable random function that no one, including us, can predict or manipulate. Every draw is cryptographically provable and published on-chain." },
  { q: "How does time-weighting work?", a: "Every SOL earns 1 ticket per day held. Deposit 10 SOL, hold 30 days = 300 tickets. Someone who just deposited 10 SOL has 10 tickets. Longer holders are rewarded proportionally — no exit-and-re-enter gaming." },
  { q: "What is winSOL?", a: "winSOL is the LST (liquid staking token) you receive when you deposit. It's pegged 1:1 to SOL and tradeable on Solana DEXes. It proves your share of the vault and your ticket count." },
];

export default function WinSOLPage() {
  const [sol, setSol] = useState("10");
  const [days, setDays] = useState("30");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const tickets = Math.round(parseFloat(sol || "0") * parseFloat(days || "0"));
  const poolTickets = 4_200_000;
  const odds = tickets > 0 ? ((tickets / (poolTickets + tickets)) * 100).toFixed(4) : "0";
  const tvlSol = 87_450;
  const tvlPct = (tvlSol / 100_000) * 100;

  return (
    <div className="min-h-screen" style={{ background: "#0d0d1a" }}>

      {/* NAV */}
      <nav className="border-b border-white/10 sticky top-0 z-[500] backdrop-blur" style={{ background: "rgba(13,13,26,0.95)" }}>
        <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center font-black text-lg"
              style={{ background: "linear-gradient(135deg,#3b82f6,#8b5cf6)" }}>W</div>
            <span className="text-white font-black text-lg tracking-tight">winSOL</span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full border border-blue-500/40 text-blue-400">BETA</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/winsol/dashboard" className="text-sm text-white/50 hover:text-white font-semibold transition-colors">Dashboard</Link>
            <button className="text-sm font-bold px-5 py-2 rounded-full transition-all"
              style={{ background: "linear-gradient(135deg,#3b82f6,#8b5cf6)", color: "white" }}>
              Connect Wallet
            </button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <div className="text-center px-6 pt-24 pb-16 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(59,130,246,0.15) 0%, transparent 70%)" }} />
        <div className="relative max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 border border-white/10 rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-widest mb-6 text-blue-400"
            style={{ background: "rgba(59,130,246,0.1)" }}>
            Prize-Linked SOL Savings · Built on Solana
          </div>
          <h1 className="text-6xl font-black leading-none mb-6 text-white"
            style={{ fontFamily: "'Playfair Display',Georgia,serif" }}>
            Stake SOL.<br />
            <span style={{ background: "linear-gradient(135deg,#3b82f6,#a78bfa,#ec4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Win Big.
            </span><br />
            <span className="text-4xl text-white/60 font-bold">Never lose your principal.</span>
          </h1>
          <p className="text-white/60 text-lg leading-relaxed mb-10 max-w-xl mx-auto">
            Deposit SOL. Earn tickets. Your yield funds the prize pool.
            One lucky staker wins weekly. Your SOL is always safe.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <button className="px-8 py-4 rounded-full text-base font-black text-white transition-all hover:scale-105 hover:shadow-2xl"
              style={{ background: "linear-gradient(135deg,#3b82f6,#8b5cf6)", boxShadow: "0 0 40px rgba(59,130,246,0.3)" }}>
              Deposit SOL →
            </button>
            <Link href="/winsol/dashboard"
              className="px-8 py-4 rounded-full text-base font-bold border border-white/20 text-white hover:bg-white/5 transition-all">
              View Dashboard
            </Link>
          </div>
        </div>
      </div>

      {/* STATS BAR */}
      <div className="border-y border-white/10" style={{ background: "rgba(255,255,255,0.03)" }}>
        <div className="max-w-[1200px] mx-auto px-6 grid grid-cols-4 divide-x divide-white/10">
          {[
            { label: "Total SOL Staked", value: "87,450 SOL", sub: "≈ $13.1M" },
            { label: "Prize Pool (Next Draw)", value: "4.2 SOL", sub: "≈ $630" },
            { label: "All-Time Winners", value: "1,247", sub: "across 89 draws" },
            { label: "All-Time Prizes Paid", value: "820 SOL", sub: "≈ $123,000" },
          ].map(({ label, value, sub }) => (
            <div key={label} className="py-5 px-6 text-center">
              <div className="text-2xl font-black text-white mb-0.5">{value}</div>
              <div className="text-xs text-white/40 mb-0.5">{sub}</div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-white/30">{label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-6 py-16 grid grid-cols-[1fr_380px] gap-8">

        {/* LEFT */}
        <div className="flex flex-col gap-8">

          {/* PRIZE LADDER */}
          <div className="rounded-2xl border border-white/10 overflow-hidden" style={{ background: "rgba(255,255,255,0.03)" }}>
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
              <h2 className="text-white font-extrabold text-lg">🏆 Prize Ladder</h2>
              <span className="text-xs font-bold text-blue-400 border border-blue-500/30 rounded-full px-3 py-1">TVL Unlocks Grand Prize</span>
            </div>
            <div className="p-4 flex flex-col gap-3">
              {PRIZE_LADDER.map((tier) => (
                <div key={tier.level}
                  className="rounded-xl p-4 border flex items-center gap-4 transition-all"
                  style={{
                    background: tier.unlocked ? `${tier.color}10` : "rgba(255,255,255,0.02)",
                    borderColor: tier.unlocked ? `${tier.color}40` : "rgba(255,255,255,0.08)",
                    opacity: tier.unlocked ? 1 : 0.6,
                  }}>
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl flex-shrink-0"
                    style={{ background: `${tier.color}20` }}>{tier.icon}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-white font-extrabold text-base">{tier.prize}</span>
                      <span className="text-white/40 text-sm">({tier.usd})</span>
                      {!tier.unlocked && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-white/20 text-white/40">LOCKED</span>}
                      {tier.unlocked && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white" style={{ background: tier.color }}>LIVE</span>}
                    </div>
                    <div className="text-xs text-white/40">{tier.level} draw · Unlocks at {tier.tvl} TVL</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-xs font-bold" style={{ color: tier.color }}>{tier.level === "Grand" ? "🔒 1M SOL needed" : tier.unlocked ? "✓ Active" : `${tier.tvl} needed`}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* TVL progress toward Monthly */}
            <div className="px-6 pb-5">
              <div className="flex justify-between text-xs text-white/40 mb-2">
                <span>TVL Progress toward Monthly Prize</span>
                <span>{tvlSol.toLocaleString()} / 500,000 SOL ({tvlPct.toFixed(1)}%)</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                <div className="h-full rounded-full transition-all"
                  style={{ width: `${Math.min(tvlPct, 100)}%`, background: "linear-gradient(90deg,#3b82f6,#8b5cf6)" }} />
              </div>
            </div>
          </div>

          {/* HOW TIME-WEIGHTING WORKS */}
          <div className="rounded-2xl border border-white/10 overflow-hidden" style={{ background: "rgba(255,255,255,0.03)" }}>
            <div className="px-6 py-4 border-b border-white/10">
              <h2 className="text-white font-extrabold text-lg">⏱️ Time-Weighted Tickets</h2>
            </div>
            <div className="p-6">
              <p className="text-white/50 text-sm leading-relaxed mb-6">
                The longer you hold, the more tickets you earn. This rewards patient stakers and prevents people from depositing right before a draw and leaving.
              </p>
              <div className="grid grid-cols-3 gap-4 mb-6">
                {[
                  { sol: "10 SOL", days: "1 day",   tickets: "10 tickets",   pct: "0.0002%", highlight: false },
                  { sol: "10 SOL", days: "30 days",  tickets: "300 tickets",  pct: "0.007%",  highlight: true  },
                  { sol: "10 SOL", days: "90 days",  tickets: "900 tickets",  pct: "0.021%",  highlight: false },
                ].map(({ sol, days, tickets, pct, highlight }) => (
                  <div key={days} className="rounded-xl p-4 text-center border"
                    style={{ background: highlight ? "rgba(59,130,246,0.1)" : "rgba(255,255,255,0.03)", borderColor: highlight ? "rgba(59,130,246,0.4)" : "rgba(255,255,255,0.08)" }}>
                    <div className="text-white/50 text-xs mb-2">{sol} × {days}</div>
                    <div className="text-white font-black text-lg mb-1">{tickets}</div>
                    <div className="text-[11px] font-bold" style={{ color: highlight ? "#3b82f6" : "#ffffff40" }}>~{pct} win chance</div>
                  </div>
                ))}
              </div>
              <div className="rounded-xl p-4 border border-white/10 text-sm text-white/40 leading-relaxed">
                <span className="text-white font-bold">Formula:</span> Tickets = SOL deposited × days held continuously. Tickets reset to 0 if you withdraw (re-deposit restarts the clock).
              </div>
            </div>
          </div>

          {/* RECENT WINNERS */}
          <div className="rounded-2xl border border-white/10 overflow-hidden" style={{ background: "rgba(255,255,255,0.03)" }}>
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
              <h2 className="text-white font-extrabold text-lg">🎉 Recent Winners</h2>
              <Link href="/winsol/dashboard" className="text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors">View all →</Link>
            </div>
            <div>
              {RECENT_WINNERS.map((w, i) => (
                <div key={i} className="px-6 py-4 border-b border-white/5 last:border-0 flex items-center gap-4 hover:bg-white/5 transition-colors">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center font-black text-sm flex-shrink-0"
                    style={{ background: "linear-gradient(135deg,#3b82f6,#8b5cf6)" }}>🎲</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-bold text-sm">{w.wallet}</div>
                    <div className="text-white/40 text-xs">{w.held} held · {w.tickets.toLocaleString()} tickets · {w.time}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-extrabold text-sm" style={{ color: "#3b82f6" }}>+{w.prize}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT — DEPOSIT + CALCULATOR */}
        <div className="flex flex-col gap-6">

          {/* DEPOSIT CARD */}
          <div className="rounded-2xl border border-white/10 overflow-hidden sticky top-20" style={{ background: "rgba(255,255,255,0.04)" }}>
            <div className="px-6 py-4 border-b border-white/10">
              <h2 className="text-white font-extrabold text-lg">Deposit SOL</h2>
              <p className="text-white/40 text-xs mt-0.5">Your principal is always safe. Only your yield enters the pool.</p>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <div>
                <label className="text-xs font-bold text-white/40 uppercase tracking-wider block mb-2">Amount</label>
                <div className="flex items-center border border-white/10 rounded-xl overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                  <input
                    type="number"
                    value={sol}
                    onChange={e => setSol(e.target.value)}
                    className="flex-1 bg-transparent text-white font-black text-2xl px-4 py-3 outline-none"
                    placeholder="0"
                  />
                  <span className="px-4 text-white/40 font-bold text-sm">SOL</span>
                </div>
                <div className="flex gap-2 mt-2">
                  {["1", "5", "10", "50"].map(v => (
                    <button key={v} onClick={() => setSol(v)}
                      className="flex-1 text-xs font-bold py-1.5 rounded-lg border border-white/10 text-white/50 hover:text-white hover:border-blue-500/50 transition-all">
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              {/* TICKET ESTIMATE */}
              <div className="rounded-xl p-4 border border-blue-500/20" style={{ background: "rgba(59,130,246,0.08)" }}>
                <div className="text-xs text-blue-400 font-bold uppercase tracking-wider mb-3">Estimated After 30 Days</div>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-white/50">Tickets earned</span>
                  <span className="text-white font-bold">{(parseFloat(sol || "0") * 30).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-white/50">Win chance (weekly)</span>
                  <span className="font-bold" style={{ color: "#3b82f6" }}>~{((parseFloat(sol || "0") * 30) / (poolTickets + parseFloat(sol || "0") * 30) * 100).toFixed(4)}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">winSOL received</span>
                  <span className="text-white font-bold">{parseFloat(sol || "0").toFixed(2)} winSOL</span>
                </div>
              </div>

              <button className="w-full py-4 rounded-xl font-black text-white text-base transition-all hover:scale-105 hover:shadow-2xl"
                style={{ background: "linear-gradient(135deg,#3b82f6,#8b5cf6)", boxShadow: "0 0 30px rgba(59,130,246,0.2)" }}>
                Connect Wallet to Deposit
              </button>

              <p className="text-center text-xs text-white/25">Withdraw anytime · ~2-3 day unbonding · Non-custodial</p>
            </div>

            {/* ODDS CALCULATOR */}
            <div className="px-6 pb-6">
              <div className="border-t border-white/10 pt-5">
                <div className="text-xs font-bold text-white/40 uppercase tracking-wider mb-3">Odds Calculator</div>
                <div className="flex gap-3 mb-3">
                  <div className="flex-1">
                    <div className="text-[10px] text-white/30 mb-1">SOL amount</div>
                    <input type="number" value={sol} onChange={e => setSol(e.target.value)}
                      className="w-full bg-transparent border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none" />
                  </div>
                  <div className="flex-1">
                    <div className="text-[10px] text-white/30 mb-1">Days held</div>
                    <input type="number" value={days} onChange={e => setDays(e.target.value)}
                      className="w-full bg-transparent border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none" />
                  </div>
                </div>
                <div className="rounded-lg p-3 border border-white/10 text-sm" style={{ background: "rgba(255,255,255,0.03)" }}>
                  <div className="flex justify-between mb-1">
                    <span className="text-white/40">Your tickets</span>
                    <span className="text-white font-bold">{tickets.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/40">Weekly win chance</span>
                    <span className="font-bold" style={{ color: parseFloat(odds) > 0.01 ? "#3b82f6" : "#ffffff60" }}>~{odds}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div className="max-w-[800px] mx-auto px-6 pb-20">
        <h2 className="text-white text-3xl font-extrabold text-center mb-8"
          style={{ fontFamily: "'Playfair Display',Georgia,serif" }}>Common Questions</h2>
        <div className="flex flex-col gap-2">
          {FAQS.map((f, i) => (
            <div key={i} className="rounded-xl border border-white/10 overflow-hidden transition-all"
              style={{ background: openFaq === i ? "rgba(59,130,246,0.06)" : "rgba(255,255,255,0.03)" }}>
              <button className="w-full text-left px-6 py-4 flex items-center justify-between gap-4"
                onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                <span className="text-white font-bold text-sm">{f.q}</span>
                <span className="text-white/40 text-xl flex-shrink-0">{openFaq === i ? "−" : "+"}</span>
              </button>
              {openFaq === i && (
                <div className="px-6 pb-5 text-sm text-white/50 leading-relaxed border-t border-white/10 pt-3">{f.a}</div>
              )}
            </div>
          ))}
        </div>
      </div>

      <footer className="border-t border-white/10 text-center py-8 px-6 text-sm" style={{ background: "rgba(255,255,255,0.02)" }}>
        <div className="flex justify-center gap-8 mb-3 flex-wrap">
          <Link href="/winsol/dashboard" className="text-blue-400 font-semibold hover:text-blue-300 transition-colors">Dashboard</Link>
          <a href="https://sanctum.so" target="_blank" rel="noopener noreferrer" className="text-blue-400 font-semibold hover:text-blue-300 transition-colors">Sanctum</a>
          <a href="https://switchboard.xyz" target="_blank" rel="noopener noreferrer" className="text-blue-400 font-semibold hover:text-blue-300 transition-colors">Switchboard VRF</a>
        </div>
        <div className="text-white/20 text-xs">winSOL · Prize-Linked SOL Savings · Built on Solana · Principal always safe</div>
      </footer>
    </div>
  );
}
