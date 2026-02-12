import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { createCheckoutSession } from '../services/api';
import type { SubscriptionTier } from '../hooks/useSubscription';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTier: SubscriptionTier;
}

const GOLD_PRICE_ID = import.meta.env.VITE_STRIPE_GOLD_PRICE_ID || '';
const PLATINUM_PRICE_ID = import.meta.env.VITE_STRIPE_PLATINUM_PRICE_ID || '';

const plans = [
  {
    id: 'gold' as const,
    name: 'Gold',
    priceId: GOLD_PRICE_ID,
    price: '$4.99',
    period: '/mo',
    features: [
      'Unlimited holdings',
      'Daily intelligence briefs',
      'COMEX vault data',
      'Spot price history',
      'Portfolio analytics',
      'CSV import/export',
    ],
    accent: 'text-gold',
    accentBg: 'bg-gold/10',
    buttonBg: 'bg-gold hover:bg-gold-hover',
  },
  {
    id: 'platinum' as const,
    name: 'Platinum',
    priceId: PLATINUM_PRICE_ID,
    price: '$9.99',
    period: '/mo',
    features: [
      'Everything in Gold',
      'AI coin identification',
      'Price alerts',
      'Portfolio snapshots',
      'Priority support',
      'Early access to new features',
    ],
    accent: 'text-blue-400',
    accentBg: 'bg-blue-400/10',
    buttonBg: 'bg-blue-500 hover:bg-blue-600',
  },
];

export function PricingModal({ isOpen, onClose, currentTier }: PricingModalProps) {
  const { user } = useAuth();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubscribe = async (priceId: string, planId: string) => {
    if (!user) {
      setError('Please sign in first');
      return;
    }
    if (!priceId) {
      setError('This plan is not available yet');
      return;
    }

    setLoadingPlan(planId);
    setError(null);

    try {
      const { url } = await createCheckoutSession(user.id, priceId);
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start checkout');
      setLoadingPlan(null);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/70" />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-2xl w-full bg-surface border border-border rounded-xl p-6 max-h-[90vh] overflow-y-auto"
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-text-muted hover:text-text transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Header */}
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold mb-1">Upgrade Your Stack</h2>
              <p className="text-sm text-text-muted">Unlock premium features for serious stackers</p>
            </div>

            {/* Error */}
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-500 text-sm text-center">
                {error}
              </div>
            )}

            {/* Plan Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {plans.map((plan) => {
                const isCurrentPlan = currentTier === plan.id;
                const isUpgrade = !isCurrentPlan && currentTier === 'free';
                const isDowngrade = plan.id === 'gold' && (currentTier === 'platinum');

                return (
                  <div
                    key={plan.id}
                    className={`rounded-xl border p-5 flex flex-col ${
                      isCurrentPlan ? 'border-gold/40 bg-gold/5' : 'border-border bg-background'
                    }`}
                  >
                    {/* Plan name + badge */}
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`text-lg font-bold ${plan.accent}`}>{plan.name}</span>
                      {isCurrentPlan && (
                        <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-gold/15 text-gold">
                          CURRENT
                        </span>
                      )}
                    </div>

                    {/* Price */}
                    <div className="mb-4">
                      <span className="text-2xl font-bold">{plan.price}</span>
                      <span className="text-sm text-text-muted">{plan.period}</span>
                    </div>

                    {/* Features */}
                    <ul className="space-y-2 mb-5 flex-1">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2 text-sm">
                          <svg className={`w-4 h-4 mt-0.5 shrink-0 ${plan.accent}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                          <span className="text-text-secondary">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    {/* CTA Button */}
                    {isCurrentPlan ? (
                      <button
                        disabled
                        className="w-full py-2.5 px-4 text-sm font-medium rounded-lg bg-surface-light text-text-muted cursor-not-allowed"
                      >
                        Current Plan
                      </button>
                    ) : isDowngrade ? (
                      <button
                        disabled
                        className="w-full py-2.5 px-4 text-sm font-medium rounded-lg bg-surface-light text-text-muted cursor-not-allowed"
                      >
                        Manage in billing portal
                      </button>
                    ) : isUpgrade ? (
                      <button
                        onClick={() => handleSubscribe(plan.priceId, plan.id)}
                        disabled={loadingPlan !== null}
                        className={`w-full py-2.5 px-4 text-sm font-medium rounded-lg text-background transition-colors disabled:opacity-50 ${plan.buttonBg}`}
                      >
                        {loadingPlan === plan.id ? 'Redirecting...' : `Subscribe to ${plan.name}`}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleSubscribe(plan.priceId, plan.id)}
                        disabled={loadingPlan !== null}
                        className={`w-full py-2.5 px-4 text-sm font-medium rounded-lg text-background transition-colors disabled:opacity-50 ${plan.buttonBg}`}
                      >
                        {loadingPlan === plan.id ? 'Redirecting...' : `Upgrade to ${plan.name}`}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <p className="text-center text-xs text-text-muted mt-5">
              Cancel anytime. Subscriptions managed by Stripe.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
