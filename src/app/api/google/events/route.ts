import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { GoogleCalendarService } from '@/lib/google-calendar';
import { sessionOptions, type SessionData } from '@/lib/session';
import { logger } from '@/lib/logger';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function POST(request: NextRequest) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);

    if (!session.googleTokens?.access_token) {
        return NextResponse.json({ error: 'Not authenticated with Google' }, { status: 401 });
    }

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    if (typeof body !== 'object' || body === null) {
        return NextResponse.json({ error: 'Request body must be an object' }, { status: 400 });
    }

    const { date } = body as Record<string, unknown>;
    const targetDate =
        typeof date === 'string' && DATE_RE.test(date)
            ? date
            : new Date().toISOString().split('T')[0];

    try {
        const events = await GoogleCalendarService.getEventsForDate(
            targetDate,
            session.googleTokens
        );
        return NextResponse.json({ events });
    } catch (error) {
        logger.error('Failed to fetch Google Calendar events', {
            error: error instanceof Error ? error.message : String(error),
        });

        if (error instanceof Error && error.message.includes('invalid_grant')) {
            return NextResponse.json(
                { error: 'Token expired', code: 'TOKEN_EXPIRED' },
                { status: 401 }
            );
        }

        return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
    }
}
