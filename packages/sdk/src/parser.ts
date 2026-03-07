// =============================================================================
// DCC Liquid Staking SDK — Data Entry Parser
// =============================================================================
// Utility to parse raw data entries into typed protocol objects.

import { DataEntry } from './types';

export interface ParsedDepositEvent {
  height: number;
  txId: string;
  address: string;
  amount: bigint;
  shares: bigint;
}

export interface ParsedWithdrawRequestEvent {
  height: number;
  txId: string;
  address: string;
  requestId: string;
  shares: bigint;
  dccEstimate: bigint;
}

export interface ParsedWithdrawFinalizeEvent {
  height: number;
  txId: string;
  requestId: string;
  dccFinal: bigint;
}

export interface ParsedWithdrawClaimEvent {
  height: number;
  txId: string;
  address: string;
  requestId: string;
  dccFinal: bigint;
}

export interface ParsedRewardSyncEvent {
  height: number;
  txId: string;
  rewardAmount: bigint;
  feeAmount: bigint;
  netReward: bigint;
}

/**
 * Parse protocol data entries into structured events.
 */
export function parseProtocolDataEntries(entries: DataEntry[]) {
  const deposits: ParsedDepositEvent[] = [];
  const withdrawRequests: ParsedWithdrawRequestEvent[] = [];
  const withdrawFinalizations: ParsedWithdrawFinalizeEvent[] = [];
  const withdrawClaims: ParsedWithdrawClaimEvent[] = [];
  const rewardSyncs: ParsedRewardSyncEvent[] = [];

  for (const entry of entries) {
    if (entry.type !== 'string') continue;
    const val = entry.value as string;

    if (entry.key.startsWith('evt_deposit:')) {
      const [, heightStr, txId] = entry.key.split(':');
      const [address, amount, shares] = val.split(',');
      deposits.push({
        height: parseInt(heightStr, 10),
        txId,
        address,
        amount: BigInt(amount),
        shares: BigInt(shares),
      });
    } else if (entry.key.startsWith('evt_withdraw_req:')) {
      const [, heightStr, txId] = entry.key.split(':');
      const [address, requestId, shares, dccEstimate] = val.split(',');
      withdrawRequests.push({
        height: parseInt(heightStr, 10),
        txId,
        address,
        requestId,
        shares: BigInt(shares),
        dccEstimate: BigInt(dccEstimate),
      });
    } else if (entry.key.startsWith('evt_withdraw_fin:')) {
      const [, heightStr, txId] = entry.key.split(':');
      const [requestId, dccFinal] = val.split(',');
      withdrawFinalizations.push({
        height: parseInt(heightStr, 10),
        txId,
        requestId,
        dccFinal: BigInt(dccFinal),
      });
    } else if (entry.key.startsWith('evt_withdraw_claim:')) {
      const [, heightStr, txId] = entry.key.split(':');
      const [address, requestId, dccFinal] = val.split(',');
      withdrawClaims.push({
        height: parseInt(heightStr, 10),
        txId,
        address,
        requestId,
        dccFinal: BigInt(dccFinal),
      });
    } else if (entry.key.startsWith('evt_reward_sync:')) {
      const [, heightStr, txId] = entry.key.split(':');
      const [rewardAmount, feeAmount, netReward] = val.split(',');
      rewardSyncs.push({
        height: parseInt(heightStr, 10),
        txId,
        rewardAmount: BigInt(rewardAmount),
        feeAmount: BigInt(feeAmount),
        netReward: BigInt(netReward),
      });
    }
  }

  return { deposits, withdrawRequests, withdrawFinalizations, withdrawClaims, rewardSyncs };
}
