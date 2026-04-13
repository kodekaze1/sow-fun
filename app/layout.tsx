import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "$UPLIFT × Kiva — Every Trade. Every Life. Real Uplift.",
  description: "Every $UPLIFT trade funds microloans for real entrepreneurs across the developing world. upliftify.fun",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#f4f9f6]">{children}</body>
    </html>
  );
}
