const API_BASE_URL = 'https://stack-tracker-pro-production.up.railway.app';

export interface SpotPrices {
  success: boolean;
  gold: number;
  silver: number;
  platinum: number;
  palladium: number;
  timestamp: string;
  source: string;
  cacheAgeMinutes: number;
  marketsClosed?: boolean;
  change: {
    gold: { amount?: number; percent?: number; prevClose?: number };
    silver: { amount?: number; percent?: number; prevClose?: number };
    source: string;
  };
}

export async function fetchSpotPrices(): Promise<SpotPrices> {
  const response = await fetch(`${API_BASE_URL}/api/spot-prices`);

  if (!response.ok) {
    throw new Error(`Failed to fetch spot prices: ${response.status}`);
  }

  return response.json();
}
