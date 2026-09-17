import { NextResponse } from "next/server";
import { CREATOR_FEE_PCT, IMPACT_FEE_PCT, OPS_FEE_PCT, SITE_URL } from "@/lib/launchpad";

// Metaplex-shaped token metadata, generated statelessly from the launch
// parameters that were baked into the token's URI at pool creation.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name") ?? "Uplift Launch";
  const symbol = searchParams.get("symbol") ?? "UPLIFT";
  const image = searchParams.get("image") ?? `${SITE_URL}/uplift-logo.png`;
  const loan = searchParams.get("loan");
  const borrower = searchParams.get("borrower");

  const impactLine = loan
    ? `Trading fees help fund ${borrower ?? "a borrower"}'s Kiva loan (kiva.org/lend/${loan}) through the Upliftify launchpad.`
    : "Launched on the Upliftify launchpad - trading fees fund Kiva microloans.";

  return NextResponse.json(
    {
      name,
      symbol,
      description: `${impactLine} Fee split: ${CREATOR_FEE_PCT}% creator / ${IMPACT_FEE_PCT}% Kiva loans / ${OPS_FEE_PCT}% operations - locked at launch.`,
      image,
      external_url: loan ? `https://www.kiva.org/lend/${loan}` : SITE_URL,
      attributes: [
        ...(loan ? [{ trait_type: "Kiva Loan", value: loan }] : []),
        ...(borrower ? [{ trait_type: "Borrower", value: borrower }] : []),
        { trait_type: "Impact Split", value: `${CREATOR_FEE_PCT}/${IMPACT_FEE_PCT}/${OPS_FEE_PCT}` },
        { trait_type: "Launchpad", value: "Upliftify" },
      ],
    },
    { headers: { "Cache-Control": "public, max-age=3600" } }
  );
}
