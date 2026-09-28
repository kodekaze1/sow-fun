import { KIVA_FETCH_HEADERS, KIVA_LENDER_ID } from "@/lib/constants";
import type { FundraisingLoan, LoanSearchParams } from "@/lib/launchpad";

const GRAPHQL_URL = "https://api.kivaws.org/graphql";

// Kiva's GraphQL endpoint is public/no-auth but WAF-gated on User-Agent,
// and GET queries are capped at 2500 chars - always POST.
export async function kivaGQL<T>(query: string, revalidate = 3600): Promise<T> {
  const res = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers: { ...KIVA_FETCH_HEADERS, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
    next: { revalidate },
  });
  if (!res.ok) throw new Error(`Kiva GraphQL failed: ${res.status}`);
  const json = await res.json();
  if (json.errors?.length) throw new Error(`Kiva GraphQL error: ${json.errors[0].message}`);
  return json.data as T;
}

type LenderLoansData = {
  community: {
    lender: {
      loans: {
        values: { id: number; image?: { url?: string } | null }[];
      };
    } | null;
  };
};

type FundraisingSearchData = {
  lend: {
    loans: {
      totalCount: number;
      values: {
        id: number;
        name: string;
        loanAmount: string;
        use?: string | null;
        image?: { url?: string } | null;
        activity?: { name?: string } | null;
        sector?: { name?: string } | null;
        geocode?: { country?: { name?: string } } | null;
        borrowerCount?: number | null;
        loanFundraisingInfo?: { fundedAmount?: string } | null;
      }[];
    };
  };
};

// Region -> ISO country codes, resolved live from Kiva's country facets (cached 1h)
let regionMapCache: { at: number; map: Record<string, string[]> } | null = null;
async function getRegionCountryMap(): Promise<Record<string, string[]>> {
  if (regionMapCache && Date.now() - regionMapCache.at < 3600_000) return regionMapCache.map;
  const data = await kivaGQL<{ lend: { countryFacets: { country: { isoCode: string; region: string } }[] } }>(
    `{lend{countryFacets{country{isoCode region}}}}`,
    3600
  );
  const map: Record<string, string[]> = {};
  for (const f of data.lend.countryFacets) {
    if (!f.country.region || !f.country.isoCode) continue;
    (map[f.country.region] ??= []).push(f.country.isoCode);
  }
  regionMapCache = { at: Date.now(), map };
  return map;
}

// Live fundraising borrowers for the launchpad picker, with Kiva-style filters.
export async function searchFundraisingLoans(params: LoanSearchParams = {}, limit = 12): Promise<FundraisingLoan[]> {
  const filters: string[] = ["status:fundraising"];
  if (params.sector) filters.push(`sector:[${params.sector}]`);
  if (params.women) filters.push("gender:female");
  if (params.region) {
    const map = await getRegionCountryMap().catch(() => ({} as Record<string, string[]>));
    const isoCodes = map[params.region];
    if (isoCodes?.length) filters.push(`country:${JSON.stringify(isoCodes)}`);
  }
  const q = params.q ? `,queryString:${JSON.stringify(params.q)}` : "";
  const validSorts = ["popularity", "newest", "expiringSoon", "amountLeft", "loanAmount", "loanAmountDesc"];
  const sort = validSorts.includes(params.sort ?? "") ? params.sort : "popularity";
  const data = await kivaGQL<FundraisingSearchData>(
    `{lend{loans(filters:{${filters.join(",")}}${q},limit:${limit},sortBy:${sort}){totalCount values{id name loanAmount use image{url(customSize:"w480h360")} activity{name} sector{name} geocode{country{name}} borrowerCount loanFundraisingInfo{fundedAmount}}}}}`,
    120
  );
  return (data.lend.loans.values ?? []).map((l) => ({
    id: l.id,
    name: l.name,
    country: l.geocode?.country?.name ?? "Unknown",
    activity: l.activity?.name ?? "Small Business",
    sector: l.sector?.name ?? "Retail",
    use: l.use ?? "to grow their business",
    image: l.image?.url ?? null,
    loanAmount: parseFloat(l.loanAmount) || 0,
    fundedAmount: parseFloat(l.loanFundraisingInfo?.fundedAmount ?? "0") || 0,
    borrowerCount: l.borrowerCount ?? 1,
  }));
}

export interface KivaLoanLive {
  id: number;
  name: string;
  status: string;
  country: string;
  use: string;
  loanAmount: number;
  fundedAmount: number;
  remaining: number;
  image: string | null;
}

// Batched live status for a set of loan ids (single GraphQL request).
export async function getLoansById(ids: number[]): Promise<Map<number, KivaLoanLive>> {
  const map = new Map<number, KivaLoanLive>();
  const unique = [...new Set(ids)].filter((id) => Number.isFinite(id) && id > 0);
  if (!unique.length) return map;
  const query = `{lend{${unique
    .map((id, i) => `l${i}: loan(id:${id}){id name status use loanAmount loanFundraisingInfo{fundedAmount} geocode{country{name}} image{url(customSize:"w480h360")}}`)
    .join(" ")}}}`;
  type Raw = {
    id: number; name: string; status: string; use?: string | null; loanAmount: string;
    loanFundraisingInfo?: { fundedAmount?: string } | null;
    geocode?: { country?: { name?: string } } | null;
    image?: { url?: string } | null;
  };
  const data = await kivaGQL<{ lend: Record<string, Raw | null> }>(query, 120);
  for (const loan of Object.values(data.lend)) {
    if (!loan) continue;
    const loanAmount = parseFloat(loan.loanAmount) || 0;
    const fundedAmount = parseFloat(loan.loanFundraisingInfo?.fundedAmount ?? "0") || 0;
    map.set(loan.id, {
      id: loan.id,
      name: loan.name,
      status: loan.status,
      country: loan.geocode?.country?.name ?? "Unknown",
      use: loan.use ?? "to grow their business",
      loanAmount,
      fundedAmount,
      remaining: Math.max(0, loanAmount - fundedAmount),
      image: loan.image?.url ?? null,
    });
  }
  return map;
}

// Real borrower photo URLs for the treasury lender's funded loans,
// keyed by loan id. The legacy REST API only exposes a dead CDN pattern.
export async function getLenderLoanImages(): Promise<Record<number, string>> {
  const data = await kivaGQL<LenderLoansData>(
    `{community{lender(publicId:"${KIVA_LENDER_ID}"){loans(limit:100){values{id image{url(customSize:"w480h360")}}}}}}`
  );
  const map: Record<number, string> = {};
  for (const loan of data.community.lender?.loans.values ?? []) {
    if (loan.image?.url) map[loan.id] = loan.image.url;
  }
  return map;
}
