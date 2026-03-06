// =============================================================================
// DCC Liquid Staking SDK — Node API Client
// =============================================================================
// Adapter for DecentralChain node REST API (Waves-compatible endpoints).

import { DataEntry } from './types';

export class NodeClient {
  constructor(private readonly baseUrl: string) {}

  // ---------------------------------------------------------------------------
  // Data entries
  // ---------------------------------------------------------------------------

  /** Fetch all data entries for an address */
  async getDataEntries(address: string): Promise<DataEntry[]> {
    const resp = await fetch(`${this.baseUrl}/addresses/data/${address}`);
    if (!resp.ok) throw new Error(`Node API error: ${resp.status} ${resp.statusText}`);
    return resp.json() as Promise<DataEntry[]>;
  }

  /** Fetch a single data entry by key */
  async getDataEntry(address: string, key: string): Promise<DataEntry | null> {
    const resp = await fetch(`${this.baseUrl}/addresses/data/${address}/${encodeURIComponent(key)}`);
    if (resp.status === 404) return null;
    if (!resp.ok) throw new Error(`Node API error: ${resp.status} ${resp.statusText}`);
    return resp.json() as Promise<DataEntry | null>;
  }

  /** Fetch multiple data entries by key pattern (regex) */
  async getDataByRegex(address: string, pattern: string): Promise<DataEntry[]> {
    const resp = await fetch(
      `${this.baseUrl}/addresses/data/${address}?matches=${encodeURIComponent(pattern)}`
    );
    if (!resp.ok) throw new Error(`Node API error: ${resp.status} ${resp.statusText}`);
    return resp.json() as Promise<DataEntry[]>;
  }

  // ---------------------------------------------------------------------------
  // Balances
  // ---------------------------------------------------------------------------

  /** Get DCC (native) balance */
  async getDccBalance(address: string): Promise<{ available: bigint; regular: bigint; effective: bigint }> {
    const resp = await fetch(`${this.baseUrl}/addresses/balance/details/${address}`);
    if (!resp.ok) throw new Error(`Node API error: ${resp.status}`);
    const data = (await resp.json()) as { available: number; regular: number; effective: number };
    return {
      available: BigInt(data.available),
      regular: BigInt(data.regular),
      effective: BigInt(data.effective),
    };
  }

  /** Get asset balance for an address */
  async getAssetBalance(address: string, assetId: string): Promise<bigint> {
    const resp = await fetch(`${this.baseUrl}/assets/balance/${address}/${assetId}`);
    if (!resp.ok) throw new Error(`Node API error: ${resp.status}`);
    const data = (await resp.json()) as { balance: number };
    return BigInt(data.balance);
  }

  // ---------------------------------------------------------------------------
  // Blockchain info
  // ---------------------------------------------------------------------------

  /** Get current blockchain height */
  async getHeight(): Promise<number> {
    const resp = await fetch(`${this.baseUrl}/blocks/height`);
    if (!resp.ok) throw new Error(`Node API error: ${resp.status}`);
    const data = (await resp.json()) as { height: number };
    return data.height;
  }

  // ---------------------------------------------------------------------------
  // Transactions
  // ---------------------------------------------------------------------------

  /** Broadcast a signed transaction */
  async broadcast(tx: unknown): Promise<unknown> {
    const resp = await fetch(`${this.baseUrl}/transactions/broadcast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tx),
    });
    if (!resp.ok) {
      const errorText = await resp.text();
      throw new Error(`Broadcast error: ${resp.status} — ${errorText}`);
    }
    return resp.json();
  }

  /** Wait for transaction confirmation */
  async waitForTx(txId: string, timeoutMs: number = 60_000, pollMs: number = 3_000): Promise<unknown> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      try {
        const resp = await fetch(`${this.baseUrl}/transactions/info/${txId}`);
        if (resp.ok) return resp.json();
      } catch {
        // retry
      }
      await new Promise((resolve) => setTimeout(resolve, pollMs));
    }
    throw new Error(`Transaction ${txId} not confirmed within ${timeoutMs}ms`);
  }

  /** Get transaction info */
  async getTxInfo(txId: string): Promise<unknown> {
    const resp = await fetch(`${this.baseUrl}/transactions/info/${txId}`);
    if (!resp.ok) throw new Error(`Node API error: ${resp.status}`);
    return resp.json();
  }

  /** Get transactions by address */
  async getTxsByAddress(address: string, limit: number = 100): Promise<unknown[]> {
    const resp = await fetch(`${this.baseUrl}/transactions/address/${address}/limit/${limit}`);
    if (!resp.ok) throw new Error(`Node API error: ${resp.status}`);
    const data = (await resp.json()) as unknown[][];
    return data[0] || [];
  }
}
