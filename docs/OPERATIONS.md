# Operations: how fees become Kiva loans

Kiva does NOT accept crypto for loans (card/PayPal only; their crypto donation
page funds Kiva's own operations, never borrowers - do not conflate the two in
copy). Every wave therefore crosses a fiat bridge. This runbook is the honest,
receipt-backed loop. Automate legs 1 and 5; legs 2-4 are manual until a Kraken
API integration is built.

## The loop (run when vault fees justify a harvest, e.g. >= 0.5 SOL)

EXCEPTION - sprint harvest: if a coin's beneficiary loan is >= 80% funded by
the crowd (or <= $100 remaining, or expiring within ~72h) and the coin has any
meaningful pending fees, run the loop for that pool IMMEDIATELY and ignore the
0.5 SOL threshold. Otherwise other Kiva lenders close the loan first and the
coin's own money never reaches its named borrower. The claims console (/admin)
flags these rows as "Loan filling fast - harvest early" (gold badge), sorted
just under fund-now. If the loan still closes before the money lands, the
whole harvest counts as excess and flows down the coin's borrower queue.

1. CLAIM (automated, on-chain receipt)
   KEYPAIR=<impact treasury.json> CONFIG=<config pubkey> node scripts/claim-fees.mjs
   - Sweeps, into the Impact Treasury (sowSaeM..., the config's fee claimer): the partner 55% of bonding-curve fees from
     every pool, the treasury's locked DAMM v2 LP fees on graduated coins,
     and launch fees.
   - $SOW's own creator share belongs to the Genesis wallet (sowMw8eT...,
     which launched $SOW): run it separately with
     KEYPAIR=<genesis.json> CREATOR=1 - curve fees + creator LP position.
     Recorded as source "genesis_vault", never as loan money. The script
     refuses any wallet that is neither the fee claimer nor CREATOR=1.
   - Add DRY=1 first to preview pending fees.
   - Writes data/claims/claim-<ts>.json - COMMIT IT (the ledger reads it).
   - Receipt: claim tx signatures (solscan links).

2. OFF-RAMP (manual, receipt at every hop)
   Path A - PRIMARY: KAST card (decided 2026-10-03).
   - Swap claimed SOL -> USDC on Jupiter (on-chain tx from the treasury).
   - Send USDC from the TREASURY address to the KAST deposit address
     (published as the Impact Card). The treasury outflow and card top-up
     are both publicly visible on-chain.
   - KNOWN LIMITATION (tested 2026-09-28): spends settle inside KAST's
     ledger - no on-chain debit appears at the deposit address. The spend
     side is therefore proven by the Kiva checkout receipt + loan link,
     and the card balance is ALWAYS displayed as IN TRANSIT, never as
     deployed (see Fund states below). Top up per harvest only, roughly
     matching the amount being deployed, so in-transit stays near zero
     between harvests.
   - Pay Kiva at checkout with the KAST Visa.
   Path B - BACKUP: prepaid Visa bought directly from the treasury wallet
   (Bitrefill, no KYC, ~$250-500/card) - use if KAST declines at Kiva or
   is unavailable. Receipt: treasury outflow tx + Bitrefill invoice.
   Path C - exchange off-ramp (Kraken/Coinbase sell, bank, card/PayPal on Kiva).
   Never use anonymous offshore card issuers - unreliable and reputationally toxic.
   - Keep the 45/10 split here: 45 points of the fee go to loans, 10 to ops.
     (Creator's 45 never touches the vault - it is claimed by creators on-chain.)

3. FUND ON KIVA (manual, Kiva receipt)
   - Log in as lender `sowfun` (id 6479341). Fund exactly what the /admin
     Harvest plan lists, per coin, in order.
   - CRITICAL: at checkout, credit EVERY loan to team "sow.fun" (team id
     290951, kiva.org/team/sowfun) in the basket's team dropdown. Kiva only
     counts a loan for a team if it is credited at checkout - this is what
     the monthly team leaderboard measures. Membership alone does nothing.
     (Genesis loans 3246961 + 3248088 predate joining: try Portfolio ->
     Loans -> team attribution; if Kiva won't allow it, they stay uncounted.)
   - Optional autopilot: enable Kiva auto-deposit + an autolending profile with
     team attribution - then this step reduces to topping up the balance.
   - Receipt: kiva.org/lend/<id> for each loan funded.

4. RECORD THE HARVEST (manual, public ledger)
   Add data/waves/wave-XXX.json:
   - movements[]: claim txs (type: fee_claim, tx_hash, explorer_url),
     off-ramp transfer tx, exchange order ID (note field), Kiva deposit.
   - loans[]: kiva_id, borrower, uplift_cents, verification.verified once the
     loan shows in the lender portfolio, AND "mint" (the coin whose money
     paid) + "role" ("pledge" for its launch borrower, "excess" for queue /
     fallback loans). Untagged loans count toward no coin.
   - skims[]: { mint, cents, buy_tx, burn_tx } for each coin's $SOW skim.
   - Shortcut: node scripts/harvest-plan.mjs writes a pre-tagged draft wave
     from the current plan - fill in tx hashes and verification, then commit.
   Commit + push - the site renders it in the Harvest Ledger automatically.

5. PROOF (automated)
   The site polls the public Kiva GraphQL for lender/team stats and shows each
   loan with its kiva.org link. Keep the lender profile public or this breaks.

## Fee routing (automatic, every claim run - user-approved 2026-10-06)

claim-fees.mjs (signed by the Impact Treasury) routes in the same run, with
one transfer tx recorded under splits[] in the claim snapshot:
- sow.fun coins' partner share: 45/55 STAYS in the Impact Treasury for Kiva
  (and the 20% $SOW skims); 10/55 -> Ops wallet sowyBNQ...
- Launch fees (every pool on the config) -> Ops.
- Foreign pools (created straight on the config, not through sow.fun - e.g.
  the fake $SOWs) -> Genesis wallet sowMw8eT... (their fees were never
  pledged to a borrower; the Genesis Vault is publicly committed to bonus
  loans / buyback + burn / rewards, with receipts). Snapshot rows are tagged
  "foreign_pool" / "foreign_pool_lp" and never count as loan money.
- A coin is sow.fun's only if its URI is sow.fun/m/<own mint> AND sow.fun
  serves its saved details. If any pool can't be verified (network), the run
  claims NOTHING. The split only forwards SOL that actually arrived in the
  run (keeps a 0.005 SOL reserve); otherwise it prints SPLIT NOT SENT and
  the amounts must be forwarded by hand and recorded in the wave.
- NO_SPLIT=1 claims without forwarding. $SOW's own creator share is claimed
  separately by the Genesis wallet (CREATOR=1) and is never split.

## Buybacks and burns (who signs)

- Policy skims (20% of each coin's excess loan money): sign buyback-burn.mjs
  with the Impact Treasury - the money is already there, and the receipt
  trail stays treasury -> Jupiter -> Furnace. Accruing creator rewards ($SOW)
  are held in the Impact Treasury until payout.
- Discretionary Genesis Vault buybacks: sign with the Genesis wallet.
- The FIRST burn of a mint lights its Furnace and makes the payer the
  recorded authority: light $SOW's Furnace from the Genesis wallet (or a
  multisig, once decided), not ad hoc from whichever wallet runs first.
- The Furnace program is devnet-only until its mainnet deploy (~1.4 SOL).

## Harvest allocation policy (user-approved 2026-09-17)

Per token, per harvest, from the vault's impact share:
1. Fund whatever remains of the beneficiary's Kiva loan (live remaining
   amount from the API - other lenders shrink it).
2. EXCESS: 20% of EVERY excess dollar -> market-buy $SOW: half burned
   through the Furnace, half creator rewards. 80% -> the creator's borrower
   queue in order (up to 5; same-category operator pick after 72h idle).
3. Creator rewards pay out in $SOW per borrower FULLY funded by their
   token (anti-wash: rewards track verified Kiva loans, never raw volume).
4. If the beneficiary's loan fills or expires before the wave executes, the
   entire harvest counts as excess and flows down the queue.
5. Repayments recycle into the same token's impact counter.

## Per-coin attribution (data/claims/)

claim-fees.mjs now writes data/claims/claim-<timestamp>.json on every real
run: per pool - mint, name/symbol, Kiva loan id, exact lamports claimed, and
the claim tx. It sweeps three sources: bonding-curve partner fees, the
treasury's locked DAMM v2 LP position on every graduated coin (entries with
source "damm_v2_locked_lp"), and launch fees (launch_fees[] - anti-bot
revenue, never attributed to a coin's loan pledge). COMMIT THE FILE with the harvest. It is the public source of
truth for "which coin generated which dollars"; wave records and per-token
impact counters derive from these snapshots, never from memory.

## Coin metadata (sow.fun/m/<mint>)

Every coin's on-chain URI is the fixed https://sow.fun/m/<mint>. At launch the
creator's details (image, Kiva loan, borrower, optional description, X,
Telegram, website) are saved write-once to Blob as coin-meta/<mint>.json
(lib/coin-meta.ts, /api/launch-meta - rejects overwrites and mints that
already exist). Blank fields fall back to defaults: website = the coin's
sow.fun page, X = @sowfunhq. The AI screen checks the description. Because
the URI points at sow.fun, the JSON it serves can be improved later for every
coin at once. Delisting a mint also strips its creator text and links.

## Launch moderation (data/delisted.json)

Two layers keep borrowers from being claimed by junk:
1. GATE: the launch flow AI-screens name+ticker before minting (slurs,
   impersonation, gibberish blocked; playful meme names allowed). Interface-
   level only - direct contract calls can bypass it.
2. DELIST: if an abusive/junk coin exists anyway, add its MINT address to
   data/delisted.json and push. Effect: it disappears from the launches
   board, its token page, and the borrower-claim index - the borrower
   REOPENS for a new coin. The creator can still claim their fees on /my
   (we never touch funds, we just stop indexing the coin). Use sparingly;
   log the reason in the commit message. The site index is the canonical
   record of which coin represents which borrower.

## Borrower claim expiry (72h, automatic)

A coin holds its borrower for 72 hours. If by then it has earned less than
0.05 SOL in lifetime trading fees and has not graduated, the claim LAPSES
and the borrower reopens - no operator action needed. Rules (code:
resolveBorrowerClaims in lib/launchpad-onchain.ts; constants
CLAIM_WINDOW_HOURS / CLAIM_MIN_FEES_SOL in lib/launchpad.ts):
- First launch wins. A coin minted for a borrower while that claim is still
  live never inherits it (blocks squatting by direct contract call).
- If the holder lapses, the next coin launched AFTER the lapse moment takes
  the borrower. A lapsed holder with no successor leaves the borrower open.
- Lapsed coins still trade and still exist on-chain; their creators keep
  claiming fees on /my, and lapsed coins stop counting toward the 3-coin
  wallet cap. The treasury's share of a lapsed coin's fees goes to the
  general harvest (next borrower), like any excess.
- The picker shows "Reopens in Nh unless it trades" on at-risk claims.

## Launch fee (on-chain)

Every pool creation pays 0.035 SOL to the config (enforced by Meteora's DBC
program, so it applies even to launches that bypass sow.fun). Meteora keeps
10%; the treasury claims 90% via claim-fees.mjs. Launchers also pay ~0.022
SOL of account rent + tx fees (measured on devnet). The fee is anti-bot
friction: squatting 100 borrowers costs ~5.7 SOL and funds the treasury.

## Graduation (migration to DAMM v2)

At 85 SOL raised on the curve (~425 SOL market cap) the pool migrates to a
Meteora DAMM v2 pool with a 1% fee. 100% of the migrated LP is permanently
locked: 55% treasury position, 45% creator position (each an NFT). Locked
liquidity can never be withdrawn but keeps earning its share of fees - the
treasury's via claim-fees.mjs, the creator's via the Claim button on /my.
Meteora's keeper performs the migration on mainnet (permissionless; the
devnet rehearsal calls it directly).

## Devnet rehearsal

  KEYPAIR=<treasury.json> node scripts/devnet-rehearsal.mjs

Runs a coin through launch -> trades -> pre-migration claims -> graduation ->
DAMM v2 trades -> post-migration claims on devnet with the real economics
(tiny 1 SOL graduation threshold). Writes a log to .devnet/. First pass
2026-10-05: PASSED - fee claims exact to the lamport, LP split 55.0/45.0.

## Borrower queues (on-chain, automatic)

Creators line up to 5 next borrowers per coin from /my ("Manage borrower
queue"). Saving signs a free Memo-program transaction from the creator
wallet:
  sow-queue:{"mint":"<mint>","loans":[<kivaId>, ...]}
The site reads it straight from the chain (lib/borrower-queue.ts): the
latest memo per mint wins, and it only counts if the coin's creator wallet
SIGNED the transaction (forged memos sent TO the wallet are ignored - tested
on devnet 2026-10-05). Legacy sow-adopt memos count as one-entry queues.
No operator step.

Queues are wish lists, not locks: two coins may queue the same borrower.
Only a coin's LAUNCH borrower is exclusive. At harvest a queued borrower is
skipped if their loan closed or another coin holds them as its launch
borrower; the money moves down the queue.

Fallback (72h): when a coin has claimed excess and no eligible borrower in
its queue, the creator has 72 hours from that claim to queue one. After
that, the operator funds a borrower in the same Kiva category and records
it in data/successions.json (memo_tx "", note "operator fallback") - those
entries are appended after the creator's queue.

## Genesis Vault ($SOW creator share)

$SOW's 45% creator share belongs to the project and accrues to the Genesis
Vault in the Genesis wallet sowMw8eT... (claim with KEYPAIR=<genesis.json>
CREATOR=1, same as any creator). Public commitment:
it is deployed back into the ecosystem - bonus loans, $SOW buyback+burn, or
community rewards - at operator discretion based on what $SOW needs, and
EVERY deployment is published in the ledger with tx receipts. Never market-
sold quietly. Record vault deployments as movements in the wave files with
type and explorer links, same standard as harvests.

## Harvest plan and recording (per coin)

The admin console (/admin) shows a Harvest plan per coin, computed by
lib/coin-ledger.ts from CLAIMED funds only:
  earned   = loan share (45/55) of every claim snapshot for the coin's mint,
             at that snapshot's SOL price
  deployed = wave loans tagged with the mint (role "pledge" or "excess")
             + wave skims[] for the mint
1. Run claim-fees.mjs and commit the snapshot FIRST - the plan only sees
   claimed money.
2. Fund exactly what the plan lists, in order: the launch borrower (pledge)
   up to their remaining need; then the queue with 80% of every excess
   dollar.
3. Skim 20% of every excess dollar to $SOW: buyback-burn.mjs with
   COIN_MINT set - half burned through the Furnace, half creator rewards
   (data/rewards.json, status "accruing" until the borrower is verified).
4. Record the wave with each loan's "mint" and "role", and a skims[] entry
   { mint, cents, buy_tx, burn_tx }. Untagged loans (founder seed) never
   count toward any coin.
The token page and /my show the same numbers: earned, lent on Kiva, lives
funded, next-harvest plan, and who is up next.

Anti-wash rule is structural: rewards only exist as a fraction of excess
that already funded a real loan, and only unlock on Kiva-verified loans.

KAST bridge: the card's Solana deposit address is published on /treasury as
the Impact Card once provided. Top up per harvest only - never park the vault.

## Fund states (accounting language - never blur these)

Every impact dollar is in exactly one state, and the site must label it so:
1. ON-CHAIN - sitting in the treasury wallet (SOL/USDC). Verifiable by anyone.
2. IN TRANSIT - left the treasury for the bridge: on a card, at an exchange,
   or in the Kiva cash balance but NOT yet lent. Shown in amber, explicitly
   labeled "not yet deployed". Card/bridge balances are NEVER presented as
   impact delivered.
3. DEPLOYED - a Kiva loan checkout completed; the kiva.org/lend link exists.
   Only this state counts toward "Total deployed" / lives-lifted numbers.
4. RECYCLED - repayments returned to the Kiva balance and re-lent.
If a harvest pauses mid-bridge, the ledger shows the in-transit amount and
where it sits. "We have it" and "we spent it on a loan" are different claims.

## Rules
- Never describe crypto donations to Kiva as funding loans.
- Never skip a receipt - the entire pitch is that every hop is verifiable.
- The harvest ledger is the source of truth for dollars deployed; Kiva only shows
  total loan sizes, not our contribution.

## Later automation
- Kraken API (like UsePaid): market-sell SOL + withdraw to the bank that feeds
  Kiva auto-deposit -> the whole loop becomes claim -> cron -> autolend.
- Pending-fee dashboard on /treasury via getPoolsFeesByConfig.
