import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { offlineStorage, OfflineOrderRecord } from '../services/db';
import { api } from '../services/api';

interface SyncContextType {
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
  syncNow: () => Promise<void>;
  refreshPendingCount: () => Promise<void>;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

export const SyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const refreshPendingCount = useCallback(async () => {
    try {
      const pending = await offlineStorage.getPendingOrders();
      setPendingCount(pending.length);
    } catch (err) {
      console.warn('Failed to read offline pending orders:', err);
    }
  }, []);

  const syncNow = useCallback(async () => {
    if (!navigator.onLine || isSyncing) return;

    try {
      setIsSyncing(true);
      const pending: OfflineOrderRecord[] = await offlineStorage.getPendingOrders();

      if (pending.length === 0) {
        setIsSyncing(false);
        return;
      }

      console.log(`[Sync Engine] Synchronizing ${pending.length} offline orders...`);
      const payload = pending.map(p => p.order_data);

      const res = await api.syncOfflineOrders(payload);

      if (res.success && Array.isArray(res.results)) {
        for (const item of res.results) {
          if (item.status === 'synced' || item.status === 'already_synced') {
            await offlineStorage.markAsSynced(item.offline_id);
          }
        }
      }

      await refreshPendingCount();
    } catch (error) {
      console.error('[Sync Engine Error]:', error);
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, refreshPendingCount]);

  useEffect(() => {
    refreshPendingCount();

    const handleOnline = () => {
      setIsOnline(true);
      // Auto sync when connection is restored
      syncNow();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Periodic check every 30 seconds
    const interval = setInterval(() => {
      refreshPendingCount();
      if (navigator.onLine && pendingCount > 0) {
        syncNow();
      }
    }, 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [refreshPendingCount, syncNow, pendingCount]);

  return (
    <SyncContext.Provider value={{ isOnline, pendingCount, isSyncing, syncNow, refreshPendingCount }}>
      {children}
    </SyncContext.Provider>
  );
};

export const useSync = () => {
  const context = useContext(SyncContext);
  if (!context) throw new Error('useSync must be used within a SyncProvider');
  return context;
};
