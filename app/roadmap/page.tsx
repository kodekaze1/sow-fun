import Link from "next/link";
import Icon from "@/components/icons";

const PHASES = [
  {
    phase: "Phase 1",
    title: "Foundation",
    status: "completed",
    date: "Q1 2026",
    color: "#276A43",
    items: [
      { done: true, text: "Concept & launchpad economics (45/45/10, locked at launch)" },
      { done: true, text: "Kiva integration: live borrower picker with filters" },
      { done: true, text: "Public impact dashboard (map, ledger, treasury)" },
      { done: true, text: "Genesis harvest: first two borrowers funded on Kiva" },
      { done: true, text: "Launch flow, token pages & creator dashboard" },
      { done: true, text: "Website live at sow.fun" },
    ],
  },
  {
    phase: "Phase 2",
    title: "Launch",
    status: "active",
    date: "Q2 2026",
    color: "#996210",
    items: [
      { done: false, text: "$SOW genesis launch on its own Meteora bonding curve" },
      { done: false, text: "Launchpad opens: anyone can sow a coin for a borrower" },
      { done: false, text: "First community harvest with full receipt chain" },
      { done: false, text: "Liquidity permanently locked at every graduation" },
      { done: false, text: "X bot live: auto-posts each funded loan" },
      { done: false, text: "First 100 borrowers funded" },
    ],
  },
  {
    phase: "Phase 3",
    title: "Growth",
    status: "upcoming",
    date: "Q3 2026",
    color: "#5C6B62",
    items: [
      { done: false, text: "1,000 loans funded milestone" },
      { done: false, text: "Recycling mechanic live (repayments → new loans)" },
      { done: false, text: "Creator rewards paid in $SOW per life lifted" },
      { done: false, text: "Borrower adoption flow at scale (excess 80/10/10)" },
      { done: false, text: "Borrower spotlight series on X" },
      { done: false, text: "CEX listing pursuit for $SOW" },
    ],
  },
  {
    phase: "Phase 4",
    title: "Scale",
    status: "upcoming",
    date: "Q4 2026",
    color: "#5C6B62",
    items: [
      { done: false, text: "10,000 borrowers funded lifetime" },
      { done: false, text: "$1M total capital deployed" },
      { done: false, text: "Automated harvest pipeline (exchange API off-ramp)" },
      { done: false, text: "Annual impact report (on-chain + public)" },
      { done: false, text: "Partnerships with additional impact platforms" },
      { done: false, text: "Mobile app for impact tracking" },
    ],
  },
];

const STATUS_LABELS: Record<string, { label: string; bg: string; text: string }> = {
  completed: { label: "Completed", bg: "#EDF4F1", text: "#276A43" },
  active:    { label: "In Progress", bg: "#F8F2E6", text: "#996210" },
  upcoming:  { label: "Upcoming", bg: "#EFF3F0", text: "#5C6B62" },
};

export default function RoadmapPage() {
  return (
    <div className="min-h-screen bg-white">

      {/* HERO */}
      <div className="relative overflow-hidden bg-[#223829] text-white py-20 px-6 text-center">
        <img src="/images/hands-seedling.jpg" alt="" aria-hidden="true" className="absolute inset-0 w-full h-full object-cover opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#16261c]/85 to-[#16261c]/55" />
        <div className="relative max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-widest mb-6">
            Where We&apos;re Going
          </div>
          <h1 className="text-5xl font-extrabold mb-4"
            style={{ fontFamily: "var(--font-serif)" }}>
            Roadmap
          </h1>
          <p className="text-lg opacity-80 leading-relaxed">
            From concept to $1M in capital deployed - here&apos;s the plan.
          </p>
        </div>
      </div>

      <div className="max-w-[900px] mx-auto px-6 py-16">

        {/* PHASES */}
        <div className="relative">
          <div className="absolute left-[39px] top-8 bottom-8 w-0.5 bg-gradient-to-b from-[#276A43] via-[#f59e0b] to-[#8b5cf6] opacity-30" />

          <div className="flex flex-col gap-8">
            {PHASES.map((phase) => {
              const statusStyle = STATUS_LABELS[phase.status];
              const doneCount = phase.items.filter(i => i.done).length;
              return (
                <div key={phase.phase} className="flex gap-6 items-start">
                  {/* Circle */}
                  <div className="w-20 h-20 rounded-full flex flex-col items-center justify-center flex-shrink-0 relative z-10 shadow-lg"
                    style={{ background: `${phase.color}18`, border: `2px solid ${phase.color}44` }}>
                    <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: phase.color }}>{phase.phase}</span>
                    <span className="text-xs font-bold text-gray-500 mt-0.5">{phase.date}</span>
                  </div>

                  <div className="bg-white rounded-2xl border border-[#E4EBE7] shadow-[0_4px_15px_rgba(0,0,0,0.05)] transition-shadow duration-300 hover:shadow-[0_10px_28px_rgba(34,56,41,0.10)] p-6 flex-1">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xl font-extrabold text-gray-900">{phase.title}</h2>
                      <span className="text-[11px] font-bold px-3 py-1 rounded-full"
                        style={{ background: statusStyle.bg, color: statusStyle.text }}>
                        {statusStyle.label}
                      </span>
                    </div>

                    {/* Progress bar */}
                    {phase.status !== "upcoming" && (
                      <div className="mb-4">
                        <div className="flex justify-between text-xs text-gray-400 mb-1">
                          <span>{doneCount}/{phase.items.length} complete</span>
                          <span>{Math.round((doneCount / phase.items.length) * 100)}%</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all"
                            style={{ width: `${(doneCount / phase.items.length) * 100}%`, background: phase.color }} />
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col gap-2">
                      {phase.items.map((item, i) => (
                        <div key={i} className="flex items-center gap-3 text-sm">
                          <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                            style={{ background: item.done ? `${phase.color}20` : "#f3f4f6" }}>
                            {item.done
                              ? <span style={{ color: phase.color }} className="text-xs font-black">✓</span>
                              : <span className="w-2 h-2 rounded-full bg-gray-300 inline-block" />
                            }
                          </div>
                          <span className={item.done ? "text-gray-700 font-medium" : "text-gray-400"}>{item.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* NORTH STAR */}
        <div className="mt-12 bg-[#223829] rounded-2xl p-8 text-white text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-white/10 flex items-center justify-center text-[#F8CD69]">
            <Icon name="sparkle" className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-extrabold mb-2" style={{ fontFamily: "var(--font-serif)" }}>
            The North Star
          </h2>
          <p className="opacity-80 leading-relaxed max-w-xl mx-auto">
            A self-sustaining impact engine where every dollar traded funds a life, every loan repaid funds another,
            and the treasury grows with every new holder. Proof that crypto and humanity aren&apos;t opposites.
          </p>
          <div className="flex flex-wrap justify-center gap-6 mt-6 text-sm">
            {[
              { value: "10,000+", label: "Borrowers Funded" },
              { value: "$1M+", label: "Capital Deployed" },
              { value: "50+", label: "Countries Reached" },
            ].map(({ value, label }) => (
              <div key={label}>
                <div className="text-2xl font-black text-[#F8CD69]">{value}</div>
                <div className="opacity-60 text-xs uppercase tracking-wider">{label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center mt-10">
          <Link href="/" className="inline-flex items-center gap-2 bg-[#276A43] hover:bg-[#223829] text-white rounded-full px-8 py-3.5 text-sm font-bold transition-all shadow-lg">
            ← Back to Dashboard
          </Link>
        </div>
      </div>

    </div>
  );
}
