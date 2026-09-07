// ---- Pixel-art drawing primitives + shared palette -------------------------
// Everything is drawn on small offscreen canvases at 1 art-pixel = 1 canvas
// pixel, then blitted with smoothing off. Sprites are cached, so per-pixel
// passes (outlines, dithering) are affordable.
const PAL = {
  ink: '#241611', ink2: '#3a2a1e',
  wood0: '#3a2214', wood1: '#5c3820', wood2: '#8a5a30', wood3: '#b98a52', wood4: '#d8b483',
  parch0: '#e8cf9e', parch1: '#f6e6c0', cream: '#fff8e6',
  gold: '#f2c14e', goldD: '#c9922b', goldL: '#ffe9a8',
  red: '#c4442f', redD: '#932c1e', redL: '#e8705c',
  teal: '#3f9e94', tealL: '#6fd3c8',
  grass0: '#3f6f2a', grass1: '#57933a', grass2: '#6fb04a', grass3: '#8cc85f',
  soil0: '#5a3a22', soil1: '#7a5230', soil2: '#9a6f42',
  sky0: '#7ec8e8', sky1: '#bfe7f5',
  leaf0: '#2f5f24', leaf1: '#437d2e', leaf2: '#5c9c3c', leaf3: '#7cbb52',
  bark0: '#3d2718', bark1: '#5e4028', bark2: '#7d5836', bark3: '#9c7249',
  stone0: '#565666', stone1: '#7b7b88', stone2: '#9d9daa',
  water0: '#2f7d9e', water1: '#4aa8c8', water2: '#7fd0e4',
  sand: '#d8b483',
  spot: '#fff3c4',
};

const FUR = [
  { base: '#8a6242', dark: '#5f4029', light: '#a9805a', belly: '#c2a07c', ear: '#c98a7a' },
  { base: '#6f533c', dark: '#4a3526', light: '#8e6f52', belly: '#ab8c6b', ear: '#bd7f70' },
  { base: '#9c7350', dark: '#6d4c31', light: '#bb9068', belly: '#d3b189', ear: '#d69b88' },
  { base: '#a58358', dark: '#75593a', light: '#c2a077', belly: '#dcc39a', ear: '#d99f8c' },
];

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
  // Seeded RNG helper for procedural variants
  function rng(seed) {
    let s = (seed | 0) || 1;
    return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  }
  return { cv, ell, ellBand, rect, panel, line, poly, limb, speckle, outline, underShade, flip, tinted, rng };
})();
