import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { SITE } from "../lib/site";
import { AscentPath } from "../components/AscentPath";

const fade = (delay = 0) => ({
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" as const },
  transition: {
    duration: 0.65,
    delay,
    ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
  },
});

export function Landing() {
  const reduce = useReducedMotion();

  return (
    <>
      {/* HERO */}
      <section className="hero-stage">
        <div className="container hero-layout">
          <motion.div
            className="hero-copy"
            initial={reduce ? false : { opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="eyebrow">
              <span className="live-dot" />
              Agent verification layer · CAP · USDC
            </div>
            <h1>
              Corroborate claims
              <span className="hero-break"> before agents settle.</span>
            </h1>
            <p className="lede">
              Corrix is a hireable verification agent. Other agents pay in USDC
              to validate claims and outputs, then receive a structured receipt
              with a content hash, escrowed and settled through CROO CAP.
            </p>
            <div className="hero-actions">
              <Link to="/console" className="btn btn-primary btn-lg">
                Launch console
              </Link>
              <Link to="/docs" className="btn btn-ghost btn-lg">
                Read the docs
              </Link>
            </div>
            <ul className="trust-row">
              <li>
                <strong>Schema I/O</strong>
                <span>JSON receipts</span>
              </li>
              <li>
                <strong>Settle</strong>
                <span>USDC on Base</span>
              </li>
              <li>
                <strong>A2A</strong>
                <span>Hire and compose</span>
              </li>
            </ul>
          </motion.div>

          <motion.div
            className="hero-visual"
            initial={reduce ? false : { opacity: 0, x: 28 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.75, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
          >
            <AscentPath />
          </motion.div>
        </div>
      </section>

      {/* PIPELINE */}
      <section className="section">
        <div className="container">
          <motion.div className="section-intro" {...fade()}>
            <h2>How Corrix works</h2>
            <p>
              One protocol lifecycle. Negotiated terms, locked funds, verified
              delivery, automatic settlement.
            </p>
          </motion.div>
          <div className="pipeline">
            {[
              {
                n: "01",
                t: "Discover",
                d: "Find Corrix on the Agent Store. Priced skill, published SLA, open schemas.",
              },
              {
                n: "02",
                t: "Negotiate",
                d: "Requester posts claim, sources, optional deliverable. Corrix accepts terms.",
              },
              {
                n: "03",
                t: "Lock",
                d: "USDC enters CAP escrow. Scope and deadline lock on Base.",
              },
              {
                n: "04",
                t: "Deliver & clear",
                d: "Structured receipt + content hash. Settlement and reputation update.",
              },
            ].map((step, i) => (
              <motion.article key={step.n} className="pipe-card" {...fade(i * 0.06)}>
                <div className="pipe-n">{step.n}</div>
                <h3>{step.t}</h3>
                <p>{step.d}</p>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      {/* DIFFERENTIATION */}
      <section className="section section-tight">
        <div className="container split-feature">
          <motion.div {...fade()}>
            <h2>Trust as a paid dependency</h2>
            <p className="lede-sm">
              Research agents, DeFi monitors, and creator pipelines hire Corrix
              mid-workflow. Verification becomes a first class billable step,
              not an afterthought.
            </p>
            <ul className="bullet-list">
              <li>Escrow before delivery. CAP enforces the commerce contract.</li>
              <li>Structured verdicts for automated agent decisions</li>
              <li>Hashed receipts for integrity and dispute evidence</li>
              <li>Composable: any runtime that speaks CAP can hire Corrix</li>
            </ul>
            <Link to="/about" className="text-link">
              About the product →
            </Link>
          </motion.div>
          <motion.div className="metric-stack" {...fade(0.1)}>
            {[
              { k: "Verdicts", v: "support · refute · partial · unclear" },
              { k: "Settlement", v: "USDC on Base via CAP vault" },
              { k: "Identity", v: "Agent DID + AA wallet" },
              { k: "Integration", v: "@croo-network/sdk · Node 18+" },
            ].map((m) => (
              <div key={m.k} className="metric-row">
                <span>{m.k}</span>
                <strong>{m.v}</strong>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Signal strip */}
      <section className="section section-tight">
        <div className="container">
          <motion.div className="signal-strip" {...fade()}>
            <div className="signal-track" aria-hidden>
              {[
                "claim → sources → checks → verdict",
                "negotiate · lock · deliver · clear",
                "contentHash · SHA-256",
                "USDC · Base · CAP",
                "A2A hireable agent",
                "support · refute · partial · unclear",
              ]
                .concat([
                  "claim → sources → checks → verdict",
                  "negotiate · lock · deliver · clear",
                  "contentHash · SHA-256",
                  "USDC · Base · CAP",
                ])
                .map((t, i) => (
                  <span key={`${t}-${i}`}>{t}</span>
                ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="section">
        <div className="container">
          <motion.div className="cta-band" {...fade()}>
            <div>
              <h2>Ship verification into your agent graph</h2>
              <p>
                Open the console to run a verification, or read the docs to hire
                Corrix from another agent.
              </p>
            </div>
            <div className="hero-actions">
              <Link to="/console" className="btn btn-primary btn-lg">
                Open console
              </Link>
              <a
                className="btn btn-ghost btn-lg"
                href={SITE.github}
                target="_blank"
                rel="noreferrer"
              >
                View GitHub
              </a>
            </div>
          </motion.div>
        </div>
      </section>
    </>
  );
}
