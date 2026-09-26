// ---- Momo: the caretaker in the wombat onesie, who teaches the job and buys the cubes -----
const Guide = (() => {
  let G = null;
  const cult = { x: 220, y: 250, tx: 220, dir: 1, pose: 'idle', t: 0, hop: 0, still: 0, castT: 0, happyT: 0 };
  let flash = 0, hidden = false;
  // When the notebook is full he goes. `vanish` counts down the teleport, and
  // after that he is away for a while before the hut turns up with him in it.
  let vanish = 0, huts = 0;
  const HUT = { x: 724, y: 0 };
  // the speech bubble: what he is saying, how much of it has been typed, how long it stays
  const bubble = { text: '', shown: 0, life: 0, pop: 0, kind: 'order' };
  const REWARD = [0, 15, 20, 20, 25, 20, 25, 30, 30, 30, 40, 50, 80];
  const has = (g, k) => owns(g, k);
  const cubes = (g) => OFFER_ORDER.reduce((n, k) => n + (g.offerings[k] || 0) + (g.blessed[k] || 0), 0);

  // Each step is a job Momo gives you, and a place for her to stand.
  //   lesson   what he tells you in the dialogue box when the job comes up
  //   give     tools he hands over when he has finished explaining
  //   unlock   tools the mart will now sell you
  //   tool     the toolbar slot that glows while this is the job
  //   at / aty where the arrow points in the grove
  const MART = () => Grove.TRUCK.x - 10, MARTY = () => Grove.TRUCK.y - 60;
  const STEPS = [
    {
      key: 'meet', mood: 'happy', icon: 't_sickle', title: 'Meet Momo', praise: 'Go on, give it a swing.',
      say: "Hi hi! I'm Momo. Take my sickle!",
      lesson: [
        { say: "Hi hi! I'm Momo! This farm is yours now~", mood: 'happy' },
        { say: "Take my sickle and cut the weeds. Press 2!", mood: 'proud' },
      ],
      give: ['sickle'], tool: 'sickle', note: 'Talk to Momo.',
      at: () => cult.x - 40, done: (g) => has(g, 'sickle'),
    },
    {
      key: 'weeds', mood: 'talk', icon: 't_sickle', title: 'Cut the weeds', praise: 'Tidy! Here, for your trouble.',
      say: 'Drag across the weeds!',
      lesson: null, tool: 'sickle', label: 'WEEDS',
      note: 'Sickle (2), drag on weeds.',
      at: () => ZONE.x - 60, aty: () => Grove.WALK.y0 + 70, done: () => World.weeds.every((w) => !inZone(w.x, w.y)),
    },
    {
      key: 'junk', mood: 'think', icon: 't_destroy', title: 'Clear the old logs', praise: 'Love the ants. Hard workers.',
      say: "Ants move logs. Buy an Ant Card!",
      lesson: [
        { say: 'Yay! Those logs are too heavy though.', mood: 'think' },
        { say: 'Drive to the mart (click the truck) for an Ant Card, then click each log.', mood: 'happy' },
      ],
      unlock: ['destroy'], tool: 'destroy', label: 'DRIVE TO THE MART',
      note: 'Mart: Ant Card. Click logs.',
      at: (g) => (has(g, 'destroy') ? ((Grove.objects.find((x) => !x.gone && inZone(x.x, x.y)) || { x: ZONE.x }).x) : MART()),
      aty: (g) => (has(g, 'destroy') ? ((Grove.objects.find((x) => !x.gone && inZone(x.x, x.y)) || { y: Grove.WALK.y0 + 60 }).y - 30) : MARTY()),
      done: () => Grove.objects.every((o) => o.gone || !inZone(o.x, o.y)),
    },
    {
      key: 'grass', mood: 'talk', icon: 't_moss', title: 'Sow the grass', praise: 'Green again. Beauty.',
      say: 'Sow grass, then water it!',
      lesson: [
        { say: 'Wombats need grass! Seed and a can are at the mart.', mood: 'happy' },
      ],
      unlock: ['moss', 'water'], tool: 'moss', label: 'SOW HERE',
      note: 'Seed + can. Sow, then water.',
      at: (g) => (has(g, 'moss') ? ZONE.x : MART()), aty: (g) => (has(g, 'moss') ? Grove.WALK.y0 + 70 : MARTY()),
      done: () => World.zoneFraction() >= ZONE_GRASS,
    },
    {
      key: 'arrive', mood: 'worry', icon: 'wombat', title: 'Wait for a wombat', praise: 'There she is! Your first wombat.',
      say: 'Shh... watch the trees!',
      lesson: [{ say: 'Shh! A wombat is coming...', mood: 'shock' }],
      note: 'Wait for a wombat.',
      at: () => 320, done: (g) => g.wombats.length > 0,
    },
    {
      key: 'sow', mood: 'talk', icon: 't_hoe', title: 'Dig a bed and sow it', praise: 'Sown. Good hands.',
      say: 'Hoe a bed, sow carrots!',
      lesson: [
        { say: "She picked you! Kyaa~ so cute!", mood: 'laugh' },
        { say: "Hoe and seed pouch at the mart, carrot seed from Groot.", mood: 'talk' },
      ],
      unlock: ['hoe', 'seed'], tool: 'hoe', label: 'DIG A BED HERE',
      note: 'Hoe a bed, sow seed.',
      at: (g) => (has(g, 'hoe') ? 380 : MART()), aty: (g) => (has(g, 'hoe') ? Grove.WALK.y0 + 110 : MARTY()),
      done: () => World.crops.length > 0,
    },
    {
      key: 'pick', mood: 'talk', icon: 't_water', title: 'Water, then pick', praise: 'Your first harvest!',
      say: 'Water it. Pick it when it glows!',
      lesson: [{ say: 'Water it! When it glows, pick it.', mood: 'talk' }],
      tool: 'water', label: 'WATER ME',
      note: 'Water, then pick.',
      at: () => { const c = World.crops[0]; return c ? c.x : 380; }, aty: () => { const c = World.crops[0]; return c ? c.y - 20 : Grove.WALK.y0 + 90; },
      done: (g) => CROPS.some((c) => (g.food[c.key] || 0) > 0),
    },
    {
      key: 'feed', mood: 'happy', icon: 't_food', title: 'Feed your wombat', praise: 'Fed and happy. Good job.',
      say: 'Feed her your veggies!',
      lesson: [
        { say: "She's hungry! Get a Feed Bowl at the mart.", mood: 'talk' },
      ],
      unlock: ['food'], tool: 'food', label: 'FEED HER',
      note: 'Feed Bowl, click near her.',
      at: (g) => (has(g, 'food') ? (g.wombats[0] ? g.wombats[0].x : 340) : MART()),
      aty: (g) => (has(g, 'food') ? (g.wombats[0] ? g.wombats[0].y - 40 : Grove.WALK.y0 + 80) : MARTY()),
      done: (g) => g.wombats.some((w) => w.stomach !== 'empty'),
    },
    {
      key: 'load', mood: 'proud', icon: 'truck', title: 'Load the cubes', praise: 'Loaded. That is the job, really.',
      say: 'Drag the cubes to the truck!',
      lesson: [
        { say: 'Eep! A cube poop! Drag it into the truck.', mood: 'laugh' },
      ],
      tool: 'drag', label: 'INTO THE TRUCK',
      note: 'Drag cubes to the truck.',
      at: () => (Grove.drops[0] ? Grove.drops[0].x : Grove.TRUCK.x), aty: () => (Grove.drops[0] ? Grove.drops[0].y - 30 : MARTY()),
      done: (g) => cubes(g) > 0 || (g.stats.sold || 0) > 0 || (g.stats.fertilised || 0) > 0,
    },
    {
      key: 'fert', mood: 'sly', icon: 't_scoop', title: 'Fertilise a bed', praise: 'Watch that grow now.',
      say: 'Scoop poop onto a bed!',
      lesson: [
        { say: "Secret: poop makes plants grow twice as fast! Get a Poo Scoop.", mood: 'sly' },
      ],
      unlock: ['fert'], tool: 'fert', label: 'SCOOP A BED',
      note: 'Poo Scoop on a bed.',
      at: (g) => (has(g, 'fert') ? (World.crops[0] ? World.crops[0].x : 380) : MART()),
      aty: (g) => (has(g, 'fert') ? (World.crops[0] ? World.crops[0].y - 20 : Grove.WALK.y0 + 90) : MARTY()),
      done: (g) => (g.stats.fertilised || 0) > 0,
    },
    {
      key: 'sell', mood: 'happy', icon: 'wdollar', title: 'Sell Momo your spare cubes', praise: 'Pleasure doing business!',
      say: 'Sell me your cubes!',
      lesson: [{ say: "Click me and I'll buy your cubes!", mood: 'happy' }],
      label: 'CLICK JIM',
      note: 'Click Momo to sell.',
      at: () => cult.x, aty: () => cult.y - 80, done: (g) => (g.stats.sold || 0) > 0,
    },
    {
      key: 'shovel', mood: 'proud', icon: 't_shovel', title: 'Dig a pond', praise: 'Now that is a farm.',
      say: 'Dig a hole, fill it with water!',
      lesson: [
        { say: 'Fun one! Get a Shovel. Hold to dig, right-click to heap.', mood: 'happy' },
      ],
      unlock: ['shovel'], tool: 'shovel', label: 'DIG HERE',
      note: 'Dig, then water.',
      at: (g) => (has(g, 'shovel') ? 480 : MART()), aty: (g) => (has(g, 'shovel') ? Grove.WALK.y0 + 120 : MARTY()),
      done: (g) => (g.stats.flooded || 0) > 0,
    },
    {
      key: 'factory', mood: 'proud', icon: 't_hammer', title: 'Build a poop factory', praise: 'A real factory! Sugoi!',
      say: 'Buy furniture from Kirk, then BUILD!',
      lesson: [
        { say: "Big idea: a poop factory!", mood: 'sly' },
        { say: "Buy furniture from Captain Kirk and BUILD appears. Hopper, belts, mill, grow house, pickup point!", mood: 'happy' },
      ],
      label: 'BUILD HERE',
      note: 'Hopper > mill > grow > sell. R rotates.',
      at: () => 760, aty: () => Grove.WALK.y0 + 110,
      done: (g) => (g.stats.factorySold || 0) > 0,
    },
  ];

  function init(g) {
    G = g;
    if (!G.visited) G.visited = {};
    if (typeof G.step !== 'number') G.step = 0;
    // the phone used to be job six; a farm saved past it moves back one
    if (!G.nophone) { if (G.step > 5) G.step--; G.nophone = 1; }
    if (!G.lessons) G.lessons = {};
    if (!G.unlocked) G.unlocked = {};
    // a farm further along has already had these lessons, and learnt these tools
    for (let i = 0; i < Math.min(G.step, STEPS.length); i++) {
      G.lessons[STEPS[i].key] = true;
      for (const k of (STEPS[i].unlock || []).concat(STEPS[i].give || [])) G.unlocked[k] = true;
    }
    if (G.step >= STEPS.length) G.unlocked.build = true;
    cult.x = cult.tx = 588;
    vanish = 0;
    huts = G.cultAway === 2 ? 1 : 0;        // a hut already standing does not grow again
  }
  const finished = () => G.step >= STEPS.length;
  const step = () => (finished() ? null : STEPS[G.step]);

  function say(text, kind = 'order', mood) {
    bubble.text = text; bubble.shown = 0;
    bubble.life = kind === 'order' ? 9 : kind === 'chat' ? 6 : 4.5;
    bubble.pop = 1; bubble.kind = kind;
    Sprites.setFace(mood || (kind === 'praise' ? 'happy' : 'talk'));
  }

  // ---- chatter -------------------------------------------------------------
  // Things he says when nothing is happening. Each one asks the grove a
  // question first, so he comments on what is actually in front of him.
  const CHAT = [
    { when: (g) => g.wombats.some((w) => w.stomach === 'empty'), mood: 'worry',
      lines: ['Somebody looks peckish.', 'Put a bowl out! She will find it.', 'A hungry wombat is a grumpy wombat.'] },
    { when: () => Grove.drops.length > 2, mood: 'happy',
      lines: ['Cubes everywhere. Beautiful.', 'Pop those in the truck before someone trips.', 'Every cube is a bag of fertiliser.'] },
    { when: (g) => g.wd > 400, mood: 'proud',
      lines: ['Doing all right for yourself!', 'You could buy the next plot with that.', 'Treat yourself to a bench.'] },
    { when: (g) => g.wombats.length >= 3, mood: 'happy',
      lines: ['Three of them! Look at that.', 'A proper little mob now.', 'They love it here. I can tell.'] },
    { when: () => World.weeds.length > 40, mood: 'cross',
      lines: ['The thistles are sneaking back.', 'Weeds. Always the weeds.'] },
    { when: () => Sky.isNight(), mood: 'tired',
      lines: ['Nearly bedtime.', 'Listen to the frogs.', 'Fireflies are out. Best bit of the day.'] },
    { when: () => true, mood: 'idle',
      lines: [
        'Lovely day for it.', 'This onesie is the comfiest thing ever.', 'A wombat can outrun you. I have tested this.',
        'They make the cubes on purpose. I am sure of it.', 'Shaz at the mart does a great sausage roll.',
        'Groot grows the best carrots around. Do not tell him I said so.', 'I built that fence. Mostly.',
        'Hot one today.', 'The gum trees smell like home.', 'Captain Kirk sells furniture. Mind the cat on his counter.', 'Kirk reckons he was a sea captain. It was the ferry.', 'Mind the frogs if you dig a pond.', 'I am on level 40 of my game. Do not ask.',
      ] },
  ];
  let chatT = 14 + Math.random() * 10, lastChat = '';
  function chatter(dt) {
    if (bubble.life > 0 || cult.happyT > 0) { chatT = 12 + Math.random() * 12; return; }
    chatT -= dt;
    if (chatT > 0) return;
    chatT = 16 + Math.random() * 16;
    const pool = CHAT.filter((c) => { try { return c.when(G); } catch (e) { return false; } });
    const pick = pool[Math.floor(Math.random() * pool.length)] || CHAT[CHAT.length - 1];
    let line = pick.lines[Math.floor(Math.random() * pick.lines.length)];
    if (line === lastChat) line = pick.lines[(pick.lines.indexOf(line) + 1) % pick.lines.length];
    lastChat = line;
    say(line, 'chat', pick.mood);
  }
  // ---- lessons -----------------------------------------------------------------
  function lessonReady() {
    return G.mode === 'grove' && G.introDone && !UI.anyPanel() && !Talk.isOpen() && !Grove.arriving
      && !FX.curtaining && UI.unlockIdle() && G.cultAway !== 1 && vanish <= 0 && !hidden;
  }
  function teach(s) {
    if (!s.lesson) { learnt(s); return; }
    Grove.panTo(cult.x);
    cult.pose = 'wave'; cult.castT = 1.2; cult.still = 0;
    bubble.life = 0;
    Talk.lesson('cultist', s.lesson, () => learnt(s));
  }
  // what happens when he has finished explaining: tools in your hand, tools on the shelf
  function learnt(s) {
    if (G.lessons[s.key]) return;
    G.lessons[s.key] = true;
    if (!G.newTools) G.newTools = {};
    for (const k of (s.give || [])) {
      if (owns(G, k)) continue;
      G.owned[k] = true; G.unlocked[k] = true; G.newTools[k] = true; G.tool = k;
      UI.unlockCard(k, true);
    }
    for (const k of (s.unlock || [])) {
      if (G.unlocked[k]) continue;
      G.unlocked[k] = true;
      UI.unlockCard(k, false);
    }
    UI.refreshHUD(); Main.save();
  }
  function poke() {                          // click him and he actually talks
    cult.still = 0; cult.pose = 'idle';
    const s0 = step();
    if (s0 && !G.lessons[s0.key] && G.cultAway !== 2) { Audio.play('squeak'); teach(s0); return; }
    const at = G.cultAway === 2 ? { x: HUT.x + 22, y: hutY() } : cult;
    FX.burst(at.x, at.y - 46, 6, { color: [PAL.gold3, PAL.cream], speed: 40, gravity: -20, life: 0.5, size: 2 });
    Audio.play('squeak');
    Talk.open('cultist', TREE);
  }
  const cubesHere = () => OFFER_ORDER.reduce((n, k) => n + (G.offerings[k] || 0) + (G.blessed[k] || 0), 0);
  // ---- what he will talk about --------------------------------------------
  // The first node always leads with whatever the current order is, so asking
  // him a question is never a detour away from knowing what to do next.
  const TREE = {
    start: 'hub',
    nodes: {
      hub: {
        mood: 'happy',
        say: () => {
          const s = step();
          if (!s && G.cultAway === 2) return 'Come in, mind the step. Cubes round the back, money in your hand.';
          return s ? s.say : 'Look at all these wombats! You did that!';
        },
        sub: () => (G.cultAway === 2 ? 'at her shed door' : 'the caretaker'),
        opts: [
          { q: () => `Sell you the cubes. I have ${cubesHere()}.`, if: () => cubesHere() > 0,
            act: () => { Talk.close(); UI.openPawn('cult'); } },
          { q: 'Say that again, slower.', to: 'order', if: () => !!step() },
          { q: 'What is the job, exactly?', to: 'job' },
          { q: 'Who are you?', to: 'who' },
          { q: 'Where do I buy things?', to: 'money' },
          { q: 'Nothing. Carry on.', end: true },
        ],
      },
      order: {
        mood: 'talk',
        say: () => { const s = step(); return s ? s.note || s.say : 'Nothing left to do but enjoy it.'; },
        opts: [{ q: 'Got it.', to: 'hub' }],
      },
      job: {
        mood: 'think',
        say: 'Easy. Keep the patch tidy, grow food, feed the wombats. They leave cubes. Cubes go on your beds as fertiliser, or you sell them to me. Spend the money on tools and land. Repeat forever.',
        opts: [{ q: 'Sounds cozy.', to: 'hub' }],
      },
      who: {
        mood: 'happy',
        say: "Momo! I look after the wombats. I live in the shed and play a LOT of video games.",
        opts: [{ q: 'Cute onesie.', to: 'band' }, { q: 'Something else.', to: 'hub' }],
      },
      band: {
        mood: 'proud',
        say: 'Thank you! It has ears! And a tail!',
        opts: [{ q: 'Fair enough.', to: 'hub' }],
      },
      money: {
        mood: 'talk',
        say: "Wombat Mart for tools and more wombats. Groot for seed and saplings. Captain Kirk's Ottoman Empire for furniture. Still Lake, Blackwood and Fern Gully are out past the farm, worth a wander, and for sale. I buy cubes. The gumball machine takes one coin and is terribly exciting.",
        opts: [{ q: 'Is the lottery worth it?', to: 'lotto' }, { q: 'Back.', to: 'hub' }],
      },
      lotto: {
        mood: 'sly',
        say: 'Never. I buy one every Thursday.',
        opts: [{ q: 'Understood.', to: 'hub' }],
      },
    },
  };
  function hit(x, y) {
    if (hutHit(x, y)) return true;
    return !finished() && !hidden && Math.abs(x - cult.x) < 18 && y > cult.y - 66 && y < cult.y + 6;
  }
  function check() {
    const s = step();
    if (!s) return;
    if (!s.done(G)) return;
    const reward = REWARD[G.step] || 0;
    G.step++;
    say(s.praise + (reward ? ` +${reward}` : ''), 'praise', 'proud');
    cult.happyT = 2.2;
    FX.confettiBurst(cult.x, cult.y - 50, 18);
    FX.hearts(cult.x, cult.y - 56, 5);
    if (reward) Grove.reward(cult.x, cult.y - 30, reward);
    flash = 1.6;
    cult.pose = 'jump'; cult.castT = 0; cult.t = 0; cult.still = 0;
    Audio.play('chime');
    FX.sparkle(cult.x, cult.y - 40, 12, PAL.gold3);
    UI.refreshAll();           // a finished step can hand over a new tool
    UI.refreshNotebook();
    Main.save();
    if (finished()) {
      UI.toast('you know the job now', 'good');
      say('That is the lot! You do not need me hovering. I will be in my shed.', 'praise', 'happy');
      vanish = 2.6;                                  // he goes in a moment, loudly
      G.cultAway = 1;
      G.hutAt = (G.time || 0) + 70;                  // and builds himself something
    }
  }

  // ---- his hut ---------------------------------------------------------------
  // He does not sleep in a hedge. Once he has gone, a small wooden hut goes up
  // at the west end of the plot with a lamp in the window, and he buys the
  // cubes off you through the door.
  const hutHere = () => !!G && G.cultAway === 2;
  function hutRect() { return { x: HUT.x, y: hutY(), w: 150, h: 130 }; }
  function hutHit(x, y) {
    if (!hutHere()) return false;
    const r = hutRect();
    return x > r.x - r.w / 2 && x < r.x + r.w / 2 && y > r.y - r.h && y < r.y + 8;
  }
  function hutY() { return Grove.WALK.y0 + 86; }
  function drawHut(g) {
    if (!hutHere()) return;
    const x = HUT.x, y = hutY(), t = G.time;
    const grow = U.clamp(huts, 0, 1);                  // it goes up with a thump
    const W2 = 62, WALLH = 64;                         // half-width, wall height
    g.save();
    g.translate(x, y); g.scale(1, grow); g.translate(-x, -y);
    Art.ell(g, x, y + 2, W2 + 8, 7, 'rgba(18,14,20,0.34)');

    // ---- the walls: split logs, stacked, mossy at the foot ----------------
    for (let i = 0; i < WALLH / 5; i++) {
      const ly = y - 4 - i * 5;
      Art.rect(g, x - W2, ly, W2 * 2, 5, PAL.bark0);
      Art.rect(g, x - W2 + 1, ly, W2 * 2 - 2, 4, i % 2 ? PAL.bark1 : PAL.bark2);
      Art.rect(g, x - W2 + 1, ly, W2 * 2 - 2, 1, PAL.bark3);
      if (i < 3) for (let k = 0; k < 3; k++) {          // moss creeping up the boards
        const mx = x - W2 + 4 + ((i * 17 + k * 29) % (W2 * 2 - 12));
        g.fillStyle = k % 2 ? PAL.moss1 : PAL.moss2;
        g.fillRect(Math.round(mx), Math.round(ly + 1), 6, 3);
      }
    }
    // corner posts, so it reads as built rather than piled
    for (const d of [-1, 1]) {
      Art.rect(g, x + d * W2 - (d > 0 ? 5 : 0), y - WALLH - 2, 5, WALLH + 2, PAL.bark0);
      Art.rect(g, x + d * W2 - (d > 0 ? 4 : -1), y - WALLH - 2, 3, WALLH + 2, PAL.bark2);
    }

    // ---- the roof: a real gable, shingled, with moss down the north slope --
    const RH = 40, OVER = 15;
    for (let i = 0; i < RH; i += 2) {
      const k = i / RH;
      const w = (W2 + OVER) * (1 - k * 0.94);
      const ry = y - WALLH - 2 - i;
      Art.rect(g, x - w, ry, w * 2, 3, PAL.ink);
      Art.rect(g, x - w + 1, ry, w * 2 - 2, 2, i % 4 ? '#7d6250' : '#66503f');
      Art.rect(g, x - w + 1, ry, w * 2 - 2, 1, '#9a7a60');
      Art.rect(g, x - w + 1, ry, Math.round(w * 0.3), 2, '#8d6e58');
      if (i % 6 === 0) { g.fillStyle = PAL.moss2; g.fillRect(Math.round(x - w + 2), Math.round(ry), Math.round(w * 0.5), 2); }
      if (i % 6 === 3) { g.fillStyle = PAL.moss1; g.fillRect(Math.round(x - w + 6), Math.round(ry), Math.round(w * 0.3), 2); }
    }
    Art.rect(g, x - 4, y - WALLH - 2 - RH - 3, 8, 5, '#9a7a60');       // the ridge cap
    Art.rect(g, x - W2 - OVER, y - WALLH - 4, (W2 + OVER) * 2, 3, PAL.bark0);   // the eaves board
    // the chimney, and smoke off it
    Art.rect(g, x + 30, y - WALLH - 40, 14, 26, PAL.stone1);
    Art.rect(g, x + 31, y - WALLH - 40, 12, 24, PAL.stone2);
    for (let i = 0; i < 5; i++) Art.rect(g, x + 31 + (i % 2) * 5, y - WALLH - 37 + i * 4, 5, 3, PAL.stone3);
    Art.rect(g, x + 28, y - WALLH - 43, 19, 4, PAL.stone0);
    for (let i = 0; i < 5; i++) {
      const k = ((t * 0.34 + i * 0.2) % 1);
      g.globalAlpha = (1 - k) * 0.34;
      g.fillStyle = '#c8c2d0';
      const sz = 3 + k * 5;
      g.fillRect(Math.round(x + 37 + Math.sin(k * 4 + i) * 9 - sz / 2), Math.round(y - WALLH - 48 - k * 46), sz, sz);
    }
    g.globalAlpha = 1;

    // ---- the door, standing open, with him in it ---------------------------
    Art.rect(g, x - 30, y - 54, 34, 54, PAL.bark0);
    Art.rect(g, x - 28, y - 52, 30, 52, '#17110d');                   // the dark inside
    Art.glow(g, x - 13, y - 26, 30, '#f5cd5c', 0.11, 5);
    Art.rect(g, x + 4, y - 54, 6, 54, PAL.bark1);                     // the open leaf of it
    Art.rect(g, x + 4, y - 54, 2, 54, PAL.bark3);
    // the window, lit
    const lamp = 0.62 + 0.38 * Math.sin(t * 1.8);
    Art.rect(g, x + 18, y - 52, 30, 26, PAL.bark0);
    Art.rect(g, x + 20, y - 50, 26, 22, `rgba(248,214,120,${(0.5 + lamp * 0.4).toFixed(2)})`);
    Art.rect(g, x + 32, y - 50, 2, 22, PAL.bark1);
    Art.rect(g, x + 20, y - 41, 26, 2, PAL.bark1);
    Art.glow(g, x + 33, y - 40, 46 + lamp * 10, '#f5cd5c', 0.13 + lamp * 0.08, 7);
    // a shingle awning over the door
    for (let i = 0; i < 5; i++) Art.rect(g, x - 38 + i, y - 60 - i * 2, 50 - i * 2, 3, i % 2 ? '#4a3a2e' : '#5c4738');

    // ---- the sign, hung off the eave ---------------------------------------
    const sx = x - W2 - 30;
    Art.rect(g, sx - 2, y - 58, 5, 58, PAL.bark0);                   // the post
    Art.rect(g, sx - 1, y - 58, 3, 58, PAL.bark2);
    Art.rect(g, sx - 26, y - 62, 52, 22, PAL.bark0);
    Art.rect(g, sx - 24, y - 60, 48, 18, '#4a3526');
    Art.rect(g, sx - 24, y - 60, 48, 2, '#6d5644');
    Font.draw(g, 'CUBES', sx, y - 56, { scale: 2, color: '#f5cd5c', align: 'center', shadow: '#1a1008' });
    Font.draw(g, 'BOUGHT', sx, y - 48, { scale: 1, color: '#c2a176', align: 'center' });
    g.fillStyle = PAL.moss2; g.fillRect(Math.round(sx - 26), Math.round(y - 44), 14, 4);

    // ---- the yard: a barrel of cubes, a woodpile, a lantern on a hook -------
    Art.rect(g, x - W2 - 16, y - 16, 15, 16, PAL.bark0);              // barrel
    Art.rect(g, x - W2 - 15, y - 15, 13, 14, PAL.bark2);
    Art.rect(g, x - W2 - 15, y - 12, 13, 2, PAL.bark3);
    Art.rect(g, x - W2 - 15, y - 6, 13, 2, PAL.bark3);
    for (const [cx2, cy2] of [[-9, -20], [-3, -19], [-6, -24]]) {     // cubes stacked in it
      Art.rect(g, x - W2 - 16 + 8 + cx2, y + cy2, 6, 6, '#3b2a1b');
      Art.rect(g, x - W2 - 16 + 8 + cx2, y + cy2, 6, 2, '#553d27');
    }
    for (let i = 0; i < 7; i++) {                                     // a woodpile
      const wx = x + W2 + 6 + (i % 3) * 6, wy = y - 4 - Math.floor(i / 3) * 6;
      Art.rect(g, wx, wy, 6, 6, PAL.bark1);
      Art.ell(g, wx + 3, wy + 3, 2.4, 2.4, PAL.bark3);
      Art.ell(g, wx + 3, wy + 3, 1.2, 1.2, PAL.bark0);
    }
    g.restore();

    // ---- and him, leaning in the doorway -----------------------------------
    const img = Sprites.cultist(Math.floor(t * 3), 'idle');
    const sc = 1.05, dw = img.width * sc, dh = img.height * sc;
    Art.castShadow(g, img, x - 13, y + 2, dw, dh, { alpha: 0.3, lean: 0.6, squash: 0.3 });
    g.drawImage(img, Math.round(x - 13 - dw / 2), Math.round(y - dh + 4), Math.round(dw), Math.round(dh));
    const p2 = 0.5 + 0.5 * Math.sin(t * 3);
    Art.glow(g, x - 13, y - 24, 36 + p2 * 8, '#ffd98a', 0.08 + p2 * 0.05, 5);
  }
  function paid(n) {
    if (n <= 0) return;
    say(U.pick(['Lovely. Square as anything.', 'Straight onto the compost heap.', 'Top quality, that.', 'A fair price!']), 'chat', 'happy');
    cult.happyT = 1.2;
  }

  let lastStep = -1, sayT = 0;
  function update(dt) {
    if (G.cultAway === 2 && huts < 1) huts = Math.min(1, huts + dt * 1.6);
    if (vanish > 0) {                                  // going: sparks, then nothing
      vanish -= dt;
      cult.pose = 'cast'; cult.castT = 1;
      if (Math.random() < dt * 4) FX.dust(cult.x + U.rand(-10, 10), cult.y, 2, PAL.soil3);
      if (bubble.life > 0) { bubble.life -= dt; bubble.shown += dt * 28; }
      if (vanish <= 0) {
        FX.hearts(cult.x, cult.y - 50, 6);
        FX.comic(cult.x, cult.y - 60, 'BYE!', { ink: '#ffe6a0', edge: '#8a5a20', life: 0.8 });
        Audio.play('whoosh'); Audio.play('chime'); FX.shake(1.2);
        UI.toast('Momo has gone to build himself a shed', '');
      }
      return;
    }
    // away, and then back in a hut of his own
    if (G.cultAway === 1) {
      if ((G.time || 0) >= (G.hutAt || 0)) {
        G.cultAway = 2; huts = 0;
        Audio.play('thud', 1.4); FX.shake(1.6);
        FX.burst(HUT.x, hutY(), 22, { color: [PAL.bark3, PAL.bark2, PAL.moss3], speed: 110, gravity: 260, life: 0.7, size: 3 });
        FX.comic(HUT.x, hutY() - 90, 'THUNK!', { ink: '#f5cd5c', edge: '#7a5210', life: 1 });
        UI.toast('<b>Momo built a shed</b> at the west end &mdash; she buys cubes there', 'good');
        Main.save();
      }
      return;
    }
    if (G.cultAway === 2) { cult.t += dt; if (bubble.life > 0) { bubble.life -= dt; bubble.shown += dt * 28; } return; }
    if (bubble.life <= 0 && Sprites.face !== 'idle' && cult.happyT <= 0) Sprites.setFace('idle');
    if (flash > 0) flash -= dt;
    cult.t += dt;
    // a new order gets spoken once she is roughly in place
    const s = step();
    chatter(dt);
    // a new job gets taught properly, in the dialogue box, once he is in place
    if (s && !G.lessons[s.key]) {
      sayT += dt;
      if (sayT > (lastStep === -1 ? 1.2 : 2.8) && lessonReady()) { sayT = 0; lastStep = G.step; teach(s); }
    } else sayT = 0;
    if (bubble.life > 0) { bubble.life -= dt; bubble.shown += dt * 28; bubble.pop = Math.max(0, bubble.pop - dt * 3); }
    if (cult.happyT > 0) { cult.happyT -= dt; }
    if (cult.hop > 0) cult.hop = Math.max(0, cult.hop - dt * 1.6);
    if (s) {
      const want = U.clamp(s.at(G), 60, Grove.W - 60);
      cult.tx = want + 46;
    }
    const dx = cult.tx - cult.x;
    if (cult.happyT > 0) { cult.pose = 'jump'; if (Math.random() < dt * 6) FX.sparkle(cult.x + U.rand(-16, 16), cult.y - U.rand(20, 60), 1, PAL.gold3); }
    else if (cult.castT > 0) { cult.castT -= dt; if (cult.castT <= 0) cult.pose = 'idle'; }
    else if (Math.abs(dx) > 3) {
      cult.dir = dx > 0 ? 1 : -1;
      cult.x += U.clamp(dx, -52 * dt, 52 * dt);
      cult.pose = Math.abs(dx) > 120 ? 'run' : 'walk'; cult.still = 0;
    } else {
      cult.still += dt;
      cult.pose = cult.still > 22 ? 'sit' : 'idle';       // he takes a seat if you dawdle
      // and he is never quite still: a shrug, a nod, a stretch, a laugh at nothing
      if (cult.still < 22 && Math.random() < dt * 0.22) {
        cult.pose = U.pick(['shrug', 'nod', 'laugh', 'clap', 'cheer', 'wave']); cult.castT = 1.1 + Math.random() * 0.8; cult.t = 0;
        if (cult.pose === 'laugh') Sprites.setFace('happy');
      }
    }
    check();
  }

  // She stands in the grove and points at whatever the step is about.
  function draw(g) {
    if (G.cultAway === 2) { drawHut(g); drawBubble(g); return; }
    if (G.cultAway === 1) return;
    if ((finished() && vanish <= 0) || hidden) return;
    const rate = { walk: 8, run: 12, cast: 5, sit: 2, idle: 3, jump: 9 }[cult.pose] || 4;
    const img = Sprites.cultist(Math.floor(cult.t * rate), cult.pose);
    const lift = 0;
    const sc = 1.05;
    const dw = img.width * sc, dh = img.height * sc;
    const draw2 = cult.dir < 0 ? Art.flip(img) : img;
    Art.castShadow(g, draw2, cult.x, cult.y + 2, dw, dh, { alpha: 0.32, lean: 0.62, squash: 0.3 });
    g.drawImage(draw2, Math.round(cult.x - dw / 2), Math.round(cult.y - dh + 4 - lift), Math.round(dw), Math.round(dh));
    // the glow of her lantern-charm, and a nudge toward the job
    const p = 0.5 + 0.5 * Math.sin(cult.t * 3);
    Art.glow(g, cult.x, cult.y - 24, 40 + p * 8, '#ffe0a0', 0.08 + p * 0.05, 5);
    drawBubble(g);
  }
  // The arrow over whatever the job is about: a coral pointer bobbing over the
  // spot, and a label on a pill above it. Drawn over everything else.
  function drawPointer(g) {
    const s = step();
    if (!s || !G.lessons[s.key] || Talk.isOpen() || G.cultAway) return;
    if (s.key === 'arrive') return;
    const tx = U.clamp(s.at(G), 30, Grove.W - 30);
    const ty = s.aty ? s.aty(G) : Grove.WALK.y0 + 40;
    const bob = Math.round(Math.abs(Math.sin(G.time * 3.2)) * -6);
    const x = Math.round(tx), y = Math.round(ty) + bob;
    // the arrow: slate outline, coral fill, a lit edge
    const ARW = [[-7, -12], [7, -12], [7, -4], [12, -4], [0, 8], [-12, -4], [-7, -4]];
    Art.poly(g, ARW.map(([px, py]) => [x + px * 1.18, y + py * 1.18 + 1]), 'rgba(44,64,72,0.25)');
    Art.poly(g, ARW.map(([px, py]) => [x + px * 1.18, y + py * 1.18 - 1]), Kit.C.line);
    Art.poly(g, ARW.map(([px, py]) => [x + px, y + py - 1]), Kit.C.coral);
    Art.rect(g, x - 5, y - 12, 3, 7, '#ffc2b2');
    if (s.label) {
      const w = Font.width(s.label, 1) + 14;
      Kit.tab(g, x - w / 2, y - 31, w, 16, s.label);
    }
  }

  // ---- the speech bubble ---------------------------------------------------
  // A page in a wooden frame, but it behaves like a comic: it lands with a
  // squash, wobbles as it settles, every letter pops in oversized and drops
  // into place, words she stresses come out in gold, and praise arrives on a
  // starburst with lines flying off it.
  const BS = 2, LH = Font.CH * 2 + 4;          // two-pixel blocks, a line every 18

  // split the text into characters, honouring *stress* markers, and wrap it
  function layout(text, maxW) {
    const chars = [];
    let em = false, idx = 0;
    for (const ch of text) {
      if (ch === '*') { em = !em; continue; }
      chars.push({ c: ch, em, i: idx++ });
    }
    const adv = Font.advance(BS);
    const lines = [];
    let line = [], w = 0, wordStart = 0;
    for (const ch of chars) {
      if (ch.c === ' ') wordStart = line.length + 1;
      line.push(ch); w += adv;
      if (w > maxW && wordStart > 0 && line.length > wordStart) {
        const carry = line.splice(wordStart);
        while (line.length && line[line.length - 1].c === ' ') line.pop();
        lines.push(line);
        line = carry; w = carry.length * adv; wordStart = 0;
      }
    }
    if (line.length) lines.push(line);
    for (const l of lines) { l.forEach((ch, i) => { ch.x = i * adv; }); l.w = l.length * adv; }
    return lines;
  }

  function star(g, x, y, r, col) {
    const p = [];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU - Math.PI / 2, rr = i % 2 ? r * 0.36 : r;
      p.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]);
    }
    Art.poly(g, p, col);
  }

  function drawBubble(g) {
    if (bubble.life <= 0 || !bubble.text || Talk.isOpen()) return;
    // a small pixel speech tag over his head for chatter; anything that matters goes in the dialogue box

    const shown = Math.floor(bubble.shown);
    const text = bubble.text.replace(/\*/g, '').slice(0, Math.max(1, shown));
    const half = 80;
    const lo = FX.cam.x - 320 / FX.cam.zoom + half, hi = FX.cam.x + 320 / FX.cam.zoom - half;
    const bx = lo > hi ? FX.cam.x : U.clamp(cult.x, lo, hi);
    const pop = bubble.pop > 0 ? Math.round(bubble.pop * 3) : 0;
    Kit.bubble(g, bx, cult.y - 94 - pop, text, { fill: bubble.kind === 'praise' ? '#fff08a' : '#fff8e0', maxW: 132 });
  }

  function state() {
    return {
      i: G.step, total: STEPS.length, steps: STEPS,
      step: step(), flash: flash > 0, hidden, done: finished(),
    };
  }
  function toggle() { hidden = !hidden; UI.refreshNotebook(); }
  // The job in hand, in the shape the notebook wants it: a title, the long form of
  // what she said, where it has to happen, and what she pays for it.
  const WHERE = {
    meet: 'in the grove', sickle: 'Wombat Mart', weeds: 'in the grove', junk: 'Wombat Mart, then the grove', grass: 'Wombat Mart, then the grove',
    arrive: 'in the grove', sow: 'the mart, Groot, then the grove', pick: 'in the grove',
    feed: 'the mart, then the grove', load: 'in the grove', fert: 'the mart, then a bed', sell: 'wherever Momo is', shovel: 'the mart, then anywhere', factory: 'the Build menu (B), then the grove',
  };
  function current() {
    const st = step();
    if (!st) return null;
    return { key: st.key, title: st.title, note: st.note, icon: st.icon, say: st.say, tool: st.tool,
      where: WHERE[st.key] || 'in the grove', reward: REWARD[G.step] || 0, i: G.step, total: STEPS.length };
  }
  return { init, update, draw, drawPointer, teach: () => { const s2 = step(); if (s2) teach(s2); }, state, toggle, check, poke, hit, say, current, paid, hutHit, hutHere, drawHut, get cult() { return cult; }, get hutX() { return HUT.x; }, STEPS };
})();
