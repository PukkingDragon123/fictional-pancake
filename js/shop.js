// ---- Wombat Mart: a lit convenience store with signed aisles --------------
const Shop = (() => {
  let G = null;
  const VW = 640, VH = 360;
  const cache = new Map();
  let phase = 'door', pt = 0, scroll = 0, tscroll = 0, till = 0, hover = null;
  let drag = null, moved = 0, keeper = { t: 0, pose: 'idle' };
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
  const SHELF_Y = [176, 234, 292];        // board tops, three to a gondola
  const COLW = 96;                        // one product slot
  const AISLE0 = 470;                     // the doors and the cooler take the first stretch
  const GAP = 64;                         // between gondolas
  let slots = [], bays = [], counterX = 1200, worldW = 1500;

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
  }

  // ---- basket -------------------------------------------------------------
  function countOf(id) { return basket.filter((b) => b === id).length; }
  function priceOf(p, extra = 0) {
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
      return { p, n: o.n, sum };
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
    phase = 'door'; pt = 0; scroll = 0; tscroll = 0; till = 0; hover = null;
    basket.length = 0; flies.length = 0;
    if (!motes.length) { const r = Art.rng(99); for (let i = 0; i < 24; i++) motes.push({ x: r() * VW, y: r() * VH, ph: r() * TAU }); }
    Audio.setMode('pen');
    Audio.play('door');
    UI.refreshBasket();
  }
  function leave() { Main.setMode('map'); }

  function update(dt) {
    pt += dt;
    if (phase === 'door' && pt > 2.4) { phase = 'aisle'; pt = 0; }
    scroll = U.lerp(scroll, tscroll, 1 - Math.pow(0.0015, dt));
    keeper.t += dt;
    if (till > 0) { till -= dt; if (till <= 0) keeper.pose = 'idle'; }
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
    if (phase !== 'aisle') { phase = 'aisle'; pt = 0; return; }
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
    if (overCounter(x) && y > 150) { UI.openBasket(); Audio.play('click'); return; }
  }
  function hoverAt(x, y) {
    if (phase !== 'aisle') return null;
    const s = slotAt(x, y);
    hover = s;
    if (!s) return overCounter(x) && y > 150 ? '<b>Checkout</b><br>pay for the basket' : null;
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
    if (phase === 'door') { renderFront(g); return; }
    renderRoom(g);
  }

  // The storefront: a lit box at dusk, glass all along the front, automatic
  // doors sliding apart while the camera walks in.
  function renderFront(g) {
    const k = U.clamp(pt / 2.4, 0, 1);
    const zoom = 1 + U.easeIn(k) * 2.8;
    const slide = U.easeOut(U.clamp((pt - 0.5) / 0.9, 0, 1));
    const dusk = g.createLinearGradient(0, 0, 0, VH);
    dusk.addColorStop(0, '#161d33'); dusk.addColorStop(0.7, '#2e3550'); dusk.addColorStop(1, '#3c4038');
    g.fillStyle = dusk; g.fillRect(0, 0, VW, VH);
    for (let i = 0; i < 40; i++) { g.fillStyle = 'rgba(255,255,255,0.5)'; g.fillRect((i * 137) % VW, (i * 61) % 90, 1, 1); }

    g.save();
    g.translate(VW / 2, 250); g.scale(zoom, zoom); g.translate(-VW / 2, -250);

    // the lot
    g.fillStyle = '#3a3a40'; g.fillRect(0, 250, VW, VH - 250);
    g.fillStyle = '#4a4a52'; g.fillRect(0, 250, VW, 3);
    for (let i = 0; i < 7; i++) { g.fillStyle = 'rgba(240,236,200,0.35)'; g.fillRect(30 + i * 90, 296, 44, 3); }

    const bx = 150, by = 96, bw = 340, bh = 154;
    // body
    g.fillStyle = '#e9e4d6'; g.fillRect(bx, by, bw, bh);
    g.fillStyle = '#d6d0c0'; g.fillRect(bx, by + bh - 10, bw, 10);
    // the house band: orange, green, red, the way every mart on earth is striped
    g.fillStyle = '#c9581f'; g.fillRect(bx, by, bw, 9);
    g.fillStyle = '#3f8f4a'; g.fillRect(bx, by + 9, bw, 9);
    g.fillStyle = '#b8412c'; g.fillRect(bx, by + 18, bw, 5);
    // parapet and sign box
    g.fillStyle = '#f4f0e4'; g.fillRect(bx - 8, by - 26, bw + 16, 28);
    g.fillStyle = '#cfc8b6'; g.fillRect(bx - 8, by - 4, bw + 16, 6);
    g.fillStyle = '#2a2f3a'; g.fillRect(bx + 40, by - 22, bw - 80, 20);
    const buzz = 0.85 + 0.15 * Math.sin(pt * 30);
    g.globalAlpha = buzz;
    FX.pixelText(g, 'WOMBAT MART', bx + bw / 2, by - 18, { color: '#f6f2e2', size: 11, ink: 3, inkColor: '#1a2030' });
    g.globalAlpha = 1;
    g.fillStyle = '#3f8f4a'; g.fillRect(bx + 22, by - 20, 14, 16);
    g.fillStyle = '#c9581f'; g.fillRect(bx + bw - 36, by - 20, 14, 16);

    // glass front, lit from inside
    const glass = g.createLinearGradient(0, by + 26, 0, by + bh - 12);
    glass.addColorStop(0, 'rgba(255,246,214,0.95)'); glass.addColorStop(1, 'rgba(226,214,176,0.9)');
    g.fillStyle = '#2a2f3a'; g.fillRect(bx + 10, by + 26, bw - 20, bh - 38);
    g.fillStyle = glass; g.fillRect(bx + 14, by + 30, bw - 28, bh - 46);
    // shelving seen through the window
    for (let i = 0; i < 3; i++) {
      g.fillStyle = 'rgba(120,104,74,0.4)'; g.fillRect(bx + 22, by + 52 + i * 24, 120, 4);
      for (let k2 = 0; k2 < 6; k2++) { g.fillStyle = ['#7a9a5a', '#c9581f', '#4a6a9a', '#b8496a'][(i + k2) % 4]; g.fillRect(bx + 26 + k2 * 19, by + 42 + i * 24, 11, 10); }
    }
    // posters
    g.fillStyle = '#d8402c'; g.fillRect(bx + 250, by + 44, 34, 26);
    FX.pixelText(g, 'SALE', bx + 267, by + 52, { color: '#fff', size: 7, ink: false });
    g.fillStyle = '#2f6f9f'; g.fillRect(bx + 292, by + 44, 34, 26);
    FX.pixelText(g, 'OPEN', bx + 309, by + 52, { color: '#fff', size: 7, ink: false });
    // mullions
    g.fillStyle = '#2a2f3a';
    for (let x2 = bx + 14; x2 < bx + bw - 14; x2 += 58) g.fillRect(x2, by + 30, 4, bh - 46);

    // the automatic doors, sliding apart
    const dW = 92, dX = bx + bw / 2 - dW / 2, dY = by + 34, dH = bh - 50;
    g.fillStyle = '#1d2230'; g.fillRect(dX - 4, dY - 4, dW + 8, dH + 8);
    // what you can see through the opening
    g.save();
    g.beginPath(); g.rect(dX, dY, dW, dH); g.clip();
    const inner = g.createLinearGradient(0, dY, 0, dY + dH);
    inner.addColorStop(0, '#fffbe8'); inner.addColorStop(1, '#e6d9b4');
    g.fillStyle = inner; g.fillRect(dX, dY, dW, dH);
    g.fillStyle = '#c9bd9a'; g.fillRect(dX, dY + dH - 22, dW, 22);
    if (slide > 0.15) Sprites.blit(g, dX + dW * 0.5, dY + dH - 6, 'pray', Math.floor(pt * 3), 'sand', -1, 'adult', 1.5);
    g.fillStyle = 'rgba(255,240,190,0.25)'; g.fillRect(dX, dY, dW, dH);
    g.restore();
    for (const s2 of [-1, 1]) {                     // the two glass leaves
      const w2 = (dW / 2) * (1 - slide * 0.9);
      const x2 = s2 < 0 ? dX : dX + dW - w2;
      g.fillStyle = 'rgba(198,222,226,0.72)'; g.fillRect(x2, dY, w2, dH);
      g.fillStyle = '#7f8b96'; g.fillRect(x2, dY, w2, 3); g.fillRect(x2, dY + dH - 3, w2, 3);
      g.fillStyle = 'rgba(255,255,255,0.5)'; g.fillRect(x2 + (s2 < 0 ? 3 : w2 - 8), dY + 6, 4, dH - 14);
      g.fillStyle = '#39414d'; g.fillRect(s2 < 0 ? x2 + w2 - 3 : x2, dY, 3, dH);
    }
    // light spilling over the kerb
    if (slide > 0.05) {
      const spill = g.createLinearGradient(0, dY + dH, 0, dY + dH + 70);
      spill.addColorStop(0, `rgba(255,236,180,${(0.4 * slide).toFixed(2)})`);
      spill.addColorStop(1, 'rgba(255,236,180,0)');
      g.fillStyle = spill;
      g.beginPath();
      g.moveTo(dX, dY + dH); g.lineTo(dX + dW, dY + dH);
      g.lineTo(dX + dW + 40 * slide, dY + dH + 64); g.lineTo(dX - 40 * slide, dY + dH + 64);
      g.closePath(); g.fill();
    }
    // kerbside clutter
    g.fillStyle = '#7f8b96'; g.fillRect(bx + 20, by + bh - 2, 34, 26);
    g.fillStyle = '#b9c4cc'; g.fillRect(bx + 23, by + bh + 1, 28, 10);
    FX.pixelText(g, 'ICE', bx + 37, by + bh + 12, { color: '#2f6f9f', size: 7, ink: false });
    g.fillStyle = '#c9581f'; g.fillRect(bx + bw - 58, by + bh - 2, 26, 26);
    g.fillStyle = '#e9e4d6'; g.fillRect(bx + bw - 55, by + bh + 2, 20, 8);
    const m = Sprites.mascot(Math.floor(pt * 3));
    g.drawImage(m, Math.round(bx + bw + 6), Math.round(by + bh + 22 - m.height));
    g.restore();

    const fade = U.clamp((pt - 1.8) / 0.6, 0, 1);
    g.fillStyle = `rgba(250,244,224,${fade})`; g.fillRect(0, 0, VW, VH);
  }

  function renderRoom(g) {
    const t = G.time, S = scroll;
    // ---- ceiling, wall, floor ---------------------------------------------
    g.fillStyle = '#e7e2d2'; g.fillRect(0, 0, VW, 96);
    for (let x = -(S * 0.5) % 40; x < VW; x += 40) { g.fillStyle = '#d9d3c0'; g.fillRect(x, 0, 2, 96); }
    for (let y = 22; y < 96; y += 26) { g.fillStyle = '#d9d3c0'; g.fillRect(0, y, VW, 2); }
    // fluorescent tubes
    for (let x = -(S * 0.7) % 190 + 40; x < VW + 60; x += 190) {
      g.fillStyle = '#8e8a7c'; g.fillRect(x - 2, 0, 4, 14); g.fillRect(x + 64, 0, 4, 14);
      g.fillStyle = '#cfcabb'; g.fillRect(x - 8, 14, 82, 10);
      g.fillStyle = '#fffdf0'; g.fillRect(x - 4, 16, 74, 6);
      const gl = g.createLinearGradient(0, 24, 0, 150);
      gl.addColorStop(0, 'rgba(255,253,232,0.35)'); gl.addColorStop(1, 'rgba(255,253,232,0)');
      g.fillStyle = gl; g.fillRect(x - 30, 24, 126, 130);
    }
    ceilingPromos(g, S, t);
    // wall
    g.fillStyle = '#f1ecdc'; g.fillRect(0, 96, VW, 214);
    g.fillStyle = '#e2dcc8'; g.fillRect(0, 96, VW, 4);
    for (let x = -(S) % 64; x < VW; x += 64) { g.fillStyle = 'rgba(0,0,0,0.03)'; g.fillRect(x, 96, 1, 214); }
    wallDressing(g, S, t);
    // floor: pale tiles with a yellow line
    g.fillStyle = '#dcd7c6'; g.fillRect(0, 310, VW, VH - 310);
    for (let x = -(S) % 44; x < VW; x += 44) { g.fillStyle = '#cdc7b4'; g.fillRect(x, 310, 2, 50); }
    for (let y = 316; y < VH; y += 13) { g.fillStyle = '#cdc7b4'; g.fillRect(0, y, VW, 1); }
    g.fillStyle = '#d8b23a'; g.fillRect(0, 352, VW, 4);
    g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(0, 310, VW, 2);

    // ---- entrance stretch --------------------------------------------------
    drawEntrance(g, 60 - S, t);
    // ---- the aisles --------------------------------------------------------
    for (const b of bays) drawBay(g, b, S);
    for (const s of slots) {
      const x = s.x - S;
      if (x < -60 || x > VW + 60) continue;
      const img = pic(s.p);
      const hot = hover === s;
      const bob = hot ? Math.sin(t * 7) * 1.5 : 0;
      g.globalAlpha = s.p.locked ? 0.45 : 1;
      g.drawImage(img, Math.round(x - img.width / 2), Math.round(s.y - img.height + 10 + bob));
      g.globalAlpha = 1;
      if (s.p.locked) Icons.blit(g, 'lock', x - 8, s.y - 30, 1);
      tag(g, x, s.y + 3, s.p, hot);
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
    // gondola body
    g.fillStyle = '#cfcabb'; g.fillRect(x0 - 10, 140, w + 20, 180);
    g.fillStyle = '#bdb7a6'; g.fillRect(x0 - 10, 140, w + 20, 5);
    g.fillStyle = '#a8a294'; g.fillRect(x0 - 10, 314, w + 20, 8);
    for (const y of SHELF_Y) {
      g.fillStyle = '#8e8879'; g.fillRect(x0 - 10, y + 4, w + 20, 10);   // shelf face
      g.fillStyle = '#e4dfd0'; g.fillRect(x0 - 10, y, w + 20, 5);        // shelf top
      g.fillStyle = 'rgba(255,255,255,0.55)'; g.fillRect(x0 - 10, y, w + 20, 2);
      g.fillStyle = 'rgba(0,0,0,0.16)'; g.fillRect(x0 - 10, y + 14, w + 20, 3);
    }
    // generic stock fills whatever the catalogue does not, so no shelf is bare
    for (let r = 0; r < 3; r++) for (let c = 0; c < b.cols; c++) {
      if (b.taken[r * b.cols + c]) continue;
      const fx = x0 + c * COLW + 6, fy = SHELF_Y[r];
      for (let i = 0; i < 5; i++) {
        const seed = (r * 7 + c * 13 + i * 3 + b.x) % 5;
        const col = ['#c9581f', '#3f8f4a', '#2f6f9f', '#b8496a', '#d8b23a'][seed];
        const h = 16 + (seed % 3) * 4, w2 = 13;
        g.fillStyle = U.shade(col, -0.45); g.fillRect(fx + i * 16, fy - h, w2, h);
        g.fillStyle = col; g.fillRect(fx + i * 16, fy - h, w2 - 2, h - 1);
        g.fillStyle = U.shade(col, 0.35); g.fillRect(fx + i * 16, fy - h, w2 - 2, 4);
        g.fillStyle = 'rgba(255,255,255,0.5)'; g.fillRect(fx + i * 16 + 2, fy - h + 6, w2 - 6, 3);
      }
    }
    for (let i = 0; i <= b.cols; i++) {                                   // uprights
      const ux = x0 + i * COLW - 3;
      g.fillStyle = '#b3ada0'; g.fillRect(ux, 140, 6, 180);
      g.fillStyle = '#c9c4b6'; g.fillRect(ux, 140, 2, 180);
    }
    sign(g, x0 + w / 2, 126, b.sec.name, b.sec.color, b.sec.sub);
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
    // the keeper behind the counter
    const pose = till > 0 ? 'bite' : 'pray';
    Sprites.blit(g, cx + 112, 320, pose, Math.floor(t * (till > 0 ? 8 : 2.5)), 'sand', -1, 'adult', 2.4);
    // counter body: pale top, panelled front, a kick rail and the house stripe
    g.fillStyle = '#c9c3b2'; g.fillRect(cx, 284, 250, 48);
    g.fillStyle = '#efeade'; g.fillRect(cx, 284, 250, 8);
    g.fillStyle = 'rgba(255,255,255,0.6)'; g.fillRect(cx, 284, 250, 2);
    for (let i = 0; i < 5; i++) { g.fillStyle = 'rgba(0,0,0,0.1)'; g.fillRect(cx + 12 + i * 48, 298, 36, 26); }
    g.fillStyle = '#c9581f'; g.fillRect(cx, 292, 250, 5);
    g.fillStyle = '#9a9484'; g.fillRect(cx, 326, 250, 6);
    g.fillStyle = '#74705f'; g.fillRect(cx, 332, 250, 4);
    // card reader on a stalk
    g.fillStyle = '#3d434e'; g.fillRect(cx + 214, 268, 20, 18);
    g.fillStyle = '#8ad0a0'; g.fillRect(cx + 217, 271, 14, 8);
    g.fillStyle = '#5a6069'; g.fillRect(cx + 222, 280, 4, 6);
    // register
    g.fillStyle = '#3d434e'; g.fillRect(cx + 150, 252, 52, 32);
    g.fillStyle = '#525965'; g.fillRect(cx + 150, 252, 52, 6);
    g.fillStyle = '#8ad0a0'; g.fillRect(cx + 156, 258, 40, 13);
    FX.pixelText(g, till > 0 ? 'TA!' : 'W$', cx + 176, 260, { color: '#1d3324', size: 7, ink: false });
    for (let i = 0; i < 3; i++) { g.fillStyle = '#d8d2c2'; g.fillRect(cx + 156 + i * 14, 275, 10, 5); }
    // lollipop jar and a hot-dog roller
    Art.rect(g, cx + 30, 256, 24, 28, 'rgba(210,236,244,0.6)');
    for (let i = 0; i < 6; i++) Art.ell(g, cx + 36 + (i % 3) * 7, 266 + (i % 2) * 8, 4, 4, ['#e8708a', '#f5cd5c', '#79dced'][i % 3]);
    Art.rect(g, cx + 30, 250, 24, 7, '#c9581f');
    g.fillStyle = '#8e8a7c'; g.fillRect(cx + 66, 262, 68, 22);
    for (let i = 0; i < 4; i++) { g.fillStyle = '#a8663a'; g.fillRect(cx + 70 + i * 16, 266 + Math.sin(t * 3 + i) * 1, 12, 5); }
    g.fillStyle = '#d8d2c2'; g.fillRect(cx + 66, 258, 68, 5);
    // receipt
    if (till > 0) {
      const h = U.clamp((2 - till) * 40, 0, 48);
      g.fillStyle = '#fffdf0'; g.fillRect(cx + 170, 252 - h, 14, h);
      g.fillStyle = '#b9b3a2'; for (let y = 4; y < h; y += 6) g.fillRect(cx + 172, 252 - h + y, 10, 1);
    }
    sign(g, cx + 120, 104, 'PAY', '#b8412c');
    const m = Sprites.mascot(Math.floor(t * 3));
    g.drawImage(m, Math.round(cx + 232), Math.round(330 - m.height));
  }

  return {
    init(g) { G = g; }, open, enter, leave, update, render, press, move, release, hover: hoverAt, wheel,
    add, removeLine, clear, checkout, total, lines, layout, catalogue,
    get basket() { return basket; }, get phase() { return phase; },
  };
})();
