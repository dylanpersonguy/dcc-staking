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
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-dcc-600/20 px-3 py-1.5 text-sm text-dcc-300">
          {shortenAddress(wallet.address)}
        </div>
        <button onClick={disconnect} className="text-sm text-gray-400 hover:text-white transition">
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={connect}
        disabled={connecting}
        className="btn-primary text-sm"
      >
        {connecting ? 'Connecting...' : 'Connect Wallet'}
      </button>
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
      {!keeperAvailable && (
        <p className="mt-2 text-xs text-yellow-400">
          DCC Keeper extension not detected
        </p>
      )}
    </div>
  );
}
