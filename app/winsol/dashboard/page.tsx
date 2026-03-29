"use client";
import Link from "next/link";
import { useState, useEffect } from "react";

const DRAW_HISTORY = [
  { draw: "#089", type: "Weekly",  prize: "5 SOL",   winner: "8xKj...4mPq", date: "Mar 24", tickets: 1240, poolSize: "3.8M", txHash: "3xAb...9kRt" },
  { draw: "#088", type: "Daily",   prize: "0.5 SOL",  winner: "Qp7v...2nLx", date: "Mar 23", tickets: 620,  poolSize: "3.7M", txHash: "7mCd...2pQs" },
  { draw: "#087", type: "Daily",   prize: "0.5 SOL",  winner: "Yw4c...8fDr", date: "Mar 22", tickets: 140,  poolSize: "3.6M", txHash: "9nEf...4rUv" },
  { draw: "#086", type: "Daily",   prize: "0.5 SOL",  winner: "3mRt...9kAb", date: "Mar 21", tickets: 280,  poolSize: "3.5M", txHash: "1kGh...6sMw" },
  { draw: "#085", type: "Weekly",  prize: "5 SOL",   winner: "Lp2q...7yBn", date: "Mar 17", tickets: 980,  poolSize: "3.4M", txHash: "5jIl...8tOx" },
];

function Countdown({ targetHours }: { targetHours: number }) {
  const [secs, setSecs] = useState(targetHours * 3600);
  useEffect(() => {
    const t = setInterval(() => setSecs(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, []);
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return (
    <div className="flex items-center gap-2">
      {[{ v: h, label: "HRS" }, { v: m, label: "MIN" }, { v: s, label: "SEC" }].map(({ v, label }) => (
        <div key={label} className="text-center">
          <div className="text-3xl font-black text-white w-14 h-14 flex items-center justify-center rounded-xl border border-white/10"
            style={{ background: "rgba(59,130,246,0.1)", fontVariantNumeric: "tabular-nums" }}>
            {String(v).padStart(2, "0")}
          </div>
          <div className="text-[9px] text-white/30 font-bold uppercase tracking-widest mt-1">{label}</div>
        </div>
      ))}
    </div>
  );
}

export default function WinSOLDashboard() {
  const tvl = 87_450;
  const prizePool = 4.21;
  const totalDepositors = 2_847;
  const totalTickets = 4_200_000;

  return (
    <div className="min-h-screen" style={{ background: "#0d0d1a" }}>

      {/* NAV */}
      <nav className="border-b border-white/10 sticky top-0 z-[500] backdrop-blur" style={{ background: "rgba(13,13,26,0.95)" }}>
        <div className="max-w-[1300px] mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/winsol" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center font-black text-lg"
              style={{ background: "linear-gradient(135deg,#3b82f6,#8b5cf6)" }}>W</div>
            <span className="text-white font-black text-lg tracking-tight">winSOL</span>
            <span className="text-white/40 text-sm font-semibold">/ Dashboard</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/winsol" className="text-sm text-white/50 hover:text-white font-semibold transition-colors">← Home</Link>
            <button className="text-sm font-bold px-5 py-2 rounded-full transition-all"
              style={{ background: "linear-gradient(135deg,#3b82f6,#8b5cf6)", color: "white" }}>
              Connect Wallet
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-[1300px] mx-auto px-6 py-8">

        {/* TOP STATS */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { icon: "🏦", label: "Total SOL Staked", value: `${tvl.toLocaleString()} SOL`, sub: "≈ $13.1M", color: "#3b82f6" },
            { icon: "🎰", label: "Current Prize Pool", value: `${prizePool} SOL`, sub: "≈ $631 · Next weekly draw", color: "#8b5cf6" },
            { icon: "👥", label: "Active Depositors", value: totalDepositors.toLocaleString(), sub: "+47 this week", color: "#2CAB6A" },
            { icon: "🎟️", label: "Total Tickets Live", value: `${(totalTickets / 1_000_000).toFixed(1)}M`, sub: "time-weighted", color: "#f59e0b" },
          ].map(({ icon, label, value, sub, color }) => (
            <div key={label} className="rounded-2xl p-5 border border-white/10 hover:border-white/20 transition-all"
              style={{ background: "rgba(255,255,255,0.03)" }}>
              <div className="text-2xl mb-3">{icon}</div>
              <div className="text-2xl font-black text-white mb-0.5">{value}</div>
              <div className="text-xs mb-1" style={{ color }}>{sub}</div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-white/30">{label}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-[1fr_340px] gap-6">

          {/* LEFT */}
          <div className="flex flex-col gap-6">

            {/* NEXT DRAWS COUNTDOWN */}
            <div className="rounded-2xl border border-white/10 overflow-hidden" style={{ background: "rgba(255,255,255,0.03)" }}>
              <div className="px-6 py-4 border-b border-white/10">
                <h2 className="text-white font-extrabold text-lg">⏰ Next Draws</h2>
              </div>
              <div className="p-6 grid grid-cols-2 gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-xs font-black px-2.5 py-1 rounded-full text-white" style={{ background: "#3b82f6" }}>DAILY</span>
                    <span className="text-white font-bold">0.5 SOL</span>
                    <span className="text-white/30 text-sm">≈ $75</span>
                  </div>
                  <Countdown targetHours={6} />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-xs font-black px-2.5 py-1 rounded-full text-white" style={{ background: "#8b5cf6" }}>WEEKLY</span>
                    <span className="text-white font-bold">5 SOL</span>
                    <span className="text-white/30 text-sm">≈ $750</span>
                  </div>
                  <Countdown targetHours={54} />
                </div>
              </div>
              <div className="px-6 pb-5 text-xs text-white/30 text-center">
                All draws use Switchboard VRF on-chain — provably fair, verifiable by anyone
              </div>
            </div>

            {/* POOL GROWTH CHART (static bars) */}
            <div className="rounded-2xl border border-white/10 overflow-hidden" style={{ background: "rgba(255,255,255,0.03)" }}>
              <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
                <h2 className="text-white font-extrabold text-lg">📈 TVL Growth</h2>
                <span className="text-xs text-white/40 border border-white/10 rounded-full px-3 py-1">Last 7 days</span>
              </div>
              <div className="p-6">
                <div className="flex items-end gap-3 h-32">
                  {[62, 68, 71, 74, 79, 83, 87].map((v, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div className="text-[9px] text-white/30">{v}k</div>
                      <div className="w-full rounded-t-md transition-all"
                        style={{ height: `${(v / 90) * 100}%`, background: i === 6 ? "linear-gradient(180deg,#3b82f6,#8b5cf6)" : "rgba(59,130,246,0.3)" }} />
                    </div>
                  ))}
                </div>
                <div className="flex justify-between text-[9px] text-white/20 mt-2">
                  {["Mar 21", "Mar 22", "Mar 23", "Mar 24", "Mar 25", "Mar 26", "Mar 27"].map(d => (
                    <span key={d}>{d}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* DRAW HISTORY */}
            <div className="rounded-2xl border border-white/10 overflow-hidden" style={{ background: "rgba(255,255,255,0.03)" }}>
              <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
                <h2 className="text-white font-extrabold text-lg">🎲 Draw History</h2>
                <span className="text-xs font-bold text-blue-400">89 total draws</span>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5">
                    {["Draw", "Type", "Prize", "Winner", "Tickets", "Pool Size", "TX"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-white/30">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {DRAW_HISTORY.map((d) => (
                    <tr key={d.draw} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3 text-white font-bold">{d.draw}</td>
                      <td className="px-4 py-3">
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                          style={{ background: d.type === "Weekly" ? "rgba(139,92,246,0.2)" : "rgba(59,130,246,0.2)", color: d.type === "Weekly" ? "#a78bfa" : "#60a5fa" }}>
                          {d.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-white font-extrabold">{d.prize}</td>
                      <td className="px-4 py-3 font-mono text-white/60 text-xs">{d.winner}</td>
                      <td className="px-4 py-3 text-white/50 text-xs">{d.tickets.toLocaleString()}</td>
                      <td className="px-4 py-3 text-white/50 text-xs">{d.poolSize}</td>
                      <td className="px-4 py-3">
                        <a href={`https://explorer.solana.com/tx/${d.txHash}`} target="_blank" rel="noopener noreferrer"
                          className="font-mono text-xs text-blue-400 hover:text-blue-300 transition-colors">{d.txHash}</a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* RIGHT — YOUR POSITION (empty state) */}
          <div className="flex flex-col gap-5">
            <div className="rounded-2xl border border-white/10 overflow-hidden" style={{ background: "rgba(255,255,255,0.03)" }}>
              <div className="px-6 py-4 border-b border-white/10">
                <h2 className="text-white font-extrabold">Your Position</h2>
              </div>
              <div className="p-6 text-center">
                <div className="text-5xl mb-4">🔌</div>
                <p className="text-white/40 text-sm mb-5 leading-relaxed">Connect your wallet to see your deposited SOL, tickets, win probability, and position history.</p>
                <button className="w-full py-3 rounded-xl font-bold text-white text-sm transition-all hover:opacity-90"
                  style={{ background: "linear-gradient(135deg,#3b82f6,#8b5cf6)" }}>
                  Connect Wallet
                </button>
              </div>
            </div>

            {/* PRIZE POOL BREAKDOWN */}
            <div className="rounded-2xl border border-white/10 overflow-hidden" style={{ background: "rgba(255,255,255,0.03)" }}>
              <div className="px-6 py-4 border-b border-white/10">
                <h2 className="text-white font-extrabold">Prize Pool Math</h2>
              </div>
              <div className="p-5 flex flex-col gap-3 text-sm">
                {[
                  { label: "TVL staked", value: "87,450 SOL", color: "#fff" },
                  { label: "Avg APY (Solana)", value: "7.5%", color: "#3b82f6" },
                  { label: "Annual yield", value: "6,559 SOL / yr", color: "#3b82f6" },
                  { label: "Weekly yield", value: "≈ 126 SOL / week", color: "#8b5cf6" },
                  { label: "→ Daily prize (0.5 SOL)", value: "−3.5 SOL / wk", color: "#f59e0b" },
                  { label: "→ Weekly prize (5 SOL)", value: "−5 SOL / wk", color: "#f59e0b" },
                  { label: "Accumulated reserve", value: "117.5 SOL / wk", color: "#2CAB6A" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex justify-between items-center">
                    <span className="text-white/40">{label}</span>
                    <span className="font-bold" style={{ color }}>{value}</span>
                  </div>
                ))}
                <div className="border-t border-white/10 pt-3 mt-1">
                  <div className="flex justify-between items-center">
                    <span className="text-white font-bold text-xs uppercase tracking-wider">Monthly prize fund</span>
                    <span className="font-black text-white">~510 SOL</span>
                  </div>
                </div>
              </div>
            </div>

            {/* MILESTONE TRACKER */}
            <div className="rounded-2xl border border-white/10 overflow-hidden" style={{ background: "rgba(255,255,255,0.03)" }}>
              <div className="px-6 py-4 border-b border-white/10">
                <h2 className="text-white font-extrabold">🚗 Lambo Milestone</h2>
              </div>
              <div className="p-5">
                <div className="text-center mb-4">
                  <div className="text-5xl mb-2">🚗</div>
                  <div className="text-white font-black text-xl">The Lambo Draw</div>
                  <div className="text-white/40 text-xs mt-1">Unlocks when TVL reaches 1,000,000 SOL</div>
                </div>
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-white/40 mb-2">
                    <span>{tvl.toLocaleString()} SOL staked</span>
                    <span>1,000,000 SOL goal</span>
                  </div>
                  <div className="h-3 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                    <div className="h-full rounded-full"
                      style={{ width: `${(tvl / 1_000_000) * 100}%`, background: "linear-gradient(90deg,#ef4444,#f59e0b)" }} />
                  </div>
                  <div className="text-center text-xs text-white/30 mt-2">{((tvl / 1_000_000) * 100).toFixed(2)}% of the way there</div>
                </div>
                <p className="text-xs text-white/30 text-center leading-relaxed">
                  Help grow the pool. Every new depositor gets us closer. Share → grow TVL → unlock the Lambo.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <footer className="border-t border-white/10 text-center py-8 px-6 text-sm mt-8" style={{ background: "rgba(255,255,255,0.02)" }}>
        <div className="text-white/20 text-xs">winSOL · Prize-Linked SOL Savings · Built on Solana · Principal always safe · Draws powered by Switchboard VRF</div>
      </footer>
    </div>
  );
}
