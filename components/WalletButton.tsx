"use client";
import dynamic from "next/dynamic";

// The wallet adapter's button renders "Select Wallet" on the server but the
// detected wallet's icon/name in the browser, which trips React's hydration
// check. Rendering it client-only removes the mismatch.
const WalletButton = dynamic(
  () => import("@solana/wallet-adapter-react-ui").then((m) => m.WalletMultiButton),
  { ssr: false }
);

export default WalletButton;
