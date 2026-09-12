// ---- State, save/load, input, loop ---------------------------------------
const Main = (() => {
  const KEY = 'wombat-gods-v5';
  const W = 640, H = 360;
  let canvas, g, last = 0, G = null;
  let down = false, lastP = null, downP = null, moved = 0, panning = false, screenP = { x: 320, y: 240 };

  function fresh() {
    return {
      v: 5, wd: 300, startWeeds: 0, record: 0, runs: 0, time: 0, mode: 'grove',
      tool: 'sickle', selSeed: 'ashgrass', selFood: null, selOffer: null, troughFood: null,
      seeds: { ashgrass: 6 }, food: {}, offerings: {}, blessed: {}, artifacts: {},
      summoned: {}, blessings: {}, fruits: {}, up: {}, decor: {}, staged: {},
      world: { strokes: [], blades: [], flowers: [], crops: [], sprouts: [], weeds: null, restored: 0 },
      wombats: [], objects: null, arrived: false, pairFirst: null, step: 0, visited: {}, tiers: { sickle: 0, hoe: 0, water: 0 },
      stats: { fed: 0, pets: 0, left: 0, gathered: 0, harvested: 0, earned: 0, lost: 0, collapses: 0, summons: 0 },
      pointer: { x: 320, y: 240, on: false },
      paused: false, muted: false, musicOff: false, lastSave: Date.now(), seen: false,
    };
  }
  function save() {
    if (!G) return;
    try {
      World.save();
      Grove.saveObjects();
      G.lastSave = Date.now();
      localStorage.setItem(KEY, JSON.stringify(Object.assign({}, G, { paused: false, pointer: undefined })));
    } catch (e) { }
  }
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      const d = JSON.parse(raw), s = fresh();
      for (const k of Object.keys(s)) if (d[k] !== undefined) s[k] = d[k];
      s.stats = Object.assign(fresh().stats, d.stats || {});
      s.world = Object.assign(fresh().world, d.world || {});
      s.pointer = { x: 320, y: 240, on: false };
      for (const bag of [s.offerings, s.blessed]) for (const k of Object.keys(bag)) if (!OFFERINGS[k]) delete bag[k];
      for (const bag of [s.seeds, s.food]) for (const k of Object.keys(bag)) if (!CROP_BY_KEY[k]) delete bag[k];
      for (const w of s.wombats) {
        w.pets = []; w.state = 'idle'; w.stateT = 1; w.sq = 0; w.anim = U.rand(0, 9);
        if (!w.traits) w.traits = { gut: 1, calm: 1, luck: 1 };
        if (!w.pelt || !FUR_BY_KEY[w.pelt]) w.pelt = 'brown';
        if (!w.age) w.age = 'adult';
        if (w.stomach === 'ready') { w.stomach = 'digesting'; w.digestT = 0.5; w.digestTotal = Math.max(1, w.digestTotal || 1); }
        if (w.stomach === 'digesting' && !CROP_BY_KEY[w.food]) { w.stomach = 'empty'; w.food = null; }
      }
      if (!TOOL_BY_KEY[s.tool]) s.tool = 'sickle';
      s.mode = 'grove';
      return s;
    } catch (e) { return null; }
  }
  function reset() { try { localStorage.removeItem(KEY); } catch (e) { } location.reload(); }

  // ---- modes --------------------------------------------------------------
  function setMode(mode) {
    if (Tower.active && mode !== 'rite') { UI.toast('finish the stack', 'bad'); Audio.play('error'); return; }
    if (Ritual.active) return;
    G.mode = mode;
    if (!G.visited) G.visited = {};
    G.visited[mode] = true;
    UI.setMode(mode);
    FX.clear(); FX.flash('#120e14', 0.5);
    if (mode !== 'shop') Audio.play('whoosh');
    FX.cam.x = 320; FX.cam.y = 180; FX.cam.zoom = 1; FX.cam.tzoom = 1; FX.cam.tx = 320; FX.cam.ty = 180;
    if (mode === 'tree') Knowledge.enter();
    else if (mode === 'map') Atlas.enter();
    else if (mode === 'shop') Shop.enter();
    Audio.setMode(mode === 'rite' && Tower.active ? 'tower' : 'pen');
    save();
  }
  function back() {
    if (G.mode === 'shrine' || G.mode === 'rite' || G.mode === 'shop') setMode('map');
    else setMode('grove');
  }

  // ---- input --------------------------------------------------------------
  function pos(e) {
    const r = canvas.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
  }
  // In the grove the view pans, so screen coordinates are not world ones.
  function world(p) { return G.mode === 'grove' ? Grove.toWorld(p.x, p.y) : p; }

  // Brushes interpolate along the drag so a fast sweep paints a continuous band.
  function stroke(p) {
    if (!lastP) { Grove.press(p.x, p.y, true); lastP = p; return; }
    const dx = p.x - lastP.x, dy = p.y - lastP.y;
    const dist = Math.hypot(dx, dy);
    const step = Math.max(3, World.brushRadius((TOOL_BY_KEY[G.tool] || {}).radius || 8) * 0.4);
    const n = Math.min(24, Math.floor(dist / step));
    for (let i = 1; i <= n; i++) Grove.press(lastP.x + (dx * i) / n, lastP.y + (dy * i) / n, false);
    if (n > 0) lastP = p;
  }

  function bind() {
    canvas.addEventListener('pointerdown', (e) => {
      Audio.init(); Audio.resume();
      canvas.setPointerCapture?.(e.pointerId);
      if (Ritual.active) { Ritual.skip(); return; }
      if (UI.anyPanel() || G.paused) return;
      const p = pos(e);
      if (e.button === 2) { if (G.mode === 'grove') UI.openWheel(p.x, p.y); return; }
      if (UI.wheelOpen()) { UI.closeWheel(); return; }
      down = true; lastP = null; downP = p; moved = 0; panning = false;
      screenP = p;
      if (G.mode === 'grove') {
        const w = world(p);
        if (Guide.hit(w.x, w.y)) { Guide.poke(); down = false; return; }
        const consumed = Grove.press(w.x, w.y, true);
        if (consumed) lastP = w;
        else { panning = true; lastP = p; }     // grabbed nothing: drag the view
      } else if (G.mode === 'tree') lastP = p;
      else if (G.mode === 'shop') Shop.press(p.x, p.y);
      else if (G.mode === 'rite') Tower.click(p.x, p.y);
    });
    canvas.addEventListener('pointermove', (e) => {
      const p = pos(e);
      screenP = p;
      const wp = world(p);
      G.pointer.x = wp.x; G.pointer.y = wp.y; G.pointer.on = true;
      if (Ritual.active) return;
      if (downP) moved = Math.max(moved, Math.hypot(p.x - downP.x, p.y - downP.y));
      if (down) {
        if (G.mode === 'grove') {
          if (panning) { Grove.panBy(-(p.x - lastP.x)); lastP = p; UI.hideTip(); return; }
          if (G.tool === 'drag') { Grove.move(wp.x, wp.y); UI.hideTip(); return; }
          stroke(wp); UI.hideTip(); return;
        }
        if (G.mode === 'tree' && lastP) { Knowledge.pan(p.x - lastP.x, p.y - lastP.y); lastP = p; UI.hideTip(); return; }
        if (G.mode === 'shop') { Shop.move(p.x, p.y); UI.hideTip(); return; }
      }
      let tip = null;
      if (G.mode === 'grove') tip = Grove.hover(wp.x, wp.y);
      else if (G.mode === 'tree') tip = Knowledge.hover(p.x, p.y);
      else if (G.mode === 'map') tip = Atlas.hover(p.x, p.y);
      else if (G.mode === 'shop') tip = Shop.hover(p.x, p.y);
      if (tip) UI.showTip(e, tip); else UI.hideTip();
    });
    const release = (e) => {
      if (!down) { down = false; lastP = null; downP = null; return; }
      const p = e ? pos(e) : downP;
      const wp = world(p);
      if (G.mode === 'grove') { if (!panning) Grove.release(wp.x, wp.y); }
      else if (G.mode === 'shop') Shop.release(p.x, p.y);
      else if (G.mode === 'tree' && moved < 6) Knowledge.click(p.x, p.y);
      else if (G.mode === 'map' && moved < 8) Atlas.click(p.x, p.y);
      down = false; lastP = null; downP = null; panning = false;
    };
    window.addEventListener('pointerup', (e) => release(e));
    window.addEventListener('pointercancel', () => { down = false; lastP = null; downP = null; });
    canvas.addEventListener('pointerleave', () => { G.pointer.on = false; UI.hideTip(); });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('wheel', (e) => {
      if (G.mode === 'grove') { e.preventDefault(); Grove.panBy((Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY) * 0.8); }
      else if (G.mode === 'tree') { e.preventDefault(); const p = pos(e); Knowledge.scroll(e.deltaY, p.x, p.y); }
      else if (G.mode === 'shop') { e.preventDefault(); Shop.wheel(e.deltaY * 0.6); }
    }, { passive: false });

    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'SELECT' || e.target.tagName === 'INPUT') return;
      Audio.init();
      if (Ritual.active) { Ritual.skip(); return; }
      if (UI.anyPanel()) return;
      if (e.key === 'Tab' || e.key === ' ') { if (G.mode === 'grove') { e.preventDefault(); if (UI.wheelOpen()) UI.closeWheel(); else UI.openWheel(screenP.x, screenP.y); } return; }
      if (e.key === 'Escape' || e.key === 'Backspace') { if (UI.wheelOpen()) { UI.closeWheel(); return; } if (G.mode !== 'grove') { back(); e.preventDefault(); } return; }
      if (e.key === 'm' || e.key === 'M') { if (G.mode === 'grove') setMode('map'); return; }
      if (e.key === 'h' || e.key === 'H') { UI.openPanel('panel-help'); return; }
      if (G.mode === 'rite') {
        if (Tower.key(e.key)) e.preventDefault();
        if (e.key === 'c' || e.key === 'C') Tower.cashOut();
      } else if (G.mode === 'tree') {
        if (e.key === '+' || e.key === '=') { Knowledge.zoomBy(1.2); e.preventDefault(); }
        if (e.key === '-' || e.key === '_') { Knowledge.zoomBy(1 / 1.2); e.preventDefault(); }
      } else if (G.mode === 'grove') {
        if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') { Grove.panBy(-70); e.preventDefault(); return; }
        if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') { Grove.panBy(70); e.preventDefault(); return; }
        const n = parseInt(e.key);
        if (n >= 1 && n <= TOOLS.length) {
          const t = TOOLS[n - 1];
          if (unlocked(G, t.key)) {
            G.tool = t.sub ? t.sub[0] : t.key;
            Grove.clearPair(); UI.refreshTray(); Audio.play('click');
          } else Audio.play('error');
        }
      }
    });
    window.addEventListener('blur', save);
    window.addEventListener('beforeunload', save);
    setInterval(save, 12000);
  }

  function resize() {
    const st = document.getElementById('stage');
    const s = Math.min(st.clientWidth / W, st.clientHeight / H);
    const cw = Math.floor(W * s), ch = Math.floor(H * s);
    canvas.style.width = cw + 'px'; canvas.style.height = ch + 'px';
    const f = document.getElementById('frame');
    f.style.width = cw + 'px'; f.style.height = ch + 'px';
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

    Ritual.update(gdt, real);
    if (!G.paused) {
      World.update(real);
      Grove.update(real);
      Guide.update(real);
      // the view follows the pointer at the edges, and keeps doing so while a cube is being carried
      if (G.mode === 'grove' && G.pointer.on && (!down || (G.tool === 'drag' && !panning)) && !UI.anyPanel()) Grove.edgeScroll(screenP.x, real);
      if (G.mode === 'tree') Knowledge.update(real);
      else if (G.mode === 'map') Atlas.update(real);
      else if (G.mode === 'shop') Shop.update(real);
    } else if (Grove.arriving) {
      Grove.update(real);
    }
    Tower.update(gdt, real);
    // The rite pauses the world but its own effects must keep running, or
    // bolts and roots spawned during the cutscene never expire.
    FX.updateWorld(Ritual.active ? real : G.mode === 'rite' ? gdt : (G.paused ? 0 : real));

    g.setTransform(1, 0, 0, 1, 0, 0);
    g.imageSmoothingEnabled = false;
    g.clearRect(0, 0, W, H);
    if (Ritual.active) Ritual.renderScene(g);
    else {
      g.save(); g.translate(FX.cam.shakeX, FX.cam.shakeY);
      if (G.mode === 'grove') Grove.render(g);
      else if (G.mode === 'shrine') Ritual.renderShrine(g);
      else if (G.mode === 'tree') Knowledge.render(g);
      else if (G.mode === 'map') Atlas.render(g);
      else if (G.mode === 'shop') Shop.render(g);
      else Tower.render(g);
      g.restore();
    }
    FX.drawCinema(g, W, H);

    if (Math.floor(G.time * 4) !== Math.floor((G.time - real) * 4)) {
      UI.refreshHUD();
      if (Tower.active) UI.refreshRunHUD();
      if (G.mode === 'shrine') UI.refreshRitual();
    }
  }

  function init() {
    canvas = document.getElementById('game');
    g = canvas.getContext('2d');
    Sprites.init();
    G = load() || fresh();
    window.G = G;
    World.init(G);
    Grove.init(G); Ritual.init(G); Knowledge.init(G); Atlas.init(G); Shop.init(G); Tower.init(G); Guide.init(G); UI.init(G);

    const away = (Date.now() - (G.lastSave || Date.now())) / 1000;
    if (away > 30 && G.wombats.some((w) => w.stomach === 'digesting')) {
      const made = Grove.offline(Math.min(away, 7200));
      if (made > 0) setTimeout(() => UI.toast(`${U.time(Math.min(away, 7200))} away &middot; <b>${made}</b>`, 'good'), 700);
    }
    G.paused = false;
    Audio.setState(G.muted, !G.musicOff);
    G.mode = 'grove';
    UI.setMode('grove');
    window.addEventListener('resize', resize);
    resize(); setTimeout(resize, 60);
    bind();
    if (!G.seen) {
      G.seen = true;
      setTimeout(() => UI.toast('the grove is dead', 'bad'), 1200);
      setTimeout(() => UI.toast('clear the list and one will come'), 6200);
    }
    FX.title('WOMBAT GODS', { size: 20, color: PAL.div4, dur: 2.6, style: 'slam', sub: 'restore the grove' });
    requestAnimationFrame((t) => { last = t; requestAnimationFrame(frame); });
  }
  if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', init);
  else init();
  return { save, reset, setMode, back, get G() { return G; } };
})();
