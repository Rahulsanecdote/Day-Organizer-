import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';

export const metadata: Metadata = {
    title: 'Day Organizer',
    description:
        'Intelligent daily planning powered by AI — schedule habits, tasks, and focus blocks that fit your life.',
};

// Blocking script to prevent theme flash - runs before React hydration
const themeInitScript = `
(function() {
  try {
    var theme = localStorage.getItem('theme');
    if (!theme) {
      theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html
            lang="en"
            suppressHydrationWarning
            style={
                {
                    '--font-inter':
                        'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                    '--font-serif': '"Cormorant Garamond", "Times New Roman", Georgia, serif',
                } as React.CSSProperties
            }
        >
            <head>
                {/* Blocking script prevents theme flash by running before paint */}
                <Script
                    id="theme-init"
                    strategy="beforeInteractive"
                    dangerouslySetInnerHTML={{ __html: themeInitScript }}
                />
            </head>
            <body style={{ fontFamily: 'var(--font-inter), sans-serif' }}>{children}</body>
        </html>
    );
}
