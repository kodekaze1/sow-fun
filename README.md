# sow.fun

**Launch a coin. Fund a life.**

The Solana launchpad where every token pledges 45% of its trading fees to a real
borrower on [Kiva](https://www.kiva.org) - locked at launch, verifiable forever.
Sow good, reap good.

## How it works

1. Pick a real person raising a microloan on Kiva (live borrower picker).
2. Launch a token on our Meteora Dynamic Bonding Curve config (2% flat fee).
3. The fee split is immutable: 45% creator / 45% Kiva loans / 10% operations.
4. Harvests: the vault claims its share on-chain, bridges to fiat, funds the
   loan, and publishes every receipt. Excess: 80% adopts the next borrower,
   20% buys $SOW (half burned, half rewards the creator per life lifted).

## Stack

Next.js 16 · Tailwind v4 · @solana/wallet-adapter · @meteora-ag/dynamic-bonding-curve-sdk ·
Kiva public GraphQL API

## Ops

- `scripts/create-dbc-config.mjs` - one-time immutable pool config creation
- `scripts/claim-fees.mjs` - sweep the vault's fee share from all pools
- `docs/OPERATIONS.md` - the harvest runbook, receipts at every hop

sow.fun is an independent community project, not affiliated with or endorsed by Kiva.
