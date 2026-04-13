import { NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { sessionOptions, type SessionData } from '@/lib/session';

export async function POST() {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    delete session.googleTokens;
    await session.save();
    return NextResponse.json({ success: true });
}
