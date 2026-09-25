// ---- How the farm looks ------------------------------------------------------
// One small palette, one pixel size, one soft warm outline round everything.
// Every sprite in the game is drawn here, once, into a little cached canvas.
const P = {
  line: '#3b2a22',                       // the outline: warm, never black
  grass0: '#6cb84e', grass1: '#7cc65a', grass2: '#8dd466', grass3: '#a3e07a', grassD: '#58a043',
  soil0: '#8c5e3c', soil1: '#a36f48', soil2: '#b98256', soilW0: '#6a4430', soilW1: '#7d5238', soilW2: '#8e6042',
  cliff0: '#7a5234', cliff1: '#9a6a44', cliff2: '#b2805a',
  water0: '#4fb0d0', water1: '#6ccbe4', water2: '#9fe2f0', foam: '#e6fbff',
  cream: '#fff7e8', paper: '#f7ead0', paper2: '#ecd9b6', wood0: '#7a4e2c', wood1: '#a06c3e', wood2: '#c8905a', wood3: '#e0b07a',
  ink: '#5a3d2b', inkL: '#8a6a50',
  coral: '#ff8a7a', coralD: '#e0645a', mint: '#7fd8b0', mintD: '#4fb58a', sun: '#ffd66b', sunD: '#e8a93c',
  pink: '#f7a8c4', pinkD: '#e27fa2', sky: '#bfe8ff', leaf0: '#4f9a3c', leaf1: '#67b449', leaf2: '#86cc5c',
  bark0: '#7a5234', bark1: '#96683f',
};
const PELTS = {
  brown: { base: '#b98a66', dark: '#96694a', light: '#d9b391', nose: '#5a3b2a' },
  grey:  { base: '#a8a09a', dark: '#857d78', light: '#cdc6bf', nose: '#4e4642' },
  sandy: { base: '#d8b489', dark: '#b48f64', light: '#eed4ae', nose: '#6a4a30' },
  cream: { base: '#e8d8bf', dark: '#c9b597', light: '#f7ecd9', nose: '#7a5a44' },
  choc:  { base: '#8a6246', dark: '#6c4a33', light: '#b08a68', nose: '#3e2a1e' },
};

const Look = (() => {
  const T = 16;                            // a tile
  const LH = 8;                            // one step of height
  const cache = new Map();

  function cv(w, h) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    return { c, g };
  }
  function R(g, x, y, w, h, col) { g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
  function rng(seed) {
    let a = seed >>> 0;
    return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  const hash = (x, y) => { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  // a stepped ellipse, row by row
  function blob(g, cx, cy, rx, ry, col) {
    g.fillStyle = col;
    for (let y = -ry; y <= ry; y++) {
      const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y / (ry + 0.5)) * (y / (ry + 0.5)))));
      if (w > 0) g.fillRect(Math.round(cx - w), Math.round(cy + y), w * 2, 1);
    }
  }
  // one pixel of warm outline round anything opaque
  function outline(c, col = P.line) {
    const g = c.getContext('2d'), w = c.width, h = c.height;
    const d = g.getImageData(0, 0, w, h).data;
    const on = (x, y) => x >= 0 && y >= 0 && x < w && y < h && d[(y * w + x) * 4 + 3] > 20;
    g.fillStyle = col;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (on(x, y)) continue;
      if (on(x - 1, y) || on(x + 1, y) || on(x, y - 1) || on(x, y + 1)) g.fillRect(x, y, 1, 1);
    }
    return c;
  }
  function cached(key, w, h, draw, line = true) {
    let c = cache.get(key);
    if (c) return c;
    // outlined sprites get a pixel of room all round so the line never clips
    const pad = line ? 1 : 0;
    const o = cv(w + pad * 2, h + pad * 2);
    o.g.translate(pad, pad);
    draw(o.g, w, h);
    o.g.setTransform(1, 0, 0, 1, 0, 0);
    if (line) outline(o.c);
    o.c.pad = pad;
    cache.set(key, o.c);
    return o.c;
  }
  function flip(c) {
    const key = c; let f = flipped.get(key);
    if (f) return f;
    const o = cv(c.width, c.height);
    o.g.translate(c.width, 0); o.g.scale(-1, 1); o.g.drawImage(c, 0, 0);
    o.c.pad = c.pad || 0;
    flipped.set(key, o.c);
    return o.c;
  }
  const flipped = new Map();

  // ---- ground ----------------------------------------------------------------
  // Grass is eight variants picked by a hash of the tile, so the lawn never
  // shows a pattern. Each has a few tufts and, now and then, a flower.
  function grassTile(v) {
    return cached('g' + v, T, T, (g) => {
      const r = rng(v * 7919 + 13);
      R(g, 0, 0, T, T, P.grass1);
      for (let i = 0; i < 7; i++) R(g, Math.floor(r() * T), Math.floor(r() * T), 1, 1, r() < 0.5 ? P.grass0 : P.grass2);
      for (let i = 0; i < 3; i++) {                     // tufts
        const x = 1 + Math.floor(r() * 13), y = 3 + Math.floor(r() * 11);
        R(g, x, y, 1, 2, P.grass0); R(g, x + 2, y + 1, 1, 1, P.grass0); R(g, x + 1, y - 1, 1, 2, P.grass3);
      }
      if (v === 5) { R(g, 6, 6, 3, 3, P.pink); R(g, 7, 7, 1, 1, P.sun); }
      if (v === 6) { R(g, 9, 9, 3, 3, P.cream); R(g, 10, 10, 1, 1, P.sun); }
      if (v === 7) { R(g, 4, 10, 3, 3, P.sun); R(g, 5, 11, 1, 1, P.sunD); }
    }, false);
  }
  function soilTile(wet, v) {
    return cached('s' + (wet ? 1 : 0) + v, T, T, (g) => {
      const r = rng(v * 131 + (wet ? 7 : 3));
      const [a, b, c] = wet ? [P.soilW0, P.soilW1, P.soilW2] : [P.soil0, P.soil1, P.soil2];
      R(g, 0, 0, T, T, b);
      for (let y = 2; y < T; y += 4) { R(g, 0, y, T, 1, a); R(g, 0, y + 1, T, 1, c); }   // furrows
      for (let i = 0; i < 5; i++) R(g, Math.floor(r() * T), Math.floor(r() * T), 1, 1, a);
      if (wet) for (let i = 0; i < 2; i++) R(g, 1 + Math.floor(r() * 13), 3 + 4 * Math.floor(r() * 3), 2, 1, '#a07656');
    }, false);
  }

  // ---- crops -----------------------------------------------------------------
  function line(g, x0, y0, x1, y1, col) {
    g.fillStyle = col;
    let dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1, dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1, e = dx + dy;
    for (let n = 0; n < 64; n++) {
      g.fillRect(x0, y0, 1, 1);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * e;
      if (e2 >= dy) { e += dy; x0 += sx; }
      if (e2 <= dx) { e += dx; y0 += sy; }
    }
  }
  const mound = (g) => { R(g, 4, 13, 8, 2, P.soil0); R(g, 5, 12, 6, 1, P.soil0); R(g, 6, 12, 4, 1, P.soil2); };
  const sprout = (g, h) => { R(g, 8, 12 - h, 1, h, P.leaf1); R(g, 6, 11 - h, 2, 2, P.leaf2); R(g, 9, 11 - h, 2, 2, P.leaf1); R(g, 6, 11 - h, 1, 1, '#c8f0a0'); };
  const CROP_ART = {
    carrot: (g, s) => {
      if (s === 0) { mound(g); R(g, 8, 11, 1, 1, P.leaf2); return; }
      if (s === 1) { mound(g); sprout(g, 3); return; }
      const top = s === 2 ? 5 : 1, side = s === 2 ? 4 : 2;
      line(g, 8, 12, side, top + 2, P.leaf0); line(g, 8, 12, 16 - side, top + 2, P.leaf0); line(g, 8, 12, 8, top, P.leaf1);
      for (const [x, y] of [[side + 1, top + 2], [side + 2, top + 4], [15 - side, top + 2], [14 - side, top + 4], [7, top + 1], [9, top + 2], [7, top + 4]]) R(g, x, y, 2, 1, P.leaf2);
      if (s === 2) { R(g, 7, 12, 3, 2, '#ff9a3c'); R(g, 7, 12, 1, 1, '#ffc27a'); return; }
      blob(g, 8.5, 13, 3, 2, '#ff9a3c'); R(g, 6, 12, 2, 1, '#ffc27a'); R(g, 8, 15, 2, 1, '#e87a24'); R(g, 10, 13, 1, 1, '#e87a24');
    },
    cabbage: (g, s) => {
      if (s === 0) { mound(g); R(g, 8, 11, 1, 1, P.leaf2); return; }
      if (s === 1) { mound(g); R(g, 8, 10, 1, 3, P.leaf1); blob(g, 6, 9, 2, 1, P.leaf1); blob(g, 10.5, 9, 2, 1, P.leaf2); return; }
      if (s === 2) { blob(g, 8.5, 11, 5, 3, P.leaf0); blob(g, 8.5, 10, 3, 2, P.leaf1); R(g, 8, 8, 1, 3, '#b8e88e'); return; }
      blob(g, 8.5, 10, 7, 5, P.leaf0);
      blob(g, 8.5, 9, 5, 4, P.leaf1);
      blob(g, 8.5, 8, 3, 3, '#c8f09a');
      R(g, 6, 6, 3, 1, '#e8ffd0');
      line(g, 3, 12, 6, 10, '#9ad86e'); line(g, 14, 12, 11, 10, '#9ad86e'); R(g, 8, 11, 1, 3, '#9ad86e');
    },
    pumpkin: (g, s) => {
      if (s === 0) { mound(g); R(g, 8, 11, 1, 1, P.leaf2); return; }
      if (s === 1) { mound(g); R(g, 8, 9, 1, 4, P.leaf1); blob(g, 5.5, 9, 2, 2, P.leaf1); blob(g, 11, 8, 2, 2, P.leaf2); return; }
      R(g, 1, 13, 14, 1, P.leaf0); line(g, 2, 13, 1, 11, P.leaf0); line(g, 14, 13, 15, 11, P.leaf0);
      blob(g, 3.5, 11, 2, 2, P.leaf1); blob(g, 13, 11, 2, 2, P.leaf1); R(g, 3, 10, 1, 1, P.leaf2); R(g, 12, 10, 1, 1, P.leaf2);
      if (s === 2) { blob(g, 8.5, 11, 3, 2, '#a8d860'); R(g, 7, 10, 1, 1, '#d0f090'); R(g, 8, 8, 1, 2, P.leaf0); return; }
      blob(g, 8.5, 10, 6, 4, '#ff9f3a');
      R(g, 5, 7, 1, 7, '#e8802a'); R(g, 11, 7, 1, 7, '#e8802a'); R(g, 8, 6, 1, 8, '#f08c30');
      R(g, 4, 8, 1, 2, '#ffc47a'); R(g, 6, 7, 2, 1, '#ffc47a');
      R(g, 8, 3, 2, 3, P.leaf0); R(g, 10, 3, 1, 1, P.leaf1); R(g, 11, 2, 1, 1, P.leaf1);
    },
  };
  function crop(kind, stage, glow) {
    return cached('c' + kind + stage + (glow ? 'g' : ''), T, T, (g) => { CROP_ART[kind](g, stage); });
  }
  // what you carry and what you drop: the produce on its own
  const PRODUCE = {
    carrot: (g) => { R(g, 3, 3, 3, 6, '#ff9a3c'); R(g, 3, 3, 1, 5, '#ffc27a'); R(g, 4, 8, 1, 1, '#e87a24'); R(g, 3, 0, 1, 3, P.leaf2); R(g, 5, 1, 1, 2, P.leaf1); },
    cabbage: (g) => { blob(g, 4.5, 5, 4, 3, P.leaf1); blob(g, 4.5, 4.5, 2, 2, '#b8e88e'); },
    pumpkin: (g) => { blob(g, 4.5, 5.5, 4, 3, '#ff9f3a'); R(g, 4, 3, 1, 5, '#e8802a'); R(g, 4, 1, 2, 2, P.leaf0); },
  };
  function produce(kind) { return cached('p' + kind, 10, 10, (g) => PRODUCE[kind](g)); }

  // ---- the wombat ------------------------------------------------------------
  // Chubby, low, and very pleased with itself: a loaf of a body, a round head
  // with two little ears, one bead eye with a shine in it, a big soft nose, a
  // pink cheek, and four stubby feet. Facing right; flipped for left.
  const WW = 26, WH = 18;
  function wombat(pelt, pose, f) {
    return cached('w' + pelt + pose + f, WW, WH, (g) => {
      const c = PELTS[pelt] || PELTS.brown;
      const lie = pose === 'sleep';
      const hop = pose === 'happy' && f % 2 ? -2 : 0;
      const breathe = pose === 'idle' && f % 2 ? 1 : 0;
      const by = (lie ? 10 : 8) + hop;             // top of the body
      const bh = lie ? 6 : 7;
      // feet first, so the body sits on them
      if (!lie) {
        const step = pose === 'walk' ? [[0, 1, 1, 0], [1, 0, 0, 1], [0, 1, 1, 0], [1, 0, 0, 1]][f % 4] : [0, 0, 0, 0];
        [4, 8, 14, 18].forEach((x, i) => R(g, x, 14 - step[i] + hop, 3, 3, i % 2 ? c.dark : c.base));
      }
      // the body: a soft loaf
      blob(g, 11, by + bh * 0.55 + breathe * 0, 9, bh * 0.6 + 1, c.base);
      R(g, 3, by + 2, 16, bh, c.base);
      blob(g, 11, by + bh - 1, 8, 2, c.light);                     // the belly
      R(g, 5, by, 11, 1, c.dark); R(g, 6, by + 1, 8, 1, U.mix(c.base, c.dark, 0.5));   // the back
      // the head
      const hx = lie ? 19 : 18, hy = (lie ? 12 : 8) + hop + (pose === 'eat' ? 3 : 0);
      blob(g, hx, hy, 5, 4, c.base);
      blob(g, hx + 1, hy + 2, 4, 2, c.light);
      // the ears
      if (!lie || true) {
        R(g, hx - 4, hy - 5, 2, 2, c.dark); R(g, hx - 1, hy - 6, 2, 2, c.dark);
        R(g, hx - 4, hy - 4, 1, 1, P.pinkD); R(g, hx - 1, hy - 5, 1, 1, P.pinkD);
      }
      // the face
      if (pose === 'sleep') { R(g, hx, hy - 1, 3, 1, P.line); }
      else if (pose === 'happy') { R(g, hx, hy - 1, 1, 1, P.line); R(g, hx + 1, hy - 2, 1, 1, P.line); R(g, hx + 2, hy - 1, 1, 1, P.line); }
      else { R(g, hx, hy - 2, 2, 2, P.line); R(g, hx, hy - 2, 1, 1, P.cream); }
      R(g, hx + 3, hy, 3, 2, c.nose); R(g, hx + 3, hy, 2, 1, U.mix(c.nose, '#ffffff', 0.25));   // the nose
      R(g, hx - 2, hy + 1, 2, 1, P.pink);                           // the cheek
      if (pose === 'eat' && f % 2) R(g, hx + 3, hy + 2, 2, 1, P.line);
    });
  }
  function heart() { return cached('heart', 7, 6, (g) => { R(g, 1, 0, 2, 1, P.coral); R(g, 4, 0, 2, 1, P.coral); R(g, 0, 1, 7, 2, P.coral); R(g, 1, 3, 5, 1, P.coral); R(g, 2, 4, 3, 1, P.coral); R(g, 3, 5, 1, 1, P.coral); R(g, 1, 1, 1, 1, '#ffc6bd'); }); }
  function poo() { return cached('poo', 6, 6, (g) => { R(g, 0, 0, 6, 6, '#8a5e3c'); R(g, 0, 0, 6, 1, '#a8774e'); R(g, 0, 0, 1, 6, '#a8774e'); R(g, 5, 1, 1, 5, '#6c4730'); }); }
  function coin() { return cached('coin', 7, 7, (g) => { blob(g, 3.5, 3.5, 3, 3, P.sun); R(g, 3, 1, 1, 5, P.sunD); R(g, 2, 2, 1, 1, P.cream); }); }

  // ---- the yard ---------------------------------------------------------------
  function tree(v) {
    return cached('tree' + v, 40, 52, (g) => {
      R(g, 17, 32, 6, 18, P.bark0); R(g, 17, 32, 2, 18, P.bark1);
      const r = rng(v * 97 + 5);
      const puffs = [[20, 20, 15, 12], [11, 26, 9, 8], [29, 26, 9, 8], [20, 12, 10, 8]];
      for (const [x, y, rx, ry] of puffs) blob(g, x, y, rx, ry, P.leaf0);
      for (const [x, y, rx, ry] of puffs) blob(g, x - 1, y - 2, rx - 2, ry - 2, P.leaf1);
      blob(g, 16, 10, 5, 4, P.leaf2);
      for (let i = 0; i < 6; i++) R(g, 8 + Math.floor(r() * 24), 8 + Math.floor(r() * 22), 2, 2, v % 2 ? P.pink : P.leaf2);
    });
  }
  function bush(v) {
    return cached('bush' + v, 22, 16, (g) => {
      blob(g, 11, 9, 10, 6, P.leaf0); blob(g, 10, 7, 8, 5, P.leaf1); blob(g, 8, 5, 4, 3, P.leaf2);
      if (v % 2) { R(g, 6, 8, 2, 2, P.pink); R(g, 13, 6, 2, 2, P.cream); }
    });
  }
  function house() {
    return cached('house', 86, 70, (g) => {
      // walls
      R(g, 8, 30, 70, 38, '#f4e2c4'); R(g, 8, 30, 70, 2, '#fff2dc');
      for (let y = 36; y < 66; y += 6) R(g, 8, y, 70, 1, '#e6d0ac');
      // roof
      for (let i = 0; i < 26; i++) R(g, 2 + i * 0.6, 30 - i, 82 - i * 1.2, 1, i % 4 ? '#e27a64' : '#c9604e');
      R(g, 0, 29, 86, 3, '#b8523f');
      R(g, 60, 4, 8, 14, '#a8725a'); R(g, 60, 4, 8, 2, '#c49078');          // chimney
      // door
      R(g, 36, 44, 14, 24, '#b07848'); R(g, 36, 44, 14, 2, '#c8905a'); R(g, 46, 56, 2, 2, P.sun);
      R(g, 34, 66, 18, 2, '#c9b08a');
      // windows, lit warm
      for (const x of [16, 58]) { R(g, x, 42, 12, 11, '#fff0b8'); R(g, x + 5, 42, 2, 11, '#b07848'); R(g, x, 47, 12, 1, '#b07848'); R(g, x - 1, 53, 14, 2, '#b07848'); }
      // flower boxes
      for (const x of [15, 57]) { R(g, x, 55, 14, 3, '#9a6a44'); R(g, x + 1, 53, 3, 2, P.pink); R(g, x + 6, 53, 3, 2, P.sun); R(g, x + 10, 53, 3, 2, P.pink); }
    });
  }
  function stand() {
    return cached('stand', 60, 50, (g) => {
      // awning, striped
      for (let i = 0; i < 6; i++) R(g, 2 + i * 9.4, 6, 10, 12, i % 2 ? P.cream : P.coral);
      for (let i = 0; i < 6; i++) R(g, 2 + i * 9.4, 17, 10, 3, i % 2 ? '#efe0c8' : P.coralD);
      R(g, 0, 4, 60, 3, P.wood1);
      // posts
      R(g, 4, 18, 4, 30, P.wood1); R(g, 52, 18, 4, 30, P.wood1);
      // counter with crates of veg
      R(g, 2, 32, 56, 14, P.wood2); R(g, 2, 32, 56, 2, P.wood3); R(g, 2, 44, 56, 2, P.wood0);
      for (let i = 0; i < 3; i++) { R(g, 7 + i * 17, 26, 14, 7, P.wood1); R(g, 7 + i * 17, 26, 14, 1, P.wood3); }
      R(g, 9, 24, 3, 3, '#ff9a3c'); R(g, 13, 24, 3, 3, '#ff9a3c'); R(g, 26, 23, 5, 4, P.leaf1); R(g, 43, 23, 6, 5, '#ff9f3a');
      // the sign
      R(g, 18, 36, 24, 8, P.cream);
      R(g, 20, 38, 3, 3, P.coral); R(g, 25, 38, 3, 3, P.coral); R(g, 30, 38, 3, 3, P.coral); R(g, 35, 38, 3, 3, P.coral);
    });
  }
  function fencePost() { return cached('fence', 16, 14, (g) => { R(g, 6, 2, 4, 12, P.wood2); R(g, 6, 2, 4, 1, P.wood3); R(g, 0, 5, 16, 2, P.wood1); R(g, 0, 10, 16, 2, P.wood1); }); }

  // ---- tools and small icons --------------------------------------------------
  const ICON = {
    hand: (g) => { R(g, 4, 6, 8, 7, '#f7d2b0'); R(g, 4, 2, 2, 6, '#f7d2b0'); R(g, 6, 1, 2, 6, '#f7d2b0'); R(g, 8, 2, 2, 5, '#f7d2b0'); R(g, 10, 3, 2, 5, '#f7d2b0'); R(g, 12, 7, 2, 3, '#f7d2b0'); R(g, 5, 9, 6, 1, '#e8b894'); },
    hoe: (g) => { for (let i = 0; i < 10; i++) R(g, 4 + i, 13 - i, 2, 2, P.wood1); R(g, 11, 2, 4, 3, '#b8c0c8'); R(g, 13, 2, 2, 6, '#98a0a8'); },
    can: (g) => { R(g, 3, 6, 9, 8, '#7fc4e8'); R(g, 3, 6, 9, 2, '#b0e0f4'); R(g, 11, 7, 4, 2, '#7fc4e8'); R(g, 14, 5, 2, 3, '#7fc4e8'); R(g, 5, 3, 5, 2, '#5aa6cc'); R(g, 5, 3, 1, 4, '#5aa6cc'); R(g, 9, 3, 1, 4, '#5aa6cc'); },
    seeds: (g) => { R(g, 3, 4, 10, 11, '#e8c898'); R(g, 3, 4, 10, 2, '#f4dcb4'); R(g, 5, 2, 6, 3, '#d4b080'); R(g, 6, 8, 4, 4, P.leaf1); R(g, 7, 7, 2, 2, P.leaf2); },
    food: (g) => { R(g, 2, 7, 12, 7, P.wood2); R(g, 2, 7, 12, 1, P.wood3); R(g, 3, 4, 3, 4, '#ff9a3c'); R(g, 7, 3, 4, 4, P.leaf1); R(g, 10, 5, 3, 3, '#ff9f3a'); R(g, 4, 2, 1, 2, P.leaf2); },
    fert: (g) => { R(g, 4, 7, 5, 5, '#8a5e3c'); R(g, 4, 7, 5, 1, '#a8774e'); R(g, 8, 4, 5, 5, '#8a5e3c'); R(g, 8, 4, 5, 1, '#a8774e'); R(g, 3, 12, 11, 2, P.leaf1); R(g, 6, 2, 1, 2, P.mint); R(g, 12, 2, 1, 2, P.mint); },
    shovel: (g) => { for (let i = 0; i < 8; i++) R(g, 3 + i, 3 + i, 2, 2, P.wood1); R(g, 2, 2, 3, 3, P.wood2); R(g, 10, 10, 5, 5, '#b8c0c8'); R(g, 10, 10, 5, 1, '#d8dee4'); R(g, 13, 13, 2, 2, '#98a0a8'); },
    coin: (g) => { blob(g, 8, 8, 6, 6, P.sun); blob(g, 8, 8, 4, 4, '#ffe28a'); R(g, 7, 5, 2, 6, P.sunD); R(g, 5, 4, 2, 2, P.cream); },
    sun: (g) => { blob(g, 8, 8, 4, 4, P.sun); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; R(g, 7 + Math.round(Math.cos(a) * 6), 7 + Math.round(Math.sin(a) * 6), 2, 2, P.sunD); } },
    moon: (g) => { blob(g, 8, 8, 5, 5, '#f4efd8'); blob(g, 10, 6, 4, 4, 'rgba(0,0,0,0)'); g.clearRect(9, 2, 6, 7); blob(g, 11, 6, 3, 3, '#f4efd8'); g.clearRect(10, 3, 5, 6); },
    up: (g) => { R(g, 7, 3, 2, 10, P.mintD); R(g, 5, 5, 6, 2, P.mintD); R(g, 3, 7, 10, 2, P.mintD); },
    down: (g) => { R(g, 7, 3, 2, 10, P.coralD); R(g, 5, 9, 6, 2, P.coralD); R(g, 3, 7, 10, 2, P.coralD); },
    wombat: (g) => { g.drawImage(wombat('brown', 'idle', 0), -6, -2); },
    note: (g) => { R(g, 5, 2, 8, 2, P.ink); R(g, 5, 2, 2, 10, P.ink); R(g, 11, 2, 2, 9, P.ink); blob(g, 4.5, 12, 2, 2, P.ink); blob(g, 10.5, 11, 2, 2, P.ink); },
    mute: (g) => { ICON.note(g); for (let i = 0; i < 12; i++) R(g, 2 + i, 2 + i, 2, 1, P.coralD); },
    home: (g) => { for (let i = 0; i < 6; i++) R(g, 7 - i, 2 + i, i * 2 + 2, 1, P.coral); R(g, 3, 8, 10, 6, P.cream); R(g, 7, 10, 3, 4, P.wood1); R(g, 11, 3, 2, 3, P.coralD); },
    x: (g) => { for (let i = 0; i < 8; i++) { R(g, 4 + i, 4 + i, 2, 2, P.cream); R(g, 10 - i, 4 + i, 2, 2, P.cream); } },
    bed: (g) => { R(g, 2, 8, 12, 5, P.cream); R(g, 2, 6, 4, 3, '#ffffff'); R(g, 6, 7, 8, 3, '#9ec8e8'); R(g, 1, 5, 2, 9, P.wood1); R(g, 13, 8, 2, 6, P.wood1); },
  };
  function icon(name) { return cached('i' + name, 16, 16, (g) => ICON[name](g), name !== 'wombat'); }

  // ---- interface --------------------------------------------------------------
  // A card with its corners stepped in, a light top edge, a darker lip under it
  // and a small soft shadow. Every panel, pill and slot in the game is one.
  function card(g, x, y, w, h, fill, edge, lip) {
    x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
    g.fillStyle = 'rgba(59,42,34,0.18)'; g.fillRect(x + 2, y + 3, w, h);          // the shadow
    g.fillStyle = edge || P.line;
    g.fillRect(x + 2, y, w - 4, h); g.fillRect(x, y + 2, w, h - 4); g.fillRect(x + 1, y + 1, w - 2, h - 2);
    g.fillStyle = fill;
    g.fillRect(x + 2, y + 1, w - 4, h - 2); g.fillRect(x + 1, y + 2, w - 2, h - 4);
    g.fillStyle = U.mix(fill, '#ffffff', 0.35); g.fillRect(x + 2, y + 1, w - 4, 1);
    if (lip !== false) { g.fillStyle = U.mix(fill, P.line, 0.18); g.fillRect(x + 2, y + h - 3, w - 4, 2); }
  }
  function text(g, str, x, y, col, o = {}) {
    Font.draw(g, str, x, y, Object.assign({ scale: 1, color: col || P.ink }, o));
  }

  return { T, LH, cv, R, rng, hash, blob, line, outline, flip, grassTile, soilTile, crop, produce, wombat, heart, poo, coin, tree, bush, house, stand, fencePost, icon, card, text, WW, WH };
})();
