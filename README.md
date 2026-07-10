# Corrix

**Paid claim & output verification for the agent economy.**

Corrix is a callable [CROO CAP](https://cap.croo.network/) agent that other agents (and humans) hire to **corroborate claims and deliverables before settlement**. Structured receipts. Content hashes. USDC on Base.

| | |
|--|--|
| **Repo** | [github.com/Datwebguy/corrix](https://github.com/Datwebguy/corrix) |
| **Tracks** | Data & Verification · Open – Any A2A |
| **License** | MIT |
| **Stack** | Node 18+ · TypeScript · `@croo-network/sdk` · React + Vite |
| **Protocol** | [CROO CAP](https://cap.croo.network/) · [Agent Store](https://agent.croo.network) |

---

## Why Corrix

Agents sell output. Almost nobody verifies it before money clears.

Corrix is a **commerce-native trust dependency**:

1. Requester agent negotiates a `verify` job  
2. USDC locks in CAP escrow  
3. Corrix returns a machine-readable receipt (`verdict`, `confidence`, `checks[]`, `contentHash`)  
4. Order clears on-chain — reputation compounds  

That is hard to replicate on a normal API marketplace (escrow + delivery proof + A2A discovery).

---

## Monorepo

```
corrix/
├── apps/
│   ├── provider/     # CAP provider + A2A requester demo
│   └── web/          # Marketing + verification console UI
├── packages/
│   └── core/         # Shared verify engine + schemas
├── docs/
├── .env.example
└── package.json
```

---

## Quick start

### 1. Install

```bash
cd corrix
npm install
```

### 2. Local engine test

```bash
npm run verify:local
```

### 3. Mock provider (no CAP keys)

```bash
npm run provider:mock
```

### 4. Web console

```bash
npm run dev:web
```

Open http://localhost:5173 — CROO-green UI, animated CAP lifecycle, mobile + desktop.

### 5. Live CAP provider

1. Register agent at [agent.croo.network](https://agent.croo.network)  
2. Create service **verify** (see schemas below)  
3. Fund the agent **AA wallet** with USDC on **Base**  
4. Copy SDK key once:

```bash
cp .env.example .env
# set CROO_SDK_KEY=croo_sk_...
npm run provider
```

### 6. A2A requester demo

Register a **second** agent, fund its AA wallet, set:

```env
CROO_REQUESTER_SDK_KEY=croo_sk_...
CROO_TARGET_SERVICE_ID=<verify-service-id>
```

```bash
npm run demo:requester
```

---

## CAP service config (Agent Store)

| Field | Value |
|-------|--------|
| **Service name** | `verify` |
| **Price** | e.g. `0.10` USDC |
| **SLA** | e.g. `0h 15m` |
| **Requirements** | Schema (JSON) |
| **Deliverable** | Schema (JSON) |

### Requirements schema

```json
{
  "type": "object",
  "required": ["claim", "sources"],
  "properties": {
    "claim": { "type": "string", "minLength": 8 },
    "sources": { "type": "array", "items": { "type": "string" }, "minItems": 1 },
    "context": { "type": "string" },
    "deliverable": { "type": "string" }
  }
}
```

### Deliverable (receipt)

```json
{
  "version": "1.0",
  "agent": "corrix",
  "verdict": "support | refute | unclear | partial",
  "confidence": 0.0,
  "summary": "…",
  "claim": "…",
  "checks": [],
  "sourcesAnalyzed": 0,
  "contentHash": "sha256…",
  "createdAt": "ISO-8601",
  "latencyMs": 0,
  "mode": "heuristic"
}
```

---

## SDK methods used

Package: **`@croo-network/sdk`**

### Provider (`apps/provider/src/provider.ts`)

| Method | Role |
|--------|------|
| `new AgentClient(config, sdkKey)` | Auth |
| `client.connectWebSocket()` | Realtime events |
| `stream.on(EventType.NegotiationCreated, …)` | Incoming hire |
| `client.acceptNegotiation(negotiationId)` | Accept job |
| `stream.on(EventType.OrderPaid, …)` | Escrow locked |
| `client.getOrder(orderId)` | Read requirements |
| `client.deliverOrder(orderId, { deliverableType, … })` | Submit receipt |
| `client.rejectOrder(orderId, reason)` | Bad input / failure |
| `stream.close()` | Shutdown |

### Requester (`apps/provider/src/requester.ts`)

| Method | Role |
|--------|------|
| `client.negotiateOrder({ serviceId, requirements })` | Hire Corrix |
| `stream.on(EventType.OrderCreated, …)` | Order on-chain |
| `client.payOrder(orderId)` | USDC escrow |
| `stream.on(EventType.OrderCompleted, …)` | Done |
| `client.getDelivery(orderId)` | Fetch receipt |

### Event types

`NegotiationCreated`, `NegotiationRejected`, `NegotiationExpired`, `OrderCreated`, `OrderPaid`, `OrderCompleted`, `OrderRejected`, `OrderExpired`

### Deliverable types

`DeliverableType.Schema` · `DeliverableType.Text` (fallback)

---

## Environment

See [`.env.example`](./.env.example).

| Variable | Description |
|----------|-------------|
| `CROO_API_URL` | `https://api.croo.network` |
| `CROO_WS_URL` | `wss://api.croo.network/ws` |
| `CROO_SDK_KEY` | Provider SDK key |
| `CROO_REQUESTER_SDK_KEY` | Second agent for A2A demo |
| `CROO_TARGET_SERVICE_ID` | Corrix `verify` service id |
| `MOCK=1` | Local engine only |

**Important:** deposit USDC to the agent **AA wallet address** (dashboard), not the controller address. Gas is sponsored by CROO during the launch window.

---

## Design

- **Palette:** forest near-black + CROO electric lime (`#B8F24A`)  
- **Type:** DM Sans + JetBrains Mono  
- **Motion:** Framer Motion, reduced-motion safe  
- **Responsive:** mobile sticky CTA, desktop split console  

---

## Submission checklist (CROO)

- [ ] Listed on CROO Agent Store  
- [ ] CAP integrated (callable, on-chain settle)  
- [ ] Public GitHub + MIT  
- [ ] Demo ≤5 min + this README  
- [ ] DoraHacks BUIDL filed  

Reward hygiene: aim for **10+ real CAP orders**, **≥3 counterparty agents**, **≥5 buyer wallets**.

---

## Demo video outline (≤5 min)

1. Problem — agents sell untrusted output  
2. UI console — claim → CAP lifecycle → receipt  
3. Live provider online + paid order  
4. A2A requester hires Corrix  
5. Store listing + repo  

---

## License

MIT © 2026 Corrix
