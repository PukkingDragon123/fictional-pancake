// ---- Main: state, save/load, loop, input -----------------------------------
const Main = (() => {
  const SAVE_KEY = 'wombat-cube-tycoon-v1';
  const W = 640, H = 360;
  let canvas, g, last = 0;
  let G = null;

  function freshState() {
    return {
      v: 1, money: 40, sp: 0, record: 0, runs: 0, time: 0, mode: 'pen',
      food: { grass: 6, carrot: 2 }, unlockedFoods: { grass: true, carrot: true },
      cubes: {}, premium: {}, toys: {}, decos: {}, fac: {}, skills: {},
      wombats: [], selectedFood: 'grass', selectedCube: null, troughFood: null,
      stats: { fed: 0, pets: 0, pooped: 0, collected: 0, earned: 0, lost: 0, collapses: 0, bestEarned: 0 },
      paused: false, muted: false, musicOff: false, lastSave: Date.now(), seenIntro: false,
    };
  }
  function save() {
    if (!G) return;
    try { G.lastSave = Date.now(); const copy = Object.assign({}, G, { paused: false }); localStorage.setItem(SAVE_KEY, JSON.stringify(copy)); } catch (e) { }
  }
  function load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY); if (!raw) return null;
      const d = JSON.parse(raw); const s = freshState();
      for (const k of Object.keys(s)) if (d[k] !== undefined) s[k] = d[k];
      s.stats = Object.assign(freshState().stats, d.stats || {});
      for (const w of s.wombats) { w.pets = []; w.state = 'idle'; w.stateT = 1; w.sq = 0; w.anim = U.rand(0, 10); if (w.stomach === 'ready') { w.stomach = 'digesting'; w.digestT = 0.5; } }
      return s;
    } catch (e) { return null; }
  }
  function reset() { localStorage.removeItem(SAVE_KEY); location.reload(); }

  function setMode(mode) {
    if (mode === 'pen' && Tower.active) { UI.toast('Finish the run first: cash out or let it fall.', 'bad'); Audio.play('error'); return; }
    G.mode = mode; UI.setMode(mode);
    Audio.setMode(mode === 'tower' && Tower.active ? 'tower' : 'pen');
    FX.clear();
    if (mode === 'tower') { FX.cam.x = 320; FX.cam.y = 180; FX.cam.zoom = 1; FX.flash('#000', 0.6); }
    else { FX.flash('#000', 0.6); }
    Audio.play('whoosh');
  }

  // ---- input --------------------------------------------------------------
  function canvasPos(e) { const r = canvas.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H }; }
  function bindInput() {
    canvas.addEventListener('mousedown', (e) => {
      Audio.init(); Audio.resume();
      if (UI.anyPanelOpen() || G.paused) return;
      const p = canvasPos(e);
      if (G.mode === 'pen') Pen.click(p.x, p.y); else Tower.click(p.x, p.y);
    });
    canvas.addEventListener('mousemove', (e) => {
      const p = canvasPos(e);
      if (G.mode === 'pen') { const tip = Pen.hover(p.x, p.y); if (tip) UI.showTip(e, tip); else UI.hideTip(); }
      else { Tower.setMouse(p.x); UI.hideTip(); }
    });
    canvas.addEventListener('mouseleave', UI.hideTip);
    canvas.addEventListener('touchstart', (e) => { Audio.init(); if (UI.anyPanelOpen() || G.paused) return; const t = e.changedTouches[0]; const p = canvasPos(t); if (G.mode === 'pen') Pen.click(p.x, p.y); else Tower.click(p.x, p.y); e.preventDefault(); }, { passive: false });
    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'SELECT' || e.target.tagName === 'INPUT') return;
      Audio.init();
      if (UI.anyPanelOpen()) return;
      if (e.key === 'Tab') { e.preventDefault(); setMode(G.mode === 'pen' ? 'tower' : 'pen'); return; }
      if (G.mode === 'tower') { if (Tower.key(e.key)) e.preventDefault(); if (e.key === 'c' || e.key === 'C') Tower.cashOut(); }
      else {
        const n = parseInt(e.key); if (n >= 1 && n <= 9) { const foods = FOODS.filter((f) => G.unlockedFoods[f.key]); const f = foods[n - 1]; if (f) { G.selectedFood = G.selectedFood === f.key ? null : f.key; UI.refreshHotbar(); Audio.play('click'); } }
        if (e.key === '0' || e.key === 'p' || e.key === 'P') { G.selectedFood = null; UI.refreshHotbar(); }
      }
      if (e.key === 's' || e.key === 'S') UI.openShop();
      if (e.key === 'k' || e.key === 'K') UI.openSkills();
    });
    window.addEventListener('blur', save);
    window.addEventListener('beforeunload', save);
    setInterval(save, 10000);
  }

  // ---- loop ---------------------------------------------------------------
  function frame(ts) {
    requestAnimationFrame(frame);
    let real = Math.min(0.1, (ts - last) / 1000 || 0); last = ts;
    if (real <= 0) return;
    FX.update(real);
    const c = FX.cine;
    let gdt = real * c.slowmo;
    if (c.freeze > 0 || c.hitstop > 0) gdt = 0;
    if (G.paused) gdt = 0;
    G.time += real;
    if (!G.paused) { Pen.update(real); }
    Tower.update(gdt, real);
    FX.updateWorld(G.mode === 'pen' ? (G.paused ? 0 : real) : gdt); // pen is never slowed; tower particles follow slow-mo/freeze
    // render
    g.imageSmoothingEnabled = false;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, W, H);
    if (G.mode === 'pen') { g.save(); g.translate(FX.cam.shakeX, FX.cam.shakeY); Pen.render(g); g.restore(); }
    else Tower.render(g);
    FX.drawCinema(g, W, H);
    // HUD refresh (cheap, throttled)
    if (Math.floor(G.time * 4) !== Math.floor((G.time - real) * 4)) { UI.refreshHUD(); if (Tower.active) UI.refreshRunHUD(); }
  }

  function resize() {
    const st = document.getElementById('stage'); const sw = st.clientWidth, sh = st.clientHeight;
    const scale = Math.min(sw / W, sh / H);
    canvas.style.width = Math.floor(W * scale) + 'px'; canvas.style.height = Math.floor(H * scale) + 'px';
  }
  function init() {
    canvas = document.getElementById('game'); g = canvas.getContext('2d');
    window.addEventListener('resize', resize); resize(); setTimeout(resize, 50);
    Sprites.init();
    G = load() || freshState();
    window.G = G;
    Pen.init(G); Tower.init(G); UI.init(G);
    if (G.wombats.length === 0) { const w = Pen.addWombat(); }
    // offline progress
    const away = (Date.now() - (G.lastSave || Date.now())) / 1000;
    if (away > 30 && G.wombats.some((w) => w.stomach === 'digesting')) { const made = Pen.offline(Math.min(away, 7200)); if (made > 0) setTimeout(() => UI.toast(`While you were away (${U.time(Math.min(away, 7200))}), your wombats produced <b>${made}</b> cubes.`, 'good'), 600); }
    G.paused = false;
    Audio.setState(G.muted, !G.musicOff);
    UI.setMode(G.mode = 'pen');
    UI.refreshHUD(); UI.refreshHotbar(); UI.refreshCubeBar();
    bindInput();
    if (!G.seenIntro) { G.seenIntro = true; setTimeout(() => { UI.toast('Welcome! Select 🌿 Grass below, then click <b>' + G.wombats[0].name + '</b> to feed. Pet while digesting to speed it up.', 'good'); }, 800); setTimeout(() => UI.toast('When you have cubes, hit 🏗️ TOWER and stack them for money.', ''), 6000); }
    FX.title('WOMBAT CUBE TYCOON', { size: 20, color: '#ffd23f', dur: 2.6, style: 'slam', sub: 'FEED • POOP • STACK • PROFIT' });
    requestAnimationFrame((t) => { last = t; requestAnimationFrame(frame); });
  }

  window.addEventListener('DOMContentLoaded', init);
  return { save, reset, setMode, get G() { return G; } };
})();
