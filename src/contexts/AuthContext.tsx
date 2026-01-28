'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { AuthService, isCloudSyncEnabled } from '@/lib/supabase';
import { DataService } from '@/lib/sync/DataService';

// Error type for auth operations - can be Supabase AuthError or general Error
type AuthOperationError = AuthError | Error | null;

interface AuthContextType {
    user: User | null;
    session: Session | null;
    loading: boolean;
    isCloudEnabled: boolean;
    signIn: (email: string, password: string) => Promise<{ error: AuthOperationError }>;
    signUp: (email: string, password: string) => Promise<{ error: AuthOperationError }>;
    signInWithGoogle: () => Promise<{ error: AuthOperationError }>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const [isCloudEnabled, setIsCloudEnabled] = useState(false);

    useEffect(() => {
        let isMounted = true;

        // Get initial session and cloud status
        const initAuth = async () => {
            // Check cloud sync status after mount to avoid hydration mismatch
            const cloudEnabled = isCloudSyncEnabled();
            if (isMounted) {
                setIsCloudEnabled(cloudEnabled);
            }

            if (!cloudEnabled) {
                if (isMounted) {
                    setLoading(false);
                }
                return;
            }

            const { session } = await AuthService.getSession();
            if (isMounted) {
                setSession(session);
                setUser(session?.user ?? null);
                setLoading(false);
            }
        };

        initAuth();

        // Set up subscription after initial auth check
        const cloudEnabled = isCloudSyncEnabled();
        if (!cloudEnabled) {
            return;
        }

        let unsubscribeRealtime: (() => void) | null = null;

        const { data: { subscription } } = AuthService.onAuthStateChange(
            (event, session) => {
                if (isMounted) {
                    setSession(session);
                    setUser(session?.user ?? null);
                    setLoading(false);

                    // Cleanup previous realtime subscription
                    if (unsubscribeRealtime) {
                        unsubscribeRealtime();
                        unsubscribeRealtime = null;
                    }

                    // Set user ID for DataService and subscribe to realtime changes
                    if (session?.user) {
                        DataService.setUserId(session.user.id);
                        // Perform initial sync to pull user data from cloud
                        DataService.performInitialSync();
                        unsubscribeRealtime = DataService.subscribeToRealtimeChanges();
                    } else {
                        DataService.setUserId(null);
                    }
                }
            }
        );

        return () => {
            isMounted = false;
            subscription.unsubscribe();
            if (unsubscribeRealtime) {
                unsubscribeRealtime();
            }
        };
    }, []);

    const signIn = async (email: string, password: string) => {
        const { error } = await AuthService.signIn(email, password);
        return { error };
    };

    const signUp = async (email: string, password: string) => {
        const { error } = await AuthService.signUp(email, password);
        return { error };
    };

    const signInWithGoogle = async () => {
        const { error } = await AuthService.signInWithGoogle();
        return { error };
    };

    const signOut = async () => {
        await AuthService.signOut();
        setUser(null);
        setSession(null);
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                session,
                loading,
                isCloudEnabled,
                signIn,
                signUp,
                signInWithGoogle,
                signOut,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
