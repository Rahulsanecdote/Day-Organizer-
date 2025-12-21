// Core data types for the Daily Organization App

export interface TimeSlot {
  start: string; // "HH:MM" format
  end: string; // "HH:MM" format
}

export interface Sleep {
  start: string; // "HH:MM" format
  end: string; // "HH:MM" format
}

export interface FixedEvent {
  title: string;
  start: string; // "HH:MM" format
  end: string; // "HH:MM" format;
  type: 'work' | 'meal' | 'appointment' | 'call' | 'other';
  location?: string;
  locked?: boolean;
}

export interface DayConstraints {
  buffersBetweenBlocksMin: number;
  protectDowntimeMin: number;
  commuteTimeMin?: number;
  mealWindows?: Array<{
    start: string;
    end: string;
    type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  }>;
}

export interface DailyInput {
  date: string; // "YYYY-MM-DD" format
  timezone: string;
  sleep: Sleep;
  fixedEvents: FixedEvent[];
  constraints: DayConstraints;
}

// Habit related types
export type Frequency = 'daily' | 'weekly' | 'specific-days' | 'x-times-per-week';

export interface Habit {
  id: string;
  name: string;
  duration: number; // in minutes
  frequency: Frequency;
  specificDays?: number[]; // 0-6, where 0 is Sunday
  timesPerWeek?: number;
  preferredTimeWindow?: 'morning' | 'afternoon' | 'evening' | 'explicit';
  explicitStartTime?: string; // "HH:MM" format
  explicitEndTime?: string; // "HH:MM" format
  priority: 1 | 2 | 3 | 4 | 5;
  flexibility: 'fixed' | 'semi-flex' | 'flexible';
  minimumViableDuration?: number;
  cooldownDays?: number;
  energyLevel: 'low' | 'medium' | 'high';
  category: 'health' | 'learning' | 'personal' | 'work' | 'creative' | 'social';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Task related types
export interface Task {
  id: string;
  title: string;
  description?: string;
  estimatedDuration: number; // in minutes
  dueDate?: string; // "YYYY-MM-DD" format
  priority: 1 | 2 | 3 | 4 | 5;
  category: 'life' | 'admin' | 'learning' | 'creative' | 'work' | 'health';
  energyLevel: 'low' | 'medium' | 'high';
  timeWindowPreference?: 'morning' | 'afternoon' | 'evening';
  isSplittable: boolean;
  chunkSize?: number; // in minutes if splittable
  dependencies?: string[]; // task IDs that must be completed first
  isCompleted: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Gym specific types
export interface GymSettings {
  enabled: boolean;
  frequency: number; // times per week
  defaultDuration: number; // in minutes
  preferredWindow: 'after-work' | 'morning' | 'evening';
  minimumDuration: number; // in minutes
  bedtimeBuffer: number; // minutes before bedtime to avoid gym
  warmupDuration: number; // in minutes
  cooldownDuration: number; // in minutes
}

// Scheduled block types
export type BlockType = 'work' | 'habit' | 'task' | 'meal' | 'gym' | 'break' | 'sleep';

export interface ScheduledBlock {
  id: string;
  title: string;
  start: string; // "HH:MM" format
  end: string; // "HH:MM" format
  type: BlockType;
  locked: boolean;
  completed: boolean;
  sourceId?: string; // reference to habit or task id
  originalDuration?: number; // for minimum viable tracking
  energyLevel?: 'low' | 'medium' | 'high';
  notes?: string;
}

// Plan output
export interface UnscheduledItem {
  title: string;
  reason: string;
  sourceId?: string;
  priority?: number;
}

export interface PlanOutput {
  date: string;
  blocks: ScheduledBlock[];
  unscheduled: UnscheduledItem[];
  explanation: string;
  stats: {
    workHours: number;
    gymMinutes: number;
    habitsCompleted: number;
    tasksCompleted: number;
    focusBlocks: number;
    freeTimeRemaining: number;
  };
  nextDaySuggestions?: string[];
}

// User preferences and settings
export interface UserPreferences {
  timezone: string;
  defaultSleepStart: string;
  defaultSleepEnd: string;
  defaultBuffers: number;
  defaultDowntimeProtection: number;
  gymSettings: GymSettings;
  theme: 'light' | 'dark' | 'system';
  notifications: {
    enabled: boolean;
    reminderMinutes: number;
    completionCheckMinutes: number;
  };
}

// History and tracking
export interface DayHistory {
  date: string;
  plannedBlocks: ScheduledBlock[];
  actualBlocks: ScheduledBlock[];
  completionStats: {
    habitsCompleted: number;
    tasksCompleted: number;
    totalScheduled: number;
    totalCompleted: number;
  };
  notes?: string;
  mood?: 1 | 2 | 3 | 4 | 5;
  energy?: 1 | 2 | 3 | 4 | 5;
}

// Scheduling algorithm types
export interface SchedulingContext {
  dailyInput: DailyInput;
  habits: Habit[];
  tasks: Task[];
  gymSettings: GymSettings;
  userPreferences: UserPreferences;
}

export interface TimeSlot {
  start: Date;
  end: Date;
  duration: number;
}

export interface ScoringFactors {
  priority: number;
  urgency: number;
  preferredWindow: number;
  energyMatch: number;
  fragmentationPenalty: number;
  lateNightPenalty: number;
}

// Parsed text input types
export interface ParsedScheduleItem {
  title: string;
  start: string;
  end: string;
  type: FixedEvent['type'];
}

export interface ParsedTextInput {
  items: ParsedScheduleItem[];
  unparsedText: string;
}