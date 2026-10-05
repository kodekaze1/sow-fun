import { COIN_VARIANTS, cardNotFound, getCoinCardData, renderCard } from "@/lib/cards";

// Creator share cards: /api/card/coin/<mint>?v=1|2|3
//   1 Portrait (borrower photo) · 2 Ticker (big type) · 3 Impact (45% stat)
export async function GET(request: Request, { params }: { params: Promise<{ mint: string }> }) {
  const { mint } = await params;
  const v = Number(new URL(request.url).searchParams.get("v") ?? "1");
  const Template = COIN_VARIANTS[(v === 2 || v === 3 ? v : 1) as 1 | 2 | 3];
  const d = await getCoinCardData(mint);
  if (!d) return cardNotFound();
  return renderCard(<Template d={d} />);
}
