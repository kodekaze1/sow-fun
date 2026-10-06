// Claim and card top-up receipts. Two sources, merged:
//   - data/claims/*.json   written by scripts/claim-fees.mjs and committed
//   - Blob claims/*.json   written by the Command Center's one-click claims
//   - Blob topups/*.json   written by the Command Center's one-click card funding
// The per-coin ledger (lib/coin-ledger) reads claims from here, so a claim
// made from /admin counts at once - no commit or deploy.

import fs from "node:fs";
import path from "node:path";
import { list, put } from "@vercel/blob";
import { revalidateTag, unstable_cache } from "next/cache";

export interface ClaimSnapshot {
  claimed_at: string;
  config?: string;
  treasury?: string;
  sol_price_usd: number | null;
  total_claimed_lamports?: string;
  total_claimed_sol?: number;
  pools: {
    source?: string;
    pool?: string;
    dbc_pool?: string;
    mint: string | null;
    name?: string | null;
    symbol?: string | null;
    kiva_loan_id?: number | null;
    claimed_lamports?: string;
    claimed_sol: number;
    tx?: string;
    explorer_url?: string;
  }[];
  launch_fees?: { pool: string; net_lamports: number; tx: string }[];
  splits?: { to: string; wallet: string; lamports?: string; sol: number; tx: string }[];
  via?: "script" | "admin";
}

export interface CardTopup {
  at: string;
  usd: number;
  from: string;
  card: string;
  sol_spent: number;
  swap_tx: string | null;
  send_tx: string;
}

const TAG = "claim-store";

function readFiles(): ClaimSnapshot[] {
  const dir = path.join(process.cwd(), "data", "claims");
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => ({ ...(JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")) as ClaimSnapshot), via: "script" as const }));
}

async function readBlobJson<T>(prefix: string): Promise<T[]> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return [];
  const urls: string[] = [];
  let cursor: string | undefined;
  do {
    const page = await list({ prefix, cursor, limit: 1000 });
    urls.push(...page.blobs.map((b) => b.url));
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  const docs = await Promise.all(
    urls.map((u) => fetch(u, { cache: "no-store" }).then((r) => (r.ok ? (r.json() as Promise<T>) : null)).catch(() => null))
  );
  return docs.filter((d): d is Awaited<T> => d !== null) as T[];
}

const loadBlobClaims = unstable_cache(() => readBlobJson<ClaimSnapshot>("claims/"), ["blob-claims"], { revalidate: 300, tags: [TAG] });
const loadTopups = unstable_cache(() => readBlobJson<CardTopup>("topups/"), ["blob-topups"], { revalidate: 300, tags: [TAG] });

/** Every claim snapshot (committed files + one-click claims), oldest first. */
export async function readAllClaimSnapshots(): Promise<ClaimSnapshot[]> {
  let blob: ClaimSnapshot[] = [];
  try {
    blob = await loadBlobClaims();
  } catch {
    blob = await readBlobJson<ClaimSnapshot>("claims/").catch(() => []);
  }
  const files = readFiles();
  const seen = new Set(files.map((f) => f.claimed_at));
  return [...files, ...blob.filter((b) => !seen.has(b.claimed_at))].sort((a, b) => a.claimed_at.localeCompare(b.claimed_at));
}

export async function readCardTopups(): Promise<CardTopup[]> {
  try {
    return (await loadTopups()).sort((a, b) => b.at.localeCompare(a.at));
  } catch {
    return [];
  }
}

function invalidate() {
  try {
    revalidateTag(TAG, { expire: 0 });
  } catch {
    /* outside a request */
  }
}

export async function saveClaimSnapshot(snap: ClaimSnapshot): Promise<void> {
  await put(`claims/claim-${snap.claimed_at.replace(/[:.]/g, "-")}.json`, JSON.stringify({ ...snap, via: "admin" }, null, 2), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: false,
  });
  invalidate();
}

export async function saveCardTopup(t: CardTopup): Promise<void> {
  await put(`topups/topup-${t.at.replace(/[:.]/g, "-")}.json`, JSON.stringify(t, null, 2), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: false,
  });
  invalidate();
}
