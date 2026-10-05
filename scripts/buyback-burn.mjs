// Buyback + burn runner: market-buys $SOW with SOL via Jupiter, sends the
// burn share into The Furnace (programs/furnace) and stokes it in the same
// transaction, so the burn is executed by the furnace program on-chain with a
// permanent BurnReceipt. Optionally carves out a creator reward share.
//
// Usage:
//   KEYPAIR=<treasury keypair json> MINT=<$SOW mint> AMOUNT_SOL=0.5 node scripts/buyback-burn.mjs
//
// Env:
//   KEYPAIR          payer + buyer wallet (required)
//   MINT             $SOW mint (required)
//   AMOUNT_SOL       SOL to spend on the buy (required)
//   FURNACE_PROGRAM  furnace program id (default: the sow_furnace id in scripts/lib/furnace.mjs)
//   NETWORK / RPC / HELIUS_API_KEY   see scripts/lib/rpc.mjs (NETWORK=devnet for rehearsals)
//   SLIPPAGE_BPS     default 100
//   WAVE             harvest/wave id, written into the on-chain memo ("harvest:<WAVE>")
//   MEMO             override the on-chain memo (max 64 bytes)
//   DRY=1            quote only, send nothing
//   SKIP_SWAP=1      skip the Jupiter buy and burn SOW_AMOUNT (raw base units) already in the
//                    payer's wallet - used on devnet, where Jupiter has no routes
//   SOW_AMOUNT       raw amount for SKIP_SWAP mode
//
// Creator reward (OPERATIONS.md "Creator rewards"): set REWARD_WALLET to the coin's
// pool creator. REWARD_PCT (default 50 when REWARD_WALLET is set) of the bought $SOW
// is kept for that creator; the rest is burned. By default the reward stays in the
// treasury as "accruing" until the borrower is verified funded. PAYOUT=1 sends it now
// and records it as "paid". Reward rows also need COIN_MINT, COIN_SYMBOL, LOAN_ID, BORROWER.
//
// Writes: data/burns.json (every burn) and data/rewards.json (reward runs, CreatorReward shape).

import fs from "node:fs";
import path from "node:path";
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  VersionedTransaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  TOKEN_2022_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferCheckedInstruction,
  getAssociatedTokenAddressSync,
  getMint,
} from "@solana/spl-token";
import { NETWORK, resolveRpc, rpcLabel } from "./lib/rpc.mjs";
import {
  FURNACE_PROGRAM_ID,
  MAX_MEMO_LEN,
  deriveFurnace,
  deriveReceipt,
  deriveVault,
  fetchFurnace,
  initializeIx,
  stokeIx,
} from "./lib/furnace.mjs";

const SOL_MINT = "So11111111111111111111111111111111111111112";
const JUP_API = process.env.JUP_API ?? "https://lite-api.jup.ag/swap/v1";

const env = process.env;
const DRY = !!env.DRY;
const SKIP_SWAP = !!env.SKIP_SWAP;
const PAYOUT = !!env.PAYOUT;
const SLIPPAGE_BPS = Number(env.SLIPPAGE_BPS ?? 100);

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

if (!env.KEYPAIR || !env.MINT) fail("Required env: KEYPAIR, MINT, and AMOUNT_SOL (or SKIP_SWAP=1 + SOW_AMOUNT).");
if (!SKIP_SWAP && !(Number(env.AMOUNT_SOL) > 0)) fail("AMOUNT_SOL must be a positive number.");
if (SKIP_SWAP && !(BigInt(env.SOW_AMOUNT ?? "0") > 0n)) fail("SKIP_SWAP=1 needs SOW_AMOUNT (raw base units) > 0.");
if (!SKIP_SWAP && NETWORK === "devnet") fail("Jupiter has no devnet routes - use SKIP_SWAP=1 SOW_AMOUNT=<raw> on devnet.");

const payer = Keypair.fromSecretKey(new Uint8Array(JSON.parse(fs.readFileSync(env.KEYPAIR, "utf8"))));
const mint = new PublicKey(env.MINT);
const programId = env.FURNACE_PROGRAM ? new PublicKey(env.FURNACE_PROGRAM) : FURNACE_PROGRAM_ID;
const rewardWallet = env.REWARD_WALLET ? new PublicKey(env.REWARD_WALLET) : null;
const rewardPct = rewardWallet ? Number(env.REWARD_PCT ?? 50) : 0;
if (!(rewardPct >= 0 && rewardPct < 100)) fail("REWARD_PCT must be in [0, 100).");
if (rewardWallet && !(env.COIN_MINT && env.LOAN_ID && env.BORROWER)) {
  fail("Reward runs need COIN_MINT, LOAN_ID and BORROWER (plus COIN_SYMBOL) for the rewards.json row.");
}

const memo = env.MEMO ?? (env.WAVE ? `harvest:${env.WAVE}` : "buyback");
if (Buffer.byteLength(memo, "utf8") > MAX_MEMO_LEN) fail(`MEMO exceeds ${MAX_MEMO_LEN} bytes.`);

const rpc = resolveRpc();
const connection = new Connection(rpc, "confirmed");

const mintInfo = await connection.getAccountInfo(mint);
if (!mintInfo) fail(`Mint ${mint.toBase58()} not found on ${NETWORK}.`);
const tokenProgram = mintInfo.owner.equals(TOKEN_2022_PROGRAM_ID) ? TOKEN_2022_PROGRAM_ID : mintInfo.owner;
const { decimals } = await getMint(connection, mint, "confirmed", tokenProgram);
const ui = (raw) => (Number(raw) / 10 ** decimals).toLocaleString(undefined, { maximumFractionDigits: decimals });

const furnace = deriveFurnace(mint, programId);
const vault = deriveVault(furnace, mint, tokenProgram);
const payerAta = getAssociatedTokenAddressSync(mint, payer.publicKey, false, tokenProgram);

console.log(`network:  ${NETWORK} (${rpcLabel(rpc)})`);
console.log(`payer:    ${payer.publicKey.toBase58()}`);
console.log(`mint:     ${mint.toBase58()} (${decimals} decimals)`);
console.log(`furnace:  ${furnace.toBase58()}  program ${programId.toBase58()}`);
console.log(`vault:    ${vault.toBase58()}`);
if (rewardWallet) console.log(`reward:   ${rewardPct}% -> ${rewardWallet.toBase58()} (${PAYOUT ? "pay now" : "accrue"})`);
console.log(`memo:     "${memo}"\n`);

async function tokenBalance(ata) {
  try {
    return BigInt((await connection.getTokenAccountBalance(ata, "confirmed")).value.amount);
  } catch {
    return 0n;
  }
}

// 1. BUY
let bought;
let buyTx = "";
if (SKIP_SWAP) {
  bought = BigInt(env.SOW_AMOUNT);
  const have = await tokenBalance(payerAta);
  if (have < bought) fail(`Payer holds ${ui(have)} $SOW, SOW_AMOUNT needs ${ui(bought)}.`);
  console.log(`skip swap: burning ${ui(bought)} $SOW already in the payer wallet`);
} else {
  const lamports = BigInt(Math.round(Number(env.AMOUNT_SOL) * 1e9));
  const q = new URLSearchParams({
    inputMint: SOL_MINT,
    outputMint: mint.toBase58(),
    amount: lamports.toString(),
    slippageBps: String(SLIPPAGE_BPS),
  });
  const quoteRes = await fetch(`${JUP_API}/quote?${q}`);
  if (!quoteRes.ok) fail(`Jupiter quote failed: ${quoteRes.status} ${await quoteRes.text()}`);
  const quote = await quoteRes.json();
  const route = (quote.routePlan ?? []).map((r) => r.swapInfo?.label).filter(Boolean).join(" > ");
  console.log(`quote:    ${env.AMOUNT_SOL} SOL -> ~${ui(quote.outAmount)} $SOW (min ${ui(quote.otherAmountThreshold)})`);
  console.log(`route:    ${route || "n/a"}  impact ${(Number(quote.priceImpactPct) * 100).toFixed(3)}%`);

  if (DRY) {
    const burnShare = (BigInt(quote.outAmount) * BigInt(100 - rewardPct)) / 100n;
    console.log(`\nDRY run - would burn ~${ui(burnShare)} $SOW and keep ~${ui(BigInt(quote.outAmount) - burnShare)} for rewards.`);
    process.exit(0);
  }

  const before = await tokenBalance(payerAta);
  const swapRes = await fetch(`${JUP_API}/swap`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      quoteResponse: quote,
      userPublicKey: payer.publicKey.toBase58(),
      wrapAndUnwrapSol: true,
      dynamicComputeUnitLimit: true,
      prioritizationFeeLamports: { priorityLevelWithMaxLamports: { maxLamports: 1_000_000, priorityLevel: "high" } },
    }),
  });
  if (!swapRes.ok) fail(`Jupiter swap build failed: ${swapRes.status} ${await swapRes.text()}`);
  const { swapTransaction, lastValidBlockHeight } = await swapRes.json();
  const vtx = VersionedTransaction.deserialize(Buffer.from(swapTransaction, "base64"));
  vtx.sign([payer]);
  buyTx = await connection.sendRawTransaction(vtx.serialize(), { maxRetries: 3 });
  const conf = await connection.confirmTransaction(
    { signature: buyTx, blockhash: vtx.message.recentBlockhash, lastValidBlockHeight },
    "confirmed"
  );
  if (conf.value.err) fail(`Buy failed: ${JSON.stringify(conf.value.err)}  tx ${buyTx}`);
  bought = (await tokenBalance(payerAta)) - before;
  if (bought <= 0n) fail(`Buy confirmed but no $SOW arrived (tx ${buyTx}).`);
  console.log(`bought:   ${ui(bought)} $SOW  tx ${buyTx}`);
}

if (DRY) {
  console.log(`\nDRY run - would burn ${ui((bought * BigInt(100 - rewardPct)) / 100n)} $SOW.`);
  process.exit(0);
}

// 2. SPLIT + BURN (one transaction: fund the vault, optionally pay the creator, stoke)
const rewardAmt = (bought * BigInt(rewardPct)) / 100n;
const burnAmt = bought - rewardAmt;

const tx = new Transaction();
let state = await fetchFurnace(connection, mint, programId);
if (!state) {
  console.log("furnace not lit for this mint yet - initializing (payer becomes the recorded authority)");
  tx.add(initializeIx({ authority: payer.publicKey, mint, tokenProgram, programId }));
}
const burnIndex = state ? state.burnCount : 0n;

tx.add(createTransferCheckedInstruction(payerAta, mint, vault, payer.publicKey, burnAmt, decimals, [], tokenProgram));
let payoutTx = "";
if (rewardWallet && PAYOUT && rewardAmt > 0n) {
  const rewardAta = getAssociatedTokenAddressSync(mint, rewardWallet, true, tokenProgram);
  tx.add(createAssociatedTokenAccountIdempotentInstruction(payer.publicKey, rewardAta, rewardWallet, mint, tokenProgram));
  tx.add(createTransferCheckedInstruction(payerAta, mint, rewardAta, payer.publicKey, rewardAmt, decimals, [], tokenProgram));
}
tx.add(stokeIx({ caller: payer.publicKey, mint, burnCount: burnIndex, memo, tokenProgram, programId }));

const burnTx = await sendAndConfirmTransaction(connection, tx, [payer], { commitment: "confirmed" });
if (rewardWallet && PAYOUT && rewardAmt > 0n) payoutTx = burnTx;

state = await fetchFurnace(connection, mint, programId);
const receipt = deriveReceipt(furnace, burnIndex, programId);

// 3. LEDGER
const date = new Date().toISOString();
const dataDir = path.resolve(process.cwd(), "data");
function appendJson(file, entry) {
  const p = path.join(dataDir, file);
  const rows = fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : [];
  rows.push(entry);
  fs.writeFileSync(p, JSON.stringify(rows, null, 2) + "\n");
  return p;
}

const written = [];
if (NETWORK === "mainnet") {
  written.push(
    appendJson("burns.json", {
      date,
      sow_mint: mint.toBase58(),
      coin_mint: env.COIN_MINT ?? null, // whose excess paid for this skim
      sol_spent: SKIP_SWAP ? 0 : Number(env.AMOUNT_SOL),
      sow_bought: Number(bought) / 10 ** decimals,
      sow_burned: Number(burnAmt) / 10 ** decimals,
      buy_tx: buyTx,
      burn_tx: burnTx,
      receipt: receipt.toBase58(),
      receipt_index: Number(burnIndex),
      memo,
      harvest: env.WAVE ?? "",
    })
  );
  if (rewardWallet) {
    written.push(
      appendJson("rewards.json", {
        mint: env.COIN_MINT,
        symbol: env.COIN_SYMBOL ?? "",
        creator: rewardWallet.toBase58(),
        borrower_loan_id: Number(env.LOAN_ID),
        borrower: env.BORROWER,
        sow_amount: Number(rewardAmt) / 10 ** decimals,
        buy_tx: buyTx,
        burn_tx: burnTx,
        payout_tx: payoutTx,
        harvest: env.WAVE ?? "",
        date,
        status: payoutTx ? "paid" : "accruing",
      })
    );
  }
}

const explorer = (sig) => `https://solscan.io/tx/${sig}${NETWORK === "devnet" ? "?cluster=devnet" : ""}`;
console.log("\n=== RECEIPT ===");
console.table([
  { step: "buy", amount: SKIP_SWAP ? "-" : `${env.AMOUNT_SOL} SOL -> ${ui(bought)} $SOW`, tx: buyTx || "(skipped)" },
  { step: "burn", amount: `${ui(burnAmt)} $SOW`, tx: burnTx },
  ...(rewardWallet ? [{ step: PAYOUT ? "payout" : "reward (accruing)", amount: `${ui(rewardAmt)} $SOW`, tx: payoutTx || "(held in treasury)" }] : []),
]);
console.log(`burn tx:        ${explorer(burnTx)}`);
console.log(`burn receipt:   #${burnIndex} ${receipt.toBase58()}`);
console.log(`furnace total:  ${ui(state.totalBurned)} $SOW across ${state.burnCount} burns`);
if (written.length) console.log(`ledger updated: ${written.map((p) => path.relative(process.cwd(), p)).join(", ")} - commit with the harvest`);
else console.log("ledger not written (devnet run)");
