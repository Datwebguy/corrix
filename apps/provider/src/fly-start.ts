/**
 * Fly entry: single Node process — HTTP health + CAP provider (no child spawn).
 * Dual processes + tsx under 256MB were OOM-killed repeatedly.
 */
import { createServer } from "node:http";
import { runLive } from "./provider.ts";

const port = Number(process.env.PORT || 8080);

let providerReady = false;
let lastError: string | null = null;

const server = createServer((req, res) => {
  if (req.url === "/health" || req.url === "/") {
    // Process is up if we can answer. Surface CAP connect state for ops.
    const ok = providerReady && !lastError;
    res.writeHead(ok ? 200 : 503, { "content-type": "application/json" });
    res.end(
      JSON.stringify({
        service: "corrix-provider",
        ok,
        provider: providerReady ? "running" : "starting",
        error: lastError,
      }),
    );
    return;
  }
  res.writeHead(404);
  res.end("not found");
});

await new Promise<void>((resolve) => {
  server.listen(port, "0.0.0.0", () => {
    console.log(`[fly] health listening on :${port}`);
    resolve();
  });
});

try {
  // Mark ready as soon as listen works; CAP connect is async but process is live.
  // Health checks must not kill us while WebSocket is connecting.
  providerReady = true;
  await runLive();
} catch (err) {
  lastError = err instanceof Error ? err.message : String(err);
  providerReady = false;
  console.error("[fly] provider failed", lastError);
  // Keep health server up briefly so logs are readable, then exit for Fly restart
  setTimeout(() => process.exit(1), 2000);
}

process.on("SIGTERM", () => {
  server.close();
  process.exit(0);
});
