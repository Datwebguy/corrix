import { useEffect, useRef } from "react";

export type SpiralMode = "dual" | "slant";

type FlowFieldProps = {
  /** dual = left + right vertical helices (marketing). slant = diagonal spiral (console). */
  mode?: SpiralMode;
  className?: string;
};

type Particle = {
  s: number;
  phase: number;
  size: number;
  bright: number;
  jitter: number;
  helix: number; // 0 | 1 which helix in dual mode
};

/**
 * Rolling double-spiral particle field.
 * - dual: mirrors left + right (landing / shell)
 * - slant: unique diagonal rolling spiral (console)
 */
export function FlowField({ mode = "dual", className = "flow-field" }: FlowFieldProps) {
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
    let particles: Particle[] = [];

    const seed = () => {
      const density = mode === "dual" ? 700 : 1100;
      const count = Math.min(density, Math.floor((w * h) / (mode === "dual" ? 1100 : 850)));
      particles = Array.from({ length: count }, (_, i) => ({
        s: Math.random(),
        phase: i % 2,
        size: 0.55 + Math.random() * 2.5,
        bright: 0.35 + Math.random() * 0.65,
        jitter: Math.random() * Math.PI * 2,
        helix: mode === "dual" ? i % 2 : 0,
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

    /** Vertical helix on left (0) or right (1) */
    const dualHelix = (s: number, strand: number, time: number, side: number) => {
      const scroll = reduce ? 0 : time * 0.08;
      const u = (s + scroll) % 1;
      // Mirror sides: left ~22%, right ~78%
      const baseX = side === 0 ? w * 0.18 : w * 0.82;
      const drift = Math.sin(time * 0.15 + side) * w * 0.02;
      const pathX = baseX + drift + Math.sin(u * Math.PI * 2 + side) * w * 0.012;
      const pathY = h * (0.06 + u * 0.92);

      const radius =
        Math.min(w, h) *
        (0.07 + 0.055 * Math.sin(u * Math.PI)) *
        (0.9 + 0.1 * Math.sin(time * 0.2 + side));

      const turns = 4.2;
      // Opposite roll direction per side for balance
      const dir = side === 0 ? -1 : 1;
      const angle =
        u * Math.PI * 2 * turns * dir +
        strand * Math.PI +
        (reduce ? 0 : time * 0.55 * dir);

      const px = pathX + Math.cos(angle) * radius;
      const py = pathY + Math.sin(angle) * radius * 0.2;
      const depth = (Math.sin(angle) + 1) * 0.5;
      return { x: px, y: py, depth };
    };

    /**
     * Slant spiral, unique console look:
     * path runs bottom-left → top-right on a diagonal, helix wraps around the slant.
     */
    const slantHelix = (s: number, strand: number, time: number) => {
      const scroll = reduce ? 0 : time * 0.1;
      const u = (s + scroll) % 1;

      // Diagonal spine (slant ~28°)
      const x0 = w * -0.05;
      const y0 = h * 1.05;
      const x1 = w * 1.05;
      const y1 = h * -0.08;
      const spineX = x0 + (x1 - x0) * u;
      const spineY = y0 + (y1 - y0) * u;

      // Tangent of the slant
      const dx = x1 - x0;
      const dy = y1 - y0;
      const len = Math.hypot(dx, dy) || 1;
      const tx = dx / len;
      const ty = dy / len;
      // Perpendicular for helix offset
      const nx = -ty;
      const ny = tx;

      const radius =
        Math.min(w, h) *
        (0.09 + 0.06 * Math.sin(u * Math.PI * 2)) *
        (0.95 + 0.08 * Math.sin(time * 0.25));

      const turns = 5.5;
      const angle =
        u * Math.PI * 2 * turns +
        strand * Math.PI +
        (reduce ? 0 : time * 0.7);

      // 3D-ish: cos along normal, sin along a bit of tangent for "roll"
      const offN = Math.cos(angle) * radius;
      const offT = Math.sin(angle) * radius * 0.28;

      const px = spineX + nx * offN + tx * offT;
      const py = spineY + ny * offN + ty * offT;
      const depth = (Math.sin(angle) + 1) * 0.5;
      return { x: px, y: py, depth };
    };

    const frame = () => {
      t += reduce ? 0.002 : 0.012;

      const bg = ctx.createRadialGradient(
        w * 0.5,
        h * 0.45,
        0,
        w * 0.5,
        h * 0.5,
        Math.max(w, h) * 0.78,
      );
      bg.addColorStop(0, mode === "slant" ? "#0a140e" : "#0c1610");
      bg.addColorStop(0.45, "#070c09");
      bg.addColorStop(1, "#030504");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // Dual blooms (left + right) or single diagonal bloom for slant
      if (mode === "dual") {
        for (const [bx, by] of [
          [0.2, 0.45],
          [0.8, 0.5],
        ] as const) {
          const bloom = ctx.createRadialGradient(
            w * bx,
            h * by,
            0,
            w * bx,
            h * by,
            Math.min(w, h) * 0.38,
          );
          bloom.addColorStop(0, "rgba(184, 242, 74, 0.11)");
          bloom.addColorStop(0.45, "rgba(100, 160, 50, 0.04)");
          bloom.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = bloom;
          ctx.fillRect(0, 0, w, h);
        }
      } else {
        // Soft band along the diagonal
        const bloom = ctx.createRadialGradient(w * 0.55, h * 0.45, 0, w * 0.5, h * 0.5, Math.min(w, h) * 0.55);
        bloom.addColorStop(0, "rgba(184, 242, 74, 0.1)");
        bloom.addColorStop(0.5, "rgba(80, 130, 50, 0.04)");
        bloom.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = bloom;
        ctx.fillRect(0, 0, w, h);
      }

      type Pt = {
        x: number;
        y: number;
        depth: number;
        size: number;
        bright: number;
        strand: number;
      };
      const points: Pt[] = [];

      for (const p of particles) {
        const s = (p.s + (reduce ? 0 : t * 0.02 * (0.5 + p.bright * 0.5))) % 1;
        const pt =
          mode === "slant"
            ? slantHelix(s, p.phase, t)
            : dualHelix(s, p.phase, t, p.helix);

        const jx = Math.cos(p.jitter + t * 1.5) * (0.55 + p.size * 0.35);
        const jy = Math.sin(p.jitter * 1.3 + t) * (0.45 + p.size * 0.3);
        points.push({
          x: pt.x + jx,
          y: pt.y + jy,
          depth: pt.depth,
          size: p.size * (0.6 + pt.depth * 0.75),
          bright: p.bright * (0.38 + pt.depth * 0.78),
          strand: p.phase,
        });
      }

      points.sort((a, b) => a.depth - b.depth);

      ctx.save();
      ctx.globalCompositeOperation = "lighter";

      // Slightly dimmer overall on dual so copy stays readable in the center
      const globalMul = mode === "dual" ? 0.92 : 0.85;

      for (const pt of points) {
        // Fade particles that cross the center content zone on dual mode
        let zoneFade = 1;
        if (mode === "dual") {
          const nx = pt.x / w;
          // Soften middle 35 to 65% so headline stays crisp
          if (nx > 0.32 && nx < 0.68) {
            const d = Math.min(nx - 0.32, 0.68 - nx) / 0.18;
            zoneFade = 0.25 + 0.75 * Math.min(1, d);
          }
        }

        const alpha = Math.min(1, pt.bright * 0.95 * globalMul * zoneFade);
        if (alpha < 0.02) continue;

        const r = 160 + pt.strand * 40;
        const g = 230 + pt.depth * 25;
        const b = 60 + pt.depth * 40;

        const glowR = pt.size * (3.2 + pt.depth * 2.2);
        const g0 = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, glowR);
        g0.addColorStop(0, `rgba(${r},${g},${b},${0.55 * alpha})`);
        g0.addColorStop(0.35, `rgba(${r},${g},${b},${0.16 * alpha})`);
        g0.addColorStop(1, `rgba(${r},${g},${b},0)`);
        ctx.fillStyle = g0;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, glowR, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `rgba(240, 255, 200, ${0.72 * alpha})`;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, Math.max(0.5, pt.size * 0.45), 0, Math.PI * 2);
        ctx.fill();
      }

      if (!reduce) {
        const step = mode === "slant" ? 22 : 32;
        for (let i = 0; i < points.length; i += step) {
          const a = points[i];
          const b = points[Math.min(points.length - 1, i + 3)];
          if (!a || !b || a.strand !== b.strand) continue;
          if (Math.hypot(a.x - b.x, a.y - b.y) > 52) continue;
          const mid = (a.depth + b.depth) * 0.5;
          ctx.strokeStyle = `rgba(184, 242, 74, ${0.06 + mid * 0.1})`;
          ctx.lineWidth = 0.75;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }

      ctx.restore();

      // Vignette, stronger center open for dual (text), softer for slant
      const vig = ctx.createRadialGradient(
        w * 0.5,
        h * 0.42,
        Math.min(w, h) * (mode === "dual" ? 0.12 : 0.18),
        w * 0.5,
        h * 0.5,
        Math.max(w, h) * 0.72,
      );
      vig.addColorStop(0, "rgba(0,0,0,0)");
      vig.addColorStop(0.55, mode === "dual" ? "rgba(0,0,0,0.12)" : "rgba(0,0,0,0.2)");
      vig.addColorStop(1, "rgba(0,0,0,0.58)");
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, w, h);

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
  }, [mode]);

  return <canvas ref={ref} className={className} aria-hidden />;
}
