// =============================================================================
// Deploy Script — DCC Liquid Staking Protocol
// =============================================================================
// Deploys the RIDE contract and initializes the protocol on Waves-compatible
// chains (DCC testnet, Waves testnet).
//
// Usage:
//   npx ts-node scripts/deploy.ts                   # uses .env defaults
//   npx ts-node scripts/deploy.ts --network testnet
//   npx ts-node scripts/deploy.ts --skip-init       # deploy script only
// =============================================================================

import * as fs from 'fs';
import * as path from 'path';
import {
  setScript,
  invokeScript,
  broadcast,
  waitForTx,
  libs,
} from '@waves/waves-transactions';

require('dotenv').config();

// Parse CLI args
const args = process.argv.slice(2);
const skipInit = args.includes('--skip-init');
const networkArg = args.find((a) => a.startsWith('--network='))?.split('=')[1]
  || (args.indexOf('--network') !== -1 ? args[args.indexOf('--network') + 1] : 'mainnet');

// Config from env
const NODE_URL = process.env.DCC_NODE_URL || 'https://mainnet-node.decentralchain.io';
const CHAIN_ID = process.env.DCC_CHAIN_ID || 'W';
const DAPP_SEED = process.env.DAPP_SEED || '';
const PROTOCOL_FEE_BPS = parseInt(process.env.PROTOCOL_FEE_BPS || '1000', 10);

if (!DAPP_SEED) {
  console.error('❌ ERROR: DAPP_SEED is required — set it in .env');
  process.exit(1);
}

// Derive addresses from the dApp seed (admin = operator = treasury = dApp for testnet)
const dAppAddress = libs.crypto.address(DAPP_SEED, CHAIN_ID);
const ADMIN_ADDRESS = process.env.ADMIN_ADDRESS || dAppAddress;
const OPERATOR_ADDRESS = process.env.OPERATOR_ADDRESS || dAppAddress;
const TREASURY_ADDRESS = process.env.TREASURY_ADDRESS || dAppAddress;

// Helper: pretty time
function elapsed(start: number): string {
  return `${((Date.now() - start) / 1000).toFixed(1)}s`;
}

async function deploy() {
  console.log(`\n╔══════════════════════════════════════════════════╗`);
  console.log(`║   DCC Liquid Staking — Deploy (${networkArg.padEnd(8)})         ║`);
  console.log(`╚══════════════════════════════════════════════════╝\n`);

  console.log(`  Node:       ${NODE_URL}`);
  console.log(`  Chain ID:   ${CHAIN_ID}`);
  console.log(`  dApp:       ${dAppAddress}`);
  console.log(`  Admin:      ${ADMIN_ADDRESS}`);
  console.log(`  Operator:   ${OPERATOR_ADDRESS}`);
  console.log(`  Treasury:   ${TREASURY_ADDRESS}`);
  console.log(`  Fee:        ${PROTOCOL_FEE_BPS} bps (${PROTOCOL_FEE_BPS / 100}%)`);
  console.log('');

  // ─── Step 1: Check dApp balance ─────────────────────────────────────────────
  console.log('① Checking dApp balance...');
  const balResp = await fetch(`${NODE_URL}/addresses/balance/${dAppAddress}`);
  if (!balResp.ok) throw new Error(`Failed to fetch balance: ${balResp.status}`);
  const { balance } = (await balResp.json()) as { balance: number };
  const balanceDcc = balance / 100_000_000;
  console.log(`   Balance: ${balanceDcc.toFixed(4)} WAVES/DCC (${balance} wavelets)`);

  if (balance < 200_000_000) {
    console.log(`\n⚠️  Low balance! You need at least 2 WAVES/DCC for deployment.`);
    console.log(`   Fund address ${dAppAddress} from a testnet faucet:`);
    console.log(`   → https://wavesexplorer.com/faucet (Waves Testnet)`);
    console.log(`   → Or transfer from another testnet wallet.`);
    process.exit(1);
  }

  // ─── Step 2: Compile RIDE ───────────────────────────────────────────────────
  console.log('\n② Compiling RIDE contract...');
  const ridePath = path.join(__dirname, '..', 'contracts', 'ride', 'liquid_staking.ride');
  const rideSource = fs.readFileSync(ridePath, 'utf-8');
  console.log(`   Source loaded: ${rideSource.length} chars, ${rideSource.split('\n').length} lines`);

  const compileResp = await fetch(`${NODE_URL}/utils/script/compileCode`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: rideSource,
  });

  if (!compileResp.ok) {
    const errBody = await compileResp.text();
    console.error(`\n❌ Compilation failed!\n${errBody}`);
    process.exit(1);
  }

  const compiled = (await compileResp.json()) as { script: string; complexity: number; extraFee: number };
  console.log(`   ✓ Compiled — complexity: ${compiled.complexity}, extra fee: ${compiled.extraFee}`);

  // ─── Step 3: SetScript ──────────────────────────────────────────────────────
  console.log('\n③ Broadcasting SetScript transaction...');
  const t0 = Date.now();

  const setScriptTx = setScript(
    {
      script: compiled.script,
      chainId: CHAIN_ID,
      fee: 1800000 + (compiled.extraFee || 0), // Base + extraFee from compilation
    },
    DAPP_SEED,
  );

  const setScriptResult = await broadcast(setScriptTx, NODE_URL);
  console.log(`   TX: ${setScriptResult.id}`);
  console.log(`   Waiting for confirmation...`);

  await waitForTx(setScriptResult.id, { apiBase: NODE_URL, timeout: 120_000 });
  console.log(`   ✓ SetScript confirmed (${elapsed(t0)})`);

  if (skipInit) {
    console.log('\n⏭️  --skip-init flag set. Skipping initialization.');
    printSummary(setScriptResult.id, null);
    return;
  }

  // ─── Step 4: Initialize ─────────────────────────────────────────────────────
  console.log('\n④ Broadcasting initialize() transaction...');
  const t1 = Date.now();

  const initTx = invokeScript(
    {
      dApp: dAppAddress,
      call: {
        function: 'initialize',
        args: [
          { type: 'string', value: ADMIN_ADDRESS },
          { type: 'string', value: OPERATOR_ADDRESS },
          { type: 'string', value: TREASURY_ADDRESS },
          { type: 'integer', value: PROTOCOL_FEE_BPS },
        ],
      },
      payment: [],
      chainId: CHAIN_ID,
      fee: 100_500_000, // 0.005 invoke + 1.0 issue fee for stDCC token
    },
    DAPP_SEED,
  );

  const initResult = await broadcast(initTx, NODE_URL);
  console.log(`   TX: ${initResult.id}`);
  console.log(`   Waiting for confirmation...`);

  await waitForTx(initResult.id, { apiBase: NODE_URL, timeout: 120_000 });
  console.log(`   ✓ initialize() confirmed (${elapsed(t1)})`);

  // ─── Step 5: Read state ─────────────────────────────────────────────────────
  console.log('\n⑤ Reading deployed protocol state...');
  const stateResp = await fetch(`${NODE_URL}/addresses/data/${dAppAddress}`);
  const stateEntries = (await stateResp.json()) as Array<{ key: string; value: any }>;
  const stateMap: Record<string, any> = {};
  for (const e of stateEntries) stateMap[e.key] = e.value;

  const stDccAssetId = stateMap['stdcc_asset_id'] || '(not found)';

  console.log(`   stDCC Asset ID:  ${stDccAssetId}`);
  console.log(`   Total Pooled:    ${stateMap['total_pooled_dcc'] ?? 0}`);
  console.log(`   Total Shares:    ${stateMap['total_shares'] ?? 0}`);
  console.log(`   Protocol Fee:    ${stateMap['protocol_fee_bps'] ?? 0} bps`);
  console.log(`   Admin:           ${stateMap['admin'] ?? '(unset)'}`);
  console.log(`   Operator:        ${stateMap['operator'] ?? '(unset)'}`);
  console.log(`   Paused:          ${stateMap['paused'] ?? false}`);

  printSummary(setScriptResult.id, initResult.id, stDccAssetId);
}

function printSummary(setScriptTxId: string, initTxId: string | null, stDccAssetId?: string) {
  console.log(`\n╔══════════════════════════════════════════════════╗`);
  console.log(`║           ✅ DEPLOYMENT SUCCESSFUL               ║`);
  console.log(`╚══════════════════════════════════════════════════╝`);
  console.log(`\n  dApp Address:    ${dAppAddress}`);
  console.log(`  SetScript TX:    ${setScriptTxId}`);
  if (initTxId) console.log(`  Initialize TX:   ${initTxId}`);
  if (stDccAssetId) console.log(`  stDCC Asset ID:  ${stDccAssetId}`);
  console.log(`\n  Add to your .env:`);
  console.log(`    NEXT_PUBLIC_DAPP_ADDRESS=${dAppAddress}`);
  if (stDccAssetId) console.log(`    NEXT_PUBLIC_STDCC_ASSET_ID=${stDccAssetId}`);
  console.log('');
}

deploy().catch((err) => {
  console.error('\n❌ Deploy failed:', err.message || err);
  process.exit(1);
});
