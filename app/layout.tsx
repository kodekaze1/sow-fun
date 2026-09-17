import type { Metadata } from "next";
import { Figtree, Fraunces } from "next/font/google";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import "./globals.css";

const figtree = Figtree({ subsets: ["latin"], variable: "--font-figtree" });
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces" });

export const metadata: Metadata = {
  title: "$UPLIFT × Kiva — Every Trade. Every Life. Real Uplift.",
  description: "Every $UPLIFT trade funds microloans for real entrepreneurs across the developing world. upliftify.fun",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${figtree.variable} ${fraunces.variable}`}>
      <body className="min-h-screen bg-white font-sans text-[#223829]">
        <SiteNav />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
