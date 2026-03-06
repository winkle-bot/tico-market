'use client';

import { useEffect, useState } from 'react';
import { CloudOff, RotateCw } from 'lucide-react';
import {
  flushOfflineQueue,
  getQueuedMutationCount,
  subscribeToOfflineFlush,
  subscribeToOfflineQueue,
} from '@/lib/offline-queue';

export function OfflineQueueManager() {
  const [queueCount, setQueueCount] = useState(0);
  const [isOnline, setIsOnline] = useState(true);
  const [isFlushing, setIsFlushing] = useState(false);

  useEffect(() => {
    setQueueCount(getQueuedMutationCount());
    setIsOnline(typeof navigator === 'undefined' ? true : navigator.onLine);

    const sync = async () => {
      setIsFlushing(true);
      try {
        const result = await flushOfflineQueue();
        setQueueCount(result.remaining);
      } finally {
        setIsFlushing(false);
      }
    };

    const handleOnline = () => {
      setIsOnline(true);
      void sync();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    const unsubscribeQueue = subscribeToOfflineQueue(setQueueCount);
    const unsubscribeFlush = subscribeToOfflineFlush(() => {
      setQueueCount(getQueuedMutationCount());
    });

    if (navigator.onLine) {
      void sync();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribeQueue();
      unsubscribeFlush();
    };
  }, []);

  if (isOnline && queueCount === 0 && !isFlushing) {
    return null;
  }

  return (
    <div className="fixed bottom-20 left-1/2 z-[120] w-[min(92vw,480px)] -translate-x-1/2 rounded-2xl border border-[#cfe0ff] bg-white/95 px-4 py-3 shadow-xl backdrop-blur-md md:bottom-6">
      <div className="flex items-center gap-3">
        {isFlushing ? (
          <RotateCw className="h-5 w-5 animate-spin text-[#2f67c4]" />
        ) : (
          <CloudOff className="h-5 w-5 text-[#2f67c4]" />
        )}
        <div className="min-w-0">
          <p className="text-sm font-black text-[#18315f]">
            {!isOnline
              ? 'Offline mode active'
              : queueCount > 0
                ? 'Queued actions syncing'
                : 'Reconnected'}
          </p>
          <p className="text-xs font-medium text-[#5c77a7]">
            {!isOnline
              ? `${queueCount} action${queueCount === 1 ? '' : 's'} will send when your connection returns.`
              : queueCount > 0
                ? `${queueCount} queued action${queueCount === 1 ? '' : 's'} waiting to sync.`
                : 'Queued actions have been delivered.'}
          </p>
        </div>
      </div>
    </div>
  );
}
