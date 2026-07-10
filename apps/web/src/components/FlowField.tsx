import { useEffect, useRef } from "react";

/**
 * Corrix signature background — evidence lattice.
 * Claim nodes emit green verification streams that resolve into receipt nodes.
 * Canvas-based; respects prefers-reduced-motion.
 */
export function FlowField() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let w = 0;
    let h = 0;
    let raf = 0;
    let t = 0;

    type Node = {
      x: number;
      y: number;
      vx: number;
      vy: number;
      r: number;
      kind: "claim" | "source" | "proof";
      phase: number;
    };

    type Pulse = {
      from: number;
      to: number;
      p: number;
      speed: number;
    };

    let nodes: Node[] = [];
    let pulses: Pulse[] = [];

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
    };

    const seed = () => {
      const count = Math.min(48, Math.floor((w * h) / 28000));
      nodes = Array.from({ length: count }, (_, i) => {
        const kind: Node["kind"] =
          i % 5 === 0 ? "claim" : i % 3 === 0 ? "proof" : "source";
        return {
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.22,
          vy: (Math.random() - 0.5) * 0.22,
          r: kind === "claim" ? 3.2 : kind === "proof" ? 2.6 : 1.8,
          kind,
          phase: Math.random() * Math.PI * 2,
        };
      });
      pulses = [];
      for (let i = 0; i < Math.floor(count * 0.55); i++) {
        const from = Math.floor(Math.random() * nodes.length);
        let to = Math.floor(Math.random() * nodes.length);
        if (to === from) to = (to + 1) % nodes.length;
        pulses.push({
          from,
          to,
          p: Math.random(),
          speed: 0.002 + Math.random() * 0.004,
        });
      }
    };

    const dist = (a: Node, b: Node) => {
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      return Math.hypot(dx, dy);
    };

    const frame = () => {
      t += 0.008;
      ctx.clearRect(0, 0, w, h);

      // soft vertical depth wash
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, "rgba(11, 28, 18, 0.35)");
      g.addColorStop(0.45, "rgba(7, 11, 9, 0)");
      g.addColorStop(1, "rgba(5, 14, 10, 0.45)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      // slow aurora ribbon
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < 3; i++) {
        const y = h * (0.2 + i * 0.22) + Math.sin(t * 0.7 + i) * 40;
        const grad = ctx.createLinearGradient(0, y - 80, w, y + 80);
        grad.addColorStop(0, "rgba(184, 242, 74, 0)");
        grad.addColorStop(0.5, `rgba(184, 242, 74, ${0.03 + i * 0.01})`);
        grad.addColorStop(1, "rgba(184, 242, 74, 0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(0, y);
        for (let x = 0; x <= w; x += 24) {
          const yy =
            y +
            Math.sin(x * 0.004 + t * 1.2 + i) * 28 +
            Math.cos(x * 0.002 - t + i) * 18;
          ctx.lineTo(x, yy);
        }
        ctx.lineTo(w, y + 120);
        ctx.lineTo(0, y + 120);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();

      if (!reduce) {
        for (const n of nodes) {
          n.x += n.vx + Math.sin(t + n.phase) * 0.05;
          n.y += n.vy + Math.cos(t * 0.8 + n.phase) * 0.04;
          if (n.x < -20) n.x = w + 20;
          if (n.x > w + 20) n.x = -20;
          if (n.y < -20) n.y = h + 20;
          if (n.y > h + 20) n.y = -20;
        }
      }

      // edges — evidence lattice
      const linkDist = Math.min(180, w * 0.14);
      ctx.lineWidth = 1;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const d = dist(nodes[i], nodes[j]);
          if (d > linkDist) continue;
          const alpha = (1 - d / linkDist) * 0.18;
          ctx.strokeStyle = `rgba(184, 242, 74, ${alpha})`;
          ctx.beginPath();
          ctx.moveTo(nodes[i].x, nodes[i].y);
          ctx.lineTo(nodes[j].x, nodes[j].y);
          ctx.stroke();
        }
      }

      // traveling verification pulses
      if (!reduce) {
        for (const pulse of pulses) {
          pulse.p += pulse.speed;
          if (pulse.p > 1) {
            pulse.p = 0;
            pulse.from = pulse.to;
            pulse.to = Math.floor(Math.random() * nodes.length);
          }
          const a = nodes[pulse.from];
          const b = nodes[pulse.to];
          if (!a || !b) continue;
          const x = a.x + (b.x - a.x) * pulse.p;
          const y = a.y + (b.y - a.y) * pulse.p;
          const glow = ctx.createRadialGradient(x, y, 0, x, y, 10);
          glow.addColorStop(0, "rgba(184, 242, 74, 0.85)");
          glow.addColorStop(0.4, "rgba(184, 242, 74, 0.25)");
          glow.addColorStop(1, "rgba(184, 242, 74, 0)");
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(x, y, 10, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // nodes
      for (const n of nodes) {
        const pulse = 0.65 + Math.sin(t * 2 + n.phase) * 0.35;
        if (n.kind === "claim") {
          ctx.fillStyle = `rgba(242, 247, 240, ${0.55 * pulse})`;
        } else if (n.kind === "proof") {
          ctx.fillStyle = `rgba(184, 242, 74, ${0.75 * pulse})`;
        } else {
          ctx.fillStyle = `rgba(138, 154, 140, ${0.45 * pulse})`;
        }
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fill();

        if (n.kind === "proof") {
          ctx.strokeStyle = `rgba(184, 242, 74, ${0.2 * pulse})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.r + 4 + pulse * 2, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

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

  return (
    <canvas
      ref={ref}
      className="flow-field"
      aria-hidden
    />
  );
}
