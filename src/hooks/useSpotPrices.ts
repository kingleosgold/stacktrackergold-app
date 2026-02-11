import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchSpotPrices } from '../services/api';
import type { SpotPrices } from '../services/api';

interface UseSpotPricesResult {
  prices: SpotPrices | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  lastUpdated: Date | null;
}

/** Return true if the 4 metal prices + change values are identical. */
function pricesEqual(a: SpotPrices | null, b: SpotPrices): boolean {
  if (!a) return false;
  if (
    a.gold !== b.gold ||
    a.silver !== b.silver ||
    a.platinum !== b.platinum ||
    a.palladium !== b.palladium
  ) return false;
  // Also compare change amounts so daily‑change numbers stay fresh
  const metals = ['gold', 'silver', 'platinum', 'palladium'] as const;
  for (const m of metals) {
    if (a.change?.[m]?.amount !== b.change?.[m]?.amount) return false;
    if (a.change?.[m]?.percent !== b.change?.[m]?.percent) return false;
  }
  return true;
}

export function useSpotPrices(autoRefreshInterval?: number): UseSpotPricesResult {
  const [prices, setPrices] = useState<SpotPrices | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const pricesRef = useRef<SpotPrices | null>(null);
  const initialLoadDone = useRef(false);

  const refresh = useCallback(async () => {
    try {
      // Only show loading skeleton on the very first fetch
      if (!initialLoadDone.current) {
        setLoading(true);
      }
      setError(null);
      const data = await fetchSpotPrices();

      // Only update state if prices actually changed — prevents re-renders
      if (!pricesEqual(pricesRef.current, data)) {
        pricesRef.current = data;
        setPrices(data);
      }
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch prices');
    } finally {
      if (!initialLoadDone.current) {
        initialLoadDone.current = true;
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    refresh();

    if (autoRefreshInterval && autoRefreshInterval > 0) {
      const interval = setInterval(refresh, autoRefreshInterval);
      return () => clearInterval(interval);
    }
  }, [refresh, autoRefreshInterval]);

  return { prices, loading, error, refresh, lastUpdated };
}
