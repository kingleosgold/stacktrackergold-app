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

// ─── Intelligence Feed ──────────────────────────────────────────

export interface IntelligenceBrief {
  id: string;
  date: string;
  category: string;
  title: string;
  summary: string;
  source: string;
  source_url: string;
  relevance_score: number;
  created_at: string;
}

export interface IntelligenceResponse {
  success: boolean;
  date: string;
  briefs: IntelligenceBrief[];
  generated_at: string;
}

export async function fetchIntelligence(date?: string): Promise<IntelligenceResponse> {
  // Use Eastern time for the date since the intelligence cron runs at 6:30 AM EST
  const d = date || new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
  const response = await fetch(`${API_BASE_URL}/api/intelligence?date=${d}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch intelligence: ${response.status}`);
  }
  return response.json();
}

// ─── COMEX Vault Data ───────────────────────────────────────────

export interface VaultDataPoint {
  date: string;
  registered_oz: number;
  eligible_oz: number;
  combined_oz: number;
  registered_change_oz: number;
  eligible_change_oz: number;
  oversubscribed_ratio: number;
}

export interface VaultDataResponse {
  success: boolean;
  source: string;
  days: number;
  data: {
    gold: VaultDataPoint[];
    silver: VaultDataPoint[];
    platinum: VaultDataPoint[];
    palladium: VaultDataPoint[];
  };
}

export async function fetchVaultData(source = 'comex', days = 30): Promise<VaultDataResponse> {
  const response = await fetch(`${API_BASE_URL}/api/vault-data?source=${source}&days=${days}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch vault data: ${response.status}`);
  }
  return response.json();
}

// ─── Spot Price History ─────────────────────────────────────────

export interface SpotPriceHistoryPoint {
  date: string;
  gold: number;
  silver: number;
  platinum: number;
  palladium: number;
}

export interface SpotPriceHistoryResponse {
  success: boolean;
  range: string;
  totalPoints: number;
  sampledPoints: number;
  data: SpotPriceHistoryPoint[];
}

export async function fetchSpotPriceHistory(range = '1M'): Promise<SpotPriceHistoryResponse> {
  const response = await fetch(`${API_BASE_URL}/api/spot-price-history?range=${range}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch spot price history: ${response.status}`);
  }
  return response.json();
}

// ─── Subscription Sync ──────────────────────────────────────────

export interface SyncSubscriptionResponse {
  success: boolean;
  tier?: string;
  synced?: boolean;
  error?: string;
}

export async function syncSubscription(userId: string): Promise<SyncSubscriptionResponse> {
  const response = await fetch(`${API_BASE_URL}/api/sync-subscription?user_id=${encodeURIComponent(userId)}`);
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || `Sync failed: ${response.status}`);
  }
  return response.json();
}

// ─── Stripe Billing ──────────────────────────────────────────────

export async function createCheckoutSession(
  userId: string,
  priceId: string,
): Promise<{ url: string }> {
  const response = await fetch(`${API_BASE_URL}/api/stripe/create-checkout-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: userId,
      price_id: priceId,
      success_url: `${window.location.origin}/settings?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${window.location.origin}/settings`,
    }),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || `Checkout failed: ${response.status}`);
  }
  return response.json();
}

export async function createCustomerPortal(userId: string): Promise<{ url: string }> {
  const response = await fetch(`${API_BASE_URL}/api/stripe/customer-portal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: userId,
      return_url: `${window.location.origin}/settings`,
    }),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || `Portal failed: ${response.status}`);
  }
  return response.json();
}

// ─── AI Stack Advisor ────────────────────────────────────────────

export interface AdvisorMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function sendAdvisorMessage(
  userId: string,
  message: string,
  conversationHistory: AdvisorMessage[],
): Promise<{ response: string }> {
  const response = await fetch(`${API_BASE_URL}/api/advisor/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, message, conversationHistory }),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || `Advisor failed: ${response.status}`);
  }
  return response.json();
}
