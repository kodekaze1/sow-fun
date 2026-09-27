// One-time admin script: creates the immutable sow.fun DBC pool config.
// Every launch on sow.fun/launch creates its pool from this config.
//
// Usage (run locally, never in CI):
//   KEYPAIR=C:\path\to\treasury-keypair.json node scripts/create-dbc-config.mjs
//
// Optional env: RPC (defaults to Helius mainnet)
//
// Prints the config public key - set it as NEXT_PUBLIC_DBC_CONFIG_KEY in
// .env.local and on Vercel, then launching goes live.

import fs from "node:fs";
import { Connection, Keypair, PublicKey, sendAndConfirmTransaction } from "@solana/web3.js";
import {
  DynamicBondingCurveClient,
  buildCurveWithMarketCap,
  ActivationType,
  BaseFeeMode,
  CollectFeeMode,
  MigrationOption,
  MigrationFeeOption,
  MigratedCollectFeeMode,
  DammV2DynamicFeeMode,
  TokenType,
  TokenDecimal,
  TokenAuthorityOption,
} from "@meteora-ag/dynamic-bonding-curve-sdk";

const RPC = process.env.RPC ?? "https://mainnet.helius-rpc.com/?api-key=76b314db-4dae-4060-b520-966021589251";
const KEYPAIR_PATH = process.env.KEYPAIR;
const NATIVE_MINT = new PublicKey("So11111111111111111111111111111111111111112");
// Treasury / impact vault - receives the partner share (55%) of all trading fees
const TREASURY = new PublicKey("uPLiftcYwzTK8vgWSwobZb6KLus3vL4DnrB4yidY1yZ");

if (!KEYPAIR_PATH) {
  console.error("Set KEYPAIR=<path to solana keypair json> (the payer; fees ~0.03 SOL)");
  process.exit(1);
}

const payer = Keypair.fromSecretKey(new Uint8Array(JSON.parse(fs.readFileSync(KEYPAIR_PATH, "utf8"))));
const configKeypair = Keypair.generate();
const connection = new Connection(RPC, "confirmed");
const client = new DynamicBondingCurveClient(connection, "confirmed");

console.log("payer:  ", payer.publicKey.toBase58());
console.log("config: ", configKeypair.publicKey.toBase58());
console.log("vault:  ", TREASURY.toBase58());

const curveConfig = buildCurveWithMarketCap({
  token: {
    tokenType: TokenType.SPLToken,
    tokenBaseDecimal: TokenDecimal.SIX,
    tokenQuoteDecimal: TokenDecimal.NINE,
    tokenAuthorityOption: TokenAuthorityOption.Immutable,
    totalTokenSupply: 1_000_000_000,
    leftover: 0,
  },
  fee: {
    baseFeeParams: {
      baseFeeMode: BaseFeeMode.FeeSchedulerLinear,
      feeSchedulerParam: {
        // Flat 2% - the user-approved tier, no decay
        startingFeeBps: 200,
        endingFeeBps: 200,
        numberOfPeriod: 0,
        totalDuration: 0,
      },
    },
    dynamicFeeEnabled: false,
    collectFeeMode: CollectFeeMode.QuoteToken,
    // Creator keeps 45% of trading fees; the remaining 55% accrues to the
    // feeClaimer (sow.fun vault) and is deployed 45 loans / 10 ops.
    creatorTradingFeePercentage: 45,
    poolCreationFee: 0,
    enableFirstSwapWithMinFee: false,
  },
  migration: {
    migrationOption: MigrationOption.MET_DAMM_V2,
    migrationFeeOption: MigrationFeeOption.Customizable,
    migrationFee: { feePercentage: 0, creatorFeePercentage: 0 },
    migratedPoolFee: {
      collectFeeMode: MigratedCollectFeeMode.QuoteToken,
      dynamicFee: DammV2DynamicFeeMode.Disabled,
      poolFeeBps: 200,
    },
  },
  liquidityDistribution: {
    // All migrated LP permanently locked, mirroring the fee split - rug-proof
    partnerPermanentLockedLiquidityPercentage: 55,
    creatorPermanentLockedLiquidityPercentage: 45,
    partnerLiquidityPercentage: 0,
    creatorLiquidityPercentage: 0,
  },
  lockedVesting: {
    totalLockedVestingAmount: 0,
    numberOfVestingPeriod: 0,
    cliffUnlockAmount: 0,
    totalVestingDuration: 0,
    cliffDurationFromMigrationTime: 0,
  },
  activationType: ActivationType.Timestamp,
  // Denominated in quote (SOL): start ~30 SOL FDV, migrate to DAMM v2 at ~400 SOL FDV
  initialMarketCap: 30,
  migrationMarketCap: 400,
});

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
console.log("\nSet this in .env.local AND on Vercel, then redeploy:");
console.log(`NEXT_PUBLIC_DBC_CONFIG_KEY=${configKeypair.publicKey.toBase58()}`);
