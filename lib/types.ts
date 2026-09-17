export interface KivaLoan {
  id: number;
  name: string;
  activity: string;
  sector: string;
  use: string;
  location: { country: string; town?: string; geo?: { pairs?: string } };
  borrower_count: number;
  loan_amount: number;
  funded_amount: number;
  image: { id: number; template_id: number };
  image_url?: string;
  lender_count: number;
  partner_id: number;
  posted_date: string;
  planned_expiration_date: string;
  description?: { texts?: { en?: string } };
}

export interface TreasuryData {
  wallet: string;
  sol: string;
  usd: string;
  lamports: number;
}

// Muted, earthy categorical palette that sits inside the Kiva-matched theme
export const SECTOR_COLORS: Record<string, string> = {
  Agriculture:   "#2AA967",
  Food:          "#2AA967",
  "Clean Energy":"#D99A2B",
  Retail:        "#8578B8",
  Education:     "#4A7DB5",
  Health:        "#A24536",
  Housing:       "#3E8E8F",
  Uplift:        "#F8CD69", // Gold for our funded loans
  default:       "#276A43",
};

export const SECTOR_TAGS: Record<string, string> = {
  Agriculture:   "🌾",
  Food:          "🍽️",
  "Clean Energy":"⚡",
  Retail:        "🏪",
  Education:     "📚",
  Health:        "🏥",
  Housing:       "🏠",
  default:       "💼",
};

export const COUNTRY_FLAGS: Record<string, string> = {
  Philippines: "🇵🇭", Kenya: "🇰🇪", Uganda: "🇺🇬", Tanzania: "🇹🇿",
  Ghana: "🇬🇭", Mali: "🇲🇱", Senegal: "🇸🇳", Bangladesh: "🇧🇩",
  Peru: "🇵🇪", Bolivia: "🇧🇴", Pakistan: "🇵🇰", India: "🇮🇳",
  Nigeria: "🇳🇬", Ethiopia: "🇪🇹", Rwanda: "🇷🇼", Malawi: "🇲🇼",
  Zambia: "🇿🇲", Cambodia: "🇰🇭", Indonesia: "🇮🇩", Vietnam: "🇻🇳",
};

export const COUNTRY_COORDS: Record<string, [number, number]> = {
  Philippines: [12.8797, 121.7740], Kenya: [-0.0236, 37.9062],
  Uganda: [1.3733, 32.2903], Tanzania: [-6.3690, 34.8888],
  Ghana: [7.9465, -1.0232], Mali: [17.5707, -3.9962],
  Senegal: [14.4974, -14.4524], Bangladesh: [23.6850, 90.3563],
  Peru: [-9.1900, -75.0152], Bolivia: [-16.2902, -63.5887],
  Pakistan: [30.3753, 69.3451], India: [20.5937, 78.9629],
  Nigeria: [9.0820, 8.6753], Ethiopia: [9.1450, 40.4897],
  Rwanda: [-1.9403, 29.8739], Malawi: [-13.2543, 34.3015],
  Zambia: [-13.1339, 27.8493], Cambodia: [12.5657, 104.9910],
  Indonesia: [-0.7893, 113.9213], Vietnam: [14.0583, 108.2772],
};

// Initials avatar for loans whose real Kiva photo is unavailable - never fake faces
export function getAvatarFallback(name: string, color: string): string {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${color.replace("#", "")}&color=fff&size=96`;
}

// Real stats - updated manually as waves are executed and verified.
// Last updated: 2026-04-13 (Wave #001 Genesis, 1 loan to Ailyn / Philippines)
export const MOCK_STATS = {
  feesCollected: 25,
  loansFunded: 1,
  countriesReached: 1,
  repaymentRate: 0,       // no repayments yet
  recycledCapital: 0,
};

// Wave ledger - real entries only, with verifiable Kiva links.
export const MOCK_BATCHES: { id: string; date: string; amount: number; loans: number; txHash: string; rate: number }[] = [
  { id: "001", date: "Apr 13, 2026", amount: 25, loans: 1, txHash: "https://www.kiva.org/lend/3157094", rate: 0 },
];
