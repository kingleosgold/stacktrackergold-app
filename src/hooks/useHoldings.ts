import { useState, useEffect, useCallback } from 'react';
import {
  getHoldings,
  addHolding as addHoldingService,
  updateHolding as updateHoldingService,
  deleteHolding as deleteHoldingService,
  exportToCSV,
  importFromCSV,
} from '../services/holdings';
import type { Holding, HoldingFormData, Metal } from '../types/holding';

interface UseHoldingsResult {
  holdings: Holding[];
  loading: boolean;
  addHolding: (data: HoldingFormData) => Holding;
  updateHolding: (id: string, updates: Partial<HoldingFormData>) => Holding;
  deleteHolding: (id: string) => void;
  exportCSV: () => string;
  importCSV: (csv: string) => Holding[];
  refresh: () => void;
  getTotalsByMetal: () => Record<Metal, { totalOz: number; totalCost: number }>;
}

export function useHoldings(): UseHoldingsResult {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    setLoading(true);
    const data = getHoldings();
    setHoldings(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addHolding = useCallback((data: HoldingFormData): Holding => {
    const holding = addHoldingService(data);
    refresh();
    return holding;
  }, [refresh]);

  const updateHolding = useCallback((id: string, updates: Partial<HoldingFormData>): Holding => {
    const holding = updateHoldingService(id, updates);
    refresh();
    return holding;
  }, [refresh]);

  const deleteHolding = useCallback((id: string): void => {
    deleteHoldingService(id);
    refresh();
  }, [refresh]);

  const exportCSV = useCallback((): string => {
    return exportToCSV();
  }, []);

  const importCSV = useCallback((csv: string): Holding[] => {
    const imported = importFromCSV(csv);
    refresh();
    return imported;
  }, [refresh]);

  const getTotalsByMetal = useCallback((): Record<Metal, { totalOz: number; totalCost: number }> => {
    const totals: Record<Metal, { totalOz: number; totalCost: number }> = {
      gold: { totalOz: 0, totalCost: 0 },
      silver: { totalOz: 0, totalCost: 0 },
      platinum: { totalOz: 0, totalCost: 0 },
      palladium: { totalOz: 0, totalCost: 0 },
    };

    for (const holding of holdings) {
      const totalOz = holding.weight * holding.quantity;
      totals[holding.metal].totalOz += totalOz;
      totals[holding.metal].totalCost += holding.purchasePrice;
    }

    return totals;
  }, [holdings]);

  return {
    holdings,
    loading,
    addHolding,
    updateHolding,
    deleteHolding,
    exportCSV,
    importCSV,
    refresh,
    getTotalsByMetal,
  };
}
