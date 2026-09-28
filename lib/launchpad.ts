// Launchpad constants - the immutable economics every launch commits to.
// The DBC config key is created once by the treasury via scripts/create-dbc-config.mjs
// and is immutable after creation: fee split, fee tier, and LP locks cannot change.

export const DBC_CONFIG_KEY = process.env.NEXT_PUBLIC_DBC_CONFIG_KEY ?? "";

export const SOLANA_RPC =
  process.env.NEXT_PUBLIC_SOLANA_RPC ||
  "https://mainnet.helius-rpc.com/?api-key=76b314db-4dae-4060-b520-966021589251";

// Trading-fee economics (2% flat pool fee)
export const POOL_FEE_BPS = 200;
// On-chain split: creator gets 45% of trading fees, the feeClaimer (impact vault) gets 55%.
// The vault's 55% is then deployed 45% to Kiva loans / 10% to operations, per the public pledge.
export const CREATOR_FEE_PCT = 45;
export const IMPACT_FEE_PCT = 45;
export const OPS_FEE_PCT = 10;

export const SITE_URL = "https://sow.fun";

// Kiva's canonical sector ids (verified via API introspection)
export const KIVA_SECTOR_IDS: Record<string, number> = {
  Agriculture: 1, Transportation: 3, Services: 4, Clothing: 5, Health: 6,
  Retail: 7, Manufacturing: 8, Arts: 9, Housing: 10, Food: 12, Wholesale: 13,
  Construction: 14, Education: 15, "Personal Use": 16, Entertainment: 17,
  "Clean Energy": 18, "Reuse & Recycle": 19, Water: 20, "Sanitation & Hygiene": 21,
};

export const KIVA_REGIONS = [
  "Africa", "Asia", "Central America", "Eastern Europe",
  "Middle East", "North America", "Oceania", "South America",
];

export const LOAN_SORTS: { value: string; label: string }[] = [
  { value: "popularity", label: "Recommended" },
  { value: "newest", label: "Most recent" },
  { value: "expiringSoon", label: "Ending soon" },
  { value: "amountLeft", label: "Almost funded" },
  { value: "loanAmount", label: "Amount: low to high" },
  { value: "loanAmountDesc", label: "Amount: high to low" },
];

export interface LoanSearchParams {
  q?: string;
  sector?: number;
  region?: string;
  women?: boolean;
  sort?: string;
}

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
  remaining: number;
  expiresAt: string | null; // Kiva plannedExpirationDate (ISO)
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
