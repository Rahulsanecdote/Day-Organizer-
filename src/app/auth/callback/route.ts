/**
 * OAuth Callback Route Handler
 * 
 * Handles the OAuth redirect from Supabase after Google sign-in.
 * Exchanges the authorization code for a session and redirects to the app.
 * 
 * Flow:
 * 1. User clicks "Sign in with Google"
 * 2. Supabase redirects to Google's OAuth consent screen
 * 3. Google redirects back to this route with a code
 * 4. This handler exchanges the code for a session
 * 5. User is redirected to the dashboard
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get('code');
    const error = requestUrl.searchParams.get('error');
    const errorDescription = requestUrl.searchParams.get('error_description');
    const origin = requestUrl.origin;

    // Handle OAuth errors (user denied access, etc.)
    if (error) {
        console.error('OAuth error:', error, errorDescription);
        return NextResponse.redirect(
            `${origin}/login?error=${encodeURIComponent(errorDescription || error)}`
        );
    }

    // If no code is present, redirect to login
    if (!code) {
        return NextResponse.redirect(`${origin}/login?error=No authorization code received`);
    }

    // Create server-side Supabase client
    const supabase = await createServerSupabaseClient();

    if (!supabase) {
        return NextResponse.redirect(`${origin}/login?error=Authentication service unavailable`);
    }

    // Exchange the code for a session
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
        console.error('Session exchange error:', exchangeError);
        return NextResponse.redirect(
            `${origin}/login?error=${encodeURIComponent(exchangeError.message)}`
        );
    }

    // Success! Redirect to the dashboard
    return NextResponse.redirect(`${origin}/today-setup`);
}
