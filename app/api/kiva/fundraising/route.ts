import { NextResponse } from "next/server";
import { searchFundraisingLoans } from "@/lib/kiva-graphql";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? undefined;
  try {
    const loans = await searchFundraisingLoans(q, 12);
    return NextResponse.json({ loans });
  } catch {
    return NextResponse.json({ loans: [] }, { status: 502 });
  }
}
