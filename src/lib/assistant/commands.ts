import { CommandType } from './types';

export interface CommandDefinition {
    type: CommandType;
    description: string;
    usage: string;
    examples: string[];
}

export const COMMAND_DEFINITIONS: Record<CommandType, CommandDefinition> = {
    HELP: {
        type: 'HELP',
        description: 'Show available commands',
        usage: 'help',
        examples: ['help', '?']
    },
    TODAY_WORK: {
        type: 'TODAY_WORK',
        description: 'Set work hours for today',
        usage: 'today work <start>-<end>',
        examples: ['today work 09:00-17:00']
    },
    TODAY_FIXED: {
        type: 'TODAY_FIXED',
        description: 'Add a fixed event to today\'s schedule',
        usage: 'today add fixed <Title> <start>-<end>',
        examples: ['today add fixed Lunch 12:00-13:00']
    },
    PASTE_SCHEDULE: {
        type: 'PASTE_SCHEDULE',
        description: 'Paste a text schedule to parse fixed events',
        usage: 'paste <text>',
        examples: ['paste Meeting 10am-11am; Lunch 1pm-2pm']
    },
    ADD_HABIT: {
        type: 'ADD_HABIT',
        description: 'Create a new habit',
        usage: 'add habit <Name> <duration> <frequency> [window]',
        examples: ['add habit Meditation 15m daily morning']
    },
    ADD_TASK: {
        type: 'ADD_TASK',
        description: 'Create a new task',
        usage: 'add task <Title> <duration> [p1-5] [due YYYY-MM-DD]',
        examples: ['add task "Write Report" 45m p5 due 2023-12-31']
    },
    PLAN: {
        type: 'PLAN',
        description: 'Generate or re-optimize today\'s plan',
        usage: 'plan',
        examples: ['plan', 'optimize']
    },
    LOCK_BLOCK: {
        type: 'LOCK_BLOCK',
        description: 'Lock a specific block (not fully implemented via CLI yet)',
        usage: 'lock <blockId>',
        examples: ['lock work-block-1']
    },
    UNLOCK_BLOCK: {
        type: 'UNLOCK_BLOCK',
        description: 'Unlock a specific block',
        usage: 'unlock <blockId>',
        examples: ['unlock work-block-1']
    },
    EXPORT_JSON: {
        type: 'EXPORT_JSON',
        description: 'Export all data as JSON',
        usage: 'export json',
        examples: ['export']
    },
    STATUS: {
        type: 'STATUS',
        description: 'Show status summary',
        usage: 'status',
        examples: ['status']
    },
    UNKNOWN: {
        type: 'UNKNOWN',
        description: 'Unknown command',
        usage: '',
        examples: []
    }
};
