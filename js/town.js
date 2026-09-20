// ---- The town: a street, three fronts, and somebody behind each counter ----
// Out past the grove there is one street with a gutter down the middle of it.
// Grimm buys what the gods leave you, Odger sells the things you stand about
// the clearing, and Mrs Warren has wombats out the back and tools on the wall.
// You walk the street, you go in a door, and you deal with a person.
const Town = (() => {
  let G = null;
  const W = 640, H = 360;
  const ROAD = 286;                     // where the road surface sits
  const STREET = 1180;                  // how long the street is
  let camX = 0, tCam = 0, t = 0;
  let inside = null;                    // null on the street, else a shop key
  let hoverI = -1, keeperT = 0, say = '', sayT = 0;
  let page = 0;
  const folk = [];
  const smoke = [];

  function init(g) { G = g; }
  function enter() {
    inside = null; camX = 0; tCam = 0; t = 0; page = 0; say = ''; sayT = 0;
    folk.length = 0;
    const kinds = ['bee', 'fish', 'post', 'bake', 'bota', 'bard'];
    for (let i = 0; i < 7; i++) {
      folk.push({
        kind: kinds[i % kinds.length], x: U.rand(40, STREET - 40), y: ROAD + U.rand(18, 52),
        dir: U.chance(0.5) ? 1 : -1, sp: U.rand(15, 30), f: U.rand(0, 8), wait: U.rand(0, 5),
      });
    }
    smoke.length = 0;
    Audio.setMode('pen');
  }
  function leave() { inside = null; }

  // ---- what each counter deals in -----------------------------------------
  // The pawnbroker buys; the other two sell. One shape of row for all three,
  // so the three interiors are the same shop with different stock in it.
  function stockOf(key) {
    if (key === 'pawn') {
      const out = [];
      for (const god of GODS) {
        const n = G.artifacts[god.key] || 0;
        if (n > 0) out.push({ id: 'art:' + god.key, name: god.artifact, n, price: god.artValue, sell: true, col: god.color, god });
      }
      for (const k of ['gold', 'rune']) {
        const d = OFFERINGS[k], n = (G.offerings[k] || 0) + (G.blessed[k] || 0);
        if (n > 0) out.push({ id: 'off:' + k, name: d.name + ' cube', n, price: d.sell || d.value, sell: true, col: d.color, off: d });
      }
      return out;
    }
    if (key === 'furn') {
      return FURNITURE.map((f) => ({ id: 'fn:' + f.key, name: f.name, price: f.cost, blurb: f.blurb, furn: f,
        n: (G.furniture || []).filter((x) => x.key === f.key).length }));
    }
    // Warren's: livestock and iron
    const out = [{ id: 'wombat', name: 'A wombat', price: WOMBAT_PRICE(G.wombats.length + 1),
      blurb: 'Out the back. Comes with papers and an opinion.', wombat: true, n: G.wombats.length }];
    for (const u of UPGRADES) {
      const lvl = (G.up[u.key] || 0);
      if (lvl >= u.max) continue;
      out.push({ id: 'up:' + u.key, name: u.name + (lvl ? ' ' + (lvl + 1) : ''), price: Math.round(u.base * Math.pow(u.mult, lvl)),
        blurb: u.desc(lvl), up: u, n: lvl, icon: u.icon });
    }
    return out;
  }
  function priceOf(r) { return r.price; }
  function afford(r) { return G.wd >= priceOf(r); }

  function buy(r) {
    if (r.sell) {
      // Grimm counts it out, takes his cut, and it is gone
      const pay = Math.round(r.price * 0.92);
      if (r.god) { G.artifacts[r.god.key]--; if (!G.artifacts[r.god.key]) delete G.artifacts[r.god.key]; }
      else if (r.off) {
        const k = r.off.key;
        if ((G.offerings[k] || 0) > 0) G.offerings[k]--; else G.blessed[k]--;
      }
      G.wd += pay;
      G.stats.earned = (G.stats.earned || 0) + pay;
      G.stats.sold = (G.stats.sold || 0) + 1;
      Audio.play('coin'); UI.pingPurse();
      talk(U.pick(['That will do.', 'I have seen worse.', 'Do not ask what I do with it.', 'Counted and gone.']));
      UI.refreshHUD(); Main.save();
      return;
    }
    if (!afford(r)) { Audio.play('error'); talk('Come back with the money.'); return; }
    G.wd -= priceOf(r);
    if (r.furn) {
      if (!G.furniture) G.furniture = [];
      if (!G.crates) G.crates = {};
      G.crates[r.furn.key] = (G.crates[r.furn.key] || 0) + 1;
      talk('It will be in the clearing when you get back.');
      UI.toast(`<b>${r.furn.name}</b> &mdash; put it down with the hammer`, 'good');
    } else if (r.wombat) {
      Grove.addWombat({});
      talk('Mind she does not eat the seat covers.');
      UI.toast('<b>a wombat</b> &mdash; she is in the clearing', 'good');
    } else if (r.up) {
      G.up[r.up.key] = (G.up[r.up.key] || 0) + 1;
      talk('Sharpened, oiled and yours.');
    }
    Audio.play('buy'); UI.pingPurse(); UI.refreshHUD(); Main.save();
  }
  function talk(s) { say = s; sayT = 3.4; keeperT = 0.5; }

  // ---- update --------------------------------------------------------------
  function update(dt) {
    t += dt;
    if (sayT > 0) sayT -= dt;
    if (keeperT > 0) keeperT -= dt;
    if (inside) { if (Math.random() < dt * 2.5) smokePuff(); stepSmoke(dt); return; }
    camX = U.lerp(camX, tCam, 1 - Math.pow(0.002, dt));
    for (const p of folk) {
      p.wait -= dt;
      if (p.wait > 0) { p.f += dt * 5; continue; }
      p.x += p.dir * p.sp * dt;
      p.f += dt * 7;
      if (p.x < 24) { p.x = 24; p.dir = 1; p.wait = U.rand(0.5, 2.5); }
      if (p.x > STREET - 24) { p.x = STREET - 24; p.dir = -1; p.wait = U.rand(0.5, 2.5); }
      if (U.chance(dt * 0.12)) { p.dir *= -1; p.wait = U.rand(0.4, 2); }
    }
    if (Math.random() < dt * 3) smokePuff();
    stepSmoke(dt);
  }
  function smokePuff() {
    const s = TOWN_SHOPS[Math.floor(Math.random() * TOWN_SHOPS.length)];
    smoke.push({ x: s.x + 54, y: ROAD - 128, vx: U.rand(4, 14), vy: -U.rand(10, 20), life: U.rand(2.4, 4.2), r: U.rand(3, 6) });
    if (smoke.length > 60) smoke.shift();
  }
  function stepSmoke(dt) {
    for (let i = smoke.length - 1; i >= 0; i--) {
      const s = smoke[i];
      s.life -= dt; s.x += s.vx * dt; s.y += s.vy * dt; s.r += dt * 3;
      if (s.life <= 0) smoke.splice(i, 1);
    }
  }

  // ---- the street ----------------------------------------------------------
  const PXB = 2;
  function render(g) {
    if (inside) { renderInside(g); return; }
    const light = Sky.light();
    const night = Sky.isNight();
    // sky and the hills behind the roofs
    const SKYK = night ? ['#0d0a18', '#161230', '#241a3e'] : ['#7ea8c4', '#9cc0d4', '#c0d8e0'];
    const SKYN = Math.ceil(ROAD / 10);
    for (let i = 0; i < SKYN; i++) {
      g.fillStyle = U.mix(SKYK[0], SKYK[2], i / (SKYN - 1));
      g.fillRect(0, i * 10, W, 11);
    }
    g.save();
    g.translate(-Math.round(camX), 0);
    Sky.drawClouds(g, camX * 0.2, 0, W + 40, 130);
    g.restore();
    // far hills
    g.save(); g.translate(-Math.round(camX * 0.25), 0);
    for (let i = 0; i < 26; i++) {
      const hx = i * 62, hh = 40 + ((i * 37) % 44);
      for (let s = 0; s < hh; s += PXB) {
        // wide at the bottom, narrow at the top: a hill, not a funnel
        const ww = Math.round((12 + (s / hh) * 56) / PXB) * PXB;
        g.fillStyle = U.mix('#5a6a62', '#3c4a4e', s / hh);
        g.fillRect(hx + (62 - ww) / 2, ROAD - 40 - hh + s, ww, PXB);
      }
    }
    g.restore();
    // the ground the hills stand on, so there is no band of sky under them
    for (let y = ROAD - 42; y < ROAD; y += PXB) {
      g.fillStyle = U.mix('#4a5240', '#6b5a44', (y - (ROAD - 42)) / 42);
      g.fillRect(0, y, W, PXB);
    }
    g.save();
    g.translate(-Math.round(camX), 0);
    // the road: packed dirt with a gutter down the middle
    for (let y = ROAD; y < H; y += PXB) {
      const k = (y - ROAD) / (H - ROAD);
      g.fillStyle = U.mix('#6b5a44', '#463a2c', k);
      g.fillRect(0, y, STREET, PXB);
    }
    const r = Art.rng(4242);
    for (let i = 0; i < 700; i++) {
      const x = Math.round(r() * STREET / PXB) * PXB, y = ROAD + Math.round(r() * (H - ROAD) / PXB) * PXB;
      g.fillStyle = ['#7a6850', '#564634', '#3d3226'][Math.floor(r() * 3)];
      g.fillRect(x, y, PXB, PXB);
    }
    // the gutter
    for (let x = 0; x < STREET; x += PXB) {
      g.fillStyle = '#2e2620'; g.fillRect(x, ROAD + 44, PXB, 6);
      g.fillStyle = '#1d3a3e'; g.fillRect(x, ROAD + 46, PXB, 2);
    }
    // the fronts
    TOWN_SHOPS.forEach((s, i) => front(g, s, i));
    // cobbles along the footpath
    for (let x = 0; x < STREET; x += 12) {
      g.fillStyle = (x / 12) % 2 ? '#585046' : '#4a443c';
      g.fillRect(x, ROAD - 4, 11, 5);
      g.fillStyle = '#000000'; g.fillRect(x + 11, ROAD - 4, 1, 5);
    }
    // the people
    for (const p of folk) {
      const img = Sprites.villager(p.kind, Math.floor(p.f), p.wait > 0 ? 'idle' : 'walk');
      const fl = p.dir < 0 ? Art.flip(img) : img;
      g.drawImage(fl, Math.round(p.x - fl.width / 2), Math.round(p.y - fl.height));
    }
    // chimney smoke
    for (const s of smoke) {
      const a = U.clamp(s.life / 3, 0, 1) * 0.35;
      g.fillStyle = `rgba(210,205,220,${a.toFixed(2)})`;
      const rr = Math.max(PXB, Math.round(s.r / PXB) * PXB);
      g.fillRect(Math.round(s.x / PXB) * PXB, Math.round(s.y / PXB) * PXB, rr, rr);
    }
    g.restore();
    if (night) { g.fillStyle = 'rgba(14,10,30,0.5)'; g.fillRect(0, 0, W, H); }
    else if (light < 0.85) { g.fillStyle = `rgba(40,26,20,${((0.85 - light) * 0.5).toFixed(2)})`; g.fillRect(0, 0, W, H); }
    // the only words on the street are painted on the signs, and this one,
    // which tells you which door your hand is on
    if (hoverI >= 0) {
      const s = TOWN_SHOPS[hoverI];
      const sx = Math.round(s.x + 54 - camX);
      Font.draw(g, 'GO IN', sx, ROAD + 18, { scale: 1, color: '#1a1008', align: 'center' });
      Font.draw(g, 'GO IN', sx, ROAD + 17, { scale: 1, color: '#f2c936', align: 'center' });
    }
  }
  // one shopfront: stone footing, boarded wall, a shuttered window, a door,
  // a swinging sign and a tiled roof
  function front(g, s, i) {
    const x = s.x, base = ROAD;
    const BW = 108, BH = 132;
    const y0 = base - BH;
    // the wall
    g.fillStyle = '#000000'; g.fillRect(x - 3, y0 - 3, BW + 6, BH + 6);
    for (let yy = y0; yy < base; yy += 6) {
      g.fillStyle = (Math.round((yy - y0) / 6) % 2) ? s.col : U.shade(s.col, 0.12);
      g.fillRect(x, yy, BW, 6);
      g.fillStyle = U.shade(s.col, 0.24); g.fillRect(x, yy, BW, 1);
      g.fillStyle = U.shade(s.col, -0.3); g.fillRect(x, yy + 5, BW, 1);
    }
    // the footing
    for (let bx = 0; bx < BW; bx += 14) {
      g.fillStyle = bx % 28 ? '#4a443c' : '#585046';
      g.fillRect(x + bx, base - 20, 13, 20);
      g.fillStyle = '#000000'; g.fillRect(x + bx + 13, base - 20, 1, 20);
    }
    // the roof: overhanging tiles in three courses
    for (let c = 0; c < 4; c++) {
      const rw = BW + 20 - c * 5, rx = x + (BW - rw) / 2, ry = y0 - 8 - c * 7;
      g.fillStyle = '#000000'; g.fillRect(rx - 2, ry - 2, rw + 4, 11);
      g.fillStyle = s.roof; g.fillRect(rx, ry, rw, 9);
      g.fillStyle = U.shade(s.roof, 0.3); g.fillRect(rx, ry, rw, 2);
      for (let tx = 0; tx < rw; tx += 9) { g.fillStyle = U.shade(s.roof, -0.35); g.fillRect(rx + tx, ry + 2, 1, 7); }
    }
    // the chimney
    g.fillStyle = '#000000'; g.fillRect(x + 48, y0 - 54, 16, 24);
    g.fillStyle = '#5a4438'; g.fillRect(x + 50, y0 - 52, 12, 22);
    g.fillStyle = '#7a6050'; g.fillRect(x + 50, y0 - 52, 12, 3);
    // the window, shuttered, with whatever is behind it lit
    const wx = x + 10, wy = y0 + 26;
    g.fillStyle = '#000000'; g.fillRect(wx - 3, wy - 3, 42, 40);
    g.fillStyle = '#2a1f14'; g.fillRect(wx, wy, 36, 34);
    g.fillStyle = Sky.isNight() ? '#f2c936' : '#8fb4c4'; g.fillRect(wx + 3, wy + 3, 30, 28);
    g.fillStyle = 'rgba(255,255,255,0.22)'; g.fillRect(wx + 3, wy + 3, 30, 6);
    g.fillStyle = '#2a1f14'; g.fillRect(wx + 17, wy, 3, 34); g.fillRect(wx, wy + 15, 36, 3);
    // the door
    const dx = x + 62, dy = base - 56;
    g.fillStyle = '#000000'; g.fillRect(dx - 3, dy - 3, 38, 59);
    g.fillStyle = '#3d2714'; g.fillRect(dx, dy, 32, 56);
    for (let px = 0; px < 32; px += 8) { g.fillStyle = px % 16 ? '#4d2f16' : '#5a3a1c'; g.fillRect(dx + px, dy, 7, 56); }
    g.fillStyle = '#6b4423'; g.fillRect(dx, dy, 32, 3);
    g.fillStyle = '#d8a41c'; g.fillRect(dx + 25, dy + 28, 4, 4);
    g.fillStyle = '#a9750d'; g.fillRect(dx + 4, dy + 8, 24, 3);
    // the step
    g.fillStyle = '#585046'; g.fillRect(dx - 4, base - 5, 40, 5);
    g.fillStyle = '#000000'; g.fillRect(dx - 4, base, 40, 1);
    // the sign, hung on an iron bracket and swinging
    const sw = Math.sin(t * 1.1 + i) * 0.045;
    const bx = x + BW + 4, by = y0 + 14;
    g.fillStyle = '#2a2630'; g.fillRect(x + BW, by - 4, 22, 3);
    g.save();
    g.translate(bx + 14, by);
    g.rotate(sw);
    const SW2 = 84, SH2 = 38;
    g.fillStyle = '#2a2630'; g.fillRect(-1, -4, 2, 8);
    g.fillStyle = '#000000'; g.fillRect(-SW2 / 2 - 3, 3, SW2 + 6, SH2 + 6);
    g.fillStyle = '#3d2714'; g.fillRect(-SW2 / 2, 6, SW2, SH2);
    g.fillStyle = '#5a3a1c'; g.fillRect(-SW2 / 2 + 3, 9, SW2 - 6, SH2 - 6);
    g.fillStyle = '#2a1a0c'; g.fillRect(-SW2 / 2 + 3, 9, SW2 - 6, 2);
    Font.draw(g, s.name, 0, 14, { scale: 1, color: '#1a1008', align: 'center' });
    Font.draw(g, s.name, 0, 13, { scale: 1, color: '#f0dcb0', align: 'center' });
    Font.draw(g, s.sub, 0, 26, { scale: 1, color: '#a9750d', align: 'center' });
    g.restore();
    // the lamp beside the door
    g.fillStyle = '#2a2630'; g.fillRect(x + 100, base - 74, 3, 74);
    g.fillStyle = '#000000'; g.fillRect(x + 94, base - 86, 15, 14);
    g.fillStyle = Sky.isNight() ? '#f2c936' : '#6b5a40'; g.fillRect(x + 96, base - 84, 11, 10);
    if (Sky.isNight()) { g.fillStyle = 'rgba(242,201,54,0.10)'; g.fillRect(x + 84, base - 96, 35, 60); }
  }

  // ---- inside a shop -------------------------------------------------------
  // The same room three times over: a floor, a back wall, a counter, a person
  // behind it and their stock laid out on the boards in front of them.
  function shopAt(key) { return TOWN_SHOPS.find((s) => s.key === key); }
  const ROWH = 30, LISTX = 40, LISTY = 150, LISTW = 350, PER = 6;
  function rows() { return stockOf(inside); }
  function renderInside(g) {
    const s = shopAt(inside);
    const all = rows();
    const page0 = page * PER;
    // the room
    for (let y = 0; y < 210; y += 6) {                       // the back wall, boarded
      g.fillStyle = (Math.round(y / 6) % 2) ? U.shade(s.col, -0.42) : U.shade(s.col, -0.34);
      g.fillRect(0, y, W, 6);
      g.fillStyle = U.shade(s.col, -0.22); g.fillRect(0, y, W, 1);
    }
    for (let y = 210; y < H; y += 4) {                        // the floorboards
      g.fillStyle = (Math.round(y / 4) % 2) ? '#4d2f16' : '#5a3a1c';
      g.fillRect(0, y, W, 4);
      g.fillStyle = '#35200f'; g.fillRect(0, y + 3, W, 1);
    }
    for (let x = 0; x < W; x += 74) { g.fillStyle = '#2a1a0c'; g.fillRect(x, 210, 2, H - 210); }
    // the shelves along the back, with the shop's own clutter on them
    for (let sh = 0; sh < 3; sh++) {
      const y = 44 + sh * 46;
      g.fillStyle = '#000000'; g.fillRect(330, y, W - 330, 8);
      g.fillStyle = '#6b4423'; g.fillRect(330, y + 1, W - 330, 6);
      g.fillStyle = '#8c5c30'; g.fillRect(330, y + 1, W - 330, 2);
      clutter(g, s.key, sh, y);
    }
    // the window on the left with the street outside it
    g.fillStyle = '#000000'; g.fillRect(28, 32, 120, 96);
    g.fillStyle = Sky.isNight() ? '#1a1430' : '#8fb4c4'; g.fillRect(33, 37, 110, 86);
    g.fillStyle = Sky.isNight() ? '#2a2050' : '#a8c8d4'; g.fillRect(33, 37, 110, 30);
    g.fillStyle = '#4a3a2a'; g.fillRect(33, 76, 110, 4); g.fillRect(86, 37, 4, 86);
    g.fillStyle = '#3d2714'; g.fillRect(28, 124, 120, 8);
    // the counter
    g.fillStyle = '#000000'; g.fillRect(392, 196, W - 392, 8);
    g.fillStyle = '#7a4f24'; g.fillRect(396, 200, W - 396, H - 200);
    g.fillStyle = '#9a6a34'; g.fillRect(396, 200, W - 396, 5);
    for (let x = 400; x < W; x += 16) { g.fillStyle = '#5a3a1c'; g.fillRect(x, 206, 1, H - 206); }
    // the keeper behind it
    const kf = Math.floor(t * (keeperT > 0 ? 8 : 4));
    const img = Sprites.villager(s.keeper, kf, keeperT > 0 ? 'talk' : 'idle');
    g.drawImage(img, 470, 200 - img.height + 6);
    // what they are saying, on a board propped on the counter
    const line = sayT > 0 ? say : s.line;
    const ws = Font.wrap(line, 150, 1);
    g.fillStyle = '#000000'; g.fillRect(396, 96, 232, 18 + ws.length * 11);
    g.fillStyle = '#ddc39a'; g.fillRect(399, 99, 226, 12 + ws.length * 11);
    g.fillStyle = '#f0dcb0'; g.fillRect(399, 99, 226, 3);
    ws.forEach((l, i) => Font.draw(g, l, 512, 106 + i * 11, { scale: 1, color: '#3a2410', align: 'center' }));
    // the stock, laid out on the boards
    Font.draw(g, s.sub, LISTX, 138, { scale: 1, color: '#c9a878' });
    if (!all.length) {
      Font.draw(g, inside === 'pawn' ? 'NOTHING WORTH BUYING ON YOU' : 'SOLD OUT', LISTX, LISTY + 10, { scale: 1, color: '#8a6f45' });
    }
    for (let i = 0; i < PER; i++) {
      const r = all[page0 + i];
      if (!r) break;
      const y = LISTY + i * ROWH;
      const hot = hoverI === i;
      const can = r.sell || afford(r);
      g.fillStyle = '#000000'; g.fillRect(LISTX - 2, y - 2, LISTW + 4, ROWH - 2);
      g.fillStyle = hot ? '#ecd6ac' : '#c9a878'; g.fillRect(LISTX, y, LISTW, ROWH - 6);
      g.fillStyle = hot ? '#f7ecd2' : '#ddc39a'; g.fillRect(LISTX, y, LISTW, 2);
      // the thing itself, drawn small on the left of its row
      g.save();
      g.translate(LISTX + 16, y + ROWH - 9);
      if (r.furn) { const sc = Math.min(1, 20 / Math.max(r.furn.w, r.furn.h)); Props.drawFurniture(g, r.furn.key, 0, 2, sc); }
      else if (r.off) { Sprites.drawCube(g, r.off, 16, 14, { outline: '#000000' }); }
      else if (r.god) { g.fillStyle = '#000000'; g.fillRect(-8, -16, 16, 16); g.fillStyle = r.god.color; g.fillRect(-7, -15, 14, 14); g.fillStyle = r.god.eye; g.fillRect(-3, -11, 3, 3); }
      else if (r.wombat) {
        const wi = Sprites.wombat('idle', Math.floor(t * 4), 'brown', 1, 'adult');
        const sc = 0.6;
        g.drawImage(wi, -wi.width * sc / 2, -wi.height * sc + 5, Math.round(wi.width * sc), Math.round(wi.height * sc));
      }
      else if (r.icon) Icons.blit(g, r.icon, -8, -16, 1);
      g.restore();
      Font.draw(g, r.name.toUpperCase(), LISTX + 34, y + 5, { scale: 1, color: can ? '#3a2410' : '#8a6f45' });
      if (r.blurb) Font.draw(g, Font.wrap(r.blurb, 210, 1)[0], LISTX + 34, y + 15, { scale: 1, color: '#7a5a34' });
      if (r.n) Font.draw(g, 'x' + r.n, LISTX + LISTW - 96, y + 5, { scale: 1, color: '#7a5a34' });
      const pl = (r.sell ? '+' : '') + U.fmt(r.sell ? Math.round(r.price * 0.92) : r.price) + ' W$';
      Font.draw(g, pl, LISTX + LISTW - 8, y + 5, { scale: 1, color: r.sell ? '#3d6b1c' : (can ? '#7a4f06' : '#a03020'), align: 'right' });
    }
    // the pages, as two arrows cut in the boards
    const pages = Math.ceil(all.length / PER);
    if (pages > 1) {
      Font.draw(g, '< ' + (page + 1) + '/' + pages + ' >', LISTX + LISTW / 2, LISTY + PER * ROWH + 4, { scale: 1, color: '#c9a878', align: 'center' });
    }
    // the way out
    g.fillStyle = '#000000'; g.fillRect(16, H - 32, 70, 24);
    g.fillStyle = '#5a3a1c'; g.fillRect(19, H - 29, 64, 18);
    g.fillStyle = '#8c5c30'; g.fillRect(19, H - 29, 64, 2);
    Font.draw(g, 'OUT', 51, H - 24, { scale: 1, color: '#f0dcb0', align: 'center' });
  }
  // the junk on the shelves, which is how you tell whose shop you are in
  function clutter(g, key, sh, y) {
    const r = Art.rng(sh * 31 + key.length * 977);
    for (let i = 0; i < 6; i++) {
      const x = 340 + i * 48 + r() * 8;
      if (key === 'pawn') {
        const cols = ['#d8a41c', '#8fd4e4', '#c42a1e', '#a09ba8', '#7a6a9a'];
        const c = cols[Math.floor(r() * cols.length)];
        const w2 = 8 + Math.round(r() * 8), h2 = 10 + Math.round(r() * 12);
        g.fillStyle = '#000000'; g.fillRect(x - 1, y - h2 - 1, w2 + 2, h2 + 2);
        g.fillStyle = c; g.fillRect(x, y - h2, w2, h2);
        g.fillStyle = U.shade(c, 0.35); g.fillRect(x, y - h2, w2, 2);
      } else if (key === 'furn') {
        const w2 = 6 + Math.round(r() * 6), h2 = 14 + Math.round(r() * 16);
        g.fillStyle = '#000000'; g.fillRect(x - 1, y - h2 - 1, w2 + 2, h2 + 2);
        g.fillStyle = ['#6b4423', '#8c5c30', '#a87642'][Math.floor(r() * 3)];
        g.fillRect(x, y - h2, w2, h2);
        g.fillStyle = '#c9a878'; g.fillRect(x, y - h2, w2, 2);
      } else {
        const h2 = 12 + Math.round(r() * 10);
        g.fillStyle = '#000000'; g.fillRect(x - 1, y - h2 - 1, 12, h2 + 2);
        g.fillStyle = '#5e5a68'; g.fillRect(x, y - h2, 10, h2);
        g.fillStyle = '#a09ba8'; g.fillRect(x, y - h2, 10, 2);
        g.fillStyle = '#6b4423'; g.fillRect(x + 3, y - h2 + 4, 4, h2 - 4);
      }
    }
  }

  // ---- input ---------------------------------------------------------------
  function doorAt(sx) {
    const x = sx + camX;
    for (let i = 0; i < TOWN_SHOPS.length; i++) {
      const s = TOWN_SHOPS[i];
      if (x > s.x + 52 && x < s.x + 102) return i;
    }
    return -1;
  }
  function press(x, y) {
    if (!inside) {
      if (y > ROAD - 60) {
        const i = doorAt(x);
        if (i >= 0) { inside = TOWN_SHOPS[i].key; page = 0; hoverI = -1; say = ''; Audio.play('click'); return; }
      }
      return;
    }
    if (x < 90 && y > H - 34) { inside = null; hoverI = -1; Audio.play('click'); return; }
    const all = rows(), pages = Math.ceil(all.length / PER);
    if (pages > 1 && y > LISTY + PER * ROWH - 2 && y < LISTY + PER * ROWH + 18) {
      page = (page + (x < LISTX + LISTW / 2 ? pages - 1 : 1)) % pages;
      Audio.play('click'); return;
    }
    const i = rowAt(x, y);
    if (i >= 0) { const r = all[page * PER + i]; if (r) buy(r); }
  }
  function rowAt(x, y) {
    if (x < LISTX || x > LISTX + LISTW) return -1;
    const i = Math.floor((y - LISTY) / ROWH);
    if (i < 0 || i >= PER) return -1;
    if (y - LISTY - i * ROWH > ROWH - 6) return -1;
    return i;
  }
  function move(x, y) {
    if (inside) { hoverI = rowAt(x, y); return; }
    hoverI = y > ROAD - 60 ? doorAt(x) : -1;
    // walking the street: the view follows the pointer toward the edges
    if (x < 120) tCam = Math.max(0, tCam - (120 - x) * 0.06);
    else if (x > W - 120) tCam = Math.min(STREET - W, tCam + (x - (W - 120)) * 0.06);
  }
  function hover(x, y) {
    move(x, y);
    if (inside) {
      const r = rows()[page * PER + hoverI];
      if (!r) return null;
      return `<b>${r.name}</b>${r.blurb ? '<br>' + r.blurb : ''}<br>${r.sell ? 'Grimm pays <b>' + U.fmt(Math.round(r.price * 0.92)) + '</b> W$' : '<b>' + U.fmt(r.price) + '</b> W$'}`;
    }
    if (hoverI >= 0) { const s = TOWN_SHOPS[hoverI]; return `<b>${s.name}</b><br>${s.sub.toLowerCase()}`; }
    return null;
  }
  function release() { }
  function wheel(d) { if (!inside) tCam = U.clamp(tCam + d * 0.8, 0, STREET - W); }
  function key(k) {
    if (k === 'Escape' || k === 'Backspace') { if (inside) { inside = null; return true; } return false; }
    return false;
  }

  return { init, enter, leave, update, render, press, move, release, hover, wheel, key,
    get inside() { return inside; } };
})();
