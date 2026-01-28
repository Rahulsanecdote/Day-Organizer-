// Auto-scheduling engine - the core optimization algorithm

import {
  DailyInput,
  PlanOutput,
  ScheduledBlock,
  UnscheduledItem,
  Habit,
  Task,
  GymSettings,
  UserPreferences,
  TimeSlot
} from '@/types';
import { addMinutes, differenceInMinutes, parse, format, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';

export class SchedulingEngine {
  private context: {
    dailyInput: DailyInput;
    habits: Habit[];
    tasks: Task[];
    gymSettings: GymSettings;
    userPreferences: UserPreferences;
    currentTime: Date;  // Real-time anchor for scheduling
  };

  // Track which items have been successfully scheduled
  private scheduledItemIds: Set<string> = new Set();

  // Track the last scheduled item's category for context continuity
  private lastScheduledCategory: string | null = null;

  // ============================================================================
  // SCHEDULING CONSTANTS - All configurable values extracted from magic numbers
  // ============================================================================

  // Energy profile by hour (0-23) - typical energy levels through the day
  private static readonly ENERGY_PROFILE: Record<number, 'high' | 'medium' | 'low'> = {
    6: 'medium', 7: 'high', 8: 'high', 9: 'high', 10: 'high', 11: 'medium',
    12: 'medium', 13: 'low', 14: 'low', 15: 'medium', 16: 'medium', 17: 'medium',
    18: 'medium', 19: 'low', 20: 'low', 21: 'low', 22: 'low', 23: 'low',
    0: 'low', 1: 'low', 2: 'low', 3: 'low', 4: 'low', 5: 'low'
  };

  // Scoring weights for multi-factor slot scoring
  private static readonly SCORING_WEIGHTS = {
    timeWindowMatch: 30,
    energyAlignment: 25,
    durationFit: 20,
    contextContinuity: 15,
    bufferComfort: 10,
    priorityBonus: 50,
    deadlineUrgency: 100,
  };

  // Gap thresholds for break insertion (minutes)
  private static readonly GAP_THRESHOLDS = {
    minBreakGap: 15,         // Minimum gap to insert a break
    mediumGap: 45,           // Gap size for personal time block
    largeGap: 90,            // Gap size to split into focus + break + personal
    focusBlockMaxDuration: 60,  // Maximum focus block duration
    focusBlockRatio: 0.6,    // Ratio of large gap to use for focus
    breakDuration: 15,       // Standard break duration
    minPersonalTime: 20,     // Minimum remaining time for personal block
  };

  // Gym slot scoring values
  private static readonly GYM_SLOT_SCORES = {
    perfectWindowBonus: 100,     // Slot in preferred window
    nearWindowBonus: 50,         // Slot near preferred window
    lateSlotPenalty: -50,        // Penalty for too late (near bedtime)
    durationBonusDivisor: 10,    // Duration bonus = duration / this value
    // Time ranges
    afterWorkStart: 17,
    afterWorkEnd: 20,
    afterWorkNearStart: 15,
    afterWorkNearEnd: 21,
    morningStart: 6,
    morningEnd: 10,
    morningNearStart: 5,
    morningNearEnd: 12,
  };

  // Time window hour ranges
  private static readonly TIME_WINDOWS = {
    morningStart: 5,
    morningEnd: 12,
    afternoonStart: 12,
    afternoonEnd: 18,
    eveningStart: 18,
    eveningEnd: 23,
    lateNightStart: 22,        // Hour when late-night penalty starts
  };

  // Deadline urgency bonuses (used in slot scoring)
  private static readonly DEADLINE_BONUSES = {
    overdueMultiplier: 1.5,    // Multiply urgency weight for overdue items
    dueTodayMultiplier: 1.0,   // Multiply urgency weight for due today
    dueSoonMultiplier: 0.5,    // Multiply urgency weight for due in 2 days
    dueSoonDays: 2,            // Days threshold for "due soon"
    // Slot scoring bonuses
    overdueSlotBonus: 50,
    dueTodaySlotBonus: 30,
    dueSoonSlotBonus: 15,
    dueSoonSlotDays: 3,
  };

  // Flexibility and time window queue bonuses
  private static readonly QUEUE_BONUSES = {
    morningWindowBonus: 30,
    explicitTimeBonus: 50,
    fixedFlexibilityBonus: 40,
    semiFlexBonus: 20,
  };

  // Duration fit ratios for slot scoring
  private static readonly FIT_RATIOS = {
    perfectFitMax: 1.3,        // Up to 30% extra space is "perfect"
    goodFitMax: 2.0,           // Up to 2x duration is "good"
    overlyLargeSlot: 3.0,      // Slots > 3x get penalty
    overlyLargePenalty: 5,     // Penalty for overly large slots
  };

  // Energy scoring values
  private static readonly ENERGY_SCORES = {
    highEnergyMorningPeak: 30,   // High energy items 8-12
    highEnergyDayScore: 15,      // High energy items 6-16
    highEnergyOtherPenalty: -10, // High energy items at night
    mediumEnergyPeak: 20,        // Medium energy items 10-17
    // Additional scoring
    partialMatchMultiplier: 0.5, // Score multiplier for partial energy match
    wrongWindowPenaltyMultiplier: 2, // Penalty multiplier for wrong time window
    lateNightTaskBonus: 5,       // Bonus for explicit night tasks at night
    lateNightPenalty: 30,        // Penalty for non-night tasks at night
    earlyBonusMaxHour: 15,       // Early bonus = max(0, this - slotHour)
  };

  // Explicit time tolerance
  private static readonly EXPLICIT_TIME_TOLERANCE_HOURS = 1;

  // Days per week (constant for readability)
  private static readonly DAYS_IN_WEEK = 7;

  // Real-time scheduling constants
  private static readonly REAL_TIME_CONFIG = {
    bufferFromNowMinutes: 15,       // Don't schedule anything within 15 min of now
    lateNightHour: 21,              // 9 PM - when to enter late-night mode
    windDownDurationMin: 30,        // Wind-down block duration
    eveningReviewDurationMin: 15,   // Evening review block duration
  };

  constructor(
    dailyInput: DailyInput,
    habits: Habit[],
    tasks: Task[],
    gymSettings: GymSettings,
    userPreferences: UserPreferences,
    currentTime?: Date  // Optional: defaults to now
  ) {
    this.context = {
      dailyInput,
      habits,
      tasks,
      gymSettings,
      userPreferences,
      currentTime: currentTime ?? new Date(),
    };
  }

  private getBaseDate(): Date {
    // Parse date ensuring it's treated as local midnight to match system timezone
    // Using current date as reference for timezone info
    return parse(this.context.dailyInput.date, 'yyyy-MM-dd', new Date());
  }

  public generatePlan(): PlanOutput {
    const { dailyInput, habits, tasks, gymSettings } = this.context;
    const now = this.context.currentTime;
    const isToday = format(now, 'yyyy-MM-dd') === dailyInput.date;
    const currentHour = now.getHours();

    // Check for Late Night Mode
    // If it's today and after the configured late night hour (e.g., 9 PM)
    if (isToday && currentHour >= SchedulingEngine.REAL_TIME_CONFIG.lateNightHour) {
      return this.generateLateNightPlan();
    }

    // Reset scheduled tracking for new plan generation
    this.scheduledItemIds.clear();

    // Step 1: Calculate all available time slots
    const availableSlots = this.calculateAvailableSlots(dailyInput);

    // Step 2: Reserve downtime protection before sleep
    this.reserveDowntime(availableSlots, dailyInput);

    // Step 3: Prepare scheduling queue with priorities and resolved dependencies
    const schedulingQueue = this.buildSchedulingQueue(habits, tasks);

    // Step 4: Schedule gym first (if enabled)
    const scheduledBlocks: ScheduledBlock[] = [];
    if (gymSettings.enabled) {
      const gymBlock = this.scheduleGym(availableSlots, gymSettings);
      if (gymBlock) {
        scheduledBlocks.push(gymBlock);
        // Remove gym time from available slots (with buffer)
        const bufferTime = dailyInput.constraints.buffersBetweenBlocksMin;
        const gymStart = parse(gymBlock.start, 'HH:mm', this.getBaseDate());
        const gymEnd = addMinutes(parse(gymBlock.end, 'HH:mm', this.getBaseDate()), bufferTime);
        this.removeTimeSlot(availableSlots, gymStart, gymEnd);
      }
    }

    // Step 5: Schedule habits and tasks
    const unscheduledReasons: Map<string, string> = new Map();
    const scheduledEndTimes: Map<string, Date> = new Map(); // Track when each item ends

    for (const item of schedulingQueue) {
      // Check dependencies for tasks
      let minStartTime: Date | undefined;
      if ('dependencies' in item && item.dependencies && item.dependencies.length > 0) {
        const unmetDeps = item.dependencies.filter(depId => !this.scheduledItemIds.has(depId));
        if (unmetDeps.length > 0) {
          unscheduledReasons.set(item.id, `Dependencies not met: ${unmetDeps.join(', ')}`);
          continue;
        }
        // Calculate minimum start time after all dependencies
        for (const depId of item.dependencies) {
          const depEnd = scheduledEndTimes.get(depId);
          if (depEnd && (!minStartTime || depEnd > minStartTime)) {
            minStartTime = depEnd;
          }
        }
      }

      const scheduled = this.scheduleItem(item, availableSlots, minStartTime);
      if (scheduled) {
        scheduledBlocks.push(scheduled);
        this.scheduledItemIds.add(item.id);

        // Track when this item ends
        const scheduledEnd = parse(scheduled.end, 'HH:mm', this.getBaseDate());
        scheduledEndTimes.set(item.id, scheduledEnd);

        // Remove scheduled time from available slots (with buffer)
        const bufferTime = this.context.dailyInput.constraints.buffersBetweenBlocksMin;
        const scheduledStart = parse(scheduled.start, 'HH:mm', this.getBaseDate());
        const scheduledEndWithBuffer = addMinutes(scheduledEnd, bufferTime);
        this.removeTimeSlot(availableSlots, scheduledStart, scheduledEndWithBuffer);
      } else {
        // Item could not be scheduled - unused const removed
        unscheduledReasons.set(item.id, 'No available time slot with sufficient duration');
      }
    }

    // Step 6: Add fixed events and sleep
    scheduledBlocks.push(...this.createFixedBlocks(dailyInput));

    // Step 7: Sort blocks by start time
    scheduledBlocks.sort((a, b) => a.start.localeCompare(b.start));

    // Step 8: Fill gaps with breaks if gaps > 45 minutes
    this.fillGapsWithBreaks(scheduledBlocks, dailyInput);

    // Step 9: Generate stats and explanation
    const stats = this.calculateStats(scheduledBlocks, dailyInput);
    const unscheduled = this.getUnscheduledItems(schedulingQueue, unscheduledReasons);
    const explanation = this.generateExplanation(scheduledBlocks, unscheduled, dailyInput);

    return {
      date: dailyInput.date,
      blocks: scheduledBlocks,
      unscheduled,
      explanation,
      stats,
      nextDaySuggestions: this.generateNextDaySuggestions(unscheduled),
      generatedAt: new Date().toISOString(),
      timezone: dailyInput.timezone,
      isLateNightMode: false,
    };
  }

  // Special plan generation for late night (after 9 PM)
  private generateLateNightPlan(): PlanOutput {
    const { dailyInput } = this.context;
    const now = this.context.currentTime;
    const blocks: ScheduledBlock[] = [];

    // 1. Add Evening Review block
    const reviewStart = addMinutes(now, 5); // Start in 5 mins
    const reviewDuration = SchedulingEngine.REAL_TIME_CONFIG.eveningReviewDurationMin;
    const reviewEnd = addMinutes(reviewStart, reviewDuration);

    blocks.push({
      id: `evening-review-${Date.now()}`,
      title: 'Evening Review & Plan Tomorrow',
      start: format(reviewStart, 'HH:mm'),
      end: format(reviewEnd, 'HH:mm'),
      type: 'task',
      locked: true,
      completed: false,
      energyLevel: 'low',
      originalDuration: reviewDuration
    });

    // 2. Add Wind Down block
    const windDownStart = reviewEnd;
    const windDownDuration = SchedulingEngine.REAL_TIME_CONFIG.windDownDurationMin;
    const windDownEnd = addMinutes(windDownStart, windDownDuration);

    blocks.push({
      id: `wind-down-${Date.now()}`,
      title: 'Wind Down Routine',
      start: format(windDownStart, 'HH:mm'),
      end: format(windDownEnd, 'HH:mm'),
      type: 'habit', // styled as habit/ritual
      locked: true,
      completed: false,
      energyLevel: 'low',
      originalDuration: windDownDuration
    });

    // 3. Add Sleep block (from input or default)
    // Ensure sleep block is after wind down
    let sleepStart = parse(dailyInput.sleep.start, 'HH:mm', this.getBaseDate());
    if (isBefore(sleepStart, windDownEnd)) {
      sleepStart = windDownEnd;
    }

    // Add existing fixed events (like late gym or meetings)
    const fixedBlocks = this.createFixedBlocks(dailyInput);
    // Only keep fixed blocks that are in the future
    const futureFixedBlocks = fixedBlocks.filter(b => {
      const bStart = parse(b.start, 'HH:mm', this.getBaseDate());
      // Handle overnight events
      if (b.end < b.start) {
        // simplistic check, ideally we'd use full dates
        return true;
      }
      return isAfter(bStart, now);
    });

    blocks.push(...futureFixedBlocks);

    // Sort blocks
    blocks.sort((a, b) => a.start.localeCompare(b.start));

    return {
      date: dailyInput.date,
      blocks,
      unscheduled: [], // No tasks scheduled
      explanation: "It's late in the day. Focusing on winding down and preparing for tomorrow is the best use of your energy right now.",
      stats: {
        totalFocusTimeMinutes: 0,
        totalFreeTimeMinutes: 0,
        completionRate: 0,
        energyDistribution: { high: 0, medium: 0, low: 100 }
      },
      nextDaySuggestions: ["Review your task list for tomorrow", "Prepare your workspace"],
      generatedAt: new Date().toISOString(),
      timezone: dailyInput.timezone,
      isLateNightMode: true,
    };
  }

  // Fill gaps with appropriate blocks based on gap size
  private fillGapsWithBreaks(blocks: ScheduledBlock[], dailyInput: DailyInput): void {
    const blocksToAdd: ScheduledBlock[] = [];
    const bufferMin = dailyInput.constraints.buffersBetweenBlocksMin;

    for (let i = 0; i < blocks.length - 1; i++) {
      const current = blocks[i];
      const next = blocks[i + 1];

      // Skip gaps involving sleep
      if (current.type === 'sleep' || next.type === 'sleep') continue;

      const currentEnd = parse(current.end, 'HH:mm', this.getBaseDate());
      const nextStart = parse(next.start, 'HH:mm', this.getBaseDate());
      const gap = differenceInMinutes(nextStart, currentEnd);

      // Account for buffer - actual free time is gap minus buffer
      const freeTime = gap - bufferMin;
      const G = SchedulingEngine.GAP_THRESHOLDS;

      if (freeTime >= G.minBreakGap && freeTime < G.mediumGap) {
        // Short gap: add a break
        const blockStart = addMinutes(currentEnd, bufferMin);
        blocksToAdd.push({
          id: `break-${Date.now()}-${i}`,
          title: 'Break',
          start: format(blockStart, 'HH:mm'),
          end: format(addMinutes(blockStart, freeTime), 'HH:mm'),
          type: 'break',
          locked: false,
          completed: false,
          energyLevel: 'low',
        });
      } else if (freeTime >= G.mediumGap && freeTime < G.largeGap) {
        // Medium gap: personal time block
        const blockStart = addMinutes(currentEnd, bufferMin);
        blocksToAdd.push({
          id: `personal-${Date.now()}-${i}`,
          title: 'Personal Time',
          start: format(blockStart, 'HH:mm'),
          end: format(addMinutes(blockStart, freeTime), 'HH:mm'),
          type: 'other',
          locked: false,
          completed: false,
          energyLevel: 'low',
        });
      } else if (freeTime >= G.largeGap) {
        // Large gap: split into focus time + break + more time
        const blockStart = addMinutes(currentEnd, bufferMin);
        const focusDuration = Math.min(G.focusBlockMaxDuration, Math.floor(freeTime * G.focusBlockRatio));
        const breakDuration = G.breakDuration;
        const remainingTime = freeTime - focusDuration - breakDuration;

        // Add focus block
        blocksToAdd.push({
          id: `focus-${Date.now()}-${i}`,
          title: 'Focus Time',
          start: format(blockStart, 'HH:mm'),
          end: format(addMinutes(blockStart, focusDuration), 'HH:mm'),
          type: 'task',
          locked: false,
          completed: false,
          energyLevel: 'medium',
        });

        // Add break
        const breakStart = addMinutes(blockStart, focusDuration);
        blocksToAdd.push({
          id: `break-${Date.now()}-${i}-mid`,
          title: 'Break',
          start: format(breakStart, 'HH:mm'),
          end: format(addMinutes(breakStart, breakDuration), 'HH:mm'),
          type: 'break',
          locked: false,
          completed: false,
          energyLevel: 'low',
        });

        // Add remaining personal time if substantial
        if (remainingTime >= G.minPersonalTime) {
          const personalStart = addMinutes(breakStart, breakDuration);
          blocksToAdd.push({
            id: `personal-${Date.now()}-${i}-2`,
            title: 'Personal Time',
            start: format(personalStart, 'HH:mm'),
            end: format(addMinutes(personalStart, remainingTime), 'HH:mm'),
            type: 'other',
            locked: false,
            completed: false,
            energyLevel: 'low',
          });
        }
      }
    }

    // Add all new blocks and re-sort
    if (blocksToAdd.length > 0) {
      blocks.push(...blocksToAdd);
      blocks.sort((a, b) => a.start.localeCompare(b.start));
    }
  }

  private reserveDowntime(slots: TimeSlot[], dailyInput: DailyInput): void {
    const protectMinutes = dailyInput.constraints.protectDowntimeMin;
    if (protectMinutes <= 0) return;

    const sleepStart = parse(dailyInput.sleep.start, 'HH:mm', this.getBaseDate());
    const downtimeStart = addMinutes(sleepStart, -protectMinutes);

    // Remove the protected downtime window from available slots
    this.removeTimeSlot(slots, downtimeStart, sleepStart);
  }

  private calculateAvailableSlots(dailyInput: DailyInput): TimeSlot[] {
    const slots: TimeSlot[] = [];

    // Parse date ensuring it's treated as local midnight to match system timezone
    const baseDate = this.getBaseDate();

    const sleepStart = parse(dailyInput.sleep.start, 'HH:mm', baseDate);
    const sleepEnd = parse(dailyInput.sleep.end, 'HH:mm', baseDate);

    // Treat wake time as the end of sleep even if the range crosses midnight
    // so morning availability is on the same calendar date as the plan.
    const wakeTime = sleepEnd;

    const dayStart = startOfDay(baseDate);
    const dayEnd = endOfDay(baseDate);

    // Available time is from wake to sleep start
    let currentSlotStart = wakeTime;

    // NEW: Real-time anchoring
    // If generating for today, don't schedule in the past
    const now = this.context.currentTime;
    const isToday = format(now, 'yyyy-MM-dd') === dailyInput.date;

    if (isToday) {
      // Add buffer from now to give user time to orient
      const earliestStart = addMinutes(now, SchedulingEngine.REAL_TIME_CONFIG.bufferFromNowMinutes);

      // If we're already past the wake time, start from now + buffer
      if (isAfter(earliestStart, wakeTime)) {
        currentSlotStart = earliestStart;
      }
    }

    const maxEnd = isAfter(sleepStart, dayEnd) ? dayEnd : sleepStart;

    // Remove fixed events from available time
    // Add buffer time before and after fixed events
    const bufferTime = dailyInput.constraints.buffersBetweenBlocksMin;
    const sortedEvents = [...dailyInput.fixedEvents].sort((a, b) =>
      a.start.localeCompare(b.start)
    );

    for (const event of sortedEvents) {
      const eventStart = parse(event.start, 'HH:mm', baseDate);
      const eventEnd = parse(event.end, 'HH:mm', baseDate);

      // Handle events that cross midnight
      const actualEventStart = eventStart;
      let actualEventEnd = eventEnd;
      if (isAfter(eventEnd, eventStart)) {
        actualEventEnd = eventEnd;
      } else {
        actualEventEnd = addMinutes(eventEnd, 24 * 60);
      }

      // Add available time before this event (with buffer before event starts)
      if (isAfter(currentSlotStart, dayStart) && isBefore(currentSlotStart, actualEventStart)) {
        // Slot ends bufferTime before the event starts
        const slotEnd = addMinutes(actualEventStart, -bufferTime);
        const slotDuration = differenceInMinutes(slotEnd, currentSlotStart);
        if (slotDuration >= dailyInput.constraints.buffersBetweenBlocksMin) {
          slots.push({
            start: currentSlotStart,
            end: slotEnd,
            duration: slotDuration,
          });
        }
      }

      // Move to end of this event PLUS buffer time
      currentSlotStart = addMinutes(actualEventEnd, bufferTime);
    }

    // Add final available slot if there's time before sleep
    if (isAfter(currentSlotStart, dayStart) && isBefore(currentSlotStart, maxEnd)) {
      const slotDuration = differenceInMinutes(maxEnd, currentSlotStart);
      if (slotDuration >= dailyInput.constraints.buffersBetweenBlocksMin * 2) {
        slots.push({
          start: currentSlotStart,
          end: maxEnd,
          duration: slotDuration,
        });
      }
    }

    return slots;
  }

  private buildSchedulingQueue(habits: Habit[], tasks: Task[]): Array<Habit | Task> {
    const queue: Array<Habit | Task> = [];
    const today = this.getBaseDate();
    const dayOfWeek = today.getDay();

    // Add habits based on frequency and day
    for (const habit of habits) {
      if (!habit.isActive) continue;

      let shouldInclude = false;

      switch (habit.frequency) {
        case 'daily':
          shouldInclude = true;
          break;
        case 'weekly':
          const habitHash = this.hashString(habit.id);
          const scheduledDay = habitHash % 7;
          shouldInclude = dayOfWeek === scheduledDay;
          break;
        case 'specific-days':
          shouldInclude = habit.specificDays?.includes(dayOfWeek) || false;
          break;
        case 'x-times-per-week':
          if (habit.timesPerWeek) {
            const weekDays = this.getDistributedDays(habit.id, habit.timesPerWeek);
            shouldInclude = weekDays.includes(dayOfWeek);
          }
          break;
        default:
          shouldInclude = true;
      }

      if (shouldInclude) {
        queue.push(habit);
      }
    }

    // Add all active incomplete tasks (topologically sorted first)
    const sortedTasks = this.topologicalSortTasks(tasks);
    for (const task of sortedTasks) {
      if (!task.isActive || task.isCompleted) continue;
      queue.push(task);
    }

    // Sort using composite score
    return this.sortByCompositeScore(queue, today);
  }

  // Calculate composite score for queue ordering
  private calculateCompositeScore(item: Habit | Task, today: Date): number {
    let score = 0;
    const W = SchedulingEngine.SCORING_WEIGHTS;

    // Priority component: P5 = 250, P4 = 200, P3 = 150, P2 = 100, P1 = 50
    score += item.priority * W.priorityBonus;

    // Deadline urgency for tasks
    if ('dueDate' in item && item.dueDate) {
      const dueDate = new Date(item.dueDate);
      const daysUntilDue = Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      const D = SchedulingEngine.DEADLINE_BONUSES;

      if (daysUntilDue < 0) {
        // Overdue: highest urgency
        score += W.deadlineUrgency * D.overdueMultiplier;
      } else if (daysUntilDue === 0) {
        // Due today
        score += W.deadlineUrgency * D.dueTodayMultiplier;
      } else if (daysUntilDue <= D.dueSoonDays) {
        // Due soon
        score += W.deadlineUrgency * D.dueSoonMultiplier;
      }
    }

    // Time window constraint (items with explicit windows scheduled earlier)
    const timeWindow = 'preferredTimeWindow' in item
      ? item.preferredTimeWindow
      : ('timeWindowPreference' in item ? item.timeWindowPreference : null);

    const Q = SchedulingEngine.QUEUE_BONUSES;
    if (timeWindow === 'morning') {
      score += Q.morningWindowBonus; // Morning items get slight boost to be scheduled first
    } else if (timeWindow === 'explicit' && 'explicitStartTime' in item) {
      score += Q.explicitTimeBonus; // Explicit time items have highest scheduling priority
    }

    // Flexibility penalty (more flexible items can be pushed later)
    if ('flexibility' in item) {
      if (item.flexibility === 'fixed') score += Q.fixedFlexibilityBonus;
      else if (item.flexibility === 'semi-flex') score += Q.semiFlexBonus;
      // 'flexible' items get no bonus
    }

    return score;
  }

  // Sort queue by composite score, preserving dependency order
  private sortByCompositeScore(queue: Array<Habit | Task>, today: Date): Array<Habit | Task> {
    // Separate items with dependencies
    const independentItems: Array<Habit | Task> = [];
    const dependentTasks: Array<Task> = [];

    for (const item of queue) {
      if ('dependencies' in item && item.dependencies && item.dependencies.length > 0) {
        dependentTasks.push(item as Task);
      } else {
        independentItems.push(item);
      }
    }

    // Sort independent items by composite score (higher = scheduled first)
    independentItems.sort((a, b) => {
      const scoreA = this.calculateCompositeScore(a, today);
      const scoreB = this.calculateCompositeScore(b, today);
      return scoreB - scoreA;
    });

    // Dependent tasks maintain topological order but are appended after independent items
    return [...independentItems, ...dependentTasks];
  }

  // Simple string hash for deterministic scheduling
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  // Get deterministically distributed days for x-times-per-week habits
  private getDistributedDays(habitId: string, timesPerWeek: number): number[] {
    const days: number[] = [];
    const hash = this.hashString(habitId);
    const spacing = Math.floor(7 / timesPerWeek);

    for (let i = 0; i < timesPerWeek; i++) {
      days.push((hash + i * spacing) % 7);
    }
    return days;
  }

  // Topological sort of tasks based on dependencies
  private topologicalSortTasks(tasks: Task[]): Task[] {
    const taskMap = new Map<string, Task>();
    const visited = new Set<string>();
    const sorted: Task[] = [];

    for (const task of tasks) {
      taskMap.set(task.id, task);
    }

    const visit = (task: Task): void => {
      if (visited.has(task.id)) return;
      visited.add(task.id);

      // Visit dependencies first
      if (task.dependencies) {
        for (const depId of task.dependencies) {
          const depTask = taskMap.get(depId);
          if (depTask) {
            visit(depTask);
          }
        }
      }

      sorted.push(task);
    };

    for (const task of tasks) {
      visit(task);
    }

    return sorted;
  }

  private scheduleGym(availableSlots: TimeSlot[], gymSettings: GymSettings): ScheduledBlock | null {
    const gymDuration = gymSettings.defaultDuration;
    const minGymDuration = gymSettings.minimumDuration;
    const bufferTime = this.context.dailyInput.constraints.buffersBetweenBlocksMin;

    // Try to find the best slot for gym
    let bestSlot: TimeSlot | null = null;
    let bestScore = -1;

    for (const slot of availableSlots) {
      // Account for buffer time when checking if slot fits
      if (slot.duration < minGymDuration + bufferTime) continue;

      const slotScore = this.scoreGymSlot(slot, gymSettings);
      if (slotScore > bestScore) {
        bestScore = slotScore;
        bestSlot = slot;
      }
    }

    if (!bestSlot) return null;

    const actualDuration = Math.min(gymDuration, bestSlot.duration - bufferTime);
    const endTime = addMinutes(bestSlot.start, actualDuration);

    return {
      id: `gym-${Date.now()}`,
      title: 'Gym Workout',
      start: format(bestSlot.start, 'HH:mm'),
      end: format(endTime, 'HH:mm'),
      type: 'gym',
      locked: false,
      completed: false,
      energyLevel: 'high',
      originalDuration: gymDuration,
    };
  }

  private scoreGymSlot(slot: TimeSlot, gymSettings: GymSettings): number {
    let score = 0;

    const slotStart = slot.start.getHours();

    // Prefer after-work slots
    if (gymSettings.preferredWindow === 'after-work') {
      if (slotStart >= 17 && slotStart <= 20) score += 100;
      else if (slotStart >= 15 && slotStart <= 21) score += 50;
    }

    // Prefer morning slots for morning preference
    if (gymSettings.preferredWindow === 'morning') {
      if (slotStart >= 6 && slotStart <= 10) score += 100;
      else if (slotStart >= 5 && slotStart <= 12) score += 50;
    }

    // Avoid too late slots (bedtime buffer)
    const sleepStart = parse(this.context.dailyInput.sleep.start, 'HH:mm', new Date());
    const bedtimeBuffer = gymSettings.bedtimeBuffer;
    const latestGymEnd = addMinutes(sleepStart, -bedtimeBuffer);

    if (isAfter(slot.end, latestGymEnd)) {
      score -= 50;
    }

    // Prefer longer slots
    score += slot.duration / 10;

    return score;
  }

  private scheduleItem(item: Habit | Task, availableSlots: TimeSlot[], minStartTime?: Date): ScheduledBlock | null {
    const duration = 'duration' in item ? item.duration : item.estimatedDuration;
    const minDuration = ('minimumViableDuration' in item && item.minimumViableDuration) ? item.minimumViableDuration : duration;
    const bufferTime = this.context.dailyInput.constraints.buffersBetweenBlocksMin;

    // Get time window constraint
    const preferredWindow = this.getItemTimeWindow(item);

    let bestSlot: TimeSlot | null = null;
    let bestScore = -Infinity; // Use -Infinity to allow negative scores

    for (const slot of availableSlots) {
      // Hard constraint: slot must have enough duration for item + buffer
      if (slot.duration < minDuration + bufferTime) continue;

      // Hard constraint: if minStartTime is set (dependency), slot must start after it
      if (minStartTime && slot.start < minStartTime) continue;

      // Check time window constraints
      const slotHour = slot.start.getHours();
      const titleLower = ('name' in item ? item.name : item.title).toLowerCase();
      const titleWindow = this.getTitleTimeWindow(titleLower);
      const flexibility = 'flexibility' in item ? item.flexibility : 'flexible';

      // Title-based time window is always a hard constraint
      if (titleWindow) {
        if (!this.isHourInWindow(slotHour, titleWindow)) {
          continue; // Hard constraint: title indicates specific window
        }
      }

      // Explicit time and fixed flexibility...
      if (preferredWindow === 'explicit' && 'explicitStartTime' in item && item.explicitStartTime) {
        const explicitHour = parseInt(item.explicitStartTime.split(':')[0]);
        if (Math.abs(slotHour - explicitHour) > 1) {
          continue; // Must be within 1 hour of explicit time
        }
      } else if (flexibility === 'fixed' && preferredWindow && preferredWindow !== 'explicit') {
        if (!this.isHourInWindow(slotHour, preferredWindow)) {
          continue; // Fixed flexibility items must be in their window
        }
      }

      // NEW: Category-based constraints (e.g. business hours for errands)
      const categoryConstraints = this.getTaskCategoryConstraints(titleLower);
      if (categoryConstraints) {
        if (categoryConstraints.minHour !== undefined && slotHour < categoryConstraints.minHour) continue;
        if (categoryConstraints.maxHour !== undefined && slotHour > categoryConstraints.maxHour) continue;
      }

      const slotScore = this.scoreItemSlot(slot, item, duration);
      if (slotScore > bestScore) {
        bestScore = slotScore;
        bestSlot = slot;
      }
    }

    if (!bestSlot) return null;

    const actualDuration = Math.min(duration, bestSlot.duration - bufferTime);
    const endTime = addMinutes(bestSlot.start, actualDuration);

    // Track category for context continuity scoring
    const itemCategory = 'category' in item ? item.category : 'other';
    this.lastScheduledCategory = itemCategory;

    return {
      id: `${'frequency' in item ? 'habit' : 'task'}-${item.id}-${Date.now()}`,
      title: 'frequency' in item ? item.name : item.title,
      start: format(bestSlot.start, 'HH:mm'),
      end: format(endTime, 'HH:mm'),
      type: 'frequency' in item ? 'habit' : 'task',
      locked: false,
      completed: false,
      sourceId: item.id,
      energyLevel: item.energyLevel,
      originalDuration: duration,
    };
  }

  private getItemTimeWindow(item: Habit | Task): 'morning' | 'afternoon' | 'evening' | 'explicit' | undefined {
    if ('preferredTimeWindow' in item) return item.preferredTimeWindow;
    if ('timeWindowPreference' in item) return item.timeWindowPreference;
    return undefined;
  }

  private getTitleTimeWindow(titleLower: string): 'morning' | 'afternoon' | 'evening' | undefined {
    if (titleLower.includes('morning')) return 'morning';
    if (titleLower.includes('afternoon')) return 'afternoon';
    if (titleLower.includes('evening') || titleLower.includes('night')) return 'evening';
    return undefined;
  }

  private getTaskCategoryConstraints(titleLower: string): { maxHour?: number, minHour?: number } | null {
    // Shopping / Errands - usually imply business hours or early evening
    if (titleLower.includes('grocery') || titleLower.includes('shop') || titleLower.includes('market') || titleLower.includes('errand') || titleLower.includes('buy')) {
      return { maxHour: 20, minHour: 8 }; // 8am - 8pm (strict to avoid 9pm shopping)
    }
    // Strict Business services
    if (titleLower.includes('bank') || titleLower.includes('post office') || titleLower.includes('dentist') || titleLower.includes('doctor')) {
      return { maxHour: 16, minHour: 9 }; // 9am - 4pm (safe bet)
    }
    // Professional Calls/Meetings
    if (titleLower.includes('call') || titleLower.includes('meeting') || titleLower.includes('interview')) {
      return { maxHour: 18, minHour: 8 }; // 8am - 6pm
    }
    return null;
  }

  private scoreItemSlot(slot: TimeSlot, item: Habit | Task, duration: number): number {
    let score = 0;
    const W = SchedulingEngine.SCORING_WEIGHTS;

    // 1. Time Window Match (+30 if perfect match)
    const slotHour = slot.start.getHours();
    const preferredWindow = this.getItemTimeWindow(item);
    const titleLower = ('name' in item ? item.name : item.title).toLowerCase();
    const titleWindow = this.getTitleTimeWindow(titleLower);

    // Title-based window takes priority
    const effectiveWindow = titleWindow || preferredWindow;
    if (effectiveWindow) {
      if (effectiveWindow === 'explicit' && 'explicitStartTime' in item && item.explicitStartTime) {
        const explicitHour = parseInt(item.explicitStartTime.split(':')[0]);
        const proximity = Math.abs(slotHour - explicitHour);
        score += proximity === 0 ? W.timeWindowMatch : W.timeWindowMatch - proximity * 5;
      } else if (this.isHourInWindow(slotHour, effectiveWindow)) {
        score += W.timeWindowMatch;
      } else {
        score -= W.timeWindowMatch * 2; // Strong penalty for wrong window
      }
    }

    // 2. Energy Alignment (+25 if energy matches time of day)
    const slotEnergy = SchedulingEngine.ENERGY_PROFILE[slotHour] || 'medium';
    const itemEnergy = item.energyLevel || 'medium';

    if (slotEnergy === itemEnergy) {
      score += W.energyAlignment;
    } else if (
      (slotEnergy === 'high' && itemEnergy === 'medium') ||
      (slotEnergy === 'medium' && itemEnergy === 'low')
    ) {
      score += W.energyAlignment * 0.5; // Partial match
    } else if (slotEnergy === 'low' && itemEnergy === 'high') {
      score -= W.energyAlignment; // Penalty for high-energy task in low-energy slot
    }

    // 3. Duration Fit (+20 if slot perfectly fits)
    const bufferTime = this.context.dailyInput.constraints.buffersBetweenBlocksMin;
    const requiredDuration = duration + bufferTime;
    const slotFitRatio = slot.duration / requiredDuration;

    if (slotFitRatio >= 1 && slotFitRatio <= 1.3) {
      score += W.durationFit; // Perfect or near-perfect fit
    } else if (slotFitRatio >= 1.3 && slotFitRatio <= 2) {
      score += W.durationFit * 0.5; // Good fit with some extra room
    } else if (slotFitRatio < 1) {
      score -= W.durationFit * 2; // Slot too small (shouldn't happen with hard constraint)
    }
    // Very large slots get slight penalty (prefer tighter packing)
    if (slotFitRatio > 3) {
      score -= 5;
    }

    // 4. Context Continuity (+15 if same category as last scheduled)
    const itemCategory = 'category' in item ? item.category : 'other';
    if (this.lastScheduledCategory && this.lastScheduledCategory === itemCategory) {
      score += W.contextContinuity;
    }

    // 5. Buffer Comfort (+10 if extra buffer room beyond minimum)
    const extraBuffer = slot.duration - requiredDuration;
    if (extraBuffer >= bufferTime * 2) {
      score += W.bufferComfort;
    }

    // Urgency bonus for tasks with due dates
    if ('dueDate' in item && item.dueDate) {
      const daysUntilDue = differenceInMinutes(
        new Date(item.dueDate),
        this.getBaseDate()
      ) / (24 * 60);

      if (daysUntilDue <= 0) score += 50; // Overdue
      else if (daysUntilDue <= 1) score += 30; // Due today
      else if (daysUntilDue <= 3) score += 15;
    }

    // Late night penalty (unless explicitly a night task)
    if (slotHour >= 22) {
      if (titleLower.includes('night') || titleLower.includes('evening')) {
        score += 5;
      } else {
        score -= 30;
      }
    }

    // Mild preference for earlier slots (helps maintain queue order in time)
    // This ensures items scheduled first in the queue get earlier time slots
    const earlyBonus = Math.max(0, 15 - slotHour);
    score += earlyBonus;

    return score;
  }

  private isHourInWindow(
    hour: number,
    window: 'morning' | 'afternoon' | 'evening' | 'explicit'
  ): boolean {
    switch (window) {
      case 'morning':
        return hour >= 5 && hour < 12;
      case 'afternoon':
        return hour >= 12 && hour < 18;
      case 'evening':
        return hour >= 18 && hour < 23;
      default:
        return false;
    }
  }

  private getEnergyScore(hour: number, energyLevel: 'low' | 'medium' | 'high'): number {
    // Simple energy curve - people typically have higher energy in morning and early afternoon
    let baseScore = 0;

    if (energyLevel === 'high') {
      if (hour >= 8 && hour <= 12) baseScore = 30;
      else if (hour >= 6 && hour <= 16) baseScore = 15;
      else baseScore = -10;
    } else if (energyLevel === 'medium') {
      if (hour >= 10 && hour <= 17) baseScore = 20;
      else baseScore = 0;
    } else { // low energy
      if (hour >= 19 && hour <= 22) baseScore = 20;
      else if (hour >= 6 && hour <= 9) baseScore = 10;
      else baseScore = 0;
    }

    return baseScore;
  }

  private removeTimeSlot(slots: TimeSlot[], start: Date, end: Date): void {
    // Find all slots that overlap with the removal range
    for (let i = slots.length - 1; i >= 0; i--) {
      const slot = slots[i];

      // Check if slot overlaps with [start, end]
      const overlapsStart = isBefore(slot.start, end) || slot.start.getTime() === end.getTime();
      const overlapsEnd = isAfter(slot.end, start) || slot.end.getTime() === start.getTime();

      if (!overlapsStart || !overlapsEnd) continue;

      // The slot overlaps with the removal range
      const slotStartBeforeRemoval = isBefore(slot.start, start);
      const slotEndAfterRemoval = isAfter(slot.end, end);

      if (slotStartBeforeRemoval && slotEndAfterRemoval) {
        // Slot contains the removal - split into two parts
        const beforeSlot: TimeSlot = {
          start: slot.start,
          end: start,
          duration: differenceInMinutes(start, slot.start),
        };
        const afterSlot: TimeSlot = {
          start: end,
          end: slot.end,
          duration: differenceInMinutes(slot.end, end),
        };

        // Remove original slot and add the two new ones
        slots.splice(i, 1);

        // Only add slots with meaningful duration
        const minDuration = this.context.dailyInput.constraints.buffersBetweenBlocksMin * 2;
        if (beforeSlot.duration >= minDuration) {
          slots.push(beforeSlot);
        }
        if (afterSlot.duration >= minDuration) {
          slots.push(afterSlot);
        }
      } else if (slotStartBeforeRemoval) {
        // Trim the end of the slot
        slot.end = start;
        slot.duration = differenceInMinutes(start, slot.start);

        // Remove if too small
        if (slot.duration < this.context.dailyInput.constraints.buffersBetweenBlocksMin * 2) {
          slots.splice(i, 1);
        }
      } else if (slotEndAfterRemoval) {
        // Trim the start of the slot
        slot.start = end;
        slot.duration = differenceInMinutes(slot.end, end);

        // Remove if too small
        if (slot.duration < this.context.dailyInput.constraints.buffersBetweenBlocksMin * 2) {
          slots.splice(i, 1);
        }
      } else {
        // Entire slot is within removal range - remove completely
        slots.splice(i, 1);
      }
    }

    // Re-sort slots by start time
    slots.sort((a, b) => a.start.getTime() - b.start.getTime());
  }

  private createFixedBlocks(dailyInput: DailyInput): ScheduledBlock[] {
    return dailyInput.fixedEvents.map(event => ({
      id: `fixed-${event.title}-${event.start}`,
      title: event.title,
      start: event.start,
      end: event.end,
      type: event.type,
      locked: true,
      completed: false,
    }));
  }

  private calculateStats(blocks: ScheduledBlock[], dailyInput: DailyInput): PlanOutput['stats'] {
    const workBlocks = blocks.filter(b => b.type === 'work');
    const gymBlocks = blocks.filter(b => b.type === 'gym');
    const habitBlocks = blocks.filter(b => b.type === 'habit');
    const taskBlocks = blocks.filter(b => b.type === 'task');

    const workHours = workBlocks.reduce((total, block) => {
      const start = parse(block.start, 'HH:mm', new Date());
      const end = parse(block.end, 'HH:mm', new Date());
      return total + differenceInMinutes(end, start) / 60;
    }, 0);

    const gymMinutes = gymBlocks.reduce((total, block) => {
      const start = parse(block.start, 'HH:mm', new Date());
      const end = parse(block.end, 'HH:mm', new Date());
      return total + differenceInMinutes(end, start);
    }, 0);

    const focusBlocks = taskBlocks.filter(b => b.energyLevel === 'high').length;

    // Calculate free time (total day - scheduled time)
    const sleepStart = parse(dailyInput.sleep.start, 'HH:mm', new Date());
    const sleepEnd = parse(dailyInput.sleep.end, 'HH:mm', new Date());
    const totalDayMinutes = differenceInMinutes(sleepStart > sleepEnd ? addMinutes(sleepEnd, 24 * 60) : sleepEnd, sleepStart < sleepEnd ? sleepStart : addMinutes(sleepStart, 24 * 60));

    const scheduledMinutes = blocks.reduce((total, block) => {
      const start = parse(block.start, 'HH:mm', new Date());
      const end = parse(block.end, 'HH:mm', new Date());
      return total + differenceInMinutes(end, start);
    }, 0);

    const freeTimeRemaining = totalDayMinutes - scheduledMinutes;

    return {
      workHours: Math.round(workHours * 10) / 10,
      gymMinutes,
      habitsCompleted: habitBlocks.length,
      tasksCompleted: taskBlocks.length,
      focusBlocks,
      freeTimeRemaining,
    };
  }

  private getUnscheduledItems(
    queue: Array<Habit | Task>,
    reasons: Map<string, string>
  ): UnscheduledItem[] {
    const unscheduled: UnscheduledItem[] = [];

    for (const item of queue) {
      if (!this.scheduledItemIds.has(item.id)) {
        const title = 'name' in item ? item.name : item.title;
        const reason = reasons.get(item.id) || 'Could not fit in available time slots';

        unscheduled.push({
          title,
          reason,
          sourceId: item.id,
          priority: item.priority,
        });
      }
    }

    // Sort by priority (highest first) so user knows what's most important
    return unscheduled.sort((a, b) => (b.priority || 0) - (a.priority || 0));
  }

  private generateExplanation(blocks: ScheduledBlock[], unscheduled: UnscheduledItem[], dailyInput: DailyInput): string {
    const gymBlock = blocks.find(b => b.type === 'gym');
    const habitBlocks = blocks.filter(b => b.type === 'habit');
    const taskBlocks = blocks.filter(b => b.type === 'task');

    const parts: string[] = [];

    if (gymBlock) {
      parts.push(`Gym at ${gymBlock.start}-${gymBlock.end}`);
    }

    if (habitBlocks.length > 0) {
      const habitNames = habitBlocks.map(b => b.title).join(', ');
      parts.push(`${habitBlocks.length} habits scheduled: ${habitNames}`);
    }

    if (taskBlocks.length > 0) {
      const taskNames = taskBlocks.map(b => b.title).join(', ');
      parts.push(`${taskBlocks.length} tasks scheduled: ${taskNames}`);
    }

    parts.push(`${dailyInput.constraints.buffersBetweenBlocksMin}min buffers between blocks`);

    if (dailyInput.constraints.protectDowntimeMin > 0) {
      parts.push(`${dailyInput.constraints.protectDowntimeMin}min downtime before sleep`);
    }

    if (unscheduled.length > 0) {
      parts.push(`${unscheduled.length} items couldn't fit (see Unscheduled section)`);
    }

    return parts.join('. ') + '.';
  }

  private generateNextDaySuggestions(unscheduled: UnscheduledItem[]): string[] {
    const suggestions: string[] = [];

    if (unscheduled.length > 0) {
      const highPriorityUnscheduled = unscheduled.filter(u => (u.priority || 0) >= 4);
      if (highPriorityUnscheduled.length > 0) {
        suggestions.push(`Prioritize ${highPriorityUnscheduled.length} high-priority items that couldn't be scheduled today`);
      }
      suggestions.push('Consider moving some tasks to tomorrow to ensure quality completion');
      suggestions.push('Review task priorities and deadlines for better planning');
    }

    suggestions.push('Maintain consistent gym schedule for optimal results');

    return suggestions;
  }
}

// Utility function to parse text input
export function parseTextInput(text: string): {
  items: Array<{ title: string; start: string; end: string; type: string }>;
  unparsedText: string;
} {
  const items: Array<{ title: string; start: string; end: string; type: string }> = [];
  const segments = text
    .split(/;|\n/)
    .map(segment => segment.trim())
    .filter(Boolean);
  const unmatched: string[] = [];

  for (const segment of segments) {
    const match = segment.match(
      /^(.+?)\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s*-\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i
    );

    if (!match) {
      unmatched.push(segment);
      continue;
    }

    const [, title, startTimeRaw, endTimeRaw] = match;
    const startTime = convertTo24Hour(startTimeRaw);
    const endTime = convertTo24Hour(endTimeRaw);

    let type = 'other';
    const titleLower = title.toLowerCase();
    if (titleLower.includes('work') || titleLower.includes('office')) type = 'work';
    else if (
      titleLower.includes('lunch') ||
      titleLower.includes('dinner') ||
      titleLower.includes('breakfast') ||
      titleLower.includes('meal')
    )
      type = 'meal';
    else if (titleLower.includes('call') || titleLower.includes('meeting')) type = 'call';
    else if (titleLower.includes('appointment') || titleLower.includes('doctor') || titleLower.includes('dentist'))
      type = 'appointment';

    items.push({
      title: title.trim(),
      start: startTime,
      end: endTime,
      type,
    });
  }

  return {
    items,
    unparsedText: unmatched.join('\n'),
  };
}

function convertTo24Hour(timeStr: string): string {
  // Handle various time formats and convert to HH:MM
  let time = timeStr.toLowerCase().trim();

  // Remove am/pm and spaces
  time = time.replace(/\s*(am|pm)\s*/g, '');

  // Handle 12-hour format
  let hours = parseInt(time.split(':')[0]);
  const minutes = time.includes(':') ? time.split(':')[1] : '00';

  if (timeStr.toLowerCase().includes('pm') && hours !== 12) {
    hours += 12;
  } else if (timeStr.toLowerCase().includes('am') && hours === 12) {
    hours = 0;
  }

  return `${hours.toString().padStart(2, '0')}:${minutes.padStart(2, '0')}`;
}
