import { KIVA_FETCH_HEADERS, KIVA_LENDER_ID } from "@/lib/constants";
import type { FundraisingLoan } from "@/lib/launchpad";

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

// Live fundraising borrowers for the launchpad picker.
export async function searchFundraisingLoans(query?: string, limit = 12): Promise<FundraisingLoan[]> {
  const q = query ? `,queryString:${JSON.stringify(query)}` : "";
  const data = await kivaGQL<FundraisingSearchData>(
    `{lend{loans(filters:{status:fundraising}${q},limit:${limit},sortBy:popularity){totalCount values{id name loanAmount use image{url(customSize:"w480h360")} activity{name} sector{name} geocode{country{name}} borrowerCount loanFundraisingInfo{fundedAmount}}}}}`,
    300
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
