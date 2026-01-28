'use client';

import { useSyncStatus } from '@/lib/sync';
import { isCloudSyncEnabled } from '@/lib/supabase';

export function SyncStatusIndicator() {
    const { isOnline, isSyncing, pendingCount } = useSyncStatus();
    const cloudEnabled = isCloudSyncEnabled();

    // Don't show if cloud sync is not configured
    if (!cloudEnabled) {
        return (
            <div
                className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs"
                style={{
                    background: 'var(--color-ivory)',
                    color: 'var(--color-mist)',
                }}
            >
                <span className="w-2 h-2 rounded-full bg-gray-400" />
                <span>Local only</span>
            </div>
        );
    }

    // Offline indicator
    if (!isOnline) {
        return (
            <div
                className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs"
                style={{
                    background: '#FEF3C7',
                    color: '#92400E',
                }}
            >
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span>Offline</span>
                {pendingCount > 0 && <span>({pendingCount} pending)</span>}
            </div>
        );
    }

    // Syncing indicator
    if (isSyncing) {
        return (
            <div
                className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs"
                style={{
                    background: '#DBEAFE',
                    color: '#1E40AF',
                }}
            >
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                <span>Syncing...</span>
            </div>
        );
    }

    // Pending changes
    if (pendingCount > 0) {
        return (
            <div
                className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs"
                style={{
                    background: '#FEF3C7',
                    color: '#92400E',
                }}
            >
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span>{pendingCount} to sync</span>
            </div>
        );
    }

    // Synced
    return (
        <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs"
            style={{
                background: '#D1FAE5',
                color: '#065F46',
            }}
        >
            <span className="w-2 h-2 rounded-full bg-green-500" />
            <span>Synced</span>
        </div>
    );
}
