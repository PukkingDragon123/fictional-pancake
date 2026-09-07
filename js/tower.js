// ---- Tower stacking run ---------------------------------------------------
const Tower = (() => {
  let G = null;
  const W = 640, H = 360;
  const PX = 320, PLAT_Y = 290, GROUND_Y = 332, PLAT_H = 14;
  const world = new Physics.World();
  let platform = null;
  const R = { active: false, phase: 'idle', wind: { active: false, warn: 0, dir: 1, str: 0 }, perks: [], height: 0, peak: 0, power: 1, sizeMult: 1, earned: 0, lives: 0, maxLives: 0, settled: 0, incomeRate: 0 }; // run state
  const crowd = [];
  let physAcc = 0;
  let mouseX = 320, spaceHeld = false;
  const lights = [{ x: 80, a: 0 }, { x: 560, a: Math.PI }];
  const cityscape = []; for (let i = 0; i < 26; i++) cityscape.push({ x: i * 26 - 10, w: U.randi(14, 24), h: U.randi(20, 80) });

  function platWidth() { return (G.skills.widebase ? 135 : 100); }
  function crowdCap() { return 40 + 40 * (G.fac.stand || 0); }

  function resetWorld() {
    world.clear();
    platform = world.add(new Physics.Body({ x: PX, y: PLAT_Y + PLAT_H / 2, width: platWidth(), height: PLAT_H, isStatic: true, friction: 0.9, userData: { platform: true } }));
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
      falling: null, canDrop: false, dropCooldown: 0,
      settled: 0, height: 0, peak: 0, lives: 3, maxLives: 3, lost: 0,
      earned: 0, placementTotal: 0, perks: [], perkPending: false, nextPerkAt: 5, nextPowerAt: 10,
      power: 1, frictionBoost: 1, sizeMult: 1, goldRushLeft: 0, encoreUsed: false,
      crowdCount: 0, crowdTarget: 0, excite: 0, incomeAcc: 0,
      wind: { active: false, warn: 0, t: 0, dir: 1, str: 0, next: U.rand(6, 10) },
      quake: { t: 0, next: U.rand(25, 40), active: false },
      lowT: 0, dangerCd: 0, slowT: 0, collapseT: 0, cashT: 0, rotate: false,
      craneT: U.rand(0, 6), craneX: PX, lastCraneX: PX, number: (G.runs || 0) + 1, cubesUsed: 0,
    });
    crowd.length = 0;
    FX.clear();
    FX.letterbox(true);
    FX.title('STACK RUN #' + R.number, { style: 'slide', dur: 2.2, size: 24, color: '#ffd23f', sub: U.pick(TIPS) });
    Audio.play('drum'); Audio.play('whoosh');
    Audio.setMode('tower');
    FX.cam.tzoom = 1.25; FX.cam.tx = PX; FX.cam.ty = PLAT_Y - 30;
    if (G.skills.headstart) { const p = U.pick(PERKS); setTimeout(() => { if (R.active) { applyPerk(p, true); } }, 1800); }
    autoSelectCube();
    UI.onRunStart();
  }

  // ---- forces: wind, magnet, feather -------------------------------------
  function applyForces(b, dt) {
    const ud = b.userData; if (!ud || ud.platform) return;
    if (R.wind.active) {
      const a = (R.wind.str * R.wind.dir) / Math.max(0.6, b.density);
      b.vx += a * dt;
    }
    if (R.perks.includes('magnet') && b === R.falling) { b.vx += (PX - b.x) * 4 * dt; b.vx *= Math.max(0, 1 - 1.5 * dt); }
  }
  function onImpact(a, b, impulse, c) {
    const strength = impulse / 800;
    if (strength > 0.25) {
      const x = c ? c.x : (a.x + b.x) / 2, y = c ? c.y : (a.y + b.y) / 2;
      FX.dust(x, y, Math.min(12, Math.round(strength * 5)), '#d8c8b0');
      FX.shake(Math.min(6, strength * 1.5));
      Audio.play('thud', Math.min(2, strength));
      if (a.restitution > 0.4 || b.restitution > 0.4) Audio.play('bounce');
    }
    // falling cube touched something -> release control
    if (R.falling && (a === R.falling || b === R.falling)) { landed(R.falling); }
  }
  function landed(b) {
    b.gravityScale = 1;
    b.w *= 0.35; // soften corner-landing spin (cartoony, forgiving)
    R.falling = null; R.canDrop = true; R.dropCooldown = 0.15;
    FX.burst(b.x, b.y, 6, { color: ['#fff', CUBES[b.userData.type].color], speed: 60, gravity: 200, life: 0.4 });
  }

  // ---- cube inventory ----------------------------------------------------
  function available(type) { return (G.cubes[type] || 0) + (G.premium[type] || 0); }
  function autoSelectCube() {
    if (G.selectedCube && available(G.selectedCube) > 0) return;
    G.selectedCube = CUBE_ORDER.find((k) => available(k) > 0) || null;
    UI.refreshCubeBar();
  }
  function totalCubes() { return CUBE_ORDER.reduce((s, k) => s + available(k), 0); }

  function makeCube(type, premium, x, y) {
    const def = CUBES[type];
    const sz = CUBE_SIZE * R.sizeMult;
    let w = def.w * sz, h = def.h * sz;
    if (R.rotate) { const t = w; w = h; h = t; }
    let friction = def.friction * (G.skills.gyro ? 1.15 : 1) * R.frictionBoost;
    if (premium) friction *= 1.1;
    if (type === 'heavy' && R.perks.includes('heavymetal')) friction *= 1.3;
    if (type === 'ice' && R.perks.includes('deepfreeze')) friction = 0.6;
    let adhesion = def.adhesion * (G.toys.mud ? 1.25 : 1) + (R.perks.includes('glue') ? 500 : 0);
    const b = new Physics.Body({ x, y, width: w, height: h, density: def.density, friction, restitution: R.perks.includes('rubber') ? 0 : def.restitution, adhesion, angularDamping: G.skills.gyro ? 1.2 : 0.15, linearDamping: 0.02, angle: 0, userData: { type, premium, placed: true, settled: false } });
    return b;
  }

  function drop() {
    if (!R.active || R.phase !== 'play' || R.perkPending) return;
    if (!R.canDrop || R.falling) { return; }
    const type = G.selectedCube;
    if (!type || available(type) <= 0) { autoSelectCube(); if (!G.selectedCube) { UI.toast('Out of cubes! Cash out or collapse.', 'bad'); } return; }
    let premium = false;
    if ((G.premium[type] || 0) > 0) { G.premium[type]--; premium = true; } else G.cubes[type]--;
    R.cubesUsed++;
    const y = craneY() + 18;
    const b = makeCube(type, premium, R.craneX, y);
    const craneV = (R.craneX - R.lastCraneX) * 60;
    b.vx = craneV * 0.12; b.vy = 30;
    if (!G.skills.crane) b.angle = U.rand(-0.05, 0.05);
    if (R.perks.includes('feather')) b.gravityScale = 0.6;
    world.add(b);
    R.falling = b; R.canDrop = false;
    Audio.play('whoosh');
    for (let i = 0; i < 5; i++) FX.spawn({ x: b.x + U.rand(-b.width / 2, b.width / 2), y: b.y - b.height / 2, vx: 0, vy: -120, life: 0.3, size: 1.5, color: 'rgba(255,255,255,0.6)' });
    autoSelectCube();
    UI.refreshCubeBar(); UI.refreshHUD();
  }
  function craneY() { return towerTopY() - 120; }
  function towerTopY() {
    let top = PLAT_Y;
    for (const b of world.bodies) { if (b.userData && b.userData.placed && b.restTime > 0.05 && b.y < PLAT_Y) top = Math.min(top, b.top()); }
    return top;
  }
  function computeHeight() {
    let top = PLAT_Y;
    for (const b of world.bodies) if (b.userData && b.userData.settled && b.restTime > 0.05 && b.y < PLAT_Y + 40) top = Math.min(top, b.top());
    return Math.max(0, (PLAT_Y - top) / CUBE_SIZE);
  }

  // ---- economy ----------------------------------------------------------
  function incomeMult() {
    let m = 1 + 0.12 * (G.fac.stand || 0);
    if (G.skills.merch) m *= 1.3;
    if (R.perks.includes('hypetrain')) m *= 1.7;
    return m * R.power;
  }
  function placementPay(b) {
    const ud = b.userData, def = CUBES[ud.type];
    let v = def.value;
    if (R.goldRushLeft > 0 && ud.type !== 'gold') { v = Math.max(v, CUBES.gold.value); R.goldRushLeft--; FX.float(b.x, b.y - 20, 'GOLD RUSH', { color: '#ffd23f', size: 7, world: true }); }
    if (ud.type === 'gold' && R.perks.includes('goldrush')) v *= 2;
    if (ud.type === 'heavy' && R.perks.includes('heavymetal')) v *= 3;
    if (ud.type === 'bouncy' && G.toys.tramp) v *= 1.5;
    if (ud.premium) v *= G.skills.goldengut ? 3 : 2;
    v *= 1 + 0.15 * (G.fac.lab || 0);
    if ((G.fac.conveyor || 0) >= 3) v *= 1.1;
    v *= 1 + 0.15 * R.height;
    if (R.perks.includes('taxbreak')) v *= 1.6;
    v *= R.power;
    return Math.round(v);
  }
  function earn(amount, x, y, big) {
    G.money += amount; R.earned += amount; G.stats.earned += amount;
    if (x !== undefined) FX.float(x, y, '+$' + U.fmt(amount), { color: '#ffd23f', size: big ? 9 : 7, world: true, life: 1.2 });
    UI.refreshHUD();
  }

  function onSettled(b) {
    b.userData.settled = true;
    R.settled++;
    R.height = computeHeight();
    const pay = placementPay(b);
    earn(pay, b.x, b.y - b.height / 2 - 6, true);
    R.placementTotal += pay;
    R.power = 1 + R.settled * (R.perks.includes('momentum') ? 0.16 : 0.08);
    R.excite = Math.min(2, R.excite + 0.8);
    Audio.play('place'); Audio.play('coin');
    // center bonus
    if (Math.abs(b.x - PX) < 5 && R.height > 1) { FX.float(b.x, b.y - b.height / 2 - 18, 'PERFECT!', { color: '#3fe0ff', size: 8, world: true }); FX.sparkle(b.x, b.y, 8, '#3fe0ff'); earn(Math.round(pay * 0.5)); }
    if (R.height > R.peak) { R.peak = R.height; }
    if (Math.floor(R.peak) > G.record) {
      const was = G.record; G.record = Math.floor(R.peak);
      if (was >= 3) { FX.title('NEW RECORD!', { size: 22, color: '#ffd23f', dur: 1.6, sub: G.record + ' CUBES' }); FX.confettiBurst(W / 2, H * 0.3, 80); Audio.play('record'); FX.flash('#fff6c2', 0.4); }
    }
    if (R.settled >= R.nextPowerAt) {
      R.nextPowerAt += 10; R.frictionBoost *= 1.08;
      for (const bb of world.bodies) if (bb.userData && bb.userData.placed) bb.friction *= 1.08;
      FX.title('STACK POWER UP!', { size: 18, color: '#7dff3f', dur: 1.5, sub: 'x' + R.power.toFixed(2) + ' • friction +8%' }); Audio.play('levelup'); FX.punch(0.1); FX.flash('#7dff3f', 0.3);
    }
    if (R.perks.includes('bedrock')) applyBedrock();
    if (R.settled >= R.nextPerkAt) { R.nextPerkAt += 5; R.perkPending = true; setTimeout(offerPerks, 400); }
    UI.refreshRunHUD();
  }
  function applyBedrock() {
    const settled = world.bodies.filter((b) => b.userData && b.userData.settled && !b.userData.bedrock && !b.isStatic).sort((a, b) => b.y - a.y);
    const already = world.bodies.filter((b) => b.userData && b.userData.bedrock).length;
    for (let i = 0; i < Math.min(3 - already, settled.length); i++) {
      const b = settled[i]; if (b.y > PLAT_Y - CUBE_SIZE * 3.2 && b.restTime > 0.3) { b.isStatic = true; b.setMass(0); b.vx = b.vy = b.w = 0; b.userData.bedrock = true; FX.sparkle(b.x, b.y, 8, '#c77dff'); }
    }
  }

  // ---- perks -------------------------------------------------------------
  function offerPerks() {
    if (!R.active) return;
    const n = G.skills.scout ? 4 : 3;
    const pool = PERKS.filter((p) => !R.perks.includes(p.key));
    const picks = [];
    while (picks.length < n && pool.length) {
      const weights = pool.map((p) => (p.rarity === 2 ? 0.55 : 1));
      let r = Math.random() * weights.reduce((a, b) => a + b, 0), idx = 0;
      for (; idx < pool.length; idx++) { r -= weights[idx]; if (r <= 0) break; }
      picks.push(pool.splice(Math.min(idx, pool.length - 1), 1)[0]);
    }
    G.paused = true;
    FX.punch(0.12); FX.vignette(0.7); Audio.play('perk');
    UI.showPerks(picks, (p) => { applyPerk(p); G.paused = false; R.perkPending = false; FX.vignette(0); });
  }
  function applyPerk(p, free) {
    if (R.perks.includes(p.key)) { p = PERKS.find((q) => !R.perks.includes(q.key)) || p; }
    R.perks.push(p.key);
    switch (p.key) {
      case 'glue': for (const b of world.bodies) if (b.userData && b.userData.placed) b.adhesion += 500; break;
      case 'net': R.lives += 2; R.maxLives += 2; break;
      case 'goldrush': R.goldRushLeft = 3; break;
      case 'bigboned': R.sizeMult *= 1.15; break;
      case 'surge': R.crowdTarget += 40; for (let i = 0; i < 40; i++) addSpectator(true); break;
      case 'rubber': for (const b of world.bodies) if (b.userData && b.userData.placed) b.restitution = 0; break;
      case 'deepfreeze': for (const b of world.bodies) if (b.userData && b.userData.type === 'ice') b.friction = 0.6; break;
      case 'heavymetal': for (const b of world.bodies) if (b.userData && b.userData.type === 'heavy') b.friction *= 1.3; break;
      case 'bedrock': applyBedrock(); break;
      case 'momentum': R.power = 1 + R.settled * 0.16; break;
    }
    FX.title(p.icon + ' ' + p.name.toUpperCase(), { size: 16, color: '#c77dff', dur: 1.6, sub: free ? 'HEAD START PERK' : '' });
    FX.confettiBurst(W / 2, H * 0.4, 30);
    UI.refreshRunHUD();
  }

  // ---- crowd ------------------------------------------------------------
  function addSpectator(instant) {
    const i = crowd.length; const side = i % 2 ? 1 : -1; const row = Math.floor(i / 2 / 14), col = Math.floor(i / 2) % 14;
    const x = PX + side * (platWidth() / 2 + 20 + col * 10 + U.rand(-3, 3)), y = GROUND_Y + 2 + row * 5;
    crowd.push({ x: instant ? x : x + side * 200, tx: x, y, c: U.randi(0, Sprites.people.length - 1), ph: U.rand(0, TAU), hat: U.chance(0.3), flee: 0, bubble: 0 });
  }
  function updateCrowd(dt) {
    if (R.phase === 'play' || R.phase === 'intro') {
      const hype = G.skills.hype ? 1.35 : 1;
      R.crowdTarget = Math.min(crowdCap(), Math.floor(2 + Math.pow(R.height, 1.7) * 1.3 * Pen.appeal() * hype) + (R.perks.includes('surge') ? 40 : 0));
      const growth = (4 + R.height * 1.5) * hype * dt;
      R.crowdCount = Math.min(R.crowdTarget, R.crowdCount + growth);
      while (crowd.length < Math.floor(R.crowdCount)) addSpectator(false);
      while (crowd.length > Math.floor(R.crowdCount) + 3) crowd.pop();
      // income
      const inc = crowd.length * 0.3 * incomeMult();
      R.incomeAcc += inc * dt;
      if (R.incomeAcc >= 1) { const a = Math.floor(R.incomeAcc); R.incomeAcc -= a; G.money += a; R.earned += a; G.stats.earned += a; }
      R.incomeRate = inc;
    }
    R.excite = Math.max(0, R.excite - dt);
    for (const p of crowd) {
      if (R.phase === 'collapse') { p.flee += dt; p.x += (p.x > PX ? 1 : -1) * 90 * dt; }
      else p.x = U.lerp(p.x, p.tx, 1 - Math.pow(0.02, dt));
      if (p.bubble > 0) p.bubble -= dt;
      else if (R.excite > 0.5 && U.chance(0.01)) p.bubble = 1;
    }
  }

  // ---- hazards ----------------------------------------------------------
  function updateHazards(dt) {
    const wd = R.wind;
    if (R.height >= 6 || wd.active || wd.warn > 0) {
      if (wd.active) { wd.t -= dt; if (wd.t <= 0) { wd.active = false; wd.next = U.rand(6, 11); } else if (U.chance(0.4)) FX.spawn({ x: wd.dir > 0 ? FX.cam.x - W / FX.cam.zoom : FX.cam.x + W / FX.cam.zoom, y: U.rand(towerTopY() - 60, PLAT_Y), vx: wd.dir * wd.str * 1.5, vy: U.rand(-20, 20), life: 1.5, size: 3, color: U.pick(['#7dc24b', '#c8b070', '#e0a040']), type: 'leaf', rot: 0, vr: 6 }); }
      else if (wd.warn > 0) { wd.warn -= dt; if (wd.warn <= 0) { wd.active = true; wd.t = 1.4; Audio.play('wind'); } }
      else { wd.next -= dt; if (wd.next <= 0 && R.phase === 'play') { wd.warn = 1.3; wd.dir = U.chance(0.5) ? 1 : -1; wd.str = (16 + (R.height - 5) * 5) * (R.perks.includes('windbreak') ? 0.3 : 1); Audio.play('alarm'); } }
    }
    const q = R.quake;
    if (R.height >= 12 && !R.perks.includes('calm') && R.phase === 'play') {
      if (q.active) { q.t -= dt; const off = Math.sin(q.t * 40) * 3 * Math.min(1, q.t); const nx = platform.baseX + off; platform.vx = (nx - platform.x) / dt; platform.x = nx; FX.shake(1.5); if (q.t <= 0) { q.active = false; platform.x = platform.baseX; platform.vx = 0; q.next = U.rand(25, 40); } }
      else { q.next -= dt; if (q.next <= 0) { q.active = true; q.t = 1.6; FX.title('EARTHQUAKE!', { size: 16, color: '#ff4b4b', dur: 1.2, shake: 3 }); Audio.play('drum'); } }
    }
  }

  // ---- main update ------------------------------------------------------
  function update(dt, realDt) {
    if (!R.active) { FX.cam.tzoom = 1; FX.cam.tx = PX; FX.cam.ty = 180; return; }
    R.t += dt;
    if (R.phase === 'intro') { R.introT += realDt; if (R.introT > 2.2) { R.phase = 'play'; R.canDrop = true; FX.letterbox(false); UI.onRunPlay(); } }
    // crane
    if (R.phase === 'play' && !G.paused) {
      let sp = 1.5 * (G.skills.crane ? 0.75 : 1) * (R.perks.includes('slowhands') ? 0.6 : 1);
      R.craneT += dt * sp;
      const amp = Math.min(150, 80 + R.height * 4);
      R.lastCraneX = R.craneX; R.craneX = PX + Math.sin(R.craneT) * amp;
      if (R.dropCooldown > 0) R.dropCooldown -= dt;
      if (R.falling && R.t - (R.fallStart || 0) > 3) { /* stuck in air? nothing */ }
    }
    // physics
    if (!G.paused && (R.phase === 'play' || R.phase === 'collapse' || R.phase === 'cash')) {
      physAcc += dt;
      const step = 1 / 180; let n = 0;
      while (physAcc >= step && n < 14) { world.step(step); physAcc -= step; n++; }
      if (n >= 10) physAcc = 0;
    }
    // bookkeeping
    if (R.phase === 'play') {
      let moving = 0;
      for (let i = world.bodies.length - 1; i >= 0; i--) {
        const b = world.bodies[i]; const ud = b.userData; if (!ud || ud.platform) continue;
        if (b.y > GROUND_Y + 80) { // fell off
          world.remove(b);
          if (b === R.falling) landed(b);
          R.lost++; R.lives--; G.stats.lost++;
          FX.shake(4); Audio.play('thud', 1.5); FX.flash('#ff4b4b', 0.25);
          FX.float(b.x, GROUND_Y - 10, 'LOST!', { color: '#ff4b4b', size: 9, world: true });
          UI.refreshRunHUD();
          if (R.lives <= 0) { if (R.perks.includes('encore') && !R.encoreUsed) encore(); else collapse('CUBES LOST'); }
          continue;
        }
        if (!ud.settled && b !== R.falling && b.restTime > 0.45) onSettled(b);
        if (ud.settled && b.speed > 35) moving++;
      }
      // falling cube timeout safety: if it never touched anything for 4s, allow drop
      if (R.falling && R.falling.contacts === 0 && R.falling.y > GROUND_Y) { /* handled by fall-off */ }
      R.height = computeHeight();
      // collapse by height loss
      if (R.peak >= 4 && R.height < R.peak * 0.5 && moving >= 2) { R.lowT += dt; if (R.lowT > 1.2) collapse('TOWER TOPPLED'); } else R.lowT = Math.max(0, R.lowT - dt);
      // danger slow-mo
      if (R.dangerCd > 0) R.dangerCd -= realDt;
      if (moving >= 1 && R.height >= 3 && R.dangerCd <= 0) {
        R.dangerCd = G.skills.bullet ? 3 : 5; R.slowT = G.skills.bullet ? 1.4 : 0.7;
        FX.setSlowmo(G.skills.bullet ? 0.25 : 0.45); FX.vignette(0.6); FX.punch(0.06); Audio.play('slowmo');
        FX.title('!!', { size: 22, color: '#ff4b4b', dur: 0.7, style: 'fade', y: 0.2 });
      }
      if (R.slowT > 0) { R.slowT -= realDt; if (R.slowT <= 0) { FX.setSlowmo(1); FX.vignette(0); } }
      updateHazards(dt);
    }
    if (R.phase === 'collapse') { R.collapseT += realDt; if (R.collapseT > 3.2) finishRun(false); }
    if (R.phase === 'cash') { R.cashT += realDt; if (R.cashT > 2.2) finishRun(true); }
    updateCrowd(dt);
    // camera
    const top = Math.min(towerTopY(), R.falling ? R.falling.y - 40 : 1e9);
    const cy = craneY() - 30;
    const span = GROUND_Y + 25 - cy;
    const zoom = U.clamp(H / Math.max(360, span), 0.22, 1);
    FX.cam.tzoom = R.phase === 'intro' ? 1.15 : R.phase === 'collapse' ? zoom * 0.9 : zoom;
    FX.cam.tx = PX;
    FX.cam.ty = GROUND_Y + 25 - (H / 2) / FX.cam.tzoom;
  }

  function encore() {
    R.encoreUsed = true; R.lives = 1;
    for (let i = world.bodies.length - 1; i >= 0; i--) { const b = world.bodies[i]; if (b.userData && b.userData.placed && !b.isStatic && (b.speed > 30 || !b.userData.settled)) { FX.burst(b.x, b.y, 10, { color: ['#c77dff', '#fff'], speed: 120 }); world.remove(b); } }
    R.falling = null; R.canDrop = true;
    FX.title('ENCORE!', { size: 26, color: '#c77dff', dur: 1.8, sub: 'ONE MORE CHANCE' }); FX.flash('#c77dff', 0.6); Audio.play('perk'); FX.hitstop(0.25);
    UI.refreshRunHUD();
  }

  function collapse(reason) {
    if (R.phase !== 'play') return;
    R.phase = 'collapse'; R.collapseT = 0;
    FX.freeze(0.4); FX.hitstop(0.4);
    FX.setSlowmo(0.3, false); FX.vignette(0.9); FX.letterbox(true); FX.cine.tDesat = 1;
    FX.flash('#ff4b4b', 0.7); FX.shake(14); FX.punch(0.15);
    FX.title('COLLAPSE', { size: 34, color: '#ff4b4b', dur: 3, shake: 3, delay: 0.35, sub: reason });
    Audio.play('collapse');
    setTimeout(() => Audio.play('cheer', 0.4), 300);
    G.stats.collapses++;
    UI.hideRunHUD();
  }
  function cashOut() {
    if (!R.active || R.phase !== 'play' || R.perkPending) return;
    R.phase = 'cash'; R.cashT = 0;
    let bonus = Math.round(R.placementTotal * (R.peak / 8) * (G.skills.legend ? 2 : 1) + crowd.length * 2);
    R.bonus = bonus; G.money += bonus; R.earned += bonus; G.stats.earned += bonus;
    FX.letterbox(true); FX.title('CASH OUT!', { size: 28, color: '#7dff3f', dur: 2.2, sub: '+' + U.money(bonus) + ' BONUS' });
    FX.confettiBurst(W / 2, H * 0.35, 120); Audio.play('cash'); Audio.play('cheer', 1); FX.flash('#fff', 0.5);
    for (let i = 0; i < 20; i++) FX.spawn({ x: U.rand(0, W), y: -10, vx: U.rand(-20, 20), vy: U.rand(80, 200), life: 2, size: 4, color: '#ffd23f', gravity: 100, layer: 1 });
    UI.hideRunHUD();
  }
  function finishRun(cashed) {
    const sp = Math.floor(R.peak / 3) + (Math.floor(R.peak) >= G.record && R.peak >= 4 ? 2 : 0) + (G.skills.legend ? 2 : 0);
    G.sp += sp; G.runs = (G.runs || 0) + 1;
    G.stats.bestEarned = Math.max(G.stats.bestEarned || 0, R.earned);
    const summary = { cashed, peak: R.peak, settled: R.settled, earned: R.earned, bonus: R.bonus || 0, sp, crowd: crowd.length, perks: R.perks.slice(), lost: R.lost, cubesUsed: R.cubesUsed };
    R.active = false; R.phase = 'idle';
    FX.setSlowmo(1, true); FX.vignette(0); FX.letterbox(false); FX.cine.tDesat = 0;
    world.clear(); crowd.length = 0;
    Audio.setMode('pen');
    UI.showSummary(summary);
    UI.onRunEnd();
    Main.save();
  }

  // ---- input ------------------------------------------------------------
  function click() { if (R.active && R.phase === 'play') drop(); }
  function key(k) {
    if (k === ' ') { click(); return true; }
    if (k === 'r' || k === 'R') { R.rotate = !R.rotate; Audio.play('click'); return true; }
    const n = parseInt(k); if (n >= 1 && n <= 9) { const t = CUBE_ORDER.filter((c) => available(c) > 0)[n - 1]; if (t) { G.selectedCube = t; UI.refreshCubeBar(); Audio.play('click'); } return true; }
    return false;
  }

  // ---- rendering --------------------------------------------------------
  function render(g) {
    const cam = FX.cam;
    // background (screen space)
    const grd = g.createLinearGradient(0, 0, 0, H); grd.addColorStop(0, '#120c24'); grd.addColorStop(0.6, '#3a1d5c'); grd.addColorStop(1, '#7a2d5a');
    g.fillStyle = grd; g.fillRect(0, 0, W, H);
    // stars
    g.fillStyle = '#fff'; for (let i = 0; i < 50; i++) { const sx = (i * 97.3) % W, sy = (i * 53.7) % (H * 0.6); g.globalAlpha = 0.4 + 0.5 * Math.sin(G.time * 2 + i); g.fillRect(sx, sy, 1.5, 1.5); } g.globalAlpha = 1;
    // spotlights
    if (R.active) { for (const l of lights) { l.a += 0.01 * (l.x < 320 ? 1 : -1); const ang = Math.sin(G.time * 0.7 + l.a) * 0.5; g.save(); g.translate(l.x, H); g.rotate(ang); g.fillStyle = 'rgba(255,240,180,0.08)'; g.beginPath(); g.moveTo(0, 0); g.lineTo(-40, -H * 1.4); g.lineTo(40, -H * 1.4); g.closePath(); g.fill(); g.restore(); } }
    // city parallax
    g.fillStyle = '#1b1030'; for (const c of cityscape) { const px = ((c.x - (cam.x - PX) * 0.1) % (W + 40) + W + 40) % (W + 40) - 20; g.fillRect(px, H * 0.62 - c.h * 0.6 + (cam.y - 180) * 0.05, c.w, c.h); }
    g.fillStyle = '#ffd97a'; for (const c of cityscape) { const px = ((c.x - (cam.x - PX) * 0.1) % (W + 40) + W + 40) % (W + 40) - 20; for (let k = 0; k < 3; k++) if ((c.x * 7 + k * 13) % 5 < 2) g.fillRect(px + 4 + k * 6, H * 0.62 - c.h * 0.6 + (cam.y - 180) * 0.05 + 6 + (k * 11) % 20, 2, 2); }

    // world space
    g.save();
    g.translate(W / 2 + cam.shakeX, H / 2 + cam.shakeY); g.scale(cam.zoom, cam.zoom); g.translate(-cam.x, -cam.y);
    // ground
    g.fillStyle = '#3a3448'; g.fillRect(cam.x - W / cam.zoom, GROUND_Y, W * 2 / cam.zoom, 400);
    g.fillStyle = '#2c2838'; for (let x = -2000; x < 2000; x += 40) g.fillRect(x, GROUND_Y + 8, 20, 3);
    g.fillStyle = '#4a4460'; g.fillRect(cam.x - W / cam.zoom, GROUND_Y, W * 2 / cam.zoom, 3);
    // pedestal
    const pw = platWidth();
    g.fillStyle = '#6a6480'; g.fillRect(PX - pw / 2 + 10, PLAT_Y + PLAT_H, pw - 20, GROUND_Y - PLAT_Y - PLAT_H);
    g.fillStyle = '#524c66'; g.fillRect(PX - pw / 2 + 10, PLAT_Y + PLAT_H, 6, GROUND_Y - PLAT_Y - PLAT_H); g.fillRect(PX + pw / 2 - 16, PLAT_Y + PLAT_H, 6, GROUND_Y - PLAT_Y - PLAT_H);
    // height guide lines
    if (R.active) {
      g.font = '7px "Press Start 2P", monospace'; g.textAlign = 'right'; g.textBaseline = 'middle';
      for (let h = 5; h <= Math.max(10, R.peak + 10); h += 5) { const y = PLAT_Y - h * CUBE_SIZE; g.strokeStyle = h <= R.height ? 'rgba(125,255,63,0.35)' : 'rgba(255,255,255,0.15)'; g.setLineDash([4, 6]); g.lineWidth = 1; g.beginPath(); g.moveTo(PX - 140, y); g.lineTo(PX + 140, y); g.stroke(); g.setLineDash([]); g.fillStyle = h <= G.record && G.record > 0 && h === G.record ? '#ffd23f' : 'rgba(255,255,255,0.5)'; g.fillText((h === G.record ? '★ ' : '') + h, PX - 146, y); }
    }
    // platform
    if (platform) { g.save(); g.translate(platform.x, platform.y); g.fillStyle = '#8a84a0'; g.fillRect(-pw / 2, -PLAT_H / 2, pw, PLAT_H); g.fillStyle = '#b8b2cc'; g.fillRect(-pw / 2, -PLAT_H / 2, pw, 3); g.fillStyle = '#5a5470'; g.fillRect(-pw / 2, PLAT_H / 2 - 3, pw, 3); g.fillStyle = '#ffd23f'; for (let x = -pw / 2; x < pw / 2; x += 12) g.fillRect(x, -PLAT_H / 2 + 4, 6, 2); g.restore(); }
    // drop guide
    if (R.active && R.phase === 'play' && G.skills.guide && !R.falling) {
      const def = CUBES[G.selectedCube || 'normal']; const hw = def.w * CUBE_SIZE * R.sizeMult / 2;
      let hitY = PLAT_Y; for (const b of world.bodies) { if (!b.userData || b.userData.platform) continue; const bb = b.aabb(); if (bb.maxX > R.craneX - hw && bb.minX < R.craneX + hw) hitY = Math.min(hitY, bb.minY); }
      g.strokeStyle = 'rgba(63,224,255,0.5)'; g.setLineDash([3, 5]); g.lineWidth = 1; g.beginPath(); g.moveTo(R.craneX - hw, craneY() + 20); g.lineTo(R.craneX - hw, hitY); g.moveTo(R.craneX + hw, craneY() + 20); g.lineTo(R.craneX + hw, hitY); g.stroke(); g.setLineDash([]);
      g.fillStyle = 'rgba(63,224,255,0.35)'; g.fillRect(R.craneX - hw, hitY - 2, hw * 2, 2);
    }
    // cubes
    for (const b of world.bodies) {
      const ud = b.userData; if (!ud || ud.platform) continue;
      const def = CUBES[ud.type];
      g.save(); g.translate(b.x, b.y); g.rotate(b.angle);
      Sprites.drawCube(g, def, b.width, b.height, { face: ud.premium, outline: ud.bedrock ? '#c77dff' : b === R.falling ? '#fff' : (ud.premium ? '#ffd23f' : null) });
      if (b.adhesion > 0 && ud.type !== 'sticky') { g.fillStyle = 'rgba(197,138,42,0.35)'; g.fillRect(-b.width / 2, -b.height / 2, b.width, b.height); }
      g.restore();
      if (b === R.falling && b.vy > 60) { g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 1; for (let i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(b.x + i * b.width * 0.4, b.y - b.height / 2 - 4); g.lineTo(b.x + i * b.width * 0.4, b.y - b.height / 2 - 4 - Math.min(40, b.vy * 0.08)); g.stroke(); } }
    }
    // crane
    if (R.active && (R.phase === 'play' || R.phase === 'intro')) drawCrane(g);
    // crowd
    for (const p of crowd) {
      const img = (p.hat ? Sprites.peopleHat : Sprites.people)[p.c];
      const hop = (R.excite > 0 || R.phase === 'cash') ? Math.abs(Math.sin(G.time * 10 + p.ph)) * 4 : Math.sin(G.time * 2 + p.ph) * 0.5;
      g.drawImage(img, Math.round(p.x - 3), Math.round(p.y - 11 - hop));
      if (p.bubble > 0) { g.fillStyle = '#fff'; g.fillRect(p.x - 6, p.y - 22, 12, 7); g.fillStyle = '#1b1210'; g.font = '5px "Press Start 2P", monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(U.pick(['WOW', '!!!', 'OMG', 'GO!']), p.x, p.y - 18); }
    }
    // wind arrows
    if (R.wind.warn > 0 || R.wind.active) {
      const dir = R.wind.dir; g.fillStyle = R.wind.active ? 'rgba(63,224,255,0.8)' : `rgba(255,210,63,${0.4 + 0.4 * Math.sin(G.time * 20)})`;
      for (let i = 0; i < 5; i++) { const ax = PX - dir * 200 + dir * ((G.time * 200 + i * 60) % 300), ay = towerTopY() - 30 + i * 18 - 20; g.fillRect(ax, ay, dir * 14, 2); g.fillRect(ax + dir * 12, ay - 2, dir * 3, 6); }
    }
    FX.drawParticles(g, 0);
    FX.drawFloaters(g, true);
    g.restore();

    // screen-space overlays
    FX.drawParticles(g, 1);
    FX.drawConfetti(g);
    FX.drawFloaters(g, false);
    if (R.active) {
      // height ruler on right
      const rx = W - 26, ry0 = 40, ry1 = H - 40;
      g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(rx - 8, ry0 - 8, 30, ry1 - ry0 + 16);
      const maxH = Math.max(12, Math.ceil((R.peak + 4) / 4) * 4);
      g.fillStyle = '#5a5470'; g.fillRect(rx, ry0, 4, ry1 - ry0);
      const hy = ry1 - (R.height / maxH) * (ry1 - ry0), py = ry1 - (R.peak / maxH) * (ry1 - ry0), rec = ry1 - (Math.min(maxH, G.record) / maxH) * (ry1 - ry0);
      g.fillStyle = '#7dff3f'; g.fillRect(rx, hy, 4, ry1 - hy);
      g.fillStyle = '#fff'; g.fillRect(rx - 3, py, 10, 1);
      if (G.record > 0) { g.fillStyle = '#ffd23f'; g.fillRect(rx - 4, rec, 12, 2); g.font = '6px "Press Start 2P", monospace'; g.textAlign = 'right'; g.textBaseline = 'middle'; g.fillText('BEST', rx - 6, rec); }
      g.font = '8px "Press Start 2P", monospace'; g.textAlign = 'center'; g.textBaseline = 'top'; g.fillStyle = '#fff'; g.fillText(R.height.toFixed(1), rx + 2, ry1 + 6);
      // wind warning banner
      if (R.wind.warn > 0) { g.font = '10px "Press Start 2P", monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = Math.sin(G.time * 20) > 0 ? '#ffd23f' : '#ff4b4b'; g.fillText((R.wind.dir > 0 ? '>>> ' : '<<< ') + 'WIND INCOMING' + (R.wind.dir > 0 ? ' >>>' : ' <<<'), W / 2, 30); }
      if (R.phase === 'play' && R.rotate) { g.font = '7px "Press Start 2P", monospace'; g.textAlign = 'center'; g.fillStyle = '#3fe0ff'; g.fillText('ROTATED (R)', W / 2, H - 14); }
      if (R.phase === 'play' && !G.selectedCube && !R.falling) { g.font = '9px "Press Start 2P", monospace'; g.textAlign = 'center'; g.fillStyle = '#ff4b4b'; g.fillText('NO CUBES LEFT - CASH OUT!', W / 2, 52); }
    }
  }
  function drawCrane(g) {
    const cy = craneY(); const cam = FX.cam;
    g.fillStyle = '#2c2838'; g.fillRect(cam.x - W / cam.zoom, cy - 26, W * 2 / cam.zoom, 6);
    g.fillStyle = '#ffd23f'; for (let x = -3000; x < 3000; x += 24) g.fillRect(x, cy - 25, 12, 4);
    g.fillStyle = '#e04b4b'; g.fillRect(R.craneX - 12, cy - 22, 24, 12); g.fillStyle = '#8a2f24'; g.fillRect(R.craneX - 12, cy - 13, 24, 3);
    g.fillStyle = '#1b1210'; g.fillRect(R.craneX - 1, cy - 10, 2, 16);
    // claw
    g.fillStyle = '#b8b2cc'; g.fillRect(R.craneX - 10, cy + 4, 20, 3); g.fillRect(R.craneX - 10, cy + 4, 3, 8); g.fillRect(R.craneX + 7, cy + 4, 3, 8);
    // held cube
    if (!R.falling && R.canDrop && G.selectedCube && R.phase === 'play') {
      const def = CUBES[G.selectedCube]; let w = def.w * CUBE_SIZE * R.sizeMult, h = def.h * CUBE_SIZE * R.sizeMult; if (R.rotate) { const t = w; w = h; h = t; }
      const sway = (R.craneX - R.lastCraneX) * 0.02;
      g.save(); g.translate(R.craneX, cy + 18 + h / 2 - 12); g.rotate(-sway);
      Sprites.drawCube(g, def, w, h, { face: (G.premium[G.selectedCube] || 0) > 0, outline: 'rgba(255,255,255,0.6)' });
      g.restore();
    }
  }

  return {
    init(g) { G = g; resetWorld(); },
    R, world, update, render, click, key, drop, cashOut, newRun, totalCubes, available, autoSelectCube,
    setMouse(x) { mouseX = x; },
    get active() { return R.active; },
    get crowdSize() { return crowd.length; },
  };
})();
