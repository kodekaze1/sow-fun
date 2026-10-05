import { NextResponse } from "next/server";
import { KIVA_FETCH_HEADERS } from "@/lib/constants";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  // Whole page number only - never interpolate raw input into the Kiva URL
  const page = Math.min(Math.max(parseInt(searchParams.get("page") ?? "1", 10) || 1, 1), 100);

  try {
    const res = await fetch(
      `https://api.kivaws.org/v1/loans/search.json?status=fundraising&sort_by=popularity&per_page=20&page=${page}&country_code=PH,KE,UG,TZ,GH,ML,SN,BD,PE,BO,PK,IN`,
      { headers: KIVA_FETCH_HEADERS, next: { revalidate: 300 } }
    );

    if (!res.ok) throw new Error("Kiva API error");
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    // Fallback mock data if Kiva API is unavailable
    return NextResponse.json({ loans: MOCK_LOANS, paging: { total: 20, page: 1, pages: 1, per_page: 20 } });
  }
}

const MOCK_LOANS = [
  { id: 1, name: "Maria Santos", activity: "Food Market", sector: "Food", use: "to stock her market stall with fresh vegetables", location: { country: "Philippines", town: "Cebu" }, borrower_count: 1, loan_amount: 25, funded_amount: 0, image: { id: 1, template_id: 1 }, lender_count: 0, partner_id: 1, posted_date: new Date().toISOString(), planned_expiration_date: new Date(Date.now() + 30*24*60*60*1000).toISOString(), description: { texts: { en: "Maria sells vegetables at the local market to support her 3 children." } } },
  { id: 2, name: "James Odhiambo", activity: "Solar Energy", sector: "Clean Energy", use: "to purchase solar panels to resell to off-grid families", location: { country: "Kenya", town: "Nairobi" }, borrower_count: 1, loan_amount: 50, funded_amount: 0, image: { id: 2, template_id: 1 }, lender_count: 0, partner_id: 1, posted_date: new Date().toISOString(), planned_expiration_date: new Date(Date.now() + 30*24*60*60*1000).toISOString(), description: { texts: { en: "James wants to bring affordable solar lights to families living off the grid." } } },
  { id: 3, name: "Amina Diallo", activity: "Tailoring", sector: "Retail", use: "to expand her tailoring workshop", location: { country: "Mali", town: "Bamako" }, borrower_count: 1, loan_amount: 75, funded_amount: 0, image: { id: 3, template_id: 1 }, lender_count: 0, partner_id: 1, posted_date: new Date().toISOString(), planned_expiration_date: new Date(Date.now() + 30*24*60*60*1000).toISOString(), description: { texts: { en: "Amina sews traditional clothing for weddings and ceremonies." } } },
];
