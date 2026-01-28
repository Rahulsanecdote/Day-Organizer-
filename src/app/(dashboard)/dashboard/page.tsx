'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DayStateService, DayState } from '@/lib/day-state';
import { format } from 'date-fns';

import { useAuth } from '@/contexts/AuthContext';

export default function DashboardPage() {
    const router = useRouter();
    const { user } = useAuth();
    const [state, setState] = useState<DayState | null>(null);
    const [userName, setUserName] = useState('');
    const [greeting, setGreeting] = useState('');

    useEffect(() => {
        async function init() {
            // Load Profile Name
            const name = user?.user_metadata?.name || user?.user_metadata?.full_name || 'Rahul';
            setUserName(name);

            // Load State
            const currentState = await DayStateService.getCurrentState();
            setState(currentState);

            // Set Greeting
            const hour = new Date().getHours();
            if (hour < 12) setGreeting('Good Morning');
            else if (hour < 18) setGreeting('Good Afternoon');
            else setGreeting('Good Evening');
        }
        init();
    }, [user]);

    const handleStartDay = () => {
        router.push('/morning');
    };

    const handleGoToFocus = () => {
        router.push('/plan'); // Redirect to Plan page as Focus Mode view
    };

    if (!state) {
        return (
            <div className="h-96 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-12 py-12">
            {/* Hero Section */}
            <div className="text-center space-y-4">
                <h1 className="text-4xl md:text-5xl font-serif" style={{ color: 'var(--color-charcoal)' }}>
                    {greeting}, {userName}.
                </h1>
                <p className="text-lg max-w-lg mx-auto" style={{ color: 'var(--color-stone)' }}>
                    {state === 'uninitialized'
                        ? "Ready to design a productive day?"
                        : "Stay focused. You're making progress."}
                </p>
            </div>

            {/* Main Action Card */}
            <div className="flex justify-center">
                {state === 'uninitialized' ? (
                    <div
                        onClick={handleStartDay}
                        className="group cursor-pointer relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-700 p-8 shadow-xl hover:shadow-2xl transition-all duration-300 w-full max-w-md text-center transform hover:-translate-y-1"
                    >
                        <div className="relative z-10 text-white space-y-4">
                            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6 backdrop-blur-sm group-hover:scale-110 transition-transform">
                                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                                </svg>
                            </div>
                            <h2 className="text-2xl font-medium">Plan Your Day</h2>
                            <p className="text-indigo-100">
                                Take 2 minutes to set your intentions, schedule tasks, and optimize your energy.
                            </p>
                            <div className="pt-4">
                                <span className="inline-flex items-center gap-2 text-sm font-medium bg-white/20 px-4 py-2 rounded-full">
                                    Start Briefing <span className="text-lg">→</span>
                                </span>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div
                        onClick={handleGoToFocus}
                        className="group cursor-pointer relative overflow-hidden rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 w-full max-w-md text-center transform hover:-translate-y-1"
                        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
                    >
                        <div className="relative z-10 space-y-4">
                            <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-indigo-100 transition-colors">
                                <svg className="w-8 h-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                            </div>
                            <h2 className="text-2xl font-medium" style={{ color: 'var(--color-charcoal)' }}>Enter Focus Mode</h2>
                            <p style={{ color: 'var(--color-stone)' }}>
                                View your timeline and execute your current block.
                            </p>
                            <div className="pt-4">
                                <span className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 bg-indigo-50 px-4 py-2 rounded-full group-hover:bg-indigo-100">
                                    Resume Focus <span className="text-lg">→</span>
                                </span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Quick Links (Bottom) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto pt-8 border-t border-zinc-100">
                <QuickLink
                    href="/analytics"
                    icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
                    label="Analytics"
                />
                <QuickLink
                    href="/tasks"
                    icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>}
                    label="Tasks Library"
                />
                <QuickLink
                    href="/habits"
                    icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>}
                    label="Habits"
                />
                <QuickLink
                    href="/history"
                    icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 01 18 0z" /></svg>}
                    label="History"
                />
            </div>
        </div>
    );
}

function QuickLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
    return (
        <a href={href} className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800" style={{ color: 'var(--color-stone)' }}>
            {icon}
            <span className="text-sm font-medium">{label}</span>
        </a>
    );
}
