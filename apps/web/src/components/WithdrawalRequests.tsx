// =============================================================================
// Component: WithdrawalRequests
// =============================================================================

'use client';

import { useWallet, useWithdrawalRequests, useProtocolState } from '@/hooks';
import { WithdrawalStatus } from '@dcc-staking/sdk';
import { getTxBuilder } from '@/lib/protocol';
import { formatDcc } from '@/lib/format';
import toast from 'react-hot-toast';
import { useState } from 'react';

const STATUS_LABELS: Record<number, string> = {
  0: 'Pending',
  1: 'Ready to Claim',
  2: 'Claimed',
  3: 'Cancelled',
};

const STATUS_COLORS: Record<number, string> = {
  0: 'text-yellow-400',
  1: 'text-green-400',
  2: 'text-gray-400',
  3: 'text-red-400',
};

export function WithdrawalRequests() {
  const { wallet, connected, signAndBroadcast } = useWallet();
  const { requests, loading, refresh } = useWithdrawalRequests(wallet?.address);
  const { refresh: refreshState } = useProtocolState();
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const handleClaim = async (requestId: string) => {
    setClaimingId(requestId);
    try {
      const txBuilder = getTxBuilder();
      const tx = txBuilder.buildClaimWithdrawTx(requestId);
      const result = await signAndBroadcast(tx);
      toast.success(`Claim submitted! TX: ${result?.id || 'pending'}`);
      setTimeout(() => {
        refresh();
        refreshState();
      }, 5000);
    } catch (err: any) {
      toast.error(`Claim failed: ${err.message}`);
    } finally {
      setClaimingId(null);
    }
  };

  if (!connected) return null;

  if (loading) {
    return (
      <div className="glass-card">
        <h2 className="text-lg font-semibold text-white mb-4">Your Withdrawals</h2>
        <div className="animate-pulse space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-16 bg-white/5 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="glass-card">
        <h2 className="text-lg font-semibold text-white mb-4">Your Withdrawals</h2>
        <p className="text-gray-400 text-sm">No withdrawal requests yet</p>
      </div>
    );
  }

  return (
    <div className="glass-card">
      <h2 className="text-lg font-semibold text-white mb-4">Your Withdrawals</h2>
      <div className="space-y-3">
        {requests.map((req) => (
          <div
            key={req.id}
            className="flex items-center justify-between rounded-lg bg-white/5 p-4"
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="text-white font-medium">#{req.id}</span>
                <span className={`text-xs ${STATUS_COLORS[req.status]}`}>
                  {STATUS_LABELS[req.status]}
                </span>
              </div>
              <div className="text-sm text-gray-400 mt-1">
                {req.status === WithdrawalStatus.FINALIZED
                  ? `${formatDcc(req.dccFinal, 4)} DCC`
                  : `~${formatDcc(req.dccEstimate, 4)} DCC (est.)`}
                {' · '}
                {formatDcc(req.shares, 4)} stDCC
              </div>
            </div>
            {req.status === WithdrawalStatus.FINALIZED && (
              <button
                onClick={() => handleClaim(req.id)}
                disabled={claimingId === req.id}
                className="btn-primary text-sm py-2 px-4"
              >
                {claimingId === req.id ? 'Claiming...' : 'Claim'}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
