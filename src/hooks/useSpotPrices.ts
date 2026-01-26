import { useState, useEffect, useCallback } from 'react';
import { fetchSpotPrices } from '../services/api';
import type { SpotPrices } from '../services/api';

interface UseSpotPricesResult {
  prices: SpotPrices | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  lastUpdated: Date | null;
}

export function useSpotPrices(autoRefreshInterval?: number): UseSpotPricesResult {
  const [prices, setPrices] = useState<SpotPrices | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchSpotPrices();
      setPrices(data);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch prices');
    } finally {
      setLoading(false);
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
