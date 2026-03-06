// =============================================================================
// SDK Parser Tests
// =============================================================================

import { parseProtocolDataEntries } from '../src/parser';

describe('parseProtocolDataEntries', () => {
  test('parses deposit events', () => {
    const entries = [
      {
        key: 'evt_deposit:12345:txABC',
        type: 'string' as const,
        value: '3N1234,500000000,500000000',
      },
    ];

    const result = parseProtocolDataEntries(entries);
    expect(result.deposits).toHaveLength(1);
    expect(result.deposits[0]).toEqual({
      height: 12345,
      txId: 'txABC',
      address: '3N1234',
      amount: 500000000n,
      shares: 500000000n,
    });
  });

  test('parses reward sync events', () => {
    const entries = [
      {
        key: 'evt_reward_sync:12500:txDEF',
        type: 'string' as const,
        value: '10000000,1000000,9000000',
      },
    ];

    const result = parseProtocolDataEntries(entries);
    expect(result.rewardSyncs).toHaveLength(1);
    expect(result.rewardSyncs[0].rewardAmount).toBe(10000000n);
    expect(result.rewardSyncs[0].feeAmount).toBe(1000000n);
    expect(result.rewardSyncs[0].netReward).toBe(9000000n);
  });

  test('ignores non-event entries', () => {
    const entries = [
      { key: 'total_pooled_dcc', type: 'integer' as const, value: 1000000000 },
      { key: 'admin', type: 'string' as const, value: '3Nadmin' },
    ];

    const result = parseProtocolDataEntries(entries);
    expect(result.deposits).toHaveLength(0);
    expect(result.withdrawRequests).toHaveLength(0);
    expect(result.rewardSyncs).toHaveLength(0);
  });

  test('handles mixed events', () => {
    const entries = [
      { key: 'evt_deposit:100:tx1', type: 'string' as const, value: 'addr1,100,100' },
      { key: 'evt_deposit:101:tx2', type: 'string' as const, value: 'addr2,200,200' },
      { key: 'evt_reward_sync:102:tx3', type: 'string' as const, value: '50,5,45' },
      { key: 'total_pooled_dcc', type: 'integer' as const, value: 350 },
    ];

    const result = parseProtocolDataEntries(entries);
    expect(result.deposits).toHaveLength(2);
    expect(result.rewardSyncs).toHaveLength(1);
  });
});
