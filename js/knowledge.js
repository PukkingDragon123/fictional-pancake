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
  const ROWY = [552, 440, 328, 216];             // one row per rank
  const NW = 170, NH = 72;
  const ZMIN = 0.34, ZMAX = 1.8;
  const CARD = 88, CY = (VH - CARD) / 2;
  const cam = { x: BASE, y: 480, z: 0.45, tx: BASE, ty: 480, tz: 0.45 };
  let hover = -1, sel = -1, learnHot = false, seedHot = false;
  const grow = { t: 0, of: null, kind: '' };     // the growing animation
  const petals = [], flies = [], crumbs = [];
  let garden = null;

  const BRANCH = [
    { name: 'SOIL',  col: '#6ea83e', dark: '#29431c', fruit: ['#c9e06a', '#f2ffb0'], leaf: ['#245018', '#3d7a2a', '#5ba23c', '#8ccb5e'] },
    { name: 'BEAST', col: '#d4813a', dark: '#5a2c10', fruit: ['#d4813a', '#f7c07a'], leaf: ['#1f4a1c', '#376f2c', '#54963d', '#84c05c'] },
    { name: 'RITE',  col: '#9a6fd6', dark: '#3a2260', fruit: ['#9a6fd6', '#d6bcf4'], leaf: ['#1d4426', '#316a36', '#4b9048', '#7cb968'] },
  ];
  // palette of the interface, the same one the panels use
  const OL = '#17120e', CR0 = '#f4e6c0', CR1 = '#fdf6e0', CR2 = '#c9ac78';
  const GR0 = '#29431c', GR1 = '#4c7a2c', GR2 = '#6ea83e', GR3 = '#97cd60';
  const GD0 = '#7d5510', GD1 = '#c1912a', GD2 = '#efc245', GD3 = '#ffe497';
  const WD0 = '#34200f', WD1 = '#6b4423', WD2 = '#99642f', WD3 = '#c58f47', WD4 = '#e9bd78';
  const INK = '#3a2612', INK2 = '#6a5230';

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

  function nodeAt(f) { return { x: COLX[f.root], y: ROWY[f.i] }; }
  const SEED = { x: BASE, y: GROUND - 30 };
  // The spine of a branch: the fork, then each rank, bowing outward as it climbs.
  function spine(b) {
    const pts = [{ x: BASE, y: FORK }];
    for (let i = 0; i < 4; i++) pts.push({ x: COLX[b] + (b - 1) * i * 9, y: ROWY[i] });
    return pts;
  }

  // ---- camera -------------------------------------------------------------
  const wxOf = (s) => (s - VW / 2) / cam.z + cam.x;
  const wyOf = (s) => (s - CY) / cam.z + cam.y;
  function clampCam() {
    const hw = VW / 2 / cam.tz, hh = CY / cam.tz;
    cam.tx = hw * 2 > WW ? WW / 2 : U.clamp(cam.tx, hw, WW - hw);
    const top = 120, bot = GROUND + 60;
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
      sel = FRUITS.indexOf(t);
      const a = nodeAt(FRUITS[sel]);
      lookAt(U.lerp(BASE, a.x, 0.5), U.lerp(GROUND - 160, a.y, 0.6), 0.45);
    }
    cam.x = cam.tx; cam.y = cam.ty; cam.z = cam.tz;
    Audio.setMode('pen');
  }

  // ---- planting and learning ---------------------------------------------
  function plant() {
    if (planted() || grow.t > 0) return;
    G.fruits.sprout = true;
    grow.t = 2.2; grow.of = null; grow.kind = 'sprout';
    sel = 0;                                   // the first Soil fruit is what you look at next
    lookAt(BASE, 470, 0.45);
    Audio.play('bless');
    UI.toast('The seed takes. Three branches open.', 'good');
    FX.sparkle(VW / 2, VH / 2, 26, GD3);
    FX.confettiBurst(VW / 2, VH * 0.6, 40);
    for (let i = 0; i < 24; i++) crumbs.push({ x: SEED.x, y: SEED.y, vx: U.rand(-70, 70), vy: U.rand(-130, -30), t: 0, c: U.pick([GR3, GD2, '#9ad86a']) });
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
    FX.sparkle(VW / 2, VH / 2, 16, GD3);
    UI.refreshAll(); Main.save();
  }

  function update(dt) {
    ensure();
    cam.x = U.lerp(cam.x, cam.tx, 1 - Math.pow(0.0015, dt));
    cam.y = U.lerp(cam.y, cam.ty, 1 - Math.pow(0.0015, dt));
    cam.z = U.lerp(cam.z, cam.tz, 1 - Math.pow(0.0015, dt));
    if (grow.t > 0) grow.t = Math.max(0, grow.t - dt);
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
    const wx = wxOf(px), wy = wyOf(py);
    if (!planted()) return Math.hypot(wx - SEED.x, (wy - SEED.y) * 0.8) < 60 ? -2 : -1;
    for (let i = 0; i < FRUITS.length; i++) {
      const a = nodeAt(FRUITS[i]);
      if (Math.abs(wx - a.x) < NW / 2 && Math.abs(wy - a.y) < NH / 2) return i;
    }
    return -1;
  }
  const LEARN = { x: VW - 150, y: VH - 50, w: 134, h: 34 };
  function overLearn(px, py) {
    return px > LEARN.x && px < LEARN.x + LEARN.w && py > LEARN.y && py < LEARN.y + LEARN.h && (sel >= 0 || !planted());
  }
  function click(px, py) {
    if (overLearn(px, py)) { if (!planted()) plant(); else buy(FRUITS[sel]); return; }
    const i = indexAt(px, py);
    if (i === -2) { plant(); return; }
    if (i < 0) return;
    if (i === sel) buy(FRUITS[i]);
    else { sel = i; Audio.play('click'); }
  }
  function hoverAt(px, py) {
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
    const sky = g.createLinearGradient(0, 0, 0, 700);
    sky.addColorStop(0, '#5fb0d6'); sky.addColorStop(0.4, '#93d2e4'); sky.addColorStop(0.78, '#d6edc8'); sky.addColorStop(1, '#f2e7b8');
    g.fillStyle = sky; g.fillRect(0, 0, WW, 700);
    Art.ell(g, 1216, 150, 56, 56, 'rgba(255,240,180,0.17)');
    Art.ell(g, 1216, 150, 38, 38, 'rgba(255,244,200,0.4)');
    Art.ell(g, 1216, 150, 24, 24, '#fff6cf');
    const rnd = Art.rng(4242);
    for (let i = 0; i < 11; i++) {
      const cx = 40 + i * 142 + rnd() * 50, cy = 70 + rnd() * 240, s = 0.7 + rnd() * 0.9;
      const puffs = [[-2, 2, 1], [-1, 1, 1.15], [0, 0, 1.3], [1, 1, 1.1], [2, 2, 0.85]];
      for (const [k, d, w] of puffs) Art.ell(g, cx + k * 22 * s, cy + d * 5 * s + 5, 22 * s * w, 13 * s * w, 'rgba(180,210,226,0.8)');
      for (const [k, d, w] of puffs) {
        Art.ell(g, cx + k * 22 * s, cy + d * 5 * s, 21 * s * w, 13 * s * w, '#f4fcff');
        Art.ell(g, cx + k * 22 * s - 5 * s, cy + d * 5 * s - 5 * s, 12 * s * w, 7 * s * w, '#ffffff');
      }
    }
    for (const [hy, col, lit] of [[560, '#84b46e', '#9dc983'], [596, '#6d9e58', '#84b46e']]) {
      for (let x = -60; x < WW + 60; x += 108) { const r = 92 + rnd() * 40; Art.ell(g, x + rnd() * 50, hy + 26, r, 46, col); Art.ell(g, x + rnd() * 50 - 14, hy + 14, r * 0.5, 18, lit); }
      g.fillStyle = col; g.fillRect(0, hy + 22, WW, 60);
    }
    // a hedge of round trees along the back, each with its own trunk and sun
    for (let i = 0; i < 22; i++) {
      const x = -20 + i * 72 + rnd() * 28, y = 636 - rnd() * 16, s = 0.85 + rnd() * 0.55;
      Art.limb(g, x, y + 22, x - 2, y - 8, 9, 6, '#4a3420');
      Art.limb(g, x - 2, y + 20, x - 4, y - 6, 3.4, 2.4, '#7d5f42');
      Art.ell(g, x, y - 10, 32 * s, 26 * s, '#26501f');
      Art.ell(g, x - 4, y - 15, 27 * s, 22 * s, '#3d7530');
      Art.ell(g, x - 9, y - 21, 16 * s, 12 * s, '#63a446');
      Art.ell(g, x - 13, y - 25, 8 * s, 6 * s, '#8ec95f');
      Art.speckle(g, x - 5, y - 17, 20 * s, 14 * s, '#8ec95f', 26, i * 31 + 7);
      Art.speckle(g, x + 5, y - 3, 20 * s, 12 * s, '#1c3d18', 18, i * 17 + 3);
    }
    // the garden floor
    g.fillStyle = '#4d8a37'; g.fillRect(0, 650, WW, WH - 650);
    for (let i = 0; i < 6200; i++) {
      const x = rnd() * WW, y = 650 + rnd() * (WH - 650);
      const k = (y - 650) / (WH - 650);
      Art.rect(g, x, y, 2, 2, rnd() < 0.5 - k * 0.25 ? '#66a845' : rnd() < 0.5 ? '#3f7a2c' : '#82c35b');
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
    for (let x = 6; x < WW; x += 30) {
      Art.poly(g, [[x, 846], [x + 15, 846], [x + 15, 886], [x + 7.5, 896], [x, 886]], '#e3cc9b');
      Art.rect(g, x, 846, 5, 46, '#f6e7c4');
      Art.rect(g, x + 11, 846, 4, 46, '#c0a577');
      Art.rect(g, x, 846, 15, 2, '#fff6e0');
    }
    Art.rect(g, 0, 856, WW, 7, '#c0a577'); Art.rect(g, 0, 856, WW, 2, '#f6e7c4');
    return c;
  }

  // ---- interface pieces, the same recipe as the panels --------------------
  function frame9(g, X, Y, w, h, cream) {
    X = Math.round(X); Y = Math.round(Y); w = Math.round(w); h = Math.round(h);
    g.fillStyle = 'rgba(0,0,0,0.4)'; g.fillRect(X + 4, Y + 6, w, h);
    g.fillStyle = OL; g.fillRect(X - 3, Y - 3, w + 6, h + 6);
    g.fillStyle = GR0; g.fillRect(X - 1, Y - 1, w + 2, h + 2);
    g.fillStyle = GR2; g.fillRect(X, Y, w, h);
    g.fillStyle = GR3; g.fillRect(X + 1, Y + 1, w - 2, 2); g.fillRect(X + 1, Y + 1, 2, h - 2);
    g.fillStyle = cream || CR0; g.fillRect(X + 5, Y + 5, w - 10, h - 10);
    g.fillStyle = CR1; g.fillRect(X + 5, Y + 5, w - 10, 2);
    g.fillStyle = GD2;                                  // the four gold studs
    g.fillRect(X, Y, 5, 5); g.fillRect(X + w - 5, Y, 5, 5);
    g.fillRect(X, Y + h - 5, 5, 5); g.fillRect(X + w - 5, Y + h - 5, 5, 5);
    g.fillStyle = GD3; g.fillRect(X, Y, 5, 2); g.fillRect(X + w - 5, Y, 5, 2);
  }
  function slot(g, X, Y, s) {
    X = Math.round(X); Y = Math.round(Y);
    g.fillStyle = OL; g.fillRect(X - 3, Y - 3, s + 6, s + 6);
    g.fillStyle = '#533722'; g.fillRect(X, Y, s, s);
    g.fillStyle = '#6d4a2b'; g.fillRect(X, Y, s, 2);
    g.fillStyle = '#3f2917'; g.fillRect(X, Y + s - 3, s, 3);
    g.fillStyle = GD2;
    g.fillRect(X, Y, 4, 4); g.fillRect(X + s - 4, Y, 4, 4);
    g.fillRect(X, Y + s - 4, 4, 4); g.fillRect(X + s - 4, Y + s - 4, 4, 4);
  }
  function goldButton(g, X, Y, w, h, label, on, tone) {
    X = Math.round(X); Y = Math.round(Y);
    const top = tone === 'green' ? GR3 : tone === 'dead' ? '#b9ad96' : GD3;
    const mid = tone === 'green' ? GR2 : tone === 'dead' ? '#9a8e78' : GD2;
    const bot = tone === 'green' ? GR1 : tone === 'dead' ? '#7a6f5c' : GD1;
    const foot = tone === 'green' ? GR0 : tone === 'dead' ? '#4f4737' : GD0;
    const d = on ? 2 : 0;
    g.fillStyle = OL; g.fillRect(X - 3, Y - 3 + d, w + 6, h + 6 + (5 - d));
    g.fillStyle = foot; g.fillRect(X, Y + h + d, w, 5 - d);
    g.fillStyle = bot; g.fillRect(X, Y + d, w, h);
    g.fillStyle = mid; g.fillRect(X, Y + d, w, Math.round(h * 0.62));
    g.fillStyle = top; g.fillRect(X, Y + d, w, Math.round(h * 0.26));
    g.fillStyle = 'rgba(255,244,200,0.5)'; g.fillRect(X + 2, Y + 2 + d, w - 4, 1);
    if (label) FX.pixelText(g, label, X + w / 2, Y + d + Math.round(h / 2) - 5, { color: tone === 'dead' ? '#4d4638' : '#3a2606', size: 10, ink: false });
  }
  function banner(g, X, Y, w, h, label) {
    X = Math.round(X); Y = Math.round(Y);
    g.fillStyle = OL; g.fillRect(X - 3, Y - 3, w + 6, h + 6);
    g.fillStyle = WD1; g.fillRect(X, Y, w, h);
    g.fillStyle = WD2; g.fillRect(X, Y, w, Math.round(h * 0.76));
    g.fillStyle = WD3; g.fillRect(X, Y, w, Math.round(h * 0.4));
    g.fillStyle = WD4; g.fillRect(X, Y, w, Math.round(h * 0.18));
    for (const bx of [X - 10, X + w - 6]) {            // the blue end caps
      g.fillStyle = OL; g.fillRect(bx - 3, Y - 7, 22, h + 14);
      g.fillStyle = '#2b5a92'; g.fillRect(bx, Y - 4, 16, h + 8);
      g.fillStyle = '#4d8fd0'; g.fillRect(bx, Y - 4, 16, Math.round((h + 8) * 0.46));
      g.fillStyle = '#8fc6f2'; g.fillRect(bx, Y - 4, 16, 3);
    }
    if (label) FX.pixelText(g, label, X + w / 2, Y + Math.round(h / 2) - 6, { color: '#fff3d2', size: 11, ink: 2, inkColor: 'rgba(0,0,0,0.55)' });
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
        if (!live) for (let k = 0; k < 3; k++) {          // bare twigs, waiting for a fruit
          const q = (k + 1) / 4, sx2 = U.lerp(p.x, nx, q) + bend * 0.4 * Math.sin(q * Math.PI), sy2 = U.lerp(p.y, ny, q);
          Art.limb(g, sx2, sy2, sx2 + (k % 2 ? 13 : -13), sy2 - 9, 3, 1, '#4a3a2a');
        }
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
        puff(g, n.x + (e.b - 1) * 14, n.y - 14, 152 * pop, L, e.b * 71 + i * 13 + 5, F);
      }
      if (e.reach >= 4) puff(g, e.path[4].x + (e.b - 1) * 24, e.path[4].y - 96, 130, L, e.b * 97 + 3, F);
      // a slimmer pass of bark over the leaves, so the branch still reads
      for (let i = 0; i < e.reach; i++) {
        const bend = (e.b - 1) * (i === 0 ? 62 : 20) + (e.b === 1 ? (i % 2 ? 30 : -30) : 0);
        const tw = (36 - i * 5.6) * 0.52;
        bough(g, e.path[i], e.path[i + 1], tw + 4, tw * 0.78 + 4, '#241a0f', null, bend);
        bough(g, e.path[i], e.path[i + 1], tw, tw * 0.78, '#4a3420', '#7d5f42', bend);
      }
    }
  }

  function drawSeed(g, t, alpha) {
    const pulse = 0.5 + 0.5 * Math.sin(t * 2.6);
    g.globalAlpha = alpha ?? 1;
    const y = SEED.y + Math.sin(t * 1.6) * 3;
    Art.ell(g, SEED.x, GROUND + 4, 34, 10, 'rgba(40,26,12,0.35)');
    for (let r = 3; r >= 1; r--) Art.ell(g, SEED.x, y, 22 + r * 11 + pulse * 7, 26 + r * 12 + pulse * 7, `rgba(245,205,92,${(0.05 + pulse * 0.05).toFixed(3)})`);
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
      Art.rect(g, SEED.x + Math.cos(a) * 32, y - 22 - ((t * 26 + i * 11) % 62), 3, 3, i % 2 ? GD3 : GD2);
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
    else FRUITS.forEach((f, i) => drawNode(g, f, i, t));
    for (const c of crumbs) { g.fillStyle = c.c; g.fillRect(Math.round(c.x), Math.round(c.y), 3, 3); }
    g.restore();
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
    Art.ell(g, SEED.x, SEED.y, 46 + pulse * 6, 52 + pulse * 6, g.fillStyle);
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

  function drawNode(g, f, i, t) {
    const a = nodeAt(f), st = state(f);
    const B = BRANCH[f.root];
    const hot = hover === i || sel === i;
    const pulse = 0.5 + 0.5 * Math.sin(t * 3 + i);
    const X = Math.round(a.x - NW / 2), Y = Math.round(a.y - NH / 2);
    const dim = st === 'locked' || st === 'unripe';
    if (st === 'ready') {
      g.fillStyle = `rgba(245,205,92,${(0.12 + pulse * 0.2).toFixed(2)})`;
      g.fillRect(X - 9, Y - 9, NW + 18, NH + 18);
    }
    g.globalAlpha = dim ? 0.82 : 1;
    frame9(g, X, Y, NW, NH, dim ? '#d9cfb2' : CR0);
    if (hot) { g.fillStyle = GD2; g.fillRect(X - 3, Y - 3, NW + 6, 3); g.fillRect(X - 3, Y + NH, NW + 6, 3); g.fillRect(X - 3, Y - 3, 3, NH + 6); g.fillRect(X + NW, Y - 3, 3, NH + 6); }
    // a coloured tab down the left, so you can tell the branches apart
    g.fillStyle = B.col; g.fillRect(X + 5, Y + 5, 5, NH - 10);
    g.fillStyle = B.dark; g.fillRect(X + 5, Y + NH - 8, 5, 3);
    // the icon in its inventory slot
    const S = 44, ix = X + 16, iy = Y + (NH - S) / 2;
    slot(g, ix, iy, S);
    g.globalAlpha = dim ? 0.45 : 1;
    Icons.blit(g, f.icon, ix + 4, iy + 4, 2.25);
    g.globalAlpha = dim ? 0.82 : 1;
    const tx = ix + S + 12;
    FX.pixelText(g, f.name.toUpperCase(), tx, Y + 12, { color: INK, size: 9, align: 'left', ink: false });
    if (st === 'eaten') {
      FX.pixelText(g, 'GROWN', tx, Y + 28, { color: '#2f6b1f', size: 10, align: 'left', ink: false });
      Icons.blit(g, 'check', X + NW - 24, Y + 8, 1);
    } else if (st === 'locked') {
      Icons.blit(g, 'lock', tx, Y + 26, 0.9);
      FX.pixelText(g, 'LOCKED', tx + 18, Y + 28, { color: INK2, size: 10, align: 'left', ink: false });
    } else if (st === 'unripe') {
      FX.pixelText(g, `FOREST ${Math.round(f.at * 100)}%`, tx, Y + 28, { color: '#7a5a12', size: 10, align: 'left', ink: false });
    } else {
      Icons.blit(g, 'wdollar', tx - 2, Y + 24, 1);
      FX.pixelText(g, String(f.cost), tx + 18, Y + 28, { color: st === 'costly' ? '#9a2a1a' : '#7a5a12', size: 11, align: 'left', ink: false });
    }
    FX.pixelText(g, `${B.name}  ${f.i + 1}/4`, tx, Y + 46, { color: INK2, size: 8, align: 'left', ink: false });
    g.globalAlpha = 1;
  }

  // The card along the bottom: a wooden banner and a cream page under it.
  function detail(g, t) {
    const H = CARD, Y = VH - H;
    g.fillStyle = OL; g.fillRect(0, Y - 4, VW, H + 4);
    g.fillStyle = CR0; g.fillRect(0, Y, VW, H);
    g.fillStyle = CR1; g.fillRect(0, Y, VW, 3);
    g.fillStyle = GR2; g.fillRect(0, Y - 4, VW, 4);
    g.fillStyle = GR3; g.fillRect(0, Y - 4, VW, 1);

    if (!planted()) {
      slot(g, 16, Y + 18, 52);
      Icons.blit(g, 't_seed', 20, Y + 22, 2.75);
      FX.pixelText(g, 'THE FIRST SEED', 84, Y + 16, { color: INK, size: 11, align: 'left', ink: false });
      FX.pixelText(g, 'Plant it and the tree forks into three branches.', 84, Y + 36, { color: INK2, size: 10, align: 'left', ink: false });
      FX.pixelText(g, 'Soil, Beast and Rite. The first one costs nothing.', 84, Y + 52, { color: INK2, size: 10, align: 'left', ink: false });
      goldButton(g, LEARN.x, LEARN.y, LEARN.w, LEARN.h, 'PLANT  FREE', learnHot, 'green');
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
    FX.pixelText(g, `${B.name}  BRANCH ${f.i + 1} OF 4`, 94, Y + 32, { color: '#6b3d12', size: 9, align: 'left', ink: false });
    const words = f.desc.split(' ');
    let line = ''; const lines = [];
    for (const w of words) { if ((line + w).length > 52) { lines.push(line.trim()); line = ''; } line += w + ' '; }
    lines.push(line.trim());
    lines.slice(0, 2).forEach((l, i) => FX.pixelText(g, l, 84, Y + 50 + i * 15, { color: INK2, size: 10, align: 'left', ink: false }));

    const ok = st === 'ready';
    const label = st === 'eaten' ? 'GROWN' : st === 'locked' ? 'LOCKED' : st === 'unripe' ? 'NOT RIPE' : st === 'costly' ? 'TOO DEAR' : 'GROW IT';
    goldButton(g, LEARN.x, LEARN.y, LEARN.w, LEARN.h, label, ok && learnHot, ok ? 'green' : 'dead');
    if (ok) {
      Icons.blit(g, 'wdollar', LEARN.x - 46, LEARN.y + 8, 1.1);
      FX.pixelText(g, String(f.cost), LEARN.x - 28, LEARN.y + 11, { color: '#7a5a12', size: 11, align: 'left', ink: false });
    } else if (st !== 'eaten') {
      const why = st === 'locked' ? 'GROW THE ONE BELOW' : st === 'unripe' ? `FOREST ${Math.round(f.at * 100)}%` : `NEED ${f.cost}`;
      FX.pixelText(g, why, LEARN.x + LEARN.w / 2, LEARN.y - 16, { color: '#9a2a1a', size: 9, ink: false });
    }
    FX.pixelText(g, `${learned}/${FRUITS.length}`, VW - 14, Y + 12, { color: INK2, size: 10, align: 'right', ink: false });
  }

  return {
    init(g) { G = g; }, enter, update, render, click, hover: hoverAt, scroll, state, ripeCount, buy, plant, planted,
    pan, zoomBy, lookAt,
    get busy() { return grow.t > 0; },
  };
})();
