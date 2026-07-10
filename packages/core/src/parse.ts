import type { VerifyRequest } from "./types.js";

export function parseRequirements(raw: unknown): VerifyRequest {
  let data: unknown = raw;

  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) {
      throw new Error("Empty requirements");
    }
    try {
      data = JSON.parse(trimmed);
    } catch {
      // Plain text claim fallback
      return {
        claim: trimmed,
        sources: ["(no sources provided — text-only request)"],
      };
    }
  }

  if (!data || typeof data !== "object") {
    throw new Error("Requirements must be a JSON object or claim string");
  }

  let obj = data as Record<string, unknown>;

  // Unwrap common nestings from CAP / SDK payloads
  if (obj.requirements != null && typeof obj.requirements === "object") {
    obj = obj.requirements as Record<string, unknown>;
  } else if (typeof obj.requirements === "string") {
    try {
      const inner = JSON.parse(obj.requirements) as unknown;
      if (inner && typeof inner === "object") obj = inner as Record<string, unknown>;
    } catch {
      /* keep outer */
    }
  }

  const claim = String(obj.claim ?? obj.statement ?? obj.text ?? "").trim();
  if (claim.length < 8) {
    throw new Error("claim is required (min 8 characters)");
  }

  let sources: string[] = [];
  if (Array.isArray(obj.sources)) {
    sources = obj.sources.map((s) => String(s).trim()).filter(Boolean);
  } else if (typeof obj.sources === "string" && obj.sources.trim()) {
    sources = [obj.sources.trim()];
  } else if (typeof obj.source === "string" && obj.source.trim()) {
    sources = [obj.source.trim()];
  }

  if (sources.length === 0) {
    sources = ["(no sources provided)"];
  }

  return {
    claim,
    sources,
    context: obj.context != null ? String(obj.context) : undefined,
    deliverable: obj.deliverable != null ? String(obj.deliverable) : undefined,
  };
}
