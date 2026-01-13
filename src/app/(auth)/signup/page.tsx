'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function SignupPage() {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
    });
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [agreeToTerms, setAgreeToTerms] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({
            ...prev,
            [e.target.name]: e.target.value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (formData.password !== formData.confirmPassword) {
            alert('Passwords do not match');
            return;
        }

        if (!agreeToTerms) {
            alert('Please agree to the terms and conditions');
            return;
        }

        setIsLoading(true);

        // Simulate signup - in production, connect to your auth service
        setTimeout(() => {
            setIsLoading(false);
            window.location.href = '/onboarding';
        }, 1500);
    };

    const getPasswordStrength = (password: string) => {
        let strength = 0;
        if (password.length >= 8) strength++;
        if (/[A-Z]/.test(password)) strength++;
        if (/[0-9]/.test(password)) strength++;
        if (/[^A-Za-z0-9]/.test(password)) strength++;
        return strength;
    };

    const passwordStrength = getPasswordStrength(formData.password);
    const strengthLabels = ['Weak', 'Fair', 'Good', 'Strong'];
    const strengthColors = ['#c96464', 'var(--color-meal)', 'var(--color-task)', 'var(--color-gym)'];

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
                    <div className="space-y-6">
                        {[
                            { icon: 'calendar', title: 'Smart Scheduling', desc: 'AI-powered planning that adapts to your energy levels' },
                            { icon: 'chart', title: 'Habit Tracking', desc: 'Build lasting habits with intelligent reminders' },
                            { icon: 'target', title: 'Goal Achievement', desc: 'Break down big goals into daily actionable tasks' },
                        ].map((feature, index) => (
                            <div key={index} className="flex items-start gap-4">
                                <div
                                    className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                                    style={{ background: 'rgba(184, 151, 107, 0.2)' }}
                                >
                                    <span style={{ color: 'var(--color-gold)' }}>
                                        {feature.icon === 'calendar' && (
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                                            </svg>
                                        )}
                                        {feature.icon === 'chart' && (
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
                                            </svg>
                                        )}
                                        {feature.icon === 'target' && (
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                                            </svg>
                                        )}
                                    </span>
                                </div>
                                <div>
                                    <h3 className="font-medium text-white">{feature.title}</h3>
                                    <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.875rem' }}>
                                        {feature.desc}
                                    </p>
                                </div>
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

            {/* Right side - Signup Form */}
            <div className="flex-1 flex items-center justify-center p-8 overflow-y-auto">
                <div className="w-full max-w-md my-8">
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
                                Create your account
                            </h2>
                            <p
                                className="mt-2"
                                style={{ color: 'var(--color-slate)' }}
                            >
                                Start organizing your days with intention
                            </p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label
                                    className="block text-xs uppercase tracking-wider mb-2"
                                    style={{ color: 'var(--color-mist)' }}
                                >
                                    Full Name
                                </label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-4 py-3.5 rounded-lg text-sm focus:outline-none transition-all duration-200"
                                    style={{
                                        background: 'var(--color-ivory)',
                                        border: '1px solid var(--color-border)',
                                        color: 'var(--color-charcoal)'
                                    }}
                                    placeholder="John Doe"
                                />
                            </div>

                            <div>
                                <label
                                    className="block text-xs uppercase tracking-wider mb-2"
                                    style={{ color: 'var(--color-mist)' }}
                                >
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
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
                                <label
                                    className="block text-xs uppercase tracking-wider mb-2"
                                    style={{ color: 'var(--color-mist)' }}
                                >
                                    Password
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        name="password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        required
                                        minLength={8}
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
                                {/* Password strength indicator */}
                                {formData.password && (
                                    <div className="mt-2">
                                        <div className="flex gap-1">
                                            {[1, 2, 3, 4].map((level) => (
                                                <div
                                                    key={level}
                                                    className="h-1 flex-1 rounded-full transition-all duration-300"
                                                    style={{
                                                        background: level <= passwordStrength
                                                            ? strengthColors[passwordStrength - 1]
                                                            : 'var(--color-border)'
                                                    }}
                                                />
                                            ))}
                                        </div>
                                        <p
                                            className="text-xs mt-1"
                                            style={{ color: passwordStrength > 0 ? strengthColors[passwordStrength - 1] : 'var(--color-mist)' }}
                                        >
                                            {passwordStrength > 0 ? strengthLabels[passwordStrength - 1] : 'Enter a password'}
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div>
                                <label
                                    className="block text-xs uppercase tracking-wider mb-2"
                                    style={{ color: 'var(--color-mist)' }}
                                >
                                    Confirm Password
                                </label>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    name="confirmPassword"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-4 py-3.5 rounded-lg text-sm focus:outline-none transition-all duration-200"
                                    style={{
                                        background: 'var(--color-ivory)',
                                        border: `1px solid ${formData.confirmPassword && formData.password !== formData.confirmPassword
                                                ? '#c96464'
                                                : 'var(--color-border)'
                                            }`,
                                        color: 'var(--color-charcoal)'
                                    }}
                                    placeholder="••••••••"
                                />
                                {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                                    <p className="text-xs mt-1" style={{ color: '#c96464' }}>
                                        Passwords do not match
                                    </p>
                                )}
                            </div>

                            {/* Terms checkbox */}
                            <div className="flex items-start gap-3 pt-2">
                                <input
                                    type="checkbox"
                                    id="terms"
                                    checked={agreeToTerms}
                                    onChange={(e) => setAgreeToTerms(e.target.checked)}
                                    className="mt-0.5 w-4 h-4 rounded"
                                    style={{ accentColor: 'var(--color-gold)' }}
                                />
                                <label
                                    htmlFor="terms"
                                    className="text-sm leading-relaxed"
                                    style={{ color: 'var(--color-slate)' }}
                                >
                                    I agree to the{' '}
                                    <a href="#" style={{ color: 'var(--color-gold-dark)' }}>Terms of Service</a>
                                    {' '}and{' '}
                                    <a href="#" style={{ color: 'var(--color-gold-dark)' }}>Privacy Policy</a>
                                </label>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading || formData.password !== formData.confirmPassword}
                                className="w-full py-4 rounded-xl font-medium text-sm transition-all duration-300 mt-2"
                                style={{
                                    background: isLoading || formData.password !== formData.confirmPassword
                                        ? 'var(--color-ivory)'
                                        : 'linear-gradient(135deg, var(--color-gold) 0%, var(--color-gold-dark) 100%)',
                                    color: isLoading || formData.password !== formData.confirmPassword ? 'var(--color-mist)' : 'white',
                                    boxShadow: isLoading || formData.password !== formData.confirmPassword ? 'none' : '0 4px 16px rgba(184, 151, 107, 0.4)',
                                    letterSpacing: '0.02em'
                                }}
                            >
                                {isLoading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        Creating account...
                                    </span>
                                ) : (
                                    'Create Account'
                                )}
                            </button>
                        </form>

                        <div className="mt-8 pt-6" style={{ borderTop: '1px solid var(--color-border-light)' }}>
                            <p className="text-center text-sm" style={{ color: 'var(--color-slate)' }}>
                                Already have an account?{' '}
                                <Link
                                    href="/login"
                                    className="font-medium transition-colors"
                                    style={{ color: 'var(--color-gold-dark)' }}
                                >
                                    Sign in
                                </Link>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
