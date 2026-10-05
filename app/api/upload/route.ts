import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { fromOurSite, rateLimit } from "@/lib/rate-limit";

// Token image upload for the launch flow. Returns both the full public URL
// (for preview) and the short blob key - the key is what goes into token
// metadata, because Metaplex URIs are capped at 200 bytes and full blob
// URLs would not fit alongside the loan binding params.

const ALLOWED: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};
const MAX_BYTES = 4 * 1024 * 1024;
const UPLOADS_PER_10_MIN = 10;

// Identify the image from its first bytes - the client-declared MIME type
// is not trusted.
function sniffImage(b: Uint8Array): keyof typeof ALLOWED | null {
  const at = (i: number, ...bytes: number[]) => bytes.every((v, k) => b[i + k] === v);
  if (at(0, 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return "image/png";
  if (at(0, 0xff, 0xd8, 0xff)) return "image/jpeg";
  if (at(0, 0x47, 0x49, 0x46, 0x38) && (b[4] === 0x37 || b[4] === 0x39) && b[5] === 0x61) return "image/gif";
  if (at(0, 0x52, 0x49, 0x46, 0x46) && at(8, 0x57, 0x45, 0x42, 0x50)) return "image/webp";
  return null;
}

export async function POST(request: Request) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: "uploads not configured" }, { status: 503 });
  }
  if (!fromOurSite(request)) {
    return NextResponse.json({ error: "origin not allowed" }, { status: 403 });
  }
  if (!rateLimit(request, "upload", UPLOADS_PER_10_MIN, 10 * 60_000)) {
    return NextResponse.json({ error: "Too many uploads - try again in a few minutes." }, { status: 429 });
  }
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_BYTES + 64 * 1024) {
    return NextResponse.json({ error: "max 4MB" }, { status: 413 });
  }
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "no file" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "max 4MB" }, { status: 400 });
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = sniffImage(bytes);
  if (!type) {
    return NextResponse.json({ error: "use PNG, JPG, WEBP, or GIF" }, { status: 400 });
  }
  const key = `launch/${crypto.randomUUID()}.${ALLOWED[type]}`;
  const blob = await put(key, new Blob([bytes], { type }), { access: "public", contentType: type });
  return NextResponse.json({ url: blob.url, key });
}
