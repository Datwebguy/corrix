/**
 * Corrix CAP Requester — hire the live verify service (A2A)
 *
 * SDK: negotiateOrder, payOrder, getDelivery, EventType.OrderCreated / OrderCompleted
 */
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(__dirname, "../../../.env") });
loadEnv();

async function main(): Promise<void> {
  const sdkKey = process.env.CROO_REQUESTER_SDK_KEY?.trim();
  const serviceId = process.env.CROO_TARGET_SERVICE_ID?.trim();
  const baseURL = process.env.CROO_API_URL ?? "https://api.croo.network";
  const wsURL = process.env.CROO_WS_URL ?? "wss://api.croo.network/ws";

  if (!sdkKey) {
    console.error("Missing CROO_REQUESTER_SDK_KEY (buyer agent). Do not reuse the provider key.");
    process.exit(1);
  }
  if (!serviceId) {
    console.error("Missing CROO_TARGET_SERVICE_ID (Corrix verify service UUID).");
    process.exit(1);
  }

  const { AgentClient, EventType } = await import("@croo-network/sdk");
  const client = new AgentClient({ baseURL, wsURL }, sdkKey);
  const stream = await client.connectWebSocket();

  console.log("╔══════════════════════════════════════╗");
  console.log("║   Corrix  ·  CAP requester (hire)    ║");
  console.log("╚══════════════════════════════════════╝");
  console.log(`Service: ${serviceId}\n`);

  // Stronger sample so the engine has real lexical support (honest product path)
  const requirements = JSON.stringify({
    claim:
      "CROO Agent Protocol enables agents to hire and pay each other with USDC settlement on Base",
    sources: [
      "https://docs.croo.network/developer-docs/quick-start",
      "https://cap.croo.network/",
      "Official CAP documentation confirms agents negotiate, lock USDC in escrow, deliver verifiable results, and settle on Base. Evidence supports hire-and-pay agent commerce.",
    ],
    context: "Live A2A hire from Corrix-Requester",
    deliverable:
      "Brief: CAP is the commerce layer where agents hire providers and settle paid orders in USDC on Base after delivery proofs.",
  });

  let paid = false;
  let done = false;

  const finish = (code: number) => {
    if (done) return;
    done = true;
    try {
      stream.close();
    } catch {
      /* ignore */
    }
    process.exit(code);
  };

  stream.on(EventType.OrderCreated, async (e: { order_id?: string }) => {
    const orderId = e.order_id;
    if (!orderId || paid) return;
    paid = true;
    console.log(`[order] created ${orderId} — paying…`);
    try {
      const result = await client.payOrder(orderId);
      console.log(`[order] paid tx:`, result?.txHash ?? result);
    } catch (err) {
      console.error("[order] pay failed", err instanceof Error ? err.message : err);
      finish(1);
    }
  });

  stream.on(EventType.OrderCompleted, async (e: { order_id?: string }) => {
    const orderId = e.order_id;
    if (!orderId) return;
    try {
      const delivery = await client.getDelivery(orderId);
      console.log("\n—— Delivery ——");
      console.log(JSON.stringify(delivery, null, 2));

      // Parse nested schema string if present
      const schema = (delivery as { deliverableSchema?: string })?.deliverableSchema;
      if (typeof schema === "string" && schema.startsWith("{")) {
        try {
          const receipt = JSON.parse(schema) as { verdict?: string; confidence?: number; contentHash?: string };
          console.log(
            `\nReceipt: verdict=${receipt.verdict} confidence=${receipt.confidence} hash=${receipt.contentHash?.slice(0, 16)}…`,
          );
        } catch {
          /* raw print above is enough */
        }
      }

      console.log("\n✓ A2A hire complete");
      finish(0);
    } catch (err) {
      console.error("[order] getDelivery failed", err instanceof Error ? err.message : err);
      finish(1);
    }
  });

  stream.on(EventType.OrderRejected, (e: unknown) => {
    console.error("[order] rejected", e);
    finish(1);
  });

  stream.on(EventType.OrderExpired, (e: unknown) => {
    console.error("[order] expired", e);
    finish(1);
  });

  // Safety timeout (SLA window can be long; fail hire script if stuck)
  setTimeout(() => {
    if (!done) {
      console.error("[timeout] No completion within 3 minutes — is the provider online?");
      finish(1);
    }
  }, 180_000);

  const neg = await client.negotiateOrder({ serviceId, requirements });
  console.log("Negotiation:", neg?.negotiationId ?? neg);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
