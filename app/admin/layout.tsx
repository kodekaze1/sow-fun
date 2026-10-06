import WalletProviders from "@/components/WalletProviders";

export const metadata = {
  title: "Command Center | sow.fun",
  robots: { index: false, follow: false },
};

// Wallet connection for the Command Center's one-click claims and card funding
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <WalletProviders>{children}</WalletProviders>;
}
