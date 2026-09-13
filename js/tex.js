// ---- Procedural tiling textures ------------------------------------------
// Flat gradients read as plastic. These are small seamless tiles painted a
// pixel at a time - wood grain and knots, paper fibre, brushed metal, beaten
// gold - handed to CSS as data URLs and to the canvas as repeat patterns.
const Tex = (() => {
  const urls = new Map(), pats = new Map(), tiles = new Map();

  function tile(name, w, h, draw) {
    let c = tiles.get(name);
    if (c) return c;
    const o = Art.cv(w, h);
    draw(o.g, w, h, Art.rng(name.length * 7717 + w * 31 + h));
    tiles.set(name, o.c);
    return o.c;
  }
  // wrap a dot into the tile so nothing shows a seam
  const dot = (g, x, y, w, h, col) => { g.fillStyle = col; g.fillRect(((x % w) + w) % w, ((y % h) + h) % h, 1, 1); };

  // ---- wood: grain running the long way, a couple of knots ---------------
  // Grain is laid down on a half-size tile and blown back up with smoothing
  // off, so every mark is a fat two-pixel block: the low-resolution wood the
  // rest of the art is drawn at, not a fine photographic grain.
  const CHUNK = 4;
  function wood(base, dark, light, knots) {
    return (g0, w0, h0, r) => {
      const w = Math.round(w0 / CHUNK), h = Math.round(h0 / CHUNK);
      const { c, g } = Art.cv(w, h);
      g.fillStyle = base; g.fillRect(0, 0, w, h);
      for (let i = 0; i < h * 1.1; i++) {                     // grain lines
        const y0 = 1 + r() * (h - 2), k = 1 + Math.floor(r() * 3);
        const amp = 0.4 + r() * 0.8, ph = r() * TAU;
        const col = r() < 0.5 ? dark : light;
        const a = 0.34 + r() * 0.5;
        g.globalAlpha = a;
        for (let x = 0; x < w; x++) {
          const y = Math.round(y0 + Math.sin((x / w) * TAU * k + ph) * amp);
          g.fillStyle = col; g.fillRect(x, ((y % h) + h) % h, 1, 1);
        }
        g.globalAlpha = 1;
      }
      for (let i = 0; i < (knots || 2); i++) {                 // knots, kept off the seams
        const kx = 3 + r() * (w - 6), ky = 2 + r() * (h - 4);
        for (let ring = 4; ring >= 1; ring--) {
          g.globalAlpha = 0.5;
          Art.ell(g, kx, ky, ring * 0.62, ring * 0.42, ring % 2 ? dark : light);
        }
        g.globalAlpha = 0.75; Art.ell(g, kx, ky, 0.7, 0.5, dark);
        g.globalAlpha = 1;
      }
      for (let i = 0; i < w * h * 0.035; i++) dot(g, r() * w, r() * h, w, h, r() < 0.5 ? dark : light);
      g0.imageSmoothingEnabled = false;                        // blow it back up in blocks
      g0.drawImage(c, 0, 0, w0, h0);
    };
  }
  // ---- paper: fibre, laid lines, a few old stains ------------------------
  function paper(base, dark, light, stain) {
    return (g, w, h, r) => {
      g.fillStyle = base; g.fillRect(0, 0, w, h);
      for (let y = 3; y < h; y += 7) {                         // laid lines
        g.globalAlpha = 0.16; g.fillStyle = dark; g.fillRect(0, y, w, 1);
        g.globalAlpha = 0.1; g.fillStyle = light; g.fillRect(0, y + 1, w, 1);
      }
      g.globalAlpha = 1;
      for (let i = 0; i < w * h * 0.15; i++) {                 // fibre
        const q = r();
        dot(g, r() * w, r() * h, w, h, q < 0.42 ? dark : q < 0.84 ? light : base);
      }
      for (let i = 0; i < 3; i++) {                            // stains
        const sx = 10 + r() * (w - 20), sy = 8 + r() * (h - 16), sr = 4 + r() * 7;
        g.globalAlpha = 0.07;
        Art.ell(g, sx, sy, sr, sr * 0.7, stain || dark);
        g.globalAlpha = 0.05;
        Art.ell(g, sx + 2, sy + 1, sr * 0.6, sr * 0.45, stain || dark);
        g.globalAlpha = 1;
      }
    };
  }
  // ---- metal: brushed the short way, with a bright band ------------------
  function metal(base, dark, light) {
    return (g, w, h, r) => {
      g.fillStyle = base; g.fillRect(0, 0, w, h);
      for (let x = 0; x < w; x++) {
        const q = r();
        g.globalAlpha = 0.12 + r() * 0.3;
        g.fillStyle = q < 0.45 ? dark : light;
        g.fillRect(x, 0, 1, h);
      }
      g.globalAlpha = 1;
      for (let i = 0; i < w * h * 0.12; i++) dot(g, r() * w, r() * h, w, h, r() < 0.5 ? dark : light);
    };
  }
  // ---- gold: beaten, with hammer dents and a sparkle or two --------------
  function beaten(base, dark, light) {
    return (g, w, h, r) => {
      g.fillStyle = base; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 22; i++) {                           // hammer dents
        const dx = 3 + r() * (w - 6), dy = 3 + r() * (h - 6), dr = 1.6 + r() * 2.4;
        g.globalAlpha = 0.2; Art.ell(g, dx, dy + 0.8, dr, dr * 0.8, dark);
        g.globalAlpha = 0.24; Art.ell(g, dx - 0.5, dy - 0.6, dr * 0.7, dr * 0.5, light);
      }
      g.globalAlpha = 1;
      for (let i = 0; i < w * h * 0.1; i++) dot(g, r() * w, r() * h, w, h, r() < 0.5 ? dark : light);
      for (let i = 0; i < 3; i++) {                            // a glint
        const sx = 4 + r() * (w - 8), sy = 4 + r() * (h - 8);
        g.fillStyle = light; g.fillRect(sx, sy, 1, 1); g.fillRect(sx + 1, sy, 1, 1);
      }
    };
  }

  const DEF = {
    wood:     [72, 40, wood('#8f6238', '#5b3a1c', '#c49461', 2)],
    darkwood: [72, 40, wood('#6b4526', '#3f2611', '#a2714a', 2)],
    cellwood: [48, 48, wood('#5e3f22', '#33200f', '#8a6236', 1)],
    paper:    [72, 72, paper('#c2a176', '#8d6a44', '#e3cda2', '#9a7248')],
    paper2:   [72, 72, paper('#d8bd92', '#a5825a', '#f2e2bd', '#a9814f')],
    metal:    [26, 26, metal('#4fa6be', '#22647a', '#a6e3f2')],
    gold:     [26, 26, beaten('#e0a82e', '#9a6c12', '#ffeaa8')],
    amber:    [26, 26, beaten('#cf7a2a', '#8a440f', '#ffc98a')],
    slate:    [26, 26, metal('#3f5f8f', '#1e3050', '#9fbde6')],
  };

  function canvas(name) {
    const d = DEF[name];
    if (!d) return null;
    return tile(name, d[0], d[1], d[2]);
  }
  function url(name) {
    let u = urls.get(name);
    if (u !== undefined) return u;
    const c = canvas(name);
    u = c ? c.toDataURL() : '';
    urls.set(name, u);
    return u;
  }
  // a repeat pattern for the game canvas; the tile is shared with CSS
  function pat(g, name) {
    let p = pats.get(name);
    if (p !== undefined) return p;
    const c = canvas(name);
    p = c ? g.createPattern(c, 'repeat') : null;
    pats.set(name, p);
    return p;
  }
  // fill a rect with a texture, tinted by whatever is already underneath
  function fill(g, name, x, y, w, h, alpha) {
    const p = pat(g, name);
    if (!p) return;
    g.save();
    if (alpha != null) g.globalAlpha = alpha;
    g.fillStyle = p;
    g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
    g.restore();
  }
  // hand every tile to CSS as a custom property
  function install() {
    const root = document.documentElement.style;
    for (const k of Object.keys(DEF)) root.setProperty('--tex-' + k, `url(${url(k)})`);
  }
  return { url, canvas, pat, fill, install, names: () => Object.keys(DEF) };
})();
