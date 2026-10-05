"use client";
import { useMemo } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { CLIENT_RPC_PATH, PUBLIC_WS_ENDPOINT, SITE_URL } from "@/lib/launchpad";
import "@solana/wallet-adapter-react-ui/styles.css";

// Wallets register themselves via the Wallet Standard (Phantom, Solflare, Backpack...),
// so no explicit adapters are needed.
export default function WalletProviders({ children }: { children: React.ReactNode }) {
  // Connection needs an absolute URL; SSR has no window, so fall back to the site origin.
  const endpoint = useMemo(
    () => `${typeof window !== "undefined" ? window.location.origin : SITE_URL}${CLIENT_RPC_PATH}`,
    []
  );
  const config = useMemo(() => ({ commitment: "confirmed" as const, wsEndpoint: PUBLIC_WS_ENDPOINT }), []);
  return (
    <ConnectionProvider endpoint={endpoint} config={config}>
      <WalletProvider wallets={[]} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
