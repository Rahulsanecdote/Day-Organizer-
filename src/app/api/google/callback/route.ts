import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { GoogleCalendarService } from '@/lib/google-calendar';
import { sessionOptions, type SessionData } from '@/lib/session';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
        logger.warn('Google OAuth error returned by provider', { error });
        // Whitelist known OAuth error codes — never reflect raw provider input into the URL
        const KNOWN_ERRORS = new Set([
            'access_denied',
            'invalid_request',
            'invalid_client',
            'invalid_grant',
            'unauthorized_client',
            'unsupported_response_type',
            'server_error',
            'temporarily_unavailable',
        ]);
        const safeError = KNOWN_ERRORS.has(error) ? error : 'unknown';
        return NextResponse.redirect(new URL(`/profile?google_error=${safeError}`, request.url));
    }

    if (!code) {
        return NextResponse.redirect(new URL('/profile?google_error=no_code', request.url));
    }

    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);

    // CSRF: validate state parameter matches what we stored at auth initiation
    if (!session.csrfState || session.csrfState !== state) {
        logger.warn('Google OAuth CSRF state mismatch');
        return NextResponse.redirect(new URL('/profile?google_error=csrf_mismatch', request.url));
    }

    // Clear the CSRF state — it's single-use
    delete session.csrfState;

    try {
        const tokens = await GoogleCalendarService.getTokensFromCode(code);

        // Store tokens in the encrypted httpOnly session cookie — never in the URL
        session.googleTokens = {
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            expiry_date: tokens.expiry_date,
        };
        await session.save();

        // Clean redirect: no tokens anywhere in the URL
        return NextResponse.redirect(new URL('/profile?google_connected=true', request.url));
    } catch (err) {
        logger.error('Failed to exchange Google OAuth code for tokens', { err });
        return NextResponse.redirect(
            new URL('/profile?google_error=token_exchange_failed', request.url)
        );
    }
}
