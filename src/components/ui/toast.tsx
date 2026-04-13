'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';

type ToastTone = 'success' | 'error' | 'info';

interface ToastItem {
    id: string;
    message: string;
    tone: ToastTone;
}

interface ToastContextValue {
    showToast: (message: string, tone?: ToastTone) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<ToastItem[]>([]);

    const showToast = useCallback((message: string, tone: ToastTone = 'info') => {
        const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
        setToasts(prev => [...prev, { id, message, tone }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 3500);
    }, []);

    const value = useMemo(() => ({ showToast }), [showToast]);

    return (
        <ToastContext.Provider value={value}>
            {children}
            <div className="fixed bottom-4 right-4 z-[100] space-y-2 pointer-events-none">
                {toasts.map(toast => (
                    <div
                        key={toast.id}
                        className="rounded-lg px-4 py-3 shadow-lg text-sm max-w-xs animate-in fade-in slide-in-from-bottom-2"
                        style={{
                            background:
                                toast.tone === 'success'
                                    ? '#166534'
                                    : toast.tone === 'error'
                                      ? '#991b1b'
                                      : '#1f2937',
                            color: '#fff',
                        }}
                    >
                        {toast.message}
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
}
