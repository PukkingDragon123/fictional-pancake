// ---- Groot's Greenhouse ----------------------------------------------------
// A glass dome full of plants, most of them legal. Groot walks the aisle,
// tells you about whatever you are standing next to, and sells seed over a
// potting bench. Everything here is grown, so the stock is the crop list plus
// the five things at the back that should not really be in a garden.
const Nursery = (() => {
  let G = null;
  const VW = 640, VH = 360;
  const FLOOR = 318, BENCH = 252;
  let slots = [], scroll = 0, tscroll = 0, worldW = 1500, hover = null;
  let drag = null, moved = 0, t = 0;
  const basket = [];
  const motes = [], drips = [];

  // Groot walks a beat, stops, says something about what he is standing by
  const groot = { x: 300, tx: 300, dir: 1, pose: 'idle', t: 0, poseT: 0, say: 0, line: 0, hop: 0 };
  const LINES = [
    'I am Groot. That means welcome, by the way.',
    'Mandrake screams. Ear plugs are behind the till.',
    'Moonbell only opens at night. Plant it where it can see the sky.',
    'Do not put your fingers near the snapjaw. I am serious.',
    'Emberleaf is warm to hold. It likes a dry bed.',
    'Whisperfern repeats what you say. Mind what you say.',
    'Water it. Everything. Water is the whole of the job.',
    'That one is my cousin. Distantly.',
    'A wombat will eat any of these. That is not my problem.',
    'Sunroot is the one to start with. Cheap and forgiving.',
    'Goldwheat pays best, but it is slow. Like me.',
    'The dome keeps the frost off. It does not keep the possums off.',
    'I grew the bench. Out of my own arm. Long story.',
    'Take a cutting if you like. Not from me.',
    'Runeberry glows. Do not look at it for too long.',
    'The soil here is mostly composted wombat. It works.',
    'Every plant in here wants something. Most of it is water.',
    'I am Groot. That one means good luck.',
  ];

  // ---- stock ---------------------------------------------------------------
  function catalogue() {
    return CROPS.filter((c) => !c.god || G.blessings[c.god]).map((c) => ({
      id: 'seed:' + c.key, key: c.key, def: c,
      name: c.name, price: c.seed, magic: !!c.magic,
      locked: !!(c.god && !G.blessings[c.god]),
    }));
  }
  const BAY_W = 150;
  function layout() {
    const list = catalogue();
    slots = [];
    const plain = list.filter((p) => !p.magic), magic = list.filter((p) => p.magic);
    let x = 190;
    const place = (arr, kind) => {
      for (const p of arr) {
        slots.push({ p, x, y: BENCH, kind });
        x += 96;
      }
      x += 70;
    };
    place(plain, 'bench');
    place(magic, 'vault');
    worldW = Math.max(VW + 200, x + 260);
  }

  function countOf(id) { return basket.filter((b) => b === id).length; }
  function total() { return basket.reduce((s, id) => { const p = catalogue().find((x) => x.id === id); return s + (p ? p.price : 0); }, 0); }
  function lines() {
    const map = {}, order = [];
    for (const id of basket) { if (!map[id]) { map[id] = { id, n: 0 }; order.push(map[id]); } map[id].n++; }
    const cat = catalogue();
    return order.map((o) => {
      const p = cat.find((x) => x.id === o.id) || { name: '?', price: 0 };
      return { p: { id: p.id, name: p.name, icon: p.def ? p.def.icon : 'c_ashgrass' }, n: o.n, sum: p.price * o.n };
    });
  }
  function add(p) {
    if (p.locked) { Audio.play('error'); UI.toast('a god must bless it', 'bad'); return; }
    basket.push(p.id);
    Audio.play('place');
    FX.comic(320, 120, 'x' + countOf(p.id), { ink: '#c9f58a', edge: '#2f8f42', life: 0.5 });
    grootSay(`${p.name}. Good choice.`, 'talk');
    UI.refreshBasket();
  }
  function removeOne(id) { const i = basket.lastIndexOf(id); if (i >= 0) basket.splice(i, 1); UI.refreshBasket(); }
  function removeLine(id) { for (let i = basket.length - 1; i >= 0; i--) if (basket[i] === id) basket.splice(i, 1); UI.refreshBasket(); }
  function clear() { basket.length = 0; UI.refreshBasket(); }
  function addById(id) { const p = catalogue().find((x) => x.id === id); if (p) add(p); }
  function checkout() {
    const cost = total();
    if (!basket.length) return;
    if (G.wd < cost) { Audio.play('error'); UI.toast('not enough', 'bad'); grootSay('Come back when you can. I will keep it.', 'talk'); return; }
    G.wd -= cost;
    for (const id of basket) {
      const p = catalogue().find((x) => x.id === id);
      if (p) G.seeds[p.key] = (G.seeds[p.key] || 0) + 6;
    }
    const n = basket.length;
    basket.length = 0;
    Audio.play('till'); Audio.play('chime');
    FX.confettiBurst(VW / 2, 140, 60);
    UI.toast(`${n} packet${n > 1 ? 's' : ''} of seed`, 'good');
    grootSay('Water it the day you sow it. Every time.', 'wave');
    UI.refreshTray(); UI.refreshHUD(); UI.refreshBasket();
    Main.save();
  }

  // ---- Groot's patter ------------------------------------------------------
  function grootSay(text, pose) {
    groot.text = text; groot.say = 4.2;
    groot.pose = pose || 'talk'; groot.poseT = 2.6;
  }
  function grootTick(dt) {
    groot.t += dt;
    groot.say -= dt;
    if (groot.poseT > 0) { groot.poseT -= dt; if (groot.poseT <= 0) groot.pose = 'idle'; }
    // he walks the aisle, stopping by whatever is nearest
    if (groot.pose === 'idle' || groot.pose === 'walk') {
      const d = groot.tx - groot.x;
      if (Math.abs(d) > 3) {
        groot.pose = 'walk';
        groot.dir = d > 0 ? 1 : -1;
        groot.x += Math.sign(d) * 26 * dt;
      } else {
        groot.pose = 'idle';
        groot.wait = (groot.wait || 0) - dt;
        if (groot.wait <= 0) {
          groot.wait = 3.5 + Math.random() * 3;
          const s = slots[Math.floor(Math.random() * slots.length)];
          groot.tx = s ? U.clamp(s.x + U.rand(-30, 30), 120, worldW - 160) : U.rand(160, worldW - 200);
          if (groot.say <= 0 && Math.random() < 0.7) {
            groot.line = (groot.line + 1 + Math.floor(Math.random() * 3)) % LINES.length;
            grootSay(LINES[groot.line], 'talk');
          }
        }
      }
    }
  }

  // ---- scene flow ----------------------------------------------------------
  function enter() {
    layout();
    scroll = 0; tscroll = 0; hover = null; basket.length = 0; t = 0;
    groot.x = 300; groot.tx = 340; groot.wait = 1.2;
    grootSay('I am Groot. That means welcome, by the way.', 'wave');
    if (!motes.length) { const r = Art.rng(31); for (let i = 0; i < 40; i++) motes.push({ x: r() * VW, y: r() * VH, ph: r() * TAU, s: 0.4 + r() * 0.9 }); }
    if (!drips.length) { const r = Art.rng(77); for (let i = 0; i < 26; i++) drips.push({ x: r() * worldW, t: r() * 4, sp: 1.6 + r() * 2 }); }
    Audio.setMode('pen');
    Audio.play('door');
    UI.refreshBasket();
  }
  function leave() { Main.setMode('map'); }
  function update(dt) {
    t += dt;
    scroll = U.lerp(scroll, tscroll, 1 - Math.pow(0.0015, dt));
    grootTick(dt);
    for (const d of drips) { d.t += dt * d.sp; if (d.t > 6) d.t = 0; }
  }

  // ---- input ---------------------------------------------------------------
  function slotAt(x, y) {
    for (const s of slots) {
      const sx = s.x - scroll;
      if (x > sx - 34 && x < sx + 34 && y > s.y - 74 && y < s.y + 16) return s;
    }
    return null;
  }
  const overGroot = (x) => Math.abs(x - (groot.x - scroll)) < 34;
  function press(x, y) { drag = { x, y, s: tscroll }; moved = 0; }
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
    if (overGroot(x) && y > 150) {
      if (basket.length) { UI.openBasket(); Audio.play('click'); return; }
      groot.line = (groot.line + 1) % LINES.length;
      grootSay(LINES[groot.line], 'talk');
      Audio.play('click');
      return;
    }
  }
  function hoverAt(x, y) {
    const s = slotAt(x, y);
    hover = s;
    if (overGroot(x) && y > 150) return `<b>Groot</b> <span class="dim">grows everything here</span><br>${basket.length ? 'click to pay ' + total() + ' W$' : 'click him and he will tell you something'}`;
    if (!s) return null;
    const c = s.p.def;
    return `<b>${c.name}</b>${s.p.magic ? ' <span class="warn">magical</span>' : ''}<br>6 seeds a packet<br>${Icons.img('wdollar', 'sm')} ${U.fmt(s.p.price)}<br><span class="dim">grows in ${c.grow}s &middot; feeds for ${OFFERINGS[c.offering].name}</span>`;
  }
  function wheel(dy) { tscroll = U.clamp(tscroll + dy, 0, worldW - VW); }

  // ---- the dome ------------------------------------------------------------
  function render(g) {
    const S = scroll;
    // ---- sky through the glass --------------------------------------------
    const sky = g.createLinearGradient(0, 0, 0, FLOOR);
    sky.addColorStop(0, '#1c2f3e'); sky.addColorStop(0.5, '#2b4a52'); sky.addColorStop(1, '#3d5f4a');
    g.fillStyle = sky; g.fillRect(0, 0, VW, FLOOR);
    // the forest outside, seen through it
    for (let i = 0; i < 12; i++) {
      const x = ((i * 92 - S * 0.12) % (VW + 200) + VW + 200) % (VW + 200) - 100;
      const img = Props.get('tree', `${['oak', 'pine', 'gnarl'][i % 3]}|${i % 4}|0.74`);
      const sc = 0.55 + (i % 3) * 0.1;
      g.globalAlpha = 0.5;
      g.drawImage(img, x, 158 - img.height * sc, img.width * sc, img.height * sc);
      g.globalAlpha = 1;
    }
    // ---- the dome's ribs ---------------------------------------------------
    drawDome(g, S);
    // ---- the floor ---------------------------------------------------------
    g.fillStyle = '#4a3a2a'; g.fillRect(0, FLOOR, VW, VH - FLOOR);
    Tex.fill(g, 'stoned', -S % 64, FLOOR, VW + 64, VH - FLOOR, 0.5);
    for (let i = -1; i < 20; i++) {                       // brick pavers
      const x = Math.round(i * 46 - (S % 92));
      g.fillStyle = '#6a4a30'; g.fillRect(x, FLOOR, 44, 14);
      g.fillStyle = '#8a6440'; g.fillRect(x, FLOOR, 44, 3);
      g.fillStyle = '#5a3d26'; g.fillRect(x + 23, FLOOR + 14, 44, 14);
      g.fillStyle = '#7a5836'; g.fillRect(x + 23, FLOOR + 14, 44, 3);
      g.fillStyle = '#3a2a1c'; g.fillRect(x, FLOOR + 28, 44, 14);
    }
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(0, FLOOR, VW, 3);
    // a runnel of water down the middle of the floor
    g.fillStyle = '#2e5a66'; g.fillRect(0, FLOOR + 30, VW, 8);
    g.fillStyle = '#4b8fa0'; g.fillRect(0, FLOOR + 30, VW, 3);
    for (let i = 0; i < 20; i++) {
      const x = ((i * 44 - t * 26) % (VW + 60) + VW + 60) % (VW + 60) - 30;
      g.fillStyle = 'rgba(190,232,240,0.35)'; g.fillRect(x, FLOOR + 32, 14, 1);
    }
    // ---- the benches and what is on them -----------------------------------
    drawBeds(g, S);
    for (const s of slots) {
      const x = s.x - S;
      if (x < -80 || x > VW + 80) continue;
      drawPlant(g, s, x);
    }
    drawTill(g, S);
    drawGroot(g, S);
    // ---- the air in here ---------------------------------------------------
    for (const m of motes) {
      const mx = (m.x + Math.sin(t * 0.3 + m.ph) * 22) % VW;
      const my = (m.y - t * 6 * m.s) % VH;
      g.fillStyle = `rgba(226,240,190,${(0.16 + 0.16 * Math.sin(t * 2 + m.ph)).toFixed(2)})`;
      g.fillRect(Math.round(mx), Math.round((my + VH) % VH), 2, 2);
    }
    // glass is warm in here: one pass of light down through the ribs
    const warm = g.createLinearGradient(0, 0, 0, FLOOR);
    warm.addColorStop(0, 'rgba(226,240,170,0.16)'); warm.addColorStop(1, 'rgba(226,240,170,0)');
    g.fillStyle = warm; g.fillRect(0, 0, VW, FLOOR);
    if (tscroll < 24 && t < 7) {
      const a = 0.4 + 0.4 * Math.sin(t * 4);
      g.globalAlpha = a;
      FX.pixelText(g, 'SWIPE', VW - 84, VH - 26, { color: '#1d3a1c', size: 8, inkColor: 'rgba(230,246,214,0.9)' });
      for (let i = 0; i < 3; i++) { g.fillStyle = '#4f9a42'; g.fillRect(VW - 40 + i * 9, VH - 24, 6, 6); }
      g.globalAlpha = 1;
    }
    FX.drawParticles(g, 0);
    FX.drawConfetti(g);
    FX.drawFloaters(g, false);
    FX.drawComics(g, false);
  }

  const BEAM = 166;
  function drawDome(g, S) {
    // Everything above the ring beam is roof, and it is clipped so the glazing
    // bars cannot run down over the shop.
    g.save();
    g.beginPath(); g.rect(0, 0, VW, BEAM); g.clip();
    // the glass itself, tinted and lit from above
    const gl = g.createLinearGradient(0, -20, 0, BEAM);
    gl.addColorStop(0, 'rgba(190,226,210,0.3)'); gl.addColorStop(1, 'rgba(190,226,210,0.05)');
    g.fillStyle = gl; g.fillRect(0, 0, VW, BEAM);
    // glazing bars, converging on an apex off the top of the frame
    const apexX = VW / 2, apexY = -150;
    for (let i = 0; i <= 7; i++) {
      const bx = -60 + i * ((VW + 120) / 7);
      g.strokeStyle = 'rgba(58,70,52,0.7)'; g.lineWidth = 3;
      g.beginPath(); g.moveTo(bx, BEAM); g.lineTo(U.lerp(bx, apexX, 0.9), apexY + 40); g.stroke();
      g.strokeStyle = 'rgba(150,168,140,0.6)'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(bx + 1.2, BEAM); g.lineTo(U.lerp(bx, apexX, 0.9) + 1.2, apexY + 40); g.stroke();
    }
    // purlins: three shallow arcs across them
    for (let r = 0; r < 2; r++) {
      const y = 44 + r * 62;
      g.strokeStyle = 'rgba(58,70,52,0.7)'; g.lineWidth = 3;
      g.beginPath(); g.moveTo(-20, y + 14); g.quadraticCurveTo(VW / 2, y - 24, VW + 20, y + 14); g.stroke();
      g.strokeStyle = 'rgba(150,168,140,0.55)'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(-20, y + 12); g.quadraticCurveTo(VW / 2, y - 26, VW + 20, y + 12); g.stroke();
    }
    // birds in the rafters, which is a problem Groot has given up on
    for (let i = 0; i < 4; i++) {
      const bx2 = ((i * 190 - S * 0.1 - t * 9) % (VW + 200) + VW + 200) % (VW + 200) - 100;
      const by2 = 42 + Math.sin(t * 0.8 + i * 2) * 14 + i * 9;
      const flap = Math.sin(t * 9 + i) * 2.6;
      g.fillStyle = 'rgba(30,40,30,0.7)';
      g.fillRect(Math.round(bx2), Math.round(by2), 3, 2);
      g.fillRect(Math.round(bx2) - 4, Math.round(by2 - flap), 4, 1.4);
      g.fillRect(Math.round(bx2) + 3, Math.round(by2 - flap), 4, 1.4);
    }
    // condensation, running down the inside of it
    for (const d of drips) {
      const xx = ((d.x - S * 0.4) % worldW + worldW) % worldW;
      if (xx > VW + 20) continue;
      const y = 20 + (d.t / 6) * 170;
      g.fillStyle = 'rgba(214,240,246,0.4)'; g.fillRect(Math.round(xx), Math.round(y), 2, 6);
      g.fillStyle = 'rgba(255,255,255,0.55)'; g.fillRect(Math.round(xx), Math.round(y), 1, 2);
    }
    g.restore();
    // ---- the ring beam, and what hangs off it ------------------------------
    g.fillStyle = '#2e382a'; g.fillRect(0, BEAM, VW, 11);
    g.fillStyle = '#5c6a54'; g.fillRect(0, BEAM, VW, 4);
    g.fillStyle = '#8d9c80'; g.fillRect(0, BEAM, VW, 1.4);
    g.fillStyle = '#1d251a'; g.fillRect(0, BEAM + 9, VW, 3);
    // grow lamps on chains, pooling light on the bench below
    for (let i = 0; i < 8; i++) {
      const x = Math.round(((i * 152 - S * 0.75) % (VW + 304) + VW + 304) % (VW + 304) - 152);
      if (x < -70 || x > VW + 70) continue;
      g.fillStyle = '#3a4434'; g.fillRect(x - 1, BEAM + 10, 2, 16);
      Art.poly(g, [[x - 17, BEAM + 40], [x + 17, BEAM + 40], [x + 9, BEAM + 26], [x - 9, BEAM + 26]], '#3f4a3a');
      Art.poly(g, [[x - 15, BEAM + 39], [x + 15, BEAM + 39], [x + 8, BEAM + 27], [x - 8, BEAM + 27]], '#6f7f66');
      Art.ell(g, x, BEAM + 40, 13, 3.4, '#ffe9a8');
      const lamp = g.createRadialGradient(x, BEAM + 42, 4, x, BEAM + 42, 76);
      lamp.addColorStop(0, 'rgba(255,233,168,0.24)'); lamp.addColorStop(1, 'rgba(255,233,168,0)');
      g.fillStyle = lamp; g.fillRect(x - 80, BEAM + 40, 160, 150);
    }
    // hanging baskets, behind everything on the bench
    for (let i = 0; i < 9; i++) {
      const x = Math.round(((i * 128 - S * 0.55) % (VW + 256) + VW + 256) % (VW + 256) - 128);
      if (x < -60 || x > VW + 60) continue;
      const sway = Math.sin(t * 1.1 + i) * 2.4;
      g.fillStyle = '#4a4438'; g.fillRect(x - 10 + sway * 0.4, BEAM + 10, 1.6, 16); g.fillRect(x + 9 + sway * 0.4, BEAM + 10, 1.6, 16);
      const bx = x + sway;
      Art.ell(g, bx, BEAM + 30, 15, 6, '#3a2a1a');
      Art.ell(g, bx, BEAM + 29, 13.4, 5.2, '#6a4a30');
      Art.ellBand(g, bx, BEAM + 30, 14, 7, '#8a6440', 0.54, 0.94);
      for (let k = 0; k < 7; k++) {
        const a2 = -0.2 + (k / 6) * 3.5;
        const px = bx + Math.cos(a2) * 12, py = BEAM + 32 + Math.abs(Math.sin(a2)) * 3;
        const L = 7 + ((k * 7 + i * 3) % 11);
        Art.limb(g, px, py, px + Math.sin(t * 0.9 + k) * 2, py + L, 2, 1, '#2f6b34');
        Art.ell(g, px + Math.sin(t * 0.9 + k) * 2, py + L, 2.6, 2, '#4f9a42');
        if ((k + i) % 3 === 0) Art.ell(g, px + Math.sin(t * 0.9 + k) * 2, py + L + 2, 2, 2, ['#e8768f', '#f0c04a', '#c98ad8'][(k + i) % 3]);
      }
    }
  }

  function drawBeds(g, S) {
    // raised beds running the length of the dome, behind the benches
    for (let i = -1; i < 12; i++) {
      const x = Math.round(i * 150 - (S * 0.85) % 150);
      if (x > VW + 80 || x < -180) continue;
      g.fillStyle = '#3a2a1a'; g.fillRect(x, 286, 146, 34);
      g.fillStyle = '#6a4a30'; g.fillRect(x + 2, 288, 142, 30);
      g.fillStyle = '#8a6440'; g.fillRect(x + 2, 288, 142, 3);
      g.fillStyle = '#241a10'; g.fillRect(x + 4, 292, 138, 8);      // the soil in it
      Tex.fill(g, 'darkwood', x + 2, 288, 142, 30, 0.35);
      for (let k = 0; k < 8; k++) {                                 // a row of sprouts
        const sx = x + 12 + k * 17;
        const h = 8 + ((k * 5 + i * 3) % 9);
        Art.limb(g, sx, 294, sx + Math.sin(t * 1.2 + k) * 1.4, 294 - h, 2, 1, '#2f6b34');
        Art.ell(g, sx + Math.sin(t * 1.2 + k) * 1.4, 294 - h, 3.4, 2.4, '#4f9a42');
        Art.ell(g, sx + Math.sin(t * 1.2 + k) * 1.4 - 1, 293 - h, 1.6, 1.1, '#79c05c');
      }
    }
    // the potting bench the stock sits on
    for (let i = -1; i < 14; i++) {
      const x = Math.round(i * 96 - (S % 96));
      g.fillStyle = '#3a2a1a'; g.fillRect(x, BENCH + 10, 96, 8);
      g.fillStyle = '#7a5836'; g.fillRect(x, BENCH + 11, 96, 5);
      g.fillStyle = '#a0764a'; g.fillRect(x, BENCH + 11, 96, 1.6);
      g.fillStyle = '#2a1e12'; g.fillRect(x + 10, BENCH + 18, 6, 52);   // the legs
      g.fillStyle = '#4a3420'; g.fillRect(x + 10, BENCH + 18, 2, 52);
    }
  }

  // one plant in a terracotta pot, with its price on a stake
  function drawPlant(g, s, x) {
    const hot = hover === s;
    const bob = hot ? Math.sin(t * 8) * 2.4 : Math.sin(t * 1.5 + s.x * 0.05) * 1.1;
    const y = s.y + bob;
    const def = s.p.def;
    // the pot
    g.fillStyle = 'rgba(0,0,0,0.26)'; Art.ell(g, x, s.y + 13, 17, 5);
    Art.poly(g, [[x - 14, y - 10], [x + 14, y - 10], [x + 10, y + 12], [x - 10, y + 12]], '#7a3a1c');
    Art.poly(g, [[x - 13, y - 9], [x + 13, y - 9], [x + 9.4, y + 11], [x - 9.4, y + 11]], '#b2582c');
    Art.poly(g, [[x - 13, y - 9], [x - 5, y - 9], [x - 3, y + 11], [x - 9.4, y + 11]], '#d2743a');
    Art.rect(g, x - 15, y - 13, 30, 5, '#8a4520');
    Art.rect(g, x - 15, y - 13, 30, 1.6, '#d2743a');
    Art.ell(g, x, y - 9, 12, 3.4, '#2e2016');                     // the soil
    // the plant itself, bigger than the icon and specific to the crop
    // the produce sprites leave a couple of rows of air under them, so they are
    // seated by their baseline rather than their canvas
    const img = Props.get('produce', s.p.key);
    const sc = 1.9, ph = img.height * sc;
    g.drawImage(img, Math.round(x - img.width * sc / 2), Math.round(y - 9 - ph * 0.92),
      Math.round(img.width * sc), Math.round(ph));
    if (s.p.magic) {                                              // the odd ones glow
      const p = 0.5 + 0.5 * Math.sin(t * 2.4 + s.x);
      const gr = g.createRadialGradient(x, y - 26, 3, x, y - 26, 34 + p * 8);
      gr.addColorStop(0, `rgba(185,142,240,${(0.16 + p * 0.1).toFixed(2)})`);
      gr.addColorStop(1, 'rgba(185,142,240,0)');
      g.fillStyle = gr; g.fillRect(x - 44, y - 70, 88, 88);
      for (let i = 0; i < 3; i++) {
        const a = t * 1.4 + i * 2.1;
        g.fillStyle = 'rgba(226,214,255,0.6)';
        g.fillRect(Math.round(x + Math.cos(a) * 16), Math.round(y - 28 + Math.sin(a * 1.3) * 12), 2, 2);
      }
    }
    // the price on a stake pushed into the pot
    const label = String(s.p.price);
    const w = Math.max(30, Font.width(label, 1) + 16);
    g.fillStyle = '#3a2a18'; g.fillRect(x + 9, y - 4, 2, 14);
    g.fillStyle = '#1d2a14'; g.fillRect(x + 4, y - 14, w, 12);
    g.fillStyle = hot ? '#e8f4d8' : '#cfe0bc'; g.fillRect(x + 5, y - 13, w - 2, 10);
    Font.draw(g, label, x + 4 + w / 2, y - 11, { scale: 1, color: '#2a3a20', align: 'center' });
    const n = countOf(s.p.id);
    if (n) {
      Art.ell(g, x + 16, y - 24, 8, 8, '#2f8f42');
      FX.pixelText(g, String(n), x + 16, y - 27, { color: '#fff', size: 7 });
    }
    if (hot) {
      Font.draw(g, s.p.name.toUpperCase(), x, y - 56, { scale: 1, color: '#e8f4d8', align: 'center', shadow: '#12200e' });
    }
  }

  // the potting bench at the end, where you pay
  function drawTill(g, S) {
    const cx = worldW - 210 - S;
    if (cx > VW + 200 || cx < -260) return;
    // a wall of shelves behind it, full of pots and tools
    g.fillStyle = '#3a2a1a'; g.fillRect(cx - 10, 150, 240, 170);
    g.fillStyle = '#5a4028'; g.fillRect(cx - 6, 154, 232, 162);
    Tex.fill(g, 'darkwood', cx - 6, 154, 232, 162, 0.6);
    for (let r = 0; r < 3; r++) {
      const y = 186 + r * 44;
      g.fillStyle = '#8a6440'; g.fillRect(cx - 6, y, 232, 5);
      g.fillStyle = '#a8804a'; g.fillRect(cx - 6, y, 232, 1.6);
      for (let i = 0; i < 8; i++) {
        const px = cx + 8 + i * 28, ph = 12 + ((i + r) % 3) * 4;
        Art.poly(g, [[px - 9, y - ph], [px + 9, y - ph], [px + 6, y], [px - 6, y]], '#8a4520');
        Art.poly(g, [[px - 8, y - ph + 1], [px + 8, y - ph + 1], [px + 5.4, y - 1], [px - 5.4, y - 1]], '#b2582c');
        Art.rect(g, px - 9.6, y - ph - 2.4, 19.2, 3.4, '#8a4520');
        if ((i + r) % 2 === 0) {
          Art.ell(g, px, y - ph - 3, 5, 3.4, '#2f6b34');
          Art.ell(g, px - 1.4, y - ph - 5, 2.6, 2, '#4f9a42');
        }
      }
    }
    // the bench top
    g.fillStyle = '#2a1e12'; g.fillRect(cx - 14, 276, 248, 10);
    g.fillStyle = '#8a6440'; g.fillRect(cx - 14, 277, 248, 7);
    g.fillStyle = '#b08450'; g.fillRect(cx - 14, 277, 248, 2);
    g.fillStyle = '#3a2a1a'; g.fillRect(cx - 14, 286, 248, 34);
    Tex.fill(g, 'wood', cx - 14, 286, 248, 34, 0.5);
    // a bag of soil, a trug of seed packets, a watering can
    Art.poly(g, [[cx + 12, 250], [cx + 48, 250], [cx + 52, 276], [cx + 8, 276]], '#4a3a24');
    Art.poly(g, [[cx + 14, 252], [cx + 46, 252], [cx + 49, 275], [cx + 11, 275]], '#6a5434');
    Art.rect(g, cx + 16, 256, 28, 9, '#d8c9a4');
    Font.draw(g, 'SOIL', cx + 30, 258, { scale: 1, color: '#4a3a24', align: 'center' });
    Art.ell(g, cx + 86, 272, 20, 7, '#5a4028');
    Art.ell(g, cx + 86, 270, 18.4, 6, '#7a5836');
    for (let i = 0; i < 5; i++) {
      Art.rect(g, cx + 74 + i * 6, 258 + (i % 2) * 2, 5, 12, ['#c9581f', '#3f8f4a', '#2f6f9f', '#d8b23a', '#b8496a'][i]);
      Art.rect(g, cx + 74 + i * 6, 258 + (i % 2) * 2, 5, 3, '#fffdf0');
    }
    const wx = cx + 150;
    Art.ell(g, wx, 266, 13, 11, '#4b6a72');
    Art.ell(g, wx, 265, 11.4, 9.6, '#6f95a0');
    Art.ell(g, wx - 3.4, 261, 4, 2.8, '#9fc0c8');
    Art.limb(g, wx - 11, 262, wx - 24, 270, 3.4, 5, '#4b6a72');
    Art.ell(g, wx - 26, 272, 4.4, 3.4, '#9fc0c8');
    Art.limb(g, wx + 4, 256, wx + 11, 262, 3, 2, '#4b6a72');
    // the sign over it
    const sw = 120;
    g.fillStyle = '#2a1e12'; g.fillRect(cx + 50, 120, sw, 34);
    g.fillStyle = '#4f9a42'; g.fillRect(cx + 53, 123, sw - 6, 28);
    g.fillStyle = '#79c05c'; g.fillRect(cx + 53, 123, sw - 6, 3);
    Font.draw(g, 'PAY HERE', cx + 50 + sw / 2, 128, { scale: 1, color: '#f2ffe8', align: 'center' });
    Font.draw(g, 'ask the tree', cx + 50 + sw / 2, 140, { scale: 1, color: '#bfe8a6', align: 'center' });
    g.fillStyle = '#4a4438'; g.fillRect(cx + 62, 106, 2, 16); g.fillRect(cx + 146, 106, 2, 16);
  }

  function drawGroot(g, S) {
    const x = groot.x - S;
    if (x < -120 || x > VW + 120) return;
    const rate = { walk: 7, talk: 6, wave: 8, point: 4 }[groot.pose] || 3;
    const img0 = Sprites.groot(Math.floor(groot.t * rate), groot.pose);
    const img = groot.dir < 0 ? Art.flip(img0) : img0;
    const sc = 1.15, w = img.width * sc, h = img.height * sc;
    const y = FLOOR + 22;
    Art.castShadow(g, img, x, y, w, h, { alpha: 0.32, lean: 0.5, squash: 0.28 });
    g.drawImage(img, Math.round(x - w / 2), Math.round(y - h), Math.round(w), Math.round(h));
    // petals shaking loose as he moves
    if (groot.pose === 'walk' && Math.random() < 0.12) {
      FX.spawn({ x: x + U.rand(-14, 14), y: y - h + U.rand(6, 30), vx: U.rand(-10, 10), vy: U.rand(4, 16),
        life: 1.4, size: 2, color: U.pick(['#e8768f', '#f0c04a', '#c98ad8']), gravity: 12 });
    }
    if (groot.say > 0 && groot.text) chatBubble(g, x, y - h - 6, groot.text);
    if (basket.length) {
      const a = 0.5 + 0.5 * Math.sin(t * 5);
      Font.draw(g, 'CLICK HIM TO PAY', x, y + 8, { scale: 1, color: `rgba(201,245,138,${a.toFixed(2)})`, align: 'center', shadow: '#12200e' });
    }
  }
  function chatBubble(g, x, y, text) {
    const lines = Font.wrap(text, 168, 1);
    const w = Math.max(70, Math.max(...lines.map((l) => Font.width(l, 1))) + 16);
    const h = lines.length * 11 + 10;
    const bx = U.clamp(x - w / 2, 4, VW - w - 4);
    const by = Math.max(24 + h, y);
    g.fillStyle = '#0d1a0a'; g.fillRect(bx - 2, by - h - 2, w + 4, h + 4);
    g.fillStyle = '#f2ffe8'; g.fillRect(bx, by - h, w, h);
    g.fillStyle = '#c2d8b4'; g.fillRect(bx, by - 4, w, 4);
    Art.poly(g, [[x - 5, by], [x + 6, by], [x + 1, by + 9]], '#0d1a0a');
    Art.poly(g, [[x - 4, by - 1], [x + 5, by - 1], [x + 1, by + 7]], '#f2ffe8');
    lines.forEach((l, i) => Font.draw(g, l, bx + 8, by - h + 5 + i * 11, { scale: 1, color: '#23351d' }));
  }

  return {
    init(g) { G = g; }, enter, leave, update, render, press, move, release, hover: hoverAt, wheel,
    add, addById, removeOne, removeLine, clear, checkout, total, lines, layout, catalogue,
    setScroll(f) { tscroll = (worldW - VW) * U.clamp(f, 0, 1); scroll = tscroll; },
    get basket() { return basket; }, get worldW() { return worldW; },
  };
})();
