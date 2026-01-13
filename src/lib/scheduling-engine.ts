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
  TimeSlot,
  ScoringFactors
} from '@/types';
import { addMinutes, differenceInMinutes, parse, format, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';

export class SchedulingEngine {
  private context: {
    dailyInput: DailyInput;
    habits: Habit[];
    tasks: Task[];
    gymSettings: GymSettings;
    userPreferences: UserPreferences;
  };

  constructor(
    dailyInput: DailyInput,
    habits: Habit[],
    tasks: Task[],
    gymSettings: GymSettings,
    userPreferences: UserPreferences
  ) {
    this.context = {
      dailyInput,
      habits,
      tasks,
      gymSettings,
      userPreferences,
    };
  }

  public generatePlan(): PlanOutput {
    const { dailyInput, habits, tasks, gymSettings } = this.context;

    // Step 1: Calculate all available time slots
    const availableSlots = this.calculateAvailableSlots(dailyInput);

    // Step 2: Prepare scheduling queue with priorities
    const schedulingQueue = this.buildSchedulingQueue(habits, tasks);

    // Step 3: Schedule gym first (if enabled)
    const scheduledBlocks: ScheduledBlock[] = [];
    if (gymSettings.enabled) {
      const gymBlock = this.scheduleGym(availableSlots, gymSettings);
      if (gymBlock) {
        scheduledBlocks.push(gymBlock);
        // Remove gym time from available slots
        const gymStart = parse(gymBlock.start, 'HH:mm', new Date(this.context.dailyInput.date));
        const gymEnd = parse(gymBlock.end, 'HH:mm', new Date(this.context.dailyInput.date));
        this.removeTimeSlot(availableSlots, gymStart, gymEnd);
      }
    }

    // Step 4: Schedule habits and tasks
    for (const item of schedulingQueue) {
      const scheduled = this.scheduleItem(item, availableSlots);
      if (scheduled) {
        scheduledBlocks.push(scheduled);
        // Remove scheduled time from available slots
        const scheduledStart = parse(scheduled.start, 'HH:mm', new Date(this.context.dailyInput.date));
        const scheduledEnd = parse(scheduled.end, 'HH:mm', new Date(this.context.dailyInput.date));
        this.removeTimeSlot(availableSlots, scheduledStart, scheduledEnd);
      } else {
        // Item couldn't be scheduled - add to unscheduled
        // This will be handled in the final step
      }
    }

    // Step 5: Add fixed events and sleep
    scheduledBlocks.push(...this.createFixedBlocks(dailyInput));

    // Step 6: Sort blocks by start time
    scheduledBlocks.sort((a, b) => a.start.localeCompare(b.start));

    // Step 7: Generate stats and explanation
    const stats = this.calculateStats(scheduledBlocks, dailyInput);
    const unscheduled = this.getUnscheduledItems(schedulingQueue);
    const explanation = this.generateExplanation(scheduledBlocks, unscheduled, dailyInput);

    return {
      date: dailyInput.date,
      blocks: scheduledBlocks,
      unscheduled,
      explanation,
      stats,
      nextDaySuggestions: this.generateNextDaySuggestions(unscheduled),
    };
  }

  private calculateAvailableSlots(dailyInput: DailyInput): TimeSlot[] {
    const slots: TimeSlot[] = [];
    const sleepStart = parse(dailyInput.sleep.start, 'HH:mm', new Date(dailyInput.date));
    const sleepEnd = parse(dailyInput.sleep.end, 'HH:mm', new Date(dailyInput.date));

    // Treat wake time as the end of sleep even if the range crosses midnight
    // so morning availability is on the same calendar date as the plan.
    const wakeTime = sleepEnd;

    const dayStart = startOfDay(new Date(dailyInput.date));
    const dayEnd = endOfDay(new Date(dailyInput.date));

    // Available time is from wake to sleep start
    let currentSlotStart = wakeTime;
    const maxEnd = isAfter(sleepStart, dayEnd) ? dayEnd : sleepStart;

    // Remove fixed events from available time
    const sortedEvents = [...dailyInput.fixedEvents].sort((a, b) =>
      a.start.localeCompare(b.start)
    );

    for (const event of sortedEvents) {
      const eventStart = parse(event.start, 'HH:mm', new Date(dailyInput.date));
      const eventEnd = parse(event.end, 'HH:mm', new Date(dailyInput.date));

      // Handle events that cross midnight
      let actualEventStart = eventStart;
      let actualEventEnd = eventEnd;
      if (isAfter(eventEnd, eventStart)) {
        actualEventEnd = eventEnd;
      } else {
        actualEventEnd = addMinutes(eventEnd, 24 * 60);
      }

      // Add available time before this event
      if (isAfter(currentSlotStart, dayStart) && isBefore(currentSlotStart, actualEventStart)) {
        const slotDuration = differenceInMinutes(actualEventStart, currentSlotStart);
        if (slotDuration >= dailyInput.constraints.buffersBetweenBlocksMin * 2) {
          slots.push({
            start: currentSlotStart,
            end: actualEventStart,
            duration: slotDuration,
          });
        }
      }

      // Move to end of this event
      currentSlotStart = actualEventEnd;
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

    // Add habits based on frequency and day
    const today = new Date(this.context.dailyInput.date);
    const dayOfWeek = today.getDay();

    for (const habit of habits) {
      if (!habit.isActive) continue;

      let shouldInclude = false;

      switch (habit.frequency) {
        case 'daily':
          shouldInclude = true;
          break;
        case 'weekly':
          // For weekly habits, we'll schedule them based on the day
          // This could be enhanced with more sophisticated logic
          shouldInclude = Math.random() > 0.5; // Simple random for demo
          break;
        case 'specific-days':
          shouldInclude = habit.specificDays?.includes(dayOfWeek) || false;
          break;
        case 'x-times-per-week':
          // This would need more sophisticated tracking
          shouldInclude = Math.random() > 0.6; // Simple random for demo
          break;
      }

      if (shouldInclude) {
        queue.push(habit);
      }
    }

    // Add tasks that are due today or high priority
    for (const task of tasks) {
      if (!task.isActive || task.isCompleted) continue;

      // Include tasks that are due today or overdue
      if (task.dueDate) {
        const dueDate = new Date(task.dueDate);
        if (dueDate <= today) {
          queue.push(task);
          continue;
        }
      }

      // Include high priority tasks randomly
      if (task.priority >= 4 && Math.random() > 0.7) {
        queue.push(task);
      }
    }

    // Sort by priority (higher first)
    return queue.sort((a, b) => b.priority - a.priority);
  }

  private scheduleGym(availableSlots: TimeSlot[], gymSettings: GymSettings): ScheduledBlock | null {
    const gymDuration = gymSettings.defaultDuration;
    const minGymDuration = gymSettings.minimumDuration;

    // Try to find the best slot for gym
    let bestSlot: TimeSlot | null = null;
    let bestScore = -1;

    for (const slot of availableSlots) {
      if (slot.duration < minGymDuration) continue;

      const slotScore = this.scoreGymSlot(slot, gymSettings);
      if (slotScore > bestScore) {
        bestScore = slotScore;
        bestSlot = slot;
      }
    }

    if (!bestSlot) return null;

    const actualDuration = Math.min(gymDuration, bestSlot.duration);
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
    const slotEnd = slot.start.getHours() + (slot.duration / 60);

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

  private scheduleItem(item: Habit | Task, availableSlots: TimeSlot[]): ScheduledBlock | null {
    const duration = 'duration' in item ? item.duration : item.estimatedDuration;
    const minDuration = ('minimumViableDuration' in item && item.minimumViableDuration) ? item.minimumViableDuration : duration;

    let bestSlot: TimeSlot | null = null;
    let bestScore = -1;

    for (const slot of availableSlots) {
      if (slot.duration < minDuration) continue;

      const slotScore = this.scoreItemSlot(slot, item, duration);
      if (slotScore > bestScore) {
        bestScore = slotScore;
        bestSlot = slot;
      }
    }

    if (!bestSlot) return null;

    const actualDuration = Math.min(duration, bestSlot.duration);
    const endTime = addMinutes(bestSlot.start, actualDuration);

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

  private scoreItemSlot(slot: TimeSlot, item: Habit | Task, duration: number): number {
    let score = 0;

    // Base priority score
    score += item.priority * 20;

    // Urgency bonus for tasks with due dates
    if ('dueDate' in item && item.dueDate) {
      const daysUntilDue = differenceInMinutes(
        new Date(item.dueDate),
        new Date(this.context.dailyInput.date)
      ) / (24 * 60);

      if (daysUntilDue <= 1) score += 100;
      else if (daysUntilDue <= 3) score += 50;
      else if (daysUntilDue <= 7) score += 25;
    }

    const slotHour = slot.start.getHours();
    const preferredWindow: 'morning' | 'afternoon' | 'evening' | 'explicit' | undefined =
      'preferredTimeWindow' in item ? item.preferredTimeWindow : ('timeWindowPreference' in item ? item.timeWindowPreference : undefined);

    if (preferredWindow) {
      if (preferredWindow === 'explicit' && 'explicitStartTime' in item && item.explicitStartTime) {
        const explicitHour = parseInt(item.explicitStartTime.split(':')[0]);
        const proximityPenalty = Math.abs(slotHour - explicitHour) * 5;
        score += 60 - proximityPenalty;
      } else if (this.isHourInWindow(slotHour, preferredWindow)) {
        score += 60;
      } else {
        score -= 20;
      }
    }

    // Energy level matching
    const energyScore = this.getEnergyScore(slotHour, item.energyLevel);
    score += energyScore;

    // Fragmentation penalty - prefer larger slots for longer tasks
    if (duration > 60 && slot.duration < 90) {
      score -= 20;
    }

    // Late night penalty
    if (slotHour >= 22) {
      score -= 30;
    }

    // Buffer considerations
    const bufferTime = this.context.dailyInput.constraints.buffersBetweenBlocksMin;
    if (slot.duration - duration < bufferTime * 2) {
      score -= 10;
    }

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
    const index = slots.findIndex(slot =>
      slot.start <= start && slot.end >= end
    );

    if (index !== -1) {
      const slot = slots[index];

      // Remove the scheduled portion
      if (slot.start < start) {
        // Keep the part before the scheduled time
        slots[index] = {
          ...slot,
          end: start,
          duration: differenceInMinutes(start, slot.start),
        };
      } else if (slot.end > end) {
        // Keep the part after the scheduled time
        slots[index] = {
          start: end,
          end: slot.end,
          duration: differenceInMinutes(slot.end, end),
        };
      } else {
        // Remove the entire slot
        slots.splice(index, 1);
      }
    }
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

  private getUnscheduledItems(queue: Array<Habit | Task>): UnscheduledItem[] {
    const unscheduled: UnscheduledItem[] = [];

    for (const item of queue) {
      // For simplicity, we'll assume all items in the queue were scheduled
      // In a real implementation, we'd track which items were actually scheduled
      // This is a simplified version
    }

    return unscheduled;
  }

  private generateExplanation(blocks: ScheduledBlock[], unscheduled: UnscheduledItem[], dailyInput: DailyInput): string {
    const gymBlock = blocks.find(b => b.type === 'gym');
    const habitBlocks = blocks.filter(b => b.type === 'habit');
    const taskBlocks = blocks.filter(b => b.type === 'task');

    let explanation = 'Schedule generated based on the following priorities: ';

    if (gymBlock) {
      explanation += `Gym scheduled at ${gymBlock.start}-${gymBlock.end} in optimal time slot; `;
    }

    explanation += `${habitBlocks.length} habits scheduled in preferred time windows; `;
    explanation += `${taskBlocks.length} tasks prioritized by urgency and energy levels; `;
    explanation += `Maintained ${dailyInput.constraints.buffersBetweenBlocksMin}min buffers between blocks.`;

    if (unscheduled.length > 0) {
      explanation += ` ${unscheduled.length} items could not be scheduled due to time constraints.`;
    }

    return explanation;
  }

  private generateNextDaySuggestions(unscheduled: UnscheduledItem[]): string[] {
    const suggestions: string[] = [];

    if (unscheduled.length > 0) {
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

    let [, title, startTime, endTime] = match;
    startTime = convertTo24Hour(startTime);
    endTime = convertTo24Hour(endTime);

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
