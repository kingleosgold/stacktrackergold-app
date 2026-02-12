import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export type SubscriptionTier = 'free' | 'gold' | 'lifetime';

interface UseSubscriptionReturn {
  tier: SubscriptionTier;
  loading: boolean;
  isGold: boolean;
  refetch: () => Promise<void>;
}

export function useSubscription(): UseSubscriptionReturn {
  const { user } = useAuth();
  const [tier, setTier] = useState<SubscriptionTier>('free');
  const [loading, setLoading] = useState(true);

  const fetchTier = useCallback(async () => {
    if (!user) {
      setTier('free');
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('subscription_tier')
        .eq('id', user.id)
        .single();

      if (error || !data) {
        setTier('free');
      } else {
        const raw = data.subscription_tier as string;
        // Normalize: anything paid maps to gold or lifetime
        if (raw === 'lifetime') setTier('lifetime');
        else if (raw === 'gold') setTier('gold');
        else setTier('free');
      }
    } catch {
      setTier('free');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchTier();
  }, [fetchTier]);

  const isGold = tier === 'gold' || tier === 'lifetime';

  return { tier, loading, isGold, refetch: fetchTier };
}
