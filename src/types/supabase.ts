// Generated Supabase types - Update this after running supabase gen types
// For now, using a minimal type definition

export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[];

export interface Database {
    public: {
        Tables: {
            profiles: {
                Row: {
                    id: string;
                    display_name: string | null;
                    timezone: string;
                    onboarding_completed: boolean;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id: string;
                    display_name?: string | null;
                    timezone?: string;
                    onboarding_completed?: boolean;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    display_name?: string | null;
                    timezone?: string;
                    onboarding_completed?: boolean;
                    created_at?: string;
                    updated_at?: string;
                };
            };
            habits: {
                Row: {
                    id: string;
                    user_id: string;
                    name: string;
                    duration: number;
                    frequency: string;
                    specific_days: number[] | null;
                    times_per_week: number | null;
                    preferred_time_window: string | null;
                    explicit_start_time: string | null;
                    explicit_end_time: string | null;
                    priority: number;
                    flexibility: string;
                    minimum_viable_duration: number | null;
                    cooldown_days: number | null;
                    energy_level: string;
                    category: string;
                    is_active: boolean;
                    created_at: string;
                    updated_at: string;
                    local_id: string | null;
                    version: number;
                    deleted_at: string | null;
                };
                Insert: {
                    id?: string;
                    user_id: string;
                    name: string;
                    duration: number;
                    frequency: string;
                    specific_days?: number[] | null;
                    times_per_week?: number | null;
                    preferred_time_window?: string | null;
                    explicit_start_time?: string | null;
                    explicit_end_time?: string | null;
                    priority: number;
                    flexibility?: string;
                    minimum_viable_duration?: number | null;
                    cooldown_days?: number | null;
                    energy_level?: string;
                    category: string;
                    is_active?: boolean;
                    created_at?: string;
                    updated_at?: string;
                    local_id?: string | null;
                    version?: number;
                    deleted_at?: string | null;
                };
                Update: Partial<Database['public']['Tables']['habits']['Insert']>;
            };
            tasks: {
                Row: {
                    id: string;
                    user_id: string;
                    title: string;
                    description: string | null;
                    estimated_duration: number;
                    due_date: string | null;
                    priority: number;
                    category: string;
                    energy_level: string;
                    time_window_preference: string | null;
                    is_splittable: boolean;
                    chunk_size: number | null;
                    dependencies: string[] | null;
                    is_completed: boolean;
                    is_active: boolean;
                    created_at: string;
                    updated_at: string;
                    version: number;
                    deleted_at: string | null;
                };
                Insert: {
                    id?: string;
                    user_id: string;
                    title: string;
                    description?: string | null;
                    estimated_duration: number;
                    due_date?: string | null;
                    priority: number;
                    category: string;
                    energy_level?: string;
                    time_window_preference?: string | null;
                    is_splittable?: boolean;
                    chunk_size?: number | null;
                    dependencies?: string[] | null;
                    is_completed?: boolean;
                    is_active?: boolean;
                    created_at?: string;
                    updated_at?: string;
                    version?: number;
                    deleted_at?: string | null;
                };
                Update: Partial<Database['public']['Tables']['tasks']['Insert']>;
            };
            daily_inputs: {
                Row: {
                    id: string;
                    user_id: string;
                    date: string;
                    sleep_start: string;
                    sleep_end: string;
                    fixed_events: Json;
                    constraints: Json;
                    created_at: string;
                    updated_at: string;
                    version: number;
                };
                Insert: {
                    id?: string;
                    user_id: string;
                    date: string;
                    sleep_start: string;
                    sleep_end: string;
                    fixed_events?: Json;
                    constraints: Json;
                    created_at?: string;
                    updated_at?: string;
                    version?: number;
                };
                Update: Partial<Database['public']['Tables']['daily_inputs']['Insert']>;
            };
            plans: {
                Row: {
                    id: string;
                    user_id: string;
                    date: string;
                    blocks: Json;
                    unscheduled: Json;
                    explanation: string | null;
                    stats: Json | null;
                    next_day_suggestions: Json;
                    created_at: string;
                    updated_at: string;
                    version: number;
                };
                Insert: {
                    id?: string;
                    user_id: string;
                    date: string;
                    blocks: Json;
                    unscheduled?: Json;
                    explanation?: string | null;
                    stats?: Json | null;
                    next_day_suggestions?: Json;
                    created_at?: string;
                    updated_at?: string;
                    version?: number;
                };
                Update: Partial<Database['public']['Tables']['plans']['Insert']>;
            };
            user_preferences: {
                Row: {
                    id: string;
                    user_id: string;
                    default_sleep_start: string;
                    default_sleep_end: string;
                    default_buffers: number;
                    default_downtime_protection: number;
                    gym_settings: Json | null;
                    theme: string;
                    notifications: Json | null;
                    created_at: string;
                    updated_at: string;
                    version: number;
                };
                Insert: {
                    id?: string;
                    user_id: string;
                    default_sleep_start?: string;
                    default_sleep_end?: string;
                    default_buffers?: number;
                    default_downtime_protection?: number;
                    gym_settings?: Json | null;
                    theme?: string;
                    notifications?: Json | null;
                    created_at?: string;
                    updated_at?: string;
                    version?: number;
                };
                Update: Partial<Database['public']['Tables']['user_preferences']['Insert']>;
            };
        };
        Views: Record<string, never>;
        Functions: Record<string, never>;
        Enums: Record<string, never>;
    };
}
