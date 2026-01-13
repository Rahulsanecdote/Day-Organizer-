import { AssistantParser } from '../lib/assistant/parser';

describe('AssistantParser', () => {
    test('parses HELP command', () => {
        const result = AssistantParser.parse('help');
        expect(result.success).toBe(true);
        expect(result.command?.type).toBe('HELP');
    });

    test('parses TODAY_WORK command', () => {
        const result = AssistantParser.parse('today work 09:00-17:00');
        expect(result.success).toBe(true);
        expect(result.command?.type).toBe('TODAY_WORK');
        expect(result.command?.args).toEqual({ start: '09:00', end: '17:00' });
    });

    test('parses TODAY_FIXED command', () => {
        const result = AssistantParser.parse('today add fixed Lunch Meeting 12:00-13:30');
        expect(result.success).toBe(true);
        expect(result.command?.type).toBe('TODAY_FIXED');
        expect(result.command?.args).toEqual({
            title: 'Lunch Meeting',
            start: '12:00',
            end: '13:30'
        });
    });

    test('parses ADD_HABIT command', () => {
        const result = AssistantParser.parse('add habit Reading 30m daily evening');
        expect(result.success).toBe(true);
        expect(result.command?.type).toBe('ADD_HABIT');
        expect(result.command?.args).toEqual({
            name: 'Reading',
            duration: 30,
            frequency: 'daily',
            window: 'evening'
        });
    });

    test('parses ADD_TASK command', () => {
        const result = AssistantParser.parse('add task Write Report 45m p1 due 2023-12-31 energy high');
        expect(result.success).toBe(true);
        expect(result.command?.type).toBe('ADD_TASK');
        expect(result.command?.args).toEqual({
            title: 'Write Report',
            duration: 45,
            priority: 1,
            due: '2023-12-31',
            energy: 'high'
        });
    });

    test('parses PASTE_SCHEDULE command', () => {
        const text = 'Meeting 10am-11am; Lunch 1pm-2pm';
        const result = AssistantParser.parse(`paste ${text}`);
        expect(result.success).toBe(true);
        expect(result.command?.type).toBe('PASTE_SCHEDULE');
        expect(result.command?.args).toEqual({ text });
    });

    test('handles unknown commands', () => {
        const result = AssistantParser.parse('foobar');
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
    });
});
