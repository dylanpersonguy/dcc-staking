// =============================================================================
// Frontend — React Hooks
// =============================================================================

'use client';

import { useState, useEffect, useCallback } from 'react';
import { ProtocolState, UserState, WithdrawalRequest } from '@dcc-staking/sdk';
import { getReader, DAPP_ADDRESS } from '@/lib/protocol';
import { WalletState, KeeperAdapter, isKeeperAvailable } from '@/lib/wallet';

// Demo state returned when no live node/dApp is reachable
const DEMO_PROTOCOL_STATE: ProtocolState = {
  admin: '3N_demo_admin',
  operator: '3N_demo_operator',
  guardian: '',
  paused: false,
  emergencyMode: false,
  stDccAssetId: 'DEMO_STDCC_ASSET_ID',
  treasury: '3N_demo_treasury',
  protocolFeeBps: 1000,
  totalPooledDcc: 1_250_000_00000000n,   // 1,250,000 DCC
  totalShares: 1_200_000_00000000n,      // 1,200,000 stDCC
  totalLeasedDcc: 1_100_000_00000000n,   // 1,100,000 DCC
  totalLiquidDcc: 150_000_00000000n,     // 150,000 DCC
  totalClaimableDcc: 5_000_00000000n,    // 5,000 DCC
  totalPendingWithdrawDcc: 12_500_00000000n, // 12,500 DCC
  totalProtocolFeesDcc: 3_750_00000000n, // 3,750 DCC
  validatorCount: 3,
  withdrawNonce: 42,
  lastRewardSyncHeight: 2_847_100,
  lastRewardSyncTs: Date.now() - 120_000,
  minDepositDcc: 100000000n,             // 1 DCC
  minWithdrawShares: 1000000n,           // 0.01 stDCC
  exchangeRate: 104166666n, // ~1.0417 DCC per stDCC (1,250,000/1,200,000)
};

const IS_DEMO = !DAPP_ADDRESS;

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
    // Demo mode: return mock state when no dApp is deployed
    if (IS_DEMO) {
      setState(DEMO_PROTOCOL_STATE);
      setError(null);
      setLoading(false);
      return;
    }
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
    if (!address || IS_DEMO) {
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
    if (!address || IS_DEMO) {
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
    if (!address || IS_DEMO) {
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
