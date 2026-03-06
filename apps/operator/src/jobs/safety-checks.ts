// =============================================================================
// DCC Liquid Staking Operator — Job: Safety Checks
// =============================================================================
// Validates protocol invariants and raises alerts if anomalies detected.

import { ProtocolReader } from '@dcc-staking/sdk';

export interface SafetyCheckResult {
  passed: boolean;
  checks: Array<{
    name: string;
    passed: boolean;
    details: string;
  }>;
}

/**
 * Run safety checks against protocol invariants.
 */
export async function runSafetyChecks(
  reader: ProtocolReader,
  dAppAddress: string
): Promise<SafetyCheckResult> {
  const state = await reader.getProtocolState();
  const balance = await reader.getNodeClient().getDccBalance(dAppAddress);
  const checks: SafetyCheckResult['checks'] = [];

  // Check 1: totalPooledDcc >= totalClaimable + totalPending
  {
    const obligations = state.totalClaimableDcc + state.totalPendingWithdrawDcc;
    const passed = state.totalPooledDcc >= obligations;
    checks.push({
      name: 'solvency',
      passed,
      details: `totalPooled=${state.totalPooledDcc}, obligations=${obligations}`,
    });
  }

  // Check 2: totalLiquid + totalLeased + totalClaimable ≈ totalPooled
  {
    const accounting = state.totalLiquidDcc + state.totalLeasedDcc + state.totalClaimableDcc;
    // Allow small rounding drift (up to 1 DCC)
    const drift =
      accounting > state.totalPooledDcc
        ? accounting - state.totalPooledDcc
        : state.totalPooledDcc - accounting;
    const MAX_DRIFT = BigInt(100_000_000); // 1 DCC
    const passed = drift <= MAX_DRIFT;
    checks.push({
      name: 'accounting_reconciliation',
      passed,
      details: `liquid+leased+claimable=${accounting}, totalPooled=${state.totalPooledDcc}, drift=${drift}`,
    });
  }

  // Check 3: On-chain balance should cover liquid + claimable
  {
    const expectedOnChain = state.totalLiquidDcc + state.totalClaimableDcc;
    const passed = balance.available >= expectedOnChain;
    checks.push({
      name: 'balance_coverage',
      passed,
      details: `onChainAvailable=${balance.available}, expectedOnChain=${expectedOnChain}`,
    });
  }

  // Check 4: Protocol not paused unexpectedly
  {
    checks.push({
      name: 'pause_check',
      passed: !state.paused,
      details: `paused=${state.paused}`,
    });
  }

  // Check 5: Emergency mode check
  {
    checks.push({
      name: 'emergency_check',
      passed: !state.emergencyMode,
      details: `emergencyMode=${state.emergencyMode}`,
    });
  }

  // Check 6: Exchange rate sanity (rate should be >= 1.0 DCC per stDCC in normal operations)
  {
    const ONE_DCC = BigInt(100_000_000);
    const passed = state.exchangeRate >= ONE_DCC || state.totalShares === 0n;
    checks.push({
      name: 'exchange_rate_floor',
      passed,
      details: `exchangeRate=${state.exchangeRate}, oneDcc=${ONE_DCC}`,
    });
  }

  const allPassed = checks.every((c) => c.passed);
  if (!allPassed) {
    const failed = checks.filter((c) => !c.passed);
    console.error(`[safety] FAILED CHECKS (${failed.length}):`);
    for (const f of failed) {
      console.error(`  - ${f.name}: ${f.details}`);
    }
  } else {
    console.log('[safety] All safety checks passed');
  }

  return { passed: allPassed, checks };
}
