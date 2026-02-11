import { supabase } from '../lib/supabase';

const API_BASE_URL = 'https://stack-tracker-pro-production.up.railway.app';

export interface MetalChange {
  amount?: number;
  percent?: number;
  prevClose?: number;
}

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
    gold: MetalChange;
    silver: MetalChange;
    platinum: MetalChange;
    palladium: MetalChange;
    source: string;
  };
}

export interface PriceLogEntry {
  id: number;
  timestamp: string;
  gold_price: number;
  silver_price: number;
  platinum_price: number;
  palladium_price: number;
  created_at: string;
}

export async function fetchSpotPrices(): Promise<SpotPrices> {
  const response = await fetch(`${API_BASE_URL}/api/spot-prices`);

  if (!response.ok) {
    throw new Error(`Failed to fetch spot prices: ${response.status}`);
  }

  const data = await response.json();

  // The API only returns change data for gold and silver.
  // Compute platinum and palladium change from price_log.
  if (!data.change?.platinum || !data.change?.palladium) {
    try {
      const ptPdChange = await fetchPreviousClose();
      if (ptPdChange) {
        if (!data.change.platinum && ptPdChange.platinum_prev) {
          const ptChange = data.platinum - ptPdChange.platinum_prev;
          data.change.platinum = {
            amount: ptChange,
            percent: ptPdChange.platinum_prev > 0 ? (ptChange / ptPdChange.platinum_prev) * 100 : 0,
            prevClose: ptPdChange.platinum_prev,
          };
        }
        if (!data.change.palladium && ptPdChange.palladium_prev) {
          const pdChange = data.palladium - ptPdChange.palladium_prev;
          data.change.palladium = {
            amount: pdChange,
            percent: ptPdChange.palladium_prev > 0 ? (pdChange / ptPdChange.palladium_prev) * 100 : 0,
            prevClose: ptPdChange.palladium_prev,
          };
        }
      }
    } catch (e) {
      console.warn('Failed to compute pt/pd change from price_log:', e);
    }
  }

  // Ensure change object always has all 4 metals
  data.change.platinum = data.change.platinum || {};
  data.change.palladium = data.change.palladium || {};

  return data;
}

/**
 * Fetch the previous trading day's closing prices from price_log.
 * We find the last record from before today (UTC midnight).
 */
async function fetchPreviousClose(): Promise<{
  platinum_prev: number;
  palladium_prev: number;
} | null> {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const todayISO = today.toISOString();

  const { data, error } = await supabase
    .from('price_log')
    .select('platinum_price, palladium_price')
    .lt('created_at', todayISO)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;

  return {
    platinum_prev: data.platinum_price,
    palladium_prev: data.palladium_price,
  };
}

/**
 * Fetch price history from the price_log table.
 * Returns one price point per day (the last reading each day).
 * @param days Number of days of history to fetch
 */
export async function fetchPriceHistory(days: number): Promise<PriceLogEntry[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data, error } = await supabase
    .from('price_log')
    .select('id, timestamp, gold_price, silver_price, platinum_price, palladium_price, created_at')
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching price history:', error);
    return [];
  }

  if (!data || data.length === 0) return [];

  // Downsample to ~1 point per day for chart performance
  const byDay = new Map<string, PriceLogEntry>();
  for (const entry of data) {
    const dayKey = entry.created_at.slice(0, 10); // YYYY-MM-DD
    byDay.set(dayKey, entry); // keep last entry per day
  }

  return Array.from(byDay.values());
}

/**
 * Fetch recent price data for sparklines (last 24 hours, ~1 point per hour).
 */
export async function fetchSparklineData(): Promise<PriceLogEntry[]> {
  const since = new Date();
  since.setHours(since.getHours() - 24);

  const { data, error } = await supabase
    .from('price_log')
    .select('id, timestamp, gold_price, silver_price, platinum_price, palladium_price, created_at')
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching sparkline data:', error);
    return [];
  }

  if (!data || data.length === 0) return [];

  // Downsample to ~1 point per hour for sparklines
  const byHour = new Map<string, PriceLogEntry>();
  for (const entry of data) {
    const hourKey = entry.created_at.slice(0, 13); // YYYY-MM-DDTHH
    byHour.set(hourKey, entry);
  }

  return Array.from(byHour.values());
}
