// =============================================================================
// Frontend — React Hooks
// =============================================================================

'use client';

import { useState, useEffect, useCallback } from 'react';
import { ProtocolState, UserState, WithdrawalRequest } from '@dcc-staking/sdk';
import { getReader } from '@/lib/protocol';
import { WalletState, KeeperAdapter, isKeeperAvailable } from '@/lib/wallet';

// =============================================================================
// useWallet
// =============================================================================

const walletAdapter = typeof window !== 'undefined' ? new KeeperAdapter() : null;

export function useWallet() {
  const [wallet, setWallet] = useState<WalletState | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(async () => {
    if (!walletAdapter) return;
    setConnecting(true);
    setError(null);
    try {
      const state = await walletAdapter.connect();
      setWallet(state);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    walletAdapter?.disconnect();
    setWallet(null);
  }, []);

  const signAndBroadcast = useCallback(
    async (tx: any) => {
      if (!walletAdapter) throw new Error('Wallet not available');
      return walletAdapter.signAndBroadcast(tx);
    },
    []
  );

  return {
    wallet,
    connected: !!wallet?.connected,
    connecting,
    error,
    connect,
    disconnect,
    signAndBroadcast,
    keeperAvailable: typeof window !== 'undefined' ? isKeeperAvailable() : false,
  };
}

// =============================================================================
// useProtocolState
// =============================================================================

export function useProtocolState(pollIntervalMs: number = 15_000) {
  const [state, setState] = useState<ProtocolState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const reader = getReader();
      const s = await reader.getProtocolState();
      setState(s);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, pollIntervalMs);
    return () => clearInterval(interval);
  }, [refresh, pollIntervalMs]);

  return { state, loading, error, refresh };
}

// =============================================================================
// useUserState
// =============================================================================

export function useUserState(address: string | undefined) {
  const [userState, setUserState] = useState<UserState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!address) {
      setUserState(null);
      return;
    }
    setLoading(true);
    try {
      const reader = getReader();
      const s = await reader.getUserState(address);
      setUserState(s);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { userState, loading, error, refresh };
}

// =============================================================================
// useWithdrawalRequests
// =============================================================================

export function useWithdrawalRequests(address: string | undefined) {
  const [requests, setRequests] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!address) {
      setRequests([]);
      return;
    }
    setLoading(true);
    try {
      const reader = getReader();
      const reqs = await reader.fetchWithdrawalRequests(address);
      setRequests(reqs);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { requests, loading, error, refresh };
}

// =============================================================================
// useDccBalance
// =============================================================================

export function useDccBalance(address: string | undefined) {
  const [balance, setBalance] = useState<bigint>(0n);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!address) {
      setBalance(0n);
      return;
    }
    setLoading(true);
    try {
      const reader = getReader();
      const b = await reader.getNodeClient().getDccBalance(address);
      setBalance(b.available);
    } catch {
      setBalance(0n);
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { balance, loading, refresh };
}
