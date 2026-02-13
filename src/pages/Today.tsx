import { useMemo, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Area, AreaChart, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { useHoldings } from '../hooks/useHoldings';
import { useSpotPrices } from '../hooks/useSpotPrices';
import { useSubscription } from '../hooks/useSubscription';
import { fetchSparklineData, fetchIntelligence, fetchVaultData } from '../services/api';
import type { PriceLogEntry, IntelligenceBrief, VaultDataPoint } from '../services/api';
import { formatCurrency, formatPercent, formatChange } from '../utils/format';
import { METAL_COLORS, METAL_LABELS, METALS } from '../utils/constants';
import { CardSkeleton } from '../components/Skeleton';
import { BlurredContent } from '../components/BlurredContent';
import { PricingModal } from '../components/PricingModal';
import { AdvisorChat } from '../components/AdvisorChat';
import type { Metal } from '../types/holding';

const BANNER_DISMISS_KEY = 'stg_upgrade_banner_dismissed';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' as const } },
};

const METAL_PRICE_KEY: Record<Metal, keyof PriceLogEntry> = {
  gold: 'gold_price',
  silver: 'silver_price',
  platinum: 'platinum_price',
  palladium: 'palladium_price',
};

const CATEGORY_COLORS: Record<string, string> = {
  market_brief: '#D4A843',
  breaking_news: '#F87171',
  policy: '#60A5FA',
  supply_demand: '#6BBF8A',
  analysis: '#C084FC',
};

const CATEGORY_LABELS: Record<string, string> = {
  market_brief: 'Market Brief',
  breaking_news: 'Breaking News',
  policy: 'Policy',
  supply_demand: 'Supply & Demand',
  analysis: 'Analysis',
};

// ─── Helper Components ────────────────────────────────────────

function MiniSparkline({ data, color, id, label }: {
  data: { v: number; time?: string }[];
  color: string;
  id?: string;
  label?: string;
}) {
  if (data.length < 2) return null;
  const gradId = `spark-${id || 'mini'}`;

  const formatTime = (iso: string) => {
    if (!iso) return '';
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Tight Y-axis domain: show actual volatility instead of flat line
  const values = data.map((d) => d.v).filter((v) => v > 0);
  const dataMin = Math.min(...values);
  const dataMax = Math.max(...values);
  const range = dataMax - dataMin;
  const mean = (dataMin + dataMax) / 2;
  const minRange = mean * 0.005;
  const effectiveRange = Math.max(range, minRange);
  const padding = effectiveRange * 0.1;
  const yDomain: [number, number] = [
    (range < minRange ? mean - effectiveRange / 2 : dataMin) - padding,
    (range < minRange ? mean + effectiveRange / 2 : dataMax) + padding,
  ];

  return (
    <div className="relative w-16 h-8">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.15} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <YAxis hide domain={yDomain} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--color-chart-bg)',
              border: '1px solid var(--color-chart-border)',
              borderRadius: '8px',
              fontSize: '11px',
              padding: '6px 10px',
              whiteSpace: 'nowrap' as const,
            }}
            wrapperStyle={{ transform: 'translateY(-100%)', marginTop: '-8px', zIndex: 50 }}
            labelStyle={{ display: 'none' }}
            formatter={(value: number | undefined, _name: string | undefined, entry: any) => {
              if (value == null) return ['--', ''];
              const time = entry?.payload?.time;
              const timeStr = time ? formatTime(time) : '';
              const priceStr = formatCurrency(value);
              const text = label
                ? (timeStr ? `${label}: ${priceStr} · ${timeStr}` : `${label}: ${priceStr}`)
                : (timeStr ? `${priceStr} · ${timeStr}` : priceStr);
              return [text, ''];
            }}
            cursor={{ stroke: 'var(--color-text-muted)', strokeWidth: 1, strokeDasharray: '3 3' }}
          />
          <Area
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={1.5}
            fill={`url(#${gradId})`}
            dot={false}
            activeDot={{ r: 3, fill: color, stroke: 'var(--color-surface)', strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function PortfolioSparkline({ data, color, sparklineRaw }: {
  data: { v: number }[];
  color: string;
  sparklineRaw: PriceLogEntry[];
}) {
  if (data.length < 2) return null;
  const gradId = 'portfolio-spark-fill';

  const chartData = useMemo(() => {
    return data.map((d, i) => ({
      v: d.v,
      time: sparklineRaw[i]?.created_at || '',
    }));
  }, [data, sparklineRaw]);

  const values = chartData.map((d) => d.v).filter((v) => v > 0);
  const dataMin = Math.min(...values);
  const dataMax = Math.max(...values);
  const range = dataMax - dataMin;
  const mean = (dataMin + dataMax) / 2;
  const minRange = mean * 0.01;
  const effectiveRange = Math.max(range, minRange);
  const padding = effectiveRange * 0.1;
  const yDomain: [number, number] = [
    (range < minRange ? mean - effectiveRange / 2 : dataMin) - padding,
    (range < minRange ? mean + effectiveRange / 2 : dataMax) + padding,
  ];

  const formatTime = (iso: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="w-32 h-12">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.15} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <YAxis hide domain={yDomain} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--color-chart-bg)',
              border: '1px solid var(--color-chart-border)',
              borderRadius: '8px',
              fontSize: '11px',
              padding: '6px 10px',
              whiteSpace: 'nowrap' as const,
            }}
            wrapperStyle={{ transform: 'translateY(-100%)', marginTop: '-8px', zIndex: 50 }}
            labelStyle={{ display: 'none' }}
            formatter={(value: number | undefined, _name: string | undefined, entry: any) => {
              if (value == null) return ['--', ''];
              const time = entry?.payload?.time;
              const timeStr = time ? formatTime(time) : '';
              return [timeStr ? `${formatCurrency(value)} · ${timeStr}` : formatCurrency(value), ''];
            }}
            cursor={{ stroke: 'var(--color-text-muted)', strokeWidth: 1, strokeDasharray: '3 3' }}
          />
          <Area
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={1.5}
            fill={`url(#${gradId})`}
            dot={false}
            activeDot={{ r: 3, fill: color, stroke: 'var(--color-surface)', strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function IntelligenceBriefCard({
  brief,
  expanded,
  onToggle,
}: {
  brief: IntelligenceBrief;
  expanded: boolean;
  onToggle: () => void;
}) {
  const borderColor = CATEGORY_COLORS[brief.category] || '#D4A843';
  const categoryLabel = CATEGORY_LABELS[brief.category] || brief.category;
  const time = new Date(brief.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <motion.div
      layout
      onClick={onToggle}
      className="rounded-lg bg-surface-alt border border-border hover:border-border-light transition-colors cursor-pointer overflow-hidden"
      style={{ borderLeftWidth: '3px', borderLeftColor: borderColor }}
    >
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <span
            className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
            style={{ backgroundColor: `${borderColor}15`, color: borderColor }}
          >
            {categoryLabel}
          </span>
          <span className="text-[10px] text-text-muted">{time}</span>
        </div>
        <h4 className="text-sm font-semibold text-text leading-snug">{brief.title}</h4>
        <AnimatePresence>
          {expanded ? (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <p className="text-xs text-text-secondary mt-2 leading-relaxed">{brief.summary}</p>
              {brief.source_url && (
                <a
                  href={brief.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1 text-[11px] text-gold hover:text-gold-hover mt-2 transition-colors"
                >
                  {brief.source || 'Source'}
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                  </svg>
                </a>
              )}
            </motion.div>
          ) : (
            <p className="text-xs text-text-muted mt-1 line-clamp-2">{brief.summary}</p>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function VaultWatchPanel({
  vaultData,
  selectedMetal,
  onSelectMetal,
  isGold,
}: {
  vaultData: Record<Metal, VaultDataPoint[]> | null;
  selectedMetal: Metal;
  onSelectMetal: (m: Metal) => void;
  isGold: boolean;
}) {
  const metalData = vaultData?.[selectedMetal] || [];
  const latest = metalData.length > 0 ? metalData[metalData.length - 1] : null;

  const formatMOz = (oz: number) => {
    if (oz >= 1_000_000) return `${(oz / 1_000_000).toFixed(2)}M`;
    if (oz >= 1_000) return `${(oz / 1_000).toFixed(1)}K`;
    return oz.toFixed(0);
  };

  const ratioColor = (ratio: number) => {
    if (ratio >= 1.0) return { color: 'var(--color-green)', label: 'Healthy' };
    if (ratio >= 0.5) return { color: '#eab308', label: 'Moderate' };
    return { color: 'var(--color-red)', label: 'Critical' };
  };

  const chartData = metalData.map((d) => ({
    date: d.date.slice(5),
    registered: d.registered_oz,
    eligible: d.eligible_oz,
  }));

  const vaultMetals: Metal[] = ['gold', 'silver', 'platinum', 'palladium'];

  return (
    <div>
      {/* Metal Tabs — always visible */}
      <div className="flex gap-1 mb-4">
        {vaultMetals.map((m) => (
          <button
            key={m}
            onClick={() => onSelectMetal(m)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              selectedMetal === m
                ? 'bg-gold/15 text-gold'
                : 'text-text-muted hover:text-text-secondary hover:bg-text/5'
            }`}
          >
            {METAL_LABELS[m]}
          </button>
        ))}
      </div>

      {metalData.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-xs text-text-muted">No COMEX vault data available for {METAL_LABELS[selectedMetal]}.</p>
        </div>
      ) : latest ? (
        <>
          {/* Registered — always visible */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-surface-alt rounded-lg p-3">
              <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Registered</p>
              <p className="text-sm font-bold">{formatMOz(latest.registered_oz)} oz</p>
            </div>
            {/* Eligible, Combined, Ratio — blurred for free */}
            <BlurredContent upgradeText="Full vault data with Gold" show={isGold}>
              <div className="bg-surface-alt rounded-lg p-3">
                <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Eligible</p>
                <p className="text-sm font-bold">{formatMOz(latest.eligible_oz)} oz</p>
              </div>
            </BlurredContent>
          </div>
          <BlurredContent upgradeText="Full vault data with Gold" show={isGold}>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-surface-alt rounded-lg p-3">
                <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Combined</p>
                <p className="text-sm font-bold">{formatMOz(latest.combined_oz)} oz</p>
              </div>
              <div className="bg-surface-alt rounded-lg p-3">
                <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Ratio</p>
                <p className="text-sm font-bold" style={{ color: ratioColor(latest.oversubscribed_ratio).color }}>
                  {latest.oversubscribed_ratio.toFixed(2)}x{' '}
                  <span className="text-[10px] font-normal">{ratioColor(latest.oversubscribed_ratio).label}</span>
                </p>
              </div>
            </div>

            {/* 30-Day Chart */}
            {chartData.length >= 2 && (
              <div className="h-36">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-chart-grid)" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: 'var(--color-chart-label)', fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                      interval="preserveStartEnd"
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--color-chart-bg)',
                        border: '1px solid var(--color-chart-border)',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                      labelStyle={{ color: 'var(--color-text-secondary)' }}
                      formatter={(value: number | undefined) =>
                        value != null ? [formatMOz(value) + ' oz', ''] : ['--', '']
                      }
                    />
                    <Line type="monotone" dataKey="registered" stroke="#D4A843" strokeWidth={1.5} dot={false} name="Registered" />
                    <Line type="monotone" dataKey="eligible" stroke="#C0C0C0" strokeWidth={1.5} dot={false} name="Eligible" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </BlurredContent>
        </>
      ) : null}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────

export default function Today() {
  const { holdings, getTotalsByMetal, loading: holdingsLoading } = useHoldings();
  const { prices, loading: pricesLoading, lastUpdated } = useSpotPrices(60000);
  const { isGold, tier } = useSubscription();
  const [sparklineRaw, setSparklineRaw] = useState<PriceLogEntry[]>([]);
  const [showPricing, setShowPricing] = useState(false);

  // Upgrade banner — dismissible per session (comes back next session)
  const [bannerDismissed, setBannerDismissed] = useState(() => {
    try {
      const stored = localStorage.getItem(BANNER_DISMISS_KEY);
      if (!stored) return false;
      // Check if dismissed today (resets each day)
      const dismissed = JSON.parse(stored);
      return dismissed.date === new Date().toISOString().split('T')[0];
    } catch { return false; }
  });
  const dismissBanner = () => {
    setBannerDismissed(true);
    try {
      localStorage.setItem(BANNER_DISMISS_KEY, JSON.stringify({ date: new Date().toISOString().split('T')[0] }));
    } catch { /* ignore */ }
  };

  // Intelligence state — always fetch for preview
  const [intelligence, setIntelligence] = useState<IntelligenceBrief[]>([]);
  const [intelligenceLoading, setIntelligenceLoading] = useState(false);
  const [expandedBriefId, setExpandedBriefId] = useState<string | null>(null);

  // Vault state — always fetch for preview
  const [vaultData, setVaultData] = useState<Record<Metal, VaultDataPoint[]> | null>(null);
  const [vaultLoading, setVaultLoading] = useState(false);
  const [selectedVaultMetal, setSelectedVaultMetal] = useState<Metal>('gold');

  // Fetch sparkline data
  useEffect(() => {
    fetchSparklineData().then(setSparklineRaw).catch(console.error);
  }, []);

  // Fetch intelligence (always, for preview)
  const loadIntelligence = useCallback(async () => {
    setIntelligenceLoading(true);
    try {
      const res = await fetchIntelligence();
      setIntelligence(res.briefs || []);
    } catch (e) {
      console.error('Failed to fetch intelligence:', e);
    } finally {
      setIntelligenceLoading(false);
    }
  }, []);

  useEffect(() => {
    loadIntelligence();
    const interval = setInterval(loadIntelligence, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadIntelligence]);

  // Fetch vault data (always, for preview)
  useEffect(() => {
    setVaultLoading(true);
    fetchVaultData('comex', 30)
      .then((res) => setVaultData(res.data))
      .catch((e) => console.error('Failed to fetch vault data:', e))
      .finally(() => setVaultLoading(false));
  }, []);

  // Build per-metal sparkline data with timestamps
  const sparklines = useMemo(() => {
    const result: Record<Metal, { v: number; time: string }[]> = {
      gold: [], silver: [], platinum: [], palladium: [],
    };
    for (const entry of sparklineRaw) {
      for (const metal of METALS) {
        const key = METAL_PRICE_KEY[metal];
        result[metal].push({ v: entry[key] as number, time: entry.created_at });
      }
    }
    return result;
  }, [sparklineRaw]);

  // Portfolio stats
  const stats = useMemo(() => {
    if (!prices) return null;
    const totals = getTotalsByMetal();

    let totalValue = 0;
    let totalCost = 0;

    const metalImpacts = METALS.map((metal) => {
      const data = totals[metal];
      const spotPrice = prices[metal] || 0;
      const value = data.totalOz * spotPrice;
      const changePercent = prices.change?.[metal]?.percent || 0;
      const dailyImpact = value * (changePercent / 100);

      totalValue += value;
      totalCost += data.totalCost;

      return { metal, totalOz: data.totalOz, value, dailyImpact, changePercent };
    }).filter((m) => m.totalOz > 0);

    const totalDailyChange = metalImpacts.reduce((sum, m) => sum + m.dailyImpact, 0);
    const totalDailyChangePercent = totalValue > 0 ? (totalDailyChange / (totalValue - totalDailyChange)) * 100 : 0;

    return {
      totalValue,
      totalCost,
      totalDailyChange,
      totalDailyChangePercent,
      metalImpacts: metalImpacts.sort((a, b) => Math.abs(b.dailyImpact) - Math.abs(a.dailyImpact)),
    };
  }, [holdings, prices, getTotalsByMetal]);

  // Portfolio Pulse narrative
  const pulseNarrative = useMemo(() => {
    if (!stats || stats.metalImpacts.length === 0) return null;
    const change = stats.totalDailyChange;
    const absChange = Math.abs(change);
    const pctAbs = Math.abs(stats.totalDailyChangePercent);

    if (pctAbs < 0.5) {
      return 'Your stack is flat today. Metals moved less than 0.5%.';
    }

    // Top mover by dollar impact (already sorted)
    const top = stats.metalImpacts[0];
    const metalName = METAL_LABELS[top.metal];
    const metalPct = Math.abs(top.changePercent).toFixed(1);

    if (change > 0) {
      return `Your stack gained ${formatCurrency(absChange)} today, driven by ${metalName}'s ${metalPct}% rally.`;
    }
    return `Your stack lost ${formatCurrency(absChange)} today as ${metalName} pulled back ${metalPct}%.`;
  }, [stats]);

  // Sort metal movers by abs change percent
  const sortedMetalMovers = useMemo(() => {
    if (!prices) return METALS;
    return [...METALS].sort((a, b) => {
      const aChange = Math.abs(prices.change?.[a]?.percent || 0);
      const bChange = Math.abs(prices.change?.[b]?.percent || 0);
      return bChange - aChange;
    });
  }, [prices]);

  const isLoading = holdingsLoading || pricesLoading;

  // Portfolio sparkline
  const portfolioSparkline = useMemo(() => {
    if (sparklineRaw.length < 2 || !holdings.length) return [];
    const totals = getTotalsByMetal();
    return sparklineRaw.map((entry) => {
      let value = 0;
      for (const metal of METALS) {
        const key = METAL_PRICE_KEY[metal];
        value += totals[metal].totalOz * (entry[key] as number);
      }
      return { v: value };
    });
  }, [sparklineRaw, holdings, getTotalsByMetal]);

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-8"
      >
        <div className="flex items-baseline gap-3">
          <h1 className="text-2xl font-bold tracking-tight">Today</h1>
          <span className="text-sm text-text-muted">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </span>
        </div>
        {lastUpdated && (
          <p className="text-xs text-text-muted mt-1">
            Live prices · Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
      </motion.div>

      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">

        {/* ─── Upgrade Banner (free users only) ────────────────── */}
        {!isGold && !bannerDismissed && (
          <motion.div
            variants={item}
            className="relative rounded-xl border border-gold/25 bg-gradient-to-r from-gold/[0.04] to-gold/[0.02] px-5 py-3.5 flex items-center gap-4"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm text-text">
                <span className="text-gold font-medium">Try Gold free for 7 days</span>
                <span className="text-text-muted"> — AI intelligence, vault data, and portfolio analytics</span>
              </p>
            </div>
            <button
              onClick={() => setShowPricing(true)}
              className="shrink-0 px-4 py-2 bg-gold text-background text-xs font-semibold rounded-lg hover:bg-gold-hover transition-colors"
            >
              Start Free Trial
            </button>
            <button
              onClick={dismissBanner}
              className="shrink-0 p-1 text-text-muted hover:text-text transition-colors rounded"
              aria-label="Dismiss"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </motion.div>
        )}

        {/* ─── Portfolio Pulse (FREE) ──────────────────────────── */}
        {isLoading ? (
          <CardSkeleton />
        ) : stats && holdings.length > 0 ? (
          <motion.div
            variants={item}
            className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gold-contrast via-surface to-surface border border-gold/10 p-6"
          >
            <div className="absolute top-0 right-0 w-48 h-48 bg-gold/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-gold animate-pulse" />
                <span className="text-xs font-medium text-gold uppercase tracking-wider">Portfolio Pulse</span>
              </div>
              <div className="flex items-end justify-between mt-4">
                <div>
                  <p className="text-4xl font-bold tracking-tight">{formatCurrency(stats.totalValue)}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className={`text-sm font-medium ${stats.totalDailyChange >= 0 ? 'text-green' : 'text-red'}`}>
                      {formatChange(stats.totalDailyChange)}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      stats.totalDailyChange >= 0
                        ? 'bg-green/10 text-green'
                        : 'bg-red/10 text-red'
                    }`}>
                      {formatPercent(stats.totalDailyChangePercent)}
                    </span>
                    <span className="text-xs text-text-muted">today</span>
                  </div>
                  {pulseNarrative && (
                    <p className="text-sm italic text-text-muted mt-2">{pulseNarrative}</p>
                  )}
                </div>
                {portfolioSparkline.length >= 2 && (
                  <PortfolioSparkline
                    data={portfolioSparkline}
                    color={stats.totalDailyChange >= 0 ? 'var(--color-green)' : 'var(--color-red)'}
                    sparklineRaw={sparklineRaw}
                  />
                )}
              </div>
            </div>
          </motion.div>
        ) : !isLoading && holdings.length === 0 ? (
          <motion.div
            variants={item}
            className="rounded-2xl bg-surface border border-border p-8 text-center"
          >
            <div className="w-12 h-12 mx-auto rounded-full bg-gold/10 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m6-6H6" />
              </svg>
            </div>
            <h3 className="font-semibold text-text mb-1">Start Your Stack</h3>
            <p className="text-sm text-text-muted mb-4">Add your first holding to see your portfolio pulse.</p>
            <a
              href="/portfolio"
              className="inline-block px-5 py-2.5 bg-gold text-background font-medium text-sm rounded-lg hover:bg-gold-hover transition-colors"
            >
              Add Holding
            </a>
          </motion.div>
        ) : null}

        {/* ─── Metal Movers (FREE) ────────────────────────────── */}
        <motion.div variants={item}>
          <h2 className="text-sm font-medium text-text-muted uppercase tracking-wider mb-0.5">Metal Movers</h2>
          <p className="text-[11px] text-text-muted mb-3">Live spot prices sorted by today's biggest moves</p>
          {isLoading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[1, 2, 3, 4].map((i) => <CardSkeleton key={i} />)}
            </div>
          ) : prices ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {sortedMetalMovers.map((metal) => {
                const price = prices[metal] || 0;
                const change = prices.change?.[metal];
                const changePercent = change?.percent || 0;
                const changeAmount = change?.amount || 0;
                const isPositive = changePercent >= 0;
                const color = METAL_COLORS[metal];
                const metalSparkline = sparklines[metal];

                return (
                  <motion.div
                    key={metal}
                    whileHover={{ y: -2 }}
                    transition={{ duration: 0.2 }}
                    className="relative rounded-xl bg-surface border border-border hover:border-border-light p-4 transition-colors"
                  >
                    <div
                      className="absolute top-0 left-0 right-0 h-[2px] rounded-t-xl"
                      style={{ backgroundColor: color }}
                    />
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold tracking-wide" style={{ color }}>
                        {METAL_LABELS[metal]}
                      </span>
                      {metalSparkline.length >= 2 && (
                        <MiniSparkline data={metalSparkline} color={color} id={metal} label={METAL_LABELS[metal]} />
                      )}
                    </div>
                    <p className="text-lg font-bold">{formatCurrency(price)}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {changeAmount !== 0 || changePercent !== 0 ? (
                        <>
                          <span className={`text-xs font-medium ${isPositive ? 'text-green' : 'text-red'}`}>
                            {isPositive ? '+' : ''}{changeAmount.toFixed(2)}
                          </span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                            isPositive ? 'bg-green/10 text-green' : 'bg-red/10 text-red'
                          }`}>
                            {formatPercent(changePercent)}
                          </span>
                        </>
                      ) : (
                        <span className="text-xs text-text-muted">--</span>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : null}
        </motion.div>

        {/* ─── Two-Column Grid ────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-6">

          {/* LEFT COLUMN */}
          <div className="space-y-6">

            {/* What Changed Today — first row free, rest blurred */}
            {stats && stats.metalImpacts.length > 0 && (
              <motion.div variants={item}>
                <h2 className="text-sm font-medium text-text-muted uppercase tracking-wider mb-0.5">What Changed Today</h2>
                <p className="text-[11px] text-text-muted mb-3">How today's price moves affected your holdings</p>
                <div className="rounded-xl bg-surface border border-border divide-y divide-border">
                  {stats.metalImpacts.map((metal, idx) => {
                    const isPositive = metal.dailyImpact >= 0;
                    const row = (
                      <div
                        key={metal.metal}
                        className="flex items-center justify-between px-5 py-4"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
                            style={{
                              backgroundColor: `${METAL_COLORS[metal.metal]}15`,
                              color: METAL_COLORS[metal.metal],
                            }}
                          >
                            {METAL_LABELS[metal.metal].slice(0, 2)}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{METAL_LABELS[metal.metal]}</p>
                            <p className="text-xs text-text-muted">{metal.totalOz.toFixed(3)} oz</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-semibold ${isPositive ? 'text-green' : 'text-red'}`}>
                            {formatChange(metal.dailyImpact)}
                          </p>
                          <p className={`text-xs ${isPositive ? 'text-green/70' : 'text-red/70'}`}>
                            {formatPercent(metal.changePercent)}
                          </p>
                        </div>
                      </div>
                    );

                    // First row always visible; rest blurred for free
                    if (idx === 0 || isGold) return row;
                    return null;
                  })}
                </div>
                {!isGold && stats.metalImpacts.length > 1 && (
                  <BlurredContent upgradeText="See all metals — Try Gold Free for 7 Days">
                    <div className="rounded-b-xl bg-surface border border-t-0 border-border divide-y divide-border">
                      {stats.metalImpacts.slice(1).map((metal) => {
                        const isPositive = metal.dailyImpact >= 0;
                        return (
                          <div key={metal.metal} className="flex items-center justify-between px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
                                style={{
                                  backgroundColor: `${METAL_COLORS[metal.metal]}15`,
                                  color: METAL_COLORS[metal.metal],
                                }}
                              >
                                {METAL_LABELS[metal.metal].slice(0, 2)}
                              </div>
                              <div>
                                <p className="text-sm font-medium">{METAL_LABELS[metal.metal]}</p>
                                <p className="text-xs text-text-muted">{metal.totalOz.toFixed(3)} oz</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className={`text-sm font-semibold ${isPositive ? 'text-green' : 'text-red'}`}>
                                {formatChange(metal.dailyImpact)}
                              </p>
                              <p className={`text-xs ${isPositive ? 'text-green/70' : 'text-red/70'}`}>
                                {formatPercent(metal.changePercent)}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </BlurredContent>
                )}
              </motion.div>
            )}

            {/* Intelligence Feed — first card free, rest blurred */}
            <motion.div variants={item}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-sm font-medium text-text-muted uppercase tracking-wider mb-0.5">Intelligence Feed</h2>
                  <p className="text-[11px] text-text-muted">AI-curated precious metals news and analysis</p>
                </div>
                {intelligence.length > 0 && (
                  <span className="text-[10px] text-text-muted bg-text/5 px-2 py-0.5 rounded-full">
                    {intelligence.length} brief{intelligence.length !== 1 ? 's' : ''} today
                  </span>
                )}
              </div>
              {intelligenceLoading ? (
                <div className="space-y-3">
                  <CardSkeleton />
                  <CardSkeleton />
                </div>
              ) : intelligence.length > 0 ? (
                <div className="space-y-3">
                  {/* First card always visible */}
                  <IntelligenceBriefCard
                    brief={intelligence[0]}
                    expanded={expandedBriefId === intelligence[0].id}
                    onToggle={() =>
                      setExpandedBriefId((prev) => (prev === intelligence[0].id ? null : intelligence[0].id))
                    }
                  />
                  {/* Rest: visible for Gold, blurred for free */}
                  {intelligence.length > 1 && (
                    isGold ? (
                      <motion.div
                        variants={container}
                        initial="hidden"
                        animate="show"
                        className="space-y-3"
                      >
                        {intelligence.slice(1).map((brief) => (
                          <motion.div key={brief.id} variants={item}>
                            <IntelligenceBriefCard
                              brief={brief}
                              expanded={expandedBriefId === brief.id}
                              onToggle={() =>
                                setExpandedBriefId((prev) => (prev === brief.id ? null : brief.id))
                              }
                            />
                          </motion.div>
                        ))}
                      </motion.div>
                    ) : (
                      <BlurredContent upgradeText={`${intelligence.length - 1} more brief${intelligence.length - 1 !== 1 ? 's' : ''} today — Try Gold Free for 7 Days`}>
                        <div className="space-y-3">
                          {intelligence.slice(1, 3).map((brief) => (
                            <IntelligenceBriefCard
                              key={brief.id}
                              brief={brief}
                              expanded={false}
                              onToggle={() => {}}
                            />
                          ))}
                        </div>
                      </BlurredContent>
                    )
                  )}
                </div>
              ) : (
                <div className="rounded-xl bg-surface border border-border p-8 text-center">
                  <div className="w-10 h-10 mx-auto rounded-full bg-gold/10 flex items-center justify-center mb-3">
                    <svg className="w-5 h-5 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-text-secondary">No briefs yet</p>
                  <p className="text-xs text-text-muted mt-1">Intelligence briefing generates at 6:30 AM EST</p>
                </div>
              )}
            </motion.div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="space-y-6">

            {/* Vault Watch — header + registered free, rest blurred */}
            <motion.div variants={item}>
              <h2 className="text-sm font-medium text-text-muted uppercase tracking-wider mb-0.5">Vault Watch</h2>
              <p className="text-[11px] text-text-muted mb-3">COMEX warehouse inventory — physical metal backing futures contracts</p>
              <div className="rounded-xl bg-surface border border-border p-4">
                {vaultLoading ? (
                  <CardSkeleton />
                ) : (
                  <VaultWatchPanel
                    vaultData={vaultData}
                    selectedMetal={selectedVaultMetal}
                    onSelectMetal={setSelectedVaultMetal}
                    isGold={isGold}
                  />
                )}
              </div>
            </motion.div>

            {/* AI Daily Brief — preview card with blurred content */}
            <motion.div variants={item}>
              <h2 className="text-sm font-medium text-text-muted uppercase tracking-wider mb-3">AI Daily Brief</h2>
              {isGold ? (
                <div className="rounded-xl bg-surface border border-border p-6 text-center">
                  <div className="w-10 h-10 mx-auto rounded-full bg-gold/10 flex items-center justify-center mb-3">
                    <svg className="w-5 h-5 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-text-secondary">AI-powered daily market analysis</p>
                  <p className="text-xs text-text-muted mt-1">Personalized to your stack composition</p>
                </div>
              ) : (
                <BlurredContent upgradeText="Unlock personalized briefings">
                  <div className="rounded-xl bg-surface border border-border p-4 space-y-2">
                    <p className="text-xs font-semibold text-gold">Morning Brief — Feb 11</p>
                    <p className="text-xs text-text-secondary leading-relaxed">Gold holds above $2,900 as markets digest inflation data. Silver futures rise on industrial demand outlook. COMEX registered inventories declined 2.3% this week, adding to the physical supply narrative...</p>
                    <p className="text-xs text-text-muted">Your portfolio gained $342 today driven by gold's rally...</p>
                  </div>
                </BlurredContent>
              )}
            </motion.div>

            {/* AI Stack Advisor — visible UI, gated on interaction */}
            <motion.div variants={item}>
              <h2 className="text-sm font-medium text-text-muted uppercase tracking-wider mb-1">AI Stack Advisor</h2>
              <p className="text-xs text-text-muted mb-3">Ask anything about your portfolio and the precious metals market</p>
              <AdvisorChat />
            </motion.div>

            {/* AI Deal Finder — preview card with blurred content */}
            <motion.div variants={item}>
              <h2 className="text-sm font-medium text-text-muted uppercase tracking-wider mb-3">AI Deal Finder</h2>
              {isGold ? (
                <div className="rounded-xl bg-surface border border-border p-6 text-center">
                  <div className="w-10 h-10 mx-auto rounded-full bg-gold/10 flex items-center justify-center mb-3">
                    <svg className="w-5 h-5 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-text-secondary">Best deals across dealers</p>
                  <p className="text-xs text-text-muted mt-1">Find the lowest premiums on metals you want</p>
                </div>
              ) : (
                <BlurredContent upgradeText="Find the best bullion prices">
                  <div className="rounded-xl bg-surface border border-border p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold">1 oz Gold Eagle</p>
                      <p className="text-xs text-green font-medium">3.2% premium</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold">1 oz Silver Maple</p>
                      <p className="text-xs text-green font-medium">4.8% premium</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold">10 oz Silver Bar</p>
                      <p className="text-xs text-green font-medium">2.1% premium</p>
                    </div>
                  </div>
                </BlurredContent>
              )}
            </motion.div>
          </div>
        </div>
      </motion.div>

      <PricingModal
        isOpen={showPricing}
        onClose={() => setShowPricing(false)}
        currentTier={tier}
      />
    </div>
  );
}
