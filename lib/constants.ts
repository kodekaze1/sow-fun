// The three live wallets - each with one job, so every receipt is easy to read.
// Shown on the site only once SHOW_LIVE_TREASURY (lib/types.ts) is on. The
// sowSZPr... wallet is TEST-ONLY and must never appear on the site or in the
// mainnet config.
// Impact Treasury: fee claimer of the mainnet DBC config - the 55% vault share
// of every coin's fees and launch fees. Pays out only to Kiva (via the Impact
// Card), $SOW skims, and the ops share to the Ops wallet.
export const TREASURY_WALLET = "sowSaeMnVU3h4eV5Af6A6zzk4KR6oYgHHL3N3YoYJDy";
// Genesis wallet: launched $SOW, holds the locked team buy, receives $SOW's
// creator fees (the Genesis Vault - never loan money).
export const GENESIS_WALLET = "sowMw8eTZE5NryyyTmpCoBfcW8oYsSZtqoanRMTybAj";
// PRE-LAUNCH BREADCRUMB: the Genesis address the public /treasury code shows
// before launch. It is the dev test wallet, not the real Genesis, so anyone
// scraping the site's JavaScript for the launch wallet watches the wrong one.
// Display only - routing uses GENESIS_WALLET. AT THE REVEAL (LAUNCH.md step 6)
// set this to GENESIS_WALLET, or the live wallets card shows the wrong address.
export const GENESIS_WALLET_DISPLAY = "sowtLuq982DqKDe28jqDEfwwZtE9DhGWjZ4fFvms4VQ";
// Ops wallet: receives the 10% operations share, pays running costs.
export const OPS_WALLET = "sowyBNQiNbDPKvuScQfUWsCTZMFWfA1UdFqdHFNG5tP";

// Kiva's WAF rejects requests without a browser-like User-Agent (403)
export const KIVA_FETCH_HEADERS = {
  Accept: "application/json",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
};
export const X_LINK = "https://x.com/sowfunhq";
// Mainnet PILOT config (fees to the test wallet sowSZPr...). Never the site's
// NEXT_PUBLIC_DBC_CONFIG_KEY - only the operator's /admin can watch it.
export const PILOT_CONFIG = "AJyDjMdvnxysFetFXvfKsYCX1P2z6KRtCGhimUruefgv";
// Mainnet test configs the operator can watch in /admin (never set on Vercel).
// Test 2 pays the REAL Impact Treasury (it was first created as the live config).
// The first entry is what /admin opens on.
export const TEST_CONFIGS = [
  // Test 3: paid by the dev test wallet sowtLuq..., graduates at 100 SOL
  { key: "HdHFLBYCEBqWtZDrr3TSxDNRHHncJWbjGLF6CgTakabA", label: "Test 3" },
  { key: "5znCMHGyxiDn595365q9ntzPJ6KKCR9GpPE4aFMuVMFo", label: "Test 2" },
  { key: PILOT_CONFIG, label: "Pilot" },
];
// KAST card Solana deposit address - the fiat bridge to Kiva.
// Every wave's impact share is topped up here (publicly visible), then the
// Visa card pays Kiva at checkout; amounts match the harvest ledger receipts.
export const IMPACT_CARD_ADDRESS = "BisPNULEXmouTNaqNPwDadHCp9puAuLvp3EUT4tAih5Q";
export const KIVA_TEAM_URL = "https://www.kiva.org/team/sowfun";
export const KIVA_LENDER_URL = "https://www.kiva.org/lender/sowfun";
export const KIVA_LENDER_ID = "sowfun";
export const KIVA_TEAM_ID = 290951;
export const KIVA_TEAM_SHORTNAME = "sowfun";
