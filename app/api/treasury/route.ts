import { NextResponse } from "next/server";

export async function GET() {
  const wallet = process.env.NEXT_PUBLIC_TREASURY_WALLET || "11111111111111111111111111111112";
  const rpc = process.env.NEXT_PUBLIC_SOLANA_RPC || "https://api.mainnet-beta.solana.com";

  try {
    const res = await fetch(rpc, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getBalance",
        params: [wallet],
      }),
      next: { revalidate: 60 },
    });

    const data = await res.json();
    const lamports = data?.result?.value ?? 0;
    const sol = lamports / 1e9;

    return NextResponse.json({
      wallet,
      sol: sol.toFixed(4),
      usd: (sol * 148).toFixed(2), // approx price
      lamports,
    });
  } catch {
    return NextResponse.json({ wallet, sol: "0.0000", usd: "0.00", lamports: 0 });
  }
}
