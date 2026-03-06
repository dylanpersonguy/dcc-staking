// =============================================================================
// Home Page — Stake / Unstake
// =============================================================================

'use client';

import { ProtocolStats, DepositForm, WithdrawForm, UserStats, WithdrawalRequests } from '@/components';

export default function HomePage() {
  return (
    <div className="space-y-8">
      {/* Hero */}
      <section className="text-center pt-4 pb-2 animate-fade-in">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white mb-2">
          Liquid Staking for{' '}
          <span className="gradient-text">DecentralChain</span>
        </h1>
        <p className="text-sm md:text-base text-gray-500 max-w-lg mx-auto">
          Stake DCC, receive stDCC, and earn yield while keeping your assets liquid.
        </p>
      </section>

      {/* Protocol Overview */}
      <section>
        <ProtocolStats />
      </section>

      {/* User Position */}
      <section>
        <UserStats />
      </section>

      {/* Stake / Unstake Forms */}
      <section>
        <div className="grid md:grid-cols-2 gap-4">
          <DepositForm />
          <WithdrawForm />
        </div>
      </section>

      {/* Withdrawal Requests */}
      <section>
        <WithdrawalRequests />
      </section>
    </div>
  );
}
