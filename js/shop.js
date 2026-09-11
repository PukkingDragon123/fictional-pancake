// ---- The wombat store: a door, a counter, and shelves you swipe through ---
const Shop = (() => {
  let G = null;
  const VW = 640, VH = 360;
  const WORLDW = 1180;
  const SHELF_Y = [150, 214, 278];        // board top, three boards
  const COL0 = 96, COLW = 112, COLS = 7;
  const COUNTER = 900;
  const cache = new Map();
  let phase = 'door', pt = 0, scroll = 0, tscroll = 0, till = 0, hover = null;
  let drag = null, moved = 0, keeper = { x: 1010, y: 300, t: 0, pose: 'idle' };
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
  let slots = [];
  function layout() {
    const list = catalogue();
    slots = list.map((p, i) => ({
      p, x: COL0 + (i % COLS) * COLW, y: SHELF_Y[Math.floor(i / COLS) % 3], i,
    }));
  }

  // ---- basket -------------------------------------------------------------
  function countOf(id) { return basket.filter((b) => b === id).length; }
  function priceOf(p, extra = 0) {
    if (p.kind === 'wombat') return WOMBAT_PRICE(G.wombats.length + extra);
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
    if (p.kind === 'dec' && countOf(p.id) >= 1) { Audio.play('error'); return; }
    basket.push(p.id);
    Audio.play('pop');
    const s = slots.find((sl) => sl.p.id === p.id);
    if (s) flies.push({ x: s.x - scroll, y: s.y - 20, t: 0, pic: pic(p) });
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
      else if (p.kind === 'wombat') { if (G.wombats.length < Grove.capacity()) Grove.addWombat(); }
      else if (p.kind === 'up') G.up[p.key] = (G.up[p.key] || 0) + 1;
      else if (p.kind === 'dec') G.decor[p.key] = true;
    }
    basket.length = 0;
    till = 2;
    keeper.pose = 'happy'; keeper.t = 0;
    Audio.play('buy');
    FX.confettiBurst(VW * 0.72, 160, 24);
    UI.refreshBasket(); UI.refreshAll();
    Main.save();
  }

  // ---- scene flow ---------------------------------------------------------
  function open() { Main.setMode('shop'); }
  function enter() {
    layout();
    phase = 'door'; pt = 0; scroll = 0; tscroll = 0; till = 0; hover = null;
    basket.length = 0; flies.length = 0;
    if (!motes.length) { const r = Art.rng(99); for (let i = 0; i < 30; i++) motes.push({ x: r() * VW, y: r() * VH, ph: r() * TAU }); }
    Audio.setMode('pen');
    Audio.play('door');
    UI.refreshBasket();
  }
  function leave() { Main.setMode('grove'); }

  function update(dt) {
    pt += dt;
    if (phase === 'door' && pt > 2.3) { phase = 'aisle'; pt = 0; }
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
      if (x > sx - 22 && x < sx + 22 && y > s.y - 54 && y < s.y + 6) return s;
    }
    return null;
  }
  const overCounter = (x) => x + scroll > COUNTER - 40;
  function press(x, y) {
    if (phase !== 'aisle') { phase = 'aisle'; pt = 0; return; }
    drag = { x, y, s: tscroll }; moved = 0;
  }
  function move(x, y) {
    if (!drag) return;
    moved = Math.max(moved, Math.abs(x - drag.x));
    tscroll = U.clamp(drag.s - (x - drag.x), 0, WORLDW - VW);
    scroll = tscroll;
  }
  function release(x, y) {
    if (!drag) return;
    const wasDrag = moved > 6;
    drag = null;
    if (wasDrag) return;
    const s = slotAt(x, y);
    if (s) { add(s.p); return; }
    if (overCounter(x) && y > 170) { UI.openBasket(); Audio.play('click'); return; }
  }
  function hoverAt(x, y) {
    if (phase !== 'aisle') return null;
    const s = slotAt(x, y);
    hover = s;
    if (!s) return overCounter(x) && y > 170 ? '<b>Counter</b><br>check out' : null;
    const p = s.p;
    const tag = p.locked ? '<span class="warn">a god must bless it</span>'
      : p.sold ? '<span class="good">owned</span>'
        : `${Icons.img('wdollar', 'sm')} ${U.fmt(priceOf(p, countOf(p.id)))}`;
    const extra = p.kind === 'seed' ? '<br>6 seeds' : p.note ? '<br>' + p.note : '';
    return `<b>${p.name}</b>${extra}<br>${tag}`;
  }
  function wheel(dy) { tscroll = U.clamp(tscroll + dy, 0, WORLDW - VW); }

  // ---- render -------------------------------------------------------------
  function render(g) {
    if (phase === 'door') { renderDoor(g); return; }
    renderRoom(g);
  }

  function renderDoor(g) {
    const k = U.clamp(pt / 2.3, 0, 1);
    const zoom = 1 + U.easeIn(k) * 2.6;
    g.fillStyle = '#1b2418'; g.fillRect(0, 0, VW, VH);
    // sky and ground behind the shop
    const sky = g.createLinearGradient(0, 0, 0, VH);
    sky.addColorStop(0, '#2a3550'); sky.addColorStop(1, '#4a5a46');
    g.fillStyle = sky; g.fillRect(0, 0, VW, 230);
    g.fillStyle = '#3c4a2e'; g.fillRect(0, 226, VW, VH - 226);
    g.fillStyle = '#4e5f38'; g.fillRect(0, 226, VW, 4);

    g.save();
    g.translate(VW / 2, 250);
    g.scale(zoom, zoom);
    g.translate(-VW / 2, -250);
    const img = Props.get('store');
    const s = 2.2, dw = img.width * s, dh = img.height * s;
    const dx = Math.round(VW / 2 - dw / 2), dy = Math.round(250 - dh);
    g.drawImage(img, dx, dy, dw, dh);

    // the doorway, cut back into the facade
    const doorX = dx + 70 * s, doorY = dy + 58 * s, doorW = 36 * s, doorH = 42 * s;
    const swing = U.easeOut(U.clamp((pt - 0.35) / 1.1, 0, 1));
    g.fillStyle = '#2a1f18'; g.fillRect(doorX, doorY, doorW, doorH);
    const light = g.createLinearGradient(doorX, doorY, doorX + doorW, doorY + doorH);
    light.addColorStop(0, `rgba(255,206,130,${(0.9 * swing).toFixed(2)})`);
    light.addColorStop(1, `rgba(226,150,80,${(0.4 * swing).toFixed(2)})`);
    g.fillStyle = light; g.fillRect(doorX, doorY, doorW, doorH);
    if (swing > 0.2) {                        // the keeper waits at the counter
      g.save();
      g.beginPath(); g.rect(doorX + 2, doorY, doorW - 4, doorH); g.clip();
      g.fillStyle = 'rgba(60,36,20,0.55)'; g.fillRect(doorX, doorY + doorH - 26, doorW, 26);
      Sprites.blit(g, doorX + doorW * 0.56, doorY + doorH - 6, 'pray', Math.floor(pt * 3), 'sand', -1, 'adult', s * 0.5);
      g.globalAlpha = 0.35 * swing;
      g.fillStyle = PAL.gold4; g.fillRect(doorX, doorY, doorW, doorH);
      g.globalAlpha = 1;
      g.restore();
    }
    // light spilling out onto the step
    if (swing > 0.1) {
      const spill = g.createLinearGradient(0, doorY + doorH, 0, doorY + doorH + 60);
      spill.addColorStop(0, `rgba(255,206,130,${(0.35 * swing).toFixed(2)})`);
      spill.addColorStop(1, 'rgba(255,206,130,0)');
      g.fillStyle = spill;
      g.beginPath();
      g.moveTo(doorX, doorY + doorH); g.lineTo(doorX + doorW, doorY + doorH);
      g.lineTo(doorX + doorW + 30 * swing, doorY + doorH + 56); g.lineTo(doorX - 30 * swing, doorY + doorH + 56);
      g.closePath(); g.fill();
    }
    // the swinging panel: hinged on the left, narrowing as it opens inward
    const pw2 = doorW * (1 - swing * 0.88);
    const skew = swing * 7;
    g.save();
    g.beginPath();
    g.moveTo(doorX, doorY); g.lineTo(doorX + pw2, doorY + skew);
    g.lineTo(doorX + pw2, doorY + doorH - skew); g.lineTo(doorX, doorY + doorH);
    g.closePath(); g.clip();
    g.fillStyle = U.mix('#5d4430', '#2f2118', swing * 0.6); g.fillRect(doorX, doorY, pw2, doorH);
    g.fillStyle = U.mix('#6d5138', '#37271b', swing * 0.6);
    for (let x = 3; x < pw2 - 2; x += Math.max(5, 14 * (1 - swing * 0.8))) g.fillRect(doorX + x, doorY + 4, Math.max(3, 9 * (1 - swing * 0.8)), doorH - 8);
    if (swing < 0.6) { g.fillStyle = PAL.gold3; g.fillRect(doorX + pw2 - 9, doorY + doorH * 0.5, 4, 4); }
    g.restore();
    g.fillStyle = 'rgba(20,14,10,0.5)';
    g.fillRect(doorX + pw2, doorY + skew, 2, doorH - skew * 2);
    // bell
    if (pt > 0.35 && pt < 0.9) {
      const b = Math.sin((pt - 0.35) * 26) * 3;
      Art.ell(g, doorX + doorW * 0.5 + b, doorY - 8, 5, 5, PAL.gold2);
    }
    g.restore();

    const fade = U.clamp((pt - 1.7) / 0.6, 0, 1);
    g.fillStyle = `rgba(36,24,16,${fade})`; g.fillRect(0, 0, VW, VH);
    if (pt < 1.6) FX.pixelText(g, 'OPEN', VW / 2, 300, { color: PAL.gold3, size: 10 });
  }

  function renderRoom(g) {
    const t = G.time;
    const S = scroll;
    // wall
    const wall = g.createLinearGradient(0, 0, 0, VH);
    wall.addColorStop(0, '#5a3f2c'); wall.addColorStop(0.6, '#6b4c33'); wall.addColorStop(1, '#4a3524');
    g.fillStyle = wall; g.fillRect(0, 0, VW, VH);
    for (let x = -(S * 0.6) % 24; x < VW; x += 24) { g.fillStyle = 'rgba(0,0,0,0.1)'; g.fillRect(x, 0, 2, 300); }
    for (let x = -(S * 0.6) % 96 + 8; x < VW; x += 96) {   // wallpaper leaf motif
      for (let y = 40; y < 300; y += 48) { Art.ell(g, x, y, 5, 3, 'rgba(210,168,110,0.12)'); Art.ell(g, x + 48, y + 24, 5, 3, 'rgba(210,168,110,0.12)'); }
    }
    // window at the far left with daylight
    const wx = 40 - S;
    if (wx > -180 && wx < VW) {
      g.fillStyle = '#2e2018'; g.fillRect(wx, 44, 132, 96);
      g.fillStyle = '#9fd0e4'; g.fillRect(wx + 5, 49, 122, 86);
      g.fillStyle = '#c3e6f2'; g.fillRect(wx + 5, 49, 122, 30);
      g.fillStyle = '#5d7d44'; Art.ell(g, wx + 34, 118, 26, 16, '#5d7d44'); Art.ell(g, wx + 92, 122, 22, 13, '#4a6a36');
      g.fillStyle = '#2e2018'; g.fillRect(wx + 64, 44, 5, 96); g.fillRect(wx, 86, 132, 5);
      const beam = g.createLinearGradient(wx, 140, wx + 90, 330);
      beam.addColorStop(0, 'rgba(255,228,160,0.22)'); beam.addColorStop(1, 'rgba(255,228,160,0)');
      g.fillStyle = beam; g.fillRect(wx - 10, 140, 190, 200);
    }
    // floor
    for (let y = 300; y < VH; y++) {
      g.fillStyle = U.mix('#4b3626', '#6b4e35', (y - 300) / (VH - 300));
      g.fillRect(0, y, VW, 1);
    }
    for (let x = -(S) % 38; x < VW; x += 38) { g.fillStyle = 'rgba(0,0,0,0.24)'; g.fillRect(x, 300, 2, 60); }
    for (let y = 306; y < VH; y += 16) { g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(0, y, VW, 1); g.fillStyle = 'rgba(255,224,170,0.06)'; g.fillRect(0, y + 1, VW, 1); }
    g.fillStyle = '#7a5a3c'; g.fillRect(0, 300, VW, 2);
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(0, 296, VW, 4);
    // a worn rug down the middle of the aisle
    const rx = 120 - S;
    g.fillStyle = '#6d322d'; g.fillRect(rx, 322, 300, 34);
    g.fillStyle = '#8c463f'; g.fillRect(rx + 6, 326, 288, 26);
    g.fillStyle = '#b8875a'; g.fillRect(rx + 16, 332, 268, 2); g.fillRect(rx + 16, 344, 268, 2);
    for (let i = 0; i < 12; i++) { g.fillStyle = '#c8a05a'; g.fillRect(rx + 24 + i * 22, 336, 8, 6); }
    for (let i = 0; i < 20; i++) { g.fillStyle = '#6d322d'; g.fillRect(rx - 3, 324 + i * 1.6, 3, 1); g.fillRect(rx + 300, 324 + i * 1.6, 3, 1); }

    // shelves
    for (let r = 0; r < 3; r++) {
      const y = SHELF_Y[r];
      g.fillStyle = '#3a281c'; g.fillRect(0, y + 3, VW, 12);
      g.fillStyle = PAL.bark2; g.fillRect(0, y, VW, 6);
      g.fillStyle = PAL.bark3; g.fillRect(0, y, VW, 2);
      g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(0, y + 6, VW, 3);
      for (let x = -(S % COLW) - 40; x < VW + 60; x += COLW) {   // uprights
        g.fillStyle = PAL.bark1; g.fillRect(x, y - 58, 7, 64);
        g.fillStyle = PAL.bark2; g.fillRect(x, y - 58, 3, 64);
      }
    }
    // products
    for (const s of slots) {
      const x = s.x - S;
      if (x < -60 || x > VW + 60) continue;
      const img = pic(s.p);
      const hot = hover === s;
      const bob = hot ? Math.sin(t * 7) * 1.5 : 0;
      g.globalAlpha = s.p.locked ? 0.45 : 1;
      g.drawImage(img, Math.round(x - img.width / 2), Math.round(s.y - img.height + 4 + bob));
      g.globalAlpha = 1;
      if (s.p.locked) Icons.blit(g, 'lock', x - 8, s.y - 30, 1);
      tag(g, x, s.y + 4, s.p, hot);
      const n = countOf(s.p.id);
      if (n) { Art.ell(g, x + 16, s.y - 34, 7, 7, PAL.moss3); FX.pixelText(g, String(n), x + 16, s.y - 37, { color: PAL.cream, size: 7 }); }
    }
    // counter
    drawCounter(g, COUNTER - S, t);

    // hanging lamps in front
    for (let x = -(S * 1.15) % 200 + 100; x < VW + 60; x += 200) {
      g.fillStyle = '#2b1f18'; g.fillRect(x - 1, 0, 2, 26);
      Art.ell(g, x, 32, 16, 9, '#2b1f18');
      Art.ell(g, x, 30, 14, 8, '#c8a05a');
      Art.ell(g, x, 36, 5, 4, '#fff0c0');
      const gl = g.createRadialGradient(x, 40, 4, x, 40, 90);
      gl.addColorStop(0, 'rgba(255,220,150,0.2)'); gl.addColorStop(1, 'rgba(255,220,150,0)');
      g.fillStyle = gl; g.fillRect(x - 90, 0, 180, 180);
    }
    for (const m of motes) {
      g.fillStyle = 'rgba(255,235,190,0.5)';
      g.fillRect(Math.round((m.x + Math.sin(t * 0.4 + m.ph) * 20) % VW), Math.round(m.y + Math.cos(t * 0.3 + m.ph) * 14), 1, 1);
    }
    // items flying to the basket
    for (const f of flies) {
      const k = U.easeIn(f.t);
      const x = U.lerp(f.x, VW - 40, k), y = U.lerp(f.y, VH - 34, k) - Math.sin(f.t * Math.PI) * 60;
      const s2 = 1 - k * 0.6;
      g.drawImage(f.pic, Math.round(x - f.pic.width * s2 / 2), Math.round(y - f.pic.height * s2 / 2), f.pic.width * s2, f.pic.height * s2);
    }
    const vg = g.createRadialGradient(VW / 2, 170, 90, VW / 2, 180, 400);
    vg.addColorStop(0, 'rgba(255,214,150,0.05)'); vg.addColorStop(1, 'rgba(24,14,8,0.55)');
    g.fillStyle = vg; g.fillRect(0, 0, VW, VH);
    // swipe hint
    if (pt < 4 && tscroll < 20) {
      const a = 0.5 + 0.5 * Math.sin(t * 4);
      g.globalAlpha = a;
      FX.pixelText(g, 'SWIPE', VW - 70, VH - 78, { color: PAL.cream, size: 8 });
      for (let i = 0; i < 3; i++) { g.fillStyle = PAL.gold3; g.fillRect(VW - 46 + i * 7, VH - 62, 4, 4); }
      g.globalAlpha = 1;
    }
    FX.drawParticles(g, 0);
    FX.drawConfetti(g);
    FX.drawFloaters(g, false);
  }

  function tag(g, x, y, p, hot) {
    const txt = p.sold ? 'OWNED' : p.locked ? '---' : String(priceOf(p, countOf(p.id)));
    const w = txt.length * 6 + 12;
    g.fillStyle = PAL.ink; g.fillRect(Math.round(x - w / 2) - 1, y - 1, w + 2, 13);
    g.fillStyle = hot ? PAL.gold3 : PAL.parch1; g.fillRect(Math.round(x - w / 2), y, w, 11);
    g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(Math.round(x - w / 2), y + 8, w, 3);
    FX.pixelText(g, txt, x, y + 2, { color: '#3a2c1c', size: 7, ink: false });
  }

  function drawCounter(g, cx, t) {
    if (cx > VW + 120 || cx < -320) return;
    // back bar with bottles
    g.fillStyle = '#3a281c'; g.fillRect(cx - 20, 150, 300, 10);
    for (let i = 0; i < 8; i++) {
      const x = cx + 6 + i * 30;
      const col = ['#7a9a5a', '#a86a44', '#6a7ea8', '#b08a44'][i % 4];
      Art.rect(g, x + 1, 134, 9, 16, col);
      Art.rect(g, x + 3, 126, 5, 9, U.shade(col, -0.15));
      Art.rect(g, x + 2.6, 124, 6, 2.4, PAL.bark2);
      Art.rect(g, x + 2, 136, 2, 12, 'rgba(255,255,255,0.3)');
      Art.rect(g, x + 1, 142, 9, 4, PAL.parch1);
      Art.rect(g, x + 1, 149, 9, 1.4, 'rgba(0,0,0,0.4)');
    }
    // the mascot standee
    const m = Sprites.mascot(Math.floor(t * 3));
    g.drawImage(m, Math.round(cx - 62), Math.round(300 - m.height));
    g.fillStyle = '#2b1f18'; g.fillRect(Math.round(cx - 52), 300, 20, 6);
    // the keeper behind the counter
    const pose = till > 0 ? 'bite' : 'pray';
    Sprites.blit(g, cx + 132, 306, pose, Math.floor(t * (till > 0 ? 8 : 2.5)), 'sand', -1, 'adult', 1.9);
    // counter body
    g.fillStyle = PAL.bark1; g.fillRect(cx + 10, 286, 250, 46);
    g.fillStyle = PAL.bark2; g.fillRect(cx + 10, 286, 250, 8);
    g.fillStyle = PAL.bark3; g.fillRect(cx + 10, 286, 250, 3);
    for (let i = 0; i < 6; i++) { g.fillStyle = 'rgba(0,0,0,0.2)'; g.fillRect(cx + 20 + i * 40, 296, 3, 36); }
    // register
    g.fillStyle = '#4a4250'; g.fillRect(cx + 168, 258, 46, 30);
    g.fillStyle = '#5e5668'; g.fillRect(cx + 168, 258, 46, 6);
    g.fillStyle = '#8ad0a0'; g.fillRect(cx + 174, 264, 34, 12);
    FX.pixelText(g, till > 0 ? 'TA' : 'W$', cx + 191, 266, { color: '#1d3324', size: 7, ink: false });
    for (let i = 0; i < 3; i++) { g.fillStyle = PAL.gold2; g.fillRect(cx + 174 + i * 12, 280, 8, 4); }
    // lollipop jar on the counter
    Art.rect(g, cx + 40, 262, 22, 26, 'rgba(200,228,238,0.45)');
    for (let i = 0; i < 5; i++) Art.ell(g, cx + 46 + (i % 3) * 6, 272 + (i % 2) * 7, 4, 4, ['#e8708a', '#f5cd5c', '#79dced'][i % 3]);
    Art.rect(g, cx + 40, 256, 22, 7, PAL.bark2);
    // receipt printing
    if (till > 0) {
      const h = U.clamp((2 - till) * 40, 0, 48);
      g.fillStyle = PAL.cream; g.fillRect(cx + 186, 258 - h, 14, h);
      g.fillStyle = '#b9ab90'; for (let y = 4; y < h; y += 6) g.fillRect(cx + 188, 258 - h + y, 10, 1);
    }
    FX.pixelText(g, 'PAY HERE', cx + 135, 236, { color: PAL.gold3, size: 8 });
  }

  return {
    init(g) { G = g; }, open, enter, leave, update, render, press, move, release, hover: hoverAt, wheel,
    add, removeLine, clear, checkout, total, lines, layout, catalogue,
    get basket() { return basket; }, get phase() { return phase; },
  };
})();
