// Per-coin token metadata. Every coin's on-chain URI is the short, fixed
// https://sow.fun/m/<mint>; the launch details (image, Kiva loan, borrower,
// and the creator's optional description / X / Telegram / website) are
// stored once at launch as coin-meta/<mint>.json in Vercel Blob.
//
// First write wins (Blob refuses overwrites), so a coin's details can't be
// swapped after launch. Whatever the creator leaves blank falls back to
// sow.fun defaults: website = the coin's sow.fun page, X = @sowfunhq.

import { PublicKey } from "@solana/web3.js";
import { CREATOR_FEE_PCT, IMPACT_FEE_PCT, OPS_FEE_PCT, SITE_URL } from "@/lib/launchpad";
import { X_LINK } from "@/lib/constants";

export interface CoinMeta {
  mint: string;
  name: string;
  symbol: string;
  image: string | null; // blob key (launch/<uuid>.<ext>), an https link, or null for the default logo
  loanId: number | null;
  borrower: string | null;
  creator: string | null;
  description: string | null;
  x: string | null; // https://x.com/<handle>
  telegram: string | null; // https://t.me/<name>
  website: string | null; // https URL
  createdAt: string;
}

export const COIN_META_PREFIX = "coin-meta/";
export const DESCRIPTION_MAX = 500;

export function coinMetaUri(mint: string): string {
  return `${SITE_URL}/m/${mint}`;
}

const isPubkey = (v: unknown): v is string => {
  if (typeof v !== "string") return false;
  try {
    new PublicKey(v);
    return true;
  } catch {
    return false;
  }
};

// Strip control characters and trim to a max length
const clean = (v: unknown, max: number): string | null => {
  if (typeof v !== "string") return null;
  // eslint-disable-next-line no-control-regex
  const s = v.replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, "").trim();
  return s ? s.slice(0, max) : null;
};

export function normalizeX(v: unknown): string | null | "invalid" {
  const s = clean(v, 120);
  if (!s) return null;
  const m = /^(?:https?:\/\/)?(?:www\.)?(?:x|twitter)\.com\/@?([A-Za-z0-9_]{1,15})\/?(?:\?.*)?$/i.exec(s) ?? /^@?([A-Za-z0-9_]{1,15})$/.exec(s);
  return m ? `https://x.com/${m[1]}` : "invalid";
}

export function normalizeTelegram(v: unknown): string | null | "invalid" {
  const s = clean(v, 120);
  if (!s) return null;
  const m = /^(?:https?:\/\/)?(?:t\.me|telegram\.me)\/([A-Za-z0-9_+]{3,64})\/?$/i.exec(s) ?? /^@([A-Za-z0-9_]{5,32})$/.exec(s);
  return m ? `https://t.me/${m[1]}` : "invalid";
}

export function normalizeWebsite(v: unknown): string | null | "invalid" {
  const s = clean(v, 200);
  if (!s) return null;
  try {
    const u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
    if (u.protocol !== "https:" && u.protocol !== "http:") return "invalid";
    if (!u.hostname.includes(".") || u.username || u.password) return "invalid";
    u.protocol = "https:";
    return u.toString();
  } catch {
    return "invalid";
  }
}

/** Validate a launch request into a CoinMeta, or return a user-facing error. */
export function validateCoinMeta(input: Record<string, unknown>): { meta: CoinMeta } | { error: string } {
  if (!isPubkey(input.mint)) return { error: "invalid mint" };
  const name = clean(input.name, 32);
  const symbol = clean(input.symbol, 10);
  if (!name || !symbol) return { error: "name and ticker are required" };
  // An uploaded blob key, or an https image link (e.g. the borrower's Kiva photo)
  const image = clean(input.image, 300);
  if (image && !/^launch\/[0-9a-f-]{36}\.(png|jpg|webp|gif)$/.test(image)) {
    const link = normalizeWebsite(image);
    if (link === "invalid" || !link || !/^https:\/\//.test(image)) return { error: "image must be an upload or an https link" };
  }
  const loanId = Number(input.loanId);
  const x = normalizeX(input.x);
  if (x === "invalid") return { error: "X link should look like x.com/yourhandle or @yourhandle" };
  const telegram = normalizeTelegram(input.telegram);
  if (telegram === "invalid") return { error: "Telegram link should look like t.me/yourgroup" };
  const website = normalizeWebsite(input.website);
  if (website === "invalid") return { error: "Website should be a full link like https://example.com" };
  return {
    meta: {
      mint: input.mint,
      name,
      symbol,
      image: image ?? null,
      loanId: Number.isInteger(loanId) && loanId > 0 ? loanId : null,
      borrower: clean(input.borrower, 60),
      creator: isPubkey(input.creator) ? input.creator : null,
      description: clean(input.description, DESCRIPTION_MAX),
      x,
      telegram,
      website,
      createdAt: new Date().toISOString(),
    },
  };
}

/** Stored launch details for a mint, or null if none were saved. */
export async function readCoinMeta(mint: string): Promise<CoinMeta | null> {
  const base = process.env.BLOB_BASE_URL;
  if (!base || !isPubkey(mint)) return null;
  try {
    const res = await fetch(`${base}/${COIN_META_PREFIX}${mint}.json`, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    return (await res.json()) as CoinMeta;
  } catch {
    return null;
  }
}

function imageUrl(key: string | null): string {
  if (!key) return `${SITE_URL}/sow-logo.png`;
  return key.startsWith("http") ? key : `${process.env.BLOB_BASE_URL ?? ""}/${key}`;
}

/**
 * Metaplex-shaped JSON that wallets, explorers and DEX screeners read.
 * Socials go in both the top-level fields and `extensions`, since indexers
 * differ on which they read.
 */
export function buildTokenJson(meta: Pick<CoinMeta, "mint" | "name" | "symbol" | "image" | "loanId" | "borrower" | "description" | "x" | "telegram" | "website">) {
  const impact = meta.loanId
    ? `Trading fees help fund ${meta.borrower ?? "a borrower"}'s Kiva loan (kiva.org/lend/${meta.loanId}) through the sow.fun launchpad.`
    : "Launched on the sow.fun launchpad - trading fees fund Kiva microloans.";
  const split = `Fee split: ${CREATOR_FEE_PCT}% creator / ${IMPACT_FEE_PCT}% Kiva loans / ${OPS_FEE_PCT}% operations - locked at launch.`;
  const coinPage = `${SITE_URL}/t/${meta.mint}`;
  const website = meta.website ?? coinPage;
  const twitter = meta.x ?? X_LINK;
  return {
    name: meta.name,
    symbol: meta.symbol,
    description: meta.description ? `${meta.description}\n\n${impact} ${split}` : `${impact} ${split}`,
    image: imageUrl(meta.image),
    external_url: website,
    website,
    twitter,
    ...(meta.telegram ? { telegram: meta.telegram } : {}),
    extensions: {
      website,
      twitter,
      ...(meta.telegram ? { telegram: meta.telegram } : {}),
      sowfun: coinPage,
    },
    createdOn: SITE_URL,
    attributes: [
      ...(meta.loanId ? [{ trait_type: "Kiva Loan", value: String(meta.loanId) }] : []),
      ...(meta.borrower ? [{ trait_type: "Borrower", value: meta.borrower }] : []),
      { trait_type: "Impact Split", value: `${CREATOR_FEE_PCT}/${IMPACT_FEE_PCT}/${OPS_FEE_PCT}` },
      { trait_type: "Launchpad", value: "sow.fun" },
    ],
  };
}
