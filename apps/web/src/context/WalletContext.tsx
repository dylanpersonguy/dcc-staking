// =============================================================================
// WalletContext — Shared wallet state across all components
// =============================================================================

'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { WalletState, KeeperAdapter, SeedAdapter, isKeeperAvailable } from '@/lib/wallet';

export interface WalletContextValue {
  wallet: WalletState | null;
  connected: boolean;
  connecting: boolean;
  error: string | null;
  connect: () => Promise<void>;
  connectWithSeed: (seedPhrase: string) => Promise<void>;
  disconnect: () => void;
  signAndBroadcast: (tx: any) => Promise<any>;
  keeperAvailable: boolean;
}

const WalletContext = createContext<WalletContextValue | null>(null);

const keeperAdapter = typeof window !== 'undefined' ? new KeeperAdapter() : null;
const seedAdapter = typeof window !== 'undefined' ? new SeedAdapter() : null;

export function WalletProvider({ children }: { children: ReactNode }) {
  const [wallet, setWallet] = useState<WalletState | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adapterType, setAdapterType] = useState<'keeper' | 'seed' | null>(null);

  const connect = useCallback(async () => {
    if (!keeperAdapter) return;
    setConnecting(true);
    setError(null);
    try {
      const state = await keeperAdapter.connect();
      setWallet(state);
      setAdapterType('keeper');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setConnecting(false);
    }
  }, []);

  const connectWithSeed = useCallback(async (seedPhrase: string) => {
    if (!seedAdapter) return;
    setConnecting(true);
    setError(null);
    try {
      const state = await seedAdapter.connectWithSeed(seedPhrase);
      setWallet(state);
      setAdapterType('seed');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    if (adapterType === 'seed') {
      seedAdapter?.disconnect();
    } else {
      keeperAdapter?.disconnect();
    }
    setWallet(null);
    setAdapterType(null);
  }, [adapterType]);

  const signAndBroadcast = useCallback(
    async (tx: any) => {
      if (adapterType === 'seed' && seedAdapter) {
        return seedAdapter.signAndBroadcast(tx);
      }
      if (adapterType === 'keeper' && keeperAdapter) {
        return keeperAdapter.signAndBroadcast(tx);
      }
      throw new Error('Wallet not connected');
    },
    [adapterType]
  );

  return (
    <WalletContext.Provider
      value={{
        wallet,
        connected: !!wallet?.connected,
        connecting,
        error,
        connect,
        connectWithSeed,
        disconnect,
        signAndBroadcast,
        keeperAvailable: typeof window !== 'undefined' ? isKeeperAvailable() : false,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWalletContext(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWalletContext must be used within WalletProvider');
  return ctx;
}
