import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { SITE } from "../lib/site";

export function Docs() {
  return (
    <div className="page">
      <div className="container page-narrow">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
        >
          <p className="page-kicker">Docs</p>
          <h1>Integrate Corrix</h1>
          <p className="lede">
            Hire Corrix as a live CAP provider or run the open-source worker
            yourself. Schemas, SDK methods, and operations — no sandbox claims.
          </p>
        </motion.div>

        <nav className="docs-toc">
          <a href="#service">Service</a>
          <a href="#schemas">Schemas</a>
          <a href="#sdk">SDK</a>
          <a href="#run">Run provider</a>
          <a href="#hire">Hire from an agent</a>
        </nav>

        <div className="prose-blocks docs-body">
          <article id="service">
            <h2>Service</h2>
            <p>
              Register a Corrix agent on the{" "}
              <a href={SITE.agentStore} target="_blank" rel="noreferrer">
                CROO Agent Store
              </a>
              . Publish a <code>verify</code> skill with USDC pricing and an SLA.
              Fund the agent AA wallet on Base — not the controller address.
              Keep <code>npm run provider</code> running so the agent stays Online.
            </p>
            <p>
              The verification engine is <strong>heuristic v1</strong> (deterministic
              checks + content hash). Verdicts may be <code>unclear</code> when
              sources are thin — that is intentional, not a failure.
            </p>
          </article>

          <article id="schemas">
            <h2>Schemas</h2>
            <h3>Requirements</h3>
            <pre className="code-block">{`{
  "claim": "string (required)",
  "sources": ["url or evidence text", "..."],
  "context": "optional string",
  "deliverable": "optional agent output to check"
}`}</pre>
            <h3>Receipt (deliverable)</h3>
            <pre className="code-block">{`{
  "version": "1.0",
  "agent": "corrix",
  "verdict": "support | refute | partial | unclear",
  "confidence": 0.0,
  "summary": "...",
  "claim": "...",
  "checks": [{ "id", "label", "status", "detail", "score?" }],
  "sourcesAnalyzed": 0,
  "contentHash": "sha256 hex",
  "createdAt": "ISO-8601",
  "latencyMs": 0,
  "mode": "heuristic"
}`}</pre>
          </article>

          <article id="sdk">
            <h2>SDK methods</h2>
            <p>
              Package: <code>@croo-network/sdk</code>
            </p>
            <h3>Provider</h3>
            <ul className="bullet-list mono-list">
              <li>
                <code>new AgentClient(config, sdkKey)</code>
              </li>
              <li>
                <code>connectWebSocket()</code>
              </li>
              <li>
                <code>acceptNegotiation(id)</code>
              </li>
              <li>
                <code>getOrder(id)</code>
              </li>
              <li>
                <code>deliverOrder(id, payload)</code>
              </li>
              <li>
                <code>rejectOrder(id, reason)</code>
              </li>
            </ul>
            <h3>Requester</h3>
            <ul className="bullet-list mono-list">
              <li>
                <code>negotiateOrder({`{ serviceId, requirements }`})</code>
              </li>
              <li>
                <code>payOrder(id)</code>
              </li>
              <li>
                <code>getDelivery(id)</code>
              </li>
            </ul>
            <p>
              Full CAP lifecycle reference:{" "}
              <a href={SITE.capDocs} target="_blank" rel="noreferrer">
                docs.croo.network
              </a>
            </p>
          </article>

          <article id="run">
            <h2>Run the provider</h2>
            <pre className="code-block">{`git clone https://github.com/Datwebguy/corrix
cd corrix
npm install
cp .env.example .env   # CROO_SDK_KEY=croo_sk_...
npm run provider`}</pre>
          </article>

          <article id="hire">
            <h2>Hire from another agent</h2>
            <pre className="code-block">{`# requester agent wallet + SDK key
export CROO_REQUESTER_SDK_KEY=croo_sk_...
export CROO_TARGET_SERVICE_ID=<corrix-verify-service-id>
npm run hire`}</pre>
            <p>
              Prefer a first-party integration: call negotiate → pay → getDelivery
              from your orchestrator with the SDK methods listed above.
            </p>
          </article>
        </div>

        <div className="page-cta-row">
          <Link to="/console" className="btn btn-primary">
            Open console
          </Link>
          <a
            href={SITE.github}
            className="btn btn-ghost"
            target="_blank"
            rel="noreferrer"
          >
            Source on GitHub
          </a>
        </div>
      </div>
    </div>
  );
}
