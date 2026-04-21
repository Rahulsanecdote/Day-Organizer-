import { NextRequest, NextResponse } from 'next/server';
import { parseWithAI } from '@/lib/assistant/ai-parser';

const MAX_INPUT_LEN = 800;

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

    const input = (body as Record<string, unknown>).input;
    if (typeof input !== 'string') {
        return NextResponse.json({ success: false, error: 'Missing "input" string' }, { status: 400 });
    }

    const trimmed = input.trim();
    if (!trimmed) {
        return NextResponse.json({ success: false, error: 'Empty input' }, { status: 400 });
    }

    if (trimmed.length > MAX_INPUT_LEN) {
        return NextResponse.json(
            { success: false, error: `Input too long (max ${MAX_INPUT_LEN} chars)` },
            { status: 413 }
        );
    }

    const ai = await parseWithAI(trimmed);
    if (!ai.success || !ai.command) {
        return NextResponse.json({ success: false, error: ai.error ?? 'AI parse failed' }, { status: 200 });
    }

    return NextResponse.json({ success: true, command: ai.command }, { status: 200 });
}
