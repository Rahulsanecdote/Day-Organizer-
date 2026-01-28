import { NextRequest, NextResponse } from 'next/server';
import { GoogleCalendarService } from '@/lib/google-calendar';

export async function GET(request: NextRequest) {
    try {
        const url = GoogleCalendarService.getAuthUrl();
        return NextResponse.redirect(url);
    } catch (error) {
        console.error('Failed to generate auth URL:', error);
        return NextResponse.json(
            { error: 'Failed to initialize Google Auth' },
            { status: 500 }
        );
    }
}
