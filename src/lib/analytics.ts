import { DataService } from './sync/DataService';
import { format, subDays } from 'date-fns';

export interface DailyStats {
    date: string;
    habitsCompleted: number;
    tasksCompleted: number;
    productivityScore: number;
    mood?: number;
    energy?: number;
}

export interface HabitStats {
    id: string;
    name: string;
    completionRate: number;
    currentStreak: number;
    totalCompletions: number;
}

export class AnalyticsServiceClass {
    async getDailyStats(days: number = 30): Promise<DailyStats[]> {
        const endDate = new Date();
        const startDate = subDays(endDate, days);

        // Format for DB query
        const startStr = format(startDate, 'yyyy-MM-dd');
        const endStr = format(endDate, 'yyyy-MM-dd');

        const history = await DataService.getHistoryInRange(startStr, endStr);

        // Create map of existing history
        const historyMap = new Map(history.map(h => [h.date, h]));

        // Generate array for all days in range (filling gaps with 0)
        const stats: DailyStats[] = [];
        for (let i = 0; i <= days; i++) {
            const date = subDays(endDate, days - i);
            const dateStr = format(date, 'yyyy-MM-dd');
            const entry = historyMap.get(dateStr);

            if (entry) {
                stats.push({
                    date: dateStr,
                    habitsCompleted: entry.completionStats.habitsCompleted,
                    tasksCompleted: entry.completionStats.tasksCompleted,
                    productivityScore: this.calculateProductivityScore(entry),
                    mood: entry.mood,
                    energy: entry.energy
                });
            } else {
                stats.push({
                    date: dateStr,
                    habitsCompleted: 0,
                    tasksCompleted: 0,
                    productivityScore: 0,
                });
            }
        }

        return stats;
    }

    async getHabitStats(): Promise<HabitStats[]> {
        const habits = await DataService.getAllHabits();
        const history = await DataService.getHistoryInRange(
            format(subDays(new Date(), 90), 'yyyy-MM-dd'),
            format(new Date(), 'yyyy-MM-dd')
        );

        return habits.map(habit => {
            let completions = 0;
            let currentStreak = 0;


            // Calculate stats from history (most recent first for streak)
            const sortedHistory = [...history].sort((a, b) => b.date.localeCompare(a.date));

            // Check streak
            const today = format(new Date(), 'yyyy-MM-dd');
            const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');

            // Find if completed today or yesterday to start streak
            const completedToday = sortedHistory.find(h => h.date === today)?.actualBlocks.some(b => b.sourceId === habit.id && b.completed);
            const completedYesterday = sortedHistory.find(h => h.date === yesterday)?.actualBlocks.some(b => b.sourceId === habit.id && b.completed);

            if (!completedToday && !completedYesterday) {
                // gap found
            }

            // Iterate through history for total completions
            history.forEach(day => {
                const isCompleted = day.actualBlocks.some(b => b.sourceId === habit.id && b.completed);
                if (isCompleted) completions++;
            });

            // Calculate streak loosely (checking last 30 days reverse) - simplified logic
            // Real streak logic needs to account for frequency, but for now simple consecutive days or matching frequency
            // Let's implement simple consecutive check for "daily" habits
            if (habit.frequency === 'daily') {
                const streakDate = completedToday ? new Date() : (completedYesterday ? subDays(new Date(), 1) : null);

                if (streakDate) {
                    currentStreak = 0;
                    // Count backwards
                    for (let i = 0; i < 365; i++) {
                        const d = subDays(streakDate, i);
                        const dStr = format(d, 'yyyy-MM-dd');
                        const entry = history.find(h => h.date === dStr);
                        const isDone = entry?.actualBlocks.some(b => b.sourceId === habit.id && b.completed);

                        if (isDone) {
                            currentStreak++;
                        } else {
                            break;
                        }
                    }
                }
            }

            return {
                id: habit.id,
                name: habit.name,
                completionRate: history.length > 0 ? Math.round((completions / history.length) * 100) : 0,
                totalCompletions: completions,
                currentStreak
            };
        });
    }

    private calculateProductivityScore(history: DayHistory): number {
        const { totalScheduled, totalCompleted } = history.completionStats;
        if (totalScheduled === 0) return 0;

        const completionRate = totalCompleted / totalScheduled;
        const moodFactor = history.mood ? (history.mood / 5) : 0.6; // Default to neutral if no mood

        // Score out of 100
        return Math.round((completionRate * 0.7 + moodFactor * 0.3) * 100);
    }
}

export const AnalyticsService = new AnalyticsServiceClass();
