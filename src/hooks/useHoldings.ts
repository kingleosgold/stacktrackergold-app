import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  getHoldings,
  addHolding as addHoldingLocal,
  updateHolding as updateHoldingLocal,
  deleteHolding as deleteHoldingLocal,
  exportToCSV,
  importFromCSV,
  clearAllHoldings,
} from '../services/holdings';
import {
  fetchSupabaseHoldings,
  addSupabaseHolding,
  updateSupabaseHolding,
  deleteSupabaseHolding,
  syncLocalToSupabase,
} from '../services/supabaseHoldings';
import type { Holding, HoldingFormData, Metal } from '../types/holding';

interface PendingAction {
  id: string;
  type: 'add' | 'update' | 'delete';
  data?: HoldingFormData;
  holdingId?: string;
  timestamp: number;
}

const PENDING_ACTIONS_KEY = 'stacktracker_pending_actions';

function getPendingActions(): PendingAction[] {
  const stored = localStorage.getItem(PENDING_ACTIONS_KEY);
  return stored ? JSON.parse(stored) : [];
}

function savePendingActions(actions: PendingAction[]) {
  localStorage.setItem(PENDING_ACTIONS_KEY, JSON.stringify(actions));
}


interface UseHoldingsResult {
  holdings: Holding[];
  loading: boolean;
  syncing: boolean;
  isOnline: boolean;
  hasPendingChanges: boolean;
  addHolding: (data: HoldingFormData) => Promise<Holding>;
  updateHolding: (id: string, updates: HoldingFormData) => Promise<Holding>;
  deleteHolding: (id: string) => Promise<void>;
  exportCSV: () => string;
  importCSV: (csv: string) => Holding[];
  refresh: () => Promise<void>;
  getTotalsByMetal: () => Record<Metal, { totalOz: number; totalCost: number }>;
  syncPendingChanges: () => Promise<void>;
}

export function useHoldings(): UseHoldingsResult {
  const { user } = useAuth();
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingActions, setPendingActions] = useState<PendingAction[]>(getPendingActions());
  const initialSyncDone = useRef(false);

  // Track online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Fetch holdings
  const fetchHoldings = useCallback(async () => {
    setLoading(true);
    try {
      if (user && isOnline) {
        // Fetch from Supabase when signed in and online
        const supabaseHoldings = await fetchSupabaseHoldings(user.id);
        setHoldings(supabaseHoldings);

        // On first sync, migrate local holdings to Supabase if any
        if (!initialSyncDone.current) {
          const localHoldings = getHoldings();
          if (localHoldings.length > 0 && supabaseHoldings.length === 0) {
            // User has local holdings but none in Supabase - migrate them
            setSyncing(true);
            try {
              await syncLocalToSupabase(localHoldings, user.id);
              const updatedHoldings = await fetchSupabaseHoldings(user.id);
              setHoldings(updatedHoldings);
              clearAllHoldings(); // Clear local after migration
            } catch (err) {
              console.error('Migration failed:', err);
            }
            setSyncing(false);
          }
          initialSyncDone.current = true;
        }
      } else {
        // Use localStorage when signed out or offline
        const localHoldings = getHoldings();
        setHoldings(localHoldings);
      }
    } catch (error) {
      console.error('Error fetching holdings:', error);
      // Fallback to local storage on error
      const localHoldings = getHoldings();
      setHoldings(localHoldings);
    }
    setLoading(false);
  }, [user, isOnline]);

  // Initial fetch
  useEffect(() => {
    fetchHoldings();
  }, [fetchHoldings]);

  // Sync pending changes when coming back online
  useEffect(() => {
    if (isOnline && user && pendingActions.length > 0) {
      syncPendingChanges();
    }
  }, [isOnline, user]);

  const syncPendingChanges = useCallback(async () => {
    if (!user || !isOnline || pendingActions.length === 0) return;

    setSyncing(true);
    const actions = [...pendingActions];
    const failedActions: PendingAction[] = [];

    for (const action of actions) {
      try {
        switch (action.type) {
          case 'add':
            if (action.data) {
              await addSupabaseHolding(action.data, user.id);
            }
            break;
          case 'update':
            if (action.holdingId && action.data) {
              await updateSupabaseHolding(action.holdingId, action.data, user.id);
            }
            break;
          case 'delete':
            if (action.holdingId) {
              await deleteSupabaseHolding(action.holdingId, user.id);
            }
            break;
        }
      } catch (error) {
        console.error('Failed to sync action:', action, error);
        failedActions.push(action);
      }
    }

    setPendingActions(failedActions);
    savePendingActions(failedActions);
    setSyncing(false);

    // Refresh holdings after sync
    await fetchHoldings();
  }, [user, isOnline, pendingActions, fetchHoldings]);

  const addHolding = useCallback(async (data: HoldingFormData): Promise<Holding> => {
    if (user && isOnline) {
      // Add to Supabase
      setSyncing(true);
      try {
        const holding = await addSupabaseHolding(data, user.id);
        setHoldings((prev) => [holding, ...prev]);
        setSyncing(false);
        return holding;
      } catch (error) {
        setSyncing(false);
        // Queue for later if failed
        const action: PendingAction = {
          id: crypto.randomUUID(),
          type: 'add',
          data,
          timestamp: Date.now(),
        };
        const newActions = [...pendingActions, action];
        setPendingActions(newActions);
        savePendingActions(newActions);

        // Add locally as fallback
        const localHolding = addHoldingLocal(data);
        setHoldings((prev) => [localHolding, ...prev]);
        return localHolding;
      }
    } else if (user && !isOnline) {
      // Queue for sync when online
      const action: PendingAction = {
        id: crypto.randomUUID(),
        type: 'add',
        data,
        timestamp: Date.now(),
      };
      const newActions = [...pendingActions, action];
      setPendingActions(newActions);
      savePendingActions(newActions);

      // Add locally
      const localHolding = addHoldingLocal(data);
      setHoldings((prev) => [localHolding, ...prev]);
      return localHolding;
    } else {
      // Not signed in - use localStorage only
      const holding = addHoldingLocal(data);
      setHoldings((prev) => [holding, ...prev]);
      return holding;
    }
  }, [user, isOnline, pendingActions]);

  const updateHolding = useCallback(async (id: string, data: HoldingFormData): Promise<Holding> => {
    if (user && isOnline) {
      setSyncing(true);
      try {
        const holding = await updateSupabaseHolding(id, data, user.id);
        setHoldings((prev) => prev.map((h) => (h.id === id ? holding : h)));
        setSyncing(false);
        return holding;
      } catch (error) {
        setSyncing(false);
        // Queue for later
        const action: PendingAction = {
          id: crypto.randomUUID(),
          type: 'update',
          holdingId: id,
          data,
          timestamp: Date.now(),
        };
        const newActions = [...pendingActions, action];
        setPendingActions(newActions);
        savePendingActions(newActions);

        // Update locally as fallback
        const localHolding = updateHoldingLocal(id, data);
        setHoldings((prev) => prev.map((h) => (h.id === id ? localHolding : h)));
        return localHolding;
      }
    } else if (user && !isOnline) {
      // Queue for sync
      const action: PendingAction = {
        id: crypto.randomUUID(),
        type: 'update',
        holdingId: id,
        data,
        timestamp: Date.now(),
      };
      const newActions = [...pendingActions, action];
      setPendingActions(newActions);
      savePendingActions(newActions);

      const localHolding = updateHoldingLocal(id, data);
      setHoldings((prev) => prev.map((h) => (h.id === id ? localHolding : h)));
      return localHolding;
    } else {
      const holding = updateHoldingLocal(id, data);
      setHoldings((prev) => prev.map((h) => (h.id === id ? holding : h)));
      return holding;
    }
  }, [user, isOnline, pendingActions]);

  const deleteHolding = useCallback(async (id: string): Promise<void> => {
    if (user && isOnline) {
      setSyncing(true);
      try {
        await deleteSupabaseHolding(id, user.id);
        setHoldings((prev) => prev.filter((h) => h.id !== id));
        setSyncing(false);
      } catch (error) {
        setSyncing(false);
        // Queue for later
        const action: PendingAction = {
          id: crypto.randomUUID(),
          type: 'delete',
          holdingId: id,
          timestamp: Date.now(),
        };
        const newActions = [...pendingActions, action];
        setPendingActions(newActions);
        savePendingActions(newActions);

        // Delete locally as fallback
        deleteHoldingLocal(id);
        setHoldings((prev) => prev.filter((h) => h.id !== id));
      }
    } else if (user && !isOnline) {
      // Queue for sync
      const action: PendingAction = {
        id: crypto.randomUUID(),
        type: 'delete',
        holdingId: id,
        timestamp: Date.now(),
      };
      const newActions = [...pendingActions, action];
      setPendingActions(newActions);
      savePendingActions(newActions);

      deleteHoldingLocal(id);
      setHoldings((prev) => prev.filter((h) => h.id !== id));
    } else {
      deleteHoldingLocal(id);
      setHoldings((prev) => prev.filter((h) => h.id !== id));
    }
  }, [user, isOnline, pendingActions]);

  const exportCSV = useCallback((): string => {
    return exportToCSV();
  }, []);

  const importCSV = useCallback((csv: string): Holding[] => {
    const imported = importFromCSV(csv);
    fetchHoldings();
    return imported;
  }, [fetchHoldings]);

  const refresh = useCallback(async () => {
    await fetchHoldings();
  }, [fetchHoldings]);

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
    syncing,
    isOnline,
    hasPendingChanges: pendingActions.length > 0,
    addHolding,
    updateHolding,
    deleteHolding,
    exportCSV,
    importCSV,
    refresh,
    getTotalsByMetal,
    syncPendingChanges,
  };
}
