// ---- The Big Top: physics stacking runs ----------------------------------
const Tower = (() => {
  let G = null;
  const W = 640, H = 360;
  const PX = 320, PLAT_Y = 288, GROUND = 332, PLAT_H = 16;
  const APEX = { x: PX, y: -520 };
  const world = new Physics.World();
  let platform = null;
  const R = {
    active: false, phase: 'idle', perks: [], wind: { active: false, warn: 0, dir: 1, str: 0, t: 0, next: 8 },
    quake: { t: 0, next: 30, active: false }, height: 0, peak: 0, power: 1, sizeMult: 1,
    earned: 0, lives: 0, maxLives: 0, settled: 0, incomeRate: 0, craneX: PX, lastCraneX: PX, craneT: 0,
  };
  const crowd = [];
  let physAcc = 0;
  const ropes = [];
  for (let i = 0; i < 4; i++) ropes.push({ y: -60 - i * 90 });

  function platWidth() { return G.skills.base ? 138 : 102; }
  function crowdCap() { return 30 + 8 * (G.fac.bleachers || 0) * 1.5; }

  function resetWorld() {
    world.clear();
    platform = world.add(new Physics.Body({ x: PX, y: PLAT_Y + PLAT_H / 2, width: platWidth(), height: PLAT_H, isStatic: true, friction: 0.92, userData: { platform: true } }));
    platform.baseX = PX;
    world.gravity = 760;
    world.iterations = 40;
    world.maxFall = 200;
    world.onImpact = onImpact;
    world.forceFn = applyForces;
  }

  function newRun() {
    resetWorld();
    Object.assign(R, {
      active: true, phase: 'intro', t: 0, introT: 0,
      falling: null, canDrop: false, dropCd: 0,
      settled: 0, height: 0, peak: 0, lives: 3, maxLives: 3, lost: 0,
      earned: 0, placed: 0, perks: [], perkPending: false, nextPerk: 5, nextPower: 10,
      power: 1, gripBoost: 1, sizeMult: 1, goldLeft: 0, encoreUsed: false,
      crowdN: 0, crowdTarget: 0, excite: 0, incomeAcc: 0, incomeRate: 0,
      wind: { active: false, warn: 0, t: 0, dir: 1, str: 0, next: U.rand(7, 11) },
      quake: { t: 0, next: U.rand(28, 44), active: false },
      lowT: 0, dangerCd: 0, slowT: 0, collapseT: 0, cashT: 0, rot: false,
      craneT: U.rand(0, 6), craneX: PX, lastCraneX: PX, number: (G.runs || 0) + 1, used: 0, bonus: 0,
    });
    crowd.length = 0;
    FX.clear(); FX.letterbox(true);
    FX.title('SHOW ' + R.number, { style: 'slide', dur: 2, size: 22, color: PAL.goldL, sub: U.pick(TIPS) });
    Audio.play('drum'); Audio.play('whoosh'); Audio.setMode('tower');
    FX.cam.tzoom = 1.2; FX.cam.tx = PX; FX.cam.ty = PLAT_Y - 30;
    autoSelect();
    UI.onRunStart();
  }

  function applyForces(b, dt) {
    const ud = b.userData; if (!ud || ud.platform) return;
    if (R.wind.active) b.vx += (R.wind.str * R.wind.dir) / Math.max(0.6, b.density) * dt;
    if (R.perks.includes('magnet') && b === R.falling) { b.vx += (PX - b.x) * 4 * dt; b.vx *= Math.max(0, 1 - 1.5 * dt); }
  }
  function onImpact(a, b, impulse, c) {
    const s = impulse / 800;
    if (s > 0.22) {
      const x = c ? c.x : (a.x + b.x) / 2, y = c ? c.y : (a.y + b.y) / 2;
      FX.dust(x, y, Math.min(12, Math.round(s * 5)), PAL.sand);
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
    FX.burst(b.x, b.y, 6, { color: [PAL.cream, CUBES[b.userData.type].color], speed: 60, gravity: 190, life: 0.35, size: 2 });
  }

  function available(t) { return (G.cubes[t] || 0) + (G.premium[t] || 0); }
  function total() { return CUBE_ORDER.reduce((s, k) => s + available(k), 0); }
  function autoSelect() {
    if (G.selCube && available(G.selCube) > 0) return;
    G.selCube = CUBE_ORDER.find((k) => available(k) > 0) || null;
    UI.refreshCubeBar();
  }

  function makeCube(type, premium, x, y) {
    const def = CUBES[type];
    const sz = CUBE_SIZE * R.sizeMult;
    let w = def.w * sz, h = def.h * sz;
    if (R.rot) { const t = w; w = h; h = t; }
    let friction = def.friction * (G.skills.gyro ? 1.15 : 1) * R.gripBoost;
    if (premium) friction *= 1.1;
    let adhesion = def.adhesion * (G.farm.mud ? 1.3 : 1) + (R.perks.includes('glue') ? 520 : 0);
    return new Physics.Body({
      x, y, width: w, height: h, density: def.density, friction, restitution: def.restitution, adhesion,
      angularDamping: G.skills.gyro ? 1.2 : 0.15, linearDamping: 0.02,
      userData: { type, premium, placed: true, settled: false, sq: 0 },
    });
  }
  function drop() {
    if (!R.active || R.phase !== 'play' || R.perkPending || G.paused) return;
    if (!R.canDrop || R.falling) return;
    const type = G.selCube;
    if (!type || available(type) <= 0) { autoSelect(); return; }
    let premium = false;
    if ((G.premium[type] || 0) > 0) { G.premium[type]--; premium = true; } else G.cubes[type]--;
    R.used++;
    const b = makeCube(type, premium, R.craneX, craneY() + 20);
    b.vx = (R.craneX - R.lastCraneX) * 60 * 0.12; b.vy = 30;
    if (!G.skills.claw) b.angle = U.rand(-0.05, 0.05);
    if (R.perks.includes('feather')) b.gravityScale = 0.6;
    world.add(b);
    R.falling = b; R.canDrop = false;
    Audio.play('whoosh');
    for (let i = 0; i < 5; i++) FX.spawn({ x: b.x + U.rand(-b.width / 2, b.width / 2), y: b.y - b.height / 2, vx: 0, vy: -120, life: 0.28, size: 1.5, color: 'rgba(255,248,230,0.6)' });
    autoSelect(); UI.refreshCubeBar(); UI.refreshHUD();
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
    let m = 1 + 0.12 * (G.fac.bleachers || 0);
    if (G.skills.cart) m *= 1.3;
    if (R.perks.includes('hype')) m *= 1.7;
    return m * R.power;
  }
  function pay(b) {
    const ud = b.userData, def = CUBES[ud.type];
    let v = def.value;
    if (R.goldLeft > 0 && ud.type !== 'gold') { v = Math.max(v, CUBES.gold.value); R.goldLeft--; }
    if (ud.premium) v *= 2;
    if ((G.fac.barrow || 0) >= 3) v *= 1.1;
    v *= 1 + 0.15 * R.height;
    if (R.perks.includes('tax')) v *= 1.6;
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
    Audio.play('place'); Audio.play('coin');
    b.userData.sq = 0.18;
    if (Math.abs(b.x - PX) < 5 && R.height > 1) {
      FX.float(b.x, b.y - b.height / 2 - 20, 'PERFECT', { color: PAL.tealL, size: 8, world: true });
      FX.sparkle(b.x, b.y, 9, PAL.tealL); earn(Math.round(p * 0.5));
    }
    if (R.height > R.peak) R.peak = R.height;
    if (Math.floor(R.peak) > G.record) {
      const was = G.record; G.record = Math.floor(R.peak);
      if (was >= 3) { FX.title('RECORD ' + G.record, { size: 20, color: PAL.goldL, dur: 1.5 }); FX.confettiBurst(W / 2, H * 0.3, 70); Audio.play('record'); FX.flash(PAL.cream, 0.32); }
    }
    if (R.settled >= R.nextPower) {
      R.nextPower += 10; R.gripBoost *= 1.08;
      for (const bb of world.bodies) if (bb.userData && bb.userData.placed) bb.friction *= 1.08;
      FX.title('x' + R.power.toFixed(2), { size: 18, color: PAL.grass3, dur: 1.2, sub: 'grip up' });
      Audio.play('levelup'); FX.punch(0.1);
    }
    if (R.perks.includes('bedrock')) bedrock();
    if (R.settled >= R.nextPerk) { R.nextPerk += 5; R.perkPending = true; setTimeout(offerPerks, 380); }
    UI.refreshRunHUD();
  }
  function bedrock() {
    const done = world.bodies.filter((b) => b.userData && b.userData.bedrock).length;
    const settled = world.bodies.filter((b) => b.userData && b.userData.settled && !b.userData.bedrock && !b.isStatic).sort((a, b) => b.y - a.y);
    for (let i = 0; i < Math.min(3 - done, settled.length); i++) {
      const b = settled[i];
      if (b.y > PLAT_Y - CUBE_SIZE * 3.2 && b.restTime > 0.3) {
        b.isStatic = true; b.setMass(0); b.vx = b.vy = b.w = 0; b.userData.bedrock = true;
        FX.sparkle(b.x, b.y, 8, PAL.stone2);
      }
    }
  }

  function offerPerks() {
    if (!R.active) return;
    const n = G.skills.eye ? 4 : 3;
    const pool = PERKS.filter((p) => !R.perks.includes(p.key));
    const picks = [];
    while (picks.length < n && pool.length) {
      const wts = pool.map((p) => (p.rare ? 0.55 : 1));
      let r = Math.random() * wts.reduce((a, b) => a + b, 0), idx = 0;
      for (; idx < pool.length; idx++) { r -= wts[idx]; if (r <= 0) break; }
      picks.push(pool.splice(Math.min(idx, pool.length - 1), 1)[0]);
    }
    G.paused = true;
    FX.punch(0.12); FX.vignette(0.68); Audio.play('perk');
    UI.showPerks(picks, (p) => { applyPerk(p); G.paused = false; R.perkPending = false; FX.vignette(0); });
  }
  function applyPerk(p) {
    R.perks.push(p.key);
    switch (p.key) {
      case 'glue': for (const b of world.bodies) if (b.userData && b.userData.placed) b.adhesion += 520; break;
      case 'net': R.lives += 2; R.maxLives += 2; break;
      case 'goldrush': R.goldLeft = 3; break;
      case 'big': R.sizeMult *= 1.15; break;
      case 'bedrock': bedrock(); break;
      case 'calm': R.wind.active = false; R.wind.warn = 0; R.wind.next = 1e9; R.quake.next = 1e9; break;
    }
    FX.title(p.name.toUpperCase(), { size: 16, color: '#c9a0ff', dur: 1.4 });
    FX.confettiBurst(W / 2, H * 0.4, 26);
    UI.refreshRunHUD();
  }

  // ---- crowd --------------------------------------------------------------
  function seat(i) {
    const side = i % 2 ? 1 : -1, k = Math.floor(i / 2);
    const col = k % 8, row = Math.floor(k / 8) % 5, extra = Math.floor(k / 40);
    const jx = ((i * 37) % 11) - 5, jy = ((i * 53) % 5) - 2;
    return {
      x: PX + side * (128 + col * 30 + row * 7 + jx + extra * 4),
      y: GROUND - 6 - col * 10 - row * 3.5 + jy,
    };
  }
  function addSpectator(instant) {
    const i = crowd.length, s = seat(i);
    crowd.push({ x: instant ? s.x : s.x + (s.x > PX ? 180 : -180), tx: s.x, y: s.y, v: i % Sprites.PEOPLE, ph: U.rand(0, TAU), pose: 'idle' });
  }
  function updateCrowd(dt) {
    if (R.phase === 'play' || R.phase === 'intro') {
      const voice = G.skills.voice ? 1.4 : 1;
      R.crowdTarget = Math.min(crowdCap(), Math.floor(4 + Math.pow(R.height, 1.65) * 1.5 * Pen.appeal() * voice));
      R.crowdN = Math.min(R.crowdTarget, R.crowdN + (5 + R.height * 1.6) * voice * dt);
      while (crowd.length < Math.floor(R.crowdN)) addSpectator(false);
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

  function updateHazards(dt) {
    const wd = R.wind;
    if (R.height >= 6 || wd.active || wd.warn > 0) {
      if (wd.active) {
        wd.t -= dt;
        if (wd.t <= 0) { wd.active = false; wd.next = U.rand(7, 12); }
        else if (U.chance(0.35)) FX.spawn({ x: wd.dir > 0 ? FX.cam.x - W / FX.cam.zoom : FX.cam.x + W / FX.cam.zoom, y: U.rand(towerTop() - 60, PLAT_Y), vx: wd.dir * wd.str * 1.6, vy: U.rand(-16, 16), life: 1.4, size: 3, color: U.pick([PAL.sand, PAL.parch0, PAL.goldL]), type: 'leaf', vr: 6 });
      } else if (wd.warn > 0) { wd.warn -= dt; if (wd.warn <= 0) { wd.active = true; wd.t = 1.4; Audio.play('wind'); } }
      else { wd.next -= dt; if (wd.next <= 0 && R.phase === 'play') { wd.warn = 1.3; wd.dir = U.chance(0.5) ? 1 : -1; wd.str = 16 + (R.height - 5) * 5; Audio.play('alarm'); } }
    }
    const q = R.quake;
    if (R.height >= 12 && R.phase === 'play') {
      if (q.active) {
        q.t -= dt;
        const off = Math.sin(q.t * 40) * 3 * Math.min(1, q.t);
        platform.vx = ((platform.baseX + off) - platform.x) / dt; platform.x = platform.baseX + off;
        FX.shake(1.5);
        if (q.t <= 0) { q.active = false; platform.x = platform.baseX; platform.vx = 0; q.next = U.rand(28, 44); }
      } else { q.next -= dt; if (q.next <= 0) { q.active = true; q.t = 1.6; FX.title('DRUM ROLL', { size: 15, color: PAL.redL, dur: 1.1, shake: 3 }); Audio.play('drum'); } }
    }
  }

  function update(dt, realDt) {
    if (!R.active) { FX.cam.tzoom = 1; FX.cam.tx = PX; FX.cam.ty = 180; return; }
    R.t += dt;
    if (R.phase === 'intro') { R.introT += realDt; if (R.introT > 2) { R.phase = 'play'; R.canDrop = true; FX.letterbox(false); UI.onRunPlay(); } }
    if (R.phase === 'play' && !G.paused) {
      const sp = 1.45 * (G.skills.claw ? 0.75 : 1) * (R.perks.includes('slow') ? 0.6 : 1);
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
        if (!ud || ud.platform) continue;
        if (b.y > GROUND + 80) {
          world.remove(b);
          if (b === R.falling) landed(b);
          R.lost++; R.lives--; G.stats.lost++;
          FX.shake(4); Audio.play('thud', 1.5); FX.flash(PAL.red, 0.22);
          UI.refreshRunHUD();
          if (R.lives <= 0) { if (R.perks.includes('encore') && !R.encoreUsed) encore(); else collapse('CUBES LOST'); }
          continue;
        }
        if (!ud.settled && b !== R.falling && b.restTime > 0.45) onSettled(b);
        if (ud.settled && b.speed > 35) moving++;
      }
      R.height = computeHeight();
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
    const span = GROUND + 22 - (cy - 40);   // headroom so the crane never leaves the frame
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
        FX.burst(b.x, b.y, 10, { color: ['#c9a0ff', PAL.cream], speed: 110 });
        world.remove(b);
      }
    }
    R.falling = null; R.canDrop = true;
    FX.title('ENCORE', { size: 24, color: '#c9a0ff', dur: 1.6 });
    FX.flash('#c9a0ff', 0.5); Audio.play('perk'); FX.hitstop(0.22);
    UI.refreshRunHUD();
  }
  function collapse(reason) {
    if (R.phase !== 'play') return;
    R.phase = 'collapse'; R.collapseT = 0;
    FX.freeze(0.35); FX.hitstop(0.35);
    FX.setSlowmo(0.3); FX.vignette(0.88); FX.letterbox(true); FX.cine.tDesat = 1;
    FX.flash(PAL.red, 0.6); FX.shake(13); FX.punch(0.14);
    FX.title('COLLAPSE', { size: 30, color: PAL.redL, dur: 2.8, shake: 3, delay: 0.3, sub: reason });
    Audio.play('collapse');
    setTimeout(() => Audio.play('cheer', 0.4), 280);
    G.stats.collapses++;
    UI.hideRunHUD();
  }
  function cashOut() {
    if (!R.active || R.phase !== 'play' || R.perkPending) return;
    R.phase = 'cash'; R.cashT = 0;
    const bonus = Math.round(R.placed * (R.peak / 8) * (G.skills.legend ? 2 : 1) + crowd.length * 2);
    R.bonus = bonus; G.money += bonus; R.earned += bonus; G.stats.earned += bonus;
    FX.letterbox(true);
    FX.title('CASH OUT', { size: 26, color: PAL.grass3, dur: 2, sub: '+' + U.money(bonus) });
    FX.confettiBurst(W / 2, H * 0.35, 110);
    Audio.play('cash'); Audio.play('cheer', 1); FX.flash(PAL.cream, 0.42);
    UI.hideRunHUD();
  }
  function finish(cashed) {
    const s = { cashed, peak: R.peak, settled: R.settled, earned: R.earned, bonus: R.bonus || 0, crowd: crowd.length, perks: R.perks.slice(), lost: R.lost, used: R.used };
    G.runs = (G.runs || 0) + 1;
    R.active = false; R.phase = 'idle';
    FX.setSlowmo(1, true); FX.vignette(0); FX.letterbox(false); FX.cine.tDesat = 0;
    world.clear(); crowd.length = 0;
    Audio.setMode('pen');
    UI.showSummary(s); UI.onRunEnd();
    Main.save();
  }

  function click() { if (R.active && R.phase === 'play') drop(); }
  function key(k) {
    if (k === ' ') { click(); return true; }
    if (k === 'r' || k === 'R') { R.rot = !R.rot; Audio.play('click'); return true; }
    const n = parseInt(k);
    if (n >= 1 && n <= 9) {
      const t = CUBE_ORDER.filter((c) => available(c) > 0)[n - 1];
      if (t) { G.selCube = t; UI.refreshCubeBar(); Audio.play('click'); }
      return true;
    }
    return false;
  }

  // ---- scene --------------------------------------------------------------
  function render(g) {
    const cam = FX.cam;
    g.fillStyle = '#2a1420'; g.fillRect(0, 0, W, H);
    g.save();
    g.translate(W / 2 + cam.shakeX, H / 2 + cam.shakeY);
    g.scale(cam.zoom, cam.zoom);
    g.translate(-cam.x, -cam.y);
    const vw = W / cam.zoom, vh = H / cam.zoom;
    const vx0 = cam.x - vw / 2, vy0 = cam.y - vh / 2;

    // tent canvas: stripes fanning down from the apex
    g.fillStyle = '#3a1420'; g.fillRect(vx0, vy0, vw, vh);
    const spread = 1.9;
    for (let i = -26; i <= 26; i++) {
      const a0 = (i / 26) * spread, a1 = ((i + 1) / 26) * spread;
      g.fillStyle = i % 2 === 0 ? '#8e3028' : '#c9b193';
      g.beginPath();
      g.moveTo(APEX.x, APEX.y);
      g.lineTo(APEX.x + Math.sin(a0) * 2400, APEX.y + Math.cos(a0) * 2400);
      g.lineTo(APEX.x + Math.sin(a1) * 2400, APEX.y + Math.cos(a1) * 2400);
      g.closePath(); g.fill();
    }
    // canvas falls into shadow away from the ring lights
    const shade = g.createLinearGradient(0, APEX.y, 0, GROUND + 40);
    shade.addColorStop(0, 'rgba(20,8,14,0.62)');
    shade.addColorStop(0.55, 'rgba(20,8,14,0.42)');
    shade.addColorStop(1, 'rgba(20,8,14,0.05)');
    g.fillStyle = shade; g.fillRect(vx0, vy0, vw, vh);
    // seam rings around the tent
    g.strokeStyle = 'rgba(120,40,40,0.35)'; g.lineWidth = 3;
    for (const r of ropes) { g.beginPath(); g.arc(APEX.x, APEX.y, APEX.y * -1 + r.y + 560, 0.55, Math.PI - 0.55); g.stroke(); }
    // apex crown and mast
    g.fillStyle = PAL.wood1; g.fillRect(APEX.x - 4, APEX.y, 8, 120);
    g.fillStyle = PAL.gold; g.fillRect(APEX.x - 14, APEX.y - 16, 28, 10);
    g.fillStyle = PAL.goldD; g.fillRect(APEX.x - 14, APEX.y - 8, 28, 4);
    g.fillStyle = PAL.red; g.fillRect(APEX.x + 12, APEX.y - 34, 22, 12);
    g.fillStyle = PAL.cream; g.fillRect(APEX.x + 12, APEX.y - 30, 22, 4);

    // side poles with bunting and rigs
    for (const side of [-1, 1]) {
      const px = PX + side * 268;
      g.fillStyle = PAL.wood1; g.fillRect(px - 5, -260, 10, GROUND + 260);
      g.fillStyle = PAL.wood3; g.fillRect(px - 5, -260, 3, GROUND + 260);
      g.fillStyle = PAL.gold; for (let y = -240; y < GROUND; y += 60) g.fillRect(px - 7, y, 14, 5);
      // guy ropes to the apex
      g.strokeStyle = 'rgba(240,230,200,0.35)'; g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(px, -250); g.lineTo(APEX.x, APEX.y + 60); g.stroke();
      // three lamps per pole, each following the top of the tower
      const rig = Props.get('spotRig');
      const tt = towerTop();
      for (const ly of [-30, -130, -230]) {
        g.drawImage(rig, px - 9, ly - 10, rig.width, rig.height);
        const ang = Math.atan2(tt - ly, PX - px);
        g.save(); g.translate(px, ly); g.rotate(ang);
        const beam = g.createLinearGradient(0, 0, 300, 0);
        beam.addColorStop(0, 'rgba(255,243,196,0.26)'); beam.addColorStop(1, 'rgba(255,243,196,0)');
        g.fillStyle = beam;
        g.beginPath(); g.moveTo(0, -5); g.lineTo(300, -44); g.lineTo(300, 44); g.lineTo(0, 5); g.closePath(); g.fill();
        g.restore();
      }
    }
    // bunting garlands
    for (let row = 0; row < 3; row++) {
      const y = -16 - row * 84;
      g.strokeStyle = PAL.wood1; g.lineWidth = 2;
      g.beginPath(); g.moveTo(PX - 268, y); g.quadraticCurveTo(PX, y + 34, PX + 268, y); g.stroke();
      for (let i = 0; i <= 18; i++) {
        const t = i / 18;
        const fx = U.lerp(PX - 268, PX + 268, t);
        const fy = (1 - t) * (1 - t) * y + 2 * (1 - t) * t * (y + 34) + t * t * y;
        g.fillStyle = i % 3 === 0 ? PAL.gold : i % 3 === 1 ? PAL.cream : PAL.red;
        for (let k = 0; k < 7; k++) g.fillRect(fx - 3 + k * 0.45, fy + k, 6 - k * 0.85, 1);
      }
    }

    // sawdust ring and curb
    g.fillStyle = '#6b4a2f'; g.fillRect(vx0, GROUND, vw, vh);
    g.fillStyle = PAL.sand; Art.ell(g, PX, GROUND + 12, 250, 30);
    g.fillStyle = '#e8cfa6'; Art.ell(g, PX, GROUND + 8, 236, 24);
    g.fillStyle = '#cbb08a';
    for (let i = 0; i < 40; i++) g.fillRect(PX - 220 + ((i * 71) % 440), GROUND + 2 + ((i * 37) % 18), 3, 2);
    for (let i = -9; i <= 9; i++) {
      const cx2 = PX + i * 26;
      g.fillStyle = i % 2 === 0 ? PAL.red : PAL.cream;
      g.fillRect(cx2 - 13, GROUND - 6, 26, 9);
      g.fillStyle = i % 2 === 0 ? PAL.redD : PAL.parch0;
      g.fillRect(cx2 - 13, GROUND + 1, 26, 3);
    }

    // bleachers behind the crowd
    const bl = Props.get('bleacher');
    for (const side of [-1, 1]) for (let col = 0; col < 8; col++) {
      const x = PX + side * (112 + col * 30) - (side < 0 ? 40 : 0);
      g.drawImage(bl, x - 20, GROUND - 6 - col * 10 - 10, bl.width, bl.height + col * 10 + 12);
    }

    // pedestal under the platform
    const pw = platWidth();
    const ped = Props.get('pedestal', Math.round(pw));
    g.drawImage(ped, PX - pw / 2, PLAT_Y + PLAT_H, pw, GROUND - PLAT_Y - PLAT_H);

    // height rungs
    if (R.active) {
      g.font = '7px "Press Start 2P", monospace'; g.textAlign = 'right'; g.textBaseline = 'middle';
      for (let h = 5; h <= Math.max(10, R.peak + 10); h += 5) {
        const y = PLAT_Y - h * CUBE_SIZE;
        g.strokeStyle = h <= R.height ? 'rgba(140,200,95,0.4)' : 'rgba(255,248,230,0.16)';
        g.setLineDash([4, 7]); g.lineWidth = 1;
        g.beginPath(); g.moveTo(PX - 150, y); g.lineTo(PX + 150, y); g.stroke(); g.setLineDash([]);
        g.fillStyle = h === G.record && G.record > 0 ? PAL.goldL : 'rgba(255,248,230,0.5)';
        g.fillText(String(h), PX - 156, y);
      }
    }
    // platform
    if (platform) {
      g.save(); g.translate(platform.x, platform.y);
      g.fillStyle = PAL.wood2; g.fillRect(-pw / 2, -PLAT_H / 2, pw, PLAT_H);
      g.fillStyle = PAL.wood4; g.fillRect(-pw / 2, -PLAT_H / 2, pw, 3);
      g.fillStyle = PAL.wood0; g.fillRect(-pw / 2, PLAT_H / 2 - 3, pw, 3);
      g.fillStyle = PAL.gold; for (let x = -pw / 2 + 3; x < pw / 2 - 3; x += 14) g.fillRect(x, -PLAT_H / 2 + 5, 7, 3);
      g.restore();
    }
    // drop guide
    if (R.active && R.phase === 'play' && G.skills.guide && !R.falling && G.selCube) {
      const def = CUBES[G.selCube];
      let hw = def.w * CUBE_SIZE * R.sizeMult / 2;
      if (R.rot) hw = def.h * CUBE_SIZE * R.sizeMult / 2;
      let hy = PLAT_Y;
      for (const b of world.bodies) {
        if (!b.userData || b.userData.platform) continue;
        const bb = b.aabb();
        if (bb.maxX > R.craneX - hw && bb.minX < R.craneX + hw) hy = Math.min(hy, bb.minY);
      }
      g.strokeStyle = 'rgba(111,211,200,0.55)'; g.setLineDash([3, 5]); g.lineWidth = 1;
      g.beginPath();
      g.moveTo(R.craneX - hw, craneY() + 22); g.lineTo(R.craneX - hw, hy);
      g.moveTo(R.craneX + hw, craneY() + 22); g.lineTo(R.craneX + hw, hy);
      g.stroke(); g.setLineDash([]);
      g.fillStyle = 'rgba(111,211,200,0.4)'; g.fillRect(R.craneX - hw, hy - 2, hw * 2, 2);
    }
    // cubes
    for (const b of world.bodies) {
      const ud = b.userData; if (!ud || ud.platform) continue;
      const def = CUBES[ud.type];
      const sq = ud.sq || 0;
      g.save(); g.translate(b.x, b.y); g.rotate(b.angle); g.scale(1 + sq, 1 - sq);
      Sprites.drawCube(g, def, b.width, b.height, {
        face: ud.premium,
        outline: ud.bedrock ? PAL.stone2 : b === R.falling ? PAL.cream : (ud.premium ? PAL.goldL : null),
      });
      g.restore();
      if (b === R.falling && b.vy > 60) {
        g.strokeStyle = 'rgba(255,248,230,0.3)'; g.lineWidth = 1;
        for (let i = -1; i <= 1; i++) {
          g.beginPath();
          g.moveTo(b.x + i * b.width * 0.36, b.y - b.height / 2 - 4);
          g.lineTo(b.x + i * b.width * 0.36, b.y - b.height / 2 - 4 - Math.min(38, b.vy * 0.08));
          g.stroke();
        }
      }
    }
    if (R.active && (R.phase === 'play' || R.phase === 'intro')) drawCrane(g);
    // ringmaster and crowd
    const rm = Sprites.ringmaster(Math.floor(G.time * 2));
    g.drawImage(rm, PX - 214, GROUND - 34, rm.width, rm.height);
    for (const p of crowd) {
      const f = Math.floor(G.time * (p.pose === 'idle' ? 1.5 : 7) + p.ph) % 2;
      const img = Sprites.person(p.v, p.pose, f);
      const hop = p.pose === 'cheer' || p.pose === 'jump' ? Math.abs(Math.sin(G.time * 9 + p.ph)) * 3 : 0;
      g.drawImage(img, Math.round(p.x - 8), Math.round(p.y - 22 - hop));
    }
    // wind streaks
    if (R.wind.warn > 0 || R.wind.active) {
      const dir = R.wind.dir;
      g.fillStyle = R.wind.active ? 'rgba(255,248,230,0.75)' : `rgba(242,193,78,${0.4 + 0.4 * Math.sin(G.time * 20)})`;
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
    const cy = craneY(), cam = FX.cam;
    const vw = W / cam.zoom;
    g.fillStyle = PAL.wood0; g.fillRect(cam.x - vw, cy - 30, vw * 2, 4);
    g.fillStyle = PAL.wood0; g.fillRect(cam.x - vw, cy - 20, vw * 2, 4);
    g.fillStyle = PAL.wood1;
    for (let x = -3000; x < 3000; x += 22) { g.fillRect(x, cy - 27, 3, 8); g.fillRect(x + 11, cy - 27, 3, 8); }
    g.fillStyle = PAL.wood3; g.fillRect(cam.x - vw, cy - 30, vw * 2, 1); g.fillRect(cam.x - vw, cy - 20, vw * 2, 1);
    g.fillStyle = PAL.red; g.fillRect(R.craneX - 13, cy - 23, 26, 13);
    g.fillStyle = PAL.redD; g.fillRect(R.craneX - 13, cy - 13, 26, 3);
    g.fillStyle = PAL.goldL; g.fillRect(R.craneX - 13, cy - 23, 26, 2);
    g.fillStyle = PAL.ink; g.fillRect(R.craneX - 1, cy - 10, 2, 17);
    g.fillStyle = PAL.stone2; g.fillRect(R.craneX - 11, cy + 5, 22, 4);
    g.fillStyle = PAL.stone1; g.fillRect(R.craneX - 11, cy + 5, 4, 9); g.fillRect(R.craneX + 7, cy + 5, 4, 9);
    if (!R.falling && R.canDrop && G.selCube && R.phase === 'play') {
      const def = CUBES[G.selCube];
      let w = def.w * CUBE_SIZE * R.sizeMult, h = def.h * CUBE_SIZE * R.sizeMult;
      if (R.rot) { const t = w; w = h; h = t; }
      const sway = (R.craneX - R.lastCraneX) * 0.02;
      g.save(); g.translate(R.craneX, cy + 20 + h / 2 - 12); g.rotate(-sway);
      Sprites.drawCube(g, def, w, h, { face: (G.premium[G.selCube] || 0) > 0, outline: 'rgba(255,248,230,0.6)' });
      g.restore();
    }
  }
  function overlay(g) {
    // height gauge on the right, drawn as a carved wooden rail
    const rx = W - 26, y0 = 52, y1 = H - 40;
    g.fillStyle = PAL.ink; g.fillRect(rx - 7, y0 - 8, 16, y1 - y0 + 16);
    g.fillStyle = PAL.wood2; g.fillRect(rx - 6, y0 - 7, 14, y1 - y0 + 14);
    g.fillStyle = PAL.wood3; g.fillRect(rx - 6, y0 - 7, 14, 1);
    g.fillStyle = PAL.wood0; g.fillRect(rx - 3, y0, 7, y1 - y0);
    const maxT = Math.max(12, Math.ceil((R.peak + 4) / 4) * 4);
    g.fillStyle = PAL.wood3;
    for (let t = 0; t <= maxT; t += 4) g.fillRect(rx - 6, Math.round(y1 - (t / maxT) * (y1 - y0)), 4, 1);
    const maxH = maxT;
    const hy = y1 - (R.height / maxH) * (y1 - y0);
    const py = y1 - (R.peak / maxH) * (y1 - y0);
    g.fillStyle = PAL.grass2; g.fillRect(rx - 3, hy, 7, y1 - hy);
    g.fillStyle = PAL.grass3; g.fillRect(rx - 3, hy, 7, 2);
    g.fillStyle = PAL.cream; g.fillRect(rx - 6, py, 13, 1);
    if (G.record > 0) {
      const ry = y1 - (Math.min(maxH, G.record) / maxH) * (y1 - y0);
      g.fillStyle = PAL.goldL; g.fillRect(rx - 7, ry, 15, 2);
    }
    g.font = '8px "Press Start 2P", monospace'; g.textAlign = 'center'; g.textBaseline = 'top';
    g.fillStyle = PAL.cream; g.fillText(R.height.toFixed(1), rx + 1, y1 + 12);
    if (R.wind.warn > 0) {
      g.font = '10px "Press Start 2P", monospace'; g.textBaseline = 'middle';
      g.fillStyle = Math.sin(G.time * 20) > 0 ? PAL.goldL : PAL.redL;
      g.fillText('WIND', W / 2, 28);
    }
    if (R.phase === 'play' && R.rot) { g.font = '7px "Press Start 2P", monospace'; g.textAlign = 'center'; g.fillStyle = PAL.tealL; g.fillText('TURNED', W / 2, H - 16); }
    if (R.phase === 'play' && !G.selCube && !R.falling) { g.font = '9px "Press Start 2P", monospace'; g.textAlign = 'center'; g.fillStyle = PAL.redL; g.fillText('NO CUBES LEFT', W / 2, 50); }
  }

  return {
    init(g) { G = g; resetWorld(); },
    R, world, update, render, click, key, drop, cashOut, newRun, total, available, autoSelect,
    get active() { return R.active; },
    get crowdSize() { return crowd.length; },
  };
})();
