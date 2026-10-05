import CopyButton from "@/components/CopyButton";
import Icon from "@/components/icons";
import { X_LINK } from "@/lib/constants";

// $SOW's home on the site. Hidden-until-launch: set NEXT_PUBLIC_SOW_MINT on
// Vercel at launch (and redeploy) to reveal the contract address.
const SOW_MINT = process.env.NEXT_PUBLIC_SOW_MINT ?? "";

export default function SowTokenBlock() {
  return (
    <div className="max-w-[1100px] mx-auto px-6 py-14" data-reveal>
      <div className="rounded-3xl border border-[#D9E6DF] bg-white shadow-[0_4px_15px_rgba(0,0,0,0.05)] p-6 md:p-10 grid md:grid-cols-[1.1fr_1fr] gap-8 items-center">
        <div>
          <div className="text-xs font-black uppercase tracking-widest text-[#276A43] mb-2.5">$SOW</div>
          <h2 className="font-serif text-3xl md:text-4xl font-medium tracking-tight text-[#223829] mb-3">
            The launchpad&apos;s own seed.
          </h2>
          <p className="text-gray-500 text-sm leading-relaxed max-w-md">
            $SOW launches through the same locked pool config as every coin here: its trading fees fund Kiva loans, and
            20% of every coin&apos;s extra fees buys $SOW back - half burned, half paid to creators.
          </p>
        </div>

        {SOW_MINT ? (
          <div className="flex flex-col gap-4">
            <div className="rounded-2xl bg-[#EDF4F1] p-3 flex items-center gap-3">
              <code className="font-mono text-[12px] text-[#223829] break-all flex-1">{SOW_MINT}</code>
              <CopyButton text={SOW_MINT} label="Copy CA" />
            </div>
            <ol className="flex flex-col gap-2 text-sm text-[#223829]">
              <li className="flex gap-3"><span className="font-mono text-xs text-[#276A43] mt-0.5">1</span>Get a Solana wallet (Phantom, Solflare or Backpack) and fund it with SOL.</li>
              <li className="flex gap-3"><span className="font-mono text-xs text-[#276A43] mt-0.5">2</span>Open Jupiter and paste the contract address above. It ends in <b>sow</b>.</li>
              <li className="flex gap-3"><span className="font-mono text-xs text-[#276A43] mt-0.5">3</span>Swap SOL for $SOW. Every trade funds real loans.</li>
            </ol>
            <div className="flex flex-wrap gap-3">
              <a href={`https://jup.ag/swap/SOL-${SOW_MINT}`} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-[#276A43] hover:bg-[#223829] text-white rounded-full px-6 py-2.5 text-sm font-bold transition-colors">
                Buy on Jupiter <Icon name="arrow" className="w-4 h-4" />
              </a>
              <a href={`/t/${SOW_MINT}`}
                className="inline-flex items-center gap-2 border border-[#D9E6DF] hover:border-[#276A43] rounded-full px-6 py-2.5 text-sm font-bold transition-colors">
                $SOW impact page
              </a>
            </div>
            <p className="text-[11px] text-gray-400">Memecoins are volatile and can go to zero. Not investment advice.</p>
          </div>
        ) : (
          <div className="rounded-2xl bg-[#223829] text-[#EDF4F1] p-6 text-center">
            <div className="text-xs font-black uppercase tracking-widest text-[#7FC79E] mb-2">Launching soon</div>
            <div className="font-serif text-2xl mb-2">The contract address ends in <span className="italic text-[#F8CD69]">sow</span>.</div>
            <p className="text-sm opacity-75 mb-5">It will appear here and on X at launch. Anything else is not us.</p>
            <a href={X_LINK} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-[#EDF4F1] text-[#223829] hover:bg-white rounded-full px-5 py-2 text-sm font-bold transition-colors">
              Follow @sowfunhq <Icon name="arrow" className="w-4 h-4" />
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
