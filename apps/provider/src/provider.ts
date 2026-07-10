/**
 * Corrix CAP Provider — live worker
 *
 * SDK: AgentClient, connectWebSocket, acceptNegotiation, getOrder,
 * getNegotiation, deliverOrder, rejectOrder, EventType.*
 */
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import {
  parseRequirements,
  verifyClaim,
  type VerifyReceipt,
} from "@corrix/core";

const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(__dirname, "../../../.env") });
loadEnv(); // also allow cwd .env

const LOCAL = process.env.LOCAL === "1" || process.env.LOCAL === "true"
  || process.env.MOCK === "1" || process.env.MOCK === "true";

/** Prevent concurrent double-delivery on the same order */
const inFlight = new Set<string>();
const delivered = new Set<string>();

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

/**
 * Pull requirements from Order / Negotiation shapes returned by the SDK.
 * Order typings may omit requirements; runtime + negotiation fallback cover it.
 */
function extractRequirements(
  order: Record<string, unknown>,
  negotiation?: Record<string, unknown> | null,
): unknown {
  const candidates: unknown[] = [
    order.requirements,
    order.Requirements,
    order.requirement,
    (order.data as Record<string, unknown> | undefined)?.requirements,
    negotiation?.requirements,
    negotiation?.Requirements,
  ];

  for (const c of candidates) {
    if (c != null && c !== "") return c;
  }

  // Last resort: scan keys
  for (const [k, v] of Object.entries(order)) {
    if (k.toLowerCase().includes("require") && v != null && v !== "") return v;
  }

  throw new Error(
    "Order has no requirements field — cannot verify. Ensure hire sends claim/sources JSON.",
  );
}

async function runLocal(): Promise<void> {
  console.log("╔══════════════════════════════════════╗");
  console.log("║   Corrix  ·  local engine mode       ║");
  console.log("╚══════════════════════════════════════╝");
  console.log("No CAP keys required. Running engine only.\n");

  const sample = {
    claim:
      "CROO Agent Protocol enables agents to hire and pay each other in USDC on Base",
    sources: [
      "https://cap.croo.network/",
      "CAP standardizes discovery, orders, delivery proofs, and on-chain settlement. Agents can hire other agents and settle in USDC. Evidence confirms this.",
    ],
    deliverable:
      "Research brief: CAP is the commerce layer for A2A paid orders on CROO, settling USDC on Base.",
  };

  const receipt = await verifyClaim(sample);
  printReceipt(receipt);
  console.log("\n✓ Local engine OK. Use npm run provider (with CROO_SDK_KEY) for live CAP.");
}

async function runLive(): Promise<void> {
  const sdkKey = process.env.CROO_SDK_KEY?.trim();
  if (!sdkKey) {
    console.error("Missing CROO_SDK_KEY. Copy .env.example → .env");
    process.exit(1);
  }

  const baseURL = process.env.CROO_API_URL ?? "https://api.croo.network";
  const wsURL = process.env.CROO_WS_URL ?? "wss://api.croo.network/ws";
  const rpcURL = process.env.BASE_RPC_URL ?? "https://mainnet.base.org";

  const { AgentClient, EventType, DeliverableType } = await import("@croo-network/sdk");

  const client = new AgentClient({ baseURL, wsURL, rpcURL }, sdkKey);
  const stream = await client.connectWebSocket();

  console.log("╔══════════════════════════════════════╗");
  console.log("║   Corrix  ·  CAP provider online     ║");
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
        result?.order?.orderId ??
        (result as { orderId?: string })?.orderId ??
        "(created)";
      console.log(`[neg] order ${orderId}`);
    } catch (err) {
      console.error("[neg] accept failed", err instanceof Error ? err.message : err);
    }
  });

  stream.on(EventType.OrderPaid, async (e: { order_id?: string; negotiation_id?: string }) => {
    const orderId = e.order_id;
    if (!orderId) return;

    if (delivered.has(orderId) || inFlight.has(orderId)) {
      console.log(`[order] skip ${orderId} (already handled)`);
      return;
    }
    inFlight.add(orderId);

    console.log(`[order] paid ${orderId} — verifying…`);
    try {
      const order = (await client.getOrder(orderId)) as unknown as Record<string, unknown>;

      let negotiation: Record<string, unknown> | null = null;
      const negotiationId =
        (order.negotiationId as string | undefined) ??
        (order.negotiation_id as string | undefined) ??
        e.negotiation_id;

      if (negotiationId) {
        try {
          negotiation = (await client.getNegotiation(negotiationId)) as unknown as Record<
            string,
            unknown
          >;
        } catch {
          /* optional fallback */
        }
      }

      let receipt: VerifyReceipt;
      try {
        const raw = extractRequirements(order, negotiation);
        const req = parseRequirements(raw);
        receipt = await verifyClaim(req);
      } catch (parseErr) {
        const reason = parseErr instanceof Error ? parseErr.message : "invalid requirements";
        console.error(`[order] reject ${orderId}: ${reason}`);
        await client.rejectOrder(orderId, reason);
        return;
      }

      printReceipt(receipt);

      // SDK DeliverOrderRequest: deliverableSchema must be a string
      const schemaJson = JSON.stringify(receipt);
      let deliveredOk = false;

      try {
        const result = await client.deliverOrder(orderId, {
          deliverableType: DeliverableType.Schema,
          deliverableSchema: schemaJson,
        });
        console.log(
          `[order] delivered ${orderId} · schema · tx ${result?.txHash ?? "ok"} · ${receipt.verdict} · ${receipt.contentHash.slice(0, 12)}…\n`,
        );
        deliveredOk = true;
      } catch (schemaErr) {
        console.warn(
          `[order] schema deliver failed, trying text:`,
          schemaErr instanceof Error ? schemaErr.message : schemaErr,
        );
        try {
          const result = await client.deliverOrder(orderId, {
            deliverableType: DeliverableType.Text,
            deliverableText: schemaJson,
          });
          console.log(
            `[order] delivered ${orderId} · text · tx ${result?.txHash ?? "ok"} · ${receipt.verdict} · ${receipt.contentHash.slice(0, 12)}…\n`,
          );
          deliveredOk = true;
        } catch (textErr) {
          throw textErr;
        }
      }

      if (deliveredOk) delivered.add(orderId);
    } catch (err) {
      console.error(`[order] handle failed ${orderId}`, err instanceof Error ? err.message : err);
      try {
        await client.rejectOrder(
          orderId,
          err instanceof Error ? err.message.slice(0, 200) : "verification failed",
        );
      } catch {
        /* ignore secondary failure */
      }
    } finally {
      inFlight.delete(orderId);
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
    stream.on(ev, (e: { order_id?: string; negotiation_id?: string; type?: string }) => {
      const id = e?.order_id ?? e?.negotiation_id ?? "";
      console.log(`[event] ${String(ev)}${id ? ` ${id}` : ""}`);
    });
  }

  process.on("SIGINT", () => {
    console.log("\nShutting down Corrix provider…");
    stream.close();
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    stream.close();
    process.exit(0);
  });
}

if (LOCAL) {
  runLocal().catch((e) => {
    console.error(e);
    process.exit(1);
  });
} else {
  runLive().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
