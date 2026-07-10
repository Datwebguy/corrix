import { useEffect, useRef } from "react";

/**
 * Corrix backdrop — rolling double spiral of light particles.
 * Inspired by premium health/science helix visuals, recolored to
 * CROO lime / forest. Bold, visible, animated — not faint washes
 * or AI node-mesh graphs.
 */
export function FlowField() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let w = 0;
    let h = 0;
    let dpr = 1;
    let raf = 0;
    let t = 0;

    // Particles distributed along a double helix / rolling spiral
    type P = {
      s: number; // arc progress 0..1 along the spine
      phase: number; // which strand + offset
      size: number;
      bright: number;
      jitter: number;
    };

    let particles: P[] = [];

    const seed = () => {
      const count = Math.min(1400, Math.floor((w * h) / 900));
      particles = Array.from({ length: count }, (_, i) => ({
        s: Math.random(),
        phase: i % 2,
        size: 0.6 + Math.random() * 2.4,
        bright: 0.35 + Math.random() * 0.65,
        jitter: Math.random() * Math.PI * 2,
      }));
    };

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
    };

    /** Map s∈[0,1] → world position on rolling double helix */
    const helixPoint = (s: number, strand: number, time: number) => {
      // Vertical scroll of the helix (rolling motion)
      const scroll = reduce ? 0 : time * 0.08;
      const u = (s + scroll) % 1;

      // Center path drifts slowly across the viewport
      const pathX =
        w * 0.58 +
        Math.sin(time * 0.15) * w * 0.04 +
        Math.sin(u * Math.PI * 2) * w * 0.02;
      const pathY = h * (0.08 + u * 0.9);

      // Helix radius grows mid-frame then eases (cinematic depth)
      const radius =
        Math.min(w, h) *
        (0.1 + 0.08 * Math.sin(u * Math.PI)) *
        (0.85 + 0.15 * Math.sin(time * 0.2));

      // Double strand: opposite phases + slow roll rotation
      const turns = 4.5;
      const angle =
        u * Math.PI * 2 * turns +
        strand * Math.PI +
        (reduce ? 0 : time * 0.55);

      const px = pathX + Math.cos(angle) * radius;
      const py = pathY + Math.sin(angle) * radius * 0.22; // flatten depth on Y

      // Depth cue from helix cosine
      const depth = (Math.sin(angle) + 1) * 0.5; // 0 back … 1 front

      return { x: px, y: py, depth, angle };
    };

    const frame = () => {
      t += reduce ? 0.002 : 0.012;

      // Deep space-forest base
      const bg = ctx.createRadialGradient(w * 0.55, h * 0.45, 0, w * 0.5, h * 0.5, Math.max(w, h) * 0.75);
      bg.addColorStop(0, "#0c1610");
      bg.addColorStop(0.45, "#070c09");
      bg.addColorStop(1, "#030504");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // Ambient lime bloom behind the spiral
      const bloom = ctx.createRadialGradient(w * 0.58, h * 0.5, 0, w * 0.58, h * 0.5, Math.min(w, h) * 0.45);
      bloom.addColorStop(0, "rgba(184, 242, 74, 0.12)");
      bloom.addColorStop(0.4, "rgba(100, 160, 50, 0.05)");
      bloom.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = bloom;
      ctx.fillRect(0, 0, w, h);

      // Soft secondary glow (energy core)
      const core = ctx.createRadialGradient(w * 0.55, h * 0.42, 0, w * 0.55, h * 0.42, Math.min(w, h) * 0.2);
      core.addColorStop(0, "rgba(212, 255, 106, 0.14)");
      core.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = core;
      ctx.fillRect(0, 0, w, h);

      // Draw helix ribbons as dense particles (front sorted lightly)
      const points: { x: number; y: number; depth: number; size: number; bright: number; strand: number }[] = [];

      for (const p of particles) {
        // Gentle drift along the spiral path
        const s = (p.s + (reduce ? 0 : t * 0.02 * (0.5 + p.bright * 0.5))) % 1;
        const pt = helixPoint(s, p.phase, t);
        const jx = Math.cos(p.jitter + t * 1.5) * (0.6 + p.size * 0.4);
        const jy = Math.sin(p.jitter * 1.3 + t) * (0.5 + p.size * 0.3);
        points.push({
          x: pt.x + jx,
          y: pt.y + jy,
          depth: pt.depth,
          size: p.size * (0.65 + pt.depth * 0.7),
          bright: p.bright * (0.4 + pt.depth * 0.75),
          strand: p.phase,
        });
      }

      // Back to front
      points.sort((a, b) => a.depth - b.depth);

      ctx.save();
      ctx.globalCompositeOperation = "lighter";

      for (const pt of points) {
        const alpha = Math.min(1, pt.bright * 0.95);
        // Lime / gold-green palette (CROO, with warm energy like the reference)
        const r = 160 + pt.strand * 40;
        const g = 230 + pt.depth * 25;
        const b = 60 + pt.depth * 40;

        // Outer glow
        const glowR = pt.size * (3.5 + pt.depth * 2);
        const g0 = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, glowR);
        g0.addColorStop(0, `rgba(${r},${g},${b},${0.55 * alpha})`);
        g0.addColorStop(0.35, `rgba(${r},${g},${b},${0.18 * alpha})`);
        g0.addColorStop(1, `rgba(${r},${g},${b},0)`);
        ctx.fillStyle = g0;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, glowR, 0, Math.PI * 2);
        ctx.fill();

        // Hot core
        ctx.fillStyle = `rgba(240, 255, 200, ${0.75 * alpha})`;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, Math.max(0.5, pt.size * 0.45), 0, Math.PI * 2);
        ctx.fill();
      }

      // Occasional energy arcs between nearby points on same strand (sparks)
      if (!reduce) {
        for (let i = 0; i < points.length; i += 28) {
          const a = points[i];
          const b = points[Math.min(points.length - 1, i + 3)];
          if (!a || !b || a.strand !== b.strand) continue;
          if (Math.hypot(a.x - b.x, a.y - b.y) > 48) continue;
          const mid = (a.depth + b.depth) * 0.5;
          ctx.strokeStyle = `rgba(184, 242, 74, ${0.08 + mid * 0.12})`;
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }

      ctx.restore();

      // Vignette so content stays readable
      const vig = ctx.createRadialGradient(w * 0.55, h * 0.45, Math.min(w, h) * 0.15, w * 0.5, h * 0.5, Math.max(w, h) * 0.72);
      vig.addColorStop(0, "rgba(0,0,0,0)");
      vig.addColorStop(0.65, "rgba(0,0,0,0.15)");
      vig.addColorStop(1, "rgba(0,0,0,0.55)");
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, w, h);

      // Top bar for nav
      const top = ctx.createLinearGradient(0, 0, 0, 90);
      top.addColorStop(0, "rgba(3, 5, 4, 0.55)");
      top.addColorStop(1, "rgba(3, 5, 4, 0)");
      ctx.fillStyle = top;
      ctx.fillRect(0, 0, w, 90);

      raf = requestAnimationFrame(frame);
    };

    resize();
    window.addEventListener("resize", resize);
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={ref} className="flow-field" aria-hidden />;
}
