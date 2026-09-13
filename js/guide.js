// ---- The cultist: a robed wombat who writes the tutorial in her notebook --
const Guide = (() => {
  let G = null;
  const cult = { x: 220, y: 250, tx: 220, dir: 1, pose: 'idle', t: 0, hop: 0, still: 0, castT: 0, happyT: 0 };
  let flash = 0, hidden = false;
  // the speech bubble: what she is saying, how much of it has been typed, how long it stays
  const bubble = { text: '', shown: 0, life: 0, pop: 0, kind: 'order' };
  const REWARD = [12, 18, 24, 0, 20, 20, 24, 30, 30, 36, 60];

  // Each step is a line in the notebook and a place for her to stand.
  const STEPS = [
    {
      key: 'weeds', say: 'Cut the weeds inside my rope. Big ones take a few swings.', mood: 'cross', praise: 'Clean cut. Take these.', icon: 't_sickle', title: 'Cut the weeds',
      note: 'Take the sickle and drag across them. Just inside the rope will do; big ones take a few swings.',
      at: () => ZONE.x - 120, done: () => World.weeds.every((w) => !inZone(w.x, w.y)),
    },
    {
      key: 'junk', say: 'Those wrecks are not ours to lift. Send for the ants.', mood: 'think', praise: 'The ants thank you. So do I.', icon: 't_destroy', title: 'Send for the ants',
      note: 'Logs and ruins are not ours to lift. The ants carry them, for a fee.',
      at: () => { const o = Grove.objects.find((x) => !x.gone && inZone(x.x, x.y)); return o ? o.x : ZONE.x; },
      done: () => Grove.objects.every((o) => o.gone || !inZone(o.x, o.y)),
    },
    {
      key: 'grass', say: 'Farm tool, then grass, inside the rope. Water it or it sulks.', mood: 'talk', praise: 'Green again. Here.', icon: 't_moss', title: 'Sow the grass',
      note: 'Farm, then grass, inside the rope. Sprouts need time and a drink before they take.',
      at: () => ZONE.x, done: () => World.zoneFraction() >= ZONE_GRASS,
    },
    {
      key: 'arrive', say: 'Hush now. A clean grove calls one of them.', mood: 'worry', praise: 'She came. I knew it.', icon: 'wombat', title: 'Wait for her',
      note: 'A clean grove calls a wombat. One always comes.',
      at: () => 320, done: (g) => g.wombats.length > 0,
    },
    {
      key: 'sow', say: 'Hoe a bed and drop seed on the bare soil.', mood: 'talk', praise: 'Sown. Good hands.', icon: 't_hoe', title: 'Break a bed and sow it',
      note: 'Hoe a patch, then seed on the bare soil.',
      at: () => 380, done: () => World.crops.length > 0,
    },
    {
      key: 'pick', say: 'Water it. When it glows, pick it with the hand.', mood: 'talk', praise: 'A harvest. Take your cut.', icon: 't_water', title: 'Water, then pick',
      note: 'Thirsty crops sulk. When one glows, click it with the hand.',
      at: () => { const c = World.crops[0]; return c ? c.x : 380; },
      done: (g) => CROPS.some((c) => (g.food[c.key] || 0) > 0),
    },
    {
      key: 'feed', say: 'Food tool, pick what you grew, and put a bowl on the ground.', mood: 'happy', praise: 'Fed and content. Well done.', icon: 't_food', title: 'Feed her',
      note: 'Food tool, pick what you grew, then click the wombat.',
      at: (g) => (g.wombats[0] ? g.wombats[0].x : 340),
      done: (g) => g.wombats.some((w) => w.stomach !== 'empty'),
    },
    {
      key: 'load', say: 'What she leaves is money. Drag it to the truck.', mood: 'proud', praise: 'Loaded. That lot is worth a fortune stacked.', icon: 'truck', title: 'Load the cubes',
      note: 'What she leaves is an offering. Drag it to the truck, or call the truck over.',
      at: () => (Grove.drops[0] ? Grove.drops[0].x : 500),
      done: (g) => OFFER_ORDER.some((k) => (g.offerings[k] || 0) + (g.blessed[k] || 0) > 0),
    },
    {
      key: 'map', say: 'The truck has a map. Everything else is out there.', mood: 'think', praise: 'Now you know the way.', icon: 'map', title: 'Open the map',
      note: 'The truck has a map: the mart, the ritual site, and fog over the rest.',
      at: () => Grove.TRUCK.x, done: (g) => !!(g.visited && g.visited.map),
    },
    {
      key: 'mart', say: 'Walk the mart. Fill a basket, then ask the wombat on the counter.', mood: 'sly', praise: 'A fair trade.', icon: 'shop', title: 'Walk the mart',
      note: 'Seed, stock and stone. Basket first, counter after.',
      at: () => Grove.TRUCK.x, done: (g) => !!(g.visited && g.visited.shop),
    },
    {
      key: 'stack', say: 'Now the good part. Truck the poop to the Great Stack and pile it high.', mood: 'happy', praise: 'Look at it. The higher it goes, the more they pay.', icon: 'u_seats', title: 'Stack the poop',
      note: 'The Great Stack is on the map. Every cube pays when it lands, and the crowd tips by the second for as long as the tower stands.',
      at: () => Grove.TRUCK.x, done: (g) => (g.record || 0) >= 2,
    },
    {
      key: 'god', say: 'Stack what she leaves at the ritual site. Call one down.', mood: 'shock', praise: 'They answered. I am so proud.', icon: 'shrine', title: 'Call one of them',
      note: 'Stack what she leaves at the ritual site. They do answer.',
      at: () => Grove.TRUCK.x, done: (g) => Object.keys(g.summoned).length > 0,
    },
  ];

  function init(g) {
    G = g;
    if (!G.visited) G.visited = {};
    if (typeof G.step !== 'number') G.step = 0;
    cult.x = cult.tx = 240;
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
      lines: ['She is looking at me like I am lunch.', 'Something down there is hungry.', 'Put a bowl out. She will find it.'] },
    { when: () => Grove.drops.length > 2, mood: 'sly',
      lines: ['There is a lot of holy matter on my lawn.', 'Load the truck before I trip on one.', 'Cubes. Everywhere. I love this job.'] },
    { when: (g) => g.wd > 400, mood: 'proud',
      lines: ['You are doing better than the last one.', 'Rich, for a caretaker.', 'Buy the land. Land never sulks.'] },
    { when: (g) => g.wombats.length >= 3, mood: 'happy',
      lines: ['Three of them. My chest hurts.', 'Look at them go. Look at them.', 'I did not cry. You cried.'] },
    { when: () => World.weeds.length > 40, mood: 'cross',
      lines: ['The thistles are winning again.', 'It grows back. It always grows back.', 'I dream about thistles. Not good dreams.'] },
    { when: (g) => Object.keys(g.summoned || {}).length > 0, mood: 'shock',
      lines: ['One of them is watching. Do not look up.', 'The wood went quiet when it answered.', 'They like you. That is not always good.'] },
    { when: () => true, mood: 'idle',
      lines: [
        'Twenty years I have kept this wood.', 'The shirt was a gift. I never take it off.',
        'A wombat can outrun you. I have tested this.', 'They make the cubes on purpose. I am sure of it.',
        'Quiet, isn\'t it. Too quiet.', 'My hat is older than you are.',
        'Do not feed them the gold ones. Long story.', 'I have named every tree. Do not ask.',
        'If you hear digging at night, it is fine. Probably.',
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
  function poke() {                          // click her and she repeats the order
    const s = step(); if (!s) return;
    say(s.say, 'order', s.mood); cult.still = 0; cult.pose = 'idle';
    FX.burst(cult.x, cult.y - 46, 6, { color: [PAL.gold3, PAL.cream], speed: 40, gravity: -20, life: 0.5, size: 2 });
    Audio.play('squeak');
  }
  function hit(x, y) { return !finished() && !hidden && Math.abs(x - cult.x) < 18 && y > cult.y - 66 && y < cult.y + 6; }
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
    if (finished()) UI.toast('the notebook is full', 'good');
  }

  let lastStep = -1, sayT = 0;
  function update(dt) {
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
    if (finished() || hidden) return;
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
    const gr = g.createRadialGradient(cult.x, cult.y - 24, 2, cult.x, cult.y - 24, 40 + p * 8);
    gr.addColorStop(0, `rgba(185,142,240,${(0.14 + p * 0.1).toFixed(2)})`);
    gr.addColorStop(1, 'rgba(185,142,240,0)');
    g.fillStyle = gr; g.fillRect(cult.x - 48, cult.y - 72, 96, 96);
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
  return { init, update, draw, state, toggle, check, poke, hit, say, get cult() { return cult; }, STEPS };
})();
