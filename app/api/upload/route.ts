import { NextResponse } from "next/server";
import { put } from "@vercel/blob";

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

export async function POST(request: Request) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: "uploads not configured" }, { status: 503 });
  }
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "no file" }, { status: 400 });
  }
  const ext = ALLOWED[file.type];
  if (!ext) {
    return NextResponse.json({ error: "use PNG, JPG, WEBP, or GIF" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "max 4MB" }, { status: 400 });
  }
  const key = `launch/${crypto.randomUUID()}.${ext}`;
  const blob = await put(key, file, { access: "public", contentType: file.type });
  return NextResponse.json({ url: blob.url, key });
}
