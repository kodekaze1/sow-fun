"use client";
import { useCallback, useEffect, useState } from "react";
import Icon from "@/components/icons";
import { COUNTRY_FLAGS } from "@/lib/types";

interface ClaimRow {
  pool: string;
  mint: string | null;
  name: string;
  symbol: string;
  loanId: number | null;
  pendingSol: number;
  pendingUsd: number;
  state: "fund-now" | "harvest-soon" | "roll-over" | "accruing";
  borrower: {
    id: number;
    name: string;
    status: string;
    loanAmount: number;
    funded: number;
    remaining: number;
    image: string | null;
  } | null;
}

interface ClaimsData {
  pools: ClaimRow[];
  solPrice: number;
  notice?: string;
  totals?: { pendingSol: number; pendingUsd: number; readyCount: number };
}

const STATE_STYLES: Record<ClaimRow["state"], { label: string; cls: string }> = {
  "fund-now": { label: "Fund now", cls: "bg-[#276A43] text-white" },
  "harvest-soon": { label: "Loan filling fast - harvest early", cls: "bg-[#F8CD69] text-[#223829]" },
  "roll-over": { label: "Roll to next borrower", cls: "bg-[#F8F2E6] text-[#996210]" },
  accruing: { label: "Accruing", cls: "bg-[#EDF4F1] text-[#276A43]" },
};

export default function AdminPage() {
  const [key, setKey] = useState("");
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [data, setData] = useState<ClaimsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setSavedKey(localStorage.getItem("uplift_admin_key"));
  }, []);

  const load = useCallback(async (k: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/claims", { headers: { "x-admin-key": k } });
      if (res.status === 401) {
        localStorage.removeItem("uplift_admin_key");
        setSavedKey(null);
        setError("Wrong key.");
        return;
      }
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Failed to load.");
        return;
      }
      localStorage.setItem("uplift_admin_key", k);
      setSavedKey(k);
      setData(json);
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (savedKey) load(savedKey);
  }, [savedKey, load]);

  if (!savedKey) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="w-full max-w-sm text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-[#EDF4F1] flex items-center justify-center text-[#223829]">
            <Icon name="lock" className="w-7 h-7" />
          </div>
          <h1 className="font-serif text-2xl font-semibold mb-6">Claims Console</h1>
          <input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && key && load(key)}
            placeholder="Admin key"
            className="w-full rounded-full border border-[#D9E6DF] px-5 py-3 text-sm text-center mb-3 focus:outline-none focus:border-[#276A43]"
          />
          <button onClick={() => key && load(key)} disabled={loading}
            className="w-full bg-[#276A43] hover:bg-[#223829] text-white rounded-full py-3 text-sm font-bold transition-colors">
            {loading ? "Checking..." : "Open console"}
          </button>
          {error && <div className="mt-3 text-sm text-red-600">{error}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-2">
          <h1 className="font-serif text-3xl font-semibold">Claims Console</h1>
          <button onClick={() => savedKey && load(savedKey)} disabled={loading}
            className="flex items-center gap-2 text-sm font-bold text-[#276A43] hover:text-[#223829] transition-colors">
            <Icon name="refresh" className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
        <p className="text-sm text-gray-500 mb-8">
          Every launched pool, its accrued vault fees, and its borrower&apos;s live remaining need on Kiva.
        </p>

        {data?.totals && (
          <div className="grid grid-cols-3 gap-4 mb-8">
            {[
              { label: "Pending vault fees", value: `${data.totals.pendingSol.toFixed(4)} SOL` },
              { label: "≈ USD", value: `$${data.totals.pendingUsd.toFixed(2)}` },
              { label: "Ready to act", value: String(data.totals.readyCount) },
            ].map(({ label, value }) => (
              <div key={label} className="bg-[#EDF4F1] rounded-2xl p-4 text-center">
                <div className="text-xl font-black text-[#223829]">{value}</div>
                <div className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider mt-1">{label}</div>
              </div>
            ))}
          </div>
        )}

        {error && <div className="mb-6 bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">{error}</div>}
        {data?.notice && (
          <div className="mb-6 bg-[#F8F2E6] border border-[#F8CD69]/50 text-[#996210] rounded-xl p-4 text-sm">{data.notice}</div>
        )}

        {data && data.pools.length === 0 && !data.notice && (
          <div className="py-16 text-center text-gray-400 text-sm">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[#EDF4F1] flex items-center justify-center text-[#223829]">
              <Icon name="hourglass" className="w-6 h-6" />
            </div>
            No pools launched yet. They will appear here automatically.
          </div>
        )}

        <div className="flex flex-col gap-4">
          {data?.pools.map((row) => {
            const badge = STATE_STYLES[row.state];
            const pct = row.borrower && row.borrower.loanAmount > 0
              ? Math.round((row.borrower.funded / row.borrower.loanAmount) * 100)
              : 0;
            return (
              <div key={row.pool}
                className={`bg-white rounded-2xl border p-5 shadow-[0_4px_15px_rgba(0,0,0,0.05)] ${
                  row.state === "fund-now" ? "border-[#276A43]"
                    : row.state === "harvest-soon" ? "border-[#F8CD69]"
                    : "border-[#E4EBE7]"
                }`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {row.borrower?.image && (
                      <img src={row.borrower.image} alt="" className="w-11 h-11 rounded-xl object-cover" />
                    )}
                    <div>
                      <div className="font-bold text-[#223829]">{row.name} <span className="font-mono text-xs text-[#276A43]">${row.symbol}</span></div>
                      {row.borrower ? (
                        <div className="text-xs text-gray-500">
                          for {row.borrower.name} · loan #{row.borrower.id} · {row.borrower.status}
                        </div>
                      ) : (
                        <div className="text-xs text-gray-400">no Kiva loan in metadata</div>
                      )}
                    </div>
                  </div>
                  <span className={`text-[11px] font-bold px-3 py-1 rounded-full ${badge.cls}`}>{badge.label}</span>
                </div>

                <div className="grid grid-cols-3 gap-3 text-sm mb-3">
                  <div>
                    <div className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold">Vault fees pending</div>
                    <div className="font-black text-[#223829]">{row.pendingSol.toFixed(4)} SOL <span className="font-semibold text-gray-400">(${row.pendingUsd.toFixed(2)})</span></div>
                  </div>
                  <div>
                    <div className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold">Loan remaining</div>
                    <div className="font-black text-[#223829]">{row.borrower ? `$${row.borrower.remaining.toFixed(0)}` : "-"}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold">Kiva progress</div>
                    <div className="font-black text-[#223829]">{row.borrower ? `${pct}%` : "-"}</div>
                  </div>
                </div>

                {row.borrower && (
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-3">
                    <div className="h-full bg-[#2AA967] rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                )}

                <div className="flex flex-wrap gap-3 text-xs font-bold">
                  {row.borrower && (
                    <a href={`https://www.kiva.org/lend/${row.borrower.id}`} target="_blank" rel="noopener noreferrer"
                      className="text-[#276A43] hover:underline">Kiva loan ↗</a>
                  )}
                  <a href={`https://solscan.io/account/${row.pool}`} target="_blank" rel="noopener noreferrer"
                    className="text-[#276A43] hover:underline">Pool ↗</a>
                  {row.mint && (
                    <a href={`https://solscan.io/token/${row.mint}`} target="_blank" rel="noopener noreferrer"
                      className="text-[#276A43] hover:underline">Token ↗</a>
                  )}
                  <button
                    onClick={() => navigator.clipboard.writeText(`CONFIG=${process.env.NEXT_PUBLIC_DBC_CONFIG_KEY ?? "<config>"} KEYPAIR=<path-to-treasury.json> node scripts/claim-fees.mjs`)}
                    className="text-gray-400 hover:text-[#276A43]">
                    Copy claim command
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-xs text-gray-400 mt-10 leading-relaxed">
          Harvest loop: run the claim script locally → swap to USDC → top up the Impact Card → pay Kiva
          (team attribution on) → record the wave JSON. Full runbook: docs/OPERATIONS.md.
        </p>
      </div>
    </div>
  );
}
