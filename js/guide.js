// ---- Jim: the old caretaker who teaches you the job and buys the cubes -----
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
  const REWARD = [10, 15, 20, 20, 25, 0, 20, 25, 30, 30, 30, 40, 50, 60];
  const has = (g, k) => owns(g, k);
  const cubes = (g) => OFFER_ORDER.reduce((n, k) => n + (g.offerings[k] || 0) + (g.blessed[k] || 0), 0);

  // Each step is a job Jim gives you, and a place for him to stand.
  const STEPS = [
    {
      key: 'sickle', say: "G'day! I'm Jim. I've kept this place for years and now it's your job. First, tools. Click the truck, drive to Wombat Mart and buy a sickle.",
      mood: 'happy', praise: 'Good sickle, that.', icon: 't_sickle', title: 'Buy a sickle',
      note: 'Click the truck for the map, go to Wombat Mart, and buy a Sickle from the TOOLS aisle.',
      at: () => Grove.TRUCK.x - 60, done: (g) => has(g, 'sickle'),
    },
    {
      key: 'weeds', say: 'Now cut the weeds inside the rope. Drag across them. The big ones take a few swings.', mood: 'talk', praise: 'Tidy! Here, for your trouble.', icon: 't_sickle', title: 'Cut the weeds',
      note: 'Pick the sickle (key 2) and drag across the weeds inside the rope.',
      at: () => ZONE.x - 120, done: () => World.weeds.every((w) => !inZone(w.x, w.y)),
    },
    {
      key: 'junk', say: "Those old logs are too heavy for us. Buy an Ant Hire card at the mart and the ants'll carry them off.", mood: 'think', praise: 'Love the ants. Hard workers.', icon: 't_destroy', title: 'Clear the old logs',
      note: 'Buy an Ant Hire Card at Wombat Mart, then click each log or ruin inside the rope.',
      at: () => { const o = Grove.objects.find((x) => !x.gone && inZone(x.x, x.y)); return o ? o.x : ZONE.x; },
      done: () => Grove.objects.every((o) => o.gone || !inZone(o.x, o.y)),
    },
    {
      key: 'grass', say: 'Bare dirt is no good for a wombat. Get grass seed and a watering can, sow it inside the rope and give it a drink.', mood: 'talk', praise: 'Green again. Beauty.', icon: 't_moss', title: 'Sow the grass',
      note: 'Buy Grass Seed and a Watering Can. Scatter the grass, then water it so it takes.',
      at: () => ZONE.x, done: () => World.zoneFraction() >= ZONE_GRASS,
    },
    {
      key: 'arrive', say: 'Shh. Watch the treeline. A tidy patch always brings one of them round.', mood: 'worry', praise: 'There she is! Your first wombat.', icon: 'wombat', title: 'Wait for a wombat',
      note: 'A tidy patch brings a wombat. One always comes.',
      at: () => 320, done: (g) => g.wombats.length > 0,
    },
    {
      key: 'phone', say: "You'll want a phone for this job. Grab one at the mart. It's got your jobs, your herd, the lot.", mood: 'talk', praise: 'Welcome to this century.', icon: 'ph_key', title: 'Buy a phone',
      note: 'Wombat Mart sells phones. Press P to open it. More apps are in its App Store.',
      at: () => Grove.TRUCK.x - 60, done: (g) => has(g, 'phone'),
    },
    {
      key: 'sow', say: "She'll need feeding. Buy a hoe and a seed pouch, get carrot seed from Groot's Cellar, hoe a bed and sow it.", mood: 'talk', praise: 'Sown. Good hands.', icon: 't_hoe', title: 'Dig a bed and sow it',
      note: 'Hoe and Seed Pouch from the mart, seed from Groot. Hoe bare soil, then sow on it.',
      at: () => 380, done: () => World.crops.length > 0,
    },
    {
      key: 'pick', say: 'Water it every so often. When it glows, pick it with your hand.', mood: 'talk', praise: 'Your first harvest!', icon: 't_water', title: 'Water, then pick',
      note: 'Thirsty crops sulk. When a crop glows, click it with the hand.',
      at: () => { const c = World.crops[0]; return c ? c.x : 380; },
      done: (g) => CROPS.some((c) => (g.food[c.key] || 0) > 0),
    },
    {
      key: 'feed', say: 'Buy a feed bowl, pick what you grew, and put it down near her.', mood: 'happy', praise: 'Fed and happy. Good job.', icon: 't_food', title: 'Feed your wombat',
      note: 'Feed Bowl from the mart. Pick the food, then click near the wombat.',
      at: (g) => (g.wombats[0] ? g.wombats[0].x : 340),
      done: (g) => g.wombats.some((w) => w.stomach !== 'empty'),
    },
    {
      key: 'load', say: 'What she leaves is a cube of the best fertiliser going. Drag the cubes into the truck.', mood: 'proud', praise: 'Loaded. That is the job, really.', icon: 'truck', title: 'Load the cubes',
      note: 'Wombats leave square cubes. Drag them into the back of the truck.',
      at: () => (Grove.drops[0] ? Grove.drops[0].x : 500),
      done: (g) => cubes(g) > 0 || (g.stats.sold || 0) > 0 || (g.stats.fertilised || 0) > 0,
    },
    {
      key: 'fert', say: 'Here is the secret: poo is fertiliser. Buy a poo scoop and spread a cube on a bed. It grows twice as fast.', mood: 'sly', praise: 'Watch that grow now.', icon: 'o_plain', title: 'Fertilise a bed',
      note: 'Poo Scoop from the mart. Click a bed with it and one cube from the truck goes on.',
      at: () => { const c = World.crops[0]; return c ? c.x : 380; },
      done: (g) => (g.stats.fertilised || 0) > 0,
    },
    {
      key: 'sell', say: 'Got spare cubes? I make compost. Bring them to me and I will pay you for the lot.', mood: 'happy', praise: 'Pleasure doing business!', icon: 'wdollar', title: 'Sell Jim your spare cubes',
      note: 'Click Jim (later, his shed) and sell. He pays more for a load than for one.',
      at: () => Grove.TRUCK.x, done: (g) => (g.stats.sold || 0) > 0,
    },
    {
      key: 'shovel', say: 'Last trick. Buy a shovel. Dig a channel, then water it and it fills: a pond, a river, whatever you like. Heap it up for hills.', mood: 'proud', praise: 'Now that is a farm.', icon: 'u_burrow', title: 'Dig a pond',
      note: 'Shovel: hold to dig down, right-click (or Shift) to heap up. Water a hole to fill it.',
      at: () => 480, done: (g) => (g.stats.flooded || 0) > 0,
    },
  ];

  function init(g) {
    G = g;
    if (!G.visited) G.visited = {};
    if (typeof G.step !== 'number') G.step = 0;
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
      lines: ['Somebody looks peckish.', 'Put a bowl out, mate. She will find it.', 'A hungry wombat is a grumpy wombat.'] },
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
        'Lovely day for it.', 'I looked after this place for twenty years.', 'A wombat can outrun you. I have tested this.',
        'They make the cubes on purpose. I am sure of it.', 'Shaz at the mart does a great sausage roll.',
        'Groot grows the best carrots around. Do not tell him I said so.', 'I built that fence. Mostly.',
        'Hot one today.', 'The gum trees smell like home.', 'Mind the frogs if you dig a pond.', 'I am on level 40 of my game. Do not ask.',
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
  function poke() {                          // click him and he actually talks
    cult.still = 0; cult.pose = 'idle';
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
          return s ? s.say : 'Look at this place. Green as anything, and all those wombats. You did that, mate.';
        },
        sub: () => (G.cultAway === 2 ? 'at his shed door' : 'the old caretaker'),
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
        say: 'Jim. Caretaker here for twenty years. Retired now, sort of. I live in the shed out the back and I play a lot of video games.',
        opts: [{ q: 'Nice headband.', to: 'band' }, { q: 'Something else.', to: 'hub' }],
      },
      band: {
        mood: 'proud',
        say: 'Keeps the sweat out of my eyes. Gaming is a sport, mate.',
        opts: [{ q: 'Fair enough.', to: 'hub' }],
      },
      money: {
        mood: 'talk',
        say: 'Wombat Mart for tools, the phone, furniture and more wombats. Groot for seed and saplings. I buy cubes. The gumball machine takes one coin and is terribly exciting.',
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
    // and he texts you about it afterwards, like anyone would
    const AFTER = {
      weeds: 'Good job on the weeds. They do creep back, mind.',
      junk: 'The ants said you were very polite.',
      grass: 'Green suits it. Keep the water up.',
      arrive: 'She picked you! Legend.',
      phone: 'Jim here. Saved my number for you. Get some apps from the store.',
      sow: 'A bed in the ground is dinner in the ground.',
      pick: 'Anything you grow, she will eat.',
      feed: 'One fed wombat. Try three!',
      load: 'That old truck is good for something after all.',
      fert: 'Told you. Poo is gold.',
      sell: 'Pleasure. Bring me everything!',
      shovel: 'That is the whole job. The rest is up to you, mate.',
    };
    if (AFTER[s.key]) setTimeout(() => Phone.push('cultist', AFTER[s.key]), 2600);
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
    say(U.pick(['Lovely. Square as anything.', 'Straight onto the compost heap.', 'Top quality, that.', 'A fair price, mate.']), 'chat', 'happy');
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
        UI.toast('Jim has gone to build himself a shed', '');
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
        UI.toast('<b>Jim built a shed</b> at the west end &mdash; he buys cubes there', 'good');
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
    if (s && G.step !== lastStep) { sayT += dt; if (sayT > 1.2 || lastStep === -1) { lastStep = G.step; sayT = 0; if (!bubble.life) say(s.say, 'order', s.mood); } }
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
      cult.pose = cult.still > 16 ? 'sit' : 'idle';       // she takes a seat if you dawdle
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
    const s = step();
    if (s && cult.pose !== 'walk' && cult.pose !== 'run') {
      const tx = U.clamp(s.at(G), 40, Grove.W - 40);
      const a = 0.4 + 0.4 * Math.sin(cult.t * 4);
      g.globalAlpha = a;
      g.fillStyle = PAL.gold3;
      for (let i = 0; i < 5; i++) {
        const k = i / 4;
        g.fillRect(Math.round(U.lerp(cult.x, tx, k)), Math.round(cult.y - 52 + Math.sin(k * Math.PI) * -10), 2, 2);
      }
      Icons.blit(g, s.icon, tx - 8, cult.y - 74 - Math.sin(cult.t * 3) * 2, 1);
      g.globalAlpha = 1;
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
    if (bubble.life <= 0 || !bubble.text) return;
    // A plain speech bubble: white paper, a black border, black letters. No
    // shine, no wobble, no starburst — it is there to be read.
    const INK = '#141118', PAPER = '#fbf8f2', EDGE = '#c8c2b8';

    const lines = layout(bubble.text, 176);
    const W = Math.max(96, Math.ceil(Math.max(...lines.map((l) => l.w))) + 24);
    const H = lines.length * LH + 18;
    const shownN = Math.floor(bubble.shown);
    const total = lines.reduce((n, l) => n + l.length, 0);
    const done = shownN >= total;

    // where it sits: above his head, always inside the view
    const half = W / 2 + 10;
    const lo = FX.cam.x - 320 / FX.cam.zoom + half, hi = FX.cam.x + 320 / FX.cam.zoom - half;
    const bx = lo > hi ? FX.cam.x : U.clamp(cult.x + 6, lo, hi);
    const by = Math.max(26 + H, cult.y - 96);

    g.save();
    const X = Math.round(bx - W / 2), Y = Math.round(by - H);

    // the tail, pointing at him
    const tx = U.clamp(Math.round(cult.x + 6), X + 16, X + W - 16);
    g.fillStyle = INK;
    g.beginPath(); g.moveTo(tx - 9, Y + H - 2); g.lineTo(tx - 1, Y + H + 13); g.lineTo(tx + 8, Y + H - 2); g.fill();
    // the box
    g.fillStyle = INK; g.fillRect(X - 2, Y - 2, W + 4, H + 4);
    g.fillStyle = PAPER; g.fillRect(X, Y, W, H);
    g.fillStyle = EDGE; g.fillRect(X, Y + H - 1, W, 1);
    g.fillStyle = PAPER;
    g.beginPath(); g.moveTo(tx - 6, Y + H - 2); g.lineTo(tx - 1, Y + H + 8); g.lineTo(tx + 5, Y + H - 2); g.fill();

    // ---- the letters, typed in, all one weight -----------------------------
    lines.forEach((l, li) => {
      const ly = Y + 10 + li * LH;
      for (const ch of l) {
        if (ch.i >= shownN || ch.c === ' ') continue;
        Font.draw(g, ch.c, X + 12 + ch.x, ly, { scale: BS, color: INK, align: 'left' });
      }
    });

    // ---- the cue in the corner ---------------------------------------------
    if (!done) {                                        // still speaking: three dots
      for (let i = 0; i < 3; i++) {
        g.fillStyle = i === Math.floor(G.time * 4) % 3 ? '#141118' : '#b4aea4';
        g.fillRect(X + W - 22 + i * 6, Y + H - 10, 3, 3);
      }
    } else {                                            // finished: a small arrow
      const up = Math.round(Math.sin(G.time * 4) * 1.5);
      g.fillStyle = '#141118';
      for (let i = 0; i < 4; i++) g.fillRect(X + W - 20 + i, Y + H - 12 + i + up, 8 - i * 2, 1);
    }
    g.restore();
  }

  function state() {
    return {
      i: G.step, total: STEPS.length, steps: STEPS,
      step: step(), flash: flash > 0, hidden, done: finished(),
    };
  }
  function toggle() { hidden = !hidden; UI.refreshNotebook(); }
  // The job in hand, in the shape the phone wants it: a title, the long form of
  // what she said, where it has to happen, and what she pays for it.
  const WHERE = {
    sickle: 'Wombat Mart', weeds: 'in the grove', junk: 'Wombat Mart, then the grove', grass: 'Wombat Mart, then the grove',
    arrive: 'in the grove', phone: 'Wombat Mart', sow: 'the mart, Groot, then the grove', pick: 'in the grove',
    feed: 'the mart, then the grove', load: 'in the grove', fert: 'the mart, then a bed', sell: 'wherever Jim is', shovel: 'the mart, then anywhere',
  };
  function current() {
    const st = step();
    if (!st) return null;
    return { key: st.key, title: st.title, note: st.note, icon: st.icon, say: st.say,
      where: WHERE[st.key] || 'in the grove', reward: REWARD[G.step] || 0, i: G.step, total: STEPS.length };
  }
  return { init, update, draw, state, toggle, check, poke, hit, say, current, paid, hutHit, hutHere, drawHut, get cult() { return cult; }, get hutX() { return HUT.x; }, STEPS };
})();
