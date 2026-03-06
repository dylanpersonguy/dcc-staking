// =============================================================================
// DCC Liquid Staking Protocol — Network Configuration
// =============================================================================

export interface NetworkConfig {
  /** Human-readable network name */
  name: string;
  /** Node REST API base URL */
  nodeUrl: string;
  /** Chain ID character (T = testnet, D = mainnet) */
  chainId: string;
  /** dApp account address */
  dAppAddress: string;
  /** stDCC asset ID (set after initial deployment) */
  stDccAssetId: string;
  /** Explorer base URL for tx links */
  explorerUrl: string;
}

export const TESTNET: NetworkConfig = {
  name: 'testnet',
  nodeUrl: process.env.DCC_NODE_URL || 'https://testnode1.decentralchain.io',
  chainId: 'T',
  dAppAddress: process.env.DAPP_ADDRESS || '',
  stDccAssetId: process.env.STDCC_ASSET_ID || '',
  explorerUrl: 'https://testexplorer.decentralchain.io',
};

export const MAINNET: NetworkConfig = {
  name: 'mainnet',
  nodeUrl: process.env.DCC_NODE_URL || 'https://node1.decentralchain.io',
  chainId: 'D',
  dAppAddress: process.env.DAPP_ADDRESS || '',
  stDccAssetId: process.env.STDCC_ASSET_ID || '',
  explorerUrl: 'https://explorer.decentralchain.io',
};

export function getNetwork(name: string): NetworkConfig {
  switch (name.toLowerCase()) {
    case 'testnet':
      return TESTNET;
    case 'mainnet':
      return MAINNET;
    default:
      throw new Error(`Unknown network: ${name}`);
  }
}
