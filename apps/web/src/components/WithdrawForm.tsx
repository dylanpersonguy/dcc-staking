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
    <div className="glass-card">
      <h2 className="text-lg font-semibold text-white mb-4">Unstake stDCC</h2>

      {!connected ? (
        <p className="text-gray-400 text-sm">Connect your wallet to unstake</p>
      ) : (
        <>
          <div className="mb-4">
            <div className="flex justify-between text-sm text-gray-400 mb-1">
              <span>Amount (stDCC)</span>
              <span>
                Balance: {formatDcc(stDccBalance, 4)} stDCC
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
                <span>You will receive (est.)</span>
                <span className="text-white font-medium">
                  ~{formatDcc(estimate.dccToReceive, 4)} DCC
                </span>
              </div>
              <div className="flex justify-between text-gray-400 mt-1">
                <span>Exchange rate</span>
                <span>{formatDcc(estimate.exchangeRate, 6)} DCC/stDCC</span>
              </div>
            </div>
          )}

          <div className="mb-4 rounded-lg bg-yellow-500/5 border border-yellow-500/20 p-3 text-xs text-yellow-300">
            Withdrawals go through a settlement period. After requesting withdrawal,
            your DCC will be available to claim once the operator finalizes the request.
          </div>

          <button
            onClick={handleWithdraw}
            disabled={submitting || sharesWavelets <= 0n}
            className="btn-secondary w-full"
          >
            {submitting ? 'Requesting...' : 'Request Withdrawal'}
          </button>
        </>
      )}
    </div>
  );
}
