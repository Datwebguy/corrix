import { useEffect, useState } from "react";
import { NavLink, Link, Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { LogoWord } from "./Logo";
import { FlowField } from "./FlowField";
import { SITE } from "../lib/site";

const nav = [
  { to: "/about", label: "About" },
  { to: "/docs", label: "Docs" },
  { to: "/faq", label: "FAQ" },
  { to: SITE.github, label: "GitHub", external: true },
];

export function Shell() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMenuOpen(false);
    window.scrollTo(0, 0);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <div className="shell">
      <FlowField mode="dual" />
      <div className="shell-vignette" aria-hidden />

      <header className="site-nav">
        <div className="container nav-row">
          <Link to="/" className="logo-link" aria-label="Corrix home">
            <LogoWord />
          </Link>

          <nav className="site-nav-links" aria-label="Primary">
            {nav.map((item) =>
              item.external ? (
                <a key={item.label} href={item.to} target="_blank" rel="noreferrer">
                  {item.label}
                </a>
              ) : (
                <NavLink
                  key={item.label}
                  to={item.to}
                  className={({ isActive }) => (isActive ? "active" : undefined)}
                >
                  {item.label}
                </NavLink>
              ),
            )}
          </nav>

          <div className="nav-actions">
            <a
              className="btn btn-ghost btn-sm hide-sm"
              href={SITE.agentStore}
              target="_blank"
              rel="noreferrer"
            >
              Agent Store
            </a>
            <Link className="btn btn-primary btn-sm hide-xs" to="/console">
              Open console
            </Link>
            <button
              type="button"
              className={`menu-toggle ${menuOpen ? "open" : ""}`}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
            >
              <span />
              <span />
              <span />
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            className="mobile-drawer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.nav
              className="mobile-drawer-panel"
              initial={{ y: -12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -8, opacity: 0 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              aria-label="Mobile"
            >
              {nav.map((item) =>
                item.external ? (
                  <a
                    key={item.label}
                    href={item.to}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => setMenuOpen(false)}
                  >
                    {item.label}
                  </a>
                ) : (
                  <NavLink
                    key={item.label}
                    to={item.to}
                    onClick={() => setMenuOpen(false)}
                    className={({ isActive }) => (isActive ? "active" : undefined)}
                  >
                    {item.label}
                  </NavLink>
                ),
              )}
              <a href={SITE.agentStore} target="_blank" rel="noreferrer">
                Agent Store
              </a>
              <Link
                className="btn btn-primary"
                to="/console"
                onClick={() => setMenuOpen(false)}
                style={{ marginTop: "0.5rem" }}
              >
                Open console
              </Link>
            </motion.nav>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="shell-main">
        <Outlet />
      </main>

      <footer className="site-footer">
        <div className="container footer-grid">
          <div>
            <LogoWord compact />
            <p className="footer-tag">{SITE.tagline}</p>
          </div>
          <div className="footer-col">
            <h4>Product</h4>
            <Link to="/console">Console</Link>
            <Link to="/docs">Documentation</Link>
            <a href={SITE.agentStore} target="_blank" rel="noreferrer">
              Agent Store
            </a>
          </div>
          <div className="footer-col">
            <h4>Company</h4>
            <Link to="/about">About</Link>
            <Link to="/faq">FAQ</Link>
            <a href={SITE.github} target="_blank" rel="noreferrer">
              GitHub
            </a>
          </div>
          <div className="footer-col">
            <h4>Protocol</h4>
            <a href={SITE.capDocs} target="_blank" rel="noreferrer">
              CAP docs
            </a>
            <a href={SITE.croo} target="_blank" rel="noreferrer">
              CROO Network
            </a>
          </div>
        </div>
        <div className="container footer-bottom">
          <span>© {new Date().getFullYear()} Corrix. MIT licensed.</span>
          <span className="footer-live">
            <span className="live-dot" /> Online verification agent
          </span>
        </div>
      </footer>
    </div>
  );
}
