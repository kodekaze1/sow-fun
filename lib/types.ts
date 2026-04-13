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

export const SECTOR_COLORS: Record<string, string> = {
  Agriculture:   "#22c55e",
  Food:          "#22c55e",
  "Clean Energy":"#f59e0b",
  Retail:        "#8b5cf6",
  Education:     "#3b82f6",
  Health:        "#ef4444",
  Housing:       "#06b6d4",
  default:       "#2CAB6A",
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

// Placeholder portrait photos (randomuser.me stand-ins for Kiva API)
const PORTRAITS_W = [10,12,20,33,37,44,47,53,57,60,63,65,68,71,75,78,82,89,90,91];
const PORTRAITS_M = [10,14,18,22,25,32,38,43,45,49,51,54,56,60,63,68,72,76,80,85];

export function getPortrait(loanId: number): string {
  const isFemale = loanId % 3 !== 0;
  if (isFemale) {
    return `https://randomuser.me/api/portraits/women/${PORTRAITS_W[loanId % PORTRAITS_W.length]}.jpg`;
  }
  return `https://randomuser.me/api/portraits/men/${PORTRAITS_M[loanId % PORTRAITS_M.length]}.jpg`;
}

// Real stats — starts at zero, updated manually as waves are executed and verified.
// Do NOT inflate these with demo numbers. Public trust depends on accuracy.
export const MOCK_STATS = {
  feesCollected: 0,
  loansFunded: 0,
  countriesReached: 0,
  repaymentRate: 0,
  recycledCapital: 0,
};

// No waves executed yet — will populate with real tx hashes and Kiva receipts.
export const MOCK_BATCHES: { id: string; date: string; amount: number; loans: number; txHash: string; rate: number }[] = [];
