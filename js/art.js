// ---- Pixel-art drawing primitives + shared palette ------------------------
// Everything is drawn on small offscreen canvases at 1 art-pixel = 1 canvas
// pixel, then blitted with smoothing off. Sprites are cached, so per-pixel
// passes (outlines, dithering) are affordable.
//
// Palette is built around three states of the world: the barren forest you
// inherit (ash, bone, dead wood), the living one you restore (moss, soil,
// bark), and the divine (violet, gold, cold cyan) that breaks through when a
// god is summoned.
const PAL = {
  ink: '#120e14', ink2: '#241d2a',
  stone0: '#1c1a24', stone1: '#2c2836', stone2: '#443e52', stone3: '#625a72', stone4: '#8b849c',
  bone: '#cfc4b0', boneD: '#a89a84', ash: '#8a8290', ashD: '#5f5868', dust: '#6b6470',
  dead0: '#2e241d', dead1: '#463629', dead2: '#67523d', dead3: '#8a7156',
  moss0: '#1d3419', moss1: '#2f4f24', moss2: '#436f2f', moss3: '#5d9440', moss4: '#84bb59', moss5: '#b3dd86',
  soil0: '#241810', soil1: '#3b2a1b', soil2: '#553d27', soil3: '#75573a', soil4: '#9b7a52',
  bark0: '#2a1d15', bark1: '#412e20', bark2: '#5d4430', bark3: '#7d5f42',
  gold0: '#6d4a10', gold1: '#a97c1e', gold2: '#d8a52f', gold3: '#f5cd5c', gold4: '#ffeeb0',
  div0: '#1b1030', div1: '#33205c', div2: '#563391', div3: '#8354c9', div4: '#b98ef0', div5: '#e6d6ff',
  cyan0: '#123c46', cyan1: '#22707f', cyan2: '#3fa8ba', cyan3: '#79dced', cyan4: '#c2f4ff',
  red0: '#4a1712', red1: '#7e2a20', red2: '#b8412c', red3: '#e0705a',
  parch0: '#d8c69c', parch1: '#efdcb4', cream: '#fdf3dc',
  water0: '#1b4a5c', water1: '#2f7f96', water2: '#57b6c9', water3: '#9fe2ee',
  rot0: '#4a4a22', rot1: '#6e6a2c', rot2: '#96903c',
};

// Wombat pelts. The first four are common; the rest are the rare variants
// breeding can throw. `glow` marks a pelt that gets an aura.
const FUR = [
  { key: 'brown', name: 'Brown', light: '#e2ab8c', base: '#c98a6c', mid: '#a86d54', dark: '#7e4d3d', deep: '#5a352c', nose: '#2a1a18', ink: '#1a1010', rare: 0 },
  { key: 'grey', name: 'Grey', light: '#b4aca4', base: '#9c9289', mid: '#847a72', dark: '#6b625c', deep: '#514944', nose: '#332d29', ink: '#241f1c', rare: 0 },
  { key: 'sand', name: 'Sand', light: '#e0c096', base: '#cca878', mid: '#b28c5e', dark: '#947049', deep: '#735436', nose: '#4c3722', ink: '#3a2a19', rare: 0 },
  { key: 'soot', name: 'Soot', light: '#8a7a6e', base: '#726256', mid: '#5c4e44', dark: '#463b33', deep: '#332b25', nose: '#221c18', ink: '#171310', rare: 0 },
  { key: 'pale', name: 'Pale', light: '#fbf3e6', base: '#eee2cf', mid: '#dccbb2', dark: '#c4b096', deep: '#a8927a', nose: '#d08a8a', ink: '#7a6450', rare: 1, eye: '#c4443f' },
  { key: 'gilded', name: 'Gilded', light: '#ffe6a0', base: '#edc255', mid: '#d0a130', dark: '#a87c18', deep: '#7d5a0e', nose: '#4a3308', ink: '#3d2c06', rare: 1, glow: '#f5cd5c' },
  { key: 'mossy', name: 'Mossgrown', light: '#9dbb78', base: '#7f9c5c', mid: '#688045', dark: '#4f6433', deep: '#3a4a26', nose: '#22301a', ink: '#1b2614', rare: 1, moss: 1 },
  { key: 'starlit', name: 'Starlit', light: '#8f6fbd', base: '#6f4fa0', mid: '#573c82', dark: '#402c62', deep: '#2c1e45', nose: '#170f24', ink: '#120b1c', rare: 2, glow: '#b98ef0', stars: 1 },
];
for (const f of FUR) { f.belly = f.light; f.ear = f.mid; }
const FUR_BY_KEY = Object.fromEntries(FUR.map((f) => [f.key, f]));

// Nothing in this game is ever smoothed. Every 2D context, wherever it is
// made and by whom, comes back with interpolation off, so a sprite blown up
// eight times is eight hard squares and never a smear. One hook, once, is the
// only way to be sure of that across thirty files.
(() => {
  const real = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (kind, attrs) {
    const ctx = real.call(this, kind, attrs);
    if (ctx && kind === '2d') {
      ctx.imageSmoothingEnabled = false;
      ctx.mozImageSmoothingEnabled = false;
      ctx.webkitImageSmoothingEnabled = false;
      ctx.msImageSmoothingEnabled = false;
    }
    return ctx;
  };
})();

const Art = (() => {
  function cv(w, h) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h));
    const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    return { c, g };
  }
  // Pixel-snapped filled ellipse
  // A round shape, drawn the way a pixel artist draws one: the rows are
  // quantised into steps so the edge reads as a staircase rather than a curve.
  // Nothing in this game should look like a vector circle, and the step size
  // grows with the shape, so a big blob is visibly blocky.
  function ell(g, cx, cy, rx, ry, col) {
    if (col) g.fillStyle = col;
    const y0 = Math.floor(cy - ry), y1 = Math.ceil(cy + ry);
    const step = ry < 4 ? 1 : ry < 9 ? 2 : ry < 18 ? 3 : 4;
    let y = y0;
    while (y <= y1) {
      // take the width at the middle of this band, so the whole band is one run
      const my = y + step / 2;
      const dy = (my - cy) / ry;
      if (dy >= -1 && dy <= 1) {
        const w = Math.sqrt(1 - dy * dy) * rx;
        const xa = Math.round(cx - w), xb = Math.round(cx + w);
        const h = Math.min(step, y1 - y + 1);
        if (xb > xa && h > 0) g.fillRect(xa, y, xb - xa, h);
      }
      y += step;
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
  // ---- pixel-art stand-ins for the smooth canvas primitives ----------------
  // Canvas gradients and arcs are the only things in here that are not made of
  // whole pixels, and they are what stops the game reading as pixel art. These
  // replace them: hard bands with a checker seam between, which is how a
  // gradient is drawn by hand.
  const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
  // a dithered fill: every pixel whose bayer threshold is under `a` is painted
  function dither(g, x, y, w, h, col, a) {
    if (a <= 0.02) return;
    if (a >= 0.99) { g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); return; }
    g.fillStyle = col;
    const x0 = Math.round(x), y0 = Math.round(y), x1 = x0 + Math.round(w), y1 = y0 + Math.round(h);
    const lvl = Math.round(a * 16);
    for (let yy = y0; yy < y1; yy++) {
      for (let xx = x0; xx < x1; xx++) {
        if (BAYER[((yy % 4) + 4) % 4][((xx % 4) + 4) % 4] < lvl) g.fillRect(xx, yy, 1, 1);
      }
    }
  }
  // a dithered vignette, cached: darkness grows with distance from centre,
  // laid down as bayer pixels so the falloff reads as banding, never a blur
  const VIGN = {};
  function vignette(g, w, h, col = '#020403', a0 = 0.62, power = 2.4, inner = 0.38, steps = 7) {
    w = Math.round(w); h = Math.round(h);
    const key = w + 'x' + h + col + a0 + power + inner + steps;
    let c = VIGN[key];
    if (!c) {
      const cc = cv(w, h); c = cc.c; const q = cc.g;
      const cx = w / 2, cy = h / 2;
      // alpha quantised into hard steps, so the falloff reads as concentric
      // bands of shade rather than a smooth wash. Rows are run-length filled.
      for (let y = 0; y < h; y++) {
        const dy = (y - cy) / cy;
        let runA = -1, runX = 0;
        for (let x = 0; x <= w; x++) {
          let lv = 0;
          if (x < w) {
            const dx = (x - cx) / cx;
            const d = Math.sqrt(dx * dx + dy * dy) / Math.SQRT2;
            const t = (d - inner) / (1 - inner);
            lv = t <= 0 ? 0 : Math.round(Math.pow(t > 1 ? 1 : t, power) * steps);
          }
          if (lv !== runA) {
            if (runA > 0) { q.fillStyle = col; q.globalAlpha = (a0 * runA) / steps; q.fillRect(runX, y, x - runX, 1); }
            runA = lv; runX = x;
          }
        }
      }
      q.globalAlpha = 1;
      VIGN[key] = c;
    }
    g.drawImage(c, 0, 0);
  }
  // a glow: concentric pixel rings, the outer ones dithered away
  function glow(g, cx, cy, r, col, a0 = 0.5, bands = 5) {
    // More steps the bigger it is: five hard rings on a 200px glow reads as a
    // painted bullseye, where the same five on a 30px lamp reads as a lamp.
    bands = Math.max(bands, Math.min(14, Math.round(r / 11)));
    const oa = g.globalAlpha;
    for (let i = bands - 1; i >= 0; i--) {
      const rr = r * ((i + 1) / bands);
      const a = a0 * Math.pow(1 - i / bands, 1.7);
      if (a <= 0.015) continue;
      g.globalAlpha = oa * a;                    // hard concentric steps, no noise
      ell(g, cx, cy, rr, rr, col);
    }
    g.globalAlpha = oa;
  }
  // the same, but elliptical and with the dither applied per scanline
  function ditherEll(g, cx, cy, rx, ry, col, a) {
    if (a <= 0.02) return;
    g.fillStyle = col;
    const lvl = Math.round(U.clamp(a, 0, 1) * 16);
    const y0 = Math.floor(cy - ry), y1 = Math.ceil(cy + ry);
    for (let y = y0; y <= y1; y++) {
      const dy = (y + 0.5 - cy) / ry;
      if (dy < -1 || dy > 1) continue;
      const w = Math.sqrt(1 - dy * dy) * rx;
      const xa = Math.round(cx - w), xb = Math.round(cx + w);
      if (lvl >= 16) { if (xb > xa) g.fillRect(xa, y, xb - xa, 1); continue; }
      const row = BAYER[((y % 4) + 4) % 4];
      for (let x = xa; x < xb; x++) if (row[((x % 4) + 4) % 4] < lvl) g.fillRect(x, y, 1, 1);
    }
  }
  // a vertical ramp drawn as n hard bands with a dithered seam between each
  // a multi-stop vertical ramp, painted as n hard bands with dithered seams.
  // stops: [[t, '#rrggbb'], ...] with t from 0 (top) to 1 (bottom)
  function sampleStops(stops, t) {
    if (t <= stops[0][0]) return stops[0][1];
    for (let i = 1; i < stops.length; i++) {
      if (t <= stops[i][0]) {
        const a = stops[i - 1], b = stops[i];
        const u = b[0] === a[0] ? 0 : (t - a[0]) / (b[0] - a[0]);
        return U.mix(a[1], b[1], u);
      }
    }
    return stops[stops.length - 1][1];
  }
  function vramp(g, x, y, w, h, stops, n = 8) {
    const bh = h / n;
    for (let i = 0; i < n; i++) {
      const by = y + i * bh;
      g.fillStyle = sampleStops(stops, (i + 0.5) / n);
      g.fillRect(Math.round(x), Math.round(by), Math.round(w), Math.ceil(bh) + 1);
      if (i < n - 1) dither(g, x, by + bh * 0.6, w, bh * 0.45, sampleStops(stops, (i + 1.5) / n), 0.5);
    }
  }

  function vband(g, x, y, w, h, c0, c1, n = 6) {
    const bh = h / n;
    for (let i = 0; i < n; i++) {
      const by = y + i * bh;
      g.fillStyle = U.mix(c0, c1, n === 1 ? 0 : i / (n - 1));
      g.fillRect(Math.round(x), Math.round(by), Math.round(w), Math.ceil(bh) + 1);
      if (i < n - 1) {                                  // the seam, half a band of the next colour
        dither(g, x, by + bh * 0.62, w, bh * 0.4, U.mix(c0, c1, (i + 1) / (n - 1)), 0.5);
      }
    }
  }
  // a horizontal one, for skies that run sideways
  function hband(g, x, y, w, h, c0, c1, n = 6) {
    const bw = w / n;
    for (let i = 0; i < n; i++) {
      const bx = x + i * bw;
      g.fillStyle = U.mix(c0, c1, n === 1 ? 0 : i / (n - 1));
      g.fillRect(Math.round(bx), Math.round(y), Math.ceil(bw) + 1, Math.round(h));
      if (i < n - 1) dither(g, bx + bw * 0.62, y, bw * 0.4, h, U.mix(c0, c1, (i + 1) / (n - 1)), 0.5);
    }
  }
  // a pixel polyline, so nothing has to reach for g.stroke()
  function stroke(g, pts, col, w = 1) {
    for (let i = 0; i < pts.length - 1; i++) line(g, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], col, w);
  }
  // a quadratic, walked as line segments
  function curve(g, x0, y0, cx, cy, x1, y1, col, w = 1, n = 18) {
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const u = i / n, v = 1 - u;
      pts.push([v * v * x0 + 2 * v * u * cx + u * u * x1, v * v * y0 + 2 * v * u * cy + u * u * y1]);
    }
    stroke(g, pts, col, w);
  }
  // the outline of an ellipse, one pixel thick
  function ring(g, cx, cy, rx, ry, col, w = 1) {
    g.fillStyle = col;
    const n = Math.max(12, Math.round((rx + ry) * 1.6));
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU;
      g.fillRect(Math.round(cx + Math.cos(a) * rx), Math.round(cy + Math.sin(a) * ry), w, w);
    }
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
  // Light the top edge of a silhouette: one sun, upper left, for everything.
  function topLight(canvas, col = 'rgba(255,240,205,0.28)', depth = 2) {
    const g = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    const a = g.getImageData(0, 0, w, h).data;
    g.fillStyle = col;
    for (let x = 0; x < w; x++) {
      let first = -1;
      for (let y = 0; y < h; y++) if (a[(y * w + x) * 4 + 3] > 8) { first = y; break; }
      if (first >= 0) g.fillRect(x, first, 1, depth - (x % 2 === 0 ? 0 : 1));
    }
  }
  // Ordered dither over the lower half of a shape: reads as grain, not noise.
  function texture(canvas, alpha = 0.12) {
    const g = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    const img = g.getImageData(0, 0, w, h), a = img.data;
    const tops = new Int16Array(w).fill(-1);
    for (let x = 0; x < w; x++) for (let y = 0; y < h; y++) if (a[(y * w + x) * 4 + 3] > 8) { tops[x] = y; break; }
    for (let x = 0; x < w; x++) {
      if (tops[x] < 0) continue;
      for (let y = tops[x] + 3; y < h; y++) {
        const i = (y * w + x) * 4;
        if (a[i + 3] <= 8) continue;
        if (((x + y) & 1) === 0 && ((x >> 1) + y) % 3 !== 0) continue;   // bayer-ish mask
        const k = 1 - alpha * Math.min(1, (y - tops[x]) / Math.max(6, h - tops[x]) + 0.4);
        a[i] = a[i] * k; a[i + 1] = a[i + 1] * k; a[i + 2] = a[i + 2] * k;
      }
    }
    g.putImageData(img, 0, 0);
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
  // ---- real cast shadows --------------------------------------------------
  // Not an ellipse under everything: the sprite's own silhouette, leaned away
  // from the sun in the upper left, flattened to the ground and softened.
  const sils = new WeakMap();
  function silhouette(img, blur) {
    let s = sils.get(img);
    if (s) return s;
    const pad = 2;
    const { c, g } = cv(img.width + pad * 2, img.height + pad * 2);
    g.drawImage(img, pad, pad);
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = '#000'; g.fillRect(0, 0, c.width, c.height);
    g.globalCompositeOperation = 'source-over';
    if (blur !== false) {                       // one dilation pass: a soft edge
      const { c: c2, g: g2 } = cv(c.width, c.height);
      g2.globalAlpha = 0.5;
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) g2.drawImage(c, dx, dy);
      g2.globalAlpha = 1; g2.drawImage(c, 0, 0);
      sils.set(img, c2); return c2;
    }
    sils.set(img, c); return c;
  }
  // (x, y) is the ground point under the object. `anchor` is where the sprite's
  // feet sit across its own width, 0..1.
  function castShadow(g, img, x, y, w, h, opts) {
    const o = opts || {};
    const sil = silhouette(img, o.soft);
    const lean = o.lean == null ? 0.66 : o.lean;      // how far it falls to the right
    const squash = o.squash == null ? 0.34 : o.squash;
    const ax = o.anchor == null ? 0.5 : o.anchor;
    const sw = w * (sil.width / img.width), sh = h * (sil.height / img.height);
    g.save();
    g.globalAlpha = o.alpha == null ? 0.3 : o.alpha;
    g.translate(Math.round(x), Math.round(y));
    g.transform(1, 0, lean, squash, 0, 0);
    g.drawImage(sil, Math.round(-sw * ax), Math.round(-sh), Math.round(sw), Math.round(sh));
    g.restore();
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
  return { cv, ell, ellBand, rect, panel, line, poly, limb, speckle, outline, topLight, texture, underShade, flip, tinted, rng, silhouette, castShadow,
    dither, ditherEll, glow, vignette, vramp, sampleStops, vband, hband, stroke, curve, ring };
})();
