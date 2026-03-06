// =============================================================================
// App Layout
// =============================================================================

import type { Metadata } from 'next';
import { Toaster } from 'react-hot-toast';
import { Header } from '@/components/Header';
import './globals.css';

export const metadata: Metadata = {
  title: 'DCC Liquid Staking',
  description: 'Stake DCC, receive stDCC — earn staking rewards while keeping your assets liquid.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <Header />
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">{children}</main>
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#1e1e2e',
              color: '#e8e8f0',
              border: '1px solid rgba(255,255,255,0.1)',
            },
          }}
        />
      </body>
    </html>
  );
}
