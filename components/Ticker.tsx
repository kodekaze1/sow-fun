"use client";
import { KivaLoan, COUNTRY_FLAGS } from "@/lib/types";

export default function Ticker({ loans }: { loans: KivaLoan[] }) {
  const items = loans.length > 0 ? loans : [];

  return (
    <div className="bg-[#16261c] overflow-hidden py-[7px] flex items-center">
      <div className="bg-[#F8CD69] text-[#223829] text-[11px] font-extrabold px-3 py-[2px] whitespace-nowrap flex-shrink-0 uppercase tracking-widest mr-4 rounded-r-full">
        Live on Kiva
      </div>
      <div className="overflow-hidden flex-1">
        <div className="animate-ticker inline-flex items-center whitespace-nowrap">
          {[...items, ...items].map((loan, i) => (
            <span key={i} className="inline-flex items-center gap-[6px] mr-10 text-[13px]">
              <span>{COUNTRY_FLAGS[loan.location.country] ?? ""}</span>
              <span className="text-white font-semibold">{loan.name}</span>
              <span className="text-white/30">·</span>
              <span className="text-[#A9CDB8] font-medium">{loan.location.country}</span>
              <span className="text-white/30">·</span>
              <span className="text-[#EDF4F1]/70 font-medium">{loan.activity}</span>
              <span className="text-white/30">·</span>
              <span className="text-[#F8CD69] font-extrabold">${loan.loan_amount}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
