import { NextResponse } from "next/server";
import { serverRpcUrl } from "@/lib/rpc-server";
import { fromOurSite, rateLimit } from "@/lib/rate-limit";

// Same-origin JSON-RPC proxy for the browser wallet connection. Keeps the
// Helius key server-side and only forwards the read/send methods the browser
// actually uses (wallet adapter, DBC create/claim, DAMM v2 position claims),
// so the endpoint can't be borrowed as a general RPC. Program scans and
// history lookups (getProgramAccounts, getSignaturesForAddress,
// getTransaction) run server-side only and are not proxied.

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
  "getRecentPrioritizationFees",
  "getSignatureStatuses",
  "getSlot",
  "getTokenAccountBalance",
  "getTokenAccountsByOwner",
  "getTokenSupply",
  "getVersion",
  "isBlockhashValid",
  "sendTransaction",
  "simulateTransaction",
]);

const MAX_BODY_BYTES = 256 * 1024;
// Per-IP, per-instance best-effort limits (see lib/rate-limit.ts)
const CALLS_PER_MINUTE = 120;
const SENDS_PER_MINUTE = 10;
const MAX_BATCH = 20;

type RpcCall = { jsonrpc?: string; id?: unknown; method?: unknown; params?: unknown };

function rejectReason(call: RpcCall): string | null {
  if (typeof call.method !== "string" || !ALLOWED_METHODS.has(call.method)) {
    return `method not allowed: ${String(call.method)}`;
  }
  return null;
}

export async function POST(req: Request) {
  if (!fromOurSite(req)) {
    return NextResponse.json({ error: "origin not allowed" }, { status: 403 });
  }
  if (!rateLimit(req, "rpc", CALLS_PER_MINUTE, 60_000)) {
    return NextResponse.json({ error: "rate limited" }, { status: 429 });
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
  const sends = calls.filter((c) => c.method === "sendTransaction").length;
  for (let i = 0; i < sends; i++) {
    if (!rateLimit(req, "rpc-send", SENDS_PER_MINUTE, 60_000)) {
      return NextResponse.json({ error: "rate limited" }, { status: 429 });
    }
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
