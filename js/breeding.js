// ---- The warren: pairing, joeys, inherited traits --------------------------
// Traits are genes, not upgrades. A joey draws from the union of its parents'
// traits, so a line you have bred deliberately keeps what you selected for and
// a line you have not stays a muddle. Fur works the same way, with a small
// chance of something neither parent carried.
const Breeding = (() => {
  let G = null;
  let cupidList = [];

  const woke = (k) => !!(G.gods && G.gods[k]);
  const fruit = (k) => !!(G.fruit && G.fruit[k]);
  const relic = (k) => !!(G.relics && G.relics[k]);
  const byId = (id) => G.wombats.find((w) => w.id === id) || null;

  function eligible(w) { return w && (w.age === 'adult' || w.age === 'elder') && !w.pair; }
  function reason(a, b) {
    if (!a || !b) return 'Pick two wombats.';
    if (a === b) return 'A wombat cannot pair with itself.';
    if (a.age === 'joey' || b.age === 'joey') return 'Joeys are too young.';
    if (a.age === 'young' || b.age === 'young') return 'Both must be grown.';
    if (a.pair || b.pair) return 'Already paired.';
    if (G.wombats.length >= Grove.capacity()) return 'The warren is full.';
    return null;
  }
  function pairTime(a, b) {
    let t = PAIR_SECONDS;
    t /= 1 + Grove.traitSum(a, 'breed') + Grove.traitSum(b, 'breed');
    if (relic('knot')) t *= 0.5;
    if (woke('cupra')) t *= 0.8;
    return Math.max(20, t);
  }
  function pair(a, b) {
    const why = reason(a, b);
    if (why) { UI.toast(why, 'bad'); Audio.play('error'); return false; }
    const need = pairTime(a, b);
    const p = { id: U.uid(), a: a.id, b: b.id, t: 0, need };
    G.pairs.push(p);
    a.pair = p.id; b.pair = p.id;
    // They go and find each other.
    b.tx = a.x + 26; b.ty = a.y; b.target = 0; b.state = 'walk'; b.stateT = 8;
    UI.toast(`<b>${a.name}</b> and <b>${b.name}</b> have gone into the burrow.`, 'good');
    Audio.play('buy');
    if (woke('cupra')) spawnCupid((a.x + b.x) / 2, (a.y + b.y) / 2 - 40);
    return true;
  }
  function unpair(p) {
    const a = byId(p.a), b = byId(p.b);
    if (a) a.pair = 0;
    if (b) b.pair = 0;
    const i = G.pairs.indexOf(p);
    if (i >= 0) G.pairs.splice(i, 1);
  }
  // Are both halves of a pair standing near each other? Drives the love pose.
  function together(w) {
    const p = G.pairs.find((q) => q.id === w.pair);
    if (!p) return false;
    const o = byId(w.id === p.a ? p.b : p.a);
    return !!o && U.dist(w.x, w.y, o.x, o.y) < 46;
  }

  // ---- inheritance --------------------------------------------------------
  function inheritFur(a, b) {
    if (U.chance(0.08)) return Grove.rollFur();          // a throwback
    const from = U.chance(0.5) ? a : b;
    // Two carriers of the same rare coat breed true.
    if (a.fur === b.fur) return a.fur;
    return from.fur;
  }
  function inheritTraits(a, b) {
    const pool = Array.from(new Set([...(a.traits || []), ...(b.traits || [])]));
    const slots = fruit('lineage') ? 3 : 2;
    const out = [];
    // A trait both parents carry is passed on almost always; one parent, half.
    for (const k of pool) {
      if (out.length >= slots) break;
      const both = (a.traits || []).includes(k) && (b.traits || []).includes(k);
      if (U.chance(both ? 0.92 : 0.5)) out.push(k);
    }
    if (out.length < slots && U.chance(MUTATE_CHANCE)) {
      const fresh = Grove.rollTraits(1).filter((k) => out.indexOf(k) < 0);
      if (fresh.length) out.push(fresh[0]);
    }
    return out;
  }
  function birth(p) {
    const a = byId(p.a), b = byId(p.b);
    unpair(p);
    if (!a || !b) return;
    let n = 1;
    if (Grove.hasTrait(a, 'twins') || Grove.hasTrait(b, 'twins')) n = 2;
    else if (fruit('litter') && U.chance(0.25)) n = 2;
    const room = Math.max(0, Grove.capacity() - G.wombats.length);
    n = Math.min(n, room);
    if (n <= 0) { UI.toast('No room in the warren for the joey.', 'bad'); return; }
    const names = [];
    for (let i = 0; i < n; i++) {
      const j = Grove.addWombat({
        fur: inheritFur(a, b), traits: inheritTraits(a, b),
        age: 'joey', ageT: 0, hap: 70,
        x: 66 + U.rand(-16, 16), y: 316 + U.rand(-6, 6),
        born: G.time, sire: a.name, dam: b.name,
      });
      j.tx = j.x; j.ty = j.y;
      names.push(j.name);
      FX.hearts(j.x, j.y - 20, 5);
      FX.sparkle(j.x, j.y - 16, 8, PAL.bloodL);
    }
    G.stats.born += n;
    UI.toast(`${names.map((s) => '<b>' + s + '</b>').join(' and ')} ${n > 1 ? 'were' : 'was'} born to ${a.name} and ${b.name}.`, 'good');
    Audio.play('levelup');
    UI.refreshHUD();
    if (UI.warrenOpen && UI.warrenOpen()) UI.renderWarren();
  }

  // ---- elders -------------------------------------------------------------
  // Only offered once Marrow is awake, and only ever by the player's hand: an
  // elder is never taken away without being asked for.
  function canRetire(w) { return woke('marrow') && w.age === 'elder'; }
  function retire(w) {
    if (!canRetire(w)) return false;
    const i = G.wombats.indexOf(w);
    if (i < 0) return false;
    if (G.wombats.length <= 1) { UI.toast('Not the last of them.', 'bad'); return false; }
    if (w.pair) { const p = G.pairs.find((q) => q.id === w.pair); if (p) unpair(p); }
    G.wombats.splice(i, 1);
    G.offerings.ossuary = (G.offerings.ossuary || 0) + 3;
    G.remembered.push({ name: w.name, fur: w.fur, traits: w.traits || [], at: Math.floor(G.time) });
    G.favour += 30; G.favourEver += 30;
    FX.sparkle(w.x, w.y - 20, 16, PAL.bone4);
    FX.float(w.x, w.y - 40, w.name, { color: PAL.bone4, world: true, life: 2.4 });
    UI.toast(`<b>${w.name}</b> goes into the bone. Marrow keeps the name.`, 'good');
    Audio.play('record');
    UI.refreshHUD(); UI.refreshOfferBar();
    return true;
  }

  // ---- cupids -------------------------------------------------------------
  // Cupra's, and purely hers: without her blessing none of these exist.
  function spawnCupid(x, y) {
    cupidList.push({ x, y, tx: x, ty: y, t: 0, life: U.rand(8, 16), fur: U.pick(['bone', 'gilded', 'ash']) });
  }
  function updateCupids(dt) {
    if (woke('cupra') && cupidList.length < 2 + G.pairs.length && U.chance(dt * 0.05)) {
      spawnCupid(U.rand(80, 560), U.rand(150, 260));
    }
    for (let i = cupidList.length - 1; i >= 0; i--) {
      const c = cupidList[i];
      c.t -= dt; c.life -= dt;
      if (c.t <= 0) {
        c.t = U.rand(1.2, 2.8);
        const p = G.pairs.length ? G.pairs[U.randi(0, G.pairs.length - 1)] : null;
        const a = p ? byId(p.a) : null;
        c.tx = U.clamp((a ? a.x : c.x) + U.rand(-60, 60), 30, 610);
        c.ty = U.clamp((a ? a.y - 46 : c.y) + U.rand(-24, 24), 140, 280);
      }
      c.x += (c.tx - c.x) * dt * 1.1;
      c.y += (c.ty - c.y) * dt * 1.1 + Math.sin(G.time * 3 + c.x) * 6 * dt;
      if (c.life <= 0) cupidList.splice(i, 1);
    }
  }

  function update(dt) {
    updateCupids(dt);
    for (let i = G.pairs.length - 1; i >= 0; i--) {
      const p = G.pairs[i];
      const a = byId(p.a), b = byId(p.b);
      if (!a || !b) { unpair(p); continue; }
      // A pair only makes progress while they are actually together.
      const near = U.dist(a.x, a.y, b.x, b.y) < 46;
      if (near) p.t += dt * (1 + (a.hap + b.hap) / 400);
      else if (U.chance(dt * 0.4)) { b.tx = a.x + 26; b.ty = a.y; b.state = 'walk'; b.stateT = 8; b.target = 0; }
      if (p.t >= p.need) birth(p);
    }
  }

  function progress(p) { return U.clamp(p.t / p.need, 0, 1); }
  function pairOf(w) { return G.pairs.find((q) => q.id === w.pair) || null; }

  return {
    init(state) { G = state; cupidList = []; },
    update, pair, unpair, birth, together, progress, pairOf, eligible, reason,
    canRetire, retire, inheritTraits, inheritFur, spawnCupid,
    cupids: () => cupidList,
  };
})();
