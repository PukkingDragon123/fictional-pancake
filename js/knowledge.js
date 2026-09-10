// ---- Tree of Knowledge: skills hang as fruit on a root network ------------
const Knowledge = (() => {
  let G = null;
  const VW = 640, VH = 360;
  const AW = 320, AH = 450, S = 2;
  const OX = (VW - AW * S) / 2;
  const WORLD_H = AH * S;
  const SURF = 46;                      // screen height of the surface strip
  const cam = { y: 0, ty: 0 };
  let layout = null, hover = -1;
  const eating = { on: false, phase: '', t: 0, fruit: null, wx: 0, wy: 0, dir: 1, bites: 0 };
  const crumbs = [];

  const FRUIT_COL = ['#c4442f', '#8354c9', '#d8a52f'];   // one hue per root

  function ensure() { if (!layout) layout = Props.buildRoots(AW, AH, 707, 0); return layout; }
  function anchorFor(fr) {
    const a = ensure().anchors.filter((an) => an.root === fr.root)[fr.i];
    return a ? { x: OX + a.x * S, y: a.y * S } : { x: VW / 2, y: 200 };
  }
  function owned(f) { return !!G.fruits[f.key]; }
  function ripe(f) { return World.fraction() >= f.at; }
  function state(f) {
    if (owned(f)) return 'eaten';
    if (!ripe(f)) return 'unripe';
    return G.wd >= f.cost ? 'ready' : 'costly';
  }
  function ripeCount() { return FRUITS.filter((f) => state(f) === 'ready').length; }

  function enter() {
    ensure();
    const target = FRUITS.find((f) => state(f) === 'ready') || FRUITS.find((f) => !owned(f)) || FRUITS[0];
    const a = anchorFor(target);
    cam.ty = U.clamp(a.y - VH * 0.5, 0, WORLD_H - VH + SURF);
    cam.y = cam.ty;
    Audio.setMode('pen');
    UI.refreshKnow();
  }
  function scroll(dy) { cam.ty = U.clamp(cam.ty + dy, 0, WORLD_H - VH + SURF); }

  function buy(f) {
    const st = state(f);
    if (st === 'eaten' || eating.on) return;
    if (st === 'unripe') { Audio.play('error'); UI.toast('not ripe', 'bad'); return; }
    if (st === 'costly') { Audio.play('error'); UI.toast('not enough', 'bad'); return; }
    G.wd -= f.cost;
    const a = anchorFor(f);
    eating.on = true; eating.phase = 'approach'; eating.t = 0; eating.fruit = f; eating.bites = 0;
    eating.wx = a.x + (a.x > VW / 2 ? 90 : -90);
    eating.wy = a.y + 30;
    eating.dir = a.x > eating.wx ? 1 : -1;
    cam.ty = U.clamp(a.y - VH * 0.5, 0, WORLD_H - VH + SURF);
    Audio.play('click');
    UI.refreshHUD();
  }

  function update(dt) {
    cam.y = U.lerp(cam.y, cam.ty, 1 - Math.pow(0.002, dt));
    for (let i = crumbs.length - 1; i >= 0; i--) {
      const c = crumbs[i];
      c.life -= dt;
      if (c.life <= 0) { crumbs.splice(i, 1); continue; }
      c.vy += 260 * dt; c.x += c.vx * dt; c.y += c.vy * dt;
    }
    if (!eating.on) return;
    eating.t += dt;
    const f = eating.fruit, a = anchorFor(f);
    switch (eating.phase) {
      case 'approach': {
        const tx = a.x - eating.dir * 16;
        eating.wx = U.lerp(eating.wx, tx, 1 - Math.pow(0.02, dt));
        eating.wy = U.lerp(eating.wy, a.y + 26, 1 - Math.pow(0.02, dt));
        if (Math.abs(eating.wx - tx) < 3) { eating.phase = 'reach'; eating.t = 0; }
        break;
      }
      case 'reach':
        if (eating.t > 0.55) { eating.phase = 'bite'; eating.t = 0; Audio.play('munch'); }
        break;
      case 'bite':
        if (eating.t > 0.34) {
          eating.t = 0; eating.bites++;
          Audio.play('munch');
          for (let i = 0; i < 7; i++) crumbs.push({ x: a.x, y: a.y, vx: U.rand(-50, 50), vy: U.rand(-70, -10), life: U.rand(0.4, 0.8), col: FRUIT_COL[f.root] });
          FX.sparkle(a.x, a.y, 5, PAL.gold4);
          if (eating.bites >= 3) {
            eating.phase = 'done'; eating.t = 0;
            G.fruits[f.key] = true;
            Audio.play('bless');
            FX.ring(a.x, a.y - cam.y, 34, U.rgba(PAL.gold4, 0.7));
            FX.float(a.x, a.y - cam.y - 26, f.name, { color: PAL.gold4, size: 8, life: 1.8 });
            UI.refreshHUD(); UI.refreshKnow();
            Main.save();
          }
        }
        break;
      case 'done':
        if (eating.t > 1.3) { eating.on = false; eating.fruit = null; }
        break;
    }
  }

  function fruitAt(mx, my) {
    for (let i = 0; i < FRUITS.length; i++) {
      const a = anchorFor(FRUITS[i]);
      if (Math.abs(mx - a.x) < 16 && Math.abs(my - (a.y - cam.y)) < 16) return i;
    }
    return -1;
  }
  function click(x, y) {
    if (eating.on) return;
    const i = fruitAt(x, y);
    if (i >= 0) { buy(FRUITS[i]); return; }
    scroll((y - VH / 2) * 0.85);
  }
  function hoverAt(x, y) {
    hover = eating.on ? -1 : fruitAt(x, y);
    if (hover < 0) return null;
    const f = FRUITS[hover], st = state(f);
    const tail = st === 'eaten' ? '<span class="good">eaten</span>'
      : st === 'unripe' ? `<span class="warn">ripens at ${Math.round(f.at * 100)}% forest</span>`
        : `${U.fmt(f.cost)} W$${st === 'costly' ? ' <span class="warn">short</span>' : ''}`;
    return `<b>${f.name}</b><br>${f.desc}<br>${tail}`;
  }

  function render(g) {
    // earth
    for (let i = 0; i < 10; i++) {
      g.fillStyle = U.mix('#3b2a1b', '#171009', i / 9);
      g.fillRect(0, Math.round((VH * i) / 10), VW, Math.ceil(VH / 10) + 1);
    }
    // strata, parallaxed a touch so panning reads as depth
    for (let i = 0; i < 9; i++) {
      const y = ((i * 190 - cam.y * 0.85) % (WORLD_H + 200)) - 100 + SURF;
      g.fillStyle = i % 2 ? 'rgba(85,61,39,0.35)' : 'rgba(36,24,16,0.4)';
      g.fillRect(0, y, VW, 22);
      g.fillStyle = 'rgba(155,122,82,0.14)';
      for (let k = 0; k < 12; k++) g.fillRect((k * 61 + i * 27) % VW, y + 4 + (k % 3) * 5, 7, 2);
    }
    // mycelium, faintly lit, threading between the strata
    g.save();
    g.globalAlpha = 0.2;
    g.strokeStyle = '#7d9c5c'; g.lineWidth = 1;
    for (let i = 0; i < 16; i++) {
      const seed = i * 41;
      const bx = (seed * 7) % VW;
      const by = ((seed * 53) - cam.y * 0.88) % WORLD_H;
      if (by < -40 || by > VH + 40) continue;
      g.beginPath();
      g.moveTo(bx, by + SURF);
      for (let k = 1; k <= 4; k++) g.lineTo(bx + Math.sin(seed + k) * 26 * k * 0.4, by + SURF + k * 13);
      g.stroke();
    }
    g.restore();
    // glowworms
    for (let i = 0; i < 14; i++) {
      const gx = (i * 197) % VW;
      const gy = ((i * 311 + 90) - cam.y * 0.95) % WORLD_H;
      if (gy < -20 || gy > VH + 20) continue;
      const tw = 0.4 + 0.6 * Math.sin(G.time * 2 + i);
      g.fillStyle = `rgba(132,187,89,${0.25 * tw})`;
      Art.ell(g, gx, gy + SURF, 6, 6);
      g.fillStyle = `rgba(179,221,134,${0.7 * tw})`;
      g.fillRect(gx, gy + SURF, 2, 2);
    }
    // stones and worms in the dark
    for (let i = 0; i < 22; i++) {
      const sx = (i * 137) % VW;
      const sy = ((i * 233) - cam.y * 0.92) % WORLD_H;
      if (sy < -20 || sy > VH + 20) continue;
      g.fillStyle = 'rgba(68,62,82,0.5)';
      Art.ell(g, sx, sy + SURF, 5 + (i % 3) * 3, 3 + (i % 2) * 2);
    }
    // the surface, pinned to the top of the shaft
    const surfY = SURF - cam.y;
    if (surfY > -60) {
      g.fillStyle = '#2c2836'; g.fillRect(0, 0, VW, Math.max(0, surfY));
      g.fillStyle = U.mix('#6b6355', '#4f6a3c', World.fraction());
      g.fillRect(0, surfY - 10, VW, 12);
      g.fillStyle = PAL.moss3;
      for (let x = 0; x < VW; x += 5) g.fillRect(x, surfY - 13 - (x % 3), 2, 5);
      g.fillStyle = 'rgba(255,238,176,0.16)';
      g.fillRect(0, surfY, VW, 26);
    }
    // the roots
    const lay = ensure();
    g.drawImage(lay.canvas, OX, Math.round(SURF - cam.y), AW * S, AH * S);
    // fruit
    for (let i = 0; i < FRUITS.length; i++) drawFruit(g, FRUITS[i], i);
    // crumbs
    for (const c of crumbs) {
      g.globalAlpha = U.clamp(c.life * 2, 0, 1);
      g.fillStyle = c.col;
      g.fillRect(Math.round(c.x), Math.round(c.y - cam.y), 2, 2);
    }
    g.globalAlpha = 1;
    // the wombat that comes to eat
    if (eating.on) {
      const a = anchorFor(eating.fruit);
      const sy = eating.wy - cam.y;
      let pose = 'walk', frame = Math.floor(G.time * 9);
      if (eating.phase === 'reach') { pose = 'pray'; frame = Math.floor(eating.t * 8); }
      else if (eating.phase === 'bite') { pose = 'bite'; frame = Math.floor(eating.t * 14); }
      else if (eating.phase === 'done') { pose = 'happy'; frame = Math.floor(eating.t * 10); }
      Sprites.blit(g, eating.wx, sy, pose, frame, G.wombats.length ? G.wombats[0].pelt : 'brown', eating.dir, 'adult', 2);
    }
    FX.drawParticles(g, 0);
    FX.drawFloaters(g, false);
    // edge arrows
    g.textAlign = 'center';
    if (cam.ty > 4) tri(g, VW - 20, 16 + Math.abs(Math.sin(G.time * 3)) * 2, 6, -1);
    if (cam.ty < WORLD_H - VH + SURF - 4) tri(g, VW - 20, VH - 16 - Math.abs(Math.sin(G.time * 3)) * 2, 6, 1);
  }
  function tri(g, x, y, r, dir) {
    g.fillStyle = PAL.parch0;
    for (let i = 0; i < r; i++) g.fillRect(x - (r - i), y + dir * i, (r - i) * 2, 1);
  }

  function drawFruit(g, f, idx) {
    const a = anchorFor(f);
    const y = a.y - cam.y;
    if (y < -40 || y > VH + 40) return;
    const st = state(f);
    const hov = hover === idx;
    const pulse = 0.5 + 0.5 * Math.sin(G.time * 3 + idx);
    const col = FRUIT_COL[f.root];
    // stalk
    g.fillStyle = PAL.bark2; g.fillRect(a.x - 1, y - 14, 2, 7);
    if (st === 'eaten') {
      // a bitten core and two leaves where the fruit hung
      g.fillStyle = PAL.moss3; Art.ell(g, a.x - 5, y - 6, 4, 2.2); Art.ell(g, a.x + 5, y - 7, 4, 2.2);
      g.fillStyle = PAL.parch0; Art.ell(g, a.x, y - 3, 2.4, 3);
      g.fillStyle = PAL.bark1; g.fillRect(a.x - 1, y - 6, 2, 3);
      Icons.blit(g, f.icon, a.x - 6, y + 4, 0.75);
      return;
    }
    if (st === 'ready') {
      const rad = 22 + pulse * 6;
      const gr = g.createRadialGradient(a.x, y, 2, a.x, y, rad);
      gr.addColorStop(0, U.rgba(PAL.gold4, 0.35 + pulse * 0.2)); gr.addColorStop(1, U.rgba(PAL.gold4, 0));
      g.fillStyle = gr; g.fillRect(a.x - rad, y - rad, rad * 2, rad * 2);
    }
    const dim = st === 'unripe';
    const body = dim ? U.mix(col, '#3a3340', 0.65) : col;
    const shine = dim ? U.mix(col, '#3a3340', 0.4) : U.shade(col, 0.35);
    // the fruit, a fat drop
    const bob = Math.sin(G.time * 1.6 + idx) * 1.2;
    g.save(); g.translate(a.x, y + bob);
    Art.ell(g, 0, 1, 10, 11, PAL.ink);
    Art.ell(g, 0, 1, 9, 10, body);
    Art.ell(g, -3, -2, 4, 4, shine);
    Art.ell(g, -4, -3, 1.6, 1.6, PAL.cream);
    g.fillStyle = PAL.moss3;
    Art.ell(g, -6, -8, 4, 2.2, PAL.moss3); Art.ell(g, 6, -9, 4, 2.2, PAL.moss2);
    g.restore();
    Icons.blit(g, f.icon, a.x - 6, y - 5, 0.75);
    if (dim) Icons.blit(g, 'lock', a.x - 6, y + 12, 0.7);
    // price tag on the ones you could take
    if (hov || st === 'ready') {
      g.font = '7px "Press Start 2P", monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
      const label = st === 'unripe' ? Math.round(f.at * 100) + '%' : U.fmt(f.cost);
      const tw = g.measureText(label).width;
      const px = U.clamp(a.x, tw / 2 + 12, VW - tw / 2 - 12), py = y + 24;
      g.fillStyle = PAL.ink; g.fillRect(px - tw / 2 - 5, py - 7, tw + 10, 13);
      g.fillStyle = st === 'ready' ? PAL.gold2 : PAL.bark1; g.fillRect(px - tw / 2 - 4, py - 6, tw + 8, 11);
      g.fillStyle = st === 'ready' ? PAL.ink : PAL.parch1; g.fillText(label, px, py);
    }
  }

  return { init(g) { G = g; }, enter, update, render, click, hover: hoverAt, scroll, state, ripeCount, buy,
    get busy() { return eating.on; } };
})();
