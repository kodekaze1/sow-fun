"use client";
import { useEffect, useState } from "react";
import ShareCards from "@/components/ShareCards";

// Token page "Share": opens the card picker (clean + illustrated designs)
// with a Post on X button. X unfurls the coin link with its Portrait card;
// any card can also be downloaded and attached by hand.
export default function ShareCoinButton({ mint, symbol, intentUrl }: { mint: string; symbol: string; intentUrl: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 border border-[#D9E6DF] hover:border-[#276A43] rounded-full px-6 py-2.5 text-sm font-bold transition-colors">
        Share
      </button>
      {open && (
        <div role="dialog" aria-modal="true" aria-label={`Share $${symbol}`}
          className="fixed inset-0 z-[600] bg-[#16261c]/60 backdrop-blur-sm flex items-start sm:items-center justify-center p-4 overflow-y-auto"
          onClick={() => setOpen(false)}>
          <div className="bg-white rounded-2xl w-full max-w-4xl p-5 sm:p-6 shadow-2xl my-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-4 mb-4">
              <h2 className="font-serif text-2xl text-[#223829]">Share ${symbol}</h2>
              <button onClick={() => setOpen(false)} aria-label="Close"
                className="w-9 h-9 flex-shrink-0 rounded-full border border-[#D9E6DF] text-gray-500 hover:text-[#223829] hover:border-[#276A43]">✕</button>
            </div>
            <ShareCards mint={mint} symbol={symbol} />
            <div className="mt-5 flex justify-end">
              <a href={intentUrl} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-[#223829] hover:bg-black text-white rounded-full px-6 py-2.5 text-sm font-bold transition-colors">
                Post on X
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
