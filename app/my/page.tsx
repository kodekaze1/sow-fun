"use client";
import { useCallback, useEffect, useState } from "react";
import { PublicKey, Transaction } from "@solana/web3.js";
import BN from "bn.js";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { DynamicBondingCurveClient } from "@meteora-ag/dynamic-bonding-curve-sdk";
import Icon from "@/components/icons";
import { IMPACT_FEE_PCT, CREATOR_FEE_PCT } from "@/lib/launchpad";

interface CreatorLaunch {
  pool: string;
  mint: string | null;
  name: string;
  symbol: string;
  image: string | null;
  loanId: number | null;
  borrowerName: string | null;
  lifetimeFeesSol: number;
  impactShareSol: number;
  creatorPendingSol: number;
  creatorPendingLamports: string;
}

export default function MyCoinsPage() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [launches, setLaunches] = useState<CreatorLaunch[] | null>(null);
  const [solPrice, setSolPrice] = useState(130);
  const [loading, setLoading] = useState(false);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!wallet.publicKey) return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/creator?address=${wallet.publicKey.toBase58()}`);
      const data = await res.json();
      if (res.ok) {
        setLaunches(data.launches ?? []);
        setSolPrice(data.solPrice ?? 130);
      } else {
        setMessage(data.error ?? "Failed to load your coins.");
      }
    } catch {
      setMessage("Network error.");
    } finally {
      setLoading(false);
    }
  }, [wallet.publicKey]);

  useEffect(() => {
    if (wallet.publicKey) load();
    else setLaunches(null);
  }, [wallet.publicKey, load]);

  const claim = async (row: CreatorLaunch) => {
    if (!wallet.publicKey || !wallet.sendTransaction) return;
    setClaiming(row.pool);
    setMessage(null);
    try {
      const client = new DynamicBondingCurveClient(connection, "confirmed");
      const tx: Transaction = await client.creator.claimCreatorTradingFee({
        creator: wallet.publicKey,
        payer: wallet.publicKey,
        pool: new PublicKey(row.pool),
        maxBaseAmount: new BN(0),
        maxQuoteAmount: new BN(row.creatorPendingLamports),
      });
      const signature = await wallet.sendTransaction(tx, connection);
      await connection.confirmTransaction(signature, "confirmed");
      setMessage(`Claimed ${row.creatorPendingSol.toFixed(4)} SOL from $${row.symbol}.`);
      load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Claim failed - try again.");
    } finally {
      setClaiming(null);
    }
  };

  const totalPending = (launches ?? []).reduce((s, l) => s + l.creatorPendingSol, 0);

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-[#223829] text-[#EDF4F1] py-12 px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <h1 className="font-serif text-4xl font-medium tracking-tight mb-3">
            My <span className="italic text-[#F8CD69]">coins.</span>
          </h1>
          <p className="opacity-80 max-w-md mx-auto leading-relaxed">
            Every coin you&apos;ve sown, its borrower, and your {CREATOR_FEE_PCT}% of the fees - claimable straight from the pool.
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-10">
        {!wallet.connected ? (
          <div className="text-center py-16">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-[#EDF4F1] flex items-center justify-center text-[#223829]">
              <Icon name="coins" className="w-7 h-7" />
            </div>
            <p className="text-gray-500 text-sm mb-6">Connect the wallet you launched with.</p>
            <div className="flex justify-center">
              <WalletMultiButton style={{ borderRadius: "9999px", background: "#276A43" }} />
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold">Unclaimed creator fees</div>
                <div className="text-2xl font-black text-[#223829]">
                  {totalPending.toFixed(4)} SOL <span className="text-sm font-semibold text-gray-400">(≈ ${(totalPending * solPrice).toFixed(2)})</span>
                </div>
              </div>
              <button onClick={load} disabled={loading}
                className="flex items-center gap-2 text-sm font-bold text-[#276A43] hover:text-[#223829] transition-colors">
                <Icon name="refresh" className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>

            {message && (
              <div className="mb-5 bg-[#EDF4F1] border border-[#D9E6DF] text-[#223829] rounded-xl p-3.5 text-sm">{message}</div>
            )}

            {launches && launches.length === 0 && !loading && (
              <div className="py-14 text-center">
                <div className="w-20 h-20 mx-auto mb-5 rounded-3xl bg-[#EDF4F1] p-2 rotate-[-3deg]">
                  <img src="/images/illustrations/plant-coin.png" alt="" className="w-full h-full object-contain" />
                </div>
                <p className="text-gray-500 text-sm mb-6">This wallet hasn&apos;t sown a coin yet.</p>
                <a href="/launch"
                  className="inline-flex items-center gap-2 bg-[#276A43] hover:bg-[#223829] text-white rounded-full px-6 py-2.5 text-sm font-bold transition-colors">
                  Launch your first
                  <Icon name="arrow" className="w-4 h-4" />
                </a>
              </div>
            )}

            <div className="flex flex-col gap-4">
              {launches?.map((row) => (
                <div key={row.pool} className="bg-white rounded-2xl border border-[#E4EBE7] shadow-[0_4px_15px_rgba(0,0,0,0.05)] p-5">
                  <div className="flex items-center gap-3 mb-4">
                    {row.image && <img src={row.image} alt="" className="w-12 h-12 rounded-xl object-cover" />}
                    <div className="min-w-0">
                      <div className="font-bold text-[#223829] truncate">
                        {row.name} <span className="font-mono text-xs text-[#276A43]">${row.symbol}</span>
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {row.borrowerName ? `for ${row.borrowerName}` : "independent"} · {row.lifetimeFeesSol.toFixed(4)} SOL lifetime fees
                        {row.loanId ? ` · ≈ $${(row.impactShareSol * solPrice).toFixed(0)} to the loan` : ""}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold">Your share pending</div>
                      <div className="font-black text-[#223829]">
                        {row.creatorPendingSol.toFixed(4)} SOL
                        <span className="text-xs font-semibold text-gray-400"> (≈ ${(row.creatorPendingSol * solPrice).toFixed(2)})</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {row.mint && (
                        <a href={`/t/${row.mint}`} className="text-xs font-bold text-[#276A43] hover:underline">Token page</a>
                      )}
                      <button
                        onClick={() => claim(row)}
                        disabled={claiming === row.pool || row.creatorPendingSol <= 0}
                        className="bg-[#276A43] hover:bg-[#223829] disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-full px-5 py-2 text-sm font-bold transition-colors">
                        {claiming === row.pool ? "Claiming..." : "Claim fees"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-xs text-gray-400 mt-8 leading-relaxed text-center">
              Your {CREATOR_FEE_PCT}% comes straight from the pool to your wallet - sow.fun never touches it.
              The {IMPACT_FEE_PCT}% impact share is claimed separately by the public vault and turned into Kiva loans with receipts.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
