import { HarvestCard, cardNotFound, renderCard } from "@/lib/cards";
import { getAllWaves, getWaveById } from "@/lib/waves";

// Harvest receipt - /api/card/event/harvest[?wave=wave-001] (default: latest published)
export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("wave");
  const wave = id
    ? await getWaveById(id)
    : (await getAllWaves()).find((w) => w.status !== "draft") ?? null;
  if (!wave || wave.status === "draft") return cardNotFound("unknown harvest");
  const loans = wave.loans.map((l) => ({ borrower: l.borrower, location: l.location, cents: l.uplift_cents }));
  return renderCard(
    <HarvestCard
      h={{
        number: wave.wave_number,
        date: wave.timestamps.started,
        totalCents: wave.totals?.uplift_deployed_cents ?? loans.reduce((s, l) => s + l.cents, 0),
        loans,
      }}
    />
  );
}
