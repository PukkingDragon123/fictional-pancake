// ---- The grove ------------------------------------------------------------
const Grove = (() => {
  let G = null;
  const W = 640, H = 360;
  const SKY = 126, GROUND = SKY + 2;
  const WALK = { x0: 30, x1: 610, y0: GROUND + 30, y1: H - 48 };   // the dock owns the last 48px
  const SEED = { x: 318, y: 262 };
  const STORE = { x: 92, y: 214 };
  const POST = { x: 566, y: 258 };
  const TRUCK = { x: 720, y: 300, parked: false, t: 0 };
  const drops = [], objects = [], ants = [], birds = [], owls = [];
  let hoverW = null, hoverSpot = null, hoverObj = null, cartT = 0, troughT = 0;
  let arrival = null, dragging = null;

  // fixed forest layers behind the plot
  const layers = [];
  const R0 = Art.rng(31415);
  for (let d = 0; d < 4; d++) {
    const row = [];
    const n = 24 - d * 3;
    for (let i = 0; i < n; i++) {
      row.push({
        x: -40 + (i / n) * (W + 90) + R0() * 40,
        y: SKY - 34 + d * 15 + R0() * 6,
        kind: ['gnarl', 'pine', 'dead', 'oak', 'birch'][Math.floor(R0() * 5)],
        v: Math.floor(R0() * 4),
        s: 0.44 + d * 0.17 + R0() * 0.08,
        sh: 0.78 - d * 0.19,
      });
    }
    layers.push(row);
  }
  const eyes = [];
  for (let i = 0; i < 7; i++) eyes.push({ x: 30 + R0() * 580, y: SKY - 26 + R0() * 34, ph: R0() * TAU, on: 0 });
  const mist = [];
  for (let i = 0; i < 6; i++) mist.push({ x: R0() * W, y: SKY - 10 + R0() * 50, w: 90 + R0() * 110, s: 2 + R0() * 4 });

  function capacity() { return 2 + (G.up.burrow || 0); }
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
    objects.length = 0;
    const saved = G.objects;
    if (Array.isArray(saved) && saved.length) {
      for (const o of saved) objects.push(Object.assign({}, o));
    } else {
      const r = Art.rng(8675309);
      const spots = [
        ['fallen', 148, 300], ['fallen', 470, 256], ['fallen', 268, 310],
        ['ruin', 212, 238], ['ruin', 404, 290], ['ruin', 556, 320],
        ['stump', 96, 276], ['stump', 350, 234], ['stump', 600, 296], ['stump', 112, 330],
      ];
      spots.forEach(([kind, x, y], i) => objects.push({ id: U.uid(), kind, x, y, v: i % 3, gone: 0 }));
    }
    for (let i = 0; i < 3; i++) birds.push({ x: R0() * W, y: 30 + R0() * 50, dir: R0() < 0.5 ? -1 : 1, ph: R0() * TAU, perch: null, t: R0() * 8 });
    owls.length = 0;
    owls.push({ x: 128, y: SKY - 8, blink: 0 }, { x: 508, y: SKY - 2, blink: 2 });
  }
  function saveObjects() { G.objects = objects.map((o) => ({ id: o.id, kind: o.kind, x: o.x, y: o.y, v: o.v, gone: o.gone })); }

  // ---- checklist ----------------------------------------------------------
  function tasks() {
    const junk = objects.filter((o) => !o.gone).length;
    return [
      { key: 'weeds', icon: 't_sickle', at: 88 - World.weeds.length, need: 88, done: World.weeds.length === 0 },
      { key: 'bugs', icon: 't_net', at: 15 - World.bugs.length, need: 15, done: World.bugs.length === 0 },
      { key: 'junk', icon: 't_destroy', at: objects.length - junk, need: objects.length, done: junk === 0 },
      { key: 'grass', icon: 't_moss', at: Math.round(World.fraction() * 100), need: 18, done: World.fraction() >= 0.18 },
    ];
  }
  const groveClean = () => tasks().every((t) => t.done);

  function checkArrival() {
    if (G.arrived || arrival || !groveClean()) return;
    G.arrived = true;
    arrival = { t: 0, x: -40, y: WALK.y0 + 44 };
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
    FX.cam.tzoom = a.t > 6.6 ? 1 : z;
    FX.cam.tx = a.t > 6.6 ? 320 : U.lerp(320, a.x, 0.85);
    FX.cam.ty = a.t > 6.6 ? 180 : U.lerp(180, a.y - 26, 0.85);
    World.disturb(a.x, a.y, 26, 1.1);
    if (a.t > 3.2 && a.t < 3.4) FX.title('', { size: 1, dur: 0.1 });
    if (a.t > 6.6 && a.t < 6.8) { FX.letterbox(false); }
    if (a.t > 7.6) {
      const w = addWombat({ x: target, y: a.y, pelt: 'brown' });
      w.hap = 80;
      arrival = null;
      G.paused = false;
      FX.cam.tzoom = 1; FX.cam.tx = 320; FX.cam.ty = 180;
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
    if (U.chance(RARE_CHANCE * (a && b ? 2 : 1))) return U.pick(FUR.filter((f) => f.rare)).key;
    if (a && b) return U.chance(0.5) ? a.pelt : b.pelt;
    return U.pick(FUR.filter((f) => !f.rare)).key;
  }
  function newWombat(o = {}) {
    const used = new Set(G.wombats.map((w) => w.name));
    return {
      id: U.uid(), name: NAMES.find((n) => !used.has(n)) || 'Wombat',
      pelt: o.pelt || pickPelt(), age: o.age || 'adult', ageT: 0,
      x: o.x ?? 320, y: o.y ?? WALK.y0 + 20, dir: -1,
      state: 'idle', stateT: U.rand(0.5, 2), anim: U.rand(0, 9), sq: 0,
      hap: 58, stomach: 'empty', food: null, digestT: 0, digestTotal: 1, strain: 0,
      traits: o.traits || makeTraits(), pets: [], grump: 0, gest: 0, mate: null,
    };
  }
  function addWombat(o) {
    const w = newWombat(Object.assign({ x: 320 + U.rand(-40, 40), y: WALK.y0 + U.rand(10, 50) }, o));
    w.tx = U.rand(WALK.x0, WALK.x1); w.ty = U.rand(WALK.y0, WALK.y1);
    w.state = 'walk'; w.stateT = 6;
    G.wombats.push(w);
    FX.dust(w.x, w.y, 8, PAL.soil3);
    return w;
  }

  function update(dt) {
    if (arrival) { updateArrival(dt); return; }
    const cap = hapCap(), decay = 0.42;
    for (const w of G.wombats) {
      w.anim += dt;
      w.hap = U.clamp(w.hap - (decay / (w.traits.calm || 1)) * dt, 0, cap);
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
        if (w.digestT <= 0) { w.stomach = 'ready'; w.strain = 1.8; w.state = 'dig'; w.stateT = 1.8; }
      } else if (w.stomach === 'ready') {
        w.strain -= dt;
        if (w.strain <= 0) leave(w);
      }
      w.stateT -= dt;
      if (w.state === 'walk') {
        const dx = w.tx - w.x, dy = w.ty - w.y, d = Math.hypot(dx, dy);
        const sp = w.age === 'baby' ? 34 : w.age === 'juvenile' ? 30 : 25;
        if (d < 3) { w.state = w.goal || 'idle'; w.stateT = U.rand(2, 4.5); w.goal = null; }
        else {
          w.x += (dx / d) * sp * dt; w.y += (dy / d) * sp * dt;
          w.dir = dx > 0 ? 1 : -1;
          World.disturb(w.x, w.y + 2, 20, 0.85);
          if (G.fruits.greenwake && Math.random() < dt * 1.6) World.sowGrass(w.x, w.y + 2, 8);
        }
      } else if (w.stateT <= 0 && w.state !== 'dig') {
        const r = Math.random();
        if (r < 0.3 && World.hasGrass(w.x, w.y)) { w.state = 'graze'; w.stateT = U.rand(3, 6); }
        else if (r < 0.74) { w.tx = U.rand(WALK.x0, WALK.x1); w.ty = U.rand(WALK.y0, WALK.y1); w.state = 'walk'; w.goal = U.chance(0.35) ? 'graze' : 'idle'; }
        else if (r < 0.85 && w.hap < 40) { w.state = 'sleep'; w.stateT = U.rand(5, 9); }
        else { w.state = 'idle'; w.stateT = U.rand(1.5, 3.5); if (U.chance(0.35)) w.dir = -w.dir; }
      }
      if (w.state === 'dig' && w.stateT <= 0 && w.stomach !== 'ready') { w.state = 'idle'; w.stateT = 1; }
      if (w.state === 'graze') { if (Math.random() < dt * 0.4) w.hap = Math.min(cap, w.hap + 0.6); World.disturb(w.x + w.dir * 14, w.y, 12, 0.5); }
      w.sq = U.lerp(w.sq, 0, 1 - Math.pow(0.001, dt));
      w.x = U.clamp(w.x, WALK.x0, WALK.x1); w.y = U.clamp(w.y, WALK.y0, WALK.y1);
    }
    for (let i = 0; i < G.wombats.length; i++) for (let j = i + 1; j < G.wombats.length; j++) {
      const a = G.wombats[i], b = G.wombats[j], dx = b.x - a.x;
      if (Math.abs(dx) < 34 && Math.abs(b.y - a.y) < 13) {
        const p = (34 - Math.abs(dx)) * dt * 8 * (dx >= 0 ? 1 : -1);
        a.x = U.clamp(a.x - p, WALK.x0, WALK.x1); b.x = U.clamp(b.x + p, WALK.x0, WALK.x1);
      }
    }
    // poop cubes settle
    for (const d of drops) {
      d.t += dt;
      if (d === dragging) continue;
      if (d.z > 0 || d.vz > 0) {
        d.vz -= 600 * dt; d.z += d.vz * dt; d.x += d.vx * dt; d.spin += d.vs * dt;
        if (d.z <= 0) {
          d.z = 0;
          if (Math.abs(d.vz) > 55) { d.vz = -d.vz * 0.34; d.vx *= 0.5; d.vs *= 0.4; FX.dust(d.x, d.y, 3); World.disturb(d.x, d.y, 14, 0.7); }
          else { d.vz = 0; d.vx = 0; d.vs = 0; d.spin = 0; }
        }
      }
    }
    // the truck
    if (TRUCK.parked || TRUCK.t > 0) {
      TRUCK.t += dt;
      const tx = TRUCK.parked ? 540 : 720;
      TRUCK.x = U.lerp(TRUCK.x, tx, 1 - Math.pow(0.06, dt));
      if (!TRUCK.parked && TRUCK.x > 715) TRUCK.t = 0;
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

  function feed(w, key, auto) {
    const def = CROP_BY_KEY[key];
    if (!def || (G.food[key] || 0) <= 0) { if (!auto) Audio.play('error'); return false; }
    if (w.stomach !== 'empty' || w.age === 'baby') { if (!auto) Audio.play('error'); return false; }
    G.food[key]--;
    w.stomach = 'digesting'; w.food = key;
    w.digestTotal = def.grow * 0.55 + 12; w.digestT = w.digestTotal;
    w.hap = Math.min(hapCap(), w.hap + def.hap);
    w.state = 'eat'; w.stateT = 1.6; w.sq = 0.2;
    G.stats.fed++;
    Audio.play('munch');
    FX.burst(w.x + w.dir * 18, w.y - 12, 7, { color: [def.color, PAL.moss4], speed: 50, gravity: 240, life: 0.5, size: 2 });
    UI.refreshTray();
    return true;
  }
  function pet(w) {
    if (w.grump > 0) { Audio.play('error'); return; }
    w.pets = w.pets.filter((t) => G.time - t < 4);
    w.pets.push(G.time);
    if (w.pets.length > 7) { w.grump = 5; w.hap = Math.max(0, w.hap - 14); w.pets = []; Audio.play('squeak'); return; }
    w.hap = Math.min(hapCap(), w.hap + 7 * (G.fruits.softpaws ? 2 : 1));
    if (w.stomach === 'digesting') w.digestT = Math.max(0.01, w.digestT - 2.5);
    w.sq = 0.26;
    if (w.state === 'sleep' || w.state === 'walk') { w.state = 'happy'; w.stateT = 1.1; }
    G.stats.pets++;
    Audio.play('pet'); FX.hearts(w.x, w.y - 30, 3);
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
  }
  function loadIntoTruck(d) {
    const i = drops.indexOf(d);
    if (i >= 0) drops.splice(i, 1);
    const bag = d.blessed ? G.blessed : G.offerings;
    bag[d.type] = (bag[d.type] || 0) + 1;
    G.stats.gathered++;
    Audio.play('pop');
    FX.burst(TRUCK.x - 20, TRUCK.y - 26, 8, { color: [OFFERINGS[d.type].color, PAL.cream], speed: 70, gravity: 120, life: 0.4, size: 2 });
    FX.float(TRUCK.x - 20, TRUCK.y - 40, '+1', { color: PAL.gold4, size: 8 });
    UI.refreshHUD();
  }
  function callTruck() {
    if (TRUCK.parked) { TRUCK.parked = false; TRUCK.t = 0.01; Audio.play('whoosh'); return; }
    TRUCK.parked = true; TRUCK.t = 0.01;
    Audio.play('whoosh');
    UI.toast('truck coming', 'good');
  }
  function truckHit(x, y) { return TRUCK.parked && x > TRUCK.x - 50 && x < TRUCK.x + 46 && y > TRUCK.y - 46 && y < TRUCK.y + 8; }

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
    if (Math.abs(x - SEED.x) < 26 && y > SEED.y - 48 && y < SEED.y + 8) return 'seed';
    if (x > STORE.x - 64 && x < STORE.x + 64 && y > STORE.y - 104 && y < STORE.y + 8) return 'store';
    if (Math.abs(x - POST.x) < 26 && y > POST.y - 52 && y < POST.y + 8) return 'post';
    return null;
  }

  function press(x, y, first) {
    if (arrival) return;
    const tool = G.tool;
    if (y < GROUND) return;
    if (tool === 'drag') {
      if (!first) return;
      const d = dropAt(x, y);
      if (d) { dragging = d; d.z = Math.max(d.z, 12); Audio.play('click'); return; }
      const spot = spotAt(x, y);
      if (spot === 'seed') { Main.setMode('tree'); return; }
      if (spot === 'store') { Shop.open(); return; }
      if (spot === 'post') { Main.setMode('map'); return; }
      const w = wombatAt(x, y);
      if (w) { pet(w); return; }
      if (World.harvest(x, y)) return;
      return;
    }
    if (tool === 'food') {
      if (!first) return;
      const w = wombatAt(x, y);
      if (w) { if (G.selFood && (G.food[G.selFood] || 0) > 0) feed(w, G.selFood, false); else pet(w); }
      return;
    }
    if (tool === 'destroy') {
      if (!first) return;
      const o = objAt(x, y);
      if (o) demolish(o);
      else Audio.play('error');
      return;
    }
    if (tool === 'pair') {
      if (!first) return;
      const w = wombatAt(x, y);
      if (!w || w.age !== 'adult' || w.gest > 0) { Audio.play('error'); return; }
      if (!G.pairFirst) { G.pairFirst = w.id; FX.hearts(w.x, w.y - 30, 2); Audio.play('click'); return; }
      const a = G.wombats.find((m) => m.id === G.pairFirst);
      G.pairFirst = null;
      if (!a || a === w || a.hap < 55 || w.hap < 55 || G.wombats.length >= capacity()) { Audio.play('error'); return; }
      w.gest = 26; w.mate = a.id; a.hap -= 8; w.hap -= 8;
      FX.hearts((w.x + a.x) / 2, w.y - 34, 8); Audio.play('bless');
      return;
    }
    const t = TOOL_BY_KEY[tool];
    const r = World.brushRadius(t ? t.radius : 12);
    switch (tool) {
      case 'moss': if (World.sowGrass(x, y, r) && first) Audio.play('brush'); World.disturb(x, y, r, 0.5); break;
      case 'hoe': World.till(x, y, r); if (first) Audio.play('dig'); break;
      case 'sickle': World.clearWeeds(x, y, r); World.disturb(x, y, r, 0.8); break;
      case 'net': World.catchBugs(x, y, r); World.disturb(x, y, r, 0.6); break;
      case 'water': World.water(x, y, r); if (first) Audio.play('splash'); break;
      case 'seed': {
        const res = World.plant(x, y, G.selSeed);
        if (res === 'ok') { Audio.play('pluck'); UI.refreshTray(); }
        else if (res === 'nosoil' && first) { Audio.play('error'); UI.toast('till the soil first', 'bad'); }
        else if (res === 'noseed' && first) { Audio.play('error'); Shop.open(); }
        break;
      }
    }
  }
  function clearPair() { if (G) G.pairFirst = null; }
  function move(x, y) {
    if (dragging) { dragging.x = x; dragging.y = y; dragging.z = 16; dragging.vz = 0; dragging.vx = 0; return; }
  }
  function release(x, y) {
    if (!dragging) return;
    const d = dragging;
    dragging = null;
    if (truckHit(x, y)) loadIntoTruck(d);
    else { d.z = Math.max(4, d.z); d.vz = 0; }
  }
  function hover(x, y) {
    hoverW = (G.tool === 'drag' || G.tool === 'food' || G.tool === 'pair') ? wombatAt(x, y) : null;
    hoverSpot = G.tool === 'drag' ? spotAt(x, y) : null;
    hoverObj = G.tool === 'destroy' ? objAt(x, y) : null;
    if (hoverObj) return `<b>${hoverObj.kind === 'fallen' ? 'Fallen tree' : hoverObj.kind === 'ruin' ? 'Ruin' : 'Stump'}</b><br>${demolishCost(hoverObj)} W$ to have it carried off`;
    if (hoverW) {
      const w = hoverW;
      const st = w.age !== 'adult' ? Sprites.AGE[w.age].name : w.gest > 0 ? 'expecting' : w.stomach === 'empty' ? 'hungry' : w.stomach === 'digesting' ? 'digesting' : 'about to give';
      const fur = Sprites.furOf(w.pelt);
      return `<b>${w.name}</b> <span class="dim">${fur.name}${fur.rare ? ' &#9670;' : ''}</span><br>${st}<br>${Math.round(w.hap)}/${hapCap()}`;
    }
    if (hoverSpot === 'seed') return '<b>Tree of Life</b><br>a seed, waiting';
    if (hoverSpot === 'store') return '<b>Store</b>';
    if (hoverSpot === 'post') return '<b>Map</b>';
    if (G.tool === 'drag' && dropAt(x, y)) return '<b>Poop</b><br>drag it to the truck';
    return null;
  }

  // ---- scene --------------------------------------------------------------
  function render(g) {
    const f = World.fraction();
    const cam = FX.cam;
    g.save();
    if (cam.zoom !== 1 || cam.x !== 320 || cam.y !== 180) {
      g.translate(W / 2, H / 2); g.scale(cam.zoom, cam.zoom); g.translate(-cam.x, -cam.y);
    }
    // sky
    const top = U.mix('#1a1a26', '#3c5570', f), bot = U.mix('#4a4652', '#8fb0ae', f);
    for (let i = 0; i < 10; i++) { g.fillStyle = U.mix(top, bot, i / 9); g.fillRect(-80, Math.round((SKY * i) / 10) - 40, W + 160, Math.ceil(SKY / 10) + 42); }
    const sg = g.createRadialGradient(120, 44, 4, 120, 44, 90);
    sg.addColorStop(0, `rgba(255,238,176,${0.18 + f * 0.34})`); sg.addColorStop(1, 'rgba(255,238,176,0)');
    g.fillStyle = sg; g.fillRect(30, -46, 180, 180);
    g.fillStyle = U.mix('#6b6470', '#ffeeb0', f); Art.ell(g, 120, 44, 8, 8);
    // dense forest, four layers deep, fog between
    for (let d = 0; d < layers.length; d++) {
      for (const t of layers[d]) {
        const img = Props.get('tree', `${t.kind}|${t.v}|${(t.sh * (1 - f * 0.28)).toFixed(2)}`);
        const w2 = img.width * t.s, h2 = img.height * t.s;
        g.drawImage(img, Math.round(t.x - w2 / 2), Math.round(t.y - h2), Math.round(w2), Math.round(h2));
      }
      // watching eyes in the deepest layers
      if (d === 1) for (const e of eyes) {
        if (e.on <= 0) continue;
        const a = Math.min(1, e.on) * (0.5 + 0.5 * Math.sin(G.time * 9 + e.ph));
        g.fillStyle = `rgba(245,205,92,${a * 0.9})`;
        g.fillRect(e.x, e.y, 2, 2); g.fillRect(e.x + 5, e.y, 2, 2);
      }
      g.fillStyle = `rgba(${d < 2 ? '16,18,26' : '40,44,54'},${0.34 - d * 0.07 - f * 0.08})`;
      g.fillRect(-80, SKY - 44 + d * 15, W + 160, 60);
    }
    // owls on the near boughs
    for (const o of owls) {
      const img = Sprites.owl(o.blink < 0.35 ? 3 : 0);
      g.drawImage(img, Math.round(o.x - 12), Math.round(o.y - 26));
    }
    World.drawGround(g);
    // mist along the treeline
    for (const m of mist) {
      const a = (0.1 + (1 - f) * 0.16) * (0.6 + 0.4 * Math.sin(G.time * 0.4 + m.x));
      const gr = g.createLinearGradient(m.x, m.y - 12, m.x, m.y + 12);
      gr.addColorStop(0, 'rgba(214,206,196,0)');
      gr.addColorStop(0.5, `rgba(214,206,196,${a.toFixed(3)})`);
      gr.addColorStop(1, 'rgba(214,206,196,0)');
      g.fillStyle = gr;
      g.fillRect(m.x, m.y - 12, m.w, 24);
    }
    World.drawSprouts(g);
    World.drawBlades(g);
    World.drawWeeds(g);
    World.drawFlowers(g);

    const items = [];
    items.push({ y: SEED.y, fn: () => drawSeed(g) });
    items.push({ y: STORE.y, fn: () => drawStore(g) });
    items.push({ y: POST.y, fn: () => drawPost(g) });
    for (const o of objects) if (o.gone < 1) items.push({ y: o.y, fn: () => drawObject(g, o) });
    for (const d of DECOR) if (G.decor[d.key]) {
      const dx = WALK.x0 + d.spot[0] * (WALK.x1 - WALK.x0), dy = WALK.y0 + d.spot[1] * (WALK.y1 - WALK.y0);
      items.push({ y: dy, fn: () => { const img = Props.get(d.key === 'nest' ? 'crate' : 'rock'); g.drawImage(img, Math.round(dx - img.width / 2), Math.round(dy - img.height + 4)); } });
    }
    items.push({ y: -1, fn: () => World.drawCrops(g) });
    for (const w of G.wombats) items.push({ y: w.y, fn: () => drawWombat(g, w) });
    if (arrival) items.push({ y: arrival.y, fn: () => Sprites.blit(g, arrival.x, arrival.y, 'walk', Math.floor(G.time * 9), 'brown', 1, 'adult', Sprites.S) });
    for (const d of drops) items.push({ y: d === dragging ? 1e5 : d.y, fn: () => drawDrop(g, d) });
    if (TRUCK.parked || TRUCK.x < 700) items.push({ y: TRUCK.y, fn: () => drawTruck(g) });
    for (const a of ants) items.push({ y: a.y, fn: () => drawAnt(g, a) });
    items.sort((a, b) => a.y - b.y);
    for (const it of items) it.fn();

    World.drawBugs(g);
    // crows
    for (const b of birds) {
      const img = Sprites.crow(Math.floor(G.time * 8 + b.ph), !!b.perch);
      const fl = b.dir < 0 ? Art.flip(img) : img;
      g.drawImage(fl, Math.round(b.x - 12), Math.round(b.y - 9));
    }
    FX.drawParticles(g, 0);
    FX.drawFloaters(g, false);
    for (const w of G.wombats) pips(g, w);
    if (G.pointer.on && !arrival) {
      const t = TOOL_BY_KEY[G.tool];
      if (t && t.radius > 0) World.drawCursor(g, G.pointer.x, G.pointer.y, World.brushRadius(t.radius), toolTint(G.tool));
    }
    g.restore();
  }
  function toolTint(k) { return { moss: PAL.moss4, hoe: PAL.soil4, sickle: PAL.rot2, net: PAL.cyan3, water: PAL.water2, seed: PAL.gold3 }[k] || PAL.cream; }

  function drawObject(g, o) {
    g.save();
    if (o.gone) { g.globalAlpha = 1 - o.gone; g.translate(0, -o.gone * 22); }
    const img = Props.get(o.kind === 'fallen' ? 'fallen' : o.kind === 'ruin' ? 'ruin' : 'stump', o.v);
    g.fillStyle = 'rgba(18,14,20,0.26)';
    Art.ell(g, o.x, o.y + 1, img.width * 0.36, 5);
    g.drawImage(img, Math.round(o.x - img.width / 2), Math.round(o.y - img.height + 4));
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
    g.drawImage(fl, Math.round(a.x - 10), Math.round(a.y - 16 - lift));
  }
  function drawTruck(g) {
    const img = Props.get('truck');
    g.fillStyle = 'rgba(18,14,20,0.3)'; Art.ell(g, TRUCK.x, TRUCK.y + 4, 46, 8);
    g.drawImage(img, Math.round(TRUCK.x - img.width / 2), Math.round(TRUCK.y - img.height + 6));
    // load already collected, stacked in the bed
    const n = Math.min(6, OFFER_ORDER.reduce((s, k) => s + (G.offerings[k] || 0), 0));
    for (let i = 0; i < n; i++) {
      const bx = TRUCK.x - 36 + (i % 3) * 13, by = TRUCK.y - 26 - Math.floor(i / 3) * 11;
      g.save(); g.translate(bx, by);
      Sprites.drawCube(g, OFFERINGS.plain, 11, 11, {});
      g.restore();
    }
    if (TRUCK.parked) {
      const p = 0.5 + 0.5 * Math.sin(G.time * 3);
      g.strokeStyle = `rgba(245,205,92,${0.3 + p * 0.3})`; g.lineWidth = 1; g.setLineDash([4, 4]);
      g.strokeRect(TRUCK.x - 48, TRUCK.y - 44, 92, 50);
      g.setLineDash([]);
    }
  }
  function drawSeed(g) {
    const stage = G.fruitsCount ? Math.min(4, G.fruitsCount) : Object.keys(G.fruits).length;
    const img = Props.get('seed', Math.min(4, stage));
    g.fillStyle = 'rgba(18,14,20,0.28)'; Art.ell(g, SEED.x, SEED.y + 1, 16, 5);
    g.drawImage(img, Math.round(SEED.x - img.width / 2), Math.round(SEED.y - img.height + 4));
    const p = 0.5 + 0.5 * Math.sin(G.time * 2.2);
    const rad = 22 + p * 8;
    const gr = g.createRadialGradient(SEED.x, SEED.y - 14, 2, SEED.x, SEED.y - 14, rad);
    gr.addColorStop(0, `rgba(185,142,240,${0.24 + p * 0.2})`); gr.addColorStop(1, 'rgba(185,142,240,0)');
    g.fillStyle = gr; g.fillRect(SEED.x - rad, SEED.y - 14 - rad, rad * 2, rad * 2);
    for (let i = 0; i < 3; i++) {
      const a = G.time * 1.1 + i * 2.1;
      g.fillStyle = PAL.div4;
      g.fillRect(Math.round(SEED.x + Math.cos(a) * 14), Math.round(SEED.y - 16 + Math.sin(a) * 9), 2, 2);
    }
    if (hoverSpot === 'seed') outline(g, SEED.x - 24, SEED.y - 46, 48, 52);
  }
  function drawStore(g) {
    const img = Props.get('store');
    g.fillStyle = 'rgba(18,14,20,0.3)'; Art.ell(g, STORE.x, STORE.y + 2, 58, 9);
    g.drawImage(img, Math.round(STORE.x - img.width / 2), Math.round(STORE.y - img.height + 6));
    const m = Sprites.mascot(Math.floor(G.time * 3));
    g.drawImage(m, Math.round(STORE.x + 44), Math.round(STORE.y - 96));
    if (hoverSpot === 'store') outline(g, STORE.x - 64, STORE.y - 104, 128, 110);
  }
  function drawPost(g) {
    g.fillStyle = 'rgba(18,14,20,0.28)'; Art.ell(g, POST.x, POST.y + 1, 14, 4);
    g.fillStyle = PAL.bark2; g.fillRect(POST.x - 2, POST.y - 34, 5, 34);
    g.fillStyle = PAL.bark3; g.fillRect(POST.x - 2, POST.y - 34, 2, 34);
    g.fillStyle = PAL.bark1; g.fillRect(POST.x - 16, POST.y - 48, 34, 18);
    g.fillStyle = PAL.parch0; g.fillRect(POST.x - 14, POST.y - 46, 30, 14);
    g.fillStyle = PAL.bark0;
    g.fillRect(POST.x - 11, POST.y - 43, 10, 2); g.fillRect(POST.x - 4, POST.y - 39, 14, 2);
    g.fillRect(POST.x - 11, POST.y - 36, 8, 2);
    g.fillStyle = PAL.red2; g.fillRect(POST.x + 6, POST.y - 43, 3, 3);
    if (hoverSpot === 'post') outline(g, POST.x - 20, POST.y - 50, 42, 56);
  }
  function outline(g, x, y, w, h) {
    g.save(); g.strokeStyle = PAL.gold3; g.lineWidth = 1; g.setLineDash([3, 4]);
    g.strokeRect(Math.round(x) + 0.5, Math.round(y) + 0.5, w, h);
    g.setLineDash([]); g.restore();
  }
  function drawWombat(g, w) {
    let p = 'idle';
    if (w.state === 'walk') p = 'walk';
    else if (w.state === 'sleep') p = 'sleep';
    else if (w.state === 'dig') p = 'dig';
    else if (w.state === 'eat') p = 'eat';
    else if (w.state === 'graze') p = 'graze';
    else if (w.state === 'happy' || w.hap > hapCap() * 0.85) p = 'happy';
    const rate = p === 'walk' ? 9 : p === 'eat' ? 8 : p === 'dig' ? 9 : p === 'happy' ? 9 : 3.4;
    const k = Sprites.AGE[w.age].k;
    g.fillStyle = 'rgba(18,14,20,0.26)';
    Art.ell(g, w.x, w.y - 1, (24 + w.sq * 8) * k, 5 * k);
    const fur = Sprites.furOf(w.pelt);
    if (fur.glow) {
      const gr = g.createRadialGradient(w.x, w.y - 18 * k, 2, w.x, w.y - 18 * k, 36 * k);
      gr.addColorStop(0, U.rgba(fur.glow, 0.3)); gr.addColorStop(1, U.rgba(fur.glow, 0));
      g.fillStyle = gr; g.fillRect(w.x - 36 * k, w.y - 54 * k, 72 * k, 72 * k);
    }
    Sprites.blit(g, w.x, w.y, p, Math.floor(w.anim * rate), w.pelt, w.dir, w.age, Sprites.S, w.sq);
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
    if (hoverW === w) {
      g.font = '7px "Press Start 2P", monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
      const tw = g.measureText(w.name).width;
      g.fillStyle = PAL.ink; g.fillRect(x - tw / 2 - 5, y - 15, tw + 10, 12);
      g.fillStyle = PAL.bark1; g.fillRect(x - tw / 2 - 4, y - 14, tw + 8, 10);
      g.fillStyle = PAL.cream; g.fillText(w.name, x, y - 9);
    }
  }
  function drawDrop(g, d) {
    const def = OFFERINGS[d.type], s = CUBE_SIZE * 0.72;
    const w = def.w * s, h = def.h * s;
    const held = d === dragging;
    g.fillStyle = 'rgba(18,14,20,0.25)'; Art.ell(g, d.x, d.y - 1, w * 0.55, 4);
    g.save();
    g.translate(Math.round(d.x), Math.round(d.y - d.z - h / 2));
    g.rotate(d.spin * 0.4 + (held ? Math.sin(G.time * 8) * 0.06 : 0));
    if (d.t > 0 && d.z === 0) { const p = 1 + Math.sin(d.t * 4.5) * 0.035; g.scale(p, 1 / p); }
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
    init, update, render, press, move, release, hover, clearPair, addWombat, newWombat, feed, pet, offline,
    capacity, hapCap, adults, drops, objects, tasks, groveClean, callTruck, demolish, saveObjects,
    get truck() { return TRUCK; }, get arriving() { return !!arrival; },
    SEED, STORE, POST, GROUND, WALK,
  };
})();
