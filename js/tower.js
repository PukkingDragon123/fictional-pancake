// ---- The offering tower ---------------------------------------------------
// A run is one act of worship: stack what your wombats left on the altar, take
// the favour before it falls. Height brings pilgrims, pilgrims bring coin, and
// the obstacles arrive by height rather than by clock, so the run gets harder
// only because it is going well.
const Tower = (() => {
  let G = null;
  const W = 640, H = 360;
  const PX = 320, ALTAR_Y = 288, GROUND = 332, ALTAR_H = 16;
  const world = new Physics.World();
  let altar = null;
  // Seeded with every field render() touches, because the tower scene draws
  // its idle state before any run has filled these in.
  const R = {
    active: false, phase: 'idle', blessings: [], height: 0, peak: 0, power: 1,
    settled: 0, lives: 0, maxLives: 0, earned: 0, sizeMult: 1, rot: false,
    craneX: PX, lastCraneX: PX, falling: null, canDrop: false, goal: null,
    gust: { active: false, warn: 0, t: 0, dir: 1, str: 0, next: 0, off: false },
    quake: { t: 0, next: 0, active: false },
    fall: { next: 0 }, root: { next: 0, t: 0, b: null, dir: 1 }, spike: { next: 0 },
  };
  const crowd = [];
  const spikes = [];
  let physAcc = 0;

  const woke = (k) => !!(G.gods && G.gods[k]);
  const fruit = (k) => !!(G.fruit && G.fruit[k]);
  const relic = (k) => !!(G.relics && G.relics[k]);

  function altarWidth() {
    let w = 102;
    if (fruit('altar')) w *= 1.35;
    if (relic('plinth')) w *= 1.5;
    return Math.round(w);
  }
  function crowdCap() { return 24 + Math.round(World.restoration() * 0.5) + Object.keys(G.gods || {}).length * 6; }
  function appeal() { return 1 + World.restoration() / 140 + Object.keys(G.gods || {}).length * 0.06; }

  function resetWorld() {
    world.clear();
    spikes.length = 0;
    altar = world.add(new Physics.Body({ x: PX, y: ALTAR_Y + ALTAR_H / 2, width: altarWidth(), height: ALTAR_H, isStatic: true, friction: 0.92, userData: { altar: true } }));
    altar.baseX = PX;
    world.gravity = 760;
    world.iterations = 40;
    world.maxFall = 200;
    world.onImpact = onImpact;
    world.forceFn = applyForces;
  }

  // ---- goals --------------------------------------------------------------
  // One goal per run, drawn from the ones you have not yet met. Favour is the
  // only way to reach the later gods, so the goal is the run's real prize.
  function pickGoal() {
    const undone = COMBO_GOALS.filter((c) => !(G.goalsDone || {})[c.key]);
    const pool = undone.length ? undone : COMBO_GOALS;
    const c = U.pick(pool);
    return { def: c, done: false, kinds: {}, ironRun: 0, slabbed: false, lostAny: false };
  }
  function goalPlaced(type) {
    const gl = R.goal; if (!gl || gl.done) return;
    gl.kinds[type] = true;
    gl.ironRun = type === 'iron' ? gl.ironRun + 1 : 0;
    if (type === 'slab') gl.slabbed = true;
    checkGoal();
  }
  function checkGoal() {
    const gl = R.goal; if (!gl || gl.done) return;
    let met = false;
    switch (gl.def.key) {
      case 'three_iron': met = gl.ironRun >= 3; break;
      case 'no_slab': met = R.height >= 8 && !gl.slabbed; break;
      case 'ten': met = R.height >= 10; break;
      case 'five_kinds': met = Object.keys(gl.kinds).length >= 5; break;
      case 'clean': met = R.height >= 9 && !gl.lostAny; break;
      case 'gold_top': met = false; break;             // judged at cash out
    }
    if (met) awardGoal();
  }
  function awardGoal() {
    const gl = R.goal;
    if (!gl || gl.done) return;
    gl.done = true;
    G.goalsDone[gl.def.key] = true;
    G.favour += gl.def.favour;
    G.favourEver += gl.def.favour;
    FX.title(gl.def.name.toUpperCase(), { size: 17, color: PAL.vio4, dur: 1.8, sub: '+' + gl.def.favour + ' favour' });
    FX.confettiBurst(W / 2, H * 0.35, 40);
    Audio.play('record');
    UI.refreshHUD(); UI.refreshRunHUD();
  }
  function topBody() {
    let best = null;
    for (const b of world.bodies) if (b.userData && b.userData.placed && b.userData.settled && (!best || b.y < best.y)) best = b;
    return best;
  }

  // ---- run ----------------------------------------------------------------
  function newRun() {
    resetWorld();
    Object.assign(R, {
      active: true, phase: 'intro', t: 0, introT: 0,
      falling: null, canDrop: false, dropCd: 0,
      settled: 0, height: 0, peak: 0, lives: 3, maxLives: 3, lost: 0,
      earned: 0, placed: 0, blessings: [], pendingPick: false, nextPick: 5, nextPower: 10,
      power: 1, gripBoost: relic('grip') || woke('tolem') ? 1.3 : 1, sizeMult: 1, goldLeft: 0, encoreUsed: false,
      crowdN: 0, crowdTarget: 0, excite: 0, incomeAcc: 0, incomeRate: 0,
      gust: { active: false, warn: 0, t: 0, dir: 1, str: 0, next: U.rand(7, 11), off: false },
      quake: { t: 0, next: U.rand(26, 40), active: false },
      fall: { next: U.rand(6, 10) }, root: { next: U.rand(9, 14), t: 0, b: null, dir: 1 },
      spike: { next: U.rand(12, 18) },
      lowT: 0, dangerCd: 0, slowT: 0, collapseT: 0, cashT: 0, rot: false,
      craneT: U.rand(0, 6), craneX: PX, lastCraneX: PX, number: (G.runs || 0) + 1, used: 0, bonus: 0,
      goal: pickGoal(),
    });
    crowd.length = 0;
    FX.clear(); FX.letterbox(true);
    FX.title('RITE ' + R.number, { style: 'slide', dur: 2, size: 20, color: PAL.vio4, sub: R.goal.def.name + ' — ' + R.goal.def.desc });
    Audio.play('drum'); Audio.play('whoosh'); Audio.setMode('tower');
    FX.cam.tzoom = 1.2; FX.cam.tx = PX; FX.cam.ty = ALTAR_Y - 30;
    autoSelect();
    UI.onRunStart();
  }

  function applyForces(b, dt) {
    const ud = b.userData; if (!ud || ud.altar) return;
    if (R.gust.active) b.vx += (R.gust.str * R.gust.dir) / Math.max(0.6, b.density) * dt;
    if (R.root.b === b) b.vx += R.root.dir * 42 * dt;
    if (R.blessings.includes('lode') && b === R.falling) { b.vx += (PX - b.x) * 4 * dt; b.vx *= Math.max(0, 1 - 1.5 * dt); }
  }
  function onImpact(a, b, impulse, c) {
    const s = impulse / 800;
    if (s > 0.22) {
      const x = c ? c.x : (a.x + b.x) / 2, y = c ? c.y : (a.y + b.y) / 2;
      FX.dust(x, y, Math.min(12, Math.round(s * 5)), PAL.ash3);
      FX.shake(Math.min(6, s * 1.4));
      Audio.play('thud', Math.min(2, s));
      for (const bd of [a, b]) if (bd.userData && !bd.userData.altar) bd.userData.sq = Math.min(0.3, s * 0.22);
      if (s > 0.7) FX.ring(x, y, Math.min(26, s * 16), U.rgba(PAL.vio4, 0.6));
    }
    if (R.falling && (a === R.falling || b === R.falling)) landed(R.falling);
  }
  function landed(b) {
    b.gravityScale = 1; b.w *= 0.35;
    R.falling = null; R.canDrop = true; R.dropCd = 0.14;
    FX.burst(b.x, b.y, 6, { color: [PAL.bone3, OFFERINGS[b.userData.type].color], speed: 60, gravity: 190, life: 0.35, size: 2 });
  }

  function available(t) { return (G.offerings && G.offerings[t]) || 0; }
  function blessedCount(t) { return (G.blessed && G.blessed[t]) || 0; }
  function total() { return OFFER_ORDER.reduce((s, k) => s + available(k), 0); }
  function autoSelect() {
    if (G.selOffer && available(G.selOffer) > 0) return;
    G.selOffer = OFFER_ORDER.find((k) => available(k) > 0) || null;
    UI.refreshOfferBar();
  }

  function makeOffering(type, blessed, x, y) {
    const def = OFFERINGS[type];
    const sz = CUBE_SIZE * R.sizeMult;
    let w = def.w * sz, h = def.h * sz;
    if (R.rot) { const t = w; w = h; h = t; }
    let friction = def.friction * (fruit('gyro') ? 1.15 : 1) * R.gripBoost;
    if (blessed) friction *= 1.1;
    const adhesion = def.adhesion + (R.blessings.includes('sap') ? 520 : 0);
    return new Physics.Body({
      x, y, width: w, height: h, density: def.density, friction, restitution: def.restitution, adhesion,
      angularDamping: fruit('gyro') ? 1.2 : 0.15, linearDamping: 0.02,
      userData: { type, blessed, placed: true, settled: false, sq: 0 },
    });
  }
  function drop() {
    if (!R.active || R.phase !== 'play' || R.pendingPick || G.paused) return;
    if (!R.canDrop || R.falling) return;
    const type = G.selOffer;
    if (!type || available(type) <= 0) { autoSelect(); return; }
    let blessed = false;
    if (blessedCount(type) > 0) { G.blessed[type]--; blessed = true; }
    G.offerings[type]--;
    R.used++;
    const b = makeOffering(type, blessed, R.craneX, craneY() + 20);
    b.vx = (R.craneX - R.lastCraneX) * 60 * 0.12; b.vy = 30;
    if (!fruit('claw')) b.angle = U.rand(-0.05, 0.05);
    if (R.blessings.includes('feather')) b.gravityScale = 0.6;
    world.add(b);
    R.falling = b; R.canDrop = false;
    Audio.play('whoosh');
    for (let i = 0; i < 5; i++) FX.spawn({ x: b.x + U.rand(-b.width / 2, b.width / 2), y: b.y - b.height / 2, vx: 0, vy: -120, life: 0.28, size: 1.5, color: U.rgba(PAL.vio4, 0.6) });
    autoSelect(); UI.refreshOfferBar(); UI.refreshHUD();
  }
  function craneY() { return towerTop() - 118; }
  function towerTop() {
    let top = ALTAR_Y;
    for (const b of world.bodies) if (b.userData && b.userData.placed && b.restTime > 0.05 && b.y < ALTAR_Y) top = Math.min(top, b.top());
    return top;
  }
  function computeHeight() {
    let top = ALTAR_Y;
    for (const b of world.bodies) if (b.userData && b.userData.settled && b.restTime > 0.05 && b.y < ALTAR_Y + 40) top = Math.min(top, b.top());
    return Math.max(0, (ALTAR_Y - top) / CUBE_SIZE);
  }

  function incomeMult() {
    let m = 1;
    if (R.blessings.includes('tithe')) m *= 1.7;
    if (woke('sella')) m *= 1.35;
    return m * R.power;
  }
  function pay(b) {
    const ud = b.userData, def = OFFERINGS[ud.type];
    let v = def.value;
    if (R.goldLeft > 0 && ud.type !== 'reliquary') { v = Math.max(v, OFFERINGS.reliquary.value); R.goldLeft--; }
    if (ud.blessed) v *= 2;
    if (woke('sella')) v *= 1.35;
    if (relic('shade') && Grove.night() > 0.5) v *= 1.2;
    v *= 1 + 0.15 * R.height;
    if (R.blessings.includes('placing')) v *= 1.6;
    return Math.round(v * R.power);
  }
  function earn(a, x, y, big) {
    G.money += a; R.earned += a; G.stats.earned += a;
    if (x !== undefined) FX.float(x, y, '+' + U.fmt(a), { color: PAL.goldL, size: big ? 9 : 7, world: true, life: 1.1 });
    UI.refreshHUD();
  }

  function onSettled(b) {
    b.userData.settled = true;
    R.settled++;
    R.height = computeHeight();
    const p = pay(b);
    earn(p, b.x, b.y - b.height / 2 - 6, true);
    R.placed += p;
    R.power = 1 + R.settled * 0.09;
    R.excite = Math.min(2, R.excite + 0.9);
    G.favour += 1; G.favourEver += 1;
    Audio.play('place'); Audio.play('coin');
    b.userData.sq = 0.18;
    goalPlaced(b.userData.type);
    if (Math.abs(b.x - PX) < 5 && R.height > 1) {
      FX.float(b.x, b.y - b.height / 2 - 20, 'TRUE', { color: PAL.tealL, size: 8, world: true });
      FX.sparkle(b.x, b.y, 9, PAL.tealL); earn(Math.round(p * 0.5));
    }
    if (R.height > R.peak) R.peak = R.height;
    if (Math.floor(R.peak) > G.record) {
      const was = G.record; G.record = Math.floor(R.peak);
      if (was >= 3) { FX.title('RECORD ' + G.record, { size: 20, color: PAL.goldL, dur: 1.5 }); FX.confettiBurst(W / 2, H * 0.3, 70); Audio.play('record'); FX.flash(PAL.bone4, 0.32); }
    }
    if (R.settled >= R.nextPower) {
      R.nextPower += 10; R.gripBoost *= 1.08;
      for (const bb of world.bodies) if (bb.userData && bb.userData.placed) bb.friction *= 1.08;
      FX.title('x' + R.power.toFixed(2), { size: 18, color: PAL.moss4, dur: 1.2, sub: 'grip up' });
      Audio.play('levelup'); FX.punch(0.1);
    }
    if (R.blessings.includes('bedrock')) bedrock();
    if (R.settled >= R.nextPick) { R.nextPick += 5; R.pendingPick = true; setTimeout(offerBlessings, 380); }
    checkGoal();
    UI.refreshRunHUD();
  }
  function bedrock() {
    const done = world.bodies.filter((b) => b.userData && b.userData.bedrock).length;
    const settled = world.bodies.filter((b) => b.userData && b.userData.settled && !b.userData.bedrock && !b.isStatic).sort((a, b) => b.y - a.y);
    for (let i = 0; i < Math.min(3 - done, settled.length); i++) {
      const b = settled[i];
      if (b.y > ALTAR_Y - CUBE_SIZE * 3.2 && b.restTime > 0.3) {
        b.isStatic = true; b.setMass(0); b.vx = b.vy = b.w = 0; b.userData.bedrock = true;
        FX.sparkle(b.x, b.y, 8, PAL.stone3);
      }
    }
  }

  // Cupra's cupids bring the choice. Without her you still get one, from the
  // shrine itself, but narrower.
  function offerBlessings() {
    if (!R.active) return;
    let n = woke('cupra') ? 3 : 2;
    if (fruit('choir')) n += 1;
    const pool = CUPID_BLESSINGS.filter((p) => !R.blessings.includes(p.key));
    const picks = [];
    while (picks.length < n && pool.length) {
      const wts = pool.map((p) => (p.rare ? 0.55 : 1));
      let r = Math.random() * wts.reduce((a, b) => a + b, 0), idx = 0;
      for (; idx < pool.length; idx++) { r -= wts[idx]; if (r <= 0) break; }
      picks.push(pool.splice(Math.min(idx, pool.length - 1), 1)[0]);
    }
    G.paused = true;
    FX.punch(0.12); FX.vignette(0.68); Audio.play('perk');
    if (woke('cupra')) for (let i = 0; i < 3; i++) Breeding.spawnCupid(U.rand(200, 440), U.rand(120, 200));
    UI.showBlessings(picks, (p) => { applyBlessing(p); G.paused = false; R.pendingPick = false; FX.vignette(0); });
  }
  function applyBlessing(p) {
    R.blessings.push(p.key);
    switch (p.key) {
      case 'sap': for (const b of world.bodies) if (b.userData && b.userData.placed) b.adhesion += 520; break;
      case 'net': R.lives += 2; R.maxLives += 2; break;
      case 'gilding': R.goldLeft = 3; break;
      case 'swell': R.sizeMult *= 1.15; break;
      case 'bedrock': bedrock(); break;
      case 'still': R.gust.off = true; R.gust.active = false; R.gust.warn = 0; break;
    }
    FX.title(p.name.toUpperCase(), { size: 16, color: PAL.vio4, dur: 1.4 });
    FX.confettiBurst(W / 2, H * 0.4, 26);
    UI.refreshRunHUD();
  }

  // ---- pilgrims -----------------------------------------------------------
  function seat(i) {
    const side = i % 2 ? 1 : -1, k = Math.floor(i / 2);
    const col = k % 8, row = Math.floor(k / 8) % 5, extra = Math.floor(k / 40);
    const jx = ((i * 37) % 11) - 5, jy = ((i * 53) % 5) - 2;
    return {
      x: PX + side * (128 + col * 30 + row * 7 + jx + extra * 4),
      y: GROUND - 6 - col * 10 - row * 3.5 + jy,
    };
  }
  function addPilgrim(instant) {
    const i = crowd.length, s = seat(i);
    crowd.push({ x: instant ? s.x : s.x + (s.x > PX ? 180 : -180), tx: s.x, y: s.y, v: i % Sprites.PEOPLE, ph: U.rand(0, TAU), pose: 'idle' });
  }
  function updateCrowd(dt) {
    if (R.phase === 'play' || R.phase === 'intro') {
      R.crowdTarget = Math.min(crowdCap(), Math.floor(4 + Math.pow(R.height, 1.65) * 1.5 * appeal()));
      R.crowdN = Math.min(R.crowdTarget, R.crowdN + (5 + R.height * 1.6) * dt);
      while (crowd.length < Math.floor(R.crowdN)) addPilgrim(false);
      while (crowd.length > Math.floor(R.crowdN) + 3) crowd.pop();
      R.incomeRate = crowd.length * 0.32 * incomeMult();
      R.incomeAcc += R.incomeRate * dt;
      if (R.incomeAcc >= 1) { const a = Math.floor(R.incomeAcc); R.incomeAcc -= a; G.money += a; R.earned += a; G.stats.earned += a; }
    }
    R.excite = Math.max(0, R.excite - dt);
    for (const p of crowd) {
      if (R.phase === 'collapse') { p.x += (p.x > PX ? 1 : -1) * 80 * dt; p.pose = 'cheer'; }
      else {
        p.x = U.lerp(p.x, p.tx, 1 - Math.pow(0.02, dt));
        p.pose = R.phase === 'cash' ? 'jump' : R.excite > 0.6 ? 'cheer' : R.excite > 0.15 ? 'clap' : 'idle';
      }
    }
  }

  // ---- obstacles ----------------------------------------------------------
  function updateHazards(dt) {
    const h = R.height;
    // ash gust
    const wd = R.gust;
    if (!wd.off && (h >= 5 || wd.active || wd.warn > 0)) {
      if (wd.active) {
        wd.t -= dt;
        if (wd.t <= 0) { wd.active = false; wd.next = U.rand(7, 12); }
        else if (U.chance(0.35)) FX.spawn({ x: wd.dir > 0 ? FX.cam.x - W / FX.cam.zoom : FX.cam.x + W / FX.cam.zoom, y: U.rand(towerTop() - 60, ALTAR_Y), vx: wd.dir * wd.str * 1.6, vy: U.rand(-16, 16), life: 1.4, size: 3, color: U.pick([PAL.ash3, PAL.bone1, PAL.bone2]), type: 'leaf', vr: 6 });
      } else if (wd.warn > 0) { wd.warn -= dt; if (wd.warn <= 0) { wd.active = true; wd.t = 1.4; Audio.play('wind'); } }
      else { wd.next -= dt; if (wd.next <= 0 && R.phase === 'play') { wd.warn = 1.3; wd.dir = U.chance(0.5) ? 1 : -1; wd.str = 16 + (h - 5) * 5; Audio.play('alarm'); } }
    }
    // ashfall: a lump of ash drops on whatever is highest
    if (h >= 7 && R.phase === 'play') {
      R.fall.next -= dt;
      if (R.fall.next <= 0) {
        R.fall.next = U.rand(5, 9);
        const t = topBody();
        if (t) {
          const x = t.x + U.rand(-14, 14);
          for (let i = 0; i < 14; i++) FX.spawn({ x: x + U.rand(-6, 6), y: t.top() - 190, vx: U.rand(-8, 8), vy: 240, life: 1.1, size: U.rand(1, 3), color: U.pick([PAL.ash2, PAL.ash3, PAL.bone1]), gravity: 260 });
          setTimeout(() => {
            if (!R.active || R.phase !== 'play') return;
            t.vx += U.rand(-40, 40); t.vy += 55; t.w += U.rand(-1.4, 1.4);
            FX.dust(t.x, t.top(), 8, PAL.ash3); FX.shake(3); Audio.play('thud', 0.8);
          }, 620);
        }
      }
    }
    // grasping root: takes hold of one offering and pulls sideways
    if (h >= 10 && R.phase === 'play') {
      if (R.root.t > 0) {
        R.root.t -= dt;
        if (R.root.t <= 0) R.root.b = null;
      } else {
        R.root.next -= dt;
        if (R.root.next <= 0) {
          R.root.next = U.rand(10, 16);
          const cands = world.bodies.filter((b) => b.userData && b.userData.settled && !b.isStatic && b.y < ALTAR_Y - CUBE_SIZE);
          if (cands.length) {
            R.root.b = U.pick(cands); R.root.t = 2.2; R.root.dir = U.chance(0.5) ? 1 : -1;
            FX.title('A ROOT TAKES HOLD', { size: 12, color: PAL.moss4, dur: 1.2 });
            Audio.play('alarm');
          }
        }
      }
    }
    // bone spikes rise out of the altar
    if (h >= 13 && R.phase === 'play') {
      R.spike.next -= dt;
      if (R.spike.next <= 0) {
        R.spike.next = U.rand(14, 22);
        const off = U.rand(-altarWidth() * 0.35, altarWidth() * 0.35);
        const sp = { x: PX + off, h: 0, max: U.rand(26, 44), t: 0, body: null };
        sp.body = world.add(new Physics.Body({ x: sp.x, y: ALTAR_Y - 1, width: 8, height: 2, isStatic: true, friction: 0.9, userData: { spike: true } }));
        spikes.push(sp);
        FX.title('BONE SPIKE', { size: 12, color: PAL.bone4, dur: 1.1 });
        Audio.play('alarm');
      }
    }
    for (let i = spikes.length - 1; i >= 0; i--) {
      const sp = spikes[i];
      sp.t += dt;
      if (sp.t < 2.4) {
        sp.h = Math.min(sp.max, sp.h + dt * 26);
        sp.body.height = Math.max(2, sp.h);
        sp.body.y = ALTAR_Y - sp.h / 2;
      } else if (sp.t > 5) {
        sp.h -= dt * 40;
        sp.body.height = Math.max(2, sp.h);
        sp.body.y = ALTAR_Y - sp.h / 2;
        if (sp.h <= 2) { world.remove(sp.body); spikes.splice(i, 1); }
      }
    }
    // deep quake
    const q = R.quake;
    if (h >= 16 && R.phase === 'play') {
      if (q.active) {
        q.t -= dt;
        const off = Math.sin(q.t * 40) * 3 * Math.min(1, q.t);
        altar.vx = ((altar.baseX + off) - altar.x) / dt; altar.x = altar.baseX + off;
        FX.shake(1.5);
        if (q.t <= 0) { q.active = false; altar.x = altar.baseX; altar.vx = 0; q.next = U.rand(26, 40); }
      } else { q.next -= dt; if (q.next <= 0) { q.active = true; q.t = 1.6; FX.title('DEEP QUAKE', { size: 15, color: PAL.redL, dur: 1.1, shake: 3 }); Audio.play('drum'); } }
    }
  }

  function update(dt, realDt) {
    if (!R.active) { FX.cam.tzoom = 1; FX.cam.tx = PX; FX.cam.ty = 180; return; }
    R.t += dt;
    if (R.phase === 'intro') { R.introT += realDt; if (R.introT > 2) { R.phase = 'play'; R.canDrop = true; FX.letterbox(false); UI.onRunPlay(); } }
    if (R.phase === 'play' && !G.paused) {
      const sp = 1.45 * (fruit('claw') ? 0.75 : 1) * (R.blessings.includes('slow') ? 0.6 : 1);
      R.craneT += dt * sp;
      const amp = Math.min(150, 78 + R.height * 4);
      R.lastCraneX = R.craneX; R.craneX = PX + Math.sin(R.craneT) * amp;
      if (R.dropCd > 0) R.dropCd -= dt;
    }
    if (!G.paused && (R.phase === 'play' || R.phase === 'collapse' || R.phase === 'cash')) {
      physAcc += dt;
      const step = 1 / 180; let n = 0;
      while (physAcc >= step && n < 14) { world.step(step); physAcc -= step; n++; }
      if (n >= 14) physAcc = 0;
    }
    for (const b of world.bodies) if (b.userData && b.userData.sq) b.userData.sq = Math.max(0, b.userData.sq - realDt * 1.6);

    if (R.phase === 'play') {
      let moving = 0;
      for (let i = world.bodies.length - 1; i >= 0; i--) {
        const b = world.bodies[i], ud = b.userData;
        if (!ud || ud.altar || ud.spike) continue;
        if (b.y > GROUND + 80) {
          world.remove(b);
          if (b === R.falling) landed(b);
          if (R.root.b === b) { R.root.b = null; R.root.t = 0; }
          R.lost++; R.lives--; G.stats.lost++;
          if (R.goal) R.goal.lostAny = true;
          FX.shake(4); Audio.play('thud', 1.5); FX.flash(PAL.red, 0.22);
          UI.refreshRunHUD();
          if (R.lives <= 0) { if (R.blessings.includes('encore') && !R.encoreUsed) encore(); else collapse('OFFERINGS LOST'); }
          continue;
        }
        if (!ud.settled && b !== R.falling && b.restTime > 0.45) onSettled(b);
        if (ud.settled && b.speed > 35) moving++;
      }
      R.height = computeHeight();
      checkGoal();
      if (R.peak >= 4 && R.height < R.peak * 0.5 && moving >= 2) { R.lowT += dt; if (R.lowT > 1.2) collapse('IT FELL'); } else R.lowT = Math.max(0, R.lowT - dt);
      if (R.dangerCd > 0) R.dangerCd -= realDt;
      if (moving >= 1 && R.height >= 3 && R.dangerCd <= 0) {
        R.dangerCd = 4; R.slowT = 0.9;
        FX.setSlowmo(0.35); FX.vignette(0.55); FX.punch(0.05); Audio.play('slowmo');
      }
      if (R.slowT > 0) { R.slowT -= realDt; if (R.slowT <= 0) { FX.setSlowmo(1); FX.vignette(0); } }
      updateHazards(dt);
    }
    if (R.phase === 'collapse') { R.collapseT += realDt; if (R.collapseT > 3) finish(false); }
    if (R.phase === 'cash') { R.cashT += realDt; if (R.cashT > 2.1) finish(true); }
    updateCrowd(dt);

    const cy = craneY() - 26;
    const span = GROUND + 22 - (cy - 40);
    const zoom = U.clamp(H / Math.max(360, span), 0.22, 1);
    FX.cam.tzoom = R.phase === 'intro' ? 1.12 : R.phase === 'collapse' ? zoom * 0.92 : zoom;
    FX.cam.tx = PX;
    FX.cam.ty = GROUND + 22 - (H / 2) / FX.cam.tzoom;
  }

  function encore() {
    R.encoreUsed = true; R.lives = 1;
    for (let i = world.bodies.length - 1; i >= 0; i--) {
      const b = world.bodies[i];
      if (b.userData && b.userData.placed && !b.isStatic && (b.speed > 30 || !b.userData.settled)) {
        FX.burst(b.x, b.y, 10, { color: [PAL.vio4, PAL.bone4], speed: 110 });
        world.remove(b);
      }
    }
    R.falling = null; R.canDrop = true;
    FX.title('SECOND WIND', { size: 22, color: PAL.vio4, dur: 1.6 });
    FX.flash(PAL.vio3, 0.5); Audio.play('perk'); FX.hitstop(0.22);
    UI.refreshRunHUD();
  }
  function collapse(reason) {
    if (R.phase !== 'play') return;
    R.phase = 'collapse'; R.collapseT = 0;
    FX.freeze(0.35); FX.hitstop(0.35);
    FX.setSlowmo(0.3); FX.vignette(0.88); FX.letterbox(true); FX.cine.tDesat = 1;
    FX.flash(PAL.red, 0.6); FX.shake(13); FX.punch(0.14);
    FX.title('IT FALLS', { size: 30, color: PAL.redL, dur: 2.8, shake: 3, delay: 0.3, sub: reason });
    Audio.play('collapse');
    setTimeout(() => Audio.play('cheer', 0.4), 280);
    G.stats.collapses++;
    UI.hideRunHUD();
  }
  function cashOut() {
    if (!R.active || R.phase !== 'play' || R.pendingPick) return;
    if (R.goal && !R.goal.done && R.goal.def.key === 'gold_top') {
      const t = topBody();
      if (t && t.userData.type === 'reliquary') awardGoal();
    }
    R.phase = 'cash'; R.cashT = 0;
    const bonus = Math.round(R.placed * (R.peak / 8) * (relic('scale') ? 2 : 1) + crowd.length * 2);
    R.bonus = bonus; G.money += bonus; R.earned += bonus; G.stats.earned += bonus;
    const fav = Math.round(R.peak * 4);
    G.favour += fav; G.favourEver += fav;
    FX.letterbox(true);
    FX.title('TAKEN UP', { size: 24, color: PAL.moss4, dur: 2, sub: '+' + U.money(bonus) + '  +' + fav + ' favour' });
    FX.confettiBurst(W / 2, H * 0.35, 110);
    Audio.play('cash'); Audio.play('cheer', 1); FX.flash(PAL.bone4, 0.42);
    UI.hideRunHUD();
  }
  function finish(cashed) {
    const s = { cashed, peak: R.peak, settled: R.settled, earned: R.earned, bonus: R.bonus || 0, crowd: crowd.length, blessings: R.blessings.slice(), lost: R.lost, used: R.used, goal: R.goal };
    G.runs = (G.runs || 0) + 1;
    R.active = false; R.phase = 'idle';
    FX.setSlowmo(1, true); FX.vignette(0); FX.letterbox(false); FX.cine.tDesat = 0;
    world.clear(); crowd.length = 0; spikes.length = 0;
    Audio.setMode('grove');
    UI.showSummary(s); UI.onRunEnd();
    Main.save();
  }

  function click() { if (R.active && R.phase === 'play') drop(); }
  function key(k) {
    if (k === ' ') { click(); return true; }
    if (k === 'r' || k === 'R') { R.rot = !R.rot; Audio.play('click'); return true; }
    const n = parseInt(k);
    if (n >= 1 && n <= 9) {
      const t = OFFER_ORDER.filter((c) => available(c) > 0)[n - 1];
      if (t) { G.selOffer = t; UI.refreshOfferBar(); Audio.play('click'); }
      return true;
    }
    return false;
  }

  // ---- scene: a shrine terrace open to the night ---------------------------
  function render(g) {
    const cam = FX.cam;
    g.fillStyle = PAL.ash0; g.fillRect(0, 0, W, H);
    g.save();
    g.translate(W / 2 + cam.shakeX, H / 2 + cam.shakeY);
    g.scale(cam.zoom, cam.zoom);
    g.translate(-cam.x, -cam.y);
    const vw = W / cam.zoom, vh = H / cam.zoom;
    const vx0 = cam.x - vw / 2, vy0 = cam.y - vh / 2;

    // night sky, violet at the top and ash at the horizon
    g.fillStyle = PAL.vio0; g.fillRect(vx0, vy0, vw, vh);
    for (let i = 0; i < 26; i++) {
      const y = vy0 + (i / 26) * vh;
      g.fillStyle = U.rgba(PAL.ash1, 0.06 + (i / 26) * 0.3);
      g.fillRect(vx0, y, vw, vh / 26 + 1);
    }
    for (let i = 0; i < 60; i++) {
      const sx = ((i * 271) % 1400) - 700 + PX, sy = -((i * 173) % 900) + 120;
      if (sy > GROUND) continue;
      g.fillStyle = i % 5 === 0 ? PAL.goldL : U.rgba(PAL.bone3, 0.6);
      g.fillRect(sx, sy, 1, 1);
    }
    // the great arch behind the altar
    for (const side of [-1, 1]) {
      const px = PX + side * 250;
      g.fillStyle = PAL.stone1; g.fillRect(px - 26, -420, 52, GROUND + 420);
      g.fillStyle = PAL.stone2; g.fillRect(px - 26, -420, 8, GROUND + 420);
      g.fillStyle = PAL.stone0; g.fillRect(px + 16, -420, 10, GROUND + 420);
      for (let y = -400; y < GROUND; y += 46) {
        g.fillStyle = PAL.stone0; g.fillRect(px - 26, y, 52, 3);
        g.fillStyle = PAL.stone3; g.fillRect(px - 26, y + 3, 52, 1);
      }
      // braziers up the columns, lighting the tower
      for (const by of [-40, -170, -300]) {
        g.fillStyle = PAL.stone2; g.fillRect(px - side * 34, by, 16, 6);
        g.fillStyle = PAL.stone3; g.fillRect(px - side * 34, by, 16, 2);
        const f = Math.sin(G.time * 9 + by) * 2;
        g.fillStyle = PAL.gold; g.fillRect(px - side * 32, by - 7 + f, 4, 7);
        g.fillStyle = PAL.goldL; g.fillRect(px - side * 31, by - 10 + f, 2, 4);
        // Each brazier lights its own side of the terrace. Reaching across would
        // put both cones over the tower and read as a bowtie, not as light.
        const reach = (PX - px) * 0.5;
        g.globalAlpha = 0.09;
        g.fillStyle = PAL.gold;
        g.beginPath(); g.moveTo(px - side * 30, by); g.lineTo(px - side * 30 + reach, by - 44); g.lineTo(px - side * 30 + reach, by + 70); g.closePath(); g.fill();
        g.globalAlpha = 1;
      }
    }
    // hanging banners, one per woken god
    const awakeGods = GODS.filter((gd) => woke(gd.key));
    for (let i = 0; i < awakeGods.length; i++) {
      const gd = awakeGods[i];
      const bx = PX - 200 + i * 44, by = -190;
      const sway = Math.sin(G.time * 1.2 + i) * 3;
      g.fillStyle = gd.robe0; g.fillRect(bx + sway, by, 26, 120);
      g.fillStyle = gd.robe1; g.fillRect(bx + sway, by, 8, 120);
      g.fillStyle = gd.trim; g.fillRect(bx + sway, by, 26, 4);
      g.fillRect(bx + sway + 9, by + 40, 8, 8);
      g.fillStyle = gd.trim; g.fillRect(bx + sway + 5, by + 118, 16, 4);
    }

    // terrace floor and steps
    g.fillStyle = PAL.stone0; g.fillRect(vx0, GROUND, vw, vh);
    g.fillStyle = PAL.stone1; g.fillRect(vx0, GROUND, vw, 10);
    g.fillStyle = PAL.stone2; g.fillRect(vx0, GROUND, vw, 2);
    for (let i = -12; i <= 12; i++) { g.fillStyle = PAL.stone0; g.fillRect(PX + i * 54, GROUND, 2, 26); }
    for (const side of [-1, 1]) for (let s = 0; s < 6; s++) {
      const y = GROUND - 6 - s * 10;
      g.fillStyle = s % 2 ? PAL.stone1 : U.shade(PAL.stone1, -0.12);
      g.fillRect(PX + side * (108 + s * 30) - (side < 0 ? 30 : 0), y, 30, 10);
      g.fillStyle = PAL.stone2;
      g.fillRect(PX + side * (108 + s * 30) - (side < 0 ? 30 : 0), y, 30, 1);
    }

    // altar column
    const pw = altarWidth();
    g.fillStyle = PAL.stone1; g.fillRect(PX - pw / 2 + 6, ALTAR_Y + ALTAR_H, pw - 12, GROUND - ALTAR_Y - ALTAR_H);
    g.fillStyle = PAL.stone2; g.fillRect(PX - pw / 2 + 6, ALTAR_Y + ALTAR_H, 5, GROUND - ALTAR_Y - ALTAR_H);
    g.fillStyle = PAL.stone0; g.fillRect(PX + pw / 2 - 11, ALTAR_Y + ALTAR_H, 5, GROUND - ALTAR_Y - ALTAR_H);
    for (let y = ALTAR_Y + ALTAR_H + 6; y < GROUND; y += 12) { g.fillStyle = U.rgba(PAL.vio3, 0.5); g.fillRect(PX - 6, y, 12, 2); }

    // height rungs
    if (R.active) {
      g.font = '7px "Press Start 2P", monospace'; g.textAlign = 'right'; g.textBaseline = 'middle';
      for (let h = 5; h <= Math.max(10, R.peak + 10); h += 5) {
        const y = ALTAR_Y - h * CUBE_SIZE;
        g.strokeStyle = h <= R.height ? U.rgba(PAL.moss4, 0.4) : U.rgba(PAL.bone3, 0.16);
        g.setLineDash([4, 7]); g.lineWidth = 1;
        g.beginPath(); g.moveTo(PX - 150, y); g.lineTo(PX + 150, y); g.stroke(); g.setLineDash([]);
        g.fillStyle = h === G.record && G.record > 0 ? PAL.goldL : U.rgba(PAL.bone3, 0.5);
        g.fillText(String(h), PX - 156, y);
      }
    }
    // the altar itself
    if (altar) {
      g.save(); g.translate(altar.x, altar.y);
      g.fillStyle = PAL.stone2; g.fillRect(-pw / 2, -ALTAR_H / 2, pw, ALTAR_H);
      g.fillStyle = PAL.stone3; g.fillRect(-pw / 2, -ALTAR_H / 2, pw, 3);
      g.fillStyle = PAL.stone0; g.fillRect(-pw / 2, ALTAR_H / 2 - 3, pw, 3);
      g.fillStyle = PAL.vio2; for (let x = -pw / 2 + 4; x < pw / 2 - 6; x += 14) g.fillRect(x, -ALTAR_H / 2 + 5, 7, 3);
      g.restore();
    }
    // bone spikes
    for (const sp of spikes) {
      if (sp.h <= 2) continue;
      g.fillStyle = PAL.bone2;
      g.beginPath();
      g.moveTo(sp.x - 5, ALTAR_Y); g.lineTo(sp.x, ALTAR_Y - sp.h); g.lineTo(sp.x + 5, ALTAR_Y); g.closePath(); g.fill();
      g.fillStyle = PAL.bone4;
      g.beginPath();
      g.moveTo(sp.x - 2, ALTAR_Y); g.lineTo(sp.x, ALTAR_Y - sp.h); g.lineTo(sp.x + 1, ALTAR_Y); g.closePath(); g.fill();
    }
    // grasping root
    if (R.root.b) {
      const b = R.root.b;
      const fromX = PX + (R.root.dir > 0 ? -1 : 1) * 200;
      g.strokeStyle = PAL.bark2; g.lineWidth = 5;
      g.beginPath(); g.moveTo(fromX, GROUND);
      g.quadraticCurveTo((fromX + b.x) / 2, b.y + 60, b.x, b.y);
      g.stroke();
      g.strokeStyle = PAL.moss1; g.lineWidth = 2; g.stroke();
    }
    // drop guide
    if (R.active && R.phase === 'play' && fruit('guide') && !R.falling && G.selOffer) {
      const def = OFFERINGS[G.selOffer];
      let hw = def.w * CUBE_SIZE * R.sizeMult / 2;
      if (R.rot) hw = def.h * CUBE_SIZE * R.sizeMult / 2;
      let hy = ALTAR_Y;
      for (const b of world.bodies) {
        if (!b.userData || b.userData.altar) continue;
        const bb = b.aabb();
        if (bb.maxX > R.craneX - hw && bb.minX < R.craneX + hw) hy = Math.min(hy, bb.minY);
      }
      g.strokeStyle = U.rgba(PAL.tealL, 0.55); g.setLineDash([3, 5]); g.lineWidth = 1;
      g.beginPath();
      g.moveTo(R.craneX - hw, craneY() + 22); g.lineTo(R.craneX - hw, hy);
      g.moveTo(R.craneX + hw, craneY() + 22); g.lineTo(R.craneX + hw, hy);
      g.stroke(); g.setLineDash([]);
      g.fillStyle = U.rgba(PAL.tealL, 0.4); g.fillRect(R.craneX - hw, hy - 2, hw * 2, 2);
    }
    // offerings
    for (const b of world.bodies) {
      const ud = b.userData; if (!ud || ud.altar || ud.spike) continue;
      const def = OFFERINGS[ud.type];
      const sq = ud.sq || 0;
      g.save(); g.translate(b.x, b.y); g.rotate(b.angle); g.scale(1 + sq, 1 - sq);
      Sprites.drawCube(g, def, b.width, b.height, {
        face: ud.blessed,
        outline: ud.bedrock ? PAL.stone3 : b === R.falling ? PAL.bone4 : (ud.blessed ? PAL.goldL : null),
      });
      g.restore();
      if (b === R.falling && b.vy > 60) {
        g.strokeStyle = U.rgba(PAL.bone4, 0.3); g.lineWidth = 1;
        for (let i = -1; i <= 1; i++) {
          g.beginPath();
          g.moveTo(b.x + i * b.width * 0.36, b.y - b.height / 2 - 4);
          g.lineTo(b.x + i * b.width * 0.36, b.y - b.height / 2 - 4 - Math.min(38, b.vy * 0.08));
          g.stroke();
        }
      }
    }
    if (R.active && (R.phase === 'play' || R.phase === 'intro')) drawCrane(g);
    // the celebrant, and the pilgrims on the steps
    Sprites.blitGod(g, PX - 214, GROUND + 2, 'celebrant', CELEBRANT, Math.floor(G.time * 2), 0.55);
    for (const p of crowd) {
      const f = Math.floor(G.time * (p.pose === 'idle' ? 1.5 : 7) + p.ph) % 2;
      const img = Sprites.pilgrim(p.v, p.pose, f);
      const hop = p.pose === 'cheer' || p.pose === 'jump' ? Math.abs(Math.sin(G.time * 9 + p.ph)) * 3 : 0;
      g.drawImage(img, Math.round(p.x - 9), Math.round(p.y - 24 - hop));
    }
    // gust streaks
    if (R.gust.warn > 0 || R.gust.active) {
      const dir = R.gust.dir;
      g.fillStyle = R.gust.active ? U.rgba(PAL.bone4, 0.75) : U.rgba(PAL.gold, 0.4 + 0.4 * Math.sin(G.time * 20));
      for (let i = 0; i < 5; i++) {
        const ax = PX - dir * 200 + dir * ((G.time * 210 + i * 62) % 320);
        const ay = towerTop() - 34 + i * 17;
        g.fillRect(ax, ay, dir * 15, 2);
        g.fillRect(ax + dir * 13, ay - 2, dir * 3, 6);
      }
    }
    // Cupra's cupids circle the top of the tower
    if (woke('cupra') && R.active) {
      const tt = towerTop();
      for (const c of Breeding.cupids()) {
        const a = G.time * 0.9 + c.x * 0.01;
        Sprites.blitCupid(g, PX + Math.cos(a) * 92, tt - 40 + Math.sin(a * 1.3) * 26, c.fur, Math.floor(G.time * 6), 1);
      }
    }
    FX.drawParticles(g, 0);
    FX.drawFloaters(g, true);
    g.restore();

    FX.drawParticles(g, 1);
    FX.drawConfetti(g);
    FX.drawFloaters(g, false);
    if (R.active) overlay(g);
  }

  // A nameless officiant, drawn with the same god routine at a smaller scale.
  const CELEBRANT = {
    robe0: '#4a4453', robe1: '#2f2b38', trim: '#c0b8a6', skin: '#948d80',
    mask: 'veil', halo: 'none', arms: 2, holds: 'staff',
  };

  function drawCrane(g) {
    const cy = craneY(), cam = FX.cam;
    const vw = W / cam.zoom;
    // a stone lintel with a chain hoist rather than a circus rig
    g.fillStyle = PAL.stone0; g.fillRect(cam.x - vw, cy - 32, vw * 2, 12);
    g.fillStyle = PAL.stone2; g.fillRect(cam.x - vw, cy - 32, vw * 2, 2);
    g.fillStyle = PAL.stone1;
    for (let x = -3000; x < 3000; x += 34) g.fillRect(x, cy - 30, 2, 10);
    g.fillStyle = PAL.stone3; g.fillRect(cam.x - vw, cy - 21, vw * 2, 1);
    g.fillStyle = PAL.bark2; g.fillRect(R.craneX - 13, cy - 20, 26, 12);
    g.fillStyle = PAL.bark1; g.fillRect(R.craneX - 13, cy - 11, 26, 3);
    g.fillStyle = PAL.gold; g.fillRect(R.craneX - 13, cy - 20, 26, 2);
    g.fillStyle = PAL.stone3;
    for (let i = 0; i < 6; i++) g.fillRect(R.craneX - 1, cy - 8 + i * 3, 2, 2);
    g.fillStyle = PAL.stone2; g.fillRect(R.craneX - 11, cy + 8, 22, 4);
    g.fillStyle = PAL.stone1; g.fillRect(R.craneX - 11, cy + 8, 4, 8); g.fillRect(R.craneX + 7, cy + 8, 4, 8);
    if (!R.falling && R.canDrop && G.selOffer && R.phase === 'play') {
      const def = OFFERINGS[G.selOffer];
      let w = def.w * CUBE_SIZE * R.sizeMult, h = def.h * CUBE_SIZE * R.sizeMult;
      if (R.rot) { const t = w; w = h; h = t; }
      const sway = (R.craneX - R.lastCraneX) * 0.02;
      g.save(); g.translate(R.craneX, cy + 22 + h / 2 - 12); g.rotate(-sway);
      Sprites.drawCube(g, def, w, h, { face: blessedCount(G.selOffer) > 0, outline: U.rgba(PAL.bone4, 0.6) });
      g.restore();
    }
  }

  function overlay(g) {
    const rx = W - 26, y0 = 52, y1 = H - 40;
    g.fillStyle = PAL.ink; g.fillRect(rx - 7, y0 - 8, 16, y1 - y0 + 16);
    g.fillStyle = PAL.stone1; g.fillRect(rx - 6, y0 - 7, 14, y1 - y0 + 14);
    g.fillStyle = PAL.stone3; g.fillRect(rx - 6, y0 - 7, 14, 1);
    g.fillStyle = PAL.stone0; g.fillRect(rx - 3, y0, 7, y1 - y0);
    const maxT = Math.max(12, Math.ceil((R.peak + 4) / 4) * 4);
    g.fillStyle = PAL.stone3;
    for (let t = 0; t <= maxT; t += 4) g.fillRect(rx - 6, Math.round(y1 - (t / maxT) * (y1 - y0)), 4, 1);
    const hy = y1 - (R.height / maxT) * (y1 - y0);
    const py = y1 - (R.peak / maxT) * (y1 - y0);
    g.fillStyle = PAL.moss2; g.fillRect(rx - 3, hy, 7, y1 - hy);
    g.fillStyle = PAL.moss4; g.fillRect(rx - 3, hy, 7, 2);
    g.fillStyle = PAL.bone4; g.fillRect(rx - 6, py, 13, 1);
    if (G.record > 0) {
      const ry = y1 - (Math.min(maxT, G.record) / maxT) * (y1 - y0);
      g.fillStyle = PAL.goldL; g.fillRect(rx - 7, ry, 15, 2);
    }
    g.font = '8px "Press Start 2P", monospace'; g.textAlign = 'center'; g.textBaseline = 'top';
    g.fillStyle = PAL.bone4; g.fillText(R.height.toFixed(1), rx + 1, y1 + 12);
    // the run's goal, top left, struck through once it is met
    if (R.goal) {
      g.font = '7px "Press Start 2P", monospace'; g.textAlign = 'left';
      g.fillStyle = R.goal.done ? PAL.moss4 : PAL.bone2;
      g.fillText((R.goal.done ? '✓ ' : '') + R.goal.def.name.toUpperCase(), 12, 44);
      g.fillStyle = U.rgba(PAL.bone1, 0.7);
      g.fillText('+' + R.goal.def.favour + ' favour', 12, 56);
    }
    if (R.gust.warn > 0) {
      g.font = '10px "Press Start 2P", monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = Math.sin(G.time * 20) > 0 ? PAL.goldL : PAL.redL;
      g.fillText('GUST', W / 2, 28);
    }
    if (R.phase === 'play' && R.rot) { g.font = '7px "Press Start 2P", monospace'; g.textAlign = 'center'; g.fillStyle = PAL.tealL; g.fillText('TURNED', W / 2, H - 16); }
    if (R.phase === 'play' && !G.selOffer && !R.falling) { g.font = '9px "Press Start 2P", monospace'; g.textAlign = 'center'; g.fillStyle = PAL.redL; g.fillText('NOTHING LEFT TO OFFER', W / 2, 50); }
  }

  return {
    init(state) { G = state; resetWorld(); },
    R, world, update, render, click, key, drop, cashOut, newRun, total, available, blessedCount, autoSelect,
    get active() { return R.active; },
    get crowdSize() { return crowd.length; },
  };
})();
