// ---- The grove floor: painted terrain, no tile grid ----------------------
// Two offscreen layers hold what you have painted: grass, and tilled soil on
// top of it. Brushes are pre-rendered dithered discs stamped along the drag
// path, so a fast sweep never leaves gaps and nothing snaps to a lattice.
// Weeds, bugs, crops and blades live at float positions.
const World = (() => {
  const W = 640, H = 360;
  const SKY = 118, GROUND = SKY + 2;
  let G = null;
  let grass = null, soil = null, sample = null;
  const stamps = new Map();
  const weeds = [], bugs = [], blades = [], crops = [], seams = [], litter = [];
  let restored = 0, sampleT = 0, seedT = 0;

  // ---- brush stamps -------------------------------------------------------
  function stampSet(kind, r) {
    const key = `${kind}:${r}`;
    let set = stamps.get(key);
    if (set) return set;
    set = [];
    const palettes = {
      grass: [PAL.moss1, PAL.moss2, PAL.moss3, PAL.moss4],
      soil: [PAL.soil1, PAL.soil2, PAL.soil3],
      mask: ['#fff'],
    };
    const cols = palettes[kind] || palettes.mask;
    for (let v = 0; v < 4; v++) {
      const d = r * 2 + 2;
      const { c, g } = Art.cv(d, d);
      const rnd = Art.rng(r * 977 + v * 31 + (kind === 'soil' ? 7 : 0));
      const cx = d / 2, cy = d / 2;
      for (let y = 0; y < d; y++) {
        for (let x = 0; x < d; x++) {
          const dx = x - cx + 0.5, dy = (y - cy + 0.5) * 1.35;   // squashed: ground is seen at an angle
          const dist = Math.hypot(dx, dy) / r;
          if (dist > 1) continue;
          if (dist > 0.66 && rnd() > (1 - dist) / 0.34) continue;  // dithered rim
          let col = cols[Math.floor(rnd() * cols.length)];
          if (kind === 'grass' && dist < 0.4 && rnd() < 0.3) col = PAL.moss4;
          if (kind === 'soil' && Math.floor(y / 3) % 2 === 0 && rnd() < 0.5) col = PAL.soil1;   // furrows
          g.fillStyle = col;
          g.fillRect(x, y, 1, 1);
        }
      }
      set.push(c);
    }
    stamps.set(key, set);
    return set;
  }

  function paint(layer, kind, x, y, r) {
    const set = stampSet(kind, r);
    const img = set[Math.floor(Math.random() * set.length)];
    layer.getContext('2d').drawImage(img, Math.round(x - img.width / 2), Math.round(y - img.height / 2));
  }
  function erase(layer, x, y, r) {
    const set = stampSet('mask', r);
    const img = set[Math.floor(Math.random() * set.length)];
    const g = layer.getContext('2d');
    g.save();
    g.globalCompositeOperation = 'destination-out';
    g.drawImage(img, Math.round(x - img.width / 2), Math.round(y - img.height / 2));
    g.restore();
  }
  function hasSoil(x, y) {
    if (y < GROUND) return false;
    try { return soil.getContext('2d').getImageData(Math.round(x), Math.round(y), 1, 1).data[3] > 40; } catch (e) { return false; }
  }
  function hasGrass(x, y) {
    if (y < GROUND) return false;
    try { return grass.getContext('2d').getImageData(Math.round(x), Math.round(y), 1, 1).data[3] > 40; } catch (e) { return false; }
  }

  // ---- setup --------------------------------------------------------------
  function init(g) {
    G = g;
    grass = Art.cv(W, H).c;
    soil = Art.cv(W, H).c;
    sample = Art.cv(160, 90).c;
    weeds.length = bugs.length = blades.length = crops.length = seams.length = litter.length = 0;
    const r = Art.rng(90210);
    // the grove you inherit: choked with weeds, crawling, strewn with deadfall
    for (let i = 0; i < 96; i++) weeds.push({ x: 14 + r() * (W - 28), y: GROUND + 10 + r() * (H - GROUND - 24), v: Math.floor(r() * 3), s: 0.8 + r() * 0.5 });
    for (let i = 0; i < 16; i++) bugs.push(newBug(r));
    for (let i = 0; i < 26; i++) litter.push({ x: 8 + r() * (W - 16), y: GROUND + 4 + r() * (H - GROUND - 14), v: Math.floor(r() * 4), f: r() < 0.5 ? -1 : 1 });
    // restore anything the save had
    const s = G.world;
    if (s && Array.isArray(s.strokes)) for (const k of s.strokes) {
      if (k[0] === 'g') { paint(grass, 'grass', k[1], k[2], k[3]); erase(soil, k[1], k[2], k[3]); }
      else { paint(soil, 'soil', k[1], k[2], k[3]); erase(grass, k[1], k[2], k[3]); }
    }
    if (s && Array.isArray(s.blades)) for (const b of s.blades) blades.push(b);
    if (s && Array.isArray(s.crops)) for (const c of s.crops) crops.push(c);
    if (s && Array.isArray(s.weeds)) {
      weeds.length = 0;
      for (const w of s.weeds) weeds.push({ x: w.x, y: w.y, v: w.v || 0, s: w.s || 1 });
    }
    if (s && s.bugsOut) bugs.length = 0;
    measure();
  }
  function newBug(rnd) {
    const r = rnd || Math.random;
    return {
      x: 14 + r() * (W - 28), y: GROUND + 12 + r() * (H - GROUND - 26),
      vx: (r() - 0.5) * 26, vy: (r() - 0.5) * 14, v: Math.floor(r() * 3),
      ph: r() * TAU, hop: 0,
    };
  }
  // Strokes are the save format: replaying them rebuilds the exact terrain.
  function record(kind, x, y, r) {
    const s = G.world;
    if (!s.strokes) s.strokes = [];
    s.strokes.push([kind, Math.round(x), Math.round(y), r]);
    if (s.strokes.length > 4200) s.strokes.splice(0, 600);   // keep saves bounded
  }

  // ---- brush actions ------------------------------------------------------
  function brushRadius(base) {
    let r = base;
    if (G.fruits.broadbrush) r *= 1.35;
    if (G.blessings.hephaeswomb) r *= 2;
    return Math.max(4, Math.round(r));
  }
  function sowGrass(x, y, r) {
    if (y < GROUND) return false;
    paint(grass, 'grass', x, y, r);
    erase(soil, x, y, r);
    record('g', x, y, r);
    // a few standing blades so grass is not just a flat wash
    const n = 1 + Math.floor(r / 8);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, d = Math.sqrt(Math.random()) * r * 0.85;
      const bx = x + Math.cos(a) * d, by = y + Math.sin(a) * d * 0.72;
      if (by < GROUND + 2 || blades.length > 900) continue;
      blades.push({ x: +bx.toFixed(1), y: +by.toFixed(1), v: Math.floor(Math.random() * 3), h: 3 + Math.floor(Math.random() * 4) });
    }
    FX.burst(x, y, 3, { color: [PAL.moss4, PAL.moss3, PAL.moss5], speed: 32, gravity: -12, life: 0.5, size: 2 });
    return true;
  }
  function till(x, y, r) {
    if (y < GROUND) return false;
    paint(soil, 'soil', x, y, r);
    erase(grass, x, y, r);
    record('s', x, y, r);
    for (let i = blades.length - 1; i >= 0; i--) {
      const b = blades[i];
      if (Math.abs(b.x - x) < r && Math.abs(b.y - y) < r * 0.8) blades.splice(i, 1);
    }
    FX.burst(x, y, 4, { color: [PAL.soil2, PAL.soil3, PAL.soil1], speed: 40, gravity: 90, life: 0.4, size: 2 });
    if (G.blessings.chonkades && Math.random() < 0.02 && seams.length < 12) {
      seams.push({ x, y, t: 0 });
      FX.sparkle(x, y, 8, PAL.gold3);
    }
    return true;
  }
  function clearWeeds(x, y, r) {
    let n = 0;
    for (let i = weeds.length - 1; i >= 0; i--) {
      const w = weeds[i];
      if (Math.hypot(w.x - x, (w.y - y) * 1.3) < r) {
        weeds.splice(i, 1); n++;
        FX.burst(w.x, w.y, 5, { color: [PAL.rot1, PAL.rot2, PAL.dead2], speed: 55, gravity: 120, life: 0.45, size: 2 });
      }
    }
    if (n) { G.world.weeds = weeds.map((w) => ({ x: w.x, y: w.y, v: w.v, s: w.s })); Audio.play('snip'); }
    return n;
  }
  function catchBugs(x, y, r) {
    let n = 0;
    for (let i = bugs.length - 1; i >= 0; i--) {
      const b = bugs[i];
      if (Math.hypot(b.x - x, (b.y - y) * 1.3) < r) {
        bugs.splice(i, 1); n++;
        FX.burst(b.x, b.y, 6, { color: [PAL.cyan3, PAL.cream], speed: 70, gravity: 40, life: 0.4, size: 2 });
        FX.ring(b.x, b.y, 14, 'rgba(121,220,237,0.7)');
      }
    }
    if (n) Audio.play('pop');
    return n;
  }
  function plant(x, y, key) {
    if (!hasSoil(x, y)) return false;
    const def = CROP_BY_KEY[key];
    if (!def) return false;
    for (const c of crops) if (Math.hypot(c.x - x, (c.y - y) * 1.4) < 13) return false;
    if ((G.seeds[key] || 0) <= 0) return false;
    G.seeds[key]--;
    crops.push({ x: +x.toFixed(1), y: +y.toFixed(1), k: key, t: 0, wet: 0 });
    FX.burst(x, y, 4, { color: [def.color, PAL.soil3], speed: 30, gravity: 60, life: 0.4, size: 2 });
    return true;
  }
  function water(x, y, r) {
    let n = 0;
    for (const c of crops) if (Math.hypot(c.x - x, (c.y - y) * 1.3) < r) { c.wet = Math.min(14, c.wet + 3); n++; }
    for (let i = 0; i < 2; i++) FX.spawn({ x: x + U.rand(-r * 0.6, r * 0.6), y: y - 10, vx: 0, vy: 90, life: 0.35, size: 2, color: PAL.water2, gravity: 200 });
    return n;
  }
  function ripe(c) { return c.t >= growTime(c); }
  function growTime(c) {
    const def = CROP_BY_KEY[c.k];
    let t = def.grow;
    if (G.fruits.quickseed) t *= 0.67;
    if (G.blessings.demewombra) t *= 0.5;
    return t;
  }
  function harvest(x, y) {
    for (let i = crops.length - 1; i >= 0; i--) {
      const c = crops[i];
      if (Math.hypot(c.x - x, (c.y - y) * 1.4) > 16) continue;
      if (!ripe(c)) return 'unripe';
      const def = CROP_BY_KEY[c.k];
      crops.splice(i, 1);
      G.food[c.k] = (G.food[c.k] || 0) + def.yield;
      G.stats.harvested = (G.stats.harvested || 0) + 1;
      Audio.play('pluck');
      FX.burst(c.x, c.y - 8, 8, { color: [def.color, PAL.cream], speed: 70, gravity: 120, life: 0.5, size: 2 });
      FX.float(c.x, c.y - 20, '+' + def.yield, { color: PAL.moss5, size: 8 });
      return 'ok';
    }
    for (let i = seams.length - 1; i >= 0; i--) {
      const s = seams[i];
      if (Math.hypot(s.x - x, (s.y - y) * 1.4) > 15) continue;
      seams.splice(i, 1);
      G.offerings.gold = (G.offerings.gold || 0) + 1;
      Audio.play('coin');
      FX.sparkle(s.x, s.y, 14, PAL.gold4);
      FX.float(s.x, s.y - 18, '+1', { color: PAL.gold4, size: 9 });
      return 'gold';
    }
    return null;
  }

  // ---- simulation ---------------------------------------------------------
  function update(dt) {
    for (const c of crops) {
      const wet = c.wet > 0 ? 1.5 : 1;
      if (c.wet > 0) c.wet -= dt;
      c.t += dt * wet * (G.blessings.burrowseidon ? 1.25 : 1);
    }
    for (const b of bugs) {
      b.ph += dt * 3;
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (Math.random() < 0.02) { b.vx = U.rand(-30, 30); b.vy = U.rand(-16, 16); }
      if (b.x < 10 || b.x > W - 10) b.vx *= -1;
      if (b.y < GROUND + 8 || b.y > H - 12) b.vy *= -1;
      b.x = U.clamp(b.x, 10, W - 10); b.y = U.clamp(b.y, GROUND + 8, H - 12);
    }
    // bugs breed back unless Artewombis keeps them out
    if (!G.blessings.artewombis && bugs.length < 18 && Math.random() < dt * 0.05) bugs.push(newBug());
    for (const s of seams) s.t += dt;
    // Deep Roots and the storm blessing creep grass outward on their own
    if (G.fruits.deeproots || G.blessings.wombeus) {
      seedT += dt;
      const every = G.blessings.wombeus ? 1.1 : 2.4;
      if (seedT > every && blades.length) {
        seedT = 0;
        const b = U.pick(blades);
        const a = Math.random() * TAU, d = 12 + Math.random() * 16;
        const nx = U.clamp(b.x + Math.cos(a) * d, 6, W - 6);
        const ny = U.clamp(b.y + Math.sin(a) * d * 0.7, GROUND + 4, H - 6);
        if (!hasGrass(nx, ny) && !hasSoil(nx, ny)) sowGrass(nx, ny, 9);
      }
    }
    sampleT += dt;
    if (sampleT > 1.6) { sampleT = 0; measure(); }
  }
  // Exact coverage read straight off the paint layer, downscaled for speed.
  function measure() {
    try {
      const g = sample.getContext('2d');
      g.clearRect(0, 0, 160, 90);
      g.imageSmoothingEnabled = false;
      g.drawImage(grass, 0, 0, 160, 90);
      const d = g.getImageData(0, 0, 160, 90).data;
      let n = 0;
      for (let i = 3; i < d.length; i += 4) if (d[i] > 40) n++;
      restored = n * 16;
      G.world.restored = restored;
    } catch (e) { }
  }
  function fraction() { return U.clamp(restored / RESTORE_TARGET, 0, 1); }

  // ---- drawing ------------------------------------------------------------
  function drawGround(g) {
    const f = fraction();
    // bare earth, greening slightly as the grove comes back
    const base = f < 0.5 ? U.mix('#6b6355', '#5f6a4a', f * 2) : U.mix('#5f6a4a', '#4f6a3c', (f - 0.5) * 2);
    g.fillStyle = base; g.fillRect(0, GROUND - 2, W, H - GROUND + 2);
    g.fillStyle = 'rgba(30,22,18,0.28)';
    for (let i = 0; i < 40; i++) { const x = (i * 73) % W, y = GROUND + 8 + ((i * 137) % (H - GROUND - 16)); g.fillRect(x, y, 7 + (i % 3) * 4, 2); }
    g.fillStyle = 'rgba(207,196,176,0.14)';
    for (let i = 0; i < 22; i++) g.fillRect((i * 113) % W, GROUND + 14 + ((i * 61) % (H - GROUND - 22)), 4, 2);
    // painted layers
    g.drawImage(grass, 0, 0);
    g.drawImage(soil, 0, 0);
  }
  function drawBlades(g) {
    for (const b of blades) {
      const sway = Math.sin(G.time * 1.6 + b.x * 0.06) * 1.2;
      g.fillStyle = [PAL.moss2, PAL.moss3, PAL.moss4][b.v];
      g.fillRect(b.x | 0, (b.y - b.h) | 0, 1, b.h);
      g.fillRect((b.x + sway) | 0, (b.y - b.h - 1) | 0, 1, 2);
      g.fillStyle = PAL.moss1;
      g.fillRect((b.x + 1) | 0, (b.y - b.h * 0.6) | 0, 1, b.h * 0.6);
    }
  }
  function drawWeeds(g) {
    for (const w of weeds) {
      const s = w.s, sway = Math.sin(G.time * 1.1 + w.x * 0.08) * 1.4;
      g.fillStyle = PAL.rot0;
      g.fillRect(w.x | 0, (w.y - 8 * s) | 0, 2, 8 * s);
      g.fillStyle = [PAL.rot1, PAL.rot2, PAL.dead3][w.v];
      for (let i = 0; i < 4; i++) {
        const ly = w.y - 3 - i * 2.4 * s, side = i % 2 ? 1 : -1;
        g.fillRect((w.x + side * (2 + i) + sway * (i / 4)) | 0, ly | 0, 3, 1);
      }
      g.fillStyle = PAL.rot2;
      g.fillRect((w.x + sway) | 0, (w.y - 11 * s) | 0, 2, 3);
    }
  }
  function drawBugs(g) {
    for (const b of bugs) {
      const hop = Math.abs(Math.sin(b.ph)) * 2;
      const y = b.y - hop;
      g.fillStyle = 'rgba(20,16,14,0.25)'; g.fillRect((b.x - 2) | 0, b.y | 0, 5, 2);
      g.fillStyle = [PAL.ink2, '#4a3a1c', '#3a2a3a'][b.v];
      g.fillRect((b.x - 2) | 0, (y - 3) | 0, 5, 4);
      g.fillStyle = [PAL.rot2, PAL.gold1, PAL.div3][b.v];
      g.fillRect((b.x - 1) | 0, (y - 3) | 0, 3, 2);
      g.fillStyle = PAL.ink;
      const legf = Math.sin(b.ph * 3) > 0 ? 1 : 0;
      g.fillRect((b.x - 3) | 0, (y - 1 + legf) | 0, 1, 1);
      g.fillRect((b.x + 3) | 0, (y - 1 + (1 - legf)) | 0, 1, 1);
      g.fillRect((b.x - 3) | 0, (y - 3) | 0, 1, 1);
      g.fillRect((b.x + 3) | 0, (y - 3) | 0, 1, 1);
    }
  }
  function drawCrops(g) {
    for (const c of crops) {
      const def = CROP_BY_KEY[c.k];
      const p = U.clamp(c.t / growTime(c), 0, 1);
      Props.drawCrop(g, def, c.x, c.y, p, G.time, c.wet > 0);
    }
    for (const s of seams) {
      const pulse = 0.55 + 0.45 * Math.sin(G.time * 4 + s.x);
      g.fillStyle = `rgba(245,205,92,${0.35 + pulse * 0.3})`;
      Art.ell(g, s.x, s.y, 7, 3);
      g.fillStyle = PAL.gold3; g.fillRect((s.x - 2) | 0, (s.y - 2) | 0, 4, 3);
      g.fillStyle = PAL.gold4; g.fillRect((s.x - 1) | 0, (s.y - 2) | 0, 2, 1);
    }
  }
  function drawLitter(g) {
    for (const l of litter) {
      const img = Props.get('deadfall', l.v);
      g.drawImage(l.f < 0 ? Art.flip(img) : img, Math.round(l.x - img.width / 2), Math.round(l.y - img.height + 3));
    }
  }
  // ghost ring under the cursor, so a brush reads as a brush
  function drawCursor(g, x, y, r, col) {
    if (r <= 0) return;
    g.save();
    g.globalAlpha = 0.5 + 0.2 * Math.sin(G.time * 6);
    g.strokeStyle = col; g.lineWidth = 1;
    g.setLineDash([3, 4]);
    g.beginPath(); g.ellipse(x, y, r, r * 0.74, 0, 0, TAU); g.stroke();
    g.setLineDash([]);
    g.restore();
  }

  return {
    init, update, drawGround, drawBlades, drawWeeds, drawBugs, drawCrops, drawLitter, drawCursor,
    sowGrass, till, clearWeeds, catchBugs, plant, water, harvest, hasSoil, hasGrass, brushRadius,
    fraction, measure, ripe, growTime,
    get weeds() { return weeds; }, get bugs() { return bugs; }, get crops() { return crops; },
    get blades() { return blades; }, get seams() { return seams; },
    save() {
      G.world.blades = blades.map((b) => ({ x: b.x, y: b.y, v: b.v, h: b.h }));
      G.world.crops = crops.map((c) => ({ x: c.x, y: c.y, k: c.k, t: +c.t.toFixed(1), wet: 0 }));
      G.world.weeds = weeds.map((w) => ({ x: Math.round(w.x), y: Math.round(w.y), v: w.v, s: +w.s.toFixed(2) }));
      G.world.bugsOut = bugs.length === 0;
      G.world.restored = restored;
    },
    SKY, GROUND, W, H,
  };
})();
