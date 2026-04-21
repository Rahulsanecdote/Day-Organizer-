import { NextRequest, NextResponse } from 'next/server';
import { generateMorningBriefingFromScheduleInfo } from '@/lib/assistant/briefing-ai';

export async function POST(request: NextRequest) {
    let body: unknown;

    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
    }

    if (typeof body !== 'object' || body === null) {
        return NextResponse.json({ error: 'Request body must be an object.' }, { status: 400 });
    }

    const { scheduleInfo, currentTime } = body as Record<string, unknown>;
    if (typeof currentTime !== 'string' || !currentTime.trim()) {
        return NextResponse.json({ error: 'currentTime must be a non-empty string.' }, { status: 400 });
    }

    const briefing = await generateMorningBriefingFromScheduleInfo(scheduleInfo, currentTime);
    return NextResponse.json({ briefing });
}
