import { NextResponse } from "next/server";
import { searchFundraisingLoans } from "@/lib/kiva-graphql";
import { KIVA_REGIONS, KIVA_SECTOR_IDS, type FundraisingLoan } from "@/lib/launchpad";

// Server-side AI helper for the launch flow. Two actions:
//  - "search": natural-language borrower matching over live Kiva loans
//  - "concierge": token name/ticker suggestions for a chosen borrower
// The Anthropic key never leaves the server.

const MODEL = "claude-haiku-4-5-20251001";

async function claude(system: string, user: string, maxTokens: number): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("AI helper not configured");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });
  if (!res.ok) throw new Error(`AI request failed (${res.status})`);
  const json = await res.json();
  return json?.content?.[0]?.text ?? "";
}

function extractJson<T>(text: string): T {
  const start = Math.min(
    ...[text.indexOf("{"), text.indexOf("[")].filter((i) => i >= 0)
  );
  const end = Math.max(text.lastIndexOf("}"), text.lastIndexOf("]"));
  return JSON.parse(text.slice(start, end + 1)) as T;
}

const SEARCH_SYSTEM = `You translate a user's natural-language description of who they want to help into Kiva loan search filters. Respond ONLY with a JSON object, no prose:
{"q": string|null, "region": string|null, "sector": string|null, "women": boolean}
- "q": 1-3 keywords matching loan descriptions (e.g. "solar", "sewing", "fishing"), or null
- "region" must be exactly one of: ${KIVA_REGIONS.join(", ")} - or null
- "sector" must be exactly one of: ${Object.keys(KIVA_SECTOR_IDS).join(", ")} - or null
- "women": true only if the user implies wanting to support a woman
Prefer fewer filters over guessing.`;

const RERANK_SYSTEM = `You are matching a user's wish to real Kiva borrowers. Given the wish and candidate loans, pick the 6 best matches. Respond ONLY with a JSON array, ordered best first:
[{"id": number, "why": string}]
"why" is one warm sentence (max 90 chars) explaining the fit, grounded in that loan's actual story. Never invent details.`;

const SCREEN_SYSTEM = `You screen token launches on sow.fun, a launchpad where each coin is pledged to a real Kiva microloan borrower. Judge ONLY the token name and ticker. Respond ONLY with JSON: {"ok": boolean, "reason": string}
REJECT (ok=false) if the name/ticker: contains slurs, hate, or sexual content; mocks or demeans the borrower; impersonates a well-known brand, person, or token; or is meaningless keyboard-mash gibberish (e.g. "asdfgh", "xK9qz").
ALLOW (ok=true) playful, meme-y, or simple names - this is a memecoin site; creativity and humor are fine. When ok=false, "reason" is one friendly sentence (max 100 chars) telling the creator what to change. When ok=true, reason is "".`;

const CONCIERGE_SYSTEM = `You help someone name a memecoin being launched on sow.fun for a real Kiva borrower. The coin's trading fees will fund the borrower's microloan. Suggest 3 distinct ideas. Respond ONLY with a JSON array:
[{"name": string, "ticker": string, "blurb": string}]
- "name": playful but respectful token name, max 22 chars, references the borrower's craft or story
- "ticker": 3-6 uppercase letters, memorable
- "blurb": max 110 chars, warm one-liner for the token page
Never mock the borrower. No financial promises. Keep it wholesome and CT-native.`;

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "AI helper not configured" }, { status: 503 });
  }
  let body: { action?: string; query?: string; borrower?: Record<string, unknown> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  try {
    if (body.action === "search") {
      const query = (body.query ?? "").toString().slice(0, 300).trim();
      if (!query) return NextResponse.json({ error: "empty query" }, { status: 400 });

      const raw = await claude(SEARCH_SYSTEM, query, 200);
      const params = extractJson<{ q: string | null; region: string | null; sector: string | null; women: boolean }>(raw);

      const sectorId = params.sector ? KIVA_SECTOR_IDS[params.sector as keyof typeof KIVA_SECTOR_IDS] : undefined;
      const region = params.region && (KIVA_REGIONS as readonly string[]).includes(params.region) ? params.region : undefined;

      let loans = await searchFundraisingLoans(
        { q: params.q ?? undefined, region, sector: sectorId, women: !!params.women, sort: "popularity" },
        24
      );
      // Thin results: retry once without the keyword, keeping structured filters
      if (loans.length < 4 && params.q) {
        loans = await searchFundraisingLoans(
          { region, sector: sectorId, women: !!params.women, sort: "popularity" },
          24
        );
      }
      if (loans.length === 0) return NextResponse.json({ loans: [], reasons: {} });

      const candidates = loans.map((l) => ({
        id: l.id, name: l.name, country: l.country, activity: l.activity,
        use: l.use.slice(0, 160), loanAmount: l.loanAmount, remaining: l.remaining,
      }));
      const rr = await claude(
        RERANK_SYSTEM,
        `Wish: ${query}\n\nCandidates:\n${JSON.stringify(candidates)}`,
        600
      );
      const picks = extractJson<{ id: number; why: string }[]>(rr);
      const byId = new Map<number, FundraisingLoan>(loans.map((l) => [l.id, l]));
      const ordered = picks.map((p) => byId.get(p.id)).filter(Boolean) as FundraisingLoan[];
      const rest = loans.filter((l) => !picks.some((p) => p.id === l.id)).slice(0, 12 - ordered.length);
      const reasons: Record<number, string> = {};
      for (const p of picks) if (byId.has(p.id)) reasons[p.id] = p.why;

      return NextResponse.json({ loans: [...ordered, ...rest], reasons });
    }

    if (body.action === "concierge") {
      const b = body.borrower ?? {};
      const brief = JSON.stringify({
        name: b.name, country: b.country, activity: b.activity,
        use: String(b.use ?? "").slice(0, 220), loanAmount: b.loanAmount,
      });
      const raw = await claude(CONCIERGE_SYSTEM, `Borrower: ${brief}`, 500);
      const ideas = extractJson<{ name: string; ticker: string; blurb: string }[]>(raw)
        .slice(0, 3)
        .map((i) => ({
          name: String(i.name).slice(0, 32),
          ticker: String(i.ticker).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10),
          blurb: String(i.blurb).slice(0, 140),
        }));
      return NextResponse.json({ ideas });
    }

    if (body.action === "screen") {
      const b = body.borrower ?? {};
      const name = String((b as Record<string, unknown>).tokenName ?? "").slice(0, 40);
      const symbol = String((b as Record<string, unknown>).tokenSymbol ?? "").slice(0, 12);
      if (!name || !symbol) return NextResponse.json({ ok: false, reason: "Name and ticker required." });
      const raw = await claude(
        SCREEN_SYSTEM,
        `Borrower: ${String(b.name ?? "")}\nToken name: ${name}\nTicker: ${symbol}`,
        150
      );
      const verdict = extractJson<{ ok: boolean; reason: string }>(raw);
      return NextResponse.json({ ok: !!verdict.ok, reason: String(verdict.reason ?? "") });
    }

    return NextResponse.json({ error: "unknown action" }, { status: 400 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "AI helper failed" },
      { status: 500 }
    );
  }
}
