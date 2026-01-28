'use client';

import React, { useState, useEffect } from 'react';
import { NotificationService, NotificationPermission } from '@/lib/notifications';

export default function NotificationButton() {
    const [permission, setPermission] = useState<NotificationPermission>('default');
    const [isLoading, setIsLoading] = useState(false);
    const [isSupported, setIsSupported] = useState(true);

    useEffect(() => {
        setIsSupported(NotificationService.isSupported());
        setPermission(NotificationService.getPermission());
    }, []);

    const handleRequestPermission = async () => {
        setIsLoading(true);
        const result = await NotificationService.requestPermission();
        setPermission(result);
        setIsLoading(false);

        if (result === 'granted') {
            // Show a test notification
            NotificationService.show('🔔 Notifications Enabled', {
                body: 'You will now receive reminders for your scheduled tasks.',
            });
        }
    };

    if (!isSupported) {
        return (
            <div className="flex items-center gap-2 text-sm text-zinc-500">
                <span className="w-2 h-2 rounded-full bg-zinc-400" />
                Notifications not supported
            </div>
        );
    }

    if (permission === 'granted') {
        return (
            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                Notifications enabled
            </div>
        );
    }

    if (permission === 'denied') {
        return (
            <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                <span>Notifications blocked</span>
                <span className="text-xs text-zinc-500">(enable in browser settings)</span>
            </div>
        );
    }

    return (
        <button
            onClick={handleRequestPermission}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors text-sm font-medium disabled:opacity-50"
        >
            {isLoading ? (
                <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Enabling...
                </>
            ) : (
                <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    Enable Notifications
                </>
            )}
        </button>
    );
}
