import type { Metadata } from "next";
import TreasuryClient from "./TreasuryClient";
import { getAllWaves, summarizeLedger } from "@/lib/waves";
import { getKivaImpactStats } from "@/lib/kiva-stats";
import { SHOW_LIVE_TREASURY } from "@/lib/types";
import { GENESIS_WALLET, IMPACT_CARD_ADDRESS, OPS_WALLET, TREASURY_WALLET } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Impact Treasury | sow.fun",
  description:
    "The public sow.fun treasury: every harvest, every Kiva loan, and every receipt from trading fees to microloans. Verifiable on Solana and Kiva.",
  openGraph: {
    title: "Impact Treasury | sow.fun",
    description: "Every harvest, every Kiva loan, every receipt - from trading fees to microloans.",
  },
};

export default async function TreasuryPage() {
  const [waves, kiva] = await Promise.all([getAllWaves(), getKivaImpactStats().catch(() => null)]);
  return (
    <TreasuryClient
      ledger={summarizeLedger(waves)}
      // Wallet addresses only reach the browser once we are live
      wallets={SHOW_LIVE_TREASURY ? { treasury: TREASURY_WALLET, genesis: GENESIS_WALLET, ops: OPS_WALLET, card: IMPACT_CARD_ADDRESS } : null}
      team={{
        memberCount: kiva?.team?.memberCount ?? 1,
        loanCount: kiva?.team?.loanCount ?? 0,
        loanedAmount: kiva?.team?.loanedAmount ?? 0,
      }}
    />
  );
}
