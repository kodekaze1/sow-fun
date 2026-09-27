"use client";
import { KivaLoan, COUNTRY_FLAGS, SECTOR_COLORS, getAvatarFallback } from "@/lib/types";
import Icon from "@/components/icons";

const STATUS_STYLES: Record<string, string> = {
  funded:   "bg-[#EDF4F1] text-[#276A43]",
  repaying: "bg-[#F8F2E6] text-[#996210]",
  fundraising: "bg-[#EDF4F1] text-[#276A43]",
};

export default function LoanFeed({ loans }: { loans: KivaLoan[] }) {
  if (loans.length === 0) {
    return (
      <div className="px-5 py-10 text-center text-gray-400 text-sm">
        <div className="w-11 h-11 mx-auto mb-3 rounded-full bg-[#EDF4F1] flex items-center justify-center text-[#223829]">
          <Icon name="hourglass" className="w-5 h-5" />
        </div>
        sow.fun-funded loans will appear here after they sync from Kiva.
      </div>
    );
  }

  return (
    <div className="max-h-[420px] overflow-y-auto divide-y divide-gray-50">
      {loans.map((loan) => {
        const flag = COUNTRY_FLAGS[loan.location.country] ?? "";
        const color = SECTOR_COLORS[loan.sector] ?? SECTOR_COLORS.default;
        const photo = loan.image_url ?? getAvatarFallback(loan.name, color);

        const pct = loan.loan_amount > 0 ? Math.round((loan.funded_amount / loan.loan_amount) * 100) : 0;
        const description = loan.description?.texts?.en ?? `This loan will help ${loan.name} ${loan.use}`;
        const status = pct >= 100 ? "funded" : pct > 50 ? "repaying" : "fundraising";
        const statusLabel = pct >= 100 ? "Funded" : `${pct}% funded`;

        return (
          <div
            key={loan.id}
            className="flex items-start gap-3.5 px-5 py-4 hover:bg-[#F8F2E6]/60 transition-colors cursor-pointer"
          >
            <img
              src={photo}
              alt={loan.name}
              className="w-14 h-14 rounded-xl object-cover flex-shrink-0 shadow-sm"
              onError={(e) => {
                (e.target as HTMLImageElement).src = getAvatarFallback(loan.name, color);
              }}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[15px] font-bold text-[#223829]">{loan.name}</span>
                <span>{flag}</span>
              </div>
              <div className="text-xs text-gray-500 mt-0.5">
                {loan.location.town ? `${loan.location.town}, ` : ""}{loan.location.country}
              </div>
              <p className="text-[13px] text-gray-600 mt-1.5 leading-relaxed italic border-l-2 border-[#D9E6DF] pl-2 line-clamp-2">
                &quot;{description}&quot;
              </p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                <span
                  className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: color + "1c", color }}
                >
                  {loan.activity}
                </span>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${STATUS_STYLES[status]}`}>
                  {statusLabel}
                </span>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-base font-extrabold text-[#223829]">${loan.loan_amount}</div>
              <div className="text-[11px] text-gray-400 mt-0.5">
                Active Round
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
