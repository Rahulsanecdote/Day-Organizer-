'use client';

import { useState, useEffect, useCallback } from 'react';
import { format, subDays, startOfWeek } from 'date-fns';
import { DataService } from '@/lib/sync/DataService';
import { DatabaseService } from '@/lib/database';
import { DayHistory, PlanOutput } from '@/types';

export default function HistoryPage() {
  const [history, setHistory] = useState<DayHistory[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'all'>('week');
  const [isLoading, setIsLoading] = useState(true);
  const [weeklyStats, setWeeklyStats] = useState({
    totalDays: 0,
    avgHabitsCompleted: 0,
    avgTasksCompleted: 0,
    totalGymMinutes: 0,
    bestStreak: 0,
    currentStreak: 0,
  });

  const calculateBestStreak = useCallback((historyData: DayHistory[]): number => {
    let maxStreak = 0;
    let currentStreak = 0;

    // Sort by date
    const sortedData = [...historyData].sort((a, b) => a.date.localeCompare(b.date));

    for (const day of sortedData) {
      const completionRate = day.completionStats.totalCompleted / Math.max(day.completionStats.totalScheduled, 1);

      if (completionRate >= 0.8) { // 80% completion threshold
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    }

    return maxStreak;
  }, []);

  const calculateCurrentStreak = useCallback((historyData: DayHistory[]): number => {
    let streak = 0;
    const sortedData = [...historyData].sort((a, b) => b.date.localeCompare(a.date)); // Most recent first

    for (const day of sortedData) {
      const completionRate = day.completionStats.totalCompleted / Math.max(day.completionStats.totalScheduled, 1);

      if (completionRate >= 0.8) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  }, []);

  const calculateWeeklyStats = useCallback((historyData: DayHistory[], plansData: PlanOutput[]) => {
    if (historyData.length === 0) return;

    const totalDays = historyData.length;
    const totalHabits = historyData.reduce((sum, day) => sum + day.completionStats.habitsCompleted, 0);
    const totalTasks = historyData.reduce((sum, day) => sum + day.completionStats.tasksCompleted, 0);

    // Calculate gym minutes from plans
    let totalGymMinutes = 0;
    plansData.forEach(plan => {
      totalGymMinutes += plan.stats.gymMinutes;
    });

    setWeeklyStats({
      totalDays,
      avgHabitsCompleted: Math.round((totalHabits / totalDays) * 10) / 10,
      avgTasksCompleted: Math.round((totalTasks / totalDays) * 10) / 10,
      totalGymMinutes,
      bestStreak: calculateBestStreak(historyData),
      currentStreak: calculateCurrentStreak(historyData),
    });
  }, [calculateBestStreak, calculateCurrentStreak]);

  const loadHistory = useCallback(async () => {
    setIsLoading(true);
    try {
      const endDate = format(new Date(), 'yyyy-MM-dd');
      let startDate: string;

      switch (selectedPeriod) {
        case 'week':
          startDate = format(startOfWeek(new Date()), 'yyyy-MM-dd');
          break;
        case 'month':
          startDate = format(subDays(new Date(), 30), 'yyyy-MM-dd');
          break;
        default:
          startDate = format(subDays(new Date(), 365), 'yyyy-MM-dd');
      }

      const historyData = await DatabaseService.getHistoryInRange(startDate, endDate);
      const plansData = await DatabaseService.getPlansInRange(startDate, endDate);

      setHistory(historyData.sort((a, b) => b.date.localeCompare(a.date)));
      calculateWeeklyStats(historyData, plansData);
    } finally {
      setIsLoading(false);
    }
  }, [selectedPeriod, calculateWeeklyStats]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const getCompletionRate = (day: DayHistory): number => {
    if (day.completionStats.totalScheduled === 0) return 0;
    return Math.round((day.completionStats.totalCompleted / day.completionStats.totalScheduled) * 100);
  };

  const getCompletionStyle = (rate: number): { bg: string; color: string } => {
    if (rate >= 90) return { bg: 'rgba(139, 159, 130, 0.15)', color: 'var(--color-gym)' };
    if (rate >= 80) return { bg: 'rgba(122, 158, 159, 0.15)', color: 'var(--color-work)' };
    if (rate >= 70) return { bg: 'rgba(196, 163, 90, 0.15)', color: 'var(--color-task)' };
    if (rate >= 60) return { bg: 'rgba(201, 150, 126, 0.15)', color: 'var(--color-meal)' };
    return { bg: 'rgba(201, 100, 100, 0.15)', color: '#c96464' };
  };

  const exportHistory = async () => {
    const data = await DatabaseService.exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `daily-organization-history-${format(new Date(), 'yyyy-MM-dd')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Skeleton Header */}
        <div
          className="rounded-xl p-6 animate-pulse"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
        >
          <div className="h-8 w-48 rounded" style={{ background: 'var(--color-ivory)' }} />
          <div className="h-4 w-64 rounded mt-2" style={{ background: 'var(--color-ivory)' }} />
        </div>
        {/* Skeleton Period Selector */}
        <div
          className="rounded-xl p-4 animate-pulse"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
        >
          <div className="flex space-x-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 w-28 rounded-lg" style={{ background: 'var(--color-ivory)' }} />
            ))}
          </div>
        </div>
        {/* Skeleton Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="rounded-xl p-6 animate-pulse"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
            >
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-full" style={{ background: 'var(--color-ivory)' }} />
                <div className="ml-4">
                  <div className="h-3 w-20 rounded mb-2" style={{ background: 'var(--color-ivory)' }} />
                  <div className="h-6 w-12 rounded" style={{ background: 'var(--color-ivory)' }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div
        className="rounded-xl p-6"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-soft)' }}
      >
        <div className="flex justify-between items-center">
          <div>
            <h1
              className="text-2xl mb-2"
              style={{ fontFamily: 'var(--font-serif)', fontWeight: 500, color: 'var(--color-charcoal)' }}
            >
              History & Analytics
            </h1>
            <p style={{ color: 'var(--color-slate)' }}>
              Track your daily planning performance and identify patterns.
            </p>
          </div>
          <button
            onClick={exportHistory}
            className="px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200"
            style={{
              background: 'linear-gradient(135deg, var(--color-gym) 0%, #6B8F70 100%)',
              color: 'white',
              boxShadow: '0 2px 8px rgba(139, 159, 130, 0.3)'
            }}
          >
            Export Data
          </button>
        </div>
      </div>

      {/* Period Selector */}
      <div
        className="rounded-xl p-4"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-soft)' }}
      >
        <div className="flex space-x-4">
          {[
            { key: 'week', label: 'This Week' },
            { key: 'month', label: 'Last 30 Days' },
            { key: 'all', label: 'All Time' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setSelectedPeriod(key as typeof selectedPeriod)}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
              style={{
                background: selectedPeriod === key ? 'var(--color-ivory)' : 'transparent',
                color: selectedPeriod === key ? 'var(--color-charcoal)' : 'var(--color-mist)',
                border: `1px solid ${selectedPeriod === key ? 'var(--color-gold-light)' : 'transparent'}`
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Weekly Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div
          className="rounded-xl p-6"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-soft)' }}
        >
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(122, 158, 159, 0.1)', color: 'var(--color-work)' }}
              >
                <span className="text-lg">📊</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium" style={{ color: 'var(--color-mist)' }}>Days Tracked</p>
              <p className="text-2xl font-semibold" style={{ color: 'var(--color-charcoal)' }}>{weeklyStats.totalDays}</p>
            </div>
          </div>
        </div>

        <div
          className="rounded-xl p-6"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-soft)' }}
        >
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(155, 138, 160, 0.1)', color: 'var(--color-habit)' }}
              >
                <span className="text-lg">🔄</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium" style={{ color: 'var(--color-mist)' }}>Avg Habits/Day</p>
              <p className="text-2xl font-semibold" style={{ color: 'var(--color-charcoal)' }}>{weeklyStats.avgHabitsCompleted}</p>
            </div>
          </div>
        </div>

        <div
          className="rounded-xl p-6"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-soft)' }}
        >
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(196, 163, 90, 0.1)', color: 'var(--color-task)' }}
              >
                <span className="text-lg">✅</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium" style={{ color: 'var(--color-mist)' }}>Avg Tasks/Day</p>
              <p className="text-2xl font-semibold" style={{ color: 'var(--color-charcoal)' }}>{weeklyStats.avgTasksCompleted}</p>
            </div>
          </div>
        </div>

        <div
          className="rounded-xl p-6"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-soft)' }}
        >
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(139, 159, 130, 0.1)', color: 'var(--color-gym)' }}
              >
                <span className="text-lg">💪</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium" style={{ color: 'var(--color-mist)' }}>Total Gym Time</p>
              <p className="text-2xl font-semibold" style={{ color: 'var(--color-charcoal)' }}>{weeklyStats.totalGymMinutes}m</p>
            </div>
          </div>
        </div>

        <div
          className="rounded-xl p-6"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-soft)' }}
        >
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(201, 150, 126, 0.1)', color: 'var(--color-meal)' }}
              >
                <span className="text-lg">🔥</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium" style={{ color: 'var(--color-mist)' }}>Current Streak</p>
              <p className="text-2xl font-semibold" style={{ color: 'var(--color-charcoal)' }}>{weeklyStats.currentStreak} days</p>
            </div>
          </div>
        </div>

        <div
          className="rounded-xl p-6"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-soft)' }}
        >
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(184, 151, 107, 0.1)', color: 'var(--color-gold)' }}
              >
                <span className="text-lg">🏆</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium" style={{ color: 'var(--color-mist)' }}>Best Streak</p>
              <p className="text-2xl font-semibold" style={{ color: 'var(--color-charcoal)' }}>{weeklyStats.bestStreak} days</p>
            </div>
          </div>
        </div>
      </div>

      {/* History List */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-soft)' }}
      >
        <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--color-charcoal)' }}>Daily History</h2>
        </div>

        {history.length > 0 ? (
          <div>
            {history.map((day, index) => {
              const completionRate = getCompletionRate(day);
              const completionStyle = getCompletionStyle(completionRate);
              return (
                <div
                  key={day.date}
                  className="p-6"
                  style={{ borderBottom: index < history.length - 1 ? '1px solid var(--color-border-light)' : 'none' }}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-4 mb-3">
                        <h3 className="text-lg font-medium" style={{ color: 'var(--color-charcoal)' }}>
                          {format(new Date(day.date), 'EEEE, MMMM d')}
                        </h3>
                        <span
                          className="px-3 py-1 rounded-full text-sm font-medium"
                          style={{ background: completionStyle.bg, color: completionStyle.color }}
                        >
                          {completionRate}% Complete
                        </span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span style={{ color: 'var(--color-mist)' }}>Habits:</span>
                          <span className="ml-2 font-medium" style={{ color: 'var(--color-stone)' }}>{day.completionStats.habitsCompleted}</span>
                        </div>
                        <div>
                          <span style={{ color: 'var(--color-mist)' }}>Tasks:</span>
                          <span className="ml-2 font-medium" style={{ color: 'var(--color-stone)' }}>{day.completionStats.tasksCompleted}</span>
                        </div>
                        <div>
                          <span style={{ color: 'var(--color-mist)' }}>Completed:</span>
                          <span className="ml-2 font-medium" style={{ color: 'var(--color-stone)' }}>
                            {day.completionStats.totalCompleted}/{day.completionStats.totalScheduled}
                          </span>
                        </div>
                        <div>
                          <span style={{ color: 'var(--color-mist)' }}>Success Rate:</span>
                          <span className="ml-2 font-medium" style={{ color: 'var(--color-stone)' }}>
                            {Math.round((day.completionStats.totalCompleted / Math.max(day.completionStats.totalScheduled, 1)) * 100)}%
                          </span>
                        </div>
                      </div>

                      {day.notes && (
                        <div
                          className="mt-3 p-3 rounded-lg"
                          style={{ background: 'var(--color-ivory)' }}
                        >
                          <p className="text-sm" style={{ color: 'var(--color-slate)' }}>{day.notes}</p>
                        </div>
                      )}

                      {(day.mood || day.energy) && (
                        <div className="flex space-x-4 mt-3 text-sm" style={{ color: 'var(--color-stone)' }}>
                          {day.mood && (
                            <div className="flex items-center space-x-1">
                              <span>😊</span>
                              <span>Mood: {day.mood}/5</span>
                            </div>
                          )}
                          {day.energy && (
                            <div className="flex items-center space-x-1">
                              <span>⚡</span>
                              <span>Energy: {day.energy}/5</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-12 text-center">
            <div
              className="w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center"
              style={{ background: 'var(--color-ivory)', color: 'var(--color-gold)' }}
            >
              <span className="text-3xl">📊</span>
            </div>
            <h3
              className="text-lg mb-2"
              style={{ fontFamily: 'var(--font-serif)', fontWeight: 500, color: 'var(--color-charcoal)' }}
            >
              No history data yet
            </h3>
            <p style={{ color: 'var(--color-slate)' }}>
              Start using the daily planner to build your history and see insights.
            </p>
          </div>
        )}
      </div>

      {/* Insights Section */}
      {history.length > 0 && (
        <div
          className="rounded-xl p-6"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-soft)' }}
        >
          <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-charcoal)' }}>Insights & Recommendations</h2>

          <div className="space-y-4">
            {weeklyStats.currentStreak === 0 && (
              <div
                className="p-4 rounded-lg"
                style={{ background: 'rgba(122, 158, 159, 0.1)', border: '1px solid rgba(122, 158, 159, 0.2)' }}
              >
                <div className="flex items-start">
                  <span style={{ color: 'var(--color-work)' }} className="mr-3">💡</span>
                  <div>
                    <h4 className="font-medium" style={{ color: 'var(--color-charcoal)' }}>Start a New Streak</h4>
                    <p className="text-sm" style={{ color: 'var(--color-slate)' }}>
                      Complete 80% or more of your scheduled items today to start a new streak!
                    </p>
                  </div>
                </div>
              </div>
            )}

            {weeklyStats.avgHabitsCompleted < 3 && (
              <div
                className="p-4 rounded-lg"
                style={{ background: 'rgba(196, 163, 90, 0.1)', border: '1px solid rgba(196, 163, 90, 0.2)' }}
              >
                <div className="flex items-start">
                  <span style={{ color: 'var(--color-task)' }} className="mr-3">⚠️</span>
                  <div>
                    <h4 className="font-medium" style={{ color: 'var(--color-charcoal)' }}>Low Habit Completion</h4>
                    <p className="text-sm" style={{ color: 'var(--color-slate)' }}>
                      You&apos;re completing an average of {weeklyStats.avgHabitsCompleted} habits per day.
                      Consider adjusting habit frequency or duration for better consistency.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {weeklyStats.avgTasksCompleted < 2 && (
              <div
                className="p-4 rounded-lg"
                style={{ background: 'rgba(201, 150, 126, 0.1)', border: '1px solid rgba(201, 150, 126, 0.2)' }}
              >
                <div className="flex items-start">
                  <span style={{ color: 'var(--color-meal)' }} className="mr-3">🎯</span>
                  <div>
                    <h4 className="font-medium" style={{ color: 'var(--color-charcoal)' }}>Task Completion Opportunity</h4>
                    <p className="text-sm" style={{ color: 'var(--color-slate)' }}>
                      You&apos;re completing an average of {weeklyStats.avgTasksCompleted} tasks per day.
                      Try breaking larger tasks into smaller, more manageable chunks.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {weeklyStats.totalGymMinutes < 120 && (
              <div
                className="p-4 rounded-lg"
                style={{ background: 'rgba(139, 159, 130, 0.1)', border: '1px solid rgba(139, 159, 130, 0.2)' }}
              >
                <div className="flex items-start">
                  <span style={{ color: 'var(--color-gym)' }} className="mr-3">💪</span>
                  <div>
                    <h4 className="font-medium" style={{ color: 'var(--color-charcoal)' }}>Gym Time Tracking</h4>
                    <p className="text-sm" style={{ color: 'var(--color-slate)' }}>
                      You&apos;ve logged {weeklyStats.totalGymMinutes} minutes of gym time this period.
                      Consider setting up regular gym sessions for better health tracking.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}