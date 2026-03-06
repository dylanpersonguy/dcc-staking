// =============================================================================
// Component: Header
// =============================================================================

'use client';

import { ConnectWallet } from './ConnectWallet';
import { usePathname } from 'next/navigation';

export function Header() {
  const pathname = usePathname();

  const navItems = [
    { href: '/', label: 'Stake' },
    { href: '/validators', label: 'Validators' },
    { href: '/admin', label: 'Admin' },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.04] bg-[#06060b]/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
        {/* Logo */}
        <a href="/" className="flex items-center gap-3 group">
          <div className="relative">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-dcc-500 to-blue-400 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-dcc-500/20 group-hover:shadow-dcc-500/40 transition-shadow duration-300">
              st
            </div>
            <div className="absolute -inset-1 rounded-xl bg-gradient-to-br from-dcc-500 to-blue-400 opacity-0 group-hover:opacity-20 blur transition-opacity duration-300" />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-bold text-white leading-tight">stDCC</span>
            <span className="text-[10px] font-medium text-gray-500 uppercase tracking-widest leading-tight">Liquid Staking</span>
          </div>
        </a>

        {/* Navigation */}
        <nav className="hidden md:flex items-center gap-1 rounded-xl bg-white/[0.03] border border-white/[0.04] p-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <a
                key={item.href}
                href={item.href}
                className={`relative px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-300 ${
                  isActive
                    ? 'text-white bg-white/[0.08] shadow-sm'
                    : 'text-gray-400 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                {item.label}
                {isActive && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full bg-dcc-500" />
                )}
              </a>
            );
          })}
        </nav>

        {/* Wallet */}
        <ConnectWallet />
      </div>
    </header>
  );
}
