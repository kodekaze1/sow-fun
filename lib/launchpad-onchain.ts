// Server-side reads of the launchpad's on-chain state: pools launched from
// the sow.fun config, their token identities, and accrued fees.

import { Connection, PublicKey } from "@solana/web3.js";
import { DynamicBondingCurveClient } from "@meteora-ag/dynamic-bonding-curve-sdk";
import { DBC_CONFIG_KEY, SOLANA_RPC, IMPACT_FEE_PCT, OPS_FEE_PCT } from "@/lib/launchpad";

export const METADATA_PROGRAM = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");

export function metadataPda(mint: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("metadata"), METADATA_PROGRAM.toBuffer(), mint.toBuffer()],
    METADATA_PROGRAM
  )[0];
}

// token-metadata layout: key(1) + updateAuthority(32) + mint(32) + 3 borsh strings
export function parseMetadata(data: Buffer): { name: string; symbol: string; uri: string } {
  let offset = 65;
  const readStr = () => {
    const len = data.readUInt32LE(offset);
    offset += 4;
    const s = data.slice(offset, offset + len).toString("utf8").replace(/\0/g, "").trim();
    offset += len;
    return s;
  };
  return { name: readStr(), symbol: readStr(), uri: readStr() };
}

// Our launch URIs bake the beneficiary into query params (see tokenMetadataUri)
export function parseLaunchUri(uri: string): { loanId: number | null; borrower: string | null; image: string | null } {
  try {
    const u = new URL(uri);
    const loan = u.searchParams.get("loan");
    return {
      loanId: loan ? parseInt(loan, 10) || null : null,
      borrower: u.searchParams.get("borrower"),
      image: u.searchParams.get("image"),
    };
  } catch {
    return { loanId: null, borrower: null, image: null };
  }
}

export function getDbcClient(): { connection: Connection; client: DynamicBondingCurveClient } {
  const connection = new Connection(SOLANA_RPC, "confirmed");
  return { connection, client: new DynamicBondingCurveClient(connection, "confirmed") };
}

export interface LaunchSummary {
  pool: string;
  mint: string | null;
  name: string;
  symbol: string;
  image: string | null;
  loanId: number | null;
  borrowerName: string | null;
  pendingVaultSol: number;
  lifetimeFeesSol: number;
  impactShareSol: number; // vault share (impact + ops) of lifetime fees
}

const VAULT_SHARE = (IMPACT_FEE_PCT + OPS_FEE_PCT) / 100;

export async function getLaunches(): Promise<LaunchSummary[]> {
  if (!DBC_CONFIG_KEY || DBC_CONFIG_KEY.length < 30) return [];
  const { connection, client } = getDbcClient();
  const config = new PublicKey(DBC_CONFIG_KEY);

  const [pools, fees] = await Promise.all([
    client.state.getPoolsByConfig(config),
    client.state.getPoolsFeesByConfig(config),
  ]);
  const feeByPool = new Map(fees.map((f) => [f.poolAddress.toBase58(), f]));

  const entries = pools.map((p) => {
    const pa = p as unknown as { address?: PublicKey; publicKey?: PublicKey; account: { baseMint?: PublicKey } };
    return { address: (pa.address ?? pa.publicKey) as PublicKey, baseMint: pa.account.baseMint ?? null };
  });

  const pdas = entries.filter((e) => e.baseMint).map((e) => metadataPda(e.baseMint as PublicKey));
  const metaAccounts = pdas.length ? await connection.getMultipleAccountsInfo(pdas) : [];

  const launches: LaunchSummary[] = [];
  let metaIdx = 0;
  for (const entry of entries) {
    const poolAddr = entry.address.toBase58();
    const fee = feeByPool.get(poolAddr);
    const pendingVaultSol = fee ? fee.partnerQuoteFee.toNumber() / 1e9 : 0;
    const lifetimeFeesSol = fee ? fee.totalTradingQuoteFee.toNumber() / 1e9 : 0;

    let name = "Unknown token";
    let symbol = "?";
    let loanId: number | null = null;
    let borrowerName: string | null = null;
    let image: string | null = null;

    if (entry.baseMint) {
      const info = metaAccounts[metaIdx++];
      if (info?.data) {
        try {
          const meta = parseMetadata(info.data as Buffer);
          name = meta.name || name;
          symbol = meta.symbol || symbol;
          const parsed = parseLaunchUri(meta.uri);
          loanId = parsed.loanId;
          borrowerName = parsed.borrower;
          image = parsed.image;
        } catch { /* foreign or unparseable metadata */ }
      }
    }

    launches.push({
      pool: poolAddr,
      mint: entry.baseMint?.toBase58() ?? null,
      name,
      symbol,
      image,
      loanId,
      borrowerName,
      pendingVaultSol,
      lifetimeFeesSol,
      impactShareSol: lifetimeFeesSol * VAULT_SHARE,
    });
  }

  launches.sort((a, b) => b.lifetimeFeesSol - a.lifetimeFeesSol);
  return launches;
}

export async function getLaunchByMint(mint: string): Promise<LaunchSummary | null> {
  let mintKey: PublicKey;
  try {
    mintKey = new PublicKey(mint);
  } catch {
    return null;
  }
  const launches = await getLaunches();
  return launches.find((l) => l.mint === mintKey.toBase58()) ?? null;
}

export async function getSolPrice(): Promise<number> {
  try {
    const res = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd", {
      next: { revalidate: 300 },
    });
    const json = await res.json();
    return json?.solana?.usd ?? 130;
  } catch {
    return 130;
  }
}
