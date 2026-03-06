// =============================================================================
// Component: ConnectWallet
// =============================================================================

'use client';

import { useWallet } from '@/hooks';
import { shortenAddress } from '@/lib/format';

export function ConnectWallet() {
  const { wallet, connected, connecting, error, connect, disconnect, keeperAvailable } =
    useWallet();

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

  return (
    <div>
      <button
        onClick={connect}
        disabled={connecting}
        className="btn-primary text-sm !py-2.5 !px-5"
      >
        {connecting ? (
          <span className="flex items-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Connecting…
          </span>
        ) : (
          'Connect Wallet'
        )}
      </button>
      {error && <p className="mt-2 text-xs text-red-400 animate-fade-in">{error}</p>}
      {!keeperAvailable && !connecting && (
        <p className="mt-2 text-[10px] text-gray-600">
          DCC Keeper not detected
        </p>
      )}
    </div>
  );
}
