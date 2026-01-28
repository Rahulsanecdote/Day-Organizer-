'use client';

import React, { useState, useEffect } from 'react';
import { AssistantParser } from '@/lib/assistant/parser';
import { AssistantExecutor } from '@/lib/assistant/executor';
import { DatabaseService } from '@/lib/database'; // to log commands

import { COMMAND_DEFINITIONS } from '@/lib/assistant/commands';

export default function CommandBar() {
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState('');
    const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
    const [history, setHistory] = useState<string[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const inputRef = React.useRef<HTMLInputElement>(null);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setIsOpen(prev => !prev);
            }
            if (e.key === 'Escape' && isOpen) {
                setIsOpen(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen]);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

        // Use async parsing with AI fallback
        const parseResult = await AssistantParser.parseAsync(input);

        // Log intent (even if failed parse) - can be async
        const logId = `log-${Date.now()}`;
        // We'll update the log with success status after execution

        if (!parseResult.success || !parseResult.command) {
            setResult({ success: false, message: parseResult.error || 'Unknown error' });
            // Log failure
            DatabaseService.logAssistantCommand({
                id: logId,
                timestamp: Date.now(),
                inputText: input,
                commandType: 'UNKNOWN',
                success: false,
                resultSummary: parseResult.error || 'Parse failed'
            });
            return;
        }

        const command = parseResult.command;

        try {
            const execResult = await AssistantExecutor.execute(command);
            setResult({ success: execResult.success, message: execResult.message });

            if (execResult.success) {
                setInput(''); // Clear input on success
                setIsOpen(false); // Close bar on success (optional, maybe keep open for feedback?)
                // Actually, showing feedback is better.
                setIsOpen(true);
                setTimeout(() => setResult(null), 3000); // Clear message after 3s
            }

            // Log execution
            DatabaseService.logAssistantCommand({
                id: logId,
                timestamp: Date.now(),
                inputText: input,
                commandType: command.type,
                success: execResult.success,
                resultSummary: execResult.message
            });

            // Add to local history
            setHistory(prev => [input, ...prev]);
            setHistoryIndex(-1);

            // Handle Trigger Plan
            if (execResult.data && typeof execResult.data === 'object' && 'action' in execResult.data && execResult.data.action === 'TRIGGER_PLAN') {
                // Dispatch event for the Plan page to listen to
                window.dispatchEvent(new CustomEvent('assistant-trigger-plan'));
            }

        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
            setResult({ success: false, message: errorMessage });
            DatabaseService.logAssistantCommand({
                id: logId,
                timestamp: Date.now(),
                inputText: input,
                commandType: command.type,
                success: false,
                resultSummary: errorMessage
            });
        }
    };

    const handleHistoryNav = (direction: 'up' | 'down') => {
        if (history.length === 0) return;
        let newIndex = historyIndex;
        if (direction === 'up') {
            newIndex = Math.min(history.length - 1, historyIndex + 1);
        } else {
            newIndex = Math.max(-1, historyIndex - 1);
        }
        setHistoryIndex(newIndex);
        if (newIndex >= 0) {
            setInput(history[newIndex]);
        } else {
            setInput('');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] bg-black/50 backdrop-blur-sm transition-all"
            onClick={(e) => { if (e.target === e.currentTarget) setIsOpen(false); }}>
            <div className="w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-xl shadow-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 animate-in fade-in zoom-in-95 duration-200">
                <form onSubmit={handleSubmit} className="relative flex items-center p-4 border-b border-zinc-200 dark:border-zinc-800">
                    <svg className="w-6 h-6 text-zinc-400 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                    <input
                        id="command-input"
                        name="command"
                        ref={inputRef}
                        type="text"
                        className="flex-1 bg-transparent text-lg text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none"
                        placeholder="Type a command (try 'help' or 'today work 9-5')..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'ArrowUp') { e.preventDefault(); handleHistoryNav('up'); }
                            if (e.key === 'ArrowDown') { e.preventDefault(); handleHistoryNav('down'); }
                        }}
                    />
                    <div className="flex items-center gap-2 text-xs text-zinc-400">
                        <span className="px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800">Esc</span>
                        to close
                    </div>
                </form>

                {result && (
                    <div className={`p-3 text-sm ${result.success ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'}`}>
                        {result.success ? (
                            <div className="flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                {result.message}
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                {result.message}
                            </div>
                        )}
                    </div>
                )}

                <div className="bg-zinc-50 dark:bg-zinc-900/50 p-2 max-h-60 overflow-y-auto">
                    {/* Suggestions or Help */}
                    {!input && (
                        <div className="grid grid-cols-2 gap-2">
                            {Object.values(COMMAND_DEFINITIONS).slice(0, 6).map(cmd => (
                                <button key={cmd.type}
                                    onClick={() => { setInput(cmd.examples[0]); inputRef.current?.focus(); }}
                                    className="text-left p-2 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors group">
                                    <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                                        {cmd.usage}
                                    </div>
                                    <div className="text-xs text-zinc-500 dark:text-zinc-500 truncate">
                                        {cmd.description}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
