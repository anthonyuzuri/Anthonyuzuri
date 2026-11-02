/**
 * Interactive neural constellation — invisible by default, the network
 * materialises around the cursor: nearby nodes glow, link to each other,
 * and drift gently toward the pointer. No free-floating "static" dots.
 * Squared-distance math, DPR-capped, paused offscreen.
 */

const NODE_COUNT = 55;
const LINK_DIST = 150;
const CURSOR_DIST = 260;
const LINK_D2 = LINK_DIST * LINK_DIST;
const CURSOR_D2 = CURSOR_DIST * CURSOR_DIST;

export function initPlexus(canvasId, { reducedMotion = false } = {}) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || reducedMotion) return;

  const ctx = canvas.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio, 1.5);
  let w = 0;
  let h = 0;
  let visible = true;
  const pointer = { x: -9999, y: -9999 };

  function resize() {
    const r = canvas.getBoundingClientRect();
    w = r.width; h = r.height;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize);

  const nodes = Array.from({ length: NODE_COUNT }, () => ({
    x: Math.random(),
    y: Math.random(),
    vx: (Math.random() - 0.5) * 0.0003,
    vy: (Math.random() - 0.5) * 0.0003,
    r: 1 + Math.random() * 1.4,
  }));

  window.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect();
    pointer.x = e.clientX - r.left;
    pointer.y = e.clientY - r.top;
  }, { passive: true });

  const io = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; });
  io.observe(canvas);

  const px = new Float32Array(NODE_COUNT);
  const py = new Float32Array(NODE_COUNT);
  const glow = new Float32Array(NODE_COUNT); // 0..1 proximity to cursor

  function frame() {
    requestAnimationFrame(frame);
    if (!visible) return;
    ctx.clearRect(0, 0, w, h);

    for (let i = 0; i < NODE_COUNT; i += 1) {
      const n = nodes[i];
      n.x += n.vx; n.y += n.vy;
      if (n.x < 0 || n.x > 1) n.vx *= -1;
      if (n.y < 0 || n.y > 1) n.vy *= -1;
      let x = n.x * w;
      let y = n.y * h;

      const dx = pointer.x - x;
      const dy = pointer.y - y;
      const d2 = dx * dx + dy * dy;
      const t = d2 < CURSOR_D2 ? 1 - Math.sqrt(d2) / CURSOR_DIST : 0;
      glow[i] = t;
      if (t > 0) { // gentle pull toward the cursor — the network leans in
        x += dx * t * 0.08;
        y += dy * t * 0.08;
      }
      px[i] = x; py[i] = y;
    }

    ctx.lineWidth = 1;
    for (let i = 0; i < NODE_COUNT; i += 1) {
      const gi = glow[i];
      for (let j = i + 1; j < NODE_COUNT; j += 1) {
        const g = Math.max(gi, glow[j]);
        if (g <= 0.02) continue; // links only exist near the cursor
        const dx = px[i] - px[j];
        const dy = py[i] - py[j];
        const d2 = dx * dx + dy * dy;
        if (d2 < LINK_D2) {
          const t = (1 - d2 / LINK_D2) * g;
          ctx.strokeStyle = `rgba(87, 212, 255, ${(0.28 * t).toFixed(3)})`;
          ctx.beginPath(); ctx.moveTo(px[i], py[i]); ctx.lineTo(px[j], py[j]); ctx.stroke();
        }
      }
      if (gi > 0.03) {
        ctx.strokeStyle = `rgba(160, 107, 255, ${(0.3 * gi).toFixed(3)})`;
        ctx.beginPath(); ctx.moveTo(px[i], py[i]); ctx.lineTo(pointer.x, pointer.y); ctx.stroke();
        ctx.fillStyle = `rgba(233, 237, 251, ${(0.85 * gi).toFixed(3)})`;
        ctx.beginPath(); ctx.arc(px[i], py[i], nodes[i].r * (0.7 + gi * 0.6), 0, Math.PI * 2); ctx.fill();
      }
    }
  }
  frame();
}
