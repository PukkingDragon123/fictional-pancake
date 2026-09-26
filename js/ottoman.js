// ---- Captain Clark's Ottoman Empire -----------------------------------------------
// A furniture showroom kept like the captain's cabin of an old liner: teal
// damask walls with gold in them, brass portholes onto a moving sea, a ship's
// wheel over the counter, and every piece on its own plinth with a tag hung
// off it. Captain Clark stands behind the counter by the door.
//
// At the far end there is a door marked STAFF ONLY. He will ask you not to.
// Behind it is Level 0: the back room of everywhere, yellow wallpaper, damp
// carpet, the buzz of the strip lights, going on forever. Walk far enough
// and you might find something that was lost in there.
const Ottoman = (() => {
  let G = null;
  const VW = 640, VH = 360;
  const FLOOR = 262;
  let t = 0, scroll = 0, tscroll = 0, worldW = 1800, drag = null, moved = 0, hover = null;
  let phase = 'shop', fade = 0, fadeTo = null;
  let slots = [];
  const clark = { x: 170, t: 0, pose: 'idle', say: '', sayT: 0 };
  // the back room
  let bx = 0, tbx = 0, glitch = 0, humT = 0, recT = 0;
  const DOOR_X = () => worldW - 120;

  // ---- stock ---------------------------------------------------------------------
  const stock = () => FURNITURE.filter((f) => !f.found);
  function layout() {
    slots = [];
    const own = stock().filter((f) => ['ottoman', 'pouf', 'armchair', 'sofa', 'rug', 'lamp', 'shelf', 'hammock', 'deck', 'helm', 'anchor'].includes(f.key));
    const yard = stock().filter((f) => !own.includes(f));
    let x = 330;
    const bays = [];
    const place = (arr, label) => {
      const x0 = x;
      for (const f of arr) { slots.push({ f, x }); x += Math.max(96, f.w * 2 + 36); }
      bays.push({ label, x0, x1: x - 60 });
      x += 60;
    };
    place(own, "THE CAPTAIN'S OWN");
    place(yard, 'FOR THE GARDEN');
    layout.bays = bays;
    worldW = x + 260;
  }
  function crateCount(key) { return (G.crates && G.crates[key]) || 0; }
  function placed(key) { return (G.furniture || []).filter((f) => f.key === key).length; }

  // ---- the captain talks ------------------------------------------------------------
  function clarkSay(s) { clark.say = s; clark.sayT = 3.4; }
  function buy(f) {
    if (G.wd < f.cost) { Audio.play('error'); clarkSay("Short on doubloons, matey."); UI.toast(`need <b>${f.cost} W$</b>`, 'bad'); return; }
    G.wd -= f.cost;
    if (!G.crates) G.crates = {};
    G.crates[f.key] = (G.crates[f.key] || 0) + 1;
    Audio.play('cash'); FX.confettiBurst(VW / 2, 150, 40);
    clarkSay(U.pick(['A fine choice!', 'Sold, to the wombat farmer!', 'She\'ll serve you well.', 'Mind the corners going out.']));
    clark.pose = 'wave'; clark.t = 0;
    // furniture wants a hammer to stand it up, and the Captain throws one in
    if (!owns(G, 'build')) {
      G.owned.build = true; if (!G.unlocked) G.unlocked = {}; G.unlocked.build = true;
      if (!G.newTools) G.newTools = {}; G.newTools.build = true;
      UI.unlockCard('build', true);
    } else UI.toast(`<b>${f.name}</b> is in a crate &mdash; set it out with the hammer`, 'good');
    UI.refreshHUD(); Main.save();
  }
  function offer(f) {
    const have = crateCount(f.key) + placed(f.key);
    Talk.open('villager:clark', { start: 'a', nodes: {
      a: { mood: 'happy', say: `The ${f.name}. ${f.blurb} Yours for ${f.cost} W$.${have ? ` You've got ${have} already.` : ''}`,
        opts: [
          { q: `Buy it for ${f.cost} W$`, act: () => buy(f) },
          { q: 'Just looking, Captain.', end: true },
        ] },
    } });
  }
  const TREE = {
    start: 'hub',
    nodes: {
      hub: { mood: 'happy', say: "Ahoy! Captain Clark, Ottoman Empire. Finest furniture this side of the Bass Strait. Have a look round, click anything you fancy.",
        opts: [
          { q: 'Why "Ottoman Empire"?', to: 'name' },
          { q: 'What is behind the door at the back?', to: 'door' },
          { q: 'Were you really a captain?', to: 'captain' },
          { q: 'Just browsing.', end: true },
        ] },
      name: { mood: 'laugh', say: "Started with ottomans. Then I had a lot of ottomans. Then I had an empire of them. The sofas came later.", opts: [{ q: 'Fair enough.', to: 'hub' }] },
      door: { mood: 'worry', say: "The back room. Don't. I went in for a spare leg for a stool in 1998. Came out three weeks later. Yellow wallpaper, wet carpet, and that hum. Always the hum.", opts: [{ q: 'How big is it?', to: 'big' }, { q: 'Right. Not going in.', to: 'hub' }] },
      big: { mood: 'shock', say: "No end to it, far as I could tell. If you do go in, find a green EXIT sign and don't stop walking. And if you see something tall at the end of a hall, it isn't staff.", opts: [{ q: 'Noted.', to: 'hub' }] },
      captain: { mood: 'proud', say: "Thirty years at sea! Well. On the ferry. Well. Mostly the ferry. That wheel over there's off her. Don't ask how she sank.", opts: [{ q: 'She sank?', to: 'sank' }, { q: 'Good wheel.', to: 'hub' }] },
      sank: { mood: 'sly', say: "I said don't ask.", opts: [{ q: 'Sorry, Captain.', to: 'hub' }] },
    },
  };
  function knock() {
    Talk.open('villager:clark', { start: 'a', nodes: {
      a: { mood: 'shock', say: "Oi! Not the back room! I'm telling you, it goes on forever and it smells like wet carpet.",
        opts: [
          { q: 'Go in anyway.', act: () => { Talk.close(); enterBack(); } },
          { q: 'Leave it shut.', end: true },
        ] },
    } });
  }

  // ---- scene flow ---------------------------------------------------------------------
  function enter() {
    layout();
    phase = 'shop'; scroll = tscroll = 0; hover = null; t = 0; fade = 1; fadeTo = null;
    document.body.classList.remove('noclip');
    clark.pose = 'idle'; clark.t = 0;
    clarkSay('Ahoy there!');
    Audio.setMode('pen'); Audio.play('door');
  }
  function enterBack() {
    fadeTo = () => {
      phase = 'back'; bx = tbx = 0; glitch = 1.2; recT = 0;
      document.body.classList.add('noclip');
      G.stats.backrooms = (G.stats.backrooms || 0) + 1;
      Audio.play('whoosh');
    };
  }
  function leaveBack() {
    fadeTo = () => { document.body.classList.remove('noclip'); phase = 'shop'; tscroll = scroll = worldW - VW; clarkSay("Told you. Put the kettle on."); Audio.play('door'); };
  }
  function leave() { Main.setMode('map'); }
  function update(dt) {
    t += dt; clark.t += dt;
    if (clark.sayT > 0) clark.sayT -= dt;
    if (clark.pose === 'wave' && clark.t > 1.6) clark.pose = 'idle';
    if (fadeTo) { fade = Math.min(1, fade + dt * 2.6); if (fade >= 1) { const f = fadeTo; fadeTo = null; f(); } }
    else fade = Math.max(0, fade - dt * 2);
    scroll = U.lerp(scroll, tscroll, 1 - Math.pow(0.002, dt));
    if (phase === 'back') {
      bx = U.lerp(bx, tbx, 1 - Math.pow(0.004, dt));
      recT += dt;
      glitch = Math.max(0, glitch - dt);
      humT -= dt;
      if (humT <= 0) { humT = 1.3; Audio.play('hum'); }
      if (Math.random() < dt * 0.25) glitch = Math.max(glitch, 0.12);
    }
  }

  // ---- input -----------------------------------------------------------------------------
  function slotAt(x, y) {
    for (const s of slots) {
      const sx = s.x - scroll, w = Math.max(40, s.f.w * 2) / 2 + 8;
      if (x > sx - w && x < sx + w && y > FLOOR - s.f.h * 2 - 26 && y < FLOOR + 14) return s;
    }
    return null;
  }
  const overClark = (x, y) => Math.abs(x - (clark.x - scroll)) < 26 && y > 150 && y < FLOOR;
  const overDoor = (x, y) => Math.abs(x - (DOOR_X() - scroll)) < 34 && y > 120 && y < FLOOR;
  function press(x, y) { drag = { x, s: phase === 'shop' ? tscroll : tbx }; moved = 0; }
  function move(x, y) {
    if (!drag) return;
    moved = Math.max(moved, Math.abs(x - drag.x));
    if (phase === 'shop') { tscroll = U.clamp(drag.s - (x - drag.x), 0, worldW - VW); scroll = tscroll; }
    else { tbx = Math.max(0, drag.s - (x - drag.x) * 1.4); }
  }
  function release(x, y) {
    if (!drag) return;
    const was = moved > 6; drag = null;
    if (was || fadeTo) return;
    if (phase === 'back') { pressBack(x, y); return; }
    const s = slotAt(x, y);
    if (s) { offer(s.f); return; }
    if (overClark(x, y)) { Talk.open('villager:clark', TREE); return; }
    if (overDoor(x, y)) { knock(); }
  }
  function hoverAt(x, y) {
    if (phase === 'back') {
      const th = backThingAt(x, y);
      return th ? th.tip : null;
    }
    const s = slotAt(x, y);
    hover = s;
    if (overClark(x, y)) return '<b>Captain Clark</b> <span class="dim">the Ottoman Empire</span><br>click to talk';
    if (overDoor(x, y)) return '<b>STAFF ONLY</b><br><span class="warn">do not go in the back room</span>';
    if (!s) return null;
    const f = s.f, have = crateCount(f.key) + placed(f.key);
    return `<b>${f.name}</b><br>${Icons.img('wdollar', 'sm')} ${U.fmt(f.cost)}${have ? ` &middot; <span class="dim">you have ${have}</span>` : ''}<br><span class="dim">${f.blurb}</span>`;
  }
  function wheel(dy) {
    if (phase === 'shop') tscroll = U.clamp(tscroll + dy, 0, worldW - VW);
    else tbx = Math.max(0, tbx + dy * 1.2);
  }

  // ---- the showroom ------------------------------------------------------------------------
  const PAPER = ['#0e4a4e', '#136066', '#1a7a80'], GOLD = ['#8a5a0e', '#d8a020', '#ffd860'];
  function drawWall(g, S) {
    // teal damask: a flock pattern of gold diamonds on stripes
    g.fillStyle = PAPER[1]; g.fillRect(0, 0, VW, 206);
    for (let x = -(S % 40) - 40; x < VW + 40; x += 40) {
      g.fillStyle = PAPER[0]; g.fillRect(x, 0, 20, 206);
      for (let y = 14; y < 200; y += 32) {
        const cx = x + 20 + ((y / 32) % 2 ? 0 : 0);
        Art.poly(g, [[cx, y - 8], [cx + 6, y], [cx, y + 8], [cx - 6, y]], 'rgba(216,160,32,0.28)');
        g.fillStyle = 'rgba(255,216,96,0.4)'; g.fillRect(cx - 1, y - 1, 2, 2);
      }
    }
    // crown moulding, picture rail, and a dado of dark panelling
    g.fillStyle = '#3a1a08'; g.fillRect(0, 0, VW, 12); g.fillStyle = GOLD[1]; g.fillRect(0, 12, VW, 3); g.fillStyle = GOLD[2]; g.fillRect(0, 12, VW, 1);
    g.fillStyle = '#5a2a10'; g.fillRect(0, 196, VW, 10); g.fillStyle = GOLD[1]; g.fillRect(0, 196, VW, 2);
    g.fillStyle = '#4a1e0a'; g.fillRect(0, 206, VW, FLOOR - 206);
    for (let x = -(S % 70); x < VW + 70; x += 70) {
      g.fillStyle = '#5e2a10'; g.fillRect(x + 6, 212, 58, FLOOR - 220);
      g.fillStyle = '#7a3a18'; g.fillRect(x + 6, 212, 58, 2); g.fillStyle = '#2e1206'; g.fillRect(x + 6, FLOOR - 10, 58, 2);
    }
    g.fillStyle = '#2a0e04'; g.fillRect(0, FLOOR - 6, VW, 6);
  }
  function porthole(g, x, y) {
    Art.ell(g, x, y, 23, 23, '#3a2206'); Art.ell(g, x, y, 21, 21, GOLD[1]); Art.ell(g, x - 3, y - 3, 17, 17, GOLD[2]); Art.ell(g, x, y, 17, 17, GOLD[0]);
    Art.ell(g, x, y, 15, 15, '#6ac0f0');
    g.save(); g.beginPath(); g.arc(x, y, 15, 0, TAU); g.clip();
    g.fillStyle = '#a8e0ff'; g.fillRect(x - 15, y - 15, 30, 12);
    for (let i = 0; i < 4; i++) {
      const wy = y + i * 4 + Math.sin(t * 2 + i + x) * 1.5;
      g.fillStyle = ['#1a6ab8', '#1a5aa0', '#124a88', '#0e3a70'][i]; g.fillRect(x - 16, wy, 32, 6);
      g.fillStyle = '#e0f4ff'; g.fillRect(x - 12 + ((t * 10 + i * 7) % 20), wy, 4, 1);
    }
    g.restore();
    for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; Art.ell(g, x + Math.cos(a) * 19, y + Math.sin(a) * 19, 1.6, 1.6, GOLD[2]); }   // rivets
    Art.ell(g, x - 6, y - 7, 4, 2.5, 'rgba(255,255,255,0.55)');
  }
  function lamp(g, x) {
    g.fillStyle = '#2a1a08'; g.fillRect(x, 15, 1, 26);
    Art.poly(g, [[x - 10, 50], [x + 11, 50], [x + 6, 40], [x - 5, 40]], GOLD[1]);
    Art.rect(g, x - 10, 49, 21, 2, GOLD[0]);
    Art.ell(g, x, 52, 4, 3, '#fff6c0');
    const f = 0.18 + 0.03 * Math.sin(t * 5 + x);
    Art.glow(g, x, 60, 90, '#ffd070', f, 5);
  }
  function frame(g, x, y, w, h, fn) {
    Art.rect(g, x - 4, y - 4, w + 8, h + 8, GOLD[0]); Art.rect(g, x - 3, y - 3, w + 6, h + 6, GOLD[1]); Art.rect(g, x - 3, y - 3, w + 6, 1, GOLD[2]);
    Art.rect(g, x, y, w, h, '#0e1a2a'); fn(g, x, y, w, h);
  }
  function drawShip(g, x, y, w, h) {
    Art.vramp(g, x, y, w, h * 0.6, [[0, '#f0a060'], [1, '#ffd8a0']], 5);
    g.fillStyle = '#1a4a88'; g.fillRect(x, y + h * 0.6, w, h * 0.4);
    g.fillStyle = '#5a2a10'; g.fillRect(x + w * 0.25, y + h * 0.52, w * 0.5, 5);
    g.fillStyle = '#f4f0e0'; Art.poly(g, [[x + w * 0.5, y + 6], [x + w * 0.5, y + h * 0.5], [x + w * 0.3, y + h * 0.5]], '#f4f0e0');
    Art.poly(g, [[x + w * 0.52, y + 10], [x + w * 0.52, y + h * 0.5], [x + w * 0.7, y + h * 0.5]], '#e8e0cc');
    Font.draw(g, 'HMS OTTOMAN', x + w / 2, y + h - 8, { scale: 1, color: '#ffe8a0', align: 'center' });
  }
  function drawFloor(g, S) {
    g.fillStyle = '#6a3414'; g.fillRect(0, FLOOR, VW, VH - FLOOR);
    for (let row = 0; row < 8; row++) {
      const y = FLOOR + row * 13;
      for (let x = -((S * 1.05) % 48) - 48 + (row % 2) * 24; x < VW + 48; x += 48) {
        const k = (Math.floor((x + S) / 48) + row) % 3;
        g.fillStyle = ['#8a4a1c', '#a05a24', '#7a4018'][k]; g.fillRect(x, y, 46, 12);
        g.fillStyle = 'rgba(255,220,160,0.18)'; g.fillRect(x, y, 46, 1);
        g.fillStyle = '#4a200a'; g.fillRect(x + 46, y, 2, 13);
      }
      g.fillStyle = '#4a200a'; g.fillRect(0, y + 12, VW, 1);
    }
    // a long runner rug down the showroom
    const ry = FLOOR + 30;
    g.fillStyle = '#7a0e1a'; g.fillRect(0, ry, VW, 40); g.fillStyle = '#b8182a'; g.fillRect(0, ry + 3, VW, 34);
    g.fillStyle = '#e8a020'; g.fillRect(0, ry + 6, VW, 2); g.fillRect(0, ry + 32, VW, 2);
    for (let x = -(S % 30); x < VW + 30; x += 30) { Art.poly(g, [[x, ry + 20], [x + 8, ry + 12], [x + 16, ry + 20], [x + 8, ry + 28]], '#1c3a8a'); g.fillStyle = '#f4d060'; g.fillRect(x + 7, ry + 19, 2, 2); }
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(0, FLOOR, VW, 4);
  }
  function drawSlot(g, s) {
    const x = s.x - scroll, f = s.f, sc = f.w > 50 ? 1.6 : 2;
    const pw = Math.max(40, f.w * sc) + 16;
    const hot = hover === s;
    // the plinth
    Art.rect(g, x - pw / 2, FLOOR - 10, pw, 12, '#2a1208');
    Art.rect(g, x - pw / 2 + 2, FLOOR - 10, pw - 4, 10, hot ? '#f4e0b0' : '#e8d0a0');
    Art.rect(g, x - pw / 2 + 2, FLOOR - 10, pw - 4, 2, '#fff4d8');
    Art.rect(g, x - pw / 2 + 2, FLOOR - 3, pw - 4, 1, '#b89868');
    const img = Props.furniture(f.key);
    if (img) {
      const w = img.width * sc, h = img.height * sc;
      g.fillStyle = 'rgba(0,0,0,0.25)'; Art.ell(g, x, FLOOR - 9, w * 0.45, 3);
      g.drawImage(img, Math.round(x - w / 2), Math.round(FLOOR - 10 - h + (hot ? -2 : 0)), Math.round(w), Math.round(h));
    }
    if (hot) Art.glow(g, x, FLOOR - 30, 60, '#fff0a0', 0.12, 4);
    // the price tag on its string
    const tag = f.cost + ' W$';
    const tw = Font.width(tag, 1) + 10, ty = FLOOR + 6;
    Art.rect(g, x - tw / 2 - 1, ty - 1, tw + 2, 14, '#5a2008');
    Art.rect(g, x - tw / 2, ty, tw, 12, hot ? '#ffe680' : '#fff4d0');
    Art.rect(g, x - tw / 2, ty + 10, tw, 2, '#e0b060');
    Font.draw(g, tag, x, ty + 3, { scale: 1, color: '#5a2008', align: 'center' });
    if (crateCount(f.key) + placed(f.key)) { Art.rect(g, x + tw / 2 - 3, ty - 4, 6, 6, '#2a8a3a'); Art.rect(g, x + tw / 2 - 2, ty - 2, 4, 1, '#ffffff'); }
  }
  function drawCounter(g) {
    const x = clark.x - scroll;
    // behind him: the ship's wheel on the wall, a shelf with a ship in a bottle
    Props.drawFurniture(g, 'helm', x + 4, 130, 1.4);
    // the counter
    Art.rect(g, x - 70, FLOOR - 52, 140, 52, '#2a0e04');
    Art.rect(g, x - 68, FLOOR - 50, 136, 48, '#7a3614');
    for (let i = 0; i < 4; i++) { Art.rect(g, x - 62 + i * 34, FLOOR - 44, 28, 36, '#8a4418'); Art.rect(g, x - 62 + i * 34, FLOOR - 44, 28, 2, '#a85a28'); }
    Art.rect(g, x - 74, FLOOR - 56, 148, 6, '#a85a28'); Art.rect(g, x - 74, FLOOR - 56, 148, 1, '#e08a48');
    // brass bell and a cash register
    Art.ell(g, x - 40, FLOOR - 58, 6, 5, GOLD[1]); Art.ell(g, x - 42, FLOOR - 60, 2, 2, GOLD[2]); Art.rect(g, x - 47, FLOOR - 57, 14, 2, GOLD[0]);
    Art.rect(g, x + 26, FLOOR - 76, 34, 20, '#2a2a34'); Art.rect(g, x + 28, FLOOR - 74, 30, 8, '#4ac070'); Font.draw(g, 'W$', x + 43, FLOOR - 73, { scale: 1, color: '#0a3a18', align: 'center' });
    for (let i = 0; i < 6; i++) Art.rect(g, x + 29 + (i % 3) * 10, FLOOR - 64 + Math.floor(i / 3) * 4, 8, 3, '#e0dcd0');
    // the captain, behind it from the waist up
    const pose = clark.pose === 'wave' ? 'wave' : Talk.isOpen() ? 'talk' : 'idle';
    const img = Sprites.villager('clark', Math.floor(clark.t * 6), pose);
    const sc = 2.4, w = img.width * sc, h = img.height * sc;
    g.save(); g.beginPath(); g.rect(x - 60, 0, 120, FLOOR - 55); g.clip();
    g.drawImage(img, Math.round(x - w / 2), Math.round(FLOOR - 30 - h + 20), Math.round(w), Math.round(h));
    g.restore();
    if (clark.sayT > 0 && !Talk.isOpen()) Kit.bubble(g, x, FLOOR - 124, clark.say);
  }
  function drawDoor(g) {
    const x = DOOR_X() - scroll;
    if (x < -60 || x > VW + 60) return;
    Art.rect(g, x - 30, 108, 60, FLOOR - 108, '#1a0a04');
    Art.rect(g, x - 26, 112, 52, FLOOR - 112, '#5a4a2a');
    Art.rect(g, x - 22, 116, 44, 60, '#6a5a34'); Art.rect(g, x - 22, 182, 44, 70, '#6a5a34');
    Art.rect(g, x + 14, 188, 5, 5, GOLD[1]);
    // the yellow light leaking under it, and the sign that should stop you
    const fl = Math.sin(t * 17) > 0.7 ? 0.25 : 0.55;
    g.fillStyle = `rgba(255,240,140,${fl})`; g.fillRect(x - 26, FLOOR - 3, 52, 3);
    Art.glow(g, x, FLOOR, 50, '#fff080', fl * 0.3, 4);
    Art.rect(g, x - 26, 124, 52, 22, '#a01a1a'); Art.rect(g, x - 24, 126, 48, 18, '#e02a2a');
    Font.draw(g, 'STAFF', x, 128, { scale: 1, color: '#ffffff', align: 'center' });
    Font.draw(g, 'ONLY', x, 137, { scale: 1, color: '#ffffff', align: 'center' });
    Art.rect(g, x - 18, 154, 36, 10, '#f4f0e0'); Font.draw(g, 'NO NOCLIP', x, 156, { scale: 1, color: '#2a2a2a', align: 'center' });
  }
  function renderShop(g) {
    const S = scroll;
    drawWall(g, S);
    for (let x = 880; x < worldW; x += 300) { const px = x - S; if (px > -40 && px < VW + 40) porthole(g, px, 96); }
    { const fx = 640 - S; if (fx > -80 && fx < VW + 80) frame(g, fx - 36, 64, 72, 54, drawShip); }
    // the shop sign over the door
    const sx = 385 - S;
    if (sx > -140 && sx < VW + 140) {
      Art.rect(g, sx - 50, 24, 170, 44, '#2a0e04'); Art.rect(g, sx - 48, 26, 166, 40, '#0e2a5a'); Art.rect(g, sx - 46, 28, 162, 36, '#1c4088');
      Art.rect(g, sx - 46, 28, 162, 2, '#4a70c0');
      Font.draw(g, "CAPTAIN CLARK'S", sx + 35, 32, { scale: 1, color: GOLD[2], align: 'center' });
      Font.draw(g, 'OTTOMAN EMPIRE', sx + 35, 43, { scale: 1, color: '#ffffff', align: 'center' });
      Font.draw(g, 'fine furniture - est. 1974', sx + 35, 54, { scale: 1, color: '#a8c0f0', align: 'center' });
    }
    for (let x = 150; x < worldW; x += 190) { if (Math.abs(x - 420) < 120) continue; const lx = x - S; if (lx > -60 && lx < VW + 60) lamp(g, lx); }
    for (const b of (layout.bays || [])) {
      const cx = (b.x0 + b.x1) / 2 - S, w = Font.width(b.label, 1) + 24;
      if (cx < -w || cx > VW + w) continue;
      Art.rect(g, cx - w / 2, 150, w, 18, '#2a0e04'); Art.rect(g, cx - w / 2 + 2, 152, w - 4, 14, GOLD[1]); Art.rect(g, cx - w / 2 + 2, 152, w - 4, 2, GOLD[2]);
      Font.draw(g, b.label, cx, 156, { scale: 1, color: '#3a1a04', align: 'center' });
    }
    drawDoor(g);
    drawFloor(g, S);
    drawCounter(g);
    for (const s of slots) { const x = s.x - S; if (x > -90 && x < VW + 90) drawSlot(g, s); }
    Art.vignette(g, VW, VH, '#1a0804', 0.4, 2.4, 0.4);
    if (tscroll < 20 && t < 6) {
      g.globalAlpha = 0.5 + 0.5 * Math.sin(t * 4);
      Kit.pill(g, VW - 140, VH - 22, 'DRAG TO LOOK ROUND >');
      g.globalAlpha = 1;
    }
  }

  // ---- Level 0 -------------------------------------------------------------------------------
  // Drawn as the shop is: a long side-on corridor you drag along. It is made of
  // segments, each decided by its own number, so it never ends and never
  // repeats quite the same way twice.
  const SEG = 160;
  const hash = (n) => { let x = (n * 374761393) | 0; x = (x ^ (x >>> 13)) * 1274126177; return ((x ^ (x >>> 16)) >>> 0) / 4294967296; };
  const EXIT_EVERY = 9, LOST_AT = 26, WATER_AT = 11;
  function segKind(i) {
    if (i > 0 && i % EXIT_EVERY === 0) return 'exit';
    if (i === LOST_AT) return 'lost';
    if (i === WATER_AT) return 'water';
    const h = hash(i + 7);
    return h < 0.34 ? 'door' : h < 0.55 ? 'pillar' : h < 0.7 ? 'dark' : 'wall';
  }
  function backThingAt(x, y) {
    const i0 = Math.floor((bx - 40) / SEG), i1 = Math.floor((bx + VW + 40) / SEG);
    for (let i = i0; i <= i1; i++) {
      const k = segKind(i), sx = i * SEG - bx + SEG / 2;
      if (k === 'exit' && Math.abs(x - sx) < 34 && y > 120 && y < 270) return { k, i, tip: '<b>EXIT</b><br>back to the showroom' };
      if (k === 'lost' && !(G.found && G.found.lostottoman) && Math.abs(x - sx) < 40 && y > 230 && y < 300) return { k, i, tip: '<b>An ottoman?</b><br><span class="dim">out here?</span>' };
      if (k === 'water' && !(G.found && G.found.water) && Math.abs(x - sx) < 20 && y > 240 && y < 300) return { k, i, tip: '<b>A bottle of almond water</b>' };
    }
    return null;
  }
  function pressBack(x, y) {
    const th = backThingAt(x, y);
    if (!th) return;
    if (!G.found) G.found = {};
    if (th.k === 'exit') { leaveBack(); return; }
    if (th.k === 'water') {
      G.found.water = 1; Audio.play('pop');
      for (const w of G.wombats) w.hap = Math.min(100, w.hap + 10);
      UI.toast('<b>Almond water.</b> Tastes like nothing. Everyone at home feels a bit better.', 'good');
      Main.save();
    }
    if (th.k === 'lost') {
      G.found.lostottoman = 1;
      if (!G.crates) G.crates = {};
      G.crates.lostottoman = (G.crates.lostottoman || 0) + 1;
      if (!owns(G, 'build')) { G.owned.build = true; G.unlocked.build = true; }
      Audio.play('levelup'); glitch = 1;
      UI.toast('<b>The Lost Ottoman</b> is yours. It hums very quietly. Set it out with the hammer.', 'good');
      Main.save();
    }
  }
  const YEL = ['#b8a24a', '#cdb85a', '#dccb6e', '#e8da88'];
  function renderBack(g) {
    const off = bx;
    const WALL0 = 58, WALL1 = 246;
    // the drop ceiling
    g.fillStyle = '#d8d0a4'; g.fillRect(0, 0, VW, WALL0);
    for (let x = -(off % 48); x < VW; x += 48) { g.fillStyle = '#b8b08a'; g.fillRect(x, 0, 2, WALL0); }
    for (let y = 0; y < WALL0; y += 19) { g.fillStyle = '#b8b08a'; g.fillRect(0, y, VW, 2); }
    // the wallpaper: mono-yellow, with that faint repeating pattern
    g.fillStyle = YEL[2]; g.fillRect(0, WALL0, VW, WALL1 - WALL0);
    for (let x = -(off % 24); x < VW + 24; x += 24) {
      g.fillStyle = YEL[1]; g.fillRect(x, WALL0, 2, WALL1 - WALL0);
      for (let y = WALL0 + 8; y < WALL1; y += 22) { g.fillStyle = YEL[1]; g.fillRect(x + 10, y, 4, 4); g.fillStyle = YEL[3]; g.fillRect(x + 11, y + 1, 2, 2); }
    }
    const i0 = Math.floor(off / SEG) - 1, i1 = Math.floor((off + VW) / SEG) + 1;
    for (let i = i0; i <= i1; i++) {
      if (i < 0) continue;
      const k = segKind(i), x = i * SEG - off;
      if (k === 'door' || k === 'exit' || k === 'dark' || k === 'lost') {
        // an opening onto more of the same, further away and dimmer
        const dw = k === 'dark' ? 70 : 84, dx = x + SEG / 2 - dw / 2;
        g.fillStyle = k === 'dark' ? '#6a5e2a' : YEL[1]; g.fillRect(dx, 100, dw, WALL1 - 100);
        g.fillStyle = k === 'dark' ? '#4a4020' : YEL[0]; g.fillRect(dx + 10, 118, dw - 20, WALL1 - 118);
        g.fillStyle = k === 'dark' ? '#2e2812' : '#a8923e'; g.fillRect(dx + 22, 132, dw - 44, WALL1 - 132);
        g.fillStyle = '#8a7a38'; g.fillRect(dx, 100, dw, 3); g.fillRect(dx, 100, 3, WALL1 - 100); g.fillRect(dx + dw - 3, 100, 3, WALL1 - 100);
        // something tall, at the far end of a dark hall, that is gone if you look properly
        if (k === 'dark' && i > 12 && hash(i * 3) < 0.5 && glitch <= 0 && Math.abs(x + SEG / 2 - VW / 2) > 120) {
          g.fillStyle = '#141008'; g.fillRect(x + SEG / 2 - 3, 148, 6, 58); g.fillRect(x + SEG / 2 - 5, 138, 10, 12);
          g.fillStyle = '#141008'; g.fillRect(x + SEG / 2 - 7, 160, 2, 34); g.fillRect(x + SEG / 2 + 5, 160, 2, 34);
        }
      }
      if (k === 'pillar') {
        const px = x + SEG / 2 - 14;
        g.fillStyle = YEL[3]; g.fillRect(px, WALL0, 28, WALL1 - WALL0 + 30);
        g.fillStyle = YEL[1]; g.fillRect(px + 22, WALL0, 6, WALL1 - WALL0 + 30);
        g.fillStyle = '#8a7a38'; g.fillRect(px, WALL1 + 26, 28, 4);
      }
      if (k === 'exit') {
        const ex = x + SEG / 2;
        g.fillStyle = '#0a2a10'; g.fillRect(ex - 20, 80, 40, 16);
        g.fillStyle = Math.sin(t * 3) > -0.8 ? '#30e060' : '#1a8a3a'; g.fillRect(ex - 18, 82, 36, 12);
        Font.draw(g, 'EXIT', ex, 85, { scale: 1, color: '#eaffee', align: 'center' });
        Art.glow(g, ex, 88, 50, '#50ff80', 0.18, 4);
      }
      // the strip lights, one per segment, some of them dying
      const lx = x + 40, flick = hash(i * 11) < 0.25 && Math.sin(t * (13 + i) + i) > 0.2;
      g.fillStyle = '#8a846a'; g.fillRect(lx - 2, 22, 84, 14);
      g.fillStyle = flick ? '#b8b490' : '#fffff0'; g.fillRect(lx, 24, 80, 10);
      if (!flick) Art.glow(g, lx + 40, 40, 90, '#fff8c0', 0.07, 3);
    }
    // the carpet: damp, the colour of old mustard, stained in patches
    g.fillStyle = '#9a8a48'; g.fillRect(0, WALL1, VW, VH - WALL1);
    for (let y = WALL1; y < VH; y += 3) for (let x = -(off % 6); x < VW; x += 6) { g.fillStyle = (x + y + Math.floor(off / 6)) % 4 ? '#8e7e40' : '#a89650'; g.fillRect(x, y, 3, 1); }
    for (let i = i0; i <= i1; i++) {
      if (hash(i * 5) < 0.6) { const sx = i * SEG - off + hash(i) * SEG; Art.ell(g, sx, 300 + hash(i * 2) * 40, 26 + hash(i * 9) * 30, 7, 'rgba(90,76,30,0.35)'); }
      const k = segKind(i), x = i * SEG - off + SEG / 2;
      if (k === 'lost' && !(G.found && G.found.lostottoman)) { Art.glow(g, x, 270, 40, '#fff4a0', 0.2 + 0.1 * Math.sin(t * 3), 4); Props.drawFurniture(g, 'lostottoman', x, 284, 2); }
      if (k === 'water' && !(G.found && G.found.water)) { Art.rect(g, x - 4, 262, 8, 18, '#e8f0f4'); Art.rect(g, x - 3, 264, 6, 12, '#f8f4e0'); Art.rect(g, x - 2, 258, 4, 4, '#4a8ac0'); Font.draw(g, 'A', x, 267, { scale: 1, color: '#8a6a3a', align: 'center' }); }
    }
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, WALL1, VW, 4);
    // found footage: grain, a wobble, REC and the timestamp
    for (let i = 0; i < 120; i++) { g.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)'; g.fillRect(Math.random() * VW, Math.random() * VH, 2, 1); }
    if (glitch > 0) {
      for (let i = 0; i < 8; i++) { const y = Math.random() * VH, h = 2 + Math.random() * 8; g.drawImage(g.canvas, 0, y * (g.canvas.height / VH), g.canvas.width, h, (Math.random() - 0.5) * 20, y, VW, h); }
    }
    Art.vignette(g, VW, VH, '#1a1404', 0.55, 2.2, 0.35);
    if (Math.floor(recT * 1.5) % 2 === 0) Art.ell(g, 20, 20, 4, 4, '#ff2020');
    Font.draw(g, 'REC', 30, 16, { scale: 1, color: '#ffffff' });
    const secs = Math.floor(recT), stamp = `JUL 17 1998  ${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`;
    Font.draw(g, stamp, VW - 14, 16, { scale: 1, color: '#ffffff', align: 'right' });
    const depth = Math.floor(bx / 10);
    Font.draw(g, `LEVEL 0  -  ${depth} m in`, 14, VH - 16, { scale: 1, color: '#fff8d0' });
    if (recT < 5) {
      g.globalAlpha = Math.min(1, recT, 5 - recT);
      Kit.card(g, VW / 2 - 150, 120, 300, 54, {});
      Font.draw(g, 'YOU NOCLIPPED INTO THE BACK ROOM', VW / 2, 132, { scale: 1, color: Kit.C.ink, align: 'center' });
      Font.draw(g, 'drag to walk. find a green EXIT sign.', VW / 2, 148, { scale: 1, color: Kit.C.ink2, align: 'center' });
      g.globalAlpha = 1;
    }
  }

  function render(g) {
    if (phase === 'shop') renderShop(g); else renderBack(g);
    if (fade > 0) { g.fillStyle = phase === 'back' || fadeTo ? `rgba(20,16,4,${fade.toFixed(2)})` : `rgba(20,8,4,${fade.toFixed(2)})`; g.fillRect(0, 0, VW, VH); }
    FX.drawParticles(g, 0); FX.drawConfetti(g); FX.drawFloaters(g, false); FX.drawComics(g, false);
  }

  return {
    init(g) { G = g; }, enter, leave, update, render, press, move, release, hover: hoverAt, wheel,
    get phase() { return phase; }, enterBack, leaveBack, layout,
    get slots() { return slots; }, walk(d) { tbx = Math.max(0, tbx + d); bx = tbx; },
  };
})();
