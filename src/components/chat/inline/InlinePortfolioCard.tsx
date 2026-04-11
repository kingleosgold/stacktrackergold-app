import { cardClass, fmtUSD, fmtPct, gainColor, asNumber } from './cardStyles';

interface Props {
  data: Record<string, unknown>;
}

interface Holding {
  metal?: string;
  type?: string;
  qty?: number | string;
  totalOz?: number | string;
  totalCost?: number | string;
  currentValue?: number | string;
  gainLoss?: number | string;
  gainLossPct?: number | string;
}

export function InlinePortfolioCard({ data }: Props) {
  const totalValue = asNumber(data.totalValue);
  const totalCost = asNumber(data.totalCost);
  const totalGain = asNumber(data.totalGain) ?? (totalValue != null && totalCost != null ? totalValue - totalCost : undefined);
  const totalGainPercent = asNumber(data.totalGainPercent);
  const holdings = Array.isArray(data.holdings) ? (data.holdings as Holding[]) : [];
  const metalTotals = data.metalTotals as Record<string, { value?: number; oz?: number }> | undefined;

  return (
    <div className={cardClass}>
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-xs uppercase tracking-wider text-text-muted">Your Stack</span>
        <span className="text-[10px] text-text-muted">{holdings.length} {holdings.length === 1 ? 'holding' : 'holdings'}</span>
      </div>
      <div className="text-2xl font-semibold text-[#DAA520]">{fmtUSD(totalValue)}</div>
      {totalGain != null && (
        <div className={`text-xs mt-0.5 ${gainColor(totalGain)}`}>
          {totalGain >= 0 ? '▲' : '▼'} {fmtUSD(Math.abs(totalGain))}
          {totalGainPercent != null && <span className="ml-1">({fmtPct(totalGainPercent)})</span>}
        </div>
      )}

      {metalTotals && Object.keys(metalTotals).length > 0 && (
        <div className="mt-3 space-y-1 pt-3 border-t border-white/5">
          {Object.entries(metalTotals).map(([metal, tot]) => {
            const value = asNumber(tot?.value);
            const oz = asNumber(tot?.oz);
            return (
              <div key={metal} className="flex justify-between text-xs">
                <span className="capitalize text-text-secondary">{metal}</span>
                <span className="text-text">
                  {oz != null && <span className="text-text-muted mr-2">{oz.toFixed(2)} oz</span>}
                  {fmtUSD(value)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
