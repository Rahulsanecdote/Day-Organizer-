import { GoogleGenerativeAI } from '@google/generative-ai';
import { CommandType, Command } from '@/lib/assistant/types';

// Initialize Gemini client
const genAI = process.env.GOOGLE_API_KEY
    ? new GoogleGenerativeAI(process.env.GOOGLE_API_KEY)
    : null;

const SYSTEM_PROMPT = `You are a command parser for a daily organization app. Parse natural language into structured commands.

Available command types:
- TODAY_WORK: Set work hours (args: start, end as HH:MM)
- TODAY_FIXED: Add fixed event (args: title, start, end as HH:MM)
- ADD_TASK: Create task (args: title, duration in minutes, priority 1-5, optional due as YYYY-MM-DD, optional energy: low/medium/high)
- ADD_HABIT: Create habit (args: name, duration in minutes, frequency: daily/weekly, optional window: morning/afternoon/evening)
- PLAN: Generate or re-optimize plan (no args)
- STATUS: Show summary (no args)
- HELP: Show help (no args)
- EXPORT_JSON: Export data (no args)

Rules:
1. Extract duration from phrases like "30 minutes", "1 hour", "45m"
2. Convert priority words: urgent/critical=5, high=4, medium=3, low=2, minimal=1
3. Parse dates like "Friday", "tomorrow", "next week" into YYYY-MM-DD format
4. If command is unclear, return type: UNKNOWN

Respond ONLY with valid JSON in this exact format:
{
  "type": "COMMAND_TYPE",
  "args": { ... } // command-specific args, or omit if none
}`;

export interface AIParseResult {
    success: boolean;
    command?: Command;
    error?: string;
}

export async function parseWithAI(input: string): Promise<AIParseResult> {
    if (!genAI) {
        return {
            success: false,
            error: 'AI features not configured. Set GOOGLE_API_KEY in environment.',
        };
    }

    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

        const result = await model.generateContent({
            contents: [
                {
                    role: 'user',
                    parts: [{ text: `${SYSTEM_PROMPT}\n\nParse this command: "${input}"\n\nToday's date is ${new Date().toISOString().split('T')[0]}` }],
                },
            ],
            generationConfig: {
                temperature: 0.1,
                maxOutputTokens: 256,
            },
        });

        const response = result.response;
        const text = response.text();

        // Extract JSON from response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            return {
                success: false,
                error: 'Failed to parse AI response',
            };
        }

        const parsed = JSON.parse(jsonMatch[0]) as {
            type: CommandType;
            args?: Record<string, unknown>;
        };

        // Validate command type
        const validTypes: CommandType[] = [
            'HELP', 'TODAY_WORK', 'TODAY_FIXED', 'PASTE_SCHEDULE',
            'ADD_HABIT', 'ADD_TASK', 'PLAN', 'LOCK_BLOCK',
            'UNLOCK_BLOCK', 'EXPORT_JSON', 'STATUS', 'UNKNOWN'
        ];

        if (!validTypes.includes(parsed.type)) {
            return {
                success: false,
                error: `Unknown command type: ${parsed.type}`,
            };
        }

        if (parsed.type === 'UNKNOWN') {
            return {
                success: false,
                error: 'Could not understand the command. Try "help" for available commands.',
            };
        }

        // Build the command object with proper typing
        const command: Command = {
            type: parsed.type,
            raw: input,
            args: parsed.args as Command['args'],
        };

        return {
            success: true,
            command,
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return {
            success: false,
            error: `AI parsing failed: ${message}`,
        };
    }
}
