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

  const files = fs.readdirSync(WAVES_DIR).filter(f => f.endsWith('.json'));
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
