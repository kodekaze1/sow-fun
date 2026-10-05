import { FundedCard, cardNotFound, getCoinCardData, renderCard } from "@/lib/cards";
import { getAllWaves } from "@/lib/waves";

// "{borrower} is fully funded" - /api/card/event/funded?mint=<mint>[&lent=<usd>]
// Amount lent defaults to what this coin's money has put into Kiva loans
// (wave records tagged with the coin's mint).
export async function GET(request: Request) {
  const url = new URL(request.url);
  const d = await getCoinCardData(url.searchParams.get("mint") ?? "");
  if (!d) return cardNotFound();
  let lentUsd: number | null = Number(url.searchParams.get("lent")) || null;
  if (lentUsd === null) {
    const waves = await getAllWaves();
    const cents = waves
      .filter((w) => w.status !== "draft")
      .flatMap((w) => w.loans)
      .filter((l) => l.mint === d.mint)
      .reduce((s, l) => s + l.uplift_cents, 0);
    lentUsd = cents > 0 ? cents / 100 : null;
  }
  return renderCard(<FundedCard d={d} lentUsd={lentUsd} />);
}
