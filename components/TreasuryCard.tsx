"use client";
import { useState, useEffect } from "react";
import type { TreasuryData } from "@/lib/types";
import { MOCK_STATS } from "@/lib/types";
import Icon from "@/components/icons";

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
      <div className="bg-gradient-to-br from-[#223829] to-[#276A43] rounded-2xl p-4 text-center mb-4 relative overflow-hidden">
        <Icon name="globe" className="absolute w-28 h-28 right-[-16px] bottom-[-20px] text-white opacity-10" />
        <div className="text-3xl font-black text-white leading-none">{sol} SOL</div>
        <div className="text-sm text-white/70 mt-1">≈ ${usd} USD · on-chain balance</div>
      </div>

      {/* Rows */}
      {[
        { icon: "pin", label: "Wallet", value: <span className="font-mono text-xs bg-[#EDF4F1] text-[#276A43] px-2 py-0.5 rounded cursor-pointer hover:bg-[#D9E6DF]">{short}</span> },
        { icon: "send", label: "Last withdrawal", value: <span className="font-bold text-gray-400">pending launch</span> },
        { icon: "vault", label: "Kiva balance", value: <span className="font-bold text-[#276A43]">$0.00</span> },
        { icon: "coins", label: "Total deployed", value: <span className="font-bold">${MOCK_STATS.feesCollected}</span> },
        { icon: "refresh", label: "Recycled capital", value: <span className="font-bold text-[#996210]">$0.00</span> },
      ].map(({ icon, label, value }) => (
        <div key={label} className="flex justify-between items-center py-2.5 border-b border-gray-50 last:border-0 text-sm">
          <span className="flex items-center gap-2 text-gray-500 font-medium">
            <Icon name={icon} className="w-4 h-4 text-[#276A43]" />
            {label}
          </span>
          <span>{value}</span>
        </div>
      ))}

      {/* Progress */}
      <div className="mt-4">
        <div className="flex justify-between text-xs text-gray-500 font-semibold mb-1.5">
          <span>Wave #001 Status</span>
          <span className="text-[#276A43] font-bold">In Progress</span>
        </div>
        <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full w-[15%] bg-gradient-to-r from-[#223829] via-[#276A43] to-[#2AA967] rounded-full relative">
            <div className="absolute right-0 top-0 w-1 h-full bg-white/50 rounded-r-full animate-shimmer" />
          </div>
        </div>
        <div className="text-center text-[11px] text-gray-400 mt-1.5">Founder-seeded $25 loan active while treasury scales</div>
      </div>
    </div>
  );
}
