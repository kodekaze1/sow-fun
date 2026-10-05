// Minimal client for the sow_furnace program (programs/furnace).
// Instructions are built by hand from the Anchor discriminators so the
// operator scripts need no extra dependencies.

import { PublicKey, SystemProgram, TransactionInstruction } from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";

export const FURNACE_PROGRAM_ID = new PublicKey("sowY54dvBKFqyeHCAALzt84AWxRYvxXLAowa8FdKmeW");

// sha256("global:<ix>")[0..8] / sha256("account:<Name>")[0..8]
const IX_INITIALIZE = Buffer.from([175, 175, 109, 31, 13, 152, 155, 237]);
const IX_STOKE = Buffer.from([17, 241, 45, 45, 218, 55, 159, 70]);
const ACC_FURNACE = Buffer.from([160, 178, 231, 217, 212, 247, 250, 41]);
const ACC_RECEIPT = Buffer.from([209, 39, 231, 253, 164, 70, 105, 174]);

export const MAX_MEMO_LEN = 64;

export function deriveFurnace(mint, programId = FURNACE_PROGRAM_ID) {
  return PublicKey.findProgramAddressSync([Buffer.from("furnace"), mint.toBuffer()], programId)[0];
}

export function deriveVault(furnace, mint, tokenProgram = TOKEN_PROGRAM_ID) {
  return getAssociatedTokenAddressSync(mint, furnace, true, tokenProgram, ASSOCIATED_TOKEN_PROGRAM_ID);
}

export function deriveReceipt(furnace, index, programId = FURNACE_PROGRAM_ID) {
  const idx = Buffer.alloc(8);
  idx.writeBigUInt64LE(BigInt(index));
  return PublicKey.findProgramAddressSync([Buffer.from("receipt"), furnace.toBuffer(), idx], programId)[0];
}

export function initializeIx({ authority, mint, tokenProgram = TOKEN_PROGRAM_ID, programId = FURNACE_PROGRAM_ID }) {
  const furnace = deriveFurnace(mint, programId);
  const vault = deriveVault(furnace, mint, tokenProgram);
  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: authority, isSigner: true, isWritable: true },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: furnace, isSigner: false, isWritable: true },
      { pubkey: vault, isSigner: false, isWritable: true },
      { pubkey: tokenProgram, isSigner: false, isWritable: false },
      { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: IX_INITIALIZE,
  });
}

// `burnCount` is the furnace's current burn_count (the receipt index this stoke writes).
export function stokeIx({ caller, mint, burnCount, memo = "", tokenProgram = TOKEN_PROGRAM_ID, programId = FURNACE_PROGRAM_ID }) {
  const memoBytes = Buffer.from(memo, "utf8");
  if (memoBytes.length > MAX_MEMO_LEN) throw new Error(`memo exceeds ${MAX_MEMO_LEN} bytes`);
  const furnace = deriveFurnace(mint, programId);
  const vault = deriveVault(furnace, mint, tokenProgram);
  const receipt = deriveReceipt(furnace, burnCount, programId);
  const len = Buffer.alloc(4);
  len.writeUInt32LE(memoBytes.length);
  return new TransactionInstruction({
    programId,
    keys: [
      { pubkey: caller, isSigner: true, isWritable: true },
      { pubkey: furnace, isSigner: false, isWritable: true },
      { pubkey: mint, isSigner: false, isWritable: true },
      { pubkey: vault, isSigner: false, isWritable: true },
      { pubkey: receipt, isSigner: false, isWritable: true },
      { pubkey: tokenProgram, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.concat([IX_STOKE, len, memoBytes]),
  });
}

export function decodeFurnace(data) {
  if (!data || !Buffer.from(data.subarray(0, 8)).equals(ACC_FURNACE)) return null;
  return {
    mint: new PublicKey(data.subarray(8, 40)),
    authority: new PublicKey(data.subarray(40, 72)),
    totalBurned: data.readBigUInt64LE(72),
    burnCount: data.readBigUInt64LE(80),
    bump: data[88],
  };
}

export function decodeReceipt(data) {
  if (!data || !Buffer.from(data.subarray(0, 8)).equals(ACC_RECEIPT)) return null;
  const memoLen = data.readUInt32LE(104);
  return {
    furnace: new PublicKey(data.subarray(8, 40)),
    index: data.readBigUInt64LE(40),
    amount: data.readBigUInt64LE(48),
    slot: data.readBigUInt64LE(56),
    unixTs: data.readBigInt64LE(64),
    caller: new PublicKey(data.subarray(72, 104)),
    memo: data.subarray(108, 108 + memoLen).toString("utf8"),
  };
}

export async function fetchFurnace(connection, mint, programId = FURNACE_PROGRAM_ID) {
  const info = await connection.getAccountInfo(deriveFurnace(mint, programId));
  return info ? decodeFurnace(info.data) : null;
}
