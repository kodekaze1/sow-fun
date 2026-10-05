import { NextResponse } from "next/server";
import { serverRpcUrl } from "@/lib/rpc-server";

// Same-origin JSON-RPC proxy for the browser wallet connection. Keeps the
// Helius key server-side and only forwards the read/send methods the app
// actually uses, so the endpoint can't be borrowed as a general RPC.

const ALLOWED_METHODS = new Set([
  "getAccountInfo",
  "getBalance",
  "getBlockHeight",
  "getEpochInfo",
  "getFeeForMessage",
  "getGenesisHash",
  "getLatestBlockhash",
  "getMinimumBalanceForRentExemption",
  "getMultipleAccounts",
  "getProgramAccounts",
  "getRecentPrioritizationFees",
  "getSignatureStatuses",
  "getSignaturesForAddress",
  "getSlot",
  "getTokenAccountBalance",
  "getTokenAccountsByOwner",
  "getTokenSupply",
  "getTransaction",
  "getVersion",
  "isBlockhashValid",
  "sendTransaction",
  "simulateTransaction",
]);

const MAX_BODY_BYTES = 256 * 1024;
const MAX_BATCH = 20;

type RpcCall = { jsonrpc?: string; id?: unknown; method?: unknown; params?: unknown };

function rejectReason(call: RpcCall): string | null {
  if (typeof call.method !== "string" || !ALLOWED_METHODS.has(call.method)) {
    return `method not allowed: ${String(call.method)}`;
  }
  // Unfiltered program scans are expensive - require at least one filter.
  if (call.method === "getProgramAccounts") {
    const opts = Array.isArray(call.params) ? (call.params[1] as { filters?: unknown[] } | undefined) : undefined;
    if (!opts?.filters?.length) return "getProgramAccounts requires filters";
  }
  return null;
}

function allowedOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true; // same-origin fetches from some browsers omit it
  try {
    const host = new URL(origin).hostname;
    return (
      host === "sow.fun" ||
      host === "www.sow.fun" ||
      host === "localhost" ||
      host === "127.0.0.1" ||
      host.endsWith(".vercel.app")
    );
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  if (!allowedOrigin(req)) {
    return NextResponse.json({ error: "origin not allowed" }, { status: 403 });
  }

  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "request too large" }, { status: 413 });
  }

  let body: RpcCall | RpcCall[];
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "parse error" } }, { status: 400 });
  }

  const calls = Array.isArray(body) ? body : [body];
  if (calls.length === 0 || calls.length > MAX_BATCH) {
    return NextResponse.json({ error: "bad batch size" }, { status: 400 });
  }
  for (const call of calls) {
    const reason = rejectReason(call);
    if (reason) {
      return NextResponse.json(
        { jsonrpc: "2.0", id: call.id ?? null, error: { code: -32601, message: reason } },
        { status: 403 }
      );
    }
  }

  const upstream = await fetch(serverRpcUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: raw,
    cache: "no-store",
  });
  const text = await upstream.text();
  return new NextResponse(text, {
    status: upstream.status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
