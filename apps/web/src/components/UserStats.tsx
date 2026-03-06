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

  const positions = [
    { label: 'DCC Balance', value: formatDcc(dccBalance, 4), unit: 'DCC', icon: '💰', accent: 'from-dcc-500/10 to-transparent' },
    { label: 'stDCC Balance', value: formatDcc(userState.stDccBalance, 4), unit: 'stDCC', icon: '🔮', accent: 'from-violet-500/10 to-transparent' },
    { label: 'Est. DCC Value', value: formatDcc(userState.estimatedDccValue, 4), unit: 'DCC', icon: '📊', accent: 'from-emerald-500/10 to-transparent' },
    { label: 'Withdrawals', value: userState.withdrawCount.toString(), unit: '', icon: '📋', accent: 'from-amber-500/10 to-transparent' },
  ];

  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Your Position</h2>
        {state && userState.stDccBalance > 0n && (
          <span className="text-[10px] text-gray-600 bg-white/[0.03] border border-white/[0.05] rounded-lg px-2 py-0.5">
            1 stDCC = {formatDcc(state.exchangeRate, 4)} DCC
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {positions.map((pos, i) => (
          <div
            key={pos.label}
            className={`glass-card group relative overflow-hidden stagger-${i + 1}`}
          >
            {/* Subtle gradient bg */}
            <div className={`absolute inset-0 bg-gradient-to-br ${pos.accent} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <span className="stat-label !mb-0 !text-[10px]">{pos.label}</span>
                <span className="text-sm opacity-50 group-hover:opacity-100 transition-opacity">{pos.icon}</span>
              </div>
              <p className="stat-value !text-lg">{pos.value}</p>
              {pos.unit && <p className="text-[10px] text-gray-600 mt-0.5">{pos.unit}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
