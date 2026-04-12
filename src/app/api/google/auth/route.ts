import { NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { randomBytes } from 'crypto';
import { GoogleCalendarService } from '@/lib/google-calendar';
import { sessionOptions, type SessionData } from '@/lib/session';
import { logger } from '@/lib/logger';

export async function GET() {
    try {
        const session = await getIronSession<SessionData>(await cookies(), sessionOptions);

        // Generate and persist a CSRF state token for this OAuth flow
        const state = randomBytes(32).toString('hex');
        session.csrfState = state;
        await session.save();

        const url = GoogleCalendarService.getAuthUrl(state);
        return NextResponse.redirect(url);
    } catch (error) {
        logger.error('Failed to generate Google auth URL', { error });
        return NextResponse.json({ error: 'Failed to initialize Google Auth' }, { status: 500 });
    }
}
