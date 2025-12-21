'use client';

import { useState, useEffect } from 'react';
import { format, subDays, startOfWeek, endOfWeek } from 'date-fns';
import { DatabaseService } from '@/lib/database';
import { DayHistory, PlanOutput } from '@/types';

export default function HistoryPage() {
  const [history, setHistory] = useState<DayHistory[]>([]);
  const [plans, setPlans] = useState<PlanOutput[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'all'>('week');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [weeklyStats, setWeeklyStats] = useState({
    totalDays: 0,
    avgHabitsCompleted: 0,
    avgTasksCompleted: 0,
    totalGymMinutes: 0,
    bestStreak: 0,
    currentStreak: 0,
  });

  useEffect(() => {
    loadHistory();
  }, [selectedPeriod]);

  const loadHistory = async () => {
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
    setPlans(plansData.sort((a, b) => b.date.localeCompare(a.date)));
    calculateWeeklyStats(historyData);
  };

  const calculateWeeklyStats = (historyData: DayHistory[]) => {
    if (historyData.length === 0) return;

    const totalDays = historyData.length;
    const totalHabits = historyData.reduce((sum, day) => sum + day.completionStats.habitsCompleted, 0);
    const totalTasks = historyData.reduce((sum, day) => sum + day.completionStats.tasksCompleted, 0);
    
    // Calculate gym minutes from plans
    let totalGymMinutes = 0;
    plans.forEach(plan => {
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
  };

  const calculateBestStreak = (historyData: DayHistory[]): number => {
    let maxStreak = 0;
    let currentStreak = 0;

    // Sort by date
    const sortedData = historyData.sort((a, b) => a.date.localeCompare(b.date));

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
  };

  const calculateCurrentStreak = (historyData: DayHistory[]): number => {
    let streak = 0;
    const sortedData = historyData.sort((a, b) => b.date.localeCompare(a.date)); // Most recent first

    for (const day of sortedData) {
      const completionRate = day.completionStats.totalCompleted / Math.max(day.completionStats.totalScheduled, 1);
      
      if (completionRate >= 0.8) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  };

  const getCompletionRate = (day: DayHistory): number => {
    if (day.completionStats.totalScheduled === 0) return 0;
    return Math.round((day.completionStats.totalCompleted / day.completionStats.totalScheduled) * 100);
  };

  const getCompletionColor = (rate: number): string => {
    if (rate >= 90) return 'text-green-600 bg-green-50';
    if (rate >= 80) return 'text-blue-600 bg-blue-50';
    if (rate >= 70) return 'text-yellow-600 bg-yellow-50';
    if (rate >= 60) return 'text-orange-600 bg-orange-50';
    return 'text-red-600 bg-red-50';
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

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">History & Analytics</h1>
            <p className="text-gray-600">
              Track your daily planning performance and identify patterns.
            </p>
          </div>
          <button
            onClick={exportHistory}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            Export Data
          </button>
        </div>
      </div>

      {/* Period Selector */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex space-x-4">
          {[
            { key: 'week', label: 'This Week' },
            { key: 'month', label: 'Last 30 Days' },
            { key: 'all', label: 'All Time' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setSelectedPeriod(key as typeof selectedPeriod)}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                selectedPeriod === key
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Weekly Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-semibold">📊</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Days Tracked</p>
              <p className="text-2xl font-semibold text-gray-900">{weeklyStats.totalDays}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                <span className="text-purple-600 font-semibold">🔄</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg Habits/Day</p>
              <p className="text-2xl font-semibold text-gray-900">{weeklyStats.avgHabitsCompleted}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                <span className="text-yellow-600 font-semibold">✅</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg Tasks/Day</p>
              <p className="text-2xl font-semibold text-gray-900">{weeklyStats.avgTasksCompleted}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-green-600 font-semibold">💪</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Gym Time</p>
              <p className="text-2xl font-semibold text-gray-900">{weeklyStats.totalGymMinutes}m</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                <span className="text-orange-600 font-semibold">🔥</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Current Streak</p>
              <p className="text-2xl font-semibold text-gray-900">{weeklyStats.currentStreak} days</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                <span className="text-red-600 font-semibold">🏆</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Best Streak</p>
              <p className="text-2xl font-semibold text-gray-900">{weeklyStats.bestStreak} days</p>
            </div>
          </div>
        </div>
      </div>

      {/* History List */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Daily History</h2>
        </div>
        
        {history.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {history.map((day) => (
              <div key={day.date} className="p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-4 mb-3">
                      <h3 className="text-lg font-medium text-gray-900">
                        {format(new Date(day.date), 'EEEE, MMMM d')}
                      </h3>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getCompletionColor(getCompletionRate(day))}`}>
                        {getCompletionRate(day)}% Complete
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Habits:</span>
                        <span className="ml-2 font-medium">{day.completionStats.habitsCompleted}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Tasks:</span>
                        <span className="ml-2 font-medium">{day.completionStats.tasksCompleted}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Completed:</span>
                        <span className="ml-2 font-medium">
                          {day.completionStats.totalCompleted}/{day.completionStats.totalScheduled}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Success Rate:</span>
                        <span className="ml-2 font-medium">
                          {Math.round((day.completionStats.totalCompleted / Math.max(day.completionStats.totalScheduled, 1)) * 100)}%
                        </span>
                      </div>
                    </div>

                    {day.notes && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-md">
                        <p className="text-sm text-gray-700">{day.notes}</p>
                      </div>
                    )}

                    {(day.mood || day.energy) && (
                      <div className="flex space-x-4 mt-3 text-sm">
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
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No history data yet</h3>
            <p className="text-gray-600">
              Start using the daily planner to build your history and see insights.
            </p>
          </div>
        )}
      </div>

      {/* Insights Section */}
      {history.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Insights & Recommendations</h2>
          
          <div className="space-y-4">
            {weeklyStats.currentStreak === 0 && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                <div className="flex items-start">
                  <span className="text-blue-600 mr-3">💡</span>
                  <div>
                    <h4 className="font-medium text-blue-900">Start a New Streak</h4>
                    <p className="text-sm text-blue-700">
                      Complete 80% or more of your scheduled items today to start a new streak!
                    </p>
                  </div>
                </div>
              </div>
            )}

            {weeklyStats.avgHabitsCompleted < 3 && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                <div className="flex items-start">
                  <span className="text-yellow-600 mr-3">⚠️</span>
                  <div>
                    <h4 className="font-medium text-yellow-900">Low Habit Completion</h4>
                    <p className="text-sm text-yellow-700">
                      You're completing an average of {weeklyStats.avgHabitsCompleted} habits per day. 
                      Consider adjusting habit frequency or duration for better consistency.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {weeklyStats.avgTasksCompleted < 2 && (
              <div className="p-4 bg-orange-50 border border-orange-200 rounded-md">
                <div className="flex items-start">
                  <span className="text-orange-600 mr-3">🎯</span>
                  <div>
                    <h4 className="font-medium text-orange-900">Task Completion Opportunity</h4>
                    <p className="text-sm text-orange-700">
                      You're completing an average of {weeklyStats.avgTasksCompleted} tasks per day. 
                      Try breaking larger tasks into smaller, more manageable chunks.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {weeklyStats.totalGymMinutes < 120 && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                <div className="flex items-start">
                  <span className="text-green-600 mr-3">💪</span>
                  <div>
                    <h4 className="font-medium text-green-900">Gym Time Tracking</h4>
                    <p className="text-sm text-green-700">
                      You've logged {weeklyStats.totalGymMinutes} minutes of gym time this period. 
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