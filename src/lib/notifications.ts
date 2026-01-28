'use client';

import { ScheduledBlock } from '@/types';

export type NotificationPermission = 'granted' | 'denied' | 'default';

export interface ReminderNotification {
    id: string;
    title: string;
    body: string;
    scheduledTime: Date;
    blockId?: string;
}

class NotificationServiceClass {
    private scheduledReminders: Map<string, NodeJS.Timeout> = new Map();
    private isInitialized = false;

    // Check if notifications are supported
    isSupported(): boolean {
        return typeof window !== 'undefined' && 'Notification' in window;
    }

    // Get current permission status
    getPermission(): NotificationPermission {
        if (!this.isSupported()) return 'denied';
        return Notification.permission as NotificationPermission;
    }

    // Request permission from user
    async requestPermission(): Promise<NotificationPermission> {
        if (!this.isSupported()) return 'denied';

        const result = await Notification.requestPermission();
        return result as NotificationPermission;
    }

    // Initialize the service
    async initialize(): Promise<boolean> {
        if (this.isInitialized) return true;
        if (!this.isSupported()) return false;

        const permission = this.getPermission();
        if (permission === 'granted') {
            this.isInitialized = true;
            return true;
        }

        if (permission === 'default') {
            const result = await this.requestPermission();
            this.isInitialized = result === 'granted';
            return this.isInitialized;
        }

        return false;
    }

    // Show a notification immediately
    show(title: string, options?: NotificationOptions): Notification | null {
        if (!this.isSupported() || this.getPermission() !== 'granted') {
            console.log('Notifications not available');
            return null;
        }

        try {
            const notification = new Notification(title, {
                icon: '/favicon.ico',
                badge: '/favicon.ico',
                ...options,
            });

            // Auto-close after 10 seconds
            setTimeout(() => notification.close(), 10000);

            return notification;
        } catch (error) {
            console.error('Failed to show notification:', error);
            return null;
        }
    }

    // Schedule a reminder for a block
    scheduleBlockReminder(
        block: ScheduledBlock,
        reminderMinutes: number,
        onReminder?: (block: ScheduledBlock) => void
    ): string {
        const reminderId = `reminder-${block.id}`;

        // Cancel existing reminder for this block
        this.cancelReminder(reminderId);

        // Parse block start time
        const [hours, minutes] = block.start.split(':').map(Number);
        const now = new Date();
        const blockTime = new Date(now);
        blockTime.setHours(hours, minutes, 0, 0);

        // Calculate reminder time
        const reminderTime = new Date(blockTime.getTime() - reminderMinutes * 60 * 1000);
        const delay = reminderTime.getTime() - now.getTime();

        // Only schedule if in the future
        if (delay > 0) {
            const timeout = setTimeout(() => {
                this.show(`⏰ ${block.title} starts in ${reminderMinutes} minutes`, {
                    body: `Scheduled for ${block.start}`,
                    tag: reminderId,
                    requireInteraction: true,
                });
                onReminder?.(block);
                this.scheduledReminders.delete(reminderId);
            }, delay);

            this.scheduledReminders.set(reminderId, timeout);
        }

        return reminderId;
    }

    // Schedule reminders for all blocks in a plan
    scheduleAllReminders(
        blocks: ScheduledBlock[],
        reminderMinutes: number
    ): void {
        // Clear all existing reminders
        this.clearAllReminders();

        // Schedule reminder for each block
        blocks.forEach(block => {
            if (block.type !== 'break' && block.type !== 'sleep') {
                this.scheduleBlockReminder(block, reminderMinutes);
            }
        });
    }

    // Cancel a specific reminder
    cancelReminder(reminderId: string): void {
        const timeout = this.scheduledReminders.get(reminderId);
        if (timeout) {
            clearTimeout(timeout);
            this.scheduledReminders.delete(reminderId);
        }
    }

    // Clear all scheduled reminders
    clearAllReminders(): void {
        this.scheduledReminders.forEach((timeout) => {
            clearTimeout(timeout);
        });
        this.scheduledReminders.clear();
    }

    // Show habit streak notification
    showHabitStreak(habitName: string, streak: number): void {
        if (streak > 0) {
            this.show(`🔥 ${habitName} - ${streak} day streak!`, {
                body: 'Keep up the great work!',
                tag: `habit-streak-${habitName}`,
            });
        }
    }

    // Show completion check notification
    showCompletionCheck(blocksRemaining: number): void {
        this.show('📋 Time for a check-in', {
            body: `You have ${blocksRemaining} items remaining today.`,
            tag: 'completion-check',
            requireInteraction: true,
        });
    }

    // Show daily review reminder
    showDailyReviewReminder(): void {
        this.show('🌙 Daily Review Time', {
            body: 'Take a moment to review your day and plan for tomorrow.',
            tag: 'daily-review',
            requireInteraction: true,
        });
    }

    // Get count of scheduled reminders
    getScheduledCount(): number {
        return this.scheduledReminders.size;
    }
}

// Export singleton instance
export const NotificationService = new NotificationServiceClass();
