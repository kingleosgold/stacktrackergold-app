import { useSpotPrices } from '../hooks/useSpotPrices';

function formatPrice(price: number | undefined): string {
  if (price === undefined) return '$--';
  return price >= 1000
    ? `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : `$${price.toFixed(2)}`;
}

function formatChange(amount?: number, percent?: number): { text: string; isPositive: boolean } | null {
  if (amount === undefined || percent === undefined) return null;
  const isPositive = amount >= 0;
  const sign = isPositive ? '+' : '';
  return {
    text: `${sign}${amount.toFixed(2)} (${sign}${percent.toFixed(2)}%)`,
    isPositive,
  };
}

interface PriceCardProps {
  label: string;
  price: number | undefined;
  change?: { amount?: number; percent?: number };
  isGold?: boolean;
  loading?: boolean;
}

function PriceCard({ label, price, change, isGold, loading }: PriceCardProps) {
  const changeInfo = formatChange(change?.amount, change?.percent);

  return (
    <div className="p-4 rounded-lg bg-surface border border-border">
      <p className="text-sm text-text-muted">{label}</p>
      {loading ? (
        <div className="h-7 w-20 bg-border rounded animate-pulse mt-1" />
      ) : (
        <>
          <p className={`text-xl font-semibold ${isGold ? 'text-gold' : 'text-text'}`}>
            {formatPrice(price)}
          </p>
          {changeInfo && (
            <p className={`text-xs mt-1 ${changeInfo.isPositive ? 'text-green-500' : 'text-red-500'}`}>
              {changeInfo.text}
            </p>
          )}
        </>
      )}
    </div>
  );
}

export default function SpotPrices() {
  const { prices, loading, error, refresh, lastUpdated } = useSpotPrices(5 * 60 * 1000); // Refresh every 5 min

  return (
    <div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <PriceCard
          label="Gold"
          price={prices?.gold}
          change={prices?.change?.gold}
          isGold
          loading={loading && !prices}
        />
        <PriceCard
          label="Silver"
          price={prices?.silver}
          change={prices?.change?.silver}
          loading={loading && !prices}
        />
        <PriceCard
          label="Platinum"
          price={prices?.platinum}
          loading={loading && !prices}
        />
        <PriceCard
          label="Palladium"
          price={prices?.palladium}
          loading={loading && !prices}
        />
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-text-muted">
        <div className="flex items-center gap-2">
          {prices?.source && (
            <span className="px-2 py-0.5 bg-surface rounded">
              {prices.source === 'metalpriceapi' ? 'Live' : prices.source}
            </span>
          )}
          {lastUpdated && (
            <span>
              Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className="px-2 py-1 hover:bg-surface-hover rounded transition-colors disabled:opacity-50"
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <p className="mt-2 text-xs text-red-500">{error}</p>
      )}
    </div>
  );
}
