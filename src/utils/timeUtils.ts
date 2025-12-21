// Utility functions for date and time operations

import { format, parse, addMinutes, differenceInMinutes, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';

/**
 * Convert time string (HH:MM) to minutes since midnight
 */
export function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Convert minutes since midnight to time string (HH:MM)
 */
export function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Calculate duration between two time strings
 */
export function calculateDuration(startTime: string, endTime: string): number {
  const start = parse(startTime, 'HH:mm', new Date());
  const end = parse(endTime, 'HH:mm', new Date());
  
  // Handle crossing midnight
  let actualEnd = end;
  if (isBefore(end, start)) {
    actualEnd = addMinutes(end, 24 * 60);
  }
  
  return differenceInMinutes(actualEnd, start);
}

/**
 * Check if a time slot conflicts with another
 */
export function timeSlotsConflict(
  slot1Start: string, 
  slot1End: string, 
  slot2Start: string, 
  slot2End: string
): boolean {
  const start1 = parse(slot1Start, 'HH:mm', new Date());
  const end1 = parse(slot1End, 'HH:mm', new Date());
  const start2 = parse(slot2Start, 'HH:mm', new Date());
  const end2 = parse(slot2End, 'HH:mm', new Date());
  
  // Handle crossing midnight
  let actualEnd1 = end1;
  let actualEnd2 = end2;
  
  if (isBefore(end1, start1)) {
    actualEnd1 = addMinutes(end1, 24 * 60);
  }
  if (isBefore(end2, start2)) {
    actualEnd2 = addMinutes(end2, 24 * 60);
  }
  
  return (isAfter(start1, start2) && isBefore(start1, actualEnd2)) ||
         (isAfter(start2, start1) && isBefore(start2, actualEnd1));
}

/**
 * Get the next occurrence of a specific day of the week
 */
export function getNextWeekday(targetDay: number, fromDate: Date = new Date()): Date {
  const result = new Date(fromDate);
  const currentDay = result.getDay();
  const daysUntilTarget = (targetDay - currentDay + 7) % 7;
  
  if (daysUntilTarget === 0) {
    // If it's the same day, return next week
    result.setDate(result.getDate() + 7);
  } else {
    result.setDate(result.getDate() + daysUntilTarget);
  }
  
  return result;
}

/**
 * Format time for display in different formats
 */
export function formatTimeForDisplay(timeStr: string, formatType: '12h' | '24h' = '12h'): string {
  const time = parse(timeStr, 'HH:mm', new Date());
  
  if (formatType === '12h') {
    return format(time, 'h:mm a');
  } else {
    return format(time, 'HH:mm');
  }
}

/**
 * Get time of day category
 */
export function getTimeOfDay(timeStr: string): 'morning' | 'afternoon' | 'evening' | 'night' {
  const minutes = timeToMinutes(timeStr);
  
  if (minutes >= 300 && minutes < 720) return 'morning';    // 5:00 - 12:00
  if (minutes >= 720 && minutes < 1080) return 'afternoon'; // 12:00 - 18:00
  if (minutes >= 1080 && minutes < 1320) return 'evening';  // 18:00 - 22:00
  return 'night';                                           // 22:00 - 5:00
}

/**
 * Check if a time is within a preferred window
 */
export function isWithinTimeWindow(
  timeStr: string, 
  preferredWindow: 'morning' | 'afternoon' | 'evening'
): boolean {
  const timeOfDay = getTimeOfDay(timeStr);
  return timeOfDay === preferredWindow;
}

/**
 * Add buffer time to a time slot
 */
export function addBufferToSlot(
  startTime: string, 
  endTime: string, 
  bufferMinutes: number,
  position: 'start' | 'end' | 'both' = 'both'
): { start: string; end: string } {
  const duration = calculateDuration(startTime, endTime);
  let newStart = startTime;
  let newEnd = endTime;
  
  switch (position) {
    case 'start':
      newStart = minutesToTime(timeToMinutes(startTime) - bufferMinutes);
      break;
    case 'end':
      newEnd = minutesToTime(timeToMinutes(endTime) + bufferMinutes);
      break;
    case 'both':
      newStart = minutesToTime(timeToMinutes(startTime) - bufferMinutes);
      newEnd = minutesToTime(timeToMinutes(endTime) + bufferMinutes);
      break;
  }
  
  return { start: newStart, end: newEnd };
}

/**
 * Validate time format (HH:MM)
 */
export function isValidTimeFormat(timeStr: string): boolean {
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(timeStr);
}

/**
 * Parse natural language time input
 */
export function parseNaturalTime(input: string): string | null {
  const cleaned = input.toLowerCase().trim();
  
  // Common patterns
  const patterns = [
    // 9:30am, 2pm, 14:30
    /^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i,
    // 9am, 2pm
    /^(\d{1,2})\s*(am|pm)$/i,
    // 09:30
    /^([01]?\d|2[0-3]):([0-5]\d)$/
  ];
  
  for (const pattern of patterns) {
    const match = cleaned.match(pattern);
    if (match) {
      let hours = parseInt(match[1]);
      const minutes = match[2] ? parseInt(match[2]) : 0;
      const ampm = match[3]?.toLowerCase();
      
      // Handle AM/PM
      if (ampm === 'pm' && hours !== 12) {
        hours += 12;
      } else if (ampm === 'am' && hours === 12) {
        hours = 0;
      }
      
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }
  }
  
  return null;
}

/**
 * Get human-readable time range
 */
export function formatTimeRange(startTime: string, endTime: string): string {
  const startFormatted = formatTimeForDisplay(startTime);
  const endFormatted = formatTimeForDisplay(endTime);
  return `${startFormatted} - ${endFormatted}`;
}

/**
 * Calculate total minutes in a day
 */
export function getDayTotalMinutes(): number {
  return 24 * 60;
}

/**
 * Check if time is within sleep hours
 */
export function isDuringSleep(
  timeStr: string, 
  sleepStart: string, 
  sleepEnd: string
): boolean {
  const timeMinutes = timeToMinutes(timeStr);
  const startMinutes = timeToMinutes(sleepStart);
  const endMinutes = timeToMinutes(sleepEnd);
  
  // Handle sleep crossing midnight
  if (startMinutes > endMinutes) {
    // Sleep: 23:00 - 07:00 (crosses midnight)
    return timeMinutes >= startMinutes || timeMinutes < endMinutes;
  } else {
    // Sleep: 07:00 - 23:00 (same day)
    return timeMinutes >= startMinutes && timeMinutes < endMinutes;
  }
}