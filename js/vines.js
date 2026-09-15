// ---- Vines over the frame --------------------------------------------------
// The wood the interface is built out of has been in the forest a long time and
// the forest has started taking it back. Each vine is a verlet chain pinned at
// the top: gravity pulls it down, a slow wind pushes it sideways, and the
// pointer shoves the segments it passes through. Purely decorative and
// pointer-transparent, but it is real physics, so it settles and swings.
const Vines = (() => {
  let canvas = null, g = null, W = 0, H = 0, ready = false;
  const vines = [];
  let px = -999, py = -999, lastPX = -999, lastPY = -999, pvx = 0, pvy = 0;
  let acc = 0;

  const LEAF0 = '#1d3a1e', LEAF1 = '#2f6b32', LEAF2 = '#4d9a45', LEAF3 = '#7fc55f';
  const STEM0 = '#23351d', STEM1 = '#3c5c2c', STEM2 = '#587f3c';
  const FLOW = ['#c98ad8', '#e8a0b8', '#f0d07a'];

  function makeVine(ax, ay, n, len, seed, side) {
    const r = Art.rng(seed);
    const pts = [];
    for (let i = 0; i < n; i++) {
      pts.push({ x: ax + (r() - 0.5) * 2, y: ay + i * len, ox: ax, oy: ay + i * len });
    }
    const leaves = [];
    for (let i = 2; i < n; i++) {
      if (r() < 0.85) leaves.push({ i, side: r() < 0.5 ? -1 : 1, s: 0.95 + r() * 0.75, ph: r() * TAU });
      if (r() < 0.4) leaves.push({ i, side: r() < 0.5 ? 1 : -1, s: 0.7 + r() * 0.5, ph: r() * TAU });
    }
    return {
      pts, len, leaves, side, sway: r() * TAU, rate: 0.5 + r() * 0.5,
      flower: r() < 0.45 ? { col: FLOW[Math.floor(r() * FLOW.length)], s: 0.8 + r() * 0.5 } : null,
      thick: 4 + Math.round(r() * 2),
    };
  }

  function build() {
    vines.length = 0;
    if (!W || !H) return;
    // along the top edge, thickest in the corners where the frame is heaviest
    // The two top corners belong to the coin chip and the to-do tablet, so
    // nothing is hung over them.
    const KEEP_L = 200, KEEP_R = 256;
    const n = Math.max(7, Math.round(W / 110));
    for (let i = 0; i < n; i++) {
      const u = (i + 0.5) / n;
      const ax = u * W + (i % 2 ? 9 : -9);
      const edge = Math.min(u, 1 - u);
      const clear = ax > KEEP_L && ax < W - KEEP_R;
      const segs = clear ? 8 + Math.round((1 - edge * 1.8) * 9) : 4;
      vines.push(makeVine(ax, -6, U.clamp(segs, 4, 16), 13, 9001 + i * 37, 0));
    }
    // and long ones down each side, hugging the very edge of the frame
    for (const sd of [-1, 1]) {
      const ax = sd < 0 ? 7 : W - 7;
      vines.push(makeVine(ax, -6, 24, 14, sd < 0 ? 733 : 977, sd));
      vines.push(makeVine(ax + sd * -18, -6, 9, 13, sd < 0 ? 611 : 823, sd));
    }
  }

  function resize() {
    if (!canvas) return;
    const st = canvas.parentElement.getBoundingClientRect();
    const w = Math.max(1, Math.round(st.width)), h = Math.max(1, Math.round(st.height));
    if (w === W && h === H) return;
    W = w; H = h;
    canvas.width = W; canvas.height = H;
    g = canvas.getContext('2d');
    g.imageSmoothingEnabled = false;
    build();
  }

  function init() {
    const frame = document.getElementById('frame');
    if (!frame) return;
    canvas = document.createElement('canvas');
    canvas.id = 'vines';
    frame.appendChild(canvas);
    resize();
    window.addEventListener('resize', resize);
    // the pointer is tracked in frame space, so the vines feel attached to it
    frame.addEventListener('pointermove', (e) => {
      const r = frame.getBoundingClientRect();
      px = e.clientX - r.left; py = e.clientY - r.top;
    });
    frame.addEventListener('pointerleave', () => { px = -999; py = -999; });
    ready = true;
  }

  // one fixed step, so the chains behave the same whatever the frame rate
  function step(h) {
    const grav = 900 * h * h;
    for (const v of vines) {
      v.sway += h * v.rate;
      const wind = Math.sin(v.sway) * 26 * h * h + Math.sin(v.sway * 2.7) * 9 * h * h;
      for (let i = 1; i < v.pts.length; i++) {
        const p = v.pts[i];
        let vx = (p.x - p.ox) * 0.985, vy = (p.y - p.oy) * 0.985;
        p.ox = p.x; p.oy = p.y;
        p.x += vx + wind * (i / v.pts.length);
        p.y += vy + grav;
        // the pointer shoves anything it runs through, and drags it along
        const dx = p.x - px, dy = p.y - py;
        const d2 = dx * dx + dy * dy;
        if (d2 < 3600) {
          const d = Math.sqrt(d2) || 1;
          const k = (1 - d / 60);
          p.x += (dx / d) * k * 9 + pvx * k * 0.22;
          p.y += (dy / d) * k * 9 + pvy * k * 0.22;
        }
      }
      // hold the links together; the first point is pinned to the frame
      for (let pass = 0; pass < 4; pass++) {
        for (let i = 0; i < v.pts.length - 1; i++) {
          const a = v.pts[i], b = v.pts[i + 1];
          const dx = b.x - a.x, dy = b.y - a.y;
          const d = Math.hypot(dx, dy) || 1;
          const diff = (d - v.len) / d * 0.5;
          const ox = dx * diff, oy = dy * diff;
          if (i > 0) { a.x += ox; a.y += oy; }
          b.x -= ox; b.y -= oy;
        }
      }
    }
  }

  function update(dt) {
    if (!ready || !g) return;
    pvx = px - lastPX; pvy = py - lastPY;
    if (lastPX < -900) { pvx = 0; pvy = 0; }
    lastPX = px; lastPY = py;
    acc += Math.min(0.05, dt);
    let n = 0;
    while (acc >= 1 / 60 && n < 3) { step(1 / 60); acc -= 1 / 60; n++; }
    if (n >= 3) acc = 0;
    draw();
  }

  function draw() {
    g.clearRect(0, 0, W, H);
    for (const v of vines) {
      const p = v.pts;
      // the stem, three passes so it has a dark edge and a lit side
      for (const [w, col] of [[v.thick + 2, STEM0], [v.thick, STEM1], [Math.max(1, v.thick - 3), STEM2]]) {
        for (let i = 0; i < p.length - 1; i++) {
          const taper = 1 - (i / p.length) * 0.45;
          Art.line(g, p[i].x, p[i].y, p[i + 1].x, p[i + 1].y, col, Math.max(1, w * taper));
        }
      }
      // leaves, hanging off alternate joints
      for (const lf of v.leaves) {
        const a = p[lf.i], b = p[Math.min(p.length - 1, lf.i + 1)];
        const ang = Math.atan2(b.y - a.y, b.x - a.x) + lf.side * 1.05;
        const L = 8 * lf.s, Wd = 5 * lf.s;
        const mx = a.x + Math.cos(ang) * L * 0.6, my = a.y + Math.sin(ang) * L * 0.6;
        g.save(); g.translate(mx, my); g.rotate(ang);
        Art.ell(g, 0, 0, L, Wd, LEAF0);
        Art.ell(g, 0, 0, L - 1.2, Wd - 1.2, LEAF1);
        Art.ell(g, -L * 0.25, -Wd * 0.25, L * 0.5, Wd * 0.45, LEAF2);
        Art.ell(g, -L * 0.35, -Wd * 0.35, L * 0.22, Wd * 0.22, LEAF3);
        g.restore();
      }
      // and a flower on the tip of the ones that have one
      if (v.flower) {
        const e = p[p.length - 1];
        for (let i = 0; i < 5; i++) {
          const a2 = (i / 5) * TAU + v.sway * 0.2;
          Art.ell(g, e.x + Math.cos(a2) * 3.4 * v.flower.s, e.y + Math.sin(a2) * 3.4 * v.flower.s,
            2.6 * v.flower.s, 2.6 * v.flower.s, v.flower.col);
        }
        Art.ell(g, e.x, e.y, 2.2 * v.flower.s, 2.2 * v.flower.s, '#f5e6a8');
        Art.ell(g, e.x - 0.6, e.y - 0.6, 1 * v.flower.s, 1 * v.flower.s, '#fffdf0');
      }
    }
  }

  return { init, update, resize, get ready() { return ready; } };
})();
