import { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';
import { useHoldings } from '../hooks/useHoldings';
import { useSpotPrices } from '../hooks/useSpotPrices';
import { fetchSparklineData } from '../services/api';
import type { PriceLogEntry } from '../services/api';
import { formatCurrency, formatPercent, formatChange } from '../utils/format';
import { METAL_COLORS, METAL_LABELS, METALS } from '../utils/constants';
import { CardSkeleton } from '../components/Skeleton';
import type { Metal } from '../types/holding';

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

function MiniSparkline({ data, color }: { data: { v: number }[]; color: string }) {
  if (data.length < 2) return null;

  return (
    <div className="w-16 h-8">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id={`spark-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={1.5}
            fill={`url(#spark-${color.replace('#', '')})`}
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function Today() {
  const { holdings, getTotalsByMetal, loading: holdingsLoading } = useHoldings();
  const { prices, loading: pricesLoading, lastUpdated } = useSpotPrices(60000);
  const [sparklineRaw, setSparklineRaw] = useState<PriceLogEntry[]>([]);

  // Fetch real sparkline data from price_log
  useEffect(() => {
    fetchSparklineData().then(setSparklineRaw).catch(console.error);
  }, []);

  // Build per-metal sparkline data from real price_log
  const sparklines = useMemo(() => {
    const result: Record<Metal, { v: number }[]> = {
      gold: [], silver: [], platinum: [], palladium: [],
    };
    for (const entry of sparklineRaw) {
      for (const metal of METALS) {
        const key = METAL_PRICE_KEY[metal];
        result[metal].push({ v: entry[key] as number });
      }
    }
    return result;
  }, [sparklineRaw]);

  const stats = useMemo(() => {
    if (!prices) return null;
    const totals = getTotalsByMetal();

    // Debug: log holdings data shape for BUG 1 diagnosis
    if (holdings.length > 0) {
      console.group('[Stack Tracker] Holdings data audit');
      for (const h of holdings.slice(0, 5)) {
        const totalOz = h.weight * h.quantity;
        console.log(
          `${h.metal} ${h.type}: weight=${h.weight} oz × qty=${h.quantity} = ${totalOz} oz | pricePerItem=$${h.purchasePrice} | totalCost=$${(h.purchasePrice * h.quantity).toFixed(2)} | costPerOz=$${(h.purchasePrice * h.quantity / totalOz).toFixed(2)}`
        );
      }
      if (holdings.length > 5) console.log(`... and ${holdings.length - 5} more`);
      console.groupEnd();
    }

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

      return {
        metal,
        totalOz: data.totalOz,
        value,
        dailyImpact,
        changePercent,
      };
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

  const isLoading = holdingsLoading || pricesLoading;

  // Build a portfolio-level sparkline from real data
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
    <div className="max-w-5xl mx-auto p-4 md:p-6 lg:p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-8"
      >
        <h1 className="text-2xl font-bold tracking-tight">Today</h1>
        {lastUpdated && (
          <p className="text-xs text-text-muted mt-1">
            Live prices · Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
      </motion.div>

      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">

        {/* Portfolio Pulse */}
        {isLoading ? (
          <CardSkeleton />
        ) : stats && holdings.length > 0 ? (
          <motion.div
            variants={item}
            className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a1708] via-[#141414] to-[#141414] border border-gold/10 p-6"
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
                </div>
                {portfolioSparkline.length >= 2 && (
                  <MiniSparkline
                    data={portfolioSparkline}
                    color={stats.totalDailyChange >= 0 ? '#22c55e' : '#ef4444'}
                  />
                )}
              </div>
            </div>
          </motion.div>
        ) : !isLoading && holdings.length === 0 ? (
          <motion.div
            variants={item}
            className="rounded-2xl bg-[#141414] border border-border p-8 text-center"
          >
            <div className="w-12 h-12 mx-auto rounded-full bg-gold/10 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m6-6H6" />
              </svg>
            </div>
            <h3 className="font-semibold text-white mb-1">Start Your Stack</h3>
            <p className="text-sm text-text-muted mb-4">Add your first holding to see your portfolio pulse.</p>
            <a
              href="/portfolio"
              className="inline-block px-5 py-2.5 bg-gold text-background font-medium text-sm rounded-lg hover:bg-gold-hover transition-colors"
            >
              Add Holding
            </a>
          </motion.div>
        ) : null}

        {/* Metal Movers */}
        <motion.div variants={item}>
          <h2 className="text-sm font-medium text-text-muted uppercase tracking-wider mb-3">Metal Movers</h2>
          {isLoading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[1, 2, 3, 4].map((i) => <CardSkeleton key={i} />)}
            </div>
          ) : prices ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {METALS.map((metal) => {
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
                    className="relative rounded-xl bg-[#141414] border border-border hover:border-border-light p-4 transition-colors"
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
                        <MiniSparkline data={metalSparkline} color={color} />
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

        {/* What Changed Today */}
        {stats && stats.metalImpacts.length > 0 && (
          <motion.div variants={item}>
            <h2 className="text-sm font-medium text-text-muted uppercase tracking-wider mb-3">What Changed Today</h2>
            <div className="rounded-xl bg-[#141414] border border-border divide-y divide-border">
              {stats.metalImpacts.map((metal) => {
                const isPositive = metal.dailyImpact >= 0;
                return (
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
              })}
            </div>
          </motion.div>
        )}

        {/* Intelligence Feed - Coming Soon */}
        <motion.div variants={item}>
          <h2 className="text-sm font-medium text-text-muted uppercase tracking-wider mb-3">Intelligence Feed</h2>
          <div className="rounded-xl bg-[#141414] border border-border border-dashed p-8 text-center">
            <div className="w-10 h-10 mx-auto rounded-full bg-gold/10 flex items-center justify-center mb-3">
              <svg className="w-5 h-5 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-text-secondary">Coming Soon</p>
            <p className="text-xs text-text-muted mt-1">Market news and analysis tailored to your stack</p>
          </div>
        </motion.div>

        {/* AI Brief - Coming Soon */}
        <motion.div variants={item}>
          <h2 className="text-sm font-medium text-text-muted uppercase tracking-wider mb-3">AI Market Brief</h2>
          <div className="rounded-xl bg-[#141414] border border-border border-dashed p-8 text-center">
            <div className="w-10 h-10 mx-auto rounded-full bg-gold/10 flex items-center justify-center mb-3">
              <svg className="w-5 h-5 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-text-secondary">Coming Soon</p>
            <p className="text-xs text-text-muted mt-1">AI-powered daily briefing on precious metals markets</p>
          </div>
        </motion.div>

      </motion.div>
    </div>
  );
}
