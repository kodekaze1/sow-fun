// Fee-claim runner: sweeps the partner (impact vault) share of trading fees
// from every pool launched from the sow.fun config into the treasury wallet.
//
// Usage:
//   KEYPAIR=C:\path\to\treasury-keypair.json CONFIG=<config pubkey> node scripts/claim-fees.mjs
//   ...add DRY=1 to only print pending fees without claiming.
//
// Prints a receipt table (pool, SOL claimed, tx signature) - paste these
// into the wave record for the public ledger.

import fs from "node:fs";
import { Connection, Keypair, PublicKey, sendAndConfirmTransaction } from "@solana/web3.js";
import { DynamicBondingCurveClient } from "@meteora-ag/dynamic-bonding-curve-sdk";
import BN from "bn.js";

const RPC = process.env.RPC ?? "https://mainnet.helius-rpc.com/?api-key=76b314db-4dae-4060-b520-966021589251";
const KEYPAIR_PATH = process.env.KEYPAIR;
const CONFIG = process.env.CONFIG ?? process.env.NEXT_PUBLIC_DBC_CONFIG_KEY;
const DRY = !!process.env.DRY;

if (!KEYPAIR_PATH || !CONFIG) {
  console.error("Set KEYPAIR=<treasury keypair json> and CONFIG=<DBC config pubkey>");
  process.exit(1);
}

const feeClaimer = Keypair.fromSecretKey(new Uint8Array(JSON.parse(fs.readFileSync(KEYPAIR_PATH, "utf8"))));
const connection = new Connection(RPC, "confirmed");
const client = new DynamicBondingCurveClient(connection, "confirmed");

console.log(`fee claimer: ${feeClaimer.publicKey.toBase58()}`);
console.log(`config:      ${CONFIG}\n`);

const fees = await client.state.getPoolsFeesByConfig(new PublicKey(CONFIG));
if (!fees.length) {
  console.log("No pools launched from this config yet.");
  process.exit(0);
}

let totalClaimedLamports = new BN(0);
for (const f of fees) {
  const pendingSol = f.partnerQuoteFee.toNumber() / 1e9;
  console.log(`pool ${f.poolAddress.toBase58()}  pending partner fees: ${pendingSol.toFixed(6)} SOL`);
  if (DRY || f.partnerQuoteFee.isZero()) continue;

  const tx = await client.partner.claimPartnerTradingFee({
    pool: f.poolAddress,
    feeClaimer: feeClaimer.publicKey,
    payer: feeClaimer.publicKey,
    maxBaseAmount: new BN(0), // quote (SOL) only - base tokens stay untouched
    maxQuoteAmount: f.partnerQuoteFee,
  });
  const signature = await sendAndConfirmTransaction(connection, tx, [feeClaimer]);
  totalClaimedLamports = totalClaimedLamports.add(f.partnerQuoteFee);
  console.log(`  claimed -> https://solscan.io/tx/${signature}`);
}

console.log(`\ntotal claimed: ${(totalClaimedLamports.toNumber() / 1e9).toFixed(6)} SOL`);
console.log(DRY ? "(dry run - nothing claimed)" : "Record these signatures in the next harvest's movements[].");
