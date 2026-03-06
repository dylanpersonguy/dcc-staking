// =============================================================================
// App Layout
// =============================================================================

import type { Metadata } from 'next';
import { Toaster } from 'react-hot-toast';
import { Header } from '@/components/Header';
import './globals.css';

export const metadata: Metadata = {
  title: 'stDCC — Liquid Staking Protocol',
  description: 'Stake DCC, receive stDCC — earn staking rewards while keeping your assets liquid.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen noise-overlay antialiased">
        <Header />
        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t border-white/5 mt-16 py-8">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 flex items-center justify-between text-xs text-gray-600">
            <span>stDCC Protocol · DecentralChain</span>
            <span className="flex items-center gap-1.5">
              <span className="glow-dot bg-emerald-400 text-emerald-400" />
              Operational
            </span>
          </div>
        </footer>

        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: 'rgba(15, 15, 25, 0.95)',
              color: '#e8eaf0',
              border: '1px solid rgba(124, 92, 252, 0.2)',
              borderRadius: '12px',
              backdropFilter: 'blur(12px)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
            },
            success: {
              iconTheme: { primary: '#34d399', secondary: '#06060b' },
            },
            error: {
              iconTheme: { primary: '#f87171', secondary: '#06060b' },
            },
          }}
        />
      </body>
    </html>
  );
}
