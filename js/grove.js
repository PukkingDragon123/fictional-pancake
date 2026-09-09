// ---- The grove: the scene, the herd, and the brush -------------------------
// The loop is: sweep ash, till soil, sow a crop, let a wombat eat it. Eating is
// what restores the ground -- the moss is painted under the wombat, not under
// the crop -- so the grove comes back along the paths the herd actually walks.
const Grove = (() => {
  const W = 640, H = 360;
  const TOP = 116;
  let G = null;
  let brush = { down: false, x: 0, y: 0, lx: 0, ly: 0, t: 0 };
  let sky = null, ridge = null;
  let shrineGlow = 0;

  // ---- modifiers gathered from gods, fruit skills and traits ---------------
  const woke = (k) => !!(G.gods && G.gods[k]);
  const fruit = (k) => !!(G.fruit && G.fruit[k]);
  const relic = (k) => !!(G.relics && G.relics[k]);
  function hasTrait(w, k) { return w.traits && w.traits.indexOf(k) >= 0; }
  function traitSum(w, field) {
    let s = 0;
    for (const t of (w.traits || [])) { const d = TRAIT_BY_KEY[t]; if (d && d.eff[field]) s += d.eff[field]; }
    return s;
  }
  function brushRadius(key) {
    let r = toolRadius(key, (G.tools && G.tools[key]) || 0);
    if (fruit('broad')) r *= 1.3;
    if (key === 'censer' && relic('ashbowl')) r *= 2;
    return r;
  }
  function digestMult(w) {
    let m = 1;
    if (fruit('gut')) m *= 1.25;
    if (woke('velun')) m *= 1.15;
    m *= 1 + traitSum(w, 'digest');
    if (w.age === 'joey') m *= 0.6;
    if (w.age === 'elder' && !relic('tally')) m *= 0.7;
    if (night() > 0.5 && !woke('ombra')) m *= 0.6;
    return Math.max(0.25, m);
  }
  function growMult() {
    let m = 1;
    if (woke('velun')) m *= 1.4;
    return m;
  }
  function offerValue(w, def) {
    let v = def.value * (1 + traitSum(w, 'value'));
    if (woke('sella')) v *= 1.35;
    if (relic('shade') && night() > 0.5) v *= 1.2;
    return v;
  }
  const capacity = () => WARREN_CAP(G.warren || 0);

  // ---- wombats ------------------------------------------------------------
  function rollFur() {
    for (let tier = 2; tier >= 1; tier--) if (U.chance(RARE_CHANCE[tier])) return U.pick(FUR.filter((f) => f.rare === tier)).key;
    return U.pick(FUR.filter((f) => f.rare === 0)).key;
  }
  function rollTraits(n = 1) {
    const out = [];
    for (let i = 0; i < n; i++) {
      let tier = 0;
      for (let t = 2; t >= 1; t--) if (U.chance(TRAIT_CHANCE[t])) { tier = t; break; }
      const pool = TRAITS.filter((t) => t.rare === tier && out.indexOf(t.key) < 0);
      if (pool.length) out.push(U.pick(pool).key);
    }
    return out;
  }
  function newWombat(o = {}) {
    const used = new Set(G.wombats.map((w) => w.name));
    const free = WOMBAT_NAMES.filter((n) => !used.has(n));
    return Object.assign({
      id: U.uid(),
      name: free.length ? U.pick(free) : U.pick(WOMBAT_NAMES) + ' ' + (G.wombats.length + 1),
      fur: rollFur(), traits: rollTraits(U.chance(0.45) ? 1 : 0),
      age: 'adult', ageT: 0,
      x: U.rand(80, W - 80), y: U.rand(TOP + 40, H - 24), dir: 1,
      tx: 0, ty: 0, target: 0,
      hap: 40, stomach: 'empty', crop: null, digestT: 0, digestTotal: 1,
      state: 'idle', stateT: 1, anim: U.rand(0, 9), pets: [], pair: 0, born: 0,
    }, o);
  }
  function addWombat(o) {
    const w = newWombat(o);
    w.tx = w.x; w.ty = w.y;
    G.wombats.push(w);
    return w;
  }

  // ---- the herd's day -----------------------------------------------------
  function ageOf(w) { return Sprites.AGES[w.age] || Sprites.AGES.adult; }
  function speed(w) { return (26 + traitSum(w, 'speed') * 26) * (w.age === 'joey' ? 0.8 : 1); }

  function setState(w, s, t) { w.state = s; w.stateT = t; }

  function pickCrop(w) {
    const c = World.nearest('crop', w.x, w.y, 460, (e) => World.ripe(e) && !claimed(e, w));
    if (c) { w.target = c.id; w.tx = c.x; w.ty = c.y; setState(w, 'walk', 12); return true; }
    return false;
  }
  function claimed(e, self) {
    for (const w of G.wombats) if (w !== self && w.target === e.id) return true;
    return false;
  }
  function wander(w) {
    w.tx = U.clamp(w.x + U.rand(-110, 110), 20, W - 20);
    w.ty = U.clamp(w.y + U.rand(-50, 50), TOP + 22, H - 16);
    w.target = 0;
    setState(w, 'walk', U.rand(2, 5));
  }

  function eatCrop(w, e) {
    const def = CROP_BY_KEY[e.crop];
    World.remove(e);
    w.stomach = 'digesting';
    w.crop = e.crop;
    w.digestTotal = Math.max(2, def.digest / digestMult(w));
    w.digestT = w.digestTotal;
    w.hap = Math.min(100, w.hap + def.hap);
    // Eating is the restoration. Moss is painted where the animal stands.
    let r = 20 + def.restore * 10;
    if (fruit('compost')) r *= 1.4;
    r *= 1 + traitSum(w, 'restore');
    World.paintMoss(w.x, w.y + 2, r, 0.45 + def.restore * 0.12);
    let f = def.fruit + traitSum(w, 'fruit');
    if (woke('nuru')) f += 1;
    if (f > 0) { G.fruitBank += f; FX.float(w.x, w.y - 30, '+' + f + ' fruit', { color: PAL.moss4, world: true }); }
    if (fruit('volunteer') && U.chance(0.3)) World.sow(e.crop, e.x + U.rand(-9, 9), e.y + U.rand(-5, 5));
    G.stats.eaten++;
    FX.burst(w.x, w.y - 8, 5, { color: [PAL.moss3, PAL.moss4], speed: 40, life: 0.5 });
    Audio.play('eat');
  }

  function dropOffering(w) {
    let type = CROP_BY_KEY[w.crop] ? CROP_BY_KEY[w.crop].offering : 'husk';
    if (relic('seedcase')) type = 'reliquary';
    if (hasTrait(w, 'gold') && U.chance(1 / 6)) type = 'reliquary';
    if (w.age === 'elder' && U.chance(0.35)) type = 'ossuary';
    if (woke('vessa') && hasTrait(w, 'holy') && U.chance(0.2)) type = 'sacrament';
    const premium = w.hap >= 70;
    const n = fruit('twindrop') && U.chance(0.25) ? 2 : 1;
    for (let i = 0; i < n; i++) {
      G.drops.push({ id: U.uid(), type, x: w.x - 14 * w.dir + U.rand(-4, 4) + i * 8, y: w.y + U.rand(-2, 2), t: 0, premium, by: w.id });
    }
    w.stomach = 'empty'; w.crop = null;
    G.stats.offered += n;
    FX.dust(w.x - 12 * w.dir, w.y, 6, PAL.soil2);
    Audio.play('plop');
  }

  function collect(d, i, auto) {
    const def = OFFERINGS[d.type];
    if (!def) { G.drops.splice(i, 1); return; }
    const mult = d.premium ? 2 : 1;
    G.offerings[d.type] = (G.offerings[d.type] || 0) + 1;
    if (d.premium) G.blessed[d.type] = (G.blessed[d.type] || 0) + 1;
    // Favour is two numbers: what you can spend, and what you have ever earned.
    // The gods gate on the second, so spending on artifacts never un-wakes one.
    G.favour += FAVOUR_PER_OFFERING * mult;
    G.favourEver += FAVOUR_PER_OFFERING * mult;
    G.stats.collected++;
    G.drops.splice(i, 1);
    FX.float(d.x, d.y - 12, def.name, { color: d.premium ? PAL.goldL : PAL.bone3, world: true });
    FX.sparkle(d.x, d.y - 6, 5, d.premium ? PAL.goldL : PAL.bone2);
    if (!auto) Audio.play('coin');
    UI.refreshHUD(); UI.refreshOfferBar();
  }

  function pet(w) {
    w.hap = Math.min(100, w.hap + (fruit('paws') ? 12 : 7));
    if (w.stomach === 'digesting') w.digestT = Math.max(0, w.digestT - (fruit('paws') ? 3 : 1.5));
    setState(w, 'happy', 0.9);
    w.pets.push({ t: 0 });
    G.stats.pets++;
    FX.hearts(w.x, w.y - 30, 3);
    Audio.play('pet');
  }

  function update(dt) {
    const nt = night();
    World.update(dt, growMult());
    shrineGlow = U.clamp(shrineGlow - dt * 0.6, 0, 1);
    if (Ritual.pending()) shrineGlow = 1;

    for (const w of G.wombats) {
      w.anim += dt;
      // ageing
      const rate = dt / (1 + traitSum(w, 'age'));
      if (w.age !== 'elder') {
        w.ageT += rate;
        const need = AGE_SECONDS[w.age];
        if (need && w.ageT >= need) {
          w.ageT = 0;
          w.age = Sprites.AGE_ORDER[Sprites.AGE_ORDER.indexOf(w.age) + 1];
          FX.float(w.x, w.y - 36, 'grew up', { color: PAL.bone4, world: true });
          FX.sparkle(w.x, w.y - 20, 8, PAL.bone3);
        }
      }
      // happiness
      const fade = 0.55 * (1 - Math.min(0.9, traitSum(w, 'calm'))) * (fruit('paws') ? 0.8 : 1);
      w.hap = U.clamp(w.hap - fade * dt + World.mossAt(w.x, w.y) * dt * 0.6, 0, 100);
      for (let i = w.pets.length - 1; i >= 0; i--) { w.pets[i].t += dt; if (w.pets[i].t > 0.6) w.pets.splice(i, 1); }

      // digestion
      if (w.stomach === 'digesting') {
        w.digestT -= dt;
        if (w.digestT <= 0) { w.stomach = 'ready'; }
      }

      // states
      w.stateT -= dt;
      if (Ritual.pending() && w.state !== 'pray') setState(w, 'pray', 3);
      switch (w.state) {
        case 'walk': {
          const dx = w.tx - w.x, dy = w.ty - w.y, d = Math.hypot(dx, dy);
          if (d > 2) {
            const sp = speed(w) * dt;
            w.x += (dx / d) * sp; w.y += (dy / d) * sp;
            w.dir = dx < 0 ? -1 : 1;
            if (U.chance(dt * 0.8) && World.ashAt(w.x, w.y) > 0.5) World.sweepAsh(w.x, w.y + 2, 5, 0.3);
            if (U.chance(dt * 0.5) && World.soilAt(w.x, w.y) > 0.5) World.paintMoss(w.x, w.y + 2, 6, 0.16);
          } else if (w.target) {
            const e = World.ents.find((n) => n.id === w.target);
            if (e && World.ripe(e)) setState(w, 'eat', 1.8); else { w.target = 0; setState(w, 'idle', 1); }
          } else setState(w, 'idle', U.rand(1, 3));
          if (w.stateT <= 0) { w.target = 0; setState(w, 'idle', 1); }
          break;
        }
        case 'eat':
          if (w.stateT <= 0) {
            const e = World.ents.find((n) => n.id === w.target);
            if (e && World.ripe(e)) eatCrop(w, e);
            w.target = 0;
            setState(w, 'idle', U.rand(0.6, 1.6));
          }
          break;
        case 'strain':
          if (w.stateT <= 0) { dropOffering(w); setState(w, 'happy', 0.8); }
          break;
        case 'dig':
          if (U.chance(dt * 8)) World.paintSoil(w.x + 10 * w.dir, w.y + 2, 7, 0.35);
          if (w.stateT <= 0) setState(w, 'idle', 1);
          break;
        case 'pray':
          if (w.stateT <= 0 && !Ritual.pending()) setState(w, 'idle', 1);
          break;
        default:
          if (w.stateT <= 0) {
            if (w.stomach === 'ready') setState(w, 'strain', 1.6);
            else if (w.pair && Breeding.together(w)) setState(w, 'love', 2.4);
            else if (nt > 0.7 && !woke('ombra') && U.chance(0.4)) setState(w, 'sleep', U.rand(4, 9));
            else if (w.stomach === 'empty' && pickCrop(w)) { /* off to eat */ }
            else if (U.chance(0.25) && World.ashAt(w.x, w.y) < 0.4 && World.soilAt(w.x, w.y) < 0.4) setState(w, 'dig', U.rand(1.5, 3));
            else wander(w);
          }
      }
    }

    // drops age, then take themselves in so an idle grove still earns
    for (let i = G.drops.length - 1; i >= 0; i--) {
      const d = G.drops[i];
      d.t += dt;
      if (d.t > 20) collect(d, i, true);
    }
    Breeding.update(dt);
  }

  // Away time: crops finish, wombats digest, offerings pile up at the burrow.
  function offline(sec) {
    let made = 0;
    const steps = Math.min(240, Math.floor(sec / 5));
    for (let i = 0; i < steps; i++) World.update(5, growMult());
    for (const w of G.wombats) {
      let t = sec;
      while (t > 0) {
        if (w.stomach === 'digesting') {
          t -= w.digestT; w.digestT = 0; w.stomach = 'ready';
          if (t < 0) break;
        }
        if (w.stomach === 'ready') { dropOffering(w); made++; }
        const e = World.nearest('crop', w.x, w.y, 1e9, World.ripe);
        if (!e) break;
        eatCrop(w, e);
        t -= 6;
        if (made > 60) break;
      }
    }
    return made;
  }

  // ---- brush --------------------------------------------------------------
  function currentTool() { return G.selTool && (G.tools[G.selTool] !== undefined) ? G.selTool : null; }
  function toolColor(k) {
    return k === 'censer' ? PAL.vio3 : k === 'trowel' ? PAL.soil3 : k === 'pouch' ? PAL.moss3
      : k === 'can' ? PAL.water2 : k === 'sickle' ? PAL.bone3 : PAL.bone4;
  }
  function stroke(x, y, first) {
    const k = currentTool();
    if (!k || y < TOP + 2) return;
    const r = brushRadius(k);
    if (k === 'censer') { World.sweepAsh(x, y, r, 0.8); if (U.chance(0.3)) FX.dust(x, y, 3, PAL.ash3); }
    else if (k === 'trowel') { World.paintSoil(x, y, r, 0.7); if (U.chance(0.25)) FX.dust(x, y, 3, PAL.soil3); }
    else if (k === 'can') { World.water(x, y, r); if (U.chance(0.5)) FX.spawn({ x: x + U.rand(-r, r), y: y - 20, vx: 0, vy: 90, life: 0.4, size: 1, color: PAL.water2, gravity: 120 }); }
    else if (k === 'sickle') reap(x, y, r);
    else if (k === 'pouch' && first) sowAt(x, y);
  }
  function sowAt(x, y) {
    const def = CROP_BY_KEY[G.selSeed];
    if (!def) { UI.toast('Pick a seed first.', 'bad'); return; }
    const n = toolRadius('pouch', G.tools.pouch || 0);
    let sown = 0;
    for (let i = 0; i < n; i++) {
      const px = x + (i ? U.rand(-16, 16) : 0), py = y + (i ? U.rand(-9, 9) : 0);
      if (py < TOP + 4 || py > H - 4) continue;
      if (World.soilAt(px, py) < 0.35) continue;
      if (World.within(px, py, 9, 'crop').length) continue;
      let cost = def.seed;
      if (relic('greenpin')) cost = Math.ceil(cost / 2);
      if (G.money < cost) break;
      G.money -= cost;
      World.sow(G.selSeed, px, py);
      sown++;
    }
    if (!sown) { Audio.play('error'); UI.toast(World.soilAt(x, y) < 0.35 ? 'Seeds need tilled soil.' : 'No room, or no coin.', 'bad'); }
    else { Audio.play('click'); FX.sparkle(x, y - 6, 4, PAL.moss4); UI.refreshHUD(); }
  }
  function reap(x, y, r) {
    for (const e of World.within(x, y, r)) {
      if (e.kind === 'weed') {
        World.remove(e);
        G.money += 1; G.stats.cleared++;
        if (U.chance(0.15)) { G.fruitBank++; FX.float(e.x, e.y - 10, '+1 fruit', { color: PAL.moss4, world: true }); }
        FX.burst(e.x, e.y - 4, 4, { color: [PAL.ash3, PAL.bone1], speed: 50, life: 0.4 });
      } else if (World.ripe(e)) {
        const def = CROP_BY_KEY[e.crop];
        World.remove(e);
        const pay = Math.round(def.seed * 1.9);
        G.money += pay;
        G.fruitBank += def.fruit + (woke('nuru') ? 1 : 0);
        FX.float(e.x, e.y - 14, U.money(pay), { color: PAL.goldL, world: true });
      }
    }
    UI.refreshHUD();
  }

  // ---- input --------------------------------------------------------------
  function wombatAt(x, y) {
    for (let i = G.wombats.length - 1; i >= 0; i--) {
      const w = G.wombats[i];
      const a = ageOf(w);
      if (Math.abs(x - w.x) < 24 * a.s && y > w.y - 44 * a.s && y < w.y + 8) return w;
    }
    return null;
  }
  function dropAt(x, y) {
    for (let i = G.drops.length - 1; i >= 0; i--) {
      const d = G.drops[i];
      if (U.dist(x, y, d.x, d.y - 8) < 18) return { d, i };
    }
    return null;
  }
  function click(x, y) {
    brush.down = true; brush.x = x; brush.y = y; brush.lx = x; brush.ly = y;
    const hit = dropAt(x, y);
    if (hit) { collect(hit.d, hit.i); return; }
    if (currentTool()) { stroke(x, y, true); return; }
    const w = wombatAt(x, y);
    if (w) { pet(w); return; }
    Audio.play('click');
  }
  function drag(x, y) {
    if (!brush.down || !currentTool()) { brush.x = x; brush.y = y; return; }
    // Walk the stroke so a fast drag still paints a continuous band.
    const d = U.dist(brush.lx, brush.ly, x, y);
    const step = Math.max(3, brushRadius(currentTool()) * 0.4);
    const n = Math.min(24, Math.floor(d / step));
    for (let i = 1; i <= n; i++) stroke(U.lerp(brush.lx, x, i / n), U.lerp(brush.ly, y, i / n), false);
    if (n > 0) { brush.lx = x; brush.ly = y; }
    brush.x = x; brush.y = y;
  }
  function release() { brush.down = false; }
  function hover(x, y) {
    brush.x = x; brush.y = y;
    const hit = dropAt(x, y);
    if (hit) { const def = OFFERINGS[hit.d.type]; return `<b>${def.name}</b>${hit.d.premium ? ' <span class="good">blessed</span>' : ''}<br><span class="dim">${def.desc}</span>`; }
    const w = wombatAt(x, y);
    if (w) return wombatTip(w);
    const e = World.nearest('crop', x, y, 12);
    if (e) {
      const def = CROP_BY_KEY[e.crop];
      const pc = Math.floor(U.clamp(e.t / e.need, 0, 1) * 100);
      return `<b>${def.name}</b><br>${pc >= 100 ? '<span class="good">Ripe</span>' : 'Growing ' + pc + '%'}${e.wet > 0 ? ' <span class="dim">watered</span>' : ''}`;
    }
    return null;
  }
  function wombatTip(w) {
    const a = ageOf(w);
    const fur = Sprites.furOf(w.fur);
    const tr = (w.traits || []).map((t) => { const d = TRAIT_BY_KEY[t]; return d ? `<span style="color:${d.color}">${d.name}</span>` : ''; }).join(' ');
    const st = w.stomach === 'digesting' ? `Digesting ${U.time(w.digestT)}` : w.stomach === 'ready' ? 'About to go' : 'Hungry';
    return `<b>${w.name}</b> <span class="dim">${a.name} &middot; ${fur.name}</span><br>${st}<br>Happy ${Math.round(w.hap)}%${tr ? '<br>' + tr : ''}`;
  }

  // ---- sky and skyline ----------------------------------------------------
  function dayT() { return (G.time / 340) % 1; }
  function night() { const t = dayT(); return t > 0.72 ? U.clamp((t - 0.72) / 0.1, 0, 1) * (t > 0.95 ? (1 - t) / 0.05 : 1) : 0; }
  function buildSky() {
    const { c, g } = Art.cv(W, TOP);
    for (let y = 0; y < TOP; y++) {
      const t = y / TOP;
      g.fillStyle = U.shade(PAL.sky1, -0.35 + t * 0.55);
      g.fillRect(0, y, W, 1);
    }
    // ash haze: horizontal dithered bands, no gradients
    const r = Art.rng(41);
    for (let i = 0; i < 26; i++) {
      const y = Math.floor(r() * TOP), w = 60 + r() * 200, x = r() * W;
      g.globalAlpha = 0.16 + r() * 0.2;
      Art.ditherDisc(g, x, y, w * 0.18, PAL.ash3, 0.8, 0.9);
      g.globalAlpha = 1;
    }
    sky = c;
  }
  function buildRidge() {
    // A dead treeline, drawn once. Bare trunks and forks, no leaves anywhere.
    const { c, g } = Art.cv(W, 70);
    const r = Art.rng(97);
    for (let i = 0; i < 34; i++) {
      const x = r() * W, h = 20 + r() * 42, lean = (r() - 0.5) * 10;
      const col = r() < 0.5 ? PAL.bark1 : PAL.bark0;
      Art.limb(g, x, 70, x + lean, 70 - h, 3 + r() * 2, 1, col);
      for (let b = 0; b < 3; b++) {
        const t = 0.4 + b * 0.2, bx = x + lean * t, by = 70 - h * t;
        const s = r() < 0.5 ? -1 : 1;
        Art.limb(g, bx, by, bx + s * (5 + r() * 9), by - (5 + r() * 9), 2, 1, col);
      }
    }
    ridge = c;
  }

  function drawShrine(g, nt) {
    // The shrine on the ridge. It is scenery here; the ritual scene is its own.
    const x = W - 96, y = TOP + 8;
    Art.poly(g, [[x - 34, y], [x + 34, y], [x + 28, y - 10], [x - 28, y - 10]], PAL.stone1);
    Art.rect(g, x - 30, y - 12, 60, 3, PAL.stone2);
    for (let i = 0; i < 4; i++) {
      const px = x - 22 + i * 15;
      Art.rect(g, px, y - 44, 6, 32, PAL.stone1);
      Art.rect(g, px, y - 44, 2, 32, PAL.stone2);
      Art.rect(g, px - 1, y - 46, 8, 3, PAL.stone2);
    }
    Art.poly(g, [[x - 32, y - 46], [x + 32, y - 46], [x + 24, y - 58], [x - 24, y - 58]], PAL.stone0);
    const glow = Math.max(shrineGlow, nt * 0.4 + 0.15);
    g.globalAlpha = glow;
    Art.ditherDisc(g, x, y - 30, 22, PAL.vio2, 0.5, 1);
    g.globalAlpha = 1;
    const awake = G.gods ? Object.keys(G.gods).length : 0;
    for (let i = 0; i < awake && i < 10; i++) {
      Art.rect(g, x - 27 + i * 6, y - 52, 3, 3, PAL.goldL);
    }
  }

  function drawBurrow(g) {
    const x = 66, y = H - 44;
    Art.ell(g, x, y + 8, 40, 16, PAL.soil1);
    Art.ell(g, x, y + 4, 34, 13, PAL.soil2);
    Art.ell(g, x, y + 9, 15, 9, PAL.ink);
    Art.ell(g, x, y + 10, 12, 7, PAL.ink2);
    Art.speckle(g, x, y + 2, 30, 8, PAL.soil3, 22, 3);
    for (let i = 0; i < 5; i++) Art.rect(g, x - 22 + i * 11, y - 4 - (i % 2) * 2, 2, 6, PAL.bone2);
  }

  function drawWombat(g, w, t) {
    const a = ageOf(w);
    const pose = w.state === 'walk' ? 'walk' : w.state === 'eat' ? 'eat' : w.state === 'sleep' ? 'sleep'
      : w.state === 'strain' ? 'strain' : w.state === 'happy' ? 'happy' : w.state === 'dig' ? 'dig'
      : w.state === 'pray' ? 'pray' : w.state === 'love' ? 'love' : 'idle';
    const n = Sprites.POSES[pose];
    const rate = pose === 'walk' ? 9 : pose === 'eat' ? 6 : pose === 'strain' ? 8 : 3;
    const f = Math.floor((w.anim + t) * rate) % n;
    // contact shadow
    g.globalAlpha = 0.3;
    Art.ell(g, w.x, w.y + 2, 15 * a.s, 4 * a.s, PAL.ink);
    g.globalAlpha = 1;
    Sprites.blitWombat(g, w.x, w.y, pose, f, w.fur, w.dir, w.age, 1.5);
    statusPips(g, w);
  }
  function statusPips(g, w) {
    const a = ageOf(w);
    const y = w.y - 46 * a.s;
    if (w.stomach === 'digesting') {
      const p = 1 - w.digestT / Math.max(0.01, w.digestTotal);
      Art.rect(g, w.x - 12, y, 24, 4, PAL.ink);
      Art.rect(g, w.x - 11, y + 1, 22 * U.clamp(p, 0, 1), 2, PAL.moss3);
    } else if (w.stomach === 'ready') {
      Art.rect(g, w.x - 3, y - 2, 6, 6, PAL.goldL);
      Art.rect(g, w.x - 1, y, 2, 2, PAL.ink);
    }
    if (w.hap >= 80) { Art.rect(g, w.x + 14, y - 2, 2, 2, PAL.bloodL); Art.rect(g, w.x + 17, y - 2, 2, 2, PAL.bloodL); Art.rect(g, w.x + 14, y, 5, 2, PAL.bloodL); Art.rect(g, w.x + 15.5, y + 2, 2, 1, PAL.bloodL); }
    else if (w.hap < 22) { Art.rect(g, w.x + 14, y - 2, 2, 6, PAL.redL); Art.rect(g, w.x + 14, y + 5, 2, 2, PAL.redL); }
  }

  function drawDrop(g, d, t) {
    const def = OFFERINGS[d.type];
    if (!def) return;
    const bob = Math.sin(t * 3 + d.x) * 1;
    g.save();
    g.translate(Math.round(d.x), Math.round(d.y - 9 + bob));
    g.globalAlpha = 0.3; Art.ell(g, 0, 9 - bob, 10, 3, PAL.ink); g.globalAlpha = 1;
    Sprites.drawCube(g, def, 17 * def.w, 17 * def.h, { outline: PAL.ink });
    g.restore();
    if (d.premium) {
      const s = Math.floor(t * 4) % 2;
      Art.rect(g, d.x + 9, d.y - 20 + s, 2, 2, PAL.goldL);
      Art.rect(g, d.x - 11, d.y - 14 - s, 2, 2, PAL.goldL);
    }
    if (d.t > 16) { g.globalAlpha = 0.5; Art.rect(g, d.x - 8, d.y - 24, 16, 2, PAL.bone2); g.globalAlpha = 1; }
  }

  function render(g) {
    const t = G.time, nt = night();
    if (!sky) buildSky();
    if (!ridge) buildRidge();
    g.drawImage(sky, 0, 0);
    if (nt > 0) { g.fillStyle = U.rgba(PAL.vio0, nt * 0.6); g.fillRect(0, 0, W, TOP); }
    // moon or smothered sun
    const dt2 = dayT();
    const sx = W * ((dt2 * 1.2 + 0.1) % 1), sy = 30 + Math.sin(dt2 * Math.PI) * -14;
    if (nt > 0.35) { Art.ell(g, sx, sy, 7, 7, PAL.bone4); Art.ell(g, sx + 3, sy - 2, 5, 5, U.rgba(PAL.vio0, 0.9)); }
    else { Art.ditherDisc(g, sx, sy, 11, PAL.ash4, 0.8, 0.8); Art.ell(g, sx, sy, 6, 6, PAL.bone2); }
    g.drawImage(ridge, 0, TOP - 62);
    drawShrine(g, nt);
    World.renderGround(g, nt);
    drawBurrow(g);

    // one back-to-front pass over everything that stands on the ground
    const list = [];
    for (const e of World.collect()) list.push({ y: e.y, e });
    for (const w of G.wombats) list.push({ y: w.y, w });
    for (const d of G.drops) list.push({ y: d.y, d });
    for (const c of Breeding.cupids()) list.push({ y: c.y + 40, c });
    list.sort((a, b) => a.y - b.y);
    for (const it of list) {
      if (it.e) World.drawEntity(g, it.e, t);
      else if (it.w) drawWombat(g, it.w, t);
      else if (it.d) drawDrop(g, it.d, t);
      else if (it.c) Sprites.blitCupid(g, it.c.x, it.c.y, it.c.fur, Math.floor(t * 6), 1.2);
    }

    FX.drawParticles(g, 0);
    // ash drifting across the whole scene, thinning as the grove comes back
    const heavy = 1 - World.restoration() / 100;
    for (let i = 0; i < 40 * heavy; i++) {
      const x = ((i * 137 + t * (12 + i % 7)) % (W + 40)) - 20;
      const y = ((i * 91 + t * 9) % H);
      Art.rect(g, x, y, 1, 1, U.rgba(PAL.bone2, 0.35));
    }
    if (nt > 0.2) { g.fillStyle = U.rgba(PAL.vio0, nt * 0.2); g.fillRect(0, 0, W, H); }

    // brush cursor
    const k = currentTool();
    if (k && brush.y > TOP) World.drawBrush(g, brush.x, brush.y, brushRadius(k), toolColor(k), t);
    FX.drawFloaters(g, true);
  }

  return {
    init(state) { G = state; sky = null; ridge = null; },
    update, render, click, drag, release, hover, offline,
    addWombat, newWombat, rollFur, rollTraits, capacity, hasTrait, traitSum,
    night, dayT, ageOf, digestMult, offerValue, brushRadius, collect,
    enter() { UI.refreshOfferBar(); Audio.setMode('grove'); },
  };
})();
