/**
 * Import Validator Tests
 *
 * The import validator is a security boundary — it's the only gate between
 * raw user-supplied JSON and the local database. Tests here verify XSS
 * prevention, DoS guards, enum enforcement, and sanitization correctness.
 */

import {
    sanitizeString,
    sanitizeId,
    isValidTime,
    isValidDate,
    isValidISODateTime,
    isValidNumber,
    isOneOf,
    validateHabit,
    validateTask,
    validateImportData,
} from '../lib/import-validator';

// ---------------------------------------------------------------------------
// sanitizeString
// ---------------------------------------------------------------------------

describe('sanitizeString', () => {
    it('escapes HTML entities to prevent XSS', () => {
        expect(sanitizeString('<script>alert("xss")</script>')).toBe(
            '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
        );
    });

    it('escapes ampersands', () => {
        expect(sanitizeString('a & b')).toBe('a &amp; b');
    });

    it('escapes single quotes', () => {
        expect(sanitizeString("it's")).toBe('it&#x27;s');
    });

    it('truncates strings exceeding maxLength', () => {
        const long = 'a'.repeat(15000);
        const result = sanitizeString(long);
        expect(result.length).toBeLessThanOrEqual(10000);
    });

    it('respects a custom maxLength', () => {
        const result = sanitizeString('hello world', 5);
        expect(result).toBe('hello');
    });

    it('returns empty string for non-string input', () => {
        expect(sanitizeString(123)).toBe('');
        expect(sanitizeString(null)).toBe('');
        expect(sanitizeString(undefined)).toBe('');
        expect(sanitizeString({})).toBe('');
    });

    it('returns empty string for empty input', () => {
        expect(sanitizeString('')).toBe('');
    });
});

// ---------------------------------------------------------------------------
// sanitizeId
// ---------------------------------------------------------------------------

describe('sanitizeId', () => {
    it('accepts valid alphanumeric IDs', () => {
        expect(sanitizeId('abc123')).toBe('abc123');
        expect(sanitizeId('habit-1')).toBe('habit-1');
        expect(sanitizeId('task_abc')).toBe('task_abc');
    });

    it('rejects IDs with special characters', () => {
        expect(sanitizeId('<script>')).toBeNull();
        expect(sanitizeId('id with space')).toBeNull();
        expect(sanitizeId('id@domain')).toBeNull();
        expect(sanitizeId('../etc/passwd')).toBeNull();
    });

    it('rejects non-string input', () => {
        expect(sanitizeId(123)).toBeNull();
        expect(sanitizeId(null)).toBeNull();
        expect(sanitizeId(undefined)).toBeNull();
    });

    it('trims whitespace before checking', () => {
        // Trimmed value 'abc' is valid
        expect(sanitizeId('  abc  ')).toBe('abc');
    });

    it('rejects empty string', () => {
        // Empty string fails the SAFE_ID_PATTERN (requires at least one char)
        expect(sanitizeId('')).toBeNull();
    });
});

// ---------------------------------------------------------------------------
// isValidTime
// ---------------------------------------------------------------------------

describe('isValidTime', () => {
    it('accepts valid HH:MM times', () => {
        expect(isValidTime('00:00')).toBe(true);
        expect(isValidTime('09:30')).toBe(true);
        expect(isValidTime('23:59')).toBe(true);
    });

    it('rejects invalid formats', () => {
        expect(isValidTime('24:00')).toBe(false);   // hour out of range
        expect(isValidTime('12:60')).toBe(false);   // minute out of range
        expect(isValidTime('12:5')).toBe(false);    // only one digit for minutes
        expect(isValidTime('')).toBe(false);
        expect(isValidTime(null)).toBe(false);
        expect(isValidTime(930)).toBe(false);
        // Note: '9:30' IS valid — the regex allows a single-digit hour prefix
    });
});

// ---------------------------------------------------------------------------
// isValidDate
// ---------------------------------------------------------------------------

describe('isValidDate', () => {
    it('accepts valid YYYY-MM-DD dates', () => {
        expect(isValidDate('2024-01-15')).toBe(true);
        expect(isValidDate('2000-12-31')).toBe(true);
    });

    it('rejects invalid formats', () => {
        expect(isValidDate('01-15-2024')).toBe(false);
        expect(isValidDate('2024/01/15')).toBe(false);
        expect(isValidDate('20240115')).toBe(false);
        expect(isValidDate('')).toBe(false);
        expect(isValidDate(null)).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// isValidISODateTime
// ---------------------------------------------------------------------------

describe('isValidISODateTime', () => {
    it('accepts valid ISO datetime strings', () => {
        expect(isValidISODateTime('2024-01-15T10:00:00')).toBe(true);
        expect(isValidISODateTime('2024-01-15T10:00:00Z')).toBe(true);
        expect(isValidISODateTime('2024-01-15T10:00:00.000Z')).toBe(true);
    });

    it('rejects invalid formats', () => {
        expect(isValidISODateTime('2024-01-15')).toBe(false);
        expect(isValidISODateTime('')).toBe(false);
        expect(isValidISODateTime(null)).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// isValidNumber
// ---------------------------------------------------------------------------

describe('isValidNumber', () => {
    it('accepts numbers within range', () => {
        expect(isValidNumber(1, 1, 10)).toBe(true);
        expect(isValidNumber(10, 1, 10)).toBe(true);
        expect(isValidNumber(5, 1, 10)).toBe(true);
    });

    it('rejects numbers outside range', () => {
        expect(isValidNumber(0, 1, 10)).toBe(false);
        expect(isValidNumber(11, 1, 10)).toBe(false);
    });

    it('rejects NaN and non-numbers', () => {
        expect(isValidNumber(NaN, 0, 100)).toBe(false);
        expect(isValidNumber('5', 0, 100)).toBe(false);
        expect(isValidNumber(null, 0, 100)).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// isOneOf
// ---------------------------------------------------------------------------

describe('isOneOf', () => {
    const options = ['low', 'medium', 'high'] as const;

    it('returns true for valid options', () => {
        expect(isOneOf('low', options)).toBe(true);
        expect(isOneOf('high', options)).toBe(true);
    });

    it('returns false for invalid values', () => {
        expect(isOneOf('INVALID', options)).toBe(false);
        expect(isOneOf('', options)).toBe(false);
        expect(isOneOf(null, options)).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// validateHabit
// ---------------------------------------------------------------------------

const validHabitBase = {
    id: 'habit-1',
    name: 'Morning Meditation',
    duration: 20,
    frequency: 'daily',
    priority: 3,
    flexibility: 'flexible',
    energyLevel: 'low',
    category: 'health',
    isActive: true,
    createdAt: '2024-01-15T07:00:00Z',
    updatedAt: '2024-01-15T07:00:00Z',
};

describe('validateHabit', () => {
    it('accepts a fully valid habit', () => {
        const result = validateHabit(validHabitBase);
        expect(result).not.toBeNull();
        expect(result?.id).toBe('habit-1');
        expect(result?.name).toBe('Morning Meditation');
    });

    it('escapes XSS in the name field', () => {
        const result = validateHabit({ ...validHabitBase, name: '<b>hack</b>' });
        expect(result?.name).toBe('&lt;b&gt;hack&lt;/b&gt;');
    });

    it('returns null for missing id', () => {
        expect(validateHabit({ ...validHabitBase, id: undefined })).toBeNull();
    });

    it('returns null for invalid id characters', () => {
        expect(validateHabit({ ...validHabitBase, id: 'id with spaces' })).toBeNull();
    });

    it('returns null for empty name', () => {
        expect(validateHabit({ ...validHabitBase, name: '' })).toBeNull();
    });

    it('returns null for duration out of range', () => {
        expect(validateHabit({ ...validHabitBase, duration: 0 })).toBeNull();
        expect(validateHabit({ ...validHabitBase, duration: 481 })).toBeNull();
    });

    it('returns null for invalid frequency', () => {
        expect(validateHabit({ ...validHabitBase, frequency: 'sometimes' })).toBeNull();
    });

    it('returns null for invalid priority', () => {
        expect(validateHabit({ ...validHabitBase, priority: 6 })).toBeNull();
        expect(validateHabit({ ...validHabitBase, priority: 0 })).toBeNull();
    });

    it('returns null for invalid energyLevel', () => {
        expect(validateHabit({ ...validHabitBase, energyLevel: 'extreme' })).toBeNull();
    });

    it('returns null for invalid category', () => {
        expect(validateHabit({ ...validHabitBase, category: 'gaming' })).toBeNull();
    });

    it('returns null for non-boolean isActive', () => {
        expect(validateHabit({ ...validHabitBase, isActive: 'yes' })).toBeNull();
    });

    it('returns null for invalid ISO timestamps', () => {
        expect(validateHabit({ ...validHabitBase, createdAt: '2024-01-15' })).toBeNull();
    });

    it('returns null for non-object input', () => {
        expect(validateHabit(null)).toBeNull();
        expect(validateHabit('string')).toBeNull();
        expect(validateHabit(42)).toBeNull();
    });

    it('accepts valid optional fields', () => {
        const result = validateHabit({
            ...validHabitBase,
            preferredTimeWindow: 'morning',
            timesPerWeek: 3,
            specificDays: [1, 3, 5],
            minimumViableDuration: 10,
            cooldownDays: 1,
        });
        expect(result?.preferredTimeWindow).toBe('morning');
        expect(result?.timesPerWeek).toBe(3);
        expect(result?.specificDays).toEqual([1, 3, 5]);
    });

    it('filters out-of-range days from specificDays', () => {
        const result = validateHabit({
            ...validHabitBase,
            specificDays: [0, 6, 7, -1],  // 7 and -1 are invalid
        });
        expect(result?.specificDays).toEqual([0, 6]);
    });
});

// ---------------------------------------------------------------------------
// validateTask
// ---------------------------------------------------------------------------

const validTaskBase = {
    id: 'task-1',
    title: 'Write report',
    estimatedDuration: 60,
    priority: 2,
    category: 'work',
    energyLevel: 'high',
    isSplittable: false,
    isCompleted: false,
    isActive: true,
    createdAt: '2024-01-15T07:00:00Z',
    updatedAt: '2024-01-15T07:00:00Z',
};

describe('validateTask', () => {
    it('accepts a fully valid task', () => {
        const result = validateTask(validTaskBase);
        expect(result).not.toBeNull();
        expect(result?.title).toBe('Write report');
    });

    it('escapes XSS in title', () => {
        const result = validateTask({ ...validTaskBase, title: '<img src=x onerror=alert(1)>' });
        expect(result?.title).not.toContain('<img');
        expect(result?.title).toContain('&lt;img');
    });

    it('returns null for missing title', () => {
        expect(validateTask({ ...validTaskBase, title: '' })).toBeNull();
    });

    it('returns null for invalid category', () => {
        expect(validateTask({ ...validTaskBase, category: 'fun' })).toBeNull();
    });

    it('returns null for non-object input', () => {
        expect(validateTask(null)).toBeNull();
        expect(validateTask([])).toBeNull();
    });
});

// ---------------------------------------------------------------------------
// validateImportData (top-level)
// ---------------------------------------------------------------------------

describe('validateImportData', () => {
    it('rejects invalid JSON', () => {
        const result = validateImportData('{not json}');
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Invalid JSON format');
    });

    it('rejects non-object JSON (array at root)', () => {
        const result = validateImportData('[1, 2, 3]');
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
    });

    it('accepts empty object with no habits or tasks', () => {
        const result = validateImportData('{}');
        expect(result.isValid).toBe(true);
        expect(result.sanitizedData.habits).toHaveLength(0);
        expect(result.sanitizedData.tasks).toHaveLength(0);
    });

    it('imports valid habits and rejects invalid ones', () => {
        const data = JSON.stringify({
            habits: [
                validHabitBase,
                { ...validHabitBase, id: 'habit-2', name: '', duration: 20 }, // invalid: no name
            ],
        });
        const result = validateImportData(data);
        expect(result.stats.habitsImported).toBe(1);
        expect(result.stats.habitsRejected).toBe(1);
    });

    it('imports valid tasks and rejects invalid ones', () => {
        const data = JSON.stringify({
            tasks: [
                validTaskBase,
                { ...validTaskBase, id: 'task-2', category: 'invalid' }, // invalid category
            ],
        });
        const result = validateImportData(data);
        expect(result.stats.tasksImported).toBe(1);
        expect(result.stats.tasksRejected).toBe(1);
    });

    it('sanitizes XSS payloads in imported names', () => {
        const data = JSON.stringify({
            habits: [{ ...validHabitBase, name: '<script>alert()</script>' }],
        });
        const result = validateImportData(data);
        expect(result.sanitizedData.habits[0]?.name).not.toContain('<script>');
    });

    it('enforces max array length and reports error', () => {
        const manyHabits = Array.from({ length: 1001 }, (_, i) => ({
            ...validHabitBase,
            id: `habit-${i}`,
        }));
        const data = JSON.stringify({ habits: manyHabits });
        const result = validateImportData(data);
        expect(result.errors.some(e => e.includes('Too many habits'))).toBe(true);
        // Still processes up to the limit
        expect(result.sanitizedData.habits.length).toBeLessThanOrEqual(1000);
    });
});
