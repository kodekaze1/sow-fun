import Link from "next/link";
import { KIVA_TEAM_URL } from "@/lib/constants";

const LINKS = [
  { href: "/tokenomics", label: "$UPLIFT Token" },
  { href: "/treasury", label: "Impact Treasury" },
  { href: "/how-it-works", label: "How It Works" },
  { href: "/roadmap", label: "Roadmap" },
  { href: "/faq", label: "FAQ" },
];

export default function SiteFooter() {
  return (
    <footer className="bg-[#223829] text-[#EDF4F1]/60 text-center py-10 px-6 mt-10 text-sm">
      <div className="flex justify-center gap-8 mb-4 flex-wrap">
        {LINKS.map(({ href, label }) => (
          <Link key={href} href={href}
            className="text-[#7FC79E] font-semibold hover:text-white transition-colors">
            {label}
          </Link>
        ))}
        <a href={KIVA_TEAM_URL} target="_blank" rel="noopener noreferrer"
          className="text-[#7FC79E] font-semibold hover:text-white transition-colors">
          Upliftify Kiva Team
        </a>
      </div>
      <div className="font-mono text-xs opacity-70">
        upliftify.fun · Treasury: FN7m...keAz · Built on Solana · Powered by the Kiva API
      </div>
      <div className="mt-2 opacity-40 text-xs">
        Upliftify is an independent community project and is not affiliated with or endorsed by Kiva.
      </div>
    </footer>
  );
}
