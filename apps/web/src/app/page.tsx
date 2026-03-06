// =============================================================================
// Home Page — Stake / Unstake
// =============================================================================

'use client';

import { ProtocolStats, DepositForm, WithdrawForm, UserStats, WithdrawalRequests } from '@/components';

export default function HomePage() {
  return (
    <div className="space-y-6">
      {/* Protocol Overview */}
      <ProtocolStats />

      {/* User Position */}
      <UserStats />

      {/* Stake / Unstake Forms */}
      <div className="grid md:grid-cols-2 gap-6">
        <DepositForm />
        <WithdrawForm />
      </div>

      {/* Withdrawal Requests */}
      <WithdrawalRequests />
    </div>
  );
}
