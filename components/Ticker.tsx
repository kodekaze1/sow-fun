"use client";
import { KivaLoan, COUNTRY_FLAGS, SECTOR_TAGS } from "@/lib/types";

export default function Ticker({ loans }: { loans: KivaLoan[] }) {
  const items = loans.length > 0 ? loans : [];

  return (
    <div className="bg-[#1a6e43] overflow-hidden py-[7px] flex items-center">
      <div className="bg-amber-400 text-black text-[11px] font-extrabold px-3 py-[2px] whitespace-nowrap flex-shrink-0 uppercase tracking-widest mr-4">
        ✅ Just Funded
      </div>
      <div className="overflow-hidden flex-1">
        <div className="animate-ticker inline-flex items-center whitespace-nowrap">
          {[...items, ...items].map((loan, i) => (
            <span key={i} className="inline-flex items-center gap-[5px] mr-10 text-[13px]">
              <span>{COUNTRY_FLAGS[loan.location.country] ?? "🌍"}</span>
              <span className="text-white font-semibold">{loan.name}</span>
              <span className="text-white/30">·</span>
              <span className="text-green-300 font-medium">{loan.location.country}</span>
              <span className="text-white/30">·</span>
              <span className="text-yellow-300 font-medium">{SECTOR_TAGS[loan.sector] ?? "💼"} {loan.activity}</span>
              <span className="text-white/30">·</span>
              <span className="text-emerald-300 font-extrabold">${loan.loan_amount}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
