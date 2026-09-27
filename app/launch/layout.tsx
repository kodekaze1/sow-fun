import WalletProviders from "@/components/WalletProviders";

export const metadata = {
  title: "Launch a coin for a borrower | sow.fun",
  description:
    "Launch a token on our Meteora DBC pool where 45% of trading fees fund a real Kiva borrower - locked at launch, verifiable forever.",
};

export default function LaunchLayout({ children }: { children: React.ReactNode }) {
  return <WalletProviders>{children}</WalletProviders>;
}
