// Server-side reads of the launchpad's on-chain state: pools launched from
// the sow.fun config, their token identities, and accrued fees.

import { Connection, PublicKey } from "@solana/web3.js";
import { unstable_cache } from "next/cache";
import { DynamicBondingCurveClient, getPriceFromSqrtPrice, TokenDecimal } from "@meteora-ag/dynamic-bonding-curve-sdk";
import { DBC_CONFIG_KEY, IMPACT_FEE_PCT, CLAIM_WINDOW_HOURS, CLAIM_MIN_FEES_SOL } from "@/lib/launchpad";
import { serverRpcUrl } from "@/lib/rpc-server";
import { publicImageUrl, readCoinMeta, readCoinMetaChecked } from "@/lib/coin-meta";
import { getMultipleAccountsChunked } from "@/lib/rpc-chunk.mjs";

export const METADATA_PROGRAM = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");

export function metadataPda(mint: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("metadata"), METADATA_PROGRAM.toBuffer(), mint.toBuffer()],
    METADATA_PROGRAM
  )[0];
}

// token-metadata layout: key(1) + updateAuthority(32) + mint(32) + 3 borsh strings
export function parseMetadata(data: Buffer): { name: string; symbol: string; uri: string } {
  let offset = 65;
  const readStr = () => {
    const len = data.readUInt32LE(offset);
    offset += 4;
    const s = data.slice(offset, offset + len).toString("utf8").replace(/\0/g, "").trim();
    offset += len;
    return s;
  };
  return { name: readStr(), symbol: readStr(), uri: readStr() };
}

// Our launch URIs bake the beneficiary into query params (see tokenMetadataUri)
export function parseLaunchUri(uri: string): { loanId: number | null; borrower: string | null; image: string | null } {
  try {
    const u = new URL(uri);
    const loan = u.searchParams.get("loan");
    // Uploaded images are stored as short blob keys (URI length cap);
    // expand to the public blob URL for display.
    let image = u.searchParams.get("image");
    if (image) image = publicImageUrl(image);
    return {
      loanId: loan ? parseInt(loan, 10) || null : null,
      borrower: u.searchParams.get("borrower"),
      image,
    };
  } catch {
    return { loanId: null, borrower: null, image: null };
  }
}

// Current launches use the short URI sow.fun/m/<mint>, with launch details
// stored in Blob (lib/coin-meta); earlier ones baked them into query params.
export async function resolveLaunchUri(uri: string): Promise<{ loanId: number | null; borrower: string | null; image: string | null }> {
  try {
    const m = /^\/m\/([1-9A-HJ-NP-Za-km-z]{32,44})\/?$/.exec(new URL(uri).pathname);
    if (m) {
      const stored = await readCoinMeta(m[1]);
      if (!stored) return { loanId: null, borrower: null, image: null };
      const image = stored.image ? publicImageUrl(stored.image) : null;
      return { loanId: stored.loanId, borrower: stored.borrower, image };
    }
  } catch { /* fall through to the legacy query-param form */ }
  return parseLaunchUri(uri);
}

// The DBC config is permissionless: anyone can create a pool on it straight
// from the contract, skipping the site's checks, and name it anything (e.g.
// a fake "$SOW"). A coin counts as a sow.fun launch only if its on-chain URI
// is sow.fun/m/<its own mint> AND sow.fun saved its details at launch.
// "unknown" = the details lookup failed; callers keep such coins (without
// borrower details) so a storage outage never hides a real launch.
export async function classifyLaunch(uri: string, mint: string): Promise<
  { kind: "sowfun"; loanId: number | null; borrower: string | null; image: string | null } | { kind: "foreign" } | { kind: "unknown" }
> {
  let pathMint: string | null = null;
  try {
    const u = new URL(uri);
    const m = /^\/m\/([1-9A-HJ-NP-Za-km-z]{32,44})\/?$/.exec(u.pathname);
    if ((u.hostname === "sow.fun" || u.hostname.endsWith(".sow.fun")) && m) pathMint = m[1];
  } catch { /* not a URL */ }
  if (pathMint !== mint) return { kind: "foreign" };
  const { meta, confirmedMissing } = await readCoinMetaChecked(mint);
  if (meta) {
    const image = meta.image ? publicImageUrl(meta.image) : null;
    return { kind: "sowfun", loanId: meta.loanId, borrower: meta.borrower, image };
  }
  return confirmedMissing ? { kind: "foreign" } : { kind: "unknown" };
}

export function getDbcClient(): { connection: Connection; client: DynamicBondingCurveClient } {
  const connection = new Connection(serverRpcUrl(), "confirmed");
  return { connection, client: new DynamicBondingCurveClient(connection, "confirmed") };
}

export interface LaunchSummary {
  pool: string;
  mint: string | null;
  name: string;
  symbol: string;
  image: string | null;
  loanId: number | null;
  borrowerName: string | null;
  pendingVaultSol: number;
  lifetimeFeesSol: number;
  impactShareSol: number; // Kiva loan share (45%) of lifetime fees
  quoteReserveSol: number; // SOL raised on the bonding curve so far
  curvePct: number | null; // progress toward graduation (null if threshold unknown)
  launchedAt: number | null; // unix seconds (pool activation point)
  migrated: boolean;
  creator: string | null; // pool creator wallet
  marketCapSol: number | null; // curve price x 1B supply (frozen at graduation)
}

// The SDK has returned pool fields both flat and nested under poolState
// across versions - read either shape.
type BNLike = { toNumber: () => number };
// Market cap in SOL from the pool's sqrt price: price per token (6-decimal
// base, 9-decimal SOL) times the fixed 1,000,000,000 supply.
const TOTAL_SUPPLY = 1_000_000_000;
export function marketCapFromAccount(account: unknown): number | null {
  try {
    const sqrt = poolField<BNLike & { toString(): string }>(account, "sqrtPrice");
    if (!sqrt) return null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const price = getPriceFromSqrtPrice(sqrt as any, TokenDecimal.SIX, TokenDecimal.NINE);
    const mc = Number(price.toString()) * TOTAL_SUPPLY;
    return Number.isFinite(mc) ? mc : null;
  } catch {
    return null;
  }
}

export function poolField<T>(account: unknown, name: string): T | undefined {
  const a = account as Record<string, unknown> & { poolState?: Record<string, unknown> };
  return (a?.[name] ?? a?.poolState?.[name]) as T | undefined;
}

// A coin's claim on its borrower has lapsed if it is past the claim window,
// never graduated, and earned less than the minimum lifetime fees.
export function isClaimLapsed(l: LaunchSummary, nowSec = Date.now() / 1000): boolean {
  if (l.migrated || !l.launchedAt) return false;
  return nowSec - l.launchedAt >= CLAIM_WINDOW_HOURS * 3600 && l.lifetimeFeesSol < CLAIM_MIN_FEES_SOL;
}

// Which coin holds each borrower. First launch wins; if the holder lapses,
// the next coin launched AFTER the lapse moment takes over (coins minted
// while the claim was live never win - that blocks squatting by contract
// call). A lapsed holder with no successor leaves the borrower open.
export function resolveBorrowerClaims(launches: LaunchSummary[], nowSec = Date.now() / 1000) {
  const byLoan = new Map<number, LaunchSummary[]>();
  for (const l of launches) {
    if (!l.loanId) continue;
    const list = byLoan.get(l.loanId) ?? [];
    list.push(l);
    byLoan.set(l.loanId, list);
  }
  const holders = new Map<number, LaunchSummary>();
  const lapsed = new Set<string>();
  for (const [loanId, list] of byLoan) {
    list.sort((a, b) => (a.launchedAt ?? 0) - (b.launchedAt ?? 0));
    let holder: LaunchSummary | null = list[0];
    while (holder && isClaimLapsed(holder, nowSec)) {
      if (holder.mint) lapsed.add(holder.mint);
      const lapseAt: number = (holder.launchedAt ?? 0) + CLAIM_WINDOW_HOURS * 3600;
      const prev: LaunchSummary = holder;
      holder = list.find((l) => (l.launchedAt ?? 0) >= lapseAt && l !== prev) ?? null;
    }
    if (holder) holders.set(loanId, holder);
  }
  return { holders, lapsed };
}

// Migration threshold (lamports) from the config account, cached per process
const thresholdCache = new Map<string, number>();
export async function getMigrationThresholdLamports(client: DynamicBondingCurveClient, configKey: string = DBC_CONFIG_KEY): Promise<number | null> {
  const hit = thresholdCache.get(configKey);
  if (hit !== undefined) return hit;
  let lamports: number | null = null;
  try {
    const state = client.state as unknown as { getPoolConfig?: (a: PublicKey) => Promise<unknown> };
    if (state.getPoolConfig) {
      const cfg = (await state.getPoolConfig(new PublicKey(configKey))) as {
        migrationQuoteThreshold?: { toNumber: () => number };
      } | null;
      lamports = cfg?.migrationQuoteThreshold?.toNumber() ?? null;
    }
  } catch { /* optional - graduation bar hides without it */ }
  // Never cache a failed lookup (e.g. an RPC outage) - retry next time
  if (lamports !== null) thresholdCache.set(configKey, lamports);
  return lamports;
}

// Share of each coin's (post-Meteora) fees pledged to Kiva loans
const LOAN_SHARE = IMPACT_FEE_PCT / 100;

// Operator moderation: mints listed in data/delisted.json are removed from
// the public index (launches board, token pages, borrower claims) - the
// borrower they claimed reopens for a new coin. Creators can still claim
// their fees via /my, which does not use this filter.
import delistedJson from "@/data/delisted.json";
const DELISTED = new Set<string>(delistedJson as string[]);

// The full index is two program scans plus a metadata batch - cache it
// across requests (Next data cache, shared by serverless instances).
// LaunchSummary is plain JSON, so it serializes safely.
const LAUNCHES_REVALIDATE_SECONDS = 30;
const getLaunchesCached = unstable_cache(() => loadLaunches(), ["sow-launches", DBC_CONFIG_KEY], {
  revalidate: LAUNCHES_REVALIDATE_SECONDS,
  tags: ["sow-launches"],
});

/** Cached launch index (up to 30s old). Use for boards, pages and plans. */
export async function getLaunches(): Promise<LaunchSummary[]> {
  try {
    return await getLaunchesCached();
  } catch {
    // Outside a Next request (scripts, tests) the data cache is unavailable
    return loadLaunches();
  }
}

/** Uncached launch index - for the pre-mint "is this borrower taken" check. */
export async function getLaunchesFresh(configKey: string = DBC_CONFIG_KEY): Promise<LaunchSummary[]> {
  return loadLaunches(configKey);
}

async function loadLaunches(configKey: string = DBC_CONFIG_KEY): Promise<LaunchSummary[]> {
  if (!configKey || configKey.length < 30) return [];
  const { connection, client } = getDbcClient();
  const config = new PublicKey(configKey);

  const [pools, fees] = await Promise.all([
    client.state.getPoolsByConfig(config),
    client.state.getPoolsFeesByConfig(config),
  ]);
  const feeByPool = new Map(fees.map((f) => [f.poolAddress.toBase58(), f]));

  const thresholdLamports = await getMigrationThresholdLamports(client, configKey);
  const entries = pools.map((p) => {
    const pa = p as unknown as {
      address?: PublicKey; publicKey?: PublicKey;
      account: { baseMint?: PublicKey };
    };
    let quoteReserveLamports = 0;
    let launchedAt: number | null = null;
    try {
      quoteReserveLamports = poolField<BNLike>(pa.account, "quoteReserve")?.toNumber() ?? 0;
      launchedAt = poolField<BNLike>(pa.account, "activationPoint")?.toNumber() ?? null;
    } catch { /* shape drift */ }
    const migrated = Boolean(poolField<number | boolean>(pa.account, "isMigrated"));
    const creator = poolField<PublicKey>(pa.account, "creator")?.toBase58() ?? null;
    const marketCapSol = marketCapFromAccount(pa.account);
    return { address: (pa.address ?? pa.publicKey) as PublicKey, baseMint: poolField<PublicKey>(pa.account, "baseMint") ?? null, quoteReserveLamports, launchedAt, migrated, creator, marketCapSol };
  }).filter((e) => !e.baseMint || !DELISTED.has(e.baseMint.toBase58()));

  const pdas = entries.filter((e) => e.baseMint).map((e) => metadataPda(e.baseMint as PublicKey));
  const metaAccounts = pdas.length ? await getMultipleAccountsChunked(connection, pdas) : [];

  const launches: LaunchSummary[] = [];
  let metaIdx = 0;
  for (const entry of entries) {
    const poolAddr = entry.address.toBase58();
    const fee = feeByPool.get(poolAddr);
    const pendingVaultSol = fee ? fee.partnerQuoteFee.toNumber() / 1e9 : 0;
    const lifetimeFeesSol = fee ? fee.totalTradingQuoteFee.toNumber() / 1e9 : 0;

    let name = "Unknown token";
    let symbol = "?";
    let loanId: number | null = null;
    let borrowerName: string | null = null;
    let image: string | null = null;

    // Only coins launched through sow.fun are listed (see classifyLaunch).
    // Foreign pools on the config still pay its fee claimer - they just never
    // appear on the board, token pages or borrower claims.
    if (!entry.baseMint) continue;
    const info = metaAccounts[metaIdx++];
    if (!info?.data) continue;
    try {
      const meta = parseMetadata(info.data as Buffer);
      const launch = await classifyLaunch(meta.uri, entry.baseMint.toBase58());
      if (launch.kind === "foreign") continue;
      name = meta.name || name;
      symbol = meta.symbol || symbol;
      if (launch.kind === "sowfun") {
        loanId = launch.loanId;
        borrowerName = launch.borrower;
        image = launch.image;
      }
    } catch {
      continue; // unparseable metadata - not a sow.fun launch
    }

    launches.push({
      pool: poolAddr,
      mint: entry.baseMint?.toBase58() ?? null,
      name,
      symbol,
      image,
      loanId,
      borrowerName,
      pendingVaultSol,
      lifetimeFeesSol,
      impactShareSol: lifetimeFeesSol * LOAN_SHARE,
      quoteReserveSol: entry.quoteReserveLamports / 1e9,
      curvePct: thresholdLamports
        ? Math.min(100, Math.round((entry.quoteReserveLamports / thresholdLamports) * 100))
        : null,
      launchedAt: entry.launchedAt,
      migrated: entry.migrated,
      creator: entry.creator,
      marketCapSol: entry.marketCapSol,
    });
  }

  launches.sort((a, b) => b.lifetimeFeesSol - a.lifetimeFeesSol);
  return launches;
}

export interface CreatorLaunch extends LaunchSummary {
  creatorPendingSol: number;
  creatorPendingLamports: string;
}

// All coins a wallet has launched from the sow.fun config, with their
// unclaimed creator fee share.
export async function getLaunchesByCreator(creator: string): Promise<CreatorLaunch[]> {
  if (!DBC_CONFIG_KEY || DBC_CONFIG_KEY.length < 30) return [];
  const { connection, client } = getDbcClient();
  const creatorKey = new PublicKey(creator);

  const pools = await client.state.getPoolsByCreator(creatorKey);
  const entries = pools
    .map((p) => {
      const pa = p as unknown as {
        address?: PublicKey; publicKey?: PublicKey;
        account: { baseMint?: PublicKey; config?: PublicKey };
      };
      return { address: (pa.address ?? pa.publicKey) as PublicKey, account: pa.account };
    })
    .map((e) => ({ ...e, baseMint: poolField<PublicKey>(e.account, "baseMint") ?? null }))
    .filter((e) => poolField<PublicKey>(e.account, "config")?.toBase58() === DBC_CONFIG_KEY);

  const thresholdLamports = await getMigrationThresholdLamports(client);
  const results: CreatorLaunch[] = [];
  for (const entry of entries) {
    let name = "Unknown token";
    let symbol = "?";
    let loanId: number | null = null;
    let borrowerName: string | null = null;
    let image: string | null = null;
    if (entry.baseMint) {
      const info = await connection.getAccountInfo(metadataPda(entry.baseMint));
      if (info?.data) {
        try {
          const meta = parseMetadata(info.data as Buffer);
          name = meta.name || name;
          symbol = meta.symbol || symbol;
          const parsed = await resolveLaunchUri(meta.uri);
          loanId = parsed.loanId;
          borrowerName = parsed.borrower;
          image = parsed.image;
        } catch { /* unparseable */ }
      }
    }
    let creatorPendingLamports = "0";
    let lifetimeFeesSol = 0;
    try {
      const metrics = await client.state.getPoolFeeMetrics(entry.address);
      creatorPendingLamports = metrics.current.creatorQuoteFee.toString();
      lifetimeFeesSol = metrics.total.totalTradingQuoteFee.toNumber() / 1e9;
    } catch { /* metrics unavailable */ }

    let quoteReserveLamports = 0;
    let launchedAt: number | null = null;
    try {
      quoteReserveLamports = poolField<BNLike>(entry.account, "quoteReserve")?.toNumber() ?? 0;
      launchedAt = poolField<BNLike>(entry.account, "activationPoint")?.toNumber() ?? null;
    } catch { /* shape drift */ }
    const migrated = Boolean(poolField<number | boolean>(entry.account, "isMigrated"));

    results.push({
      pool: entry.address.toBase58(),
      mint: entry.baseMint?.toBase58() ?? null,
      name,
      symbol,
      image,
      loanId,
      borrowerName,
      pendingVaultSol: 0,
      lifetimeFeesSol,
      impactShareSol: lifetimeFeesSol * LOAN_SHARE,
      quoteReserveSol: quoteReserveLamports / 1e9,
      curvePct: thresholdLamports
        ? Math.min(100, Math.round((quoteReserveLamports / thresholdLamports) * 100))
        : null,
      launchedAt,
      migrated,
      creator,
      marketCapSol: marketCapFromAccount(entry.account),
      creatorPendingSol: Number(creatorPendingLamports) / 1e9,
      creatorPendingLamports,
    });
  }
  results.sort((a, b) => b.lifetimeFeesSol - a.lifetimeFeesSol);
  return results;
}

export async function getLaunchByMint(mint: string): Promise<LaunchSummary | null> {
  let mintKey: PublicKey;
  try {
    mintKey = new PublicKey(mint);
  } catch {
    return null;
  }
  const launches = await getLaunches();
  return launches.find((l) => l.mint === mintKey.toBase58()) ?? null;
}

export async function getSolPrice(): Promise<number> {
  try {
    const res = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd", {
      next: { revalidate: 300 },
    });
    const json = await res.json();
    return json?.solana?.usd ?? 130;
  } catch {
    return 130;
  }
}
