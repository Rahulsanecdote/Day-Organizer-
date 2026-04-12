import { NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { sessionOptions, type SessionData } from '@/lib/session';

// Single-use endpoint: returns Google tokens stored in the encrypted session
// after a successful OAuth callback, then clears them.
export async function GET() {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);

    if (!session.googleTokens) {
        return NextResponse.json({ error: 'No tokens available' }, { status: 404 });
    }

    const tokens = session.googleTokens;

    // Clear tokens from session after retrieval — they will live in IndexedDB from here
    delete session.googleTokens;
    await session.save();

    return NextResponse.json(tokens);
}
