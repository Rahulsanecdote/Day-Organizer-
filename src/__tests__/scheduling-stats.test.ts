/**
 * Scheduling Engine — Stats Shape Tests
 *
 * Verifies the discriminated union introduced in Issue #1:
 * - Regular plans always return RegularPlanStats
 * - Late-night plans always return LateNightPlanStats
 * - Both shapes are complete and correctly typed at runtime
 */

import { SchedulingEngine } from '../lib/scheduling-engine';
import { isRegularPlan, isLateNightPlan } from '../types/scheduling';
import type { DailyInput, Habit, Task, GymSettings, UserPreferences } from '../types';

// ---------------------------------------------------------------------------
// Shared fixtures (same fixed date as the main scheduling test to stay deterministic)
// ---------------------------------------------------------------------------

const BASE_DATE = '2024-01-15';

const dailyInput: DailyInput = {
    date: BASE_DATE,
    timezone: 'America/New_York',
    sleep: { start: '23:30', end: '07:30' },
    fixedEvents: [
        { title: 'Work', start: '09:30', end: '18:00', type: 'work' },
        { title: 'Dinner', start: '19:00', end: '20:00', type: 'meal' },
    ],
    constraints: { buffersBetweenBlocksMin: 10, protectDowntimeMin: 30 },
};

const habits: Habit[] = [
    {
        id: 'habit-1',
        name: 'Morning Meditation',
        duration: 15,
        frequency: 'daily',
        preferredTimeWindow: 'morning',
        priority: 3,
        flexibility: 'flexible',
        energyLevel: 'low',
        category: 'health',
        isActive: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
    },
];

const tasks: Task[] = [
    {
        id: 'task-1',
        title: 'Review emails',
        estimatedDuration: 30,
        priority: 3,
        category: 'work',
        energyLevel: 'medium',
        isSplittable: false,
        isCompleted: false,
        isActive: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
    },
];

const gymSettings: GymSettings = {
    enabled: false,   // disabled so we isolate stats from gym blocks
    frequency: 3,
    defaultDuration: 60,
    preferredWindow: 'after-work',
    minimumDuration: 20,
    bedtimeBuffer: 120,
    warmupDuration: 5,
    cooldownDuration: 5,
};

const preferences: UserPreferences = {
    timezone: 'America/New_York',
    defaultSleepStart: '23:30',
    defaultSleepEnd: '07:30',
    defaultBuffers: 10,
    defaultDowntimeProtection: 30,
    gymSettings,
    theme: 'system',
    notifications: { enabled: true, reminderMinutes: 15, completionCheckMinutes: 30 },
};

// Helper: daytime currentTime on BASE_DATE (8 AM — well before 9 PM late-night cutoff)
const daytimeOnDate = new Date(`${BASE_DATE}T08:00:00`);

// Helper: late-night currentTime on BASE_DATE (10 PM — past the 9 PM cutoff)
const lateNightOnDate = new Date(`${BASE_DATE}T22:00:00`);

// Helper: a different date so isToday=false (never triggers late-night mode)
const futureDateCurrentTime = new Date('2024-01-16T08:00:00');

// ---------------------------------------------------------------------------
// Regular plan stats
// ---------------------------------------------------------------------------

describe('SchedulingEngine — RegularPlanStats shape', () => {
    it('regular plan returns planType: regular', () => {
        const engine = new SchedulingEngine(dailyInput, habits, tasks, gymSettings, preferences, daytimeOnDate);
        const plan = engine.generatePlan();
        expect(plan.stats.planType).toBe('regular');
    });

    it('isRegularPlan type guard returns true for a regular plan', () => {
        const engine = new SchedulingEngine(dailyInput, habits, tasks, gymSettings, preferences, daytimeOnDate);
        const plan = engine.generatePlan();
        expect(isRegularPlan(plan.stats)).toBe(true);
    });

    it('RegularPlanStats contains all required numeric fields', () => {
        const engine = new SchedulingEngine(dailyInput, habits, tasks, gymSettings, preferences, daytimeOnDate);
        const plan = engine.generatePlan();
        if (isRegularPlan(plan.stats)) {
            expect(typeof plan.stats.workHours).toBe('number');
            expect(typeof plan.stats.gymMinutes).toBe('number');
            expect(typeof plan.stats.habitsCompleted).toBe('number');
            expect(typeof plan.stats.tasksCompleted).toBe('number');
            expect(typeof plan.stats.focusBlocks).toBe('number');
            expect(typeof plan.stats.freeTimeRemaining).toBe('number');
        }
    });

    it('workHours is non-negative', () => {
        const engine = new SchedulingEngine(dailyInput, habits, tasks, gymSettings, preferences, daytimeOnDate);
        const plan = engine.generatePlan();
        if (isRegularPlan(plan.stats)) {
            expect(plan.stats.workHours).toBeGreaterThanOrEqual(0);
        }
    });

    it('habitsCompleted matches the number of habit blocks in the plan', () => {
        const engine = new SchedulingEngine(dailyInput, habits, tasks, gymSettings, preferences, daytimeOnDate);
        const plan = engine.generatePlan();
        const habitBlocks = plan.blocks.filter(b => b.type === 'habit');
        if (isRegularPlan(plan.stats)) {
            expect(plan.stats.habitsCompleted).toBe(habitBlocks.length);
        }
    });

    it('plan does not trigger late-night mode when currentTime is daytime', () => {
        const engine = new SchedulingEngine(dailyInput, habits, tasks, gymSettings, preferences, daytimeOnDate);
        const plan = engine.generatePlan();
        expect(plan.isLateNightMode).toBeFalsy();
    });

    it('generates a regular plan when currentTime is a different date (not today)', () => {
        const engine = new SchedulingEngine(dailyInput, habits, tasks, gymSettings, preferences, futureDateCurrentTime);
        const plan = engine.generatePlan();
        expect(isRegularPlan(plan.stats)).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// Late-night plan stats
// ---------------------------------------------------------------------------

describe('SchedulingEngine — LateNightPlanStats shape', () => {
    it('late-night plan returns planType: late-night', () => {
        const engine = new SchedulingEngine(dailyInput, habits, tasks, gymSettings, preferences, lateNightOnDate);
        const plan = engine.generatePlan();
        expect(plan.stats.planType).toBe('late-night');
    });

    it('isLateNightPlan type guard returns true for a late-night plan', () => {
        const engine = new SchedulingEngine(dailyInput, habits, tasks, gymSettings, preferences, lateNightOnDate);
        const plan = engine.generatePlan();
        expect(isLateNightPlan(plan.stats)).toBe(true);
    });

    it('LateNightPlanStats contains all required numeric fields', () => {
        const engine = new SchedulingEngine(dailyInput, habits, tasks, gymSettings, preferences, lateNightOnDate);
        const plan = engine.generatePlan();
        if (isLateNightPlan(plan.stats)) {
            expect(typeof plan.stats.totalFocusTimeMinutes).toBe('number');
            expect(typeof plan.stats.totalFreeTimeMinutes).toBe('number');
            expect(typeof plan.stats.completionRate).toBe('number');
        }
    });

    it('late-night plan sets isLateNightMode flag on PlanOutput', () => {
        const engine = new SchedulingEngine(dailyInput, habits, tasks, gymSettings, preferences, lateNightOnDate);
        const plan = engine.generatePlan();
        expect(plan.isLateNightMode).toBe(true);
    });

    it('isRegularPlan returns false for a late-night plan', () => {
        const engine = new SchedulingEngine(dailyInput, habits, tasks, gymSettings, preferences, lateNightOnDate);
        const plan = engine.generatePlan();
        expect(isRegularPlan(plan.stats)).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe('SchedulingEngine — edge cases', () => {
    it('generates a valid plan with no habits', () => {
        const engine = new SchedulingEngine(dailyInput, [], tasks, gymSettings, preferences, daytimeOnDate);
        expect(() => engine.generatePlan()).not.toThrow();
        const plan = engine.generatePlan();
        expect(plan.stats).toBeDefined();
        expect(plan.stats.planType).toBe('regular');
    });

    it('generates a valid plan with no tasks', () => {
        const engine = new SchedulingEngine(dailyInput, habits, [], gymSettings, preferences, daytimeOnDate);
        expect(() => engine.generatePlan()).not.toThrow();
    });

    it('generates a valid plan with neither habits nor tasks', () => {
        const engine = new SchedulingEngine(dailyInput, [], [], gymSettings, preferences, daytimeOnDate);
        expect(() => engine.generatePlan()).not.toThrow();
        const plan = engine.generatePlan();
        expect(Array.isArray(plan.blocks)).toBe(true);
        expect(Array.isArray(plan.unscheduled)).toBe(true);
    });

    it('plan always has a date matching the input date', () => {
        const engine = new SchedulingEngine(dailyInput, habits, tasks, gymSettings, preferences, daytimeOnDate);
        const plan = engine.generatePlan();
        expect(plan.date).toBe(BASE_DATE);
    });

    it('plan always has a non-empty explanation string', () => {
        const engine = new SchedulingEngine(dailyInput, habits, tasks, gymSettings, preferences, daytimeOnDate);
        const plan = engine.generatePlan();
        expect(typeof plan.explanation).toBe('string');
        expect(plan.explanation.length).toBeGreaterThan(0);
    });

    it('all scheduled blocks have valid start/end times in HH:MM format', () => {
        const timePattern = /^\d{2}:\d{2}$/;
        const engine = new SchedulingEngine(dailyInput, habits, tasks, gymSettings, preferences, daytimeOnDate);
        const plan = engine.generatePlan();
        for (const block of plan.blocks) {
            expect(block.start).toMatch(timePattern);
            expect(block.end).toMatch(timePattern);
        }
    });
});
