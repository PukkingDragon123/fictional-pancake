// ---- The grove floor: a gridless, painted world ---------------------------
// There is no tile grid anywhere in this file. The ground is three offscreen
// canvases the size of the play field -- ash on top, soil and moss beneath --
// and every tool stamps a dithered disc into one of them at whatever float
// position the cursor happened to be. Sampling the ground means reading a
// pixel, not indexing a cell.
//
// Everything that stands on the ground -- weeds, crops, tufts, bugs, saplings
// -- is a free entity with float x/y, drawn back-to-front by y. Two crops can
// sit two pixels apart, or overlap, and nothing snaps.
const World = (() => {
  const W = 640, H = 360;
  const TOP = 116;                 // horizon: everything below this is ground
  const LH = H - TOP;              // layer height
  const CW = 80, CH = 30;          // coverage sampling resolution, for saves
  const CX = W / CW, CY = LH / CH;

  let ash, soil, moss, wet;        // {c, g} layers
  let ents = [];
  let windT = 0, coverT = 0, restored = 0, mossPx = 0;
  let sample;                      // small canvas used to measure coverage
  let G = null;

  // ---- layers -------------------------------------------------------------
  function blank() { return Art.cv(W, LH); }
  function build() {
    ash = blank(); soil = blank(); moss = blank(); wet = blank();
    // The ash starts total. It is drawn as a dense scatter rather than a flat
    // fill so that sweeping it reveals a broken, grainy edge.
    const g = ash.g;
    g.fillStyle = PAL.ash1; g.fillRect(0, 0, W, LH);
    const r = Art.rng(1717);
    for (let i = 0; i < 5200; i++) {
      const x = Math.floor(r() * W), y = Math.floor(r() * LH);
      g.fillStyle = r() < 0.5 ? PAL.ash0 : PAL.ash2;
      g.fillRect(x, y, 1 + (r() < 0.2 ? 1 : 0), 1);
    }
    for (let i = 0; i < 900; i++) {
      const x = Math.floor(r() * W), y = Math.floor(r() * LH);
      g.fillStyle = PAL.ash3; g.fillRect(x, y, 1, 1);
    }
    sample = Art.cv(CW, CH);
  }

  const inBand = (y) => y >= TOP && y < H;
  const ly = (y) => y - TOP;

  // ---- painting -----------------------------------------------------------
  // Each of these is one dithered stamp. Called every frame while a stroke is
  // held, so overlapping stamps accumulate into an organic, hand-worked patch.
  function sweepAsh(x, y, r, strength = 0.85) {
    if (!inBand(y)) return;
    Art.ditherErase(ash.g, x, ly(y), r, strength, 0.6);
  }
  function paintSoil(x, y, r, strength = 0.8) {
    if (!inBand(y)) return;
    const g = soil.g, yy = ly(y);
    Art.ditherErase(ash.g, x, yy, r * 0.9, strength, 0.6);
    Art.ditherDisc(g, x, yy, r, PAL.soil1, strength, 0.55);
    Art.ditherDisc(g, x, yy - 1, r * 0.7, PAL.soil2, strength * 0.7, 0.7);
    Art.ditherDisc(g, x, yy + r * 0.35, r * 0.5, PAL.soil0, strength * 0.5, 0.8);
    Art.fringe(g, x, yy, r, PAL.soil3, Math.round(r * 0.8), (x * 31 + yy * 17) | 0);
    // Tilling turns over anything growing in the patch.
    for (let i = ents.length - 1; i >= 0; i--) {
      const e = ents[i];
      if ((e.kind === 'weed' || e.kind === 'tuft') && U.dist(e.x, e.y, x, y) < r * 0.8) ents.splice(i, 1);
    }
  }
  function paintMoss(x, y, r, strength = 0.55) {
    if (!inBand(y)) return;
    const g = moss.g, yy = ly(y);
    Art.ditherDisc(g, x, yy, r, PAL.moss1, strength, 0.75);
    Art.ditherDisc(g, x, yy - 1, r * 0.72, PAL.moss2, strength * 0.85, 0.8);
    Art.ditherDisc(g, x, yy - 2, r * 0.4, PAL.moss3, strength * 0.7, 0.9);
    Art.fringe(g, x, yy, r, PAL.moss3, Math.round(r * 0.6), (x * 13 + yy * 29) | 0);
    Art.ditherErase(ash.g, x, yy, r, strength * 0.9, 0.7);
    if (U.chance(strength * 0.5)) addTuft(x + U.rand(-r, r) * 0.6, y + U.rand(-r, r) * 0.4);
  }
  function water(x, y, r) {
    if (!inBand(y)) return;
    Art.ditherDisc(wet.g, x, ly(y), r, PAL.wet1, 0.5, 0.8);
    for (const e of ents) if (e.kind === 'crop' && U.dist(e.x, e.y, x, y) < r) e.wet = Math.max(e.wet || 0, 12);
  }
  function dryOut(dt) {
    // Water fades unless Wellspring is learned.
    if (G && G.fruit && G.fruit.wellspring) return;
    if (U.chance(dt * 0.5)) {
      wet.g.globalAlpha = 0.06;
      wet.g.globalCompositeOperation = 'destination-out';
      wet.g.fillStyle = '#000'; wet.g.fillRect(0, 0, W, LH);
      wet.g.globalCompositeOperation = 'source-over';
      wet.g.globalAlpha = 1;
    }
  }

  // ---- sampling -----------------------------------------------------------
  // One shared 1x1 read. Cheap enough to call per wombat per second, which is
  // all anything needs.
  const probe = Art.cv(1, 1);
  function pixAlpha(layer, x, y) {
    if (!inBand(y) || x < 0 || x >= W) return 0;
    probe.g.clearRect(0, 0, 1, 1);
    probe.g.drawImage(layer.c, Math.floor(x), Math.floor(ly(y)), 1, 1, 0, 0, 1, 1);
    return probe.g.getImageData(0, 0, 1, 1).data[3] / 255;
  }
  const soilAt = (x, y) => pixAlpha(soil, x, y);
  const mossAt = (x, y) => pixAlpha(moss, x, y);
  const ashAt = (x, y) => pixAlpha(ash, x, y);
  const wetAt = (x, y) => pixAlpha(wet, x, y);

  // Coverage is measured by shrinking the moss layer onto an 80x30 canvas and
  // reading that, rather than by counting 155,000 pixels every frame.
  function measure() {
    const g = sample.g;
    g.clearRect(0, 0, CW, CH);
    g.drawImage(moss.c, 0, 0, CW, CH);
    const d = g.getImageData(0, 0, CW, CH).data;
    let sum = 0;
    for (let i = 3; i < d.length; i += 4) sum += d[i];
    mossPx = sum / (CW * CH * 255);
    restored = U.clamp(mossPx * 135, 0, 100);   // full green never quite needed
  }
  const restoration = () => restored;

  // ---- free-floating entities --------------------------------------------
  function add(e) { ents.push(e); return e; }
  function addWeed(x, y) { return add({ id: U.uid(), kind: 'weed', x, y, v: U.rand(0, 6), s: U.rand(0.8, 1.3), ph: U.rand(0, TAU) }); }
  function addBone(x, y) { return add({ id: U.uid(), kind: 'bone', x, y, v: U.randi(0, 3), s: U.rand(0.85, 1.25) }); }
  function addRock(x, y) { return add({ id: U.uid(), kind: 'rock', x, y, v: U.randi(0, 3), s: U.rand(0.8, 1.4) }); }
  function addTuft(x, y) {
    if (!inBand(y)) return null;
    for (const e of ents) if (e.kind === 'tuft' && U.dist(e.x, e.y, x, y) < 5) return null;
    return add({ id: U.uid(), kind: 'tuft', x, y, v: U.randi(0, 3), s: U.rand(0.8, 1.3), ph: U.rand(0, TAU) });
  }
  function addFlower(x, y) { return add({ id: U.uid(), kind: 'flower', x, y, v: U.randi(0, 3), s: U.rand(0.9, 1.2), ph: U.rand(0, TAU) }); }
  function addBug(x, y) {
    return add({ id: U.uid(), kind: 'bug', x, y, v: U.randi(0, 3), t: 0, tx: x, ty: y, ph: U.rand(0, TAU), s: 1 });
  }
  function addSapling(x, y) { return add({ id: U.uid(), kind: 'sapling', x, y, v: U.randi(0, 3), s: U.rand(0.9, 1.2), grow: 0, fruit: 0 }); }
  function sow(cropKey, x, y) {
    const def = CROP_BY_KEY[cropKey];
    if (!def || !inBand(y)) return null;
    return add({ id: U.uid(), kind: 'crop', crop: cropKey, x, y, t: 0, need: def.grow, wet: 0, v: U.randi(0, 3), s: U.rand(0.92, 1.1), ph: U.rand(0, TAU) });
  }
  function remove(e) { const i = ents.indexOf(e); if (i >= 0) ents.splice(i, 1); }
  function each(kind) { return ents.filter((e) => e.kind === kind); }
  function count(kind) { let n = 0; for (const e of ents) if (e.kind === kind) n++; return n; }
  function nearest(kind, x, y, maxD = 1e9, test) {
    let best = null, bd = maxD;
    for (const e of ents) {
      if (e.kind !== kind || (test && !test(e))) continue;
      const d = U.dist(e.x, e.y, x, y);
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }
  function within(x, y, r, kind) {
    const out = [];
    for (const e of ents) if ((!kind || e.kind === kind) && U.dist(e.x, e.y, x, y) <= r) out.push(e);
    return out;
  }
  const ripe = (e) => e.kind === 'crop' && e.t >= e.need;

  // ---- update -------------------------------------------------------------
  function update(dt, mult = 1) {
    windT += dt;
    dryOut(dt);
    for (let i = ents.length - 1; i >= 0; i--) {
      const e = ents[i];
      if (e.kind === 'crop') {
        if (e.t < e.need) {
          // e.wet is refreshed on the slow tick below, never per frame: a
          // pixel read per crop per frame would cost more than the growing.
          const rain = e.wet > 0 ? 2 : 1;
          e.t += dt * mult * rain;
          if (e.wet > 0) e.wet -= dt;
          if (e.t >= e.need) FX.spawn({ x: e.x, y: e.y - 8, vx: 0, vy: -14, life: 0.7, size: 2, color: PAL.moss4, type: 'star' });
        }
      } else if (e.kind === 'bug') {
        e.t -= dt;
        if (e.t <= 0) { e.t = U.rand(0.8, 2.4); e.tx = U.clamp(e.x + U.rand(-40, 40), 8, W - 8); e.ty = U.clamp(e.y + U.rand(-24, 24), TOP + 6, H - 6); }
        e.x += (e.tx - e.x) * dt * 1.6;
        e.y += (e.ty - e.y) * dt * 1.6;
      } else if (e.kind === 'sapling') {
        e.grow = Math.min(1, e.grow + dt / 90);
        if (e.grow >= 1) {
          e.fruit += dt / 45;
          if (e.fruit >= 1) { e.fruit -= 1; if (G) { G.fruitBank = (G.fruitBank || 0) + 1; FX.float(e.x, e.y - 20, '+1 fruit', { color: PAL.moss4, world: true }); } }
        }
      }
    }
    // Life returns on its own where the moss is thick enough to support it.
    coverT -= dt;
    if (coverT <= 0) {
      coverT = 1.4;
      measure();
      for (const e of ents) if (e.kind === 'crop' && e.t < e.need && e.wet <= 0 && wetAt(e.x, e.y) > 0.2) e.wet = 1.6;
      if (mossPx > 0.02 && count('bug') < 4 + Math.floor(restored / 12)) {
        const p = findMossy();
        if (p) addBug(p.x, p.y);
      }
      if (mossPx > 0.05 && count('flower') < Math.floor(restored / 6)) {
        const p = findMossy();
        if (p) addFlower(p.x, p.y);
      }
      if (G && G.fruit && G.fruit.orchard && count('sapling') < Math.floor(restored / 20)) {
        const p = findMossy();
        if (p) addSapling(p.x, p.y);
      }
    }
  }
  // Pick a spot the moss has actually reached. Ten darts is plenty and costs
  // nothing next to scanning the layer.
  function findMossy() {
    for (let i = 0; i < 10; i++) {
      const x = U.rand(16, W - 16), y = U.rand(TOP + 10, H - 8);
      if (mossAt(x, y) > 0.55) return { x, y };
    }
    return null;
  }

  // ---- drawing ------------------------------------------------------------
  function renderGround(g, night = 0) {
    // dead bedrock under everything
    g.fillStyle = PAL.bone0; g.fillRect(0, TOP, W, LH);
    g.fillStyle = U.rgba(PAL.ash0, 0.35); g.fillRect(0, TOP, W, LH);
    g.drawImage(soil.c, 0, TOP);
    g.drawImage(moss.c, 0, TOP);
    g.globalAlpha = 0.55; g.drawImage(wet.c, 0, TOP); g.globalAlpha = 1;
    g.drawImage(ash.c, 0, TOP);
    if (night > 0) { g.fillStyle = U.rgba(PAL.vio0, night * 0.42); g.fillRect(0, TOP, W, LH); }
  }

  // Static props are cached per (kind, variant) and blitted; only crops and
  // bugs are redrawn, because only they change.
  const propCache = new Map();
  function prop(kind, v) {
    const key = kind + v;
    let img = propCache.get(key);
    if (img) return img;
    const { c, g } = Art.cv(20, 20);
    const r = Art.rng(v * 977 + 5);
    if (kind === 'weed') {
      for (let i = 0; i < 5; i++) {
        const x = 10 + (i - 2) * 1.6, h = 4 + r() * 7;
        Art.line(g, x, 17, x + (r() - 0.5) * 4, 17 - h, i % 2 ? PAL.ash3 : PAL.bone0);
      }
      Art.rect(g, 8, 17, 5, 1, PAL.ash2);
    } else if (kind === 'bone') {
      if (v % 2) {
        Art.rect(g, 5, 15, 10, 2, PAL.bone3);
        Art.rect(g, 4, 14, 2, 4, PAL.bone2); Art.rect(g, 14, 14, 2, 4, PAL.bone2);
      } else {
        Art.ell(g, 10, 15, 5, 3.4, PAL.bone3);
        Art.rect(g, 7, 13, 2, 2, PAL.ink); Art.rect(g, 11, 13, 2, 2, PAL.ink);
        Art.rect(g, 9, 17, 3, 1, PAL.bone1);
      }
    } else if (kind === 'rock') {
      Art.ell(g, 10, 15, 5 + v, 3 + v * 0.4, PAL.stone1);
      Art.ellBand(g, 10, 15, 5 + v, 3 + v * 0.4, PAL.stone2, 0, 0.4);
      Art.ellBand(g, 10, 15, 5 + v, 3 + v * 0.4, PAL.stone0, 0.75, 1);
    } else if (kind === 'tuft') {
      for (let i = 0; i < 4 + v; i++) {
        const x = 10 + (r() - 0.5) * 7, h = 3 + r() * 5;
        Art.line(g, x, 17, x + (r() - 0.5) * 3, 17 - h, r() < 0.4 ? PAL.moss3 : PAL.moss2);
      }
    } else if (kind === 'flower') {
      const col = [PAL.goldL, PAL.vio4, PAL.bone4, PAL.bloodL][v % 4];
      Art.line(g, 10, 17, 10, 11, PAL.moss2);
      Art.rect(g, 9, 9, 3, 3, col);
      Art.rect(g, 8, 10, 1, 1, col); Art.rect(g, 12, 10, 1, 1, col);
      Art.rect(g, 10, 10, 1, 1, PAL.gold);
      Art.rect(g, 7, 14, 3, 1, PAL.moss3);
    }
    Art.outline(c, PAL.ink, 0.7);
    propCache.set(key, c);
    return c;
  }

  function drawCrop(g, e, t) {
    const def = CROP_BY_KEY[e.crop];
    if (!def) return;
    const grown = U.clamp(e.t / e.need, 0, 1);
    const sway = Math.sin(windT * 1.6 + e.ph) * (1 + grown);
    const h = (5 + grown * 15) * e.s;
    const x = e.x, y = e.y;
    const ready = grown >= 1;
    // stem
    Art.line(g, x, y, x + sway * 0.5, y - h, ready ? PAL.moss3 : PAL.moss1, 1);
    // leaves
    for (let i = 0; i < 2 + Math.floor(grown * 2); i++) {
      const ly2 = y - h * (0.3 + i * 0.22), s = i % 2 ? 1 : -1;
      Art.limb(g, x + sway * 0.3, ly2, x + s * (3 + grown * 3) + sway, ly2 - 2, 2, 1, ready ? PAL.moss3 : PAL.moss2);
    }
    if (grown > 0.55) {
      const hx = x + sway, hy = y - h;
      const col = def.offering === 'reliquary' ? PAL.gold
        : def.offering === 'iron' ? PAL.stone2
        : def.offering === 'ossuary' ? PAL.bone3
        : def.offering === 'boulder' ? PAL.blood
        : def.offering === 'resin' ? PAL.goldD
        : def.offering === 'pith' ? PAL.bone2
        : def.offering === 'slab' ? PAL.moss3 : PAL.moss4;
      const r = (1.6 + grown * 2.6) * e.s;
      Art.ell(g, hx, hy, r, r * 1.1, col);
      Art.ell(g, hx - r * 0.3, hy - r * 0.3, r * 0.35, r * 0.35, U.shade(col, 0.4));
      if (ready) {
        Art.rect(g, hx - 1, hy - r - 2, 1, 1, PAL.halo);
        if (Math.floor(t * 3) % 2 === 0) Art.rect(g, hx + 2, hy - r - 3, 1, 1, PAL.halo);
      }
    }
  }

  function drawBug(g, e, t) {
    const wob = Math.sin(t * 9 + e.ph);
    const col = [PAL.moss4, PAL.goldL, PAL.tealL, PAL.vio4][e.v % 4];
    Art.rect(g, e.x, e.y + wob * 0.5, 2, 2, col);
    Art.rect(g, e.x - 1, e.y - 1 + wob * 0.5, 1, 1, PAL.ink);
    Art.rect(g, e.x + 2, e.y - 1 - wob * 0.5, 1, 1, PAL.ink);
  }

  function drawSapling(g, e) {
    const h = 6 + e.grow * 26;
    Art.limb(g, e.x, e.y, e.x, e.y - h, 3 * e.grow + 1.5, 1.5, PAL.bark2);
    const cr = 4 + e.grow * 10;
    Art.ditherDisc(g, e.x, e.y - h - cr * 0.4, cr, PAL.moss1, 1, 0.35);
    Art.ditherDisc(g, e.x - 1, e.y - h - cr * 0.6, cr * 0.7, PAL.moss2, 1, 0.5);
    Art.ditherDisc(g, e.x - 2, e.y - h - cr * 0.8, cr * 0.4, PAL.moss3, 1, 0.7);
    if (e.grow >= 1) {
      const n = 1 + Math.floor(e.fruit * 3);
      for (let i = 0; i < n; i++) Art.rect(g, e.x - cr * 0.5 + i * 4, e.y - h - 2 + (i % 2) * 3, 2, 2, PAL.goldL);
    }
  }

  // Everything on the ground, sorted by y so a crop in front of a rock draws
  // in front of it. Wombats are merged into this list by the scene.
  function collect() { return ents; }
  function drawEntity(g, e, t) {
    if (e.kind === 'crop') return drawCrop(g, e, t);
    if (e.kind === 'bug') return drawBug(g, e, t);
    if (e.kind === 'sapling') return drawSapling(g, e);
    const img = prop(e.kind, e.v);
    const sway = (e.kind === 'weed' || e.kind === 'tuft' || e.kind === 'flower') ? Math.sin(windT * 1.3 + (e.ph || 0)) * 0.8 : 0;
    const w = img.width * e.s, h = img.height * e.s;
    g.drawImage(img, Math.round(e.x - w / 2 + sway), Math.round(e.y - h + 3), Math.round(w), Math.round(h));
  }

  // ---- the brush cursor ---------------------------------------------------
  function drawBrush(g, x, y, r, col, t) {
    if (!inBand(y)) return;
    g.globalAlpha = 0.75;
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * TAU + t * 0.6;
      Art.rect(g, x + Math.cos(a) * r, y + Math.sin(a) * r * 0.62, 1, 1, i % 3 ? col : PAL.bone4);
    }
    g.globalAlpha = 1;
  }

  // ---- save ---------------------------------------------------------------
  // Layers are stored as 80x30 coverage bytes rather than as pixels, and
  // re-stamped on load. A save stays a few kilobytes and the reloaded grove is
  // the same shape, if not the same speckle.
  function grid(layer) {
    const g = sample.g;
    g.clearRect(0, 0, CW, CH);
    g.drawImage(layer.c, 0, 0, CW, CH);
    const d = g.getImageData(0, 0, CW, CH).data;
    let s = '';
    for (let i = 3; i < d.length; i += 4) s += String.fromCharCode(d[i]);
    return btoa(s);
  }
  function stamp(layer, b64, paint) {
    if (!b64) return;
    let raw;
    try { raw = atob(b64); } catch (e) { return; }
    for (let i = 0; i < raw.length && i < CW * CH; i++) {
      const a = raw.charCodeAt(i) / 255;
      if (a < 0.12) continue;
      const gx = (i % CW) * CX + CX / 2, gy = Math.floor(i / CW) * CY + CY / 2;
      paint(gx, gy + TOP, Math.max(CX, CY) * 0.8, a);
    }
  }
  function serialize() {
    return {
      soil: grid(soil), moss: grid(moss), ash: grid(ash),
      ents: ents.filter((e) => e.kind !== 'bug').map((e) => ({
        k: e.kind, x: Math.round(e.x), y: Math.round(e.y), v: e.v, s: +(e.s || 1).toFixed(2),
        c: e.crop, t: e.t ? +e.t.toFixed(1) : 0, n: e.need, gr: e.grow ? +e.grow.toFixed(2) : 0,
      })),
    };
  }
  function restoreFrom(d) {
    if (!d) return false;
    // The ash grid says where ash still IS, so clear it all and put it back.
    ash.g.clearRect(0, 0, W, LH);
    stamp(ash, d.ash, (x, y, r, a) => Art.ditherDisc(ash.g, x, ly(y), r, U.chance(0.5) ? PAL.ash1 : PAL.ash2, a, 0.3));
    stamp(soil, d.soil, (x, y, r, a) => paintSoil(x, y, r, a * 0.9));
    stamp(moss, d.moss, (x, y, r, a) => paintMoss(x, y, r, a * 0.85));
    ents = [];
    for (const e of (d.ents || [])) {
      if (e.k === 'crop') { const c = sow(e.c, e.x, e.y); if (c) { c.t = e.t || 0; c.need = e.n || c.need; } }
      else if (e.k === 'weed') addWeed(e.x, e.y);
      else if (e.k === 'bone') { const b = addBone(e.x, e.y); b.v = e.v; }
      else if (e.k === 'rock') { const b = addRock(e.x, e.y); b.v = e.v; }
      else if (e.k === 'tuft') addTuft(e.x, e.y);
      else if (e.k === 'flower') addFlower(e.x, e.y);
      else if (e.k === 'sapling') { const s = addSapling(e.x, e.y); s.grow = e.gr || 0; }
    }
    measure();
    return true;
  }
  // A first grove: ash everywhere, bones and dead scrub scattered through it.
  function seed() {
    ents = [];
    for (let i = 0; i < 34; i++) addWeed(U.rand(14, W - 14), U.rand(TOP + 8, H - 6));
    for (let i = 0; i < 13; i++) addBone(U.rand(14, W - 14), U.rand(TOP + 12, H - 6));
    for (let i = 0; i < 16; i++) addRock(U.rand(14, W - 14), U.rand(TOP + 8, H - 6));
    measure();
  }

  function init(state, saved) {
    G = state;
    build();
    if (!saved || !restoreFrom(saved)) seed();
  }

  return {
    W, H, TOP, LH, init, update, renderGround, drawEntity, drawBrush, collect,
    sweepAsh, paintSoil, paintMoss, water,
    soilAt, mossAt, ashAt, wetAt, measure, restoration,
    add, addWeed, addBone, addRock, addTuft, addFlower, addBug, addSapling, sow,
    remove, each, count, nearest, within, ripe,
    serialize, restoreFrom, seed,
    get ents() { return ents; },
    get wind() { return windT; },
  };
})();
