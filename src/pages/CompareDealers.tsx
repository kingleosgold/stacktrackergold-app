import { useCallback, useEffect, useState } from 'react';
import { fetchDealerPrices, type DealerPriceRow } from '../services/api';
import { LoadingState } from '../components/LoadState';

interface StaticDealer {
  id: string;
  name: string;
  tagline: string;
  homepage: string;
  links: Array<{ label: string; url: string }>;
}

// Affiliate URLs mirrored from TroyStack mobile CODEBASE.md (FlexOffers + Awin)
const STATIC_DEALERS: StaticDealer[] = [
  {
    id: 'apmex',
    name: 'APMEX',
    tagline: 'Largest online precious metals retailer.',
    homepage: 'https://track.flexlinkspro.com/g.ashx?foid=156074.13444.1099573&trid=1546671.246173&foc=16&fot=9999&fos=6',
    links: [
      { label: 'Silver Eagles', url: 'https://track.flexlinkspro.com/g.ashx?foid=156074.13444.1055589&trid=1546671.246173&foc=16&fot=9999&fos=6' },
      { label: 'Gold Eagles', url: 'https://track.flexlinkspro.com/g.ashx?foid=156074.13444.1055590&trid=1546671.246173&foc=16&fot=9999&fos=6' },
      { label: 'Best Sellers', url: 'https://track.flexlinkspro.com/g.ashx?foid=156074.13444.1055574&trid=1546671.246173&foc=16&fot=9999&fos=6' },
    ],
  },
  {
    id: 'sdbullion',
    name: 'SD Bullion',
    tagline: 'Low premium bullion — often the cheapest dealer on spot.',
    homepage: 'https://www.awin1.com/cread.php?awinmid=78598&awinaffid=2844460&ued=https%3A%2F%2Fsdbullion.com',
    links: [
      { label: 'Silver Eagles', url: 'https://www.awin1.com/cread.php?awinmid=78598&awinaffid=2844460&ued=https%3A%2F%2Fsdbullion.com%2Fsilver%2Fus-mint-american-silver-eagle-coins%2Fsilver-american-eagles-1-ounce' },
      { label: 'Gold Eagles', url: 'https://www.awin1.com/cread.php?awinmid=78598&awinaffid=2844460&ued=https%3A%2F%2Fsdbullion.com%2Fgold%2Famerican-gold-eagle-coins' },
      { label: 'Gold Coins', url: 'https://www.awin1.com/cread.php?awinmid=78598&awinaffid=2844460&ued=https%3A%2F%2Fsdbullion.com%2Fgold%2Fgold-coins' },
      { label: 'Deals', url: 'https://www.awin1.com/cread.php?awinmid=78598&awinaffid=2844460&ued=https%3A%2F%2Fsdbullion.com%2Fdeals' },
    ],
  },
];

function fmtUSD(n: number | undefined | null): string {
  if (n == null || Number.isNaN(n)) return '—';
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
}

function fmtPremium(n: number | undefined | null): string {
  if (n == null || Number.isNaN(n)) return '—';
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}%`;
}

function DealerFallbackCards() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-[#94A3B8]">
        Dealer price comparison is coming soon. In the meantime, check these trusted dealers:
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {STATIC_DEALERS.map((d) => (
          <div
            key={d.id}
            className="rounded-xl p-5 border flex flex-col"
            style={{ background: '#141B2D', borderColor: 'rgba(201,168,76,0.1)' }}
          >
            <div className="flex items-center gap-3 mb-2">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm"
                style={{ background: 'rgba(201,168,76,0.15)', color: '#C9A84C' }}
              >
                {d.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-base font-semibold text-white">{d.name}</div>
                <div className="text-[11px] text-[#94A3B8]">{d.tagline}</div>
              </div>
            </div>

            <div className="mt-2 flex flex-wrap gap-1.5">
              {d.links.map((l) => (
                <a
                  key={l.label}
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer sponsored"
                  className="px-2.5 py-1 rounded-md text-[11px] text-[#94A3B8] hover:text-white transition-colors"
                  style={{ background: 'rgba(255,255,255,0.05)' }}
                >
                  {l.label}
                </a>
              ))}
            </div>

            <a
              href={d.homepage}
              target="_blank"
              rel="noopener noreferrer sponsored"
              className="mt-4 w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-[#0B1120] hover:opacity-90 transition-opacity"
              style={{ background: '#C9A84C' }}
            >
              Shop {d.name}
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
            </a>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-[#94A3B8] px-1">
        TroyStack earns an affiliate commission on qualifying purchases — at no extra cost to you.
      </p>
    </div>
  );
}

function DealerTable({ rows }: { rows: DealerPriceRow[] }) {
  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{ background: '#141B2D', borderColor: 'rgba(201,168,76,0.1)' }}
    >
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wider text-[#94A3B8]">
            <th className="px-5 py-3 font-medium">Dealer</th>
            <th className="px-5 py-3 font-medium">Product</th>
            <th className="px-5 py-3 font-medium text-right">Price</th>
            <th className="px-5 py-3 font-medium text-right">Premium</th>
            <th className="px-5 py-3 font-medium text-right"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const href = r.affiliate_url ?? r.url;
            return (
              <tr
                key={`${r.dealer}-${r.product}-${i}`}
                className={i > 0 ? 'border-t' : ''}
                style={{ borderColor: 'rgba(255,255,255,0.04)' }}
              >
                <td className="px-5 py-3.5 text-white font-medium">{r.dealer}</td>
                <td className="px-5 py-3.5 text-[#E5E7EB]">{r.product}</td>
                <td className="px-5 py-3.5 text-right tabular-nums" style={{ color: '#C9A84C' }}>
                  {fmtUSD(r.price)}
                </td>
                <td className="px-5 py-3.5 text-right text-[#94A3B8] tabular-nums">
                  {fmtPremium(r.premium_over_spot)}
                </td>
                <td className="px-5 py-3.5 text-right">
                  {href && (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer sponsored"
                      className="inline-block px-3 py-1.5 rounded-md text-[11px] font-semibold text-[#0B1120]"
                      style={{ background: '#C9A84C' }}
                    >
                      Shop
                    </a>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function CompareDealers() {
  const [rows, setRows] = useState<DealerPriceRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchDealerPrices();
      setRows(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load dealer prices.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-white">Compare Dealers</h1>
        <p className="text-sm text-[#94A3B8] mt-1">
          Live pricing across trusted bullion dealers.
        </p>
      </header>

      {loading ? (
        <LoadingState label="Fetching dealer prices…" />
      ) : error ? (
        // If the endpoint errored (scraper disabled / 4xx / 5xx), fall back
        // to static trusted-dealer cards. Still expose Retry for the user.
        <div className="space-y-6">
          <DealerFallbackCards />
          <div className="text-center">
            <button
              onClick={load}
              className="px-4 py-1.5 rounded-lg text-xs text-[#94A3B8] hover:text-white border border-white/10 hover:border-white/20 transition-colors"
            >
              Retry live pricing
            </button>
          </div>
        </div>
      ) : !rows || rows.length === 0 ? (
        <DealerFallbackCards />
      ) : (
        <DealerTable rows={rows} />
      )}
    </div>
  );
}
