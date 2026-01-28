/**
 * Supabase Server-Side Client
 * 
 * Creates a Supabase client for use in Server Components and Route Handlers.
 * Uses cookies for session persistence across requests.
 */

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/types/supabase';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Create a Supabase client for server-side use.
 * This client uses cookies for session management.
 */
export async function createServerSupabaseClient() {
    if (!supabaseUrl || !supabaseAnonKey) {
        return null;
    }

    const cookieStore = await cookies();

    return createServerClient<Database>(
        supabaseUrl,
        supabaseAnonKey,
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value;
                },
                set(name: string, value: string, options: CookieOptions) {
                    try {
                        cookieStore.set({ name, value, ...options });
                    } catch {
                        // The `set` method is called from a Server Component
                        // This can be ignored if we have middleware refreshing sessions
                    }
                },
                remove(name: string, options: CookieOptions) {
                    try {
                        cookieStore.set({ name, value: '', ...options });
                    } catch {
                        // The `remove` method is called from a Server Component
                        // This can be ignored
                    }
                },
            },
        }
    );
}
