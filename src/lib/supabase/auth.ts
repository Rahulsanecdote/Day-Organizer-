// Authentication service for Supabase
import { supabase, isCloudSyncEnabled } from './client';
import type { User, Session, AuthError } from '@supabase/supabase-js';
import {
    checkRateLimit,
    recordFailedAttempt,
    recordSuccessfulLogin,
    type RateLimitCheck
} from './rate-limiter';

export interface AuthResult {
    user: User | null;
    session: Session | null;
    error: AuthError | null;
    rateLimit?: RateLimitCheck;
}

export const AuthService = {
    // Check if auth is available
    isAvailable: (): boolean => isCloudSyncEnabled(),

    // Sign up with email and password
    signUp: async (email: string, password: string): Promise<AuthResult> => {
        if (!supabase) {
            return { user: null, session: null, error: { message: 'Cloud sync not configured', name: 'ConfigError' } as AuthError };
        }

        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                },
            },
        });

        return {
            user: data.user,
            session: data.session,
            error,
        };
    },

    // Sign in with email and password (rate-limited)
    signIn: async (email: string, password: string): Promise<AuthResult> => {
        if (!supabase) {
            return { user: null, session: null, error: { message: 'Cloud sync not configured', name: 'ConfigError' } as AuthError };
        }

        // Check rate limit before attempting login
        const rateLimitCheck = checkRateLimit(email);
        if (!rateLimitCheck.allowed) {
            return {
                user: null,
                session: null,
                error: {
                    message: rateLimitCheck.message,
                    name: 'RateLimitError',
                    status: 429,
                } as AuthError,
                rateLimit: rateLimitCheck,
            };
        }

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        // Handle result for rate limiting
        if (error) {
            // Only count auth failures, not network errors
            if (error.message?.includes('Invalid login credentials') ||
                error.message?.includes('invalid_credentials')) {
                const updatedRateLimit = recordFailedAttempt(email);
                return {
                    user: null,
                    session: null,
                    error,
                    rateLimit: updatedRateLimit,
                };
            }
            return { user: null, session: null, error };
        }

        // Success - clear rate limit state
        recordSuccessfulLogin();
        return {
            user: data.user,
            session: data.session,
            error: null,
        };
    },

    // Sign in with Google OAuth
    signInWithGoogle: async (): Promise<{ error: AuthError | null }> => {
        if (!supabase) {
            return { error: { message: 'Cloud sync not configured', name: 'ConfigError' } as AuthError };
        }

        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
            },
        });

        return { error };
    },

    // Sign out
    signOut: async (): Promise<{ error: AuthError | null }> => {
        if (!supabase) {
            return { error: null };
        }

        const { error } = await supabase.auth.signOut();
        return { error };
    },

    // Get current session
    getSession: async (): Promise<{ session: Session | null; error: AuthError | null }> => {
        if (!supabase) {
            return { session: null, error: null };
        }

        const { data, error } = await supabase.auth.getSession();
        return { session: data.session, error };
    },

    // Get current user
    getUser: async (): Promise<{ user: User | null; error: AuthError | null }> => {
        if (!supabase) {
            return { user: null, error: null };
        }

        const { data, error } = await supabase.auth.getUser();
        return { user: data.user, error };
    },

    // Listen for auth state changes
    onAuthStateChange: (callback: (event: string, session: Session | null) => void) => {
        if (!supabase) {
            return { data: { subscription: { unsubscribe: () => { } } } };
        }

        return supabase.auth.onAuthStateChange((event, session) => {
            callback(event, session);
        });
    },

    // Send password reset email
    resetPassword: async (email: string): Promise<{ error: AuthError | null }> => {
        if (!supabase) {
            return { error: { message: 'Cloud sync not configured', name: 'ConfigError' } as AuthError };
        }

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/auth/reset-password`,
        });

        return { error };
    },

    // Update password
    updatePassword: async (newPassword: string): Promise<{ error: AuthError | null }> => {
        if (!supabase) {
            return { error: { message: 'Cloud sync not configured', name: 'ConfigError' } as AuthError };
        }

        const { error } = await supabase.auth.updateUser({
            password: newPassword,
        });

        return { error };
    },
};
