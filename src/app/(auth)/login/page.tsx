'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        // Simulate login - in production, connect to your auth service
        setTimeout(() => {
            setIsLoading(false);
            window.location.href = '/today-setup';
        }, 1500);
    };

    return (
        <div
            className="min-h-screen flex"
            style={{ background: 'var(--color-cream)' }}
        >
            {/* Left side - Branding */}
            <div
                className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12"
                style={{
                    background: 'linear-gradient(135deg, var(--color-charcoal) 0%, #1a1917 100%)'
                }}
            >
                <div>
                    <h1
                        className="text-4xl text-white"
                        style={{ fontFamily: 'var(--font-serif)', fontWeight: 500 }}
                    >
                        Daily Organizer
                    </h1>
                    <p
                        className="mt-2 text-lg"
                        style={{ color: 'var(--color-gold-light)' }}
                    >
                        Curate your perfect day
                    </p>
                </div>

                <div className="space-y-8">
                    <div
                        className="p-8 rounded-2xl"
                        style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            backdropFilter: 'blur(10px)',
                            border: '1px solid rgba(255, 255, 255, 0.1)'
                        }}
                    >
                        <p
                            className="text-xl leading-relaxed"
                            style={{
                                fontFamily: 'var(--font-serif)',
                                color: 'rgba(255, 255, 255, 0.9)',
                                fontStyle: 'italic'
                            }}
                        >
                            "The key is not to prioritize what's on your schedule, but to schedule your priorities."
                        </p>
                        <p
                            className="mt-4 text-sm"
                            style={{ color: 'var(--color-gold)' }}
                        >
                            — Stephen Covey
                        </p>
                    </div>

                    <div className="flex items-center gap-6">
                        {['Plan intelligently', 'Track habits', 'Achieve more'].map((feature, index) => (
                            <div key={index} className="flex items-center gap-2">
                                <span
                                    className="w-1.5 h-1.5 rounded-full"
                                    style={{ background: 'var(--color-gold)' }}
                                />
                                <span style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.875rem' }}>
                                    {feature}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                <p
                    className="text-xs"
                    style={{ color: 'rgba(255, 255, 255, 0.4)' }}
                >
                    © 2024 Daily Organizer. All rights reserved.
                </p>
            </div>

            {/* Right side - Login Form */}
            <div className="flex-1 flex items-center justify-center p-8">
                <div className="w-full max-w-md">
                    {/* Mobile Logo */}
                    <div className="lg:hidden text-center mb-10">
                        <h1
                            className="text-3xl"
                            style={{
                                fontFamily: 'var(--font-serif)',
                                fontWeight: 500,
                                color: 'var(--color-charcoal)'
                            }}
                        >
                            Daily Organizer
                        </h1>
                        <p style={{ color: 'var(--color-slate)', marginTop: '0.5rem' }}>
                            Curate your perfect day
                        </p>
                    </div>

                    <div
                        className="rounded-2xl p-10"
                        style={{
                            background: 'var(--color-surface)',
                            border: '1px solid var(--color-border)',
                            boxShadow: 'var(--shadow-medium)'
                        }}
                    >
                        <div className="text-center mb-8">
                            <h2
                                className="text-2xl"
                                style={{
                                    fontFamily: 'var(--font-serif)',
                                    fontWeight: 500,
                                    color: 'var(--color-charcoal)'
                                }}
                            >
                                Welcome back
                            </h2>
                            <p
                                className="mt-2"
                                style={{ color: 'var(--color-slate)' }}
                            >
                                Sign in to continue your journey
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label
                                    className="block text-xs uppercase tracking-wider mb-2"
                                    style={{ color: 'var(--color-mist)' }}
                                >
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="w-full px-4 py-3.5 rounded-lg text-sm focus:outline-none transition-all duration-200"
                                    style={{
                                        background: 'var(--color-ivory)',
                                        border: '1px solid var(--color-border)',
                                        color: 'var(--color-charcoal)'
                                    }}
                                    placeholder="you@example.com"
                                />
                            </div>

                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label
                                        className="block text-xs uppercase tracking-wider"
                                        style={{ color: 'var(--color-mist)' }}
                                    >
                                        Password
                                    </label>
                                    <button
                                        type="button"
                                        className="text-xs transition-colors"
                                        style={{ color: 'var(--color-gold)' }}
                                    >
                                        Forgot password?
                                    </button>
                                </div>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        className="w-full px-4 py-3.5 rounded-lg text-sm focus:outline-none transition-all duration-200 pr-12"
                                        style={{
                                            background: 'var(--color-ivory)',
                                            border: '1px solid var(--color-border)',
                                            color: 'var(--color-charcoal)'
                                        }}
                                        placeholder="••••••••"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2"
                                        style={{ color: 'var(--color-mist)' }}
                                    >
                                        {showPassword ? (
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                                            </svg>
                                        ) : (
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                                            </svg>
                                        )}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-4 rounded-xl font-medium text-sm transition-all duration-300"
                                style={{
                                    background: isLoading
                                        ? 'var(--color-ivory)'
                                        : 'linear-gradient(135deg, var(--color-gold) 0%, var(--color-gold-dark) 100%)',
                                    color: isLoading ? 'var(--color-mist)' : 'white',
                                    boxShadow: isLoading ? 'none' : '0 4px 16px rgba(184, 151, 107, 0.4)',
                                    letterSpacing: '0.02em'
                                }}
                            >
                                {isLoading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        Signing in...
                                    </span>
                                ) : (
                                    'Sign In'
                                )}
                            </button>
                        </form>

                        <div className="mt-8 pt-6" style={{ borderTop: '1px solid var(--color-border-light)' }}>
                            <p className="text-center text-sm" style={{ color: 'var(--color-slate)' }}>
                                Don't have an account?{' '}
                                <Link
                                    href="/signup"
                                    className="font-medium transition-colors"
                                    style={{ color: 'var(--color-gold-dark)' }}
                                >
                                    Create one
                                </Link>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
