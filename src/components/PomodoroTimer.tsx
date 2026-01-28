'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

type TimerMode = 'work' | 'break' | 'longBreak';

interface PomodoroSettings {
    workDuration: number; // minutes
    breakDuration: number;
    longBreakDuration: number;
    sessionsBeforeLongBreak: number;
}

const DEFAULT_SETTINGS: PomodoroSettings = {
    workDuration: 25,
    breakDuration: 5,
    longBreakDuration: 15,
    sessionsBeforeLongBreak: 4,
};

export default function PomodoroTimer() {
    const [isOpen, setIsOpen] = useState(false);
    const [isRunning, setIsRunning] = useState(false);
    const [mode, setMode] = useState<TimerMode>('work');
    const [timeLeft, setTimeLeft] = useState(DEFAULT_SETTINGS.workDuration * 60);
    const [completedSessions, setCompletedSessions] = useState(0);
    const [settings] = useState<PomodoroSettings>(DEFAULT_SETTINGS);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Format time as MM:SS
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // Get duration for current mode
    const getDuration = useCallback((timerMode: TimerMode) => {
        switch (timerMode) {
            case 'work':
                return settings.workDuration * 60;
            case 'break':
                return settings.breakDuration * 60;
            case 'longBreak':
                return settings.longBreakDuration * 60;
        }
    }, [settings]);

    // Play notification sound
    const playNotification = useCallback(() => {
        // Use Web Audio API for a simple beep
        try {
            const audioContext = new (window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.value = 800;
            oscillator.type = 'sine';
            gainNode.gain.value = 0.3;

            oscillator.start();
            setTimeout(() => oscillator.stop(), 200);
        } catch {
            console.log('Audio notification not available');
        }
    }, []);

    // Handle timer completion
    const handleTimerComplete = useCallback(() => {
        playNotification();

        if (mode === 'work') {
            const newCompletedSessions = completedSessions + 1;
            setCompletedSessions(newCompletedSessions);

            // Check if it's time for a long break
            if (newCompletedSessions % settings.sessionsBeforeLongBreak === 0) {
                setMode('longBreak');
                setTimeLeft(getDuration('longBreak'));
            } else {
                setMode('break');
                setTimeLeft(getDuration('break'));
            }
        } else {
            // After break, start work session
            setMode('work');
            setTimeLeft(getDuration('work'));
        }

        setIsRunning(false);
    }, [mode, completedSessions, settings.sessionsBeforeLongBreak, getDuration, playNotification]);

    // Timer tick
    useEffect(() => {
        let interval: NodeJS.Timeout;

        if (isRunning && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft(prev => prev - 1);
            }, 1000);
        } else if (isRunning && timeLeft === 0) {
            // eslint-disable-next-line
            handleTimerComplete();
        }

        return () => clearInterval(interval);
    }, [isRunning, timeLeft, handleTimerComplete]);

    // Toggle timer
    const toggleTimer = () => {
        setIsRunning(!isRunning);
    };

    // Reset timer
    const resetTimer = () => {
        setIsRunning(false);
        setTimeLeft(getDuration(mode));
    };

    // Skip to next phase
    const skipPhase = () => {
        handleTimerComplete();
    };

    // Get mode display info
    const getModeInfo = () => {
        switch (mode) {
            case 'work':
                return { label: 'Focus Time', color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20' };
            case 'break':
                return { label: 'Short Break', color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-900/20' };
            case 'longBreak':
                return { label: 'Long Break', color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' };
        }
    };

    const modeInfo = getModeInfo();
    const progress = ((getDuration(mode) - timeLeft) / getDuration(mode)) * 100;

    return (
        <>
            {/* Floating Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`fixed bottom-6 left-6 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-105 ${isRunning
                    ? 'bg-red-500 text-white animate-pulse'
                    : 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                    }`}
                title="Pomodoro Timer"
            >
                {isRunning ? (
                    <span className="text-sm font-mono font-bold">{formatTime(timeLeft).split(':')[0]}</span>
                ) : (
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                )}
            </button>

            {/* Timer Panel */}
            {isOpen && (
                <div className="fixed bottom-24 left-6 z-50 w-80 bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-200">
                    {/* Progress bar */}
                    <div className="h-1 bg-zinc-100 dark:bg-zinc-800">
                        <div
                            className={`h-full transition-all ${mode === 'work' ? 'bg-red-500' : mode === 'break' ? 'bg-green-500' : 'bg-blue-500'}`}
                            style={{ width: `${progress}%` }}
                        />
                    </div>

                    <div className="p-6">
                        {/* Mode Label */}
                        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium mb-4 ${modeInfo.bg} ${modeInfo.color}`}>
                            <span className="w-2 h-2 rounded-full bg-current" />
                            {modeInfo.label}
                        </div>

                        {/* Timer Display */}
                        <div className="text-center mb-6">
                            <div className="text-6xl font-mono font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
                                {formatTime(timeLeft)}
                            </div>
                            <div className="mt-2 text-sm text-zinc-500">
                                Session {completedSessions + 1} • {mode === 'work' ? 'Stay focused!' : 'Take a break'}
                            </div>
                        </div>

                        {/* Controls */}
                        <div className="flex items-center justify-center gap-3">
                            <button
                                onClick={resetTimer}
                                className="p-3 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition-colors"
                                title="Reset"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                            </button>

                            <button
                                onClick={toggleTimer}
                                className={`p-4 rounded-full text-white transition-all hover:scale-105 ${isRunning
                                    ? 'bg-amber-500 hover:bg-amber-600'
                                    : 'bg-green-500 hover:bg-green-600'
                                    }`}
                            >
                                {isRunning ? (
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                ) : (
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                )}
                            </button>

                            <button
                                onClick={skipPhase}
                                className="p-3 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition-colors"
                                title="Skip to next phase"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                                </svg>
                            </button>
                        </div>

                        {/* Session Dots */}
                        <div className="flex items-center justify-center gap-2 mt-6">
                            {Array.from({ length: settings.sessionsBeforeLongBreak }).map((_, i) => (
                                <div
                                    key={i}
                                    className={`w-2 h-2 rounded-full transition-colors ${i < (completedSessions % settings.sessionsBeforeLongBreak)
                                        ? 'bg-red-500'
                                        : 'bg-zinc-200 dark:bg-zinc-700'
                                        }`}
                                />
                            ))}
                        </div>
                        <div className="text-center mt-2 text-xs text-zinc-400">
                            {settings.sessionsBeforeLongBreak - (completedSessions % settings.sessionsBeforeLongBreak)} sessions until long break
                        </div>
                    </div>
                </div>
            )}

            {/* Hidden audio element for fallback */}
            <audio ref={audioRef} />
        </>
    );
}
