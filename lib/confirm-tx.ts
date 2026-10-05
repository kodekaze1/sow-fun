// Robust client-side confirmation. The wallet connection's websocket is the
// public endpoint and can drop, so a plain confirmTransaction() can time out
// on a transaction that actually landed - which invites duplicate launches.
// This races blockhash-based confirmation against a getSignatureStatuses poll
// and reports "unknown" (never "failed") when it simply can't tell.

import type { Connection } from "@solana/web3.js";

export type ConfirmStatus = "confirmed" | "failed" | "unknown";

export async function confirmTx(
  connection: Connection,
  signature: string,
  blockhash: { blockhash: string; lastValidBlockHeight: number },
  timeoutMs = 90_000
): Promise<{ status: ConfirmStatus; error?: string }> {
  let done = false;

  const viaSubscription = connection
    .confirmTransaction({ signature, ...blockhash }, "confirmed")
    .then((r) => (r.value.err ? { status: "failed" as const, error: JSON.stringify(r.value.err) } : { status: "confirmed" as const }))
    .catch(() => null); // expiry or socket failure: let the poll decide

  const viaPolling = (async () => {
    const started = Date.now();
    while (!done && Date.now() - started < timeoutMs) {
      try {
        const { value } = await connection.getSignatureStatuses([signature]);
        const s = value[0];
        if (s?.err) return { status: "failed" as const, error: JSON.stringify(s.err) };
        if (s && (s.confirmationStatus === "confirmed" || s.confirmationStatus === "finalized")) {
          return { status: "confirmed" as const };
        }
        // Past the blockhash's validity window and still unseen: it will never land
        const height = await connection.getBlockHeight("confirmed");
        if (!s && height > blockhash.lastValidBlockHeight) return { status: "failed" as const, error: "expired" };
      } catch { /* transient RPC error: keep polling */ }
      await new Promise((r) => setTimeout(r, 2_000));
    }
    return { status: "unknown" as const };
  })();

  const first = await Promise.race([
    viaSubscription.then((r) => r ?? viaPolling),
    viaPolling,
  ]);
  done = true;
  return first;
}
