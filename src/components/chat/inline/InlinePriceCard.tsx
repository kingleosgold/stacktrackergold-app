import { cardClass, fmtUSD, fmtPct, gainColor, asNumber } from './cardStyles';

interface Props {
  data: Record<string, unknown>;
}

const METALS = [
  { key: 'gold', label: 'Gold' },
  { key: 'silver', label: 'Silver' },
  { key: 'platinum', label: 'Platinum' },
  { key: 'palladium', label: 'Palladium' },
] as const;

export function InlinePriceCard({ data }: Props) {
  const change = (data.change ?? {}) as Record<string, { percent?: number; amount?: number } | undefined>;

  return (
    <div className={cardClass}>
      <div className="text-xs uppercase tracking-wider text-text-muted mb-2">Spot Prices</div>
      <div className="grid grid-cols-2 gap-2">
        {METALS.map(({ key, label }) => {
          const price = asNumber(data[`${key}Price`]) ?? asNumber(data[key]);
          const pct = asNumber(change[key]?.percent);
          if (price == null) return null;
          return (
            <div key={key} className="rounded-lg bg-white/[0.03] px-3 py-2">
              <div className="text-[10px] uppercase text-text-muted">{label}</div>
              <div className="text-sm font-semibold text-text">{fmtUSD(price)}</div>
              {pct != null && (
                <div className={`text-[10px] ${gainColor(pct)}`}>{fmtPct(pct)}</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
