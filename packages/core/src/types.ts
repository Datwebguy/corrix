/** Corrix verification contracts — CAP Schema I/O */

export type Verdict = "support" | "refute" | "unclear" | "partial";

export type CheckStatus = "pass" | "fail" | "warn" | "skip";

export interface VerifyRequest {
  /** Primary claim or statement to evaluate */
  claim: string;
  /** Supporting or opposing sources (URLs or plain evidence text) */
  sources: string[];
  /** Optional free-form context from the hiring agent */
  context?: string;
  /** Optional deliverable text another agent produced (output check mode) */
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
  mode: "heuristic" | "llm" | "hybrid";
}

/** JSON Schema-ish docs for CROO Agent Store service config */
export const VERIFY_REQUIREMENTS_SCHEMA = {
  type: "object",
  required: ["claim", "sources"],
  properties: {
    claim: { type: "string", minLength: 8, description: "Claim or statement to verify" },
    sources: {
      type: "array",
      items: { type: "string" },
      minItems: 1,
      description: "URLs or evidence snippets",
    },
    context: { type: "string", description: "Optional context from the hiring agent" },
    deliverable: {
      type: "string",
      description: "Optional agent output to check against claim/sources",
    },
  },
} as const;

export const VERIFY_DELIVERABLE_SCHEMA = {
  type: "object",
  required: ["version", "verdict", "confidence", "summary", "contentHash", "checks"],
  properties: {
    version: { type: "string" },
    agent: { type: "string" },
    verdict: { type: "string", enum: ["support", "refute", "unclear", "partial"] },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    summary: { type: "string" },
    claim: { type: "string" },
    checks: { type: "array" },
    sourcesAnalyzed: { type: "number" },
    contentHash: { type: "string" },
    createdAt: { type: "string" },
    latencyMs: { type: "number" },
    mode: { type: "string" },
  },
} as const;
