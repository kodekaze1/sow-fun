import { NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { buildTokenJson, readCoinMeta } from "@/lib/coin-meta";
import delistedJson from "@/data/delisted.json";

// Delisted coins (data/delisted.json) keep working in wallets but lose the
// creator's description and links - we never serve abusive text from sow.fun.
const DELISTED = new Set<string>(delistedJson as string[]);

// The on-chain metadata URI of every coin launched on sow.fun:
// https://sow.fun/m/<mint>. Serves Metaplex-shaped JSON from the details
// saved at launch. Every real launch (site or genesis script) saves those
// details first, so a mint without them was not launched through sow.fun -
// anyone can point a token's URI here, and we must not lend it our logo,
// links or name. Those get a 404, never sow.fun branding.

export async function GET(_request: Request, { params }: { params: Promise<{ mint: string }> }) {
  const { mint } = await params;
  let mintKey: PublicKey;
  try {
    mintKey = new PublicKey(mint);
  } catch {
    return NextResponse.json({ error: "invalid mint" }, { status: 400 });
  }

  const stored = await readCoinMeta(mintKey.toBase58());
  if (!stored) {
    return NextResponse.json({ error: "not a sow.fun coin" }, { status: 404, headers: { "Cache-Control": "no-store" } });
  }
  const safe = DELISTED.has(stored.mint) ? { ...stored, description: null, x: null, telegram: null, website: null } : stored;
  return NextResponse.json(buildTokenJson(safe), { headers: { "Cache-Control": "public, max-age=300, s-maxage=3600" } });
}
