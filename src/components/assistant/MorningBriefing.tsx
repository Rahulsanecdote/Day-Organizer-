'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { DatabaseService } from '@/lib/database';
import { generateMorningBriefing, AIBriefingResult } from '@/lib/assistant/briefing-ai';
import type { PlanOutput } from '@/types';
import { format } from 'date-fns';

export default function MorningBriefing() {
    const [isOpen, setIsOpen] = useState(false);
    const [plan, setPlan] = useState<PlanOutput | null>(null);
    const [aiBriefing, setAiBriefing] = useState<AIBriefingResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const checkBriefing = useCallback(async () => {
        // Logic: If it's morning (e.g. before noon) and we haven't shown briefing for today
        // checking local storage for "briefing_shown_DATE"
        const today = format(new Date(), 'yyyy-MM-dd');
        const shownKey = `briefing_shown_${today}`;
        const shown = localStorage.getItem(shownKey);

        if (shown) return;

        // Load plan
        const todayPlan = await DatabaseService.getPlan(today);
        if (todayPlan) {
            setPlan(todayPlan);
            setIsOpen(true);
            setIsLoading(true);

            // Generate AI briefing in the background
            try {
                const habits = await DatabaseService.getAllHabits();
                const tasks = await DatabaseService.getAllTasks();
                const currentTime = format(new Date(), 'HH:mm');

                const briefing = await generateMorningBriefing({
                    plan: todayPlan,
                    habits,
                    tasks,
                    currentTime
                });

                if (briefing) {
                    setAiBriefing(briefing);
                }
            } catch (error) {
                console.error('Failed to generate AI briefing:', error);
            } finally {
                setIsLoading(false);
            }
        }
    }, []);

    useEffect(() => {

        checkBriefing();
    }, [checkBriefing]);

    const handleDismiss = () => {
        const today = format(new Date(), 'yyyy-MM-dd');
        localStorage.setItem(`briefing_shown_${today}`, 'true');
        setIsOpen(false);
    };

    if (!isOpen || !plan) return null;

    const totalTasks = plan.blocks.filter(s => s.type === 'task').length;
    const totalHabits = plan.blocks.filter(s => s.type === 'habit').length;
    const gymBlock = plan.blocks.find(s => s.title.toLowerCase().includes('gym') || s.title.toLowerCase().includes('workout'));

    return (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 border border-zinc-200 dark:border-zinc-800">
                <div className="p-6">
                    {/* AI Greeting or Default */}
                    <h2 className="text-2xl font-serif text-zinc-900 dark:text-zinc-100 mb-2">
                        {aiBriefing?.greeting || 'Good Morning'}
                    </h2>

                    {/* AI Summary */}
                    {aiBriefing?.summary ? (
                        <p className="text-zinc-600 dark:text-zinc-400 text-sm mb-4">
                            {aiBriefing.summary}
                        </p>
                    ) : (
                        <p className="text-zinc-500 text-sm mb-4">
                            Here is your customized plan for the day.
                        </p>
                    )}

                    {/* AI Top Priority */}
                    {aiBriefing?.topPriority && (
                        <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl mb-4">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-purple-600 dark:text-purple-400">⭐</span>
                                <span className="text-xs font-medium text-purple-600 dark:text-purple-400 uppercase tracking-wide">Top Priority</span>
                            </div>
                            <p className="text-sm text-zinc-800 dark:text-zinc-200">{aiBriefing.topPriority}</p>
                        </div>
                    )}

                    <div className="space-y-3">
                        {/* Tasks Count */}
                        <div className="flex items-center justify-between p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/40 rounded-lg text-indigo-600 dark:text-indigo-400">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                                </div>
                                <div>
                                    <div className="font-medium text-zinc-900 dark:text-zinc-100">{totalTasks} Tasks Scheduled</div>
                                    <div className="text-xs text-zinc-500">Focus Mode Ready</div>
                                </div>
                            </div>
                        </div>

                        {/* Habits Count */}
                        <div className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-emerald-100 dark:bg-emerald-900/40 rounded-lg text-emerald-600 dark:text-emerald-400">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0Z" /></svg>
                                </div>
                                <div>
                                    <div className="font-medium text-zinc-900 dark:text-zinc-100">{totalHabits} Habits to Build</div>
                                    <div className="text-xs text-zinc-500">Keep the streak alive</div>
                                </div>
                            </div>
                        </div>

                        {/* Gym Block */}
                        {gymBlock && (
                            <div className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-amber-100 dark:bg-amber-900/40 rounded-lg text-amber-600 dark:text-amber-400">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
                                    </div>
                                    <div>
                                        <div className="font-medium text-zinc-900 dark:text-zinc-100">Gym at {gymBlock.start}</div>
                                        <div className="text-xs text-zinc-500">Time to sweat</div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* AI Motivation */}
                    {aiBriefing?.motivation && (
                        <div className="mt-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl">
                            <p className="text-sm text-zinc-700 dark:text-zinc-300 italic">
                                &ldquo;{aiBriefing.motivation}&rdquo;
                            </p>
                        </div>
                    )}

                    {/* AI Tip */}
                    {aiBriefing?.tip && (
                        <div className="mt-3 flex items-start gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                            <span>💡</span>
                            <span>{aiBriefing.tip}</span>
                        </div>
                    )}

                    {/* Loading indicator */}
                    {isLoading && !aiBriefing && (
                        <div className="mt-4 flex items-center justify-center gap-2 text-sm text-zinc-400">
                            <div className="w-4 h-4 border-2 border-zinc-300 border-t-indigo-500 rounded-full animate-spin" />
                            <span>Generating AI insights...</span>
                        </div>
                    )}

                    <button
                        onClick={handleDismiss}
                        className="w-full mt-6 py-3 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg font-medium hover:opacity-90 transition-opacity"
                    >
                        Let&apos;s Go
                    </button>
                </div>
            </div>
        </div>
    );
}
