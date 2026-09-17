import { NextResponse } from "next/server";
import { Connection, PublicKey } from "@solana/web3.js";
import { DynamicBondingCurveClient } from "@meteora-ag/dynamic-bonding-curve-sdk";
import { kivaGQL } from "@/lib/kiva-graphql";
import { DBC_CONFIG_KEY, SOLANA_RPC } from "@/lib/launchpad";

// Operator-only claims console data. Everything returned is public
// on-chain/Kiva data - the key just keeps the ops view private.

const METADATA_PROGRAM = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");

function metadataPda(mint: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("metadata"), METADATA_PROGRAM.toBuffer(), mint.toBuffer()],
    METADATA_PROGRAM
  )[0];
}

function parseMetadata(data: Buffer): { name: string; symbol: string; uri: string } {
  // token-metadata layout: key(1) + updateAuthority(32) + mint(32) + 3 borsh strings
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

type KivaLoanStatus = {
  id: number;
  name: string;
  status: string;
  loanAmount: string;
  loanFundraisingInfo?: { fundedAmount?: string } | null;
  image?: { url?: string } | null;
};

export async function GET(request: Request) {
  const adminKey = process.env.ADMIN_KEY;
  if (!adminKey) {
    return NextResponse.json({ error: "ADMIN_KEY not configured on the server" }, { status: 503 });
  }
  if (request.headers.get("x-admin-key") !== adminKey) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!DBC_CONFIG_KEY || DBC_CONFIG_KEY.length < 30) {
    return NextResponse.json({ pools: [], solPrice: 0, notice: "DBC config not created yet - no pools to watch." });
  }

  try {
    const connection = new Connection(SOLANA_RPC, "confirmed");
    const client = new DynamicBondingCurveClient(connection, "confirmed");
    const config = new PublicKey(DBC_CONFIG_KEY);

    const [pools, fees, priceRes] = await Promise.all([
      client.state.getPoolsByConfig(config),
      client.state.getPoolsFeesByConfig(config),
      fetch("https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd", {
        next: { revalidate: 300 },
      }).then((r) => r.json()).catch(() => null),
    ]);
    const solPrice: number = priceRes?.solana?.usd ?? 130;

    const feeByPool = new Map(fees.map((f) => [f.poolAddress.toBase58(), f]));

    // ProgramAccount shape differs across SDK versions (address vs publicKey)
    const poolEntries = pools.map((p) => {
      const pa = p as unknown as { address?: PublicKey; publicKey?: PublicKey; account: { baseMint?: PublicKey } };
      return { address: (pa.address ?? pa.publicKey) as PublicKey, account: pa.account };
    });

    // Resolve each pool's token metadata (name/symbol/uri holds the Kiva loan id)
    const baseMints = poolEntries.map((p) => p.account.baseMint ?? null);
    const pdas = baseMints.map((m) => (m ? metadataPda(m) : null));
    const metaAccounts = pdas.length
      ? await connection.getMultipleAccountsInfo(pdas.filter(Boolean) as PublicKey[])
      : [];

    const rows: {
      pool: string;
      mint: string | null;
      name: string;
      symbol: string;
      loanId: number | null;
      pendingSol: number;
      pendingUsd: number;
    }[] = [];

    let metaIdx = 0;
    for (let i = 0; i < poolEntries.length; i++) {
      const poolAddr = poolEntries[i].address.toBase58();
      const fee = feeByPool.get(poolAddr);
      const pendingSol = fee ? fee.partnerQuoteFee.toNumber() / 1e9 : 0;
      let name = "Unknown token";
      let symbol = "?";
      let loanId: number | null = null;
      if (baseMints[i]) {
        const info = metaAccounts[metaIdx++];
        if (info?.data) {
          try {
            const meta = parseMetadata(info.data as Buffer);
            name = meta.name || name;
            symbol = meta.symbol || symbol;
            const loanParam = new URL(meta.uri).searchParams.get("loan");
            if (loanParam) loanId = parseInt(loanParam, 10) || null;
          } catch { /* unparseable metadata - keep placeholders */ }
        }
      }
      rows.push({
        pool: poolAddr,
        mint: baseMints[i]?.toBase58() ?? null,
        name,
        symbol,
        loanId,
        pendingSol,
        pendingUsd: pendingSol * solPrice,
      });
    }

    // One batched Kiva query for every referenced loan
    const loanIds = [...new Set(rows.map((r) => r.loanId).filter(Boolean))] as number[];
    const loanById = new Map<number, KivaLoanStatus>();
    if (loanIds.length) {
      const query = `{lend{${loanIds
        .map((id, i) => `l${i}: loan(id:${id}){id name status loanAmount loanFundraisingInfo{fundedAmount} image{url(customSize:"w480h360")}}`)
        .join(" ")}}}`;
      try {
        const data = await kivaGQL<{ lend: Record<string, KivaLoanStatus | null> }>(query, 120);
        for (const loan of Object.values(data.lend)) {
          if (loan) loanById.set(loan.id, loan);
        }
      } catch { /* Kiva unreachable - rows fall back to accruing */ }
    }

    const enriched = rows.map((r) => {
      const loan = r.loanId ? loanById.get(r.loanId) : undefined;
      const loanAmount = loan ? parseFloat(loan.loanAmount) || 0 : 0;
      const funded = loan ? parseFloat(loan.loanFundraisingInfo?.fundedAmount ?? "0") || 0 : 0;
      const remaining = Math.max(0, loanAmount - funded);
      const fundraising = loan?.status === "fundraising";
      let state: "fund-now" | "roll-over" | "accruing" = "accruing";
      if (r.pendingUsd > 1 && fundraising && remaining > 0 && r.pendingUsd >= remaining) state = "fund-now";
      else if (r.pendingUsd > 1 && (!fundraising || remaining === 0)) state = "roll-over";
      return {
        ...r,
        borrower: loan
          ? { id: loan.id, name: loan.name, status: loan.status, loanAmount, funded, remaining, image: loan.image?.url ?? null }
          : null,
        state,
      };
    });

    const order = { "fund-now": 0, "roll-over": 1, accruing: 2 };
    enriched.sort((a, b) => order[a.state] - order[b.state] || b.pendingUsd - a.pendingUsd);

    return NextResponse.json({
      pools: enriched,
      solPrice,
      totals: {
        pendingSol: enriched.reduce((s, r) => s + r.pendingSol, 0),
        pendingUsd: enriched.reduce((s, r) => s + r.pendingUsd, 0),
        readyCount: enriched.filter((r) => r.state !== "accruing").length,
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "failed to load pools" },
      { status: 500 }
    );
  }
}
