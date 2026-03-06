// =============================================================================
// Component: ProtocolStats
// =============================================================================

'use client';

import { useProtocolState } from '@/hooks';
import { formatDcc, formatBps, formatNumber } from '@/lib/format';

export function ProtocolStats() {
  const { state, loading, error } = useProtocolState();

  if (loading) {
    return (
      <div className="glass-card animate-pulse">
        <div className="h-6 bg-white/10 rounded w-1/3 mb-4" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i}>
              <div className="h-8 bg-white/10 rounded mb-2" />
              <div className="h-4 bg-white/5 rounded w-2/3" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !state) {
    return (
      <div className="glass-card">
        <p className="text-red-400">Failed to load protocol state: {error}</p>
      </div>
    );
  }

  const stats = [
    { label: 'Total Value Locked', value: `${formatDcc(state.totalPooledDcc, 2)} DCC` },
    { label: 'Exchange Rate', value: `${formatDcc(state.exchangeRate, 6)} DCC/stDCC` },
    { label: 'Total Shares', value: `${formatDcc(state.totalShares, 2)} stDCC` },
    { label: 'Total Leased', value: `${formatDcc(state.totalLeasedDcc, 2)} DCC` },
    { label: 'Liquid Balance', value: `${formatDcc(state.totalLiquidDcc, 2)} DCC` },
    { label: 'Pending Withdrawals', value: `${formatDcc(state.totalPendingWithdrawDcc, 2)} DCC` },
    { label: 'Validators', value: state.validatorCount.toString() },
    { label: 'Protocol Fee', value: formatBps(state.protocolFeeBps) },
  ];

  return (
    <div className="glass-card">
      <h2 className="text-lg font-semibold text-white mb-4">Protocol Overview</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.label}>
            <p className="stat-value">{stat.value}</p>
            <p className="stat-label">{stat.label}</p>
          </div>
        ))}
      </div>
      {state.paused && (
        <div className="mt-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30 px-4 py-2 text-yellow-400 text-sm">
          Protocol is currently paused
        </div>
      )}
      {state.emergencyMode && (
        <div className="mt-4 rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-2 text-red-400 text-sm">
          Emergency mode active
        </div>
      )}
    </div>
  );
}
