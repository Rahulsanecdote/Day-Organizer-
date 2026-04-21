import 'server-only';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { AIBriefingResult } from '@/lib/assistant/types';
import { logger } from '@/lib/logger';

// Initialize Gemini client
const genAI = process.env.GEMINI_API_KEY
    ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    : null;

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

export async function generateMorningBriefingFromScheduleInfo(
    scheduleInfo: unknown,
    currentTime: string
): Promise<AIBriefingResult | null> {
    if (!genAI) {
        return null; // AI not configured
    }

    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

        const result = await model.generateContent({
            contents: [
                {
                    role: 'user',
                    parts: [{
                        text: `${BRIEFING_PROMPT}\n\nUser's schedule for today:\n${JSON.stringify(scheduleInfo, null, 2)}\n\nCurrent time: ${currentTime}`
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
        logger.error('AI briefing generation failed', {
            error: error instanceof Error ? error.message : String(error),
        });
        return null;
    }
}
