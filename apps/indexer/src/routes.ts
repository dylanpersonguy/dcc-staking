// =============================================================================
// DCC Liquid Staking Indexer — REST API Routes
// =============================================================================

import { Router, Request, Response } from 'express';
import { Db } from './db/db';

export function createRouter(db: Db): Router {
  const router = Router();

  // ---------------------------------------------------------------------------
  // Protocol state
  // ---------------------------------------------------------------------------

  router.get('/protocol/snapshot', async (_req: Request, res: Response) => {
    try {
      const snapshot = await db.getLatestSnapshot();
      if (!snapshot) return res.status(404).json({ error: 'No snapshots yet' });
      res.json(snapshot);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/protocol/snapshots', async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const snapshots = await db.getSnapshotHistory(limit);
      res.json(snapshots);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ---------------------------------------------------------------------------
  // Deposits
  // ---------------------------------------------------------------------------

  router.get('/deposits/:address', async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const deposits = await db.getDepositsByAddress(req.params.address, limit);
      res.json(deposits);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ---------------------------------------------------------------------------
  // Withdrawals
  // ---------------------------------------------------------------------------

  router.get('/withdrawals/:address', async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const withdrawals = await db.getWithdrawalsByAddress(req.params.address, limit);
      res.json(withdrawals);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/withdrawals/pending/all', async (_req: Request, res: Response) => {
    try {
      const pending = await db.getPendingWithdrawals();
      res.json(pending);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ---------------------------------------------------------------------------
  // Rewards
  // ---------------------------------------------------------------------------

  router.get('/rewards', async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const rewards = await db.getRewardHistory(limit);
      res.json(rewards);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ---------------------------------------------------------------------------
  // Users
  // ---------------------------------------------------------------------------

  router.get('/users/:address', async (req: Request, res: Response) => {
    try {
      const user = await db.getUser(req.params.address);
      if (!user) return res.status(404).json({ error: 'User not found' });
      res.json(user);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/users', async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const users = await db.getTopUsers(limit);
      res.json(users);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ---------------------------------------------------------------------------
  // Health
  // ---------------------------------------------------------------------------

  router.get('/health', async (_req: Request, res: Response) => {
    try {
      const lastHeight = await db.getLastIndexedHeight();
      res.json({ status: 'ok', lastIndexedHeight: lastHeight });
    } catch (err: any) {
      res.status(500).json({ status: 'error', error: err.message });
    }
  });

  return router;
}
