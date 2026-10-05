import { CoinPortrait, getCoinCardData, renderCard } from "@/lib/cards";

// Every sow.fun/t/<mint> link unfurls with the coin's own card (template v1)
export const size = { width: 1200, height: 675 };
export const contentType = "image/png";
export const alt = "A coin launched on sow.fun, pledged to a real Kiva borrower";

export default async function Image({ params }: { params: Promise<{ mint: string }> }) {
  const { mint } = await params;
  const d = mint === "demo" ? null : await getCoinCardData(mint);
  if (!d) {
    // Unknown coin or the demo page: fall back to the site card
    const { default: SiteImage } = await import("@/app/opengraph-image");
    return SiteImage();
  }
  return renderCard(<CoinPortrait d={d} />, { ...size });
}
