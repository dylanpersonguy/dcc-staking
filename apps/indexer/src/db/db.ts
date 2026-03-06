// =============================================================================
// DCC Liquid Staking Indexer — Database Access Layer
// =============================================================================

import { Pool, PoolClient } from 'pg';

export class Db {
  constructor(private pool: Pool) {}

  // ---------------------------------------------------------------------------
  // Indexer state
  // ---------------------------------------------------------------------------

  async getState(key: string): Promise<string | null> {
    const res = await this.pool.query('SELECT value FROM indexer_state WHERE key = $1', [key]);
    return res.rows[0]?.value ?? null;
  }

  async setState(key: string, value: string): Promise<void> {
    await this.pool.query(
      `INSERT INTO indexer_state (key, value) VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE SET value = $2`,
      [key, value]
    );
  }

  async getLastIndexedHeight(): Promise<number> {
    const val = await this.getState('last_indexed_height');
    return val ? parseInt(val, 10) : 0;
  }

  async setLastIndexedHeight(height: number): Promise<void> {
    await this.setState('last_indexed_height', height.toString());
  }

  // ---------------------------------------------------------------------------
  // Protocol snapshots
  // ---------------------------------------------------------------------------

  async insertSnapshot(snapshot: {
    height: number;
    timestamp: number;
    totalPooledDcc: bigint;
    totalShares: bigint;
    exchangeRate: bigint;
    totalLeasedDcc: bigint;
    totalLiquidDcc: bigint;
    totalClaimableDcc: bigint;
    totalPendingWithdrawDcc: bigint;
    totalProtocolFeesDcc: bigint;
    validatorCount: number;
  }): Promise<void> {
    await this.pool.query(
      `INSERT INTO protocol_snapshots
        (height, timestamp, total_pooled_dcc, total_shares, exchange_rate,
         total_leased_dcc, total_liquid_dcc, total_claimable_dcc,
         total_pending_withdraw_dcc, total_protocol_fees_dcc, validator_count)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT (height) DO NOTHING`,
      [
        snapshot.height, snapshot.timestamp,
        snapshot.totalPooledDcc.toString(), snapshot.totalShares.toString(),
        snapshot.exchangeRate.toString(), snapshot.totalLeasedDcc.toString(),
        snapshot.totalLiquidDcc.toString(), snapshot.totalClaimableDcc.toString(),
        snapshot.totalPendingWithdrawDcc.toString(), snapshot.totalProtocolFeesDcc.toString(),
        snapshot.validatorCount,
      ]
    );
  }

  async getLatestSnapshot(): Promise<any> {
    const res = await this.pool.query(
      'SELECT * FROM protocol_snapshots ORDER BY height DESC LIMIT 1'
    );
    return res.rows[0] ?? null;
  }

  async getSnapshotHistory(limit: number = 100): Promise<any[]> {
    const res = await this.pool.query(
      'SELECT * FROM protocol_snapshots ORDER BY height DESC LIMIT $1',
      [limit]
    );
    return res.rows;
  }

  // ---------------------------------------------------------------------------
  // Deposits
  // ---------------------------------------------------------------------------

  async insertDeposit(deposit: {
    txId: string;
    height: number;
    address: string;
    amountDcc: bigint;
    sharesMinted: bigint;
    exchangeRate: bigint;
    timestamp?: number;
  }): Promise<void> {
    await this.pool.query(
      `INSERT INTO deposits (tx_id, height, address, amount_dcc, shares_minted, exchange_rate, timestamp)
       VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (tx_id) DO NOTHING`,
      [
        deposit.txId, deposit.height, deposit.address,
        deposit.amountDcc.toString(), deposit.sharesMinted.toString(),
        deposit.exchangeRate.toString(), deposit.timestamp ?? 0,
      ]
    );

    // Update users aggregate
    await this.pool.query(
      `INSERT INTO users (address, total_deposited, total_shares_minted, first_seen_height, last_action_height)
       VALUES ($1, $2, $3, $4, $4)
       ON CONFLICT (address) DO UPDATE SET
         total_deposited = users.total_deposited + $2,
         total_shares_minted = users.total_shares_minted + $3,
         last_action_height = $4,
         updated_at = NOW()`,
      [deposit.address, deposit.amountDcc.toString(), deposit.sharesMinted.toString(), deposit.height]
    );
  }

  async getDepositsByAddress(address: string, limit = 50): Promise<any[]> {
    const res = await this.pool.query(
      'SELECT * FROM deposits WHERE address = $1 ORDER BY height DESC LIMIT $2',
      [address, limit]
    );
    return res.rows;
  }

  // ---------------------------------------------------------------------------
  // Withdrawal requests
  // ---------------------------------------------------------------------------

  async upsertWithdrawalRequest(wr: {
    requestId: string;
    txId: string;
    height: number;
    owner: string;
    shares: bigint;
    dccEstimate: bigint;
    dccFinal: bigint;
    status: number;
    createdAtHeight: number;
    finalizedAtHeight: number;
    claimedAtHeight: number;
  }): Promise<void> {
    await this.pool.query(
      `INSERT INTO withdrawal_requests
        (request_id, tx_id, height, owner, shares, dcc_estimate, dcc_final, status,
         created_at_height, finalized_at_height, claimed_at_height)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT (request_id) DO UPDATE SET
         dcc_final = $7, status = $8,
         finalized_at_height = $10, claimed_at_height = $11,
         updated_at = NOW()`,
      [
        wr.requestId, wr.txId, wr.height, wr.owner,
        wr.shares.toString(), wr.dccEstimate.toString(),
        wr.dccFinal.toString(), wr.status,
        wr.createdAtHeight, wr.finalizedAtHeight, wr.claimedAtHeight,
      ]
    );
  }

  async getWithdrawalsByAddress(address: string, limit = 50): Promise<any[]> {
    const res = await this.pool.query(
      'SELECT * FROM withdrawal_requests WHERE owner = $1 ORDER BY created_at_height DESC LIMIT $2',
      [address, limit]
    );
    return res.rows;
  }

  async getPendingWithdrawals(): Promise<any[]> {
    const res = await this.pool.query(
      'SELECT * FROM withdrawal_requests WHERE status = 0 ORDER BY created_at_height ASC'
    );
    return res.rows;
  }

  // ---------------------------------------------------------------------------
  // Claims
  // ---------------------------------------------------------------------------

  async insertClaim(claim: {
    requestId: string;
    txId: string;
    height: number;
    owner: string;
    amountDcc: bigint;
  }): Promise<void> {
    await this.pool.query(
      `INSERT INTO claims (request_id, tx_id, height, owner, amount_dcc)
       VALUES ($1,$2,$3,$4,$5) ON CONFLICT (request_id) DO NOTHING`,
      [claim.requestId, claim.txId, claim.height, claim.owner, claim.amountDcc.toString()]
    );
  }

  // ---------------------------------------------------------------------------
  // Reward reports
  // ---------------------------------------------------------------------------

  async insertRewardReport(report: {
    txId: string;
    height: number;
    rewardAmount: bigint;
    feeAmount: bigint;
    netReward: bigint;
    exchangeRateBefore?: bigint;
    exchangeRateAfter?: bigint;
  }): Promise<void> {
    await this.pool.query(
      `INSERT INTO reward_reports
        (tx_id, height, reward_amount, fee_amount, net_reward, exchange_rate_before, exchange_rate_after)
       VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (tx_id) DO NOTHING`,
      [
        report.txId, report.height,
        report.rewardAmount.toString(), report.feeAmount.toString(),
        report.netReward.toString(),
        report.exchangeRateBefore?.toString() ?? '0',
        report.exchangeRateAfter?.toString() ?? '0',
      ]
    );
  }

  async getRewardHistory(limit = 100): Promise<any[]> {
    const res = await this.pool.query(
      'SELECT * FROM reward_reports ORDER BY height DESC LIMIT $1',
      [limit]
    );
    return res.rows;
  }

  // ---------------------------------------------------------------------------
  // Users
  // ---------------------------------------------------------------------------

  async getUser(address: string): Promise<any> {
    const res = await this.pool.query('SELECT * FROM users WHERE address = $1', [address]);
    return res.rows[0] ?? null;
  }

  async getTopUsers(limit = 50): Promise<any[]> {
    const res = await this.pool.query(
      'SELECT * FROM users ORDER BY total_deposited DESC LIMIT $1',
      [limit]
    );
    return res.rows;
  }
}
