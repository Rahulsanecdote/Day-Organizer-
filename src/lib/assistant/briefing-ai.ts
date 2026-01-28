import { GoogleGenerativeAI } from '@google/generative-ai';
import { PlanOutput, Habit, Task } from '@/types';

// Initialize Gemini client
const genAI = process.env.GOOGLE_API_KEY
    ? new GoogleGenerativeAI(process.env.GOOGLE_API_KEY)
    : null;

export interface BriefingData {
    plan: PlanOutput;
    habits: Habit[];
    tasks: Task[];
    currentTime: string;
}

export interface AIBriefingResult {
    greeting: string;
    summary: string;
    topPriority: string;
    motivation: string;
    tip: string;
}

const BRIEFING_PROMPT = `You are a friendly productivity assistant. Generate a concise, motivating morning briefing.

Given the user's schedule, create a brief personalized summary. Be encouraging but practical.

Rules:
1. Keep each field to 1-2 sentences max
2. Be specific about the user's actual tasks
3. Use a warm, supportive tone
4. Focus on the most important items

Respond ONLY with valid JSON in this exact format:
{
  "greeting": "Good morning! [personalized greeting based on their day]",
  "summary": "[Brief overview of their day - what they have planned]",
  "topPriority": "[Their most important task/focus for today]",
  "motivation": "[A short encouraging message relevant to their day]",
  "tip": "[One practical productivity tip for their specific schedule]"
}`;

export async function generateMorningBriefing(data: BriefingData): Promise<AIBriefingResult | null> {
    if (!genAI) {
        return null; // AI not configured
    }

    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

        // Format the schedule for the AI
        const scheduleInfo = {
            date: data.plan.date,
            totalBlocks: data.plan.blocks.length,
            tasks: data.plan.blocks.filter(b => b.type === 'task').map(b => ({
                title: b.title,
                time: b.start,
                duration: `${b.end} - ${b.start}`
            })),
            habits: data.plan.blocks.filter(b => b.type === 'habit').map(b => ({
                title: b.title,
                time: b.start
            })),
            fixedEvents: data.plan.blocks.filter(b => b.type === 'appointment' || b.type === 'call').map(b => ({
                title: b.title,
                time: `${b.start} - ${b.end}`
            })),
            pendingTasks: data.tasks.filter(t => !t.isCompleted).length,
            activeHabits: data.habits.filter(h => h.isActive).length
        };

        const result = await model.generateContent({
            contents: [
                {
                    role: 'user',
                    parts: [{
                        text: `${BRIEFING_PROMPT}\n\nUser's schedule for today:\n${JSON.stringify(scheduleInfo, null, 2)}\n\nCurrent time: ${data.currentTime}`
                    }],
                },
            ],
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 512,
            },
        });

        const response = result.response;
        const text = response.text();

        // Extract JSON from response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            return null;
        }

        const parsed = JSON.parse(jsonMatch[0]) as AIBriefingResult;
        return parsed;
    } catch (error) {
        console.error('AI briefing generation failed:', error);
        return null;
    }
}
