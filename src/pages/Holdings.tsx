import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useHoldings } from '../hooks/useHoldings';
import { useSpotPrices } from '../hooks/useSpotPrices';
import type { Holding, Metal } from '../types/holding';

const METAL_COLORS: Record<Metal, string> = {
  gold: 'text-gold',
  silver: 'text-gray-300',
  platinum: 'text-blue-300',
  palladium: 'text-purple-300',
};

const METAL_BG: Record<Metal, string> = {
  gold: 'bg-gold/20',
  silver: 'bg-gray-500/20',
  platinum: 'bg-blue-500/20',
  palladium: 'bg-purple-500/20',
};

function formatCurrency(value: number): string {
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatWeight(oz: number): string {
  if (oz >= 1) {
    return `${oz.toFixed(oz % 1 === 0 ? 0 : 2)} oz`;
  }
  const grams = oz / 0.0321507;
  return `${grams.toFixed(1)} g`;
}

interface HoldingRowProps {
  holding: Holding;
  spotPrice: number;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

function HoldingRow({ holding, spotPrice, onEdit, onDelete }: HoldingRowProps) {
  const totalOz = holding.weight * holding.quantity;
  const totalCost = holding.purchasePrice * holding.quantity;
  const currentValue = totalOz * spotPrice;
  const gainLoss = currentValue - totalCost;
  const gainLossPercent = totalCost > 0
    ? (gainLoss / totalCost) * 100
    : 0;
  const isPositive = gainLoss >= 0;

  const handleRowClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking on a button
    if ((e.target as HTMLElement).closest('button')) return;
    onEdit(holding.id);
  };

  return (
    <tr
      className="border-b border-border hover:bg-surface-hover transition-colors cursor-pointer"
      onClick={handleRowClick}
    >
      <td className="py-3 px-4">
        <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${METAL_BG[holding.metal]} ${METAL_COLORS[holding.metal]}`}>
          {holding.metal.charAt(0).toUpperCase() + holding.metal.slice(1)}
        </span>
      </td>
      <td className="py-3 px-4">
        <div className="font-medium">{holding.type}</div>
        {holding.notes && (
          <div className="text-xs text-text-muted truncate max-w-[150px]">{holding.notes}</div>
        )}
      </td>
      <td className="py-3 px-4 text-right">
        {formatWeight(holding.weight)} × {holding.quantity}
      </td>
      <td className="py-3 px-4 text-right">{formatWeight(totalOz)}</td>
      <td className="py-3 px-4 text-right">{formatCurrency(totalCost)}</td>
      <td className="py-3 px-4 text-right">{formatCurrency(currentValue)}</td>
      <td className={`py-3 px-4 text-right ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
        <div>{formatCurrency(gainLoss)}</div>
        <div className="text-xs">
          {isPositive ? '+' : ''}{gainLossPercent.toFixed(1)}%
        </div>
      </td>
      <td className="py-3 px-4 text-right">
        <div className="flex gap-2 justify-end">
          <button
            onClick={() => onEdit(holding.id)}
            className="text-gold hover:text-gold-hover text-sm px-2 py-1 rounded hover:bg-gold/10 transition-colors"
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(holding.id)}
            className="text-red-500 hover:text-red-400 text-sm px-2 py-1 rounded hover:bg-red-500/10 transition-colors"
          >
            Delete
          </button>
        </div>
      </td>
    </tr>
  );
}

export default function Holdings() {
  const navigate = useNavigate();
  const { holdings, loading, syncing, isOnline, hasPendingChanges, deleteHolding, exportCSV, getTotalsByMetal } = useHoldings();
  const { prices } = useSpotPrices();
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const handleEdit = (id: string) => {
    navigate(`/edit/${id}`);
  };

  const handleDelete = async (id: string) => {
    if (confirmDelete === id) {
      await deleteHolding(id);
      setConfirmDelete(null);
    } else {
      setConfirmDelete(id);
      // Reset confirmation after 3 seconds
      setTimeout(() => setConfirmDelete(null), 3000);
    }
  };

  const handleExport = () => {
    const csv = exportCSV();
    if (!csv) {
      alert('No holdings to export');
      return;
    }
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stacktracker-holdings-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getSpotPrice = (metal: Metal): number => {
    if (!prices) return 0;
    return prices[metal] || 0;
  };

  const totals = getTotalsByMetal();

  // Calculate portfolio totals
  const portfolioTotal = Object.entries(totals).reduce((acc, [metal, data]) => {
    const spotPrice = getSpotPrice(metal as Metal);
    return {
      cost: acc.cost + data.totalCost,
      value: acc.value + data.totalOz * spotPrice,
    };
  }, { cost: 0, value: 0 });

  const portfolioGainLoss = portfolioTotal.value - portfolioTotal.cost;
  const portfolioGainLossPercent = portfolioTotal.cost > 0
    ? (portfolioGainLoss / portfolioTotal.cost) * 100
    : 0;

  if (loading) {
    return (
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-6">Holdings</h1>
        <div className="p-6 rounded-lg bg-surface border border-border">
          <p className="text-text-muted">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* Sync Status */}
      {(syncing || !isOnline || hasPendingChanges) && (
        <div className={`mb-4 p-3 rounded-lg border flex items-center gap-2 ${
          !isOnline
            ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500'
            : syncing
            ? 'bg-blue-500/10 border-blue-500/30 text-blue-500'
            : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500'
        }`}>
          {syncing ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
              </svg>
              <span className="text-sm">Syncing...</span>
            </>
          ) : !isOnline ? (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3"/>
              </svg>
              <span className="text-sm">Offline - changes will sync when connected</span>
            </>
          ) : hasPendingChanges ? (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <span className="text-sm">Pending changes to sync</span>
            </>
          ) : null}
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Holdings</h1>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            disabled={holdings.length === 0}
            className="px-3 py-2 text-sm bg-surface border border-border rounded-lg hover:bg-surface-hover transition-colors disabled:opacity-50"
          >
            Export CSV
          </button>
          <Link
            to="/add"
            className="px-3 py-2 text-sm bg-gold text-background font-medium rounded-lg hover:bg-gold-hover transition-colors"
          >
            + Add Holding
          </Link>
        </div>
      </div>

      {/* Portfolio Summary */}
      {holdings.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="p-4 rounded-lg bg-surface border border-border">
            <p className="text-sm text-text-muted">Total Cost</p>
            <p className="text-xl font-semibold">{formatCurrency(portfolioTotal.cost)}</p>
          </div>
          <div className="p-4 rounded-lg bg-surface border border-border">
            <p className="text-sm text-text-muted">Current Value</p>
            <p className="text-xl font-semibold">{formatCurrency(portfolioTotal.value)}</p>
          </div>
          <div className="p-4 rounded-lg bg-surface border border-border">
            <p className="text-sm text-text-muted">Gain/Loss</p>
            <p className={`text-xl font-semibold ${portfolioGainLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {formatCurrency(portfolioGainLoss)}
            </p>
          </div>
          <div className="p-4 rounded-lg bg-surface border border-border">
            <p className="text-sm text-text-muted">Return</p>
            <p className={`text-xl font-semibold ${portfolioGainLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {portfolioGainLoss >= 0 ? '+' : ''}{portfolioGainLossPercent.toFixed(1)}%
            </p>
          </div>
        </div>
      )}

      {/* Holdings Table */}
      {holdings.length === 0 ? (
        <div className="p-6 rounded-lg bg-surface border border-border text-center">
          <p className="text-text-muted mb-4">No holdings yet. Start building your stack!</p>
          <Link
            to="/add"
            className="inline-block px-4 py-2 bg-gold text-background font-medium rounded-lg hover:bg-gold-hover transition-colors"
          >
            Add Your First Holding
          </Link>
        </div>
      ) : (
        <div className="rounded-lg bg-surface border border-border overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="border-b border-border text-left text-sm text-text-muted">
                <th className="py-3 px-4 font-medium">Metal</th>
                <th className="py-3 px-4 font-medium">Type</th>
                <th className="py-3 px-4 font-medium text-right">Weight × Qty</th>
                <th className="py-3 px-4 font-medium text-right">Total Oz</th>
                <th className="py-3 px-4 font-medium text-right">Cost</th>
                <th className="py-3 px-4 font-medium text-right">Value</th>
                <th className="py-3 px-4 font-medium text-right">Gain/Loss</th>
                <th className="py-3 px-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {holdings.map((holding) => (
                <HoldingRow
                  key={holding.id}
                  holding={holding}
                  spotPrice={getSpotPrice(holding.metal)}
                  onEdit={handleEdit}
                  onDelete={confirmDelete === holding.id ? handleDelete : () => handleDelete(holding.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Metal Totals */}
      {holdings.length > 0 && (
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          {(Object.entries(totals) as [Metal, { totalOz: number; totalCost: number }][])
            .filter(([, data]) => data.totalOz > 0)
            .map(([metal, data]) => {
              const spotPrice = getSpotPrice(metal);
              const value = data.totalOz * spotPrice;
              return (
                <div key={metal} className={`p-4 rounded-lg border border-border ${METAL_BG[metal]}`}>
                  <p className={`text-sm font-medium ${METAL_COLORS[metal]}`}>
                    {metal.charAt(0).toUpperCase() + metal.slice(1)}
                  </p>
                  <p className="text-lg font-semibold">{formatWeight(data.totalOz)}</p>
                  <p className="text-sm text-text-muted">{formatCurrency(value)}</p>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
