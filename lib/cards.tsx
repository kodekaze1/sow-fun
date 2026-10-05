// Share and event card templates, rendered to PNG with next/og (Satori).
// Code templates, not AI: always on-brand, filled with live data, free per
// image. Used by /api/card/** and app/t/[mint]/opengraph-image.
//
// Satori rules: every element with more than one child needs display:flex;
// no CSS grid; images must be PNG/JPEG/GIF (WebP is converted or skipped).

import { ImageResponse } from "next/og";
import type { ReactElement } from "react";
import { getLaunchByMint, type LaunchSummary } from "@/lib/launchpad-onchain";
import { readCoinMeta, type CoinMeta } from "@/lib/coin-meta";
import { getLoansById, type KivaLoanLive } from "@/lib/kiva-graphql";
import { IMPACT_FEE_PCT, SITE_URL } from "@/lib/launchpad";

export const CARD = { width: 1200, height: 675 };

export const C = {
  forest: "#223829",
  deep: "#16261c",
  leaf: "#276A43",
  sprout: "#2AA967",
  mint: "#7FC79E",
  mist: "#EDF4F1",
  gold: "#F8CD69",
  cream: "#FBF6EA",
  ink: "#1C2B21",
  muted: "#5E6F64",
};

// ---------------------------------------------------------------- fonts

type FontDef = { name: string; data: ArrayBuffer; weight: 400 | 500 | 600 | 700; style: "normal" | "italic" };
let fontsPromise: Promise<FontDef[]> | null = null;

const FONT_CSS =
  "https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,600;1,600&family=Figtree:wght@500;700&family=Caveat+Brush";

async function fetchFonts(): Promise<FontDef[]> {
  // A plain request (no browser UA) gets TTF URLs, which Satori can parse
  const css = await (await fetch(FONT_CSS, { next: { revalidate: 86400 } })).text();
  const faces = [...css.matchAll(/font-family: '([^']+)';\s*font-style: (\w+);\s*font-weight: (\d+);[\s\S]*?url\(([^)]+\.ttf)\)/g)];
  const fonts = await Promise.all(
    faces.map(async ([, name, style, weight, url]) => ({
      name,
      style: style as "normal" | "italic",
      weight: Number(weight) as 400 | 500 | 600 | 700,
      data: await (await fetch(url, { next: { revalidate: 86400 } })).arrayBuffer(),
    }))
  );
  return fonts;
}

export function loadFonts(): Promise<FontDef[]> {
  if (!fontsPromise) {
    fontsPromise = fetchFonts().catch(() => {
      fontsPromise = null; // retry next time; render with defaults now
      return [];
    });
  }
  return fontsPromise;
}

// --------------------------------------------------------------- images

/** Fetch an image and return a data URI Satori can draw, or null. */
export async function imageDataUri(url: string | null | undefined): Promise<string | null> {
  if (!url) return null;
  try {
    // Kiva serves the same photo as JPEG; Satori can't decode WebP
    const src = /kiva\.org\/img\//.test(url) ? url.replace(/\.webp(\?.*)?$/, ".jpg") : url;
    const res = await fetch(src, { next: { revalidate: 86400 }, signal: AbortSignal.timeout(6000) });
    if (!res.ok) return null;
    const type = (res.headers.get("content-type") ?? "").split(";")[0];
    if (!["image/png", "image/jpeg", "image/gif"].includes(type)) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > 3_000_000) return null;
    return `data:${type};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

// ------------------------------------------------------------ coin data

export interface CoinCardData {
  mint: string;
  name: string;
  symbol: string;
  coinImage: string | null; // data URI
  borrower: string | null;
  borrowerImage: string | null; // data URI
  country: string | null;
  loan: KivaLoanLive | null;
  migrated: boolean;
  launch: LaunchSummary;
  meta: CoinMeta | null;
}

function blobUrl(key: string | null | undefined): string | null {
  if (!key) return null;
  return key.startsWith("http") ? key : `${process.env.BLOB_BASE_URL ?? ""}/${key}`;
}

export async function getCoinCardData(mint: string): Promise<CoinCardData | null> {
  const launch = await getLaunchByMint(mint).catch(() => null);
  if (!launch?.mint) return null;
  const meta = await readCoinMeta(launch.mint);
  const loanId = meta?.loanId ?? launch.loanId;
  const loans = loanId ? await getLoansById([loanId]).catch(() => new Map<number, KivaLoanLive>()) : new Map<number, KivaLoanLive>();
  const loan = loanId ? loans.get(loanId) ?? null : null;
  const [coinImage, borrowerImage] = await Promise.all([
    imageDataUri(blobUrl(meta?.image) ?? launch.image),
    imageDataUri(loan?.image),
  ]);
  return {
    mint: launch.mint,
    name: meta?.name ?? launch.name,
    symbol: meta?.symbol ?? launch.symbol,
    coinImage,
    borrower: loan?.name ?? meta?.borrower ?? launch.borrowerName,
    borrowerImage: borrowerImage ?? coinImage,
    country: loan?.country ?? null,
    loan,
    migrated: launch.migrated,
    launch,
    meta,
  };
}

// --------------------------------------------------------- building blocks

function BrandMark({ dark = true, size = 30 }: { dark?: boolean; size?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ display: "flex", width: size * 0.62, height: size * 0.62, borderRadius: 999, backgroundColor: C.sprout }} />
      <div style={{ display: "flex", fontFamily: "Lora", fontWeight: 600, fontSize: size, color: dark ? C.mist : C.forest }}>
        sow.fun
      </div>
    </div>
  );
}

function Photo({ src, size, radius = 28, label }: { src: string | null; size: number; radius?: number; label: string }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} width={size} height={size} style={{ width: size, height: size, borderRadius: radius, objectFit: "cover" }} alt="" />;
  }
  return (
    <div
      style={{
        display: "flex",
        width: size,
        height: size,
        borderRadius: radius,
        backgroundColor: C.leaf,
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Lora",
        fontWeight: 600,
        fontSize: size * 0.42,
        color: C.mist,
      }}
    >
      {label.slice(0, 1).toUpperCase()}
    </div>
  );
}

function Pill({ children, dark = true }: { children: string; dark?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        alignSelf: "flex-start",
        padding: "8px 18px",
        borderRadius: 999,
        fontSize: 20,
        fontWeight: 700,
        letterSpacing: 2,
        textTransform: "uppercase",
        color: dark ? C.mint : C.leaf,
        backgroundColor: dark ? "rgba(237,244,241,0.08)" : "rgba(39,106,67,0.08)",
        border: dark ? "1px solid rgba(237,244,241,0.18)" : "1px solid rgba(39,106,67,0.2)",
      }}
    >
      {children}
    </div>
  );
}

function ProgressBar({ loan, dark = true, width = 520 }: { loan: KivaLoanLive | null; dark?: boolean; width?: number }) {
  if (!loan || loan.loanAmount <= 0) return null;
  const done = loan.status !== "fundraising" || loan.remaining <= 0;
  const pct = done ? 100 : Math.max(3, Math.round(((loan.fundedAmount + loan.reservedAmount) / loan.loanAmount) * 100));
  const label = done ? "Fully funded on Kiva" : `$${Math.round(loan.remaining).toLocaleString("en-US")} to go on Kiva`;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, width }}>
      <div style={{ display: "flex", height: 14, borderRadius: 999, backgroundColor: dark ? "rgba(237,244,241,0.14)" : "#DCE6E0" }}>
        <div style={{ display: "flex", width: `${pct}%`, height: 14, borderRadius: 999, backgroundColor: done ? C.gold : C.sprout }} />
      </div>
      <div style={{ display: "flex", fontSize: 22, fontWeight: 500, color: dark ? "rgba(237,244,241,0.75)" : C.muted }}>{label}</div>
    </div>
  );
}

const fit = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);
const tickerSize = (symbol: string, base: number) => Math.max(base * 0.55, Math.min(base, Math.round((base * 6) / Math.max(4, symbol.length + 1))));

// ------------------------------------------------------- creator cards

/** v1 Portrait: borrower photo, ticker, who it's for. Also the coin's OG image. */
export function CoinPortrait({ d }: { d: CoinCardData }) {
  const who = d.borrower ?? "a Kiva borrower";
  return (
    <div style={{ display: "flex", width: "100%", height: "100%", backgroundColor: C.deep, fontFamily: "Figtree" }}>
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1, padding: "60px 64px" }}>
        <BrandMark />
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <Photo src={d.coinImage} size={84} radius={22} label={d.symbol} />
            <div style={{ display: "flex", fontFamily: "Lora", fontWeight: 600, fontSize: tickerSize(d.symbol, 96), color: C.mist, lineHeight: 1 }}>
              ${fit(d.symbol, 10)}
            </div>
          </div>
          <div style={{ display: "flex", fontFamily: "Lora", fontStyle: "italic", fontWeight: 600, fontSize: 46, color: C.gold, lineHeight: 1.15 }}>
            {fit(`for ${who}${d.country ? ` in ${d.country}` : ""}`, 40)}
          </div>
          <div style={{ display: "flex", fontSize: 28, fontWeight: 500, color: "rgba(237,244,241,0.8)", maxWidth: 640, lineHeight: 1.35 }}>
            {`${IMPACT_FEE_PCT}% of every trade's fees fund their Kiva loan.`}
          </div>
        </div>
        <ProgressBar loan={d.loan} />
      </div>
      <div style={{ display: "flex", width: 470, height: "100%", position: "relative" }}>
        {d.borrowerImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={d.borrowerImage} width={470} height={675} style={{ width: 470, height: "100%", objectFit: "cover" }} alt="" />
        ) : (
          <div style={{ display: "flex", width: 470, height: "100%", backgroundColor: C.leaf }} />
        )}
        <div style={{ display: "flex", position: "absolute", left: 0, top: 0, width: 120, height: "100%", backgroundImage: `linear-gradient(90deg, ${C.deep}, rgba(22,38,28,0))` }} />
      </div>
    </div>
  );
}

/** v2 Ticker: big typographic ticker on light ground. */
export function CoinTicker({ d }: { d: CoinCardData }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: "100%", height: "100%", backgroundColor: C.mist, padding: "60px 72px", fontFamily: "Figtree" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <BrandMark dark={false} />
        <Pill dark={false}>Just launched</Pill>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 40 }}>
        <Photo src={d.coinImage} size={200} radius={44} label={d.symbol} />
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", fontFamily: "Lora", fontWeight: 600, fontSize: tickerSize(d.symbol, 170), color: C.forest, lineHeight: 1 }}>
            ${fit(d.symbol, 10)}
          </div>
          <div style={{ display: "flex", fontSize: 32, fontWeight: 500, color: C.muted }}>{fit(d.name, 34)}</div>
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div style={{ display: "flex", fontFamily: "Lora", fontStyle: "italic", fontWeight: 600, fontSize: 38, color: C.leaf, maxWidth: 820, lineHeight: 1.2 }}>
          {fit(`Every trade helps fund ${d.borrower ?? "a real borrower"}'s microloan.`, 70)}
        </div>
        <div style={{ display: "flex", width: 96, height: 12, borderRadius: 999, backgroundColor: C.sprout }} />
      </div>
    </div>
  );
}

/** v3 Impact: stat-style pledge with loan progress and short URL. */
export function CoinImpact({ d }: { d: CoinCardData }) {
  const who = d.borrower ?? "a Kiva borrower";
  return (
    <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: "100%", height: "100%", backgroundColor: C.forest, padding: "60px 72px", fontFamily: "Figtree" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <BrandMark />
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Photo src={d.coinImage} size={56} radius={16} label={d.symbol} />
          <div style={{ display: "flex", fontFamily: "Lora", fontWeight: 600, fontSize: 36, color: C.mist }}>${fit(d.symbol, 10)}</div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 36 }}>
        <div style={{ display: "flex", fontFamily: "Lora", fontWeight: 600, fontSize: 230, color: C.gold, lineHeight: 0.85 }}>{IMPACT_FEE_PCT}%</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingBottom: 14 }}>
          <div style={{ display: "flex", fontSize: 40, fontWeight: 700, color: C.mist, lineHeight: 1.15 }}>{`of every $${fit(d.symbol, 10)} trade's fees`}</div>
          <div style={{ display: "flex", fontSize: 40, fontWeight: 500, color: "rgba(237,244,241,0.75)", lineHeight: 1.15 }}>
            {fit(`fund ${who}'s microloan.`, 34)}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <ProgressBar loan={d.loan} />
        <div style={{ display: "flex", fontSize: 24, fontWeight: 700, color: C.mint }}>{`sow.fun/t/${d.mint.slice(0, 4)}…${d.mint.slice(-4)}`}</div>
      </div>
    </div>
  );
}

// --------------------------------------------------------- event cards

export function FundedCard({ d, lentUsd }: { d: CoinCardData; lentUsd: number | null }) {
  const who = d.borrower ?? "A Kiva borrower";
  return (
    <div style={{ display: "flex", width: "100%", height: "100%", backgroundColor: C.mist, fontFamily: "Figtree" }}>
      <div style={{ display: "flex", width: 470, height: "100%" }}>
        {d.borrowerImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={d.borrowerImage} width={470} height={675} style={{ width: 470, height: "100%", objectFit: "cover" }} alt="" />
        ) : (
          <div style={{ display: "flex", width: 470, height: "100%", backgroundColor: C.leaf }} />
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1, padding: "60px 64px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <BrandMark dark={false} />
          <Pill dark={false}>Funded</Pill>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", fontFamily: "Lora", fontWeight: 600, fontSize: 76, color: C.forest, lineHeight: 1.05 }}>{fit(who, 18)}</div>
          <div style={{ display: "flex", fontFamily: "Lora", fontStyle: "italic", fontWeight: 600, fontSize: 52, color: C.leaf, lineHeight: 1.1 }}>
            is fully funded.
          </div>
          <div style={{ display: "flex", fontSize: 28, fontWeight: 500, color: C.muted, marginTop: 8 }}>
            {fit(`${d.country ? `${d.country} · ` : ""}via $${d.symbol}${lentUsd ? ` · $${Math.round(lentUsd).toLocaleString("en-US")} lent` : ""}`, 48)}
          </div>
        </div>
        <div style={{ display: "flex", fontSize: 24, fontWeight: 700, color: C.leaf }}>Trading fees became a real microloan.</div>
      </div>
    </div>
  );
}

export function GraduatedCard({ d }: { d: CoinCardData }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: "100%", height: "100%", backgroundColor: C.deep, padding: "60px 72px", fontFamily: "Figtree" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <BrandMark />
        <Pill>Graduated</Pill>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 40 }}>
        <Photo src={d.coinImage} size={190} radius={44} label={d.symbol} />
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", fontFamily: "Lora", fontWeight: 600, fontSize: tickerSize(d.symbol, 140), color: C.mist, lineHeight: 1 }}>
            ${fit(d.symbol, 10)}
          </div>
          <div style={{ display: "flex", fontFamily: "Lora", fontStyle: "italic", fontWeight: 600, fontSize: 52, color: C.gold }}>graduated.</div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 48 }}>
        {[
          ["Liquidity", "locked forever"],
          ["New pool fee", "1%, same split"],
          ["Still funding", d.borrower ? fit(d.borrower, 18) : "Kiva loans"],
        ].map(([k, v]) => (
          <div key={k} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", fontSize: 20, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: C.mint }}>{k}</div>
            <div style={{ display: "flex", fontSize: 32, fontWeight: 700, color: C.mist }}>{v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function MilestoneCard({ lives, lentUsd, countries, rank }: { lives: number; lentUsd: number; countries: number; rank: string | null }) {
  const stats: [string, string][] = [
    [`$${Math.round(lentUsd).toLocaleString("en-US")}`, "lent on Kiva"],
    [String(countries), countries === 1 ? "country" : "countries"],
    ...(rank ? ([[rank, "Kiva team rank"]] as [string, string][]) : []),
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: "100%", height: "100%", backgroundColor: C.forest, padding: "60px 72px", fontFamily: "Figtree" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <BrandMark />
        <Pill>Milestone</Pill>
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 32 }}>
        <div style={{ display: "flex", fontFamily: "Lora", fontWeight: 600, fontSize: 240, color: C.gold, lineHeight: 0.85 }}>{lives.toLocaleString("en-US")}</div>
        <div style={{ display: "flex", flexDirection: "column", paddingBottom: 16 }}>
          <div style={{ display: "flex", fontFamily: "Lora", fontWeight: 600, fontSize: 64, color: C.mist, lineHeight: 1 }}>{lives === 1 ? "life" : "lives"}</div>
          <div style={{ display: "flex", fontFamily: "Lora", fontStyle: "italic", fontWeight: 600, fontSize: 64, color: C.mint, lineHeight: 1.1 }}>funded.</div>
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
      <div style={{ display: "flex", gap: 56 }}>
        {stats.map(([v, k]) => (
          <div key={k} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ display: "flex", fontSize: 44, fontWeight: 700, color: C.mist }}>{v}</div>
            <div style={{ display: "flex", fontSize: 22, fontWeight: 500, color: "rgba(237,244,241,0.65)" }}>{k}</div>
          </div>
        ))}
      </div>
        <div style={{ display: "flex", fontFamily: "Lora", fontStyle: "italic", fontWeight: 600, fontSize: 30, color: C.mint }}>Every trade, a real loan.</div>
      </div>
    </div>
  );
}

export interface HarvestCardData {
  number: number;
  date: string;
  totalCents: number;
  loans: { borrower: string; location: string; cents: number }[];
}

export function HarvestCard({ h }: { h: HarvestCardData }) {
  const shown = h.loans.slice(0, 5);
  const more = h.loans.length - shown.length;
  const date = new Date(h.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
  return (
    <div style={{ display: "flex", width: "100%", height: "100%", backgroundColor: C.cream, padding: "56px 72px", fontFamily: "Figtree", gap: 64 }}>
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: 430 }}>
        <BrandMark dark={false} />
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Pill dark={false}>{`Harvest #${String(h.number).padStart(3, "0")}`}</Pill>
          <div style={{ display: "flex", fontFamily: "Lora", fontWeight: 600, fontSize: 104, color: C.forest, lineHeight: 1, marginTop: 10 }}>
            ${Math.round(h.totalCents / 100).toLocaleString("en-US")}
          </div>
          <div style={{ display: "flex", fontFamily: "Lora", fontStyle: "italic", fontWeight: 600, fontSize: 44, color: C.leaf }}>
            {`lent to ${h.loans.length} ${h.loans.length === 1 ? "person" : "people"}.`}
          </div>
        </div>
        <div style={{ display: "flex", fontSize: 22, fontWeight: 500, color: C.muted }}>{`${date} · receipts on Kiva`}</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", flex: 1, backgroundColor: "#FFFFFF", borderRadius: 28, padding: "36px 40px", gap: 4, border: "1px solid #E9DFC6" }}>
        <div style={{ display: "flex", fontSize: 20, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: C.muted, marginBottom: 14 }}>Funded this harvest</div>
        {shown.map((l, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "14px 0", borderBottom: i === shown.length - 1 && !more ? "none" : "1px dashed #DCE6E0" }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", fontSize: 30, fontWeight: 700, color: C.ink }}>{fit(l.borrower, 20)}</div>
              <div style={{ display: "flex", fontSize: 20, fontWeight: 500, color: C.muted }}>{fit(l.location, 26)}</div>
            </div>
            <div style={{ display: "flex", fontSize: 30, fontWeight: 700, color: C.leaf }}>${Math.round(l.cents / 100).toLocaleString("en-US")}</div>
          </div>
        ))}
        {more > 0 && <div style={{ display: "flex", fontSize: 22, fontWeight: 500, color: C.muted, paddingTop: 12 }}>{`+ ${more} more`}</div>}
      </div>
    </div>
  );
}

// ------------------------------------------------- illustrated cards

// Hand-drawn look to match the brand videos: cream paper, ink type, flat
// green fills, gold accents, our own illustrations.
const PAPER = "#F8F2E6";
const INK = "#1C2B21";
const BRUSH = "Caveat Brush";

const illustrationCache = new Map<string, Promise<string | null>>();

/** One of /public/images/illustrations as a downscaled PNG data URI. */
export function illustration(name: string, size: number): Promise<string | null> {
  const key = `${name}@${size}`;
  if (!illustrationCache.has(key)) {
    const p = (async () => {
      try {
        const res = await fetch(`${SITE_URL}/images/illustrations/${name}.png`, { next: { revalidate: 86400 }, signal: AbortSignal.timeout(8000) });
        if (!res.ok) return null;
        const sharp = (await import("sharp")).default;
        const png = await sharp(Buffer.from(await res.arrayBuffer())).resize(size, size, { fit: "inside" }).png().toBuffer();
        return `data:image/png;base64,${png.toString("base64")}`;
      } catch {
        illustrationCache.delete(key); // retry on the next render
        return null;
      }
    })();
    illustrationCache.set(key, p);
  }
  return illustrationCache.get(key)!;
}

export interface IllustratedArt {
  sprout: string | null;
  cycle: string | null;
  watering: string | null;
}

export async function loadIllustratedArt(): Promise<IllustratedArt> {
  const [sprout, cycle, watering] = await Promise.all([
    illustration("plant-coin", 520),
    illustration("cycle", 560),
    illustration("watering", 520),
  ]);
  return { sprout, cycle, watering };
}

/** A wobbly hand-drawn underline, like the hero's marker stroke. */
function Squiggle({ width, color = C.sprout }: { width: number; color?: string }) {
  return (
    <svg width={width} height={22} viewBox="0 0 200 22" preserveAspectRatio="none" style={{ display: "flex" }}>
      <path d="M3 15 C 40 6, 80 19, 120 10 S 180 8, 197 12" stroke={color} strokeWidth={7} strokeLinecap="round" fill="none" />
    </svg>
  );
}

function InkPhoto({ src, size, label }: { src: string | null; size: number; label: string }) {
  return (
    <div style={{ display: "flex", padding: 6, borderRadius: 999, backgroundColor: PAPER, border: `4px solid ${INK}` }}>
      <Photo src={src} size={size} radius={999} label={label} />
    </div>
  );
}

function PaperMark() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ display: "flex", width: 20, height: 20, borderRadius: 999, backgroundColor: C.sprout, border: `3px solid ${INK}` }} />
      <div style={{ display: "flex", fontFamily: BRUSH, fontSize: 40, color: INK }}>sow.fun</div>
    </div>
  );
}

function Art({ src, size, rotate = 0 }: { src: string | null; size: number; rotate?: number }) {
  if (!src) return <div style={{ display: "flex", width: size, height: size }} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} width={size} height={size} style={{ width: size, height: size, objectFit: "contain", transform: `rotate(${rotate}deg)` }} alt="" />;
}

/** v4 Sprout: ticker in brush type beside the plant-coin illustration. */
export function CoinSprout({ d, art }: { d: CoinCardData; art: IllustratedArt }) {
  const who = d.borrower ?? "a real borrower";
  return (
    <div style={{ display: "flex", width: "100%", height: "100%", backgroundColor: PAPER, fontFamily: "Figtree", padding: "52px 64px" }}>
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1 }}>
        <PaperMark />
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", fontFamily: BRUSH, fontSize: tickerSize(d.symbol, 150), color: INK, lineHeight: 1 }}>
            ${fit(d.symbol, 10)}
          </div>
          <Squiggle width={Math.min(520, 70 + d.symbol.length * 70)} />
          <div style={{ display: "flex", fontFamily: BRUSH, fontSize: 52, color: C.leaf, lineHeight: 1.1, marginTop: 14 }}>
            {fit(`sowing a seed for ${who}`, 34)}
          </div>
          <div style={{ display: "flex", fontSize: 26, fontWeight: 500, color: C.muted, marginTop: 10, maxWidth: 560, lineHeight: 1.35 }}>
            {`${IMPACT_FEE_PCT}% of every trade's fees fund their Kiva loan${d.country ? ` in ${d.country}` : ""}.`}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <InkPhoto src={d.borrowerImage} size={64} label={who} />
          <div style={{ display: "flex", fontFamily: BRUSH, fontSize: 32, color: INK }}>{fit(who, 26)}</div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 470 }}>
        <Art src={art.sprout} size={460} rotate={-4} />
      </div>
    </div>
  );
}

/** v5 Cycle: sow / grow / harvest / repeat wheel with the pledge. */
export function CoinCycle({ d, art }: { d: CoinCardData; art: IllustratedArt }) {
  const who = d.borrower ?? "a real borrower";
  return (
    <div style={{ display: "flex", width: "100%", height: "100%", backgroundColor: PAPER, fontFamily: "Figtree", padding: "48px 64px", alignItems: "center", gap: 40 }}>
      <div style={{ display: "flex", width: 520, alignItems: "center", justifyContent: "center" }}>
        <Art src={art.cycle} size={520} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 18 }}>
        <PaperMark />
        <div style={{ display: "flex", flexDirection: "column", fontFamily: BRUSH, fontSize: 64, color: INK, lineHeight: 1.05 }}>
          <div style={{ display: "flex" }}>{`Every $${fit(d.symbol, 10)} trade`}</div>
          <div style={{ display: "flex", color: C.leaf }}>{fit(`waters ${who}'s loan.`, 24)}</div>
        </div>
        <Squiggle width={260} color={C.gold} />
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 8 }}>
          <InkPhoto src={d.coinImage} size={56} label={d.symbol} />
          <div style={{ display: "flex", fontSize: 24, fontWeight: 700, color: C.muted }}>{`sow.fun/t/${d.mint.slice(0, 4)}…${d.mint.slice(-4)}`}</div>
        </div>
      </div>
    </div>
  );
}

/** v6 Watering: big brush 45% with the watering-can illustration and progress. */
export function CoinWatering({ d, art }: { d: CoinCardData; art: IllustratedArt }) {
  const who = d.borrower ?? "a real borrower";
  return (
    <div style={{ display: "flex", width: "100%", height: "100%", backgroundColor: PAPER, fontFamily: "Figtree", padding: "52px 64px" }}>
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <PaperMark />
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 24 }}>
          <div style={{ display: "flex", fontFamily: BRUSH, fontSize: 200, color: C.sprout, lineHeight: 0.85 }}>{`${IMPACT_FEE_PCT}%`}</div>
          <div style={{ display: "flex", flexDirection: "column", fontFamily: BRUSH, fontSize: 46, color: INK, lineHeight: 1.05, paddingBottom: 14 }}>
            <div style={{ display: "flex" }}>{`of every $${fit(d.symbol, 10)} fee`}</div>
            <div style={{ display: "flex", color: C.leaf }}>{fit(`grows ${who}'s loan`, 26)}</div>
          </div>
        </div>
        <ProgressBar loan={d.loan} dark={false} width={560} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: 420, gap: 10 }}>
        <Art src={art.watering} size={400} rotate={3} />
        <InkPhoto src={d.borrowerImage} size={86} label={who} />
      </div>
    </div>
  );
}

// ------------------------------------------------------------ rendering

export async function renderCard(
  element: ReactElement,
  opts: { width?: number; height?: number; cacheSeconds?: number } = {}
): Promise<ImageResponse> {
  const fonts = await loadFonts();
  const cache = opts.cacheSeconds ?? 300;
  return new ImageResponse(element, {
    width: opts.width ?? CARD.width,
    height: opts.height ?? CARD.height,
    fonts,
    headers: { "Cache-Control": `public, max-age=60, s-maxage=${cache}, stale-while-revalidate=${cache * 2}` },
  });
}

export function cardNotFound(message = "unknown coin"): Response {
  return new Response(message, { status: 404, headers: { "Cache-Control": "public, max-age=60" } });
}

export const COIN_VARIANTS = { 1: CoinPortrait, 2: CoinTicker, 3: CoinImpact } as const;
export const ILLUSTRATED_VARIANTS = { 4: CoinSprout, 5: CoinCycle, 6: CoinWatering } as const;

export function coinShareText(d: { symbol: string; borrower: string | null }): string {
  return `I just launched $${d.symbol} on @sowfunhq - ${IMPACT_FEE_PCT}% of every trade's fees fund ${d.borrower ? `${d.borrower}'s` : "a real"} Kiva loan.`;
}

