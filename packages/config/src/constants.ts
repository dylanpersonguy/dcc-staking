// =============================================================================
// DCC Liquid Staking Protocol — Constants
// =============================================================================

/** 1 DCC in wavelets (8 decimals) */
export const DCC_DECIMALS = 8;
export const ONE_DCC = 100_000_000;

/** stDCC also uses 8 decimals */
export const STDCC_DECIMALS = 8;

/** Basis points denominator */
export const BPS_DENOMINATOR = 10_000;

/** Maximum protocol fee: 50% (5000 BPS) — safety cap */
export const MAX_PROTOCOL_FEE_BPS = 5_000;

/** Default minimum deposit: 1 DCC */
export const DEFAULT_MIN_DEPOSIT = ONE_DCC;

/** Default minimum withdrawal: 1 stDCC share */
export const DEFAULT_MIN_WITHDRAW_SHARES = ONE_DCC;

/** Default protocol fee: 10% (1000 BPS) */
export const DEFAULT_PROTOCOL_FEE_BPS = 1_000;

/** Withdrawal status codes */
export const WITHDRAW_STATUS = {
  PENDING: 0,
  FINALIZED: 1,
  CLAIMED: 2,
  CANCELLED: 3,
} as const;

/** stDCC token metadata */
export const STDCC_TOKEN = {
  name: 'stDCC',
  description: 'DCC Liquid Staking receipt token',
  decimals: STDCC_DECIMALS,
  reissuable: true,
} as const;

/** State key prefixes and names */
export const KEYS = {
  // Global
  ADMIN: 'admin',
  OPERATOR: 'operator',
  GUARDIAN: 'guardian',
  PAUSED: 'paused',
  EMERGENCY_MODE: 'emergency_mode',
  STDCC_ASSET_ID: 'stdcc_asset_id',
  TREASURY: 'treasury',
  PROTOCOL_FEE_BPS: 'protocol_fee_bps',
  TOTAL_POOLED_DCC: 'total_pooled_dcc',
  TOTAL_SHARES: 'total_shares',
  TOTAL_LEASED_DCC: 'total_leased_dcc',
  TOTAL_LIQUID_DCC: 'total_liquid_dcc',
  TOTAL_CLAIMABLE_DCC: 'total_claimable_dcc',
  TOTAL_PENDING_WITHDRAW_DCC: 'total_pending_withdraw_dcc',
  TOTAL_PROTOCOL_FEES_DCC: 'total_protocol_fees_dcc',
  VALIDATOR_COUNT: 'validator_count',
  WITHDRAW_NONCE: 'withdraw_nonce',
  LAST_REWARD_SYNC_HEIGHT: 'last_reward_sync_height',
  LAST_REWARD_SYNC_TS: 'last_reward_sync_ts',
  MIN_DEPOSIT_DCC: 'min_deposit_dcc',
  MIN_WITHDRAW_SHARES: 'min_withdraw_shares',

  // Validator prefix functions
  validatorExists: (addr: string) => `validator:${addr}:exists`,
  validatorEnabled: (addr: string) => `validator:${addr}:enabled`,
  validatorWeightBps: (addr: string) => `validator:${addr}:weight_bps`,
  validatorLeasedDcc: (addr: string) => `validator:${addr}:leased_dcc`,
  validatorLastLeaseId: (addr: string) => `validator:${addr}:last_lease_id`,
  validatorLastSyncHeight: (addr: string) => `validator:${addr}:last_sync_height`,
  validatorIndex: (n: number) => `validator_idx:${n}`,

  // User prefix functions
  userSharesLocked: (addr: string) => `user:${addr}:shares_locked`,
  userWithdrawCount: (addr: string) => `user:${addr}:withdraw_count`,

  // Withdrawal request prefix functions
  withdrawOwner: (id: string) => `withdraw:${id}:owner`,
  withdrawShares: (id: string) => `withdraw:${id}:shares`,
  withdrawDccEstimate: (id: string) => `withdraw:${id}:dcc_estimate`,
  withdrawDccFinal: (id: string) => `withdraw:${id}:dcc_final`,
  withdrawStatus: (id: string) => `withdraw:${id}:status`,
  withdrawCreatedAt: (id: string) => `withdraw:${id}:created_at`,
  withdrawFinalizedAt: (id: string) => `withdraw:${id}:finalized_at`,
  withdrawClaimedAt: (id: string) => `withdraw:${id}:claimed_at`,
} as const;
