/**
 * Import Data Validation & Sanitization
 * 
 * Security layer for validating and sanitizing imported JSON data.
 * Prevents XSS, prototype pollution, and data corruption attacks.
 */

import type { Habit, Task } from '@/types';

// =============================================================================
// CONSTANTS
// =============================================================================

/** Maximum string length for text fields to prevent DoS */
const MAX_STRING_LENGTH = 10000;

/** Maximum array length to prevent DoS */
const MAX_ARRAY_LENGTH = 1000;

/** Allowed characters pattern for IDs (alphanumeric, hyphens, underscores) */
const SAFE_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;

/** Time format pattern (HH:MM) */
const TIME_FORMAT_PATTERN = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;

/** Date format pattern (YYYY-MM-DD) */
const DATE_FORMAT_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** ISO datetime pattern */
const ISO_DATETIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

// =============================================================================
// SANITIZATION UTILITIES
// =============================================================================

/**
 * Sanitize a string by escaping HTML entities and truncating.
 * Prevents XSS when strings are rendered in the UI.
 */
export function sanitizeString(value: unknown, maxLength = MAX_STRING_LENGTH): string {
    if (typeof value !== 'string') return '';

    return value
        .slice(0, maxLength)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
}

/**
 * Validate and sanitize an ID field.
 * IDs must be alphanumeric with hyphens/underscores only.
 */
export function sanitizeId(value: unknown): string | null {
    if (typeof value !== 'string') return null;

    const trimmed = value.trim().slice(0, 255);
    if (!SAFE_ID_PATTERN.test(trimmed)) return null;

    return trimmed;
}

/**
 * Validate a time string (HH:MM format).
 */
export function isValidTime(value: unknown): boolean {
    return typeof value === 'string' && TIME_FORMAT_PATTERN.test(value);
}

/**
 * Validate a date string (YYYY-MM-DD format).
 */
export function isValidDate(value: unknown): boolean {
    return typeof value === 'string' && DATE_FORMAT_PATTERN.test(value);
}

/**
 * Validate an ISO datetime string.
 */
export function isValidISODateTime(value: unknown): boolean {
    return typeof value === 'string' && ISO_DATETIME_PATTERN.test(value);
}

/**
 * Validate a number is within expected bounds.
 */
export function isValidNumber(value: unknown, min: number, max: number): boolean {
    return typeof value === 'number' && !isNaN(value) && value >= min && value <= max;
}

/**
 * Validate a value is one of the allowed options.
 */
export function isOneOf<T>(value: unknown, options: readonly T[]): value is T {
    return options.includes(value as T);
}

// =============================================================================
// ENTITY VALIDATORS
// =============================================================================

/**
 * Validate and sanitize a Habit object.
 */
export function validateHabit(data: unknown): Habit | null {
    if (!data || typeof data !== 'object') return null;
    const obj = data as Record<string, unknown>;

    const id = sanitizeId(obj.id);
    if (!id) return null;

    const name = sanitizeString(obj.name, 200);
    if (!name) return null;

    if (!isValidNumber(obj.duration, 1, 480)) return null;

    const validFrequencies = ['daily', 'weekly', 'specific-days', 'x-times-per-week'] as const;
    if (!isOneOf(obj.frequency, validFrequencies)) return null;

    const validPriorities = [1, 2, 3, 4, 5] as const;
    if (!isOneOf(obj.priority, validPriorities)) return null;

    const validFlexibility = ['fixed', 'semi-flex', 'flexible'] as const;
    if (!isOneOf(obj.flexibility, validFlexibility)) return null;

    const validEnergy = ['low', 'medium', 'high'] as const;
    if (!isOneOf(obj.energyLevel, validEnergy)) return null;

    const validCategories = ['work', 'get-a-job', 'writing', 'painting', 'vibe-coding', 'phd', 'o1b', 'health', 'learning'] as const;
    if (!isOneOf(obj.category, validCategories)) return null;

    if (typeof obj.isActive !== 'boolean') return null;
    if (!isValidISODateTime(obj.createdAt) || !isValidISODateTime(obj.updatedAt)) return null;

    // Build sanitized habit
    const habit: Habit = {
        id,
        name,
        duration: obj.duration as number,
        frequency: obj.frequency as Habit['frequency'],
        priority: obj.priority as Habit['priority'],
        flexibility: obj.flexibility as Habit['flexibility'],
        energyLevel: obj.energyLevel as Habit['energyLevel'],
        category: obj.category as Habit['category'],
        isActive: obj.isActive as boolean,
        createdAt: obj.createdAt as string,
        updatedAt: obj.updatedAt as string,
    };

    // Optional fields
    if (Array.isArray(obj.specificDays)) {
        habit.specificDays = obj.specificDays.filter((d): d is number =>
            typeof d === 'number' && d >= 0 && d <= 6
        ).slice(0, 7);
    }
    if (isValidNumber(obj.timesPerWeek, 1, 7)) {
        habit.timesPerWeek = obj.timesPerWeek as number;
    }
    if (isOneOf(obj.preferredTimeWindow, ['morning', 'afternoon', 'evening', 'explicit'] as const)) {
        habit.preferredTimeWindow = obj.preferredTimeWindow;
    }
    if (isValidTime(obj.explicitStartTime)) {
        habit.explicitStartTime = obj.explicitStartTime as string;
    }
    if (isValidTime(obj.explicitEndTime)) {
        habit.explicitEndTime = obj.explicitEndTime as string;
    }
    if (isValidNumber(obj.minimumViableDuration, 1, 480)) {
        habit.minimumViableDuration = obj.minimumViableDuration as number;
    }
    if (isValidNumber(obj.cooldownDays, 0, 30)) {
        habit.cooldownDays = obj.cooldownDays as number;
    }

    return habit;
}

/**
 * Validate and sanitize a Task object.
 */
export function validateTask(data: unknown): Task | null {
    if (!data || typeof data !== 'object') return null;
    const obj = data as Record<string, unknown>;

    const id = sanitizeId(obj.id);
    if (!id) return null;

    const title = sanitizeString(obj.title, 500);
    if (!title) return null;

    if (!isValidNumber(obj.estimatedDuration, 1, 480)) return null;

    const validPriorities = [1, 2, 3, 4, 5] as const;
    if (!isOneOf(obj.priority, validPriorities)) return null;

    const validCategories = ['life', 'admin', 'learning', 'creative', 'work', 'health'] as const;
    if (!isOneOf(obj.category, validCategories)) return null;

    const validEnergy = ['low', 'medium', 'high'] as const;
    if (!isOneOf(obj.energyLevel, validEnergy)) return null;

    if (typeof obj.isSplittable !== 'boolean') return null;
    if (typeof obj.isCompleted !== 'boolean') return null;
    if (typeof obj.isActive !== 'boolean') return null;
    if (!isValidISODateTime(obj.createdAt) || !isValidISODateTime(obj.updatedAt)) return null;

    const task: Task = {
        id,
        title,
        estimatedDuration: obj.estimatedDuration as number,
        priority: obj.priority as Task['priority'],
        category: obj.category as Task['category'],
        energyLevel: obj.energyLevel as Task['energyLevel'],
        isSplittable: obj.isSplittable as boolean,
        isCompleted: obj.isCompleted as boolean,
        isActive: obj.isActive as boolean,
        createdAt: obj.createdAt as string,
        updatedAt: obj.updatedAt as string,
    };

    // Optional fields
    if (typeof obj.description === 'string') {
        task.description = sanitizeString(obj.description, 2000);
    }
    if (isValidDate(obj.dueDate)) {
        task.dueDate = obj.dueDate as string;
    }
    if (isOneOf(obj.timeWindowPreference, ['morning', 'afternoon', 'evening'] as const)) {
        task.timeWindowPreference = obj.timeWindowPreference;
    }
    if (isValidNumber(obj.chunkSize, 5, 120)) {
        task.chunkSize = obj.chunkSize as number;
    }
    if (Array.isArray(obj.dependencies)) {
        task.dependencies = obj.dependencies
            .map(d => sanitizeId(d))
            .filter((d): d is string => d !== null)
            .slice(0, 20);
    }

    return task;
}

// =============================================================================
// IMPORT DATA VALIDATION
// =============================================================================

export interface ImportValidationResult {
    isValid: boolean;
    errors: string[];
    sanitizedData: {
        habits: Habit[];
        tasks: Task[];
        // Other entities are simpler - we'll do basic sanitization in importData
    };
    stats: {
        habitsImported: number;
        habitsRejected: number;
        tasksImported: number;
        tasksRejected: number;
    };
}

/**
 * Validate and sanitize imported data.
 * Returns sanitized data with validation errors.
 */
export function validateImportData(jsonData: string): ImportValidationResult {
    const result: ImportValidationResult = {
        isValid: true,
        errors: [],
        sanitizedData: {
            habits: [],
            tasks: [],
        },
        stats: {
            habitsImported: 0,
            habitsRejected: 0,
            tasksImported: 0,
            tasksRejected: 0,
        },
    };

    // Parse JSON safely
    let data: unknown;
    try {
        data = JSON.parse(jsonData);
    } catch {
        result.isValid = false;
        result.errors.push('Invalid JSON format');
        return result;
    }

    // Ensure it's an object (not array, not primitives)
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
        result.isValid = false;
        result.errors.push('Import data must be an object');
        return result;
    }

    const obj = data as Record<string, unknown>;

    // Validate habits
    if (Array.isArray(obj.habits)) {
        let habitsArray = obj.habits as unknown[];
        if (habitsArray.length > MAX_ARRAY_LENGTH) {
            result.errors.push(`Too many habits (max ${MAX_ARRAY_LENGTH})`);
            habitsArray = habitsArray.slice(0, MAX_ARRAY_LENGTH);
        }

        for (const habit of habitsArray) {
            const validated = validateHabit(habit);
            if (validated) {
                result.sanitizedData.habits.push(validated);
                result.stats.habitsImported++;
            } else {
                result.stats.habitsRejected++;
            }
        }
    }

    // Validate tasks
    if (Array.isArray(obj.tasks)) {
        let tasksArray = obj.tasks as unknown[];
        if (tasksArray.length > MAX_ARRAY_LENGTH) {
            result.errors.push(`Too many tasks (max ${MAX_ARRAY_LENGTH})`);
            tasksArray = tasksArray.slice(0, MAX_ARRAY_LENGTH);
        }

        for (const task of tasksArray) {
            const validated = validateTask(task);
            if (validated) {
                result.sanitizedData.tasks.push(validated);
                result.stats.tasksImported++;
            } else {
                result.stats.tasksRejected++;
            }
        }
    }

    // Report rejected items as warnings
    if (result.stats.habitsRejected > 0) {
        result.errors.push(`${result.stats.habitsRejected} habit(s) failed validation and were skipped`);
    }
    if (result.stats.tasksRejected > 0) {
        result.errors.push(`${result.stats.tasksRejected} task(s) failed validation and were skipped`);
    }

    return result;
}
