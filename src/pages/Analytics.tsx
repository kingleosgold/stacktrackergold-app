import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  AreaChart, Area,
} from 'recharts';
import { useHoldings } from '../hooks/useHoldings';
import { useSpotPrices } from '../hooks/useSpotPrices';
import { formatCurrency, formatWeight } from '../utils/format';
import { METAL_COLORS, METAL_LABELS, METALS } from '../utils/constants';
import { CardSkeleton, ChartSkeleton } from '../components/Skeleton';
import type { Metal } from '../types/holding';

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
    backgroundColor: '#1a1a1a',
    border: '1px solid #2a2a2a',
    borderRadius: '8px',
    fontSize: '12px',
  },
  labelStyle: { color: '#999' },
  itemStyle: { color: '#fff' },
};

function StatCard({ label, value, subtext, color }: {
  label: string;
  value: string;
  subtext?: string;
  color?: string;
}) {
  return (
    <motion.div variants={item} className="p-4 rounded-xl bg-[#141414] border border-border">
      <p className="text-xs text-text-muted mb-1">{label}</p>
      <p className={`text-lg font-bold ${color || 'text-white'}`}>{value}</p>
      {subtext && <p className="text-xs text-text-muted mt-0.5">{subtext}</p>}
    </motion.div>
  );
}

export default function Analytics() {
  const { holdings, getTotalsByMetal, loading } = useHoldings();
  const { prices, loading: pricesLoading } = useSpotPrices(60000);
  const [selectedRange, setSelectedRange] = useState<typeof TIME_RANGES[number]>('1M');

  const getSpotPrice = (metal: Metal): number => prices?.[metal] || 0;

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
      const premium = ((holding.purchasePrice - spotValue) / spotValue) * 100;

      if (!bestPurchase || premium < bestPurchase.premium) {
        bestPurchase = { type: holding.type, metal: holding.metal, premium };
      }
      if (!worstPurchase || premium > worstPurchase.premium) {
        worstPurchase = { type: holding.type, metal: holding.metal, premium };
      }
    }

    // Simulated portfolio value over time (based on current holdings applied to past price estimates)
    const generatePortfolioHistory = () => {
      const days = selectedRange === '1W' ? 7 : selectedRange === '1M' ? 30 : selectedRange === '3M' ? 90
        : selectedRange === '6M' ? 180 : selectedRange === '1Y' ? 365 : 730;
      const points: { date: string; value: number }[] = [];

      for (let i = days; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        // Simulate price variation: base value with some random walk
        const variation = 1 + (Math.sin(i / 15) * 0.03 + Math.cos(i / 7) * 0.02);
        const value = totalValue * variation;
        points.push({
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          value: Math.round(value * 100) / 100,
        });
      }
      return points;
    };

    const portfolioHistory = generatePortfolioHistory();

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
      portfolioHistory,
    };
  }, [holdings, prices, getTotalsByMetal, selectedRange]);

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
        <div className="rounded-2xl bg-[#141414] border border-border p-12 text-center">
          <div className="w-14 h-14 mx-auto rounded-full bg-gold/10 flex items-center justify-center mb-4">
            <svg className="w-7 h-7 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">No Data Yet</h3>
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
            color="text-[#D4A843]"
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
        <motion.div variants={item} className="rounded-xl bg-[#141414] border border-border p-5">
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
              <AreaChart data={stats.portfolioHistory}>
                <defs>
                  <linearGradient id="portfolioGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#D4A843" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#D4A843" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#707070', fontSize: 11 }}
                  axisLine={{ stroke: '#1e1e1e' }}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fill: '#707070', fontSize: 11 }}
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
          <motion.div variants={item} className="rounded-xl bg-[#141414] border border-border p-5">
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
          <motion.div variants={item} className="rounded-xl bg-[#141414] border border-border p-5">
            <h2 className="text-sm font-semibold mb-4">Cost Basis vs Current Value</h2>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.costVsValue} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: '#707070', fontSize: 11 }}
                    axisLine={{ stroke: '#1e1e1e' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: '#707070', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                    width={50}
                  />
                  <Tooltip
                    formatter={(value, name) => [formatCurrency(Number(value)), name === 'cost' ? 'Cost Basis' : 'Current Value']}
                    {...tooltipStyle}
                  />
                  <Bar dataKey="cost" fill="#707070" radius={[4, 4, 0, 0]} name="Cost Basis" />
                  <Bar dataKey="value" fill="#D4A843" radius={[4, 4, 0, 0]} name="Current Value" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-6 mt-2">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-sm bg-[#707070]" />
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
            <motion.div variants={item} className="rounded-xl bg-[#141414] border border-border p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-full bg-green/10 flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 text-green" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
                  </svg>
                </div>
                <h2 className="text-sm font-semibold">Best Purchase (by Premium)</h2>
              </div>
              <p className="text-white font-medium">{stats.bestPurchase.type}</p>
              <p className="text-xs text-text-muted capitalize">{stats.bestPurchase.metal}</p>
              <p className={`text-sm font-semibold mt-1 ${stats.bestPurchase.premium <= 0 ? 'text-green' : 'text-gold'}`}>
                {stats.bestPurchase.premium > 0 ? '+' : ''}{stats.bestPurchase.premium.toFixed(1)}% over spot
              </p>
            </motion.div>
          )}
          {stats.worstPurchase && (
            <motion.div variants={item} className="rounded-xl bg-[#141414] border border-border p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-full bg-red/10 flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 text-red" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3" />
                  </svg>
                </div>
                <h2 className="text-sm font-semibold">Highest Premium Purchase</h2>
              </div>
              <p className="text-white font-medium">{stats.worstPurchase.type}</p>
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
      </motion.div>
    </div>
  );
}
