# Operations: how fees become Kiva loans

Kiva does NOT accept crypto for loans (card/PayPal only; their crypto donation
page funds Kiva's own operations, never borrowers - do not conflate the two in
copy). Every wave therefore crosses a fiat bridge. This runbook is the honest,
receipt-backed loop. Automate legs 1 and 5; legs 2-4 are manual until a Kraken
API integration is built.

## The loop (run when vault fees justify a wave, e.g. >= 0.5 SOL)

1. CLAIM (automated, on-chain receipt)
   KEYPAIR=<treasury.json> CONFIG=<config pubkey> node scripts/claim-fees.mjs
   - Sweeps the partner 55% share (SOL) from every launched pool to the treasury.
   - Add DRY=1 first to preview pending fees.
   - Receipt: claim tx signatures (solscan links).

2. OFF-RAMP (manual, receipt at every hop)
   Path A - no-KYC gift-card bridge (default for early waves):
   - Swap claimed SOL -> USDC on Jupiter (on-chain tx).
   - Buy a virtual prepaid Visa with USDC on Bitrefill (no KYC; ~$250-500
     per card, few % fee). Receipt: the on-chain USDC payment + invoice.
   - Pay Kiva at checkout with the prepaid Visa (register a ZIP if AVS asks).
   Path B - KAST card (if volume outgrows gift-card limits):
   - 2-min KYC once, instant virtual Visa, loads USDC 1:1 over Solana.
   - Publish the card's Solana deposit address as the "Impact Card" so every
     top-up is publicly visible; keep the card balance lean (top up per wave).
   Path C - exchange off-ramp (Kraken/Coinbase sell, bank, card/PayPal on Kiva).
   Never use anonymous offshore card issuers - unreliable and reputationally toxic.
   - Keep the 45/10 split here: 45 points of the fee go to loans, 10 to ops.
     (Creator's 45 never touches the vault - it is claimed by creators on-chain.)

3. FUND ON KIVA (manual, Kiva receipt)
   - Log in as lender `upliftifyfun`. Deposit via card/PayPal.
   - CRITICAL: at checkout, attribute every loan to team "Upliftify" (team 290885),
     or it will not appear in team stats. (The genesis Ailyn loan still needs its
     attribution fixed at kiva.org -> Portfolio -> Loans.)
   - Optional autopilot: enable Kiva auto-deposit + an autolending profile with
     team attribution - then this step reduces to topping up the balance.
   - Receipt: kiva.org/lend/<id> for each loan funded.

4. RECORD THE WAVE (manual, public ledger)
   Add data/waves/wave-XXX.json:
   - movements[]: claim txs (type: fee_claim, tx_hash, explorer_url),
     off-ramp transfer tx, exchange order ID (note field), Kiva deposit.
   - loans[]: kiva_id, borrower, uplift_cents, verification.verified once the
     loan shows in the lender portfolio.
   Commit + push - the site renders it in the Uplift Ledger automatically.

5. PROOF (automated)
   The site polls the public Kiva GraphQL for lender/team stats and shows each
   loan with its kiva.org link. Keep the lender profile public or this breaks.

## Rules
- Never describe crypto donations to Kiva as funding loans.
- Never skip a receipt - the entire pitch is that every hop is verifiable.
- The wave ledger is the source of truth for dollars deployed; Kiva only shows
  total loan sizes, not our contribution.

## Later automation
- Kraken API (like UsePaid): market-sell SOL + withdraw to the bank that feeds
  Kiva auto-deposit -> the whole loop becomes claim -> cron -> autolend.
- Pending-fee dashboard on /treasury via getPoolsFeesByConfig.
