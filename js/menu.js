// ---- The title screen -----------------------------------------------------
// The same wood the game is set in, at night: the grove's own tree art, mossed
// stone wombats, one lantern, and a wombat in the middle distance quietly
// leaving you a cube. Two doors out of here — ENTER and SETTINGS.
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
        Font.draw(g, 'z', w.x + 20 + k * 8, w.y - 32 - k * 14, { scale: 1, color: '#e6d6ff' });
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
  // The same warm wood and violet iron the rest of the interface wears. The
  // iron used to be teal; the gods come in violet, so the iron does too.
  const KIT = {
    ink: '#0d0a12',
    t0: '#241509', t1: '#3f2712', t2: '#6a4020', t3: '#a46b36', t4: '#c68c4c',
    i0: '#1d0f38', i1: '#3d1f78', i2: '#6b32bd', i3: '#9a5cf0', i4: '#c898ff',
    p0: '#9c7f4e', p1: '#c09b62', p2: '#edd3a2', p3: '#f6e4ba', p4: '#fffae8',
    g0: '#7a4c06', g1: '#bd8410', g2: '#efb625', g3: '#ffd95c', g4: '#fff3b8',
    d0: '#1d0f38', d2: '#6b32bd', d3: '#9a5cf0', d4: '#c898ff',
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
  const FLOW = ['#ffd6e6', '#ffd95c', '#c898ff', '#fffae8', '#ff9a72'];

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
  const SHROOM_COL = [['#d84428', '#ffd6c8'], ['#c09b62', '#f6e4ba'], ['#9a5cf0', '#e0cfff']];
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
      const col = ['#ffd95c', '#c898ff', '#fffae8'][b.v];
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
  function scene(g) {
    // ---- the sky, at whatever hour the game's clock says ------------------
    const day = Sky.light();
    const top = U.mix('#101a34', '#6aa8d8', day), mid = U.mix('#26324e', '#a8d4e8', day), low = U.mix('#3a3a52', '#e4e8c8', day);
    for (let i = 0; i < 14; i++) {
      const k = i / 13;
      g.fillStyle = k < 0.5 ? U.mix(top, mid, k * 2) : U.mix(mid, low, (k - 0.5) * 2);
      g.fillRect(0, Math.round((HORIZON + 12) * i / 14), VW, Math.ceil((HORIZON + 12) / 14) + 1);
    }
    if (day < 0.4) for (let i = 0; i < 40; i++) {              // stars, when it is dark enough
      const sx = (i * 173) % VW, sy = (i * 61) % 110;
      g.fillStyle = `rgba(214,228,248,${((0.4 - day) * 2 * (0.3 + 0.5 * Math.abs(Math.sin(t * 0.7 + i)))).toFixed(2)})`;
      g.fillRect(sx, sy, 1, 1);
    }
    Sky.drawSun(g, 104, 58);
    Sky.drawClouds(g, VW, 150, 0, 0.7);
    for (const b of BIRDS) bird(g, b);

    // ---- the far treeline, soft and hazy ----------------------------------
    for (let d = 0; d < 2; d++) {
      for (const tr of wood) {
        if (tr.d !== d) continue;
        const img = Props.get('tree', `${tr.kind}|${tr.v}|${(0.3 - d * 0.06).toFixed(2)}`);
        const w = img.width * tr.s * 0.74, h = img.height * tr.s * 0.74;
        const sway = Math.sin(t * 0.4 + tr.sway) * (1.4 - d * 0.2);
        g.drawImage(img, Math.round(tr.x - w / 2 + sway), Math.round(tr.y - h + 34), Math.round(w), Math.round(h));
      }
      g.globalAlpha = 0.34 - d * 0.14;                      // haze between the ranks
      Art.rect(g, 0, 110 + d * 26, VW, 100, '#cfe0e8');
      g.globalAlpha = 1;
    }

    // ---- the floor of it: the same worn soil as your own plot -------------
    drawFloor(g, day);
    smallLife(g, false);              // mushrooms come up out of the litter
    // mossy stones and logs
    for (const st of STONES) {
      Art.ell(g, st.x, st.y, st.w, st.h, '#5b5a58');
      Art.ell(g, st.x, st.y - 1, st.w - 1, st.h - 1, '#7a786f');
      Art.ell(g, st.x - st.w * 0.2, st.y - st.h * 0.5, st.w * 0.6, st.h * 0.42, '#4f7a34');
      g.fillStyle = PAL.moss3;
      for (let i = 0; i < 4; i++) g.fillRect(Math.round(st.x - st.w * 0.6 + i * st.w * 0.4), Math.round(st.y - st.h * 0.4), 3, 2);
    }
    // grass tufts, then flowers over the top
    for (const tf of TUFTS) {
      const sway = Math.sin(t * 1.3 + tf.ph) * 1.4;
      const col = ['#4f7a34', '#5d9440', '#84bb59'][tf.tone];
      for (let i = 0; i < tf.h; i++) {
        g.fillStyle = i > tf.h - 2 ? '#a8d878' : col;
        g.fillRect(Math.round(tf.x + sway * (i / tf.h) * (i / tf.h)), Math.round(tf.y - i), 1, 1);
      }
    }
    for (const f of FLOWERS) flower(g, f);
    smallLife(g, true);               // motes, bugs and a line of ants over it all

    // ---- the near trees and the houses in them -----------------------------
    for (let d = 2; d < RANKS.length; d++) {
      for (const tr of wood) {
        if (tr.d !== d) continue;
        const img = Props.get('tree', `${tr.kind}|${tr.v}|${(0.06 + (5 - d) * 0.05).toFixed(2)}`);
        const w = img.width * tr.s, h = img.height * tr.s;
        const sway = Math.sin(t * 0.4 + tr.sway) * (1.4 - d * 0.2);
        g.drawImage(img, Math.round(tr.x - w / 2 + sway), Math.round(tr.y - h), Math.round(w), Math.round(h));
      }
    }
    // the fence down both sides, the same split rail as the plot
    railFence(g);
    lantern(g, 0.82 + 0.18 * Math.sin(t * 9));
    titleSign(g);

    // ---- moss hanging out of the canopy ------------------------------------
    for (let i = 0; i < 14; i++) {
      const hx = 16 + ((i * 97) % (VW - 32));
      const hl = 22 + ((i * 53) % 58);
      const sw2 = Math.sin(t * 0.6 + i) * 3;
      for (let k = 0; k < hl; k += 3) {
        const a = 1 - k / hl;
        g.fillStyle = `rgba(${i % 2 ? '96,140,80' : '78,118,66'},${(0.75 * a).toFixed(2)})`;
        g.fillRect(Math.round(hx + sw2 * (k / hl)), 100 + k, 2, 3);
        if (k % 12 === 0) g.fillRect(Math.round(hx + sw2 * (k / hl)) + 2, 100 + k, 1, 2);
      }
    }
    // light coming down through the leaves
    for (let i = 0; i < 5; i++) {
      const sx = 60 + i * 130, a = (0.06 + 0.04 * Math.sin(t * 0.4 + i)) * (0.4 + day);
      g.save();
      g.beginPath();
      g.moveTo(sx - 16, 70); g.lineTo(sx + 16, 70); g.lineTo(sx + 52, VH); g.lineTo(sx + 12, VH);
      g.closePath(); g.clip();
      for (let k = 0; k < 9; k++) { g.globalAlpha = a * (1 - k / 9); Art.rect(g, sx - 60, 70 + k * 34, 180, 35, '#fff0c8'); }
      g.restore();
    }
    for (let i = 0; i < 3; i++) bird(g, { x: BIRDS[i].x, y: 208 + i * 14, sp: BIRDS[i].sp * 0.8, ph: BIRDS[i].ph, dir: BIRDS[i].dir, s: 1.1 });
    drawWombat(g);
    // the warm grade over the lot
    g.save();
    g.globalCompositeOperation = 'soft-light';
    g.fillStyle = U.mix('#2a3f6a', '#ffe8a8', day); g.globalAlpha = 0.34; g.fillRect(0, 0, VW, VH);
    g.restore();
    Sky.drawOver(g, VW, VH);
    Art.vignette(g, VW, VH, '#1a2410', 0.4, 2.2, 0.34);
  }
  function wombatShadowPass(g) { }
  function lantern(g, flick) {
    Art.glow(g, LX, LY + 10, 92 * flick, '#ffd88c', 0.34 * flick, 9);
    // the bough it hangs off, and the chain
    Art.rect(g, LX - 46, LY - 74, 56, 7, '#2a1d15');
    Art.rect(g, LX - 46, LY - 74, 56, 3, '#5d4430');
    Art.rect(g, LX - 46, LY - 68, 56, 2, '#1d1410');
    g.fillStyle = PAL.moss1;
    for (let i = 0; i < 6; i++) g.fillRect(Math.round(LX - 44 + i * 9), LY - 76, 6, 3);
    g.fillStyle = '#1a1410'; g.fillRect(LX - 1, LY - 70, 2, 56);
    for (let i = 0; i < 4; i++) { g.fillStyle = '#4a4038'; g.fillRect(LX - 2, LY - 66 + i * 13, 4, 3); }
    g.fillStyle = '#0c0a08'; g.fillRect(LX - 9, LY - 15, 18, 4);
    g.fillStyle = '#57493a'; g.fillRect(LX - 8, LY - 14, 16, 2);
    g.fillStyle = '#0c0a08'; g.fillRect(LX - 8, LY - 11, 16, 22);
    g.fillStyle = `rgba(255,226,164,${(0.9 * flick).toFixed(2)})`; g.fillRect(LX - 6, LY - 9, 12, 18);
    g.fillStyle = '#fff6dc'; Art.ell(g, LX, LY + 1, 3, 5.4);
    g.fillStyle = '#0c0a08';
    g.fillRect(LX - 8, LY - 1, 16, 1); g.fillRect(LX - 1, LY - 11, 2, 22);
    g.fillRect(LX - 9, LY + 11, 18, 4);
    g.fillStyle = '#57493a'; g.fillRect(LX - 8, LY + 12, 16, 2);
  }

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
    'they say the soil out there remembers things',
    'nobody has ever counted all nine of them',
    'the mart shuts at six but Shaz never leaves',
    'a wombat can dig eight metres in one night',
    'the tall one in the hood was here before the road',
    'something in the deepwood answers if you stack high enough',
    'Groot has not said a second sentence in forty years',
    'the lottery has paid out twice. both times to the same man.',
    'square. every single one of them. square.',
    'the quarry closed for a reason nobody writes down',
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
  function drawHome(g) {
    buttons = [];
    owl(g, 74, 186, t);
    signpost(g, 216, 356, t);
    // the buttons live on a page of their own, the way every menu in this
    // kit does: a cream board in a teal frame with a plate across the top
    const BW = 258, PADX = 16;
    // No banner across the top. The three buttons are the whole page: the
    // board was spending a quarter of itself telling you where you were.
    const PX = VW - BW - PADX * 2 - 22, PY = 96, PW = BW + PADX * 2, PH = 236;
    board(g, PX, PY, PW, PH);
    const BX = PX + PADX;
    // ---- three groves ------------------------------------------------------
    // Each one is a strip of parchment with what is in it burned across it.
    // The one you are standing in has a candle beside it; the × wipes one.
    const slots = (typeof Main !== 'undefined' && Main.slotList) ? Main.slotList() : [{ n: 1, empty: !hasSave }];
    const here = (typeof Main !== 'undefined' && Main.slot) || 1;
    slots.forEach((sl, i) => {
      const y = PY + 14 + i * 30;
      const on = sl.n === here;
      const hot = hover === 'slot:' + sl.n;
      buttons.push({ id: 'slot:' + sl.n, x: BX, y, w: BW - 26, h: 26 });
      cut(g, BX - 2, y - 2, BW - 22, 30, KIT.ink, 3);
      cut(g, BX, y, BW - 26, 26, on ? KIT.p3 : hot ? KIT.p2 : KIT.p1, 2);
      Art.rect(g, BX, y, BW - 26, 2, KIT.p4);
      if (on) { Art.rect(g, BX - 9, y + 6, 5, 14, KIT.ink); Art.rect(g, BX - 8, y + 7, 3, 12, '#e8dcc0'); Art.rect(g, BX - 8, y + 3, 3, 4, KIT.g3); }
      Font.draw(g, 'GROVE ' + sl.n, BX + 7, y + 4, { scale: 1, color: '#3a2410' });
      if (sl.empty) {
        Font.draw(g, 'EMPTY', BX + 7, y + 15, { scale: 1, color: '#8a6f45' });
      } else {
        Font.draw(g, sl.rank.toUpperCase(), BX + 62, y + 4, { scale: 1, color: '#1c5568' });
        Font.draw(g, U.fmt(sl.wd) + ' W$', BX + BW - 34, y + 4, { scale: 1, color: '#7a4f06', align: 'right' });
        Font.draw(g, sl.wombats + ' WOMBAT' + (sl.wombats === 1 ? '' : 'S') + '  ' + sl.gods + '/9 GODS',
          BX + 7, y + 15, { scale: 1, color: '#6b4a26' });
        // and the way to be rid of it
        buttons.push({ id: 'wipe:' + sl.n, x: BX + BW - 22, y, w: 22, h: 26 });
        const wh = hover === 'wipe:' + sl.n;
        cut(g, BX + BW - 24, y - 2, 26, 30, KIT.ink, 3);
        cut(g, BX + BW - 22, y, 22, 26, wh ? '#d84428' : '#902418', 2);
        Art.rect(g, BX + BW - 22, y, 22, 2, '#e07d2c');
        Font.draw(g, 'X', BX + BW - 11, y + 9, { scale: 1, color: '#fff3b8', align: 'center' });
      }
    });
    buttons.push({ id: 'enter', x: BX, y: PY + 112, w: BW, h: 48 });
    buttons.push({ id: 'settings', x: BX, y: PY + 168, w: BW, h: 26 });
    buttons.push({ id: 'help', x: BX, y: PY + 200, w: BW, h: 26 });
    const bEnter = buttons.find((b2) => b2.id === 'enter');
    bigButton(g, bEnter, 'ENTER THE GROVE', hasSave ? 'CONTINUE WHERE YOU LEFT OFF' : 'A NEW WOOD, A NEW WOMBAT', 2);
    bigButton(g, buttons.find((b2) => b2.id === 'settings'), 'SETTINGS', null, 1);
    bigButton(g, buttons.find((b2) => b2.id === 'help'), 'HOW TO PLAY', null, 1);
    // the rumour, on a little plate along the bottom of the screen
    const line = RUMOURS[rumour % RUMOURS.length];
    const w = Font.width(line, 1) + 26;
    const rx = VW / 2, ry = VH - 18;
    cut(g, rx - w / 2 - 2, ry - 3, w + 4, 18, KIT.ink, 3);
    cut(g, rx - w / 2, ry - 1, w, 14, KIT.p2, 2);
    Art.rect(g, rx - w / 2 + 2, ry - 1, w - 4, 2, KIT.p4);
    Font.draw(g, line, rx, ry + 3, { scale: 1, color: '#6b4a26', align: 'center' });
  }

  // a short page of how it works, so the title screen can answer the question
  const HELP = [
    ['t_sickle', 'Clear the weeds', 'Right-click opens the tool tray. Pick one and it rides with the pointer.'],
    ['t_hoe', 'Break a bed, sow it', 'Hoe bare soil, drop seed on it, water it while it grows, pick it when it glows.'],
    ['t_food', 'Feed a wombat', 'Put a bowl down. She eats, she walks off, and she leaves a cube.'],
    ['truck', 'Load the truck', 'Drag the cubes to the truck at the edge of the clearing. Click it for the map.'],
    ['u_seats', 'Sell him the cubes', 'The hooded one buys everything she leaves, and pays better for a load than for one.'],
    ['shrine', 'Call one down', 'Stack what she leaves at the ritual site and a god answers. There are nine.'],
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
    Font.draw(g, hasSave ? 'ERASES YOUR GROVE AND STARTS OVER' : 'NOTHING SAVED YET', VW / 2, dy + 17, {
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
    g.fillStyle = 'rgba(6,4,10,0.74)'; g.fillRect(0, 0, VW, VH);
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
    seedAir();
    wombatLoop(dt);
  }
  function render(g) {
    scene(g);
    seedAir();
    drawAir(g);
    if (page === 'home') drawHome(g);
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
      confirm = { text: 'your grove, every wombat and every god', go: () => onAct({ wipe: true }) };
      return;
    }
    // picking a grove, or burning one
    if (h.id.startsWith('slot:')) { onAct({ slot: +h.id.slice(5) }); Audio.play('click'); return; }
    if (h.id.startsWith('wipe:')) {
      const n = +h.id.slice(5);
      confirm = { text: 'grove ' + n + ', every wombat in it and every god', go: () => onAct({ wipeSlot: n }) };
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
