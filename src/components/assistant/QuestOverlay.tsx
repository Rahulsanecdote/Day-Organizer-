'use client';

import React, { useEffect, useState } from 'react';
import { DatabaseService } from '@/lib/database';
import { QuestStats } from '@/types';
import { format } from 'date-fns';

export default function QuestOverlay() {
    const [enabled, setEnabled] = useState(false);
    const [stats, setStats] = useState<QuestStats | null>(null);

    useEffect(() => {
        checkEnabled();
        // Poll for updates every minute or on visibility change
        const interval = setInterval(() => {
            checkEnabled();
        }, 10000);
        return () => clearInterval(interval);
    }, []);

    const checkEnabled = async () => {
        const isEnabled = await DatabaseService.getFeatureFlag('enableQuestMode');
        setEnabled(isEnabled);
        if (isEnabled) {
            const today = format(new Date(), 'yyyy-MM-dd');
            let dailyStats = await DatabaseService.getQuestStats(today);

            if (!dailyStats) {
                // Mock data or fetch history to calculate mock streak
                // simplified: 0 XP
                dailyStats = {
                    id: today,
                    date: today,
                    xp: 0,
                    streak: 1, // Start at 1 for positivity? Or 0.
                    completedCount: 0
                };
            }
            setStats(dailyStats);
        }
    };

    if (!enabled || !stats) return null;

    return (
        <div className="fixed bottom-6 right-6 z-30 animate-in slide-in-from-bottom duration-500">
            <div className="bg-gradient-to-tr from-violet-600 to-indigo-600 rounded-lg shadow-lg p-3 text-white flex items-center gap-4">
                <div>
                    <div className="text-xs font-medium text-white/80 uppercase tracking-wider">Rank E-Hunter</div>
                    <div className="flex items-baseline gap-1">
                        <span className="text-lg font-bold">{stats.xp}</span>
                        <span className="text-xs">XP</span>
                    </div>
                </div>
                <div className="h-8 w-px bg-white/20"></div>
                <div>
                    <div className="text-xs font-medium text-white/80 uppercase tracking-wider">Streak</div>
                    <div className="flex items-baseline gap-1">
                        <span className="text-lg font-bold">{stats.streak}</span>
                        <span className="text-xs">Days</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
