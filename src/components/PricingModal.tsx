import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { createCheckoutSession } from '../services/api';
import type { SubscriptionTier } from '../hooks/useSubscription';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTier: SubscriptionTier;
}

const MONTHLY_PRICE_ID = import.meta.env.VITE_STRIPE_GOLD_MONTHLY_PRICE_ID || '';
const YEARLY_PRICE_ID = import.meta.env.VITE_STRIPE_GOLD_YEARLY_PRICE_ID || '';
const LIFETIME_PRICE_ID = import.meta.env.VITE_STRIPE_GOLD_LIFETIME_PRICE_ID || '';

type PricingOption = 'monthly' | 'yearly' | 'lifetime';

const pricingOptions: { id: PricingOption; label: string; price: string; detail: string; badge?: string; priceId: string }[] = [
  { id: 'monthly', label: 'Monthly', price: '$9.99', detail: '/month', priceId: MONTHLY_PRICE_ID },
  { id: 'yearly', label: 'Yearly', price: '$79.99', detail: '/year', badge: 'Save 33%', priceId: YEARLY_PRICE_ID },
  { id: 'lifetime', label: 'Lifetime', price: '$199.99', detail: 'one-time', badge: 'Best Value', priceId: LIFETIME_PRICE_ID },
];

const features = [
  'AI Intelligence Feed — daily market analysis',
  'COMEX Vault Watch — warehouse inventory data',
  'Troy — personal portfolio AI chat',
  "Troy's Take — morning market briefing",
  'AI Deal Finder — best prices on bullion',
  'Spot Price History — full historical charts',
  'Advanced Analytics — portfolio deep dive',
];

export function PricingModal({ isOpen, onClose, currentTier }: PricingModalProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<PricingOption>('monthly');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAlreadyGold = currentTier === 'gold' || currentTier === 'lifetime';

  const handleSubscribe = async () => {
    const option = pricingOptions.find((o) => o.id === selected);
    if (!option?.priceId) {
      setError('This plan is not available yet');
      return;
    }

    // If not signed in, redirect to auth with checkout intent
    if (!user) {
      onClose();
      navigate(`/auth?redirect=checkout&plan=${selected}`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { url } = await createCheckoutSession(user.id, option.priceId);
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start checkout');
      setLoading(false);
    }
  };

  const selectedOption = pricingOptions.find((o) => o.id === selected)!;

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
            className="relative max-w-md w-full bg-surface border border-border rounded-xl p-6 max-h-[90vh] overflow-y-auto"
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
            <div className="text-center mb-5">
              <div className="w-12 h-12 mx-auto rounded-full bg-gold/15 flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gold mb-1">Upgrade to Gold</h2>
              <p className="text-sm text-text-muted">Full access to AI intelligence, analytics, and tools</p>
            </div>

            {/* Free plan note */}
            <div className="text-xs text-text-muted text-center mb-5 px-2">
              Free plan includes portfolio tracking, live spot prices, and basic analytics.
            </div>

            {/* Error */}
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-500 text-sm text-center">
                {error}
              </div>
            )}

            {isAlreadyGold ? (
              <div className="text-center py-6">
                <div className="w-12 h-12 mx-auto rounded-full bg-green-500/10 flex items-center justify-center mb-3">
                  <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </div>
                <p className="text-sm font-medium">You're already a Gold member!</p>
                <p className="text-xs text-text-muted mt-1">
                  {currentTier === 'lifetime' ? 'Lifetime access — enjoy!' : 'Manage your subscription in Settings.'}
                </p>
              </div>
            ) : (
              <>
                {/* Pricing Options */}
                <div className="space-y-2 mb-5">
                  {pricingOptions.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => setSelected(option.id)}
                      className={`w-full flex items-center justify-between p-3.5 rounded-lg border transition-colors ${
                        selected === option.id
                          ? 'border-gold bg-gold/5'
                          : 'border-border bg-background hover:border-border/80'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {/* Radio dot */}
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                          selected === option.id ? 'border-gold' : 'border-text-muted/40'
                        }`}>
                          {selected === option.id && (
                            <div className="w-2 h-2 rounded-full bg-gold" />
                          )}
                        </div>
                        <div className="text-left">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{option.label}</span>
                            {option.badge && (
                              <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-gold/15 text-gold">
                                {option.badge}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-bold">{option.price}</span>
                        <span className="text-xs text-text-muted ml-1">{option.detail}</span>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Features */}
                <div className="mb-5">
                  <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-2.5">Everything in Gold</p>
                  <ul className="space-y-2">
                    {features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm">
                        <svg className="w-4 h-4 mt-0.5 shrink-0 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                        <span className="text-text-secondary">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* CTA Button */}
                <button
                  onClick={handleSubscribe}
                  disabled={loading}
                  className="w-full py-3 px-4 bg-gold text-background font-medium rounded-lg hover:bg-gold-hover transition-colors disabled:opacity-50"
                >
                  {loading
                    ? 'Redirecting to checkout...'
                    : selected === 'lifetime'
                    ? `Get Lifetime Access — ${selectedOption.price}`
                    : `Start 7-Day Free Trial — then ${selectedOption.price}${selectedOption.detail}`}
                </button>
                {selected !== 'lifetime' && (
                  <p className="text-center text-xs text-text-muted mt-2">
                    Cancel anytime during your trial. No charge until day 8.
                  </p>
                )}
              </>
            )}

            {/* Footer */}
            <p className="text-center text-xs text-text-muted mt-4">
              {selected === 'lifetime' ? 'One-time payment. No recurring charges.' : '7-day free trial. Cancel anytime.'} Powered by Stripe.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
