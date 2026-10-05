import { COIN_VARIANTS, ILLUSTRATED_VARIANTS, cardNotFound, getCoinCardData, loadIllustratedArt, renderCard } from "@/lib/cards";

// Creator share cards: /api/card/coin/<mint>?v=1-6
//   1 Portrait (borrower photo) · 2 Ticker (big type) · 3 Impact (45% stat)
//   4 Sprout · 5 Cycle · 6 Watering - illustrated, in the style of the brand videos
export async function GET(request: Request, { params }: { params: Promise<{ mint: string }> }) {
  const { mint } = await params;
  const v = Number(new URL(request.url).searchParams.get("v") ?? "1");
  const d = await getCoinCardData(mint);
  if (!d) return cardNotFound();
  if (v === 4 || v === 5 || v === 6) {
    const Template = ILLUSTRATED_VARIANTS[v];
    return renderCard(<Template d={d} art={await loadIllustratedArt()} />);
  }
  const Template = COIN_VARIANTS[(v === 2 || v === 3 ? v : 1) as 1 | 2 | 3];
  return renderCard(<Template d={d} />);
}
