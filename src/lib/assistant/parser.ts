import {
    Command,
    ParseResult,
    CommandType,
    TodayWorkArgs,
    TodayFixedArgs,
    AddHabitArgs,
    AddTaskArgs,
    LockArgs
} from './types';

export class AssistantParser {
    static parse(input: string): ParseResult {
        const text = input.trim();
        if (!text) return { success: false, error: 'Empty input' };

        const lower = text.toLowerCase();

        // 1. HELP
        if (lower === 'help' || lower === '?') {
            return { success: true, command: { type: 'HELP', raw: text } };
        }

        // 2. STATUS
        if (lower === 'status' || lower === 'summary') {
            return { success: true, command: { type: 'STATUS', raw: text } };
        }

        // 3. PLAN / OPTIMIZE
        if (lower === 'plan' || lower === 'optimize' || lower === 'replan') {
            return { success: true, command: { type: 'PLAN', raw: text } };
        }

        // 4. EXPORT
        if (lower.startsWith('export')) {
            return { success: true, command: { type: 'EXPORT_JSON', raw: text } };
        }

        // 5. TODAY WORK: "today work 09:30-18:00"
        const workMatch = text.match(/today work\s+(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/i);
        if (workMatch) {
            const args: TodayWorkArgs = { start: workMatch[1], end: workMatch[2] };
            return { success: true, command: { type: 'TODAY_WORK', raw: text, args } };
        }

        // 6. TODAY FIXED: "today add fixed Dinner 19:00-20:00"
        // Regex: title can be multi-word, then time range
        const fixedMatch = text.match(/today add fixed\s+(.+)\s+(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/i);
        if (fixedMatch) {
            const args: TodayFixedArgs = { title: fixedMatch[1], start: fixedMatch[2], end: fixedMatch[3] };
            return { success: true, command: { type: 'TODAY_FIXED', raw: text, args } };
        }

        // 7. ADD TASK: "add task <Title> <dur> p<1-5> [due <date>] [energy <level>]"
        // Simplified parsing: strict order not enforced, but keywords are
        if (lower.startsWith('add task')) {
            return this.parseAddTask(text);
        }

        // 8. ADD HABIT: "add habit <Name> <dur> <freq> [window]"
        if (lower.startsWith('add habit')) {
            return this.parseAddHabit(text);
        }

        // 9. PASTE: "paste <...>"
        if (lower.startsWith('paste')) {
            const content = text.replace(/^paste\s+/i, '').trim();
            return { success: true, command: { type: 'PASTE_SCHEDULE', raw: text, args: { text: content } } };
        }

        // 10. LOCK / UNLOCK
        const lockMatch = text.match(/^(lock|unlock)\s+(.+)/i);
        if (lockMatch) {
            const type = lockMatch[1].toLowerCase() === 'lock' ? 'LOCK_BLOCK' : 'UNLOCK_BLOCK';
            const args: LockArgs = { blockId: lockMatch[2].trim() };
            return { success: true, command: { type: type as CommandType, raw: text, args } };
        }

        return {
            success: false,
            error: 'Unknown command. Type "help" for available commands.',
            suggestions: ['help', 'plan', 'status', 'add task ...']
        };
    }

    private static parseAddTask(text: string): ParseResult {
        // Expected: add task <Title> <duration> ...
        // Naive tokenizer
        const parts = text.split(/\s+/);
        // remove "add" and "task"
        if (parts.length < 3) return { success: false, error: 'Task definition too short' };

        // Parse params from the end backwards or search for specific patterns?
        // Let's use regex for specific patterns and assume the rest is title
        let remaining = text.replace(/^add task\s+/i, '');

        // Duration (numbers usually) - strictly speaking we look for single number at start or explicit "30m"
        // Let's rely on regexes to extract structured props, then remove them to find title

        let duration = 30;
        let priority: 1 | 2 | 3 | 4 | 5 = 3;
        let due: string | undefined;
        let energy: 'low' | 'medium' | 'high' | undefined;

        // Extract Priority p1-p5
        const pMatch = remaining.match(/\bp([1-5])\b/);
        if (pMatch) {
            priority = parseInt(pMatch[1]) as any;
            remaining = remaining.replace(pMatch[0], '');
        }

        // Extract Energy
        const eMatch = remaining.match(/\benergy\s+(low|medium|high)\b/i);
        if (eMatch) {
            energy = eMatch[1].toLowerCase() as any;
            remaining = remaining.replace(eMatch[0], '');
        }

        // Extract Due Date
        const dMatch = remaining.match(/\bdue\s+(\d{4}-\d{2}-\d{2})\b/i);
        if (dMatch) {
            due = dMatch[1];
            remaining = remaining.replace(dMatch[0], '');
        }

        // Duration: look for "30m", "1h", or just raw number if it's distinct
        // Note: this is tricky if title has numbers. Let's look for "X m" or "X min"
        const durMatch = remaining.match(/\b(\d+)\s*(m|min|minutes)\b/i);
        if (durMatch) {
            duration = parseInt(durMatch[1]);
            remaining = remaining.replace(durMatch[0], '');
        }

        // Clean up title
        const title = remaining.trim().replace(/\s+/g, ' ');

        if (!title) return { success: false, error: 'Task title missing' };

        const args: AddTaskArgs = { title, duration, priority, due, energy };
        return { success: true, command: { type: 'ADD_TASK', raw: text, args } };
    }

    private static parseAddHabit(text: string): ParseResult {
        // add habit <Name> <dur> <freq> [window]
        // Example: add habit Reading 30m daily evening

        let remaining = text.replace(/^add habit\s+/i, '');

        // Frequency
        let frequency: AddHabitArgs['frequency'] = 'daily';
        const freqMatch = remaining.match(/\b(daily|weekly|(\d+)-times-per-week)\b/i);
        if (freqMatch) {
            if (freqMatch[1] === 'daily') frequency = 'daily';
            else if (freqMatch[1] === 'weekly') frequency = 'weekly';
            else frequency = 'x-times-per-week'; // simplified
            remaining = remaining.replace(freqMatch[0], '');
        }

        // Window
        let window: AddHabitArgs['window'] | undefined;
        const winMatch = remaining.match(/\b(morning|afternoon|evening)\b/i);
        if (winMatch) {
            window = winMatch[1].toLowerCase() as any;
            remaining = remaining.replace(winMatch[0], '');
        }

        // Duration
        let duration = 15;
        const durMatch = remaining.match(/\b(\d+)\s*(m|min|minutes)\b/i);
        if (durMatch) {
            duration = parseInt(durMatch[1]);
            remaining = remaining.replace(durMatch[0], '');
        }

        const name = remaining.trim().replace(/\s+/g, ' ');
        if (!name) return { success: false, error: 'Habit name missing' };

        const args: AddHabitArgs = { name, duration, frequency, window };
        return { success: true, command: { type: 'ADD_HABIT', raw: text, args } };
    }
}
