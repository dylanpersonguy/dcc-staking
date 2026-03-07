// =============================================================================
// OpenAPI 3.0 Specification — DCC Liquid Staking Indexer API
// =============================================================================

export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'DCC Liquid Staking — Protocol API',
    description:
      'Full-featured REST API for the DCC Liquid Staking Protocol. Includes indexed historical data, live chain reads, deposit/withdrawal estimators, unsigned transaction builders for all smart contract operations (user, admin, operator), and transaction broadcasting.',
    version: '2.0.0',
    contact: {
      name: 'stDCC Protocol',
      url: 'https://github.com/dylanpersonguy/dcc-staking',
    },
  },
  servers: [
    { url: '/api', description: 'Indexer API (relative)' },
  ],
  tags: [
    { name: 'Protocol', description: 'Indexed protocol state and snapshots' },
    { name: 'Deposits', description: 'Indexed deposit history' },
    { name: 'Withdrawals', description: 'Indexed withdrawal history' },
    { name: 'Rewards', description: 'Indexed staking reward history' },
    { name: 'Users', description: 'Indexed user data' },
    { name: 'Health', description: 'Service health' },
    { name: 'Chain', description: 'Live reads from the DCC blockchain (real-time, not cached)' },
    { name: 'Estimate', description: 'Off-chain estimators for deposits, withdrawals, and fees' },
    { name: 'Tx: User', description: 'Build unsigned transactions for user operations (deposit, withdraw, claim)' },
    { name: 'Tx: Admin', description: 'Build unsigned transactions for admin operations (validators, settings, pause)' },
    { name: 'Tx: Operator', description: 'Build unsigned transactions for operator operations (finalize, sync, lease)' },
    { name: 'Broadcast', description: 'Broadcast signed transactions and check status' },
  ],

  // ===========================================================================
  // PATHS
  // ===========================================================================
  paths: {
    // =========================================================================
    // Part 1: Indexed data (GET)
    // =========================================================================
    '/protocol/snapshot': {
      get: {
        tags: ['Protocol'],
        summary: 'Get latest protocol snapshot',
        description: 'Returns the most recent indexed snapshot of the protocol state.',
        responses: {
          '200': { description: 'Latest snapshot', content: { 'application/json': { schema: { $ref: '#/components/schemas/ProtocolSnapshot' } } } },
          '404': { description: 'No snapshots yet', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/protocol/snapshots': {
      get: {
        tags: ['Protocol'],
        summary: 'Get protocol snapshot history',
        parameters: [{ name: 'limit', in: 'query', schema: { type: 'integer', default: 100, minimum: 1, maximum: 1000 } }],
        responses: { '200': { description: 'Array of snapshots', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/ProtocolSnapshot' } } } } } },
      },
    },
    '/deposits/{address}': {
      get: {
        tags: ['Deposits'],
        summary: 'Get deposits by address',
        parameters: [
          { name: 'address', in: 'path', required: true, schema: { type: 'string' }, description: 'DCC address' },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } },
        ],
        responses: { '200': { description: 'Deposits', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Deposit' } } } } } },
      },
    },
    '/withdrawals/{address}': {
      get: {
        tags: ['Withdrawals'],
        summary: 'Get withdrawals by address',
        parameters: [
          { name: 'address', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } },
        ],
        responses: { '200': { description: 'Withdrawals', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Withdrawal' } } } } } },
      },
    },
    '/withdrawals/pending/all': {
      get: {
        tags: ['Withdrawals'],
        summary: 'Get all pending withdrawals',
        description: 'Returns all withdrawal requests in PENDING status awaiting operator finalization.',
        responses: { '200': { description: 'Pending withdrawals', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Withdrawal' } } } } } },
      },
    },
    '/rewards': {
      get: {
        tags: ['Rewards'],
        summary: 'Get reward sync history',
        parameters: [{ name: 'limit', in: 'query', schema: { type: 'integer', default: 100 } }],
        responses: { '200': { description: 'Rewards', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/RewardSync' } } } } } },
      },
    },
    '/users/{address}': {
      get: {
        tags: ['Users'],
        summary: 'Get user details (indexed)',
        parameters: [{ name: 'address', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'User', content: { 'application/json': { schema: { $ref: '#/components/schemas/UserIndexed' } } } },
          '404': { description: 'Not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/users': {
      get: {
        tags: ['Users'],
        summary: 'Get top users',
        parameters: [{ name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } }],
        responses: { '200': { description: 'Users', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/UserIndexed' } } } } } },
      },
    },
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Health check',
        responses: {
          '200': { description: 'Healthy', content: { 'application/json': { schema: { $ref: '#/components/schemas/Health' } } } },
          '500': { description: 'Unhealthy', content: { 'application/json': { schema: { $ref: '#/components/schemas/Health' } } } },
        },
      },
    },

    // =========================================================================
    // Part 2: Live chain reads (GET)
    // =========================================================================
    '/chain/protocol': {
      get: {
        tags: ['Chain'],
        summary: 'Live protocol state from chain',
        description: 'Fetches current protocol state directly from the DCC blockchain (not cached). Includes admin, operator, treasury, fee config, TVL, exchange rate, and all accounting totals.',
        responses: {
          '200': { description: 'Live protocol state', content: { 'application/json': { schema: { $ref: '#/components/schemas/ProtocolStateLive' } } } },
          '502': { description: 'Node unreachable', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/chain/exchange-rate': {
      get: {
        tags: ['Chain'],
        summary: 'Live exchange rate',
        description: 'Returns the current DCC-per-stDCC exchange rate directly from on-chain data.',
        responses: {
          '200': { description: 'Exchange rate', content: { 'application/json': { schema: { $ref: '#/components/schemas/ExchangeRate' } } } },
          '502': { description: 'Node unreachable', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/chain/validators': {
      get: {
        tags: ['Chain'],
        summary: 'List all validators (live)',
        description: 'Returns all registered validators with their current state from the blockchain.',
        responses: {
          '200': { description: 'Validators', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/ValidatorState' } } } } },
          '502': { description: 'Node unreachable', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/chain/validators/{address}': {
      get: {
        tags: ['Chain'],
        summary: 'Get single validator (live)',
        parameters: [{ name: 'address', in: 'path', required: true, schema: { type: 'string' }, description: 'Validator DCC address' }],
        responses: {
          '200': { description: 'Validator state', content: { 'application/json': { schema: { $ref: '#/components/schemas/ValidatorState' } } } },
          '400': { description: 'Invalid address', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '404': { description: 'Validator not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/chain/users/{address}': {
      get: {
        tags: ['Chain'],
        summary: 'Get user state (live)',
        description: 'Returns live on-chain user state including stDCC balance, locked shares, and estimated DCC value.',
        parameters: [{ name: 'address', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'User state', content: { 'application/json': { schema: { $ref: '#/components/schemas/UserStateLive' } } } },
          '400': { description: 'Invalid address', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/chain/withdrawals/{requestId}': {
      get: {
        tags: ['Chain'],
        summary: 'Get withdrawal request (live)',
        description: 'Fetches a single withdrawal request by ID directly from chain state.',
        parameters: [{ name: 'requestId', in: 'path', required: true, schema: { type: 'string' }, description: 'Numeric withdrawal request ID' }],
        responses: {
          '200': { description: 'Withdrawal request', content: { 'application/json': { schema: { $ref: '#/components/schemas/WithdrawalRequest' } } } },
          '400': { description: 'Invalid ID', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '404': { description: 'Not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/chain/balance/{address}': {
      get: {
        tags: ['Chain'],
        summary: 'Get DCC balance',
        description: 'Returns native DCC balance (available, regular, effective) for any address.',
        parameters: [{ name: 'address', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Balance', content: { 'application/json': { schema: { $ref: '#/components/schemas/Balance' } } } },
          '400': { description: 'Invalid address', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/chain/height': {
      get: {
        tags: ['Chain'],
        summary: 'Get blockchain height',
        description: 'Returns the current block height of the DCC network.',
        responses: { '200': { description: 'Height', content: { 'application/json': { schema: { type: 'object', properties: { height: { type: 'integer' } } } } } } },
      },
    },

    // =========================================================================
    // Part 3: Estimators (POST)
    // =========================================================================
    '/estimate/deposit': {
      post: {
        tags: ['Estimate'],
        summary: 'Estimate deposit outcome',
        description: 'Calculates how many stDCC shares a user would receive for a given DCC deposit amount, using the current on-chain exchange rate. Does not create a transaction.',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/DepositEstimateRequest' } } } },
        responses: { '200': { description: 'Estimation result', content: { 'application/json': { schema: { $ref: '#/components/schemas/DepositEstimateResponse' } } } } },
      },
    },
    '/estimate/withdraw': {
      post: {
        tags: ['Estimate'],
        summary: 'Estimate withdrawal outcome',
        description: 'Calculates how much DCC a user would receive for burning a given number of stDCC shares.',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/WithdrawEstimateRequest' } } } },
        responses: { '200': { description: 'Estimation result', content: { 'application/json': { schema: { $ref: '#/components/schemas/WithdrawEstimateResponse' } } } } },
      },
    },
    '/estimate/reward-fee': {
      post: {
        tags: ['Estimate'],
        summary: 'Estimate protocol fee on rewards',
        description: 'Calculates the protocol fee and net reward for a given gross reward amount.',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/RewardFeeRequest' } } } },
        responses: { '200': { description: 'Fee breakdown', content: { 'application/json': { schema: { $ref: '#/components/schemas/RewardFeeResponse' } } } } },
      },
    },

    // =========================================================================
    // Part 4a: User tx builders (POST)
    // =========================================================================
    '/tx/build/deposit': {
      post: {
        tags: ['Tx: User'],
        summary: 'Build deposit transaction',
        description: 'Returns an unsigned InvokeScript transaction to deposit DCC and receive stDCC. Sign this with your wallet and broadcast via /tx/broadcast.',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['amount'], properties: { amount: { type: 'string', description: 'DCC amount in wavelets (1 DCC = 100000000)' } } } } } },
        responses: { '200': { description: 'Unsigned transaction', content: { 'application/json': { schema: { $ref: '#/components/schemas/UnsignedTx' } } } } },
      },
    },
    '/tx/build/request-withdraw': {
      post: {
        tags: ['Tx: User'],
        summary: 'Build request-withdraw transaction',
        description: 'Returns an unsigned InvokeScript transaction to burn stDCC shares and create a withdrawal request. The request enters PENDING status until the operator finalizes it.',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['shares'], properties: { shares: { type: 'string', description: 'stDCC shares in wavelets' } } } } } },
        responses: { '200': { description: 'Unsigned transaction', content: { 'application/json': { schema: { $ref: '#/components/schemas/UnsignedTx' } } } } },
      },
    },
    '/tx/build/claim-withdraw': {
      post: {
        tags: ['Tx: User'],
        summary: 'Build claim-withdraw transaction',
        description: 'Returns an unsigned InvokeScript transaction to claim DCC from a finalized withdrawal request. Only the original requestor can claim.',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['requestId'], properties: { requestId: { type: 'string', description: 'Withdrawal request ID' } } } } } },
        responses: { '200': { description: 'Unsigned transaction', content: { 'application/json': { schema: { $ref: '#/components/schemas/UnsignedTx' } } } } },
      },
    },

    // =========================================================================
    // Part 4b: Admin tx builders (POST)
    // =========================================================================
    '/tx/build/admin/add-validator': {
      post: {
        tags: ['Tx: Admin'],
        summary: 'Build add-validator transaction',
        description: 'Returns an unsigned tx to register a new validator. Admin only.',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['validatorAddress', 'weightBps'], properties: { validatorAddress: { type: 'string', description: 'Validator DCC address' }, weightBps: { type: 'integer', minimum: 0, maximum: 10000, description: 'Reward weight in basis points' } } } } } },
        responses: { '200': { description: 'Unsigned transaction', content: { 'application/json': { schema: { $ref: '#/components/schemas/UnsignedTx' } } } } },
      },
    },
    '/tx/build/admin/update-validator': {
      post: {
        tags: ['Tx: Admin'],
        summary: 'Build update-validator transaction',
        description: 'Returns an unsigned tx to update a validator\'s enabled status and weight. Admin only.',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['validatorAddress', 'enabled', 'weightBps'], properties: { validatorAddress: { type: 'string' }, enabled: { type: 'boolean' }, weightBps: { type: 'integer', minimum: 0, maximum: 10000 } } } } } },
        responses: { '200': { description: 'Unsigned transaction', content: { 'application/json': { schema: { $ref: '#/components/schemas/UnsignedTx' } } } } },
      },
    },
    '/tx/build/admin/remove-validator': {
      post: {
        tags: ['Tx: Admin'],
        summary: 'Build remove-validator transaction',
        description: 'Returns an unsigned tx to remove a validator (must have no active leases). Admin only.',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['validatorAddress'], properties: { validatorAddress: { type: 'string' } } } } } },
        responses: { '200': { description: 'Unsigned transaction', content: { 'application/json': { schema: { $ref: '#/components/schemas/UnsignedTx' } } } } },
      },
    },
    '/tx/build/admin/set-treasury': {
      post: {
        tags: ['Tx: Admin'],
        summary: 'Build set-treasury transaction',
        description: 'Returns an unsigned tx to set the treasury address (receives protocol fees). Admin only.',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['address'], properties: { address: { type: 'string' } } } } } },
        responses: { '200': { description: 'Unsigned transaction', content: { 'application/json': { schema: { $ref: '#/components/schemas/UnsignedTx' } } } } },
      },
    },
    '/tx/build/admin/set-fee': {
      post: {
        tags: ['Tx: Admin'],
        summary: 'Build set-protocol-fee transaction',
        description: 'Returns an unsigned tx to update the protocol fee (0-5000 bps = 0-50%). Admin only.',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['feeBps'], properties: { feeBps: { type: 'integer', minimum: 0, maximum: 5000, description: 'Fee in basis points (100 = 1%)' } } } } } },
        responses: { '200': { description: 'Unsigned transaction', content: { 'application/json': { schema: { $ref: '#/components/schemas/UnsignedTx' } } } } },
      },
    },
    '/tx/build/admin/set-operator': {
      post: {
        tags: ['Tx: Admin'],
        summary: 'Build set-operator transaction',
        description: 'Returns an unsigned tx to transfer the operator role to a new address. Admin only.',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['address'], properties: { address: { type: 'string' } } } } } },
        responses: { '200': { description: 'Unsigned transaction', content: { 'application/json': { schema: { $ref: '#/components/schemas/UnsignedTx' } } } } },
      },
    },
    '/tx/build/admin/set-guardian': {
      post: {
        tags: ['Tx: Admin'],
        summary: 'Build set-guardian transaction',
        description: 'Returns an unsigned tx to set the guardian address (can pause protocol). Admin only.',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['address'], properties: { address: { type: 'string' } } } } } },
        responses: { '200': { description: 'Unsigned transaction', content: { 'application/json': { schema: { $ref: '#/components/schemas/UnsignedTx' } } } } },
      },
    },
    '/tx/build/admin/set-min-deposit': {
      post: {
        tags: ['Tx: Admin'],
        summary: 'Build set-min-deposit transaction',
        description: 'Returns an unsigned tx to update the minimum deposit amount. Admin only.',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['amount'], properties: { amount: { type: 'string', description: 'Min deposit in wavelets' } } } } } },
        responses: { '200': { description: 'Unsigned transaction', content: { 'application/json': { schema: { $ref: '#/components/schemas/UnsignedTx' } } } } },
      },
    },
    '/tx/build/admin/set-min-withdraw-shares': {
      post: {
        tags: ['Tx: Admin'],
        summary: 'Build set-min-withdraw-shares transaction',
        description: 'Returns an unsigned tx to update the minimum withdrawal shares. Admin only.',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['amount'], properties: { amount: { type: 'string', description: 'Min shares in wavelets' } } } } } },
        responses: { '200': { description: 'Unsigned transaction', content: { 'application/json': { schema: { $ref: '#/components/schemas/UnsignedTx' } } } } },
      },
    },
    '/tx/build/admin/pause': {
      post: {
        tags: ['Tx: Admin'],
        summary: 'Build pause transaction',
        description: 'Returns an unsigned tx to pause the protocol (disables deposits, withdrawals, reward syncs). Admin or Guardian.',
        responses: { '200': { description: 'Unsigned transaction', content: { 'application/json': { schema: { $ref: '#/components/schemas/UnsignedTx' } } } } },
      },
    },
    '/tx/build/admin/unpause': {
      post: {
        tags: ['Tx: Admin'],
        summary: 'Build unpause transaction',
        description: 'Returns an unsigned tx to unpause the protocol. Admin only.',
        responses: { '200': { description: 'Unsigned transaction', content: { 'application/json': { schema: { $ref: '#/components/schemas/UnsignedTx' } } } } },
      },
    },
    '/tx/build/admin/emergency': {
      post: {
        tags: ['Tx: Admin'],
        summary: 'Build emergency-mode transaction',
        description: 'Returns an unsigned tx to enable/disable emergency mode (also pauses when enabled). Admin only.',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['enable'], properties: { enable: { type: 'boolean' } } } } } },
        responses: { '200': { description: 'Unsigned transaction', content: { 'application/json': { schema: { $ref: '#/components/schemas/UnsignedTx' } } } } },
      },
    },
    '/tx/build/admin/transfer-admin': {
      post: {
        tags: ['Tx: Admin'],
        summary: 'Build transfer-admin transaction',
        description: 'Returns an unsigned tx to transfer the admin role to a new address. Admin only. Irreversible.',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['newAdmin'], properties: { newAdmin: { type: 'string' } } } } } },
        responses: { '200': { description: 'Unsigned transaction', content: { 'application/json': { schema: { $ref: '#/components/schemas/UnsignedTx' } } } } },
      },
    },

    // =========================================================================
    // Part 4c: Operator tx builders (POST)
    // =========================================================================
    '/tx/build/operator/finalize-withdraw': {
      post: {
        tags: ['Tx: Operator'],
        summary: 'Build finalize-withdraw transaction',
        description: 'Returns an unsigned tx to finalize a pending withdrawal request. Moves DCC from pending to claimable. Operator only.',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['requestId'], properties: { requestId: { type: 'string' } } } } } },
        responses: { '200': { description: 'Unsigned transaction', content: { 'application/json': { schema: { $ref: '#/components/schemas/UnsignedTx' } } } } },
      },
    },
    '/tx/build/operator/sync-rewards': {
      post: {
        tags: ['Tx: Operator'],
        summary: 'Build sync-rewards transaction',
        description: 'Returns an unsigned tx to sync staking rewards. Increases totalPooledDcc (net of protocol fee), raises exchange rate. Operator only.',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['rewardAmount'], properties: { rewardAmount: { type: 'string', description: 'Gross reward in wavelets' } } } } } },
        responses: { '200': { description: 'Unsigned transaction', content: { 'application/json': { schema: { $ref: '#/components/schemas/UnsignedTx' } } } } },
      },
    },
    '/tx/build/operator/record-lease': {
      post: {
        tags: ['Tx: Operator'],
        summary: 'Build record-lease transaction',
        description: 'Returns an unsigned tx to record a lease to a validator. Moves DCC from liquid to leased pool. Operator only.',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['validatorAddress', 'amount', 'leaseId'], properties: { validatorAddress: { type: 'string' }, amount: { type: 'string', description: 'Lease amount in wavelets' }, leaseId: { type: 'string', description: 'Lease transaction ID' } } } } } },
        responses: { '200': { description: 'Unsigned transaction', content: { 'application/json': { schema: { $ref: '#/components/schemas/UnsignedTx' } } } } },
      },
    },
    '/tx/build/operator/record-lease-cancel': {
      post: {
        tags: ['Tx: Operator'],
        summary: 'Build record-lease-cancel transaction',
        description: 'Returns an unsigned tx to record a lease cancellation. Moves DCC from leased back to liquid pool. Operator only.',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['validatorAddress', 'amount'], properties: { validatorAddress: { type: 'string' }, amount: { type: 'string', description: 'Cancel amount in wavelets' } } } } } },
        responses: { '200': { description: 'Unsigned transaction', content: { 'application/json': { schema: { $ref: '#/components/schemas/UnsignedTx' } } } } },
      },
    },

    // =========================================================================
    // Part 5: Transaction broadcast and status
    // =========================================================================
    '/tx/broadcast': {
      post: {
        tags: ['Broadcast'],
        summary: 'Broadcast signed transaction',
        description: 'Submits a signed transaction to the DCC network for inclusion in the blockchain. The transaction must be signed with the appropriate private key before broadcasting.',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/SignedTx' } } } },
        responses: {
          '200': { description: 'Transaction accepted', content: { 'application/json': { schema: { type: 'object', properties: { id: { type: 'string' }, type: { type: 'integer' } } } } } },
          '400': { description: 'Invalid or rejected transaction', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/tx/status/{txId}': {
      get: {
        tags: ['Broadcast'],
        summary: 'Check transaction status',
        description: 'Checks if a transaction has been confirmed on-chain. Waits up to 5 seconds for confirmation.',
        parameters: [{ name: 'txId', in: 'path', required: true, schema: { type: 'string' }, description: 'Transaction ID (base58)' }],
        responses: {
          '200': { description: 'Transaction found and confirmed', content: { 'application/json': { schema: { type: 'object' } } } },
          '400': { description: 'Invalid tx ID', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '404': { description: 'Not found or not confirmed', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
  },

  // ===========================================================================
  // SCHEMAS
  // ===========================================================================
  components: {
    schemas: {
      Error: {
        type: 'object',
        properties: { error: { type: 'string' } },
      },
      ProtocolSnapshot: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          height: { type: 'integer' },
          timestamp: { type: 'string', format: 'date-time' },
          totalPooledDcc: { type: 'string' },
          totalShares: { type: 'string' },
          exchangeRate: { type: 'string' },
          totalLeasedDcc: { type: 'string' },
          totalLiquidDcc: { type: 'string' },
          totalClaimableDcc: { type: 'string' },
          totalPendingWithdrawDcc: { type: 'string' },
          totalProtocolFeesDcc: { type: 'string' },
          validatorCount: { type: 'integer' },
          protocolFeeBps: { type: 'integer' },
        },
      },
      Deposit: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          txId: { type: 'string' },
          address: { type: 'string' },
          amount: { type: 'string' },
          sharesMinted: { type: 'string' },
          height: { type: 'integer' },
          timestamp: { type: 'string', format: 'date-time' },
        },
      },
      Withdrawal: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          requestId: { type: 'string' },
          txId: { type: 'string' },
          address: { type: 'string' },
          sharesBurned: { type: 'string' },
          dccEstimate: { type: 'string' },
          dccFinal: { type: 'string' },
          status: { type: 'string', enum: ['pending', 'finalized', 'claimed', 'cancelled'] },
          createdAt: { type: 'integer' },
          finalizedAt: { type: 'integer' },
          claimedAt: { type: 'integer' },
        },
      },
      RewardSync: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          txId: { type: 'string' },
          rewardAmount: { type: 'string' },
          feeAmount: { type: 'string' },
          netReward: { type: 'string' },
          height: { type: 'integer' },
          timestamp: { type: 'string', format: 'date-time' },
        },
      },
      UserIndexed: {
        type: 'object',
        properties: {
          address: { type: 'string' },
          totalDeposited: { type: 'string' },
          totalWithdrawn: { type: 'string' },
          currentShares: { type: 'string' },
          depositCount: { type: 'integer' },
          withdrawCount: { type: 'integer' },
        },
      },
      Health: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['ok', 'error'] },
          lastIndexedHeight: { type: 'integer' },
          error: { type: 'string' },
        },
      },
      ProtocolStateLive: {
        type: 'object',
        description: 'Full protocol state fetched live from the DCC blockchain',
        properties: {
          admin: { type: 'string' },
          operator: { type: 'string' },
          guardian: { type: 'string' },
          paused: { type: 'boolean' },
          emergencyMode: { type: 'boolean' },
          stDccAssetId: { type: 'string' },
          treasury: { type: 'string' },
          protocolFeeBps: { type: 'integer' },
          totalPooledDcc: { type: 'string' },
          totalShares: { type: 'string' },
          totalLeasedDcc: { type: 'string' },
          totalLiquidDcc: { type: 'string' },
          totalClaimableDcc: { type: 'string' },
          totalPendingWithdrawDcc: { type: 'string' },
          totalProtocolFeesDcc: { type: 'string' },
          validatorCount: { type: 'integer' },
          withdrawNonce: { type: 'integer' },
          lastRewardSyncHeight: { type: 'integer' },
          lastRewardSyncTs: { type: 'integer' },
          minDepositDcc: { type: 'string' },
          minWithdrawShares: { type: 'string' },
          exchangeRate: { type: 'string' },
        },
      },
      ExchangeRate: {
        type: 'object',
        properties: {
          exchangeRate: { type: 'string', description: 'Raw rate in wavelets (8 decimals)' },
          dccPerStDcc: { type: 'number', description: 'Human-readable DCC per 1 stDCC' },
          totalPooledDcc: { type: 'string' },
          totalShares: { type: 'string' },
        },
      },
      ValidatorState: {
        type: 'object',
        properties: {
          address: { type: 'string' },
          exists: { type: 'boolean' },
          enabled: { type: 'boolean' },
          weightBps: { type: 'integer', description: 'Reward weight (0-10000 bps)' },
          leasedDcc: { type: 'string' },
          lastLeaseId: { type: 'string' },
          lastSyncHeight: { type: 'integer' },
        },
      },
      UserStateLive: {
        type: 'object',
        properties: {
          address: { type: 'string' },
          stDccBalance: { type: 'string' },
          sharesLocked: { type: 'string' },
          withdrawCount: { type: 'integer' },
          estimatedDccValue: { type: 'string' },
        },
      },
      WithdrawalRequest: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          owner: { type: 'string' },
          shares: { type: 'string' },
          dccEstimate: { type: 'string' },
          dccFinal: { type: 'string' },
          status: { type: 'integer', description: '0=pending, 1=finalized, 2=claimed, 3=cancelled' },
          createdAt: { type: 'integer' },
          finalizedAt: { type: 'integer' },
          claimedAt: { type: 'integer' },
        },
      },
      Balance: {
        type: 'object',
        properties: {
          address: { type: 'string' },
          available: { type: 'string', description: 'Available DCC balance (wavelets)' },
          regular: { type: 'string', description: 'Regular balance' },
          effective: { type: 'string', description: 'Effective balance (includes leased-in)' },
        },
      },
      DepositEstimateRequest: {
        type: 'object',
        required: ['amount'],
        properties: { amount: { type: 'string', description: 'DCC amount in wavelets (1 DCC = 100000000)' } },
      },
      DepositEstimateResponse: {
        type: 'object',
        properties: {
          depositAmount: { type: 'string' },
          sharesToReceive: { type: 'string' },
          exchangeRate: { type: 'string' },
          dccPerStDcc: { type: 'number' },
          minDeposit: { type: 'string' },
          protocolPaused: { type: 'boolean' },
        },
      },
      WithdrawEstimateRequest: {
        type: 'object',
        required: ['shares'],
        properties: { shares: { type: 'string', description: 'stDCC shares in wavelets' } },
      },
      WithdrawEstimateResponse: {
        type: 'object',
        properties: {
          sharesToBurn: { type: 'string' },
          dccToReceive: { type: 'string' },
          exchangeRate: { type: 'string' },
          dccPerStDcc: { type: 'number' },
          minWithdrawShares: { type: 'string' },
          protocolPaused: { type: 'boolean' },
        },
      },
      RewardFeeRequest: {
        type: 'object',
        required: ['rewardAmount'],
        properties: { rewardAmount: { type: 'string', description: 'Gross reward in wavelets' } },
      },
      RewardFeeResponse: {
        type: 'object',
        properties: {
          grossReward: { type: 'string' },
          protocolFeeBps: { type: 'integer' },
          feeAmount: { type: 'string' },
          netReward: { type: 'string' },
        },
      },
      UnsignedTx: {
        type: 'object',
        description: 'Unsigned InvokeScript transaction parameters. Sign with your wallet then POST to /tx/broadcast.',
        properties: {
          type: { type: 'string', example: 'invokeScript' },
          tx: {
            type: 'object',
            properties: {
              dApp: { type: 'string', description: 'dApp contract address' },
              call: {
                type: 'object',
                properties: {
                  function: { type: 'string', description: 'Smart contract function name' },
                  args: { type: 'array', items: { type: 'object', properties: { type: { type: 'string' }, value: {} } } },
                },
              },
              payment: { type: 'array', items: { type: 'object', properties: { amount: { type: 'integer' }, assetId: { type: 'string', nullable: true } } } },
              chainId: { type: 'string' },
              fee: { type: 'integer' },
            },
          },
        },
      },
      SignedTx: {
        type: 'object',
        description: 'A signed transaction object ready for broadcast. Must include type, id, senderPublicKey, proofs, and all transaction-specific fields.',
        properties: {
          type: { type: 'integer', description: 'Transaction type ID (16 for InvokeScript)' },
          id: { type: 'string' },
          senderPublicKey: { type: 'string' },
          proofs: { type: 'array', items: { type: 'string' } },
        },
      },
    },
  },
};
