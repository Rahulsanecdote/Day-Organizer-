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

export interface Command {
    type: CommandType;
    raw: string;
    args?: Record<string, any>;
}

export interface ParseResult {
    success: boolean;
    command?: Command;
    error?: string;
    suggestions?: string[];
}

export interface ExecutionResult {
    success: boolean;
    message: string;
    data?: any;
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
