import Link from "next/link";
import { KIVA_LENDER_URL } from "@/lib/constants";

const LINKS = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/tokenomics", label: "Tokenomics" },
  { href: "/treasury", label: "Treasury" },
  { href: "/roadmap", label: "Roadmap" },
  { href: "/faq", label: "FAQ" },
];

export default function SiteNav() {
  return (
    <nav className="bg-white/95 backdrop-blur border-b border-[#EDF4F1] sticky top-0 z-[500] shadow-[0_2px_12px_rgba(34,56,41,0.05)]">
      <div className="max-w-[1440px] mx-auto px-6 h-16 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2.5 flex-shrink-0">
          <img src="/uplift-logo.png" alt="$UPLIFT" className="h-9 w-9 rounded-full object-cover" />
          <span className="font-serif text-[19px] font-semibold text-[#223829] tracking-tight hidden sm:block">Upliftify</span>
          <span className="text-[#D9E6DF] text-lg font-light">×</span>
          <img src="/kiva-logo.png" alt="Kiva" className="h-6 object-contain" />
        </Link>

        <div className="hidden md:flex items-center gap-6">
          {LINKS.map(({ href, label }) => (
            <Link key={href} href={href}
              className="text-sm font-medium text-[#223829] hover:text-[#276A43] transition-colors">
              {label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="hidden lg:flex items-center gap-2 bg-[#EDF4F1] rounded-full px-4 py-1.5 text-xs font-semibold text-[#276A43]">
            <div className="w-2 h-2 bg-[#2AA967] rounded-full animate-livepulse" />
            Treasury: FN7m...keAz
          </div>
          <a href={KIVA_LENDER_URL} target="_blank" rel="noopener noreferrer"
            className="bg-[#276A43] hover:bg-[#223829] text-white rounded-full px-5 py-2 text-sm font-bold transition-colors">
            Proof of Impact
          </a>
        </div>
      </div>
    </nav>
  );
}
