/** Browser-safe Corrix verification engine (console UI) */

export type Verdict = "support" | "refute" | "unclear" | "partial";
export type CheckStatus = "pass" | "fail" | "warn" | "skip";

export interface VerifyRequest {
  claim: string;
  sources: string[];
  deliverable?: string;
}

export interface CheckResult {
  id: string;
  label: string;
  status: CheckStatus;
  detail: string;
  score?: number;
}

export interface VerifyReceipt {
  version: "1.0";
  agent: "corrix";
  verdict: Verdict;
  confidence: number;
  summary: string;
  claim: string;
  checks: CheckResult[];
  sourcesAnalyzed: number;
  contentHash: string;
  createdAt: string;
  latencyMs: number;
  mode: "heuristic";
}

export type CapStep = "idle" | "negotiate" | "lock" | "deliver" | "clear";

const STOP = new Set([
  "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of",
  "is", "are", "was", "were", "be", "been", "being", "that", "this", "with",
  "as", "by", "from", "it", "its", "not", "no", "yes", "has", "have", "had",
  "will", "would", "can", "could", "should", "may", "might", "than", "then",
]);

const NEGATION = [
  "not", "no", "never", "none", "false", "incorrect", "wrong", "deny",
  "refute", "debunk", "hoax", "fake", "untrue", "disproven", "contradicts",
];

const SUPPORT = [
  "confirms", "confirmed", "supports", "supported", "true", "correct",
  "verified", "evidence", "demonstrates", "shows", "according to", "study",
  "report", "official", "data", "proven", "validates",
];

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s%-]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOP.has(t));
}

async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(",")}}`;
}

export async function verifyClaim(req: VerifyRequest): Promise<VerifyReceipt> {
  const started = Date.now();
  const claim = req.claim.trim();
  const sources = req.sources.map((s) => s.trim()).filter(Boolean);
  const checks: CheckResult[] = [];

  const claimOk = claim.length >= 12 && claim.split(/\s+/).length >= 3;
  checks.push({
    id: "claim_quality",
    label: "Claim quality",
    status: claimOk ? "pass" : "warn",
    detail: claimOk ? `${claim.split(/\s+/).length} tokens` : "Claim is very short",
    score: claimOk ? 1 : 0.4,
  });

  const real = sources.filter((s) => !s.startsWith("(no"));
  checks.push({
    id: "sources_present",
    label: "Sources present",
    status: real.length === 0 ? "fail" : "pass",
    detail: real.length === 0 ? "No sources supplied" : `${real.length} source(s)`,
    score: real.length === 0 ? 0 : Math.min(1, real.length / 3),
  });

  const urls = sources.filter((s) => /^https?:\/\//i.test(s));
  const texts = sources.filter((s) => !/^https?:\/\//i.test(s) && !s.startsWith("(no"));
  checks.push({
    id: "source_shape",
    label: "Source shape",
    status: real.length === 0 ? "fail" : urls.length && !texts.length ? "warn" : "pass",
    detail: `${urls.length} URL(s), ${texts.length} snippet(s)`,
    score: real.length === 0 ? 0 : urls.length && !texts.length ? 0.55 : 0.9,
  });

  const claimTokens = new Set(tokenize(claim));
  const sourceTokens = new Set(tokenize(sources.join(" ")));
  let hit = 0;
  for (const t of claimTokens) if (sourceTokens.has(t)) hit++;
  const ratio = claimTokens.size ? hit / claimTokens.size : 0;
  checks.push({
    id: "lexical_overlap",
    label: "Lexical overlap",
    status: ratio >= 0.35 ? "pass" : ratio < 0.12 ? "fail" : "warn",
    detail: `${Math.round(ratio * 100)}% keyword overlap`,
    score: ratio,
  });

  const lower = sources.join("\n").toLowerCase();
  let neg = 0;
  let pos = 0;
  for (const w of NEGATION) if (lower.includes(w)) neg++;
  for (const w of SUPPORT) if (lower.includes(w)) pos++;
  const polarity = pos - neg;
  checks.push({
    id: "polarity",
    label: "Source polarity",
    status: polarity >= 2 ? "pass" : polarity <= -2 ? "fail" : "warn",
    detail:
      polarity >= 2
        ? `Support-leaning (${polarity})`
        : polarity <= -2
          ? `Refute-leaning (${polarity})`
          : "Mixed / neutral signals",
    score: Math.max(0, Math.min(1, 0.5 + polarity * 0.1)),
  });

  if (req.deliverable?.trim()) {
    const delTokens = new Set(tokenize(req.deliverable));
    let dHit = 0;
    for (const t of claimTokens) if (delTokens.has(t)) dHit++;
    const dRatio = claimTokens.size ? dHit / claimTokens.size : 0;
    checks.push({
      id: "deliverable",
      label: "Output consistency",
      status: dRatio >= 0.3 ? "pass" : dRatio >= 0.12 ? "warn" : "fail",
      detail: `${Math.round(dRatio * 100)}% alignment with claim`,
      score: dRatio,
    });
  } else {
    checks.push({
      id: "deliverable",
      label: "Output consistency",
      status: "skip",
      detail: "No deliverable, claim-only mode",
    });
  }

  const hosts = urls
    .map((u) => {
      try {
        return new URL(u).hostname;
      } catch {
        return "";
      }
    })
    .filter(Boolean);
  checks.push({
    id: "provenance",
    label: "URL provenance",
    status: !urls.length ? "skip" : hosts.length === urls.length ? "pass" : "warn",
    detail: !urls.length
      ? "No URLs"
      : `${hosts.length} valid · ${new Set(hosts).size} host(s)`,
    score: !urls.length ? undefined : hosts.length === urls.length ? 0.85 : 0.5,
  });

  const sourcesFail = checks.find((c) => c.id === "sources_present")?.status === "fail";
  const failCount = checks.filter((c) => c.status === "fail").length;
  const passCount = checks.filter((c) => c.status === "pass").length;
  const scored = checks.filter((c) => typeof c.score === "number");
  const avg =
    scored.length > 0 ? scored.reduce((a, c) => a + (c.score ?? 0), 0) / scored.length : 0.4;

  let verdict: Verdict = "unclear";
  if (sourcesFail) verdict = "unclear";
  else if (ratio >= 0.28 && polarity >= 0 && failCount <= 1) verdict = "support";
  else if (polarity <= -2 || (ratio < 0.12 && failCount >= 2)) verdict = "refute";
  else if (ratio >= 0.18 && failCount <= 2 && passCount >= 2) verdict = "partial";

  let confidence = avg;
  if (verdict === "support")
    confidence = Math.min(0.92, 0.45 + ratio * 0.5 + Math.max(0, polarity) * 0.05);
  if (verdict === "refute")
    confidence = Math.min(0.9, 0.4 + Math.abs(polarity) * 0.08 + (1 - ratio) * 0.2);
  if (verdict === "partial") confidence = Math.min(0.75, 0.35 + avg * 0.4);
  if (verdict === "unclear") confidence = Math.min(0.45, avg * 0.6);
  if (!claimOk) confidence = Math.min(confidence, 0.55);
  if (sourcesFail) confidence = 0.15;
  confidence = Math.round(confidence * 100) / 100;

  const short = claim.length > 100 ? `${claim.slice(0, 97)}…` : claim;
  const pct = Math.round(confidence * 100);
  const summary: Record<Verdict, string> = {
    support: `SUPPORTED (${pct}%). Sources align with: "${short}"`,
    refute: `REFUTED (${pct}%). Sources undermine: "${short}"`,
    partial: `PARTIAL (${pct}%). Mixed evidence for: "${short}"`,
    unclear: `UNCLEAR (${pct}%). Insufficient evidence for: "${short}"`,
  };

  const body = {
    version: "1.0" as const,
    agent: "corrix" as const,
    verdict,
    confidence,
    summary: summary[verdict],
    claim,
    checks,
    sourcesAnalyzed: sources.length,
    createdAt: new Date().toISOString(),
    latencyMs: Date.now() - started,
    mode: "heuristic" as const,
  };

  const contentHash = await sha256Hex(
    stableStringify({
      claim: body.claim,
      verdict: body.verdict,
      confidence: body.confidence,
      checks: body.checks,
      sourcesAnalyzed: body.sourcesAnalyzed,
    }),
  );

  return { ...body, contentHash };
}

export const EXAMPLES = [
  {
    label: "Supported claim",
    claim:
      "CROO Agent Protocol enables agents to hire and pay each other in USDC on Base",
    sources: [
      "https://cap.croo.network/",
      "CAP standardizes discovery, orders, delivery proofs, and on chain settlement. Agents hire other agents and settle USDC. Evidence confirms this.",
    ],
    deliverable:
      "CAP is the commerce layer for A2A paid orders on CROO, settling USDC on Base.",
  },
  {
    label: "Refuted claim",
    claim: "Bitcoin was invented in 2020 by a Fortune 500 company",
    sources: [
      "This claim is false and incorrect. Historical records refute it: Bitcoin whitepaper 2008, never a Fortune 500 invention.",
    ],
    deliverable: "",
  },
  {
    label: "Insufficient sources",
    claim: "Agent XYZ has perfect accuracy on every market prediction ever made",
    sources: [],
    deliverable: "",
  },
] as const;
