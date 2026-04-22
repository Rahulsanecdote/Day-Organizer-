/**
 * Quest (XP) helpers.
 * XP is derived from completed blocks and does not affect scheduling.
 */

import type { ScheduledBlock } from '@/types';

export function hhmmToMinutes(hhmm: string): number {
    const [hours, minutes] = hhmm.split(':').map(value => parseInt(value, 10));
    return hours * 60 + minutes;
}

export function blockDurationMinutes(block: Pick<ScheduledBlock, 'start' | 'end'>): number {
    const start = hhmmToMinutes(block.start);
    const end = hhmmToMinutes(block.end);
    return Math.max(0, end - start);
}

/**
 * XP formula:
 * XP = round(durationMin * (1 + priority / 5))
 */
export function computeXP(durationMin: number, priority: number): number {
    const clampedPriority = Math.min(5, Math.max(1, priority));
    return Math.round(durationMin * (1 + clampedPriority / 5));
}
