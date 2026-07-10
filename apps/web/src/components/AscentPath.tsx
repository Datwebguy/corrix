import { useEffect, useState } from "react";
import { motion, useReducedMotion, AnimatePresence } from "framer-motion";

/**
 * Hero visual, Corrix Ascent Path
 * Desktop: climbing ladder. Mobile: compact step grid (not a tall dark stack).
 */
const STEPS = [
  {
    id: "claim",
    rung: "01",
    title: "Claim",
    detail: "Statement under review",
    tag: "input",
  },
  {
    id: "sources",
    rung: "02",
    title: "Sources",
    detail: "Evidence & URLs bind the check",
    tag: "input",
  },
  {
    id: "checks",
    rung: "03",
    title: "Checks",
    detail: "Quality · overlap · polarity · provenance",
    tag: "engine",
  },
  {
    id: "verdict",
    rung: "04",
    title: "Verdict",
    detail: "support · refute · partial · unclear",
    tag: "output",
  },
  {
    id: "hash",
    rung: "05",
    title: "Seal",
    detail: "SHA-256 content hash on the receipt",
    tag: "proof",
  },
  {
    id: "settle",
    rung: "06",
    title: "Clear",
    detail: "CAP delivery accepted · USDC settles",
    tag: "cap",
  },
] as const;

export function AscentPath() {
  const reduce = useReducedMotion();
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (reduce || paused) return;
    const id = window.setInterval(() => {
      setActive((i) => (i + 1) % STEPS.length);
    }, 2200);
    return () => window.clearInterval(id);
  }, [reduce, paused]);

  const current = STEPS[active];

  const select = (i: number) => {
    setPaused(true);
    setActive(i);
  };

  return (
    <div
      className="ascent"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="ascent-header">
        <span className="ascent-label">Verification ascent</span>
        <span className="ascent-hint ascent-hint-desktop">
          {paused ? "Hover a rung" : "Climbing…"}
        </span>
        <span className="ascent-hint ascent-hint-mobile">
          {paused ? "Tap a step" : "Auto…"}
        </span>
      </div>

      {/* ,, Mobile: compact 3×2 path (not tall stack) ,, */}
      <div className="ascent-mobile">
        <div className="ascent-mobile-track" aria-hidden>
          <div
            className="ascent-mobile-fill"
            style={{ width: `${((active + 1) / STEPS.length) * 100}%` }}
          />
        </div>
        <ol className="ascent-mobile-grid">
          {STEPS.map((step, i) => {
            const isActive = i === active;
            const isPast = i < active;
            return (
              <li key={step.id}>
                <button
                  type="button"
                  className={`ascent-chip ${isActive ? "is-active" : ""} ${isPast ? "is-past" : ""}`}
                  onClick={() => select(i)}
                  aria-current={isActive ? "step" : undefined}
                >
                  <span className="ascent-chip-num">{step.rung}</span>
                  <span className="ascent-chip-title">{step.title}</span>
                  <span className={`ascent-chip-dot ${isActive ? "on" : ""}`} />
                </button>
              </li>
            );
          })}
        </ol>
        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            className="ascent-detail ascent-detail-mobile"
            initial={reduce ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0 }}
            transition={{ duration: 0.22 }}
          >
            <div className="ascent-detail-top">
              <strong>{current.title}</strong>
              <span>
                {current.rung}/06 · {current.tag}
              </span>
            </div>
            <p>{current.detail}</p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ,, Desktop: full ladder ,, */}
      <div className="ascent-desktop">
        <div className="ascent-frame">
          <div className="ascent-rail" aria-hidden>
            <div className="ascent-rail-glow" />
            <motion.div
              className="ascent-climber"
              animate={
                reduce
                  ? undefined
                  : {
                      top: `calc(${(active / (STEPS.length - 1)) * 100}% - 6px)`,
                    }
              }
              transition={{ type: "spring", stiffness: 120, damping: 18 }}
            />
          </div>

          <ol className="ascent-ladder">
            {STEPS.map((step, i) => {
              const isActive = i === active;
              const isPast = i < active;
              return (
                <motion.li
                  key={step.id}
                  className={`ascent-rung ${isActive ? "is-active" : ""} ${isPast ? "is-past" : ""}`}
                  style={{
                    ["--shift" as string]: `${(i % 2 === 0 ? -1 : 1) * 10}px`,
                  }}
                  onMouseEnter={() => select(i)}
                  onFocus={() => select(i)}
                  initial={reduce ? false : { opacity: 0, x: i % 2 === 0 ? -24 : 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{
                    delay: 0.08 * i,
                    duration: 0.45,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                >
                  <button type="button" className="ascent-rung-btn" onClick={() => select(i)}>
                    <span className="ascent-rung-index">{step.rung}</span>
                    <span className="ascent-rung-body">
                      <span className="ascent-rung-title">{step.title}</span>
                      <span className="ascent-rung-tag">{step.tag}</span>
                    </span>
                    <span className={`ascent-node ${isActive ? "on" : ""}`} aria-hidden />
                  </button>
                </motion.li>
              );
            })}
          </ol>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            className="ascent-detail"
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: -6 }}
            transition={{ duration: 0.28 }}
          >
            <div className="ascent-detail-top">
              <strong>{current.title}</strong>
              <span>Step {current.rung}</span>
            </div>
            <p>{current.detail}</p>
            <div className="ascent-progress" aria-hidden>
              {STEPS.map((s, i) => (
                <span key={s.id} className={i <= active ? "lit" : ""} />
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
