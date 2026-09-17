"use client";
import { KivaLoan, COUNTRY_FLAGS, SECTOR_TAGS, SECTOR_COLORS, getPortrait } from "@/lib/types";

const STATUS_STYLES: Record<string, string> = {
  funded:   "bg-green-100 text-green-800",
  repaying: "bg-blue-100 text-blue-800",
  recycled: "bg-yellow-100 text-yellow-800",
  fundraising: "bg-[#EDF4F1] text-[#276A43]",
};

export default function LoanFeed({ loans }: { loans: KivaLoan[] }) {
  if (loans.length === 0) {
    return (
      <div className="px-5 py-10 text-center text-gray-400 text-sm">
        <div className="text-3xl mb-2">⏳</div>
        Upliftify-funded loans will appear here after they sync from Kiva.
      </div>
    );
  }

  return (
    <div className="max-h-[420px] overflow-y-auto divide-y divide-gray-50">
      {loans.map((loan, i) => {
        const flag = COUNTRY_FLAGS[loan.location.country] ?? "🌍";
        const icon = SECTOR_TAGS[loan.sector] ?? "💼";
        const color = SECTOR_COLORS[loan.sector] ?? SECTOR_COLORS.default;
        
        // Use real Kiva image if possible
        const kivaPhoto = loan.image?.id ? `https://www-kiva-org.car-photos.static.kiva.org/i/s300/${loan.image.id}.jpg` : null;
        const photo = kivaPhoto || getPortrait(loan.id);
        
        const pct = loan.loan_amount > 0 ? Math.round((loan.funded_amount / loan.loan_amount) * 100) : 0;
        const description = loan.description?.texts?.en ?? `This loan will help ${loan.name} ${loan.use}.`;
        const status = pct >= 100 ? "funded" : pct > 50 ? "repaying" : "fundraising";
        const statusLabel = pct >= 100 ? "✅ Funded" : `${pct}% funded`;

        return (
          <div
            key={loan.id}
            className="flex items-start gap-3 px-5 py-4 hover:bg-[#F8F2E6] transition-colors cursor-pointer"
          >
            <img
              src={photo}
              alt={loan.name}
              className="w-12 h-12 rounded-full object-cover flex-shrink-0 border-2 shadow-sm"
              style={{ borderColor: color + "80" }}
              onError={(e) => {
                (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(loan.name)}&background=${color.replace("#", "")}&color=fff&size=48`;
              }}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[15px] font-bold text-gray-900">{loan.name}</span>
                <span>{flag}</span>
              </div>
              <div className="text-xs text-gray-500 mt-0.5">
                📍 {loan.location.town ? `${loan.location.town}, ` : ""}{loan.location.country}
              </div>
              <p className="text-[13px] text-gray-600 mt-1.5 leading-relaxed italic border-l-2 border-[#D9E6DF] pl-2 line-clamp-2">
                "{description}"
              </p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                <span
                  className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: color + "20", color }}
                >
                  {icon} {loan.activity}
                </span>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${STATUS_STYLES[status]}`}>
                  {statusLabel}
                </span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">
                  Monitoring
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
