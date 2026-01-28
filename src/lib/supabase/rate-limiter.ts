/**
 * Client-side rate limiter for authentication attempts.
 * 
 * Provides brute-force protection by:
 * - Tracking failed login attempts per email
 * - Implementing exponential backoff delays
 * - Enforcing temporary lockouts after max attempts
 * 
 * LIMITATIONS vs Server-Side Rate Limiting:
 * - Can be bypassed by clearing localStorage or using incognito mode
 * - Does not protect against distributed attacks from multiple clients
 * - Should be used IN ADDITION TO server-side rate limiting (Supabase provides this)
 * 
 * This provides UX improvements and deters casual attackers.
 * For production security, ensure Supabase project has rate limiting enabled.
 */

// Rate limiting constants
const RATE_LIMIT_CONFIG = {
    maxAttempts: 5,                    // Max failed attempts before lockout
    lockoutDuration: 15 * 60 * 1000,   // 15 minutes lockout
    baseDelay: 1000,                   // 1 second initial delay
    maxDelay: 30000,                   // 30 seconds max delay
    storageKey: 'auth_rate_limit',     // localStorage key
};

interface RateLimitState {
    failedAttempts: number;
    lastAttemptAt: number;
    lockedUntil: number;
    email: string;
}

/**
 * Get rate limit state from localStorage
 */
function getRateLimitState(email: string): RateLimitState {
    try {
        const stored = localStorage.getItem(RATE_LIMIT_CONFIG.storageKey);
        if (stored) {
            const state: RateLimitState = JSON.parse(stored);
            // Only return state if it's for the same email
            if (state.email === email) {
                return state;
            }
        }
    } catch {
        // Ignore parse errors, return fresh state
    }

    return {
        failedAttempts: 0,
        lastAttemptAt: 0,
        lockedUntil: 0,
        email,
    };
}

/**
 * Save rate limit state to localStorage
 */
function saveRateLimitState(state: RateLimitState): void {
    try {
        localStorage.setItem(RATE_LIMIT_CONFIG.storageKey, JSON.stringify(state));
    } catch {
        // Ignore storage errors (e.g., private browsing mode)
    }
}

/**
 * Clear rate limit state (call on successful login)
 */
export function clearRateLimitState(): void {
    try {
        localStorage.removeItem(RATE_LIMIT_CONFIG.storageKey);
    } catch {
        // Ignore errors
    }
}

/**
 * Calculate exponential backoff delay.
 * Formula: min(baseDelay * 2^(attempts-1), maxDelay)
 * 
 * Attempts: 1 → 1s, 2 → 2s, 3 → 4s, 4 → 8s, 5 → 16s (then lockout)
 */
function calculateBackoffDelay(failedAttempts: number): number {
    if (failedAttempts <= 0) return 0;

    const delay = RATE_LIMIT_CONFIG.baseDelay * Math.pow(2, failedAttempts - 1);
    return Math.min(delay, RATE_LIMIT_CONFIG.maxDelay);
}

/**
 * Format remaining lockout time for display
 */
export function formatLockoutRemaining(lockedUntil: number): string {
    const remaining = lockedUntil - Date.now();
    if (remaining <= 0) return '';

    const minutes = Math.ceil(remaining / 60000);
    if (minutes === 1) return '1 minute';
    return `${minutes} minutes`;
}

export interface RateLimitCheck {
    allowed: boolean;
    lockedUntil: number;
    remainingAttempts: number;
    waitMs: number;
    message: string;
}

/**
 * Check if a login attempt is allowed.
 * Returns status and any required wait time.
 */
export function checkRateLimit(email: string): RateLimitCheck {
    const state = getRateLimitState(email);
    const now = Date.now();

    // Check if currently locked out
    if (state.lockedUntil > now) {
        const remainingMinutes = formatLockoutRemaining(state.lockedUntil);
        return {
            allowed: false,
            lockedUntil: state.lockedUntil,
            remainingAttempts: 0,
            waitMs: state.lockedUntil - now,
            message: `Too many failed attempts. Try again in ${remainingMinutes}.`,
        };
    }

    // Check if we need to wait for backoff delay
    if (state.failedAttempts > 0) {
        const backoffDelay = calculateBackoffDelay(state.failedAttempts);
        const nextAllowedAt = state.lastAttemptAt + backoffDelay;

        if (now < nextAllowedAt) {
            const waitSeconds = Math.ceil((nextAllowedAt - now) / 1000);
            return {
                allowed: false,
                lockedUntil: 0,
                remainingAttempts: RATE_LIMIT_CONFIG.maxAttempts - state.failedAttempts,
                waitMs: nextAllowedAt - now,
                message: `Please wait ${waitSeconds} second${waitSeconds > 1 ? 's' : ''} before trying again.`,
            };
        }
    }

    return {
        allowed: true,
        lockedUntil: 0,
        remainingAttempts: RATE_LIMIT_CONFIG.maxAttempts - state.failedAttempts,
        waitMs: 0,
        message: '',
    };
}

/**
 * Record a failed login attempt.
 * Call this after authentication fails.
 */
export function recordFailedAttempt(email: string): RateLimitCheck {
    const state = getRateLimitState(email);
    const now = Date.now();

    state.failedAttempts += 1;
    state.lastAttemptAt = now;

    // Check if we've hit the lockout threshold
    if (state.failedAttempts >= RATE_LIMIT_CONFIG.maxAttempts) {
        state.lockedUntil = now + RATE_LIMIT_CONFIG.lockoutDuration;
        state.failedAttempts = 0; // Reset for after lockout
        saveRateLimitState(state);

        const remainingMinutes = formatLockoutRemaining(state.lockedUntil);
        return {
            allowed: false,
            lockedUntil: state.lockedUntil,
            remainingAttempts: 0,
            waitMs: RATE_LIMIT_CONFIG.lockoutDuration,
            message: `Too many failed attempts. Account locked for ${remainingMinutes}.`,
        };
    }

    saveRateLimitState(state);
    const nextBackoff = calculateBackoffDelay(state.failedAttempts);

    return {
        allowed: true,
        lockedUntil: 0,
        remainingAttempts: RATE_LIMIT_CONFIG.maxAttempts - state.failedAttempts,
        waitMs: nextBackoff,
        message: `${RATE_LIMIT_CONFIG.maxAttempts - state.failedAttempts} attempts remaining.`,
    };
}

/**
 * Record a successful login.
 * Clears all rate limit state for security.
 */
export function recordSuccessfulLogin(): void {
    clearRateLimitState();
}
