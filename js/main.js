// ---- State, save/load, input, loop ---------------------------------------
const Main = (() => {
  const KEY = 'wombat-cube-tycoon-v3';
  const W = 640, H = 360;
  const MODES = ['grove', 'shrine', 'roots', 'tower'];
  let canvas, g, last = 0, G = null;
  let dragging = false, dragY = 0;

  function fresh() {
    return {
      v: 3, money: 60, record: 0, runs: 0, time: 0, mode: 'grove',
      tools: { censer: 0 }, selTool: 'censer', selSeed: 'ashgrass', selOffer: null,
      offerings: {}, blessed: {},
      gods: {}, relics: {}, fruit: {}, fruitBank: 0, favour: 0, favourEver: 0,
      goalsDone: {},
      wombats: [], pairs: [], drops: [], remembered: [], warren: 0,
      world: null,
      stats: { pets: 0, eaten: 0, offered: 0, collected: 0, cleared: 0, born: 0, gods: 0, learned: 0, earned: 0, lost: 0, collapses: 0 },
      paused: false, muted: false, musicOff: false, lastSave: Date.now(), seen: false,
    };
  }
  function save() {
    if (!G) return;
    try {
      G.lastSave = Date.now();
      G.world = World.serialize();
      localStorage.setItem(KEY, JSON.stringify(Object.assign({}, G, { paused: false })));
    } catch (e) { }
  }
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      const d = JSON.parse(raw), s = fresh();
      for (const k of Object.keys(s)) if (d[k] !== undefined) s[k] = d[k];
      s.stats = Object.assign(fresh().stats, d.stats || {});
      // Drop anything the data file no longer defines, so a rebalance cannot
      // leave a save holding a key that renders as undefined.
      for (const bag of [s.offerings, s.blessed]) for (const k of Object.keys(bag)) if (!OFFERINGS[k]) delete bag[k];
      for (const k of Object.keys(s.tools)) if (!TOOL_BY_KEY[k]) delete s.tools[k];
      for (const k of Object.keys(s.gods)) if (!GOD_BY_KEY[k]) delete s.gods[k];
      for (const k of Object.keys(s.fruit)) if (!FRUIT_SKILLS.some((f) => f.key === k)) delete s.fruit[k];
      if (s.tools.censer === undefined) s.tools.censer = 0;
      if (!CROP_BY_KEY[s.selSeed]) s.selSeed = 'ashgrass';
      if (s.selTool && s.tools[s.selTool] === undefined) s.selTool = 'censer';
      if (s.selOffer && !OFFERINGS[s.selOffer]) s.selOffer = null;
      s.drops = (s.drops || []).filter((x) => OFFERINGS[x.type]);
      for (const w of s.wombats) {
        w.pets = []; w.state = 'idle'; w.stateT = 1; w.target = 0;
        w.anim = U.rand(0, 9);
        if (!Sprites.AGES[w.age]) w.age = 'adult';
        if (!Array.isArray(w.traits)) w.traits = [];
        w.traits = w.traits.filter((t) => TRAIT_BY_KEY[t]);
        if (!FUR_BY_KEY[w.fur]) w.fur = FUR[0].key;
        w.tx = w.x; w.ty = w.y;
        if (w.stomach === 'ready') { w.stomach = 'digesting'; w.digestT = 0.5; w.digestTotal = Math.max(1, w.digestTotal || 1); }
      }
      // A pair whose halves are gone would tick forever.
      s.pairs = (s.pairs || []).filter((p) => s.wombats.some((w) => w.id === p.a) && s.wombats.some((w) => w.id === p.b));
      const live = new Set(s.pairs.map((p) => p.id));
      for (const w of s.wombats) if (w.pair && !live.has(w.pair)) w.pair = 0;
      if (s.mode === 'tower') s.mode = 'grove';
      return s;
    } catch (e) { return null; }
  }
  function reset() { try { localStorage.removeItem(KEY); } catch (e) { } location.reload(); }

  function setMode(mode) {
    if (Tower.active && mode !== 'tower') { UI.toast('Finish the rite first.', 'bad'); Audio.play('error'); return; }
    // A summoning owns the screen -- its letterbox and slow motion are global,
    // so leaving mid-cutscene would drag them into the next scene.
    if (Ritual.pending() && mode !== 'shrine') { UI.toast('Not while a god is arriving.', 'bad'); Audio.play('error'); return; }
    G.mode = mode;
    UI.setMode(mode);
    FX.clear(); FX.flash(PAL.ink, 0.5); Audio.play('whoosh');
    if (mode === 'roots') Knowledge.enter();
    else if (mode === 'shrine') Ritual.enter();
    else if (mode === 'grove') Grove.enter();
    if (mode !== 'tower') { FX.cam.x = 320; FX.cam.y = 180; FX.cam.zoom = 1; FX.cam.tzoom = 1; FX.cam.tx = 320; FX.cam.ty = 180; }
    Audio.setMode(mode === 'tower' && Tower.active ? 'tower' : 'grove');
    save();
  }

  // ---- input --------------------------------------------------------------
  function pos(e) {
    const r = canvas.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
  }
  function down(p) {
    if (G.mode === 'grove') Grove.click(p.x, p.y);
    else if (G.mode === 'shrine') Ritual.click(p.x, p.y);
    else if (G.mode === 'roots') { dragging = true; dragY = p.y; Knowledge.click(p.x, p.y); }
    else Tower.click();
  }
  function bind() {
    canvas.addEventListener('mousedown', (e) => {
      Audio.init(); Audio.resume();
      if (UI.anyPanelOpen() || G.paused) return;
      down(pos(e));
    });
    window.addEventListener('mouseup', () => { dragging = false; Grove.release(); });
    canvas.addEventListener('mousemove', (e) => {
      const p = pos(e);
      let tip = null;
      if (G.mode === 'grove') { Grove.drag(p.x, p.y); tip = Grove.hover(p.x, p.y); }
      else if (G.mode === 'shrine') tip = Ritual.hover(p.x, p.y);
      else if (G.mode === 'roots') {
        tip = Knowledge.hover(p.x, p.y);
        if (dragging) { Knowledge.scroll((dragY - p.y) * 1.6); dragY = p.y; }
      }
      if (tip) UI.showTip(e, tip); else UI.hideTip();
    });
    canvas.addEventListener('mouseleave', () => { UI.hideTip(); dragging = false; Grove.release(); });
    canvas.addEventListener('wheel', (e) => {
      if (G.mode !== 'roots') return;
      e.preventDefault();
      Knowledge.scroll(e.deltaY * 0.9);
    }, { passive: false });

    canvas.addEventListener('touchstart', (e) => {
      Audio.init();
      if (UI.anyPanelOpen() || G.paused) return;
      const p = pos(e.changedTouches[0]);
      down(p);
      e.preventDefault();
    }, { passive: false });
    canvas.addEventListener('touchmove', (e) => {
      const p = pos(e.changedTouches[0]);
      if (G.mode === 'roots' && dragging) { Knowledge.scroll((dragY - p.y) * 1.6); dragY = p.y; }
      else if (G.mode === 'grove') Grove.drag(p.x, p.y);
      e.preventDefault();
    }, { passive: false });
    canvas.addEventListener('touchend', () => { dragging = false; Grove.release(); });

    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'SELECT' || e.target.tagName === 'INPUT') return;
      Audio.init();
      if (UI.anyPanelOpen()) return;
      if (e.key === 'Tab') {
        e.preventDefault();
        setMode(MODES[(MODES.indexOf(G.mode) + 1) % MODES.length]);
        return;
      }
      if (e.key === 's' || e.key === 'S') { UI.openShop(); return; }
      if (e.key === 'w' || e.key === 'W') { document.getElementById('btn-warren').click(); return; }
      if (e.key === '?' || e.key === 'h' || e.key === 'H') { document.getElementById('btn-help').click(); return; }
      if (G.mode === 'tower') {
        if (Tower.key(e.key)) e.preventDefault();
        if (e.key === 'c' || e.key === 'C') Tower.cashOut();
      } else if (G.mode === 'roots') {
        if (e.key === 'ArrowUp') { Knowledge.scroll(-70); e.preventDefault(); }
        if (e.key === 'ArrowDown') { Knowledge.scroll(70); e.preventDefault(); }
      } else if (G.mode === 'grove') {
        const n = parseInt(e.key);
        if (n >= 1 && n <= TOOLS.length) {
          const t = TOOLS[n - 1];
          if (G.tools[t.key] !== undefined) { G.selTool = G.selTool === t.key ? null : t.key; UI.refreshToolBar(); Audio.play('click'); }
          else { UI.openShop('tools'); }
        }
        if (e.key === '0') { G.selTool = null; UI.refreshToolBar(); }
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
      Grove.update(real);
      Ritual.update(real);
      if (G.mode === 'roots') Knowledge.update(real);
    }
    Tower.update(gdt, real);
    FX.updateWorld(G.mode === 'tower' ? gdt : (G.paused ? 0 : real));

    g.setTransform(1, 0, 0, 1, 0, 0);
    g.imageSmoothingEnabled = false;
    g.clearRect(0, 0, W, H);
    if (G.mode === 'grove') { g.save(); g.translate(FX.cam.shakeX, FX.cam.shakeY); Grove.render(g); g.restore(); }
    else if (G.mode === 'shrine') { g.save(); g.translate(FX.cam.shakeX, FX.cam.shakeY); Ritual.render(g); g.restore(); }
    else if (G.mode === 'roots') { g.save(); g.translate(FX.cam.shakeX, FX.cam.shakeY); Knowledge.render(g); g.restore(); }
    else Tower.render(g);
    FX.drawCinema(g, W, H);

    if (Math.floor(G.time * 4) !== Math.floor((G.time - real) * 4)) {
      UI.refreshHUD();
      if (Tower.active) UI.refreshRunHUD();
      if (G.mode === 'roots') UI.refreshRootHUD();
      if (G.mode === 'shrine') UI.refreshShrineHUD();
      if (UI.warrenOpen()) UI.renderWarren();
    }
  }

  function init() {
    canvas = document.getElementById('game');
    g = canvas.getContext('2d');
    Sprites.init();
    G = load() || fresh();
    window.G = G;
    World.init(G, G.world);
    Grove.init(G); Breeding.init(G); Ritual.init(G); Knowledge.init(G); Tower.init(G); UI.init(G);
    if (!G.wombats.length) { Grove.addWombat(); Grove.addWombat(); }

    const away = (Date.now() - (G.lastSave || Date.now())) / 1000;
    if (away > 30) {
      const made = Grove.offline(Math.min(away, 7200));
      if (made > 0) setTimeout(() => UI.toast(`Away ${U.time(Math.min(away, 7200))}. Your wombats left <b>${made}</b> offerings.`, 'good'), 700);
    }
    G.paused = false;
    Audio.setState(G.muted, !G.musicOff);
    G.mode = 'grove';
    UI.setMode('grove');
    UI.refreshHUD(); UI.refreshToolBar(); UI.refreshOfferBar();
    window.addEventListener('resize', resize);
    resize(); setTimeout(resize, 60);
    bind();
    if (!G.seen) {
      G.seen = true;
      setTimeout(() => UI.toast('The censer is in your hand. Drag it over the ash.', 'good'), 900);
      setTimeout(() => UI.toast('Then buy a trowel, till the bare ground, and sow.'), 7000);
    }
    FX.title('WOMBAT CUBE TYCOON', { size: 15, color: PAL.vio4, dur: 2.6, style: 'slam', sub: 'ten gods are asleep under the ash' });
    requestAnimationFrame((t) => { last = t; requestAnimationFrame(frame); });
  }

  if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', init);
  else init();
  return { save, reset, setMode, get G() { return G; } };
})();
