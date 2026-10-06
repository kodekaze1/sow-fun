"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Icon from "@/components/icons";
import type { CoinLedger } from "@/lib/coin-ledger";
import type { HarvestRecord } from "@/lib/harvest-auto";
import type { LedgerHarvest } from "@/lib/waves";

// Operator command center: follows every dollar from the pools to Kiva, and
// reconciles what the treasury holds against what the ledger says it owes.
// Read-only - it builds the commands, the local scripts sign.

interface Borrower {
  id: number;
  name: string;
  status: string;
  loanAmount: number;
  funded: number;
  remaining: number;
  fillingFast: boolean;
  image: string | null;
}

type Plan = CoinLedger["plan"] & {
  availableCents: number;
  earnedCents: number;
  accruingCents: number;
  lentCents: number;
  skimDoneCents: number;
  livesFunded: number;
  currentLoanId: number | null;
};

interface PoolRow {
  pool: string;
  mint: string | null;
  origin: "sowfun" | "foreign" | "unknown";
  creator: string | null;
  launchedAt: number | null;
  migrated: boolean;
  name: string;
  symbol: string;
  loanId: number | null;
  pendingSol: number;
  pendingUsd: number;
  creatorPendingSol: number;
  lifetimeFeesSol: number;
  quoteReserveSol: number;
  curvePct: number | null;
  marketCapSol: number | null;
  launchFeeClaimed: boolean;
  state: "fund-now" | "harvest-soon" | "roll-over" | "accruing";
  borrower: Borrower | null;
  plan: Plan | null;
  market: Market | null;
  lifetimeVolumeSol: number;
}

interface Market {
  priceUsd: number | null;
  volume24hUsd: number;
  change24hPct: number | null;
  liquidityUsd: number | null;
  marketCapUsd: number | null;
  url: string | null;
}

interface Bucket {
  key: string;
  label: string;
  rule: string;
  uncollectedSol: number;
  collectedSol: number | null;
}

interface Wallet {
  role: string;
  address: string;
  sol: number | null;
  usdc: number | null;
}

interface Totals {
  pendingSol: number;
  pendingUsd: number;
  readyCount: number;
  lifetimeFeesSol: number;
  creatorPendingSol: number;
  sowfunPartnerPendingSol: number;
  foreignPartnerPendingSol: number;
  launchFeesClaimableSol: number;
  launches: number;
  foreignPools: number;
  nearGraduation: number;
  graduated: number;
  borrowersFundraising: number;
  borrowersClose: number;
  borrowersFunded: number;
  borrowersExpired: number;
  deployedCents: number;
  livesFunded: number;
  toLendCents: number;
  skimCents: number;
  owedCents: number;
  treasuryUsd: number;
  earnedCents: number;
  lentCents: number;
  skimDoneCents: number;
  accruingCents: number;
  reviewCount: number;
  lifetimeVolumeSol: number;
  volume24hUsd: number;
}

interface ClaimHistory {
  claimedAt: string;
  solPrice: number | null;
  totalSol: number;
  pools: number;
  launchFees: number;
  splits: { to: string; wallet: string; sol: number; tx: string }[];
  firstTx: string | null;
}

interface Overview {
  pools: PoolRow[];
  solPrice: number;
  notice?: string;
  wallets?: Wallet[];
  totals?: Totals;
  harvestRecords?: HarvestRecord[];
  buckets?: Bucket[];
  sow?: { mint: string; lockUrl: string | null; row: PoolRow | null } | null;
  config?: string;
  configs?: { key: string; label: string }[];
  history?: { claims: ClaimHistory[]; harvests: LedgerHarvest[]; burns: unknown[] };
}

const SOW_MINT = process.env.NEXT_PUBLIC_SOW_MINT ?? "<$SOW mint>";
const KEY_DIR_DEFAULT = "C:/Users/kenx0/vanity-grinder/gpu-grinder";

const usd = (cents: number) => `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const usdN = (n: number) => usd(Math.round(n * 100));
const sol = (n: number | null | undefined, d = 4) => (n == null ? "-" : `${n.toFixed(d)} SOL`);
const short = (a: string) => `${a.slice(0, 4)}...${a.slice(-4)}`;
const solscan = (kind: "account" | "tx" | "token", id: string) => `https://solscan.io/${kind}/${id}`;

// ------------------------------------------------------------- primitives

function Section({ title, hint, children, id }: { title: string; hint?: string; children: React.ReactNode; id?: string }) {
  return (
    <section id={id} className="mt-12">
      <div className="text-xs font-black uppercase tracking-widest text-[#276A43] mb-1">{title}</div>
      {hint && <p className="text-xs text-gray-500 mb-4 max-w-2xl">{hint}</p>}
      {children}
    </section>
  );
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "warn" | "good" }) {
  return (
    <div className={`rounded-2xl p-4 ${tone === "warn" ? "bg-[#F8F2E6]" : "bg-[#EDF4F1]"}`}>
      <div className={`text-xl font-black ${tone === "warn" ? "text-[#996210]" : "text-[#223829]"}`}>{value}</div>
      <div className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider mt-1">{label}</div>
      {sub && <div className="text-[11px] text-gray-400 mt-0.5">{sub}</div>}
    </div>
  );
}

function CopyCmd({ label, cmd }: { label: string; cmd: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="rounded-xl border border-[#E4EBE7] bg-[#FBFCFA] p-3">
      <div className="flex items-center justify-between gap-3 mb-1.5">
        <span className="text-[12px] font-bold text-[#223829]">{label}</span>
        <button
          onClick={() => navigator.clipboard.writeText(cmd).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); })}
          className="text-[11px] font-bold text-[#276A43] hover:underline shrink-0">
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="text-[11px] text-gray-600 whitespace-pre-wrap break-all font-mono">{cmd}</pre>
    </div>
  );
}

// ------------------------------------------------------------- money flow

function MoneyFlow({ t, wallets, solPrice }: { t: Totals; wallets: Wallet[]; solPrice: number }) {
  const w = (role: string) => wallets.find((x) => x.role === role);
  const treasury = wallets.find((x) => x.role.startsWith("Impact Treasury"));
  const ops = w("Ops");
  const genesis = w("Genesis");
  const card = w("KAST card deposit");
  const stages = [
    {
      title: "1 · In pools (unclaimed)",
      main: sol(t.sowfunPartnerPendingSol + t.foreignPartnerPendingSol + t.launchFeesClaimableSol, 3),
      lines: [
        `${sol(t.sowfunPartnerPendingSol, 3)} sow.fun coins (45 Kiva / 10 Ops)`,
        `${sol(t.foreignPartnerPendingSol, 3)} foreign pools -> Genesis`,
        `${sol(t.launchFeesClaimableSol, 3)} launch fees -> Ops`,
        `creators' own: ${sol(t.creatorPendingSol, 3)} (theirs)`,
      ],
    },
    {
      title: "2 · Impact Treasury",
      main: treasury ? `${sol(treasury.sol, 3)}${treasury.usdc ? ` + $${treasury.usdc.toFixed(2)}` : ""}` : "-",
      lines: [`≈ ${usdN(t.treasuryUsd)}`, `owed to Kiva + skims: ${usd(t.owedCents)}`, `lend now: ${usd(t.toLendCents)}`],
    },
    {
      title: "3 · Split out",
      main: `${sol(ops?.sol, 3)} Ops`,
      lines: [`Genesis: ${sol(genesis?.sol, 3)}`, "Ops = 10/55 + launch fees", "Genesis = foreign + $SOW creator"],
    },
    {
      title: "4 · In transit",
      main: card?.usdc != null ? `$${card.usdc.toFixed(2)}` : "-",
      lines: ["USDC at the KAST deposit address", "not yet lent - keep near zero"],
    },
    {
      title: "5 · Lent on Kiva",
      main: usd(t.deployedCents),
      lines: [`${t.livesFunded} lives funded`, `coins' share: ${usd(t.lentCents)}`, `$SOW skims done: ${usd(t.skimDoneCents)}`],
    },
  ];

  // Reconciliation: the treasury must hold at least what the ledger says it owes
  const gapCents = Math.round(t.treasuryUsd * 100) - t.owedCents;
  const short_ = gapCents < -500; // tolerate $5 of price drift / fees
  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {stages.map((s, i) => (
          <div key={s.title} className="relative rounded-2xl border border-[#E4EBE7] bg-white p-4 shadow-[0_4px_15px_rgba(0,0,0,0.04)]">
            <div className="text-[10px] font-black uppercase tracking-widest text-[#276A43] mb-2">{s.title}</div>
            <div className="text-lg font-black text-[#223829] mb-1.5">{s.main}</div>
            <ul className="text-[11px] text-gray-500 flex flex-col gap-0.5">
              {s.lines.map((l) => <li key={l}>{l}</li>)}
            </ul>
            {i < stages.length - 1 && <span className="hidden md:block absolute -right-2.5 top-1/2 -translate-y-1/2 text-[#2AA967] font-black">→</span>}
          </div>
        ))}
      </div>
      <div className={`mt-3 rounded-xl px-4 py-3 text-sm ${short_ ? "bg-red-50 border border-red-200 text-red-700" : "bg-[#EDF4F1] text-[#223829]"}`}>
        <b>{short_ ? "Reconciliation: SHORT" : "Reconciliation: OK"}</b>
        {" - "}the Impact Treasury holds {usdN(t.treasuryUsd)}; the ledger says {usd(t.owedCents)} of claimed money is owed to Kiva and skims.{" "}
        {short_
          ? `It is ${usd(-gapCents)} short - something left the treasury without a harvest record. Check the history below before the next harvest.`
          : `${usd(Math.max(0, gapCents))} above that is unearmarked (rent reserve, rounding leftovers, or money waiting for the next claim's split).`}
        <span className="text-gray-500"> SOL at ${solPrice.toFixed(2)}.</span>
      </div>
    </div>
  );
}

// ------------------------------------------------------------- do next

function DoNext({ data, keyDir }: { data: Overview; keyDir: string }) {
  const t = data.totals!;
  const wallets = data.wallets ?? [];
  const CONFIG = data.config ?? "<config>";
  const keyFor = (role: string) => {
    const addr = wallets.find((w) => w.role.startsWith(role))?.address ?? "<address>";
    return `${keyDir.replace(/[\\/]+$/, "")}/${addr}.json`;
  };
  const treasuryKey = keyFor("Impact Treasury");
  const genesisKey = keyFor("Genesis");
  const sowRows = data.pools.filter((p) => p.origin === "sowfun");
  const sowCreatorPending = data.pools.find((p) => p.mint === SOW_MINT)?.creatorPendingSol ?? 0;
  const lendLines = sowRows.flatMap((r) => {
    const out: { coin: string; loanId: number; name: string | null; cents: number; role: string }[] = [];
    if (r.plan?.pledge && r.plan.pledge.cents > 0) out.push({ coin: r.symbol, loanId: r.plan.pledge.loanId, name: r.plan.pledge.name, cents: r.plan.pledge.cents, role: "pledge" });
    for (const q of r.plan?.queue ?? []) if (q.cents > 0) out.push({ coin: r.symbol, loanId: q.loanId, name: q.name, cents: q.cents, role: "queue" });
    return out;
  });
  const skimRows = sowRows.filter((r) => (r.plan?.skimCents ?? 0) > 0);
  const claimable = t.sowfunPartnerPendingSol + t.foreignPartnerPendingSol + t.launchFeesClaimableSol;
  const steps: { title: string; body: React.ReactNode }[] = [];

  if (t.reviewCount > 0) {
    steps.push({
      title: `Review ${t.reviewCount} Kiva loan${t.reviewCount > 1 ? "s" : ""} the sync couldn't match`,
      body: <p className="text-[13px] text-gray-600">They are hidden from the public ledger until you assign a coin and amount, or ignore them. <a href="#review" className="font-bold text-[#276A43] hover:underline">Go to review ↓</a></p>,
    });
  }
  if (claimable > 0.01) {
    steps.push({
      title: `Claim ${sol(claimable, 3)} into the Impact Treasury (auto-splits Ops / Genesis)`,
      body: (
        <div className="flex flex-col gap-2">
          <CopyCmd label="1. Preview (sends nothing)" cmd={`KEYPAIR="${treasuryKey}" CONFIG=${CONFIG} DRY=1 node scripts/claim-fees.mjs`} />
          <CopyCmd label="2. One paste: claim + route Ops/Genesis + publish the snapshot (commit, push, deploy) - then Refresh this page" cmd={`KEYPAIR="${treasuryKey}" CONFIG=${CONFIG} node scripts/claim-fees.mjs && git add data/claims && git commit -m "Claim snapshot" && git push sowfun master && npx vercel deploy --prod --yes`} />
        </div>
      ),
    });
  }
  if (lendLines.length) {
    const dollars = (t.toLendCents / 100).toFixed(2);
    steps.push({
      title: `Lend ${usd(t.toLendCents)} on Kiva`,
      body: <LendSteps key={lendLines.map((l) => `${l.loanId}_${l.cents}`).join(",")} lines={lendLines} dollars={dollars} totalCents={t.toLendCents} treasuryKey={treasuryKey} />,
    });
  }
  if (skimRows.length) {
    steps.push({
      title: `Buy + burn ${usd(t.skimCents)} of $SOW (20% of excess)`,
      body: (
        <div className="flex flex-col gap-2">
          {skimRows.map((r) => {
            const amountSol = ((r.plan!.skimCents / 100) / data.solPrice).toFixed(4);
            return (
              <CopyCmd key={r.pool} label={`${r.symbol}: ${usd(r.plan!.skimCents)} (≈ ${amountSol} SOL) - half burned, half creator reward`}
                cmd={`KEYPAIR="${treasuryKey}" MINT=${SOW_MINT} AMOUNT_SOL=${amountSol} COIN_MINT=${r.mint} COIN_SYMBOL=${r.symbol} LOAN_ID=${r.plan!.currentLoanId ?? r.loanId ?? ""} BORROWER="${r.borrower?.name ?? ""}" REWARD_WALLET=${r.creator ?? ""} node scripts/buyback-burn.mjs`} />
            );
          })}
        </div>
      ),
    });
  }
  if (sowCreatorPending > 0.001) {
    steps.push({
      title: `Claim ${sol(sowCreatorPending, 3)} $SOW creator fees into Genesis (Genesis Vault)`,
      body: <CopyCmd label="Genesis Vault claim" cmd={`KEYPAIR="${genesisKey}" CONFIG=${CONFIG} CREATOR=1 node scripts/claim-fees.mjs`} />,
    });
  }
  if (!steps.length) {
    return <div className="rounded-2xl bg-[#EDF4F1] p-5 text-sm text-[#223829]">Nothing to do right now - fees are accruing and every claimed dollar is accounted for.</div>;
  }
  return (
    <ol className="flex flex-col gap-3">
      {steps.map((s, i) => (
        <li key={s.title} className="rounded-2xl border border-[#E4EBE7] bg-white p-5">
          <div className="text-sm font-black text-[#223829] mb-2">{i + 1}. {s.title}</div>
          {s.body}
        </li>
      ))}
    </ol>
  );
}

// ------------------------------------------------------------- lend

const KAST_DEPOSIT = "BisPNULEXmouTNaqNPwDadHCp9puAuLvp3EUT4tAih5Q";

function LendSteps({ lines, dollars, totalCents, treasuryKey }: {
  lines: { coin: string; loanId: number; name: string | null; cents: number; role: string }[];
  dollars: string;
  totalCents: number;
  treasuryKey: string;
}) {
  // Ticks survive a refresh; keyed by loan + amount so a new plan starts clean
  const tickKey = (l: { loanId: number; cents: number }) => `sow_lent_${l.loanId}_${l.cents}`;
  // Rendered only after the client fetch, so localStorage is available; the
  // parent keys this component by the plan, so a new plan re-reads the ticks
  const [ticked, setTicked] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(lines.map((l) => [tickKey(l), typeof window !== "undefined" && localStorage.getItem(tickKey(l)) === "1"]))
  );
  const toggle = (k: string) => {
    setTicked((m) => {
      const v = !m[k];
      if (v) localStorage.setItem(k, "1");
      else localStorage.removeItem(k);
      return { ...m, [k]: v };
    });
  };
  const fundCmd = `KEYPAIR="${treasuryKey}" USD=${dollars} node scripts/fund-card.mjs`;
  return (
    <div className="flex flex-col gap-4 text-[13px] text-gray-700">
      <div>
        <div className="font-bold text-[#223829] mb-1.5">A. Fund the card with exactly {usd(totalCents)}</div>
        <div className="flex flex-col gap-2">
          <CopyCmd label="Preview the swap (sends nothing)" cmd={fundCmd.replace(" node", " DRY=1 node")} />
          <CopyCmd label="One paste: swap exactly this much SOL -> USDC + send to KAST + publish the receipt"
            cmd={`${fundCmd} && git add data/card-topups.json && git commit -m "Card top-up $${dollars}" && git push sowfun master`} />
          <p className="text-[12px] text-gray-500">
            By hand instead: <a href="https://jup.ag/swap/SOL-USDC" target="_blank" rel="noopener noreferrer" className="font-bold text-[#276A43] hover:underline">Jupiter SOL→USDC ↗</a>{" "}
            (switch to exact-out, receive {usd(totalCents)}), then send it to the KAST deposit{" "}
            <button onClick={() => navigator.clipboard.writeText(KAST_DEPOSIT)} className="font-mono font-bold text-[#276A43] hover:underline">{KAST_DEPOSIT.slice(0, 6)}...{KAST_DEPOSIT.slice(-4)} (copy)</button>.
          </p>
        </div>
      </div>
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
          <span className="font-bold text-[#223829]">B. Lend on Kiva as sowfun - credit team sow.fun at checkout</span>
          <div className="flex items-center gap-3 text-[12px] font-bold">
            <button onClick={() => lines.forEach((l) => window.open(`https://www.kiva.org/lend/${l.loanId}`, "_blank", "noopener"))} className="text-[#276A43] hover:underline">
              Open all {lines.length} ↗
            </button>
            <a href="https://www.kiva.org/basket" target="_blank" rel="noopener noreferrer" className="text-[#276A43] hover:underline">Checkout ↗</a>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          {lines.map((l) => {
            const k = tickKey(l);
            return (
              <div key={k} className={`flex flex-wrap items-center gap-3 rounded-xl border px-3 py-2 ${ticked[k] ? "border-[#2AA967] bg-[#EDF4F1]" : "border-[#E4EBE7] bg-white"}`}>
                <input type="checkbox" checked={!!ticked[k]} onChange={() => toggle(k)} className="w-4 h-4 accent-[#276A43]" aria-label="Lent" />
                <a href={`https://www.kiva.org/lend/${l.loanId}`} target="_blank" rel="noopener noreferrer"
                  className="rounded-full bg-[#276A43] hover:bg-[#223829] text-white font-bold px-4 py-1.5 text-[12px] transition-colors">
                  Lend {usd(l.cents)} → {l.name ?? `#${l.loanId}`} ↗
                </a>
                <span className="text-[12px] text-gray-500">${l.coin} · {l.role} · loan #{l.loanId}</span>
              </div>
            );
          })}
        </div>
        <p className="text-[11px] text-gray-400 mt-1.5">Pick exactly these amounts in Kiva&apos;s lend box (they are already $25 steps). Kiva links can&apos;t pre-fill the amount.</p>
      </div>
      <div>
        <div className="font-bold text-[#223829] mb-0.5">C. Refresh this page</div>
        <p className="text-[12px] text-gray-500">The sync finds the new loans in the sowfun profile and records them on the public Harvest Ledger.</p>
      </div>
    </div>
  );
}

// ------------------------------------------------------------- review

function Review({ records, coins, adminKey, onSaved }: {
  records: HarvestRecord[];
  coins: PoolRow[];
  adminKey: string;
  onSaved: () => void;
}) {
  const [edit, setEdit] = useState<Record<string, { mint: string; role: string; dollars: string }>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const save = async (r: HarvestRecord, status: HarvestRecord["status"]) => {
    const e = edit[r.kiva_id] ?? { mint: r.mint ?? "", role: r.role ?? "", dollars: r.uplift_cents ? String(r.uplift_cents / 100) : "" };
    const coin = coins.find((c) => c.mint === e.mint);
    setBusy(r.kiva_id);
    setErr(null);
    try {
      const res = await fetch("/api/admin/harvest", {
        method: "POST",
        headers: { "content-type": "application/json", "x-admin-key": adminKey },
        body: JSON.stringify({
          kiva_id: r.kiva_id,
          status,
          mint: status === "ignored" ? null : e.mint || null,
          symbol: coin?.symbol ?? null,
          role: status === "ignored" ? null : e.role || null,
          uplift_cents: status === "ignored" ? 0 : Math.round(parseFloat(e.dollars || "0") * 100),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "save failed");
      onSaved();
    } catch (x) {
      setErr(x instanceof Error ? x.message : "save failed");
    } finally {
      setBusy(null);
    }
  };

  if (!records.length) {
    return <div className="rounded-2xl bg-[#EDF4F1] p-5 text-sm text-[#223829]">No auto-recorded loans yet. Loans you fund from the sowfun account appear here within minutes of the next sync.</div>;
  }
  return (
    <div className="flex flex-col gap-2">
      {err && <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 p-3 text-sm">{err}</div>}
      {records.map((r) => {
        const e = edit[r.kiva_id] ?? { mint: r.mint ?? "", role: r.role ?? "", dollars: r.uplift_cents ? String(r.uplift_cents / 100) : "" };
        const set = (patch: Partial<typeof e>) => setEdit((m) => ({ ...m, [r.kiva_id]: { ...e, ...patch } }));
        const badge = r.status === "review" ? "bg-[#F8CD69] text-[#223829]" : r.status === "ignored" ? "bg-gray-100 text-gray-500" : "bg-[#EDF4F1] text-[#276A43]";
        return (
          <div key={r.kiva_id} className={`rounded-2xl border bg-white p-4 ${r.status === "review" ? "border-[#F8CD69]" : "border-[#E4EBE7]"}`}>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <div className="text-sm">
                <a href={`https://www.kiva.org/lend/${r.kiva_id}`} target="_blank" rel="noopener noreferrer" className="font-bold text-[#223829] hover:underline">{r.borrower}</a>
                <span className="text-gray-400"> · #{r.kiva_id}{r.location ? ` · ${r.location}` : ""} · seen {new Date(r.detected_at).toLocaleString()}</span>
              </div>
              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${badge}`}>{r.status}</span>
            </div>
            <div className="flex flex-wrap items-end gap-2 text-[12px]">
              <label className="flex flex-col gap-0.5">
                <span className="text-gray-400 font-semibold">Coin that paid</span>
                <select value={e.mint} onChange={(x) => set({ mint: x.target.value })} className="rounded-lg border border-[#D9E6DF] px-2 py-1.5">
                  <option value="">-</option>
                  {coins.map((c) => <option key={c.mint!} value={c.mint!}>${c.symbol} · {short(c.mint!)}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-0.5">
                <span className="text-gray-400 font-semibold">Role</span>
                <select value={e.role} onChange={(x) => set({ role: x.target.value })} className="rounded-lg border border-[#D9E6DF] px-2 py-1.5">
                  <option value="">-</option>
                  <option value="pledge">pledge (launch borrower)</option>
                  <option value="excess">excess (queue / fallback)</option>
                </select>
              </label>
              <label className="flex flex-col gap-0.5">
                <span className="text-gray-400 font-semibold">sow.fun lent (USD)</span>
                <input value={e.dollars} onChange={(x) => set({ dollars: x.target.value })} inputMode="decimal" className="w-24 rounded-lg border border-[#D9E6DF] px-2 py-1.5" />
              </label>
              <button disabled={busy === r.kiva_id} onClick={() => save(r, "confirmed")}
                className="rounded-full bg-[#276A43] hover:bg-[#223829] text-white font-bold px-4 py-1.5 disabled:opacity-50">
                {busy === r.kiva_id ? "Saving..." : "Save"}
              </button>
              {r.status !== "ignored" && (
                <button disabled={busy === r.kiva_id} onClick={() => save(r, "ignored")} className="text-gray-400 hover:text-red-600 font-bold px-2">
                  Ignore
                </button>
              )}
            </div>
            {r.note && <div className="text-[11px] text-gray-400 mt-2">{r.note}</div>}
          </div>
        );
      })}
    </div>
  );
}

// ------------------------------------------------------------- buckets

function Buckets({ buckets, solPrice }: { buckets: Bucket[]; solPrice: number }) {
  const cell = (n: number | null) =>
    n == null ? <span className="text-gray-400">-</span> : (<>{sol(n, 3)}<div className="text-gray-400 font-normal">{usdN(n * solPrice)}</div></>);
  return (
    <div className="overflow-x-auto rounded-2xl border border-[#E4EBE7] bg-white">
      <table className="w-full text-[12px]">
        <thead className="bg-[#FBFCFA] text-gray-400 uppercase tracking-wider text-[10px]">
          <tr>{["Bucket", "Gets", "Uncollected (in pools)", "Collected (lifetime)"].map((h) => <th key={h} className="text-left font-black px-3 py-2">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {buckets.map((b) => (
            <tr key={b.key} className="align-top">
              <td className="px-3 py-2.5 font-black text-[#223829] whitespace-nowrap">{b.label}</td>
              <td className="px-3 py-2.5 text-gray-500">{b.rule}</td>
              <td className="px-3 py-2.5 font-bold whitespace-nowrap">{cell(b.uncollectedSol)}</td>
              <td className="px-3 py-2.5 font-bold whitespace-nowrap">{cell(b.collectedSol)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ------------------------------------------------------------- $SOW

function SowPanel({ sow, solPrice }: { sow: Overview["sow"]; solPrice: number }) {
  if (!sow) {
    return (
      <div className="rounded-2xl bg-[#FBF6EA] border border-[#F8CD69]/40 p-5 text-sm text-[#223829]">
        <b>Pre-launch.</b> This panel lights up once NEXT_PUBLIC_SOW_MINT is set on Vercel (launch day, step 6): price, market cap,
        volume, graduation progress, its Kiva pledge and the Genesis Vault fees it earns.
      </div>
    );
  }
  const r = sow.row;
  const m = r?.market;
  const items = [
    { label: "Price", value: m?.priceUsd != null ? `$${m.priceUsd.toPrecision(4)}` : "-", sub: m?.change24hPct != null ? `${m.change24hPct >= 0 ? "+" : ""}${m.change24hPct.toFixed(1)}% 24h` : "" },
    { label: "Market cap", value: m?.marketCapUsd != null ? usdN(m.marketCapUsd) : r?.marketCapSol != null ? `${r.marketCapSol.toFixed(0)} SOL` : "-", sub: "" },
    { label: "24h volume", value: m ? usdN(m.volume24hUsd) : "-", sub: r ? `≈ ${sol(r.lifetimeVolumeSol, 1)} lifetime` : "" },
    { label: "Curve", value: r?.migrated ? "Graduated" : r?.curvePct != null ? `${r.curvePct}%` : "-", sub: r ? `${sol(r.quoteReserveSol, 2)} raised` : "" },
    { label: "Genesis Vault pending", value: r ? sol(r.creatorPendingSol, 3) : "-", sub: r ? usdN(r.creatorPendingSol * solPrice) : "" },
    { label: "Kiva share pending", value: r ? sol(r.pendingSol * (45 / 55), 3) : "-", sub: r?.borrower ? `for ${r.borrower.name}` : "" },
  ];
  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {items.map((i) => <Stat key={i.label} label={i.label} value={i.value} sub={i.sub} />)}
      </div>
      <div className="flex flex-wrap gap-4 text-xs font-bold mt-3">
        <a href={`/t/${sow.mint}`} target="_blank" className="text-[#276A43] hover:underline">Token page ↗</a>
        {m?.url && <a href={m.url} target="_blank" rel="noopener noreferrer" className="text-[#276A43] hover:underline">DexScreener ↗</a>}
        <a href={solscan("token", sow.mint)} target="_blank" rel="noopener noreferrer" className="text-[#276A43] hover:underline">Solscan ↗</a>
        {sow.lockUrl && <a href={sow.lockUrl} target="_blank" rel="noopener noreferrer" className="text-[#276A43] hover:underline">Team lock (Streamflow) ↗</a>}
      </div>
    </div>
  );
}

// ------------------------------------------------------------- coins

function CoinsTable({ rows, solPrice }: { rows: PoolRow[]; solPrice: number }) {
  if (!rows.length) return <div className="text-sm text-gray-400">No sow.fun coins yet.</div>;
  return (
    <div className="overflow-x-auto rounded-2xl border border-[#E4EBE7] bg-white">
      <table className="w-full text-[12px]">
        <thead className="bg-[#FBFCFA] text-gray-400 uppercase tracking-wider text-[10px]">
          <tr>
            {["Coin", "Borrower", "Volume", "Lifetime fees", "Yours pending", "Creator pending", "Earned → lent", "Owed", "Curve", "Mcap"].map((h) => (
              <th key={h} className="text-left font-black px-3 py-2 whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((r) => {
            const b = r.borrower;
            const pct = b && b.loanAmount > 0 ? Math.round((b.funded / b.loanAmount) * 100) : null;
            return (
              <tr key={r.pool} className="align-top">
                <td className="px-3 py-2.5 whitespace-nowrap">
                  <a href={`/t/${r.mint}`} target="_blank" className="font-bold text-[#223829] hover:underline">${r.symbol}</a>
                  <div className="text-gray-400">{r.launchedAt ? new Date(r.launchedAt * 1000).toLocaleDateString() : ""}</div>
                </td>
                <td className="px-3 py-2.5">
                  {b ? (
                    <>
                      <a href={`https://www.kiva.org/lend/${b.id}`} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#223829] hover:underline">{b.name}</a>
                      <div className={b.fillingFast ? "text-[#996210] font-bold" : "text-gray-400"}>
                        {b.status === "fundraising" ? `${pct}% · $${b.remaining.toFixed(0)} to go${b.fillingFast ? " · filling fast" : ""}` : b.status}
                      </div>
                    </>
                  ) : <span className="text-gray-400">-</span>}
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap">≈ {sol(r.lifetimeVolumeSol, 1)}<div className="text-gray-400">{r.market ? `${usdN(r.market.volume24hUsd)} 24h${r.market.change24hPct != null ? ` · ${r.market.change24hPct >= 0 ? "+" : ""}${r.market.change24hPct.toFixed(0)}%` : ""}` : ""}</div></td>
                <td className="px-3 py-2.5 whitespace-nowrap">{sol(r.lifetimeFeesSol, 3)}</td>
                <td className="px-3 py-2.5 whitespace-nowrap font-bold">{sol(r.pendingSol, 3)}<div className="text-gray-400 font-normal">{usdN(r.pendingSol * solPrice)}</div></td>
                <td className="px-3 py-2.5 whitespace-nowrap">{sol(r.creatorPendingSol, 3)}</td>
                <td className="px-3 py-2.5 whitespace-nowrap">{r.plan ? `${usd(r.plan.earnedCents)} → ${usd(r.plan.lentCents)}` : "-"}<div className="text-gray-400">{r.plan ? `${r.plan.livesFunded} lives` : ""}</div></td>
                <td className="px-3 py-2.5 whitespace-nowrap font-bold">{r.plan ? usd(r.plan.availableCents) : "-"}<div className="text-gray-400 font-normal">{r.plan ? `+${usd(r.plan.accruingCents)} unclaimed` : ""}</div></td>
                <td className="px-3 py-2.5 whitespace-nowrap">{r.migrated ? "graduated" : r.curvePct != null ? `${r.curvePct}%` : "-"}</td>
                <td className="px-3 py-2.5 whitespace-nowrap">{r.marketCapSol != null ? `${r.marketCapSol.toFixed(0)} SOL` : "-"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ------------------------------------------------------------- event cards

function EventCards({ rows }: { rows: PoolRow[] }) {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = (key: string, text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 1500);
    });
  };
  const site = "https://sow.fun";
  const items: { key: string; title: string; href: string; post: string }[] = [
    { key: "milestone", title: "Milestone - lives funded and total lent", href: "/api/card/event/milestone", post: `Every trade, a real loan. Here's what sow.fun has funded on Kiva so far. ${site}/treasury` },
    { key: "harvest", title: "Latest harvest receipt", href: "/api/card/event/harvest", post: `New harvest: trading fees from sow.fun coins just became Kiva microloans - receipts for every loan. ${site}/treasury` },
    ...rows.filter((r) => r.mint).flatMap((r) => {
      const who = r.borrower?.name ?? "their borrower";
      const coinUrl = `${site}/t/${r.mint}`;
      const out = [{ key: `funded-${r.mint}`, title: `${who} funded - ${r.symbol}`, href: `/api/card/event/funded?mint=${r.mint}`, post: `${who} is fully funded on Kiva - trading fees from ${r.symbol} became a real microloan. ${coinUrl}` }];
      if (r.migrated) out.push({ key: `graduated-${r.mint}`, title: `${r.symbol} graduated`, href: `/api/card/event/graduated?mint=${r.mint}`, post: `${r.symbol} just graduated on @sowfunhq - liquidity locked forever, and it keeps funding ${who}'s Kiva loan. ${coinUrl}` });
      return out;
    }),
  ];
  return (
    <div className="flex flex-col divide-y divide-gray-100 bg-white rounded-2xl border border-[#E4EBE7]">
      {items.map((it) => (
        <div key={it.key} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
          <span className="text-sm font-bold text-[#223829]">{it.title}</span>
          <div className="flex items-center gap-4 text-xs font-bold">
            <a href={it.href} target="_blank" rel="noopener noreferrer" className="text-[#276A43] hover:underline">Open card ↗</a>
            <button onClick={() => copy(it.key, it.post)} className="text-gray-500 hover:text-[#276A43]">{copied === it.key ? "Copied" : "Copy post"}</button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ------------------------------------------------------------- page

export default function AdminPage() {
  const [key, setKey] = useState("");
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sync, setSync] = useState<string | null>(null);
  const [keyDir, setKeyDir] = useState(KEY_DIR_DEFAULT);
  const [cfg, setCfg] = useState<string>("");

  useEffect(() => {
    setSavedKey(localStorage.getItem("uplift_admin_key"));
    setKeyDir(localStorage.getItem("sow_key_dir") ?? KEY_DIR_DEFAULT);
    setCfg(localStorage.getItem("sow_admin_config") ?? "");
  }, []);

  const load = useCallback(async (k: string, withSync = false, configKey = "") => {
    setLoading(true);
    setError(null);
    try {
      if (withSync) {
        // Record any loans funded since the last look before reading the books
        const s = await fetch("/api/cron/harvest-sync", { headers: { "x-admin-key": k } }).then((r) => r.json()).catch(() => null);
        setSync(s?.error ? `Kiva sync failed: ${s.error}` : s ? `Kiva synced: ${s.checked} loans checked, ${s.recorded.length} new recorded` : "Kiva sync unavailable");
      }
      const res = await fetch(`/api/admin/claims${configKey ? `?config=${configKey}` : ""}`, { headers: { "x-admin-key": k } });
      if (res.status === 401) {
        localStorage.removeItem("uplift_admin_key");
        setSavedKey(null);
        setError("Wrong key.");
        return;
      }
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Failed to load.");
        return;
      }
      localStorage.setItem("uplift_admin_key", k);
      setSavedKey(k);
      setData(json);
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (savedKey) load(savedKey, true, localStorage.getItem("sow_admin_config") ?? "");
  }, [savedKey, load]);
  const switchConfig = (key: string) => {
    setCfg(key);
    localStorage.setItem("sow_admin_config", key);
    if (savedKey) load(savedKey, false, key);
  };

  const sowCoins = useMemo(() => (data?.pools ?? []).filter((p) => p.origin === "sowfun" && p.mint), [data]);
  const foreign = useMemo(() => (data?.pools ?? []).filter((p) => p.origin !== "sowfun"), [data]);

  if (!savedKey) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="w-full max-w-sm text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-[#EDF4F1] flex items-center justify-center text-[#223829]">
            <Icon name="lock" className="w-7 h-7" />
          </div>
          <h1 className="font-serif text-2xl font-semibold mb-6">Command Center</h1>
          <input type="password" value={key} onChange={(e) => setKey(e.target.value)} onKeyDown={(e) => e.key === "Enter" && key && load(key)}
            placeholder="Admin key" className="w-full rounded-full border border-[#D9E6DF] px-5 py-3 text-sm text-center mb-3 focus:outline-none focus:border-[#276A43]" />
          <button onClick={() => key && load(key)} disabled={loading}
            className="w-full bg-[#276A43] hover:bg-[#223829] text-white rounded-full py-3 text-sm font-bold transition-colors">
            {loading ? "Checking..." : "Open"}
          </button>
          {error && <div className="mt-3 text-sm text-red-600">{error}</div>}
        </div>
      </div>
    );
  }

  const t = data?.totals;
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
          <h1 className="font-serif text-3xl font-semibold">Command Center</h1>
          <button onClick={() => savedKey && load(savedKey, true, cfg)} disabled={loading}
            className="flex items-center gap-2 text-sm font-bold text-[#276A43] hover:text-[#223829] transition-colors">
            <Icon name="refresh" className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh + sync Kiva
          </button>
        </div>
        <p className="text-sm text-gray-500">Every dollar from the pools to Kiva, reconciled. Read-only: it builds the commands, your local scripts sign.</p>
        {sync && <p className="text-xs text-gray-400 mt-1">{sync}</p>}
        {data?.configs && (
          <div className="mt-4 flex flex-wrap items-center gap-2 text-[12px]">
            <span className="text-gray-400 font-semibold">Config:</span>
            {data.configs.map((c) => (
              <button key={c.key} onClick={() => switchConfig(c.key)} disabled={loading}
                className={`rounded-full px-3 py-1 font-bold border transition-colors ${data.config === c.key ? "bg-[#223829] text-white border-[#223829]" : "border-[#D9E6DF] text-[#223829] hover:border-[#276A43]"}`}>
                {c.label} <span className="font-mono font-normal opacity-70">{short(c.key)}</span>
              </button>
            ))}
            {data.configs.length === 1 && <span className="text-gray-400">Live config not created yet - showing the pilot.</span>}
          </div>
        )}

        {error && <div className="mt-6 bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">{error}</div>}
        {data?.notice && <div className="mt-6 bg-[#F8F2E6] border border-[#F8CD69]/50 text-[#996210] rounded-xl p-4 text-sm">{data.notice}</div>}
        {!data && !error && <div className="py-24 text-center text-gray-400 text-sm">Loading the books...</div>}

        {data && t && data.wallets && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-7 gap-3 mt-8">
              <Stat label="Volume" value={`≈ ${sol(t.lifetimeVolumeSol, 0)}`} sub={`${usdN(t.volume24hUsd)} in 24h`} />
              <Stat label="Lifetime trading fees" value={sol(t.lifetimeFeesSol, 2)} sub={usdN(t.lifetimeFeesSol * data.solPrice)} />
              <Stat label="Lent on Kiva" value={usd(t.deployedCents)} sub={`${t.livesFunded} lives funded`} />
              <Stat label="sow.fun coins" value={String(t.launches)} sub={`${t.nearGraduation} near graduation · ${t.graduated} graduated`} />
              <Stat label="Borrowers funded" value={String(t.borrowersFunded)} sub={`${t.borrowersFundraising} fundraising · ${t.borrowersExpired} expired`} />
              <Stat label="Close to funded" value={String(t.borrowersClose)} sub="≥80% or ≤$100 left" tone={t.borrowersClose ? "warn" : undefined} />
              <Stat label="Needs review" value={String(t.reviewCount)} sub="unmatched Kiva loans" tone={t.reviewCount ? "warn" : undefined} />
            </div>

            <Section title="Money flow" hint="Where every dollar is right now. The reconciliation line checks the treasury against the per-coin ledger - if it ever says SHORT, money moved without a record.">
              <MoneyFlow t={t} wallets={data.wallets} solPrice={data.solPrice} />
            </Section>

            {data.buckets && (
              <Section title="Fee buckets" hint="Every SOL of partner and creator fees by where it goes. Uncollected = still in the pools; collected = claimed (from the claim receipts). The claim script routes each bucket automatically.">
                <Buckets buckets={data.buckets} solPrice={data.solPrice} />
              </Section>
            )}

            <Section title="$SOW" hint="Our own coin - same config, same split as every coin. Its 45% creator share is the Genesis Vault.">
              <SowPanel sow={data.sow ?? null} solPrice={data.solPrice} />
            </Section>

            <Section title="Do next" hint="Built from the live numbers. Commands use your key folder below - copy, run locally, done.">
              <DoNext data={data} keyDir={keyDir} />
              <label className="mt-3 flex flex-wrap items-center gap-2 text-[12px] text-gray-500">
                Key folder:
                <input value={keyDir} onChange={(e) => { setKeyDir(e.target.value); localStorage.setItem("sow_key_dir", e.target.value); }}
                  className="flex-1 min-w-[260px] rounded-lg border border-[#D9E6DF] px-2 py-1 font-mono text-[11px]" />
              </label>
            </Section>

            <Section id="review" title="Kiva loans recorded by the sync" hint="Loans funded from the sowfun account. Matched ones were recorded with the plan's amount; 'review' ones are hidden publicly until you assign or ignore them. Fix any amount here - every save keeps a history.">
              <Review records={data.harvestRecords ?? []} coins={sowCoins} adminKey={savedKey} onSaved={() => load(savedKey, false, cfg)} />
            </Section>

            <Section title="Coins" hint="'Yours pending' = the treasury's 55% (45 Kiva / 10 Ops). 'Owed' = claimed money not yet lent or skimmed - it must sit in the treasury.">
              <CoinsTable rows={data.pools.filter((p) => p.origin === "sowfun")} solPrice={data.solPrice} />
            </Section>

            <Section title="Wallets">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                {data.wallets.map((w) => (
                  <a key={w.address} href={solscan("account", w.address)} target="_blank" rel="noopener noreferrer"
                    className="rounded-2xl border border-[#E4EBE7] bg-white p-4 hover:border-[#276A43] transition-colors">
                    <div className="text-[11px] font-black uppercase tracking-widest text-[#276A43]">{w.role}</div>
                    <div className="text-lg font-black text-[#223829] mt-1">{sol(w.sol, 3)}</div>
                    <div className="text-[12px] text-gray-500">{w.usdc != null ? `$${w.usdc.toFixed(2)} USDC` : ""}</div>
                    <div className="text-[11px] text-gray-400 font-mono mt-1">{short(w.address)} ↗</div>
                  </a>
                ))}
              </div>
            </Section>

            <Section title="Impersonation watch" hint="Pools created straight on the config, not through sow.fun. Never listed on the site; their fee share is routed to Genesis at claim.">
              {foreign.length ? (
                <div className="overflow-x-auto rounded-2xl border border-[#E4EBE7] bg-white">
                  <table className="w-full text-[12px]">
                    <thead className="bg-[#FBFCFA] text-gray-400 uppercase tracking-wider text-[10px]">
                      <tr>{["Name / ticker", "Mint", "Creator", "Lifetime fees", "Pending -> Genesis"].map((h) => <th key={h} className="text-left font-black px-3 py-2">{h}</th>)}</tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {foreign.map((p) => (
                        <tr key={p.pool}>
                          <td className="px-3 py-2">{p.name} <b>${p.symbol}</b>{p.origin === "unknown" ? " (unverified)" : ""}</td>
                          <td className="px-3 py-2 font-mono"><a href={solscan("token", p.mint ?? p.pool)} target="_blank" rel="noopener noreferrer" className="hover:underline">{p.mint ? short(p.mint) : "-"}</a></td>
                          <td className="px-3 py-2 font-mono">{p.creator ? <a href={solscan("account", p.creator)} target="_blank" rel="noopener noreferrer" className="hover:underline">{short(p.creator)}</a> : "-"}</td>
                          <td className="px-3 py-2">{sol(p.lifetimeFeesSol, 3)}</td>
                          <td className="px-3 py-2 font-bold">{sol(p.pendingSol, 3)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <div className="text-sm text-gray-400">None - every pool on the config came through sow.fun.</div>}
            </Section>

            <Section title="History" hint="Claims (with their Ops / Genesis splits) and harvests. Claim snapshots live in data/claims; harvests come from data/waves plus the sync.">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-[#E4EBE7] bg-white p-4">
                  <div className="text-sm font-black text-[#223829] mb-2">Claims</div>
                  {data.history?.claims.length ? (
                    <ul className="flex flex-col gap-2 text-[12px]">
                      {data.history.claims.map((c) => (
                        <li key={c.claimedAt} className="border-b border-gray-100 pb-2 last:border-0">
                          <b>{new Date(c.claimedAt).toLocaleString()}</b> · {sol(c.totalSol, 3)} from {c.pools} pools{c.launchFees ? ` + ${c.launchFees} launch fees` : ""}
                          {c.splits.map((s) => (
                            <div key={s.to} className="text-gray-500">→ {s.to}: {sol(s.sol, 3)} <a href={solscan("tx", s.tx)} target="_blank" rel="noopener noreferrer" className="text-[#276A43] hover:underline">tx ↗</a></div>
                          ))}
                          {c.firstTx && <a href={solscan("tx", c.firstTx)} target="_blank" rel="noopener noreferrer" className="text-[#276A43] hover:underline">first claim tx ↗</a>}
                        </li>
                      ))}
                    </ul>
                  ) : <div className="text-[12px] text-gray-400">No claims recorded yet.</div>}
                </div>
                <div className="rounded-2xl border border-[#E4EBE7] bg-white p-4">
                  <div className="text-sm font-black text-[#223829] mb-2">Harvests (public ledger)</div>
                  {data.history?.harvests.length ? (
                    <ul className="flex flex-col gap-2 text-[12px]">
                      {data.history.harvests.map((h) => (
                        <li key={h.id} className="border-b border-gray-100 pb-2 last:border-0">
                          <b>#{h.number} {h.headline}</b> · {usd(h.deployedCents)}
                          <div className="text-gray-500">{h.loans.map((l) => `${l.borrower} (${usd(l.cents)})`).join(", ")}</div>
                        </li>
                      ))}
                    </ul>
                  ) : <div className="text-[12px] text-gray-400">No harvests yet.</div>}
                </div>
              </div>
            </Section>

            <Section title="Event cards" hint="Images for our X posts, filled with live data. Only post Funded once the loan shows funded on Kiva.">
              <EventCards rows={sowCoins} />
            </Section>

            <p className="text-xs text-gray-400 mt-10 leading-relaxed">
              Full runbook: docs/OPERATIONS.md (fee routing, harvest loop, buybacks) and docs/LAUNCH.md.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
