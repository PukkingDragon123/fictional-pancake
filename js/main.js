// ---- State, save/load, input, loop ---------------------------------------
const Main = (() => {
  const KEY = 'wombat-cube-tycoon-v2';
  const W = 640, H = 360;
  let canvas, g, last = 0, G = null;
  let dragging = false, dragY = 0;

  function fresh() {
    return {
      v: 2, money: 45, record: 0, runs: 0, time: 0, mode: 'pen',
      food: { grass: 6, carrot: 2 }, unlocked: { grass: true, carrot: true },
      cubes: {}, premium: {}, farm: {}, fac: {}, skills: {},
      tree: { xp: 0, spent: 0, stage: 0 },
      wombats: [], selFood: 'grass', selCube: null, troughFood: null,
      stats: { fed: 0, pets: 0, pooped: 0, collected: 0, composted: 0, earned: 0, lost: 0, collapses: 0 },
      paused: false, muted: false, musicOff: false, lastSave: Date.now(), seen: false,
    };
  }
  function save() {
    if (!G) return;
    try { G.lastSave = Date.now(); localStorage.setItem(KEY, JSON.stringify(Object.assign({}, G, { paused: false }))); } catch (e) { }
  }
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      const d = JSON.parse(raw), s = fresh();
      for (const k of Object.keys(s)) if (d[k] !== undefined) s[k] = d[k];
      s.stats = Object.assign(fresh().stats, d.stats || {});
      s.tree = Object.assign(fresh().tree, d.tree || {});
      // drop cube types that no longer exist, and repair transient wombat fields
      for (const bag of [s.cubes, s.premium]) for (const k of Object.keys(bag)) if (!CUBES[k]) delete bag[k];
      for (const k of Object.keys(s.food)) if (!FOOD_BY_KEY[k]) delete s.food[k];
      for (const k of Object.keys(s.unlocked)) if (!FOOD_BY_KEY[k]) delete s.unlocked[k];
      if (!s.unlocked.grass) s.unlocked.grass = true;
      for (const w of s.wombats) {
        w.pets = []; w.state = 'idle'; w.stateT = 1; w.sq = 0; w.toy = null;
        w.anim = U.rand(0, 9);
        if (w.pal === undefined) w.pal = U.randi(0, FUR.length - 1);
        w.placed = true;
        if (w.stomach === 'ready') { w.stomach = 'digesting'; w.digestT = 0.5; w.digestTotal = Math.max(1, w.digestTotal || 1); }
        if (w.stomach === 'digesting' && !FOOD_BY_KEY[w.food]) { w.stomach = 'empty'; w.food = null; }
      }
      if (s.selCube && !CUBES[s.selCube]) s.selCube = null;
      if (s.selFood && !FOOD_BY_KEY[s.selFood]) s.selFood = 'grass';
      if (s.mode === 'tower') s.mode = 'pen';
      return s;
    } catch (e) { return null; }
  }
  function reset() { try { localStorage.removeItem(KEY); } catch (e) { } location.reload(); }

  function setMode(mode) {
    if (Tower.active && mode !== 'tower') { UI.toast('Finish the show first.', 'bad'); Audio.play('error'); return; }
    G.mode = mode;
    UI.setMode(mode);
    FX.clear(); FX.flash('#241611', 0.5); Audio.play('whoosh');
    if (mode === 'tree') Tree.enter();
    else { FX.cam.x = 320; FX.cam.y = 180; FX.cam.zoom = 1; FX.cam.tzoom = 1; FX.cam.tx = 320; FX.cam.ty = 180; }
    Audio.setMode(mode === 'tower' && Tower.active ? 'tower' : 'pen');
    save();
  }

  // ---- input --------------------------------------------------------------
  function pos(e) {
    const r = canvas.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
  }
  function bind() {
    canvas.addEventListener('mousedown', (e) => {
      Audio.init(); Audio.resume();
      if (UI.anyPanelOpen() || G.paused) return;
      const p = pos(e);
      if (G.mode === 'pen') Pen.click(p.x, p.y);
      else if (G.mode === 'tree') { dragging = true; dragY = p.y; Tree.click(p.x, p.y); }
      else Tower.click();
    });
    window.addEventListener('mouseup', () => { dragging = false; });
    canvas.addEventListener('mousemove', (e) => {
      const p = pos(e);
      let tip = null;
      if (G.mode === 'pen') tip = Pen.hover(p.x, p.y);
      else if (G.mode === 'tree') {
        tip = Tree.hover(p.x, p.y);
        if (dragging) { Tree.scroll((dragY - p.y) * 1.6); dragY = p.y; }
      }
      if (tip) UI.showTip(e, tip); else UI.hideTip();
    });
    canvas.addEventListener('mouseleave', () => { UI.hideTip(); dragging = false; });
    canvas.addEventListener('wheel', (e) => {
      if (G.mode !== 'tree') return;
      e.preventDefault();
      Tree.scroll(e.deltaY * 0.9);
    }, { passive: false });
    canvas.addEventListener('touchstart', (e) => {
      Audio.init();
      if (UI.anyPanelOpen() || G.paused) return;
      const p = pos(e.changedTouches[0]);
      if (G.mode === 'pen') Pen.click(p.x, p.y);
      else if (G.mode === 'tree') { dragging = true; dragY = p.y; Tree.click(p.x, p.y); }
      else Tower.click();
      e.preventDefault();
    }, { passive: false });
    canvas.addEventListener('touchmove', (e) => {
      if (G.mode !== 'tree' || !dragging) return;
      const p = pos(e.changedTouches[0]);
      Tree.scroll((dragY - p.y) * 1.6); dragY = p.y;
      e.preventDefault();
    }, { passive: false });
    canvas.addEventListener('touchend', () => { dragging = false; });

    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'SELECT' || e.target.tagName === 'INPUT') return;
      Audio.init();
      if (UI.anyPanelOpen()) return;
      if (e.key === 'Tab') {
        e.preventDefault();
        const order = ['pen', 'tree', 'tower'];
        setMode(order[(order.indexOf(G.mode) + 1) % order.length]);
        return;
      }
      if (e.key === 's' || e.key === 'S') { UI.openShop(); return; }
      if (e.key === '?' || e.key === 'h' || e.key === 'H') { document.getElementById('btn-help').click(); return; }
      if (G.mode === 'tower') {
        if (Tower.key(e.key)) e.preventDefault();
        if (e.key === 'c' || e.key === 'C') Tower.cashOut();
      } else if (G.mode === 'tree') {
        if (e.key === 'ArrowUp') { Tree.scroll(-70); e.preventDefault(); }
        if (e.key === 'ArrowDown') { Tree.scroll(70); e.preventDefault(); }
      } else {
        const n = parseInt(e.key);
        if (n >= 1 && n <= 9) {
          const f = FOODS.filter((x) => G.unlocked[x.key])[n - 1];
          if (f) { G.selFood = G.selFood === f.key ? null : f.key; UI.refreshFeedBar(); Audio.play('click'); }
        }
        if (e.key === '0' || e.key === 'p' || e.key === 'P') { G.selFood = null; UI.refreshFeedBar(); }
      }
    });
    window.addEventListener('blur', save);
    window.addEventListener('beforeunload', save);
    setInterval(save, 10000);
  }

  function resize() {
    const st = document.getElementById('stage');
    const s = Math.min(st.clientWidth / W, st.clientHeight / H);
    const cw = Math.floor(W * s), ch = Math.floor(H * s);
    canvas.style.width = cw + 'px';
    canvas.style.height = ch + 'px';
    const frame = document.getElementById('frame');
    frame.style.width = cw + 'px';
    frame.style.height = ch + 'px';
  }

  function frame(ts) {
    requestAnimationFrame(frame);
    const real = Math.min(0.1, (ts - last) / 1000 || 0);
    last = ts;
    if (real <= 0) return;
    FX.update(real);
    const c = FX.cine;
    let gdt = real * c.slowmo;
    if (c.freeze > 0 || c.hitstop > 0) gdt = 0;
    if (G.paused) gdt = 0;
    G.time += real;
    if (!G.paused) {
      Pen.update(real);
      if (G.mode === 'tree') Tree.update(real);
    }
    Tower.update(gdt, real);
    FX.updateWorld(G.mode === 'tower' ? gdt : (G.paused ? 0 : real));

    g.setTransform(1, 0, 0, 1, 0, 0);
    g.imageSmoothingEnabled = false;
    g.clearRect(0, 0, W, H);
    if (G.mode === 'pen') { g.save(); g.translate(FX.cam.shakeX, FX.cam.shakeY); Pen.render(g); g.restore(); }
    else if (G.mode === 'tree') { g.save(); g.translate(FX.cam.shakeX, FX.cam.shakeY); Tree.render(g); g.restore(); }
    else Tower.render(g);
    FX.drawCinema(g, W, H);

    if (Math.floor(G.time * 4) !== Math.floor((G.time - real) * 4)) {
      UI.refreshHUD();
      if (Tower.active) UI.refreshRunHUD();
    }
  }

  function init() {
    canvas = document.getElementById('game');
    g = canvas.getContext('2d');
    Sprites.init();
    G = load() || fresh();
    window.G = G;
    Pen.init(G); Tree.init(G); Tower.init(G); UI.init(G);
    if (!G.wombats.length) Pen.addWombat();

    const away = (Date.now() - (G.lastSave || Date.now())) / 1000;
    if (away > 30 && G.wombats.some((w) => w.stomach === 'digesting')) {
      const made = Pen.offline(Math.min(away, 7200));
      if (made > 0) setTimeout(() => UI.toast(`Away ${U.time(Math.min(away, 7200))}. Your wombats left <b>${made}</b> cubes.`, 'good'), 700);
    }
    G.paused = false;
    Audio.setState(G.muted, !G.musicOff);
    G.mode = 'pen';
    UI.setMode('pen');
    UI.refreshHUD(); UI.refreshFeedBar(); UI.refreshCubeBar();
    window.addEventListener('resize', resize);
    resize(); setTimeout(resize, 60);
    bind();
    if (!G.seen) {
      G.seen = true;
      setTimeout(() => UI.toast('Grass is selected. Click <b>' + G.wombats[0].name + '</b> to feed.', 'good'), 900);
      setTimeout(() => UI.toast('Pet while digesting to hurry it along.'), 6500);
    }
    FX.title('WOMBAT CUBE TYCOON', { size: 17, color: PAL.goldL, dur: 2.4, style: 'slam', sub: 'feed, stack, grow' });
    requestAnimationFrame((t) => { last = t; requestAnimationFrame(frame); });
  }

  if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', init);
  else init();
  return { save, reset, setMode, get G() { return G; } };
})();
