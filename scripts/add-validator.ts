require('dotenv').config();
import { invokeScript, broadcast, waitForTx, libs } from '@waves/waves-transactions';

const NODE_URL = process.env.DCC_NODE_URL!;
const DAPP_ADDRESS = process.env.DAPP_ADDRESS!;
const CHAIN_ID = process.env.DCC_CHAIN_ID || '?';
const ADMIN_SEED = process.env.DAPP_SEED!;

const VALIDATOR_ADDRESS = '3DWrrgHCrVFvutBuLcPtmtMDfEJZ82V2uaN';
const WEIGHT_BPS = 10000; // 100% weight (sole validator)

async function main() {
  const adminAddr = libs.crypto.address(ADMIN_SEED, CHAIN_ID);
  console.log('Admin address:', adminAddr);
  console.log('dApp address:', DAPP_ADDRESS);
  console.log('Validator:', VALIDATOR_ADDRESS);
  console.log('Weight:', WEIGHT_BPS, 'BPS (100%)');

  const signedTx = invokeScript(
    {
      dApp: DAPP_ADDRESS,
      call: {
        function: 'addValidator',
        args: [
          { type: 'string', value: VALIDATOR_ADDRESS },
          { type: 'integer', value: WEIGHT_BPS },
        ],
      },
      payment: [],
      chainId: CHAIN_ID,
      fee: 900000,
    },
    ADMIN_SEED,
  );

  console.log('TxId:', signedTx.id);
  console.log('Broadcasting...');

  const result = await broadcast(signedTx, NODE_URL);
  console.log('Broadcast OK, waiting for confirmation...');

  await waitForTx(result.id, { apiBase: NODE_URL, timeout: 60000 });
  console.log('Confirmed! Validator added successfully.');
  console.log('TxId:', result.id);
}

main().catch((e) => {
  console.error('Failed:', e.message || e);
  process.exit(1);
});
