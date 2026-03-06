// =============================================================================
// DCC Liquid Staking Operator — Job: Lease Rebalance
// =============================================================================
// Manages leasing of idle DCC to validators based on configured weights.

import { ProtocolReader, ValidatorState } from '@dcc-staking/sdk';
import { OperatorSigner } from '../signer';

export interface LeaseRebalanceResult {
  leaseActions: Array<{
    validator: string;
    type: 'lease' | 'cancel';
    amount: bigint;
    txId?: string;
    error?: string;
  }>;
}

/**
 * Rebalance leases across validators.
 *
 * Phase 1 (single validator): Just lease excess idle DCC.
 * Phase 2 (multi-validator): Distribute by weight, rebalance drifts.
 *
 * Logic:
 * 1. Determine idle DCC = totalLiquid - buffer for pending withdrawals
 * 2. For each enabled validator, calculate target lease based on weight
 * 3. Create Lease / LeaseCancel as needed
 * 4. Update protocol accounting via recordLease / recordLeaseCancel
 */
export async function leaseRebalance(
  reader: ProtocolReader,
  signer: OperatorSigner,
  dAppAddress: string
): Promise<LeaseRebalanceResult> {
  const state = await reader.getProtocolState();
  const validators = await reader.getAllValidators();
  const enabledValidators = validators.filter((v) => v.enabled && v.exists);

  if (enabledValidators.length === 0) {
    console.log('[lease] No enabled validators, skipping rebalance');
    return { leaseActions: [] };
  }

  // Determine how much DCC is available for leasing
  // Keep a buffer for pending withdrawals + minimum liquidity
  const pendingWithdrawals = state.totalPendingWithdrawDcc;
  const MIN_LIQUID_BUFFER = BigInt(100_000_000); // 1 DCC minimum buffer

  const targetLiquid = pendingWithdrawals + MIN_LIQUID_BUFFER;
  const currentLiquid = state.totalLiquidDcc;
  const excessLiquid = currentLiquid > targetLiquid ? currentLiquid - targetLiquid : 0n;

  if (excessLiquid <= 0n) {
    console.log(`[lease] No excess liquid DCC. current=${currentLiquid}, target=${targetLiquid}`);

    // Check if we need to cancel leases to meet withdrawal demand
    if (currentLiquid < pendingWithdrawals) {
      return await cancelLeasesForLiquidity(
        reader,
        signer,
        dAppAddress,
        enabledValidators,
        pendingWithdrawals - currentLiquid
      );
    }
    return { leaseActions: [] };
  }

  // Phase 1: Simple allocation to validators by weight
  const totalWeight = enabledValidators.reduce((sum, v) => sum + BigInt(v.weightBps), 0n);
  if (totalWeight === 0n) {
    console.log('[lease] Total validator weight is zero, skipping');
    return { leaseActions: [] };
  }

  const actions: LeaseRebalanceResult['leaseActions'] = [];
  const MIN_LEASE_AMOUNT = BigInt(100_000_000); // 1 DCC minimum lease

  for (const validator of enabledValidators) {
    const targetLease = (excessLiquid * BigInt(validator.weightBps)) / totalWeight;

    if (targetLease < MIN_LEASE_AMOUNT) {
      console.log(`[lease] Target lease for ${validator.address} below minimum, skipping`);
      continue;
    }

    try {
      // Create native Lease transaction
      const leaseResult = await signer.lease(validator.address, Number(targetLease));

      // Record the lease in protocol accounting
      await signer.invokeScript({
        dApp: dAppAddress,
        call: {
          function: 'recordLease',
          args: [
            { type: 'string', value: validator.address },
            { type: 'integer', value: Number(targetLease) },
            { type: 'string', value: leaseResult.id },
          ],
        },
      });

      actions.push({
        validator: validator.address,
        type: 'lease',
        amount: targetLease,
        txId: leaseResult.id,
      });

      console.log(
        `[lease] Leased ${targetLease} wavelets to ${validator.address}, txId=${leaseResult.id}`
      );
    } catch (err: any) {
      console.error(`[lease] Failed to lease to ${validator.address}:`, err.message);
      actions.push({
        validator: validator.address,
        type: 'lease',
        amount: targetLease,
        error: err.message,
      });
    }
  }

  return { leaseActions: actions };
}

/**
 * Cancel leases to free liquidity for pending withdrawals.
 */
async function cancelLeasesForLiquidity(
  reader: ProtocolReader,
  signer: OperatorSigner,
  dAppAddress: string,
  validators: ValidatorState[],
  neededAmount: bigint
): Promise<LeaseRebalanceResult> {
  const actions: LeaseRebalanceResult['leaseActions'] = [];
  let remaining = neededAmount;

  // Cancel leases starting from validators with most leased
  const sorted = [...validators].sort((a, b) =>
    Number(b.leasedDcc - a.leasedDcc)
  );

  for (const validator of sorted) {
    if (remaining <= 0n) break;
    if (validator.leasedDcc <= 0n || !validator.lastLeaseId) continue;

    const cancelAmount = validator.leasedDcc < remaining ? validator.leasedDcc : remaining;

    try {
      // Cancel the native lease
      await signer.leaseCancel(validator.lastLeaseId);

      // Record cancellation in protocol accounting
      await signer.invokeScript({
        dApp: dAppAddress,
        call: {
          function: 'recordLeaseCancel',
          args: [
            { type: 'string', value: validator.address },
            { type: 'integer', value: Number(cancelAmount) },
          ],
        },
      });

      actions.push({
        validator: validator.address,
        type: 'cancel',
        amount: cancelAmount,
      });

      remaining -= cancelAmount;
      console.log(
        `[lease] Cancelled ${cancelAmount} wavelets from ${validator.address}`
      );
    } catch (err: any) {
      console.error(`[lease] Failed to cancel lease for ${validator.address}:`, err.message);
      actions.push({
        validator: validator.address,
        type: 'cancel',
        amount: cancelAmount,
        error: err.message,
      });
    }
  }

  if (remaining > 0n) {
    console.warn(`[lease] WARNING: Unable to free enough liquidity. Still need ${remaining}`);
  }

  return { leaseActions: actions };
}
