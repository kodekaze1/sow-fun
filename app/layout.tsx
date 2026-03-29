import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "$IMPACT × Kiva — Real Trades. Real Lives. Real Impact.",
  description: "Every $IMPACT trade funds microloans for real entrepreneurs across the developing world.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={`${inter.className} min-h-screen bg-[#f4f9f6]`}>{children}</body>
    </html>
  );
}
