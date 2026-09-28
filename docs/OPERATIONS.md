# Operations: how fees become Kiva loans

Kiva does NOT accept crypto for loans (card/PayPal only; their crypto donation
page funds Kiva's own operations, never borrowers - do not conflate the two in
copy). Every wave therefore crosses a fiat bridge. This runbook is the honest,
receipt-backed loop. Automate legs 1 and 5; legs 2-4 are manual until a Kraken
API integration is built.

## The loop (run when vault fees justify a harvest, e.g. >= 0.5 SOL)

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

KAST bridge: the card's Solana deposit address is published on /treasury as
the Impact Card once provided. Top up per harvest only - never park the vault.

## Rules
- Never describe crypto donations to Kiva as funding loans.
- Never skip a receipt - the entire pitch is that every hop is verifiable.
- The harvest ledger is the source of truth for dollars deployed; Kiva only shows
  total loan sizes, not our contribution.

## Later automation
- Kraken API (like UsePaid): market-sell SOL + withdraw to the bank that feeds
  Kiva auto-deposit -> the whole loop becomes claim -> cron -> autolend.
- Pending-fee dashboard on /treasury via getPoolsFeesByConfig.
