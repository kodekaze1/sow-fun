// Fee-claim runner: sweeps the partner (impact vault) share of trading fees
// from every pool launched from the sow.fun config into the treasury wallet.
//
// Usage:
//   KEYPAIR=C:\path\to\treasury-keypair.json CONFIG=<config pubkey> node scripts/claim-fees.mjs
//   ...add DRY=1 to only print pending fees without claiming.
//
// Prints a receipt table (pool, SOL claimed, tx signature) AND writes a
// per-pool attribution snapshot to data/claims/ - this is the public record
// of exactly which coin generated which lamports, captured at claim time.
// Commit the snapshot file; the wave record references it.

import fs from "node:fs";
import path from "node:path";
import { Connection, Keypair, PublicKey, sendAndConfirmTransaction } from "@solana/web3.js";
import { DynamicBondingCurveClient } from "@meteora-ag/dynamic-bonding-curve-sdk";
import BN from "bn.js";

const METADATA_PROGRAM = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");

function metadataPda(mint) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("metadata"), METADATA_PROGRAM.toBuffer(), mint.toBuffer()],
    METADATA_PROGRAM
  )[0];
}

function parseMetadata(data) {
  let offset = 65;
  const readStr = () => {
    const len = data.readUInt32LE(offset);
    offset += 4;
    const s = data.slice(offset, offset + len).toString("utf8").replace(/\0/g, "").trim();
    offset += len;
    return s;
  };
  return { name: readStr(), symbol: readStr(), uri: readStr() };
}

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

const configKey = new PublicKey(CONFIG);
const [fees, pools] = await Promise.all([
  client.state.getPoolsFeesByConfig(configKey),
  client.state.getPoolsByConfig(configKey),
]);
if (!fees.length) {
  console.log("No pools launched from this config yet.");
  process.exit(0);
}

// pool address -> baseMint, so every claimed lamport gets attributed to a coin
const mintByPool = new Map();
for (const p of pools) {
  const addr = (p.address ?? p.publicKey)?.toBase58();
  if (addr && p.account?.baseMint) mintByPool.set(addr, p.account.baseMint);
}

let solPriceUsd = null;
try {
  const priceRes = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd");
  solPriceUsd = (await priceRes.json())?.solana?.usd ?? null;
} catch { /* snapshot records null - fill from the swap receipt instead */ }

let totalClaimedLamports = new BN(0);
const snapshotPools = [];
for (const f of fees) {
  const poolAddr = f.poolAddress.toBase58();
  const pendingSol = f.partnerQuoteFee.toNumber() / 1e9;
  console.log(`pool ${poolAddr}  pending partner fees: ${pendingSol.toFixed(6)} SOL`);
  if (DRY || f.partnerQuoteFee.isZero()) continue;

  // Resolve the coin identity and its Kiva loan binding BEFORE claiming,
  // so the snapshot is a faithful picture of the moment of harvest.
  let name = null, symbol = null, loanId = null, mint = null;
  const baseMint = mintByPool.get(poolAddr);
  if (baseMint) {
    mint = baseMint.toBase58();
    try {
      const info = await connection.getAccountInfo(metadataPda(baseMint));
      if (info?.data) {
        const meta = parseMetadata(info.data);
        name = meta.name || null;
        symbol = meta.symbol || null;
        const loanParam = new URL(meta.uri).searchParams.get("loan");
        if (loanParam) loanId = parseInt(loanParam, 10) || null;
      }
    } catch { /* metadata unreadable - snapshot still records the mint */ }
  }

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

  snapshotPools.push({
    pool: poolAddr,
    mint,
    name,
    symbol,
    kiva_loan_id: loanId,
    claimed_lamports: f.partnerQuoteFee.toString(),
    claimed_sol: pendingSol,
    tx: signature,
    explorer_url: `https://solscan.io/tx/${signature}`,
  });
}

console.log(`\ntotal claimed: ${(totalClaimedLamports.toNumber() / 1e9).toFixed(6)} SOL`);

if (DRY) {
  console.log("(dry run - nothing claimed, no snapshot written)");
} else if (snapshotPools.length) {
  const claimedAt = new Date().toISOString();
  const snapshot = {
    claimed_at: claimedAt,
    config: CONFIG,
    treasury: feeClaimer.publicKey.toBase58(),
    sol_price_usd: solPriceUsd,
    total_claimed_lamports: totalClaimedLamports.toString(),
    total_claimed_sol: totalClaimedLamports.toNumber() / 1e9,
    pools: snapshotPools,
  };
  const dir = path.join(process.cwd(), "data", "claims");
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `claim-${claimedAt.replace(/[:.]/g, "-")}.json`);
  fs.writeFileSync(file, JSON.stringify(snapshot, null, 2) + "\n");
  console.log(`snapshot written: ${file}`);
  console.log("Commit this file - it is the public per-coin attribution record for this harvest.");
} else {
  console.log("Nothing was pending - no snapshot written.");
}
