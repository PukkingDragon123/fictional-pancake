// ---- The grove ------------------------------------------------------------
const Grove = (() => {
  let G = null;
  const W = 1760, H = 462;               // the grove itself, and it is a long way across
  const VW = 640, VH = 360;              // what fits on screen at once
  const ZOOM = VH / H;                   // the whole depth of the grove fits the window
  const SKY = 126, GROUND = SKY + 2;
  const WALK = { x0: 30, x1: W - 30, y0: GROUND + 34, y1: H - 58 };
  // Wombats keep to the land you own; decor is always placed on the home plot.
  const roam = () => { const s = ownedSpan(G); return { x0: s.x0 + 24, x1: s.x1 - 24 }; };
  const SEED = { x: 860, y: 300 };
  const POST = { x: 740, y: 282 };
  const TRUCK = { x: 996, y: 372, parked: true, t: 1 };   // always here; it is how you leave
  const PARK = 1004;                     // where the truck stops when called: the east edge of the clearing
  const drops = [], objects = [], ants = [], birds = [], owls = [], coins = [], slashes = [], foods = [];
  let hoverW = null, hoverSpot = null, hoverObj = null, cartT = 0, troughT = 0, hoverPlot = null;
  // Picking an animal up is a drag, not a click: grab, move the pointer far
  // enough and she comes off the ground, and where you put her down matters.
  let grab = null, grabAt = null, carry = null;
  let arrival = null, dragging = null;

  // fixed forest layers behind the plot
  // Five layers of forest, each drifting at its own rate as the camera pans.
  const PAR = [0.62, 0.46, 0.3, 0.15, 0.05];
  const layers = [];
  const R0 = Art.rng(31415);
  for (let d = 0; d < 5; d++) {
    const row = [];
    const n = 34 - d * 4;
    for (let i = 0; i < n; i++) {
      row.push({
        x: -60 + (i / n) * (W + 140) + R0() * 42,
        y: SKY - 40 + d * 13 + R0() * 6,
        kind: ['gnarl', 'pine', 'dead', 'oak', 'birch'][Math.floor(R0() * 5)],
        v: Math.floor(R0() * 4),
        s: 0.38 + d * 0.15 + R0() * 0.08,
        sh: 0.88 - d * 0.17,
      });
    }
    layers.push(row);
  }
  const eyes = [];
  for (let i = 0; i < 11; i++) eyes.push({ x: 30 + R0() * (W - 60), y: SKY - 30 + R0() * 36, ph: R0() * TAU, on: 0 });
  const mist = [];
  for (let i = 0; i < 12; i++) mist.push({ x: R0() * W, y: SKY - 16 + R0() * 56, w: 110 + R0() * 150, s: 2 + R0() * 4, d: Math.floor(R0() * 3) });
  const flies = [];   // slow motes over the treeline
  for (let i = 0; i < 26; i++) flies.push({ x: R0() * W, y: SKY - 40 + R0() * 110, ph: R0() * TAU, sp: 0.25 + R0() * 0.5 });
  const leaves = []; // leaves crossing the plot on the gust
  const shafts = [];  // light falling through the canopy
  for (let i = 0; i < 5; i++) shafts.push({ x: 60 + R0() * (W - 120), w: 26 + R0() * 40, lean: 26 + R0() * 22, a: 0.05 + R0() * 0.07 });

  // ---- camera -------------------------------------------------------------
  // The grove is wider than the window, so the view pans. Everything the
  // player clicks is in world coordinates; Grove.toWorld does the conversion.
  const CAM = { x: VW / 2, min: VW / 2, max: W - VW / 2 };
  // The view only travels as far as the land you own, so one plot feels like
  // a small clearing and each purchase visibly opens the wood up.
  function camBounds() {
    const s = ownedSpan(G || window.G || { plots: { home: true } });
    const half = VW / 2 / Math.max(0.2, FX.cam.zoom);
    const pad = 40;
    const a = Math.max(6, s.x0 - pad), b = Math.min(W - 6, s.x1 + pad);
    if (b - a <= half * 2) { const m = (a + b) / 2; return { lo: m, hi: m }; }
    return { lo: a + half, hi: b - half };
  }
  function clampCam() {
    const b = camBounds();
    FX.cam.tx = U.clamp(FX.cam.tx, b.lo, b.hi);
    const halfY = VH / 2 / Math.max(0.2, FX.cam.zoom);
    FX.cam.ty = halfY * 2 >= H ? H / 2 : U.clamp(FX.cam.ty, halfY, H - halfY);
  }
  function enter() {
    // anybody who rode along comes back delighted with themselves
    if (G && G.rode) {
      G.rode = false;
      for (const w of G.wombats) {
        if (!w.riding) continue;
        w.riding = false;
        w.bored = 0; w.thirst = Math.max(0, (w.thirst || 0) - 30);
        w.hap = hapCap();
        w.state = 'happy'; w.stateT = 1.6;
        setTimeout(() => { FX.hearts(w.x, w.y - 30, 6); }, 400);
        UI.toast(`<b>${w.name}</b> loved the drive`, 'good');
      }
    }
    const c = FX.cam;
    c.zoom = c.tzoom = ZOOM; c.ty = c.y = H / 2;
    c.ty = c.y = H / 2;
    clampCam(); c.x = c.tx;
  }
  function panBy(dx) { if (arrival) return; FX.cam.tx += dx / Math.max(0.2, FX.cam.zoom); clampCam(); FX.cam.x = FX.cam.tx; }
  // Zoom: ZOOM fits the whole depth of the grove; you can push in to 2.2x that.
  const ZMIN = ZOOM, ZMAX = ZOOM * 2.4;
  function zoomBy(mult, sx, sy) {
    if (arrival) return;
    const c = FX.cam;
    const before = sx == null ? null : toWorld(sx, sy);
    c.tzoom = U.clamp(c.tzoom * mult, ZMIN, ZMAX);
    c.zoom = c.tzoom;
    if (before) {                                   // keep the point under the cursor still
      const after = toWorld(sx, sy);
      c.tx += before.x - after.x;
      c.ty = U.clamp(c.ty + (before.y - after.y), VH / 2 / c.zoom, H - VH / 2 / c.zoom);
    }
    clampCam();
    c.x = c.tx;
  }
  function zoomTo(z) { const c = FX.cam; c.tzoom = c.zoom = U.clamp(z, ZMIN, ZMAX); clampCam(); c.x = c.tx; }
  const zoomFrac = () => (FX.cam.zoom - ZMIN) / (ZMAX - ZMIN);
  function panTo(x, snap) { FX.cam.tx = x; clampCam(); if (snap) FX.cam.x = FX.cam.tx; }
  function toWorld(sx, sy) {
    const c = FX.cam;
    return { x: (sx - VW / 2) / c.zoom + c.x, y: (sy - VH / 2) / c.zoom + c.y };
  }
  function edgeScroll(sx, dt) {
    if (arrival || G.paused) return;
    const m = 26;
    if (sx < m) panBy(-(m - sx) * 5 * dt);
    else if (sx > VW - m) panBy((sx - (VW - m)) * 5 * dt);
  }

  function capacity() { return 2 + (G.up.burrow || 0) + PLOTS.filter((p) => p.cost > 0 && ownsPlot(G, p.key)).length; }
  function hapCap() { let c = 62; for (const d of DECOR) if (G.decor[d.key] && d.hap) c += 10; return Math.min(100, c); }
  function digestMult(w) {
    let m = (0.62 + (w.hap / 100) * 0.85) * (w.traits.gut || 1);
    if (G.fruits.deepgut) m *= 1.25;
    if (G.blessings.apollowomb) m *= 1.5;
    if (w.age === 'juvenile') m *= 0.8;
    return m;
  }
  const adults = () => G.wombats.filter((w) => w.age === 'adult');

  // ---- setup --------------------------------------------------------------
  function init(g) {
    G = g;
    Wild.init(g, { W, H, GROUND, walk: WALK });
    if (!G.startWeeds) G.startWeeds = Math.max(1, World.weeds.filter((w) => inZone(w.x, w.y)).length);
    if (!G.tiers) G.tiers = { sickle: 0, hoe: 0, water: 0 };
    objects.length = 0;
    const saved = G.objects;
    if (Array.isArray(saved) && saved.length) {
      for (const o of saved) objects.push(Object.assign({}, o));
    } else {
      const r = Art.rng(8675309);
      const spots = [
        ['fallen', 952, 258], ['ruin', 766, 268], ['stump', 800, 230], ['ruin', 908, 288],
        ['fallen', 516, 300], ['fallen', 708, 322], ['ruin', 600, 238], ['ruin', 1068, 300],
        ['ruin', 1248, 246], ['stump', 444, 272], ['stump', 1138, 316], ['stump', 464, 312],
        ['fallen', 180, 286], ['ruin', 96, 316], ['stump', 268, 244], ['stump', 320, 330],
        ['fallen', 1520, 268], ['ruin', 1636, 302], ['stump', 1424, 236], ['stump', 1700, 320],
        ['stump', 960, 300], ['fallen', 820, 214],
      ];
      spots.forEach(([kind, x, y], i) => objects.push({ id: U.uid(), kind, x, y, v: i % 3, gone: 0 }));
    }
    for (let i = 0; i < 5; i++) birds.push({ x: R0() * W, y: 30 + R0() * 50, dir: R0() < 0.5 ? -1 : 1, ph: R0() * TAU, perch: null, t: R0() * 8 });
    owls.length = 0;
    owls.push({ x: 236, y: SKY - 8, blink: 0 }, { x: 742, y: SKY - 4, blink: 2.4 });
  }
  function saveObjects() { G.objects = objects.map((o) => ({ id: o.id, kind: o.kind, x: o.x, y: o.y, v: o.v, gone: o.gone })); }

  // ---- checklist ----------------------------------------------------------
  const zoneWeeds = () => World.weeds.filter((w) => inZone(w.x, w.y)).length;
  const zoneJunk = () => objects.filter((o) => !o.gone && inZone(o.x, o.y)).length;
  const zoneObjects = () => objects.filter((o) => inZone(o.x, o.y)).length;
  function tasks() {
    const nw = G.startWeeds || 1, nj = zoneObjects();
    const zf = World.zoneFraction();
    return [
      { key: 'weeds', name: 'CUT WEEDS', icon: 't_sickle', at: nw - zoneWeeds(), need: nw, done: zoneWeeds() === 0 },
      { key: 'junk', name: 'HAUL JUNK', icon: 't_destroy', at: nj - zoneJunk(), need: nj, done: zoneJunk() === 0 },
      { key: 'grass', name: 'SOW GRASS', icon: 't_moss', at: Math.round(zf * 100), need: Math.round(ZONE_GRASS * 100), done: zf >= ZONE_GRASS },
    ];
  }
  const groveClean = () => tasks().every((t) => t.done);

  function checkArrival() {
    if (G.arrived || arrival || !groveClean()) return;
    G.arrived = true;
    arrival = { t: 0, x: ownedSpan(G).x0 - 40, y: WALK.y0 + 44 };
    panTo(VW / 2, true);
    G.paused = true;
    FX.letterbox(true);
    Audio.play('chime');
    UI.hideAll();
  }
  function updateArrival(dt) {
    const a = arrival;
    a.t += dt;
    const target = 300;
    if (a.t < 5.2) a.x = U.lerp(-40, target, U.easeOut(Math.min(1, a.t / 4.4)));
    // camera pushes in on the newcomer
    const z = U.clamp(1 + U.easeInOut(Math.min(1, a.t / 3.4)) * 1.9, 1, 2.9);
    FX.cam.tzoom = a.t > 6.6 ? ZOOM : z;
    FX.cam.tx = a.t > 6.6 ? U.clamp(a.x, VW / 2, W - VW / 2) : U.lerp(VW / 2, a.x, 0.85);
    FX.cam.ty = a.t > 6.6 ? 180 : U.lerp(180, a.y - 26, 0.85);
    World.disturb(a.x, a.y, 26, 1.1);
    if (a.t > 3.2 && a.t < 3.4) FX.title('', { size: 1, dur: 0.1 });
    if (a.t > 6.6 && a.t < 6.8) { FX.letterbox(false); }
    if (a.t > 7.6) {
      const w = addWombat({ x: target, y: a.y, pelt: 'brown' });
      w.hap = 80;
      arrival = null;
      G.paused = false;
      FX.cam.tzoom = ZOOM; FX.cam.ty = H / 2; panTo(U.clamp(w.x, VW / 2, W - VW / 2));
      FX.hearts(w.x, w.y - 40, 6);
      UI.toast('a wombat has come', 'good');
      UI.refreshAll();
      Main.save();
    }
  }

  // ---- wombats ------------------------------------------------------------
  function makeTraits(a, b) {
    const t = {};
    for (const def of TRAITS) {
      let v = a && b ? (a.traits[def.key] + b.traits[def.key]) / 2 + U.rand(-0.12, 0.12) : U.rand(def.min + 0.15, def.max - 0.25);
      t[def.key] = +U.clamp(v, def.min, def.max).toFixed(2);
    }
    return t;
  }
  function pickPelt(a, b) {
    if (U.chance(RARE_CHANCE * (a && b ? 2 : 1) * (G.blessings.artewombis ? 2 : 1))) return U.pick(FUR.filter((f) => f.rare)).key;
    if (a && b) return U.chance(0.5) ? a.pelt : b.pelt;
    return U.pick(FUR.filter((f) => !f.rare)).key;
  }
  function newWombat(o = {}) {
    const used = new Set(G.wombats.map((w) => w.name));
    return {
      id: U.uid(), name: NAMES.find((n) => !used.has(n)) || 'Wombat',
      pelt: o.pelt || pickPelt(), age: o.age || 'adult', ageT: 0,
      x: o.x ?? 500, y: o.y ?? WALK.y0 + 20, dir: -1,
      state: 'idle', stateT: U.rand(0.5, 2), anim: U.rand(0, 9), sq: 0,
      hap: 58, stomach: 'empty', food: null, digestT: 0, digestTotal: 1, strain: 0, chew: 0, claim: null,
      traits: o.traits || makeTraits(), pets: [], grump: 0, gest: 0, mate: null,
    };
  }
  function addWombat(o) {
    const w = newWombat(Object.assign({ x: 500 + U.rand(-60, 60), y: WALK.y0 + U.rand(10, 50) }, o));
    const rm0 = roam(); w.tx = U.rand(rm0.x0, rm0.x1); w.ty = U.rand(WALK.y0, WALK.y1);
    w.state = 'walk'; w.stateT = 6;
    G.wombats.push(w);
    FX.dust(w.x, w.y, 8, PAL.soil3);
    return w;
  }

  function update(dt) {
    Wild.update(dt);
    updateFoods(dt);
    // leaves tear loose on a gust
    const gu = World.gust(FX.cam.x);
    if (leaves.length < 26 && Math.random() < dt * (1.4 + gu * 5)) {
      leaves.push({ x: FX.cam.x - 380, y: GROUND - 40 + Math.random() * 180, vx: 40 + gu * 90 + Math.random() * 40, ph: Math.random() * TAU, t: 0, c: ['#7f9a4a', '#a8843a', '#8a5a2a', '#6d8c3a'][Math.floor(Math.random() * 4)] });
    }
    for (let i = leaves.length - 1; i >= 0; i--) {
      const lf = leaves[i];
      lf.t += dt; lf.x += lf.vx * dt; lf.y += Math.sin(lf.t * 3 + lf.ph) * 22 * dt;
      if (lf.x > FX.cam.x + 420 || lf.t > 18) leaves.splice(i, 1);
    }
    for (let i = slashes.length - 1; i >= 0; i--) { slashes[i].t += dt; if (slashes[i].t > 0.18) slashes.splice(i, 1); }
    for (let i = coins.length - 1; i >= 0; i--) {
      const c = coins[i];
      c.t += dt;
      if (c.t < 0) continue;
      if (c.t < 0.7) {                              // pop out and bounce once
        c.vy += 420 * dt; c.x += c.vx * dt; c.z += c.vy * dt;
        if (c.z > 0) { c.z = 0; c.vy = -c.vy * 0.4; c.vx *= 0.6; }
      } else {                                      // then fly to the purse in the corner
        const tgt = toWorld(30, 22);
        const k = 1 - Math.pow(0.002, dt);
        c.x = U.lerp(c.x, tgt.x, k); c.y = U.lerp(c.y, tgt.y, k); c.z = U.lerp(c.z, 0, k);
        if (Math.hypot(c.x - tgt.x, c.y - tgt.y) < 10) {
          coins.splice(i, 1);
          G.wd += c.n; G.stats.earned += c.n;
          Audio.play('coin');
          UI.bumpMoney();
        }
      }
    }
    if (arrival) { updateArrival(dt); return; }
    const cap = hapCap(), decay = 0.42;
    const charm = World.magic();            // what the magical beds are doing for the herd
    for (const w of G.wombats) {
      w.anim += dt;
      if (w.turnT > 0) w.turnT -= dt;
      // ---- what an animal needs -------------------------------------------
      // Three things, and they all creep back up: water, something to do, and
      // food. Ignore any of them and the happiness runs out faster.
      if (w.thirst == null) w.thirst = U.rand(0, 25);
      if (w.bored == null) w.bored = U.rand(0, 25);
      const dry = Sky.wet() > 0 ? 0.55 : 1;
      w.thirst = U.clamp(w.thirst + dt * 0.5 * dry, 0, 100);
      w.bored = U.clamp(w.bored + dt * (charm.dream ? 0.2 : 0.42) * (1 - 0.16 * (G.up.toys || 0)), 0, 100);
      // enrichment: a nest, a paddling pool, a hill or a friend all count
      if (G.decor.nest || G.decor.pool || Wild.mounds.length || G.wombats.length > 1) {
        if (w.state !== 'sleep' && Math.random() < dt * 0.5) w.bored = Math.max(0, w.bored - 1.6);
      }
      const want = (w.thirst > 70 ? 1 : 0) + (w.bored > 70 ? 1 : 0) + (w.stomach === 'empty' && w.age !== 'baby' ? 1 : 0);
      w.hap = U.clamp(w.hap - ((decay + want * 0.34) / (w.traits.calm || 1)) * dt * (charm.lull ? 0.7 : 1), 0, cap);
      if (w.grump > 0) w.grump -= dt;
      if (w.age !== 'adult') {
        w.ageT += dt * (G.fruits.longlife ? 2 : 1);
        if (w.ageT >= GROW_TIME[w.age]) {
          w.ageT = 0; w.age = w.age === 'baby' ? 'juvenile' : 'adult';
          Audio.play('hatch'); FX.sparkle(w.x, w.y - 26, 12, PAL.moss5);
        }
      }
      if (w.gest > 0) {
        w.gest -= dt;
        if (w.gest <= 0) {
          const mate = G.wombats.find((m) => m.id === w.mate) || w;
          const n = G.blessings.aphrowombite ? 2 : 1;
          for (let i = 0; i < n && G.wombats.length < capacity(); i++) addWombat({ age: 'baby', pelt: pickPelt(w, mate), traits: makeTraits(w, mate), x: w.x + U.rand(-12, 12), y: w.y });
          w.mate = null; Audio.play('hatch'); FX.hearts(w.x, w.y - 30, 6);
        }
      }
      if (w.stomach === 'digesting') {
        w.digestT -= dt * digestMult(w);
        if (w.digestT <= 0) { w.stomach = 'ready'; w.strain = 1.6; w.state = 'dig'; w.stateT = 1.6; }
      } else if (w.stomach === 'ready') {
        w.strain -= dt;
        if (w.strain <= 0) leave(w);
      } else if (w.stomach === 'empty' && w.age !== 'baby' && w.state !== 'eat') {
        // Nobody starves here. If there is no bowl down, it grazes whatever it
        // is standing on, so the loop keeps turning whether you feed it or not.
        // Grass under it is a quick mouthful; bare dirt takes longer and it
        // has to root about for it. Either way it eats, so either way it poops.
        w.graze = (w.graze || 0) + dt;
        const lush = World.hasGrass(w.x, w.y + 4);
        if (w.graze > (lush ? 4 : 11)) { w.graze = 0; graze(w, lush); }
      }
      if (w.state === 'held') { w.lift = U.lerp(w.lift || 0, 16, 1 - Math.pow(0.001, dt)); continue; }
      if (w.riding) { w.x = U.lerp(w.x, TRUCK.x - 16, 1 - Math.pow(0.02, dt)); w.y = TRUCK.y - 2; w.state = 'sit'; continue; }
      if (w.lift > 0) w.lift = Math.max(0, w.lift - dt * 90);
      w.stateT -= dt;
      // an empty wombat claims the nearest bowl and heads for it
      if (w.stomach === 'empty' && w.age !== 'baby' && w.state !== 'eat' && w.state !== 'sleep') {
        const mine = w.claim ? foodById(w.claim) : null;
        if (mine && mine.gone <= 0 && (!mine.taken || mine.taken === w.id)) {
          mine.taken = w.id;
          w.tx = mine.x; w.ty = mine.y; w.state = 'walk'; w.goal = 'eat';
        } else {
          w.claim = null;
          let best = null, bd = 1e9;
          for (const f of foods) {
            if (f.gone > 0 || (f.taken && f.taken !== w.id)) continue;
            const d2 = Math.hypot(f.x - w.x, f.y - w.y);
            if (d2 < bd) { bd = d2; best = f; }
          }
          if (best) {
            best.taken = w.id; w.claim = best.id;
            w.tx = best.x; w.ty = best.y; w.state = 'walk'; w.goal = 'eat';
            if (bd > 60) FX.comic(w.x, w.y - 34, U.pick(['SNIFF!', 'FOOD!', 'OOH!']), { ink: '#d8f0a0', edge: '#5d9440', life: 0.6 });
          }
        }
      }
      if (w.state === 'walk') {
        const dx = w.tx - w.x, dy = w.ty - w.y, d = Math.hypot(dx, dy);
        const sp = (w.age === 'baby' ? 34 : w.age === 'juvenile' ? 30 : 25) * (w.goal === 'eat' ? 1.9 : 1);
        if (d < 3) {
          if (w.goal === 'eat') {                       // it has arrived at the bowl
            const f = foodById(w.claim);
            w.claim = null; w.goal = null;
            if (f && f.gone <= 0 && feed(w, f.key, true)) { f.gone = 0.001; f.taken = null; }
            else { w.state = 'idle'; w.stateT = 1.2; }
          } else { w.state = w.goal || 'idle'; w.stateT = U.rand(2, 4.5); w.goal = null; }
        }
        else {
          w.x += (dx / d) * sp * dt; w.y += (dy / d) * sp * dt;
          face(w, dx > 0 ? 1 : -1);
          w.step = (w.step || 0) + sp * dt;
          if (w.step > 15) { w.step = 0; print(w.x, w.y, w.dir); }
          World.disturb(w.x, w.y + 2, 20, 0.85);
          if (G.fruits.greenwake && Math.random() < dt * 1.6) World.sowGrass(w.x, w.y + 2, 8);
        }
      } else if (w.stateT <= 0 && w.state !== 'dig') {
        // A wombat is nocturnal. Through the middle of the day it sleeps in the
        // shade and barely moves; after dark it is up, out and grazing, which is
        // when the grove is actually busy.
        const night = Sky.isNight(), noon = Sky.light() > 0.85;
        const r = Math.random();
        if (noon && r < 0.6) {
          // find the coolest thing nearby and lie down beside it
          const shade = shadeSpot(w);
          if (shade && Math.hypot(shade.x - w.x, shade.y - w.y) > 26) {
            w.tx = shade.x; w.ty = shade.y; w.state = 'walk'; w.goal = 'sleep';
          } else { w.state = 'sleep'; w.stateT = U.rand(8, 16); }
        }
        else if (night && r < 0.42 && World.hasGrass(w.x, w.y)) { w.state = 'graze'; w.stateT = U.rand(4, 8); }
        else if (r < (night ? 0.86 : 0.6)) { const rm = roam(); w.tx = U.rand(rm.x0, rm.x1); w.ty = U.rand(WALK.y0, WALK.y1); w.state = 'walk'; w.goal = U.chance(night ? 0.5 : 0.3) ? 'graze' : 'idle'; }
        else if (r < 0.9 || (!night && w.hap < 60)) { w.state = 'sleep'; w.stateT = U.rand(night ? 3 : 7, night ? 6 : 14); }
        else { w.state = 'idle'; w.stateT = U.rand(1.5, 3.5); if (U.chance(0.35)) face(w, -w.dir); }
      }
      if (w.state === 'dig' && w.stateT <= 0 && w.stomach !== 'ready') { w.state = 'idle'; w.stateT = 1; }
      if (w.chew > 0) {                                 // a chew wobble while it eats
        w.chew -= dt;
        w.sq = Math.sin(w.chew * 26) * 0.14;
        if (Math.random() < dt * 7) FX.spawn(w.x + w.dir * 13, w.y - 8, 1, { color: [(CROP_BY_KEY[w.food] || CROPS[0]).color], speed: 34, gravity: 190, life: 0.4, size: 2 });
      }
      if (w.state === 'graze') { if (Math.random() < dt * 0.4) w.hap = Math.min(cap, w.hap + 0.6); World.disturb(w.x + w.dir * 14, w.y, 12, 0.5); }
      w.sq = U.lerp(w.sq, 0, 1 - Math.pow(0.001, dt));
      // every wombat on the move bounces: a two-beat squash on each footfall
      if (w.state === 'walk' || w.state === 'run') w.sq += Math.sin(w.anim * TAU * 2) * 0.07;
      const rm2 = roam(); w.x = U.clamp(w.x, rm2.x0, rm2.x1); w.y = U.clamp(w.y, WALK.y0, WALK.y1);
      // a pond is water: push her back out of it, but let her drink at the edge.
      // a hill is a good place to sit, and she knows it.
      for (const pd of Wild.ponds) {
        const dx = w.x - pd.x, dy = (w.y - pd.y) / 0.45;
        const d = Math.hypot(dx, dy);
        if (d < pd.r * 0.82 && d > 0.01) {
          const push = (pd.r * 0.82 - d) * dt * 5;
          w.x += (dx / d) * push; w.y += (dy / d) * push * 0.45;
          w.thirst = Math.max(0, w.thirst - dt * 26);                            // a drink
          if (Math.random() < dt * 1.4) w.hap = Math.min(cap, w.hap + 0.5);
        }
      }
      if (Math.random() < dt * 0.5 && Wild.onMound(w.x, w.y)) { w.hap = Math.min(cap, w.hap + 0.4); w.bored = Math.max(0, w.bored - 2); }
      if (Sky.wet() > 0.5 && Math.random() < dt * 0.6) w.thirst = Math.max(0, w.thirst - 2);   // rain in the mouth
    }
    for (let i = 0; i < G.wombats.length; i++) for (let j = i + 1; j < G.wombats.length; j++) {
      const a = G.wombats[i], b = G.wombats[j], dx = b.x - a.x;
      if (Math.abs(dx) < 34 && Math.abs(b.y - a.y) < 13) {
        const p = (34 - Math.abs(dx)) * dt * 8 * (dx >= 0 ? 1 : -1);
        const rm3 = roam(); a.x = U.clamp(a.x - p, rm3.x0, rm3.x1); b.x = U.clamp(b.x + p, rm3.x0, rm3.x1);
      }
    }
    // poop cubes settle
    updatePrints(dt);
    for (const d of drops) {
      d.t += dt;
      // the impact squash unwinds as a damped spring: flatten, overshoot, settle
      if (d.sq0) { d.sqT += dt; if (d.sqT > 1.2) d.sq0 = 0; }
      if (d === dragging) continue;
      if (d.z > 0 || d.vz > 0) {
        d.vz -= 600 * dt; d.z += d.vz * dt; d.x += d.vx * dt; d.spin += d.vs * dt;
        if (d.z <= 0) {
          d.z = 0;
          // squash on impact, harder the faster it came down, then spring back
          d.sq0 = Math.min(0.4, Math.abs(d.vz) / 420 + 0.12); d.sqT = 0;
          if (Math.abs(d.vz) > 55) { d.vz = -d.vz * 0.34; d.vx *= 0.5; d.vs *= 0.4; FX.dust(d.x, d.y, 3); World.disturb(d.x, d.y, 14, 0.7); }
          else { d.vz = 0; d.vx = 0; d.vs = 0; d.spin = 0; }
        }
      }
    }
    // the truck
    if (TRUCK.parked || TRUCK.t > 0) {
      TRUCK.t += dt;
      const tx = TRUCK.parked ? PARK : W + 116;
      TRUCK.x = U.lerp(TRUCK.x, tx, 1 - Math.pow(0.06, dt));
      if (!TRUCK.parked && TRUCK.x > W + 110) TRUCK.t = 0;
    }
    // ant movers
    for (let i = ants.length - 1; i >= 0; i--) {
      const a = ants[i];
      a.t += dt;
      if (a.phase === 'in') {
        a.x = U.lerp(a.x, a.tx, 1 - Math.pow(0.02, dt));
        if (Math.abs(a.x - a.tx) < 3) { a.phase = 'lift'; a.t = 0; }
      } else if (a.phase === 'lift') {
        if (a.t > 0.7) { a.phase = 'out'; a.t = 0; a.carry = true; }
      } else {
        a.x += a.dir * 52 * dt;
        if (a.x < -40 || a.x > W + 40) ants.splice(i, 1);
      }
    }
    // objects fading out after the ants take them
    for (const o of objects) if (o.gone > 0 && o.gone < 1) { o.gone = Math.min(1, o.gone + dt * 0.7); if (o.gone >= 1) saveObjects(); }
    // birds and owls
    for (const b of birds) {
      b.t -= dt;
      if (b.perch) {
        if (b.t <= 0) { b.perch = null; b.t = U.rand(7, 16); b.dir = U.chance(0.5) ? 1 : -1; }
      } else {
        b.x += b.dir * 46 * dt; b.y += Math.sin(G.time * 2 + b.ph) * 12 * dt;
        if (b.x < -30) b.x = W + 30; if (b.x > W + 30) b.x = -30;
        if (b.t <= 0) { b.perch = true; b.t = U.rand(5, 12); if (Math.random() < 0.4) Audio.play('squeak'); }
      }
    }
    for (const o of owls) { o.blink -= dt; if (o.blink < 0) o.blink = U.rand(3, 7); }
    for (const e of eyes) { e.on = Math.max(0, e.on - dt); if (Math.random() < dt * 0.06) e.on = U.rand(1, 2.4); }
    for (const m of mist) { m.x += m.s * dt * 2; if (m.x > W + 110) m.x = -m.w - 20; }
    // trough
    const tl = G.up.trough || 0;
    if (tl > 0 && G.troughFood && (G.food[G.troughFood] || 0) > 0) {
      troughT += dt;
      if (troughT >= 15 / tl) {
        troughT = 0;
        const hungry = G.wombats.find((w) => w.stomach === 'empty' && w.state !== 'dig');
        if (hungry) feed(hungry, G.troughFood, true);
      }
    }
    checkArrival();
  }

  // Put a pile down and step back: a hungry wombat will come to it. This is
  // the whole feeding loop now — you never poke the animal directly.
  function placeFood(x, y) {
    const key = G.selFood;
    if (!key || (G.food[key] || 0) <= 0) { Audio.play('error'); UI.toast('pick a food first', 'bad'); return true; }
    if (y < WALK.y0 - 16 || y > WALK.y1 + 16) { Audio.play('error'); UI.toast('put it on the ground', 'bad'); return true; }
    if (foods.length >= 6) { Audio.play('error'); UI.toast('too much on the ground', 'bad'); return true; }
    G.food[key]--;
    foods.push({ id: U.uid(), key, x, y, t: 0, taken: null, gone: 0 });
    Audio.play('pluck');
    FX.dust(x, y + 2, 6, PAL.soil3);
    FX.comic(x, y - 26, 'HERE!', { ink: '#d8f0a0', edge: '#5d9440', life: 0.5 });
    UI.refreshTray();
    return true;
  }
  const foodById = (id) => foods.find((f) => f.id === id) || null;
  function updateFoods(dt) {
    for (let i = foods.length - 1; i >= 0; i--) {
      const f = foods[i];
      f.t += dt;
      if (f.gone > 0) { f.gone += dt; if (f.gone > 0.5) foods.splice(i, 1); continue; }
      if (f.taken && !G.wombats.some((w) => w.id === f.taken)) f.taken = null;   // its wombat wandered off
    }
  }
  function drawFood(g, f) {
    const def = CROP_BY_KEY[f.key] || CROPS[0];
    const k = f.gone > 0 ? 1 - f.gone / 0.5 : 1;
    const bob = Math.sin(f.t * 3) * 1.2;
    g.save();
    g.globalAlpha = k;
    g.fillStyle = 'rgba(14,10,18,0.4)'; Art.ell(g, f.x, f.y + 1, 16, 5);
    // a glazed dish, and the actual crop heaped in it
    Art.ell(g, f.x, f.y - 1 + bob, 16, 7.4, '#0a0810');
    Art.ell(g, f.x, f.y - 2 + bob, 14.4, 6.6, '#7a5230');
    Art.ell(g, f.x, f.y - 3.4 + bob, 12.4, 5.4, '#a8763e');
    Art.ell(g, f.x, f.y - 4 + bob, 10.6, 4.4, '#4a3320');            // the bowl's inside
    Art.ellBand(g, f.x, f.y - 2 + bob, 14.4, 7.2, '#c49461', 0.54, 0.92);
    Art.rect(g, f.x - 14.4, f.y - 3.4 + bob, 28.8, 1.4, '#6a4626');  // a painted band
    const img = Props.get('produce', f.key);
    const put = (dx, dy, sc) => g.drawImage(img,
      Math.round(f.x + dx - img.width * sc / 2), Math.round(f.y + dy + bob - img.height * sc),
      Math.round(img.width * sc), Math.round(img.height * sc));
    put(-6, -3, 0.72); put(6.5, -3.5, 0.72); put(0, -6.5, 0.9);      // three of them, heaped
    Art.ellBand(g, f.x, f.y - 2 + bob, 14.4, 7.2, '#8a5e36', 0.94, 1);
    Icons.blit(g, def.icon, f.x - 8, f.y - 34 + bob * 1.6, 1);
    // a smell, curling upward, so you can find it in the weeds
    for (let i = 0; i < 3; i++) {
      const sy = f.y - 12 - ((f.t * 14 + i * 9) % 20);
      const a2 = 0.35 * (1 - ((f.t * 14 + i * 9) % 20) / 20);
      g.fillStyle = `rgba(214,236,150,${(a2 * k).toFixed(2)})`;
      g.fillRect(Math.round(f.x + Math.sin(f.t * 3 + i) * 4), Math.round(sy), 2, 2);
    }
    g.restore();
  }

  function feed(w, key, auto) {
    const def = CROP_BY_KEY[key];
    if (!def || (G.food[key] || 0) <= 0) { if (!auto) Audio.play('error'); return false; }
    if (w.stomach !== 'empty' || w.age === 'baby') { if (!auto) Audio.play('error'); return false; }
    G.food[key]--;
    w.stomach = 'digesting'; w.food = key;
    w.digestTotal = def.grow * 0.2 + 5; w.digestT = w.digestTotal;
    w.hap = Math.min(hapCap(), w.hap + def.hap);
    w.thirst = Math.max(0, (w.thirst || 0) - (def.kind === 'tree' ? 22 : 9));   // juice in it
    w.state = 'eat'; w.stateT = 1.9; w.sq = 0.32; w.chew = 1.9;
    G.stats.fed++;
    Audio.play('munch');
    FX.comic(w.x, w.y - 38, U.pick(['NOM!', 'CHOMP!', 'MUNCH!']), { ink: '#f5cd5c', edge: '#a97c1e', life: 0.7 });
    FX.burst(w.x + w.dir * 18, w.y - 12, 7, { color: [def.color, PAL.moss4], speed: 50, gravity: 240, life: 0.5, size: 2 });
    UI.refreshTray();
    return true;
  }
  // A mouthful of the lawn: slower than a proper meal and it only ever makes
  // plain cubes, but it means the grove is never idle.
  function graze(w, lush) {
    w.stomach = 'digesting'; w.food = 'ashgrass'; w.grazed = true;
    w.digestTotal = lush ? 13 : 18; w.digestT = w.digestTotal;
    w.hap = Math.min(hapCap(), w.hap + (lush ? 2 : 0));
    w.state = 'eat'; w.stateT = 1.5; w.sq = 0.24; w.chew = 1.5;
    World.disturb(w.x, w.y + 4, 14);
    Audio.play('munch');
    FX.burst(w.x + w.dir * 16, w.y - 6, 5, { color: [PAL.moss3, PAL.moss4], speed: 40, gravity: 220, life: 0.45, size: 2 });
  }
  function pet(w) {
    if (w.grump > 0) { Audio.play('error'); return; }
    w.pets = w.pets.filter((t) => G.time - t < 4);
    w.pets.push(G.time);
    if (w.pets.length > 7) { w.grump = 5; w.hap = Math.max(0, w.hap - 14); w.pets = []; Audio.play('squeak'); return; }
    w.hap = Math.min(hapCap(), w.hap + 7 * (G.fruits.softpaws ? 2 : 1));
    w.bored = Math.max(0, (w.bored || 0) - 26);          // attention is enrichment
    if (w.stomach === 'digesting') w.digestT = Math.max(0.01, w.digestT - 2.5);
    w.sq = 0.26;
    if (w.state === 'sleep' || w.state === 'walk') { w.state = 'happy'; w.stateT = 1.1; }
    G.stats.pets++;
    Audio.play('pet'); FX.hearts(w.x, w.y - 30, 3);
    if (Math.random() < 0.45) FX.comic(w.x, w.y - 40, U.pick(['BOOP!', 'AWW!', 'SQUEE!']), { ink: '#ffc4dd', edge: '#e0507a', life: 0.7 });
  }
  function leave(w) {
    const def = CROP_BY_KEY[w.food] || CROPS[0];
    let n = 1;
    if (G.fruits.twinfall && U.chance(0.22)) n = 2;
    const bless = U.clamp((w.hap / 100) * 0.26 * (w.traits.luck || 1), 0, 0.8);
    for (let i = 0; i < n; i++) {
      drops.push({
        x: w.x - w.dir * 16, y: w.y + U.rand(-2, 2), z: 9, vz: U.rand(100, 160),
        vx: -w.dir * U.rand(18, 48), spin: 0, vs: U.rand(-4, 4),
        type: w.age === 'juvenile' ? 'plain' : def.offering,
        blessed: U.chance(bless), t: -i * 0.15, id: U.uid(),
      });
    }
    w.stomach = 'empty'; w.food = null; w.state = 'idle'; w.stateT = 1.1; w.sq = -0.26;
    G.stats.left += n;
    Audio.play('plop'); FX.shake(1.6);
    FX.dust(w.x - w.dir * 14, w.y + 2, 8, PAL.soil3);
    FX.comic(w.x - w.dir * 18, w.y - 30, U.pick(['PLOP!', 'THUD!', 'CLONK!']), { ink: '#d8b285', edge: '#7d5f42', life: 0.7 });
    FX.float(w.x - w.dir * 18, w.y - 44, n > 1 ? `x${n}` : '+1', { color: '#d8b285', size: 8 });
  }
  function loadIntoTruck(d) {
    const i = drops.indexOf(d);
    if (i >= 0) drops.splice(i, 1);
    const bag = d.blessed ? G.blessed : G.offerings;
    bag[d.type] = (bag[d.type] || 0) + 1;
    G.stats.gathered++;
    Audio.play('pop');
    FX.burst(TRUCK.x - 20, TRUCK.y - 26, 8, { color: [OFFERINGS[d.type].color, PAL.cream], speed: 70, gravity: 120, life: 0.4, size: 2 });
    FX.float(TRUCK.x - 20, TRUCK.y - 44, '+1', { color: PAL.gold4, size: 8 });
    FX.comic(TRUCK.x, TRUCK.y - 58, U.pick(['LOADED!', 'CLUNK!', 'IN!']), { ink: '#a8d0e0', edge: '#33495c', life: 0.6 });
    UI.refreshHUD();
  }
  // A handful of coins tossed from wherever the cultist is standing.
  function reward(x, y, n) {
    for (let i = 0; i < n; i++) coins.push({ x: x + U.rand(-6, 6), y, vx: U.rand(-60, 60), vy: U.rand(-190, -110), z: 0, t: -i * 0.04, n: 1 });
    Audio.play('cash');
  }
  function callTruck() { panTo(TRUCK.x - 40); }     // nothing to call any more: just look at it
  function truckHit(x, y) { return x > TRUCK.x - 50 && x < TRUCK.x + 46 && y > TRUCK.y - 46 && y < TRUCK.y + 8; }

  // ---- ant movers ---------------------------------------------------------
  function demolishCost(o) { return o.kind === 'fallen' ? 20 : o.kind === 'ruin' ? 25 : 10; }
  function demolish(o) {
    if (o.gone) return;
    const cost = demolishCost(o);
    if (G.wd < cost) { Audio.play('error'); UI.toast('not enough', 'bad'); return; }
    G.wd -= cost;
    o.gone = 0.01;
    const dir = o.x < W / 2 ? -1 : 1;
    for (let i = 0; i < 5; i++) {
      ants.push({ x: o.x + dir * (140 + i * 26), y: o.y + 2 + (i % 3) * 4, tx: o.x + (i - 2) * 9, dir, phase: 'in', t: 0, carry: false, obj: o });
    }
    Audio.play('snip');
    FX.float(o.x, o.y - 24, '-' + cost, { color: PAL.redL, size: 8 });
    UI.refreshHUD();
    Main.save();
  }

  // ---- pointer ------------------------------------------------------------
  function wombatAt(x, y) {
    let best = null, bd = 1e9;
    for (const w of G.wombats) {
      const k = Sprites.AGE[w.age].k;
      if (x > w.x - 32 * k && x < w.x + 32 * k && y > w.y - 46 * k && y < w.y + 6) { const d = Math.abs(w.y - y); if (d < bd) { bd = d; best = w; } }
    }
    return best;
  }
  function dropAt(x, y) {
    for (let i = drops.length - 1; i >= 0; i--) {
      const d = drops[i], s = OFFERINGS[d.type].w * 12 + 8;
      if (Math.abs(x - d.x) < s && Math.abs(y - (d.y - d.z - 9)) < s) return d;
    }
    return null;
  }
  function objAt(x, y) {
    let best = null, bd = 1e9;
    for (const o of objects) {
      if (o.gone) continue;
      const w = o.kind === 'fallen' ? 60 : o.kind === 'ruin' ? 32 : 18;
      const h = o.kind === 'fallen' ? 30 : o.kind === 'ruin' ? 50 : 22;
      if (x > o.x - w && x < o.x + w && y > o.y - h && y < o.y + 8) { const d = Math.abs(o.y - y); if (d < bd) { bd = d; best = o; } }
    }
    return best;
  }
  function spotAt(x, y) {
    if (x > TRUCK.x - 58 && x < TRUCK.x + 58 && y > TRUCK.y - 58 && y < TRUCK.y + 8) return 'truck';
    return null;
  }

  // Returns true when the press was consumed; the hand tool returning false
  // means the player grabbed nothing, so the view pans instead.
  function press(x, y, first) {
    if (arrival) return true;
    const tool = G.tool;
    if (y < GROUND) return false;
    // the two landmarks answer to any tool; they are doors, not ground -
    // unless a weed is standing in front of them, in which case you meant the weed
    if (first && !World.weeds.some((w) => Math.abs(w.x - x) < 16 && Math.abs(w.y - y) < 14)) {
      if (spotAt(x, y) === 'truck' && !dragging) { Main.setMode('map'); return true; }
    }
    // the fenced land is the button: click it to buy it
    if (!inOwned(G, x)) {
      if (!first) return true;
      const p = plotAt(x);
      if (p && plotSign(G, p)) return buyPlot(p);
      Audio.play('error'); UI.toast('too far out', 'bad');
      return true;
    }
    if (tool === 'mound' || tool === 'pond') {
      if (!first) return true;
      Wild.place(tool, x, y);
      return true;
    }
    if (tool === 'drag') {
      if (!first) return true;
      const v = Wild.visitorAt(x, y);
      if (v) { Wild.talkTo(v); return true; }
      const d = dropAt(x, y);
      if (d) { dragging = d; d.z = Math.max(d.z, 12); Audio.play('click'); return true; }
      const w = wombatAt(x, y);
      if (w) { grab = w; grabAt = { x, y }; return true; }
      const got = World.harvest(x, y);
      if (got === 'unripe' && first) { Audio.play('error'); UI.toast('not ready yet', 'bad'); }
      else if (got === 'nofruit' && first) { Audio.play('error'); UI.toast('no fruit on it yet', 'bad'); }
      if (got) return true;
      return false;
    }
    if (tool === 'food') {
      if (!first) return true;
      const w = wombatAt(x, y);
      if (w && (!G.selFood || (G.food[G.selFood] || 0) <= 0)) { pet(w); return true; }
      return placeFood(x, y);
    }
    if (tool === 'destroy') {
      if (!first) return true;
      const o = objAt(x, y);
      if (o) { demolish(o); return true; }
      return false;
    }
    if (tool === 'pair') {
      if (!first) return true;
      const w = wombatAt(x, y);
      if (!w || w.age !== 'adult' || w.gest > 0) { Audio.play('error'); return true; }
      if (!G.pairFirst) { G.pairFirst = w.id; FX.hearts(w.x, w.y - 30, 2); Audio.play('click'); return true; }
      const a = G.wombats.find((m) => m.id === G.pairFirst);
      G.pairFirst = null;
      if (!a || a === w || a.hap < 55 || w.hap < 55 || G.wombats.length >= capacity()) { Audio.play('error'); return true; }
      w.gest = 26; w.mate = a.id; a.hap -= 8; w.hap -= 8;
      FX.hearts((w.x + a.x) / 2, w.y - 34, 8); Audio.play('bless');
      return true;
    }
    const t = TOOL_BY_KEY[tool];
    const tier = TIERS[tool] ? tierOf(G, tool) : null;
    const r = World.brushRadius(tier ? tier.radius : t ? t.radius : 12);
    if (!t || !t.radius) return true;
    switch (tool) {
      case 'moss': if (World.sowGrass(x, y, r) && first) Audio.play('brush'); World.disturb(x, y, r, 0.5); break;
      case 'hoe': World.till(x, y, r); if (first) Audio.play('dig'); break;
      case 'sickle': {
        if (first || Math.random() < 0.25) slashes.push({ x, y, t: 0, r });
        World.prune(x, y, r);                 // over a fruit tree the sickle is a pruning hook
        const dead = World.hitWeeds(x, y, r, tier.dmg);
        for (const d of dead) {
          coins.push({ x: d.x, y: d.y - 10, vx: U.rand(-30, 30), vy: U.rand(-150, -90), z: 0, t: 0, n: d.big ? WEED_COIN * 2 : WEED_COIN });
          if (d.big) FX.comic(d.x, d.y - 26, U.pick(['CHOP!', 'SHNK!', 'KRAK!']), { ink: FX.COMIC_INK.pow });
          else if (Math.random() < 0.3) FX.comic(d.x, d.y - 22, U.pick(['SNIP!', 'SWSH!', 'THWK!']), { ink: '#d8f0a0', edge: '#5d9440', life: 0.6 });
        }
        World.disturb(x, y, r, 0.8);
        break;
      }
      case 'water': World.water(x, y, r); if (first) Audio.play('splash'); break;
      case 'seed': {
        const res = World.plant(x, y, G.selSeed);
        if (res === 'ok') { Audio.play('pluck'); UI.refreshTray(); }
        else if (res === 'nosoil' && first) { Audio.play('error'); UI.toast('till the soil first', 'bad'); }
        else if (res === 'noseed' && first) { Audio.play('error'); UI.toast('buy seed at the mart', 'bad'); }
        else if (res === 'crowded' && first) { Audio.play('error'); UI.toast('a tree needs room to itself', 'bad'); }
        break;
      }
    }
    return true;
  }
  function clearPair() { if (G) G.pairFirst = null; }
  function move(x, y) {
    if (dragging) { dragging.x = U.clamp(x, 8, W - 8); dragging.y = y; dragging.z = 16; dragging.vz = 0; dragging.vx = 0; return true; }
    if (grab && !carry && grabAt && Math.hypot(x - grabAt.x, y - grabAt.y) > 7) {
      carry = grab;
      carry.state = 'held'; carry.stateT = 1e4; carry.claim = null;
      carry.lift = 0;
      Audio.play('squeak');
      FX.comic(carry.x, carry.y - 40, U.pick(['UP!', 'WHEE!', 'OOF!']), { ink: '#ffc4dd', edge: '#e0507a', life: 0.6 });
    }
    if (carry) {
      const rm = roam();
      carry.x = U.clamp(x, rm.x0, rm.x1);
      carry.y = U.clamp(y, WALK.y0 - 30, WALK.y1);
      return true;
    }
    return false;
  }
  function release(x, y) {
    if (carry) { setDown(carry, x, y); carry = null; grab = null; grabAt = null; return; }
    if (grab) { pet(grab); grab = null; grabAt = null; return; }   // a tap, not a lift
    if (!dragging) return;
    const d = dragging;
    dragging = null;
    if (truckHit(x, y)) loadIntoTruck(d);
    else { d.z = Math.max(4, d.z); d.vz = 0; }
  }
  // Where she lands is the whole point of carrying her. The truck takes her
  // with you; the pond is a drink; a hill is a good sit; the nest is a date.
  function setDown(w, x, y) {
    w.stateT = U.rand(1.2, 2.4);
    w.state = 'idle';
    w.lift = 0;
    if (truckHit(x, y)) {
      const riders = G.wombats.filter((m) => m.riding).length;
      if (riders >= 2) { UI.toast('the cab only seats two', 'bad'); Audio.play('error'); }
      else {
        w.riding = true; w.x = TRUCK.x - 16; w.y = TRUCK.y - 2;
        Audio.play('door'); FX.hearts(TRUCK.x - 10, TRUCK.y - 40, 4);
        FX.comic(TRUCK.x, TRUCK.y - 56, 'SHOTGUN!', { ink: '#a8d0e0', edge: '#33495c', life: 0.8 });
        UI.toast(`<b>${w.name}</b> is coming along for the drive`, 'good');
      }
      return;
    }
    w.riding = false;
    for (const pd of Wild.ponds) {
      if (Math.hypot(w.x - pd.x, (w.y - pd.y) / 0.45) < pd.r) {
        w.thirst = 0; w.hap = Math.min(hapCap(), w.hap + 10);
        Audio.play('splash'); FX.burst(w.x, w.y, 12, { color: [PAL.water2, PAL.water3], speed: 90, gravity: 220, life: 0.5, size: 2 });
        FX.comic(w.x, w.y - 40, 'SPLOSH!', { ink: '#9fe2ee', edge: '#2f7f96', life: 0.7 });
        return;
      }
    }
    if (Wild.onMound(w.x, w.y)) {
      w.bored = Math.max(0, (w.bored || 0) - 34); w.hap = Math.min(hapCap(), w.hap + 8);
      w.state = 'sleep'; w.stateT = U.rand(5, 9);
      FX.hearts(w.x, w.y - 30, 3); Audio.play('pet');
      return;
    }
    Audio.play('thud', 0.6);
    FX.dust(w.x, w.y, 4, PAL.soil3);
    World.disturb(w.x, w.y, 18, 0.8);
  }
  function hover(x, y) {
    hoverW = (G.tool === 'drag' || G.tool === 'food' || G.tool === 'pair') ? wombatAt(x, y) : null;
    hoverSpot = spotAt(x, y);
    hoverObj = G.tool === 'destroy' ? objAt(x, y) : null;
    const pl = y > GROUND ? plotAt(x) : null;
    const buyable = pl && !ownsPlot(G, pl.key) && plotSign(G, pl) ? pl : null;
    hoverPlot = buyable ? buyable.key : null;
    if (buyable) return `<b>${buyable.name}</b><br>${buyable.cost} W$ &middot; more room, more wombats`;
    if (hoverObj) return `<b>${hoverObj.kind === 'fallen' ? 'Fallen tree' : hoverObj.kind === 'ruin' ? 'Ruin' : 'Stump'}</b><br>${demolishCost(hoverObj)} W$ to have it carried off`;
    if (hoverW) {
      const w = hoverW;
      if (G.tool === 'drag') return `<b>${w.name}</b><br>click to pet, drag to pick her up<br><span class="dim">the pond, a hill or the truck are all good places to put her</span>`;
      const st = w.age !== 'adult' ? Sprites.AGE[w.age].name : w.gest > 0 ? 'expecting' : w.stomach === 'empty' ? 'hungry' : w.stomach === 'digesting' ? 'digesting' : 'about to give';
      const fur = Sprites.furOf(w.pelt);
      return `<b>${w.name}</b> <span class="dim">${fur.name}${fur.rare ? ' &#9670;' : ''}</span><br>${st}<br>${Math.round(w.hap)}/${hapCap()}`;
    }
    if (hoverSpot === 'truck') return '<b>Your truck</b><br>open the map';
    if (Guide.hutHit(x, y)) return '<b>The hut</b><br>he buys every cube you have';
    const pl2 = World.plantAt(x, y);
    if (pl2) return World.plantTip(pl2);
    if (G.tool === 'drag' && dropAt(x, y)) return '<b>Poop</b><br>drag it to the truck';
    return null;
  }

  // ---- scene --------------------------------------------------------------
  function render(g) {
    const f = World.fraction();
    const cam = FX.cam;
    const L = cam.x - VW / 2 / cam.zoom - 20, R = cam.x + VW / 2 / cam.zoom + 20;
    const drift = cam.x - W / 2;           // how far the view has travelled
    g.save();
    g.translate(VW / 2, VH / 2); g.scale(cam.zoom, cam.zoom); g.translate(-cam.x, -cam.y);

    // ---- sky: the hour paints it, the weather flattens it -----------------
    // Sky keeps one clock for the whole game, so the wood, the map and the
    // title screen are all the same afternoon.
    const day = Sky.light(), cov = Sky.cover();
    const top = U.mix(U.mix('#0b1020', '#2d4462', day), '#5a6472', cov * 0.7);
    const bot = U.mix(U.mix('#1e2436', U.mix('#7fa39f', '#cfe0d8', f * 0.5), day), '#8e97a0', cov * 0.7);
    for (let i = 0; i < 12; i++) {
      g.fillStyle = U.mix(top, bot, i / 11);
      g.fillRect(L, Math.round((SKY * i) / 12) - 40, R - L, Math.ceil(SKY / 12) + 42);
    }
    // the sun crosses; after dark the moon takes the same road
    const arc = U.clamp((Sky.hour() - 5) / 14, -0.2, 1.2);
    Sky.drawSun(g, W * 0.1 + arc * W * 0.8 + drift * 0.8, 74 - Math.sin(arc * Math.PI) * 48);
    Sky.drawClouds(g, W, SKY, -drift * 0.9, 0.55 + cov * 0.5);

    // ---- five layers of trees, each at its own drift rate -----------------
    for (let d = 0; d < layers.length; d++) {
      const off = drift * PAR[d];
      const swayD = World.gust(0) * (0.8 + d * 0.5);
      for (const t of layers[d]) {
        const x = t.x + off + World.gust(t.x) * (1.2 + d * 1.1);
        if (x < L - 90 || x > R + 90) continue;
        const img = Props.get('tree', `${t.kind}|${t.v}|${(t.sh * (1 - f * 0.3)).toFixed(2)}`);
        const w2 = img.width * t.s, h2 = img.height * t.s;
        if (d === 0) Art.castShadow(g, img, x, t.y + 2, w2, h2, { alpha: 0.2, lean: 0.72, squash: 0.16 });
        g.drawImage(img, Math.round(x - w2 / 2), Math.round(t.y - h2), Math.round(w2), Math.round(h2));
      }
      // things watching from the second row
      if (d === 1) for (const e of eyes) {
        if (e.on <= 0) continue;
        const ex = e.x + off;
        const a = Math.min(1, e.on) * (0.5 + 0.5 * Math.sin(G.time * 9 + e.ph));
        g.fillStyle = `rgba(245,205,92,${(a * 0.9).toFixed(3)})`;
        g.fillRect(ex, e.y, 2, 2); g.fillRect(ex + 5, e.y, 2, 2);
      }
      // haze thickens toward the back of the wood
      const hz = 0.4 - d * 0.06 - f * 0.1;
      {                                       // haze, as five dithered steps
        const hc = d < 2 ? '#0c0e16' : '#2e323e', hy0 = SKY - 56 + d * 13;
        for (let i = 0; i < 5; i++) {
          const aa = Math.max(0, hz) * (1 - i / 5);
          Art.dither(g, L, hy0 + i * 14, R - L, 15, hc, aa);
        }
      }
      // fog banks caught between the trunks
      for (const m of mist) {
        if (m.d !== Math.min(2, d)) continue;
        const mx = m.x + drift * PAR[d];
        if (mx > R || mx + m.w < L) continue;
        const a = (0.08 + (1 - f) * 0.16) * (0.6 + 0.4 * Math.sin(G.time * 0.4 + m.x));
        for (let i = 0; i < 7; i++) {         // fog bank, banded from the middle out
          const aa = a * (1 - Math.abs(i - 3) / 3.4);
          Art.dither(g, mx, m.y - 14 + i * 4, m.w, 4, '#c6c4cc', aa);
        }
      }
    }
    // ---- light falling through the canopy ---------------------------------
    for (const sh of shafts) {
      const x = sh.x + drift * 0.2;
      if (x < L - 120 || x > R + 120) continue;
      const a = sh.a * (0.55 + 0.45 * Math.sin(G.time * 0.3 + sh.x)) * (0.5 + f * 0.9);
      g.save();                               // the shaft, clipped then dither-banded
      g.beginPath();
      g.moveTo(x - sh.w / 2, SKY - 60); g.lineTo(x + sh.w / 2, SKY - 60);
      g.lineTo(x + sh.lean + sh.w, GROUND + 90); g.lineTo(x + sh.lean - sh.w, GROUND + 90);
      g.closePath(); g.clip();
      const sy0 = SKY - 60, sh2 = (GROUND + 90) - sy0;
      for (let i = 0; i < 8; i++) Art.dither(g, x - sh.w - 40, sy0 + (sh2 / 8) * i, sh.w * 2 + Math.abs(sh.lean) + 80, sh2 / 8 + 1, '#fff0c8', a * (1 - i / 8));
      g.restore();
    }
    // owls on the near boughs
    for (const o of owls) {
      const ox = o.x + drift * PAR[4];
      if (ox < L - 40 || ox > R + 40) continue;
      const img = Sprites.owl(o.blink < 0.35 ? 3 : 0);
      g.drawImage(img, Math.round(ox - 12), Math.round(o.y - 26));
    }
    World.drawGround(g);
    // ground fog rolling off the treeline into the plot
    for (const m of mist) {
      if (m.d !== 2) continue;
      const mx = m.x * 0.7 + 60;
      const a = (0.07 + (1 - f) * 0.1) * (0.6 + 0.4 * Math.sin(G.time * 0.3 + m.x));
      for (let i = 0; i < 6; i++) Art.dither(g, mx, GROUND - 4 + i * 6, m.w * 1.4, 6, '#ceccd4', a * (1 - i / 6));
    }
    Wild.drawGround(g);              // hills and ponds are ground, so they go first
    drawMoss(g, L, R);               // and moss over the whole floor of it
    drawPrints(g);                   // and everything that has walked over it
    World.drawSprouts(g);
    World.drawBlades(g);
    World.drawFlowers(g);

    drawZone(g, f);
    drawFences(g, L, R);
    // Everything on the ground sorts by its feet, weeds included, so a ruin
    // behind a stand of thistles is actually behind them.
    const items = [];
    for (const w of World.weeds) items.push({ y: w.y, fn: () => World.drawWeed(g, w) });
    for (const o of objects) if (o.gone < 1) items.push({ y: o.y, fn: () => drawObject(g, o) });
    for (const d of DECOR) if (G.decor[d.key]) {
      const dx = PLOT_BY_KEY.home.x0 + 20 + d.spot[0] * (PLOT_BY_KEY.home.x1 - PLOT_BY_KEY.home.x0 - 40), dy = WALK.y0 + d.spot[1] * (WALK.y1 - WALK.y0);
      items.push({ y: dy, fn: () => { const img = Props.get(d.key === 'nest' ? 'crate' : 'rock'); g.drawImage(img, Math.round(dx - img.width / 2), Math.round(dy - img.height + 4)); } });
    }
    items.push({ y: -1, fn: () => World.drawCrops(g) });
    for (const it of World.cropItems(g)) items.push(it);   // fruit trees stand tall enough to sort
    for (const w of G.wombats) items.push({ y: w.y, fn: () => drawWombat(g, w) });
    items.push({ y: Guide.hutHere() ? WALK.y0 + 86 : Guide.cult.y, fn: () => Guide.draw(g) });
    if (arrival) items.push({ y: arrival.y, fn: () => { Sprites.shadow(g, arrival.x, arrival.y, 'walk', Math.floor(G.time * 9), 'brown', 1, 'adult', Sprites.S); Sprites.blit(g, arrival.x, arrival.y, 'walk', Math.floor(G.time * 9), 'brown', 1, 'adult', Sprites.S); } });
    for (const f of foods) items.push({ y: f.y, fn: () => drawFood(g, f) });
    for (const d of drops) items.push({ y: d === dragging ? 1e5 : d.y, fn: () => drawDrop(g, d) });
    if (TRUCK.parked || TRUCK.x < W + 100) items.push({ y: TRUCK.y, fn: () => drawTruck(g) });
    for (const a of ants) items.push({ y: a.y, fn: () => drawAnt(g, a) });
    for (const it of Wild.items(g)) items.push(it);
    items.sort((a, b) => a.y - b.y);
    for (const it of items) it.fn();
    drawPlotPrompt(g, L, R);

    // crows
    for (const b of birds) {
      const img = Sprites.crow(Math.floor(G.time * 8 + b.ph), !!b.perch);
      const fl = b.dir < 0 ? Art.flip(img) : img;
      g.drawImage(fl, Math.round(b.x - 12), Math.round(b.y - 9));
    }
    // coins and sickle swings
    for (const c of coins) {
      const y = c.y + c.z;
      Art.ell(g, c.x, c.y + 1, 4, 1.6, 'rgba(0,0,0,0.3)');
      const w = 6 * Math.abs(Math.cos(c.t * 9)) + 1.5;
      Art.ell(g, c.x, y - 6, w, 5, '#0a0810');
      Art.ell(g, c.x, y - 6, Math.max(0.5, w - 1.5), 3.6, PAL.gold2);
      Art.ell(g, c.x - 1, y - 7, Math.max(0.5, w * 0.4), 1.4, PAL.gold4);
    }
    for (const sl of slashes) {
      const k = sl.t / 0.18, a = 1 - k;
      g.save();
      g.translate(sl.x, sl.y); g.scale(1, 0.55); g.rotate(-0.6 + k * 1.8);
      const rr = sl.r * (0.6 + k * 0.5);
      const arc = (rad, n) => { const pts = []; for (let i = 0; i <= n; i++) { const th = -0.9 + (1.8 * i) / n; pts.push([Math.cos(th) * rad, Math.sin(th) * rad]); } return pts; };
      g.globalAlpha = a * 0.9;
      Art.stroke(g, arc(rr, 9), '#fdf3dc', 5);
      Art.stroke(g, arc(rr + 3, 9), '#0a0810', 2);
      g.globalAlpha = 1;
      g.restore();
    }
    // leaves torn off and carried across the plot
    for (const lf of leaves) {
      g.fillStyle = lf.c;
      g.fillRect(Math.round(lf.x), Math.round(lf.y), 2, 2);
      g.fillStyle = 'rgba(0,0,0,0.25)';
      g.fillRect(Math.round(lf.x), Math.round(lf.y) + 2, 2, 1);
    }
    // motes drifting through the dark under the trees
    for (const fl of flies) {
      const x = fl.x + Math.sin(G.time * fl.sp + fl.ph) * 22 + drift * 0.12;
      if (x < L || x > R) continue;
      const y = fl.y + Math.cos(G.time * fl.sp * 0.7 + fl.ph) * 13;
      const a = (0.3 + 0.5 * (Math.sin(G.time * 2.2 + fl.ph) * 0.5 + 0.5)) * (0.4 + f * 0.6);
      g.fillStyle = `rgba(${f > 0.4 ? '214,236,150' : '186,196,214'},${a.toFixed(2)})`;
      g.fillRect(Math.round(x), Math.round(y), 1, 1);
      if (a > 0.65) { g.globalAlpha = 0.2; g.fillRect(Math.round(x) - 1, Math.round(y) - 1, 3, 3); g.globalAlpha = 1; }
    }
    FX.drawParticles(g, 0);
    FX.drawFloaters(g, false);
    FX.drawComics(g, false);
    for (const w of G.wombats) pips(g, w);
    if (G.pointer.on && !arrival) {
      const t = TOOL_BY_KEY[G.tool];
      const tier = TIERS[G.tool] ? tierOf(G, G.tool) : null;
      if (t && t.radius > 0) World.drawCursor(g, G.pointer.x, G.pointer.y, World.brushRadius(tier ? tier.radius : t.radius), toolTint(G.tool));
      // the tool in hand rides beside the cursor
      if (t) Icons.blit(g, t.icon, G.pointer.x + 10, G.pointer.y + 8, 1.25);
    }
    g.restore();

    // The grade: violet in the shadows, warm gold in the light. One pass, and
    // it is what ties the wood to the rest of the game's colour.
    g.save();
    g.globalCompositeOperation = 'soft-light';
    g.fillStyle = '#7a4d94'; g.globalAlpha = 0.34 - f * 0.12; g.fillRect(0, 0, VW, VH);
    g.globalAlpha = 0.5 + f * 0.2;
    Art.glow(g, VW * 0.3, VH * 0.14, VH * 1.1, '#ffe296', 0.5, 6);
    g.restore();
    if (f < 0.95) { g.fillStyle = `rgba(48,30,74,${(0.15 * (1 - f)).toFixed(3)})`; g.fillRect(0, 0, VW, VH); }
    // the whole grove sits inside a soft violet frame
    Art.vignette(g, VW, VH, '#241230', 0.3 - f * 0.1, 1.8, 0.4);
    Art.vignette(g, VW, VH, '#10081a', 0.62 - f * 0.24, 3.2, 0.5);
    Sky.drawOver(g, VW, VH);          // the hour, the mist and the rain, over everything
    edgeArrows(g);
  }

  // ---- the fence line ------------------------------------------------------
  // Land you do not own goes cold and hazy behind a leaning split-rail fence.
  // A board on your side of it names the price. Drawn last, over everything,
  // so no weed can hide it.
  // The fence runs away from the camera, so it spreads outward as it nears.
  // The cold ground behind it is clipped to the same line, so the two agree.
  const fenceAt = (fx) => (y) => fx + (fx > 520 ? 1 : -1) * (y - GROUND) * 0.34;
  function drawFences(g, L, R) {
    for (const p of PLOTS) {
      if (ownsPlot(G, p.key)) continue;
      const sign = plotSign(G, p);
      const border = sign ? (sign.side > 0 ? p.x1 : p.x0) : null;
      const at = border == null ? null : fenceAt(border);
      const y0 = SKY - 40, y1 = H + 60;
      if (Math.min(R, p.x1) > Math.max(L, p.x0)) {          // cold, unworked ground
        const near = at ? at(y1) : null, far = at ? at(y0) : null;
        const pts = !at ? [[p.x0, y0], [p.x1, y0], [p.x1, y1], [p.x0, y1]]
          : sign.side > 0 ? [[p.x0, y0], [far, y0], [near, y1], [p.x0, y1]]
                          : [[far, y0], [p.x1, y0], [p.x1, y1], [near, y1]];
        Art.poly(g, pts, 'rgba(26,18,42,0.52)');
        Art.poly(g, pts, 'rgba(140,158,190,0.09)');
      }
      if (at) fenceLine(g, at);
    }
  }

  // A palisade: close-set pointed stakes lashed with two cords. In this
  // projection a rail fence would read as a row of sticks, so the stakes carry
  // the line instead, and the lashings tie them into one wall.
  function fenceLine(g, at) {
    const STEP = 7;
    const posts = [];
    for (let y = GROUND - 2; y < H + 62; y += STEP) {
      const i = posts.length;
      const ph = 34 + (y - GROUND) * 0.17 + ((i * 37) % 11);
      posts.push({ y, x: Math.round(at(y)), ph: Math.round(ph), lean: ((i * 53) % 5) - 2, tone: i % 3 });
    }
    const TONE = [[PAL.bark2, PAL.bark3], ['#6a4c30', '#8a6a44'], ['#573d26', '#75563a']];
    g.fillStyle = 'rgba(10,8,16,0.3)';                       // one shadow for the whole run
    for (const p of posts) Art.ell(g, p.x + 3, p.y + 2, 7, 2.6);
    for (const p of posts) {
      const [body, lit] = TONE[p.tone];
      const w = 4 + Math.round((p.y - GROUND) / 190);
      const tx = p.x + p.lean, ty = p.y - p.ph;
      Art.poly(g, [[p.x - w - 1, p.y + 2], [p.x + w + 1, p.y + 2], [tx + w + 1, ty + 3], [tx, ty - 5], [tx - w - 1, ty + 3]], '#0a0810');
      Art.poly(g, [[p.x - w, p.y + 1], [p.x + w, p.y + 1], [tx + w, ty + 4], [tx, ty - 3], [tx - w, ty + 4]], body);
      Art.poly(g, [[p.x - w, p.y + 1], [p.x - w + 2, p.y + 1], [tx - w + 2, ty + 4], [tx - w, ty + 4]], lit);
      g.fillStyle = '#3f5a34';                                // moss creeping up the foot
      if (p.tone === 1) g.fillRect(p.x - w, p.y - 6, w * 2, 4);
    }
    // two cords lashing the run together
    for (const k of [0.72, 0.3]) {
      for (let i = 0; i < posts.length - 1; i++) {
        const a2 = posts[i], b2 = posts[i + 1];
        const y1 = a2.y - a2.ph * k, y2 = b2.y - b2.ph * k;
        Art.line(g, a2.x + a2.lean, y1, b2.x + b2.lean, y2, '#120c18', 4);
        Art.line(g, a2.x + a2.lean, y1, b2.x + b2.lean, y2, '#c2a878', 2);
      }
    }
    // a weathered scrap lashed on, a third of the way down
    const p0 = posts[Math.floor(posts.length * 0.66)];
    if (p0) {
      const sy = p0.y - p0.ph - 6, sx = p0.x + p0.lean;
      g.fillStyle = '#0a0810'; g.fillRect(sx - 27, sy, 54, 28);
      g.fillStyle = '#cfc0a2'; g.fillRect(sx - 26, sy + 1, 52, 26);
      g.fillStyle = '#b3a488'; g.fillRect(sx - 26, sy + 22, 52, 4);
      g.fillStyle = '#8a7f68'; g.fillRect(sx - 24, sy + 3, 3, 3); g.fillRect(sx + 21, sy + 3, 3, 3);
      Font.draw(g, 'KEEP', sx, sy + 4, { scale: 2, color: '#8a2f24', align: 'center' });
      Font.draw(g, 'OUT', sx, sy + 15, { scale: 2, color: '#8a2f24', align: 'center' });
    }
  }
  // No board any more: the fenced land IS the button. Hovering it lifts the
  // haze and prints the price where you are pointing.
  function drawPlotPrompt(g, L, R) {
    for (const p of PLOTS) {
      if (ownsPlot(G, p.key) || !plotSign(G, p)) continue;
      const hot = hoverPlot === p.key;
      const v0 = Math.max(L + 80, p.x0 + 16), v1 = Math.min(R - 80, p.x1 - 16);
      if (v1 <= v0) continue;                          // barely on screen: say nothing
      const cx = (v0 + v1) / 2;
      const can = G.wd >= p.cost;
      const bob = Math.sin(G.time * 2.4 + p.x0) * 2;
      const y = 244 + bob;
      if (hot) {                                       // a warm wash over the land you are buying
        g.fillStyle = 'rgba(245,205,92,0.07)';
        g.fillRect(Math.max(L, p.x0), SKY - 20, Math.min(R, p.x1) - Math.max(L, p.x0), H - SKY + 40);
      }
      // a board behind it, because gold letters on a field of weeds are gold
      // letters you cannot read
      const label0 = p.name.toUpperCase();
      const bw = Math.max(Font.width(label0, 2), 108) + 22;
      Art.rect(g, cx - bw / 2 - 2, y - 26, bw + 4, 54, '#120c08');
      Art.rect(g, cx - bw / 2, y - 24, bw, 50, hot ? '#4a361c' : '#2e2414');
      Art.rect(g, cx - bw / 2, y - 24, bw, 2, hot ? '#7a5a2c' : '#4a3a20');
      Art.rect(g, cx - bw / 2, y + 24, bw, 2, '#0e0a06');
      for (const sd of [-1, 1]) Art.rect(g, cx + sd * (bw / 2 - 3) - 1, y - 22, 2, 46, hot ? '#6a4c24' : '#3e3018');
      Art.rect(g, cx - 3, y + 26, 6, 26, '#2a1f10');                   // the post it is nailed to
      Art.rect(g, cx - 3, y + 26, 2, 26, '#443218');
      Font.draw(g, label0, cx, y - 18, {
        scale: 2, color: hot ? '#ffe9a8' : '#d8c8a4', align: 'center', shadow: '#120a06', shadowDist: 2,
      });
      const label = can ? `${p.cost} W$` : `${p.cost} W$`;
      Font.draw(g, label, cx, y + 2, {
        scale: 2, color: can ? '#f5cd5c' : '#e0756a',
        align: 'center', shadow: '#120a06', shadowDist: 2,
      });
      Font.draw(g, can ? (hot ? 'CLICK THE LAND TO BUY IT' : 'FOR SALE') : 'NOT ENOUGH', cx, y + 20, {
        scale: 1, color: !can ? '#e0756a' : hot ? '#c9e88a' : '#b0a488', align: 'center', shadow: '#120a06',
      });
    }
  }
  function buyPlot(p) {
    if (ownsPlot(G, p.key)) return false;
    if (G.wd < p.cost) { Audio.play('error'); UI.toast(`need <b>${p.cost}</b>`, 'bad'); return true; }
    G.wd -= p.cost;
    G.plots[p.key] = true;
    Audio.play('bless');
    FX.shake(3);
    const cx = (p.x0 + p.x1) / 2;
    FX.burst(cx, 300, 30, PAL.gold2);
    FX.comic(cx, 250, 'YOURS!');
    FX.float(cx, 276, `-${p.cost}`, { color: PAL.gold2 });
    UI.toast(`<b>${p.name}</b> is yours`, 'good');
    panTo(cx);
    clampCam();
    UI.refreshTray();
    return true;
  }

  // The patch you have to tidy, marked out the way a site is: hazard tape
  // strung between striped pegs, cones at the quarters, and a barrow and a
  // stack of tools parked at the near edge.
  function drawZone(g, f) {
    if (G.arrived) return;
    const t = G.time;
    const pt = (a2) => [ZONE.x + Math.cos(a2) * ZONE.rx, ZONE.y + Math.sin(a2) * ZONE.ry];
    const N = 12;
    // the tape itself: a black-and-yellow band that sags between the pegs
    for (let i = 0; i < N; i++) {
      const [x1, y1] = pt((i / N) * TAU), [x2, y2] = pt(((i + 1) / N) * TAU);
      const sag = 3 + Math.sin(t * 1.6 + i) * 1.2;
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2 + sag;
      const steps = 7;
      let px = x1, py = y1 - 13;
      for (let k = 1; k <= steps; k++) {
        const u = k / steps, iu = 1 - u;
        const qx = iu * iu * x1 + 2 * iu * u * mx + u * u * x2;
        const qy = iu * iu * (y1 - 13) + 2 * iu * u * (my - 13) + u * u * (y2 - 13);
        Art.line(g, px, py, qx, qy, '#0a0810', 5);
        Art.line(g, px, py, qx, qy, (i * steps + k) % 2 ? '#f2cf3a' : '#1a1408', 3);
        px = qx; py = qy;
      }
    }
    // striped pegs holding it up
    for (let i = 0; i < N; i++) {
      const [x, y] = pt((i / N) * TAU);
      const rx = Math.round(x), ry = Math.round(y);
      g.fillStyle = 'rgba(10,8,16,0.34)'; Art.ell(g, rx, ry + 1, 4, 1.6);
      g.fillStyle = '#0a0810'; g.fillRect(rx - 3, ry - 18, 6, 20);
      for (let k = 0; k < 4; k++) { g.fillStyle = k % 2 ? '#f2cf3a' : '#c9581f'; g.fillRect(rx - 2, ry - 17 + k * 4.4, 4, 4.4); }
      g.fillStyle = 'rgba(255,255,255,0.2)'; g.fillRect(rx - 2, ry - 17, 1, 19);
    }
    // cones at the four quarters, because it is a site
    for (let q = 0; q < 4; q++) {
      const [x, y] = pt((q / 4) * TAU + Math.PI / 4);
      const rx = Math.round(x), ry = Math.round(y);
      g.fillStyle = 'rgba(10,8,16,0.34)'; Art.ell(g, rx, ry + 1, 7, 2.4);
      Art.poly(g, [[rx - 7, ry + 1], [rx + 7, ry + 1], [rx + 5, ry - 2], [rx - 5, ry - 2]], '#0a0810');
      Art.poly(g, [[rx - 6, ry], [rx + 6, ry], [rx + 4, ry - 2], [rx - 4, ry - 2]], '#8a3a12');
      Art.poly(g, [[rx - 4.5, ry - 2], [rx + 4.5, ry - 2], [rx + 1.3, ry - 15], [rx - 1.3, ry - 15]], '#0a0810');
      Art.poly(g, [[rx - 3.6, ry - 2.6], [rx + 3.6, ry - 2.6], [rx + 1, ry - 14], [rx - 1, ry - 14]], '#e0641f');
      Art.poly(g, [[rx - 2.8, ry - 6], [rx + 2.8, ry - 6], [rx + 2.2, ry - 9], [rx - 2.2, ry - 9]], '#f2ead8');
      g.fillStyle = 'rgba(255,220,180,0.3)'; g.fillRect(rx - 3, ry - 13, 1, 10);
    }
    // a board on the near edge saying what the job is
    const bx = Math.round(ZONE.x), by = Math.round(ZONE.y + ZONE.ry + 4);
    const pct = Math.round(U.clamp(World.zoneFraction() / ZONE_GRASS, 0, 1) * 100);
    g.fillStyle = 'rgba(10,8,16,0.34)'; Art.ell(g, bx, by + 2, 22, 4);
    g.fillStyle = '#0a0810'; g.fillRect(bx - 3, by - 16, 6, 18);
    g.fillStyle = PAL.bark2; g.fillRect(bx - 2, by - 15, 4, 17);
    g.fillStyle = '#0a0810'; g.fillRect(bx - 44, by - 40, 88, 26);
    g.fillStyle = '#f2cf3a'; g.fillRect(bx - 42, by - 38, 84, 22);
    for (let i = -44; i < 44; i += 8) Art.poly(g, [[bx + i, by - 38], [bx + i + 4, by - 38], [bx + i - 2, by - 32], [bx + i - 6, by - 32]], '#1a1408');
    g.fillStyle = '#f2cf3a'; g.fillRect(bx - 42, by - 32, 84, 14);
    Font.draw(g, 'WORK SITE', bx, by - 31, { scale: 1, color: '#1a1408', align: 'center' });
    Font.draw(g, `CLEARED ${pct}%`, bx, by - 24, { scale: 1, color: '#5c4a10', align: 'center' });
    // a barrow and a leaning tool at the corner of the site
    const wx = Math.round(ZONE.x - ZONE.rx - 14), wy = Math.round(ZONE.y + ZONE.ry * 0.5);
    g.fillStyle = 'rgba(10,8,16,0.3)'; Art.ell(g, wx, wy + 1, 12, 3);
    Art.poly(g, [[wx - 10, wy - 8], [wx + 9, wy - 10], [wx + 7, wy - 1], [wx - 8, wy - 1]], '#0a0810');
    Art.poly(g, [[wx - 9, wy - 8], [wx + 8, wy - 9.4], [wx + 6, wy - 2], [wx - 7, wy - 2]], '#8a3a12');
    Art.poly(g, [[wx - 9, wy - 8], [wx + 8, wy - 9.4], [wx + 8, wy - 8], [wx - 9, wy - 6.6]], '#d0561f');
    Art.limb(g, wx + 7, wy - 4, wx + 16, wy - 9, 2, 1.4, PAL.bark2);
    Art.ell(g, wx - 5, wy, 3.4, 3.4, '#1c1620'); Art.ell(g, wx - 5, wy, 1.6, 1.6, PAL.stone3);
    Icons.blit(g, 't_sickle', wx + 12, wy - 26, 0.8);
  }

  // A hint at each edge while there is more grove that way.
  function edgeArrows(g) {
    if (arrival) return;
    const c = FX.cam, p = 0.5 + 0.5 * Math.sin(G.time * 3);
    const room = VW / 2 / c.zoom, sp = ownedSpan(G);
    for (const s2 of [-1, 1]) {
      const more = s2 < 0 ? c.x - room > sp.x0 - 38 : c.x + room < sp.x1 + 38;
      if (!more) continue;
      const x = s2 < 0 ? 12 : VW - 12;
      g.globalAlpha = 0.25 + p * 0.3;
      g.fillStyle = PAL.cream;
      for (let i = 0; i < 6; i++) g.fillRect(x + s2 * i, VH / 2 - 7 + i, 2, 14 - i * 2);
      g.globalAlpha = 1;
    }
  }
  function toolTint(k) { return { moss: PAL.moss4, hoe: PAL.soil4, sickle: PAL.rot2, water: PAL.water2, seed: PAL.gold3 }[k] || PAL.cream; }

  // ---- moss ----------------------------------------------------------------
  // Nothing in a wet wood stays bare. Cushions of it grow at the foot of every
  // trunk, along the fence rails and over anything that has been lying still
  // long enough, and the wetter the weather the greener it gets.
  const MOSS = [];
  (() => {
    const r = Art.rng(6112);
    for (let i = 0; i < 90; i++) {
      MOSS.push({ x: r() * W, y: GROUND + 2 + r() * 34, w: 5 + r() * 16, h: 2 + r() * 5, tone: Math.floor(r() * 3), ph: r() * TAU });
    }
    for (let i = 0; i < 60; i++) {
      MOSS.push({ x: r() * W, y: WALK.y0 + r() * (WALK.y1 - WALK.y0), w: 4 + r() * 11, h: 2 + r() * 4, tone: Math.floor(r() * 3), ph: r() * TAU });
    }
  })();
  const MOSS_TONE = ['#3f6a2c', '#4f7a34', '#5d9440'];
  function mossPad(g, x, y, w, h, tone, lush) {
    const c0 = MOSS_TONE[tone], c1 = U.shade(c0, 0.2 + lush * 0.12), c2 = U.shade(c0, -0.26);
    Art.ell(g, x, y, w, h, c2);
    Art.ell(g, x, y - h * 0.24, w * 0.92, h * 0.82, c0);
    Art.ell(g, x - w * 0.24, y - h * 0.46, w * 0.42, h * 0.4, c1);
    for (let i = 0; i < 4; i++) {                           // a few stalks off the top
      const sx = Math.round(x - w * 0.6 + i * w * 0.4), sy = Math.round(y - h * 0.9);
      g.fillStyle = c1; g.fillRect(sx, sy - (i % 2) - 1, 1, 2 + (i % 2));
    }
  }
  function drawMoss(g, L, R) {
    const lush = U.clamp(World.fraction() * 0.6 + Sky.wet() * 0.5, 0, 1);
    for (const m of MOSS) {
      if (m.x < L - 20 || m.x > R + 20) continue;
      const sw = Math.sin(G.time * 0.7 + m.ph) * 0.4;
      mossPad(g, m.x + sw, m.y, m.w * (0.75 + lush * 0.35), m.h * (0.8 + lush * 0.3), m.tone, lush);
    }
  }
  function drawObject(g, o) {
    g.save();
    if (o.gone) { g.globalAlpha = 1 - o.gone; g.translate(0, -o.gone * 22); }
    const img = Props.get(o.kind === 'fallen' ? 'fallen' : o.kind === 'ruin' ? 'ruin' : 'stump', o.v);
    Art.castShadow(g, img, o.x, o.y + 3, img.width, img.height, { alpha: 0.3, lean: 0.58, squash: 0.2 });
    g.drawImage(img, Math.round(o.x - img.width / 2), Math.round(o.y - img.height + 4));
    // and moss over the top of it, because it has been there a long time
    const r = Art.rng(Math.round(o.x) * 17 + (o.v || 0));
    for (let i = 0; i < 5; i++) {
      const mx = o.x - img.width * 0.4 + r() * img.width * 0.8;
      const my = o.y - img.height * (0.2 + r() * 0.55) + 4;
      mossPad(g, mx, my, 3 + r() * 6, 1.6 + r() * 2.4, Math.floor(r() * 3), 0.4);
    }
    g.restore();
    if (hoverObj === o) {
      g.save(); g.strokeStyle = PAL.redL; g.lineWidth = 1; g.setLineDash([3, 3]);
      g.strokeRect(Math.round(o.x - img.width / 2) + 0.5, Math.round(o.y - img.height + 4) + 0.5, img.width, img.height);
      g.setLineDash([]); g.restore();
    }
  }
  function drawAnt(g, a) {
    const img = Sprites.ant(Math.floor(G.time * 12 + a.x), a.carry);
    const fl = a.dir > 0 ? img : Art.flip(img);
    const lift = a.phase === 'lift' ? Math.sin(a.t * 6) * 2 : 0;
    Art.castShadow(g, fl, a.x, a.y, img.width, img.height, { alpha: 0.26, lean: 0.6, squash: 0.24, anchor: 0.5 });
    g.drawImage(fl, Math.round(a.x - 10), Math.round(a.y - 16 - lift));
  }
  const TRUCK_S = 0.78;                      // the Fortuner, sized for the grove
  function drawTruck(g) {
    const img = Props.get('truck');
    const w = Math.round(img.width * TRUCK_S), h = Math.round(img.height * TRUCK_S);
    Art.castShadow(g, img, TRUCK.x, TRUCK.y + 3, w, h, { alpha: 0.32, lean: 0.34, squash: 0.16 });
    g.drawImage(img, Math.round(TRUCK.x - w / 2), Math.round(TRUCK.y - h + 6), w, h);
    // load already collected, stacked in the tray at the back
    const n = Math.min(6, OFFER_ORDER.reduce((s, k) => s + (G.offerings[k] || 0), 0));
    for (let i = 0; i < n; i++) {
      const bx = TRUCK.x + 24 + (i % 2) * 12, by = TRUCK.y - 26 - Math.floor(i / 2) * 10;
      g.save(); g.translate(bx, by);
      Sprites.drawCube(g, OFFERINGS.plain, 10, 10, {});
      g.restore();
    }
    if (TRUCK.parked) {
      const p = 0.5 + 0.5 * Math.sin(G.time * 3);
      g.strokeStyle = `rgba(245,205,92,${0.3 + p * 0.3})`; g.lineWidth = 1; g.setLineDash([4, 4]);
      g.strokeRect(TRUCK.x - 56, TRUCK.y - 56, 112, 62);
      g.setLineDash([]);
    }
  }
  function drawSeed(g) {
    const stage = G.fruitsCount ? Math.min(4, G.fruitsCount) : Object.keys(G.fruits).length;
    const img = Props.get('seed', Math.min(4, stage));
    g.fillStyle = 'rgba(18,14,20,0.3)'; Art.poly(g, [[SEED.x - 8, SEED.y], [SEED.x + 8, SEED.y], [SEED.x + 22, SEED.y + 6], [SEED.x + 6, SEED.y + 6]], g.fillStyle);
    g.drawImage(img, Math.round(SEED.x - img.width / 2), Math.round(SEED.y - img.height + 4));
    const p = 0.5 + 0.5 * Math.sin(G.time * 2.2);
    const rad = 22 + p * 8;
    Art.glow(g, SEED.x, SEED.y - 14, rad, '#b98ef0', 0.24 + p * 0.2, 5);
    for (let i = 0; i < 3; i++) {
      const a = G.time * 1.1 + i * 2.1;
      g.fillStyle = PAL.div4;
      g.fillRect(Math.round(SEED.x + Math.cos(a) * 14), Math.round(SEED.y - 16 + Math.sin(a) * 9), 2, 2);
    }

  }
  function drawPost(g) {
    g.fillStyle = 'rgba(18,14,20,0.3)'; Art.poly(g, [[POST.x - 7, POST.y], [POST.x + 7, POST.y], [POST.x + 20, POST.y + 5], [POST.x + 6, POST.y + 5]], g.fillStyle);
    g.fillStyle = PAL.bark2; g.fillRect(POST.x - 2, POST.y - 34, 5, 34);
    g.fillStyle = PAL.bark3; g.fillRect(POST.x - 2, POST.y - 34, 2, 34);
    g.fillStyle = PAL.bark1; g.fillRect(POST.x - 16, POST.y - 48, 34, 18);
    g.fillStyle = PAL.parch0; g.fillRect(POST.x - 14, POST.y - 46, 30, 14);
    g.fillStyle = PAL.bark0;
    g.fillRect(POST.x - 11, POST.y - 43, 10, 2); g.fillRect(POST.x - 4, POST.y - 39, 14, 2);
    g.fillRect(POST.x - 11, POST.y - 36, 8, 2);
    g.fillStyle = PAL.red2; g.fillRect(POST.x + 6, POST.y - 43, 3, 3);
    if (hoverSpot === 'truck') outline(g, TRUCK.x - 50, TRUCK.y - 48, 96, 56);
  }
  function outline(g, x, y, w, h) {
    g.save(); g.strokeStyle = PAL.gold3; g.lineWidth = 1; g.setLineDash([3, 4]);
    g.strokeRect(Math.round(x) + 0.5, Math.round(y) + 0.5, w, h);
    g.setLineDash([]); g.restore();
  }
  // The best place to sleep out the middle of the day: under a grown tree, in
  // the lee of a hill, or failing that behind the nearest fallen log.
  function shadeSpot(w) {
    let best = null, bd = 1e9;
    for (const c of World.crops) {
      if (World.kindOf(c) !== 'tree' || !World.grown(c)) continue;
      const d = Math.hypot(c.x - w.x, c.y - w.y);
      if (d < bd) { bd = d; best = { x: c.x + U.rand(-14, 14), y: c.y + 10 }; }
    }
    for (const m of Wild.mounds) {
      const d = Math.hypot(m.x - w.x, m.y - w.y);
      if (d < bd) { bd = d; best = { x: m.x + U.rand(-10, 10), y: m.y + 4 }; }
    }
    for (const o of objects) {
      if (o.gone || o.kind !== 'fallen') continue;
      const d = Math.hypot(o.x - w.x, o.y - w.y);
      if (d < bd) { bd = d; best = { x: o.x + U.rand(-16, 16), y: o.y + 8 }; }
    }
    if (!best) return null;
    const rm = roam();
    return { x: U.clamp(best.x, rm.x0, rm.x1), y: U.clamp(best.y, WALK.y0, WALK.y1) };
  }

  // ---- footprints --------------------------------------------------------------
  // Soft ground takes a print, and the prints fade. It is a small thing and it
  // is most of what makes a clearing look walked in.
  const prints = [];
  function print(x, y, dir) {
    prints.push({ x, y, dir, t: 0 });
    if (prints.length > 90) prints.shift();
  }
  function updatePrints(dt) {
    for (let i = prints.length - 1; i >= 0; i--) {
      prints[i].t += dt * (Sky.wet() > 0 ? 2.4 : 1);       // rain washes them out
      if (prints[i].t > 26) prints.splice(i, 1);
    }
  }
  function drawPrints(g) {
    for (const p of prints) {
      const a = U.clamp(1 - p.t / 26, 0, 1) * 0.34;
      if (a < 0.02) continue;
      g.fillStyle = `rgba(42,28,18,${a.toFixed(2)})`;
      g.fillRect(Math.round(p.x - 3), Math.round(p.y), 3, 2);
      g.fillRect(Math.round(p.x + 1), Math.round(p.y - 2), 3, 2);
    }
  }

  // Turning round is an animation, not a flip. It swings the animal away from
  // you, through its back, and out the other side, which takes about a third of
  // a second and is the difference between a creature and a sticker.
  function face(w, dir) {
    if (dir === w.dir) return;
    if (w.turnT > 0) { w.dir = dir; return; }
    w.turnFrom = w.dir; w.turnT = 0.36; w.dir = dir;
  }
  function drawWombat(g, w) {
    let p = 'idle';
    if (w.state === 'walk') p = 'walk';
    else if (w.state === 'sleep') p = 'sleep';
    else if (w.state === 'dig') p = 'dig';
    else if (w.state === 'eat') p = 'eat';
    else if (w.state === 'graze') p = 'graze';
    else if (w.state === 'happy' || w.hap > hapCap() * 0.85) p = 'happy';
    const rate = p === 'walk' ? 13 : p === 'eat' ? 11 : p === 'dig' ? 12 : p === 'happy' ? 11 : 5;
    let frame = Math.floor(w.anim * rate), dir = w.dir;
    if (w.turnT > 0) {                       // mid-turn: swing through the back view
      const n = Sprites.POSES.turn;
      frame = U.clamp(Math.floor((1 - w.turnT / 0.36) * n), 0, n - 1);
      dir = frame < 3 ? (w.turnFrom || w.dir) : w.dir;
      p = 'turn';
    }
    const k = Sprites.AGE[w.age].k;
    const lift = w.lift || 0;
    if (w.state === 'held') {                 // she dangles, and she wriggles
      p = 'hurt'; frame = Math.floor(G.time * 8) % Sprites.POSES.hurt;
      dir = Math.sin(G.time * 7) > 0 ? 1 : -1;
    }
    Sprites.shadow(g, w.x, w.y + lift * 0.3, p, frame, w.pelt, dir, w.age, Sprites.S, w.sq);
    const fur = Sprites.furOf(w.pelt);
    if (fur.glow) {
      Art.glow(g, w.x, w.y - 18 * k, 36 * k, fur.glow, 0.3, 5);
    }
    Sprites.blit(g, w.x, w.y - lift, p, frame, w.pelt, dir, w.age, Sprites.S, w.sq);
    if (lift > 2) {                            // two hands' worth of held-up sparkle
      const a = 0.4 + 0.3 * Math.sin(G.time * 8);
      g.fillStyle = `rgba(255,214,150,${a.toFixed(2)})`;
      for (let i = 0; i < 3; i++) g.fillRect(Math.round(w.x - 14 + i * 12), Math.round(w.y - lift - 34 - (i % 2) * 4), 2, 2);
    }
    if (w.grump > 0 && Math.floor(w.anim * 6) % 2) { g.fillStyle = PAL.red2; g.fillRect(w.x - 8, w.y - 50 * k, 3, 3); g.fillRect(w.x + 6, w.y - 54 * k, 3, 3); }
    if (w.state === 'sleep') {
      const t = (w.anim * 0.5) % 1;
      g.globalAlpha = 1 - t; g.fillStyle = PAL.cream;
      g.fillRect(w.x + 20 + t * 8, w.y - 34 - t * 14, 4, 1);
      g.fillRect(w.x + 20 + t * 8, w.y - 31 - t * 14, 4, 1);
      g.globalAlpha = 1;
    }
    if (w.gest > 0 && Math.floor(G.time * 2) % 2) Icons.blit(g, 'heart', w.x - 8, w.y - 60 * k, 1);
  }
  function pips(g, w) {
    const k = Sprites.AGE[w.age].k;
    const x = Math.round(w.x), y = Math.round(w.y - 54 * k - 8);
    const hp = w.hap / 100;
    g.fillStyle = 'rgba(18,14,20,0.55)'; g.fillRect(x - 12, y, 24, 4);
    g.fillStyle = hp > 0.6 ? PAL.moss4 : hp > 0.3 ? PAL.gold3 : PAL.red2;
    g.fillRect(x - 11, y + 1, Math.round(22 * hp), 2);
    if (w.stomach === 'digesting') {
      const p = 1 - w.digestT / w.digestTotal;
      g.fillStyle = 'rgba(18,14,20,0.55)'; g.fillRect(x - 12, y + 5, 24, 4);
      g.fillStyle = OFFERINGS[(CROP_BY_KEY[w.food] || CROPS[0]).offering].color;
      g.fillRect(x - 11, y + 6, Math.round(22 * p), 2);
    } else if (w.stomach === 'empty' && w.age !== 'baby' && w.state !== 'sleep') {
      Icons.blit(g, 'leaf', x - 7, y - 16 + Math.sin(G.time * 3.4 + w.id) * 1.5, 0.85);
    } else if (w.stomach === 'ready') {
      Icons.blit(g, 'offering', x - 7, y - 18 - Math.abs(Math.sin(G.time * 8)) * 3, 0.85);
    }
    emote(g, w, x, y);
    if (hoverW === w) {
      const nm = String(w.name).toUpperCase();
      const tw = Font.width(nm, 1);
      g.fillStyle = PAL.ink; g.fillRect(x - tw / 2 - 5, y - 16, tw + 10, 13);
      g.fillStyle = PAL.bark1; g.fillRect(x - tw / 2 - 4, y - 15, tw + 8, 11);
      Font.draw(g, nm, x, y - 13, { scale: 1, color: PAL.cream, align: 'center' });
    }
  }
  // Small moods over each wombat: z's asleep, a note while it grazes, hearts
  // when it is thoroughly pleased with you. Cheap, and it makes them alive.
  function emote(g, w, x, y) {
    const T = G.time;
    if (w.state === 'sleep') {
      for (let i = 0; i < 3; i++) {
        const k = ((T * 0.5 + i * 0.33) % 1);
        const a = (1 - k) * 0.9;
        const zs = 1 + Math.floor(k * 2);
        Font.draw(g, 'Z', x + 9 + k * 13, y - 20 - k * 16, {
          scale: zs, color: `rgba(206,222,246,${a.toFixed(2)})`, align: 'center',
        });
      }
      return;
    }
    if (w.state === 'graze' && Math.sin(T * 2 + w.id) > 0.2) {
      const bob = Math.sin(T * 6 + w.id) * 2;
      g.fillStyle = 'rgba(180,226,150,0.85)';
      g.fillRect(Math.round(x + 10), Math.round(y - 24 + bob), 2, 7);
      g.fillRect(Math.round(x + 12), Math.round(y - 25 + bob), 3, 2);
      Art.ell(g, x + 10, y - 17 + bob, 2.2, 1.8, 'rgba(180,226,150,0.85)');
      return;
    }
    if (w.state === 'happy' || (w.hap > 82 && Math.sin(T * 0.9 + w.id * 2) > 0.86)) {
      for (let i = 0; i < 2; i++) {
        const k = ((T * 0.8 + i * 0.5) % 1);
        const a = (1 - k) * 0.9;
        const hx = x - 4 + Math.sin(k * 5 + i) * 5, hy = y - 22 - k * 18;
        g.fillStyle = `rgba(255,140,170,${a.toFixed(2)})`;
        Art.ell(g, hx - 2, hy, 2.2, 2.2, g.fillStyle);
        Art.ell(g, hx + 2, hy, 2.2, 2.2, g.fillStyle);
        Art.poly(g, [[hx - 4, hy + 1], [hx + 4, hy + 1], [hx, hy + 6]], g.fillStyle);
      }
    }
  }

  function drawDrop(g, d) {
    const def = OFFERINGS[d.type], s = CUBE_SIZE * 0.95;
    const w = def.w * s, h = def.h * s;
    const held = d === dragging;
    // a proper contact shadow and a ring of light, so a cube on the ground is
    // something you notice from across the clearing
    g.fillStyle = 'rgba(12,9,16,0.4)'; Art.ell(g, d.x, d.y - 1, w * 0.62, 5);
    if (d.z <= 0.5 && !held) {
      const pulse = 0.5 + 0.5 * Math.sin(G.time * 3 + d.x * 0.1);
      Art.glow(g, d.x, d.y - h * 0.4, 26 + pulse * 6, '#f5cd5c', 0.13 + pulse * 0.09, 4);
    }
    g.save();
    g.translate(Math.round(d.x), Math.round(d.y - d.z - h / 2));
    g.rotate(d.spin * 0.4 + (held ? Math.sin(G.time * 8) * 0.06 : 0));
    if (d.t > 0 && d.z === 0) { const p = 1 + Math.sin(d.t * 4.5) * 0.05; g.scale(p, 1 / p); }
    if (d.sq0) {
      const k = d.sq0 * Math.exp(-7 * d.sqT) * Math.cos(d.sqT * 24);
      g.translate(0, (h / 2) * k); g.scale(1 + k, 1 - k);
    }
    Sprites.drawCube(g, def, w, h, { blessed: d.blessed, outline: held ? PAL.gold4 : d.blessed ? PAL.div4 : null });
    g.restore();
    if (d.blessed && Math.sin(d.t * 7) > 0.4) { g.fillStyle = PAL.div5; g.fillRect(d.x + w / 2 - 2, d.y - d.z - h - 3, 2, 2); }
  }

  function offline(sec) {
    const steps = Math.min(3000, Math.floor(sec / 2));
    let made = 0;
    for (let s = 0; s < steps; s++) {
      for (const w of G.wombats) {
        if (w.stomach === 'digesting') { w.digestT -= 2 * digestMult(w); if (w.digestT <= 0) w.stomach = 'ready'; }
        if (w.stomach === 'ready') {
          const def = CROP_BY_KEY[w.food] || CROPS[0];
          G.offerings[def.offering] = (G.offerings[def.offering] || 0) + 1;
          made++; w.stomach = 'empty'; w.food = null;
        }
        if (w.age !== 'adult') { w.ageT += 2; if (w.ageT >= GROW_TIME[w.age]) { w.ageT = 0; w.age = w.age === 'baby' ? 'juvenile' : 'adult'; } }
        w.hap = Math.max(0, w.hap - 0.14);
      }
    }
    return made;
  }

  return {
    init, update, render, enter, press, move, release, hover, clearPair, toWorld, panBy, panTo, zoomBy, zoomTo, zoomFrac, edgeScroll, addWombat, newWombat, feed, pet, offline,
    capacity, hapCap, adults, drops, objects, tasks, groveClean, callTruck, demolish, saveObjects, reward,
    get truck() { return TRUCK; }, get arriving() { return !!arrival; },
    SEED, POST, TRUCK, GROUND, WALK, W, H, VW,
  };
})();
