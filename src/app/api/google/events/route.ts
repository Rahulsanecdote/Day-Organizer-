import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { GoogleCalendarService } from '@/lib/google-calendar';
import { sessionOptions, type SessionData } from '@/lib/session';
import { logger } from '@/lib/logger';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function POST(request: NextRequest) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    if (typeof body !== 'object' || body === null) {
        return NextResponse.json({ error: 'Request body must be an object' }, { status: 400 });
    }

    const { date, tokens } = body as Record<string, unknown>;
    const targetDate =
        typeof date === 'string' && DATE_RE.test(date)
            ? date
            : new Date().toISOString().split('T')[0];
    const requestTokens =
        typeof tokens === 'object' && tokens !== null
            ? {
                  access_token:
                      typeof (tokens as Record<string, unknown>).access_token === 'string'
                          ? ((tokens as Record<string, unknown>).access_token as string)
                          : '',
                  refresh_token:
                      typeof (tokens as Record<string, unknown>).refresh_token === 'string'
                          ? ((tokens as Record<string, unknown>).refresh_token as string)
                          : undefined,
                  expiry_date:
                      typeof (tokens as Record<string, unknown>).expiry_date === 'number'
                          ? ((tokens as Record<string, unknown>).expiry_date as number)
                          : undefined,
              }
            : undefined;
    const activeTokens = session.googleTokens?.access_token ? session.googleTokens : requestTokens;

    if (!activeTokens?.access_token) {
        return NextResponse.json({ error: 'Not authenticated with Google' }, { status: 401 });
    }

    try {
        const events = await GoogleCalendarService.getEventsForDate(targetDate, activeTokens);
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
