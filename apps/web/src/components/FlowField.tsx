import { useEffect, useRef } from "react";

/**
 * Corrix atmosphere — contemporary product backdrop.
 *
 * Avoids the overused “AI agent mesh”: no node graphs, no constellation
 * threads, no particle webs.
 *
 * Visual language: deep forest fields, soft volumetric light wells,
 * film grain, and rare expanding verification seals.
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
    let grainPattern: CanvasPattern | null = null;

    const wells = [
      { x: 0.2, y: 0.2, r: 0.45, kind: 0 as 0 | 1, phase: 0.0, speed: 0.11 },
      { x: 0.82, y: 0.16, r: 0.36, kind: 1 as 0 | 1, phase: 1.3, speed: 0.08 },
      { x: 0.52, y: 0.78, r: 0.5, kind: 0 as 0 | 1, phase: 2.0, speed: 0.07 },
      { x: 0.1, y: 0.72, r: 0.34, kind: 1 as 0 | 1, phase: 0.7, speed: 0.1 },
      { x: 0.9, y: 0.58, r: 0.3, kind: 0 as 0 | 1, phase: 1.8, speed: 0.09 },
    ];

    type Seal = { x: number; y: number; age: number; max: number };
    let seals: Seal[] = [];
    let tick = 0;

    const buildGrain = () => {
      const size = 128;
      const g = document.createElement("canvas");
      g.width = size;
      g.height = size;
      const gctx = g.getContext("2d");
      if (!gctx) return;
      const img = gctx.createImageData(size, size);
      const d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        const n = (Math.random() * 255) | 0;
        d[i] = n;
        d[i + 1] = n;
        d[i + 2] = n;
        d[i + 3] = 255;
      }
      gctx.putImageData(img, 0, 0);
      grainPattern = ctx.createPattern(g, "repeat");
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
      buildGrain();
    };

    const spawnSeal = () => {
      seals.push({
        x: w * (0.3 + Math.random() * 0.4),
        y: h * (0.28 + Math.random() * 0.4),
        age: 0,
        max: Math.min(w, h) * (0.2 + Math.random() * 0.15),
      });
      if (seals.length > 3) seals.shift();
    };

    const frame = () => {
      t += reduce ? 0 : 0.006;
      tick += 1;

      // Solid base (no transparency flicker)
      const base = ctx.createLinearGradient(0, 0, w * 0.2, h);
      base.addColorStop(0, "#060a08");
      base.addColorStop(0.5, "#0a110d");
      base.addColorStop(1, "#050807");
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, w, h);

      // Volumetric light wells
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (const well of wells) {
        const dx = reduce ? 0 : Math.sin(t * well.speed + well.phase) * w * 0.035;
        const dy = reduce ? 0 : Math.cos(t * well.speed * 0.9 + well.phase) * h * 0.028;
        const cx = well.x * w + dx;
        const cy = well.y * h + dy;
        const pulse = reduce ? 1 : 0.94 + Math.sin(t * 0.35 + well.phase) * 0.06;
        const radius = well.r * Math.max(w, h) * pulse;

        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        if (well.kind === 0) {
          g.addColorStop(0, "rgba(184, 242, 74, 0.11)");
          g.addColorStop(0.3, "rgba(100, 160, 60, 0.045)");
          g.addColorStop(0.7, "rgba(40, 80, 50, 0.02)");
          g.addColorStop(1, "rgba(0, 0, 0, 0)");
        } else {
          g.addColorStop(0, "rgba(70, 130, 90, 0.12)");
          g.addColorStop(0.35, "rgba(35, 75, 55, 0.05)");
          g.addColorStop(1, "rgba(0, 0, 0, 0)");
        }
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // Soft ground plane wash (editorial, not tech)
      const groundY = h * 0.78;
      const ground = ctx.createLinearGradient(0, groundY - 100, 0, h);
      ground.addColorStop(0, "rgba(20, 40, 28, 0)");
      ground.addColorStop(0.4, "rgba(25, 50, 35, 0.1)");
      ground.addColorStop(1, "rgba(8, 14, 10, 0.35)");
      ctx.fillStyle = ground;
      ctx.fillRect(0, groundY - 100, w, h - groundY + 100);

      // Occasional verification seal (soft ring only — not a network)
      if (!reduce && tick % 240 === 40) spawnSeal();

      for (const seal of seals) {
        if (!reduce) seal.age += 0.65;
        const life = 1 - seal.age / seal.max;
        if (life <= 0) continue;
        const r = seal.age;
        const a = Math.max(0, life) * 0.12;
        ctx.strokeStyle = `rgba(184, 242, 74, ${a})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(seal.x, seal.y, r, 0, Math.PI * 2);
        ctx.stroke();

        const core = ctx.createRadialGradient(seal.x, seal.y, 0, seal.x, seal.y, r * 0.25);
        core.addColorStop(0, `rgba(184, 242, 74, ${a * 0.4})`);
        core.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = core;
        ctx.beginPath();
        ctx.arc(seal.x, seal.y, Math.max(1, r * 0.25), 0, Math.PI * 2);
        ctx.fill();
      }
      seals = seals.filter((s) => s.age < s.max);

      // Film grain overlay
      if (grainPattern) {
        ctx.save();
        ctx.globalAlpha = 0.045;
        ctx.globalCompositeOperation = "overlay";
        ctx.fillStyle = grainPattern;
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
      }

      // Vignette for depth (magazine / product site)
      const vig = ctx.createRadialGradient(
        w * 0.5,
        h * 0.4,
        Math.min(w, h) * 0.2,
        w * 0.5,
        h * 0.5,
        Math.max(w, h) * 0.75,
      );
      vig.addColorStop(0, "rgba(0,0,0,0)");
      vig.addColorStop(1, "rgba(0,0,0,0.45)");
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, w, h);

      // Nav legibility band
      const top = ctx.createLinearGradient(0, 0, 0, 100);
      top.addColorStop(0, "rgba(6, 10, 8, 0.5)");
      top.addColorStop(1, "rgba(6, 10, 8, 0)");
      ctx.fillStyle = top;
      ctx.fillRect(0, 0, w, 100);

      raf = requestAnimationFrame(frame);
    };

    resize();
    if (!reduce) spawnSeal();
    window.addEventListener("resize", resize);
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={ref} className="flow-field" aria-hidden />;
}
