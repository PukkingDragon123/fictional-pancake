// ---- State, save/load, input, loop ---------------------------------------
const Main = (() => {
  // Three groves, kept apart, and the one you were last in is remembered so
  // the title screen opens on it.
  const KEY_BASE = 'wombat-gods-v6';
  const SLOTS = [1, 2, 3];
  const keyOf = (n) => KEY_BASE + (n > 1 ? ':' + n : '');
  let slot = 1;
  const KEY = () => keyOf(slot);
  let booted = null;                           // whatever the store held at boot
  const slotSaves = {};                        // what is in each of the three
  let playing = false;                         // false means we are at the title
  let settings = { muted: false, musicOff: false, shake: true, bigText: false };
  const W = 640, H = 360;
  let canvas, g, last = 0, G = null;
  let down = false, lastP = null, downP = null, moved = 0, panning = false, screenP = { x: 320, y: 240 };

  function fresh() {
    return {
      v: 6, introDone: false, wd: 300, startWeeds: 0, record: 0, runs: 0, time: 0, mode: 'grove',
      tool: 'sickle', selSeed: 'ashgrass', selFood: null, selOffer: null, troughFood: null,
      seeds: { ashgrass: 6 }, food: {}, offerings: {}, blessed: {}, artifacts: {}, lastSite: 'grove',
      summoned: {}, blessings: {}, fruits: {}, up: {}, decor: {}, staged: {}, plots: { home: true },
      world: { strokes: [], blades: [], flowers: [], crops: [], sprouts: [], weeds: null, restored: 0 },
      brush: 1, devotion: 0, rank: 'stray', omen: null, omenDay: -1, crates: {}, furniture: [],
      msgs: null, shots: null, trophies: 0, spins: 0, wombats: [], objects: null, arrived: false, pairFirst: null, step: 0, visited: {}, tiers: { sickle: 0, hoe: 0, water: 0 },
      stats: { fed: 0, pets: 0, left: 0, gathered: 0, harvested: 0, earned: 0, lost: 0, collapses: 0, summons: 0, sold: 0 },
      pointer: { x: 320, y: 240, on: false },
      paused: false, muted: false, musicOff: false, lastSave: Date.now(), seen: false,
    };
  }
  function save() {
    if (!G) return;
    try {
      World.save();
      Sky.save();
      Grove.saveObjects();
      G.lastSave = Date.now();
      if (!playing) return;
      const body = Object.assign({}, G, { paused: false, pointer: undefined });
      booted = body;
      Store.put(KEY(), body);
      slotSaves[slot] = body;
    } catch (e) { }
  }
  function load(d) {
    try {
      if (!d) return null;
      const s = fresh();
      for (const k of Object.keys(s)) if (d[k] !== undefined) s[k] = d[k];
      s.stats = Object.assign(fresh().stats, d.stats || {});
      s.world = Object.assign(fresh().world, d.world || {});
      s.pointer = { x: 320, y: 240, on: false };
      for (const bag of [s.offerings, s.blessed]) for (const k of Object.keys(bag)) if (!OFFERINGS[k]) delete bag[k];
      for (const bag of [s.seeds, s.food]) for (const k of Object.keys(bag)) if (!CROP_BY_KEY[k]) delete bag[k];
      for (const w of s.wombats) {
        w.pets = []; w.state = 'idle'; w.stateT = 1; w.sq = 0; w.anim = U.rand(0, 9); w.chew = 0; w.claim = null;
        if (!w.traits) w.traits = { gut: 1, calm: 1, luck: 1 };
        if (typeof w.thirst !== 'number') w.thirst = U.rand(0, 30);
        if (typeof w.bored !== 'number') w.bored = U.rand(0, 30);
        w.turnT = 0;
        if (!w.pelt || !FUR_BY_KEY[w.pelt]) w.pelt = 'brown';
        if (!w.age) w.age = 'adult';
        if (w.stomach === 'ready') { w.stomach = 'digesting'; w.digestT = 0.5; w.digestTotal = Math.max(1, w.digestTotal || 1); }
        if (w.stomach === 'digesting' && !CROP_BY_KEY[w.food]) { w.stomach = 'empty'; w.food = null; }
      }
      if (!s.plots || typeof s.plots !== 'object') s.plots = {};
      s.plots.home = true;                    // the home plot is never for sale
      if (!TOOL_BY_KEY[s.tool]) s.tool = 'sickle';
      s.mode = 'grove';
      return s;
    } catch (e) { return null; }
  }
  // the first words of the grove, held back until the intro is over
  function openingBeats() {
    if (!G || G.seen) return;
    G.seen = true;
    FX.title('WOMBAT GODS', { size: 20, color: PAL.div4, dur: 2.6, style: 'slam', sub: 'restore the grove' });
    setTimeout(() => UI.toast('the grove is dead', 'bad'), 1400);
    setTimeout(() => UI.toast('clear the list and one will come'), 6400);
  }
  function reset() { Store.clear(KEY()).then(() => location.reload(), () => location.reload()); }
  // ---- the three groves ---------------------------------------------------
  // A card on the title screen for each: what it has in it, or that it is
  // empty. Wiping one asks twice and only touches that one.
  function slotInfo(n) {
    const d = slotSaves[n];
    if (!d) return { n, empty: true };
    const rank = (CULT_RANKS_BY_KEY[d.rank] || {}).name || 'Stray';
    return {
      n, empty: false, rank,
      wd: d.wd || 0, wombats: (d.wombats || []).length,
      gods: Object.keys(d.summoned || {}).length,
      time: d.time || 0,
    };
  }
  function slotList() { return SLOTS.map(slotInfo); }
  function pickSlot(n) {
    slot = n;
    booted = slotSaves[n] || null;
    try { localStorage.setItem(KEY_BASE + ':last', String(n)); } catch (e) { }
    Menu.setSave(booted);
  }
  function wipeSlot(n) {
    slotSaves[n] = null;
    Store.clear(keyOf(n));
    if (n === slot) { booted = null; Menu.setSave(null); }
    Audio.play('error');
  }

  // ---- the title screen ----------------------------------------------------
  // Nothing is loaded until you walk in, so the title can stand on its own.
  function applySettings() {
    G.muted = !!settings.muted; G.musicOff = !!settings.musicOff;
    Audio.setState(settings.muted, !settings.musicOff);
    FX.cam.noShake = settings.shake === false;
    document.documentElement.classList.toggle('bigtext', !!settings.bigText);
  }
  function toMenu() {
    if (playing) save();
    playing = false;
    G.mode = 'menu';
    UI.hideAll(); UI.closePanels(); UI.setMode('menu');
    Menu.setSave(booted); Menu.enter();
  }
  // You walk into the wood; the game is loaded while it is dark.
  function startGame() {
    if (FX.curtaining) return;
    Audio.init(); Audio.resume();
    FX.trees(() => {
      playing = true;
      const fromSave = load(booted);
      const g2 = fromSave || fresh();
      for (const k of Object.keys(G)) delete G[k];
      Object.assign(G, g2);
      applySettings();
      Sky.init(G); World.init(G); Cult.init(G); Rite.init(G); Den.init(G); Grove.init(G); Ritual.init(G); Atlas.init(G);
      Shop.init(G); Nursery.init(G); Guide.init(G); Intro.init(G); Talk.init(G); Phone.init(G);
      FX.clear(); FX.clearComics();
      const away = (Date.now() - (G.lastSave || Date.now())) / 1000;
      if (away > 30) {
        const made = G.wombats.some((w) => w.stomach === 'digesting') ? Grove.offline(Math.min(away, 7200)) : 0;
        if (made > 0) setTimeout(() => UI.toast(`${U.time(Math.min(away, 14400))} away &middot; <b>${made}</b> poop`, 'good'), 900);
      }
      G.paused = false;
      if (!G.introDone) { G.mode = 'intro'; Intro.enter(); UI.setMode('intro'); }
      else { G.mode = 'grove'; Grove.enter(); UI.setMode('grove'); }
      UI.refreshAll();
      save();
    }, () => { if (!G.seen && G.introDone) openingBeats(); });
  }
  function menuAction(a) {
    if (a.slot) { pickSlot(a.slot); return; }
    if (a.wipeSlot) { wipeSlot(a.wipeSlot); return; }
    if (a.play) { startGame(); return; }
    if (a.toggle) {
      settings[a.toggle] = !settings[a.toggle];
      Store.putSettings(settings);
      applySettings();
      Audio.play('click');
      return;
    }
    if (a.wipe) {
      booted = null;
      slotSaves[slot] = null;
      Store.clear(KEY());
      Menu.setSave(null);
      Audio.play('error');
    }
  }

  // ---- modes --------------------------------------------------------------
  function setMode(mode) {
    if (Ritual.active) return;
    G.mode = mode;
    if (!G.visited) G.visited = {};
    G.visited[mode] = true;
    if (mode !== 'map') G.lastSite = mode;
    if (mode !== 'grove' && G.wombats.some((w) => w.riding)) G.rode = true;   // somebody came along
    UI.setMode(mode);
    FX.clear(); FX.flash('#efe8f6', 0.42);   // scenes change through a breath of cloud, not a blackout
    if (mode !== 'shop' && mode !== 'nursery') Audio.play('whoosh');
    FX.cam.x = 320; FX.cam.y = 180; FX.cam.zoom = 1; FX.cam.tzoom = 1; FX.cam.tx = 320; FX.cam.ty = 180;
    if (mode === 'intro') Intro.enter();
    else if (mode === 'grove') Grove.enter();
    else if (mode === 'map') Atlas.enter();
    else if (mode === 'shop') Shop.enter();
    else if (mode === 'nursery') Nursery.enter();
    else if (mode === 'shrine') Ritual.enter();
    else if (mode === 'den') Den.enter();
    if (mode !== 'shrine') Ritual.leave();
    if (mode !== 'den') Den.leave();
    Audio.setMode('pen');
    save();
  }
  function back() {
    if (G.mode === 'shrine' || G.mode === 'shop' || G.mode === 'nursery' || G.mode === 'den') setMode('map');
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
    const step = Math.max(3, Grove.brushSize(TOOL_BY_KEY[G.tool] || { radius: 8 }) * 0.34);
    const n = Math.min(24, Math.floor(dist / step));
    for (let i = 1; i <= n; i++) Grove.press(lastP.x + (dx * i) / n, lastP.y + (dy * i) / n, false);
    if (n > 0) lastP = p;
  }

  function bind() {
    canvas.addEventListener('pointerdown', (e) => {
      Audio.init(); Audio.resume();
      canvas.setPointerCapture?.(e.pointerId);
      const pm = pos(e);
      if (G.mode === 'menu') { if (!FX.curtaining) Menu.press(pm.x, pm.y); return; }
      if (Rite.active()) { Rite.press(pm.x, pm.y); return; }
      if (Ritual.active) { Ritual.skip(); return; }
      if (UI.anyPanel() || G.paused) return;
      const p = pm;
      if (e.button === 2) {
        if (G.mode === 'grove') UI.openWheel(p.x, p.y);
        else if (G.mode === 'shrine') Ritual.press(p.x, p.y, true);
        return;
      }
      if (UI.wheelOpen()) { UI.closeWheel(); return; }
      down = true; lastP = null; downP = p; moved = 0; panning = false;
      screenP = p;
      if (G.mode === 'intro') { Intro.press(p.x, p.y); return; }
      if (G.mode === 'grove') {
        const w = world(p);
        if (Guide.hit(w.x, w.y)) { Guide.poke(); down = false; return; }
        const consumed = Grove.press(w.x, w.y, true);
        if (consumed || (TOOL_BY_KEY[G.tool] || {}).terra) lastP = w;
        else { panning = true; lastP = p; }     // grabbed nothing: drag the view
      } else if (G.mode === 'shop') Shop.press(p.x, p.y);
      else if (G.mode === 'nursery') Nursery.press(p.x, p.y);
      else if (G.mode === 'shrine') Ritual.press(p.x, p.y, false);
      else if (G.mode === 'den') Den.press(p.x, p.y);
    });
    canvas.addEventListener('pointermove', (e) => {
      const p = pos(e);
      if (G.mode === 'menu') { Menu.move(p.x, p.y); return; }
      if (Rite.active()) { Rite.move(p.x, p.y); return; }
      screenP = p;
      const wp = world(p);
      G.pointer.x = wp.x; G.pointer.y = wp.y; G.pointer.on = true;
      if (G.mode === 'intro') { Intro.move(p.x, p.y); return; }
      if (G.mode === 'shrine') { Ritual.move(p.x); return; }
      if (Ritual.active) return;
      if (downP) moved = Math.max(moved, Math.hypot(p.x - downP.x, p.y - downP.y));
      if (down) {
        if (G.mode === 'grove') {
          if (panning) { Grove.panBy(-(p.x - lastP.x)); lastP = p; UI.hideTip(); return; }
          if (G.tool === 'drag') { Grove.move(wp.x, wp.y); UI.hideTip(); return; }
          stroke(wp); UI.hideTip(); return;
        }
        if (G.mode === 'shop') { Shop.move(p.x, p.y); UI.hideTip(); return; }
        if (G.mode === 'nursery') { Nursery.move(p.x, p.y); UI.hideTip(); return; }
        if (G.mode === 'den') { Den.move(p.x, p.y); UI.hideTip(); return; }
      }
      let tip = null;
      if (G.mode === 'grove') tip = Grove.hover(wp.x, wp.y);
      else if (G.mode === 'map') tip = Atlas.hover(p.x, p.y);
      else if (G.mode === 'shop') tip = Shop.hover(p.x, p.y);
      else if (G.mode === 'nursery') tip = Nursery.hover(p.x, p.y);
      else if (G.mode === 'den') tip = Den.hover(p.x, p.y);
      if (tip) UI.showTip(e, tip); else UI.hideTip();
    });
    const release = (e) => {
      if (G.mode === 'intro') { Intro.release(); down = false; return; }
      if (!down) { down = false; lastP = null; downP = null; return; }
      const p = e ? pos(e) : downP;
      const wp = world(p);
      if (G.mode === 'grove') { if (!panning) Grove.release(wp.x, wp.y); }
      else if (G.mode === 'shop') Shop.release(p.x, p.y);
      else if (G.mode === 'nursery') Nursery.release(p.x, p.y);
      else if (G.mode === 'map' && moved < 8) Atlas.click(p.x, p.y);
      down = false; lastP = null; downP = null; panning = false;
    };
    window.addEventListener('pointerup', (e) => release(e));
    window.addEventListener('pointercancel', () => { down = false; lastP = null; downP = null; });
    canvas.addEventListener('pointerleave', () => { G.pointer.on = false; UI.hideTip(); });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('wheel', (e) => {
      if (G.mode === 'grove') {
        e.preventDefault();
        // with the hammer or the ground brush out, the wheel changes what is
        // on the end of it rather than how close you are standing
        if (G.tool === 'build') { Grove.cycleBuild(e.deltaY < 0 ? -1 : 1); return; }
        if ((TOOL_BY_KEY[G.tool] || {}).terra) { Grove.nudgeBrush(e.deltaY < 0 ? 1 : -1); return; }
        if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) Grove.panBy((Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY) * 0.8);
        else { const p = pos(e); Grove.zoomBy(e.deltaY < 0 ? 1.14 : 1 / 1.14, p.x, p.y); }
      }
      else if (G.mode === 'shop') { e.preventDefault(); Shop.wheel(e.deltaY * 0.6); }
      else if (G.mode === 'nursery') { e.preventDefault(); Nursery.wheel(e.deltaY * 0.6); }
      else if (G.mode === 'shrine') { e.preventDefault(); Ritual.wheel(e.deltaY); }
      else if (G.mode === 'den') { e.preventDefault(); Den.wheel(e.deltaY * 0.6); }
    }, { passive: false });

    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'SELECT' || e.target.tagName === 'INPUT') return;
      Audio.init();
      if (G.mode === 'menu') { if (!FX.curtaining && Menu.key(e.key)) e.preventDefault(); return; }
      if (Rite.active()) { if (Rite.key(e.key)) e.preventDefault(); return; }
      if (Ritual.active) { Ritual.skip(); return; }
      if (UI.anyPanel()) return;
      if (G.mode === 'grove' && (e.key === '[' || e.key === ']')) { Grove.nudgeBrush(e.key === ']' ? 1 : -1); e.preventDefault(); return; }
      if (G.mode === 'shrine' && Ritual.keyDown(e.key)) { e.preventDefault(); return; }
      if (e.key === 'Tab' || e.key === ' ') { if (G.mode === 'grove') { e.preventDefault(); if (UI.wheelOpen()) UI.closeWheel(); else UI.openWheel(screenP.x, screenP.y); } return; }
      if (e.key === 'Escape' || e.key === 'Backspace') {
        if (UI.wheelOpen()) { UI.closeWheel(); return; }
        if (G.mode !== 'grove') back(); else toMenu();
        e.preventDefault(); return;
      }
      if (e.key === 'm' || e.key === 'M') { if (G.mode === 'grove') setMode('map'); return; }
      if (G.mode === 'grove' && (e.key === '+' || e.key === '=')) { Grove.zoomBy(1.18, screenP.x, screenP.y); e.preventDefault(); return; }
      if (G.mode === 'grove' && (e.key === '-' || e.key === '_')) { Grove.zoomBy(1 / 1.18, screenP.x, screenP.y); e.preventDefault(); return; }
      if (e.key === 'h' || e.key === 'H') { UI.openPanel('panel-help'); return; }
      if (G.mode === 'grove') {
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
    Sky.update(real);            // one clock and one weather front for the whole game

    if (G.mode === 'menu') Menu.update(real);
    else if (G.mode === 'intro') Intro.update(real);
    else Ritual.update(gdt, real);
    if (G.mode !== 'intro' && G.mode !== 'menu' && !G.paused) {
      World.update(real);
      Grove.update(real);
      Guide.update(real);
      // the view follows the pointer at the edges, and keeps doing so while a cube is being carried
      if (G.mode === 'grove' && G.pointer.on && (!down || (G.tool === 'drag' && !panning)) && !UI.anyPanel()) Grove.edgeScroll(screenP.x, real);
      else if (G.mode === 'map') Atlas.update(real);
      else if (G.mode === 'shop') Shop.update(real);
      else if (G.mode === 'nursery') Nursery.update(real);
      else if (G.mode === 'den') Den.update(real);
    } else if (Grove.arriving) {
      Grove.update(real);
    }
    // The rite pauses the world but its own effects must keep running, or
    // bolts and roots spawned during the cutscene never expire.
    // Shaping the ground is a held spell: it keeps working while the button is
    // down even if your hand is perfectly still, the way a sculpting brush does.
    if (playing && !G.paused && down && !panning && G.mode === 'grove' && (TOOL_BY_KEY[G.tool] || {}).terra && lastP) {
      Grove.press(lastP.x, lastP.y, false);
    }
    Rite.update(real);                            // dialogue runs while the world is held
    if (playing && !G.paused) Cult.update();       // the day turns, the omen turns with it
    FX.updateWorld(Ritual.active ? real : (G.paused ? 0 : real));

    g.setTransform(1, 0, 0, 1, 0, 0);
    g.imageSmoothingEnabled = false;
    g.clearRect(0, 0, W, H);
    if (G.mode === 'menu') Menu.render(g);
    else if (Ritual.active) Ritual.renderScene(g);
    else {
      g.save(); g.translate(FX.cam.shakeX, FX.cam.shakeY);
      if (G.mode === 'intro') Intro.render(g);
      else if (G.mode === 'grove') Grove.render(g);
      else if (G.mode === 'shrine') Ritual.renderShrine(g);
      else if (G.mode === 'map') Atlas.render(g);
      else if (G.mode === 'shop') Shop.render(g);
      else if (G.mode === 'den') Den.render(g);
      else Nursery.render(g);
      g.restore();
    }
    Rite.render(g);                   // whoever is talking stands in front of it all
    FX.drawCoins(g, false);           // money on its way to the corner
    FX.drawCinema(g, W, H);
    FX.drawTrees(g, W, H);            // the curtain sits above everything

    if (Math.floor(G.time * 4) !== Math.floor((G.time - real) * 4)) {
      UI.refreshHUD();
      if (G.mode === 'grove') UI.refreshZoom();
      if (G.mode === 'shrine') UI.refreshRitual();
    }
  }

  // A short splash while the save is fetched: published as an Artifact the
  // store answers over a channel, and that takes a moment.
  function splash() {
    g.fillStyle = '#241230'; g.fillRect(0, 0, W, H);
    Art.vband(g, 0, 0, W, H, '#533070', '#241230', 8);
    FX.pixelText(g, 'WOMBAT GODS', W / 2, H / 2 - 22, { color: '#f2cf62', size: 26, ink: 3, inkColor: 'rgba(0,0,0,0.6)' });
    FX.pixelText(g, 'opening the grove', W / 2, H / 2 + 14, { color: '#c2a176', size: 14, ink: false });
  }
  async function init() {
    canvas = document.getElementById('game');
    g = canvas.getContext('2d');
    resize();
    splash();
    Sprites.init();
    // read all three, then open on the one you were last in
    try { slot = Math.min(3, Math.max(1, parseInt(localStorage.getItem(KEY_BASE + ':last') || '1', 10) || 1)); } catch (e) { slot = 1; }
    for (const n of SLOTS) slotSaves[n] = await Store.boot(keyOf(n));
    booted = slotSaves[slot];
    settings = Object.assign({ muted: false, musicOff: false, shake: true, bigText: false }, Store.settings());
    G = fresh();
    G.mode = 'menu';
    window.G = G;
    Sky.init(G); World.init(G);
    Cult.init(G); Rite.init(G); Den.init(G); Grove.init(G); Ritual.init(G); Atlas.init(G); Shop.init(G); Nursery.init(G); Guide.init(G); Intro.init(G); Talk.init(G); Phone.init(G); UI.init(G);
    Menu.init(settings, booted, menuAction);
    Menu.enter();
    applySettings();
    UI.setMode('menu');
    window.addEventListener('resize', resize);
    resize(); setTimeout(resize, 60);
    bind();
    requestAnimationFrame((t) => { last = t; requestAnimationFrame(frame); });
  }
  if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', init);
  else init();
  return {
    slotList, pickSlot, wipeSlot, get slot() { return slot; }, save, reset, setMode, back, openingBeats, toMenu, startGame, menuAction, get playing() { return playing; }, get settings() { return settings; }, get G() { return G; } };
})();
