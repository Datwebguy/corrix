/**
 * Fly entry: tiny HTTP health server + CAP provider.
 * Health keeps the machine checkable; provider is the real work.
 */
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 8080);

let providerReady = false;
let lastError: string | null = null;

const server = createServer((req, res) => {
  if (req.url === "/health" || req.url === "/") {
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

server.listen(port, "0.0.0.0", () => {
  console.log(`[fly] health listening on :${port}`);
});

const providerEntry = resolve(__dirname, "provider.ts");
const child = spawn("npx", ["tsx", providerEntry], {
  stdio: "inherit",
  env: process.env,
  shell: true,
  cwd: resolve(__dirname, "../../.."),
});

providerReady = true;

child.on("error", (err) => {
  lastError = err.message;
  providerReady = false;
  console.error("[fly] provider failed to start", err);
});

child.on("exit", (code, signal) => {
  providerReady = false;
  lastError = `provider exited code=${code} signal=${signal}`;
  console.error("[fly]", lastError);
  // Exit so Fly restarts the machine
  process.exit(code ?? 1);
});

process.on("SIGTERM", () => {
  child.kill("SIGTERM");
  server.close();
});
