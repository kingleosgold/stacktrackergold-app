import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchSpotPrices, type SpotPrices } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useHoldings } from '../hooks/useHoldings';
import { LoadingState, ErrorState } from '../components/LoadState';

function fmtUSD(n: number): string {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
}
function fmtPct(n: number): string {
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}

export default function SpeculationCalculator() {
  const { user } = useAuth();
  const { holdings, getTotalsByMetal, loading: holdingsLoading } = useHoldings();

  const [prices, setPrices] = useState<SpotPrices | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // What-if targets
  const [goldTarget, setGoldTarget] = useState<string>('');
  const [silverTarget, setSilverTarget] = useState<string>('');

  // Manual oz inputs (used when user is not signed in)
  const [manualGoldOz, setManualGoldOz] = useState<string>('');
  const [manualSilverOz, setManualSilverOz] = useState<string>('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const p = await fetchSpotPrices();
      setPrices(p);
      setGoldTarget(p.gold.toFixed(2));
      setSilverTarget(p.silver.toFixed(2));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load spot prices.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const totals = useMemo(() => {
    if (user && holdings.length > 0) return getTotalsByMetal();
    return null;
  }, [user, holdings, getTotalsByMetal]);

  const goldOz = totals?.gold?.totalOz ?? (parseFloat(manualGoldOz) || 0);
  const silverOz = totals?.silver?.totalOz ?? (parseFloat(manualSilverOz) || 0);

  const goldTargetNum = parseFloat(goldTarget) || 0;
  const silverTargetNum = parseFloat(silverTarget) || 0;

  const currentValue = prices ? goldOz * prices.gold + silverOz * prices.silver : 0;
  const projectedValue = goldOz * goldTargetNum + silverOz * silverTargetNum;
  const gainDollars = projectedValue - currentValue;
  const gainPct = currentValue > 0 ? (gainDollars / currentValue) * 100 : 0;

  const gainColor = gainDollars >= 0 ? '#22C55E' : '#EF4444';

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-white">Speculation Calculator</h1>
        <p className="text-sm text-[#94A3B8] mt-1">
          What if gold hits $3,500? What if silver hits $100? Plug in targets and see.
        </p>
      </header>

      {loading || (user && holdingsLoading) ? (
        <LoadingState label="Loading spot prices…" />
      ) : error ? (
        <ErrorState message="Unable to load spot prices." onRetry={load} />
      ) : !prices ? null : (
        <div className="space-y-4">
          {/* Spot price chip row */}
          <div
            className="rounded-xl p-4 border flex items-center justify-between"
            style={{ background: '#141B2D', borderColor: 'rgba(201,168,76,0.1)' }}
          >
            <div>
              <div className="text-[10px] uppercase tracking-wider text-[#94A3B8]">Current spot</div>
              <div className="text-sm text-white mt-1">
                Gold <span className="font-semibold" style={{ color: '#C9A84C' }}>{fmtUSD(prices.gold)}</span>
                <span className="mx-3 text-[#94A3B8]">·</span>
                Silver <span className="font-semibold" style={{ color: '#C9A84C' }}>{fmtUSD(prices.silver)}</span>
              </div>
            </div>
          </div>

          {/* Holdings source */}
          <div
            className="rounded-xl p-4 border"
            style={{ background: '#141B2D', borderColor: 'rgba(201,168,76,0.1)' }}
          >
            <div className="text-[10px] uppercase tracking-wider text-[#94A3B8] mb-3">Your holdings</div>
            {user && totals ? (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-[#94A3B8]">Gold</div>
                  <div className="text-white font-semibold mt-0.5">{goldOz.toFixed(3)} oz</div>
                </div>
                <div>
                  <div className="text-[#94A3B8]">Silver</div>
                  <div className="text-white font-semibold mt-0.5">{silverOz.toFixed(3)} oz</div>
                </div>
              </div>
            ) : user ? (
              <p className="text-sm text-[#94A3B8]">
                No holdings yet. Enter test amounts below, or add holdings to My Stack.
              </p>
            ) : (
              <p className="text-sm text-[#94A3B8]">Not signed in — enter test amounts below.</p>
            )}

            {(!user || holdings.length === 0) && (
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-[#94A3B8] mb-1">Gold oz</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={manualGoldOz}
                    onChange={(e) => setManualGoldOz(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.05] text-white text-sm outline-none focus:bg-white/[0.08]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-[#94A3B8] mb-1">Silver oz</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={manualSilverOz}
                    onChange={(e) => setManualSilverOz(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.05] text-white text-sm outline-none focus:bg-white/[0.08]"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Targets */}
          <div
            className="rounded-xl p-4 border"
            style={{ background: '#141B2D', borderColor: 'rgba(201,168,76,0.1)' }}
          >
            <div className="text-[10px] uppercase tracking-wider text-[#94A3B8] mb-3">Target prices</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-[#94A3B8] mb-1">Gold target ($/oz)</label>
                <input
                  type="number"
                  inputMode="decimal"
                  value={goldTarget}
                  onChange={(e) => setGoldTarget(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white/[0.05] text-white text-sm outline-none focus:bg-white/[0.08]"
                />
              </div>
              <div>
                <label className="block text-xs text-[#94A3B8] mb-1">Silver target ($/oz)</label>
                <input
                  type="number"
                  inputMode="decimal"
                  value={silverTarget}
                  onChange={(e) => setSilverTarget(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white/[0.05] text-white text-sm outline-none focus:bg-white/[0.08]"
                />
              </div>
            </div>
          </div>

          {/* Results */}
          <div
            className="rounded-xl p-5 border"
            style={{ background: '#141B2D', borderColor: 'rgba(201,168,76,0.1)' }}
          >
            <div className="text-[10px] uppercase tracking-wider text-[#94A3B8] mb-3">Projection</div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <div className="text-xs text-[#94A3B8]">Current value</div>
                <div className="text-lg font-semibold text-white mt-0.5 tabular-nums">{fmtUSD(currentValue)}</div>
              </div>
              <div>
                <div className="text-xs text-[#94A3B8]">Projected value</div>
                <div className="text-lg font-semibold tabular-nums mt-0.5" style={{ color: '#C9A84C' }}>
                  {fmtUSD(projectedValue)}
                </div>
              </div>
            </div>
            <div className="pt-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-[#94A3B8]">Change</span>
                <span className="text-base font-semibold tabular-nums" style={{ color: gainColor }}>
                  {gainDollars >= 0 ? '+' : ''}{fmtUSD(gainDollars)}
                  <span className="ml-2 text-xs">{fmtPct(gainPct)}</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
