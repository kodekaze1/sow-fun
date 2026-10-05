// Launchpad constants - the immutable economics every launch commits to.
// The DBC config key is created once by the treasury via scripts/create-dbc-config.mjs
// and is immutable after creation: fee split, fee tier, and LP locks cannot change.

export const DBC_CONFIG_KEY = process.env.NEXT_PUBLIC_DBC_CONFIG_KEY ?? "";

// Browser RPC goes through the same-origin /api/rpc proxy so the Helius key
// stays server-side (server code uses serverRpcUrl() from lib/rpc-server).
// Signature subscriptions use the public websocket - no key needed.
export const CLIENT_RPC_PATH = "/api/rpc";
export const PUBLIC_WS_ENDPOINT = "wss://api.mainnet-beta.solana.com";

// Trading-fee economics (2% flat pool fee)
export const POOL_FEE_BPS = 200;
// On-chain split: creator gets 45% of trading fees, the feeClaimer (impact vault) gets 55%.
// The vault's 55% is then deployed 45% to Kiva loans / 10% to operations, per the public pledge.
export const CREATOR_FEE_PCT = 45;
export const IMPACT_FEE_PCT = 45;
export const OPS_FEE_PCT = 10;

export const SITE_URL = "https://sow.fun";

// Launch + graduation economics (mirrors scripts/lib/sow-config.mjs - the
// on-chain config is the source of truth once created).
export const LAUNCH_FEE_SOL = 0.035; // on-chain anti-bot fee, 90% to treasury, 10% Meteora
export const MIGRATION_QUOTE_SOL = 85; // SOL raised on the curve before graduation
export const MIGRATED_POOL_FEE_BPS = 100; // DAMM v2 fee after graduation
export const METEORA_PROTOCOL_FEE_PCT = 20; // Meteora's cut of every trading fee

// Borrower claim expiry: a coin holds its borrower for CLAIM_WINDOW_HOURS.
// If by then it has earned less than CLAIM_MIN_FEES_SOL in lifetime trading
// fees (and has not graduated), the claim lapses and the borrower reopens.
export const CLAIM_WINDOW_HOURS = 72;
export const CLAIM_MIN_FEES_SOL = 0.05;

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
  const q = new URLSearchParams({ name: params.name, symbol: params.symbol });
  // No upload: omit the image so /api/meta uses its default (a full Kiva
  // image URL alone can eat most of the 200-byte URI budget)
  if (params.image) q.set("image", params.image);
  q.set("loan", String(params.loanId));
  if (params.borrower) q.set("borrower", params.borrower);
  return `${SITE_URL}/api/meta?${q.toString()}`;
}

// Metaplex caps the metadata URI at 200 bytes; past it pool creation fails
// with an opaque program error, so check before the wallet prompt.
export const MAX_URI_BYTES = 200;

export function uriByteLength(uri: string): number {
  return new TextEncoder().encode(uri).length;
}

/**
 * The launch URI, shortened to fit MAX_URI_BYTES: the borrower name is
 * trimmed first (it is also on Kiva via the loan id), then dropped.
 * `ok: false` means even the minimal URI is too long - the token name is.
 */
export function fitTokenMetadataUri(params: Parameters<typeof tokenMetadataUri>[0]): { uri: string; bytes: number; ok: boolean } {
  let uri = tokenMetadataUri(params);
  const words = params.borrower.trim().split(/\s+/);
  for (let n = words.length - 1; uriByteLength(uri) > MAX_URI_BYTES && n >= 0; n--) {
    uri = tokenMetadataUri({ ...params, borrower: words.slice(0, n).join(" ") });
  }
  const bytes = uriByteLength(uri);
  return { uri, bytes, ok: bytes <= MAX_URI_BYTES };
}
