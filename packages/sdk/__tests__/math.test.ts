// =============================================================================
// SDK Math Unit Tests
// =============================================================================

import {
  mulDivDown,
  mulDivUp,
  calcSharesFromDeposit,
  calcDccFromShares,
  calcExchangeRate,
  calcProtocolFee,
  ONE_DCC,
  BPS_DENOM,
} from '../src/math';

describe('mulDivDown', () => {
  test('basic floor division', () => {
    expect(mulDivDown(10n, 3n, 4n)).toBe(7n); // 10*3/4 = 7.5 → 7
  });

  test('exact division', () => {
    expect(mulDivDown(10n, 4n, 2n)).toBe(20n);
  });

  test('throws on zero denominator', () => {
    expect(() => mulDivDown(10n, 3n, 0n)).toThrow('division by zero');
  });

  test('zero numerator', () => {
    expect(mulDivDown(0n, 100n, 50n)).toBe(0n);
  });
});

describe('mulDivUp', () => {
  test('ceiling division', () => {
    expect(mulDivUp(10n, 3n, 4n)).toBe(8n); // 10*3/4 = 7.5 → 8
  });

  test('exact division no rounding', () => {
    expect(mulDivUp(10n, 4n, 2n)).toBe(20n);
  });

  test('throws on zero denominator', () => {
    expect(() => mulDivUp(10n, 3n, 0n)).toThrow('division by zero');
  });
});

describe('calcSharesFromDeposit', () => {
  test('bootstrap case: first deposit 1:1', () => {
    const shares = calcSharesFromDeposit(ONE_DCC, 0n, 0n);
    expect(shares).toBe(ONE_DCC);
  });

  test('first deposit with zero totalShares', () => {
    const shares = calcSharesFromDeposit(5n * ONE_DCC, 0n, 0n);
    expect(shares).toBe(5n * ONE_DCC);
  });

  test('subsequent deposit at 1:1 rate', () => {
    const totalPooled = 100n * ONE_DCC;
    const totalShares = 100n * ONE_DCC;
    const deposit = 10n * ONE_DCC;
    const shares = calcSharesFromDeposit(deposit, totalPooled, totalShares);
    expect(shares).toBe(10n * ONE_DCC);
  });

  test('subsequent deposit after rewards (rate > 1)', () => {
    const totalPooled = 110n * ONE_DCC; // 100 DCC + 10 DCC rewards
    const totalShares = 100n * ONE_DCC;
    const deposit = 11n * ONE_DCC;
    // shares = 11 * 100 / 110 = 10
    const shares = calcSharesFromDeposit(deposit, totalPooled, totalShares);
    expect(shares).toBe(10n * ONE_DCC);
  });

  test('rounds down (protocol favorable)', () => {
    const totalPooled = 3n * ONE_DCC;
    const totalShares = 2n * ONE_DCC;
    const deposit = ONE_DCC;
    // shares = 1 * 2 / 3 = 0.666... → floor = 66666666
    const shares = calcSharesFromDeposit(deposit, totalPooled, totalShares);
    expect(shares).toBe(66666666n);
  });

  test('dust deposit produces minimal shares', () => {
    const totalPooled = 1000n * ONE_DCC;
    const totalShares = 1000n * ONE_DCC;
    const shares = calcSharesFromDeposit(1n, totalPooled, totalShares);
    expect(shares).toBe(1n);
  });
});

describe('calcDccFromShares', () => {
  test('zero shares returns zero', () => {
    expect(calcDccFromShares(0n, 100n * ONE_DCC, 100n * ONE_DCC)).toBe(0n);
  });

  test('zero totalShares returns zero', () => {
    expect(calcDccFromShares(ONE_DCC, 100n * ONE_DCC, 0n)).toBe(0n);
  });

  test('1:1 rate', () => {
    const dcc = calcDccFromShares(10n * ONE_DCC, 100n * ONE_DCC, 100n * ONE_DCC);
    expect(dcc).toBe(10n * ONE_DCC);
  });

  test('after rewards (rate > 1)', () => {
    const dcc = calcDccFromShares(10n * ONE_DCC, 110n * ONE_DCC, 100n * ONE_DCC);
    expect(dcc).toBe(11n * ONE_DCC);
  });

  test('rounds down (protocol favorable)', () => {
    const dcc = calcDccFromShares(ONE_DCC, 10n * ONE_DCC, 3n * ONE_DCC);
    // 1 * 10 / 3 = 3.333... → 333333333
    expect(dcc).toBe(333333333n);
  });
});

describe('calcExchangeRate', () => {
  test('bootstrap rate is ONE_DCC', () => {
    expect(calcExchangeRate(0n, 0n)).toBe(ONE_DCC);
  });

  test('1:1 rate', () => {
    expect(calcExchangeRate(100n * ONE_DCC, 100n * ONE_DCC)).toBe(ONE_DCC);
  });

  test('rate after 10% rewards', () => {
    const rate = calcExchangeRate(110n * ONE_DCC, 100n * ONE_DCC);
    expect(rate).toBe(110000000n); // 1.1 DCC per stDCC
  });
});

describe('calcProtocolFee', () => {
  test('10% fee', () => {
    const fee = calcProtocolFee(100n * ONE_DCC, 1000n); // 1000 bps = 10%
    expect(fee).toBe(10n * ONE_DCC);
  });

  test('zero fee', () => {
    expect(calcProtocolFee(100n * ONE_DCC, 0n)).toBe(0n);
  });

  test('rounds down', () => {
    const fee = calcProtocolFee(ONE_DCC, 333n); // 3.33%
    // 100000000 * 333 / 10000 = 3330000
    expect(fee).toBe(3330000n);
  });
});

describe('invariant: deposit→withdraw round-trip', () => {
  test('user gets back same or less than deposited (no rewards)', () => {
    const totalPooled = 1000n * ONE_DCC;
    const totalShares = 1000n * ONE_DCC;
    const depositAmount = 50n * ONE_DCC;

    const shares = calcSharesFromDeposit(depositAmount, totalPooled, totalShares);
    const newPooled = totalPooled + depositAmount;
    const newShares = totalShares + shares;

    const dccBack = calcDccFromShares(shares, newPooled, newShares);
    expect(dccBack).toBeLessThanOrEqual(depositAmount);
    // Should be very close (within rounding)
    expect(depositAmount - dccBack).toBeLessThan(2n);
  });

  test('share inflation impossible: tiny deposit cannot mint disproportionate shares', () => {
    const totalPooled = 1000n * ONE_DCC;
    const totalShares = 100n * ONE_DCC; // 10 DCC/stDCC rate

    const tinyDeposit = 1n; // 1 wavelet
    const shares = calcSharesFromDeposit(tinyDeposit, totalPooled, totalShares);
    // Should be 0 or very small
    expect(shares).toBeLessThanOrEqual(1n);

    // The shares should not be worth more than the deposit
    if (shares > 0n) {
      const dccValue = calcDccFromShares(shares, totalPooled + tinyDeposit, totalShares + shares);
      expect(dccValue).toBeLessThanOrEqual(tinyDeposit + 1n); // Allow 1 wavelet rounding
    }
  });

  test('multiple depositors dont dilute each other', () => {
    let pooled = 100n * ONE_DCC;
    let shares = 100n * ONE_DCC;

    // User 1 deposits
    const user1Deposit = 50n * ONE_DCC;
    const user1Shares = calcSharesFromDeposit(user1Deposit, pooled, shares);
    pooled += user1Deposit;
    shares += user1Shares;

    // User 2 deposits same amount
    const user2Deposit = 50n * ONE_DCC;
    const user2Shares = calcSharesFromDeposit(user2Deposit, pooled, shares);
    pooled += user2Deposit;
    shares += user2Shares;

    // Both should have similar share counts
    expect(user1Shares).toBe(user2Shares);

    // Both should be able to withdraw ~same value
    const user1Value = calcDccFromShares(user1Shares, pooled, shares);
    const user2Value = calcDccFromShares(user2Shares, pooled, shares);
    expect(user1Value).toBe(user2Value);
  });

  test('rewards accrue proportionally to all holders', () => {
    let pooled = 100n * ONE_DCC;
    let shares = 100n * ONE_DCC;

    // User A has 60 stDCC, User B has 40 stDCC
    const userAShares = 60n * ONE_DCC;
    const userBShares = 40n * ONE_DCC;

    // 10 DCC rewards accrue
    pooled += 10n * ONE_DCC;

    // User A should get 6 DCC of the 10 reward
    const userADcc = calcDccFromShares(userAShares, pooled, shares);
    const userBDcc = calcDccFromShares(userBShares, pooled, shares);

    expect(userADcc).toBe(66n * ONE_DCC); // 60 principal + 6 reward
    expect(userBDcc).toBe(44n * ONE_DCC); // 40 principal + 4 reward
  });
});

describe('edge cases', () => {
  test('first depositor gets 1:1', () => {
    const shares = calcSharesFromDeposit(ONE_DCC, 0n, 0n);
    expect(shares).toBe(ONE_DCC);
  });

  test('second depositor after rewards gets correct shares', () => {
    // First depositor: 100 DCC → 100 stDCC
    let pooled = 100n * ONE_DCC;
    let totalShrs = 100n * ONE_DCC;

    // 10 DCC rewards accrue
    pooled += 10n * ONE_DCC; // 110 DCC

    // Second depositor deposits 110 DCC
    const deposit = 110n * ONE_DCC;
    const newShares = calcSharesFromDeposit(deposit, pooled, totalShrs);
    // 110 * 100 / 110 = 100 stDCC
    expect(newShares).toBe(100n * ONE_DCC);

    pooled += deposit; // 220 DCC
    totalShrs += newShares; // 200 stDCC

    // Rate should still be 1.1
    const rate = calcExchangeRate(pooled, totalShrs);
    expect(rate).toBe(110000000n);
  });
});
