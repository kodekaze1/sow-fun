// Post-migration fee collection for sow.fun coins.
//
// When a coin graduates, Meteora's DBC migrates it into a DAMM v2 pool and
// mints two permanently locked LP positions (as NFTs): one to the treasury
// (partner, 55%) and one to the creator (45%). Locked liquidity can never be
// withdrawn, but each position keeps earning its share of the pool's trading
// fees. This module finds those positions for a wallet, reports unclaimed
// fees, and builds the claim transaction.
//
// Plain JS (ESM) so both the Next.js app (allowJs) and the operator scripts
// in scripts/ can import it. Uses the DAMM v2 IDL bundled in the DBC SDK.

import BN from "bn.js";
import { PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import {
  createDammV2Program,
  derivePositionAddress,
  derivePositionNftAccount,
  deriveDammV2EventAuthority,
  DAMM_V2_PROGRAM_ID,
} from "@meteora-ag/dynamic-bonding-curve-sdk";

export const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
export const TOKEN_2022_PROGRAM_ID = new PublicKey("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb");
export const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");
export const NATIVE_MINT = new PublicKey("So11111111111111111111111111111111111111112");
const DAMM_V2_POOL_AUTHORITY = new PublicKey("HLnpSz9h2S4hiLQ43rnSD9XkcUThA7B8hQMKmDaiTLcC");

// DAMM v2 stores fee-per-liquidity as a U256 scaled by 2^128.
const FEE_SCALE_SHIFT = 128;

export function ata(owner, mint, tokenProgram = TOKEN_PROGRAM_ID) {
  return PublicKey.findProgramAddressSync(
    [owner.toBuffer(), tokenProgram.toBuffer(), mint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID
  )[0];
}

// createAssociatedTokenAccountIdempotent - no-op if the account already exists.
function createAtaIdempotentIx(payer, owner, mint, tokenProgram) {
  const account = ata(owner, mint, tokenProgram);
  return {
    account,
    ix: {
      programId: ASSOCIATED_TOKEN_PROGRAM_ID,
      keys: [
        { pubkey: payer, isSigner: true, isWritable: true },
        { pubkey: account, isSigner: false, isWritable: true },
        { pubkey: owner, isSigner: false, isWritable: false },
        { pubkey: mint, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: tokenProgram, isSigner: false, isWritable: false },
      ],
      data: Buffer.from([1]),
    },
  };
}

// SPL Token CloseAccount - unwraps wSOL back to native SOL for the owner.
function closeAccountIx(account, owner) {
  return {
    programId: TOKEN_PROGRAM_ID,
    keys: [
      { pubkey: account, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: true, isWritable: false },
    ],
    data: Buffer.from([9]),
  };
}

function u256le(bytes) {
  return new BN(Buffer.from(bytes), "le");
}

function tokenProgramForFlag(flag) {
  return flag === 1 ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID;
}

// Unclaimed fees for a position: pending + liquidity * (pool accumulator - checkpoint).
export function unclaimedFees(pool, position) {
  const liquidity = new BN(position.unlockedLiquidity)
    .add(new BN(position.vestedLiquidity))
    .add(new BN(position.permanentLockedLiquidity));
  const delta = (perLiq, checkpoint) => {
    const d = u256le(perLiq).sub(u256le(checkpoint));
    return d.isNeg() ? new BN(0) : liquidity.mul(d).shrn(FEE_SCALE_SHIFT);
  };
  return {
    feeA: new BN(position.feeAPending).add(delta(pool.feeAPerLiquidity, position.feeAPerTokenCheckpoint)),
    feeB: new BN(position.feeBPending).add(delta(pool.feeBPerLiquidity, position.feeBPerTokenCheckpoint)),
  };
}

/**
 * Every DAMM v2 position NFT held by `owner`, decoded with its pool.
 * Optionally restrict to a set of pool addresses (base58 strings).
 */
export async function getOwnerPositions(connection, owner, poolFilter) {
  const program = createDammV2Program(connection);
  // Position NFTs are Token-2022 mints with supply 1 held in a per-NFT PDA account.
  const { value } = await connection.getParsedTokenAccountsByOwner(owner, { programId: TOKEN_2022_PROGRAM_ID });
  const nftMints = value
    .map((a) => a.account.data.parsed?.info)
    .filter((i) => i && i.tokenAmount?.amount === "1" && i.tokenAmount?.decimals === 0)
    .map((i) => new PublicKey(i.mint));
  if (!nftMints.length) return [];

  const positionKeys = nftMints.map((m) => derivePositionAddress(m));
  const positionInfos = await connection.getMultipleAccountsInfo(positionKeys);
  const positions = [];
  positionInfos.forEach((info, i) => {
    if (!info || !info.owner.equals(DAMM_V2_PROGRAM_ID)) return;
    const position = program.coder.accounts.decode("position", info.data);
    if (poolFilter && !poolFilter.has(position.pool.toBase58())) return;
    positions.push({ nftMint: nftMints[i], positionAddress: positionKeys[i], position });
  });
  if (!positions.length) return [];

  const poolKeys = [...new Set(positions.map((p) => p.position.pool.toBase58()))].map((k) => new PublicKey(k));
  const poolInfos = await connection.getMultipleAccountsInfo(poolKeys);
  const pools = new Map();
  poolInfos.forEach((info, i) => {
    if (info) pools.set(poolKeys[i].toBase58(), program.coder.accounts.decode("pool", info.data));
  });

  return positions
    .filter((p) => pools.has(p.position.pool.toBase58()))
    .map((p) => {
      const pool = pools.get(p.position.pool.toBase58());
      return { ...p, poolAddress: p.position.pool, pool, unclaimed: unclaimedFees(pool, p.position) };
    });
}

/**
 * Transaction that claims one position's fees to `owner`. Quote-side SOL
 * arrives as wSOL and is unwrapped in the same transaction.
 */
export async function buildClaimPositionFeeTx(connection, owner, entry) {
  const program = createDammV2Program(connection);
  const { pool, poolAddress, positionAddress, nftMint } = entry;
  const tokenAProgram = tokenProgramForFlag(pool.tokenAFlag);
  const tokenBProgram = tokenProgramForFlag(pool.tokenBFlag);

  const a = createAtaIdempotentIx(owner, owner, pool.tokenAMint, tokenAProgram);
  const b = createAtaIdempotentIx(owner, owner, pool.tokenBMint, tokenBProgram);

  const claimIx = await program.methods
    .claimPositionFee()
    .accountsPartial({
      poolAuthority: DAMM_V2_POOL_AUTHORITY,
      pool: poolAddress,
      position: positionAddress,
      tokenAAccount: a.account,
      tokenBAccount: b.account,
      tokenAVault: pool.tokenAVault,
      tokenBVault: pool.tokenBVault,
      tokenAMint: pool.tokenAMint,
      tokenBMint: pool.tokenBMint,
      positionNftAccount: derivePositionNftAccount(nftMint),
      signer: owner,
      tokenAProgram,
      tokenBProgram,
      eventAuthority: deriveDammV2EventAuthority(),
      program: DAMM_V2_PROGRAM_ID,
    })
    .instruction();

  const tx = new Transaction().add(a.ix, b.ix, claimIx);
  if (pool.tokenBMint.equals(NATIVE_MINT)) tx.add(closeAccountIx(b.account, owner));
  else if (pool.tokenAMint.equals(NATIVE_MINT)) tx.add(closeAccountIx(a.account, owner));
  tx.feePayer = owner;
  tx.recentBlockhash = (await connection.getLatestBlockhash("confirmed")).blockhash;
  return tx;
}

/** Unclaimed SOL (lamports) on a position, whichever side is the native mint. */
export function unclaimedSolLamports(entry) {
  if (entry.pool.tokenBMint.equals(NATIVE_MINT)) return entry.unclaimed.feeB;
  if (entry.pool.tokenAMint.equals(NATIVE_MINT)) return entry.unclaimed.feeA;
  return new BN(0);
}
