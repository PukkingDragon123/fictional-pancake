// ---- The wild ---------------------------------------------------------------
// Everything in the grove that is neither yours nor the work: the shape of the
// ground you dig into it, the small things living in the grass, and the people
// who wander in to have a look at what you have done with the place.
//
// Three parts, all owned here so grove.js stays about wombats:
//   TERRAIN   mounds you raise and ponds you dig, saved with the world
//   CRITTERS  beetles, butterflies, bees, dragonflies, frogs, ants, a lizard
//   VISITORS  Shaz, Groot and a few others, who turn up, stay a while, talk
const Wild = (() => {
  let G = null;
  let W = 0, H = 0, GROUND = 0, walk = { y0: 0, y1: 0 };
  const mounds = [], ponds = [];
  const bugs = [], frogs = [];
  const visitors = [];
  let t = 0, spawnT = 22;

  function init(g, world) {
    G = g;
    W = world.W; H = world.H; GROUND = world.GROUND; walk = world.walk;
    mounds.length = 0; ponds.length = 0;
    const s = (G.world && G.world.land) || {};
    if (Array.isArray(s.mounds)) for (const m of s.mounds) mounds.push(mkMound(m.x, m.y, m.r, m.seed));
    if (Array.isArray(s.ponds)) for (const p of s.ponds) ponds.push(mkPond(p.x, p.y, p.r, p.seed));
    seedBugs();
    visitors.length = 0;
    t = 0; spawnT = 16 + Math.random() * 20;
  }
  function save() {
    return {
      mounds: mounds.map((m) => ({ x: m.x, y: m.y, r: m.r, seed: m.seed })),
      ponds: ponds.map((p) => ({ x: p.x, y: p.y, r: p.r, seed: p.seed })),
    };
  }

  // ---- terrain --------------------------------------------------------------
  const MOUND_COST = 0, POND_COST = 0;             // shaping the land is free
  function mkMound(x, y, r, seed) {
    const rr = Art.rng(seed);
    const tufts = [];
    for (let i = 0; i < Math.round(r * 0.9); i++) {
      const a = rr() * TAU, d = Math.sqrt(rr());
      tufts.push({ dx: Math.cos(a) * r * d * 0.92, dy: Math.sin(a) * r * 0.42 * d - r * 0.16, h: 3 + rr() * 5, v: Math.floor(rr() * 3) });
    }
    const rocks = [];
    for (let i = 0; i < 3; i++) rocks.push({ dx: (rr() - 0.5) * r * 1.5, dy: (rr() - 0.4) * r * 0.5, w: 3 + rr() * 5 });
    return { x, y, r, seed, tufts, rocks, kind: 'mound' };
  }
  function mkPond(x, y, r, seed) {
    const rr = Art.rng(seed);
    const reeds = [];
    for (let i = 0; i < Math.round(r * 0.55); i++) {
      const a = rr() * TAU;
      reeds.push({ dx: Math.cos(a) * r * (0.94 + rr() * 0.22), dy: Math.sin(a) * r * 0.46 * (0.94 + rr() * 0.22), h: 7 + rr() * 11, ph: rr() * TAU, cat: rr() < 0.4 });
    }
    const pads = [];
    for (let i = 0; i < Math.max(2, Math.round(r * 0.14)); i++) {
      const a = rr() * TAU, d = 0.25 + rr() * 0.5;
      pads.push({ dx: Math.cos(a) * r * d, dy: Math.sin(a) * r * 0.44 * d, s: 3.5 + rr() * 3, fl: rr() < 0.4 });
    }
    return { x, y, r, seed, reeds, pads, kind: 'pond', ripple: 0 };
  }
  const near = (list, x, y, pad) => list.find((o) => {
    const dx = (x - o.x) / (o.r + pad), dy = (y - o.y) / (o.r * 0.45 + pad);
    return dx * dx + dy * dy < 1;
  });
  // is (x,y) standing on a pond? the grove asks so wombats do not walk on water
  const onPond = (x, y) => !!near(ponds, x, y, -2);
  const onMound = (x, y) => !!near(mounds, x, y, -2);
  function canPlace(kind, x, y) {
    if (y < walk.y0 - 6 || y > walk.y1 + 10) return 'not on the path';
    if (near(mounds, x, y, 14) || near(ponds, x, y, 14)) return 'too close to another';
    return null;
  }
  // Take a hill down or fill a hole in. Cheap, because undoing a mistake
  // should never cost as much as making it.
  function level(x, y, r) {
    let n = 0;
    for (let i = mounds.length - 1; i >= 0; i--) {
      const m = mounds[i];
      if (Math.hypot(m.x - x, (m.y - y) * 1.6) < r + m.r * 0.5) { mounds.splice(i, 1); n++; }
    }
    for (let i = ponds.length - 1; i >= 0; i--) {
      const p2 = ponds[i];
      if (Math.hypot(p2.x - x, (p2.y - y) * 1.6) < r + p2.r * 0.5) {
        ponds.splice(i, 1); n++;
        for (let j = frogs.length - 1; j >= 0; j--) if (frogs[j].pond === p2) frogs.splice(j, 1);
      }
    }
    if (!n) return false;
    FX.dust(x, y, 12, PAL.soil2);
    Audio.play('dig');
    UI.refreshHUD(); Main.save();
    return true;
  }
  // ---- sculpting -----------------------------------------------------------
  // Held down and dragged, not clicked. A stroke finds whatever is already
  // under the brush and grows it; if there is nothing it starts something
  // small. Ground you have already paid for is free to keep shaping, so a hill
  // is one purchase and then as much fiddling as you like.
  const MAX_R = 74, MIN_R = 13;
  function sculpt(kind, x, y, br, first) {
    const list = kind === 'raise' ? mounds : ponds;
    const other = kind === 'raise' ? ponds : mounds;
    // a stroke over the opposite kind takes it down first
    for (let i = other.length - 1; i >= 0; i--) {
      const o = other[i];
      if (Math.hypot(o.x - x, (o.y - y) * 1.6) < br * 0.7) {
        o.r -= br * 0.05;
        if (o.r < MIN_R) {
          other.splice(i, 1);
          if (kind === 'raise') for (let j = frogs.length - 1; j >= 0; j--) if (frogs[j].pond === o) frogs.splice(j, 1);
        }
        return true;
      }
    }
    // grow whatever is already here
    let near = null, nd = 1e9;
    for (const m of list) {
      const d = Math.hypot(m.x - x, (m.y - y) * 1.6);
      if (d < br + m.r * 0.6 && d < nd) { nd = d; near = m; }
    }
    if (near) {
      if (near.r < MAX_R) near.r = Math.min(MAX_R, near.r + br * 0.055);
      // and it drifts toward the brush, so a stroke pulls the shape along
      near.x = U.lerp(near.x, x, 0.02);
      near.y = U.lerp(near.y, y, 0.012);
      if (kind === 'raise') World.sowGrass(x, y, 14);
      return true;
    }
    // nothing here: start one, and that is the only part you pay for
    if (!first) return false;
    // the brush already shows you it cannot work here, so this stays quiet
    const why = canPlace(kind === 'raise' ? 'mound' : 'pond', x, y);
    if (why) { Audio.play('error'); return false; }
    const cost = kind === 'raise' ? MOUND_COST : POND_COST;
    if (G.wd < cost) { Audio.play('error'); UI.toast('not enough for that', 'bad'); return false; }
    G.wd -= cost;
    const seed = Math.floor(Math.random() * 1e6);
    if (kind === 'raise') { mounds.push(mkMound(x, y, MIN_R + 3, seed)); World.sowGrass(x, y, 16); }
    else {
      const p2 = mkPond(x, y, MIN_R + 3, seed);
      ponds.push(p2); World.till(x, y, 16);
      for (let i = 0; i < 2; i++) frogs.push(mkFrog(p2));
    }
    FX.dust(x, y, 8, PAL.soil3);
    Audio.play('dig');
    UI.refreshHUD();
    return true;
  }
  // a stroke that flattens instead of raising
  // Smooth does not delete: it eases. Whatever is under the brush loses a
  // little of itself each frame, and the closer the middle of the brush is to
  // the middle of the shape the more it loses, so rubbing an edge softens the
  // edge and rubbing the top takes the top off.
  function flatten(x, y, br) {
    let any = false;
    for (const list of [mounds, ponds]) {
      for (let i = list.length - 1; i >= 0; i--) {
        const m = list[i];
        const d = Math.hypot(m.x - x, (m.y - y) * 1.6);
        if (d > br + m.r) continue;
        const bite = U.clamp(1 - d / (br + m.r), 0, 1);
        m.r -= br * 0.055 * bite;
        // and it drifts away from the brush, so you can push a hill about
        m.x = U.lerp(m.x, m.x + (m.x - x) * 0.06, bite);
        any = true;
        if (m.r < MIN_R) {
          list.splice(i, 1);
          for (let j = frogs.length - 1; j >= 0; j--) if (frogs[j].pond === m) frogs.splice(j, 1);
        }
      }
    }
    return any;
  }
  function place(kind, x, y) {
    const why = canPlace(kind, x, y);
    if (why) { Audio.play('error'); UI.toast(why, 'bad'); return false; }
    const cost = kind === 'mound' ? MOUND_COST : POND_COST;
    if (G.wd < cost) { Audio.play('error'); UI.toast('not enough for that', 'bad'); return false; }
    G.wd -= cost;
    const seed = Math.floor(Math.random() * 1e6);
    if (kind === 'mound') {
      mounds.push(mkMound(x, y, 30 + Math.random() * 16, seed));
      World.sowGrass(x, y, 24);
      FX.dust(x, y, 14, PAL.soil3);
      UI.toast('a hill. the view is better up there.', 'good');
    } else {
      const p = mkPond(x, y, 30 + Math.random() * 14, seed);
      ponds.push(p);
      World.till(x, y, 22);
      FX.dust(x, y, 16, PAL.soil2);
      for (let i = 0; i < 2; i++) frogs.push(mkFrog(p));
      UI.toast('a pond. something will move into it.', 'good');
    }
    Audio.play('dig'); Audio.play('till');
    UI.refreshHUD();
    Main.save();
    return true;
  }

  // ---- the small things -----------------------------------------------------
  const BUG_KINDS = ['beetle', 'butterfly', 'bee', 'dragonfly', 'ant', 'moth', 'snail', 'lizard'];
  function mkBug(kind, x, y) {
    return {
      kind, x, y, t: Math.random() * 9, ph: Math.random() * TAU,
      tx: x, ty: y, wait: Math.random() * 3, dir: Math.random() < 0.5 ? -1 : 1,
      z: kind === 'butterfly' || kind === 'dragonfly' || kind === 'bee' || kind === 'moth' ? 10 + Math.random() * 18 : 0,
      col: Math.floor(Math.random() * 4), sp: 0.8 + Math.random() * 0.7,
    };
  }
  function mkFrog(p) {
    const a = Math.random() * TAU;
    return { x: p.x + Math.cos(a) * p.r * 0.95, y: p.y + Math.sin(a) * p.r * 0.44, pond: p, t: 0, hop: 0, croak: 0, dir: Math.random() < 0.5 ? -1 : 1 };
  }
  function seedBugs() {
    bugs.length = 0; frogs.length = 0;
    const n = 26;
    for (let i = 0; i < n; i++) {
      const k = BUG_KINDS[Math.floor(Math.random() * 6)];
      bugs.push(mkBug(k, 60 + Math.random() * (W - 120), walk.y0 + Math.random() * (walk.y1 - walk.y0)));
    }
    bugs.push(mkBug('lizard', W * 0.3, walk.y1 - 10));
    bugs.push(mkBug('snail', W * 0.6, walk.y0 + 30));
    for (const p of ponds) for (let i = 0; i < 2; i++) frogs.push(mkFrog(p));
  }

  // ---- the visitors ---------------------------------------------------------
  // Each one walks in from an edge, drifts about for a minute or two, and goes
  // home. Click one and you get the full dialogue panel.

  // Everyone who lives within a morning's walk. `tree` is what they will talk
  // about; `gift` is what they leave on the fence post before they go.
  const VILLAGE = [
    {
      key: 'bee', name: 'Maud', why: 'with a jar of something',
      sprite: (f, pose) => Sprites.villager('bee', f, pose), sc: 1.5,
      poses: { walk: 'walk', idle: 'idle', talk: 'talk' },
      gift: () => { for (const w of G.wombats) w.hap = Math.min(100, w.hap + 16); return 'Maud left a jar of honey; everybody had some'; },
      tree: () => ({
        start: 'hub',
        nodes: {
          hub: { mood: 'happy', sub: 'forty hives on the ridge',
            say: 'Brought you a jar. Do not give it to the wombats straight, they go peculiar. A spoonful in the water and they will love you forever.',
            opts: [
              { q: 'How are the bees?', to: 'bees' },
              { q: 'Peculiar how?', to: 'odd' },
              { q: 'Do my flowers help?', to: 'flow' },
              { q: 'Thanks, Maud.', end: true },
            ] },
          bees: { mood: 'talk', say: 'Busy. It has been a wet one, which they hate and the clover loves, so on balance nobody is happy but there is a lot of honey.',
            opts: [{ q: 'Sounds about right.', to: 'hub' }] },
          odd: { mood: 'happy', say: 'One of them dug a hole through the floor of my shed and out the other side. In an afternoon. On honey.',
            opts: [{ q: 'Noted.', to: 'hub' }] },
          flow: { mood: 'proud', say: 'Everything you plant out here, mine find within the week. Keep planting. I am not being generous, I am being commercial.',
            opts: [{ q: 'A deal, then.', to: 'hub' }] },
        },
      }),
    },
    {
      key: 'fish', name: 'Errol', why: 'back from the lake',
      sprite: (f, pose) => Sprites.villager('fish', f, pose), sc: 1.55,
      poses: { walk: 'walk', idle: 'idle', talk: 'talk' },
      gift: () => { const n = 60 + Math.floor(Math.random() * 90); G.wd += n; return `Errol sold you his catch for ${U.fmt(n)} W$ less than it was worth`; },
      tree: () => ({
        start: 'hub',
        nodes: {
          hub: { mood: 'talk', sub: 'nothing on the line since Tuesday',
            say: 'Walked past and thought: that fellow has wombats. So here I am, standing in your garden, not fishing. An improvement.',
            opts: [
              { q: 'Catch anything?', to: 'catch' },
              { q: 'What is in the lake?', to: 'lake' },
              { q: 'Should I dig a pond?', to: 'pond' },
              { q: 'Good luck out there.', end: true },
            ] },
          catch: { mood: 'sad', say: 'A boot, a bucket and the same eel three times. He knows me now. We have an understanding.',
            opts: [{ q: 'Give him my regards.', to: 'hub' }] },
          lake: { mood: 'worry', say: 'Water. Fish. And something underneath that has never once taken a hook, which is the part that keeps me going back.',
            opts: [{ q: 'Do not find out.', to: 'hub' }] },
          pond: { mood: 'happy', say: 'Dig one. Wombats drink like they are being timed, and a pond fills itself when it rains. Cheapest thing you will ever build.',
            opts: [{ q: 'I will do that.', to: 'hub' }] },
        },
      }),
    },
    {
      key: 'post', name: 'Bev', why: 'with the post',
      sprite: (f, pose) => Sprites.villager('post', f, pose), sc: 1.5,
      poses: { walk: 'walk', idle: 'idle', talk: 'talk' },
      gift: () => { const c = U.pick(PLANTS_OF('crop')); G.seeds[c.key] = (G.seeds[c.key] || 0) + 5; return `a packet of ${c.name} seed, posted to the wrong address`; },
      tree: () => ({
        start: 'hub',
        nodes: {
          hub: { mood: 'talk', sub: 'the round takes four hours and she likes it',
            say: 'Nothing for you. There is never anything for you. I come anyway because the last three houses on this road are all yours and I have nothing else to do.',
            opts: [
              { q: 'Who writes to anyone out here?', to: 'mail' },
              { q: 'What is in the sack?', to: 'sack' },
              { q: 'Seen anything odd?', to: 'odd' },
              { q: 'Safe round, Bev.', end: true },
            ] },
          mail: { mood: 'cross', say: 'The department, to the ranger. Seed catalogues, to Groot, who cannot read them and keeps them anyway. And bills. Always bills.',
            opts: [{ q: 'Grim.', to: 'hub' }] },
          sack: { mood: 'happy', say: 'A packet that has been to four wrong addresses and is not going to a fifth. It is seed. Have it. Sign nothing.',
            opts: [{ q: 'Very kind.', to: 'hub' }] },
          odd: { mood: 'worry', say: 'Your Aunt Fern, out by the hedge, waving at me with a sunflower. Every week. Lovely woman.',
            opts: [{ q: 'That is just her.', to: 'hub' }] },
        },
      }),
    },
    {
      key: 'bake', name: 'Nonna', why: 'with a tray of something hot',
      sprite: (f, pose) => Sprites.villager('bake', f, pose), sc: 1.45,
      poses: { walk: 'walk', idle: 'idle', talk: 'talk' },
      gift: () => { for (const w of G.wombats) { w.hap = 100; w.bored = 0; } return 'Nonna fed everybody and would not be argued with'; },
      tree: () => ({
        start: 'hub',
        nodes: {
          hub: { mood: 'happy', sub: 'she has been baking since four',
            say: 'You are too thin and your animals are too fat, so somebody here is eating wrong. Sit. Have one. I am not taking them home.',
            opts: [
              { q: 'What is in them?', to: 'what' },
              { q: 'You did not have to.', to: 'must' },
              { q: 'Do they get one?', to: 'them' },
              { q: 'Thank you, Nonna.', end: true },
            ] },
          what: { mood: 'sly', say: 'Flour, butter, and a question you do not need the answer to. Eat.',
            opts: [{ q: 'Eating.', to: 'hub' }] },
          must: { mood: 'cross', say: 'I did. Nobody lives out here on their own and eats properly. I have seen your larder from the road.',
            opts: [{ q: 'Fair enough.', to: 'hub' }] },
          them: { mood: 'happy', say: 'They already have. All of them. Twice. Do not look at me like that, look at their faces.',
            opts: [{ q: 'They do look happy.', to: 'hub' }] },
        },
      }),
    },
    {
      key: 'bota', name: 'Dr Finch', why: 'looking for a plant',
      sprite: (f, pose) => Sprites.villager('bota', f, pose), sc: 1.55,
      poses: { walk: 'walk', idle: 'idle', talk: 'talk' },
      gift: () => { const c = U.pick(PLANTS_OF('crop')); G.seeds[c.key] = (G.seeds[c.key] || 0) + 2; return `Dr Finch left two ${c.name} seeds and a wave`; },
      tree: () => ({
        start: 'hub',
        nodes: {
          hub: { mood: 'think', sub: 'university of somewhere, thirty years ago',
            say: 'Do not mind me. I am counting. There is something growing on your land that is not supposed to exist below the tree line and I would like to know how you managed it.',
            opts: [
              { q: 'Which one?', to: 'which' },
              { q: 'Is it dangerous?', to: 'danger' },
              { q: 'How do I grow more?', to: 'grow' },
              { q: 'Count away.', end: true },
            ] },
          which: { mood: 'happy', say: 'If I tell you, you will dig it up and put it in a pot, and then it will die, and then I will cry in front of you. Let us not.',
            opts: [{ q: 'Understood.', to: 'hub' }] },
          danger: { mood: 'worry', say: 'The mandrake screams and the snapjaw bites. Neither is dangerous. The dreamcap is perfectly safe and I will not be saying anything further about the dreamcap.',
            opts: [{ q: '...right.', to: 'hub' }] },
          grow: { mood: 'proud', say: 'Every magical plant wants one thing and will sulk until it gets it. Night, drought, company, solitude, shade. Find the thing. Give it the thing.',
            opts: [{ q: 'Find the thing. Got it.', to: 'hub' }] },
        },
      }),
    },
    {
      key: 'bard', name: 'Little Ash', why: 'with a song about you',
      sprite: (f, pose) => Sprites.villager('bard', f, pose), sc: 1.4,
      poses: { walk: 'walk', idle: 'idle', talk: 'talk' },
      gift: () => { const n = 30 + Math.floor(Math.random() * 40); G.wd += n; return `they passed the hat after the song and it came to ${U.fmt(n)} W$`; },
      tree: () => ({
        start: 'hub',
        nodes: {
          hub: { mood: 'happy', sub: 'twelve, and already unbearable',
            say: 'I wrote a song about your wombats. It is four verses. There is a chorus. You do not have a choice about this.',
            opts: [
              { q: 'Go on then.', to: 'song' },
              { q: 'Who taught you?', to: 'who' },
              { q: 'Four verses?', to: 'four' },
              { q: 'Maybe next time.', end: true },
            ] },
          song: { mood: 'proud', say: 'THE WOMBATS OF THE GROVE, they dig and they are ROUND. They leave behind a CUBE, the finest in the TOWN. ...There are three more verses.',
            opts: [{ q: 'That was genuinely good.', to: 'good' }, { q: 'Three more?', to: 'four' }] },
          good: { mood: 'happy', say: 'I know. I am going to be enormous.',
            opts: [{ q: 'I believe you.', to: 'hub' }] },
          four: { mood: 'cross', say: 'The fourth one is about Aunt Fern\'s roses and it is the best one and nobody ever lets me get to it.',
            opts: [{ q: 'Next time, I promise.', to: 'hub' }] },
          who: { mood: 'talk', say: 'Nobody. There is one lute in the Flats and it was in a cupboard. It is mine now by the law of nobody else wanting it.',
            opts: [{ q: 'That is how it works.', to: 'hub' }] },
        },
      }),
    },
  ];

  const GUESTS = [
    {
      key: 'shaz', name: 'Shaz', why: 'on her day off',
      sprite: (f, pose) => Sprites.cashier(f, pose), sc: 1.9, poses: { walk: 'walk', idle: 'idle', talk: 'talk' },
      gift: () => { const n = 40 + Math.floor(Math.random() * 60); G.wd += n; return `Shaz left ${U.fmt(n)} W$ on the fence post`; },
      tree: () => ({
        start: 'hub',
        nodes: {
          hub: { mood: 'happy', sub: 'she drove out to look at your wombats',
            say: 'There she IS. Oh she is a big girl. I have been telling Kevin about this place all week.',
            opts: [
              { q: 'You came all this way?', to: 'far' },
              { q: 'How is the shop?', to: 'shop' },
              { q: 'Want to hold one?', to: 'hold' },
              { q: 'Good to see you, Shaz.', end: true },
            ] },
          far: { mood: 'talk', say: 'Twenty minutes. I do it Sundays. There is nothing out here and that is the whole point of it.',
            opts: [{ q: 'Fair.', to: 'hub' }] },
          shop: { mood: 'cross', say: 'Head office want me to move the pies. The pies have been there since I started. The pies are load-bearing.',
            opts: [{ q: 'Do not move the pies.', to: 'hub' }] },
          hold: { mood: 'surprise', say: 'Can I? Oh. Oh she is heavier than she looks. Hello. Hello. Look at your little face.',
            opts: [{ q: 'She likes you.', to: 'hold2' }] },
          hold2: { mood: 'happy', say: 'I am going to think about this for the rest of the week.',
            opts: [{ q: 'Come back any time.', to: 'hub' }] },
        },
      }),
    },
    {
      key: 'groot', name: 'Groot', why: 'delivering',
      sprite: (f, pose) => Sprites.groot(f, pose), sc: 1.4, poses: { walk: 'walk', idle: 'idle', talk: 'talk' },
      gift: () => { const c = U.pick(CROPS.slice(0, 6)); G.seeds[c.key] = (G.seeds[c.key] || 0) + 4; return `Groot left four ${c.name} seeds by the gate`; },
      tree: () => ({
        start: 'hub',
        nodes: {
          hub: { mood: 'happy', sub: 'he brought something and will not say what',
            say: 'I am Groot.',
            opts: [
              { q: 'You came out of the cellar?', to: 'out' },
              { q: 'Is that for me?', to: 'gift' },
              { q: 'How is the soil looking?', to: 'soil' },
              { q: 'Good to see you, Groot.', end: true },
            ] },
          out: { mood: 'curious', sub: 'once a season, when the light is right', say: 'I am Groot?',
            opts: [{ q: 'It suits you.', to: 'hub' }] },
          gift: { mood: 'proud', sub: 'he left it by the gate an hour ago', say: 'I. Am. Groot.',
            opts: [{ q: 'Thank you.', to: 'hub' }] },
          soil: { mood: 'talk', sub: 'better than last time. keep the water up.', say: 'I am Groot!',
            opts: [{ q: 'Will do.', to: 'hub' }] },
        },
      }),
    },
    {
      key: 'ranger', name: 'The Ranger', why: 'doing the rounds',
      sprite: (f, pose) => Sprites.villager('ranger', f, pose === 'walk' ? 'walk' : pose === 'talk' ? 'talk' : 'idle'), sc: 1.45,
      poses: { walk: 'walk', idle: 'idle', talk: 'idle' },
      gift: () => { const n = 90 + Math.floor(Math.random() * 120); G.wd += n; return `the ranger paid ${U.fmt(n)} W$ for the count`; },
      tree: () => ({
        start: 'hub',
        nodes: {
          hub: { mood: 'think', sub: 'parks and wildlife, apparently',
            say: 'Morning. Doing the burrow count. You have got more here than the whole of the Flats put together, which is either very good news or a paperwork problem.',
            opts: [
              { q: 'Is that a problem?', to: 'problem' },
              { q: 'Who do you work for?', to: 'who' },
              { q: 'Count away.', end: true },
            ] },
          problem: { mood: 'sly', say: 'Not for me. I get paid per wombat counted. Keep going, you are funding my retirement.',
            opts: [{ q: 'Glad to help.', to: 'hub' }] },
          who: { mood: 'worry', say: 'The department. The one above that. It is best not to look into it too closely, and I say that as its employee.',
            opts: [{ q: 'Noted.', to: 'hub' }] },
        },
      }),
    },
    {
      key: 'kid', name: 'A Kid', why: 'on a bike',
      sprite: (f, pose) => Sprites.wombat(pose === 'walk' ? 'walk' : 'idle', f, 'sand', 1, 'juvenile'), sc: 1.6,
      poses: { walk: 'walk', idle: 'idle', talk: 'idle' },
      gift: () => { G.offerings.plain = (G.offerings.plain || 0) + 2; return 'the kid left two cubes he found on the road'; },
      tree: () => ({
        start: 'hub',
        nodes: {
          hub: { mood: 'happy', sub: 'rode out from the Flat to see the wombats',
            say: 'Is it true they do square ones? Mum says it is not true. Mum has never seen one.',
            opts: [
              { q: 'It is completely true.', to: 'yes' },
              { q: 'Go and look for yourself.', to: 'look' },
              { q: 'Careful on the road.', end: true },
            ] },
          yes: { mood: 'shock', say: 'SQUARE?! I am telling everyone. I am telling the whole bus.',
            opts: [{ q: 'You do that.', to: 'hub' }] },
          look: { mood: 'happy', say: 'I found two on the road on the way in. You can have them. I have got heaps.',
            opts: [{ q: 'Very generous.', to: 'hub' }] },
        },
      }),
    },
    // ---- the village ------------------------------------------------------
    // Six people from down the road, each with a reason to be here and
    // something in their hands. They use the same walk-in, stand-about,
    // leave-a-gift loop as everyone else.
    ...VILLAGE,
  ];
  function spawnVisitor() {
    if (visitors.length) return;
    const def = GUESTS[Math.floor(Math.random() * GUESTS.length)];
    const fromLeft = Math.random() < 0.5;
    visitors.push({
      def, x: fromLeft ? -40 : W + 40, y: walk.y1 - 16,
      tx: 160 + Math.random() * (W - 320), ty: walk.y0 + 20 + Math.random() * (walk.y1 - walk.y0 - 40),
      dir: fromLeft ? 1 : -1, state: 'arrive', t: 0, stay: 55 + Math.random() * 50,
      anim: 0, gave: false, said: 0, bob: 0,
    });
    UI.toast(`<b>${def.name}</b> is here &mdash; ${def.why}`, 'good');
    Audio.play('chime');
  }
  function visitorAt(x, y) {
    for (const v of visitors) if (v.state !== 'leave' && Math.abs(x - v.x) < 22 && y > v.y - 56 && y < v.y + 8) return v;
    return null;
  }
  function talkTo(v) {
    if (!v) return;
    v.state = 'talk'; v.t = 0;
    const who = { kid: 'kid' }[v.def.key] || (Sprites.VILLAGERS[v.def.key] ? 'villager:' + v.def.key : v.def.key);
    Talk.open(who, v.def.tree(), () => {
      if (v.state === 'talk') v.state = 'wander';
      if (!v.gave) {
        v.gave = true;
        const msg = v.def.gift();
        UI.toast(msg, 'good'); UI.refreshHUD(); UI.refreshTray(); Main.save();
        // and they text on the way home
        const BYE = {
          bee: 'got back fine. that big grey one watched me the whole way to the gate',
          fish: 'nothing on the line again. your wombats were better company',
          post: 'nothing for you tomorrow either. see you then',
          bake: 'eat the other one. do not save it. i will know',
          bota: 'I have written you up as an anomaly. Meant kindly.',
          bard: 'verse four is about the roses and it is the best one',
          shaz: 'got home!! tell the big one i said hi 😄',
          groot: 'I am Groot.',
          ranger: 'Count logged. Nineteen. Nobody at the office believes me.',
          kid: 'i told the whole bus. the whole bus knows now',
        };
        if (BYE[v.def.key]) setTimeout(() => Phone.push(v.def.key, BYE[v.def.key]), 9000);
      }
    });
  }

  // ---- update ---------------------------------------------------------------
  function update(dt) {
    t += dt;
    for (const p of ponds) p.ripple += dt;
    // bugs
    for (const b of bugs) {
      b.t += dt * b.sp;
      if (b.kind === 'butterfly' || b.kind === 'moth') {
        b.x += Math.cos(b.t * 0.7 + b.ph) * 26 * dt;
        b.y += Math.sin(b.t * 1.1 + b.ph) * 12 * dt;
        b.z = 12 + Math.sin(b.t * 2.2 + b.ph) * 7;
      } else if (b.kind === 'bee') {
        b.x += Math.cos(b.t * 2.1 + b.ph) * 34 * dt;
        b.y += Math.sin(b.t * 1.7 + b.ph) * 16 * dt;
        b.z = 9 + Math.sin(b.t * 5 + b.ph) * 4;
      } else if (b.kind === 'dragonfly') {
        // dragonflies hold station over a pond and dart
        const p = ponds[0];
        if (p) { b.tx = p.x + Math.cos(b.t * 0.5) * p.r; b.ty = p.y + Math.sin(b.t * 0.8) * p.r * 0.4; }
        b.x = U.lerp(b.x, b.tx, 1 - Math.pow(0.02, dt));
        b.y = U.lerp(b.y, b.ty, 1 - Math.pow(0.02, dt));
        b.z = 16 + Math.sin(b.t * 3) * 5;
      } else {
        b.wait -= dt;
        if (b.wait <= 0) {
          b.wait = 0.6 + Math.random() * 2.4;
          b.tx = U.clamp(b.x + U.rand(-70, 70), 40, W - 40);
          b.ty = U.clamp(b.y + U.rand(-26, 26), walk.y0, walk.y1);
        }
        const sp = b.kind === 'snail' ? 3 : b.kind === 'lizard' ? 34 : 13;
        const dx = b.tx - b.x, dy = b.ty - b.y, d = Math.hypot(dx, dy) || 1;
        if (d > 2) { b.x += (dx / d) * sp * dt; b.y += (dy / d) * sp * dt; b.dir = dx < 0 ? -1 : 1; }
      }
      b.x = U.clamp(b.x, 24, W - 24);
      b.y = U.clamp(b.y, walk.y0 - 14, walk.y1 + 10);
    }
    // frogs
    for (const fr of frogs) {
      fr.t += dt;
      fr.croak = Math.max(0, fr.croak - dt);
      if (fr.hop > 0) { fr.hop -= dt * 3; } else if (Math.random() < dt * 0.22) {
        fr.hop = 1;
        const a = Math.random() * TAU;
        fr.x = fr.pond.x + Math.cos(a) * fr.pond.r * (0.9 + Math.random() * 0.2);
        fr.y = fr.pond.y + Math.sin(a) * fr.pond.r * 0.44;
        fr.dir = Math.random() < 0.5 ? -1 : 1;
      }
      if (Math.random() < dt * 0.12) fr.croak = 0.8;
    }
    // visitors
    spawnT -= dt;
    // Nobody drives out here in the dark. Visitors keep daylight hours.
    if (spawnT <= 0 && G.step >= 4 && !UI.anyPanel() && Sky.light() > 0.45) {
      spawnVisitor();
      // a starthistle in the ground brings people up the road to look at it
      const draw2 = (World.magic().draw || 0);
      spawnT = (100 + Math.random() * 150) / (1 + draw2 * 0.6);
    }
    for (let i = visitors.length - 1; i >= 0; i--) {
      const v = visitors[i];
      v.t += dt;
      v.anim += dt * (v.state === 'arrive' || v.state === 'leave' || v.state === 'walk' ? 8 : 3.4);
      if (v.state === 'talk') { v.bob = Math.sin(v.t * 3) * 1.2; continue; }
      const dx = v.tx - v.x, dy = v.ty - v.y, d = Math.hypot(dx, dy) || 1;
      if (d > 4) {
        v.dir = dx < 0 ? -1 : 1;
        const sp = v.state === 'leave' ? 58 : 34;
        v.x += (dx / d) * sp * dt; v.y += (dy / d) * sp * dt;
        v.moving = true;
      } else {
        v.moving = false;
        if (v.state === 'arrive') { v.state = 'wander'; }
        else if (v.state === 'leave') { visitors.splice(i, 1); continue; }
        else {
          v.wait = (v.wait || 0) - dt;
          if (v.wait <= 0) {
            v.wait = 2.5 + Math.random() * 4;
            v.tx = U.clamp(v.x + U.rand(-140, 140), 90, W - 90);
            v.ty = U.clamp(v.y + U.rand(-40, 40), walk.y0 + 12, walk.y1 - 6);
          }
        }
      }
      v.stay -= dt;
      if (v.stay <= 0 && v.state === 'wander') {
        v.state = 'leave';
        v.tx = v.dir > 0 ? W + 50 : -50; v.ty = walk.y1 - 12;
        UI.toast(`${v.def.name} heads off`, '');
      }
    }
  }

  // ---- drawing --------------------------------------------------------------
  // The mound and the pond go down under everything, because they are ground.
  function drawGround(g) {
    for (const m of mounds) drawMound(g, m);
    for (const p of ponds) drawPond(g, p);
  }
  function drawMound(g, m) {
    const { x, y, r } = m;
    const HT = r * 0.72;                                                   // how high it stands
    Art.ell(g, x + r * 0.18, y + r * 0.24, r * 1.1, r * 0.42, 'rgba(10,16,8,0.42)');  // its own shade
    // the earth it is made of, showing at the foot
    Art.ell(g, x, y + r * 0.04, r * 1.02, r * 0.34, '#4a3a26');
    Art.ell(g, x, y, r * 0.98, r * 0.3, '#6a5236');
    // the dome: a tall half-ellipse, not a flat patch
    Art.ell(g, x, y - HT * 0.34, r, HT, '#1b3014');                       // a dark rim all round it
    Art.rect(g, x - r, y - HT * 0.34, r * 2, HT * 0.4, '#1b3014');
    Art.ell(g, x, y - HT * 0.36, r - 1.4, HT - 1.4, '#2f4a22');
    Art.rect(g, x - r + 1.4, y - HT * 0.36, (r - 1.4) * 2, HT * 0.4, '#2f4a22');
    Art.ell(g, x, y - HT * 0.42, r * 0.95, HT * 0.94, '#3f6b2c');
    Art.rect(g, x - r * 0.95, y - HT * 0.42, r * 1.9, HT * 0.44, '#3f6b2c');
    Art.ellBand(g, x, y - HT * 0.42, r * 0.95, HT * 0.94, '#57913c', 0, 0.55);
    Art.ellBand(g, x - r * 0.1, y - HT * 0.5, r * 0.72, HT * 0.78, '#6faa4c', 0, 0.42);
    Art.ell(g, x - r * 0.28, y - HT * 0.9, r * 0.3, HT * 0.2, '#8ac464');   // the lit crown
    Art.ell(g, x - r * 0.36, y - HT * 0.96, r * 0.16, HT * 0.1, '#a6da80');
    for (const k of m.rocks) {                                             // stone breaking through
      const ry = y - HT * 0.34 + k.dy * 1.6;
      Art.ell(g, x + k.dx, ry + 1, k.w, k.w * 0.5, '#2a2a22');
      Art.ell(g, x + k.dx, ry, k.w * 0.9, k.w * 0.44, '#6a685a');
      Art.ellBand(g, x + k.dx, ry, k.w * 0.9, k.w * 0.44, '#8b8878', 0, 0.5);
    }
    for (const tf of m.tufts) {                                            // grass over the whole of it
      const sway = Math.sin(t * 1.4 + tf.dx * 0.1) * 1.4;
      // the tufts follow the dome, so they read as growing on a slope
      const u = U.clamp(tf.dx / r, -1, 1);
      const lift = Math.sqrt(Math.max(0, 1 - u * u)) * HT * 0.9;
      const gx = x + tf.dx, gy = y - HT * 0.34 - lift * (0.35 + tf.dy / (r * 0.5) * 0.4) + r * 0.1;
      const col = ['#2f5a22', '#43792f', '#5c9a42'][tf.v];
      for (let i = -1; i <= 1; i++) {
        Art.limb(g, gx + i, gy + 3, gx + i + sway * (1 + i * 0.3), gy + 3 - tf.h, 1.4, 0.7, col);
      }
    }
    // a couple of daisies on the sunny side
    const dr = Art.rng(m.seed + 7);
    for (let i = 0; i < 4; i++) {
      const u = (dr() - 0.5) * 1.5;
      const lift = Math.sqrt(Math.max(0, 1 - u * u)) * HT * 0.9;
      const fx = x + u * r, fy = y - HT * 0.34 - lift * 0.55 + r * 0.1;
      Art.rect(g, fx, fy - 2, 1, 3, '#3f7a38');
      Art.ell(g, fx, fy - 3, 1.8, 1.5, ['#f0f0e4', '#f4dc6a', '#f0a0c0'][i % 3]);
      Art.rect(g, fx, fy - 3, 1, 1, '#e0a83a');
    }
  }
  function drawPond(g, p) {
    const { x, y, r } = p;
    Art.ell(g, x, y, r * 1.14, r * 0.54, '#4a3a26');                       // the spoil round the rim
    Art.ell(g, x, y, r * 1.08, r * 0.5, '#6a5236');
    Art.ellBand(g, x, y, r * 1.08, r * 0.5, '#8a6c48', 0, 0.4);
    Art.ell(g, x, y, r, r * 0.45, '#15303e');                              // the water
    Art.ell(g, x, y - 0.5, r * 0.94, r * 0.41, '#1e5068');
    Art.ell(g, x, y - 1, r * 0.82, r * 0.33, '#2f7288');
    // ripple rows, which is the only thing that says it is wet
    for (let i = 0; i < 5; i++) {
      const ry = y - r * 0.3 + i * r * 0.16;
      const w = Math.sqrt(Math.max(0, 1 - Math.pow((ry - y) / (r * 0.42), 2))) * r * 0.86;
      const off = Math.sin(p.ripple * 1.2 + i * 1.7) * 4;
      for (let k = -w; k < w - 4; k += 9) {
        Art.rect(g, x + k + off, ry, 4 + ((i + k) % 3), 1, i % 2 ? '#5fa0b4' : '#8fcfe4');
      }
    }
    Art.ell(g, x - r * 0.3, y - r * 0.2, r * 0.26, r * 0.1, 'rgba(200,238,248,0.5)');   // the sky in it
    for (const pd of p.pads) {                                             // lily pads
      const px = x + pd.dx, py = y + pd.dy + Math.sin(t * 1.1 + pd.dx) * 0.6;
      Art.ell(g, px, py + 1, pd.s, pd.s * 0.42, '#0f2a18');
      Art.ell(g, px, py, pd.s, pd.s * 0.42, '#2f6b34');
      Art.ellBand(g, px, py, pd.s, pd.s * 0.42, '#4f9a42', 0, 0.5);
      Art.rect(g, px - 0.5, py - pd.s * 0.42, 1, pd.s * 0.4, '#1d4a22');   // the notch in it
      if (pd.fl) { Art.ell(g, px + 1, py - 1, 1.8, 1.4, '#f0d0e0'); Art.ell(g, px + 1, py - 1, 0.9, 0.8, '#fff2c4'); }
    }
    for (const rd of p.reeds) {                                            // reeds round the edge
      const sway = Math.sin(t * 1.1 + rd.ph) * 2.2;
      const rx = x + rd.dx, ry = y + rd.dy;
      Art.limb(g, rx, ry, rx + sway, ry - rd.h, 1.6, 0.8, '#2f5a26');
      Art.limb(g, rx, ry, rx + sway * 0.8, ry - rd.h * 0.7, 0.9, 0.5, '#4f8a38');
      if (rd.cat) {                                                        // a bulrush head on some
        Art.rect(g, rx + sway - 1, ry - rd.h - 4, 2.4, 5, '#5a3a22');
        Art.rect(g, rx + sway - 1, ry - rd.h - 4, 1, 5, '#7a5636');
      }
    }
  }
  // the bugs go in the sorted pass with everything else
  function items(g) {
    const out = [];
    for (const b of bugs) out.push({ y: b.y, fn: () => drawBug(g, b) });
    for (const fr of frogs) out.push({ y: fr.y, fn: () => drawFrog(g, fr) });
    for (const v of visitors) out.push({ y: v.y, fn: () => drawVisitor(g, v) });
    return out;
  }
  const BUG_COL = [
    ['#2a3a1a', '#4a6a2a', '#7aa84a'],      // green
    ['#3a2418', '#6a4020', '#9a6a34'],      // brown
    ['#241a3a', '#403060', '#6a54a0'],      // blue-black
    ['#3a1a20', '#7a2a30', '#c04a4a'],      // red
  ];
  function drawBug(g, b) {
    const c = BUG_COL[b.col];
    const y = b.y - b.z;
    if (b.kind === 'butterfly' || b.kind === 'moth') {
      const flap = Math.abs(Math.sin(b.t * 9));
      const w = 2 + flap * 3.4;
      const wc = b.kind === 'moth' ? '#c8bfa4' : ['#f0a0c0', '#f4dc6a', '#8fd4e4', '#c8a0e8'][b.col];
      Art.ell(g, b.x, y, 1, 2, '#2a2018');
      for (const sd of [-1, 1]) {
        Art.ell(g, b.x + sd * (w * 0.7), y - 1, w, 2.6, wc);
        Art.ell(g, b.x + sd * (w * 0.6), y + 1.2, w * 0.7, 1.8, U.shade(wc, -0.22));
        Art.rect(g, b.x + sd * (w * 0.9), y - 1, 1, 1, '#ffffff');
      }
      Art.rect(g, b.x - 1, y - 3, 1, 1.4, '#2a2018'); Art.rect(g, b.x + 1, y - 3, 1, 1.4, '#2a2018');
      g.fillStyle = 'rgba(0,0,0,0.16)'; Art.ell(g, b.x, b.y + 1, 3, 1.2);
      return;
    }
    if (b.kind === 'bee') {
      const flap = Math.abs(Math.sin(b.t * 24));
      Art.ell(g, b.x, y, 2.6, 2, '#2a2018');
      Art.ell(g, b.x, y - 0.3, 2.2, 1.6, '#f2c93a');
      for (let i = -1; i <= 1; i++) Art.rect(g, b.x + i * 1.3, y - 1.4, 0.9, 2.6, '#2a2018');
      Art.ell(g, b.x - 0.4, y - 2 - flap, 2, 1, 'rgba(230,244,255,0.75)');
      g.fillStyle = 'rgba(0,0,0,0.14)'; Art.ell(g, b.x, b.y + 1, 2.4, 1);
      return;
    }
    if (b.kind === 'dragonfly') {
      const flap = Math.abs(Math.sin(b.t * 30));
      Art.rect(g, b.x - 1, y - 1, 8, 1.6, '#1a3a40');
      Art.rect(g, b.x - 1, y - 1, 8, 0.8, '#2f8a9a');
      Art.ell(g, b.x - 2, y - 1, 2, 2, '#2f8a9a');
      Art.rect(g, b.x - 3, y - 2, 1.4, 1.4, '#0d1a20');
      for (const sd of [-1, 1]) Art.ell(g, b.x + 1, y - 1 + sd * (1 + flap), 4.4, 1.1, 'rgba(210,240,250,0.6)');
      g.fillStyle = 'rgba(0,0,0,0.14)'; Art.ell(g, b.x + 2, b.y + 1, 4, 1.2);
      return;
    }
    if (b.kind === 'snail') {
      Art.ell(g, b.x, b.y, 3.6, 2.2, '#8a7a5a');                 // the shell
      Art.ell(g, b.x, b.y - 0.3, 3, 1.8, '#b8a074');
      for (let i = 0; i < 3; i++) Art.ell(g, b.x + b.dir * i * 0.6, b.y - 0.2, 2.4 - i * 0.7, 1.4 - i * 0.4, i % 2 ? '#8a7a5a' : '#d8c49a');
      Art.ell(g, b.x + b.dir * 4, b.y + 1.2, 2.6, 1.2, '#c9b8a0');  // the foot
      Art.rect(g, b.x + b.dir * 5, b.y - 1.4, 0.8, 2.4, '#c9b8a0'); // eye stalks
      Art.rect(g, b.x + b.dir * 6.2, b.y - 1, 0.8, 2, '#c9b8a0');
      Art.rect(g, b.x + b.dir * 5, b.y - 2, 1, 1, '#2a2018');
      return;
    }
    if (b.kind === 'lizard') {
      const wig = Math.sin(b.t * 6) * 1.4;
      Art.ell(g, b.x, b.y, 5.4, 2.2, '#3a4a2a');
      Art.ellBand(g, b.x, b.y, 5.4, 2.2, '#5a7040', 0, 0.5);
      Art.ell(g, b.x + b.dir * 5, b.y - 0.6, 2.6, 1.8, '#5a7040');   // head
      Art.rect(g, b.x + b.dir * 6, b.y - 1.2, 1, 1, '#d8c43a');      // eye
      for (let i = 0; i < 4; i++) Art.rect(g, b.x - b.dir * (5 + i * 1.6), b.y + wig * (i / 4), 2, 1, '#3a4a2a');  // tail
      for (const sd of [-1, 1]) { Art.rect(g, b.x - 1, b.y + sd * 1.6, 3, 1, '#2f3a20'); Art.rect(g, b.x + 3, b.y + sd * 1.6, 3, 1, '#2f3a20'); }
      Art.speckle(g, b.x, b.y, 5, 2, '#78924e', 6, 3);
      return;
    }
    if (b.kind === 'ant') {
      Art.ell(g, b.x, b.y, 1.2, 1, c[0]);
      Art.ell(g, b.x + b.dir * 1.6, b.y, 1, 0.9, c[0]);
      Art.ell(g, b.x - b.dir * 1.6, b.y, 1.4, 1.1, c[0]);
      for (const sd of [-1, 1]) Art.rect(g, b.x - 1, b.y + sd * 1.2, 3, 0.8, c[0]);
      return;
    }
    // a beetle: a domed shell with a seam down it and six little legs
    const step = Math.sin(b.t * 12) * 0.8;
    for (const sd of [-1, 1]) for (let i = 0; i < 3; i++) {
      Art.rect(g, b.x - 2 + i * 2, b.y + sd * (1.8 + (i === 1 ? step : -step) * 0.4), 1.6, 0.9, c[0]);
    }
    Art.ell(g, b.x, b.y, 3.4, 2.4, c[0]);
    Art.ell(g, b.x, b.y - 0.3, 3, 2, c[1]);
    Art.ellBand(g, b.x, b.y - 0.3, 3, 2, c[2], 0, 0.45);
    Art.rect(g, b.x - 0.4, b.y - 2, 0.9, 4, c[0]);                // the seam
    Art.ell(g, b.x + b.dir * 3, b.y - 0.4, 1.4, 1.2, c[0]);       // the head
    Art.rect(g, b.x + b.dir * 4, b.y - 1.6, 0.8, 1.6, c[0]);      // an antenna
  }
  function drawFrog(g, fr) {
    const hop = Math.sin(Math.max(0, fr.hop) * Math.PI) * 7;
    const y = fr.y - hop;
    const puff = fr.croak > 0 ? 1 + (1 - fr.croak) * 1.6 : 0;
    g.fillStyle = 'rgba(0,0,0,0.2)'; Art.ell(g, fr.x, fr.y + 1, 4, 1.4);
    Art.ell(g, fr.x, y, 4.2, 3, '#2a4a24');
    Art.ell(g, fr.x, y - 0.4, 3.6, 2.4, '#4a7a34');
    Art.ellBand(g, fr.x, y - 0.4, 3.6, 2.4, '#6ea84a', 0, 0.45);
    Art.speckle(g, fr.x, y, 3.4, 2, '#2a4a24', 5, 3);
    Art.ell(g, fr.x + fr.dir * 1, y + 1.4, 2.8, 1.2, '#b8cf8a');            // the pale throat
    if (puff) Art.ell(g, fr.x + fr.dir * 1.4, y + 2, 1.4 + puff, 1 + puff * 0.7, '#cfe4a0');
    for (const sd of [-1, 1]) {                                            // two bulging eyes
      Art.ell(g, fr.x + sd * 1.8, y - 2.4, 1.5, 1.4, '#2a4a24');
      Art.ell(g, fr.x + sd * 1.8, y - 2.6, 1.1, 1, '#e8d84a');
      Art.rect(g, fr.x + sd * 1.8 - 0.4, y - 2.8, 0.9, 1.2, '#140f08');
    }
    for (const sd of [-1, 1]) Art.limb(g, fr.x - 1, y + 1, fr.x - sd * 3.4, y + 2.4, 1.6, 1, '#3a5f2c');
    if (fr.croak > 0.4) {                                                  // a small croak
      g.globalAlpha = fr.croak;
      Font.draw(g, 'brp', fr.x + 8, y - 10, { scale: 1, color: '#cfe4a0' });
      g.globalAlpha = 1;
    }
  }
  function drawVisitor(g, v) {
    const d = v.def;
    const pose = v.state === 'talk' ? d.poses.talk : v.moving ? d.poses.walk : d.poses.idle;
    let img = d.sprite(Math.floor(v.anim), pose);
    if (v.dir < 0) img = Art.flip(img);
    const w = img.width * d.sc, h = img.height * d.sc;
    Art.castShadow(g, img, v.x, v.y + 2, w, h, { alpha: 0.3, lean: 0.55, squash: 0.28 });
    g.drawImage(img, Math.round(v.x - w / 2), Math.round(v.y - h + 4 + (v.bob || 0)), Math.round(w), Math.round(h));
    // a nameplate over them, so you can tell who has turned up from across the plot
    const label = d.name.toUpperCase();
    const lw = Font.width(label, 1) + 10;
    const ly = v.y - h - 4;
    const a = 0.6 + 0.4 * Math.sin(t * 3);
    Art.rect(g, v.x - lw / 2, ly, lw, 12, 'rgba(18,12,8,0.6)');
    Art.rect(g, v.x - lw / 2 + 1, ly + 1, lw - 2, 10, '#f4e8d0');
    Font.draw(g, label, v.x, ly + 3, { scale: 1, color: '#5a3a20', align: 'center' });
    if (v.state !== 'talk' && !v.gave) {
      g.globalAlpha = a;
      Font.draw(g, 'TALK', v.x, ly - 11, { scale: 1, color: '#f5cd5c', align: 'center', shadow: '#2a1608' });
      g.globalAlpha = 1;
    }
  }

  return {
    init, save, update, drawGround, items,
    place, level, sculpt, flatten, canPlace, onPond, onMound, visitorAt, talkTo, spawnVisitor,
    get mounds() { return mounds; }, get ponds() { return ponds; },
    get bugs() { return bugs; },
    bugsNear(x, y, r) { let n = 0; for (const b of bugs) if (Math.hypot(b.x - x, (b.y - y) * 1.4) < r) n++; return n; },
    get visitors() { return visitors; },
    MOUND_COST, POND_COST,
  };
})();
