// =============================================================================
// Admin Dashboard (Role-gated)
// =============================================================================

'use client';

import { useState } from 'react';
import { useWallet, useProtocolState } from '@/hooks';
import { getTxBuilder } from '@/lib/protocol';
import { formatDcc, formatBps } from '@/lib/format';
import toast from 'react-hot-toast';

export default function AdminPage() {
  const { wallet, connected, signAndBroadcast } = useWallet();
  const { state, refresh } = useProtocolState();

  const isAdmin = connected && state && wallet?.address === state.admin;
  const isOperator = connected && state && wallet?.address === state.operator;

  if (!connected) {
    return (
      <div className="glass-card">
        <h1 className="text-2xl font-bold text-white mb-4">Admin Dashboard</h1>
        <p className="text-gray-400">Connect your wallet to access admin functions</p>
      </div>
    );
  }

  if (!isAdmin && !isOperator) {
    return (
      <div className="glass-card">
        <h1 className="text-2xl font-bold text-white mb-4">Admin Dashboard</h1>
        <p className="text-red-400">
          Your address does not have admin or operator permissions.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>

      {/* Protocol State Overview */}
      {state && (
        <div className="glass-card">
          <h2 className="text-lg font-semibold text-white mb-3">Protocol State</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Admin:</span>
              <span className="ml-2 text-white font-mono text-xs">{state.admin}</span>
            </div>
            <div>
              <span className="text-gray-400">Operator:</span>
              <span className="ml-2 text-white font-mono text-xs">{state.operator}</span>
            </div>
            <div>
              <span className="text-gray-400">Treasury:</span>
              <span className="ml-2 text-white font-mono text-xs">{state.treasury}</span>
            </div>
            <div>
              <span className="text-gray-400">Paused:</span>
              <span className={`ml-2 ${state.paused ? 'text-red-400' : 'text-green-400'}`}>
                {state.paused ? 'Yes' : 'No'}
              </span>
            </div>
            <div>
              <span className="text-gray-400">Emergency:</span>
              <span className={`ml-2 ${state.emergencyMode ? 'text-red-400' : 'text-green-400'}`}>
                {state.emergencyMode ? 'Yes' : 'No'}
              </span>
            </div>
            <div>
              <span className="text-gray-400">Fee:</span>
              <span className="ml-2 text-white">{formatBps(state.protocolFeeBps)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Admin Actions */}
      {isAdmin && <AdminActions refresh={refresh} signAndBroadcast={signAndBroadcast} />}

      {/* Operator Actions */}
      {(isAdmin || isOperator) && (
        <OperatorActions refresh={refresh} signAndBroadcast={signAndBroadcast} />
      )}
    </div>
  );
}

function AdminActions({
  refresh,
  signAndBroadcast,
}: {
  refresh: () => void;
  signAndBroadcast: (tx: any) => Promise<any>;
}) {
  const [validatorAddr, setValidatorAddr] = useState('');
  const [validatorWeight, setValidatorWeight] = useState('10000');
  const [feeBps, setFeeBps] = useState('');

  const txBuilder = getTxBuilder();

  const handleAddValidator = async () => {
    try {
      const tx = txBuilder.buildAddValidatorTx(validatorAddr, parseInt(validatorWeight));
      await signAndBroadcast(tx);
      toast.success('Validator added!');
      setValidatorAddr('');
      setTimeout(refresh, 5000);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handlePause = async () => {
    try {
      await signAndBroadcast(txBuilder.buildPauseTx());
      toast.success('Protocol paused');
      setTimeout(refresh, 5000);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleUnpause = async () => {
    try {
      await signAndBroadcast(txBuilder.buildUnpauseTx());
      toast.success('Protocol unpaused');
      setTimeout(refresh, 5000);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleSetFee = async () => {
    try {
      const tx = txBuilder.buildSetProtocolFeeBpsTx(parseInt(feeBps));
      await signAndBroadcast(tx);
      toast.success('Protocol fee updated');
      setFeeBps('');
      setTimeout(refresh, 5000);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="glass-card">
      <h2 className="text-lg font-semibold text-white mb-4">Admin Actions</h2>

      <div className="space-y-4">
        {/* Add Validator */}
        <div className="border border-white/5 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-300 mb-2">Add Validator</h3>
          <div className="flex gap-2">
            <input
              value={validatorAddr}
              onChange={(e) => setValidatorAddr(e.target.value)}
              placeholder="Validator address"
              className="input-field text-sm flex-1"
            />
            <input
              value={validatorWeight}
              onChange={(e) => setValidatorWeight(e.target.value)}
              placeholder="Weight (BPS)"
              className="input-field text-sm w-32"
            />
            <button onClick={handleAddValidator} className="btn-primary text-sm whitespace-nowrap">
              Add
            </button>
          </div>
        </div>

        {/* Protocol Fee */}
        <div className="border border-white/5 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-300 mb-2">Set Protocol Fee</h3>
          <div className="flex gap-2">
            <input
              value={feeBps}
              onChange={(e) => setFeeBps(e.target.value)}
              placeholder="Fee in BPS (e.g., 1000 = 10%)"
              className="input-field text-sm flex-1"
            />
            <button onClick={handleSetFee} className="btn-primary text-sm">
              Set
            </button>
          </div>
        </div>

        {/* Pause / Unpause */}
        <div className="border border-white/5 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-300 mb-2">Protocol Controls</h3>
          <div className="flex gap-2">
            <button onClick={handlePause} className="btn-secondary text-sm">
              Pause
            </button>
            <button onClick={handleUnpause} className="btn-primary text-sm">
              Unpause
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function OperatorActions({
  refresh,
  signAndBroadcast,
}: {
  refresh: () => void;
  signAndBroadcast: (tx: any) => Promise<any>;
}) {
  const [requestId, setRequestId] = useState('');
  const [rewardAmount, setRewardAmount] = useState('');

  const txBuilder = getTxBuilder();

  const handleFinalize = async () => {
    try {
      const tx = txBuilder.buildFinalizeWithdrawTx(requestId);
      await signAndBroadcast(tx);
      toast.success(`Withdrawal ${requestId} finalized`);
      setRequestId('');
      setTimeout(refresh, 5000);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleSyncRewards = async () => {
    try {
      const tx = txBuilder.buildSyncRewardsTx(parseInt(rewardAmount));
      await signAndBroadcast(tx);
      toast.success('Rewards synced');
      setRewardAmount('');
      setTimeout(refresh, 5000);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="glass-card">
      <h2 className="text-lg font-semibold text-white mb-4">Operator Actions</h2>

      <div className="space-y-4">
        {/* Finalize Withdrawal */}
        <div className="border border-white/5 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-300 mb-2">Finalize Withdrawal</h3>
          <div className="flex gap-2">
            <input
              value={requestId}
              onChange={(e) => setRequestId(e.target.value)}
              placeholder="Request ID"
              className="input-field text-sm flex-1"
            />
            <button onClick={handleFinalize} className="btn-primary text-sm">
              Finalize
            </button>
          </div>
        </div>

        {/* Sync Rewards */}
        <div className="border border-white/5 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-300 mb-2">Sync Rewards (Manual)</h3>
          <div className="flex gap-2">
            <input
              value={rewardAmount}
              onChange={(e) => setRewardAmount(e.target.value)}
              placeholder="Reward amount (wavelets)"
              className="input-field text-sm flex-1"
            />
            <button onClick={handleSyncRewards} className="btn-primary text-sm">
              Sync
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
