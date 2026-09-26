// ---- The wild ---------------------------------------------------------------
// Everything in the grove that is neither yours nor the work: the shape of the
// ground you dig into it, the small things living in the grass, and the people
// who wander in to have a look at what you have done with the place.
//
// Three parts, all owned here so grove.js stays about wombats:
//   TERRAIN   mounds you raise and ponds you dig, saved with the world
//   CRITTERS  beetles, butterflies, bees, dragonflies, frogs, ants, a lizard
//   VISITORS  Shaz, Groot and Captain Kirk, who turn up, stay a while, talk
const Wild = (() => {
  let G = null;
  let W = 0, H = 0, GROUND = 0, walk = { y0: 0, y1: 0 };
  const bugs = [], frogs = [];
  const visitors = [];
  let t = 0, spawnT = 22;

  function init(g, world) {
    G = g;
    W = world.W; H = world.H; GROUND = world.GROUND; walk = world.walk;
    if (!hgt || GW !== Math.ceil(W / CS) + 1) gridInit();
    loadLand((G.world && G.world.land) || null);
    seedBugs();
    visitors.length = 0;
    t = 0; spawnT = 16 + Math.random() * 20;
  }

  // ---- terrain --------------------------------------------------------------
  // The ground is a height field: a grid of small cells, each a little above or
  // below the lawn. The shovel paints it like a brush, digging down under the
  // left button and heaping up under the right. Water poured into a hole stays
  // there and runs along any dug channel it touches, so a trench becomes a
  // creek and a wide hole a pond. It is drawn as real relief: every cell is
  // lifted or sunk on screen, lit from the upper left, front faces in shade.
  const CS = 6;                                   // cell size, px
  const K = 7;                                    // px of lift per unit of height
  const HMIN = -2.2, HMAX = 2.6;                  // how deep, how high
  const BASIN = -0.22;                            // a cell this low can hold water
  const TOP = -0.1;                               // water never stands above this
  let GW = 0, GH = 0, Y0 = 0;                     // grid size, and where it starts
  let hgt = null, wat = null, qw = null;          // height, water, water as last drawn
  let land = null, lg = null, img = null;         // the painted relief
  const LY = 26;                                  // headroom above the grid for hills
  let dirty0 = 1e9, dirty1 = -1, simT = 0, clusterT = 0;
  let waterCells = [], edgeCells = [];
  const mounds = [], ponds = [];

  const idx = (cx, cy) => cy * GW + cx;
  const hash = (x, y) => { let n = (x * 374761393 + y * 668265263) | 0; n = (n ^ (n >>> 13)) * 1274126177; return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

  function gridInit() {
    GW = Math.ceil(W / CS) + 1;
    Y0 = GROUND;
    GH = Math.ceil((H - Y0) / CS) + 1;
    hgt = new Float32Array(GW * GH);
    wat = new Float32Array(GW * GH);
    qw = new Uint8Array(GW * GH);
    land = document.createElement('canvas');
    land.width = W; land.height = H - Y0 + LY + 24;
    lg = land.getContext('2d');
    img = lg.createImageData(W, land.height);
  }
  function markDirty(x0, x1) { dirty0 = Math.min(dirty0, x0); dirty1 = Math.max(dirty1, x1); }

  // bilinear samples of the two grids at a world point
  function sample(arr, x, y) {
    const fx = U.clamp(x / CS, 0, GW - 1.001), fy = U.clamp((y - Y0) / CS, 0, GH - 1.001);
    const cx = Math.floor(fx), cy = Math.floor(fy), tx = fx - cx, ty = fy - cy;
    const i = idx(cx, cy);
    const a = arr[i], b = arr[i + 1], c = arr[i + GW], d = arr[i + GW + 1];
    return (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty;
  }
  const heightAt = (x, y) => (hgt ? sample(hgt, x, y) : 0);
  const waterAt = (x, y) => (wat ? sample(wat, x, y) : 0);
  // how far up (or down) something standing here is drawn
  function liftAt(x, y) {
    if (!hgt) return 0;
    const h = heightAt(x, y), w = waterAt(x, y);
    return Math.round((w > 0.04 ? h + w : h) * K);
  }
  const onPond = (x, y) => waterAt(x, y) > 0.12;
  const onMound = (x, y) => heightAt(x, y) > 0.7;
  // somewhere a bed cannot go
  const blocked = (x, y) => waterAt(x, y) > 0.05 || Math.abs(heightAt(x, y)) > 0.35;

  function canPlace(kind, x, y) {
    if (y < walk.y0 - 6 || y > walk.y1 + 10) return 'not on the path';
    return null;
  }

  // One dab of the brush. `amt` is how much the middle of it moves this call;
  // the edge moves less, so strokes come out soft rather than stepped.
  function brush(x, y, r, amt) {
    const rx = r / CS, ry = (r * 0.72) / CS;
    const gx = x / CS, gy = (y - Y0) / CS;
    const cx0 = Math.max(1, Math.floor(gx - rx)), cx1 = Math.min(GW - 2, Math.ceil(gx + rx));
    const lo = Math.floor((walk.y0 - 4 - Y0) / CS), hi = Math.ceil((walk.y1 + 8 - Y0) / CS);
    const cy0 = Math.max(lo, Math.floor(gy - ry)), cy1 = Math.min(hi, Math.ceil(gy + ry));
    let any = false;
    for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) {
      const dx = (cx - gx) / rx, dy = (cy - gy) / ry;
      const d2 = dx * dx + dy * dy;
      if (d2 >= 1) continue;
      const f = (1 - d2) * (1 - d2);
      const i = idx(cx, cy);
      const nh = U.clamp(hgt[i] + amt * f, HMIN, HMAX);
      if (nh !== hgt[i]) { hgt[i] = nh; any = true; }
    }
    if (any) markDirty(cx0 * CS - CS * 2, cx1 * CS + CS * 2);
    return any;
  }
  // The shovel. Held down, it keeps working; dragged, it paints a trench or a
  // ridge. Both are free: shaping the land is the fun, not a cost.
  function sculpt(kind, x, y, br, first) {
    if (canPlace('', x, y)) { if (first) Audio.play('error'); return false; }
    const up = kind === 'raise';
    const ok = brush(x, y, br, up ? 0.06 : -0.08);
    if (ok) {
      if (!up) { G.stats.dug = (G.stats.dug || 0) + 0.05; }
      if (Math.random() < 0.18) FX.burst(x + U.rand(-br * 0.5, br * 0.5), y - 2, 2, { color: [PAL.soil2, PAL.soil3, PAL.soil1], speed: 60, gravity: 180, life: 0.4, size: 2 });
    }
    return ok;
  }
  // smoothing: every cell eases toward its neighbours and toward level ground
  function flatten(x, y, br) {
    const any = brushTo(x, y, br, 0);
    return any;
  }
  function brushTo(x, y, r, target) {
    const rx = r / CS, ry = (r * 0.72) / CS, gx = x / CS, gy = (y - Y0) / CS;
    let any = false;
    for (let cy = Math.max(1, Math.floor(gy - ry)); cy <= Math.min(GH - 2, Math.ceil(gy + ry)); cy++) {
      for (let cx = Math.max(1, Math.floor(gx - rx)); cx <= Math.min(GW - 2, Math.ceil(gx + rx)); cx++) {
        const dx = (cx - gx) / rx, dy = (cy - gy) / ry;
        if (dx * dx + dy * dy >= 1) continue;
        const i = idx(cx, cy);
        if (Math.abs(hgt[i] - target) > 0.01) { hgt[i] = U.lerp(hgt[i], target, 0.08); any = true; }
      }
    }
    if (any) markDirty(x - r - CS * 2, x + r + CS * 2);
    return any;
  }
  const level = (x, y, r) => flatten(x, y, r);
  // The watering can over a hole fills it. Returns how much went in.
  function pour(x, y, r) {
    const rx = r / CS, ry = (r * 0.72) / CS, gx = x / CS, gy = (y - Y0) / CS;
    let n = 0;
    for (let cy = Math.max(1, Math.floor(gy - ry)); cy <= Math.min(GH - 2, Math.ceil(gy + ry)); cy++) {
      for (let cx = Math.max(1, Math.floor(gx - rx)); cx <= Math.min(GW - 2, Math.ceil(gx + rx)); cx++) {
        const dx = (cx - gx) / rx, dy = (cy - gy) / ry;
        if (dx * dx + dy * dy >= 1) continue;
        const i = idx(cx, cy);
        if (hgt[i] > BASIN) continue;
        const room = TOP - (hgt[i] + wat[i]);
        if (room <= 0) continue;
        const add = Math.min(room, 0.09);
        wat[i] += add; n += add;
      }
    }
    return n;
  }
  // Water finds its own level: each tick, every wet cell hands a share of any
  // difference to lower neighbours that can hold it. Ground that is not dug
  // drinks whatever lands on it.
  const flowD = [];
  function flow() {
    const N = GW * GH;
    if (flowD.length !== N) { flowD.length = 0; for (let i = 0; i < N; i++) flowD.push(0); }
    for (let i = 0; i < N; i++) flowD[i] = 0;
    const rain = Sky.wet() > 0.2 ? 0.002 : 0;
    let wet = false;
    for (let cy = 1; cy < GH - 1; cy++) for (let cx = 1; cx < GW - 1; cx++) {
      const i = idx(cx, cy);
      const h = hgt[i];
      if (h > BASIN) {
        if (wat[i] > 0) {                      // raised out of the water: it spills to the lowest neighbour
          let best = -1, bs = h + wat[i];
          for (const j of [i - 1, i + 1, i - GW, i + GW]) if (hgt[j] <= BASIN && hgt[j] + wat[j] < bs) { bs = hgt[j] + wat[j]; best = j; }
          if (best >= 0) flowD[best] += wat[i];
          flowD[i] -= wat[i];
        }
        continue;
      }
      if (rain) flowD[i] += rain;
      const w = wat[i];
      if (w <= 0) continue;
      wet = true;
      const s = h + w;
      let give = 0;
      const out = [];
      for (const j of [i - 1, i + 1, i - GW, i + GW]) {
        if (hgt[j] > BASIN) continue;
        const sj = hgt[j] + wat[j];
        if (s > sj + 0.002) { const d = (s - sj) * 0.22; out.push([j, d]); give += d; }
      }
      if (!give) continue;
      const k = Math.min(1, (w * 0.9) / give);
      for (const [j, d] of out) { flowD[j] += d * k; flowD[i] -= d * k; }
    }
    if (!wet && !rain) return;
    for (let i = 0; i < N; i++) {
      if (!flowD[i]) continue;
      let v = wat[i] + flowD[i];
      if (v < 0.0005) v = 0;
      const cap = TOP - hgt[i];
      if (v > cap) v = Math.max(0, cap);
      wat[i] = v;
    }
  }
  // After the water moves, work out which columns need repainting, and where
  // the ponds and hills are for everyone else to ask about.
  function settle() {
    for (let cy = 0; cy < GH; cy++) for (let cx = 0; cx < GW; cx++) {
      const i = idx(cx, cy);
      const q = Math.min(255, Math.round(wat[i] * 40));
      if (q !== qw[i]) { qw[i] = q; markDirty(cx * CS - CS * 2, cx * CS + CS * 2); }
    }
  }
  function clusters() {
    waterCells = []; edgeCells = [];
    mounds.length = 0; ponds.length = 0;
    const seen = new Uint8Array(GW * GH);
    for (let cy = 1; cy < GH - 1; cy++) for (let cx = 1; cx < GW - 1; cx++) {
      const i = idx(cx, cy);
      if (wat[i] > 0.06) {
        waterCells.push(i);
        if ([i - 1, i + 1, i - GW, i + GW].some((j) => wat[j] <= 0.06)) edgeCells.push(i);
      }
    }
    const grow = (test, out) => {
      for (let i = 0; i < GW * GH; i++) {
        if (seen[i] || !test(i)) continue;
        const st = [i]; seen[i] = 1;
        let n = 0, sx = 0, sy = 0;
        while (st.length) {
          const c = st.pop(); n++;
          sx += (c % GW) * CS; sy += Math.floor(c / GW) * CS + Y0;
          for (const j of [c - 1, c + 1, c - GW, c + GW]) if (j >= 0 && j < GW * GH && !seen[j] && test(j)) { seen[j] = 1; st.push(j); }
        }
        if (n >= 4) out.push({ x: sx / n, y: sy / n, r: Math.sqrt(n) * CS * 0.7, n });
      }
    };
    grow((i) => wat[i] > 0.12, ponds);
    grow((i) => hgt[i] > 0.7, mounds);
  }

  // ---- painting the relief ---------------------------------------------------
  const hex = (s) => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
  const GRASS = ['#2f5a26', '#3d7430', '#4f8c38', '#64a443', '#7fbd52', '#a0d468'].map(hex);
  const TOPS = ['#44762f', '#57903a', '#6caa46', '#86c257', '#a4d66c', '#c4e88a'].map(hex);
  const DIRT = ['#3e2618', '#553522', '#6e4630', '#8a5c3e', '#a6764e', '#c0915e'].map(hex);
  const MUD = ['#4a3322', '#5c4130'].map(hex);
  const WATER = ['#1f5a86', '#28709c', '#3787b4', '#4a9cc6', '#5eb0d4'].map(hex);
  let kb = null;                                  // what each painted pixel is
  const FOAM = hex('#d6f0ee'), GLINT = hex('#bfe8f0');
  function paintCols(x0, x1) {
    x0 = Math.max(0, Math.floor(x0)); x1 = Math.min(W - 1, Math.ceil(x1));
    if (x1 < x0) return;
    const d = img.data, IW = W, IH = land.height;
    if (!kb || kb.length !== IW * IH) kb = new Uint8Array(IW * IH);
    const yEnd = H - 1;
    for (let x = x0; x <= x1; x++) {
      for (let sy = 0; sy < IH; sy++) { d[(sy * IW + x) * 4 + 3] = 0; kb[sy * IW + x] = 0; }
      let lastSy = -1, lastKind = 0;
      for (let y = Y0; y <= yEnd; y++) {
        const h = heightAt(x, y), w = waterAt(x, y);
        const isW = w > 0.035;
        const z = isW ? h + w : h;
        const sy = y - Y0 + LY - Math.round(z * K);
        let kind = 0, col = null, a = 255;
        if (isW) {
          kind = 3;
          const dep = w;
          let b = dep > 0.8 ? 0 : dep > 0.5 ? 1 : dep > 0.26 ? 2 : dep > 0.1 ? 3 : 4;
          const bay = 0.5;
          if (b > 0 && (dep % 0.2) / 0.2 > 0.5 + bay * 0.5) b--;
          col = WATER[b];
          if (hash(Math.floor(x / 5), y) < 0.05 && (y % 3 === 0)) col = GLINT;
        } else if (h < -0.08 || h > 0.08) {
          const hx = (heightAt(x + 1, y) - heightAt(x - 1, y)) * 0.5 * K;
          const hy = (heightAt(x, y + 1) - heightAt(x, y - 1)) * 0.5 * K;
          // normal (-hx, -hy, 1) against a light from the upper left
          const nl = Math.hypot(hx, hy, 1);
          let lit = (hx * 0.55 + hy * 0.42 + 0.72) / nl;           // 0..1
          const r = hash(x, y);
          if (h > 0) {
            kind = 1;
            const ramp = h > 1.4 ? TOPS : GRASS;
            let b = U.clamp(Math.floor(lit * 6.2) - 1, 0, 5);
            if (r < 0.05 && b < 5) b++;
            else if (r > 0.95 && b > 0) b--;
            col = ramp[b];
            if (h < 0.2) a = Math.round(255 * U.clamp((h - 0.08) / 0.12, 0.3, 1));
          } else {
            kind = 2;
            let b = U.clamp(Math.floor(lit * 6) - 1, 0, 5);
            if (h > -0.26) b = Math.min(5, b + 2);                  // the lip of turned earth
            if (r < 0.07 && b > 0) b--;                              // stones and crumbs
            col = DIRT[b];
            if (h < -1.2 && r > 0.8) col = MUD[r > 0.9 ? 0 : 1];
            if (h > -0.16) a = Math.round(255 * U.clamp((-h - 0.08) / 0.08, 0.35, 1));
          }
        }
        // paint this sample, and fill any gap to the one before it: that gap
        // is a face turned toward us, so it goes a band darker
        const from = sy > lastSy + 1 && lastSy >= 0 ? lastSy + 1 : sy;
        for (let py = from; py <= sy; py++) {
          if (py < 0 || py >= IH) continue;
          const o = (py * IW + x) * 4;
          kb[py * IW + x] = kind;
          if (!kind) { d[o + 3] = 0; continue; }
          let c = col;
          if (py < sy && kind !== 3) {
            const ramp = kind === 1 ? GRASS : DIRT;
            const t = sy - py;
            c = ramp[Math.max(0, (kind === 1 ? 2 : 1) - (t > 6 ? 1 : 0))];
          }
          d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = a;
        }
        lastSy = sy; lastKind = kind;
      }
    }
    // The pixel-art pass. Hills get a dark outline and a soft shadow on the
    // lawn in front, a lit top edge, and grass blades; holes get a pale lip
    // of turned earth along the back and a dark one along the front; water
    // gets a line of foam where it meets the bank.
    const set = (o, c, a) => { d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = a == null ? 255 : a; };
    const OUT = hex('#2a3a18'), LIP = DIRT[5], LIPD = DIRT[0], SH = hex('#3a2c14');
    const BLADE = [hex('#9ad064'), hex('#b8e27c')], FLW = [hex('#f6ecb0'), hex('#f4b4c8'), hex('#ffffff')];
    for (let x = Math.max(1, x0); x <= Math.min(IW - 2, x1); x++) {
      for (let sy = IH - 3; sy > 2; sy--) {
        const p = sy * IW + x, k = kb[p];
        if (!k) continue;
        const o = p * 4;
        const ka = kb[p - IW], kbw = kb[p + IW], kl = kb[p - 1], kr = kb[p + 1];
        if (k === 1) {
          if (kbw === 0) { set(o, OUT); const o2 = o + IW * 4; if (kb[p + IW] === 0) set(o2, SH, 70); }
          else if (kl === 0 || kr === 0) set(o, OUT, 220);
          else if (ka === 0) set(o, TOPS[5]);
          else {
            const r = hash(x * 7, sy * 3);
            if (r < 0.045 && kb[p - IW * 2] === 1 && kb[p - IW * 3] === 1) { set(o - IW * 4, BLADE[0]); set(o - IW * 8, BLADE[1]); }
            else if (r > 0.996) set(o, FLW[Math.floor(r * 1000) % 3]);
          }
        } else if (k === 2) {
          if (ka === 0 || ka === 1) set(o, LIP);
          else if (kbw === 0 || kbw === 1) set(o, LIPD);
        } else if (k === 3) {
          if (ka !== 3) set(o, FOAM);
          else if (kl !== 3 || kr !== 3) set(o, WATER[4]);
        }
      }
    }
    lg.putImageData(img, 0, 0, x0, 0, x1 - x0 + 1, IH);
  }

  // ---- saving ----------------------------------------------------------------
  function loadLand(s) {
    hgt.fill(0); wat.fill(0); qw.fill(0);
    if (s && Array.isArray(s.cells) && s.cs === CS) {
      for (const [i, hq, wq] of s.cells) if (i >= 0 && i < GW * GH) { hgt[i] = hq / 50; wat[i] = (wq || 0) / 50; }
    } else if (s) {
      // an older save kept whole hills and ponds: press each one into the grid
      for (const m of (s.mounds || [])) brushAbs(m.x, m.y, m.r * 1.1, 1.8);
      for (const p of (s.ponds || [])) { brushAbs(p.x, p.y, p.r * 1.1, -1.6); pourAbs(p.x, p.y, p.r); }
    }
    settle(); clusters();
    dirty0 = 0; dirty1 = W;
  }
  function brushAbs(x, y, r, v) {
    const gx = x / CS, gy = (y - Y0) / CS, rx = r / CS, ry = (r * 0.5) / CS;
    for (let cy = 1; cy < GH - 1; cy++) for (let cx = 1; cx < GW - 1; cx++) {
      const dx = (cx - gx) / rx, dy = (cy - gy) / ry, d2 = dx * dx + dy * dy;
      if (d2 < 1) { const i = idx(cx, cy); hgt[i] = U.clamp(hgt[i] + v * (1 - d2) * (1 - d2) * 1.4, HMIN, HMAX); }
    }
  }
  function pourAbs(x, y, r) { for (let n = 0; n < 40; n++) pour(x, y, r); }
  function save() {
    const cells = [];
    if (hgt) for (let i = 0; i < GW * GH; i++) {
      const hq = Math.round(hgt[i] * 50), wq = Math.round(wat[i] * 50);
      if (hq || wq) cells.push(wq ? [i, hq, wq] : [i, hq]);
    }
    return { cs: CS, cells };
  }
  // for anything that used to ask for a hill or a pond by name
  function place() { return false; }
  const MOUND_COST = 0, POND_COST = 0;
  // ---- the small things -----------------------------------------------------
  const BUG_KINDS = ['beetle', 'butterfly', 'bee', 'dragonfly', 'ant', 'moth', 'snail', 'lizard'];
  function mkBug(kind, x, y) {
    return {
      kind, x, y, t: Math.random() * 9, ph: Math.random() * TAU,
      tx: x, ty: y, wait: Math.random() * 3, dir: Math.random() < 0.5 ? -1 : 1,
      z: kind === 'butterfly' || kind === 'dragonfly' || kind === 'bee' || kind === 'moth' ? 10 + Math.random() * 18 : 0,
      col: Math.floor(Math.random() * 4), sp: 0.8 + Math.random() * 0.7,
    };
  }
  // a frog sits on the bank of whatever water there is, and hops along it
  function frogSpot(fr) {
    if (!edgeCells.length) return false;
    let best = null;
    for (let k = 0; k < 8; k++) {
      const i = edgeCells[Math.floor(Math.random() * edgeCells.length)];
      const x = (i % GW) * CS, y = Math.floor(i / GW) * CS + Y0;
      if (!fr || fr.x == null || Math.hypot(x - fr.x, y - fr.y) < 60) { best = { x, y, i }; break; }
    }
    if (!best) return false;
    fr.x = best.x; fr.y = best.y + 1 - Math.round((hgt[best.i] + wat[best.i]) * K);
    return true;
  }
  function mkFrog() {
    const fr = { x: null, y: 0, t: 0, hop: 0, croak: 0, dir: Math.random() < 0.5 ? -1 : 1 };
    return frogSpot(fr) ? fr : null;
  }
  function seedBugs() {
    bugs.length = 0; frogs.length = 0;
    const n = 26;
    for (let i = 0; i < n; i++) {
      const k = BUG_KINDS[Math.floor(Math.random() * 6)];
      bugs.push(mkBug(k, 60 + Math.random() * (W - 120), walk.y0 + Math.random() * (walk.y1 - walk.y0)));
    }
    bugs.push(mkBug('lizard', W * 0.3, walk.y1 - 10));
    bugs.push(mkBug('snail', W * 0.6, walk.y0 + 30));
  }

  // ---- the visitors ---------------------------------------------------------
  // Each one walks in from an edge, drifts about for a minute or two, and goes
  // home. Click one and you get the full dialogue panel.

  const GUESTS = [
    {
      key: 'shaz', name: 'Shaz', why: 'on her day off',
      sprite: (f, pose) => Sprites.cashier(f, pose), sc: 1.9, poses: { walk: 'walk', idle: 'idle', talk: 'talk' },
      gift: () => { const n = 40 + Math.floor(Math.random() * 60); G.wd += n; return `Shaz left ${U.fmt(n)} W$ on the fence post`; },
      tree: () => ({
        start: 'hub',
        nodes: {
          hub: { mood: 'happy', sub: 'she drove out to look at your wombats',
            say: 'There she IS. Oh she is a big girl. I have been telling Kevin about this place all week.',
            opts: [
              { q: 'You came all this way?', to: 'far' },
              { q: 'How is the shop?', to: 'shop' },
              { q: 'Want to hold one?', to: 'hold' },
              { q: 'Good to see you, Shaz.', end: true },
            ] },
          far: { mood: 'talk', say: 'Twenty minutes. I do it Sundays. There is nothing out here and that is the whole point of it.',
            opts: [{ q: 'Fair.', to: 'hub' }] },
          shop: { mood: 'cross', say: 'Head office want me to move the pies. The pies have been there since I started. The pies are load-bearing.',
            opts: [{ q: 'Do not move the pies.', to: 'hub' }] },
          hold: { mood: 'surprise', say: 'Can I? Oh. Oh she is heavier than she looks. Hello. Hello. Look at your little face.',
            opts: [{ q: 'She likes you.', to: 'hold2' }] },
          hold2: { mood: 'happy', say: 'I am going to think about this for the rest of the week.',
            opts: [{ q: 'Come back any time.', to: 'hub' }] },
        },
      }),
    },
    {
      key: 'groot', name: 'Groot', why: 'delivering',
      sprite: (f, pose) => Sprites.groot(f, pose), sc: 1.4, poses: { walk: 'walk', idle: 'idle', talk: 'talk' },
      gift: () => { const c = U.pick(CROPS.slice(0, 6)); G.seeds[c.key] = (G.seeds[c.key] || 0) + 4; return `Groot left four ${c.name} seeds by the gate`; },
      tree: () => ({
        start: 'hub',
        nodes: {
          hub: { mood: 'happy', sub: 'he brought something and will not say what',
            say: 'I am Groot.',
            opts: [
              { q: 'You came out of the cellar?', to: 'out' },
              { q: 'Is that for me?', to: 'gift' },
              { q: 'How is the soil looking?', to: 'soil' },
              { q: 'Good to see you, Groot.', end: true },
            ] },
          out: { mood: 'curious', sub: 'once a season, when the light is right', say: 'I am Groot?',
            opts: [{ q: 'It suits you.', to: 'hub' }] },
          gift: { mood: 'proud', sub: 'he left it by the gate an hour ago', say: 'I. Am. Groot.',
            opts: [{ q: 'Thank you.', to: 'hub' }] },
          soil: { mood: 'talk', sub: 'better than last time. keep the water up.', say: 'I am Groot!',
            opts: [{ q: 'Will do.', to: 'hub' }] },
        },
      }),
    },
    {
      key: 'clark', name: 'Captain Kirk', why: 'on his constitutional',
      sprite: (f, pose) => Sprites.villager('clark', f, pose === 'walk' ? 'walk' : pose === 'talk' ? 'talk' : 'idle'), sc: 1.5,
      poses: { walk: 'walk', idle: 'idle', talk: 'talk' },
      gift: () => { const n = 30 + Math.floor(Math.random() * 50); G.wd += n; return `the Captain left ${U.fmt(n)} W$ in a sardine tin`; },
      tree: () => ({
        start: 'hub',
        nodes: {
          hub: { mood: 'happy', sub: 'he walks the long way round, for the sea air',
            say: 'Ahoy the farm! Fine-looking vessel you have got here. Needs an ottoman, mind. Everything needs an ottoman.',
            opts: [
              { q: 'Where is the sea, Captain?', to: 'sea' },
              { q: 'Do wombats like ottomans?', to: 'otto' },
              { q: 'Good to see you, Captain.', end: true },
            ] },
          sea: { mood: 'think', say: 'Three hundred kilometres that way. I can smell it on a good day. Today is not a good day.',
            opts: [{ q: 'Sorry to hear it.', to: 'hub' }] },
          otto: { mood: 'laugh', say: 'Everyone likes ottomans. Put one out and see which of them sits on it first. My money is on the grey one.',
            opts: [{ q: 'I will try it.', to: 'hub' }] },
        },
      }),
    },
  ];
  function spawnVisitor() {
    if (visitors.length) return;
    const def = GUESTS[Math.floor(Math.random() * GUESTS.length)];
    const fromLeft = Math.random() < 0.5;
    visitors.push({
      def, x: fromLeft ? -40 : W + 40, y: walk.y1 - 16,
      tx: 160 + Math.random() * (W - 320), ty: walk.y0 + 20 + Math.random() * (walk.y1 - walk.y0 - 40),
      dir: fromLeft ? 1 : -1, state: 'arrive', t: 0, stay: 55 + Math.random() * 50,
      anim: 0, gave: false, said: 0, bob: 0,
    });
    UI.toast(`<b>${def.name}</b> is here &mdash; ${def.why}`, 'good');
    Audio.play('chime');
  }
  function visitorAt(x, y) {
    for (const v of visitors) if (v.state !== 'leave' && Math.abs(x - v.x) < 22 && y > v.y - 56 && y < v.y + 8) return v;
    return null;
  }
  function talkTo(v) {
    if (!v) return;
    v.state = 'talk'; v.t = 0;
    const who = Sprites.VILLAGERS[v.def.key] ? 'villager:' + v.def.key : v.def.key;
    Talk.open(who, v.def.tree(), () => {
      if (v.state === 'talk') v.state = 'wander';
      if (!v.gave) {
        v.gave = true;
        const msg = v.def.gift();
        UI.toast(msg, 'good'); UI.refreshHUD(); UI.refreshTray(); Main.save();
      }
    });
  }

  // ---- update ---------------------------------------------------------------
  function update(dt) {
    t += dt;
    simT += dt;
    if (simT > 0.1) { simT = 0; flow(); settle(); }
    clusterT += dt;
    if (clusterT > 1) {
      clusterT = 0; clusters();
      // frogs move in once there is enough water to be worth it
      const want = Math.min(6, Math.floor(waterCells.length / 40));
      if (frogs.length < want) { const fr = mkFrog(); if (fr) frogs.push(fr); }
      else if (frogs.length > want) frogs.pop();
    }
    // bugs
    for (const b of bugs) {
      b.t += dt * b.sp;
      if (b.kind === 'butterfly' || b.kind === 'moth') {
        b.x += Math.cos(b.t * 0.7 + b.ph) * 26 * dt;
        b.y += Math.sin(b.t * 1.1 + b.ph) * 12 * dt;
        b.z = 12 + Math.sin(b.t * 2.2 + b.ph) * 7;
      } else if (b.kind === 'bee') {
        b.x += Math.cos(b.t * 2.1 + b.ph) * 34 * dt;
        b.y += Math.sin(b.t * 1.7 + b.ph) * 16 * dt;
        b.z = 9 + Math.sin(b.t * 5 + b.ph) * 4;
      } else if (b.kind === 'dragonfly') {
        // dragonflies hold station over a pond and dart
        const p = ponds[0];
        if (p && b.pond !== p) { b.pond = p; }
        if (p) { b.tx = p.x + Math.cos(b.t * 0.5) * p.r; b.ty = p.y + Math.sin(b.t * 0.8) * p.r * 0.4; }
        b.x = U.lerp(b.x, b.tx, 1 - Math.pow(0.02, dt));
        b.y = U.lerp(b.y, b.ty, 1 - Math.pow(0.02, dt));
        b.z = 16 + Math.sin(b.t * 3) * 5;
      } else {
        b.wait -= dt;
        if (b.wait <= 0) {
          b.wait = 0.6 + Math.random() * 2.4;
          b.tx = U.clamp(b.x + U.rand(-70, 70), 40, W - 40);
          b.ty = U.clamp(b.y + U.rand(-26, 26), walk.y0, walk.y1);
        }
        const sp = b.kind === 'snail' ? 3 : b.kind === 'lizard' ? 34 : 13;
        const dx = b.tx - b.x, dy = b.ty - b.y, d = Math.hypot(dx, dy) || 1;
        if (d > 2) { b.x += (dx / d) * sp * dt; b.y += (dy / d) * sp * dt; b.dir = dx < 0 ? -1 : 1; }
      }
      b.x = U.clamp(b.x, 24, W - 24);
      b.y = U.clamp(b.y, walk.y0 - 14, walk.y1 + 10);
    }
    // frogs
    for (const fr of frogs) {
      fr.t += dt;
      fr.croak = Math.max(0, fr.croak - dt);
      if (fr.hop > 0) { fr.hop -= dt * 3; } else if (Math.random() < dt * 0.22) {
        fr.hop = 1;
        const ox = fr.x;
        frogSpot(fr);
        fr.dir = fr.x < ox ? -1 : 1;
      }
      if (Math.random() < dt * 0.12) fr.croak = 0.8;
    }
    // visitors
    spawnT -= dt;
    // Nobody drives out here in the dark. Visitors keep daylight hours.
    if (spawnT <= 0 && G.step >= 4 && !UI.anyPanel() && Sky.light() > 0.45) {
      spawnVisitor();
      // a starthistle in the ground brings people up the road to look at it
      const draw2 = (World.magic().draw || 0);
      spawnT = (100 + Math.random() * 150) / (1 + draw2 * 0.6);
    }
    for (let i = visitors.length - 1; i >= 0; i--) {
      const v = visitors[i];
      v.t += dt;
      v.anim += dt * (v.state === 'arrive' || v.state === 'leave' || v.state === 'walk' ? 8 : 3.4);
      if (v.state === 'talk') { v.bob = Math.sin(v.t * 3) * 1.2; continue; }
      const dx = v.tx - v.x, dy = v.ty - v.y, d = Math.hypot(dx, dy) || 1;
      if (d > 4) {
        v.dir = dx < 0 ? -1 : 1;
        const sp = v.state === 'leave' ? 58 : 34;
        v.x += (dx / d) * sp * dt; v.y += (dy / d) * sp * dt;
        v.moving = true;
      } else {
        v.moving = false;
        if (v.state === 'arrive') { v.state = 'wander'; }
        else if (v.state === 'leave') { visitors.splice(i, 1); continue; }
        else {
          v.wait = (v.wait || 0) - dt;
          if (v.wait <= 0) {
            v.wait = 2.5 + Math.random() * 4;
            v.tx = U.clamp(v.x + U.rand(-140, 140), 90, W - 90);
            v.ty = U.clamp(v.y + U.rand(-40, 40), walk.y0 + 12, walk.y1 - 6);
          }
        }
      }
      v.stay -= dt;
      if (v.stay <= 0 && v.state === 'wander') {
        v.state = 'leave';
        v.tx = v.dir > 0 ? W + 50 : -50; v.ty = walk.y1 - 12;
        UI.toast(`${v.def.name} heads off`, '');
      }
    }
  }

  // ---- drawing --------------------------------------------------------------
  // The relief goes down under everything, because it is ground. The water
  // moves on top of it: glints that come and go, lily pads that bob.
  function drawGround(g) {
    if (!land) return;
    if (dirty1 >= dirty0) { paintCols(dirty0, dirty1); dirty0 = 1e9; dirty1 = -1; }
    g.drawImage(land, 0, Y0 - LY);
    for (const i of waterCells) {
      const cx = i % GW, cy = Math.floor(i / GW);
      const r = hash(cx, cy);
      const x = cx * CS, y = cy * CS + Y0 - Math.round((hgt[i] + wat[i]) * K);
      if (r < 0.16) {
        const on = Math.sin(t * (1.4 + r * 6) + r * 40);
        if (on > 0.55) Art.rect(g, x + Math.round(Math.sin(t + r * 9) * 2), y, 2 + Math.round(r * 18) % 3, 1, 'rgba(236,252,255,0.85)');
      } else if (r > 0.965 && wat[i] > 0.4) {
        const bob = Math.sin(t * 1.1 + r * 30) * 0.6;
        Art.ell(g, x, y + 1 + bob, 3.6, 1.6, '#1f5a2a');
        Art.ell(g, x, y + bob, 3.4, 1.5, '#3f8a3a');
        Art.rect(g, x - 0.5, y - 1.4 + bob, 1, 1.4, '#1f5a2a');
        if (r > 0.985) { Art.ell(g, x + 1, y - 1 + bob, 1.6, 1.2, '#f6d0e2'); Art.rect(g, x + 1, y - 1 + bob, 1, 1, '#fff2b4'); }
      }
    }
  }
  function drawReed(g, i) {
    const cx = i % GW, cy = Math.floor(i / GW), r = hash(cx * 3, cy * 7);
    const x = cx * CS + (r - 0.5) * 4, y = cy * CS + Y0 - Math.round((hgt[i] + wat[i]) * K) + 1;
    const n = 2 + Math.floor(r * 3);
    for (let k = 0; k < n; k++) {
      const hh = 7 + ((r * 97 + k * 13) % 8);
      const sway = Math.sin(t * 1.2 + r * 20 + k) * 1.6;
      const rx = x + k * 2 - n;
      Art.limb(g, rx, y, rx + sway, y - hh, 1.3, 0.6, k % 2 ? '#3f7a30' : '#2f6226');
      if ((k + Math.floor(r * 10)) % 3 === 0) { Art.rect(g, rx + sway - 1, y - hh - 4, 2, 4, '#6a4428'); Art.rect(g, rx + sway - 1, y - hh - 4, 1, 4, '#8a5c38'); }
    }
  }
  // the bugs go in the sorted pass with everything else
  function items(g) {
    const out = [];
    for (const b of bugs) out.push({ y: b.y, fn: () => drawBug(g, b) });
    for (const fr of frogs) out.push({ y: fr.y, fn: () => drawFrog(g, fr) });
    for (const i of edgeCells) if (hash(i, 7) < 0.22) out.push({ y: Math.floor(i / GW) * CS + Y0, fn: () => drawReed(g, i) });
    for (const v of visitors) out.push({ y: v.y, fn: () => drawVisitor(g, v) });
    return out;
  }
  const BUG_COL = [
    ['#2a3a1a', '#4a6a2a', '#7aa84a'],      // green
    ['#3a2418', '#6a4020', '#9a6a34'],      // brown
    ['#241a3a', '#403060', '#6a54a0'],      // blue-black
    ['#3a1a20', '#7a2a30', '#c04a4a'],      // red
  ];
  function drawBug(g, b) {
    const c = BUG_COL[b.col];
    const y = b.y - b.z;
    if (b.kind === 'butterfly' || b.kind === 'moth') {
      const flap = Math.abs(Math.sin(b.t * 9));
      const w = 2 + flap * 3.4;
      const wc = b.kind === 'moth' ? '#c8bfa4' : ['#f0a0c0', '#f4dc6a', '#8fd4e4', '#c8a0e8'][b.col];
      Art.ell(g, b.x, y, 1, 2, '#2a2018');
      for (const sd of [-1, 1]) {
        Art.ell(g, b.x + sd * (w * 0.7), y - 1, w, 2.6, wc);
        Art.ell(g, b.x + sd * (w * 0.6), y + 1.2, w * 0.7, 1.8, U.shade(wc, -0.22));
        Art.rect(g, b.x + sd * (w * 0.9), y - 1, 1, 1, '#ffffff');
      }
      Art.rect(g, b.x - 1, y - 3, 1, 1.4, '#2a2018'); Art.rect(g, b.x + 1, y - 3, 1, 1.4, '#2a2018');
      g.fillStyle = 'rgba(0,0,0,0.16)'; Art.ell(g, b.x, b.y + 1, 3, 1.2);
      return;
    }
    if (b.kind === 'bee') {
      const flap = Math.abs(Math.sin(b.t * 24));
      Art.ell(g, b.x, y, 2.6, 2, '#2a2018');
      Art.ell(g, b.x, y - 0.3, 2.2, 1.6, '#f2c93a');
      for (let i = -1; i <= 1; i++) Art.rect(g, b.x + i * 1.3, y - 1.4, 0.9, 2.6, '#2a2018');
      Art.ell(g, b.x - 0.4, y - 2 - flap, 2, 1, 'rgba(230,244,255,0.75)');
      g.fillStyle = 'rgba(0,0,0,0.14)'; Art.ell(g, b.x, b.y + 1, 2.4, 1);
      return;
    }
    if (b.kind === 'dragonfly') {
      const flap = Math.abs(Math.sin(b.t * 30));
      Art.rect(g, b.x - 1, y - 1, 8, 1.6, '#1a3a40');
      Art.rect(g, b.x - 1, y - 1, 8, 0.8, '#2f8a9a');
      Art.ell(g, b.x - 2, y - 1, 2, 2, '#2f8a9a');
      Art.rect(g, b.x - 3, y - 2, 1.4, 1.4, '#0d1a20');
      for (const sd of [-1, 1]) Art.ell(g, b.x + 1, y - 1 + sd * (1 + flap), 4.4, 1.1, 'rgba(210,240,250,0.6)');
      g.fillStyle = 'rgba(0,0,0,0.14)'; Art.ell(g, b.x + 2, b.y + 1, 4, 1.2);
      return;
    }
    if (b.kind === 'snail') {
      Art.ell(g, b.x, b.y, 3.6, 2.2, '#8a7a5a');                 // the shell
      Art.ell(g, b.x, b.y - 0.3, 3, 1.8, '#b8a074');
      for (let i = 0; i < 3; i++) Art.ell(g, b.x + b.dir * i * 0.6, b.y - 0.2, 2.4 - i * 0.7, 1.4 - i * 0.4, i % 2 ? '#8a7a5a' : '#d8c49a');
      Art.ell(g, b.x + b.dir * 4, b.y + 1.2, 2.6, 1.2, '#c9b8a0');  // the foot
      Art.rect(g, b.x + b.dir * 5, b.y - 1.4, 0.8, 2.4, '#c9b8a0'); // eye stalks
      Art.rect(g, b.x + b.dir * 6.2, b.y - 1, 0.8, 2, '#c9b8a0');
      Art.rect(g, b.x + b.dir * 5, b.y - 2, 1, 1, '#2a2018');
      return;
    }
    if (b.kind === 'lizard') {
      const wig = Math.sin(b.t * 6) * 1.4;
      Art.ell(g, b.x, b.y, 5.4, 2.2, '#3a4a2a');
      Art.ellBand(g, b.x, b.y, 5.4, 2.2, '#5a7040', 0, 0.5);
      Art.ell(g, b.x + b.dir * 5, b.y - 0.6, 2.6, 1.8, '#5a7040');   // head
      Art.rect(g, b.x + b.dir * 6, b.y - 1.2, 1, 1, '#d8c43a');      // eye
      for (let i = 0; i < 4; i++) Art.rect(g, b.x - b.dir * (5 + i * 1.6), b.y + wig * (i / 4), 2, 1, '#3a4a2a');  // tail
      for (const sd of [-1, 1]) { Art.rect(g, b.x - 1, b.y + sd * 1.6, 3, 1, '#2f3a20'); Art.rect(g, b.x + 3, b.y + sd * 1.6, 3, 1, '#2f3a20'); }
      Art.speckle(g, b.x, b.y, 5, 2, '#78924e', 6, 3);
      return;
    }
    if (b.kind === 'ant') {
      Art.ell(g, b.x, b.y, 1.2, 1, c[0]);
      Art.ell(g, b.x + b.dir * 1.6, b.y, 1, 0.9, c[0]);
      Art.ell(g, b.x - b.dir * 1.6, b.y, 1.4, 1.1, c[0]);
      for (const sd of [-1, 1]) Art.rect(g, b.x - 1, b.y + sd * 1.2, 3, 0.8, c[0]);
      return;
    }
    // a beetle: a domed shell with a seam down it and six little legs
    const step = Math.sin(b.t * 12) * 0.8;
    for (const sd of [-1, 1]) for (let i = 0; i < 3; i++) {
      Art.rect(g, b.x - 2 + i * 2, b.y + sd * (1.8 + (i === 1 ? step : -step) * 0.4), 1.6, 0.9, c[0]);
    }
    Art.ell(g, b.x, b.y, 3.4, 2.4, c[0]);
    Art.ell(g, b.x, b.y - 0.3, 3, 2, c[1]);
    Art.ellBand(g, b.x, b.y - 0.3, 3, 2, c[2], 0, 0.45);
    Art.rect(g, b.x - 0.4, b.y - 2, 0.9, 4, c[0]);                // the seam
    Art.ell(g, b.x + b.dir * 3, b.y - 0.4, 1.4, 1.2, c[0]);       // the head
    Art.rect(g, b.x + b.dir * 4, b.y - 1.6, 0.8, 1.6, c[0]);      // an antenna
  }
  function drawFrog(g, fr) {
    const hop = Math.sin(Math.max(0, fr.hop) * Math.PI) * 7;
    const y = fr.y - hop;
    const puff = fr.croak > 0 ? 1 + (1 - fr.croak) * 1.6 : 0;
    g.fillStyle = 'rgba(0,0,0,0.2)'; Art.ell(g, fr.x, fr.y + 1, 4, 1.4);
    Art.ell(g, fr.x, y, 4.2, 3, '#2a4a24');
    Art.ell(g, fr.x, y - 0.4, 3.6, 2.4, '#4a7a34');
    Art.ellBand(g, fr.x, y - 0.4, 3.6, 2.4, '#6ea84a', 0, 0.45);
    Art.speckle(g, fr.x, y, 3.4, 2, '#2a4a24', 5, 3);
    Art.ell(g, fr.x + fr.dir * 1, y + 1.4, 2.8, 1.2, '#b8cf8a');            // the pale throat
    if (puff) Art.ell(g, fr.x + fr.dir * 1.4, y + 2, 1.4 + puff, 1 + puff * 0.7, '#cfe4a0');
    for (const sd of [-1, 1]) {                                            // two bulging eyes
      Art.ell(g, fr.x + sd * 1.8, y - 2.4, 1.5, 1.4, '#2a4a24');
      Art.ell(g, fr.x + sd * 1.8, y - 2.6, 1.1, 1, '#e8d84a');
      Art.rect(g, fr.x + sd * 1.8 - 0.4, y - 2.8, 0.9, 1.2, '#140f08');
    }
    for (const sd of [-1, 1]) Art.limb(g, fr.x - 1, y + 1, fr.x - sd * 3.4, y + 2.4, 1.6, 1, '#3a5f2c');
    if (fr.croak > 0.4) {                                                  // a small croak
      g.globalAlpha = fr.croak;
      Font.draw(g, 'brp', fr.x + 8, y - 10, { scale: 1, color: '#cfe4a0' });
      g.globalAlpha = 1;
    }
  }
  function drawVisitor(g, v) {
    const d = v.def;
    const pose = v.state === 'talk' ? d.poses.talk : v.moving ? d.poses.walk : d.poses.idle;
    let img = d.sprite(Math.floor(v.anim), pose);
    if (v.dir < 0) img = Art.flip(img);
    const w = img.width * d.sc, h = img.height * d.sc;
    Art.castShadow(g, img, v.x, v.y + 2, w, h, { alpha: 0.3, lean: 0.55, squash: 0.28 });
    g.drawImage(img, Math.round(v.x - w / 2), Math.round(v.y - h + 4 + (v.bob || 0)), Math.round(w), Math.round(h));
    // a nameplate over them, so you can tell who has turned up from across the plot
    const label = d.name.toUpperCase();
    const lw = Font.width(label, 1) + 10;
    const ly = v.y - h - 4;
    const a = 0.6 + 0.4 * Math.sin(t * 3);
    Art.rect(g, v.x - lw / 2, ly, lw, 12, 'rgba(18,12,8,0.6)');
    Art.rect(g, v.x - lw / 2 + 1, ly + 1, lw - 2, 10, '#f4e8d0');
    Font.draw(g, label, v.x, ly + 3, { scale: 1, color: '#5a3a20', align: 'center' });
    if (v.state !== 'talk' && !v.gave) {
      g.globalAlpha = a;
      Font.draw(g, 'TALK', v.x, ly - 11, { scale: 1, color: '#f5cd5c', align: 'center', shadow: '#2a1608' });
      g.globalAlpha = 1;
    }
  }

  return {
    init, save, update, drawGround, items,
    place, level, sculpt, flatten, canPlace, onPond, onMound, visitorAt, talkTo, spawnVisitor,
    pour, heightAt, waterAt, liftAt, blocked,
    get hasWater() { return waterCells.length > 0; },
    get mounds() { return mounds; }, get ponds() { return ponds; },
    get bugs() { return bugs; },
    bugsNear(x, y, r) { let n = 0; for (const b of bugs) if (Math.hypot(b.x - x, (b.y - y) * 1.4) < r) n++; return n; },
    get visitors() { return visitors; },
    MOUND_COST, POND_COST,
  };
})();
