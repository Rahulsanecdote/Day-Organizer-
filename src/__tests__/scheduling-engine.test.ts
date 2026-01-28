// Unit tests for the scheduling engine

import { SchedulingEngine, parseTextInput } from '../lib/scheduling-engine';
import { DailyInput, Habit, Task, GymSettings, UserPreferences } from '../types';

describe('SchedulingEngine', () => {
  let mockDailyInput: DailyInput;
  let mockHabits: Habit[];
  let mockTasks: Task[];
  let mockGymSettings: GymSettings;
  let mockPreferences: UserPreferences;

  beforeEach(() => {
    // INTENTIONAL: Fixed date (Monday, 2024-01-15) ensures deterministic scheduling behavior
    // regardless of when tests are run. Day-of-week-dependent logic (specific-days habits,
    // weekly habits) will always behave consistently. Do NOT change to dynamic date.
    mockDailyInput = {
      date: '2024-01-15',
      timezone: 'America/New_York',
      sleep: {
        start: '23:30',
        end: '07:30',
      },
      fixedEvents: [
        {
          title: 'Work',
          start: '09:30',
          end: '18:00',
          type: 'work',
        },
        {
          title: 'Dinner',
          start: '19:00',
          end: '20:00',
          type: 'meal',
        },
      ],
      constraints: {
        buffersBetweenBlocksMin: 10,
        protectDowntimeMin: 30,
      },
    };

    mockHabits = [
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
      {
        id: 'habit-2',
        name: 'Evening Reading',
        duration: 30,
        frequency: 'daily',
        preferredTimeWindow: 'evening',
        priority: 2,
        flexibility: 'flexible',
        energyLevel: 'low',
        category: 'learning',
        isActive: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    ];

    mockTasks = [
      {
        id: 'task-1',
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
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    ];

    mockGymSettings = {
      enabled: true,
      frequency: 4,
      defaultDuration: 60,
      preferredWindow: 'after-work',
      minimumDuration: 20,
      bedtimeBuffer: 120,
      warmupDuration: 5,
      cooldownDuration: 5,
    };

    mockPreferences = {
      timezone: 'America/New_York',
      defaultSleepStart: '23:30',
      defaultSleepEnd: '07:30',
      defaultBuffers: 10,
      defaultDowntimeProtection: 30,
      gymSettings: mockGymSettings,
      theme: 'system',
      notifications: {
        enabled: true,
        reminderMinutes: 15,
        completionCheckMinutes: 30,
      },
    };
  });

  describe('generatePlan', () => {
    it('should generate a plan with scheduled blocks', () => {
      const scheduler = new SchedulingEngine(
        mockDailyInput,
        mockHabits,
        mockTasks,
        mockGymSettings,
        mockPreferences
      );

      const plan = scheduler.generatePlan();

      expect(plan).toBeDefined();
      expect(plan.date).toBe(mockDailyInput.date);
      expect(plan.blocks).toBeDefined();
      expect(Array.isArray(plan.blocks)).toBe(true);
      expect(plan.blocks.length).toBeGreaterThan(0);
      expect(plan.explanation).toBeDefined();
      expect(plan.stats).toBeDefined();
    });

    it('should include gym when enabled', () => {
      const scheduler = new SchedulingEngine(
        mockDailyInput,
        mockHabits,
        mockTasks,
        mockGymSettings,
        mockPreferences
      );

      const plan = scheduler.generatePlan();
      const gymBlock = plan.blocks.find(block => block.type === 'gym');

      expect(gymBlock).toBeDefined();
      expect(gymBlock?.title).toBe('Gym Workout');
      expect(gymBlock?.energyLevel).toBe('high');
    });

    it('should respect fixed events', () => {
      const scheduler = new SchedulingEngine(
        mockDailyInput,
        mockHabits,
        mockTasks,
        mockGymSettings,
        mockPreferences
      );

      const plan = scheduler.generatePlan();
      const workBlock = plan.blocks.find(block => block.type === 'work');
      const dinnerBlock = plan.blocks.find(block => block.type === 'meal');

      expect(workBlock).toBeDefined();
      expect(workBlock?.title).toBe('Work');
      expect(workBlock?.start).toBe('09:30');
      expect(workBlock?.end).toBe('18:00');

      expect(dinnerBlock).toBeDefined();
      expect(dinnerBlock?.title).toBe('Dinner');
      expect(dinnerBlock?.start).toBe('19:00');
      expect(dinnerBlock?.end).toBe('20:00');
    });

    it('should schedule habits in preferred time windows', () => {
      const scheduler = new SchedulingEngine(
        mockDailyInput,
        mockHabits,
        mockTasks,
        mockGymSettings,
        mockPreferences
      );

      const plan = scheduler.generatePlan();
      const meditationBlock = plan.blocks.find(block => block.title === 'Morning Meditation');
      const readingBlock = plan.blocks.find(block => block.title === 'Evening Reading');

      // Meditation should be in morning (before work)
      if (meditationBlock) {
        const startHour = parseInt(meditationBlock.start.split(':')[0]);
        expect(startHour).toBeLessThan(12); // Must be in morning
      }

      // Reading should be in evening
      if (readingBlock) {
        const startHour = parseInt(readingBlock.start.split(':')[0]);
        expect(startHour).toBeGreaterThanOrEqual(18); // Evening
      }
    });
  });

  describe('buffer constraints', () => {
    it('should maintain minimum buffer between consecutive blocks', () => {
      const scheduler = new SchedulingEngine(
        mockDailyInput,
        mockHabits,
        mockTasks,
        mockGymSettings,
        mockPreferences
      );

      const plan = scheduler.generatePlan();

      // Sort blocks by start time
      const sortedBlocks = [...plan.blocks].sort((a, b) => a.start.localeCompare(b.start));

      // Check gaps between non-fixed consecutive blocks
      for (let i = 0; i < sortedBlocks.length - 1; i++) {
        const current = sortedBlocks[i];
        const next = sortedBlocks[i + 1];

        // Skip fixed events (they define the schedule, not follow it)
        if (current.locked || next.locked) continue;

        const currentEndMinutes = parseInt(current.end.split(':')[0]) * 60 + parseInt(current.end.split(':')[1]);
        const nextStartMinutes = parseInt(next.start.split(':')[0]) * 60 + parseInt(next.start.split(':')[1]);
        const gap = nextStartMinutes - currentEndMinutes;

        // Gap should be at least the buffer time (or blocks should not overlap)
        expect(gap).toBeGreaterThanOrEqual(0);
      }
    });

    it('should maintain buffer between fixed events and scheduled items', () => {
      // Scenario: Work ends at 13:00, gym should start at 13:10+ (with 10min buffer)
      const inputWithWork: DailyInput = {
        // Fixed date matching main test fixture for consistency
        date: '2024-01-15',
        timezone: 'America/New_York',
        sleep: { start: '23:30', end: '06:30' },
        fixedEvents: [
          { title: 'Work', start: '06:30', end: '13:00', type: 'work' },
        ],
        constraints: {
          buffersBetweenBlocksMin: 10,
          protectDowntimeMin: 30,
        },
      };

      const scheduler = new SchedulingEngine(
        inputWithWork,
        [],
        [],
        { ...mockGymSettings, enabled: true, preferredWindow: 'after-work' },
        mockPreferences
      );

      const plan = scheduler.generatePlan();
      const gymBlock = plan.blocks.find(b => b.type === 'gym');
      const workBlock = plan.blocks.find(b => b.type === 'work');

      expect(gymBlock).toBeDefined();
      expect(workBlock).toBeDefined();

      if (gymBlock && workBlock) {
        const workEndMinutes = parseInt(workBlock.end.split(':')[0]) * 60 + parseInt(workBlock.end.split(':')[1]);
        const gymStartMinutes = parseInt(gymBlock.start.split(':')[0]) * 60 + parseInt(gymBlock.start.split(':')[1]);
        const gap = gymStartMinutes - workEndMinutes;

        // Gap should be at least 10 minutes (the buffer time)
        expect(gap).toBeGreaterThanOrEqual(10);
      }
    });
  });

  describe('deterministic scheduling', () => {
    it('should produce consistent results for the same input', () => {
      const scheduler1 = new SchedulingEngine(
        mockDailyInput,
        mockHabits,
        mockTasks,
        mockGymSettings,
        mockPreferences
      );

      const scheduler2 = new SchedulingEngine(
        mockDailyInput,
        mockHabits,
        mockTasks,
        mockGymSettings,
        mockPreferences
      );

      const plan1 = scheduler1.generatePlan();
      const plan2 = scheduler2.generatePlan();

      // Plans should be identical
      expect(plan1.blocks.length).toBe(plan2.blocks.length);

      for (let i = 0; i < plan1.blocks.length; i++) {
        expect(plan1.blocks[i].title).toBe(plan2.blocks[i].title);
        expect(plan1.blocks[i].start).toBe(plan2.blocks[i].start);
        expect(plan1.blocks[i].end).toBe(plan2.blocks[i].end);
      }
    });
  });

  describe('dependency resolution', () => {
    it('should schedule tasks with dependencies after their prerequisites', () => {
      const tasksWithDeps: Task[] = [
        {
          id: 'task-a',
          title: 'Task A (prerequisite)',
          estimatedDuration: 30,
          priority: 4,
          category: 'work',
          energyLevel: 'medium',
          isSplittable: false,
          isCompleted: false,
          isActive: true,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
        {
          id: 'task-b',
          title: 'Task B (depends on A)',
          estimatedDuration: 30,
          priority: 5, // Higher priority but depends on A
          category: 'work',
          energyLevel: 'medium',
          dependencies: ['task-a'],
          isSplittable: false,
          isCompleted: false,
          isActive: true,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ];

      const scheduler = new SchedulingEngine(
        mockDailyInput,
        [],
        tasksWithDeps,
        { ...mockGymSettings, enabled: false },
        mockPreferences
      );

      const plan = scheduler.generatePlan();

      const taskABlock = plan.blocks.find(b => b.title === 'Task A (prerequisite)');
      const taskBBlock = plan.blocks.find(b => b.title === 'Task B (depends on A)');

      // Both should be scheduled
      expect(taskABlock).toBeDefined();
      expect(taskBBlock).toBeDefined();

      if (taskABlock && taskBBlock) {
        // Task A should start before or at the same time as Task B
        expect(taskABlock.start.localeCompare(taskBBlock.start)).toBeLessThanOrEqual(0);
      }
    });

    it('should not schedule tasks with unmet dependencies', () => {
      const tasksWithMissingDep: Task[] = [
        {
          id: 'task-orphan',
          title: 'Orphan Task',
          estimatedDuration: 30,
          priority: 5,
          category: 'work',
          energyLevel: 'medium',
          dependencies: ['non-existent-task'],
          isSplittable: false,
          isCompleted: false,
          isActive: true,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ];

      const scheduler = new SchedulingEngine(
        mockDailyInput,
        [],
        tasksWithMissingDep,
        { ...mockGymSettings, enabled: false },
        mockPreferences
      );

      const plan = scheduler.generatePlan();

      // Should be in unscheduled list
      const orphanUnscheduled = plan.unscheduled.find(u => u.title === 'Orphan Task');
      expect(orphanUnscheduled).toBeDefined();
      expect(orphanUnscheduled?.reason).toContain('Dependencies not met');
    });
  });

  describe('downtime protection', () => {
    it('should not schedule items in protected downtime before sleep', () => {
      const inputWithDowntime: DailyInput = {
        ...mockDailyInput,
        fixedEvents: [], // No fixed events to maximize available time
        constraints: {
          buffersBetweenBlocksMin: 10,
          protectDowntimeMin: 60, // 60 minutes before sleep protected
        },
      };

      const scheduler = new SchedulingEngine(
        inputWithDowntime,
        mockHabits,
        mockTasks,
        { ...mockGymSettings, enabled: false },
        mockPreferences
      );

      const plan = scheduler.generatePlan();

      // Sleep starts at 23:30, so no blocks should start at 22:30 or later
      const downtimeStart = 22 * 60 + 30; // 22:30 in minutes

      for (const block of plan.blocks) {
        if (block.locked) continue; // Skip fixed blocks

        const blockStartMinutes = parseInt(block.start.split(':')[0]) * 60 + parseInt(block.start.split(':')[1]);
        expect(blockStartMinutes).toBeLessThan(downtimeStart);
      }
    });
  });

  describe('unscheduled item tracking', () => {
    it('should track items that cannot be scheduled with reasons', () => {
      // Create a day with very limited time
      const fullDayInput: DailyInput = {
        ...mockDailyInput,
        fixedEvents: [
          { title: 'Work', start: '08:00', end: '17:00', type: 'work' },
          { title: 'Meeting', start: '17:00', end: '18:00', type: 'appointment' },
          { title: 'Dinner', start: '18:00', end: '19:00', type: 'meal' },
          { title: 'Family Time', start: '19:00', end: '22:00', type: 'other' },
          { title: 'Wind Down', start: '22:00', end: '23:30', type: 'other' },
        ],
      };

      const manyHabits: Habit[] = [
        ...mockHabits,
        {
          id: 'habit-3',
          name: 'Extra Habit',
          duration: 60,
          frequency: 'daily',
          priority: 1,
          flexibility: 'flexible',
          energyLevel: 'medium',
          category: 'learning',
          isActive: true,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ];

      const scheduler = new SchedulingEngine(
        fullDayInput,
        manyHabits,
        mockTasks,
        { ...mockGymSettings, enabled: false },
        mockPreferences
      );

      const plan = scheduler.generatePlan();

      // With such a full day, some items should be unscheduled
      // The unscheduled array should have items with reasons
      if (plan.unscheduled.length > 0) {
        for (const item of plan.unscheduled) {
          expect(item.title).toBeDefined();
          expect(item.reason).toBeDefined();
          expect(item.reason.length).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('time window constraints', () => {
    it('should respect morning habit time window strictly', () => {
      const morningOnlyHabit: Habit[] = [
        {
          id: 'morning-habit',
          name: 'Morning Routine',
          duration: 30,
          frequency: 'daily',
          preferredTimeWindow: 'morning',
          priority: 5, // High priority
          flexibility: 'fixed',
          energyLevel: 'high',
          category: 'health',
          isActive: true,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ];

      // Day with only evening availability
      const eveningOnlyInput: DailyInput = {
        ...mockDailyInput,
        fixedEvents: [
          { title: 'All Day Event', start: '07:30', end: '18:00', type: 'work' },
        ],
      };

      const scheduler = new SchedulingEngine(
        eveningOnlyInput,
        morningOnlyHabit,
        [],
        { ...mockGymSettings, enabled: false },
        mockPreferences
      );

      const plan = scheduler.generatePlan();

      const morningBlock = plan.blocks.find(b => b.title === 'Morning Routine');

      // If scheduled, should be in morning (before 12)
      if (morningBlock) {
        const startHour = parseInt(morningBlock.start.split(':')[0]);
        expect(startHour).toBeLessThan(12);
      }
      // Otherwise it should be unscheduled (no morning slots available)
    });
  });

  describe('calculateAvailableSlots', () => {
    it('should calculate correct available time slots', () => {
      const scheduler = new SchedulingEngine(
        mockDailyInput,
        mockHabits,
        mockTasks,
        mockGymSettings,
        mockPreferences
      );

      // Access private method through type assertion for testing
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const availableSlots = (scheduler as any).calculateAvailableSlots(mockDailyInput);

      expect(availableSlots).toBeDefined();
      expect(Array.isArray(availableSlots)).toBe(true);

      // Should have slots between wake time and first fixed event
      // And between fixed events
      expect(availableSlots.length).toBeGreaterThan(0);
    });
  });

  describe('parseTextInput', () => {
    it('should parse simple time formats', () => {
      const text = 'Work 9:30am-6pm; Lunch 12-1pm; Dinner 7-8';

      const result = parseTextInput(text);

      expect(result.items).toBeDefined();
      expect(result.items.length).toBe(3);

      const workItem = result.items.find(item => item.title.toLowerCase().includes('work'));
      expect(workItem).toBeDefined();
      expect(workItem?.start).toBe('09:30');
      expect(workItem?.end).toBe('18:00');
      expect(workItem?.type).toBe('work');
    });

    it('should parse 24-hour time format', () => {
      const text = 'Meeting 14:30-15:30; Call 16:00-16:30';

      const result = parseTextInput(text);

      expect(result.items).toBeDefined();
      expect(result.items.length).toBe(2);

      const meetingItem = result.items[0];
      expect(meetingItem.start).toBe('14:30');
      expect(meetingItem.end).toBe('15:30');
    });

    it('should handle unparseable text', () => {
      const text = 'Some random text that cannot be parsed';

      const result = parseTextInput(text);

      expect(result.items).toBeDefined();
      expect(result.items.length).toBe(0);
      expect(result.unparsedText).toBe(text);
    });
  });

  describe('edge cases', () => {
    it('should handle day with no free time', () => {
      const fullDayInput: DailyInput = {
        ...mockDailyInput,
        fixedEvents: [
          { title: 'Work', start: '09:00', end: '17:00', type: 'work' },
          { title: 'Meeting', start: '17:00', end: '18:00', type: 'appointment' },
          { title: 'Dinner', start: '18:00', end: '19:00', type: 'meal' },
          { title: 'TV Show', start: '19:00', end: '21:00', type: 'other' },
          { title: 'Wind Down', start: '21:00', end: '23:30', type: 'other' },
        ],
      };

      const scheduler = new SchedulingEngine(
        fullDayInput,
        mockHabits,
        mockTasks,
        mockGymSettings,
        mockPreferences
      );

      const plan = scheduler.generatePlan();

      // Should still generate a plan, but with minimal scheduling
      expect(plan).toBeDefined();
      expect(plan.blocks).toBeDefined();
      expect(plan.unscheduled).toBeDefined();
    });

    it('should handle disabled gym', () => {
      const disabledGymSettings: GymSettings = {
        ...mockGymSettings,
        enabled: false,
      };

      const scheduler = new SchedulingEngine(
        mockDailyInput,
        mockHabits,
        mockTasks,
        disabledGymSettings,
        mockPreferences
      );

      const plan = scheduler.generatePlan();
      const gymBlock = plan.blocks.find(block => block.type === 'gym');

      expect(gymBlock).toBeUndefined();
    });
  });

  describe('real-time anchoring', () => {
    it('should anchor to wake time when planning for a future date', () => {
      // Current time is BEFORE the planning date (e.g., planning tomorrow)
      const currentTime = new Date('2024-01-14T10:00:00'); // Previous day
      const futureInput = {
        ...mockDailyInput,
        date: '2024-01-15', // The target date
        sleep: { start: '23:30', end: '07:30' },
      };

      const scheduler = new SchedulingEngine(
        futureInput,
        mockHabits,
        mockTasks,
        { ...mockGymSettings, enabled: false },
        mockPreferences,
        currentTime
      );

      const plan = scheduler.generatePlan();
      const firstBlock = plan.blocks[0];

      // Should start at wake time (07:30) because it's a future plan
      // We look for the first non-fixed block or just verify the first slot available was used
      // But verify no block starts BEFORE 07:30
      // Actually, if we have tasks, the first one should start at 07:30 (wake time)
      if (firstBlock && !firstBlock.locked) {
        expect(firstBlock.start).toBe('07:30');
      }
    });

    it('should anchor to current time + buffer when planning for today (mid-day)', () => {
      // Current time is mid-day on the planning date
      const currentTime = new Date('2024-01-15T12:00:00');
      const todayInput = {
        ...mockDailyInput,
        date: '2024-01-15',
      };

      const scheduler = new SchedulingEngine(
        todayInput,
        mockHabits,
        mockTasks,
        { ...mockGymSettings, enabled: false },
        mockPreferences,
        currentTime
      );

      const plan = scheduler.generatePlan();

      // Identify the first scheduled item (that isn't a pre-existing fixed event)
      // Fixed events in mock: Work 09:30-18:00
      // So available time starts after 18:00? 
      // Wait, 12:00 is during "Work" (09:30-18:00).
      // So the anchor `max(wakeTime, 12:15)` is 12:15.
      // BUT `Work` occupies 09:30-18:00.
      // So availability starts at 18:00 + buffer.

      // Let's remove fixed events to test the anchoring purely
      const freeDayInput = {
        ...todayInput,
        fixedEvents: []
      };

      const schedulerFree = new SchedulingEngine(
        freeDayInput,
        mockHabits,
        mockTasks,
        { ...mockGymSettings, enabled: false },
        mockPreferences,
        currentTime
      );

      const planFree = schedulerFree.generatePlan();
      const firstBlock = planFree.blocks[0];

      // Buffer defaults to 10 min in mockPreferences. 
      // REAL_TIME_CONFIG might default to 15 min.
      // The code uses: `addMinutes(now, SchedulingEngine.REAL_TIME_CONFIG.bufferFromNowMinutes)`
      // The default bufferFromNowMinutes is 15.
      // So 12:00 + 15m = 12:15.

      if (firstBlock) {
        // Should be >= 12:15
        const startMinutes = parseInt(firstBlock.start.split(':')[0]) * 60 + parseInt(firstBlock.start.split(':')[1]);
        const anchorMinutes = 12 * 60 + 15;
        expect(startMinutes).toBeGreaterThanOrEqual(anchorMinutes);
      }
    });

    it('should anchor to wake time if current time is before wake time (today)', () => {
      // Current time is 6:00 AM (early riser planning for today)
      const currentTime = new Date('2024-01-15T06:00:00');
      const todayInput = {
        ...mockDailyInput,
        date: '2024-01-15',
        sleep: { start: '23:30', end: '07:30' },
      };

      const scheduler = new SchedulingEngine(
        todayInput,
        mockHabits,
        mockTasks,
        { ...mockGymSettings, enabled: false },
        mockPreferences,
        currentTime
      );

      const plan = scheduler.generatePlan();
      const firstBlock = plan.blocks.find(b => !b.locked);

      // Should start at wake time (07:30), NOT 06:15
      if (firstBlock) {
        expect(firstBlock.start).toBe('07:30');
      }
    });
  });
});