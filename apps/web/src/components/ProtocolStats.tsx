// =============================================================================
// Component: ProtocolStats
// =============================================================================

'use client';

import { useProtocolState } from '@/hooks';
import { formatDcc, formatBps } from '@/lib/format';

export function ProtocolStats() {
  const { state, loading, error } = useProtocolState();
  const isDemo = !process.env.NEXT_PUBLIC_DAPP_ADDRESS;

  if (loading) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="skeleton h-40 rounded-2xl" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="skeleton h-24 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !state) {
    return (
      <div className="glass-card !border-red-500/20">
        <div className="flex items-center gap-3 text-red-400">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          <p>Failed to load protocol state: {error}</p>
        </div>
      </div>
    );
  }

  const stats = [
    { label: 'Exchange Rate', value: formatDcc(state.exchangeRate, 6), unit: 'DCC/stDCC', icon: '⚡' },
    { label: 'Total Shares', value: formatDcc(state.totalShares, 2), unit: 'stDCC', icon: '🪙' },
    { label: 'Total Leased', value: formatDcc(state.totalLeasedDcc, 2), unit: 'DCC', icon: '🔗' },
    { label: 'Liquid Balance', value: formatDcc(state.totalLiquidDcc, 2), unit: 'DCC', icon: '💧' },
    { label: 'Pending Withdrawals', value: formatDcc(state.totalPendingWithdrawDcc, 2), unit: 'DCC', icon: '⏳' },
    { label: 'Validators', value: state.validatorCount.toString(), unit: '', icon: '🛡️' },
  ];

  return (
    <div className="space-y-4">
      {/* Demo banner */}
      {isDemo && (
        <div className="animate-fade-in rounded-2xl bg-dcc-500/[0.08] border border-dcc-500/20 px-5 py-3 flex items-center gap-3">
          <span className="text-lg">🧪</span>
          <p className="text-sm text-dcc-300">
            <span className="font-semibold">Demo Mode</span> — showing sample data.
            Set <code className="bg-white/[0.06] px-1.5 py-0.5 rounded-md text-xs font-mono">NEXT_PUBLIC_DAPP_ADDRESS</code> to connect live.
          </p>
        </div>
      )}

      {/* Hero TVL card */}
      <div className="glass-card !p-0 overflow-hidden stagger-1">
        <div className="relative px-6 py-8 md:px-8 md:py-10">
          {/* Gradient accent top bar */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-dcc-500 to-transparent" />
          {/* Background glow */}
          <div className="absolute inset-0 bg-gradient-to-br from-dcc-500/[0.04] via-transparent to-blue-500/[0.03]" />
          
          <div className="relative flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <p className="text-sm font-medium uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-2">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Total Value Locked
              </p>
              <p className="text-4xl md:text-5xl font-bold gradient-text tracking-tight">
                {formatDcc(state.totalPooledDcc, 2)}
                <span className="text-lg md:text-xl font-medium text-gray-500 ml-2">DCC</span>
              </p>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2 rounded-xl bg-white/[0.04] border border-white/[0.06] px-3 py-2">
                <span className="text-xs text-gray-500">Fee</span>
                <span className="text-white font-medium">{formatBps(state.protocolFeeBps)}</span>
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-emerald-500/[0.08] border border-emerald-500/20 px-3 py-2">
                <span className="text-xs text-emerald-400/70">APY</span>
                <span className="text-emerald-400 font-medium">~4.2%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stat grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {stats.map((stat, i) => (
          <div
            key={stat.label}
            className={`glass-card group hover:border-white/[0.12] transition-all duration-300 stagger-${i + 2}`}
          >
            <div className="flex items-start justify-between mb-3">
              <span className="stat-label !mb-0">{stat.label}</span>
              <span className="text-base opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300">{stat.icon}</span>
            </div>
            <p className="stat-value !text-lg">{stat.value}</p>
            {stat.unit && (
              <p className="text-[11px] text-gray-600 mt-0.5">{stat.unit}</p>
            )}
          </div>
        ))}
      </div>

      {/* Alert banners */}
      {state.paused && (
        <div className="animate-fade-in rounded-2xl bg-yellow-500/[0.06] border border-yellow-500/20 px-5 py-3 flex items-center gap-3">
          <span className="text-lg">⚠️</span>
          <p className="text-sm text-yellow-400">Protocol is currently paused</p>
        </div>
      )}
      {state.emergencyMode && (
        <div className="animate-fade-in rounded-2xl bg-red-500/[0.06] border border-red-500/20 px-5 py-3 flex items-center gap-3">
          <span className="text-lg">🚨</span>
          <p className="text-sm text-red-400">Emergency mode active</p>
        </div>
      )}
    </div>
  );
}
