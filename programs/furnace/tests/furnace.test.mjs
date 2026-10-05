// Integration test against a local validator with the furnace preloaded:
//   solana-test-validator --reset --ledger test-ledger \
//     --bpf-program sowY54dvBKFqyeHCAALzt84AWxRYvxXLAowa8FdKmeW target/deploy/sow_furnace.so
//   node --test tests/furnace.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { Connection, Keypair, LAMPORTS_PER_SOL, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  createMint,
  mintTo,
  getAccount,
  getMint,
  createAssociatedTokenAccountIdempotent,
} from "@solana/spl-token";
import {
  deriveFurnace,
  deriveVault,
  deriveReceipt,
  initializeIx,
  stokeIx,
  decodeReceipt,
  fetchFurnace,
} from "../../../scripts/lib/furnace.mjs";

const connection = new Connection(process.env.TEST_RPC ?? "http://127.0.0.1:8899", "confirmed");

async function funded() {
  const kp = Keypair.generate();
  const sig = await connection.requestAirdrop(kp.publicKey, 5 * LAMPORTS_PER_SOL);
  await connection.confirmTransaction(sig, "confirmed");
  return kp;
}

const send = (ixs, signers) => sendAndConfirmTransaction(connection, new Transaction().add(...ixs), signers);

async function expectError(promise, code) {
  try {
    await promise;
  } catch (e) {
    const text = `${e.message} ${(e.logs ?? []).join(" ")} ${(e.transactionLogs ?? []).join(" ")}`;
    if (code !== undefined) {
      const hex = `0x${code.toString(16)}`;
      assert.ok(text.includes(hex) || text.includes(`Error Number: ${code}`), `expected error ${code}, got: ${text}`);
    }
    return;
  }
  assert.fail("transaction should have failed");
}

for (const [label, tokenProgram] of [["spl-token", TOKEN_PROGRAM_ID], ["token-2022", TOKEN_2022_PROGRAM_ID]]) {
  test(`furnace lifecycle (${label})`, async () => {
    const authority = await funded();
    const mint = await createMint(connection, authority, authority.publicKey, null, 6, undefined, undefined, tokenProgram);
    const furnace = deriveFurnace(mint);
    const vault = deriveVault(furnace, mint, tokenProgram);

    // Griefing check: a pre-created vault ATA must not block initialization.
    if (tokenProgram.equals(TOKEN_2022_PROGRAM_ID)) {
      await createAssociatedTokenAccountIdempotent(connection, authority, mint, furnace, { commitment: "confirmed" }, tokenProgram, undefined, true);
    }

    await send([initializeIx({ authority: authority.publicKey, mint, tokenProgram })], [authority]);
    let state = await fetchFurnace(connection, mint);
    assert.equal(state.mint.toBase58(), mint.toBase58());
    assert.equal(state.authority.toBase58(), authority.publicKey.toBase58());
    assert.equal(state.totalBurned, 0n);
    assert.equal(state.burnCount, 0n);

    // Re-initialization is impossible.
    await expectError(send([initializeIx({ authority: authority.publicKey, mint, tokenProgram })], [authority]));

    // Empty vault -> EmptyVault (6000).
    const stranger = await funded();
    await expectError(send([stokeIx({ caller: stranger.publicKey, mint, burnCount: 0, memo: "x", tokenProgram })], [stranger]), 6000);

    // Memo over 64 bytes -> MemoTooLong (6001). Built by hand past the client-side guard.
    await mintTo(connection, authority, mint, vault, authority, 1_000_000n, [], { commitment: "confirmed" }, tokenProgram);
    const longIx = stokeIx({ caller: stranger.publicKey, mint, burnCount: 0, memo: "", tokenProgram });
    const long = Buffer.from("m".repeat(65));
    const len = Buffer.alloc(4);
    len.writeUInt32LE(long.length);
    longIx.data = Buffer.concat([longIx.data.subarray(0, 8), len, long]);
    await expectError(send([longIx], [stranger]), 6001);

    // Permissionless burn by a stranger.
    const supplyBefore = (await getMint(connection, mint, "confirmed", tokenProgram)).supply;
    await send([stokeIx({ caller: stranger.publicKey, mint, burnCount: 0, memo: "harvest:001", tokenProgram })], [stranger]);
    assert.equal((await getAccount(connection, vault, "confirmed", tokenProgram)).amount, 0n);
    assert.equal((await getMint(connection, mint, "confirmed", tokenProgram)).supply, supplyBefore - 1_000_000n);
    state = await fetchFurnace(connection, mint);
    assert.equal(state.totalBurned, 1_000_000n);
    assert.equal(state.burnCount, 1n);

    const r0 = decodeReceipt((await connection.getAccountInfo(deriveReceipt(furnace, 0))).data);
    assert.equal(r0.index, 0n);
    assert.equal(r0.amount, 1_000_000n);
    assert.equal(r0.caller.toBase58(), stranger.publicKey.toBase58());
    assert.equal(r0.memo, "harvest:001");
    assert.ok(r0.slot > 0n);

    // Second burn writes receipt #1 and accumulates.
    await mintTo(connection, authority, mint, vault, authority, 250_000n, [], { commitment: "confirmed" }, tokenProgram);
    await send([stokeIx({ caller: authority.publicKey, mint, burnCount: 1, memo: "", tokenProgram })], [authority]);
    state = await fetchFurnace(connection, mint);
    assert.equal(state.totalBurned, 1_250_000n);
    assert.equal(state.burnCount, 2n);
    assert.equal(decodeReceipt((await connection.getAccountInfo(deriveReceipt(furnace, 1))).data).amount, 250_000n);

    // A stale receipt index (replaying burnCount 0) cannot pass the seeds check.
    await mintTo(connection, authority, mint, vault, authority, 1n, [], { commitment: "confirmed" }, tokenProgram);
    await expectError(send([stokeIx({ caller: stranger.publicKey, mint, burnCount: 0, memo: "", tokenProgram })], [stranger]));
  });
}
