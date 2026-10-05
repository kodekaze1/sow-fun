import { MilestoneCard, renderCard } from "@/lib/cards";
import { getAllWaves, summarizeLedger } from "@/lib/waves";

// Totals card - /api/card/event/milestone[?lives=&lent=&countries=&rank=]
// Defaults come from the published harvest ledger; query params override
// (e.g. rank=#7 from the Kiva teams leaderboard, which has no public API).
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams;
  const ledger = summarizeLedger(await getAllWaves());
  const num = (k: string, fallback: number) => {
    const v = Number(q.get(k));
    return Number.isFinite(v) && q.get(k) !== null && v >= 0 ? v : fallback;
  };
  const rank = q.get("rank")?.slice(0, 8) || null;
  return renderCard(
    <MilestoneCard
      lives={num("lives", ledger.loansFunded)}
      lentUsd={num("lent", ledger.deployedCents / 100)}
      countries={num("countries", ledger.countries.length)}
      rank={rank}
    />
  );
}
