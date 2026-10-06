"use client";
import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Transaction, VersionedTransaction } from "@solana/web3.js";
import WalletButton from "@/components/WalletButton";

// One-click money operation for the Command Center: the server builds the
// transactions for the connected wallet -> one approval in the wallet -> the
// server re-checks every byte, sends, confirms and records the receipt
// (lib/admin-tx.ts). Keys never leave the wallet.

const b64ToBytes = (b64: string) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
function bytesToB64(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}
const short = (a: string) => `${a.slice(0, 4)}...${a.slice(-4)}`;

interface ExecResult {
  ok: boolean;
  sent: { index: number; signature: string; ok: boolean; error?: string }[];
  recorded: boolean;
  message: string;
}

interface Built {
  plan: { versioned: boolean[] };
  mac: string;
  transactions: string[];
  summary: string[];
}

export default function WalletAction({ kind, label, config, adminKey, expectWallet, usd, onDone }: {
  kind: "claim" | "creator" | "fund";
  label: string;
  config: string;
  adminKey: string;
  expectWallet: string | null;
  usd?: number;
  onDone: () => void;
}) {
  const { publicKey, signAllTransactions } = useWallet();
  const [phase, setPhase] = useState<"idle" | "building" | "review" | "signing" | "sending" | "done">("idle");
  const [built, setBuilt] = useState<Built | null>(null);
  const [result, setResult] = useState<ExecResult | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const connected = publicKey?.toBase58() ?? null;
  const wrongWallet = !!connected && !!expectWallet && connected !== expectWallet;

  const post = async (body: unknown) => {
    const res = await fetch("/api/admin/tx", {
      method: "POST",
      headers: { "content-type": "application/json", "x-admin-key": adminKey },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "request failed");
    return json;
  };

  const build = async () => {
    setErr(null);
    setResult(null);
    setPhase("building");
    try {
      setBuilt(await post({ action: "build", kind, config, wallet: connected, usd }));
      setPhase("review");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "build failed");
      setPhase("idle");
    }
  };

  const approve = async () => {
    if (!built || !signAllTransactions) return;
    setErr(null);
    setPhase("signing");
    try {
      const txs = built.transactions.map((b, i) =>
        built.plan.versioned[i] ? VersionedTransaction.deserialize(b64ToBytes(b)) : Transaction.from(b64ToBytes(b))
      );
      const signed = await signAllTransactions(txs);
      setPhase("sending");
      const out: ExecResult = await post({
        action: "execute",
        plan: built.plan,
        mac: built.mac,
        signed: signed.map((t) => bytesToB64(t.serialize())),
      });
      setResult(out);
      setBuilt(null);
      setPhase("done");
      onDone();
    } catch (e) {
      const m = e instanceof Error ? e.message : "failed";
      setErr(/block ?height|blockhash|expired/i.test(m) ? "The approval took too long and the transactions expired - nothing was sent. Click again." : m);
      setBuilt(null);
      setPhase("idle");
    }
  };

  return (
    <div className="rounded-xl border border-[#276A43]/40 bg-[#F4FAF6] p-3">
      <div className="flex flex-wrap items-center gap-3">
        <WalletButton />
        {expectWallet && (
          <span className={`text-[12px] ${wrongWallet ? "text-red-600 font-bold" : "text-gray-500"}`}>
            {wrongWallet ? "Wrong wallet - connect " : "Needs "}
            {short(expectWallet)}
          </span>
        )}
        {connected && !wrongWallet && (phase === "idle" || phase === "done") && (
          <button onClick={build} className="rounded-full bg-[#276A43] hover:bg-[#223829] text-white font-bold px-4 py-1.5 text-[13px] transition-colors">
            {label}
          </button>
        )}
        {phase === "building" && <span className="text-[12px] text-gray-500">Building transactions...</span>}
        {phase === "signing" && <span className="text-[12px] text-gray-500">Approve in your wallet...</span>}
        {phase === "sending" && <span className="text-[12px] text-gray-500">Sending and confirming - keep this tab open...</span>}
      </div>
      {built && phase === "review" && (
        <div className="mt-3 text-[12px] text-[#223829]">
          <ul className="list-disc pl-5 flex flex-col gap-0.5 mb-2">
            {built.summary.map((l) => <li key={l}>{l}</li>)}
          </ul>
          <div className="flex gap-3">
            <button onClick={approve} className="rounded-full bg-[#223829] hover:bg-black text-white font-bold px-4 py-1.5 transition-colors">
              Approve in wallet
            </button>
            <button onClick={() => { setBuilt(null); setPhase("idle"); }} className="text-gray-500 font-bold hover:text-[#223829]">
              Cancel
            </button>
          </div>
          <p className="text-[11px] text-gray-400 mt-1.5">Approve within about a minute - after that the transactions expire unsent and you just click again.</p>
        </div>
      )}
      {err && <div className="mt-2 text-[12px] text-red-600">{err}</div>}
      {result && (
        <div className={`mt-2 text-[12px] ${result.ok ? "text-[#276A43]" : "text-[#996210]"}`}>
          <b>{result.message}</b>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
            {result.sent.map((s) => (
              <span key={s.index}>
                tx {s.index + 1}: {s.ok ? "✓" : `✗ ${s.error ?? ""}`}{" "}
                {s.signature && (
                  <a href={`https://solscan.io/tx/${s.signature}`} target="_blank" rel="noopener noreferrer" className="underline">view</a>
                )}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
