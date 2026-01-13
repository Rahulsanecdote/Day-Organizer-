// Database schema and operations using Dexie (IndexedDB)

import Dexie, { Table } from 'dexie';
import { Habit, Task, DailyInput, PlanOutput, UserPreferences, DayHistory, AssistantLog, TomorrowSuggestion, QuestStats, FeatureFlag } from '@/types';

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
  questStats!: Table<QuestStats>;
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

    // Version 2: Add Assistant & Quest tables
    this.version(2).stores({
      assistantLogs: 'id, timestamp, commandType, success',
      tomorrowSuggestions: 'id, date',
      questStats: 'id, date',
      featureFlags: 'key'
    });
  }
}

export const db = new AppDatabase();

// Database operations
export class DatabaseService {
  // Assistant & Quest Operations
  static async logAssistantCommand(log: AssistantLog): Promise<void> {
    await db.assistantLogs.put(log);
  }

  static async getAssistantLogs(limit: number = 50): Promise<AssistantLog[]> {
    return await db.assistantLogs.orderBy('timestamp').reverse().limit(limit).toArray();
  }

  static async saveTomorrowSuggestion(suggestion: TomorrowSuggestion): Promise<void> {
    await db.tomorrowSuggestions.put(suggestion);
  }

  static async getTomorrowSuggestion(date: string): Promise<TomorrowSuggestion | undefined> {
    return await db.tomorrowSuggestions.get({ date });
  }

  static async saveQuestStats(stats: QuestStats): Promise<void> {
    await db.questStats.put(stats);
  }

  static async getQuestStats(date: string): Promise<QuestStats | undefined> {
    return await db.questStats.get({ date });
  }

  static async setFeatureFlag(key: string, enabled: boolean): Promise<void> {
    await db.featureFlags.put({ key, enabled });
  }

  static async getFeatureFlag(key: string): Promise<boolean> {
    const flag = await db.featureFlags.get(key);
    return flag ? flag.enabled : false;
  }

  // Habits operations
  static async getAllHabits(): Promise<Habit[]> {
    // Avoid boolean indexes (not valid IndexedDB keys); filter in JS instead
    return await db.habits.filter(habit => habit.isActive !== false).toArray();
  }

  static async getHabit(id: string): Promise<Habit | undefined> {
    return await db.habits.get(id);
  }

  static async saveHabit(habit: Habit): Promise<void> {
    await db.habits.put(habit);
  }

  static async deleteHabit(id: string): Promise<void> {
    await db.habits.update(id, { isActive: false });
  }

  static async seedDefaultHabits(): Promise<void> {
    const existingHabits = await db.habits.count();
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

    await db.habits.bulkAdd(defaultHabits);
  }

  // Tasks operations
  static async getAllTasks(): Promise<Task[]> {
    return await db.tasks.filter(task => task.isActive !== false).toArray();
  }

  static async getTask(id: string): Promise<Task | undefined> {
    return await db.tasks.get(id);
  }

  static async saveTask(task: Task): Promise<void> {
    await db.tasks.put(task);
  }

  static async deleteTask(id: string): Promise<void> {
    await db.tasks.update(id, { isActive: false });
  }

  static async completeTask(id: string): Promise<void> {
    await db.tasks.update(id, {
      isCompleted: true,
      updatedAt: new Date().toISOString()
    });
  }

  static async seedDefaultTasks(): Promise<void> {
    const existingTasks = await db.tasks.count();
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

    await db.tasks.bulkAdd(defaultTasks);
  }

  // Daily inputs operations
  static async saveDailyInput(input: DailyInput): Promise<string> {
    const id = `${input.date}-${input.timezone}`;
    await db.dailyInputs.put({ ...input, id });
    return id;
  }

  static async getDailyInput(date: string, timezone: string): Promise<DailyInput | undefined> {
    const id = `${date}-${timezone}`;
    return await db.dailyInputs.get(id);
  }

  // Plans operations
  static async savePlan(plan: PlanOutput): Promise<string> {
    const id = `${plan.date}`;
    await db.plans.put({ ...plan, id });
    return id;
  }

  static async getPlan(date: string): Promise<PlanOutput | undefined> {
    return await db.plans.get(date);
  }

  static async getPlansInRange(startDate: string, endDate: string): Promise<PlanOutput[]> {
    return await db.plans
      .where('date')
      .between(startDate, endDate, true, true)
      .toArray();
  }

  // Preferences operations
  static async getPreferences(): Promise<UserPreferences | undefined> {
    const prefs = await db.preferences.toArray();
    return prefs.length > 0 ? prefs[0] : undefined;
  }

  static async savePreferences(preferences: UserPreferences): Promise<void> {
    await db.preferences.clear();
    await db.preferences.add(preferences);
  }

  static async getDefaultPreferences(): Promise<UserPreferences> {
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
  static async saveDayHistory(history: DayHistory): Promise<void> {
    await db.history.put(history);
  }

  static async getDayHistory(date: string): Promise<DayHistory | undefined> {
    return await db.history.get(date);
  }

  static async getHistoryInRange(startDate: string, endDate: string): Promise<DayHistory[]> {
    return await db.history
      .where('date')
      .between(startDate, endDate, true, true)
      .toArray();
  }

  // Utility operations
  static async clearAllData(): Promise<void> {
    await db.delete();
  }

  static async exportData(): Promise<string> {
    const habits = await db.habits.toArray();
    const tasks = await db.tasks.toArray();
    const dailyInputs = await db.dailyInputs.toArray();
    const plans = await db.plans.toArray();
    const preferences = await db.preferences.toArray();
    const history = await db.history.toArray();
    const assistantLogs = await db.assistantLogs.toArray();
    const tomorrowSuggestions = await db.tomorrowSuggestions.toArray();
    const questStats = await db.questStats.toArray();
    const featureFlags = await db.featureFlags.toArray();

    return JSON.stringify({
      habits,
      tasks,
      dailyInputs,
      plans,
      preferences,
      history,
      assistantLogs,
      tomorrowSuggestions,
      questStats,
      featureFlags,
      exportDate: new Date().toISOString(),
    });
  }

  static async importData(jsonData: string): Promise<void> {
    const data = JSON.parse(jsonData);

    await db.transaction('rw', [db.habits, db.tasks, db.dailyInputs, db.plans, db.preferences, db.history, db.assistantLogs, db.tomorrowSuggestions, db.questStats, db.featureFlags], async () => {
      if (data.habits) await db.habits.bulkPut(data.habits);
      if (data.tasks) await db.tasks.bulkPut(data.tasks);
      if (data.dailyInputs) await db.dailyInputs.bulkPut(data.dailyInputs);
      if (data.plans) await db.plans.bulkPut(data.plans);
      if (data.preferences) await db.preferences.bulkPut(data.preferences);
      if (data.history) await db.history.bulkPut(data.history);
      if (data.assistantLogs) await db.assistantLogs.bulkPut(data.assistantLogs);
      if (data.tomorrowSuggestions) await db.tomorrowSuggestions.bulkPut(data.tomorrowSuggestions);
      if (data.questStats) await db.questStats.bulkPut(data.questStats);
      if (data.featureFlags) await db.featureFlags.bulkPut(data.featureFlags);
    });
  }
}

// Initialize database with default data
export async function initializeDatabase(): Promise<void> {
  await db.open();

  // Seed default data if needed
  await DatabaseService.seedDefaultHabits();
  await DatabaseService.seedDefaultTasks();

  // Set default preferences if none exist
  const existingPrefs = await DatabaseService.getPreferences();
  if (!existingPrefs) {
    const defaultPrefs = await DatabaseService.getDefaultPreferences();
    await DatabaseService.savePreferences(defaultPrefs);
  }
}
