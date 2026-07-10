import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  EXAMPLES,
  verifyClaim,
  type CapStep,
  type CheckResult,
  type Verdict,
  type VerifyReceipt,
} from "../lib/verify";
import { LogoWord } from "../components/Logo";
import { FlowField } from "../components/FlowField";
import { SITE } from "../lib/site";

const CAP_STEPS: { id: CapStep; label: string }[] = [
  { id: "negotiate", label: "Start" },
  { id: "lock", label: "Check" },
  { id: "deliver", label: "Score" },
  { id: "clear", label: "Receipt" },
];

function ConfidenceRing({ value, verdict }: { value: number; verdict: Verdict }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - value);
  const colors: Record<Verdict, string> = {
    support: "#b8f24a",
    refute: "#ff6b5b",
    partial: "#7ec8e3",
    unclear: "#7a8f9a",
  };
  return (
    <svg className="confidence-ring" viewBox="0 0 56 56">
      <circle cx="28" cy="28" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
      <motion.circle
        cx="28"
        cy="28"
        r={r}
        fill="none"
        stroke={colors[verdict]}
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={c}
        initial={{ strokeDashoffset: c }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        transform="rotate(-90 28 28)"
      />
      <text
        x="28"
        y="31"
        textAnchor="middle"
        fill="currentColor"
        fontSize="11"
        fontWeight="700"
        fontFamily="DM Sans, sans-serif"
      >
        {Math.round(value * 100)}
      </text>
    </svg>
  );
}

function CheckList({ checks }: { checks: CheckResult[] }) {
  return (
    <div className="checks">
      {checks.map((c, i) => (
        <motion.div
          key={c.id}
          className="check-row"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.06 * i, duration: 0.3 }}
        >
          <span className={`check-status ${c.status}`}>{c.status}</span>
          <div>
            <strong>{c.label}</strong>
            <span>{c.detail}</span>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

/** Product console: free try engine, no login */
export function Console() {
  const reduceMotion = useReducedMotion();
  const [claim, setClaim] = useState("");
  const [sourcesText, setSourcesText] = useState("");
  const [deliverable, setDeliverable] = useState("");
  const [activeExample, setActiveExample] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [capStep, setCapStep] = useState<CapStep>("idle");
  const [receipt, setReceipt] = useState<VerifyReceipt | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stepIndex = useMemo(() => {
    const order: CapStep[] = ["negotiate", "lock", "deliver", "clear"];
    return order.indexOf(capStep);
  }, [capStep]);

  const canRun = claim.trim().length >= 8 && !loading;

  function loadExample(i: number) {
    const ex = EXAMPLES[i];
    setActiveExample(i);
    setClaim(ex.claim);
    setSourcesText(ex.sources.join("\n"));
    setDeliverable(ex.deliverable);
    setReceipt(null);
    setCapStep("idle");
    setError(null);
  }

  function clearForm() {
    setActiveExample(null);
    setClaim("");
    setSourcesText("");
    setDeliverable("");
    setReceipt(null);
    setCapStep("idle");
    setError(null);
  }

  async function runVerify() {
    if (!canRun) {
      setError("Enter a claim (at least a short sentence) before running.");
      return;
    }
    setLoading(true);
    setReceipt(null);
    setError(null);
    const sources = sourcesText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    const wait = (ms: number) =>
      new Promise((r) => setTimeout(r, reduceMotion ? 0 : ms));

    try {
      setCapStep("negotiate");
      await wait(280);
      setCapStep("lock");
      await wait(300);
      setCapStep("deliver");
      const result = await verifyClaim({
        claim,
        sources: sources.length ? sources : ["(no sources provided)"],
        deliverable: deliverable.trim() || undefined,
      });
      await wait(220);
      setReceipt(result);
      setCapStep("clear");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Verification failed");
      setCapStep("idle");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="console-app">
      <FlowField mode="slant" className="flow-field console-spiral" />
      <div className="console-veil" aria-hidden />
      <header className="console-top">
        <div className="console-top-inner">
          <Link to="/" className="logo-link" aria-label="Back to Corrix home">
            <LogoWord compact />
          </Link>
          <div className="console-top-meta">
            <span className="console-badge">
              <span className="live-dot" /> Free try
            </span>
            <Link to="/docs" className="console-link">
              Docs
            </Link>
            <Link to="/" className="console-link">
              Home
            </Link>
          </div>
        </div>
      </header>

      <div className="console-body">
        <div className="console-intro">
          <p className="console-kicker">No login · No wallet · Instant</p>
          <h1>Try the verification engine</h1>
          <p>
            Type a claim you want checked, add sources (links or quotes), then
            run. You get a structured receipt: verdict, checks, and a content
            hash. This page is free. Paid agent-to-agent jobs run on the{" "}
            <a href={SITE.agentStore} target="_blank" rel="noreferrer">
              Agent Store
            </a>
            .
          </p>
        </div>

        <ol className="console-howto">
          <li>
            <span className="howto-n">1</span>
            <div>
              <strong>Write a claim</strong>
              <p>A statement to verify (your words, not ours).</p>
            </div>
          </li>
          <li>
            <span className="howto-n">2</span>
            <div>
              <strong>Add sources</strong>
              <p>One URL or evidence line per row. Stronger sources, clearer verdict.</p>
            </div>
          </li>
          <li>
            <span className="howto-n">3</span>
            <div>
              <strong>Run verification</strong>
              <p>See the receipt on the right. Copy JSON if you need it.</p>
            </div>
          </li>
        </ol>

        <div className="console-grid">
          <div className="card">
            <div className="card-title-row">
              <div className="card-title">Your input</div>
              {(claim || sourcesText || deliverable) && (
                <button type="button" className="link-btn" onClick={clearForm}>
                  Clear
                </button>
              )}
            </div>

            <div className="examples-block">
              <p className="examples-label">Not sure what to type? Load an example:</p>
              <div className="examples">
                {EXAMPLES.map((ex, i) => (
                  <button
                    key={ex.label}
                    type="button"
                    className={`chip ${activeExample === i ? "active" : ""}`}
                    onClick={() => loadExample(i)}
                  >
                    {ex.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="field">
              <label htmlFor="claim">
                Claim <span className="req">required</span>
              </label>
              <p className="field-hint">What should Corrix check? Example: a fact, news line, or agent output claim.</p>
              <textarea
                id="claim"
                value={claim}
                onChange={(e) => {
                  setClaim(e.target.value);
                  setActiveExample(null);
                  setError(null);
                }}
                placeholder="e.g. Base is an Ethereum Layer 2 network incubated by Coinbase"
                rows={3}
              />
            </div>
            <div className="field">
              <label htmlFor="sources">
                Sources <span className="opt">recommended</span>
              </label>
              <p className="field-hint">One per line: a URL and/or a short evidence quote. Empty sources often return unclear.</p>
              <textarea
                id="sources"
                value={sourcesText}
                onChange={(e) => {
                  setSourcesText(e.target.value);
                  setActiveExample(null);
                }}
                placeholder={"https://example.com/article\nQuote from the article that supports or challenges the claim"}
                rows={4}
              />
            </div>
            <div className="field">
              <label htmlFor="deliverable">
                Agent deliverable <span className="opt">optional</span>
              </label>
              <p className="field-hint">Paste another agent’s answer if you want Corrix to check consistency with the claim.</p>
              <textarea
                id="deliverable"
                value={deliverable}
                onChange={(e) => {
                  setDeliverable(e.target.value);
                  setActiveExample(null);
                }}
                placeholder="Paste agent output here (optional)"
                rows={2}
              />
            </div>

            {error && <p className="console-error">{error}</p>}

            <button
              type="button"
              className="btn btn-primary"
              style={{ width: "100%" }}
              disabled={!canRun}
              onClick={() => void runVerify()}
            >
              {loading ? "Running checks…" : "Run free verification"}
            </button>
            <p className="console-foot-note">
              Free browser check. For paid CAP hires by other agents, list stays on the{" "}
              <a href={SITE.agentStore} target="_blank" rel="noreferrer">
                Agent Store
              </a>
              .{" "}
              <Link to="/docs">Read how to hire</Link>
            </p>
          </div>

          <div className="card">
            <div className="card-title">Your receipt</div>
            <div className="timeline" aria-label="Verification stages">
              {CAP_STEPS.map((s, i) => {
                const done = stepIndex > i || capStep === "clear";
                const active = capStep === s.id && capStep !== "clear";
                const clearActive = capStep === "clear" && s.id === "clear";
                return (
                  <div
                    key={s.id}
                    className={`tl-step ${done || clearActive ? "done" : ""} ${
                      active || clearActive ? "active" : ""
                    }`}
                  >
                    {s.label}
                  </div>
                );
              })}
            </div>

            <AnimatePresence mode="wait">
              {!receipt && !loading && (
                <motion.div
                  key="empty"
                  className="receipt-empty receipt-guide"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <p className="receipt-guide-title">Waiting for a run</p>
                  <ol>
                    <li>Fill claim + sources on the left (or load an example)</li>
                    <li>Click <strong>Run free verification</strong></li>
                    <li>Verdict, checks, and hash show up here</li>
                  </ol>
                </motion.div>
              )}
              {loading && !receipt && (
                <motion.div
                  key="loading"
                  className="receipt-empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <p>
                    {capStep === "negotiate" && "Preparing verification…"}
                    {capStep === "lock" && "Scoring claim against sources…"}
                    {capStep === "deliver" && "Building receipt…"}
                  </p>
                </motion.div>
              )}
              {receipt && (
                <motion.div
                  key={receipt.contentHash}
                  initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className={`verdict-banner ${receipt.verdict}`}>
                    <ConfidenceRing value={receipt.confidence} verdict={receipt.verdict} />
                    <div>
                      <div className="verdict-label">{receipt.verdict}</div>
                      <div className="verdict-meta">
                        {receipt.sourcesAnalyzed} sources · {receipt.latencyMs}ms ·{" "}
                        {receipt.mode}
                      </div>
                    </div>
                  </div>
                  <p className="summary">{receipt.summary}</p>
                  <CheckList checks={receipt.checks} />
                  <div className="hash-label">Content hash</div>
                  <div className="hash-box">{receipt.contentHash}</div>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => {
                      void navigator.clipboard.writeText(JSON.stringify(receipt, null, 2));
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1600);
                    }}
                  >
                    {copied ? "Copied" : "Copy receipt JSON"}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
