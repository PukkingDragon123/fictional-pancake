// ---- The Tree of Life: a zoomable tree whose fruit are skills --------------
const Knowledge = (() => {
  let G = null;
  const VW = 640, VH = 360;
  const AW = 340, AH = 470;              // art-pixel size of the tree canvas
  const ZMIN = 0.74, ZMAX = 3.2;
  const cam = { x: AW / 2, y: AH * 0.45, z: 0.78, tx: AW / 2, ty: AH * 0.45, tz: 0.78 };
  let tree = null, hover = -1, pinch = 0;
  const eating = { on: false, t: 0, fruit: null, x: 0, y: 0, dir: 1, bites: 0, phase: 'climb' };
  const motes = [], crumbs = [];
  const FRUIT_COL = [
    { skin: '#c4442f', lit: '#e0705a', dark: '#7d2418' },
    { skin: '#8354c9', lit: '#b98ef0', dark: '#452a6e' },
    { skin: '#d8a52f', lit: '#f5cd5c', dark: '#8a5f14' },
  ];

  function ensure() {
    if (!tree) {
      tree = Props.buildLifeTree(AW, AH, 707);
      for (let i = 0; i < 46; i++) motes.push({ x: Math.random() * AW, y: Math.random() * AH, ph: Math.random() * TAU, s: 0.4 + Math.random() * 1.2 });
    }
    return tree;
  }
  function anchorFor(f) {
    const list = ensure().anchors.filter((a) => a.root === f.root);
    return list[f.i] || { x: AW / 2, y: AH * 0.4 };
  }
  const owned = (f) => !!G.fruits[f.key];
  const ripe = (f) => World.fraction() >= f.at;
  function state(f) {
    if (owned(f)) return 'eaten';
    if (!ripe(f)) return 'unripe';
    return G.wd >= f.cost ? 'ready' : 'costly';
  }
  function ripeCount() { return FRUITS.filter((f) => state(f) === 'ready').length; }

  // ---- camera -------------------------------------------------------------
  function sx(wx) { return (wx - cam.x) * cam.z + VW / 2; }
  function sy(wy) { return (wy - cam.y) * cam.z + VH / 2; }
  function wx(s) { return (s - VW / 2) / cam.z + cam.x; }
  function wy(s) { return (s - VH / 2) / cam.z + cam.y; }
  function clampCam() {
    const halfW = VW / 2 / cam.tz, halfH = VH / 2 / cam.tz;
    cam.tx = halfW * 2 > AW ? AW / 2 : U.clamp(cam.tx, halfW, AW - halfW);
    cam.ty = halfH * 2 > AH ? AH / 2 : U.clamp(cam.ty, halfH, AH - halfH);
  }
  function zoomAt(mult, px, py) {
    const before = { x: wx(px), y: wy(py) };
    cam.tz = U.clamp(cam.tz * mult, ZMIN, ZMAX);
    cam.z = cam.tz;
    cam.tx = before.x - (px - VW / 2) / cam.z;
    cam.ty = before.y - (py - VH / 2) / cam.z;
    clampCam();
    cam.x = cam.tx; cam.y = cam.ty;
  }
  function zoomBy(mult) { zoomAt(mult, VW / 2, VH / 2); }
  function pan(dx, dy) { cam.tx -= dx / cam.z; cam.ty -= dy / cam.z; clampCam(); cam.x = cam.tx; cam.y = cam.ty; }
  function lookAt(x, y, z) {
    if (z) cam.tz = U.clamp(z, ZMIN, ZMAX);
    cam.tx = x; cam.ty = y; clampCam();
  }

  function enter() {
    ensure();
    const t = FRUITS.find((f) => state(f) === 'ready') || FRUITS.find((f) => !owned(f)) || FRUITS[0];
    const a = anchorFor(t);
    cam.z = cam.tz = 1.5;
    lookAt(a.x, a.y, 1.5);
    cam.x = cam.tx; cam.y = cam.ty;
    Audio.setMode('pen');
  }

  // ---- buying -------------------------------------------------------------
  function buy(f) {
    const st = state(f);
    if (st === 'eaten' || eating.on) return;
    if (st === 'unripe') { Audio.play('error'); UI.toast('not ripe', 'bad'); return; }
    if (st === 'costly') { Audio.play('error'); UI.toast('not enough', 'bad'); return; }
    G.wd -= f.cost;
    const a = anchorFor(f);
    eating.on = true; eating.t = 0; eating.fruit = f; eating.bites = 0; eating.phase = 'climb';
    eating.dir = a.x < AW / 2 ? 1 : -1;
    eating.x = a.x - eating.dir * 34; eating.y = tree.base;
    lookAt(a.x, a.y - 6, Math.max(cam.tz, 1.9));
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
    const e = eating, a = anchorFor(e.fruit);
    e.t += dt;
    if (e.phase === 'climb') {
      const k = U.easeInOut(Math.min(1, e.t / 1.5));
      e.x = U.lerp(a.x - e.dir * 34, a.x - e.dir * 11, k);
      e.y = U.lerp(tree.base, a.y + 7, k);
      if (e.t >= 1.5) { e.phase = 'bite'; e.t = 0; }
    } else if (e.phase === 'bite') {
      const per = 0.42;
      if (e.t > per * (e.bites + 1) && e.bites < 3) {
        e.bites++;
        Audio.play('munch');
        for (let i = 0; i < 5; i++) crumbs.push({ x: a.x, y: a.y, vx: U.rand(-26, 26), vy: U.rand(-40, -6), t: 0, c: FRUIT_COL[e.fruit.root].skin });
      }
      if (e.bites >= 3 && e.t > per * 3 + 0.3) {
        G.fruits[e.fruit.key] = true;
        FX.sparkle(VW / 2, VH / 2, 16, PAL.gold3);
        Audio.play('bless');
        UI.toast(e.fruit.name, 'good');
        e.phase = 'down'; e.t = 0;
      }
    } else {
      const k = U.easeIn(Math.min(1, e.t / 1.1));
      e.x = U.lerp(a.x - e.dir * 11, a.x - e.dir * 46, k);
      e.y = U.lerp(a.y + 7, tree.base, k);
      if (e.t >= 1.1) { e.on = false; e.fruit = null; UI.refreshAll(); Main.save(); }
    }
  }

  // ---- input --------------------------------------------------------------
  function fruitAt(px, py) {
    let best = -1, bd = 1e9;
    FRUITS.forEach((f, i) => {
      const a = anchorFor(f);
      const d = Math.hypot(sx(a.x) - px, sy(a.y) - py);
      const r = Math.max(16, 11 * cam.z);
      if (d < r && d < bd) { bd = d; best = i; }
    });
    return best;
  }
  function click(px, py) {
    const i = fruitAt(px, py);
    if (i >= 0) buy(FRUITS[i]);
  }
  function hoverAt(px, py) {
    hover = fruitAt(px, py);
    if (hover < 0) return null;
    const f = FRUITS[hover], st = state(f);
    const tag = st === 'eaten' ? '<span class="good">eaten</span>'
      : st === 'unripe' ? `<span class="warn">ripens at ${Math.round(f.at * 100)}%</span>`
        : `${Icons.img('wdollar', 'sm')} ${f.cost}`;
    return `<b>${f.name}</b><br>${f.desc}<br>${tag}`;
  }
  function scroll(dy, px, py) { zoomAt(dy < 0 ? 1.16 : 1 / 1.16, px ?? VW / 2, py ?? VH / 2); }

  // ---- scene --------------------------------------------------------------
  function render(g) {
    ensure();
    const t = G.time;
    // deep night sky, slow aurora
    const sky = g.createLinearGradient(0, 0, 0, VH);
    sky.addColorStop(0, '#0a0714'); sky.addColorStop(0.55, '#150f24'); sky.addColorStop(1, '#241830');
    g.fillStyle = sky; g.fillRect(0, 0, VW, VH);
    g.globalAlpha = 0.2;
    for (let i = 0; i < 4; i++) {
      g.fillStyle = ['#2a2050', '#1d3a44', '#3a2450', '#1f2f4a'][i];
      const y = 20 + i * 26 + Math.sin(t * 0.3 + i) * 10;
      g.fillRect(0, y, VW, 16);
    }
    g.globalAlpha = 1;
    for (let i = 0; i < 60; i++) {
      const x = (i * 97) % VW, y = (i * 53) % 150;
      g.fillStyle = i % 5 === 0 ? PAL.gold3 : 'rgba(240,235,255,0.6)';
      if ((Math.sin(t * 1.6 + i) + 1) > 0.4) g.fillRect(x, y, 1, 1);
    }

    g.save();
    g.translate(VW / 2, VH / 2);
    g.scale(cam.z, cam.z);
    g.translate(-cam.x, -cam.y);

    // soft glow behind the canopy
    const gl = g.createRadialGradient(AW / 2, tree.topY, 10, AW / 2, tree.topY, AW * 0.55);
    gl.addColorStop(0, 'rgba(133,84,201,0.28)'); gl.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gl; g.fillRect(0, 0, AW, AH);
    g.imageSmoothingEnabled = false;
    g.drawImage(tree.canvas, 0, 0);

    // ground line under the roots
    g.fillStyle = '#160f1c'; g.fillRect(-200, tree.base + 6, AW + 400, AH);
    g.fillStyle = '#221830'; g.fillRect(-200, tree.base + 6, AW + 400, 3);

    // drifting motes
    for (const m of motes) {
      const a = 0.3 + 0.5 * (Math.sin(t * 1.1 + m.ph) * 0.5 + 0.5);
      g.fillStyle = `rgba(245,205,92,${a.toFixed(2)})`;
      g.fillRect(Math.round(m.x + Math.sin(t * 0.4 + m.ph) * 12), Math.round(m.y + Math.cos(t * 0.31 + m.ph) * 9), m.s < 1 ? 1 : 2, m.s < 1 ? 1 : 2);
    }

    FRUITS.forEach((f, i) => drawFruit(g, f, anchorFor(f), i === hover, t));
    for (const c of crumbs) { g.fillStyle = c.c; g.fillRect(Math.round(c.x), Math.round(c.y), 2, 2); }
    if (eating.on) drawEater(g);
    g.restore();

    // vignette
    const vg = g.createRadialGradient(VW / 2, VH / 2, VH * 0.34, VW / 2, VH / 2, VH * 0.86);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(6,4,10,0.72)');
    g.fillStyle = vg; g.fillRect(0, 0, VW, VH);
    FX.drawParticles(g, 0);
    FX.drawFloaters(g, false);
  }

  function drawFruit(g, f, a, hot, t) {
    const st = state(f);
    const col = FRUIT_COL[f.root];
    const bob = Math.sin(t * 1.7 + f.i * 1.3 + f.root) * 1.4;
    const x = Math.round(a.x), y = Math.round(a.y + bob);
    if (st === 'eaten') {                       // a bare stem and two leaves
      g.fillStyle = PAL.bark1; g.fillRect(x, y - 5, 1, 5);
      g.fillStyle = PAL.moss3; g.fillRect(x - 4, y - 2, 3, 2); g.fillRect(x + 2, y - 4, 3, 2);
      return;
    }
    const r = st === 'unripe' ? 4.5 : 6;
    if (st === 'unripe') {                      // a faint husk, so every seat reads
      g.globalAlpha = 0.5;
      Art.ellBand(g, x, y, r + 3, r + 3, 1, '#6f8a5c');
      g.globalAlpha = 1;
    }
    if (st === 'ready') {                       // halo
      const pulse = 0.5 + 0.5 * Math.sin(t * 3 + f.i);
      g.globalAlpha = 0.22 + pulse * 0.24;
      g.fillStyle = col.lit;
      g.beginPath(); g.arc(x, y, r + 6 + pulse * 2, 0, TAU); g.fill();
      g.globalAlpha = 1;
    }
    g.fillStyle = PAL.bark1; g.fillRect(x, y - r - 4, 1, 4);
    g.fillStyle = PAL.moss3; g.fillRect(x + 1, y - r - 4, 3, 2);
    const body = st === 'unripe' ? '#3c4a2e' : col.skin;
    Art.ell(g, x, y, r, r * 1.08, body);
    Art.ell(g, x - r * 0.36, y - r * 0.34, r * 0.42, r * 0.4, st === 'unripe' ? '#4e6039' : col.lit);
    Art.ell(g, x + r * 0.4, y + r * 0.42, r * 0.34, r * 0.3, col.dark);
    if (st !== 'unripe') {
      Icons.blit(g, f.icon, x - 5, y - 5, 0.62);
      if (st === 'costly') { g.globalAlpha = 0.55; g.fillStyle = '#0b0812'; Art.ell(g, x, y, r, r * 1.08, '#0b0812'); g.globalAlpha = 1; Icons.blit(g, 'lock', x - 4, y - 4, 0.5); }
    }
    Art.ell(g, x, y, r, r * 1.08, 'rgba(0,0,0,0)');
    if (hot) {
      g.strokeStyle = PAL.cream; g.lineWidth = 1;
      g.strokeRect(x - r - 3.5, y - r - 3.5, (r + 3.5) * 2, (r + 4) * 2);
    }
  }

  function drawEater(g) {
    const e = eating;
    const bite = e.phase === 'bite' ? Math.max(0, Math.sin(e.t * 7.5)) : 0;
    const pose = e.phase === 'bite' ? 'eat' : 'run';
    const fr = Math.floor(G.time * 9);
    Sprites.blit(g, e.x, e.y, pose, fr, 'brown', e.dir, 'adult', 0.62, bite * 0.18);
  }

  return {
    init(g) { G = g; }, enter, update, render, click, hover: hoverAt, scroll, state, ripeCount, buy,
    pan, zoomBy, lookAt,
    get busy() { return eating.on; },
  };
})();
