import { cardClass, fmtNum, asNumber } from './cardStyles';

interface Props {
  data: Record<string, unknown>;
}

interface Row {
  label: string;
  value: number | undefined;
  unit: string;
}

export function InlinePurchasingPowerCard({ data }: Props) {
  const rows: Row[] = [
    { label: 'Stack → Barrels of oil', value: asNumber(data.stackBarrelsOfOil), unit: 'barrels' },
    { label: 'Stack → Months of rent', value: asNumber(data.stackMonthsOfRent), unit: 'months' },
    { label: 'Stack → Hours of labor', value: asNumber(data.stackHoursOfLabor), unit: 'hrs' },
    { label: '1 oz gold → Barrels of oil', value: asNumber(data.goldPerBarrelOfOil), unit: 'barrels' },
    { label: '1 oz gold → Months of rent', value: asNumber(data.goldPerMedianRent), unit: 'months' },
    { label: '1 oz gold → Hours of labor', value: asNumber(data.goldPerHoursOfLabor), unit: 'hrs' },
    { label: '1 oz silver → Gallons of gas', value: asNumber(data.silverPerGallonOfGas) ?? asNumber(data.goldPerGallonOfGas), unit: 'gal' },
  ].filter((r): r is Row & { value: number } => r.value != null);

  return (
    <div className={cardClass}>
      <div className="text-xs uppercase tracking-wider text-text-muted mb-2">Purchasing Power</div>
      <div className="space-y-1.5">
        {rows.length === 0 && <div className="text-xs text-text-muted">No data available.</div>}
        {rows.map((r) => (
          <div key={r.label} className="flex justify-between items-baseline text-xs">
            <span className="text-text-secondary">{r.label}</span>
            <span className="text-[#DAA520] font-semibold">
              {fmtNum(r.value, 1)} <span className="text-text-muted font-normal text-[10px]">{r.unit}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
