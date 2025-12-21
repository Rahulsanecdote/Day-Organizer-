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
        expect(startHour).toBeLessThan(9); // Before work starts at 9:30
      }

      // Reading should be in evening
      if (readingBlock) {
        const startHour = parseInt(readingBlock.start.split(':')[0]);
        expect(startHour).toBeGreaterThanOrEqual(18); // Evening
      }
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
});