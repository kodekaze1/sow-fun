"use client";
import { useState } from "react";
import { IMPACT_FEE_PCT, SITE_URL } from "@/lib/launchpad";

// Three ready-made X images for a freshly launched coin, rendered by
// /api/card/coin/<mint>?v=N. A brand-new coin can take ~30s to reach the
// coin index, so each preview retries until its card exists.

const VARIANTS = [
  { v: 1, label: "Portrait" },
  { v: 2, label: "Ticker" },
  { v: 3, label: "Impact" },
];
const RETRY_MS = 5000;
const MAX_TRIES = 12;

function CardPreview({ mint, symbol, v, label }: { mint: string; symbol: string; v: number; label: string }) {
  const [tries, setTries] = useState(0);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const src = `/api/card/coin/${mint}?v=${v}${tries ? `&try=${tries}` : ""}`;

  const download = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/card/coin/${mint}?v=${v}`);
      if (!res.ok) throw new Error(String(res.status));
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = `${symbol}-sowfun-${label.toLowerCase()}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="relative aspect-[16/9] rounded-xl overflow-hidden border border-[#E4EBE7] bg-[#EDF4F1]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={src}
          src={src}
          alt={`${label} share card for $${symbol}`}
          className={`w-full h-full object-cover transition-opacity ${ready ? "opacity-100" : "opacity-0"}`}
          onLoad={() => setReady(true)}
          onError={() => {
            if (tries < MAX_TRIES) setTimeout(() => setTries((t) => t + 1), RETRY_MS);
          }}
        />
        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center text-[12px] text-gray-400">
            {tries >= MAX_TRIES ? "Card unavailable - try the token page later" : "Preparing your card..."}
          </div>
        )}
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="font-bold text-[#223829]">{label}</span>
        <button onClick={download} disabled={!ready || saving}
          className="font-bold text-[#276A43] hover:underline disabled:text-gray-300 disabled:no-underline">
          {saving ? "Saving..." : "Download"}
        </button>
      </div>
    </div>
  );
}

export default function ShareCards({ mint, symbol }: { mint: string; symbol: string }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {VARIANTS.map(({ v, label }) => (
          <CardPreview key={v} mint={mint} symbol={symbol} v={v} label={label} />
        ))}
      </div>
      <p className="text-[12px] text-gray-500 leading-relaxed">
        Post on X and your link unfurls with the Portrait card automatically - or download any card and attach it yourself.
      </p>
    </div>
  );
}

export function shareIntentUrl(mint: string, symbol: string, borrower: string | null): string {
  const text = `I just launched $${symbol} on @sowfunhq - ${IMPACT_FEE_PCT}% of every trade's fees fund ${borrower ? `${borrower}'s` : "a real"} Kiva loan.`;
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(`${SITE_URL}/t/${mint}`)}`;
}
