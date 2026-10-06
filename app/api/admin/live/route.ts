import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";

// Live traffic for /admin, from Cloudflare's GraphQL Analytics API (sow.fun is
// proxied through Cloudflare). Counts real browser page loads only: eyeball
// traffic (not Workers / Cloudflare itself), HTML responses (not API calls or
// assets), excluding the operator's IPs. Cloudflare data lags ~1-2 minutes.
//
// Env: CLOUDFLARE_API_TOKEN (read-only "Analytics: Read" for the zone),
// CLOUDFLARE_ZONE_ID.

const QUERY = `query Live($zone: String!, $since5: Time!, $since60: Time!, $exclude: [String!]) {
  viewer {
    zones(filter: { zoneTag: $zone }) {
      now: httpRequestsAdaptiveGroups(
        limit: 25
        filter: { datetime_geq: $since5, requestSource: "eyeball", edgeResponseContentTypeName: "html", clientIP_notin: $exclude }
        orderBy: [count_DESC]
      ) { count sum { visits } dimensions { clientRequestPath } }
      hour: httpRequestsAdaptiveGroups(
        limit: 70
        filter: { datetime_geq: $since60, requestSource: "eyeball", edgeResponseContentTypeName: "html", clientIP_notin: $exclude }
        orderBy: [datetimeMinute_ASC]
      ) { count sum { visits } dimensions { datetimeMinute } }
      countries: httpRequestsAdaptiveGroups(
        limit: 8
        filter: { datetime_geq: $since60, requestSource: "eyeball", edgeResponseContentTypeName: "html", clientIP_notin: $exclude }
        orderBy: [count_DESC]
      ) { count dimensions { clientCountryName } }
    }
  }
}`;

type Group = { count: number; sum?: { visits: number }; dimensions: Record<string, string> };

export async function GET(request: Request) {
  if (!isAdmin(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const token = process.env.CLOUDFLARE_API_TOKEN;
  const zone = process.env.CLOUDFLARE_ZONE_ID;
  if (!token || !zone) return NextResponse.json({ configured: false });

  const now = Date.now();
  const iso = (ms: number) => new Date(ms).toISOString().replace(/\.\d{3}Z$/, "Z");
  const exclude = (process.env.ADMIN_IPS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  try {
    const res = await fetch("https://api.cloudflare.com/client/v4/graphql", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ query: QUERY, variables: { zone, since5: iso(now - 5 * 60_000), since60: iso(now - 60 * 60_000), exclude } }),
      cache: "no-store",
    });
    const json = (await res.json()) as { data?: { viewer: { zones: { now: Group[]; hour: Group[]; countries: Group[] }[] } }; errors?: { message: string }[] };
    if (json.errors?.length) return NextResponse.json({ configured: true, error: json.errors[0].message }, { status: 502 });
    const z = json.data?.viewer.zones[0];
    if (!z) return NextResponse.json({ configured: true, error: "zone not found - check CLOUDFLARE_ZONE_ID" }, { status: 502 });

    // Per-minute buckets for the hour (fill gaps with zero)
    const byMin = new Map(z.hour.map((g) => [g.dimensions.datetimeMinute.slice(0, 16), g]));
    const minutes = Array.from({ length: 60 }, (_, i) => {
      const t = new Date(now - (59 - i) * 60_000).toISOString().slice(0, 16);
      const g = byMin.get(t);
      return { t, views: g?.count ?? 0, visits: g?.sum?.visits ?? 0 };
    });
    return NextResponse.json({
      configured: true,
      at: new Date(now).toISOString(),
      last5: { views: z.now.reduce((s, g) => s + g.count, 0), visits: z.now.reduce((s, g) => s + (g.sum?.visits ?? 0), 0) },
      last60: { views: minutes.reduce((s, m) => s + m.views, 0), visits: minutes.reduce((s, m) => s + m.visits, 0) },
      pages: z.now.map((g) => ({ path: g.dimensions.clientRequestPath, views: g.count })).slice(0, 10),
      countries: z.countries.map((g) => ({ country: g.dimensions.clientCountryName, views: g.count })),
      minutes,
    });
  } catch (e) {
    return NextResponse.json({ configured: true, error: e instanceof Error ? e.message : "Cloudflare unreachable" }, { status: 502 });
  }
}
