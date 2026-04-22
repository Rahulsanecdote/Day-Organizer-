/**
 * Quest (XP) helpers — local-only gamification.
 * XP is derived from completed blocks and never affects scheduling.
 */

import type { ScheduledBlock } from '@/types';

export function hhmmToMinutes(hhmm: string): number {
    const [h, m] = hhmm.split(':').map(n => parseInt(n, 10));
    return h * 60 + m;
}

export function blockDurationMinutes(block: Pick<ScheduledBlock, 'start' | 'end'>): number {
    const start = hhmmToMinutes(block.start);
    const end = hhmmToMinutes(block.end);
    return Math.max(0, end - start);
}

/**
 * XP formula (simple + stable):
 * XP = round(durationMin * (1 + priority/5))
 */
export function computeXP(durationMin: number, priority: number): number {
    const p = Math.min(5, Math.max(1, priority));
    return Math.round(durationMin * (1 + p / 5));
}
