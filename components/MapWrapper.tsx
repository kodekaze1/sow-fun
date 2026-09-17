"use client";
import dynamic from "next/dynamic";
import type { KivaLoan } from "@/lib/types";

const ImpactMap = dynamic(() => import("@/components/Map"), {
  ssr: false,
  loading: () => (
    <div className="h-[380px] bg-[#EDF4F1] flex items-center justify-center text-gray-500 text-sm">
      Loading map...
    </div>
  ),
});

export default function MapWrapper({ loans }: { loans: KivaLoan[] }) {
  return <ImpactMap loans={loans} />;
}
