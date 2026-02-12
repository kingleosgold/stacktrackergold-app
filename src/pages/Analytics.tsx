import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  AreaChart, Area,
} from 'recharts';
import { useHoldings } from '../hooks/useHoldings';
import { useSpotPrices } from '../hooks/useSpotPrices';
import { fetchSpotPriceHistory } from '../services/api';
import type { SpotPriceHistoryPoint } from '../services/api';
import { formatCurrency, formatWeight } from '../utils/format';
import { METAL_COLORS, METAL_LABELS, METALS } from '../utils/constants';
import { CardSkeleton, ChartSkeleton } from '../components/Skeleton';
import type { Metal } from '../types/holding';

// Map UI range buttons to backend API range parameter
const RANGE_API_PARAM: Record<string, string> = {
  '1W': '1M', '1M': '1M', '3M': '3M', '6M': '6M', '1Y': '1Y', 'All': 'ALL',
};

// For 1W, we fetch 1M from backend then slice to last 7 days
const RANGE_SLICE_DAYS: Record<string, number | null> = {
  '1W': 7, '1M': null, '3M': null, '6M': null, '1Y': null, 'All': null,
};

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
};

const TIME_RANGES = ['1W', '1M', '3M', '6M', '1Y', 'All'] as const;

const tooltipStyle = {
  contentStyle: {
    backgroundColor: 'var(--color-chart-bg)',
    border: '1px solid var(--color-chart-border)',
    borderRadius: '8px',
    fontSize: '12px',
  },
  labelStyle: { color: 'var(--color-text-secondary)' },
  itemStyle: { color: 'var(--color-text)' },
};

// Downsample array to maxPoints evenly spaced entries (keeps first & last)
function downsample<T>(data: T[], maxPoints: number): T[] {
  if (data.length <= maxPoints) return data;
  const step = (data.length - 1) / (maxPoints - 1);
  const result: T[] = [];
  for (let i = 0; i < maxPoints - 1; i++) {
    result.push(data[Math.round(i * step)]);
  }
  result.push(data[data.length - 1]);
  return result;
}

const SPOT_CHART_COLORS: Record<Metal, string> = {
  gold: '#D4A843',
  silver: '#C0C0C0',
  platinum: '#4A90D9',
  palladium: '#6BBF8A',
};

function SpotPriceChart({ metal, spotPrice }: { metal: Metal; spotPrice: number }) {
  const color = SPOT_CHART_COLORS[metal];
  const [range, setRange] = useState<typeof TIME_RANGES[number]>('1M');
  const [data, setData] = useState<SpotPriceHistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFlat, setIsFlat] = useState(false);

  // Custom hover state for "All" range (bypasses broken Recharts tooltip)
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [hoverX, setHoverX] = useState(0);
  const isAllRange = range === 'All';

  useEffect(() => {
    setLoading(true);
    setIsFlat(false);
    const apiRange = RANGE_API_PARAM[range] || '1M';
    fetchSpotPriceHistory(apiRange)
      .then((res) => {
        let d = res.data || [];
        const sliceDays = RANGE_SLICE_DAYS[range];
        if (sliceDays != null && d.length > sliceDays) d = d.slice(-sliceDays);

        // Detect flat/constant data for this metal (API returns fixed fallback values for Pt/Pd on long ranges)
        if (d.length > 2) {
          const prices = d.map((p) => p[metal] || 0).filter((v) => v > 0);
          const uniquePrices = new Set(prices.map((p) => p.toFixed(2)));
          if (uniquePrices.size <= 1) {
            setIsFlat(true);
            setData([]);
            return;
          }
        }

        // Downsample dense datasets
        if (d.length > 150) d = downsample(d, 150);
        setData(d);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [range, metal]);

  const chartData = useMemo(() => {
    return data.map((point) => ({
      date: new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      fullDate: new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      price: point[metal] || 0,
    }));
  }, [data, metal]);

  // Custom mouse handler for "All" range
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isAllRange || chartData.length === 0) return;
    const rect = chartContainerRef.current?.getBoundingClientRect();
    if (!rect) return;

    // Account for the YAxis width (~55px) and right padding (~5px)
    const yAxisWidth = 55;
    const rightPad = 5;
    const chartLeft = rect.left + yAxisWidth;
    const chartWidth = rect.width - yAxisWidth - rightPad;
    const mouseX = e.clientX - chartLeft;
    const pct = Math.max(0, Math.min(1, mouseX / chartWidth));
    const idx = Math.round(pct * (chartData.length - 1));
    setHoverIndex(idx);
    setHoverX(yAxisWidth + pct * chartWidth);
  }, [isAllRange, chartData.length]);

  const handleMouseLeave = useCallback(() => {
    setHoverIndex(null);
  }, []);

  const latestPrice = chartData.length > 0 ? chartData[chartData.length - 1].price : spotPrice;
  const firstPrice = chartData.length > 0 ? chartData[0].price : 0;
  const changePercent = firstPrice > 0 ? ((latestPrice - firstPrice) / firstPrice) * 100 : 0;

  const hoveredPoint = hoverIndex != null ? chartData[hoverIndex] : null;

  return (
    <div className="rounded-xl bg-surface border border-border p-5">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold" style={{ color }}>{METAL_LABELS[metal]}</h3>
        <div className="flex gap-0.5">
          {TIME_RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-2 py-1 rounded-md text-[10px] font-medium transition-colors ${
                range === r
                  ? 'bg-gold/15 text-gold'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-lg font-bold">{formatCurrency(latestPrice)}</span>
        {changePercent !== 0 && !isFlat && (
          <span className={`text-xs font-medium ${changePercent >= 0 ? 'text-green' : 'text-red'}`}>
            {changePercent >= 0 ? '+' : ''}{changePercent.toFixed(2)}%
          </span>
        )}
      </div>
      <div className="h-40">
        {loading ? (
          <div className="w-full h-full rounded-lg bg-text/5 animate-pulse" />
        ) : isFlat ? (
          <div className="w-full h-full rounded-lg bg-text/[0.03] border border-dashed border-border flex items-center justify-center">
            <p className="text-xs text-text-muted text-center px-4">No historical data available for this range</p>
          </div>
        ) : (
          <div
            ref={chartContainerRef}
            className="relative w-full h-full"
            onMouseMove={isAllRange ? handleMouseMove : undefined}
            onMouseLeave={isAllRange ? handleMouseLeave : undefined}
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id={`spot-${metal}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={0.25} />
                    <stop offset="100%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-chart-grid)" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: 'var(--color-chart-label)', fontSize: 10 }}
                  axisLine={{ stroke: 'var(--color-chart-grid)' }}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fill: 'var(--color-chart-label)', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => metal === 'gold' || metal === 'platinum' || metal === 'palladium' ? `$${v.toLocaleString()}` : `$${v}`}
                  width={55}
                  domain={['auto', 'auto']}
                />
                {/* Use Recharts Tooltip only for non-All ranges */}
                {!isAllRange && (
                  <Tooltip
                    isAnimationActive={false}
                    formatter={(value: number | undefined) => [value != null ? formatCurrency(value) : '--', METAL_LABELS[metal]]}
                    labelFormatter={(_, payload) => {
                      const entry = payload?.[0]?.payload;
                      return entry?.fullDate || '';
                    }}
                    {...tooltipStyle}
                    cursor={{ stroke: 'var(--color-text-muted)', strokeWidth: 1 }}
                  />
                )}
                <Area
                  type="monotone"
                  dataKey="price"
                  stroke={color}
                  strokeWidth={2}
                  fill={`url(#spot-${metal})`}
                  dot={false}
                  activeDot={isAllRange ? false : undefined}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>

            {/* Custom hover tooltip for "All" range */}
            {isAllRange && hoveredPoint && (
              <>
                {/* Vertical line */}
                <div
                  className="absolute top-0 bottom-0 pointer-events-none"
                  style={{ left: `${hoverX}px`, width: '1px', backgroundColor: 'var(--color-text-muted)', opacity: 0.5 }}
                />
                {/* Tooltip box */}
                <div
                  className="absolute pointer-events-none z-10"
                  style={{
                    left: `${hoverX}px`,
                    top: '0px',
                    transform: hoverX > (chartContainerRef.current?.offsetWidth || 300) / 2
                      ? 'translateX(-110%)' : 'translateX(10%)',
                  }}
                >
                  <div
                    className="rounded-lg px-2.5 py-1.5 text-xs whitespace-nowrap"
                    style={{
                      backgroundColor: 'var(--color-chart-bg)',
                      border: '1px solid var(--color-chart-border)',
                    }}
                  >
                    <div style={{ color: 'var(--color-text-secondary)' }}>{hoveredPoint.fullDate}</div>
                    <div className="font-medium" style={{ color: 'var(--color-text)' }}>
                      {METAL_LABELS[metal]}: {formatCurrency(hoveredPoint.price)}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, subtext, color }: {
  label: string;
  value: string;
  subtext?: string;
  color?: string;
}) {
  return (
    <motion.div variants={item} className="p-4 rounded-xl bg-surface border border-border">
      <p className="text-xs text-text-muted mb-1">{label}</p>
      <p className={`text-lg font-bold ${color || 'text-text'}`}>{value}</p>
      {subtext && <p className="text-xs text-text-muted mt-0.5">{subtext}</p>}
    </motion.div>
  );
}

export default function Analytics() {
  const { holdings, getTotalsByMetal, loading } = useHoldings();
  const { prices, loading: pricesLoading } = useSpotPrices(60000);
  const [selectedRange, setSelectedRange] = useState<typeof TIME_RANGES[number]>('1M');
  const [priceHistory, setPriceHistory] = useState<SpotPriceHistoryPoint[]>([]);

  const getSpotPrice = (metal: Metal): number => prices?.[metal] || 0;

  // Find the earliest VALID purchase date across all holdings.
  // A valid date is one that exists AND is more than 7 days ago.
  const earliestPurchaseDate = useMemo(() => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const cutoff = sevenDaysAgo.toISOString().split('T')[0];

    let earliest: string | null = null;
    for (const h of holdings) {
      if (h.purchaseDate && h.purchaseDate <= cutoff) {
        if (!earliest || h.purchaseDate < earliest) {
          earliest = h.purchaseDate;
        }
      }
    }
    return earliest;
  }, [holdings]);

  // Pick the best API range for "All" based on earliest purchase date.
  // The ALL endpoint returns 60 points over 110 years — too sparse for recent purchases.
  // Instead, pick the tightest range that covers the full holding period for max density.
  const smartApiRange = useMemo(() => {
    if (selectedRange !== 'All' || !earliestPurchaseDate) {
      return RANGE_API_PARAM[selectedRange] || '1M';
    }
    const now = new Date();
    const earliest = new Date(earliestPurchaseDate);
    const monthsAgo = (now.getFullYear() - earliest.getFullYear()) * 12 + (now.getMonth() - earliest.getMonth());

    if (monthsAgo < 1) return '1M';     // < 1 month → daily data
    if (monthsAgo < 3) return '3M';     // 1-3 months → ~60 daily points
    if (monthsAgo < 6) return '6M';     // 3-6 months → ~60 daily points
    if (monthsAgo < 60) return '5Y';    // 6 months–5 years → 60 points from 2021
    return 'ALL';                        // 5+ years → 60 sampled points
  }, [selectedRange, earliestPurchaseDate]);

  // Fetch price history from backend API when range changes
  useEffect(() => {
    const apiRange = selectedRange === 'All' ? smartApiRange : (RANGE_API_PARAM[selectedRange] || '1M');
    fetchSpotPriceHistory(apiRange)
      .then((res) => {
        let data = res.data || [];
        const sliceDays = RANGE_SLICE_DAYS[selectedRange];
        if (sliceDays != null && data.length > sliceDays) {
          data = data.slice(-sliceDays);
        }
        setPriceHistory(data);
      })
      .catch(console.error);
  }, [selectedRange, smartApiRange]);

  const stats = useMemo(() => {
    if (!prices) return null;
    const totals = getTotalsByMetal();

    // Allocation data
    const allocation = METALS
      .map((metal) => {
        const data = totals[metal];
        const value = data.totalOz * getSpotPrice(metal);
        return {
          name: METAL_LABELS[metal],
          metal,
          value,
          color: METAL_COLORS[metal],
          oz: data.totalOz,
          cost: data.totalCost,
        };
      })
      .filter((m) => m.value > 0);

    const totalValue = allocation.reduce((sum, m) => sum + m.value, 0);
    const totalCost = allocation.reduce((sum, m) => sum + m.cost, 0);

    // Add percentages
    const allocationWithPercent = allocation.map((m) => ({
      ...m,
      percentage: totalValue > 0 ? (m.value / totalValue) * 100 : 0,
    }));

    // Cost basis vs value bar chart data
    const costVsValue = METALS
      .map((metal) => {
        const data = totals[metal];
        const value = data.totalOz * getSpotPrice(metal);
        if (data.totalCost === 0 && value === 0) return null;
        return {
          name: METAL_LABELS[metal],
          cost: data.totalCost,
          value,
          color: METAL_COLORS[metal],
        };
      })
      .filter(Boolean);

    // Average cost per oz
    const goldData = totals.gold;
    const silverData = totals.silver;
    const avgGoldCostPerOz = goldData.totalOz > 0 ? goldData.totalCost / goldData.totalOz : 0;
    const avgSilverCostPerOz = silverData.totalOz > 0 ? silverData.totalCost / silverData.totalOz : 0;

    // Gold/Silver ratio of holdings
    const goldValue = goldData.totalOz * getSpotPrice('gold');
    const silverValue = silverData.totalOz * getSpotPrice('silver');
    const holdingsGSR = silverValue > 0 ? goldValue / silverValue : 0;
    const marketGSR = prices.silver > 0 ? prices.gold / prices.silver : 0;

    // Best and worst purchases by premium
    let bestPurchase: { type: string; metal: Metal; premium: number } | null = null;
    let worstPurchase: { type: string; metal: Metal; premium: number } | null = null;

    for (const holding of holdings) {
      const spotPrice = getSpotPrice(holding.metal);
      const spotValue = holding.weight * holding.quantity * spotPrice;
      if (spotValue === 0) continue;
      const totalCost = holding.purchasePrice * holding.quantity;
      const premium = ((totalCost - spotValue) / spotValue) * 100;

      if (!bestPurchase || premium < bestPurchase.premium) {
        bestPurchase = { type: holding.type, metal: holding.metal, premium };
      }
      if (!worstPurchase || premium > worstPurchase.premium) {
        worstPurchase = { type: holding.type, metal: holding.metal, premium };
      }
    }

    return {
      allocation: allocationWithPercent,
      costVsValue,
      avgGoldCostPerOz,
      avgSilverCostPerOz,
      totalOzByMetal: METALS.map((m) => ({ metal: m, oz: totals[m].totalOz })).filter((m) => m.oz > 0),
      holdingsGSR,
      marketGSR,
      bestPurchase,
      worstPurchase,
      totalValue,
      totalCost,
    };
  }, [holdings, prices, getTotalsByMetal]);

  // Compute portfolio value history from backend spot-price-history × holdings oz
  const portfolioHistory = useMemo(() => {
    if (priceHistory.length === 0 || holdings.length === 0) return [];
    const totals = getTotalsByMetal();

    // For "All": if we have a valid earliest purchase date, filter to points on/after it.
    // If no valid purchase dates (null/missing/all recent), show 1Y worth of data instead.
    let filtered = priceHistory;
    if (selectedRange === 'All') {
      if (earliestPurchaseDate) {
        filtered = priceHistory.filter((point) => point.date >= earliestPurchaseDate);
      } else {
        // No valid purchase dates — default to last ~1Y of data
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        const oneYearAgoStr = oneYearAgo.toISOString().split('T')[0];
        filtered = priceHistory.filter((point) => point.date >= oneYearAgoStr);
      }
    }

    console.log(`Earliest purchase date: ${earliestPurchaseDate}, Total API points: ${priceHistory.length}, Points after filter: ${filtered.length}`);

    return filtered.map((point) => {
      const value =
        totals.gold.totalOz * (point.gold || 0) +
        totals.silver.totalOz * (point.silver || 0) +
        totals.platinum.totalOz * (point.platinum || 0) +
        totals.palladium.totalOz * (point.palladium || 0);
      const d = new Date(point.date);
      return {
        date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        value: Math.round(value * 100) / 100,
      };
    });
  }, [priceHistory, holdings, getTotalsByMetal, selectedRange, earliestPurchaseDate]);

  const isLoading = loading || pricesLoading;

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto p-4 md:p-6 lg:p-8">
        <h1 className="text-2xl font-bold tracking-tight mb-6">Analytics</h1>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {[1, 2, 3, 4].map((i) => <CardSkeleton key={i} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
      </div>
    );
  }

  if (holdings.length === 0 || !stats) {
    return (
      <div className="max-w-6xl mx-auto p-4 md:p-6 lg:p-8">
        <h1 className="text-2xl font-bold tracking-tight mb-6">Analytics</h1>
        <div className="rounded-2xl bg-surface border border-border p-12 text-center">
          <div className="w-14 h-14 mx-auto rounded-full bg-gold/10 flex items-center justify-center mb-4">
            <svg className="w-7 h-7 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-text mb-2">No Data Yet</h3>
          <p className="text-sm text-text-muted">Add holdings to unlock portfolio analytics.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 lg:p-8">
      <h1 className="text-2xl font-bold tracking-tight mb-6">Analytics</h1>

      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            label="Avg Gold Cost/oz"
            value={stats.avgGoldCostPerOz > 0 ? formatCurrency(stats.avgGoldCostPerOz) : '--'}
            subtext={stats.avgGoldCostPerOz > 0 ? `Spot: ${formatCurrency(getSpotPrice('gold'))}` : 'No gold holdings'}
            color="text-gold"
          />
          <StatCard
            label="Avg Silver Cost/oz"
            value={stats.avgSilverCostPerOz > 0 ? formatCurrency(stats.avgSilverCostPerOz) : '--'}
            subtext={stats.avgSilverCostPerOz > 0 ? `Spot: ${formatCurrency(getSpotPrice('silver'))}` : 'No silver holdings'}
            color="text-[#C0C0C0]"
          />
          <StatCard
            label="Gold/Silver Ratio"
            value={stats.marketGSR > 0 ? stats.marketGSR.toFixed(1) : '--'}
            subtext={stats.holdingsGSR > 0 ? `Your ratio: ${stats.holdingsGSR.toFixed(1)}:1` : 'Market ratio'}
          />
          <StatCard
            label="Total Holdings"
            value={`${holdings.length}`}
            subtext={stats.totalOzByMetal.map((m) =>
              `${formatWeight(m.oz)} ${METAL_LABELS[m.metal]}`
            ).join(', ')}
          />
        </div>

        {/* Portfolio Value Chart */}
        <motion.div variants={item} className="rounded-xl bg-surface border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold">Portfolio Value</h2>
            <div className="flex gap-1">
              {TIME_RANGES.map((range) => (
                <button
                  key={range}
                  onClick={() => setSelectedRange(range)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                    selectedRange === range
                      ? 'bg-gold/15 text-gold'
                      : 'text-text-muted hover:text-text-secondary'
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={portfolioHistory}>
                <defs>
                  <linearGradient id="portfolioGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#D4A843" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#D4A843" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-chart-grid)" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: 'var(--color-chart-label)', fontSize: 11 }}
                  axisLine={{ stroke: 'var(--color-chart-grid)' }}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fill: 'var(--color-chart-label)', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                  width={50}
                />
                <Tooltip
                  formatter={(value) => [formatCurrency(Number(value)), 'Value']}
                  {...tooltipStyle}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#D4A843"
                  strokeWidth={2}
                  fill="url(#portfolioGradient)"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Allocation Pie + Cost vs Value Bar */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pie Chart */}
          <motion.div variants={item} className="rounded-xl bg-surface border border-border p-5">
            <h2 className="text-sm font-semibold mb-4">Allocation by Metal</h2>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.allocation}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {stats.allocation.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => formatCurrency(Number(value))}
                    {...tooltipStyle}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap justify-center gap-4 mt-2">
              {stats.allocation.map((entry) => (
                <div key={entry.name} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                  <span className="text-xs text-text-muted">
                    {entry.name} {entry.percentage.toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Cost vs Value Bar Chart */}
          <motion.div variants={item} className="rounded-xl bg-surface border border-border p-5">
            <h2 className="text-sm font-semibold mb-4">Cost Basis vs Current Value</h2>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.costVsValue} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-chart-grid)" />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: 'var(--color-chart-label)', fontSize: 11 }}
                    axisLine={{ stroke: 'var(--color-chart-grid)' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: 'var(--color-chart-label)', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                    width={50}
                  />
                  <Tooltip
                    formatter={(value, name) => [formatCurrency(Number(value)), name === 'cost' ? 'Cost Basis' : 'Current Value']}
                    {...tooltipStyle}
                  />
                  <Bar dataKey="cost" fill="var(--color-text-muted)" radius={[4, 4, 0, 0]} name="Cost Basis" />
                  <Bar dataKey="value" fill="#D4A843" radius={[4, 4, 0, 0]} name="Current Value" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-6 mt-2">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-sm bg-text-muted" />
                <span className="text-xs text-text-muted">Cost Basis</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-sm bg-gold" />
                <span className="text-xs text-text-muted">Current Value</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Best/Worst Purchases */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {stats.bestPurchase && (
            <motion.div variants={item} className="rounded-xl bg-surface border border-border p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-full bg-green/10 flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 text-green" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
                  </svg>
                </div>
                <h2 className="text-sm font-semibold">Best Purchase (by Premium)</h2>
              </div>
              <p className="text-text font-medium">{stats.bestPurchase.type}</p>
              <p className="text-xs text-text-muted capitalize">{stats.bestPurchase.metal}</p>
              <p className={`text-sm font-semibold mt-1 ${stats.bestPurchase.premium <= 0 ? 'text-green' : 'text-gold'}`}>
                {stats.bestPurchase.premium > 0 ? '+' : ''}{stats.bestPurchase.premium.toFixed(1)}% over spot
              </p>
            </motion.div>
          )}
          {stats.worstPurchase && (
            <motion.div variants={item} className="rounded-xl bg-surface border border-border p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-full bg-red/10 flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 text-red" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3" />
                  </svg>
                </div>
                <h2 className="text-sm font-semibold">Highest Premium Purchase</h2>
              </div>
              <p className="text-text font-medium">{stats.worstPurchase.type}</p>
              <p className="text-xs text-text-muted capitalize">{stats.worstPurchase.metal}</p>
              <p className="text-sm font-semibold mt-1 text-red">
                +{stats.worstPurchase.premium.toFixed(1)}% over spot
              </p>
            </motion.div>
          )}
        </div>

        {/* Total Oz by Metal */}
        <motion.div variants={item}>
          <h2 className="text-sm font-medium text-text-muted uppercase tracking-wider mb-3">Total Ounces by Metal</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {stats.totalOzByMetal.map((m) => (
              <div
                key={m.metal}
                className="p-4 rounded-xl border border-border"
                style={{ backgroundColor: `${METAL_COLORS[m.metal]}08` }}
              >
                <p className="text-xs font-semibold mb-1" style={{ color: METAL_COLORS[m.metal] }}>
                  {METAL_LABELS[m.metal]}
                </p>
                <p className="text-lg font-bold">{formatWeight(m.oz)}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Spot Price History */}
        <motion.div variants={item}>
          <h2 className="text-sm font-medium text-text-muted uppercase tracking-wider mb-3">Spot Price History</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {METALS.map((metal) => (
              <SpotPriceChart key={metal} metal={metal} spotPrice={getSpotPrice(metal)} />
            ))}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
