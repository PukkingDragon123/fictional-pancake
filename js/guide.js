// ---- The cultist: a robed wombat who writes the tutorial in her notebook --
const Guide = (() => {
  let G = null;
  const cult = { x: 220, y: 250, tx: 220, dir: 1, pose: 'idle', t: 0, hop: 0, still: 0, castT: 0, happyT: 0 };
  let flash = 0, hidden = false;
  // the speech bubble: what she is saying, how much of it has been typed, how long it stays
  const bubble = { text: '', shown: 0, life: 0, pop: 0, kind: 'order' };
  const REWARD = [12, 18, 24, 0, 20, 20, 24, 30, 30, 30, 36, 60];

  // Each step is a line in the notebook and a place for her to stand.
  const STEPS = [
    {
      key: 'weeds', say: 'Cut the weeds inside my rope. Big ones take a few swings.', praise: 'Clean cut! Take these.', icon: 't_sickle', title: 'Cut the weeds',
      note: 'Take the sickle and drag across them. Just inside the rope will do; big ones take a few swings.',
      at: () => ZONE.x - 120, done: () => World.weeds.every((w) => !inZone(w.x, w.y)),
    },
    {
      key: 'junk', say: 'Those wrecks are not ours to lift. Send for the ants.', praise: 'The ants thank you. So do I.', icon: 't_destroy', title: 'Send for the ants',
      note: 'Logs and ruins are not ours to lift. The ants carry them, for a fee.',
      at: () => { const o = Grove.objects.find((x) => !x.gone && inZone(x.x, x.y)); return o ? o.x : ZONE.x; },
      done: () => Grove.objects.every((o) => o.gone || !inZone(o.x, o.y)),
    },
    {
      key: 'grass', say: 'Farm tool, then grass, inside the rope. Water it or it sulks.', praise: 'Green again. Here.', icon: 't_moss', title: 'Sow the grass',
      note: 'Farm, then grass, inside the rope. Sprouts need time and a drink before they take.',
      at: () => ZONE.x, done: () => World.zoneFraction() >= ZONE_GRASS,
    },
    {
      key: 'arrive', say: 'Hush now. A clean grove calls one of them.', praise: 'She came! I knew it.', icon: 'wombat', title: 'Wait for her',
      note: 'A clean grove calls a wombat. One always comes.',
      at: () => 320, done: (g) => g.wombats.length > 0,
    },
    {
      key: 'sow', say: 'Hoe a bed and drop seed on the bare soil.', praise: 'Sown. Good hands.', icon: 't_hoe', title: 'Break a bed and sow it',
      note: 'Hoe a patch, then seed on the bare soil.',
      at: () => 380, done: () => World.crops.length > 0,
    },
    {
      key: 'pick', say: 'Water it. When it glows, pick it with the hand.', praise: 'A harvest! Take your cut.', icon: 't_water', title: 'Water, then pick',
      note: 'Thirsty crops sulk. When one glows, click it with the hand.',
      at: () => { const c = World.crops[0]; return c ? c.x : 380; },
      done: (g) => CROPS.some((c) => (g.food[c.key] || 0) > 0),
    },
    {
      key: 'feed', say: 'Food tool, pick what you grew, click the wombat.', praise: 'Fed and content. Well done.', icon: 't_food', title: 'Feed her',
      note: 'Food tool, pick what you grew, then click the wombat.',
      at: (g) => (g.wombats[0] ? g.wombats[0].x : 340),
      done: (g) => g.wombats.some((w) => w.stomach !== 'empty'),
    },
    {
      key: 'load', say: 'What she leaves is holy. Drag it to the truck.', praise: 'Loaded. The gods will notice.', icon: 'truck', title: 'Load the cubes',
      note: 'What she leaves is an offering. Drag it to the truck, or call the truck over.',
      at: () => (Grove.drops[0] ? Grove.drops[0].x : 500),
      done: (g) => OFFER_ORDER.some((k) => (g.offerings[k] || 0) + (g.blessed[k] || 0) > 0),
    },
    {
      key: 'tree', say: 'The seed in the middle - click it. It is the Tree of Life.', praise: 'You have seen it. Good.', icon: 'tree', title: 'Wake the seed',
      note: 'The seed in the middle of the plot is the Tree of Life. Click it.',
      at: () => Grove.SEED.x, done: (g) => !!(g.visited && g.visited.tree),
    },
    {
      key: 'map', say: 'Read the signpost. Everything else is out there.', praise: 'Now you know the way.', icon: 'map', title: 'Read the signpost',
      note: 'It shows the mart, the ritual site, and the fog over the rest.',
      at: () => Grove.POST.x, done: (g) => !!(g.visited && g.visited.map),
    },
    {
      key: 'mart', say: 'Walk the mart. Basket first, counter after.', praise: 'A fair trade.', icon: 'shop', title: 'Walk the mart',
      note: 'Seed, stock and stone. Basket first, counter after.',
      at: () => Grove.POST.x, done: (g) => !!(g.visited && g.visited.shop),
    },
    {
      key: 'god', say: 'Stack what she leaves at the ritual site. Call one down.', praise: 'They answered! I am so proud.', icon: 'shrine', title: 'Call one of them',
      note: 'Stack what she leaves at the ritual site. They do answer.',
      at: () => Grove.POST.x, done: (g) => Object.keys(g.summoned).length > 0,
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

  function say(text, kind = 'order') { bubble.text = text; bubble.shown = 0; bubble.life = kind === 'order' ? 9 : 4.5; bubble.pop = 1; bubble.kind = kind; }
  function poke() {                          // click her and she repeats the order
    const s = step(); if (!s) return;
    say(s.say); cult.still = 0; cult.pose = 'idle';
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
    say(s.praise + (reward ? ` +${reward}` : ''), 'praise');
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
    if (flash > 0) flash -= dt;
    cult.t += dt;
    // a new order gets spoken once she is roughly in place
    const s = step();
    if (s && G.step !== lastStep) { sayT += dt; if (sayT > 1.2 || lastStep === -1) { lastStep = G.step; sayT = 0; if (!bubble.life) say(s.say); } }
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
    const sc = 1.4;
    const dw = img.width * sc, dh = img.height * sc;
    g.fillStyle = 'rgba(18,14,20,0.28)';
    Art.ell(g, cult.x, cult.y + 2, 14, 4);
    const draw2 = cult.dir < 0 ? Art.flip(img) : img;
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

  // A speech bubble built like the panels: a cream page in a green frame with
  // gold studs, a tail down to her hood, typed out a letter at a time.
  function drawBubble(g) {
    if (bubble.life <= 0 || !bubble.text) return;
    const full = bubble.text;
    const shown = full.slice(0, Math.min(full.length, Math.floor(bubble.shown)));
    const words = full.split(' '), lines = [];
    let line = '';
    for (const w of words) { if ((line + w).length > 26) { lines.push(line.trim()); line = ''; } line += w + ' '; }
    lines.push(line.trim());
    const cols = Math.max(...lines.map((l) => l.length));
    const W = Math.max(84, cols * 6 + 26), H = lines.length * 13 + 18;
    const scale = 1 + Math.sin(bubble.pop * Math.PI) * 0.18;
    const half = W / 2 + 10;
    const lo = FX.cam.x - 320 / FX.cam.zoom + half, hi = FX.cam.x + 320 / FX.cam.zoom - half;
    const bx = lo > hi ? FX.cam.x : U.clamp(cult.x + 6, lo, hi);
    const by = Math.max(24 + H, cult.y - 78);
    // by is the bottom of the bubble; the frame is drawn from by - H
    const praise = bubble.kind === 'praise';
    const OL = '#17120e', CR0 = praise ? '#fdf0c4' : '#f4e6c0', CR1 = '#fdf6e0';
    const G0 = praise ? '#7d5510' : '#29431c', G2 = praise ? '#efc245' : '#6ea83e', G3 = praise ? '#ffe497' : '#97cd60';
    g.save();
    g.translate(bx, by); g.scale(scale, scale); g.translate(-bx, -by);
    const X = Math.round(bx - W / 2), Y = Math.round(by - H);
    g.fillStyle = OL; g.fillRect(X - 3, Y - 3, W + 6, H + 6);
    g.fillStyle = G0; g.fillRect(X - 1, Y - 1, W + 2, H + 2);
    g.fillStyle = G2; g.fillRect(X, Y, W, H);
    g.fillStyle = G3; g.fillRect(X + 1, Y + 1, W - 2, 2); g.fillRect(X + 1, Y + 1, 2, H - 2);
    g.fillStyle = CR0; g.fillRect(X + 4, Y + 4, W - 8, H - 8);
    g.fillStyle = CR1; g.fillRect(X + 4, Y + 4, W - 8, 2);
    g.fillStyle = '#efc245';                                     // the four gold studs
    g.fillRect(X, Y, 4, 4); g.fillRect(X + W - 4, Y, 4, 4); g.fillRect(X, Y + H - 4, 4, 4); g.fillRect(X + W - 4, Y + H - 4, 4, 4);
    const tx = U.clamp(cult.x + 6, X + 16, X + W - 16);          // the tail still points at her
    g.fillStyle = OL; g.beginPath(); g.moveTo(tx - 11, Y + H - 1); g.lineTo(tx - 2, Y + H + 13); g.lineTo(tx + 5, Y + H - 1); g.fill();
    g.fillStyle = G2; g.beginPath(); g.moveTo(tx - 8, Y + H - 2); g.lineTo(tx - 2.5, Y + H + 9); g.lineTo(tx + 2, Y + H - 2); g.fill();
    g.fillStyle = CR0; g.fillRect(X + 4, Y + H - 6, W - 8, 2);
    let acc = 0;
    lines.forEach((l, i) => {
      const part = shown.slice(acc, acc + l.length);
      acc += l.length + 1;
      FX.pixelText(g, part, X + 11, Y + 10 + i * 13, { color: '#3a2612', size: 10, align: 'left', ink: false });
    });
    if (shown.length < full.length && Math.floor(bubble.life * 6) % 2) { g.fillStyle = '#3a2612'; g.fillRect(X + W - 12, Y + H - 12, 4, 4); }
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
