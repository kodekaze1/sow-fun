import WalletProviders from "@/components/WalletProviders";

export const metadata = {
  title: "My coins | sow.fun",
  description: "Your launched coins, their borrowers, and your unclaimed creator fees.",
};

export default function MyLayout({ children }: { children: React.ReactNode }) {
  return <WalletProviders>{children}</WalletProviders>;
}
