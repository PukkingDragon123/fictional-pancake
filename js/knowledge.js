// ---- The Tree of Life: a proper skill tree, branches, plaques and all -----
// Three branches of four ranks. A rank only opens once the one below it is
// eaten, and only once the forest has come back far enough to ripen it.
const Knowledge = (() => {
  let G = null;
  const VW = 640, VH = 360;
  const WW = 760, WH = 620;
  const COLX = [150, 380, 610];
  const ROWY = [470, 362, 254, 146];
  const NW = 128, NH = 74;                 // a node plaque
  const ZMIN = 0.5, ZMAX = 1.8;
  const CARD = 76, CY = (VH - CARD) / 2;      // the tree lives above the detail card
  const cam = { x: WW / 2, y: 288, z: 0.62, tx: WW / 2, ty: 288, tz: 0.62 };
  let tree = null, hover = -1, sel = -1, learnHot = false;
  const eating = { on: false, t: 0, fruit: null, x: 0, y: 0, dir: 1, bites: 0, phase: 'climb' };
  const motes = [], crumbs = [];
  const BRANCH = [
    { name: 'SOIL', col: '#5d9440', dark: '#2f4f24' },
    { name: 'BEAST', col: '#c4623f', dark: '#6b2f1c' },
    { name: 'RITE', col: '#8354c9', dark: '#412266' },
  ];

  function ensure() {
    if (!tree) {
      tree = Props.buildLifeTree(360, 500, 707);
      for (let i = 0; i < 40; i++) motes.push({ x: Math.random() * WW, y: Math.random() * WH, ph: Math.random() * TAU, s: Math.random() < 0.4 ? 2 : 1 });
    }
    return tree;
  }
  const nodeAt = (f) => ({ x: COLX[f.root], y: ROWY[f.i] });
  const owned = (f) => !!G.fruits[f.key];
  const prereq = (f) => (f.i === 0 ? null : FRUITS.find((x) => x.root === f.root && x.i === f.i - 1));
  function state(f) {
    if (owned(f)) return 'eaten';
    const p = prereq(f);
    if (p && !owned(p)) return 'locked';
    if (World.fraction() < f.at) return 'unripe';
    return G.wd >= f.cost ? 'ready' : 'costly';
  }
  function ripeCount() { return FRUITS.filter((f) => state(f) === 'ready').length; }

  // ---- camera -------------------------------------------------------------
  const sx = (x) => (x - cam.x) * cam.z + VW / 2;
  const sy = (y) => (y - cam.y) * cam.z + CY;
  const wxOf = (s) => (s - VW / 2) / cam.z + cam.x;
  const wyOf = (s) => (s - CY) / cam.z + cam.y;
  function clampCam() {
    const hw = VW / 2 / cam.tz, hh = CY / cam.tz;
    const top = 96, bot = 530;                  // where the tree actually starts and ends
    cam.tx = hw * 2 > WW ? WW / 2 : U.clamp(cam.tx, hw, WW - hw);
    const lo = top + hh - 40, hi = bot - hh + 40;
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

  function enter() {
    ensure();
    const t = FRUITS.find((f) => state(f) === 'ready') || FRUITS.find((f) => !owned(f)) || FRUITS[0];
    sel = FRUITS.indexOf(t);
    const a = nodeAt(t);
    cam.z = cam.tz = 0.62;
    lookAt(WW / 2, 288, 0.62); cam.x = cam.tx; cam.y = cam.ty;
    Audio.setMode('pen');
  }

  // ---- learning -----------------------------------------------------------
  function buy(f) {
    const st = state(f);
    if (st === 'eaten' || eating.on) return;
    if (st === 'locked') { Audio.play('error'); UI.toast('eat the one below first', 'bad'); return; }
    if (st === 'unripe') { Audio.play('error'); UI.toast(`ripens at ${Math.round(f.at * 100)}% forest`, 'bad'); return; }
    if (st === 'costly') { Audio.play('error'); UI.toast('not enough', 'bad'); return; }
    G.wd -= f.cost;
    const a = nodeAt(f);
    eating.on = true; eating.t = 0; eating.fruit = f; eating.bites = 0; eating.phase = 'climb';
    eating.dir = 1; eating.x = a.x - 90; eating.y = a.y + NH / 2 + 14;
    lookAt(a.x, a.y, Math.max(cam.tz, 1));
    Audio.play('click');
    UI.refreshAll();
  }

  function update(dt) {
    cam.x = U.lerp(cam.x, cam.tx, 1 - Math.pow(0.0015, dt));
    cam.y = U.lerp(cam.y, cam.ty, 1 - Math.pow(0.0015, dt));
    cam.z = U.lerp(cam.z, cam.tz, 1 - Math.pow(0.0015, dt));
    for (let i = crumbs.length - 1; i >= 0; i--) {
      const c = crumbs[i];
      c.t += dt; c.vy += 220 * dt; c.x += c.vx * dt; c.y += c.vy * dt;
      if (c.t > 1.4) crumbs.splice(i, 1);
    }
    if (!eating.on) return;
    const e = eating, a = nodeAt(e.fruit);
    e.t += dt;
    if (e.phase === 'climb') {
      const k = U.easeInOut(Math.min(1, e.t / 1.2));
      e.x = U.lerp(a.x - 90, a.x - 26, k);
      e.y = a.y + NH / 2 + 14;
      if (e.t >= 1.2) { e.phase = 'bite'; e.t = 0; }
    } else if (e.phase === 'bite') {
      const per = 0.4;
      if (e.t > per * (e.bites + 1) && e.bites < 3) {
        e.bites++;
        Audio.play('munch');
        for (let i = 0; i < 6; i++) crumbs.push({ x: a.x, y: a.y, vx: U.rand(-30, 30), vy: U.rand(-50, -10), t: 0, c: BRANCH[e.fruit.root].col });
      }
      if (e.bites >= 3 && e.t > per * 3 + 0.3) {
        G.fruits[e.fruit.key] = true;
        FX.sparkle(VW / 2, VH / 2, 18, PAL.gold3);
        Audio.play('bless');
        UI.toast(e.fruit.name, 'good');
        e.phase = 'down'; e.t = 0;
      }
    } else {
      const k = U.easeIn(Math.min(1, e.t / 0.9));
      e.x = U.lerp(a.x - 26, a.x - 110, k);
      if (e.t >= 0.9) { e.on = false; e.fruit = null; UI.refreshAll(); Main.save(); }
    }
  }

  // ---- input --------------------------------------------------------------
  function indexAt(px, py) {
    const wx = wxOf(px), wy = wyOf(py);
    for (let i = 0; i < FRUITS.length; i++) {
      const a = nodeAt(FRUITS[i]);
      if (Math.abs(wx - a.x) < NW / 2 && Math.abs(wy - a.y) < NH / 2) return i;
    }
    return -1;
  }
  const LEARN = { x: VW - 132, y: VH - 42, w: 118, h: 30 };
  function overLearn(px, py) {
    return sel >= 0 && px > LEARN.x && px < LEARN.x + LEARN.w && py > LEARN.y && py < LEARN.y + LEARN.h;
  }
  function click(px, py) {
    if (overLearn(px, py)) { buy(FRUITS[sel]); return; }
    const i = indexAt(px, py);
    if (i < 0) return;
    if (i === sel) buy(FRUITS[i]);
    else { sel = i; Audio.play('click'); }
  }
  function hoverAt(px, py) {
    hover = indexAt(px, py);
    learnHot = overLearn(px, py);
    return null;                                    // the tree carries its own detail card
  }
  function scroll(dy, px, py) { zoomAt(dy < 0 ? 1.14 : 1 / 1.14, px ?? VW / 2, py ?? VH / 2); }

  // ---- drawing ------------------------------------------------------------
  // square plaques, hard corners, light from the upper left
  function plaque(g, x, y, w, h, face, edge, lit) {
    const X = Math.round(x - w / 2), Y = Math.round(y - h / 2);
    g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(X + 3, Y + 4, w, h);
    g.fillStyle = edge; g.fillRect(X, Y, w, h);
    g.fillStyle = face; g.fillRect(X + 2, Y + 2, w - 4, h - 4);
    g.fillStyle = lit; g.fillRect(X + 2, Y + 2, w - 4, 2);
    g.fillStyle = lit; g.fillRect(X + 2, Y + 2, 2, h - 4);
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(X + 2, Y + h - 4, w - 4, 2); g.fillRect(X + w - 4, Y + 2, 2, h - 4);
    g.fillStyle = edge;                                    // notched corners
    g.fillRect(X, Y, 3, 3); g.fillRect(X + w - 3, Y, 3, 3);
    g.fillRect(X, Y + h - 3, 3, 3); g.fillRect(X + w - 3, Y + h - 3, 3, 3);
  }

  function render(g) {
    ensure();
    const t = G.time;
    const sky = g.createLinearGradient(0, 0, 0, VH);
    sky.addColorStop(0, '#0b0916'); sky.addColorStop(0.6, '#141026'); sky.addColorStop(1, '#1d1630');
    g.fillStyle = sky; g.fillRect(0, 0, VW, VH);
    for (let i = 0; i < 70; i++) {
      const x = (i * 97) % VW, y = (i * 53) % VH;
      if ((Math.sin(t * 1.4 + i) + 1) > 0.6) { g.fillStyle = i % 6 === 0 ? PAL.gold3 : 'rgba(230,226,255,0.5)'; g.fillRect(x, y, 1, 1); }
    }

    g.save();
    g.translate(VW / 2, CY); g.scale(cam.z, cam.z); g.translate(-cam.x, -cam.y);

    // the tree itself, standing behind the ranks
    g.globalAlpha = 0.28;
    g.drawImage(tree.canvas, Math.round(WW / 2 - tree.canvas.width / 2), Math.round(WH - tree.canvas.height + 30));
    g.globalAlpha = 1;
    for (const m of motes) {
      const a = 0.25 + 0.45 * (Math.sin(t * 1.2 + m.ph) * 0.5 + 0.5);
      g.fillStyle = `rgba(245,205,92,${a.toFixed(2)})`;
      g.fillRect(Math.round(m.x + Math.sin(t * 0.4 + m.ph) * 14), Math.round(m.y + Math.cos(t * 0.3 + m.ph) * 10), m.s, m.s);
    }

    // branch banners
    for (let b = 0; b < 3; b++) {
      const x = COLX[b], y = ROWY[3] - 76;
      plaque(g, x, y, 150, 34, BRANCH[b].dark, '#0e0b16', U.mix(BRANCH[b].col, '#ffffff', 0.25));
      FX.pixelText(g, BRANCH[b].name, x, y - 6, { color: '#fdf3dc', size: 12, ink: 3, inkColor: '#0e0b16' });
    }
    // limbs between the ranks
    for (const f of FRUITS) {
      const p = prereq(f);
      const a = nodeAt(f);
      const from = p ? nodeAt(p) : { x: COLX[f.root], y: ROWY[0] + 96 };
      const on = p ? owned(p) : true;
      const live = on && owned(f);
      const col = live ? BRANCH[f.root].col : on ? '#4a4258' : '#2a2536';
      g.fillStyle = '#0e0b16';
      g.fillRect(Math.round(a.x - 7), Math.round(a.y + NH / 2), 14, Math.round(from.y - NH / 2 - (a.y + NH / 2)));
      g.fillStyle = col;
      g.fillRect(Math.round(a.x - 5), Math.round(a.y + NH / 2), 10, Math.round(from.y - NH / 2 - (a.y + NH / 2)));
      g.fillStyle = 'rgba(255,255,255,0.18)';
      g.fillRect(Math.round(a.x - 5), Math.round(a.y + NH / 2), 3, Math.round(from.y - NH / 2 - (a.y + NH / 2)));
      if (on && !owned(f)) {                       // sap running up an open limb
        const k = (t * 0.4 + f.i * 0.3) % 1;
        const yy = U.lerp(from.y - NH / 2, a.y + NH / 2, k);
        g.fillStyle = PAL.gold3; g.fillRect(Math.round(a.x - 3), Math.round(yy), 6, 5);
      }
    }
    // the trunk stub under the first rank
    g.fillStyle = '#0e0b16'; g.fillRect(COLX[0] - 7, ROWY[0] + 90, COLX[2] - COLX[0] + 14, 14);
    g.fillStyle = '#4a3524'; g.fillRect(COLX[0] - 5, ROWY[0] + 92, COLX[2] - COLX[0] + 10, 10);
    g.fillStyle = 'rgba(255,255,255,0.14)'; g.fillRect(COLX[0] - 5, ROWY[0] + 92, COLX[2] - COLX[0] + 10, 3);

    FRUITS.forEach((f, i) => drawNode(g, f, i, t));
    for (const c of crumbs) { g.fillStyle = c.c; g.fillRect(Math.round(c.x), Math.round(c.y), 2, 2); }
    if (eating.on) {
      const bite = eating.phase === 'bite' ? Math.max(0, Math.sin(eating.t * 7.5)) : 0;
      const pose = eating.phase === 'bite' ? 'eat' : 'walk';
      Sprites.blit(g, eating.x, eating.y, pose, Math.floor(t * 9), 'brown', eating.dir, 'adult', 1, bite * 0.18);
    }
    g.restore();

    detail(g, t);
    const vg = g.createRadialGradient(VW / 2, VH / 2, VH * 0.4, VW / 2, VH / 2, VH);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(6,4,12,0.7)');
    g.fillStyle = vg; g.fillRect(0, 0, VW, VH);
    FX.drawParticles(g, 0);
    FX.drawFloaters(g, false);
  }

  function drawNode(g, f, i, t) {
    const a = nodeAt(f), st = state(f);
    const B = BRANCH[f.root];
    const hot = hover === i || sel === i;
    const pulse = 0.5 + 0.5 * Math.sin(t * 3 + i);
    let face = '#3a3350', edge = '#0e0b16', lit = '#5d5478';
    if (st === 'eaten') { face = U.mix(B.dark, B.col, 0.5); lit = U.mix(B.col, '#ffffff', 0.45); }
    else if (st === 'ready') { face = U.mix('#3d3654', B.dark, 0.7); lit = U.mix(B.col, '#ffffff', 0.3); }
    else if (st === 'costly') { face = '#3a3350'; lit = '#6a6084'; }
    else if (st === 'unripe') { face = '#2e2840'; lit = '#4c445f'; }
    else { face = '#221e2e'; lit = '#3a3346'; }
    if (st === 'ready') {                       // a halo you can see from across the tree
      g.fillStyle = `rgba(245,205,92,${(0.1 + pulse * 0.16).toFixed(2)})`;
      g.fillRect(Math.round(a.x - NW / 2 - 5), Math.round(a.y - NH / 2 - 5), NW + 10, NH + 10);
    }
    plaque(g, a.x, a.y, NW, NH, face, hot ? '#f5cd5c' : edge, lit);
    // icon on the left, text to the right: the shape every skill tree uses
    const ix = a.x - NW / 2 + 10, iy = a.y - 16;
    g.fillStyle = '#0e0b16'; g.fillRect(ix - 2, iy - 2, 36, 36);
    g.fillStyle = st === 'eaten' ? U.mix(B.col, '#000000', 0.45) : '#191528';
    g.fillRect(ix, iy, 32, 32);
    g.globalAlpha = st === 'locked' ? 0.3 : st === 'unripe' ? 0.55 : 1;
    Icons.blit(g, f.icon, ix, iy, 2);
    g.globalAlpha = 1;
    const tx = ix + 42;
    FX.pixelText(g, f.name.toUpperCase(), tx, a.y - 22, { color: st === 'locked' ? '#8a82a0' : '#fffaf0', size: 8, align: 'left', ink: 2, inkColor: '#0e0b16' });
    if (st === 'eaten') {
      FX.pixelText(g, 'LEARNED', tx, a.y - 6, { color: B.col, size: 7, align: 'left', ink: 2, inkColor: '#0e0b16' });
      g.fillStyle = B.col;                       // a tick in the corner
      g.fillRect(a.x + NW / 2 - 16, a.y - NH / 2 + 8, 3, 3);
      g.fillRect(a.x + NW / 2 - 13, a.y - NH / 2 + 11, 3, 3);
      g.fillRect(a.x + NW / 2 - 10, a.y - NH / 2 + 8, 3, 3);
      g.fillRect(a.x + NW / 2 - 7, a.y - NH / 2 + 5, 3, 3);
    } else if (st === 'locked') {
      Icons.blit(g, 'lock', tx, a.y - 8, 1);
      FX.pixelText(g, 'LOCKED', tx + 20, a.y - 6, { color: '#8a82a0', size: 7, align: 'left', ink: 2, inkColor: '#0e0b16' });
    } else if (st === 'unripe') {
      FX.pixelText(g, `FOREST ${Math.round(f.at * 100)}%`, tx, a.y - 6, { color: '#9cc47f', size: 7, align: 'left', ink: 2, inkColor: '#0e0b16' });
    } else {
      Icons.blit(g, 'wdollar', tx, a.y - 10, 0.9);
      FX.pixelText(g, String(f.cost), tx + 17, a.y - 6, { color: st === 'costly' ? '#e0705a' : PAL.gold3, size: 8, align: 'left', ink: 2, inkColor: '#0e0b16' });
    }
    FX.pixelText(g, `RANK ${f.i + 1}`, tx, a.y + 10, { color: '#8a82a0', size: 6, align: 'left', ink: 2, inkColor: '#0e0b16' });
  }

  // The card along the bottom: what the thing does, and the button that buys it.
  function detail(g, t) {
    const f = sel >= 0 ? FRUITS[sel] : null;
    const H = CARD, Y = VH - H;
    g.fillStyle = '#0e0b16'; g.fillRect(0, Y - 3, VW, H + 3);
    g.fillStyle = '#1b1728'; g.fillRect(0, Y, VW, H);
    g.fillStyle = '#2e2840'; g.fillRect(0, Y, VW, 2);
    for (let x = 0; x < VW; x += 8) { g.fillStyle = 'rgba(255,255,255,0.02)'; g.fillRect(x, Y + 2, 4, H - 2); }
    if (!f) {
      FX.pixelText(g, 'PICK A FRUIT', VW / 2, Y + 32, { color: '#6a6280', size: 10 });
      return;
    }
    const B = BRANCH[f.root], st = state(f);
    g.fillStyle = '#0e0b16'; g.fillRect(12, Y + 12, 52, 52);
    g.fillStyle = U.mix(B.dark, '#000000', 0.3); g.fillRect(14, Y + 14, 48, 48);
    g.fillStyle = U.mix(B.col, '#ffffff', 0.25); g.fillRect(14, Y + 14, 48, 2);
    Icons.blit(g, f.icon, 22, Y + 22, 2);
    FX.pixelText(g, f.name.toUpperCase(), 76, Y + 12, { color: '#fdf3dc', size: 11, align: 'left', ink: 3, inkColor: '#0e0b16' });
    FX.pixelText(g, `${BRANCH[f.root].name} - RANK ${f.i + 1}`, 76, Y + 28, { color: B.col, size: 7, align: 'left', ink: 2, inkColor: '#0e0b16' });
    // wrap the description over two lines
    const words = f.desc.split(' ');
    let line = '', lines = [];
    for (const w of words) {
      if ((line + w).length > 44) { lines.push(line.trim()); line = ''; }
      line += w + ' ';
    }
    lines.push(line.trim());
    lines.slice(0, 2).forEach((l, i) => FX.pixelText(g, l, 76, Y + 42 + i * 13, { color: '#d2ccdf', size: 7, align: 'left', ink: 2, inkColor: '#0e0b16' }));
    // the button
    const ok = st === 'ready';
    const face = ok ? (learnHot ? '#7a52c2' : '#5d3aa0') : '#2a2536';
    plaque(g, LEARN.x + LEARN.w / 2, LEARN.y + LEARN.h / 2, LEARN.w, LEARN.h, face, ok ? '#f5cd5c' : '#0e0b16', ok ? '#a77ee0' : '#3d3550');
    const label = st === 'eaten' ? 'LEARNED' : st === 'locked' ? 'LOCKED' : st === 'unripe' ? 'NOT RIPE' : st === 'costly' ? 'TOO DEAR' : 'LEARN';
    FX.pixelText(g, label, LEARN.x + LEARN.w / 2, LEARN.y + 11, { color: ok ? '#fdf3dc' : '#6a6280', size: 9, ink: 3, inkColor: '#0e0b16' });
    if (!ok && st !== 'eaten') {
      const why = st === 'locked' ? 'EAT THE RANK BELOW' : st === 'unripe' ? `FOREST ${Math.round(f.at * 100)}%` : `NEED ${f.cost}`;
      FX.pixelText(g, why, LEARN.x + LEARN.w / 2, LEARN.y - 12, { color: '#8a7f9a', size: 7, ink: 2, inkColor: '#0e0b16' });
    } else if (ok) {
      Icons.blit(g, 'wdollar', LEARN.x - 34, LEARN.y + 6, 1);
      FX.pixelText(g, String(f.cost), LEARN.x - 16, LEARN.y + 9, { color: PAL.gold3, size: 9, align: 'left', ink: 2, inkColor: '#0e0b16' });
    }
    const learned = FRUITS.filter(owned).length;
    FX.pixelText(g, `${learned}/${FRUITS.length}`, VW - 12, Y + 12, { color: '#6a6280', size: 8, align: 'right', ink: 2, inkColor: '#0e0b16' });
  }

  return {
    init(g) { G = g; }, enter, update, render, click, hover: hoverAt, scroll, state, ripeCount, buy,
    pan, zoomBy, lookAt,
    get busy() { return eating.on; },
  };
})();
