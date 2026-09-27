import type { Metadata } from "next";
import { Figtree, Lora } from "next/font/google";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import "./globals.css";

const figtree = Figtree({ subsets: ["latin"], variable: "--font-figtree" });
const lora = Lora({ subsets: ["latin"], style: ["normal", "italic"], variable: "--font-lora" });

export const metadata: Metadata = {
  metadataBase: new URL("https://sow.fun"),
  title: "sow.fun - Launch a coin. Fund a life.",
  description:
    "The Solana launchpad where every token pledges 45% of trading fees to a real Kiva borrower - locked at launch, verifiable forever. Sow good, reap good.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${figtree.variable} ${lora.variable}`}>
      <body className="min-h-screen bg-white font-sans text-[#223829]">
        <SiteNav />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
