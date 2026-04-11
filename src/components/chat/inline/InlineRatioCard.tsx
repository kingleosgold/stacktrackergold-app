import { cardClass, asNumber } from './cardStyles';

interface Props {
  data: Record<string, unknown>;
}

export function InlineRatioCard({ data }: Props) {
  const ratio = asNumber(data.ratio)
    ?? (asNumber(data.goldPrice) && asNumber(data.silverPrice)
      ? (asNumber(data.goldPrice)! / asNumber(data.silverPrice)!)
      : undefined);

  let context = '';
  if (ratio != null) {
    if (ratio > 85) context = 'Silver looks historically cheap vs gold.';
    else if (ratio > 70) context = 'Above historical average — silver relatively cheap.';
    else if (ratio < 50) context = 'Below historical average — gold relatively cheap.';
    else context = 'Near the long-run average.';
  }

  return (
    <div className={cardClass}>
      <div className="text-xs uppercase tracking-wider text-text-muted mb-1">Gold / Silver Ratio</div>
      <div className="text-3xl font-semibold text-[#DAA520]">
        {ratio != null ? ratio.toFixed(1) : '—'}
      </div>
      {context && <div className="text-xs text-text-secondary mt-1">{context}</div>}
    </div>
  );
}
