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
whole harvest rolls to the next adopted borrower per the allocation policy.

1. CLAIM (automated, on-chain receipt)
   KEYPAIR=<treasury.json> CONFIG=<config pubkey> node scripts/claim-fees.mjs
   - Sweeps the partner 55% share (SOL) from every launched pool to the treasury.
   - Add DRY=1 first to preview pending fees.
   - Receipt: claim tx signatures (solscan links).

2. OFF-RAMP (manual, receipt at every hop)
   Path A - PRIMARY: prepaid Visa bought DIRECTLY from the treasury wallet.
   - Swap claimed SOL -> USDC on Jupiter (on-chain tx from the treasury).
   - Pay Bitrefill for a virtual prepaid Visa straight from the TREASURY
     address (no KYC; ~$250-500/card, few % fee). This makes the outflow
     publicly visible on the treasury account itself - the whole point.
     Receipt: treasury outflow tx + Bitrefill invoice.
   - Pay Kiva at checkout with the prepaid Visa (register a ZIP if AVS asks).
   Path B - BACKUP: KAST card. Tested 2026-09-28; verdict: deposits are
   on-chain visible but SPENDS SETTLE INSIDE KAST'S LEDGER - no on-chain
   debit ever appears at the deposit address. Money-flow visibility is
   top-ups only, so use it only if Bitrefill fails, and lean on Kiva
   receipts for the spend side.
   Path C - exchange off-ramp (Kraken/Coinbase sell, bank, card/PayPal on Kiva).
   Never use anonymous offshore card issuers - unreliable and reputationally toxic.
   - Keep the 45/10 split here: 45 points of the fee go to loans, 10 to ops.
     (Creator's 45 never touches the vault - it is claimed by creators on-chain.)

3. FUND ON KIVA (manual, Kiva receipt)
   - Log in as lender `upliftifyfun`. Deposit via card/PayPal.
   - CRITICAL: at checkout, attribute every loan to team "sow.fun" (team 290885),
     or it will not appear in team stats. (The genesis Ailyn loan still needs its
     attribution fixed at kiva.org -> Portfolio -> Loans.)
   - Optional autopilot: enable Kiva auto-deposit + an autolending profile with
     team attribution - then this step reduces to topping up the balance.
   - Receipt: kiva.org/lend/<id> for each loan funded.

4. RECORD THE HARVEST (manual, public ledger)
   Add data/waves/wave-XXX.json:
   - movements[]: claim txs (type: fee_claim, tx_hash, explorer_url),
     off-ramp transfer tx, exchange order ID (note field), Kiva deposit.
   - loans[]: kiva_id, borrower, uplift_cents, verification.verified once the
     loan shows in the lender portfolio.
   Commit + push - the site renders it in the Harvest Ledger automatically.

5. PROOF (automated)
   The site polls the public Kiva GraphQL for lender/team stats and shows each
   loan with its kiva.org link. Keep the lender profile public or this breaks.

## Harvest allocation policy (user-approved 2026-09-17)

Per token, per harvest, from the vault's impact share:
1. Fund whatever remains of the beneficiary's Kiva loan (live remaining
   amount from the API - other lenders shrink it).
2. EXCESS: 80% -> the token's next adopted borrower (creator picks; same
   category by default). 20% -> market-buy $SOW: half burned (publish the
   burn tx), half to the Creator Rewards pool.
3. Creator rewards pay out in $SOW per borrower FULLY funded by their
   token (anti-wash: rewards track verified Kiva loans, never raw volume).
4. If the beneficiary's loan fills or expires before the wave executes, the
   entire harvest rolls to the adopted next borrower.
5. Repayments recycle into the same token's impact counter.

## Per-coin attribution (data/claims/)

claim-fees.mjs now writes data/claims/claim-<timestamp>.json on every real
run: per pool - mint, name/symbol, Kiva loan id, exact lamports claimed, and
the claim tx. COMMIT THE FILE with the harvest. It is the public source of
truth for "which coin generated which dollars"; wave records and per-token
impact counters derive from these snapshots, never from memory.

## Borrower adoption (data/successions.json)

When a coin's loan closes, its creator adopts the next borrower from /my.
The dashboard sends a free on-chain memo from the creator wallet:
  sow-adopt:{"mint":"<mint>","loan":<kivaId>,"name":"<borrower>"}
Operator loop (run before each harvest, and when a creator pings):
1. Verify the memo tx on Solscan: signer MUST be the pool's creator wallet,
   memo names the right mint, and the Kiva loan is still fundraising.
2. Append to data/successions.json:
   { "mint": "...", "from_loan_id": <old>, "to_loan_id": <new>,
     "borrower": "<name>", "memo_tx": "<sig>", "adopted_at": "<ISO date>" }
   (Chains are fine - the site treats the latest entry per mint as active.)
3. Commit + push. The token page flips to the adopted borrower with the
   memo linked as the adoption receipt.
If a creator never adopts within ~7 days of their loan closing, operator
assigns the next borrower in the same sector/country (memo_tx stays ""),
noted as operator-assigned. The pledge never idles.

## Genesis Vault ($SOW creator share)

$SOW's 45% creator share belongs to the project and accrues to the Genesis
Vault (claim with the creator flow, same as any creator). Public commitment:
it is deployed back into the ecosystem - bonus loans, $SOW buyback+burn, or
community rewards - at operator discretion based on what $SOW needs, and
EVERY deployment is published in the ledger with tx receipts. Never market-
sold quietly. Record vault deployments as movements in the wave files with
type and explorer links, same standard as harvests.

## Creator rewards (data/rewards.json)

Executed at harvest time, from each coin's EXCESS only (80/10/10 rule):
1. Compute the coin's excess from the claim snapshot + Kiva remaining.
2. Market-buy $SOW with 20% of excess (one tx). Burn half (second tx).
3. Append to data/rewards.json:
   { "mint","symbol","creator": <pool creator wallet>,
     "borrower_loan_id","borrower","sow_amount": <creator half>,
     "buy_tx","burn_tx","payout_tx": "", "harvest": "<wave id>",
     "date": "<ISO>", "status": "accruing" }
4. When the coin's borrower shows FUNDED and verified in the wave ledger,
   send the accrued $SOW to the creator wallet, set payout_tx and
   status: "paid", commit. /my shows the row flip from Accruing to Paid.
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
