// =============================================================================
// Component: Header
// =============================================================================

'use client';

import { ConnectWallet } from './ConnectWallet';

export function Header() {
  return (
    <header className="border-b border-white/5 bg-black/20 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-dcc-600 flex items-center justify-center text-white font-bold text-sm">
            st
          </div>
          <span className="text-lg font-bold text-white">DCC Liquid Staking</span>
        </div>
        <nav className="hidden md:flex items-center gap-6 text-sm text-gray-400">
          <a href="/" className="hover:text-white transition">Stake</a>
          <a href="/validators" className="hover:text-white transition">Validators</a>
          <a href="/admin" className="hover:text-white transition">Admin</a>
        </nav>
        <ConnectWallet />
      </div>
    </header>
  );
}
