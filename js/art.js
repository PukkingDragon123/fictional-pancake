// ---- Pixel-art drawing primitives + shared palette -------------------------
// Everything is drawn on small offscreen canvases at 1 art-pixel = 1 canvas
// pixel, then blitted with smoothing off. Sprites are cached, so per-pixel
// passes (outlines, dithering) are affordable.
//
// The palette tells the story in three ramps. ASH and BONE are the dead land
// you start on: cold, desaturated, no green anywhere. MOSS is what comes back
// where a wombat has worked the soil. VIOLET and GOLD belong to the gods and
// appear nowhere else, so divine light always reads as divine.
const PAL = {
  // ink: a true near-black. Every sprite gets this as a hard 1px outline.
  ink: '#0d0a0c', ink2: '#1e1922', ink3: '#2c2531',

  // --- the barren ground: ash over bone ---
  ash0: '#241f2a', ash1: '#37313f', ash2: '#4e4757', ash3: '#6b6376', ash4: '#8b8397',
  bone0: '#6e6a63', bone1: '#948d80', bone2: '#c0b8a6', bone3: '#e2dac6', bone4: '#f4eeda',

  // --- what you bring back ---
  moss0: '#17321c', moss1: '#265229', moss2: '#3a7a38', moss3: '#57a44a', moss4: '#82cd63',
  grass0: '#17321c', grass1: '#265229', grass2: '#3a7a38', grass3: '#57a44a',
  leaf0: '#17321c', leaf1: '#265229', leaf2: '#3a7a38', leaf3: '#57a44a',
  soil0: '#241a13', soil1: '#3c2b1d', soil2: '#57402b', soil3: '#75593c',
  wet0: '#1b1a12', wet1: '#302a1a',

  // --- the gods: violet and gold, used nowhere else ---
  vio0: '#210f38', vio1: '#3d1d66', vio2: '#6a35ab', vio3: '#9b62e0', vio4: '#cfa8ff',
  gold: '#e6b73c', goldD: '#a2761a', goldL: '#ffe7a4', halo: '#fff3cf',

  // --- dead wood, stone, standing water ---
  bark0: '#241c1c', bark1: '#3a2e2b', bark2: '#54443d', bark3: '#715d51',
  stone0: '#33303a', stone1: '#4b4753', stone2: '#67626f', stone3: '#8a8492',
  water0: '#1d3a44', water1: '#2f6270', water2: '#589aa6',
  blood: '#7c2230', bloodL: '#b8384a',

  // --- interface: aged timber and bone parchment ---
  wood0: '#1d1720', wood1: '#302739', wood2: '#463a4e', wood3: '#6b5c72', wood4: '#9c8ba0',
  parch0: '#c0b8a6', parch1: '#ded6c2', cream: '#f4eeda',
  red: '#a63047', redD: '#6f1c2d', redL: '#d4576b',
  teal: '#3f8e94', tealL: '#6cc6cc',
  sky0: '#2a2432', sky1: '#4a4152', sky2: '#7a6a78',
  sand: '#8b8397', spot: '#fff3cf',
};

// Wombat pelts. The first four are common and stay in the ash range so a
// wombat reads as part of the dead land until you restore it. Indices 4 and up
// are rare variants; data.js owns how often each one shows up.
const FUR = [
  { key: 'ash',    name: 'Ash',      base: '#6a6270', dark: '#453e4c', light: '#8a8291', belly: '#a9a0ae', ear: '#8c6f84', rare: 0 },
  { key: 'dust',   name: 'Dust',     base: '#7b6d63', dark: '#524740', light: '#9a8a7d', belly: '#b8a695', ear: '#9a7468', rare: 0 },
  { key: 'ochre',  name: 'Ochre',    base: '#8a6e4a', dark: '#5c4830', light: '#a98a60', belly: '#c4a87c', ear: '#a8736a', rare: 0 },
  { key: 'slate',  name: 'Slate',    base: '#57606e', dark: '#383f4a', light: '#737d8c', belly: '#8f98a6', ear: '#7a6a80', rare: 0 },
  { key: 'bone',   name: 'Bonecoat', base: '#c6bfae', dark: '#8f8878', light: '#e0d9c6', belly: '#f0e9d6', ear: '#c99a94', rare: 1 },
  { key: 'moss',   name: 'Mossback', base: '#4d7444', dark: '#2f4c2c', light: '#6d9a5e', belly: '#93bd7c', ear: '#8a9a5c', rare: 1 },
  { key: 'gilded', name: 'Gilded',   base: '#c99c3a', dark: '#8d6a1c', light: '#e8bf5e', belly: '#ffe093', ear: '#d09a5a', rare: 2 },
  { key: 'void',   name: 'Voidborn', base: '#3a2a56', dark: '#221436', light: '#573f7c', belly: '#7358a4', ear: '#7a4fa8', rare: 2 },
];
const FUR_BY_KEY = Object.fromEntries(FUR.map((f, i) => [f.key, Object.assign({ idx: i }, f)]));

const Art = (() => {
  function cv(w, h) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h));
    const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    return { c, g };
  }
  // Pixel-snapped filled ellipse
  function ell(g, cx, cy, rx, ry, col) {
    if (col) g.fillStyle = col;
    const y0 = Math.floor(cy - ry), y1 = Math.ceil(cy + ry);
    for (let y = y0; y <= y1; y++) {
      const dy = (y + 0.5 - cy) / ry;
      if (dy < -1 || dy > 1) continue;
      const w = Math.sqrt(1 - dy * dy) * rx;
      const xa = Math.round(cx - w), xb = Math.round(cx + w);
      if (xb > xa) g.fillRect(xa, y, xb - xa, 1);
    }
  }
  // Ellipse arc band (for bellies / highlights): only rows in [ta,tb] of the height
  function ellBand(g, cx, cy, rx, ry, col, ta, tb) {
    g.fillStyle = col;
    const y0 = Math.floor(cy - ry + ry * 2 * ta), y1 = Math.ceil(cy - ry + ry * 2 * tb);
    for (let y = y0; y <= y1; y++) {
      const dy = (y + 0.5 - cy) / ry;
      if (dy < -1 || dy > 1) continue;
      const w = Math.sqrt(1 - dy * dy) * rx;
      const xa = Math.round(cx - w), xb = Math.round(cx + w);
      if (xb > xa) g.fillRect(xa, y, xb - xa, 1);
    }
  }
  function rect(g, x, y, w, h, col) { g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
  // Rounded rect with 1px clipped corners (pixel-art style)
  function panel(g, x, y, w, h, col, corner = 1) {
    g.fillStyle = col;
    g.fillRect(x + corner, y, w - corner * 2, h);
    g.fillRect(x, y + corner, w, h - corner * 2);
  }
  function line(g, x0, y0, x1, y1, col, thick = 1) {
    g.fillStyle = col;
    const dx = x1 - x0, dy = y1 - y0, n = Math.max(Math.abs(dx), Math.abs(dy));
    for (let i = 0; i <= n; i++) {
      const x = Math.round(x0 + (dx * i) / n), y = Math.round(y0 + (dy * i) / n);
      g.fillRect(x, y, thick, thick);
    }
  }
  // Convex polygon scanline fill, pixel-snapped
  function poly(g, pts, col) {
    g.fillStyle = col;
    let minY = Infinity, maxY = -Infinity;
    for (const q of pts) { if (q[1] < minY) minY = q[1]; if (q[1] > maxY) maxY = q[1]; }
    for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
      const yc = y + 0.5, xs = [];
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i], b = pts[(i + 1) % pts.length];
        if ((a[1] <= yc && b[1] > yc) || (b[1] <= yc && a[1] > yc)) xs.push(a[0] + ((yc - a[1]) / (b[1] - a[1])) * (b[0] - a[0]));
      }
      if (xs.length < 2) continue;
      xs.sort((m, n) => m - n);
      for (let i = 0; i + 1 < xs.length; i += 2) {
        const x0 = Math.round(xs[i]), x1 = Math.round(xs[i + 1]);
        g.fillRect(x0, y, Math.max(1, x1 - x0), 1);
      }
    }
  }
  // Tapered branch/limb: from (x0,y0) width w0 to (x1,y1) width w1
  function limb(g, x0, y0, x1, y1, w0, w1, col) {
    const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len, ny = dx / len;
    poly(g, [
      [x0 + (nx * w0) / 2, y0 + (ny * w0) / 2],
      [x1 + (nx * w1) / 2, y1 + (ny * w1) / 2],
      [x1 - (nx * w1) / 2, y1 - (ny * w1) / 2],
      [x0 - (nx * w0) / 2, y0 - (ny * w0) / 2],
    ], col);
  }
  // Dither speckle inside an elliptical mask
  function speckle(g, cx, cy, rx, ry, col, n, seed = 1) {
    g.fillStyle = col;
    let s = seed;
    const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
    for (let i = 0; i < n; i++) {
      const a = rnd() * TAU, r = Math.sqrt(rnd());
      g.fillRect(Math.round(cx + Math.cos(a) * rx * r), Math.round(cy + Math.sin(a) * ry * r), 1, 1);
    }
  }
  // Add a 1px outline around every opaque pixel (cartoony ink line)
  function outline(canvas, col = PAL.ink, alpha = 1) {
    const g = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    const src = g.getImageData(0, 0, w, h);
    const a = src.data;
    const need = [];
    const op = (x, y) => (x < 0 || y < 0 || x >= w || y >= h) ? 0 : a[(y * w + x) * 4 + 3];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (op(x, y) > 8) continue;
      if (op(x - 1, y) > 8 || op(x + 1, y) > 8 || op(x, y - 1) > 8 || op(x, y + 1) > 8) need.push(x, y);
    }
    g.globalAlpha = alpha; g.fillStyle = col;
    for (let i = 0; i < need.length; i += 2) g.fillRect(need[i], need[i + 1], 1, 1);
    g.globalAlpha = 1;
    return canvas;
  }
  // Darken the bottom edge of a silhouette (contact shadow inside the shape)
  function underShade(canvas, col = 'rgba(0,0,0,0.18)', depth = 2) {
    const g = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    const a = g.getImageData(0, 0, w, h).data;
    g.fillStyle = col;
    for (let x = 0; x < w; x++) {
      let last = -1;
      for (let y = h - 1; y >= 0; y--) if (a[(y * w + x) * 4 + 3] > 8) { last = y; break; }
      if (last >= 0) g.fillRect(x, last - depth + 1, 1, depth);
    }
  }
  function flip(img) {
    const { c, g } = cv(img.width, img.height);
    g.translate(img.width, 0); g.scale(-1, 1); g.drawImage(img, 0, 0);
    return c;
  }
  function tinted(img, col, amt = 1) {
    const { c, g } = cv(img.width, img.height);
    g.drawImage(img, 0, 0);
    g.globalAlpha = amt; g.globalCompositeOperation = 'source-atop';
    g.fillStyle = col; g.fillRect(0, 0, c.width, c.height);
    return c;
  }
  // ---- Dithering ---------------------------------------------------------
  // An 8x8 Bayer matrix, normalised to 0..1. Comparing a coverage value against
  // BAYER[y&7][x&7] turns a smooth falloff into an ordered pixel pattern, which
  // is what keeps a soft brush looking hand-stippled instead of blurred.
  const BAYER = (() => {
    let m = [[0, 2], [3, 1]];
    for (let s = 0; s < 2; s++) {
      const n = m.length, o = [];
      for (let y = 0; y < n * 2; y++) {
        o[y] = [];
        for (let x = 0; x < n * 2; x++) {
          const q = (y < n ? (x < n ? 0 : 2) : (x < n ? 3 : 1));
          o[y][x] = m[y % n][x % n] * 4 + q;
        }
      }
      m = o;
    }
    const d = m.length * m.length;
    return m.map((row) => row.map((v) => (v + 0.5) / d));
  })();
  // Stamp a dithered disc of `col` into g. Coverage is 1 at the centre and
  // falls to 0 at the rim; each pixel is kept only if coverage beats its
  // threshold, so overlapping stamps build up an irregular, organic edge.
  function ditherDisc(g, cx, cy, r, col, strength = 1, soft = 0.55) {
    g.fillStyle = col;
    const x0 = Math.floor(cx - r), x1 = Math.ceil(cx + r);
    const y0 = Math.floor(cy - r), y1 = Math.ceil(cy + r);
    const inner = r * (1 - soft);
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
        if (d > r) continue;
        const cov = (d <= inner ? 1 : 1 - (d - inner) / (r - inner || 1)) * strength;
        if (cov >= 1 || cov > BAYER[y & 7][x & 7]) g.fillRect(x, y, 1, 1);
      }
    }
  }
  // Erase with the same pattern, for a brush that takes ground away.
  function ditherErase(g, cx, cy, r, strength = 1, soft = 0.55) {
    const prev = g.globalCompositeOperation;
    g.globalCompositeOperation = 'destination-out';
    ditherDisc(g, cx, cy, r, '#000', strength, soft);
    g.globalCompositeOperation = prev;
  }
  // A one-pixel scatter along a ring, for the gritty fringe of a fresh stamp.
  function fringe(g, cx, cy, r, col, n, seed = 1) {
    const rnd = rng(seed);
    g.fillStyle = col;
    for (let i = 0; i < n; i++) {
      const a = rnd() * TAU, d = r * (0.86 + rnd() * 0.3);
      g.fillRect(Math.round(cx + Math.cos(a) * d), Math.round(cy + Math.sin(a) * d * 0.72), 1, 1);
    }
  }

  // Seeded RNG helper for procedural variants
  function rng(seed) {
    let s = (seed | 0) || 1;
    return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  }
  return { cv, ell, ellBand, rect, panel, line, poly, limb, speckle, outline, underShade, flip, tinted, rng, BAYER, ditherDisc, ditherErase, fringe };
})();
