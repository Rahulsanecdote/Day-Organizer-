'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { DataService } from '@/lib/sync/DataService';
import { DayStateService } from '@/lib/day-state';
import { logger } from '@/lib/logger';
import { DailyInput, FixedEvent, UserPreferences, Task } from '@/types';
import { TimePickerField } from '@/components/ui/time-wheel-picker';

// Type definitions for wizard
type WizardStep = 'recovery' | 'tasks' | 'calendar' | 'generating';

export default function MorningPage() {
    const router = useRouter();
    const [step, setStep] = useState<WizardStep>('recovery');
    const [isLoading, setIsLoading] = useState(true);

    // Core Data
    const [preferences, setPreferences] = useState<UserPreferences | null>(null);
    const [dailyInput, setDailyInput] = useState<DailyInput>({
        date: format(new Date(), 'yyyy-MM-dd'),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        sleep: { start: '23:00', end: '07:00' },
        fixedEvents: [],
        constraints: { buffersBetweenBlocksMin: 10, protectDowntimeMin: 30 },
    });

    // Step 1: Recovery State
    const [energy, setEnergy] = useState<'low' | 'medium' | 'high'>('medium');

    // Step 2: Brain Dump State
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [recentTasks, setRecentTasks] = useState<Task[]>([]);

    // Step 3: Calendar State
    const [googleEventsLoading, setGoogleEventsLoading] = useState(false);

    // Initial Data Load
    useEffect(() => {
        const loadData = async () => {
            try {
                const prefs = await DataService.getPreferences();
                if (prefs) {
                    setPreferences(prefs);
                    setDailyInput(prev => ({
                        ...prev,
                        sleep: {
                            start: prefs.defaultSleepStart,
                            end: prefs.defaultSleepEnd
                        },
                        constraints: {
                            buffersBetweenBlocksMin: prefs.defaultBuffers,
                            protectDowntimeMin: prefs.defaultDowntimeProtection,
                        }
                    }));
                }

                // Check for existing input for today
                const today = format(new Date(), 'yyyy-MM-dd');
                const existing = await DataService.getDailyInput(today, Intl.DateTimeFormat().resolvedOptions().timeZone);
                if (existing) {
                    // Merge with defaults to ensure all required fields exist
                    setDailyInput(prev => ({
                        ...prev,
                        ...existing,
                        sleep: {
                            start: existing.sleep?.start ?? prev.sleep.start,
                            end: existing.sleep?.end ?? prev.sleep.end,
                        },
                        constraints: {
                            buffersBetweenBlocksMin: existing.constraints?.buffersBetweenBlocksMin ?? prev.constraints.buffersBetweenBlocksMin,
                            protectDowntimeMin: existing.constraints?.protectDowntimeMin ?? prev.constraints.protectDowntimeMin,
                        },
                        fixedEvents: existing.fixedEvents ?? prev.fixedEvents,
                    }));
                }
            } catch (error) {
                logger.error('Failed to load morning data', { error: String(error) });
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, []);

    // Fetch Calendar Events when entering Step 3
    useEffect(() => {
        if (step === 'calendar' && preferences?.googleCalendarTokens) {
            const fetchGoogleEvents = async () => {
                setGoogleEventsLoading(true);
                try {
                    const today = dailyInput.date;
                    const res = await fetch('/api/google/events', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            tokens: preferences.googleCalendarTokens,
                            start: new Date(today).toISOString(),
                            end: new Date(today).toISOString()
                        })
                    });

                    if (res.ok) {
                        const data = await res.json();
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const newEvents = data.events.map((e: any) => ({
                            title: e.title,
                            start: e.start,
                            end: e.end,
                            type: 'appointment',
                        }));

                        // Merge without duplicates (simple check)
                        setDailyInput(prev => {
                            const existing = new Set(prev.fixedEvents.map(ev => `${ev.start}-${ev.end}`));
                            const filtered = newEvents.filter((ev: FixedEvent) => !existing.has(`${ev.start}-${ev.end}`));
                            return {
                                ...prev,
                                fixedEvents: [...prev.fixedEvents, ...filtered]
                            };
                        });
                    }
                } catch (error) {
                    logger.error('Failed to fetch calendar events', { error: String(error) });
                } finally {
                    setGoogleEventsLoading(false);
                }
            };
            fetchGoogleEvents();
        }
    }, [step, preferences, dailyInput.date]);

    // Actions
    const handleAddTask = async () => {
        if (!newTaskTitle.trim()) return;

        const newTask: Task = {
            id: crypto.randomUUID(),
            title: newTaskTitle,
            category: 'work', // default
            priority: 2,
            isActive: true,
            isCompleted: false,
            estimatedDuration: 30, // default
            energyLevel: 'medium',
            isSplittable: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        setRecentTasks(prev => [newTask, ...prev]);
        setNewTaskTitle('');

        // Save immediately
        await DataService.saveTask(newTask);
    };

    const handleNext = async () => {
        if (step === 'recovery') setStep('tasks');
        else if (step === 'tasks') setStep('calendar');
        else if (step === 'calendar') await generatePlan();
    };

    const generatePlan = async () => {
        setStep('generating');

        try {
            // 1. Save Daily Input
            await DataService.saveDailyInput(dailyInput);

            // 2. Fetch all necessary data for scheduling
            const habits = await DataService.getAllHabits();
            const tasks = await DataService.getAllTasks();

            // 3. Generate Plan
            if (preferences) {
                const { SchedulingEngine } = await import('@/lib/scheduling-engine');
                const scheduler = new SchedulingEngine(
                    dailyInput,
                    habits,
                    tasks,
                    preferences.gymSettings,
                    preferences,
                    new Date() // NEW: Pass current time for real-time anchoring
                );

                const plan = scheduler.generatePlan();

                // 4. Save Plan
                await DataService.savePlan(plan);

                // 5. Redirect to the plan/focus page
                router.push('/plan');
            } else {
                throw new Error('User preferences not loaded');
            }
        } catch (error) {
            logger.error('Failed to generate plan', { error: String(error) });
            alert('Failed to generate your plan. Please try again.');
            setStep('calendar'); // Go back
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto py-12 px-4">
            <h1 className="text-3xl font-serif mb-8" style={{ color: 'var(--color-charcoal)' }}>Morning Briefing</h1>

            {/* Step Indicator */}
            <div className="flex gap-2 mb-12">
                {['recovery', 'tasks', 'calendar'].map((s, i) => (
                    <div
                        key={s}
                        className={`h-1 flex-1 rounded-full transition-colors duration-300 ${['recovery', 'tasks', 'calendar'].indexOf(step) >= i
                            ? 'bg-indigo-600'
                            : 'bg-zinc-200'
                            }`}
                    />
                ))}
            </div>

            {/* Step Content */}
            <div className="p-8 rounded-2xl shadow-sm min-h-[400px] flex flex-col" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                {step === 'recovery' && (
                    <div className="space-y-6 flex-1 animate-in fade-in slide-in-from-right-4 duration-300">
                        <h2 className="text-xl font-medium" style={{ color: 'var(--color-charcoal)' }}>How did you sleep?</h2>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm mb-1" style={{ color: 'var(--color-stone)' }}>Bedtime</label>
                                <TimePickerField
                                    value={dailyInput.sleep.start}
                                    onChange={(time) => setDailyInput(prev => ({
                                        ...prev,
                                        sleep: { ...prev.sleep, start: time }
                                    }))}
                                    label="Select Bedtime"
                                    format="12h"
                                    showDuration={true}
                                    otherTime={dailyInput.sleep.end}
                                    isBedtime={true}
                                />
                            </div>
                            <div>
                                <label className="block text-sm mb-1" style={{ color: 'var(--color-stone)' }}>Wake Time</label>
                                <TimePickerField
                                    value={dailyInput.sleep.end}
                                    onChange={(time) => setDailyInput(prev => ({
                                        ...prev,
                                        sleep: { ...prev.sleep, end: time }
                                    }))}
                                    label="Select Wake Time"
                                    format="12h"
                                    showDuration={true}
                                    otherTime={dailyInput.sleep.start}
                                    isBedtime={false}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm mb-3" style={{ color: 'var(--color-stone)' }}>Energy Level</label>
                            <div className="flex gap-4">
                                {(['low', 'medium', 'high'] as const).map(e => (
                                    <button
                                        key={e}
                                        onClick={() => setEnergy(e)}
                                        className={`flex-1 p-4 rounded-xl border-2 transition-all ${energy === e
                                            ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                                            : 'hover:border-zinc-200'
                                            }`}
                                        style={energy !== e ? { borderColor: 'var(--color-border)', color: 'var(--color-stone)' } : {}}
                                    >
                                        <div className="capitalize font-medium">{e}</div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {step === 'tasks' && (
                    <div className="space-y-6 flex-1 animate-in fade-in slide-in-from-right-4 duration-300">
                        <h2 className="text-xl font-medium">What's on your mind for today?</h2>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={newTaskTitle}
                                onChange={(e) => setNewTaskTitle(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleAddTask();
                                }}
                                placeholder="Add a task..."
                                className="flex-1 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-100"
                                style={{
                                    background: 'var(--color-ivory)',
                                    color: 'var(--color-charcoal)',
                                    border: '1px solid var(--color-border)'
                                }}
                                autoFocus
                            />
                            <button
                                onClick={handleAddTask}
                                className="px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                            >
                                Add
                            </button>
                        </div>
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                            {recentTasks.map(t => (
                                <div
                                    key={t.id}
                                    className="flex justify-between items-center p-3 rounded-lg animate-in slide-in-from-top-2"
                                    style={{
                                        background: 'var(--color-surface)',
                                        border: '1px solid var(--color-border)',
                                        color: 'var(--color-charcoal)'
                                    }}
                                >
                                    <span style={{ color: 'var(--color-charcoal)' }}>{t.title}</span>
                                    <span className="text-xs" style={{ color: 'var(--color-mist)' }}>Added to Library</span>
                                </div>
                            ))}
                            {recentTasks.length === 0 && (
                                <p className="text-center py-8" style={{ color: 'var(--color-mist)' }}>No new tasks added yet.</p>
                            )}
                        </div>
                    </div>
                )}

                {step === 'calendar' && (
                    <div className="space-y-6 flex-1 animate-in fade-in slide-in-from-right-4 duration-300">
                        <h2 className="text-xl font-medium">Review your calendar</h2>
                        <div className="space-y-4">
                            {dailyInput.fixedEvents.length > 0 ? (
                                <div className="space-y-2">
                                    {dailyInput.fixedEvents.map((ev, i) => (
                                        <div key={i} className="flex items-center gap-3 p-3 bg-indigo-50/50 rounded-lg border border-indigo-100">
                                            <div className="w-10 text-xs font-medium text-zinc-500 text-right">
                                                {ev.start}
                                            </div>
                                            <div className="w-1 h-8 bg-indigo-200 rounded-full" />
                                            <div>
                                                <div className="font-medium text-indigo-900">{ev.title}</div>
                                                <div className="text-xs text-indigo-400 capitalize">{ev.type}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12 border-2 border-dashed border-zinc-100 rounded-xl">
                                    <p className="text-zinc-400">No fixed events scheduled yet.</p>
                                </div>
                            )}

                            <div className="flex gap-4">
                                <button
                                    onClick={() => {
                                        // Simple prompt for manual add as fallback
                                        const title = prompt('Event Title:');
                                        if (title) {
                                            const start = prompt('Start Time (HH:MM):', '09:00');
                                            const end = prompt('End Time (HH:MM):', '10:00');
                                            if (start && end) {
                                                setDailyInput(prev => ({
                                                    ...prev,
                                                    fixedEvents: [...prev.fixedEvents, {
                                                        title, start, end, type: 'work'
                                                    }]
                                                }));
                                            }
                                        }
                                    }}
                                    className="text-sm text-indigo-600 font-medium hover:text-indigo-800"
                                >
                                    + Add Event Manually
                                </button>
                                {googleEventsLoading && <span className="text-xs text-zinc-400 self-center">Syncing calendar...</span>}
                            </div>
                        </div>
                    </div>
                )}

                {step === 'generating' && (
                    <div className="flex-1 flex flex-col items-center justify-center space-y-4 animate-in fade-in duration-500">
                        <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                        <div className="text-center space-y-2">
                            <p className="text-xl font-medium text-zinc-900">Optimizing your day...</p>
                            <p className="text-sm text-zinc-500">Integrating tasks, habits, and energy levels.</p>
                        </div>
                    </div>
                )}

                {/* Footer Controls */}
                {step !== 'generating' && (
                    <div className="pt-8 flex justify-between border-t border-zinc-50 mt-8">
                        {step !== 'recovery' && (
                            <button
                                onClick={() => {
                                    if (step === 'tasks') setStep('recovery');
                                    if (step === 'calendar') setStep('tasks');
                                }}
                                className="px-6 py-2 text-zinc-500 hover:text-zinc-900"
                            >
                                Back
                            </button>
                        )}
                        <div className="flex-1" />
                        <button
                            onClick={handleNext}
                            className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
                        >
                            {step === 'calendar' ? 'Generate Plan' : 'Next'}
                        </button>
                    </div>
                )}
            </div>
        </div >
    );
}
