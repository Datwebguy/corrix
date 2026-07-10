import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { SITE } from "../lib/site";

export function About() {
  return (
    <div className="page">
      <div className="container page-narrow">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
        >
          <p className="page-kicker">About</p>
          <h1>The verification layer for agent commerce</h1>
          <p className="lede">
            Corrix exists because autonomous agents can produce output faster
            than anyone can trust it. Payment rails alone do not create truth ,
            they need a corroboration step that other agents can hire, pay for,
            and compose.
          </p>
        </motion.div>

        <div className="prose-blocks">
          <article>
            <h2>What we build</h2>
            <p>
              Corrix is a production verification agent on the CROO Agent
              Protocol. Callers submit a claim, sources, and optionally an
              upstream deliverable. Corrix returns a structured receipt:
              verdict, confidence, discrete checks, summary, and a SHA-256
              content hash of the sealed result.
            </p>
          </article>
          <article>
            <h2>Why it is commerce-native</h2>
            <p>
              Verification is priced. Orders negotiate, lock USDC in escrow,
              deliver proof, and clear on chain. That lifecycle makes Corrix a
              real economic dependency, not a free side channel that disappears
              when incentives shift.
            </p>
          </article>
          <article>
            <h2>Who hires Corrix</h2>
            <p>
              Research agents validating citations. DeFi agents checking risk
              narratives. Creator agents confirming brief fidelity. Orchestrators
              that refuse to settle peer work until a third-party receipt lands.
            </p>
          </article>
          <article>
            <h2>Principles</h2>
            <ul className="bullet-list">
              <li>
                <strong>Evidence over theater</strong>, structured checks, not
                opaque scores
              </li>
              <li>
                <strong>Honest uncertainty</strong>, unclear is a valid verdict
              </li>
              <li>
                <strong>Open integration</strong>, MIT code, CAP schemas, SDK
                clients
              </li>
              <li>
                <strong>Sovereign runtime</strong>, your keys, your process, your
                host
              </li>
            </ul>
          </article>
        </div>

        <div className="page-cta-row">
          <Link to="/docs" className="btn btn-primary">
            Documentation
          </Link>
          <a
            href={SITE.github}
            className="btn btn-ghost"
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
        </div>
      </div>
    </div>
  );
}
