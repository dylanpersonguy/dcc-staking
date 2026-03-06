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

const STATUS_CONFIG: Record<number, { label: string; color: string; dot: string; bg: string }> = {
  0: { label: 'Pending', color: 'text-yellow-400', dot: 'bg-yellow-400', bg: 'bg-yellow-400/[0.06] border-yellow-400/10' },
  1: { label: 'Claimable', color: 'text-emerald-400', dot: 'bg-emerald-400', bg: 'bg-emerald-400/[0.06] border-emerald-400/10' },
  2: { label: 'Claimed', color: 'text-gray-500', dot: 'bg-gray-500', bg: 'bg-white/[0.02] border-white/[0.04]' },
  3: { label: 'Cancelled', color: 'text-red-400', dot: 'bg-red-400', bg: 'bg-red-400/[0.06] border-red-400/10' },
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
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Withdrawals</h2>
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="skeleton h-20 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Withdrawals</h2>
        <div className="glass-card text-center py-8">
          <div className="text-2xl mb-2 opacity-30">📭</div>
          <p className="text-sm text-gray-600">No withdrawal requests yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Withdrawals</h2>
        <span className="text-[10px] text-gray-600 bg-white/[0.03] border border-white/[0.05] rounded-lg px-2 py-0.5">
          {requests.length} request{requests.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="space-y-2">
        {requests.map((req, i) => {
          const status = STATUS_CONFIG[req.status] ?? STATUS_CONFIG[0];
          return (
            <div
              key={req.id}
              className={`glass-card !p-4 flex items-center justify-between gap-4 stagger-${Math.min(i + 1, 6)}`}
            >
              <div className="flex items-center gap-4 min-w-0">
                {/* Status dot */}
                <div className={`w-2 h-2 rounded-full ${status.dot} shrink-0 ${req.status === 0 ? 'animate-pulse' : ''}`} />

                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white font-medium text-sm">#{req.id}</span>
                    <span className={`inline-flex items-center rounded-lg px-2 py-0.5 text-[10px] font-medium border ${status.bg} ${status.color}`}>
                      {status.label}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 truncate">
                    {req.status === WithdrawalStatus.FINALIZED
                      ? `${formatDcc(req.dccFinal, 4)} DCC`
                      : `~${formatDcc(req.dccEstimate, 4)} DCC (est.)`}
                    <span className="text-gray-700 mx-1.5">·</span>
                    {formatDcc(req.shares, 4)} stDCC
                  </p>
                </div>
              </div>

              {req.status === WithdrawalStatus.FINALIZED && (
                <button
                  onClick={() => handleClaim(req.id)}
                  disabled={claimingId === req.id}
                  className="btn-primary text-xs !py-2 !px-4 shrink-0"
                >
                  {claimingId === req.id ? (
                    <span className="flex items-center gap-1.5">
                      <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Claiming
                    </span>
                  ) : (
                    'Claim'
                  )}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
