"use client";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

export interface BoardItem {
  mint: string;
  name: string;
  symbol: string;
  image: string | null;
  borrower: string | null;
  flag: string;
  loanAmount: number;
  pct: number; // funded + reserved, of the loan
  remaining: number; // still open on Kiva ($)
  done: boolean; // funded, or fully covered by basket reservations
  raising: boolean; // loan still open
  earnedUsd: number; // loan share of lifetime fees
  marketCapUsd: number | null;
  migrated: boolean;
  launchedAt: number | null;
}

type Sort = "mcap" | "new" | "raised" | "almost";
type Filter = "all" | "raising" | "almost" | "funded" | "graduated";

const SORTS: [Sort, string][] = [
  ["mcap", "Market cap"],
  ["new", "Newest"],
  ["raised", "Most raised for loans"],
  ["almost", "Almost funded"],
];
const FILTERS: [Filter, string][] = [
  ["all", "All"],
  ["raising", "Raising"],
  ["almost", "Almost funded"],
  ["funded", "Funded"],
  ["graduated", "Graduated"],
];

// Accent-insensitive search: "oney" finds "Öney"
const fold = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

const isAlmost = (i: BoardItem) => i.raising && (i.remaining <= 100 || i.pct >= 80);

function usd(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `$${(n / 1000).toFixed(0)}K`;
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

export default function LaunchesBoard({ items }: { items: BoardItem[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  // Local state drives the board instantly; the URL mirrors it so a filtered
  // view can be shared (and is restored on load).
  const [q, setQ] = useState(params.get("q") ?? "");
  const [sort, setSort] = useState<Sort>((SORTS.find(([k]) => k === params.get("sort"))?.[0] ?? "mcap") as Sort);
  const [filter, setFilter] = useState<Filter>((FILTERS.find(([k]) => k === params.get("filter"))?.[0] ?? "all") as Filter);

  useEffect(() => {
    const t = setTimeout(() => {
      const next = new URLSearchParams();
      if (q.trim()) next.set("q", q.trim());
      if (sort !== "mcap") next.set("sort", sort);
      if (filter !== "all") next.set("filter", filter);
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }, 300);
    return () => clearTimeout(t);
  }, [q, sort, filter, pathname, router]);

  const set = (key: string, value: string) => {
    if (key === "q") setQ(value);
    else if (key === "sort") setSort(value as Sort);
    else if (key === "filter") setFilter(value as Filter);
  };

  const visible = useMemo(() => {
    const needle = fold(q.trim());
    let list = items.filter((i) => {
      if (needle && ![i.name, i.symbol, i.borrower ?? ""].some((s) => fold(s).includes(needle))) return false;
      if (filter === "raising") return i.raising;
      if (filter === "almost") return isAlmost(i);
      if (filter === "funded") return i.done;
      if (filter === "graduated") return i.migrated;
      return true;
    });
    list = [...list].sort((a, b) => {
      if (sort === "new") return (b.launchedAt ?? 0) - (a.launchedAt ?? 0);
      if (sort === "raised") return b.earnedUsd - a.earnedUsd;
      if (sort === "almost") {
        // Still-raising loans first, smallest gap first
        const ga = a.raising ? a.remaining : Number.POSITIVE_INFINITY;
        const gb = b.raising ? b.remaining : Number.POSITIVE_INFINITY;
        return ga - gb;
      }
      return (b.marketCapUsd ?? -1) - (a.marketCapUsd ?? -1);
    });
    return list;
  }, [items, q, sort, filter]);

  return (
    <>
      <div className="flex flex-col gap-3 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <label htmlFor="launch-search" className="sr-only">Search launches</label>
          <input
            id="launch-search"
            value={q}
            onChange={(e) => set("q", e.target.value)}
            placeholder="Search coin, ticker or borrower"
            className="flex-1 rounded-full border border-[#D9E6DF] px-5 py-2.5 text-sm focus:outline-none focus:border-[#276A43]"
          />
          <label htmlFor="launch-sort" className="sr-only">Sort</label>
          <select
            id="launch-sort"
            value={sort}
            onChange={(e) => set("sort", e.target.value)}
            className="rounded-full border border-[#D9E6DF] bg-white px-4 py-2.5 text-sm font-bold text-[#223829] focus:outline-none focus:border-[#276A43]"
          >
            {SORTS.map(([k, label]) => (
              <option key={k} value={k}>Sort: {label}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap gap-2">
          {FILTERS.map(([k, label]) => (
            <button
              key={k}
              onClick={() => set("filter", k)}
              className={`text-xs font-bold px-3.5 py-1.5 rounded-full border transition-colors ${
                filter === k
                  ? "bg-[#276A43] border-[#276A43] text-white"
                  : "bg-white border-[#D9E6DF] text-[#223829] hover:border-[#276A43] hover:text-[#276A43]"
              }`}
            >
              {label}
            </button>
          ))}
          <span className="ml-auto self-center text-xs text-gray-400">
            {visible.length} of {items.length}
          </span>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="py-16 text-center text-sm text-gray-500">
          No coins match these filters.{" "}
          <button onClick={() => { setQ(""); setFilter("all"); }} className="font-bold text-[#276A43] hover:underline">
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {visible.map((i) => (
            <Link key={i.mint} href={`/t/${i.mint}`}
              className="bg-white rounded-2xl border border-[#E4EBE7] shadow-[0_4px_15px_rgba(0,0,0,0.05)] overflow-hidden hover:border-[#276A43] hover:shadow-[0_10px_28px_rgba(34,56,41,0.12)] transition-all flex flex-col">
              <div className="relative">
                {i.image
                  ? <img src={i.image} alt="" className="w-full h-40 object-cover" />
                  : <div className="w-full h-40 bg-[#EDF4F1]" />}
                {i.migrated && (
                  <span className="absolute top-2 left-2 bg-[#223829]/90 text-white text-[10px] font-bold px-2.5 py-1 rounded-full">
                    Graduated
                  </span>
                )}
              </div>
              <div className="p-4 flex flex-col gap-3 flex-1">
                <div>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-bold text-[#223829] truncate">{i.name}</span>
                    <span className="font-mono text-xs font-bold text-[#276A43] flex-shrink-0">${i.symbol}</span>
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    {i.borrower ? <>for {i.borrower} {i.flag}</> : "independent launch"}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <div className="text-gray-400 uppercase tracking-wider font-semibold">Market cap</div>
                    <div className="font-black text-sm text-[#223829]">{i.marketCapUsd !== null ? usd(i.marketCapUsd) : "-"}</div>
                  </div>
                  <div>
                    <div className="text-gray-400 uppercase tracking-wider font-semibold">For loans</div>
                    <div className="font-black text-sm text-[#276A43]">{usd(i.earnedUsd)}</div>
                  </div>
                </div>
                {i.loanAmount > 0 && (
                  <div className="mt-auto">
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-[#2AA967] rounded-full" style={{ width: `${Math.min(100, i.pct)}%` }} />
                    </div>
                    <div className="flex justify-between text-[11px] mt-1">
                      <span className="text-gray-400">{Math.min(100, i.pct)}% of ${i.loanAmount.toFixed(0)}</span>
                      <span className={i.done ? "font-bold text-[#276A43]" : isAlmost(i) ? "font-bold text-[#996210]" : "text-gray-500"}>
                        {i.done ? "Funded ✓" : i.raising ? `$${i.remaining.toFixed(0)} to go` : "Loan closed"}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
