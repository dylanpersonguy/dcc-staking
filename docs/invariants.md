# Protocol Invariants — DCC Liquid Staking

These invariants **must hold at all times**. A violation of any invariant triggers an
automatic `emergencyMode()` via the operator's safety-checks daemon.

---

## INV-1: Solvency

```
dAppDccBalance + totalLeased >= totalPooledDcc
```

The sum of on-hand DCC and leased-out DCC must always be at least as large as the
total DCC the protocol claims to hold. Violations indicate lost funds or accounting bugs.

---

## INV-2: Share Consistency

```
totalShares == Σ user_{addr}_shares   (for all addresses)
```

The aggregate `total_shares` must equal the sum of all individual user share balances.
This is maintained by deposit/withdraw logic incrementing/decrementing atomically.

---

## INV-3: Monotonic Exchange Rate

```
exchangeRate(t₁) <= exchangeRate(t₂)   for t₁ < t₂   (excluding slashing)
```

The exchange rate (totalPooledDcc / totalShares) must only increase over time as rewards
accrue. A decrease (outside of slashing events) signals a bug or attack.

**Note:** Phase 1 has no slashing, so rate must be strictly non-decreasing.

---

## INV-4: Withdrawal Accounting

```
totalPooledDcc >= totalLeased + totalPendingWithdrawalsDcc
```

The protocol must have enough DCC (leased + on-hand) to cover both leasing obligations
and pending withdrawal amounts. Put differently, pending withdrawals are already subtracted
from the stakeable pool.

---

## INV-5: Balance Coverage

```
dAppDccBalance >= totalPendingWithdrawalsDcc
```

Unlocked (unleased) DCC balance must be sufficient to cover all finalized ("ready")
withdrawal amounts. The lease-rebalance job ensures this by canceling leases as needed.

**Note:** In practice, there may be a brief window between finalization and lease cancellation.
The operator daemon handles this within each cycle.

---

## INV-6: Share Supply = stDCC Supply

```
totalShares == stDccCirculatingSupply
```

Since stDCC is minted/burned atomically with share accounting, the total shares must
match the total circulating supply of the stDCC asset on-chain.

---

## INV-7: Withdrawal State Machine

```
withdraw_{id}_status ∈ { "pending" → "ready" → "claimed" }
```

Withdrawal status transitions are strictly ordered:
- `pending` → `ready` (via `finalizeWithdraw`)
- `ready` → `claimed` (via `claimWithdraw`)

No backwards transitions. No skipping. Once `claimed`, immutable.

---

## INV-8: Non-Negative Totals

```
totalPooledDcc >= 0
totalShares >= 0
totalLeased >= 0
totalPendingWithdrawalsDcc >= 0
```

All protocol aggregate counters must be non-negative. A negative value indicates
underflow, which is a critical bug. RIDE integer operations don't overflow (arbitrary
precision), but subtraction logic must be validated.

---

## INV-9: Validator Weight Conservation

```
Σ validator_{addr}_weight == 10000   (for all active validators)
```

Active validator weights must sum to exactly 10,000 basis points (100%). This ensures
lease allocation distributes 100% of leasable DCC across the validator set.

---

## INV-10: Withdrawal Nonce Monotonicity

```
withdraw_nonce(t₁) < withdraw_nonce(t₂)   for t₁ < t₂
```

The global withdrawal nonce increments by exactly 1 for each new withdrawal request.
It never decreases. This guarantees unique, ordered withdrawal IDs.

---

## Enforcement Strategy

| Invariant | Checked By             | Frequency    | On Violation        |
|-----------|------------------------|-------------|---------------------|
| INV-1     | safety-checks daemon   | Every cycle  | `emergencyMode()`   |
| INV-2     | Indexer reconciliation  | Hourly       | Alert + investigate |
| INV-3     | safety-checks daemon   | Every cycle  | `emergencyMode()`   |
| INV-4     | safety-checks daemon   | Every cycle  | `emergencyMode()`   |
| INV-5     | safety-checks daemon   | Every cycle  | Alert + lease cancel|
| INV-6     | Indexer reconciliation  | Hourly       | Alert + investigate |
| INV-7     | RIDE contract logic     | Every tx     | Tx rejected         |
| INV-8     | RIDE contract logic     | Every tx     | Tx rejected         |
| INV-9     | Admin tooling           | On change    | Reject rebalance    |
| INV-10    | RIDE contract logic     | Every tx     | Tx rejected         |

---

## Invariant Testing

All invariants have corresponding unit tests in `packages/sdk/__tests__/math.test.ts`
and integration tests that validate on-chain state after each operation sequence.
The smoke test (`scripts/smoke-test.ts`) verifies INV-1, INV-3, INV-4, INV-5, and INV-9
against a live deployment.
