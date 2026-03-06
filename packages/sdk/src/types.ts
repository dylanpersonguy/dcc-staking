// =============================================================================
// DCC Liquid Staking SDK — Types
// =============================================================================

export interface ProtocolState {
  admin: string;
  operator: string;
  guardian: string;
  paused: boolean;
  emergencyMode: boolean;
  stDccAssetId: string;
  treasury: string;
  protocolFeeBps: number;
  totalPooledDcc: bigint;
  totalShares: bigint;
  totalLeasedDcc: bigint;
  totalLiquidDcc: bigint;
  totalClaimableDcc: bigint;
  totalPendingWithdrawDcc: bigint;
  totalProtocolFeesDcc: bigint;
  validatorCount: number;
  withdrawNonce: number;
  lastRewardSyncHeight: number;
  lastRewardSyncTs: number;
  minDepositDcc: bigint;
  minWithdrawShares: bigint;
  exchangeRate: bigint; // per ONE_DCC units
}

export interface ValidatorState {
  address: string;
  exists: boolean;
  enabled: boolean;
  weightBps: number;
  leasedDcc: bigint;
  lastLeaseId: string;
  lastSyncHeight: number;
}

export interface UserState {
  address: string;
  stDccBalance: bigint;
  sharesLocked: bigint;
  withdrawCount: number;
  estimatedDccValue: bigint;
}

export interface WithdrawalRequest {
  id: string;
  owner: string;
  shares: bigint;
  dccEstimate: bigint;
  dccFinal: bigint;
  status: WithdrawalStatus;
  createdAt: number;
  finalizedAt: number;
  claimedAt: number;
}

export enum WithdrawalStatus {
  PENDING = 0,
  FINALIZED = 1,
  CLAIMED = 2,
  CANCELLED = 3,
}

export interface DepositEstimate {
  depositAmount: bigint;
  sharesToReceive: bigint;
  exchangeRate: bigint;
}

export interface WithdrawEstimate {
  sharesToBurn: bigint;
  dccToReceive: bigint;
  exchangeRate: bigint;
}

export interface DataEntry {
  key: string;
  type: 'string' | 'integer' | 'boolean' | 'binary';
  value: string | number | boolean;
}

// Transaction types for building
export interface InvokeScriptParams {
  dApp: string;
  call: {
    function: string;
    args: Array<{ type: string; value: string | number | boolean }>;
  };
  payment?: Array<{ amount: number; assetId: string | null }>;
  chainId: string;
  fee?: number;
}
