// =============================================================================
// SDK Transaction Builder Tests
// =============================================================================

import { TxBuilder } from '../src/tx-builder';

const config = {
  dAppAddress: '3N1234567890abcdef',
  stDccAssetId: 'AssetId123456',
  chainId: 'T',
};

describe('TxBuilder', () => {
  const builder = new TxBuilder(config);

  test('buildDepositTx creates valid invoke', () => {
    const tx = builder.buildDepositTx(100000000);
    expect(tx.dApp).toBe(config.dAppAddress);
    expect(tx.call.function).toBe('deposit');
    expect(tx.call.args).toEqual([]);
    expect(tx.payment).toEqual([{ amount: 100000000, assetId: null }]);
    expect(tx.chainId).toBe('T');
  });

  test('buildDepositTx rejects zero amount', () => {
    expect(() => builder.buildDepositTx(0)).toThrow('positive');
  });

  test('buildDepositTx rejects negative amount', () => {
    expect(() => builder.buildDepositTx(-1)).toThrow('positive');
  });

  test('buildRequestWithdrawTx creates valid invoke', () => {
    const tx = builder.buildRequestWithdrawTx(50000000);
    expect(tx.call.function).toBe('requestWithdraw');
    expect(tx.payment).toEqual([{ amount: 50000000, assetId: config.stDccAssetId }]);
  });

  test('buildClaimWithdrawTx creates valid invoke', () => {
    const tx = builder.buildClaimWithdrawTx('42');
    expect(tx.call.function).toBe('claimWithdraw');
    expect(tx.call.args).toEqual([{ type: 'string', value: '42' }]);
    expect(tx.payment).toBeUndefined();
  });

  test('buildInitializeTx creates valid invoke', () => {
    const tx = builder.buildInitializeTx('admin', 'operator', 'treasury', 1000);
    expect(tx.call.function).toBe('initialize');
    expect(tx.call.args).toHaveLength(4);
    expect(tx.call.args[3]).toEqual({ type: 'integer', value: 1000 });
  });

  test('buildAddValidatorTx', () => {
    const tx = builder.buildAddValidatorTx('validatorAddr', 5000);
    expect(tx.call.function).toBe('addValidator');
    expect(tx.call.args[0]).toEqual({ type: 'string', value: 'validatorAddr' });
    expect(tx.call.args[1]).toEqual({ type: 'integer', value: 5000 });
  });

  test('buildPauseTx', () => {
    const tx = builder.buildPauseTx();
    expect(tx.call.function).toBe('pause');
    expect(tx.call.args).toEqual([]);
  });

  test('buildFinalizeWithdrawTx', () => {
    const tx = builder.buildFinalizeWithdrawTx('7');
    expect(tx.call.function).toBe('finalizeWithdraw');
    expect(tx.call.args[0]).toEqual({ type: 'string', value: '7' });
  });

  test('buildSyncRewardsTx', () => {
    const tx = builder.buildSyncRewardsTx(5000000);
    expect(tx.call.function).toBe('syncRewards');
    expect(tx.call.args[0]).toEqual({ type: 'integer', value: 5000000 });
  });

  test('buildRecordLeaseTx', () => {
    const tx = builder.buildRecordLeaseTx('valAddr', 100000000, 'leaseId123');
    expect(tx.call.function).toBe('recordLease');
    expect(tx.call.args).toHaveLength(3);
  });
});
