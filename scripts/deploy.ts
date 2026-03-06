// =============================================================================
// Deploy Script — DCC Liquid Staking Protocol
// =============================================================================
// Deploys the RIDE contract and initializes the protocol.
//
// Usage: npx ts-node scripts/deploy.ts --network testnet
//
// TODO(chain-confirmation): Adapt transaction signing to exact DCC library.

import * as fs from 'fs';
import * as path from 'path';

// Parse args
const args = process.argv.slice(2);
const networkArg = args.find((a) => a.startsWith('--network='))?.split('=')[1]
  || (args.indexOf('--network') !== -1 ? args[args.indexOf('--network') + 1] : 'testnet');

console.log(`\n=== DCC Liquid Staking — Deploy (${networkArg}) ===\n`);

// Load env
require('dotenv').config();

const NODE_URL = process.env.DCC_NODE_URL || 'https://testnode1.decentralchain.io';
const CHAIN_ID = process.env.DCC_CHAIN_ID || 'T';
const DAPP_SEED = process.env.DAPP_SEED || '';
const ADMIN_ADDRESS = process.env.ADMIN_ADDRESS || '';
const OPERATOR_ADDRESS = process.env.OPERATOR_ADDRESS || '';
const TREASURY_ADDRESS = process.env.TREASURY_ADDRESS || '';
const PROTOCOL_FEE_BPS = parseInt(process.env.PROTOCOL_FEE_BPS || '1000');

if (!DAPP_SEED) {
  console.error('ERROR: DAPP_SEED is required in .env');
  process.exit(1);
}

async function deploy() {
  // Read RIDE source
  const ridePath = path.join(__dirname, '..', 'contracts', 'ride', 'liquid_staking.ride');
  const rideSource = fs.readFileSync(ridePath, 'utf-8');
  console.log(`RIDE source loaded: ${rideSource.length} chars`);

  // Step 1: Compile RIDE
  // TODO(chain-confirmation): Use DCC-specific compilation endpoint or tool
  console.log('Compiling RIDE contract...');
  const compileResp = await fetch(`${NODE_URL}/utils/script/compileCode`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(rideSource),
  });

  if (!compileResp.ok) {
    const errText = await compileResp.text();
    console.error(`Compilation failed: ${errText}`);
    process.exit(1);
  }

  const compiled = await compileResp.json() as any;
  const scriptBase64 = compiled.script;
  console.log(`Compiled script: ${scriptBase64.slice(0, 40)}...`);

  // Step 2: Create SetScript transaction
  // TODO(chain-confirmation): Replace with actual DCC tx library
  console.log('Broadcasting SetScript transaction...');

  const setScriptTx = {
    type: 13,
    version: 2,
    chainId: CHAIN_ID.charCodeAt(0),
    script: scriptBase64,
    fee: 1400000, // 0.014 DCC — typical SetScript fee
    // In production: sign with DAPP_SEED using @waves/waves-transactions
    // const tx = setScript({ script: scriptBase64, chainId: CHAIN_ID }, DAPP_SEED);
  };

  console.log('SetScript tx built (requires signing with seed).');
  console.log('TODO: Integrate actual signing library for DecentralChain.\n');

  // Step 3: Initialize protocol
  console.log('Building initialize transaction...');
  const initTx = {
    type: 16, // InvokeScript
    version: 2,
    chainId: CHAIN_ID.charCodeAt(0),
    dApp: 'DAPP_ADDRESS_AFTER_DEPLOY',
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
    fee: 500000 + 100000000, // InvokeScript fee + Issue fee for stDCC
  };

  console.log('Initialize tx config:');
  console.log(`  Admin:    ${ADMIN_ADDRESS}`);
  console.log(`  Operator: ${OPERATOR_ADDRESS}`);
  console.log(`  Treasury: ${TREASURY_ADDRESS}`);
  console.log(`  Fee BPS:  ${PROTOCOL_FEE_BPS}`);
  console.log('');

  console.log('=== Deployment Plan ===');
  console.log('1. Sign & broadcast SetScript tx');
  console.log('2. Wait for confirmation');
  console.log('3. Sign & broadcast Initialize tx');
  console.log('4. Wait for confirmation');
  console.log('5. Record stDCC asset ID from state');
  console.log('6. Add validator(s)');
  console.log('');
  console.log('NOTE: This script outputs tx templates.');
  console.log('TODO(chain-confirmation): Integrate actual signing/broadcast once');
  console.log('the DCC transaction library is confirmed.');
}

deploy().catch((err) => {
  console.error('Deploy failed:', err);
  process.exit(1);
});
