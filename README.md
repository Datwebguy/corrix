# Corrix

### Corroborate before you settle

**Corrix** is a paid, hireable verification agent for the agent economy. Other agents (and operators) pay in **USDC** to check claims and outputs, then receive a **structured receipt** with a verdict, confidence, discrete checks, and a **SHA-256 content hash**, negotiated, escrowed, delivered, and cleared through **[CROO CAP](https://cap.croo.network/)**.

| | |
|--|--|
| **Repository** | [github.com/Datwebguy/corrix](https://github.com/Datwebguy/corrix) |
| **Agent Store** | [agent.croo.network](https://agent.croo.network) |
| **Protocol** | [CROO Agent Protocol (CAP)](https://cap.croo.network/) |
| **Docs (product site)** | `/docs` in the web app · this README |
| **License** | [MIT](./LICENSE) |
| **Stack** | Node 18+ · TypeScript · `@croo-network/sdk` · React · Vite · Framer Motion |
| **Settlement** | USDC on **Base** via CAP escrow |

---

## Table of contents

1. [About](#about)
2. [Problem](#problem)
3. [Solution](#solution)
4. [Features](#features)
5. [How it works](#how-it-works)
6. [Architecture](#architecture)
7. [Repository structure](#repository-structure)
8. [Prerequisites](#prerequisites)
9. [Quick start](#quick-start)
10. [Full guide, go live on CAP](#full-guide--go-live-on-cap)
11. [Environment variables](#environment-variables)
12. [Service configuration (Agent Store)](#service-configuration-agent-store)
13. [API reference, verify I/O](#api-reference--verify-io)
14. [SDK methods used](#sdk-methods-used)
15. [npm scripts](#npm-scripts)
16. [Web application](#web-application)
17. [Verification engine](#verification-engine)
18. [Troubleshooting](#troubleshooting)
19. [Security](#security)
20. [Roadmap](#roadmap)
21. [Contributing](#contributing)
22. [License](#license)

---

## About

Corrix sits in the **trust layer** of agent-to-agent (A2A) commerce.

Autonomous agents increasingly produce research, content, and operational outputs that other agents consume and pay for. Payment rails alone do not create truth. Corrix is a **commerce-native dependency**: priced, discoverable on the CROO Agent Store, and bound to CAP’s order lifecycle (negotiate → lock → deliver → clear).

**Who hires Corrix**

- Research / intelligence agents validating claims before they settle peer work  
- DeFi / ops agents checking narratives or risk statements  
- Creator / content agents confirming brief fidelity  
- Orchestrators that refuse to clear payment until a third-party receipt lands  

**What Corrix is not**

- Not a free “chat wrapper” API without escrow  
- Not a human-only dashboard product (humans can use the console; the primary customer is **other agents**)  
- Not a guarantee of absolute truth, it returns honest **support / refute / partial / unclear** with inspectable checks  

**Brand**

- Name from *corroborate*  
- Visual system: forest night + CROO electric lime (`#B8F24A`)  
- Mark: open **C** ring + verification node (see `apps/web/public/`)

---

## Problem

1. **Agents sell output faster than anyone can trust it.**  
2. **Peer-to-peer agent jobs lack a shared verification hop** before settlement.  
3. **Normal API marketplaces** give you HTTP + keys, not escrow, delivery proofs, on chain reputation, or A2A discovery.  
4. **Orchestrators need machine readable receipts**, not prose-only “looks good” replies.

Without a paid verification dependency, the agent economy defaults to **trust me**, which does not scale.

---

## Solution

Corrix implements a single CAP skill: **`verify`**.

```
Requester agent                    Corrix (provider)
      │                                   │
      ├─ negotiateOrder(verify) ─────────►│
      │                                   ├─ acceptNegotiation
      │◄── order_created ─────────────────┤
      ├─ payOrder (USDC escrow) ─────────►│
      │                                   │◄── order_paid
      │                                   ├─ run verification engine
      │                                   ├─ deliverOrder(receipt + contentHash)
      │◄── order_completed ───────────────┤
      ├─ getDelivery → structured receipt │
```

The receipt is designed for **automation**: verdict enums, check arrays, scores, and a deterministic content hash.

---

## Features

### Product

- **Paid A2A verification** on CROO CAP  
- **Structured receipts** (`verdict`, `confidence`, `checks[]`, `summary`, `contentHash`)  
- **Claim + sources** mode and optional **deliverable** (output consistency) mode  
- **Honest uncertainty**, `unclear` / `partial` when evidence is weak  
- **Content hashing** for integrity of the sealed receipt body  

### Platform

- **Provider worker** with WebSocket event loop (`apps/provider`)  
- **Hire script** for live A2A paid orders (`npm run hire`)  
- **Local engine mode** without CAP keys (`npm run provider:local`)  
- **Product website**: landing, about, docs, FAQ, verification console  

### Design & UX

- Separate **marketing shell** (`/`) from **console app** (`/console`)  
- Animated evidence-lattice background  
- Mobile + desktop layouts  
- Reduced-motion friendly  

---

## How it works

### CAP lifecycle

| Step | Name | What happens |
|------|------|----------------|
| 1 | **Negotiate** | Requester posts requirements (claim, sources, …). Provider accepts. |
| 2 | **Lock** | Terms and USDC enter CAP escrow on Base. |
| 3 | **Deliver** | Corrix runs the engine and submits a schema deliverable. |
| 4 | **Clear** | Protocol verifies delivery; settlement and reputation update. |

### Online vs offline agents

| Agent | When Online | Purpose |
|-------|-------------|---------|
| **Corrix** (provider) | While `npm run provider` runs | Accepts and fulfills `verify` orders |
| **Buyer / requester** | Only during `npm run hire` (or your client) | Pays and fetches delivery; may show Offline when idle |

This is expected. The **provider** must stay online to sell; the **requester** does not need a 24/7 process.

---

## Architecture

```
corrix/
├── apps/
│   ├── provider/          # CAP provider + hire (requester) scripts
│   │   └── src/
│   │       ├── provider.ts    # Online worker: accept → verify → deliver
│   │       └── requester.ts   # A2A hire: negotiate → pay → getDelivery
│   └── web/               # Product site + verification console
│       └── src/
│           ├── pages/         # Landing, About, Docs, FAQ, Console
│           ├── components/    # Shell, FlowField, Logo
│           └── lib/           # Browser verify engine + site config
├── packages/
│   └── core/              # Shared types, parse, hash, heuristic engine
│       └── src/
│           ├── engine.ts
│           ├── parse.ts
│           ├── hash.ts
│           └── types.ts
├── docs/
│   └── SUBMISSION.md      # Optional competition / listing checklist
├── .env.example
├── package.json           # npm workspaces root
└── LICENSE
```

**Data flow**

1. CAP delivers `requirements` as JSON (or stringified JSON).  
2. `@corrix/core` parses and runs `verifyClaim()`.  
3. Provider submits `DeliverableType.Schema` (falls back to `Text` if needed).  
4. Requester reads delivery via `getDelivery()`.

---

## Repository structure

| Path | Description |
|------|-------------|
| `apps/provider` | Live CAP integration |
| `apps/web` | React UI (Vite) on port **5288** by default |
| `packages/core` | Verification engine + schemas |
| `docs/` | Extra operational notes |
| `.env.example` | Template for secrets (never commit real keys) |

---

## Prerequisites

- **Node.js 18+** and npm  
- A [CROO Agent Store](https://agent.croo.network) account  
- **Two agents** recommended: one provider (Corrix), one requester (buyer)  
- **USDC on Base** for the **requester AA wallet** (pays per order)  
- Optional: small balance on provider AA if the dashboard requires it  

Official CAP quickstart: [docs.croo.network](https://docs.croo.network/developer-docs/quick-start)

---

## Quick start

### 1. Clone and install

```bash
git clone https://github.com/Datwebguy/corrix.git
cd corrix
npm install
```

### 2. Run the engine locally (no keys)

```bash
npm run verify:local
```

Expected: self-test cases for support / refute / parse.

### 3. Local engine (no CAP keys)

```bash
npm run provider:local
```

Runs one local verification through the same engine path the live provider uses.

### 4. Product website

```bash
npm run dev:web
```

Open **http://localhost:5288/**

| Route | Purpose |
|-------|---------|
| `/` | Landing |
| `/about` | Product story |
| `/docs` | Integration docs |
| `/faq` | FAQ |
| `/console` | Verification console (local engine) |

### 5. Production web build

```bash
npm run build:web
```

Output: `apps/web/dist`

---

## Full guide, go live on CAP

Follow these steps to run Corrix as a **live paid agent**.

### Step 1, Register the provider agent

1. Go to [agent.croo.network](https://agent.croo.network) and sign in.  
2. **Register Agent** → name e.g. **`Corrix`**.  
3. **Save the SDK key once** (`croo_sk_…`), treat it as a secret.  
4. Note the **AA wallet address** (shown with balance / Top Up).  

### Step 2, Complete profile and `verify` service

On **Configure Agent** for Corrix:

1. **Description** (example):

   > Corrix is a paid verification agent for the agent economy. Hire it to corroborate claims and outputs before settlement. Returns a structured receipt with verdict, confidence, checks, and a content hash via CROO CAP.

2. **Tags** (examples): Data & Analytics, Research & Report, Development & Code, Automation & Workflow.  
3. **+ Add Service**:

| Field | Suggested value |
|-------|-----------------|
| Name | `verify` |
| Price | e.g. `0.05` USDC (your choice) |
| SLA | e.g. `0h 30m` |
| Requirements | Schema, claim + sources |
| Deliverable | Schema, receipt object |

4. Copy the **Service ID** (UUID next to `verify`, use the copy control for the full value).  
5. **Save Changes**.

### Step 3, Register a requester (buyer) agent

1. Register a second agent, e.g. **`Corrix-Requester`**.  
2. Save its **SDK key** and **AA wallet**.  
3. Optional: minimal description + a cheap placeholder service if the dashboard requires “at least one service” to complete profile. The requester does **not** sell verification.

### Step 4, Fund wallets

1. On **Corrix-Requester**, click **Top Up**.  
2. Deposit **USDC on Base** to the **AA wallet** (not a controller address if the UI distinguishes them).  
3. Fund enough for tests: at `$0.05`/order, **$0.50 ≈ 10 orders**.  
4. Optionally top up the provider AA slightly.

### Step 5, Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
CROO_API_URL=https://api.croo.network
CROO_WS_URL=wss://api.croo.network/ws
CROO_SDK_KEY=croo_sk_YOUR_PROVIDER_KEY
CROO_REQUESTER_SDK_KEY=croo_sk_YOUR_REQUESTER_KEY
CROO_TARGET_SERVICE_ID=YOUR_VERIFY_SERVICE_UUID
```

Never commit `.env`.

### Step 6, Start the provider (must stay running)

```bash
npm run provider
```

You should see **CAP provider online** / WebSocket connected.  
On the Agent Store, **Corrix** should show **Online**.

Leave this process running.

### Step 7, Hire Corrix (second terminal)

```bash
npm run hire
```

Expected flow:

1. Negotiation created  
2. Provider accepts  
3. Order paid (tx hash)  
4. Provider verifies and delivers  
5. Requester prints delivery JSON → `✓ A2A hire complete`

### Step 8, Operate

- Keep **`npm run provider`** up to remain Online.  
- Run **`npm run hire`** whenever you want another paid test order.  
- Requester **Offline** between hires is normal.

---

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `CROO_API_URL` | Yes (live) | Default `https://api.croo.network` |
| `CROO_WS_URL` | Yes (live) | Default `wss://api.croo.network/ws` |
| `CROO_SDK_KEY` | Yes (provider) | Provider agent SDK key `croo_sk_…` |
| `CROO_REQUESTER_SDK_KEY` | Yes (hire) | Buyer agent SDK key |
| `CROO_TARGET_SERVICE_ID` | Yes (hire) | UUID of the `verify` service |
| `BASE_RPC_URL` | No | Optional Base RPC override |
| `LOCAL` | No | Set `1` / `true` for local engine only (no CAP) |

Template: [`.env.example`](./.env.example)

---

## Service configuration (Agent Store)

### Recommended listing

| Field | Value |
|-------|--------|
| Agent name | Corrix |
| Service name | `verify` |
| Price | Operator choice (e.g. 0.05 USDC) |
| SLA | Operator choice (e.g. 30 minutes) |
| Requirements type | Schema |
| Deliverable type | Schema |

### Requirements schema (conceptual)

```json
{
  "type": "object",
  "required": ["claim", "sources"],
  "properties": {
    "claim": {
      "type": "string",
      "minLength": 8,
      "description": "Claim or statement to verify"
    },
    "sources": {
      "type": "array",
      "items": { "type": "string" },
      "minItems": 1,
      "description": "URLs and/or evidence snippets"
    },
    "context": {
      "type": "string",
      "description": "Optional context from the hiring agent"
    },
    "deliverable": {
      "type": "string",
      "description": "Optional upstream agent output to check against the claim"
    }
  }
}
```

### Example requirements payload (hire)

```json
{
  "claim": "CAP orders settle USDC on Base with verifiable delivery before payout",
  "sources": [
    "https://docs.croo.network/developer-docs/quick-start",
    "CROO CAP: negotiate, lock escrow, deliver proof, then clear settlement. Confirmed by protocol docs."
  ],
  "context": "A2A hire from orchestrator"
}
```

---

## API reference, verify I/O

### Request (`VerifyRequest`)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `claim` | string | Yes | Statement under evaluation |
| `sources` | string[] | Yes* | URLs or evidence text (*engine accepts empty only as failure path) |
| `context` | string | No | Free-form context |
| `deliverable` | string | No | Agent output to score for consistency |

### Response (`VerifyReceipt`)

| Field | Type | Description |
|-------|------|-------------|
| `version` | `"1.0"` | Receipt schema version |
| `agent` | `"corrix"` | Issuer id |
| `verdict` | enum | `support` \| `refute` \| `partial` \| `unclear` |
| `confidence` | number | 0 to 1 |
| `summary` | string | Human-readable outcome |
| `claim` | string | Echo of input claim |
| `checks` | `CheckResult[]` | Discrete inspections |
| `sourcesAnalyzed` | number | Source count |
| `contentHash` | string | SHA-256 of sealed body fields |
| `createdAt` | string | ISO-8601 |
| `latencyMs` | number | Engine latency |
| `mode` | string | e.g. `heuristic` |

### Check result

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Stable check id |
| `label` | string | Display name |
| `status` | enum | `pass` \| `fail` \| `warn` \| `skip` |
| `detail` | string | Explanation |
| `score` | number? | Optional 0 to 1 contribution |

### Checks performed (v1 heuristic)

| id | Label | Role |
|----|-------|------|
| `claim_quality` | Claim quality | Length / token adequacy |
| `sources_present` | Sources present | Non-empty sources |
| `source_shape` | Source shape | URLs vs text snippets |
| `lexical_overlap` | Lexical overlap | Claim keywords in sources |
| `polarity` | Source polarity | Support vs refute language cues |
| `deliverable` | Output consistency | Optional deliverable alignment |
| `provenance` | URL provenance | Valid URL hosts |

---

## SDK methods used

Package: **[`@croo-network/sdk`](https://github.com/CROO-Network/node-sdk)**

### Provider, `apps/provider/src/provider.ts`

| Method / API | Purpose |
|--------------|---------|
| `new AgentClient(config, sdkKey)` | Authenticated client |
| `client.connectWebSocket()` | Realtime CAP events |
| `stream.on(EventType.NegotiationCreated, …)` | Incoming hire |
| `client.acceptNegotiation(id)` | Accept job → create order |
| `stream.on(EventType.OrderPaid, …)` | Escrow locked; start work |
| `client.getOrder(id)` | Read requirements |
| `client.deliverOrder(id, payload)` | Submit receipt |
| `client.rejectOrder(id, reason)` | Invalid input / failure |
| `stream.close()` | Graceful shutdown |

### Requester, `apps/provider/src/requester.ts`

| Method / API | Purpose |
|--------------|---------|
| `client.negotiateOrder({ serviceId, requirements })` | Hire Corrix |
| `stream.on(EventType.OrderCreated, …)` | Order ready to pay |
| `client.payOrder(id)` | USDC escrow; returns `txHash` |
| `stream.on(EventType.OrderCompleted, …)` | Delivery accepted |
| `client.getDelivery(id)` | Fetch receipt payload |

### Events

`NegotiationCreated`, `NegotiationRejected`, `NegotiationExpired`,  
`OrderCreated`, `OrderPaid`, `OrderCompleted`, `OrderRejected`, `OrderExpired`

### Deliverable types

- `DeliverableType.Schema`, preferred (structured receipt)  
- `DeliverableType.Text`, fallback JSON string  

---

## npm scripts

Run from the **repo root**:

| Script | Description |
|--------|-------------|
| `npm install` | Install all workspaces |
| `npm run verify:local` | Core engine self-test |
| `npm run provider:local` | Local engine only (no CAP) |
| `npm run provider` | **Live** CAP provider (needs `CROO_SDK_KEY`) |
| `npm run hire` | **Live** A2A hire (needs requester key + service id) |
| `npm run dev:web` | Vite dev server (default port **5288**) |
| `npm run build:web` | Typecheck + production web build |
| `npm run build` | Build core + web |

---

## Web application

### Routes

| Path | Description |
|------|-------------|
| `/` | Marketing landing, problem, pipeline, CTA |
| `/about` | About Corrix |
| `/docs` | Integration documentation |
| `/faq` | Frequently asked questions |
| `/console` | Operator console, run verification locally |

### Design system

| Token | Role |
|-------|------|
| Background | Near-black forest `#070B09` |
| Accent | Electric lime `#B8F24A` |
| Type | DM Sans + JetBrains Mono |
| Motion | Framer Motion; canvas evidence lattice |

### Deploy notes (e.g. Vercel)

- Root directory: `apps/web`  
- Build command: `npm run build`  
- Output directory: `dist`  
- SPA rewrites: all routes → `index.html`  

---

## Verification engine

**Location:** `packages/core` (Node) and `apps/web/src/lib/verify.ts` (browser console).

**Mode (v1):** deterministic **heuristic** analysis, no external LLM required for MVP.

**Strengths**

- No API key dependency for the core checks  
- Fast, inspectable, reproducible for a given claim + sources  
- Suitable as a CAP skill with clear failure modes  

**Limitations**

- Does not fully fetch and read arbitrary web pages in depth (URL presence / shape today)  
- Lexical and polarity heuristics can return **`unclear`** on thin evidence (by design)  
- Not a substitute for human legal/compliance review  

**Future modes** (see Roadmap): hybrid / LLM-assisted scoring with the same receipt schema.

---

## Troubleshooting

| Symptom | What to check |
|---------|----------------|
| Provider won’t start | `CROO_SDK_KEY` set; Node 18+; `npm install` |
| Agent stays Offline | Is `npm run provider` running? Check WebSocket errors |
| Hire fails: missing service | `CROO_TARGET_SERVICE_ID` is full UUID of **verify** |
| Pay fails / insufficient balance | Requester **AA** funded with **USDC on Base** |
| Wrong wallet | Top Up the **AA address** on the agent card, not a random EOA |
| Negotiation never accepted | Provider offline or wrong provider key |
| Deliver errors | Requirements parse; check provider logs; schema vs text fallback |
| Requester shows Offline | Expected when not running `npm run hire` |
| Port 5173 is another app | Corrix web uses **5288** (`apps/web/vite.config.ts`) |
| Keys in git | Ensure `.env` is ignored; rotate keys if leaked |

---

## Security

- **Never commit** `.env`, SDK keys, or wallet private keys.  
- Prefer password managers for secrets; rotate keys if they appear in chat, screenshots, or logs.  
- The SDK may log connection URLs containing key query params in debug output, avoid sharing raw terminal dumps publicly.  
- Fund **only** what you need for testing.  
- Treat Agent Store **API keys** as production credentials.

---

## Roadmap

- [x] Heuristic verification engine + content hash  
- [x] Live CAP provider and A2A hire path  
- [x] Product web (landing, docs, console)  
- [x] Public open source repository  
- [ ] Public production deploy of the website  
- [ ] Console path that hires live CAP (not only local engine)  
- [ ] Optional URL content fetch for stronger provenance  
- [ ] Optional LLM / hybrid mode with same receipt schema  
- [ ] Unified single engine package for browser + Node  
- [ ] Automated tests + CI  

---

## Contributing

1. Fork and clone the repo.  
2. Create a branch for your change.  
3. Run `npm run verify:local` and `npm run build:web` before opening a PR.  
4. Do not include secrets in commits.  
5. Prefer small, focused PRs with a clear description of CAP impact (provider vs web vs core).

Issues and PRs are welcome for engine quality, docs, and CAP integration edge cases.

---

## Related links

- [CROO Network](https://croo.network)  
- [CROO CAP](https://cap.croo.network/)  
- [CROO Agent Store](https://agent.croo.network)  
- [CAP Quick Start](https://docs.croo.network/developer-docs/quick-start)  
- [CROO Node SDK](https://github.com/CROO-Network/node-sdk)  
- [This repository](https://github.com/Datwebguy/corrix)  

---

## License

[MIT](./LICENSE) © 2026 Corrix contributors  

Built for the open agent economy, **corroborate before you settle.**
