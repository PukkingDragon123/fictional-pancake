// ---- The grove: wombats, brushes, breeding, and the three landmarks ------
const Grove = (() => {
  let G = null;
  const W = 640, H = 360;
  const SKY = 118, GROUND = SKY + 2, FLOOR = H - 6;
  const WALK = { x0: 26, x1: 614, y0: GROUND + 26, y1: H - 18 };
  const SHRINE = { x: 320, y: 220, w: 96, h: 96 };
  const TREE = { x: 556, y: 236, w: 76, h: 104 };
  const STALL = { x: 78, y: 206, w: 62, h: 46 };
  const drops = [];
  let hoverW = null, hoverSpot = null, cartT = 0, troughT = 0, ambT = 0;
  let pairFirst = null;

  const R0 = Art.rng(4242);
  const far = [], mid = [], mist = [];
  for (let i = 0; i < 13; i++) far.push({ x: -20 + i * 54 + R0() * 16, y: SKY - 6 + R0() * 6, v: Math.floor(R0() * 3), s: 0.5 + R0() * 0.2 });
  for (let i = 0; i < 7; i++) mid.push({ x: 10 + i * 96 + R0() * 26, y: GROUND + 16 + R0() * 10, v: Math.floor(R0() * 3), s: 0.78 + R0() * 0.22 });
  for (let i = 0; i < 5; i++) mist.push({ x: R0() * W, y: GROUND + 6 + R0() * 60, w: 70 + R0() * 90, s: 3 + R0() * 5 });

  // ---- derived ------------------------------------------------------------
  function capacity() { return 2 + (G.up.burrow || 0); }
  function hapCap() { let c = 62; for (const d of DECOR) if (G.decor[d.key] && d.hap) c += 10; return Math.min(100, c); }
  function happyRegen() { let r = 0; for (const d of DECOR) if (G.decor[d.key] && d.hap) r += d.hap; return r; }
  function digestMult(w) {
    let m = (0.62 + (w.hap / 100) * 0.85) * (w.traits.gut || 1);
    if (G.fruits.deepgut) m *= 1.25;
    if (G.blessings.apollowomb) m *= 1.5;
    if (w.age === 'juvenile') m *= 0.8;
    return m;
  }
  function adults() { return G.wombats.filter((w) => w.age === 'adult'); }

  function makeTraits(a, b) {
    const t = {};
    for (const def of TRAITS) {
      let v;
      if (a && b) v = (a.traits[def.key] + b.traits[def.key]) / 2 + U.rand(-0.12, 0.12);
      else v = U.rand(def.min + 0.15, def.max - 0.25);
      t[def.key] = +U.clamp(v, def.min, def.max).toFixed(2);
    }
    return t;
  }
  function pickPelt(a, b) {
    if (U.chance(RARE_CHANCE * (a && b ? 2 : 1))) {
      const rares = FUR.filter((f) => f.rare);
      return U.pick(rares).key;
    }
    if (a && b) return U.chance(0.5) ? a.pelt : b.pelt;
    return U.pick(FUR.filter((f) => !f.rare)).key;
  }
  function newWombat(opts = {}) {
    const used = new Set(G.wombats.map((w) => w.name));
    const name = NAMES.find((n) => !used.has(n)) || 'Wombat';
    const age = opts.age || 'adult';
    return {
      id: U.uid(), name, pelt: opts.pelt || pickPelt(), age, ageT: 0,
      x: opts.x ?? 320, y: opts.y ?? WALK.y0 + 20, dir: 1,
      state: 'idle', stateT: U.rand(0.5, 2), anim: U.rand(0, 9), sq: 0,
      hap: 58, stomach: 'empty', food: null, digestT: 0, digestTotal: 1, strain: 0,
      traits: opts.traits || makeTraits(), pets: [], grump: 0, gest: 0, mate: null,
    };
  }
  function addWombat(opts) {
    // arrive at the edge of the grove and immediately head somewhere else, so
    // a batch of new wombats spreads out instead of piling up
    const side = G.wombats.length % 2 ? 1 : -1;
    const w = newWombat(Object.assign({
      x: 320 + side * U.rand(60, 230), y: WALK.y0 + U.rand(4, 40),
    }, opts));
    w.tx = U.rand(WALK.x0, WALK.x1); w.ty = U.rand(WALK.y0, WALK.y1);
    w.state = 'walk'; w.stateT = 6;
    G.wombats.push(w);
    FX.dust(w.x, w.y, 8, PAL.soil3);
    return w;
  }

  // ---- simulation ---------------------------------------------------------
  function update(dt) {
    const cap = hapCap(), regen = happyRegen();
    const decay = 0.42;
    for (const w of G.wombats) {
      w.anim += dt;
      const calm = w.traits.calm || 1;
      w.hap = U.clamp(w.hap - (decay / calm) * dt + (w.hap < cap ? regen * dt : 0), 0, cap);
      if (w.grump > 0) w.grump -= dt;

      // growing up
      if (w.age !== 'adult') {
        w.ageT += dt * (G.fruits.longlife ? 2 : 1);
        const need = GROW_TIME[w.age];
        if (w.ageT >= need) {
          w.ageT = 0;
          w.age = w.age === 'baby' ? 'juvenile' : 'adult';
          Audio.play('hatch');
          FX.sparkle(w.x, w.y - 24, 12, PAL.moss5);
          FX.float(w.x, w.y - 40, Sprites.AGE[w.age].name, { color: PAL.moss5, size: 8 });
        }
      }
      // gestation
      if (w.gest > 0) {
        w.gest -= dt;
        if (w.gest <= 0) {
          const mate = G.wombats.find((m) => m.id === w.mate) || w;
          const n = G.blessings.aphrowombite ? 2 : 1;
          for (let i = 0; i < n; i++) {
            if (G.wombats.length >= capacity()) break;
            addWombat({ age: 'baby', pelt: pickPelt(w, mate), traits: makeTraits(w, mate), x: w.x + U.rand(-12, 12), y: w.y });
          }
          w.mate = null;
          Audio.play('hatch'); FX.hearts(w.x, w.y - 30, 6);
          UI.toast('joey', 'good');
        }
      }
      // digestion
      if (w.stomach === 'digesting') {
        w.digestT -= dt * digestMult(w);
        if (w.digestT <= 0) { w.stomach = 'ready'; w.strain = 1.8; w.state = 'dig'; w.stateT = 1.8; }
      } else if (w.stomach === 'ready') {
        w.strain -= dt;
        if (w.strain <= 0) leave(w);
      }

      // behaviour
      w.stateT -= dt;
      if (w.state === 'walk') {
        const dx = w.tx - w.x, dy = w.ty - w.y, d = Math.hypot(dx, dy);
        const sp = w.age === 'baby' ? 34 : w.age === 'juvenile' ? 30 : 25;
        if (d < 3) { w.state = w.goal || 'idle'; w.stateT = U.rand(2, 4.5); w.goal = null; }
        else {
          w.x += (dx / d) * sp * dt; w.y += (dy / d) * sp * dt;
          w.dir = dx > 0 ? 1 : -1;
          if (G.fruits.greenwake && Math.random() < dt * 2.2) World.sowGrass(w.x, w.y + 2, 7);
        }
      } else if (w.stateT <= 0 && w.state !== 'dig') {
        const r = Math.random();
        if (r < 0.3 && World.hasGrass(w.x, w.y)) { w.state = 'graze'; w.stateT = U.rand(3, 6); }
        else if (r < 0.72) {
          w.tx = U.rand(WALK.x0, WALK.x1); w.ty = U.rand(WALK.y0, WALK.y1);
          w.state = 'walk'; w.goal = U.chance(0.35) ? 'graze' : 'idle';
        } else if (r < 0.84 && w.hap < 40) { w.state = 'sleep'; w.stateT = U.rand(5, 9); }
        else { w.state = 'idle'; w.stateT = U.rand(1.5, 3.5); if (U.chance(0.35)) w.dir = -w.dir; }
      }
      if (w.state === 'dig' && w.stateT <= 0 && w.stomach !== 'ready') { w.state = 'idle'; w.stateT = 1; }
      if (w.state === 'graze' && Math.random() < dt * 0.4) w.hap = Math.min(cap, w.hap + 0.6);
      w.sq = U.lerp(w.sq, 0, 1 - Math.pow(0.001, dt));
      w.x = U.clamp(w.x, WALK.x0, WALK.x1);
      w.y = U.clamp(w.y, WALK.y0, WALK.y1);
    }
    // separation
    for (let i = 0; i < G.wombats.length; i++) for (let j = i + 1; j < G.wombats.length; j++) {
      const a = G.wombats[i], b = G.wombats[j];
      const dx = b.x - a.x;
      if (Math.abs(dx) < 30 && Math.abs(b.y - a.y) < 12) {
        const p = (30 - Math.abs(dx)) * dt * 8 * (dx >= 0 ? 1 : -1);
        a.x = U.clamp(a.x - p, WALK.x0, WALK.x1); b.x = U.clamp(b.x + p, WALK.x0, WALK.x1);
      }
    }
    // dropped offerings
    const cart = G.up.cart || 0;
    for (let i = drops.length - 1; i >= 0; i--) {
      const d = drops[i];
      d.t += dt;
      if (d.z > 0 || d.vz > 0) {
        d.vz -= 600 * dt; d.z += d.vz * dt; d.x += d.vx * dt; d.spin += d.vs * dt;
        if (d.z <= 0) {
          d.z = 0;
          if (Math.abs(d.vz) > 55) { d.vz = -d.vz * 0.34; d.vx *= 0.5; d.vs *= 0.4; FX.dust(d.x, d.y, 3); }
          else { d.vz = 0; d.vx = 0; d.vs = 0; d.spin = 0; }
        }
      }
      if (cart > 0 && d.t > (cart >= 3 ? 0.3 : 4 / cart)) collect(d, i, true);
    }
    // trough
    const tl = G.up.trough || 0;
    if (tl > 0 && G.troughFood && (G.food[G.troughFood] || 0) > 0) {
      troughT += dt;
      if (troughT >= 15 / tl) {
        troughT = 0;
        const hungry = G.wombats.find((w) => w.stomach === 'empty' && w.state !== 'dig');
        if (hungry) feed(hungry, G.troughFood, true);
      }
    }
    // drifting mist
    for (const m of mist) { m.x += m.s * dt * 2; if (m.x > W + 100) m.x = -m.w - 20; }
    ambT += dt;
    if (ambT > 6) { ambT = 0; if (Math.random() < 0.4) Audio.play('brush'); }
  }

  function feed(w, key, auto) {
    const def = CROP_BY_KEY[key];
    if (!def || (G.food[key] || 0) <= 0) { if (!auto) Audio.play('error'); return false; }
    if (w.stomach !== 'empty') { if (!auto) Audio.play('error'); return false; }
    if (w.age === 'baby') { if (!auto) Audio.play('error'); return false; }
    G.food[key]--;
    w.stomach = 'digesting'; w.food = key;
    w.digestTotal = def.grow * 0.55 + 12; w.digestT = w.digestTotal;
    w.hap = Math.min(hapCap(), w.hap + def.hap);
    w.state = 'eat'; w.stateT = 1.6; w.sq = 0.2;
    G.stats.fed++;
    Audio.play('munch');
    FX.burst(w.x + w.dir * 18, w.y - 12, 7, { color: [def.color, PAL.moss4], speed: 50, gravity: 240, life: 0.5, size: 2 });
    UI.refreshTray();
    return true;
  }
  function pet(w) {
    if (w.grump > 0) { Audio.play('error'); w.sq = 0.1; return; }
    w.pets = w.pets.filter((t) => G.time - t < 4);
    w.pets.push(G.time);
    if (w.pets.length > 7) { w.grump = 5; w.hap = Math.max(0, w.hap - 14); w.pets = []; Audio.play('squeak'); return; }
    w.hap = Math.min(hapCap(), w.hap + 7 * (G.fruits.softpaws ? 2 : 1));
    if (w.stomach === 'digesting') w.digestT = Math.max(0.01, w.digestT - 2.5);
    w.sq = 0.26;
    if (w.state === 'sleep' || w.state === 'walk') { w.state = 'happy'; w.stateT = 1.1; }
    G.stats.pets++;
    Audio.play('pet'); FX.hearts(w.x, w.y - 30, 3);
  }
  function leave(w) {
    const def = CROP_BY_KEY[w.food] || CROPS[0];
    let n = 1;
    if (G.fruits.twinfall && U.chance(0.22)) n = 2;
    const blessChance = U.clamp((w.hap / 100) * 0.26 * (w.traits.luck || 1), 0, 0.8);
    for (let i = 0; i < n; i++) {
      const type = w.age === 'juvenile' ? 'plain' : def.offering;
      drops.push({
        x: w.x - w.dir * 16, y: w.y + U.rand(-2, 2), z: 8, vz: U.rand(100, 165),
        vx: -w.dir * U.rand(20, 52), spin: 0, vs: U.rand(-4, 4),
        type, blessed: U.chance(blessChance), t: -i * 0.15, id: U.uid(),
      });
    }
    w.stomach = 'empty'; w.food = null; w.state = 'idle'; w.stateT = 1.1; w.sq = -0.26;
    G.stats.left += n;
    Audio.play('plop'); FX.shake(1.6);
    FX.dust(w.x - w.dir * 14, w.y + 2, 8, PAL.soil3);
  }
  function collect(d, i, auto) {
    if (i === undefined) i = drops.indexOf(d);
    if (i >= 0) drops.splice(i, 1);
    const bag = d.blessed ? G.blessed : G.offerings;
    bag[d.type] = (bag[d.type] || 0) + 1;
    G.stats.gathered++;
    Audio.play(auto ? 'click' : 'pop');
    FX.burst(d.x, d.y - d.z, 6, { color: [OFFERINGS[d.type].color, PAL.cream], speed: 60, gravity: 80, life: 0.35, size: 2 });
    UI.refreshHUD();
  }

  // ---- pointer ------------------------------------------------------------
  function wombatAt(x, y) {
    let best = null, bd = 1e9;
    for (const w of G.wombats) {
      const k = Sprites.AGE[w.age].k;
      if (x > w.x - 30 * k && x < w.x + 30 * k && y > w.y - 44 * k && y < w.y + 6) {
        const d = Math.abs(w.y - y); if (d < bd) { bd = d; best = w; }
      }
    }
    return best;
  }
  function spotAt(x, y) {
    if (x > SHRINE.x - 56 && x < SHRINE.x + 56 && y > SHRINE.y - 110 && y < SHRINE.y + 8) return 'shrine';
    if (x > TREE.x - 34 && x < TREE.x + 34 && y > TREE.y - TREE.h && y < TREE.y + 8) return 'tree';
    if (x > STALL.x - 34 && x < STALL.x + 34 && y > STALL.y - STALL.h && y < STALL.y + 8) return 'stall';
    return null;
  }
  // A brush press. `first` marks the start of a drag so one-shot tools fire once.
  function apply(x, y, first) {
    const tool = G.tool;
    if (y < GROUND) return;
    if (tool === 'hand') {
      if (!first) return;
      const spot = spotAt(x, y);
      if (spot === 'shrine') { Main.setMode('shrine'); return; }
      if (spot === 'tree') { Main.setMode('roots'); return; }
      if (spot === 'stall') { UI.openPanel('panel-pawn'); return; }
      for (let i = drops.length - 1; i >= 0; i--) {
        const d = drops[i], s = OFFERINGS[d.type].w * 11 + 7;
        if (Math.abs(x - d.x) < s && Math.abs(y - (d.y - d.z - 8)) < s) { collect(d, i, false); return; }
      }
      if (World.harvest(x, y)) return;
      const w = wombatAt(x, y);
      if (w) { if (G.selFood && (G.food[G.selFood] || 0) > 0) feed(w, G.selFood, false); else pet(w); return; }
      return;
    }
    if (tool === 'pair') {
      if (!first) return;
      const w = wombatAt(x, y);
      if (!w || w.age !== 'adult' || w.gest > 0) { Audio.play('error'); return; }
      if (!pairFirst) { pairFirst = w; FX.hearts(w.x, w.y - 30, 2); Audio.play('click'); return; }
      if (pairFirst === w) { pairFirst = null; return; }
      if (pairFirst.hap < 55 || w.hap < 55) { Audio.play('error'); UI.toast('happier first', 'bad'); pairFirst = null; return; }
      if (G.wombats.length >= capacity()) { Audio.play('error'); UI.toast('no room', 'bad'); pairFirst = null; return; }
      w.gest = 26; w.mate = pairFirst.id;
      pairFirst.hap -= 8; w.hap -= 8;
      FX.hearts((w.x + pairFirst.x) / 2, w.y - 34, 8);
      Audio.play('bless');
      pairFirst = null;
      return;
    }
    const r = World.brushRadius(TOOLS.find((t) => t.key === tool).radius);
    switch (tool) {
      case 'moss': World.sowGrass(x, y, r); if (first) Audio.play('brush'); break;
      case 'hoe': World.till(x, y, r); if (first) Audio.play('dig'); break;
      case 'sickle': World.clearWeeds(x, y, r); break;
      case 'net': World.catchBugs(x, y, r); break;
      case 'water': World.water(x, y, r); if (first) Audio.play('splash'); break;
      case 'seed': if (World.plant(x, y, G.selSeed)) { Audio.play('pluck'); UI.refreshTray(); } break;
    }
  }
  function hover(x, y) {
    hoverW = G.tool === 'hand' || G.tool === 'pair' ? wombatAt(x, y) : null;
    hoverSpot = G.tool === 'hand' ? spotAt(x, y) : null;
    if (hoverW) {
      const w = hoverW;
      const st = w.age !== 'adult' ? Sprites.AGE[w.age].name
        : w.gest > 0 ? 'expecting'
          : w.stomach === 'empty' ? 'hungry'
            : w.stomach === 'digesting' ? 'digesting' : 'about to give';
      const fur = Sprites.furOf(w.pelt);
      return `<b>${w.name}</b> <span class="dim">${fur.name}${fur.rare ? ' &#9670;' : ''}</span><br>${st}<br>${Math.round(w.hap)}/${hapCap()}`;
    }
    if (hoverSpot === 'shrine') return '<b>Shrine</b><br>Offer and summon';
    if (hoverSpot === 'tree') return '<b>Tree of Knowledge</b><br>Climb down to the roots';
    if (hoverSpot === 'stall') return '<b>Pawnbroker</b><br>Sell gold and artifacts';
    return null;
  }

  // ---- scene --------------------------------------------------------------
  function render(g) {
    const f = World.fraction();
    // sky: overcast ash that clears as the forest returns
    const top = U.mix('#2b2836', '#4d6a86', f), bot = U.mix('#6b6270', '#9dc0c4', f);
    for (let i = 0; i < 9; i++) {
      g.fillStyle = U.mix(top, bot, i / 8);
      g.fillRect(0, Math.round((SKY * i) / 9), W, Math.ceil(SKY / 9) + 1);
    }
    // a low sun burning through
    const sx = 96, sy = 46;
    const grd = g.createRadialGradient(sx, sy, 3, sx, sy, 70);
    grd.addColorStop(0, `rgba(255,238,176,${0.3 + f * 0.4})`); grd.addColorStop(1, 'rgba(255,238,176,0)');
    g.fillStyle = grd; g.fillRect(sx - 70, sy - 70, 140, 140);
    g.fillStyle = U.mix('#8a8290', '#ffeeb0', f); Art.ell(g, sx, sy, 9, 9);
    // distant treeline
    for (const t of far) {
      const img = Props.get('tree', f > 0.55 ? 1 : f > 0.25 ? 0.5 : 0);
      const w2 = img.width * t.s, h2 = img.height * t.s;
      g.globalAlpha = 0.45 + f * 0.2;
      g.drawImage(img, Math.round(t.x), Math.round(t.y - h2), Math.round(w2), Math.round(h2));
    }
    g.globalAlpha = 1;
    World.drawGround(g);
    World.drawLitter(g);
    // mid trees stand on the ground line
    for (const t of mid) {
      const img = Props.get('tree', f > 0.65 ? 1 : f > 0.3 ? 0.5 : 0);
      const w2 = img.width * t.s, h2 = img.height * t.s;
      g.drawImage(img, Math.round(t.x - w2 / 2), Math.round(t.y - h2), Math.round(w2), Math.round(h2));
    }
    World.drawBlades(g);
    World.drawWeeds(g);

    // depth-sorted actors
    const items = [];
    items.push({ y: SHRINE.y, fn: () => drawShrine(g) });
    items.push({ y: TREE.y, fn: () => drawKnowTree(g, f) });
    items.push({ y: STALL.y, fn: () => drawStall(g) });
    for (const d of DECOR) if (G.decor[d.key]) {
      const dx = WALK.x0 + d.spot[0] * (WALK.x1 - WALK.x0);
      const dy = WALK.y0 + d.spot[1] * (WALK.y1 - WALK.y0);
      items.push({ y: dy, fn: () => drawDecor(g, d, dx, dy) });
    }
    items.push({ y: -1, fn: () => World.drawCrops(g) });
    for (const w of G.wombats) items.push({ y: w.y, fn: () => drawWombat(g, w) });
    for (const d of drops) items.push({ y: d.y, fn: () => drawDrop(g, d) });
    items.sort((a, b) => a.y - b.y);
    for (const it of items) it.fn();

    World.drawBugs(g);
    FX.drawParticles(g, 0);
    // mist rolls low while the grove is still dead
    if (f < 0.8) {
      g.globalAlpha = 0.1 + (1 - f) * 0.16;
      g.fillStyle = PAL.bone;
      for (const m of mist) { g.fillRect(m.x, m.y, m.w, 5); g.fillRect(m.x + 14, m.y - 4, m.w - 28, 4); }
      g.globalAlpha = 1;
    }
    FX.drawFloaters(g, false);
    for (const w of G.wombats) pips(g, w);
    if (G.pointer.on && G.tool !== 'hand' && G.tool !== 'pair') {
      const t = TOOLS.find((x) => x.key === G.tool);
      World.drawCursor(g, G.pointer.x, G.pointer.y, World.brushRadius(t.radius), toolTint(G.tool));
    }
    if (pairFirst) { const p = pairFirst; Icons.blit(g, 'heart', p.x - 8, p.y - 58 + Math.sin(G.time * 6) * 2, 1); }
  }
  function toolTint(k) {
    return { moss: PAL.moss4, hoe: PAL.soil4, sickle: PAL.rot2, net: PAL.cyan3, water: PAL.water2, seed: PAL.gold3 }[k] || PAL.cream;
  }
  function drawShrine(g) {
    const img = Props.get('shrine', G.up.shrine || 0);
    const s = 1.25;
    g.fillStyle = 'rgba(18,14,20,0.32)'; Art.ell(g, SHRINE.x, SHRINE.y + 2, 46, 10);
    g.drawImage(img, Math.round(SHRINE.x - (img.width * s) / 2), Math.round(SHRINE.y - img.height * s + 8), img.width * s, img.height * s);
    // the altar fire breathes
    const fl = 0.5 + 0.5 * Math.sin(G.time * 4);
    const fy = SHRINE.y - img.height * s + 26;
    const fg = g.createRadialGradient(SHRINE.x, fy, 2, SHRINE.x, fy, 26 + fl * 6);
    fg.addColorStop(0, `rgba(131,84,201,${0.3 + fl * 0.2})`); fg.addColorStop(1, 'rgba(131,84,201,0)');
    g.fillStyle = fg; g.fillRect(SHRINE.x - 32, fy - 32, 64, 64);
    if (Math.random() < 0.25) FX.spawn({ x: SHRINE.x + U.rand(-3, 3), y: fy, vx: U.rand(-5, 5), vy: -26, life: 1, size: 2, color: PAL.div4, gravity: -10 });
    // offerings already set out for the next rite
    const set = Ritual.staged();
    let i = 0;
    for (const k in set) for (let n = 0; n < set[k]; n++) {
      const def = OFFERINGS[k];
      const px = SHRINE.x - 30 + (i % 9) * 7, py = SHRINE.y - 20 - Math.floor(i / 9) * 7;
      g.save(); g.translate(px, py); Sprites.drawCube(g, def, 7, 7, {}); g.restore();
      i++;
    }
    const glow = Ritual.readyGod();
    if (glow) {
      const p = 0.5 + 0.5 * Math.sin(G.time * 3);
      const rad = 40 + p * 10, gy = SHRINE.y - 44;
      const grd = g.createRadialGradient(SHRINE.x, gy, 3, SHRINE.x, gy, rad);
      grd.addColorStop(0, `rgba(185,142,240,${0.3 + p * 0.25})`); grd.addColorStop(1, 'rgba(185,142,240,0)');
      g.fillStyle = grd; g.fillRect(SHRINE.x - rad, gy - rad, rad * 2, rad * 2);
      Icons.blit(g, glow.glyph, SHRINE.x - 8, gy - 8 - p * 3, 1);
    }
    if (hoverSpot === 'shrine') outlineBox(g, SHRINE.x - 56, SHRINE.y - 110, 112, 118);
  }
  function drawKnowTree(g, f) {
    const img = Props.get('tree', f > 0.4 ? 1 : 0.5, 1);
    const s = 1.55;
    g.fillStyle = 'rgba(18,14,20,0.3)'; Art.ell(g, TREE.x, TREE.y + 2, 34, 8);
    g.drawImage(img, Math.round(TREE.x - (img.width * s) / 2), Math.round(TREE.y - img.height * s + 6), img.width * s, img.height * s);
    const ripe = Knowledge.ripeCount();
    if (ripe > 0) {
      const p = 0.5 + 0.5 * Math.sin(G.time * 2.6);
      const gy = TREE.y - 92;
      const rad = 30 + p * 8;
      const grd = g.createRadialGradient(TREE.x, gy, 2, TREE.x, gy, rad);
      grd.addColorStop(0, `rgba(245,205,92,${0.28 + p * 0.22})`); grd.addColorStop(1, 'rgba(245,205,92,0)');
      g.fillStyle = grd; g.fillRect(TREE.x - rad, gy - rad, rad * 2, rad * 2);
      for (let i = 0; i < Math.min(3, ripe); i++) {
        const a = G.time * 0.6 + i * 2.1;
        g.fillStyle = PAL.gold3;
        Art.ell(g, TREE.x + Math.cos(a) * 20, gy + Math.sin(a) * 12, 2.6, 2.6);
      }
    }
    if (hoverSpot === 'tree') outlineBox(g, TREE.x - 34, TREE.y - TREE.h, 68, TREE.h + 8);
  }
  function drawStall(g) {
    const img = Props.get('stall');
    g.fillStyle = 'rgba(18,14,20,0.3)'; Art.ell(g, STALL.x, STALL.y + 2, 30, 7);
    g.drawImage(img, Math.round(STALL.x - img.width / 2), Math.round(STALL.y - img.height + 4));
    // the broker, a wombat who never leaves the stall
    Sprites.blit(g, STALL.x + 22, STALL.y - 4, 'idle', Math.floor(G.time * 2), 'grey', -1, 'adult', 1.4);
    if (hoverSpot === 'stall') outlineBox(g, STALL.x - 34, STALL.y - STALL.h, 68, STALL.h + 8);
  }
  function outlineBox(g, x, y, w, h) {
    g.save(); g.strokeStyle = PAL.gold3; g.lineWidth = 1; g.setLineDash([3, 4]);
    g.strokeRect(Math.round(x) + 0.5, Math.round(y) + 0.5, w, h);
    g.setLineDash([]); g.restore();
  }
  function drawDecor(g, d, x, y) {
    const img = Props.get(d.key === 'nest' ? 'nest' : d.key);
    g.drawImage(img, Math.round(x - img.width / 2), Math.round(y - img.height + 4));
    if (d.key === 'brazier') {
      const p = Math.sin(G.time * 7) * 1.5;
      g.fillStyle = `rgba(224,112,90,${0.4 + 0.2 * Math.sin(G.time * 5)})`;
      Art.ell(g, x, y - 26 + p, 5, 6);
      if (Math.random() < 0.3) FX.spawn({ x: x + U.rand(-3, 3), y: y - 28, vx: U.rand(-6, 6), vy: -28, life: 0.8, size: 2, color: PAL.gold3, gravity: -14 });
    }
    if (d.key === 'idol') {
      const p = 0.5 + 0.5 * Math.sin(G.time * 2);
      g.fillStyle = `rgba(131,84,201,${0.2 + p * 0.2})`;
      Art.ell(g, x, y - 30, 12, 14);
    }
  }
  function drawWombat(g, w) {
    let p = 'idle';
    if (w.state === 'walk') p = 'walk';
    else if (w.state === 'sleep') p = 'sleep';
    else if (w.state === 'dig') p = 'dig';
    else if (w.state === 'eat') p = 'eat';
    else if (w.state === 'graze') p = 'graze';
    else if (w.state === 'happy' || w.hap > hapCap() * 0.85) p = 'happy';
    const n = Sprites.POSES[p];
    const rate = p === 'walk' ? 9 : p === 'eat' ? 8 : p === 'dig' ? 9 : p === 'happy' ? 9 : 3.4;
    const k = Sprites.AGE[w.age].k;
    g.fillStyle = 'rgba(18,14,20,0.26)';
    Art.ell(g, w.x, w.y - 1, (22 + w.sq * 8) * k, 5 * k);
    const fur = Sprites.furOf(w.pelt);
    if (fur.glow) {
      const gr = g.createRadialGradient(w.x, w.y - 18 * k, 2, w.x, w.y - 18 * k, 34 * k);
      gr.addColorStop(0, U.rgba(fur.glow, 0.3)); gr.addColorStop(1, U.rgba(fur.glow, 0));
      g.fillStyle = gr; g.fillRect(w.x - 34 * k, w.y - 52 * k, 68 * k, 68 * k);
    }
    Sprites.blit(g, w.x, w.y, p, Math.floor(w.anim * rate), w.pelt, w.dir, w.age, Sprites.S, w.sq);
    if (w.grump > 0 && Math.floor(w.anim * 6) % 2) { g.fillStyle = PAL.red2; g.fillRect(w.x - 7, w.y - 48 * k, 3, 3); g.fillRect(w.x + 5, w.y - 52 * k, 3, 3); }
    if (w.state === 'sleep') {
      const t = (w.anim * 0.5) % 1;
      g.globalAlpha = 1 - t; g.fillStyle = PAL.cream;
      g.fillRect(w.x + 18 + t * 8, w.y - 34 - t * 14, 4, 1);
      g.fillRect(w.x + 18 + t * 8, w.y - 31 - t * 14, 4, 1);
      g.globalAlpha = 1;
    }
    if (w.gest > 0 && Math.floor(G.time * 2) % 2) Icons.blit(g, 'heart', w.x - 8, w.y - 58 * k, 1);
  }
  function pips(g, w) {
    const k = Sprites.AGE[w.age].k;
    const x = Math.round(w.x), y = Math.round(w.y - 52 * k - 8);
    const hp = w.hap / 100;
    g.fillStyle = 'rgba(18,14,20,0.55)'; g.fillRect(x - 12, y, 24, 4);
    g.fillStyle = hp > 0.6 ? PAL.moss4 : hp > 0.3 ? PAL.gold3 : PAL.red2;
    g.fillRect(x - 11, y + 1, Math.round(22 * hp), 2);
    if (w.stomach === 'digesting') {
      const p = 1 - w.digestT / w.digestTotal;
      g.fillStyle = 'rgba(18,14,20,0.55)'; g.fillRect(x - 12, y + 5, 24, 4);
      g.fillStyle = OFFERINGS[(CROP_BY_KEY[w.food] || CROPS[0]).offering].color;
      g.fillRect(x - 11, y + 6, Math.round(22 * p), 2);
    } else if (w.stomach === 'empty' && w.age !== 'baby' && w.state !== 'sleep') {
      Icons.blit(g, 'leaf', x - 7, y - 16 + Math.sin(G.time * 3.4 + w.id) * 1.5, 0.85);
    } else if (w.stomach === 'ready') {
      Icons.blit(g, 'offering', x - 7, y - 18 - Math.abs(Math.sin(G.time * 8)) * 3, 0.85);
    }
    if (hoverW === w) {
      g.font = '7px "Press Start 2P", monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
      const tw = g.measureText(w.name).width;
      g.fillStyle = PAL.ink; g.fillRect(x - tw / 2 - 5, y - 15, tw + 10, 12);
      g.fillStyle = PAL.bark1; g.fillRect(x - tw / 2 - 4, y - 14, tw + 8, 10);
      g.fillStyle = PAL.cream; g.fillText(w.name, x, y - 9);
    }
  }
  function drawDrop(g, d) {
    const def = OFFERINGS[d.type], s = CUBE_SIZE * 0.7;
    const w = def.w * s, h = def.h * s;
    g.fillStyle = 'rgba(18,14,20,0.25)'; Art.ell(g, d.x, d.y - 1, w * 0.55, 4);
    g.save();
    g.translate(Math.round(d.x), Math.round(d.y - d.z - h / 2));
    g.rotate(d.spin * 0.4);
    if (d.t > 0 && d.z === 0) { const p = 1 + Math.sin(d.t * 4.5) * 0.035; g.scale(p, 1 / p); }
    Sprites.drawCube(g, def, w, h, { blessed: d.blessed, outline: d.blessed ? PAL.div4 : null });
    g.restore();
    if (d.blessed && Math.sin(d.t * 7) > 0.4) { g.fillStyle = PAL.div5; g.fillRect(d.x + w / 2 - 2, d.y - d.z - h - 3, 2, 2); }
  }

  function offline(sec) {
    const steps = Math.min(3000, Math.floor(sec / 2));
    let made = 0;
    for (let s = 0; s < steps; s++) {
      for (const w of G.wombats) {
        if (w.stomach === 'digesting') { w.digestT -= 2 * digestMult(w); if (w.digestT <= 0) w.stomach = 'ready'; }
        if (w.stomach === 'ready') {
          const def = CROP_BY_KEY[w.food] || CROPS[0];
          G.offerings[def.offering] = (G.offerings[def.offering] || 0) + 1;
          made++; w.stomach = 'empty'; w.food = null;
        }
        if (w.age !== 'adult') { w.ageT += 2; const need = GROW_TIME[w.age]; if (w.ageT >= need) { w.ageT = 0; w.age = w.age === 'baby' ? 'juvenile' : 'adult'; } }
        w.hap = Math.max(0, w.hap - 0.14);
      }
      for (const c of World.crops) c.t += 2;
    }
    return made;
  }

  return {
    init(g) { G = g; }, update, render, apply, hover, addWombat, newWombat, feed, pet, offline,
    capacity, hapCap, adults, drops, SHRINE, TREE, STALL, GROUND, WALK,
    clearPair() { pairFirst = null; },
  };
})();
