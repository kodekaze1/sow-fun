// Genesis launch: creates the $SOW pool itself using the pre-ground vanity
// mint keypair (CA ending in ...sow). Run ONCE, locally, after the config exists.
//
// Usage:
//   KEYPAIR=<path to treasury keypair json> \
//   MINT_KEYPAIR=<path to vanity mint keypair json> \
//   CONFIG=<DBC config pubkey> \
//   LOAN=<kiva loan id> BORROWER="<name>" IMAGE="<image url>" \
//   node scripts/launch-genesis.mjs
//
// Optional env: NAME (default "Sow"), SYMBOL (default "SOW"), RPC / HELIUS_API_KEY,
// DESCRIPTION, X (default @sowfunhq), TELEGRAM, WEBSITE (default https://sow.fun) -
// saved write-once to sow.fun right before the pool is created and served from
// the coin's on-chain URI sow.fun/m/<mint>.
// NETWORK=devnet, FIRST_BUY_SOL (dev buy executed in the SAME transaction as
// pool creation, so no sniper can buy before it - see the first-buy table
// printed by create-dbc-config.mjs for the supply % each amount buys).
// KEEP THE MINT KEYPAIR SECRET until this runs - anyone holding it could
// create the mint first and burn the vanity address.

import fs from "node:fs";
import { Connection, Keypair, PublicKey, sendAndConfirmTransaction } from "@solana/web3.js";
import BN from "bn.js";
import { DynamicBondingCurveClient } from "@meteora-ag/dynamic-bonding-curve-sdk";
import { resolveRpc, NETWORK } from "./lib/rpc.mjs";

const RPC = resolveRpc();
const { KEYPAIR, MINT_KEYPAIR, CONFIG, LOAN, BORROWER, IMAGE } = process.env;
const NAME = process.env.NAME ?? "Sow";
const SYMBOL = process.env.SYMBOL ?? "SOW";
const SITE = "https://sow.fun";
// The $SOW ticker is reserved on /api/launch-meta - the admin key unlocks it
const ADMIN_KEY = process.env.ADMIN_KEY ?? (() => {
  try {
    const line = fs.readFileSync(".env.local", "utf8").split(/\r?\n/).find((l) => l.startsWith("ADMIN_KEY="));
    return line ? line.slice("ADMIN_KEY=".length).trim() : undefined;
  } catch {
    return undefined;
  }
})();

if (!KEYPAIR || !MINT_KEYPAIR || !CONFIG) {
  console.error("Required env: KEYPAIR, MINT_KEYPAIR, CONFIG. Recommended: LOAN, BORROWER, IMAGE.");
  process.exit(1);
}
if (NETWORK === "mainnet" && !ADMIN_KEY) {
  console.error("ADMIN_KEY missing (env or .env.local) - it is needed to save the reserved $SOW details");
  process.exit(1);
}

const load = (p) => Keypair.fromSecretKey(new Uint8Array(JSON.parse(fs.readFileSync(p, "utf8"))));
const creator = load(KEYPAIR);
// $SOW must be launched by the launch treasury on mainnet (it is the
// feeClaimer AND $SOW's creator). The old sowSZPr... wallet is test-only.
// PILOT=1 allows the test treasury for a mainnet pilot genesis (pilot config only).
const LAUNCH_TREASURY = "sowMw8eTZE5NryyyTmpCoBfcW8oYsSZtqoanRMTybAj";
const TEST_TREASURY = "sowSZPr36YSZQWemGUEUvxULFyFr6fwXde61sTYHtD2";
const expected = process.env.PILOT ? TEST_TREASURY : LAUNCH_TREASURY;
if (NETWORK === "mainnet" && creator.publicKey.toBase58() !== expected) {
  console.error(`KEYPAIR is ${creator.publicKey.toBase58()} - mainnet genesis must be signed by ${expected}${process.env.PILOT ? " (pilot)" : " (launch treasury)"}`);
  process.exit(1);
}
if (process.env.PILOT) console.log("*** PILOT genesis on the test treasury - not the real $SOW launch ***");
const baseMint = load(MINT_KEYPAIR);

const uri = `${SITE}/m/${baseMint.publicKey.toBase58()}`;
const details = {
  mint: baseMint.publicKey.toBase58(),
  name: NAME,
  symbol: SYMBOL,
  image: IMAGE || null,
  loanId: LOAN ? Number(LOAN) : null,
  borrower: BORROWER || null,
  creator: creator.publicKey.toBase58(),
  description: process.env.DESCRIPTION || "",
  x: process.env.X ?? "@sowfunhq",
  telegram: process.env.TELEGRAM || "",
  website: process.env.WEBSITE ?? SITE,
};

const connection = new Connection(RPC, "confirmed");
const client = new DynamicBondingCurveClient(connection, "confirmed");

console.log("creator: ", creator.publicKey.toBase58());
console.log("mint:    ", baseMint.publicKey.toBase58());
console.log("config:  ", CONFIG);
console.log("uri:     ", uri);

// Save the coin's details first (mainnet only) - its URI serves them. Done
// seconds before the launch tx, so the vanity mint is never public early.
if (NETWORK === "mainnet") {
  const res = await fetch(`${SITE}/api/launch-meta`, {
    method: "POST",
    // The admin key unlocks the reserved $SOW ticker on /api/launch-meta
    headers: { "content-type": "application/json", origin: SITE, "x-admin-key": ADMIN_KEY },
    body: JSON.stringify(details),
  });
  if (!res.ok) {
    console.error(`saving coin details failed (${res.status}): ${await res.text()}`);
    process.exit(1);
  }
  console.log("details: saved to", uri);
}

const FIRST_BUY_SOL = Number(process.env.FIRST_BUY_SOL ?? 0);
const createPoolParam = {
  baseMint: baseMint.publicKey,
  config: new PublicKey(CONFIG),
  name: NAME,
  symbol: SYMBOL,
  uri,
  payer: creator.publicKey,
  poolCreator: creator.publicKey,
};
if (FIRST_BUY_SOL > 0) console.log("first buy:", FIRST_BUY_SOL, "SOL (atomic with pool creation)");
const tx = FIRST_BUY_SOL > 0
  ? await client.creator.createPoolWithFirstBuy({
      createPoolParam,
      firstBuyParam: {
        buyer: creator.publicKey,
        receiver: creator.publicKey,
        buyAmount: new BN(Math.round(FIRST_BUY_SOL * 1e9)),
        // Fresh pool: nobody can trade ahead of an atomic first buy, so no
        // slippage floor is needed beyond receiving something.
        minimumAmountOut: new BN(1),
        referralTokenAccount: null,
      },
    })
  : await client.creator.createPool(createPoolParam);

const signature = await sendAndConfirmTransaction(connection, tx, [creator, baseMint]);
console.log("\n$" + SYMBOL + " is live!");
console.log("signature:", `https://solscan.io/tx/${signature}`);
console.log("token:    ", `https://sow.fun/t/${baseMint.publicKey.toBase58()}`);
console.log("trade:    ", `https://jup.ag/swap/SOL-${baseMint.publicKey.toBase58()}`);
