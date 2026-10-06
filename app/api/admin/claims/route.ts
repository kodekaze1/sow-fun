import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { getMultipleAccountsChunked } from "@/lib/rpc-chunk.mjs";
import { Connection, PublicKey } from "@solana/web3.js";
import { DynamicBondingCurveClient } from "@meteora-ag/dynamic-bonding-curve-sdk";
import { kivaGQL } from "@/lib/kiva-graphql";
import { DBC_CONFIG_KEY } from "@/lib/launchpad";
import {
  classifyLaunch,
  getLaunchesFresh,
  getMigrationThresholdLamports,
  marketCapFromAccount,
  metadataPda,
  parseMetadata,
  poolField,
} from "@/lib/launchpad-onchain";
import { serverRpcUrl } from "@/lib/rpc-server";
import { GENESIS_WALLET, IMPACT_CARD_ADDRESS, OPS_WALLET, TEST_CONFIGS, TREASURY_WALLET } from "@/lib/constants";
import { getOwnerPositions, unclaimedSolLamports } from "@/lib/damm-v2.mjs";
import { getCoinPlans } from "@/lib/coin-plans";
import { isAdmin } from "@/lib/admin-auth";
import { getHarvestRecords } from "@/lib/harvest-auto";
import { getAllWaves, summarizeLedger } from "@/lib/waves";
import { readAllClaimSnapshots, readCardTopups } from "@/lib/claim-store";
import { getAllSuccessions } from "@/lib/succession-store";

// Operator command center data (/admin). Everything returned is public
// on-chain / Kiva data - the key just keeps the ops view private.

const USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
const LAUNCH_FEE_PARTNER_SOL = 0.035 * 0.9; // treasury's 90% of each launch fee

type KivaLoanStatus = {
  id: number;
  name: string;
  status: string;
  loanAmount: string;
  loanFundraisingInfo?: { fundedAmount?: string; reservedAmount?: string } | null;
  image?: { url?: string } | null;
};

interface RawSnapshot {
  claimed_at: string;
  sol_price_usd: number | null;
  total_claimed_sol?: number;
  pools: { pool?: string; mint: string | null; claimed_sol: number; source?: string; tx?: string }[];
  launch_fees?: { pool: string; net_lamports: number; tx: string }[];
  splits?: { to: string; wallet: string; sol: number; tx: string }[];
}

const sum = (xs: number[]) => xs.reduce((s, x) => s + x, 0);

async function walletBalance(connection: Connection, address: string) {
  const owner = new PublicKey(address);
  const [lamports, usdc] = await Promise.all([
    connection.getBalance(owner).catch(() => null),
    connection
      .getParsedTokenAccountsByOwner(owner, { mint: USDC_MINT })
      .then((r) => r.value.reduce((s, a) => s + (a.account.data.parsed.info.tokenAmount.uiAmount ?? 0), 0))
      .catch(() => null),
  ]);
  return { address, sol: lamports === null ? null : lamports / 1e9, usdc };
}

// Live market data (price, 24h volume/change, liquidity, mcap) from
// DexScreener's free public API - it indexes Meteora DBC and DAMM pools.
interface Market {
  priceUsd: number | null;
  volume24hUsd: number;
  change24hPct: number | null;
  liquidityUsd: number | null;
  marketCapUsd: number | null;
  url: string | null;
}
async function getMarkets(mints: string[]): Promise<Map<string, Market>> {
  const out = new Map<string, Market>();
  for (let i = 0; i < mints.length; i += 30) {
    const chunk = mints.slice(i, i + 30);
    try {
      const res = await fetch(`https://api.dexscreener.com/tokens/v1/solana/${chunk.join(",")}`, { next: { revalidate: 60 } });
      if (!res.ok) continue;
      const pairs = (await res.json()) as {
        baseToken?: { address?: string };
        priceUsd?: string;
        volume?: { h24?: number };
        priceChange?: { h24?: number };
        liquidity?: { usd?: number } | null;
        marketCap?: number;
        url?: string;
      }[];
      for (const p of pairs) {
        const mint = p.baseToken?.address;
        if (!mint) continue;
        const prev = out.get(mint);
        // A coin can trade in more than one pool (curve, then DAMM v2) - sum volume, keep the deepest
        const m: Market = {
          priceUsd: p.priceUsd ? Number(p.priceUsd) : null,
          volume24hUsd: (prev?.volume24hUsd ?? 0) + (p.volume?.h24 ?? 0),
          change24hPct: p.priceChange?.h24 ?? null,
          liquidityUsd: p.liquidity?.usd ?? null,
          marketCapUsd: p.marketCap ?? null,
          url: p.url ?? null,
        };
        if (!prev || (m.liquidityUsd ?? 0) >= (prev.liquidityUsd ?? 0)) out.set(mint, m);
        else out.set(mint, { ...prev, volume24hUsd: m.volume24hUsd });
      }
    } catch { /* market data is optional */ }
  }
  return out;
}

export async function GET(request: Request) {
  if (!process.env.ADMIN_KEY) {
    return NextResponse.json({ error: "ADMIN_KEY not configured on the server" }, { status: 503 });
  }
  if (!isAdmin(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  // The live config (once created) and the mainnet pilot - the operator can
  // watch either; the public site only ever uses the live one
  const configs = [
    ...(DBC_CONFIG_KEY && DBC_CONFIG_KEY.length >= 30 ? [{ key: DBC_CONFIG_KEY, label: "Live" }] : []),
    ...TEST_CONFIGS.filter((c) => c.key !== DBC_CONFIG_KEY),
  ];
  const requested = new URL(request.url).searchParams.get("config");
  const configKey = configs.find((c) => c.key === requested)?.key ?? configs[0].key;

  try {
    const connection = new Connection(serverRpcUrl(), "confirmed");
    const client = new DynamicBondingCurveClient(connection, "confirmed");
    const config = new PublicKey(configKey);
    // The Impact Treasury is whoever the config pays - the real treasury on the
    // live config, the test wallet on the pilot - so reconciliation always
    // checks the wallet the claims actually land in
    const feeClaimer =
      ((await client.state.getPoolConfig(config).catch(() => null)) as { feeClaimer?: PublicKey } | null)?.feeClaimer?.toBase58() ??
      TREASURY_WALLET;

    const [pools, fees, priceRes, threshold, wallets] = await Promise.all([
      client.state.getPoolsByConfig(config),
      client.state.getPoolsFeesByConfig(config),
      fetch("https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd", {
        next: { revalidate: 300 },
      }).then((r) => r.json()).catch(() => null),
      getMigrationThresholdLamports(client, configKey),
      Promise.all([
        walletBalance(connection, feeClaimer).then((b) => ({ ...b, role: feeClaimer === TREASURY_WALLET ? "Impact Treasury" : "Impact Treasury (pilot)" })),
        walletBalance(connection, GENESIS_WALLET).then((b) => ({ ...b, role: "Genesis" })),
        walletBalance(connection, OPS_WALLET).then((b) => ({ ...b, role: "Ops" })),
        walletBalance(connection, IMPACT_CARD_ADDRESS).then((b) => ({ ...b, role: "KAST card deposit" })),
      ]),
    ]);
    const solPrice: number = priceRes?.solana?.usd ?? 130;
    const feeByPool = new Map(fees.map((f) => [f.poolAddress.toBase58(), f]));

    // Graduated coins: the treasury's share accrues on its locked DAMM v2 LP position
    const lpSolByMint = new Map<string, number>();
    const treasuryPositions = await getOwnerPositions(connection, new PublicKey(feeClaimer)).catch(() => []);
    for (const pos of treasuryPositions) {
      for (const m of [pos.pool.tokenAMint.toBase58(), pos.pool.tokenBMint.toBase58()]) {
        lpSolByMint.set(m, (lpSolByMint.get(m) ?? 0) + unclaimedSolLamports(pos).toNumber() / 1e9);
      }
    }

    // ProgramAccount shape differs across SDK versions (address vs publicKey)
    const poolEntries = pools.map((p) => {
      const pa = p as unknown as { address?: PublicKey; publicKey?: PublicKey; account: { baseMint?: PublicKey } };
      return { address: (pa.address ?? pa.publicKey) as PublicKey, account: pa.account };
    });
    const baseMints = poolEntries.map((p) => poolField<PublicKey>(p.account, "baseMint") ?? null);
    const pdas = baseMints.filter(Boolean).map((m) => metadataPda(m!));
    const metaAccounts = pdas.length ? await getMultipleAccountsChunked(connection, pdas) : [];

    // Launch fees already claimed (recorded in claim snapshots)
    const snapshots = (await readAllClaimSnapshots()) as RawSnapshot[];
    const topups = await readCardTopups();
    const launchFeeClaimed = new Set(snapshots.flatMap((s) => (s.launch_fees ?? []).map((l) => l.pool)));

    // Metadata accounts were fetched only for pools with a mint - map back by index
    let k = 0;
    const metaByPool = baseMints.map((m) => (m ? metaAccounts[k++] : null));
    const rows = await Promise.all(
      poolEntries.map(async (entry, i) => {
        const poolAddr = entry.address.toBase58();
        const fee = feeByPool.get(poolAddr);
        const mint = baseMints[i];
        const info = metaByPool[i];
        let name = "Unknown token";
        let symbol = "?";
        let loanId: number | null = null;
        let origin: "sowfun" | "foreign" | "unknown" = "foreign";
        if (mint && info?.data) {
          try {
            const meta = parseMetadata(info.data as Buffer);
            name = meta.name || name;
            symbol = meta.symbol || symbol;
            // Only sow.fun launches carry a pledge - a pool created straight on
            // the config can't steer its fees to a borrower via its URI
            const launch = await classifyLaunch(meta.uri, mint.toBase58());
            origin = launch.kind === "sowfun" ? "sowfun" : launch.kind === "unknown" ? "unknown" : "foreign";
            loanId = launch.kind === "sowfun" ? launch.loanId : null;
          } catch { /* unparseable metadata */ }
        }
        const lpSol = mint ? lpSolByMint.get(mint.toBase58()) ?? 0 : 0;
        const partnerPendingSol = (fee ? fee.partnerQuoteFee.toNumber() / 1e9 : 0) + lpSol;
        const quoteReserveLamports = poolField<{ toNumber: () => number }>(entry.account, "quoteReserve")?.toNumber() ?? 0;
        const migrated = Boolean(poolField<number | boolean>(entry.account, "isMigrated"));
        return {
          pool: poolAddr,
          mint: mint?.toBase58() ?? null,
          origin,
          creator: poolField<PublicKey>(entry.account, "creator")?.toBase58() ?? null,
          launchedAt: poolField<{ toNumber: () => number }>(entry.account, "activationPoint")?.toNumber() ?? null,
          migrated,
          name,
          symbol,
          loanId,
          pendingSol: partnerPendingSol,
          pendingUsd: partnerPendingSol * solPrice,
          creatorPendingSol: fee ? fee.creatorQuoteFee.toNumber() / 1e9 : 0,
          lifetimeFeesSol: fee ? fee.totalTradingQuoteFee.toNumber() / 1e9 : 0,
          quoteReserveSol: quoteReserveLamports / 1e9,
          curvePct: migrated ? 100 : threshold ? Math.min(100, Math.round((quoteReserveLamports / threshold) * 100)) : null,
          marketCapSol: marketCapFromAccount(entry.account),
          launchFeeClaimed: launchFeeClaimed.has(poolAddr),
        };
      })
    );

    // One batched Kiva query for every referenced loan
    const loanIds = [...new Set(rows.map((r) => r.loanId).filter(Boolean))] as number[];
    const loanById = new Map<number, KivaLoanStatus>();
    if (loanIds.length) {
      const query = `{lend{${loanIds
        .map((id, i) => `l${i}: loan(id:${id}){id name status loanAmount loanFundraisingInfo{fundedAmount reservedAmount} image{url(customSize:"w480h360")}}`)
        .join(" ")}}}`;
      try {
        const data = await kivaGQL<{ lend: Record<string, KivaLoanStatus | null> }>(query, 120);
        for (const loan of Object.values(data.lend)) {
          if (loan) loanById.set(loan.id, loan);
        }
      } catch { /* Kiva unreachable - rows fall back to accruing */ }
    }

    const enriched = rows.map((r) => {
      const loan = r.loanId ? loanById.get(r.loanId) : undefined;
      const loanAmount = loan ? parseFloat(loan.loanAmount) || 0 : 0;
      const funded = loan ? parseFloat(loan.loanFundraisingInfo?.fundedAmount ?? "0") || 0 : 0;
      // Basket reservations are spoken for - Kiva shows the loan as done
      const reserved = loan ? parseFloat(loan.loanFundraisingInfo?.reservedAmount ?? "0") || 0 : 0;
      const remaining = Math.max(0, loanAmount - funded - reserved);
      const fundraising = loan?.status === "fundraising";
      // Crowd is close to finishing the loan - harvest early (ignore the usual
      // SOL threshold) or this coin's fees will arrive after it closes.
      const fillingFast = fundraising && remaining > 0 &&
        (remaining <= 100 || (loanAmount > 0 && funded / loanAmount >= 0.8));
      let state: "fund-now" | "harvest-soon" | "roll-over" | "accruing" = "accruing";
      if (r.origin === "sowfun") {
        if (r.pendingUsd > 1 && fundraising && remaining > 0 && r.pendingUsd >= remaining) state = "fund-now";
        else if (r.pendingUsd > 1 && fillingFast) state = "harvest-soon";
        else if (r.pendingUsd > 1 && (!fundraising || remaining === 0)) state = "roll-over";
      }
      return {
        ...r,
        borrower: loan
          ? { id: loan.id, name: loan.name, status: loan.status, loanAmount, funded, remaining, fillingFast, image: loan.image?.url ?? null }
          : null,
        state,
      };
    });

    const order = { "fund-now": 0, "harvest-soon": 1, "roll-over": 2, accruing: 3 };
    enriched.sort((a, b) => order[a.state] - order[b.state] || b.pendingUsd - a.pendingUsd);

    // Harvest plan per coin from CLAIMED funds (claim snapshots minus what
    // harvest records already deployed) - see lib/coin-ledger.ts
    const plans = await getCoinPlans({ solPrice, launches: await getLaunchesFresh(configKey) }).catch(() => new Map());
    const picks = await getAllSuccessions().catch(() => []);
    const withPlans = enriched.map((r) => {
      const plan = r.mint ? plans.get(r.mint) : undefined;
      return {
        ...r,
        plan: plan
          ? {
              ...plan.ledger.plan,
              availableCents: plan.ledger.availableCents, // claimed, owed to Kiva/skims, not yet deployed
              earnedCents: plan.ledger.earnedCents, // loan share of everything claimed
              accruingCents: plan.ledger.accruingCents, // loan share still unclaimed on-chain
              lentCents: plan.ledger.deployedPledgeCents + plan.ledger.deployedExcessCents,
              skimDoneCents: plan.ledger.skimDoneCents,
              livesFunded: plan.ledger.livesFunded,
              currentLoanId: plan.ledger.currentLoanId,
            }
          : null,
        operatorPicks: picks.filter((s) => s.mint === r.mint).map((s) => s.to_loan_id),
      };
    });

    const SOW_MINT = process.env.NEXT_PUBLIC_SOW_MINT ?? "";
    const markets = await getMarkets(withPlans.filter((r) => r.mint && (r.origin === "sowfun" || r.mint === SOW_MINT)).map((r) => r.mint!));
    const withMarkets = withPlans.map((r) => ({
      ...r,
      market: r.mint ? markets.get(r.mint) ?? null : null,
      // Fees are 2% on the curve, 1% after graduation - volume is fees / rate
      lifetimeVolumeSol: r.lifetimeFeesSol / (r.migrated ? 0.01 : 0.02),
    }));

    const [waves, records] = await Promise.all([getAllWaves(), getHarvestRecords().catch(() => [])]);
    const ledger = summarizeLedger(waves);
    const burnsFile = path.join(process.cwd(), "data", "burns.json");
    const burns = fs.existsSync(burnsFile) ? (JSON.parse(fs.readFileSync(burnsFile, "utf8")) as unknown[]) : [];

    const sow = withMarkets.filter((r) => r.origin === "sowfun");

    // Where every SOL goes, by bucket: still in the pools vs already collected
    // (claim snapshots) - Kiva gets 45/55 of sow.fun coins' partner share, Ops
    // 10/55 plus launch fees, Genesis the foreign pools plus $SOW's creator share
    const KIVA = 45 / 55;
    const OPS = 10 / 55;
    const sowPartnerPending = sum(sow.map((r) => r.pendingSol));
    const sowCreatorPending = withMarkets.find((r) => r.mint === SOW_MINT)?.creatorPendingSol ?? 0;
    const launchFeesPending = withMarkets.filter((r) => !r.launchFeeClaimed).length * LAUNCH_FEE_PARTNER_SOL;
    const sowfunMints = new Set(sow.map((r) => r.mint));
    let collectedKiva = 0;
    let collectedOpsFromPartner = 0;
    let collectedGenesis = 0;
    let collectedOps = 0;
    for (const snap of snapshots) {
      for (const p of snap.pools) {
        if (p.source === "genesis_vault") collectedGenesis += p.claimed_sol;
        else if (p.source === "foreign_pool" || p.source === "foreign_pool_lp") continue; // counted via the Genesis split
        else if (p.mint && sowfunMints.has(p.mint)) {
          collectedKiva += p.claimed_sol * KIVA;
          collectedOpsFromPartner += p.claimed_sol * OPS;
        }
      }
      for (const sp of snap.splits ?? []) {
        if (sp.to === "ops") collectedOps += sp.sol;
        if (sp.to === "genesis") collectedGenesis += sp.sol;
      }
    }
    if (!collectedOps) collectedOps = collectedOpsFromPartner; // snapshots from before automatic splits
    const buckets = [
      { key: "kiva", label: "Kiva loans", rule: "45/55 of sow.fun coins' partner share", uncollectedSol: sowPartnerPending * KIVA, collectedSol: collectedKiva },
      { key: "ops", label: "Ops", rule: "10/55 of sow.fun coins' partner share + launch fees", uncollectedSol: sowPartnerPending * OPS + launchFeesPending, collectedSol: collectedOps },
      {
        key: "genesis",
        label: "Genesis",
        rule: "foreign pools' partner share + $SOW's creator share",
        uncollectedSol: sum(withMarkets.filter((r) => r.origin !== "sowfun").map((r) => r.pendingSol)) + sowCreatorPending,
        collectedSol: collectedGenesis,
      },
      {
        key: "creators",
        label: "Creators (theirs)",
        rule: "45% of every coin - claimed by each creator on /my",
        uncollectedSol: sum(withMarkets.filter((r) => r.mint !== SOW_MINT).map((r) => r.creatorPendingSol)),
        collectedSol: null as number | null,
      },
    ];
    const borrowerRows = sow.filter((r) => r.borrower);

    return NextResponse.json({
      pools: withMarkets,
      solPrice,
      config: configKey,
      configs,
      wallets,
      sow: SOW_MINT ? { mint: SOW_MINT, lockUrl: process.env.NEXT_PUBLIC_SOW_LOCK_URL ?? null, row: withMarkets.find((r) => r.mint === SOW_MINT) ?? null } : null,
      buckets,
      totals: {
        pendingSol: sum(withPlans.map((r) => r.pendingSol)),
        pendingUsd: sum(withPlans.map((r) => r.pendingUsd)),
        readyCount: enriched.filter((r) => r.state !== "accruing").length,
        lifetimeFeesSol: sum(withPlans.map((r) => r.lifetimeFeesSol)),
        lifetimeVolumeSol: sum(sow.map((r) => r.lifetimeVolumeSol)),
        volume24hUsd: sum(sow.map((r) => r.market?.volume24hUsd ?? 0)),
        creatorPendingSol: sum(withPlans.map((r) => r.creatorPendingSol)),
        sowfunPartnerPendingSol: sum(sow.map((r) => r.pendingSol)),
        foreignPartnerPendingSol: sum(withPlans.filter((r) => r.origin !== "sowfun").map((r) => r.pendingSol)),
        launchFeesClaimableSol: withPlans.filter((r) => !r.launchFeeClaimed).length * LAUNCH_FEE_PARTNER_SOL,
        launches: sow.length,
        foreignPools: withPlans.length - sow.length,
        nearGraduation: sow.filter((r) => !r.migrated && (r.curvePct ?? 0) >= 75).length,
        graduated: sow.filter((r) => r.migrated).length,
        borrowersFundraising: borrowerRows.filter((r) => r.borrower!.status === "fundraising").length,
        borrowersClose: borrowerRows.filter((r) => r.borrower!.fillingFast).length,
        borrowersFunded: borrowerRows.filter((r) => r.borrower!.status !== "fundraising" && r.borrower!.status !== "expired").length,
        borrowersExpired: borrowerRows.filter((r) => r.borrower!.status === "expired").length,
        deployedCents: ledger.deployedCents,
        livesFunded: ledger.loansFunded,
        toLendCents: sum(sow.map((r) => (r.plan?.pledge?.cents ?? 0) + sum((r.plan?.queue ?? []).map((q: { cents: number }) => q.cents)))),
        skimCents: sum(sow.map((r) => r.plan?.skimCents ?? 0)),
        // Reconciliation: what the Impact Treasury should be holding for Kiva
        // (claimed, not yet lent or skimmed) vs what it actually holds
        owedCents: sum(sow.map((r) => r.plan?.availableCents ?? 0)),
        // Card top-ups not yet lent on Kiva: still owed money, just held as
        // card balance (KAST sweeps the deposit address, so read the receipts)
        inTransitCents: Math.max(0, Math.round(sum(topups.map((x) => x.usd)) * 100) - sum(sow.map((r) => r.plan?.lentCents ?? 0))),
        treasuryUsd: ((wallets[0].sol ?? 0) * solPrice) + (wallets[0].usdc ?? 0),
        earnedCents: sum(sow.map((r) => r.plan?.earnedCents ?? 0)),
        lentCents: sum(sow.map((r) => r.plan?.lentCents ?? 0)),
        skimDoneCents: sum(sow.map((r) => r.plan?.skimDoneCents ?? 0)),
        accruingCents: sum(sow.map((r) => r.plan?.accruingCents ?? 0)),
        reviewCount: records.filter((r) => r.status === "review").length,
      },
      harvestRecords: records.sort((a, b) => b.detected_at.localeCompare(a.detected_at)),
      history: {
        claims: snapshots
          .sort((a, b) => b.claimed_at.localeCompare(a.claimed_at))
          .map((s) => ({
            claimedAt: s.claimed_at,
            solPrice: s.sol_price_usd,
            totalSol: s.total_claimed_sol ?? sum(s.pools.map((p) => p.claimed_sol)),
            pools: s.pools.length,
            launchFees: (s.launch_fees ?? []).length,
            splits: s.splits ?? [],
            firstTx: s.pools[0]?.tx ?? s.launch_fees?.[0]?.tx ?? null,
          })),
        harvests: ledger.harvests,
        burns,
        topups,
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "failed to load pools" },
      { status: 500 }
    );
  }
}
