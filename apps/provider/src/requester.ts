/**
 * Corrix A2A Requester demo
 * Second agent hires the Corrix verify service and pays in USDC.
 *
 * SDK methods:
 * - negotiateOrder({ serviceId, requirements })
 * - payOrder(orderId)
 * - getDelivery(orderId)
 * - EventType.OrderCreated / OrderCompleted
 */
import "dotenv/config";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(__dirname, "../../../.env") });

async function main(): Promise<void> {
  const sdkKey = process.env.CROO_REQUESTER_SDK_KEY ?? process.env.CROO_SDK_KEY;
  const serviceId = process.env.CROO_TARGET_SERVICE_ID;
  const baseURL = process.env.CROO_API_URL ?? "https://api.croo.network";
  const wsURL = process.env.CROO_WS_URL ?? "wss://api.croo.network/ws";

  if (!sdkKey || !serviceId) {
    console.error("Need CROO_REQUESTER_SDK_KEY (or CROO_SDK_KEY) and CROO_TARGET_SERVICE_ID");
    process.exit(1);
  }

  const { AgentClient, EventType } = await import("@croo-network/sdk");
  const client = new AgentClient({ baseURL, wsURL }, sdkKey);
  const stream = await client.connectWebSocket();

  console.log("╔══════════════════════════════════════╗");
  console.log("║   Corrix  ·  A2A requester demo     ║");
  console.log("╚══════════════════════════════════════╝");
  console.log(`Hiring service: ${serviceId}\n`);

  const requirements = JSON.stringify({
    claim: "CAP orders settle USDC on Base with verifiable delivery before payout",
    sources: [
      "https://docs.croo.network/developer-docs/quick-start",
      "CROO CAP: negotiate, lock escrow, deliver proof, then clear settlement. Confirmed by protocol docs.",
    ],
    context: "A2A smoke test from Corrix requester",
  });

  stream.on(EventType.OrderCreated, async (e: { order_id?: string }) => {
    const orderId = e.order_id;
    if (!orderId) return;
    console.log(`[order] created ${orderId} — paying…`);
    try {
      const paid = await client.payOrder(orderId);
      console.log(`[order] paid tx:`, (paid as { txHash?: string }).txHash ?? paid);
    } catch (err) {
      console.error("[order] pay failed", err);
      stream.close();
      process.exit(1);
    }
  });

  stream.on(EventType.OrderCompleted, async (e: { order_id?: string }) => {
    const orderId = e.order_id;
    if (!orderId) return;
    try {
      const delivery = await client.getDelivery(orderId);
      console.log("\n—— Delivery ——");
      console.log(JSON.stringify(delivery, null, 2));
      console.log("\n✓ A2A hire complete");
    } catch (err) {
      console.error("[order] getDelivery failed", err);
    } finally {
      stream.close();
      process.exit(0);
    }
  });

  stream.on(EventType.OrderRejected, (e: unknown) => {
    console.error("[order] rejected", e);
    stream.close();
    process.exit(1);
  });

  const neg = await client.negotiateOrder({ serviceId, requirements });
  console.log("Negotiation:", (neg as { negotiationId?: string }).negotiationId ?? neg);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
