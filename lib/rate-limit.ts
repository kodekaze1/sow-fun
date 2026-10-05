// Request guards shared by the public API routes.
//
// rateLimit() is an in-memory sliding window keyed by client IP. On Vercel
// each serverless instance keeps its own window, so this is best-effort
// friction against scripts hammering one warm instance - the durable layer
// is a Vercel Firewall rate-limit rule on /api/*. Keep both.

type Window = { hits: number[] };
const buckets = new Map<string, Window>();
let lastSweep = Date.now();

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

/** True when the request is within `limit` hits per `windowMs` for this IP + bucket. */
export function rateLimit(req: Request, bucket: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  if (now - lastSweep > 60_000) {
    for (const [k, w] of buckets) if (!w.hits.length || now - w.hits[w.hits.length - 1] > 10 * 60_000) buckets.delete(k);
    lastSweep = now;
  }
  const key = `${bucket}:${clientIp(req)}`;
  const w = buckets.get(key) ?? { hits: [] };
  w.hits = w.hits.filter((t) => now - t < windowMs);
  if (w.hits.length >= limit) {
    buckets.set(key, w);
    return false;
  }
  w.hits.push(now);
  buckets.set(key, w);
  return true;
}

function allowedHost(host: string): boolean {
  return (
    host === "sow.fun" ||
    host === "www.sow.fun" ||
    host === "localhost" ||
    host === "127.0.0.1" ||
    host.endsWith(".vercel.app")
  );
}

/**
 * Browser-origin check: requires an Origin or Referer header from one of our
 * hosts. Scripts can forge headers, so this only stops casual reuse from
 * other sites and header-less curl; pair it with rateLimit().
 */
export function fromOurSite(req: Request): boolean {
  const source = req.headers.get("origin") ?? req.headers.get("referer");
  if (!source) return false;
  try {
    return allowedHost(new URL(source).hostname);
  } catch {
    return false;
  }
}
