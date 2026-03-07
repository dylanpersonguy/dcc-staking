// =============================================================================
// DCC Liquid Staking SDK — Transaction Builders
// =============================================================================
// Builds unsigned InvokeScript transactions for the liquid staking protocol.
// Compatible with @waves/waves-transactions and DecentralChain-adapted signers.

import { InvokeScriptParams } from './types';
import { calcSharesFromDeposit, calcDccFromShares, ONE_DCC } from './math';

/** Default InvokeScript fee (0.005 DCC on Waves-derived chains) */
const DEFAULT_INVOKE_FEE = 500_000;

/** Helper to build an InvokeScript tx params object */
function buildInvoke(
  dAppAddress: string,
  func: string,
  args: Array<{ type: string; value: string | number | boolean }>,
  chainId: string,
  payment?: Array<{ amount: number; assetId: string | null }>,
  fee: number = DEFAULT_INVOKE_FEE
): InvokeScriptParams {
  return {
    dApp: dAppAddress,
    call: { function: func, args },
    payment,
    chainId,
    fee,
  };
}

// =============================================================================
// User-facing transaction builders
// =============================================================================

export interface TxBuilderConfig {
  dAppAddress: string;
  stDccAssetId: string;
  chainId: string;
}

export class TxBuilder {
  constructor(private config: TxBuilderConfig) {}

  /**
   * Build deposit transaction.
   * @param amountWavelets DCC amount in wavelets
   */
  buildDepositTx(amountWavelets: number): InvokeScriptParams {
    if (amountWavelets <= 0) throw new Error('Deposit amount must be positive');
    return buildInvoke(
      this.config.dAppAddress,
      'deposit',
      [],
      this.config.chainId,
      [{ amount: amountWavelets, assetId: null }] // null = native DCC
    );
  }

  /**
   * Build request withdrawal transaction.
   * User sends stDCC as payment.
   * @param sharesAmount stDCC shares in wavelets
   */
  buildRequestWithdrawTx(sharesAmount: number): InvokeScriptParams {
    if (sharesAmount <= 0) throw new Error('Shares amount must be positive');
    return buildInvoke(
      this.config.dAppAddress,
      'requestWithdraw',
      [],
      this.config.chainId,
      [{ amount: sharesAmount, assetId: this.config.stDccAssetId }]
    );
  }

  /**
   * Build claim withdrawal transaction.
   * @param requestId Withdrawal request ID
   */
  buildClaimWithdrawTx(requestId: string): InvokeScriptParams {
    return buildInvoke(this.config.dAppAddress, 'claimWithdraw', [
      { type: 'string', value: requestId },
    ], this.config.chainId);
  }

  // ===========================================================================
  // Admin transaction builders
  // ===========================================================================

  buildInitializeTx(
    adminAddress: string,
    operatorAddress: string,
    treasuryAddress: string,
    feeBps: number
  ): InvokeScriptParams {
    return buildInvoke(this.config.dAppAddress, 'initialize', [
      { type: 'string', value: adminAddress },
      { type: 'string', value: operatorAddress },
      { type: 'string', value: treasuryAddress },
      { type: 'integer', value: feeBps },
    ], this.config.chainId);
  }

  buildAddValidatorTx(validatorAddress: string, weightBps: number): InvokeScriptParams {
    return buildInvoke(this.config.dAppAddress, 'addValidator', [
      { type: 'string', value: validatorAddress },
      { type: 'integer', value: weightBps },
    ], this.config.chainId);
  }

  buildUpdateValidatorTx(
    validatorAddress: string,
    enabled: boolean,
    weightBps: number
  ): InvokeScriptParams {
    return buildInvoke(this.config.dAppAddress, 'updateValidator', [
      { type: 'string', value: validatorAddress },
      { type: 'boolean', value: enabled },
      { type: 'integer', value: weightBps },
    ], this.config.chainId);
  }

  buildRemoveValidatorTx(validatorAddress: string): InvokeScriptParams {
    return buildInvoke(this.config.dAppAddress, 'removeValidator', [
      { type: 'string', value: validatorAddress },
    ], this.config.chainId);
  }

  buildSetTreasuryTx(address: string): InvokeScriptParams {
    return buildInvoke(this.config.dAppAddress, 'setTreasury', [
      { type: 'string', value: address },
    ], this.config.chainId);
  }

  buildSetProtocolFeeBpsTx(feeBps: number): InvokeScriptParams {
    return buildInvoke(this.config.dAppAddress, 'setProtocolFeeBps', [
      { type: 'integer', value: feeBps },
    ], this.config.chainId);
  }

  buildSetOperatorTx(address: string): InvokeScriptParams {
    return buildInvoke(this.config.dAppAddress, 'setOperator', [
      { type: 'string', value: address },
    ], this.config.chainId);
  }

  buildPauseTx(): InvokeScriptParams {
    return buildInvoke(this.config.dAppAddress, 'pause', [], this.config.chainId);
  }

  buildUnpauseTx(): InvokeScriptParams {
    return buildInvoke(this.config.dAppAddress, 'unpause', [], this.config.chainId);
  }

  buildEmergencyModeTx(enable: boolean): InvokeScriptParams {
    return buildInvoke(this.config.dAppAddress, 'emergencyMode', [
      { type: 'boolean', value: enable },
    ], this.config.chainId);
  }

  // ===========================================================================
  // Operator transaction builders
  // ===========================================================================

  buildFinalizeWithdrawTx(requestId: string): InvokeScriptParams {
    return buildInvoke(this.config.dAppAddress, 'finalizeWithdraw', [
      { type: 'string', value: requestId },
    ], this.config.chainId);
  }

  buildSyncRewardsTx(rewardAmount: number): InvokeScriptParams {
    return buildInvoke(this.config.dAppAddress, 'syncRewards', [
      { type: 'integer', value: rewardAmount },
    ], this.config.chainId);
  }

  buildRecordLeaseTx(
    validatorAddress: string,
    amount: number,
    leaseId: string
  ): InvokeScriptParams {
    return buildInvoke(this.config.dAppAddress, 'recordLease', [
      { type: 'string', value: validatorAddress },
      { type: 'integer', value: amount },
      { type: 'string', value: leaseId },
    ], this.config.chainId);
  }

  buildRecordLeaseCancelTx(validatorAddress: string, amount: number): InvokeScriptParams {
    return buildInvoke(this.config.dAppAddress, 'recordLeaseCancel', [
      { type: 'string', value: validatorAddress },
      { type: 'integer', value: amount },
    ], this.config.chainId);
  }

  buildTransferAdminTx(newAdmin: string): InvokeScriptParams {
    return buildInvoke(this.config.dAppAddress, 'transferAdmin', [
      { type: 'string', value: newAdmin },
    ], this.config.chainId);
  }

  buildSetGuardianTx(address: string): InvokeScriptParams {
    return buildInvoke(this.config.dAppAddress, 'setGuardian', [
      { type: 'string', value: address },
    ], this.config.chainId);
  }

  buildSetMinDepositTx(amount: number): InvokeScriptParams {
    return buildInvoke(this.config.dAppAddress, 'setMinDeposit', [
      { type: 'integer', value: amount },
    ], this.config.chainId);
  }

  buildSetMinWithdrawSharesTx(amount: number): InvokeScriptParams {
    return buildInvoke(this.config.dAppAddress, 'setMinWithdrawShares', [
      { type: 'integer', value: amount },
    ], this.config.chainId);
  }
}

// =============================================================================
// Estimation helpers (no tx building, just math)
// =============================================================================

export function estimateDeposit(
  amountWavelets: bigint,
  totalPooledDcc: bigint,
  totalShares: bigint
): { sharesToReceive: bigint; exchangeRate: bigint } {
  const sharesToReceive = calcSharesFromDeposit(amountWavelets, totalPooledDcc, totalShares);
  const exchangeRate =
    totalShares === 0n ? ONE_DCC : (ONE_DCC * totalPooledDcc) / totalShares;
  return { sharesToReceive, exchangeRate };
}

export function estimateWithdraw(
  shares: bigint,
  totalPooledDcc: bigint,
  totalShares: bigint
): { dccToReceive: bigint; exchangeRate: bigint } {
  const dccToReceive = calcDccFromShares(shares, totalPooledDcc, totalShares);
  const exchangeRate =
    totalShares === 0n ? ONE_DCC : (ONE_DCC * totalPooledDcc) / totalShares;
  return { dccToReceive, exchangeRate };
}
