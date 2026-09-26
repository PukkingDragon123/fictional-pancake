// ---- Wombat Hop: the game on your phone --------------------------------------------
// Jim's favourite. A wombat runs and runs; tap (or press space) to hop over
// logs and thistles, tap again in the air for a second hop, and grab the cubes
// floating along the way. It gets faster. A good run earns a few W$, because
// everyone out here has a sponsor.
const Hop = (() => {
  const W = 180, H = 240, GROUND = 196;
  let cv = null, g = null, raf = 0, last = 0, G = null;
  let st = null;
  function fresh() {
    return { t: 0, x: 0, sp: 70, y: 0, vy: 0, jumps: 0, over: false, started: false, score: 0, cubes: 0,
      obs: [], bits: [], nextObs: 1.2, nextCube: 0.8, dust: [], paid: 0, flash: 0 };
  }
  function mount(canvas, game) {
    G = game; cv = canvas; g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
    st = fresh();
    cv.onpointerdown = (e) => { e.preventDefault(); e.stopPropagation(); tap(); };
    last = performance.now();
    if (!raf) raf = requestAnimationFrame(loop);
  }
  function unmount() { cv = null; g = null; if (raf) cancelAnimationFrame(raf); raf = 0; }
  const mounted = () => !!cv && document.body.contains(cv);
  function tap() {
    if (!st) return;
    if (st.over) { if (st.t - st.overT > 0.5) { st = fresh(); st.started = true; } return; }
    st.started = true;
    if (st.y === 0 || st.jumps < 2) {
      st.vy = st.jumps === 0 ? -250 : -210; st.jumps++;
      Audio.play('bounce');
      for (let i = 0; i < 5; i++) st.dust.push({ x: 44, y: GROUND, vx: -20 - Math.random() * 40, vy: -Math.random() * 30, t: 0 });
    }
  }
  function key(e) { if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') { tap(); return true; } return false; }
  function loop(ms) {
    if (!mounted()) { raf = 0; cv = null; return; }
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.05, (ms - last) / 1000); last = ms;
    update(dt); draw();
  }
  function hit(a, b) { return Math.abs(a.x - b.x) < (a.w + b.w) / 2 && Math.abs(a.y - b.y) < (a.h + b.h) / 2; }
  function update(dt) {
    st.t += dt;
    if (!st.started || st.over) return;
    st.sp = Math.min(190, 70 + st.t * 4.2);
    st.x += st.sp * dt;
    st.score = Math.floor(st.x / 10) + st.cubes * 5;
    // the hop
    st.vy += 720 * dt; st.y = Math.min(0, st.y + st.vy * dt);
    if (st.y === 0) { st.vy = 0; st.jumps = 0; }
    // logs and thistles
    st.nextObs -= dt;
    if (st.nextObs <= 0) {
      const big = Math.random() < 0.35;
      st.obs.push({ x: W + 20, kind: big ? 'thistle' : 'log', w: big ? 14 : 22, h: big ? 26 : 12 });
      st.nextObs = U.rand(0.9, 1.8) * (110 / st.sp) * 1.4;
    }
    st.nextCube -= dt;
    if (st.nextCube <= 0) { st.bits.push({ x: W + 10, y: GROUND - 40 - Math.random() * 60, got: false }); st.nextCube = U.rand(0.6, 1.4); }
    const me = { x: 44, y: GROUND - 14 + st.y, w: 26, h: 22 };
    for (const o of st.obs) {
      o.x -= st.sp * dt;
      if (hit(me, { x: o.x, y: GROUND - o.h / 2, w: o.w - 4, h: o.h - 2 })) {
        st.over = true; st.overT = st.t; st.flash = 1; Audio.play('thud');
        if (!G.hopBest || st.score > G.hopBest) G.hopBest = st.score;
        const pay = Math.min(25, Math.floor(st.score / 40));
        if (pay > 0) { G.wd += pay; st.paid = pay; Audio.play('coin'); UI.refreshHUD(); }
        Main.save();
      }
    }
    for (const b of st.bits) {
      b.x -= st.sp * dt;
      if (!b.got && hit(me, { x: b.x, y: b.y, w: 10, h: 10 })) { b.got = true; st.cubes++; Audio.play('pop'); }
    }
    st.obs = st.obs.filter((o) => o.x > -30);
    st.bits = st.bits.filter((b) => b.x > -20 && !b.got);
    for (const d of st.dust) { d.t += dt; d.x += d.vx * dt; d.y += d.vy * dt; }
    st.dust = st.dust.filter((d) => d.t < 0.5);
  }
  function draw() {
    const R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
    // sky, sun, two ranks of hills going by at their own speeds
    Art.vramp(g, 0, 0, W, GROUND, [[0, '#5aa8e8'], [1, '#bfe4f4']], 6);
    Art.ell(g, 140, 40, 14, 14, '#fff0a0');
    const off = st.x;
    for (let x = -((off * 0.2) % 60) - 60; x < W + 60; x += 60) Art.ell(g, x + 30, GROUND - 6, 44, 28, '#8ac870');
    for (let x = -((off * 0.5) % 46) - 46; x < W + 46; x += 46) Art.ell(g, x + 23, GROUND + 4, 30, 18, '#6aa84a');
    R(0, GROUND, W, H - GROUND, '#8a5a34'); R(0, GROUND, W, 4, '#6aa84a'); R(0, GROUND + 4, W, 2, '#4a7a32');
    for (let x = -(off % 12); x < W; x += 12) R(x, GROUND + 10 + ((x + off) % 24 > 12 ? 4 : 0), 3, 2, '#6a4024');
    // cubes to grab
    for (const b of st.bits) { R(b.x - 5, b.y - 5 + Math.sin(st.t * 6 + b.x) * 2, 10, 10, '#000'); R(b.x - 4, b.y - 4 + Math.sin(st.t * 6 + b.x) * 2, 8, 8, '#553d27'); }
    // things to hop over
    for (const o of st.obs) {
      if (o.kind === 'log') {
        R(o.x - 11, GROUND - 12, 22, 12, '#2a1608'); R(o.x - 10, GROUND - 11, 20, 10, '#8a5a30'); R(o.x - 10, GROUND - 11, 20, 2, '#b07840');
        Art.ell(g, o.x + 9, GROUND - 6, 3, 5, '#d8b080'); Art.ell(g, o.x + 9, GROUND - 6, 1.5, 3, '#a87848');
      } else {
        R(o.x - 1, GROUND - 26, 3, 26, '#3a6a2a');
        for (let i = 0; i < 4; i++) { R(o.x - 7 + (i % 2) * 8, GROUND - 22 + i * 5, 6, 2, '#4a8a34'); }
        Art.ell(g, o.x + 0.5, GROUND - 28, 5, 4, '#8a4ab0'); Art.ell(g, o.x + 0.5, GROUND - 29, 3, 2, '#c08ae0');
      }
    }
    for (const d of st.dust) { g.fillStyle = `rgba(200,170,120,${(1 - d.t * 2).toFixed(2)})`; g.fillRect(Math.round(d.x), Math.round(d.y), 2, 2); }
    // the runner
    const pose = st.over ? 'hurt' : st.y < 0 ? 'happy' : 'walk';
    const img = Sprites.wombat(pose, Math.floor(st.t * 12), 'brown', 1, 'adult');
    const sc = 0.8, w = img.width * sc, h = img.height * sc;
    g.fillStyle = 'rgba(0,0,0,0.25)'; Art.ell(g, 44, GROUND, 12 + st.y * 0.05, 3);
    g.drawImage(img, Math.round(44 - w / 2), Math.round(GROUND - h + 6 + st.y), Math.round(w), Math.round(h));
    // the score, the best, and the words between runs
    Font.draw(g, String(st.score), 8, 8, { scale: 2, color: '#ffffff', shadow: '#2a3a5a' });
    Font.draw(g, 'BEST ' + (G.hopBest || 0), W - 8, 10, { scale: 1, color: '#ffffff', align: 'right', shadow: '#2a3a5a' });
    if (!st.started) {
      Kit.card(g, 18, 70, W - 36, 72, {});
      Font.draw(g, 'WOMBAT HOP', W / 2, 82, { scale: 2, color: Kit.C.ink, align: 'center' });
      Font.draw(g, 'tap to hop', W / 2, 104, { scale: 1, color: Kit.C.ink2, align: 'center' });
      Font.draw(g, 'tap again for a double', W / 2, 116, { scale: 1, color: Kit.C.ink2, align: 'center' });
    }
    if (st.over) {
      if (st.flash > 0) { st.flash = Math.max(0, st.flash - 0.05); g.fillStyle = `rgba(255,255,255,${st.flash.toFixed(2)})`; g.fillRect(0, 0, W, H); }
      Kit.card(g, 18, 66, W - 36, 88, {});
      Font.draw(g, 'BONK!', W / 2, 78, { scale: 2, color: Kit.C.coralD, align: 'center' });
      Font.draw(g, `score ${st.score}  -  ${st.cubes} cubes`, W / 2, 100, { scale: 1, color: Kit.C.ink, align: 'center' });
      Font.draw(g, st.paid ? `sponsor paid you ${st.paid} W$` : 'no sponsor money yet', W / 2, 114, { scale: 1, color: Kit.C.ink2, align: 'center' });
      Font.draw(g, 'tap to go again', W / 2, 132, { scale: 1, color: Kit.C.ink2, align: 'center' });
    }
  }
  return { mount, unmount, key, get running() { return !!raf; } };
})();
