/* eslint-disable no-console */
/**
 * Centralized Logging Abstraction
 *
 * - Development: readable prefixed output via console methods
 * - Production:  structured JSON written per-line for log aggregation
 *                (Datadog, Axiom, Logtail, etc.)
 *
 * Usage:
 * ```
 * import { logger } from '@/lib/logger';
 *
 * logger.debug('Processing item', { itemId: '123' });
 * logger.info('User logged in', { userId: 'abc' });
 * logger.warn('Deprecated API used');
 * logger.error('Failed to sync', { table: 'habits', error: err.message });
 * logger.logError(err, { table: 'habits' });
 * ```
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
    [key: string]: unknown;
}

interface LogEntry {
    level: LogLevel;
    message: string;
    timestamp: string;
    context?: LogContext;
}

const isDevelopment = process.env.NODE_ENV !== 'production';

function log(level: LogLevel, message: string, context?: LogContext): void {
    // Silence debug/info in production
    if (!isDevelopment && (level === 'debug' || level === 'info')) return;

    const entry: LogEntry = {
        level,
        message,
        timestamp: new Date().toISOString(),
        ...(context && Object.keys(context).length > 0 && { context }),
    };

    if (!isDevelopment) {
        // Structured JSON — one line per entry, suitable for log aggregation
        console.log(JSON.stringify(entry));
        return;
    }

    // Development: human-readable
    const prefix = `[${entry.timestamp}] [${level.toUpperCase()}]`;
    const suffix = entry.context ? entry.context : '';
    switch (level) {
        case 'error': console.error(prefix, message, suffix); break;
        case 'warn':  console.warn(prefix, message, suffix);  break;
        default:      console.log(prefix, message, suffix);   break;
    }
}

export const logger = {
    debug: (message: string, context?: LogContext): void => log('debug', message, context),
    info:  (message: string, context?: LogContext): void => log('info',  message, context),
    warn:  (message: string, context?: LogContext): void => log('warn',  message, context),
    error: (message: string, context?: LogContext): void => log('error', message, context),

    /**
     * Log an Error object with automatic message + stack extraction.
     * Use instead of logger.error when you have a caught error instance.
     */
    logError: (error: unknown, context?: LogContext): void => {
        const ctx: LogContext = { ...context };
        if (error instanceof Error) {
            ctx.error = error.message;
            if (isDevelopment) ctx.stack = error.stack;
            log('error', error.message, ctx);
        } else if (typeof error === 'string') {
            log('error', error, ctx);
        } else {
            log('error', 'Unknown error', { ...ctx, raw: error });
        }
    },
} as const;

export default logger;
