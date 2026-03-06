// =============================================================================
// DCC Liquid Staking SDK — Protocol State Reader
// =============================================================================

import { KEYS } from '@dcc-staking/config';
import { NodeClient } from './node-client';
import {
  ProtocolState,
  ValidatorState,
  UserState,
  WithdrawalRequest,
  WithdrawalStatus,
  DataEntry,
} from './types';
import { calcExchangeRate, calcDccFromShares } from './math';

/**
 * Reads and parses protocol state from chain data entries.
 */
export class ProtocolReader {
  private node: NodeClient;
  private dAppAddress: string;

  constructor(nodeUrl: string, dAppAddress: string) {
    this.node = new NodeClient(nodeUrl);
    this.dAppAddress = dAppAddress;
  }

  // ---------------------------------------------------------------------------
  // Helpers for parsing data entries
  // ---------------------------------------------------------------------------

  private buildMap(entries: DataEntry[]): Map<string, DataEntry> {
    const map = new Map<string, DataEntry>();
    for (const e of entries) {
      map.set(e.key, e);
    }
    return map;
  }

  private str(map: Map<string, DataEntry>, key: string): string {
    const e = map.get(key);
    return e && e.type === 'string' ? (e.value as string) : '';
  }

  private int(map: Map<string, DataEntry>, key: string): bigint {
    const e = map.get(key);
    return e && e.type === 'integer' ? BigInt(e.value as number) : 0n;
  }

  private intNum(map: Map<string, DataEntry>, key: string): number {
    const e = map.get(key);
    return e && e.type === 'integer' ? (e.value as number) : 0;
  }

  private bool(map: Map<string, DataEntry>, key: string): boolean {
    const e = map.get(key);
    return e && e.type === 'boolean' ? (e.value as boolean) : false;
  }

  // ---------------------------------------------------------------------------
  // Protocol State
  // ---------------------------------------------------------------------------

  async getProtocolState(): Promise<ProtocolState> {
    const entries = await this.node.getDataEntries(this.dAppAddress);
    const m = this.buildMap(entries);

    const totalPooledDcc = this.int(m, KEYS.TOTAL_POOLED_DCC);
    const totalShares = this.int(m, KEYS.TOTAL_SHARES);
    const exchangeRate = calcExchangeRate(totalPooledDcc, totalShares);

    return {
      admin: this.str(m, KEYS.ADMIN),
      operator: this.str(m, KEYS.OPERATOR),
      guardian: this.str(m, KEYS.GUARDIAN),
      paused: this.bool(m, KEYS.PAUSED),
      emergencyMode: this.bool(m, KEYS.EMERGENCY_MODE),
      stDccAssetId: this.str(m, KEYS.STDCC_ASSET_ID),
      treasury: this.str(m, KEYS.TREASURY),
      protocolFeeBps: this.intNum(m, KEYS.PROTOCOL_FEE_BPS),
      totalPooledDcc,
      totalShares,
      totalLeasedDcc: this.int(m, KEYS.TOTAL_LEASED_DCC),
      totalLiquidDcc: this.int(m, KEYS.TOTAL_LIQUID_DCC),
      totalClaimableDcc: this.int(m, KEYS.TOTAL_CLAIMABLE_DCC),
      totalPendingWithdrawDcc: this.int(m, KEYS.TOTAL_PENDING_WITHDRAW_DCC),
      totalProtocolFeesDcc: this.int(m, KEYS.TOTAL_PROTOCOL_FEES_DCC),
      validatorCount: this.intNum(m, KEYS.VALIDATOR_COUNT),
      withdrawNonce: this.intNum(m, KEYS.WITHDRAW_NONCE),
      lastRewardSyncHeight: this.intNum(m, KEYS.LAST_REWARD_SYNC_HEIGHT),
      lastRewardSyncTs: this.intNum(m, KEYS.LAST_REWARD_SYNC_TS),
      minDepositDcc: this.int(m, KEYS.MIN_DEPOSIT_DCC),
      minWithdrawShares: this.int(m, KEYS.MIN_WITHDRAW_SHARES),
      exchangeRate,
    };
  }

  // ---------------------------------------------------------------------------
  // Validator State
  // ---------------------------------------------------------------------------

  async getValidatorState(address: string): Promise<ValidatorState> {
    const entries = await this.node.getDataByRegex(this.dAppAddress, `validator:${address}:.*`);
    const m = this.buildMap(entries);

    return {
      address,
      exists: this.bool(m, KEYS.validatorExists(address)),
      enabled: this.bool(m, KEYS.validatorEnabled(address)),
      weightBps: this.intNum(m, KEYS.validatorWeightBps(address)),
      leasedDcc: this.int(m, KEYS.validatorLeasedDcc(address)),
      lastLeaseId: this.str(m, KEYS.validatorLastLeaseId(address)),
      lastSyncHeight: this.intNum(m, KEYS.validatorLastSyncHeight(address)),
    };
  }

  async getAllValidators(): Promise<ValidatorState[]> {
    const state = await this.getProtocolState();
    const validators: ValidatorState[] = [];

    for (let i = 0; i < state.validatorCount; i++) {
      const entry = await this.node.getDataEntry(this.dAppAddress, KEYS.validatorIndex(i));
      if (entry && entry.type === 'string') {
        const addr = entry.value as string;
        const vs = await this.getValidatorState(addr);
        if (vs.exists) validators.push(vs);
      }
    }
    return validators;
  }

  // ---------------------------------------------------------------------------
  // User State
  // ---------------------------------------------------------------------------

  async getUserState(address: string): Promise<UserState> {
    const state = await this.getProtocolState();

    let stDccBalance = 0n;
    if (state.stDccAssetId) {
      stDccBalance = await this.node.getAssetBalance(address, state.stDccAssetId);
    }

    const userEntries = await this.node.getDataByRegex(this.dAppAddress, `user:${address}:.*`);
    const m = this.buildMap(userEntries);

    const estimatedDccValue = calcDccFromShares(
      stDccBalance,
      state.totalPooledDcc,
      state.totalShares
    );

    return {
      address,
      stDccBalance,
      sharesLocked: this.int(m, KEYS.userSharesLocked(address)),
      withdrawCount: this.intNum(m, KEYS.userWithdrawCount(address)),
      estimatedDccValue,
    };
  }

  // ---------------------------------------------------------------------------
  // Withdrawal Requests
  // ---------------------------------------------------------------------------

  async getWithdrawalRequest(requestId: string): Promise<WithdrawalRequest | null> {
    const entries = await this.node.getDataByRegex(this.dAppAddress, `withdraw:${requestId}:.*`);
    if (entries.length === 0) return null;

    const m = this.buildMap(entries);
    const owner = this.str(m, KEYS.withdrawOwner(requestId));
    if (!owner) return null;

    return {
      id: requestId,
      owner,
      shares: this.int(m, KEYS.withdrawShares(requestId)),
      dccEstimate: this.int(m, KEYS.withdrawDccEstimate(requestId)),
      dccFinal: this.int(m, KEYS.withdrawDccFinal(requestId)),
      status: this.intNum(m, KEYS.withdrawStatus(requestId)) as WithdrawalStatus,
      createdAt: this.intNum(m, KEYS.withdrawCreatedAt(requestId)),
      finalizedAt: this.intNum(m, KEYS.withdrawFinalizedAt(requestId)),
      claimedAt: this.intNum(m, KEYS.withdrawClaimedAt(requestId)),
    };
  }

  async fetchWithdrawalRequests(address: string): Promise<WithdrawalRequest[]> {
    const state = await this.getProtocolState();
    const requests: WithdrawalRequest[] = [];

    // Scan all withdrawal requests to find ones owned by this address
    for (let i = 1; i <= state.withdrawNonce; i++) {
      const id = i.toString();
      const ownerEntry = await this.node.getDataEntry(this.dAppAddress, KEYS.withdrawOwner(id));
      if (ownerEntry && ownerEntry.value === address) {
        const req = await this.getWithdrawalRequest(id);
        if (req) requests.push(req);
      }
    }
    return requests;
  }

  // ---------------------------------------------------------------------------
  // Raw data access
  // ---------------------------------------------------------------------------

  async getAllDataEntries(): Promise<DataEntry[]> {
    return this.node.getDataEntries(this.dAppAddress);
  }

  getNodeClient(): NodeClient {
    return this.node;
  }
}
