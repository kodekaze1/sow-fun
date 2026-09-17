import Link from "next/link";
import { KIVA_TEAM_URL, KIVA_LENDER_URL, TREASURY_WALLET, X_LINK } from "@/lib/constants";

const COLUMNS: { title: string; links: { href: string; label: string; external?: boolean }[] }[] = [
  {
    title: "Protocol",
    links: [
      { href: "/tokenomics", label: "Tokenomics" },
      { href: "/treasury", label: "Impact Treasury" },
      { href: "/roadmap", label: "Roadmap" },
    ],
  },
  {
    title: "Learn",
    links: [
      { href: "/how-it-works", label: "How It Works" },
      { href: "/faq", label: "FAQ" },
      { href: X_LINK, label: "@UpliftifyFun on X", external: true },
    ],
  },
  {
    title: "Proof",
    links: [
      { href: KIVA_TEAM_URL, label: "Kiva Lending Team", external: true },
      { href: KIVA_LENDER_URL, label: "Lender Profile", external: true },
      { href: `https://explorer.solana.com/address/${TREASURY_WALLET}`, label: "Treasury on Solana", external: true },
    ],
  },
];

export default function SiteFooter() {
  return (
    <footer className="bg-[#16261c] text-[#EDF4F1]/60 mt-10">
      <div className="max-w-[1200px] mx-auto px-6 pt-14 pb-10">
        <div className="grid grid-cols-1 md:grid-cols-[1.4fr_1fr_1fr_1fr] gap-10">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <img src="/uplift-logo.png" alt="$UPLIFT" className="h-9 w-9 rounded-full object-cover" />
              <span className="font-serif text-xl font-semibold text-[#EDF4F1] tracking-tight">Upliftify</span>
            </div>
            <p className="text-sm leading-relaxed max-w-xs">
              Trading fees become microloans for real entrepreneurs. Repayments fund the next borrower.
              Public, verifiable, ongoing.
            </p>
          </div>

          {COLUMNS.map(({ title, links }) => (
            <div key={title}>
              <div className="text-xs font-black uppercase tracking-widest text-[#7FC79E] mb-4">{title}</div>
              <ul className="flex flex-col gap-2.5">
                {links.map(({ href, label, external }) => (
                  <li key={label}>
                    {external ? (
                      <a href={href} target="_blank" rel="noopener noreferrer"
                        className="text-sm text-[#EDF4F1]/75 hover:text-white transition-colors">
                        {label}
                      </a>
                    ) : (
                      <Link href={href} className="text-sm text-[#EDF4F1]/75 hover:text-white transition-colors">
                        {label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-white/10 mt-12 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="font-mono text-xs opacity-60">
            upliftify.fun · Treasury: FN7m...keAz · Built on Solana
          </div>
          <div className="text-xs opacity-40 text-center sm:text-right">
            Upliftify is an independent community project, not affiliated with or endorsed by Kiva.
          </div>
        </div>
      </div>
    </footer>
  );
}
