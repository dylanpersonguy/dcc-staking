// =============================================================================
// Frontend — Wallet Adapter
// =============================================================================
// Provides wallet connection for DecentralChain (Waves-derived).
// Supports WavesKeeper-style browser extension and seed-based signer (dev).
//
// TODO(chain-confirmation): Verify exact wallet extension API for DecentralChain.
// This follows the WavesKeeper / Signer pattern common to Waves-derived chains.

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
 * Keeper (browser extension) wallet adapter.
 */
export class KeeperAdapter implements WalletAdapter {
  private state: WalletState | null = null;

  async connect(): Promise<WalletState> {
    // WavesKeeper / DCC Keeper global
    const keeper = (window as any).WavesKeeper || (window as any).DccKeeper;
    if (!keeper) {
      throw new Error('Wallet extension not found. Please install DCC Keeper.');
    }

    const authData = await keeper.auth({ data: 'DCC Liquid Staking' });
    this.state = {
      connected: true,
      address: authData.address,
      publicKey: authData.publicKey,
      networkByte: authData.network?.charCodeAt(0) || 84, // T for testnet
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
