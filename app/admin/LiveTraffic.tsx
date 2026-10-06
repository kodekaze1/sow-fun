"use client";
import { useEffect, useState } from "react";

// Live site traffic from Cloudflare (app/api/admin/live), refreshed every 30s.

interface Live {
  configured: boolean;
  error?: string;
  at?: string;
  last5?: { views: number; visits: number };
  last60?: { views: number; visits: number };
  pages?: { path: string; views: number }[];
  countries?: { country: string; views: number }[];
  minutes?: { t: string; views: number; visits: number }[];
}

export default function LiveTraffic({ adminKey }: { adminKey: string }) {
  const [live, setLive] = useState<Live | null>(null);

  useEffect(() => {
    let stop = false;
    const tick = async () => {
      try {
        const res = await fetch("/api/admin/live", { headers: { "x-admin-key": adminKey }, cache: "no-store" });
        const json = (await res.json()) as Live;
        if (!stop) setLive(json);
      } catch {
        if (!stop) setLive({ configured: true, error: "network error" });
      }
    };
    tick();
    const id = setInterval(() => document.visibilityState === "visible" && tick(), 30_000);
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, [adminKey]);

  if (!live) return <div className="text-sm text-gray-400">Loading traffic...</div>;
  if (!live.configured) {
    return (
      <div className="rounded-2xl bg-[#F8F2E6] border border-[#F8CD69]/50 text-[#996210] p-4 text-sm">
        Not connected yet: add <b>CLOUDFLARE_API_TOKEN</b> (read-only Analytics) and <b>CLOUDFLARE_ZONE_ID</b> on Vercel, then redeploy.
      </div>
    );
  }
  if (live.error) return <div className="rounded-2xl bg-red-50 border border-red-200 text-red-700 p-4 text-sm">Cloudflare: {live.error}</div>;

  const mins = live.minutes ?? [];
  const max = Math.max(1, ...mins.map((m) => m.views));
  return (
    <div className="rounded-2xl border border-[#E4EBE7] bg-white p-5">
      <div className="flex flex-wrap items-end gap-8">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#2AA967] animate-pulse" />
            <span className="text-3xl font-black text-[#223829]">{live.last5?.views ?? 0}</span>
          </div>
          <div className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider mt-1">page views · last 5 min</div>
        </div>
        <div>
          <div className="text-3xl font-black text-[#223829]">{live.last5?.visits ?? 0}</div>
          <div className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider mt-1">new visits · last 5 min</div>
        </div>
        <div>
          <div className="text-xl font-black text-[#223829]">{live.last60?.views ?? 0} <span className="text-sm font-semibold text-gray-400">/ {live.last60?.visits ?? 0} visits</span></div>
          <div className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider mt-1">last hour</div>
        </div>
        <div className="text-[11px] text-gray-400 ml-auto">Cloudflare, real browsers, you excluded · ~1-2 min delay · {live.at ? new Date(live.at).toLocaleTimeString() : ""}</div>
      </div>

      <div className="flex items-end gap-[2px] h-16 mt-4" aria-label="Page views per minute, last hour">
        {mins.map((m) => (
          <div key={m.t} title={`${m.t.slice(11)} UTC · ${m.views} views, ${m.visits} visits`}
            className="flex-1 rounded-t bg-[#2AA967]/70 hover:bg-[#276A43]" style={{ height: `${Math.max(2, (m.views / max) * 100)}%` }} />
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 text-[12px]">
        <div>
          <div className="font-black text-[#223829] mb-1">Pages right now</div>
          {(live.pages ?? []).length ? (
            <ul className="flex flex-col gap-0.5">
              {live.pages!.map((p) => (
                <li key={p.path} className="flex justify-between gap-3"><span className="font-mono truncate text-gray-600">{p.path}</span><b>{p.views}</b></li>
              ))}
            </ul>
          ) : <div className="text-gray-400">Nobody in the last 5 minutes.</div>}
        </div>
        <div>
          <div className="font-black text-[#223829] mb-1">Countries · last hour</div>
          {(live.countries ?? []).length ? (
            <ul className="flex flex-col gap-0.5">
              {live.countries!.map((c) => (
                <li key={c.country} className="flex justify-between gap-3"><span className="text-gray-600">{c.country}</span><b>{c.views}</b></li>
              ))}
            </ul>
          ) : <div className="text-gray-400">-</div>}
        </div>
      </div>
    </div>
  );
}
