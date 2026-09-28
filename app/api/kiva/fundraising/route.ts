import { NextResponse } from "next/server";
import { searchFundraisingLoans } from "@/lib/kiva-graphql";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  try {
    const loans = await searchFundraisingLoans(
      {
        q: searchParams.get("q") ?? undefined,
        sector: searchParams.get("sector") ? parseInt(searchParams.get("sector") as string, 10) : undefined,
        region: searchParams.get("region") ?? undefined,
        women: searchParams.get("women") === "1",
        sort: searchParams.get("sort") ?? undefined,
      },
      12
    );
    return NextResponse.json({ loans });
  } catch {
    return NextResponse.json({ loans: [] }, { status: 502 });
  }
}
