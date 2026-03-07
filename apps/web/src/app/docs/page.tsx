'use client';

import { useEffect } from 'react';

// The full OpenAPI spec is loaded from the indexer's /api endpoint if available,
// otherwise we embed a reference to fetch it. For standalone mode, we inline the spec.
const OPENAPI_SPEC_URL = '/api/openapi.json';

export default function DocsPage() {
  useEffect(() => {
    // Load Swagger UI CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css';
    document.head.appendChild(link);

    // Load Swagger UI JS
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js';
    script.onload = () => {
      // Try loading from API first, fall back to embedded spec
      fetch(OPENAPI_SPEC_URL)
        .then((r) => (r.ok ? r.json() : Promise.reject('not available')))
        .then((spec) => initSwagger(spec))
        .catch(() => initSwagger(EMBEDDED_SPEC));
    };
    document.body.appendChild(script);

    function initSwagger(spec: any) {
      // @ts-expect-error SwaggerUIBundle loaded via CDN
      window.SwaggerUIBundle({
        spec,
        dom_id: '#swagger-ui',
        deepLinking: true,
        layout: 'BaseLayout',
        defaultModelsExpandDepth: 2,
        docExpansion: 'list',
      });
    }

    return () => {
      document.head.removeChild(link);
      document.body.removeChild(script);
    };
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <div id="swagger-ui" />
    </div>
  );
}

// ===========================================================================
// Embedded OpenAPI 3.0 spec (mirrors apps/indexer/src/openapi.ts)
// ===========================================================================
const EMBEDDED_SPEC = {
  openapi: '3.0.3',
  info: {
    title: 'DCC Liquid Staking — Protocol API',
    description:
      'Full-featured REST API for the DCC Liquid Staking Protocol. Includes indexed historical data, live chain reads, deposit/withdrawal estimators, unsigned transaction builders for all smart contract operations (user, admin, operator), and transaction broadcasting.',
    version: '2.0.0',
    contact: { name: 'stDCC Protocol', url: 'https://github.com/dylanpersonguy/dcc-staking' },
  },
  servers: [{ url: '/api', description: 'Indexer API' }],
  tags: [
    { name: 'Protocol', description: 'Indexed protocol state and snapshots' },
    { name: 'Deposits', description: 'Indexed deposit history' },
    { name: 'Withdrawals', description: 'Indexed withdrawal history' },
    { name: 'Rewards', description: 'Indexed staking reward history' },
    { name: 'Users', description: 'Indexed user data' },
    { name: 'Health', description: 'Service health' },
    { name: 'Chain', description: 'Live reads from the DCC blockchain (real-time)' },
    { name: 'Estimate', description: 'Off-chain estimators for deposits, withdrawals, and fees' },
    { name: 'Tx: User', description: 'Build unsigned transactions for user operations' },
    { name: 'Tx: Admin', description: 'Build unsigned transactions for admin operations' },
    { name: 'Tx: Operator', description: 'Build unsigned transactions for operator operations' },
    { name: 'Broadcast', description: 'Broadcast signed transactions and check status' },
  ],
  paths: {
    // Indexed data
    '/protocol/snapshot': { get: { tags: ['Protocol'], summary: 'Get latest protocol snapshot', responses: { '200': { description: 'Latest snapshot', content: { 'application/json': { schema: { $ref: '#/components/schemas/ProtocolSnapshot' } } } }, '404': { description: 'No snapshots yet' } } } },
    '/protocol/snapshots': { get: { tags: ['Protocol'], summary: 'Get snapshot history', parameters: [{ name: 'limit', in: 'query', schema: { type: 'integer', default: 100 } }], responses: { '200': { description: 'Snapshots', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/ProtocolSnapshot' } } } } } } } },
    '/deposits/{address}': { get: { tags: ['Deposits'], summary: 'Get deposits by address', parameters: [{ name: 'address', in: 'path', required: true, schema: { type: 'string' } }, { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } }], responses: { '200': { description: 'Deposits', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Deposit' } } } } } } } },
    '/withdrawals/{address}': { get: { tags: ['Withdrawals'], summary: 'Get withdrawals by address', parameters: [{ name: 'address', in: 'path', required: true, schema: { type: 'string' } }, { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } }], responses: { '200': { description: 'Withdrawals', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Withdrawal' } } } } } } } },
    '/withdrawals/pending/all': { get: { tags: ['Withdrawals'], summary: 'Get all pending withdrawals', responses: { '200': { description: 'Pending withdrawals', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Withdrawal' } } } } } } } },
    '/rewards': { get: { tags: ['Rewards'], summary: 'Get reward sync history', parameters: [{ name: 'limit', in: 'query', schema: { type: 'integer', default: 100 } }], responses: { '200': { description: 'Rewards', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/RewardSync' } } } } } } } },
    '/users/{address}': { get: { tags: ['Users'], summary: 'Get user details', parameters: [{ name: 'address', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'User', content: { 'application/json': { schema: { $ref: '#/components/schemas/UserIndexed' } } } }, '404': { description: 'Not found' } } } },
    '/users': { get: { tags: ['Users'], summary: 'Get top users', parameters: [{ name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } }], responses: { '200': { description: 'Users', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/UserIndexed' } } } } } } } },
    '/health': { get: { tags: ['Health'], summary: 'Health check', responses: { '200': { description: 'Healthy', content: { 'application/json': { schema: { $ref: '#/components/schemas/Health' } } } } } } },
    // Live chain reads
    '/chain/protocol': { get: { tags: ['Chain'], summary: 'Live protocol state from chain', description: 'Fetches current protocol state directly from the DCC blockchain. Includes admin, operator, treasury, fees, TVL, exchange rate, all accounting totals.', responses: { '200': { description: 'Live state', content: { 'application/json': { schema: { $ref: '#/components/schemas/ProtocolStateLive' } } } }, '502': { description: 'Node unreachable' } } } },
    '/chain/exchange-rate': { get: { tags: ['Chain'], summary: 'Live exchange rate', description: 'Current DCC-per-stDCC exchange rate from on-chain data.', responses: { '200': { description: 'Rate', content: { 'application/json': { schema: { $ref: '#/components/schemas/ExchangeRate' } } } } } } },
    '/chain/validators': { get: { tags: ['Chain'], summary: 'List all validators (live)', responses: { '200': { description: 'Validators', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/ValidatorState' } } } } } } } },
    '/chain/validators/{address}': { get: { tags: ['Chain'], summary: 'Get single validator (live)', parameters: [{ name: 'address', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Validator', content: { 'application/json': { schema: { $ref: '#/components/schemas/ValidatorState' } } } }, '404': { description: 'Not found' } } } },
    '/chain/users/{address}': { get: { tags: ['Chain'], summary: 'Get user state (live)', description: 'Live on-chain user state: stDCC balance, locked shares, estimated DCC value.', parameters: [{ name: 'address', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'User', content: { 'application/json': { schema: { $ref: '#/components/schemas/UserStateLive' } } } } } } },
    '/chain/withdrawals/{requestId}': { get: { tags: ['Chain'], summary: 'Get withdrawal request (live)', parameters: [{ name: 'requestId', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Request', content: { 'application/json': { schema: { $ref: '#/components/schemas/WithdrawalRequest' } } } }, '404': { description: 'Not found' } } } },
    '/chain/balance/{address}': { get: { tags: ['Chain'], summary: 'Get DCC balance', description: 'Native DCC balance (available, regular, effective).', parameters: [{ name: 'address', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Balance', content: { 'application/json': { schema: { $ref: '#/components/schemas/Balance' } } } } } } },
    '/chain/height': { get: { tags: ['Chain'], summary: 'Get blockchain height', responses: { '200': { description: 'Height', content: { 'application/json': { schema: { type: 'object', properties: { height: { type: 'integer' } } } } } } } } },
    // Estimators
    '/estimate/deposit': { post: { tags: ['Estimate'], summary: 'Estimate deposit outcome', description: 'Calculate stDCC shares received for a DCC deposit using live exchange rate.', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['amount'], properties: { amount: { type: 'string', description: 'DCC in wavelets (1 DCC = 100000000)' } } } } } }, responses: { '200': { description: 'Estimate', content: { 'application/json': { schema: { $ref: '#/components/schemas/DepositEstimateResponse' } } } } } } },
    '/estimate/withdraw': { post: { tags: ['Estimate'], summary: 'Estimate withdrawal outcome', description: 'Calculate DCC received for burning stDCC shares.', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['shares'], properties: { shares: { type: 'string', description: 'stDCC shares in wavelets' } } } } } }, responses: { '200': { description: 'Estimate', content: { 'application/json': { schema: { $ref: '#/components/schemas/WithdrawEstimateResponse' } } } } } } },
    '/estimate/reward-fee': { post: { tags: ['Estimate'], summary: 'Estimate protocol fee on rewards', description: 'Calculate fee and net reward for a given gross reward amount.', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['rewardAmount'], properties: { rewardAmount: { type: 'string' } } } } } }, responses: { '200': { description: 'Fee breakdown', content: { 'application/json': { schema: { $ref: '#/components/schemas/RewardFeeResponse' } } } } } } },
    // User tx builders
    '/tx/build/deposit': { post: { tags: ['Tx: User'], summary: 'Build deposit transaction', description: 'Returns unsigned InvokeScript to deposit DCC and receive stDCC. Sign with wallet, then POST to /tx/broadcast.', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['amount'], properties: { amount: { type: 'string', description: 'DCC in wavelets' } } } } } }, responses: { '200': { description: 'Unsigned tx', content: { 'application/json': { schema: { $ref: '#/components/schemas/UnsignedTx' } } } } } } },
    '/tx/build/request-withdraw': { post: { tags: ['Tx: User'], summary: 'Build request-withdraw transaction', description: 'Returns unsigned InvokeScript to burn stDCC and create withdrawal request (enters PENDING status).', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['shares'], properties: { shares: { type: 'string' } } } } } }, responses: { '200': { description: 'Unsigned tx', content: { 'application/json': { schema: { $ref: '#/components/schemas/UnsignedTx' } } } } } } },
    '/tx/build/claim-withdraw': { post: { tags: ['Tx: User'], summary: 'Build claim-withdraw transaction', description: 'Returns unsigned InvokeScript to claim DCC from a finalized withdrawal. Only original requestor can claim.', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['requestId'], properties: { requestId: { type: 'string' } } } } } }, responses: { '200': { description: 'Unsigned tx', content: { 'application/json': { schema: { $ref: '#/components/schemas/UnsignedTx' } } } } } } },
    // Admin tx builders
    '/tx/build/admin/add-validator': { post: { tags: ['Tx: Admin'], summary: 'Build add-validator tx', description: 'Register a new validator. Admin only.', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['validatorAddress', 'weightBps'], properties: { validatorAddress: { type: 'string' }, weightBps: { type: 'integer', minimum: 0, maximum: 10000 } } } } } }, responses: { '200': { description: 'Unsigned tx', content: { 'application/json': { schema: { $ref: '#/components/schemas/UnsignedTx' } } } } } } },
    '/tx/build/admin/update-validator': { post: { tags: ['Tx: Admin'], summary: 'Build update-validator tx', description: 'Update validator enabled status and weight. Admin only.', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['validatorAddress', 'enabled', 'weightBps'], properties: { validatorAddress: { type: 'string' }, enabled: { type: 'boolean' }, weightBps: { type: 'integer' } } } } } }, responses: { '200': { description: 'Unsigned tx', content: { 'application/json': { schema: { $ref: '#/components/schemas/UnsignedTx' } } } } } } },
    '/tx/build/admin/remove-validator': { post: { tags: ['Tx: Admin'], summary: 'Build remove-validator tx', description: 'Remove a validator (must have no active leases). Admin only.', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['validatorAddress'], properties: { validatorAddress: { type: 'string' } } } } } }, responses: { '200': { description: 'Unsigned tx', content: { 'application/json': { schema: { $ref: '#/components/schemas/UnsignedTx' } } } } } } },
    '/tx/build/admin/set-treasury': { post: { tags: ['Tx: Admin'], summary: 'Build set-treasury tx', description: 'Set treasury address (receives protocol fees). Admin only.', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['address'], properties: { address: { type: 'string' } } } } } }, responses: { '200': { description: 'Unsigned tx', content: { 'application/json': { schema: { $ref: '#/components/schemas/UnsignedTx' } } } } } } },
    '/tx/build/admin/set-fee': { post: { tags: ['Tx: Admin'], summary: 'Build set-protocol-fee tx', description: 'Update protocol fee (0-5000 bps = 0-50%). Admin only.', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['feeBps'], properties: { feeBps: { type: 'integer', minimum: 0, maximum: 5000 } } } } } }, responses: { '200': { description: 'Unsigned tx', content: { 'application/json': { schema: { $ref: '#/components/schemas/UnsignedTx' } } } } } } },
    '/tx/build/admin/set-operator': { post: { tags: ['Tx: Admin'], summary: 'Build set-operator tx', description: 'Transfer operator role. Admin only.', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['address'], properties: { address: { type: 'string' } } } } } }, responses: { '200': { description: 'Unsigned tx', content: { 'application/json': { schema: { $ref: '#/components/schemas/UnsignedTx' } } } } } } },
    '/tx/build/admin/set-guardian': { post: { tags: ['Tx: Admin'], summary: 'Build set-guardian tx', description: 'Set guardian address (can pause protocol). Admin only.', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['address'], properties: { address: { type: 'string' } } } } } }, responses: { '200': { description: 'Unsigned tx', content: { 'application/json': { schema: { $ref: '#/components/schemas/UnsignedTx' } } } } } } },
    '/tx/build/admin/set-min-deposit': { post: { tags: ['Tx: Admin'], summary: 'Build set-min-deposit tx', description: 'Update minimum deposit threshold. Admin only.', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['amount'], properties: { amount: { type: 'string' } } } } } }, responses: { '200': { description: 'Unsigned tx', content: { 'application/json': { schema: { $ref: '#/components/schemas/UnsignedTx' } } } } } } },
    '/tx/build/admin/set-min-withdraw-shares': { post: { tags: ['Tx: Admin'], summary: 'Build set-min-withdraw-shares tx', description: 'Update minimum withdrawal shares. Admin only.', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['amount'], properties: { amount: { type: 'string' } } } } } }, responses: { '200': { description: 'Unsigned tx', content: { 'application/json': { schema: { $ref: '#/components/schemas/UnsignedTx' } } } } } } },
    '/tx/build/admin/pause': { post: { tags: ['Tx: Admin'], summary: 'Build pause tx', description: 'Pause protocol (disables deposits, withdrawals, reward syncs). Admin or Guardian.', responses: { '200': { description: 'Unsigned tx', content: { 'application/json': { schema: { $ref: '#/components/schemas/UnsignedTx' } } } } } } },
    '/tx/build/admin/unpause': { post: { tags: ['Tx: Admin'], summary: 'Build unpause tx', description: 'Unpause protocol. Admin only.', responses: { '200': { description: 'Unsigned tx', content: { 'application/json': { schema: { $ref: '#/components/schemas/UnsignedTx' } } } } } } },
    '/tx/build/admin/emergency': { post: { tags: ['Tx: Admin'], summary: 'Build emergency-mode tx', description: 'Enable/disable emergency mode. Admin only.', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['enable'], properties: { enable: { type: 'boolean' } } } } } }, responses: { '200': { description: 'Unsigned tx', content: { 'application/json': { schema: { $ref: '#/components/schemas/UnsignedTx' } } } } } } },
    '/tx/build/admin/transfer-admin': { post: { tags: ['Tx: Admin'], summary: 'Build transfer-admin tx', description: 'Transfer admin role. Irreversible. Admin only.', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['newAdmin'], properties: { newAdmin: { type: 'string' } } } } } }, responses: { '200': { description: 'Unsigned tx', content: { 'application/json': { schema: { $ref: '#/components/schemas/UnsignedTx' } } } } } } },
    // Operator tx builders
    '/tx/build/operator/finalize-withdraw': { post: { tags: ['Tx: Operator'], summary: 'Build finalize-withdraw tx', description: 'Finalize a pending withdrawal. Moves DCC from pending to claimable. Operator only.', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['requestId'], properties: { requestId: { type: 'string' } } } } } }, responses: { '200': { description: 'Unsigned tx', content: { 'application/json': { schema: { $ref: '#/components/schemas/UnsignedTx' } } } } } } },
    '/tx/build/operator/sync-rewards': { post: { tags: ['Tx: Operator'], summary: 'Build sync-rewards tx', description: 'Sync staking rewards. Increases totalPooledDcc, raises exchange rate. Operator only.', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['rewardAmount'], properties: { rewardAmount: { type: 'string' } } } } } }, responses: { '200': { description: 'Unsigned tx', content: { 'application/json': { schema: { $ref: '#/components/schemas/UnsignedTx' } } } } } } },
    '/tx/build/operator/record-lease': { post: { tags: ['Tx: Operator'], summary: 'Build record-lease tx', description: 'Record a lease to a validator. Moves DCC from liquid to leased. Operator only.', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['validatorAddress', 'amount', 'leaseId'], properties: { validatorAddress: { type: 'string' }, amount: { type: 'string' }, leaseId: { type: 'string' } } } } } }, responses: { '200': { description: 'Unsigned tx', content: { 'application/json': { schema: { $ref: '#/components/schemas/UnsignedTx' } } } } } } },
    '/tx/build/operator/record-lease-cancel': { post: { tags: ['Tx: Operator'], summary: 'Build record-lease-cancel tx', description: 'Record lease cancellation. Returns DCC from leased to liquid. Operator only.', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['validatorAddress', 'amount'], properties: { validatorAddress: { type: 'string' }, amount: { type: 'string' } } } } } }, responses: { '200': { description: 'Unsigned tx', content: { 'application/json': { schema: { $ref: '#/components/schemas/UnsignedTx' } } } } } } },
    // Broadcast
    '/tx/broadcast': { post: { tags: ['Broadcast'], summary: 'Broadcast signed transaction', description: 'Submit a signed transaction to the DCC network.', requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/SignedTx' } } } }, responses: { '200': { description: 'Accepted', content: { 'application/json': { schema: { type: 'object', properties: { id: { type: 'string' }, type: { type: 'integer' } } } } } }, '400': { description: 'Rejected' } } } },
    '/tx/status/{txId}': { get: { tags: ['Broadcast'], summary: 'Check transaction status', description: 'Check if a transaction is confirmed on-chain.', parameters: [{ name: 'txId', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Confirmed' }, '404': { description: 'Not found' } } } },
  },
  components: {
    schemas: {
      Error: { type: 'object', properties: { error: { type: 'string' } } },
      ProtocolSnapshot: { type: 'object', properties: { id: { type: 'integer' }, height: { type: 'integer' }, timestamp: { type: 'string', format: 'date-time' }, totalPooledDcc: { type: 'string' }, totalShares: { type: 'string' }, exchangeRate: { type: 'string' }, totalLeasedDcc: { type: 'string' }, totalLiquidDcc: { type: 'string' }, totalClaimableDcc: { type: 'string' }, totalPendingWithdrawDcc: { type: 'string' }, totalProtocolFeesDcc: { type: 'string' }, validatorCount: { type: 'integer' }, protocolFeeBps: { type: 'integer' } } },
      Deposit: { type: 'object', properties: { id: { type: 'integer' }, txId: { type: 'string' }, address: { type: 'string' }, amount: { type: 'string' }, sharesMinted: { type: 'string' }, height: { type: 'integer' }, timestamp: { type: 'string', format: 'date-time' } } },
      Withdrawal: { type: 'object', properties: { id: { type: 'integer' }, requestId: { type: 'string' }, txId: { type: 'string' }, address: { type: 'string' }, sharesBurned: { type: 'string' }, dccEstimate: { type: 'string' }, dccFinal: { type: 'string' }, status: { type: 'string', enum: ['pending', 'finalized', 'claimed', 'cancelled'] }, createdAt: { type: 'integer' }, finalizedAt: { type: 'integer' }, claimedAt: { type: 'integer' } } },
      RewardSync: { type: 'object', properties: { id: { type: 'integer' }, txId: { type: 'string' }, rewardAmount: { type: 'string' }, feeAmount: { type: 'string' }, netReward: { type: 'string' }, height: { type: 'integer' }, timestamp: { type: 'string', format: 'date-time' } } },
      UserIndexed: { type: 'object', properties: { address: { type: 'string' }, totalDeposited: { type: 'string' }, totalWithdrawn: { type: 'string' }, currentShares: { type: 'string' }, depositCount: { type: 'integer' }, withdrawCount: { type: 'integer' } } },
      Health: { type: 'object', properties: { status: { type: 'string', enum: ['ok', 'error'] }, lastIndexedHeight: { type: 'integer' }, error: { type: 'string' } } },
      ProtocolStateLive: { type: 'object', description: 'Full live protocol state from chain', properties: { admin: { type: 'string' }, operator: { type: 'string' }, guardian: { type: 'string' }, paused: { type: 'boolean' }, emergencyMode: { type: 'boolean' }, stDccAssetId: { type: 'string' }, treasury: { type: 'string' }, protocolFeeBps: { type: 'integer' }, totalPooledDcc: { type: 'string' }, totalShares: { type: 'string' }, totalLeasedDcc: { type: 'string' }, totalLiquidDcc: { type: 'string' }, totalClaimableDcc: { type: 'string' }, totalPendingWithdrawDcc: { type: 'string' }, totalProtocolFeesDcc: { type: 'string' }, validatorCount: { type: 'integer' }, withdrawNonce: { type: 'integer' }, lastRewardSyncHeight: { type: 'integer' }, lastRewardSyncTs: { type: 'integer' }, minDepositDcc: { type: 'string' }, minWithdrawShares: { type: 'string' }, exchangeRate: { type: 'string' } } },
      ExchangeRate: { type: 'object', properties: { exchangeRate: { type: 'string', description: 'Raw rate in wavelets' }, dccPerStDcc: { type: 'number', description: 'Human-readable DCC per 1 stDCC' }, totalPooledDcc: { type: 'string' }, totalShares: { type: 'string' } } },
      ValidatorState: { type: 'object', properties: { address: { type: 'string' }, exists: { type: 'boolean' }, enabled: { type: 'boolean' }, weightBps: { type: 'integer' }, leasedDcc: { type: 'string' }, lastLeaseId: { type: 'string' }, lastSyncHeight: { type: 'integer' } } },
      UserStateLive: { type: 'object', properties: { address: { type: 'string' }, stDccBalance: { type: 'string' }, sharesLocked: { type: 'string' }, withdrawCount: { type: 'integer' }, estimatedDccValue: { type: 'string' } } },
      WithdrawalRequest: { type: 'object', properties: { id: { type: 'string' }, owner: { type: 'string' }, shares: { type: 'string' }, dccEstimate: { type: 'string' }, dccFinal: { type: 'string' }, status: { type: 'integer', description: '0=pending, 1=finalized, 2=claimed, 3=cancelled' }, createdAt: { type: 'integer' }, finalizedAt: { type: 'integer' }, claimedAt: { type: 'integer' } } },
      Balance: { type: 'object', properties: { address: { type: 'string' }, available: { type: 'string' }, regular: { type: 'string' }, effective: { type: 'string' } } },
      DepositEstimateResponse: { type: 'object', properties: { depositAmount: { type: 'string' }, sharesToReceive: { type: 'string' }, exchangeRate: { type: 'string' }, dccPerStDcc: { type: 'number' }, minDeposit: { type: 'string' }, protocolPaused: { type: 'boolean' } } },
      WithdrawEstimateResponse: { type: 'object', properties: { sharesToBurn: { type: 'string' }, dccToReceive: { type: 'string' }, exchangeRate: { type: 'string' }, dccPerStDcc: { type: 'number' }, minWithdrawShares: { type: 'string' }, protocolPaused: { type: 'boolean' } } },
      RewardFeeResponse: { type: 'object', properties: { grossReward: { type: 'string' }, protocolFeeBps: { type: 'integer' }, feeAmount: { type: 'string' }, netReward: { type: 'string' } } },
      UnsignedTx: { type: 'object', description: 'Unsigned InvokeScript tx. Sign with wallet, then POST to /tx/broadcast.', properties: { type: { type: 'string', example: 'invokeScript' }, tx: { type: 'object', properties: { dApp: { type: 'string' }, call: { type: 'object', properties: { function: { type: 'string' }, args: { type: 'array', items: { type: 'object' } } } }, payment: { type: 'array', items: { type: 'object' } }, chainId: { type: 'string' }, fee: { type: 'integer' } } } } },
      SignedTx: { type: 'object', description: 'Signed transaction for broadcast. Must include type, id, senderPublicKey, proofs.', properties: { type: { type: 'integer' }, id: { type: 'string' }, senderPublicKey: { type: 'string' }, proofs: { type: 'array', items: { type: 'string' } } } },
    },
  },
};
