import { SessionOptions } from 'iron-session';

export interface SessionData {
    googleTokens?: {
        access_token: string;
        refresh_token?: string;
        expiry_date?: number;
        token_type?: string;
        scope?: string;
    };
    // CSRF state stored during OAuth initiation, validated on callback
    csrfState?: string;
}

const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) {
    throw new Error(
        'SESSION_SECRET environment variable is not set. Generate one with: openssl rand -base64 32'
    );
}

export const sessionOptions: SessionOptions = {
    password: sessionSecret,
    cookieName: 'day-organizer-session',
    cookieOptions: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true, // not accessible via JS — prevents token theft via XSS
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
    },
};
