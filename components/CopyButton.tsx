"use client";
import { useState } from "react";

export default function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        }).catch(() => {});
      }}
      className="flex-shrink-0 rounded-full bg-[#276A43] hover:bg-[#223829] text-white px-4 py-1.5 text-xs font-bold transition-colors"
      aria-live="polite"
    >
      {copied ? "Copied" : label}
    </button>
  );
}
