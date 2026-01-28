// Database schema and operations using Dexie (IndexedDB)

import Dexie, { Table } from 'dexie';
import { Habit, Task, DailyInput, PlanOutput, UserPreferences, DayHistory, AssistantLog, TomorrowSuggestion, FeatureFlag } from '@/types';
import { validateImportData, type ImportValidationResult } from './import-validator';

export class AppDatabase extends Dexie {
  habits!: Table<Habit>;
  tasks!: Table<Task>;
  dailyInputs!: Table<DailyInput & { id: string }>;
  plans!: Table<PlanOutput & { id: string }>;
  preferences!: Table<UserPreferences>;
  history!: Table<DayHistory>;

  // Assistant & Quest tables
  assistantLogs!: Table<AssistantLog>;
  tomorrowSuggestions!: Table<TomorrowSuggestion>;
  featureFlags!: Table<FeatureFlag>;

  constructor() {
    super('DailyOrganizationDB');

    this.version(1).stores({
      habits: 'id, name, category, isActive, createdAt, updatedAt',
      tasks: 'id, title, category, isActive, isCompleted, dueDate, createdAt, updatedAt',
      dailyInputs: 'id, date, timezone',
      plans: 'id, date',
      preferences: 'timezone',
      history: 'date'
    });

    /**
     * Version 2: Local-only assistant & gamification tables.
     * 
     * These tables are intentionally NOT synced to Supabase:
     * - assistantLogs: Device-specific command history (no cross-device value)
     * - tomorrowSuggestions: Cached AI suggestions for planning (ephemeral)
     * - featureFlags: Local preference toggles (e.g., Quest Mode)
     * 
     * This is correct architecture: ephemeral/device-local data shouldn't sync.
     */
    this.version(2).stores({
      assistantLogs: 'id, timestamp, commandType, success',
      tomorrowSuggestions: 'id, date',
      featureFlags: 'key'
    });
  }
}

// Default database instance
export const db = new AppDatabase();

/**
 * Database Service Implementation - Instance-based design for dependency injection and testability.
 * 
 * Usage in production:
 *   import { databaseService } from '@/lib/database';
 *   const habits = await databaseService.getAllHabits();
 * 
 * Usage in tests (with mock database):
 *   import { DatabaseServiceImpl } from '@/lib/database';
 *   const mockDb = createMockDatabase();
 *   const testService = new DatabaseServiceImpl(mockDb);
 *   const habits = await testService.getAllHabits();
 */
export class DatabaseServiceImpl {
  constructor(private database: AppDatabase) { }

  // Assistant & Quest Operations
  async logAssistantCommand(log: AssistantLog): Promise<void> {
    await this.database.assistantLogs.put(log);
  }

  async getAssistantLogs(limit: number = 50): Promise<AssistantLog[]> {
    return await this.database.assistantLogs.orderBy('timestamp').reverse().limit(limit).toArray();
  }

  async saveTomorrowSuggestion(suggestion: TomorrowSuggestion): Promise<void> {
    await this.database.tomorrowSuggestions.put(suggestion);
  }

  async getTomorrowSuggestion(date: string): Promise<TomorrowSuggestion | undefined> {
    return await this.database.tomorrowSuggestions.get({ date });
  }


  async setFeatureFlag(key: string, enabled: boolean): Promise<void> {
    await this.database.featureFlags.put({ key, enabled });
  }

  async getFeatureFlag(key: string): Promise<boolean> {
    const flag = await this.database.featureFlags.get(key);
    return flag ? flag.enabled : false;
  }

  // Habits operations
  async getAllHabits(): Promise<Habit[]> {
    // Avoid boolean indexes (not valid IndexedDB keys); filter in JS instead
    return await this.database.habits.filter(habit => habit.isActive !== false).toArray();
  }

  async getHabit(id: string): Promise<Habit | undefined> {
    return await this.database.habits.get(id);
  }

  async saveHabit(habit: Habit): Promise<void> {
    await this.database.habits.put(habit);
  }

  async deleteHabit(id: string): Promise<void> {
    await this.database.habits.update(id, { isActive: false });
  }

  async seedDefaultHabits(): Promise<void> {
    const existingHabits = await this.database.habits.count();
    if (existingHabits > 0) return;

    const defaultHabits: Habit[] = [
      {
        id: 'habit-meditation',
        name: 'Meditation',
        duration: 15,
        frequency: 'daily',
        preferredTimeWindow: 'morning',
        priority: 3,
        flexibility: 'flexible',
        energyLevel: 'low',
        category: 'health',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'habit-reading',
        name: 'Reading',
        duration: 30,
        frequency: 'daily',
        preferredTimeWindow: 'evening',
        priority: 2,
        flexibility: 'flexible',
        energyLevel: 'low',
        category: 'learning',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'habit-exercise',
        name: 'Exercise',
        duration: 45,
        frequency: 'x-times-per-week',
        timesPerWeek: 4,
        preferredTimeWindow: 'morning',
        priority: 4,
        flexibility: 'semi-flex',
        energyLevel: 'high',
        category: 'health',
        isActive: true,
        cooldownDays: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    ];

    await this.database.habits.bulkAdd(defaultHabits);
  }

  // Tasks operations
  async getAllTasks(): Promise<Task[]> {
    return await this.database.tasks.filter(task => task.isActive !== false).toArray();
  }

  async getTask(id: string): Promise<Task | undefined> {
    return await this.database.tasks.get(id);
  }

  async saveTask(task: Task): Promise<void> {
    await this.database.tasks.put(task);
  }

  async deleteTask(id: string): Promise<void> {
    await this.database.tasks.update(id, { isActive: false });
  }

  async completeTask(id: string): Promise<void> {
    await this.database.tasks.update(id, {
      isCompleted: true,
      updatedAt: new Date().toISOString()
    });
  }

  async seedDefaultTasks(): Promise<void> {
    const existingTasks = await this.database.tasks.count();
    if (existingTasks > 0) return;

    const defaultTasks: Task[] = [
      {
        id: 'task-email-review',
        title: 'Review emails',
        description: 'Check and respond to important emails',
        estimatedDuration: 30,
        priority: 3,
        category: 'work',
        energyLevel: 'medium',
        timeWindowPreference: 'morning',
        isSplittable: false,
        isCompleted: false,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'task-grocery-shopping',
        title: 'Grocery shopping',
        description: 'Buy groceries for the week',
        estimatedDuration: 60,
        priority: 2,
        category: 'life',
        energyLevel: 'medium',
        timeWindowPreference: 'afternoon',
        isSplittable: false,
        isCompleted: false,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'task-project-planning',
        title: 'Project planning',
        description: 'Plan next week\'s project milestones',
        estimatedDuration: 45,
        priority: 4,
        category: 'work',
        energyLevel: 'high',
        timeWindowPreference: 'morning',
        isSplittable: true,
        chunkSize: 25,
        isCompleted: false,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    ];

    await this.database.tasks.bulkAdd(defaultTasks);
  }

  // Daily inputs operations
  async saveDailyInput(input: DailyInput): Promise<string> {
    const id = `${input.date}-${input.timezone}`;
    await this.database.dailyInputs.put({ ...input, id });
    return id;
  }

  async getDailyInput(date: string, timezone: string): Promise<DailyInput | undefined> {
    const id = `${date}-${timezone}`;
    return await this.database.dailyInputs.get(id);
  }

  // Plans operations
  async savePlan(plan: PlanOutput): Promise<string> {
    const id = `${plan.date}`;
    await this.database.plans.put({ ...plan, id });
    return id;
  }

  async getPlan(date: string): Promise<PlanOutput | undefined> {
    return await this.database.plans.get(date);
  }

  async getPlansInRange(startDate: string, endDate: string): Promise<PlanOutput[]> {
    return await this.database.plans
      .where('date')
      .between(startDate, endDate, true, true)
      .toArray();
  }

  // Preferences operations
  async getPreferences(): Promise<UserPreferences | undefined> {
    const prefs = await this.database.preferences.toArray();
    return prefs.length > 0 ? prefs[0] : undefined;
  }

  async savePreferences(preferences: UserPreferences): Promise<void> {
    await this.database.preferences.clear();
    await this.database.preferences.add(preferences);
  }

  async getDefaultPreferences(): Promise<UserPreferences> {
    return {
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      defaultSleepStart: '23:30',
      defaultSleepEnd: '07:30',
      defaultBuffers: 10,
      defaultDowntimeProtection: 30,
      gymSettings: {
        enabled: true,
        frequency: 4,
        defaultDuration: 60,
        preferredWindow: 'after-work',
        minimumDuration: 20,
        bedtimeBuffer: 120,
        warmupDuration: 5,
        cooldownDuration: 5,
      },
      theme: 'system',
      notifications: {
        enabled: true,
        reminderMinutes: 15,
        completionCheckMinutes: 30,
      },
    };
  }

  // History operations
  async saveDayHistory(history: DayHistory): Promise<void> {
    await this.database.history.put(history);
  }

  async getDayHistory(date: string): Promise<DayHistory | undefined> {
    return await this.database.history.get(date);
  }

  async getHistoryInRange(startDate: string, endDate: string): Promise<DayHistory[]> {
    return await this.database.history
      .where('date')
      .between(startDate, endDate, true, true)
      .toArray();
  }

  // Utility operations
  async clearAllData(): Promise<void> {
    await this.database.delete();
  }

  async exportData(): Promise<string> {
    const habits = await this.database.habits.toArray();
    const tasks = await this.database.tasks.toArray();
    const dailyInputs = await this.database.dailyInputs.toArray();
    const plans = await this.database.plans.toArray();
    const preferences = await this.database.preferences.toArray();
    const history = await this.database.history.toArray();
    const assistantLogs = await this.database.assistantLogs.toArray();
    const tomorrowSuggestions = await this.database.tomorrowSuggestions.toArray();
    const featureFlags = await this.database.featureFlags.toArray();

    return JSON.stringify({
      habits,
      tasks,
      dailyInputs,
      plans,
      preferences,
      history,
      assistantLogs,
      tomorrowSuggestions,
      featureFlags,
      exportDate: new Date().toISOString(),
    });
  }

  async importData(jsonData: string): Promise<{ success: boolean; errors: string[]; stats: ImportValidationResult['stats'] }> {
    // Validate and sanitize import data
    const validation = validateImportData(jsonData);

    if (!validation.isValid) {
      return {
        success: false,
        errors: validation.errors,
        stats: validation.stats,
      };
    }

    // Parse again to get full object for legacy fields
    // (validation already handled habits/tasks, we'll do basic sanitization for others)
    let data: Record<string, unknown>;
    try {
      data = JSON.parse(jsonData);
    } catch {
      return { success: false, errors: ['Invalid JSON'], stats: validation.stats };
    }

    await this.database.transaction('rw', [this.database.habits, this.database.tasks, this.database.dailyInputs, this.database.plans, this.database.preferences, this.database.history, this.database.assistantLogs, this.database.tomorrowSuggestions, this.database.featureFlags], async () => {
      // Use validated/sanitized habits and tasks
      if (validation.sanitizedData.habits.length > 0) {
        await this.database.habits.bulkPut(validation.sanitizedData.habits);
      }
      if (validation.sanitizedData.tasks.length > 0) {
        await this.database.tasks.bulkPut(validation.sanitizedData.tasks);
      }

      // For other tables, apply basic validation (arrays only, limited size)
      if (Array.isArray(data.dailyInputs) && data.dailyInputs.length <= 1000) {
        await this.database.dailyInputs.bulkPut(data.dailyInputs as (DailyInput & { id: string })[]);
      }
      if (Array.isArray(data.plans) && data.plans.length <= 1000) {
        await this.database.plans.bulkPut(data.plans as (PlanOutput & { id: string })[]);
      }
      if (Array.isArray(data.preferences) && data.preferences.length <= 10) {
        await this.database.preferences.bulkPut(data.preferences as UserPreferences[]);
      }
      if (Array.isArray(data.history) && data.history.length <= 365) {
        await this.database.history.bulkPut(data.history as DayHistory[]);
      }
      if (Array.isArray(data.assistantLogs) && data.assistantLogs.length <= 1000) {
        await this.database.assistantLogs.bulkPut(data.assistantLogs as AssistantLog[]);
      }
      if (Array.isArray(data.tomorrowSuggestions) && data.tomorrowSuggestions.length <= 100) {
        await this.database.tomorrowSuggestions.bulkPut(data.tomorrowSuggestions as TomorrowSuggestion[]);
      }
      if (Array.isArray(data.featureFlags) && data.featureFlags.length <= 50) {
        await this.database.featureFlags.bulkPut(data.featureFlags as FeatureFlag[]);
      }
    });

    return {
      success: true,
      errors: validation.errors, // May contain warnings about rejected items
      stats: validation.stats,
    };
  }
}

// Singleton instance for production use
export const databaseService = new DatabaseServiceImpl(db);

/**
 * Static facade for backward compatibility.
 * @deprecated Use `databaseService` instance instead for new code.
 * 
 * Existing code using `DatabaseServiceStatic.methodName()` will continue to work,
 * but new code should use `databaseService.methodName()` for better testability.
 */
export const DatabaseServiceStatic = {
  // Assistant & Quest Operations
  logAssistantCommand: (log: AssistantLog) => databaseService.logAssistantCommand(log),
  getAssistantLogs: (limit?: number) => databaseService.getAssistantLogs(limit),
  saveTomorrowSuggestion: (suggestion: TomorrowSuggestion) => databaseService.saveTomorrowSuggestion(suggestion),
  getTomorrowSuggestion: (date: string) => databaseService.getTomorrowSuggestion(date),
  setFeatureFlag: (key: string, enabled: boolean) => databaseService.setFeatureFlag(key, enabled),
  getFeatureFlag: (key: string) => databaseService.getFeatureFlag(key),

  // Habits operations
  getAllHabits: () => databaseService.getAllHabits(),
  getHabit: (id: string) => databaseService.getHabit(id),
  saveHabit: (habit: Habit) => databaseService.saveHabit(habit),
  deleteHabit: (id: string) => databaseService.deleteHabit(id),
  seedDefaultHabits: () => databaseService.seedDefaultHabits(),

  // Tasks operations
  getAllTasks: () => databaseService.getAllTasks(),
  getTask: (id: string) => databaseService.getTask(id),
  saveTask: (task: Task) => databaseService.saveTask(task),
  deleteTask: (id: string) => databaseService.deleteTask(id),
  completeTask: (id: string) => databaseService.completeTask(id),
  seedDefaultTasks: () => databaseService.seedDefaultTasks(),

  // Daily inputs operations
  saveDailyInput: (input: DailyInput) => databaseService.saveDailyInput(input),
  getDailyInput: (date: string, timezone: string) => databaseService.getDailyInput(date, timezone),

  // Plans operations
  savePlan: (plan: PlanOutput) => databaseService.savePlan(plan),
  getPlan: (date: string) => databaseService.getPlan(date),
  getPlansInRange: (startDate: string, endDate: string) => databaseService.getPlansInRange(startDate, endDate),

  // Preferences operations
  getPreferences: () => databaseService.getPreferences(),
  savePreferences: (preferences: UserPreferences) => databaseService.savePreferences(preferences),
  getDefaultPreferences: () => databaseService.getDefaultPreferences(),

  // History operations
  saveDayHistory: (history: DayHistory) => databaseService.saveDayHistory(history),
  getDayHistory: (date: string) => databaseService.getDayHistory(date),
  getHistoryInRange: (startDate: string, endDate: string) => databaseService.getHistoryInRange(startDate, endDate),

  // Utility operations
  clearAllData: () => databaseService.clearAllData(),
  exportData: () => databaseService.exportData(),
  importData: (jsonData: string) => databaseService.importData(jsonData),
};

// Re-export static facade as DatabaseService for full backward compatibility
// This allows existing code using `DatabaseService.methodName()` to work unchanged
export { DatabaseServiceStatic as DatabaseService };

// Initialize database with default data
export async function initializeDatabase(): Promise<void> {
  await db.open();

  // Seed default data if needed
  await databaseService.seedDefaultHabits();
  await databaseService.seedDefaultTasks();

  // Set default preferences if none exist
  const existingPrefs = await databaseService.getPreferences();
  if (!existingPrefs) {
    const defaultPrefs = await databaseService.getDefaultPreferences();
    await databaseService.savePreferences(defaultPrefs);
  }
}
