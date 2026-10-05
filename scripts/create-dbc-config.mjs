// One-time admin script: creates the immutable sow.fun DBC pool config.
// Every launch on sow.fun/launch creates its pool from this config.
// The economics live in scripts/lib/sow-config.mjs - review them there.
//
// Usage (run locally from the repo root, never in CI):
//   node scripts/create-dbc-config.mjs                      # dry run: prints the economics, sends nothing
//   KEYPAIR=C:\path\to\treasury.json CONFIRM=1 node scripts/create-dbc-config.mjs
//
// Optional env: NETWORK=devnet, RPC (full URL), HELIUS_API_KEY (read from
// .env.local if unset), MIGRATION_SOL (devnet only - shrink graduation for tests).
//
// Prints the config public key - set it as NEXT_PUBLIC_DBC_CONFIG_KEY in
// .env.local and on Vercel, then launching goes live.

import fs from "node:fs";
import { Connection, Keypair, PublicKey, sendAndConfirmTransaction } from "@solana/web3.js";
import { DynamicBondingCurveClient } from "@meteora-ag/dynamic-bonding-curve-sdk";
import { resolveRpc, rpcLabel, NETWORK } from "./lib/rpc.mjs";
import { buildSowCurve, describeCurve, ECONOMICS } from "./lib/sow-config.mjs";

const NATIVE_MINT = new PublicKey("So11111111111111111111111111111111111111112");
// Treasury / impact vault - feeClaimer for the partner share of trading fees,
// the launch fee, and the partner's locked LP position after migration.
// Mainnet uses the launch treasury. PILOT=1 creates a mainnet PILOT config
// whose fees go to the test treasury instead (same economics) - for testing
// the full loop with real SOL and Kiva. Never put a pilot config on sow.fun.
// TREASURY=<pubkey> overrides are devnet-only.
const LAUNCH_TREASURY = "sowMw8eTZE5NryyyTmpCoBfcW8oYsSZtqoanRMTybAj";
const TEST_TREASURY = "sowSZPr36YSZQWemGUEUvxULFyFr6fwXde61sTYHtD2";
const PILOT = !!process.env.PILOT;
if (process.env.TREASURY && NETWORK !== "devnet") {
  console.error("TREASURY overrides are devnet-only - use PILOT=1 for a mainnet test config");
  process.exit(1);
}
const TREASURY = new PublicKey(process.env.TREASURY ?? (PILOT ? TEST_TREASURY : LAUNCH_TREASURY));
if (PILOT) {
  console.log("\n*** PILOT CONFIG - fees go to the TEST treasury " + TEST_TREASURY + " ***");
  console.log("*** Use it on localhost only. Do NOT set it as NEXT_PUBLIC_DBC_CONFIG_KEY on Vercel. ***\n");
}

let migrationQuoteSol = ECONOMICS.migrationQuoteSol;
if (process.env.MIGRATION_SOL) {
  if (NETWORK !== "devnet") {
    console.error("MIGRATION_SOL overrides are devnet-only - mainnet always uses scripts/lib/sow-config.mjs");
    process.exit(1);
  }
  migrationQuoteSol = Number(process.env.MIGRATION_SOL);
}

const curveConfig = buildSowCurve({ migrationQuoteSol });
console.log(`network: ${NETWORK} (${rpcLabel(resolveRpc())})\n`);
console.log(describeCurve(curveConfig));

if (!process.env.CONFIRM) {
  console.log("\nDry run only. Re-run with KEYPAIR=<treasury json> CONFIRM=1 to create the config (immutable).");
  process.exit(0);
}

const KEYPAIR_PATH = process.env.KEYPAIR;
if (!KEYPAIR_PATH) {
  console.error("Set KEYPAIR=<path to solana keypair json> (the payer; ~0.03 SOL)");
  process.exit(1);
}

const payer = Keypair.fromSecretKey(new Uint8Array(JSON.parse(fs.readFileSync(KEYPAIR_PATH, "utf8"))));
const configKeypair = Keypair.generate();
const connection = new Connection(resolveRpc(), "confirmed");
const client = new DynamicBondingCurveClient(connection, "confirmed");

console.log("\npayer:  ", payer.publicKey.toBase58());
console.log("config: ", configKeypair.publicKey.toBase58());
console.log("vault:  ", TREASURY.toBase58());

const tx = await client.partner.createConfig({
  payer: payer.publicKey,
  config: configKeypair.publicKey,
  feeClaimer: TREASURY,
  leftoverReceiver: TREASURY,
  quoteMint: NATIVE_MINT,
  ...curveConfig,
});

const signature = await sendAndConfirmTransaction(connection, tx, [payer, configKeypair]);
console.log("\nconfig created!");
console.log("signature:", signature);
if (NETWORK === "mainnet" && PILOT) {
  console.log(`\nPilot config: ${configKeypair.publicKey.toBase58()}`);
  console.log("Run the site locally against it - never on Vercel:");
  console.log(`  NEXT_PUBLIC_DBC_CONFIG_KEY=${configKeypair.publicKey.toBase58()} npm run dev`);
  console.log(`Claim its fees with KEYPAIR=<test treasury> CONFIG=${configKeypair.publicKey.toBase58()} node scripts/claim-fees.mjs`);
} else if (NETWORK === "mainnet") {
  console.log("\nSet this in .env.local AND on Vercel, then redeploy:");
  console.log(`NEXT_PUBLIC_DBC_CONFIG_KEY=${configKeypair.publicKey.toBase58()}`);
} else {
  console.log(`\nDevnet config: ${configKeypair.publicKey.toBase58()} (pass as CONFIG= to devnet-rehearsal.mjs)`);
}
