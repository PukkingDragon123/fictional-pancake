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
    { x: 250, y: 318, dir: 1, tx: 330, state: 'walk', st: 0, anim: 0, pelt: 'brown', sc: 1.5, home: [200, 380] },
    { x: 330, y: 286, dir: -1, tx: 300, state: 'sleep', st: 0, anim: 0, pelt: 'sand', sc: 1.3, home: [240, 400] },
    { x: 150, y: 348, dir: 1, tx: 220, state: 'graze', st: 0, anim: 0, pelt: 'grey', sc: 1.6, home: [70, 300] },
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
        else { w.state = 'walk'; w.tx = w.home[0] + Math.random() * (w.home[1] - w.home[0]); w.y = 284 + Math.random() * 66; }
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

  // ---- the title -----------------------------------------------------------
  // A long board of weathered oak hung off the canopy on two ropes, with moss
  // over the top edge, the name burnt into it and a couple of flowers growing
  // out of the corner. It sways, because it is hanging.
  function titleSign(g) {
    const cx = VW / 2, w = 366, h = 62, y = 28;
    const sway = Math.sin(t * 0.55) * 0.028;
    g.save();
    g.translate(cx, y - 34);
    g.rotate(sway);
    g.translate(-cx, -(y - 34));
    // the two ropes up into the leaves
    for (const rx of [cx - w / 2 + 22, cx + w / 2 - 22]) {
      for (let i = 0; i < 34; i++) {
        g.fillStyle = i % 2 ? '#6b5232' : '#4a3a22';
        g.fillRect(Math.round(rx + Math.sin(i * 0.9) * 1), y - 34 - i, 2, 1);
      }
      Art.ell(g, rx + 1, y - 2, 4, 4, '#3a2a18');                 // the iron ring
      Art.ellBand(g, rx + 1, y - 2, 4, 4, '#8a7a58', 0.5, 0.5);
    }
    // the board: five planks, dark edge, lit top
    Art.rect(g, cx - w / 2 - 4, y - 4, w + 8, h + 8, '#20160e');
    for (let i = 0; i < 5; i++) {
      const py = y + i * (h / 5);
      Art.rect(g, cx - w / 2, py, w, h / 5, i % 2 ? '#6b4a2c' : '#7d5738');
      Art.rect(g, cx - w / 2, py, w, 2, '#9a7452');
      Art.rect(g, cx - w / 2, py + h / 5 - 2, w, 2, '#4a3220');
    }
    // grain, knots and a split
    const r = Art.rng(3311);
    for (let i = 0; i < 40; i++) {
      const gx = cx - w / 2 + r() * w, gy = y + r() * h;
      g.fillStyle = 'rgba(58,38,22,0.4)';
      g.fillRect(Math.round(gx), Math.round(gy), 6 + Math.round(r() * 18), 1);
    }
    for (const [kx, ky] of [[cx - w * 0.36, y + h * 0.7], [cx + w * 0.4, y + h * 0.3]]) {
      Art.ell(g, kx, ky, 5, 4, '#4a3220');
      Art.ell(g, kx, ky, 3, 2.4, '#3a2618');
    }
    // two iron straps across it
    for (const sx of [cx - w / 2 + 16, cx + w / 2 - 20]) {
      Art.rect(g, sx, y, 5, h, '#2e3038');
      Art.rect(g, sx, y, 2, h, '#565b68');
      for (let i = 0; i < 4; i++) { g.fillStyle = '#8b90a0'; g.fillRect(Math.round(sx + 1), Math.round(y + 8 + i * (h / 4)), 2, 2); }
    }
    // moss along the top and in the corners, because nothing here stays clean
    for (let i = 0; i < w; i += 3) {
      const hgt = 2 + Math.round(Math.abs(Math.sin(i * 0.31)) * 5);
      g.fillStyle = i % 6 < 3 ? '#4f7a34' : '#3f6a2c';
      g.fillRect(Math.round(cx - w / 2 + i), y - hgt + 1, 3, hgt + 2);
      if (i % 9 === 0) { g.fillStyle = '#84bb59'; g.fillRect(Math.round(cx - w / 2 + i), y - hgt, 2, 2); }
    }
    g.fillStyle = '#3f6a2c';
    Art.ell(g, cx - w / 2 + 10, y + h - 4, 16, 6, '#3f6a2c');
    Art.ell(g, cx + w / 2 - 12, y + h - 3, 13, 5, '#4f7a34');
    for (let i = 0; i < 4; i++) { g.fillStyle = FLOW[i % FLOW.length]; g.fillRect(Math.round(cx - w / 2 + 4 + i * 6), Math.round(y + h - 10), 3, 3); }
    // the name, burnt in: a dark cut with a lit lower lip
    const ty = y + 14;
    Font.draw(g, 'WOMBAT', cx, ty + 2, { scale: 4, align: 'center', color: '#2a1a0e' });
    Font.draw(g, 'WOMBAT', cx, ty, { scale: 4, align: 'center', color: '#f0dcab' });
    Font.draw(g, 'WOMBAT', cx, ty - 1, { scale: 4, align: 'center', color: '#fff6d8' });
    Font.draw(g, 'GODS', cx, ty + 32, { scale: 4, align: 'center', color: '#2a1a0e' });
    Font.draw(g, 'GODS', cx, ty + 30, { scale: 4, align: 'center', color: '#f0dcab' });
    Font.draw(g, 'GODS', cx, ty + 29, { scale: 4, align: 'center', color: '#fff6d8' });
    g.restore();
  }

  // ---- the paradise --------------------------------------------------------
  // Not a dark wood any more. A clearing in high summer: three treehouses up
  // in the canopy with rope between them, flowers through the grass, moss over
  // every log and stone, a pond, birds going over and three wombats in it.
  const LX = 470, LY = 150;                             // the lantern, on the near house
  const FLOWERS = [], TUFTS = [], STONES = [], LILY = [];
  (() => {
    const r = Art.rng(7711);
    const wet = (x, y) => Math.hypot((x - 96) / 86, (y - 336) / 30) < 1.05;
    for (let i = 0; i < 130; i++) { const x = r() * VW, y = 240 + r() * 122; if (!wet(x, y)) FLOWERS.push({ x, y, v: Math.floor(r() * 5), ph: r() * TAU, s: 0.7 + r() * 0.6 }); }
    for (let i = 0; i < 220; i++) { const x = r() * VW, y = 232 + r() * 130; if (!wet(x, y)) TUFTS.push({ x, y, h: 4 + r() * 7, ph: r() * TAU, tone: Math.floor(r() * 3) }); }
    for (let i = 0; i < 16; i++) { const x = r() * VW, y = 252 + r() * 106; if (!wet(x, y)) STONES.push({ x, y, w: 7 + r() * 16, h: 4 + r() * 7 }); }
    for (let i = 0; i < 6; i++) LILY.push({ x: 40 + r() * 112, y: 322 + r() * 30, r: 5 + r() * 5, ph: r() * TAU });
  })();
  const BIRDS = [];
  for (let i = 0; i < 7; i++) BIRDS.push({ x: Math.random() * VW, y: 30 + Math.random() * 90, sp: 16 + Math.random() * 26, ph: Math.random() * TAU, dir: Math.random() < 0.5 ? -1 : 1, s: 0.7 + Math.random() * 0.6 });
  const FLOW = ['#f2d0e0', '#f5cd5c', '#c4a8e8', '#f0f0e0', '#e88a6a'];

  // one flower: a stalk, two leaves and a four-petal head
  function flower(g, f) {
    const sway = Math.sin(t * 1.1 + f.ph) * 1.6;
    const h = 7 * f.s;
    g.fillStyle = '#3f6a2c';
    for (let i = 0; i < h; i++) g.fillRect(Math.round(f.x + sway * (i / h) * (i / h)), Math.round(f.y - i), 1, 1);
    const hx = Math.round(f.x + sway), hy = Math.round(f.y - h);
    g.fillStyle = '#4f8a36'; g.fillRect(hx - 2, Math.round(f.y - h * 0.5), 2, 1); g.fillRect(hx + 1, Math.round(f.y - h * 0.7), 2, 1);
    const c = FLOW[f.v];
    g.fillStyle = U.shade(c, -0.3);
    g.fillRect(hx - 2, hy - 1, 5, 3); g.fillRect(hx - 1, hy - 2, 3, 5);
    g.fillStyle = c;
    g.fillRect(hx - 1, hy - 1, 3, 3); g.fillRect(hx - 2, hy, 1, 1); g.fillRect(hx + 2, hy, 1, 1);
    g.fillStyle = '#ffeeb0'; g.fillRect(hx, hy, 1, 1);
  }
  // a treehouse: a platform round a trunk, plank walls, a shingle roof, a
  // window with the light on and a ladder down
  function treehouse(g, x, y, w, h, flip, lamp) {
    const D = '#3a2a1c', M = '#5c4430', L = '#7d5f42', H2 = '#9a7a58';
    Art.rect(g, x - w / 2 - 6, y, w + 12, 5, D);                      // the platform
    Art.rect(g, x - w / 2 - 6, y, w + 12, 2, L);
    for (let i = 0; i < 5; i++) Art.rect(g, x - w / 2 - 4 + i * (w / 4), y + 5, 3, 7, D);   // joists
    Art.rect(g, x - w / 2, y - h, w, h, D);                           // the box
    for (let i = 0; i < h / 5; i++) {
      Art.rect(g, x - w / 2 + 1, y - h + i * 5, w - 2, 4, i % 2 ? M : L);
      Art.rect(g, x - w / 2 + 1, y - h + i * 5, w - 2, 1, H2);
    }
    for (let i = 0; i < 9; i++) {                                     // the roof
      const rw = w / 2 + 9 - i * (w / 22);
      Art.rect(g, x - rw, y - h - 2 - i * 2.4, rw * 2, 3, '#4a3a2e');
      Art.rect(g, x - rw, y - h - 2 - i * 2.4, rw * 2, 1, '#6d5644');
      if (i % 3 === 0) { g.fillStyle = PAL.moss1; g.fillRect(Math.round(x - rw + 2), Math.round(y - h - 2 - i * 2.4), Math.round(rw * 0.6), 2); }
    }
    const wx = x + (flip ? -1 : 1) * w * 0.16;                        // the window
    const glow2 = 0.6 + 0.4 * Math.sin(t * 1.6 + x);
    Art.rect(g, wx - 8, y - h * 0.72, 16, 14, D);
    Art.rect(g, wx - 6, y - h * 0.72 + 2, 12, 10, `rgba(250,220,140,${(0.55 + glow2 * 0.4).toFixed(2)})`);
    Art.rect(g, wx - 1, y - h * 0.72 + 2, 2, 10, M);
    Art.rect(g, wx - 6, y - h * 0.72 + 6, 12, 2, M);
    if (lamp) Art.glow(g, wx, y - h * 0.62, 34 + glow2 * 8, '#ffd88c', 0.14 + glow2 * 0.08, 6);
    // a flower box under the window and moss along the platform edge
    Art.rect(g, wx - 9, y - h * 0.72 + 14, 18, 5, D);
    for (let i = 0; i < 5; i++) { g.fillStyle = FLOW[i % FLOW.length]; g.fillRect(Math.round(wx - 7 + i * 3.4), Math.round(y - h * 0.72 + 12), 2, 2); }
    g.fillStyle = PAL.moss1;
    for (let i = 0; i < 6; i++) g.fillRect(Math.round(x - w / 2 - 6 + i * ((w + 12) / 6)), y + 1, 5, 3);
    // a rail
    Art.rect(g, x - w / 2 - 6, y - 12, 2, 12, D);
    Art.rect(g, x + w / 2 + 4, y - 12, 2, 12, D);
    Art.rect(g, x - w / 2 - 6, y - 13, w + 12, 2, M);
  }
  function ropeBridge(g, x0, y0, x1, y1) {
    const n = 26;
    for (let i = 0; i <= n; i++) {
      const k = i / n;
      const sag = Math.sin(k * Math.PI) * 13 + Math.sin(t * 0.8 + k * 4) * 1.2;
      const px = U.lerp(x0, x1, k), py = U.lerp(y0, y1, k) + sag;
      g.fillStyle = '#6b5232'; g.fillRect(Math.round(px), Math.round(py), 3, 2);       // the planks
      g.fillStyle = '#8a6a44'; g.fillRect(Math.round(px), Math.round(py), 3, 1);
      g.fillStyle = '#4a3a22';                                                        // the hand rope
      g.fillRect(Math.round(px), Math.round(py - 12 - Math.sin(k * Math.PI) * 2), 2, 1);
      if (i % 5 === 0) g.fillRect(Math.round(px), Math.round(py - 12), 1, 12);
    }
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

    // ---- the grass floor ---------------------------------------------------
    for (let i = 0; i < 10; i++) {
      const k = i / 9;
      g.fillStyle = U.mix(U.mix('#2e4a24', '#4f7a34', day), U.mix('#3f6330', '#6d9c42', day), k);
      g.fillRect(0, HORIZON + 4 + i * ((VH - HORIZON) / 10), VW, Math.ceil((VH - HORIZON) / 10) + 1);
    }
    // the pond, over on the left
    const PX2 = 96, PY2 = 336, PR = 86;
    Art.ell(g, PX2, PY2, PR + 6, 34, '#3f5a30');
    Art.ell(g, PX2, PY2, PR + 2, 31, '#5a6a3a');
    Art.ell(g, PX2, PY2, PR, 28, U.mix('#254a58', '#3f8ca0', day));
    Art.ell(g, PX2, PY2 - 3, PR - 10, 20, U.mix('#2f6070', '#5fb0c2', day));
    Art.ell(g, PX2 - PR * 0.3, PY2 - 8, PR * 0.3, 6, U.mix('#3f7a90', '#9fdcea', day));
    for (let i = 0; i < 5; i++) {                            // ripples
      const rw = PR * (0.3 + i * 0.16), a = 0.3 - i * 0.05;
      g.globalAlpha = a * (0.6 + 0.4 * Math.sin(t * 1.4 + i));
      Art.ellBand(g, PX2, PY2 - 2, rw, rw * 0.3, '#bfe4f4', 0.7, 0.14);
      g.globalAlpha = 1;
    }
    for (const l of LILY) {                                  // lily pads
      const ly = l.y + Math.sin(t * 0.9 + l.ph) * 1.2;
      Art.ell(g, l.x, ly, l.r, l.r * 0.42, '#3f7a34');
      Art.ell(g, l.x - l.r * 0.2, ly - 0.6, l.r * 0.5, l.r * 0.2, '#5d9440');
      if (l.r > 8) { g.fillStyle = '#f2d0e0'; g.fillRect(Math.round(l.x + 2), Math.round(ly - 3), 3, 3); }
    }
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
    ropeBridge(g, 216, 186, 380, 180);
    ropeBridge(g, 392, 184, 520, 168);
    treehouse(g, 196, 192, 66, 52, false, false);
    treehouse(g, 384, 186, 58, 46, true, false);
    treehouse(g, 536, 174, 74, 58, false, true);
    // ladders down from the near house
    for (let i = 0; i < 14; i++) {
      Art.rect(g, 524, 200 + i * 8, 3, 6, '#4a3a22');
      Art.rect(g, 548, 200 + i * 8, 3, 6, '#4a3a22');
      Art.rect(g, 524, 202 + i * 8, 27, 2, '#6b5232');
    }
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
    g.fillStyle = '#1a1410'; g.fillRect(LX - 1, 0, 2, LY - 14);
    for (let i = 0; i < 5; i++) { g.fillStyle = '#4a4038'; g.fillRect(LX - 2, 10 + i * 22, 4, 3); }
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
  // ---- signs ---------------------------------------------------------------
  // Everything you can press is a board of the same weathered oak as the title,
  // hung on two short ropes, with moss over its top edge and iron at the
  // corners. Hover and it swings a little and the moss catches the light.
  function plaque(g, x, y, w, h, hot, tone) {
    const D = '#20160e', M = hot ? '#8a6038' : '#6b4a2c', L = hot ? '#9c7046' : '#7d5738', H2 = hot ? '#b98c5e' : '#9a7452';
    g.fillStyle = 'rgba(12,18,8,0.45)'; g.fillRect(x + 4, y + 6, w, h);
    Art.rect(g, x - 3, y - 3, w + 6, h + 6, D);
    const rows = Math.max(2, Math.round(h / 13));
    for (let i = 0; i < rows; i++) {
      const py = y + i * (h / rows);
      Art.rect(g, x, py, w, h / rows, i % 2 ? M : L);
      Art.rect(g, x, py, w, 2, H2);
      Art.rect(g, x, py + h / rows - 2, w, 2, '#4a3220');
    }
    const r = Art.rng(Math.round(x * 7 + y * 13 + w));
    for (let i = 0; i < Math.round(w / 12); i++) {                    // grain
      g.fillStyle = 'rgba(58,38,22,0.35)';
      g.fillRect(Math.round(x + r() * w), Math.round(y + r() * h), 5 + Math.round(r() * 14), 1);
    }
    // iron straps at the ends
    for (const sx of [x + 5, x + w - 9]) {
      Art.rect(g, sx, y, 4, h, '#2e3038');
      Art.rect(g, sx, y, 2, h, hot ? '#6e7484' : '#565b68');
      g.fillStyle = '#8b90a0'; g.fillRect(Math.round(sx + 1), Math.round(y + 4), 2, 2); g.fillRect(Math.round(sx + 1), Math.round(y + h - 6), 2, 2);
    }
    // moss along the top, thicker where it has been left alone longest
    for (let i = 0; i < w; i += 3) {
      const hgt = 1 + Math.round(Math.abs(Math.sin(i * 0.27 + x)) * 4);
      g.fillStyle = i % 6 < 3 ? (hot ? '#5d9440' : '#4f7a34') : (hot ? '#4f7a34' : '#3f6a2c');
      g.fillRect(Math.round(x + i), y - hgt, 3, hgt + 2);
      if (i % 12 === 0) { g.fillStyle = hot ? '#a8d878' : '#84bb59'; g.fillRect(Math.round(x + i), y - hgt - 1, 2, 2); }
    }
    // and a little in the bottom corners
    Art.ell(g, x + 8, y + h - 2, 11, 4, '#3f6a2c');
    Art.ell(g, x + w - 9, y + h - 1, 9, 3, '#4f7a34');
  }
  // two short ropes, so a sign reads as hung rather than nailed on
  function hang(g, b, lift) {
    for (const rx of [b.x + 14, b.x + b.w - 16]) {
      for (let i = 0; i < 12 + lift; i++) {
        g.fillStyle = i % 2 ? '#6b5232' : '#4a3a22';
        g.fillRect(Math.round(rx), Math.round(b.y - 12 - lift + i), 2, 1);
      }
    }
  }
  function bigButton(g, b, label, sub, scale) {
    const hot = hover === b.id;
    const lift = hot ? -3 : 0;
    const tilt = hot ? Math.sin(t * 6) * 0.012 : Math.sin(t * 0.7 + b.x) * 0.004;
    hang(g, b, -lift);
    g.save();
    g.translate(b.x + b.w / 2, b.y - 12);
    g.rotate(tilt);
    g.translate(-(b.x + b.w / 2), -(b.y - 12));
    plaque(g, b.x, b.y + lift, b.w, b.h, hot);
    const cy = b.y + lift + (sub ? 10 : (b.h - (scale || 2) * 7) / 2);
    Font.draw(g, label, b.x + b.w / 2, cy + 2, { scale: scale || 2, color: '#2a1a0e', align: 'center' });
    Font.draw(g, label, b.x + b.w / 2, cy, {
      scale: scale || 2, color: hot ? '#fff3d0' : '#f0dcab', align: 'center',
    });
    if (sub) Font.draw(g, sub, b.x + b.w / 2, cy + (scale || 2) * 7 + 5, { scale: 1, color: hot ? '#e0c88e' : '#b89a72', align: 'center' });
    if (hot) {                                            // two carved ticks
      Font.draw(g, '>', b.x + 14, cy + ((scale || 2) - 1) * 3, { scale: scale || 2, color: '#f5cd5c' });
      Font.draw(g, '<', b.x + b.w - 14 - Font.width('<', scale || 2), cy + ((scale || 2) - 1) * 3, { scale: scale || 2, color: '#f5cd5c' });
    }
    g.restore();
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
    owl(g, 74, 196, t);
    signpost(g, 286, 356, t);
    const BW = 250, BX = VW - BW - 30;
    buttons.push({ id: 'enter', x: BX, y: 196, w: BW, h: 50 });
    buttons.push({ id: 'settings', x: BX, y: 256, w: BW, h: 36 });
    buttons.push({ id: 'help', x: BX, y: 300, w: BW, h: 30 });
    bigButton(g, buttons[0], 'ENTER THE GROVE', hasSave ? 'CONTINUE WHERE YOU LEFT OFF' : 'A NEW WOOD, A NEW WOMBAT', 2);
    bigButton(g, buttons[1], 'SETTINGS', null, 2);
    bigButton(g, buttons[2], 'HOW TO PLAY', null, 2);
    // the rumour, on a torn strip of paper pinned under the buttons
    const line = RUMOURS[rumour % RUMOURS.length];
    const w = Font.width(line, 1) + 18;
    const rx = BX + BW / 2, ry = 344;
    g.globalAlpha = 0.8;
    Art.rect(g, rx - w / 2, ry - 4, w, 15, 'rgba(8,6,4,0.55)');
    Art.rect(g, rx - w / 2 + 1, ry - 3, w - 2, 13, '#2a2418');
    g.globalAlpha = 1;
    Font.draw(g, line, rx, ry, { scale: 1, color: '#a8a08a', align: 'center' });
    // and the wombats you have, if there are any to come back to
    if (hasSave) {
      Font.draw(g, 'A SAVE IS WAITING', BX + BW / 2, 182, { scale: 1, color: '#84bb59', align: 'center', shadow: '#0e1a08' });
    }
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
    const PW = 470, PX = (VW - PW) / 2, PY = 44, PH = 272;
    plaque(g, PX, PY, PW, PH, false);
    Font.draw(g, 'HOW TO PLAY', VW / 2, PY + 12, { scale: 2, color: '#f5cd5c', align: 'center', shadow: '#160c06' });
    HELP.forEach(([ico, title, body], i) => {
      const ry = PY + 42 + i * 34;
      g.fillStyle = i % 2 ? 'rgba(0,0,0,0.22)' : 'rgba(0,0,0,0.12)';
      g.fillRect(PX + 12, ry - 2, PW - 24, 32);
      Icons.blit(g, ico, PX + 16, ry, 1.2);
      Font.draw(g, title, PX + 44, ry, { scale: 1, color: '#f5cd5c' });
      Font.draw(g, body, PX + 44, ry + 11, { scale: 1, color: '#cfc2a2' });
    });
    const by = PY + PH - 34;
    buttons.push({ id: 'back', x: PX + 14, y: by, w: PW - 28, h: 26 });
    const bh = hover === 'back';
    g.fillStyle = bh ? 'rgba(255,216,140,0.18)' : 'rgba(0,0,0,0.3)';
    g.fillRect(PX + 14, by, PW - 28, 26);
    Font.draw(g, 'BACK', VW / 2, by + 8, { scale: 1, color: bh ? '#ffe9a8' : '#cfc2a2', align: 'center' });
  }

  const SETTINGS = [
    { key: 'muted', name: 'SOUND', on: 'ON', off: 'MUTED', inv: true },
    { key: 'musicOff', name: 'MUSIC', on: 'ON', off: 'OFF', inv: true },
    { key: 'shake', name: 'SCREEN SHAKE', on: 'ON', off: 'OFF' },
    { key: 'bigText', name: 'BIG TEXT', on: 'ON', off: 'OFF' },
  ];
  function drawSettings(g) {
    buttons = [];
    const PW = 420, PX = (VW - PW) / 2, PY = 84, PH = 216;
    plaque(g, PX, PY, PW, PH, false);
    Font.draw(g, 'SETTINGS', VW / 2, PY + 12, { scale: 2, color: '#f5cd5c', align: 'center', shadow: '#160c06' });
    SETTINGS.forEach((s2, i) => {
      const ry = PY + 42 + i * 30;
      const val = s2.inv ? !G[s2.key] : !!G[s2.key];
      const hot = hover === 'set:' + s2.key;
      buttons.push({ id: 'set:' + s2.key, x: PX + 14, y: ry, w: PW - 28, h: 24, kind: 'toggle', k: s2.key });
      g.fillStyle = hot ? 'rgba(255,216,140,0.14)' : 'rgba(0,0,0,0.3)';
      g.fillRect(PX + 14, ry, PW - 28, 24);
      Font.draw(g, s2.name, PX + 26, ry + 8, { scale: 1, color: '#efe0c2' });
      const tx = PX + PW - 92, tw = 66;
      g.fillStyle = '#0a0810'; g.fillRect(tx, ry + 4, tw, 16);
      g.fillStyle = val ? '#3f8f4a' : '#5a4038'; g.fillRect(tx + 1, ry + 5, tw - 2, 14);
      const kx = val ? tx + tw - 20 : tx + 2;
      g.fillStyle = '#efe0c2'; g.fillRect(kx, ry + 6, 18, 12);
      Font.draw(g, val ? s2.on : s2.off, val ? tx + 16 : tx + tw - 16, ry + 9, {
        scale: 1, align: 'center', color: val ? '#dff5d8' : '#d8bdb2',
      });
    });
    const dy = PY + PH - 42;
    buttons.push({ id: 'wipe', x: PX + 14, y: dy, w: PW - 28, h: 28, kind: 'wipe' });
    const wh = hover === 'wipe';
    g.fillStyle = wh ? '#8a2f24' : '#2a1a16'; g.fillRect(PX + 14, dy, PW - 28, 28);
    Art.rect(g, PX + 14, dy, PW - 28, 1, wh ? '#e07a6a' : '#4a3028');
    Art.rect(g, PX + 14, dy + 27, PW - 28, 1, wh ? '#e07a6a' : '#4a3028');
    Art.rect(g, PX + 14, dy, 1, 28, wh ? '#e07a6a' : '#4a3028');
    Art.rect(g, PX + PW - 15, dy, 1, 28, wh ? '#e07a6a' : '#4a3028');
    Font.draw(g, 'RESET ALL DATA', VW / 2, dy + 6, { scale: 1, color: wh ? '#ffd9cf' : '#9a7a70', align: 'center' });
    Font.draw(g, hasSave ? 'ERASES YOUR GROVE AND STARTS OVER' : 'NOTHING SAVED YET', VW / 2, dy + 17, {
      scale: 1, color: wh ? '#e0a89c' : '#6a534c', align: 'center',
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
    const PW = 340, PX = (VW - PW) / 2, PY = 116, PH = 128;
    plaque(g, PX, PY, PW, PH, false, '#3a1a16');
    Font.draw(g, 'ARE YOU SURE?', VW / 2, PY + 14, { scale: 2, color: '#ff9a8a', align: 'center', shadow: '#160c06' });
    const lines = Font.wrap(confirm.text.toUpperCase(), PW - 40, 1);
    lines.forEach((l, i) => Font.draw(g, l, VW / 2, PY + 46 + i * 11, { scale: 1, color: '#efe0c2', align: 'center' }));
    Font.draw(g, 'THIS CANNOT BE UNDONE', VW / 2, PY + 72, { scale: 1, color: '#b08078', align: 'center' });
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
