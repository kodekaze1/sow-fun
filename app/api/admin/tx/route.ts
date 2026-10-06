import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { buildClaim, buildFund, executePlan, type Plan } from "@/lib/admin-tx";
import { DBC_CONFIG_KEY } from "@/lib/launchpad";
import { TEST_CONFIGS } from "@/lib/constants";

// One-click money operations for /admin (see lib/admin-tx.ts).
//   { action: "build", kind: "claim" | "creator" | "fund", config, wallet, usd? }
//     -> unsigned transactions + sealed plan
//   { action: "execute", plan, mac, signed: [base64] }
//     -> sends, confirms, records the receipt
export const maxDuration = 60;

export async function POST(request: Request) {
  if (!isAdmin(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  const allowed = [DBC_CONFIG_KEY, ...TEST_CONFIGS.map((c) => c.key)].filter((c) => c && c.length >= 30);
  try {
    if (body.action === "build") {
      const config = String(body.config ?? "");
      if (!allowed.includes(config)) return NextResponse.json({ error: "unknown config" }, { status: 400 });
      const wallet = String(body.wallet ?? "");
      if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(wallet)) return NextResponse.json({ error: "connect a wallet" }, { status: 400 });
      if (body.kind === "claim" || body.kind === "creator") return NextResponse.json(await buildClaim(config, wallet, body.kind));
      if (body.kind === "fund") {
        const raw = Array.isArray(body.lends) ? body.lends.slice(0, 20) : [];
        const lends = raw
          .map((l: Record<string, unknown>) => ({
            loanId: Number(l.loanId),
            mint: String(l.mint ?? ""),
            symbol: String(l.symbol ?? "").slice(0, 10),
            role: l.role === "excess" ? ("excess" as const) : ("pledge" as const),
            cents: Number(l.cents),
            name: typeof l.name === "string" ? l.name.slice(0, 80) : null,
            at: new Date().toISOString(),
          }))
          .filter((l: { loanId: number; cents: number; mint: string }) => Number.isInteger(l.loanId) && l.loanId > 0 && Number.isInteger(l.cents) && l.cents > 0 && l.mint.length >= 32);
        return NextResponse.json(await buildFund(config, wallet, Number(body.usd), lends));
      }
      return NextResponse.json({ error: "unknown kind" }, { status: 400 });
    }
    if (body.action === "execute") {
      const signed = Array.isArray(body.signed) ? body.signed.map(String) : [];
      return NextResponse.json(await executePlan(body.plan as Plan, String(body.mac ?? ""), signed));
    }
    return NextResponse.json({ error: "unknown action" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "failed" }, { status: 400 });
  }
}
