// ---- The Great Stack: pile poop as high as it will go ---------------------
// There are no runs here and nothing to lose. The tower you build is still
// standing when you come back, the crowd keeps paying rent on it, and a cube
// that falls off is caught by a wombat and handed straight back to you. All
// the progression is in how high the thing gets.
const Tower = (() => {
  let G = null;
  const W = 640, H = 360;
  const PX = 320, PLAT_Y = 264, GROUND = 322, PLAT_H = 16;
  const world = new Physics.World();
  let platform = null;
  const R = {
    open: false, height: 0, peak: 0, settled: 0, streak: 0, combo: 0, comboT: 0,
    craneX: PX, lastCraneX: PX, craneT: 0, falling: null, canDrop: true, dropCd: 0, rot: false,
    session: 0, acc: 0, rate: 0, excite: 0, caught: 0, cheerT: 0, rankT: 0, rankShown: null,
  };
  const crowd = [], flakes = [];
  let physAcc = 0;

  function platWidth() { return (G.fruits.wideplinth ? 150 : 112) + (G.up.shrine || 0) * 11; }
  function crowdCap() { return 12 + 5 * (G.up.seats || 0); }
  const lvl = (k) => G.up[k] || 0;

  // ---- the world ----------------------------------------------------------
  function resetWorld() {
    world.clear();
    platform = world.add(new Physics.Body({
      x: PX, y: PLAT_Y + PLAT_H / 2, width: platWidth(), height: PLAT_H,
      isStatic: true, friction: 0.94, userData: { platform: true },
    }));
    platform.baseX = PX;
    world.gravity = 620; world.iterations = 44; world.maxFall = 170;
    world.onImpact = onImpact;
    world.forceFn = null;
    R.falling = null; R.canDrop = true; R.dropCd = 0;
  }

  // ---- the tower persists between visits ----------------------------------
  function serialise() {
    // Only snapshot a tower that is standing still: a shot taken mid-topple
    // would be restored mid-topple, and the pile would fall again on arrival.
    for (const b of world.bodies) {
      const ud = b.userData;
      if (!ud || ud.platform) continue;
      if (b.speed > 18 || b.restTime < 0.4) return;
    }
    const out = [];
    for (const b of world.bodies) {
      const ud = b.userData;
      if (!ud || ud.platform || !ud.settled) continue;
      if (b.y > PLAT_Y + 20) continue;                 // anything on the floor is loose
      out.push({ t: ud.type, b: ud.blessed ? 1 : 0, x: Math.round(b.x * 10) / 10,
        y: Math.round(b.y * 10) / 10, a: Math.round(b.angle * 100) / 100 });
    }
    G.stack = out;
  }
  function rebuild() {
    resetWorld();
    for (const s of (G.stack || [])) {
      if (!OFFERINGS[s.t]) continue;
      const b = make(s.t, !!s.b, s.x, s.y);
      b.angle = s.a || 0;
      b.userData.settled = true;
      b.userData.eye = U.rand(0, TAU);
      b.restTime = 2;
      world.add(b);
    }
    R.settled = world.bodies.length - 1;
    R.height = computeHeight();
    R.peak = R.height;
  }
  function enter() {
    R.open = true; R.session = 0; R.combo = 0; R.comboT = 0; R.caught = 0;
    rebuild();
    crowd.length = 0; flakes.length = 0;
    autoSelect();
    Audio.setMode('tower');
    const rk = rankAt(Math.floor(G.record || 0));
    FX.title(rk ? rk.name.toUpperCase() : 'THE GREAT STACK',
      { style: 'slide', dur: 1.7, size: 16, color: PAL.gold4, sub: R.height >= 1 ? R.height.toFixed(0) + ' HIGH' : 'stack it up' });
  }
  function leave() {
    if (!R.open) return;
    serialise();
    R.open = false;
    Audio.setMode('pen');
    Main.save();
  }

  function onImpact(a, b, impulse, c) {
    const s = impulse / 800;
    if (s > 0.22) {
      const x = c ? c.x : (a.x + b.x) / 2, y = c ? c.y : (a.y + b.y) / 2;
      FX.dust(x, y, Math.min(12, Math.round(s * 5)), PAL.soil3);
      FX.shake(Math.min(5, s * 1.2));
      Audio.play('thud', Math.min(2, s));
      for (const bd of [a, b]) if (bd.userData && !bd.userData.platform) bd.userData.sq = Math.min(0.42, s * 0.32);
      if (s > 0.7) FX.ring(x, y, Math.min(26, s * 16));
    }
    if (R.falling && (a === R.falling || b === R.falling)) landed(R.falling);
  }
  function landed(b) {
    b.gravityScale = 1; b.w *= 0.35;
    R.falling = null; R.canDrop = true; R.dropCd = 0.12;
    FX.burst(b.x, b.y, 8, { color: [PAL.cream, OFFERINGS[b.userData.type].color], speed: 70, gravity: 190, life: 0.35, size: 3 });
  }

  // ---- the bag ------------------------------------------------------------
  function available(t) { return (G.offerings[t] || 0) + (G.blessed[t] || 0); }
  function total() { return OFFER_ORDER.reduce((s, k) => s + available(k), 0); }
  function autoSelect() {
    if (G.selOffer && available(G.selOffer) > 0) return;
    G.selOffer = OFFER_ORDER.find((k) => available(k) > 0) || null;
    UI.refreshTray();
  }
  function give(type, blessed) {
    if (blessed) G.blessed[type] = (G.blessed[type] || 0) + 1;
    else G.offerings[type] = (G.offerings[type] || 0) + 1;
    autoSelect(); UI.refreshTray(); UI.refreshRunHUD();
  }

  function make(type, blessed, x, y) {
    const def = OFFERINGS[type];
    const sz = CUBE_SIZE;
    let w = def.w * sz, h = def.h * sz;
    if (R.rot) { const t = w; w = h; h = t; }
    let friction = def.friction * 1.45 * (1 + lvl('grip') * 0.12);
    if (blessed) friction *= 1.12;
    return new Physics.Body({
      x, y, width: w, height: h, density: def.density, friction,
      restitution: def.restitution * 0.4, adhesion: def.adhesion + 900 + lvl('grip') * 320,
      angularDamping: 0.42, linearDamping: 0.08,
      userData: { type, blessed, placed: true, settled: false, sq: 0, eye: U.rand(0, TAU), blink: U.rand(2, 7) },
    });
  }
  function drop() {
    if (!R.open || G.paused) return;
    if (!R.canDrop || R.falling) return;
    const type = G.selOffer;
    if (!type || available(type) <= 0) { autoSelect(); Audio.play('error'); return; }
    let blessed = false;
    if ((G.blessed[type] || 0) > 0) { G.blessed[type]--; blessed = true; } else G.offerings[type]--;
    const b = make(type, blessed, R.craneX, craneY() + 22);
    b.vx = (R.craneX - R.lastCraneX) * 60 * 0.07; b.vy = 24;
    if (!G.fruits.steadyclaw) b.angle = U.rand(-0.05, 0.05);
    world.add(b);
    R.falling = b; R.canDrop = false;
    Audio.play('whoosh');
    autoSelect(); UI.refreshTray(); UI.refreshHUD();
  }
  function craneY() { return towerTop() - 70; }
  function towerTop() {
    let top = PLAT_Y;
    for (const b of world.bodies) if (b.userData && b.userData.placed && b.restTime > 0.05 && b.y < PLAT_Y) top = Math.min(top, b.top());
    return top;
  }
  function computeHeight() {
    let top = PLAT_Y;
    for (const b of world.bodies) if (b.userData && b.userData.settled && b.restTime > 0.05 && b.y < PLAT_Y + 40) top = Math.min(top, b.top());
    return Math.max(0, Math.round(((PLAT_Y - top) / CUBE_SIZE) * 100 + 0.4) / 100);
  }

  // ---- money --------------------------------------------------------------
  // Two taps. Each cube pays when it settles, and the crowd pays by the second
  // for as long as the tower stands. Height drives both.
  function payMult() {
    let m = 1 + 0.14 * lvl('seats');
    if (G.blessings.wombonysus) m *= 2;
    if ((G.up.cart || 0) >= 3) m *= 1.1;
    return m;
  }
  function cubePay(b) {
    const ud = b.userData, def = OFFERINGS[ud.type];
    let v = def.value * (ud.blessed ? 2 : 1);
    v *= 1 + 0.26 * R.height;                       // every storey is worth more
    v *= 1 + 0.08 * R.combo;                        // and a clean run of drops pays
    return Math.max(1, Math.round(v * payMult()));
  }
  function tipRate() {
    if (R.height < 0.5) return 0;
    return (0.6 + R.height * 0.85) * (1 + tipBonus(G) + trophyBonus(G)) * payMult() * (1 + crowd.length * 0.04);
  }
  function earn(a, x, y, big) {
    G.wd += a; R.session += a; G.stats.earned += a;
    if (x !== undefined) {
      FX.float(x, y, '+' + U.fmt(a), { color: PAL.gold4, size: big ? 10 : 8, world: true, life: 1.1 });
      // the camera is doing the work here, so the coins are handed over in
      // screen space or they would fly off with the scenery
      const cam = FX.cam;
      FX.coinBurst((x - cam.x) * cam.zoom + W / 2, (y - cam.y) * cam.zoom + H / 2,
        big ? 3 : 2, false);
    }
    UI.refreshHUD();
  }

  function onSettled(b) {
    b.userData.settled = true;
    R.settled++; R.streak++;
    R.combo = Math.min(12, R.combo + 1); R.comboT = 5;
    R.height = computeHeight();
    const p = cubePay(b);
    earn(p, b.x, b.y - b.height / 2 - 8, true);
    R.excite = Math.min(2, R.excite + 0.9);
    Audio.play('place'); Audio.play('coin');
    b.userData.sq = 0.34;
    if (R.combo >= 3) {
      FX.comic(b.x, b.y - b.height / 2 - 26, 'x' + R.combo, { ink: FX.COMIC_INK.yay, world: true });
    }
    if (Math.abs(b.x - PX) < 6 && R.height > 1) {
      FX.float(b.x, b.y - b.height / 2 - 24, 'NEAT!', { color: PAL.cyan3, size: 9, world: true });
      FX.sparkle(b.x, b.y, 10, PAL.cyan3); earn(Math.round(p * 0.5));
    }
    if (R.height > R.peak) R.peak = R.height;
    checkRank();
    serialise();
    UI.refreshRunHUD();
  }
  // The ladder: a height you have never reached pays once, and lifts the tip
  // rate for good.
  function checkRank() {
    const h = Math.floor(R.peak);
    if (h <= (G.record || 0)) return;
    const was = G.record || 0;
    G.record = h;
    for (const k of STACK_RANKS) {
      if (k.h > was && k.h <= h) {
        earn(k.pay);
        R.rankShown = k; R.rankT = 3;
        FX.title(k.name.toUpperCase(), { size: 20, color: PAL.gold4, dur: 2.4, sub: '+' + U.fmt(k.pay) + ' W$' });
        FX.confettiBurst(W / 2, H * 0.32, 120);
        FX.flash(U.rgba(PAL.gold4, 0.4), 0.35); FX.punch(0.12);
        Audio.play('record'); Audio.play('cheer', 1);
        R.cheerT = 2.4;
      }
    }
    if (h > was) UI.refreshRunHUD();
  }

  // ---- the crowd ----------------------------------------------------------
  function seat(i) {
    const side = i % 2 ? 1 : -1, k = Math.floor(i / 2);
    const col = k % 6, row = Math.floor(k / 6) % 3;
    return { x: PX + side * (118 + col * 32 + row * 11 + ((i * 37) % 9)), y: GROUND - 2 - col * 8 - row * 5 };
  }
  function updateCrowd(dt) {
    let f = 1;
    for (const d of DECOR) if (G.decor[d.key] && d.favor) f += d.favor;
    const want = Math.min(crowdCap(), Math.floor(2 + Math.pow(Math.max(0, R.height), 1.4) * 1.2 * f));
    while (crowd.length < want) {
      const i = crowd.length, s = seat(i);
      crowd.push({ x: s.x + (s.x > PX ? 220 : -220), tx: s.x, y: s.y, hop: 0,
        pelt: U.pick(FUR.filter((p) => !p.rare)).key, ph: U.rand(0, TAU) });
    }
    while (crowd.length > want + 1) crowd.pop();
    R.rate = tipRate();
    R.acc += R.rate * dt;
    if (R.acc >= 1) { const a = Math.floor(R.acc); R.acc -= a; G.wd += a; R.session += a; G.stats.earned += a; UI.refreshHUD(); }
    R.excite = Math.max(0, R.excite - dt);
    R.cheerT = Math.max(0, R.cheerT - dt);
    for (const c of crowd) {
      c.x = U.lerp(c.x, c.tx, 1 - Math.pow(0.02, dt));
      if (R.cheerT > 0 || R.excite > 0.6) c.hop = Math.min(1, c.hop + dt * 3);
      else c.hop = Math.max(0, c.hop - dt * 2);
    }
    // stink motes drifting off the pile: free atmosphere, and it reads as cute
    if (R.height >= 1 && Math.random() < dt * (2 + R.height * 0.25) && flakes.length < 26) {
      flakes.push({ x: PX + U.rand(-60, 60), y: PLAT_Y - R.height * CUBE_SIZE * U.rand(0, 1), t: 0,
        life: U.rand(1.6, 3), vx: U.rand(-9, 9), vy: U.rand(-16, -6), r: U.rand(2, 4) });
    }
    for (let i = flakes.length - 1; i >= 0; i--) {
      const k = flakes[i]; k.t += dt;
      k.x += k.vx * dt; k.y += k.vy * dt; k.vx += Math.sin(k.t * 2.4) * 6 * dt;
      if (k.t >= k.life) flakes.splice(i, 1);
    }
  }

  // ---- tick ---------------------------------------------------------------
  function update(dt, realDt) {
    if (!R.open) { if (G.mode === 'rite') { FX.cam.tzoom = 1; FX.cam.tx = PX; FX.cam.ty = 180; } return; }
    if (!G.paused) {
      const steady = 1 - Math.min(0.75, lvl('crane') * 0.15);
      const sp = 1.3 * steady * (G.fruits.steadyclaw ? 0.78 : 1);
      R.craneT += dt * sp;
      const amp = lvl('crane') >= 5 ? 0 : Math.min(platWidth() * 0.52 + 16, 52 + R.height * 2.2);
      R.lastCraneX = R.craneX;
      R.craneX = lvl('crane') >= 5 ? U.clamp(G.pointer.x, PX - 150, PX + 150) : PX + Math.sin(R.craneT) * amp;
      if (R.dropCd > 0) R.dropCd -= dt;
      if (R.comboT > 0) { R.comboT -= dt; if (R.comboT <= 0) R.combo = 0; }
      if (R.rankT > 0) R.rankT -= realDt;
      physAcc += dt;
      const step = 1 / 180; let n = 0;
      while (physAcc >= step && n < 14) { world.step(step); physAcc -= step; n++; }
      if (n >= 14) physAcc = 0;
    }
    for (const b of world.bodies) if (b.userData && b.userData.sq) b.userData.sq = Math.max(0, b.userData.sq - realDt * 1.6);
    // A cube that leaves the tower is caught below and handed back. Nothing is
    // ever lost, so a topple costs you time and nothing else.
    for (let i = world.bodies.length - 1; i >= 0; i--) {
      const b = world.bodies[i], ud = b.userData;
      if (!ud || ud.platform) continue;
      const onFloor = ud.settled && b.restTime > 0.6 && b.y > PLAT_Y + 24;
      if (b.y > GROUND + 60 || onFloor) {
        world.remove(b);
        if (b === R.falling) landed(b);
        give(ud.type, ud.blessed);
        R.caught++; R.combo = 0;
        const cx = U.clamp(b.x, PX - 150, PX + 150);
        FX.float(cx, GROUND - 26, 'CAUGHT', { color: PAL.cyan3, size: 8, world: true, life: 0.9 });
        FX.burst(cx, GROUND - 16, 9, { color: [PAL.cream, PAL.cyan3], speed: 80, life: 0.5 });
        Audio.play('pop');
        for (const c of crowd) if (Math.abs(c.x - cx) < 90) c.hop = 1;
        continue;
      }
      if (!ud.settled && b !== R.falling && b.restTime > 0.45) onSettled(b);
    }
    R.height = computeHeight();
    if (R.height > R.peak) { R.peak = R.height; checkRank(); }
    updateCrowd(dt);
    // the camera holds the whole tower and the crane in frame
    const cy = craneY() - 30;
    const span = GROUND + 50 - cy;
    const zoom = U.clamp(H / Math.max(286, span), 0.2, 1.26);
    FX.cam.tzoom = zoom;
    FX.cam.tx = PX;
    FX.cam.ty = GROUND + 50 - (H / 2) / FX.cam.tzoom;
  }

  // ---- input --------------------------------------------------------------
  function click(x, y) {
    if (!R.open) return;
    drop();
  }
  function key(k) {
    if (k === ' ') { drop(); return true; }
    if (k === 'r' || k === 'R') { R.rot = !R.rot; Audio.play('click'); return true; }
    const n = parseInt(k);
    if (n >= 1 && n <= 9) {
      const t = OFFER_ORDER.filter((c) => available(c) > 0)[n - 1];
      if (t) { G.selOffer = t; UI.refreshTray(); UI.refreshRunHUD(); Audio.play('click'); }
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
    for (let i = 0; i < 8; i++) {
      g.fillStyle = U.mix('#0f0b1c', '#2f2246', i / 7);
      g.fillRect(vx0, vy0 + (vh * i) / 8, vw, vh / 8 + 2);
      if (i < 7) Art.dither(g, vx0, vy0 + (vh * (i + 0.62)) / 8, vw, vh / 20, U.mix('#0f0b1c', '#2f2246', (i + 1) / 7), 0.5);
    }
    // cloud banks, so the sky is not an empty wash
    {
      const cr = Art.rng(771);
      for (let i = 0; i < 22; i++) {
        const cx3 = vx0 + cr() * vw, cy3 = vy0 + cr() * vh * 0.8, cw = 60 + cr() * 150;
        g.globalAlpha = 0.05 + cr() * 0.07;
        Art.ell(g, cx3, cy3, cw, 7 + cr() * 9, '#6a5a86');
        Art.ell(g, cx3 - cw * 0.3, cy3 - 5, cw * 0.5, 5 + cr() * 6, '#8a78a8');
      }
      g.globalAlpha = 1;
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
    // Two ranks of forest, dark enough to stay backdrop and thinned out in the
    // middle so the plinth has the clearing to itself.
    const gap = (x) => Math.min(1, Math.abs(x - PX) / 190);        // 0 in the centre
    for (let i = 0; i < 20; i++) {
      const tx = PX - 520 + i * 55;
      if (gap(tx + 34) < 0.34) continue;
      const img = Props.get('tree', `${['oak', 'gnarl', 'pine'][i % 3]}|${i % 4}|0.9`);
      const sc = 0.5 + (i % 3) * 0.09;
      g.drawImage(img, tx, GROUND - img.height * sc + 10, img.width * sc, img.height * sc);
    }
    for (let i = 0; i < 11; i++) {
      const tx = PX - 540 + i * 104;
      if (gap(tx + 44) < 0.62) continue;
      const img = Props.get('tree', `${['gnarl', 'pine', 'oak'][i % 3]}|${(i + 2) % 4}|0.78`);
      const sc = 0.82 + (i % 3) * 0.12;
      g.drawImage(img, tx, GROUND - img.height * sc + 16, img.width * sc, img.height * sc);
    }
    // one cold wash to sink the whole treeline behind the yard
    {                                      // the cold wash, as eight flat bands
      const oa = g.globalAlpha;
      for (let i = 0; i < 8; i++) {
        g.globalAlpha = oa * 0.55 * (1 - i / 8);
        Art.rect(g, vx0, GROUND - 150 + i * 20, vw, 21, '#1c142e');
        g.globalAlpha = oa * 0.2 * (i / 8);
        Art.rect(g, vx0, GROUND - 150 + i * 20, vw, 21, '#2c1c3a');
      }
      g.globalAlpha = oa;
    }
    // ground
    g.fillStyle = '#140f1e'; g.fillRect(vx0, GROUND, vw, vh);
    {                                      // packed dirt: grit, ruts and gravel
      const gr2 = Art.rng(4180);
      for (let i = 0; i < 1400; i++) {
        const x2 = vx0 + gr2() * vw, y2 = GROUND + gr2() * Math.min(vh, 260), k = gr2();
        g.fillStyle = k < 0.45 ? '#1b1526' : k < 0.78 ? '#241c32' : '#2f2540';
        g.fillRect(Math.round(x2), Math.round(y2), 1 + (k > 0.9 ? 1 : 0), 1);
      }
      for (let i = 0; i < 16; i++) {       // cart ruts scraped across the yard
        const y2 = GROUND + 8 + gr2() * 230, w2 = 60 + gr2() * 200;
        g.fillStyle = '#100c1a'; g.fillRect(Math.round(vx0 + gr2() * vw), Math.round(y2), Math.round(w2), 1);
        g.fillStyle = '#2b2340'; g.fillRect(Math.round(vx0 + gr2() * vw), Math.round(y2 + 1), Math.round(w2 * 0.7), 1);
      }
    }
    g.fillStyle = '#1d1728'; Art.ell(g, PX, GROUND + 12, 300, 34);
    for (let i = -10; i <= 10; i++) {
      const cx2 = PX + i * 34;
      g.fillStyle = i % 2 === 0 ? PAL.stone2 : PAL.stone1;
      g.fillRect(cx2 - 17, GROUND - 7, 34, 10);
      g.fillStyle = i % 2 === 0 ? PAL.stone3 : PAL.stone0;
      g.fillRect(cx2 - 17, GROUND + 3, 34, 3);
    }
    g.fillStyle = 'rgba(0,0,0,0.34)'; g.fillRect(vx0, GROUND - 7, vw, 3);
    // braziers out of the way, throwing light back at the pile
    for (const s of [-1, 1]) {
      const bx = PX + s * 236;
      const img = Props.get('brazier');
      g.drawImage(img, bx - img.width / 2, GROUND - img.height + 4);
      const fl = 0.5 + 0.5 * Math.sin(G.time * 6 + s);
      Art.glow(g, bx, GROUND - 30, 92 + fl * 20, '#e0705a', 0.36 + fl * 0.16, 5);
    }
    // The stands you paid for: stepped timber bleachers either side, one more
    // tier for every level, so the upgrade is something you can see.
    const seats = lvl('seats');
    if (seats > 0) {
      for (const sd of [-1, 1]) {
        const rows = Math.min(6, seats);
        for (let t = rows - 1; t >= 0; t--) {           // back rows first
          const y = GROUND - 14 - t * 15;
          const xa = PX + sd * (126 + t * 38), xb = xa + sd * 44;
          const x = Math.min(xa, xb);
          g.fillStyle = '#3a2a1a'; g.fillRect(x, y, 44, GROUND - y);       // the riser
          g.fillStyle = '#6a4c2c'; g.fillRect(x, y, 44, 6);                // the plank
          g.fillStyle = '#8a6840'; g.fillRect(x, y, 44, 2);
          g.fillStyle = 'rgba(0,0,0,0.42)'; g.fillRect(x, y + 6, 44, 3);
          g.fillStyle = '#241708';                                          // legs
          g.fillRect(x + 3, y + 9, 3, GROUND - y - 9);
          g.fillRect(x + 38, y + 9, 3, GROUND - y - 9);
        }
        // a rail along the back of the top row
        const ty = GROUND - 14 - (Math.min(6, seats) - 1) * 15;
        const rx = PX + sd * (126 + (Math.min(6, seats) - 1) * 38);
        g.fillStyle = '#6a4c2c';
        g.fillRect(Math.min(rx, rx + sd * 44), ty - 13, 44, 3);
        g.fillRect(Math.min(rx, rx + sd * 44) + (sd > 0 ? 41 : 0), ty - 13, 3, 13);
      }
    }
    // a moonlit pool of light on the pavement, so the plinth has a stage
    {                                      // the stage pool, as flat pixel ovals
      const oa = g.globalAlpha;
      for (let i = 5; i >= 1; i--) {
        g.globalAlpha = oa * 0.13 * (1 - (i - 1) / 5);
        Art.ell(g, PX, GROUND - 8, 210 * (i / 5), 52 * (i / 5), '#b4ccff');
      }
      g.globalAlpha = oa;
    }
    // height rungs, and the next rank marked in gold
    const nx = nextRank(Math.max(Math.floor(R.peak), G.record || 0));
    for (let h = 5; h <= Math.max(15, R.peak + 10); h += 5) {
      const y = PLAT_Y - h * CUBE_SIZE;
      g.fillStyle = h <= R.height ? 'rgba(132,187,89,0.4)' : 'rgba(253,243,220,0.14)';
      for (let x = PX - 170; x < PX + 170; x += 13) g.fillRect(Math.round(x), Math.round(y), 5, 1);
      Font.draw(g, String(h), PX - 178, y - 4, { scale: 1, align: 'right', color: 'rgba(253,243,220,0.45)' });
    }
    if (nx) {
      const y = PLAT_Y - nx.h * CUBE_SIZE;
      g.fillStyle = 'rgba(216,165,47,0.6)';
      for (let x = PX - 176; x < PX + 176; x += 15) g.fillRect(Math.round(x), Math.round(y) - 1, 9, 2);
      Font.draw(g, nx.name.toUpperCase() + '  ' + nx.h, PX - 176, y - 6, { scale: 1, color: PAL.gold4, shadow: '#120c18' });
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
      g.fillStyle = PAL.div3; for (let x = -pw / 2 + 5; x < pw / 2 - 5; x += 18) g.fillRect(x, -PLAT_H / 2 + 5, 9, 3);
      g.restore();
    }
    // landing guide
    if (G.fruits.seersight && !R.falling && G.selOffer) {
      const def = OFFERINGS[G.selOffer];
      const hw = (R.rot ? def.h : def.w) * CUBE_SIZE / 2;
      let hy = PLAT_Y;
      for (const b of world.bodies) {
        if (!b.userData || b.userData.platform) continue;
        const bb = b.aabb();
        if (bb.maxX > R.craneX - hw && bb.minX < R.craneX + hw) hy = Math.min(hy, bb.minY);
      }
      g.fillStyle = 'rgba(121,220,237,0.5)';
      for (let y2 = craneY() + 24; y2 < hy; y2 += 8) {
        g.fillRect(Math.round(R.craneX - hw), Math.round(y2), 1, 3);
        g.fillRect(Math.round(R.craneX + hw), Math.round(y2), 1, 3);
      }
      g.fillStyle = 'rgba(121,220,237,0.35)'; g.fillRect(R.craneX - hw, hy - 2, hw * 2, 2);
    }
    // the pile
    for (const b of world.bodies) {
      const ud = b.userData; if (!ud || ud.platform) continue;
      const def = OFFERINGS[ud.type];
      const sq = ud.sq || 0;
      const br = ud.settled ? Math.sin(G.time * 2.2 + (ud.eye || 0)) * 0.012 : 0;
      g.save(); g.translate(b.x, b.y); g.rotate(b.angle); g.scale(1 + sq + br, 1 - sq - br);
      Sprites.drawCube(g, def, b.width, b.height, {
        blessed: ud.blessed,
        outline: b === R.falling ? PAL.cream : (ud.blessed ? PAL.div4 : null),
        face: ud.settled ? faceOf(ud) : 'fall',
      });
      g.restore();
    }
    // stink motes
    for (const k of flakes) {
      const a = Math.min(1, k.t / 0.3) * (1 - k.t / k.life);
      g.globalAlpha = a * 0.45;
      g.fillStyle = '#9fb07a';
      Art.ell(g, k.x, k.y, k.r, k.r * 0.8);
      g.globalAlpha = 1;
    }
    drawCrane(g);
    // the congregation
    for (const c of crowd) {
      const pose = c.hop > 0.4 ? 'happy' : 'pray';
      const fr = Math.floor(G.time * (pose === 'happy' ? 9 : 3) + c.ph);
      const lift = c.hop > 0.4 ? Math.abs(Math.sin(G.time * 7 + c.ph)) * 7 * c.hop : 0;
      Sprites.blit(g, c.x, c.y - lift, pose, fr, c.pelt, c.x > PX ? -1 : 1, 'adult', 1.35);
      if (c.hop > 0.7 && ((Math.floor(G.time * 2 + c.ph) % 5) === 0)) {
        Icons.blit(g, 'heart', c.x - 5, c.y - 34 - lift, 0.7);
      }
    }
    FX.drawParticles(g, 0);
    FX.drawFloaters(g, true);
    g.restore();
    FX.drawParticles(g, 1);
    FX.drawConfetti(g);
    FX.drawFloaters(g, false);
    overlay(g);
  }
  // the cube's little face: mostly happy, blinking now and then
  function faceOf(ud) {
    const t = G.time + ud.eye;
    return (t % ud.blink) < 0.16 ? 'blink' : 'happy';
  }
  function drawCrane(g) {
    const cy = craneY(), cam = FX.cam, vw = W / cam.zoom;
    g.fillStyle = PAL.bark0; g.fillRect(cam.x - vw, cy - 34, vw * 2, 5);
    g.fillStyle = PAL.bark0; g.fillRect(cam.x - vw, cy - 22, vw * 2, 5);
    g.fillStyle = PAL.bark1;
    for (let x = -3000; x < 3000; x += 24) { g.fillRect(x, cy - 30, 3, 9); g.fillRect(x + 12, cy - 30, 3, 9); }
    g.fillStyle = PAL.bark3; g.fillRect(cam.x - vw, cy - 34, vw * 2, 1);
    if (lvl('seats') > 0) {                            // bunting, one run per stand
      const cols = [PAL.red3, PAL.gold4, PAL.cyan3, PAL.moss5, PAL.div4];
      for (let i = -14; i <= 14; i++) {
        const fx = PX + i * 34, sag = Math.sin(i * 0.8 + G.time * 1.4) * 2;
        g.fillStyle = cols[(i + 14) % cols.length];
        Art.poly(g, [[fx - 6, cy - 17 + sag], [fx + 6, cy - 17 + sag], [fx, cy - 6 + sag]], g.fillStyle);
      }
    }
    g.fillStyle = PAL.stone2; g.fillRect(R.craneX - 15, cy - 25, 30, 15);
    g.fillStyle = PAL.stone4; g.fillRect(R.craneX - 15, cy - 25, 30, 2);
    g.fillStyle = PAL.div3; g.fillRect(R.craneX - 9, cy - 19, 18, 3);
    g.fillStyle = PAL.ink; g.fillRect(R.craneX - 1, cy - 10, 2, 19);
    g.fillStyle = PAL.stone3; g.fillRect(R.craneX - 13, cy + 6, 26, 5);
    g.fillStyle = PAL.stone2; g.fillRect(R.craneX - 13, cy + 6, 5, 10); g.fillRect(R.craneX + 8, cy + 6, 5, 10);
    if (!R.falling && R.canDrop && G.selOffer) {
      const def = OFFERINGS[G.selOffer];
      let w = def.w * CUBE_SIZE, h = def.h * CUBE_SIZE;
      if (R.rot) { const t = w; w = h; h = t; }
      const sway = (R.craneX - R.lastCraneX) * 0.02;
      g.save(); g.translate(R.craneX, cy + 22 + h / 2 - 12); g.rotate(-sway);
      Sprites.drawCube(g, def, w, h, { blessed: (G.blessed[G.selOffer] || 0) > 0, outline: 'rgba(253,243,220,0.6)', face: 'ready' });
      g.restore();
    }
  }
  // the gauge up the right-hand side
  function overlay(g) {
    const rx = W - 30, y0 = 54, y1 = H - 44;
    g.fillStyle = PAL.ink; g.fillRect(rx - 9, y0 - 10, 20, y1 - y0 + 20);
    g.fillStyle = PAL.bark1; g.fillRect(rx - 8, y0 - 9, 18, y1 - y0 + 18);
    g.fillStyle = PAL.bark0; g.fillRect(rx - 4, y0, 10, y1 - y0);
    const nx = nextRank(Math.max(Math.floor(R.peak), G.record || 0));
    const maxH = Math.max(12, nx ? nx.h : Math.ceil((R.peak + 4) / 4) * 4);
    g.fillStyle = PAL.bark3;
    for (let t = 0; t <= maxH; t += Math.max(2, Math.round(maxH / 8))) g.fillRect(rx - 8, Math.round(y1 - (t / maxH) * (y1 - y0)), 5, 1);
    const hy = y1 - Math.min(1, R.height / maxH) * (y1 - y0);
    g.fillStyle = PAL.moss3; g.fillRect(rx - 4, hy, 10, y1 - hy);
    g.fillStyle = PAL.moss5; g.fillRect(rx - 4, hy, 10, 2);
    if (G.record > 0) {
      const ry = y1 - Math.min(1, G.record / maxH) * (y1 - y0);
      g.fillStyle = PAL.gold4; g.fillRect(rx - 9, ry, 20, 2);
    }
    Font.draw(g, R.height.toFixed(1), rx + 1, y1 + 14, { scale: 1.4, align: 'center', color: PAL.cream, shadow: '#120c18' });
  }

  // What the crowd paid while you were away. The tower keeps standing and the
  // wombats keep tipping; it is the whole point of leaving it up.
  function idleHeight() {
    const list = G.stack || [];
    if (!list.length) return 0;
    let top = PLAT_Y;
    for (const s of list) {
      const def = OFFERINGS[s.t]; if (!def) continue;
      top = Math.min(top, s.y - (def.h * CUBE_SIZE) / 2);
    }
    return Math.max(0, (PLAT_Y - top) / CUBE_SIZE);
  }
  function offline(sec) {
    const h = idleHeight();
    if (h < 1) return 0;
    const rate = (0.6 + h * 0.85) * (1 + tipBonus(G) + trophyBonus(G)) * (1 + 0.14 * lvl('seats')) * 0.4;
    const got = Math.floor(rate * Math.min(sec, 14400));
    if (got > 0) { G.wd += got; G.stats.earned += got; }
    return got;
  }

  return {
    init(g) { G = g; resetWorld(); },
    offline, idleHeight,
    R, world, update, render, click, key, drop, total, available, autoSelect, enter, leave, serialise,
    get open() { return R.open; },
    get active() { return R.open; },
    get crowdSize() { return crowd.length; },
    get rate() { return R.rate; },
  };
})();
