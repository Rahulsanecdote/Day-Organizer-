import { NextRequest, NextResponse } from 'next/server';
import { GoogleCalendarService } from '@/lib/google-calendar';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    // Handle OAuth error
    if (error) {
        return NextResponse.redirect(new URL('/profile?google_error=' + error, request.url));
    }

    if (!code) {
        return NextResponse.redirect(new URL('/profile?google_error=no_code', request.url));
    }

    try {
        // Exchange code for tokens
        const tokens = await GoogleCalendarService.getTokensFromCode(code);

        // Pass tokens to client via URL fragment (so they're not sent to server in subsequent requests)
        // Note: In a production app, we might want to encrypt this or use a temporary session cookie.
        // Since we're local-first, we'll send them back to be stored in IndexedDB.
        const tokenString = encodeURIComponent(JSON.stringify(tokens));

        return NextResponse.redirect(new URL(`/profile?google_connected=true&tokens=${tokenString}`, request.url));
    } catch (error) {
        console.error('Failed to exchange token:', error);
        return NextResponse.redirect(new URL('/profile?google_error=token_exchange_failed', request.url));
    }
}
