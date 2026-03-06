// =============================================================================
// DCC Liquid Staking Indexer — Database Schema & Migrations
// =============================================================================

import { Pool } from 'pg';

export async function migrate(pool: Pool): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Protocol snapshots — periodic state captures
    await client.query(`
      CREATE TABLE IF NOT EXISTS protocol_snapshots (
        id              SERIAL PRIMARY KEY,
        height          INTEGER NOT NULL,
        timestamp       BIGINT NOT NULL,
        total_pooled_dcc BIGINT NOT NULL DEFAULT 0,
        total_shares    BIGINT NOT NULL DEFAULT 0,
        exchange_rate   BIGINT NOT NULL DEFAULT 100000000,
        total_leased_dcc BIGINT NOT NULL DEFAULT 0,
        total_liquid_dcc BIGINT NOT NULL DEFAULT 0,
        total_claimable_dcc BIGINT NOT NULL DEFAULT 0,
        total_pending_withdraw_dcc BIGINT NOT NULL DEFAULT 0,
        total_protocol_fees_dcc BIGINT NOT NULL DEFAULT 0,
        validator_count INTEGER NOT NULL DEFAULT 0,
        created_at      TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(height)
      );
    `);

    // Deposits
    await client.query(`
      CREATE TABLE IF NOT EXISTS deposits (
        id          SERIAL PRIMARY KEY,
        tx_id       VARCHAR(64) NOT NULL UNIQUE,
        height      INTEGER NOT NULL,
        address     VARCHAR(64) NOT NULL,
        amount_dcc  BIGINT NOT NULL,
        shares_minted BIGINT NOT NULL,
        exchange_rate BIGINT NOT NULL,
        timestamp   BIGINT,
        created_at  TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_deposits_address ON deposits(address);
      CREATE INDEX IF NOT EXISTS idx_deposits_height ON deposits(height);
    `);

    // Withdrawal requests
    await client.query(`
      CREATE TABLE IF NOT EXISTS withdrawal_requests (
        id              SERIAL PRIMARY KEY,
        request_id      VARCHAR(32) NOT NULL UNIQUE,
        tx_id           VARCHAR(64) NOT NULL,
        height          INTEGER NOT NULL,
        owner           VARCHAR(64) NOT NULL,
        shares          BIGINT NOT NULL,
        dcc_estimate    BIGINT NOT NULL,
        dcc_final       BIGINT DEFAULT 0,
        status          INTEGER NOT NULL DEFAULT 0,
        created_at_height  INTEGER NOT NULL,
        finalized_at_height INTEGER DEFAULT 0,
        claimed_at_height  INTEGER DEFAULT 0,
        created_at      TIMESTAMPTZ DEFAULT NOW(),
        updated_at      TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_wr_owner ON withdrawal_requests(owner);
      CREATE INDEX IF NOT EXISTS idx_wr_status ON withdrawal_requests(status);
    `);

    // Claims (finalized + claimed subset)
    await client.query(`
      CREATE TABLE IF NOT EXISTS claims (
        id          SERIAL PRIMARY KEY,
        request_id  VARCHAR(32) NOT NULL UNIQUE,
        tx_id       VARCHAR(64) NOT NULL,
        height      INTEGER NOT NULL,
        owner       VARCHAR(64) NOT NULL,
        amount_dcc  BIGINT NOT NULL,
        created_at  TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_claims_owner ON claims(owner);
    `);

    // Validator states history
    await client.query(`
      CREATE TABLE IF NOT EXISTS validator_states (
        id          SERIAL PRIMARY KEY,
        address     VARCHAR(64) NOT NULL,
        height      INTEGER NOT NULL,
        enabled     BOOLEAN NOT NULL DEFAULT true,
        weight_bps  INTEGER NOT NULL DEFAULT 0,
        leased_dcc  BIGINT NOT NULL DEFAULT 0,
        created_at  TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(address, height)
      );
      CREATE INDEX IF NOT EXISTS idx_vs_address ON validator_states(address);
    `);

    // Reward reports
    await client.query(`
      CREATE TABLE IF NOT EXISTS reward_reports (
        id              SERIAL PRIMARY KEY,
        tx_id           VARCHAR(64) NOT NULL UNIQUE,
        height          INTEGER NOT NULL,
        reward_amount   BIGINT NOT NULL,
        fee_amount      BIGINT NOT NULL,
        net_reward      BIGINT NOT NULL,
        exchange_rate_before BIGINT,
        exchange_rate_after  BIGINT,
        created_at      TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Users aggregate table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        address          VARCHAR(64) PRIMARY KEY,
        total_deposited  BIGINT NOT NULL DEFAULT 0,
        total_withdrawn  BIGINT NOT NULL DEFAULT 0,
        total_shares_minted BIGINT NOT NULL DEFAULT 0,
        total_shares_burned BIGINT NOT NULL DEFAULT 0,
        first_seen_height INTEGER NOT NULL DEFAULT 0,
        last_action_height INTEGER NOT NULL DEFAULT 0,
        updated_at       TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Indexer bookkeeping
    await client.query(`
      CREATE TABLE IF NOT EXISTS indexer_state (
        key     VARCHAR(128) PRIMARY KEY,
        value   VARCHAR(512) NOT NULL
      );
    `);

    await client.query('COMMIT');
    console.log('[migrate] Database migration completed successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[migrate] Migration failed:', err);
    throw err;
  } finally {
    client.release();
  }
}

// Standalone migration runner
if (require.main === module) {
  const dotenv = require('dotenv');
  dotenv.config();

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  migrate(pool)
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
