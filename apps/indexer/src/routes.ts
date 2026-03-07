// =============================================================================
// DCC Liquid Staking Indexer — REST API Routes
// =============================================================================

import { Router, Request, Response } from 'express';
import { Db } from './db/db';
import {
  ProtocolReader,
  TxBuilder,
  estimateDeposit,
  estimateWithdraw,
  calcExchangeRate,
  calcProtocolFee,
  ONE_DCC,
} from '@dcc-staking/sdk';

/** Serialize bigint values to strings for JSON */
function serializeBigInts(obj: any): any {
  if (typeof obj === 'bigint') return obj.toString();
  if (Array.isArray(obj)) return obj.map(serializeBigInts);
  if (obj && typeof obj === 'object') {
    const out: any = {};
    for (const [k, v] of Object.entries(obj)) out[k] = serializeBigInts(v);
    return out;
  }
  return obj;
}

/** Validate a DCC address format (starts with 3, 35 chars) */
function isValidAddress(addr: string): boolean {
  return typeof addr === 'string' && /^3[A-Za-z1-9]{34}$/.test(addr);
}

export function createRouter(db: Db, reader: ProtocolReader): Router {
  const router = Router();

  const nodeUrl = process.env.DCC_NODE_URL || 'https://mainnet-node.decentralchain.io';
  const dAppAddress = process.env.DAPP_ADDRESS || '';
  const chainId = process.env.DCC_CHAIN_ID || '?';

  // ===========================================================================
  // Part 1: Read endpoints (indexed data from DB)
  // ===========================================================================

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
      const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 100, 1), 1000);
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
      const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 50, 1), 500);
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
      const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 50, 1), 500);
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
      const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 100, 1), 1000);
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
      const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 50, 1), 500);
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

  // ===========================================================================
  // Part 2: Live chain reads (real-time from DCC node)
  // ===========================================================================

  /** Live protocol state from chain (not cached/indexed) */
  router.get('/chain/protocol', async (_req: Request, res: Response) => {
    try {
      const state = await reader.getProtocolState();
      res.json(serializeBigInts(state));
    } catch (err: any) {
      res.status(502).json({ error: `Node unreachable: ${err.message}` });
    }
  });

  /** Live exchange rate from chain */
  router.get('/chain/exchange-rate', async (_req: Request, res: Response) => {
    try {
      const state = await reader.getProtocolState();
      const rate = calcExchangeRate(state.totalPooledDcc, state.totalShares);
      res.json({
        exchangeRate: rate.toString(),
        dccPerStDcc: Number(rate) / Number(ONE_DCC),
        totalPooledDcc: state.totalPooledDcc.toString(),
        totalShares: state.totalShares.toString(),
      });
    } catch (err: any) {
      res.status(502).json({ error: err.message });
    }
  });

  /** Live validator info from chain */
  router.get('/chain/validators', async (_req: Request, res: Response) => {
    try {
      const validators = await reader.getAllValidators();
      res.json(serializeBigInts(validators));
    } catch (err: any) {
      res.status(502).json({ error: err.message });
    }
  });

  /** Single validator from chain */
  router.get('/chain/validators/:address', async (req: Request, res: Response) => {
    try {
      if (!isValidAddress(req.params.address)) {
        return res.status(400).json({ error: 'Invalid DCC address format' });
      }
      const validator = await reader.getValidatorState(req.params.address);
      if (!validator.exists) return res.status(404).json({ error: 'Validator not found' });
      res.json(serializeBigInts(validator));
    } catch (err: any) {
      res.status(502).json({ error: err.message });
    }
  });

  /** Live user state from chain (stDCC balance, estimated value) */
  router.get('/chain/users/:address', async (req: Request, res: Response) => {
    try {
      if (!isValidAddress(req.params.address)) {
        return res.status(400).json({ error: 'Invalid DCC address format' });
      }
      const userState = await reader.getUserState(req.params.address);
      res.json(serializeBigInts(userState));
    } catch (err: any) {
      res.status(502).json({ error: err.message });
    }
  });

  /** Live withdrawal request from chain */
  router.get('/chain/withdrawals/:requestId', async (req: Request, res: Response) => {
    try {
      const requestId = req.params.requestId;
      if (!/^\d+$/.test(requestId)) {
        return res.status(400).json({ error: 'requestId must be a numeric string' });
      }
      const request = await reader.getWithdrawalRequest(requestId);
      if (!request) return res.status(404).json({ error: 'Withdrawal request not found' });
      res.json(serializeBigInts(request));
    } catch (err: any) {
      res.status(502).json({ error: err.message });
    }
  });

  /** DCC balance of any address */
  router.get('/chain/balance/:address', async (req: Request, res: Response) => {
    try {
      if (!isValidAddress(req.params.address)) {
        return res.status(400).json({ error: 'Invalid DCC address format' });
      }
      const node = reader.getNodeClient();
      const balance = await node.getDccBalance(req.params.address);
      res.json({
        address: req.params.address,
        available: balance.available.toString(),
        regular: balance.regular.toString(),
        effective: balance.effective.toString(),
      });
    } catch (err: any) {
      res.status(502).json({ error: err.message });
    }
  });

  /** Current blockchain height */
  router.get('/chain/height', async (_req: Request, res: Response) => {
    try {
      const node = reader.getNodeClient();
      const height = await node.getHeight();
      res.json({ height });
    } catch (err: any) {
      res.status(502).json({ error: err.message });
    }
  });

  // ===========================================================================
  // Part 3: Estimation endpoints (off-chain math, no tx needed)
  // ===========================================================================

  /** Estimate stDCC received for a deposit amount */
  router.post('/estimate/deposit', async (req: Request, res: Response) => {
    try {
      const { amount } = req.body;
      if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
        return res.status(400).json({ error: 'amount is required and must be a positive number (in wavelets)' });
      }
      const state = await reader.getProtocolState();
      const amountBig = BigInt(amount);
      const { sharesToReceive, exchangeRate } = estimateDeposit(
        amountBig, state.totalPooledDcc, state.totalShares
      );
      res.json({
        depositAmount: amountBig.toString(),
        sharesToReceive: sharesToReceive.toString(),
        exchangeRate: exchangeRate.toString(),
        dccPerStDcc: Number(exchangeRate) / Number(ONE_DCC),
        minDeposit: state.minDepositDcc.toString(),
        protocolPaused: state.paused,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  /** Estimate DCC received for a withdrawal (share burn) */
  router.post('/estimate/withdraw', async (req: Request, res: Response) => {
    try {
      const { shares } = req.body;
      if (!shares || isNaN(Number(shares)) || Number(shares) <= 0) {
        return res.status(400).json({ error: 'shares is required and must be a positive number (in wavelets)' });
      }
      const state = await reader.getProtocolState();
      const sharesBig = BigInt(shares);
      const { dccToReceive, exchangeRate } = estimateWithdraw(
        sharesBig, state.totalPooledDcc, state.totalShares
      );
      res.json({
        sharesToBurn: sharesBig.toString(),
        dccToReceive: dccToReceive.toString(),
        exchangeRate: exchangeRate.toString(),
        dccPerStDcc: Number(exchangeRate) / Number(ONE_DCC),
        minWithdrawShares: state.minWithdrawShares.toString(),
        protocolPaused: state.paused,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  /** Estimate protocol fee for a reward sync */
  router.post('/estimate/reward-fee', async (req: Request, res: Response) => {
    try {
      const { rewardAmount } = req.body;
      if (!rewardAmount || isNaN(Number(rewardAmount)) || Number(rewardAmount) <= 0) {
        return res.status(400).json({ error: 'rewardAmount is required and must be positive (in wavelets)' });
      }
      const state = await reader.getProtocolState();
      const rewardBig = BigInt(rewardAmount);
      const fee = calcProtocolFee(rewardBig, BigInt(state.protocolFeeBps));
      const netReward = rewardBig - fee;
      res.json({
        grossReward: rewardBig.toString(),
        protocolFeeBps: state.protocolFeeBps,
        feeAmount: fee.toString(),
        netReward: netReward.toString(),
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ===========================================================================
  // Part 4: Transaction builders (returns unsigned tx params for signing)
  // ===========================================================================

  async function getStDccAssetId(): Promise<string> {
    const state = await reader.getProtocolState();
    return state.stDccAssetId;
  }

  /** Build unsigned deposit transaction */
  router.post('/tx/build/deposit', async (req: Request, res: Response) => {
    try {
      const { amount } = req.body;
      if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
        return res.status(400).json({ error: 'amount is required (wavelets, positive integer)' });
      }
      const stDccAssetId = await getStDccAssetId();
      const builder = new TxBuilder({ dAppAddress, stDccAssetId, chainId });
      const tx = builder.buildDepositTx(Number(amount));
      res.json({ type: 'invokeScript', tx });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  /** Build unsigned request-withdraw transaction */
  router.post('/tx/build/request-withdraw', async (req: Request, res: Response) => {
    try {
      const { shares } = req.body;
      if (!shares || isNaN(Number(shares)) || Number(shares) <= 0) {
        return res.status(400).json({ error: 'shares is required (wavelets, positive integer)' });
      }
      const stDccAssetId = await getStDccAssetId();
      const builder = new TxBuilder({ dAppAddress, stDccAssetId, chainId });
      const tx = builder.buildRequestWithdrawTx(Number(shares));
      res.json({ type: 'invokeScript', tx });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  /** Build unsigned claim-withdraw transaction */
  router.post('/tx/build/claim-withdraw', async (req: Request, res: Response) => {
    try {
      const { requestId } = req.body;
      if (!requestId || typeof requestId !== 'string') {
        return res.status(400).json({ error: 'requestId is required (string)' });
      }
      const stDccAssetId = await getStDccAssetId();
      const builder = new TxBuilder({ dAppAddress, stDccAssetId, chainId });
      const tx = builder.buildClaimWithdrawTx(requestId);
      res.json({ type: 'invokeScript', tx });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ---------------------------------------------------------------------------
  // Admin tx builders
  // ---------------------------------------------------------------------------

  /** Build unsigned add-validator transaction */
  router.post('/tx/build/admin/add-validator', async (req: Request, res: Response) => {
    try {
      const { validatorAddress, weightBps } = req.body;
      if (!validatorAddress || !isValidAddress(validatorAddress)) {
        return res.status(400).json({ error: 'Valid validatorAddress is required' });
      }
      if (weightBps === undefined || isNaN(Number(weightBps)) || Number(weightBps) < 0 || Number(weightBps) > 10000) {
        return res.status(400).json({ error: 'weightBps is required (0-10000)' });
      }
      const stDccAssetId = await getStDccAssetId();
      const builder = new TxBuilder({ dAppAddress, stDccAssetId, chainId });
      const tx = builder.buildAddValidatorTx(validatorAddress, Number(weightBps));
      res.json({ type: 'invokeScript', tx });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  /** Build unsigned update-validator transaction */
  router.post('/tx/build/admin/update-validator', async (req: Request, res: Response) => {
    try {
      const { validatorAddress, enabled, weightBps } = req.body;
      if (!validatorAddress || !isValidAddress(validatorAddress)) {
        return res.status(400).json({ error: 'Valid validatorAddress is required' });
      }
      if (typeof enabled !== 'boolean') {
        return res.status(400).json({ error: 'enabled is required (boolean)' });
      }
      if (weightBps === undefined || isNaN(Number(weightBps)) || Number(weightBps) < 0 || Number(weightBps) > 10000) {
        return res.status(400).json({ error: 'weightBps is required (0-10000)' });
      }
      const stDccAssetId = await getStDccAssetId();
      const builder = new TxBuilder({ dAppAddress, stDccAssetId, chainId });
      const tx = builder.buildUpdateValidatorTx(validatorAddress, enabled, Number(weightBps));
      res.json({ type: 'invokeScript', tx });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  /** Build unsigned remove-validator transaction */
  router.post('/tx/build/admin/remove-validator', async (req: Request, res: Response) => {
    try {
      const { validatorAddress } = req.body;
      if (!validatorAddress || !isValidAddress(validatorAddress)) {
        return res.status(400).json({ error: 'Valid validatorAddress is required' });
      }
      const stDccAssetId = await getStDccAssetId();
      const builder = new TxBuilder({ dAppAddress, stDccAssetId, chainId });
      const tx = builder.buildRemoveValidatorTx(validatorAddress);
      res.json({ type: 'invokeScript', tx });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  /** Build unsigned set-treasury transaction */
  router.post('/tx/build/admin/set-treasury', async (req: Request, res: Response) => {
    try {
      const { address } = req.body;
      if (!address || !isValidAddress(address)) {
        return res.status(400).json({ error: 'Valid address is required' });
      }
      const stDccAssetId = await getStDccAssetId();
      const builder = new TxBuilder({ dAppAddress, stDccAssetId, chainId });
      const tx = builder.buildSetTreasuryTx(address);
      res.json({ type: 'invokeScript', tx });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  /** Build unsigned set-protocol-fee transaction */
  router.post('/tx/build/admin/set-fee', async (req: Request, res: Response) => {
    try {
      const { feeBps } = req.body;
      if (feeBps === undefined || isNaN(Number(feeBps)) || Number(feeBps) < 0 || Number(feeBps) > 5000) {
        return res.status(400).json({ error: 'feeBps is required (0-5000)' });
      }
      const stDccAssetId = await getStDccAssetId();
      const builder = new TxBuilder({ dAppAddress, stDccAssetId, chainId });
      const tx = builder.buildSetProtocolFeeBpsTx(Number(feeBps));
      res.json({ type: 'invokeScript', tx });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  /** Build unsigned set-operator transaction */
  router.post('/tx/build/admin/set-operator', async (req: Request, res: Response) => {
    try {
      const { address } = req.body;
      if (!address || !isValidAddress(address)) {
        return res.status(400).json({ error: 'Valid address is required' });
      }
      const stDccAssetId = await getStDccAssetId();
      const builder = new TxBuilder({ dAppAddress, stDccAssetId, chainId });
      const tx = builder.buildSetOperatorTx(address);
      res.json({ type: 'invokeScript', tx });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  /** Build unsigned pause transaction */
  router.post('/tx/build/admin/pause', async (_req: Request, res: Response) => {
    try {
      const stDccAssetId = await getStDccAssetId();
      const builder = new TxBuilder({ dAppAddress, stDccAssetId, chainId });
      const tx = builder.buildPauseTx();
      res.json({ type: 'invokeScript', tx });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  /** Build unsigned unpause transaction */
  router.post('/tx/build/admin/unpause', async (_req: Request, res: Response) => {
    try {
      const stDccAssetId = await getStDccAssetId();
      const builder = new TxBuilder({ dAppAddress, stDccAssetId, chainId });
      const tx = builder.buildUnpauseTx();
      res.json({ type: 'invokeScript', tx });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  /** Build unsigned emergency-mode transaction */
  router.post('/tx/build/admin/emergency', async (req: Request, res: Response) => {
    try {
      const { enable } = req.body;
      if (typeof enable !== 'boolean') {
        return res.status(400).json({ error: 'enable is required (boolean)' });
      }
      const stDccAssetId = await getStDccAssetId();
      const builder = new TxBuilder({ dAppAddress, stDccAssetId, chainId });
      const tx = builder.buildEmergencyModeTx(enable);
      res.json({ type: 'invokeScript', tx });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  /** Build unsigned transfer-admin transaction */
  router.post('/tx/build/admin/transfer-admin', async (req: Request, res: Response) => {
    try {
      const { newAdmin } = req.body;
      if (!newAdmin || !isValidAddress(newAdmin)) {
        return res.status(400).json({ error: 'Valid newAdmin address is required' });
      }
      const stDccAssetId = await getStDccAssetId();
      const builder = new TxBuilder({ dAppAddress, stDccAssetId, chainId });
      const tx = builder.buildTransferAdminTx(newAdmin);
      res.json({ type: 'invokeScript', tx });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  /** Build unsigned set-guardian transaction */
  router.post('/tx/build/admin/set-guardian', async (req: Request, res: Response) => {
    try {
      const { address } = req.body;
      if (!address || !isValidAddress(address)) {
        return res.status(400).json({ error: 'Valid address is required' });
      }
      const stDccAssetId = await getStDccAssetId();
      const builder = new TxBuilder({ dAppAddress, stDccAssetId, chainId });
      const tx = builder.buildSetGuardianTx(address);
      res.json({ type: 'invokeScript', tx });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  /** Build unsigned set-min-deposit transaction */
  router.post('/tx/build/admin/set-min-deposit', async (req: Request, res: Response) => {
    try {
      const { amount } = req.body;
      if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
        return res.status(400).json({ error: 'amount is required (wavelets, positive integer)' });
      }
      const stDccAssetId = await getStDccAssetId();
      const builder = new TxBuilder({ dAppAddress, stDccAssetId, chainId });
      const tx = builder.buildSetMinDepositTx(Number(amount));
      res.json({ type: 'invokeScript', tx });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  /** Build unsigned set-min-withdraw-shares transaction */
  router.post('/tx/build/admin/set-min-withdraw-shares', async (req: Request, res: Response) => {
    try {
      const { amount } = req.body;
      if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
        return res.status(400).json({ error: 'amount is required (wavelets, positive integer)' });
      }
      const stDccAssetId = await getStDccAssetId();
      const builder = new TxBuilder({ dAppAddress, stDccAssetId, chainId });
      const tx = builder.buildSetMinWithdrawSharesTx(Number(amount));
      res.json({ type: 'invokeScript', tx });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ---------------------------------------------------------------------------
  // Operator tx builders
  // ---------------------------------------------------------------------------

  /** Build unsigned finalize-withdraw transaction */
  router.post('/tx/build/operator/finalize-withdraw', async (req: Request, res: Response) => {
    try {
      const { requestId } = req.body;
      if (!requestId || typeof requestId !== 'string') {
        return res.status(400).json({ error: 'requestId is required (string)' });
      }
      const stDccAssetId = await getStDccAssetId();
      const builder = new TxBuilder({ dAppAddress, stDccAssetId, chainId });
      const tx = builder.buildFinalizeWithdrawTx(requestId);
      res.json({ type: 'invokeScript', tx });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  /** Build unsigned sync-rewards transaction */
  router.post('/tx/build/operator/sync-rewards', async (req: Request, res: Response) => {
    try {
      const { rewardAmount } = req.body;
      if (!rewardAmount || isNaN(Number(rewardAmount)) || Number(rewardAmount) <= 0) {
        return res.status(400).json({ error: 'rewardAmount is required (wavelets, positive integer)' });
      }
      const stDccAssetId = await getStDccAssetId();
      const builder = new TxBuilder({ dAppAddress, stDccAssetId, chainId });
      const tx = builder.buildSyncRewardsTx(Number(rewardAmount));
      res.json({ type: 'invokeScript', tx });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  /** Build unsigned record-lease transaction */
  router.post('/tx/build/operator/record-lease', async (req: Request, res: Response) => {
    try {
      const { validatorAddress, amount, leaseId } = req.body;
      if (!validatorAddress || !isValidAddress(validatorAddress)) {
        return res.status(400).json({ error: 'Valid validatorAddress is required' });
      }
      if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
        return res.status(400).json({ error: 'amount is required (wavelets, positive integer)' });
      }
      if (!leaseId || typeof leaseId !== 'string') {
        return res.status(400).json({ error: 'leaseId is required (string)' });
      }
      const stDccAssetId = await getStDccAssetId();
      const builder = new TxBuilder({ dAppAddress, stDccAssetId, chainId });
      const tx = builder.buildRecordLeaseTx(validatorAddress, Number(amount), leaseId);
      res.json({ type: 'invokeScript', tx });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  /** Build unsigned record-lease-cancel transaction */
  router.post('/tx/build/operator/record-lease-cancel', async (req: Request, res: Response) => {
    try {
      const { validatorAddress, amount } = req.body;
      if (!validatorAddress || !isValidAddress(validatorAddress)) {
        return res.status(400).json({ error: 'Valid validatorAddress is required' });
      }
      if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
        return res.status(400).json({ error: 'amount is required (wavelets, positive integer)' });
      }
      const stDccAssetId = await getStDccAssetId();
      const builder = new TxBuilder({ dAppAddress, stDccAssetId, chainId });
      const tx = builder.buildRecordLeaseCancelTx(validatorAddress, Number(amount));
      res.json({ type: 'invokeScript', tx });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ===========================================================================
  // Part 5: Transaction broadcast
  // ===========================================================================

  /** Broadcast a signed transaction to the DCC network */
  router.post('/tx/broadcast', async (req: Request, res: Response) => {
    try {
      const signedTx = req.body;
      if (!signedTx || !signedTx.type) {
        return res.status(400).json({ error: 'Signed transaction object is required in request body' });
      }
      const node = reader.getNodeClient();
      const result = await node.broadcast(signedTx);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  /** Check transaction status by ID */
  router.get('/tx/status/:txId', async (req: Request, res: Response) => {
    try {
      const txId = req.params.txId;
      if (!/^[A-Za-z0-9]{43,44}$/.test(txId)) {
        return res.status(400).json({ error: 'Invalid transaction ID format' });
      }
      const node = reader.getNodeClient();
      const result = await node.waitForTx(txId, 5_000, 2_000);
      res.json(result);
    } catch (err: any) {
      res.status(404).json({ error: `Transaction not found or not confirmed: ${err.message}` });
    }
  });

  return router;
}
