// Solana RPC rejects getMultipleAccounts calls for more than 100 accounts.
// Every multi-account read in the app goes through this so the index keeps
// working past 100 coins (or 100 graduated LP positions).
// Plain JS (ESM) so both the Next.js app and lib/damm-v2.mjs can import it.

export const MAX_ACCOUNTS_PER_CALL = 100;

/**
 * getMultipleAccountsInfo over any number of keys, in order, 100 per call.
 * @param {import("@solana/web3.js").Connection} connection
 * @param {import("@solana/web3.js").PublicKey[]} keys
 * @returns {Promise<(import("@solana/web3.js").AccountInfo<Buffer> | null)[]>}
 */
export async function getMultipleAccountsChunked(connection, keys) {
  const out = [];
  for (let i = 0; i < keys.length; i += MAX_ACCOUNTS_PER_CALL) {
    out.push(...(await connection.getMultipleAccountsInfo(keys.slice(i, i + MAX_ACCOUNTS_PER_CALL))));
  }
  return out;
}
