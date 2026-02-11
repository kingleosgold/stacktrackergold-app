import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export type SubscriptionTier = 'free' | 'gold' | 'platinum' | 'lifetime';

interface UseSubscriptionReturn {
  tier: SubscriptionTier;
  loading: boolean;
  isGoldOrHigher: boolean;
  isPlatinum: boolean;
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
        setTier((data.subscription_tier as SubscriptionTier) || 'free');
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

  const isGoldOrHigher = tier === 'gold' || tier === 'lifetime' || tier === 'platinum';
  const isPlatinum = tier === 'platinum';

  return { tier, loading, isGoldOrHigher, isPlatinum, refetch: fetchTier };
}
