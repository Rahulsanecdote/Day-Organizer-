/**
 * Centralized Logging Abstraction
 * 
 * Provides environment-aware logging that:
 * - Silences debug/info in production
 * - Always logs errors (can be extended to send to error tracking)
 * - Supports structured context for better debugging
 * 
 * Future: Add integration with Sentry, LogRocket, or similar services
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
    [key: string]: unknown;
}

interface ErrorTrackingConfig {
    enabled: boolean;
    // Future: add service-specific options (dsn, sampleRate, etc.)
}

const isDevelopment = process.env.NODE_ENV === 'development';

// Placeholder for future error tracking integration
const errorTrackingConfig: ErrorTrackingConfig = {
    enabled: false,
};

/**
 * Format log message with optional context
 */
function formatMessage(message: string, context?: LogContext): string {
    if (!context || Object.keys(context).length === 0) {
        return message;
    }
    return `${message} ${JSON.stringify(context)}`;
}

/**
 * Internal log function with level checking
 */
function log(level: LogLevel, message: string, context?: LogContext): void {
    const formattedMessage = formatMessage(message, context);

    switch (level) {
        case 'debug':
            if (isDevelopment) {
                console.log(`[DEBUG] ${formattedMessage}`);
            }
            break;

        case 'info':
            if (isDevelopment) {
                console.log(`[INFO] ${formattedMessage}`);
            }
            break;

        case 'warn':
            if (isDevelopment) {
                console.warn(`[WARN] ${formattedMessage}`);
            }
            // In production, warnings could be sampled and sent to monitoring
            break;

        case 'error':
            // Always log errors, even in production
            console.error(`[ERROR] ${formattedMessage}`);

            // Future: send to error tracking service
            if (errorTrackingConfig.enabled) {
                // sendToErrorTracking(message, context);
            }
            break;
    }
}

/**
 * Logger API
 * 
 * Usage:
 * ```
 * import { logger } from '@/lib/logger';
 * 
 * logger.debug('Processing item', { itemId: '123' });
 * logger.info('User logged in', { userId: 'abc' });
 * logger.warn('Deprecated API used');
 * logger.error('Failed to sync', { table: 'habits', error: err.message });
 * ```
 */
export const logger = {
    /**
     * Debug-level logs (development only)
     * Use for detailed debugging information
     */
    debug: (message: string, context?: LogContext): void => {
        log('debug', message, context);
    },

    /**
     * Info-level logs (development only)
     * Use for general operational information
     */
    info: (message: string, context?: LogContext): void => {
        log('info', message, context);
    },

    /**
     * Warning-level logs (development only, but could be sampled in production)
     * Use for potentially problematic situations
     */
    warn: (message: string, context?: LogContext): void => {
        log('warn', message, context);
    },

    /**
     * Error-level logs (always logged)
     * Use for errors that need attention
     */
    error: (message: string, context?: LogContext): void => {
        log('error', message, context);
    },

    /**
     * Log an error object with optional context
     * Extracts message and stack from Error instances
     */
    logError: (error: unknown, context?: LogContext): void => {
        const errorContext: LogContext = { ...context };

        if (error instanceof Error) {
            errorContext.errorMessage = error.message;
            if (isDevelopment) {
                errorContext.stack = error.stack;
            }
            log('error', error.message, errorContext);
        } else if (typeof error === 'string') {
            log('error', error, errorContext);
        } else {
            log('error', 'Unknown error occurred', { ...errorContext, error });
        }
    },
};

export default logger;
