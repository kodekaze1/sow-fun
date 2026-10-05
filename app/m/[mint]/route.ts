import { NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { buildTokenJson, readCoinMeta } from "@/lib/coin-meta";
import { getDbcClient, metadataPda, parseMetadata } from "@/lib/launchpad-onchain";
import delistedJson from "@/data/delisted.json";

// Delisted coins (data/delisted.json) keep working in wallets but lose the
// creator's description and links - we never serve abusive text from sow.fun.
const DELISTED = new Set<string>(delistedJson as string[]);

// The on-chain metadata URI of every coin launched on sow.fun:
// https://sow.fun/m/<mint>. Serves Metaplex-shaped JSON from the details
// saved at launch; if those are missing, falls back to the on-chain name and
// symbol with sow.fun defaults so wallets never see a broken token.

export async function GET(_request: Request, { params }: { params: Promise<{ mint: string }> }) {
  const { mint } = await params;
  let mintKey: PublicKey;
  try {
    mintKey = new PublicKey(mint);
  } catch {
    return NextResponse.json({ error: "invalid mint" }, { status: 400 });
  }

  const headers = { "Cache-Control": "public, max-age=300, s-maxage=3600" };
  const stored = await readCoinMeta(mintKey.toBase58());
  if (stored) {
    const safe = DELISTED.has(stored.mint) ? { ...stored, description: null, x: null, telegram: null, website: null } : stored;
    return NextResponse.json(buildTokenJson(safe), { headers });
  }

  try {
    const { connection } = getDbcClient();
    const info = await connection.getAccountInfo(metadataPda(mintKey));
    if (!info?.data) return NextResponse.json({ error: "unknown token" }, { status: 404 });
    const onChain = parseMetadata(info.data as Buffer);
    return NextResponse.json(
      buildTokenJson({
        mint: mintKey.toBase58(),
        name: onChain.name,
        symbol: onChain.symbol,
        image: null,
        loanId: null,
        borrower: null,
        description: null,
        x: null,
        telegram: null,
        website: null,
      }),
      { headers }
    );
  } catch {
    return NextResponse.json({ error: "metadata unavailable" }, { status: 503 });
  }
}
