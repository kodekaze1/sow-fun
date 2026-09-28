import successionsJson from "@/data/successions.json";
import rewardsJson from "@/data/rewards.json";

// Succession: a coin's beneficiary loan closed, and the creator adopted the
// next borrower. Creator intent is proven by an on-chain memo transaction
// sent from the creator wallet (memo_tx); the operator verifies it and
// commits the entry here. The token page treats the LATEST entry for a mint
// as the active borrower and shows the full chain as history.
export interface Succession {
  mint: string;
  from_loan_id: number;
  to_loan_id: number;
  borrower: string; // successor borrower name at adoption time
  memo_tx: string; // creator's on-chain adoption memo (empty if operator-assigned)
  adopted_at: string; // ISO date
  note?: string;
}

// CreatorReward: one entry per (coin, fully funded borrower). The $SOW comes
// from the coin's own excess: 20% of excess buys $SOW at harvest - 10 points
// are burned (burn_tx), 10 points accrue here and pay out to the creator
// wallet once the borrower's loan is verified funded in the harvest ledger.
export interface CreatorReward {
  mint: string;
  symbol: string;
  creator: string; // pool creator wallet the reward pays to
  borrower_loan_id: number;
  borrower: string;
  sow_amount: number; // whole $SOW tokens
  buy_tx: string; // treasury market-buy of $SOW
  burn_tx: string; // burn of the other half of the 20%
  payout_tx: string; // transfer to creator (empty while accruing)
  harvest: string; // wave id, e.g. "002"
  date: string; // ISO date
  status: "accruing" | "paid";
}

const successions = successionsJson as Succession[];
const rewards = rewardsJson as CreatorReward[];

export function getSuccessionChain(mint: string): Succession[] {
  return successions
    .filter((s) => s.mint === mint)
    .sort((a, b) => a.adopted_at.localeCompare(b.adopted_at));
}

// The loan a coin's fees currently flow to, after any adoptions.
export function getActiveSuccession(mint: string): Succession | null {
  const chain = getSuccessionChain(mint);
  return chain.length ? chain[chain.length - 1] : null;
}

export function getRewardsForCreator(creator: string): CreatorReward[] {
  return rewards
    .filter((r) => r.creator === creator)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function getRewardsForMint(mint: string): CreatorReward[] {
  return rewards
    .filter((r) => r.mint === mint)
    .sort((a, b) => b.date.localeCompare(a.date));
}
