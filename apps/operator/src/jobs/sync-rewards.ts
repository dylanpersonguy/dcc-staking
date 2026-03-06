// =============================================================================
// DCC Liquid Staking Operator — Job: Sync Rewards
// =============================================================================
// Detects new staking rewards by comparing dApp balance to expected balance.
// Reports reward amount to the protocol via syncRewards().

import { ProtocolReader, ProtocolState } from '@dcc-staking/sdk';
import { OperatorSigner } from '../signer';

export interface RewardSyncResult {
  detectedReward: bigint;
  txId: string | null;
  error?: string;
}

/**
 * Detect and sync staking rewards.
 *
 * Logic:
 * 1. Read current dApp native balance (available + leased-out)
 * 2. Read current totalPooledDcc from protocol state
 * 3. Reward = actual balance - totalPooledDcc (accounting for claimable)
 * 4. If positive reward detected, call syncRewards()
 *
 * NOTE: This is a simplified Phase 1 implementation.
 * Phase 2 will use more sophisticated reward tracking.
 */
export async function syncRewards(
  reader: ProtocolReader,
  signer: OperatorSigner,
  dAppAddress: string
): Promise<RewardSyncResult> {
  const state = await reader.getProtocolState();
  const balance = await reader.getNodeClient().getDccBalance(dAppAddress);

  // The dApp's actual DCC holdings:
  // available = liquid (not leased, not in pending txs)
  // effective = available + leased to this account (as a generator)
  // regular = total without leasing effects
  //
  // What the protocol "knows" about:
  // totalPooledDcc = total DCC the protocol accounts for
  //
  // Actual total DCC controlled by protocol:
  // = balance.regular (on-chain balance) + totalLeasedDcc (leased out to validators)
  // But: totalLeasedDcc is already subtracted from balance when creating Lease txs
  // So: actual = balance.available + state.totalLeasedDcc
  //
  // Reward = actual - state.totalPooledDcc

  const actualDcc = balance.available + state.totalLeasedDcc;
  const expectedDcc = state.totalPooledDcc;
  const reward = actualDcc - expectedDcc;

  if (reward <= 0n) {
    console.log(
      `[rewards] No new rewards detected. actual=${actualDcc}, expected=${expectedDcc}`
    );
    return { detectedReward: 0n, txId: null };
  }

  console.log(`[rewards] Detected reward: ${reward} wavelets`);

  // Minimum reward threshold to avoid dust syncs (0.01 DCC)
  const MIN_REWARD = BigInt(1_000_000);
  if (reward < MIN_REWARD) {
    console.log(`[rewards] Reward below threshold (${MIN_REWARD}), skipping sync`);
    return { detectedReward: reward, txId: null };
  }

  try {
    const result = await signer.invokeScript({
      dApp: dAppAddress,
      call: {
        function: 'syncRewards',
        args: [{ type: 'integer', value: Number(reward) }],
      },
    });

    console.log(`[rewards] Synced rewards: ${reward} wavelets, txId=${result.id}`);
    return { detectedReward: reward, txId: result.id };
  } catch (err: any) {
    console.error(`[rewards] Failed to sync rewards:`, err.message);
    return { detectedReward: reward, txId: null, error: err.message };
  }
}
