// Launchpad constants - the immutable economics every launch commits to.
// The DBC config key is created once by the treasury via scripts/create-dbc-config.mjs
// and is immutable after creation: fee split, fee tier, and LP locks cannot change.

export const DBC_CONFIG_KEY = process.env.NEXT_PUBLIC_DBC_CONFIG_KEY ?? "";

export const SOLANA_RPC =
  process.env.NEXT_PUBLIC_SOLANA_RPC ??
  "https://mainnet.helius-rpc.com/?api-key=76b314db-4dae-4060-b520-966021589251";

// Trading-fee economics (2% flat pool fee)
export const POOL_FEE_BPS = 200;
// On-chain split: creator gets 45% of trading fees, the feeClaimer (impact vault) gets 55%.
// The vault's 55% is then deployed 45% to Kiva loans / 10% to operations, per the public pledge.
export const CREATOR_FEE_PCT = 45;
export const IMPACT_FEE_PCT = 45;
export const OPS_FEE_PCT = 10;

export const SITE_URL = "https://upliftify.fun";

export interface FundraisingLoan {
  id: number;
  name: string;
  country: string;
  activity: string;
  sector: string;
  use: string;
  image: string | null;
  loanAmount: number;
  fundedAmount: number;
  borrowerCount: number;
}

export function tokenMetadataUri(params: {
  name: string;
  symbol: string;
  image: string;
  loanId: number;
  borrower: string;
}): string {
  const q = new URLSearchParams({
    name: params.name,
    symbol: params.symbol,
    image: params.image,
    loan: String(params.loanId),
    borrower: params.borrower,
  });
  return `${SITE_URL}/api/meta?${q.toString()}`;
}
