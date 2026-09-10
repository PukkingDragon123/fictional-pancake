// ---- State, save/load, input, loop ---------------------------------------
const Main = (() => {
  const KEY = 'wombat-gods-v3';
  const W = 640, H = 360;
  let canvas, g, last = 0, G = null;
  let down = false, lastP = null;

  function fresh() {
    return {
      v: 3, wd: 60, record: 0, runs: 0, time: 0, mode: 'grove',
      tool: 'sickle', selSeed: 'ashgrass', selFood: null, selOffer: null, troughFood: null,
      seeds: { ashgrass: 8 }, food: {}, offerings: {}, blessed: {}, artifacts: {},
      summoned: {}, blessings: {}, fruits: {}, up: {}, decor: {}, staged: {},
      world: { strokes: [], blades: [], crops: [], weeds: null, restored: 0 },
      wombats: [],
      stats: { fed: 0, pets: 0, left: 0, gathered: 0, harvested: 0, earned: 0, lost: 0, collapses: 0, summons: 0 },
      pointer: { x: 320, y: 240, on: false },
      paused: false, muted: false, musicOff: false, lastSave: Date.now(), seen: false,
    };
  }
  function save() {
    if (!G) return;
    try {
      World.save();
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
      if (!TOOLS.some((t) => t.key === s.tool)) s.tool = 'sickle';
      if (s.mode === 'rite') s.mode = 'grove';
      return s;
    } catch (e) { return null; }
  }
  function reset() { try { localStorage.removeItem(KEY); } catch (e) { } location.reload(); }

  function setMode(mode) {
    if (Tower.active && mode !== 'rite') { UI.toast('finish the rite', 'bad'); Audio.play('error'); return; }
    if (Ritual.active) return;
    G.mode = mode;
    UI.setMode(mode);
    FX.clear(); FX.flash('#120e14', 0.55); Audio.play('whoosh');
    if (mode === 'roots') Knowledge.enter();
    else { FX.cam.x = 320; FX.cam.y = 180; FX.cam.zoom = 1; FX.cam.tzoom = 1; FX.cam.tx = 320; FX.cam.ty = 180; }
    Audio.setMode(mode === 'rite' && Tower.active ? 'tower' : 'pen');
    save();
  }

  function pos(e) {
    const r = canvas.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
  }
  // Brushes interpolate along the drag so a fast sweep paints a continuous band.
  function stroke(p) {
    if (!lastP) { Grove.apply(p.x, p.y, true); lastP = p; return; }
    const dx = p.x - lastP.x, dy = p.y - lastP.y;
    const dist = Math.hypot(dx, dy);
    const step = Math.max(3, World.brushRadius((TOOLS.find((t) => t.key === G.tool) || {}).radius || 8) * 0.4);
    const n = Math.min(24, Math.floor(dist / step));
    for (let i = 1; i <= n; i++) Grove.apply(lastP.x + (dx * i) / n, lastP.y + (dy * i) / n, false);
    if (n > 0) lastP = p;
  }

  function bind() {
    canvas.addEventListener('pointerdown', (e) => {
      Audio.init(); Audio.resume();
      canvas.setPointerCapture?.(e.pointerId);
      if (Ritual.active) { Ritual.skip(); return; }
      if (UI.anyPanel() || G.paused) return;
      const p = pos(e);
      down = true; lastP = null;
      if (G.mode === 'grove') stroke(p);
      else if (G.mode === 'roots') { Knowledge.click(p.x, p.y); lastP = p; }
      else if (G.mode === 'rite') Tower.click(p.x, p.y);
      else if (G.mode === 'shrine') { /* staging happens in the tray */ }
    });
    canvas.addEventListener('pointermove', (e) => {
      const p = pos(e);
      G.pointer.x = p.x; G.pointer.y = p.y; G.pointer.on = true;
      if (Ritual.active) return;
      if (down && G.mode === 'grove') { stroke(p); UI.hideTip(); return; }
      if (down && G.mode === 'roots' && lastP) { Knowledge.scroll((lastP.y - p.y) * 1.5); lastP = p; return; }
      let tip = null;
      if (G.mode === 'grove') tip = Grove.hover(p.x, p.y);
      else if (G.mode === 'roots') tip = Knowledge.hover(p.x, p.y);
      if (tip) UI.showTip(e, tip); else UI.hideTip();
    });
    const up = () => { down = false; lastP = null; };
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    canvas.addEventListener('pointerleave', () => { G.pointer.on = false; UI.hideTip(); });
    canvas.addEventListener('wheel', (e) => {
      if (G.mode !== 'roots') return;
      e.preventDefault(); Knowledge.scroll(e.deltaY * 0.9);
    }, { passive: false });

    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'SELECT' || e.target.tagName === 'INPUT') return;
      Audio.init();
      if (Ritual.active) { Ritual.skip(); return; }
      if (UI.anyPanel()) return;
      if (e.key === 'Tab') {
        e.preventDefault();
        const order = ['grove', 'shrine', 'roots', 'rite'];
        setMode(order[(order.indexOf(G.mode) + 1) % order.length]);
        return;
      }
      if (e.key === 'b' || e.key === 'B') { UI.openPanel('panel-shop'); return; }
      if (e.key === 'h' || e.key === 'H') { UI.openPanel('panel-help'); return; }
      if (G.mode === 'rite') {
        if (Tower.key(e.key)) e.preventDefault();
        if (e.key === 'c' || e.key === 'C') Tower.cashOut();
      } else if (G.mode === 'roots') {
        if (e.key === 'ArrowUp') { Knowledge.scroll(-70); e.preventDefault(); }
        if (e.key === 'ArrowDown') { Knowledge.scroll(70); e.preventDefault(); }
      } else if (G.mode === 'grove') {
        const n = parseInt(e.key);
        if (n >= 1 && n <= TOOLS.length) {
          const t = TOOLS[n - 1];
          if (!(t.locked && !G.decor[t.locked])) { G.tool = t.key; Grove.clearPair(); UI.refreshTray(); Audio.play('click'); }
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
      if (G.mode === 'roots') Knowledge.update(real);
    }
    Tower.update(gdt, real);
    // The rite pauses the world but its own effects must keep running, or
    // bolts and roots spawned during the cutscene never expire.
    FX.updateWorld(Ritual.active ? real : G.mode === 'rite' ? gdt : (G.paused ? 0 : real));

    g.setTransform(1, 0, 0, 1, 0, 0);
    g.imageSmoothingEnabled = false;
    g.clearRect(0, 0, W, H);
    if (Ritual.active) Ritual.renderScene(g);
    else if (G.mode === 'grove') { g.save(); g.translate(FX.cam.shakeX, FX.cam.shakeY); Grove.render(g); g.restore(); }
    else if (G.mode === 'shrine') { g.save(); g.translate(FX.cam.shakeX, FX.cam.shakeY); Ritual.renderShrine(g); g.restore(); }
    else if (G.mode === 'roots') { g.save(); g.translate(FX.cam.shakeX, FX.cam.shakeY); Knowledge.render(g); g.restore(); }
    else Tower.render(g);
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
    Grove.init(G); Ritual.init(G); Knowledge.init(G); Tower.init(G); UI.init(G);
    if (!G.wombats.length) { Grove.addWombat(); Grove.addWombat({ pelt: 'grey' }); }

    const away = (Date.now() - (G.lastSave || Date.now())) / 1000;
    if (away > 30 && G.wombats.some((w) => w.stomach === 'digesting')) {
      const made = Grove.offline(Math.min(away, 7200));
      if (made > 0) setTimeout(() => UI.toast(`${U.time(Math.min(away, 7200))} away &middot; <b>${made}</b>`, 'good'), 700);
    }
    G.paused = false;
    Audio.setState(G.muted, !G.musicOff);
    G.mode = 'grove';
    UI.setMode('grove');
    UI.refreshHUD(); UI.refreshTray();
    window.addEventListener('resize', resize);
    resize(); setTimeout(resize, 60);
    bind();
    if (!G.seen) {
      G.seen = true;
      setTimeout(() => UI.toast('The grove is dead. Drag to clear the weeds.', 'good'), 900);
      setTimeout(() => UI.toast('Then sow moss, till, and plant.'), 7000);
    }
    FX.title('WOMBAT GODS', { size: 20, color: PAL.div4, dur: 2.6, style: 'slam', sub: 'restore the grove' });
    requestAnimationFrame((t) => { last = t; requestAnimationFrame(frame); });
  }
  if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', init);
  else init();
  return { save, reset, setMode, get G() { return G; } };
})();
