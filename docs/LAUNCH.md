# Launch day runbook ($SOW + launchpad go-live)

Launch treasury: sowMw8eTZE5NryyyTmpCoBfcW8oYsSZtqoanRMTybAj
(keypair: vanity-grinder/gpu-grinder/sowMw8eT...json). It is the mainnet
config's feeClaimer AND $SOW's creator - every <treasury.json> below means
this keypair. The old sowSZPr... wallet is TEST-ONLY (devnet rehearsals);
create-dbc-config and launch-genesis refuse to use anything else on mainnet.

Order matters. The DBC config is IMMUTABLE once created, so everything before
step 4 is a rehearsal and everything after it is permanent. Keep a terminal
log of every command and signature.

## T-48h: pre-flight

1. Devnet rehearsal is green on the current code:
   `KEYPAIR=<treasury.json> node scripts/devnet-rehearsal.mjs` -> REHEARSAL PASSED.
2. Production is on the latest commit and healthy: sow.fun pages 200,
   /api/rpc answers, no console errors.
3. Vercel env (names only): `npx vercel env ls` shows HELIUS_API_KEY,
   ADMIN_KEY, ANTHROPIC_API_KEY, BLOB_READ_WRITE_TOKEN, BLOB_BASE_URL.
   NEXT_PUBLIC_DBC_CONFIG_KEY and NEXT_PUBLIC_SOW_MINT are NOT set yet.
4. Helius dashboard: credits remaining for the month, usage alerts at 50% and
   80% turned on.
5. Kiva: logged in as lender `sowfun`, member of team sow.fun (290951), card
   bridge (KAST) funded for the first harvest, team selected as the default
   at checkout.
6. Keys backed up offline: treasury, $SOW vanity mint, Furnace program key.
7. Tweet #10 (CA tease) posted ~48h out.

## T-0: go-live

1. FUND THE LAUNCH TREASURY (sowMw8eT...): ~0.1 SOL for the config + the $SOW dev buy amount
   (FIRST_BUY_SOL) + ~0.1 SOL buffer for fees and rent.

2. REVIEW THE ECONOMICS (dry run, sends nothing):
   `node scripts/create-dbc-config.mjs`
   Check: 85 SOL graduation, ~27 SOL start / ~425 SOL graduation market cap,
   2% fee / 1% after, 45/55 split, 0.035 SOL launch fee, LP 55/45 locked.
   Save the printed output in the launch log.

   GO / NO-GO: if any number is wrong, fix scripts/lib/sow-config.mjs and
   rerun the devnet rehearsal before continuing. Do not create a config you
   would want to replace.

3. CREATE THE CONFIG (permanent):
   `KEYPAIR=<treasury.json> CONFIRM=1 node scripts/create-dbc-config.mjs`
   Record the config pubkey and signature.

4. POINT THE SITE AT IT (it is baked in at build time, so a redeploy is required):
   - Vercel: add NEXT_PUBLIC_DBC_CONFIG_KEY=<config> to Production.
   - .env.local: same line (BOM-less).
   - `npx vercel deploy --prod --yes`
   - Check /launch loads borrowers and /admin shows "no pools yet" (not the
     "config not created" notice).

5. LAUNCH $SOW (vanity mint, atomic dev buy):
   ```
   KEYPAIR=<treasury.json> MINT_KEYPAIR=<sow mint.json> CONFIG=<config> \
   LOAN=<kiva id> BORROWER="<name>" IMAGE=<blob key> FIRST_BUY_SOL=<amount> \
   node scripts/launch-genesis.mjs
   ```
   Confirm the mint ends in `sow` and the pool shows on /launches and /t/<mint>.

6. REVEAL:
   - Vercel: NEXT_PUBLIC_SOW_MINT=<mint> (shows the CA + how-to-buy block),
     flip SHOW_LIVE_TREASURY to true in lib/types.ts, commit, redeploy.
   - Post the CA and the dev-buy disclosure (amount + stated purpose).
   - Tweet #11.

7. WATCH (first 2 hours): /admin, Helius credit usage, Vercel function errors,
   X mentions. Keep the delist list (data/delisted.json) ready for abuse.

## If something goes wrong

- Wrong config parameters after step 3: the config cannot be edited.
  Create a corrected config ("config v2"), point NEXT_PUBLIC_DBC_CONFIG_KEY
  at it and redeploy. Coins already launched on v1 keep trading and their
  fees are still claimable with `CONFIG=<v1> node scripts/claim-fees.mjs`,
  but the site only indexes one config: list v1 coins in a note on /launches
  or launch v2 before any third party uses v1.
- launch-genesis fails or times out: check the mint on Solscan BEFORE
  retrying. If the mint exists, the pool exists - do not rerun with the same
  mint keypair.
- Site down or erroring: the chain keeps working; trading is on Jupiter and
  Meteora. Roll back with `npx vercel rollback` and investigate.
- RPC credits burning: tighten /api/rpc limits or temporarily return 503
  from it; server pages keep working.

## Within the first week

- First harvest: claim-fees (commit the snapshot) -> /admin plan or
  `node scripts/harvest-plan.mjs` -> Kiva checkout credited to team sow.fun ->
  buyback-burn per skim -> complete and commit the wave.
- Genesis Vault: `CREATOR=1 node scripts/claim-fees.mjs` claims $SOW's own
  creator share; record what it is used for (bonus loans, buyback + burn,
  community rewards) in the ledger.
- Deploy the Furnace to mainnet (~1.4 SOL) and record its authority decision.
