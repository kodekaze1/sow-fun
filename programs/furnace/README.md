# The Furnace (`sow_furnace`)

A one-way door for $SOW. Tokens sent into a furnace vault can only ever leave
by being burned. Every burn writes a permanent on-chain receipt.

Program id: `sowY54dvBKFqyeHCAALzt84AWxRYvxXLAowa8FdKmeW`

## Guarantees

- **No withdraw path.** The program has exactly two instructions, `initialize`
  and `stoke`. Neither can move vault tokens anywhere except into a burn.
- **No admin powers.** `authority` is recorded on the furnace for provenance
  only. It cannot pause, redirect, or close anything.
- **Permissionless burns.** Anyone can call `stoke`. It burns the entire vault
  balance, so nothing sent to the furnace can sit there forever.
- **Receipts are permanent.** Each burn creates a `BurnReceipt` account indexed
  0, 1, 2, ... that nobody can close or edit.

Caveat: the guarantees cover this program. A Token-2022 mint with a permanent
delegate extension could still move vault tokens through the token program.
$SOW is a plain SPL mint with immutable authorities, so this does not apply.

## Accounts

| Account | Seeds | Holds |
|---|---|---|
| `Furnace` | `["furnace", mint]` | mint, authority, total_burned, burn_count, bump |
| vault | ATA of the furnace PDA for the mint | the tokens waiting to be burned |
| `BurnReceipt` | `["receipt", furnace, burn_count as u64 LE]` | index, amount, slot, unix_ts, caller, memo (max 64 bytes) |

Instructions:

- `initialize()` - authority pays; creates the furnace PDA and its vault ATA.
  Uses `init_if_needed` for the vault so a pre-created ATA cannot block it.
  Supports both SPL Token and Token-2022.
- `stoke(memo)` - caller pays the receipt rent; burns the full vault balance
  with the furnace PDA as signer, bumps totals with checked math, writes the
  receipt, emits `Stoked`.

Errors: `EmptyVault` (6000), `MemoTooLong` (6001), `Overflow` (6002),
`MintMismatch` (6003).

## Build and test

```bash
cd programs/furnace
anchor build                       # -> target/deploy/sow_furnace.so + target/idl
cp target/idl/sow_furnace.json idl/

# Integration test. On Windows run the validator inside WSL (the native
# Windows validator cannot unpack its genesis ledger):
solana-test-validator --reset --ledger ~/furnace-ledger --rpc-port 18899 \
  --bpf-program sowY54dvBKFqyeHCAALzt84AWxRYvxXLAowa8FdKmeW target/deploy/sow_furnace.so
TEST_RPC=http://127.0.0.1:18899 node --test tests/furnace.test.mjs
```

The tests cover both token programs: lifecycle, permissionless burn by a
stranger, receipts, empty-vault and long-memo errors, re-init blocked, a
griefing pre-created vault ATA, and stale-index replay.

## Deploy

The program keypair lives outside the repo at
`C:\Users\kenx0\vanity-grinder\gpu-grinder\sowY54dvBKFqyeHCAALzt84AWxRYvxXLAowa8FdKmeW.json`.
Deploying the ~270 KB program locks about 1.4 SOL in rent (`solana rent 274213`
on the current CLI; refundable if the program is ever closed), plus a few
cents of transaction fees. Have a little extra for the temporary deploy buffer.

```bash
# Devnet rehearsal (fund the deployer with devnet SOL first)
solana program deploy target/deploy/sow_furnace.so \
  --program-id C:/Users/kenx0/vanity-grinder/gpu-grinder/sowY54dvBKFqyeHCAALzt84AWxRYvxXLAowa8FdKmeW.json \
  --keypair <treasury keypair json> --url devnet

# Mainnet
solana program deploy target/deploy/sow_furnace.so \
  --program-id C:/Users/kenx0/vanity-grinder/gpu-grinder/sowY54dvBKFqyeHCAALzt84AWxRYvxXLAowa8FdKmeW.json \
  --keypair <treasury keypair json> --url "<mainnet rpc url>"

# Publish the IDL on-chain so explorers decode receipts
anchor idl init sowY54dvBKFqyeHCAALzt84AWxRYvxXLAowa8FdKmeW \
  --filepath idl/sow_furnace.json --provider.cluster mainnet \
  --provider.wallet <treasury keypair json>
```

Upgrade authority: after mainnet is settled, either make the program immutable
(`solana program set-upgrade-authority <id> --final`) so the no-withdraw
guarantee is permanent, or move the authority to a Squads multisig. Until one
of those happens, the upgrade authority could ship new code, so say which one
you picked publicly.

## How `scripts/buyback-burn.mjs` uses it

1. Market-buys $SOW with SOL through Jupiter into the treasury's $SOW account.
2. In one transaction: lights the furnace if it is not lit yet, transfers the
   burn share into the vault, optionally pays the creator reward share
   (`PAYOUT=1`), and calls `stoke` with memo `harvest:<WAVE>`.
3. Appends to `data/burns.json` (every burn) and `data/rewards.json` (reward
   runs, `CreatorReward` shape), mainnet only.

```bash
# Quote only
KEYPAIR=<treasury json> MINT=<$SOW mint> AMOUNT_SOL=0.5 DRY=1 node scripts/buyback-burn.mjs
# Pure buyback + burn for harvest 002
KEYPAIR=<treasury json> MINT=<$SOW mint> AMOUNT_SOL=0.5 WAVE=002 node scripts/buyback-burn.mjs
# Harvest excess rule: half burned, half accrues to the coin's creator
KEYPAIR=... MINT=... AMOUNT_SOL=0.2 WAVE=002 REWARD_WALLET=<creator> \
  COIN_MINT=<coin mint> COIN_SYMBOL=<sym> LOAN_ID=<kiva id> BORROWER=<name> node scripts/buyback-burn.mjs
# Devnet (Jupiter has no devnet routes, so burn $SOW already held)
NETWORK=devnet KEYPAIR=... MINT=<devnet mint> SKIP_SWAP=1 SOW_AMOUNT=<raw units> node scripts/buyback-burn.mjs
```

The client used by the script is `scripts/lib/furnace.mjs` (hand-built
instructions from the Anchor discriminators, no extra dependencies).
