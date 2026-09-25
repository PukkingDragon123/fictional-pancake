// ---- Groot's Cellar --------------------------------------------------------
// A brick barrel vault under the town, lit by caged lamps and taken over by
// the vines that got in through the mortar. Groot walks the aisle and sells
// seed, garden tools and the odd piece of garden furniture over a potting
// bench. He only ever says one thing, so watch his face.
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
  // He has one line. Everything he means is in the face and the punctuation,
  // so each entry pairs a reading of "I am Groot" with the mood that sells it.
  const LINES = [
    { say: 'I am Groot.', mood: 'talk' },
    { say: 'I AM GROOT!', mood: 'laugh' },
    { say: 'I am Groot?', mood: 'curious' },
    { say: 'I... am Groot.', mood: 'sad' },
    { say: 'I am Groot!!', mood: 'happy' },
    { say: 'I am. Groot.', mood: 'proud' },
    { say: 'i am groot', mood: 'sleepy' },
    { say: 'I AM GROOT.', mood: 'cross' },
    { say: 'I am Groot...', mood: 'worry' },
    { say: 'I am Groot!', mood: 'wave' },
    { say: 'I - am - Groot.', mood: 'point' },
    { say: 'I am groot?!', mood: 'worry' },
    { say: 'I am Groot :)', mood: 'happy' },
    { say: 'I AM GROOT?!', mood: 'curious' },
    { say: 'I am Groot~', mood: 'proud' },
  ];
  // What he says when something specific happens. Same words, chosen mood.
  const WELCOME = { say: 'I am Groot!', mood: 'wave' };
  const PICKED  = { say: 'I am Groot!', mood: 'happy' };
  const BROKE   = { say: 'I am Groot...', mood: 'sad' };
  const PAID    = { say: 'I AM GROOT!', mood: 'laugh' };
  const NOSTOCK = { say: 'I am Groot?', mood: 'worry' };

  // ---- stock ---------------------------------------------------------------
  function catalogue() {
    const out = CROPS.filter((c) => !c.god || G.blessings[c.god]).map((c) => ({
      id: 'seed:' + c.key, kind: 'seed', key: c.key, def: c,
      name: c.name, price: c.seed, pkind: c.kind, magic: c.kind === 'magic', icon: c.icon,
      locked: !!(c.god && !G.blessings[c.god]),
      blurb: c.kind === 'tree' ? `one sapling · ${c.grow}s to establish`
        : c.kind === 'magic' ? `3 seeds a packet · ${MAGIC_NEED[c.need]}`
          : `6 seeds a packet · grows in ${c.grow}s`,
    }));
    // the garden half of the shop: the tools you work a bed with, a trough,
    // and the two pieces of garden furniture the mart no longer carries
    for (const key of Object.keys(TIERS)) {
      const nxt = nextTier(G, key), cur = tierOf(G, key);
      out.push({
        id: 'tier:' + key, kind: 'tier', key, name: nxt ? nxt.name : cur.name,
        price: nxt ? nxt.cost : 0, icon: { sickle: 't_sickle', hoe: 't_hoe', water: 't_water' }[key],
        sold: !nxt, blurb: nxt ? `rank ${tierIndex(G, key) + 2} · ${nxt.desc || 'sharper'}` : 'best there is',
      });
    }
    for (const u of UPGRADES) {
      if (!GARDEN_UP[u.key]) continue;
      const l = G.up[u.key] || 0;
      out.push({ id: 'up:' + u.key, kind: 'up', key: u.key, name: u.name, icon: u.icon,
        price: Math.round(u.base * Math.pow(u.mult, l)), sold: l >= u.max, blurb: `${l}/${u.max} · ${u.desc(l)}` });
    }
    for (const d of DECOR) {
      if (!GARDEN_DEC[d.key]) continue;
      out.push({ id: 'dec:' + d.key, kind: 'dec', key: d.key, name: d.name, icon: d.icon,
        price: d.cost, sold: !!G.decor[d.key], blurb: d.desc });
    }
    // Furniture is yard stock: it stands out the back between the benches and
    // you carry it home in a crate and put it down where you like.
    for (const f of FURNITURE) {
      out.push({ id: 'fn:' + f.key, kind: 'fn', key: f.key, name: f.name, icon: 'd_nest',
        furn: f, price: f.cost, sold: false, blurb: f.blurb });
    }
    return out;
  }
  const BAY_W = 150;
  let bays = [];
  function layout() {
    const list = catalogue();
    slots = [];
    const plain = list.filter((p) => p.kind === 'seed' && p.pkind === 'crop');
    const trees = list.filter((p) => p.kind === 'seed' && p.pkind === 'tree');
    const magic = list.filter((p) => p.kind === 'seed' && p.pkind === 'magic');
    const furn = list.filter((p) => p.kind === 'fn');
    const goods = list.filter((p) => p.kind !== 'seed' && p.kind !== 'fn');
    let x = 190;
    bays = [];
    const place = (arr, kind, label) => {
      if (!arr.length) return;
      const x0 = x;
      for (const p of arr) { slots.push({ p, x, y: BENCH, kind }); x += 96; }
      bays.push({ label, x0: x0 - 52, x1: x - 44, kind });
      x += 74;
    };
    place(plain, 'bench', 'SEED');
    place(trees, 'bench', 'THE ORCHARD');
    place(magic, 'vault', 'THE BACK SHELF');
    place(goods, 'goods', 'GARDEN GOODS');
    place(furn, 'goods', 'THE YARD');
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
    if (p.sold) { Audio.play('error'); UI.toast('he has none left', 'bad'); grootSay(NOSTOCK); return; }
    if (p.kind !== 'seed' && countOf(p.id) >= 1) { Audio.play('error'); return; }
    basket.push(p.id);
    Audio.play('place');
    FX.comic(320, 120, 'x' + countOf(p.id), { ink: '#c9f58a', edge: '#2f8f42', life: 0.5 });
    grootSay(PICKED);
    UI.refreshBasket();
  }
  function removeOne(id) { const i = basket.lastIndexOf(id); if (i >= 0) basket.splice(i, 1); UI.refreshBasket(); }
  function removeLine(id) { for (let i = basket.length - 1; i >= 0; i--) if (basket[i] === id) basket.splice(i, 1); UI.refreshBasket(); }
  function clear() { basket.length = 0; UI.refreshBasket(); }
  function addById(id) { const p = catalogue().find((x) => x.id === id); if (p) add(p); }
  function checkout() {
    const cost = total();
    if (!basket.length) return;
    if (G.wd < cost) { Audio.play('error'); UI.toast('not enough', 'bad'); grootSay(BROKE); return; }
    G.wd -= cost;
    for (const id of basket) {
      const p = catalogue().find((x) => x.id === id);
      if (!p) continue;
      if (p.kind === 'seed') G.seeds[p.key] = (G.seeds[p.key] || 0) + (p.pkind === 'tree' ? 1 : p.pkind === 'magic' ? 3 : 6);
      else if (p.kind === 'tier') { if (nextTier(G, p.key)) G.tiers[p.key] = tierIndex(G, p.key) + 1; }
      else if (p.kind === 'up') G.up[p.key] = (G.up[p.key] || 0) + 1;
      else if (p.kind === 'dec') G.decor[p.key] = 1;
      else if (p.kind === 'fn') { if (!G.crates) G.crates = {}; G.crates[p.key] = (G.crates[p.key] || 0) + 1; }
    }
    const n = basket.length;
    basket.length = 0;
    Audio.play('till'); Audio.play('chime');
    FX.confettiBurst(VW / 2, 140, 60);
    UI.toast(`${n} packet${n > 1 ? 's' : ''} of seed`, 'good');
    grootSay(PAID);
    UI.refreshTray(); UI.refreshHUD(); UI.refreshBasket();
    Main.save();
  }

  // ---- talking to a tree ---------------------------------------------------
  // He says the same three words whatever you ask, so the conversation is
  // really you working out what he means from his face. The subtitle under his
  // name is the translation, which is the joke.
  const GROOT_TREE = {
    start: 'hub',
    nodes: {
      hub: {
        mood: 'talk', sub: () => basket.length ? 'that will be ' + U.fmt(total()) + ' W$' : 'welcome to the cellar',
        say: 'I am Groot.',
        opts: [
          { q: () => `Pay for the basket (${U.fmt(total())} W$).`, act: () => { UI.openBasket(); }, if: () => basket.length > 0 },
          { q: 'What is good this week?', to: 'good' },
          { q: 'Is the mandrake safe?', to: 'mandrake' },
          { q: 'Why a cellar and not a greenhouse?', to: 'cellar' },
          { q: 'Are the vines yours?', to: 'vines' },
          { q: 'Shaz says hello.', to: 'shaz' },
          { q: 'Are you all right, Groot?', to: 'okay' },
          { q: 'I am Groot.', to: 'same' },
          { q: 'Thanks, Groot.', end: true },
        ],
      },
      good: { mood: 'proud', sub: 'the goldwheat, obviously', say: 'I. Am. Groot.',
        opts: [{ q: 'The goldwheat?', to: 'good2' }, { q: 'Back.', to: 'hub' }] },
      good2: { mood: 'happy', sub: 'yes, the goldwheat, it is very good', say: 'I am Groot!',
        opts: [{ q: 'I will take some.', to: 'hub' }] },
      mandrake: { mood: 'worry', sub: 'absolutely not', say: 'I am Groot...',
        opts: [{ q: 'What happens if I pick one?', to: 'mandrake2' }, { q: 'Back.', to: 'hub' }] },
      mandrake2: { mood: 'cross', sub: 'it screams and you fall over', say: 'I AM GROOT.',
        opts: [{ q: 'Ear plugs?', to: 'mandrake3' }] },
      mandrake3: { mood: 'happy', sub: 'behind the till, take two', say: 'I am Groot :)',
        opts: [{ q: 'You are a good tree.', to: 'hub' }] },
      cellar: { mood: 'curious', sub: 'glass is expensive and the possums got in', say: 'I am Groot?',
        opts: [{ q: 'Possums?', to: 'possum' }, { q: 'Back.', to: 'hub' }] },
      possum: { mood: 'cross', sub: 'do not talk to me about possums', say: 'I AM GROOT!',
        opts: [{ q: 'Sorry.', to: 'hub' }] },
      vines: { mood: 'proud', sub: 'they came in through the mortar and stayed', say: 'I am. Groot.',
        opts: [{ q: 'You let them?', to: 'vines2' }, { q: 'Back.', to: 'hub' }] },
      vines2: { mood: 'happy', sub: 'they are family', say: 'I am Groot~',
        opts: [{ q: 'That is lovely.', to: 'hub' }] },
      shaz: { mood: 'curious', sub: 'the shark? from the mart?', say: 'I am Groot?',
        opts: [{ q: 'She comes down on Thursdays.', to: 'shaz2' }] },
      shaz2: { mood: 'happy', sub: 'he knows. he waters the good pots on Thursdays.', say: 'I am Groot!!',
        opts: [{ q: 'You two should talk.', to: 'shaz3' }] },
      shaz3: { mood: 'sad', sub: 'he only knows the one sentence', say: 'I... am Groot.',
        opts: [{ q: 'She would not mind.', to: 'shaz4' }] },
      shaz4: { mood: 'happy', sub: 'he is going to think about it', say: 'I am Groot.',
        opts: [{ q: 'Good.', to: 'hub' }] },
      okay: { mood: 'sleepy', sub: 'a bit tired. it is always Thursday down here.', say: 'i am groot',
        opts: [{ q: 'Get some light on you.', to: 'okay2' }] },
      okay2: { mood: 'happy', sub: 'he will, in a bit', say: 'I am Groot!',
        opts: [{ q: 'Good lad.', to: 'hub' }] },
      same: { mood: 'laugh', sub: 'he thinks that is the funniest thing he has ever heard', say: 'I AM GROOT!',
        opts: [{ q: 'I am Groot.', to: 'same2' }] },
      same2: { mood: 'laugh', sub: 'he is wheezing', say: 'I AM GROOT!!',
        opts: [{ q: 'Right, back to business.', to: 'hub' }] },
    },
  };

  // ---- Groot's patter ------------------------------------------------------
  function grootSay(line) {
    groot.text = line.say; groot.say = 3.4;
    groot.pose = line.mood || 'talk'; groot.poseT = 2.4;
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
            grootSay(LINES[groot.line]);
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
    grootSay(WELCOME);
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
    if (overGroot(x) && y > 150) { Talk.open('groot', GROOT_TREE); return; }
  }
  function hoverAt(x, y) {
    const s = slotAt(x, y);
    hover = s;
    if (overGroot(x) && y > 150) return `<b>Groot</b> <span class="dim">he grows all of it</span><br>click to talk to him${basket.length ? ' &middot; ' + total() + ' W$ in the basket' : ''}`;
    if (!s) return null;
    const p = s.p;
    if (p.kind === 'seed') {
      const c = p.def;
      const many = c.kind === 'tree' ? 'one sapling' : c.kind === 'magic' ? '3 seeds a packet' : '6 seeds a packet';
      const tail = c.kind === 'tree' ? `${c.grow}s to establish &middot; then ${c.yield} fruit every ${c.fruitEvery}s`
        : c.kind === 'magic' ? `${MAGIC_NEED[c.need]}<br>${MAGIC_EFFECT[c.effect]}`
          : `grows in ${c.grow}s &middot; feeds for ${OFFERINGS[c.offering].name}`;
      const tag = c.kind === 'magic' ? ' <span class="warn">magical</span>' : c.kind === 'tree' ? ' <span class="dim">fruit tree</span>' : '';
      return `<b>${c.name}</b>${tag}<br>${many}<br>${Icons.img('wdollar', 'sm')} ${U.fmt(p.price)}<br><span class="dim">${tail}</span>`;
    }
    return `<b>${p.name}</b>${p.sold ? ' <span class="dim">— sold out</span>' : ''}<br>${Icons.img('wdollar', 'sm')} ${U.fmt(p.price)}<br><span class="dim">${p.blurb || ''}</span>`;
  }
  function wheel(dy) { tscroll = U.clamp(tscroll + dy, 0, worldW - VW); }

  // ---- the cellar ----------------------------------------------------------
  function render(g) {
    const S = scroll;
    drawVault(g, S);                       // the brick barrel roof over everything
    drawWall(g, S);                        // the back wall, brick and vine
    // ---- the floor: old brick pavers, worn down the middle ----------------
    g.fillStyle = '#3a2c1e'; g.fillRect(0, FLOOR, VW, VH - FLOOR);
    Tex.fill(g, 'stoned', -S % 64, FLOOR, VW + 64, VH - FLOOR, 0.5);
    for (let row = 0; row < 3; row++) {
      const y = FLOOR + row * 14, off = row % 2 ? 23 : 0;
      for (let i = -1; i < 20; i++) {
        const x = Math.round(i * 46 - (S % 92) + off);
        const k = (i * 7 + row * 3) % 5;
        g.fillStyle = ['#5e422c', '#6a4a30', '#523a26', '#644430', '#583e28'][k];
        g.fillRect(x, y, 44, 13);
        g.fillStyle = U.shade(g.fillStyle, 0.12); g.fillRect(x, y, 44, 2);
        g.fillStyle = '#2c2016'; g.fillRect(x + 44, y, 2, 13); g.fillRect(x, y + 13, 46, 1);
        for (let q = 0; q < 6; q++) {      // chipped and stained
          g.fillStyle = (i + q) % 2 ? '#4a3524' : '#6e5038';
          g.fillRect(x + ((q * 13 + i * 5) % 40), y + ((q * 5 + i) % 11), 2, 1);
        }
      }
    }
    g.fillStyle = 'rgba(0,0,0,0.42)'; g.fillRect(0, FLOOR, VW, 3);
    // the drainage runnel cut down the middle of it
    g.fillStyle = '#241a12'; g.fillRect(0, FLOOR + 28, VW, 11);
    g.fillStyle = '#2e5a66'; g.fillRect(0, FLOOR + 30, VW, 8);
    g.fillStyle = '#4b8fa0'; g.fillRect(0, FLOOR + 30, VW, 3);
    for (let i = 0; i < 20; i++) {
      const x = ((i * 44 - t * 26) % (VW + 60) + VW + 60) % (VW + 60) - 30;
      g.fillStyle = 'rgba(190,232,240,0.35)'; g.fillRect(x, FLOOR + 32, 14, 1);
    }
    drawBeds(g, S);
    // a painted board over each bay, hung off the string course on two chains
    for (const b of bays) {
      const cx = (b.x0 + b.x1) / 2 - S;
      const w = Math.max(96, Font.width(b.label, 1) + 34);
      if (cx < -w || cx > VW + w) continue;
      const y = BEAM + 14;
      g.fillStyle = '#2a2018'; g.fillRect(Math.round(cx - w / 2 + 8), BEAM + 2, 2, 12);
      g.fillStyle = '#2a2018'; g.fillRect(Math.round(cx + w / 2 - 10), BEAM + 2, 2, 12);
      Art.rect(g, cx - w / 2, y, w, 18, '#1d140c');
      Art.rect(g, cx - w / 2 + 2, y + 2, w - 4, 14, b.kind === 'vault' ? '#3a2450' : b.kind === 'goods' ? '#2f4460' : '#26401f');
      Art.rect(g, cx - w / 2 + 2, y + 2, w - 4, 2, 'rgba(255,255,255,0.18)');
      Art.rect(g, cx - w / 2 + 2, y + 14, w - 4, 2, 'rgba(0,0,0,0.4)');
      Font.draw(g, b.label, cx, y + 6, { scale: 1, color: '#e8dcbc', align: 'center', shadow: '#0e0a06' });
    }
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
      g.fillStyle = `rgba(255,222,160,${(0.14 + 0.16 * Math.sin(t * 2 + m.ph)).toFixed(2)})`;
      g.fillRect(Math.round(mx), Math.round((my + VH) % VH), 2, 2);
    }
    // it is a cellar, so the grade is cold and comes up from the floor
    {
      const oa = g.globalAlpha;
      for (let i = 0; i < 7; i++) { g.globalAlpha = oa * 0.13 * (i / 7); Art.rect(g, 0, (VH / 7) * i, VW, VH / 7 + 1, '#1d2a22'); }
      g.globalAlpha = oa;
    }
    Art.vignette(g, VW, VH, '#0a0704', 0.62, 2.4, 0.3);
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
  // A brick barrel vault, not a glass dome. Courses of brick curving up into
  // the dark, iron ties across them, one row of grated lights, and vines that
  // have got in through the cracks and taken the place over.
  const BR = ['#5a3a28', '#6a442e', '#4e3222', '#63402c', '#553828', '#704a32'];
  const MORT = '#2a1c14';
  const VINE0 = '#1f3a1c', VINE1 = '#2f5a26', VINE2 = '#478a34', VINE3 = '#6fb851';
  function brickRow(g, x0, y, w, h, off, seed, dark) {
    const bw = 30;
    for (let x = x0 - bw; x < x0 + w + bw; x += bw) {
      const bx = Math.round(x + off);
      const k = Math.abs(Math.round((bx * 31 + y * 17 + seed) / 7)) % BR.length;
      let col = BR[k];
      if (dark) col = U.shade(col, -dark);
      g.fillStyle = col; g.fillRect(bx, y, bw - 2, h - 1);
      g.fillStyle = U.shade(col, 0.1); g.fillRect(bx, y, bw - 2, 1);
      g.fillStyle = U.shade(col, -0.22); g.fillRect(bx, y + h - 2, bw - 2, 1);
      g.fillStyle = MORT; g.fillRect(bx + bw - 2, y, 2, h); g.fillRect(bx, y + h - 1, bw, 1);
    }
  }
  // ---- a vine ---------------------------------------------------------------
  // A proper one: a stem that thickens at the top and tapers to nothing, leaves
  // in opposite pairs with a midrib and a lit edge, curling tendrils reaching
  // off the node, and the odd flower cluster. It sways as one piece.
  function leaf(g, x, y, len, sd, tone) {
    // the blade: a tapered lens, drawn as two scanline halves off the midrib
    const W = len * 0.42;
    for (let i = 0; i <= len; i++) {
      const u = i / len;
      const w = Math.sin(u * Math.PI) * W;
      const lx = Math.round(x + sd * i * 0.92);
      const ly = Math.round(y + i * 0.34 - Math.sin(u * Math.PI) * 1.2);
      if (w < 0.5) continue;
      g.fillStyle = tone[0];
      g.fillRect(lx, ly - Math.round(w), 1, Math.round(w) * 2);
      g.fillStyle = tone[1];
      g.fillRect(lx, ly - Math.round(w) + 1, 1, Math.max(1, Math.round(w)));
      if (u > 0.18 && u < 0.8 && i % 3 === 0) { g.fillStyle = tone[2]; g.fillRect(lx, ly - Math.round(w) + 1, 1, 1); }
    }
    g.fillStyle = tone[3];                                  // the midrib
    for (let i = 0; i <= len; i++) g.fillRect(Math.round(x + sd * i * 0.92), Math.round(y + i * 0.34 - Math.sin((i / len) * Math.PI) * 1.2), 1, 1);
  }
  const VINE_TONE = [
    ['#1d3a1c', '#2f5a26', '#6fb851', '#153016'],
    ['#24421f', '#3a6a2c', '#84c862', '#18341a'],
    ['#1a3520', '#2a4f2c', '#5da85a', '#122a18'],
  ];
  function vine(g, x, y0, y1, seed, lean) {
    const r = Art.rng(seed);
    const tone = VINE_TONE[seed % VINE_TONE.length];
    const L = y1 - y0;
    let x2 = x;
    const nodes = [];
    for (let y = y0; y < y1; y++) {
      const u = (y - y0) / L;
      x2 += (r() - 0.5) * 0.7 + lean * 0.05 * (1 - u);
      const ix = Math.round(x2);
      const th = Math.max(1, Math.round(3 * (1 - u * 0.75)));   // thick at the top, thin at the tip
      g.fillStyle = VINE0; g.fillRect(ix, y, th + 1, 1);
      g.fillStyle = VINE1; g.fillRect(ix, y, th, 1);
      g.fillStyle = tone[2]; g.fillRect(ix, y, 1, 1);           // the lit side of the stem
      if ((y - y0) % 11 === 0 && u < 0.94) nodes.push([ix, y, u]);
    }
    // the leaves, in opposite pairs, alternating which way the pair leans
    nodes.forEach(([nx, ny, u], i) => {
      const len = Math.round((7 - u * 3) * (0.8 + r() * 0.5));
      const sd = i % 2 ? 1 : -1;
      leaf(g, nx + (sd > 0 ? 1 : 0), ny, len, sd, tone);
      if (i % 2 === (seed % 2)) leaf(g, nx + (sd > 0 ? 0 : 1), ny + 2, Math.round(len * 0.7), -sd, tone);
      // a tendril curling off every third node
      if (i % 3 === 1) {
        const td = -sd;
        for (let k = 0; k < 9; k++) {
          const a = k * 0.55;
          g.fillStyle = k > 5 ? tone[2] : tone[0];
          g.fillRect(Math.round(nx + td * (3 + Math.sin(a) * 3.4)), Math.round(ny + 2 + k * 0.9 + Math.cos(a) * 1.6), 1, 1);
        }
      }
      // and a little cluster of flowers now and then
      if (i % 4 === 2) {
        const col = ['#e8768f', '#f0c04a', '#c98ad8', '#f2ece0'][Math.floor(r() * 4)];
        const fx = nx + sd * 4, fy = ny + 4;
        for (let k = 0; k < 4; k++) {
          const a = (k / 4) * TAU;
          Art.ell(g, fx + Math.cos(a) * 1.6, fy + Math.sin(a) * 1.4, 1.5, 1.3, col);
        }
        Art.ell(g, fx, fy, 1.1, 1, '#fff2c4');
        g.fillStyle = U.shade(col, -0.3); g.fillRect(Math.round(fx), Math.round(fy + 2), 1, 2);
      }
    });
  }

  function drawVault(g, S) {
    g.save();
    g.beginPath(); g.rect(0, 0, VW, BEAM); g.clip();
    g.fillStyle = '#150f0a'; g.fillRect(0, 0, VW, BEAM);
    // courses of brick springing off the string course and curving into the
    // dark. Each one is set in further than the last, so the arch is read off
    // the stepped edge the way a bricklayer would actually build it.
    const NC = 15;
    for (let i = 0; i < NC; i++) {
      const y = BEAM - 11 - i * 11;
      const k = i / (NC - 1);
      const inset = Math.round((1 - Math.sqrt(Math.max(0, 1 - k * k))) * 330);
      if (inset > VW / 2 - 20) break;
      brickRow(g, inset, y, VW - inset * 2, 11, -((S * (0.5 + k * 0.4)) % 30), i * 131, 0.08 + k * 0.52);
      g.fillStyle = 'rgba(0,0,0,0.26)'; g.fillRect(inset, y, VW - inset * 2, 1);
      g.fillStyle = '#120c08';                    // the shadowed reveal at each end
      g.fillRect(inset - 3, y, 3, 11); g.fillRect(VW - inset, y, 3, 11);
    }
    // iron ties across the vault
    for (let i = 0; i < 4; i++) {
      const x = Math.round(((i * 190 - S * 0.6) % (VW + 380) + VW + 380) % (VW + 380) - 190);
      Art.poly(g, [[x - 4, BEAM], [x + 4, BEAM], [x + 40, 18], [x + 32, 18]], '#241a14');
      Art.poly(g, [[x - 2, BEAM], [x + 2, BEAM], [x + 38, 18], [x + 34, 18]], '#4a4038');
      for (let k = 0; k < 5; k++) Art.ell(g, x + 6 + k * 7, BEAM - 12 - k * 26, 2, 2, '#6a5c50');
    }
    // caged lights hung off the crown
    for (let i = 0; i < 6; i++) {
      const x = Math.round(((i * 152 - S * 0.75) % (VW + 304) + VW + 304) % (VW + 304) - 152);
      if (x < -60 || x > VW + 60) continue;
      g.fillStyle = '#241a14'; g.fillRect(x - 1, 0, 2, 32);
      Art.poly(g, [[x - 13, 50], [x + 13, 50], [x + 7, 32], [x - 7, 32]], '#241a14');
      Art.poly(g, [[x - 11, 49], [x + 11, 49], [x + 6, 34], [x - 6, 34]], '#5a4e42');
      Art.ell(g, x, 50, 9, 3, '#ffe9a8');
      for (let k = -2; k <= 2; k++) Art.limb(g, x + k * 4.4, 36, x + k * 5.4, 52, 1, 1, '#2a201a');
      const oa = g.globalAlpha;
      for (let q = 5; q >= 1; q--) {        // a cone of light, not a halo
        const r2 = q / 5;
        g.globalAlpha = oa * 0.08 * (1 - (q - 1) / 5.2);
        Art.poly(g, [[x - 9, 51], [x + 9, 51], [x + 9 + 40 * r2, 51 + 150 * r2], [x - 9 - 40 * r2, 51 + 150 * r2]], '#ffe9a8');
      }
      g.globalAlpha = oa;
    }
    // baskets hung off the ties, which is where the stock overflows to
    for (let i = 0; i < 7; i++) {
      const x = Math.round(((i * 128 - S * 0.62) % (VW + 256) + VW + 256) % (VW + 256) - 128);
      if (x < -50 || x > VW + 50) continue;
      const sway = Math.sin(t * 1.1 + i) * 2.4, bx = x + sway;
      g.fillStyle = '#3a3028'; g.fillRect(x - 10 + sway * 0.4, 0, 2, 96); g.fillRect(x + 9 + sway * 0.4, 0, 2, 96);
      Art.poly(g, [[bx - 15, 95], [bx + 15, 95], [bx + 10, 110], [bx - 10, 110]], '#2a1c12');
      Art.poly(g, [[bx - 14, 96], [bx + 14, 96], [bx + 9.4, 109], [bx - 9.4, 109]], '#6a4830');
      for (let k = 0; k < 3; k++) Art.rect(g, bx - 13 + k, 98 + k * 4, 26 - k * 2, 1.4, '#8a6242');
      Art.rect(g, bx - 15, 93, 30, 4, '#3a281a');
      Art.rect(g, bx - 15, 93, 30, 1.4, '#9c744a');
      Art.ell(g, bx, 96, 12, 3, '#2e2016');
      for (let k = 0; k < 7; k++) {
        const a2 = -0.2 + (k / 6) * 3.5;
        const px = bx + Math.cos(a2) * 12, py = 106 + Math.abs(Math.sin(a2)) * 3;
        const L = 8 + ((k * 7 + i * 3) % 13);
        Art.limb(g, px, py, px + Math.sin(t * 0.9 + k) * 2, py + L, 2, 1, VINE1);
        Art.ell(g, px + Math.sin(t * 0.9 + k) * 2, py + L, 2.6, 2, VINE2);
        if ((k + i) % 3 === 0) Art.ell(g, px + Math.sin(t * 0.9 + k) * 2, py + L + 2, 2, 2, ['#e8768f', '#f0c04a', '#c98ad8'][(k + i) % 3]);
      }
    }
    // water finding its way through the brick and dropping off the crown
    for (const d of drips) {
      const dx = Math.round(((d.x - S * 0.9) % (VW + 80) + VW + 80) % (VW + 80) - 40);
      if (dx < 0 || dx > VW) continue;
      const k = d.t / 6;
      if (k < 0.5) { g.fillStyle = 'rgba(150,196,214,0.5)'; g.fillRect(dx, 18 + Math.round(k * 10), 1, 2); }
      else { g.fillStyle = 'rgba(150,196,214,0.7)'; g.fillRect(dx, Math.round(24 + (k - 0.5) * 300), 1, 3); }
    }
    // vines coming down out of the dark between the lights
    for (let i = 0; i < 9; i++) {
      const x = Math.round(((i * 98 - S * 0.75) % (VW + 196) + VW + 196) % (VW + 196) - 98);
      if (x < -30 || x > VW + 30) continue;
      vine(g, x, 0, 60 + ((i * 37) % 70), 400 + i * 17, Math.sin(t * 0.5 + i) * 1.4);
    }
    g.restore();
    // the ring beam the vault springs from: a stone string course
    Art.rect(g, 0, BEAM - 4, VW, 8, '#3a2e22');
    Art.rect(g, 0, BEAM - 4, VW, 2, '#6a5a44');
    Art.rect(g, 0, BEAM + 2, VW, 2, '#1e1610');
    for (let x = -((S * 0.9) % 44); x < VW; x += 44) Art.rect(g, Math.round(x), BEAM - 4, 1, 8, '#241c14');
  }
  function drawWall(g, S) {
    // Twelve courses of brick from the string course down to the floor, with
    // the damp coming up the bottom of it and vines all over the top.
    for (let i = 0; i < 11; i++) {
      const y = BEAM + 4 + i * 14;
      if (y > FLOOR) break;
      brickRow(g, 0, y, VW, 14, -((S * 0.9 + (i % 2) * 15) % 30), i * 77, 0.18);
    }
    const oa = g.globalAlpha;
    g.globalAlpha = 0.34;                  // rising damp, darkest at the skirting
    for (let i = 0; i < 7; i++) Art.rect(g, 0, FLOOR - 4 - i * 7, VW, 7, i < 3 ? '#16281c' : '#1d2a22');
    g.globalAlpha = oa;
    // saltpetre bloom and soot, so no two feet of it look the same
    const wr = Art.rng(9031);
    for (let i = 0; i < 260; i++) {
      const x = Math.round(wr() * VW), y = BEAM + 6 + Math.round(wr() * (FLOOR - BEAM - 8));
      const k = wr();
      g.fillStyle = k < 0.4 ? 'rgba(206,196,172,0.32)' : k < 0.7 ? 'rgba(20,14,10,0.42)' : 'rgba(120,150,110,0.3)';
      g.fillRect(x, y, 1 + (k > 0.9 ? 1 : 0), 1);
    }
    // arched alcoves cut into the brick, with a lantern in each
    for (let i = 0; i < 5; i++) {
      const x = Math.round(((i * 210 - S * 0.9) % (VW + 420) + VW + 420) % (VW + 420) - 210);
      if (x < -60 || x > VW + 60) continue;
      const ay = BEAM + 26, ah = 62;
      Art.rect(g, x - 20, ay, 40, ah, '#1a1210');
      Art.poly(g, [[x - 20, ay], [x + 20, ay], [x + 12, ay - 12], [x - 12, ay - 12]], '#1a1210');
      Art.rect(g, x - 17, ay + 2, 34, ah - 4, '#241a14');
      Art.poly(g, [[x - 17, ay + 2], [x + 17, ay + 2], [x + 10, ay - 9], [x - 10, ay - 9]], '#241a14');
      Art.rect(g, x - 17, ay + ah - 8, 34, 6, '#4a3a2a');         // the shelf in it
      Art.rect(g, x - 17, ay + ah - 8, 34, 2, '#6a5438');
      Art.rect(g, x - 5, ay + ah - 22, 10, 14, '#3a3028');        // a lantern on the shelf
      Art.rect(g, x - 4, ay + ah - 21, 8, 12, '#ffcf6a');
      Art.rect(g, x - 2, ay + ah - 17, 4, 6, '#fff3c8');
      Art.glow(g, x, ay + ah - 15, 40, '#ffcf6a', 0.2, 6);
    }
    // the vines: up the wall, along the string course, and back down
    for (let i = 0; i < 13; i++) {
      const x = Math.round(((i * 68 - S * 0.9) % (VW + 136) + VW + 136) % (VW + 136) - 68);
      if (x < -24 || x > VW + 24) continue;
      vine(g, x, BEAM + 4, BEAM + 40 + ((i * 53) % 90), 900 + i * 29, Math.sin(t * 0.4 + i * 1.7) * 1.1);
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
    // a proper hop when hovered: up on the sine, squashed at the bottom
    const hopT = t * (hot ? 7 : 1.5) + s.x * 0.05;
    const raw = Math.abs(Math.sin(hopT));
    const bob = hot ? -raw * 6 : Math.sin(hopT) * 1.6;
    const sqz = hot ? (1 - raw) * 0.22 : 0;
    const y = s.y + bob;
    if (sqz > 0.001) { g.save(); g.translate(x, s.y + 13); g.scale(1 + sqz, 1 - sqz); g.translate(-x, -(s.y + 13)); }
    if (s.p.kind !== 'seed') { drawGood(g, s, x, y, hot); if (sqz > 0.001) g.restore(); return; }
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
      Art.glow(g, x, y - 26, 34 + p * 8, '#b98ef0', 0.16 + p * 0.1, 4);
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
    if (sqz > 0.001) g.restore();
    if (hot) {
      Font.draw(g, s.p.name.toUpperCase(), x, s.y - 56, { scale: 1, color: '#e8f4d8', align: 'center', shadow: '#12200e' });
    }
  }

  // Garden goods: a tool or a piece of garden furniture stood in an open crate
  // of straw, with the same price stake as the plants so the aisle reads alike.
  function drawGood(g, s, x, y, hot) {
    g.fillStyle = 'rgba(0,0,0,0.26)'; Art.ell(g, x, s.y + 13, 18, 5);
    Art.rect(g, x - 16, y - 6, 32, 20, '#3a2a18');                 // the crate
    Art.rect(g, x - 15, y - 5, 30, 18, '#7a5836');
    for (let i = 0; i < 3; i++) Art.rect(g, x - 15, y - 3 + i * 6, 30, 1.6, '#5a3d26');
    Art.rect(g, x - 15, y - 5, 30, 1.6, '#9c744a');
    Art.rect(g, x - 16, y - 6, 3, 20, '#4a3422'); Art.rect(g, x + 13, y - 6, 3, 20, '#4a3422');
    for (let i = 0; i < 12; i++) {                                 // straw packing
      const sx = x - 13 + ((i * 7) % 26), sy = y - 7 + ((i * 5) % 4);
      Art.rect(g, sx, sy, 3 + (i % 3), 1, i % 2 ? '#c2a15c' : '#9c8040');
    }
    // furniture shows the actual piece; everything else shows its icon
    if (s.p.furn) {
      const d = s.p.furn, sc = Math.min(1.6, 34 / Math.max(d.w, d.h));
      Props.drawFurniture(g, d.key, Math.round(x), Math.round(y - 6), sc);
    } else Icons.blit(g, s.p.icon, Math.round(x - 16), Math.round(y - 40), 2);   // what is in it
    if (s.p.sold) {                                                // a SOLD card over it
      Art.rect(g, x - 17, y - 2, 34, 11, '#3a1a14');
      Art.rect(g, x - 16, y - 1, 32, 9, '#a8402c');
      Font.draw(g, 'SOLD', x, y + 1, { scale: 1, color: '#ffe0d0', align: 'center' });
    } else {
      const label = String(s.p.price);
      const w = Math.max(30, Font.width(label, 1) + 16);
      g.fillStyle = '#3a2a18'; g.fillRect(x + 9, y - 4, 2, 14);
      g.fillStyle = '#1d2a14'; g.fillRect(x + 4, y - 14, w, 12);
      g.fillStyle = hot ? '#e8f4d8' : '#cfe0bc'; g.fillRect(x + 5, y - 13, w - 2, 10);
      Font.draw(g, label, x + 4 + w / 2, y - 11, { scale: 1, color: '#2a3a20', align: 'center' });
    }
    const n = countOf(s.p.id);
    if (n) { Art.ell(g, x + 16, y - 24, 8, 8, '#2f8f42'); FX.pixelText(g, String(n), x + 16, y - 27, { color: '#fff', size: 7 }); }
    if (hot) Font.draw(g, s.p.name.toUpperCase(), x, y - 52, { scale: 1, color: '#e8f4d8', align: 'center', shadow: '#12200e' });
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
    grootX: () => Math.round(groot.x - scroll),
    init(g) { G = g; }, enter, leave, update, render, press, move, release, hover: hoverAt, wheel,
    add, addById, removeOne, removeLine, clear, checkout, total, lines, layout, catalogue,
    setScroll(f) { tscroll = (worldW - VW) * U.clamp(f, 0, 1); scroll = tscroll; },
    get basket() { return basket; }, get worldW() { return worldW; },
  };
})();
