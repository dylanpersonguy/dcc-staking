// =============================================================================
// Seed Script — DCC Liquid Staking Protocol
// =============================================================================
// Seeds a deployed protocol with test data for development:
//   - Fund accounts from faucet
//   - Add a validator
//   - Perform an initial deposit
//   - Create a withdrawal request
//
// Usage: npx ts-node scripts/seed.ts
// =============================================================================

require('dotenv').config();

const NODE_URL = process.env.DCC_NODE_URL || 'https://mainnet-node.decentralchain.io';
const DAPP_ADDRESS = process.env.DAPP_ADDRESS || '';
const CHAIN_ID = process.env.DCC_CHAIN_ID || 'W';

interface SeedConfig {
  nodeUrl: string;
  dAppAddress: string;
  chainId: string;
  adminSeed: string;
  operatorSeed: string;
  userSeed: string;
  validatorAddress: string;
  depositAmount: number; // in DCC (human)
}

const config: SeedConfig = {
  nodeUrl: NODE_URL,
  dAppAddress: DAPP_ADDRESS,
  chainId: CHAIN_ID,
  adminSeed: process.env.ADMIN_SEED || 'admin test seed phrase here',
  operatorSeed: process.env.OPERATOR_SEED || 'operator test seed phrase here',
  userSeed: process.env.USER_SEED || 'user test seed phrase here',
  validatorAddress: process.env.SEED_VALIDATOR_ADDRESS || '3N_validator_address_here',
  depositAmount: 100, // 100 DCC
};

const ONE_DCC = 100_000_000;

// Helpers —————————————————————————————————————————————————————————————————————

async function fetchJson(url: string, init?: RequestInit): Promise<any> {
  const resp = await fetch(url, init);
  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`HTTP ${resp.status}: ${body}`);
  }
  return resp.json();
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// Steps ———————————————————————————————————————————————————————————————————————

async function step(label: string, fn: () => Promise<void>) {
  console.log(`\n[SEED] ${label}...`);
  try {
    await fn();
    console.log(`  ✓ ${label}`);
  } catch (err: any) {
    console.error(`  ✗ ${label}: ${err.message}`);
  }
}

async function seed() {
  console.log('=== DCC Liquid Staking — Seed ===');
  console.log(`Node:  ${config.nodeUrl}`);
  console.log(`dApp:  ${config.dAppAddress}`);
  console.log(`Chain: ${config.chainId}`);

  if (!config.dAppAddress) {
    console.error('\nERROR: DAPP_ADDRESS not set. Deploy first, then seed.');
    process.exit(1);
  }

  // Step 1: Check node health
  await step('Check node health', async () => {
    const status = await fetchJson(`${config.nodeUrl}/node/status`);
    console.log(`  Node height: ${status.blockchainHeight}`);
  });

  // Step 2: Check protocol state
  await step('Check protocol initialized', async () => {
    const entries = await fetchJson(
      `${config.nodeUrl}/addresses/data/${config.dAppAddress}?matches=initialized`
    );
    const init = entries.find((e: any) => e.key === 'initialized');
    if (!init || init.value !== true) {
      throw new Error('Protocol not initialized. Run deploy.ts first.');
    }
    console.log(`  Protocol status: initialized`);

    const statusEntry = entries.find((e: any) => e.key === 'status') || { value: 'unknown' };
    console.log(`  Protocol status: ${statusEntry.value}`);
  });

  // Step 3: Add validator (admin action)
  await step('Add validator', async () => {
    console.log(`  Validator: ${config.validatorAddress}`);
    console.log('  TODO(chain-confirmation): Sign & broadcast addValidator invoke');
    console.log(`  InvokeScript {`);
    console.log(`    dApp: "${config.dAppAddress}",`);
    console.log(`    function: "addValidator",`);
    console.log(`    args: ["${config.validatorAddress}", "seed-validator", 10000]`);
    console.log(`  }`);
  });

  // Step 4: Deposit (user action)
  const depositWavelets = config.depositAmount * ONE_DCC;
  await step(`Deposit ${config.depositAmount} DCC`, async () => {
    console.log(`  Amount: ${depositWavelets} wavelets`);
    console.log('  TODO(chain-confirmation): Sign & broadcast deposit invoke');
    console.log(`  InvokeScript {`);
    console.log(`    dApp: "${config.dAppAddress}",`);
    console.log(`    function: "deposit",`);
    console.log(`    payment: [{ amount: ${depositWavelets} }]`);
    console.log(`  }`);
  });

  // Step 5: Read state after deposit
  await step('Read protocol state', async () => {
    const entries = await fetchJson(
      `${config.nodeUrl}/addresses/data/${config.dAppAddress}`
    );
    const stateMap: Record<string, any> = {};
    for (const e of entries) {
      stateMap[e.key] = e.value;
    }
    console.log(`  Total pooled DCC:  ${stateMap['total_pooled_dcc'] || 0}`);
    console.log(`  Total shares:      ${stateMap['total_shares'] || 0}`);
    console.log(`  Exchange rate:     ${stateMap['exchange_rate'] || 'N/A'}`);
    console.log(`  stDCC asset ID:    ${stateMap['stdcc_asset_id'] || 'N/A'}`);
  });

  // Step 6: Request withdrawal (user action)
  await step('Request withdrawal of 10 stDCC shares', async () => {
    const withdrawShares = 10 * ONE_DCC;
    console.log(`  Shares: ${withdrawShares}`);
    console.log('  TODO(chain-confirmation): Sign & broadcast requestWithdraw invoke');
    console.log(`  InvokeScript {`);
    console.log(`    dApp: "${config.dAppAddress}",`);
    console.log(`    function: "requestWithdraw",`);
    console.log(`    payment: [{ assetId: "STDCC_ASSET_ID", amount: ${withdrawShares} }]`);
    console.log(`  }`);
  });

  console.log('\n=== Seed Complete ===');
  console.log('Review TODO(chain-confirmation) items above to complete with real signing.');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
