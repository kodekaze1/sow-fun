import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FAQ | sow.fun",
  description: "How fees become Kiva loans, what happens to excess, borrower queues, claim expiry, graduation, and how to verify every step.",
  openGraph: { title: "FAQ | sow.fun", description: "How fees become Kiva loans, and how to verify every step." },
};

export default function FaqLayout({ children }: { children: React.ReactNode }) {
  return children;
}
