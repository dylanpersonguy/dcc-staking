<p align="center">
  <img src="https://img.shields.io/badge/DecentralChain-Liquid_Staking-6C5CE7?style=for-the-badge&logoColor=white" alt="DCC Liquid Staking" />
</p>

<h1 align="center">stDCC — Liquid Staking Protocol</h1>

<p align="center">
  <strong>Stake DCC. Receive stDCC. Earn rewards. Stay liquid.</strong>
</p>

<p align="center">
  <a href="#-quick-start"><img src="https://img.shields.io/badge/-Quick_Start-00b894?style=flat-square" /></a>
  <a href="docs/architecture.md"><img src="https://img.shields.io/badge/-Architecture-0984e3?style=flat-square" /></a>
  <a href="docs/threat-model.md"><img src="https://img.shields.io/badge/-Security-d63031?style=flat-square" /></a>
  <a href="#-roadmap"><img src="https://img.shields.io/badge/-Roadmap-6c5ce7?style=flat-square" /></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-5.3-3178C6?style=flat-square&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/RIDE-v6-00C4B4?style=flat-square" />
  <img src="https://img.shields.io/badge/Next.js-14-000000?style=flat-square&logo=next.js&logoColor=white" />
  <img src="https://img.shields.io/badge/Tailwind-3.4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white" />
  <img src="https://img.shields.io/badge/Turborepo-monorepo-EF4444?style=flat-square&logo=turborepo&logoColor=white" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" />
</p>

---

## What is stDCC?

**stDCC** is a liquid staking protocol for [DecentralChain](https://decentralchain.io) — a Waves-derived Layer-1 blockchain using Leased Proof-of-Stake (LPoS).

Users deposit **DCC** and receive **stDCC**, a yield-bearing token that appreciates in value as staking rewards accrue. Unlike rebasing tokens, your stDCC balance never changes — its *value* grows.

```
┌──────────┐          ┌──────────────────┐          ┌──────────┐
│          │  Deposit  │                  │  Lease    │          │
│   User   │ ───DCC──►│  stDCC Protocol  │ ────────► │Validators│
│          │ ◄─stDCC──│   (RIDE dApp)    │ ◄─rewards─│          │
│          │          │                  │          │          │
└──────────┘          └──────────────────┘          └──────────┘
                              │
                     stDCC value goes up 📈
```

> **Exchange Rate Model** — not rebasing. `1 stDCC` is always worth ≥ `1 DCC`, and the rate only goes up.

---

## ✨ Features

<table>
<tr>
<td width="50%">

### Protocol
- 🏦 **Liquid Staking** — Stake DCC without lockup
- 📈 **Exchange Rate Model** — Value accrues, balance stays fixed
- 🔒 **RIDE v6 Smart Contract** — All logic on-chain
- ⚖️ **Protocol-Favorable Rounding** — No dust exploits
- 🚨 **Emergency Mode** — One-way circuit breaker (no rug-pulls)
- 🎯 **Multi-Validator** — Distribute stake across the network

</td>
<td width="50%">

### Infrastructure
- 🧱 **Turborepo Monorepo** — Unified build pipeline
- 📦 **TypeScript SDK** — Read state, build txs, bigint math
- 🔍 **Indexer** — PostgreSQL-backed chain watcher + REST API
- 🤖 **Operator Daemon** — Automated rewards, leasing, safety
- 🖥️ **Next.js 14 Frontend** — Modern stake/unstake UI
- 🧪 **Comprehensive Tests** — Unit, integration, smoke tests

</td>
</tr>
</table>

---

## 🏗 Architecture

```
                    ┌─────────────────────────────────────────────┐
                    │            DecentralChain L1                 │
                    │  ┌───────────────────────────────────────┐   │
                    │  │      liquid_staking.ride (dApp)        │   │
                    │  │                                       │   │
                    │  │  deposit · withdraw · claim · rewards │   │
                    │  │  validators · leasing · emergency     │   │
                    │  └───────────────────────────────────────┘   │
                    └──────────┬──────────┬──────────┬────────────┘
                               │          │          │
               ┌───────────────┘          │          └───────────────┐
               ▼                          ▼                          ▼
      ┌─────────────┐          ┌──────────────┐           ┌──────────────┐
      │     SDK     │          │   Indexer    │           │   Operator   │
      │             │          │              │           │              │
      │  types      │          │  PostgreSQL  │           │  sync-rewards│
      │  math       │          │  REST API    │           │  rebalance   │
      │  tx-builder │          │  poller      │           │  finalize    │
      │  reader     │          │              │           │  safety      │
      └──────┬──────┘          └──────┬───────┘           └──────────────┘
             │                        │
             ▼                        ▼
      ┌────────────────────────────────────┐
      │        Frontend (Next.js 14)       │
      │   Tailwind · DCC Keeper · Hooks    │
      └────────────────────────────────────┘
```

| Package | Path | What it does |
|:--------|:-----|:-------------|
| **RIDE Contract** | `contracts/ride/` | On-chain dApp — deposit, withdraw, lease, emergency mode |
| **SDK** | `packages/sdk/` | TypeScript library — bigint math, node client, tx builder |
| **Config** | `packages/config/` | Shared constants, state key builders, network configs |
| **Indexer** | `apps/indexer/` | Chain watcher → PostgreSQL → Express REST API |
| **Operator** | `apps/operator/` | Daemon — rewards sync, lease rebalancing, safety checks |
| **Frontend** | `apps/web/` | Next.js 14 + Tailwind — stake, unstake, admin panel |

---

## 🔐 Security Design

<table>
<tr><td>

| Property | Guarantee |
|:---------|:----------|
| Rounding | Always favors protocol — no extraction via dust |
| Exchange Rate | Monotonically non-decreasing (no slashing in Phase 1) |
| Access Control | Role-based: Admin · Operator · Guardian · User |
| Emergency | One-way `emergencyMode()` — cannot be unpaused |
| Withdrawals | State machine: `pending → ready → claimed` (no double-claim) |
| Invariants | 10 non-negotiable invariants, auto-checked every cycle |

</td></tr>
</table>

> Full analysis: [Threat Model](docs/threat-model.md) · [Invariants](docs/invariants.md) · [Incident Runbook](docs/runbook.md)

---

## 💰 Exchange Rate Model

```
shares_minted = deposit_amount × total_shares ÷ total_pooled_dcc    (round ↓)
dcc_redeemed  = shares_burned  × total_pooled_dcc ÷ total_shares    (round ↓)
```

- Your **stDCC balance stays constant** — no confusing rebases
- The **value per stDCC** increases as validators earn rewards
- Rate can **never decrease** (enforced by invariant + emergency shutdown)
- All math uses **BigInt** with 8-decimal precision (1 DCC = 100,000,000 wavelets)

---

## 🚀 Quick Start

### Prerequisites

| Tool | Version |
|:-----|:--------|
| Node.js | ≥ 18 |
| npm | ≥ 9 (workspaces) |
| PostgreSQL | ≥ 14 (indexer) |

### Install & Build

```bash
git clone https://github.com/dylanpersonguy/dcc-staking.git
cd dcc-staking

npm install
cp .env.example .env          # configure your environment
npm run build                  # build all packages
```

### Run the Stack

```bash
# 1. Start the indexer (chain watcher + API)
cd apps/indexer && npx ts-node src/index.ts

# 2. Start the operator daemon
cd apps/operator && npx ts-node src/index.ts

# 3. Start the frontend
cd apps/web && npm run dev
# → http://localhost:3000
```

### Deploy & Test

```bash
# Deploy contract to testnet
npx ts-node scripts/deploy.ts --network=testnet

# Seed test data
npx ts-node scripts/seed.ts

# Run smoke tests against live deployment
npx ts-node scripts/smoke-test.ts

# Run unit tests
npm test
```

---

## 📂 Project Structure

```
dcc-staking/
│
├── contracts/ride/
│   └── liquid_staking.ride            # RIDE v6 smart contract (~500 lines)
│
├── packages/
│   ├── config/src/
│   │   ├── constants.ts               # Protocol constants & state key builders
│   │   └── networks.ts                # Testnet / mainnet configuration
│   │
│   └── sdk/
│       ├── src/
│       │   ├── types.ts               # TypeScript interfaces & enums
│       │   ├── math.ts                # BigInt exchange rate arithmetic
│       │   ├── node-client.ts         # DecentralChain node REST wrapper
│       │   ├── protocol-reader.ts     # Read on-chain protocol state
│       │   ├── tx-builder.ts          # Build InvokeScript transaction params
│       │   └── parser.ts              # Parse data entries into typed events
│       └── __tests__/                 # Unit tests (math, builder, parser)
│
├── apps/
│   ├── indexer/src/                   # Chain watcher + PostgreSQL + REST API
│   ├── operator/src/                  # Automated daemon (rewards, leasing, safety)
│   └── web/src/                       # Next.js 14 frontend (stake/unstake UI)
│
├── scripts/
│   ├── deploy.ts                      # Contract compilation & deployment
│   ├── seed.ts                        # Test data seeding
│   └── smoke-test.ts                  # End-to-end protocol verification
│
├── docs/
│   ├── architecture.md                # System design & component diagram
│   ├── state-schema.md                # On-chain data key specifications
│   ├── threat-model.md                # 13-threat security analysis
│   ├── invariants.md                  # 10 non-negotiable protocol invariants
│   └── runbook.md                     # Incident response procedures
│
├── turbo.json                         # Turborepo pipeline config
├── tsconfig.base.json                 # Shared TypeScript strict config
└── .env.example                       # Complete environment template
```

> **5,400+ lines** of TypeScript & RIDE across **70 files**

---

## ⚙️ Configuration

All settings are controlled via environment variables. See [`.env.example`](.env.example) for the full template.

<details>
<summary><strong>Key Variables</strong></summary>

| Variable | Description | Default |
|:---------|:------------|:--------|
| `DCC_NODE_URL` | DecentralChain node RPC endpoint | `https://testnode1.decentralchain.io` |
| `DCC_CHAIN_ID` | `T` for testnet, `D` for mainnet | `T` |
| `DAPP_ADDRESS` | Deployed dApp address | — |
| `ADMIN_ADDRESS` | Protocol admin address | — |
| `OPERATOR_SEED` | Operator daemon signing seed | — |
| `TREASURY_ADDRESS` | Fee collection address | — |
| `PROTOCOL_FEE_BPS` | Protocol fee (basis points) | `1000` (10%) |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://localhost:5432/dcc_staking` |
| `INDEXER_PORT` | Indexer REST API port | `4000` |

</details>

---

## 🔄 How It Works

### Deposit Flow

```
User calls deposit() with DCC payment
  → Protocol calculates shares: amount × totalShares ÷ totalPooledDcc
  → stDCC minted to user (native asset Issue/Reissue)
  → DCC added to pool, leased to validators
```

### Withdrawal Flow

```
1. User: requestWithdraw(stDCC)     → status: "pending"
2. Operator: finalizeWithdraw()     → status: "ready"  + DCC amount locked
3. User: claimWithdraw(id)          → status: "claimed" + DCC transferred
```

### Validator Leasing

```
lease_target = total_leasable_dcc × (validator_weight / 10000)
```

The operator daemon continuously rebalances leases across validators, canceling leases as needed to maintain liquidity for withdrawals.

---

## 🗺 Roadmap

| Phase | Scope | Status |
|:------|:------|:-------|
| **Phase 1** | Core deposit/withdraw, multi-validator, manual admin, exchange rate model | ✅ Complete |
| **Phase 2** | Guardian role, automated rebalancing, enhanced monitoring, slashing support | 🔧 In Progress |
| **Phase 3** | On-chain governance (DAO), DeFi integrations (DEX/lending), insurance pool | 📋 Planned |

---

## 🧑‍💻 Development

```bash
npm run build       # Build all packages (via Turborepo)
npm run dev         # Dev mode with watch
npm run lint        # Lint all packages
npm run test        # Run all tests
```

### Key Technologies

- **RIDE v6** — Smart contract language for DecentralChain
- **TypeScript 5.3** — Strict mode, ES2022 target
- **Turborepo** — Monorepo orchestration with caching
- **Next.js 14** — App Router, Server Components
- **Tailwind CSS 3.4** — Utility-first styling with custom `dcc` palette
- **PostgreSQL** — Indexer persistence layer
- **Express** — Indexer REST API
- **Jest + ts-jest** — Unit testing with TypeScript support

---

## 📖 Documentation

| Document | Description |
|:---------|:------------|
| [Architecture](docs/architecture.md) | System design, transaction flows, component diagram |
| [State Schema](docs/state-schema.md) | Complete on-chain key naming, types, collision analysis |
| [Threat Model](docs/threat-model.md) | 13 attack vectors analyzed with mitigations |
| [Invariants](docs/invariants.md) | 10 non-negotiable protocol invariants |
| [Runbook](docs/runbook.md) | Incident response for SEV-1 through SEV-3 events |

---

## 📝 Notes

Items marked `TODO(chain-confirmation)` in the codebase require adaptation to the exact DecentralChain transaction signing library. All protocol logic is complete — these TODOs cover only the wire-level transaction format (signing, Lease/LeaseCancel construction, broadcast).

---

## 📄 License

[MIT](LICENSE) — build on it, fork it, stake with it.

---

<p align="center">
  <sub>Built for DecentralChain · Exchange Rate Model · Monotonic Rewards · Zero Rug-Pulls</sub>
</p>
