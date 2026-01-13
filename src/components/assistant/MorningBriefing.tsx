'use client';

import React, { useEffect, useState } from 'react';
import { DatabaseService } from '@/lib/database';
import { PlanOutput } from '@/types';
import { format } from 'date-fns';

export default function MorningBriefing() {
    const [isOpen, setIsOpen] = useState(false);
    const [plan, setPlan] = useState<PlanOutput | null>(null);

    useEffect(() => {
        checkBriefing();
    }, []);

    const checkBriefing = async () => {
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
        }
    };

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
                    <h2 className="text-2xl font-serif text-zinc-900 dark:text-zinc-100 mb-2">Good Morning</h2>
                    <p className="text-zinc-500 text-sm mb-6">Here is your customized plan for the day.</p>

                    <div className="space-y-4">
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

                    <button
                        onClick={handleDismiss}
                        className="w-full mt-8 py-3 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg font-medium hover:opacity-90 transition-opacity"
                    >
                        Let's Go
                    </button>
                </div>
            </div>
        </div>
    );
}
