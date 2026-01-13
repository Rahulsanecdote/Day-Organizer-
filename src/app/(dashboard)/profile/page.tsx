'use client';

import { useState, useEffect, useRef } from 'react';
import { DatabaseService } from '@/lib/database';
import { UserPreferences } from '@/types';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
    const [preferences, setPreferences] = useState<UserPreferences | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();

    const [profile, setProfile] = useState({
        name: 'John Doe',
        email: 'john@example.com',
        avatar: '',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        joinedDate: new Date().toISOString(),
    });

    const [editedProfile, setEditedProfile] = useState(profile);

    useEffect(() => {
        loadPreferences();
    }, []);

    const loadPreferences = async () => {
        const prefs = await DatabaseService.getPreferences();
        if (prefs) {
            setPreferences(prefs);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);

        // Simulate save - in production, connect to your backend
        setTimeout(() => {
            setProfile(editedProfile);
            setIsEditing(false);
            setIsSaving(false);
        }, 1000);
    };

    const handleCancel = () => {
        setEditedProfile(profile);
        setIsEditing(false);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const imageUrl = URL.createObjectURL(file);
            setEditedProfile(prev => ({ ...prev, avatar: imageUrl }));
        }
    };

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleSignOut = () => {
        router.push('/login');
    };

    const handleChangePassword = () => {
        alert('Password change functionality would open here.');
    };

    const handleExportData = () => {
        alert('Data export started. You will receive an email shortly.');
    };

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    const stats = [
        { label: 'Days Planned', value: 47 },
        { label: 'Habits Tracked', value: 12 },
        { label: 'Tasks Completed', value: 156 },
        { label: 'Current Streak', value: '14 days' },
    ];

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            {/* Profile Header */}
            <div
                className="rounded-xl p-8"
                style={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    boxShadow: 'var(--shadow-soft)'
                }}
            >
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-6">
                        {/* Avatar */}
                        <div
                            className="w-24 h-24 rounded-full flex items-center justify-center text-2xl font-medium"
                            style={{
                                background: 'linear-gradient(135deg, var(--color-gold) 0%, var(--color-gold-dark) 100%)',
                                color: 'white',
                                fontFamily: 'var(--font-serif)'
                            }}
                        >
                            {profile.avatar ? (
                                <img
                                    src={profile.avatar}
                                    alt={profile.name}
                                    className="w-full h-full rounded-full object-cover"
                                />
                            ) : (
                                getInitials(profile.name)
                            )}
                        </div>

                        <div>
                            <h1
                                className="text-3xl mb-1"
                                style={{
                                    fontFamily: 'var(--font-serif)',
                                    fontWeight: 500,
                                    color: 'var(--color-charcoal)'
                                }}
                            >
                                {profile.name}
                            </h1>
                            <p style={{ color: 'var(--color-slate)' }}>{profile.email}</p>
                            <p
                                className="mt-2 text-sm flex items-center gap-2"
                                style={{ color: 'var(--color-mist)' }}
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418" />
                                </svg>
                                {profile.timezone}
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={() => setIsEditing(true)}
                        className="px-5 py-2.5 rounded-lg font-medium text-sm transition-all duration-200"
                        style={{
                            background: 'transparent',
                            color: 'var(--color-gold-dark)',
                            border: '1px solid var(--color-gold-light)'
                        }}
                    >
                        Edit Profile
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div
                className="rounded-xl p-8"
                style={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    boxShadow: 'var(--shadow-soft)'
                }}
            >
                <h2
                    className="text-lg mb-6"
                    style={{
                        fontFamily: 'var(--font-serif)',
                        fontWeight: 500,
                        color: 'var(--color-charcoal)'
                    }}
                >
                    Your Progress
                </h2>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    {stats.map((stat, index) => (
                        <div
                            key={index}
                            className="text-center p-4 rounded-lg"
                            style={{ background: 'var(--color-ivory)' }}
                        >
                            <div
                                className="text-3xl mb-1"
                                style={{
                                    fontFamily: 'var(--font-serif)',
                                    fontWeight: 500,
                                    color: 'var(--color-gold-dark)'
                                }}
                            >
                                {stat.value}
                            </div>
                            <div
                                className="text-xs uppercase tracking-wider"
                                style={{ color: 'var(--color-mist)' }}
                            >
                                {stat.label}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Preferences */}
            <div
                className="rounded-xl p-8"
                style={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    boxShadow: 'var(--shadow-soft)'
                }}
            >
                <h2
                    className="text-lg mb-6"
                    style={{
                        fontFamily: 'var(--font-serif)',
                        fontWeight: 500,
                        color: 'var(--color-charcoal)'
                    }}
                >
                    Planning Preferences
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div
                        className="p-5 rounded-lg"
                        style={{
                            background: 'var(--color-ivory)',
                            border: '1px solid var(--color-border-light)'
                        }}
                    >
                        <div className="flex items-center gap-3 mb-3">
                            <span style={{ color: 'var(--color-sleep)' }}>
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
                                </svg>
                            </span>
                            <span
                                className="text-sm uppercase tracking-wider"
                                style={{ color: 'var(--color-mist)' }}
                            >
                                Default Sleep Schedule
                            </span>
                        </div>
                        <p style={{ color: 'var(--color-charcoal)' }}>
                            {preferences?.defaultSleepStart || '23:30'} – {preferences?.defaultSleepEnd || '07:30'}
                        </p>
                    </div>

                    <div
                        className="p-5 rounded-lg"
                        style={{
                            background: 'var(--color-ivory)',
                            border: '1px solid var(--color-border-light)'
                        }}
                    >
                        <div className="flex items-center gap-3 mb-3">
                            <span style={{ color: 'var(--color-gym)' }}>
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                                </svg>
                            </span>
                            <span
                                className="text-sm uppercase tracking-wider"
                                style={{ color: 'var(--color-mist)' }}
                            >
                                Buffer Between Blocks
                            </span>
                        </div>
                        <p style={{ color: 'var(--color-charcoal)' }}>
                            {preferences?.defaultBuffers || 10} minutes
                        </p>
                    </div>

                    <div
                        className="p-5 rounded-lg"
                        style={{
                            background: 'var(--color-ivory)',
                            border: '1px solid var(--color-border-light)'
                        }}
                    >
                        <div className="flex items-center gap-3 mb-3">
                            <span style={{ color: 'var(--color-habit)' }}>
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 0 1-6.364 0M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Z" />
                                </svg>
                            </span>
                            <span
                                className="text-sm uppercase tracking-wider"
                                style={{ color: 'var(--color-mist)' }}
                            >
                                Protected Downtime
                            </span>
                        </div>
                        <p style={{ color: 'var(--color-charcoal)' }}>
                            {preferences?.defaultDowntimeProtection || 30} minutes
                        </p>
                    </div>

                    <div
                        className="p-5 rounded-lg"
                        style={{
                            background: 'var(--color-ivory)',
                            border: '1px solid var(--color-border-light)'
                        }}
                    >
                        <div className="flex items-center gap-3 mb-3">
                            <span style={{ color: 'var(--color-gold)' }}>
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
                                </svg>
                            </span>
                            <span
                                className="text-sm uppercase tracking-wider"
                                style={{ color: 'var(--color-mist)' }}
                            >
                                Peak Productivity
                            </span>
                        </div>
                        <p style={{ color: 'var(--color-charcoal)' }}>
                            Morning (9:00 – 12:00)
                        </p>
                    </div>
                </div>
            </div>

            {/* Account Actions */}
            <div
                className="rounded-xl p-8"
                style={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    boxShadow: 'var(--shadow-soft)'
                }}
            >
                <h2
                    className="text-lg mb-6"
                    style={{
                        fontFamily: 'var(--font-serif)',
                        fontWeight: 500,
                        color: 'var(--color-charcoal)'
                    }}
                >
                    Account
                </h2>

                <div className="space-y-4">
                    <button
                        onClick={handleChangePassword}
                        className="w-full flex items-center justify-between p-4 rounded-lg transition-all duration-200"
                        style={{
                            background: 'var(--color-ivory)',
                            border: '1px solid var(--color-border-light)'
                        }}
                    >
                        <div className="flex items-center gap-3">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" style={{ color: 'var(--color-stone)' }}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                            </svg>
                            <span style={{ color: 'var(--color-charcoal)' }}>Change Password</span>
                        </div>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" style={{ color: 'var(--color-mist)' }}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                        </svg>
                    </button>

                    <button
                        onClick={handleExportData}
                        className="w-full flex items-center justify-between p-4 rounded-lg transition-all duration-200"
                        style={{
                            background: 'var(--color-ivory)',
                            border: '1px solid var(--color-border-light)'
                        }}
                    >
                        <div className="flex items-center gap-3">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" style={{ color: 'var(--color-stone)' }}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                            </svg>
                            <span style={{ color: 'var(--color-charcoal)' }}>Export Data</span>
                        </div>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" style={{ color: 'var(--color-mist)' }}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                        </svg>
                    </button>

                    <button
                        onClick={handleSignOut}
                        className="w-full flex items-center justify-between p-4 rounded-lg transition-all duration-200"
                        style={{
                            background: 'var(--color-ivory)',
                            border: '1px solid var(--color-border-light)'
                        }}
                    >
                        <div className="flex items-center gap-3">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" style={{ color: 'var(--color-stone)' }}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 9V5.25A2.25 2.25 0 0 1 10.5 3h6a2.25 2.25 0 0 1 2.25 2.25v13.5A2.25 2.25 0 0 1 16.5 21h-6a2.25 2.25 0 0 1-2.25-2.25V15m-3 0-3-3m0 0 3-3m-3 3H15" />
                            </svg>
                            <span style={{ color: 'var(--color-charcoal)' }}>Sign Out</span>
                        </div>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" style={{ color: 'var(--color-mist)' }}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Edit Profile Modal */}
            {isEditing && (
                <div
                    className="fixed inset-0 flex items-center justify-center z-50 p-4"
                    style={{ background: 'rgba(44, 40, 37, 0.4)', backdropFilter: 'blur(8px)' }}
                >
                    <div
                        className="rounded-xl max-w-lg w-full"
                        style={{
                            background: 'var(--color-surface)',
                            border: '1px solid var(--color-border)',
                            boxShadow: 'var(--shadow-elevated)'
                        }}
                    >
                        <div className="p-8">
                            <div className="flex justify-between items-center mb-8">
                                <h2
                                    className="text-2xl"
                                    style={{
                                        fontFamily: 'var(--font-serif)',
                                        fontWeight: 500,
                                        color: 'var(--color-charcoal)'
                                    }}
                                >
                                    Edit Profile
                                </h2>
                                <button
                                    onClick={handleCancel}
                                    className="p-2 rounded-lg transition-colors"
                                    style={{ color: 'var(--color-mist)' }}
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            {/* Avatar Upload */}
                            <div className="flex justify-center mb-8">
                                <div className="relative">
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileChange}
                                        className="hidden"
                                        accept="image/*"
                                    />
                                    <div
                                        className="w-24 h-24 rounded-full flex items-center justify-center text-2xl font-medium overflow-hidden"
                                        style={{
                                            background: 'linear-gradient(135deg, var(--color-gold) 0%, var(--color-gold-dark) 100%)',
                                            color: 'white',
                                            fontFamily: 'var(--font-serif)'
                                        }}
                                    >
                                        {editedProfile.avatar ? (
                                            <img
                                                src={editedProfile.avatar}
                                                alt={editedProfile.name}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            getInitials(editedProfile.name)
                                        )}
                                    </div>
                                    <button
                                        onClick={handleAvatarClick}
                                        className="absolute -bottom-1 -right-1 p-2 rounded-full cursor-pointer hover:bg-gray-100 transition-colors"
                                        style={{
                                            background: 'var(--color-surface)',
                                            border: '1px solid var(--color-border)',
                                            color: 'var(--color-stone)'
                                        }}
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-5">
                                <div>
                                    <label
                                        className="block text-xs uppercase tracking-wider mb-2"
                                        style={{ color: 'var(--color-mist)' }}
                                    >
                                        Full Name
                                    </label>
                                    <input
                                        type="text"
                                        value={editedProfile.name}
                                        onChange={(e) => setEditedProfile(prev => ({ ...prev, name: e.target.value }))}
                                        className="w-full px-4 py-3.5 rounded-lg text-sm focus:outline-none transition-all duration-200"
                                        style={{
                                            background: 'var(--color-ivory)',
                                            border: '1px solid var(--color-border)',
                                            color: 'var(--color-charcoal)'
                                        }}
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
                                        value={editedProfile.email}
                                        onChange={(e) => setEditedProfile(prev => ({ ...prev, email: e.target.value }))}
                                        className="w-full px-4 py-3.5 rounded-lg text-sm focus:outline-none transition-all duration-200"
                                        style={{
                                            background: 'var(--color-ivory)',
                                            border: '1px solid var(--color-border)',
                                            color: 'var(--color-charcoal)'
                                        }}
                                    />
                                </div>

                                <div>
                                    <label
                                        className="block text-xs uppercase tracking-wider mb-2"
                                        style={{ color: 'var(--color-mist)' }}
                                    >
                                        Timezone
                                    </label>
                                    <input
                                        type="text"
                                        value={editedProfile.timezone}
                                        onChange={(e) => setEditedProfile(prev => ({ ...prev, timezone: e.target.value }))}
                                        className="w-full px-4 py-3.5 rounded-lg text-sm focus:outline-none transition-all duration-200"
                                        style={{
                                            background: 'var(--color-ivory)',
                                            border: '1px solid var(--color-border)',
                                            color: 'var(--color-charcoal)'
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Form Actions */}
                            <div
                                className="flex justify-end gap-3 mt-8 pt-6"
                                style={{ borderTop: '1px solid var(--color-border-light)' }}
                            >
                                <button
                                    onClick={handleCancel}
                                    className="px-5 py-2.5 rounded-lg font-medium text-sm transition-all duration-200"
                                    style={{
                                        background: 'transparent',
                                        color: 'var(--color-stone)',
                                        border: '1px solid var(--color-border)'
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className="px-5 py-2.5 rounded-lg font-medium text-sm transition-all duration-200"
                                    style={{
                                        background: isSaving
                                            ? 'var(--color-ivory)'
                                            : 'linear-gradient(135deg, var(--color-gold) 0%, var(--color-gold-dark) 100%)',
                                        color: isSaving ? 'var(--color-mist)' : 'white',
                                        boxShadow: isSaving ? 'none' : '0 2px 8px rgba(184, 151, 107, 0.3)'
                                    }}
                                >
                                    {isSaving ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
