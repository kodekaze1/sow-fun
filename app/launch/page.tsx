"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import BN from "bn.js";
import { buildSowCurve, firstBuySupplyPct } from "@/scripts/lib/sow-config.mjs";
import { coinMetaUri, DESCRIPTION_MAX } from "@/lib/coin-meta";
import { Keypair, PublicKey, Transaction } from "@solana/web3.js";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import WalletButton from "@/components/WalletButton";
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
  type FundraisingLoan,
  LAUNCH_FEE_SOL,
  MIGRATION_QUOTE_SOL,
  MIGRATED_POOL_FEE_BPS,
  CLAIM_WINDOW_HOURS,
  CLAIM_MIN_FEES_SOL,
} from "@/lib/launchpad";
import { COUNTRY_FLAGS } from "@/lib/types";
import { confirmTx } from "@/lib/confirm-tx";

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
  const [imageKey, setImageKey] = useState(""); // short blob key for metadata
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  // Optional initial buy, executed in the launch transaction itself
  const [devBuy, setDevBuy] = useState("");
  const devBuySol = Math.max(0, Number(devBuy) || 0);
  const curve = useMemo(() => buildSowCurve(), []);
  const devBuyPct = devBuySol > 0 ? firstBuySupplyPct(curve, devBuySol) : 0;
  // Optional creator details - blank fields fall back to sow.fun defaults
  const [description, setDescription] = useState("");
  const [xLink, setXLink] = useState("");
  const [telegram, setTelegram] = useState("");
  const [website, setWebsite] = useState("");

  const uploadImage = async (file: File) => {
    setUploading(true);
    setUploadError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "upload failed");
      setImageUrl(data.url);
      setImageKey(data.key);
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "upload failed");
    } finally {
      setUploading(false);
    }
  };

  const [launching, setLaunching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Signature of a launch we couldn't confirm either way - shown so the creator checks before retrying
  const [pendingSig, setPendingSig] = useState<string | null>(null);
  const [result, setResult] = useState<{ mint: string; signature: string } | null>(null);

  // One coin per borrower: loans that already have a coin link to it instead
  const [taken, setTaken] = useState<Record<number, { mint: string | null; symbol: string; claimEndsAt?: number | null }>>({});
  // If claim data is unavailable, say so instead of showing every borrower as open
  // (the pre-mint freshness check still blocks a duplicate launch)
  const [claimsUnknown, setClaimsUnknown] = useState(false);
  useEffect(() => {
    fetch("/api/launched-loans")
      .then(async (r) => {
        if (!r.ok) throw new Error(String(r.status));
        const d = await r.json();
        setTaken(d.taken ?? {});
      })
      .catch(() => setClaimsUnknown(true));
  }, []);

  // AI helpers
  const [aiLoading, setAiLoading] = useState(false);
  const [aiReasons, setAiReasons] = useState<Record<number, string>>({});
  const [aiNote, setAiNote] = useState<string | null>(null);
  const [ideas, setIdeas] = useState<{ name: string; ticker: string; blurb: string }[] | null>(null);
  const [ideasLoading, setIdeasLoading] = useState(false);

  const aiMatch = async () => {
    if (!search.trim() || aiLoading) return;
    setAiLoading(true);
    setAiNote(null);
    try {
      const res = await fetch("/api/ai/launch-helper", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "search", query: search }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "AI match failed");
      setLoans(data.loans ?? []);
      setAiReasons(data.reasons ?? {});
      if ((data.loans ?? []).length === 0) setAiNote("No live borrowers matched - try different words.");
    } catch (e) {
      setAiNote(e instanceof Error ? e.message : "AI match failed - the filters below still work.");
    } finally {
      setAiLoading(false);
    }
  };

  const suggestIdeas = async () => {
    if (!borrower || ideasLoading) return;
    setIdeasLoading(true);
    try {
      const res = await fetch("/api/ai/launch-helper", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "concierge", borrower }),
      });
      const data = await res.json();
      if (res.ok && data.ideas?.length) setIdeas(data.ideas);
    } catch { /* quiet - manual entry always works */ }
    finally { setIdeasLoading(false); }
  };

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
    setAiReasons({});
    setAiNote(null);
    const t = setTimeout(() => fetchLoans({ q: search, region, sector, women, sort }), 400);
    return () => clearTimeout(t);
  }, [search, region, sector, women, sort, fetchLoans]);

  const launch = async () => {
    if (!wallet.publicKey || !wallet.sendTransaction || !borrower) return;
    setError(null);
    setPendingSig(null);
    setLaunching(true);
    try {
      // Every guard below fails CLOSED: if we can't get an answer, we don't
      // mint - a coin minted past a broken guard costs the creator real SOL.

      // Name screen - keep borrowers from being claimed by junk or abuse
      const screenRes = await fetch("/api/ai/launch-helper", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "screen", borrower: { name: borrower.name, tokenName: name, tokenSymbol: symbol, description } }),
      }).catch(() => null);
      const screen = screenRes?.ok ? await screenRes.json().catch(() => null) : null;
      if (!screen) {
        throw new Error("We couldn't run the name check just now - wait a moment and try again.");
      }
      if (screen.ok !== true) {
        throw new Error(screen.reason || "That name doesn't pass our launch guidelines - try another.");
      }

      // Max 3 coins with still-fundraising loans per wallet - fund one to
      // completion to open another slot (anti-squatting, pro-serial-impact)
      const mineRes = await fetch(`/api/creator?address=${wallet.publicKey.toBase58()}`, { cache: "no-store" }).catch(() => null);
      const mine = mineRes?.ok ? await mineRes.json().catch(() => null) : null;
      if (!mine || !Array.isArray(mine.launches)) {
        throw new Error("We couldn't verify your wallet's active coins - try again.");
      }
      // Lapsed claims (72h with negligible fees) no longer hold a slot
      const activeClaims = (mine.launches ?? []).filter(
        (l: { loanStatus?: string | null; launchLoanStatus?: string | null; claimLapsed?: boolean }) =>
          (l.launchLoanStatus ?? l.loanStatus) === "fundraising" && !l.claimLapsed
      ).length;
      if (activeClaims >= 3) {
        throw new Error("You already have 3 coins with loans still fundraising. Help one fill to claim your next borrower.");
      }

      // One coin per borrower - final freshness check before minting
      const freshRes = await fetch("/api/launched-loans?fresh=1", { cache: "no-store" }).catch(() => null);
      const fresh = freshRes?.ok ? await freshRes.json().catch(() => null) : null;
      if (!fresh || typeof fresh.taken !== "object") {
        throw new Error("We couldn't confirm this borrower is still unclaimed - try again in a moment.");
      }
      const existing = fresh.taken?.[borrower.id];
      if (existing) {
        setTaken(fresh.taken);
        throw new Error(`${borrower.name} already has a coin ($${existing.symbol}) - trade it instead, or pick another borrower.`);
      }
      const client = new DynamicBondingCurveClient(connection, "confirmed");
      // Enough SOL for the launch (fee + rent + tx) plus the initial buy?
      const balance = await connection.getBalance(wallet.publicKey).catch(() => null);
      const needed = (devBuySol + LAUNCH_FEE_SOL + 0.03) * 1e9;
      if (balance !== null && balance < needed) {
        throw new Error(`You need about ${(needed / 1e9).toFixed(3)} SOL for this launch${devBuySol > 0 ? " and initial buy" : ""} - your wallet has ${(balance / 1e9).toFixed(3)}.`);
      }

      const baseMint = Keypair.generate();

      // Save the coin's details (write-once) - its on-chain URI serves them
      const metaRes = await fetch("/api/launch-meta", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          mint: baseMint.publicKey.toBase58(),
          name,
          symbol,
          image: imageKey || imageUrl || borrower.image || null,
          loanId: borrower.id,
          borrower: borrower.name,
          creator: wallet.publicKey.toBase58(),
          description,
          x: xLink,
          telegram,
          website,
        }),
      }).catch(() => null);
      if (!metaRes?.ok) {
        const reason = await metaRes?.json().then((d: { error?: string }) => d.error).catch(() => null);
        throw new Error(reason ? `Couldn't save your coin details: ${reason}` : "We couldn't save your coin details - try again.");
      }

      const createPoolParam = {
        baseMint: baseMint.publicKey,
        config: new PublicKey(DBC_CONFIG_KEY),
        name,
        symbol,
        uri: coinMetaUri(baseMint.publicKey.toBase58()),
        payer: wallet.publicKey,
        poolCreator: wallet.publicKey,
      };
      // With an initial buy, the buy rides in the same transaction as pool
      // creation - nobody can trade before it.
      const tx: Transaction = devBuySol > 0
        ? await client.creator.createPoolWithFirstBuy({
            createPoolParam,
            firstBuyParam: {
              buyer: wallet.publicKey,
              receiver: wallet.publicKey,
              buyAmount: new BN(Math.round(devBuySol * 1e9)),
              minimumAmountOut: new BN(1),
              referralTokenAccount: null,
            },
          })
        : await client.creator.createPool(createPoolParam);
      // Pin the blockhash so confirmation knows exactly when the tx expires
      const latest = await connection.getLatestBlockhash("confirmed");
      tx.recentBlockhash = latest.blockhash;
      tx.feePayer = wallet.publicKey;
      const signature = await wallet.sendTransaction(tx, connection, { signers: [baseMint] });
      const outcome = await confirmTx(connection, signature, latest);
      if (outcome.status === "confirmed") {
        setResult({ mint: baseMint.publicKey.toBase58(), signature });
        return;
      }
      // Never show a plain failure if the pool might exist - a retry would mint a duplicate
      const minted = await connection.getAccountInfo(baseMint.publicKey).catch(() => null);
      if (minted) {
        setResult({ mint: baseMint.publicKey.toBase58(), signature });
        return;
      }
      if (outcome.status === "failed") {
        throw new Error(`The launch transaction failed on-chain and nothing was created (${outcome.error ?? "unknown error"}). You can try again.`);
      }
      setPendingSig(signature);
      throw new Error("We couldn't confirm the launch yet. Check the transaction on Solscan before retrying, so you don't launch twice.");
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
      <div className="bg-[#223829] text-[#EDF4F1] pt-12 pb-10 px-6 text-center">
        <div className="max-w-2xl mx-auto flex flex-col items-center gap-4">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/15 rounded-full px-4 py-1.5 text-[11px] font-semibold uppercase tracking-widest">
            {POOL_FEE_BPS / 100}% fee · split locked<span className="hidden sm:inline"> · one coin per borrower</span>
          </div>
          <h1 className="font-serif text-4xl md:text-5xl font-medium tracking-tight leading-[1.1] [text-wrap:balance]">
            Launch a coin <span className="italic text-[#F8CD69] whitespace-nowrap">for a borrower.</span>
          </h1>
          <p className="opacity-85 max-w-lg leading-relaxed [text-wrap:balance]">
            Pick a real person raising on Kiva. {CREATOR_FEE_PCT}% of trading fees are yours,
            {" "}{IMPACT_FEE_PCT}% fund their loan, {OPS_FEE_PCT}% keep the lights on.
          </p>
          <ul className="mt-1 flex flex-wrap justify-center gap-x-6 gap-y-2 text-[13px] text-[#EDF4F1]/75">
            {["Split locked forever", "Funds the loan from trade one", "Earn $SOW for every borrower funded"].map((t) => (
              <li key={t} className="flex items-center gap-1.5">
                <Icon name="check" className="w-4 h-4 text-[#7FC79E]" />
                {t}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* STEPPER */}
      <div className="max-w-6xl mx-auto px-6 pt-8">
        {/* Steps centered, wallet on the same row at the right (stacks on phones) */}
        <div className="flex flex-col md:grid md:grid-cols-[1fr_auto_1fr] items-center gap-4 mb-8">
        <div className="hidden md:block" />
        <div className="flex items-center justify-center gap-2 text-xs font-bold">
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

        {/* WALLET - visible on every step */}
        <div className="flex items-center gap-2 md:justify-self-end">
          {!wallet.connected && (
            <span className="text-xs text-gray-500">Connect to launch</span>
          )}
          <WalletButton style={{
            borderRadius: "9999px",
            background: wallet.connected ? "#EDF4F1" : "#276A43",
            color: wallet.connected ? "#223829" : "#ffffff",
            fontSize: "12px",
            fontWeight: 700,
            height: "34px",
            padding: "0 14px",
            lineHeight: "34px",
          }} />
        </div>
        </div>

        {!configReady && (
          <div className="mb-8 bg-[#F8F2E6] border border-[#F8CD69]/50 rounded-2xl p-4 text-sm text-[#996210] text-center">
            The launchpad pool config is in final setup - you can explore the flow, and launching opens the moment it is live.
          </div>
        )}

        {/* STEP 1 */}
        {step === 1 && (
          <div className="pb-16">
            <div className="max-w-3xl mx-auto">
            <div className="relative mb-3 flex gap-2">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && aiMatch()}
                placeholder="Describe who you want to help - 'a solar seller in East Africa', 'a tailor I can fully fund'..."
                className="flex-1 rounded-full border border-[#D9E6DF] px-5 py-3 text-sm focus:outline-none focus:border-[#276A43]"
              />
              <button
                onClick={aiMatch}
                disabled={aiLoading || !search.trim()}
                className="flex-shrink-0 rounded-full bg-[#223829] hover:bg-black disabled:bg-gray-200 disabled:text-gray-400 text-white px-5 py-3 text-sm font-bold transition-colors"
              >
                {aiLoading ? "Matching..." : "✨ AI match"}
              </button>
            </div>
            {aiNote && (
              <div className="mb-3 text-sm text-[#996210] bg-[#F8F2E6] border border-[#F8CD69]/40 rounded-xl px-4 py-2.5">{aiNote}</div>
            )}
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
            </div>
            {loadingLoans ? (
              <div className="py-16 text-center text-gray-400 text-sm">Finding live borrowers on Kiva...</div>
            ) : (
              <>
              {claimsUnknown && (
                <div className="mb-4 bg-[#F8F2E6] border border-[#F8CD69]/50 rounded-xl p-3 text-[13px] text-[#996210]">
                  We couldn&apos;t load which borrowers already have a coin. You can still browse - we check again right before you launch.
                </div>
              )}
              <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {loans.map((loan) => {
                  const pct = loan.loanAmount > 0 ? Math.round((loan.fundedAmount / loan.loanAmount) * 100) : 0;
                  const days = daysLeft(loan.expiresAt);
                  const claimed = taken[loan.id];
                  if (claimed) {
                    return (
                      <a
                        key={loan.id}
                        href={claimed.mint ? `/t/${claimed.mint}` : "/launches"}
                        className="relative text-left bg-white rounded-2xl border border-[#2AA967]/60 shadow-[0_4px_15px_rgba(0,0,0,0.05)] overflow-hidden hover:shadow-[0_10px_28px_rgba(34,56,41,0.12)] transition-all block"
                      >
                        <span className="absolute top-2 right-2 z-10 bg-[#223829]/90 text-white text-[10px] font-bold px-2.5 py-1 rounded-full">
                          🌱 Already sown · ${claimed.symbol}
                        </span>
                        {claimed.claimEndsAt && claimed.claimEndsAt * 1000 > Date.now() && (
                          <span className="absolute top-9 right-2 z-10 bg-[#F8F2E6] text-[#996210] text-[10px] font-bold px-2.5 py-1 rounded-full">
                            Reopens in {Math.max(1, Math.ceil((claimed.claimEndsAt * 1000 - Date.now()) / 3600000))}h unless it trades
                          </span>
                        )}
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
                          <div className="flex items-center justify-between text-[11px] mt-1">
                            <span className="text-gray-400">{pct}% funded · ${loan.remaining.toLocaleString()} to go{days !== null ? ` · ${days}d left` : ""}</span>
                          </div>
                          <div className="text-xs font-bold text-[#276A43] mt-2">
                            Being sown by ${claimed.symbol} - trade it to fill this loan →
                          </div>
                        </div>
                      </a>
                    );
                  }
                  return (
                    <button
                      key={loan.id}
                      onClick={() => { setBorrower(loan); setIdeas(null); setStep(2); }}
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
                        {aiReasons[loan.id] && (
                          <p className="text-[12px] text-[#276A43] font-semibold italic mb-1.5">✨ {aiReasons[loan.id]}</p>
                        )}
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
              </>
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
                first fee harvest. If that happens nothing is lost - every pledged cent flows to the borrowers
                you queue for your coin. Prefer a bigger runway? <button onClick={() => setStep(1)} className="underline font-bold">Pick a loan with more to go</button>.
              </div>
            )}

            <div className="mb-5">
              <button
                onClick={suggestIdeas}
                disabled={ideasLoading}
                className="w-full rounded-xl border border-dashed border-[#2AA967]/60 bg-[#EDF4F1]/50 hover:bg-[#EDF4F1] disabled:opacity-60 text-[#276A43] px-4 py-2.5 text-sm font-bold transition-colors"
              >
                {ideasLoading ? "Thinking of names..." : `✨ Suggest a name & ticker for ${borrower.name}'s coin`}
              </button>
              {ideas && (
                <div className="mt-2.5 flex flex-col gap-2">
                  {ideas.map((idea) => (
                    <button key={idea.ticker}
                      onClick={() => { setName(idea.name); setSymbol(idea.ticker); }}
                      className={`text-left rounded-xl border px-4 py-2.5 transition-colors ${
                        symbol === idea.ticker ? "border-[#276A43] bg-[#EDF4F1]" : "border-[#E4EBE7] hover:border-[#276A43]"
                      }`}>
                      <span className="text-sm font-bold text-[#223829]">{idea.name}</span>
                      <span className="font-mono text-xs text-[#276A43] font-bold ml-2">${idea.ticker}</span>
                      <span className="block text-xs text-gray-500 mt-0.5">{idea.blurb}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <label className="block text-xs font-black uppercase tracking-widest text-[#276A43] mb-1.5">Token name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={32}
              placeholder={`${borrower.name}'s ${borrower.activity}`}
              className="w-full rounded-xl border border-[#D9E6DF] px-4 py-3 text-sm mb-5 focus:outline-none focus:border-[#276A43]" />

            <label className="block text-xs font-black uppercase tracking-widest text-[#276A43] mb-1.5">Ticker (2-10 caps)</label>
            <input value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))} maxLength={10}
              placeholder={borrower.name.toUpperCase().slice(0, 6)}
              className="w-full rounded-xl border border-[#D9E6DF] px-4 py-3 text-sm font-mono mb-5 focus:outline-none focus:border-[#276A43]" />

            <label className="block text-xs font-black uppercase tracking-widest text-[#276A43] mb-1.5">
              Token image <span className="text-gray-400 normal-case font-semibold">(optional - defaults to {borrower.name}&apos;s Kiva photo)</span>
            </label>
            <div className="flex items-center gap-3 mb-2">
              <img src={imageUrl || borrower.image || "/sow-logo.png"} alt=""
                className="w-14 h-14 rounded-xl object-cover border border-[#E4EBE7] flex-shrink-0" />
              <label className={`flex-1 text-center rounded-xl border border-dashed px-4 py-3.5 text-sm font-bold cursor-pointer transition-colors ${
                uploading ? "border-gray-200 text-gray-400" : "border-[#2AA967]/60 bg-[#EDF4F1]/50 hover:bg-[#EDF4F1] text-[#276A43]"
              }`}>
                {uploading ? "Uploading..." : imageKey ? "Image uploaded - tap to replace" : "Upload an image (PNG, JPG, WEBP, GIF · max 4MB)"}
                <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden"
                  disabled={uploading}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(f); e.target.value = ""; }} />
              </label>
            </div>
            {uploadError && <div className="text-xs text-red-600 mb-2">{uploadError}</div>}
            <input value={imageKey ? "" : imageUrl} onChange={(e) => { setImageUrl(e.target.value); setImageKey(""); }}
              placeholder="...or paste an image URL"
              className="w-full rounded-xl border border-[#D9E6DF] px-4 py-2.5 text-xs mb-6 focus:outline-none focus:border-[#276A43]" />

            <label htmlFor="dev-buy" className="block text-xs font-black uppercase tracking-widest text-[#276A43] mb-1.5">
              Initial buy <span className="text-gray-400 normal-case font-semibold">(optional, in SOL)</span>
            </label>
            <div className="flex items-center gap-3 mb-1.5">
              <input id="dev-buy" inputMode="decimal" value={devBuy}
                onChange={(e) => setDevBuy(e.target.value.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1"))}
                placeholder="0"
                className="w-32 rounded-xl border border-[#D9E6DF] px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-[#276A43]" />
              <span className="text-sm text-gray-500">
                {devBuySol > 0 ? <>≈ <b className="text-[#223829]">{devBuyPct.toFixed(2)}%</b> of supply</> : "No initial buy"}
              </span>
            </div>
            <p className={`text-[12px] leading-relaxed mb-6 ${devBuyPct > 10 ? "text-[#996210]" : "text-gray-500"}`}>
              {devBuyPct > 10
                ? "That's a big share - large creator bags make traders nervous. Consider a smaller buy."
                : "Bought in the same transaction that creates your coin, so no sniper can get in first. Pays the normal 2% fee."}
            </p>

            <div className="rounded-2xl border border-[#E4EBE7] p-4 mb-8">
              <div className="text-xs font-black uppercase tracking-widest text-[#276A43] mb-1">
                Description and links <span className="text-gray-400 normal-case font-semibold">(optional)</span>
              </div>
              <p className="text-[12px] text-gray-500 mb-3 leading-relaxed">
                Shown in wallets, DEX screeners and your coin page. Leave any blank and we use sow.fun defaults:
                your coin&apos;s sow.fun page as the website and @sowfunhq on X. Saved once at launch - they can&apos;t be changed later.
              </p>
              <label htmlFor="coin-description" className="sr-only">Description</label>
              <textarea id="coin-description" value={description} onChange={(e) => setDescription(e.target.value)}
                maxLength={DESCRIPTION_MAX} rows={3}
                placeholder="What's this coin about? (the Kiva pledge line is added automatically)"
                className="w-full rounded-xl border border-[#D9E6DF] px-4 py-2.5 text-sm mb-1 focus:outline-none focus:border-[#276A43] resize-y" />
              <div className="text-[11px] text-gray-400 text-right mb-2">{description.length}/{DESCRIPTION_MAX}</div>
              <div className="grid sm:grid-cols-3 gap-2">
                <input id="coin-x" value={xLink} onChange={(e) => setXLink(e.target.value)} maxLength={120}
                  placeholder="X: @handle or x.com/..." aria-label="X link"
                  className="rounded-xl border border-[#D9E6DF] px-3 py-2.5 text-xs focus:outline-none focus:border-[#276A43]" />
                <input id="coin-telegram" value={telegram} onChange={(e) => setTelegram(e.target.value)} maxLength={120}
                  placeholder="Telegram: t.me/..." aria-label="Telegram link"
                  className="rounded-xl border border-[#D9E6DF] px-3 py-2.5 text-xs focus:outline-none focus:border-[#276A43]" />
                <input id="coin-website" value={website} onChange={(e) => setWebsite(e.target.value)} maxLength={200}
                  placeholder="Website: https://..." aria-label="Website"
                  className="rounded-xl border border-[#D9E6DF] px-3 py-2.5 text-xs focus:outline-none focus:border-[#276A43]" />
              </div>
            </div>

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
            <div className="bg-white rounded-2xl border border-[#E4EBE7] shadow-[0_4px_15px_rgba(0,0,0,0.05)] p-6 mb-4">
              <div className="flex items-center gap-4 mb-5">
                <img src={imageUrl || borrower.image || "/sow-logo.png"} alt=""
                  className="w-16 h-16 rounded-2xl object-cover" />
                <div>
                  <div className="font-serif text-2xl font-semibold">{name}</div>
                  <div className="font-mono text-sm text-[#276A43] font-bold">${symbol}</div>
                </div>
              </div>
              <div className="flex flex-col gap-3 text-sm">
                <div className="flex justify-between gap-4"><span className="text-gray-500">For</span>
                  <a href={`https://www.kiva.org/lend/${borrower.id}`} target="_blank" rel="noopener noreferrer" className="font-bold text-[#276A43] hover:underline text-right">{borrower.name} · Kiva loan #{borrower.id}</a></div>
                <div className="flex justify-between gap-4"><span className="text-gray-500">Your share</span>
                  <span className="font-bold text-right">{CREATOR_FEE_PCT}% of every trade&apos;s fees</span></div>
                <div className="flex justify-between gap-4"><span className="text-gray-500">Initial buy</span>
                  <span className="font-bold text-right">{devBuySol > 0 ? `${devBuySol} SOL · ≈ ${devBuyPct.toFixed(2)}% of supply` : "None"}</span></div>
                <div className="flex justify-between gap-4 pt-3 border-t border-gray-100"><span className="text-gray-500">You&apos;ll pay</span>
                  <span className="text-right">
                    <span className="font-black text-[#223829]">≈ {(devBuySol + LAUNCH_FEE_SOL + 0.02).toFixed(3)} SOL</span>
                    <span className="block text-[11px] text-gray-400">
                      {LAUNCH_FEE_SOL} launch fee + ~0.02 network rent{devBuySol > 0 ? ` + ${devBuySol} initial buy` : ""}
                    </span>
                  </span>
                </div>
              </div>
            </div>

            <details className="group bg-[#EDF4F1] rounded-2xl mb-6 text-[13px] text-[#223829]/80">
              <summary className="cursor-pointer list-none px-4 py-3 font-bold text-[#223829] flex items-center justify-between">
                How fees and funding work
                <span className="text-[#276A43] transition-transform group-open:rotate-180" aria-hidden="true">▾</span>
              </summary>
              <ul className="px-4 pb-4 flex flex-col gap-2.5 leading-relaxed">
                <li>
                  Every trade pays a {POOL_FEE_BPS / 100}% fee: {CREATOR_FEE_PCT}% to you, {IMPACT_FEE_PCT}% to Kiva loans,
                  {" "}{OPS_FEE_PCT}% to operations. It&apos;s locked on-chain - nobody can change it, including us.
                </li>
                <li>
                  Once {borrower.name} is funded, you can line up to 5 more borrowers on{" "}
                  <a href="/my" className="font-bold text-[#276A43] hover:underline">My coins</a>.
                </li>
                <li>
                  Extra fees after that:
                  <span className="block pl-3 mt-1">80% fund your borrower queue, in order</span>
                  <span className="block pl-3">20% go to $SOW - half burned, half your creator rewards</span>
                </li>
                <li>
                  At {MIGRATION_QUOTE_SOL} SOL raised your coin graduates: its liquidity is locked forever and the fee
                  drops to {MIGRATED_POOL_FEE_BPS / 100}%.
                </li>
                <li>
                  If your coin earns under {CLAIM_MIN_FEES_SOL} SOL in fees in its first {CLAIM_WINDOW_HOURS} hours,
                  {" "}{borrower.name} reopens for someone else to launch.
                </li>
              </ul>
            </details>

            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">
                {error}
                {pendingSig && (
                  <>{" "}
                    <a href={`https://solscan.io/tx/${pendingSig}`} target="_blank" rel="noopener noreferrer" className="font-bold underline">
                      View on Solscan
                    </a>
                  </>
                )}
              </div>
            )}

            <div className="flex flex-col gap-3">
              {!wallet.connected && <WalletButton style={{ width: "100%", justifyContent: "center", borderRadius: "9999px", background: "#276A43" }} />}
              <button
                onClick={launch}
                disabled={!configReady || !wallet.connected || launching}
                className="w-full bg-[#276A43] hover:bg-[#223829] disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-full py-3.5 text-sm font-bold transition-colors"
              >
                {launching ? "Launching..." : configReady ? `Launch $${symbol}` : "Launching opens soon"}
              </button>
              <p className="text-[11px] text-gray-400 text-center leading-relaxed">
                Memecoins are volatile and can go to zero. Not investment advice.
              </p>
              <button onClick={() => setStep(2)} className="text-xs font-bold text-gray-400 hover:text-[#276A43]">Back to details</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
