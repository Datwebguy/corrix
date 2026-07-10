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

const CAP_STEPS: { id: CapStep; label: string }[] = [
  { id: "negotiate", label: "Negotiate" },
  { id: "lock", label: "Lock" },
  { id: "deliver", label: "Deliver" },
  { id: "clear", label: "Clear" },
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

/** Product console — separate from marketing site shell */
export function Console() {
  const reduceMotion = useReducedMotion();
  const [claim, setClaim] = useState<string>(EXAMPLES[0].claim);
  const [sourcesText, setSourcesText] = useState<string>(EXAMPLES[0].sources.join("\n"));
  const [deliverable, setDeliverable] = useState<string>(EXAMPLES[0].deliverable);
  const [activeExample, setActiveExample] = useState(0);
  const [loading, setLoading] = useState(false);
  const [capStep, setCapStep] = useState<CapStep>("idle");
  const [receipt, setReceipt] = useState<VerifyReceipt | null>(null);
  const [copied, setCopied] = useState(false);

  const stepIndex = useMemo(() => {
    const order: CapStep[] = ["negotiate", "lock", "deliver", "clear"];
    return order.indexOf(capStep);
  }, [capStep]);

  function loadExample(i: number) {
    const ex = EXAMPLES[i];
    setActiveExample(i);
    setClaim(ex.claim);
    setSourcesText(ex.sources.join("\n"));
    setDeliverable(ex.deliverable);
    setReceipt(null);
    setCapStep("idle");
  }

  async function runVerify() {
    if (!claim.trim() || loading) return;
    setLoading(true);
    setReceipt(null);
    const sources = sourcesText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    const wait = (ms: number) =>
      new Promise((r) => setTimeout(r, reduceMotion ? 0 : ms));

    try {
      setCapStep("negotiate");
      await wait(320);
      setCapStep("lock");
      await wait(360);
      setCapStep("deliver");
      const result = await verifyClaim({
        claim,
        sources: sources.length ? sources : ["(no sources provided)"],
        deliverable: deliverable.trim() || undefined,
      });
      await wait(240);
      setReceipt(result);
      setCapStep("clear");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="console-app">
      <header className="console-top">
        <div className="console-top-inner">
          <Link to="/" className="logo-link" aria-label="Back to Corrix home">
            <LogoWord compact />
          </Link>
          <div className="console-top-meta">
            <span className="console-badge">
              <span className="live-dot" /> Console
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
          <h1>Verification console</h1>
          <p>
            Submit a claim and sources. Corrix returns a structured receipt —
            the same payload shape CAP deliverables use when agents hire the
            service.
          </p>
        </div>

        <div className="console-grid">
          <div className="card">
            <div className="card-title">Requirements</div>
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

            <div className="field">
              <label htmlFor="claim">Claim</label>
              <textarea
                id="claim"
                value={claim}
                onChange={(e) => setClaim(e.target.value)}
                placeholder="Statement to verify…"
                rows={4}
              />
            </div>
            <div className="field">
              <label htmlFor="sources">Sources (one per line)</label>
              <textarea
                id="sources"
                value={sourcesText}
                onChange={(e) => setSourcesText(e.target.value)}
                placeholder="URL or evidence text"
                rows={5}
              />
            </div>
            <div className="field">
              <label htmlFor="deliverable">Deliverable (optional)</label>
              <textarea
                id="deliverable"
                value={deliverable}
                onChange={(e) => setDeliverable(e.target.value)}
                placeholder="Upstream agent output to check"
                rows={3}
              />
            </div>
            <button
              type="button"
              className="btn btn-primary"
              style={{ width: "100%" }}
              disabled={loading || !claim.trim()}
              onClick={() => void runVerify()}
            >
              {loading ? "Verifying…" : "Run verification"}
            </button>
          </div>

          <div className="card">
            <div className="card-title">Receipt · order lifecycle</div>
            <div className="timeline" aria-label="CAP order lifecycle">
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
                  className="receipt-empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <p>Receipt appears here after verification completes.</p>
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
                    {capStep === "negotiate" && "Negotiating…"}
                    {capStep === "lock" && "Locking order terms…"}
                    {capStep === "deliver" && "Running checks…"}
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
