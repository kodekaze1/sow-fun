// Fund the Impact Card for a harvest: swap exactly the USDC the harvest plan
// lends (Jupiter exact-out, so the card gets $150.00, not "about $150"), then
// send it to the KAST card deposit address. Both steps print a receipt and
// are logged to data/card-topups.json (commit it with the harvest).
//
// Only the plan's "lend now" total crosses to the card - everything else stays
// as SOL in the treasury and rolls into the coins' next harvest, so money "in
// transit" stays near zero (OPERATIONS.md "Fund states").
//
// Usage (the /admin Command Center builds this with the right numbers):
//   KEYPAIR=<impact treasury json> USD=150 DRY=1 node scripts/fund-card.mjs   # preview
//   KEYPAIR=<impact treasury json> USD=150 node scripts/fund-card.mjs
//
// Env: USD (required, dollars to land on the card), BUFFER_USD (default 0 -
// extra for card fees), CARD (default the published KAST deposit address),
// SLIPPAGE_BPS (default 50), RPC / HELIUS_API_KEY (see scripts/lib/rpc.mjs).
// USDC already in the treasury is used first; only the shortfall is swapped.

import fs from "node:fs";
import path from "node:path";
import { Connection, Keypair, PublicKey, Transaction, VersionedTransaction, sendAndConfirmTransaction } from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferCheckedInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { NETWORK, resolveRpc } from "./lib/rpc.mjs";

const SOL_MINT = "So11111111111111111111111111111111111111112";
const USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
const USDC_DECIMALS = 6;
const KAST_DEPOSIT = "BisPNULEXmouTNaqNPwDadHCp9puAuLvp3EUT4tAih5Q"; // lib/constants IMPACT_CARD_ADDRESS
const JUP_API = process.env.JUP_API ?? "https://lite-api.jup.ag/swap/v1";
const SOL_RESERVE_LAMPORTS = 10_000_000n; // never leave the treasury under 0.01 SOL

const env = process.env;
const DRY = !!env.DRY;
const SLIPPAGE_BPS = Number(env.SLIPPAGE_BPS ?? 50);
function fail(msg) {
  console.error(msg);
  process.exit(1);
}

if (NETWORK !== "mainnet") fail("fund-card is mainnet-only (Jupiter has no devnet routes).");
if (!env.KEYPAIR) fail("Set KEYPAIR=<impact treasury keypair json>.");
const usd = Number(env.USD) + Number(env.BUFFER_USD ?? 0);
if (!(usd > 0) || usd > 100_000) fail("Set USD=<dollars to land on the card> (e.g. USD=150).");

const wallet = Keypair.fromSecretKey(new Uint8Array(JSON.parse(fs.readFileSync(env.KEYPAIR, "utf8"))));
const card = new PublicKey(env.CARD ?? KAST_DEPOSIT);
const connection = new Connection(resolveRpc(), "confirmed");
const target = BigInt(Math.round(usd * 10 ** USDC_DECIMALS)); // raw USDC units
const fmt = (raw) => `$${(Number(raw) / 10 ** USDC_DECIMALS).toFixed(2)}`;

const walletAta = getAssociatedTokenAddressSync(USDC_MINT, wallet.publicKey, false, TOKEN_PROGRAM_ID);
const cardAta = getAssociatedTokenAddressSync(USDC_MINT, card, true, TOKEN_PROGRAM_ID);
async function usdcBalance() {
  try {
    return BigInt((await connection.getTokenAccountBalance(walletAta, "confirmed")).value.amount);
  } catch {
    return 0n;
  }
}

console.log(`treasury: ${wallet.publicKey.toBase58()}`);
console.log(`card:     ${card.toBase58()}`);
console.log(`target:   ${fmt(target)} to the card${env.BUFFER_USD ? ` (incl. $${Number(env.BUFFER_USD).toFixed(2)} buffer)` : ""}`);

// 1. SWAP only the shortfall, exact-out
const have = await usdcBalance();
const need = target > have ? target - have : 0n;
let swapTx = null;
let solSpent = 0;
console.log(`usdc:     ${fmt(have)} already in the treasury -> swap ${fmt(need)}`);
if (need > 0n) {
  const q = new URLSearchParams({
    inputMint: SOL_MINT,
    outputMint: USDC_MINT.toBase58(),
    amount: need.toString(),
    swapMode: "ExactOut",
    slippageBps: String(SLIPPAGE_BPS),
  });
  const quoteRes = await fetch(`${JUP_API}/quote?${q}`);
  if (!quoteRes.ok) fail(`Jupiter quote failed: ${quoteRes.status} ${await quoteRes.text()}`);
  const quote = await quoteRes.json();
  const maxIn = BigInt(quote.otherAmountThreshold); // most SOL it can take (slippage)
  solSpent = Number(quote.inAmount) / 1e9;
  console.log(`quote:    ~${solSpent.toFixed(6)} SOL (max ${(Number(maxIn) / 1e9).toFixed(6)}) -> exactly ${fmt(need)}`);
  const lamports = BigInt(await connection.getBalance(wallet.publicKey));
  if (lamports - maxIn < SOL_RESERVE_LAMPORTS) {
    fail(`Not enough SOL: the swap may take ${(Number(maxIn) / 1e9).toFixed(4)} SOL and the treasury holds ${(Number(lamports) / 1e9).toFixed(4)} (keeps 0.01 reserve).`);
  }
  if (DRY) {
    console.log("\nDRY run - nothing swapped or sent.");
    process.exit(0);
  }
  const swapRes = await fetch(`${JUP_API}/swap`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      quoteResponse: quote,
      userPublicKey: wallet.publicKey.toBase58(),
      wrapAndUnwrapSol: true,
      dynamicComputeUnitLimit: true,
      prioritizationFeeLamports: { priorityLevelWithMaxLamports: { maxLamports: 1_000_000, priorityLevel: "high" } },
    }),
  });
  if (!swapRes.ok) fail(`Jupiter swap build failed: ${swapRes.status} ${await swapRes.text()}`);
  const { swapTransaction, lastValidBlockHeight } = await swapRes.json();
  const vtx = VersionedTransaction.deserialize(Buffer.from(swapTransaction, "base64"));
  vtx.sign([wallet]);
  swapTx = await connection.sendRawTransaction(vtx.serialize(), { maxRetries: 3 });
  const conf = await connection.confirmTransaction({ signature: swapTx, blockhash: vtx.message.recentBlockhash, lastValidBlockHeight }, "confirmed");
  if (conf.value.err) fail(`Swap failed: ${JSON.stringify(conf.value.err)}  tx ${swapTx}`);
  console.log(`swapped:  https://solscan.io/tx/${swapTx}`);
} else if (DRY) {
  console.log("\nDRY run - enough USDC already; would send it straight to the card.");
  process.exit(0);
}

// 2. SEND exactly the target to the card
const now = await usdcBalance();
if (now < target) fail(`Only ${fmt(now)} USDC in the treasury after the swap - expected ${fmt(target)}. Nothing sent.`);
const tx = new Transaction().add(
  createAssociatedTokenAccountIdempotentInstruction(wallet.publicKey, cardAta, card, USDC_MINT, TOKEN_PROGRAM_ID),
  createTransferCheckedInstruction(walletAta, USDC_MINT, cardAta, wallet.publicKey, target, USDC_DECIMALS, [], TOKEN_PROGRAM_ID)
);
const sendTx = await sendAndConfirmTransaction(connection, tx, [wallet]);
console.log(`sent:     ${fmt(target)} -> card  https://solscan.io/tx/${sendTx}`);

// 3. RECORD (public receipt trail - commit the file)
const file = path.join(process.cwd(), "data", "card-topups.json");
const log = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : [];
log.push({
  at: new Date().toISOString(),
  usd: Number(target) / 10 ** USDC_DECIMALS,
  from: wallet.publicKey.toBase58(),
  card: card.toBase58(),
  sol_spent: solSpent,
  swap_tx: swapTx,
  send_tx: sendTx,
});
fs.writeFileSync(file, JSON.stringify(log, null, 2) + "\n");
console.log(`\nlogged to data/card-topups.json - commit it. Now lend the plan's amounts on Kiva (credit team sow.fun).`);
