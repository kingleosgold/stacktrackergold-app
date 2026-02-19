import { supabase } from '../lib/supabase';

const API_BASE_URL = 'https://api.stacktrackergold.com';

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
  const response = await fetch(`${API_BASE_URL}/v1/prices`);

  if (!response.ok) {
    throw new Error(`Failed to fetch spot prices: ${response.status}`);
  }

  const raw = await response.json();

  // Transform /v1/prices nested shape → flat SpotPrices interface
  const metals = ['gold', 'silver', 'platinum', 'palladium'] as const;
  const change: Record<string, MetalChange> = {};

  for (const metal of metals) {
    const m = raw.prices[metal];
    const pct = m.change_pct || 0;
    const prevClose = pct !== 0 ? m.price / (1 + pct / 100) : m.price;
    change[metal] = {
      amount: m.price - prevClose,
      percent: pct,
      prevClose,
    };
  }

  return {
    success: true,
    gold: raw.prices.gold.price,
    silver: raw.prices.silver.price,
    platinum: raw.prices.platinum.price,
    palladium: raw.prices.palladium.price,
    timestamp: raw.timestamp,
    source: raw.source,
    cacheAgeMinutes: 0,
    change: {
      gold: change.gold,
      silver: change.silver,
      platinum: change.platinum,
      palladium: change.palladium,
      source: raw.source,
    },
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
  const response = await fetch(`${API_BASE_URL}/v1/market-intel?date=${d}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch intelligence: ${response.status}`);
  }

  const raw = await response.json();

  // Transform /v1/market-intel { articles } → { briefs } shape
  const severityToScore: Record<string, number> = { high: 9, medium: 5, info: 2, low: 1 };
  const briefs: IntelligenceBrief[] = (raw.articles || []).map((a: { id: string; title: string; summary: string; metal?: string; severity?: string; published_at?: string }) => ({
    id: a.id,
    date: a.published_at?.split('T')[0] || d,
    category: a.metal || 'general',
    title: a.title,
    summary: a.summary,
    source: '',
    source_url: '',
    relevance_score: severityToScore[a.severity || 'medium'] || 5,
    created_at: a.published_at || '',
  }));

  return {
    success: true,
    date: d,
    briefs,
    generated_at: raw.articles?.[0]?.published_at || new Date().toISOString(),
  };
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

export async function fetchVaultData(source = 'comex', _days = 30): Promise<VaultDataResponse> {
  // /v1/vault-watch returns a single snapshot per metal; fetch all 4 and merge
  const metals = ['gold', 'silver', 'platinum', 'palladium'] as const;
  const results = await Promise.all(
    metals.map(async (metal) => {
      const res = await fetch(`${API_BASE_URL}/v1/vault-watch?metal=${metal}`);
      if (!res.ok) throw new Error(`Failed to fetch ${metal} vault data: ${res.status}`);
      return res.json();
    }),
  );

  const data = {} as VaultDataResponse['data'];
  for (let i = 0; i < metals.length; i++) {
    const raw = results[i];
    data[metals[i]] = [{
      date: raw.date,
      registered_oz: raw.registered_oz || 0,
      eligible_oz: raw.eligible_oz || 0,
      combined_oz: raw.combined_oz || 0,
      registered_change_oz: raw.daily_change?.registered || 0,
      eligible_change_oz: raw.daily_change?.eligible || 0,
      oversubscribed_ratio: raw.oversubscribed_ratio || 0,
    }];
  }

  return { success: true, source, days: _days, data };
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
  // /v1/prices/history returns per-metal data; fetch all 4 and merge by timestamp
  const metals = ['gold', 'silver', 'platinum', 'palladium'] as const;
  const results = await Promise.all(
    metals.map(async (metal) => {
      const res = await fetch(`${API_BASE_URL}/v1/prices/history?range=${range}&metal=${metal}`);
      if (!res.ok) throw new Error(`Failed to fetch ${metal} price history: ${res.status}`);
      return res.json();
    }),
  );

  // Merge by date key — timestamps from the same price_log should align
  const dateMap = new Map<string, SpotPriceHistoryPoint>();
  for (let i = 0; i < metals.length; i++) {
    const metal = metals[i];
    for (const entry of results[i].prices || []) {
      const key = entry.date;
      if (!dateMap.has(key)) {
        dateMap.set(key, { date: key, gold: 0, silver: 0, platinum: 0, palladium: 0 });
      }
      dateMap.get(key)![metal] = entry.price;
    }
  }

  const data = Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));

  return {
    success: true,
    range,
    totalPoints: results[0]?.data_points || data.length,
    sampledPoints: data.length,
    data,
  };
}

// ─── Subscription Sync ──────────────────────────────────────────

export interface SyncSubscriptionResponse {
  success: boolean;
  tier?: string;
  synced?: boolean;
  error?: string;
}

// TODO: /api/sync-subscription has no confirmed /v1/ equivalent on stg-api.
// Syncs the user's Stripe subscription tier to Supabase on login and from Settings.
// Check if stg-api exposes /v1/stripe/sync or /v1/subscription/sync and update accordingly.
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
  const response = await fetch(`${API_BASE_URL}/v1/stripe/create-checkout-session`, {
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

export async function verifyStripeSession(sessionId: string): Promise<{ success: boolean; tier?: string }> {
  const response = await fetch(`${API_BASE_URL}/v1/stripe/verify-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId }),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || `Verify failed: ${response.status}`);
  }
  return response.json();
}

export async function createCustomerPortal(userId: string): Promise<{ url: string }> {
  const response = await fetch(`${API_BASE_URL}/v1/stripe/customer-portal`, {
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

// ─── AI Daily Brief ──────────────────────────────────────────────

export interface DailyBrief {
  brief_text: string;
  generated_at: string;
  date: string;
}

export async function fetchDailyBrief(userId: string): Promise<DailyBrief | null> {
  const response = await fetch(`${API_BASE_URL}/v1/daily-brief?userId=${encodeURIComponent(userId)}`);
  if (!response.ok) return null;
  const data = await response.json();
  return data.brief || null;
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
  const response = await fetch(`${API_BASE_URL}/v1/advisor/chat`, {
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
