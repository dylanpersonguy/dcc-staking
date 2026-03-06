// =============================================================================
// Component: DepositForm
// =============================================================================

'use client';

import { useState } from 'react';
import { useWallet, useProtocolState, useDccBalance, useUserState } from '@/hooks';
import { getTxBuilder, estimateDeposit } from '@/lib/protocol';
import { formatDcc, parseDccToWavelets } from '@/lib/format';
import toast from 'react-hot-toast';

export function DepositForm() {
  const { wallet, connected, signAndBroadcast } = useWallet();
  const { state, refresh: refreshState } = useProtocolState();
  const { balance, refresh: refreshBalance } = useDccBalance(wallet?.address);
  const { refresh: refreshUser } = useUserState(wallet?.address);
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const amountWavelets =
    amount && !isNaN(parseFloat(amount)) ? parseDccToWavelets(amount) : 0n;

  const estimate =
    state && amountWavelets > 0n
      ? estimateDeposit(amountWavelets, state.totalPooledDcc, state.totalShares)
      : null;

  const handleDeposit = async () => {
    if (!connected || amountWavelets <= 0n) return;
    setSubmitting(true);

    try {
      const txBuilder = getTxBuilder();
      const tx = txBuilder.buildDepositTx(Number(amountWavelets));
      const result = await signAndBroadcast(tx);
      toast.success(`Deposit submitted! TX: ${result?.id || 'pending'}`);
      setAmount('');
      setTimeout(() => {
        refreshState();
        refreshBalance();
        refreshUser();
      }, 5000);
    } catch (err: any) {
      toast.error(`Deposit failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleMax = () => {
    if (balance > 0n) {
      const maxAmount = balance - BigInt(1_000_000);
      if (maxAmount > 0n) {
        setAmount(formatDcc(maxAmount, 8));
      }
    }
  };

  return (
    <div className="glass-card !p-0 overflow-hidden">
      {/* Accent bar */}
      <div className="h-[2px] bg-gradient-to-r from-dcc-500 via-blue-500 to-dcc-500" />

      <div className="p-5 md:p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-dcc-500/10 border border-dcc-500/20 flex items-center justify-center text-base">
            📥
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">Stake DCC</h2>
            <p className="text-[11px] text-gray-600">Earn yield on your DCC</p>
          </div>
        </div>

        {!connected ? (
          <div className="text-center py-8">
            <div className="text-3xl mb-3 opacity-40">🔗</div>
            <p className="text-sm text-gray-500">Connect your wallet to stake</p>
          </div>
        ) : (
          <>
            {/* Amount input */}
            <div className="mb-4">
              <div className="flex justify-between items-center text-xs text-gray-500 mb-2">
                <span className="uppercase tracking-wider font-medium">Amount</span>
                <span className="flex items-center gap-1.5">
                  <span className="text-gray-600">{formatDcc(balance, 4)} DCC</span>
                  <button
                    onClick={handleMax}
                    className="text-dcc-400 hover:text-dcc-300 font-semibold uppercase tracking-wider transition-colors"
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
                  className="input-field text-2xl font-semibold !pr-16 tracking-tight"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-500">
                  DCC
                </span>
              </div>
            </div>

            {/* Estimate */}
            {estimate && (
              <div className="mb-4 rounded-xl bg-white/[0.02] border border-white/[0.04] p-4 space-y-2.5 animate-fade-in">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500 uppercase tracking-wider">You receive</span>
                  <span className="text-white font-semibold text-sm">
                    ~{formatDcc(estimate.sharesToReceive, 4)}
                    <span className="text-gray-500 font-normal ml-1">stDCC</span>
                  </span>
                </div>
                <div className="h-px bg-white/[0.04]" />
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500 uppercase tracking-wider">Rate</span>
                  <span className="text-xs text-gray-400">{formatDcc(estimate.exchangeRate, 6)} DCC/stDCC</span>
                </div>
              </div>
            )}

            {/* CTA */}
            <button
              onClick={handleDeposit}
              disabled={submitting || amountWavelets <= 0n}
              className="btn-primary w-full text-base"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Staking…
                </span>
              ) : (
                'Stake DCC'
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
