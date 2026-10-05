import { NextResponse } from "next/server";
import { IMPACT_CARD_ADDRESS } from "@/lib/constants";
import { serverRpcUrl } from "@/lib/rpc-server";

const RPC = serverRpcUrl();
const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

async function rpc(method: string, params: unknown[]) {
  const res = await fetch(RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    next: { revalidate: 60 },
  });
  const json = await res.json();
  return json.result;
}

export async function GET() {
  try {
    const [balance, tokenAccounts, signatures] = await Promise.all([
      rpc("getBalance", [IMPACT_CARD_ADDRESS]),
      rpc("getTokenAccountsByOwner", [
        IMPACT_CARD_ADDRESS,
        { mint: USDC_MINT },
        { encoding: "jsonParsed" },
      ]),
      rpc("getSignaturesForAddress", [IMPACT_CARD_ADDRESS, { limit: 6 }]),
    ]);

    const usdc = (tokenAccounts?.value ?? []).reduce(
      (sum: number, acc: { account: { data: { parsed: { info: { tokenAmount: { uiAmount: number | null } } } } } }) =>
        sum + (acc.account.data.parsed.info.tokenAmount.uiAmount ?? 0),
      0
    );

    return NextResponse.json({
      address: IMPACT_CARD_ADDRESS,
      sol: (balance?.value ?? 0) / 1e9,
      usdc,
      recent: (signatures ?? []).map((s: { signature: string; blockTime?: number | null }) => ({
        signature: s.signature,
        blockTime: s.blockTime ?? null,
      })),
    });
  } catch {
    return NextResponse.json({ address: IMPACT_CARD_ADDRESS, sol: 0, usdc: 0, recent: [] }, { status: 502 });
  }
}
