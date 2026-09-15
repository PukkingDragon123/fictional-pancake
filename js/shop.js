// ---- Wombat Mart: a lit convenience store with signed aisles --------------
const Shop = (() => {
  let G = null;
  const VW = 640, VH = 360;
  const cache = new Map();
  let phase = 'aisle', pt = 0, scroll = 0, tscroll = 0, till = 0, hover = null;
  let drag = null, moved = 0, keeper = { t: 0, pose: 'idle' }, keeperHot = false;
  const basket = [], flies = [], motes = [];

  // ---- product sprites ----------------------------------------------------
  function pic(p) {
    const key = `${p.sprite}:${p.key || p.id}`;
    let c = cache.get(key);
    if (c) return c;
    c = draw(p);
    cache.set(key, c);
    return c;
  }
  function draw(p) {
    const { c, g } = Art.cv(40, 52);
    const tint = p.tint || PAL.gold2;
    if (p.sprite === 'packet') packet(g, tint, p.icon);
    else if (p.sprite === 'crate') crate(g, tint, p.icon);
    else if (p.sprite === 'scroll') scroll_(g, tint, p.icon);
    else if (p.sprite === 'stock') stock(g);
    else if (p.sprite === 'tool') toolCard(g, p.icon);
    else jar(g, tint, p.icon);
    Art.outline(c, PAL.ink, 1);
    return c;
  }
  function packet(g, tint, icon) {
    const x = 7, y = 10, w = 26, h = 36;
    Art.rect(g, x, y, w, h, PAL.parch1);                       // paper
    Art.rect(g, x, y, w, 3, '#fff7e2');
    Art.rect(g, x, y + h - 4, w, 4, '#cbb88f');
    for (let i = 0; i < 7; i++) Art.rect(g, x + i * 4, y - 2, 2, 3, PAL.parch1);   // serrated top
    Art.rect(g, x, y + 4, w, 8, tint);                          // colour band
    Art.rect(g, x, y + 4, w, 2, U.shade(tint, 0.3));
    Art.rect(g, x, y + 11, w, 1, U.shade(tint, -0.35));
    Art.rect(g, x + 3, y + 15, 20, 15, '#3a2c22');              // window
    Art.rect(g, x + 4, y + 16, 18, 13, '#cfe0ef');
    Icons.blit(g, icon || 'c_ashgrass', x + 5, y + 16, 0.9);
    Art.rect(g, x + 3, y + 32, 20, 1.6, '#8a7455');            // ruled lines
    Art.rect(g, x + 3, y + 35, 13, 1.6, '#8a7455');
    Art.rect(g, x + w - 2, y, 2, h, 'rgba(0,0,0,0.22)');
  }
  function crate(g, tint, icon) {
    const x = 4, y = 16, w = 32, h = 30;
    Art.rect(g, x, y, w, h, PAL.bark2);
    for (let i = 0; i < 3; i++) Art.rect(g, x, y + 2 + i * 10, w, 7, PAL.bark3);
    Art.rect(g, x, y, 3, h, PAL.bark1); Art.rect(g, x + w - 3, y, 3, h, PAL.bark1);
    Art.rect(g, x, y, w, 2, '#8f6c4a');
    Art.line(g, x + 3, y + h - 2, x + w - 3, y + 2, PAL.bark1, 2);
    Art.rect(g, x + 8, y - 8, 16, 10, U.shade(tint, -0.1));     // goods poking out
    Art.rect(g, x + 8, y - 8, 16, 3, U.shade(tint, 0.32));
    Icons.blit(g, icon || 'd_brazier', x + 9, y - 9, 0.85);
  }
  function scroll_(g, tint, icon) {
    const x = 6, y = 12, w = 28, h = 32;
    Art.rect(g, x, y, w, h, '#dcd0ae');
    Art.rect(g, x, y, w, 3, '#efe6c8');
    for (let i = 0; i < 4; i++) Art.rect(g, x + 4, y + 8 + i * 5, w - 8 - (i % 2) * 6, 1.6, '#6f7f96');
    Art.rect(g, x - 2, y - 4, w + 4, 6, PAL.bark2);             // rolled ends
    Art.rect(g, x - 2, y - 4, w + 4, 2, PAL.bark3);
    Art.rect(g, x - 2, y + h - 2, w + 4, 6, PAL.bark2);
    Art.rect(g, x - 2, y + h - 2, w + 4, 2, PAL.bark3);
    Art.ell(g, x + w / 2, y + h / 2, 7, 7, U.shade(tint, -0.1));
    Icons.blit(g, icon || 'u_shrine', x + w / 2 - 6, y + h / 2 - 6, 0.75);
  }
  function jar(g, tint, icon) {
    Art.rect(g, 9, 14, 22, 30, 'rgba(200,228,238,0.5)');
    Art.rect(g, 11, 24, 18, 18, tint);
    Art.rect(g, 11, 24, 18, 3, U.shade(tint, 0.3));
    Art.rect(g, 9, 10, 22, 6, PAL.bark2);
    Art.rect(g, 9, 10, 22, 2, PAL.bark3);
    Art.rect(g, 12, 17, 3, 22, 'rgba(255,255,255,0.45)');
    if (icon) Icons.blit(g, icon, 14, 27, 0.8);
  }
  function toolCard(g, icon) {                    // a tool hung on a shop card
    Art.rect(g, 5, 8, 30, 40, '#e0c98f');
    Art.rect(g, 5, 8, 30, 4, '#f0dfb0');
    Art.rect(g, 5, 44, 30, 4, '#b89a5e');
    Art.rect(g, 17, 4, 6, 6, '#3a2a1a'); Art.rect(g, 19, 5, 2, 3, '#e0c98f');
    Art.rect(g, 8, 14, 24, 24, '#3a3346');
    Art.rect(g, 8, 14, 24, 2, '#5d5478');
    Icons.blit(g, icon || 't_sickle', 10, 16, 1.25);
    for (let i = 0; i < 3; i++) Art.rect(g, 9 + i * 8, 41, 6, 1.6, '#8a7455');
  }
  function stock(g) {
    Art.ell(g, 20, 40, 17, 8, PAL.bark2);                       // basket
    Art.rect(g, 4, 30, 32, 12, PAL.bark2);
    for (let i = 0; i < 6; i++) Art.rect(g, 5 + i * 5, 30, 2, 12, PAL.bark3);
    Art.rect(g, 4, 30, 32, 2, '#8f6c4a');
    Art.ell(g, 20, 24, 13, 11, '#bd8763');                      // a joey looking out
    Art.rect(g, 11, 14, 6, 5, '#a66e4f'); Art.rect(g, 24, 14, 6, 5, '#a66e4f');
    Art.rect(g, 15, 21, 2, 2, PAL.ink); Art.rect(g, 24, 21, 2, 2, PAL.ink);
    Art.ell(g, 20, 27, 5, 3.4, '#8a553e');
    Art.rect(g, 18, 26, 5, 2, '#4a2c20');
  }

  // ---- catalogue ----------------------------------------------------------
  function catalogue() {
    const out = [];
    for (const c of CROPS) {
      out.push({
        id: 'seed:' + c.key, kind: 'seed', key: c.key, name: c.name, price: c.seed,
        sprite: 'packet', tint: c.color, icon: c.icon, note: c.grow + 's',
        locked: !!(c.god && !G.blessings[c.god]),
      });
    }
    for (const key of Object.keys(TIERS)) {
      const nxt = nextTier(G, key), cur = tierOf(G, key);
      const icon = { sickle: 't_sickle', hoe: 't_hoe', water: 't_water' }[key];
      out.push({
        id: 'tier:' + key, kind: 'tier', key, name: nxt ? nxt.name : cur.name, price: nxt ? nxt.cost : 0,
        sprite: 'tool', tint: '#8a6a3a', icon, note: nxt ? `rank ${tierIndex(G, key) + 2}` : 'best there is', sold: !nxt,
      });
    }
    out.push({ id: 'wombat', kind: 'wombat', key: 'wombat', name: 'Wombat', price: WOMBAT_PRICE(G.wombats.length), sprite: 'stock', icon: 'wombat', note: `${G.wombats.length}/${Grove.capacity()}` });
    for (const u of UPGRADES) {
      const l = G.up[u.key] || 0;
      out.push({ id: 'up:' + u.key, kind: 'up', key: u.key, name: u.name, price: Math.round(u.base * Math.pow(u.mult, l)), sprite: 'scroll', tint: PAL.stone3, icon: u.icon, note: `${l}/${u.max}`, sold: l >= u.max });
    }
    for (const d of DECOR) {
      out.push({ id: 'dec:' + d.key, kind: 'dec', key: d.key, name: d.name, price: d.cost, sprite: 'crate', tint: PAL.moss2, icon: d.icon, note: '', sold: !!G.decor[d.key] });
    }
    return out;
  }
  // ---- layout: aisles by section, then the checkout -----------------------
  // Each section is a gondola of three shelves under a coloured header sign,
  // laid out left to right; the player swipes sideways to walk the aisle.
  const SECTIONS = [
    { key: 'tier',   name: 'TOOLS', color: '#8a6a3a', sub: 'sharper' },
    { key: 'seed',   name: 'SEEDS', color: '#3f8f4a', sub: 'sow it' },
    { key: 'up',     name: 'BUILD', color: '#2f6f9f', sub: 'dig it' },
    { key: 'dec',    name: 'YARD',  color: '#c97a25', sub: 'set it' },
    { key: 'wombat', name: 'ADOPT', color: '#b8496a', sub: 'love it' },
  ];
  const SHELF_Y = [190, 242, 294];        // board tops, three to a gondola
  const COLW = 96;                        // one product slot
  const AISLE0 = 470;                     // the doors and the cooler take the first stretch
  const GAP = 64;                         // between gondolas
  let slots = [], bays = [], counterX = 1200, worldW = 1500;
  // The prize machine by the till, and the one item on special this visit.
  const gacha = { x: 0, t: 0, spin: 0, prize: null, showT: 0, shake: 0 };
  let gachaR = null, deal = null;

  function layout() {
    const list = catalogue();
    slots = []; bays = [];
    let x = AISLE0;
    for (const sec of SECTIONS) {
      const items = list.filter((p) => p.kind === sec.key);
      if (!items.length) continue;
      const cols = Math.max(2, Math.ceil(items.length / 3));
      const w = cols * COLW;
      const taken = new Array(cols * 3).fill(false);
      bays.push({ sec, x, w, cols, taken });
      items.forEach((p, i) => {
        const c = i % cols, r = Math.floor(i / cols);
        taken[r * cols + c] = true;
        slots.push({ p, x: x + c * COLW + COLW / 2, y: SHELF_Y[r], sec });
      });
      x += w + GAP;
    }
    counterX = x + 30;
    worldW = counterX + 330;
    gacha.x = counterX - 152;
    // one line on special every visit, picked from whatever is actually for sale
    const buyable = slots.filter((sl) => !sl.p.sold && !sl.p.locked);
    deal = buyable.length ? buyable[Math.floor(Math.random() * buyable.length)].p.id : null;
  }

  // ---- basket -------------------------------------------------------------
  function countOf(id) { return basket.filter((b) => b === id).length; }
  const onDeal = (p) => !!deal && p.id === deal;
  function priceOf(p, extra = 0) {
    if (onDeal(p)) return Math.max(1, Math.round(rawPrice(p, extra) * 0.5));
    return rawPrice(p, extra);
  }
  function rawPrice(p, extra = 0) {
    if (p.kind === 'wombat') return WOMBAT_PRICE(G.wombats.length + extra);
    if (p.kind === 'tier') { const t = TIERS[p.key][tierIndex(G, p.key) + 1 + extra]; return t ? t.cost : 0; }
    if (p.kind === 'up') { const u = UPGRADES.find((x) => x.key === p.key); return Math.round(u.base * Math.pow(u.mult, (G.up[p.key] || 0) + extra)); }
    return p.price;
  }
  function total() {
    const seen = {};
    let t = 0;
    for (const id of basket) {
      const p = catalogue().find((x) => x.id === id);
      if (!p) continue;
      t += priceOf(p, seen[id] || 0);
      seen[id] = (seen[id] || 0) + 1;
    }
    return t;
  }
  function lines() {
    const order = [], map = {};
    for (const id of basket) { if (!map[id]) { map[id] = { id, n: 0 }; order.push(map[id]); } map[id].n++; }
    const cat = catalogue();
    return order.map((o) => {
      const p = cat.find((x) => x.id === o.id) || { name: '?', price: 0 };
      let sum = 0;
      for (let i = 0; i < o.n; i++) sum += priceOf(p, i);
      return { p, n: o.n, sum, deal: onDeal(p) };
    });
  }
  function add(p) {
    if (p.locked) { Audio.play('error'); UI.toast('locked', 'bad'); return; }
    if (p.sold) { Audio.play('error'); return; }
    if (p.kind === 'wombat' && G.wombats.length + countOf(p.id) >= Grove.capacity()) { Audio.play('error'); UI.toast('no room', 'bad'); return; }
    if ((p.kind === 'dec' || p.kind === 'tier') && countOf(p.id) >= 1) { Audio.play('error'); return; }
    basket.push(p.id);
    Audio.play('pop');
    const s = slots.find((sl) => sl.p.id === p.id);
    if (s) {
      flies.push({ x: s.x - scroll, y: s.y - 20, t: 0, pic: pic(p) });
      FX.comic(s.x - scroll, s.y - 42, U.pick(['GRAB!', 'IN!', 'YOINK!']), { ink: '#ffe98a', edge: '#c9581f', life: 0.6 });
    }
    UI.refreshBasket();
  }
  // one off the pile, rather than the whole line
  function removeOne(id) {
    const i = basket.lastIndexOf(id);
    if (i >= 0) basket.splice(i, 1);
    UI.refreshBasket();
  }
  function addById(id) {
    const p = catalogue().find((x) => x.id === id);
    if (p) add(p);
  }
  function removeLine(id) {
    const i = basket.lastIndexOf(id);
    if (i >= 0) { basket.splice(i, 1); Audio.play('click'); UI.refreshBasket(); }
  }
  function clear() { basket.length = 0; UI.refreshBasket(); }

  function checkout() {
    const t = total();
    if (!basket.length) return;
    if (G.wd < t) { Audio.play('error'); UI.toast('not enough', 'bad'); return; }
    G.wd -= t;
    const cat = catalogue();
    for (const id of basket.slice()) {
      const p = cat.find((x) => x.id === id);
      if (!p) continue;
      if (p.kind === 'seed') G.seeds[p.key] = (G.seeds[p.key] || 0) + 6;
      else if (p.kind === 'tier') { if (nextTier(G, p.key)) G.tiers[p.key] = tierIndex(G, p.key) + 1; }
      else if (p.kind === 'wombat') { if (G.wombats.length < Grove.capacity()) Grove.addWombat(); }
      else if (p.kind === 'up') G.up[p.key] = (G.up[p.key] || 0) + 1;
      else if (p.kind === 'dec') G.decor[p.key] = true;
    }
    basket.length = 0;
    till = 2;
    keeper.pose = 'happy'; keeper.t = 0;
    Audio.play('buy');
    FX.confettiBurst(VW * 0.72, 160, 24);
    FX.comic(VW * 0.72, 150, 'KA-CHING!', { ink: '#f5cd5c', edge: '#c9581f', life: 1 });
    UI.refreshBasket(); UI.refreshAll();
    Main.save();
  }

  // ---- scene flow ---------------------------------------------------------
  function open() { Main.setMode('shop'); }
  function enter() {
    layout();
    phase = 'aisle'; pt = 0; scroll = 0; tscroll = 0; till = 0; hover = null;
    basket.length = 0; flies.length = 0;
    if (!motes.length) { const r = Art.rng(99); for (let i = 0; i < 24; i++) motes.push({ x: r() * VW, y: r() * VH, ph: r() * TAU }); }
    Audio.setMode('pen');
    Audio.play('door');
    UI.refreshBasket();
  }
  function leave() { Main.setMode('map'); }

  function update(dt) {
    pt += dt;
    scroll = U.lerp(scroll, tscroll, 1 - Math.pow(0.0015, dt));
    keeper.t += dt;
    shazTick(dt);
    if (till > 0) { till -= dt; if (till <= 0) keeper.pose = 'idle'; }
    if (gacha.spin > 0) {
      gacha.spin = Math.max(0, gacha.spin - dt * 0.8);
      if (gacha.spin === 0) { gacha.prize = rollPrize(); gacha.showT = 2.2; award(gacha.prize); }
    }
    gacha.shake = Math.max(0, gacha.shake - dt * 3);
    if (gacha.showT > 0) gacha.showT = Math.max(0, gacha.showT - dt);
    for (let i = flies.length - 1; i >= 0; i--) {
      const f = flies[i]; f.t += dt * 1.6;
      if (f.t >= 1) flies.splice(i, 1);
    }
  }

  // ---- input --------------------------------------------------------------
  function slotAt(x, y) {
    for (const s of slots) {
      const sx = s.x - scroll;
      if (x > sx - 26 && x < sx + 26 && y > s.y - 58 && y < s.y + 6) return s;
    }
    return null;
  }
  const overCounter = (x) => x + scroll > counterX - 30;
  function press(x, y) {
    drag = { x, y, s: tscroll }; moved = 0;
  }
  function move(x, y) {
    if (!drag) return;
    moved = Math.max(moved, Math.abs(x - drag.x));
    tscroll = U.clamp(drag.s - (x - drag.x), 0, worldW - VW);
    scroll = tscroll;
  }
  function release(x, y) {
    if (!drag) return;
    const wasDrag = moved > 6;
    drag = null;
    if (wasDrag) return;
    const s = slotAt(x, y);
    if (s) { add(s.p); return; }
    if (gachaR && x > gachaR.x && x < gachaR.x + gachaR.w && y > gachaR.y && y < gachaR.y + gachaR.h) { spinGacha(); return; }
    if (keeperR && x > keeperR.x && x < keeperR.x + keeperR.w && y > keeperR.y && y < keeperR.y + keeperR.h) {
      if (!basket.length) { Audio.play('error'); UI.toast('nothing in the basket yet', 'bad'); return; }
      UI.openBasket(); Audio.play('click');
      FX.comic(x, y - 26, 'G\'DAY!', { ink: '#d8f0a0', edge: '#2f8f42', life: 0.5 });
      return;
    }
    if (overCounter(x) && y > 150) { UI.openBasket(); Audio.play('click'); return; }
  }
  function hoverAt(x, y) {
    if (phase !== 'aisle') return null;
    keeperHot = !!(keeperR && x > keeperR.x && x < keeperR.x + keeperR.w && y > keeperR.y && y < keeperR.y + keeperR.h);
    if (gachaR && x > gachaR.x && x < gachaR.x + gachaR.w && y > gachaR.y && y < gachaR.y + gachaR.h) {
      hover = null;
      return `<b>Prize Machine</b><br>${U.fmt(PRIZE_COST)} W$ a go<br><span class="dim">seed, coin, cubes &mdash; or a Golden Wombat</span>`;
    }
    const s = slotAt(x, y);
    hover = s;
    if (keeperHot) return `<b>Shaz</b> <span class="dim">nineteen years on this till</span><br>${basket.length ? 'click to pay ' + total() + ' W$' : 'she would love to tell you about wombats'}`;
    if (!s) return overCounter(x) && y > 150 ? '<b>Checkout</b><br>ask Shaz' : null;
    const p = s.p;
    const tag = p.locked ? '<span class="warn">a god must bless it</span>'
      : p.sold ? '<span class="good">owned</span>'
        : `${Icons.img('wdollar', 'sm')} ${U.fmt(priceOf(p, countOf(p.id)))}`;
    const extra = p.kind === 'seed' ? '<br>6 seeds a packet' : p.note ? '<br>' + p.note : '';
    return `<b>${p.name}</b>${extra}<br>${tag}`;
  }
  function wheel(dy) { tscroll = U.clamp(tscroll + dy, 0, worldW - VW); }

  // ---- render -------------------------------------------------------------
  function render(g) {
    renderRoom(g);
  }

  // The storefront: a lit box at dusk, glass all along the front, automatic
  // doors sliding apart while the camera walks in.
  function renderRoom(g) {
    const t = G.time, S = scroll;
    // ---- ceiling: tiles, cable trays, and warm tubes ----------------------
    g.fillStyle = '#ded6c0'; g.fillRect(0, 0, VW, 96);
    Tex.fill(g, 'ceilt', -(S * 0.5) % 40, 0, VW + 40, 96, 0.9);
    for (let x = -(S * 0.5) % 40; x < VW; x += 40) {
      g.fillStyle = '#b3aa94'; g.fillRect(x, 0, 2, 96);
      g.fillStyle = '#f0e9d4'; g.fillRect(x + 2, 0, 1, 96);
    }
    for (let y = 22; y < 96; y += 26) {
      g.fillStyle = '#b3aa94'; g.fillRect(0, y, VW, 2);
      g.fillStyle = '#f0e9d4'; g.fillRect(0, y + 2, VW, 1);
    }
    for (let x = -(S * 0.5) % 160; x < VW; x += 160) {           // a cable tray running the length
      g.fillStyle = '#9a927f'; g.fillRect(x, 30, 160, 5);
      g.fillStyle = '#b3aa94'; g.fillRect(x, 30, 160, 2);
      for (let i = 0; i < 8; i++) { g.fillStyle = '#7f7767'; g.fillRect(x + 6 + i * 19, 35, 3, 3); }
    }
    // fluorescent tubes, and the warm pool each one throws
    for (let x = -(S * 0.7) % 190 + 40; x < VW + 60; x += 190) {
      g.fillStyle = '#8e8a7c'; g.fillRect(x - 2, 0, 4, 14); g.fillRect(x + 64, 0, 4, 14);
      g.fillStyle = '#cfcabb'; g.fillRect(x - 8, 14, 82, 10);
      g.fillStyle = '#fffdf0'; g.fillRect(x - 4, 16, 74, 6);
      const gl = g.createLinearGradient(0, 24, 0, 170);
      gl.addColorStop(0, 'rgba(255,246,214,0.42)'); gl.addColorStop(1, 'rgba(255,246,214,0)');
      g.fillStyle = gl; g.fillRect(x - 34, 24, 134, 150);
    }
    ceilingPromos(g, S, t);
    // ---- wall: warm cream, with a dado rail and a skirting ----------------
    g.fillStyle = '#efe2c6'; g.fillRect(0, 96, VW, 214);
    Tex.fill(g, 'plaster', -S % 56, 96, VW + 56, 214, 0.85);
    const wg = g.createLinearGradient(0, 96, 0, 310);
    wg.addColorStop(0, 'rgba(255,244,214,0.5)'); wg.addColorStop(1, 'rgba(150,124,80,0.22)');
    g.fillStyle = wg; g.fillRect(0, 96, VW, 214);
    for (let x = -(S) % 64; x < VW; x += 64) { g.fillStyle = 'rgba(90,60,20,0.05)'; g.fillRect(x, 96, 1, 214); }
    g.fillStyle = '#c9b892'; g.fillRect(0, 300, VW, 4);
    g.fillStyle = '#8d7a56'; g.fillRect(0, 304, VW, 6);
    // ---- floor: checkerboard vinyl, scuffed, with the light on it ---------
    g.fillStyle = '#cdc4ab'; g.fillRect(0, 310, VW, VH - 310);
    for (let r = 0; r < 4; r++) {
      const y = 310 + r * 13, h = 13;
      for (let i = -1; i < 18; i++) {
        const x = Math.round(i * 40 - (S % 80) + (r % 2 ? 20 : 0));
        g.fillStyle = (i + r) % 2 ? '#ded6c0' : '#c3baa2';
        g.fillRect(x, y, 40, h);
        Tex.fill(g, (i + r) % 2 ? 'vinyl' : 'vinyl2', x, y, 40, h, 0.85);
        g.fillStyle = 'rgba(255,255,255,0.2)'; g.fillRect(x, y, 40, 1);
        g.fillStyle = 'rgba(90,76,48,0.22)'; g.fillRect(x, y + h - 1, 40, 1); g.fillRect(x, y, 1, h);
      }
    }
    for (let x = -(S * 0.7) % 190 + 40; x < VW + 60; x += 190) {  // the tube's reflection
      const fl = g.createLinearGradient(0, 310, 0, VH);
      fl.addColorStop(0, 'rgba(255,250,224,0.3)'); fl.addColorStop(1, 'rgba(255,250,224,0)');
      g.fillStyle = fl; g.fillRect(x - 26, 310, 118, 50);
    }
    for (let i = 0; i < 26; i++) {                                // scuffs and a dropped receipt
      const x = ((i * 137 - S * 1.02) % (VW + 120) + VW + 120) % (VW + 120) - 60;
      g.fillStyle = 'rgba(120,104,74,0.2)';
      g.fillRect(x, 316 + (i * 7) % 40, 6 + (i % 3) * 5, 1);
    }
    g.fillStyle = '#d8b23a'; g.fillRect(0, 352, VW, 4);
    g.fillStyle = '#a8861c'; g.fillRect(0, 356, VW, 2);
    g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(0, 310, VW, 2);

    wallDressing(g, S, t);

    // ---- entrance stretch --------------------------------------------------
    drawEntrance(g, 60 - S, t);
    // ---- the aisles --------------------------------------------------------
    for (const b of bays) drawBay(g, b, S);
    fixtures(g, S, t);
    floorProps(g, S, t);
    drawGacha(g, S, t);
    for (const s of slots) {
      const x = s.x - S;
      if (x < -60 || x > VW + 60) continue;
      const img = pic(s.p);
      const hot = hover === s;
      const bob = hot ? Math.sin(t * 9) * 3 - 1.5 : Math.sin(t * 1.9 + s.x * 0.05) * 1.1;
      g.globalAlpha = s.p.locked ? 0.45 : 1;
      g.drawImage(img, Math.round(x - img.width / 2), Math.round(s.y - img.height + 10 + bob));
      g.globalAlpha = 1;
      if (s.p.locked) Icons.blit(g, 'lock', x - 8, s.y - 30, 1);
      tag(g, x, s.y + 3, s.p, hot);
      if (onDeal(s.p) && !s.p.sold && !s.p.locked) {          // today's special
        const bl = 0.5 + 0.5 * Math.sin(t * 5);
        const bx2 = x - 26, by = s.y - 18 - bl * 1.5;
        g.fillStyle = '#c02030';
        for (let k = 0; k < 10; k++) {                         // a paper starburst
          const a1 = (k / 10) * TAU, a2 = ((k + 0.5) / 10) * TAU;
          Art.poly(g, [[bx2, by], [bx2 + Math.cos(a1) * 16, by + Math.sin(a1) * 13],
                       [bx2 + Math.cos(a2) * 11, by + Math.sin(a2) * 9]], '#c02030');
        }
        Art.ell(g, bx2, by, 12, 9.5, '#f2cf3a');
        Font.draw(g, 'HALF', bx2, by - 3, { scale: 1, color: '#7a2010', align: 'center' });
      }
      const n = countOf(s.p.id);
      if (n) {
        Art.ell(g, x + 17, s.y - 36, 7, 7, '#3f8f4a');
        FX.pixelText(g, String(n), x + 17, s.y - 39, { color: '#fff', size: 7 });
      }
    }
    // ---- checkout ----------------------------------------------------------
    drawCounter(g, counterX - S, t);

    // items flying to the basket
    for (const f of flies) {
      const k = U.easeIn(f.t);
      const x = U.lerp(f.x, VW - 40, k), y = U.lerp(f.y, VH - 34, k) - Math.sin(f.t * Math.PI) * 60;
      const s2 = 1 - k * 0.6;
      g.drawImage(f.pic, Math.round(x - f.pic.width * s2 / 2), Math.round(y - f.pic.height * s2 / 2), f.pic.width * s2, f.pic.height * s2);
    }
    for (const m of motes) {
      g.fillStyle = 'rgba(255,250,220,0.5)';
      g.fillRect(Math.round((m.x + Math.sin(t * 0.4 + m.ph) * 20) % VW), Math.round(m.y + Math.cos(t * 0.3 + m.ph) * 14), 1, 1);
    }
    // once you have something, point the way to the counter
    if (basket.length && counterX - scroll > VW - 40) {
      const a = 0.5 + 0.5 * Math.sin(t * 4);
      const ax = VW - 96, ay = 96;
      g.fillStyle = `rgba(201,88,31,${(0.5 + a * 0.4).toFixed(2)})`;
      g.fillRect(ax - 44, ay - 11, 84, 22);
      g.fillStyle = '#fff0dc'; g.fillRect(ax - 44, ay - 11, 84, 2);
      Font.draw(g, 'TO THE TILL', ax - 6, ay - 4, { scale: 1, color: '#fff0dc', align: 'center' });
      for (let i = 0; i < 3; i++) {
        g.fillStyle = `rgba(255,240,220,${(0.3 + a * 0.6 - i * 0.15).toFixed(2)})`;
        for (let k = 0; k < 5; k++) g.fillRect(ax + 26 + i * 7 + k, ay - 5 + k, 1, 11 - k * 2);
      }
    }
    // swipe hint
    if (pt < 5 && tscroll < 20) {
      const a = 0.45 + 0.45 * Math.sin(t * 4);
      g.globalAlpha = a;
      FX.pixelText(g, 'SWIPE', VW - 96, VH - 26, { color: '#2a2f3a', size: 8, inkColor: 'rgba(255,255,255,0.9)' });
      for (let i = 0; i < 3; i++) { g.fillStyle = '#c9581f'; g.fillRect(VW - 44 + i * 9, VH - 24, 6, 6); }
      g.globalAlpha = 1;
    }
    FX.drawParticles(g, 0);
    FX.drawConfetti(g);
    FX.drawFloaters(g, false);
    FX.drawComics(g, false);
  }

  // The wall above the aisles: the strip of a real shop that tells you where
  // you are. A house banner, promo posters, a clock, vents.
  const POSTERS = [
    { x: 236,  w: 104, top: '2 FOR 1', mid: 'SEEDS',   bot: 'THIS WEEK', col: '#3f8f4a' },
    { x: 620,  w: 112, top: 'NEW IN',  mid: 'SICKLES', bot: 'SHARPER',   col: '#c9581f' },
    { x: 1004, w: 118, top: 'ADOPT',   mid: 'WOMBATS', bot: 'ASK STAFF', col: '#b8496a' },
    { x: 1388, w: 104, top: 'SAVE',    mid: '20 W$',   bot: 'ON YARDS',  col: '#2f6f9f' },
  ];
  function wallDressing(g, S, t) {
    // the house banner along the top of the wall
    const by = 98;
    g.fillStyle = '#e6dcc4'; g.fillRect(0, by, VW, 12);
    g.fillStyle = '#c9581f'; g.fillRect(0, by + 9, VW, 3);
    g.fillStyle = '#f6f1e2'; g.fillRect(0, by, VW, 2);
    for (let x = -(S * 0.6) % 340; x < VW + 340; x += 340) {
      Font.draw(g, 'WOMBAT MART', x + 24, by + 2, { scale: 1, color: 'rgba(140,110,78,0.75)' });
    }
    // vents along the wall between the gondolas
    for (let x = -(S * 0.9) % 340 + 120; x < VW + 60; x += 340) {
      g.fillStyle = '#cdc7b4'; g.fillRect(x, 122, 44, 15);
      g.fillStyle = '#b5af9c'; g.fillRect(x + 2, 124, 40, 11);
      for (let i = 0; i < 3; i++) { g.fillStyle = '#8e8879'; g.fillRect(x + 3, 125 + i * 3, 38, 1); }
    }
    // a wall clock, ticking
    const cx = 890 - S;
    if (cx > -40 && cx < VW + 40) {
      g.fillStyle = '#1d2230'; Art.ell(g, cx, 130, 13, 13);
      g.fillStyle = '#fffdf0'; Art.ell(g, cx, 130, 11, 11);
      for (let i = 0; i < 12; i++) {
        const a2 = (i / 12) * TAU;
        g.fillStyle = '#8e8879'; g.fillRect(Math.round(cx + Math.cos(a2) * 8) - 1, Math.round(130 + Math.sin(a2) * 8) - 1, 2, 2);
      }
      g.fillStyle = '#2a2f3a'; g.fillRect(cx - 1, 124, 2, 7);
      const mm = t * 0.5;
      g.fillStyle = '#c9581f';
      g.fillRect(Math.round(cx + Math.cos(mm - Math.PI / 2) * 4) - 1, Math.round(130 + Math.sin(mm - Math.PI / 2) * 4) - 1, 2, 2);
    }
  }

  // Promo boards hung from the ceiling over the aisles: what fills the air of
  // a real shop, and what tells you at a glance what is worth buying.
  function ceilingPromos(g, S, t) {
    for (const p of POSTERS) {
      const x = Math.round(p.x - S * 1.06), h = 48;
      if (x + p.w < -30 || x - p.w > VW + 30) continue;
      const sway = Math.sin(t * 1.1 + p.x) * 0.9;
      const x0 = Math.round(x - p.w / 2 + sway);
      g.fillStyle = '#8e8a7c';                                   // drop wires
      g.fillRect(x0 + 12, 0, 2, 26); g.fillRect(x0 + p.w - 14, 0, 2, 26);
      g.fillStyle = 'rgba(0,0,0,0.16)'; g.fillRect(x0 + 3, 29, p.w, h);
      g.fillStyle = '#1d2230'; g.fillRect(x0, 26, p.w, h);
      g.fillStyle = '#fffdf0'; g.fillRect(x0 + 2, 28, p.w - 4, h - 4);
      g.fillStyle = p.col; g.fillRect(x0 + 2, 28, p.w - 4, 12);
      Font.draw(g, p.top, x0 + p.w / 2, 30, { scale: 1, color: '#fff6e2', align: 'center' });
      Font.draw(g, p.mid, x0 + p.w / 2, 45, { scale: 2, color: p.col, align: 'center' });
      Font.draw(g, p.bot, x0 + p.w / 2, 60, { scale: 1, color: '#6a6458', align: 'center' });
      g.fillStyle = p.col; g.fillRect(x0 + 2, 26 + h - 6, p.w - 4, 4);
    }
  }

  // The stretch you walk in through: doors, a mat, a cooler wall, a basket stack.
  function drawEntrance(g, x, t) {
    if (x > VW + 60 || x < -360) return;
    // the doors behind you
    g.fillStyle = '#2a2f3a'; g.fillRect(x - 60, 120, 118, 190);
    const outside = g.createLinearGradient(0, 124, 0, 306);
    outside.addColorStop(0, '#38415e'); outside.addColorStop(1, '#4c5348');
    g.fillStyle = outside; g.fillRect(x - 56, 124, 110, 182);
    g.fillStyle = 'rgba(255,255,255,0.16)'; g.fillRect(x - 50, 132, 18, 168);
    g.fillStyle = '#7f8b96'; g.fillRect(x - 4, 124, 6, 182);
    g.fillStyle = '#c9581f'; g.fillRect(x - 60, 112, 118, 10);
    FX.pixelText(g, 'IN', x - 1, 113, { color: '#fff', size: 7, ink: false });
    // floor mat
    g.fillStyle = '#4a4f44'; g.fillRect(x - 54, 312, 110, 24);
    g.fillStyle = '#5c6254'; g.fillRect(x - 48, 316, 98, 16);
    // basket stack
    for (let i = 0; i < 4; i++) {
      g.fillStyle = '#1d2230'; g.fillRect(x + 68, 285 - i * 9, 54, 14);
      g.fillStyle = i % 2 ? '#c9581f' : '#d8663a'; g.fillRect(x + 69, 286 - i * 9, 52, 12);
      g.fillStyle = 'rgba(255,255,255,0.24)'; g.fillRect(x + 69, 286 - i * 9, 52, 2);
      g.fillStyle = 'rgba(0,0,0,0.22)'; g.fillRect(x + 69, 294 - i * 9, 52, 4);
    }
    g.fillStyle = '#1d2230'; g.fillRect(x + 66, 258, 58, 13);
    g.fillStyle = '#fffdf0'; g.fillRect(x + 67, 259, 56, 11);
    Font.draw(g, 'BASKETS', x + 95, 261, { scale: 1, color: '#2a2f3a', align: 'center' });
    // the cooler wall
    const cx = x + 140;
    g.fillStyle = '#9aa4ac'; g.fillRect(cx, 118, 180, 192);
    Tex.fill(g, 'freezer', cx, 118, 180, 192, 0.7);
    g.fillStyle = '#5f6a72'; g.fillRect(cx, 118, 180, 8);
    for (let d = 0; d < 3; d++) {
      const dx = cx + 6 + d * 58;
      g.fillStyle = '#27323a'; g.fillRect(dx, 128, 52, 174);
      const cold = g.createLinearGradient(0, 130, 0, 300);
      cold.addColorStop(0, '#cfeaf2'); cold.addColorStop(1, '#8fc0d2');
      g.fillStyle = cold; g.fillRect(dx + 3, 131, 46, 168);
      for (let r = 0; r < 4; r++) {
        g.fillStyle = '#b8c6cc'; g.fillRect(dx + 3, 168 + r * 34, 46, 4);
        for (let b = 0; b < 5; b++) {
          const col = ['#7a9a5a', '#c9581f', '#4a6a9a', '#b8496a', '#d8b23a'][(d + r + b) % 5];
          g.fillStyle = col; g.fillRect(dx + 6 + b * 9, 152 + r * 34, 6, 16);
          g.fillStyle = U.shade(col, 0.35); g.fillRect(dx + 6 + b * 9, 152 + r * 34, 6, 4);
        }
      }
      g.fillStyle = 'rgba(255,255,255,0.3)'; g.fillRect(dx + 8, 134, 8, 160);
      g.fillStyle = '#d8dde0'; g.fillRect(dx + 44, 196, 4, 26);
    }
    sign(g, cx + 90, 104, 'COLD', '#2f6f9f');
  }

  function drawBay(g, b, S) {
    const x0 = b.x - S, w = b.w;
    if (x0 > VW + 40 || x0 + w < -40) return;
    const col = b.sec.color;
    const TOP = 158, BOT = 316;
    // ---- the gondola: a pegboard back between two coloured end caps -------
    g.fillStyle = '#5f5a4e'; g.fillRect(x0 - 14, TOP, w + 28, BOT - TOP + 6);
    g.fillStyle = '#b8b0a0'; g.fillRect(x0 - 10, TOP + 4, w + 20, BOT - TOP - 2);
    Tex.fill(g, 'shelfmet', x0 - 10, TOP + 4, w + 20, BOT - TOP - 2, 0.55);
    g.fillStyle = '#a29a8a'; g.fillRect(x0 - 10, TOP + 4, w + 20, 3);
    for (let py = TOP + 12; py < BOT - 4; py += 7) {              // the pegboard holes
      for (let px = x0 - 6; px < x0 + w + 8; px += 7) {
        g.fillStyle = 'rgba(60,54,44,0.35)'; g.fillRect(px, py, 2, 2);
      }
    }
    for (const ex of [x0 - 14, x0 + w + 4]) {                     // end caps in the section colour
      g.fillStyle = '#3a352c'; g.fillRect(ex, TOP - 4, 10, BOT - TOP + 12);
      g.fillStyle = col; g.fillRect(ex + 1, TOP - 3, 8, BOT - TOP + 10);
      g.fillStyle = U.shade(col, 0.36); g.fillRect(ex + 1, TOP - 3, 8, 3);
      g.fillStyle = U.shade(col, -0.4); g.fillRect(ex + 1, BOT + 4, 8, 3);
      g.fillStyle = U.shade(col, 0.2); g.fillRect(ex + 2, TOP + 10, 2, BOT - TOP - 14);
    }
    // ---- the boards, each with a price rail along the front ---------------
    for (const y of SHELF_Y) {
      g.fillStyle = 'rgba(0,0,0,0.22)'; g.fillRect(x0 - 10, y - 12, w + 20, 12);   // the shadow under it
      g.fillStyle = '#efe9da'; g.fillRect(x0 - 11, y, w + 22, 5);                   // the board
      Tex.fill(g, 'shelfmet', x0 - 11, y, w + 22, 5, 0.3);
      g.fillStyle = '#ffffff'; g.fillRect(x0 - 11, y, w + 22, 2);
      g.fillStyle = '#8e8879'; g.fillRect(x0 - 11, y + 5, w + 22, 4);
      g.fillStyle = col; g.fillRect(x0 - 11, y + 9, w + 22, 4);                     // the price rail
      g.fillStyle = U.shade(col, 0.4); g.fillRect(x0 - 11, y + 9, w + 22, 1);
      for (let i = 0; i < w + 22; i += 24) {                                        // shelf talkers
        g.fillStyle = '#fffdf0'; g.fillRect(x0 - 9 + i, y + 9, 16, 4);
        g.fillStyle = '#b9b3a2'; g.fillRect(x0 - 9 + i, y + 12, 16, 1);
      }
      g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(x0 - 11, y + 13, w + 22, 2);
    }
    g.fillStyle = '#6f6858'; g.fillRect(x0 - 12, BOT, w + 24, 6);                   // the kick plate
    g.fillStyle = '#57513f'; g.fillRect(x0 - 12, BOT + 4, w + 24, 4);
    // ---- what fills the shelves the catalogue does not --------------------
    for (let r = 0; r < 3; r++) for (let c = 0; c < b.cols; c++) {
      if (b.taken[r * b.cols + c]) continue;
      fillShelf(g, x0 + c * COLW - 8, SHELF_Y[r], COLW, r * 7 + c * 13 + Math.round(b.x));
    }
    sign(g, x0 + w / 2, 126, b.sec.name, col, b.sec.sub);
  }

  // Generic stock, in four shapes, so a bare shelf still looks like a shop.
  const STOCK_COL = ['#c9581f', '#3f8f4a', '#2f6f9f', '#b8496a', '#d8b23a', '#7a4f9a'];
  function fillShelf(g, x, y, wide, seed) {
    let i = 0, px = x + 4;
    while (px < x + wide - 8) {
      const s2 = (seed + i * 7) % 4;
      const col = STOCK_COL[(seed + i * 3) % STOCK_COL.length];
      const dk = U.shade(col, -0.42), lt = U.shade(col, 0.36);
      if (s2 === 0) {                                     // a can
        const h = 15;
        g.fillStyle = dk; g.fillRect(px, y - h, 11, h);
        g.fillStyle = col; g.fillRect(px, y - h, 9, h);
        g.fillStyle = lt; g.fillRect(px + 1, y - h + 1, 3, h - 2);
        g.fillStyle = '#d8d2c2'; g.fillRect(px, y - h, 9, 2); g.fillRect(px, y - 3, 9, 2);
        px += 13;
      } else if (s2 === 1) {                              // a bottle
        const h = 20;
        g.fillStyle = dk; g.fillRect(px + 2, y - h, 5, 6);
        g.fillStyle = col; g.fillRect(px, y - h + 6, 9, h - 6);
        g.fillStyle = lt; g.fillRect(px + 1, y - h + 7, 2, h - 8);
        g.fillStyle = '#fffdf0'; g.fillRect(px, y - 10, 9, 5);
        px += 11;
      } else if (s2 === 2) {                              // a box
        const h = 17;
        g.fillStyle = dk; g.fillRect(px, y - h, 14, h);
        g.fillStyle = col; g.fillRect(px, y - h, 12, h);
        g.fillStyle = lt; g.fillRect(px, y - h, 12, 4);
        g.fillStyle = 'rgba(255,255,255,0.6)'; g.fillRect(px + 2, y - h + 6, 8, 3);
        px += 16;
      } else {                                            // a bag, slumped
        const h = 14;
        Art.poly(g, [[px, y], [px + 13, y], [px + 11, y - h + 3], [px + 6, y - h], [px + 2, y - h + 3]], dk);
        Art.poly(g, [[px + 1, y - 1], [px + 12, y - 1], [px + 10, y - h + 4], [px + 6, y - h + 1], [px + 3, y - h + 4]], col);
        g.fillStyle = lt; g.fillRect(px + 3, y - h + 5, 4, 3);
        px += 15;
      }
      i++;
    }
  }

  // Things standing about on the floor between the gondolas.
  function floorProps(g, S, t) {
    const spots = [];
    for (let i = 0; i < bays.length - 1; i++) {
      spots.push((bays[i].x + bays[i].w + bays[i + 1].x) / 2 - 20);
    }
    spots.push(AISLE0 - 96);
    spots.forEach((sx, i) => {
      const x = sx - S;
      if (x < -80 || x > VW + 80) return;
      if (i % 2 === 0) {                                  // a pallet of crates, half unwrapped
        g.fillStyle = 'rgba(0,0,0,0.2)'; Art.ell(g, x + 18, 344, 30, 6);
        g.fillStyle = '#8a6a44'; g.fillRect(x - 4, 336, 44, 7);
        g.fillStyle = '#a3803a'; g.fillRect(x - 4, 336, 44, 2);
        for (let k = 0; k < 3; k++) { g.fillStyle = '#6b5030'; g.fillRect(x - 2 + k * 15, 336, 4, 7); }
        for (let r = 0; r < 2; r++) for (let c = 0; c < 2; c++) {
          const bx = x + c * 20, by = 336 - 17 - r * 17;
          g.fillStyle = '#2a2018'; g.fillRect(bx - 1, by - 1, 20, 18);
          g.fillStyle = '#a8763a'; g.fillRect(bx, by, 18, 16);
          g.fillStyle = '#c08e4a'; g.fillRect(bx, by, 18, 3);
          g.fillStyle = '#7d552a'; g.fillRect(bx, by + 7, 18, 2);
        }
        g.fillStyle = 'rgba(214,236,244,0.14)'; g.fillRect(x - 2, 300, 42, 38);   // the shrink wrap
        g.fillStyle = 'rgba(255,255,255,0.3)'; g.fillRect(x + 4, 300, 2, 38);
      } else {                                            // a dump bin of discount stock
        g.fillStyle = 'rgba(0,0,0,0.2)'; Art.ell(g, x + 20, 346, 30, 6);
        g.fillStyle = '#2a2f3a'; g.fillRect(x - 4, 312, 48, 32);
        g.fillStyle = '#c9581f'; g.fillRect(x - 2, 314, 44, 28);
        g.fillStyle = '#e2762c'; g.fillRect(x - 2, 314, 44, 3);
        g.fillStyle = '#8f3a10'; g.fillRect(x - 2, 338, 44, 4);
        for (let k = 0; k < 7; k++) {                     // what is in it
          const col = STOCK_COL[(k * 3 + i) % STOCK_COL.length];
          g.fillStyle = col;
          g.fillRect(x + 1 + (k % 4) * 10, 308 + (k % 2) * 5, 8, 9);
          g.fillStyle = U.shade(col, 0.34); g.fillRect(x + 1 + (k % 4) * 10, 308 + (k % 2) * 5, 8, 2);
        }
        const blink = Math.floor(t * 3) % 2;
        g.fillStyle = '#0a0810'; g.fillRect(x + 6, 292, 30, 14);
        g.fillStyle = blink ? '#f2cf3a' : '#fffdf0'; g.fillRect(x + 7, 293, 28, 12);
        Font.draw(g, 'SALE', x + 21, 296, { scale: 1, color: '#c02030', align: 'center' });
      }
    });
  }

  // ---- the things a real shop has that nobody looks at ---------------------
  // Cameras, a mirror in the corner, an extinguisher, a staff door, a trolley
  // somebody abandoned, a cone over a spill. None of it does anything; all of
  // it is what makes the room feel like a room. Everything on the wall goes in
  // the gaps between gondolas, so nothing ever lands on a shelf.
  function gaps() {
    const out = [];
    for (let i = 0; i < bays.length - 1; i++) out.push((bays[i].x + bays[i].w + bays[i + 1].x) / 2);
    if (bays.length) out.push(bays[0].x - GAP);
    return out;
  }
  function fixtures(g, S, t) {
    const gp = gaps();
    // cameras, up in the ceiling grid, sweeping
    for (let wx = 396; wx < worldW; wx += 452) {
      const x = wx - S; if (x < -40 || x > VW + 40) continue;
      g.fillStyle = '#6c6759'; g.fillRect(x - 2, 62, 4, 10);
      const sw = Math.sin(t * 0.7 + wx) * 5;
      g.fillStyle = '#3a3f48'; g.fillRect(x - 9 + sw, 72, 18, 9);
      g.fillStyle = '#585e68'; g.fillRect(x - 9 + sw, 72, 18, 3);
      g.fillStyle = '#12161c'; g.fillRect(x + 5 + sw, 74, 5, 5);
      g.fillStyle = Math.floor(t * 2) % 2 ? '#e03a3a' : '#5a1414';
      g.fillRect(x - 7 + sw, 74, 2, 2);
    }
    gp.forEach((wx, i) => {
      const x = wx - S;
      if (x < -120 || x > VW + 120) return;
      if (i % 3 === 0) {
        // a convex security mirror, hung above the gap
        g.fillStyle = '#2a2f3a'; Art.ell(g, x, 148, 27, 27);
        g.fillStyle = '#8d96a0'; Art.ell(g, x, 148, 24, 24);
        const mg = g.createRadialGradient(x - 7, 141, 3, x, 148, 26);
        mg.addColorStop(0, 'rgba(240,246,250,0.9)'); mg.addColorStop(1, 'rgba(90,104,120,0.9)');
        g.fillStyle = mg; Art.ell(g, x, 148, 22, 22);
        g.fillStyle = 'rgba(255,255,255,0.55)'; Art.ell(g, x - 8, 140, 6, 4);
        g.fillStyle = '#6c6759'; g.fillRect(x - 2, 122, 4, 8);
        // a wet-floor cone under it
        g.fillStyle = 'rgba(0,0,0,0.2)'; Art.ell(g, x, 344, 16, 4);
        Art.poly(g, [[x - 11, 344], [x + 11, 344], [x + 5, 312], [x - 5, 312]], '#d8b23a');
        Art.poly(g, [[x - 11, 344], [x - 4, 344], [x - 1, 312], [x - 5, 312]], '#f2cf62');
        g.fillStyle = '#a8861c'; g.fillRect(x - 9, 336, 18, 3);
        g.fillStyle = '#2a2f3a'; g.fillRect(x - 7, 320, 14, 10);
      } else if (i % 3 === 1) {
        // a staff door, with the extinguisher beside it
        g.fillStyle = '#5a5448'; g.fillRect(x - 28, 150, 56, 162);
        g.fillStyle = '#7f7869'; g.fillRect(x - 25, 153, 50, 156);
        Tex.fill(g, 'shelfmet', x - 25, 153, 50, 156, 0.5);
        g.fillStyle = '#5a5448'; g.fillRect(x - 25, 153, 50, 3);
        g.fillStyle = '#c9c2ad'; g.fillRect(x - 22, 172, 44, 16);
        Font.draw(g, 'STAFF', x, 175, { scale: 1, color: '#3a3f48', align: 'center' });
        g.fillStyle = '#3a3f48'; g.fillRect(x + 14, 236, 8, 4);
        g.fillStyle = 'rgba(0,0,0,0.22)'; g.fillRect(x - 28, 309, 56, 4);
        const fx = x - 44;
        g.fillStyle = '#6c6759'; g.fillRect(fx - 2, 206, 4, 44);
        g.fillStyle = '#8f1e18'; g.fillRect(fx - 7, 212, 14, 34);
        g.fillStyle = '#c02c22'; g.fillRect(fx - 6, 213, 12, 32);
        g.fillStyle = '#e05a4a'; g.fillRect(fx - 6, 213, 4, 32);
        g.fillStyle = '#2a2f3a'; g.fillRect(fx - 4, 206, 8, 7);
        g.fillStyle = '#d8d2c0'; g.fillRect(fx - 6, 224, 12, 6);
      } else {
        // a trolley somebody left standing in the gap
        g.fillStyle = 'rgba(0,0,0,0.2)'; Art.ell(g, x + 2, 346, 26, 5);
        g.fillStyle = '#8d96a0'; g.fillRect(x - 20, 300, 44, 4);
        g.fillStyle = '#aab4bc';
        for (let k = 0; k < 7; k++) g.fillRect(x - 19 + k * 6, 300, 2, 30);
        for (let k = 0; k < 4; k++) g.fillRect(x - 20, 302 + k * 8, 44, 2);
        g.fillStyle = '#7f8b96'; g.fillRect(x + 22, 278, 3, 56);
        g.fillStyle = '#c9581f'; g.fillRect(x + 8, 276, 20, 4);
        g.fillStyle = '#2a2f3a'; Art.ell(g, x - 16, 342, 4, 4); Art.ell(g, x + 18, 342, 4, 4);
        // and a rack of papers against the wall behind it
        g.fillStyle = '#5a5448'; g.fillRect(x - 62, 240, 34, 70);
        g.fillStyle = '#8d8577'; g.fillRect(x - 60, 242, 30, 66);
        for (let k = 0; k < 3; k++) {
          g.fillStyle = '#efe9da'; g.fillRect(x - 58, 246 + k * 22, 26, 18);
          g.fillStyle = ['#c9581f', '#2f6f9f', '#3f8f4a'][k]; g.fillRect(x - 58, 246 + k * 22, 26, 5);
          g.fillStyle = '#b9b3a2'; g.fillRect(x - 56, 254 + k * 22, 22, 1); g.fillRect(x - 56, 257 + k * 22, 16, 1);
        }
      }
    });
    // floor markings down the middle of the aisle
    for (let wx = -60; wx < worldW + 60; wx += 60) {
      const x = wx - S; if (x < -60 || x > VW + 60) continue;
      g.fillStyle = 'rgba(216,178,58,0.3)'; g.fillRect(x, 347, 34, 3);
    }
  }

  // ---- the prize machine ---------------------------------------------------
  // A capsule machine by the till. Put a coin in, the drum turns, something
  // falls out. It is the only thing in the shop that can hand you a trophy.
  function drawGacha(g, S, t) {
    const x = gacha.x - S;
    gachaR = { x: x - 26, y: 168, w: 52, h: 148 };
    if (x < -70 || x > VW + 70) { gachaR = null; return; }
    const sh = gacha.shake > 0 ? Math.sin(t * 60) * gacha.shake : 0;
    g.save(); g.translate(sh, 0);
    g.fillStyle = 'rgba(0,0,0,0.22)'; Art.ell(g, x, 318, 30, 6);
    // the pedestal
    g.fillStyle = '#2a2f3a'; g.fillRect(x - 22, 256, 44, 60);
    g.fillStyle = '#c9581f'; g.fillRect(x - 20, 258, 40, 56);
    Tex.fill(g, 'shelfmet', x - 20, 258, 40, 56, 0.32);
    g.fillStyle = '#e2762c'; g.fillRect(x - 20, 258, 40, 3);
    g.fillStyle = '#8f3a10'; g.fillRect(x - 20, 310, 40, 4);
    // the coin slot and the knob
    g.fillStyle = '#1d2230'; g.fillRect(x - 12, 266, 24, 16);
    g.fillStyle = '#d8b23a'; g.fillRect(x - 9, 269, 18, 3);
    g.fillStyle = '#8d96a0'; Art.ell(g, x, 290, 8, 8);
    g.fillStyle = '#c9c2ad'; Art.ell(g, x, 290, 6, 6);
    g.save(); g.translate(x, 290); g.rotate(gacha.spin * 3.4);
    g.fillStyle = '#3a3f48'; g.fillRect(-1.5, -5, 3, 10);
    g.restore();
    // the delivery flap
    g.fillStyle = '#1d2230'; g.fillRect(x - 14, 296, 28, 14);
    g.fillStyle = '#3a3f48'; g.fillRect(x - 12, 298, 24, 10);
    // the glass drum, full of capsules
    g.fillStyle = '#2a2f3a'; Art.ell(g, x, 224, 27, 30);
    g.fillStyle = '#cfe4ee'; Art.ell(g, x, 224, 24, 27);
    const r = Art.rng(7);
    for (let i = 0; i < 22; i++) {
      const a = r() * TAU + gacha.spin * 2, d = r();
      const cxp = x + Math.cos(a) * 17 * d, cyp = 224 + Math.sin(a) * 19 * d + (gacha.spin ? Math.sin(t * 24 + i) * 2 : 0);
      const col = ['#c9581f', '#3f8f4a', '#2f6f9f', '#b8496a', '#d8b23a', '#7a4f9a'][i % 6];
      Art.ell(g, cxp, cyp, 4.4, 4.4, col);
      Art.ell(g, cxp - 1.2, cyp - 1.4, 1.8, 1.4, U.shade(col, 0.45));
    }
    g.fillStyle = 'rgba(255,255,255,0.4)'; Art.ell(g, x - 9, 214, 6, 9);
    g.fillStyle = 'rgba(120,150,170,0.2)'; Art.ell(g, x, 224, 24, 27);
    g.fillStyle = '#8d96a0'; Art.ell(g, x, 250, 26, 7);
    // the header card
    g.fillStyle = '#1d2230'; g.fillRect(x - 30, 172, 60, 32);
    g.fillStyle = '#f2cf3a'; g.fillRect(x - 28, 174, 56, 28);
    Font.draw(g, 'PRIZE', x, 178, { scale: 1, color: '#7a3a10', align: 'center' });
    Font.draw(g, U.fmt(PRIZE_COST) + ' W$', x, 190, { scale: 1, color: '#7a3a10', align: 'center' });
    g.restore();
    // what just came out, floating up
    if (gacha.showT > 0 && gacha.prize) {
      const k = 1 - gacha.showT / 2.2;
      const py = 300 - k * 90;
      g.globalAlpha = Math.min(1, gacha.showT * 2);
      Art.ell(g, x, py, 13, 13, '#f2cf3a');
      Art.ell(g, x, py, 11, 11, '#fff0b8');
      Icons.blit(g, gacha.prize.icon, x - 9, py - 9, 1.1);
      g.globalAlpha = 1;
    }
  }
  function spinGacha() {
    if (gacha.spin > 0) return;
    if (G.wd < PRIZE_COST) { Audio.play('error'); UI.toast('not enough for the machine', 'bad'); return; }
    G.wd -= PRIZE_COST; G.spins = (G.spins || 0) + 1;
    gacha.spin = 1; gacha.shake = 2;
    Audio.play('coin'); Audio.play('whoosh');
    UI.refreshHUD();
  }
  function award(p) {
    const say = (txt, kind) => UI.toast(txt, kind);
    if (p.key === 'seed') { const c = U.pick(CROPS.slice(0, 5)); G.seeds[c.key] = (G.seeds[c.key] || 0) + 6; say(`${p.name} &middot; <b>6 ${c.name}</b>`, 'good'); }
    else if (p.key === 'coin') { const n = 120 + Math.floor(Math.random() * 180); G.wd += n; FX.coinBurst(gacha.x - scroll, 300, 5); say(`${p.name} &middot; <b>${U.fmt(n)} W$</b>`, 'good'); }
    else if (p.key === 'purse') { const n = 900 + Math.floor(Math.random() * 1400); G.wd += n; FX.coinBurst(gacha.x - scroll, 300, 9); say(`${p.name} &middot; <b>${U.fmt(n)} W$</b>`, 'good'); }
    else if (p.key === 'blessed') { const k = U.pick(OFFER_ORDER.slice(0, 5)); G.blessed[k] = (G.blessed[k] || 0) + 1; say(`${p.name} &middot; <b>blessed ${OFFERINGS[k].name}</b>`, 'good'); }
    else if (p.key === 'trophy') {
      G.trophies = (G.trophies || 0) + 1;
      say(`<b>GOLDEN WOMBAT</b> &middot; every stack tips +8%`, 'good');
      FX.confettiBurst(VW / 2, 120, 120); FX.flash('rgba(242,207,58,0.45)', 0.4); Audio.play('record');
    } else {
      const n = p.key === 'plain' ? 3 : p.key === 'rich' ? 2 : 1;
      G.offerings[p.key] = (G.offerings[p.key] || 0) + n;
      say(`${p.name}`, 'good');
    }
    Audio.play(p.tier >= 2 ? 'chime' : 'pop');
    if (p.tier >= 2) { FX.comic(VW / 2, 150, p.tier >= 3 ? 'JACKPOT' : 'RARE!', { ink: FX.COMIC_INK.pow, life: 1.1 }); }
    UI.refreshHUD(); UI.refreshTray();
    Main.save();
  }

  // A hanging aisle plaque, the thing that makes a shop legible at a glance.
  function sign(g, cx, cy, text, color, sub) {
    const w = Math.max(80, Math.max(Font.width(text, 2), sub ? Font.width(sub.toUpperCase(), 1) : 0) + 24);
    g.fillStyle = '#8e8a7c'; g.fillRect(cx - w / 2 + 8, cy - 24, 3, 12); g.fillRect(cx + w / 2 - 11, cy - 24, 3, 12);
    g.fillStyle = '#1d2230'; g.fillRect(cx - w / 2 - 2, cy - 14, w + 4, 36);
    g.fillStyle = color; g.fillRect(cx - w / 2, cy - 12, w, 32);
    g.fillStyle = U.shade(color, 0.28); g.fillRect(cx - w / 2, cy - 12, w, 4);
    g.fillStyle = U.shade(color, -0.3); g.fillRect(cx - w / 2, cy + 16, w, 4);
    Font.draw(g, text, cx, cy - 7, { scale: 2, color: '#fffdf0', align: 'center', shadow: U.shade(color, -0.5) });
    if (sub) Font.draw(g, sub.toUpperCase(), cx, cy + 8, { scale: 1, color: U.shade(color, 0.62), align: 'center' });
  }

  // A shelf-edge price label. Big enough to read at a glance, short enough to
  // leave the shelf below it clear; the name and blurb live in the hover card.
  function tag(g, x, y, p, hot) {
    const owned = p.sold, locked = p.locked;
    const txt = owned ? 'OWNED' : locked ? 'LOCKED' : String(priceOf(p, countOf(p.id)));
    const big = !owned && !locked;
    const w = Math.max(34, Font.width(txt, big ? 2 : 1) + 14);
    const lx = Math.round(x - w / 2);
    g.fillStyle = 'rgba(0,0,0,0.2)'; g.fillRect(lx + 2, y + 2, w, 18);
    g.fillStyle = hot ? '#f0cd52' : '#fffdf0'; g.fillRect(lx, y, w, 18);
    g.fillStyle = hot ? '#a0791a' : '#b9b3a2'; g.fillRect(lx, y + 16, w, 2);
    g.fillStyle = locked ? '#8e8879' : owned ? '#3f8f4a' : '#c9581f'; g.fillRect(lx, y, 4, 18);
    Font.draw(g, txt, x + 2, y + (big ? 2 : 5), { scale: big ? 2 : 1, align: 'center',
      color: locked ? '#8e8879' : owned ? '#3f8f4a' : '#2a2f3a' });
  }

  function drawCounter(g, cx, t) {
    if (cx > VW + 160 || cx < -420) return;
    // back bar: cigarettes-and-lottery wall, slushie machine, hot case
    g.fillStyle = '#cfcabb'; g.fillRect(cx - 10, 120, 300, 180);
    g.fillStyle = '#bdb7a6'; g.fillRect(cx - 10, 120, 300, 5);
    for (let r = 0; r < 3; r++) {
      g.fillStyle = '#e4dfd0'; g.fillRect(cx - 6, 150 + r * 36, 150, 4);
      for (let i = 0; i < 9; i++) {
        const col = ['#c9581f', '#3f8f4a', '#2f6f9f', '#b8496a'][(r + i) % 4];
        g.fillStyle = col; g.fillRect(cx + 2 + i * 16, 132 + r * 36, 12, 18);
        g.fillStyle = U.shade(col, 0.3); g.fillRect(cx + 2 + i * 16, 132 + r * 36, 12, 5);
      }
    }
    // slushie machine
    const sx = cx + 168;
    g.fillStyle = '#8e8a7c'; g.fillRect(sx, 150, 66, 74);
    for (let i = 0; i < 2; i++) {
      const col = i ? '#c9581f' : '#5f57b8';
      g.fillStyle = '#d8e2e6'; g.fillRect(sx + 6 + i * 32, 156, 24, 40);
      g.fillStyle = col; g.fillRect(sx + 8 + i * 32, 160 + Math.sin(t * 2 + i) * 1.5, 20, 34);
      g.fillStyle = U.shade(col, 0.4); g.fillRect(sx + 8 + i * 32, 160 + Math.sin(t * 2 + i) * 1.5, 20, 4);
      g.fillStyle = '#3a3f48'; g.fillRect(sx + 14 + i * 32, 198, 8, 8);
    }
    g.fillStyle = '#2a2f3a'; g.fillRect(sx, 142, 66, 9);
    FX.pixelText(g, 'SLUSH', sx + 33, 143, { color: '#fff', size: 7, ink: false });
    // the impulse rack at the end of the belt, where the sweets live
    const ix = cx - 38;
    g.fillStyle = 'rgba(0,0,0,0.2)'; Art.ell(g, ix, 340, 20, 5);
    g.fillStyle = '#2a2f3a'; g.fillRect(ix - 17, 252, 34, 86);
    g.fillStyle = '#8d8577'; g.fillRect(ix - 15, 254, 30, 82);
    Tex.fill(g, 'shelfmet', ix - 15, 254, 30, 82, 0.4);
    for (let r = 0; r < 4; r++) {
      g.fillStyle = '#efe9da'; g.fillRect(ix - 15, 274 + r * 18, 30, 3);
      for (let k = 0; k < 3; k++) {
        const col = ['#c9581f', '#3f8f4a', '#b8496a', '#d8b23a', '#7a4f9a'][(r * 3 + k) % 5];
        g.fillStyle = col; g.fillRect(ix - 13 + k * 10, 262 + r * 18, 8, 12);
        g.fillStyle = U.shade(col, 0.4); g.fillRect(ix - 13 + k * 10, 262 + r * 18, 8, 3);
      }
    }
    g.fillStyle = '#c9581f'; g.fillRect(ix - 17, 244, 34, 9);
    FX.pixelText(g, 'TREATS', ix, 245, { color: '#fff', size: 7, ink: false });
    // a queue post with a belt across it
    const qx = cx - 86;
    g.fillStyle = 'rgba(0,0,0,0.2)'; Art.ell(g, qx, 342, 12, 4);
    g.fillStyle = '#3a3f48'; Art.ell(g, qx, 338, 10, 4);
    g.fillStyle = '#8d96a0'; g.fillRect(qx - 2, 282, 4, 58);
    g.fillStyle = '#aab4bc'; g.fillRect(qx - 2, 282, 1.6, 58);
    g.fillStyle = '#3a3f48'; g.fillRect(qx - 5, 276, 10, 8);
    g.fillStyle = '#c9581f'; g.fillRect(qx + 5, 279, 44, 4);
    g.fillStyle = '#e2762c'; g.fillRect(qx + 5, 279, 44, 1.4);
    // a rubber plant in the corner, because every shop has one
    const px = cx + 248;
    g.fillStyle = '#8a5a3a'; g.fillRect(px - 12, 296, 24, 26);
    g.fillStyle = '#a87048'; g.fillRect(px - 12, 296, 24, 4);
    g.fillStyle = '#6b4530'; g.fillRect(px - 12, 318, 24, 4);
    for (let i = 0; i < 7; i++) {
      const a2 = -Math.PI / 2 + (i - 3) * 0.34, L = 30 + (i % 3) * 9;
      const lx2 = px + Math.cos(a2) * L, ly2 = 296 + Math.sin(a2) * L;
      Art.limb(g, px, 296, lx2, ly2, 3, 1.4, '#2f6b34');
      Art.ell(g, lx2, ly2, 9, 6, '#3f8f4a');
      Art.ell(g, lx2 - 2, ly2 - 2, 5, 3.2, '#5fb05c');
    }
    // counter body: tiled front, a pale top, a kick rail and the house stripe
    g.fillStyle = '#b3ad9c'; g.fillRect(cx, 288, 250, 44);
    for (let r = 0; r < 3; r++) for (let i = 0; i < 13; i++) {          // little square tiles
      const tx2 = cx + 2 + i * 19 + (r % 2 ? 9 : 0), ty2 = 296 + r * 12;
      g.fillStyle = (i + r) % 3 ? '#cfc8b6' : '#dfd8c4'; g.fillRect(tx2, ty2, 17, 10);
      g.fillStyle = 'rgba(255,255,255,0.4)'; g.fillRect(tx2, ty2, 17, 2);
    }
    g.fillStyle = '#efeade'; g.fillRect(cx - 4, 282, 258, 9);           // the countertop lip
    g.fillStyle = 'rgba(255,255,255,0.7)'; g.fillRect(cx - 4, 282, 258, 2);
    g.fillStyle = '#9a9484'; g.fillRect(cx - 4, 289, 258, 3);
    g.fillStyle = '#c9581f'; g.fillRect(cx, 292, 250, 4);
    g.fillStyle = '#9a9484'; g.fillRect(cx, 326, 250, 6);
    g.fillStyle = '#74705f'; g.fillRect(cx, 332, 250, 4);
    // a floor decal telling you where to stand
    g.fillStyle = 'rgba(201,88,31,0.5)'; g.fillRect(cx - 66, 342, 56, 3);
    Font.draw(g, 'WAIT HERE', cx - 38, 346, { scale: 1, color: 'rgba(122,108,86,0.8)', align: 'center' });
    // card reader on a stalk
    g.fillStyle = '#3d434e'; g.fillRect(cx + 214, 268, 20, 18);
    g.fillStyle = '#8ad0a0'; g.fillRect(cx + 217, 271, 14, 8);
    g.fillStyle = '#5a6069'; g.fillRect(cx + 222, 280, 4, 6);
    // register
    g.fillStyle = '#3d434e'; g.fillRect(cx + 108, 252, 52, 32);
    g.fillStyle = '#525965'; g.fillRect(cx + 108, 252, 52, 6);
    g.fillStyle = '#8ad0a0'; g.fillRect(cx + 114, 258, 40, 13);
    FX.pixelText(g, till > 0 ? 'TA!' : 'W$', cx + 134, 260, { color: '#1d3324', size: 7, ink: false });
    for (let i = 0; i < 3; i++) { g.fillStyle = '#d8d2c2'; g.fillRect(cx + 114 + i * 14, 275, 10, 5); }
    // lollipop jar and a hot-dog roller
    Art.rect(g, cx + 14, 256, 24, 28, 'rgba(210,236,244,0.6)');
    for (let i = 0; i < 6; i++) Art.ell(g, cx + 20 + (i % 3) * 7, 266 + (i % 2) * 8, 4, 4, ['#e8708a', '#f5cd5c', '#79dced'][i % 3]);
    Art.rect(g, cx + 14, 250, 24, 7, '#c9581f');
    g.fillStyle = '#8e8a7c'; g.fillRect(cx + 46, 262, 56, 22);
    for (let i = 0; i < 4; i++) { g.fillStyle = '#a8663a'; g.fillRect(cx + 50 + i * 13, 266 + Math.sin(t * 3 + i) * 1, 10, 5); }
    g.fillStyle = '#d8d2c2'; g.fillRect(cx + 46, 258, 56, 5);
    // receipt
    if (till > 0) {
      const h = U.clamp((2 - till) * 40, 0, 48);
      g.fillStyle = '#fffdf0'; g.fillRect(cx + 128, 252 - h, 14, h);
      g.fillStyle = '#b9b3a2'; for (let y = 4; y < h; y += 6) g.fillRect(cx + 130, 252 - h + y, 10, 1);
    }
    keeperWombat(g, cx, t);
    sign(g, cx + 120, 104, 'PAY HERE', '#b8412c', 'ask Shaz');
  }

  // ---- Shaz, on the till ---------------------------------------------------
  // Nineteen years at this counter and she has never once let a customer leave
  // without a wombat fact. She stands at the right-hand end, where the till is.
  const SHAZ_LINES = [
    'Did you know a wombat does square poos? Square!',
    'Three sets of them out the back. I feed them chips.',
    'They can run twenty-five k an hour. Twenty-five!',
    'My Kevin says I talk about them too much. Kevin is wrong.',
    'Backwards into the burrow, see, so the bum blocks the door.',
    'That bum is cartilage. Solid as a dinner plate.',
    'A joey stays in the pouch six months. Six!',
    'Pouch faces backwards so the dirt does not go in. Clever.',
    'I have named every one on the Flat. There are forty-one.',
    'They chew a hundred and fifty times a minute, love.',
    'One came in here in ninety-eight. Knocked over the cordial.',
    'A wombat can live thirty years. Longer than my marriage.',
    'Their teeth never stop growing. Never!',
    'You have the look of a wombat person. I can always tell.',
    'Two hearts? No, that is the octopus. Sorry.',
    'Sold out of wombat mugs. Bloke bought the lot.',
    'They dig eight metres in a night. Eight metres!',
    'Hairy-nosed, bare-nosed. I prefer the bare, myself.',
    'The square poo is so it does not roll off the rock. Genius.',
    'I have a tattoo. I will not show you where.',
  ];
  const shaz = { t: 0, line: 0, said: 0, pose: 'idle', poseT: 0 };
  let keeperR = null;
  function shazTick(dt) {
    shaz.t += dt;
    shaz.said -= dt;
    if (shaz.poseT > 0) { shaz.poseT -= dt; if (shaz.poseT <= 0) shaz.pose = 'idle'; }
    if (shaz.said <= 0 && phase === 'aisle') {
      shaz.said = 5.5 + Math.random() * 3.5;
      shaz.line = (shaz.line + 1 + Math.floor(Math.random() * 3)) % SHAZ_LINES.length;
      shaz.pose = 'talk'; shaz.poseT = 3.4;
    }
  }
  function keeperWombat(g, cx, t) {
    const n = basket.length;
    const wx = cx + 198, wy = 302;
    const hot = keeperHot;
    keeperR = { x: wx - 34, y: wy - 92, w: 68, h: 86 };
    const pose = till > 0 ? 'wave' : hot ? 'happy' : n ? 'happy' : shaz.pose;
    const rate = pose === 'talk' ? 7 : pose === 'wave' ? 9 : 2.4;
    const img = Sprites.cashier(Math.floor(shaz.t * rate), pose);
    const sc = 1.2, w = img.width * sc, h = img.height * sc;
    const bob = Math.sin(shaz.t * 1.6) * 1.2;
    g.drawImage(img, Math.round(wx - w / 2), Math.round(wy - h + bob), Math.round(w), Math.round(h));
    // her mug, parked on the counter beside her
    const mx = wx - 40;
    g.fillStyle = '#1d2230'; g.fillRect(mx - 7, 268, 14, 15);
    g.fillStyle = '#d8d2c2'; g.fillRect(mx - 6, 269, 12, 13);
    g.fillStyle = '#8a6a3a'; g.fillRect(mx - 6, 269, 12, 3);
    Art.ell(g, mx + 8, 275, 3.4, 3.4, '#d8d2c2');
    Art.ell(g, mx + 8, 275, 1.8, 1.8, '#efe9da');
    if (Math.sin(t * 2) > 0.4) { g.fillStyle = 'rgba(255,255,255,0.3)'; g.fillRect(mx - 2, 262 - (t * 8) % 6, 2, 4); }
    // what she is saying, which is always about wombats
    const by = wy - h + bob - 6;
    if (till > 0) bubble(g, wx, by, 'TA, LOVE!', '#3f8f4a', '#dff5d8');
    else if (n) bubble(g, wx, by, `${total()} W$`, '#c9581f', '#fff0dc');
    else if (shaz.pose === 'talk') chatBubble(g, wx, by, SHAZ_LINES[shaz.line]);
    else if (hot) bubble(g, wx, by, 'G\'DAY', '#2f6f9f', '#d8ecff');
    if (n && !till) {
      const a = 0.5 + 0.5 * Math.sin(t * 5);
      Font.draw(g, 'CLICK HER', wx, wy + 16, { scale: 1, color: `rgba(245,205,92,${a.toFixed(2)})`, align: 'center', shadow: '#2a1608' });
    }
    if (hot) {
      g.strokeStyle = '#f5cd5c'; g.lineWidth = 1;
      g.setLineDash([4, 3]); g.lineDashOffset = -t * 10;
      g.strokeRect(keeperR.x + 0.5, keeperR.y + 0.5, keeperR.w - 1, keeperR.h - 1);
      g.setLineDash([]);
    }
  }
  // her running commentary: a plain white box, wrapped, with a tail
  function chatBubble(g, x, y, text) {
    const lines = Font.wrap(text, 156, 1);
    const w = Math.max(60, Math.max(...lines.map((l) => Font.width(l, 1))) + 14);
    const h = lines.length * 11 + 9;
    const bx = U.clamp(x - w * 0.66, 4, VW - w - 4);
    g.fillStyle = '#0a0810'; g.fillRect(bx - 2, y - h - 2, w + 4, h + 4);
    g.fillStyle = '#fffdf0'; g.fillRect(bx, y - h, w, h);
    g.fillStyle = '#c9c2ad'; g.fillRect(bx, y - 4, w, 4);
    Art.poly(g, [[x - 5, y], [x + 6, y], [x + 1, y + 8]], '#0a0810');
    Art.poly(g, [[x - 4, y - 1], [x + 5, y - 1], [x + 1, y + 6]], '#fffdf0');
    lines.forEach((l, i) => Font.draw(g, l, bx + 7, y - h + 5 + i * 11, { scale: 1, color: '#2a2f3a' }));
  }

  function bubble(g, x0, y, text, col, ink) {
    const w = Font.width(text, 2) + 16, h = 20;
    const x = U.clamp(x0, w / 2 + 6, VW - w / 2 - 6);
    g.fillStyle = '#0a0810'; g.fillRect(x - w / 2 - 2, y - h - 2, w + 4, h + 4);
    g.fillStyle = col; g.fillRect(x - w / 2, y - h, w, h);
    g.fillStyle = U.shade(col, 0.35); g.fillRect(x - w / 2, y - h, w, 3);
    Art.poly(g, [[x - 5, y], [x + 5, y], [x, y + 7]], '#0a0810');
    Art.poly(g, [[x - 4, y - 1], [x + 4, y - 1], [x, y + 5]], col);
    Font.draw(g, text, x, y - h + 6, { scale: 2, color: ink, align: 'center', shadow: U.shade(col, -0.5) });
  }

  return {
    init(g) { G = g; }, open, enter, leave, update, render, press, move, release, hover: hoverAt, wheel,
    add, addById, removeOne, removeLine, clear, checkout, total, lines, layout, catalogue,
    get gachaHit() { return gachaR; },
    get shazTalking() { return shaz.pose === 'talk'; },
    setScroll(f) { tscroll = (worldW - VW) * U.clamp(f, 0, 1); scroll = tscroll; },
    get basket() { return basket; }, get phase() { return phase; }, get worldW() { return worldW; },
  };
})();
