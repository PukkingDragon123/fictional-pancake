// ---- Scenery: forest, ruins, altar, buildings ----------------------------
const Props = (() => {
  const cache = new Map();
  // Every prop gets the same treatment on the way out: one sun from the upper
  // left, a shadow along its underside. That is what gives a scene direction.
  function cached(key, w, h, draw) {
    let c = cache.get(key);
    if (c) return c;
    const o = Art.cv(w, h);
    draw(o.g, w, h);
    // No dither pass: the grain read as a filter smeared over the whole scene.
    Art.topLight(o.c, 'rgba(255,244,214,0.3)', 2);
    Art.underShade(o.c, 'rgba(18,12,24,0.3)', 2);
    Art.outline(o.c, '#0a0810', 1);                 // everything wears the same black line
    cache.set(key, o.c);
    return o.c;
  }
  const P = {};

  // ---- trees --------------------------------------------------------------
  // kind: 'dead' | 'oak' | 'pine' | 'birch' | 'gnarl'.  shade darkens the whole
  // tree so the same generator can fill four depth layers of forest.
  function bark(g, x0, y0, x1, y1, w0, w1, c0, c1, c2) {
    Art.limb(g, x0, y0, x1, y1, w0, w1, c1);
    Art.limb(g, x0 - w0 * 0.22, y0, x1 - w1 * 0.2, y1, w0 * 0.34, w1 * 0.3, c2);
    Art.limb(g, x0 + w0 * 0.28, y0, x1 + w1 * 0.24, y1, w0 * 0.22, w1 * 0.2, c0);
  }
  // A cozy canopy: a handful of fat round puffs, a dark underside, sun on the
  // upper left, and a scatter of loose leaves along the silhouette.
  function canopy(g, x, y, rx, ry, cols, rnd, dense) {
    const n = dense ? 7 : 5;
    const puffs = [];
    for (let i = 0; i < n; i++) {
      const a = Math.PI + (i / (n - 1)) * Math.PI;          // across the top
      const d = 0.5 + rnd() * 0.4;
      puffs.push({
        x: x + Math.cos(a) * rx * d,
        y: y + Math.sin(a) * ry * d * 0.8 + ry * 0.12,
        rx: rx * (0.42 + rnd() * 0.2), ry: ry * (0.46 + rnd() * 0.2),
      });
    }
    puffs.push({ x: x, y: y + ry * 0.1, rx: rx * 0.72, ry: ry * 0.72 });
    for (const p of puffs) Art.ell(g, p.x, p.y + ry * 0.16, p.rx * 1.04, p.ry, cols[0]);   // shadow mass
    for (const p of puffs) Art.ell(g, p.x, p.y, p.rx, p.ry, cols[1]);                      // body
    for (const p of puffs) Art.ell(g, p.x - p.rx * 0.2, p.y - p.ry * 0.22, p.rx * 0.72, p.ry * 0.66, cols[2]);
    for (const p of puffs) {                                                               // sun on the crown
      Art.ell(g, p.x - p.rx * 0.32, p.y - p.ry * 0.42, p.rx * 0.4, p.ry * 0.34, cols[3]);
      Art.speckle(g, p.x - p.rx * 0.2, p.y - p.ry * 0.3, p.rx * 0.6, p.ry * 0.5, cols[3], Math.round(p.rx * 1.2), Math.floor(p.x * 7 + p.y));
      Art.speckle(g, p.x, p.y + p.ry * 0.5, p.rx * 0.8, p.ry * 0.3, cols[0], Math.round(p.rx * 0.8), Math.floor(p.y * 11 + p.x));
    }
    // a few leaves shaken loose at the edge, which is what stops it reading as a blob
    for (let i = 0; i < (dense ? 10 : 6); i++) {
      const a = Math.PI + rnd() * Math.PI;
      const lx = x + Math.cos(a) * rx * (1.02 + rnd() * 0.14);
      const ly = y + Math.sin(a) * ry * (0.9 + rnd() * 0.2);
      Art.ell(g, lx, ly, 2.4, 1.8, rnd() < 0.5 ? cols[2] : cols[1]);
    }
  }
  // Cozy foliage palettes: cool shade, leafy body, sunlit crown.
  const LEAF = {
    oak:   ['#28502c', '#3d7a3a', '#5aa14a', '#93cd63'],
    gnarl: ['#264a34', '#3a6b45', '#528a54', '#82b46b'],
    birch: ['#356030', '#528a3c', '#74ad4e', '#a8d46c'],
    pine:  ['#1d3c2a', '#2e5a39', '#417a46', '#639e57'],
    scrub: ['#2e4a26', '#456b33', '#5f8f43', '#8bb45c'],
  };

  P.tree = (spec) => {
    const [kind, v, shade] = String(spec).split('|');
    const sh = +shade || 0;
    return cached(`tree:${kind}:${v}:${sh}`, 96, 150, (g) => {
      const rnd = Art.rng((+v + 1) * 977 + kind.length * 31);
      const S = (c) => (sh ? U.mix(c, '#101520', sh) : c);
      const P4 = (k) => LEAF[k].map(S);
      const cx = 48, base = 148;
      const B0 = S(PAL.bark0), B1 = S(PAL.bark1), B2 = S(PAL.bark2), B3 = S(PAL.bark3);
      const lean = (rnd() - 0.5) * 10;
      // a little swell of roots, so nothing looks stuck in the ground
      const roots = (w) => {
        for (let i = -2; i <= 2; i++) if (i) Art.limb(g, cx + i * 3, base - 8, cx + i * (w + rnd() * 4), base + 2, 5, 1.6, B1);
        Art.ell(g, cx, base, w + 6, 4, B0);
      };
      if (kind === 'pine') {
        bark(g, cx, base, cx + lean * 0.4, 40, 10, 5, B3, B1, B0);
        roots(10);
        const c = P4('pine');
        for (let i = 0; i < 6; i++) {                       // rounded, scalloped tiers
          const y = 126 - i * 17, w = 38 - i * 5.2;
          Art.ell(g, cx, y + 3, w, 9, c[0]);
          const lobes = Math.max(3, 6 - i);
          for (let k = 0; k < lobes; k++) {
            const lx = cx - w + (k / (lobes - 1)) * w * 2;
            Art.ell(g, lx, y - 1, w / lobes + 3, 7.5, c[1]);
            Art.ell(g, lx - 1, y - 4, w / lobes + 1, 5.5, c[2]);
          }
          Art.ell(g, cx - w * 0.3, y - 6, w * 0.5, 4.5, c[3]);
          Art.speckle(g, cx, y - 3, w * 0.85, 5, c[3], Math.round(w * 0.5), i + +v);
        }
        Art.ell(g, cx, 22, 9, 10, c[1]);
        Art.ell(g, cx - 2, 20, 6, 7, c[2]);
        Art.ell(g, cx - 3, 17, 3.4, 3.4, c[3]);
      } else if (kind === 'dead') {
        bark(g, cx, base, cx + lean, 48, 13, 6, B3, B1, B0);
        roots(12);
        for (let i = 0; i < 7; i++) {
          const side = i % 2 ? 1 : -1, y0 = 112 - i * 11;
          const x1 = cx + side * (16 + i * 4), y1 = y0 - 18 - i * 3;
          Art.limb(g, cx + side * 3, y0, x1, y1, 4.2 - i * 0.4, 1.3, B1);
          Art.limb(g, x1, y1, x1 + side * (8 + rnd() * 7), y1 - 9 - rnd() * 6, 1.6, 0.8, B0);
          if (rnd() < 0.5) Art.limb(g, x1, y1, x1 + side * 5, y1 - 14, 1.3, 0.7, B0);
        }
        Art.limb(g, cx + lean, 48, cx + lean - 12, 24, 4.4, 1.4, B1);
        Art.limb(g, cx + lean, 48, cx + lean + 13, 22, 4.4, 1.4, B1);
        Art.limb(g, cx + lean - 12, 24, cx + lean - 19, 12, 1.6, 0.8, B0);
        Art.limb(g, cx + lean + 13, 22, cx + lean + 20, 11, 1.6, 0.8, B0);
        if (+v % 2) {                                        // one tuft clinging on
          const c = P4('scrub');
          Art.ell(g, cx + 14, 66, 9, 6, c[1]); Art.ell(g, cx + 12, 63, 6, 4, c[2]);
        }
        for (let i = 0; i < 4; i++) Art.ell(g, cx - 14 + rnd() * 28, base - 2 - rnd() * 4, 3, 1.6, S('#6a5a44'));
      } else if (kind === 'birch') {
        bark(g, cx, base, cx + lean * 0.5, 56, 9, 5, S('#f0ece0'), S('#dcd6c6'), S('#b4a894'));
        roots(8);
        for (let i = 0; i < 9; i++) Art.rect(g, cx - 5 + rnd() * 9, 64 + i * 9, 4 + rnd() * 3, 1.6, S('#3a352c'));
        for (let i = 0; i < 4; i++) {
          const side = i % 2 ? 1 : -1, y0 = 98 - i * 14;
          Art.limb(g, cx, y0, cx + side * (14 + i * 3), y0 - 16, 3, 1.2, S('#dcd6c6'));
        }
        canopy(g, cx + lean * 0.5, 42, 33, 25, P4('birch'), rnd, 1);
      } else if (kind === 'gnarl') {
        bark(g, cx, base, cx + lean * 1.6, 70, 16, 8, B3, B1, B0);
        roots(15);
        for (let i = 0; i < 3; i++) {                       // knots
          Art.ell(g, cx - 6 + rnd() * 12, 90 + i * 18, 4, 3, B0);
          Art.ell(g, cx - 6 + rnd() * 12, 90 + i * 18, 2, 1.4, B2);
        }
        for (let i = 0; i < 4; i++) {
          const side = i % 2 ? 1 : -1, y0 = 108 - i * 14;
          const x1 = cx + side * (20 + i * 5), y1 = y0 - 14;
          Art.limb(g, cx + side * 5, y0, x1, y1, 6 - i * 0.6, 2, B1);
          canopy(g, x1 + side * 6, y1 - 8, 19, 14, P4('gnarl'), rnd, 0);
        }
        canopy(g, cx + lean, 50, 37, 27, P4('gnarl'), rnd, 1);
      } else {
        bark(g, cx, base, cx + lean, 62, 13, 7, B3, B1, B0);
        roots(13);
        for (let i = 0; i < 4; i++) {
          const side = i % 2 ? 1 : -1, y0 = 104 - i * 15;
          Art.limb(g, cx + side * 4, y0, cx + side * (18 + i * 4), y0 - 18, 4.6 - i * 0.5, 1.6, B1);
        }
        const c = P4('oak');
        canopy(g, cx + lean, 46, 39, 28, c, rnd, 1);
        if (+v % 3 === 0 && sh < 0.5) {                      // a few apples
          for (let i = 0; i < 4; i++) {
            const ax = cx + lean + (rnd() - 0.5) * 56, ay = 40 + rnd() * 28;
            Art.ell(g, ax, ay, 2.6, 2.6, '#c9503f');
            Art.rect(g, ax, ay - 3.4, 1, 2, '#5a3a22');
          }
        }
        if (+v % 3 === 1 && sh < 0.5) {                      // a nest on a bough
          Art.ell(g, cx + 22, 74, 7, 3.6, '#7a5c38');
          Art.ell(g, cx + 22, 73, 5.4, 2.4, '#5f4527');
          Art.ell(g, cx + 20, 72, 1.8, 1.4, '#e8e2d0');
          Art.ell(g, cx + 23.4, 72.4, 1.8, 1.4, '#e8e2d0');
        }
      }
      // toadstools and a tuft at the foot of every living tree
      if (kind !== 'dead' && sh < 0.62) {
        const c = P4('scrub');
        Art.ell(g, cx - 16, base - 3, 7, 3.4, c[1]);
        Art.ell(g, cx + 15, base - 2, 6, 3, c[0]);
        if (+v % 2) { Art.rect(g, cx + 20, base - 6, 1.6, 4, '#e8dcc4'); Art.ell(g, cx + 20.8, base - 6, 3, 2, '#b8412c'); }
      }
    });
  };

  // ---- weeds: the thing choking the plot, so they want to read big ---------
  P.weed = (v = 0) => cached('weed' + v, 34, 40, (g) => {
    const rnd = Art.rng((+v + 1) * 733);
    const D = '#3b4a1e', M = '#5d7128', L = '#86974a', Y = '#a8a054', ROT = '#6d5a2c';
    const cx = 17, base = 38;
    if (+v === 0) {                       // thistle: tall, spiny, purple heads
      for (let i = -1; i <= 1; i++) {
        Art.limb(g, cx + i * 2, base, cx + i * 7, 12 + Math.abs(i) * 6, 3.4, 1.6, i ? M : D);
      }
      for (let i = 0; i < 7; i++) {
        const side = i % 2 ? 1 : -1, y = base - 6 - i * 4;
        Art.poly(g, [[cx, y], [cx + side * 12, y - 3], [cx + side * 7, y + 3]], i % 3 ? M : L);
        Art.line(g, cx + side * 4, y, cx + side * 12, y - 3, D, 1);
      }
      for (const [hx, hy] of [[cx - 6, 12], [cx + 7, 17], [cx, 7]]) {
        Art.ell(g, hx, hy + 3, 4, 3, M);
        Art.ell(g, hx, hy, 3.4, 3.4, '#7a5ea8');
        Art.ell(g, hx - 1, hy - 1, 2, 1.6, '#a487d0');
        for (let k = 0; k < 5; k++) Art.rect(g, hx - 3 + k * 1.6, hy - 4, 1, 2.4, '#a487d0');
      }
    } else if (+v === 1) {                // bramble: low, wide, thorny, berries
      for (let i = 0; i < 5; i++) {
        const a = -0.3 - i * 0.55, r = 13 + rnd() * 4;
        const ex = cx + Math.cos(a) * r, ey = base - 6 + Math.sin(a) * r * 0.7;
        Art.limb(g, cx, base - 4, ex, ey, 3, 1.2, ROT);
        for (let k = 1; k < 4; k++) {
          const t = k / 4, lx = U.lerp(cx, ex, t), ly = U.lerp(base - 4, ey, t);
          Art.ell(g, lx, ly - 2, 4, 3, k % 2 ? M : D);
          Art.rect(g, lx, ly + 1, 1, 2, ROT);
        }
        if (i % 2) { Art.ell(g, ex, ey - 2, 2.2, 2.2, '#3a2038'); Art.ell(g, ex - 0.6, ey - 2.6, 1, 0.8, '#6a4a68'); }
      }
      Art.ell(g, cx, base - 2, 13, 4, D);
    } else if (+v === 2) {                // dry tussock: a fan of dead blades
      for (let i = 0; i < 13; i++) {
        const t = i / 12, a = -2.6 + t * 1.7;
        const h = 20 + rnd() * 12;
        const ex = cx + Math.cos(a) * h * 0.7, ey = base - 2 + Math.sin(a) * h;
        Art.limb(g, cx + (t - 0.5) * 6, base, ex, ey, 2.2, 0.8, i % 3 === 0 ? Y : i % 3 === 1 ? L : M);
      }
      Art.ell(g, cx, base - 1, 9, 3.4, ROT);
      for (let i = 0; i < 3; i++) Art.ell(g, cx - 6 + i * 6, 14 + i * 3, 1.6, 3, Y);
    } else {                              // nettle: broad serrated leaves
      Art.limb(g, cx, base, cx + 1, 10, 3, 1.6, M);
      for (let i = 0; i < 5; i++) {
        const side = i % 2 ? 1 : -1, y = base - 7 - i * 6;
        const w = 11 - i * 1.2;
        Art.poly(g, [[cx, y], [cx + side * w, y - 5], [cx + side * w * 0.8, y + 4]], i % 2 ? M : L);
        Art.line(g, cx, y, cx + side * w, y - 5, D, 1);
        for (let k = 0; k < 3; k++) Art.rect(g, cx + side * (3 + k * 3), y - 5 + k, 1, 1, D);
      }
      Art.ell(g, cx + 1, 9, 4, 3, L);
      Art.ell(g, cx + 1, 7, 2.4, 2, Y);
    }
  });

  P.fallen = (v = 0) => cached('fallen' + v, 120, 46, (g) => {
    const rnd = Art.rng(+v * 613 + 7);
    const y = 30;
    Art.limb(g, 6, y + 6, 112, y - 2, 15, 11, PAL.bark1);
    Art.limb(g, 6, y + 2, 112, y - 6, 6, 4, PAL.bark2);
    Art.limb(g, 8, y + 11, 110, y + 3, 4, 3, PAL.bark0);
    for (let i = 0; i < 16; i++) Art.rect(g, 12 + rnd() * 92, y - 4 + rnd() * 12, 3 + rnd() * 5, 1.4, PAL.bark0);
    // root plate at the torn end
    Art.ell(g, 10, y + 3, 11, 15, PAL.bark2);
    Art.ell(g, 10, y + 3, 7, 11, PAL.bark1);
    for (let i = 0; i < 7; i++) { const a = -1.9 + i * 0.55; Art.limb(g, 10, y + 3, 10 + Math.cos(a) * 20, y + 3 + Math.sin(a) * 20, 3, 1, PAL.bark0); }
    // moss and shelf fungus
    for (let i = 0; i < 9; i++) Art.ell(g, 22 + i * 10 + rnd() * 5, y - 6 + rnd() * 3, 6 + rnd() * 4, 2.4, i % 2 ? PAL.moss2 : PAL.moss3);
    // shelf fungus: small brackets stepping off the flank, not pale eggs
    for (let i = 0; i < 4; i++) {
      const fx = 30 + i * 22 + rnd() * 6, fy = y + 1 + rnd() * 4;
      Art.ell(g, fx, fy, 5, 2.2, '#a8794a');
      Art.ell(g, fx - 0.6, fy - 0.8, 4, 1.6, '#c79a63');
      Art.rect(g, fx - 3.4, fy + 1.2, 7, 1.2, '#6f4c2c');
      if (i % 2) { Art.ell(g, fx + 5, fy + 3, 3.4, 1.6, '#a8794a'); Art.rect(g, fx + 3, fy + 4, 4.4, 1, '#6f4c2c'); }
    }
    for (let i = 0; i < 5; i++) {            // toadstools along the top
      const mx = 24 + rnd() * 84, my = y - 7 - rnd() * 2;
      Art.rect(g, mx, my, 1.6, 4, '#e8dcc4');
      Art.ell(g, mx + 0.8, my, 3, 2, '#b8412c');
      Art.rect(g, mx - 0.6, my - 0.6, 1.4, 1, '#efdcb4');
    }
    Art.ell(g, 96, y - 4, 8, 4, PAL.moss1);
  });
  P.stump = (v = 0) => cached('stump' + v, 34, 22, (g) => {
    Art.ell(g, 17, 19, 13, 5, PAL.bark0);
    Art.rect(g, 5, 8, 24, 11, PAL.bark1);
    Art.rect(g, 5, 8, 5, 11, PAL.bark2);
    Art.ell(g, 17, 8, 12, 4.6, PAL.bark3);
    Art.ell(g, 17, 8, 8, 3, '#8a6a48');
    Art.ell(g, 17, 8, 4, 1.6, PAL.bark2);
    if (+v % 2) { Art.ell(g, 9, 6, 5, 2.4, PAL.moss2); Art.ell(g, 24, 7, 4, 2, PAL.moss3); }
  });

  // ---- ground cover -------------------------------------------------------
  P.flower = (v = 0) => cached('flower' + v, 16, 18, (g) => {
    const kinds = [
      { stem: PAL.moss2, petal: '#e8708a', mid: '#ffd2dc', core: '#ffeeb0', n: 5 },
      { stem: PAL.moss1, petal: '#f0c24a', mid: '#ffe9a8', core: '#b8412c', n: 6 },
      { stem: PAL.moss2, petal: '#9a7fe0', mid: '#c9b4f5', core: '#ffeeb0', n: 5 },
      { stem: PAL.moss3, petal: '#f2f0e4', mid: '#ffffff', core: '#f0c24a', n: 6 },
      { stem: PAL.moss1, petal: '#5fb8d8', mid: '#a8e2f0', core: '#ffeeb0', n: 5 },
    ];
    const k = kinds[+v % kinds.length];
    Art.rect(g, 7, 8, 2, 10, k.stem);
    Art.rect(g, 4, 12, 3, 1.4, k.stem); Art.rect(g, 9, 14, 3, 1.4, k.stem);
    for (let i = 0; i < k.n; i++) {
      const a = (i / k.n) * TAU;
      Art.ell(g, 8 + Math.cos(a) * 3.4, 6 + Math.sin(a) * 3.2, 2.4, 2.2, k.petal);
      Art.ell(g, 8 + Math.cos(a) * 3.2, 6 + Math.sin(a) * 3, 1.3, 1.2, k.mid);
    }
    Art.ell(g, 8, 6, 1.9, 1.8, k.core);
  });
  P.mushroom = (v = 0) => cached('mush' + v, 18, 14, (g) => {
    const caps = [['#b8412c', '#e0705a'], ['#7d5f42', '#9b7a52'], ['#563391', '#8354c9']];
    const c = caps[+v % caps.length];
    for (let i = 0; i < 3; i++) {
      const x = 4 + i * 5, h = 5 + (i % 2) * 3;
      Art.rect(g, x - 1, 13 - h, 3, h, '#efdcb4');
      Art.ell(g, x, 13 - h, 4.2, 2.6, c[0]);
      Art.ell(g, x - 0.8, 13 - h - 0.6, 2.6, 1.6, c[1]);
      Art.rect(g, x + 1, 13 - h - 1, 1, 1, PAL.cream);
    }
  });
  P.rock = (v = 0) => cached('rock' + v, 26, 18, (g) => {
    const rnd = Art.rng(+v * 331 + 3);
    Art.ell(g, 13, 14, 11 - +v, 6, PAL.stone2);
    Art.ell(g, 11, 12, 8 - +v, 4.4, PAL.stone3);
    Art.ell(g, 9, 10.5, 4, 2.2, PAL.stone4);
    for (let i = 0; i < 5; i++) Art.rect(g, 5 + rnd() * 14, 11 + rnd() * 5, 2, 1, PAL.stone1);
    Art.ell(g, 17, 10, 4, 2, PAL.moss2);
  });

  // ---- ruins you can clear ------------------------------------------------
  P.ruin = (v = 0) => cached('ruin' + v, 60, 52, (g) => {
    const rnd = Art.rng(+v * 811 + 5);
    if (+v % 3 === 0) {            // broken arch
      for (const sd of [-1, 1]) {
        const x = 30 + sd * 18;
        Art.rect(g, x - 6, 18, 12, 32, PAL.stone2);
        Art.rect(g, x - 6, 18, 4, 32, PAL.stone3);
        for (let i = 0; i < 4; i++) Art.rect(g, x - 6, 22 + i * 8, 12, 1.6, PAL.stone1);
      }
      Art.rect(g, 8, 12, 44, 8, PAL.stone2);
      Art.rect(g, 8, 12, 44, 2.4, PAL.stone3);
      Art.rect(g, 24, 10, 14, 4, PAL.stone1);
      Art.ell(g, 16, 14, 5, 2.4, PAL.moss2);
    } else if (+v % 3 === 1) {     // toppled pillar
      Art.ell(g, 30, 46, 24, 6, PAL.stone1);
      for (let i = 0; i < 4; i++) { Art.rect(g, 6 + i * 13, 34 - (i % 2) * 2, 12, 12, PAL.stone2); Art.rect(g, 6 + i * 13, 34 - (i % 2) * 2, 12, 2.4, PAL.stone3); }
      Art.rect(g, 4, 30, 14, 16, PAL.stone2);
      Art.ell(g, 40, 33, 6, 3, PAL.moss2);
    } else {                       // collapsed wall
      for (let r = 0; r < 4; r++) for (let c = 0; c < 5 - r; c++) {
        const x = 6 + c * 11 + r * 4, y = 44 - r * 10;
        Art.rect(g, x, y - 10, 10, 10, r % 2 ? PAL.stone2 : PAL.stone3);
        Art.rect(g, x, y - 10, 10, 1.8, PAL.stone4);
        if (rnd() < 0.3) Art.ell(g, x + 5, y - 10, 4, 2, PAL.moss2);
      }
    }
  });

  // ---- the altar: stone, carved with wombats bearing a burden --------------
  P.altar = (lvl) => cached('altar' + lvl, 108, 86, (g) => {
    const cx = 54, floor = 80;
    Art.ell(g, cx, floor + 3, 44, 8, PAL.stone0);
    // plinth courses
    for (let i = 0; i < 2; i++) {
      const w = 42 - i * 5, y = floor - i * 8;
      Art.rect(g, cx - w, y - 8, w * 2, 9, i % 2 ? PAL.stone2 : PAL.stone3);
      Art.rect(g, cx - w, y - 8, w * 2, 2, PAL.stone4);
      Art.rect(g, cx - w, y - 1, w * 2, 2, PAL.stone0);
    }
    // the carved face
    const fy = floor - 16, fw = 33;
    Art.rect(g, cx - fw, fy - 26, fw * 2, 27, PAL.stone2);
    Art.rect(g, cx - fw, fy - 26, fw * 2, 2.4, PAL.stone4);
    Art.rect(g, cx - fw, fy - 1.6, fw * 2, 2.4, PAL.stone0);
    Art.rect(g, cx - fw + 2, fy - 24, fw * 2 - 4, 23, PAL.stone1);
    // relief: three wombats in profile carrying a long stone between them
    const ry = fy - 7;
    Art.rect(g, cx - 25, ry - 9, 50, 3.4, PAL.stone3);     // the burden
    Art.rect(g, cx - 25, ry - 9, 50, 1.2, PAL.stone4);
    for (let i = 0; i < 3; i++) {
      const bx = cx - 19 + i * 19;
      Art.rect(g, bx - 7, ry - 6, 14, 6, PAL.stone3);      // body
      Art.rect(g, bx - 7, ry - 6, 14, 1.4, PAL.stone4);
      Art.rect(g, bx + 4, ry - 8, 6, 6, PAL.stone3);       // head
      Art.rect(g, bx + 4, ry - 9.6, 2.4, 2, PAL.stone3);   // ear
      Art.rect(g, bx + 8.4, ry - 5.2, 2, 1.6, PAL.stone0); // eye
      Art.rect(g, bx - 6, ry, 2.6, 4, PAL.stone3);         // legs
      Art.rect(g, bx - 1, ry, 2.6, 4, PAL.stone3);
      Art.rect(g, bx + 4, ry, 2.6, 4, PAL.stone3);
      Art.rect(g, bx - 2, ry - 8, 3, 2.4, PAL.stone4);     // raised paw to the stone
    }
    // border glyphs
    for (let i = -4; i <= 4; i++) { Art.rect(g, cx + i * 7 - 1.4, fy - 23, 3, 3, PAL.stone0); Art.rect(g, cx + i * 7 - 1.4, fy - 5, 3, 3, PAL.stone0); }
    // the table and its bowl
    Art.rect(g, cx - 38, fy - 32, 76, 7, PAL.stone3);
    Art.rect(g, cx - 38, fy - 32, 76, 2, PAL.stone4);
    Art.ell(g, cx, fy - 33, 13, 5, PAL.stone1);
    Art.ell(g, cx, fy - 34, 10, 3.6, PAL.stone0);
    for (let i = 0; i < 2 + lvl; i++) Art.ell(g, cx, fy - 36 - i * 2, 6 - i, 3 - i * 0.5, [PAL.div1, PAL.div3, PAL.div5][i % 3]);
    // side braziers
    for (const sd of [-1, 1]) {
      const px = cx + sd * 44;
      Art.rect(g, px - 4, fy - 30, 8, 34, PAL.stone2);
      Art.rect(g, px - 4, fy - 30, 2.6, 34, PAL.stone3);
      Art.ell(g, px, fy - 32, 7, 3.4, PAL.stone3);
      Art.ell(g, px, fy - 34, 4.4, 2.8, PAL.gold1);
      Art.ell(g, px, fy - 36, 2.6, 2.4, PAL.gold3);
    }
  });

  // ---- the Tree of Life seed ----------------------------------------------
  P.seed = (stage) => cached('seed' + stage, 40, 44, (g) => {
    const cx = 20, base = 40;
    Art.ell(g, cx, base, 14, 5, PAL.soil1);
    Art.ell(g, cx, base - 1, 11, 3.6, PAL.soil2);
    if (+stage <= 0) {
      Art.ell(g, cx, base - 8, 7, 9, '#6b4030');
      Art.ell(g, cx - 2, base - 10, 4.4, 5.4, '#8a553e');
      Art.ell(g, cx - 3, base - 12, 2, 2.4, '#bd8763');
      for (let i = 0; i < 5; i++) { const a = (i / 5) * TAU; Art.rect(g, cx + Math.cos(a) * 9, base - 8 + Math.sin(a) * 10, 2, 2, PAL.div4); }
      Art.rect(g, cx - 1, base - 20, 2, 4, PAL.moss3);
      Art.ell(g, cx + 2, base - 21, 3, 2, PAL.moss4);
    } else {
      const h = 8 + (+stage) * 5;
      Art.limb(g, cx, base - 2, cx, base - h, 3 + (+stage) * 0.6, 2, PAL.bark2);
      for (let i = 0; i < 2 + (+stage); i++) {
        const sd = i % 2 ? 1 : -1, y = base - 6 - i * 5;
        Art.limb(g, cx, y, cx + sd * (6 + i * 2), y - 5, 1.8, 1, PAL.bark1);
        Art.ell(g, cx + sd * (7 + i * 2), y - 6, 4 + i, 2.6 + i * 0.4, PAL.moss3);
        Art.ell(g, cx + sd * (7 + i * 2), y - 6.6, 2.4, 1.4, PAL.moss4);
      }
      Art.ell(g, cx, base - h - 2, 5 + (+stage), 4 + (+stage) * 0.6, PAL.moss2);
      Art.ell(g, cx - 1, base - h - 3, 3, 2.2, PAL.moss4);
    }
  });

  // ---- buildings ----------------------------------------------------------
  // ---- the Fortuner --------------------------------------------------------
  // A big square-shouldered body-on-frame SUV, side on, facing left: long
  // bonnet, three side windows stepping back to a chunky rear pillar, roof
  // rails, flared arches, side steps and alloys. The bed behind the rear seats
  // is what the cubes ride in, so the tailgate reads open.
  function fortuner(g, W, H, o) {
    const open = !!(o && o.open);
    const BODY = '#4a6f8a', LIT = '#79a2ba', DK = '#33495c', DKR = '#24384a';
    const GLASS = '#8fc2d8', GLASS2 = '#c2e6f2', GLASS0 = '#5d90ac';
    const TRIM = '#2a3a46', CHR = '#b9c6cf', CHR2 = '#eef4f7';
    const TYRE = '#141118', RIM = '#8d95a2', RIM2 = '#cfd6de';
    const y0 = H - 26;                                  // the body's floor line
    // --- lower body and sills ---
    Art.rect(g, 8, y0 - 2, W - 16, 10, DKR);
    Art.rect(g, 14, y0 + 7, W - 30, 3, TRIM);           // side steps
    // --- the main body ---
    Art.poly(g, [[6, y0], [W - 8, y0], [W - 8, y0 - 16], [6, y0 - 16]], BODY);
    // bonnet: long, dropping toward the nose (nose is to the LEFT)
    Art.poly(g, [[6, y0 - 16], [40, y0 - 16], [40, y0 - 27], [10, y0 - 25]], BODY);
    Art.poly(g, [[6, y0 - 24], [40, y0 - 26], [40, y0 - 27], [10, y0 - 25]], LIT);
    // cabin: windscreen rakes back, roof runs flat, rear pillar is thick
    Art.poly(g, [[40, y0 - 27], [52, y0 - 41], [W - 20, y0 - 41], [W - 10, y0 - 27]], BODY);
    Art.rect(g, 50, y0 - 43, W - 70, 3, DK);            // roof rails
    Art.rect(g, 56, y0 - 45, 16, 2, TRIM);
    Art.rect(g, W - 46, y0 - 45, 16, 2, TRIM);
    // --- glass, three panes stepping back ---
    Art.poly(g, [[46, y0 - 28], [55, y0 - 39], [74, y0 - 39], [74, y0 - 28]], GLASS0);
    Art.poly(g, [[47, y0 - 28], [56, y0 - 38], [73, y0 - 38], [73, y0 - 29]], GLASS);
    Art.poly(g, [[49, y0 - 30], [56, y0 - 37], [64, y0 - 37], [58, y0 - 30]], GLASS2);
    Art.rect(g, 78, y0 - 39, 22, 11, GLASS0);
    Art.rect(g, 79, y0 - 38, 20, 9, GLASS);
    Art.rect(g, 80, y0 - 37, 8, 4, GLASS2);
    Art.rect(g, 104, y0 - 39, 14, 11, GLASS0);
    Art.rect(g, 105, y0 - 38, 12, 9, GLASS);
    Art.rect(g, 74, y0 - 40, 4, 13, TRIM);              // B pillar
    Art.rect(g, 100, y0 - 40, 4, 13, TRIM);             // C pillar
    Art.rect(g, W - 22, y0 - 41, 5, 14, TRIM);          // thick rear pillar
    // --- the tray behind the cabin: where the offerings ride ---
    if (open) {
      Art.rect(g, W - 20, y0 - 24, 16, 22, DKR);
      Art.rect(g, W - 20, y0 - 24, 16, 2, DK);
    }
    // --- doors, handles, a crease down the flank ---
    Art.rect(g, 44, y0 - 16, 1, 16, DK);
    Art.rect(g, 76, y0 - 16, 1, 16, DK);
    Art.rect(g, 102, y0 - 16, 1, 16, DK);
    Art.rect(g, 8, y0 - 9, W - 18, 2, LIT);             // the body crease catching light
    Art.rect(g, 8, y0 - 7, W - 18, 1, DK);
    Art.rect(g, 64, y0 - 21, 8, 2, CHR);                // handles
    Art.rect(g, 90, y0 - 21, 8, 2, CHR);
    Art.rect(g, 40, y0 - 26, 8, 4, TRIM);               // wing mirror
    Art.rect(g, 38, y0 - 25, 3, 3, CHR);
    // --- the nose: grille, lamp, bumper, bash plate ---
    Art.poly(g, [[2, y0 - 2], [10, y0 - 24], [10, y0], [2, y0]], BODY);
    Art.rect(g, 2, y0 - 20, 10, 7, TRIM);               // grille
    Art.rect(g, 2, y0 - 19, 10, 1, CHR);
    Art.rect(g, 2, y0 - 16, 10, 1, CHR);
    Art.poly(g, [[3, y0 - 12], [14, y0 - 13], [14, y0 - 8], [3, y0 - 8]], '#f2e2a8');   // headlamp
    Art.poly(g, [[4, y0 - 11], [12, y0 - 12], [12, y0 - 10], [4, y0 - 10]], '#fffdf0');
    Art.rect(g, 0, y0 - 6, 14, 6, DKR);                 // bumper
    Art.rect(g, 0, y0 - 1, 16, 3, CHR);                 // bash plate
    Art.rect(g, 1, y0 - 5, 4, 2, '#e07a3c');            // indicator
    // --- arches and wheels ---
    for (const wx of [32, W - 36]) {
      // the arch: a black plastic flare, then the hole it guards
      Art.ell(g, wx, y0 - 1, 16, 14, TRIM);
      Art.ell(g, wx, y0 - 1, 14, 12, '#0e0c12');
      Art.rect(g, wx - 16, y0 - 1, 32, 12, '#0e0c12');
      // the wheel, on top of everything so it always reads
      Art.ell(g, wx, y0 + 4, 12.5, 12.5, '#0b0910');
      Art.ell(g, wx, y0 + 4, 11.4, 11.4, TYRE);
      Art.ell(g, wx, y0 + 4, 9.6, 9.6, '#221e2a');      // sidewall
      Art.ell(g, wx, y0 + 4, 6.8, 6.8, RIM);
      for (let i = 0; i < 5; i++) {                     // five spokes
        const a2 = (i / 5) * TAU + 0.3;
        Art.limb(g, wx, y0 + 4, wx + Math.cos(a2) * 6, y0 + 4 + Math.sin(a2) * 6, 2.2, 1.3, RIM2);
      }
      Art.ell(g, wx, y0 + 4, 2.8, 2.8, '#5f6772');
      Art.ell(g, wx - 1.4, y0 + 2.4, 1.2, 1.2, CHR2);
    }
    // --- the roof rack load, and a snorkel up the A pillar ---
    Art.rect(g, 46, y0 - 44, 3, 18, TRIM);
    Art.rect(g, 46, y0 - 44, 1, 18, CHR);
    Art.outline(g.canvas, '#100d16', 1);
  }
  P.truck = () => cached('truck', 140, 78, (g) => fortuner(g, 140, 78, { open: true }));
  P.fortuner = (spec) => cached('fortuner:' + spec, 140, 78, (g) => fortuner(g, 140, 78, { open: spec === 'open' }));

  P.crate = () => cached('crate', 22, 20, (g) => {
    Art.rect(g, 1, 3, 20, 16, PAL.bark2);
    Art.rect(g, 1, 3, 20, 2.4, PAL.bark3);
    Art.rect(g, 1, 16.6, 20, 2.4, PAL.bark1);
    Art.line(g, 2, 18, 20, 4, PAL.bark3, 1); Art.line(g, 20, 18, 2, 4, PAL.bark3, 1);
  });

  // ---- crops --------------------------------------------------------------
  function drawCrop(g, def, x, y, p, time, wet, sway) {
    const s = sway || 0;
    const bend = (Math.sin(time * 1.5 + x * 0.07) * (0.6 + p) + s) * 1.6;
    const h = 4 + p * 17;
    if (wet) { g.fillStyle = 'rgba(87,182,201,0.2)'; Art.ell(g, x, y + 1, 9, 3); }
    g.fillStyle = 'rgba(18,14,20,0.22)'; Art.ell(g, x, y, 5 + p * 3, 2);
    g.fillStyle = PAL.moss1;
    for (let i = 0; i < h; i++) g.fillRect(Math.round(x + (bend * i * i) / (h * h)), Math.round(y - i), 2, 1);
    const tipX = x + bend, tipY = y - h;
    for (let i = 1; i <= 2 + Math.floor(p * 2); i++) {
      const ly = y - (h * i) / (3 + p), side = i % 2 ? 1 : -1;
      g.fillStyle = i % 2 ? PAL.moss3 : PAL.moss2;
      const lx = x + (bend * (y - ly) * (y - ly)) / (h * h);
      g.fillRect(Math.round(lx + side), Math.round(ly), side > 0 ? 4 : -4, 1.6);
    }
    if (p < 0.3) return;
    const t = (p - 0.3) / 0.7;
    switch (def.key) {
      case 'ashgrass':
        g.fillStyle = def.color;
        for (let i = 0; i < 5; i++) g.fillRect(Math.round(tipX - 3 + i * 1.4), Math.round(tipY - 3 - (i % 2) * 2), 1.4, 5);
        break;
      case 'sunroot':
        g.fillStyle = def.color; Art.ell(g, tipX, tipY, 3.4 + t * 2.4, 3.4 + t * 2.4);
        g.fillStyle = PAL.gold4; Art.ell(g, tipX - 1.4, tipY - 1.4, 1.8, 1.8);
        g.fillStyle = PAL.gold1; Art.ell(g, tipX + 1.6, tipY + 1.6, 1.4, 1.4);
        break;
      case 'resinbud':
        g.fillStyle = def.color; Art.ell(g, tipX, tipY, 2.6 + t * 1.8, 3.4 + t * 2.2);
        g.fillStyle = PAL.gold3; g.fillRect(Math.round(tipX), Math.round(tipY + 2), 1.4, 4);
        break;
      case 'duskhusk':
        g.fillStyle = def.color; Art.ell(g, tipX, tipY, 2.2 + t * 1.8, 3.8 + t * 2.2);
        g.fillStyle = PAL.boneD; Art.ell(g, tipX + 1.2, tipY, 1.2, 2.4);
        break;
      case 'ironbulb':
        g.fillStyle = def.color; Art.ell(g, tipX, tipY, 3.4 + t * 2.2, 2.8 + t * 1.8);
        g.fillStyle = PAL.stone4; g.fillRect(Math.round(tipX - 1.4), Math.round(tipY - 2.4), 2.6, 1.4);
        break;
      case 'broadleaf':
        g.fillStyle = def.color; Art.ell(g, tipX, tipY, 5.4 + t * 4.4, 2.6 + t * 1.6);
        g.fillStyle = PAL.moss4; g.fillRect(Math.round(tipX - 4 - t * 3), Math.round(tipY), Math.round(8 + t * 6), 1.4);
        break;
      case 'goldwheat':
        for (let i = 0; i < 4; i++) { g.fillStyle = i % 2 ? PAL.gold3 : PAL.gold2; Art.ell(g, tipX + i * 0.4, tipY + i * 2.4, 2 + t, 1.6); }
        break;
      case 'runeberry':
        for (let i = 0; i < 3; i++) {
          const a = i * 2.1;
          g.fillStyle = PAL.div3; Art.ell(g, tipX + Math.cos(a) * 3.4, tipY + Math.sin(a) * 2.6, 2 + t, 2 + t);
          g.fillStyle = PAL.div5; g.fillRect(Math.round(tipX + Math.cos(a) * 3.4), Math.round(tipY + Math.sin(a) * 2.6 - 1), 1.4, 1.4);
        }
        break;
    }
    if (p >= 1) {
      const tw = 0.5 + 0.5 * Math.sin(time * 5 + x);
      g.fillStyle = `rgba(255,238,176,${0.3 + tw * 0.45})`;
      g.fillRect(Math.round(tipX + 5), Math.round(tipY - 6), 2, 2);
      g.fillRect(Math.round(tipX - 7), Math.round(tipY - 2), 2, 2);
    }
  }

  // ---- Tree of Life: the skill tree, grown from the seed -------------------
  // The shrine is the altar, raised a course for every upgrade level.
  P.shrine = (lvl) => cached('shrine' + (lvl || 0), 108, 86 + (lvl || 0) * 4, (g) => {
    const base = P.altar(0);
    const rise = (lvl || 0) * 4;
    for (let i = 0; i < (lvl || 0); i++) {
      const w = 46 - i * 3, y = 82 + i * 4;
      Art.rect(g, 54 - w, y, w * 2, 5, i % 2 ? PAL.stone2 : PAL.stone3);
      Art.rect(g, 54 - w, y, w * 2, 1.6, PAL.stone4);
    }
    g.drawImage(base, 0, 0);
  });

  P.brazier = () => cached('brazier', 34, 52, (g) => {
    Art.rect(g, 13, 26, 8, 20, PAL.stone2);                 // the stem
    Art.rect(g, 13, 26, 3, 20, PAL.stone3);
    Art.rect(g, 8, 46, 18, 5, PAL.stone1);                  // the foot
    Art.rect(g, 6, 48, 22, 4, PAL.stone0);
    Art.ell(g, 17, 24, 13, 6, PAL.stone3);                  // the bowl
    Art.ell(g, 17, 22, 12, 5, PAL.stone2);
    Art.ell(g, 17, 21, 10, 4, '#2a1810');
    for (let i = 0; i < 5; i++) Art.rect(g, 9 + i * 4, 20, 3, 3, i % 2 ? '#b8412c' : '#e0705a');
    Art.ell(g, 17, 15, 6, 8, '#e0705a');                    // flame
    Art.ell(g, 17, 13, 4, 6, PAL.gold2);
    Art.ell(g, 17, 11, 2.4, 4, PAL.gold4);
    Art.rect(g, 4, 26, 4, 4, PAL.stone2);
    Art.rect(g, 26, 26, 4, 4, PAL.stone2);
  });

  // A stone pedestal, drawn to whatever width the stack platform needs.
  P.plinth = (w) => cached('plinth' + w, Math.max(24, Math.round(w)), 64, (g) => {
    const W = Math.max(24, Math.round(w));
    for (let y = 0; y < 64; y += 8) {
      const inset = Math.min(6, Math.floor(y / 16));
      Art.rect(g, inset, y, W - inset * 2, 8, (y / 8) % 2 ? PAL.stone2 : PAL.stone1);
      Art.rect(g, inset, y, W - inset * 2, 1.6, PAL.stone3);
      Art.rect(g, inset, y + 6.4, W - inset * 2, 1.6, PAL.stone0);
      for (let x = inset + 6; x < W - inset - 4; x += 22) Art.rect(g, x + ((y / 8) % 2) * 11, y + 1, 2, 6, PAL.stone0);
    }
    Art.rect(g, 0, 0, W, 3, PAL.stone4);
    for (let i = 0; i < 6; i++) Art.rect(g, 4 + i * ((W - 8) / 6), 12, 3, 3, PAL.div2);
  });

  function buildLifeTree(w, h, seed) {
    const key = `life:${w}:${h}:${seed}`;
    let hit = cache.get(key);
    if (hit) return hit;
    const { c, g } = Art.cv(w, h);
    const rnd = Art.rng(seed);
    const cx = w / 2, base = h - 10;
    const anchors = [];
    // roots
    for (let i = -3; i <= 3; i++) {
      if (!i) continue;
      Art.limb(g, cx + i * 5, base - 10, cx + i * 34, base + 8, 9, 2, PAL.bark1);
      Art.limb(g, cx + i * 5, base - 12, cx + i * 26, base + 2, 4, 1.4, PAL.bark0);
    }
    // trunk
    const topY = h * 0.42;
    Art.limb(g, cx, base, cx, topY, 34, 20, PAL.bark2);
    Art.limb(g, cx - 10, base, cx - 8, topY, 11, 7, PAL.bark3);
    Art.limb(g, cx + 12, base, cx + 9, topY, 8, 5, PAL.bark0);
    for (let i = 0; i < 70; i++) {
      const t = rnd(), y = U.lerp(base, topY, t), bw = U.lerp(34, 20, t);
      Art.rect(g, cx + (rnd() - 0.5) * bw * 0.8, y, 2, 2 + rnd() * 6, rnd() < 0.5 ? PAL.bark0 : PAL.bark3);
    }
    // three great boughs, each carrying four seats
    const dirs = [-1, 1, 0];
    for (let b = 0; b < 3; b++) {
      const dir = dirs[b];
      let x = cx + dir * 8, y = topY + 16, bw = 15;
      for (let i = 0; i < 4; i++) {
        const nx = x + dir * (w * 0.1 + i * 6) + (dir === 0 ? (rnd() - 0.5) * 26 : 0);
        const ny = y - h * 0.075 - i * 4;
        Art.limb(g, x, y, nx, ny, bw, bw * 0.74, PAL.bark2);
        Art.limb(g, x, y - bw * 0.2, nx, ny - bw * 0.15, bw * 0.34, bw * 0.26, PAL.bark3);
        for (let k = 0; k < 2; k++) {
          const t = (k + 1) / 3, tx = U.lerp(x, nx, t), ty = U.lerp(y, ny, t);
          Art.limb(g, tx, ty, tx + dir * (10 + rnd() * 14), ty - 12 - rnd() * 10, 3, 1, PAL.bark1);
        }
        const sx = Math.round(U.lerp(x, nx, 0.78) + dir * 4);
        const sy = Math.round(U.lerp(y, ny, 0.78) - 12);
        Art.limb(g, U.lerp(x, nx, 0.78), U.lerp(y, ny, 0.78), sx, sy + 5, 3, 1.6, PAL.bark1);
        anchors.push({ x: sx, y: sy, root: b, i });
        x = nx; y = ny; bw *= 0.8;
      }
    }
    // canopy: one dark mass, then clusters lit from the upper left
    const puffs = [];
    for (let i = 0; i < 22; i++) {
      const a = (i / 22) * TAU * 1.7 + rnd() * 0.5, r = Math.sqrt(rnd());
      puffs.push({
        x: cx + Math.cos(a) * w * 0.36 * r,
        y: topY - h * 0.12 + Math.sin(a) * h * 0.2 * r,
        rx: 22 + rnd() * 18, ry: 15 + rnd() * 12,
      });
    }
    puffs.sort((a, b) => a.y - b.y);
    for (const q of puffs) Art.ell(g, q.x, q.y + 3, q.rx + 2, q.ry + 2, '#1b2c15');
    for (const q of puffs) Art.ell(g, q.x, q.y, q.rx, q.ry, '#2b4520');
    for (const q of puffs) {
      Art.ell(g, q.x - q.rx * 0.16, q.y - q.ry * 0.2, q.rx * 0.78, q.ry * 0.74, '#3c6129');
      Art.ell(g, q.x - q.rx * 0.3, q.y - q.ry * 0.36, q.rx * 0.46, q.ry * 0.42, '#4f7d35');
      Art.speckle(g, q.x - q.rx * 0.3, q.y - q.ry * 0.4, q.rx * 0.5, q.ry * 0.42, '#6da348', 22, Math.round(q.x));
      Art.speckle(g, q.x, q.y + q.ry * 0.4, q.rx * 0.6, q.ry * 0.3, '#1f3418', 16, Math.round(q.y));
    }
    // a few strands hanging from the underside
    for (let i = 0; i < 10; i++) {
      const q = puffs[Math.floor(rnd() * puffs.length)];
      const sx = q.x + (rnd() - 0.5) * q.rx, sy = q.y + q.ry * 0.7;
      const len = 10 + rnd() * 26;
      Art.rect(g, sx, sy, 1, len, '#2b4520');
      for (let k = 6; k < len; k += 7) Art.rect(g, sx - 1, sy + k, 3, 2, '#3c6129');
      Art.ell(g, sx, sy + len, 2, 2.4, '#6da348');
    }
    Art.outline(c, PAL.ink, 0.55);
    const res = { canvas: c, anchors, topY, base };
    cache.set(key, res);
    return res;
  }

  return { P, get: (n, v) => P[n](v), drawCrop, buildLifeTree, clear: () => cache.clear() };
})();
