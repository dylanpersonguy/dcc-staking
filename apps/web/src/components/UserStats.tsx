// =============================================================================
// Component: UserStats
// =============================================================================

'use client';

import { useWallet, useUserState, useDccBalance, useProtocolState } from '@/hooks';
import { formatDcc } from '@/lib/format';

export function UserStats() {
  const { wallet, connected } = useWallet();
  const { userState } = useUserState(wallet?.address);
  const { balance: dccBalance } = useDccBalance(wallet?.address);
  const { state } = useProtocolState();

  if (!connected || !userState) return null;

  return (
    <div className="glass-card">
      <h2 className="text-lg font-semibold text-white mb-4">Your Position</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <p className="stat-value">{formatDcc(dccBalance, 4)}</p>
          <p className="stat-label">DCC Balance</p>
        </div>
        <div>
          <p className="stat-value">{formatDcc(userState.stDccBalance, 4)}</p>
          <p className="stat-label">stDCC Balance</p>
        </div>
        <div>
          <p className="stat-value">{formatDcc(userState.estimatedDccValue, 4)}</p>
          <p className="stat-label">Est. DCC Value</p>
        </div>
        <div>
          <p className="stat-value">{userState.withdrawCount}</p>
          <p className="stat-label">Withdrawals</p>
        </div>
      </div>

      {state && userState.stDccBalance > 0n && (
        <div className="mt-4 text-sm text-gray-400">
          Exchange rate: 1 stDCC = {formatDcc(state.exchangeRate, 6)} DCC
        </div>
      )}
    </div>
  );
}
