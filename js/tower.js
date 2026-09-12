// ---- The Rite: stack offerings on the shrine plinth ----------------------
const Tower = (() => {
  let G = null;
  const W = 640, H = 360;
  const PX = 320, PLAT_Y = 288, GROUND = 332, PLAT_H = 16;
  const world = new Physics.World();
  let platform = null, censer = null;
  const R = {
    active: false, phase: 'idle', boons: {}, goals: [], wind: { active: false, warn: 0, dir: 1, str: 0, t: 0, next: 9 },
    quake: { t: 0, next: 30, active: false }, height: 0, peak: 0, power: 1, sizeMult: 1,
    earned: 0, lives: 0, maxLives: 0, settled: 0, rate: 0, craneX: PX, lastCraneX: PX, craneT: 0, streak: 0,
  };
  const crowd = [], cupids = [], rocks = [];
  let physAcc = 0;

  function platWidth() { return (G.fruits.wideplinth ? 138 : 100) + (G.up.shrine || 0) * 8; }
  function crowdCap() { return 12 + 5 * (G.up.seats || 0); }
  function boon(k) { return (R.boons[k] || 0) > 0; }

  function resetWorld() {
    world.clear();
    platform = world.add(new Physics.Body({ x: PX, y: PLAT_Y + PLAT_H / 2, width: platWidth(), height: PLAT_H, isStatic: true, friction: 0.92, userData: { platform: true } }));
    platform.baseX = PX;
    censer = null;
    world.gravity = 760; world.iterations = 40; world.maxFall = 200;
    world.onImpact = onImpact;
    world.forceFn = applyForces;
  }
  function newRun() {
    resetWorld();
    Object.assign(R, {
      active: true, phase: 'intro', t: 0, introT: 0,
      falling: null, canDrop: false, dropCd: 0,
      settled: 0, height: 0, peak: 0, lives: 3, maxLives: 3, lost: 0, streak: 0, centred: 0, stones: 0,
      earned: 0, placed: 0, boons: {}, goals: rollGoals(), goalPay: 0,
      power: 1, gripBoost: 1, sizeMult: 1,
      crowdN: 0, crowdTarget: 0, excite: 0, acc: 0, rate: 0,
      wind: { active: false, warn: 0, t: 0, dir: 1, str: 0, next: U.rand(8, 13) },
      quake: { t: 0, next: U.rand(30, 46), active: false },
      lowT: 0, dangerCd: 0, slowT: 0, endT: 0, cashT: 0, rot: false, cupidT: U.rand(10, 16), rockT: U.rand(14, 22),
      craneT: U.rand(0, 6), craneX: PX, lastCraneX: PX, number: (G.runs || 0) + 1, used: 0, bonus: 0,
    });
    crowd.length = 0; cupids.length = 0; rocks.length = 0;
    FX.clear(); FX.letterbox(true);
    FX.title('RITE ' + R.number, { style: 'slide', dur: 1.9, size: 20, color: PAL.div4 });
    Audio.play('drum'); Audio.setMode('tower');
    FX.cam.tzoom = 1.2; FX.cam.tx = PX; FX.cam.ty = PLAT_Y - 30;
    autoSelect();
    UI.onRunStart();
  }
  function rollGoals() {
    const tier = Math.max(3, Math.min(9, Math.floor((G.record || 3) * 0.8)));
    const picks = [];
    const pool = GOALS.slice();
    for (let i = 0; i < 3 && pool.length; i++) {
      const gdef = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
      const n = gdef.key === 'reach' ? tier + 1 : Math.max(2, Math.round(tier * 0.45));
      picks.push(Object.assign({ key: gdef.key, done: false, at: 0 }, gdef.gen(n)));
    }
    return picks;
  }

  function applyForces(b, dt) {
    const ud = b.userData; if (!ud || ud.platform) return;
    if (R.wind.active) b.vx += (R.wind.str * R.wind.dir) / Math.max(0.6, b.density) * dt;
    if (boon('magnet') && b === R.falling) { b.vx += (PX - b.x) * 4.5 * dt; b.vx *= Math.max(0, 1 - 1.6 * dt); }
  }
  function onImpact(a, b, impulse, c) {
    const s = impulse / 800;
    if (s > 0.22) {
      const x = c ? c.x : (a.x + b.x) / 2, y = c ? c.y : (a.y + b.y) / 2;
      FX.dust(x, y, Math.min(12, Math.round(s * 5)), PAL.soil3);
      FX.shake(Math.min(6, s * 1.4));
      Audio.play('thud', Math.min(2, s));
      for (const bd of [a, b]) if (bd.userData && !bd.userData.platform) bd.userData.sq = Math.min(0.3, s * 0.22);
      if (s > 0.7) FX.ring(x, y, Math.min(26, s * 16));
    }
    if (R.falling && (a === R.falling || b === R.falling)) landed(R.falling);
  }
  function landed(b) {
    b.gravityScale = 1; b.w *= 0.35;
    R.falling = null; R.canDrop = true; R.dropCd = 0.14;
    FX.burst(b.x, b.y, 6, { color: [PAL.cream, OFFERINGS[b.userData.type].color], speed: 60, gravity: 190, life: 0.35, size: 2 });
  }

  function available(t) { return (G.offerings[t] || 0) + (G.blessed[t] || 0); }
  function total() { return OFFER_ORDER.reduce((s, k) => s + available(k), 0); }
  function autoSelect() {
    if (G.selOffer && available(G.selOffer) > 0) return;
    G.selOffer = OFFER_ORDER.find((k) => available(k) > 0) || null;
    UI.refreshTray();
  }
  function make(type, blessed, x, y) {
    const def = OFFERINGS[type];
    const sz = CUBE_SIZE * R.sizeMult;
    let w = def.w * sz, h = def.h * sz;
    if (R.rot) { const t = w; w = h; h = t; }
    let friction = def.friction * (G.fruits.gyro ? 1.15 : 1) * R.gripBoost;
    if (blessed) friction *= 1.12;
    let adhesion = def.adhesion + (boon('tacky') ? 900 : 0);
    return new Physics.Body({
      x, y, width: w, height: h, density: def.density, friction, restitution: def.restitution, adhesion,
      angularDamping: 0.15, linearDamping: 0.02,
      userData: { type, blessed, placed: true, settled: false, sq: 0 },
    });
  }
  function drop() {
    if (!R.active || R.phase !== 'play' || G.paused) return;
    if (!R.canDrop || R.falling) return;
    const type = G.selOffer;
    if (!type || available(type) <= 0) { autoSelect(); return; }
    let blessed = false;
    if ((G.blessed[type] || 0) > 0) { G.blessed[type]--; blessed = true; } else G.offerings[type]--;
    R.used++;
    const b = make(type, blessed, R.craneX, craneY() + 20);
    b.vx = (R.craneX - R.lastCraneX) * 60 * 0.12; b.vy = 30;
    if (!G.fruits.steadyclaw) b.angle = U.rand(-0.05, 0.05);
    if (boon('feather')) b.gravityScale = 0.55;
    world.add(b);
    R.falling = b; R.canDrop = false;
    Audio.play('whoosh');
    autoSelect(); UI.refreshTray(); UI.refreshHUD();
  }
  function craneY() { return towerTop() - 118; }
  function towerTop() {
    let top = PLAT_Y;
    for (const b of world.bodies) if (b.userData && b.userData.placed && b.restTime > 0.05 && b.y < PLAT_Y) top = Math.min(top, b.top());
    return top;
  }
  function computeHeight() {
    let top = PLAT_Y;
    for (const b of world.bodies) if (b.userData && b.userData.settled && b.restTime > 0.05 && b.y < PLAT_Y + 40) top = Math.min(top, b.top());
    return Math.max(0, (PLAT_Y - top) / CUBE_SIZE);
  }
  function incomeMult() {
    let m = 1 + 0.12 * (G.up.seats || 0);
    if (G.blessings.wombonysus) m *= 2;
    if (boon('double')) m *= 2;
    return m * R.power;
  }
  function pay(b) {
    const ud = b.userData, def = OFFERINGS[ud.type];
    let v = def.value;
    if (ud.blessed) v *= 2;
    if ((G.up.cart || 0) >= 3) v *= 1.1;
    v *= 1 + 0.15 * R.height;
    return Math.round(v * R.power * (boon('double') ? 2 : 1) * (G.blessings.wombonysus ? 2 : 1));
  }
  function earn(a, x, y, big) {
    G.wd += a; R.earned += a; G.stats.earned += a;
    if (x !== undefined) FX.float(x, y, '+' + U.fmt(a), { color: PAL.gold4, size: big ? 9 : 7, world: true, life: 1.1 });
    UI.refreshHUD();
  }
  function onSettled(b) {
    b.userData.settled = true;
    R.settled++; R.streak++;
    R.height = computeHeight();
    const p = pay(b);
    earn(p, b.x, b.y - b.height / 2 - 6, true);
    R.placed += p;
    R.power = 1 + R.settled * 0.09;
    R.excite = Math.min(2, R.excite + 0.9);
    Audio.play('place'); Audio.play('coin');
    b.userData.sq = 0.18;
    if (Math.abs(b.x - PX) < 5 && R.height > 1) {
      R.centred++;
      FX.float(b.x, b.y - b.height / 2 - 20, 'TRUE', { color: PAL.cyan3, size: 8, world: true });
      FX.sparkle(b.x, b.y, 9, PAL.cyan3); earn(Math.round(p * 0.5));
    }
    if (b.userData.type === 'stone') R.stones++;
    if (R.height > R.peak) R.peak = R.height;
    if (Math.floor(R.peak) > G.record) {
      const was = G.record; G.record = Math.floor(R.peak);
      if (was >= 3) { FX.title('' + G.record, { size: 26, color: PAL.gold4, dur: 1.3 }); FX.confettiBurst(W / 2, H * 0.3, 70); Audio.play('record'); }
    }
    checkGoals();
    UI.refreshRunHUD();
  }
  function checkGoals() {
    for (const gl of R.goals) {
      if (gl.done) continue;
      gl.at = gl.kind === 'height' ? Math.floor(R.peak) : gl.kind === 'streak' ? R.streak : gl.kind === 'centre' ? R.centred : R.stones;
      if (gl.at >= gl.need) {
        gl.done = true;
        R.goalPay += gl.pay;
        earn(gl.pay);
        Audio.play('chime'); FX.flash(U.rgba(PAL.cyan3, 0.5), 0.3); FX.punch(0.09);
        FX.title(gl.text, { size: 14, color: PAL.cyan3, dur: 1.3 });
      }
    }
  }

  // ---- crowd of wombats ---------------------------------------------------
  function seat(i) {
    const side = i % 2 ? 1 : -1, k = Math.floor(i / 2);
    const col = k % 6, row = Math.floor(k / 6) % 3;
    return { x: PX + side * (120 + col * 36 + row * 10 + ((i * 37) % 9)), y: GROUND - 4 - col * 9 - row * 4 };
  }
  function updateCrowd(dt) {
    if (R.phase === 'play' || R.phase === 'intro') {
      let f = 1;
      for (const d of DECOR) if (G.decor[d.key] && d.favor) f += d.favor;
      R.crowdTarget = Math.min(crowdCap(), Math.floor(2 + Math.pow(R.height, 1.5) * 1.1 * f));
      R.crowdN = Math.min(R.crowdTarget, R.crowdN + 3.4 * dt);
      while (crowd.length < Math.floor(R.crowdN)) {
        const i = crowd.length, s = seat(i);
        crowd.push({ x: s.x + (s.x > PX ? 150 : -150), tx: s.x, y: s.y, pelt: U.pick(FUR.filter((p) => !p.rare)).key, ph: U.rand(0, TAU) });
      }
      while (crowd.length > Math.floor(R.crowdN) + 2) crowd.pop();
      R.rate = crowd.length * 0.3 * incomeMult();
      R.acc += R.rate * dt;
      if (R.acc >= 1) { const a = Math.floor(R.acc); R.acc -= a; G.wd += a; R.earned += a; G.stats.earned += a; }
    }
    R.excite = Math.max(0, R.excite - dt);
    for (const c of crowd) {
      if (R.phase === 'end') c.x += (c.x > PX ? 1 : -1) * 70 * dt;
      else c.x = U.lerp(c.x, c.tx, 1 - Math.pow(0.02, dt));
    }
  }

  // ---- obstacles ----------------------------------------------------------
  function updateHazards(dt) {
    // censer: a swinging weight on a rope, driven kinematically
    if (R.height >= 4 && !censer) {
      censer = world.add(new Physics.Body({ x: PX, y: 0, width: 22, height: 22, isStatic: true, friction: 0.5, userData: { censer: true } }));
      censer.phase = 0;
    }
    if (censer) {
      censer.phase += dt * 1.15;
      const pivotY = towerTop() - 96;
      const len = 62, a = Math.sin(censer.phase) * 0.85;
      const nx = PX + Math.sin(a) * len, ny = pivotY + Math.cos(a) * len;
      censer.vx = (nx - censer.x) / Math.max(dt, 1e-4);
      censer.vy = (ny - censer.y) / Math.max(dt, 1e-4);
      censer.x = nx; censer.y = ny;
      censer.pivotY = pivotY;
      if (Math.random() < dt * 6) FX.spawn({ x: nx, y: ny + 8, vx: U.rand(-6, 6), vy: U.rand(-16, -4), life: 1, size: 2, color: 'rgba(207,196,176,0.5)', gravity: -6 });
    }
    // wind
    const wd = R.wind;
    if (R.height >= 6 || wd.active || wd.warn > 0) {
      if (wd.active) {
        wd.t -= dt;
        if (wd.t <= 0) { wd.active = false; wd.next = U.rand(8, 13); }
        else if (U.chance(0.3)) FX.spawn({ x: wd.dir > 0 ? FX.cam.x - W / FX.cam.zoom : FX.cam.x + W / FX.cam.zoom, y: U.rand(towerTop() - 60, PLAT_Y), vx: wd.dir * wd.str * 1.6, vy: U.rand(-16, 16), life: 1.4, size: 3, color: U.pick([PAL.rot1, PAL.dead3, PAL.moss2]), type: 'leaf', vr: 6 });
      } else if (wd.warn > 0) { wd.warn -= dt; if (wd.warn <= 0) { wd.active = true; wd.t = 1.4; Audio.play('wind'); } }
      else { wd.next -= dt; if (wd.next <= 0 && R.phase === 'play') { wd.warn = 1.3; wd.dir = U.chance(0.5) ? 1 : -1; wd.str = 16 + (R.height - 5) * 5; Audio.play('alarm'); } }
    }
    // falling stone from the canopy
    if (R.height >= 9 && R.phase === 'play') {
      R.rockT -= dt;
      if (R.rockT <= 0) {
        R.rockT = U.rand(16, 26);
        const x = PX + U.rand(-70, 70);
        rocks.push({ x, y: towerTop() - 180, vy: 0, warn: 1.1 });
        Audio.play('alarm');
      }
    }
    for (let i = rocks.length - 1; i >= 0; i--) {
      const r = rocks[i];
      if (r.warn > 0) { r.warn -= dt; continue; }
      r.vy += 900 * dt; r.y += r.vy * dt;
      if (r.y > GROUND) { rocks.splice(i, 1); FX.dust(r.x, GROUND, 10, PAL.stone2); FX.shake(4); Audio.play('thud', 1.2); continue; }
      // knock anything it passes through
      for (const b of world.bodies) {
        if (!b.userData || b.userData.platform || b.userData.censer || b.isStatic) continue;
        if (Math.abs(b.x - r.x) < b.width / 2 + 8 && Math.abs(b.y - r.y) < b.height / 2 + 8) {
          b.vx += (b.x - r.x) * 6; b.vy += 90; b.w += U.rand(-3, 3);
          FX.burst(r.x, r.y, 8, { color: [PAL.stone2, PAL.stone4], speed: 90 });
          FX.shake(5); Audio.play('thud', 1.4);
          rocks.splice(i, 1);
          break;
        }
      }
    }
    // tremor
    const q = R.quake;
    if (R.height >= 13 && R.phase === 'play') {
      if (q.active) {
        q.t -= dt;
        const off = Math.sin(q.t * 40) * 3 * Math.min(1, q.t);
        platform.vx = ((platform.baseX + off) - platform.x) / dt; platform.x = platform.baseX + off;
        FX.shake(1.5);
        if (q.t <= 0) { q.active = false; platform.x = platform.baseX; platform.vx = 0; q.next = U.rand(30, 46); }
      } else { q.next -= dt; if (q.next <= 0) { q.active = true; q.t = 1.6; Audio.play('rumble'); FX.title('TREMOR', { size: 14, color: PAL.red3, dur: 1, shake: 3 }); } }
    }
  }

  // ---- cupids -------------------------------------------------------------
  function updateCupids(dt) {
    if (R.phase === 'play') {
      R.cupidT -= dt;
      if (R.cupidT <= 0 && cupids.length < 2) {
        R.cupidT = U.rand(16, 26);
        const dir = U.chance(0.5) ? 1 : -1;
        const boonDef = U.pick(CUPID_BOONS);
        cupids.push({
          x: PX - dir * 260, y: towerTop() - U.rand(30, 110), dir, ph: U.rand(0, TAU),
          boon: boonDef, life: 13, caught: false, pop: 0,
        });
        Audio.play('squeak');
      }
    }
    for (let i = cupids.length - 1; i >= 0; i--) {
      const c = cupids[i];
      if (c.caught) { c.pop += dt; if (c.pop > 0.5) cupids.splice(i, 1); continue; }
      c.life -= dt; c.ph += dt * 2.6;
      c.x += c.dir * 46 * dt;
      c.y += Math.sin(c.ph) * 22 * dt;
      if (Math.random() < dt * 5) FX.spawn({ x: c.x, y: c.y + 8, vx: U.rand(-8, 8), vy: U.rand(4, 16), life: 0.7, size: 2, color: PAL.div4, gravity: 10 });
      if (c.life <= 0 || Math.abs(c.x - PX) > 340) cupids.splice(i, 1);
    }
    for (const k in R.boons) { R.boons[k] -= dt; if (R.boons[k] <= 0) delete R.boons[k]; }
  }
  function tryCatch(x, y) {
    for (const c of cupids) {
      if (c.caught) continue;
      if (Math.hypot(c.x - x, c.y - y) < 26) {
        c.caught = true;
        R.boons[c.boon.key] = c.boon.dur;
        if (c.boon.key === 'shield') { R.lives++; R.maxLives++; }
        Audio.play('bless'); Audio.play('chime');
        FX.ring(c.x, c.y, 34, U.rgba(PAL.div4, 0.8));
        FX.burst(c.x, c.y, 16, { color: [PAL.div4, PAL.div5, PAL.cream], speed: 110, life: 0.7 });
        FX.title(c.boon.name.toUpperCase(), { size: 13, color: PAL.div4, dur: 1.2 });
        FX.hearts(c.x, c.y, 4);
        UI.refreshRunHUD();
        return true;
      }
    }
    return false;
  }

  function update(dt, realDt) {
    // Idle only parks the camera while the stack is actually on screen;
    // other scenes drive the camera themselves.
    if (!R.active) { if (G.mode === 'rite') { FX.cam.tzoom = 1; FX.cam.tx = PX; FX.cam.ty = 180; } return; }
    R.t += dt;
    if (R.phase === 'intro') { R.introT += realDt; if (R.introT > 1.9) { R.phase = 'play'; R.canDrop = true; FX.letterbox(false); UI.onRunPlay(); } }
    if (R.phase === 'play' && !G.paused) {
      const sp = 1.45 * (G.fruits.steadyclaw ? 0.75 : 1) * (boon('slow') ? 0.55 : 1);
      R.craneT += dt * sp;
      const amp = Math.min(150, 78 + R.height * 4);
      R.lastCraneX = R.craneX; R.craneX = PX + Math.sin(R.craneT) * amp;
      if (R.dropCd > 0) R.dropCd -= dt;
    }
    if (!G.paused && (R.phase === 'play' || R.phase === 'end' || R.phase === 'cash')) {
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
        if (!ud || ud.platform || ud.censer) continue;
        if (b.y > GROUND + 80) {
          world.remove(b);
          if (b === R.falling) landed(b);
          R.lost++; R.streak = 0; R.lives--; G.stats.lost++;
          FX.shake(4); Audio.play('thud', 1.5); FX.flash(U.rgba(PAL.red2, 0.9), 0.22);
          UI.refreshRunHUD();
          if (R.lives <= 0) endRun('FALLEN');
          continue;
        }
        if (!ud.settled && b !== R.falling && b.restTime > 0.45) onSettled(b);
        if (ud.settled && b.speed > 35) moving++;
      }
      R.height = computeHeight();
      if (R.peak >= 4 && R.height < R.peak * 0.5 && moving >= 2) { R.lowT += dt; if (R.lowT > 1.2) endRun('TOPPLED'); } else R.lowT = Math.max(0, R.lowT - dt);
      if (R.dangerCd > 0) R.dangerCd -= realDt;
      if (moving >= 1 && R.height >= 3 && R.dangerCd <= 0) {
        R.dangerCd = 4; R.slowT = 0.9;
        FX.setSlowmo(0.35); FX.vignette(0.55); Audio.play('slowmo');
      }
      if (R.slowT > 0) { R.slowT -= realDt; if (R.slowT <= 0) { FX.setSlowmo(boon('slow') ? 0.7 : 1); FX.vignette(0); } }
      updateHazards(dt);
      updateCupids(dt);
      checkGoals();
    }
    if (R.phase === 'end') { R.endT += realDt; if (R.endT > 2.8) finish(false); }
    if (R.phase === 'cash') { R.cashT += realDt; if (R.cashT > 2.1) finish(true); }
    updateCrowd(dt);
    const cy = craneY() - 26;
    const span = GROUND + 22 - (cy - 40);
    const zoom = U.clamp(H / Math.max(360, span), 0.22, 1);
    FX.cam.tzoom = R.phase === 'intro' ? 1.12 : R.phase === 'end' ? zoom * 0.92 : zoom;
    FX.cam.tx = PX;
    FX.cam.ty = GROUND + 22 - (H / 2) / FX.cam.tzoom;
  }

  function endRun(why) {
    if (R.phase !== 'play') return;
    R.phase = 'end'; R.endT = 0;
    FX.freeze(0.3); FX.hitstop(0.3);
    FX.setSlowmo(0.3); FX.vignette(0.85); FX.letterbox(true); FX.cine.tDesat = 1;
    FX.flash(U.rgba(PAL.red2, 0.9), 0.55); FX.shake(12); FX.punch(0.13);
    FX.title(why, { size: 24, color: PAL.red3, dur: 2.6, shake: 3, delay: 0.25 });
    Audio.play('collapse');
    G.stats.collapses++;
    UI.hideRunHUD();
  }
  function cashOut() {
    if (!R.active || R.phase !== 'play') return;
    R.phase = 'cash'; R.cashT = 0;
    const bonus = Math.round(R.placed * (R.peak / 8) + crowd.length * 3 + R.goalPay * 0.5);
    R.bonus = bonus; G.wd += bonus; R.earned += bonus; G.stats.earned += bonus;
    FX.letterbox(true);
    FX.title('+' + U.fmt(bonus), { size: 24, color: PAL.gold4, dur: 1.9 });
    FX.confettiBurst(W / 2, H * 0.35, 110);
    Audio.play('cash'); Audio.play('cheer', 1);
    UI.hideRunHUD();
  }
  function finish(cashed) {
    const s = { cashed, peak: R.peak, settled: R.settled, earned: R.earned, bonus: R.bonus || 0, crowd: crowd.length, lost: R.lost, used: R.used, goals: R.goals.filter((g) => g.done).length };
    G.runs = (G.runs || 0) + 1;
    R.active = false; R.phase = 'idle';
    FX.setSlowmo(1, true); FX.vignette(0); FX.letterbox(false); FX.cine.tDesat = 0;
    world.clear(); crowd.length = 0; cupids.length = 0; rocks.length = 0;
    Audio.setMode('pen');
    UI.showSummary(s); UI.onRunEnd();
    Main.save();
  }

  function click(x, y) {
    if (!R.active || R.phase !== 'play') return;
    // catching a cupid takes priority over dropping
    const cam = FX.cam;
    const wx = cam.x + (x - W / 2) / cam.zoom, wy = cam.y + (y - H / 2) / cam.zoom;
    if (tryCatch(wx, wy)) return;
    drop();
  }
  function key(k) {
    if (k === ' ') { drop(); return true; }
    if (k === 'r' || k === 'R') { R.rot = !R.rot; Audio.play('click'); return true; }
    const n = parseInt(k);
    if (n >= 1 && n <= 9) {
      const t = OFFER_ORDER.filter((c) => available(c) > 0)[n - 1];
      if (t) { G.selOffer = t; UI.refreshTray(); Audio.play('click'); }
      return true;
    }
    return false;
  }

  // ---- scene --------------------------------------------------------------
  function render(g) {
    const cam = FX.cam;
    g.fillStyle = '#0d0a16'; g.fillRect(0, 0, W, H);
    g.save();
    g.translate(W / 2 + cam.shakeX, H / 2 + cam.shakeY);
    g.scale(cam.zoom, cam.zoom);
    g.translate(-cam.x, -cam.y);
    const vw = W / cam.zoom, vh = H / cam.zoom;
    const vx0 = cam.x - vw / 2, vy0 = cam.y - vh / 2;
    // night sky over the grove
    for (let i = 0; i < 8; i++) {
      g.fillStyle = U.mix('#0f0b1c', '#2f2246', i / 7);
      g.fillRect(vx0, vy0 + (vh * i) / 8, vw, vh / 8 + 2);
    }
    g.fillStyle = PAL.cream;
    for (let i = 0; i < 70; i++) {
      const sx = (i * 149) % 1400 - 400, sy = (i * 83) % 900 - 500;
      g.globalAlpha = 0.3 + 0.5 * Math.sin(G.time * 1.6 + i);
      g.fillRect(sx, sy, 2, 2);
    }
    g.globalAlpha = 1;
    // a big low moon
    g.fillStyle = 'rgba(194,244,255,0.12)'; Art.ell(g, PX - 210, -120, 70, 70);
    g.fillStyle = '#c2f4ff'; Art.ell(g, PX - 210, -120, 40, 40);
    g.fillStyle = '#9fd8e6'; Art.ell(g, PX - 196, -132, 12, 12); Art.ell(g, PX - 222, -104, 8, 8);
    // silhouetted forest ring
    for (let i = 0; i < 10; i++) {
      const img = Props.get('tree', `${['oak', 'gnarl', 'pine'][i % 3]}|${i % 3}|0.34`);
      const tx = PX - 420 + i * 96, sc = 1.5 + (i % 3) * 0.3;
      g.globalAlpha = 0.9;
      g.drawImage(img, tx, GROUND - img.height * sc + 8, img.width * sc, img.height * sc);
    }
    g.globalAlpha = 1;
    // ground
    g.fillStyle = '#1b1626'; g.fillRect(vx0, GROUND, vw, vh);
    g.fillStyle = '#241d2e'; Art.ell(g, PX, GROUND + 10, 250, 28);
    for (let i = -8; i <= 8; i++) {
      const cx2 = PX + i * 30;
      g.fillStyle = i % 2 === 0 ? PAL.stone2 : PAL.stone1;
      g.fillRect(cx2 - 15, GROUND - 6, 30, 9);
      g.fillStyle = i % 2 === 0 ? PAL.stone3 : PAL.stone0;
      g.fillRect(cx2 - 15, GROUND + 1, 30, 3);
    }
    // braziers flanking the plinth
    for (const s of [-1, 1]) {
      const bx = PX + s * 150;
      const img = Props.get('brazier');
      g.drawImage(img, bx - img.width / 2, GROUND - img.height + 4);
      const fl = 0.5 + 0.5 * Math.sin(G.time * 6 + s);
      const gr = g.createRadialGradient(bx, GROUND - 30, 3, bx, GROUND - 30, 60 + fl * 14);
      gr.addColorStop(0, `rgba(224,112,90,${0.3 + fl * 0.15})`); gr.addColorStop(1, 'rgba(224,112,90,0)');
      g.fillStyle = gr; g.fillRect(bx - 74, GROUND - 104, 148, 148);
    }
    // height rungs
    if (R.active) {
      for (let h = 5; h <= Math.max(10, R.peak + 10); h += 5) {
        const y = PLAT_Y - h * CUBE_SIZE;
        g.strokeStyle = h <= R.height ? 'rgba(132,187,89,0.4)' : 'rgba(253,243,220,0.14)';
        g.setLineDash([4, 7]); g.lineWidth = 1;
        g.beginPath(); g.moveTo(PX - 150, y); g.lineTo(PX + 150, y); g.stroke(); g.setLineDash([]);
        Font.draw(g, String(h), PX - 156, y - 3, { scale: 1, align: 'right', color: h === G.record && G.record > 0 ? PAL.gold4 : 'rgba(253,243,220,0.45)' });
      }
    }
    // plinth
    const pw = platWidth();
    const ped = Props.get('plinth', Math.round(pw));
    g.drawImage(ped, PX - pw / 2, PLAT_Y + PLAT_H - 2, pw, GROUND - PLAT_Y - PLAT_H + 2);
    if (platform) {
      g.save(); g.translate(platform.x, platform.y);
      g.fillStyle = PAL.stone3; g.fillRect(-pw / 2, -PLAT_H / 2, pw, PLAT_H);
      g.fillStyle = PAL.stone4; g.fillRect(-pw / 2, -PLAT_H / 2, pw, 3);
      g.fillStyle = PAL.stone0; g.fillRect(-pw / 2, PLAT_H / 2 - 3, pw, 3);
      g.fillStyle = PAL.div3; for (let x = -pw / 2 + 4; x < pw / 2 - 4; x += 16) g.fillRect(x, -PLAT_H / 2 + 5, 8, 3);
      g.restore();
    }
    // guide
    if (R.active && R.phase === 'play' && G.fruits.seersight && !R.falling && G.selOffer) {
      const def = OFFERINGS[G.selOffer];
      let hw = (R.rot ? def.h : def.w) * CUBE_SIZE * R.sizeMult / 2;
      let hy = PLAT_Y;
      for (const b of world.bodies) {
        if (!b.userData || b.userData.platform || b.userData.censer) continue;
        const bb = b.aabb();
        if (bb.maxX > R.craneX - hw && bb.minX < R.craneX + hw) hy = Math.min(hy, bb.minY);
      }
      g.strokeStyle = 'rgba(121,220,237,0.5)'; g.setLineDash([3, 5]); g.lineWidth = 1;
      g.beginPath();
      g.moveTo(R.craneX - hw, craneY() + 22); g.lineTo(R.craneX - hw, hy);
      g.moveTo(R.craneX + hw, craneY() + 22); g.lineTo(R.craneX + hw, hy);
      g.stroke(); g.setLineDash([]);
      g.fillStyle = 'rgba(121,220,237,0.35)'; g.fillRect(R.craneX - hw, hy - 2, hw * 2, 2);
    }
    // offerings
    for (const b of world.bodies) {
      const ud = b.userData; if (!ud || ud.platform) continue;
      if (ud.censer) continue;
      const def = OFFERINGS[ud.type];
      const sq = ud.sq || 0;
      g.save(); g.translate(b.x, b.y); g.rotate(b.angle); g.scale(1 + sq, 1 - sq);
      Sprites.drawCube(g, def, b.width, b.height, {
        blessed: ud.blessed,
        outline: b === R.falling ? PAL.cream : (ud.blessed ? PAL.div4 : null),
      });
      g.restore();
    }
    // censer on its rope
    if (censer) {
      g.strokeStyle = PAL.bark2; g.lineWidth = 2;
      g.beginPath(); g.moveTo(PX, censer.pivotY); g.lineTo(censer.x, censer.y); g.stroke();
      g.save(); g.translate(censer.x, censer.y);
      g.fillStyle = PAL.stone1; Art.ell(g, 0, 0, 11, 10);
      g.fillStyle = PAL.stone3; Art.ell(g, -2, -3, 6, 5);
      g.fillStyle = PAL.gold2; g.fillRect(-11, -2, 22, 3);
      g.fillStyle = PAL.red2; Art.ell(g, 0, 3, 4, 3);
      g.restore();
    }
    // falling stones and their warning
    for (const r of rocks) {
      if (r.warn > 0) {
        g.globalAlpha = 0.4 + 0.4 * Math.sin(G.time * 22);
        g.fillStyle = PAL.red3;
        g.fillRect(r.x - 9, towerTop() - 150, 18, 3);
        for (let i = 0; i < 3; i++) g.fillRect(r.x - 3, towerTop() - 144 + i * 6, 6, 3);
        g.globalAlpha = 1;
        continue;
      }
      g.fillStyle = PAL.stone1; Art.ell(g, r.x, r.y, 10, 9);
      g.fillStyle = PAL.stone3; Art.ell(g, r.x - 3, r.y - 3, 5, 4);
      g.fillStyle = 'rgba(253,243,220,0.2)'; g.fillRect(r.x - 2, r.y - 26, 4, 20);
    }
    if (R.active && (R.phase === 'play' || R.phase === 'intro')) drawCrane(g);
    // cupids
    for (const c of cupids) {
      if (c.caught) {
        const p = c.pop / 0.5;
        g.globalAlpha = 1 - p;
        Icons.blit(g, c.boon.icon, c.x - 8, c.y - 20 - p * 22, 1 + p);
        g.globalAlpha = 1;
        continue;
      }
      const gr = g.createRadialGradient(c.x, c.y, 2, c.x, c.y, 30);
      gr.addColorStop(0, 'rgba(185,142,240,0.32)'); gr.addColorStop(1, 'rgba(185,142,240,0)');
      g.fillStyle = gr; g.fillRect(c.x - 30, c.y - 30, 60, 60);
      const img = Sprites.cupid(Math.floor(G.time * 10), PAL.div4);
      const fl = c.dir < 0 ? Art.flip(img) : img;
      g.drawImage(fl, Math.round(c.x - img.width / 2), Math.round(c.y - img.height / 2));
      Icons.blit(g, c.boon.icon, c.x - 6, c.y - 26, 0.75);
    }
    // the congregation
    for (const c of crowd) {
      const pose = R.phase === 'cash' ? 'happy' : R.excite > 0.6 ? 'happy' : 'pray';
      const fr = Math.floor(G.time * (pose === 'happy' ? 9 : 3) + c.ph);
      Sprites.blit(g, c.x, c.y, pose, fr, c.pelt, c.x > PX ? -1 : 1, 'adult', 1.3);
    }
    // wind streaks
    if (R.wind.warn > 0 || R.wind.active) {
      const dir = R.wind.dir;
      g.fillStyle = R.wind.active ? 'rgba(253,243,220,0.7)' : `rgba(216,165,47,${0.4 + 0.4 * Math.sin(G.time * 20)})`;
      for (let i = 0; i < 5; i++) {
        const ax = PX - dir * 200 + dir * ((G.time * 210 + i * 62) % 320);
        const ay = towerTop() - 34 + i * 17;
        g.fillRect(ax, ay, dir * 15, 2);
        g.fillRect(ax + dir * 13, ay - 2, dir * 3, 6);
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
  function drawCrane(g) {
    const cy = craneY(), cam = FX.cam, vw = W / cam.zoom;
    g.fillStyle = PAL.bark0; g.fillRect(cam.x - vw, cy - 30, vw * 2, 4);
    g.fillStyle = PAL.bark0; g.fillRect(cam.x - vw, cy - 20, vw * 2, 4);
    g.fillStyle = PAL.bark1;
    for (let x = -3000; x < 3000; x += 22) { g.fillRect(x, cy - 27, 3, 8); g.fillRect(x + 11, cy - 27, 3, 8); }
    g.fillStyle = PAL.bark3; g.fillRect(cam.x - vw, cy - 30, vw * 2, 1);
    g.fillStyle = PAL.stone2; g.fillRect(R.craneX - 13, cy - 23, 26, 13);
    g.fillStyle = PAL.stone4; g.fillRect(R.craneX - 13, cy - 23, 26, 2);
    g.fillStyle = PAL.div3; g.fillRect(R.craneX - 8, cy - 18, 16, 3);
    g.fillStyle = PAL.ink; g.fillRect(R.craneX - 1, cy - 10, 2, 17);
    g.fillStyle = PAL.stone3; g.fillRect(R.craneX - 11, cy + 5, 22, 4);
    g.fillStyle = PAL.stone2; g.fillRect(R.craneX - 11, cy + 5, 4, 9); g.fillRect(R.craneX + 7, cy + 5, 4, 9);
    if (!R.falling && R.canDrop && G.selOffer && R.phase === 'play') {
      const def = OFFERINGS[G.selOffer];
      let w = def.w * CUBE_SIZE * R.sizeMult, h = def.h * CUBE_SIZE * R.sizeMult;
      if (R.rot) { const t = w; w = h; h = t; }
      const sway = (R.craneX - R.lastCraneX) * 0.02;
      g.save(); g.translate(R.craneX, cy + 20 + h / 2 - 12); g.rotate(-sway);
      Sprites.drawCube(g, def, w, h, { blessed: (G.blessed[G.selOffer] || 0) > 0, outline: 'rgba(253,243,220,0.6)' });
      g.restore();
    }
  }
  function overlay(g) {
    const rx = W - 26, y0 = 52, y1 = H - 40;
    g.fillStyle = PAL.ink; g.fillRect(rx - 7, y0 - 8, 16, y1 - y0 + 16);
    g.fillStyle = PAL.bark1; g.fillRect(rx - 6, y0 - 7, 14, y1 - y0 + 14);
    g.fillStyle = PAL.bark0; g.fillRect(rx - 3, y0, 7, y1 - y0);
    const maxH = Math.max(12, Math.ceil((R.peak + 4) / 4) * 4);
    g.fillStyle = PAL.bark3;
    for (let t = 0; t <= maxH; t += 4) g.fillRect(rx - 6, Math.round(y1 - (t / maxH) * (y1 - y0)), 4, 1);
    const hy = y1 - (R.height / maxH) * (y1 - y0);
    const py = y1 - (R.peak / maxH) * (y1 - y0);
    g.fillStyle = PAL.moss3; g.fillRect(rx - 3, hy, 7, y1 - hy);
    g.fillStyle = PAL.moss5; g.fillRect(rx - 3, hy, 7, 2);
    g.fillStyle = PAL.cream; g.fillRect(rx - 6, py, 13, 1);
    if (G.record > 0) {
      const ry = y1 - (Math.min(maxH, G.record) / maxH) * (y1 - y0);
      g.fillStyle = PAL.gold4; g.fillRect(rx - 7, ry, 15, 2);
    }
    Font.draw(g, R.height.toFixed(1), rx + 1, y1 + 12, { scale: 1, align: 'center', color: PAL.cream, shadow: '#120c18' });
    if (R.wind.warn > 0) {
      Font.draw(g, 'WIND', W / 2, 24, { scale: 2, align: 'center', color: Math.sin(G.time * 20) > 0 ? PAL.gold4 : PAL.red3, shadow: '#120c18' });
    }
  }

  return {
    init(g) { G = g; resetWorld(); },
    R, world, update, render, click, key, drop, cashOut, newRun, total, available, autoSelect,
    get active() { return R.active; },
    get crowdSize() { return crowd.length; },
    get boons() { return R.boons; },
  };
})();
