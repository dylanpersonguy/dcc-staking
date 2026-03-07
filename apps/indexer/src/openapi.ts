// =============================================================================
// OpenAPI 3.0 Specification — DCC Liquid Staking Indexer API
// =============================================================================

export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'DCC Liquid Staking — Indexer API',
    description:
      'REST API for the DCC Liquid Staking Protocol indexer. Provides read-only access to protocol state, deposits, withdrawals, rewards, and user data indexed from the DecentralChain blockchain.',
    version: '1.0.0',
    contact: {
      name: 'stDCC Protocol',
      url: 'https://github.com/dylanpersonguy/dcc-staking',
    },
  },
  servers: [
    {
      url: '/api',
      description: 'Indexer API (relative)',
    },
  ],
  tags: [
    { name: 'Protocol', description: 'Protocol state and snapshots' },
    { name: 'Deposits', description: 'Deposit history' },
    { name: 'Withdrawals', description: 'Withdrawal requests and status' },
    { name: 'Rewards', description: 'Staking reward history' },
    { name: 'Users', description: 'User accounts and balances' },
    { name: 'Health', description: 'Service health' },
  ],
  paths: {
    '/protocol/snapshot': {
      get: {
        tags: ['Protocol'],
        summary: 'Get latest protocol snapshot',
        description:
          'Returns the most recent indexed snapshot of the protocol state including TVL, exchange rate, shares, and accounting totals.',
        responses: {
          '200': {
            description: 'Latest protocol snapshot',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ProtocolSnapshot' },
              },
            },
          },
          '404': {
            description: 'No snapshots indexed yet',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    '/protocol/snapshots': {
      get: {
        tags: ['Protocol'],
        summary: 'Get protocol snapshot history',
        description: 'Returns historical protocol snapshots in reverse chronological order.',
        parameters: [
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', default: 100, minimum: 1, maximum: 1000 },
            description: 'Maximum number of snapshots to return',
          },
        ],
        responses: {
          '200': {
            description: 'Array of protocol snapshots',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/ProtocolSnapshot' },
                },
              },
            },
          },
        },
      },
    },
    '/deposits/{address}': {
      get: {
        tags: ['Deposits'],
        summary: 'Get deposits by address',
        description: 'Returns deposit history for a specific DCC address.',
        parameters: [
          {
            name: 'address',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'DCC address (e.g. 3DiLy1fwXB84tkjY7TttXyGLdHWb2LYYKsK)',
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', default: 50, minimum: 1, maximum: 500 },
            description: 'Maximum number of deposits to return',
          },
        ],
        responses: {
          '200': {
            description: 'Array of deposits',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Deposit' },
                },
              },
            },
          },
        },
      },
    },
    '/withdrawals/{address}': {
      get: {
        tags: ['Withdrawals'],
        summary: 'Get withdrawals by address',
        description: 'Returns withdrawal request history for a specific DCC address.',
        parameters: [
          {
            name: 'address',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'DCC address',
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', default: 50, minimum: 1, maximum: 500 },
            description: 'Maximum number of withdrawals to return',
          },
        ],
        responses: {
          '200': {
            description: 'Array of withdrawal requests',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Withdrawal' },
                },
              },
            },
          },
        },
      },
    },
    '/withdrawals/pending/all': {
      get: {
        tags: ['Withdrawals'],
        summary: 'Get all pending withdrawals',
        description:
          'Returns all withdrawal requests currently in PENDING status awaiting operator finalization.',
        responses: {
          '200': {
            description: 'Array of pending withdrawal requests',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Withdrawal' },
                },
              },
            },
          },
        },
      },
    },
    '/rewards': {
      get: {
        tags: ['Rewards'],
        summary: 'Get reward sync history',
        description:
          'Returns the history of staking reward syncs recorded by the operator daemon.',
        parameters: [
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', default: 100, minimum: 1, maximum: 1000 },
            description: 'Maximum number of reward events to return',
          },
        ],
        responses: {
          '200': {
            description: 'Array of reward sync events',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/RewardSync' },
                },
              },
            },
          },
        },
      },
    },
    '/users/{address}': {
      get: {
        tags: ['Users'],
        summary: 'Get user details',
        description: 'Returns staking details for a specific user address.',
        parameters: [
          {
            name: 'address',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'DCC address',
          },
        ],
        responses: {
          '200': {
            description: 'User details',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/User' },
              },
            },
          },
          '404': {
            description: 'User not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    '/users': {
      get: {
        tags: ['Users'],
        summary: 'Get top users',
        description: 'Returns users sorted by stDCC holdings.',
        parameters: [
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', default: 50, minimum: 1, maximum: 500 },
            description: 'Maximum number of users to return',
          },
        ],
        responses: {
          '200': {
            description: 'Array of users',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/User' },
                },
              },
            },
          },
        },
      },
    },
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Health check',
        description: 'Returns indexer health status and last indexed block height.',
        responses: {
          '200': {
            description: 'Service is healthy',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Health' },
              },
            },
          },
          '500': {
            description: 'Service is unhealthy',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Health' },
              },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      ProtocolSnapshot: {
        type: 'object',
        properties: {
          id: { type: 'integer', description: 'Snapshot ID' },
          height: { type: 'integer', description: 'Block height at snapshot' },
          timestamp: { type: 'string', format: 'date-time' },
          totalPooledDcc: { type: 'string', description: 'Total DCC in pool (wavelets)' },
          totalShares: { type: 'string', description: 'Total stDCC shares (wavelets)' },
          exchangeRate: { type: 'string', description: 'DCC per stDCC (8 decimals)' },
          totalLeasedDcc: { type: 'string', description: 'DCC leased to validators' },
          totalLiquidDcc: { type: 'string', description: 'Liquid (unleased) DCC' },
          totalClaimableDcc: { type: 'string', description: 'DCC ready to claim' },
          totalPendingWithdrawDcc: { type: 'string', description: 'DCC in pending withdrawals' },
          totalProtocolFeesDcc: { type: 'string', description: 'Accumulated protocol fees' },
          validatorCount: { type: 'integer', description: 'Number of registered validators' },
          protocolFeeBps: { type: 'integer', description: 'Protocol fee in basis points' },
        },
      },
      Deposit: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          txId: { type: 'string', description: 'Transaction ID' },
          address: { type: 'string', description: 'Depositor DCC address' },
          amount: { type: 'string', description: 'DCC deposited (wavelets)' },
          sharesMinted: { type: 'string', description: 'stDCC shares received' },
          height: { type: 'integer', description: 'Block height' },
          timestamp: { type: 'string', format: 'date-time' },
        },
      },
      Withdrawal: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          requestId: { type: 'string', description: 'On-chain withdrawal request ID' },
          txId: { type: 'string', description: 'Transaction ID' },
          address: { type: 'string', description: 'Requester DCC address' },
          sharesBurned: { type: 'string', description: 'stDCC shares burned' },
          dccEstimate: { type: 'string', description: 'Estimated DCC at request time' },
          dccFinal: { type: 'string', description: 'Final DCC amount (after finalization)' },
          status: {
            type: 'string',
            enum: ['pending', 'finalized', 'claimed', 'cancelled'],
            description: 'Withdrawal status',
          },
          createdAt: { type: 'integer', description: 'Block height when created' },
          finalizedAt: { type: 'integer', description: 'Block height when finalized' },
          claimedAt: { type: 'integer', description: 'Block height when claimed' },
        },
      },
      RewardSync: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          txId: { type: 'string', description: 'Transaction ID' },
          rewardAmount: { type: 'string', description: 'Gross reward (wavelets)' },
          feeAmount: { type: 'string', description: 'Protocol fee taken (wavelets)' },
          netReward: { type: 'string', description: 'Net reward added to pool' },
          height: { type: 'integer', description: 'Block height' },
          timestamp: { type: 'string', format: 'date-time' },
        },
      },
      User: {
        type: 'object',
        properties: {
          address: { type: 'string', description: 'DCC address' },
          totalDeposited: { type: 'string', description: 'Cumulative DCC deposited' },
          totalWithdrawn: { type: 'string', description: 'Cumulative DCC withdrawn' },
          currentShares: { type: 'string', description: 'Current stDCC balance' },
          depositCount: { type: 'integer' },
          withdrawCount: { type: 'integer' },
        },
      },
      Health: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['ok', 'error'] },
          lastIndexedHeight: { type: 'integer', description: 'Last processed block height' },
          error: { type: 'string', description: 'Error message (if unhealthy)' },
        },
      },
      Error: {
        type: 'object',
        properties: {
          error: { type: 'string', description: 'Error message' },
        },
      },
    },
  },
};
