"use client";
import { useCallback, useEffect, useState } from "react";
import { Keypair, PublicKey, Transaction } from "@solana/web3.js";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { DynamicBondingCurveClient } from "@meteora-ag/dynamic-bonding-curve-sdk";
import Icon from "@/components/icons";
import {
  DBC_CONFIG_KEY,
  CREATOR_FEE_PCT,
  IMPACT_FEE_PCT,
  OPS_FEE_PCT,
  POOL_FEE_BPS,
  KIVA_SECTOR_IDS,
  KIVA_REGIONS,
  LOAN_SORTS,
  tokenMetadataUri,
  type FundraisingLoan,
} from "@/lib/launchpad";
import { COUNTRY_FLAGS } from "@/lib/types";

type Step = 1 | 2 | 3;

function daysLeft(expiresAt: string | null): number | null {
  if (!expiresAt) return null;
  const ms = new Date(expiresAt).getTime() - Date.now();
  return Number.isFinite(ms) ? Math.max(0, Math.ceil(ms / 86_400_000)) : null;
}

// A loan this close to full may be finished by the Kiva crowd before this
// coin's first fee harvest - flag it so creators pick with eyes open.
function fillRisk(loan: FundraisingLoan): boolean {
  const pct = loan.loanAmount > 0 ? loan.fundedAmount / loan.loanAmount : 0;
  return pct >= 0.8 || loan.remaining <= 100;
}

export default function LaunchPage() {
  const { connection } = useConnection();
  const wallet = useWallet();

  const [step, setStep] = useState<Step>(1);
  const [loans, setLoans] = useState<FundraisingLoan[]>([]);
  const [loadingLoans, setLoadingLoans] = useState(true);
  const [search, setSearch] = useState("");
  const [region, setRegion] = useState("");
  const [sector, setSector] = useState("");
  const [women, setWomen] = useState(false);
  const [sort, setSort] = useState("popularity");
  const [borrower, setBorrower] = useState<FundraisingLoan | null>(null);

  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  const [launching, setLaunching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ mint: string; signature: string } | null>(null);

  const configReady = DBC_CONFIG_KEY.length > 30;

  const fetchLoans = useCallback(async (params: { q: string; region: string; sector: string; women: boolean; sort: string }) => {
    setLoadingLoans(true);
    try {
      const query = new URLSearchParams();
      if (params.q) query.set("q", params.q);
      if (params.region) query.set("region", params.region);
      if (params.sector) query.set("sector", params.sector);
      if (params.women) query.set("women", "1");
      if (params.sort) query.set("sort", params.sort);
      const res = await fetch(`/api/kiva/fundraising?${query.toString()}`);
      const data = await res.json();
      setLoans(data.loans ?? []);
    } catch {
      setLoans([]);
    } finally {
      setLoadingLoans(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => fetchLoans({ q: search, region, sector, women, sort }), 400);
    return () => clearTimeout(t);
  }, [search, region, sector, women, sort, fetchLoans]);

  const launch = async () => {
    if (!wallet.publicKey || !wallet.sendTransaction || !borrower) return;
    setError(null);
    setLaunching(true);
    try {
      const client = new DynamicBondingCurveClient(connection, "confirmed");
      const baseMint = Keypair.generate();
      const uri = tokenMetadataUri({
        name,
        symbol,
        image: imageUrl || borrower.image || "",
        loanId: borrower.id,
        borrower: borrower.name,
      });
      const tx: Transaction = await client.creator.createPool({
        baseMint: baseMint.publicKey,
        config: new PublicKey(DBC_CONFIG_KEY),
        name,
        symbol,
        uri,
        payer: wallet.publicKey,
        poolCreator: wallet.publicKey,
      });
      const signature = await wallet.sendTransaction(tx, connection, { signers: [baseMint] });
      await connection.confirmTransaction(signature, "confirmed");
      setResult({ mint: baseMint.publicKey.toBase58(), signature });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Launch failed - please try again.");
    } finally {
      setLaunching(false);
    }
  };

  const canContinue2 = name.trim().length >= 2 && /^[A-Z0-9]{2,10}$/.test(symbol);

  if (result && borrower) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-xl mx-auto px-6 py-24 text-center">
          <img src="/images/illustrations/watering.png" alt="" aria-hidden="true"
            className="w-36 mx-auto mb-6 rotate-[-2deg] mix-blend-multiply" />
          <h1 className="font-serif text-4xl font-medium tracking-tight mb-4">${symbol} is live.</h1>
          <p className="text-[#223829]/75 leading-relaxed mb-6">
            Your token is trading on its own bonding curve, and {IMPACT_FEE_PCT}% of every trade is pledged to{" "}
            {borrower.name}&apos;s loan and future Kiva waves - locked forever.
          </p>
          <div className="bg-[#EDF4F1] rounded-2xl p-5 text-left text-sm font-mono break-all mb-8">
            <div className="text-xs font-sans font-bold uppercase tracking-widest text-[#276A43] mb-1">Mint</div>
            <div className="mb-3">{result.mint}</div>
            <div className="text-xs font-sans font-bold uppercase tracking-widest text-[#276A43] mb-1">Transaction</div>
            <a href={`https://solscan.io/tx/${result.signature}`} target="_blank" rel="noopener noreferrer"
              className="text-[#276A43] underline">{result.signature.slice(0, 24)}...</a>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            <a
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
                `I just launched $${symbol} on @sowfunhq - ${IMPACT_FEE_PCT}% of every trade funds ${borrower.name}'s Kiva microloan. Locked at launch, verifiable forever.`
              )}&url=${encodeURIComponent(`https://sow.fun/t/${result.mint}`)}`}
              target="_blank" rel="noopener noreferrer"
              className="bg-[#223829] hover:bg-black text-white rounded-full px-6 py-2.5 text-sm font-bold transition-colors">
              Share on X
            </a>
            <a href={`https://jup.ag/swap/SOL-${result.mint}`} target="_blank" rel="noopener noreferrer"
              className="bg-[#276A43] hover:bg-[#223829] text-white rounded-full px-6 py-2.5 text-sm font-bold transition-colors">
              Trade on Jupiter
            </a>
            <a href={`/t/${result.mint}`}
              className="border border-[#D9E6DF] hover:border-[#276A43] rounded-full px-6 py-2.5 text-sm font-bold transition-colors">
              Token page
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* HERO */}
      <div className="bg-[#223829] text-[#EDF4F1] py-14 px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/15 rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-widest mb-5">
            Meteora DBC · {POOL_FEE_BPS / 100}% fee · split locked at launch
          </div>
          <h1 className="font-serif text-4xl md:text-5xl font-medium tracking-tight mb-3">
            Launch a coin <span className="italic text-[#F8CD69]">for a borrower.</span>
          </h1>
          <p className="opacity-85 max-w-md mx-auto leading-relaxed">
            Pick a real person raising on Kiva. {CREATOR_FEE_PCT}% of trading fees are yours,{" "}
            {IMPACT_FEE_PCT}% fund their loan, {OPS_FEE_PCT}% keep the lights on.
          </p>
          <p className="opacity-60 max-w-md mx-auto leading-relaxed text-sm mt-3">
            Nobody can change the split after launch, fees fund the loan from the very first trade -
            no graduation required - and every borrower your token fully funds earns you $SOW rewards.
          </p>
        </div>
      </div>

      {/* STEPPER */}
      <div className="max-w-3xl mx-auto px-6 pt-8">
        <div className="flex items-center justify-center gap-2 text-xs font-bold mb-8">
          {[
            [1, "Pick a borrower"],
            [2, "Token details"],
            [3, "Review & launch"],
          ].map(([n, label]) => (
            <div key={n} className="flex items-center gap-2">
              <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full transition-colors ${
                step === n ? "bg-[#276A43] text-white" : step > (n as number) ? "bg-[#EDF4F1] text-[#276A43]" : "bg-gray-100 text-gray-400"
              }`}>
                <span>{step > (n as number) ? "✓" : n}</span>
                <span className="hidden sm:inline">{label}</span>
              </div>
              {n !== 3 && <div className="w-6 h-px bg-[#D9E6DF]" />}
            </div>
          ))}
        </div>

        {!configReady && (
          <div className="mb-8 bg-[#F8F2E6] border border-[#F8CD69]/50 rounded-2xl p-4 text-sm text-[#996210] text-center">
            The launchpad pool config is in final setup - you can explore the flow, and launching opens the moment it is live.
          </div>
        )}

        {/* STEP 1 */}
        {step === 1 && (
          <div className="pb-16">
            <div className="relative mb-3">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search borrowers - try 'tailor', 'farm', 'solar'..."
                className="w-full rounded-full border border-[#D9E6DF] px-5 py-3 text-sm focus:outline-none focus:border-[#276A43]"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2 mb-5">
              <select value={region} onChange={(e) => setRegion(e.target.value)}
                className="rounded-full border border-[#D9E6DF] bg-white px-3.5 py-2 text-xs font-bold text-[#223829] focus:outline-none focus:border-[#276A43]">
                <option value="">All regions</option>
                {KIVA_REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
              <select value={sector} onChange={(e) => setSector(e.target.value)}
                className="rounded-full border border-[#D9E6DF] bg-white px-3.5 py-2 text-xs font-bold text-[#223829] focus:outline-none focus:border-[#276A43]">
                <option value="">All sectors</option>
                {Object.entries(KIVA_SECTOR_IDS).map(([name, id]) => <option key={id} value={id}>{name}</option>)}
              </select>
              <button onClick={() => setWomen(!women)}
                className={`rounded-full px-3.5 py-2 text-xs font-bold transition-colors border ${
                  women ? "bg-[#276A43] text-white border-[#276A43]" : "bg-white text-[#223829] border-[#D9E6DF] hover:border-[#276A43]"
                }`}>
                Women
              </button>
              <div className="ml-auto flex items-center gap-2">
                <span className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider">Sort</span>
                <select value={sort} onChange={(e) => setSort(e.target.value)}
                  className="rounded-full border border-[#D9E6DF] bg-white px-3.5 py-2 text-xs font-bold text-[#223829] focus:outline-none focus:border-[#276A43]">
                  {LOAN_SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
            </div>
            {loadingLoans ? (
              <div className="py-16 text-center text-gray-400 text-sm">Finding live borrowers on Kiva...</div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {loans.map((loan) => {
                  const pct = loan.loanAmount > 0 ? Math.round((loan.fundedAmount / loan.loanAmount) * 100) : 0;
                  const days = daysLeft(loan.expiresAt);
                  return (
                    <button
                      key={loan.id}
                      onClick={() => { setBorrower(loan); setStep(2); }}
                      className="text-left bg-white rounded-2xl border border-[#E4EBE7] shadow-[0_4px_15px_rgba(0,0,0,0.05)] overflow-hidden hover:border-[#276A43] hover:shadow-[0_10px_28px_rgba(34,56,41,0.12)] transition-all"
                    >
                      {loan.image && (
                        <img src={loan.image} alt={loan.name} className="w-full h-40 object-cover" />
                      )}
                      <div className="p-4">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-[#223829]">
                            {loan.name} {COUNTRY_FLAGS[loan.country] ?? ""}
                          </span>
                          <span className="text-sm font-extrabold text-[#223829]">${loan.loanAmount.toLocaleString()}</span>
                        </div>
                        <div className="text-xs text-gray-500 mb-2">{loan.activity} · {loan.country}</div>
                        <p className="text-[13px] text-gray-600 leading-snug line-clamp-2 mb-3">
                          A loan {loan.use}
                        </p>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-[#2AA967] rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-gray-400 mt-1">
                          <span>{pct}% funded · ${loan.remaining.toLocaleString()} to go{days !== null ? ` · ${days}d left` : ""}</span>
                          {fillRisk(loan) && (
                            <span className="font-bold text-[#996210] bg-[#F8F2E6] px-2 py-0.5 rounded-full">Filling fast</span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* STEP 2 */}
        {step === 2 && borrower && (
          <div className="pb-16 max-w-lg mx-auto">
            <div className="flex items-center gap-3 bg-[#EDF4F1] rounded-2xl p-3 mb-6">
              {borrower.image && <img src={borrower.image} alt={borrower.name} className="w-12 h-12 rounded-xl object-cover" />}
              <div className="text-sm">
                <div className="font-bold">{borrower.name} {COUNTRY_FLAGS[borrower.country] ?? ""}</div>
                <div className="text-gray-500 text-xs">{borrower.activity} · ${borrower.loanAmount} loan</div>
              </div>
              <button onClick={() => setStep(1)} className="ml-auto text-xs font-bold text-[#276A43] hover:underline">Change</button>
            </div>

            {fillRisk(borrower) && (
              <div className="mb-6 bg-[#F8F2E6] border border-[#F8CD69]/50 rounded-2xl p-4 text-[13px] text-[#996210] leading-relaxed">
                <span className="font-bold">Heads up:</span> {borrower.name}&apos;s loan is{" "}
                {borrower.loanAmount > 0 ? Math.round((borrower.fundedAmount / borrower.loanAmount) * 100) : 0}% funded
                (${borrower.remaining.toFixed(0)} to go) and other Kiva lenders may finish it before your coin&apos;s
                first fee harvest. If that happens nothing is lost - every pledged cent rolls to the next borrower
                your coin adopts. Prefer a bigger runway? <button onClick={() => setStep(1)} className="underline font-bold">Pick a loan with more to go</button>.
              </div>
            )}

            <label className="block text-xs font-black uppercase tracking-widest text-[#276A43] mb-1.5">Token name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={32}
              placeholder={`${borrower.name}'s ${borrower.activity}`}
              className="w-full rounded-xl border border-[#D9E6DF] px-4 py-3 text-sm mb-5 focus:outline-none focus:border-[#276A43]" />

            <label className="block text-xs font-black uppercase tracking-widest text-[#276A43] mb-1.5">Ticker (2-10 caps)</label>
            <input value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))} maxLength={10}
              placeholder={borrower.name.toUpperCase().slice(0, 6)}
              className="w-full rounded-xl border border-[#D9E6DF] px-4 py-3 text-sm font-mono mb-5 focus:outline-none focus:border-[#276A43]" />

            <label className="block text-xs font-black uppercase tracking-widest text-[#276A43] mb-1.5">
              Image URL <span className="text-gray-400 normal-case font-semibold">(optional - defaults to {borrower.name}&apos;s Kiva photo)</span>
            </label>
            <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)}
              placeholder={borrower.image ?? "https://..."}
              className="w-full rounded-xl border border-[#D9E6DF] px-4 py-3 text-sm mb-8 focus:outline-none focus:border-[#276A43]" />

            <button
              onClick={() => setStep(3)}
              disabled={!canContinue2}
              className="w-full bg-[#276A43] hover:bg-[#223829] disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-full py-3 text-sm font-bold transition-colors"
            >
              Review launch
            </button>
          </div>
        )}

        {/* STEP 3 */}
        {step === 3 && borrower && (
          <div className="pb-16 max-w-lg mx-auto">
            <div className="bg-white rounded-2xl border border-[#E4EBE7] shadow-[0_4px_15px_rgba(0,0,0,0.05)] p-6 mb-6">
              <div className="flex items-center gap-4 mb-5">
                <img src={imageUrl || borrower.image || "/sow-logo.png"} alt=""
                  className="w-16 h-16 rounded-2xl object-cover" />
                <div>
                  <div className="font-serif text-2xl font-semibold">{name}</div>
                  <div className="font-mono text-sm text-[#276A43] font-bold">${symbol}</div>
                </div>
              </div>
              <div className="flex flex-col gap-2.5 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Beneficiary</span>
                  <a href={`https://www.kiva.org/lend/${borrower.id}`} target="_blank" rel="noopener noreferrer" className="font-bold text-[#276A43] hover:underline">{borrower.name} · Kiva loan #{borrower.id}</a></div>
                <div className="flex justify-between"><span className="text-gray-500">Pool</span><span className="font-bold">Meteora DBC · {POOL_FEE_BPS / 100}% fee</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Fee split (immutable)</span>
                  <span className="font-bold">{CREATOR_FEE_PCT}% you · {IMPACT_FEE_PCT}% loans · {OPS_FEE_PCT}% ops</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Excess fees</span>
                  <span className="font-bold">80% next borrower · 20% $SOW</span></div>
                <div className="flex justify-between"><span className="text-gray-500">If the loan fills first</span>
                  <span className="font-bold">Fees roll to your next borrower</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Creator rewards</span>
                  <span className="font-bold">$SOW per life lifted</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Supply</span><span className="font-bold">1,000,000,000</span></div>
              </div>
            </div>

            <div className="bg-[#EDF4F1] rounded-2xl p-4 text-[13px] text-[#223829]/80 leading-relaxed mb-6 flex gap-3">
              <Icon name="lock" className="w-5 h-5 flex-shrink-0 text-[#223829]" />
              <span>
                The fee split is enforced by the pool config on-chain and cannot be changed by anyone - including us -
                after launch. The impact share is claimed by the public sow.fun vault and deployed as Kiva loans with receipts.
              </span>
            </div>

            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">{error}</div>
            )}

            <div className="flex flex-col gap-3">
              {!wallet.connected && <WalletMultiButton style={{ width: "100%", justifyContent: "center", borderRadius: "9999px", background: "#276A43" }} />}
              <button
                onClick={launch}
                disabled={!configReady || !wallet.connected || launching}
                className="w-full bg-[#276A43] hover:bg-[#223829] disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-full py-3.5 text-sm font-bold transition-colors"
              >
                {launching ? "Launching..." : configReady ? `Launch $${symbol}` : "Launching opens soon"}
              </button>
              <button onClick={() => setStep(2)} className="text-xs font-bold text-gray-400 hover:text-[#276A43]">Back to details</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
