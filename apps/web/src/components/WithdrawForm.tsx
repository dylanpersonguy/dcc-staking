// =============================================================================
// Component: WithdrawForm
// =============================================================================

'use client';

import { useState } from 'react';
import { useWallet, useProtocolState, useUserState } from '@/hooks';
import { getTxBuilder, estimateWithdraw } from '@/lib/protocol';
import { formatDcc, parseDccToWavelets } from '@/lib/format';
import toast from 'react-hot-toast';

export function WithdrawForm() {
  const { wallet, connected, signAndBroadcast } = useWallet();
  const { state, refresh: refreshState } = useProtocolState();
  const { userState, refresh: refreshUser } = useUserState(wallet?.address);
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const sharesWavelets =
    amount && !isNaN(parseFloat(amount)) ? parseDccToWavelets(amount) : 0n;

  const estimate =
    state && sharesWavelets > 0n
      ? estimateWithdraw(sharesWavelets, state.totalPooledDcc, state.totalShares)
      : null;

  const handleWithdraw = async () => {
    if (!connected || sharesWavelets <= 0n) return;
    setSubmitting(true);

    try {
      const txBuilder = getTxBuilder();
      const tx = txBuilder.buildRequestWithdrawTx(Number(sharesWavelets));
      const result = await signAndBroadcast(tx);
      toast.success(`Withdrawal request submitted! TX: ${result?.id || 'pending'}`);
      setAmount('');
      setTimeout(() => {
        refreshState();
        refreshUser();
      }, 5000);
    } catch (err: any) {
      toast.error(`Withdrawal failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleMax = () => {
    if (userState && userState.stDccBalance > 0n) {
      setAmount(formatDcc(userState.stDccBalance, 8));
    }
  };

  const stDccBalance = userState?.stDccBalance ?? 0n;

  return (
    <div className="glass-card !p-0 overflow-hidden">
      {/* Accent bar - amber/orange for unstaking */}
      <div className="h-[2px] bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500" />

      <div className="p-5 md:p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-base">
            📤
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">Unstake stDCC</h2>
            <p className="text-[11px] text-gray-600">Convert back to DCC</p>
          </div>
        </div>

        {!connected ? (
          <div className="text-center py-8">
            <div className="text-3xl mb-3 opacity-40">🔓</div>
            <p className="text-sm text-gray-500">Connect your wallet to unstake</p>
          </div>
        ) : (
          <>
            {/* Amount input */}
            <div className="mb-4">
              <div className="flex justify-between items-center text-xs text-gray-500 mb-2">
                <span className="uppercase tracking-wider font-medium">Amount</span>
                <span className="flex items-center gap-1.5">
                  <span className="text-gray-600">{formatDcc(stDccBalance, 4)} stDCC</span>
                  <button
                    onClick={handleMax}
                    className="text-amber-400 hover:text-amber-300 font-semibold uppercase tracking-wider transition-colors"
                  >
                    Max
                  </button>
                </span>
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="input-field text-2xl font-semibold !pr-20 tracking-tight"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-500">
                  stDCC
                </span>
              </div>
            </div>

            {/* Estimate */}
            {estimate && (
              <div className="mb-4 rounded-xl bg-white/[0.02] border border-white/[0.04] p-4 space-y-2.5 animate-fade-in">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500 uppercase tracking-wider">You receive (est.)</span>
                  <span className="text-white font-semibold text-sm">
                    ~{formatDcc(estimate.dccToReceive, 4)}
                    <span className="text-gray-500 font-normal ml-1">DCC</span>
                  </span>
                </div>
                <div className="h-px bg-white/[0.04]" />
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500 uppercase tracking-wider">Rate</span>
                  <span className="text-xs text-gray-400">{formatDcc(estimate.exchangeRate, 6)} DCC/stDCC</span>
                </div>
              </div>
            )}

            {/* Settlement notice */}
            <div className="mb-4 rounded-xl bg-amber-500/[0.04] border border-amber-500/10 p-3.5 flex items-start gap-3">
              <span className="text-sm mt-px">⏱️</span>
              <p className="text-[11px] text-amber-300/80 leading-relaxed">
                Withdrawals require a settlement period. Your DCC will be available
                to claim once the operator finalizes the request.
              </p>
            </div>

            {/* CTA */}
            <button
              onClick={handleWithdraw}
              disabled={submitting || sharesWavelets <= 0n}
              className="btn-secondary w-full text-base"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Requesting…
                </span>
              ) : (
                'Request Withdrawal'
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
