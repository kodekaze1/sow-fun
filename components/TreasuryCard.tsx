"use client";
import { useState, useEffect } from "react";
import type { TreasuryData } from "@/lib/types";
import { SHOW_LIVE_TREASURY } from "@/lib/types";
import Icon from "@/components/icons";

export interface TreasuryCardProps {
  deployedCents: number;
  recycledCents: number;
  latest: { number: number; status: string; deployedCents: number; loanCount: number } | null;
}

const money = (cents: number) => `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function TreasuryCard({ deployedCents, recycledCents, latest }: TreasuryCardProps) {
  const [data, setData] = useState<TreasuryData | null>(null);

  useEffect(() => {
    if (!SHOW_LIVE_TREASURY) return;
    fetch("/api/treasury")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, []);

  const sol = data?.sol ?? "-";
  const usd = data?.usd ?? "-";
  const wallet = data?.wallet ?? "loading…";
  const short = wallet.length > 12 ? wallet.slice(0, 4) + "…" + wallet.slice(-4) : wallet;

  return (
    <div className="p-5">
      {/* Balance hero */}
      <div className="bg-gradient-to-br from-[#223829] to-[#276A43] rounded-2xl p-4 text-center mb-4 relative overflow-hidden">
        <Icon name="globe" className="absolute w-28 h-28 right-[-16px] bottom-[-20px] text-white opacity-10" />
        {SHOW_LIVE_TREASURY ? (
          <>
            <div className="text-3xl font-black text-white leading-none">{sol} SOL</div>
            <div className="text-sm text-white/70 mt-1">≈ ${usd} USD · on-chain balance</div>
          </>
        ) : (
          <>
            <div className="text-2xl font-black text-white leading-none">Sprouting soon 🌱</div>
            <div className="text-sm text-white/70 mt-1.5">Live balance appears at launch</div>
          </>
        )}
      </div>

      {/* Rows */}
      {[
        ...(SHOW_LIVE_TREASURY
          ? [{ icon: "pin", label: "Wallet", value: <span className="font-mono text-xs bg-[#EDF4F1] text-[#276A43] px-2 py-0.5 rounded cursor-pointer hover:bg-[#D9E6DF]">{short}</span> }]
          : []),
        { icon: "send", label: "Last withdrawal", value: <span className="font-bold text-gray-400">pending launch</span> },
        { icon: "vault", label: "In transit (bridge + Kiva)", value: <span className="font-bold text-[#996210]">$0.00</span> },
        { icon: "coins", label: "Deployed to loans", value: <span className="font-bold text-[#276A43]">{money(deployedCents)}</span> },
        { icon: "refresh", label: "Recycled capital", value: <span className="font-bold text-[#996210]">{money(recycledCents)}</span> },
      ].map(({ icon, label, value }) => (
        <div key={label} className="flex justify-between items-center py-2.5 border-b border-gray-50 last:border-0 text-sm">
          <span className="flex items-center gap-2 text-gray-500 font-medium">
            <Icon name={icon} className="w-4 h-4 text-[#223829]" />
            {label}
          </span>
          <span>{value}</span>
        </div>
      ))}

      {/* Latest harvest */}
      {latest && (
        <div className="mt-4">
          <div className="flex justify-between text-xs text-gray-500 font-semibold mb-1.5">
            <span>Harvest #{String(latest.number).padStart(3, "0")}</span>
            <span className="text-[#276A43] font-bold">
              {latest.status === "funded" || latest.status === "published" ? "Funded ✓" : latest.status === "funding" ? "Funding" : latest.status}
            </span>
          </div>
          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#223829] via-[#276A43] to-[#2AA967] rounded-full"
              style={{ width: latest.status === "funding" ? "50%" : "100%" }}
            />
          </div>
          <div className="text-center text-[11px] text-gray-400 mt-1.5">
            {money(latest.deployedCents)} across {latest.loanCount} {latest.loanCount === 1 ? "loan" : "loans"}, verified on Kiva
          </div>
        </div>
      )}
    </div>
  );
}
