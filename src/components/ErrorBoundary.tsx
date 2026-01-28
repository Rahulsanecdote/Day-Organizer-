'use client';

import { Component, ReactNode } from 'react';
import { logger } from '@/lib/logger';

interface ErrorBoundaryProps {
    children: ReactNode;
    fallback?: ReactNode;
    onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

/**
 * React Error Boundary component that catches JavaScript errors anywhere
 * in the child component tree, logs those errors, and displays a fallback UI.
 * 
 * Usage:
 * ```tsx
 * <ErrorBoundary fallback={<CustomFallback />}>
 *   <MyComponent />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        // Update state so the next render will show the fallback UI
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
        // Log error to console (could be sent to error reporting service)
        logger.error('ErrorBoundary caught an error', {
            message: error.message,
            stack: error.stack,
            componentStack: errorInfo.componentStack
        });

        // Call optional error handler
        this.props.onError?.(error, errorInfo);
    }

    handleRetry = (): void => {
        this.setState({ hasError: false, error: null });
    };

    render(): ReactNode {
        if (this.state.hasError) {
            // Custom fallback provided
            if (this.props.fallback) {
                return this.props.fallback;
            }

            // Default fallback UI
            return (
                <div
                    className="min-h-[400px] flex items-center justify-center p-8"
                    style={{ background: 'var(--color-cream, #FAF9F7)' }}
                >
                    <div
                        className="max-w-md w-full rounded-xl p-8 text-center"
                        style={{
                            background: 'var(--color-surface, #FFFFFF)',
                            border: '1px solid var(--color-border, #E8E4DF)',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
                        }}
                    >
                        {/* Error Icon */}
                        <div
                            className="w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center"
                            style={{ background: 'rgba(200, 100, 100, 0.1)' }}
                        >
                            <svg
                                className="w-8 h-8"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="#c86464"
                                strokeWidth="1.5"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
                                />
                            </svg>
                        </div>

                        <h2
                            className="text-xl mb-3"
                            style={{
                                fontFamily: 'var(--font-serif, Georgia, serif)',
                                fontWeight: 500,
                                color: 'var(--color-charcoal, #2C2A27)'
                            }}
                        >
                            Something went wrong
                        </h2>

                        <p
                            className="text-sm mb-6"
                            style={{ color: 'var(--color-slate, #6B6560)' }}
                        >
                            We encountered an unexpected error. Don&apos;t worry, your data is safe.
                        </p>

                        {/* Error details (collapsible in production) */}
                        {process.env.NODE_ENV === 'development' && this.state.error && (
                            <details
                                className="mb-6 text-left p-3 rounded-lg text-xs"
                                style={{
                                    background: 'var(--color-ivory, #F5F3EF)',
                                    border: '1px solid var(--color-border-light, #EBE8E4)'
                                }}
                            >
                                <summary
                                    className="cursor-pointer font-medium mb-2"
                                    style={{ color: 'var(--color-stone, #8A8580)' }}
                                >
                                    Error Details (Development)
                                </summary>
                                <pre
                                    className="overflow-auto whitespace-pre-wrap"
                                    style={{ color: '#c86464' }}
                                >
                                    {this.state.error.message}
                                    {'\n\n'}
                                    {this.state.error.stack}
                                </pre>
                            </details>
                        )}

                        <div className="flex gap-3 justify-center">
                            <button
                                onClick={this.handleRetry}
                                className="px-5 py-2.5 rounded-lg text-sm font-medium transition-all"
                                style={{
                                    background: 'linear-gradient(135deg, var(--color-gold, #B8976B) 0%, var(--color-gold-dark, #9A7B52) 100%)',
                                    color: 'white',
                                    boxShadow: '0 2px 8px rgba(184, 151, 107, 0.3)'
                                }}
                            >
                                Try Again
                            </button>
                            <button
                                onClick={() => window.location.reload()}
                                className="px-5 py-2.5 rounded-lg text-sm font-medium transition-all"
                                style={{
                                    background: 'transparent',
                                    color: 'var(--color-stone, #8A8580)',
                                    border: '1px solid var(--color-border, #E8E4DF)'
                                }}
                            >
                                Reload Page
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

/**
 * Minimal error boundary for critical sections that should show
 * a simpler fallback (e.g., sidebar, header)
 */
export class MinimalErrorBoundary extends Component<
    { children: ReactNode; fallbackMessage?: string },
    { hasError: boolean }
> {
    state = { hasError: false };

    static getDerivedStateFromError(): { hasError: boolean } {
        return { hasError: true };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
        logger.error('MinimalErrorBoundary caught error', {
            message: error.message,
            componentStack: errorInfo.componentStack
        });
    }

    render(): ReactNode {
        if (this.state.hasError) {
            return (
                <div
                    className="p-4 text-sm text-center"
                    style={{ color: 'var(--color-mist, #A39E99)' }}
                >
                    {this.props.fallbackMessage || 'Unable to load this section'}
                </div>
            );
        }
        return this.props.children;
    }
}

export default ErrorBoundary;
