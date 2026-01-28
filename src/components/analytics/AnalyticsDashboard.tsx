'use client';

import { useState, useEffect } from 'react';
import HabitChart from '@/components/analytics/HabitChart';
import ProductivityTrend from '@/components/analytics/ProductivityTrend';
import StatCard from '@/components/analytics/StatCard';
import EnergyLevelChart from '@/components/analytics/EnergyLevelChart';
import { AnalyticsService, DailyStats, HabitStats } from '@/lib/analytics';

export default function AnalyticsDashboard() {
    const [loading, setLoading] = useState(true);
    const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
    const [habitStats, setHabitStats] = useState<HabitStats[]>([]);

    useEffect(() => {
        async function loadData() {
            try {
                const [daily, habits] = await Promise.all([
                    AnalyticsService.getDailyStats(30),
                    AnalyticsService.getHabitStats()
                ]);
                setDailyStats(daily);
                setHabitStats(habits);
            } catch (error) {
                console.error('Failed to load analytics:', error);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, []);

    if (loading) {
        return (
            <div className="h-96 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    // Calculate high-level metrics
    const avgProductivity = Math.round(dailyStats.reduce((acc, curr) => acc + curr.productivityScore, 0) / (dailyStats.length || 1));
    const totalTasks = dailyStats.reduce((acc, curr) => acc + curr.tasksCompleted, 0);
    const bestStreak = Math.max(...habitStats.map(h => h.currentStreak), 0);

    return (
        <div className="space-y-8 max-w-6xl mx-auto">
            {/* Header */}
            <div>
                <h1
                    className="text-3xl mb-2"
                    style={{ fontFamily: 'var(--font-serif)', color: 'var(--color-charcoal)' }}
                >
                    Analytics & Insights
                </h1>
                <p style={{ color: 'var(--color-slate)' }}>Your productivity trends over the last 30 days.</p>
            </div>

            {/* Primary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard
                    label="Avg. Productivity"
                    value={`${avgProductivity}%`}
                    icon={
                        <svg className="w-6 h-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    }
                />
                <StatCard
                    label="Tasks Completed"
                    value={totalTasks}
                    icon={
                        <svg className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 01 18 0z" />
                        </svg>
                    }
                />
                <StatCard
                    label="Best Habit Streak"
                    value={`${bestStreak} days`}
                    icon={
                        <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
                        </svg>
                    }
                />
            </div>

            {/* Main Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Trend Chart */}
                <div
                    className="rounded-xl p-8"
                    style={{
                        background: 'var(--color-surface)',
                        border: '1px solid var(--color-border)',
                        boxShadow: 'var(--shadow-soft)'
                    }}
                >
                    <h3 className="text-lg font-medium mb-6" style={{ color: 'var(--color-charcoal)' }}>Productivity Trend</h3>
                    <ProductivityTrend data={dailyStats} />
                </div>

                {/* Energy Chart */}
                <div
                    className="rounded-xl p-8"
                    style={{
                        background: 'var(--color-surface)',
                        border: '1px solid var(--color-border)',
                        boxShadow: 'var(--shadow-soft)'
                    }}
                >
                    <h3 className="text-lg font-medium mb-6" style={{ color: 'var(--color-charcoal)' }}>Energy vs Productivity</h3>
                    <EnergyLevelChart data={dailyStats} />
                </div>

                {/* Habit Chart (Full Width) */}
                <div
                    className="rounded-xl p-8 lg:col-span-2"
                    style={{
                        background: 'var(--color-surface)',
                        border: '1px solid var(--color-border)',
                        boxShadow: 'var(--shadow-soft)'
                    }}
                >
                    <h3 className="text-lg font-medium mb-6" style={{ color: 'var(--color-charcoal)' }}>Top Performing Habits</h3>
                    <HabitChart data={habitStats} />
                </div>
            </div>
        </div>
    );
}
