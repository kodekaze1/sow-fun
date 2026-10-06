import { NextResponse } from "next/server";
import { publicImageUrl } from "@/lib/coin-meta";
import { CREATOR_FEE_PCT, IMPACT_FEE_PCT, OPS_FEE_PCT, SITE_URL } from "@/lib/launchpad";

// Metaplex-shaped token metadata, generated statelessly from the launch
// parameters that were baked into the token's URI at pool creation.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name") ?? "sow.fun Launch";
  const symbol = searchParams.get("symbol") ?? "SOW";
  // Uploaded images are stored as short blob keys to fit Metaplex's
  // 200-byte URI cap; expand them to the public blob URL here.
  let image = searchParams.get("image") ?? `${SITE_URL}/sow-logo.png`;
  if (image) image = publicImageUrl(image);
  const loan = searchParams.get("loan");
  const borrower = searchParams.get("borrower");

  const impactLine = loan
    ? `Trading fees help fund ${borrower ?? "a borrower"}'s Kiva loan (kiva.org/lend/${loan}) through the sow.fun launchpad.`
    : "Launched on the sow.fun launchpad - trading fees fund Kiva microloans.";

  return NextResponse.json(
    {
      name,
      symbol,
      description: impactLine,
      image,
      external_url: loan ? `https://www.kiva.org/lend/${loan}` : SITE_URL,
      attributes: [
        ...(loan ? [{ trait_type: "Kiva Loan", value: loan }] : []),
        ...(borrower ? [{ trait_type: "Borrower", value: borrower }] : []),
        { trait_type: "Impact Split", value: `${CREATOR_FEE_PCT}/${IMPACT_FEE_PCT}/${OPS_FEE_PCT}` },
        { trait_type: "Launchpad", value: "sow.fun" },
      ],
    },
    { headers: { "Cache-Control": "public, max-age=3600" } }
  );
}
