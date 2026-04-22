import {
    Command,
    ExecutionResult,
    TodayWorkArgs,
    TodayFixedArgs,
    AddHabitArgs,
    AddTaskArgs,
    PasteScheduleArgs,
    LockArgs,
} from './types';
import { DatabaseService } from '@/lib/database';
import { Habit, Task, FixedEvent, PlanOutput, ScheduledBlock } from '@/types';
import { parseTextInput } from '@/lib/scheduling-engine';
import { format } from 'date-fns';
import { isRegularPlan, isLateNightPlan } from '@/types/scheduling';

export class AssistantExecutor {
    static async execute(command: Command): Promise<ExecutionResult> {
        try {
            switch (command.type) {
                case 'HELP':
                    return this.handleHelp();
                case 'STATUS':
                    return await this.handleStatus();
                case 'PLAN':
                    // The actual planning is complex and usually requires client-side context (SchedulingEngine).
                    // Here we perform any DB prep, and return a success signal that the UI can use to trigger the actual plan generation.
                    return {
                        success: true,
                        message: 'Ready to optimize plan. Triggering scheduling engine...',
                        data: { action: 'TRIGGER_PLAN' },
                    };
                case 'LOCK_BLOCK':
                    return await this.handleLockToggle(command.args as LockArgs, true);
                case 'UNLOCK_BLOCK':
                    return await this.handleLockToggle(command.args as LockArgs, false);
                case 'TODAY_WORK':
                    return await this.handleTodayWork(command.args as TodayWorkArgs);
                case 'TODAY_FIXED':
                    return await this.handleTodayFixed(command.args as TodayFixedArgs);
                case 'PASTE_SCHEDULE':
                    return await this.handlePasteSchedule((command.args as PasteScheduleArgs)?.text);
                case 'ADD_HABIT':
                    return await this.handleAddHabit(command.args as AddHabitArgs);
                case 'ADD_TASK':
                    return await this.handleAddTask(command.args as AddTaskArgs);
                case 'EXPORT_JSON':
                    return await this.handleExport();
                default:
                    return {
                        success: false,
                        message: `Command type ${command.type} not yet implemented.`,
                    };
            }
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
            return { success: false, message: `Error executing command: ${errorMessage}` };
        }
    }

    private static handleHelp(): ExecutionResult {
        const helpText = `Available commands:
    - today work <start>-<end> (e.g., "today work 09:00-17:00")
    - today add fixed <Title> <start>-<end>
    - add task <Title> <duration> [p1-5] [due YYYY-MM-DD]
    - add habit <Name> <duration> <daily|weekly>
    - paste <schedule text>
    - plan (re-optimizes schedule)
    - status (shows daily summary)
    - export json`;
        return { success: true, message: helpText };
    }

    private static async handleStatus(): Promise<ExecutionResult> {
        const today = format(new Date(), 'yyyy-MM-dd');
        const plan = await DatabaseService.getPlan(today);

        if (!plan) {
            return {
                success: false,
                message: 'No plan found for today. Generate a plan first (type: plan).',
            };
        }

        const blocks = Array.isArray(plan.blocks) ? plan.blocks : [];
        const scheduledHabits = blocks.filter(b => b.type === 'habit').length;
        const scheduledTasks = blocks.filter(b => b.type === 'task').length;
        const scheduledGym = blocks.filter(b => b.type === 'gym').length;

        const doneHabits = blocks.filter(b => b.type === 'habit' && b.completed).length;
        const doneTasks = blocks.filter(b => b.type === 'task' && b.completed).length;
        const doneGym = blocks.filter(b => b.type === 'gym' && b.completed).length;

        const lockedCount = blocks.filter(b => b.locked).length;
        const completedCount = blocks.filter(b => b.completed).length;

        let statsLine = '';
        if (plan.stats && isRegularPlan(plan.stats)) {
            statsLine =
                `Work: ${plan.stats.workHours}h | Gym: ${plan.stats.gymMinutes}m | ` +
                `Habits: ${doneHabits}/${scheduledHabits} | Tasks: ${doneTasks}/${scheduledTasks} | ` +
                `Focus: ${plan.stats.focusBlocks} | Free: ${plan.stats.freeTimeRemaining}m`;
        } else if (plan.stats && isLateNightPlan(plan.stats)) {
            statsLine =
                `Late-night plan | Focus: ${plan.stats.totalFocusTimeMinutes}m | ` +
                `Free: ${plan.stats.totalFreeTimeMinutes}m | Completion: ${Math.round(plan.stats.completionRate * 100)}%`;
        } else {
            statsLine =
                `Habits: ${doneHabits}/${scheduledHabits} | Tasks: ${doneTasks}/${scheduledTasks} | Gym: ${doneGym}/${scheduledGym}`;
        }

        const uns = Array.isArray(plan.unscheduled) ? plan.unscheduled : [];
        const unsTop = uns.slice(0, 3).map(u => u.title).join(', ');
        const unsLine = uns.length
            ? `Unscheduled (${uns.length}): ${unsTop}${uns.length > 3 ? '…' : ''}`
            : 'Unscheduled: none';

        const msg =
            `Today (${today})\n${statsLine}\n` +
            `Blocks done: ${completedCount}/${blocks.length} | Locked: ${lockedCount}\n${unsLine}`;

        return { success: true, message: msg };
    }

    private static async handleLockToggle(
        args: LockArgs,
        locked: boolean
    ): Promise<ExecutionResult> {
        const today = format(new Date(), 'yyyy-MM-dd');
        const plan = await DatabaseService.getPlan(today);

        if (!plan) {
            return {
                success: false,
                message: 'No plan found for today. Generate a plan first (type: plan).',
            };
        }

        const needle = (args?.blockId ?? '').trim();
        if (!needle) {
            return {
                success: false,
                message: 'Missing blockId. Example: lock <blockId or title>',
            };
        }

        const blocks = plan.blocks ?? [];
        const matches: Array<{ index: number; block: ScheduledBlock }> = [];

        // 1) exact id match
        for (let i = 0; i < blocks.length; i++) {
            const b = blocks[i];
            if (b.id === needle) matches.push({ index: i, block: b });
        }

        // 2) fallback: title/id contains match (case-insensitive)
        if (matches.length === 0) {
            const n = needle.toLowerCase();
            for (let i = 0; i < blocks.length; i++) {
                const b = blocks[i];
                if (b.title.toLowerCase().includes(n) || b.id.toLowerCase().includes(n)) {
                    matches.push({ index: i, block: b });
                }
            }
        }

        if (matches.length === 0) {
            return {
                success: false,
                message: `Block not found for "${needle}". Tip: use a unique title fragment or the exact block id.`,
            };
        }

        if (matches.length > 1) {
            const preview = matches
                .slice(0, 5)
                .map(m => `${m.block.title} (${m.block.start}-${m.block.end}) [${m.block.id}]`)
                .join('; ');
            return {
                success: false,
                message: `Ambiguous match for "${needle}". Be more specific. Matches: ${preview}${matches.length > 5 ? '…' : ''}`,
            };
        }

        const target = matches[0];
        const updatedBlocks = blocks.map((b, i) => (i === target.index ? { ...b, locked } : b));

        const updatedPlan: PlanOutput = { ...plan, blocks: updatedBlocks };
        await DatabaseService.savePlan(updatedPlan);

        const state = locked ? 'Locked' : 'Unlocked';
        return {
            success: true,
            message: `${state}: ${target.block.title} (${target.block.start}-${target.block.end})`,
        };
    }

    private static async handleTodayWork(args: TodayWorkArgs): Promise<ExecutionResult> {
        const today = format(new Date(), 'yyyy-MM-dd');
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

        // Get current DailyInput
        let dailyInput = await DatabaseService.getDailyInput(today, timezone);
        if (!dailyInput) {
            // Create default if missing? Or error?
            // Let's assume we can fetch default prefs and scaffold
            const prefs =
                (await DatabaseService.getPreferences()) ||
                (await DatabaseService.getDefaultPreferences());
            dailyInput = {
                date: today,
                timezone,
                sleep: { start: prefs.defaultSleepStart, end: prefs.defaultSleepEnd },
                fixedEvents: [],
                constraints: {
                    buffersBetweenBlocksMin: prefs.defaultBuffers,
                    protectDowntimeMin: prefs.defaultDowntimeProtection,
                },
            };
        }

        // Remove existing 'work' events? Or just add?
        // "today work" usually implies "this is my work block"
        // Let's filter out old work blocks and add new one
        dailyInput.fixedEvents = dailyInput.fixedEvents.filter(e => e.type !== 'work');
        dailyInput.fixedEvents.push({
            title: 'Work',
            start: args.start,
            end: args.end,
            type: 'work',
            locked: true,
        });

        await DatabaseService.saveDailyInput(dailyInput);
        return { success: true, message: `Set work hours to ${args.start}-${args.end}` };
    }

    private static async handleTodayFixed(args: TodayFixedArgs): Promise<ExecutionResult> {
        const today = format(new Date(), 'yyyy-MM-dd');
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        let dailyInput = await DatabaseService.getDailyInput(today, timezone);

        if (!dailyInput) {
            // Create default scaffold for now
            const prefs =
                (await DatabaseService.getPreferences()) ||
                (await DatabaseService.getDefaultPreferences());
            dailyInput = {
                date: today,
                timezone,
                sleep: { start: prefs.defaultSleepStart, end: prefs.defaultSleepEnd },
                fixedEvents: [],
                constraints: {
                    buffersBetweenBlocksMin: prefs.defaultBuffers,
                    protectDowntimeMin: prefs.defaultDowntimeProtection,
                },
            };
        }

        dailyInput.fixedEvents.push({
            title: args.title,
            start: args.start,
            end: args.end,
            type: 'other', // Default type, could be refined
            locked: true,
        });

        await DatabaseService.saveDailyInput(dailyInput);
        return {
            success: true,
            message: `Added fixed event: ${args.title} (${args.start}-${args.end})`,
        };
    }

    private static async handlePasteSchedule(text: string): Promise<ExecutionResult> {
        // Use existing parser logic
        const result = parseTextInput(text);
        if (result.items.length === 0) {
            return { success: false, message: 'Could not parse any items from text.' };
        }

        const today = format(new Date(), 'yyyy-MM-dd');
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        let dailyInput = await DatabaseService.getDailyInput(today, timezone);

        if (!dailyInput) {
            const prefs =
                (await DatabaseService.getPreferences()) ||
                (await DatabaseService.getDefaultPreferences());
            dailyInput = {
                date: today,
                timezone,
                sleep: { start: prefs.defaultSleepStart, end: prefs.defaultSleepEnd },
                fixedEvents: [],
                constraints: {
                    buffersBetweenBlocksMin: prefs.defaultBuffers,
                    protectDowntimeMin: prefs.defaultDowntimeProtection,
                },
            };
        }

        // Convert ParsedItems to FixedEvents
        for (const item of result.items) {
            dailyInput.fixedEvents.push({
                title: item.title,
                start: item.start,
                end: item.end,
                type: item.type as FixedEvent['type'],
                locked: true,
            });
        }

        await DatabaseService.saveDailyInput(dailyInput);
        return { success: true, message: `Added ${result.items.length} fixed events from text.` };
    }

    private static async handleAddHabit(args: AddHabitArgs): Promise<ExecutionResult> {
        const habit: Habit = {
            id: crypto.randomUUID(),
            name: args.name,
            duration: args.duration,
            frequency: args.frequency,
            preferredTimeWindow: args.window,
            priority: 3, // default
            category: 'learning', // default
            flexibility: 'flexible',
            energyLevel: 'medium',
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        await DatabaseService.saveHabit(habit);
        return { success: true, message: `Added habit: ${args.name}` };
    }

    private static async handleAddTask(args: AddTaskArgs): Promise<ExecutionResult> {
        const task: Task = {
            id: crypto.randomUUID(),
            title: args.title,
            estimatedDuration: args.duration,
            priority: args.priority,
            dueDate: args.due,
            energyLevel: args.energy || 'medium',
            category: 'work', // default
            isSplittable: false,
            isActive: true,
            isCompleted: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        await DatabaseService.saveTask(task);
        return { success: true, message: `Added task: ${args.title}` };
    }

    private static async handleExport(): Promise<ExecutionResult> {
        const json = await DatabaseService.exportData();
        return { success: true, message: 'Data exported', data: json };
    }
}
