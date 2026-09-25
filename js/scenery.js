// ---- Scenery: the country the road runs through --------------------------------
// One painter for every place the car is seen driving: the title screen, the
// drive into the village, and every hop on the map. It is layered like a
// picture book, each layer painted once into a long strip that tiles, and each
// strip sliding past at its own speed:
//
//   sky        blue going to cream at the horizon, a warm sun, big soft clouds
//   ranges     two blue mountain ridges, lit on the sunny faces
//   patchwork  far hills cut into fields by hedgerows, farmhouses, a silo
//   paddocks   nearer hills: gum trees, hay rolls, fences, the odd cow
//   forest     a dense wood of the grove's own trees, with a floor under it
//   verge      a grassy bank, wildflowers, a post-and-wire fence
//   road       gravel shoulder, kerb, tar with patches and cracks, the lines
//   near       the grass right at your feet, going past in a blur
//
// Callers can add their own things between the verge and the fence (signs,
// shops, a whole village) through `o.between(g)`.
const Scenery = (() => {
  const VW = 640, VH = 360;
  const PW = 1280;                               // every strip tiles at this width
  let built = null;

  const wrap = (v, s) => ((v % s) + s) % s;
  // periodic noise: a few sines whose periods all divide the strip, so the
  // right edge of every strip meets its own left edge
  function pnoise(seed, terms) {
    const r = Art.rng(seed);
    const ts = terms.map(([k, a]) => ({ k, a, p: r() * TAU }));
    return (x) => { let s = 0; for (const q of ts) s += q.a * Math.sin((TAU * q.k * x) / PW + q.p); return s; };
  }
  const px = (g, x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
  const BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const bay = (x, y) => BAY[(y & 3) * 4 + (x & 3)] / 16;
  // draw a strip twice so it always covers the screen
  function strip(g, c, off, y) {
    const ox = -Math.round(wrap(off, PW));
    g.drawImage(c, ox, y); g.drawImage(c, ox + PW, y);
  }
  // place something across the seam as well, so it tiles
  const both = (x, fn) => { fn(x); if (x < 120) fn(x + PW); if (x > PW - 120) fn(x - PW); };

  // ---- sky ---------------------------------------------------------------------
  function paintSky() {
    const { c, g } = Art.cv(VW, 300);
    Art.vramp(g, 0, 0, VW, 300, [[0, '#5aa2dc'], [0.35, '#86c0e8'], [0.7, '#c4e2f0'], [0.9, '#f2eed6'], [1, '#fbe8c4']], 16);
    const sx = 500, sy = 70;                    // the sun, with rings of warm light round it
    for (let i = 7; i >= 1; i--) Art.ell(g, sx, sy, 20 + i * 11, 20 + i * 11, U.rgba('#fff4c8', 0.055));
    Art.ell(g, sx, sy, 21, 21, '#ffe79a'); Art.ell(g, sx, sy, 17, 17, '#fff5cc'); Art.ell(g, sx - 4, sy - 4, 7, 7, '#fffbea');
    return c;
  }
  // big cumulus, lit from the sun side, shaded underneath, flat-bottomed
  function paintClouds() {
    const { c, g } = Art.cv(PW, 150);
    const r = Art.rng(4242);
    for (let i = 0; i < 9; i++) {
      const cx = (i / 9) * PW + r() * 80, cy = 30 + r() * 80, w = 50 + r() * 70;
      both(cx, (x) => cloud(g, x, cy, w, r));
    }
    return c;
  }
  function cloud(g, x, y, w, r) {
    const puffs = [];
    const n = 4 + Math.floor(w / 22);
    for (let i = 0; i < n; i++) {
      const u = i / (n - 1) - 0.5;
      puffs.push([x + u * w * 1.3, y - Math.cos(u * Math.PI) * w * 0.22, w * (0.22 + 0.16 * Math.cos(u * Math.PI))]);
    }
    for (const [cx, cy, rr] of puffs) Art.ell(g, cx, cy + 4, rr, rr * 0.8, '#b8d2e6');          // the grey belly
    for (const [cx, cy, rr] of puffs) Art.ell(g, cx, cy + 1, rr * 0.96, rr * 0.76, '#e4eff6');
    for (const [cx, cy, rr] of puffs) Art.ell(g, cx - rr * 0.18, cy - rr * 0.12, rr * 0.72, rr * 0.56, '#ffffff');
    Art.rect(g, x - w * 0.7, y + w * 0.08, w * 1.4, w * 0.14, '#cfe0ec');                   // the flat base
    Art.rect(g, x - w * 0.62, y + w * 0.2, w * 1.24, 1, '#b8d2e6');
  }

  // ---- the ranges -----------------------------------------------------------------
  function paintRange(seed, base, top, cols) {
    const { c, g } = Art.cv(PW, 150);
    // peaks: folded sines, so the ridges come to points instead of domes
    const r = Art.rng(seed);
    const ks = [[4, 26], [9, 14], [17, 7], [37, 3]].map(([k, a]) => ({ k, a, p: r() * TAU }));
    const ridge = (x) => { let s2 = 0; for (const q of ks) s2 += q.a * (1 - Math.abs(Math.sin((Math.PI * q.k * x) / PW + q.p))); return s2; };
    const ys = new Float32Array(PW + 8);
    for (let x = 0; x < PW + 8; x++) ys[x] = top + 30 - ridge(x);
    for (let x = 0; x < PW; x++) {
      const y = Math.round(ys[x]);
      const sl = ys[(x + 3) % PW] - ys[(x - 3 + PW) % PW];      // positive: falling away to the right
      const H = base - y;
      for (let yy = y; yy < base; yy++) {
        const k = (yy - y) / Math.max(1, H);
        // a sunlit face and a shaded one, with a dithered seam, fading into haze
        const litness = U.clamp(0.5 + sl * 0.12 - k * 0.3, 0, 1);
        let col = bay(x, yy) < litness ? cols.lit : cols.dark;
        if (k > 0.45) col = bay(x, yy) < (k - 0.45) * 2.2 ? cols.mid : col;
        if (k > 0.72) col = bay(x, yy) < (k - 0.72) * 3.6 ? cols.haze : col;
        px(g, x, yy, 1, 1, col);
      }
      px(g, x, y, 1, 1, cols.rim);
      // snow on the highest tops, down the gullies a little way
      if (cols.snow && y < top - 4) {
        const deep = Math.round((top - 4 - y) * 0.8 + (x % 5 === 0 ? 2 : 0));
        for (let yy = y; yy < y + deep; yy++) px(g, x, yy, 1, 1, sl > 0 ? cols.snow : cols.snow2);
      }
    }
    return c;
  }

  // ---- the patchwork: far hills cut into fields ----------------------------------
  function paintPatch() {
    const H0 = 70, { c, g } = Art.cv(PW, H0 + 10);
    const n = pnoise(911, [[2, 9], [5, 6], [11, 3], [23, 1.2]]);
    const top = (x) => Math.round(24 + n(x));
    const r = Art.rng(77);
    const FIELD = ['#a6cf7e', '#b9d98a', '#e2d27c', '#94c472', '#cfe09a', '#d8c070', '#8cbc6c', '#b2d48e'];
    // fields: runs of columns, each run a field with its own crop rows
    const cuts = [0];
    while (cuts[cuts.length - 1] < PW) cuts.push(cuts[cuts.length - 1] + 38 + Math.floor(r() * 80));
    cuts[cuts.length - 1] = PW;
    const bands = [0, 0.38, 0.7];                  // two hedgerows across the slope as well
    for (let f = 0; f < cuts.length - 1; f++) {
      for (let b = 0; b < bands.length; b++) {
        const col = FIELD[Math.floor(r() * FIELD.length)];
        const rows = r() < 0.6, dk = U.shade(col, -0.1), lt = U.shade(col, 0.08);
        for (let x = cuts[f]; x < cuts[f + 1]; x++) {
          const t0 = top(x), span = H0 - t0;
          const y0 = Math.round(t0 + span * bands[b]), y1 = Math.round(t0 + span * (bands[b + 1] || 1));
          for (let y = y0; y < y1; y++) {
            let cc = col;
            if (rows && (y + Math.floor((x - cuts[f]) * 0.25)) % 3 === 0) cc = dk;
            else if (y === y0) cc = lt;
            px(g, x, y, 1, 1, cc);
          }
          if (b > 0) px(g, x, y0, 1, 1, (x + b) % 3 ? '#5f8a44' : '#4e7a3a');   // the hedge line
        }
      }
      // the hedge between fields, with a few trees standing in it
      for (let x = cuts[f]; x < cuts[f] + 2; x++) for (let y = top(x); y < H0; y++) px(g, x, y, 1, 1, (y % 3) ? '#5f8a44' : '#4e7a3a');
      for (let k = 0; k < 2; k++) if (r() < 0.8) {
        const tx = cuts[f] + 1, ty = top(tx) + Math.floor(r() * (H0 - top(tx) - 8)) + 4;
        Art.ell(g, tx, ty, 3.5, 3, '#446c32'); Art.ell(g, tx - 1, ty - 1, 2.2, 1.8, '#6a9a4a');
      }
    }
    for (let x = 0; x < PW; x++) px(g, x, top(x), 1, 1, '#c6e4a2');              // the lit crest
    // farmhouses, a barn and a silo, and sheep in the pale fields
    for (let i = 0; i < 7; i++) {
      const hx = Math.floor(((i + 0.5) / 7) * PW + (r() - 0.5) * 60), hy = top(hx) + 10 + Math.floor(r() * 18);
      both(hx, (x) => farmhouse(g, x, hy, r() < 0.3));
    }
    for (let i = 0; i < 60; i++) {
      const sx = Math.floor(r() * PW), sy = top(sx) + 6 + Math.floor(r() * (H0 - top(sx) - 8));
      px(g, sx, sy, 2, 1, '#fbfbf2'); px(g, sx + 2, sy, 1, 1, '#3a3430');
    }
    return c;
  }
  function farmhouse(g, x, y, barn) {
    if (barn) {
      px(g, x - 5, y - 6, 10, 6, '#b8442e'); px(g, x - 6, y - 8, 12, 2, '#7a2a1c'); px(g, x - 4, y - 9, 8, 1, '#7a2a1c');
      px(g, x - 1, y - 4, 2, 4, '#f2e8d2');
      px(g, x + 7, y - 13, 4, 13, '#d8d8d0'); px(g, x + 7, y - 14, 4, 1, '#a8a8a0'); px(g, x + 9, y - 13, 2, 13, '#b8b8b0');
    } else {
      px(g, x - 4, y - 5, 9, 5, '#f6f0e0'); px(g, x - 4, y - 5, 1, 5, '#d8d0c0');
      px(g, x - 5, y - 7, 11, 2, '#c8503a'); px(g, x - 3, y - 8, 7, 1, '#c8503a');
      px(g, x - 2, y - 3, 1, 2, '#6a8ab0'); px(g, x + 2, y - 3, 1, 2, '#6a8ab0');
      px(g, x + 3, y - 10, 1, 2, '#9a8a80');
    }
  }

  // ---- paddocks: the nearer hills ----------------------------------------------------
  function paintPaddock() {
    const H0 = 70, { c, g } = Art.cv(PW, H0 + 30);
    const n = pnoise(4411, [[3, 10], [6, 5], [14, 2.5], [31, 1]]);
    const top = (x) => Math.round(38 + n(x));
    const r = Art.rng(1203);
    for (let x = 0; x < PW; x++) {
      const t0 = top(x), sl = n(x + 2) - n(x - 2);
      for (let y = t0; y < H0 + 30; y++) {
        const k = (y - t0) / 50;
        let col = sl > 0.3 ? '#7ab456' : sl < -0.3 ? '#94c86a' : '#88c060';
        if (k > 0.4 && bay(x, y) < (k - 0.4) * 2) col = '#7ab052';
        if ((x * 7 + y * 13) % 29 === 0) col = '#a8d47c';
        px(g, x, y, 1, 1, col);
      }
      px(g, x, t0, 1, 1, '#b4de86');
    }
    // a fence running along the slope
    for (let x = 0; x < PW; x++) {
      const fy = top(x) + 16;
      if (x % 12 === 0) { px(g, x, fy - 5, 1, 6, '#7a5a3a'); px(g, x, fy - 5, 1, 1, '#a88460'); }
      px(g, x, fy - 3, 1, 1, '#8a6a48');
    }
    // round hay rolls in the cut paddocks
    for (let i = 0; i < 22; i++) {
      const hx = Math.floor(r() * PW), hy = top(hx) + 24 + Math.floor(r() * 26);
      both(hx, (x) => { Art.ell(g, x, hy, 3.5, 3, '#b8963c'); Art.ell(g, x - 0.5, hy - 0.5, 2.6, 2.2, '#e0c462'); px(g, x - 1, hy - 1, 1, 1, '#f6e08a'); });
    }
    // cows, lying down and standing
    for (let i = 0; i < 10; i++) {
      const cx = Math.floor(r() * PW), cy = top(cx) + 30 + Math.floor(r() * 24);
      both(cx, (x) => { px(g, x - 3, cy - 3, 6, 3, '#3a2e28'); px(g, x - 1, cy - 3, 2, 1, '#f6f0e4'); px(g, x + 3, cy - 4, 2, 2, '#3a2e28'); px(g, x - 3, cy, 1, 2, '#3a2e28'); px(g, x + 2, cy, 1, 2, '#3a2e28'); });
    }
    // gum trees, pale trunks and clumped olive crowns
    for (let i = 0; i < 26; i++) {
      const gx = Math.floor(((i + r() * 0.8) / 26) * PW), gy = top(gx) + 4 + Math.floor(r() * 30);
      const s = 0.8 + r() * 0.7;
      both(gx, (x) => gum(g, x, gy, s, r));
    }
    return c;
  }
  function gum(g, x, y, s, r) {
    const h = Math.round(18 * s);
    Art.limb(g, x, y, x + 1, y - h, 2 * s, 1.2 * s, '#e8dcc4');
    Art.limb(g, x + 1, y - h * 0.6, x + 5 * s, y - h * 0.9, 1, 0.6, '#d8ccb4');
    const cl = [[0, -h, 7], [-5, -h + 3, 5], [6, -h + 2, 5.5], [2, -h - 4, 5]];
    for (const [dx, dy, rr] of cl) Art.ell(g, x + dx * s, y + dy + 1, rr * s, rr * s * 0.8, '#4f6e3a');
    for (const [dx, dy, rr] of cl) Art.ell(g, x + dx * s - 1, y + dy, rr * s * 0.8, rr * s * 0.62, '#6f8e4a');
    for (const [dx, dy, rr] of cl) Art.ell(g, x + dx * s - 2, y + dy - 1, rr * s * 0.4, rr * s * 0.3, '#94b064');
  }

  // ---- the forest ---------------------------------------------------------------------
  // The grove's own trees, three ranks deep and packed close, with a floor of
  // shrubs and ferns under them so not one of them floats.
  function paintForest() {
    const H0 = 134, { c, g } = Art.cv(PW, H0);
    const r = Art.rng(5150);
    const KINDS = ['oak', 'pine', 'oak', 'birch', 'gnarl', 'oak'];
    const rank = (n, base, sc, sh, jit) => {
      for (let i = 0; i < n; i++) {
        const x = Math.floor((i / n) * PW + r() * jit);
        const kind = KINDS[Math.floor(r() * KINDS.length)];
        const img = Props.get('tree', `${kind}|${Math.floor(r() * 6)}|${sh.toFixed(2)}`);
        const s = sc * (0.85 + r() * 0.3), w = img.width * s, h = img.height * s;
        const y = base + Math.floor(r() * 5);
        both(x, (xx) => g.drawImage(img, Math.round(xx - w / 2), Math.round(y - h), Math.round(w), Math.round(h)));
      }
    };
    // a dark wall behind it all, so there is no sky between the trunks
    for (let x = 0; x < PW; x++) {
      const y = 70 + Math.round(Math.sin(x * 0.07) * 4 + Math.sin(x * 0.023) * 6);
      px(g, x, y, 1, H0 - y, '#4d7a3c');
      px(g, x, y, 1, 2, '#6a9a4c');
    }
    rank(34, 102, 0.46, 0.32, 20);
    for (let x = 0; x < PW; x++) px(g, x, 100, 1, H0 - 100, '#58853f');
    bushes(g, r, 103, 0.8, ['#3f6a30', '#58853f', '#78a852']);
    rank(26, 120, 0.6, 0.16, 30);
    for (let x = 0; x < PW; x++) { px(g, x, 118, 1, H0 - 118, '#6a9a48'); if (x % 3 === 0) px(g, x, 117, 1, 1, '#8cbc5c'); }
    bushes(g, r, 122, 1, ['#4a7a36', '#6a9a48', '#8cc060']);
    // ferns and flowers along the very front of the wood
    for (let i = 0; i < 90; i++) {
      const fx = Math.floor(r() * PW), fy = 124 + Math.floor(r() * 8);
      both(fx, (x) => fern(g, x, fy, 0.8 + r() * 0.6));
    }
    for (let i = 0; i < 70; i++) {
      const fx = Math.floor(r() * PW), fy = 126 + Math.floor(r() * 7);
      px(g, fx, fy, 1, 1, ['#fff6e0', '#f4c0d0', '#ffe07a', '#c8b0f0'][i % 4]);
    }
    return c;
  }
  function bushes(g, r, base, s, cols) {
    for (let i = 0; i < 70; i++) {
      const bx = Math.floor(r() * PW), rr = (5 + r() * 7) * s;
      both(bx, (x) => {
        Art.ell(g, x, base - rr * 0.4, rr, rr * 0.7, cols[0]);
        Art.ell(g, x - rr * 0.15, base - rr * 0.55, rr * 0.8, rr * 0.52, cols[1]);
        Art.ell(g, x - rr * 0.35, base - rr * 0.75, rr * 0.4, rr * 0.26, cols[2]);
      });
    }
  }
  function fern(g, x, y, s) {
    for (let k = -2; k <= 2; k++) Art.limb(g, x, y, x + k * 3 * s, y - (6 - Math.abs(k)) * s, 1, 0.5, k % 2 ? '#4f8a3a' : '#6aa84a');
  }

  // ---- the verge ------------------------------------------------------------------------
  function paintVerge() {
    const H0 = 34, { c, g } = Art.cv(PW, H0);
    const r = Art.rng(3131);
    for (let x = 0; x < PW; x++) for (let y = 0; y < H0; y++) {
      let col = y < 2 ? '#9ad066' : '#7cbc50';
      const q = (x * 13 + y * 7) % 11;
      if (q === 0) col = '#94cc62'; else if (q === 5 && y > 4) col = '#6aa844';
      if (y > H0 - 5) col = bay(x, y) < (y - (H0 - 5)) / 5 ? '#b8a070' : col;   // it thins to dust at the road
      px(g, x, y, 1, 1, col);
    }
    for (let i = 0; i < 700; i++) {                                               // blades
      const bx = Math.floor(r() * PW), by = 3 + Math.floor(r() * (H0 - 8));
      px(g, bx, by, 1, 2 + Math.floor(r() * 3), r() < 0.5 ? '#a8dc74' : '#5e9a3e');
    }
    for (let i = 0; i < 160; i++) {                                               // wildflowers
      const fx = Math.floor(r() * PW), fy = 4 + Math.floor(r() * (H0 - 10));
      const col = ['#fff6e0', '#ffd24a', '#f49ab4', '#b89af0', '#ff8a5a'][Math.floor(r() * 5)];
      px(g, fx, fy + 1, 1, 2, '#4f8a3a'); px(g, fx - 1, fy, 3, 1, col); px(g, fx, fy - 1, 1, 3, col); px(g, fx, fy, 1, 1, '#fff2a0');
    }
    for (let i = 0; i < 26; i++) {                                                // stones
      const sx = Math.floor(r() * PW), sy = H0 - 6 + Math.floor(r() * 3);
      px(g, sx, sy, 4, 2, '#9a8a78'); px(g, sx, sy, 3, 1, '#c8baa4');
    }
    return c;
  }
  // a post-and-wire fence, with a weathered post every so often
  function paintFence() {
    const { c, g } = Art.cv(PW, 30);
    for (let x = 0; x < PW; x += 40) {
      px(g, x, 4, 5, 26, '#3a2616'); px(g, x + 1, 5, 3, 25, '#a07a52'); px(g, x + 1, 5, 1, 25, '#c49a6a');
      px(g, x + 1, 4, 3, 1, '#d8b488');
    }
    for (const y of [9, 17]) { for (let x = 0; x < PW; x++) px(g, x, y + Math.round(Math.sin((x % 40) / 40 * Math.PI) * 1.2), 1, 1, '#6a6a6a'); }
    return c;
  }

  // ---- the road ---------------------------------------------------------------------------
  // Seen from the side: a gravel shoulder, a white kerb line, two lanes of tar
  // with the centre line dashed down the middle, and the far shoulder.
  const RH = 50;
  function paintRoad() {
    const { c, g } = Art.cv(PW, RH);
    const r = Art.rng(2024);
    for (let x = 0; x < PW; x++) for (let y = 0; y < RH; y++) {
      let col;
      if (y < 4) col = ['#a89478', '#bca888', '#8e7c64'][(x * 7 + y * 3) % 3];      // far gravel
      else if (y < 6) col = '#e8e4d8';                                              // the edge line
      else if (y < RH - 7) {
        const k = (y - 6) / (RH - 13);
        col = k < 0.1 ? '#58545e' : '#4c4852';
        const q = (x * 31 + y * 17) % 23;
        if (q === 0) col = '#6a6670'; else if (q === 7) col = '#3e3a44';
        if (k > 0.85 && bay(x, y) < (k - 0.85) * 5) col = '#44404a';
      } else if (y < RH - 5) col = '#e8e4d8';
      else col = ['#a89478', '#8e7c64', '#bca888'][(x * 5 + y) % 3];
      px(g, x, y, 1, 1, col);
    }
    // tar patches and a few cracks, because it is a country road
    for (let i = 0; i < 16; i++) {
      const x = Math.floor(r() * PW), y = 9 + Math.floor(r() * (RH - 22)), w = 10 + Math.floor(r() * 30);
      px(g, x, y, w, 4 + Math.floor(r() * 5), '#403c46');
      px(g, x, y, w, 1, '#56525c');
    }
    for (let i = 0; i < 24; i++) {
      let x = Math.floor(r() * PW), y = 8 + Math.floor(r() * (RH - 20));
      for (let k = 0; k < 8; k++) { px(g, x, y, 1, 1, '#34303a'); x += r() < 0.5 ? 1 : 2; y += Math.floor(r() * 3) - 1; }
    }
    // the centre line: yellow dashes, worn at the ends
    const cy = Math.round(RH / 2) - 1;
    for (let x = 0; x < PW; x += 40) {
      px(g, x, cy, 22, 3, '#f2d45a'); px(g, x, cy, 22, 1, '#fff0a0');
      px(g, x, cy + 2, 1, 1, '#4c4852'); px(g, x + 21, cy, 1, 1, '#4c4852');
    }
    return c;
  }
  // the near grass going past under the car
  function paintNear() {
    const H0 = 40, { c, g } = Art.cv(PW, H0);
    const r = Art.rng(99);
    for (let x = 0; x < PW; x++) for (let y = 0; y < H0; y++) px(g, x, y, 1, 1, y < 3 ? '#9a8a6a' : ((x * 3 + y * 5) % 7 ? '#5e9a3e' : '#6aa848'));
    for (let i = 0; i < 180; i++) {
      const bx = Math.floor(r() * PW), h = 6 + Math.floor(r() * 12);
      Art.limb(g, bx, H0, bx + (r() - 0.5) * 6, H0 - h - 6, 2, 0.6, r() < 0.5 ? '#4a8a34' : '#78b852');
    }
    for (let i = 0; i < 30; i++) {
      const fx = Math.floor(r() * PW), fy = 6 + Math.floor(r() * 20);
      Art.ell(g, fx, fy, 2.2, 2, ['#fff6e0', '#ffd24a', '#f49ab4'][i % 3]); px(g, fx, fy, 1, 1, '#e0a03a');
    }
    return c;
  }

  function build() {
    if (built) return built;
    built = {
      sky: paintSky(), clouds: paintClouds(),
      far: paintRange(71, 120, 58, { lit: '#a8c2e0', dark: '#8aa6cc', mid: '#9cb6d6', haze: '#cadcea', rim: '#c4d6ea', snow: '#f4f8fc', snow2: '#d4e2f0' }),
      near: paintRange(307, 120, 82, { lit: '#8eb4c4', dark: '#7098b0', mid: '#80a6ba', haze: '#b6d0d8', rim: '#a8c8d4' }),
      patch: paintPatch(), paddock: paintPaddock(), forest: paintForest(),
      verge: paintVerge(), fence: paintFence(), road: paintRoad(), grass: paintNear(),
    };
    return built;
  }

  // ---- the whole picture --------------------------------------------------------------------
  // `d` is how far the car has come, in pixels at road speed. `o.road` is the
  // screen row the tar starts on; everything else hangs off it.
  function paint(g, d, o = {}) {
    const B = build();
    const R = o.road || 300;
    const T = o.t || 0;
    g.drawImage(B.sky, 0, 0, VW, R, 0, 0, VW, R);
    strip(g, B.clouds, d * 0.02 + T * 4, 6);
    strip(g, B.far, d * 0.03, R - 245);
    strip(g, B.near, d * 0.06, R - 222);
    strip(g, B.patch, d * 0.1, R - 150);
    strip(g, B.paddock, d * 0.2, R - 143);
    if (o.far) o.far(g, R);
    strip(g, B.forest, d * (o.forestRate || 0.45), R - 148);
    strip(g, B.verge, d, R - 34);
    if (o.between) o.between(g, R);
    const gaps = (o.fenceGaps || []).filter(([a, b]) => b > 0 && a < VW).sort((p, q) => p[0] - q[0]);
    if (gaps.length) {
      // no fence along a village street or across a gateway: draw it round the gaps
      g.save(); g.beginPath();
      let x = 0;
      for (const [a, b] of gaps) { if (a > x) g.rect(Math.round(x), R - 30, Math.round(a - x), 30); x = Math.max(x, b); }
      if (x < VW) g.rect(Math.round(x), R - 30, VW - Math.round(x), 30);
      g.clip(); strip(g, B.fence, d, R - 30); g.restore();
    } else strip(g, B.fence, d, R - 30);
    strip(g, B.road, d, R);
    if (o.onRoad) o.onRoad(g, R);
    strip(g, B.grass, d * 1.5, R + RH);
    if (R + RH + 40 < VH) px(g, 0, R + RH + 40, VW, VH - R - RH - 40, '#4a8a34');
  }

  // ---- buildings for a village ------------------------------------------------------------------
  // Weatherboard cottages with tin roofs and verandahs, and a row of shops
  // with painted signs and awnings: a country town, drawn once each and cached.
  const bcache = new Map();
  function building(kind, v = 0) {
    const key = kind + '|' + v;
    if (bcache.has(key)) return bcache.get(key);
    const r = Art.rng(v * 131 + kind.length * 17);
    let out;
    if (kind === 'house') out = house(r, v);
    else if (kind === 'church') out = church();
    else out = shop(kind, r);
    bcache.set(key, out);
    return out;
  }
  const WALLS = [['#f4ecd8', '#d8ccb0'], ['#cfe2e4', '#a8c4c8'], ['#f2d8c4', '#d4b49c'], ['#e4ecc8', '#c4d0a0'], ['#f6e6a8', '#d8c47c']];
  const ROOFS = [['#b8442e', '#8a2e1e'], ['#4f7a5a', '#355a40'], ['#8a9aa6', '#66747e'], ['#a8583a', '#7a3a24']];
  function house(r, v) {
    const W = 88 + Math.floor(r() * 24), H = 86, { c, g } = Art.cv(W + 10, H);
    const wall = WALLS[v % WALLS.length], roof = ROOFS[(v + 1) % ROOFS.length];
    const wy = 40, wh = 38, x0 = 5, x1 = W + 5;
    // walls: weatherboards, a shadow line under every one
    px(g, x0 + 4, wy, W - 8, wh, wall[0]);
    for (let y = wy + 2; y < wy + wh; y += 4) px(g, x0 + 4, y, W - 8, 1, wall[1]);
    px(g, x0 + 3, wy, 1, wh, '#3a2a1e'); px(g, x1 - 4, wy, 1, wh, '#3a2a1e');
    // the roof: corrugated iron, ridged, with a chimney
    for (let i = 0; i < 18; i++) {
      const y = 12 + i, inset = Math.round((18 - i) * 1.6);
      px(g, x0 + inset, y, W - inset * 2, 1, i % 2 ? roof[0] : U.shade(roof[0], 0.06));
    }
    for (let x = x0 + 2; x < x1 - 2; x += 3) px(g, x, 12 + Math.max(0, Math.round(18 - Math.min(x - x0, x1 - x) / 1.6)), 1, 30, roof[1]);
    px(g, x0 - 1, 29, W + 2, 3, roof[1]); px(g, x0 - 1, 29, W + 2, 1, U.shade(roof[0], 0.2));
    const chx = x0 + Math.floor(W * 0.7);
    px(g, chx, 4, 8, 14, '#9a4a32'); px(g, chx - 1, 3, 10, 2, '#6a3020'); px(g, chx + 1, 6, 2, 10, '#b86040');
    // the verandah: a skillion of tin on white posts, lacework under the edge
    px(g, x0 - 2, 32, W + 4, 6, U.shade(roof[0], 0.12));
    for (let x = x0 - 2; x < x1 + 2; x += 2) px(g, x, 32, 1, 6, roof[1]);
    px(g, x0 - 2, 38, W + 4, 1, '#3a2a1e');
    for (let x = x0; x < x1; x += 4) { px(g, x, 39, 2, 2, '#f6f4ee'); px(g, x + 1, 41, 1, 1, '#f6f4ee'); }
    for (const pxx of [x0, x0 + Math.floor(W / 3), x0 + Math.floor(W * 2 / 3), x1 - 3]) { px(g, pxx, 38, 3, 40, '#f6f4ee'); px(g, pxx + 2, 38, 1, 40, '#c8c4b8'); }
    // windows with curtains and a flower box, a door with a light over it
    const win = (x) => {
      px(g, x - 1, 45, 16, 16, '#f6f4ee'); px(g, x, 46, 14, 14, '#86b8d4');
      px(g, x, 46, 14, 3, '#cfe6f0'); px(g, x + 6, 46, 2, 14, '#f6f4ee'); px(g, x, 52, 14, 1, '#f6f4ee');
      px(g, x, 46, 3, 14, '#f0b0b8'); px(g, x + 11, 46, 3, 14, '#f0b0b8');
      px(g, x - 1, 61, 16, 3, '#8a5a34');
      for (let k = 0; k < 7; k++) px(g, x + k * 2, 59, 2, 2, ['#f06a6a', '#ffd24a', '#f6f4ee', '#f49ab4'][k % 4]);
    };
    win(x0 + 12); win(x1 - 30);
    const dx = x0 + Math.floor(W / 2) - 6;
    px(g, dx - 1, 50, 14, 28, '#f6f4ee'); px(g, dx, 51, 12, 27, ['#3a6a8a', '#8a3a2e', '#3f7a4a', '#c89a3a'][v % 4]);
    px(g, dx + 2, 54, 8, 8, U.shade(['#3a6a8a', '#8a3a2e', '#3f7a4a', '#c89a3a'][v % 4], 0.12)); px(g, dx + 9, 64, 2, 2, '#ffd24a');
    // steps and a path
    px(g, dx - 2, 78, 16, 3, '#c8baa4'); px(g, dx - 2, 78, 16, 1, '#e4d8c4');
    // picket fence and garden in front
    for (let x = 0; x < W + 10; x += 4) { px(g, x, 72, 3, 12, '#f6f4ee'); px(g, x + 1, 71, 1, 1, '#f6f4ee'); px(g, x + 2, 73, 1, 11, '#c8c4b8'); }
    px(g, 0, 75, W + 10, 2, '#e8e4d8'); px(g, 0, 80, W + 10, 2, '#e8e4d8');
    for (let i = 0; i < 16; i++) { const fx = Math.floor(r() * (W + 6)) + 2; Art.ell(g, fx, 72, 3, 2.6, '#4f8a3a'); px(g, fx, 70, 2, 2, ['#f06a6a', '#ffd24a', '#f49ab4', '#b89af0'][i % 4]); }
    px(g, dx - 2, 72, 16, 12, '#c8baa4');                                        // the gate stands open
    return { img: c, w: W + 10, h: H, smoke: { x: chx + 4, y: 2 } };
  }
  const SHOPS = {
    mart: { name: 'WOMBAT MART', wall: ['#f2e6cc', '#d8c8a4'], sign: '#c0302c', awn: ['#e0583c', '#fff4e0'] },
    bakery: { name: 'BAKERY', wall: ['#f6dcc4', '#dcbc9c'], sign: '#8a5a34', awn: ['#f0a0b0', '#fff4f0'] },
    post: { name: 'POST OFFICE', wall: ['#e8d0a8', '#c8ac80'], sign: '#c8402e', awn: ['#c8402e', '#f6f0e0'] },
    pub: { name: 'THE WOMBAT ARMS', wall: ['#d8e4c8', '#b0c4a0'], sign: '#2f5a3a', awn: ['#2f6a44', '#f0f4e4'] },
    cellar: { name: "GROOT'S CELLAR", wall: ['#e0d4b8', '#bcac88'], sign: '#4f6a2a', awn: ['#6a8a34', '#f4f0d8'] },
  };
  function shop(kind, r) {
    const S = SHOPS[kind] || SHOPS.mart;
    const W = Math.max(110, Font.width(S.name, 1) + 40), H = 96, { c, g } = Art.cv(W, H);
    // a two-storey front with a stepped parapet hiding the roof
    px(g, 0, 14, W, 70, S.wall[0]);
    for (let y = 16; y < 84; y += 4) px(g, 0, y, W, 1, S.wall[1]);
    px(g, 0, 8, W, 8, S.wall[0]); px(g, Math.floor(W / 2) - 16, 2, 32, 8, S.wall[0]);
    px(g, 0, 8, W, 1, '#fffaf0'); px(g, Math.floor(W / 2) - 16, 2, 32, 1, '#fffaf0');
    px(g, 0, 14, W, 2, S.wall[1]);
    // the painted sign board
    const sw = Font.width(S.name, 1) + 14, sx = Math.floor((W - sw) / 2);
    px(g, sx - 1, 17, sw + 2, 13, '#3a2616'); px(g, sx, 18, sw, 11, S.sign); px(g, sx, 18, sw, 1, U.shade(S.sign, 0.25));
    Font.draw(g, S.name, W / 2, 20, { scale: 1, color: '#fff6dc', align: 'center' });
    // upstairs windows
    for (const wx of [8, W - 26]) { px(g, wx - 1, 33, 20, 16, '#f6f4ee'); px(g, wx, 34, 18, 14, '#7aaccc'); px(g, wx, 34, 18, 3, '#c4e0f0'); px(g, wx + 8, 34, 2, 14, '#f6f4ee'); }
    // the awning over the footpath, striped, with a scalloped edge
    for (let x = 0; x < W; x++) {
      const col = Math.floor(x / 8) % 2 ? S.awn[1] : S.awn[0];
      px(g, x, 50, 1, 9, col);
      if (x % 8 < 6) px(g, x, 59, 1, 2 - (x % 8 === 0 || x % 8 === 5 ? 1 : 0), col);
    }
    px(g, 0, 50, W, 1, '#3a2616');
    for (const pxx of [2, W - 5]) px(g, pxx, 58, 3, 26, '#6a4a30');
    // shop windows full of things, and a door
    const shopWin = (x, w) => {
      px(g, x - 1, 61, w + 2, 20, '#3a2616'); px(g, x, 62, w, 18, '#a8d4e8'); px(g, x, 62, w, 4, '#dff0f8');
      for (let k = 0; k < Math.floor(w / 6); k++) {
        const col = ['#f2c536', '#e0583c', '#6ab04a', '#c89a6a', '#f49ab4'][Math.floor(r() * 5)];
        px(g, x + 2 + k * 6, 72 - Math.floor(r() * 4), 4, 8, col); px(g, x + 2 + k * 6, 72, 4, 1, U.shade(col, 0.3));
      }
      px(g, x, 78, w, 2, '#8a6a48');
    };
    const dw = 16, dx = Math.floor(W / 2 - dw / 2);
    shopWin(6, dx - 12); shopWin(dx + dw + 6, W - dx - dw - 12);
    px(g, dx - 1, 60, dw + 2, 24, '#3a2616'); px(g, dx, 61, dw, 23, '#6a8ab0'); px(g, dx + 2, 63, dw - 4, 10, '#a8d4e8');
    px(g, dx + dw - 4, 74, 2, 2, '#f2c536');
    // the footpath
    px(g, 0, 84, W, 4, '#c8baa4'); px(g, 0, 84, W, 1, '#e4d8c4'); px(g, 0, 88, W, 8, '#b0a08a');
    // a bench and a pot plant out the front
    px(g, 8, 78, 16, 2, '#8a5a34'); px(g, 9, 80, 2, 4, '#5a3a20'); px(g, 21, 80, 2, 4, '#5a3a20');
    Art.ell(g, W - 12, 76, 5, 5, '#4f8a3a'); px(g, W - 15, 79, 6, 5, '#b8603a');
    return { img: c, w: W, h: H };
  }
  function church() {
    const W = 84, H = 140, { c, g } = Art.cv(W, H);
    // a white weatherboard church with a steeple and one stained window
    px(g, 12, 70, 60, 58, '#f6f2e8');
    for (let y = 72; y < 128; y += 4) px(g, 12, y, 60, 1, '#d8d2c4');
    for (let i = 0; i < 22; i++) px(g, 12 + Math.round(i * 1.4), 70 - i, 60 - Math.round(i * 2.8), 1, i % 2 ? '#8a9aa6' : '#9aaab6');
    px(g, 34, 24, 16, 30, '#f6f2e8'); px(g, 34, 24, 2, 30, '#d8d2c4');
    for (let i = 0; i < 20; i++) px(g, 34 + Math.round(i * 0.4), 24 - i, 16 - Math.round(i * 0.8), 1, '#8a9aa6');
    px(g, 41, 0, 2, 6, '#c8a040'); px(g, 39, 2, 6, 1, '#c8a040');
    px(g, 38, 30, 8, 10, '#3a2a1e'); px(g, 39, 31, 6, 9, '#c8a040');                 // the bell
    Art.ell(g, 42, 84, 8, 8, '#3a2a1e'); Art.ell(g, 42, 84, 7, 7, '#e0583c');
    px(g, 35, 84, 14, 1, '#3a2a1e'); px(g, 42, 77, 1, 14, '#3a2a1e');
    Art.ell(g, 39, 81, 2, 2, '#f2c536'); Art.ell(g, 45, 87, 2, 2, '#4a9cc6');
    px(g, 36, 102, 12, 26, '#6a4a30'); px(g, 36, 102, 12, 2, '#8a6a48'); px(g, 42, 102, 1, 26, '#4a3020');
    px(g, 0, 128, W, 4, '#c8baa4');
    return { img: c, w: W, h: H };
  }
  // a street lamp, a letterbox, a gum tree: small things for between the houses
  function lamp(g, x, y, lit) {
    px(g, x - 1, y - 44, 3, 44, '#3a3a40'); px(g, x - 3, y - 2, 7, 2, '#3a3a40');
    px(g, x - 5, y - 50, 11, 6, '#3a3a40'); px(g, x - 4, y - 49, 9, 4, lit ? '#fff0b0' : '#e8e0c0');
    if (lit) Art.glow(g, x, y - 46, 26, '#ffe8a0', 0.25, 4);
  }

  // ---- the car -------------------------------------------------------------------------------------
  // The farm wagon, facing right, bouncing on its springs, with a wombat
  // looking out of the back window if you want one.
  function car(g, x, y, t, o = {}) {
    const img = Art.flip(Props.get('truck'));
    const sc = o.scale || 1.35, tw = img.width * sc, th = img.height * sc;
    const moving = o.moving !== false;
    const ty = y + (moving ? Math.abs(Math.sin(t * 8)) * 2 : 0);
    if (moving) for (let i = 0; i < 9; i++) {                          // dust off the back wheels
      const e = ((t * 1.4 + i * 0.11) % 1), a = (1 - e) * 0.35;
      Art.ell(g, x - tw / 2 - 4 - e * 80, ty - 4 - e * 14, 5 + e * 12, 3 + e * 8, `rgba(226,210,180,${a.toFixed(2)})`);
    }
    Art.castShadow(g, img, x, ty + 8, tw, th, { alpha: 0.3, lean: 0.3, squash: 0.14 });
    g.drawImage(img, Math.round(x - tw / 2), Math.round(ty - th + 10), Math.round(tw), Math.round(th));
    if (o.wombat) {
      const wx = x - tw * 0.2, wy = ty - th * 0.5;
      g.save();
      g.beginPath(); g.rect(Math.round(x - tw * 0.36), Math.round(ty - th * 0.78), Math.round(tw * 0.3), Math.round(th * 0.32)); g.clip();
      const w = Sprites.wombat('idle', Math.floor(t * 4), 'brown', 1, 'adult');
      const ws = 0.9;
      g.drawImage(w, Math.round(wx - w.width * ws / 2), Math.round(wy - w.height * ws + 12), Math.round(w.width * ws), Math.round(w.height * ws));
      g.restore();
    }
    return { tw, th };
  }

  return { paint, build, building, lamp, car, cloud, gum, PW, get layers() { return build(); } };
})();
