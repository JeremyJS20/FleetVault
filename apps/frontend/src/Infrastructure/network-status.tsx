import React, { createContext, useContext, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { getQueuedInspections, syncQueuedInspections } from './offline-queue.js';
import { apiClient } from './api-client.js';

interface NetworkStatusContextType {
  isOnline: boolean;
  queuedCount: number;
  isSyncing: boolean;
  syncQueue: () => Promise<void>;
  triggerQueueRefresh: () => Promise<void>;
}

const NetworkStatusContext = createContext<NetworkStatusContextType | undefined>(undefined);

export const NetworkStatusProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t } = useTranslation();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [queuedCount, setQueuedCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);

  const triggerQueueRefresh = async () => {
    try {
      const items = await getQueuedInspections();
      setQueuedCount(items.length);
    } catch (err) {
      console.error('Failed to count queued items:', err);
    }
  };

  const uploadInspection = async (inspection: any) => {
    return await apiClient('/api/inspections', {
      method: 'POST',
      body: JSON.stringify({
        ...inspection,
        id: undefined,
        queuedAt: undefined
      })
    });
  };

  const syncQueue = async () => {
    if (!isOnline || isSyncing) return;
    setIsSyncing(true);
    setSyncStatusMsg(t('network.syncing'));

    try {
      const result = await syncQueuedInspections(uploadInspection);
      await triggerQueueRefresh();
      if (result.count > 0) {
        setSyncStatusMsg(t('network.syncSuccess', { count: result.count }));
        setTimeout(() => setSyncStatusMsg(null), 3000);
      } else {
        setSyncStatusMsg(null);
      }
    } catch (err) {
      console.error('Sync failed:', err);
      setSyncStatusMsg(t('network.syncFailed'));
      setTimeout(() => setSyncStatusMsg(null), 4000);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncQueue();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check
    triggerQueueRefresh();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isOnline]);

  return (
    <NetworkStatusContext.Provider
      value={{
        isOnline,
        queuedCount,
        isSyncing,
        syncQueue,
        triggerQueueRefresh
      }}
    >
      {children}

      {/* Floating Status Notification Bar */}
      {(!isOnline || queuedCount > 0 || syncStatusMsg) && (
        <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
          {/* Offline Warning Banner */}
          {!isOnline && (
            <div className="pointer-events-auto p-3.5 rounded-2xl border border-accent-error/20 bg-bg-surface/80 backdrop-blur-md shadow-2xl flex items-center gap-3 animate-fade-in">
              <div className="w-8 h-8 rounded-xl bg-accent-error/10 border border-accent-error/20 flex items-center justify-center text-accent-error shrink-0">
                <WifiOff className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-fg-primary leading-none">{t('network.offlineMode')}</p>
                <p className="text-xs text-fg-tertiary mt-1">{t('network.offlineDesc')}</p>
              </div>
            </div>
          )}

          {/* Sync status / Queue Warning Banner */}
          {(queuedCount > 0 || syncStatusMsg) && (
            <div className="pointer-events-auto p-3.5 rounded-2xl border border-accent-primary/20 bg-bg-surface/80 backdrop-blur-md shadow-2xl flex items-center gap-3 animate-fade-in">
              <div className="w-8 h-8 rounded-xl bg-accent-primary/10 border border-accent-primary/20 flex items-center justify-center text-accent-primary shrink-0">
                {isSyncing ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Wifi className="w-4 h-4" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-fg-primary leading-none">
                  {syncStatusMsg || t('network.queuedCount', { count: queuedCount })}
                </p>
                <p className="text-xs text-fg-tertiary mt-1">
                  {isSyncing ? t('network.uploading') : isOnline ? t('network.readyToSync') : t('network.waitingConnection')}
                </p>
              </div>
              {isOnline && !isSyncing && (
                <button
                  onClick={syncQueue}
                  className="px-2 py-1 text-xs font-bold tracking-wider uppercase border border-border-surface/40 rounded bg-bg-inset text-fg-secondary hover:bg-bg-surface"
                >
                  {t('network.sync')}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </NetworkStatusContext.Provider>
  );
};

export const useNetworkStatus = () => {
  const context = useContext(NetworkStatusContext);
  if (context === undefined) {
    throw new Error('useNetworkStatus must be used within a NetworkStatusProvider');
  }
  return context;
};
