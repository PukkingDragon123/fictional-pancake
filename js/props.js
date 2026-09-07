// ---- Procedural props: the Wombat Tree, farm scenery, big-top scenery ------
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

  // ---- The Wombat Tree ----------------------------------------------------
  // One generator serves both the small farm tree and the tall climbing view.
  // Returns { canvas, anchors } where anchors are branch seats for skill nodes,
  // in art pixels, ordered bough-by-bough from the lowest bough up.
  const BOUGH_T = [0.34, 0.58, 0.80];   // height up the trunk of each bough
  function buildTree(w, h, stage, seed, opts = {}) {
    const key = `tree:${w}:${h}:${stage}:${seed}:${opts.detail || 0}`;
    let hit = cache.get(key);
    if (hit) return hit;
    const { c, g } = Art.cv(w, h);
    const r = Art.rng(seed);
    const cx = Math.round(w / 2), baseY = h - 2;
    const anchors = [];
    const grow = U.clamp(stage / 5, 0, 1);
    const trunkTop = baseY - (h - 30) * U.lerp(0.28, 1, grow);
    const trunkW = U.lerp(w * 0.06, w * 0.15, grow);

    // roots, once the trunk is thick enough to flare
    if (stage >= 2) for (let i = -2; i <= 2; i++) {
      if (i === 0) continue;
      Art.limb(g, cx + i * trunkW * 0.35, baseY - 6, cx + i * trunkW * 1.6, baseY + 1, trunkW * 0.3, 1.5, PAL.bark1);
    }
    // trunk, slightly tapered with a lean
    const lean = (r() - 0.5) * w * 0.03;
    Art.limb(g, cx, baseY, cx + lean, trunkTop, trunkW, trunkW * 0.45, PAL.bark2);
    Art.limb(g, cx - trunkW * 0.22, baseY, cx + lean - trunkW * 0.18, trunkTop, trunkW * 0.34, trunkW * 0.18, PAL.bark3);
    Art.limb(g, cx + trunkW * 0.3, baseY, cx + lean + trunkW * 0.22, trunkTop, trunkW * 0.28, trunkW * 0.14, PAL.bark0);
    // bark texture
    for (let i = 0; i < 30 * (0.4 + grow); i++) {
      const t = r(), y = U.lerp(baseY, trunkTop, t);
      const bw = U.lerp(trunkW, trunkW * 0.45, t);
      Art.rect(g, cx + lean * t + (r() - 0.5) * bw * 0.7, y, 1, 1 + Math.round(r() * 3), r() < 0.5 ? PAL.bark0 : PAL.bark3);
    }
    // knot hollow, appears once the tree is grown
    if (stage >= 3) {
      const ky = U.lerp(baseY, trunkTop, 0.42);
      Art.ell(g, cx + lean * 0.4, ky, trunkW * 0.3, trunkW * 0.24, PAL.bark0);
      Art.ell(g, cx + lean * 0.4, ky + 1, trunkW * 0.2, trunkW * 0.14, '#1a0f08');
    }

    function leafClump(x, y, rx, ry, gold) {
      const cols = gold ? [PAL.leaf1, PAL.leaf2, PAL.gold, PAL.goldL] : [PAL.leaf0, PAL.leaf1, PAL.leaf2, PAL.leaf3];
      Art.ell(g, x, y, rx, ry, cols[0]);
      Art.ell(g, x - rx * 0.25, y - ry * 0.25, rx * 0.75, ry * 0.7, cols[1]);
      Art.ell(g, x - rx * 0.35, y - ry * 0.4, rx * 0.45, ry * 0.42, cols[2]);
      Art.speckle(g, x, y, rx, ry, cols[3], Math.round(rx * ry * 0.22), Math.floor(x * 31 + y));
      Art.speckle(g, x, y + ry * 0.4, rx * 0.9, ry * 0.5, cols[0], Math.round(rx * 0.8), Math.floor(y * 17 + x));
    }
    // boughs
    const nBoughs = U.clamp(stage, 0, 3);
    for (let b = 0; b < nBoughs; b++) {
      const dir = b % 2 === 0 ? -1 : 1;
      const y0 = U.lerp(baseY, trunkTop, BOUGH_T[b]);
      const reach = w * U.lerp(0.16, 0.34, grow) * (1 + b * 0.04);
      const x1 = cx + dir * reach, y1 = y0 - h * 0.09;
      const bw = trunkW * (0.55 - b * 0.06);
      Art.limb(g, cx + dir * trunkW * 0.3, y0, x1, y1, bw, bw * 0.35, PAL.bark2);
      Art.limb(g, cx + dir * trunkW * 0.3, y0 - bw * 0.2, x1, y1 - bw * 0.15, bw * 0.4, bw * 0.2, PAL.bark3);
      // twigs + four seats along the bough
      for (let k = 0; k < 4; k++) {
        const t = 0.3 + k * 0.22;
        const ax = U.lerp(cx + dir * trunkW * 0.3, x1, t), ay = U.lerp(y0, y1, t);
        const up = (k % 2 === 0 ? -1 : 1);
        const tx = ax + dir * 3, ty = ay + up * h * 0.035 - h * 0.02;
        Art.limb(g, ax, ay, tx, ty, bw * 0.28, 1.2, PAL.bark1);
        anchors.push({ x: Math.round(tx), y: Math.round(ty), bough: b, slot: k });
        if (stage > b) leafClump(tx, ty - h * 0.012, w * 0.075, h * 0.045, stage >= 5);
      }
      leafClump(x1 + dir * w * 0.02, y1 - h * 0.02, w * 0.1, h * 0.06, stage >= 5);
    }
    // crown
    if (stage >= 1) {
      const cs = U.lerp(0.7, 1.35, grow);
      leafClump(cx + lean, trunkTop - h * 0.03, w * 0.13 * cs, h * 0.075 * cs, stage >= 5);
      leafClump(cx + lean - w * 0.1 * cs, trunkTop + h * 0.02, w * 0.1 * cs, h * 0.055 * cs, stage >= 5);
      leafClump(cx + lean + w * 0.1 * cs, trunkTop + h * 0.01, w * 0.1 * cs, h * 0.055 * cs, stage >= 5);
      if (stage >= 4) {
        leafClump(cx + lean, trunkTop - h * 0.085, w * 0.105, h * 0.052, stage >= 5);
        leafClump(cx + lean - w * 0.17 * cs, trunkTop + h * 0.055, w * 0.085 * cs, h * 0.046 * cs, stage >= 5);
        leafClump(cx + lean + w * 0.17 * cs, trunkTop + h * 0.045, w * 0.085 * cs, h * 0.046 * cs, stage >= 5);
      }
    } else {
      // freshly planted: a slender stem, four leaves and a tied stake
      Art.limb(g, cx, baseY - 2, cx + lean, trunkTop - h * 0.06, Math.max(2, trunkW * 0.5), 1.5, PAL.bark2);
      const sy = trunkTop - h * 0.06;
      for (let i = 0; i < 4; i++) {
        const side = i % 2 === 0 ? -1 : 1;
        const ly = sy + i * h * 0.028;
        Art.limb(g, cx, ly, cx + side * w * 0.1, ly - h * 0.012, 1.5, 1, PAL.leaf1);
        leafClump(cx + side * w * 0.13, ly - h * 0.016, w * 0.06, h * 0.025, false);
      }
      Art.rect(g, cx + w * 0.11, baseY - h * 0.2, Math.max(1, w * 0.014), h * 0.2, PAL.wood2);
      Art.rect(g, cx + w * 0.03, baseY - h * 0.15, w * 0.1, Math.max(1, h * 0.008), PAL.parch0);
    }
    Art.outline(c, PAL.ink, 0.75);
    const res = { canvas: c, anchors, trunkX: cx, trunkTop, baseY, lean };
    cache.set(key, res);
    return res;
  }

  // ---- Farm scenery -------------------------------------------------------
  const P = {};
  P.fence = () => cached('fence', 32, 26, (g) => {
    Art.rect(g, 0, 8, 32, 3, PAL.wood3);   // upper rail
    Art.rect(g, 0, 8, 32, 1, PAL.wood4);
    Art.rect(g, 0, 16, 32, 3, PAL.wood2);  // lower rail
    Art.rect(g, 4, 2, 5, 22, PAL.wood2);   // post
    Art.rect(g, 4, 2, 2, 22, PAL.wood3);
    Art.rect(g, 4, 1, 5, 2, PAL.wood4);
    Art.rect(g, 7, 4, 1, 1, PAL.wood1); Art.rect(g, 5, 13, 1, 1, PAL.wood1);
  });
  P.gate = () => cached('gate', 40, 28, (g) => {
    Art.rect(g, 0, 2, 4, 24, PAL.wood2); Art.rect(g, 36, 2, 4, 24, PAL.wood2);
    Art.rect(g, 2, 8, 36, 3, PAL.wood3); Art.rect(g, 2, 17, 36, 3, PAL.wood3);
    Art.line(g, 4, 22, 36, 7, PAL.wood3, 3);
    Art.rect(g, 18, 12, 4, 3, PAL.gold);
  });
  P.barn = () => cached('barn', 96, 72, (g) => {
    Art.rect(g, 6, 26, 84, 44, PAL.red);                 // walls
    Art.rect(g, 6, 26, 84, 3, PAL.redL);
    for (let x = 10; x < 88; x += 8) Art.rect(g, x, 30, 1, 40, PAL.redD);
    // gambrel roof
    Art.line(g, 4, 26, 30, 10, PAL.wood1, 4); Art.line(g, 30, 10, 66, 10, PAL.wood1, 4); Art.line(g, 66, 10, 92, 26, PAL.wood1, 4);
    Art.rect(g, 2, 24, 92, 4, PAL.wood0);
    Art.rect(g, 30, 6, 36, 6, PAL.wood1);
    // big doors
    Art.rect(g, 34, 42, 28, 28, PAL.wood2);
    Art.rect(g, 34, 42, 28, 2, PAL.wood3);
    Art.rect(g, 47, 42, 2, 28, PAL.wood0);
    Art.line(g, 35, 68, 47, 44, PAL.wood3, 2); Art.line(g, 61, 68, 49, 44, PAL.wood3, 2);
    // hayloft window + trim
    Art.rect(g, 42, 14, 12, 10, PAL.wood0); Art.rect(g, 44, 16, 8, 6, PAL.gold);
    Art.rect(g, 47, 14, 2, 10, PAL.wood1);
    Art.rect(g, 12, 46, 12, 10, PAL.cream); Art.rect(g, 13, 47, 10, 8, PAL.sky1);
    Art.rect(g, 17, 47, 2, 8, PAL.cream); Art.rect(g, 13, 50, 10, 2, PAL.cream);
    Art.rect(g, 72, 46, 12, 10, PAL.cream); Art.rect(g, 73, 47, 10, 8, PAL.sky1);
    Art.rect(g, 77, 47, 2, 8, PAL.cream); Art.rect(g, 73, 50, 10, 2, PAL.cream);
    Art.outline(g.canvas, PAL.ink, 0.5);
  });
  P.silo = () => cached('silo', 30, 78, (g) => {
    Art.rect(g, 2, 14, 26, 64, PAL.stone2);
    for (let y = 18; y < 78; y += 8) Art.rect(g, 2, y, 26, 1, PAL.stone1);
    Art.rect(g, 2, 14, 4, 64, PAL.cream); Art.rect(g, 24, 14, 4, 64, PAL.stone0);
    Art.ell(g, 15, 14, 15, 9, PAL.wood2); Art.ellBand(g, 15, 14, 15, 9, PAL.wood3, 0, 0.4);
    Art.rect(g, 14, 2, 2, 5, PAL.ink2); Art.rect(g, 12, 2, 6, 2, PAL.gold);
    Art.outline(g.canvas, PAL.ink, 0.5);
  });
  P.trough = () => cached('trough', 40, 16, (g) => {
    Art.rect(g, 0, 4, 40, 10, PAL.wood2);
    Art.rect(g, 0, 4, 40, 2, PAL.wood3);
    Art.rect(g, 3, 6, 34, 5, PAL.water1);
    Art.rect(g, 3, 6, 34, 1, PAL.water2);
    Art.speckle(g, 20, 8, 15, 2, PAL.water2, 8, 3);
    Art.rect(g, 0, 12, 40, 2, PAL.wood1);
    Art.rect(g, 2, 14, 4, 2, PAL.wood1); Art.rect(g, 34, 14, 4, 2, PAL.wood1);
    Art.outline(g.canvas, PAL.ink, 0.6);
  });
  P.hay = () => cached('hay', 26, 20, (g) => {
    Art.ell(g, 13, 12, 12, 8, PAL.gold);
    Art.ellBand(g, 13, 12, 12, 8, PAL.goldD, 0.55, 1);
    Art.ellBand(g, 13, 12, 12, 8, PAL.goldL, 0, 0.22);
    Art.speckle(g, 13, 12, 10, 6, PAL.goldD, 22, 9);
    Art.rect(g, 4, 8, 18, 1, PAL.wood2); Art.rect(g, 4, 15, 18, 1, PAL.wood2);
    Art.outline(g.canvas, PAL.ink, 0.7);
  });
  P.crate = () => cached('crate', 20, 18, (g) => {
    Art.rect(g, 1, 2, 18, 15, PAL.wood2);
    Art.rect(g, 1, 2, 18, 2, PAL.wood3); Art.rect(g, 1, 15, 18, 2, PAL.wood1);
    Art.line(g, 2, 16, 18, 3, PAL.wood3, 1); Art.line(g, 18, 16, 2, 3, PAL.wood3, 1);
    Art.outline(g.canvas, PAL.ink, 0.7);
  });
  P.bush = (v = 0) => cached('bush' + v, 30, 22, (g) => {
    const r = Art.rng(v * 91 + 5);
    for (let i = 0; i < 4; i++) {
      const x = 6 + i * 6 + r() * 3, y = 14 - r() * 5;
      Art.ell(g, x, y, 6 + r() * 2, 5 + r() * 2, PAL.leaf1);
    }
    Art.ellBand(g, 15, 13, 13, 8, PAL.leaf2, 0, 0.4);
    Art.speckle(g, 15, 12, 11, 6, PAL.leaf3, 14, v + 3);
    if (v === 1) { Art.rect(g, 9, 8, 2, 2, PAL.red); Art.rect(g, 20, 11, 2, 2, PAL.red); }
    Art.outline(g.canvas, PAL.ink, 0.6);
  });
  P.flowers = (v = 0) => cached('flowers' + v, 20, 14, (g) => {
    const cols = [[PAL.redL, PAL.red], ['#e8a0d0', '#c46ba8'], [PAL.goldL, PAL.gold], ['#a8b8f0', '#6f84d8']][v % 4];
    for (let i = 0; i < 4; i++) {
      const x = 3 + i * 4.5, y = 8 - (i % 2) * 2;
      Art.rect(g, x, y, 1, 6 - (i % 2), PAL.leaf1);
      Art.rect(g, x - 1, y + 2, 1, 1, PAL.leaf2); Art.rect(g, x + 1, y + 3, 1, 1, PAL.leaf2);
      Art.rect(g, x - 1, y - 2, 3, 2, cols[0]); Art.rect(g, x, y - 3, 1, 4, cols[1]);
      Art.rect(g, x, y - 2, 1, 1, PAL.cream);
    }
  });
  P.rock = (v = 0) => cached('rock' + v, 20, 14, (g) => {
    Art.ell(g, 10, 10, 8 - v, 5, PAL.stone1);
    Art.ellBand(g, 10, 10, 8 - v, 5, PAL.stone2, 0, 0.4);
    Art.ellBand(g, 10, 10, 8 - v, 5, PAL.stone0, 0.7, 1);
    Art.speckle(g, 10, 9, 5, 3, PAL.stone0, 5, v + 2);
    Art.outline(g.canvas, PAL.ink, 0.6);
  });
  P.lantern = () => cached('lantern', 14, 34, (g) => {
    Art.rect(g, 6, 6, 2, 28, PAL.wood2);
    Art.rect(g, 2, 4, 10, 2, PAL.ink2);
    Art.rect(g, 3, 6, 8, 9, PAL.ink2);
    Art.rect(g, 4, 7, 6, 7, PAL.goldL);
    Art.rect(g, 5, 8, 4, 5, PAL.cream);
    Art.rect(g, 2, 15, 10, 2, PAL.ink2);
    Art.rect(g, 4, 32, 6, 2, PAL.wood1);
    Art.outline(g.canvas, PAL.ink, 0.6);
  });
  P.sign = () => cached('sign', 34, 30, (g) => {
    Art.rect(g, 15, 10, 4, 20, PAL.wood2);
    Art.rect(g, 1, 4, 32, 12, PAL.wood3);
    Art.rect(g, 1, 4, 32, 2, PAL.wood4);
    Art.rect(g, 1, 14, 32, 2, PAL.wood1);
    Art.rect(g, 4, 8, 26, 1, PAL.wood1); Art.rect(g, 4, 11, 18, 1, PAL.wood1);
    Art.outline(g.canvas, PAL.ink, 0.6);
  });
  P.ball = () => cached('ball', 18, 18, (g) => {
    Art.ell(g, 9, 9, 8, 8, PAL.red);
    Art.ellBand(g, 9, 9, 8, 8, PAL.redL, 0, 0.3);
    Art.rect(g, 1, 8, 16, 3, PAL.cream);
    Art.ell(g, 6, 6, 2, 2, '#ffffff');
    Art.outline(g.canvas, PAL.ink, 0.8);
  });
  P.tunnel = () => cached('tunnel', 48, 24, (g) => {
    Art.ell(g, 24, 22, 24, 18, PAL.soil1);
    Art.ellBand(g, 24, 22, 24, 18, PAL.soil2, 0, 0.35);
    Art.ell(g, 14, 22, 7, 8, PAL.soil0); Art.ell(g, 34, 22, 7, 8, PAL.soil0);
    Art.ell(g, 14, 23, 5, 6, '#1a0f08'); Art.ell(g, 34, 23, 5, 6, '#1a0f08');
    Art.speckle(g, 24, 16, 20, 6, PAL.grass1, 16, 4);
    Art.outline(g.canvas, PAL.ink, 0.6);
  });
  P.mud = () => cached('mud', 56, 20, (g) => {
    Art.ell(g, 28, 14, 27, 9, PAL.soil0);
    Art.ell(g, 28, 14, 24, 7, '#4a3020');
    Art.ellBand(g, 28, 13, 24, 7, '#6a4a30', 0, 0.4);
    Art.speckle(g, 28, 13, 20, 4, '#8a6a48', 10, 6);
    Art.outline(g.canvas, PAL.ink, 0.5);
  });
  P.barrow = () => cached('barrow', 34, 24, (g) => {
    Art.rect(g, 4, 6, 22, 9, PAL.wood2);
    Art.rect(g, 4, 6, 22, 2, PAL.wood3);
    Art.rect(g, 4, 13, 22, 2, PAL.wood1);
    Art.rect(g, 6, 3, 18, 3, PAL.soil1);            // heaped soil
    Art.ell(g, 11, 4, 4, 2, PAL.soil2); Art.ell(g, 19, 4, 4, 2, PAL.soil2);
    Art.ell(g, 9, 19, 4.5, 4.5, PAL.ink2);
    Art.ell(g, 9, 19, 2, 2, PAL.stone1);
    Art.limb(g, 24, 12, 33, 9, 3, 2, PAL.wood2);    // handle
    Art.rect(g, 20, 15, 3, 7, PAL.wood1);           // leg
    Art.outline(g.canvas, PAL.ink, 0.6);
  });
  P.compost = () => cached('compost', 34, 26, (g) => {
    Art.rect(g, 1, 6, 32, 19, PAL.wood2);
    for (let y = 8; y < 24; y += 5) Art.rect(g, 1, y, 32, 1, PAL.wood1);
    Art.rect(g, 1, 6, 32, 2, PAL.wood3);
    Art.rect(g, 4, 3, 26, 4, PAL.soil1);
    Art.ell(g, 12, 4, 5, 3, PAL.leaf1); Art.ell(g, 22, 4, 5, 3, PAL.leaf2);
    Art.rect(g, 1, 6, 2, 19, PAL.wood1); Art.rect(g, 31, 6, 2, 19, PAL.wood1);
    Art.outline(g.canvas, PAL.ink, 0.6);
  });

  // ---- Big top scenery ----------------------------------------------------
  P.bleacher = () => cached('bleacher', 40, 12, (g) => {
    Art.rect(g, 0, 0, 40, 4, PAL.wood2);
    Art.rect(g, 0, 0, 40, 1, PAL.wood4);
    Art.rect(g, 0, 4, 40, 8, PAL.wood1);
    for (let x = 2; x < 40; x += 10) Art.rect(g, x, 4, 2, 8, PAL.wood0);
    Art.outline(g.canvas, PAL.ink, 0.4);
  });
  P.pedestal = (w) => cached('pedestal' + w, w, 22, (g, ww) => {
    Art.rect(g, 0, 0, ww, 5, PAL.gold);
    Art.rect(g, 0, 0, ww, 2, PAL.goldL);
    Art.rect(g, 2, 5, ww - 4, 13, PAL.red);
    for (let x = 4; x < ww - 4; x += 8) Art.rect(g, x, 5, 4, 13, PAL.cream);
    Art.rect(g, 0, 18, ww, 4, PAL.goldD);
    Art.outline(g.canvas, PAL.ink, 0.5);
  });
  P.bunting = () => cached('bunting', 24, 16, (g) => {
    Art.rect(g, 0, 0, 24, 1, PAL.wood1);
    for (let i = 0; i < 8; i++) { const col = i % 2 ? PAL.red : PAL.gold; Art.rect(g, 2 + i, 1 + i * 0, 1, 1, col); }
    for (let i = 0; i < 6; i++) Art.rect(g, 2, 1 + i, 1, 1, PAL.red);
    // two pennants
    for (let i = 0; i < 7; i++) { Art.rect(g, 1 + i, 1, 1, 8 - i, PAL.red); Art.rect(g, 13 + i, 1, 1, 8 - i, PAL.gold); }
  });
  P.spotRig = () => cached('spotrig', 18, 16, (g) => {
    Art.rect(g, 3, 0, 12, 3, PAL.ink2);            // mounting bracket
    Art.rect(g, 3, 3, 12, 9, '#40384a');           // housing
    Art.rect(g, 3, 3, 12, 1, '#5e5470');
    Art.rect(g, 3, 11, 12, 1, PAL.ink);
    Art.rect(g, 12, 5, 3, 5, PAL.spot);            // lens, facing the ring
    Art.rect(g, 13, 6, 2, 3, PAL.cream);
    Art.rect(g, 5, 6, 2, 3, PAL.goldD);            // knob
    Art.rect(g, 8, 12, 2, 4, PAL.ink2);
    Art.outline(g.canvas, PAL.ink, 0.6);
  });
  P.cannon = () => cached('cannon', 22, 18, (g) => {
    Art.ell(g, 8, 13, 7, 5, PAL.ink2);
    Art.limb(g, 5, 14, 20, 3, 7, 5, PAL.red);
    Art.rect(g, 17, 2, 4, 4, PAL.goldD);
    Art.rect(g, 2, 15, 12, 3, PAL.wood2);
    Art.outline(g.canvas, PAL.ink, 0.6);
  });

  return { buildTree, P, get: (n, v) => P[n](v), clear: () => cache.clear() };
})();
