import { useCallback, useEffect, useState } from 'react';
import { fetchVaultData, type VaultDataPoint } from '../services/api';
import { LoadingState, ErrorState, EmptyState } from '../components/LoadState';

const METALS = [
  { key: 'gold', label: 'Gold' },
  { key: 'silver', label: 'Silver' },
  { key: 'platinum', label: 'Platinum' },
  { key: 'palladium', label: 'Palladium' },
] as const;

function fmtOz(n: number | undefined | null): string {
  if (n == null || Number.isNaN(n)) return '—';
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function fmtChange(n: number | undefined | null): { text: string; color: string } {
  if (n == null || Number.isNaN(n) || n === 0) return { text: '—', color: '#94A3B8' };
  const sign = n > 0 ? '+' : '';
  return {
    text: `${sign}${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
    color: n > 0 ? '#22C55E' : '#EF4444',
  };
}

function formatAsOf(iso?: string): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '';
  }
}

export default function VaultWatch() {
  const [data, setData] = useState<Record<string, VaultDataPoint[]> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchVaultData('comex', 30);
      setData(res.data as Record<string, VaultDataPoint[]>);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const rows = METALS.map(({ key, label }) => {
    const series = data?.[key] ?? [];
    const sorted = [...series].sort((a, b) => (a.date < b.date ? 1 : -1));
    const latest = sorted[0];
    return { key, label, latest };
  });

  const asOf = rows.find((r) => r.latest)?.latest?.date;

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-white">Vault Watch</h1>
        <p className="text-sm text-[#94A3B8] mt-1">
          COMEX warehouse inventory — registered vs. eligible ounces.
          {asOf && <span className="ml-1.5">As of {formatAsOf(asOf)}.</span>}
        </p>
      </header>

      {loading ? (
        <LoadingState label="Fetching vault data…" />
      ) : error ? (
        <ErrorState message="Unable to load vault data." onRetry={load} />
      ) : !data || rows.every((r) => !r.latest) ? (
        <EmptyState message="No vault data available right now." />
      ) : (
        <>
          {/* Desktop table */}
          <div
            className="hidden md:block rounded-xl overflow-hidden border"
            style={{ background: '#141B2D', borderColor: 'rgba(201,168,76,0.1)' }}
          >
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-[#94A3B8]">
                  <th className="px-5 py-3 font-medium">Metal</th>
                  <th className="px-5 py-3 font-medium text-right">Registered (oz)</th>
                  <th className="px-5 py-3 font-medium text-right">Eligible (oz)</th>
                  <th className="px-5 py-3 font-medium text-right">Total (oz)</th>
                  <th className="px-5 py-3 font-medium text-right">Daily Δ (oz)</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const l = r.latest;
                  const totalChange =
                    (l?.registered_change_oz ?? 0) + (l?.eligible_change_oz ?? 0);
                  const ch = fmtChange(totalChange);
                  return (
                    <tr
                      key={r.key}
                      className={i > 0 ? 'border-t' : ''}
                      style={{ borderColor: 'rgba(255,255,255,0.04)' }}
                    >
                      <td className="px-5 py-3.5 font-medium text-white">{r.label}</td>
                      <td className="px-5 py-3.5 text-right text-[#E5E7EB] tabular-nums">
                        {fmtOz(l?.registered_oz)}
                      </td>
                      <td className="px-5 py-3.5 text-right text-[#E5E7EB] tabular-nums">
                        {fmtOz(l?.eligible_oz)}
                      </td>
                      <td
                        className="px-5 py-3.5 text-right font-semibold tabular-nums"
                        style={{ color: '#C9A84C' }}
                      >
                        {fmtOz(l?.combined_oz)}
                      </td>
                      <td className="px-5 py-3.5 text-right tabular-nums" style={{ color: ch.color }}>
                        {ch.text}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {rows.map((r) => {
              const l = r.latest;
              const totalChange = (l?.registered_change_oz ?? 0) + (l?.eligible_change_oz ?? 0);
              const ch = fmtChange(totalChange);
              return (
                <div
                  key={r.key}
                  className="rounded-xl p-4 border"
                  style={{ background: '#141B2D', borderColor: 'rgba(201,168,76,0.1)' }}
                >
                  <div className="flex items-baseline justify-between mb-3">
                    <h3 className="text-sm font-semibold text-white">{r.label}</h3>
                    <span className="text-xs tabular-nums" style={{ color: ch.color }}>{ch.text}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div>
                      <div className="text-[10px] uppercase text-[#94A3B8]">Registered</div>
                      <div className="text-[#E5E7EB] tabular-nums mt-0.5">{fmtOz(l?.registered_oz)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase text-[#94A3B8]">Eligible</div>
                      <div className="text-[#E5E7EB] tabular-nums mt-0.5">{fmtOz(l?.eligible_oz)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase text-[#94A3B8]">Total</div>
                      <div className="font-semibold tabular-nums mt-0.5" style={{ color: '#C9A84C' }}>
                        {fmtOz(l?.combined_oz)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
