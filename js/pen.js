// ---- The farm: wombat simulation and the paddock scene --------------------
const Pen = (() => {
  let G = null;
  const W = 640, H = 360;
  const HORIZON = 148, FRONT = 330, SOIL = 336;
  const WALK = { x0: 44, x1: 596, y0: 216, y1: 318 };
  const TREE = { x: 320, y: 212, w: 120, h: 176 };   // screen size of the farm tree
  const groundCubes = [];
  let troughT = 0, hoverW = null, hoverTree = false;

  // scenery scatter, fixed at boot so the farm looks the same every visit
  const R0 = Art.rng(20260907);
  const tufts = [], stones = [], blooms = [], bushes = [];
  for (let i = 0; i < 90; i++) tufts.push([R0() * W, HORIZON + 6 + R0() * (FRONT - HORIZON - 8), R0() < 0.5 ? 0 : 1]);
  for (let i = 0; i < 7; i++) stones.push([40 + R0() * 560, HORIZON + 20 + R0() * 150, Math.floor(R0() * 3)]);
  for (let i = 0; i < 9; i++) blooms.push([30 + R0() * 580, HORIZON + 14 + R0() * 160, Math.floor(R0() * 4)]);
  for (let i = 0; i < 6; i++) bushes.push([20 + R0() * 600, HORIZON + 4 + R0() * 30, Math.floor(R0() * 2)]);
  const clouds = []; for (let i = 0; i < 5; i++) clouds.push({ x: R0() * W, y: 10 + R0() * 60, w: 34 + R0() * 46, s: 3 + R0() * 6 });
  const birds = []; for (let i = 0; i < 3; i++) birds.push({ x: R0() * W, y: 30 + R0() * 40, s: 14 + R0() * 10, ph: R0() * TAU });
  const flits = []; for (let i = 0; i < 8; i++) flits.push({ x: R0() * W, y: HORIZON + 20 + R0() * 140, ph: R0() * TAU, sp: 0.6 + R0() * 0.8 });

  // ---- derived stats ------------------------------------------------------
  function farmHas(k) { return !!G.farm[k]; }
  function hapCap() { let c = 60; for (const it of FARM_ITEMS) if (farmHas(it.key) && it.cap) c += it.cap; return c; }
  function appeal() { let a = 1; for (const it of FARM_ITEMS) if (farmHas(it.key) && it.appeal) a += it.appeal; return a; }
  function regen() { let r = 0; for (const it of FARM_ITEMS) if (farmHas(it.key) && it.regen) r += it.regen; return r; }
  function digestMult(w) {
    let m = 0.6 + (w.hap / 100) * 0.9;
    if (G.skills.gut) m *= 1.25;
    if (farmHas('tunnel')) m *= 1.08;
    return m;
  }
  function wombatCap() { return 2 + (G.fac.fence || 0); }
  function itemPos(it) { return [WALK.x0 + it.spot[0] * (WALK.x1 - WALK.x0), WALK.y0 + it.spot[1] * (WALK.y1 - WALK.y0)]; }

  function newWombat() {
    const used = new Set(G.wombats.map((w) => w.name));
    const name = WOMBAT_NAMES.find((n) => !used.has(n)) || 'Wombat';
    return {
      id: U.uid(), name, x: 0, y: U.rand(WALK.y0, WALK.y1),
      tx: 0, ty: 0, dir: 1, state: 'idle', stateT: U.rand(0.4, 2),
      stomach: 'empty', food: null, digestT: 0, digestTotal: 1,
      hap: 55, pets: [], grumpyT: 0, anim: U.rand(0, 9), sq: 0, strain: 0, toy: null,
      pal: U.randi(0, FUR.length - 1),
    };
  }
  function addWombat() {
    const w = newWombat();
    // arrivals walk in through the gate, then wander off; separation spreads the herd
    w.x = 320 + U.rand(-14, 14);
    w.y = WALK.y0 + U.rand(0, 8);
    w.placed = true;
    w.tx = U.rand(WALK.x0, WALK.x1); w.ty = U.rand(WALK.y0, WALK.y1);
    w.state = 'walk';
    G.wombats.push(w);
    FX.dust(w.x, w.y, 8, PAL.soil2);
    return w;
  }

  // ---- simulation ---------------------------------------------------------
  function update(dt) {
    const cap = hapCap();
    const decay = 0.5 * (G.skills.calm ? 0.6 : 1);
    const reg = regen();
    for (const w of G.wombats) {
      w.anim += dt;
      w.hap = U.clamp(w.hap - decay * dt + (w.hap < cap ? reg * dt : 0), 0, cap);
      if (w.grumpyT > 0) w.grumpyT -= dt;
      if (w.state === 'play') w.hap = Math.min(cap, w.hap + 2.2 * dt);

      if (w.stomach === 'digesting') {
        w.digestT -= dt * digestMult(w);
        if (w.digestT <= 0) { w.stomach = 'ready'; w.strain = 2; w.state = 'strain'; w.stateT = 2; }
      } else if (w.stomach === 'ready') {
        w.strain -= dt;
        if (w.strain <= 0) poop(w);
      }

      w.stateT -= dt;
      if (w.state === 'walk') {
        const dx = w.tx - w.x, dy = w.ty - w.y, d = Math.hypot(dx, dy);
        if (d < 3) { w.state = w.toy ? 'play' : 'idle'; w.stateT = w.toy ? U.rand(3, 5) : U.rand(1, 3.5); }
        else { w.x += (dx / d) * 26 * dt; w.y += (dy / d) * 26 * dt; w.dir = dx > 0 ? 1 : -1; }
      } else if (w.stateT <= 0 && w.state !== 'strain') {
        if (w.state === 'play') w.toy = null;
        const r = Math.random();
        const toys = FARM_ITEMS.filter((it) => farmHas(it.key) && it.regen);
        if (r < 0.28 && toys.length) {
          const it = U.pick(toys); const [ix, iy] = itemPos(it);
          w.toy = it.key; w.tx = U.clamp(ix + U.rand(-22, 22), WALK.x0, WALK.x1); w.ty = U.clamp(iy + U.rand(0, 12), WALK.y0, WALK.y1); w.state = 'walk';
        } else if (r < 0.7) { w.tx = U.rand(WALK.x0, WALK.x1); w.ty = U.rand(WALK.y0, WALK.y1); w.state = 'walk'; }
        else if (r < 0.82 && w.hap < 34) { w.state = 'sleep'; w.stateT = U.rand(4, 8); }
        else { w.state = 'idle'; w.stateT = U.rand(1, 3); if (U.chance(0.3)) w.dir = -w.dir; }
      }
      if (w.state === 'strain' && w.stateT <= 0 && w.stomach !== 'ready') { w.state = 'idle'; w.stateT = 1; }
      w.sq = U.lerp(w.sq, 0, 1 - Math.pow(0.001, dt));
    }

    // gentle separation so the herd does not pile into one silhouette
    for (let i = 0; i < G.wombats.length; i++) for (let j = i + 1; j < G.wombats.length; j++) {
      const a = G.wombats[i], b = G.wombats[j];
      const dx = b.x - a.x, dy = b.y - a.y;
      if (Math.abs(dx) < 34 && Math.abs(dy) < 13) {
        const push = (34 - Math.abs(dx)) * 0.5 * dt * 7 * (dx >= 0 ? 1 : -1);
        a.x = U.clamp(a.x - push, WALK.x0, WALK.x1);
        b.x = U.clamp(b.x + push, WALK.x0, WALK.x1);
      }
    }

    // loose cubes on the ground
    const bar = G.fac.barrow || 0;
    for (let i = groundCubes.length - 1; i >= 0; i--) {
      const c = groundCubes[i];
      c.t += dt;
      if (c.z > 0 || c.vz > 0) {
        c.vz -= 620 * dt; c.z += c.vz * dt; c.x += c.vx * dt; c.spin += c.vs * dt;
        if (c.z <= 0) {
          c.z = 0;
          if (Math.abs(c.vz) > 60) { c.vz = -c.vz * 0.35; c.vx *= 0.5; c.vs *= 0.4; FX.dust(c.x, c.y, 4); }
          else { c.vz = 0; c.vx = 0; c.vs = 0; c.spin = 0; }
        }
      }
      if (bar > 0 && c.t > (bar >= 3 ? 0.35 : 4 / bar)) collect(c, i, true);
    }

    // auto trough
    const tl = G.fac.trough || 0;
    if (tl > 0 && G.troughFood && G.unlocked[G.troughFood]) {
      troughT += dt;
      if (troughT >= 15 / tl) {
        troughT = 0;
        const hungry = G.wombats.find((w) => w.stomach === 'empty' && w.state !== 'strain');
        if (hungry && (G.food[G.troughFood] || 0) > 0) feed(hungry, G.troughFood, true);
      }
    }

    for (const f of flits) { f.ph += dt * f.sp; f.x += Math.cos(f.ph * 1.7) * 14 * dt; f.y += Math.sin(f.ph * 2.3) * 9 * dt; }
  }

  function feed(w, key, auto) {
    const f = FOOD_BY_KEY[key];
    if (!f) return false;
    if ((G.food[key] || 0) <= 0) { if (!auto) { UI.toast('Out of ' + f.name + '.', 'bad'); Audio.play('error'); } return false; }
    if (w.stomach !== 'empty') { if (!auto) { UI.toast(w.name + ' is full.', 'bad'); Audio.play('error'); } return false; }
    G.food[key]--;
    w.stomach = 'digesting'; w.food = key; w.digestTotal = f.digest; w.digestT = f.digest;
    w.hap = Math.min(hapCap(), w.hap + f.hap);
    w.state = 'eat'; w.stateT = 1.5; w.sq = 0.22;
    G.stats.fed++;
    Audio.play('eat');
    FX.burst(w.x + w.dir * 20, w.y - 14, 7, { color: [PAL.leaf2, PAL.gold, PAL.wood3], speed: 55, gravity: 280, life: 0.55, size: 2 });
    UI.refreshFeedBar();
    return true;
  }

  function pet(w) {
    if (w.grumpyT > 0) { Audio.play('error'); w.sq = 0.12; FX.burst(w.x, w.y - 34, 4, { color: [PAL.redL], speed: 30, life: 0.4, size: 2 }); return; }
    const now = G.time;
    w.pets = w.pets.filter((t) => now - t < 4);
    w.pets.push(now);
    if (w.pets.length > 7 && !G.skills.calm) {
      w.grumpyT = 6; w.hap = Math.max(0, w.hap - 18); w.pets = [];
      Audio.play('squeak'); FX.shake(2.5);
      FX.burst(w.x, w.y - 32, 8, { color: [PAL.red, PAL.redL], speed: 60, life: 0.5, size: 2 });
      return;
    }
    const gentle = G.skills.paws;
    w.hap = Math.min(hapCap(), w.hap + 7 * (gentle ? 1.7 : 1));
    if (w.stomach === 'digesting') w.digestT = Math.max(0.01, w.digestT - (2 + (gentle ? 3 : 0)));
    w.sq = 0.28;
    if (w.state === 'sleep' || w.state === 'walk') { w.state = 'idle'; w.stateT = 0.9; }
    G.stats.pets++;
    Audio.play('pet');
    FX.hearts(w.x, w.y - 32, 3);
  }

  function poop(w) {
    const f = FOOD_BY_KEY[w.food] || FOODS[0];
    const def = CUBES[f.cube];
    let n = 1;
    if (G.skills.twin && U.chance(0.2)) n = 2;
    const premChance = (w.hap / 100) * 0.28;
    for (let i = 0; i < n; i++) {
      const premium = U.chance(premChance);
      groundCubes.push({
        x: w.x - w.dir * 18, y: w.y + U.rand(-2, 2), z: 9, vz: U.rand(110, 180),
        vx: -w.dir * U.rand(24, 60), spin: 0, vs: U.rand(-4, 4),
        type: def.key, premium, t: -i * 0.16, id: U.uid(),
      });
      if (premium) FX.sparkle(w.x - w.dir * 18, w.y - 12, 9);
    }
    w.stomach = 'empty'; w.food = null; w.state = 'idle'; w.stateT = 1.2; w.sq = -0.3;
    G.stats.pooped += n;
    Audio.play('plop'); FX.shake(2); FX.punch(0.025);
    FX.dust(w.x - w.dir * 16, w.y + 2, 9, PAL.soil2);
  }

  function collect(c, i, auto) {
    if (i === undefined) i = groundCubes.indexOf(c);
    if (i >= 0) groundCubes.splice(i, 1);
    const bag = c.premium ? G.premium : G.cubes;
    bag[c.type] = (bag[c.type] || 0) + 1;
    G.stats.collected++;
    Audio.play(auto ? 'click' : 'pop');
    FX.burst(c.x, c.y - c.z, 7, { color: [CUBES[c.type].color, PAL.cream], speed: 70, gravity: 90, life: 0.4, size: 2 });
    FX.float(c.x, c.y - c.z - 12, (c.premium ? '+' : '+') + '1', { color: c.premium ? PAL.gold : PAL.cream, size: 8 });
    UI.refreshHUD(); UI.refreshCubeBar();
  }

  function offline(seconds) {
    const steps = Math.min(4000, Math.floor(seconds / 2));
    let made = 0;
    for (let s = 0; s < steps; s++) {
      for (const w of G.wombats) {
        if (w.stomach === 'digesting') { w.digestT -= 2 * digestMult(w); if (w.digestT <= 0) w.stomach = 'ready'; }
        if (w.stomach === 'ready') {
          const f = FOOD_BY_KEY[w.food] || FOODS[0];
          G.cubes[CUBES[f.cube].key] = (G.cubes[CUBES[f.cube].key] || 0) + 1;
          made++; w.stomach = 'empty'; w.food = null;
        }
        w.hap = Math.max(0, w.hap - 0.18);
      }
      const tl = G.fac.trough || 0;
      if (tl > 0 && G.troughFood && s % Math.max(1, Math.round(7 / tl)) === 0) {
        const hungry = G.wombats.find((w) => w.stomach === 'empty');
        if (hungry && (G.food[G.troughFood] || 0) > 0) {
          const f = FOOD_BY_KEY[G.troughFood];
          G.food[G.troughFood]--; hungry.stomach = 'digesting'; hungry.food = f.key; hungry.digestT = f.digest; hungry.digestTotal = f.digest;
        }
      }
    }
    return made;
  }

  // ---- input --------------------------------------------------------------
  function wombatAt(x, y) {
    let best = null, bd = 1e9;
    for (const w of G.wombats) {
      if (x > w.x - 30 && x < w.x + 30 && y > w.y - 40 && y < w.y + 6) { const d = Math.abs(w.y - y); if (d < bd) { bd = d; best = w; } }
    }
    return best;
  }
  function overTree(x, y) { return x > TREE.x - 34 && x < TREE.x + 34 && y > TREE.y - TREE.h && y < TREE.y + 6; }

  function click(x, y) {
    for (let i = groundCubes.length - 1; i >= 0; i--) {
      const c = groundCubes[i], s = CUBES[c.type].w * 11 + 7;
      if (Math.abs(x - c.x) < s && Math.abs(y - (c.y - c.z - 8)) < s) { collect(c, i, false); return; }
    }
    const w = wombatAt(x, y);
    if (w) { if (G.selFood) feed(w, G.selFood, false); else pet(w); return; }
    if (overTree(x, y)) { Main.setMode('tree'); return; }
    if (y > HORIZON && y < FRONT) FX.dust(x, y, 3);
  }
  function hover(x, y) {
    hoverW = wombatAt(x, y);
    hoverTree = !hoverW && overTree(x, y);
    if (hoverW) {
      const w = hoverW;
      const state = w.stomach === 'empty' ? 'Hungry' : w.stomach === 'digesting' ? `Digesting ${FOOD_BY_KEY[w.food].name}, ${U.time(w.digestT / digestMult(w))}` : 'About to go';
      return `<b>${w.name}</b><br>${state}<br>Happy ${Math.round(w.hap)}/${hapCap()} &middot; speed x${digestMult(w).toFixed(2)}${w.grumpyT > 0 ? '<br><span class="warn">Grumpy</span>' : ''}`;
    }
    if (hoverTree) {
      const st = TREE_STAGES[G.tree.stage];
      return `<b>Wombat Tree &middot; ${st.name}</b><br>${st.note}<br>Click to climb`;
    }
    for (const c of groundCubes) if (Math.abs(x - c.x) < 15 && Math.abs(y - (c.y - c.z - 8)) < 15) return `<b>${c.premium ? 'Premium ' : ''}${CUBES[c.type].name}</b><br>Click to pick up`;
    return null;
  }

  // ---- scene --------------------------------------------------------------
  function dayT() { return (G.time / 320) % 1; }
  function night() { const t = dayT(); return t > 0.76 ? U.clamp((t - 0.76) / 0.08, 0, 1) * (t > 0.96 ? (1 - t) / 0.04 : 1) : 0; }
  const SKYKEYS = [
    [0.00, ['#f0a878', '#f8d8a8']], [0.12, ['#8ec8e8', '#cfeaf6']], [0.45, ['#69bfe4', '#bfe7f5']],
    [0.66, ['#f2a05c', '#f8d09a']], [0.78, ['#8a5a8a', '#e08a72']], [0.88, ['#243060', '#4a5a8a']],
    [0.94, ['#141a3a', '#2a3560']], [1.00, ['#f0a878', '#f8d8a8']],
  ];
  function mixHex(a, b, f) {
    const n1 = parseInt(a.slice(1), 16), n2 = parseInt(b.slice(1), 16);
    const r = Math.round(U.lerp((n1 >> 16) & 255, (n2 >> 16) & 255, f));
    const g2 = Math.round(U.lerp((n1 >> 8) & 255, (n2 >> 8) & 255, f));
    const b2 = Math.round(U.lerp(n1 & 255, n2 & 255, f));
    return '#' + ((1 << 24) | (r << 16) | (g2 << 8) | b2).toString(16).slice(1);
  }
  function skyPair(t) {
    let a = SKYKEYS[0], b = SKYKEYS[1];
    for (let i = 0; i < SKYKEYS.length - 1; i++) if (t >= SKYKEYS[i][0] && t <= SKYKEYS[i + 1][0]) { a = SKYKEYS[i]; b = SKYKEYS[i + 1]; break; }
    const f = (t - a[0]) / ((b[0] - a[0]) || 1);
    return [mixHex(a[1][0], b[1][0], f), mixHex(a[1][1], b[1][1], f)];
  }

  function render(g) {
    const t = dayT(), nt = night();
    const [top, bot] = skyPair(t);
    // banded sky reads as pixel art rather than a smooth gradient
    const BANDS = 9;
    for (let i = 0; i < BANDS; i++) {
      g.fillStyle = mixHex(top, bot, i / (BANDS - 1));
      g.fillRect(0, Math.round((HORIZON * i) / BANDS), W, Math.ceil(HORIZON / BANDS) + 1);
    }
    // sun / moon
    if (t > 0.04 && t < 0.72) {
      const p = (t - 0.04) / 0.68, sx = 40 + (W - 80) * p, sy = HORIZON - 24 - Math.sin(p * Math.PI) * 96;
      g.fillStyle = 'rgba(255,240,180,0.25)'; Art.ell(g, sx, sy, 16, 16);
      g.fillStyle = PAL.goldL; Art.ell(g, sx, sy, 10, 10);
      g.fillStyle = '#fffbe8'; Art.ell(g, sx - 2, sy - 2, 6, 6);
    } else {
      const p = t >= 0.72 ? (t - 0.72) / 0.32 : (t + 0.28) / 0.32;
      const mx = 40 + (W - 80) * p, my = HORIZON - 40 - Math.sin(p * Math.PI) * 80;
      g.fillStyle = 'rgba(220,230,255,0.18)'; Art.ell(g, mx, my, 13, 13);
      g.fillStyle = '#e8ecff'; Art.ell(g, mx, my, 8, 8);
      g.fillStyle = mixHex(top, bot, 0.2); Art.ell(g, mx + 4, my - 3, 7, 7);
    }
    if (nt > 0) {
      g.globalAlpha = nt;
      for (let i = 0; i < 46; i++) {
        const sx = (i * 137.3) % W, sy = (i * 61.7) % (HORIZON - 24);
        g.fillStyle = i % 5 === 0 ? PAL.cream : '#dfe6ff';
        const tw = 0.55 + 0.45 * Math.sin(G.time * 2.4 + i);
        g.globalAlpha = nt * tw; g.fillRect(sx, sy, 1 + (i % 3 === 0 ? 1 : 0), 1);
      }
      g.globalAlpha = 1;
    }
    // clouds
    for (const c of clouds) {
      c.x += c.s * 0.014; if (c.x > W + 70) c.x = -c.w - 10;
      const a = 0.9 - nt * 0.55;
      g.fillStyle = `rgba(255,252,244,${a})`;
      g.fillRect(c.x, c.y, c.w, 8); g.fillRect(c.x + 7, c.y - 5, c.w - 14, 8); g.fillRect(c.x + 16, c.y - 9, c.w * 0.42, 6);
      g.fillStyle = `rgba(226,214,198,${a * 0.8})`; g.fillRect(c.x, c.y + 6, c.w, 2);
    }
    // birds
    if (nt < 0.4) for (const b of birds) {
      b.x += b.s * 0.02; if (b.x > W + 20) b.x = -20;
      const f = Math.sin(G.time * 7 + b.ph) * 2;
      g.fillStyle = 'rgba(50,42,60,0.75)';
      g.fillRect(b.x - 3, b.y - f, 3, 1); g.fillRect(b.x + 1, b.y - f, 3, 1); g.fillRect(b.x, b.y, 1, 1);
    }

    // distant hills
    g.fillStyle = '#7fae6a';
    for (let i = 0; i < 6; i++) Art.ell(g, i * 128 - 30, HORIZON + 4, 96, 30 + (i % 3) * 8);
    g.fillStyle = PAL.grass1;
    for (let i = 0; i < 8; i++) Art.ell(g, i * 92 + 20, HORIZON + 8, 68, 22);
    // treeline
    for (let i = 0; i < 22; i++) {
      const tx = 8 + i * 30 + (i % 2) * 8, th = 16 + (i % 3) * 5;
      g.fillStyle = PAL.bark1; g.fillRect(tx - 1, HORIZON - 4, 3, 8);
      g.fillStyle = i % 2 ? PAL.leaf0 : PAL.leaf1; Art.ell(g, tx, HORIZON - 8 - th * 0.3, 9, th * 0.55);
      g.fillStyle = PAL.leaf2; Art.ell(g, tx - 2, HORIZON - 11 - th * 0.3, 5, th * 0.3);
    }
    // buildings
    g.drawImage(Props.get('barn'), 24, HORIZON - 62);
    g.drawImage(Props.get('silo'), 122, HORIZON - 68);
    for (const [bx, by, v] of bushes) g.drawImage(Props.get('bush', v), Math.round(bx), Math.round(by) - 18);

    // paddock
    g.fillStyle = PAL.grass2; g.fillRect(0, HORIZON, W, FRONT - HORIZON);
    g.globalAlpha = 0.22; g.fillStyle = PAL.grass1;
    for (let i = 0; i < 5; i++) Art.ell(g, 60 + i * 141, HORIZON + 34 + (i % 2) * 56, 74, 15);
    g.globalAlpha = 0.3; g.fillStyle = PAL.grass3;
    Art.ell(g, 320, HORIZON + 20, 140, 13);
    Art.ell(g, 150, HORIZON + 96, 66, 12); Art.ell(g, 500, HORIZON + 118, 70, 13);
    g.globalAlpha = 1;
    // worn path from the gate down to the foot of the tree
    for (let y = HORIZON - 2; y < TREE.y + 6; y += 3) {
      const t = (y - HORIZON) / (TREE.y + 6 - HORIZON);
      const w2 = 6 + t * 7 + Math.sin(y * 0.09) * 1.5;
      g.fillStyle = '#8a6a48'; g.fillRect(320 - w2, y, w2 * 2, 3);
      g.fillStyle = PAL.soil2; g.fillRect(320 - w2, y, 2, 3); g.fillRect(320 + w2 - 2, y, 2, 3);
    }
    g.fillStyle = PAL.soil2;
    for (let y = HORIZON + 4; y < TREE.y; y += 12) g.fillRect(316 + ((y * 11) % 9), y, 4, 2);
    // trodden clearing under the canopy, widening as the tree grows
    const cw = 16 + G.tree.stage * 7;
    g.fillStyle = PAL.soil2; Art.ell(g, TREE.x, TREE.y + 4, cw, cw * 0.24);
    g.fillStyle = PAL.soil1; Art.ell(g, TREE.x, TREE.y + 3, cw * 0.84, cw * 0.19);
    // kitchen garden in the near corner
    for (let row = 0; row < 3; row++) {
      const ry = FRONT - 56 + row * 10, rx = 100;
      g.fillStyle = PAL.soil0; g.fillRect(rx, ry, 98, 6);
      g.fillStyle = PAL.soil1; g.fillRect(rx, ry, 98, 2);
      g.fillStyle = PAL.soil0;
      for (let k = 0; k < 12; k++) g.fillRect(rx + 4 + k * 8, ry + 3, 3, 2);
      for (let k = 0; k < 10; k++) {
        const px = rx + 6 + k * 10;
        g.fillStyle = PAL.leaf0; g.fillRect(px, ry - 5, 2, 6);
        g.fillStyle = PAL.leaf2; g.fillRect(px - 2, ry - 7, 2, 2); g.fillRect(px + 2, ry - 6, 2, 2);
        g.fillStyle = PAL.leaf3; g.fillRect(px, ry - 8, 2, 2);
        if (row === 1 && k % 3 === 0) { g.fillStyle = PAL.red; g.fillRect(px - 1, ry - 9, 3, 2); }
      }
    }
    // puddle
    g.fillStyle = PAL.water0; Art.ell(g, 560, HORIZON + 84, 26, 7);
    g.fillStyle = PAL.water1; Art.ell(g, 560, HORIZON + 83, 23, 5);
    g.fillStyle = PAL.water2; Art.ell(g, 553, HORIZON + 82, 8, 2);
    // grass tufts
    for (const [gx, gy, k] of tufts) {
      if (Math.abs(gx - 320) < 17 && gy < TREE.y + 12) continue;
      if (gy > FRONT - 64 && gy < FRONT - 22 && gx > 90 && gx < 204) continue;
      g.fillStyle = k ? PAL.grass3 : PAL.grass0;
      g.fillRect(gx, gy, 1, 3); g.fillRect(gx + 2, gy - 1, 1, 4); g.fillRect(gx + 1, gy + 1, 1, 2);
    }
    for (const [sx, sy, v] of stones) g.drawImage(Props.get('rock', v), Math.round(sx), Math.round(sy) - 10);
    g.drawImage(Props.get('bush', 1), 20, HORIZON + 40);
    g.drawImage(Props.get('bush', 0), 596, HORIZON + 58);
    if (farmHas('flowerbed')) for (const [bx, by, v] of blooms) g.drawImage(Props.get('flowers', v), Math.round(bx), Math.round(by) - 12);
    // back fence + gate
    fence(g, HORIZON - 4);
    // static furniture
    g.drawImage(Props.get('hay'), 552, HORIZON + 6);
    g.drawImage(Props.get('crate'), 96, HORIZON + 16);
    g.drawImage(Props.get('sign'), 40, FRONT - 46);
    if ((G.fac.trough || 0) > 0) g.drawImage(Props.get('trough'), 430, HORIZON + 14);
    if ((G.fac.barrow || 0) > 0) g.drawImage(Props.get('barrow'), 468, HORIZON + 30);

    // depth-sorted actors
    const items = [];
    const tree = Props.buildTree(TREE.w / 2, TREE.h / 2, G.tree.stage, 1337);
    items.push({ y: TREE.y, fn: () => drawFarmTree(g, tree, nt) });
    for (const it of FARM_ITEMS) if (farmHas(it.key) && it.spot) {
      const [ix, iy] = itemPos(it);
      items.push({ y: iy, fn: () => drawFarmItem(g, it, ix, iy) });
    }
    for (const w of G.wombats) items.push({ y: w.y, fn: () => drawWombat(g, w) });
    for (const c of groundCubes) items.push({ y: c.y, fn: () => drawGroundCube(g, c) });
    items.sort((a, b) => a.y - b.y);
    for (const it of items) it.fn();

    FX.drawParticles(g, 0);
    // butterflies by day, fireflies by night
    for (const f of flits) {
      if (nt > 0.5) { const a = 0.4 + 0.6 * Math.sin(f.ph * 3); g.fillStyle = `rgba(250,240,150,${a})`; g.fillRect(Math.round(f.x), Math.round(f.y), 2, 2); }
      else if (farmHas('flowerbed')) {
        const wing = Math.sin(f.ph * 12) > 0 ? 1 : 2;
        g.fillStyle = '#f6e6c0'; g.fillRect(Math.round(f.x), Math.round(f.y), wing, 2); g.fillRect(Math.round(f.x) + 2, Math.round(f.y), wing, 2);
        g.fillStyle = PAL.ink2; g.fillRect(Math.round(f.x) + 1, Math.round(f.y), 1, 2);
      }
    }
    // front fence, soil apron
    fence(g, FRONT - 6);
    g.fillStyle = PAL.soil1; g.fillRect(0, SOIL, W, H - SOIL);
    g.fillStyle = PAL.soil2; g.fillRect(0, SOIL, W, 3);
    g.fillStyle = PAL.soil0;
    for (let i = 0; i < 34; i++) g.fillRect((i * 19) % W, SOIL + 6 + (i % 4) * 4, 9, 3);
    for (let i = 0; i < 20; i++) g.fillRect((i * 31 + 7) % W, SOIL + 9 + (i % 3) * 5, 3, 2);
    // tufts spilling over the lip
    g.fillStyle = PAL.grass1;
    for (let x = 0; x < W; x += 7) { g.fillRect(x, SOIL - 2, 2, 3); g.fillRect(x + 3, SOIL - 3, 2, 4); }
    g.fillStyle = PAL.grass3; for (let x = 2; x < W; x += 14) g.fillRect(x, SOIL - 4, 1, 3);
    g.fillStyle = PAL.stone1; Art.ell(g, 78, SOIL + 14, 9, 4); Art.ell(g, 470, SOIL + 16, 7, 3);

    // night wash + lantern pools
    if (nt > 0) {
      g.fillStyle = `rgba(22,26,70,${0.46 * nt})`; g.fillRect(0, 0, W, H);
      if (farmHas('lantern')) {
        for (let i = 0; i < 5; i++) {
          const lx = 70 + i * 128, ly = FRONT - 40;
          g.drawImage(Props.get('lantern'), lx - 7, ly - 34);
          const rad = 44 + Math.sin(G.time * 3 + i) * 3;
          const grd = g.createRadialGradient(lx, ly - 22, 4, lx, ly - 22, rad);
          grd.addColorStop(0, `rgba(255,224,150,${0.5 * nt})`); grd.addColorStop(1, 'rgba(255,224,150,0)');
          g.fillStyle = grd; g.fillRect(lx - rad, ly - 22 - rad, rad * 2, rad * 2);
        }
      }
      const bg = g.createRadialGradient(80, HORIZON - 20, 6, 80, HORIZON - 20, 60);
      bg.addColorStop(0, `rgba(255,210,120,${0.4 * nt})`); bg.addColorStop(1, 'rgba(255,210,120,0)');
      g.fillStyle = bg; g.fillRect(20, HORIZON - 80, 120, 120);
    }
    FX.drawFloaters(g, false);
    // status pips ride above everything
    for (const w of G.wombats) statusPips(g, w);
    if (hoverTree && Tree.acorns() > 0) FX.sparkle(TREE.x + U.rand(-30, 30), TREE.y - TREE.h * 0.6, 2, PAL.goldL);
  }

  function fence(g, y) {
    const img = Props.get('fence');
    for (let x = -4; x < W + 8; x += 32) {
      if (y < HORIZON && Math.abs(x - 304) < 34) continue;   // gate gap on the back fence
      g.drawImage(img, x, y - 18);
    }
    if (y < HORIZON) g.drawImage(Props.get('gate'), 300, y - 20);
  }
  function drawFarmTree(g, tree, nt) {
    const c = tree.canvas, s = 2;
    g.fillStyle = 'rgba(30,40,20,0.22)';
    Art.ell(g, TREE.x, TREE.y + 2, 42, 10);
    g.drawImage(c, Math.round(TREE.x - (c.width * s) / 2), Math.round(TREE.y - c.height * s + 4), c.width * s, c.height * s);
    // compost bin at the base, and a glow when acorns are waiting
    g.drawImage(Props.get('compost'), TREE.x + 36, TREE.y - 24);
    if (Tree.acorns() > 0) {
      const p = 0.5 + 0.5 * Math.sin(G.time * 3);
      const rad = 26 + p * 5, gy = TREE.y - TREE.h * 0.55;
      const grd = g.createRadialGradient(TREE.x, gy, 2, TREE.x, gy, rad);
      grd.addColorStop(0, `rgba(255,225,140,${0.35 + 0.2 * p})`); grd.addColorStop(1, 'rgba(255,225,140,0)');
      g.fillStyle = grd; g.fillRect(TREE.x - rad, gy - rad, rad * 2, rad * 2);
      Icons.blit(g, 'acorn', TREE.x - 8, gy - 8 - p * 2, 1);
    }
    if (hoverTree) {
      g.strokeStyle = PAL.goldL; g.lineWidth = 1;
      g.setLineDash([3, 4]);
      g.strokeRect(TREE.x - 34, TREE.y - TREE.h, 68, TREE.h + 4);
      g.setLineDash([]);
    }
  }
  function drawFarmItem(g, it, x, y) {
    const map = { ball: 'ball', tunnel: 'tunnel', mud: 'mud' };
    if (it.key === 'ball') {
      const by = y - 9 - Math.abs(Math.sin(G.time * 3.4)) * 9;
      g.fillStyle = 'rgba(30,40,20,0.2)'; Art.ell(g, x, y, 9, 3);
      g.drawImage(Props.get('ball'), Math.round(x - 9), Math.round(by - 9));
    } else if (map[it.key]) {
      const img = Props.get(map[it.key]);
      g.drawImage(img, Math.round(x - img.width / 2), Math.round(y - img.height + 4));
    } else if (it.key === 'flowerbed') {
      for (let i = 0; i < 3; i++) g.drawImage(Props.get('flowers', i), Math.round(x - 30 + i * 22), Math.round(y - 12));
    }
  }
  function drawWombat(g, w) {
    let pose = 'idle';
    if (w.state === 'walk') pose = 'walk';
    else if (w.state === 'sleep') pose = 'sleep';
    else if (w.state === 'strain') pose = 'strain';
    else if (w.state === 'eat') pose = 'eat';
    else if (w.state === 'play' || w.hap > hapCap() * 0.8) pose = 'happy';
    const n = Sprites.POSES[pose] || 1;
    const rate = pose === 'walk' ? 9 : pose === 'eat' ? 7 : pose === 'strain' ? 8 : 3;
    const frame = Math.floor(w.anim * rate) % n;
    // ground shadow, squashed with the body
    g.fillStyle = 'rgba(30,40,20,0.24)';
    Art.ell(g, w.x, w.y - 1, 22 + w.sq * 8, 5);
    const img = Sprites.wombat(pose, frame, w.pal, w.dir);
    const s = Sprites.S;
    const dw = img.width * s * (1 - w.sq * 0.45);
    const dh = img.height * s * (1 + w.sq);
    const ax = (w.dir < 0 ? img.width - 22 : 22) / img.width;   // feet-centre in the sprite
    const ay = 28 / img.height;
    g.drawImage(img, Math.round(w.x - dw * ax), Math.round(w.y + 2 - dh * ay), dw, dh);
    if (w.grumpyT > 0 && Math.floor(w.anim * 6) % 2) {
      g.fillStyle = PAL.red; g.fillRect(w.x - 6, w.y - 46, 3, 3); g.fillRect(w.x + 4, w.y - 50, 3, 3);
    }
    if (w.state === 'sleep') {
      const p = (w.anim * 0.55) % 1;
      g.globalAlpha = 1 - p; g.fillStyle = PAL.cream;
      const zx = w.x + 20 + p * 10, zy = w.y - 36 - p * 16;
      g.fillRect(zx, zy, 5, 1); g.fillRect(zx + 3, zy + 1, 2, 1); g.fillRect(zx + 1, zy + 2, 2, 1); g.fillRect(zx, zy + 3, 5, 1);
      g.globalAlpha = 1;
    }
  }
  function statusPips(g, w) {
    const x = Math.round(w.x), y = Math.round(w.y - 62);
    // happiness bar on a small wooden backing
    const hp = w.hap / 100;
    g.fillStyle = 'rgba(36,22,17,0.55)'; g.fillRect(x - 12, y, 24, 4);
    g.fillStyle = hp > 0.6 ? PAL.grass3 : hp > 0.3 ? PAL.gold : PAL.red;
    g.fillRect(x - 11, y + 1, Math.round(22 * hp), 2);
    if (w.stomach === 'digesting') {
      const p = 1 - w.digestT / w.digestTotal;
      g.fillStyle = 'rgba(36,22,17,0.55)'; g.fillRect(x - 12, y + 5, 24, 4);
      g.fillStyle = CUBES[FOOD_BY_KEY[w.food].cube].color; g.fillRect(x - 11, y + 6, Math.round(22 * p), 2);
    } else if (w.stomach === 'empty' && w.state !== 'sleep') {
      const bob = Math.sin(G.time * 3.5 + w.id) * 1.5;
      Icons.blit(g, 'bowl', x - 8, y - 16 + bob, 1);
    } else if (w.stomach === 'ready') {
      const bob = Math.abs(Math.sin(G.time * 8)) * 3;
      Icons.blit(g, CUBES[FOOD_BY_KEY[w.food || 'grass'].cube].icon, x - 8, y - 20 - bob, 1);
    }
    if (hoverW === w) {
      const label = w.name;
      g.font = '7px "Press Start 2P", monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
      const tw = g.measureText(label).width;
      g.fillStyle = PAL.ink; g.fillRect(x - tw / 2 - 5, y - 16, tw + 10, 12);
      g.fillStyle = PAL.wood2; g.fillRect(x - tw / 2 - 4, y - 15, tw + 8, 10);
      g.fillStyle = PAL.cream; g.fillText(label, x, y - 10);
    }
  }
  function drawGroundCube(g, c) {
    const def = CUBES[c.type], s = CUBE_SIZE * 0.72;
    const w = def.w * s, h = def.h * s;
    g.fillStyle = 'rgba(30,40,20,0.22)';
    Art.ell(g, c.x, c.y - 1, w * 0.55, 4);
    g.save();
    g.translate(Math.round(c.x), Math.round(c.y - c.z - h / 2));
    g.rotate(c.spin * 0.4);
    if (c.t > 0 && c.z === 0) { const p = 1 + Math.sin(c.t * 4.5) * 0.035; g.scale(p, 1 / p); }
    Sprites.drawCube(g, def, w, h, { face: c.premium, outline: c.premium ? PAL.goldL : null });
    g.restore();
    if (c.premium && Math.sin(c.t * 7) > 0.4) { g.fillStyle = PAL.goldL; g.fillRect(c.x + w / 2 - 2, c.y - c.z - h - 3, 2, 2); }
  }

  return {
    init(g) { G = g; },
    update, render, click, hover, feed, pet, addWombat, offline,
    wombatCap, hapCap, appeal, groundCubes, TREE,
    get W() { return W; }, get H() { return H; },
  };
})();
