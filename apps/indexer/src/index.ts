// =============================================================================
// DCC Liquid Staking Indexer — Entry Point
// =============================================================================

import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import { Pool } from 'pg';
import { ProtocolReader } from '@dcc-staking/sdk';
import { migrate } from './db/migrate';
import { Db } from './db/db';
import { IndexerWorker } from './worker';
import { createRouter } from './routes';

async function main() {
  const nodeUrl = process.env.DCC_NODE_URL || 'https://testnode1.decentralchain.io';
  const dAppAddress = process.env.DAPP_ADDRESS || '';
  const port = parseInt(process.env.INDEXER_PORT || '3001', 10);
  const pollInterval = parseInt(process.env.INDEXER_POLL_INTERVAL_MS || '5000', 10);
  const databaseUrl = process.env.DATABASE_URL || 'postgresql://localhost:5432/dcc_staking';

  if (!dAppAddress) {
    console.error('[indexer] DAPP_ADDRESS is required');
    process.exit(1);
  }

  // Database setup
  const pool = new Pool({ connectionString: databaseUrl });
  await migrate(pool);
  const db = new Db(pool);

  // Protocol reader
  const reader = new ProtocolReader(nodeUrl, dAppAddress);

  // Start indexer worker
  const worker = new IndexerWorker(reader, db, pollInterval);
  worker.start();

  // Start HTTP server
  const app = express();
  app.use(express.json());

  // CORS for frontend
  app.use((_req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    next();
  });

  app.use('/api', createRouter(db));

  app.listen(port, () => {
    console.log(`[indexer] HTTP server listening on port ${port}`);
    console.log(`[indexer] Watching dApp: ${dAppAddress}`);
    console.log(`[indexer] Node: ${nodeUrl}`);
  });

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('[indexer] Shutting down...');
    worker.stop();
    pool.end();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error('[indexer] Fatal error:', err);
  process.exit(1);
});
