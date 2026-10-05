// Shared RPC resolution for operator scripts. Never hardcode a key here:
// the Helius key is read from env (or .env.local when run from the repo).
//
// Precedence: RPC (full URL) > HELIUS_API_KEY + NETWORK > public endpoint.
// NETWORK is "mainnet" (default) or "devnet".

import fs from "node:fs";
import path from "node:path";

function readEnvLocal(name) {
  try {
    const file = fs.readFileSync(path.resolve(process.cwd(), ".env.local"), "utf8");
    const line = file.split(/\r?\n/).find((l) => l.startsWith(`${name}=`));
    return line ? line.slice(name.length + 1).trim().replace(/^﻿/, "") : undefined;
  } catch {
    return undefined;
  }
}

export const NETWORK = (process.env.NETWORK ?? "mainnet").toLowerCase();
if (NETWORK !== "mainnet" && NETWORK !== "devnet") {
  console.error(`NETWORK must be "mainnet" or "devnet" (got "${NETWORK}")`);
  process.exit(1);
}

// Pass the network explicitly when a script must not depend on env (e.g. the
// devnet rehearsal): ESM imports are evaluated before the importing module's
// own top-level code, so setting process.env.NETWORK there is too late.
export function resolveRpc(network = NETWORK) {
  if (process.env.RPC) return process.env.RPC;
  const key = process.env.HELIUS_API_KEY ?? readEnvLocal("HELIUS_API_KEY");
  if (key) return `https://${network}.helius-rpc.com/?api-key=${key}`;
  const fallback = network === "devnet" ? "https://api.devnet.solana.com" : "https://api.mainnet-beta.solana.com";
  console.warn(`[rpc] no RPC or HELIUS_API_KEY set - using public ${network} endpoint (rate limited)`);
  return fallback;
}

const DEVNET_GENESIS = "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG";
// Refuse to continue unless the connection really is devnet.
export async function assertDevnet(connection) {
  const hash = await connection.getGenesisHash();
  if (hash !== DEVNET_GENESIS) throw new Error(`expected devnet, connected to genesis ${hash}`);
}

// For log lines: show the host, never the key.
export function rpcLabel(url) {
  try {
    return new URL(url).host;
  } catch {
    return "custom";
  }
}
