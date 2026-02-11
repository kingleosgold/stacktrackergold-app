import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import SpotPrices from '../components/SpotPrices';
import { useHoldings } from '../hooks/useHoldings';
import { useSpotPrices } from '../hooks/useSpotPrices';
import type { Metal } from '../types/holding';

const METAL_COLORS: Record<Metal, string> = {
  gold: '#D4A84B',
  silver: '#94a3b8',
  platinum: '#60a5fa',
  palladium: '#a78bfa',
};

const METAL_LABELS: Record<Metal, string> = {
  gold: 'Gold',
  silver: 'Silver',
  platinum: 'Platinum',
  palladium: 'Palladium',
};

function formatCurrency(value: number): string {
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatOz(value: number): string {
  if (value === 0) return '0 oz';
  if (value >= 1) {
    return `${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} oz`;
  }
  const grams = value / 0.0321507;
  return `${grams.toFixed(1)} g`;
}

interface StatCardProps {
  label: string;
  value: string;
  subValue?: string;
  valueColor?: string;
}

function StatCard({ label, value, subValue, valueColor = 'text-text' }: StatCardProps) {
  return (
    <div className="p-4 rounded-lg bg-surface border border-border">
      <p className="text-sm text-text-muted">{label}</p>
      <p className={`text-xl font-semibold ${valueColor}`}>{value}</p>
      {subValue && <p className="text-xs text-text-muted mt-1">{subValue}</p>}
    </div>
  );
}

export default function Dashboard() {
  const { holdings, getTotalsByMetal } = useHoldings();
  const { prices } = useSpotPrices();

  const stats = useMemo(() => {
    const totals = getTotalsByMetal();
    const metals: Metal[] = ['gold', 'silver', 'platinum', 'palladium'];

    let totalMeltValue = 0;
    let totalCostBasis = 0;
    let totalPremiumsPaid = 0;

    const metalStats = metals.map((metal) => {
      const data = totals[metal];
      const spotPrice = prices?.[metal] || 0;
      const meltValue = data.totalOz * spotPrice;

      totalMeltValue += meltValue;
      totalCostBasis += data.totalCost;

      // Calculate premiums from holdings
      const metalHoldings = holdings.filter((h) => h.metal === metal);
      const premiums = metalHoldings.reduce((sum, h) => {
        return sum + Math.max(0, h.purchasePrice * h.quantity - h.weight * h.quantity * spotPrice);
      }, 0);
      totalPremiumsPaid += premiums;

      return {
        metal,
        totalOz: data.totalOz,
        totalCost: data.totalCost,
        meltValue,
        spotPrice,
      };
    });

    const totalGainLoss = totalMeltValue - totalCostBasis;
    const totalGainLossPct = totalCostBasis > 0 ? (totalGainLoss / totalCostBasis) * 100 : 0;

    // Portfolio allocation for pie chart
    const allocation = metalStats
      .filter((m) => m.meltValue > 0)
      .map((m) => ({
        name: METAL_LABELS[m.metal],
        value: m.meltValue,
        color: METAL_COLORS[m.metal],
        percentage: totalMeltValue > 0 ? (m.meltValue / totalMeltValue) * 100 : 0,
      }));

    // Gold/Silver ratio
    const goldSpot = prices?.gold || 0;
    const silverSpot = prices?.silver || 0;
    const goldSilverRatio = silverSpot > 0 ? goldSpot / silverSpot : 0;

    // Average premium (rough estimate)
    const avgPremiumPct = totalCostBasis > 0 && totalMeltValue > 0
      ? ((totalCostBasis - totalMeltValue) / totalMeltValue) * 100
      : 0;

    return {
      totalMeltValue,
      totalCostBasis,
      totalGainLoss,
      totalGainLossPct,
      metalStats,
      allocation,
      goldSilverRatio,
      avgPremiumPct,
      itemCount: holdings.length,
    };
  }, [holdings, prices, getTotalsByMetal]);

  const hasHoldings = holdings.length > 0;

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* Spot Prices */}
      <SpotPrices />

      {/* Portfolio Summary */}
      <div className="p-6 rounded-lg bg-surface border border-border">
        <h2 className="text-lg font-semibold mb-4 text-gold">Portfolio Value</h2>

        {hasHoldings ? (
          <>
            <div className="text-center mb-6">
              <p className="text-4xl font-bold">{formatCurrency(stats.totalMeltValue)}</p>
              <p className={`text-lg mt-1 ${stats.totalGainLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {stats.totalGainLoss >= 0 ? '+' : ''}{formatCurrency(stats.totalGainLoss)}
                {' '}
                ({stats.totalGainLoss >= 0 ? '+' : ''}{stats.totalGainLossPct.toFixed(1)}%)
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <StatCard
                label="Total Cost"
                value={formatCurrency(stats.totalCostBasis)}
              />
              <StatCard
                label="Gain/Loss"
                value={formatCurrency(stats.totalGainLoss)}
                valueColor={stats.totalGainLoss >= 0 ? 'text-green-500' : 'text-red-500'}
              />
            </div>
          </>
        ) : (
          <p className="text-text-muted text-center py-8">
            Add holdings to see your portfolio summary.
          </p>
        )}
      </div>

      {/* Metal Breakdown */}
      {hasHoldings && (
        <div className="p-6 rounded-lg bg-surface border border-border">
          <h2 className="text-lg font-semibold mb-4">Metal Breakdown</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {stats.metalStats
              .filter((m) => m.totalOz > 0)
              .map((metal) => {
                const percentage = stats.totalMeltValue > 0
                  ? (metal.meltValue / stats.totalMeltValue) * 100
                  : 0;

                return (
                  <div
                    key={metal.metal}
                    className="p-4 rounded-lg border border-border"
                    style={{ backgroundColor: `${METAL_COLORS[metal.metal]}15` }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className="font-semibold"
                        style={{ color: METAL_COLORS[metal.metal] }}
                      >
                        {METAL_LABELS[metal.metal]}
                      </span>
                      <span className="text-sm text-text-muted">
                        {percentage.toFixed(1)}%
                      </span>
                    </div>
                    <p className="text-xl font-bold">{formatCurrency(metal.meltValue)}</p>
                    <p className="text-sm text-text-muted">{formatOz(metal.totalOz)}</p>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Pie Chart & Quick Stats */}
      {hasHoldings && stats.allocation.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Pie Chart */}
          <div className="p-6 rounded-lg bg-surface border border-border">
            <h2 className="text-lg font-semibold mb-4">Allocation</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.allocation}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {stats.allocation.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => formatCurrency(value as number)}
                    contentStyle={{
                      backgroundColor: '#141414',
                      border: '1px solid #2a2a2a',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: '#fff' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap justify-center gap-4 mt-4">
              {stats.allocation.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm text-text-muted">
                    {item.name} ({item.percentage.toFixed(0)}%)
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="p-6 rounded-lg bg-surface border border-border">
            <h2 className="text-lg font-semibold mb-4">Quick Stats</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b border-border">
                <span className="text-text-muted">Total Holdings</span>
                <span className="font-semibold">{stats.itemCount} items</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-border">
                <span className="text-text-muted">Gold/Silver Ratio</span>
                <span className="font-semibold">
                  {stats.goldSilverRatio > 0 ? stats.goldSilverRatio.toFixed(1) : '--'}
                </span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-border">
                <span className="text-text-muted">Avg Premium Paid</span>
                <span className={`font-semibold ${stats.avgPremiumPct > 0 ? 'text-gold' : 'text-green-500'}`}>
                  {stats.avgPremiumPct > 0 ? '+' : ''}{stats.avgPremiumPct.toFixed(1)}%
                </span>
              </div>
              {stats.metalStats.find(m => m.metal === 'gold' && m.totalOz > 0) && (
                <div className="flex justify-between items-center py-3 border-b border-border">
                  <span className="text-text-muted">Gold Holdings</span>
                  <span className="font-semibold text-gold">
                    {formatOz(stats.metalStats.find(m => m.metal === 'gold')!.totalOz)}
                  </span>
                </div>
              )}
              {stats.metalStats.find(m => m.metal === 'silver' && m.totalOz > 0) && (
                <div className="flex justify-between items-center py-3">
                  <span className="text-text-muted">Silver Holdings</span>
                  <span className="font-semibold text-gray-300">
                    {formatOz(stats.metalStats.find(m => m.metal === 'silver')!.totalOz)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!hasHoldings && (
        <div className="text-center py-12">
          <p className="text-text-muted mb-4">
            Start tracking your precious metals portfolio.
          </p>
          <a
            href="/add"
            className="inline-block px-6 py-3 bg-gold text-background font-semibold rounded-lg hover:bg-gold-hover transition-colors"
          >
            Add Your First Holding
          </a>
        </div>
      )}
    </div>
  );
}
