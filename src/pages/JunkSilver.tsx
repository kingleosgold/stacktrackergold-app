import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchSpotPrices, type SpotPrices } from '../services/api';
import { LoadingState, ErrorState } from '../components/LoadState';

interface CoinType {
  id: string;
  name: string;
  sub: string;
  /** troy oz of actual silver per coin */
  silverPerCoin: number;
  /** face value in USD (used for the face-value shortcut) */
  faceValue: number;
}

const COIN_TYPES: CoinType[] = [
  { id: 'dime', name: 'Mercury / Roosevelt Dime', sub: 'Pre-1965 · 90% silver', silverPerCoin: 0.0723, faceValue: 0.10 },
  { id: 'quarter', name: 'Washington Quarter', sub: 'Pre-1965 · 90% silver', silverPerCoin: 0.1808, faceValue: 0.25 },
  { id: 'half', name: 'Walking Liberty / Franklin / Kennedy Half', sub: 'Pre-1965 · 90% silver', silverPerCoin: 0.3617, faceValue: 0.50 },
  { id: 'kennedy40', name: 'Kennedy Half Dollar', sub: '1965–1970 · 40% silver', silverPerCoin: 0.1479, faceValue: 0.50 },
  { id: 'dollar', name: 'Morgan / Peace Dollar', sub: 'Pre-1935 · 90% silver', silverPerCoin: 0.7734, faceValue: 1.00 },
  { id: 'warnickel', name: 'Jefferson War Nickel', sub: '1942–1945 · 35% silver', silverPerCoin: 0.0563, faceValue: 0.05 },
];

type Mode = 'quantity' | 'face';

function fmtUSD(n: number): string {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
}

export default function JunkSilver() {
  const [prices, setPrices] = useState<SpotPrices | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('quantity');
  const [values, setValues] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const p = await fetchSpotPrices();
      setPrices(p);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load spot prices.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const spot = prices?.silver ?? 0;

  const rows = useMemo(() => {
    return COIN_TYPES.map((coin) => {
      const raw = parseFloat(values[coin.id] || '') || 0;
      let count: number;
      if (mode === 'quantity') {
        count = raw;
      } else {
        // face value mode: raw is $ face value, convert to coin count
        count = coin.faceValue > 0 ? raw / coin.faceValue : 0;
      }
      const silverOz = count * coin.silverPerCoin;
      const value = silverOz * spot;
      return { coin, count, silverOz, value, input: raw };
    });
  }, [values, mode, spot]);

  const totals = useMemo(() => {
    const oz = rows.reduce((s, r) => s + r.silverOz, 0);
    const value = rows.reduce((s, r) => s + r.value, 0);
    return { oz, value };
  }, [rows]);

  const setVal = (id: string, v: string) => setValues((prev) => ({ ...prev, [id]: v }));

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-white">Junk Silver Melt Value Calculator</h1>
        <p className="text-sm text-[#94A3B8] mt-1">
          Calculate the silver melt value of pre-1965 US coins.
          {prices && (
            <span className="ml-1.5">
              Spot silver: <span style={{ color: '#C9A84C' }}>{fmtUSD(spot)}/oz</span>
            </span>
          )}
        </p>
      </header>

      {loading ? (
        <LoadingState label="Loading spot silver…" />
      ) : error ? (
        <ErrorState message="Unable to load spot silver." onRetry={load} />
      ) : (
        <div className="space-y-4">
          {/* Mode toggle */}
          <div
            className="inline-flex p-1 rounded-lg border"
            style={{ background: '#141B2D', borderColor: 'rgba(201,168,76,0.1)' }}
          >
            <button
              onClick={() => setMode('quantity')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                mode === 'quantity' ? 'text-[#0B1120]' : 'text-[#94A3B8] hover:text-white'
              }`}
              style={mode === 'quantity' ? { background: '#C9A84C' } : undefined}
            >
              Enter quantity
            </button>
            <button
              onClick={() => setMode('face')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                mode === 'face' ? 'text-[#0B1120]' : 'text-[#94A3B8] hover:text-white'
              }`}
              style={mode === 'face' ? { background: '#C9A84C' } : undefined}
            >
              Enter face value
            </button>
          </div>

          {/* Coin rows */}
          <div
            className="rounded-xl border divide-y overflow-hidden"
            style={{ background: '#141B2D', borderColor: 'rgba(201,168,76,0.1)' }}
          >
            {rows.map(({ coin, silverOz, value }) => (
              <div
                key={coin.id}
                className="flex items-center gap-3 px-4 py-3"
                style={{ borderColor: 'rgba(255,255,255,0.04)' }}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white truncate">{coin.name}</div>
                  <div className="text-[11px] text-[#94A3B8] truncate">{coin.sub}</div>
                </div>
                <input
                  type="number"
                  inputMode="decimal"
                  value={values[coin.id] ?? ''}
                  onChange={(e) => setVal(coin.id, e.target.value)}
                  placeholder={mode === 'quantity' ? '0' : '$0'}
                  className="w-20 px-2 py-1.5 rounded-md bg-white/[0.05] text-white text-sm text-right outline-none focus:bg-white/[0.08] tabular-nums"
                />
                <div className="w-20 text-right tabular-nums">
                  <div className="text-[10px] text-[#94A3B8]">{silverOz.toFixed(3)} oz</div>
                  <div className="text-sm font-semibold text-white">{fmtUSD(value)}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div
            className="rounded-xl p-5 border flex items-center justify-between"
            style={{ background: '#141B2D', borderColor: 'rgba(201,168,76,0.1)' }}
          >
            <div>
              <div className="text-[10px] uppercase tracking-wider text-[#94A3B8]">Total melt value</div>
              <div className="text-xs text-[#94A3B8] mt-1">{totals.oz.toFixed(3)} oz silver</div>
            </div>
            <div className="text-2xl font-semibold tabular-nums" style={{ color: '#C9A84C' }}>
              {fmtUSD(totals.value)}
            </div>
          </div>

          <p className="text-[11px] text-[#94A3B8] px-1">
            Melt values are theoretical — dealers typically pay a percentage of spot. Numismatic premiums for
            key dates or high grades are not included.
          </p>
        </div>
      )}
    </div>
  );
}
