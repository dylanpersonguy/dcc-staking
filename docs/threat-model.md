# Threat Model — DCC Liquid Staking Protocol

## 1. Share Inflation / Donation Attack

**Vector:** Attacker deposits a tiny amount to bootstrap the pool (1 wavelet → 1 share),
then transfers a large DCC balance directly to the dApp address. The exchange rate inflates
so the next depositor's `sharesToMint = deposit * 1 / largeBalance` rounds to 0, effectively
stealing their deposit.

**Mitigation:**
- Bootstrap logic: first deposit mints shares 1:1 with no existing pool.
- `deposit()` asserts `sharesToMint > 0` — tx fails if rounding to zero.
- Consider a minimum first-deposit amount (e.g., 1 DCC) enforced at initialization.
- Future: virtual offset (à la ERC-4626) where `totalShares += OFFSET` and
  `totalPooledDcc += OFFSET` to make inflation attacks uneconomical.

**Residual risk:** Low after mitigations. Monitor `exchange_rate` for anomalous jumps.

---

## 2. Rounding Exploits

**Vector:** Repeated small deposits/withdrawals exploit rounding direction asymmetry
to extract fractional wavelets.

**Mitigation:**
- All rounding is **DOWN** (protocol-favorable):
  - `calcSharesFromDeposit` → `mulDivDown` → depositor gets fewer shares.
  - `calcDccFromShares` → `mulDivDown` → withdrawer gets less DCC.
- `minDeposit` and `minWithdrawShares` floor prevents dust-level operations.
- Net effect: each round-trip costs the user ≥ 1 wavelet.

**Residual risk:** Negligible. Rounding favoring protocol is standard.

---

## 3. Double Claim

**Vector:** User calls `claimWithdraw(id)` multiple times for the same withdrawal.

**Mitigation:**
- `claimWithdraw` checks `withdraw_{id}_status == "ready"` and sets it to `"claimed"`.
- Second call fails the status check.
- Withdrawal mapping is immutable after finalization: owner, dccAmount, etc.

**Residual risk:** None — state machine prevents re-entry.

---

## 4. Replay / Front-running

**Vector:** A valid signed InvokeScript is replayed or front-run.

**Mitigation:**
- DCC (Waves-based) transactions have: chain ID, unique tx ID, timestamp, sender proof.
  Replay of the identical tx is rejected by the node as duplicate.
- Front-running: DCC uses LPoS with deterministic block production (not MEV-prone),
  but a producer could theoretically reorder. Impact is limited since:
  - Deposits and withdrawals use real-time exchange rate from state.
  - No slippage beyond the natural rate change between blocks.
- `syncRewards` is operator-only, so external users cannot front-run reward accrual.

**Residual risk:** Minimal. No mempool-style MEV environment.

---

## 5. Stale Rate Abuse

**Vector:** Operator delays `syncRewards` so the exchange rate is stale. A user deposits
at an artificially low rate, then rewards are synced and user gets more than fair share.

**Mitigation:**
- `syncRewards` is called by the operator daemon every cycle (~2 min).
- Future: add an `epochLastSynced` timestamp and reject deposits if stale > N blocks.
- Safety check: operator daemon monitors exchange rate floor invariant.

**Residual risk:** Medium without staleness guard. Operator daemon liveness is critical.

---

## 6. Unauthorized Calls

**Vector:** Non-admin calls `addValidator`, `setTreasury`, etc.

**Mitigation:**
- Every privileged function has `requireAdmin(i)` / `requireOperator(i)` guards.
- `@Verifier` allows all signed tx types (for operational flexibility) but callable
  functions enforce role-based access at the application layer.
- Admin can transfer admin role to a new address (2-step handoff recommended in Phase 3).

**Residual risk:** If admin key is compromised, attacker controls the protocol. → Use multisig.

---

## 7. Validator Misconfiguration

**Vector:** Operator adds a validator that doesn't actually exist or is compromised,
leasing DCC to a non-validating node that pockets rewards.

**Mitigation:**
- Only admin/operator can call `addValidator`.
- Operator daemon validates that node addresses are live validators via node API.
- Safety check compares expected reward yield vs. actual; alerts if divergent.
- `removeValidator` zeroes the weight, and `lease-rebalance` job cancels associated leases.

**Residual risk:** Medium. Requires operational diligence — governance in Phase 3.

---

## 8. Solvency Drift

**Vector:** Over time, accounting (`total_pooled_dcc`, `total_leased`, `total_pending_withdrawals_dcc`)
drifts from actual balances due to bugs, missed events, or uncounted fees.

**Mitigation:**
- `safety-checks` job runs every cycle:
  - **Solvency check:** `dAppBalance + totalLeased >= totalPooledDcc`
  - **Accounting reconciliation:** `totalPooledDcc >= totalLeased + pendingWithdrawals`
  - **Balance coverage:** `dAppBalance >= pendingWithdrawals`
  - **Exchange rate floor:** rate on chain >= last known safe rate.
- On violation → `emergencyMode()` is called, freezing all operations.

**Residual risk:** Low if safety daemon is running. Catastrophic if daemon fails silently.

---

## 9. Key Collisions in Data Entries

**Vector:** Malicious or accidental key overlap between different protocol data entries.

**Mitigation:**
- State schema uses structured prefixes: `validator_{addr}_...`, `withdraw_{id}_...`,
  `user_{addr}_...`, `evt_...`.
- Withdrawal IDs are monotonic nonces (no user-controlled component).
- Validator and user keys are DCC addresses (base58, specific length).
- Collision analysis in `state-schema.md` proves no overlap between prefix families.

**Residual risk:** None for normal inputs. RIDE string keys are exact-match.

---

## 10. Dust Griefing

**Vector:** Attacker creates thousands of tiny withdrawal requests to bloat state
and increase gas costs for `finalizeWithdraw`.

**Mitigation:**
- `minWithdrawShares` floor (default: 0.01 stDCC = 1_000_000 wavelets).
- Each withdrawal request costs the user gas for the InvokeScript.
- `finalizeWithdraw` processes a bounded batch per call (operator-controlled batch size).
- Future: consider a withdrawal fee or cooldown to further disincentivize.

**Residual risk:** Low — attacker pays tx fees for each griefing request.

---

## 11. Locked Funds

**Vector:** User deposits but is unable to withdraw due to protocol pause, emergency,
or all DCC being leased out.

**Mitigation:**
- `pause` prevents new deposits/withdrawals but doesn't affect pending claims.
- `emergencyMode` is one-way; design a recovery/migration path (Phase 3: governance vote).
- `finalizeWithdraw` uses `ensureLiquidity()` in `lease-rebalance` job to cancel enough
  leases to cover pending withdrawals.
- Worst case: operator cancels all leases manually.

**Residual risk:** Medium. Liquidity crunch is possible if all DCC is leased. Operator
must ensure `unleased reserve >= pending withdrawals`.

---

## 12. Pause Bypass

**Vector:** Attacker interacts with protocol functions during paused state.

**Mitigation:**
- `requireActive()` is called at the top of every user-facing function
  (`deposit`, `requestWithdraw`, `claimWithdraw`).
- `syncRewards`, `finalizeWithdraw` also check active status.
- Admin functions (`pause`, `unpause`, `emergencyMode`) bypass this intentionally.

**Residual risk:** None — RIDE enforces at the start of each callable.

---

## 13. Governance Takeover (Phase 3)

**Vector:** In Phase 3 with token governance, an attacker accumulates enough governance
tokens to pass malicious proposals (changing admin, draining treasury, etc.).

**Mitigation (planned):**
- Timelock on governance actions (48–72h delay).
- Guardian role with veto power.
- Quorum + supermajority requirements.
- Emergency guardian can pause before malicious proposal executes.

**Residual risk:** Standard governance attack surface — design carefully in Phase 3.

---

## Risk Summary Matrix

| # | Threat                  | Likelihood | Impact   | Mitigation Status |
|---|------------------------|------------|----------|-------------------|
| 1 | Share inflation         | Low        | Critical | Implemented       |
| 2 | Rounding exploits       | Low        | Low      | Implemented       |
| 3 | Double claim            | None       | High     | Implemented       |
| 4 | Replay / front-running  | Low        | Medium   | Platform-native   |
| 5 | Stale rate abuse        | Medium     | Medium   | Partial           |
| 6 | Unauthorized calls      | Low        | Critical | Implemented       |
| 7 | Validator misconfig     | Medium     | High     | Operational       |
| 8 | Solvency drift          | Low        | Critical | Implemented       |
| 9 | Key collisions          | None       | High     | By design         |
| 10| Dust griefing           | Low        | Low      | Implemented       |
| 11| Locked funds            | Medium     | High     | Partial           |
| 12| Pause bypass            | None       | High     | Implemented       |
| 13| Governance takeover     | Medium     | Critical | Phase 3           |
