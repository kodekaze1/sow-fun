import fs from 'fs';
import path from 'path';

export interface UpliftWave {
  id: string;
  wave_number: number;
  status: 'draft' | 'funding' | 'funded' | 'published' | 'repaid' | 're_lent';
  display: {
    headline: string;
    summary: string;
    countries: string[];
    sectors: string[];
  };
  timestamps: {
    started: string;
    last_checked: string;
  };
  movements: {
    direction: 'inflow' | 'outflow';
    type: 'fee' | 'donation' | 'conversion' | 'kiva_funding' | 'repayment' | 're_lending';
    asset: string;
    amount_raw: string;
    value_cents: number;
    tx_hash?: string;
    explorer_url?: string;
  }[];
  loans: {
    kiva_id: string;
    status: 'funding' | 'funded' | 'repaid';
    borrower: string;
    location: string;
    uplift_cents: number;
    total_loan_cents: number;
    repaid_cents: number;
    photo_url?: string;
    verification: {
      verified: boolean;
      verified_at: string;
      source_urls?: string[];
    };
    notes?: string;
    // Which coin's impact share paid for this loan, and whether it was the
    // coin's launch pledge or excess (queue / fallback). Drives the per-coin
    // ledger in lib/coin-ledger.ts; omit for founder-seeded loans.
    mint?: string;
    role?: 'pledge' | 'excess';
  }[];
  // $SOW skims taken from coins' excess this harvest (20%: half burned via
  // the Furnace, half creator rewards). cents = USD value of SOL spent.
  skims?: {
    mint: string;
    cents: number;
    buy_tx?: string;
    burn_tx?: string;
  }[];
  totals: {
    uplift_deployed_cents: number;
    loan_principal_supported_cents: number;
  };
}

const WAVES_DIR = path.join(process.cwd(), 'data', 'waves');

export async function getAllWaves(): Promise<UpliftWave[]> {
  if (!fs.existsSync(WAVES_DIR)) {
    return [];
  }

  const files = fs.readdirSync(WAVES_DIR).filter(f => f.endsWith('.json') && !f.endsWith('.fixture.json'));
  const waves = files.map(file => {
    const filePath = path.join(WAVES_DIR, file);
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content) as UpliftWave;
  });

  // Sort by wave number descending
  return waves.sort((a, b) => b.wave_number - a.wave_number);
}

export async function getWaveById(id: string): Promise<UpliftWave | null> {
  const waves = await getAllWaves();
  return waves.find(w => w.id === id) || null;
}

// One summary of every non-draft harvest - the single source for site stats
// (homepage strip, Harvest Ledger, treasury card and /treasury). Derived from
// the wave records so nothing is typed in twice.
export interface LedgerHarvest {
  id: string;
  number: number;
  status: UpliftWave['status'];
  headline: string;
  date: string; // ISO
  deployedCents: number;
  proofUrl: string;
  loans: { kivaId: string; borrower: string; location: string; cents: number }[];
}

export interface LedgerSummary {
  deployedCents: number;
  recycledCents: number;
  loansFunded: number;
  countries: string[];
  harvests: LedgerHarvest[]; // newest first
}

export function summarizeLedger(waves: UpliftWave[]): LedgerSummary {
  const live = waves.filter((w) => w.status !== 'draft');
  const loanIds = new Set<string>();
  const countries = new Set<string>();
  let deployedCents = 0;
  let recycledCents = 0;
  const harvests = live.map((w) => {
    const loans = w.loans.map((l) => {
      loanIds.add(l.kiva_id);
      if (l.location) countries.add(l.location);
      recycledCents += l.repaid_cents ?? 0;
      return { kivaId: l.kiva_id, borrower: l.borrower, location: l.location, cents: l.uplift_cents };
    });
    const cents = w.totals?.uplift_deployed_cents ?? loans.reduce((s, l) => s + l.cents, 0);
    deployedCents += cents;
    return {
      id: w.id,
      number: w.wave_number,
      status: w.status,
      headline: w.display.headline,
      date: w.timestamps.started,
      deployedCents: cents,
      proofUrl: w.loans[0]?.verification?.source_urls?.find((u) => u.includes('/lender/')) ?? 'https://www.kiva.org/lender/sowfun',
      loans,
    };
  });
  return { deployedCents, recycledCents, loansFunded: loanIds.size, countries: [...countries], harvests };
}
