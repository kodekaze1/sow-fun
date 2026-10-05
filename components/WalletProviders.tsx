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
  const endpoint = useMemo(() => {
    const origin = typeof window !== "undefined" ? window.location.origin : SITE_URL;
    // Wallets pick the network from the RPC URL, and any "localhost" URL reads
    // as a local test chain - so a local dev server would get "Unsupported
    // chain: solana:localnet". Our proxy talks to mainnet, so on localhost tag
    // the URL with the mainnet endpoint in the #fragment: the wallet's check
    // matches it first, and browsers never send fragments with requests.
    const local = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
    return `${origin}${CLIENT_RPC_PATH}${local ? "#https://api.mainnet-beta.solana.com" : ""}`;
  }, []);
  const config = useMemo(() => ({ commitment: "confirmed" as const, wsEndpoint: PUBLIC_WS_ENDPOINT }), []);
  return (
    <ConnectionProvider endpoint={endpoint} config={config}>
      <WalletProvider wallets={[]} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
