// Coin images on our own domain: sow.fun/i/launch/<uuid>.<ext> serves the
// image uploaded at launch from Vercel Blob, so wallets, explorers and DEX
// screeners show a sow.fun link instead of the raw storage host. Only launch
// uploads are served - nothing else in the store. Each upload has a unique,
// never-reused name, so responses are cached forever by Vercel and Cloudflare.

const KEY = /^launch\/[0-9a-f-]{36}\.(png|jpg|webp|gif)$/;
const TYPES: Record<string, string> = { png: "image/png", jpg: "image/jpeg", webp: "image/webp", gif: "image/gif" };

export async function GET(_request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const key = (await params).path.join("/");
  const base = process.env.BLOB_BASE_URL;
  if (!base || !KEY.test(key)) return new Response("not found", { status: 404 });

  const res = await fetch(`${base}/${key}`, { next: { revalidate: 86400 } }).catch(() => null);
  if (!res?.ok || !res.body) return new Response("not found", { status: res?.status === 404 ? 404 : 502 });
  return new Response(res.body, {
    headers: {
      "Content-Type": TYPES[key.split(".").pop()!],
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
