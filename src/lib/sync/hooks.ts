'use client';

import { useState, useEffect, useCallback } from 'react';
import { syncService } from '../sync/SyncService';
import type { SyncStatus } from '../sync/types';

export function useOnlineStatus() {
    const [isOnline, setIsOnline] = useState(
        typeof navigator !== 'undefined' ? navigator.onLine : true
    );

    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            // Automatically sync pending changes when coming back online
            syncService.pushChanges();
        };

        const handleOffline = () => {
            setIsOnline(false);
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    return isOnline;
}

export function useSyncStatus() {
    const [status, setStatus] = useState<SyncStatus>(syncService.getStatus());
    const isOnline = useOnlineStatus();

    useEffect(() => {
        const unsubscribe = syncService.onStatusChange(setStatus);
        return unsubscribe;
    }, []);

    const sync = useCallback(async () => {
        if (isOnline) {
            await syncService.pushChanges();
        }
    }, [isOnline]);

    return {
        ...status,
        isOnline,
        sync,
    };
}
