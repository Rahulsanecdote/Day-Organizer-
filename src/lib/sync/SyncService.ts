// SyncService - Handles bidirectional sync between IndexedDB and Supabase
import { supabase, isCloudSyncEnabled } from '../supabase/client';
import { db } from '../database';
import { logger } from '../logger';
import type { PendingChange, SyncStatus } from './types';
import type { Habit, Task, DailyInput, PlanOutput, UserPreferences } from '@/types';
import type { Json } from '@/types/supabase';

// Store pending changes in IndexedDB for persistence
const PENDING_CHANGES_KEY = 'sync_pending_changes';
const LAST_SYNC_KEY = 'sync_last_sync_at';

export class SyncService {
    private static instance: SyncService;
    private pendingChanges: PendingChange[] = [];
    private isSyncing = false;
    private lastSyncAt: string | null = null;
    private listeners: Set<(status: SyncStatus) => void> = new Set();

    private constructor() {
        this.loadPendingChanges();
    }

    static getInstance(): SyncService {
        if (!SyncService.instance) {
            SyncService.instance = new SyncService();
        }
        return SyncService.instance;
    }

    // Load pending changes from localStorage
    private loadPendingChanges(): void {
        try {
            const stored = localStorage.getItem(PENDING_CHANGES_KEY);
            if (stored) {
                this.pendingChanges = JSON.parse(stored);
            }
            this.lastSyncAt = localStorage.getItem(LAST_SYNC_KEY);
        } catch (error) {
            logger.error('Failed to load pending changes', { error: String(error) });
        }
    }

    // Save pending changes to localStorage
    private savePendingChanges(): void {
        try {
            localStorage.setItem(PENDING_CHANGES_KEY, JSON.stringify(this.pendingChanges));
            if (this.lastSyncAt) {
                localStorage.setItem(LAST_SYNC_KEY, this.lastSyncAt);
            }
        } catch (error) {
            logger.error('Failed to save pending changes', { error: String(error) });
        }
    }

    // Get current sync status
    getStatus(): SyncStatus {
        return {
            lastSyncAt: this.lastSyncAt,
            pendingCount: this.pendingChanges.length,
            isSyncing: this.isSyncing,
            lastError: null,
        };
    }

    // Subscribe to status changes
    onStatusChange(callback: (status: SyncStatus) => void): () => void {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    private notifyListeners(): void {
        const status = this.getStatus();
        this.listeners.forEach(cb => cb(status));
    }

    // Queue a change for sync
    queueChange(
        table: PendingChange['table'],
        recordId: string,
        operation: PendingChange['operation'],
        data: Record<string, unknown>
    ): void {
        // Remove any existing pending change for this record
        this.pendingChanges = this.pendingChanges.filter(
            c => !(c.table === table && c.recordId === recordId)
        );

        // Add new change
        this.pendingChanges.push({
            id: `${table}-${recordId}-${Date.now()}`,
            table,
            recordId,
            operation,
            data,
            timestamp: new Date().toISOString(),
            retryCount: 0,
        });

        this.savePendingChanges();
        this.notifyListeners();

        // Attempt sync if online
        if (navigator.onLine && isCloudSyncEnabled()) {
            this.pushChanges();
        }
    }

    // Initial sync - pull all user data from cloud
    async initialSync(userId: string): Promise<void> {
        if (!supabase || !isCloudSyncEnabled()) return;

        this.isSyncing = true;
        this.notifyListeners();

        try {
            // Fetch all user data from cloud
            const [habits, tasks, dailyInputs, plans] = await Promise.all([
                supabase.from('habits').select('*').eq('user_id', userId).is('deleted_at', null),
                supabase.from('tasks').select('*').eq('user_id', userId).is('deleted_at', null),
                supabase.from('daily_inputs').select('*').eq('user_id', userId),
                supabase.from('plans').select('*').eq('user_id', userId),
            ]);

            // Fetch preferences separately (uses maybeSingle)
            const preferences = await supabase
                .from('user_preferences')
                .select('*')
                .eq('user_id', userId)
                .maybeSingle();

            // Merge habits to local
            if (habits.data) {
                await this.mergeToLocal('habits', habits.data);
            }

            // Merge tasks to local
            if (tasks.data) {
                await this.mergeToLocal('tasks', tasks.data);
            }

            // Merge daily inputs to local
            if (dailyInputs.data) {
                await this.mergeToLocal('daily_inputs', dailyInputs.data);
            }

            // Merge plans to local
            if (plans.data) {
                await this.mergeToLocal('plans', plans.data);
            }

            // Merge preferences
            if (preferences.data) {
                await this.mergePreferences(preferences.data);
            }

            this.lastSyncAt = new Date().toISOString();
            this.savePendingChanges();
        } catch (error) {
            logger.error('Initial sync failed', { error: String(error) });
            throw error;
        } finally {
            this.isSyncing = false;
            this.notifyListeners();
        }
    }

    // Push pending changes to cloud
    async pushChanges(): Promise<void> {
        if (!supabase || !isCloudSyncEnabled() || this.isSyncing) return;
        if (this.pendingChanges.length === 0) return;

        this.isSyncing = true;
        this.notifyListeners();

        const successfulIds: string[] = [];

        try {
            for (const change of this.pendingChanges) {
                try {
                    if (change.operation === 'delete') {
                        // Soft delete - use type assertion for dynamic table
                        await (supabase
                            .from(change.table) as ReturnType<typeof supabase.from>)
                            .update({ deleted_at: new Date().toISOString() })
                            .eq('id', change.recordId);
                    } else {
                        // Upsert - use type assertion for dynamic table
                        const currentVersion = typeof change.data.version === 'number' ? change.data.version : 0;
                        const { error } = await (supabase
                            .from(change.table) as ReturnType<typeof supabase.from>)
                            .upsert({
                                ...change.data,
                                updated_at: new Date().toISOString(),
                                version: currentVersion + 1,
                            });

                        if (error) throw error;
                    }

                    successfulIds.push(change.id);
                } catch (error) {
                    logger.error('Sync failed', {
                        table: change.table,
                        recordId: change.recordId,
                        error: error instanceof Error ? error.message : JSON.stringify(error)
                    });
                    change.retryCount++;
                }
            }

            // Remove successful changes
            this.pendingChanges = this.pendingChanges.filter(
                c => !successfulIds.includes(c.id)
            );

            this.lastSyncAt = new Date().toISOString();
            this.savePendingChanges();
        } finally {
            this.isSyncing = false;
            this.notifyListeners();
        }
    }

    // Pull changes from cloud (incremental sync)
    async pullChanges(userId: string): Promise<void> {
        if (!supabase || !isCloudSyncEnabled()) return;

        const since = this.lastSyncAt || '1970-01-01T00:00:00Z';

        try {
            const [habits, tasks] = await Promise.all([
                supabase
                    .from('habits')
                    .select('*')
                    .eq('user_id', userId)
                    .gt('updated_at', since),
                supabase
                    .from('tasks')
                    .select('*')
                    .eq('user_id', userId)
                    .gt('updated_at', since),
            ]);

            if (habits.data) {
                await this.mergeToLocal('habits', habits.data);
            }

            if (tasks.data) {
                await this.mergeToLocal('tasks', tasks.data);
            }

            this.lastSyncAt = new Date().toISOString();
            this.savePendingChanges();
        } catch (error) {
            logger.error('Pull changes failed', { error: String(error) });
        }
    }

    // Merge remote data to local IndexedDB
    private async mergeToLocal(
        table: 'habits' | 'tasks' | 'daily_inputs' | 'plans',
        records: Record<string, Json>[]
    ): Promise<void> {
        for (const remote of records) {
            // Check if this record has a pending local change
            const hasPending = this.pendingChanges.some(
                c => c.table === table && c.recordId === remote.id
            );

            if (hasPending) {
                // Local changes take priority - skip this remote record
                continue;
            }

            // Handle soft deletes
            if (remote.deleted_at) {
                await this.deleteFromLocal(table, remote.id as string);
                continue;
            }

            // Transform cloud data to local format
            const localRecord = this.transformToLocal(table, remote);

            // Upsert to local
            switch (table) {
                case 'habits':
                    await db.habits.put(localRecord as unknown as Habit);
                    break;
                case 'tasks':
                    await db.tasks.put(localRecord as unknown as Task);
                    break;
                case 'daily_inputs':
                    await db.dailyInputs.put(localRecord as unknown as DailyInput & { id: string });
                    break;
                case 'plans':
                    await db.plans.put(localRecord as unknown as PlanOutput & { id: string });
                    break;
            }
        }
    }

    // Delete from local IndexedDB
    private async deleteFromLocal(table: string, id: string): Promise<void> {
        switch (table) {
            case 'habits':
                await db.habits.delete(id);
                break;
            case 'tasks':
                await db.tasks.delete(id);
                break;
            case 'daily_inputs':
                await db.dailyInputs.delete(id);
                break;
            case 'plans':
                await db.plans.delete(id);
                break;
        }
    }

    // Merge preferences
    private async mergePreferences(remote: Record<string, Json>): Promise<void> {
        const existing = await db.preferences.toArray();
        // Remote preferences take priority if local is empty or we want cloud to be source of truth
        if (existing.length === 0) {
            await db.preferences.add({
                timezone: remote.timezone || 'America/New_York',
                defaultSleepStart: remote.default_sleep_start,
                defaultSleepEnd: remote.default_sleep_end,
                defaultBuffers: remote.default_buffers,
                defaultDowntimeProtection: remote.default_downtime_protection,
                gymSettings: remote.gym_settings,
                theme: remote.theme,
                notifications: remote.notifications,
            } as unknown as UserPreferences);
        }
    }

    // Transform cloud record to local format (snake_case to camelCase)
    private transformToLocal(table: string, remote: Record<string, Json>): Record<string, Json> {
        switch (table) {
            case 'habits':
                return {
                    id: remote.id,
                    name: remote.name,
                    duration: remote.duration,
                    frequency: remote.frequency,
                    specificDays: remote.specific_days,
                    timesPerWeek: remote.times_per_week,
                    preferredTimeWindow: remote.preferred_time_window,
                    explicitStartTime: remote.explicit_start_time,
                    explicitEndTime: remote.explicit_end_time,
                    priority: remote.priority,
                    flexibility: remote.flexibility,
                    minimumViableDuration: remote.minimum_viable_duration,
                    cooldownDays: remote.cooldown_days,
                    energyLevel: remote.energy_level,
                    category: remote.category,
                    isActive: remote.is_active,
                    createdAt: remote.created_at,
                    updatedAt: remote.updated_at,
                };
            case 'tasks':
                return {
                    id: remote.id,
                    title: remote.title,
                    description: remote.description,
                    estimatedDuration: remote.estimated_duration,
                    dueDate: remote.due_date,
                    priority: remote.priority,
                    category: remote.category,
                    energyLevel: remote.energy_level,
                    timeWindowPreference: remote.time_window_preference,
                    isSplittable: remote.is_splittable,
                    chunkSize: remote.chunk_size,
                    dependencies: remote.dependencies,
                    isCompleted: remote.is_completed,
                    isActive: remote.is_active,
                    createdAt: remote.created_at,
                    updatedAt: remote.updated_at,
                };
            default:
                return remote;
        }
    }

    // Transform local record to cloud format (camelCase to snake_case)
    transformToCloud(table: string, local: Record<string, unknown>, userId: string): Record<string, unknown> {
        const base = {
            id: local.id,
            user_id: userId,
            created_at: local.createdAt,
            updated_at: local.updatedAt,
        };

        switch (table) {
            case 'habits':
                return {
                    ...base,
                    name: local.name,
                    duration: local.duration,
                    frequency: local.frequency,
                    specific_days: local.specificDays,
                    times_per_week: local.timesPerWeek,
                    preferred_time_window: local.preferredTimeWindow,
                    explicit_start_time: local.explicitStartTime,
                    explicit_end_time: local.explicitEndTime,
                    priority: local.priority,
                    flexibility: local.flexibility,
                    minimum_viable_duration: local.minimumViableDuration,
                    cooldown_days: local.cooldownDays,
                    energy_level: local.energyLevel,
                    category: local.category,
                    is_active: local.isActive,
                };
            case 'tasks':
                return {
                    ...base,
                    title: local.title,
                    description: local.description,
                    estimated_duration: local.estimatedDuration,
                    due_date: local.dueDate,
                    priority: local.priority,
                    category: local.category,
                    energy_level: local.energyLevel,
                    time_window_preference: local.timeWindowPreference,
                    is_splittable: local.isSplittable,
                    chunk_size: local.chunkSize,
                    dependencies: local.dependencies,
                    is_completed: local.isCompleted,
                    is_active: local.isActive,
                };
            default:
                return { ...base, ...local };
        }
    }

    // Subscribe to realtime changes
    subscribeToChanges(userId: string): () => void {
        if (!supabase || !isCloudSyncEnabled()) {
            return () => { };
        }

        const channel = supabase
            .channel('user-sync')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    filter: `user_id=eq.${userId}`,
                },
                (payload) => this.handleRemoteChange(payload)
            )
            .subscribe();

        return () => {
            channel.unsubscribe();
        };
    }

    // Handle incoming realtime changes
    private async handleRemoteChange(payload: {
        table?: string;
        eventType: string;
        new?: Record<string, unknown> | null;
        old?: Record<string, unknown> | null;
    }): Promise<void> {
        const { table, eventType, new: newRecord, old: oldRecord } = payload;

        // Validate table is one we care about
        const validTables = ['habits', 'tasks', 'daily_inputs', 'plans'] as const;
        if (!table || !validTables.includes(table as typeof validTables[number])) {
            return;
        }

        const typedTable = table as typeof validTables[number];
        const recordId = (newRecord?.id || oldRecord?.id) as string | undefined;

        if (!recordId) return;

        // Ignore if we have a pending change for this record
        const hasPending = this.pendingChanges.some(
            c => c.table === typedTable && c.recordId === recordId
        );
        if (hasPending) return;

        switch (eventType) {
            case 'INSERT':
            case 'UPDATE':
                if (newRecord) {
                    await this.mergeToLocal(typedTable, [newRecord as Record<string, Json>]);
                }
                break;
            case 'DELETE':
                await this.deleteFromLocal(typedTable, recordId);
                break;
        }

        this.notifyListeners();
    }
}

// Export singleton instance
export const syncService = SyncService.getInstance();
