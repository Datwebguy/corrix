import { contentHash } from "./hash.js";
import type { CheckResult, Verdict, VerifyReceipt, VerifyRequest } from "./types.js";

const STOP = new Set([
  "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of",
  "is", "are", "was", "were", "be", "been", "being", "that", "this", "with",
  "as", "by", "from", "it", "its", "not", "no", "yes", "has", "have", "had",
  "will", "would", "can", "could", "should", "may", "might", "than", "then",
  "into", "about", "over", "under", "after", "before", "between", "through",
]);

const NEGATION = [
  "not", "no", "never", "none", "false", "incorrect", "wrong", "deny",
  "denies", "refute", "refutes", "debunk", "hoax", "fake", "untrue",
  "disproven", "contradicts", "contrary",
];

const SUPPORT_MARKERS = [
  "confirms", "confirmed", "supports", "supported", "true", "correct",
  "verified", "evidence", "demonstrates", "shows", "according to", "study",
  "report", "official", "data", "proven", "validates",
];

/**
 * Heuristic claim verifier — deterministic, no API keys required for MVP.
 * Produces structured checks other CAP agents can consume before settlement.
 */
export async function verifyClaim(req: VerifyRequest): Promise<VerifyReceipt> {
  const started = Date.now();
  const claim = req.claim.trim();
  const sources = req.sources.map((s) => s.trim()).filter(Boolean);
  const checks: CheckResult[] = [];

  // 1) Input quality
  checks.push(checkClaimLength(claim));
  checks.push(checkSourcePresence(sources));
  checks.push(checkSourceShape(sources));

  // 2) Lexical overlap claim ↔ sources
  const overlap = claimSourceOverlap(claim, sources);
  checks.push(overlap.check);

  // 3) Negation / support polarity in sources
  const polarity = sourcePolarity(sources.join("\n"));
  checks.push(polarity.check);

  // 4) Optional deliverable consistency (output check mode)
  if (req.deliverable?.trim()) {
    checks.push(deliverableConsistency(claim, req.deliverable.trim()));
  } else {
    checks.push({
      id: "deliverable",
      label: "Output consistency",
      status: "skip",
      detail: "No deliverable provided — claim-only verification",
    });
  }

  // 5) URL provenance signal
  checks.push(urlProvenance(sources));

  const { verdict, confidence } = scoreVerdict(checks, overlap.ratio, polarity.polarity);
  const summary = buildSummary(verdict, confidence, claim, checks);

  const body = {
    version: "1.0" as const,
    agent: "corrix" as const,
    verdict,
    confidence,
    summary,
    claim,
    checks,
    sourcesAnalyzed: sources.length,
    createdAt: new Date().toISOString(),
    latencyMs: Date.now() - started,
    mode: "heuristic" as const,
  };

  const hash = contentHash({
    claim: body.claim,
    verdict: body.verdict,
    confidence: body.confidence,
    checks: body.checks,
    sourcesAnalyzed: body.sourcesAnalyzed,
  });

  return { ...body, contentHash: hash };
}

function checkClaimLength(claim: string): CheckResult {
  const ok = claim.length >= 12 && claim.split(/\s+/).length >= 3;
  return {
    id: "claim_quality",
    label: "Claim quality",
    status: ok ? "pass" : "warn",
    detail: ok
      ? `Claim has ${claim.split(/\s+/).length} tokens`
      : "Claim is very short — confidence capped",
    score: ok ? 1 : 0.4,
  };
}

function checkSourcePresence(sources: string[]): CheckResult {
  const real = sources.filter((s) => !s.startsWith("(no sources"));
  if (real.length === 0) {
    return {
      id: "sources_present",
      label: "Sources present",
      status: "fail",
      detail: "No sources supplied — cannot support or refute",
      score: 0,
    };
  }
  return {
    id: "sources_present",
    label: "Sources present",
    status: "pass",
    detail: `${real.length} source(s) provided`,
    score: Math.min(1, real.length / 3),
  };
}

function checkSourceShape(sources: string[]): CheckResult {
  const urls = sources.filter((s) => /^https?:\/\//i.test(s));
  const texts = sources.filter((s) => !/^https?:\/\//i.test(s) && !s.startsWith("(no sources"));
  if (urls.length === 0 && texts.length === 0) {
    return {
      id: "source_shape",
      label: "Source shape",
      status: "fail",
      detail: "No usable sources",
      score: 0,
    };
  }
  if (urls.length > 0 && texts.length === 0) {
    return {
      id: "source_shape",
      label: "Source shape",
      status: "warn",
      detail: `${urls.length} URL(s) only — include quotes/snippets for stronger checks`,
      score: 0.55,
    };
  }
  return {
    id: "source_shape",
    label: "Source shape",
    status: "pass",
    detail: `${urls.length} URL(s), ${texts.length} text snippet(s)`,
    score: 0.9,
  };
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s%-]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOP.has(t));
}

function claimSourceOverlap(claim: string, sources: string[]): { ratio: number; check: CheckResult } {
  const claimTokens = new Set(tokenize(claim));
  if (claimTokens.size === 0) {
    return {
      ratio: 0,
      check: {
        id: "lexical_overlap",
        label: "Lexical overlap",
        status: "warn",
        detail: "Could not tokenize claim",
        score: 0.3,
      },
    };
  }
  const sourceTokens = new Set(tokenize(sources.join(" ")));
  let hit = 0;
  for (const t of claimTokens) {
    if (sourceTokens.has(t)) hit++;
  }
  const ratio = hit / claimTokens.size;
  let status: CheckResult["status"] = "warn";
  if (ratio >= 0.35) status = "pass";
  if (ratio < 0.12) status = "fail";
  return {
    ratio,
    check: {
      id: "lexical_overlap",
      label: "Lexical overlap",
      status,
      detail: `${Math.round(ratio * 100)}% of claim keywords appear in sources (${hit}/${claimTokens.size})`,
      score: ratio,
    },
  };
}

function sourcePolarity(text: string): { polarity: number; check: CheckResult } {
  const lower = text.toLowerCase();
  let neg = 0;
  let pos = 0;
  for (const w of NEGATION) if (lower.includes(w)) neg++;
  for (const w of SUPPORT_MARKERS) if (lower.includes(w)) pos++;
  const polarity = pos - neg;
  let status: CheckResult["status"] = "warn";
  let detail = "Neutral / mixed polarity signals in sources";
  if (polarity >= 2) {
    status = "pass";
    detail = `Support-leaning language detected (score ${polarity})`;
  } else if (polarity <= -2) {
    status = "fail";
    detail = `Refutation-leaning language detected (score ${polarity})`;
  }
  return {
    polarity,
    check: {
      id: "polarity",
      label: "Source polarity",
      status,
      detail,
      score: Math.max(0, Math.min(1, 0.5 + polarity * 0.1)),
    },
  };
}

function deliverableConsistency(claim: string, deliverable: string): CheckResult {
  const claimTokens = new Set(tokenize(claim));
  const delTokens = new Set(tokenize(deliverable));
  let hit = 0;
  for (const t of claimTokens) if (delTokens.has(t)) hit++;
  const ratio = claimTokens.size ? hit / claimTokens.size : 0;
  if (ratio >= 0.3) {
    return {
      id: "deliverable",
      label: "Output consistency",
      status: "pass",
      detail: `Deliverable aligns with claim keywords (${Math.round(ratio * 100)}%)`,
      score: ratio,
    };
  }
  if (ratio >= 0.12) {
    return {
      id: "deliverable",
      label: "Output consistency",
      status: "warn",
      detail: `Partial alignment between deliverable and claim (${Math.round(ratio * 100)}%)`,
      score: ratio,
    };
  }
  return {
    id: "deliverable",
    label: "Output consistency",
    status: "fail",
    detail: "Deliverable does not appear to address the claim",
    score: ratio,
  };
}

function urlProvenance(sources: string[]): CheckResult {
  const urls = sources.filter((s) => /^https?:\/\//i.test(s));
  if (urls.length === 0) {
    return {
      id: "provenance",
      label: "URL provenance",
      status: "skip",
      detail: "No URLs to inspect",
    };
  }
  const hosts = urls.map((u) => {
    try {
      return new URL(u).hostname;
    } catch {
      return "";
    }
  }).filter(Boolean);
  const unique = new Set(hosts);
  return {
    id: "provenance",
    label: "URL provenance",
    status: hosts.length === urls.length ? "pass" : "warn",
    detail: `${hosts.length} valid URL(s) across ${unique.size} host(s)`,
    score: hosts.length === urls.length ? 0.85 : 0.5,
  };
}

function scoreVerdict(
  checks: CheckResult[],
  overlap: number,
  polarity: number,
): { verdict: Verdict; confidence: number } {
  const sourcesFail = checks.find((c) => c.id === "sources_present")?.status === "fail";
  if (sourcesFail) {
    return { verdict: "unclear", confidence: 0.15 };
  }

  const failCount = checks.filter((c) => c.status === "fail").length;
  const passCount = checks.filter((c) => c.status === "pass").length;
  const scored = checks.filter((c) => typeof c.score === "number");
  const avg =
    scored.length > 0
      ? scored.reduce((a, c) => a + (c.score ?? 0), 0) / scored.length
      : 0.4;

  let verdict: Verdict = "unclear";
  if (overlap >= 0.28 && polarity >= 0 && failCount <= 1) {
    verdict = "support";
  } else if (polarity <= -2 || (overlap < 0.12 && failCount >= 2)) {
    verdict = "refute";
  } else if (overlap >= 0.18 && failCount <= 2 && passCount >= 2) {
    verdict = "partial";
  }

  let confidence = avg;
  if (verdict === "support") confidence = Math.min(0.92, 0.45 + overlap * 0.5 + Math.max(0, polarity) * 0.05);
  if (verdict === "refute") confidence = Math.min(0.9, 0.4 + Math.abs(polarity) * 0.08 + (1 - overlap) * 0.2);
  if (verdict === "partial") confidence = Math.min(0.75, 0.35 + avg * 0.4);
  if (verdict === "unclear") confidence = Math.min(0.45, avg * 0.6);

  const claimWarn = checks.find((c) => c.id === "claim_quality")?.status === "warn";
  if (claimWarn) confidence = Math.min(confidence, 0.55);

  return { verdict, confidence: Math.round(confidence * 100) / 100 };
}

function buildSummary(
  verdict: Verdict,
  confidence: number,
  claim: string,
  checks: CheckResult[],
): string {
  const pct = Math.round(confidence * 100);
  const short = claim.length > 100 ? `${claim.slice(0, 97)}…` : claim;
  const fails = checks.filter((c) => c.status === "fail").map((c) => c.label);
  const tail = fails.length ? ` Flags: ${fails.join(", ")}.` : "";

  switch (verdict) {
    case "support":
      return `SUPPORTED (${pct}% confidence). Sources align with the claim: "${short}".${tail}`;
    case "refute":
      return `REFUTED (${pct}% confidence). Sources conflict with or undermine the claim: "${short}".${tail}`;
    case "partial":
      return `PARTIAL (${pct}% confidence). Mixed evidence for: "${short}".${tail}`;
    default:
      return `UNCLEAR (${pct}% confidence). Insufficient evidence to decide: "${short}".${tail}`;
  }
}
