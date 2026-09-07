// ---- Wombat pen: simulation + rendering -----------------------------------
const Pen = (() => {
  let G = null;
  const W = 640, H = 360;
  const GROUND_TOP = 160, GROUND_BOT = 330, WALK_MINX = 50, WALK_MAXX = 600, WALK_MINY = 190, WALK_MAXY = 318;
  const groundCubes = []; // cubes lying around waiting for collection
  let troughTimer = 0;
  let hoverWombat = null;
  const grassTufts = [];
  for (let i = 0; i < 70; i++) grassTufts.push([U.rand(20, 620), U.rand(GROUND_TOP + 8, GROUND_BOT - 4), U.randi(0, 2)]);
  const clouds = []; for (let i = 0; i < 6; i++) clouds.push({ x: U.rand(0, W), y: U.rand(15, 90), w: U.rand(40, 90), s: U.rand(4, 10) });

  function hapCap() { let c = 60; for (const d of DECOS) if (G.decos[d.key]) c += d.cap; return Math.min(100, c); }
  function appeal() { let a = 1; for (const d of DECOS) if (G.decos[d.key]) a += d.appeal * 0.1; return a; }
  function toyRegen() { let r = 0; for (const t of TOYS) if (G.toys[t.key]) r += t.regen; return r; }
  function digestMult(w) {
    let m = 0.55 + (w.hap / 100) * 0.95;
    if (G.skills.stomach) m *= 1.25;
    if (G.toys.tunnel) m *= 1.06;
    return m;
  }
  function wombatCap() { return 2 + (G.fac.pen || 0); }

  function newWombat() {
    const used = new Set(G.wombats.map((w) => w.name));
    const name = WOMBAT_NAMES.find((n) => !used.has(n)) || 'Wombat ' + (G.wombats.length + 1);
    return { id: U.uid(), name, x: U.rand(150, 500), y: U.rand(WALK_MINY + 20, WALK_MAXY - 20), tx: 0, ty: 0, dir: 1, state: 'idle', stateT: U.rand(0.5, 2), stomach: 'empty', digestT: 0, digestTotal: 1, food: null, hap: 55, pets: [], grumpyT: 0, anim: U.rand(0, 10), sq: 0, bob: 0, strain: 0, sleepy: 0, playToy: null, tint: U.randi(0, 2) };
  }
  function addWombat() { const w = newWombat(); G.wombats.push(w); return w; }

  // ---- Simulation --------------------------------------------------------
  function update(dt) {
    const cap = hapCap();
    const decay = 0.55 * (1 - 0.15 * (G.fac.vet || 0)) * (G.skills.zen ? 0.6 : 1);
    const regen = toyRegen();
    for (const w of G.wombats) {
      w.anim += dt;
      w.hap = U.clamp(w.hap - decay * dt + regen * dt * (w.hap < cap ? 1 : 0), 0, cap);
      if (w.grumpyT > 0) w.grumpyT -= dt;
      if (w.playToy && w.state === 'play') w.hap = Math.min(cap, w.hap + 2.5 * dt);
      // digestion
      if (w.stomach === 'digesting') {
        w.digestT -= dt * digestMult(w);
        if (w.digestT <= 0) { w.stomach = 'ready'; w.strain = 2.2; w.state = 'strain'; w.stateT = 2.2; }
      } else if (w.stomach === 'ready') {
        w.strain -= dt;
        if (w.strain <= 0) poop(w);
      }
      // behaviour state machine
      w.stateT -= dt;
      if (w.state === 'walk') {
        const dx = w.tx - w.x, dy = w.ty - w.y, d = Math.hypot(dx, dy);
        const sp = 28;
        if (d < 3) { w.state = w.playToy ? 'play' : 'idle'; w.stateT = w.playToy ? U.rand(3, 5) : U.rand(1, 4); }
        else { w.x += (dx / d) * sp * dt; w.y += (dy / d) * sp * dt; w.dir = dx > 0 ? 1 : -1; }
      } else if (w.stateT <= 0 && w.state !== 'strain') {
        if (w.state === 'play') { w.playToy = null; }
        const r = Math.random();
        const toys = TOYS.filter((t) => G.toys[t.key]);
        if (r < 0.25 && toys.length) {
          const t = U.pick(toys); w.playToy = t.key;
          w.tx = U.clamp(WALK_MINX + t.pos[0] * (WALK_MAXX - WALK_MINX) + U.rand(-30, 30), WALK_MINX, WALK_MAXX);
          w.ty = U.clamp(WALK_MINY + t.pos[1] * (WALK_MAXY - WALK_MINY) + U.rand(-6, 10), WALK_MINY, WALK_MAXY);
          w.state = 'walk';
        } else if (r < 0.65) { w.tx = U.rand(WALK_MINX, WALK_MAXX); w.ty = U.rand(WALK_MINY, WALK_MAXY); w.state = 'walk'; }
        else if (r < 0.8 && w.hap < 30) { w.state = 'sleep'; w.stateT = U.rand(4, 8); }
        else { w.state = 'idle'; w.stateT = U.rand(1, 3); w.dir = U.chance(0.3) ? -w.dir : w.dir; }
      }
      if (w.state === 'strain' && w.stateT <= 0 && w.stomach !== 'ready') { w.state = 'idle'; w.stateT = 1; }
      w.sq = U.lerp(w.sq, 0, 1 - Math.pow(0.001, dt));
    }
    // ground cubes
    const convL = G.fac.conveyor || 0;
    for (let i = groundCubes.length - 1; i >= 0; i--) {
      const c = groundCubes[i];
      c.t += dt;
      if (c.z > 0 || c.vz > 0) { c.vz -= 600 * dt; c.z += c.vz * dt; c.x += c.vx * dt; if (c.z <= 0) { c.z = 0; if (Math.abs(c.vz) > 60) { c.vz = -c.vz * 0.4; FX.dust(c.x, c.y, 4); } else { c.vz = 0; c.vx = 0; } } }
      if (convL > 0 && c.t > (convL >= 3 ? 0.4 : 4 / convL)) collect(c, i, true);
    }
    // trough
    const tl = G.fac.trough || 0;
    if (tl > 0 && G.troughFood && G.unlockedFoods[G.troughFood]) {
      troughTimer += dt;
      if (troughTimer >= 16 / tl) {
        troughTimer = 0;
        const hungry = G.wombats.find((w) => w.stomach === 'empty' && w.state !== 'strain');
        if (hungry && (G.food[G.troughFood] || 0) > 0) feed(hungry, G.troughFood, true);
      }
    }
  }

  function feed(w, foodKey, auto) {
    const f = FOOD_BY_KEY[foodKey];
    if (!f || (G.food[foodKey] || 0) <= 0) { if (!auto) UI.toast('No ' + f.name + ' left! Buy more in the shop.', 'bad'); return false; }
    if (w.stomach !== 'empty') { if (!auto) { UI.toast(w.name + ' is still digesting!', 'bad'); Audio.play('error'); } return false; }
    G.food[foodKey]--;
    w.stomach = 'digesting'; w.food = foodKey; w.digestTotal = f.digest; w.digestT = f.digest;
    w.hap = Math.min(hapCap(), w.hap + f.hap);
    w.state = 'eat'; w.stateT = 1.4; w.sq = 0.25;
    G.stats.fed++;
    Audio.play('eat');
    FX.burst(w.x + w.dir * 18, w.y - 10, 6, { color: ['#7dc24b', '#e0a040', '#c8b070'], speed: 60, gravity: 300, life: 0.6, size: 3 });
    FX.float(w.x, w.y - 34, f.icon + ' yum', { color: '#fff', size: 7 });
    UI.refreshHotbar();
    return true;
  }

  function pet(w) {
    const now = G.time;
    if (w.grumpyT > 0) { FX.float(w.x, w.y - 34, 'grr...', { color: '#ff6b6b', size: 7 }); Audio.play('error'); w.sq = 0.15; return; }
    w.pets = w.pets.filter((t) => now - t < 4);
    w.pets.push(now);
    if (w.pets.length > 7 && !G.skills.zen) { w.grumpyT = 6; w.hap = Math.max(0, w.hap - 20); FX.float(w.x, w.y - 40, 'TOO MUCH!', { color: '#ff4b4b', size: 8 }); Audio.play('squeak'); FX.shake(3); w.pets = []; return; }
    const gentle = G.skills.gentle;
    w.hap = Math.min(hapCap(), w.hap + 7 * (gentle ? 1.6 : 1));
    if (w.stomach === 'digesting') w.digestT = Math.max(0.01, w.digestT - (2 + (gentle ? 1.5 : 0)));
    w.sq = 0.3; w.state = w.state === 'sleep' ? 'idle' : w.state; w.stateT = Math.max(w.stateT, 0.6);
    if (w.state === 'walk') { w.state = 'idle'; w.stateT = 0.8; }
    G.stats.pets++;
    Audio.play('pet');
    FX.hearts(w.x, w.y - 30, 3);
    if (w.stomach === 'digesting') FX.float(w.x, w.y - 40, '-2s', { color: '#7dff3f', size: 7 });
  }

  function poop(w) {
    const f = FOOD_BY_KEY[w.food] || FOODS[0];
    const def = CUBES[f.cube];
    let n = f.count || 1;
    if (G.skills.double && U.chance(0.18)) { n++; FX.float(w.x, w.y - 48, 'DOUBLE DUMP!', { color: '#ffd23f', size: 8, life: 1.6 }); }
    const premChance = (w.hap / 100) * 0.25 * (G.skills.goldengut ? 2 : 1);
    for (let i = 0; i < n; i++) {
      const premium = U.chance(premChance);
      groundCubes.push({ x: w.x - w.dir * 16, y: w.y + U.rand(-2, 2), z: 8, vz: U.rand(120, 200), vx: -w.dir * U.rand(30, 70) + U.rand(-15, 15), type: def.key, premium, t: -i * 0.15, id: U.uid() });
      if (premium) FX.sparkle(w.x - w.dir * 16, w.y - 10, 8);
    }
    w.stomach = 'empty'; w.food = null; w.state = 'idle'; w.stateT = 1.2; w.sq = -0.35;
    G.stats.pooped += n;
    Audio.play('plop'); FX.shake(2.5); FX.punch(0.03);
    FX.dust(w.x - w.dir * 14, w.y + 2, 10, '#a08060');
    FX.float(w.x - w.dir * 10, w.y - 30, 'PLOP!', { color: '#ffd23f', size: 10, life: 1 });
  }

  function collect(c, i, auto) {
    if (i === undefined) i = groundCubes.indexOf(c);
    if (i >= 0) groundCubes.splice(i, 1);
    if (c.premium) G.premium[c.type] = (G.premium[c.type] || 0) + 1;
    else G.cubes[c.type] = (G.cubes[c.type] || 0) + 1;
    G.stats.collected++;
    if (!auto) Audio.play('pop'); else Audio.play('click');
    FX.float(c.x, c.y - c.z - 10, (c.premium ? '★ ' : '+') + CUBES[c.type].name, { color: c.premium ? '#ffd23f' : '#fff', size: 7 });
    FX.burst(c.x, c.y - c.z, 6, { color: [CUBES[c.type].color, '#fff'], speed: 80, gravity: 100, life: 0.4 });
    UI.refreshHUD(); UI.refreshHotbar();
  }

  // Offline progress: advance digestion & collect in coarse steps
  function offline(seconds) {
    const steps = Math.min(4000, Math.floor(seconds / 2));
    let made = 0;
    for (let s = 0; s < steps; s++) {
      for (const w of G.wombats) {
        if (w.stomach === 'digesting') { w.digestT -= 2 * digestMult(w); if (w.digestT <= 0) { w.stomach = 'ready'; } }
        if (w.stomach === 'ready') { const f = FOOD_BY_KEY[w.food] || FOODS[0]; G.cubes[CUBES[f.cube].key] = (G.cubes[CUBES[f.cube].key] || 0) + (f.count || 1); made += f.count || 1; w.stomach = 'empty'; w.food = null; }
        w.hap = Math.max(0, w.hap - 0.2);
      }
      const tl = G.fac.trough || 0;
      if (tl > 0 && G.troughFood && s % Math.max(1, Math.round(8 / tl)) === 0) {
        const hungry = G.wombats.find((w) => w.stomach === 'empty');
        if (hungry && (G.food[G.troughFood] || 0) > 0) { const f = FOOD_BY_KEY[G.troughFood]; G.food[G.troughFood]--; hungry.stomach = 'digesting'; hungry.food = f.key; hungry.digestT = f.digest; hungry.digestTotal = f.digest; }
      }
    }
    return made;
  }

  // ---- Input -------------------------------------------------------------
  function wombatAt(x, y) {
    let best = null, bd = 1e9;
    for (const w of G.wombats) {
      if (x >= w.x - 24 && x <= w.x + 24 && y >= w.y - 30 && y <= w.y + 4) { const d = Math.abs(w.y - y); if (d < bd) { bd = d; best = w; } }
    }
    return best;
  }
  function click(x, y) {
    // cubes first
    for (let i = groundCubes.length - 1; i >= 0; i--) {
      const c = groundCubes[i]; const s = CUBES[c.type].w * 10 + 6;
      if (Math.abs(x - c.x) < s && Math.abs(y - (c.y - c.z - 6)) < s) { collect(c, i, false); return; }
    }
    const w = wombatAt(x, y);
    if (w) { if (G.selectedFood) feed(w, G.selectedFood, false); else pet(w); return; }
    // click empty ground: tiny dust
    if (y > GROUND_TOP && y < GROUND_BOT) FX.dust(x, y, 3);
  }
  function hover(x, y) {
    hoverWombat = wombatAt(x, y);
    if (hoverWombat) {
      const w = hoverWombat;
      const st = w.stomach === 'empty' ? 'Hungry - feed me!' : w.stomach === 'digesting' ? `Digesting ${FOOD_BY_KEY[w.food].name} (${U.time(w.digestT / digestMult(w))})` : 'About to poop...';
      return `<b>${w.name}</b><br>${st}<br>Happiness: ${Math.round(w.hap)}/${hapCap()}${w.grumpyT > 0 ? '<br><span style="color:#ff6b6b">GRUMPY</span>' : ''}<br><span style="color:#b9a9c9">Digest speed x${digestMult(w).toFixed(2)}</span>`;
    }
    for (const c of groundCubes) { if (Math.abs(x - c.x) < 14 && Math.abs(y - (c.y - c.z - 6)) < 14) return `${c.premium ? '★ Premium ' : ''}${CUBES[c.type].name}<br><span style="color:#b9a9c9">click to collect</span>`; }
    return null;
  }

  // ---- Rendering ---------------------------------------------------------
  function skyColors(t) {
    // t 0..1 day fraction. 0 = dawn
    const keys = [
      [0.0, ['#ffb27a', '#ffd9a0']], [0.15, ['#5fb8ff', '#bfe8ff']], [0.5, ['#4aa3f0', '#b0e0ff']], [0.7, ['#ff9a5c', '#ffd3a0']], [0.8, ['#3a2a6a', '#7a4a8a']], [0.9, ['#0f1030', '#2a2a55']], [1.0, ['#ffb27a', '#ffd9a0']],
    ];
    let a = keys[0], b = keys[1];
    for (let i = 0; i < keys.length - 1; i++) if (t >= keys[i][0] && t <= keys[i + 1][0]) { a = keys[i]; b = keys[i + 1]; break; }
    const f = (t - a[0]) / (b[0] - a[0] || 1);
    const mix = (c1, c2) => { const n1 = parseInt(c1.slice(1), 16), n2 = parseInt(c2.slice(1), 16); const r = Math.round(U.lerp((n1 >> 16) & 255, (n2 >> 16) & 255, f)), g = Math.round(U.lerp((n1 >> 8) & 255, (n2 >> 8) & 255, f)), bb = Math.round(U.lerp(n1 & 255, n2 & 255, f)); return `rgb(${r},${g},${bb})`; };
    return [mix(a[1][0], b[1][0]), mix(a[1][1], b[1][1])];
  }
  function dayT() { return (G.time / 300) % 1; }
  function nightAmt() { const t = dayT(); return t > 0.78 ? Math.min(1, (t - 0.78) / 0.1) * (t > 0.95 ? (1 - t) / 0.05 : 1) : 0; }

  function render(g) {
    const t = dayT();
    const [c1, c2] = skyColors(t);
    const grd = g.createLinearGradient(0, 0, 0, GROUND_TOP); grd.addColorStop(0, c1); grd.addColorStop(1, c2);
    g.fillStyle = grd; g.fillRect(0, 0, W, GROUND_TOP);
    // sun / moon
    const sa = (t - 0.05) * Math.PI / 0.75;
    if (t > 0.05 && t < 0.8) { const sx = 60 + (W - 120) * ((t - 0.05) / 0.75), sy = 130 - Math.sin(sa) * 110; g.fillStyle = '#fff3b0'; g.fillRect(sx - 10, sy - 10, 20, 20); g.fillStyle = '#ffe070'; g.fillRect(sx - 8, sy - 8, 16, 16); }
    else { const mt = t > 0.8 ? (t - 0.8) / 0.25 : (t + 0.2) / 0.25; const mx = 60 + (W - 120) * mt, my = 100 - Math.sin(mt * Math.PI) * 80; g.fillStyle = '#e8ecff'; g.beginPath(); g.arc(mx, my, 9, 0, TAU); g.fill(); g.fillStyle = c1; g.beginPath(); g.arc(mx + 5, my - 3, 8, 0, TAU); g.fill(); }
    const night = nightAmt();
    if (night > 0) { g.fillStyle = '#fff'; for (let i = 0; i < 40; i++) { const sx = (i * 137.5) % W, sy = (i * 71.3) % (GROUND_TOP - 40); g.globalAlpha = night * (0.5 + 0.5 * Math.sin(G.time * 3 + i)); g.fillRect(sx, sy, 2, 2); } g.globalAlpha = 1; }
    // clouds
    g.fillStyle = 'rgba(255,255,255,0.85)';
    for (const c of clouds) { c.x += c.s * 0.016; if (c.x > W + 60) c.x = -c.w; g.fillRect(c.x, c.y, c.w, 10); g.fillRect(c.x + 10, c.y - 6, c.w - 20, 8); g.fillRect(c.x + 18, c.y - 10, c.w * 0.4, 6); }
    // hills
    g.fillStyle = '#5b8f3a'; for (let i = 0; i < 6; i++) { const hx = i * 130 - 40, hy = GROUND_TOP - 22 + (i % 2) * 8; g.beginPath(); g.ellipse(hx, GROUND_TOP, 110, 34 + (i % 3) * 8, 0, Math.PI, 0); g.fill(); }
    g.fillStyle = '#4c7a30'; for (let i = 0; i < 8; i++) { const hx = i * 95 + 20; g.beginPath(); g.ellipse(hx, GROUND_TOP + 2, 70, 22, 0, Math.PI, 0); g.fill(); }
    // trees
    for (let i = 0; i < 7; i++) { const tx = 30 + i * 95 + (i % 2) * 20, ty = GROUND_TOP - 6; g.fillStyle = '#5c4530'; g.fillRect(tx - 2, ty - 18, 4, 18); g.fillStyle = '#3f7a2f'; g.fillRect(tx - 9, ty - 30, 18, 14); g.fillRect(tx - 6, ty - 36, 12, 8); }
    // ground
    g.fillStyle = '#7ab648'; g.fillRect(0, GROUND_TOP, W, GROUND_BOT - GROUND_TOP);
    g.fillStyle = '#6ea640'; for (const [gx, gy, k] of grassTufts) { g.fillRect(gx, gy, 2, 3); g.fillRect(gx + 3, gy - 2 + k, 2, 5 - k); }
    // dirt path
    g.fillStyle = '#c9a76b'; g.fillRect(260, GROUND_TOP, 120, GROUND_BOT - GROUND_TOP); g.fillStyle = '#b8955a'; for (let i = 0; i < 10; i++) g.fillRect(270 + (i * 37) % 100, GROUND_TOP + 10 + i * 16, 8, 4);
    // below ground
    g.fillStyle = '#5c4530'; g.fillRect(0, GROUND_BOT, W, H - GROUND_BOT);
    g.fillStyle = '#4a3726'; for (let i = 0; i < 20; i++) g.fillRect(i * 33 + 5, GROUND_BOT + 8 + (i % 3) * 7, 10, 4);
    // back fence
    drawFence(g, 140, true);
    // decorations
    drawDecos(g);
    // toys + sorting
    const drawables = [];
    for (const tdef of TOYS) if (G.toys[tdef.key]) drawables.push({ y: WALK_MINY + tdef.pos[1] * (WALK_MAXY - WALK_MINY) + 4, fn: () => drawToy(g, tdef) });
    for (const w of G.wombats) drawables.push({ y: w.y, fn: () => drawWombat(g, w) });
    for (const c of groundCubes) drawables.push({ y: c.y, fn: () => drawGroundCube(g, c) });
    drawables.sort((a, b) => a.y - b.y);
    for (const d of drawables) d.fn();
    FX.drawParticles(g, 0);
    // front fence
    drawFence(g, GROUND_BOT - 4, false);
    // night tint
    if (night > 0) { g.fillStyle = `rgba(10,10,50,${0.45 * night})`; g.fillRect(0, 0, W, H); if (G.decos.lights) { g.fillStyle = `rgba(255,220,120,${0.15 * night})`; g.fillRect(0, 120, W, 230); } }
    FX.drawFloaters(g, false);
    // wombat status bubbles (screen space, always on top)
    for (const w of G.wombats) drawStatus(g, w);
    // wombat count / hint
    g.font = '7px "Press Start 2P", monospace'; g.textAlign = 'left'; g.textBaseline = 'top'; g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(4, 4, 150, 12);
    g.fillStyle = '#fff'; g.fillText(`WOMBATS ${G.wombats.length}/${wombatCap()}  DAY ${Math.floor(G.time / 300) + 1}`, 8, 7);
  }
  function drawFence(g, y, back) {
    const painted = G.decos.paint;
    const col = painted ? '#c94a3a' : '#c9a06a', dark = painted ? '#8a2f24' : '#8a6a3a';
    g.fillStyle = col; g.fillRect(0, y + 4, W, 4); g.fillRect(0, y + 12, W, 4);
    for (let x = 8; x < W; x += 40) { g.fillStyle = col; g.fillRect(x, y - 4, 6, 24); g.fillStyle = dark; g.fillRect(x + 4, y - 4, 2, 24); g.fillStyle = col; g.fillRect(x - 1, y - 6, 8, 3); }
    if (G.decos.lights && !back) { for (let x = 20; x < W; x += 24) { const on = Math.sin(G.time * 4 + x) > 0; g.fillStyle = on ? U.pick(['#ffd23f', '#ff5c8a', '#3fe0ff']) : '#886'; g.fillRect(x, y - 2 + Math.sin(x) * 2, 3, 3); } }
  }
  function drawDecos(g) {
    if (G.decos.flowers) { for (let i = 0; i < 14; i++) { const fx = 20 + i * 45, fy = 168 + (i % 2) * 6; g.fillStyle = '#3f7a2f'; g.fillRect(fx, fy, 2, 5); g.fillStyle = ['#ff5c8a', '#ffd23f', '#c77dff', '#fff'][i % 4]; g.fillRect(fx - 2, fy - 3, 6, 4); } }
    if (G.decos.fountain) { const fx = 320, fy = 200; g.fillStyle = '#9aa0b0'; g.fillRect(fx - 26, fy - 6, 52, 12); g.fillStyle = '#5fb8ff'; g.fillRect(fx - 22, fy - 4, 44, 7); g.fillStyle = '#9aa0b0'; g.fillRect(fx - 3, fy - 26, 6, 22); g.fillStyle = '#bfe8ff'; for (let i = 0; i < 5; i++) { const a = (G.time * 3 + i) % 1; g.fillRect(fx - 10 + i * 5 + Math.sin(a * 6) * 2, fy - 26 - Math.sin(a * Math.PI) * 14, 2, 3); } }
    if (G.decos.statue) { const sx = 560, sy = 196; g.fillStyle = '#7a7a8a'; g.fillRect(sx - 18, sy - 6, 36, 10); g.fillStyle = '#5a5a6a'; g.fillRect(sx - 14, sy - 12, 28, 6); g.save(); g.translate(sx, sy - 12); g.drawImage(Sprites.tint(Sprites.wombatL, '#ffd23f'), -22, -28); g.restore(); g.fillStyle = '#fff6c2'; if (Math.sin(G.time * 5) > 0.7) g.fillRect(sx - 6, sy - 34, 3, 3); }
  }
  function drawToy(g, t) {
    const x = WALK_MINX + t.pos[0] * (WALK_MAXX - WALK_MINX), y = WALK_MINY + t.pos[1] * (WALK_MAXY - WALK_MINY) + 4;
    switch (t.key) {
      case 'ball': { const by = y - 6 - Math.abs(Math.sin(G.time * 4)) * 6; g.fillStyle = 'rgba(0,0,0,0.2)'; g.fillRect(x - 6, y - 2, 12, 3); g.fillStyle = '#e04b4b'; g.fillRect(x - 6, by - 6, 12, 12); g.fillStyle = '#fff'; g.fillRect(x - 6, by - 2, 12, 4); break; }
      case 'tunnel': g.fillStyle = '#5c4530'; g.fillRect(x - 24, y - 16, 48, 18); g.fillStyle = '#2a1a10'; g.fillRect(x - 18, y - 12, 14, 12); g.fillRect(x + 4, y - 12, 14, 12); g.fillStyle = '#7a5a40'; g.fillRect(x - 24, y - 16, 48, 3); break;
      case 'log': g.fillStyle = '#7a5230'; g.fillRect(x - 26, y - 12, 52, 14); g.fillStyle = '#5c4530'; g.fillRect(x - 26, y - 4, 52, 6); g.fillStyle = '#a07a50'; g.fillRect(x - 26, y - 12, 6, 14); g.fillRect(x - 10, y - 9, 3, 2); g.fillRect(x + 6, y - 7, 3, 2); break;
      case 'mud': g.fillStyle = '#4a3020'; g.fillRect(x - 30, y - 12, 60, 14); g.fillStyle = '#6a4a30'; g.fillRect(x - 26, y - 10, 52, 8); g.fillStyle = '#8a6a48'; if (Math.sin(G.time * 2) > 0) g.fillRect(x - 8 + Math.sin(G.time) * 10, y - 8, 4, 3); break;
      case 'tramp': g.fillStyle = '#2b3a5a'; g.fillRect(x - 22, y - 14, 44, 5); g.fillStyle = '#3fe0ff'; g.fillRect(x - 20, y - 12, 40, 3 + Math.sin(G.time * 6) * 1.5); g.fillStyle = '#1a1424'; g.fillRect(x - 20, y - 9, 3, 10); g.fillRect(x + 17, y - 9, 3, 10); break;
    }
  }
  function drawWombat(g, w) {
    const facing = w.dir >= 0;
    let img;
    const walking = w.state === 'walk';
    if (w.state === 'sleep') img = facing ? Sprites.wombatSleep : Sprites.wombatSleepL;
    else if (w.hap > 75 || w.state === 'eat' || w.state === 'play') img = facing ? Sprites.wombatHappy : Sprites.wombatHappyL;
    else if (walking && Math.floor(w.anim * 6) % 2) img = facing ? Sprites.wombatWalk : Sprites.wombatWalkL;
    else img = facing ? Sprites.wombat : Sprites.wombatL;
    let sx = 1, sy = 1, dy = 0, rot = 0;
    const bob = walking ? Math.abs(Math.sin(w.anim * 12)) * 2 : Math.sin(w.anim * 2) * 0.5;
    sy = 1 + w.sq; sx = 1 - w.sq * 0.6;
    if (w.state === 'eat') { const e = Math.sin(w.anim * 14); sy *= 1 + e * 0.06; rot = (facing ? 1 : -1) * 0.12; }
    if (w.state === 'strain') { rot = Math.sin(w.anim * 40) * 0.05; sx *= 1.08; sy *= 0.92; dy = 2; }
    if (w.state === 'play') { dy = -Math.abs(Math.sin(w.anim * 8)) * 6; }
    // shadow
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(w.x - 18, w.y - 2, 36, 4);
    g.save(); g.translate(Math.round(w.x), Math.round(w.y + dy - bob));
    g.rotate(rot); g.scale(sx, sy);
    g.drawImage(img, -22, -28);
    if (w.state === 'sleep' && G.decos.paint === undefined) { }
    g.restore();
    // grumpy steam / sweat
    if (w.grumpyT > 0 && Math.floor(w.anim * 6) % 2) { g.fillStyle = '#ff6b6b'; g.fillRect(w.x - 4, w.y - 38, 3, 3); g.fillRect(w.x + 3, w.y - 40, 3, 3); }
    if (w.state === 'strain') { g.fillStyle = '#9ad6ff'; const p = (w.anim * 3) % 1; g.fillRect(w.x + (facing ? 14 : -16), w.y - 30 + p * 10, 2, 4); }
    if (w.state === 'sleep') { g.font = '8px "Press Start 2P", monospace'; g.fillStyle = '#fff'; g.textAlign = 'left'; g.textBaseline = 'middle'; const p = (w.anim * 0.7) % 1; g.globalAlpha = 1 - p; g.fillText('z', w.x + 14 + p * 8, w.y - 30 - p * 12); g.globalAlpha = 1; }
  }
  function drawStatus(g, w) {
    const x = Math.round(w.x), y = Math.round(w.y - 40);
    // name
    g.font = '6px "Press Start 2P", monospace'; g.textAlign = 'center'; g.textBaseline = 'bottom';
    g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(x - 24, y - 16, 48, 9);
    g.fillStyle = hoverWombat === w ? '#ffd23f' : '#fff'; g.fillText(w.name, x, y - 8);
    // happiness bar
    g.fillStyle = '#1b1210'; g.fillRect(x - 16, y - 6, 32, 4);
    g.fillStyle = w.hap > 60 ? '#7dff3f' : w.hap > 30 ? '#ffd23f' : '#ff4b4b'; g.fillRect(x - 15, y - 5, Math.round(30 * w.hap / 100), 2);
    // stomach
    if (w.stomach === 'digesting') {
      const p = 1 - w.digestT / w.digestTotal;
      g.fillStyle = '#1b1210'; g.fillRect(x - 16, y, 32, 4);
      g.fillStyle = CUBES[FOOD_BY_KEY[w.food].cube].color; g.fillRect(x - 15, y + 1, Math.round(30 * p), 2);
    } else if (w.stomach === 'empty' && Math.sin(G.time * 4) > 0) {
      g.fillStyle = '#fff'; g.fillRect(x - 5, y, 10, 5); g.fillStyle = '#ff4b4b'; g.fillRect(x - 3, y + 1, 2, 3); g.fillRect(x + 1, y + 1, 2, 3);
    } else if (w.stomach === 'ready') { g.font = '8px "Press Start 2P", monospace'; g.fillStyle = '#ffd23f'; g.fillText('!!', x, y + 8); }
  }
  function drawGroundCube(g, c) {
    const def = CUBES[c.type], s = CUBE_SIZE * 0.7;
    const w = def.w * s, h = def.h * s;
    const pulse = c.t > 0 ? 1 + Math.sin(c.t * 5) * 0.04 : 1;
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(c.x - w / 2, c.y - 2, w, 3);
    g.save(); g.translate(Math.round(c.x), Math.round(c.y - c.z - h / 2)); g.scale(pulse, 1 / pulse);
    Sprites.drawCube(g, def, w, h, { face: c.premium, outline: c.premium ? '#ffd23f' : null });
    g.restore();
    if (c.premium) { g.fillStyle = '#fff6c2'; if (Math.sin(c.t * 8) > 0.5) g.fillRect(c.x + w / 2 - 2, c.y - c.z - h - 2, 3, 3); }
  }

  return {
    init(g) { G = g; },
    update, render, click, hover, feed, pet, addWombat, newWombat, offline, wombatCap, hapCap, appeal, groundCubes,
    get W() { return W; }, get H() { return H; },
  };
})();
