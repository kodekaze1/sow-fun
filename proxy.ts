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

function clientIp(request: NextRequest): string | null {
  // On Vercel, x-forwarded-for is set by the platform (client first) and
  // can't be spoofed by the visitor
  const fwd = request.headers.get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() || request.headers.get("x-real-ip");
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
