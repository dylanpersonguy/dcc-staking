// =============================================================================
// DCC Liquid Staking SDK — Math Helpers
// =============================================================================
// Mirrors on-chain RIDE math for off-chain estimation.
// All amounts are in wavelets (bigint).

const ONE_DCC = BigInt(100_000_000);
const BPS_DENOM = BigInt(10_000);

/**
 * Floor division: (a * b) / denom, rounded toward zero.
 */
export function mulDivDown(a: bigint, b: bigint, denom: bigint): bigint {
  if (denom === 0n) throw new Error('mulDivDown: division by zero');
  return (a * b) / denom;
}

/**
 * Ceiling division: (a * b) / denom, rounded up.
 */
export function mulDivUp(a: bigint, b: bigint, denom: bigint): bigint {
  if (denom === 0n) throw new Error('mulDivUp: division by zero');
  const result = (a * b) / denom;
  const remainder = a * b - result * denom;
  return remainder > 0n ? result + 1n : result;
}

/**
 * Calculate stDCC shares minted for a deposit.
 * Rounds DOWN (protocol-favorable).
 */
export function calcSharesFromDeposit(
  depositAmount: bigint,
  totalPooledDcc: bigint,
  totalShares: bigint
): bigint {
  if (totalShares === 0n || totalPooledDcc === 0n) {
    return depositAmount; // Bootstrap: 1:1
  }
  return mulDivDown(depositAmount, totalShares, totalPooledDcc);
}

/**
 * Calculate DCC redeemable for shares.
 * Rounds DOWN (protocol-favorable).
 */
export function calcDccFromShares(
  shares: bigint,
  totalPooledDcc: bigint,
  totalShares: bigint
): bigint {
  if (totalShares === 0n) return 0n;
  return mulDivDown(shares, totalPooledDcc, totalShares);
}

/**
 * Calculate current exchange rate: DCC per 1 stDCC (in wavelets).
 */
export function calcExchangeRate(totalPooledDcc: bigint, totalShares: bigint): bigint {
  if (totalShares === 0n) return ONE_DCC;
  return mulDivDown(ONE_DCC, totalPooledDcc, totalShares);
}

/**
 * Calculate protocol fee from reward amount.
 */
export function calcProtocolFee(rewardAmount: bigint, feeBps: bigint): bigint {
  if (feeBps === 0n) return 0n;
  return mulDivDown(rewardAmount, feeBps, BPS_DENOM);
}

export { ONE_DCC, BPS_DENOM };
