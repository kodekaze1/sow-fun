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
const TREASURY = new PublicKey("sowSZPr36YSZQWemGUEUvxULFyFr6fwXde61sTYHtD2");

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
if (NETWORK === "mainnet") {
  console.log("\nSet this in .env.local AND on Vercel, then redeploy:");
  console.log(`NEXT_PUBLIC_DBC_CONFIG_KEY=${configKeypair.publicKey.toBase58()}`);
} else {
  console.log(`\nDevnet config: ${configKeypair.publicKey.toBase58()} (pass as CONFIG= to devnet-rehearsal.mjs)`);
}
