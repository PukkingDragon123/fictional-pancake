// ---- The title screen -----------------------------------------------------
// The front gate of the farm on a sunny afternoon, with three wombats
// pottering about in front of it. Walk through the gate to play.
const Menu = (() => {
  const VW = 640, VH = 360;
  const HORIZON = 168;                  // where the canopy meets the floor

  let G = null;                         // the settings bag, not a save
  let t = 0, page = 'home', hover = null, confirm = null;
  let buttons = [];
  let onAct = null;
  let hasSave = false;

  const MIST = 'rgba(146,172,146,';

  // ---- the wood ------------------------------------------------------------
  // Five ranks of the grove's own trees, darkened further the deeper they sit.
  const R = Art.rng(90210);
  const RANKS = [
    { n: 7, y: 156, s: 1.0, sh: 0.44 },
    { n: 6, y: 180, s: 1.3, sh: 0.56 },
    { n: 5, y: 210, s: 1.7, sh: 0.7 },
    { n: 4, y: 252, s: 2.2, sh: 0.84 },
    { n: 3, y: 344, s: 3.2, sh: 0.93 },
  ];
  const KINDS = ['gnarl', 'oak', 'pine', 'birch', 'gnarl'];
  const wood = [];
  RANKS.forEach((rk, d) => {
    for (let i = 0; i < rk.n; i++) {
      wood.push({
        d, x: (i + 0.5) * (VW / rk.n) + (R() - 0.5) * (VW / rk.n) * 0.7,
        y: rk.y + (R() - 0.5) * 10, s: rk.s * (0.82 + R() * 0.34), sh: rk.sh,
        kind: KINDS[Math.floor(R() * KINDS.length)], v: Math.floor(R() * 6),
        sway: R() * TAU,
      });
    }
  });
  // The undergrowth is the same stuff you have to clear in the grove.
  const scrub = [];
  for (let i = 0; i < 30; i++) {
    scrub.push({ x: R() * VW, y: 250 + R() * 106, s: 0.5 + R() * 0.9, v: Math.floor(R() * 6), ph: R() * TAU });
  }
  const motes = [];
  for (let i = 0; i < 44; i++) motes.push({ x: R() * VW, y: 110 + R() * 250, ph: R() * TAU, sp: 0.2 + R() * 0.5 });
  const eyes = [];
  for (let i = 0; i < 10; i++) eyes.push({ x: 24 + R() * (VW - 48), y: 150 + R() * 92, ph: R() * TAU, on: 0 });

  // ---- three wombats, having a nice time ----------------------------------
  // Nobody is working. One grazes its way across the clearing, one has gone to
  // sleep on the warm side of a mound, and one is up and about looking at
  // things. They each run a little loop of their own.
  const MOB = [
    { x: 250, y: 318, dir: 1, tx: 330, state: 'walk', st: 0, anim: 0, pelt: 'brown', sc: 1.5, home: [150, 420] },
    { x: 380, y: 282, dir: -1, tx: 340, state: 'sleep', st: 0, anim: 0, pelt: 'sand', sc: 1.2, home: [280, 470] },
    { x: 120, y: 348, dir: 1, tx: 200, state: 'graze', st: 0, anim: 0, pelt: 'grey', sc: 1.6, home: [60, 260] },
  ];
  const hearts = [];
  function wombatLoop(dt) {
    for (const w of MOB) {
      w.anim += dt * (w.state === 'walk' ? 12 : 5);
      w.st += dt;
      if (w.state === 'walk') {
        const dx = w.tx - w.x;
        w.dir = dx < 0 ? -1 : 1;
        w.x += Math.sign(dx) * 22 * dt;
        if (Math.abs(dx) < 4) { w.state = U.pick(['graze', 'idle', 'graze', 'happy']); w.st = 0; }
      } else if (w.st > (w.state === 'sleep' ? 9 : w.state === 'happy' ? 1.4 : 4 + Math.random() * 4)) {
        w.st = 0;
        if (Math.random() < 0.25) { w.state = 'sleep'; }
        else { w.state = 'walk'; w.tx = w.home[0] + Math.random() * (w.home[1] - w.home[0]); w.y = 272 + Math.random() * 84; }
      }
      if (w.state === 'happy' && Math.random() < dt * 5) hearts.push({ x: w.x, y: w.y - 26, t: 0 });
      if (w.state === 'graze' && Math.random() < dt * 2.2) hearts.push({ x: w.x + w.dir * 14, y: w.y - 6, t: 0, leaf: 1 });
    }
    for (let i = hearts.length - 1; i >= 0; i--) { hearts[i].t += dt; if (hearts[i].t > 1.2) hearts.splice(i, 1); }
  }
  function drawWombat(g) {
    for (const w of MOB.slice().sort((a, b) => a.y - b.y)) {
      const f = Math.floor(w.anim);
      Sprites.shadow(g, w.x, w.y, w.state, f, w.pelt, w.dir, 'adult', w.sc);
      Sprites.blit(g, w.x, w.y, w.state, f, w.pelt, w.dir, 'adult', w.sc);
      if (w.state === 'sleep') {
        const k = (t * 0.5) % 1;
        g.globalAlpha = 1 - k;
        Font.draw(g, 'z', w.x + 20 + k * 8, w.y - 32 - k * 14, { scale: 1, color: '#fff4d8' });
        g.globalAlpha = 1;
      }
    }
    for (const h of hearts) {
      const a = 1 - h.t / 1.2;
      g.globalAlpha = a;
      if (h.leaf) { g.fillStyle = '#84bb59'; g.fillRect(Math.round(h.x), Math.round(h.y - h.t * 14), 2, 2); }
      else Icons.blit(g, 'heart', h.x - 5, h.y - h.t * 22, 0.7);
      g.globalAlpha = 1;
    }
  }

  function init(settings, saved, act) { G = settings; hasSave = !!saved; onAct = act; }
  function setSave(v) { hasSave = !!v; }
  function enter() { t = 0; page = 'home'; confirm = null; hover = null; rumour = Math.floor(Math.random() * RUMOURS.length); Audio.setMode('menu'); }

  // ---- the kit -----------------------------------------------------------
  // The same interface the rest of the game wears, drawn on the canvas: a
  // tan parchment page held in a cover of dark oiled wood, teal iron brackets
  // bolted over the corners, a red ribbon down one edge, wood plank banners
  // for the headings and beaten gold for anything you can press. Corners are
  // cut in one step, never curved.
  // The same warm wood and sage-green iron the rest of the interface wears.
  const KIT = {
    ink: '#1a110b',
    t0: '#241509', t1: '#3f2712', t2: '#6a4020', t3: '#a46b36', t4: '#c68c4c',
    i0: '#1e3a1c', i1: '#2f5a2a', i2: '#4a8a3e', i3: '#6fb85a', i4: '#a8e08a',
    p0: '#9c7f4e', p1: '#c09b62', p2: '#edd3a2', p3: '#f6e4ba', p4: '#fffae8',
    g0: '#7a4c06', g1: '#bd8410', g2: '#efb625', g3: '#ffd95c', g4: '#fff3b8',
    d0: '#1e3a1c', d2: '#4a8a3e', d3: '#6fb85a', d4: '#a8e08a',
    rib: '#d84428', rib0: '#902418',
  };
  // a box with one step cut out of each corner
  function cut(g, x, y, w, h, col, c = 3) {
    Art.rect(g, x + c, y, w - c * 2, h, col);
    Art.rect(g, x, y + c, w, h - c * 2, col);
  }
  // the page: a wooden cover, a parchment leaf inside it, four iron brackets
  // bolted over the corners and a ribbon hanging out of the top
  function board(g, x, y, w, h) {
    cut(g, x - 3, y - 3, w + 6, h + 6, KIT.ink, 4);
    cut(g, x, y, w, h, KIT.t2, 3);                                  // the wood cover
    Art.rect(g, x + 3, y + 3, w - 6, 2, KIT.t3);                    // light on the top board
    Art.rect(g, x + 3, y + h - 5, w - 6, 2, KIT.t0);
    for (let gx = x + 6; gx < x + w - 6; gx += 7) {                 // the grain in it
      Art.rect(g, gx, y + 3, 1, h - 6, gx % 2 ? KIT.t1 : KIT.t3);
    }
    cut(g, x + 5, y + 5, w - 10, h - 10, KIT.t0, 2);                // the dark rebate
    cut(g, x + 7, y + 7, w - 14, h - 14, KIT.p0, 2);
    cut(g, x + 8, y + 8, w - 16, h - 16, KIT.p2, 2);                // the parchment leaf
    Art.rect(g, x + 8, y + 8, w - 16, 3, KIT.p3);
    for (let gx = x + 12; gx < x + w - 12; gx += 9) {               // the tooth of the paper
      Art.rect(g, gx, y + 11, 1, h - 22, KIT.p3);
    }
    // the iron corner brackets: two arms and a rivet on each
    for (const [sx, sy, dx, dy] of [[x + 2, y + 2, 1, 1], [x + w - 3, y + 2, -1, 1],
      [x + 2, y + h - 3, 1, -1], [x + w - 3, y + h - 3, -1, -1]]) {
      const ax = dx > 0 ? sx : sx - 17, ay = dy > 0 ? sy : sy - 5;
      const bx = dx > 0 ? sx : sx - 5, by2 = dy > 0 ? sy : sy - 17;
      Art.rect(g, ax, ay, 18, 6, KIT.i1);
      Art.rect(g, bx, by2, 6, 18, KIT.i1);
      Art.rect(g, ax, dy > 0 ? ay : ay + 4, 18, 2, dy > 0 ? KIT.i3 : KIT.i0);
      Art.rect(g, dx > 0 ? bx : bx + 4, by2, 2, 18, dx > 0 ? KIT.i3 : KIT.i0);
      Art.rect(g, dx > 0 ? sx + 2 : sx - 4, dy > 0 ? sy + 2 : sy - 4, 2, 2, KIT.i4);
    }
    // the ribbon bookmark, hung over the top edge a third of the way along
    const rx0 = Math.round(x + w * 0.3);
    Art.rect(g, rx0 - 1, y - 7, 8, 24, KIT.ink);
    Art.rect(g, rx0, y - 6, 6, 22, KIT.rib);
    Art.rect(g, rx0, y - 6, 2, 22, '#c9525a');
    Art.rect(g, rx0, y + 12, 6, 4, KIT.rib0);
  }
  // the heading: a plank of dark wood with an iron cap hammered on each end
  function plate(g, x, y, w, h, text, scale = 2) {
    Art.rect(g, x - 2, y - 2, w + 4, h + 4, KIT.ink);
    Art.rect(g, x, y, w, h, KIT.t1);
    Art.rect(g, x, y, w, 3, KIT.t3);                          // light along the top board
    Art.rect(g, x, y + h - 4, w, 4, KIT.t0);
    Art.rect(g, x + 8, y + Math.round(h / 2), w - 16, 1, KIT.t0);   // the seam between planks
    for (let gx = x + 12; gx < x + w - 12; gx += 11) Art.rect(g, gx, y + 4, 1, h - 9, KIT.t2);
    for (const [cx, sd] of [[x, 1], [x + w - 9, -1]]) {       // the iron caps
      Art.rect(g, cx, y - 1, 9, h + 2, KIT.i1);
      Art.rect(g, cx, y - 1, 9, 2, KIT.i3);
      Art.rect(g, cx, y + h - 1, 9, 2, KIT.i0);
      Art.rect(g, sd > 0 ? cx + 8 : cx, y - 1, 1, h + 2, KIT.i0);
      Art.rect(g, cx + 3, y + h / 2 - 1, 3, 3, KIT.i4);       // the rivet in it
    }
    Font.draw(g, text, x + w / 2, y + (h - scale * 7) / 2 + 1, { scale, color: '#1a0f06', align: 'center' });
    Font.draw(g, text, x + w / 2, y + (h - scale * 7) / 2, { scale, color: KIT.p4, align: 'center' });
  }
  // the name of the game, on the biggest plate there is
  function titleSign(g) {
    const cx = VW / 2, w = 340, h = 92, y = 24;
    const bob = Math.sin(t * 1.1) * 1.4;
    board(g, cx - w / 2, y + bob, w, h);
    plate(g, cx - w / 2 + 14, y + bob + 14, w - 28, 30, 'WOMBAT', 3);
    plate(g, cx - w / 2 + 14, y + bob + 50, w - 28, 30, 'GODS', 3);
    // a length of chain down each side of the cover, because it is that sort
    // of book, and a gold boss where the two plates meet
    for (const sx of [cx - w / 2 - 7, cx + w / 2 + 1]) {
      for (let ly = 0; ly < h - 6; ly += 7) {
        Art.rect(g, sx, y + bob + 4 + ly, 6, 5, KIT.ink);
        Art.rect(g, sx + 1, y + bob + 5 + ly, 4, 3, ly % 14 ? KIT.i2 : KIT.i1);
        Art.rect(g, sx + 1, y + bob + 5 + ly, 4, 1, KIT.i4);
      }
    }
    for (const sx of [cx - w / 2 + 3, cx + w / 2 - 9]) {
      Art.rect(g, sx - 1, y + bob + h / 2 - 6, 8, 12, KIT.ink);
      Art.rect(g, sx, y + bob + h / 2 - 5, 6, 10, KIT.g2);
      Art.rect(g, sx, y + bob + h / 2 - 5, 6, 3, KIT.g4);
      Art.rect(g, sx, y + bob + h / 2 + 2, 6, 3, KIT.g0);
    }
  }

  // ---- the paradise --------------------------------------------------------
  // Not a dark wood any more. A clearing in high summer: three treehouses up
  // in the canopy with rope between them, flowers through the grass, moss over
  // every log and stone, a pond, birds going over and three wombats in it.
  const LX = 470, LY = 150;                             // the lantern, on the near house
  const FLOWERS = [], TUFTS = [], STONES = [];
  (() => {
    const r = Art.rng(7711);
    for (let i = 0; i < 128; i++) FLOWERS.push({ x: 14 + r() * (VW - 28), y: 212 + r() * 150, v: Math.floor(r() * 5), ph: r() * TAU, s: 1.5 + r() * 1.5 });
    for (let i = 0; i < 420; i++) TUFTS.push({ x: r() * VW, y: 206 + r() * 156, h: 4 + r() * 8, ph: r() * TAU, tone: Math.floor(r() * 3) });
    for (let i = 0; i < 30; i++) STONES.push({ x: r() * VW, y: 226 + r() * 132, w: 7 + r() * 16, h: 4 + r() * 7 });
  })();
  const BIRDS = [];
  for (let i = 0; i < 11; i++) BIRDS.push({ x: Math.random() * VW, y: 24 + Math.random() * 100, sp: 16 + Math.random() * 26, ph: Math.random() * TAU, dir: Math.random() < 0.5 ? -1 : 1, s: 0.7 + Math.random() * 0.6 });
  const FLOW = ['#ffd6e6', '#ffd95c', '#ffb0c8', '#fffae8', '#ff9a72'];

  // ---- the small life ------------------------------------------------------
  // A title screen wants things to look at. Motes in the light, bugs over the
  // flowers, mushrooms in the leaf litter, a moth round the lantern, and a line
  // of ants going somewhere with a crumb.
  const MOTES = [], BUGS = [], SHROOMS = [], ANTS = [];
  (() => {
    const r = Art.rng(5150);
    for (let i = 0; i < 70; i++) MOTES.push({ x: r() * VW, y: 60 + r() * 260, ph: r() * TAU, sp: 3 + r() * 9, a: 0.25 + r() * 0.5 });
    for (let i = 0; i < 16; i++) BUGS.push({ x: r() * VW, y: 200 + r() * 150, ph: r() * TAU, rx: 12 + r() * 26, ry: 5 + r() * 9, sp: 0.5 + r(), v: Math.floor(r() * 3) });
    for (let i = 0; i < 26; i++) SHROOMS.push({ x: 10 + r() * (VW - 20), y: 214 + r() * 146, v: Math.floor(r() * 3), s: 1 + r() * 0.8 });
    for (let i = 0; i < 14; i++) ANTS.push({ o: i * 11, load: i % 5 === 0 });
  })();
  const SHROOM_COL = [['#d84428', '#ffd6c8'], ['#c09b62', '#f6e4ba'], ['#e0704a', '#fff0d8']];
  function smallLife(g, front) {
    // mushrooms in the litter, which sort with the ground
    if (!front) {
      for (const m of SHROOMS) {
        const [cap, dot] = SHROOM_COL[m.v];
        const w2 = Math.round(5 * m.s), h2 = Math.round(4 * m.s);
        Art.rect(g, m.x - 1, m.y - 3, 2, 4, '#e8dcc0');
        Art.rect(g, m.x - w2 / 2 - 1, m.y - 6, w2 + 2, h2 + 1, '#000000');
        Art.rect(g, m.x - w2 / 2, m.y - 6, w2, h2, cap);
        Art.rect(g, m.x - w2 / 2, m.y - 6, w2, 1, U.shade(cap, 0.35));
        Art.rect(g, m.x - 1, m.y - 5, 1, 1, dot);
      }
      return;
    }
    // motes hanging in the light
    for (const m of MOTES) {
      const y = m.y + Math.sin(t * 0.4 + m.ph) * 7;
      const x = m.x + Math.cos(t * 0.25 + m.ph) * 11;
      Art.rect(g, Math.round(x), Math.round(y), 1, 1, U.rgba('#fff4d0', m.a * (0.5 + 0.5 * Math.sin(t * 2 + m.ph))));
    }
    // bugs going round and round over the flowers
    for (const b of BUGS) {
      const x = Math.round(b.x + Math.cos(t * b.sp + b.ph) * b.rx);
      const y = Math.round(b.y + Math.sin(t * b.sp * 1.4 + b.ph) * b.ry);
      const col = ['#ffd95c', '#ffb0c8', '#fffae8'][b.v];
      Art.rect(g, x - 1, y - 1, 3, 3, '#000000');
      Art.rect(g, x, y, 2, 1, col);
      const wing = Math.floor(t * 18 + b.ph) % 2;
      Art.rect(g, x - 1, y - 1 + wing, 1, 1, '#fffae8');
      Art.rect(g, x + 2, y - 1 + wing, 1, 1, '#fffae8');
    }
    // and a line of ants across the front of the clearing
    for (const a2 of ANTS) {
      const p2 = ((t * 11 + a2.o) % (VW + 40)) - 20;
      const y = 352 + Math.sin(p2 * 0.06) * 3;
      Art.rect(g, Math.round(p2), Math.round(y), 2, 2, '#1d1208');
      Art.rect(g, Math.round(p2) + 2, Math.round(y), 1, 1, '#1d1208');
      if (a2.load) Art.rect(g, Math.round(p2) - 2, Math.round(y) - 2, 3, 3, '#92dc5e');
    }
  }

  // ---- the ground ------------------------------------------------------------
  // Not a lawn. The same worn soil the plot is made of, with the treeline
  // throwing a band of shade across the back of it and the grass coming back
  // in patches, which is exactly what you are looking at all game.
  let floorTex = null;
  function floorCanvas() {
    if (floorTex) return floorTex;
    const h = VH - HORIZON + 10;
    const { c, g } = Art.cv(VW, h);
    const r = Art.rng(4242);
    for (let i = 0; i < 10; i++) {                        // bands of soil, front to back
      const k = i / 9;
      g.fillStyle = U.mix('#4a3628', '#6b5238', k);
      g.fillRect(0, Math.round((h * i) / 10), VW, Math.ceil(h / 10) + 1);
    }
    for (let i = 0; i < 900; i++) {                       // grit
      const x = Math.round(r() * VW), y = Math.round(r() * h);
      g.fillStyle = ['#3b2a1b', '#553d27', '#75573a', '#9b7a52'][Math.floor(r() * 4)];
      g.fillRect(x, y, 1 + Math.floor(r() * 2), 1);
    }
    for (let i = 0; i < 80; i++) {                        // pebbles
      const x = Math.round(r() * VW), y = Math.round(6 + r() * (h - 12));
      const w = 2 + Math.floor(r() * 3);
      g.fillStyle = '#6b6455'; g.fillRect(x, y, w, 2);
      g.fillStyle = '#8d8573'; g.fillRect(x, y, w, 1);
      g.fillStyle = 'rgba(24,20,16,0.45)'; g.fillRect(x, y + 2, w + 1, 1);
    }
    for (let i = 0; i < 26; i++) {                        // cart ruts and scuffs
      const x = Math.round(r() * VW), y = Math.round(r() * h), w = 14 + Math.round(r() * 40);
      g.fillStyle = 'rgba(38,26,16,0.3)'; g.fillRect(x, y, w, 2);
    }
    floorTex = c;
    return c;
  }
  // the patches of grass that have taken, painted once and kept
  let grassTex = null;
  function grassCanvas() {
    if (grassTex) return grassTex;
    const h = VH - HORIZON + 10;
    const { c, g } = Art.cv(VW, h);
    const r = Art.rng(1717);
    for (let i = 0; i < 26; i++) {
      const cx = r() * VW, cy = 16 + r() * (h - 24), rx = 26 + r() * 60, ry = 8 + r() * 20;
      for (let k = 0; k < 260; k++) {                     // a scatter, not an ellipse
        const a = r() * TAU, d = Math.sqrt(r());
        const x = Math.round(cx + Math.cos(a) * rx * d), y = Math.round(cy + Math.sin(a) * ry * d);
        g.fillStyle = ['#3f6330', '#4f7a34', '#5d9440'][Math.floor(r() * 3)];
        g.fillRect(x, y, 2, 1);
      }
    }
    grassTex = c;
    return c;
  }
  function drawFloor(g, day) {
    g.drawImage(floorCanvas(), 0, HORIZON - 6);
    g.globalAlpha = 0.5 + day * 0.3;
    g.drawImage(grassCanvas(), 0, HORIZON - 6);
    g.globalAlpha = 1;
    // the treeline throws a band of shade across the back of the clearing
    for (let i = 0; i < 8; i++) {
      g.globalAlpha = 0.3 * (1 - i / 8);
      Art.rect(g, 0, HORIZON - 6 + i * 7, VW, 7, '#12100e');
    }
    g.globalAlpha = 1;
  }
  // the split-rail fence that runs down both sides of every plot in this game
  function railFence(g) {
    // it runs away from you, so it spreads outward as it comes forward, the
    // same as the one round the plot
    const at = (side, y) => (side < 0 ? 52 : VW - 52) + side * (y - HORIZON) * 0.26;
    for (const side of [-1, 1]) {
      for (let i = 6; i >= 0; i--) {
        const y = HORIZON + 30 + i * 26;
        const x = at(side, y);
        const h = 26 + i * 3;
        if (i < 6) {                                       // the rails, behind the post
          const y2 = y + 26, x2 = at(side, y2);
          for (const off of [-0.7, -0.38]) {
            const a = y + h * off, b = y2 + (h + 3) * off;
            Art.poly(g, [[x, a], [x2, b], [x2, b + 6], [x, a + 6]], '#241810');
            Art.poly(g, [[x, a + 1], [x2, b + 1], [x2, b + 5], [x, a + 5]], '#6b4d34');
            Art.poly(g, [[x, a + 1], [x2, b + 1], [x2, b + 2.4], [x, a + 2.4]], '#8a6446');
          }
        }
        Art.rect(g, x - 4, y - h, 9, h + 4, '#241810');    // the post
        Art.rect(g, x - 3, y - h, 6, h + 3, '#5d4430');
        Art.rect(g, x - 3, y - h, 2, h + 3, '#7d5f42');
        Art.rect(g, x - 4, y - h - 2, 9, 3, '#3a2a1c');    // the cap
        g.fillStyle = PAL.moss1;                            // moss up the foot of it
        g.fillRect(Math.round(x - 4), Math.round(y - 5), 9, 7);
        g.fillStyle = PAL.moss2; g.fillRect(Math.round(x - 3), Math.round(y - 9), 5, 4);
        g.fillStyle = PAL.moss3; g.fillRect(Math.round(x - 1), Math.round(y - 12), 3, 3);
      }
    }
  }

  // one flower: a stalk, two leaves and a four-petal head
  function flower(g, f) {
    const sway = Math.sin(t * 1.1 + f.ph) * 2.2;
    const h = Math.round(8 * f.s);
    const st = Math.max(1, Math.round(f.s * 0.8));
    g.fillStyle = '#2f5a22';
    for (let i = 0; i < h; i++) g.fillRect(Math.round(f.x + sway * (i / h) * (i / h)), Math.round(f.y - i), st + 1, 1);
    g.fillStyle = '#4f8a36';
    for (let i = 0; i < h; i++) g.fillRect(Math.round(f.x + sway * (i / h) * (i / h)), Math.round(f.y - i), st, 1);
    const hx = Math.round(f.x + sway), hy = Math.round(f.y - h);
    // two leaves off the stalk, sized with it
    const lw = Math.round(3 * f.s);
    g.fillStyle = '#3f6a2c';
    g.fillRect(hx - lw - 1, Math.round(f.y - h * 0.45), lw, 2);
    g.fillRect(hx + st, Math.round(f.y - h * 0.68), lw, 2);
    g.fillStyle = '#5d9440';
    g.fillRect(hx - lw - 1, Math.round(f.y - h * 0.45), lw - 1, 1);
    // the head: four petals round a middle, all on the pixel grid
    const c = FLOW[f.v], dk = U.shade(c, -0.34), lt = U.shade(c, 0.28);
    const pr = Math.max(2, Math.round(2.4 * f.s));
    g.fillStyle = dk;
    g.fillRect(hx - pr * 2, hy - pr, pr * 4, pr * 2);
    g.fillRect(hx - pr, hy - pr * 2, pr * 2, pr * 4);
    g.fillStyle = c;
    g.fillRect(hx - pr * 2 + 1, hy - pr + 1, pr * 4 - 2, pr * 2 - 2);
    g.fillRect(hx - pr + 1, hy - pr * 2 + 1, pr * 2 - 2, pr * 4 - 2);
    g.fillStyle = lt;
    g.fillRect(hx - pr * 2 + 1, hy - pr + 1, pr - 1, pr);
    g.fillRect(hx - pr + 1, hy - pr * 2 + 1, pr, pr - 1);
    g.fillStyle = '#ffeeb0';
    g.fillRect(hx - Math.round(pr * 0.6), hy - Math.round(pr * 0.6), Math.round(pr * 1.2), Math.round(pr * 1.2));
    g.fillStyle = '#e0a82e';
    g.fillRect(hx - Math.round(pr * 0.3), hy - Math.round(pr * 0.3), Math.max(1, Math.round(pr * 0.6)), Math.max(1, Math.round(pr * 0.6)));
  }
  function bird(g, b) {
    const x = ((b.x + t * b.sp * b.dir) % (VW + 60) + VW + 60) % (VW + 60) - 30;
    const y = b.y + Math.sin(t * 0.8 + b.ph) * 9;
    const flap = Math.sin(t * 9 + b.ph);
    const w = 5 * b.s, up = flap * 3 * b.s;
    g.fillStyle = '#2e2a34';
    g.fillRect(Math.round(x - w), Math.round(y - up), Math.round(w), 1);
    g.fillRect(Math.round(x), Math.round(y - up), Math.round(w), 1);
    g.fillRect(Math.round(x - 1), Math.round(y), 2, 1);
  }
  // ==== THE FARM GATE ========================================================
  // A sunny afternoon at the front gate of the farm: blue sky, clouds going
  // over, soft hills and a line of trees, bunting strung across, flowers all
  // along the path, and three wombats pottering about. The gate is the button:
  // point at it and it swings open.
  const GTOP = 104, GBOT = 300;                // the gate, top and bottom
  const GX = 320;                              // and the middle of it
  const PXM = 2;

  // the trees behind it, in four ranks
  const BACK = [];
  (() => {
    const r = Art.rng(31337);
    for (let d = 0; d < 3; d++) {
      let x = -30;
      while (x < VW + 40) {
        const s = 0.7 + d * 0.25;
        BACK.push({ d, x, w: (26 + r() * 20) * s, h: (54 + r() * 40) * s, v: Math.floor(r() * 3), ph: r() * TAU });
        x += (30 + r() * 44) * s;
      }
    }
  })();
  const CLOUDS = [];
  (() => { const r = Art.rng(808); for (let i = 0; i < 6; i++) CLOUDS.push({ x: r() * VW, y: 26 + r() * 90, w: 40 + r() * 50, sp: 3 + r() * 6 }); })();
  const PATHF = [];                            // flowers along both sides of the path
  (() => {
    const r = Art.rng(4242);
    for (let i = 0; i < 70; i++) {
      const y = 258 + r() * 100, k = (y - GBOT) / (VH - GBOT);
      const side = r() < 0.5 ? -1 : 1, edge = 60 + Math.max(0, k) * 70;
      const x = r() < 0.55 ? GX + side * (edge + 6 + r() * 60) : 20 + r() * (VW - 40);
      if (Math.abs(x - GX) < edge + 4 && y > GBOT - 4) continue;
      PATHF.push({ x, y, v: Math.floor(r() * 5), ph: r() * TAU, s: 1 + r() * 0.9 });
    }
    PATHF.sort((a2, b2) => a2.y - b2.y);
  })();
  const FLAG = ['#ff9a8a', '#ffd95c', '#9fd8f0', '#b8e890', '#ffc4dd', '#fff4d8'];

  function hills(g, y0, amp, freq, ph, col, top) {
    for (let x = 0; x < VW; x += PXM) {
      const y = Math.round((y0 + Math.sin(x * freq + ph) * amp + Math.sin(x * freq * 2.3 + ph * 1.7) * amp * 0.35) / PXM) * PXM;
      g.fillStyle = col; g.fillRect(x, y, PXM, 260 - y + 10);
      if (top) { g.fillStyle = top; g.fillRect(x, y, PXM, PXM); }
    }
  }
  function cloud(g, c) {
    const x = ((c.x + t * c.sp) % (VW + 160)) - 80, y = c.y;
    for (const [dx, dy, rx, ry, col] of [[0, 4, c.w * 0.62, 9, '#dcecf4'], [-c.w * 0.3, 2, c.w * 0.3, 8, '#ffffff'],
      [c.w * 0.05, -3, c.w * 0.34, 11, '#ffffff'], [c.w * 0.34, 3, c.w * 0.26, 7, '#ffffff']]) Art.ell(g, x + dx, y + dy, rx, ry, col);
    Art.rect(g, x - c.w * 0.55, y + 10, c.w * 1.1, 2, '#cfe2ec');
  }

  // ---- the scene -------------------------------------------------------------
  function scene(g) {
    // the sky, soft blue into a warm haze at the hills
    for (let y = 0; y < 230; y += PXM) {
      const k = y / 230;
      g.fillStyle = U.mix('#78c2ec', '#e6f4e6', Math.min(1, k * 1.1));
      g.fillRect(0, y, VW, PXM);
    }
    // the sun, with a slow halo
    const sx = 530, sy = 64;
    for (let i = 5; i >= 1; i--) Art.ell(g, sx, sy, 22 + i * 9, 22 + i * 9, U.rgba('#fff6c8', 0.07));
    Art.ell(g, sx, sy, 24, 24, '#ffe890'); Art.ell(g, sx, sy, 20, 20, '#fff6c4');
    for (const c of CLOUDS) cloud(g, c);
    // birds going over
    for (const b of BIRDS) bird(g, b);
    // hills, far to near
    hills(g, 196, 10, 0.012, 1.3, '#a8d8a0', '#c4e8b4');
    hills(g, 214, 12, 0.009, 4.1, '#8cc47c', '#a8d890');
    // a line of round trees
    for (const b of BACK) {
      const base = 236 + b.d * 12;
      const sway = Math.sin(t * 0.5 + b.ph) * (1 + b.d * 0.4);
      const leaf = [['#6fae5a', '#8cc870'], ['#5e9e4c', '#7cba60'], ['#4f8e40', '#6aac52']][b.d];
      Art.rect(g, b.x - b.w * 0.09, base - b.h * 0.45, b.w * 0.18, b.h * 0.45, '#7a5234');
      Art.rect(g, b.x - b.w * 0.09, base - b.h * 0.45, b.w * 0.06, b.h * 0.45, '#9a6c44');
      Art.ell(g, b.x + sway, base - b.h * 0.62, b.w * 0.56, b.h * 0.4, '#2e5a28');
      Art.ell(g, b.x + sway, base - b.h * 0.64, b.w * 0.52, b.h * 0.36, leaf[0]);
      Art.ell(g, b.x + sway - b.w * 0.14, base - b.h * 0.74, b.w * 0.28, b.h * 0.18, leaf[1]);
      if (b.v === 1) for (let i = 0; i < 4; i++) Art.rect(g, b.x + sway - b.w * 0.3 + i * b.w * 0.18, base - b.h * (0.5 + (i % 2) * 0.2), 3, 3, i % 2 ? '#ff8a7a' : '#ffd0dc');
    }
    // the lawn
    for (let y = 244; y < VH; y += PXM) {
      const k = (y - 244) / (VH - 244);
      g.fillStyle = U.mix('#9ad06e', '#6eae48', k);
      g.fillRect(0, y, VW, PXM);
    }
    for (const tf of TUFTS) {
      if (tf.y < 250) continue;
      const sw = Math.round(Math.sin(t * 1.3 + tf.ph) * 1);
      g.fillStyle = ['#5a9a3c', '#7cc050', '#b0e080'][tf.tone];
      g.fillRect(Math.round(tf.x + sw), Math.round(tf.y - tf.h * 0.5), 1, Math.round(tf.h * 0.5));
      g.fillRect(Math.round(tf.x + 2), Math.round(tf.y - tf.h * 0.35), 1, Math.round(tf.h * 0.35));
    }
    // the path up to the gate
    for (let y = GBOT - 2; y < VH; y += PXM) {
      const k = (y - GBOT) / (VH - GBOT);
      const hw = 56 + k * 70;
      g.fillStyle = '#b08058'; g.fillRect(Math.round(GX - hw - 3), y, Math.round(hw * 2 + 6), PXM);
      g.fillStyle = U.mix('#e2c08c', '#d4ac74', k); g.fillRect(Math.round(GX - hw), y, Math.round(hw * 2), PXM);
    }
    const pr = Art.rng(99);
    for (let i = 0; i < 40; i++) {                       // pebbles in it
      const y = GBOT + 4 + pr() * 54, k = (y - GBOT) / (VH - GBOT), hw = 50 + k * 64;
      const x = GX + (pr() - 0.5) * hw * 2;
      Art.rect(g, x, y, 3 + pr() * 3, 2, '#c49a68'); Art.rect(g, x, y, 2, 1, '#f0d8a8');
    }
    theGate(g);
    bunting(g);
    for (const f of PATHF) flower(g, f);
  }

  // ---- the gate ---------------------------------------------------------------
  function theGate(g) {
    const hot = hover === 'enter';
    const PW = 26, IW = 120;                       // post width, opening width
    const L = GX - IW / 2 - PW, Rt = GX + IW / 2;
    // what you can see through it: the path going on to a little cottage
    const open = hot ? Math.min(1, openT) : Math.max(0, openT);
    if (open > 0.02) {
      Art.rect(g, GX - IW / 2, GTOP + 26, IW, GBOT - GTOP - 26, U.rgba('#fff2c0', 0.35 * open));
      for (let i = 5; i >= 1; i--) Art.ell(g, GX, GBOT - 30, 30 + i * 12, 20 + i * 8, U.rgba('#fff4c8', 0.06 * open));
    }
    // the two posts: logs, barked, with a lit edge
    for (const px of [L, Rt]) {
      Art.rect(g, px - 2, GTOP - 8, PW + 4, GBOT - GTOP + 16, KIT.ink);
      Art.rect(g, px, GTOP - 6, PW, GBOT - GTOP + 12, '#8a5a34');
      Art.rect(g, px, GTOP - 6, 6, GBOT - GTOP + 12, '#a8744a');
      Art.rect(g, px + PW - 6, GTOP - 6, 6, GBOT - GTOP + 12, '#6a4226');
      for (let y = GTOP + 4; y < GBOT; y += 14) Art.rect(g, px + 8 + (y % 3) * 2, y, 8, 2, '#6a4226');
      Art.rect(g, px - 4, GTOP - 12, PW + 8, 6, KIT.ink); Art.rect(g, px - 2, GTOP - 10, PW + 4, 3, '#b8845a');
      // ivy up the post, with little pink flowers in it
      for (let i = 0; i < 9; i++) {
        const ly = GBOT - 8 - i * 20, lx = px + (i % 2 ? PW - 4 : 2) + Math.sin(t * 1.2 + i) * 0.8;
        Art.ell(g, lx, ly, 5, 3.4, '#2e5a28'); Art.ell(g, lx, ly - 0.6, 4, 2.6, i % 2 ? '#5e9e4c' : '#7cba60');
        if (i % 3 === 1) { Art.rect(g, lx - 1, ly - 2, 3, 3, '#ff9ab0'); Art.rect(g, lx, ly - 1, 1, 1, '#fff2a0'); }
      }
    }
    // the gates themselves: two picket halves that swing in when you point
    for (const side of [-1, 1]) {
      const hinge = side < 0 ? GX - IW / 2 : GX + IW / 2;
      const w2 = (IW / 2 - 2) * (1 - open * 0.72);
      const x0 = side < 0 ? hinge : hinge - w2;
      const top = GBOT - 86, low = GBOT - 8;
      Art.rect(g, x0 - 1, top + 20, w2 + 2, 6, KIT.ink); Art.rect(g, x0, top + 21, w2, 4, '#e8d0a0');   // the rails
      Art.rect(g, x0 - 1, low - 22, w2 + 2, 6, KIT.ink); Art.rect(g, x0, low - 21, w2, 4, '#e8d0a0');
      const n = Math.max(2, Math.round(w2 / 12));
      for (let i = 0; i < n; i++) {
        const px = x0 + (i + 0.5) * (w2 / n) - 4;
        const pw2 = Math.max(3, 8 * (1 - open * 0.5));
        Art.rect(g, px - 1, top - 1, pw2 + 2, low - top + 2, KIT.ink);
        Art.rect(g, px, top, pw2, low - top, '#fff4dc');
        Art.rect(g, px, top, Math.max(1, pw2 * 0.3), low - top, '#ffffff');
        Art.rect(g, px + pw2 - 2, top, 2, low - top, '#dcc49a');
        Art.rect(g, px + pw2 / 2 - 1, top - 4, 2, 4, KIT.ink);      // a pointed top
      }
    }
    // the arch board across the top, with the name painted on it
    const bw = IW + PW * 2 + 40, bx = GX - bw / 2, by = GTOP - 40;
    const bob = Math.sin(t * 1.2) * 1;
    cut(g, bx - 3, by - 3 + bob, bw + 6, 40, KIT.ink, 4);
    cut(g, bx, by + bob, bw, 34, '#a8744a', 3);
    Art.rect(g, bx + 3, by + 2 + bob, bw - 6, 3, '#c8905a');
    Art.rect(g, bx + 3, by + 28 + bob, bw - 6, 3, '#6a4226');
    Art.rect(g, bx + 6, by + 16 + bob, bw - 12, 1, '#8a5a34');
    Font.draw(g, 'WOMBAT FARM', GX, by + 11 + bob, { scale: 2, color: '#3a2412', align: 'center' });
    Font.draw(g, 'WOMBAT FARM', GX, by + 10 + bob, { scale: 2, color: '#fff4d8', align: 'center' });
    // a flower basket hanging off each end
    for (const hx of [bx + 18, bx + bw - 18]) {
      const hy = by + 44 + bob + Math.sin(t * 1.6 + hx) * 1.5;
      Art.rect(g, hx - 1, by + 34 + bob, 2, hy - by - 36 - bob, '#3a2412');
      Art.rect(g, hx - 10, hy, 20, 9, KIT.ink); Art.rect(g, hx - 9, hy + 1, 18, 7, '#b8845a');
      for (let i = 0; i < 5; i++) Art.rect(g, hx - 9 + i * 4, hy - 3 - (i % 2), 3, 3, ['#ff8a8a', '#fff4d8', '#ffd95c', '#ff9ab0', '#b8e890'][i]);
    }
  }
  // bunting across the top of the picture, from tree to tree
  function bunting(g) {
    for (let row = 0; row < 2; row++) {
      const y0 = 16 + row * 26, sag = 16;
      const n = 22;
      for (let i = 0; i <= n; i++) {
        const u = i / n, x = u * VW;
        const y = y0 + Math.sin(u * Math.PI) * sag + Math.sin(t * 1.4 + i + row) * 0.8;
        if (i < n) {
          const u2 = (i + 1) / n, x2 = u2 * VW, y2 = y0 + Math.sin(u2 * Math.PI) * sag;
          Art.limb(g, x, y, x2, y2, 1, 1, '#6a4a30');
          const mx = (x + x2) / 2, my = (y + y2) / 2 + 1;
          const flap = Math.sin(t * 2 + i * 0.7) * 1.2;
          Art.poly(g, [[mx - 8, my], [mx + 8, my], [mx + flap, my + 14]], KIT.ink);
          Art.poly(g, [[mx - 6.5, my + 1], [mx + 6.5, my + 1], [mx + flap, my + 11.5]], FLAG[(i + row * 3) % FLAG.length]);
          Art.rect(g, mx - 5, my + 1, 10, 1, '#ffffff');
        }
      }
    }
  }
  let openT = 0;

  function wombatShadowPass(g) { }
  // ---- plates --------------------------------------------------------------
  // ---- buttons ---------------------------------------------------------------
  // A slab of beaten gold with a lit top edge, a dark base and one line round it,
  // which drops four pixels when the pointer is over it. It is the same button
  // the panels use, drawn with rectangles instead of CSS.
  function plaque(g, x, y, w, h, hot) {
    cut(g, x - 2, y - 2, w + 4, h + 4, KIT.ink, 3);
    cut(g, x, y, w, h, hot ? KIT.g3 : KIT.g2, 2);
    Art.rect(g, x + 2, y, w - 4, 3, hot ? KIT.g4 : KIT.g3);
    Art.rect(g, x + 2, y + h - 4, w - 4, 4, hot ? KIT.g1 : KIT.g0);
    Art.rect(g, x, y + 3, 2, h - 7, hot ? KIT.g4 : KIT.g3);
    Art.rect(g, x + w - 2, y + 3, 2, h - 7, hot ? KIT.g1 : KIT.g0);
  }
  function bigButton(g, b, label, sub, scale) {
    const hot = hover === b.id;
    const drop = hot ? 0 : 4;
    Art.rect(g, b.x - 2, b.y + 4, b.w + 4, b.h, KIT.ink);          // the shadow it sits on
    plaque(g, b.x, b.y + drop, b.w, b.h, hot);
    const cy = b.y + drop + (sub ? 9 : (b.h - (scale || 2) * 7) / 2);
    Font.draw(g, label, b.x + b.w / 2, cy + 1, { scale: scale || 2, color: hot ? '#ffe98a' : '#f0d27a', align: 'center' });
    Font.draw(g, label, b.x + b.w / 2, cy, { scale: scale || 2, color: hot ? '#3a2003' : '#4a2c04', align: 'center' });
    if (sub) Font.draw(g, sub, b.x + b.w / 2, cy + (scale || 2) * 7 + 4, { scale: 1, color: hot ? '#5e3a04' : '#6b4406', align: 'center' });
    if (hot) {
      Font.draw(g, '>', b.x + 9, cy + ((scale || 2) - 1) * 3, { scale: scale || 2, color: KIT.i0 });
      Font.draw(g, '<', b.x + b.w - 9 - Font.width('<', scale || 2), cy + ((scale || 2) - 1) * 3, { scale: scale || 2, color: KIT.i0 });
    }
  }

  // ---- the things living on the title screen ------------------------------
  // An owl on a bough that blinks and turns its head, a lantern that swings on
  // its chain, a signpost at the edge of the clearing, and one line of rumour
  // under the buttons that changes every time you come back.
  const RUMOURS = [
    'wombats sleep sixteen hours a day. goals.',
    'Aunt Fern says the roses have never been bigger',
    'the mart shuts at six but Shaz never leaves',
    'a wombat can dig a whole burrow in one night',
    'Groot grows the best carrots in the district',
    'the lottery has paid out twice. both times to the same man.',
    'square. every single one of them. square.',
    'water the beds in the morning and they grow all day',
    'a happy wombat leaves the good cubes',
    'the frogs move in the minute you dig a pond',
  ];
  let rumour = 0;
  function owl(g, x, y, t2) {
    const blink = (t2 % 4.4) > 4.1;
    const turn = Math.sin(t2 * 0.35) > 0.6 ? 1 : Math.sin(t2 * 0.35) < -0.6 ? -1 : 0;
    Art.rect(g, x - 26, y + 9, 52, 3, '#2a2218');                  // the bough
    Art.rect(g, x - 26, y + 9, 52, 1, '#4a3c28');
    Art.ell(g, x, y, 8, 10, '#2e2a26');                            // body
    Art.ell(g, x, y + 1, 6.6, 8.4, '#4a4238');
    Art.ellBand(g, x, y, 6, 7.4, '#665c4e', 0, 0.5);
    for (let i = 0; i < 5; i++) Art.rect(g, x - 4 + i * 2, y + 3 + (i % 2), 1, 3, '#332c24');
    Art.poly(g, [[x - 6, y - 7], [x - 2, y - 11], [x - 1, y - 6]], '#4a4238');   // horns
    Art.poly(g, [[x + 6, y - 7], [x + 2, y - 11], [x + 1, y - 6]], '#4a4238');
    for (const sd of [-1, 1]) {
      const ex = x + sd * 3 + turn * 1.4;
      if (blink) { Art.rect(g, ex - 2, y - 4, 4, 1, '#2a2218'); continue; }
      Art.ell(g, ex, y - 4, 2.6, 2.6, '#f2cf3a');
      Art.ell(g, ex + turn * 0.8, y - 4, 1.2, 1.4, '#120c08');
    }
    Art.poly(g, [[x - 1 + turn, y - 2], [x + 1 + turn, y - 2], [x + turn, y]], '#c9903a');
    Art.rect(g, x - 3, y + 10, 2, 2, '#c9903a');                   // feet on the bough
    Art.rect(g, x + 1, y + 10, 2, 2, '#c9903a');
  }
  function signpost(g, x, y, t2) {
    Art.rect(g, x - 2, y - 44, 4, 46, '#2a2018');
    Art.rect(g, x - 2, y - 44, 1.6, 46, '#4a3c28');
    const sway = Math.sin(t2 * 0.9) * 0.8;
    for (let i = 0; i < 2; i++) {
      const sy = y - 40 + i * 13, sd = i ? -1 : 1;
      Art.poly(g, [[x, sy + sway], [x + sd * 42, sy - 2 + sway], [x + sd * 42, sy + 8 + sway], [x, sy + 10 + sway]], '#241a10');
      Art.poly(g, [[x, sy + 1 + sway], [x + sd * 40, sy - 1 + sway], [x + sd * 40, sy + 7 + sway], [x, sy + 9 + sway]], '#5a3f24');
      Art.poly(g, [[x, sy + 1 + sway], [x + sd * 40, sy - 1 + sway], [x + sd * 40, sy + 1 + sway], [x, sy + 3 + sway]], '#7a5836');
      Font.draw(g, i ? 'MART' : 'GROVE', x + sd * 21, sy + 2 + sway, { scale: 1, color: '#e0cda4', align: 'center' });
    }
    Art.rect(g, x - 5, y, 10, 3, '#1d1610');
  }
  // ---- the home page ---------------------------------------------------------
  // Three lanterns on a post down the left for the three farms, the gate to
  // walk through, and two painted signs either side of the path.
  function drawHome(g) {
    buttons = [];
    const slots = (typeof Main !== 'undefined' && Main.slotList) ? Main.slotList() : [{ n: 1, empty: !hasSave }];
    const here = (typeof Main !== 'undefined' && Main.slot) || 1;
    // ---- the lantern post ---------------------------------------------------
    Art.rect(g, 42, 76, 10, 240, KIT.ink);
    Art.rect(g, 44, 78, 6, 236, '#8a5a34');
    Art.rect(g, 44, 78, 2, 236, '#b8845a');
    Art.rect(g, 36, 312, 22, 6, KIT.ink); Art.rect(g, 38, 313, 18, 3, '#6a4226');
    slots.forEach((sl, i) => {
      const x = 74;
      const on = sl.n === here;
      const sway = Math.sin(t * 0.9 + i * 1.3) * 1.6;
      const hot = hover === 'slot:' + sl.n;
      const y = 96 + i * 76 + (on ? 3 : 0);
      Art.rect(g, 50, y - 12, 24, 3, '#6a4226');
      buttons.push({ id: 'slot:' + sl.n, x: x - 22, y: y - 6, w: 120, h: 50 });
      lantern2(g, x + sway, y, !sl.empty, on, hot, sl, i);
      if (!sl.empty) {
        buttons.push({ id: 'wipe:' + sl.n, x: x - 13, y: y + 38, w: 18, h: 18 });
        const wh = hover === 'wipe:' + sl.n;
        g.fillStyle = KIT.ink; g.fillRect(x - 13 + sway, y + 38, 18, 18);
        g.fillStyle = wh ? '#f07a5a' : '#c8584a'; g.fillRect(x - 11 + sway, y + 40, 14, 14);
        Font.draw(g, 'X', x - 4 + sway, y + 44, { scale: 1, color: '#fff4d8', align: 'center' });
      }
    });
    // ---- the gate is the button ----------------------------------------------
    const goHot = hover === 'enter';
    buttons.push({ id: 'enter', x: GX - 64, y: GTOP - 40, w: 128, h: GBOT - GTOP + 40 });
    const lab = hasSave ? 'COME BACK IN' : 'COME IN';
    const sub = hasSave ? 'the wombats missed you' : 'a new farm, a new wombat';
    // a painted sign hung on the gate
    const sw = Math.max(Font.width(lab, 2), Font.width(sub, 1)) + 20;
    const sy = GBOT - 132 + Math.sin(t * 2) * 1.5 - (goHot ? 3 : 0);
    Art.rect(g, GX - 1, GBOT - 150, 2, sy - (GBOT - 150), '#3a2412');
    cut(g, GX - sw / 2 - 3, sy - 3, sw + 6, 40, KIT.ink, 3);
    cut(g, GX - sw / 2, sy, sw, 34, goHot ? KIT.g3 : KIT.g2, 2);
    Art.rect(g, GX - sw / 2 + 2, sy, sw - 4, 3, KIT.g4);
    Art.rect(g, GX - sw / 2 + 2, sy + 30, sw - 4, 4, KIT.g0);
    Font.draw(g, lab, GX, sy + 6, { scale: 2, color: '#4a2c04', align: 'center' });
    Font.draw(g, sub, GX, sy + 22, { scale: 1, color: '#6b4406', align: 'center' });
    // ---- two painted signs by the path --------------------------------------
    stoneWord(g, 172, 300, 'settings', 'SETTINGS');
    stoneWord(g, 468, 300, 'help', 'HOW TO PLAY');
    drawWombat(g);
    smallLife(g, true);
    // ---- the tip of the day, on a strip of paper at the bottom --------------
    const line = RUMOURS[rumour % RUMOURS.length];
    const lw = Font.width(line, 1) + 20;
    cut(g, GX - lw / 2 - 2, VH - 22, lw + 4, 18, KIT.ink, 2);
    cut(g, GX - lw / 2, VH - 20, lw, 14, KIT.p3, 2);
    Font.draw(g, line, GX, VH - 16, { scale: 1, color: '#6b4a26', align: 'center' });
  }
  // a porch lantern on the post: lit if that farm has something in it
  function lantern2(g, x, y, full, on, hot, sl, i) {
    x = Math.round(x); y = Math.round(y);
    g.fillStyle = '#3a2412'; g.fillRect(x - 1, y - 26, 2, 22);      // the hook
    g.fillStyle = KIT.ink; g.fillRect(x - 13, y - 6, 26, 42);
    g.fillStyle = on ? '#3f6a3a' : '#2e4a2c'; g.fillRect(x - 11, y - 4, 22, 38);
    g.fillStyle = on ? '#6fae5a' : '#4f8050'; g.fillRect(x - 11, y - 4, 22, 2);
    const lit = full ? (on ? 1 : 0.6) : 0;
    const fl = Math.sin(t * 7 + i * 2) > 0 ? 1 : 0;
    g.fillStyle = '#f6ecd0'; g.fillRect(x - 8, y + 1, 16, 26);
    if (lit > 0) {
      g.fillStyle = U.rgba('#ffc84a', 0.55 * lit); g.fillRect(x - 8, y + 1, 16, 26);
      g.fillStyle = '#e0701c'; g.fillRect(x - 2, y + 14 - fl, 4, 10);
      g.fillStyle = '#ffc84a'; g.fillRect(x - 2, y + 17 - fl, 4, 7);
      g.fillStyle = '#fff6c4'; g.fillRect(x - 1, y + 20, 2, 4);
    } else {
      Font.draw(g, '-', x, y + 10, { scale: 1, color: '#b8a888', align: 'center' });
    }
    if (hot || on) {
      g.fillStyle = hot ? '#ffd95c' : '#fff4d8';
      g.fillRect(x - 15, y - 8, 30, 2); g.fillRect(x - 15, y + 36, 30, 2);
      g.fillRect(x - 15, y - 8, 2, 46); g.fillRect(x + 13, y - 8, 2, 46);
    }
    // what is on that farm, on a paper tag beside it
    const l1 = 'farm ' + sl.n, l2 = sl.empty ? 'empty' : 'day ' + (sl.day || 1), l3 = sl.empty ? '' : sl.wombats + (sl.wombats === 1 ? ' wombat' : ' wombats');
    const tw = Math.max(Font.width(l1, 1), Font.width(l2, 1), Font.width(l3, 1)) + 10;
    cut(g, x + 17, y - 2, tw + 2, sl.empty ? 26 : 38, KIT.ink, 2);
    cut(g, x + 18, y - 1, tw, sl.empty ? 24 : 36, on ? KIT.p4 : KIT.p2, 2);
    Font.draw(g, l1, x + 23, y + 3, { scale: 1, color: on ? '#8a4a10' : '#6b4a26' });
    Font.draw(g, l2, x + 23, y + 13, { scale: 1, color: '#7a6040' });
    if (l3) Font.draw(g, l3, x + 23, y + 24, { scale: 1, color: '#4f8050' });
  }
  // a painted sign on a stake by the path
  function stoneWord(g, x, y, id, label) {
    const hot = hover === id;
    const w = Font.width(label, 1) + 22, h = 24;
    buttons.push({ id, x: x - w / 2, y: y - h / 2, w, h: h + 20 });
    Art.rect(g, x - 3, y, 6, 30, KIT.ink); Art.rect(g, x - 2, y, 4, 29, '#8a5a34');
    cut(g, x - w / 2 - 3, y - h / 2 - 3 - (hot ? 2 : 0), w + 6, h + 6, KIT.ink, 3);
    cut(g, x - w / 2, y - h / 2 - (hot ? 2 : 0), w, h, hot ? '#c8905a' : '#a8744a', 2);
    Art.rect(g, x - w / 2 + 2, y - h / 2 - (hot ? 2 : 0), w - 4, 2, '#e0b07a');
    Art.rect(g, x - w / 2 + 2, y + h / 2 - 3 - (hot ? 2 : 0), w - 4, 3, '#6a4226');
    Font.draw(g, label, x, y - 4 - (hot ? 2 : 0), { scale: 1, color: '#3a2412', align: 'center' });
    Font.draw(g, label, x, y - 5 - (hot ? 2 : 0), { scale: 1, color: '#fff4d8', align: 'center' });
  }

  const HELP = [
    ['t_sickle', 'Tidy the garden', 'Right-click opens the tool tray. Cut the weeds, clear the logs, sow grass.'],
    ['t_hoe', 'Grow something', 'Hoe a bed, sow seed on it, water it, and pick it with the hand when it glows.'],
    ['t_food', 'Feed a wombat', 'Put a bowl down. She eats, has a wander, and leaves a little cube behind.'],
    ['truck', 'Load the truck', 'Drag the cubes into the truck. Click the truck for the map to town.'],
    ['u_seats', 'Sell to Aunt Fern', 'She buys every cube for her compost, and pays more for a load than for one.'],
    ['u_burrow', 'Shape the land', 'The shovel: hold to raise a hill, right-click and hold to dig a pond.'],
  ];
  function drawHelp(g) {
    buttons = [];
    const PW = 500, PX = (VW - PW) / 2, PY = 20, PH = 322;
    board(g, PX, PY, PW, PH);
    plate(g, PX + 14, PY + 12, PW - 28, 26, 'HOW TO PLAY');
    const BW = PW - 74;                       // what a line of body has room for
    HELP.forEach(([ico, title, body], i) => {
      const ry = PY + 44 + i * 40;
      Art.rect(g, PX + 16, ry - 3, PW - 32, 38, i % 2 ? KIT.p3 : KIT.p1);
      Art.rect(g, PX + 16, ry - 3, PW - 32, 1, KIT.p4);
      Icons.blit(g, ico, PX + 20, ry + 4, 1.2);
      Font.draw(g, title, PX + 50, ry, { scale: 1, color: '#1c5568' });
      Font.wrap(body, BW, 1).slice(0, 2).forEach((ln, j) => {
        Font.draw(g, ln, PX + 50, ry + 11 + j * 10, { scale: 1, color: '#6b4a26' });
      });
    });
    const by = PY + PH - 34;
    buttons.push({ id: 'back', x: PX + 14, y: by, w: PW - 28, h: 26 });
    plaque(g, PX + 14, by, PW - 28, 26, hover === 'back');
    Font.draw(g, 'BACK', VW / 2, by + 9, { scale: 1, color: '#4a2c04', align: 'center' });
  }

  const SETTINGS = [
    { key: 'muted', name: 'SOUND', on: 'ON', off: 'MUTED', inv: true },
    { key: 'musicOff', name: 'MUSIC', on: 'ON', off: 'OFF', inv: true },
    { key: 'shake', name: 'SCREEN SHAKE', on: 'ON', off: 'OFF' },
    { key: 'bigText', name: 'BIG TEXT', on: 'ON', off: 'OFF' },
  ];
  function drawSettings(g) {
    buttons = [];
    const PW = 424, PX = (VW - PW) / 2, PY = 80, PH = 224;
    board(g, PX, PY, PW, PH);
    plate(g, PX + 14, PY + 12, PW - 28, 26, 'SETTINGS');
    SETTINGS.forEach((s2, i) => {
      const ry = PY + 42 + i * 30;
      const val = s2.inv ? !G[s2.key] : !!G[s2.key];
      const hot = hover === 'set:' + s2.key;
      buttons.push({ id: 'set:' + s2.key, x: PX + 14, y: ry, w: PW - 28, h: 24, kind: 'toggle', k: s2.key });
      Art.rect(g, PX + 16, ry, PW - 32, 24, hot ? KIT.p4 : KIT.p1);
      Art.rect(g, PX + 16, ry, PW - 32, 1, KIT.p4);
      Font.draw(g, s2.name, PX + 28, ry + 9, { scale: 1, color: '#3a2410' });
      const tx = PX + PW - 96, tw = 68;
      Art.rect(g, tx - 2, ry + 3, tw + 4, 18, KIT.ink);
      Art.rect(g, tx, ry + 5, tw, 14, val ? KIT.i1 : '#5c4a30');
      Art.rect(g, tx, ry + 5, tw, 3, val ? KIT.i3 : '#7a6444');
      const kx = val ? tx + tw - 20 : tx + 2;
      Art.rect(g, kx, ry + 6, 18, 12, KIT.p4);
      Art.rect(g, kx, ry + 6, 18, 3, '#ffffff');
      Font.draw(g, val ? s2.on : s2.off, val ? tx + 16 : tx + tw - 16, ry + 9, {
        scale: 1, align: 'center', color: val ? '#d8f2fa' : '#2a2016',
      });
    });
    const dy = PY + PH - 42;
    buttons.push({ id: 'wipe', x: PX + 14, y: dy, w: PW - 28, h: 28, kind: 'wipe' });
    const wh = hover === 'wipe';
    cut(g, PX + 14, dy, PW - 28, 28, KIT.ink, 3);
    cut(g, PX + 16, dy + 2, PW - 32, 24, wh ? '#e07a4a' : '#96491a', 2);
    Art.rect(g, PX + 18, dy + 2, PW - 36, 3, wh ? '#f2b07a' : '#c96e24');
    Font.draw(g, 'RESET ALL DATA', VW / 2, dy + 6, { scale: 1, color: '#fff2e0', align: 'center' });
    Font.draw(g, hasSave ? 'ERASES YOUR FARM AND STARTS OVER' : 'NOTHING SAVED YET', VW / 2, dy + 17, {
      scale: 1, color: wh ? '#ffd9c0' : '#e8b898', align: 'center',
    });
    backButton(g);
  }
  function backButton(g) {
    const b = { id: 'back', x: VW / 2 - 70, y: 316, w: 140, h: 28 };
    buttons.push(b);
    bigButton(g, b, 'BACK', null, 2);
  }

  function drawConfirm(g) {
    g.fillStyle = 'rgba(58,36,20,0.55)'; g.fillRect(0, 0, VW, VH);
    const PW = 344, PX = (VW - PW) / 2, PY = 112, PH = 136;
    board(g, PX, PY, PW, PH);
    plate(g, PX + 14, PY + 12, PW - 28, 26, 'ARE YOU SURE?');
    const lines = Font.wrap(confirm.text.toUpperCase(), PW - 44, 1);
    lines.forEach((l, i) => Font.draw(g, l, VW / 2, PY + 50 + i * 11, { scale: 1, color: '#4a3a22', align: 'center' }));
    Font.draw(g, 'THIS CANNOT BE UNDONE', VW / 2, PY + 78, { scale: 1, color: '#96491a', align: 'center' });
    const by = PY + PH - 34;
    buttons.push({ id: 'yes', x: PX + 18, y: by, w: 140, h: 24, kind: 'confirm' });
    buttons.push({ id: 'no', x: PX + PW - 158, y: by, w: 140, h: 24, kind: 'confirm' });
    for (const [id, lab, col] of [['yes', 'ERASE IT', '#8a2f24'], ['no', 'KEEP IT', '#2a3a24']]) {
      const b = buttons.find((q) => q.id === id), hot = hover === id;
      g.fillStyle = hot ? U.shade(col, 0.4) : col; g.fillRect(b.x, b.y, b.w, b.h);
      g.fillStyle = 'rgba(255,255,255,0.16)'; g.fillRect(b.x, b.y, b.w, 2);
      g.strokeStyle = hot ? '#f5cd5c' : '#0a0810'; g.lineWidth = 1; g.strokeRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1);
      Font.draw(g, lab, b.x + b.w / 2, b.y + 8, { scale: 1, color: '#fff0dc', align: 'center' });
    }
  }

  // Fireflies over the floor of the wood, and low mist rolling through it.
  const FLIES = [], DRIFT = [];
  function seedAir() {
    if (FLIES.length) return;
    const r = Art.rng(5150);
    for (let i = 0; i < 26; i++) {
      FLIES.push({ x: r() * VW, y: HORIZON + 20 + r() * (VH - HORIZON - 30), ph: r() * TAU,
        sp: 0.25 + r() * 0.5, rad: 8 + r() * 26, blink: 0.8 + r() * 2.6, off: r() * 4 });
    }
    for (let i = 0; i < 14; i++) {
      DRIFT.push({ x: r() * VW, y: VH - 6 - r() * 84, w: 90 + r() * 150, h: 14 + r() * 20,
        sp: 3 + r() * 9, a: 0.07 + r() * 0.1 });
    }
  }
  function drawAir(g) {
    // mist, low and slow
    for (const d of DRIFT) {
      const x = ((d.x + t * d.sp) % (VW + 300)) - 150;
      const y = d.y + Math.sin(t * 0.4 + d.x) * 3;
      const oa2 = g.globalAlpha;              // a mist puff, as four flat pixel ovals
      for (let i = 4; i >= 1; i--) {
        const k = i / 4;
        g.globalAlpha = oa2 * d.a * 0.55 * (1 - (i - 1) / 4) * 0.85;
        Art.ell(g, x, y, d.w * k, d.h * k, '#92ac92');
      }
      g.globalAlpha = oa2;
    }
    // and the fireflies through it
    for (const f of FLIES) {
      const x = f.x + Math.cos(t * f.sp + f.ph) * f.rad;
      const y = f.y + Math.sin(t * f.sp * 1.6 + f.ph) * f.rad * 0.4;
      const on = Math.sin((t + f.off) * (TAU / f.blink));
      if (on < 0.2) continue;
      const a = (on - 0.2) / 0.8;
      Art.glow(g, x, y, 9, '#e2f496', a * 0.4, 3);
      g.fillStyle = `rgba(244,255,190,${a.toFixed(2)})`;
      g.fillRect(Math.round(x), Math.round(y), 2, 2);
    }
  }
  function update(dt) {
    t += dt;
    wombatLoop(dt);
    openT = U.clamp(openT + (hover === 'enter' && page === 'home' && !confirm ? dt * 4 : -dt * 4), 0, 1);
  }
  function render(g) {
    scene(g);
    if (page === 'home') drawHome(g);
    else { drawWombat(g); g.fillStyle = 'rgba(58,36,20,0.35)'; g.fillRect(0, 0, VW, VH); }
    if (page === 'home') { }
    else if (page === 'help') drawHelp(g);
    else drawSettings(g);
    if (confirm) drawConfirm(g);
  }

  const inside = (b, x, y) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
  function hitAt(x, y) { for (const b of buttons) if (inside(b, x, y)) return b; return null; }
  function move(x, y) { const h = hitAt(x, y); hover = h ? h.id : null; }
  function press(x, y) {
    const h = hitAt(x, y);
    if (!h) { if (confirm) { confirm = null; Audio.play('click'); } return; }
    Audio.play('click');
    if (confirm) { if (h.id === 'yes') confirm.go(); confirm = null; return; }
    if (h.kind === 'toggle') { onAct({ toggle: h.k }); return; }
    if (h.kind === 'wipe') {
      confirm = { text: 'your farm and every wombat on it', go: () => onAct({ wipe: true }) };
      return;
    }
    // picking a grove, or burning one
    if (h.id.startsWith('slot:')) { onAct({ slot: +h.id.slice(5) }); Audio.play('click'); return; }
    if (h.id.startsWith('wipe:')) {
      const n = +h.id.slice(5);
      confirm = { text: 'farm ' + n + ' and every wombat on it', go: () => onAct({ wipeSlot: n }) };
      return;
    }
    if (h.id === 'settings') { page = 'settings'; return; }
    if (h.id === 'help') { page = 'help'; return; }
    if (h.id === 'back') { page = 'home'; return; }
    if (h.id === 'enter') onAct({ play: true });
  }
  function key(k) {
    if (k === 'Escape') { if (confirm) confirm = null; else if (page !== 'home') page = 'home'; return true; }
    if (page === 'home' && !confirm && (k === 'Enter' || k === ' ')) { onAct({ play: true }); return true; }
    return false;
  }

  return { init, enter, update, render, press, move, key, setSave, get page() { return page; } };
})();
