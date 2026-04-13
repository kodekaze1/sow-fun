import {
  KIVA_LENDER_ID,
  KIVA_LENDER_URL,
  KIVA_TEAM_ID,
  KIVA_TEAM_SHORTNAME,
  KIVA_TEAM_URL,
} from "@/lib/constants";
import { getAllWaves } from "@/lib/waves";

const KIVA_API_BASE = "https://api.kivaws.org/v1";

type KivaLender = {
  lender_id: string;
  name: string;
  loan_count?: number;
  invitee_count?: number;
  member_since?: string;
};

type KivaLoan = {
  id: number;
  name: string;
  status: string;
  funded_amount?: number;
  loan_amount?: number;
  sector?: string;
  activity?: string;
  use?: string;
  location?: {
    country?: string;
    country_code?: string;
    town?: string;
  };
};

type KivaTeam = {
  id: number;
  shortname: string;
  name: string;
  category?: string;
  loan_count?: number;
  member_count?: number;
};

async function fetchKiva<T>(path: string): Promise<T> {
  const res = await fetch(`${KIVA_API_BASE}${path}`, {
    headers: { Accept: "application/json" },
    next: { revalidate: 3600 },
  });

  if (!res.ok) {
    throw new Error(`Kiva REST API failed: ${path}`);
  }

  return res.json() as Promise<T>;
}

export async function getKivaImpactStats() {
  const [lenderData, lenderLoansData, teamData, teamLendersData, teamLoansData, waves] =
    await Promise.all([
      fetchKiva<{ lenders: KivaLender[] }>(`/lenders/${KIVA_LENDER_ID}.json`),
      fetchKiva<{ loans: KivaLoan[]; paging: { total: number } }>(`/lenders/${KIVA_LENDER_ID}/loans.json`),
      fetchKiva<{ teams: KivaTeam[] }>(`/teams/${KIVA_TEAM_ID}.json`),
      fetchKiva<{ lenders: KivaLender[]; paging: { total: number } }>(`/teams/${KIVA_TEAM_ID}/lenders.json`),
      fetchKiva<{ loans: KivaLoan[]; paging: { total: number } }>(`/teams/${KIVA_TEAM_ID}/loans.json`),
      getAllWaves(),
    ]);

  const lender = lenderData.lenders[0] ?? null;
  const team = teamData.teams[0] ?? null;
  const lenderLoans = lenderLoansData.loans ?? [];
  const countries = new Set(lenderLoans.map((loan) => loan.location?.country).filter(Boolean));
  const sectors = new Set(lenderLoans.map((loan) => loan.sector).filter(Boolean));
  const productionWaves = waves.filter((wave) => wave.status !== "draft");
  const verifiedWaves = waves.filter((wave) =>
    wave.loans.some((loan) => loan.verification?.verified)
  );
  const upliftDeployedCents = verifiedWaves.reduce(
    (sum, wave) => sum + wave.totals.uplift_deployed_cents,
    0
  );

  // Kiva exposes the full Kiva loan size, not UPLIFT's contribution amount.
  // UPLIFT-deployed dollars therefore come from the audit-first Wave records.
  return {
    lender: {
      id: lender?.lender_id ?? KIVA_LENDER_ID,
      name: lender?.name ?? "Upliftify",
      url: KIVA_LENDER_URL,
      memberSince: lender?.member_since ?? null,
      lenderStats: {
        loanCount: lender?.loan_count ?? lenderLoansData.paging?.total ?? lenderLoans.length,
        loanedAmount: upliftDeployedCents / 100,
        numCountries: countries.size,
        numSectors: sectors.size,
      },
      loans: lenderLoans,
    },
    team: {
      id: team?.id ?? KIVA_TEAM_ID,
      shortname: team?.shortname ?? KIVA_TEAM_SHORTNAME,
      name: team?.name ?? "Upliftify",
      url: KIVA_TEAM_URL,
      memberCount: teamLendersData.paging?.total ?? teamLendersData.lenders?.length ?? 0,
      loanCount: team?.loan_count ?? teamLoansData.paging?.total ?? teamLoansData.loans?.length ?? 0,
      loans: teamLoansData.loans ?? [],
    },
    canonical: {
      source: "uplift_wave_records",
      waveCount: productionWaves.length,
      verifiedWaveCount: verifiedWaves.length,
      upliftDeployedCents,
    },
    source: {
      kivaApi: KIVA_API_BASE,
      generatedAt: new Date().toISOString(),
    },
  };
}

export function getEmptyKivaImpactStats() {
  return {
    lender: {
      id: KIVA_LENDER_ID,
      name: "Upliftify",
      url: KIVA_LENDER_URL,
      lenderStats: {
        loanCount: 0,
        loanedAmount: 0,
        numCountries: 0,
        numSectors: 0,
      },
      loans: [],
    },
    team: {
      id: KIVA_TEAM_ID,
      shortname: KIVA_TEAM_SHORTNAME,
      name: "Upliftify",
      url: KIVA_TEAM_URL,
      memberCount: 0,
      loanCount: 0,
      loans: [],
    },
  };
}
