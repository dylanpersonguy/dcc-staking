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
      // Refresh data
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
      // Leave 0.01 DCC for tx fees
      const maxAmount = balance - BigInt(1_000_000);
      if (maxAmount > 0n) {
        setAmount(formatDcc(maxAmount, 8));
      }
    }
  };

  return (
    <div className="glass-card">
      <h2 className="text-lg font-semibold text-white mb-4">Stake DCC</h2>

      {!connected ? (
        <p className="text-gray-400 text-sm">Connect your wallet to stake DCC</p>
      ) : (
        <>
          <div className="mb-4">
            <div className="flex justify-between text-sm text-gray-400 mb-1">
              <span>Amount (DCC)</span>
              <span>
                Balance: {formatDcc(balance, 4)} DCC
                <button
                  onClick={handleMax}
                  className="ml-2 text-dcc-400 hover:text-dcc-300 text-xs"
                >
                  MAX
                </button>
              </span>
            </div>
            <input
              type="text"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="input-field text-xl"
            />
          </div>

          {estimate && (
            <div className="mb-4 rounded-lg bg-white/5 p-3 text-sm">
              <div className="flex justify-between text-gray-300">
                <span>You will receive</span>
                <span className="text-white font-medium">
                  ~{formatDcc(estimate.sharesToReceive, 4)} stDCC
                </span>
              </div>
              <div className="flex justify-between text-gray-400 mt-1">
                <span>Exchange rate</span>
                <span>{formatDcc(estimate.exchangeRate, 6)} DCC/stDCC</span>
              </div>
            </div>
          )}

          <button
            onClick={handleDeposit}
            disabled={submitting || amountWavelets <= 0n}
            className="btn-primary w-full"
          >
            {submitting ? 'Staking...' : 'Stake DCC'}
          </button>
        </>
      )}
    </div>
  );
}
