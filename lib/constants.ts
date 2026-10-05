// Launch treasury: feeClaimer of the mainnet DBC config, receives the vault
// share of every coin's fees. Shown on the site only once SHOW_LIVE_TREASURY
// (lib/types.ts) is on. The earlier sowSZPr... wallet is TEST-ONLY (devnet
// rehearsals) and must never appear on the site or in the mainnet config.
export const TREASURY_WALLET = "sowMw8eTZE5NryyyTmpCoBfcW8oYsSZtqoanRMTybAj";

// Kiva's WAF rejects requests without a browser-like User-Agent (403)
export const KIVA_FETCH_HEADERS = {
  Accept: "application/json",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
};
export const X_LINK = "https://x.com/sowfunhq";
// KAST card Solana deposit address - the fiat bridge to Kiva.
// Every wave's impact share is topped up here (publicly visible), then the
// Visa card pays Kiva at checkout; amounts match the harvest ledger receipts.
export const IMPACT_CARD_ADDRESS = "BisPNULEXmouTNaqNPwDadHCp9puAuLvp3EUT4tAih5Q";
export const KIVA_TEAM_URL = "https://www.kiva.org/team/sowfun";
export const KIVA_LENDER_URL = "https://www.kiva.org/lender/sowfun";
export const KIVA_LENDER_ID = "sowfun";
export const KIVA_TEAM_ID = 290951;
export const KIVA_TEAM_SHORTNAME = "sowfun";
