// Operator borrower picks, set from the /admin Command Center and stored in
// Vercel Blob (live at once - no commit or deploy). Merged with the committed
// data/successions.json. A coin's fees fund, in order: its launch borrower,
// the creator's on-chain queue, then these picks (lib/coin-plans).
//
// Every change is a new versioned blob (successions/<mint>/<loanId>/<ts>.json);
// the newest version per (mint, loan) wins, and "removed" hides a pick.

import { list, put } from "@vercel/blob";
import { revalidateTag, unstable_cache } from "next/cache";
import successionsJson from "@/data/successions.json";
import type { Succession } from "@/lib/impact-ledger";

interface StoredPick extends Succession {
  removed?: boolean;
  saved_at: string;
}

const PREFIX = "successions/";
const TAG = "successions";

async function load(): Promise<StoredPick[]> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return [];
  const blobs: { pathname: string; url: string; uploadedAt: Date }[] = [];
  let cursor: string | undefined;
  do {
    const page = await list({ prefix: PREFIX, cursor, limit: 1000 });
    blobs.push(...page.blobs);
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  // newest version per mint/loan
  const latest = new Map<string, { url: string; at: number }>();
  for (const b of blobs) {
    const [mint, loan] = b.pathname.slice(PREFIX.length).split("/");
    const k = `${mint}/${loan}`;
    const at = new Date(b.uploadedAt).getTime();
    if (!latest.has(k) || at > latest.get(k)!.at) latest.set(k, { url: b.url, at });
  }
  const docs = await Promise.all(
    [...latest.values()].map(({ url }) => fetch(url, { cache: "no-store" }).then((r) => (r.ok ? (r.json() as Promise<StoredPick>) : null)).catch(() => null))
  );
  return docs.filter((d): d is StoredPick => d !== null);
}

const loadCached = unstable_cache(load, ["successions"], { revalidate: 300, tags: [TAG] });

/** Committed successions + live operator picks, minus removed ones. */
export async function getAllSuccessions(): Promise<Succession[]> {
  let stored: StoredPick[] = [];
  try {
    stored = await loadCached();
  } catch {
    stored = await load().catch(() => []);
  }
  const committed = successionsJson as Succession[];
  const key = (s: Succession) => `${s.mint}/${s.to_loan_id}`;
  const removed = new Set(stored.filter((s) => s.removed).map(key));
  const live = stored.filter((s) => !s.removed);
  const liveKeys = new Set(live.map(key));
  return [...committed.filter((s) => !removed.has(key(s)) && !liveKeys.has(key(s))), ...live];
}

export async function getSuccessionChainLive(mint: string): Promise<Succession[]> {
  return (await getAllSuccessions()).filter((s) => s.mint === mint).sort((a, b) => a.adopted_at.localeCompare(b.adopted_at));
}

export async function saveOperatorPick(pick: Succession, removed = false): Promise<void> {
  const record: StoredPick = { ...pick, ...(removed ? { removed: true } : {}), saved_at: new Date().toISOString() };
  await put(`${PREFIX}${pick.mint}/${pick.to_loan_id}/${Date.now()}.json`, JSON.stringify(record), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: false,
  });
  try {
    revalidateTag(TAG, { expire: 0 });
  } catch {
    /* outside a request */
  }
}
