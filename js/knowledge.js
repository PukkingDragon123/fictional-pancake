// ---- The Tree of Life ------------------------------------------------------
// This is your garden, seen close up. In the middle of the bed sits the seed
// the grove came with. Click it and the first skill goes in for nothing; the
// seed splits, a trunk climbs, and the trunk forks into three branches. Every
// skill you buy after that is a fruit further out along a branch, and the tree
// visibly grows to carry it.
const Knowledge = (() => {
  let G = null;
  const VW = 640, VH = 360;
  const WW = 1500, WH = 900;
  const GROUND = 780, BASE = 750, FORK = 630;
  const COLX = [450, 750, 1050];                 // one column per branch
  const ROWY = [560, 468, 376, 284];             // one row per rank
  const NW = 194, NH = 98;      // the card, shown only for the one you click
  const MED = 54;               // the fruit as it hangs on the branch
  const ZMIN = 0.34, ZMAX = 1.8;
  const CARD = 88, TOP = 42;
  const HH = (VH - CARD - TOP) / 2;      // half the height of the window onto the garden
  const CY = TOP + HH;
  const cam = { x: BASE, y: 516, z: 0.435, tx: BASE, ty: 516, tz: 0.435 };
  let hover = -1, sel = -1, learnHot = false, seedHot = false, zoomHot = '', openT = 1;
  const grow = { t: 0, of: null, kind: '' };     // the growing animation
  const petals = [], flies = [], crumbs = [];
  let garden = null;

  const BRANCH = [
    { name: 'SOIL',  col: '#6ea83e', dark: '#29431c', fruit: ['#c9e06a', '#f2ffb0'], leaf: ['#245018', '#3d7a2a', '#5ba23c', '#8ccb5e'] },
    { name: 'BEAST', col: '#d4813a', dark: '#5a2c10', fruit: ['#d4813a', '#f7c07a'], leaf: ['#1f4a1c', '#376f2c', '#54963d', '#84c05c'] },
    { name: 'RITE',  col: '#9a6fd6', dark: '#3a2260', fruit: ['#9a6fd6', '#d6bcf4'], leaf: ['#1d4426', '#316a36', '#4b9048', '#7cb968'] },
  ];
  // palette of the interface, the same one the panels use
  const OL = '#1c1008';
  const PG0 = '#7d5c3a', PG1 = '#a5825a', PG2 = '#c2a176', PG3 = '#d8bd92', PG4 = '#eddcb6';
  const WD0 = '#2a180c', WD1 = '#4a2c1a', WD2 = '#6b4526', WD3 = '#8a5c33', WD4 = '#ab7a4a';
  const GD0 = '#7a5210', GD1 = '#b8801c', GD2 = '#e0a82e', GD3 = '#f2cf62', GD4 = '#ffeaa8';
  const TL0 = '#173c4a', TL1 = '#2f7a90', TL2 = '#4fa6be', TL3 = '#8fd4e4';
  const AM1 = '#a35418', AM2 = '#cf7a2a', AM3 = '#e8a04a';
  const INK = '#33200f', INK2 = '#5e422a';

  // ---- state --------------------------------------------------------------
  const planted = () => !!G.fruits.sprout;
  const owned = (f) => !!G.fruits[f.key];
  const prereq = (f) => (f.i === 0 ? null : FRUITS.find((x) => x.root === f.root && x.i === f.i - 1));
  const learnedIn = (b) => FRUITS.filter((f) => f.root === b && owned(f)).length;
  function state(f) {
    if (owned(f)) return 'eaten';
    if (!planted()) return 'unplanted';
    const p = prereq(f);
    if (p && !owned(p)) return 'locked';
    if (World.fraction() < f.at) return 'unripe';
    return G.wd >= f.cost ? 'ready' : 'costly';
  }
  function ripeCount() { return planted() ? FRUITS.filter((f) => state(f) === 'ready').length : 1; }

  // the fruit sits on the bough, not in a straight column above the trunk
  function nodeAt(f) {
    const sway = (f.root - 1) * f.i * 13 + (f.root === 1 ? (f.i % 2 ? 20 : -20) : 0);
    return { x: COLX[f.root] + sway, y: ROWY[f.i] };
  }
  const SEED = { x: BASE, y: GROUND - 30 };
  // The spine of a branch: the fork, then each rank, bowing outward as it climbs.
  function spine(b) {
    const pts = [{ x: BASE, y: FORK }];
    for (let i = 0; i < 4; i++) pts.push(nodeAt({ root: b, i }));
    return pts;
  }

  // ---- camera -------------------------------------------------------------
  const wxOf = (s) => (s - VW / 2) / cam.z + cam.x;
  const wyOf = (s) => (s - CY) / cam.z + cam.y;
  function clampCam() {
    const hw = VW / 2 / cam.tz, hh = HH / cam.tz;
    cam.tx = hw * 2 > WW ? WW / 2 : U.clamp(cam.tx, hw, WW - hw);
    const top = 210, bot = GROUND + 40;
    const lo = top + hh - 70, hi = bot - hh + 70;
    cam.ty = lo > hi ? (top + bot) / 2 : U.clamp(cam.ty, lo, hi);
  }
  function zoomAt(mult, px, py) {
    const bx = wxOf(px), by = wyOf(py);
    cam.tz = U.clamp(cam.tz * mult, ZMIN, ZMAX); cam.z = cam.tz;
    cam.tx = bx - (px - VW / 2) / cam.z; cam.ty = by - (py - CY) / cam.z;
    clampCam(); cam.x = cam.tx; cam.y = cam.ty;
  }
  function zoomBy(m) { zoomAt(m, VW / 2, VH / 2); }
  function pan(dx, dy) { cam.tx -= dx / cam.z; cam.ty -= dy / cam.z; clampCam(); cam.x = cam.tx; cam.y = cam.ty; }
  function lookAt(x, y, z) { if (z) cam.tz = U.clamp(z, ZMIN, ZMAX); cam.tx = x; cam.ty = y; clampCam(); }

  function ensure() {
    if (garden) return;
    garden = buildGarden();
    for (let i = 0; i < 26; i++) petals.push({ x: Math.random() * WW, y: Math.random() * WH, ph: Math.random() * TAU, sp: U.rand(8, 22), s: Math.random() < 0.4 ? 3 : 2, c: U.pick(['#ffd9e6', '#fff0b8', '#d8f0a8']) });
    for (let i = 0; i < 7; i++) flies.push({ x: U.rand(120, 780), y: U.rand(300, 500), ph: Math.random() * TAU, sp: U.rand(0.5, 1.1), c: U.pick(['#ffd23f', '#ff8fb0', '#8fc6f2']) });
  }

  function enter() {
    ensure();
    if (!planted()) { sel = -1; lookAt(BASE, GROUND - 110, 0.8); }
    else {
      const t = FRUITS.find((f) => state(f) === 'ready') || FRUITS.find((f) => !owned(f)) || FRUITS[0];
      sel = FRUITS.indexOf(t); openT = 0;
      const a = nodeAt(FRUITS[sel]);
      lookAt(U.lerp(BASE, a.x, 0.45), U.lerp(GROUND - 150, a.y, 0.55), 0.435);
    }
    cam.x = cam.tx; cam.y = cam.ty; cam.z = cam.tz;
    Audio.setMode('pen');
  }

  // ---- planting and learning ---------------------------------------------
  function plant() {
    if (planted() || grow.t > 0) return;
    G.fruits.sprout = true;
    grow.t = 2.2; grow.of = null; grow.kind = 'sprout';
    sel = 0; openT = 0;                        // the first Soil fruit is what you look at next
    lookAt(BASE, 516, 0.435);
    Audio.play('bless');
    UI.toast('The seed takes. Three branches open.', 'good');
    FX.sparkle(VW / 2, VH / 2, 26, GD4);
    FX.confettiBurst(VW / 2, VH * 0.6, 40);
    for (let i = 0; i < 24; i++) crumbs.push({ x: SEED.x, y: SEED.y, vx: U.rand(-70, 70), vy: U.rand(-130, -30), t: 0, c: U.pick([TL3, GD2, '#9ad86a']) });
    UI.refreshAll(); Main.save();
  }
  function buy(f) {
    if (grow.t > 0) return;
    const st = state(f);
    if (st === 'eaten') return;
    if (st === 'unplanted') { Audio.play('error'); UI.toast('plant the seed first', 'bad'); return; }
    if (st === 'locked') { Audio.play('error'); UI.toast('grow the one below it first', 'bad'); return; }
    if (st === 'unripe') { Audio.play('error'); UI.toast(`ripens at ${Math.round(f.at * 100)}% forest`, 'bad'); return; }
    if (st === 'costly') { Audio.play('error'); UI.toast('not enough', 'bad'); return; }
    G.wd -= f.cost;
    G.fruits[f.key] = true;
    grow.t = 1.3; grow.of = f; grow.kind = 'fruit';
    const a = nodeAt(f);
    const B = BRANCH[f.root];
    for (let i = 0; i < 18; i++) crumbs.push({ x: a.x, y: a.y, vx: U.rand(-60, 60), vy: U.rand(-120, -20), t: 0, c: U.pick(B.leaf) });
    Audio.play('bless');
    UI.toast(f.name, 'good');
    FX.sparkle(VW / 2, VH / 2, 16, GD4);
    UI.refreshAll(); Main.save();
  }

  function update(dt) {
    ensure();
    cam.x = U.lerp(cam.x, cam.tx, 1 - Math.pow(0.0015, dt));
    cam.y = U.lerp(cam.y, cam.ty, 1 - Math.pow(0.0015, dt));
    cam.z = U.lerp(cam.z, cam.tz, 1 - Math.pow(0.0015, dt));
    if (grow.t > 0) grow.t = Math.max(0, grow.t - dt);
    openT = Math.min(1, openT + dt * 7);
    for (let i = crumbs.length - 1; i >= 0; i--) {
      const c = crumbs[i];
      c.t += dt; c.vy += 210 * dt; c.x += c.vx * dt; c.y += c.vy * dt;
      if (c.t > 1.5) crumbs.splice(i, 1);
    }
    for (const p of petals) {
      p.x += (p.sp + Math.sin(p.ph + G.time) * 6) * dt;
      p.y += (10 + Math.cos(p.ph * 1.7 + G.time) * 8) * dt;
      if (p.x > WW + 10) p.x = -10;
      if (p.y > WH) { p.y = -8; p.x = Math.random() * WW; }
    }
    for (const b of flies) { b.ph += dt * b.sp; }
  }

  // ---- input --------------------------------------------------------------
  function indexAt(px, py) {
    if (py < TOP) return -1;                             // the bar across the top owns its strip
    const wx = wxOf(px), wy = wyOf(py);
    if (!planted()) return Math.hypot(wx - SEED.x, (wy - SEED.y) * 0.8) < 60 ? -2 : -1;
    if (sel >= 0) {                                      // the open card takes its own area first
      const a = nodeAt(FRUITS[sel]);
      if (Math.abs(wx - a.x) < NW / 2 && wy > a.y - MED / 2 - 8 && wy < a.y - MED / 2 - 8 + NH) return sel;
    }
    for (let i = 0; i < FRUITS.length; i++) {
      const a = nodeAt(FRUITS[i]);
      if (Math.abs(wx - a.x) < MED / 2 + 5 && Math.abs(wy - a.y) < MED / 2 + 5) return i;
    }
    return -1;
  }
  const LEARN = { x: VW - 150, y: VH - 50, w: 134, h: 34 };
  function overLearn(px, py) {
    return px > LEARN.x && px < LEARN.x + LEARN.w && py > LEARN.y && py < LEARN.y + LEARN.h && (sel >= 0 || !planted());
  }
  function zoomAt2(px, py) {
    for (const z of ZBTN) if (px > z.x && px < z.x + z.w && py > z.y && py < z.y + z.h) return z.k;
    return '';
  }
  function click(px, py) {
    const z = zoomAt2(px, py);
    if (z) {
      if (z === 'in') zoomBy(1.3);
      else if (z === 'out') zoomBy(1 / 1.3);
      else { lookAt(BASE, 516, 0.435); cam.x = cam.tx; cam.y = cam.ty; cam.z = cam.tz; }
      Audio.play('click'); return;
    }
    if (overLearn(px, py)) { if (!planted()) plant(); else buy(FRUITS[sel]); return; }
    const i = indexAt(px, py);
    if (i === -2) { plant(); return; }
    if (i < 0) { if (sel >= 0) { sel = -1; openT = 0; Audio.play('click'); } return; }
    if (i === sel) buy(FRUITS[i]);
    else { sel = i; openT = 0; Audio.play('click'); }
  }
  function hoverAt(px, py) {
    zoomHot = zoomAt2(px, py);
    if (zoomHot) { hover = -1; seedHot = false; learnHot = false; return null; }
    const i = indexAt(px, py);
    hover = i >= 0 ? i : -1;
    seedHot = i === -2;
    learnHot = overLearn(px, py);
    return null;
  }
  function scroll(dy, px, py) { zoomAt(dy < 0 ? 1.14 : 1 / 1.14, px ?? VW / 2, py ?? VH / 2); }

  // ---- the garden behind it all -------------------------------------------
  // Painted once: sky, hills, hedge, beds, fence, flowers. It is the grove you
  // are standing in, drawn closer and with more care.
  function buildGarden() {
    const { c, g } = Art.cv(WW, WH);
    // late afternoon: violet at the top, gold along the horizon
    const sky = g.createLinearGradient(0, 0, 0, 700);
    sky.addColorStop(0, '#53306f'); sky.addColorStop(0.28, '#7a4d94');
    sky.addColorStop(0.55, '#c07a8a'); sky.addColorStop(0.78, '#e8a85e'); sky.addColorStop(1, '#f5d58a');
    g.fillStyle = sky; g.fillRect(0, 0, WW, 700);
    for (let r = 5; r >= 1; r--) Art.ell(g, 1216, 210, 26 + r * 16, 26 + r * 16, `rgba(255,214,140,${(0.06 * r / 3).toFixed(3)})`);
    Art.ell(g, 1216, 210, 34, 34, 'rgba(255,236,180,0.5)');
    Art.ell(g, 1216, 210, 23, 23, '#fff3cd');
    const rnd = Art.rng(4242);
    for (let i = 0; i < 11; i++) {
      const cx = 40 + i * 142 + rnd() * 50, cy = 70 + rnd() * 240, s = 0.7 + rnd() * 0.9;
      const puffs = [[-2, 2, 1], [-1, 1, 1.15], [0, 0, 1.3], [1, 1, 1.1], [2, 2, 0.85]];
      for (const [k, d, w] of puffs) Art.ell(g, cx + k * 22 * s, cy + d * 5 * s + 5, 22 * s * w, 13 * s * w, 'rgba(96,58,110,0.55)');
      for (const [k, d, w] of puffs) {
        Art.ell(g, cx + k * 22 * s, cy + d * 5 * s, 21 * s * w, 13 * s * w, '#d9a2a8');
        Art.ell(g, cx + k * 22 * s - 5 * s, cy + d * 5 * s - 5 * s, 12 * s * w, 7 * s * w, '#f7d9ad');
      }
    }
    for (const [hy, col, lit] of [[560, '#6a7f66', '#8a9a72'], [596, '#5c7a52', '#77956a']]) {
      for (let x = -60; x < WW + 60; x += 108) { const r = 92 + rnd() * 40; Art.ell(g, x + rnd() * 50, hy + 26, r, 46, col); Art.ell(g, x + rnd() * 50 - 14, hy + 14, r * 0.5, 18, lit); }
      g.fillStyle = col; g.fillRect(0, hy + 22, WW, 60);
    }
    // a hedge of round trees along the back, each with its own trunk and sun
    for (let i = 0; i < 22; i++) {
      const x = -20 + i * 72 + rnd() * 28, y = 636 - rnd() * 16, s = 0.85 + rnd() * 0.55;
      Art.limb(g, x, y + 22, x - 2, y - 8, 9, 6, '#4a3420');
      Art.limb(g, x - 2, y + 20, x - 4, y - 6, 3.4, 2.4, '#7d5f42');
      Art.ell(g, x, y - 10, 32 * s, 26 * s, '#1f3f24');
      Art.ell(g, x - 4, y - 15, 27 * s, 22 * s, '#356037');
      Art.ell(g, x - 9, y - 21, 16 * s, 12 * s, '#57874a');
      Art.ell(g, x - 13, y - 25, 8 * s, 6 * s, '#8fae5e');
      Art.speckle(g, x - 5, y - 17, 20 * s, 14 * s, '#a8b968', 26, i * 31 + 7);
      Art.speckle(g, x + 5, y - 3, 20 * s, 12 * s, '#182e1c', 18, i * 17 + 3);
    }
    // the garden floor
    g.fillStyle = '#44703a'; g.fillRect(0, 650, WW, WH - 650);
    for (let i = 0; i < 6200; i++) {
      const x = rnd() * WW, y = 650 + rnd() * (WH - 650);
      const k = (y - 650) / (WH - 650);
      Art.rect(g, x, y, 2, 2, rnd() < 0.5 - k * 0.25 ? '#5d8f45' : rnd() < 0.5 ? '#33582c' : '#84a95a');
    }
    // tilled rows running away behind the plot, then the plot itself
    for (let r = 0; r < 3; r++) {
      const y = 700 + r * 28, w = 400 + r * 92;
      Art.ell(g, BASE, y + 6, w / 2, 15, '#4a3018');
      Art.ell(g, BASE, y + 1, w / 2 - 6, 13, '#7a5530');
      Art.ell(g, BASE, y - 4, w / 2 - 26, 7, '#a3763f');
      for (let i = 0; i < 70; i++) Art.rect(g, BASE - w / 2 + rnd() * w, y - 6 + rnd() * 16, 2, 2, '#3d2814');
      for (let i = 0; i < 14; i++) { const gx = BASE - w / 2 + rnd() * w; for (let k = -1; k <= 1; k++) Art.limb(g, gx + k * 2, y - 6, gx + k * 4, y - 14, 2, 1, '#4d8a37'); }
    }
    Art.ell(g, BASE, GROUND + 10, 150, 26, '#5a3c20');
    Art.ell(g, BASE, GROUND + 5, 147, 25, '#6b4a28');
    Art.ell(g, BASE, GROUND - 2, 138, 22, '#8a6134');
    Art.ell(g, BASE - 10, GROUND - 9, 104, 14, '#a3763f');
    Art.ell(g, BASE - 26, GROUND - 13, 58, 7, '#c08a45');
    Art.speckle(g, BASE, GROUND + 2, 140, 22, '#3d2814', 320, 99);
    Art.speckle(g, BASE - 14, GROUND - 8, 96, 11, '#c9955a', 110, 13);
    // flowers and clover through the grass, but not on the plot
    const FL = [['#f6f6f6', '#ffd23f'], ['#ff8fb0', '#fff0b8'], ['#b394e8', '#fff0b8'], ['#ffd23f', '#c07f32'], ['#8fc6f2', '#fff0b8']];
    for (let i = 0; i < 190; i++) {
      const x = rnd() * WW, y = 658 + rnd() * (WH - 700);
      if (Math.abs(x - BASE) < 190 && y > 662) continue;
      const [pc, cc] = FL[Math.floor(rnd() * FL.length)];
      Art.rect(g, x, y, 1, 7, '#3f7a2c');
      for (let k = 0; k < 5; k++) { const a = (k / 5) * TAU; Art.rect(g, x + Math.cos(a) * 2.4, y - 3 + Math.sin(a) * 2.4, 2, 2, pc); }
      Art.rect(g, x, y - 3, 1.8, 1.8, cc);
    }
    for (let i = 0; i < 80; i++) {                       // tufts of longer grass
      const x = rnd() * WW, y = 664 + rnd() * (WH - 710);
      for (let k = -2; k <= 2; k++) Art.limb(g, x + k * 2, y, x + k * 4, y - 8 - Math.abs(k), 2, 1, k % 2 ? '#3f7a2c' : '#66a845');
    }
    // a picket fence along the very front
    for (let x = 6; x < WW; x += 30) {                      // a dark wood fence, like the panels
      Art.poly(g, [[x, 846], [x + 15, 846], [x + 15, 886], [x + 7.5, 896], [x, 886]], '#6b4526');
      Art.rect(g, x, 846, 5, 46, '#8a5c33');
      Art.rect(g, x + 11, 846, 4, 46, '#3d2413');
      Art.rect(g, x, 846, 15, 2, '#ab7a4a');
    }
    Art.rect(g, 0, 856, WW, 7, '#4a2c1a'); Art.rect(g, 0, 856, WW, 2, '#8a5c33');
    return c;
  }

  // ---- interface pieces, the same recipe as the panels --------------------
  // A page: parchment inside a dark wood cover, with teal brackets at the
  // corners. The same recipe as every panel in the interface.
  function frame9(g, X, Y, w, h, page) {
    X = Math.round(X); Y = Math.round(Y); w = Math.round(w); h = Math.round(h);
    g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(X + 4, Y + 7, w, h);
    g.fillStyle = OL; g.fillRect(X - 3, Y - 3, w + 6, h + 6);
    g.fillStyle = WD1; g.fillRect(X, Y, w, h);
    g.fillStyle = WD3; g.fillRect(X + 1, Y + 1, w - 2, 2);
    g.fillStyle = WD0; g.fillRect(X + 1, Y + h - 3, w - 2, 2);
    Tex.fill(g, 'darkwood', X, Y, w, h, 0.55);
    g.fillStyle = WD2; g.fillRect(X + 4, Y + 4, w - 8, h - 8);
    g.fillStyle = page || PG2; g.fillRect(X + 6, Y + 6, w - 12, h - 12);
    Tex.fill(g, 'paper', X + 6, Y + 6, w - 12, h - 12, 0.55);
    g.fillStyle = PG3; g.fillRect(X + 6, Y + 6, w - 12, 2);
    g.fillStyle = PG1; g.fillRect(X + 6, Y + h - 9, w - 12, 3);
    bracket(g, X, Y, w, h);
  }
  // the four teal corner brackets
  function bracket(g, X, Y, w, h, L, T) {
    L = L || 13; T = T || 5;
    const put = (x, y, bw, bh) => {
      g.fillStyle = OL; g.fillRect(x - 1, y - 1, bw + 2, bh + 2);
      g.fillStyle = TL1; g.fillRect(x, y, bw, bh);
      g.fillStyle = TL2; g.fillRect(x, y, bw, Math.max(1, Math.round(bh * 0.62)));
      g.fillStyle = TL3; g.fillRect(x, y, bw, 1);
    };
    for (const sx of [0, 1]) for (const sy of [0, 1]) {
      const bx = sx ? X + w - L : X, by = sy ? Y + h - T : Y;
      put(bx, by, L, T);
      put(sx ? X + w - T : X, sy ? Y + h - L : Y, T, L);
    }
  }
  function slot(g, X, Y, s) {
    X = Math.round(X); Y = Math.round(Y);
    g.fillStyle = OL; g.fillRect(X - 3, Y - 3, s + 6, s + 6);
    g.fillStyle = '#442c18'; g.fillRect(X, Y, s, s);
    g.fillStyle = '#5d3d22'; g.fillRect(X, Y, s, Math.round(s * 0.5));
    g.fillStyle = '#6b4728'; g.fillRect(X, Y, s, 2);
    Tex.fill(g, 'cellwood', X, Y, s, s, 0.6);
    g.fillStyle = '#2f1d0f'; g.fillRect(X, Y + s - 3, s, 3);
    for (const [cx, cy] of [[X, Y], [X + s - 4, Y], [X, Y + s - 4], [X + s - 4, Y + s - 4]]) {
      g.fillStyle = GD1; g.fillRect(cx, cy, 4, 4);
      g.fillStyle = GD3; g.fillRect(cx, cy, 4, 2);
    }
  }
  function goldButton(g, X, Y, w, h, label, on, tone) {
    X = Math.round(X); Y = Math.round(Y);
    const T = tone === 'green' ? ['#a8d878', '#6ea83e', '#44762a', '#2a4d18', '#1d3a10']
      : tone === 'dead' ? ['#a89680', '#8a7862', '#6a5b48', '#40362a', '#453a2c']
      : tone === 'amber' ? [AM3, AM2, AM1, '#6d320e', '#fff2e0']
      : [GD3, GD2, GD1, GD0, '#3d2606'];
    const d = on ? 3 : 0;
    g.fillStyle = OL; g.fillRect(X - 3, Y - 3 + d, w + 6, h + 6 + (5 - d));
    g.fillStyle = T[3]; g.fillRect(X, Y + h + d, w, 5 - d);
    g.fillStyle = T[2]; g.fillRect(X, Y + d, w, h);
    g.fillStyle = T[1]; g.fillRect(X, Y + d, w, Math.round(h * 0.64));
    g.fillStyle = T[0]; g.fillRect(X, Y + d, w, Math.round(h * 0.26));
    Tex.fill(g, tone === 'green' ? 'metal' : tone === 'dead' ? 'slate' : tone === 'amber' ? 'amber' : 'gold', X, Y + d, w, h, 0.24);
    g.fillStyle = 'rgba(255,246,210,0.55)'; g.fillRect(X + 2, Y + 2 + d, w - 4, 1);
    g.fillStyle = 'rgba(0,0,0,0.2)'; g.fillRect(X + 2, Y + h - 3 + d, w - 4, 1);
    if (label) FX.pixelText(g, label, X + w / 2, Y + d + Math.round(h / 2) - 5, { color: T[4], size: 10, ink: false });
  }
  // a wooden plank capped in teal, for every heading
  function banner(g, X, Y, w, h, label) {
    X = Math.round(X); Y = Math.round(Y);
    g.fillStyle = 'rgba(0,0,0,0.4)'; g.fillRect(X + 3, Y + 6, w, h);
    g.fillStyle = OL; g.fillRect(X - 3, Y - 3, w + 6, h + 6);
    g.fillStyle = WD0; g.fillRect(X, Y, w, h);
    g.fillStyle = WD1; g.fillRect(X, Y, w, Math.round(h * 0.84));
    g.fillStyle = WD2; g.fillRect(X, Y, w, Math.round(h * 0.52));
    g.fillStyle = WD3; g.fillRect(X, Y, w, Math.round(h * 0.17));
    Tex.fill(g, 'wood', X, Y, w, h, 0.55);
    for (const bx of [X - 11, X + w - 6]) {                // the teal end caps
      g.fillStyle = OL; g.fillRect(bx - 3, Y - 8, 23, h + 16);
      g.fillStyle = TL1; g.fillRect(bx, Y - 5, 17, h + 10);
      g.fillStyle = TL2; g.fillRect(bx, Y - 5, 17, Math.round((h + 10) * 0.5));
      g.fillStyle = TL3; g.fillRect(bx, Y - 5, 17, 3);
      Tex.fill(g, 'metal', bx, Y - 5, 17, h + 10, 0.4);
      g.fillStyle = GD2; g.fillRect(bx + 7, Y - 1, 3, 3); g.fillRect(bx + 7, Y + h + 2, 3, 3);   // rivets
      g.fillStyle = GD4; g.fillRect(bx + 7, Y - 1, 3, 1); g.fillRect(bx + 7, Y + h + 2, 3, 1);
    }
    if (label) FX.pixelText(g, label, X + w / 2, Y + Math.round(h / 2) - 6, { color: '#f6e4bb', size: 11, ink: 2, inkColor: 'rgba(0,0,0,0.6)' });
  }

  // ---- the tree ------------------------------------------------------------
  // A quadratic sweep between two ranks, so branches bow instead of zig-zag.
  function bough(g, p0, p1, w0, w1, col, lit, bend) {
    const mx = (p0.x + p1.x) / 2 + bend, my = (p0.y + p1.y) / 2;
    const N = 9;
    let px = p0.x, py = p0.y;
    for (let i = 1; i <= N; i++) {
      const t = i / N, u = 1 - t;
      const x = u * u * p0.x + 2 * u * t * mx + t * t * p1.x;
      const y = u * u * p0.y + 2 * u * t * my + t * t * p1.y;
      const wa = U.lerp(w0, w1, (i - 1) / N), wb = U.lerp(w0, w1, t);
      Art.limb(g, px, py, x, y, wa, wb, col);
      if (lit) Art.limb(g, px - wa * 0.26, py, x - wb * 0.24, y, wa * 0.3, wb * 0.28, lit);
      px = x; py = y;
    }
    return { x: px, y: py };
  }
  // One wide canopy, not a chain of beads: a shadow mass, a body, sun on the
  // crown, loose leaves at the edge, and the branch's own fruit hanging in it.
  function puff(g, x, y, r, L, seed, fruit) {
    const rnd = Art.rng(seed | 0);
    const lobes = [];
    for (let i = 0; i < 7; i++) {
      const a = Math.PI + (i / 6) * Math.PI;
      lobes.push({ x: x + Math.cos(a) * r * 0.62, y: y + Math.sin(a) * r * 0.4 * 0.9 + r * 0.06, r: r * (0.34 + rnd() * 0.12) });
    }
    lobes.push({ x, y, r: r * 0.5 });
    for (const p of lobes) Art.ell(g, p.x, p.y + r * 0.1, p.r * 1.06, p.r * 0.82, L[0]);
    for (const p of lobes) Art.ell(g, p.x, p.y, p.r, p.r * 0.78, L[1]);
    for (const p of lobes) Art.ell(g, p.x - p.r * 0.2, p.y - p.r * 0.2, p.r * 0.7, p.r * 0.5, L[2]);
    for (const p of lobes) {
      Art.ell(g, p.x - p.r * 0.34, p.y - p.r * 0.36, p.r * 0.38, p.r * 0.26, L[3]);
      Art.speckle(g, p.x - p.r * 0.2, p.y - p.r * 0.24, p.r * 0.56, p.r * 0.4, L[3], Math.round(p.r * 0.5), Math.floor(p.x * 7 + p.y));
      Art.speckle(g, p.x, p.y + p.r * 0.38, p.r * 0.7, p.r * 0.28, L[0], Math.round(p.r * 0.4), Math.floor(p.y * 11 + p.x));
    }
    for (let i = 0; i < 14; i++) {                       // leaves shaken loose at the edge
      const a = Math.PI + rnd() * Math.PI;
      Art.ell(g, x + Math.cos(a) * r * (0.9 + rnd() * 0.22), y + Math.sin(a) * r * 0.5 * (0.9 + rnd() * 0.3), 4, 3, rnd() < 0.5 ? L[2] : L[1]);
    }
    if (fruit) for (let i = 0; i < 9; i++) {             // the branch's fruit
      const fx = x + (rnd() - 0.5) * r * 1.5, fy = y + (rnd() - 0.2) * r * 0.62;
      Art.rect(g, fx, fy - 5, 1.4, 5, L[0]);
      Art.ell(g, fx, fy + 1, 5, 5, fruit[0]);
      Art.ell(g, fx - 1.6, fy - 0.6, 2, 1.6, fruit[1]);
    }
  }
  function drawTree(g, t) {
    const wob = Math.sin(t * 0.9) * 2.2;
    const sprout = grow.kind === 'sprout' ? U.clamp(1 - grow.t / 2.2, 0, 1) : planted() ? 1 : 0;
    if (sprout > 0) {                                     // roots pushing out of the mound
      for (let i = -3; i <= 3; i++) {
        if (!i) continue;
        Art.limb(g, BASE + i * 7, GROUND - 16, BASE + i * (30 + Math.abs(i) * 10), GROUND + 8, 13, 3, '#4a3420');
        Art.limb(g, BASE + i * 7, GROUND - 18, BASE + i * (27 + Math.abs(i) * 9), GROUND + 3, 6, 2, '#7d5f42');
      }
    }
    if (!planted() && grow.kind !== 'sprout') { drawSeed(g, t); return; }
    const learned = FRUITS.filter(owned).length;
    const w0 = (58 + learned * 3.4) * sprout, w1 = (38 + learned * 2.4) * sprout;
    const top = U.lerp(GROUND, FORK, U.easeOut(sprout));
    Art.limb(g, BASE, GROUND, BASE + wob * 0.4, top, w0, w1, '#4a3420');
    Art.limb(g, BASE - w0 * 0.24, GROUND, BASE - w1 * 0.22 + wob * 0.4, top, w0 * 0.38, w1 * 0.34, '#7d5f42');
    Art.limb(g, BASE + w0 * 0.3, GROUND, BASE + w1 * 0.28 + wob * 0.4, top, w0 * 0.24, w1 * 0.22, '#2e2013');
    for (let i = 0; i < 6; i++) {                          // bark ridges
      const k = 0.12 + i * 0.15, y = U.lerp(GROUND, top, k);
      Art.rect(g, BASE - 14 + (i % 2) * 22, y, 4, 18 * sprout, '#3a2a18');
    }
    Art.ell(g, BASE - 13, U.lerp(GROUND, top, 0.55), 11, 8, '#2e2013');   // a knot
    Art.ell(g, BASE - 13, U.lerp(GROUND, top, 0.55), 7, 5, '#5a4128');
    if (sprout < 1) { drawSeed(g, t, 1 - sprout); return; }

    // the bark first, all of it, so the tree reads before the leaves land
    const ends = [];
    for (let b = 0; b < 3; b++) {
      const reach = learnedIn(b);
      const pts = spine(b);
      let p = { x: pts[0].x + wob * 0.3, y: pts[0].y };
      const path = [p];
      for (let i = 0; i < 4; i++) {
        const nx = pts[i + 1].x + wob * (0.4 + i * 0.3), ny = pts[i + 1].y;
        const live = i < reach, next = i === reach;
        const tw = live ? 36 - i * 5.6 : next ? 17 - i * 2.2 : 6 - i * 0.8;
        const bend = (b - 1) * (i === 0 ? 62 : 20) + (b === 1 ? (i % 2 ? 30 : -30) : 0);
        g.globalAlpha = live ? 1 : next ? 0.95 : 0.55;
        bough(g, p, { x: nx, y: ny }, tw + 4, tw * 0.78 + 4, '#241a0f', null, bend);
        bough(g, p, { x: nx, y: ny }, tw, tw * 0.78, live ? '#4a3420' : next ? '#5a442c' : '#4a3a2a', live ? '#7d5f42' : next ? '#7d5f42' : '#6a5238', bend);
        if (next) for (let k = 0; k < 3; k++) {           // bare twigs, waiting for a fruit
          const q = (k + 1) / 4, sx2 = U.lerp(p.x, nx, q) + bend * 0.4 * Math.sin(q * Math.PI), sy2 = U.lerp(p.y, ny, q);
          Art.limb(g, sx2, sy2, sx2 + (k % 2 ? 13 : -13), sy2 - 9, 3, 1, '#4a3a2a');
        }
        if (!live && !next) chain(g, p.x, p.y, nx, ny, bend);   // a rank you have not opened yet
        g.globalAlpha = 1;
        p = { x: nx, y: ny }; path.push(p);
      }
      ends.push({ b, reach, path });
    }
    // then the leaves, one broad canopy for every fruit that has come in
    for (const e of ends) {
      const L = BRANCH[e.b].leaf, F = BRANCH[e.b].fruit;
      for (let i = 0; i < e.reach; i++) {
        const f = FRUITS.find((x) => x.root === e.b && x.i === i);
        const n = e.path[i + 1];
        const pop = (grow.kind === 'fruit' && grow.of === f) ? 1 + Math.sin(U.clamp(1 - grow.t / 1.3, 0, 1) * Math.PI) * 0.32 : 1;
        puff(g, n.x + (e.b - 1) * 26, n.y - 6, 126 * pop, L, e.b * 71 + i * 13 + 5, F);
      }
      if (e.reach >= 4) puff(g, e.path[4].x + (e.b - 1) * 30, e.path[4].y - 84, 112, L, e.b * 97 + 3, F);
      // a slimmer pass of bark over the leaves, so the branch still reads
      for (let i = 0; i < e.reach; i++) {
        const bend = (e.b - 1) * (i === 0 ? 62 : 20) + (e.b === 1 ? (i % 2 ? 30 : -30) : 0);
        const tw = (36 - i * 5.6) * 0.52;
        bough(g, e.path[i], e.path[i + 1], tw + 4, tw * 0.78 + 4, '#241a0f', null, bend);
        bough(g, e.path[i], e.path[i + 1], tw, tw * 0.78, '#4a3420', '#7d5f42', bend);
      }
    }
  }

  // A run of teal links between two ranks: the lock you can see from anywhere.
  function chain(g, x0, y0, x1, y1, bend) {
    const mx = (x0 + x1) / 2 + bend, my = (y0 + y1) / 2;
    const N = Math.max(4, Math.round(Math.hypot(x1 - x0, y1 - y0) / 17));
    for (let i = 0; i <= N; i++) {
      const q = i / N, u = 1 - q;
      const x = u * u * x0 + 2 * u * q * mx + q * q * x1;
      const y = u * u * y0 + 2 * u * q * my + q * q * y1;
      const flat = i % 2 === 0;
      const w = flat ? 13 : 8, h = flat ? 9 : 14;
      g.fillStyle = OL; g.fillRect(Math.round(x - w / 2) - 1, Math.round(y - h / 2) - 1, w + 2, h + 2);
      g.fillStyle = TL1; g.fillRect(Math.round(x - w / 2), Math.round(y - h / 2), w, h);
      g.fillStyle = TL2; g.fillRect(Math.round(x - w / 2), Math.round(y - h / 2), w, Math.round(h * 0.45));
      g.fillStyle = TL3; g.fillRect(Math.round(x - w / 2) + 1, Math.round(y - h / 2) + 1, w - 2, 1);
      g.fillStyle = '#2a180c'; g.fillRect(Math.round(x - w / 2) + 3, Math.round(y - h / 2) + 3, w - 6, h - 6);
    }
  }
  function drawSeed(g, t, alpha) {
    const pulse = 0.5 + 0.5 * Math.sin(t * 2.6);
    g.globalAlpha = alpha ?? 1;
    const y = SEED.y + Math.sin(t * 1.6) * 3;
    g.fillStyle = 'rgba(40,26,12,0.35)';
    Art.poly(g, [[SEED.x - 22, GROUND + 2], [SEED.x + 22, GROUND + 2], [SEED.x + 46, GROUND + 12], [SEED.x + 2, GROUND + 12]], g.fillStyle);
    for (let r = 3; r >= 1; r--) {                          // a square halo, turning
      const R = 26 + r * 13 + pulse * 8, a = t * 0.5 + r;
      const p4 = [];
      for (let i = 0; i < 4; i++) { const q = a + i * Math.PI / 2; p4.push([SEED.x + Math.cos(q) * R, y + Math.sin(q) * R * 1.1]); }
      Art.poly(g, p4, `rgba(245,205,92,${(0.05 + pulse * 0.05).toFixed(3)})`);
    }
    Art.ell(g, SEED.x, y, 22, 28, '#3a2a18');
    Art.ell(g, SEED.x, y, 20, 26, '#8a6134');
    Art.ell(g, SEED.x - 4, y - 5, 13, 16, '#c58f47');
    Art.ell(g, SEED.x - 7, y - 11, 6, 8, '#e9bd78');
    Art.ell(g, SEED.x + 8, y + 8, 6, 8, '#5a3c20');
    for (let i = -2; i <= 2; i++) Art.limb(g, SEED.x + i * 3, y + 14, SEED.x + i * 6, y - 16, 2.4, 1.2, '#6b4a2a');
    Art.rect(g, SEED.x - 2, y - 28, 4, 11, '#3f7a2c');     // the first shoot
    Art.ell(g, SEED.x - 9, y - 31, 8, 4.4, '#69b845'); Art.ell(g, SEED.x + 9, y - 35, 8, 4.4, '#9ad86a');
    Art.ell(g, SEED.x - 11, y - 32, 3.4, 2, '#c2ed8f');
    for (let i = 0; i < 9; i++) {                          // golden motes rising off it
      const a = t * 0.8 + i * 0.7;
      Art.rect(g, SEED.x + Math.cos(a) * 32, y - 22 - ((t * 26 + i * 11) % 62), 3, 3, i % 2 ? GD4 : GD2);
    }
    g.globalAlpha = 1;
  }

  // ---- drawing ------------------------------------------------------------
  function render(g) {
    ensure();
    const t = G.time;
    g.fillStyle = '#9fd6e4'; g.fillRect(0, 0, VW, VH);
    g.save();
    g.translate(VW / 2, CY); g.scale(cam.z, cam.z); g.translate(-cam.x, -cam.y);
    g.drawImage(garden, 0, 0);
    drawTree(g, t);
    for (const b of flies) {                              // butterflies over the beds
      const x = b.x + Math.sin(b.ph) * 34, y = b.y + Math.cos(b.ph * 1.6) * 16;
      const flap = Math.sin(b.ph * 9) * 2.4;
      Art.rect(g, x - 1, y - 1, 2, 3, '#3a2612');
      Art.ell(g, x - 3, y - 1 - flap * 0.3, 3, 2 + flap * 0.4, b.c);
      Art.ell(g, x + 3, y - 1 - flap * 0.3, 3, 2 + flap * 0.4, b.c);
    }
    for (const p of petals) { g.fillStyle = p.c; g.fillRect(Math.round(p.x), Math.round(p.y), p.s, p.s); }
    if (!planted()) drawSeedCallout(g, t);
    else { FRUITS.forEach((f, i) => drawNode(g, f, i, t)); drawCard(g, t); }
    for (const c of crumbs) { g.fillStyle = c.c; g.fillRect(Math.round(c.x), Math.round(c.y), 3, 3); }
    g.restore();
    g.save();                                              // the same grade the grove wears
    g.globalCompositeOperation = 'soft-light';
    g.fillStyle = '#7a4d94'; g.globalAlpha = 0.22; g.fillRect(0, 0, VW, VH - CARD);
    g.restore();
    const vg = g.createRadialGradient(VW / 2, CY, VH * 0.36, VW / 2, CY, VH * 1.05);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(28,14,40,0.5)');
    g.fillStyle = vg; g.fillRect(0, 0, VW, VH - CARD);
    header(g, t);
    detail(g, t);
    FX.drawParticles(g, 0);
    FX.drawConfetti(g);
    FX.drawFloaters(g, false);
  }

  function drawSeedCallout(g, t) {
    const bob = Math.sin(t * 3) * 3;
    const pulse = 0.5 + 0.5 * Math.sin(t * 4);
    // a ring of light around the seed, which is itself the button
    g.fillStyle = `rgba(255,244,200,${(0.1 + pulse * 0.14 + (seedHot ? 0.16 : 0)).toFixed(2)})`;
    g.fillRect(Math.round(SEED.x - 44 - pulse * 5), Math.round(SEED.y - 50 - pulse * 5), Math.round(88 + pulse * 10), Math.round(100 + pulse * 10));
    const w = 214, h = 36, X = SEED.x - w / 2, Y = SEED.y - 148 + bob;
    banner(g, X, Y, w, h, 'PLANT  ME  FREE');
    g.fillStyle = OL;                                      // the tail of the callout
    g.fillRect(SEED.x - 5, Y + h + 3, 10, 10); g.fillRect(SEED.x - 3, Y + h + 13, 6, 6);
    for (let i = 0; i < 3; i++) {                          // an arrow tapping down at it
      const k = (t * 1.6 + i * 0.33) % 1;
      g.fillStyle = `rgba(245,205,92,${(0.9 - k).toFixed(2)})`;
      const ay = SEED.y - 96 + k * 24;
      g.fillRect(Math.round(SEED.x - 7), Math.round(ay), 14, 5);
      g.fillRect(Math.round(SEED.x - 4), Math.round(ay + 5), 8, 4);
      g.fillRect(Math.round(SEED.x - 1), Math.round(ay + 9), 2, 4);
    }
  }

  // On the branch a skill is just its fruit in a little frame. Click one and
  // its card opens above it; click the ground and the card closes again.
  function drawNode(g, f, i, t) {
    const a = nodeAt(f), st = state(f);
    const B = BRANCH[f.root];
    const pulse = 0.5 + 0.5 * Math.sin(t * 3 + i);
    const dim = st === 'locked' || st === 'unripe';
    const hot = hover === i;
    const grown = st === 'eaten';
    const lift = hot ? 2 : 0;
    const mx = Math.round(a.x - MED / 2), my = Math.round(a.y - MED / 2) - lift;

    if (st === 'ready') {                                 // a halo you can see from across the tree
      g.fillStyle = `rgba(245,205,92,${(0.14 + pulse * 0.22).toFixed(2)})`;
      g.fillRect(mx - 9, my - 9, MED + 18, MED + 18);
    }
    // the stem it hangs from
    g.fillStyle = '#241a0f'; g.fillRect(Math.round(a.x) - 3, my - 9, 6, 10);
    g.fillStyle = grown ? '#7d5f42' : '#5a442c'; g.fillRect(Math.round(a.x) - 2, my - 9, 4, 9);

    g.globalAlpha = dim ? 0.78 : 1;
    // the frame: wood for a fruit still to come, gold once it is grown
    g.fillStyle = OL; g.fillRect(mx - 4, my - 4, MED + 8, MED + 8);
    g.fillStyle = grown ? GD1 : WD1; g.fillRect(mx - 2, my - 2, MED + 4, MED + 4);
    g.fillStyle = grown ? GD3 : WD3; g.fillRect(mx - 2, my - 2, MED + 4, 2);
    g.fillStyle = grown ? GD0 : WD0; g.fillRect(mx - 2, my + MED, MED + 4, 2);
    slot(g, mx, my, MED);
    g.globalAlpha = dim ? 0.4 : 1;
    Icons.blit(g, f.icon, mx + 6, my + 6, 2.6);
    g.globalAlpha = dim ? 0.78 : 1;
    // the branch's colour, as a bar along the foot
    g.fillStyle = B.col; g.fillRect(mx + 4, my + MED - 5, MED - 8, 3);
    // one badge in the corner says where it stands
    const bx = mx + MED - 13, by = my + MED - 13;
    if (grown) {
      g.fillStyle = OL; g.fillRect(bx - 3, by - 3, 20, 20);
      g.fillStyle = '#3f6b1c'; g.fillRect(bx - 1, by - 1, 16, 16);
      Icons.blit(g, 'check', bx - 1, by - 1, 1);
    } else if (st === 'locked') {
      g.fillStyle = OL; g.fillRect(bx - 3, by - 3, 20, 20);
      g.fillStyle = '#4a3218'; g.fillRect(bx - 1, by - 1, 16, 16);
      Icons.blit(g, 'lock', bx, by, 0.9);
    } else if (st === 'unripe') {
      g.fillStyle = OL; g.fillRect(mx + 2, my + MED - 12, MED - 4, 10);
      FX.pixelText(g, `${Math.round(f.at * 100)}%`, mx + MED / 2, my + MED - 12, { color: '#c2a176', size: 11, ink: false });
    } else {
      g.fillStyle = OL; g.fillRect(mx + 2, my + MED - 12, MED - 4, 10);
      FX.pixelText(g, String(f.cost), mx + MED / 2, my + MED - 12, { color: st === 'costly' ? '#e0705a' : GD3, size: 11, ink: false });
    }
    g.globalAlpha = 1;
    if (hot && sel !== i) {                               // a name tag while the pointer is over it
      const w = Math.max(52, f.name.length * 7 + 12);
      g.fillStyle = 'rgba(20,12,8,0.86)'; g.fillRect(Math.round(a.x - w / 2), my + MED + 6, w, 16);
      g.fillStyle = B.col; g.fillRect(Math.round(a.x - w / 2), my + MED + 6, w, 2);
      FX.pixelText(g, f.name.toUpperCase(), a.x, my + MED + 8, { color: '#efdcb4', size: 12, ink: false });
    }
  }

  // the card, drawn last so it sits over its neighbours
  function drawCard(g, t) {
    if (sel < 0) return;
    const f = FRUITS[sel], a = nodeAt(f), st = state(f), B = BRANCH[f.root];
    const k = U.easeOut(openT);
    const W2 = Math.round(NW * k), H2 = Math.round(NH * k);
    const X = Math.round(a.x - W2 / 2), Y = Math.round(a.y - MED / 2 - 8 - H2 + NH * (1 - k) * 0.5);
    if (k < 0.35) return;
    g.save(); g.globalAlpha = Math.min(1, k * 1.6);
    frame9(g, X, Y, W2, H2, PG2);
    // the gold edge that says this is the open one
    g.fillStyle = GD3;
    g.fillRect(X - 5, Y - 5, W2 + 10, 3); g.fillRect(X - 5, Y + H2 + 2, W2 + 10, 3);
    g.fillRect(X - 5, Y - 5, 3, H2 + 10); g.fillRect(X + W2 + 2, Y - 5, 3, H2 + 10);
    // a foot pointing down at the fruit
    g.fillStyle = OL; g.fillRect(Math.round(a.x) - 6, Y + H2 + 2, 12, 8);
    g.fillStyle = WD2; g.fillRect(Math.round(a.x) - 4, Y + H2 + 2, 8, 6);
    if (k > 0.92) {
      g.fillStyle = B.col; g.fillRect(X + 8, Y + 8, 5, H2 - 16);
      g.fillStyle = B.dark; g.fillRect(X + 8, Y + H2 - 11, 5, 3);
      const tx = X + 21;
      FX.pixelText(g, f.name.toUpperCase(), tx, Y + 9, { color: INK, size: 15, align: 'left', ink: false });
      FX.pixelText(g, `${B.name} / RANK ${f.i + 1} OF 4`, tx, Y + 28, { color: '#6b3d12', size: 11, align: 'left', ink: false });
      // the effect, wrapped to the card
      g.save(); g.font = '600 11px "Fredoka", sans-serif';
      const room = W2 - 34, words = f.desc.split(' '), lines = [];
      let ln = '';
      for (const w of words) {
        const test = ln ? ln + ' ' + w : w;
        if (g.measureText(test).width > room && ln) { lines.push(ln); ln = w; } else ln = test;
      }
      if (ln) lines.push(ln);
      g.restore();
      lines.slice(0, 2).forEach((l, li) => FX.pixelText(g, l, tx, Y + 44 + li * 14, { color: INK2, size: 11, align: 'left', ink: false }));
      // the foot of the card: what it costs, or why you cannot have it
      const ok = st === 'ready';
      const label = st === 'eaten' ? 'GROWN' : st === 'locked' ? 'GROW THE RANK BELOW FIRST'
        : st === 'unripe' ? `RIPENS AT ${Math.round(f.at * 100)}% FOREST` : st === 'costly' ? 'NOT ENOUGH COIN' : 'CLICK AGAIN TO GROW IT';
      const col = st === 'eaten' ? '#3f6b1c' : ok ? '#8a5410' : '#9a2a1a';
      g.fillStyle = 'rgba(125,92,58,0.3)'; g.fillRect(X + 16, Y + 74, W2 - 32, 1);
      if (st === 'ready' || st === 'costly') {
        Icons.blit(g, 'wdollar', tx - 2, Y + 78, 1.1);
        FX.pixelText(g, String(f.cost), tx + 20, Y + 80, { color: ok ? '#8a5410' : '#9a2a1a', size: 13, align: 'left', ink: false });
        FX.pixelText(g, label, X + W2 - 14, Y + 81, { color: col, size: 11, align: 'right', ink: false });
      } else {
        FX.pixelText(g, label, tx, Y + 80, { color: col, size: 11, align: 'left', ink: false });
      }
    }
    g.restore();
  }

  // ---- the header: what this place is, and how far along you are ----------
  const ZBTN = [
    { k: 'out', x: VW - 106, y: 8, w: 28, h: 26, s: '-' },
    { k: 'fit', x: VW - 74, y: 8, w: 28, h: 26, s: 'o' },
    { k: 'in', x: VW - 42, y: 8, w: 28, h: 26, s: '+' },
  ];
  function header(g, t) {
    const learned = FRUITS.filter(owned).length;
    // one wooden strip across the top, so nothing hides behind a floating panel
    g.fillStyle = WD1; g.fillRect(0, 0, VW, TOP);
    Tex.fill(g, 'wood', 0, 0, VW, TOP, 0.55);
    g.fillStyle = 'rgba(255,220,160,0.28)'; g.fillRect(0, 0, VW, 4);
    g.fillStyle = WD0; g.fillRect(0, TOP - 5, VW, 5);
    g.fillStyle = OL; g.fillRect(0, TOP - 2, VW, 2);
    FX.pixelText(g, planted() ? 'TREE OF LIFE' : 'THE FIRST SEED', 14, 12, { color: '#f6e4bb', size: 17, align: 'left', ink: 2, inkColor: 'rgba(0,0,0,0.7)' });
    // three branch meters in a row
    for (let b = 0; b < 3; b++) {
      const x = 172 + b * 106, n = learnedIn(b), B = BRANCH[b];
      g.fillStyle = OL; g.fillRect(x - 2, 9, 98, 24);
      g.fillStyle = '#2a180c'; g.fillRect(x, 11, 94, 20);
      g.fillStyle = B.col; g.fillRect(x, 11, 4, 20);
      FX.pixelText(g, B.name, x + 9, 11, { color: '#e3cda2', size: 12, align: 'left', ink: false });
      const bx = x + 9, bw = 62;
      g.fillStyle = '#160d06'; g.fillRect(bx, 23, bw, 6);
      for (let i = 0; i < 4; i++) {
        const cw = (bw - 3) / 4;
        if (i < n) {
          g.fillStyle = GD1; g.fillRect(bx + 1 + i * cw, 23, cw - 1, 6);
          g.fillStyle = GD3; g.fillRect(bx + 1 + i * cw, 23, cw - 1, 3);
        } else { g.fillStyle = '#4a3218'; g.fillRect(bx + 1 + i * cw, 24, cw - 1, 4); }
      }
      FX.pixelText(g, `${n}/4`, x + 76, 15, { color: n === 4 ? GD3 : '#a5825a', size: 12, align: 'left', ink: false });
    }
    FX.pixelText(g, `${learned}/${FRUITS.length}`, VW - 116, 12, { color: GD3, size: 15, align: 'right', ink: 2, inkColor: 'rgba(0,0,0,0.7)' });
    for (const z of ZBTN) {
      const hot = zoomHot === z.k;
      goldButton(g, z.x, z.y, z.w, z.h, null, hot, 'gold');
      g.fillStyle = '#3d2606';
      const cx = z.x + z.w / 2, cy = z.y + z.h / 2 + (hot ? 3 : 0);
      if (z.s !== 'o') g.fillRect(cx - 7, cy - 2, 14, 4);
      if (z.s === '+') g.fillRect(cx - 2, cy - 7, 4, 14);
      if (z.s === 'o') { g.fillRect(cx - 7, cy - 7, 14, 3); g.fillRect(cx - 7, cy + 4, 14, 3); g.fillRect(cx - 7, cy - 7, 3, 14); g.fillRect(cx + 4, cy - 7, 3, 14); }
    }
  }

  // The card along the bottom: a wooden banner and a cream page under it.
  function detail(g, t) {
    const H = CARD, Y = VH - H;
    g.fillStyle = OL; g.fillRect(0, Y - 4, VW, H + 4);
    g.fillStyle = PG2; g.fillRect(0, Y, VW, H);
    Tex.fill(g, 'paper', 0, Y, VW, H, 0.55);
    g.fillStyle = PG3; g.fillRect(0, Y, VW, 3);
    g.fillStyle = WD1; g.fillRect(0, Y - 7, VW, 7);
    Tex.fill(g, 'wood', 0, Y - 7, VW, 7, 0.5);
    g.fillStyle = WD3; g.fillRect(0, Y - 7, VW, 2);
    g.fillStyle = WD0; g.fillRect(0, Y - 2, VW, 2);

    if (!planted()) {
      slot(g, 16, Y + 18, 52);
      Icons.blit(g, 't_seed', 20, Y + 22, 2.75);
      FX.pixelText(g, 'THE FIRST SEED', 84, Y + 16, { color: INK, size: 11, align: 'left', ink: false });
      FX.pixelText(g, 'Plant it and the tree forks into three branches.', 84, Y + 36, { color: INK2, size: 10, align: 'left', ink: false });
      FX.pixelText(g, 'Soil, Beast and Rite. The first one costs nothing.', 84, Y + 52, { color: INK2, size: 10, align: 'left', ink: false });
      goldButton(g, LEARN.x, LEARN.y, LEARN.w, LEARN.h, 'PLANT  FREE', learnHot, 'gold');
      return;
    }
    const f = sel >= 0 ? FRUITS[sel] : null;
    const learned = FRUITS.filter(owned).length;
    if (!f) { FX.pixelText(g, 'PICK A FRUIT', VW / 2, Y + 36, { color: INK2, size: 12, ink: false }); return; }
    const B = BRANCH[f.root], st = state(f);
    slot(g, 16, Y + 18, 52);
    Icons.blit(g, f.icon, 20, Y + 22, 2.75);
    FX.pixelText(g, f.name.toUpperCase(), 84, Y + 12, { color: INK, size: 11, align: 'left', ink: false });
    g.fillStyle = B.col; g.fillRect(84, Y + 30, 4, 12);
    FX.pixelText(g, `${B.name} / BRANCH ${f.i + 1} OF 4`, 96, Y + 32, { color: '#6b3d12', size: 13, align: 'left', ink: false });
    const words = f.desc.split(' ');
    let line = ''; const lines = [];
    for (const w of words) { if ((line + w).length > 46) { lines.push(line.trim()); line = ''; } line += w + ' '; }
    lines.push(line.trim());
    lines.slice(0, 2).forEach((l, i) => FX.pixelText(g, l, 84, Y + 50 + i * 15, { color: INK2, size: 10, align: 'left', ink: false }));

    const ok = st === 'ready';
    const label = st === 'eaten' ? 'GROWN' : st === 'locked' ? 'LOCKED' : st === 'unripe' ? 'NOT RIPE' : st === 'costly' ? 'TOO DEAR' : 'GROW IT';
    goldButton(g, LEARN.x, LEARN.y, LEARN.w, LEARN.h, label, ok && learnHot, ok ? 'gold' : 'dead');
    if (ok) {
      Icons.blit(g, 'wdollar', LEARN.x - 46, LEARN.y + 8, 1.1);
      FX.pixelText(g, String(f.cost), LEARN.x - 28, LEARN.y + 11, { color: '#7a5a12', size: 11, align: 'left', ink: false });
    } else if (st !== 'eaten') {
      const why = st === 'locked' ? 'GROW THE ONE BELOW' : st === 'unripe' ? `FOREST ${Math.round(f.at * 100)}%` : `NEED ${f.cost}`;
      FX.pixelText(g, why, LEARN.x + LEARN.w / 2, LEARN.y - 16, { color: '#9a2a1a', size: 9, ink: false });
    }
      }

  return {
    init(g) { G = g; }, enter, update, render, click, hover: hoverAt, scroll, state, ripeCount, buy, plant, planted,
    pan, zoomBy, lookAt,
    get selected() { return sel; },
    screenOf(f) { const a = nodeAt(f); return { x: (a.x - cam.x) * cam.z + VW / 2, y: (a.y - cam.y) * cam.z + CY }; },
    get busy() { return grow.t > 0; },
  };
})();
