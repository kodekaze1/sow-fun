import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { PublicKey } from "@solana/web3.js";
import { fromOurSite, rateLimit } from "@/lib/rate-limit";
import { COIN_META_PREFIX, validateCoinMeta } from "@/lib/coin-meta";
import { getDbcClient } from "@/lib/launchpad-onchain";

// Saves a coin's launch details (image, Kiva loan, creator description and
// links) right before its pool is created. The coin's on-chain URI is
// sow.fun/m/<mint>, which serves these details.
//
// Write-once: Blob refuses overwrites, and a mint that already exists on
// chain is rejected, so nobody can attach details to someone else's coin.

const SAVES_PER_10_MIN = 10;

function isReservedBrand(name: string, symbol: string): boolean {
  const flat = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  return flat(symbol) === "sow" || flat(name) === "sow" || flat(name).includes("sowfun");
}
const MAX_BODY_BYTES = 4 * 1024;

export async function POST(request: Request) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: "metadata storage not configured" }, { status: 503 });
  }
  if (!fromOurSite(request)) {
    return NextResponse.json({ error: "origin not allowed" }, { status: 403 });
  }
  if (!rateLimit(request, "launch-meta", SAVES_PER_10_MIN, 10 * 60_000)) {
    return NextResponse.json({ error: "Too many launches - try again in a few minutes." }, { status: 429 });
  }
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "request too large" }, { status: 413 });
  }
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const result = validateCoinMeta(body);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  const { meta } = result;

  // The $SOW ticker and the sow.fun name are reserved for the official genesis
  // coin. The origin check above is only a browser courtesy (any script can
  // send an Origin header), so the genesis script proves itself with the
  // server-side admin key instead.
  if (isReservedBrand(meta.name, meta.symbol)) {
    const key = request.headers.get("x-admin-key");
    if (!process.env.ADMIN_KEY || key !== process.env.ADMIN_KEY) {
      return NextResponse.json({ error: "That name or ticker is reserved for the official $SOW - pick another." }, { status: 400 });
    }
  }

  // The mint must not exist yet: details are attached only to brand-new coins
  try {
    const { connection } = getDbcClient();
    const existing = await connection.getAccountInfo(new PublicKey(meta.mint));
    if (existing) {
      return NextResponse.json({ error: "that coin already exists" }, { status: 409 });
    }
  } catch {
    return NextResponse.json({ error: "could not verify the mint - try again" }, { status: 503 });
  }

  try {
    await put(`${COIN_META_PREFIX}${meta.mint}.json`, JSON.stringify(meta), {
      access: "public",
      contentType: "application/json",
      addRandomSuffix: false,
      allowOverwrite: false,
    });
  } catch {
    return NextResponse.json({ error: "details for this coin were already saved" }, { status: 409 });
  }
  return NextResponse.json({ ok: true });
}
