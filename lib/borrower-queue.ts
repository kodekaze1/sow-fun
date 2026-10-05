// Creator borrower queues, read straight from the chain.
//
// A creator sets their coin's queue from /my by signing a free Memo-program
// transaction:   sow-queue:{"mint":"<coin mint>","loans":[<kiva id>, ...]}
// The latest valid memo per mint wins. Legacy single adoptions
// (sow-adopt:{"mint","loan","name"}) count as a one-entry queue.
//
// A memo only counts if the coin's creator wallet SIGNED the transaction and
// it succeeded - anyone can mention a wallet in a memo, only the creator can
// sign as it. No operator step: the chain is the record.

import { Connection, PublicKey } from "@solana/web3.js";

export const MAX_QUEUE = 5;
const MEMO_PREFIXES = ["sow-queue:", "sow-adopt:"] as const;
const SIGNATURE_SCAN_LIMIT = 300;
const CACHE_MS = 60_000;

export interface CoinQueue {
  mint: string;
  loans: number[];
  memoTx: string;
  setAt: number | null; // unix seconds
}

type ParsedMemo = { mint: string; loans: number[] };

export function parseQueueMemo(raw: string): ParsedMemo | null {
  // RPC memo fields look like "[42] sow-queue:{...}"; several memos join with "; "
  for (const part of raw.split("; ")) {
    const text = part.replace(/^\[\d+\]\s*/, "").trim();
    const prefix = MEMO_PREFIXES.find((p) => text.startsWith(p));
    if (!prefix) continue;
    try {
      const body = JSON.parse(text.slice(prefix.length)) as { mint?: unknown; loans?: unknown; loan?: unknown };
      if (typeof body.mint !== "string") continue;
      new PublicKey(body.mint);
      const ids = prefix === "sow-adopt:" ? [body.loan] : Array.isArray(body.loans) ? body.loans : [];
      const loans = [...new Set(ids.map((x) => Number(x)).filter((n) => Number.isInteger(n) && n > 0))].slice(0, MAX_QUEUE);
      return { mint: body.mint, loans };
    } catch {
      continue;
    }
  }
  return null;
}

export function buildQueueMemo(mint: string, loans: number[]): string {
  return `sow-queue:${JSON.stringify({ mint, loans: loans.slice(0, MAX_QUEUE) })}`;
}

const cache = new Map<string, { at: number; queues: Map<string, CoinQueue> }>();

/** Latest verified queue per coin mint for one creator wallet. */
export async function getCreatorQueues(connection: Connection, creator: string): Promise<Map<string, CoinQueue>> {
  const hit = cache.get(creator);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.queues;

  const creatorKey = new PublicKey(creator);
  const sigs = await connection.getSignaturesForAddress(creatorKey, { limit: SIGNATURE_SCAN_LIMIT });
  // Newest first: the first verified memo per mint is the live queue
  const candidates = sigs
    .filter((s) => !s.err && s.memo && MEMO_PREFIXES.some((p) => s.memo!.includes(p)))
    .map((s) => ({ sig: s.signature, blockTime: s.blockTime ?? null, memo: parseQueueMemo(s.memo!) }))
    .filter((c): c is { sig: string; blockTime: number | null; memo: ParsedMemo } => c.memo !== null);

  const queues = new Map<string, CoinQueue>();
  for (const c of candidates) {
    if (queues.has(c.memo.mint)) continue;
    const tx = await connection.getTransaction(c.sig, { maxSupportedTransactionVersion: 0 }).catch(() => null);
    if (!tx || tx.meta?.err) continue;
    const msg = tx.transaction.message;
    const signers = msg.staticAccountKeys.slice(0, msg.header.numRequiredSignatures);
    if (!signers.some((k) => k.equals(creatorKey))) continue;
    queues.set(c.memo.mint, { mint: c.memo.mint, loans: c.memo.loans, memoTx: c.sig, setAt: c.blockTime });
  }

  cache.set(creator, { at: Date.now(), queues });
  return queues;
}
