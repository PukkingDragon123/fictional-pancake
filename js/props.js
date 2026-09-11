// ---- Scenery: forest, ruins, altar, buildings ----------------------------
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

  // ---- trees --------------------------------------------------------------
  // kind: 'dead' | 'oak' | 'pine' | 'birch' | 'gnarl'.  shade darkens the whole
  // tree so the same generator can fill four depth layers of forest.
  function bark(g, x0, y0, x1, y1, w0, w1, c0, c1, c2) {
    Art.limb(g, x0, y0, x1, y1, w0, w1, c1);
    Art.limb(g, x0 - w0 * 0.22, y0, x1 - w1 * 0.2, y1, w0 * 0.34, w1 * 0.3, c2);
    Art.limb(g, x0 + w0 * 0.28, y0, x1 + w1 * 0.24, y1, w0 * 0.22, w1 * 0.2, c0);
  }
  function canopy(g, x, y, rx, ry, cols, rnd, dense) {
    const n = dense ? 9 : 6;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + rnd() * 0.4;
      const d = 0.45 + rnd() * 0.55;
      const cx = x + Math.cos(a) * rx * d, cy = y + Math.sin(a) * ry * d;
      Art.ell(g, cx, cy, rx * (0.42 + rnd() * 0.26), ry * (0.45 + rnd() * 0.28), cols[0]);
    }
    Art.ell(g, x, y, rx * 0.8, ry * 0.78, cols[1]);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU - 0.7, d = 0.3 + rnd() * 0.4;
      Art.ell(g, x + Math.cos(a) * rx * d, y + Math.sin(a) * ry * d - ry * 0.2, rx * 0.3, ry * 0.3, cols[2]);
    }
    Art.speckle(g, x, y - ry * 0.3, rx * 0.85, ry * 0.6, cols[3], Math.round(rx * ry * 0.1), Math.floor(x * 7 + y));
    Art.speckle(g, x, y + ry * 0.45, rx * 0.9, ry * 0.4, cols[0], Math.round(rx * 0.9), Math.floor(y * 11 + x));
  }
  P.tree = (spec) => {
    const [kind, v, shade] = String(spec).split('|');
    const sh = +shade || 0;
    return cached(`tree:${kind}:${v}:${sh}`, 96, 150, (g) => {
      const rnd = Art.rng((+v + 1) * 977 + kind.length * 31);
      const S = (c) => (sh ? U.mix(c, '#0f1218', sh) : c);
      const cx = 48, base = 148;
      const B0 = S(PAL.bark0), B1 = S(PAL.bark1), B2 = S(PAL.bark2), B3 = S(PAL.bark3);
      const lean = (rnd() - 0.5) * 10;
      if (kind === 'pine') {
        bark(g, cx, base, cx + lean * 0.4, 34, 11, 5, B3, B1, B0);
        const cols = [S('#1a2e18'), S('#24421f'), S('#2f5527'), S('#3d6b31')];
        for (let i = 0; i < 7; i++) {
          const y = 124 - i * 14, w = 40 - i * 4.6;
          for (let k = 0; k < 3; k++) {
            const yy = y - k * 3.4, ww = w - k * 5;
            Art.poly(g, [[cx - ww, yy], [cx + ww, yy], [cx + ww * 0.45, yy - 12], [cx - ww * 0.45, yy - 12]], cols[k % 3]);
          }
          Art.speckle(g, cx, y - 5, w * 0.8, 5, cols[3], Math.round(w * 0.5), i + +v);
        }
        Art.poly(g, [[cx - 7, 40], [cx + 7, 40], [cx, 18]], cols[1]);
        Art.poly(g, [[cx - 4, 34], [cx + 4, 34], [cx, 20]], cols[2]);
      } else if (kind === 'dead') {
        bark(g, cx, base, cx + lean, 48, 13, 6, B3, B1, B0);
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
      } else if (kind === 'birch') {
        bark(g, cx, base, cx + lean * 0.5, 52, 9, 5, S('#e8e2d4'), S('#cfc6b4'), S('#a89c88'));
        for (let i = 0; i < 9; i++) Art.rect(g, cx - 5 + rnd() * 9, 60 + i * 9, 4 + rnd() * 3, 1.6, S('#3a352c'));
        for (let i = 0; i < 4; i++) {
          const side = i % 2 ? 1 : -1, y0 = 96 - i * 14;
          Art.limb(g, cx, y0, cx + side * (14 + i * 3), y0 - 16, 3, 1.2, S('#cfc6b4'));
        }
        canopy(g, cx + lean * 0.5, 40, 34, 24, [S('#3c5c22'), S('#4e7430'), S('#66913f'), S('#8cb95a')], rnd, 1);
      } else if (kind === 'gnarl') {
        bark(g, cx, base, cx + lean * 1.6, 66, 16, 8, B3, B1, B0);
        for (let i = -2; i <= 2; i++) if (i) Art.limb(g, cx + i * 4, base - 8, cx + i * 15, base + 2, 5, 1.6, B1);
        for (let i = 0; i < 5; i++) {
          const side = i % 2 ? 1 : -1, y0 = 110 - i * 13;
          const x1 = cx + side * (20 + i * 5), y1 = y0 - 14;
          Art.limb(g, cx + side * 5, y0, x1, y1, 6 - i * 0.6, 2, B1);
          canopy(g, x1 + side * 6, y1 - 8, 20, 14, [S('#22361a'), S('#2e4a22'), S('#3d6130'), S('#527c3c')], rnd, 0);
        }
        canopy(g, cx + lean, 48, 38, 26, [S('#22361a'), S('#2e4a22'), S('#3d6130'), S('#527c3c')], rnd, 1);
      } else {
        bark(g, cx, base, cx + lean, 60, 13, 7, B3, B1, B0);
        for (let i = -2; i <= 2; i++) if (i) Art.limb(g, cx + i * 3, base - 6, cx + i * 13, base + 2, 4.4, 1.5, B1);
        for (let i = 0; i < 4; i++) {
          const side = i % 2 ? 1 : -1, y0 = 104 - i * 15;
          Art.limb(g, cx + side * 4, y0, cx + side * (18 + i * 4), y0 - 18, 4.6 - i * 0.5, 1.6, B1);
        }
        canopy(g, cx + lean, 44, 40, 28, [S('#2b4a20'), S('#3a6129'), S('#4d7f36'), S('#6da348')], rnd, 1);
      }
      Art.outline(g.canvas, sh > 0.5 ? '#080a0e' : PAL.ink, 0.7);
    });
  };
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
    Art.outline(g.canvas, PAL.ink, 0.65);
  });
  P.stump = (v = 0) => cached('stump' + v, 34, 22, (g) => {
    Art.ell(g, 17, 19, 13, 5, PAL.bark0);
    Art.rect(g, 5, 8, 24, 11, PAL.bark1);
    Art.rect(g, 5, 8, 5, 11, PAL.bark2);
    Art.ell(g, 17, 8, 12, 4.6, PAL.bark3);
    Art.ell(g, 17, 8, 8, 3, '#8a6a48');
    Art.ell(g, 17, 8, 4, 1.6, PAL.bark2);
    if (+v % 2) { Art.ell(g, 9, 6, 5, 2.4, PAL.moss2); Art.ell(g, 24, 7, 4, 2, PAL.moss3); }
    Art.outline(g.canvas, PAL.ink, 0.65);
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
    Art.outline(g.canvas, PAL.ink, 0.5);
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
    Art.outline(g.canvas, PAL.ink, 0.5);
  });
  P.rock = (v = 0) => cached('rock' + v, 26, 18, (g) => {
    const rnd = Art.rng(+v * 331 + 3);
    Art.ell(g, 13, 14, 11 - +v, 6, PAL.stone2);
    Art.ell(g, 11, 12, 8 - +v, 4.4, PAL.stone3);
    Art.ell(g, 9, 10.5, 4, 2.2, PAL.stone4);
    for (let i = 0; i < 5; i++) Art.rect(g, 5 + rnd() * 14, 11 + rnd() * 5, 2, 1, PAL.stone1);
    Art.ell(g, 17, 10, 4, 2, PAL.moss2);
    Art.outline(g.canvas, PAL.ink, 0.6);
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
    Art.outline(g.canvas, PAL.ink, 0.65);
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
    Art.outline(g.canvas, PAL.ink, 0.75);
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
    Art.outline(g.canvas, PAL.ink, 0.6);
  });

  // ---- buildings ----------------------------------------------------------
  P.truck = () => cached('truck', 96, 48, (g) => {
    Art.rect(g, 6, 16, 54, 20, '#4a6f8a');       // bed
    Art.rect(g, 6, 16, 54, 3, '#6f97b0');
    for (let x = 10; x < 58; x += 8) Art.rect(g, x, 20, 6, 14, '#3c5c74');
    Art.rect(g, 58, 10, 30, 26, '#5a7f9a');      // cab
    Art.rect(g, 58, 10, 30, 3, '#7fa8c0');
    Art.rect(g, 62, 14, 20, 12, '#a8d0e0');      // window
    Art.rect(g, 62, 14, 20, 4, '#c8e8f0');
    Art.rect(g, 4, 30, 86, 8, '#33495c');
    Art.ell(g, 20, 40, 8, 8, PAL.ink);
    Art.ell(g, 20, 40, 4.4, 4.4, PAL.stone3);
    Art.ell(g, 72, 40, 8, 8, PAL.ink);
    Art.ell(g, 72, 40, 4.4, 4.4, PAL.stone3);
    Art.rect(g, 88, 24, 5, 8, PAL.gold3);
    Art.outline(g.canvas, PAL.ink, 0.7);
  });
  P.crate = () => cached('crate', 22, 20, (g) => {
    Art.rect(g, 1, 3, 20, 16, PAL.bark2);
    Art.rect(g, 1, 3, 20, 2.4, PAL.bark3);
    Art.rect(g, 1, 16.6, 20, 2.4, PAL.bark1);
    Art.line(g, 2, 18, 20, 4, PAL.bark3, 1); Art.line(g, 20, 18, 2, 4, PAL.bark3, 1);
    Art.outline(g.canvas, PAL.ink, 0.6);
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
    Art.outline(g.canvas, PAL.ink, 0.65);
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
