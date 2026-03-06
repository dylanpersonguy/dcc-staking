// =============================================================================
// DCC Liquid Staking Operator — Entry Point
// =============================================================================
// Daemon that runs periodic operator jobs.

import dotenv from 'dotenv';
dotenv.config();

import { ProtocolReader } from '@dcc-staking/sdk';
import { OperatorSigner } from './signer';
import { syncRewards } from './jobs/sync-rewards';
import { leaseRebalance } from './jobs/lease-rebalance';
import { finalizeWithdrawals } from './jobs/finalize-withdrawals';
import { runSafetyChecks } from './jobs/safety-checks';

async function main() {
  const nodeUrl = process.env.DCC_NODE_URL || 'https://mainnet-node.decentralchain.io';
  const dAppAddress = process.env.DAPP_ADDRESS || '';
  const chainId = process.env.DCC_CHAIN_ID || '?';
  const operatorSeed = process.env.OPERATOR_SEED || '';
  const pollInterval = parseInt(process.env.OPERATOR_POLL_INTERVAL_MS || '30000', 10);

  if (!dAppAddress || !operatorSeed) {
    console.error('[operator] DAPP_ADDRESS and OPERATOR_SEED are required');
    process.exit(1);
  }

  const reader = new ProtocolReader(nodeUrl, dAppAddress);
  const signer = new OperatorSigner(operatorSeed, chainId, nodeUrl);

  console.log(`[operator] Starting operator daemon`);
  console.log(`[operator] Address: ${signer.getAddress()}`);
  console.log(`[operator] dApp: ${dAppAddress}`);
  console.log(`[operator] Node: ${nodeUrl}`);
  console.log(`[operator] Poll interval: ${pollInterval}ms`);

  let running = true;

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('[operator] Shutting down...');
    running = false;
  });

  let cycleCount = 0;

  while (running) {
    cycleCount++;
    console.log(`\n[operator] === Cycle ${cycleCount} ===`);

    try {
      // Step 1: Safety checks first
      console.log('[operator] Running safety checks...');
      const safetyResult = await runSafetyChecks(reader, dAppAddress);

      if (!safetyResult.passed) {
        console.error('[operator] Safety checks FAILED — skipping operational actions');
        // In production: trigger alert/notification
        await sleep(pollInterval);
        continue;
      }

      // Step 2: Sync rewards
      console.log('[operator] Syncing rewards...');
      const rewardResult = await syncRewards(reader, signer, dAppAddress);
      if (rewardResult.txId) {
        console.log(`[operator] Rewards synced: txId=${rewardResult.txId}`);
      }

      // Step 3: Finalize eligible withdrawals
      console.log('[operator] Finalizing withdrawals...');
      const finalizeResult = await finalizeWithdrawals(reader, signer, dAppAddress);
      console.log(
        `[operator] Finalized: ${finalizeResult.finalized.length}, Skipped: ${finalizeResult.skipped}`
      );

      // Step 4: Lease rebalance (every 5th cycle to avoid churn)
      if (cycleCount % 5 === 0) {
        console.log('[operator] Rebalancing leases...');
        const leaseResult = await leaseRebalance(reader, signer, dAppAddress);
        console.log(`[operator] Lease actions: ${leaseResult.leaseActions.length}`);
      }
    } catch (err: any) {
      console.error(`[operator] Cycle ${cycleCount} error:`, err.message);
    }

    await sleep(pollInterval);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((err) => {
  console.error('[operator] Fatal error:', err);
  process.exit(1);
});
