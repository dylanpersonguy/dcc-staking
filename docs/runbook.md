# Incident Runbook — DCC Liquid Staking Protocol

## Severity Levels

| Level    | Definition                                          | Response Time |
|----------|-----------------------------------------------------|---------------|
| **SEV-1**| Funds at risk, invariant violation, active exploit   | Immediate     |
| **SEV-2**| Protocol degraded, operator offline, stale rate      | < 30 min      |
| **SEV-3**| Non-critical bug, UI issue, indexer lag              | < 4 hours     |

---

## INC-1: Emergency Mode Triggered

**Severity:** SEV-1

**Symptoms:**
- `status` state key == `"emergency"`
- All user transactions failing with "protocol not active"
- Safety daemon logs: `CRITICAL: Invariant violation detected`

**Immediate Actions:**
1. **Do NOT unpause.** Emergency mode is one-way for a reason.
2. Identify which invariant was violated (check safety daemon logs).
3. Snapshot all state: `GET /addresses/data/{DAPP_ADDRESS}`
4. Snapshot dApp balance: `GET /addresses/balance/{DAPP_ADDRESS}`
5. Compare on-chain state vs. indexer DB for discrepancies.

**Investigation:**
```bash
# Get all state
curl "${NODE_URL}/addresses/data/${DAPP_ADDRESS}" | jq '.' > state_snapshot.json

# Get balance
curl "${NODE_URL}/addresses/balance/${DAPP_ADDRESS}" | jq '.balance'

# Check key metrics
cat state_snapshot.json | jq '[.[] | select(.key | test("total_"))]'
```

**Resolution:**
- If solvency violation: trace all deposits, withdrawals, and reward syncs since last
  known good state. Identify the transaction that caused drift.
- If exchange rate dropped: check for unauthorized `syncRewards` or direct balance transfers.
- Recovery requires a new contract deployment with migration logic (Phase 3 governance).

**Communication:**
- Notify all users via frontend banner and social channels.
- Publish post-mortem within 48 hours.

---

## INC-2: Operator Daemon Offline

**Severity:** SEV-2

**Symptoms:**
- No `syncRewards` transactions for > 10 minutes.
- Pending withdrawals not being finalized.
- Stale exchange rate.
- Alerts from monitoring (e.g., healthcheck failure).

**Immediate Actions:**
1. Check operator process: `systemctl status dcc-operator` / `docker ps`
2. Check operator logs for crash reason.
3. Restart: `systemctl restart dcc-operator`

**Investigation:**
```bash
# Check last reward sync
curl "${NODE_URL}/addresses/data/${DAPP_ADDRESS}?matches=last_reward_height"

# Check current height
curl "${NODE_URL}/blocks/height"

# Gap = current height - last_reward_height
```

**If Restart Fails:**
- Check node connectivity: `curl ${NODE_URL}/node/status`
- Check operator wallet balance (needs DCC for tx fees).
- Check `.env` configuration is correct.
- Run operator manually: `cd apps/operator && npx ts-node src/index.ts`

**Prevention:**
- Process supervisor (systemd, PM2, Docker restart-always).
- Healthcheck endpoint with uptime monitoring (PagerDuty, etc.).
- Redundant operator instance (standby).

---

## INC-3: Exchange Rate Anomaly

**Severity:** SEV-1 if decreasing, SEV-2 if spiking

**Symptoms:**
- Exchange rate dropped below previous value (INV-3 violation).
- Exchange rate jumped significantly in a single block.

**Immediate Actions:**
1. If rate **decreased**: safety daemon should have triggered emergency mode.
   Follow INC-1.
2. If rate **spiked**: check for large direct DCC transfers to dApp address
   (donation attack / share inflation).

**Investigation:**
```bash
# Get rate history from indexer
curl "${INDEXER_URL}/protocol/snapshot" | jq '.exchangeRate'

# Check recent reward syncs
curl "${INDEXER_URL}/rewards?limit=10" | jq '.'

# Check dApp incoming transfers (last 100 txs)
curl "${NODE_URL}/transactions/address/${DAPP_ADDRESS}/limit/100" | jq '.'
```

**Resolution:**
- If donation attack: the protocol's `sharesToMint > 0` check should prevent
  zero-share deposits. If a user was harmed, coordinate off-chain compensation.
- If accounting bug: identify the faulty transaction and patching.

---

## INC-4: Indexer Out of Sync

**Severity:** SEV-3

**Symptoms:**
- Frontend showing stale data.
- Indexer `/health` shows height significantly behind chain.
- API returns outdated protocol stats.

**Immediate Actions:**
1. Check indexer logs for errors.
2. Check PostgreSQL connection.
3. Restart indexer: `systemctl restart dcc-indexer`

**Investigation:**
```bash
# Indexer health
curl "${INDEXER_URL}/health"

# Chain height
curl "${NODE_URL}/blocks/height"

# Indexer height
psql $DATABASE_URL -c "SELECT last_processed_height FROM indexer_state WHERE id = 1;"

# Check for DB errors
psql $DATABASE_URL -c "SELECT count(*) FROM deposits;"
```

**Recovery:**
- If indexer is crashed: restart and it will resume from `last_processed_height`.
- If DB is corrupted: re-run migration (`npx ts-node src/db/migrate.ts`) and
  reindex from genesis or last snapshot.
- Indexer does not affect protocol operations — only the read path / frontend.

---

## INC-5: Lease Imbalance

**Severity:** SEV-2

**Symptoms:**
- `total_leased` doesn't match sum of individual validator lease amounts.
- Pending withdrawals not being finalized due to insufficient unlocked balance.
- DCC balance is low but `total_leased` is high.

**Immediate Actions:**
1. Check lease state: `curl "${NODE_URL}/addresses/data/${DAPP_ADDRESS}?matches=validator_.*_leased"`
2. Check pending withdrawals needing liquidity.
3. Cancel excess leases if needed.

**Investigation:**
```bash
# Sum validator leases
curl "${NODE_URL}/addresses/data/${DAPP_ADDRESS}?matches=validator_.*_leased" | \
  jq '[.[].value] | add'

# Compare with total_leased
curl "${NODE_URL}/addresses/data/${DAPP_ADDRESS}?matches=total_leased" | jq '.'

# Check active leases on chain (if API available)
curl "${NODE_URL}/leasing/active/${DAPP_ADDRESS}" | jq 'length'
```

**Resolution:**
- Operator daemon's `lease-rebalance` job should self-heal within 1-2 cycles.
- If manual intervention needed: use operator wallet to send `recordLeaseCancel`
  transactions for the excess.

---

## INC-6: Admin Key Compromise

**Severity:** SEV-1

**Symptoms:**
- Unexpected `transferAdmin`, `setOperator`, `setTreasury` transactions.
- Validator set changed by unknown party.
- Protocol fees changed to 50% (max).

**Immediate Actions:**
1. If guardian role is set: call `pause()` from guardian address IMMEDIATELY.
2. If not: call `emergencyMode()` from any remaining authorized key.
3. Document all unauthorized transactions.

**Investigation:**
- Trace all admin-role transactions in the last 24 hours.
- Identify the source of the compromise (leaked seed, phishing, etc.).
- Check if attacker changed treasury address (would redirect future fees).

**Resolution:**
- If protocol is paused (not emergency): deploy new contract, migrate state.
- If emergency mode: state is frozen — plan migration.
- Rotate all operational keys.
- Implement multisig for admin role (Phase 3 priority).

**Prevention:**
- Hardware wallet for admin key.
- Multisig (Phase 3).
- Rate-limiting admin actions (timelock).
- Monitor admin txs with real-time alerts.

---

## INC-7: Node RPC Failures

**Severity:** SEV-2

**Symptoms:**
- Operator daemon logging connection errors.
- Indexer failing to poll new blocks.
- Frontend showing "network error".

**Immediate Actions:**
1. Test node directly: `curl ${NODE_URL}/node/status`
2. If node is down: switch to backup node URL.
3. Update `.env` and restart services.

**Backup Nodes:**
```
TESTNET:
  - https://testnode1.decentralchain.io
  - https://testnode2.decentralchain.io

MAINNET:
  - https://mainnode1.decentralchain.io
  - https://mainnode2.decentralchain.io
```

---

## INC-8: Frontend Down

**Severity:** SEV-3

**Symptoms:**
- Users report blank page or errors.
- Vercel/hosting dashboard shows deployment failure.

**Immediate Actions:**
1. Check hosting provider status page.
2. Check build logs for errors.
3. Rollback to last known good deployment.

**Note:** Frontend being down does NOT affect protocol operations. Users can interact
directly with the dApp via node API or CLI tools.

---

## Post-Incident Checklist

- [ ] Incident documented with timeline
- [ ] Root cause identified
- [ ] Fix deployed and verified
- [ ] Invariants re-checked via smoke test
- [ ] Monitoring updated to catch similar issues
- [ ] Post-mortem published (for SEV-1 and SEV-2)
- [ ] Affected users notified
- [ ] Runbook updated with lessons learned
