import { NextRequest, NextResponse } from 'next/server';
import { generateMorningBriefingFromScheduleInfo } from '@/lib/assistant/briefing-ai';

export async function POST(request: NextRequest) {
    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
    }

    if (typeof body !== 'object' || body === null) {
        return NextResponse.json({ success: false, error: 'Body must be an object' }, { status: 400 });
    }

    const scheduleInfo = (body as Record<string, unknown>).scheduleInfo;
    const currentTime = (body as Record<string, unknown>).currentTime;

    if (typeof currentTime !== 'string' || !currentTime.trim()) {
        return NextResponse.json({ success: false, error: 'Missing "currentTime" string' }, { status: 400 });
    }

    const briefing = await generateMorningBriefingFromScheduleInfo(scheduleInfo, currentTime.trim());
    if (!briefing) {
        return NextResponse.json(
            { success: false, error: 'Briefing unavailable (AI not configured or failed).' },
            { status: 200 }
        );
    }

    return NextResponse.json({ success: true, briefing }, { status: 200 });
}
