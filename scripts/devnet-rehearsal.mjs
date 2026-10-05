// Devnet rehearsal: runs a coin through its whole life on devnet with the
// exact sow.fun economics (scripts/lib/sow-config.mjs), except a tiny
// graduation threshold so devnet SOL is enough to reach migration.
//
//   1. create a rehearsal DBC config (treasury = feeClaimer)
//   2. a separate creator wallet launches a coin with an atomic first buy
//      (pays the on-chain launch fee)
//   3. trades on the bonding curve generate fees
//   4. pre-migration claims: treasury (partner), creator, launch fee
//   5. buy out the curve -> migrate to DAMM v2 (permissionless on devnet;
//      Meteora's keeper does this on mainnet)
//   6. trades on the DAMM v2 pool generate post-migration fees
//   7. post-migration claims for BOTH locked LP positions via lib/damm-v2.mjs
//
// Every step logs balances and signatures, and the run is written to
// .devnet/rehearsal-<timestamp>.json (gitignored).
//
// Usage (repo root; treasury keypair funded with ~3 devnet SOL):
//   KEYPAIR=C:\path\to\treasury.json node scripts/devnet-rehearsal.mjs
// Optional: MIGRATION_SOL (default 1), CONFIG (reuse an existing devnet
// config and skip step 1).

import fs from "node:fs";
import path from "node:path";
import BN from "bn.js";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  DynamicBondingCurveClient,
  DAMM_V2_MIGRATION_FEE_ADDRESS,
  MigrationFeeOption,
  SwapMode,
  createDammV2Program,
  deriveDammV2PoolAddress,
  deriveDammV2EventAuthority,
  DAMM_V2_PROGRAM_ID,
} from "@meteora-ag/dynamic-bonding-curve-sdk";
import { resolveRpc, rpcLabel, assertDevnet } from "./lib/rpc.mjs";
import { buildSowCurve, describeCurve } from "./lib/sow-config.mjs";
import {
  getOwnerPositions,
  buildClaimPositionFeeTx,
  unclaimedSolLamports,
  ata,
  NATIVE_MINT,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "../lib/damm-v2.mjs";

if (process.env.RPC) {
  console.error("Unset RPC - the rehearsal always builds its own devnet endpoint.");
  process.exit(1);
}
const RPC = resolveRpc("devnet");
const MIGRATION_SOL = Number(process.env.MIGRATION_SOL ?? 1);
const OUT_DIR = path.join(process.cwd(), ".devnet");
fs.mkdirSync(OUT_DIR, { recursive: true });

if (!process.env.KEYPAIR) {
  console.error("Set KEYPAIR=<treasury keypair json> (funded with ~3 devnet SOL)");
  process.exit(1);
}
const load = (p) => Keypair.fromSecretKey(new Uint8Array(JSON.parse(fs.readFileSync(p, "utf8"))));
const treasury = load(process.env.KEYPAIR);

// Separate creator wallet, persisted so re-runs reuse it
const creatorPath = path.join(OUT_DIR, "creator.json");
if (!fs.existsSync(creatorPath)) fs.writeFileSync(creatorPath, JSON.stringify([...Keypair.generate().secretKey]));
const creator = load(creatorPath);

const connection = new Connection(RPC, "confirmed");
const client = new DynamicBondingCurveClient(connection, "confirmed");
const damm = createDammV2Program(connection);
const log = { started_at: new Date().toISOString(), rpc: rpcLabel(RPC), migration_sol: MIGRATION_SOL, steps: [] };

const sol = (lamports) => Number(lamports) / LAMPORTS_PER_SOL;
const bal = async (pk) => sol(await connection.getBalance(pk));
async function step(name, fn) {
  process.stdout.write(`\n== ${name}\n`);
  const t0 = Date.now();
  try {
    const result = (await fn()) ?? {};
    log.steps.push({ name, ok: true, ms: Date.now() - t0, ...result });
    for (const [k, v] of Object.entries(result)) console.log(`   ${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`);
    return result;
  } catch (e) {
    const err = e?.logs ? `${e.message}\n${e.logs.slice(-6).join("\n")}` : e?.message ?? String(e);
    log.steps.push({ name, ok: false, ms: Date.now() - t0, error: err });
    console.error(`   FAILED: ${err}`);
    save();
    process.exit(1);
  }
}
function save() {
  const file = path.join(OUT_DIR, `rehearsal-${log.started_at.replace(/[:.]/g, "-")}.json`);
  fs.writeFileSync(file, JSON.stringify(log, null, 2) + "\n");
  console.log(`\nlog: ${file}`);
}
const send = (tx, signers) => sendAndConfirmTransaction(connection, tx, signers, { commitment: "confirmed" });
const field = (acct, name) => acct?.[name] ?? acct?.poolState?.[name];

// ---------------------------------------------------------------------------

await step("0. wallets", async () => {
  await assertDevnet(connection);
  const t = await bal(treasury.publicKey);
  if (t < 2) throw new Error(`treasury has ${t} devnet SOL - fund ${treasury.publicKey.toBase58()} with ~3 SOL first`);
  const c = await bal(creator.publicKey);
  if (c < 0.5) {
    await send(new Transaction().add(SystemProgram.transfer({
      fromPubkey: treasury.publicKey, toPubkey: creator.publicKey, lamports: Math.round((0.6 - c) * LAMPORTS_PER_SOL),
    })), [treasury]);
  }
  return { treasury: treasury.publicKey.toBase58(), treasury_sol: await bal(treasury.publicKey), creator: creator.publicKey.toBase58(), creator_sol: await bal(creator.publicKey) };
});

const curve = buildSowCurve({ migrationQuoteSol: MIGRATION_SOL });
console.log("\n" + describeCurve(curve));

let CONFIG = process.env.CONFIG ? new PublicKey(process.env.CONFIG) : null;
await step("1. rehearsal config", async () => {
  if (CONFIG) return { config: CONFIG.toBase58(), reused: true };
  const configKp = Keypair.generate();
  const before = await bal(treasury.publicKey);
  const tx = await client.partner.createConfig({
    payer: treasury.publicKey, config: configKp.publicKey, feeClaimer: treasury.publicKey,
    leftoverReceiver: treasury.publicKey, quoteMint: NATIVE_MINT, ...curve,
  });
  const sig = await send(tx, [treasury, configKp]);
  CONFIG = configKp.publicKey;
  return { config: CONFIG.toBase58(), cost_sol: +(before - (await bal(treasury.publicKey))).toFixed(6), sig };
});

const baseMint = Keypair.generate();
let POOL;
await step("2. creator launches with 0.1 SOL first buy (pays launch fee)", async () => {
  const before = await bal(creator.publicKey);
  const tx = await client.creator.createPoolWithFirstBuy({
    createPoolParam: {
      baseMint: baseMint.publicKey, config: CONFIG, name: "Rehearsal", symbol: "REHRSL",
      uri: "https://sow.fun/api/meta?name=Rehearsal&symbol=REHRSL&loan=3246961&borrower=Valeti",
      payer: creator.publicKey, poolCreator: creator.publicKey,
    },
    firstBuyParam: {
      buyer: creator.publicKey, receiver: creator.publicKey, buyAmount: new BN(0.1 * LAMPORTS_PER_SOL),
      minimumAmountOut: new BN(1), referralTokenAccount: null,
    },
  });
  const sig = await send(tx, [creator, baseMint]);
  const pool = await client.state.getPoolByBaseMint(baseMint.publicKey);
  POOL = pool.publicKey;
  const spent = before - (await bal(creator.publicKey));
  // spent = launch fee + rent + 0.1 SOL buy + tx fees -> rent+fee overhead is spent - 0.1
  return { mint: baseMint.publicKey.toBase58(), pool: POOL.toBase58(), creator_spent_sol: +spent.toFixed(6), launch_overhead_sol: +(spent - 0.1).toFixed(6), sig };
});

async function dbcSwap(owner, amountLamports, sell) {
  const tx = await client.pool.swap2({
    owner: owner.publicKey, pool: POOL, swapBaseForQuote: sell, referralTokenAccount: null,
    swapMode: SwapMode.PartialFill, amountIn: new BN(amountLamports), minimumAmountOut: new BN(0),
  });
  return send(tx, [owner]);
}
async function tokenBalance(owner, mint) {
  try {
    const r = await connection.getTokenAccountBalance(ata(owner, mint));
    return new BN(r.value.amount);
  } catch { return new BN(0); }
}

await step("3. trades on the bonding curve", async () => {
  const sigs = [];
  sigs.push(await dbcSwap(treasury, 0.15 * LAMPORTS_PER_SOL, false));
  const held = await tokenBalance(treasury.publicKey, baseMint.publicKey);
  sigs.push(await dbcSwap(treasury, held.divn(2).toString(), true));
  const m = await client.state.getPoolFeeMetrics(POOL);
  return {
    swaps: sigs.length,
    partner_pending_sol: sol(m.current.partnerQuoteFee.toString()),
    creator_pending_sol: sol(m.current.creatorQuoteFee.toString()),
    lifetime_fees_sol: sol(m.total.totalTradingQuoteFee.toString()),
  };
});

await step("4. pre-migration claims (treasury, creator, launch fee)", async () => {
  const m = await client.state.getPoolFeeMetrics(POOL);
  const tB = await bal(treasury.publicKey);
  const sigP = await send(await client.partner.claimPartnerTradingFee({
    pool: POOL, feeClaimer: treasury.publicKey, payer: treasury.publicKey,
    maxBaseAmount: new BN(0), maxQuoteAmount: m.current.partnerQuoteFee,
  }), [treasury]);
  const treasuryGain = (await bal(treasury.publicKey)) - tB;

  const cB = await bal(creator.publicKey);
  const sigC = await send(await client.creator.claimCreatorTradingFee({
    creator: creator.publicKey, payer: creator.publicKey, pool: POOL,
    maxBaseAmount: new BN(0), maxQuoteAmount: m.current.creatorQuoteFee,
  }), [creator]);
  const creatorGain = (await bal(creator.publicKey)) - cB;

  const lB = await bal(treasury.publicKey);
  const sigL = await send(await client.partner.claimPartnerPoolCreationFee({ pool: POOL, feeReceiver: treasury.publicKey }), [treasury]);
  const launchFeeGain = (await bal(treasury.publicKey)) - lB;
  return {
    treasury_expected_sol: sol(m.current.partnerQuoteFee.toString()), treasury_net_sol: +treasuryGain.toFixed(9),
    creator_expected_sol: sol(m.current.creatorQuoteFee.toString()), creator_net_sol: +creatorGain.toFixed(9),
    launch_fee_net_sol: +launchFeeGain.toFixed(9),
    sigs: [sigP, sigC, sigL],
  };
});

await step("5a. buy out the curve", async () => {
  const sigs = [];
  for (let i = 0; i < 6; i++) {
    const pool = await client.state.getPool(POOL);
    const reserve = field(pool, "quoteReserve");
    const remaining = curve.migrationQuoteThreshold.sub(new BN(reserve.toString()));
    if (remaining.lten(0)) break;
    // Overshoot slightly; PartialFill refunds whatever the curve can't absorb
    sigs.push(await dbcSwap(treasury, remaining.muln(110).divn(100).addn(10_000_000).toString(), false));
  }
  const pool = await client.state.getPool(POOL);
  return { quote_reserve_sol: sol(field(pool, "quoteReserve").toString()), migration_progress: field(pool, "migrationProgress"), swaps: sigs.length };
});

let DAMM_POOL;
await step("5b. migrate to DAMM v2", async () => {
  const dammConfig = DAMM_V2_MIGRATION_FEE_ADDRESS[MigrationFeeOption.Customizable];
  const { transaction, firstPositionNftKeypair, secondPositionNftKeypair } = await client.migration.migrateToDammV2({
    payer: treasury.publicKey, pool: POOL, dammConfig,
  });
  const sig = await send(transaction, [treasury, firstPositionNftKeypair, secondPositionNftKeypair]);
  DAMM_POOL = deriveDammV2PoolAddress(dammConfig, baseMint.publicKey, NATIVE_MINT);
  const pool = await client.state.getPool(POOL);
  return { damm_pool: DAMM_POOL.toBase58(), is_migrated: field(pool, "isMigrated"), sig };
});

async function dammSwap(owner, amountIn, sell) {
  const pool = await damm.account.pool.fetch(DAMM_POOL);
  const wsol = ata(owner.publicKey, NATIVE_MINT);
  const base = ata(owner.publicKey, pool.tokenAMint);
  const createAta = (account, mint) => ({
    programId: ASSOCIATED_TOKEN_PROGRAM_ID,
    keys: [
      { pubkey: owner.publicKey, isSigner: true, isWritable: true },
      { pubkey: account, isSigner: false, isWritable: true },
      { pubkey: owner.publicKey, isSigner: false, isWritable: false },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data: Buffer.from([1]),
  });
  const tx = new Transaction().add(createAta(wsol, NATIVE_MINT), createAta(base, pool.tokenAMint));
  if (!sell) {
    tx.add(SystemProgram.transfer({ fromPubkey: owner.publicKey, toPubkey: wsol, lamports: BigInt(amountIn.toString()) }));
    tx.add({ programId: TOKEN_PROGRAM_ID, keys: [{ pubkey: wsol, isSigner: false, isWritable: true }], data: Buffer.from([17]) }); // SyncNative
  }
  tx.add(await damm.methods
    .swap({ amountIn, minimumAmountOut: new BN(0) })
    .accountsPartial({
      poolAuthority: new PublicKey("HLnpSz9h2S4hiLQ43rnSD9XkcUThA7B8hQMKmDaiTLcC"),
      pool: DAMM_POOL,
      inputTokenAccount: sell ? base : wsol,
      outputTokenAccount: sell ? wsol : base,
      tokenAVault: pool.tokenAVault, tokenBVault: pool.tokenBVault,
      tokenAMint: pool.tokenAMint, tokenBMint: pool.tokenBMint,
      payer: owner.publicKey,
      tokenAProgram: TOKEN_PROGRAM_ID, tokenBProgram: TOKEN_PROGRAM_ID,
      referralTokenAccount: null,
      eventAuthority: deriveDammV2EventAuthority(),
      program: DAMM_V2_PROGRAM_ID,
    })
    .instruction());
  // Unwrap leftover wSOL
  tx.add({ programId: TOKEN_PROGRAM_ID, keys: [
    { pubkey: wsol, isSigner: false, isWritable: true },
    { pubkey: owner.publicKey, isSigner: false, isWritable: true },
    { pubkey: owner.publicKey, isSigner: true, isWritable: false },
  ], data: Buffer.from([9]) });
  return send(tx, [owner]);
}

await step("6. trades on the DAMM v2 pool", async () => {
  const sigs = [];
  sigs.push(await dammSwap(treasury, new BN(0.2 * LAMPORTS_PER_SOL), false));
  const held = await tokenBalance(treasury.publicKey, baseMint.publicKey);
  sigs.push(await dammSwap(treasury, held.divn(2), true));
  return { swaps: sigs.length };
});

await step("7. post-migration claims (both locked LP positions)", async () => {
  const filter = new Set([DAMM_POOL.toBase58()]);
  const out = {};
  for (const [label, kp] of [["treasury", treasury], ["creator", creator]]) {
    const positions = await getOwnerPositions(connection, kp.publicKey, filter);
    if (!positions.length) throw new Error(`${label} holds no DAMM v2 position for the migrated pool`);
    let expected = new BN(0);
    const before = await bal(kp.publicKey);
    const sigs = [];
    for (const p of positions) {
      expected = expected.add(unclaimedSolLamports(p));
      sigs.push(await send(await buildClaimPositionFeeTx(connection, kp.publicKey, p), [kp]));
    }
    out[label] = { positions: positions.length, expected_sol: sol(expected.toString()), net_sol: +((await bal(kp.publicKey)) - before).toFixed(9), sigs };
  }
  const total = out.treasury.expected_sol + out.creator.expected_sol;
  out.split = total > 0 ? `${((out.treasury.expected_sol / total) * 100).toFixed(1)} treasury / ${((out.creator.expected_sol / total) * 100).toFixed(1)} creator` : "no fees";
  return out;
});

log.finished_at = new Date().toISOString();
log.result = "PASS";
console.log("\nREHEARSAL PASSED");
save();
