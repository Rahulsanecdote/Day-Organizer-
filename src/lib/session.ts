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

// Password is read lazily via a getter so this module can be evaluated at
// build time without SESSION_SECRET being present. The throw only fires when
// an actual request calls getIronSession() and iron-session reads the property.
export const sessionOptions: SessionOptions = {
    get password(): string {
        const secret = process.env.SESSION_SECRET;
        if (!secret) {
            throw new Error(
                'SESSION_SECRET environment variable is not set. Generate one with: openssl rand -base64 32'
            );
        }
        return secret;
    },
    cookieName: 'day-organizer-session',
    cookieOptions: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true, // not accessible via JS — prevents token theft via XSS
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
    },
};
