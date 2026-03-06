// =============================================================================
// Frontend — Protocol Client
// =============================================================================
// Wraps SDK protocol reader + indexer API for frontend consumption.

import { ProtocolReader, TxBuilder, estimateDeposit, estimateWithdraw } from '@dcc-staking/sdk';

const NODE_URL = process.env.NEXT_PUBLIC_DCC_NODE_URL || 'https://testnode1.decentralchain.io';
const DAPP_ADDRESS = process.env.NEXT_PUBLIC_DAPP_ADDRESS || '';
const STDCC_ASSET_ID = process.env.NEXT_PUBLIC_STDCC_ASSET_ID || '';
const NETWORK = process.env.NEXT_PUBLIC_NETWORK || 'testnet';
const INDEXER_URL = process.env.NEXT_PUBLIC_INDEXER_URL || 'http://localhost:3001';
const CHAIN_ID = NETWORK === 'mainnet' ? 'D' : 'T';

// Singleton reader
let _reader: ProtocolReader | null = null;
export function getReader(): ProtocolReader {
  if (!_reader) {
    _reader = new ProtocolReader(NODE_URL, DAPP_ADDRESS);
  }
  return _reader;
}

// Singleton tx builder
let _txBuilder: TxBuilder | null = null;
export function getTxBuilder(): TxBuilder {
  if (!_txBuilder) {
    _txBuilder = new TxBuilder({
      dAppAddress: DAPP_ADDRESS,
      stDccAssetId: STDCC_ASSET_ID,
      chainId: CHAIN_ID,
    });
  }
  return _txBuilder;
}

// Indexer API wrapper
export async function indexerGet<T>(path: string): Promise<T> {
  const resp = await fetch(`${INDEXER_URL}/api${path}`);
  if (!resp.ok) throw new Error(`Indexer error: ${resp.status}`);
  return resp.json();
}

export { NODE_URL, DAPP_ADDRESS, STDCC_ASSET_ID, NETWORK, CHAIN_ID, INDEXER_URL };
export { estimateDeposit, estimateWithdraw };
