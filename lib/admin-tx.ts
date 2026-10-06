// One-click money operations for the /admin Command Center.
//
// build*: the server builds the exact transactions for the connected wallet,
// packs them, and returns them unsigned with a "plan" - the receipt it will
// record if they succeed. The plan is sealed with an HMAC (ADMIN_KEY) and
// carries a hash of every transaction message.
// executePlan: takes the wallet-signed transactions back, checks each one is
// byte-for-byte what the server built and is signed by the plan's wallet,
// sends them, confirms them, and saves the receipt (lib/claim-store). Split
// transfers only go out if every claim confirmed.
//
// Keys never leave the browser wallet; the server never signs anything.

import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import BN from "bn.js";
import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  VersionedTransaction,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferCheckedInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { DynamicBondingCurveClient } from "@meteora-ag/dynamic-bonding-curve-sdk";
import { classifyLaunch, metadataPda, parseMetadata, poolField } from "@/lib/launchpad-onchain";
import { getMultipleAccountsChunked } from "@/lib/rpc-chunk.mjs";
import { getOwnerPositions, buildClaimPositionFeeTx, unclaimedSolLamports } from "@/lib/damm-v2.mjs";
import { serverRpcUrl } from "@/lib/rpc-server";
import { GENESIS_WALLET, IMPACT_CARD_ADDRESS, OPS_WALLET } from "@/lib/constants";
import { saveCardTopup, saveClaimSnapshot, type ClaimSnapshot } from "@/lib/claim-store";
import { saveExpectedLends, type ExpectedLend } from "@/lib/harvest-auto";

const OPS_SHARE = 10 / 55;
const LAUNCH_FEE_PARTNER_LAMPORTS = 31_500_000; // 90% of the 0.035 SOL launch fee
const MAX_TX_BYTES = 1232;
const USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
const USDC_DECIMALS = 6;
const JUP_API = "https://lite-api.jup.ag/swap/v1";

type Kind = "claim" | "creator" | "fund";

interface PlanItem {
  source: string; // dbc_partner | foreign_pool | damm_v2_locked_lp | foreign_pool_lp | genesis_vault | launch_fee | split_ops | split_genesis | swap | card_send
  pool?: string;
  mint?: string | null;
  name?: string | null;
  symbol?: string | null;
  kiva_loan_id?: number | null;
  lamports: string;
  tx: number; // index into the transactions
}

export interface Plan {
  kind: Kind;
  config: string;
  wallet: string;
  builtAt: string;
  solPrice: number | null;
  blockhash: string;
  lastValidBlockHeight: number;
  hashes: string[]; // sha256 of each transaction message, in send order
  versioned: boolean[]; // which transactions are v0 (Jupiter swaps)
  sequential: number[]; // tx indexes that only go out after every earlier tx confirmed
  items: PlanItem[];
  usd?: number; // fund: dollars to the card
  lends?: ExpectedLend[]; // fund: the plan lines this top-up pays for
}

export interface Built {
  plan: Plan;
  mac: string;
  transactions: string[]; // base64, unsigned
  summary: string[];
}

// ------------------------------------------------------------------ helpers

const conn = () => new Connection(serverRpcUrl(), "confirmed");
const sha = (b: Uint8Array) => createHash("sha256").update(b).digest("hex");
const mac = (plan: Plan) => createHmac("sha256", process.env.ADMIN_KEY ?? "").update(JSON.stringify(plan)).digest("hex");
const sol = (l: number) => `${(l / 1e9).toFixed(4)} SOL`;

function verifyMac(plan: Plan, given: string): boolean {
  const a = Buffer.from(mac(plan));
  const b = Buffer.from(given ?? "");
  return a.length === b.length && timingSafeEqual(a, b);
}

async function solPrice(): Promise<number | null> {
  try {
    const r = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd", { cache: "no-store" });
    return (await r.json())?.solana?.usd ?? null;
  } catch {
    return null;
  }
}

/** Greedily pack instruction groups (each must stay in one tx) into as few legacy txs as fit. */
function pack(groups: { ixs: TransactionInstruction[]; itemIdx: number[] }[], payer: PublicKey, blockhash: string, items: PlanItem[]): Transaction[] {
  const txs: Transaction[] = [];
  let cur = new Transaction();
  let curItems: number[] = [];
  const size = (t: Transaction) => {
    t.feePayer = payer;
    t.recentBlockhash = blockhash;
    try {
      return t.serialize({ requireAllSignatures: false, verifySignatures: false }).length;
    } catch {
      return Infinity;
    }
  };
  const flush = () => {
    if (!cur.instructions.length) return;
    for (const i of curItems) items[i].tx = txs.length;
    txs.push(cur);
    cur = new Transaction();
    curItems = [];
  };
  for (const g of groups) {
    const trial = new Transaction().add(...cur.instructions, ...g.ixs);
    if (cur.instructions.length && size(trial) > MAX_TX_BYTES) flush();
    cur.add(...g.ixs);
    curItems.push(...g.itemIdx);
    if (size(cur) > MAX_TX_BYTES) throw new Error("a single claim does not fit in one transaction");
  }
  flush();
  for (const t of txs) {
    t.feePayer = payer;
    t.recentBlockhash = blockhash;
  }
  return txs;
}

function finish(kind: Kind, configKey: string, wallet: PublicKey, price: number | null, bh: { blockhash: string; lastValidBlockHeight: number }, txs: (Transaction | VersionedTransaction)[], items: PlanItem[], sequential: number[], summary: string[], usd?: number, lends?: ExpectedLend[]): Built {
  const msgBytes = (t: Transaction | VersionedTransaction) => (t instanceof VersionedTransaction ? t.message.serialize() : t.serializeMessage());
  const plan: Plan = {
    kind,
    config: configKey,
    wallet: wallet.toBase58(),
    builtAt: new Date().toISOString(),
    solPrice: price,
    blockhash: bh.blockhash,
    lastValidBlockHeight: bh.lastValidBlockHeight,
    hashes: txs.map((t) => sha(msgBytes(t))),
    versioned: txs.map((t) => t instanceof VersionedTransaction),
    sequential,
    items,
    ...(usd ? { usd } : {}),
    ...(lends?.length ? { lends } : {}),
  };
  return {
    plan,
    mac: mac(plan),
    transactions: txs.map((t) =>
      Buffer.from(t instanceof VersionedTransaction ? t.serialize() : t.serialize({ requireAllSignatures: false, verifySignatures: false })).toString("base64")
    ),
    summary,
  };
}

async function coinInfo(connection: Connection, mints: PublicKey[]) {
  const infos = await getMultipleAccountsChunked(connection, mints.map((m) => metadataPda(m)));
  const out = new Map<string, { name: string | null; symbol: string | null; loanId: number | null; origin: "sowfun" | "foreign" | "unknown" }>();
  await Promise.all(
    mints.map(async (m, i) => {
      const info = infos[i];
      if (!info?.data) return out.set(m.toBase58(), { name: null, symbol: null, loanId: null, origin: "foreign" });
      try {
        const meta = parseMetadata(info.data as Buffer);
        const c = await classifyLaunch(meta.uri, m.toBase58());
        out.set(m.toBase58(), {
          name: meta.name || null,
          symbol: meta.symbol || null,
          loanId: c.kind === "sowfun" ? c.loanId : null,
          origin: c.kind === "sowfun" ? "sowfun" : c.kind === "unknown" ? "unknown" : "foreign",
        });
      } catch {
        out.set(m.toBase58(), { name: null, symbol: null, loanId: null, origin: "foreign" });
      }
    })
  );
  return out;
}

async function configFeeClaimer(client: DynamicBondingCurveClient, configKey: string): Promise<string> {
  const cfg = await client.state.getPoolConfig(new PublicKey(configKey));
  if (!cfg) throw new Error("config not found on-chain");
  return cfg.feeClaimer.toBase58();
}

// ------------------------------------------------------------------ claims

/**
 * Claim + route (kind "claim", signed by the config's fee claimer): partner
 * fees from every pool, its locked LP fees, launch fees, then one split tx -
 * 10/55 of sow.fun coins' share + launch fees to Ops, foreign pools to Genesis.
 * Genesis Vault (kind "creator", signed by the wallet that created pools - $SOW):
 * creator fees + creator LP positions on its own pools.
 */
export async function buildClaim(configKey: string, walletStr: string, kind: "claim" | "creator"): Promise<Built> {
  const connection = conn();
  const client = new DynamicBondingCurveClient(connection, "confirmed");
  const wallet = new PublicKey(walletStr);
  const config = new PublicKey(configKey);
  const feeClaimer = await configFeeClaimer(client, configKey);
  if (kind === "claim" && walletStr !== feeClaimer) {
    throw new Error(`Connect the fee claimer ${feeClaimer.slice(0, 4)}...${feeClaimer.slice(-4)} (Impact Treasury) - connected ${walletStr.slice(0, 4)}...${walletStr.slice(-4)}.`);
  }

  const [pools, fees, price] = await Promise.all([client.state.getPoolsByConfig(config), client.state.getPoolsFeesByConfig(config), solPrice()]);
  const poolMint = new Map<string, PublicKey>();
  const poolCreator = new Map<string, string>();
  for (const p of pools) {
    const pa = p as unknown as { publicKey?: PublicKey; address?: PublicKey; account: unknown };
    const addr = (pa.publicKey ?? pa.address)!.toBase58();
    const m = poolField<PublicKey>(pa.account, "baseMint");
    if (m) poolMint.set(addr, m);
    const c = poolField<PublicKey>(pa.account, "creator");
    if (c) poolCreator.set(addr, c.toBase58());
  }
  const info = await coinInfo(connection, [...poolMint.values()]);
  const items: PlanItem[] = [];
  const groups: { ixs: TransactionInstruction[]; itemIdx: number[] }[] = [];
  const summary: string[] = [];
  let sowfunLamports = 0;
  let foreignLamports = 0;
  let launchLamports = 0;

  const addGroup = (tx: Transaction, item: PlanItem) => {
    items.push(item);
    groups.push({ ixs: tx.instructions, itemIdx: [items.length - 1] });
  };

  if (kind === "claim") {
    const unknown = [...info.entries()].filter(([, v]) => v.origin === "unknown").map(([k]) => k);
    if (unknown.length) throw new Error(`Couldn't verify ${unknown.length} coin(s) - nothing built. Try again in a minute.`);
    for (const f of fees) {
      if (f.partnerQuoteFee.isZero()) continue;
      const addr = f.poolAddress.toBase58();
      const m = poolMint.get(addr) ?? null;
      const ci = m ? info.get(m.toBase58())! : { name: null, symbol: null, loanId: null, origin: "foreign" as const };
      const foreign = ci.origin !== "sowfun";
      const lamports = f.partnerQuoteFee.toNumber();
      if (foreign) foreignLamports += lamports;
      else sowfunLamports += lamports;
      const tx = await client.partner.claimPartnerTradingFee({
        pool: f.poolAddress,
        feeClaimer: wallet,
        payer: wallet,
        maxBaseAmount: new BN(0),
        maxQuoteAmount: f.partnerQuoteFee,
      });
      addGroup(tx, { source: foreign ? "foreign_pool" : "dbc_partner", pool: addr, mint: m?.toBase58() ?? null, name: ci.name, symbol: ci.symbol, kiva_loan_id: ci.loanId, lamports: String(lamports), tx: -1 });
    }
  } else {
    for (const f of fees) {
      const addr = f.poolAddress.toBase58();
      if (poolCreator.get(addr) !== walletStr || f.creatorQuoteFee.isZero()) continue;
      const m = poolMint.get(addr) ?? null;
      const ci = m ? info.get(m.toBase58()) : undefined;
      const tx = await client.creator.claimCreatorTradingFee({ creator: wallet, payer: wallet, pool: f.poolAddress, maxBaseAmount: new BN(0), maxQuoteAmount: f.creatorQuoteFee });
      addGroup(tx, { source: "genesis_vault", pool: addr, mint: m?.toBase58() ?? null, name: ci?.name ?? null, symbol: ci?.symbol ?? null, lamports: f.creatorQuoteFee.toString(), tx: -1 });
    }
  }

  // Graduated coins: locked DAMM v2 LP positions held by this wallet
  const coinMints = new Set([...poolMint.values()].map((m) => m.toBase58()));
  const positions = (await getOwnerPositions(connection, wallet).catch(() => [])).filter(
    (p: { pool: { tokenAMint: PublicKey; tokenBMint: PublicKey } }) => coinMints.has(p.pool.tokenAMint.toBase58()) || coinMints.has(p.pool.tokenBMint.toBase58())
  );
  // A wallet that is both fee claimer and creator holds two positions per pool:
  // the larger (55%) is the partner one, the smaller (45%) the creator one
  const byPool = new Map<string, typeof positions>();
  for (const p of positions) byPool.set(p.poolAddress.toBase58(), [...(byPool.get(p.poolAddress.toBase58()) ?? []), p]);
  for (const group of byPool.values()) {
    const sorted = [...group].sort((a, b) => b.position.permanentLockedLiquidity.cmp(a.position.permanentLockedLiquidity));
    const isPartnerToo = walletStr === feeClaimer;
    const take = kind === "claim" ? sorted.slice(0, 1) : isPartnerToo ? sorted.slice(1) : sorted;
    for (const p of take) {
      const lamports = unclaimedSolLamports(p).toNumber();
      if (!lamports) continue;
      const mint = coinMints.has(p.pool.tokenAMint.toBase58()) ? p.pool.tokenAMint : p.pool.tokenBMint;
      const ci = info.get(mint.toBase58());
      const foreign = kind === "claim" && ci?.origin !== "sowfun";
      if (kind === "claim") {
        if (foreign) foreignLamports += lamports;
        else sowfunLamports += lamports;
      }
      const tx = await buildClaimPositionFeeTx(connection, wallet, p);
      addGroup(tx, {
        source: kind === "creator" ? "genesis_vault" : foreign ? "foreign_pool_lp" : "damm_v2_locked_lp",
        pool: p.poolAddress.toBase58(),
        mint: mint.toBase58(),
        name: ci?.name ?? null,
        symbol: ci?.symbol ?? null,
        kiva_loan_id: kind === "claim" && !foreign ? ci?.loanId ?? null : null,
        lamports: String(lamports),
        tx: -1,
      });
    }
  }

  // Launch fees (every pool not yet claimed - simulate to find them)
  if (kind === "claim") {
    for (const [addr] of poolMint) {
      try {
        const tx = await client.partner.claimPartnerPoolCreationFee({ pool: new PublicKey(addr), feeReceiver: wallet });
        tx.feePayer = wallet;
        tx.recentBlockhash = (await connection.getLatestBlockhash("confirmed")).blockhash;
        const sim = await connection.simulateTransaction(tx);
        if (sim.value.err) continue;
        launchLamports += LAUNCH_FEE_PARTNER_LAMPORTS;
        addGroup(tx, { source: "launch_fee", pool: addr, lamports: String(LAUNCH_FEE_PARTNER_LAMPORTS), tx: -1 });
      } catch { /* not eligible */ }
    }
  }

  if (!groups.length) throw new Error(kind === "claim" ? "Nothing to claim right now." : "No creator fees to claim for this wallet.");

  const bh = await connection.getLatestBlockhash("confirmed");
  const txs = pack(groups, wallet, bh.blockhash, items);
  const sequential: number[] = [];

  if (kind === "claim") {
    const ops = Math.floor(sowfunLamports * OPS_SHARE) + launchLamports;
    const genesis = foreignLamports;
    const split = new Transaction();
    if (ops > 0) {
      split.add(SystemProgram.transfer({ fromPubkey: wallet, toPubkey: new PublicKey(OPS_WALLET), lamports: ops }));
      items.push({ source: "split_ops", lamports: String(ops), tx: txs.length });
    }
    if (genesis > 0) {
      split.add(SystemProgram.transfer({ fromPubkey: wallet, toPubkey: new PublicKey(GENESIS_WALLET), lamports: genesis }));
      items.push({ source: "split_genesis", lamports: String(genesis), tx: txs.length });
    }
    if (split.instructions.length) {
      split.feePayer = wallet;
      split.recentBlockhash = bh.blockhash;
      sequential.push(txs.length);
      txs.push(split);
    }
    summary.push(
      `Claim ${sol(sowfunLamports + foreignLamports + launchLamports)} into ${walletStr.slice(0, 4)}...${walletStr.slice(-4)}`,
      `${sol(sowfunLamports - Math.floor(sowfunLamports * OPS_SHARE))} stays for Kiva`,
      `${sol(ops)} -> Ops (10/55 + ${launchLamports / LAUNCH_FEE_PARTNER_LAMPORTS} launch fees)`,
      `${sol(genesis)} -> Genesis (foreign pools)`
    );
  } else {
    const total = items.reduce((s, i) => s + Number(i.lamports), 0);
    summary.push(`Claim ${sol(total)} of creator fees into the Genesis Vault (${walletStr.slice(0, 4)}...${walletStr.slice(-4)})`);
  }
  summary.push(`${txs.length} transaction${txs.length > 1 ? "s" : ""} - one approval in your wallet`);
  return finish(kind, configKey, wallet, price, bh, txs, items, sequential, summary);
}

// ------------------------------------------------------------------ fund card

/** Swap exactly the needed USDC (Jupiter exact-out, treasury USDC used first) and send `usd` to the KAST deposit. */
export async function buildFund(configKey: string, walletStr: string, usd: number, lends: ExpectedLend[] = []): Promise<Built> {
  if (!(usd > 0) || usd > 100_000) throw new Error("invalid amount");
  const connection = conn();
  const client = new DynamicBondingCurveClient(connection, "confirmed");
  const feeClaimer = await configFeeClaimer(client, configKey);
  if (walletStr !== feeClaimer) throw new Error(`Connect the Impact Treasury ${feeClaimer.slice(0, 4)}...${feeClaimer.slice(-4)} - the card is funded from it.`);
  const wallet = new PublicKey(walletStr);
  const card = new PublicKey(IMPACT_CARD_ADDRESS);
  const target = BigInt(Math.round(usd * 10 ** USDC_DECIMALS));
  const walletAta = getAssociatedTokenAddressSync(USDC_MINT, wallet, false, TOKEN_PROGRAM_ID);
  const cardAta = getAssociatedTokenAddressSync(USDC_MINT, card, true, TOKEN_PROGRAM_ID);
  const have = BigInt((await connection.getTokenAccountBalance(walletAta).catch(() => null))?.value.amount ?? "0");
  const need = target > have ? target - have : BigInt(0);
  const price = await solPrice();
  const items: PlanItem[] = [];
  const txs: (Transaction | VersionedTransaction)[] = [];
  const summary: string[] = [];
  const sequential: number[] = [];

  if (need > BigInt(0)) {
    const q = new URLSearchParams({ inputMint: "So11111111111111111111111111111111111111112", outputMint: USDC_MINT.toBase58(), amount: need.toString(), swapMode: "ExactOut", slippageBps: "50" });
    const quote = await (await fetch(`${JUP_API}/quote?${q}`, { cache: "no-store" })).json();
    if (!quote?.inAmount) throw new Error(`Jupiter quote failed: ${quote?.error ?? "no route"}`);
    const maxIn = BigInt(quote.otherAmountThreshold);
    const lamports = BigInt(await connection.getBalance(wallet));
    if (lamports - maxIn < BigInt(10_000_000)) throw new Error(`Not enough SOL in the treasury: the swap may take ${(Number(maxIn) / 1e9).toFixed(4)} SOL, it holds ${(Number(lamports) / 1e9).toFixed(4)}.`);
    const swapRes = await fetch(`${JUP_API}/swap`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ quoteResponse: quote, userPublicKey: walletStr, wrapAndUnwrapSol: true, dynamicComputeUnitLimit: true, prioritizationFeeLamports: { priorityLevelWithMaxLamports: { maxLamports: 1_000_000, priorityLevel: "high" } } }),
    });
    if (!swapRes.ok) throw new Error(`Jupiter swap build failed: ${swapRes.status}`);
    const { swapTransaction } = await swapRes.json();
    const vtx = VersionedTransaction.deserialize(Buffer.from(swapTransaction, "base64"));
    items.push({ source: "swap", lamports: String(quote.inAmount), tx: 0 });
    txs.push(vtx);
    summary.push(`Swap ~${(Number(quote.inAmount) / 1e9).toFixed(4)} SOL -> exactly $${(Number(need) / 1e6).toFixed(2)} USDC (Jupiter exact-out)`);
  }
  const bh = await connection.getLatestBlockhash("confirmed");
  if (txs[0] instanceof VersionedTransaction) txs[0].message.recentBlockhash = bh.blockhash;
  const send = new Transaction().add(
    createAssociatedTokenAccountIdempotentInstruction(wallet, cardAta, card, USDC_MINT, TOKEN_PROGRAM_ID),
    createTransferCheckedInstruction(walletAta, USDC_MINT, cardAta, wallet, target, USDC_DECIMALS, [], TOKEN_PROGRAM_ID)
  );
  send.feePayer = wallet;
  send.recentBlockhash = bh.blockhash;
  if (txs.length) sequential.push(txs.length);
  items.push({ source: "card_send", lamports: target.toString(), tx: txs.length });
  txs.push(send);
  summary.push(`Send exactly $${usd.toFixed(2)} USDC to the KAST card ${IMPACT_CARD_ADDRESS.slice(0, 6)}...${IMPACT_CARD_ADDRESS.slice(-4)}`);
  summary.push(`${txs.length} transaction${txs.length > 1 ? "s" : ""} - one approval in your wallet`);
  return finish("fund", configKey, wallet, price, bh, txs, items, sequential, summary, usd, lends);
}

// ------------------------------------------------------------------ execute

export interface ExecResult {
  ok: boolean;
  sent: { index: number; signature: string; ok: boolean; error?: string }[];
  recorded: boolean;
  message: string;
}

export async function executePlan(plan: Plan, givenMac: string, signed: string[]): Promise<ExecResult> {
  if (!verifyMac(plan, givenMac)) throw new Error("plan seal invalid - rebuild");
  if (signed.length !== plan.hashes.length) throw new Error("transaction count mismatch");
  const connection = conn();
  const wallet = new PublicKey(plan.wallet);

  // Every transaction must be exactly what was built, and signed by the plan's wallet
  const txs = signed.map((b64, i) => {
    const bytes = Buffer.from(b64, "base64");
    let msg: Uint8Array;
    let sigOk: boolean;
    if (plan.versioned[i]) {
      const v = VersionedTransaction.deserialize(bytes);
      msg = v.message.serialize();
      // fee payer is the first static key; its signature must be present
      sigOk = !!v.message.staticAccountKeys[0]?.equals(wallet) && !!v.signatures[0]?.some((x) => x !== 0);
    } else {
      const t = Transaction.from(bytes);
      msg = t.serializeMessage();
      sigOk = t.signatures.some((s) => s.publicKey.equals(wallet) && s.signature !== null) && t.verifySignatures(false);
    }
    if (sha(msg) !== plan.hashes[i]) throw new Error(`transaction ${i + 1} was changed after it was built`);
    if (!sigOk) throw new Error(`transaction ${i + 1} is not signed by ${plan.wallet}`);
    return bytes;
  });

  const sent: ExecResult["sent"] = [];
  const confirm = async (i: number) => {
    try {
      const signature = await connection.sendRawTransaction(txs[i], { maxRetries: 3 });
      const c = await connection.confirmTransaction({ signature, blockhash: plan.blockhash, lastValidBlockHeight: plan.lastValidBlockHeight }, "confirmed");
      sent.push({ index: i, signature, ok: !c.value.err, ...(c.value.err ? { error: JSON.stringify(c.value.err) } : {}) });
    } catch (e) {
      sent.push({ index: i, signature: "", ok: false, error: e instanceof Error ? e.message : "send failed" });
    }
  };

  const first = plan.hashes.map((_, i) => i).filter((i) => !plan.sequential.includes(i));
  // Swaps go strictly in order; independent claims go out together
  if (plan.kind === "fund") for (const i of first) await confirm(i);
  else await Promise.all(first.map(confirm));
  const firstOk = first.every((i) => sent.find((s) => s.index === i)?.ok);
  if (firstOk) for (const i of plan.sequential) await confirm(i);
  sent.sort((a, b) => a.index - b.index);
  const sigOf = (i: number) => sent.find((s) => s.index === i && s.ok)?.signature ?? null;

  // Record what actually happened
  const now = new Date().toISOString();
  let recorded = false;
  if (plan.kind === "fund") {
    const sendItem = plan.items.find((i) => i.source === "card_send")!;
    const sendSig = sigOf(sendItem.tx);
    if (sendSig) {
      const swap = plan.items.find((i) => i.source === "swap");
      await saveExpectedLends(plan.lends ?? []).catch(() => {});
      await saveCardTopup({
        at: now,
        usd: plan.usd ?? Number(sendItem.lamports) / 10 ** USDC_DECIMALS,
        from: plan.wallet,
        card: IMPACT_CARD_ADDRESS,
        sol_spent: swap ? Number(swap.lamports) / 1e9 : 0,
        swap_tx: swap ? sigOf(swap.tx) : null,
        send_tx: sendSig,
      });
      recorded = true;
    }
  } else {
    const done = plan.items.filter((i) => sigOf(i.tx));
    const pools = done
      .filter((i) => !["launch_fee", "split_ops", "split_genesis"].includes(i.source))
      .map((i) => ({
        source: i.source,
        pool: i.pool,
        mint: i.mint ?? null,
        name: i.name ?? null,
        symbol: i.symbol ?? null,
        kiva_loan_id: i.kiva_loan_id ?? null,
        claimed_lamports: i.lamports,
        claimed_sol: Number(i.lamports) / 1e9,
        tx: sigOf(i.tx)!,
        explorer_url: `https://solscan.io/tx/${sigOf(i.tx)}`,
      }));
    const launch_fees = done.filter((i) => i.source === "launch_fee").map((i) => ({ pool: i.pool!, net_lamports: Number(i.lamports), tx: sigOf(i.tx)! }));
    const splits = done
      .filter((i) => i.source === "split_ops" || i.source === "split_genesis")
      .map((i) => ({ to: i.source === "split_ops" ? "ops" : "genesis", wallet: i.source === "split_ops" ? OPS_WALLET : GENESIS_WALLET, lamports: i.lamports, sol: Number(i.lamports) / 1e9, tx: sigOf(i.tx)! }));
    if (pools.length || launch_fees.length) {
      const total = [...pools.map((p) => Number(p.claimed_lamports)), ...launch_fees.map((l) => l.net_lamports)].reduce((a, b) => a + b, 0);
      const snap: ClaimSnapshot = {
        claimed_at: now,
        config: plan.config,
        treasury: plan.wallet,
        sol_price_usd: plan.solPrice,
        total_claimed_lamports: String(total),
        total_claimed_sol: total / 1e9,
        pools,
        launch_fees,
        splits,
      };
      await saveClaimSnapshot(snap);
      recorded = true;
    }
  }

  const ok = sent.length === plan.hashes.length && sent.every((s) => s.ok);
  const failedSplit = plan.sequential.length > 0 && !firstOk;
  return {
    ok,
    sent,
    recorded,
    message: ok
      ? "All transactions confirmed and the receipt is saved."
      : failedSplit
        ? "Some transactions failed, so the follow-up step (split / card send) was NOT sent. What succeeded is recorded - click again to retry the rest."
        : "Some transactions failed - what succeeded is recorded. Check the signatures below.",
  };
}
