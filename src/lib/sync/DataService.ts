// DataService - Unified data layer that handles local-first with cloud sync
import { DatabaseService } from '../database';
import { syncService } from './SyncService';
import { isCloudSyncEnabled } from '../supabase/client';
import type { Habit, Task, DailyInput, PlanOutput, UserPreferences, DayHistory } from '@/types';

export class DataService {
    private static userId: string | null = null;

    // Set current user ID for sync operations
    static setUserId(userId: string | null): void {
        DataService.userId = userId;
    }

    // ============================================================================
    // HABITS
    // ============================================================================

    static async getAllHabits(): Promise<Habit[]> {
        // Always read from local (fast, works offline)
        return await DatabaseService.getAllHabits();
    }

    static async getHabit(id: string): Promise<Habit | undefined> {
        return await DatabaseService.getHabit(id);
    }

    static async saveHabit(habit: Habit): Promise<void> {
        const now = new Date().toISOString();
        const record = {
            ...habit,
            updatedAt: now,
            createdAt: habit.createdAt || now,
        };

        // 1. Save locally (immediate UI update)
        await DatabaseService.saveHabit(record);

        // 2. Queue for cloud sync if user is authenticated
        if (DataService.userId && isCloudSyncEnabled()) {
            const cloudData = syncService.transformToCloud('habits', record as unknown as Record<string, unknown>, DataService.userId);
            syncService.queueChange('habits', habit.id, habit.createdAt ? 'update' : 'insert', cloudData);
        }
    }

    static async deleteHabit(id: string): Promise<void> {
        // 1. Mark as deleted locally
        await DatabaseService.deleteHabit(id);

        // 2. Queue for cloud sync
        if (DataService.userId && isCloudSyncEnabled()) {
            syncService.queueChange('habits', id, 'delete', { id });
        }
    }

    // ============================================================================
    // TASKS
    // ============================================================================

    static async getAllTasks(): Promise<Task[]> {
        return await DatabaseService.getAllTasks();
    }

    static async getTask(id: string): Promise<Task | undefined> {
        return await DatabaseService.getTask(id);
    }

    static async saveTask(task: Task): Promise<void> {
        const now = new Date().toISOString();
        const record = {
            ...task,
            updatedAt: now,
            createdAt: task.createdAt || now,
        };

        // 1. Save locally
        await DatabaseService.saveTask(record);

        // 2. Queue for cloud sync
        if (DataService.userId && isCloudSyncEnabled()) {
            const cloudData = syncService.transformToCloud('tasks', record as unknown as Record<string, unknown>, DataService.userId);
            syncService.queueChange('tasks', task.id, task.createdAt ? 'update' : 'insert', cloudData);
        }
    }

    static async deleteTask(id: string): Promise<void> {
        await DatabaseService.deleteTask(id);

        if (DataService.userId && isCloudSyncEnabled()) {
            syncService.queueChange('tasks', id, 'delete', { id });
        }
    }

    static async completeTask(id: string): Promise<void> {
        await DatabaseService.completeTask(id);

        if (DataService.userId && isCloudSyncEnabled()) {
            const task = await DatabaseService.getTask(id);
            if (task) {
                const cloudData = syncService.transformToCloud('tasks', task as unknown as Record<string, unknown>, DataService.userId);
                syncService.queueChange('tasks', id, 'update', cloudData);
            }
        }
    }

    // ============================================================================
    // DAILY INPUTS
    // ============================================================================

    static async getDailyInput(date: string, timezone: string): Promise<DailyInput | undefined> {
        return await DatabaseService.getDailyInput(date, timezone);
    }

    static async saveDailyInput(input: DailyInput): Promise<string> {
        const id = await DatabaseService.saveDailyInput(input);

        if (DataService.userId && isCloudSyncEnabled()) {
            syncService.queueChange('daily_inputs', id, 'update', {
                id,
                user_id: DataService.userId,
                date: input.date,
                sleep_start: input.sleep.start,
                sleep_end: input.sleep.end,
                fixed_events: input.fixedEvents,
                constraints: input.constraints,
                updated_at: new Date().toISOString(),
            });
        }

        return id;
    }

    // ============================================================================
    // PLANS
    // ============================================================================

    static async getPlan(date: string): Promise<PlanOutput | undefined> {
        return await DatabaseService.getPlan(date);
    }

    static async savePlan(plan: PlanOutput): Promise<string> {
        const id = await DatabaseService.savePlan(plan);

        if (DataService.userId && isCloudSyncEnabled()) {
            syncService.queueChange('plans', id, 'update', {
                id,
                user_id: DataService.userId,
                date: plan.date,
                blocks: plan.blocks,
                unscheduled: plan.unscheduled,
                explanation: plan.explanation,
                stats: plan.stats,
                next_day_suggestions: plan.nextDaySuggestions,
                generated_at: plan.generatedAt,
                timezone: plan.timezone,
                is_late_night_mode: plan.isLateNightMode,
                updated_at: new Date().toISOString(),
            });
        }

        return id;
    }

    // ============================================================================
    // PREFERENCES
    // ============================================================================

    static async getPreferences(): Promise<UserPreferences | undefined> {
        return await DatabaseService.getPreferences();
    }

    static async savePreferences(preferences: UserPreferences): Promise<void> {
        await DatabaseService.savePreferences(preferences);

        if (DataService.userId && isCloudSyncEnabled()) {
            syncService.queueChange('user_preferences', DataService.userId, 'update', {
                user_id: DataService.userId,
                default_sleep_start: preferences.defaultSleepStart,
                default_sleep_end: preferences.defaultSleepEnd,
                default_buffers: preferences.defaultBuffers,
                default_downtime_protection: preferences.defaultDowntimeProtection,
                gym_settings: preferences.gymSettings,
                theme: preferences.theme,
                notifications: preferences.notifications,
                updated_at: new Date().toISOString(),
            });
        }
    }

    static async getDefaultPreferences(): Promise<UserPreferences> {
        return await DatabaseService.getDefaultPreferences();
    }

    // ============================================================================
    // SYNC OPERATIONS
    // ============================================================================

    static async performInitialSync(): Promise<void> {
        if (DataService.userId && isCloudSyncEnabled()) {
            await syncService.initialSync(DataService.userId);
        }
    }

    static async performIncrementalSync(): Promise<void> {
        if (DataService.userId && isCloudSyncEnabled()) {
            await syncService.pullChanges(DataService.userId);
            await syncService.pushChanges();
        }
    }

    static subscribeToRealtimeChanges(): () => void {
        if (DataService.userId && isCloudSyncEnabled()) {
            return syncService.subscribeToChanges(DataService.userId);
        }
        return () => { };
    }

    // ============================================================================
    // HISTORY
    // ============================================================================

    static async getHistoryInRange(startDate: string, endDate: string) {
        return await DatabaseService.getHistoryInRange(startDate, endDate);
    }

    static async saveDayHistory(history: DayHistory): Promise<void> {
        await DatabaseService.saveDayHistory(history);

        if (DataService.userId && isCloudSyncEnabled()) {
            // Sync history if needed (optional for now as history is derivative)
        }
    }
}
