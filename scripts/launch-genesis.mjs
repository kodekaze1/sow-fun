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
// NETWORK=devnet, FIRST_BUY_SOL (dev buy executed in the SAME transaction as
// pool creation, so no sniper can buy before it - see the first-buy table
// printed by create-dbc-config.mjs for the supply % each amount buys).
// KEEP THE MINT KEYPAIR SECRET until this runs - anyone holding it could
// create the mint first and burn the vanity address.

import fs from "node:fs";
import { Connection, Keypair, PublicKey, sendAndConfirmTransaction } from "@solana/web3.js";
import BN from "bn.js";
import { DynamicBondingCurveClient } from "@meteora-ag/dynamic-bonding-curve-sdk";
import { resolveRpc } from "./lib/rpc.mjs";

const RPC = resolveRpc();
const { KEYPAIR, MINT_KEYPAIR, CONFIG, LOAN, BORROWER, IMAGE } = process.env;
const NAME = process.env.NAME ?? "Sow";
const SYMBOL = process.env.SYMBOL ?? "SOW";
const SITE = "https://sow.fun";

if (!KEYPAIR || !MINT_KEYPAIR || !CONFIG) {
  console.error("Required env: KEYPAIR, MINT_KEYPAIR, CONFIG. Recommended: LOAN, BORROWER, IMAGE.");
  process.exit(1);
}

const load = (p) => Keypair.fromSecretKey(new Uint8Array(JSON.parse(fs.readFileSync(p, "utf8"))));
const creator = load(KEYPAIR);
const baseMint = load(MINT_KEYPAIR);

const q = new URLSearchParams({ name: NAME, symbol: SYMBOL });
if (IMAGE) q.set("image", IMAGE);
if (LOAN) q.set("loan", LOAN);
if (BORROWER) q.set("borrower", BORROWER);
const uri = `${SITE}/api/meta?${q.toString()}`;

const connection = new Connection(RPC, "confirmed");
const client = new DynamicBondingCurveClient(connection, "confirmed");

console.log("creator: ", creator.publicKey.toBase58());
console.log("mint:    ", baseMint.publicKey.toBase58());
console.log("config:  ", CONFIG);
console.log("uri:     ", uri);

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
