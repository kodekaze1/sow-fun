"use client";
import { useMemo } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { SOLANA_RPC } from "@/lib/launchpad";
import "@solana/wallet-adapter-react-ui/styles.css";

// Wallets register themselves via the Wallet Standard (Phantom, Solflare, Backpack...),
// so no explicit adapters are needed.
export default function WalletProviders({ children }: { children: React.ReactNode }) {
  const endpoint = useMemo(() => SOLANA_RPC, []);
  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={[]} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
