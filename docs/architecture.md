# DCC Liquid Staking Protocol — Architecture

## 1. Overview

The DCC Liquid Staking Protocol enables users to stake DCC (DecentralChain native token) through a pooled staking dApp and receive **stDCC**, a transferable liquid staking receipt token. The protocol leverages DecentralChain's native **Leased Proof of Stake (LPoS)** mechanism to generate staking rewards, which accrue to the protocol and are reflected in a rising **stDCC ↔ DCC exchange rate**.

### Core Value Proposition
- **Liquidity**: stDCC is freely transferable and composable with DeFi protocols.
- **Yield**: Staking rewards are auto-compounded into the exchange rate.
- **Simplicity**: Users deposit DCC, receive stDCC — no lock-up, no rebasing.

## 2. Exchange Rate Model

We use a **shares-based exchange rate model** (not rebasing).

```
exchangeRate = totalPooledDcc / totalShares
```

### Deposit
```
sharesToMint = depositAmount * totalShares / totalPooledDcc
```
Bootstrap case (first deposit): `1 share = 1 DCC` (with minimum seed liquidity).

### Withdrawal
```
dccRedeemable = userShares * totalPooledDcc / totalShares
```

### Rounding
- **Deposits**: round shares DOWN (fewer shares minted → protocol-favorable)
- **Withdrawals**: round DCC DOWN (less DCC returned → protocol-favorable)
- Protocol is always slightly over-collateralized.

### Decimals
- DCC: 8 decimals (100_000_000 wavelets per DCC)
- stDCC: 8 decimals (matches DCC for UX simplicity)
- SHARE_SCALE: not needed separately since stDCC decimals == DCC decimals

## 3. System Components

```
┌─────────────────────────────────────────────────────────────┐
│                   DCC Liquid Staking Protocol                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────┐    ┌──────────────┐    ┌──────────────────┐   │
│  │  Users   │───▶│  Frontend    │───▶│  RIDE dApp       │   │
│  │          │◀───│  (Next.js)   │◀───│  liquid_staking  │   │
│  └──────────┘    └──────────────┘    └────────┬─────────┘   │
│                        │                      │             │
│                        │              ┌───────▼─────────┐   │
│                  ┌─────▼──────┐       │  Validators     │   │
│                  │  SDK       │       │  (LPoS Nodes)   │   │
│                  │  (TS)      │       └─────────────────┘   │
│                  └─────┬──────┘              ▲             │
│                        │                    │             │
│                  ┌─────▼──────┐       ┌─────┴──────┐     │
│                  │  Indexer   │       │  Operator  │     │
│                  │  Service   │       │  Daemon    │     │
│                  └────────────┘       └────────────┘     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 3.1 RIDE dApp (`liquid_staking.ride`)
Single deployable dApp script containing all protocol logic:
- Deposit / mint stDCC
- Withdrawal request / finalize / claim
- Validator management
- Admin controls (pause, emergency, fee, treasury)
- Accounting state management

### 3.2 Frontend (`apps/web`)
Next.js application providing:
- Wallet connection (Keeper, Signer, WavesExchange)
- Deposit/withdraw flows
- Protocol stats dashboard
- Admin panel (role-gated)
- Transaction history

### 3.3 SDK (`packages/sdk`)
TypeScript library wrapping:
- Protocol state readers
- Transaction builders
- Estimation helpers
- Data entry parsers

### 3.4 Indexer (`apps/indexer`)
Backend service that:
- Watches blockchain for protocol-related transactions
- Maintains historical snapshots of protocol state
- Exposes REST API for frontend consumption
- Tracks APY, deposits, withdrawals, validator performance

### 3.5 Operator (`apps/operator`)
Backend daemon responsible for:
- Lease rebalancing across validators
- Reward detection and accounting sync
- Withdrawal queue processing and finalization
- Safety monitoring and alerts

## 4. Transaction Flow

### 4.1 Deposit Flow
```
User → InvokeScript(deposit, payment=[{amount, assetId: DCC}])
  → dApp validates amount ≥ MIN_DEPOSIT
  → dApp calculates shares = mulDivDown(amount, totalShares, totalPooledDcc)
  → dApp reissues stDCC (shares amount)
  → dApp transfers stDCC to caller
  → dApp updates: totalPooledDcc += amount, totalShares += shares
  → dApp writes data entries for indexer
```

### 4.2 Withdrawal Flow
```
Step 1: User → InvokeScript(requestWithdraw, payment=[{shares, assetId: stDCC}])
  → dApp validates shares > 0 and shares ≥ MIN_WITHDRAW_SHARES
  → dApp computes dccEstimate = mulDivDown(shares, totalPooledDcc, totalShares)
  → dApp burns stDCC shares (or holds for burn)
  → dApp creates withdrawal request entry (status=PENDING)
  → dApp updates: totalShares -= shares, totalPendingWithdrawDcc += dccEstimate
  
Step 2: Operator → InvokeScript(finalizeWithdraw, args=[requestId])
  → dApp validates operator role
  → dApp validates sufficient liquid balance
  → dApp marks request status=FINALIZED
  → dApp updates: totalPendingWithdrawDcc -= amount, totalClaimableDcc += amount

Step 3: User → InvokeScript(claimWithdraw, args=[requestId])
  → dApp validates caller == request.owner
  → dApp validates status == FINALIZED
  → dApp transfers DCC to user
  → dApp marks status=CLAIMED
  → dApp updates: totalClaimableDcc -= amount
```

### 4.3 Lease Management Flow
```
Operator (off-chain) reads protocol state
  → Computes idle DCC available for leasing
  → Creates Lease transactions from dApp account to validators
  → Weights leases by validator configuration
  → Updates protocol accounting via syncAccounting()
  
  When withdrawal liquidity needed:
  → Creates LeaseCancel transactions
  → Updates protocol accounting
```

## 5. Access Control Model

| Role       | Permissions |
|------------|-------------|
| **admin**  | Add/remove validators, set fee, set treasury, set operator, pause/unpause, emergency mode |
| **operator** | Finalize withdrawals, sync accounting, trigger lease operations (off-chain) |
| **guardian** | Pause-only emergency stop (optional Phase 2) |
| **user**   | Deposit, request withdrawal, claim withdrawal |

## 6. Fee Model

- Protocol fee expressed in basis points (BPS), max 10000 = 100%
- Fee is extracted during reward sync: `feeAmount = rewardGrowth * protocolFeeBps / 10000`
- Fee DCC is routed to treasury address
- Fee extraction is transparent and auditable via data entries

## 7. Phase Roadmap

### Phase 1 (Current)
- Single validator
- Manual reward sync
- Manual withdrawal finalization
- Admin-controlled operator

### Phase 2
- Multi-validator with weighted leasing
- Automated operator daemon
- Withdrawal queue optimizer
- Guardian role

### Phase 3
- Governance token / voting
- Insurance / slashing reserve
- DeFi integrations (stDCC as collateral, LP pools)

## 8. Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Token model | Exchange rate (not rebase) | Simpler, composable, no wallet-level hooks needed |
| Withdrawal model | Request → Finalize → Claim | Matches LPoS lease cancel settlement period |
| Single dApp vs multi | Single dApp | Simpler accounting, atomic state, lower complexity |
| stDCC implementation | Native asset Issue/Reissue/Burn | Uses DecentralChain native asset primitives |
| Rounding | Always protocol-favorable | Prevents share inflation, maintains solvency |
| Minimum deposit | 1 DCC (100_000_000 wavelets) | Prevents dust attacks and zero-share mints |

## 9. External Dependencies

- DecentralChain Node API (Waves-compatible)
- @waves/waves-transactions (adapted for DCC)
- @waves/signer or Keeper wallet
- PostgreSQL (indexer)
- Node.js runtime (all backend services)
