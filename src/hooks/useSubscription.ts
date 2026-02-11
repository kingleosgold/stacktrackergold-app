import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export type SubscriptionTier = 'free' | 'gold' | 'platinum' | 'lifetime';

interface UseSubscriptionReturn {
  tier: SubscriptionTier;
  loading: boolean;
  isGoldOrHigher: boolean;
  isPlatinum: boolean;
}

export function useSubscription(): UseSubscriptionReturn {
  const { user } = useAuth();
  const [tier, setTier] = useState<SubscriptionTier>('free');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setTier('free');
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchTier() {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('subscription_tier')
          .eq('id', user!.id)
          .single();

        if (!cancelled) {
          if (error || !data) {
            setTier('free');
          } else {
            setTier((data.subscription_tier as SubscriptionTier) || 'free');
          }
        }
      } catch {
        if (!cancelled) setTier('free');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchTier();
    return () => { cancelled = true; };
  }, [user]);

  const isGoldOrHigher = tier === 'gold' || tier === 'lifetime' || tier === 'platinum';
  const isPlatinum = tier === 'platinum';

  return { tier, loading, isGoldOrHigher, isPlatinum };
}
