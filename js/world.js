// ---- The grove floor: painted, gridless, and alive -----------------------
// Grass is not painted on instantly. Sowing scatters sprouts that need time and
// water; when one matures it stains the ground layer and puts up blades, and
// blades carry a little spring physics so anything walking through parts them.
const World = (() => {
  const W = 1024, H = 462;          // the grove is wider and deeper than the view; the camera pans
  const SKY = 126, GROUND = SKY + 2;
  let G = null;
  let grass = null, soil = null, sample = null;
  const SW = 256, SH = Math.round(H / (W / SW));   // the down-sample keeps the grove's own aspect
  const SX = W / SW, SY = H / SH;
  const stamps = new Map();
  const weeds = [], blades = [], crops = [], sprouts = [], flowers = [], seams = [];
  let restored = 0, sampleT = 0, spreadT = 0, wind = 0, windT = 0;
  let gustA = 0, gustWant = 0.5, gustT = 0;

  function stampSet(kind, r) {
    const key = `${kind}:${r}`;
    let set = stamps.get(key);
    if (set) return set;
    set = [];
    const cols = { grass: [PAL.moss1, PAL.moss2, PAL.moss3, PAL.moss4], soil: [PAL.soil1, PAL.soil2, PAL.soil3], mask: ['#fff'] }[kind] || ['#fff'];
    for (let v = 0; v < 4; v++) {
      const d = r * 2 + 2;
      const { c, g } = Art.cv(d, d);
      const rnd = Art.rng(r * 977 + v * 31 + kind.length);
      for (let y = 0; y < d; y++) for (let x = 0; x < d; x++) {
        const dx = x - d / 2 + 0.5, dy = (y - d / 2 + 0.5) * 1.35;
        const dist = Math.hypot(dx, dy) / r;
        if (dist > 1) continue;
        if (dist > 0.62 && rnd() > (1 - dist) / 0.38) continue;
        let col = cols[Math.floor(rnd() * cols.length)];
        if (kind === 'grass' && dist < 0.4 && rnd() < 0.3) col = PAL.moss4;
        if (kind === 'soil' && Math.floor(y / 3) % 2 === 0 && rnd() < 0.5) col = PAL.soil1;
        g.fillStyle = col; g.fillRect(x, y, 1, 1);
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
    g.save(); g.globalCompositeOperation = 'destination-out';
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

  function init(g) {
    G = g;
    grass = Art.cv(W, H).c; soil = Art.cv(W, H).c; sample = Art.cv(SW, SH).c;
    for (const a of [weeds, blades, crops, sprouts, flowers, seams]) a.length = 0;
    const r = Art.rng(51817);
    const s = G.world || {};
    if (!Array.isArray(s.weeds)) {
      for (let i = 0; i < 190; i++) weeds.push(mkWeed(14 + r() * (W - 28), GROUND + 12 + r() * (H - GROUND - 58), Math.floor(r() * 4), 1 + r() * 0.9));
    } else for (const w of s.weeds) weeds.push(mkWeed(w.x, w.y, w.v || 0, w.s || 1, w.hp));
    if (Array.isArray(s.strokes)) for (const k of s.strokes) {
      if (k[0] === 'g') { paint(grass, 'grass', k[1], k[2], k[3]); erase(soil, k[1], k[2], k[3]); }
      else { paint(soil, 'soil', k[1], k[2], k[3]); erase(grass, k[1], k[2], k[3]); }
    }
    if (Array.isArray(s.blades)) for (const b of s.blades) blades.push(mkBlade(b.x, b.y, b.v, b.h));
    if (Array.isArray(s.flowers)) for (const f of s.flowers) flowers.push({ x: f.x, y: f.y, v: f.v, bend: 0, vel: 0 });
    if (Array.isArray(s.crops)) for (const c of s.crops) crops.push({ x: c.x, y: c.y, k: c.k, t: c.t, wet: c.wet || 0, thirst: c.thirst || 0 });
    if (Array.isArray(s.sprouts)) for (const p of s.sprouts) sprouts.push({ x: p.x, y: p.y, t: p.t, wet: p.wet || 0, r: p.r || 12 });
    measure();
  }
  function mkWeed(x, y, v, s, hp) {
    const max = Math.min(4, Math.max(1, Math.round(WEED_HP[v] * (s > 1.5 ? 1.25 : 1))));
    return { x, y, v, s, hp: hp == null ? max : Math.min(max, hp), max, shake: 0, cd: 0, hitT: 9 };
  }
  function mkBlade(x, y, v, h) { return { x, y, v: v ?? Math.floor(Math.random() * 3), h: h ?? 4 + Math.floor(Math.random() * 5), bend: 0, vel: 0 }; }
  function record(kind, x, y, r) {
    const s = G.world;
    if (!s.strokes) s.strokes = [];
    s.strokes.push([kind, Math.round(x), Math.round(y), r]);
    if (s.strokes.length > 4600) s.strokes.splice(0, 700);
  }
  function brushRadius(base) {
    let r = base;
    if (G.fruits.broadbrush) r *= 1.35;
    if (G.blessings.hephaeswomb) r *= 2;
    return Math.max(4, Math.round(r));
  }

  // ---- brushes ------------------------------------------------------------
  function sowGrass(x, y, r) {
    if (y < GROUND) return false;
    for (const p of sprouts) if (Math.hypot(p.x - x, (p.y - y) * 1.3) < r * 0.7) return false;
    if (hasGrass(x, y) && Math.random() < 0.8) return false;
    sprouts.push({ x: +x.toFixed(1), y: +y.toFixed(1), t: 0, wet: 0, r: Math.max(8, Math.round(r * 0.8)) });
    FX.burst(x, y, 3, { color: [PAL.moss4, PAL.moss3], speed: 26, gravity: -8, life: 0.45, size: 2 });
    return true;
  }
  function bloom(p) {
    paint(grass, 'grass', p.x, p.y, p.r);
    erase(soil, p.x, p.y, p.r);
    record('g', p.x, p.y, p.r);
    const n = 2 + Math.floor(p.r / 6);
    for (let i = 0; i < n && blades.length < 1100; i++) {
      const a = Math.random() * TAU, d = Math.sqrt(Math.random()) * p.r * 0.85;
      const bx = p.x + Math.cos(a) * d, by = p.y + Math.sin(a) * d * 0.72;
      if (by < GROUND + 2) continue;
      blades.push(mkBlade(+bx.toFixed(1), +by.toFixed(1)));
    }
    if (Math.random() < 0.22 && flowers.length < 110) {
      flowers.push({ x: +(p.x + U.rand(-p.r * 0.6, p.r * 0.6)).toFixed(1), y: +(p.y + U.rand(-4, 4)).toFixed(1), v: Math.floor(Math.random() * 5), bend: 0, vel: 0 });
    }
    FX.burst(p.x, p.y, 7, { color: [PAL.moss4, PAL.moss5, PAL.moss3], speed: 46, gravity: -14, life: 0.6, size: 2 });
    Audio.play('pluck');
  }
  function till(x, y, r) {
    if (y < GROUND) return false;
    paint(soil, 'soil', x, y, r);
    erase(grass, x, y, r);
    record('s', x, y, r);
    for (let i = blades.length - 1; i >= 0; i--) { const b = blades[i]; if (Math.abs(b.x - x) < r && Math.abs(b.y - y) < r * 0.8) blades.splice(i, 1); }
    for (let i = flowers.length - 1; i >= 0; i--) { const f = flowers[i]; if (Math.abs(f.x - x) < r && Math.abs(f.y - y) < r * 0.8) flowers.splice(i, 1); }
    for (let i = sprouts.length - 1; i >= 0; i--) { const p = sprouts[i]; if (Math.abs(p.x - x) < r && Math.abs(p.y - y) < r * 0.8) sprouts.splice(i, 1); }
    FX.burst(x, y, 5, { color: [PAL.soil2, PAL.soil3, PAL.soil1], speed: 46, gravity: 110, life: 0.45, size: 2 });
    if (G.blessings.chonkades && Math.random() < 0.02 && seams.length < 12) { seams.push({ x, y, t: 0 }); FX.sparkle(x, y, 8, PAL.gold3); }
    return true;
  }
  // A sweep of the sickle hits everything in reach once; the weed shakes,
  // sheds leaves, and comes out on the swing that empties it. Returns the
  // spots where weeds died so the grove can drop coins there.
  function hitWeeds(x, y, r, dmg) {
    const dead = [];
    let hit = 0;
    for (let i = weeds.length - 1; i >= 0; i--) {
      const w = weeds[i];
      if (w.cd > 0) continue;
      if (Math.hypot(w.x - x, (w.y - y) * 1.3) > r) continue;
      w.hp -= dmg; w.cd = 0.32; w.shake = 1; w.hitT = 0; hit++;
      FX.burst(w.x, w.y - 10 * w.s, 4, { color: [PAL.rot1, PAL.rot2, PAL.dead2], speed: 60, gravity: 160, life: 0.45, size: 2 });
      if (w.hp <= 0) {
        weeds.splice(i, 1);
        dead.push({ x: w.x, y: w.y, big: w.s > 1.5 });
        FX.burst(w.x, w.y - 8, 10, { color: [PAL.rot1, PAL.rot2, PAL.dead2, '#a487d0'], speed: 90, gravity: 200, life: 0.6, size: 2 });
        FX.dust(w.x, w.y, 4, PAL.soil3);
      }
    }
    if (hit) {
      G.world.weeds = weeds.map((w) => ({ x: Math.round(w.x), y: Math.round(w.y), v: w.v, s: +w.s.toFixed(2), hp: w.hp }));
      Audio.play(dead.length ? 'snip' : 'brush');
    }
    return dead;
  }
  const clearWeeds = (x, y, r) => hitWeeds(x, y, r, 99).length;
  function plant(x, y, key) {
    if (!hasSoil(x, y)) return 'nosoil';
    const def = CROP_BY_KEY[key];
    if (!def) return false;
    for (const c of crops) if (Math.hypot(c.x - x, (c.y - y) * 1.4) < 14) return false;
    if ((G.seeds[key] || 0) <= 0) return 'noseed';
    G.seeds[key]--;
    crops.push({ x: +x.toFixed(1), y: +y.toFixed(1), k: key, t: 0, wet: 6, thirst: 0 });
    FX.burst(x, y, 4, { color: [def.color, PAL.soil3], speed: 30, gravity: 60, life: 0.4, size: 2 });
    return 'ok';
  }
  function water(x, y, r) {
    let n = 0;
    for (const c of crops) if (Math.hypot(c.x - x, (c.y - y) * 1.3) < r) { c.wet = Math.min(22, c.wet + 5); c.thirst = 0; n++; }
    for (const p of sprouts) if (Math.hypot(p.x - x, (p.y - y) * 1.3) < r) { p.wet = Math.min(20, p.wet + 5); n++; }
    for (let i = 0; i < 3; i++) FX.spawn({ x: x + U.rand(-r * 0.6, r * 0.6), y: y - 12, vx: 0, vy: 110, life: 0.3, size: 2, color: PAL.water2, gravity: 240 });
    disturb(x, y, r, 0.5);
    return n;
  }
  function growTime(c) {
    let t = CROP_BY_KEY[c.k].grow;
    if (G.fruits.quickseed) t *= 0.67;
    if (G.blessings.demewombra) t *= 0.5;
    return t;
  }
  const ripe = (c) => c.t >= growTime(c);
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
      FX.burst(c.x, c.y - 10, 9, { color: [def.color, PAL.cream], speed: 74, gravity: 130, life: 0.5, size: 2 });
      FX.float(c.x, c.y - 22, '+' + def.yield, { color: PAL.moss5, size: 8 });
      FX.comic(c.x, c.y - 32, U.pick(['POP!', 'PICK!', 'YOINK!']), { ink: '#d8f0a0', edge: '#5d9440', life: 0.55 });
      return 'ok';
    }
    for (let i = seams.length - 1; i >= 0; i--) {
      const s = seams[i];
      if (Math.hypot(s.x - x, (s.y - y) * 1.4) > 15) continue;
      seams.splice(i, 1);
      G.offerings.gold = (G.offerings.gold || 0) + 1;
      Audio.play('coin'); FX.sparkle(s.x, s.y, 14, PAL.gold4);
      FX.comic(s.x, s.y - 26, 'GOLD!', { ink: '#f5cd5c', edge: '#a97c1e', life: 0.9 });
      return 'gold';
    }
    return null;
  }
  // anything moving through the grass parts it
  function disturb(x, y, r, strength) {
    for (const b of blades) {
      const d = Math.hypot(b.x - x, (b.y - y) * 1.6);
      if (d > r) continue;
      const dir = b.x >= x ? 1 : -1;
      b.vel += dir * (1 - d / r) * strength * 34;
    }
    for (const f of flowers) {
      const d = Math.hypot(f.x - x, (f.y - y) * 1.6);
      if (d > r) continue;
      f.vel += (f.x >= x ? 1 : -1) * (1 - d / r) * strength * 22;
    }
  }

  // A gust is a wave that travels across the grove: everything rooted in the
  // ground leans to the same wave, which is what makes a field look alive.
  function gust(x) {
    return (Math.sin(G.time * 1.8 - x * 0.012) * 0.5 + 0.5) * gustA;
  }
  function update(dt) {
    // wind gusts drive the whole sward
    windT -= dt;
    if (windT <= 0) { windT = U.rand(3, 8); wind = U.rand(-1, 1) * U.rand(6, 22); }
    gustT -= dt;
    if (gustT <= 0) { gustT = U.rand(4, 11); gustWant = U.rand(0.25, 1.5); }
    gustA = U.lerp(gustA, gustWant, dt * 0.7);
    const w = wind * (0.5 + 0.5 * Math.sin(G.time * 0.7));
    for (const wd of weeds) {
      if (wd.cd > 0) wd.cd -= dt;
      if (wd.shake > 0) wd.shake = Math.max(0, wd.shake - dt * 3.2);
      wd.hitT += dt;
    }
    for (const b of blades) {
      b.vel += (-b.bend * 46 - b.vel * 7 + w * 0.5 + gust(b.x) * 7 + Math.sin(G.time * 2.2 + b.x * 0.09) * 3) * dt;
      b.bend += b.vel * dt;
      b.bend = U.clamp(b.bend, -2.6, 2.6);
    }
    for (const f of flowers) {
      f.vel += (-f.bend * 40 - f.vel * 6.5 + w * 0.35 + gust(f.x) * 5) * dt;
      f.bend += f.vel * dt;
      f.bend = U.clamp(f.bend, -2.2, 2.2);
    }
    // sprouts take root
    for (let i = sprouts.length - 1; i >= 0; i--) {
      const p = sprouts[i];
      const rate = p.wet > 0 ? 1.9 : 0.75;
      if (p.wet > 0) p.wet -= dt;
      p.t += dt * rate * (G.blessings.burrowseidon ? 1.3 : 1);
      if (p.t >= 16) { bloom(p); sprouts.splice(i, 1); }
    }
    // crops grow, and get thirsty if left alone
    for (const c of crops) {
      const wet = c.wet > 0;
      if (wet) c.wet -= dt; else c.thirst += dt;
      if (!ripe(c)) c.t += dt * (wet ? 1.7 : c.thirst > 26 ? 0.25 : 0.8) * (G.blessings.burrowseidon ? 1.25 : 1);
    }
    for (const s of seams) s.t += dt;
    if (G.fruits.deeproots || G.blessings.wombeus) {
      spreadT += dt;
      const every = G.blessings.wombeus ? 1.2 : 2.6;
      if (spreadT > every && blades.length) {
        spreadT = 0;
        const b = U.pick(blades);
        const a = Math.random() * TAU, d = 13 + Math.random() * 16;
        sowGrass(U.clamp(b.x + Math.cos(a) * d, 6, W - 6), U.clamp(b.y + Math.sin(a) * d * 0.7, GROUND + 4, H - 6), 10);
      }
    }
    sampleT += dt;
    if (sampleT > 1.5) { sampleT = 0; measure(); }
  }
  function measure() {
    try {
      const g = sample.getContext('2d');
      g.clearRect(0, 0, SW, SH); g.imageSmoothingEnabled = false;
      g.drawImage(grass, 0, 0, SW, SH);
      const d = g.getImageData(0, 0, SW, SH).data;
      let n = 0;
      for (let i = 3; i < d.length; i += 4) if (d[i] > 40) n++;
      restored = n * SX * SY;
      G.world.restored = restored;
      measureZone();
    } catch (e) { }
  }
  const fraction = () => U.clamp(restored / RESTORE_TARGET, 0, 1);
  // How green the clearing is, measured off the same down-sample.
  let zoneFrac = 0;
  function measureZone() {
    try {
      const d = sample.getContext('2d').getImageData(0, 0, SW, SH).data;
      let n = 0, tot = 0;
      for (let y = 0; y < SH; y++) for (let x = 0; x < SW; x++) {
        if (!inZone(x * SX + SX / 2, y * SY + SY / 2)) continue;
        tot++;
        if (d[(y * SW + x) * 4 + 3] > 40) n++;
      }
      zoneFrac = tot ? n / tot : 0;
    } catch (e) { }
  }
  const zoneFraction = () => zoneFrac;

  // ---- drawing ------------------------------------------------------------
  // A painted dirt bed, built once: banded tone, dithered grit, stones and
  // cracks. The green wash on top is how much of the forest has come back.
  let dirt = null;
  function dirtTex() {
    if (dirt) return dirt;
    const h = H - GROUND + 4;
    const { c, g } = Art.cv(W, h);
    const r = Art.rng(2468);
    for (let y = 0; y < h; y++) {
      const t = y / h;
      g.fillStyle = U.mix('#463f33', '#6d6252', U.easeOut(t));
      g.fillRect(0, y, W, 1);
    }
    for (let i = 0; i < 9000; i++) {
      const x = Math.floor(r() * W), y = Math.floor(r() * h);
      g.globalAlpha = 0.16 + r() * 0.3;
      g.fillStyle = ['#5b5344', '#776c59', '#3c362c', '#847863'][Math.floor(r() * 4)];
      g.fillRect(x, y, 1, 1);
    }
    g.globalAlpha = 1;
    for (let i = 0; i < 46; i++) {          // damp and dry patches
      const x = r() * W, y = 6 + r() * (h - 12), rx = 14 + r() * 30, ry = 5 + r() * 11;
      const col = r() < 0.5 ? 'rgba(48,42,34,0.28)' : 'rgba(140,128,104,0.16)';
      Art.ell(g, x, y, rx, ry, col);
      Art.speckle(g, x, y, rx, ry, r() < 0.5 ? '#3f3a30' : '#7d735f', 26, i);
    }
    for (let i = 0; i < 26; i++) {          // cracks and cart ruts
      let x = r() * W, y = 10 + r() * (h - 20);
      const dir = r() < 0.5 ? 1 : -1, n = 4 + Math.floor(r() * 6);
      for (let k = 0; k < n; k++) {
        g.fillStyle = 'rgba(34,28,22,0.5)';
        g.fillRect(Math.round(x), Math.round(y), 3 + Math.floor(r() * 4), 1);
        g.fillStyle = 'rgba(150,138,116,0.16)';
        g.fillRect(Math.round(x), Math.round(y) + 1, 3, 1);
        x += dir * (3 + r() * 4); y += (r() - 0.5) * 2.4;
      }
    }
    for (let i = 0; i < 70; i++) {          // pebbles
      const x = Math.round(r() * W), y = Math.round(6 + r() * (h - 12));
      const w2 = 2 + Math.floor(r() * 3);
      g.fillStyle = '#6b6455'; g.fillRect(x, y, w2, 2);
      g.fillStyle = '#8d8573'; g.fillRect(x, y, w2, 1);
      g.fillStyle = 'rgba(24,20,16,0.45)'; g.fillRect(x, y + 2, w2 + 1, 1);
    }
    for (let i = 0; i < 16; i++) {          // little bones and twigs
      const x = Math.round(r() * W), y = Math.round(10 + r() * (h - 16));
      g.fillStyle = '#4a4034';
      g.fillRect(x, y, 5 + Math.floor(r() * 4), 1);
      g.fillRect(x + 2, y - 1, 2, 1);
    }
    dirt = c;
    return c;
  }

  function drawGround(g) {
    const f = fraction();
    g.drawImage(dirtTex(), 0, GROUND - 2);
    if (f > 0.01) {                          // the green creeping back
      g.globalAlpha = Math.min(0.55, f * 0.7);
      g.fillStyle = U.mix('#4d6a3a', '#3f6a30', f);
      g.fillRect(0, GROUND - 2, W, H - GROUND + 2);
      g.globalAlpha = 1;
    }
    // the treeline throws a band of shade across the back of the plot
    for (let i = 0; i < 8; i++) Art.dither(g, 0, GROUND - 2 + i * 6, W, 6, '#0e0c12', 0.5 * (1 - i / 8));
    g.drawImage(grass, 0, 0);
    g.drawImage(soil, 0, 0);
  }
  function drawBlades(g) {
    for (const b of blades) {
      const cols = [PAL.moss2, PAL.moss3, PAL.moss4][b.v];
      const x = b.x | 0, y = b.y | 0;
      for (let i = 0; i < b.h; i++) {
        const t = i / b.h;
        g.fillStyle = i > b.h - 2 ? PAL.moss5 : cols;
        g.fillRect(Math.round(x + b.bend * t * t * 2.2), y - i, 1, 1);
      }
      g.fillStyle = PAL.moss1;
      g.fillRect(x + 1, y - Math.round(b.h * 0.5), 1, Math.round(b.h * 0.5));
    }
  }
  function drawFlowers(g) {
    for (const f of flowers) {
      const img = Props.get('flower', f.v);
      const sh = Math.round(f.bend * 2.2);
      g.drawImage(img, Math.round(f.x - 8 + sh), Math.round(f.y - 17));
    }
  }
  function drawSprouts(g) {
    for (const p of sprouts) {
      const t = U.clamp(p.t / 16, 0, 1);
      const n = 3 + Math.round(t * 4);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU + p.x;
        const sx = p.x + Math.cos(a) * p.r * 0.4, sy = p.y + Math.sin(a) * p.r * 0.28;
        const h = 1 + t * 4;
        g.fillStyle = p.wet > 0 ? PAL.moss4 : t > 0.5 ? PAL.moss3 : '#6d7a4a';
        g.fillRect(sx | 0, (sy - h) | 0, 1, h);
        g.fillStyle = PAL.moss2;
        g.fillRect((sx + 1) | 0, (sy - h * 0.6) | 0, 1, 1);
      }
      if (p.wet > 0) { g.fillStyle = 'rgba(87,182,201,0.16)'; Art.ell(g, p.x, p.y, p.r * 0.7, p.r * 0.3); }
      else if (p.t > 5) { g.fillStyle = 'rgba(216,165,47,0.2)'; Art.ell(g, p.x, p.y, p.r * 0.5, p.r * 0.22); }
    }
  }
  function drawWeed(g, w) {
    const img = Props.get('weed', w.v);
    const s = w.s;
    const wob = w.shake > 0 ? Math.sin(w.shake * 26) * 5 * w.shake : 0;
    const sq = w.shake > 0 ? 1 - w.shake * 0.18 : 1;      // squash on the hit
    const sway = gust(w.x) * 2.4 + Math.sin(G.time * 1.1 + w.x * 0.08) * 1.2 + wob;
    const dw = img.width * s * (2 - sq), dh = img.height * s * sq;
    Art.ell(g, w.x, w.y + 1, dw * 0.3, 3, 'rgba(16,12,20,0.3)');
    g.save();
    g.translate(Math.round(w.x), Math.round(w.y + 3));
    g.transform(1, 0, -sway / dh, 1, 0, 0);          // lean the whole plant with the wind
    g.drawImage(img, Math.round(-dw / 2), Math.round(-dh), Math.round(dw), Math.round(dh));
    g.restore();
    if (w.hitT < 1.6 && w.max > 1) {                  // health pips, only while it is being worked
      const n = w.max, px = Math.round(w.x - n * 3), py = Math.round(w.y - dh - 6);
      g.fillStyle = '#0a0810'; g.fillRect(px - 1, py - 1, n * 6 + 1, 5);
      for (let i = 0; i < n; i++) { g.fillStyle = i < w.hp ? '#8fd15a' : '#3a2a2a'; g.fillRect(px + i * 6, py, 5, 3); }
    }
  }
  function drawWeeds(g) { for (const w of weeds) drawWeed(g, w); }
  function drawCrops(g) {
    for (const c of crops) {
      const p = U.clamp(c.t / growTime(c), 0, 1);
      Props.drawCrop(g, CROP_BY_KEY[c.k], c.x, c.y, p, G.time, c.wet > 0, wind * 0.02);
      if (c.thirst > 26) { const tw = 0.5 + 0.5 * Math.sin(G.time * 5); g.fillStyle = `rgba(216,165,47,${0.4 + tw * 0.3})`; g.fillRect((c.x - 1) | 0, (c.y - 30) | 0, 2, 5); g.fillRect((c.x - 1) | 0, (c.y - 24) | 0, 2, 2); }
    }
    for (const s of seams) {
      const pulse = 0.55 + 0.45 * Math.sin(G.time * 4 + s.x);
      g.fillStyle = `rgba(245,205,92,${0.3 + pulse * 0.3})`; Art.ell(g, s.x, s.y, 7, 3);
      g.fillStyle = PAL.gold3; g.fillRect((s.x - 2) | 0, (s.y - 2) | 0, 4, 3);
      g.fillStyle = PAL.gold4; g.fillRect((s.x - 1) | 0, (s.y - 2) | 0, 2, 1);
    }
  }
  function drawCursor(g, x, y, r, col) {
    if (r <= 0) return;
    g.save();
    g.globalAlpha = 0.5 + 0.2 * Math.sin(G.time * 6);
    // a square tool footprint with corner brackets — no circles anywhere in the game
    const hw = Math.round(r), hh = Math.round(r * 0.74), c = Math.max(3, Math.round(r * 0.42));
    const x0 = Math.round(x) - hw, x1 = Math.round(x) + hw, y0 = Math.round(y) - hh, y1 = Math.round(y) + hh;
    g.fillStyle = col;
    for (const [bx, sx] of [[x0, 1], [x1, -1]]) for (const [by, sy] of [[y0, 1], [y1, -1]]) {
      g.fillRect(sx > 0 ? bx : bx - c, by, c, 1);
      g.fillRect(bx - (sx > 0 ? 0 : 1), sy > 0 ? by : by - c, 1, c);
    }
    for (let d = -hw + c + 2; d < hw - c; d += 5) { g.fillRect(Math.round(x) + d, y0, 2, 1); g.fillRect(Math.round(x) + d, y1, 2, 1); }
    g.restore();
  }

  return {
    init, update, drawGround, drawBlades, drawFlowers, drawSprouts, drawWeeds, drawWeed, gust, drawCrops, drawCursor,
    sowGrass, till, clearWeeds, hitWeeds, plant, water, harvest, hasSoil, hasGrass, brushRadius, disturb,
    fraction, zoneFraction, measure, ripe, growTime,
    get weeds() { return weeds; }, get crops() { return crops; },
    get blades() { return blades; }, get sprouts() { return sprouts; }, get flowers() { return flowers; },
    save() {
      G.world.blades = blades.map((b) => ({ x: b.x, y: b.y, v: b.v, h: b.h }));
      G.world.flowers = flowers.map((f) => ({ x: f.x, y: f.y, v: f.v }));
      G.world.crops = crops.map((c) => ({ x: c.x, y: c.y, k: c.k, t: +c.t.toFixed(1), wet: 0, thirst: +c.thirst.toFixed(1) }));
      G.world.sprouts = sprouts.map((p) => ({ x: p.x, y: p.y, t: +p.t.toFixed(1), wet: 0, r: p.r }));
      G.world.weeds = weeds.map((w) => ({ x: Math.round(w.x), y: Math.round(w.y), v: w.v, s: +w.s.toFixed(2), hp: w.hp }));
      G.world.restored = restored;
      G.world.land = Wild.save();          // the hills and ponds you dug
    },
    SKY, GROUND, W, H,
  };
})();
