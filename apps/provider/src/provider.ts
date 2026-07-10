/**
 * Corrix CAP Provider
 *
 * SDK methods used:
 * - new AgentClient(config, sdkKey)
 * - client.connectWebSocket()
 * - stream.on(EventType.NegotiationCreated | OrderPaid | ...)
 * - client.acceptNegotiation(negotiationId)
 * - client.getOrder(orderId)
 * - client.deliverOrder(orderId, { deliverableType, deliverableSchema | deliverableText })
 * - client.rejectOrder(orderId, reason)
 * - stream.close()
 */
import "dotenv/config";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import {
  parseRequirements,
  verifyClaim,
  type VerifyReceipt,
} from "@corrix/core";

// Load monorepo root .env if present
const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(__dirname, "../../../.env") });

const MOCK = process.env.MOCK === "1" || process.env.MOCK === "true";

async function runMock(): Promise<void> {
  console.log("╔══════════════════════════════════════╗");
  console.log("║   Corrix  ·  mock provider mode     ║");
  console.log("╚══════════════════════════════════════╝");
  console.log("Running local verification smoke test…\n");

  const sample = {
    claim: "CROO Agent Protocol enables agents to hire and pay each other in USDC on Base",
    sources: [
      "https://cap.croo.network/",
      "CAP standardizes discovery, orders, delivery proofs, and on-chain settlement. Agents can hire other agents and settle in USDC. Evidence confirms this.",
    ],
    deliverable:
      "Research brief: CAP is the commerce layer for A2A paid orders on CROO, settling USDC on Base.",
  };

  const receipt = await verifyClaim(sample);
  printReceipt(receipt);
  console.log("\n✓ Mock provider OK. Set CROO_SDK_KEY and run without MOCK for live CAP.");
}

function printReceipt(receipt: VerifyReceipt): void {
  console.log(`Verdict:     ${receipt.verdict.toUpperCase()}`);
  console.log(`Confidence:  ${Math.round(receipt.confidence * 100)}%`);
  console.log(`Hash:        ${receipt.contentHash}`);
  console.log(`Latency:     ${receipt.latencyMs}ms`);
  console.log(`Summary:     ${receipt.summary}`);
  console.log("Checks:");
  for (const c of receipt.checks) {
    console.log(`  [${c.status.padEnd(4)}] ${c.label}: ${c.detail}`);
  }
}

function extractRequirements(order: unknown): unknown {
  const o = order as Record<string, unknown>;
  // Defensive: SDK order shapes may nest requirements
  if (o.requirements != null) return o.requirements;
  if (o.Requirements != null) return o.Requirements;
  const data = o.data as Record<string, unknown> | undefined;
  if (data?.requirements != null) return data.requirements;
  if (typeof o === "object" && o !== null) {
    for (const key of Object.keys(o)) {
      if (key.toLowerCase().includes("require")) return o[key];
    }
  }
  return o;
}

async function runLive(): Promise<void> {
  const sdkKey = process.env.CROO_SDK_KEY;
  if (!sdkKey) {
    console.error("Missing CROO_SDK_KEY. Copy .env.example → .env or use MOCK=1");
    process.exit(1);
  }

  const baseURL = process.env.CROO_API_URL ?? "https://api.croo.network";
  const wsURL = process.env.CROO_WS_URL ?? "wss://api.croo.network/ws";
  const rpcURL = process.env.BASE_RPC_URL ?? "https://mainnet.base.org";

  // Dynamic import so mock mode works without install issues
  const { AgentClient, EventType, DeliverableType } = await import("@croo-network/sdk");

  const client = new AgentClient({ baseURL, wsURL, rpcURL }, sdkKey);
  const stream = await client.connectWebSocket();

  console.log("╔══════════════════════════════════════╗");
  console.log("║   Corrix  ·  CAP provider online    ║");
  console.log("╚══════════════════════════════════════╝");
  console.log(`API: ${baseURL}`);
  console.log("Listening for negotiations & paid orders…\n");

  stream.on(EventType.NegotiationCreated, async (e: { negotiation_id?: string }) => {
    const negotiationId = e.negotiation_id;
    if (!negotiationId) return;
    try {
      console.log(`[neg] accept ${negotiationId}`);
      const result = await client.acceptNegotiation(negotiationId);
      const orderId =
        (result as { order?: { orderId?: string } })?.order?.orderId ?? "(created)";
      console.log(`[neg] order ${orderId}`);
    } catch (err) {
      console.error("[neg] accept failed", err);
    }
  });

  stream.on(EventType.OrderPaid, async (e: { order_id?: string }) => {
    const orderId = e.order_id;
    if (!orderId) return;
    console.log(`[order] paid ${orderId} — verifying…`);
    try {
      const order = await client.getOrder(orderId);
      const raw = extractRequirements(order);
      let receipt: VerifyReceipt;
      try {
        const req = parseRequirements(raw);
        receipt = await verifyClaim(req);
      } catch (parseErr) {
        const reason = parseErr instanceof Error ? parseErr.message : "invalid requirements";
        console.error(`[order] reject ${orderId}: ${reason}`);
        await client.rejectOrder(orderId, reason);
        return;
      }

      printReceipt(receipt);

      // Prefer Schema deliverable for structured A2A consumption
      try {
        await client.deliverOrder(orderId, {
          deliverableType: DeliverableType.Schema,
          deliverableSchema: receipt as unknown as Record<string, unknown>,
        });
      } catch {
        await client.deliverOrder(orderId, {
          deliverableType: DeliverableType.Text,
          deliverableText: JSON.stringify(receipt),
        });
      }
      console.log(`[order] delivered ${orderId} · ${receipt.verdict} · ${receipt.contentHash.slice(0, 12)}…\n`);
    } catch (err) {
      console.error(`[order] handle failed ${orderId}`, err);
      try {
        await client.rejectOrder(
          orderId,
          err instanceof Error ? err.message : "verification failed",
        );
      } catch {
        /* ignore */
      }
    }
  });

  for (const ev of [
    EventType.OrderCreated,
    EventType.OrderCompleted,
    EventType.OrderRejected,
    EventType.OrderExpired,
    EventType.NegotiationRejected,
    EventType.NegotiationExpired,
  ]) {
    stream.on(ev, (e: unknown) => {
      console.log(`[event] ${String(ev)}`, e);
    });
  }

  process.on("SIGINT", () => {
    console.log("\nShutting down Corrix provider…");
    stream.close();
    process.exit(0);
  });
}

if (MOCK) {
  runMock().catch((e) => {
    console.error(e);
    process.exit(1);
  });
} else {
  runLive().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
