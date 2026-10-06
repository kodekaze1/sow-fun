import { timingSafeEqual } from "node:crypto";

function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** The operator's x-admin-key header matches ADMIN_KEY. */
export function isAdmin(request: Request): boolean {
  const key = process.env.ADMIN_KEY;
  return !!key && safeEqual(request.headers.get("x-admin-key") ?? "", key);
}

/** Vercel Cron's "Authorization: Bearer <CRON_SECRET>", or the operator. */
export function isCronOrAdmin(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (secret && safeEqual(request.headers.get("authorization") ?? "", `Bearer ${secret}`)) return true;
  return isAdmin(request);
}
