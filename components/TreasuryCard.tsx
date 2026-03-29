"use client";
import { useState, useEffect } from "react";
import type { TreasuryData } from "@/lib/types";

export default function TreasuryCard() {
  const [data, setData] = useState<TreasuryData | null>(null);

  useEffect(() => {
    fetch("/api/treasury")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, []);

  const sol = data?.sol ?? "—";
  const usd = data?.usd ?? "—";
  const wallet = data?.wallet ?? "loading…";
  const short = wallet.length > 12 ? wallet.slice(0, 4) + "…" + wallet.slice(-4) : wallet;

  return (
    <div className="p-5">
      {/* Balance hero */}
      <div className="bg-gradient-to-br from-[#1a6e43] to-[#2CAB6A] rounded-2xl p-4 text-center mb-4 relative overflow-hidden">
        <div className="absolute text-[5rem] right-[-10px] bottom-[-12px] opacity-10 select-none">🌍</div>
        <div className="text-3xl font-black text-white leading-none">{sol} SOL</div>
        <div className="text-sm text-white/70 mt-1">≈ ${usd} USD · on-chain balance</div>
      </div>

      {/* Rows */}
      {[
        { label: "📍 Wallet", value: <span className="font-mono text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded cursor-pointer hover:bg-blue-100">{short}</span> },
        { label: "📤 Last withdrawal", value: <span className="font-mono text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded cursor-pointer hover:bg-blue-100">3xAb…9kRt</span> },
        { label: "🏦 Kiva balance", value: <span className="font-bold text-[#2CAB6A]">$180 pending</span> },
        { label: "💰 Total deployed", value: <span className="font-bold">$12,840</span> },
        { label: "♻️ Recycled capital", value: <span className="font-bold text-amber-500">$4,200</span> },
      ].map(({ label, value }) => (
        <div key={label} className="flex justify-between items-center py-2.5 border-b border-gray-50 last:border-0 text-sm">
          <span className="text-gray-500 font-medium">{label}</span>
          <span>{value}</span>
        </div>
      ))}

      {/* Progress */}
      <div className="mt-4">
        <div className="flex justify-between text-xs text-gray-500 font-semibold mb-1.5">
          <span>Next batch progress</span>
          <span className="text-[#2CAB6A] font-bold">$340 / $500</span>
        </div>
        <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full w-[68%] bg-gradient-to-r from-[#1a6e43] via-[#2CAB6A] to-emerald-300 rounded-full relative">
            <div className="absolute right-0 top-0 w-1 h-full bg-white/50 rounded-r-full animate-shimmer" />
          </div>
        </div>
        <div className="text-center text-[11px] text-gray-400 mt-1.5">$160 more until Batch #013 fires 🚀</div>
      </div>
    </div>
  );
}
