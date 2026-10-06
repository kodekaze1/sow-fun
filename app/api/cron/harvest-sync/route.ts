import { NextResponse } from "next/server";
import { isCronOrAdmin } from "@/lib/admin-auth";
import { runHarvestSync } from "@/lib/harvest-sync";

// Records loans funded from the sowfun Kiva account as harvest records
// (lib/harvest-sync.ts). Run daily by Vercel Cron (vercel.json) and on demand
// from /admin, which also syncs every time it loads.
export const maxDuration = 60;

export async function GET(request: Request) {
  if (!isCronOrAdmin(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    return NextResponse.json(await runHarvestSync());
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "sync failed" }, { status: 500 });
  }
}
