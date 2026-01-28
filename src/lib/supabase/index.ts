// Supabase module exports
export { supabase, isCloudSyncEnabled } from './client';
export { AuthService } from './auth';
export type { AuthResult } from './auth';
export {
    checkRateLimit,
    formatLockoutRemaining,
    type RateLimitCheck
} from './rate-limiter';
