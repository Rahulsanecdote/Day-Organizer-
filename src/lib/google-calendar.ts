import { google, calendar_v3 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

// Environment variables for Google OAuth
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/google/callback';

// Scopes needed for calendar access
const SCOPES = [
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/calendar.events',
];

export interface CalendarEvent {
    id: string;
    title: string;
    start: string; // HH:MM
    end: string;   // HH:MM
    date: string;  // YYYY-MM-DD
    description?: string;
    location?: string;
    isAllDay: boolean;
}

export interface GoogleCalendarTokens {
    access_token: string;
    refresh_token?: string;
    expiry_date?: number;
}

class GoogleCalendarServiceClass {
    private oauth2Client: OAuth2Client | null = null;

    // Check if Google Calendar is configured
    isConfigured(): boolean {
        return !!(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET);
    }

    // Get OAuth2 client
    private getOAuth2Client(): OAuth2Client {
        if (!this.isConfigured()) {
            throw new Error('Google Calendar not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.');
        }

        if (!this.oauth2Client) {
            this.oauth2Client = new google.auth.OAuth2(
                GOOGLE_CLIENT_ID,
                GOOGLE_CLIENT_SECRET,
                GOOGLE_REDIRECT_URI
            );
        }

        return this.oauth2Client;
    }

    // Generate OAuth URL for user authorization
    getAuthUrl(): string {
        const client = this.getOAuth2Client();
        return client.generateAuthUrl({
            access_type: 'offline',
            scope: SCOPES,
            prompt: 'consent', // Force refresh token generation
        });
    }

    // Exchange authorization code for tokens
    async getTokensFromCode(code: string): Promise<GoogleCalendarTokens> {
        const client = this.getOAuth2Client();
        const { tokens } = await client.getToken(code);
        return {
            access_token: tokens.access_token || '',
            refresh_token: tokens.refresh_token || undefined,
            expiry_date: tokens.expiry_date || undefined,
        };
    }

    // Set tokens on OAuth client
    setTokens(tokens: GoogleCalendarTokens): void {
        const client = this.getOAuth2Client();
        client.setCredentials({
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            expiry_date: tokens.expiry_date,
        });
    }

    // Get Calendar API instance
    private getCalendarApi(): calendar_v3.Calendar {
        const client = this.getOAuth2Client();
        return google.calendar({ version: 'v3', auth: client });
    }

    // Fetch events for a specific date
    async getEventsForDate(date: string, tokens: GoogleCalendarTokens): Promise<CalendarEvent[]> {
        this.setTokens(tokens);
        const calendar = this.getCalendarApi();

        const startOfDay = new Date(`${date}T00:00:00`);
        const endOfDay = new Date(`${date}T23:59:59`);

        try {
            const response = await calendar.events.list({
                calendarId: 'primary',
                timeMin: startOfDay.toISOString(),
                timeMax: endOfDay.toISOString(),
                singleEvents: true,
                orderBy: 'startTime',
            });

            const events = response.data.items || [];
            return events.map(event => this.parseGoogleEvent(event, date)).filter((e): e is CalendarEvent => e !== null);
        } catch (error) {
            console.error('Failed to fetch Google Calendar events:', error);
            throw error;
        }
    }

    // Parse Google Calendar event to our format
    private parseGoogleEvent(event: calendar_v3.Schema$Event, defaultDate: string): CalendarEvent | null {
        if (!event.id || !event.summary) return null;

        const isAllDay = !event.start?.dateTime;
        let start = '00:00';
        let end = '23:59';
        let date = defaultDate;

        if (event.start?.dateTime) {
            const startDate = new Date(event.start.dateTime);
            start = `${startDate.getHours().toString().padStart(2, '0')}:${startDate.getMinutes().toString().padStart(2, '0')}`;
            date = startDate.toISOString().split('T')[0];
        } else if (event.start?.date) {
            date = event.start.date;
        }

        if (event.end?.dateTime) {
            const endDate = new Date(event.end.dateTime);
            end = `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`;
        }

        return {
            id: event.id,
            title: event.summary,
            start,
            end,
            date,
            description: event.description || undefined,
            location: event.location || undefined,
            isAllDay,
        };
    }

    // Create an event in Google Calendar
    async createEvent(
        event: Omit<CalendarEvent, 'id'>,
        tokens: GoogleCalendarTokens
    ): Promise<string> {
        this.setTokens(tokens);
        const calendar = this.getCalendarApi();

        const googleEvent: calendar_v3.Schema$Event = {
            summary: event.title,
            description: event.description,
            location: event.location,
            start: event.isAllDay
                ? { date: event.date }
                : { dateTime: `${event.date}T${event.start}:00`, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
            end: event.isAllDay
                ? { date: event.date }
                : { dateTime: `${event.date}T${event.end}:00`, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
        };

        const response = await calendar.events.insert({
            calendarId: 'primary',
            requestBody: googleEvent,
        });

        return response.data.id || '';
    }

    // Update an event in Google Calendar
    async updateEvent(
        eventId: string,
        event: Partial<CalendarEvent>,
        tokens: GoogleCalendarTokens
    ): Promise<void> {
        this.setTokens(tokens);
        const calendar = this.getCalendarApi();

        const updates: calendar_v3.Schema$Event = {};
        if (event.title) updates.summary = event.title;
        if (event.description) updates.description = event.description;
        if (event.location) updates.location = event.location;

        if (event.start && event.end && event.date) {
            updates.start = event.isAllDay
                ? { date: event.date }
                : { dateTime: `${event.date}T${event.start}:00`, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone };
            updates.end = event.isAllDay
                ? { date: event.date }
                : { dateTime: `${event.date}T${event.end}:00`, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone };
        }

        await calendar.events.patch({
            calendarId: 'primary',
            eventId,
            requestBody: updates,
        });
    }

    // Delete an event from Google Calendar
    async deleteEvent(eventId: string, tokens: GoogleCalendarTokens): Promise<void> {
        this.setTokens(tokens);
        const calendar = this.getCalendarApi();

        await calendar.events.delete({
            calendarId: 'primary',
            eventId,
        });
    }
}

// Export singleton instance
export const GoogleCalendarService = new GoogleCalendarServiceClass();
