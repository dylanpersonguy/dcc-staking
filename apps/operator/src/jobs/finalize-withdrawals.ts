// =============================================================================
// DCC Liquid Staking Operator — Job: Finalize Withdrawals
// =============================================================================
// Scans pending withdrawal requests and finalizes those with sufficient liquidity.

import { ProtocolReader, WithdrawalRequest, WithdrawalStatus } from '@dcc-staking/sdk';
import { OperatorSigner } from '../signer';

export interface FinalizeResult {
  finalized: Array<{
    requestId: string;
    amount: bigint;
    txId?: string;
    error?: string;
  }>;
  skipped: number;
}

/**
 * Process pending withdrawal requests.
 *
 * Logic:
 * 1. Fetch all pending withdrawal requests from chain
 * 2. Sort by creation height (FIFO)
 * 3. Finalize each request if sufficient liquid DCC is available
 * 4. Stop when liquid balance is exhausted
 */
export async function finalizeWithdrawals(
  reader: ProtocolReader,
  signer: OperatorSigner,
  dAppAddress: string
): Promise<FinalizeResult> {
  const state = await reader.getProtocolState();
  let availableLiquid = state.totalLiquidDcc;

  // Keep a safety buffer
  const SAFETY_BUFFER = BigInt(10_000_000); // 0.1 DCC
  if (availableLiquid <= SAFETY_BUFFER) {
    console.log('[finalize] Insufficient liquid DCC for any finalization');
    return { finalized: [], skipped: 0 };
  }
  availableLiquid -= SAFETY_BUFFER;

  // Fetch all pending requests
  const pendingRequests: WithdrawalRequest[] = [];
  for (let i = 1; i <= state.withdrawNonce; i++) {
    const req = await reader.getWithdrawalRequest(i.toString());
    if (req && req.status === WithdrawalStatus.PENDING) {
      pendingRequests.push(req);
    }
  }

  if (pendingRequests.length === 0) {
    console.log('[finalize] No pending withdrawal requests');
    return { finalized: [], skipped: 0 };
  }

  // Sort by creation height (FIFO fairness)
  pendingRequests.sort((a, b) => a.createdAt - b.createdAt);

  const finalized: FinalizeResult['finalized'] = [];
  let skipped = 0;

  for (const req of pendingRequests) {
    if (req.dccEstimate > availableLiquid) {
      skipped++;
      console.log(
        `[finalize] Skipping request ${req.id}: needs ${req.dccEstimate}, available ${availableLiquid}`
      );
      continue;
    }

    try {
      const result = await signer.invokeScript({
        dApp: dAppAddress,
        call: {
          function: 'finalizeWithdraw',
          args: [{ type: 'string', value: req.id }],
        },
      });

      availableLiquid -= req.dccEstimate;
      finalized.push({
        requestId: req.id,
        amount: req.dccEstimate,
        txId: result.id,
      });

      console.log(
        `[finalize] Finalized request ${req.id}: ${req.dccEstimate} wavelets, txId=${result.id}`
      );
    } catch (err: any) {
      console.error(`[finalize] Failed to finalize request ${req.id}:`, err.message);
      finalized.push({
        requestId: req.id,
        amount: req.dccEstimate,
        error: err.message,
      });
    }
  }

  return { finalized, skipped };
}
