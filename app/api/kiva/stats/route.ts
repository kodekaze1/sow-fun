import { NextResponse } from "next/server";
import { getEmptyKivaImpactStats, getKivaImpactStats } from "@/lib/kiva-stats";

export async function GET() {
  try {
    return NextResponse.json(await getKivaImpactStats());
  } catch (error) {
    console.error("Error fetching Kiva stats:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch Kiva stats",
        ...getEmptyKivaImpactStats(),
      },
      { status: 502 }
    );
  }
}
