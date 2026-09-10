// ---- Scenery: dead forest, restored forest, shrine, roots, crops ---------
const Props = (() => {
  const cache = new Map();
  function cached(key, w, h, draw) {
    let c = cache.get(key);
    if (c) return c;
    const o = Art.cv(w, h);
    draw(o.g, w, h);
    cache.set(key, o.c);
    return o.c;
  }
  const P = {};

  // ---- deadfall and stumps ------------------------------------------------
  P.deadfall = (v = 0) => cached('deadfall' + v, 30, 16, (g) => {
    const r = Art.rng(v * 71 + 3);
    if (v === 0) {                                  // fallen branch
      Art.limb(g, 2, 12, 26, 9, 3.4, 2, PAL.dead1);
      Art.limb(g, 10, 11, 15, 5, 2, 1, PAL.dead2);
      Art.limb(g, 19, 10, 24, 4, 1.8, 1, PAL.dead2);
      Art.rect(g, 4, 11, 18, 1, PAL.dead3);
    } else if (v === 1) {                           // stump
      Art.ell(g, 12, 13, 8, 4, PAL.dead0);
      Art.rect(g, 4, 6, 16, 8, PAL.dead1);
      Art.ell(g, 12, 6, 8, 3.4, PAL.dead2);
      Art.ell(g, 12, 6, 5, 2, PAL.dead3);
      Art.ell(g, 12, 6, 2, 0.9, PAL.dead1);
    } else if (v === 2) {                           // bones and pebbles
      Art.ell(g, 8, 12, 5, 2.4, PAL.bone);
      Art.rect(g, 6, 9, 8, 2, PAL.bone);
      Art.rect(g, 5, 8, 3, 3, PAL.boneD);
      Art.ell(g, 20, 13, 4, 2, PAL.stone2);
    } else {                                        // dry scrub
      for (let i = 0; i < 5; i++) Art.limb(g, 14, 14, 6 + i * 4, 4 + r() * 4, 1.6, 0.8, i % 2 ? PAL.dead2 : PAL.rot1);
    }
    Art.outline(g.canvas, PAL.ink, 0.55);
  });

  // Big background tree. `life` 0 = dead, 1 = full canopy.
  P.tree = (life, v = 0) => cached(`tree${life}:${v}`, 76, 104, (g) => {
    const r = Art.rng(v * 313 + 11);
    const cx = 38, base = 102;
    const lean = (r() - 0.5) * 6;
    Art.limb(g, cx, base, cx + lean, 40, 13, 6, PAL.bark1);
    Art.limb(g, cx - 3, base, cx + lean - 2, 42, 5, 2.4, PAL.bark2);
    Art.limb(g, cx + 4, base, cx + lean + 3, 44, 3.6, 1.8, PAL.bark0);
    for (let i = 0; i < 5; i++) {
      const side = i % 2 ? 1 : -1, y0 = 62 - i * 8;
      const x1 = cx + side * (16 + i * 3), y1 = y0 - 14 - i * 2;
      Art.limb(g, cx + side * 3, y0, x1, y1, 4 - i * 0.4, 1.4, PAL.bark1);
      Art.limb(g, x1, y1, x1 + side * 7, y1 - 8, 1.6, 0.9, PAL.bark0);
    }
    Art.limb(g, cx + lean, 44, cx + lean - 8, 26, 4, 1.4, PAL.bark1);
    Art.limb(g, cx + lean, 44, cx + lean + 9, 24, 4, 1.4, PAL.bark1);
    if (life > 0) {
      const cols = life > 0.66 ? [PAL.moss1, PAL.moss2, PAL.moss3, PAL.moss4]
        : life > 0.33 ? [PAL.moss1, PAL.moss2, PAL.rot1, PAL.moss3]
          : [PAL.rot0, PAL.rot1, PAL.dead3, PAL.moss1];
      const n = Math.round(4 + life * 6);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU, rad = 15 + r() * 12;
        const lx = cx + lean + Math.cos(a) * rad * 1.15, ly = 34 + Math.sin(a) * rad * 0.72;
        Art.ell(g, lx, ly, 9 + r() * 5, 6 + r() * 4, cols[0]);
        Art.ell(g, lx - 2, ly - 2, 6 + r() * 3, 4 + r() * 2, cols[1]);
        Art.ell(g, lx - 3, ly - 3, 3, 2.4, cols[2]);
        Art.speckle(g, lx, ly, 8, 5, cols[3], 8, i + v);
      }
    } else {
      for (let i = 0; i < 6; i++) {
        const a = -0.4 - (i / 6) * 2.3, rad = 16 + r() * 8;
        Art.limb(g, cx + lean, 40, cx + lean + Math.cos(a) * rad, 40 + Math.sin(a) * rad, 2, 0.8, PAL.dead1);
      }
    }
    Art.outline(g.canvas, PAL.ink, 0.6);
  });

  // ---- shrine ------------------------------------------------------------
  P.shrine = (lvl) => cached('shrine' + lvl, 96, 96, (g) => {
    const cx = 48, floor = 88;
    // stepped stone base
    Art.ell(g, cx, floor + 2, 38, 9, PAL.stone0);
    Art.ell(g, cx, floor, 35, 8, PAL.stone1);
    for (let i = 0; i < 3 + lvl; i++) {
      const w = 32 - i * 3.4, y = floor - 4 - i * 7;
      Art.rect(g, cx - w, y - 7, w * 2, 8, i % 2 ? PAL.stone2 : PAL.stone3);
      Art.rect(g, cx - w, y - 7, w * 2, 1.8, PAL.stone4);
      Art.rect(g, cx - w, y, w * 2, 1.8, PAL.stone0);
      if (i === 1) for (let k = -2; k <= 2; k++) Art.rect(g, cx + k * 9 - 2, y - 5, 4, 4, PAL.div2);
    }
    const top = floor - 4 - (3 + lvl) * 7;
    // altar slab and its bowl of fire
    Art.rect(g, cx - 20, top - 6, 40, 7, PAL.stone3);
    Art.rect(g, cx - 20, top - 6, 40, 1.8, PAL.stone4);
    Art.ell(g, cx, top - 7, 11, 4.4, PAL.stone1);
    Art.ell(g, cx, top - 8, 8.5, 3.2, PAL.stone0);
    Art.ell(g, cx, top - 10, 6, 3.4, PAL.div1);
    Art.ell(g, cx, top - 12, 4.2, 3, PAL.div3);
    Art.ell(g, cx, top - 14, 2.4, 2.4, PAL.div5);
    // flanking pillars with braziers and hanging cloth
    for (const sd of [-1, 1]) {
      const px = cx + sd * 32;
      Art.rect(g, px - 4, top - 10, 8, floor - top + 6, PAL.stone2);
      Art.rect(g, px - 4, top - 10, 2.4, floor - top + 6, PAL.stone3);
      Art.rect(g, px + 2, top - 10, 2, floor - top + 6, PAL.stone0);
      for (let y = top; y < floor - 8; y += 12) Art.rect(g, px - 5, y, 10, 2, PAL.stone1);
      Art.ell(g, px, top - 12, 6, 3, PAL.stone3);
      Art.ell(g, px, top - 14, 4, 2.6, PAL.gold1);
      Art.ell(g, px, top - 16, 2.6, 2.4, PAL.gold3);
      Art.ell(g, px, top - 18, 1.6, 1.6, PAL.gold4);
      // cloth
      Art.rect(g, px - sd * 3, top - 4, 7, 22, sd < 0 ? PAL.div2 : PAL.red1);
      for (let k = 0; k < 3; k++) Art.rect(g, px - sd * 3, top + 2 + k * 7, 7, 1.6, PAL.gold2);
      Art.rect(g, px - sd * 3, top + 18, 7, 3, PAL.gold1);
    }
    // carved sigils on the front face
    for (let k = -1; k <= 1; k++) { Art.rect(g, cx + k * 12 - 2, floor - 14, 4, 6, PAL.div1); Art.rect(g, cx + k * 12 - 1, floor - 13, 2, 4, PAL.div3); }
    Art.outline(g.canvas, PAL.ink, 0.75);
  });
  P.plinth = (w) => cached('plinth' + w, w, 26, (g, ww) => {
    Art.rect(g, 0, 0, ww, 6, PAL.stone3);
    Art.rect(g, 0, 0, ww, 2, PAL.stone4);
    Art.rect(g, 3, 6, ww - 6, 15, PAL.stone2);
    for (let x = 5; x < ww - 5; x += 9) Art.rect(g, x, 8, 4, 11, PAL.stone1);
    Art.rect(g, 0, 21, ww, 5, PAL.stone1);
    Art.rect(g, 0, 21, ww, 1.4, PAL.stone3);
    for (let x = 6; x < ww - 4; x += 14) { Art.rect(g, x, 1.6, 3, 3, PAL.div2); Art.rect(g, x, 1.6, 3, 1, PAL.div4); }
    Art.outline(g.canvas, PAL.ink, 0.6);
  });

  // ---- decorations --------------------------------------------------------
  P.brazier = () => cached('brazier', 22, 34, (g) => {
    Art.rect(g, 9, 18, 4, 14, PAL.stone2);
    Art.rect(g, 5, 30, 12, 4, PAL.stone1);
    Art.ell(g, 11, 17, 9, 4.5, PAL.stone3);
    Art.ell(g, 11, 16, 7, 3.4, PAL.stone1);
    Art.ell(g, 11, 14, 5, 3, PAL.red1);
    Art.ell(g, 11, 12, 4, 3.4, PAL.red2);
    Art.ell(g, 11, 10, 2.6, 2.6, PAL.gold3);
    Art.outline(g.canvas, PAL.ink, 0.7);
  });
  P.stones = () => cached('stones', 74, 52, (g) => {
    const hs = [40, 48, 34, 44];
    for (let i = 0; i < 4; i++) {
      const x = 8 + i * 18, h = hs[i];
      Art.rect(g, x, 50 - h, 12, h, PAL.stone2);
      Art.rect(g, x, 50 - h, 4, h, PAL.stone3);
      Art.rect(g, x + 9, 50 - h, 3, h, PAL.stone1);
      Art.rect(g, x, 50 - h, 12, 2, PAL.stone4);
      Art.rect(g, x + 3, 50 - h * 0.6, 5, 5, PAL.div2);
      Art.rect(g, x + 4, 50 - h * 0.6 + 1, 3, 3, PAL.div3);
    }
    Art.outline(g.canvas, PAL.ink, 0.6);
  });
  P.pool = () => cached('pool', 58, 24, (g) => {
    Art.ell(g, 29, 16, 28, 9, PAL.stone1);
    Art.ell(g, 29, 15, 25, 7.4, PAL.water0);
    Art.ell(g, 29, 15, 22, 6, PAL.water1);
    Art.ell(g, 25, 13, 12, 3, PAL.water2);
    Art.ell(g, 20, 12, 5, 1.4, PAL.water3);
    for (let i = 0; i < 6; i++) Art.ell(g, 6 + i * 9, 20, 4, 2.2, PAL.stone2);
    Art.outline(g.canvas, PAL.ink, 0.5);
  });
  P.idol = () => cached('idol', 34, 46, (g) => {
    Art.rect(g, 6, 38, 22, 8, PAL.stone1);
    Art.ell(g, 17, 26, 12, 13, PAL.stone2);
    Art.ellBand(g, 17, 26, 12, 13, PAL.stone3, 0, 0.3);
    Art.ell(g, 9, 15, 4, 4, PAL.stone2);
    Art.ell(g, 25, 15, 4, 4, PAL.stone2);
    Art.ell(g, 17, 17, 9, 8, PAL.stone2);
    Art.rect(g, 13, 16, 2, 2, PAL.div3);
    Art.rect(g, 20, 16, 2, 2, PAL.div3);
    Art.ell(g, 17, 21, 4, 3, PAL.stone1);
    Art.rect(g, 8, 30, 18, 2, PAL.moss2);
    Art.ell(g, 11, 33, 4, 2, PAL.moss1);
    Art.outline(g.canvas, PAL.ink, 0.7);
  });
  P.nest = () => cached('nest', 40, 22, (g) => {
    Art.ell(g, 20, 16, 19, 7, PAL.dead1);
    Art.ell(g, 20, 14, 16, 5.4, PAL.dead2);
    Art.ell(g, 20, 14, 12, 3.6, PAL.soil1);
    for (let i = 0; i < 10; i++) Art.limb(g, 3 + i * 3.6, 12 + (i % 3), 8 + i * 3.4, 17 - (i % 2) * 2, 1.4, 1, i % 2 ? PAL.dead2 : PAL.dead3);
    Art.ell(g, 16, 13, 3, 2, PAL.moss3);
    Art.outline(g.canvas, PAL.ink, 0.6);
  });
  P.stall = () => cached('stall', 62, 46, (g) => {
    Art.rect(g, 2, 22, 58, 4, PAL.bark2);
    Art.rect(g, 4, 26, 54, 16, PAL.bark1);
    for (let x = 6; x < 58; x += 7) Art.rect(g, x, 27, 3, 14, PAL.bark0);
    Art.rect(g, 0, 18, 62, 5, PAL.dead1);
    for (let i = 0; i < 7; i++) Art.rect(g, 1 + i * 9, 12, 5, 7, i % 2 ? PAL.red1 : PAL.parch0);
    Art.rect(g, 0, 10, 62, 3, PAL.bark2);
    Art.rect(g, 2, 10, 3, 34, PAL.bark2);
    Art.rect(g, 57, 10, 3, 34, PAL.bark2);
    Art.ell(g, 20, 21, 4, 2.4, PAL.gold2);
    Art.ell(g, 32, 21, 3.4, 2, PAL.div3);
    Art.ell(g, 43, 21, 3.4, 2, PAL.cyan2);
    Art.outline(g.canvas, PAL.ink, 0.6);
  });

  // ---- crops --------------------------------------------------------------
  // Drawn live so growth reads continuously rather than in stages.
  function drawCrop(g, def, x, y, p, time, wet) {
    const sway = Math.sin(time * 1.4 + x * 0.07) * (1 + p) * 0.9;
    const h = 4 + p * 16;
    if (wet) { g.fillStyle = 'rgba(87,182,201,0.22)'; Art.ell(g, x, y + 1, 8, 3); }
    g.fillStyle = 'rgba(24,18,14,0.25)'; Art.ell(g, x, y, 5 + p * 3, 2);
    // stem
    g.fillStyle = PAL.moss1;
    for (let i = 0; i < h; i++) g.fillRect(Math.round(x + (sway * i) / h), Math.round(y - i), 1, 1);
    const tipX = x + sway, tipY = y - h;
    // leaves
    g.fillStyle = PAL.moss2;
    for (let i = 1; i <= 2 + Math.floor(p * 2); i++) {
      const ly = y - (h * i) / (3 + p), side = i % 2 ? 1 : -1;
      g.fillRect(Math.round(x + (sway * (y - ly)) / h + side * 1), Math.round(ly), 3 * side > 0 ? 3 : -3, 1);
      g.fillStyle = i % 2 ? PAL.moss3 : PAL.moss2;
    }
    if (p < 0.35) return;
    // head, shaped per crop
    const s = (p - 0.35) / 0.65;
    switch (def.key) {
      case 'ashgrass':
        g.fillStyle = def.color;
        for (let i = 0; i < 5; i++) g.fillRect(Math.round(tipX - 2 + i), Math.round(tipY - 3 - (i % 2) * 2), 1, 4);
        break;
      case 'sunroot':
        g.fillStyle = def.color; Art.ell(g, tipX, tipY, 3 + s * 2, 3 + s * 2);
        g.fillStyle = PAL.gold4; Art.ell(g, tipX - 1, tipY - 1, 1.6, 1.6);
        break;
      case 'resinbud':
        g.fillStyle = def.color; Art.ell(g, tipX, tipY, 2.4 + s * 1.6, 3 + s * 2);
        g.fillStyle = PAL.gold3; g.fillRect(Math.round(tipX), Math.round(tipY + 2), 1, 3);
        break;
      case 'duskhusk':
        g.fillStyle = def.color; Art.ell(g, tipX, tipY, 2 + s * 1.6, 3.4 + s * 2);
        g.fillStyle = PAL.boneD; Art.ell(g, tipX + 1, tipY, 1, 2);
        break;
      case 'ironbulb':
        g.fillStyle = def.color; Art.ell(g, tipX, tipY, 3 + s * 2, 2.6 + s * 1.6);
        g.fillStyle = PAL.stone4; g.fillRect(Math.round(tipX - 1), Math.round(tipY - 2), 2, 1);
        break;
      case 'broadleaf':
        g.fillStyle = def.color; Art.ell(g, tipX, tipY, 5 + s * 4, 2.4 + s * 1.4);
        g.fillStyle = PAL.moss4; g.fillRect(Math.round(tipX - 4 - s * 3), Math.round(tipY), Math.round(8 + s * 6), 1);
        break;
      case 'goldwheat':
        for (let i = 0; i < 4; i++) { g.fillStyle = i % 2 ? PAL.gold3 : PAL.gold2; Art.ell(g, tipX, tipY + i * 2.2, 1.8 + s, 1.4); }
        break;
      case 'runeberry':
        for (let i = 0; i < 3; i++) {
          const a = i * 2.1;
          g.fillStyle = PAL.div3; Art.ell(g, tipX + Math.cos(a) * 3, tipY + Math.sin(a) * 2.4, 1.8 + s, 1.8 + s);
          g.fillStyle = PAL.div5; g.fillRect(Math.round(tipX + Math.cos(a) * 3), Math.round(tipY + Math.sin(a) * 2.4 - 1), 1, 1);
        }
        break;
    }
    if (p >= 1) {
      const tw = 0.5 + 0.5 * Math.sin(time * 5 + x);
      g.fillStyle = `rgba(255,238,176,${0.35 + tw * 0.4})`;
      g.fillRect(Math.round(tipX + 4), Math.round(tipY - 5), 2, 2);
    }
  }

  // ---- Tree of Knowledge: a network of roots, fruit at the tips -----------
  // Returns the drawing plus the seat of every fruit, so skills hang on the
  // structure instead of being laid out over it.
  function buildRoots(w, h, seed, ripeCount) {
    const key = `roots:${w}:${h}:${seed}:${ripeCount}`;
    let hit = cache.get(key);
    if (hit) return hit;
    const { c, g } = Art.cv(w, h);
    const rnd = Art.rng(seed);
    const cx = w / 2, topY = 20;
    const anchors = [];
    // the trunk coming down from the surface
    Art.limb(g, cx, 0, cx, topY + 30, 26, 20, PAL.bark1);
    Art.limb(g, cx - 6, 0, cx - 6, topY + 26, 8, 5, PAL.bark2);
    Art.limb(g, cx + 8, 0, cx + 7, topY + 24, 5, 3, PAL.bark0);
    // three main roots, each carrying four fruit
    const dirs = [-1, 0, 1];
    for (let b = 0; b < 3; b++) {
      const dir = dirs[b];
      let x = cx, y = topY + 26, wdt = 12;
      const steps = 4;
      for (let i = 0; i < steps; i++) {
        const t = i / steps;
        const nx = cx + dir * (w * 0.42) * (t + 0.3) + (dir === 0 ? (rnd() - 0.5) * 22 : 0);
        const ny = y + (h - topY - 60) / steps;
        Art.limb(g, x, y, nx, ny, wdt, wdt * 0.72, PAL.bark1);
        Art.limb(g, x - wdt * 0.2, y, nx - wdt * 0.18, ny, wdt * 0.34, wdt * 0.24, PAL.bark2);
        Art.limb(g, x + wdt * 0.26, y, nx + wdt * 0.2, ny, wdt * 0.22, wdt * 0.16, PAL.bark0);
        // hairs
        for (let k = 0; k < 5; k++) {
          const ht = (k + 1) / 6;
          const hx = U.lerp(x, nx, ht), hy = U.lerp(y, ny, ht);
          const side = k % 2 ? 1 : -1;
          Art.limb(g, hx, hy, hx + side * (10 + rnd() * 12), hy + 6 + rnd() * 8, 2.4, 0.8, PAL.bark2);
        }
        // the seat for this root's i-th fruit, hanging just below
        const sx = Math.round(U.lerp(x, nx, 0.72) + dir * 6);
        const sy = Math.round(U.lerp(y, ny, 0.72) + 13);
        Art.limb(g, U.lerp(x, nx, 0.72), U.lerp(y, ny, 0.72), sx, sy - 6, 2.6, 1.4, PAL.bark2);
        anchors.push({ x: sx, y: sy, root: b, i });
        x = nx; y = ny; wdt *= 0.78;
      }
      Art.limb(g, x, y, x + dir * 26, y + 26, wdt, 1, PAL.bark2);
      // a secondary root that peels away and crosses back toward the middle,
      // so the three mains read as one connected network
      let sx2 = cx + dir * (w * 0.12), sy2 = topY + 60 + b * 30, sw = 7 - b;
      for (let i = 0; i < 3; i++) {
        const nx = sx2 + dir * (w * 0.1) * (1 - i * 0.4) - dir * (i === 2 ? w * 0.14 : 0);
        const ny = sy2 + (h - topY) * 0.19;
        Art.limb(g, sx2, sy2, nx, ny, sw, sw * 0.7, PAL.bark0);
        Art.limb(g, sx2, sy2 - sw * 0.2, nx, ny - sw * 0.15, sw * 0.4, sw * 0.3, PAL.bark1);
        for (let k = 0; k < 2; k++) {
          const ht = (k + 1) / 3;
          const hx = U.lerp(sx2, nx, ht), hy = U.lerp(sy2, ny, ht);
          Art.limb(g, hx, hy, hx - dir * (8 + rnd() * 14), hy + 7 + rnd() * 9, 1.8, 0.7, PAL.bark1);
        }
        sx2 = nx; sy2 = ny; sw *= 0.76;
      }
    }
    // soil speckle so the roots sit in earth
    for (let i = 0; i < 260; i++) {
      const px = rnd() * w, py = topY + rnd() * (h - topY);
      Art.rect(g, px, py, 1, 1, rnd() < 0.5 ? 'rgba(60,42,28,0.5)' : 'rgba(140,110,78,0.16)');
    }
    Art.outline(c, PAL.ink, 0.6);
    const res = { canvas: c, anchors };
    cache.set(key, res);
    return res;
  }

  return { P, get: (n, v) => P[n](v), drawCrop, buildRoots, clear: () => cache.clear() };
})();
