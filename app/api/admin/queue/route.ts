import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { kivaGQL, searchFundraisingLoans } from "@/lib/kiva-graphql";
import { getSuccessionChainLive, saveOperatorPick } from "@/lib/succession-store";

// Operator borrower queue for a coin (/admin):
//   GET  ?mint=&loan=<launch loan id>&q=  -> candidates: fundraising Kiva loans in
//        the launch borrower's sector (the fallback rule), plus the coin's picks
//   POST { mint, loanId, borrower, fromLoanId, remove? } -> add / remove a pick

export async function GET(request: Request) {
  if (!isAdmin(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const url = new URL(request.url);
  const mint = url.searchParams.get("mint") ?? "";
  const loan = Number(url.searchParams.get("loan"));
  const q = (url.searchParams.get("q") ?? "").slice(0, 60);
  let sector: string | null = null;
  let sectorId: number | null = null;
  if (Number.isInteger(loan) && loan > 0) {
    const d = await kivaGQL<{ lend: { loan: { sector?: { id?: number; name?: string } | null } | null } }>(`{lend{loan(id:${loan}){sector{id name}}}}`, 3600).catch(() => null);
    sector = d?.lend.loan?.sector?.name ?? null;
    sectorId = d?.lend.loan?.sector?.id ?? null;
  }
  const [candidates, picks] = await Promise.all([
    searchFundraisingLoans({ ...(sectorId && !q ? { sector: sectorId } : {}), ...(q ? { q } : {}), sort: "expiringSoon" }, 24).catch(() => []),
    mint ? getSuccessionChainLive(mint) : Promise.resolve([]),
  ]);
  return NextResponse.json({ sector, candidates, picks });
}

export async function POST(request: Request) {
  if (!isAdmin(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null);
  const mint = String(body?.mint ?? "");
  const loanId = Number(body?.loanId);
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(mint) || !Number.isInteger(loanId) || loanId <= 0) {
    return NextResponse.json({ error: "invalid coin or loan" }, { status: 400 });
  }
  await saveOperatorPick(
    {
      mint,
      from_loan_id: Number(body?.fromLoanId) || 0,
      to_loan_id: loanId,
      borrower: String(body?.borrower ?? `Loan #${loanId}`).slice(0, 80),
      memo_tx: "",
      adopted_at: new Date().toISOString(),
      note: "operator pick (/admin)",
    },
    !!body?.remove
  );
  return NextResponse.json({ ok: true });
}
