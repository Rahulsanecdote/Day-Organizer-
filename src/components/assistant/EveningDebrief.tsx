'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { DatabaseService } from '@/lib/database';
import type { ScheduledBlock } from '@/types';
import { format } from 'date-fns';

export default function EveningDebrief() {
    const [isOpen, setIsOpen] = useState(false);
    const [incompleteItems, setIncompleteItems] = useState<ScheduledBlock[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);

    const checkDebrief = useCallback(async () => {
        const today = format(new Date(), 'yyyy-MM-dd');
        const plan = await DatabaseService.getPlan(today);
        if (!plan) return;

        // mock check items that are not completed (would require 'completed' status in plan, which might be in DB task/habit state)
        // For now assuming blocks themselves don't track completion perfectly without checking task state.
        // Let's fetch all tasks and check if they are done.

        // Simplification: just show tasks that were in the plan but are not marked 'isCompleted' in DB
        const tasks = await DatabaseService.getAllTasks();
        const planTaskIds = plan.blocks.filter(s => s.type === 'task' && s.sourceId).map(s => s.sourceId!);
        const incomplete = tasks.filter(t => planTaskIds.includes(t.id) && !t.isCompleted);

        // Map back to ScheduledBlock for display? Or just use Task items.
        // Let's use what we found.
        // If no incomplete items, maybe debrief is just "Good job!"

        // We construct a mock ScheduledBlock list for simplicity of UI re-use
        // Actually simpler to just list names.
        const incompleteBlocks = plan.blocks.filter(s => s.type === 'task' && s.sourceId && incomplete.find(t => t.id === s.sourceId));

        setIncompleteItems(incompleteBlocks);
        setIsOpen(true);
    }, []);

    useEffect(() => {
        // Trigger manually or via checking time/actions?
        // For V1, let's listen to a custom event 'assistant-trigger-debrief'
        const handleTrigger = () => checkDebrief();
        window.addEventListener('assistant-trigger-debrief', handleTrigger);
        return () => window.removeEventListener('assistant-trigger-debrief', handleTrigger);
    }, [checkDebrief]);

    const handleCloseDay = async () => {
        setIsProcessing(true);
        const today = format(new Date(), 'yyyy-MM-dd');

        // Save suggestions for tomorrow
        if (incompleteItems.length > 0) {
            // logic to create tomorrowSuggestion
            await DatabaseService.saveTomorrowSuggestion({
                id: `sugg-${today}`,
                date: today, // date of suggestion creation
                items: incompleteItems.map(i => ({
                    title: i.title,
                    reason: 'Incomplete from previous day',
                    sourceId: i.sourceId,
                    priority: 3
                })),
                createdAt: Date.now()
            });
        }

        setTimeout(() => {
            setIsProcessing(false);
            setIsOpen(false);
        }, 800);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-zinc-200 dark:border-zinc-800">
                <div className="p-6">
                    <h2 className="text-xl font-serif text-zinc-900 dark:text-zinc-100 mb-2">Daily Debrief</h2>

                    {incompleteItems.length === 0 ? (
                        <div className="text-center py-8">
                            <div className="text-4xl mb-4">🎉</div>
                            <h3 className="text-lg font-medium text-emerald-600">All Tasks Completed!</h3>
                            <p className="text-zinc-500 text-sm mt-2">You crushed it today. Rest well.</p>
                        </div>
                    ) : (
                        <div>
                            <p className="text-zinc-500 text-sm mb-4">You have {incompleteItems.length} incomplete tasks. We&apos;ll move them to suggestions for tomorrow.</p>
                            <div className="space-y-2 mb-6 max-h-48 overflow-y-auto">
                                {incompleteItems.map((item, idx) => (
                                    <div key={idx} className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                                        <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                                        <span className="text-sm text-zinc-700 dark:text-zinc-300">{item.title}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex gap-3 mt-4">
                        <button
                            onClick={() => setIsOpen(false)}
                            className="flex-1 py-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleCloseDay}
                            disabled={isProcessing}
                            className="flex-1 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg font-medium hover:opacity-90 transition-opacity"
                        >
                            {isProcessing ? 'Saving...' : 'End Day'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
