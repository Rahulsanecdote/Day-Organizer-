'use client';

import { AuthProvider } from '@/contexts/AuthContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <AuthProvider>
            <ErrorBoundary>
                {children}
            </ErrorBoundary>
        </AuthProvider>
    );
}
