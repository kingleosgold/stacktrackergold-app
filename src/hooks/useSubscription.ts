import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export type SubscriptionTier = 'free' | 'gold' | 'lifetime';

interface UseSubscriptionReturn {
  tier: SubscriptionTier;
  loading: boolean;
  isGold: boolean;
  isTrial: boolean;
  trialEnd: string | null;
  refetch: () => Promise<void>;
}

export function useSubscription(): UseSubscriptionReturn {
  const { user } = useAuth();
  const [tier, setTier] = useState<SubscriptionTier>('free');
  const [isTrial, setIsTrial] = useState(false);
  const [trialEnd, setTrialEnd] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchTier = useCallback(async () => {
    if (!user) {
      setTier('free');
      setIsTrial(false);
      setTrialEnd(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('subscription_tier, subscription_status, trial_end')
        .eq('id', user.id)
        .single();

      if (error || !data) {
        setTier('free');
        setIsTrial(false);
        setTrialEnd(null);
      } else {
        const raw = data.subscription_tier as string;
        // Normalize: anything paid maps to gold or lifetime
        if (raw === 'lifetime') setTier('lifetime');
        else if (raw === 'gold') setTier('gold');
        else setTier('free');

        const status = (data as Record<string, unknown>).subscription_status as string | undefined;
        const end = (data as Record<string, unknown>).trial_end as string | undefined;
        setIsTrial(status === 'trialing');
        setTrialEnd(end || null);
      }
    } catch {
      setTier('free');
      setIsTrial(false);
      setTrialEnd(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchTier();
  }, [fetchTier]);

  const isGold = tier === 'gold' || tier === 'lifetime';

  return { tier, loading, isGold, isTrial, trialEnd, refetch: fetchTier };
}
