import Icon from "@/components/icons";
import leaderboard from "@/data/leaderboard.json";
import { KIVA_TEAM_URL } from "@/lib/constants";

// Kiva team leaderboard progress. Kiva's public API only exposes all-time
// team totals, so our number is all-time and the leaderboard reference
// points (data/leaderboard.json) are labelled as this month's, as of a date.
export default function TeamRank({
  memberCount,
  loanCount,
  loanedAmount,
  tone = "dark",
}: {
  memberCount: number;
  loanCount: number;
  loanedAmount: number;
  tone?: "dark" | "light";
}) {
  const refs = [...leaderboard.monthly].sort((a, b) => b.rank - a.rank); // #10 first, then #1
  const top = Math.max(...leaderboard.monthly.map((r) => r.amount), loanedAmount, 1);
  const asOf = new Date(`${leaderboard.as_of}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
  const dark = tone === "dark";
  const muted = dark ? "text-[#EDF4F1]/60" : "text-gray-500";
  const track = dark ? "bg-white/10" : "bg-gray-100";

  return (
    <div className={dark ? "bg-[#223829] rounded-2xl text-[#EDF4F1] p-6" : "bg-white rounded-2xl border border-[#E4EBE7] shadow-[0_4px_15px_rgba(0,0,0,0.05)] p-6"}>
      <div className={`text-xs font-black uppercase tracking-widest mb-2 ${dark ? "text-[#7FC79E]" : "text-[#276A43]"}`}>Kiva team leaderboard</div>
      <h2 className={`font-serif text-xl font-semibold mb-1 ${dark ? "" : "text-[#223829]"}`}>The goal: top lending team on Kiva</h2>
      <p className={`text-sm leading-relaxed mb-4 ${muted}`}>
        Every loan the treasury or a team member makes under the sow.fun banner counts.
      </p>

      <div className="flex flex-col gap-3 mb-5 text-sm">
        <div>
          <div className="flex justify-between mb-1">
            <span className="font-bold">sow.fun team <span className={`font-normal ${muted}`}>(all-time)</span></span>
            <span className="font-black">${loanedAmount.toLocaleString()}</span>
          </div>
          <div className={`h-2 rounded-full overflow-hidden ${track}`}>
            <div className="h-full rounded-full bg-[#2AA967]" style={{ width: `${Math.max(1.5, (loanedAmount / top) * 100)}%` }} />
          </div>
        </div>
        {refs.map((r) => (
          <div key={r.rank}>
            <div className="flex justify-between mb-1">
              <span className={muted}>#{r.rank} team this month</span>
              <span className={`font-bold ${muted}`}>${r.amount.toLocaleString()}</span>
            </div>
            <div className={`h-2 rounded-full overflow-hidden ${track}`}>
              <div className={`h-full rounded-full ${dark ? "bg-[#F8CD69]/70" : "bg-[#F8CD69]"}`} style={{ width: `${(r.amount / top) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>

      <div className={`flex items-center gap-5 text-sm mb-5 ${dark ? "" : "text-[#223829]"}`}>
        <div><span className="font-black">{memberCount}</span> <span className={muted}>member{memberCount === 1 ? "" : "s"}</span></div>
        <div><span className="font-black">{loanCount}</span> <span className={muted}>team loans</span></div>
      </div>

      <a href={KIVA_TEAM_URL} target="_blank" rel="noopener noreferrer"
        className={`inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-bold transition-colors ${
          dark ? "bg-[#EDF4F1] text-[#223829] hover:bg-white" : "bg-[#276A43] text-white hover:bg-[#223829]"
        }`}>
        Join the team on Kiva
        <Icon name="arrow" className="w-4 h-4" />
      </a>
      <p className={`text-[11px] mt-3 ${muted}`}>Leaderboard figures from kiva.org/teams as of {asOf}.</p>
    </div>
  );
}
