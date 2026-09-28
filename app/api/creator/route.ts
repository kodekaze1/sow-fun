import { NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { getLaunchesByCreator, getSolPrice } from "@/lib/launchpad-onchain";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address") ?? "";
  try {
    new PublicKey(address);
  } catch {
    return NextResponse.json({ error: "invalid address" }, { status: 400 });
  }
  try {
    const [launches, solPrice] = await Promise.all([getLaunchesByCreator(address), getSolPrice()]);
    return NextResponse.json({ launches, solPrice });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "failed to load" },
      { status: 500 }
    );
  }
}
