// =============================================================================
// Component: ConnectWallet
// =============================================================================

'use client';

import { useState } from 'react';
import { useWallet } from '@/hooks';
import { shortenAddress } from '@/lib/format';

export function ConnectWallet() {
  const { wallet, connected, connecting, error, connect, connectWithSeed, disconnect, keeperAvailable } =
    useWallet();
  const [showSeedInput, setShowSeedInput] = useState(false);
  const [seedPhrase, setSeedPhrase] = useState('');

  const handleSeedConnect = async () => {
    if (!seedPhrase.trim()) return;
    await connectWithSeed(seedPhrase.trim());
    setSeedPhrase('');
    setShowSeedInput(false);
  };

  if (connected && wallet) {
    return (
      <div className="flex items-center gap-2 animate-fade-in">
        <div className="flex items-center gap-2 rounded-xl bg-white/[0.04] border border-white/[0.06] px-3 py-2">
          <span className="glow-dot bg-emerald-400 text-emerald-400" />
          <span className="text-sm font-medium text-gray-300">
            {shortenAddress(wallet.address)}
          </span>
        </div>
        <button
          onClick={disconnect}
          className="rounded-xl px-3 py-2 text-sm text-gray-500 hover:text-white hover:bg-white/[0.04] transition-all duration-200"
          title="Disconnect"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
      </div>
    );
  }

  if (showSeedInput) {
    return (
      <div className="animate-fade-in">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <input
              type="password"
              value={seedPhrase}
              onChange={(e) => setSeedPhrase(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSeedConnect()}
              placeholder="Enter seed phrase..."
              className="rounded-xl bg-white/[0.04] border border-white/[0.08] px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-dcc-500/40 focus:outline-none focus:ring-1 focus:ring-dcc-500/20 transition-all w-56"
              autoFocus
            />
            <button
              onClick={handleSeedConnect}
              disabled={connecting || !seedPhrase.trim()}
              className="btn-primary text-sm !py-2 !px-4 disabled:opacity-40"
            >
              {connecting ? '...' : 'Go'}
            </button>
            <button
              onClick={() => { setShowSeedInput(false); setSeedPhrase(''); }}
              className="text-sm text-gray-500 hover:text-white transition-colors px-2"
            >
              ✕
            </button>
          </div>
        </div>
        {error && <p className="mt-2 text-xs text-red-400 animate-fade-in">{error}</p>}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowSeedInput(true)}
          disabled={connecting}
          className="btn-primary text-sm !py-2.5 !px-5"
        >
          Connect Wallet
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-red-400 animate-fade-in">{error}</p>}
    </div>
  );
}
