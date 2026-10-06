import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { getHarvestRecordsFresh, saveHarvestRecord, type HarvestRecord } from "@/lib/harvest-auto";

// Operator edits to harvest records from /admin: assign a "review" loan to a
// coin, correct an amount, ignore a loan that isn't harvest money, or add a
// second lending to a loan that was already recorded. Each save is a new
// version - the history of every change stays in Blob.

const STATUSES = new Set<HarvestRecord["status"]>(["auto", "confirmed", "review", "ignored"]);

export async function POST(request: Request) {
  if (!isAdmin(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const kivaId = String(body.kiva_id ?? "");
  if (!/^\d{4,10}$/.test(kivaId)) return NextResponse.json({ error: "invalid Kiva loan id" }, { status: 400 });
  const status = body.status as HarvestRecord["status"];
  if (!STATUSES.has(status)) return NextResponse.json({ error: "invalid status" }, { status: 400 });
  const cents = Number(body.uplift_cents);
  if (!Number.isInteger(cents) || cents < 0 || cents > 10_000_000) return NextResponse.json({ error: "invalid amount" }, { status: 400 });
  const role = body.role === "pledge" || body.role === "excess" ? body.role : null;
  const mint = typeof body.mint === "string" && body.mint.length >= 32 && body.mint.length <= 44 ? body.mint : null;
  if (status === "confirmed" && (!mint || !role || cents <= 0)) {
    return NextResponse.json({ error: "a confirmed loan needs a coin, a role and an amount" }, { status: 400 });
  }

  const existing = (await getHarvestRecordsFresh()).find((r) => r.kiva_id === kivaId);
  const now = new Date().toISOString();
  const record: HarvestRecord = {
    kiva_id: kivaId,
    status,
    borrower: typeof body.borrower === "string" && body.borrower ? body.borrower.slice(0, 80) : existing?.borrower ?? `Loan #${kivaId}`,
    location: typeof body.location === "string" ? body.location.slice(0, 60) : existing?.location ?? "",
    photo_url: existing?.photo_url ?? null,
    total_loan_cents: existing?.total_loan_cents ?? 0,
    uplift_cents: cents,
    mint,
    symbol: typeof body.symbol === "string" ? body.symbol.slice(0, 10) : existing?.symbol ?? null,
    role,
    detected_at: existing?.detected_at ?? now,
    updated_at: now,
    ...(typeof body.note === "string" && body.note ? { note: body.note.slice(0, 200) } : {}),
  };
  await saveHarvestRecord(record);
  return NextResponse.json({ ok: true, record });
}
