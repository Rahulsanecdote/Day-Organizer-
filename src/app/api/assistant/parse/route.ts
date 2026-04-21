import { NextRequest, NextResponse } from 'next/server';
import { parseWithAI } from '@/lib/assistant/ai-parser';

export async function POST(request: NextRequest) {
    let body: unknown;

    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ success: false, error: 'Invalid JSON body.' }, { status: 400 });
    }

    if (typeof body !== 'object' || body === null) {
        return NextResponse.json(
            { success: false, error: 'Request body must be an object.' },
            { status: 400 }
        );
    }

    const { input } = body as Record<string, unknown>;
    if (typeof input !== 'string' || !input.trim()) {
        return NextResponse.json(
            { success: false, error: 'Input must be a non-empty string.' },
            { status: 400 }
        );
    }

    const result = await parseWithAI(input);
    return NextResponse.json(result);
}
