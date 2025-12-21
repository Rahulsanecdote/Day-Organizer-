'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { initializeDatabase } from '@/lib/database';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isInitialized, setIsInitialized] = useState(false);

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

  if (!isInitialized) {
    return (
      <html lang="en">
        <body>
          <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-lg text-gray-600">Initializing your daily organization app...</p>
            </div>
          </div>
        </body>
      </html>
    );
  }

  const navigation = [
    { name: 'Today Setup', href: '/today-setup', icon: '📅' },
    { name: 'Plan', href: '/plan', icon: '📋' },
    { name: 'Habits', href: '/habits', icon: '🔄' },
    { name: 'Tasks', href: '/tasks', icon: '✅' },
    { name: 'History', href: '/history', icon: '📊' },
    { name: 'Settings', href: '/onboarding', icon: '⚙️' },
  ];

  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        <div className="flex h-screen">
          {/* Sidebar */}
          <div className="w-64 bg-white shadow-lg">
            <div className="p-6 border-b border-gray-200">
              <h1 className="text-xl font-bold text-gray-900">Daily Organizer</h1>
              <p className="text-sm text-gray-600">Plan your perfect day</p>
            </div>
            
            <nav className="mt-6">
              <div className="space-y-1 px-3">
                {navigation.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`${
                        isActive
                          ? 'bg-blue-50 border-blue-500 text-blue-700'
                          : 'border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      } group flex items-center px-3 py-2 text-sm font-medium border-l-4 transition-colors duration-200`}
                    >
                      <span className="mr-3 text-lg">{item.icon}</span>
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            </nav>
            
            <div className="absolute bottom-0 w-64 p-6 border-t border-gray-200">
              <div className="text-xs text-gray-500">
                <p>Version 1.0.0</p>
                <p>Built with Next.js + TypeScript</p>
              </div>
            </div>
          </div>

          {/* Main content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <header className="bg-white shadow-sm border-b border-gray-200">
              <div className="px-6 py-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  {navigation.find(item => item.href === pathname)?.name || 'Daily Organization'}
                </h2>
                <p className="text-sm text-gray-600">
                  {getCurrentDateString()}
                </p>
              </div>
            </header>
            
            <main className="flex-1 overflow-y-auto bg-gray-50">
              <div className="p-6">
                {children}
              </div>
            </main>
          </div>
        </div>
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
