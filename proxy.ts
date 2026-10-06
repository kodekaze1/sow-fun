import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Operator-only surfaces (/admin, /api/admin/*, /api/cron/*) exist only for
// the operator's IP. Everyone else gets the site's normal 404, so the pages
// don't even reveal they exist. This sits in front of the ADMIN_KEY check -
// both must pass.
//
// ADMIN_IPS (Vercel env, comma-separated) lists the allowed IPs. Unset means
// locked for everyone in production. Vercel Cron passes with its
// "Authorization: Bearer <CRON_SECRET>" header. Local dev is always allowed.

// sow.fun is proxied through Cloudflare, so Vercel's x-forwarded-for is a
// Cloudflare edge IP and the visitor's real IP is in cf-connecting-ip. That
// header is only trusted when the connection really came from Cloudflare
// (published ranges, https://www.cloudflare.com/ips/) - a visitor hitting the
// *.vercel.app URL directly could otherwise set it to anything.
const CF_V4 = [
  "173.245.48.0/20", "103.21.244.0/22", "103.22.200.0/22", "103.31.4.0/22", "141.101.64.0/18",
  "108.162.192.0/18", "190.93.240.0/20", "188.114.96.0/20", "197.234.240.0/22", "198.41.128.0/17",
  "162.158.0.0/15", "104.16.0.0/13", "104.24.0.0/14", "172.64.0.0/13", "131.0.72.0/22",
];
const CF_V6_PREFIXES = ["2400:cb00:", "2606:4700:", "2803:f800:", "2405:b500:", "2405:8100:", "2a06:98c", "2a06:98d", "2a06:98e", "2a06:98f", "2c0f:f248:"];

function v4ToInt(ip: string): number | null {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => !Number.isInteger(p) || p < 0 || p > 255)) return null;
  return ((parts[0] << 24) >>> 0) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
}

function fromCloudflare(ip: string): boolean {
  if (ip.includes(":")) return CF_V6_PREFIXES.some((p) => ip.toLowerCase().startsWith(p));
  const n = v4ToInt(ip);
  if (n === null) return false;
  return CF_V4.some((cidr) => {
    const [base, bits] = cidr.split("/");
    const b = v4ToInt(base)!;
    const mask = bits === "0" ? 0 : (~0 << (32 - Number(bits))) >>> 0;
    return ((n & mask) >>> 0) === ((b & mask) >>> 0);
  });
}

function clientIp(request: NextRequest): string | null {
  // Set by Vercel's edge (client first) - not spoofable by the visitor
  const edge = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip");
  if (!edge) return null;
  const cf = request.headers.get("cf-connecting-ip")?.trim();
  return cf && fromCloudflare(edge) ? cf : edge;
}

function notFound(request: NextRequest) {
  // A path that doesn't exist renders the site's own not-found page (404)
  return NextResponse.rewrite(new URL("/_not-found-admin", request.url));
}

export function proxy(request: NextRequest) {
  if (process.env.NODE_ENV === "development") return NextResponse.next();

  const secret = process.env.CRON_SECRET;
  if (
    request.nextUrl.pathname.startsWith("/api/cron/") &&
    secret &&
    request.headers.get("authorization") === `Bearer ${secret}`
  ) {
    return NextResponse.next();
  }

  const allowed = (process.env.ADMIN_IPS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const ip = clientIp(request);
  if (!ip || !allowed.includes(ip)) return notFound(request);
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/:path*", "/api/admin/:path*", "/api/cron/:path*"],
};
