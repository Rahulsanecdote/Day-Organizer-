'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { initializeDatabase } from '@/lib/database';
import { ThemeProvider } from '@/components/ThemeProvider';
import { ThemeToggle } from '@/components/ThemeToggle';
import '../globals.css';
import CommandBar from '@/components/assistant/CommandBar';
import MorningBriefing from '@/components/assistant/MorningBriefing';
import EveningDebrief from '@/components/assistant/EveningDebrief';
import QuestOverlay from '@/components/assistant/QuestOverlay';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const init = async () => {
      try {
        await initializeDatabase();
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize database:', error);
      }
    };
    init();
  }, []);

  // Update time on client only to avoid hydration mismatch
  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  if (!isInitialized) {
    return (
      <html lang="en" suppressHydrationWarning>
        <head>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        </head>
        <body>
          <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-cream)' }}>
            <div className="text-center">
              <div className="relative w-16 h-16 mx-auto mb-6">
                <div className="absolute inset-0 border-2 border-[#E8E4DF] rounded-full"></div>
                <div className="absolute inset-0 border-2 border-transparent border-t-[#B8976B] rounded-full animate-spin"></div>
              </div>
              <p className="text-[#6B6560] tracking-wide text-sm uppercase">Preparing your day...</p>
            </div>
          </div>
        </body>
      </html>
    );
  }

  const navigation = [
    { name: 'Today', href: '/today-setup', icon: 'today' },
    { name: 'Plan', href: '/plan', icon: 'plan' },
    { name: 'Habits', href: '/habits', icon: 'habits' },
    { name: 'Tasks', href: '/tasks', icon: 'tasks' },
    { name: 'History', href: '/history', icon: 'history' },
    { name: 'Profile', href: '/profile', icon: 'profile' },
    { name: 'Settings', href: '/onboarding', icon: 'settings' },
  ];

  const getIcon = (icon: string) => {
    const iconClass = "w-5 h-5";
    switch (icon) {
      case 'today':
        return (
          <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
          </svg>
        );
      case 'plan':
        return (
          <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
          </svg>
        );
      case 'habits':
        return (
          <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
          </svg>
        );
      case 'tasks':
        return (
          <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
        );
      case 'history':
        return (
          <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
          </svg>
        );
      case 'profile':
        return (
          <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
          </svg>
        );
      case 'settings':
        return (
          <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-screen" style={{ background: 'var(--color-cream)' }} suppressHydrationWarning>
        <ThemeProvider>
          <div className="flex h-screen">
            {/* Sidebar */}
            <div
              className="w-72 flex flex-col"
              style={{
                background: 'var(--color-surface)',
                borderRight: '1px solid var(--color-border)'
              }}
            >
              {/* Logo */}
              <div className="px-8 py-8" style={{ borderBottom: '1px solid var(--color-border-light)' }}>
                <h1
                  className="text-2xl tracking-tight"
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontWeight: 500,
                    color: 'var(--color-charcoal)'
                  }}
                >
                  Daily Organizer
                </h1>
                <p
                  className="mt-1 text-sm tracking-wide"
                  style={{ color: 'var(--color-mist)' }}
                >
                  Curate your perfect day
                </p>
              </div>

              {/* Navigation */}
              <nav className="flex-1 px-4 py-6">
                <div className="space-y-1">
                  {navigation.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        className="group flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200"
                        style={{
                          background: isActive ? 'var(--color-ivory)' : 'transparent',
                          color: isActive ? 'var(--color-gold-dark)' : 'var(--color-stone)',
                        }}
                      >
                        <span
                          className="transition-colors duration-200"
                          style={{
                            color: isActive ? 'var(--color-gold)' : 'var(--color-mist)'
                          }}
                        >
                          {getIcon(item.icon)}
                        </span>
                        <span
                          className="font-medium text-sm tracking-wide"
                          style={{
                            color: isActive ? 'var(--color-charcoal)' : 'var(--color-stone)'
                          }}
                        >
                          {item.name}
                        </span>
                        {isActive && (
                          <span
                            className="ml-auto w-1.5 h-1.5 rounded-full"
                            style={{ background: 'var(--color-gold)' }}
                          />
                        )}
                      </Link>
                    );
                  })}
                </div>
              </nav>

              {/* Footer */}
              <div
                className="px-8 py-6"
                style={{ borderTop: '1px solid var(--color-border-light)' }}
              >
                <p
                  className="text-xs tracking-wider uppercase"
                  style={{ color: 'var(--color-mist)' }}
                >
                  Version 1.0.0
                </p>
              </div>
            </div>

            {/* Main content */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Header */}
              <header
                className="px-10 py-6 flex items-center justify-between"
                style={{
                  background: 'var(--color-surface)',
                  borderBottom: '1px solid var(--color-border)'
                }}
              >
                <div>
                  <h2
                    className="text-xl"
                    style={{
                      fontFamily: 'var(--font-serif)',
                      fontWeight: 500,
                      color: 'var(--color-charcoal)'
                    }}
                  >
                    {navigation.find(item => item.href === pathname)?.name || 'Daily Organization'}
                  </h2>
                  <p
                    className="mt-1 text-sm"
                    style={{ color: 'var(--color-slate)' }}
                  >
                    {getCurrentDateString()}
                  </p>
                </div>

                {/* Current time indicator */}
                <div
                  className="flex items-center gap-2 px-4 py-2 rounded-full"
                  style={{
                    background: 'var(--color-ivory)',
                    border: '1px solid var(--color-border-light)'
                  }}
                >
                  <span
                    className="w-2 h-2 rounded-full animate-pulse"
                    style={{ background: 'var(--color-gold)' }}
                  />
                  <span
                    className="text-sm font-medium"
                    style={{ color: 'var(--color-stone)' }}
                  >
                    {currentTime || '--:--'}
                  </span>
                </div>

                <div className="ml-4">
                  <ThemeToggle />
                </div>
              </header>

              {/* Main content area */}
              <main
                className="flex-1 overflow-y-auto"
                style={{ background: 'var(--color-cream)' }}
              >
                <div className="p-10">
                  {children}
                </div>
              </main>
            </div>
          </div>
          <CommandBar />
          <MorningBriefing />
          <EveningDebrief />
          <QuestOverlay />
        </ThemeProvider>
      </body>
    </html>
  );
}

function getCurrentDateString(): string {
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  };
  return now.toLocaleDateString('en-US', options);
}
