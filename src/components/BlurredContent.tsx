import { useState } from 'react';
import { useSubscription } from '../hooks/useSubscription';
import { PricingModal } from './PricingModal';

interface BlurredContentProps {
  children: React.ReactNode;
  /** Gold text link shown below blurred content */
  upgradeText?: string;
  /** If true, show children fully (override blur) */
  show?: boolean;
}

export function BlurredContent({ children, upgradeText = 'Try Gold Free for 7 Days', show }: BlurredContentProps) {
  const { isGold, tier } = useSubscription();
  const [showPricing, setShowPricing] = useState(false);

  if (isGold || show) return <>{children}</>;

  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none select-none" style={{ filter: 'blur(6px)' }}>
        {children}
      </div>
      {upgradeText && (
        <button
          onClick={() => setShowPricing(true)}
          className="block mt-2.5 text-sm text-gold hover:text-gold-hover hover:underline transition-all cursor-pointer opacity-90 hover:opacity-100"
        >
          {upgradeText} <span aria-hidden="true">&rarr;</span>
        </button>
      )}
      <PricingModal
        isOpen={showPricing}
        onClose={() => setShowPricing(false)}
        currentTier={tier}
      />
    </div>
  );
}
