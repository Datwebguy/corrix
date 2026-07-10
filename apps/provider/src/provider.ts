/**
 * Corrix CAP Provider, live worker
 *
 * Handles both:
 * - Structured A2A hires (claim + sources JSON)
 * - CROO Agent Store chat hires (often empty requirements / missed order_paid)
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
  type VerifyRequest,
} from "@corrix/core";

const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(__dirname, "../../../.env") });
loadEnv(); // also allow cwd .env

const LOCAL = process.env.LOCAL === "1" || process.env.LOCAL === "true"
  || process.env.MOCK === "1" || process.env.MOCK === "true";

/** Prevent concurrent double-delivery on the same order */
const inFlight = new Set<string>();
const delivered = new Set<string>();
/** Polls already scheduled for order_created → paid recovery */
const polling = new Set<string>();

const PAID_STATUSES = new Set([
  "paid",
  "delivering",
  "Paid",
  "Delivering",
]);

const TERMINAL_STATUSES = new Set([
  "completed",
  "rejected",
  "expired",
  "pay_failed",
  "deliver_failed",
  "create_failed",
  "Completed",
  "Rejected",
  "Expired",
]);

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
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

function isEmptyReq(v: unknown): boolean {
  if (v == null) return true;
  if (typeof v === "string") return v.trim() === "" || v.trim() === "{}";
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    return Object.keys(o).length === 0;
  }
  return false;
}

/**
 * Pull requirements from Order / Negotiation shapes returned by the SDK.
 * Store chat hires often leave requirements empty — we still return something
 * usable (never throw solely for missing fields).
 */
function extractRequirementsRaw(
  order: Record<string, unknown>,
  negotiation?: Record<string, unknown> | null,
): unknown {
  const candidates: unknown[] = [
    negotiation?.requirements,
    negotiation?.Requirements,
    order.requirements,
    order.Requirements,
    order.requirement,
    (order.data as Record<string, unknown> | undefined)?.requirements,
    negotiation?.metadata,
    order.metadata,
    (negotiation as { message?: unknown } | null)?.message,
    (order as { input?: unknown }).input,
    (order as { description?: unknown }).description,
  ];

  for (const c of candidates) {
    if (!isEmptyReq(c)) return c;
  }

  // Last resort: scan keys
  for (const src of [order, negotiation].filter(Boolean) as Record<string, unknown>[]) {
    for (const [k, v] of Object.entries(src)) {
      if (
        /require|claim|input|payload|body|prompt|query|message/i.test(k) &&
        !isEmptyReq(v)
      ) {
        return v;
      }
    }
  }

  return null;
}

/**
 * Build a VerifyRequest that always works for Store-style empty hires.
 * Honest "unclear" when no claim/sources — still deliverable so orders complete.
 */
function toVerifyRequest(
  raw: unknown,
  order: Record<string, unknown>,
  negotiation?: Record<string, unknown> | null,
): VerifyRequest {
  if (raw != null && !isEmptyReq(raw)) {
    try {
      return parseRequirements(raw);
    } catch (err) {
      // Free-text or partial payload from Store chat
      if (typeof raw === "string" && raw.trim().length >= 3) {
        return {
          claim: raw.trim().slice(0, 2000),
          sources: ["(no structured sources — free-text hire from Agent Store)"],
          context: "store_hire_freetext",
        };
      }
      console.warn(
        "[order] parse failed, using store fallback:",
        err instanceof Error ? err.message : err,
      );
    }
  }

  // Try to invent a short claim from service/order ids for audit trail
  const serviceId = String(
    order.serviceId ?? order.service_id ?? negotiation?.serviceId ?? "",
  ).slice(0, 8);
  const orderId = String(order.orderId ?? order.order_id ?? "").slice(0, 8);

  console.log(
    `[order] empty requirements (Store hire) · service~${serviceId || "?"} order~${orderId || "?"} · delivering honest unclear receipt`,
  );

  return {
    claim:
      "Agent Store hire did not attach a claim or sources. Corrix cannot corroborate a specific statement without input from the requester.",
    sources: [
      "(no sources provided — CROO Agent Store hire UI did not send requirements)",
    ],
    context: "store_hire_empty_requirements",
  };
}

export async function runLocal(): Promise<void> {
  console.log("╔══════════════════════════════════════╗");
  console.log("║   Corrix  ·  local engine mode       ║");
  console.log("╚══════════════════════════════════════╝");
  console.log("No CAP keys required. Running engine only.\n");

  const sample = {
    claim:
      "CROO Agent Protocol enables agents to hire and pay each other in USDC on Base",
    sources: [
      "https://cap.croo.network/",
      "CAP standardizes discovery, orders, delivery proofs, and on chain settlement. Agents can hire other agents and settle in USDC. Evidence confirms this.",
    ],
    deliverable:
      "Research brief: CAP is the commerce layer for A2A paid orders on CROO, settling USDC on Base.",
  };

  const receipt = await verifyClaim(sample);
  printReceipt(receipt);

  // Store-empty path smoke test
  const empty = await verifyClaim(
    toVerifyRequest(null, { orderId: "local-test" }, null),
  );
  console.log("\nStore-empty path:", empty.verdict, empty.confidence);

  console.log("\n✓ Local engine OK. Use npm run provider (with CROO_SDK_KEY) for live CAP.");
}

export async function runLive(): Promise<void> {
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
  console.log("Listening for negotiations & paid orders…");
  console.log("Store hires: empty requirements → honest unclear receipt; poll if order_paid missed\n");

  async function deliverReceipt(orderId: string, receipt: VerifyReceipt): Promise<boolean> {
    const schemaJson = JSON.stringify(receipt);
    try {
      const result = await client.deliverOrder(orderId, {
        deliverableType: DeliverableType.Schema,
        deliverableSchema: schemaJson,
      });
      console.log(
        `[order] delivered ${orderId} · schema · tx ${result?.txHash ?? "ok"} · ${receipt.verdict} · ${receipt.contentHash.slice(0, 12)}…\n`,
      );
      return true;
    } catch (schemaErr) {
      console.warn(
        `[order] schema deliver failed, trying text:`,
        schemaErr instanceof Error ? schemaErr.message : schemaErr,
      );
      const result = await client.deliverOrder(orderId, {
        deliverableType: DeliverableType.Text,
        deliverableText: schemaJson,
      });
      console.log(
        `[order] delivered ${orderId} · text · tx ${result?.txHash ?? "ok"} · ${receipt.verdict} · ${receipt.contentHash.slice(0, 12)}…\n`,
      );
      return true;
    }
  }

  /**
   * Fulfill a paid order: extract or synthesize requirements → verify → deliver.
   * Never hang forever for missing claim form.
   * @param forcePaid — true when OrderPaid WS event already confirmed payment
   */
  async function fulfillPaidOrder(
    orderId: string,
    negotiationIdHint?: string,
    forcePaid = false,
  ): Promise<void> {
    if (delivered.has(orderId) || inFlight.has(orderId)) {
      console.log(`[order] skip ${orderId} (already handled)`);
      return;
    }
    inFlight.add(orderId);

    console.log(`[order] fulfill ${orderId}, verifying…`);
    try {
      // Always re-fetch status. CAP only accepts deliver when status is paid
      // (payTxHash / UI "LOCK" can appear slightly before status flips).
      let order = (await client.getOrder(orderId)) as unknown as Record<string, unknown>;
      let status = String(order.status ?? "");
      let statusLower = status.toLowerCase();

      const isDeliverable = (s: string) => {
        const l = s.toLowerCase();
        return l === "paid" || l === "delivering";
      };

      if (!isDeliverable(status)) {
        // Brief wait — escrow lock often races ahead of status=paid
        if (forcePaid || order.paidAt || order.payTxHash) {
          for (let w = 0; w < 8 && !isDeliverable(status); w++) {
            await sleep(1500);
            order = (await client.getOrder(orderId)) as unknown as Record<string, unknown>;
            status = String(order.status ?? "");
            statusLower = status.toLowerCase();
            console.log(`[order] wait paid ${orderId} status=${status} try=${w + 1}`);
          }
        }
      }

      if (!isDeliverable(status)) {
        console.log(
          `[order] ${orderId} status=${status} not deliverable yet (need paid), skip`,
        );
        return;
      }

      let negotiation: Record<string, unknown> | null = null;
      const negotiationId =
        (order.negotiationId as string | undefined) ??
        (order.negotiation_id as string | undefined) ??
        negotiationIdHint;

      if (negotiationId) {
        try {
          negotiation = (await client.getNegotiation(negotiationId)) as unknown as Record<
            string,
            unknown
          >;
        } catch {
          /* optional */
        }
      }

      const raw = extractRequirementsRaw(order, negotiation);
      const req = toVerifyRequest(raw, order, negotiation);
      const receipt = await verifyClaim(req);
      printReceipt(receipt);

      const ok = await deliverReceipt(orderId, receipt);
      if (ok) delivered.add(orderId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[order] handle failed ${orderId}`, msg);

      // Never reject for "not paid yet" — poll / order_paid will retry
      if (/only be delivered when status is paid|INVALID_STATUS/i.test(msg)) {
        console.warn(`[order] ${orderId} deliver too early, will retry via poll`);
        return;
      }

      try {
        await client.rejectOrder(orderId, msg.slice(0, 200));
      } catch {
        /* ignore secondary failure */
      }
    } finally {
      inFlight.delete(orderId);
    }
  }

  /**
   * Store / CAP sometimes drop order_paid WS events.
   * Poll order status after create and fulfill when paid.
   */
  function schedulePaidPoll(orderId: string, negotiationId?: string): void {
    if (!orderId || orderId === "(created)" || polling.has(orderId) || delivered.has(orderId)) {
      return;
    }
    polling.add(orderId);

    void (async () => {
      console.log(`[poll] watch paid status for ${orderId}`);
      // ~5 minutes: 60 × 5s
      for (let i = 0; i < 60; i++) {
        if (delivered.has(orderId)) {
          console.log(`[poll] ${orderId} already delivered, stop`);
          return;
        }
        try {
          const order = await client.getOrder(orderId);
          const status = String(order.status ?? "");
          const statusLower = status.toLowerCase();
          // Only fulfill when API says paid — UI LOCK can lag status
          const paid = statusLower === "paid" || statusLower === "delivering";

          if (paid) {
            console.log(`[poll] ${orderId} is paid (status=${status}), fulfilling`);
            await fulfillPaidOrder(orderId, negotiationId ?? order.negotiationId, true);
            return;
          }

          // Escrow signals without status=paid yet — keep polling
          if (order.paidAt || order.payTxHash) {
            if (i === 0 || i % 3 === 0) {
              console.log(
                `[poll] ${orderId} has pay signal but status=${status}, waiting…`,
              );
            }
          }

          if (TERMINAL_STATUSES.has(status)) {
            console.log(`[poll] ${orderId} terminal status=${status}, stop`);
            return;
          }

          if (i === 0 || i % 6 === 0) {
            console.log(`[poll] ${orderId} status=${status} (attempt ${i + 1}/60)`);
          }
        } catch (err) {
          console.warn(
            `[poll] getOrder ${orderId} failed:`,
            err instanceof Error ? err.message : err,
          );
        }
        await sleep(5000);
      }
      console.warn(`[poll] ${orderId} timed out waiting for paid`);
    })().finally(() => {
      polling.delete(orderId);
    });
  }

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

      if (orderId && orderId !== "(created)") {
        // Start poll early — Store may pay without emitting order_paid to us
        schedulePaidPoll(orderId, negotiationId);
      }
    } catch (err) {
      console.error("[neg] accept failed", err instanceof Error ? err.message : err);
    }
  });

  stream.on(EventType.OrderPaid, async (e: { order_id?: string; negotiation_id?: string }) => {
    const orderId = e.order_id;
    if (!orderId) return;
    console.log(`[event] order_paid ${orderId}`);
    await fulfillPaidOrder(orderId, e.negotiation_id, true);
  });

  stream.on(EventType.OrderCreated, async (e: { order_id?: string; negotiation_id?: string }) => {
    const orderId = e.order_id;
    if (!orderId) return;
    console.log(`[event] order_created ${orderId}`);
    schedulePaidPoll(orderId, e.negotiation_id);

    // If already paid by the time we see create, fulfill immediately
    try {
      const order = await client.getOrder(orderId);
      const status = String(order.status ?? "").toLowerCase();
      if (status === "paid" || status === "delivering") {
        console.log(`[event] order_created but already paid ${orderId}`);
        await fulfillPaidOrder(orderId, e.negotiation_id ?? order.negotiationId, true);
      }
    } catch {
      /* poll will retry */
    }
  });

  for (const ev of [
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

  // Catch-up: any already-paid open orders (e.g. provider restarted mid-hire)
  try {
    const open = await client.listOrders({
      status: "paid",
      pageSize: 20,
      role: "provider",
    });
    for (const o of open ?? []) {
      if (o.orderId && !delivered.has(o.orderId)) {
        console.log(`[catchup] paid order ${o.orderId}`);
        await fulfillPaidOrder(o.orderId, o.negotiationId, true);
      }
    }
  } catch (err) {
    console.warn(
      "[catchup] listOrders paid skipped:",
      err instanceof Error ? err.message : err,
    );
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

/** Only auto-start when this file is the process entry (not when Fly imports it). */
const entry = (process.argv[1] ?? "").replace(/\\/g, "/");
const launchedAsProvider = /\/provider\.[cm]?[jt]s$/.test(entry);

if (launchedAsProvider) {
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
}
