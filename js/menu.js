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
  // ==== THE THRESHOLD ========================================================
  // The title screen is not a clearing with a signboard in it any more. It is
  // the place you go in: a stone doorway standing in a wood at night with
  // violet light coming out of it, nine god-masks hung in the branches over it,
  // three lanterns on a bough for the three groves, and candles guttering all
  // round the foot of it. Everything you can press is an object in the scene.
  const GTOP = 96, GBOT = 300;                 // the gate, top and bottom
  const GX = 320;                              // and the middle of it
  const PXM = 2;

  // the wood behind it, in four ranks of silhouette
  const BACK = [];
  (() => {
    const r = Art.rng(31337);
    for (let d = 0; d < 4; d++) {
      let x = -40;
      while (x < VW + 60) {
        const s = 0.5 + d * 0.22;
        BACK.push({ d, x, w: (16 + r() * 22) * s, h: (90 + r() * 120) * s, lean: (r() - 0.5) * 8, v: Math.floor(r() * 3) });
        x += (26 + r() * 40) * s;
      }
    }
  })();
  const CANDLES = [];
  (() => {
    const r = Art.rng(777);
    for (let i = 0; i < 16; i++) {
      const side = i % 2 ? 1 : -1;
      CANDLES.push({ x: GX + side * (66 + (i >> 1) * 22 + r() * 10), y: 300 + r() * 34, h: 7 + r() * 12, ph: r() * TAU });
    }
  })();
  const FIRE = [];
  (() => { const r = Art.rng(4242); for (let i = 0; i < 40; i++) FIRE.push({ x: r() * VW, y: 150 + r() * 200, ph: r() * TAU, sp: 4 + r() * 10, a: 0.3 + r() * 0.6, v: Math.floor(r() * 3) }); })();

  // ---- the scene -------------------------------------------------------------
  function scene(g) {
    // the sky: a cold violet night falling to black at the treeline
    for (let y = 0; y < VH; y += PXM) {
      const k = y / VH;
      g.fillStyle = U.mix('#160e2e', '#050410', Math.min(1, k * 1.5));
      g.fillRect(0, y, VW, PXM);
    }
    // a big low moon behind the wood
    const my = 96, mr = 54;
    for (let y = -mr; y <= mr; y += PXM) {
      const w2 = Math.round(Math.sqrt(Math.max(0, mr * mr - y * y)) / PXM) * PXM;
      if (w2 < PXM) continue;
      g.fillStyle = U.mix('#2a2050', '#3e2f70', 1 - Math.abs(y) / mr);
      g.fillRect(GX - w2, my + y, w2 * 2, PXM);
    }
    for (let y = -mr + 6; y <= mr - 6; y += PXM) {
      const w2 = Math.round(Math.sqrt(Math.max(0, (mr - 6) * (mr - 6) - y * y)) / PXM) * PXM;
      if (w2 < PXM) continue;
      g.fillStyle = '#4a3a86';
      g.fillRect(GX - w2, my + y, w2 * 2, PXM);
    }
    // stars, only in the top third
    const sr = Art.rng(5150);
    for (let i = 0; i < 90; i++) {
      const x = Math.round(sr() * VW), y = Math.round(sr() * 150);
      const tw = (Math.sin(t * 1.7 + i) + 1) / 2;
      g.fillStyle = U.rgba('#e0d4ff', 0.2 + tw * 0.6);
      g.fillRect(x, y, PXM, PXM);
    }
    // the wood, four ranks, darkest at the front
    for (const b of BACK) {
      const col = ['#100a22', '#0c0818', '#080513', '#04030c'][b.d];
      const base = 250 + b.d * 22;
      const sway = Math.sin(t * 0.3 + b.x * 0.02) * (3 - b.d) * 0.7;
      // the trunk
      Art.limb(g, b.x + sway, base - b.h, b.x + b.lean * 0.3, base, b.w * 0.3, b.w * 0.5, col);
      // and three boughs off it
      for (let i = 0; i < 3; i++) {
        const uy = base - b.h * (0.55 + i * 0.16);
        const dir = i % 2 ? 1 : -1;
        Art.limb(g, b.x + sway * 0.7, uy, b.x + dir * b.w * 1.5 + sway, uy - b.h * 0.2, b.w * 0.2, b.w * 0.06, col);
      }
    }
    // the mist lying between the ranks
    for (let i = 0; i < 5; i++) {
      const my2 = 236 + i * 14;
      const mx = ((t * (4 + i * 2)) % (VW + 300)) - 150;
      for (let k = 0; k < 4; k++) {
        g.fillStyle = U.rgba('#6a5c9a', 0.05);
        g.fillRect(mx - 120 + k * 8, my2 + k * 2, 300 - k * 16, 5);
      }
    }
    theGate(g);
    // the ground at the foot of it
    for (let y = 300; y < VH; y += PXM) {
      g.fillStyle = U.mix('#181030', '#0a0618', (y - 300) / 60);
      g.fillRect(0, y, VW, PXM);
    }
    for (let i = 0; i < 160; i++) {
      const x = Math.round(sr() * VW), y = 302 + Math.round(sr() * 56);
      g.fillStyle = ['#241a44', '#2e2254', '#140d28'][Math.floor(sr() * 3)];
      g.fillRect(x, y, PXM * 2, PXM);
    }
    for (const c of CANDLES) candle(g, c);
    // the light off the gate lying across the ground
    for (let i = 0; i < 7; i++) {
      const w2 = 250 - i * 26;
      g.fillStyle = U.rgba('#9a5cf0', 0.045);
      g.fillRect(GX - w2 / 2, 300 + i * 9, w2, 9);
    }
    // embers drifting up out of the wood
    for (const f of FIRE) {
      const y = f.y - ((t * f.sp) % 220);
      const x = f.x + Math.sin(t * 0.7 + f.ph) * 14;
      const k = (Math.sin(t * 2 + f.ph) + 1) / 2;
      const col = [PAL.div4, PAL.gold3, PAL.cyan3][f.v];
      g.fillStyle = U.rgba(col, f.a * (0.3 + k * 0.7) * 0.7);
      g.fillRect(Math.round(x), Math.round(y), PXM, PXM);
    }
    masks(g);
  }

  // ---- the doorway -----------------------------------------------------------
  function theGate(g) {
    const SW = 44, IW = 116;                       // stone width, opening width
    const L = GX - IW / 2 - SW, Rt = GX + IW / 2;
    // the light pouring out of it, first, so the stone sits in front
    for (let i = 10; i >= 1; i--) {
      const f = i / 10;
      g.fillStyle = U.rgba('#6b32bd', 0.05);
      g.fillRect(GX - (IW / 2 + 120 * f), GTOP - 40 * f, IW + 240 * f, (GBOT - GTOP) + 80 * f);
    }
    // the way through: a shifting violet field with runes turning in it
    for (let y = GTOP + 22; y < GBOT; y += PXM) {
      const k = (y - GTOP) / (GBOT - GTOP);
      const pulse = 0.5 + 0.5 * Math.sin(t * 1.4 - k * 5);
      g.fillStyle = U.mix('#2a1150', U.mix('#6b32bd', '#c898ff', pulse * 0.6), 0.4 + k * 0.3);
      const inset = Math.round(Math.sin(k * 3.1) * 3);
      g.fillRect(GX - IW / 2 + inset, y, IW - inset * 2, PXM);
    }
    // things falling upward through the opening
    for (let i = 0; i < 26; i++) {
      const ph = i * 1.7;
      const y = GBOT - ((t * (14 + (i % 5) * 9) + i * 30) % (GBOT - GTOP - 20));
      const x = GX + Math.sin(t * 0.8 + ph) * (IW / 2 - 14);
      g.fillStyle = U.rgba(i % 4 ? '#e0cfff' : '#ffd95c', 0.75);
      g.fillRect(Math.round(x), Math.round(y), PXM, PXM * 2);
    }
    // the two uprights, hewn, with a lit edge toward the doorway
    for (const [sx, dir] of [[L, 1], [Rt, -1]]) {
      for (let y = GTOP; y < GBOT + 10; y += PXM) {
        const jit = (Art.rng(Math.round(y / PXM) * 977 + sx)() * 3 | 0) * PXM;
        g.fillStyle = '#000000';
        g.fillRect(sx - PXM, y, SW + PXM * 2, PXM);
        g.fillStyle = ['#2a2438', '#37304a', '#453d5e'][Math.floor(Art.rng(y * 31 + sx)() * 3)];
        g.fillRect(sx + (dir > 0 ? jit : 0), y, SW - jit, PXM);
        // the violet catching the inside edge
        g.fillStyle = U.rgba('#9a5cf0', 0.5 - (y - GTOP) / (GBOT - GTOP) * 0.25);
        g.fillRect(dir > 0 ? sx + SW - PXM * 2 : sx, y, PXM * 2, PXM);
      }
    }
    // the lintel across the top, carved
    g.fillStyle = '#000000'; g.fillRect(L - 12, GTOP - 30, IW + SW * 2 + 24, 34);
    for (let y = GTOP - 27; y < GTOP; y += PXM) {
      g.fillStyle = ['#37304a', '#453d5e', '#2a2438'][Math.floor(Art.rng(y * 17)() * 3)];
      g.fillRect(L - 9, y, IW + SW * 2 + 18, PXM);
    }
    g.fillStyle = '#5a5070'; g.fillRect(L - 9, GTOP - 27, IW + SW * 2 + 18, PXM);
    g.fillStyle = '#16121f'; g.fillRect(L - 9, GTOP - PXM * 2, IW + SW * 2 + 18, PXM * 2);
    // the name cut into it, lit from below by the gate
    const glow = 0.6 + 0.4 * Math.sin(t * 1.4);
    Font.draw(g, 'WOMBAT GODS', GX, GTOP - 21, { scale: 2, color: '#0a0614', align: 'center' });
    Font.draw(g, 'WOMBAT GODS', GX, GTOP - 22, { scale: 2, color: U.mix('#9a5cf0', '#f0e0ff', glow), align: 'center' });
    // the runes down each upright
    const MARKS = [[0, 0, 2, 0, 1, 1, 1, 2], [0, 0, 0, 2, 1, 1, 2, 0, 2, 2], [1, 0, 0, 1, 2, 1, 1, 2]];
    for (const [sx] of [[L], [Rt]]) {
      for (let i = 0; i < 6; i++) {
        const mk = MARKS[i % 3], ry = GTOP + 16 + i * 30;
        const lit = 0.25 + 0.55 * ((Math.sin(t * 1.1 + i + sx * 0.01) + 1) / 2);
        for (let k = 0; k < mk.length; k += 2) {
          g.fillStyle = U.rgba('#c898ff', lit);
          g.fillRect(sx + SW / 2 - 6 + mk[k] * 5, ry + mk[k + 1] * 5, 4, 4);
        }
      }
    }
    // the step, and the threshold stone you stand on
    g.fillStyle = '#000000'; g.fillRect(GX - IW / 2 - 18, GBOT, IW + 36, 14);
    g.fillStyle = '#332c46'; g.fillRect(GX - IW / 2 - 15, GBOT + 2, IW + 30, 9);
    g.fillStyle = '#4a415e'; g.fillRect(GX - IW / 2 - 15, GBOT + 2, IW + 30, PXM);
    g.fillStyle = U.rgba('#9a5cf0', 0.3); g.fillRect(GX - IW / 2, GBOT + 2, IW, PXM * 2);
  }
  // one tallow candle, guttering
  function candle(g, c) {
    const x = Math.round(c.x), y = Math.round(c.y);
    g.fillStyle = '#000000'; g.fillRect(x - 3, y - c.h - 2, 8, c.h + 4);
    g.fillStyle = '#c9bea4'; g.fillRect(x - 2, y - c.h, 6, c.h);
    g.fillStyle = '#e8dcc0'; g.fillRect(x - 2, y - c.h, 2, c.h);
    const f = Math.sin(t * 9 + c.ph) > 0 ? 1 : 0;
    g.fillStyle = '#7a2a08'; g.fillRect(x, y - c.h - 7 - f, 2, 7);
    g.fillStyle = '#efb625'; g.fillRect(x, y - c.h - 5 - f, 2, 5);
    g.fillStyle = '#fff3b8'; g.fillRect(x, y - c.h - 2, 2, 2);
    g.fillStyle = U.rgba('#efb625', 0.05); g.fillRect(x - 14, y - c.h - 18, 30, 30);
  }
  // nine masks in the branches. One lights for every god the chosen grove has.
  function masks(g) {
    const got = gods();
    // Four to the left of the gate and five to the right, hung high off the
    // bough so nothing of theirs comes down over the name.
    const SPOTS = [-268, -222, -176, -130, 130, 176, 222, 268, 300];
    for (let i = 0; i < 9; i++) {
      const x = Math.round(GX + SPOTS[i]);
      const y = Math.round(22 + (i % 3) * 9 + Math.sin(t * 0.6 + i) * 2);
      const on = i < got;
      const gcol = on ? GODS[i].color : '#181228';
      const eye = on ? GODS[i].eye : '#241a38';
      // the cord it hangs on
      g.fillStyle = '#100a1c'; g.fillRect(x, 0, PXM, y - 10);
      g.fillStyle = '#000000'; g.fillRect(x - 12, y - 10, 24, 28);
      g.fillStyle = gcol; g.fillRect(x - 10, y - 8, 20, 24);
      g.fillStyle = U.shade(gcol, 0.3); g.fillRect(x - 10, y - 8, 20, PXM);
      g.fillStyle = '#000000'; g.fillRect(x - 7, y - 2, 5, 5); g.fillRect(x + 2, y - 2, 5, 5);
      g.fillStyle = eye; g.fillRect(x - 6, y - 1, 3, 3); g.fillRect(x + 3, y - 1, 3, 3);
      g.fillStyle = '#000000'; g.fillRect(x - 4, y + 8, 8, 4);
      if (on) { g.fillStyle = U.rgba(gcol, 0.08); g.fillRect(x - 24, y - 22, 48, 52); }
    }
  }
  function gods() {
    const sl = (typeof Main !== 'undefined' && Main.slotList) ? Main.slotList() : null;
    if (!sl) return 0;
    const here = (typeof Main !== 'undefined' && Main.slot) || 1;
    const s = sl.find((x) => x.n === here);
    return s && !s.empty ? s.gods : 0;
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
  // ---- the home page ---------------------------------------------------------
  // No board. Three lanterns on a bough for the three groves, the doorway to
  // walk into, and two words cut in the stones either side of it.
  function drawHome(g) {
    buttons = [];
    const slots = (typeof Main !== 'undefined' && Main.slotList) ? Main.slotList() : [{ n: 1, empty: !hasSave }];
    const here = (typeof Main !== 'undefined' && Main.slot) || 1;
    // ---- the bough the masks hang off --------------------------------------
    Art.limb(g, -10, 22, VW + 10, 8, 9, 6, '#0a0618');
    Art.limb(g, -10, 20, VW + 10, 6, 4, 3, '#150e28');
    // ---- three lanterns on a post down the left ----------------------------
    g.fillStyle = '#000000'; g.fillRect(44, 78, 8, 232);
    g.fillStyle = '#1a1230'; g.fillRect(46, 80, 4, 228);
    g.fillStyle = '#2e2348'; g.fillRect(46, 80, 2, 228);
    slots.forEach((sl, i) => {
      const x = 74;
      const on = sl.n === here;
      const sway = Math.sin(t * 0.9 + i * 1.3) * 1.6;
      const hot = hover === 'slot:' + sl.n;
      const y = 96 + i * 76 + (on ? 3 : 0);
      g.fillStyle = '#100a1c'; g.fillRect(50, y - 12, 24, 3);
      buttons.push({ id: 'slot:' + sl.n, x: x - 22, y: y - 6, w: 62, h: 62 });
      lantern2(g, x + sway, y, !sl.empty, on, hot, sl, i);
      if (!sl.empty) {
        buttons.push({ id: 'wipe:' + sl.n, x: x - 13, y: y + 38, w: 18, h: 18 });
        const wh = hover === 'wipe:' + sl.n;
        g.fillStyle = '#000000'; g.fillRect(x - 13 + sway, y + 38, 18, 18);
        g.fillStyle = wh ? '#d84428' : '#4a1410'; g.fillRect(x - 11 + sway, y + 40, 14, 14);
        Font.draw(g, 'X', x - 4 + sway, y + 44, { scale: 1, color: wh ? '#fff3b8' : '#a04030', align: 'center' });
      }
    });
    // ---- the doorway is the button ------------------------------------------
    const goHot = hover === 'enter';
    buttons.push({ id: 'enter', x: GX - 58, y: GTOP + 20, w: 116, h: GBOT - GTOP - 20 });
    const pull = goHot ? 1 : 0;
    if (goHot) {
      // it brightens and reaches for you
      for (let i = 6; i >= 1; i--) {
        g.fillStyle = U.rgba('#c898ff', 0.05);
        g.fillRect(GX - 58 - i * 9, GTOP + 20 - i * 6, 116 + i * 18, (GBOT - GTOP - 20) + i * 12);
      }
    }
    const lab = hasSave ? 'GO BACK IN' : 'GO IN';
    const ly = GBOT - 44 - pull * 3 + Math.sin(t * 2) * 2;
    Font.draw(g, lab, GX, ly + 2, { scale: 2, color: '#0a0614', align: 'center' });
    Font.draw(g, lab, GX, ly, { scale: 2, color: goHot ? '#fffae8' : '#e0cfff', align: 'center' });
    const sub = hasSave ? 'the wood remembers you' : 'a new wood, a new wombat';
    // a dark plate behind it, because the portal behind is the same violet
    const sw = Font.width(sub, 1) + 12;
    g.fillStyle = 'rgba(8,4,18,0.66)'; g.fillRect(GX - sw / 2, ly + 16, sw, 12);
    Font.draw(g, sub, GX, ly + 20, { scale: 1, color: '#0a0614', align: 'center' });
    Font.draw(g, sub, GX, ly + 19, { scale: 1, color: goHot ? '#fffae8' : '#c898ff', align: 'center' });
    // ---- two words cut in the stones ----------------------------------------
    stoneWord(g, 178, 300, 'settings', 'SETTINGS');
    stoneWord(g, 472, 300, 'help', 'HOW TO PLAY');
    // ---- the rumour, scratched in the dirt ----------------------------------
    const line = RUMOURS[rumour % RUMOURS.length];
    Font.draw(g, line, GX, VH - 15, { scale: 1, color: '#0a0614', align: 'center' });
    Font.draw(g, line, GX, VH - 16, { scale: 1, color: '#5a4a80', align: 'center' });
  }
  // a lantern on the bough: lit if that grove has something in it
  function lantern2(g, x, y, full, on, hot, sl, i) {
    x = Math.round(x); y = Math.round(y);
    g.fillStyle = '#100a1c'; g.fillRect(x - 1, y - 26, 2, 22);      // the hook
    g.fillStyle = '#000000'; g.fillRect(x - 13, y - 6, 26, 42);
    g.fillStyle = on ? '#4a3d6a' : '#241d38'; g.fillRect(x - 11, y - 4, 22, 38);
    g.fillStyle = on ? '#6a5a92' : '#332a4a'; g.fillRect(x - 11, y - 4, 22, 2);
    // the glass, and what is burning in it
    const lit = full ? (on ? 1 : 0.55) : 0;
    const fl = Math.sin(t * 7 + i * 2) > 0 ? 1 : 0;
    g.fillStyle = '#0a0614'; g.fillRect(x - 8, y + 1, 16, 26);
    if (lit > 0) {
      g.fillStyle = U.rgba('#efb625', 0.4 * lit); g.fillRect(x - 8, y + 1, 16, 26);
      g.fillStyle = '#7a2a08'; g.fillRect(x - 2, y + 14 - fl, 4, 10);
      g.fillStyle = '#efb625'; g.fillRect(x - 2, y + 17 - fl, 4, 7);
      g.fillStyle = '#fff3b8'; g.fillRect(x - 1, y + 20, 2, 4);
      g.fillStyle = U.rgba('#efb625', 0.06 * lit); g.fillRect(x - 30, y - 16, 60, 62);
    } else {
      // an empty one: nothing in the glass but the dark
      Font.draw(g, '-', x, y + 10, { scale: 1, color: '#3a3050', align: 'center' });
    }
    if (hot || on) {
      g.fillStyle = hot ? '#ffd95c' : '#6b32bd';
      g.fillRect(x - 15, y - 8, 30, 2); g.fillRect(x - 15, y + 36, 30, 2);
      g.fillRect(x - 15, y - 8, 2, 46); g.fillRect(x + 13, y - 8, 2, 46);
    }
    // what is in that grove, hung under the lantern on a tag
    const tag = sl.empty ? 'empty' : sl.rank.toLowerCase();
    Font.draw(g, 'grove ' + sl.n, x + 20, y + 3, { scale: 1, color: '#0a0614' });
    Font.draw(g, 'grove ' + sl.n, x + 20, y + 2, { scale: 1, color: on ? '#ffd95c' : '#6a5a92' });
    Font.draw(g, tag, x + 20, y + 15, { scale: 1, color: '#0a0614' });
    Font.draw(g, tag, x + 20, y + 14, { scale: 1, color: sl.empty ? '#4a3d6a' : '#9a5cf0' });
    if (!sl.empty) {
      Font.draw(g, sl.gods + '/9 gods', x + 20, y + 27, { scale: 1, color: '#0a0614' });
      Font.draw(g, sl.gods + '/9 gods', x + 20, y + 26, { scale: 1, color: '#c898ff' });
    }
  }
  // a word cut into a standing stone at the foot of the gate
  function stoneWord(g, x, y, id, label) {
    const hot = hover === id;
    const w = Font.width(label, 1) + 22, h = 26;
    buttons.push({ id, x: x - w / 2, y: y - h / 2, w, h });
    // the stone
    g.fillStyle = '#000000'; g.fillRect(x - w / 2 - 3, y - h / 2 - 3, w + 6, h + 6);
    for (let yy = 0; yy < h; yy += PXM) {
      const jit = (Art.rng(Math.round(yy / PXM) * 131 + x)() * 2 | 0) * PXM;
      g.fillStyle = hot ? ['#4a4166', '#584d78', '#3e3658'][Math.floor(Art.rng(yy * 7 + x)() * 3)]
                        : ['#2e283e', '#3a3350', '#241f33'][Math.floor(Art.rng(yy * 7 + x)() * 3)];
      g.fillRect(x - w / 2 + jit, y - h / 2 + yy, w - jit * 2, PXM);
    }
    g.fillStyle = hot ? '#6a5f8c' : '#463d60'; g.fillRect(x - w / 2 + 2, y - h / 2, w - 4, PXM);
    Font.draw(g, label, x, y - 4, { scale: 1, color: '#0a0614', align: 'center' });
    Font.draw(g, label, x, y - 5, { scale: 1, color: hot ? '#fffae8' : '#a08fd0', align: 'center' });
    if (hot) { g.fillStyle = U.rgba('#9a5cf0', 0.09); g.fillRect(x - w / 2 - 12, y - h / 2 - 12, w + 24, h + 24); }
  }

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
