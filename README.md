# sow.fun

**Launch a coin. Fund a life.**

The Solana launchpad where every token pledges 45% of its trading fees to a real
borrower on [Kiva](https://www.kiva.org) - locked at launch, verifiable forever.
Sow good, reap good.

## How it works

1. Pick a real person raising a microloan on Kiva (live borrower picker).
2. Launch a token on our Meteora Dynamic Bonding Curve config (2% flat fee,
   0.035 SOL on-chain launch fee). At 85 SOL raised it graduates to a Meteora
   DAMM v2 pool at 1%, with 100% of liquidity permanently locked.
3. The fee split is immutable: 45% creator / 45% Kiva loans / 10% operations,
   before and after graduation (locked LP positions split 55 vault / 45 creator).
4. Harvests: the vault claims its share on-chain, bridges to fiat, funds the
   loan, and publishes every receipt. Excess beyond the launch borrower: 80%
   funds the creator's on-chain borrower queue (up to 5), 20% of every extra
   dollar buys $SOW (half burned through the Furnace program, half creator
   rewards). A coin whose claim earns under 0.05 SOL in 72h releases its borrower.

## Stack

Next.js 16 · Tailwind v4 · @solana/wallet-adapter · @meteora-ag/dynamic-bonding-curve-sdk ·
Anchor (Furnace) · Kiva public GraphQL API

## Ops

- `scripts/lib/sow-config.mjs` - the launchpad economics, in one place
- `scripts/create-dbc-config.mjs` - immutable pool config (dry run by default, CONFIRM=1 to send)
- `scripts/launch-genesis.mjs` - $SOW genesis launch with an atomic dev buy (FIRST_BUY_SOL)
- `scripts/claim-fees.mjs` - sweep curve fees, locked LP fees and launch fees (CREATOR=1: Genesis Vault)
- `scripts/harvest-plan.mjs` - per-coin harvest plan -> pre-tagged draft wave
- `scripts/buyback-burn.mjs` - $SOW buyback into the Furnace + creator rewards
- `scripts/devnet-rehearsal.mjs` - full coin lifecycle on devnet with the real economics
- `programs/furnace/` - The Furnace: permissionless $SOW burn program with on-chain receipts
- `docs/OPERATIONS.md` - the harvest runbook, receipts at every hop
- `docs/LAUNCH.md` - launch-day runbook and rollback plan

Env: see `.env.example`. The Helius key is server-only (`HELIUS_API_KEY`); the
browser uses the `/api/rpc` proxy.

sow.fun is an independent community project, not affiliated with or endorsed by Kiva.
