export type CommandType =
    | 'HELP'
    | 'TODAY_WORK'
    | 'TODAY_FIXED'
    | 'PASTE_SCHEDULE'
    | 'ADD_HABIT'
    | 'ADD_TASK'
    | 'PLAN'
    | 'LOCK_BLOCK'
    | 'UNLOCK_BLOCK'
    | 'EXPORT_JSON'
    | 'STATUS'
    | 'UNKNOWN';

// Union of all possible command argument types
export type CommandArgs =
    | TodayWorkArgs
    | TodayFixedArgs
    | PasteScheduleArgs
    | AddHabitArgs
    | AddTaskArgs
    | LockArgs
    | Record<string, string | number | boolean>;

export interface Command {
    type: CommandType;
    raw: string;
    args?: CommandArgs;
}

export interface ParseResult {
    success: boolean;
    command?: Command;
    error?: string;
    suggestions?: string[];
}

// Execution data can be various types based on command
export type ExecutionData =
    | { habits?: unknown[]; tasks?: unknown[] }
    | { plan?: unknown }
    | { exported?: string }
    | { action?: 'TRIGGER_PLAN' }
    | string
    | null;

export interface ExecutionResult {
    success: boolean;
    message: string;
    data?: ExecutionData;
    undoable?: boolean; // If true, we might store a reverse action (not implemented in v1)
}

// AST payloads
export interface TodayWorkArgs {
    start: string; // HH:MM
    end: string;   // HH:MM
}

export interface TodayFixedArgs {
    title: string;
    start: string; // HH:MM
    end: string;   // HH:MM
}

export interface PasteScheduleArgs {
    text: string;
}

export interface AddHabitArgs {
    name: string;
    duration: number; // minutes
    frequency: 'daily' | 'weekly' | 'x-times-per-week';
    window?: 'morning' | 'afternoon' | 'evening';
}

export interface AddTaskArgs {
    title: string;
    duration: number; // minutes
    priority: 1 | 2 | 3 | 4 | 5;
    due?: string; // YYYY-MM-DD
    energy?: 'low' | 'medium' | 'high';
}

export interface LockArgs {
    blockId: string;
}

// Log entry for DB
export interface AssistantLog {
    id: string;
    timestamp: number;
    inputText: string;
    commandType: CommandType;
    success: boolean;
    resultSummary: string;
}
