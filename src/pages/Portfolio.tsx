import { useState, useMemo, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useHoldings } from '../hooks/useHoldings';
import { useSpotPrices } from '../hooks/useSpotPrices';
import { formatCurrency, formatWeight, formatPercent } from '../utils/format';
import { METAL_COLORS, METAL_LABELS, METALS } from '../utils/constants';
import { CardSkeleton, TableRowSkeleton } from '../components/Skeleton';
import HoldingModal from '../components/HoldingModal';
import type { Holding, HoldingFormData, Metal } from '../types/holding';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
};

function SummaryCard({ label, value, subtext, color }: {
  label: string;
  value: string;
  subtext?: string;
  color?: string;
}) {
  return (
    <motion.div variants={item} className="p-4 rounded-xl bg-surface border border-border">
      <p className="text-xs text-text-muted mb-1">{label}</p>
      <p className={`text-xl font-bold ${color || 'text-text'}`}>{value}</p>
      {subtext && <p className="text-xs text-text-muted mt-1">{subtext}</p>}
    </motion.div>
  );
}

export default function Portfolio() {
  const {
    holdings,
    loading,
    syncing,
    isOnline,
    hasPendingChanges,
    addHolding,
    updateHolding,
    deleteHolding,
    getTotalsByMetal,
  } = useHoldings();
  const { prices } = useSpotPrices(60000);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterMetal, setFilterMetal] = useState<Metal | 'all'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingHolding, setEditingHolding] = useState<Holding | null>(null);

  // Keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
    if (e.key === 'n' || e.key === 'N') {
      e.preventDefault();
      setShowAddModal(true);
    }
    if (e.key === '/') {
      e.preventDefault();
      document.getElementById('holding-search')?.focus();
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const getSpotPrice = (metal: Metal): number => prices?.[metal] || 0;

  const filteredHoldings = useMemo(() => {
    let result = holdings;
    if (filterMetal !== 'all') {
      result = result.filter((h) => h.metal === filterMetal);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (h) =>
          h.type.toLowerCase().includes(q) ||
          h.metal.toLowerCase().includes(q) ||
          (h.notes && h.notes.toLowerCase().includes(q))
      );
    }
    return result;
  }, [holdings, filterMetal, searchQuery]);

  const totals = useMemo(() => {
    const metalTotals = getTotalsByMetal();
    let totalCost = 0;
    let totalValue = 0;

    for (const metal of METALS) {
      const data = metalTotals[metal];
      totalCost += data.totalCost;
      totalValue += data.totalOz * getSpotPrice(metal);
    }

    const gainLoss = totalValue - totalCost;
    const gainLossPercent = totalCost > 0 ? (gainLoss / totalCost) * 100 : 0;

    return { totalCost, totalValue, gainLoss, gainLossPercent };
  }, [holdings, prices, getTotalsByMetal]);

  const handleAddHolding = async (data: HoldingFormData) => {
    await addHolding(data);
    setShowAddModal(false);
  };

  const handleEditHolding = async (data: HoldingFormData) => {
    if (!editingHolding) return;
    await updateHolding(editingHolding.id, data);
    setEditingHolding(null);
  };

  const handleDeleteHolding = async () => {
    if (!editingHolding) return;
    await deleteHolding(editingHolding.id);
    setEditingHolding(null);
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Portfolio</h1>
          {/* Sync status */}
          {(syncing || !isOnline || hasPendingChanges) && (
            <p className="text-xs mt-1">
              {syncing && <span className="text-blue-400">Syncing...</span>}
              {!isOnline && <span className="text-yellow-500">Offline</span>}
              {hasPendingChanges && isOnline && !syncing && <span className="text-yellow-500">Pending changes</span>}
            </p>
          )}
        </div>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gold text-background font-medium text-sm rounded-lg hover:bg-gold-hover transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Holding
        </motion.button>
      </div>

      {/* Summary Cards */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {[1, 2, 3, 4].map((i) => <CardSkeleton key={i} />)}
        </div>
      ) : holdings.length > 0 ? (
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6"
        >
          <SummaryCard
            label="Total Value"
            value={formatCurrency(totals.totalValue)}
          />
          <SummaryCard
            label="Cost Basis"
            value={formatCurrency(totals.totalCost)}
          />
          <SummaryCard
            label="Total Gain/Loss"
            value={formatCurrency(totals.gainLoss)}
            color={totals.gainLoss >= 0 ? 'text-green' : 'text-red'}
          />
          <SummaryCard
            label="Return"
            value={formatPercent(totals.gainLossPercent)}
            color={totals.gainLoss >= 0 ? 'text-green' : 'text-red'}
          />
        </motion.div>
      ) : null}

      {/* Search & Filter */}
      {holdings.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              id="holding-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search holdings... (press /)"
              className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-surface border border-border focus:border-gold/50 focus:outline-none text-sm placeholder-text-muted transition-colors"
            />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            <button
              onClick={() => setFilterMetal('all')}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                filterMetal === 'all'
                  ? 'bg-gold/15 text-gold border border-gold/30'
                  : 'bg-surface text-text-muted border border-border hover:border-border-light'
              }`}
            >
              All
            </button>
            {METALS.map((m) => (
              <button
                key={m}
                onClick={() => setFilterMetal(filterMetal === m ? 'all' : m)}
                className="px-3 py-2 rounded-lg text-xs font-medium transition-colors border capitalize"
                style={filterMetal === m ? {
                  backgroundColor: `${METAL_COLORS[m]}15`,
                  color: METAL_COLORS[m],
                  borderColor: `${METAL_COLORS[m]}40`,
                } : {
                  backgroundColor: 'var(--color-surface)',
                  color: 'var(--color-text-muted)',
                  borderColor: 'var(--color-border)',
                }}
              >
                {METAL_LABELS[m]}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Holdings List */}
      {loading ? (
        <div className="rounded-xl bg-surface border border-border overflow-hidden">
          {[1, 2, 3, 4, 5].map((i) => <TableRowSkeleton key={i} />)}
        </div>
      ) : holdings.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-surface border border-border p-12 text-center"
        >
          <div className="w-14 h-14 mx-auto rounded-full bg-gold/10 flex items-center justify-center mb-4">
            <svg className="w-7 h-7 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-text mb-2">No Holdings Yet</h3>
          <p className="text-sm text-text-muted mb-6 max-w-xs mx-auto">
            Start building your precious metals portfolio by adding your first holding.
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-6 py-2.5 bg-gold text-background font-medium text-sm rounded-lg hover:bg-gold-hover transition-colors"
          >
            Add Your First Holding
          </button>
          <p className="text-xs text-text-muted mt-3">Press <kbd className="px-1.5 py-0.5 rounded bg-surface border border-border text-[10px]">N</kbd> to quick add</p>
        </motion.div>
      ) : filteredHoldings.length === 0 ? (
        <div className="rounded-xl bg-surface border border-border p-8 text-center">
          <p className="text-text-muted text-sm">No holdings match your search.</p>
        </div>
      ) : (
        <div className="rounded-xl bg-surface border border-border overflow-hidden">
          {/* Table Header */}
          <div className="hidden md:grid md:grid-cols-[1fr_1.5fr_0.8fr_0.8fr_1fr_1fr_1fr_0.5fr] gap-2 px-5 py-3 border-b border-border text-xs text-text-muted font-medium">
            <span>Metal</span>
            <span>Type</span>
            <span className="text-right">Weight</span>
            <span className="text-right">Qty</span>
            <span className="text-right">Cost</span>
            <span className="text-right">Value</span>
            <span className="text-right">Gain/Loss</span>
            <span className="text-right">Premium</span>
          </div>

          {/* Holdings Rows */}
          <motion.div variants={container} initial="hidden" animate="show">
            {filteredHoldings.map((holding) => {
              const spotPrice = getSpotPrice(holding.metal);
              const totalOz = holding.weight * holding.quantity;
              const currentValue = totalOz * spotPrice;
              const totalCost = holding.purchasePrice * holding.quantity;
              const gainLoss = currentValue - totalCost;
              const gainLossPercent = totalCost > 0 ? (gainLoss / totalCost) * 100 : 0;
              const spotValue = totalOz * spotPrice;
              const premiumOverSpot = spotValue > 0 ? ((totalCost - spotValue) / spotValue) * 100 : 0;
              const isPositive = gainLoss >= 0;

              return (
                <motion.div
                  key={holding.id}
                  variants={item}
                  onClick={() => setEditingHolding(holding)}
                  className="grid grid-cols-2 md:grid-cols-[1fr_1.5fr_0.8fr_0.8fr_1fr_1fr_1fr_0.5fr] gap-2 px-5 py-4 border-b border-border hover:bg-text/[0.02] cursor-pointer transition-colors"
                >
                  {/* Metal Badge */}
                  <div className="flex items-center">
                    <span
                      className="inline-flex px-2.5 py-1 rounded-md text-[11px] font-semibold"
                      style={{
                        backgroundColor: `${METAL_COLORS[holding.metal]}15`,
                        color: METAL_COLORS[holding.metal],
                      }}
                    >
                      {METAL_LABELS[holding.metal]}
                    </span>
                  </div>

                  {/* Type */}
                  <div className="flex items-center">
                    <div>
                      <p className="text-sm font-medium truncate">{holding.type}</p>
                      {holding.notes && (
                        <p className="text-[11px] text-text-muted truncate max-w-[200px]">{holding.notes}</p>
                      )}
                    </div>
                  </div>

                  {/* Weight */}
                  <div className="hidden md:flex items-center justify-end">
                    <span className="text-sm">{formatWeight(holding.weight)}</span>
                  </div>

                  {/* Qty */}
                  <div className="hidden md:flex items-center justify-end">
                    <span className="text-sm">{holding.quantity}</span>
                  </div>

                  {/* Cost */}
                  <div className="hidden md:flex items-center justify-end">
                    <span className="text-sm">{formatCurrency(totalCost)}</span>
                  </div>

                  {/* Value */}
                  <div className="flex items-center justify-end md:justify-end">
                    <span className="text-sm font-medium">{formatCurrency(currentValue)}</span>
                  </div>

                  {/* Gain/Loss */}
                  <div className="hidden md:flex items-center justify-end">
                    <div className="text-right">
                      <p className={`text-sm font-medium ${isPositive ? 'text-green' : 'text-red'}`}>
                        {isPositive ? '+' : ''}{formatCurrency(gainLoss)}
                      </p>
                      <p className={`text-[11px] ${isPositive ? 'text-green/70' : 'text-red/70'}`}>
                        {formatPercent(gainLossPercent)}
                      </p>
                    </div>
                  </div>

                  {/* Premium */}
                  <div className="hidden md:flex items-center justify-end">
                    <span className={`text-xs ${premiumOverSpot > 0 ? 'text-gold' : 'text-green'}`}>
                      {premiumOverSpot > 0 ? '+' : ''}{premiumOverSpot.toFixed(1)}%
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>

          {/* Footer */}
          <div className="px-5 py-3 bg-surface-alt text-xs text-text-muted flex items-center justify-between">
            <span>{filteredHoldings.length} holding{filteredHoldings.length !== 1 ? 's' : ''}</span>
            <span>Press <kbd className="px-1.5 py-0.5 rounded bg-surface border border-border text-[10px]">N</kbd> to add</span>
          </div>
        </div>
      )}

      {/* Add Holding Modal */}
      <HoldingModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAddHolding}
        title="Add Holding"
      />

      {/* Edit Holding Modal */}
      <HoldingModal
        isOpen={!!editingHolding}
        onClose={() => setEditingHolding(null)}
        onSubmit={handleEditHolding}
        onDelete={handleDeleteHolding}
        initialData={editingHolding || undefined}
        title="Edit Holding"
      />
    </div>
  );
}
