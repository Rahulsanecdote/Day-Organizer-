// Sync types for tracking changes
import { Json } from '@/types/supabase';

export interface PendingChange {
    id: string;
    table: 'habits' | 'tasks' | 'daily_inputs' | 'plans' | 'user_preferences';
    recordId: string;
    operation: 'insert' | 'update' | 'delete';
    data: Record<string, unknown>;
    timestamp: string;
    retryCount: number;
}

export interface SyncStatus {
    lastSyncAt: string | null;
    pendingCount: number;
    isSyncing: boolean;
    lastError: string | null;
}

export interface SyncConflict {
    table: string;
    recordId: string;
    localData: Record<string, Json>;
    remoteData: Record<string, Json>;
    localUpdatedAt: string;
    remoteUpdatedAt: string;
}
