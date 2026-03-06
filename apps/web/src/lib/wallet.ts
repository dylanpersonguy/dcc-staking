// =============================================================================
// Frontend — Wallet Adapter
// =============================================================================
// Provides wallet connection for DecentralChain (Waves-derived).
// Supports: (1) Seed phrase signer (direct), (2) WavesKeeper browser extension.

import { invokeScript, broadcast, waitForTx, libs } from '@waves/waves-transactions';

const NODE_URL = process.env.NEXT_PUBLIC_DCC_NODE_URL || 'https://mainnet-node.decentralchain.io';
const CHAIN_ID = process.env.NEXT_PUBLIC_DCC_CHAIN_ID || '?';

export interface WalletState {
  connected: boolean;
  address: string;
  publicKey: string;
  networkByte: number;
}

export interface WalletAdapter {
  connect(): Promise<WalletState>;
  disconnect(): void;
  getState(): WalletState | null;
  signAndBroadcast(tx: any): Promise<any>;
}

/**
 * Seed phrase wallet adapter — signs transactions directly in the browser
 * using @waves/waves-transactions. No browser extension needed.
 */
export class SeedAdapter implements WalletAdapter {
  private state: WalletState | null = null;
  private seed: string = '';

  async connectWithSeed(seedPhrase: string): Promise<WalletState> {
    const address = libs.crypto.address(seedPhrase, CHAIN_ID);
    const publicKey = libs.crypto.publicKey(seedPhrase);
    this.seed = seedPhrase;
    this.state = {
      connected: true,
      address,
      publicKey,
      networkByte: CHAIN_ID.charCodeAt(0),
    };
    return this.state;
  }

  async connect(): Promise<WalletState> {
    throw new Error('Use connectWithSeed(seedPhrase) instead');
  }

  disconnect(): void {
    this.seed = '';
    this.state = null;
  }

  getState(): WalletState | null {
    return this.state;
  }

  async signAndBroadcast(txParams: any): Promise<any> {
    if (!this.seed) throw new Error('Wallet not connected');

    // txParams is an InvokeScriptParams from TxBuilder
    const signedTx = invokeScript(
      {
        dApp: txParams.dApp,
        call: txParams.call,
        payment: txParams.payment || [],
        chainId: CHAIN_ID,
        fee: txParams.fee || 900000,
      },
      this.seed,
    );

    const result = await broadcast(signedTx, NODE_URL);
    await waitForTx(result.id, { apiBase: NODE_URL, timeout: 60000 });
    return result;
  }
}

/**
 * Keeper (browser extension) wallet adapter.
 */
export class KeeperAdapter implements WalletAdapter {
  private state: WalletState | null = null;

  async connect(): Promise<WalletState> {
    const keeper = (window as any).WavesKeeper || (window as any).DccKeeper;
    if (!keeper) {
      throw new Error('Wallet extension not found. Please install DCC Keeper.');
    }

    const authData = await keeper.auth({ data: 'DCC Liquid Staking' });
    this.state = {
      connected: true,
      address: authData.address,
      publicKey: authData.publicKey,
      networkByte: authData.network?.charCodeAt(0) || CHAIN_ID.charCodeAt(0),
    };
    return this.state;
  }

  disconnect(): void {
    this.state = null;
  }

  getState(): WalletState | null {
    return this.state;
  }

  async signAndBroadcast(tx: any): Promise<any> {
    const keeper = (window as any).WavesKeeper || (window as any).DccKeeper;
    if (!keeper) throw new Error('Wallet extension not found');
    return keeper.signAndPublishTransaction(tx);
  }
}

/**
 * Simple check if wallet extension is available.
 */
export function isKeeperAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(
    (window as any).WavesKeeper || (window as any).DccKeeper
  );
}
