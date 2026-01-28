import { NextRequest, NextResponse } from 'next/server';
import { GoogleCalendarService, GoogleCalendarTokens } from '@/lib/google-calendar';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { tokens, start, end } = body;

        if (!tokens || !tokens.access_token) {
            return NextResponse.json(
                { error: 'Missing tokens' },
                { status: 401 }
            );
        }

        // Validate date range
        if (!start || !end) {
            // Default to today if not provided
            const today = new Date().toISOString().split('T')[0];
            const events = await GoogleCalendarService.getEventsForDate(today, tokens as GoogleCalendarTokens);
            return NextResponse.json({ events });
        }

        // Fetch events for range (for now just single day is supported by the service method, 
        // need to update service or just call it for the specific day)
        // The service method `getEventsForDate` takes a single date string YYYY-MM-DD.
        // If we want range, we might need to iterate or update service.
        // Let's assume the client passes a specific 'date' for now primarily.

        const date = start.split('T')[0];
        const events = await GoogleCalendarService.getEventsForDate(date, tokens as GoogleCalendarTokens);

        return NextResponse.json({ events });

    } catch (error) {
        console.error('Failed to fetch calendar events:', error);

        // Check if token expired
        if (error instanceof Error && error.message.includes('invalid_grant')) {
            return NextResponse.json(
                { error: 'Token expired', code: 'TOKEN_EXPIRED' },
                { status: 401 }
            );
        }

        return NextResponse.json(
            { error: 'Failed to fetch events' },
            { status: 500 }
        );
    }
}
