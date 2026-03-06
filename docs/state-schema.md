# DCC Liquid Staking Protocol — State Schema

## Overview

All on-chain state is stored as deterministic, prefixed key-value pairs in the dApp's data storage. This document is the single source of truth for key naming conventions.

## Key Naming Convention

- All keys use `snake_case`
- Composite keys use `:` as separator
- Prefixes denote entity type: `validator:`, `user:`, `withdraw:`
- No dynamic user input appears in key names without sanitization

## Global Protocol State

| Key | Type | Description |
|-----|------|-------------|
| `admin` | String | Address of protocol admin |
| `operator` | String | Address of operator account |
| `guardian` | String | Address of guardian (Phase 2) |
| `paused` | Boolean | Protocol pause state |
| `emergency_mode` | Boolean | Emergency mode flag |
| `stdcc_asset_id` | String | Asset ID of stDCC token |
| `treasury` | String | Address receiving protocol fees |
| `protocol_fee_bps` | Integer | Protocol fee in basis points (0-10000) |
| `total_pooled_dcc` | Integer | Total DCC under protocol control (wavelets) |
| `total_shares` | Integer | Total stDCC shares outstanding |
| `total_leased_dcc` | Integer | DCC currently leased to validators |
| `total_liquid_dcc` | Integer | DCC available in dApp balance (not leased) |
| `total_claimable_dcc` | Integer | DCC finalized and awaiting user claim |
| `total_pending_withdraw_dcc` | Integer | DCC estimated for pending (unfinalized) withdrawals |
| `total_protocol_fees_dcc` | Integer | Cumulative protocol fees collected |
| `validator_count` | Integer | Number of registered validators |
| `withdraw_nonce` | Integer | Monotonic counter for withdrawal request IDs |
| `last_reward_sync_height` | Integer | Block height of last reward sync |
| `last_reward_sync_ts` | Integer | Timestamp of last reward sync |
| `min_deposit_dcc` | Integer | Minimum deposit in wavelets (default: 100000000 = 1 DCC) |
| `min_withdraw_shares` | Integer | Minimum withdrawal in stDCC units |

## Validator State

All validator keys are prefixed with `validator:{address}:`.

| Key | Type | Description |
|-----|------|-------------|
| `validator:{addr}:exists` | Boolean | Validator registration flag |
| `validator:{addr}:enabled` | Boolean | Whether validator is eligible for leasing |
| `validator:{addr}:weight_bps` | Integer | Validator weight in basis points |
| `validator:{addr}:leased_dcc` | Integer | DCC currently leased to this validator |
| `validator:{addr}:last_lease_id` | String | Lease transaction ID for cancel operations |
| `validator:{addr}:last_sync_height` | Integer | Last block height synced for this validator |

### Validator Address List

Validators are stored in an indexed list for enumeration:
| Key | Type | Description |
|-----|------|-------------|
| `validator_idx:{n}` | String | Address of validator at index n (0-based) |

## User State

| Key | Type | Description |
|-----|------|-------------|
| `user:{addr}:shares_locked` | Integer | stDCC shares locked in pending withdrawals |
| `user:{addr}:withdraw_count` | Integer | Number of withdrawal requests by user |

## Withdrawal Request State

Each withdrawal request has a unique ID: `{nonce}` (monotonic integer, stored as string in keys).

| Key | Type | Description |
|-----|------|-------------|
| `withdraw:{id}:owner` | String | Address of withdrawal requester |
| `withdraw:{id}:shares` | Integer | Number of stDCC shares being redeemed |
| `withdraw:{id}:dcc_estimate` | Integer | Estimated DCC at time of request |
| `withdraw:{id}:dcc_final` | Integer | Final DCC amount after finalization |
| `withdraw:{id}:status` | Integer | 0=pending, 1=finalized, 2=claimed, 3=cancelled |
| `withdraw:{id}:created_at` | Integer | Block height when request was created |
| `withdraw:{id}:finalized_at` | Integer | Block height when finalized (0 if not) |
| `withdraw:{id}:claimed_at` | Integer | Block height when claimed (0 if not) |

### Status Enum

| Value | Name | Description |
|-------|------|-------------|
| 0 | PENDING | Request created, awaiting finalization |
| 1 | FINALIZED | Operator confirmed, DCC reserved for claim |
| 2 | CLAIMED | User has claimed DCC |
| 3 | CANCELLED | Request cancelled (future use) |

## Event Data Entries

For indexer consumption, transient event entries are written with height-tagged keys:

| Pattern | Description |
|---------|-------------|
| `evt_deposit:{height}:{txId}` | Deposit event: `{address},{amount},{shares}` |
| `evt_withdraw_req:{height}:{txId}` | Withdrawal request event |
| `evt_withdraw_fin:{height}:{txId}` | Withdrawal finalized event |
| `evt_withdraw_claim:{height}:{txId}` | Withdrawal claimed event |
| `evt_reward_sync:{height}:{txId}` | Reward sync event |

## Collision Safety

- All key prefixes are unique and non-overlapping
- User/validator addresses are base58-encoded, no `:` characters
- Withdrawal IDs are monotonic integers, no collision possible
- Event keys include block height and txId for uniqueness

## Invariant Relationships

```
total_pooled_dcc = total_liquid_dcc + total_leased_dcc + total_claimable_dcc
total_liquid_dcc = wavesBalance(dApp).available - total_claimable_dcc
total_shares = assetInfo(stdcc_asset_id).quantity (after burns/reissues)
sum(validator[*].leased_dcc) = total_leased_dcc
sum(withdraw[status=0].dcc_estimate) ≈ total_pending_withdraw_dcc
sum(withdraw[status=1].dcc_final) = total_claimable_dcc
```
