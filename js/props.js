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
    Art.outline(o.c, '#000000', 1);                 // everything wears the same black line
    cache.set(key, o.c);
    return o.c;
  }
  // Hard-edged, hand-shaded props (the truck) skip the automatic pass: its
  // dithered top light lands as a dashed line along every straight edge, which
  // reads as a texture bug on anything mechanical.
  function cachedFlat(key, w, h, draw) {
    let c = cache.get(key);
    if (c) return c;
    const o = Art.cv(w, h);
    draw(o.g, w, h);
    Art.outline(o.c, '#000000', 1);
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
  // ---- the truck -----------------------------------------------------------
  // A stubby 4x4 wagon, side on, facing left. Drawn as a silhouette first and
  // then panelled in, so the shape reads before any of the detail does: short
  // bonnet, tall glasshouse, a squared-off back with the tailgate down, and
  // wheels that sit in their arches rather than under them.
  function fortuner(g, W, H, o) {
    const open = !!(o && o.open);
    const BODY = '#456d8c', LIT = '#6f9ab8', HI = '#9cc4dc', DK = '#2f4a62', DKR = '#1e3344';
    const GLASS0 = '#4a7d99', GLASS = '#84b8d2', GLASS2 = '#c6e8f6';
    const TRIM = '#232f3a', CHR = '#b9c6cf', CHR2 = '#eef4f7';
    const TYRE = '#131018', TYRE2 = '#241f2c', RIM = '#8d95a2', RIM2 = '#d4dbe3';
    const GROUND = H - 8;                    // where the tyres touch
    const SILL = GROUND - 15;                // the bottom of the bodywork
    const BELT = SILL - 20;                  // the window line
    const ROOF = BELT - 20;
    const NOSE = 8, TAIL = W - 8;
    const FW = 34, RW = W - 38;              // the wheel centres

    // --- the shadow it sits in ---
    Art.ell(g, W / 2, GROUND + 5, W * 0.44, 4, 'rgba(10,8,16,0.3)');
    // --- the body: one silhouette, then the panels on top of it ---
    const shell = [
      [NOSE, SILL], [NOSE - 4, SILL - 6], [NOSE - 2, BELT - 2],      // the nose, leaning forward
      [22, BELT - 3], [30, ROOF], [TAIL - 14, ROOF],                  // windscreen up to the roof
      [TAIL - 2, BELT - 2], [TAIL, SILL], [TAIL, SILL + 9], [NOSE, SILL + 9],
    ];
    Art.poly(g, shell, TRIM);
    Art.poly(g, shell.map(([x, y]) => [x + (x < W / 2 ? 1.4 : -1.4), y + (y < BELT ? 1.4 : -0.6)]), BODY);
    // the upper body catches the light, the sill sits in shadow
    Art.poly(g, [[NOSE, BELT + 1], [TAIL - 2, BELT + 1], [TAIL - 2, BELT + 6], [NOSE, BELT + 6]], LIT);
    Art.poly(g, [[NOSE, BELT + 1], [TAIL - 2, BELT + 1], [TAIL - 2, BELT + 2.4], [NOSE, BELT + 2.4]], HI);
    Art.poly(g, [[NOSE, SILL + 1], [TAIL, SILL + 1], [TAIL, SILL + 9], [NOSE, SILL + 9]], DK);
    Art.rect(g, NOSE + 4, SILL + 7, W - 24, 3, DKR);                  // the side step
    Art.rect(g, NOSE + 4, SILL + 7, W - 24, 1, '#3d5a72');
    // --- the glasshouse ---
    Art.poly(g, [[25, BELT - 4], [32, ROOF + 2], [TAIL - 16, ROOF + 2], [TAIL - 6, BELT - 4]], GLASS0);
    Art.poly(g, [[27, BELT - 5], [33.5, ROOF + 3], [51, ROOF + 3], [51, BELT - 5]], GLASS);      // windscreen
    Art.poly(g, [[28.5, BELT - 7], [34, ROOF + 4], [43, ROOF + 4], [37, BELT - 7]], GLASS2);
    Art.rect(g, 54, ROOF + 3, 26, BELT - ROOF - 8, GLASS);            // front door glass
    Art.rect(g, 55, ROOF + 4, 11, 5, GLASS2);
    Art.rect(g, 83, ROOF + 3, 20, BELT - ROOF - 8, GLASS);            // rear door glass
    Art.rect(g, 84, ROOF + 4, 8, 5, GLASS2);
    Art.rect(g, 51, ROOF + 1, 3, BELT - ROOF - 5, BODY);              // pillars
    Art.rect(g, 80, ROOF + 1, 3, BELT - ROOF - 5, BODY);
    Art.rect(g, 103, ROOF + 1, TAIL - 16 - 103, BELT - ROOF - 5, BODY);
    Art.rect(g, 25, ROOF + 1, W - 42, 2.4, DK);                       // the roof line
    Art.rect(g, 26, ROOF + 1, W - 44, 1, LIT);
    // roof rails, two thin ones
    Art.rect(g, 34, ROOF - 4, W - 62, 2, TRIM);
    Art.rect(g, 34, ROOF - 4, W - 62, 0.8, '#4a5a68');
    Art.rect(g, 38, ROOF - 3, 2.4, 4, TRIM);
    Art.rect(g, W - 46, ROOF - 3, 2.4, 4, TRIM);
    // --- doors, handles, the crease down the flank ---
    Art.rect(g, 51, BELT, 1.4, SILL - BELT + 1, DK);
    Art.rect(g, 80, BELT, 1.4, SILL - BELT + 1, DK);
    Art.rect(g, 103, BELT, 1.4, SILL - BELT + 1, DK);
    Art.rect(g, 60, BELT + 8, 9, 2.4, CHR);
    Art.rect(g, 89, BELT + 8, 9, 2.4, CHR);
    Art.rect(g, 48, BELT - 2, 7, 4, TRIM);                            // the wing mirror
    Art.rect(g, 46, BELT - 1, 3, 3, CHR);
    // --- the nose ---
    Art.poly(g, [[NOSE - 4, SILL - 6], [NOSE + 12, SILL - 6], [NOSE + 12, SILL + 2], [NOSE - 5, SILL + 2]], TRIM);
    Art.rect(g, NOSE - 4, SILL - 5, 15, 1.4, CHR);                    // grille bars
    Art.rect(g, NOSE - 4, SILL - 2.4, 15, 1.4, CHR);
    Art.poly(g, [[NOSE - 5, SILL - 12], [NOSE + 9, SILL - 13], [NOSE + 9, SILL - 8], [NOSE - 5, SILL - 7]], '#f6e6a8');
    Art.poly(g, [[NOSE - 3, SILL - 11], [NOSE + 6, SILL - 11.6], [NOSE + 6, SILL - 9.6], [NOSE - 3, SILL - 9]], '#fffdf0');
    Art.rect(g, NOSE - 7, SILL + 2, 19, 6, DKR);                      // bumper
    Art.rect(g, NOSE - 7, SILL + 7, 21, 3, CHR);                      // bash plate
    Art.rect(g, NOSE - 6, SILL + 3, 5, 2, '#e07a3c');                 // indicator
    // --- the back, with the tailgate down and the tray showing ---
    Art.rect(g, TAIL - 3, BELT + 2, 4, SILL - BELT - 1, DK);
    Art.rect(g, TAIL - 2, SILL + 1, 4, 7, DKR);
    Art.rect(g, TAIL - 3, BELT + 3, 3, 4, '#c02c22');                 // tail lamp
    if (open) {
      Art.rect(g, TAIL - 1, BELT + 6, 9, 3, TRIM);                    // the tailgate, dropped
      Art.rect(g, TAIL - 1, BELT + 6, 9, 1, '#4a5a68');
      Art.rect(g, TAIL - 12, BELT + 2, 12, 5, '#12202c');             // the dark of the tray
    }
    // --- arches and wheels, on top of everything so they always read ---
    for (const wx of [FW, RW]) {
      Art.ell(g, wx, GROUND - 4, 16, 15, TRIM);                       // the plastic flare
      Art.ell(g, wx, GROUND - 4, 14.4, 13.4, '#0e0c12');              // the wheel well behind it
      Art.rect(g, wx - 15, GROUND - 4, 30, 14, '#0e0c12');
      Art.ell(g, wx, GROUND - 3, 12.6, 12.6, '#0b0910');              // the tyre
      Art.ell(g, wx, GROUND - 3, 11.4, 11.4, TYRE);
      Art.ell(g, wx, GROUND - 3, 9.4, 9.4, TYRE2);
      Art.ell(g, wx, GROUND - 3, 6.6, 6.6, RIM);
      for (let i = 0; i < 5; i++) {
        const a2 = (i / 5) * TAU + 0.35;
        Art.limb(g, wx, GROUND - 3, wx + Math.cos(a2) * 5.8, GROUND - 3 + Math.sin(a2) * 5.8, 2.2, 1.3, RIM2);
      }
      Art.ell(g, wx, GROUND - 3, 2.6, 2.6, '#5f6772');
      Art.ell(g, wx - 1.3, GROUND - 4.6, 1.1, 1.1, CHR2);
    }
  }
  P.truck = () => cachedFlat('truck', 140, 78, (g) => fortuner(g, 140, 78, { open: false }));
  P.fortuner = (spec) => cachedFlat('fortuner:' + spec, 140, 78, (g) => fortuner(g, 140, 78, { open: spec === 'open' }));

  // ---- what a crop looks like once it is picked ----------------------------
  // Each one is its own thing in the bowl, in the tray and on the shelf, rather
  // than a coloured lump with the crop's tint on it.
  P.produce = (key) => cached('produce:' + key, 26, 26, (g) => {
    const def = CROP_BY_KEY[key] || CROPS[0];
    const C = def.color, D = U.shade(C, -0.34), L = U.shade(C, 0.36), H = U.shade(C, 0.62);
    const cx = 13, by = 22;
    switch (key) {
      case 'ashgrass': {                                   // a tied bundle of blades
        for (let i = -3; i <= 3; i++) {
          const lean = i * 2.4;
          Art.limb(g, cx + i * 0.8, by, cx + lean, 5 + Math.abs(i) * 1.6, 2, 0.8, i % 2 ? D : C);
          Art.limb(g, cx + i * 0.8, by, cx + lean - 0.6, 6 + Math.abs(i) * 1.6, 1, 0.5, L);
        }
        Art.rect(g, cx - 5, by - 7, 10, 3.4, '#8a6a3a');    // the twine
        Art.rect(g, cx - 5, by - 7, 10, 1.2, '#b89460');
        break;
      }
      case 'sunroot': {                                    // a fat root with its top on
        Art.poly(g, [[cx - 5, 9], [cx + 5, 9], [cx + 2, by], [cx - 2, by]], D);
        Art.poly(g, [[cx - 4, 9.6], [cx + 4, 9.6], [cx + 1.6, by - 1], [cx - 1.6, by - 1]], C);
        Art.poly(g, [[cx - 4, 9.6], [cx - 0.6, 9.6], [cx - 0.6, by - 2], [cx - 3, by - 2]], L);
        for (let i = 0; i < 3; i++) Art.rect(g, cx - 4 + i * 0.6, 12 + i * 3.4, 8 - i * 1.6, 1, D);
        for (let i = -1; i <= 1; i++) {                    // the green top
          Art.limb(g, cx, 10, cx + i * 5, 2 + Math.abs(i), 2.4, 1, '#2f6b34');
          Art.ell(g, cx + i * 5, 2 + Math.abs(i), 3, 2.2, '#4f9a42');
          Art.ell(g, cx + i * 5 - 0.8, 1.4 + Math.abs(i), 1.4, 1, '#79c05c');
        }
        break;
      }
      case 'resinbud': {                                   // a bud, running with sap
        Art.ell(g, cx, 13, 7, 8.5, D);
        Art.ell(g, cx, 12.4, 6, 7.5, C);
        Art.ell(g, cx - 2, 9.4, 3, 3.4, L);
        Art.ell(g, cx - 2.6, 8.4, 1.4, 1.4, H);
        for (const [dx, dy] of [[-5, 17], [4.4, 15], [0, 20]]) {   // drips
          Art.ell(g, cx + dx, dy, 1.8, 2.6, C);
          Art.ell(g, cx + dx - 0.5, dy - 0.8, 0.8, 1.1, H);
        }
        Art.limb(g, cx, 5, cx, 9, 1.6, 2.4, '#6a4a22');
        break;
      }
      case 'duskhusk': {                                   // a split pod
        Art.ell(g, cx, 13, 6.4, 9, D);
        Art.ell(g, cx, 12.6, 5.4, 8, C);
        Art.ell(g, cx - 1.8, 10, 2.4, 3.6, L);
        Art.poly(g, [[cx - 1, 5], [cx + 1, 5], [cx + 2.4, 20], [cx - 2.4, 20]], D);
        for (let i = 0; i < 3; i++) Art.ell(g, cx, 10 + i * 3.4, 1.5, 1.5, '#4a4030');  // the seeds inside
        break;
      }
      case 'ironbulb': {                                   // a heavy metallic bulb
        Art.ell(g, cx, 15, 7.6, 7, D);
        Art.ell(g, cx, 14.4, 6.6, 6, C);
        Art.ell(g, cx - 2.2, 12, 2.8, 2.4, L);
        Art.ell(g, cx - 2.8, 11.2, 1.2, 0.9, H);
        Art.ellBand(g, cx, 15, 7.6, 7, '#20202c', 0.86, 1);
        for (let i = -1; i <= 1; i++) Art.limb(g, cx, 9, cx + i * 3.4, 3, 1.8, 0.8, '#4a4a58');
        Art.rect(g, cx - 1, 2, 2, 7, '#5a5a68');
        break;
      }
      case 'broadleaf': {                                  // one big leaf
        Art.poly(g, [[cx, 3], [cx + 8, 12], [cx, 21], [cx - 8, 12]], D);
        Art.poly(g, [[cx, 4.4], [cx + 6.8, 12], [cx, 19.6], [cx - 6.8, 12]], C);
        Art.poly(g, [[cx, 4.4], [cx + 1, 12], [cx, 19.6], [cx - 6, 12]], L);
        Art.rect(g, cx - 0.6, 4, 1.2, 16, D);
        for (let i = 1; i < 4; i++) {
          Art.limb(g, cx, 6 + i * 3.4, cx - 4.6, 5 + i * 3.4, 0.9, 0.5, D);
          Art.limb(g, cx, 6 + i * 3.4, cx + 4.6, 5 + i * 3.4, 0.9, 0.5, D);
        }
        break;
      }
      case 'goldwheat': {                                  // three ears, bound
        for (const sd of [-1, 0, 1]) {
          const ex = cx + sd * 4.6, top = 3 + Math.abs(sd) * 2.4;
          Art.limb(g, cx + sd * 1.4, by, ex, top + 6, 1.6, 1, '#9a7a30');
          for (let i = 0; i < 4; i++) {
            const y = top + i * 2.6;
            Art.ell(g, ex - 1.6, y, 1.8, 1.5, D);
            Art.ell(g, ex + 1.6, y + 1, 1.8, 1.5, C);
            Art.ell(g, ex - 1.8, y - 0.4, 0.9, 0.7, H);
          }
        }
        Art.rect(g, cx - 4, by - 6, 8, 3, '#8a6a3a');
        break;
      }
      case 'runeberry': {                                  // berries that will not sit still
        Art.limb(g, cx, by, cx, 10, 1.6, 1, '#3a2a4a');
        const spots = [[-4.4, 10], [4.4, 11], [0, 6.4], [-2.4, 15], [3, 16]];
        for (const [dx, dy] of spots) {
          Art.ell(g, cx + dx, dy, 4, 4, D);
          Art.ell(g, cx + dx, dy, 3.2, 3.2, C);
          Art.ell(g, cx + dx - 1, dy - 1.1, 1.3, 1, H);
          Art.rect(g, cx + dx - 0.5, dy - 0.5, 1, 1, '#e6d6ff');
        }
        break;
      }
      case 'mandrake': {                                   // a root with a face, screaming
        for (let i = -1; i <= 1; i++) {                     // the leaves on its head
          Art.limb(g, cx, 9, cx + i * 5.4, 1 + Math.abs(i) * 1.6, 2.2, 1, '#2f6b34');
          Art.ell(g, cx + i * 5.4, 1 + Math.abs(i) * 1.6, 3, 2.2, '#4f9a42');
        }
        Art.ell(g, cx, 14, 6.4, 7.4, '#9e8050');            // the body of the root
        Art.ell(g, cx, 13.6, 5.4, 6.4, C);
        Art.ell(g, cx - 1.8, 11, 2.4, 2.4, '#e2c894');
        Art.rect(g, cx - 2.6, 12, 1.6, 1.8, '#3a2a18');     // two furious eyes
        Art.rect(g, cx + 1, 12, 1.6, 1.8, '#3a2a18');
        Art.ell(g, cx, 16.6, 2, 2.4, '#3a2a18');            // and a wide open mouth
        Art.limb(g, cx - 2.4, 20, cx - 4.6, by + 1, 2, 1, '#8a6c44');   // little legs
        Art.limb(g, cx + 2.4, 20, cx + 4.6, by + 1, 2, 1, '#8a6c44');
        break;
      }
      case 'moonbell': {                                    // three pale bells on a stem
        Art.limb(g, cx, by, cx, 7, 1.8, 1.2, '#3f6b58');
        for (const [dx, dy] of [[-4.6, 11], [4.6, 13], [0, 7]]) {
          Art.limb(g, cx, dy - 2, cx + dx, dy, 1.2, 0.8, '#3f6b58');
          Art.poly(g, [[cx + dx - 3.4, dy], [cx + dx + 3.4, dy], [cx + dx + 2, dy + 5.4], [cx + dx - 2, dy + 5.4]], '#5d93a6');
          Art.poly(g, [[cx + dx - 2.8, dy + 0.4], [cx + dx + 2.8, dy + 0.4], [cx + dx + 1.6, dy + 5], [cx + dx - 1.6, dy + 5]], C);
          Art.rect(g, cx + dx - 2.2, dy + 0.6, 1.4, 4, '#dff2fa');
          Art.rect(g, cx + dx - 0.5, dy + 5.2, 1, 1.6, '#eaf6fb');     // the clapper
        }
        break;
      }
      case 'emberleaf': {                                   // leaves with a coal in them
        Art.limb(g, cx, by, cx, 9, 1.8, 1.2, '#5a3018');
        for (const [dx, dy, r] of [[-5, 10, 1], [5.4, 12, -1], [0, 5.4, 0]]) {
          Art.ell(g, cx + dx, dy, 4.4, 3.4, '#7a2e10');
          Art.ell(g, cx + dx, dy - 0.4, 3.6, 2.7, C);
          Art.ell(g, cx + dx - 0.6, dy - 1, 1.8, 1.2, '#ffb05a');
          Art.ell(g, cx + dx, dy, 1.2, 1, '#fff0c0');
          Art.limb(g, cx, dy + 1, cx + dx, dy, 1, 0.6, '#5a3018');
        }
        for (let i = 0; i < 3; i++) Art.rect(g, cx - 3 + i * 3, 2 + (i % 2), 1, 2, '#ffb05a');   // sparks
        break;
      }
      case 'snapjaw': {                                     // a head on a stalk, with teeth
        Art.limb(g, cx, by, cx + 1, 12, 2.4, 1.6, '#2f6b34');
        Art.ell(g, cx, 12, 3.4, 2.6, '#2f6b34');
        Art.poly(g, [[cx - 6, 10], [cx + 6, 10], [cx + 4, 3], [cx - 4, 3]], '#24502a');  // upper jaw
        Art.poly(g, [[cx - 5, 9.4], [cx + 5, 9.4], [cx + 3.4, 4], [cx - 3.4, 4]], C);
        Art.poly(g, [[cx - 5.4, 11], [cx + 5.4, 11], [cx + 3.6, 16], [cx - 3.6, 16]], '#24502a');  // lower
        Art.poly(g, [[cx - 4.6, 11], [cx + 4.6, 11], [cx + 3, 15.2], [cx - 3, 15.2]], '#3f8038');
        for (let i = 0; i < 4; i++) {
          Art.poly(g, [[cx - 4.4 + i * 3, 9.6], [cx - 2.6 + i * 3, 9.6], [cx - 3.5 + i * 3, 12]], '#f2ece0');
          Art.poly(g, [[cx - 3.8 + i * 2.6, 11.4], [cx - 2.2 + i * 2.6, 11.4], [cx - 3 + i * 2.6, 9]], '#f2ece0');
        }
        Art.ell(g, cx - 2.4, 5.4, 1.2, 1.2, '#f2ece0');     // one small mad eye
        Art.rect(g, cx - 2.6, 5.2, 1, 1, '#1a1410');
        break;
      }
      case 'whisperfern': {                                 // a frond that will not shut up
        Art.limb(g, cx, by, cx, 4, 2, 1.2, '#4a3a5e');
        for (let i = 0; i < 5; i++) {
          const y = 5 + i * 3.4, w = 9 - i * 1.2;
          Art.limb(g, cx, y, cx - w, y - 1.4, 1.6, 0.8, '#6a4a94');
          Art.limb(g, cx, y, cx + w, y - 1.4, 1.6, 0.8, '#7a58a8');
          Art.ell(g, cx - w, y - 1.6, 1.8, 1.4, C);
          Art.ell(g, cx + w, y - 1.6, 1.8, 1.4, C);
        }
        Art.ell(g, cx, 3.4, 2.4, 2.4, H);
        for (let i = 0; i < 3; i++) Art.rect(g, cx - 5 + i * 5, 1 + (i % 2), 1, 1, '#e6d6ff');
        break;
      }
      case 'carrot': {                                      // pulled, tops still on
        Art.poly(g, [[cx - 4, 8], [cx + 4, 8], [cx, by + 1]], D);
        Art.poly(g, [[cx - 3, 9], [cx + 2.6, 9], [cx, by - 1]], C);
        Art.poly(g, [[cx - 3, 9], [cx - 0.6, 9], [cx - 0.8, by - 3]], L);
        for (let i = 0; i < 4; i++) Art.rect(g, cx - 3 + i * 0.5, 10.4 + i * 2.6, 6 - i * 1.4, 1, D);
        for (let i = -2; i <= 2; i++) {
          Art.limb(g, cx, 8.4, cx + i * 3.4, 1.4 + Math.abs(i), 1.6, 0.8, '#2f6b34');
          Art.ell(g, cx + i * 3.4, 1.4 + Math.abs(i), 2, 1.6, '#4f9a42');
        }
        break;
      }
      case 'cabbage': {                                     // a head, leaves curling off it
        Art.ell(g, cx, 14, 9, 8, '#3c6b32');
        Art.ell(g, cx, 13.6, 7.6, 6.8, D);
        Art.ell(g, cx, 13, 6, 5.4, C);
        Art.ell(g, cx - 1.6, 11, 3, 2.4, L);
        Art.ell(g, cx - 2.2, 10.2, 1.4, 1, H);
        for (const [dx, dy] of [[-8, 16], [8, 16], [0, 20]]) {
          Art.ell(g, cx + dx * 0.8, dy, 4, 2.4, '#3c6b32');
          Art.ell(g, cx + dx * 0.8, dy - 0.4, 3.2, 1.8, '#5d9440');
        }
        Art.rect(g, cx - 0.6, 8.6, 1.2, 3, '#2a4f24');
        break;
      }
      case 'potato': {                                      // two, with the dirt still on
        Art.ell(g, cx - 3, 15, 6.4, 5, D);
        Art.ell(g, cx - 3, 14.4, 5.4, 4.2, C);
        Art.ell(g, cx - 4.6, 12.8, 2, 1.4, L);
        Art.ell(g, cx + 5, 18, 5, 4, D);
        Art.ell(g, cx + 5, 17.5, 4.2, 3.2, C);
        for (const [dx, dy] of [[-4, 14], [-1, 16], [6, 18], [4, 19.6]]) Art.rect(g, cx + dx, dy, 1.2, 1.2, U.shade(C, -0.5));
        for (let i = 0; i < 4; i++) Art.rect(g, cx - 6 + i * 4, 20 + (i % 2), 2, 1, '#4a3a28');
        break;
      }
      case 'pumpkin': {                                     // ribbed, with a stalk
        Art.ell(g, cx, 15, 9.4, 7.6, D);
        Art.ell(g, cx, 14.6, 8.4, 6.8, C);
        for (const d of [-0.62, -0.2, 0.2, 0.62]) Art.ell(g, cx + d * 8, 14.8, 1.6, 6.4, D);
        Art.ell(g, cx - 3.4, 11.4, 2.6, 2, L);
        Art.ell(g, cx - 4, 10.8, 1.2, 0.9, H);
        Art.rect(g, cx - 1.4, 5.4, 3, 4, '#4a6b2a');
        Art.rect(g, cx - 1.4, 5.4, 3, 1.4, '#6d8f3a');
        Art.limb(g, cx + 1.4, 6, cx + 5.4, 3.4, 1.2, 0.8, '#4a6b2a');
        break;
      }
      case 'apple': case 'plum': case 'lemon': case 'fig': {  // a pair of fruit off the tree
        const tall = key === 'lemon' || key === 'plum';
        for (const [dx, dy, sc] of [[-3.4, 14, 1], [4, 17, 0.82]]) {
          Art.ell(g, cx + dx, dy, 6 * sc * (tall ? 0.86 : 1), 6 * sc * (tall ? 1.12 : 1), D);
          Art.ell(g, cx + dx, dy - 0.4, 5 * sc * (tall ? 0.86 : 1), 5 * sc * (tall ? 1.12 : 1), C);
          Art.ell(g, cx + dx - 1.8 * sc, dy - 2 * sc, 2 * sc, 1.6 * sc, L);
          Art.ell(g, cx + dx - 2.2 * sc, dy - 2.6 * sc, 1 * sc, 0.8 * sc, H);
          Art.rect(g, cx + dx - 0.5, dy - 6.4 * sc, 1, 2.4 * sc, '#5a3a20');
        }
        Art.poly(g, [[cx - 2, 8], [cx + 4, 5], [cx + 5, 8.4]], '#4f8a3a');   // one leaf
        Art.poly(g, [[cx - 1, 8], [cx + 3.4, 6], [cx + 4, 8]], '#6fae4a');
        break;
      }
      case 'gumnut': {                                      // hard little capsules
        for (const [dx, dy, sc] of [[-4, 15, 1], [3.4, 17, 0.9], [1, 11, 0.8]]) {
          Art.ell(g, cx + dx, dy, 4.4 * sc, 4 * sc, '#5a4a3a');
          Art.ell(g, cx + dx, dy + 0.4, 3.6 * sc, 3.2 * sc, C);
          Art.rect(g, cx + dx - 2.4 * sc, dy - 2.6 * sc, 4.8 * sc, 1.6 * sc, '#4a3c2e');
          Art.rect(g, cx + dx - 1.6 * sc, dy - 1.4 * sc, 3.2 * sc, 1, L);
        }
        for (const [lx, ly] of [[-7, 7], [6, 6]]) {
          Art.poly(g, [[cx + lx, ly + 5], [cx + lx * 1.3, ly - 3], [cx + lx * 0.6, ly + 4]], '#6f8f63');
        }
        break;
      }
      case 'dreamcap': {                                    // a mushroom, spores lifting off
        Art.rect(g, cx - 1.6, 12, 3.4, 10, '#e2d4c0');
        Art.rect(g, cx - 1.6, 12, 1.4, 10, '#f6ece0');
        Art.ell(g, cx, 17, 5, 1.6, '#d0c0aa');
        Art.ell(g, cx, 11.4, 9, 6, D);
        Art.ell(g, cx, 11, 8, 5.2, C);
        Art.ell(g, cx - 3, 8.6, 3, 2, L);
        Art.ell(g, cx - 3.6, 8, 1.4, 1, H);
        Art.rect(g, cx - 6, 13.4, 12, 1.4, U.shade(C, -0.5));
        for (let i = 0; i < 4; i++) Art.rect(g, cx - 6 + i * 4, 2 + (i % 2) * 2, 1, 1, '#e6d6ff');
        break;
      }
      case 'starthistle': {                                 // a burr with a light in it
        for (let i = 0; i < 10; i++) {
          const a = i * 0.63;
          Art.limb(g, cx, 12, cx + Math.cos(a) * 9, 12 + Math.sin(a) * 8, 1.6, 0.6, '#8a8a4a');
        }
        Art.ell(g, cx, 12, 6, 5.4, '#4a3a6a');
        Art.ell(g, cx, 11.6, 5, 4.4, '#7a58a8');
        Art.ell(g, cx - 1.6, 10, 2.2, 1.8, C);
        Art.rect(g, cx - 0.6, 11, 1.4, 1.4, '#fff6d0');
        for (let i = 0; i < 3; i++) Art.rect(g, cx - 5 + i * 5, 3 + (i % 2), 1, 1, '#e6d6ff');
        Art.limb(g, cx, 16, cx, by, 2, 1.2, '#5a6b3a');
        break;
      }
      default:
        Art.ell(g, cx, 14, 7, 7, D);
        Art.ell(g, cx, 13.4, 6, 6, C);
        Art.ell(g, cx - 2, 11, 2.4, 2, L);
    }
  });

  P.crate = () => cached('crate', 22, 20, (g) => {
    Art.rect(g, 1, 3, 20, 16, PAL.bark2);
    Art.rect(g, 1, 3, 20, 2.4, PAL.bark3);
    Art.rect(g, 1, 16.6, 20, 2.4, PAL.bark1);
    Art.line(g, 2, 18, 20, 4, PAL.bark3, 1); Art.line(g, 20, 18, 2, 4, PAL.bark3, 1);
  });

  // ---- crops --------------------------------------------------------------
  // ---- fruit trees ---------------------------------------------------------
  // Years in the ground, then fruit forever. Built from the roots up, so the
  // same routine draws a whip, a young tree and a full crown.
  function drawTree(g, def, x, y, p, time, sway, fruit, wild, wet) {
    const gr = U.clamp(p, 0, 1);
    const H2 = Math.round(10 + gr * 44);              // trunk height
    const cw = 7 + gr * 21, ch = 5 + gr * 15;         // crown half-size
    const lean = Math.sin(time * 0.8 + x * 0.05) * (1 + gr * 1.8) + (sway || 0) * 10;
    const cx = Math.round(x + lean), cy = Math.round(y - H2 - ch * 0.35);
    const leaf = def.leaf || '#4e7a3a';
    const dark = U.shade(leaf, -0.42), mid = leaf, lit = U.shade(leaf, 0.22), hi = U.shade(leaf, 0.42);
    const r = Art.rng(Math.round(x) * 31 + 7);

    if (wet) { g.fillStyle = 'rgba(87,182,201,0.18)'; Art.ell(g, x, y + 1, cw * 0.6 + 4, 3); }
    g.fillStyle = 'rgba(18,14,20,0.26)'; Art.ell(g, x, y, cw * 0.66 + 3, 3 + gr * 2);

    // trunk: an ink edge, bark inside, lit down the left, moss at the foot
    const tw = Math.max(3, Math.round(3 + gr * 5));
    for (let i = 0; i < H2; i++) {
      const t = i / H2;
      const bx = Math.round(x + lean * t * t);
      const w2 = Math.max(3, Math.round(tw * (1 - t * 0.3)));
      const x0 = bx - (w2 >> 1);
      g.fillStyle = PAL.bark0; g.fillRect(x0 - 1, y - i, w2 + 2, 1);
      g.fillStyle = PAL.bark2; g.fillRect(x0, y - i, w2, 1);
      g.fillStyle = PAL.bark3; g.fillRect(x0, y - i, 1, 1);
      if (i % 9 === 4) { g.fillStyle = PAL.bark1; g.fillRect(x0 + 1, y - i, w2 - 1, 1); }
    }
    if (gr > 0.3) {                                    // root flare
      g.fillStyle = PAL.bark0;
      g.fillRect(Math.round(x - tw), y - 2, 2, 2); g.fillRect(Math.round(x + tw - 2), y - 2, 2, 2);
      g.fillStyle = PAL.soil2; g.fillRect(Math.round(x - tw - 2), y - 1, tw * 2 + 4, 1);
    }
    if (gr > 0.35) {                                   // moss climbing the shady side
      const mh = Math.round(H2 * 0.45);
      for (let i = 0; i < mh; i++) {
        if ((i * 7 + Math.round(x)) % 4 === 0) continue;
        g.fillStyle = i % 3 ? PAL.moss1 : PAL.moss2;
        g.fillRect(Math.round(x - (tw >> 1) - 1), y - i, 2, 1);
      }
      g.fillStyle = PAL.moss3;
      for (let i = 0; i < 4; i++) g.fillRect(Math.round(x - (tw >> 1) - 1), y - Math.round(r() * mh), 1, 1);
    }
    // boughs reaching into the crown
    if (gr > 0.4) {
      for (const d of [-1, 1]) {
        const by = y - H2 * 0.72, n = Math.round(cw * 0.42);
        for (let i = 0; i < n; i++) {
          g.fillStyle = PAL.bark0; g.fillRect(Math.round(x + lean * 0.5 + d * i), Math.round(by - i * 0.62), 3, 3);
          g.fillStyle = PAL.bark2; g.fillRect(Math.round(x + lean * 0.5 + d * i), Math.round(by - i * 0.62), 2, 2);
        }
      }
    }
    // crown: a handful of chunky clumps, each with its own shading, so the
    // silhouette reads as leaves rather than one smooth dome
    const CL = [[0, -0.34, 0.66], [-0.66, 0.06, 0.6], [0.64, 0.02, 0.58], [-0.3, 0.42, 0.52], [0.34, 0.44, 0.5], [0, 0.16, 0.72]];
    const n = gr < 0.25 ? 1 : gr < 0.5 ? 3 : gr < 0.8 ? 5 : 6;
    const clumps = [];
    for (let i = 0; i < n; i++) {
      const c = CL[i];
      clumps.push({ x: cx + c[0] * cw, y: cy + c[1] * ch, rx: cw * c[2], ry: ch * c[2] * 1.05 });
    }
    for (const c of clumps) Art.ell(g, c.x, c.y, c.rx + 1.5, c.ry + 1.5, PAL.ink);   // one ink edge for the lot
    for (const c of clumps) Art.ell(g, c.x, c.y, c.rx, c.ry, dark);
    for (const c of clumps) Art.ell(g, c.x, c.y - c.ry * 0.22, c.rx * 0.86, c.ry * 0.74, mid);
    for (const c of clumps) Art.ell(g, c.x - c.rx * 0.2, c.y - c.ry * 0.46, c.rx * 0.5, c.ry * 0.36, lit);
    Art.ell(g, cx - cw * 0.3, cy - ch * 0.8, cw * 0.3, ch * 0.2, hi);
    // leaf tufts standing off the edge
    for (let i = 0; i < Math.round(gr * 22); i++) {
      const a = r() * TAU, rr = 0.9 + r() * 0.22;
      g.fillStyle = r() < 0.35 ? lit : dark;
      g.fillRect(Math.round(cx + Math.cos(a) * cw * rr), Math.round(cy + Math.sin(a) * ch * rr), 2, 2);
    }
    if (wild > 1) {                                    // leggy: shoots out of the crown
      for (let i = 0; i < 8; i++) {
        const a = -0.35 - r() * 2.4, l = 5 + r() * 8;
        for (let k = 0; k < l; k++) {
          g.fillStyle = k > l - 3 ? lit : PAL.bark1;
          g.fillRect(Math.round(cx + Math.cos(a) * (cw * 0.8 + k)), Math.round(cy + Math.sin(a) * (ch * 0.8 + k * 0.6)), 1, 1);
        }
      }
    }
    // blossom while the next crop is coming, fruit once it has arrived
    if (gr >= 1 && !fruit) {
      for (let i = 0; i < 8; i++) {
        const a = r() * TAU, rr = 0.4 + r() * 0.55;
        const bx = Math.round(cx + Math.cos(a) * cw * rr), by = Math.round(cy + Math.sin(a) * ch * rr);
        g.fillStyle = '#f6d8e4'; g.fillRect(bx - 1, by, 3, 1); g.fillRect(bx, by - 1, 1, 3);
        g.fillStyle = PAL.gold3; g.fillRect(bx, by, 1, 1);
      }
    }
    for (let i = 0; i < (fruit || 0) * 3; i++) {
      const a = 0.35 + (i / Math.max(1, (fruit || 1) * 3)) * TAU, rr = 0.5 + ((i * 7) % 5) / 14;
      drawFruit(g, def, Math.round(cx + Math.cos(a) * cw * rr), Math.round(cy + Math.abs(Math.sin(a)) * ch * rr + ch * 0.26));
    }
    if (gr >= 1 && fruit) {                            // it is asking to be picked
      const tw2 = 0.5 + 0.5 * Math.sin(time * 4 + x);
      g.fillStyle = `rgba(255,238,176,${(0.3 + tw2 * 0.4).toFixed(2)})`;
      g.fillRect(Math.round(cx + cw * 0.86), Math.round(cy - ch * 0.7), 2, 2);
      g.fillRect(Math.round(cx - cw * 0.94), Math.round(cy - ch * 0.2), 2, 2);
    }
  }
  // one hanging fruit, two pixels of stalk and a highlight
  function drawFruit(g, def, x, y) {
    const key = typeof def === 'string' ? def : def.key;
    g.fillStyle = PAL.bark1; g.fillRect(x, y - 3, 1, 2);
    g.fillStyle = PAL.ink; Art.ell(g, x, y, 3.2, 3.2);
    switch (key) {
      case 'apple': Art.ell(g, x, y, 2.6, 2.6, '#b8412c'); Art.ell(g, x - 0.8, y - 0.8, 1.2, 1, '#e0705a'); break;
      case 'plum': Art.ell(g, x, y, 2.2, 2.6, '#563391'); Art.ell(g, x - 0.7, y - 0.8, 1, 1, '#8354c9'); break;
      case 'lemon': Art.ell(g, x, y, 2, 2.8, '#d8a52f'); Art.ell(g, x - 0.6, y - 1, 0.9, 1, '#ffeeb0'); break;
      case 'fig': Art.ell(g, x, y, 2.4, 2.2, '#6b3a56'); Art.ell(g, x, y + 1, 1.6, 1, '#a8557e'); break;
      default: Art.ell(g, x, y, 2.2, 2.4, '#8a7156'); Art.ell(g, x - 0.6, y - 0.6, 0.9, 0.8, '#cfc4b0'); break;
    }
  }

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
      case 'carrot':                          // a root: fern top, one orange shoulder
        g.fillStyle = PAL.moss4;
        for (let i = 0; i < 5; i++) { const a = -1.9 + i * 0.5; for (let k = 0; k < 4 + t * 4; k++) g.fillRect(Math.round(tipX + Math.cos(a) * k), Math.round(tipY + Math.sin(a) * k * 0.8), 1, 1); }
        Art.ell(g, x, y - 1, 2.4 + t * 1.6, 1.6 + t, def.color);
        g.fillStyle = U.shade(def.color, 0.25); g.fillRect(Math.round(x - 1), Math.round(y - 2), 2, 1);
        break;
      case 'cabbage': {                       // rings of leaf, tight in the middle
        const rr = 3 + t * 5;
        Art.ell(g, x, y - rr * 0.5, rr, rr * 0.72, U.shade(def.color, -0.3));
        Art.ell(g, x, y - rr * 0.6, rr * 0.78, rr * 0.56, def.color);
        Art.ell(g, x - rr * 0.16, y - rr * 0.72, rr * 0.42, rr * 0.32, U.shade(def.color, 0.24));
        g.fillStyle = U.shade(def.color, -0.45);
        g.fillRect(Math.round(x - rr * 0.6), Math.round(y - rr * 0.5), Math.round(rr * 1.2), 1);
        break;
      }
      case 'potato':                          // low bushy haulm, one tuber showing
        for (let i = 0; i < 4; i++) { g.fillStyle = i % 2 ? PAL.moss2 : PAL.moss3; Art.ell(g, x - 4 + i * 2.6, y - 4 - (i % 2) * 3 - t * 3, 3, 2.2); }
        Art.ell(g, x + 4, y - 1, 2.6 + t, 2 + t * 0.6, def.color);
        g.fillStyle = PAL.soil1; g.fillRect(Math.round(x + 3), Math.round(y - 1), 1, 1); g.fillRect(Math.round(x + 5), Math.round(y - 2), 1, 1);
        break;
      case 'pumpkin': {                        // a fat ribbed gourd lying in its vine
        const rr = 3 + t * 6;
        g.fillStyle = PAL.moss2;
        for (let i = -6; i < 6; i++) g.fillRect(Math.round(x + i * 1.6), Math.round(y - 1 + Math.abs(i % 3)), 2, 1);
        Art.ell(g, x, y - rr * 0.55, rr, rr * 0.8, U.shade(def.color, -0.25));
        Art.ell(g, x, y - rr * 0.6, rr * 0.82, rr * 0.7, def.color);
        g.fillStyle = U.shade(def.color, -0.4);
        for (const d of [-0.5, 0, 0.5]) g.fillRect(Math.round(x + d * rr), Math.round(y - rr * 1.2), 1, Math.round(rr * 1.2));
        g.fillStyle = PAL.moss1; g.fillRect(Math.round(x - 1), Math.round(y - rr * 1.45), 2, Math.round(rr * 0.35));
        break;
      }
      case 'mandrake': {                       // a face in the dirt, mouth open
        const rr = 3 + t * 3;
        Art.ell(g, x, y - rr * 0.4, rr, rr * 0.8, def.color);
        Art.ell(g, x, y - rr * 0.5, rr * 0.7, rr * 0.6, U.shade(def.color, 0.2));
        g.fillStyle = '#2a1a18';
        g.fillRect(Math.round(x - rr * 0.4), Math.round(y - rr * 0.7), 1, 1);
        g.fillRect(Math.round(x + rr * 0.3), Math.round(y - rr * 0.7), 1, 1);
        const yawn = p >= 1 ? 2 + Math.round(Math.sin(time * 6) + 1) : 1;
        g.fillRect(Math.round(x - 1), Math.round(y - rr * 0.25), 2, yawn);
        break;
      }
      case 'moonbell': {                       // pale bells that only open after dark
        const open = typeof Sky !== 'undefined' && Sky.isNight() ? 1 : 0.4;
        for (let i = 0; i < 3; i++) {
          const bx = tipX - 3 + i * 3, by = tipY + i % 2;
          Art.ell(g, bx, by, 2 * open + 0.6, 2.6, def.color);
          g.fillStyle = PAL.cyan4; g.fillRect(Math.round(bx), Math.round(by + 2), 1, 1);
        }
        break;
      }
      case 'emberleaf':                        // leaves with a coal in them
        for (let i = 0; i < 4; i++) {
          const a = -2.3 + i * 0.6;
          Art.ell(g, tipX + Math.cos(a) * 4, tipY + Math.sin(a) * 3, 3, 1.8, def.color);
        }
        g.fillStyle = `rgba(245,205,92,${(0.5 + 0.5 * Math.sin(time * 5 + x)).toFixed(2)})`;
        g.fillRect(Math.round(tipX - 1), Math.round(tipY - 1), 2, 2);
        break;
      case 'snapjaw': {                        // it bites
        const bite = p >= 1 ? Math.max(0, Math.sin(time * 2.2 + x)) * 3 : 0.6;
        Art.ell(g, tipX, tipY + 1, 3.4, 2.2, U.shade(def.color, -0.25));
        Art.ell(g, tipX, tipY - bite, 3.4, 2.2, def.color);
        g.fillStyle = PAL.cream;
        for (let i = -2; i <= 2; i++) g.fillRect(Math.round(tipX + i * 1.4), Math.round(tipY - bite + 1), 1, 1);
        break;
      }
      case 'whisperfern':                      // fronds that never stop moving
        for (let i = 0; i < 5; i++) {
          const a = -2.6 + i * 0.55 + Math.sin(time * 1.6 + i) * 0.14;
          for (let k = 2; k < 5 + t * 6; k++) {
            g.fillStyle = k % 2 ? def.color : PAL.moss2;
            g.fillRect(Math.round(tipX + Math.cos(a) * k), Math.round(tipY + Math.sin(a) * k * 0.7), 1, 1);
          }
        }
        break;
      case 'dreamcap': {                       // a cap with spores drifting off it
        const rr = 3 + t * 3;
        g.fillStyle = PAL.parch1; g.fillRect(Math.round(x - 1), Math.round(y - 5 - t * 3), 2, 5 + t * 3);
        Art.ell(g, x, y - 5 - t * 3, rr, rr * 0.7, def.color);
        Art.ell(g, x - rr * 0.3, y - 6 - t * 3, rr * 0.4, rr * 0.3, U.shade(def.color, 0.28));
        for (let i = 0; i < 3; i++) {
          g.fillStyle = `rgba(230,214,255,${(0.2 + 0.3 * Math.sin(time * 2 + i)).toFixed(2)})`;
          g.fillRect(Math.round(x + Math.sin(time + i * 2) * 6), Math.round(y - 12 - t * 4 - ((time * 8 + i * 5) % 12)), 1, 1);
        }
        break;
      }
      case 'starthistle':                      // a burr full of light
        g.fillStyle = def.color;
        for (let i = 0; i < 8; i++) { const a = i * 0.78; g.fillRect(Math.round(tipX + Math.cos(a) * (3 + t * 2)), Math.round(tipY + Math.sin(a) * (3 + t * 2)), 1, 1); }
        Art.ell(g, tipX, tipY, 2 + t, 2 + t, PAL.div3);
        g.fillStyle = PAL.div5; g.fillRect(Math.round(tipX), Math.round(tipY), 1, 1);
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
  // The pedestal under the Great Stack: chunky courses of dressed stone with a
  // wombat carved into the front, so the thing you build on has some weight.
  P.plinth = (w) => cached('plinth' + w, Math.max(24, Math.round(w)), 64, (g) => {
    const W = Math.max(24, Math.round(w));
    for (let y = 0; y < 64; y += 10) {
      const inset = Math.min(7, Math.floor(y / 14));
      Art.rect(g, inset, y, W - inset * 2, 10, (y / 10) % 2 ? PAL.stone2 : PAL.stone1);
      Art.rect(g, inset, y, W - inset * 2, 2, PAL.stone3);
      Art.rect(g, inset, y + 8, W - inset * 2, 2, PAL.stone0);
      for (let x = inset + 8; x < W - inset - 6; x += 26) Art.rect(g, x + ((y / 10) % 2) * 13, y + 2, 2.4, 6, PAL.stone0);
    }
    Art.rect(g, 0, 0, W, 4, PAL.stone4);                       // the cap
    Art.rect(g, 0, 4, W, 2, PAL.stone0);
    Art.rect(g, 2, 60, W - 4, 4, PAL.stone3);                  // and the foot
    // the carving: a wombat's head, filled with the same dark as the joints
    const cx = W / 2, cy = 34, s = Math.min(1.15, W / 120);
    const D = PAL.stone0, L = PAL.stone3;
    Art.ell(g, cx, cy, 15 * s, 12 * s, D);
    Art.ell(g, cx - 11 * s, cy - 9 * s, 5 * s, 5 * s, D);      // ears
    Art.ell(g, cx + 11 * s, cy - 9 * s, 5 * s, 5 * s, D);
    Art.ell(g, cx, cy + 4 * s, 8 * s, 6 * s, L);               // snout
    Art.ell(g, cx, cy + 6 * s, 3.4 * s, 2.4 * s, D);           // nose
    Art.ell(g, cx - 6 * s, cy - 3 * s, 2.4 * s, 2.4 * s, L);   // eyes
    Art.ell(g, cx + 6 * s, cy - 3 * s, 2.4 * s, 2.4 * s, L);
    // and a row of little offering marks along the top course
    for (let i = 0; i < 6; i++) Art.rect(g, 6 + i * ((W - 12) / 6), 12, 3, 3, PAL.div2);
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
    Art.outline(c, '#000000', 1);
    const res = { canvas: c, anchors, topY, base };
    cache.set(key, res);
    return res;
  }


  // ---- furniture -----------------------------------------------------------
  // Twelve things you can buy in town and stand about the grove. Each is drawn
  // once into a cache at its own size, in blocks, with one black line round it.
  const WD = ['#2a1a0c', '#4d2f16', '#6b4423', '#8c5c30', '#a87642', '#c9a878'];
  const ST = ['#2a2630', '#43404c', '#5e5a68', '#7d7987', '#a09ba8'];
  function plank(g, x, y, w, h, c0) {
    Art.rect(g, x, y, w, h, WD[c0]);
    Art.rect(g, x, y, w, 2, WD[c0 + 1]);
    Art.rect(g, x, y + h - 2, w, 2, WD[Math.max(0, c0 - 1)]);
    for (let i = 4; i < w - 2; i += 7) Art.rect(g, x + i, y + 1, 1, h - 2, WD[Math.max(0, c0 - 1)]);
  }
  function stoneBlock(g, x, y, w, h, s = 2) {
    Art.rect(g, x, y, w, h, ST[s]);
    Art.rect(g, x, y, w, 2, ST[s + 1]);
    Art.rect(g, x, y + h - 2, w, 2, ST[Math.max(0, s - 1)]);
    for (let i = 5; i < w - 3; i += 9) Art.rect(g, x + i, y + 2, 1, h - 4, ST[Math.max(0, s - 1)]);
  }
  function flame(g, x, y, s, t) {
    const f = Math.sin(t * 8) > 0 ? 1 : 0;
    Art.rect(g, x, y - s * 3 - f, s, s * 3, '#7a2a08');
    Art.rect(g, x, y - s * 2 - f, s, s * 2, '#f2a01c');
    Art.rect(g, x, y - s - f, s, s, '#ffe98a');
  }
  // a buttoned, footed cushion: every ottoman in the empire starts here
  function velvet(g, w, h, L, foot) {
    Art.rect(g, 3, h - 4, 3, 4, foot); Art.rect(g, w - 6, h - 4, 3, 4, foot);
    Art.rect(g, 1, 3, w - 2, h - 7, L[0]);
    Art.rect(g, 2, 2, w - 4, h - 8, L[1]);
    Art.rect(g, 3, 2, w - 6, 5, L[2]);
    Art.rect(g, 4, 2, w - 8, 1, L[3]);
    for (let x = 6; x < w - 5; x += 6) { Art.rect(g, x, 4, 1, 1, L[0]); Art.rect(g, x + 3, 8, 1, 1, L[0]); }
    Art.rect(g, 1, h - 6, w - 2, 2, foot); Art.rect(g, 1, h - 6, w - 2, 1, '#fff0a0');
  }
  const FURN = {
    bench: (g, w, h) => {
      plank(g, 2, 4, w - 4, 7, 3);
      Art.rect(g, 6, 11, 7, h - 11, WD[2]); Art.rect(g, w - 13, 11, 7, h - 11, WD[2]);
      Art.rect(g, 6, 11, 2, h - 11, WD[3]); Art.rect(g, w - 13, 11, 2, h - 11, WD[3]);
    },
    table: (g, w, h) => {
      plank(g, 0, 3, w, 8, 4);
      Art.rect(g, 5, 11, 5, h - 11, WD[2]); Art.rect(g, w - 10, 11, 5, h - 11, WD[2]);
      Art.rect(g, 8, 16, w - 16, 3, WD[2]);
    },
    lantern: (g, w, h) => {
      Art.rect(g, w / 2 - 3, 14, 6, h - 16, WD[2]); Art.rect(g, w / 2 - 3, 14, 2, h - 16, WD[3]);
      Art.rect(g, 1, h - 5, w - 2, 5, ST[2]);
      Art.rect(g, 1, 2, w - 2, 14, '#1e1208');
      Art.rect(g, 3, 4, w - 6, 10, '#f2c936');
      Art.rect(g, 4, 5, w - 8, 4, '#ffe98a');
      Art.rect(g, w / 2 - 1, 0, 2, 3, ST[3]);
      Art.rect(g, 1, 2, w - 2, 2, '#a9750d');
    },
    barrel: (g, w, h) => {
      Art.rect(g, 1, 3, w - 2, h - 3, WD[2]);
      Art.rect(g, 3, 3, w - 6, h - 3, WD[3]);
      Art.rect(g, 4, 3, 3, h - 3, WD[4]);
      Art.rect(g, 1, 7, w - 2, 3, ST[2]); Art.rect(g, 1, h - 9, w - 2, 3, ST[2]);
      Art.rect(g, 1, 7, w - 2, 1, ST[3]); Art.rect(g, 1, h - 9, w - 2, 1, ST[3]);
      Art.rect(g, 3, 1, w - 6, 3, '#2f5a68');
      Art.rect(g, 4, 1, w - 8, 1, '#4fa6be');
    },
    trough2: (g, w, h) => {
      stoneBlock(g, 0, 2, w, h - 2, 2);
      Art.rect(g, 3, 4, w - 6, 6, '#173d4e');
      Art.rect(g, 4, 4, w - 8, 2, '#2f7f96');
      Art.rect(g, 6, 5, 4, 1, '#8fd4e4');
    },
    scare: (g, w, h) => {
      Art.rect(g, w / 2 - 2, 12, 4, h - 12, WD[2]);
      Art.rect(g, 0, 20, w, 3, WD[2]);
      Art.rect(g, w / 2 - 6, 1, 12, 12, '#c9a878');
      Art.rect(g, w / 2 - 6, 1, 12, 3, '#ddc39a');
      Art.rect(g, w / 2 - 4, 5, 2, 2, '#1e1208'); Art.rect(g, w / 2 + 2, 5, 2, 2, '#1e1208');
      Art.rect(g, w / 2 - 3, 9, 6, 1, '#1e1208');
      Art.rect(g, w / 2 - 7, 13, 14, 10, '#7a3a2a');
      Art.rect(g, w / 2 - 7, 13, 14, 2, '#a05040');
      for (let i = 0; i < 4; i++) Art.rect(g, 2 + i * 5, 22, 2, 5, '#c9a878');
    },
    hive: (g, w, h) => {
      Art.rect(g, 1, h - 6, w - 2, 6, WD[2]);
      for (let i = 0; i < 5; i++) {
        const iw = w - 4 - i * 2, ix = (w - iw) / 2;
        Art.rect(g, ix, h - 10 - i * 4, iw, 4, '#c9a45a');
        Art.rect(g, ix, h - 10 - i * 4, iw, 1, '#e0bf7a');
      }
      Art.rect(g, w / 2 - 2, h - 9, 4, 4, '#2a1a0c');
      Art.rect(g, 3, 3, 2, 2, '#f2c936'); Art.rect(g, w - 6, 7, 2, 2, '#f2c936');
    },
    arch: (g, w, h) => {
      Art.rect(g, 2, 10, 5, h - 10, WD[2]); Art.rect(g, w - 7, 10, 5, h - 10, WD[2]);
      for (let i = 0; i < 7; i++) {
        const t = i / 6, x = 2 + t * (w - 7), y = 10 - Math.sin(t * Math.PI) * 9;
        Art.rect(g, x, y, 6, 5, WD[2]);
      }
      const r = Art.rng(9);
      for (let i = 0; i < 26; i++) {
        const t = r(), x = 2 + t * (w - 6), y = 10 - Math.sin(t * Math.PI) * 9 + r() * (h - 14);
        Art.rect(g, x, y, 3, 3, r() < 0.34 ? '#4d7430' : '#74a449');
        if (r() < 0.3) Art.rect(g, x, y, 2, 2, r() < 0.5 ? '#c9525a' : '#f0dcb0');
      }
    },
    well: (g, w, h) => {
      stoneBlock(g, 0, h - 20, w, 20, 2);
      Art.rect(g, 4, h - 18, w - 8, 6, '#0c1418');
      Art.rect(g, 6, h - 17, w - 12, 3, '#173d4e');
      Art.rect(g, 3, h - 34, 4, 16, WD[2]); Art.rect(g, w - 7, h - 34, 4, 16, WD[2]);
      for (let i = 0; i < 6; i++) Art.rect(g, 1 + i * 3, h - 40 + Math.abs(i - 2.5) * 2, w - 2 - i * 6, 4, '#5a3a1c');
      Art.rect(g, 0, h - 42, w, 5, '#3d2714');
      Art.rect(g, 0, h - 42, w, 2, '#6b4423');
      Art.rect(g, w / 2 - 1, h - 36, 2, 10, '#8a7752');
      Art.rect(g, w / 2 - 4, h - 27, 8, 6, WD[2]);
    },
    statue: (g, w, h) => {
      stoneBlock(g, 2, h - 12, w - 4, 12, 1);
      Art.rect(g, 5, h - 34, w - 10, 24, ST[2]);
      Art.rect(g, 5, h - 34, w - 10, 3, ST[3]);
      Art.rect(g, 7, h - 44, w - 14, 12, ST[2]);
      Art.rect(g, 7, h - 44, w - 14, 3, ST[3]);
      Art.rect(g, 4, h - 44, 5, 5, ST[2]); Art.rect(g, w - 9, h - 44, 5, 5, ST[2]);
      Art.rect(g, 10, h - 39, 3, 3, '#0c0a10'); Art.rect(g, w - 13, h - 39, 3, 3, '#0c0a10');
      Art.rect(g, w / 2 - 3, h - 35, 6, 3, '#0c0a10');
      Art.rect(g, 6, h - 20, 4, 3, '#4d7430');
    },
    firepit: (g, w, h) => {
      for (let i = 0; i < 7; i++) {
        const sx = 1 + i * ((w - 8) / 6);
        Art.rect(g, sx, h - 9 - (i % 2) * 2, 7, 9, ST[1 + (i % 3)]);
        Art.rect(g, sx, h - 9 - (i % 2) * 2, 7, 2, ST[2 + (i % 2)]);
      }
      Art.rect(g, 8, h - 13, w - 16, 5, '#2a1a12');
      Art.rect(g, 10, h - 16, 5, 4, WD[1]); Art.rect(g, w - 15, h - 15, 5, 3, WD[1]);
      flame(g, w / 2 - 4, h - 12, 3, 0.1); flame(g, w / 2 + 1, h - 13, 3, 0.4);
    },
    shrine2: (g, w, h) => {
      Art.rect(g, w / 2 - 3, 20, 6, h - 20, WD[1]);
      Art.rect(g, 1, 6, w - 2, 16, '#2a1a0c');
      Art.rect(g, 3, 8, w - 6, 12, '#150c14');
      for (let i = 0; i < 5; i++) Art.rect(g, i * 2, 2 + Math.abs(i - 2) * 2, w - i * 4, 5, '#3d2714');
      Art.rect(g, 7, 11, 3, 3, '#c42a1e'); Art.rect(g, w - 10, 11, 3, 3, '#c42a1e');
      Art.rect(g, w / 2 - 2, 16, 4, 2, '#e8dcc0');
      Art.rect(g, 2, h - 6, w - 4, 3, ST[1]);
    },
    // ---- the Ottoman Empire's stock ------------------------------------------
    ottoman: (g, w, h) => velvet(g, w, h, ['#6a0e1c', '#a8182c', '#d8384a', '#ff7a86'], '#e8b020'),
    lostottoman: (g, w, h) => {
      velvet(g, w, h, ['#8a7a3a', '#c8b660', '#e2d27a', '#f4e8a4'], '#8a8478');
      for (let i = 0; i < 18; i++) Art.rect(g, 3 + (i * 7) % (w - 6), 4 + (i * 5) % 8, 1, 1, i % 2 ? '#a89850' : '#fff4b8');   // carpet pile
      Art.rect(g, w / 2 - 6, 2, 12, 1, 'rgba(255,255,220,0.8)');
    },
    pouf: (g, w, h) => {
      Art.ell(g, w / 2, h - 7, w / 2, 7, '#0e5a5a');
      Art.ell(g, w / 2, h - 8, w / 2 - 1, 6, '#18908a');
      for (let x = 2; x < w - 2; x += 3) Art.rect(g, x, h - 13, 1, 10, '#0e6a66');     // the knit
      Art.ell(g, w / 2 - 3, h - 11, 5, 2, '#5cd0c0');
      Art.rect(g, w / 2 - 1, h - 14, 2, 2, '#f4c030');
    },
    armchair: (g, w, h) => {
      const L = ['#0c3a22', '#16603a', '#2a8a52', '#58c07a'];
      Art.rect(g, 4, 0, w - 8, h - 12, L[0]); Art.rect(g, 5, 1, w - 10, h - 14, L[1]);   // the back
      Art.ell(g, 6, 6, 6, 7, L[0]); Art.ell(g, w - 6, 6, 6, 7, L[0]);                    // wings
      Art.ell(g, 6, 6, 5, 6, L[2]); Art.ell(g, w - 6, 6, 5, 6, L[1]);
      for (let y = 4; y < h - 14; y += 5) for (let x = 9; x < w - 9; x += 6) Art.rect(g, x, y, 2, 2, L[0]);   // buttons
      Art.rect(g, 0, h - 16, 8, 10, L[1]); Art.rect(g, w - 8, h - 16, 8, 10, L[1]);        // arms
      Art.rect(g, 0, h - 16, 8, 2, L[3]); Art.rect(g, w - 8, h - 16, 8, 2, L[2]);
      Art.rect(g, 6, h - 12, w - 12, 6, L[2]); Art.rect(g, 6, h - 12, w - 12, 2, L[3]);    // seat
      Art.rect(g, 3, h - 6, 3, 6, '#5a2a10'); Art.rect(g, w - 6, h - 6, 3, 6, '#5a2a10');
    },
    sofa: (g, w, h) => {
      const L = ['#3a0a0a', '#6e1414', '#9c2420', '#d0503c'];
      Art.rect(g, 4, 2, w - 8, h - 12, L[0]); Art.rect(g, 5, 3, w - 10, h - 14, L[1]);
      for (let y = 5; y < h - 12; y += 4) for (let x = 8 + (y % 8 ? 2 : 0); x < w - 8; x += 5) Art.rect(g, x, y, 1, 1, L[0]);
      Art.rect(g, 5, 3, w - 10, 1, L[3]);
      Art.ell(g, 5, h - 14, 6, 6, L[0]); Art.ell(g, w - 5, h - 14, 6, 6, L[0]);           // rolled arms
      Art.ell(g, 5, h - 14, 5, 5, L[2]); Art.ell(g, w - 5, h - 14, 5, 5, L[1]);
      Art.rect(g, 0, h - 14, 10, 8, L[1]); Art.rect(g, w - 10, h - 14, 10, 8, L[1]);
      Art.rect(g, 8, h - 11, w - 16, 5, L[2]); Art.rect(g, 8, h - 11, w - 16, 1, L[3]);
      Art.rect(g, w / 2, h - 11, 1, 5, L[0]);
      for (const x of [3, w / 2 - 1, w - 5]) Art.rect(g, x, h - 6, 3, 6, '#e0a020');
    },
    rug: (g, w, h) => {
      const C = ['#7a1420', '#c02a2a', '#f0a030', '#1c3a7a', '#f4e0b0'];
      Art.rect(g, 0, 2, w, h - 2, C[0]);
      Art.rect(g, 2, 3, w - 4, h - 4, C[1]);
      Art.rect(g, 4, 4, w - 8, h - 6, C[3]);
      Art.rect(g, 8, 5, w - 16, h - 8, C[1]);
      for (let x = 10; x < w - 10; x += 6) { Art.rect(g, x, 6, 3, 1, C[2]); Art.rect(g, x + 1, h - 5, 2, 1, C[4]); }
      Art.rect(g, w / 2 - 4, h / 2, 8, 2, C[2]); Art.rect(g, w / 2 - 1, h / 2 - 1, 2, 4, C[4]);
      for (let y = 2; y < h; y += 2) { Art.rect(g, 0, y, 1, 1, C[4]); Art.rect(g, w - 1, y, 1, 1, C[4]); }   // tassels
    },
    lamp: (g, w, h) => {
      Art.rect(g, w / 2 - 1, 16, 2, h - 20, '#c89020'); Art.rect(g, w / 2 - 1, 16, 1, h - 20, '#ffe070');
      Art.ell(g, w / 2, h - 3, 6, 3, '#8a5a10'); Art.ell(g, w / 2, h - 4, 5, 2, '#e0a020');
      Art.poly(g, [[3, 16], [w - 3, 16], [w - 5, 2], [5, 2]], '#b82a4a');
      Art.poly(g, [[4, 15], [w / 2, 15], [w / 2 - 1, 3], [6, 3]], '#e8506a');
      for (let x = 3; x < w - 3; x += 2) Art.rect(g, x, 16, 1, 3, '#f4c030');           // the fringe
      Art.rect(g, 5, 2, w - 10, 1, '#ff8aa0');
    },
    shelf: (g, w, h) => {
      Art.rect(g, 0, 0, w, h, '#4a2410'); Art.rect(g, 2, 2, w - 4, h - 4, '#2a1408');
      const BK = ['#c02a2a', '#1c5aa8', '#e0a020', '#2a8a4a', '#8a3aa8', '#e86a2a', '#f0e0c0'];
      for (let row = 0; row < 3; row++) {
        const y = 3 + row * 14;
        Art.rect(g, 2, y + 11, w - 4, 3, '#7a4420');
        let x = 3, i = row * 3;
        while (x < w - 5) { const bw = 2 + (i * 7) % 3, bh = 8 + (i * 5) % 3; Art.rect(g, x, y + 11 - bh, bw, bh, BK[i % BK.length]); Art.rect(g, x, y + 11 - bh, bw, 1, 'rgba(255,255,255,0.35)'); x += bw + 1; i++; }
      }
      Art.rect(g, 0, 0, w, 2, '#8a5028');
    },
    hammock: (g, w, h) => {
      for (const x of [2, w - 7]) { Art.rect(g, x, 2, 5, h - 2, '#6a3a18'); Art.rect(g, x, 2, 2, h - 2, '#a86a38'); Art.rect(g, x - 1, 1, 7, 2, '#4a2410'); }
      // the net: a fat sagging band of striped cloth with a fringe under it
      for (let i = 0; i <= 26; i++) {
        const u = i / 26, x = 7 + u * (w - 16), y = 7 + Math.sin(u * Math.PI) * 13;
        const c = Math.floor(i / 3) % 2 ? '#f4e0a0' : '#e8503a';
        Art.rect(g, x, y, 2, 7, c); Art.rect(g, x, y, 2, 1, '#fff4d0'); Art.rect(g, x, y + 6, 2, 1, '#8a3a1a');
        if (i % 2 === 0) Art.rect(g, x, y + 7, 1, 2, '#c8a060');
      }
      Art.limb(g, 5, 4, 8, 8, 1, 1, '#c8a060'); Art.limb(g, w - 5, 4, w - 8, 8, 1, 1, '#c8a060');
    },
    deck: (g, w, h) => {
      Art.limb(g, 3, h - 1, 15, 2, 2.6, 2.6, '#8a5a28');              // the back rail
      Art.limb(g, w - 3, h - 1, 11, h - 11, 2.6, 2.6, '#6a4018');     // the front leg
      Art.limb(g, 3, h - 10, w - 2, h - 10, 2, 2, '#a86a38');           // the seat rail
      for (let i = 0; i < 6; i++) {                                     // striped canvas, sagging between them
        const c = i % 2 ? '#f4f0e0' : '#2a7ae0';
        Art.limb(g, 11 + i * 1.3, 3 + i * 0.6, w - 7 + i * 0.5, h - 9 + i * 0.4, 1.8, 1.8, c);
      }
      Art.rect(g, 2, h - 2, w - 4, 2, '#5a3a18');
    },
    helm: (g, w, h) => {
      const cx = w / 2, cy = 16;
      Art.rect(g, cx - 3, cy, 6, h - cy, '#5a2a10'); Art.rect(g, cx - 8, h - 4, 16, 4, '#4a2008');
      for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; Art.limb(g, cx, cy, cx + Math.cos(a) * 16, cy + Math.sin(a) * 16, 2, 2, '#a86a30'); Art.ell(g, cx + Math.cos(a) * 16, cy + Math.sin(a) * 16, 2, 2, '#c88a40'); }
      Art.ell(g, cx, cy, 11, 11, '#7a4418'); Art.ell(g, cx, cy, 9, 9, 'rgba(0,0,0,0)');
      g.save(); g.globalCompositeOperation = 'destination-out'; Art.ell(g, cx, cy, 8.5, 8.5, '#000'); g.restore();
      for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; Art.limb(g, cx, cy, cx + Math.cos(a) * 9, cy + Math.sin(a) * 9, 1.6, 1.6, '#a86a30'); }
      Art.ell(g, cx, cy, 3, 3, '#e8b020'); Art.rect(g, cx - 1, cy - 1, 1, 1, '#fff0a0');
    },
    anchor: (g, w, h) => {
      const cx = w / 2, IR = '#3a3a44', IL = '#8a8a98', RU = '#a8501c';
      Art.ell(g, cx, 5, 5, 5, IR); g.save(); g.globalCompositeOperation = 'destination-out'; Art.ell(g, cx, 5, 2.5, 2.5, '#000'); g.restore();
      Art.rect(g, cx - 2, 9, 4, h - 14, IR); Art.rect(g, cx - 2, 9, 1, h - 14, IL);
      Art.rect(g, cx - 10, 13, 20, 3, IR); Art.rect(g, cx - 10, 13, 20, 1, IL);
      for (let i = 0; i <= 12; i++) { const u = i / 12, a = Math.PI * (0.05 + u * 0.9); Art.rect(g, cx + Math.cos(a) * 13 - 2, h - 18 + Math.sin(a) * 14 - 2, 4, 4, IR); }
      Art.poly(g, [[cx - 15, h - 18], [cx - 10, h - 20], [cx - 12, h - 12]], IR); Art.poly(g, [[cx + 15, h - 18], [cx + 10, h - 20], [cx + 12, h - 12]], IR);
      for (let i = 0; i < 9; i++) Art.rect(g, cx - 12 + (i * 5) % 24, 10 + (i * 7) % (h - 12), 2, 1, RU);   // rust
    },
  };
  // A piece of furniture, drawn at the size the catalogue says it is.
  function furniture(key) {
    const def = FURN_BY_KEY[key];
    const fn = (typeof FurnArt !== 'undefined' && FurnArt.has(key)) ? FurnArt.A[key] : FURN[key];
    if (!def || !fn) return null;
    return cached('fn:' + key, def.w, def.h, (g, w, h) => fn(g, w, h));
  }
  function drawFurniture(g, key, x, y, scale = 1) {
    const c = furniture(key);
    if (!c) return;
    g.drawImage(c, Math.round(x - (c.width * scale) / 2), Math.round(y - c.height * scale), Math.round(c.width * scale), Math.round(c.height * scale));
  }

  return { P, get: (n, v) => P[n](v), drawCrop, drawTree, drawFruit, buildLifeTree, furniture, drawFurniture, clear: () => cache.clear() };
})();
