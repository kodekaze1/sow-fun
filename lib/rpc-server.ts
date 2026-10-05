// Server-side RPC endpoint. The Helius key lives only in server env
// (RPC_URL or HELIUS_API_KEY) and must never reach a client bundle, so only
// import this from route handlers, server components and server libs.
// Browser code talks to the same-origin /api/rpc proxy instead.

const PUBLIC_MAINNET = "https://api.mainnet-beta.solana.com";

export function serverRpcUrl(): string {
  if (typeof window !== "undefined") {
    throw new Error("serverRpcUrl() must not run in the browser");
  }
  if (process.env.RPC_URL) return process.env.RPC_URL;
  const key = process.env.HELIUS_API_KEY;
  return key ? `https://mainnet.helius-rpc.com/?api-key=${key}` : PUBLIC_MAINNET;
}
