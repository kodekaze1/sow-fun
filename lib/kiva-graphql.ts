import { KIVA_FETCH_HEADERS, KIVA_LENDER_ID } from "@/lib/constants";

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
