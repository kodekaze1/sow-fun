// The sow.fun launchpad economics, in one place. Both create-dbc-config.mjs
// (the real, immutable config) and devnet-rehearsal.mjs build from this, so
// the rehearsal exercises exactly what mainnet will run - only the migration
// threshold is shrunk so a rehearsal can graduate a pool with devnet SOL.

import BN from "bn.js";
import {
  buildCurve,
  ActivationType,
  BaseFeeMode,
  CollectFeeMode,
  MigrationOption,
  MigrationFeeOption,
  MigratedCollectFeeMode,
  DammV2DynamicFeeMode,
  TokenType,
  TokenDecimal,
  TokenAuthorityOption,
  PROTOCOL_FEE_PERCENT,
  PROTOCOL_POOL_CREATION_FEE_PERCENT,
  getNextSqrtPriceFromInput,
  getDeltaAmountBaseUnsigned,
  getDeltaAmountQuoteUnsigned,
  getPriceFromSqrtPrice,
  getMigrationThresholdPrice,
  Rounding,
} from "@meteora-ag/dynamic-bonding-curve-sdk";

export const ECONOMICS = {
  totalSupply: 1_000_000_000,
  // Pre-migration pool fee (bonding curve). Flat, no decay.
  poolFeeBps: 200,
  // Post-migration DAMM v2 pool fee.
  migratedPoolFeeBps: 100,
  // Of the fee AFTER Meteora's protocol cut: creator share; the rest goes to
  // the feeClaimer (treasury), deployed 45 loans / 10 ops per the pledge.
  creatorTradingFeePct: 45,
  // Paid by the launcher on every pool creation, enforced on-chain.
  // Meteora keeps PROTOCOL_POOL_CREATION_FEE_PERCENT of it; the rest is
  // claimable by the treasury (claimPartnerPoolCreationFee).
  poolCreationFeeSol: 0.035,
  // Graduation: SOL raised on the curve before migrating to DAMM v2
  // (pump.fun-style ~85 SOL), with ~20% of supply seeding the DAMM v2 pool.
  migrationQuoteSol: 85,
  percentageSupplyOnMigration: 20,
  // Migrated LP split - all permanently locked, mirroring the fee split.
  partnerLockedLpPct: 55,
  creatorLockedLpPct: 45,
};

export function buildSowCurve({ migrationQuoteSol = ECONOMICS.migrationQuoteSol } = {}) {
  return buildCurve({
    token: {
      tokenType: TokenType.SPLToken,
      tokenBaseDecimal: TokenDecimal.SIX,
      tokenQuoteDecimal: TokenDecimal.NINE,
      tokenAuthorityOption: TokenAuthorityOption.Immutable,
      totalTokenSupply: ECONOMICS.totalSupply,
      leftover: 0,
    },
    fee: {
      baseFeeParams: {
        baseFeeMode: BaseFeeMode.FeeSchedulerLinear,
        feeSchedulerParam: {
          startingFeeBps: ECONOMICS.poolFeeBps,
          endingFeeBps: ECONOMICS.poolFeeBps,
          numberOfPeriod: 0,
          totalDuration: 0,
        },
      },
      dynamicFeeEnabled: false,
      collectFeeMode: CollectFeeMode.QuoteToken,
      creatorTradingFeePercentage: ECONOMICS.creatorTradingFeePct,
      poolCreationFee: ECONOMICS.poolCreationFeeSol,
      enableFirstSwapWithMinFee: false,
    },
    migration: {
      migrationOption: MigrationOption.MET_DAMM_V2,
      migrationFeeOption: MigrationFeeOption.Customizable,
      migrationFee: { feePercentage: 0, creatorFeePercentage: 0 },
      migratedPoolFee: {
        collectFeeMode: MigratedCollectFeeMode.QuoteToken,
        dynamicFee: DammV2DynamicFeeMode.Disabled,
        poolFeeBps: ECONOMICS.migratedPoolFeeBps,
      },
    },
    liquidityDistribution: {
      partnerPermanentLockedLiquidityPercentage: ECONOMICS.partnerLockedLpPct,
      creatorPermanentLockedLiquidityPercentage: ECONOMICS.creatorLockedLpPct,
      partnerLiquidityPercentage: 0,
      creatorLiquidityPercentage: 0,
    },
    lockedVesting: {
      totalLockedVestingAmount: 0,
      numberOfVestingPeriod: 0,
      cliffUnlockAmount: 0,
      totalVestingDuration: 0,
      cliffDurationFromMigrationTime: 0,
    },
    activationType: ActivationType.Timestamp,
    percentageSupplyOnMigration: ECONOMICS.percentageSupplyOnMigration,
    migrationQuoteThreshold: migrationQuoteSol,
  });
}

const LAMPORTS = 1e9;
const BASE_UNITS = 1e6;

// Supply bought by a fresh-pool first buy of `sol`, walking the curve segments.
export function firstBuySupplyPct(curveConfig, sol) {
  const feeFactor = 1 - ECONOMICS.poolFeeBps / 10_000;
  let remaining = new BN(Math.floor(sol * feeFactor * LAMPORTS));
  let sqrtPrice = curveConfig.sqrtStartPrice;
  let baseOut = new BN(0);
  for (const seg of curveConfig.curve) {
    if (remaining.isZero() || seg.liquidity.isZero()) break;
    if (seg.sqrtPrice.lte(sqrtPrice)) continue;
    const next = getNextSqrtPriceFromInput(sqrtPrice, seg.liquidity, remaining, false);
    if (next.lte(seg.sqrtPrice)) {
      baseOut = baseOut.add(getDeltaAmountBaseUnsigned(sqrtPrice, next, seg.liquidity, Rounding.Down));
      remaining = new BN(0);
      break;
    }
    // Segment exhausted: consume its full quote and move on.
    const used = getDeltaAmountQuoteUnsigned(sqrtPrice, seg.sqrtPrice, seg.liquidity, Rounding.Up);
    baseOut = baseOut.add(getDeltaAmountBaseUnsigned(sqrtPrice, seg.sqrtPrice, seg.liquidity, Rounding.Down));
    remaining = remaining.sub(BN.min(used, remaining));
    sqrtPrice = seg.sqrtPrice;
  }
  return (baseOut.toNumber() / BASE_UNITS / ECONOMICS.totalSupply) * 100;
}


// Human-readable summary of what a config means, for review before creating it.
export function describeCurve(curveConfig) {
  const startPrice = getPriceFromSqrtPrice(curveConfig.sqrtStartPrice, TokenDecimal.SIX, TokenDecimal.NINE);
  const migSqrt = getMigrationThresholdPrice(curveConfig.migrationQuoteThreshold, curveConfig.sqrtStartPrice, curveConfig.curve);
  const migPrice = getPriceFromSqrtPrice(migSqrt, TokenDecimal.SIX, TokenDecimal.NINE);
  const supply = ECONOMICS.totalSupply;
  const netFee = 1 - PROTOCOL_FEE_PERCENT / 100;
  const lines = [
    `migration threshold:   ${curveConfig.migrationQuoteThreshold.toNumber() / LAMPORTS} SOL raised on curve`,
    `start market cap:      ${(startPrice.toNumber() * supply).toFixed(2)} SOL`,
    `migration market cap:  ${(migPrice.toNumber() * supply).toFixed(2)} SOL`,
    `pool fee:              ${ECONOMICS.poolFeeBps / 100}% pre-migration, ${ECONOMICS.migratedPoolFeeBps / 100}% after`,
    `fee split of each trade's fee: Meteora ${PROTOCOL_FEE_PERCENT}% | creator ${(ECONOMICS.creatorTradingFeePct * netFee).toFixed(1)}% | treasury ${((100 - ECONOMICS.creatorTradingFeePct) * netFee).toFixed(1)}%`,
    `launch fee:            ${ECONOMICS.poolCreationFeeSol} SOL (Meteora keeps ${PROTOCOL_POOL_CREATION_FEE_PERCENT}%, treasury ${100 - PROTOCOL_POOL_CREATION_FEE_PERCENT}%)`,
    `migrated LP:           100% permanently locked (${ECONOMICS.partnerLockedLpPct} treasury / ${ECONOMICS.creatorLockedLpPct} creator)`,
    `first-buy table (fresh pool, after ${ECONOMICS.poolFeeBps / 100}% fee):`,
  ];
  for (const sol of [0.1, 0.5, 1, 2, 3, 5, 10]) {
    lines.push(`  ${String(sol).padStart(4)} SOL -> ${firstBuySupplyPct(curveConfig, sol).toFixed(2)}% of supply`);
  }
  return lines.join("\n");
}
