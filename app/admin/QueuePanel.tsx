"use client";
import { useState } from "react";

// One coin's borrower queue in the Command Center: who its fees fund now,
// the queue after that (creator's on-chain picks, then operator picks), money
// waiting with no eligible borrower, and a picker of same-sector Kiva loans
// for operator picks (saved live - lib/succession-store).

interface QueueEntry {
  loanId: number;
  name: string | null;
  remainingCents: number;
  status: "fund" | "waiting" | "closed" | "taken" | "unknown";
  cents: number;
  takenBy?: string;
}

export interface QueueRow {
  mint: string | null;
  symbol: string;
  loanId: number | null;
  borrower: { id: number; name: string; status: string; remaining: number } | null;
  operatorPicks?: number[];
  plan: {
    pledge: { loanId: number; name: string | null; cents: number } | null;
    queue: QueueEntry[];
    waitingCents: number;
    fallbackAt: string | null;
    skimCents: number;
    availableCents: number;
  } | null;
}

interface Candidate {
  id: number;
  name: string;
  country: string;
  sector: string;
  activity: string;
  remaining: number;
  image: string | null;
  expiresAt: string | null;
}

const usd = (c: number) => `$${(c / 100).toFixed(2)}`;
const STATUS: Record<QueueEntry["status"], string> = {
  fund: "funds next",
  waiting: "open - waiting for money",
  closed: "loan closed - skipped",
  taken: "held by another coin - skipped",
  unknown: "unknown",
};

export default function QueuePanel({ row, adminKey, onChanged }: { row: QueueRow; adminKey: string; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("expiringSoon");
  const [sector, setSector] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<Candidate[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const picks = new Set(row.operatorPicks ?? []);
  const plan = row.plan;
  const queued = new Set((plan?.queue ?? []).map((e) => e.loanId));

  const search = async (query = q, sortBy = sort) => {
    setBusy("search");
    setErr(null);
    try {
      const res = await fetch(`/api/admin/queue?mint=${row.mint}&loan=${row.loanId ?? ""}&q=${encodeURIComponent(query)}&sort=${sortBy}`, { headers: { "x-admin-key": adminKey } });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "search failed");
      setSector(json.sector);
      setCandidates(json.candidates);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "search failed");
    } finally {
      setBusy(null);
    }
  };

  const change = async (loanId: number, borrower: string, remove = false) => {
    setBusy(String(loanId));
    setErr(null);
    try {
      const res = await fetch("/api/admin/queue", {
        method: "POST",
        headers: { "content-type": "application/json", "x-admin-key": adminKey },
        body: JSON.stringify({ mint: row.mint, loanId, borrower, fromLoanId: row.loanId, remove }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "save failed");
      onChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "save failed");
    } finally {
      setBusy(null);
    }
  };

  const launchOpen = row.borrower?.status === "fundraising" && row.borrower.remaining > 0;
  return (
    <div className="rounded-2xl border border-[#E4EBE7] bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm">
          <b className="text-[#223829]">${row.symbol}</b>
          <span className="text-gray-500">
            {" "}· launch borrower{" "}
            {row.borrower ? (
              <a href={`https://www.kiva.org/lend/${row.borrower.id}`} target="_blank" rel="noopener noreferrer" className="font-semibold hover:underline">{row.borrower.name}</a>
            ) : "-"}{" "}
            {row.borrower && <span className={launchOpen ? "text-[#276A43] font-bold" : "text-gray-400"}>({launchOpen ? `$${row.borrower.remaining.toFixed(0)} to go - gets this coin's money first` : row.borrower.status})</span>}
          </span>
        </div>
        <button onClick={() => { setOpen(!open); if (!open && !candidates) search(""); }} className="text-[12px] font-bold text-[#276A43] hover:underline">
          {open ? "Close" : "+ Add borrower"}
        </button>
      </div>

      {plan && plan.waitingCents > 0 && (
        <div className="mt-2 rounded-lg bg-[#F8F2E6] text-[#996210] text-[12px] px-3 py-2">
          <b>{usd(plan.waitingCents)} waiting for a borrower.</b>{" "}
          {plan.fallbackAt
            ? new Date(plan.fallbackAt) < new Date()
              ? "The creator's window has passed - add a same-sector borrower below."
              : `The creator has until ${new Date(plan.fallbackAt).toLocaleString()} to queue one; you can add one now too.`
            : "Add a borrower below so it can be lent."}
        </div>
      )}

      <ol className="mt-2 flex flex-col gap-1 text-[12px]">
        {(plan?.queue ?? []).map((e, i) => (
          <li key={e.loanId} className="flex flex-wrap items-center gap-2">
            <span className="text-gray-400 w-4">{i + 1}.</span>
            <a href={`https://www.kiva.org/lend/${e.loanId}`} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#223829] hover:underline">{e.name ?? `#${e.loanId}`}</a>
            <span className="text-gray-400">{picks.has(e.loanId) ? "operator" : "creator"} · {STATUS[e.status]}{e.takenBy ? ` (${e.takenBy})` : ""}</span>
            {e.cents > 0 && <b className="text-[#276A43]">lend {usd(e.cents)}</b>}
            {picks.has(e.loanId) && (
              <button disabled={busy === String(e.loanId)} onClick={() => change(e.loanId, e.name ?? "", true)} className="text-gray-400 hover:text-red-600 font-bold">remove</button>
            )}
          </li>
        ))}
        {!plan?.queue.length && <li className="text-gray-400">No queue yet - after the launch borrower, nothing is lined up.</li>}
      </ol>

      {open && (
        <div className="mt-3 border-t border-gray-100 pt-3">
          <div className="flex flex-wrap items-center gap-2 mb-2 text-[12px]">
            <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && search()}
              placeholder={sector ? `${sector} borrowers - or search anything` : "Search Kiva borrowers"} className="flex-1 min-w-[200px] rounded-lg border border-[#D9E6DF] px-2 py-1.5" />
            <button onClick={() => search()} className="font-bold text-[#276A43] hover:underline">Search</button>
            <select value={sort} onChange={(e) => { setSort(e.target.value); search(q, e.target.value); }} className="rounded-lg border border-[#D9E6DF] px-2 py-1.5 font-bold">
              <option value="expiringSoon">Ending soon</option>
              <option value="amountLeft">Almost funded</option>
              <option value="popularity">Recommended</option>
              <option value="newest">Most recent</option>
            </select>
            {sector && !q && <span className="text-gray-400">Same sector as the launch borrower ({sector})</span>}
          </div>
          {busy === "search" && <div className="text-[12px] text-gray-400">Searching Kiva...</div>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {(candidates ?? []).map((c) => (
              <div key={c.id} className="flex items-center gap-2 rounded-xl border border-[#E4EBE7] p-2">
                {c.image && <img src={c.image} alt="" className="w-10 h-10 rounded-lg object-cover" />}
                <div className="flex-1 min-w-0 text-[12px]">
                  <a href={`https://www.kiva.org/lend/${c.id}`} target="_blank" rel="noopener noreferrer" className="font-bold text-[#223829] hover:underline">{c.name}</a>
                  <div className="text-gray-500 truncate">{c.country} · {c.activity} · ${c.remaining.toFixed(0)} to go</div>
                </div>
                {queued.has(c.id) ? (
                  <span className="text-[11px] text-gray-400 font-bold">queued</span>
                ) : (
                  <button disabled={busy === String(c.id)} onClick={() => change(c.id, c.name)}
                    className="rounded-full bg-[#276A43] hover:bg-[#223829] text-white font-bold px-3 py-1 text-[11px] disabled:opacity-50">
                    {busy === String(c.id) ? "..." : "Add"}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      {err && <div className="mt-2 text-[12px] text-red-600">{err}</div>}
    </div>
  );
}
