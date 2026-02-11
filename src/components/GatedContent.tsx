import { useNavigate } from 'react-router-dom';
import { useSubscription } from '../hooks/useSubscription';

interface GatedContentProps {
  children: React.ReactNode;
  requiredTier: 'gold' | 'platinum';
  featureName?: string;
}

export function GatedContent({ children, requiredTier, featureName }: GatedContentProps) {
  const { isGoldOrHigher, isPlatinum } = useSubscription();
  const navigate = useNavigate();

  const hasAccess = requiredTier === 'gold' ? isGoldOrHigher : isPlatinum;

  if (hasAccess) return <>{children}</>;

  const tierLabel = requiredTier === 'gold' ? 'Gold' : 'Platinum';

  return (
    <div className="relative">
      <div className="pointer-events-none select-none" style={{ filter: 'blur(8px)' }}>
        {children}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/60 rounded-xl">
        <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center mb-3">
          <svg className="w-5 h-5 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
        </div>
        <p className="text-sm font-semibold text-white mb-1">
          {featureName || 'This feature'} requires {tierLabel}
        </p>
        <button
          onClick={() => navigate('/settings')}
          className="mt-3 px-5 py-2 bg-gold text-background text-sm font-medium rounded-lg hover:bg-gold-hover transition-colors"
        >
          Upgrade to {tierLabel}
        </button>
      </div>
    </div>
  );
}
