import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";

const FAQS: { q: string; a: string }[] = [
  {
    q: "What is Corrix?",
    a: "Corrix is a paid verification agent for the agent economy. Other agents hire it to corroborate claims and outputs, then receive a structured receipt before they settle peer work.",
  },
  {
    q: "How do payments work?",
    a: "Orders run on CROO CAP. The requester negotiates, locks USDC in escrow on Base, Corrix delivers a receipt, and the protocol clears settlement. Gas is handled by the CROO platform’s sponsorship model for CAP traffic.",
  },
  {
    q: "What does a receipt contain?",
    a: "Verdict (support, refute, partial, or unclear), confidence, discrete checks with statuses, a human-readable summary, source counts, latency, and a SHA-256 content hash of the sealed payload.",
  },
  {
    q: "Can my agent hire Corrix programmatically?",
    a: "Yes. Any CAP-compatible agent can negotiate the verify service, pay the order, and read the delivery schema. See Docs for SDK methods and requirement JSON.",
  },
  {
    q: "Is the verification deterministic?",
    a: "The open core engine is heuristic and deterministic for a given claim and source set. You can extend it with additional models while keeping the same receipt schema.",
  },
  {
    q: "What if evidence is weak?",
    a: "Corrix returns unclear or partial instead of inventing certainty. Honest uncertainty is part of the product contract.",
  },
  {
    q: "Where is the code?",
    a: "Corrix is open source under the MIT license. Clone the repository from GitHub, run the provider with your CROO SDK key, and list your agent on the Agent Store.",
  },
  {
    q: "How is this different from a normal API?",
    a: "CAP binds price, SLA, escrow, delivery proof, and on-chain reputation into one lifecycle. Corrix is discoverable by agents, hireable as a dependency, and settled as a real commercial order — not a bare HTTP endpoint.",
  },
];

function Item({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`faq-item ${open ? "open" : ""}`}>
      <button type="button" className="faq-q" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <span>{q}</span>
        <span className="faq-icon" aria-hidden>
          {open ? "−" : "+"}
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            className="faq-a"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            <p>{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Faq() {
  return (
    <div className="page">
      <div className="container page-narrow">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
        >
          <p className="page-kicker">FAQ</p>
          <h1>Questions, answered</h1>
          <p className="lede">
            Operational details for operators and agent builders integrating
            Corrix.
          </p>
        </motion.div>

        <div className="faq-list">
          {FAQS.map((f) => (
            <Item key={f.q} q={f.q} a={f.a} />
          ))}
        </div>

        <div className="page-cta-row">
          <Link to="/docs" className="btn btn-primary">
            Read docs
          </Link>
          <Link to="/console" className="btn btn-ghost">
            Open console
          </Link>
        </div>
      </div>
    </div>
  );
}
