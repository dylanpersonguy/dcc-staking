// =============================================================================
// DCC Liquid Staking Operator — Signer Adapter
// =============================================================================
// Signs and broadcasts transactions for the operator account using
// @waves/waves-transactions (compatible with DecentralChain).

import {
  invokeScript,
  lease as leaseTx,
  cancelLease,
  broadcast,
  waitForTx,
  libs,
} from '@waves/waves-transactions';
import { NodeClient } from '@dcc-staking/sdk';

export class OperatorSigner {
  private seed: string;
  private chainId: string;
  private nodeUrl: string;
  private node: NodeClient;

  constructor(seed: string, chainId: string, nodeUrl: string) {
    this.seed = seed;
    this.chainId = chainId;
    this.nodeUrl = nodeUrl;
    this.node = new NodeClient(nodeUrl);
  }

  /** Returns the operator address derived from the seed. */
  getAddress(): string {
    return libs.crypto.address(this.seed, this.chainId);
  }

  /** Sign and broadcast an InvokeScript transaction. */
  async invokeScript(params: {
    dApp: string;
    call: { function: string; args: Array<{ type: string; value: any }> };
    payment?: Array<{ amount: number; assetId: string | null }>;
    fee?: number;
  }): Promise<{ id: string }> {
    const signedTx = invokeScript(
      {
        dApp: params.dApp,
        call: {
          function: params.call.function,
          args: params.call.args as any,
        },
        payment: params.payment || [],
        chainId: this.chainId,
        fee: params.fee || 900000,
      },
      this.seed,
    );

    console.log(`[signer] Broadcasting InvokeScript: ${params.call.function}`);
    const result = await broadcast(signedTx, this.nodeUrl);
    await waitForTx(result.id, { apiBase: this.nodeUrl, timeout: 60000 });
    return { id: result.id };
  }

  /** Sign and broadcast a Lease transaction. */
  async lease(recipient: string, amount: number): Promise<{ id: string }> {
    const signedTx = leaseTx(
      {
        recipient,
        amount,
        chainId: this.chainId,
        fee: 900000,
      },
      this.seed,
    );

    console.log(`[signer] Broadcasting Lease: ${amount} to ${recipient}`);
    const result = await broadcast(signedTx, this.nodeUrl);
    await waitForTx(result.id, { apiBase: this.nodeUrl, timeout: 60000 });
    return { id: result.id };
  }

  /** Sign and broadcast a LeaseCancel transaction. */
  async leaseCancel(leaseId: string): Promise<{ id: string }> {
    const signedTx = cancelLease(
      {
        leaseId,
        chainId: this.chainId,
        fee: 900000,
      },
      this.seed,
    );

    console.log(`[signer] Broadcasting LeaseCancel: ${leaseId}`);
    const result = await broadcast(signedTx, this.nodeUrl);
    await waitForTx(result.id, { apiBase: this.nodeUrl, timeout: 60000 });
    return { id: result.id };
  }

  getNodeClient(): NodeClient {
    return this.node;
  }
}
