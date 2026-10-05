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
  Tonga: "🇹🇴", Samoa: "🇼🇸", Fiji: "🇫🇯", "Papua New Guinea": "🇵🇬",
  "Solomon Islands": "🇸🇧", "Timor-Leste": "🇹🇱", Nepal: "🇳🇵", Thailand: "🇹🇭",
  Myanmar: "🇲🇲", "Lao PDR": "🇱🇦", "Sri Lanka": "🇱🇰", Tajikistan: "🇹🇯",
  Kyrgyzstan: "🇰🇬", Armenia: "🇦🇲", Georgia: "🇬🇪", Albania: "🇦🇱",
  Kosovo: "🇽🇰", Moldova: "🇲🇩", Ukraine: "🇺🇦", Jordan: "🇯🇴",
  Lebanon: "🇱🇧", Palestine: "🇵🇸", Iraq: "🇮🇶", Egypt: "🇪🇬",
  Morocco: "🇲🇦", Tunisia: "🇹🇳", Turkey: "🇹🇷", Mozambique: "🇲🇿",
  Zimbabwe: "🇿🇼", Liberia: "🇱🇷", "Sierra Leone": "🇸🇱", Togo: "🇹🇬",
  Benin: "🇧🇯", "Burkina Faso": "🇧🇫", Cameroon: "🇨🇲", "Congo (DRC)": "🇨🇩",
  "Cote D'Ivoire": "🇨🇮", Madagascar: "🇲🇬", "South Sudan": "🇸🇸", Somalia: "🇸🇴",
  Burundi: "🇧🇮", "Costa Rica": "🇨🇷", Ecuador: "🇪🇨", "El Salvador": "🇸🇻",
  Guatemala: "🇬🇹", Honduras: "🇭🇳", Nicaragua: "🇳🇮", Mexico: "🇲🇽",
  Colombia: "🇨🇴", Brazil: "🇧🇷", Paraguay: "🇵🇾", Haiti: "🇭🇹",
  "Dominican Republic": "🇩🇴", Lesotho: "🇱🇸", "United States": "🇺🇸",
};

// Kiva's full sector list (19) and active country count - the Collection targets
export const ALL_KIVA_SECTORS = [
  "Agriculture", "Arts", "Clean Energy", "Clothing", "Construction",
  "Education", "Entertainment", "Food", "Health", "Housing",
  "Manufacturing", "Personal Use", "Retail", "Reuse and Recycle",
  "Sanitation & Hygiene", "Services", "Transportation", "Water", "Wholesale",
];
export const TOTAL_KIVA_COUNTRIES = 72;

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
  Tonga: [-21.1790, -175.1982], Samoa: [-13.7590, -172.1046],
  Fiji: [-17.7134, 178.0650], "Papua New Guinea": [-6.3150, 143.9555],
  "Solomon Islands": [-9.6457, 160.1562], "Timor-Leste": [-8.8742, 125.7275],
  Thailand: [15.8700, 100.9925], Myanmar: [21.9162, 95.9560],
  "Lao People's Democratic Republic": [19.8563, 102.4955], Mongolia: [46.8625, 103.8467],
  Nepal: [28.3949, 84.1240], Kyrgyzstan: [41.2044, 74.7661], Tajikistan: [38.8610, 71.2761],
  Armenia: [40.0691, 45.0382], Georgia: [42.3154, 43.3569], Moldova: [47.4116, 28.3699],
  Ukraine: [48.3794, 31.1656], Kosovo: [42.6026, 20.9030], Turkey: [38.9637, 35.2433],
  Lebanon: [33.8547, 35.8623], Jordan: [30.5852, 36.2384], Palestine: [31.9522, 35.2332],
  Egypt: [26.8206, 30.8025], Morocco: [31.7917, -7.0926],
  Togo: [8.6195, 0.8248], Benin: [9.3077, 2.3158], "Burkina Faso": [12.2383, -1.5616],
  "Sierra Leone": [8.4606, -11.7799], Liberia: [6.4281, -9.4295], Cameroon: [7.3697, 12.3547],
  "The Democratic Republic of the Congo": [-4.0383, 21.7587], Somalia: [5.1521, 46.1996],
  "South Sudan": [6.8770, 31.3070], Mozambique: [-18.6657, 35.5296], Madagascar: [-18.7669, 46.8691],
  Zimbabwe: [-19.0154, 29.1549], Lesotho: [-29.6100, 28.2336], "South Africa": [-30.5595, 22.9375],
  Mexico: [23.6345, -102.5528], Guatemala: [15.7835, -90.2308], Honduras: [15.2000, -86.2419],
  "El Salvador": [13.7942, -88.8965], Nicaragua: [12.8654, -85.2072], "Costa Rica": [9.7489, -83.7534],
  Panama: [8.5380, -80.7821], Haiti: [18.9712, -72.2852], "Dominican Republic": [18.7357, -70.1627],
  Colombia: [4.5709, -74.2973], Ecuador: [-1.8312, -78.1834], Paraguay: [-23.4425, -58.4438],
  Brazil: [-14.2350, -51.9253], "United States": [37.0902, -95.7129],
};

// Initials avatar for loans whose real Kiva photo is unavailable - never fake faces
export function getAvatarFallback(name: string, color: string): string {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${color.replace("#", "")}&color=fff&size=96`;
}

// Launch switch: reveals the live treasury balance and wallet on the homepage
// card and /treasury. Flip to true once $SOW is live (one place for the site).
export const SHOW_LIVE_TREASURY = false;

// Site stats (deployed, loans, countries, harvest ledger) are derived from the
// wave records in data/waves via summarizeLedger() in lib/waves.ts.
