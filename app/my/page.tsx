"use client";
import { useCallback, useEffect, useState } from "react";
import { PublicKey, Transaction, TransactionInstruction } from "@solana/web3.js";
import { Buffer } from "buffer";
import BN from "bn.js";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { DynamicBondingCurveClient } from "@meteora-ag/dynamic-bonding-curve-sdk";
import Icon from "@/components/icons";
import { getOwnerPositions, buildClaimPositionFeeTx, unclaimedSolLamports } from "@/lib/damm-v2.mjs";
import { IMPACT_FEE_PCT, CREATOR_FEE_PCT, type FundraisingLoan } from "@/lib/launchpad";
import { COUNTRY_FLAGS } from "@/lib/types";

const MEMO_PROGRAM = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");

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
  // Post-migration: fees on the creator's locked DAMM v2 LP position
  dammPool: string | null;
  lpPendingSol: number;
  lpPendingLamports: string;
  activeLoanId: number | null;
  activeBorrowerName: string | null;
  loanStatus: string | null;
  loanRemaining: number | null;
  succession: { to_loan_id: number; borrower: string; memo_tx: string } | null;
}

interface CreatorReward {
  mint: string;
  symbol: string;
  borrower: string;
  borrower_loan_id: number;
  sow_amount: number;
  payout_tx: string;
  date: string;
  status: "accruing" | "paid";
}

export default function MyCoinsPage() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [launches, setLaunches] = useState<CreatorLaunch[] | null>(null);
  const [rewards, setRewards] = useState<CreatorReward[]>([]);
  const [solPrice, setSolPrice] = useState(130);
  const [loading, setLoading] = useState(false);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Adopt-next-borrower panel state (one open panel at a time, keyed by pool)
  const [adoptFor, setAdoptFor] = useState<string | null>(null);
  const [adoptSearch, setAdoptSearch] = useState("");
  const [adoptResults, setAdoptResults] = useState<FundraisingLoan[]>([]);
  const [adoptLoading, setAdoptLoading] = useState(false);
  const [adopting, setAdopting] = useState(false);

  const load = useCallback(async () => {
    if (!wallet.publicKey) return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/creator?address=${wallet.publicKey.toBase58()}`);
      const data = await res.json();
      if (res.ok) {
        setLaunches(data.launches ?? []);
        setRewards(data.rewards ?? []);
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

  useEffect(() => {
    if (adoptFor === null) return;
    setAdoptLoading(true);
    const t = setTimeout(async () => {
      try {
        const q = adoptSearch ? `?q=${encodeURIComponent(adoptSearch)}` : "";
        const res = await fetch(`/api/kiva/fundraising${q}`);
        const data = await res.json();
        setAdoptResults((data.loans ?? []).slice(0, 6));
      } catch {
        setAdoptResults([]);
      } finally {
        setAdoptLoading(false);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [adoptFor, adoptSearch]);

  const claim = async (row: CreatorLaunch) => {
    if (!wallet.publicKey || !wallet.sendTransaction) return;
    setClaiming(row.pool);
    setMessage(null);
    try {
      // Bonding-curve fees (pre-migration)
      if (row.creatorPendingSol > 0) {
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
      }
      // Locked LP fees (post-migration)
      if (row.lpPendingSol > 0 && row.dammPool) {
        const positions = await getOwnerPositions(connection, wallet.publicKey, new Set([row.dammPool]));
        for (const entry of positions) {
          if (unclaimedSolLamports(entry).isZero()) continue;
          const tx = await buildClaimPositionFeeTx(connection, wallet.publicKey, entry);
          const signature = await wallet.sendTransaction(tx, connection);
          await connection.confirmTransaction(signature, "confirmed");
        }
      }
      setMessage(`Claimed ${(row.creatorPendingSol + row.lpPendingSol).toFixed(4)} SOL from $${row.symbol}.`);
      load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Claim failed - try again.");
    } finally {
      setClaiming(null);
    }
  };

  // Adoption is proven on-chain: the creator wallet signs a memo transaction
  // naming the coin and the successor loan. The operator verifies the memo,
  // commits it to the public successions ledger, and the token page updates.
  const adopt = async (row: CreatorLaunch, loan: FundraisingLoan) => {
    if (!wallet.publicKey || !wallet.sendTransaction || !row.mint) return;
    setAdopting(true);
    setMessage(null);
    try {
      const memo = `sow-adopt:${JSON.stringify({ mint: row.mint, loan: loan.id, name: loan.name })}`;
      const ix = new TransactionInstruction({
        keys: [{ pubkey: wallet.publicKey, isSigner: true, isWritable: false }],
        programId: MEMO_PROGRAM,
        data: Buffer.from(memo, "utf8"),
      });
      const tx = new Transaction().add(ix);
      const signature = await wallet.sendTransaction(tx, connection);
      await connection.confirmTransaction(signature, "confirmed");
      setMessage(
        `Adoption signed on-chain for $${row.symbol}: ${loan.name} (Kiva loan #${loan.id}). ` +
        `Receipt: ${signature.slice(0, 16)}... It appears on the token page once verified (usually within a day).`
      );
      setAdoptFor(null);
      setAdoptSearch("");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Adoption failed - try again.");
    } finally {
      setAdopting(false);
    }
  };

  const totalPending = (launches ?? []).reduce((s, l) => s + l.creatorPendingSol + l.lpPendingSol, 0);
  const accruingSow = rewards.filter((r) => r.status === "accruing").reduce((s, r) => s + r.sow_amount, 0);
  const paidSow = rewards.filter((r) => r.status === "paid").reduce((s, r) => s + r.sow_amount, 0);

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
              {launches?.map((row) => {
                const loanClosed = !!row.activeLoanId && !!row.loanStatus && row.loanStatus !== "fundraising";
                return (
                  <div key={row.pool} className="bg-white rounded-2xl border border-[#E4EBE7] shadow-[0_4px_15px_rgba(0,0,0,0.05)] p-5">
                    <div className="flex items-center gap-3 mb-4">
                      {row.image && <img src={row.image} alt="" className="w-12 h-12 rounded-xl object-cover" />}
                      <div className="min-w-0">
                        <div className="font-bold text-[#223829] truncate">
                          {row.name} <span className="font-mono text-xs text-[#276A43]">${row.symbol}</span>
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          {row.activeBorrowerName ? `for ${row.activeBorrowerName}` : "independent"}
                          {row.succession ? " (adopted)" : ""} · {row.lifetimeFeesSol.toFixed(4)} SOL lifetime fees
                          {row.activeLoanId ? ` · ≈ $${(row.impactShareSol * solPrice).toFixed(0)} to the loan` : ""}
                        </div>
                      </div>
                    </div>

                    {loanClosed && (
                      <div className="mb-4 bg-[#F8F2E6] border border-[#F8CD69]/50 rounded-xl p-3.5 text-[13px] text-[#996210] leading-relaxed">
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <span>
                            <span className="font-bold">
                              {row.loanStatus === "funded" ? "Loan fully funded ✓" : "Loan closed on Kiva."}
                            </span>{" "}
                            Adopt the next borrower so your coin&apos;s fees keep flowing to a real person.
                          </span>
                          <button onClick={() => { setAdoptFor(adoptFor === row.pool ? null : row.pool); setAdoptSearch(""); }}
                            className="bg-[#276A43] hover:bg-[#223829] text-white rounded-full px-4 py-1.5 text-xs font-bold transition-colors">
                            {adoptFor === row.pool ? "Close" : "Adopt next borrower"}
                          </button>
                        </div>
                      </div>
                    )}

                    {adoptFor === row.pool && (
                      <div className="mb-4 border border-[#D9E6DF] rounded-xl p-4">
                        <div className="text-xs font-black uppercase tracking-widest text-[#276A43] mb-2">Pick the next borrower</div>
                        <input
                          value={adoptSearch}
                          onChange={(e) => setAdoptSearch(e.target.value)}
                          placeholder="Search borrowers - try 'tailor', 'farm', 'solar'..."
                          className="w-full rounded-full border border-[#D9E6DF] px-4 py-2.5 text-sm mb-3 focus:outline-none focus:border-[#276A43]"
                        />
                        {adoptLoading ? (
                          <div className="py-6 text-center text-gray-400 text-sm">Finding live borrowers on Kiva...</div>
                        ) : (
                          <div className="flex flex-col gap-2">
                            {adoptResults.map((loan) => {
                              const pct = loan.loanAmount > 0 ? Math.round((loan.fundedAmount / loan.loanAmount) * 100) : 0;
                              return (
                                <div key={loan.id} className="flex items-center gap-3 rounded-xl border border-[#E4EBE7] p-2.5">
                                  {loan.image && <img src={loan.image} alt="" className="w-10 h-10 rounded-lg object-cover" />}
                                  <div className="min-w-0 flex-1">
                                    <div className="text-sm font-bold text-[#223829] truncate">
                                      {loan.name} {COUNTRY_FLAGS[loan.country] ?? ""}
                                    </div>
                                    <div className="text-[11px] text-gray-500">
                                      {loan.activity} · ${loan.remaining.toFixed(0)} to go · {pct}% funded
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => adopt(row, loan)}
                                    disabled={adopting}
                                    className="bg-[#276A43] hover:bg-[#223829] disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-full px-4 py-1.5 text-xs font-bold transition-colors flex-shrink-0">
                                    {adopting ? "Signing..." : "Adopt"}
                                  </button>
                                </div>
                              );
                            })}
                            {!adoptResults.length && (
                              <div className="py-4 text-center text-gray-400 text-sm">No matches - try another search.</div>
                            )}
                          </div>
                        )}
                        <p className="text-[11px] text-gray-400 mt-3 leading-relaxed">
                          Adopting signs a free on-chain memo from your wallet naming the new borrower - the public,
                          verifiable record of your choice. The token page updates once it is verified.
                        </p>
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold flex items-center gap-1.5">
                          Your share pending
                          {row.dammPool && (
                            <span className="normal-case tracking-normal text-[10px] font-bold bg-[#EDF4F1] text-[#276A43] px-1.5 py-0.5 rounded-full">graduated · locked LP</span>
                          )}
                        </div>
                        <div className="font-black text-[#223829]">
                          {(row.creatorPendingSol + row.lpPendingSol).toFixed(4)} SOL
                          <span className="text-xs font-semibold text-gray-400"> (≈ ${((row.creatorPendingSol + row.lpPendingSol) * solPrice).toFixed(2)})</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {row.mint && (
                          <a href={`/t/${row.mint}`} className="text-xs font-bold text-[#276A43] hover:underline">Token page</a>
                        )}
                        <button
                          onClick={() => claim(row)}
                          disabled={claiming === row.pool || row.creatorPendingSol + row.lpPendingSol <= 0}
                          className="bg-[#276A43] hover:bg-[#223829] disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-full px-5 py-2 text-sm font-bold transition-colors">
                          {claiming === row.pool ? "Claiming..." : "Claim fees"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* CREATOR REWARDS */}
            {launches && launches.length > 0 && (
              <div className="mt-10">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xs font-black uppercase tracking-widest text-[#276A43]">$SOW creator rewards</h2>
                  <div className="text-xs text-gray-500 font-semibold">
                    {accruingSow > 0 && <span className="mr-3">{accruingSow.toLocaleString()} $SOW accruing</span>}
                    {paidSow > 0 && <span>{paidSow.toLocaleString()} $SOW paid</span>}
                  </div>
                </div>
                {rewards.length === 0 ? (
                  <div className="bg-[#EDF4F1] rounded-2xl p-5 text-[13px] text-[#223829]/75 leading-relaxed">
                    No rewards yet - they start once a coin of yours fully funds a borrower.
                    The rule: when your coin&apos;s fees exceed what its loan needs, 20% of the excess
                    market-buys $SOW - half is burned, half accrues here and pays out to this wallet
                    for every borrower your coin fully funds. Rewards track verified Kiva loans, never
                    raw volume, and every buy, burn, and payout ships with a transaction link.
                  </div>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    {rewards.map((r, i) => (
                      <div key={`${r.mint}-${r.borrower_loan_id}-${i}`}
                        className="flex items-center justify-between gap-3 bg-white rounded-xl border border-[#E4EBE7] p-4">
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-[#223829] truncate">
                            {r.sow_amount.toLocaleString()} $SOW · <span className="font-mono text-xs text-[#276A43]">${r.symbol}</span>
                          </div>
                          <div className="text-[11px] text-gray-500 truncate">
                            for fully funding {r.borrower} (loan #{r.borrower_loan_id}) · {r.date.slice(0, 10)}
                          </div>
                        </div>
                        {r.status === "paid" && r.payout_tx ? (
                          <a href={`https://solscan.io/tx/${r.payout_tx}`} target="_blank" rel="noopener noreferrer"
                            className="text-[11px] font-bold bg-[#EDF4F1] text-[#276A43] px-3 py-1 rounded-full hover:underline flex-shrink-0">
                            Paid ↗
                          </a>
                        ) : (
                          <span className="text-[11px] font-bold bg-[#F8F2E6] text-[#996210] px-3 py-1 rounded-full flex-shrink-0">
                            Accruing
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

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
