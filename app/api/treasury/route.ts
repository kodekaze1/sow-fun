import { NextResponse } from "next/server";
import { TREASURY_WALLET } from "@/lib/constants";
import { SHOW_LIVE_TREASURY } from "@/lib/types";
import { serverRpcUrl } from "@/lib/rpc-server";

const WALLET = TREASURY_WALLET;
const RPC    = serverRpcUrl();

async function getSolPrice(): Promise<number> {
  try {
    const res  = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd",
      { next: { revalidate: 300 } }  // cache 5 min
    );
    const data = await res.json();
    return data?.solana?.usd ?? 130;
  } catch {
    return 130; // fallback if CoinGecko is down
  }
}

export async function GET() {
  // Pre-launch: never reveal a treasury address
  if (!SHOW_LIVE_TREASURY) return NextResponse.json({ prelaunch: true });
  try {
    const [balanceRes, solPrice] = await Promise.all([
      fetch(RPC, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id:      1,
          method:  "getBalance",
          params:  [WALLET],
        }),
        next: { revalidate: 60 },  // re-fetch every 60s
      }),
      getSolPrice(),
    ]);

    const data     = await balanceRes.json();
    const lamports = data?.result?.value ?? 0;
    const sol      = lamports / 1e9;

    return NextResponse.json({
      wallet:   WALLET,
      sol:      parseFloat(sol.toFixed(4)),
      balance:  parseFloat(sol.toFixed(4)),
      usd:      parseFloat((sol * solPrice).toFixed(2)),
      solPrice: parseFloat(solPrice.toFixed(2)),
      lamports,
    });
  } catch {
    return NextResponse.json({
      wallet:   WALLET,
      sol:      0,
      balance:  0,
      usd:      0,
      solPrice: 130,
      lamports: 0,
    });
  }
}
