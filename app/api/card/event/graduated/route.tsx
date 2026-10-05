import { GraduatedCard, cardNotFound, getCoinCardData, renderCard } from "@/lib/cards";

// "$TICKER graduated" - /api/card/event/graduated?mint=<mint>
export async function GET(request: Request) {
  const d = await getCoinCardData(new URL(request.url).searchParams.get("mint") ?? "");
  if (!d) return cardNotFound();
  return renderCard(<GraduatedCard d={d} />);
}
