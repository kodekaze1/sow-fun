"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { KIVA_LENDER_URL } from "@/lib/constants";

const LINKS = [
  { href: "/launches", label: "Launches" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/tokenomics", label: "Tokenomics" },
  { href: "/treasury", label: "Treasury" },
  { href: "/roadmap", label: "Roadmap" },
  { href: "/faq", label: "FAQ" },
];

export default function SiteNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <nav className="bg-white/95 backdrop-blur border-b border-[#EDF4F1] sticky top-0 z-[500] shadow-[0_2px_12px_rgba(34,56,41,0.05)]">
      <div className="max-w-[1440px] mx-auto px-6 h-16 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2.5 flex-shrink-0" onClick={() => setOpen(false)}>
          <img src="/sow-logo.png" alt="$SOW" className="h-9 w-9 rounded-full object-cover" />
          <span className="font-serif text-[19px] font-semibold text-[#223829] tracking-tight hidden sm:block">sow.fun</span>
          <span className="text-[#D9E6DF] text-lg font-light">×</span>
          <img src="/kiva-logo.png" alt="Kiva" className="h-6 object-contain" />
        </Link>

        <div className="hidden lg:flex items-center gap-6">
          {LINKS.map(({ href, label }) => {
            const active = pathname === href;
            return (
              <Link key={href} href={href}
                className={`relative text-sm font-medium transition-colors ${
                  active ? "text-[#276A43]" : "text-[#223829] hover:text-[#276A43]"
                }`}>
                {label}
                {active && (
                  <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 60 6" preserveAspectRatio="none" fill="none" aria-hidden="true">
                    <path d="M2 4c15-2.5 40-2.5 56-1" stroke="#2AA967" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                )}
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <a href={KIVA_LENDER_URL} target="_blank" rel="noopener noreferrer"
            className="hidden md:block text-sm font-semibold text-[#276A43] hover:text-[#223829] transition-colors">
            Proof of Impact
          </a>
          <Link href="/launch"
            className={`rounded-full px-5 py-2 text-sm font-bold transition-colors ${
              pathname === "/launch"
                ? "bg-[#223829] text-white"
                : "bg-[#276A43] hover:bg-[#223829] text-white"
            }`}>
            Launch a coin
          </Link>
          <button
            onClick={() => setOpen(!open)}
            aria-label="Menu"
            className="lg:hidden w-9 h-9 flex flex-col items-center justify-center gap-[5px] rounded-full border border-[#D9E6DF]"
          >
            <span className={`block w-4 h-[2px] bg-[#223829] rounded transition-transform ${open ? "translate-y-[7px] rotate-45" : ""}`} />
            <span className={`block w-4 h-[2px] bg-[#223829] rounded transition-opacity ${open ? "opacity-0" : ""}`} />
            <span className={`block w-4 h-[2px] bg-[#223829] rounded transition-transform ${open ? "-translate-y-[7px] -rotate-45" : ""}`} />
          </button>
        </div>
      </div>

      {open && (
        <div className="lg:hidden border-t border-[#EDF4F1] bg-white px-6 py-4 flex flex-col gap-1">
          {LINKS.map(({ href, label }) => (
            <Link key={href} href={href} onClick={() => setOpen(false)}
              className={`py-2.5 text-sm font-semibold rounded-lg px-3 -mx-3 transition-colors ${
                pathname === href ? "text-[#276A43] bg-[#EDF4F1]" : "text-[#223829] hover:bg-[#EDF4F1]/60"
              }`}>
              {label}
            </Link>
          ))}
          <a href={KIVA_LENDER_URL} target="_blank" rel="noopener noreferrer"
            className="py-2.5 text-sm font-semibold text-[#276A43] px-3 -mx-3">
            Proof of Impact ↗
          </a>
        </div>
      )}
    </nav>
  );
}
