// ---- Wombat Farm ---------------------------------------------------------------
// One little farm on one screen. Till, water, plant, pick, sell. Feed and pet
// the wombats and they dig up coins and leave the best fertiliser there is.
// The shovel shapes the land itself: hold to raise it, right-click to lower it.
(() => {
  const W = 480, H = 270, T = Look.T, LH = Look.LH;
  const COLS = 30, ROWS = 14, GY = 20, N = COLS * ROWS;
  const KEY = 'wombat-farm-1';
  const CROPS = {
    carrot:  { name: 'Carrot',  seed: 4,  sell: 7,  grow: 40,  food: 0.45 },
    cabbage: { name: 'Cabbage', seed: 8,  sell: 16, grow: 70,  food: 0.65 },
    pumpkin: { name: 'Pumpkin', seed: 18, sell: 36, grow: 120, food: 1 },
  };
  const KINDS = ['carrot', 'cabbage', 'pumpkin'];
  const WET = 45, DAY = 360, NIGHT = 120, CYCLE = DAY + NIGHT;
  const MAX_WOMBATS = 12, GOAL_WOMBATS = 6;
  const NAMES = ['Biscuit', 'Pudding', 'Mochi', 'Dumpling', 'Nugget', 'Crumpet', 'Toffee', 'Bean', 'Muffin', 'Pebble',
    'Waffle', 'Potato', 'Scone', 'Pickle', 'Noodle', 'Button', 'Fudge', 'Truffle', 'Bramble', 'Clover'];
  const TOOLS = [
    { id: 'hand',   name: 'Hand',          tip: 'Pet, carry and pick veg' },
    { id: 'hoe',    name: 'Hoe',           tip: 'Drag to till  -  right-click undo' },
    { id: 'can',    name: 'Watering can',  tip: 'Drag over soil to water it' },
    { id: 'seeds',  name: 'Seeds',         tip: 'Click tilled soil to plant' },
    { id: 'food',   name: 'Veg basket',    tip: 'Drop veg for hungry wombats' },
    { id: 'fert',   name: 'Fertiliser',    tip: 'Wombat poo: crops grow 2x' },
    { id: 'shovel', name: 'Shovel',        tip: 'Hold to raise  -  right-click lower' },
  ];
  const SIZED = { hoe: 1, can: 1, shovel: 1 };
  const GUIDE = [
    ['planted',   'Plant seeds in the tilled soil', 'seeds'],
    ['watered',   'Water your seeds with the can', 'can'],
    ['ripe',      'Crops grow while soil is wet', 'can'],
    ['harvested', 'Pick ripe veg with the hand', 'hand'],
    ['sold',      'Sell veg at the farm stand', 'coin'],
    ['fed',       'Feed some veg to a wombat', 'food'],
    ['shaped',    'Hold the shovel to shape land', 'shovel'],
  ];

  // ---- the canvas -------------------------------------------------------------
  const canvas = document.getElementById('game');
  canvas.width = W; canvas.height = H;
  const g = canvas.getContext('2d');
  g.imageSmoothingEnabled = false;
  function fit() {
    const k = Math.min(innerWidth / W, innerHeight / H);
    const f = Math.floor(k);
    const s = f >= 1 && f / k > 0.82 ? f : k;              // whole pixels when it costs little room
    canvas.style.width = Math.floor(W * s) + 'px';
    canvas.style.height = Math.floor(H * s) + 'px';
  }
  addEventListener('resize', fit); fit();

  // ---- the grid ---------------------------------------------------------------
  const idx = (c, r) => r * COLS + c;
  const inb = (c, r) => c >= 0 && r >= 0 && c < COLS && r < ROWS;
  let S = null;
  const lvI = (i) => U.clamp(Math.round(S.h[i]), -1, 3);
  function lv(c, r) { if (r < 0 || r >= ROWS) return 0; return lvI(idx(U.clamp(c, 0, COLS - 1), r)); }
  const topY = (c, r) => GY + r * T - lv(c, r) * LH;
  const tileOf = (x, y) => ({ c: Math.floor(x / T), r: Math.floor((y - GY) / T) });
  const walkable = (c, r) => inb(c, r) && !blocked[idx(c, r)] && lv(c, r) >= 0;
  function groundAt(x, y) { const t = tileOf(x, y); return inb(t.c, t.r) ? lv(t.c, t.r) : 0; }

  // the fixed bits of the yard: they sit on flat ground and cannot be dug
  const feats = [], blocked = new Uint8Array(N);
  function feat(kind, c, r, w, h, v) {
    feats.push({ kind, c, r, w, h, v: v || 0 });
    for (let y = r; y < r + h; y++) for (let x = c; x < c + w; x++) if (inb(x, y)) blocked[idx(x, y)] = 1;
  }
  feat('house', 1, 0, 5, 3); feat('stand', 23, 1, 4, 2);
  [[8, 0], [19, 0], [0, 4], [28, 4], [29, 9], [0, 10], [28, 0]].forEach(([c, r], i) => feat('tree', c, r, 1, 1, i));
  [[12, 0], [15, 0], [0, 7], [29, 6], [29, 12], [0, 13], [8, 13]].forEach(([c, r], i) => feat('bush', c, r, 1, 1, i));
  const HOUSE = { x: 1 * T - 3, y: GY + 3 * T - 68, w: 86, h: 70 };
  const STAND = { x: 23 * T + 2, y: GY + 3 * T - 48, w: 60, h: 50 };

  // ---- a new farm ---------------------------------------------------------------
  function blank() {
    const s = { v: 1, coins: 20, seeds: { carrot: 6, cabbage: 0, pumpkin: 0 }, basket: { carrot: 0, cabbage: 0, pumpkin: 0 }, poo: 0,
      day: 1, clock: 20, rain: 0, rainNext: 220, h: [], soil: [], wet: [], fert: [], crop: [], wombats: [], drops: [],
      stats: { planted: 0, watered: 0, ripe: 0, harvested: 0, sold: 0, fed: 0, shaped: 0, pets: 0 }, names: 0, lastSave: 0 };
    for (let i = 0; i < N; i++) { s.h.push(0); s.soil.push(0); s.wet.push(0); s.fert.push(0); s.crop.push(null); }
    return s;
  }
  function newFarm() {
    S = blank();
    const set = (c, r, v) => { if (inb(c, r) && !blocked[idx(c, r)]) S.h[idx(c, r)] = v; };
    for (let r = 7; r <= 9; r++) for (let c = 20; c <= 23; c++) set(c, r, -1);          // the pond
    set(21, 6, -1); set(22, 6, -1); set(21, 10, -1); set(22, 10, -1); set(24, 8, -1); set(19, 8, -1);
    for (let r = 9; r <= 12; r++) for (let c = 2; c <= 5; c++) set(c, r, 1);            // a little hill
    set(3, 10, 2); set(4, 10, 2); set(3, 11, 2); set(4, 11, 2); set(6, 11, 1); set(6, 10, 1);
    for (let r = 5; r <= 6; r++) for (let c = 10; c <= 15; c++) S.soil[idx(c, r)] = 1;   // a bed to start with
    S.wombats.push(rt(makeWombat(15 * T, GY + 9 * T, 'brown')));
    S.wombats.push(rt(makeWombat(18 * T, GY + 11 * T, 'grey')));
    return S;
  }
  function makeWombat(x, y, pelt) {
    return { name: NAMES[(S.names++) % NAMES.length], pelt, x, y, hunger: 0.4, love: 0.3, pooIn: -1, digIn: U.rand(20, 35) };
  }
  // what a wombat is doing right now is never saved
  function rt(w) {
    Object.assign(w, { id: U.uid(), z: groundAt(w.x, w.y), dir: Math.random() < 0.5 ? 1 : -1, st: 'idle', t: U.rand(0.5, 2.5),
      tx: w.x, ty: w.y, anim: Math.random() * 10, zt: 0, food: null, look: 0, bub: U.rand(2, 6), sleepy: U.rand(0, 14), chew: 0, dust: 0 });
    return w;
  }

  function serialize() {
    const crops = [];
    S.crop.forEach((c, i) => { if (c) crops.push([i, c.k, Math.round(c.p * 1000) / 1000]); });
    return {
      v: 1, coins: S.coins, seeds: S.seeds, basket: S.basket, poo: S.poo, day: S.day, clock: Math.round(S.clock), rainNext: Math.round(S.rainNext),
      h: S.h.map((v) => Math.round(v * 100) / 100), soil: S.soil.join(''), wet: S.wet.map((v) => Math.round(v)), fert: S.fert.join(''), crops,
      wombats: S.wombats.map((w) => ({ name: w.name, pelt: w.pelt, x: Math.round(w.x), y: Math.round(w.y), hunger: +w.hunger.toFixed(2), love: +w.love.toFixed(2), pooIn: Math.round(w.pooIn), digIn: Math.round(w.digIn) })),
      drops: S.drops.filter((d) => !d.gone).map((d) => ({ k: d.k, kind: d.kind, x: Math.round(d.x), y: Math.round(d.y) })),
      stats: S.stats, names: S.names, lastSave: Date.now(),
    };
  }
  function hydrate(o) {
    try {
      if (!o || o.v !== 1 || !Array.isArray(o.h) || o.h.length !== N) return null;
      const s = blank();
      for (const k of ['coins', 'poo', 'day', 'clock', 'rainNext', 'names']) if (typeof o[k] === 'number') s[k] = o[k];
      for (const k of KINDS) { s.seeds[k] = (o.seeds && o.seeds[k]) | 0; s.basket[k] = (o.basket && o.basket[k]) | 0; }
      Object.assign(s.stats, o.stats || {});
      for (let i = 0; i < N; i++) {
        s.h[i] = blocked[i] ? 0 : U.clamp(+o.h[i] || 0, -1.45, 3.45);
        s.soil[i] = o.soil && o.soil[i] === '1' ? 1 : 0;
        s.wet[i] = (o.wet && +o.wet[i]) || 0;
        s.fert[i] = o.fert && o.fert[i] === '1' ? 1 : 0;
      }
      for (const [i, k, p] of o.crops || []) if (CROPS[k] && i >= 0 && i < N) s.crop[i] = { k, p: U.clamp(+p || 0, 0, 1) };
      S = s;
      for (const w of o.wombats || []) S.wombats.push(rt(Object.assign({ hunger: 0.4, love: 0.3, pooIn: -1, digIn: 30 }, w, { pelt: PELTS[w.pelt] ? w.pelt : 'brown' })));
      for (const d of o.drops || []) if (d.k === 'coin' || d.k === 'poo' || (d.k === 'food' && CROPS[d.kind])) S.drops.push({ k: d.k, kind: d.kind, x: d.x, y: d.y, z: 0, vz: 0, vx: 0, vy: 0, t: 0 });
      return S;
    } catch (e) { return null; }
  }

  // ---- little moving bits ----------------------------------------------------------
  let parts = [], toasts = [], flyers = [];
  function puff(x, y, col, n, o = {}) {
    for (let i = 0; i < n; i++) parts.push({ kind: 'px', x: x + U.rand(-4, 4), y: y + U.rand(-2, 2), vx: U.rand(-1, 1) * (o.spread || 26), vy: -U.rand(0.2, 1) * (o.up || 36),
      g: o.g == null ? 110 : o.g, life: 0, max: U.rand(0.35, 0.7) * (o.life || 1), col: Array.isArray(col) ? U.pick(col) : col, s: Math.random() < 0.35 ? 2 : 1 });
  }
  const heartUp = (x, y) => parts.push({ kind: 'heart', x: x + U.rand(-3, 3), y, vx: U.rand(-8, 8), vy: -24, g: 0, life: 0, max: 1.1 });
  const floatText = (x, y, str, col) => parts.push({ kind: 'text', x, y, vx: 0, vy: -16, g: 0, life: 0, max: 1.3, str, col: col || P.ink });
  const zzz = (x, y) => parts.push({ kind: 'z', x, y, vx: 5, vy: -9, g: 0, life: 0, max: 1.9 });
  const spark = (x, y, col) => parts.push({ kind: 'spark', x: x + U.rand(-5, 5), y: y + U.rand(-4, 3), vx: U.rand(-6, 6), vy: U.rand(-18, -6), g: 0, life: 0, max: U.rand(0.5, 0.9), col: col || P.sun });
  function toast(str) {
    toasts = toasts.filter((t) => t.str !== str);
    toasts.push({ str, t: 0 });
    if (toasts.length > 3) toasts.shift();
  }
  const quiet = {};
  function sfx(name, gap = 0.07) { if ((quiet[name] || 0) > time) return; quiet[name] = time + gap; Sound.play(name); }
  const hud = { coin: { x: 12, y: H - 13 }, carrot: { x: 0, y: 0 }, cabbage: { x: 0, y: 0 }, pumpkin: { x: 0, y: 0 }, poo: { x: 0, y: 0 }, bump: {} };
  function fly(img, x, y, to, done) { flyers.push({ img, x, y, to, t: 0, done }); }

  // ambient life: butterflies by day, fireflies by night, drops of rain
  const flutter = Array.from({ length: 4 }, (_, i) => ({ x: U.rand(40, 440), y: U.rand(40, 220), a: Math.random() * 9, col: [P.pink, P.cream, P.sun, '#b8d8ff'][i] }));
  const flies = Array.from({ length: 16 }, () => ({ x: U.rand(0, W), y: U.rand(30, 240), a: Math.random() * 9 }));
  const rainDrops = Array.from({ length: 90 }, () => ({ x: U.rand(0, W + 60), y: U.rand(-H, H) }));

  // ---- state that is not the farm -------------------------------------------------
  let mode = 'title', time = 0, saved = null, confirmNew = 0, shopOpen = false, fade = null;
  let tool = 'hand', size = 2, digDir = 1, seedKind = 'carrot', foodKind = 'carrot', toolTip = 0;
  let shownCoins = 0, rainA = 0, saveT = 0, noteFlash = 0, lastGuide = -1;
  const mouse = { x: -99, y: -99, down: false, btn: 0, sx: 0, sy: 0, shift: false, touch: false, seen: false };
  let grab = null, held = null, drag = null, dragPick = false;
  let btns = [], lastBtns = [], hoverW = null;

  // ---- picking ------------------------------------------------------------------------
  // The front rows cover the ones behind, so look from the front back.
  function pick(mx, my) {
    const c = Math.floor(mx / T);
    if (c < 0 || c >= COLS) return null;
    for (let r = ROWS - 1; r >= 0; r--) {
      const L = lv(c, r), ty = GY + r * T - L * LH;
      const front = r + 1 < ROWS ? lv(c, r + 1) : -9;
      const bottom = ty + T + Math.max(0, L - front) * LH;
      if (my >= ty && my < bottom) return { c, r };
    }
    return null;
  }
  function groundPoint(mx, my) {
    const t = pick(mx, my);
    if (!t) return null;
    return { x: mx, y: GY + t.r * T + U.clamp(my - topY(t.c, t.r), 1, T - 1), c: t.c, r: t.r };
  }
  function brushTiles(c, r, n) {
    const R = (n == null ? size : n) - 1, out = [];
    for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) if (dx * dx + dy * dy <= R * R + R && inb(c + dx, r + dy)) out.push([c + dx, r + dy]);
    return out;
  }
  function wombatAt(mx, my) {
    const list = S.wombats.slice().sort((a, b) => b.y - a.y);
    for (const w of list) {
      if (w === held) continue;
      const sx = w.x - 13, sy = w.y - w.z * LH - 17;
      if (mx >= sx + 2 && mx <= sx + 24 && my >= sy + 2 && my <= sy + 19) return w;
    }
    return null;
  }
  const inside = (b, x = mouse.x, y = mouse.y) => x >= b.x && y >= b.y && x < b.x + b.w && y < b.y + b.h;

  // ---- farming ---------------------------------------------------------------------------
  const stageOf = (cr) => (cr.p >= 1 ? 3 : Math.floor(cr.p * 3));
  const centre = (c, r) => ({ x: c * T + 8, y: topY(c, r) + 8 });
  function useTool(c, r, alt, first) {
    const tiles = tool === 'seeds' || tool === 'fert' ? [[c, r]] : brushTiles(c, r);
    let n = 0;
    for (const [x, y] of tiles) {
      const i = idx(x, y), p = centre(x, y);
      if (tool === 'hoe') {
        if (alt) {
          if (S.soil[i] && !S.crop[i]) { S.soil[i] = 0; S.wet[i] = 0; S.fert[i] = 0; n++; puff(p.x, p.y, [P.grass1, P.grass2], 3); }
        } else if (!blocked[i] && lvI(i) >= 0 && !S.soil[i]) { S.soil[i] = 1; n++; puff(p.x, p.y + 2, [P.soil0, P.soil1, P.soil2], 5); }
      } else if (tool === 'can') {
        if (S.soil[i]) {
          if (S.crop[i] && S.wet[i] < 5) S.stats.watered++;
          S.wet[i] = WET; n++;
          puff(p.x, p.y - 2, [P.water1, P.water2, P.foam], 3, { up: 30, spread: 18 });
        }
      } else if (tool === 'seeds') {
        if (S.soil[i] && !S.crop[i] && S.seeds[seedKind] > 0) {
          S.seeds[seedKind]--; S.crop[i] = { k: seedKind, p: 0 }; S.stats.planted++; n++;
          puff(p.x, p.y, [P.leaf1, P.leaf2, P.soil0], 4);
        }
      } else if (tool === 'fert') {
        if (S.soil[i] && !S.fert[i] && S.poo > 0) { S.poo--; S.fert[i] = 1; n++; for (let k = 0; k < 5; k++) spark(p.x, p.y, P.mint); }
      }
    }
    if (n) sfx({ hoe: 'till', can: 'water', seeds: 'plant', fert: 'fert' }[tool], tool === 'can' ? 0.16 : 0.06);
    if (!n && first) {
      const i = idx(c, r);
      if (tool === 'seeds' && S.seeds[seedKind] <= 0) { toast(`No ${CROPS[seedKind].name.toLowerCase()} seeds - buy some at the stand`); sfx('nope'); }
      else if (tool === 'seeds' && !S.soil[i]) toast('Till the grass with the hoe first');
      else if (tool === 'fert' && S.poo <= 0) { toast('No poo yet - wombats leave some after a meal'); sfx('nope'); }
      else if (tool === 'can' && !S.soil[i]) toast('Water tilled soil, not grass');
    }
    return n;
  }
  function harvest(c, r, first) {
    const i = idx(c, r), cr = S.crop[i];
    if (!cr) return false;
    if (stageOf(cr) < 3) {
      if (first) toast(S.wet[i] > 0 ? 'Still growing...' : 'Thirsty! Water it with the can');
      return false;
    }
    const p = centre(c, r);
    S.crop[i] = null; S.fert[i] = 0; S.basket[cr.k]++; S.stats.harvested++;
    puff(p.x, p.y, [P.leaf1, P.leaf2, P.sun], 7, { up: 50 });
    const to = hud[cr.k];
    fly(Look.produce(cr.k), p.x - 5, p.y - 10, to, () => { hud.bump[cr.k] = 1; });
    sfx('harvest', 0.08);
    return true;
  }
  function grow(dt) {
    for (let i = 0; i < N; i++) {
      const cr = S.crop[i];
      if (cr && cr.p < 1 && S.wet[i] > 0) {
        const s0 = stageOf(cr);
        cr.p = Math.min(1, cr.p + Math.min(dt, S.wet[i]) / CROPS[cr.k].grow * (S.fert[i] ? 2 : 1));
        const s1 = stageOf(cr);
        if (s1 !== s0 && dt < 1) {
          const c = i % COLS, r = (i / COLS) | 0, p = centre(c, r);
          puff(p.x, p.y - 4, [P.leaf2, '#d8f5b8'], 4, { up: 30 });
          if (s1 === 3) { S.stats.ripe++; for (let k = 0; k < 4; k++) spark(p.x, p.y - 6); sfx('pop', 0.2); }
        }
        if (s1 === 3 && dt >= 1) S.stats.ripe++;
      }
      if (S.wet[i] > 0) S.wet[i] = Math.max(0, S.wet[i] - dt);
    }
  }

  // ---- the shovel -------------------------------------------------------------------------
  let dustT = 0;
  function shovelTick(dt) {
    if (!(mouse.down && tool === 'shovel' && drag)) return;
    const dir = (mouse.btn === 2 || mouse.shift) ? -digDir : digDir;
    const c = drag.c + Math.round((mouse.x - drag.x) / T), r = drag.r + Math.round((mouse.y - drag.y) / T);
    const R = size - 1;
    let changed = 0, wetted = false, dried = false;
    for (const [x, y] of brushTiles(c, r)) {
      const i = idx(x, y);
      if (blocked[i]) continue;
      const f = R ? 1 - 0.4 * Math.hypot(x - c, y - r) / (R + 0.5) : 1;
      const before = lvI(i);
      S.h[i] = U.clamp(S.h[i] + dir * 2.6 * dt * f, -1.45, 3.45);
      const after = lvI(i);
      if (after === before) continue;
      changed++;
      const p = centre(x, y);
      if (after < 0) {                                       // it is a pond now
        S.soil[i] = 0; S.crop[i] = null; S.fert[i] = 0; S.wet[i] = 0; wetted = true;
        puff(p.x, p.y, [P.water1, P.water2, P.foam], 6, { up: 50 });
      } else if (before < 0) { dried = true; puff(p.x, p.y, [P.soil1, P.soil2], 5); }
      else puff(p.x, p.y + 6, [P.soil0, P.soil1, P.cliff2, P.grass1], 4, { up: 44 });
    }
    if (changed) { S.stats.shaped++; if (wetted) sfx('splash', 0.2); else if (dried) sfx('dig', 0.1); else sfx(dir > 0 ? 'raise' : 'lower', 0.07); }
    dustT -= dt;
    if (dustT <= 0 && inb(c, r)) { dustT = 0.09; const p = centre(c, r); puff(p.x, p.y + 4, [P.soil1, P.soil2], 1, { up: 20 }); }
  }

  // ---- the wombats ---------------------------------------------------------------------------
  function relocate(w) {
    const t = tileOf(w.x, w.y);
    for (let rad = 1; rad < 12; rad++) {
      for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== rad) continue;
        if (walkable(t.c + dx, t.r + dy)) { w.x = (t.c + dx) * T + 8; w.y = GY + (t.r + dy) * T + 9; w.z = lv(t.c + dx, t.r + dy); return; }
      }
    }
  }
  const asleep = (w) => S.clock >= DAY + 4 + w.sleepy || S.clock < w.sleepy * 0.4;
  function wander(w) {
    for (let k = 0; k < 8; k++) {
      const tx = w.x + U.rand(-70, 70), ty = w.y + U.rand(-40, 40);
      const t = tileOf(tx, ty);
      if (walkable(t.c, t.r) && ty > GY + 4) { w.tx = tx; w.ty = ty; w.st = 'walk'; return; }
    }
    w.t = U.rand(0.5, 2);
  }
  function startEat(w, k) {
    w.st = 'eat'; w.t = 2.4; w.eatK = k; w.chew = 0; w.food = null;
    sfx('eat', 0.1);
  }
  function finishEat(w) {
    const k = w.eatK;
    w.hunger = Math.max(0, w.hunger - CROPS[k].food);
    w.love = Math.min(1, w.love + 0.12 + CROPS[k].food * 0.1);
    w.pooIn = U.rand(10, 20);
    S.stats.fed++;
    heartUp(w.x, w.y - w.z * LH - 20); heartUp(w.x + 4, w.y - w.z * LH - 18);
    sfx('pet', 0.1);
    w.st = 'happy'; w.t = 1.1;
  }
  function pet(w) {
    if (w.st === 'sleep') { toast(`${w.name} is fast asleep`); zzz(w.x + 6, w.y - w.z * LH - 18); return; }
    w.love = Math.min(1, w.love + 0.14);
    S.stats.pets++;
    heartUp(w.x, w.y - w.z * LH - 20);
    if (w.st !== 'eat' && w.st !== 'dig') { w.st = 'happy'; w.t = 1.2; }
    sfx('pet', 0.08);
  }
  function pooFrom(w) {
    S.drops.push({ k: 'poo', x: w.x - w.dir * 9, y: w.y, z: 3, vz: 30, vx: -w.dir * 12, vy: 0, t: 0 });
    puff(w.x - w.dir * 9, w.y - w.z * LH - 2, [P.leaf2, P.cream], 2, { up: 20 });
    sfx('plop', 0.2);
  }
  function finishDig(w) {
    const n = 1 + Math.round(w.love * 3);
    for (let k = 0; k < n; k++) S.drops.push({ k: 'coin', x: w.x + w.dir * 8, y: w.y + 1, z: 4, vz: U.rand(70, 110), vx: U.rand(-30, 30), vy: U.rand(-10, 12), t: 0 });
    puff(w.x + w.dir * 8, w.y - w.z * LH, [P.soil0, P.soil1, P.soil2], 8, { up: 50 });
    sfx('dig', 0.1); setTimeout(() => sfx('pop', 0.1), 90);
    w.digIn = U.rand(30, 50) * (1.3 - w.love * 0.5);
    w.st = 'happy'; w.t = 0.9;
  }
  function updWombat(w, dt) {
    w.anim += dt;
    if (w === held) return;
    const here = tileOf(w.x, w.y);
    if (!walkable(here.c, here.r)) { puff(w.x, w.y - w.z * LH, [P.water1, P.foam, P.soil1], 6, { up: 50 }); relocate(w); w.st = 'happy'; w.t = 0.6; }
    w.z = U.lerp(w.z, groundAt(w.x, w.y), Math.min(1, dt * 12));
    w.hunger = Math.min(1, w.hunger + dt / 220);
    w.love = Math.max(0, w.love - dt / 700);
    if (w.pooIn > 0) { w.pooIn -= dt; if (w.pooIn <= 0) { pooFrom(w); w.pooIn = -1; } }
    const sleepy = asleep(w);
    if (sleepy && w.st !== 'sleep' && w.st !== 'eat' && w.st !== 'dig') { w.st = 'sleep'; w.food = null; w.zt = U.rand(0, 1); }
    if (!sleepy && w.st === 'sleep') { w.st = 'happy'; w.t = 0.8; }
    const sy = w.y - w.z * LH;
    switch (w.st) {
      case 'sleep': w.zt -= dt; if (w.zt <= 0) { zzz(w.x + w.dir * 7, sy - 14); w.zt = 1.5; } return;
      case 'eat':
        w.t -= dt; w.chew -= dt;
        if (w.chew <= 0) { w.chew = 0.5; puff(w.x + w.dir * 11, sy - 4, [P.leaf2, '#ffb060'], 1, { up: 20 }); }
        if (w.t <= 0) finishEat(w);
        return;
      case 'dig':
        w.t -= dt; w.dust -= dt;
        if (w.dust <= 0) { w.dust = 0.14; puff(w.x + w.dir * 9, sy, [P.soil0, P.soil1], 2, { up: 34 }); sfx('till', 0.25); }
        if (w.t <= 0) finishDig(w);
        return;
      case 'happy': w.t -= dt; if (w.t <= 0) { w.st = 'idle'; w.t = U.rand(1, 3); } return;
    }
    const happy = w.hunger < 0.7 && w.love > 0.2;
    if (happy && mode === 'play') {
      w.digIn -= dt;
      if (w.digIn <= 0) { w.st = 'dig'; w.t = 2.2; w.dust = 0; return; }
    }
    if (w.food && !S.drops.includes(w.food)) w.food = null;
    w.look -= dt;
    if (!w.food && w.hunger > 0.2 && w.look <= 0) {
      w.look = 0.6;
      let best = null, bd = 170;
      for (const d of S.drops) {
        if (d.k !== 'food' || d.z > 1 || S.wombats.some((o) => o !== w && o.food === d)) continue;
        const dd = U.dist(w.x, w.y, d.x, d.y);
        if (dd < bd) { bd = dd; best = d; }
      }
      if (best) { w.food = best; w.st = 'walk'; }
    }
    if (w.food) { w.tx = w.food.x - (w.food.x > w.x ? 9 : -9); w.ty = w.food.y; if (w.st !== 'walk') w.st = 'walk'; }
    if (w.st === 'idle') { w.t -= dt; if (w.t <= 0) wander(w); }
    else if (w.st === 'walk') {
      const dx = w.tx - w.x, dy = w.ty - w.y, d = Math.hypot(dx, dy);
      if (d < 2) {
        if (w.food) { const f = w.food; S.drops.splice(S.drops.indexOf(f), 1); w.dir = f.x > w.x ? 1 : -1; startEat(w, f.kind); }
        else { w.st = 'idle'; w.t = U.rand(1.5, 4.5); }
        return;
      }
      const sp = (w.food ? 26 : 15) * dt;
      const nx = w.x + dx / d * sp, ny = w.y + dy / d * sp, nt = tileOf(nx, ny);
      if (!walkable(nt.c, nt.r)) { w.food = null; w.st = 'idle'; w.t = U.rand(0.3, 1); return; }
      w.x = nx; w.y = ny;
      if (Math.abs(dx) > 0.6) w.dir = dx > 0 ? 1 : -1;
    }
  }

  // ---- things on the ground ------------------------------------------------------------------
  function collect(d) {
    d.gone = true;
    const sx = d.x, sy = d.y - groundAt(d.x, d.y) * LH - d.z;
    if (d.k === 'coin') { S.coins += 1; fly(Look.coin(), sx - 3, sy - 6, hud.coin, () => { hud.bump.coin = 1; }); sfx('coin', 0.05); }
    else { S.poo += 1; fly(Look.poo(), sx - 3, sy - 5, hud.poo, () => { hud.bump.poo = 1; }); sfx('pop', 0.06); }
  }
  function updDrops(dt) {
    const reach = mode === 'play' && !shopOpen && mouse.seen;
    for (const d of S.drops) {
      d.t = (d.t || 0) + dt;
      if (d.z > 0 || d.vz) {
        d.vz -= 320 * dt; d.z += d.vz * dt; d.x += d.vx * dt; d.y += d.vy * dt;
        if (d.z <= 0) { d.z = 0; if (Math.abs(d.vz) > 45) d.vz = -d.vz * 0.35; else { d.vz = 0; d.vx = d.vy = 0; } }
      }
      d.x = U.clamp(d.x, 4, W - 4); d.y = U.clamp(d.y, GY + 3, GY + ROWS * T - 2);
      const t = tileOf(d.x, d.y);
      if (d.z === 0 && d.k !== 'coin' && inb(t.c, t.r) && lv(t.c, t.r) < 0) { d.gone = true; puff(d.x, d.y + LH, [P.water2, P.foam], 4); sfx('splash', 0.2); continue; }
      if (!reach || d.k === 'food' || d.t < 0.45) continue;
      const sy = d.y - groundAt(d.x, d.y) * LH - d.z - 3, dd = U.dist(mouse.x, mouse.y, d.x, sy);
      if (dd < 12) collect(d);
      else if (d.k === 'coin' && dd < 34) { d.x += (mouse.x - d.x) * dt * 5; d.y += (mouse.y - sy) * dt * 5; }
    }
    S.drops = S.drops.filter((d) => !d.gone);
  }

  // ---- the stand ----------------------------------------------------------------------------
  const adoptPrice = () => Math.round(60 * Math.pow(1.6, Math.max(0, S.wombats.length - 2)) / 5) * 5;
  function sell(k) {
    const n = S.basket[k];
    if (!n) return sfx('nope');
    const v = n * CROPS[k].sell;
    S.basket[k] = 0; S.coins += v; S.stats.sold += n;
    floatText(mouse.x, mouse.y - 8, '+' + v, P.sunD);
    for (let i = 0; i < 6; i++) spark(mouse.x, mouse.y - 4);
    sfx('sell');
  }
  function sellAll() {
    let v = 0, n = 0;
    for (const k of KINDS) { v += S.basket[k] * CROPS[k].sell; n += S.basket[k]; S.basket[k] = 0; }
    if (!n) return sfx('nope');
    S.coins += v; S.stats.sold += n;
    floatText(mouse.x, mouse.y - 8, '+' + v, P.sunD);
    for (let i = 0; i < 10; i++) spark(mouse.x, mouse.y - 4);
    sfx('sell');
  }
  function buy(k, n) {
    const cost = CROPS[k].seed * n;
    if (S.coins < cost) { sfx('nope'); return toast('Not enough coins yet'); }
    S.coins -= cost; S.seeds[k] += n;
    floatText(mouse.x, mouse.y - 8, '-' + cost, P.coralD);
    sfx('buy');
  }
  function adopt() {
    if (S.wombats.length >= MAX_WOMBATS) return toast('The farm is full of wombats!');
    const price = adoptPrice();
    if (S.coins < price) { sfx('nope'); return toast('Not enough coins yet'); }
    S.coins -= price;
    const pelt = U.pick(Object.keys(PELTS));
    const w = rt(makeWombat(24 * T + 8, GY + 4 * T + 6, pelt));
    relocate(w);
    S.wombats.push(w);
    for (let k = 0; k < 4; k++) heartUp(w.x, w.y - 20);
    puff(w.x, w.y - 6, [P.pink, P.cream, P.sun], 10, { up: 60 });
    sfx('hello');
    shopOpen = false;
    toast(`Welcome to the farm, ${w.name}!`);
  }

  // ---- sleeping through the night --------------------------------------------------------------
  function houseClick() {
    if (S.clock < DAY - 40) { toast('Come back at dusk to sleep'); return sfx('click'); }
    const skip = CYCLE - S.clock;
    fade = { t: 0, dur: 1.6, mid: () => {
      grow(skip);
      S.day++; S.clock = 0;
      for (const w of S.wombats) { w.hunger = Math.min(1, w.hunger + 0.2); if (w.st === 'sleep') { w.st = 'idle'; w.t = U.rand(0.5, 2); } }
      toast(`Day ${S.day} - good morning!`);
    } };
    sfx('hello');
  }

  // ---- input -----------------------------------------------------------------------------------
  function toCanvas(e) {
    const r = canvas.getBoundingClientRect();
    mouse.x = (e.clientX - r.left) * W / r.width;
    mouse.y = (e.clientY - r.top) * H / r.height;
    mouse.shift = e.shiftKey;
    mouse.touch = e.pointerType === 'touch';
    mouse.seen = true;
  }
  function setTool(id) {
    if (tool === id) {
      if (id === 'shovel') { digDir = -digDir; sfx('tab'); toast(digDir > 0 ? 'Shovel raises the land' : 'Shovel lowers the land'); }
      else if (id === 'seeds' || id === 'food') cycleKind(1);
      return;
    }
    tool = id; toolTip = 2.6; sfx('tab');
  }
  function cycleKind(d) {
    if (tool === 'seeds') seedKind = KINDS[(KINDS.indexOf(seedKind) + d + 3) % 3];
    else if (tool === 'food') foodKind = KINDS[(KINDS.indexOf(foodKind) + d + 3) % 3];
    sfx('click');
  }
  function press(e) {
    for (let k = btns.length - 1; k >= 0; k--) {
      const b = btns[k];
      if (!inside(b)) continue;
      if (b.fn && !b.dis) { b.fn(e); if (!b.silent) sfx('click'); }
      else if (b.dis) sfx('nope');
      return;
    }
    if (mode !== 'play' || fade) return;
    if (shopOpen) { shopOpen = false; sfx('click'); return; }
    if (inside(STAND)) { shopOpen = true; sfx('tab'); return; }
    if (inside(HOUSE)) return houseClick();
    const alt = e.button === 2 || e.shiftKey;
    if (tool === 'hand') {
      const w = wombatAt(mouse.x, mouse.y);
      if (w) { grab = w; return; }
      const t = pick(mouse.x, mouse.y);
      if (t) harvest(t.c, t.r, true);
      dragPick = true;
      return;
    }
    if (tool === 'food') return feed();
    const t = pick(mouse.x, mouse.y);
    if (!t) return;
    drag = { c: t.c, r: t.r, x: mouse.x, y: mouse.y, key: t.c + ',' + t.r, alt };
    if (tool !== 'shovel') useTool(t.c, t.r, alt, true);
  }
  function move() {
    if (grab && !held && U.dist(mouse.x, mouse.y, mouse.sx, mouse.sy) > 4 && grab.st !== 'sleep') {
      held = grab; held.st = 'held'; held.food = null; sfx('pop');
    }
    if (!mouse.down || mode !== 'play' || shopOpen) return;
    if (tool === 'hand' && dragPick) { const t = pick(mouse.x, mouse.y); if (t) harvest(t.c, t.r, false); }
    if (drag && tool !== 'shovel') {
      const t = pick(mouse.x, mouse.y);
      if (t && t.c + ',' + t.r !== drag.key) { drag.key = t.c + ',' + t.r; useTool(t.c, t.r, drag.alt, false); }
    }
  }
  function release() {
    if (held) {
      const w = held, gp = groundPoint(mouse.x, mouse.y + 9);
      held = null;
      if (gp) { w.x = gp.x; w.y = gp.y; }
      if (!gp || !walkable(gp.c, gp.r)) relocate(w);
      w.z = groundAt(w.x, w.y); w.st = 'happy'; w.t = 0.7;
      puff(w.x, w.y - w.z * LH, [P.grass2, P.cream], 5, { up: 30 });
      sfx('plop');
    } else if (grab) pet(grab);
    grab = null; drag = null; dragPick = false;
  }
  function feed() {
    let k = S.basket[foodKind] > 0 ? foodKind : KINDS.find((q) => S.basket[q] > 0);
    if (!k) { toast('Your basket is empty - pick some veg first'); return sfx('nope'); }
    const w = wombatAt(mouse.x, mouse.y);
    if (w && w.st === 'sleep') return toast(`${w.name} is asleep - try in the morning`);
    if (w && w.st !== 'eat') {
      S.basket[k]--; w.dir = mouse.x > w.x ? 1 : -1; startEat(w, k); return;
    }
    const gp = groundPoint(mouse.x, mouse.y);
    if (!gp || !walkable(gp.c, gp.r)) return toast('Drop it on dry grass');
    S.basket[k]--;
    S.drops.push({ k: 'food', kind: k, x: gp.x, y: gp.y, z: 6, vz: 50, vx: 0, vy: 0, t: 0 });
    sfx('plop');
  }
  canvas.addEventListener('pointerdown', (e) => {
    Sound.wake(); toCanvas(e);
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { }
    mouse.down = true; mouse.btn = e.button; mouse.sx = mouse.x; mouse.sy = mouse.y;
    press(e); e.preventDefault();
  });
  canvas.addEventListener('pointermove', (e) => { toCanvas(e); move(); });
  const up = (e) => { if (!mouse.down) return; toCanvas(e); release(); mouse.down = false; };
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('pointerleave', () => { if (!mouse.down) mouse.seen = false; });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    if (mode !== 'play') return;
    if (SIZED[tool]) { size = U.clamp(size + (e.deltaY < 0 ? 1 : -1), 1, 3); sfx('click'); }
    else if (tool === 'seeds' || tool === 'food') cycleKind(e.deltaY < 0 ? -1 : 1);
  }, { passive: false });
  addEventListener('keydown', (e) => {
    Sound.wake();
    if (e.key === 'Shift') mouse.shift = true;
    if (mode !== 'play') { if (e.key === 'Enter' && saved) startGame(); return; }
    const n = parseInt(e.key, 10);
    if (n >= 1 && n <= TOOLS.length) setTool(TOOLS[n - 1].id);
    else if (e.key === '[' || e.key === '-') { size = Math.max(1, size - 1); sfx('click'); }
    else if (e.key === ']' || e.key === '=' || e.key === '+') { size = Math.min(3, size + 1); sfx('click'); }
    else if (e.key === 'q' || e.key === 'Q') cycleKind(-1);
    else if (e.key === 'e' || e.key === 'E') cycleKind(1);
    else if (e.key === 'm' || e.key === 'M') toggleSound();
    else if (e.key === 'Escape') shopOpen = false;
  });
  addEventListener('keyup', (e) => { if (e.key === 'Shift') mouse.shift = false; });
  function toggleSound() { Sound.setMuted(!Sound.muted); const st = Store.settings(); st.muted = Sound.muted; Store.putSettings(st); }

  // ---- update -------------------------------------------------------------------------------------
  function update(dt) {
    const play = mode === 'play' && !fade;
    if (play) {
      S.clock += dt;
      if (S.clock >= CYCLE) { S.clock -= CYCLE; S.day++; toast(`Day ${S.day} - good morning!`); }
      S.rainNext -= dt;
      if (S.rainNext <= 0 && S.rain <= 0) { S.rain = U.rand(28, 42); S.rainNext = U.rand(220, 380); toast('Rain! The crops are drinking it up'); }
      if (S.rain > 0) { S.rain -= dt; for (let i = 0; i < N; i++) if (S.soil[i]) { if (S.crop[i] && S.wet[i] < 5) S.stats.watered++; S.wet[i] = WET; } }
      grow(dt);
      shovelTick(dt);
      saveT -= dt;
      if (saveT <= 0) { saveT = 4; Store.put(KEY, serialize()); }
      const gi = guideStep();
      if (lastGuide >= 0 && gi !== lastGuide) { noteFlash = 1; sfx('hello', 0.5); }
      lastGuide = gi;
    }
    rainA = U.lerp(rainA, S.rain > 0 ? 1 : 0, Math.min(1, dt * 1.5));
    for (const w of S.wombats) updWombat(w, dt);
    updDrops(dt);
    for (const p of parts) { p.life += dt; p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
    parts = parts.filter((p) => p.life < p.max);
    for (const f of flyers) { f.t += dt / 0.55; if (f.t >= 1 && !f.fin) { f.fin = true; if (f.done) f.done(); } }
    flyers = flyers.filter((f) => !f.fin);
    for (const t of toasts) t.t += dt;
    toasts = toasts.filter((t) => t.t < 3);
    for (const k in hud.bump) hud.bump[k] = Math.max(0, hud.bump[k] - dt * 4);
    shownCoins += (S.coins - shownCoins) * Math.min(1, dt * 10);
    if (Math.abs(S.coins - shownCoins) < 0.5) shownCoins = S.coins;
    toolTip = Math.max(0, toolTip - dt);
    noteFlash = Math.max(0, noteFlash - dt * 1.2);
    confirmNew = Math.max(0, confirmNew - dt);
    if (fade) {
      const was = fade.t < 0.5;
      fade.t += dt / fade.dur;
      if (was && fade.t >= 0.5 && fade.mid) fade.mid();
      if (fade.t >= 1) fade = null;
    }
    for (const b of flutter) { b.a += dt; b.x += Math.cos(b.a * 0.7) * 14 * dt + 6 * dt; b.y += Math.sin(b.a * 1.3) * 10 * dt; if (b.x > W + 10) b.x = -10; b.y = U.clamp(b.y, 30, 230); }
    for (const f of flies) { f.a += dt; f.x += Math.cos(f.a * 0.9) * 8 * dt; f.y += Math.sin(f.a * 1.1) * 6 * dt; }
    if (rainA > 0.05) for (const d of rainDrops) { d.y += 230 * dt; d.x -= 50 * dt; if (d.y > H) { if (Math.random() < 0.3) puff(d.x, H - U.rand(20, 240), P.water2, 1, { up: 10, g: 0, life: 0.4 }); d.y -= H + 20; d.x = U.rand(0, W + 60); } }
    smokeT -= dt;
    if (smokeT <= 0) { smokeT = 0.5; parts.push({ kind: 'smoke', x: HOUSE.x + 64, y: HOUSE.y + 6, vx: U.rand(2, 6), vy: -10, g: 0, life: 0, max: 3 }); }
    hoverW = mode === 'play' && !shopOpen && !held && mouse.seen ? wombatAt(mouse.x, mouse.y) : null;
  }
  let smokeT = 0;
  const guideStep = () => { for (let i = 0; i < GUIDE.length; i++) if (!S.stats[GUIDE[i][0]]) return i; return GUIDE.length; };

  // ---- light and weather ---------------------------------------------------------------------------
  function darkness() {
    const c = S.clock;
    if (c < DAY - 40) return 0;
    if (c < DAY) return (c - (DAY - 40)) / 40 * 0.45;
    if (c < DAY + 20) return 0.45 + (c - DAY) / 20 * 0.55;
    if (c < CYCLE - 30) return 1;
    return (CYCLE - c) / 30;
  }
  function dusk() { const c = S.clock; return c > DAY - 90 && c < DAY + 20 ? Math.sin((c - (DAY - 90)) / 110 * Math.PI) : 0; }
  function clockText() {
    const c = S.clock;
    let hr = c < DAY ? 6 + c / DAY * 14 : 20 + (c - DAY) / NIGHT * 10;
    hr %= 24;
    let h = Math.floor(hr), m = Math.floor((hr - h) * 6) * 10;
    const pm = h >= 12;
    h = h % 12 || 12;
    return `${h}:${m ? m : '00'}${pm ? 'pm' : 'am'}`;
  }

  // ---- drawing: the land ------------------------------------------------------------------------------
  const R = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), w, h); };
  const blit = (img, x, y) => g.drawImage(img, Math.round(x) - (img.pad || 0), Math.round(y) - (img.pad || 0));
  function grassVar(hv) { return hv < 0.07 ? 5 + Math.floor(hv / 0.07 * 3) : Math.floor(hv * 1000) % 5; }
  function drawHedge() {
    R(0, 0, W, GY + 4, '#3f8a34');
    for (let x = -4, k = 0; x < W + 14; x += 13, k++) {
      const y = 11 + (k % 2);
      Look.blob(g, x, y, 9, 8, P.leaf0);
      Look.blob(g, x - 1, y - 2, 7, 5, P.leaf1);
      Look.blob(g, x - 3, y - 4, 3, 2, P.leaf2);
      if (Look.hash(k, 3) < 0.35) R(x + 2, y + 1, 2, 2, Look.hash(k, 9) < 0.5 ? P.pink : P.cream);
    }
  }
  function drawWater(c, r, x, y) {
    const hv = Look.hash(c, r);
    R(x, y, T, T, P.water1);
    const landB = lv(c, r - 1) >= 0 || r === 0, landL = c > 0 && lv(c - 1, r) >= 0, landR = c < COLS - 1 && lv(c + 1, r) >= 0, landF = r + 1 < ROWS && lv(c, r + 1) >= 0;
    if (!landB && !landL && !landR) R(x, y, T, T, U.mix(P.water1, P.water0, 0.45));
    for (let k = 0; k < 2; k++) {                               // slow ripples
      const yy = y + 3 + k * 6 + (((hv * 10) | 0) % 3);
      const xx = x + ((time * 5 + hv * 40 + k * 9) % 22) - 5;
      const a = Math.max(x, xx), b = Math.min(x + T, xx + 5);
      if (b > a) R(a, yy, b - a, 1, P.water2);
    }
    if (landB) { R(x, y, T, 1, P.foam); R(x, y + 1, T, 1, P.water2); }
    if (landL) R(x, y, 1, T, P.foam);
    if (landR) R(x + T - 1, y, 1, T, P.foam);
    if (landF) R(x, y + T - 1, T, 1, P.water0);
    if (hv > 0.86) {                                           // a lily pad
      Look.blob(g, x + 8, y + 7, 4, 2, P.leaf0); Look.blob(g, x + 8, y + 6, 3, 2, P.leaf1);
      R(x + 9, y + 5, 2, 1, P.water1);
      if (hv > 0.94) { R(x + 6, y + 5, 2, 2, P.pink); R(x + 6, y + 5, 1, 1, P.cream); }
    }
  }
  function drawCliff(x, y, h, L, c, r, edge) {
    const hv = Look.hash(c, r + 50);
    R(x, y, T, h, P.cliff1);
    for (let k = LH; k < h; k += LH) R(x, y + k - 1, T, 1, P.cliff0);
    for (let k = 0; k < 3; k++) { const px = x + ((hv * 97 + k * 5) % 14) | 0, py = y + 2 + ((hv * 53 + k * 7) % Math.max(1, h - 3)) | 0; R(px, py, 2, 1, P.cliff2); }
    R(x, y, T, 1, P.grassD);
    if (hv > 0.3) R(x + ((hv * 31) % 13 | 0) + 1, y + 1, 1, 2, P.grassD);
    if (hv > 0.6) R(x + ((hv * 71) % 13 | 0) + 1, y + 1, 1, 1, P.grassD);
    if (!edge) R(x, y + h - 1, T, 1, P.line);
    if (lv(c - 1, r) < L || c === 0) R(x, y, 1, h, U.mix(P.cliff0, P.line, 0.4));
    if (lv(c + 1, r) < L || c === COLS - 1) R(x + T - 1, y, 1, h, U.mix(P.cliff0, P.line, 0.4));
  }
  function drawTile(c, r) {
    const i = idx(c, r), L = lvI(i), x = c * T, y = GY + r * T - L * LH, hv = Look.hash(c, r);
    const back = r > 0 ? lv(c, r - 1) : L, left = lv(c - 1, r), right = lv(c + 1, r);
    if (L < 0) drawWater(c, r, x, y);
    else if (S.soil[i]) {
      const wet = S.wet[i] > 0;
      blit(Look.soilTile(wet, (hv * 4) | 0), x, y);
      const edge = wet ? P.soilW0 : P.soil0;
      const soilAt = (cc, rr) => inb(cc, rr) && S.soil[idx(cc, rr)] && lv(cc, rr) === L;
      if (!soilAt(c, r - 1)) R(x, y, T, 1, edge);
      if (!soilAt(c - 1, r)) R(x, y, 1, T, edge);
      if (!soilAt(c + 1, r)) R(x + T - 1, y, 1, T, edge);
      if (!soilAt(c, r + 1)) R(x, y + T - 1, T, 1, wet ? P.soilW2 : P.soil2);
      if (S.fert[i]) { const tw = ((time * 2 + hv * 5) | 0) % 3; R(x + 3, y + 5, 1, 1, tw === 0 ? P.cream : P.mint); R(x + 11, y + 9, 1, 1, tw === 1 ? P.cream : P.mint); R(x + 7, y + 12, 1, 1, tw === 2 ? P.cream : P.mint); }
    } else blit(Look.grassTile(grassVar(hv)), x, y);
    if (L > 0) { g.fillStyle = `rgba(255,248,200,${0.07 * L})`; g.fillRect(x, y, T, T); }
    if (L >= 0) {
      if (back < L) { R(x, y - 1, T, 1, P.line); R(x, y, T, 1, S.soil[i] ? P.soil2 : P.grass3); }
      if (left < L) R(x, y, 1, T, P.line);
      if (right < L) R(x + T - 1, y, 1, T, P.line);
    }
    if (back > L) { g.fillStyle = 'rgba(59,42,34,0.22)'; g.fillRect(x, y, T, 3); g.fillStyle = 'rgba(59,42,34,0.1)'; g.fillRect(x, y + 3, T, 2); }
    const last = r === ROWS - 1;
    const front = last ? -9 : lv(c, r + 1);
    const ch = last ? H - (y + T) : Math.max(0, L - front) * LH;
    if (ch > 0) drawCliff(x, y + T, ch, L, c, r, last);
  }
  function drawCrop(c, r) {
    const i = idx(c, r), cr = S.crop[i];
    if (!cr) return;
    const st = stageOf(cr), y = topY(c, r), hv = Look.hash(c, r);
    const bob = st === 3 && Math.sin(time * 3 + hv * 9) > 0.7 ? -1 : 0;
    blit(Look.crop(cr.k, st), c * T, y - 4 + bob);
    if (st === 3 && Math.sin(time * 2.3 + hv * 20) > 0.97) spark(c * T + 8, y - 2);
  }
  function drawFeat(f) {
    if (f.kind === 'house') {
      g.fillStyle = 'rgba(59,42,34,0.18)'; g.fillRect(HOUSE.x + 6, HOUSE.y + HOUSE.h - 3, HOUSE.w - 10, 4);
      blit(Look.house(), HOUSE.x, HOUSE.y);
    } else if (f.kind === 'stand') {
      g.fillStyle = 'rgba(59,42,34,0.18)'; g.fillRect(STAND.x + 2, STAND.y + STAND.h - 3, STAND.w - 2, 4);
      blit(Look.stand(), STAND.x, STAND.y);
      const veg = KINDS.some((k) => S.basket[k] > 0);
      if (veg && mode === 'play' && !shopOpen) {           // a little coin nudges you to sell
        const b = Math.round(Math.sin(time * 4) * 2);
        const bx = STAND.x + 20, by = STAND.y - 21 + b;
        Look.card(g, bx, by, 20, 18, P.cream, P.line, false);
        R(bx + 7, by + 17, 6, 2, P.line); R(bx + 8, by + 16, 4, 2, P.cream); R(bx + 9, by + 18, 2, 2, P.cream); R(bx + 9, by + 20, 2, 1, P.line); R(bx + 8, by + 19, 1, 1, P.line); R(bx + 11, by + 19, 1, 1, P.line);
        blit(Look.icon('coin'), bx + 2, by + 1);
      }
    } else if (f.kind === 'tree') {
      const x = f.c * T + 8, y = GY + (f.r + 1) * T - 2;
      Look.blob(g, x, y, 11, 3, 'rgba(59,42,34,0.18)');
      blit(Look.tree(f.v), x - 20, y - 50);
    } else if (f.kind === 'bush') {
      const x = f.c * T + 8, y = GY + (f.r + 1) * T - 2;
      Look.blob(g, x, y, 9, 2, 'rgba(59,42,34,0.18)');
      blit(Look.bush(f.v), x - 11, y - 14);
    }
  }
  function wombatSprite(w) {
    let pose = 'idle', f = Math.floor(w.anim * 1.6) % 2;
    if (w.st === 'walk') { pose = 'walk'; f = Math.floor(w.anim * 8) % 4; }
    else if (w.st === 'eat' || w.st === 'dig') { pose = 'eat'; f = Math.floor(w.anim * (w.st === 'dig' ? 8 : 4)) % 2; }
    else if (w.st === 'sleep') { pose = 'sleep'; f = 0; }
    else if (w.st === 'happy' || w.st === 'held') { pose = 'happy'; f = Math.floor(w.anim * (w.st === 'held' ? 3 : 6)) % 2; }
    const img = Look.wombat(w.pelt, pose, f);
    return w.dir < 0 ? Look.flip(img) : img;
  }
  function drawWombat(w) {
    const sy = w.y - w.z * LH;
    Look.blob(g, w.x, sy, 9, 2, 'rgba(59,42,34,0.2)');
    blit(wombatSprite(w), Math.round(w.x - 13), Math.round(sy - 17));
    if (w === hoverW) {                                         // a small bouncing marker
      const b = Math.round(Math.sin(time * 6));
      R(w.x - 2, sy - 24 + b, 5, 1, P.cream); R(w.x - 1, sy - 23 + b, 3, 1, P.cream); R(w.x, sy - 22 + b, 1, 1, P.cream);
    }
    if (w.hunger > 0.72 && w.st !== 'sleep' && w.st !== 'eat' && Math.sin(time * 1.4 + w.id) > -0.2) {
      const bx = Math.round(w.x + w.dir * 6 - 7), by = Math.round(sy - 34);
      Look.card(g, bx, by, 15, 13, P.cream, P.line, false);
      R(bx + (w.dir > 0 ? 2 : 10), by + 13, 2, 2, P.cream); R(bx + (w.dir > 0 ? 1 : 12), by + 15, 1, 1, P.cream);
      blit(Look.produce(S.basket.pumpkin ? 'pumpkin' : S.basket.cabbage ? 'cabbage' : 'carrot'), bx + 2, by + 1);
    }
  }
  function drawDrop(d) {
    const gl = groundAt(d.x, d.y), sy = d.y - gl * LH;
    if (d.k === 'coin') {
      const spin = Math.floor((d.t * 6 + d.x) % 4);
      Look.blob(g, d.x, sy, 3, 1, 'rgba(59,42,34,0.22)');
      const bob = d.z === 0 ? Math.round(Math.sin(time * 3 + d.x) * 1) - 1 : 0;
      const img = Look.coin();
      if (spin === 1 || spin === 3) g.drawImage(img, 2, 0, 5, 9, Math.round(d.x - 2), Math.round(sy - d.z - 9 + bob), 5, 9);
      else blit(img, Math.round(d.x - 4), Math.round(sy - d.z - 8 + bob));
    } else if (d.k === 'poo') {
      Look.blob(g, d.x, sy, 4, 1, 'rgba(59,42,34,0.2)');
      blit(Look.poo(), Math.round(d.x - 4), Math.round(sy - d.z - 7));
    } else {
      Look.blob(g, d.x, sy, 5, 1, 'rgba(59,42,34,0.2)');
      blit(Look.produce(d.kind), Math.round(d.x - 6), Math.round(sy - d.z - 11));
    }
  }
  function drawWorld() {
    drawHedge();
    const rows = Array.from({ length: ROWS }, () => []);
    const put = (r, y, fn) => rows[U.clamp(r, 0, ROWS - 1)].push({ y, fn });
    for (const f of feats) put(f.r + f.h - 1, GY + (f.r + f.h) * T - 1, () => drawFeat(f));
    for (const w of S.wombats) if (w !== held) put(tileOf(w.x, w.y).r, w.y, () => drawWombat(w));
    for (const d of S.drops) put(tileOf(d.x, d.y).r, d.y - 0.5, () => drawDrop(d));
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) drawTile(c, r);
      if (r === 0) { g.fillStyle = 'rgba(40,70,30,0.22)'; g.fillRect(0, GY, W, 2); }
      for (let c = 0; c < COLS; c++) drawCrop(c, r);
      rows[r].sort((a, b) => a.y - b.y);
      for (const o of rows[r]) o.fn();
    }
  }
  function drawBrush() {
    if (mode !== 'play' || shopOpen || held || mouse.touch || !mouse.seen || fade) return;
    if (lastBtns.some((b) => inside(b)) || inside(STAND) || inside(HOUSE)) return;
    let t;
    if (tool === 'shovel' && drag && mouse.down) t = { c: drag.c + Math.round((mouse.x - drag.x) / T), r: drag.r + Math.round((mouse.y - drag.y) / T) };
    else t = pick(mouse.x, mouse.y);
    if (!t || tool === 'food' || (tool === 'hand' && (hoverW || !S.crop[idx(t.c, t.r)]))) return;
    const tiles = SIZED[tool] ? brushTiles(t.c, t.r) : [[t.c, t.r]];
    const set = new Set(tiles.map(([x, y]) => x + ',' + y));
    const lowering = (mouse.down ? mouse.btn === 2 : false) || mouse.shift;
    const col = tool === 'shovel' ? ((lowering ? -digDir : digDir) > 0 ? P.mint : P.coral) : P.cream;
    const pulse = 0.55 + Math.sin(time * 6) * 0.2;
    g.globalAlpha = pulse;
    for (const [x, y] of tiles) {
      const ty = topY(x, y), px = x * T;
      g.fillStyle = 'rgba(255,255,255,0.16)'; g.fillRect(px, ty, T, T);
      g.fillStyle = col;
      if (!set.has(x + ',' + (y - 1))) g.fillRect(px, ty, T, 1);
      if (!set.has(x + ',' + (y + 1))) g.fillRect(px, ty + T - 1, T, 1);
      if (!set.has((x - 1) + ',' + y)) g.fillRect(px, ty, 1, T);
      if (!set.has((x + 1) + ',' + y)) g.fillRect(px + T - 1, ty, 1, T);
    }
    g.globalAlpha = 1;
  }
  function drawParts() {
    for (const p of parts) {
      const k = p.life / p.max;
      if (p.kind === 'px') R(p.x, p.y, p.s, p.s, p.col);
      else if (p.kind === 'heart') { if (k < 0.8 || ((p.life * 20) | 0) % 2) blit(Look.heart(), Math.round(p.x - 3), Math.round(p.y - 3)); }
      else if (p.kind === 'text') Font.draw(g, p.str, p.x, p.y, { align: 'center', color: p.col, shadow: P.cream, shadowDist: 1 });
      else if (p.kind === 'z') Font.draw(g, 'z', p.x, p.y, { color: k < 0.5 ? P.cream : '#dfe8ff', shadow: P.inkL, shadowDist: 1 });
      else if (p.kind === 'spark') { const c = ((p.life * 12) | 0) % 2 ? P.cream : p.col; R(p.x, p.y - 1, 1, 3, c); R(p.x - 1, p.y, 3, 1, c); }
      else if (p.kind === 'smoke') { const s = 2 + Math.floor(k * 4); g.fillStyle = `rgba(255,248,236,${0.55 * (1 - k)})`; g.fillRect(Math.round(p.x + Math.sin(p.life * 2) * 2), Math.round(p.y), s, s); }
    }
  }
  function drawAmbient() {
    const d = darkness();
    if (d < 0.5 && rainA < 0.5) for (const b of flutter) {
      const flap = Math.floor(b.a * 10) % 2, x = Math.round(b.x), y = Math.round(b.y);
      R(x - 2, y - (flap ? 1 : 0), 2, flap ? 1 : 2, b.col); R(x + 1, y - (flap ? 1 : 0), 2, flap ? 1 : 2, b.col); R(x, y, 1, 2, P.line);
    }
  }
  function drawLight() {
    const d = darkness(), warm = dusk();
    g.globalCompositeOperation = 'multiply';
    if (warm > 0) { g.fillStyle = U.rgba('#ffb98a', warm * 0.35); g.fillRect(0, 0, W, H); }
    if (d > 0) { g.fillStyle = U.rgba('#6f7cc4', d * 0.55); g.fillRect(0, 0, W, H); }
    if (rainA > 0.01) { g.fillStyle = U.rgba('#9fb2c8', rainA * 0.3); g.fillRect(0, 0, W, H); }
    g.globalCompositeOperation = 'source-over';
    if (rainA > 0.05) {
      g.fillStyle = U.rgba('#e6f4ff', 0.55 * rainA);
      for (const r of rainDrops) { g.fillRect(Math.round(r.x), Math.round(r.y), 1, 3); g.fillRect(Math.round(r.x) - 1, Math.round(r.y) + 3, 1, 1); }
    }
    if (d > 0.05) {
      g.globalCompositeOperation = 'lighter';
      const glow = (x, y, rad, col, a) => { for (let k = 3; k >= 1; k--) Look.blob(g, x, y, rad * k / 3, rad * k / 3 * 0.75, U.rgba(col, a * d * 0.11)); };
      glow(HOUSE.x + 22, HOUSE.y + 50, 13, '#ff9a40', 1); glow(HOUSE.x + 64, HOUSE.y + 50, 13, '#ff9a40', 1);
      glow(STAND.x + 30, STAND.y + 30, 10, '#ff9a50', 0.7);
      for (const f of flies) {
        const on = Math.sin(f.a * 2 + f.x) > 0.1;
        if (!on) continue;
        R(f.x, f.y, 1, 1, U.rgba('#fff2a0', d));
        g.fillStyle = U.rgba('#d8ff70', 0.25 * d); g.fillRect(Math.round(f.x) - 1, Math.round(f.y) - 1, 3, 3);
      }
      g.globalCompositeOperation = 'source-over';
    }
  }

  // ---- drawing: the interface ---------------------------------------------------------------------------
  function block(x, y, w, h) { btns.push({ x, y, w, h }); }
  function button(x, y, w, h, label, fn, o = {}) {
    const b = { x, y, w, h, fn, dis: o.dis, silent: o.silent };
    btns.push(b);
    const hov = inside(b) && !mouse.touch, down = hov && mouse.down;
    const fill = o.dis ? P.paper2 : (o.fill || P.paper);
    Look.card(g, x, y + (down ? 1 : 0), w, h, hov && !o.dis ? U.mix(fill, '#ffffff', 0.3) : fill, P.line);
    let tx = x + w / 2;
    if (o.icon) {
      const lw = label ? Font.width(label, o.scale || 1) + 3 : 0, iw = lw + o.icon.width;
      g.drawImage(o.icon, Math.round(x + w / 2 - iw / 2), Math.round(y + h / 2 - o.icon.height / 2 + (down ? 1 : 0)));
      tx += o.icon.width / 2 + 1;
    }
    const s = o.scale || 1;
    Font.draw(g, label, tx, y + Math.round(h / 2 - 3.5 * s) - 1 + (down ? 1 : 0), { align: 'center', scale: s, color: o.dis ? P.inkL : (o.ink || P.ink) });
    return b;
  }
  function bigText(str, x, y, s, col) {
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, 1], [1, 1], [0, 2]]) Font.draw(g, str, x + dx * s, y + dy * s, { scale: s, color: P.line, align: 'center' });
    Font.draw(g, str, x, y, { scale: s, color: col, align: 'center' });
  }
  function drawHud() {
    // the goal, pinned to the top like a paper note
    const gi = guideStep();
    let goal = gi < GUIDE.length ? GUIDE[gi][1] : S.wombats.length < GOAL_WOMBATS ? `Grow the family: ${S.wombats.length}/${GOAL_WOMBATS} wombats` : 'A happy farm! Enjoy the view';
    const gw = Font.width(goal, 1) + 30, gx = Math.round(W / 2 - gw / 2);
    Look.card(g, gx, 3, gw, 17, noteFlash > 0 ? U.mix(P.paper, P.mint, noteFlash) : P.paper);
    block(gx, 3, gw, 17);
    R(gx + 5, 6, 3, 3, P.coral); R(gx + 5, 6, 1, 1, '#ffd0c8');
    Font.draw(g, goal, gx + 13, 8, { color: P.ink });
    if (gi < GUIDE.length) {
      const k = TOOLS.findIndex((t) => t.id === GUIDE[gi][2]);
      if (k >= 0) { Look.card(g, gx + gw - 13, 5, 11, 12, P.sun); Font.draw(g, String(k + 1), gx + gw - 8, 8, { color: P.ink, align: 'center' }); }
    }
    // sound and home, tucked in the corner
    button(W - 22, 3, 18, 18, '', toggleSound, { icon: Look.icon(Sound.muted ? 'mute' : 'note') });
    button(W - 42, 3, 18, 18, '', () => { Store.put(KEY, serialize()); Store.flush(); saved = serialize(); mode = 'title'; shopOpen = false; }, { icon: Look.icon('home') });

    // coins and the clock
    const by = H - 21;
    const cs = String(Math.round(shownCoins));
    const cw = 26 + Font.width(cs, 1) + 6;
    const cb = hud.bump.coin || 0;
    Look.card(g, 4, by - Math.round(cb * 2), cw, 18, P.paper);
    block(4, by, cw, 18);
    blit(Look.icon('coin'), 6, by + 1 - Math.round(cb * 2));
    Font.draw(g, cs, 24, by + 5 - Math.round(cb * 2), { color: P.ink });
    hud.coin.x = 10; hud.coin.y = by + 4;
    const night = S.clock >= DAY;
    const ct = `Day ${S.day}  ${clockText()}`;
    const tw = 24 + Font.width(ct, 1) + 6;
    Look.card(g, 8 + cw, by, tw, 18, night ? '#d8dcf4' : P.paper);
    block(8 + cw, by, tw, 18);
    blit(Look.icon(night ? 'moon' : 'sun'), 10 + cw, by + 1);
    Font.draw(g, ct, 28 + cw, by + 5, { color: P.ink });
    if (night && mode === 'play') {
      const bx = 12 + cw + tw;
      button(bx, by, 18, 18, '', houseClick, { icon: Look.icon('bed'), fill: P.sun, silent: true });
    }

    // the basket and the poo pile
    const items = KINDS.map((k) => ({ k, img: Look.produce(k), n: S.basket[k] })).concat([{ k: 'poo', img: Look.poo(), n: S.poo }]);
    let w = 6;
    for (const it of items) it.w = 14 + Font.width(String(it.n), 1) + 6, w += it.w;
    let x = W - 4 - w;
    Look.card(g, x, by, w, 18, P.paper);
    block(x, by, w, 18);
    x += 5;
    for (const it of items) {
      const b = hud.bump[it.k] || 0;
      const iy = it.k === 'poo' ? by + 6 : by + 4;
      blit(it.img, x, iy - Math.round(b * 3));
      Font.draw(g, String(it.n), x + 13, by + 6, { color: it.n ? P.ink : P.inkL });
      hud[it.k].x = x; hud[it.k].y = iy;
      x += it.w;
    }

    // the toolbar
    const sw = 20, gap = 2, n = TOOLS.length, tbw = n * (sw + gap) - gap;
    const x0 = Math.round(W / 2 - tbw / 2), y0 = H - 23;
    Look.card(g, x0 - 4, y0 - 3, tbw + 8, 28, P.wood1, P.line);
    block(x0 - 4, y0 - 3, tbw + 8, 28);
    let tipFor = null, tipX = 0;
    TOOLS.forEach((t, k) => {
      const on = t.id === tool, sx = x0 + k * (sw + gap), sy = on ? y0 - 4 : y0;
      const b = { x: sx, y: y0 - 4, w: sw, h: sw + 4, fn: () => setTool(t.id), silent: true };
      btns.push(b);
      const hov = inside(b) && !mouse.touch;
      Look.card(g, sx, sy, sw, sw, on ? P.sun : hov ? P.cream : P.paper, P.line);
      blit(Look.icon(t.id), sx + 2, sy + 2);
      if (t.id === 'shovel') {
        const c = digDir > 0 ? P.mintD : P.coralD;
        R(sx + 12, sy + 1, 7, 7, P.line); R(sx + 13, sy + 2, 5, 5, P.cream);
        R(sx + 15, sy + 3, 1, 3, c); R(sx + 14, digDir > 0 ? sy + 4 : sy + 5, 3, 1, c);
      }
      if (t.id === 'seeds' || t.id === 'food') blit(Look.produce(t.id === 'seeds' ? seedKind : foodKind), sx + 11, sy + 11);
      if (hov) { tipFor = t; tipX = sx + sw / 2; tipFor.k = k; }
      if (on && !hov && toolTip > 0) { tipFor = t; tipX = sx + sw / 2; tipFor.k = k; }
    });
    // the little tray above the tool
    const ak = TOOLS.findIndex((t) => t.id === tool), ax = x0 + ak * (sw + gap) + sw / 2;
    if (tool === 'seeds' || tool === 'food') {
      const cw2 = 22, tw2 = cw2 * 3 + 8, tx = Math.round(U.clamp(ax - tw2 / 2, 4, W - 4 - tw2)), ty = y0 - 34;
      Look.card(g, tx, ty, tw2, 28, P.wood1);
      block(tx, ty, tw2, 28);
      KINDS.forEach((k, i) => {
        const sel = (tool === 'seeds' ? seedKind : foodKind) === k;
        const cx = tx + 4 + i * cw2, cy = ty + 3;
        const b = { x: cx, y: cy, w: cw2 - 1, h: 22, fn: () => { if (tool === 'seeds') seedKind = k; else foodKind = k; } };
        btns.push(b);
        Look.card(g, cx, cy, cw2 - 1, 22, sel ? P.sun : inside(b) ? P.cream : P.paper, P.line, false);
        blit(Look.produce(k), cx + 5, cy + 2);
        const cnt = tool === 'seeds' ? S.seeds[k] : S.basket[k];
        Font.draw(g, String(cnt), cx + 10, cy + 13, { align: 'center', color: cnt ? P.ink : P.inkL });
      });
    } else if (SIZED[tool]) {
      const cw2 = 16, extra = tool === 'shovel' ? 2 : 0, tw2 = cw2 * (3 + extra) + 8 + (extra ? 3 : 0);
      const tx = Math.round(U.clamp(ax - tw2 / 2, 4, W - 4 - tw2)), ty = y0 - 26;
      Look.card(g, tx, ty, tw2, 21, P.wood1);
      block(tx, ty, tw2, 21);
      let cx = tx + 4;
      if (tool === 'shovel') {
        for (const d of [1, -1]) {
          const b = { x: cx, y: ty + 3, w: cw2 - 1, h: 15, fn: () => { digDir = d; } };
          btns.push(b);
          Look.card(g, cx, ty + 3, cw2 - 1, 15, digDir === d ? P.sun : inside(b) ? P.cream : P.paper, P.line, false);
          const c = d > 0 ? P.mintD : P.coralD, mx = cx + 7, my = ty + 10;
          R(mx - 1 + 1, my - 4, 1, 8, c);
          for (let k = 1; k <= 3; k++) R(mx - k + 1, d > 0 ? my - 4 + k : my + 3 - k, k * 2 - 1, 1, c);
          cx += cw2;
        }
        cx += 3;
      }
      for (let s = 1; s <= 3; s++) {
        const b = { x: cx, y: ty + 3, w: cw2 - 1, h: 15, fn: () => { size = s; } };
        btns.push(b);
        Look.card(g, cx, ty + 3, cw2 - 1, 15, size === s ? P.sun : inside(b) ? P.cream : P.paper, P.line, false);
        const q = s * 2 + (s - 1);
        R(cx + 7 - Math.floor(q / 2), ty + 10 - Math.floor(q / 2), q, q, P.inkL);
        cx += cw2;
      }
    }
    if (tipFor) {
      const l1 = `${tipFor.k + 1}  ${tipFor.name}`, l2 = tipFor.tip;
      const w2 = Math.max(Font.width(l1, 1), Font.width(l2, 1)) + 12;
      const hasTray = tipFor.id === tool && (tool === 'seeds' || tool === 'food' || SIZED[tool]);
      const ty = y0 - (hasTray ? (SIZED[tool] ? 26 : 34) : 0) - 28;
      const tx = Math.round(U.clamp(tipX - w2 / 2, 4, W - 4 - w2));
      Look.card(g, tx, ty, w2, 24, P.cream);
      Font.draw(g, l1, tx + 6, ty + 4, { color: P.ink });
      Font.draw(g, l2, tx + 6, ty + 13, { color: P.inkL });
    }

    // who you are pointing at
    if (hoverW && !tipFor) {
      const w3 = hoverW, lines = w3.st === 'sleep' ? 'Sleeping' : w3.hunger > 0.72 ? 'Hungry!' : w3.love > 0.6 ? 'So happy' : w3.love > 0.25 ? 'Content' : 'Wants a pat';
      const bw = Math.max(Font.width(w3.name, 1), 5 * 8, Font.width(lines, 1)) + 12;
      const bx = Math.round(U.clamp(mouse.x + 10, 4, W - 4 - bw)), byy = Math.round(U.clamp(mouse.y - 34, 24, H - 70));
      Look.card(g, bx, byy, bw, 33, P.cream);
      Font.draw(g, w3.name, bx + 6, byy + 4, { color: P.ink });
      const hearts = Math.round(w3.love * 5);
      for (let k = 0; k < 5; k++) { g.globalAlpha = k < hearts ? 1 : 0.25; blit(Look.heart(), bx + 6 + k * 8, byy + 13); }
      g.globalAlpha = 1;
      Font.draw(g, lines, bx + 6, byy + 22, { color: w3.hunger > 0.72 ? P.coralD : P.inkL });
    }

    // little notes
    toasts.forEach((t, i) => {
      const a = t.t < 0.2 ? t.t / 0.2 : t.t > 2.6 ? (3 - t.t) / 0.4 : 1;
      const w4 = Font.width(t.str, 1) + 14, tx = Math.round(W / 2 - w4 / 2), ty = 26 + i * 18 - Math.round((1 - a) * 4);
      g.globalAlpha = a;
      Look.card(g, tx, ty, w4, 15, P.cream);
      Font.draw(g, t.str, W / 2, ty + 4, { align: 'center', color: P.ink });
      g.globalAlpha = 1;
    });
  }
  function drawFlyers() {
    for (const f of flyers) {
      const k = U.easeInOut(Math.min(1, f.t));
      const x = U.lerp(f.x, f.to.x, k), y = U.lerp(f.y, f.to.y, k) - Math.sin(k * Math.PI) * 24;
      blit(f.img, Math.round(x), Math.round(y));
    }
  }
  function drawShop() {
    const pw = 280, ph = 192, px = Math.round(W / 2 - pw / 2), py = 38;
    g.fillStyle = 'rgba(59,42,34,0.25)'; g.fillRect(0, 0, W, H);
    Look.card(g, px, py, pw, ph, P.paper);
    block(px, py, pw, ph);
    // the awning
    g.save(); g.beginPath(); g.rect(px + 2, py + 1, pw - 4, 24); g.clip();
    for (let i = 0; i < 14; i++) {
      const sx = px + 2 + i * 20, col = i % 2 ? P.cream : P.coral;
      R(sx, py + 1, 20, 12, col);
      Look.blob(g, sx + 10, py + 13, 10, 3, col);
      R(sx + 2, py + 15, 16, 1, i % 2 ? P.paper2 : P.coralD);
    }
    g.restore();
    R(px + 2, py + 1, pw - 4, 2, P.wood1);
    bigText('Farm Stand', W / 2, py + 22, 2, P.cream);
    button(px + pw - 22, py + 22, 16, 16, '', () => { shopOpen = false; }, { icon: Look.icon('x'), fill: P.coral });

    // sell
    const lx = px + 12, rx = px + pw / 2 + 6, ty = py + 46;
    Font.draw(g, 'SELL YOUR VEG', lx, ty, { color: P.inkL });
    Font.draw(g, 'BUY SEEDS', rx, ty, { color: P.inkL });
    R(px + pw / 2 - 1, ty, 1, 118, P.paper2);
    KINDS.forEach((k, i) => {
      const y = ty + 12 + i * 24, n = S.basket[k];
      Look.card(g, lx, y, 116, 21, P.cream, P.line, false);
      blit(Look.produce(k), lx + 4, y + 5);
      Font.draw(g, `x${n}`, lx + 18, y + 7, { color: n ? P.ink : P.inkL });
      blit(Look.coin(), lx + 40, y + 7);
      Font.draw(g, String(CROPS[k].sell), lx + 50, y + 7, { color: P.inkL });
      button(lx + 76, y + 2, 37, 16, 'Sell', () => sell(k), { dis: !n, fill: P.mint, silent: true });
      // seeds
      const cost = CROPS[k].seed;
      Look.card(g, rx, y, 120, 21, P.cream, P.line, false);
      blit(Look.produce(k), rx + 4, y + 5);
      Font.draw(g, CROPS[k].name, rx + 18, y + 3, { color: P.ink });
      Font.draw(g, `have ${S.seeds[k]}`, rx + 18, y + 12, { color: P.inkL });
      button(rx + 76, y + 2, 41, 16, String(cost), () => buy(k, mouse.shift ? 5 : 1), { dis: S.coins < cost, fill: P.sun, icon: Look.coin(), silent: true });
    });
    const tot = KINDS.reduce((a, k) => a + S.basket[k] * CROPS[k].sell, 0);
    button(lx, ty + 86, 116, 20, tot ? `Sell all  +${tot}` : 'Basket empty', sellAll, { dis: !tot, fill: P.mint, silent: true });
    Font.draw(g, 'shift-click: buy 5', rx + 4, ty + 92, { color: P.inkL });
    const price = adoptPrice(), full = S.wombats.length >= MAX_WOMBATS;
    button(px + 12, py + ph - 30, pw - 24, 22, full ? 'The farm is full of wombats' : `Adopt a wombat  -  ${price} coins`, adopt, { dis: full || S.coins < price, fill: P.pink, icon: Look.icon('wombat'), silent: true });
  }
  function drawTitle() {
    g.fillStyle = 'rgba(255,247,232,0.28)'; g.fillRect(0, 0, W, H);
    const pw = 236, ph = 178, px = Math.round(W / 2 - pw / 2), py = 44;
    Look.card(g, px, py, pw, ph, P.paper);
    block(px, py, pw, ph);
    // a garland of leaves along the top, veg in the corners
    for (let i = 0; i < 19; i++) {
      const lx = px + 8 + i * 12, ly = py + 1 + (i % 2);
      Look.blob(g, lx, ly, 4, 2, i % 2 ? P.leaf1 : P.leaf0);
      if (i % 3 === 1) { R(lx - 1, ly - 1, 3, 3, i % 2 ? P.pink : P.sun); R(lx, ly, 1, 1, P.cream); }
    }
    blit(Look.produce('carrot'), px + 8, py + ph - 18); blit(Look.produce('cabbage'), px + 20, py + ph - 16);
    blit(Look.produce('pumpkin'), px + pw - 20, py + ph - 17);
    // a pair of wombats, big and pleased
    const k = Math.floor(time * 3) % 2;
    const a = Look.wombat('brown', k ? 'happy' : 'idle', k), b = Look.flip(Look.wombat('sandy', Math.floor(time * 2.5) % 2 ? 'happy' : 'idle', Math.floor(time * 2.5) % 2));
    Look.blob(g, W / 2 - 30, py + 52, 20, 4, 'rgba(59,42,34,0.18)');
    Look.blob(g, W / 2 + 30, py + 52, 20, 4, 'rgba(59,42,34,0.18)');
    g.drawImage(a, W / 2 - 58, py + 12, a.width * 2, a.height * 2);
    g.drawImage(b, W / 2 + 2, py + 12, b.width * 2, b.height * 2);
    if (Math.sin(time * 2) > 0.3) blit(Look.heart(), W / 2 - 3, py + 12);
    bigText('Wombat Farm', W / 2, py + 62, 3, P.sun);
    Font.draw(g, 'a cozy little farm', W / 2, py + 92, { align: 'center', color: P.inkL });
    let y = py + 108;
    if (saved) {
      button(px + 38, y, pw - 76, 22, `Continue  -  day ${saved.day || 1}`, startGame, { fill: P.sun, silent: true });
      y += 28;
    }
    button(px + 38, y, pw - 76, 20, confirmNew > 0 ? 'Start over? Click again' : 'New farm', () => {
      if (saved && confirmNew <= 0) { confirmNew = 3; return; }
      newFarm(); Store.put(KEY, serialize()); saved = serialize(); startGame(); toast('Welcome to your new farm!');
    }, { fill: confirmNew > 0 ? P.coral : saved ? P.paper : P.sun, silent: true });
    y += 26;
    Font.draw(g, Sound.muted ? 'M: sound off' : 'M: sound on', W / 2, py + ph - 14, { align: 'center', color: P.inkL });
    btns.push({ x: px, y: py + ph - 18, w: pw, h: 14, fn: toggleSound });
  }
  function startGame() {
    mode = 'play'; sfx('hello'); toolTip = 3; lastGuide = guideStep();
  }
  // an arrow of our own, since the system one is hidden over the game
  const ARROW = (() => {
    const o = Look.cv(10, 13);
    o.g.fillStyle = P.cream;
    for (let y = 0; y < 8; y++) o.g.fillRect(1, 1 + y, Math.min(y + 1, 7), 1);
    o.g.fillRect(3, 9, 2, 1); o.g.fillRect(4, 10, 2, 1); o.g.fillRect(5, 11, 1, 1);
    o.g.fillRect(1, 9, 1, 1);
    return Look.outline(o.c);
  })();
  function drawCursor() {
    if (!mouse.seen || mouse.touch) return;
    const x = Math.round(mouse.x), y = Math.round(mouse.y);
    const overUI = btns.some((b) => inside(b));
    if (held) return;
    if (mode === 'play' && !shopOpen && !overUI && !fade) {
      blit(Look.icon(tool === 'hand' && hoverW ? 'hand' : tool), x + 5, y + 6);
    }
    g.drawImage(ARROW, x - 1, y - 1);
  }
  function drawHeld() {
    if (!held) return;
    const x = Math.round(mouse.x), y = Math.round(mouse.y);
    Look.blob(g, x, y + 16, 7, 2, 'rgba(59,42,34,0.22)');
    const lx = held.lastX == null ? mouse.x : held.lastX;
    if (mouse.x > lx + 0.3) held.dir = 1; else if (mouse.x < lx - 0.3) held.dir = -1;
    held.lastX = mouse.x;
    blit(wombatSprite(held), x - 13, y - 8 + Math.round(Math.sin(time * 8)));
  }

  function draw() {
    lastBtns = btns; btns = [];
    drawWorld();
    drawAmbient();
    drawBrush();
    drawParts();
    drawLight();
    drawHeld();
    if (mode === 'play') { drawHud(); if (shopOpen) drawShop(); }
    else drawTitle();
    drawFlyers();
    if (fade) {
      const a = Math.sin(Math.min(1, fade.t) * Math.PI);
      g.fillStyle = U.rgba('#2e2a4a', a * 0.92); g.fillRect(0, 0, W, H);
      if (a > 0.6) Font.draw(g, 'z z z', W / 2, H / 2 - 4, { align: 'center', scale: 2, color: U.rgba('#fff7e8', (a - 0.6) / 0.4) });
    }
    drawCursor();
  }

  // ---- go -----------------------------------------------------------------------------------------------
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now; time += dt;
    update(dt); draw(); Sound.tick();
    requestAnimationFrame(frame);
  }
  const st = Store.settings();
  if (st.muted) Sound.setMuted(true);
  newFarm();                                               // something to look at while the save loads
  draw();
  Store.boot(KEY).then((o) => {
    const s = o && hydrate(o);
    if (s) saved = o; else newFarm();
    shownCoins = S.coins;
  }).catch(() => { });
  addEventListener('pagehide', () => { if (mode === 'play') { Store.put(KEY, serialize()); Store.flush(); } });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && mode === 'play') { Store.put(KEY, serialize()); Store.flush(); } });
  requestAnimationFrame(frame);
  window.Farm = { get S() { return S; }, get mode() { return mode; }, start: startGame, newFarm, serialize, setTool, pick, topY, idx, lv, get size() { return size; }, set size(v) { size = v; }, get shop() { return shopOpen; }, set shop(v) { shopOpen = v; }, T, GY, LH };
})();
