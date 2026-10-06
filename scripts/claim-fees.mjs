// Fee-claim runner: sweeps everything the treasury is owed from pools launched
// from the sow.fun config, into the treasury wallet:
//   - partner (impact vault) share of bonding-curve fees     source "dbc_partner"
//   - the treasury's locked DAMM v2 LP position fees          source "damm_v2_locked_lp"
//   - launch fees (anti-bot, never loan money)                launch_fees[]
//   - with CREATOR=1: $SOW's own creator share, for coins the signing wallet
//     launched (curve creator fees + the creator LP position)  source "genesis_vault"
//     Genesis Vault money is never counted as loan money by the ledger.
//
// Usage (mainnet: Impact Treasury sowSaeM... claims, Genesis wallet sowMw8eT... launched $SOW):
//   KEYPAIR=<impact treasury json> CONFIG=<config pubkey> node scripts/claim-fees.mjs
//   KEYPAIR=<genesis wallet json> CONFIG=<config pubkey> CREATOR=1 node scripts/claim-fees.mjs
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
import { resolveRpc } from "./lib/rpc.mjs";
import { getOwnerPositions, buildClaimPositionFeeTx, unclaimedSolLamports } from "../lib/damm-v2.mjs";
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

const RPC = resolveRpc();

// Kiva loan id from a coin's metadata URI: current coins use sow.fun/m/<mint>
// (fetch the JSON and read the "Kiva Loan" attribute); older ones put
// ?loan=<id> in the URI itself.
async function loanIdFromUri(uri) {
  try {
    const u = new URL(uri);
    if (/^\/m\/[1-9A-HJ-NP-Za-km-z]{32,44}\/?$/.test(u.pathname)) {
      const json = await (await fetch(uri)).json();
      const attr = (json.attributes ?? []).find((a) => a.trait_type === "Kiva Loan");
      return attr ? parseInt(attr.value, 10) || null : null;
    }
    const loanParam = u.searchParams.get("loan");
    return loanParam ? parseInt(loanParam, 10) || null : null;
  } catch {
    return null;
  }
}
const KEYPAIR_PATH = process.env.KEYPAIR;
const CONFIG = process.env.CONFIG ?? process.env.NEXT_PUBLIC_DBC_CONFIG_KEY;
const DRY = !!process.env.DRY;
const CREATOR = !!process.env.CREATOR;

if (!KEYPAIR_PATH || !CONFIG) {
  console.error("Set KEYPAIR=<treasury keypair json> and CONFIG=<DBC config pubkey>");
  process.exit(1);
}

const wallet = Keypair.fromSecretKey(new Uint8Array(JSON.parse(fs.readFileSync(KEYPAIR_PATH, "utf8"))));
const connection = new Connection(RPC, "confirmed");
const client = new DynamicBondingCurveClient(connection, "confirmed");

const configKey = new PublicKey(CONFIG);

// Two wallets claim, each only what is theirs:
//   - the config's fee claimer (Impact Treasury): partner fees, its locked LP,
//     launch fees - loan and ops money
//   - with CREATOR=1, the Genesis wallet that launched $SOW: $SOW's creator
//     fees and creator LP - Genesis Vault money, never loan money
// (On the pilot config one test wallet is both, so it can do both.)
const configFeeClaimer = (await client.state.getPoolConfig(configKey)).feeClaimer.toBase58();
const isPartner = wallet.publicKey.toBase58() === configFeeClaimer;
if (!isPartner && !CREATOR) {
  console.error(`KEYPAIR ${wallet.publicKey.toBase58()} is not this config's fee claimer (${configFeeClaimer}).`);
  console.error("Use the Impact Treasury keypair - or CREATOR=1 with the Genesis wallet for $SOW's creator fees.");
  process.exit(1);
}
console.log(`wallet:  ${wallet.publicKey.toBase58()} (${isPartner ? "fee claimer" : "creator"}${CREATOR ? " + creator fees" : ""})`);
console.log(`config:  ${CONFIG}\n`);
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
const creatorByPool = new Map(); // pool address -> creator wallet
for (const p of pools) {
  const addr = (p.address ?? p.publicKey)?.toBase58();
  // SDK 1.5 nests pool fields under poolState; older versions were flat
  const baseMint = p.account?.baseMint ?? p.account?.poolState?.baseMint;
  if (addr && baseMint) mintByPool.set(addr, baseMint);
  const creator = p.account?.creator ?? p.account?.poolState?.creator;
  if (addr && creator) creatorByPool.set(addr, creator.toBase58());
}
// Coins the treasury launched itself ($SOW): it is both partner AND creator
const treasuryLaunched = (poolAddr) => creatorByPool.get(poolAddr) === wallet.publicKey.toBase58();

let solPriceUsd = null;
try {
  const priceRes = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd");
  solPriceUsd = (await priceRes.json())?.solana?.usd ?? null;
} catch { /* snapshot records null - fill from the swap receipt instead */ }

let totalClaimedLamports = new BN(0);
const snapshotPools = [];
for (const f of isPartner ? fees : []) {
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
        loanId = await loanIdFromUri(meta.uri);
      }
    } catch { /* metadata unreadable - snapshot still records the mint */ }
  }

  const tx = await client.partner.claimPartnerTradingFee({
    pool: f.poolAddress,
    feeClaimer: wallet.publicKey,
    payer: wallet.publicKey,
    maxBaseAmount: new BN(0), // quote (SOL) only - base tokens stay untouched
    maxQuoteAmount: f.partnerQuoteFee,
  });
  const signature = await sendAndConfirmTransaction(connection, tx, [wallet]);
  totalClaimedLamports = totalClaimedLamports.add(f.partnerQuoteFee);
  console.log(`  claimed -> https://solscan.io/tx/${signature}`);

  snapshotPools.push({
    source: "dbc_partner",
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

// --- Genesis Vault, bonding curve: creator fees on coins the treasury launched.
if (CREATOR) {
  for (const f of fees) {
    const poolAddr = f.poolAddress.toBase58();
    if (!treasuryLaunched(poolAddr) || f.creatorQuoteFee.isZero()) continue;
    const sol = f.creatorQuoteFee.toNumber() / 1e9;
    console.log(`genesis vault ${poolAddr}  pending creator fees: ${sol.toFixed(6)} SOL`);
    if (DRY) continue;
    const tx = await client.creator.claimCreatorTradingFee({
      creator: wallet.publicKey,
      payer: wallet.publicKey,
      pool: f.poolAddress,
      maxBaseAmount: new BN(0),
      maxQuoteAmount: f.creatorQuoteFee,
    });
    const signature = await sendAndConfirmTransaction(connection, tx, [wallet]);
    totalClaimedLamports = totalClaimedLamports.add(f.creatorQuoteFee);
    console.log(`  claimed -> https://solscan.io/tx/${signature}`);
    snapshotPools.push({
      source: "genesis_vault",
      pool: poolAddr,
      mint: mintByPool.get(poolAddr)?.toBase58() ?? null,
      claimed_lamports: f.creatorQuoteFee.toString(),
      claimed_sol: sol,
      tx: signature,
      explorer_url: `https://solscan.io/tx/${signature}`,
    });
  }
}

// --- Post-migration: the treasury's permanently locked DAMM v2 LP positions.
// Graduated coins stop accruing DBC fees; their trading fees accrue to the
// locked positions instead (55% treasury / 45% creator by liquidity).
const coinMints = new Map(); // base mint -> DBC pool address
for (const [poolAddr, mint] of mintByPool) coinMints.set(mint.toBase58(), poolAddr);
const positions = (await getOwnerPositions(connection, wallet.publicKey)).filter(
  (p) => coinMints.has(p.pool.tokenAMint.toBase58()) || coinMints.has(p.pool.tokenBMint.toBase58())
);
// On coins the treasury launched it holds BOTH positions: the larger (55%)
// is the partner/loan position, the smaller (45%) is the creator position,
// which belongs to the Genesis Vault and is only claimed with CREATOR=1.
const creatorPositions = new Set();
const byPool = new Map();
for (const p of positions) {
  const k = p.poolAddress.toBase58();
  byPool.set(k, [...(byPool.get(k) ?? []), p]);
}
for (const group of byPool.values()) {
  const mint = coinMints.has(group[0].pool.tokenAMint.toBase58()) ? group[0].pool.tokenAMint : group[0].pool.tokenBMint;
  if (group.length < 2 || !treasuryLaunched(coinMints.get(mint.toBase58()))) continue;
  const sorted = [...group].sort((a, b) => b.position.permanentLockedLiquidity.cmp(a.position.permanentLockedLiquidity));
  for (const p of sorted.slice(1)) creatorPositions.add(p.positionAddress.toBase58());
}

for (const p of positions) {
  // A non-claimer wallet only ever holds creator positions (Genesis Vault)
  const isGenesis = !isPartner || creatorPositions.has(p.positionAddress.toBase58());
  if (isGenesis && !CREATOR) {
    console.log(`damm v2 ${p.poolAddress.toBase58()}  creator LP position skipped (Genesis Vault - run with CREATOR=1)`);
    continue;
  }
  const lamports = unclaimedSolLamports(p);
  const sol = lamports.toNumber() / 1e9;
  const mint = coinMints.has(p.pool.tokenAMint.toBase58()) ? p.pool.tokenAMint : p.pool.tokenBMint;
  console.log(`damm v2 ${p.poolAddress.toBase58()}  pending LP fees: ${sol.toFixed(6)} SOL`);
  if (DRY || lamports.isZero()) continue;
  let name = null, symbol = null, loanId = null;
  try {
    const info = await connection.getAccountInfo(metadataPda(mint));
    if (info?.data) {
      const meta = parseMetadata(info.data);
      name = meta.name || null;
      symbol = meta.symbol || null;
      loanId = await loanIdFromUri(meta.uri);
    }
  } catch { /* metadata unreadable - snapshot still records the mint */ }
  const tx = await buildClaimPositionFeeTx(connection, wallet.publicKey, p);
  const signature = await sendAndConfirmTransaction(connection, tx, [wallet]);
  totalClaimedLamports = totalClaimedLamports.add(lamports);
  console.log(`  claimed -> https://solscan.io/tx/${signature}`);
  snapshotPools.push({
    source: isGenesis ? "genesis_vault" : "damm_v2_locked_lp",
    pool: p.poolAddress.toBase58(),
    dbc_pool: coinMints.get(mint.toBase58()),
    mint: mint.toBase58(),
    name,
    symbol,
    kiva_loan_id: loanId,
    claimed_lamports: lamports.toString(),
    claimed_sol: sol,
    tx: signature,
    explorer_url: `https://solscan.io/tx/${signature}`,
  });
}

// --- Launch fees: the on-chain anti-bot fee each launcher paid at pool
// creation (treasury share). Not trading revenue, so it is recorded
// separately and never attributed to a coin's loan pledge.
const launchFees = [];
for (const p of isPartner ? pools : []) {
  const poolKey = p.publicKey ?? p.address;
  if (!poolKey) continue;
  try {
    const tx = await client.partner.claimPartnerPoolCreationFee({ pool: poolKey, feeReceiver: wallet.publicKey });
    tx.feePayer = wallet.publicKey;
    tx.recentBlockhash = (await connection.getLatestBlockhash("confirmed")).blockhash;
    const sim = await connection.simulateTransaction(tx, [wallet]);
    if (sim.value.err) continue; // already claimed, or no launch fee on this config
    if (DRY) {
      console.log(`launch fee claimable on ${poolKey.toBase58()}`);
      continue;
    }
    const before = await connection.getBalance(wallet.publicKey);
    const signature = await sendAndConfirmTransaction(connection, tx, [wallet]);
    const after = await connection.getBalance(wallet.publicKey);
    launchFees.push({ pool: poolKey.toBase58(), net_lamports: after - before, tx: signature });
    console.log(`launch fee ${poolKey.toBase58()} -> https://solscan.io/tx/${signature}`);
  } catch { /* pool not eligible */ }
}

console.log(`\ntotal claimed: ${(totalClaimedLamports.toNumber() / 1e9).toFixed(6)} SOL`);

if (DRY) {
  console.log("(dry run - nothing claimed, no snapshot written)");
} else if (snapshotPools.length || launchFees.length) {
  const claimedAt = new Date().toISOString();
  const snapshot = {
    claimed_at: claimedAt,
    config: CONFIG,
    treasury: wallet.publicKey.toBase58(),
    sol_price_usd: solPriceUsd,
    total_claimed_lamports: totalClaimedLamports.toString(),
    total_claimed_sol: totalClaimedLamports.toNumber() / 1e9,
    pools: snapshotPools,
    launch_fees: launchFees,
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
