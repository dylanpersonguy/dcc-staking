// =============================================================================
// DCC Liquid Staking Indexer — Polling Worker
// =============================================================================
// Watches chain for protocol-related data and state changes.

import { ProtocolReader, parseProtocolDataEntries, calcExchangeRate } from '@dcc-staking/sdk';
import { Db } from './db/db';

export class IndexerWorker {
  private reader: ProtocolReader;
  private db: Db;
  private pollIntervalMs: number;
  private running = false;

  constructor(reader: ProtocolReader, db: Db, pollIntervalMs: number = 5000) {
    this.reader = reader;
    this.db = db;
    this.pollIntervalMs = pollIntervalMs;
  }

  async start(): Promise<void> {
    this.running = true;
    console.log('[indexer] Starting indexer worker...');

    while (this.running) {
      try {
        await this.poll();
      } catch (err) {
        console.error('[indexer] Poll error:', err);
      }
      await this.sleep(this.pollIntervalMs);
    }
  }

  stop(): void {
    this.running = false;
    console.log('[indexer] Stopping indexer worker...');
  }

  private async poll(): Promise<void> {
    const lastHeight = await this.db.getLastIndexedHeight();
    const currentHeight = await this.reader.getNodeClient().getHeight();

    if (currentHeight <= lastHeight) return;

    console.log(`[indexer] Indexing from height ${lastHeight + 1} to ${currentHeight}`);

    // Fetch all current data entries
    const entries = await this.reader.getAllDataEntries();
    const parsed = parseProtocolDataEntries(entries as any);

    // Process new deposits
    for (const dep of parsed.deposits) {
      if (dep.height > lastHeight) {
        await this.db.insertDeposit({
          txId: dep.txId,
          height: dep.height,
          address: dep.address,
          amountDcc: dep.amount,
          sharesMinted: dep.shares,
          exchangeRate: dep.shares > 0n ? (dep.amount * BigInt(1e8)) / dep.shares : BigInt(1e8),
        });
        console.log(`[indexer] Indexed deposit: ${dep.txId}`);
      }
    }

    // Process withdrawal requests
    for (const wr of parsed.withdrawRequests) {
      if (wr.height > lastHeight) {
        await this.db.upsertWithdrawalRequest({
          requestId: wr.requestId,
          txId: wr.txId,
          height: wr.height,
          owner: wr.address,
          shares: wr.shares,
          dccEstimate: wr.dccEstimate,
          dccFinal: 0n,
          status: 0,
          createdAtHeight: wr.height,
          finalizedAtHeight: 0,
          claimedAtHeight: 0,
        });
        console.log(`[indexer] Indexed withdrawal request: ${wr.requestId}`);
      }
    }

    // Process finalizations
    for (const fin of parsed.withdrawFinalizations) {
      if (fin.height > lastHeight) {
        // Fetch full request data from chain to get current status
        const req = await this.reader.getWithdrawalRequest(fin.requestId);
        if (req) {
          await this.db.upsertWithdrawalRequest({
            requestId: req.id,
            txId: fin.txId,
            height: fin.height,
            owner: req.owner,
            shares: req.shares,
            dccEstimate: req.dccEstimate,
            dccFinal: req.dccFinal,
            status: req.status,
            createdAtHeight: req.createdAt,
            finalizedAtHeight: req.finalizedAt,
            claimedAtHeight: req.claimedAt,
          });
        }
        console.log(`[indexer] Indexed withdrawal finalization: ${fin.requestId}`);
      }
    }

    // Process claims
    for (const claim of parsed.withdrawClaims) {
      if (claim.height > lastHeight) {
        await this.db.insertClaim({
          requestId: claim.requestId,
          txId: claim.txId,
          height: claim.height,
          owner: claim.address,
          amountDcc: claim.dccFinal,
        });
        console.log(`[indexer] Indexed claim: ${claim.requestId}`);
      }
    }

    // Process reward syncs
    for (const rw of parsed.rewardSyncs) {
      if (rw.height > lastHeight) {
        await this.db.insertRewardReport({
          txId: rw.txId,
          height: rw.height,
          rewardAmount: rw.rewardAmount,
          feeAmount: rw.feeAmount,
          netReward: rw.netReward,
        });
        console.log(`[indexer] Indexed reward sync: ${rw.txId}`);
      }
    }

    // Take protocol snapshot
    const state = await this.reader.getProtocolState();
    await this.db.insertSnapshot({
      height: currentHeight,
      timestamp: Date.now(),
      totalPooledDcc: state.totalPooledDcc,
      totalShares: state.totalShares,
      exchangeRate: state.exchangeRate,
      totalLeasedDcc: state.totalLeasedDcc,
      totalLiquidDcc: state.totalLiquidDcc,
      totalClaimableDcc: state.totalClaimableDcc,
      totalPendingWithdrawDcc: state.totalPendingWithdrawDcc,
      totalProtocolFeesDcc: state.totalProtocolFeesDcc,
      validatorCount: state.validatorCount,
    });

    await this.db.setLastIndexedHeight(currentHeight);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
