// ---- The cultist: a robed wombat who writes the tutorial in her notebook --
const Guide = (() => {
  let G = null;
  const cult = { x: 220, y: 250, tx: 220, dir: 1, pose: 'idle', t: 0, hop: 0 };
  let flash = 0, hidden = false;

  // Each step is a line in the notebook and a place for her to stand.
  const STEPS = [
    {
      key: 'weeds', icon: 't_sickle', title: 'Cut the weeds',
      note: 'Take the sickle and drag across them. Just inside the rope will do; big ones take a few swings.',
      at: () => ZONE.x - 120, done: () => World.weeds.every((w) => !inZone(w.x, w.y)),
    },
    {
      key: 'junk', icon: 't_destroy', title: 'Send for the ants',
      note: 'Logs and ruins are not ours to lift. The ants carry them, for a fee.',
      at: () => { const o = Grove.objects.find((x) => !x.gone && inZone(x.x, x.y)); return o ? o.x : ZONE.x; },
      done: () => Grove.objects.every((o) => o.gone || !inZone(o.x, o.y)),
    },
    {
      key: 'grass', icon: 't_moss', title: 'Sow the grass',
      note: 'Farm, then grass, inside the rope. Sprouts need time and a drink before they take.',
      at: () => ZONE.x, done: () => World.zoneFraction() >= ZONE_GRASS,
    },
    {
      key: 'arrive', icon: 'wombat', title: 'Wait for her',
      note: 'A clean grove calls a wombat. One always comes.',
      at: () => 320, done: (g) => g.wombats.length > 0,
    },
    {
      key: 'sow', icon: 't_hoe', title: 'Break a bed and sow it',
      note: 'Hoe a patch, then seed on the bare soil.',
      at: () => 380, done: () => World.crops.length > 0,
    },
    {
      key: 'pick', icon: 't_water', title: 'Water, then pick',
      note: 'Thirsty crops sulk. When one glows, click it with the hand.',
      at: () => { const c = World.crops[0]; return c ? c.x : 380; },
      done: (g) => CROPS.some((c) => (g.food[c.key] || 0) > 0),
    },
    {
      key: 'feed', icon: 't_food', title: 'Feed her',
      note: 'Food tool, pick what you grew, then click the wombat.',
      at: (g) => (g.wombats[0] ? g.wombats[0].x : 340),
      done: (g) => g.wombats.some((w) => w.stomach !== 'empty'),
    },
    {
      key: 'load', icon: 'truck', title: 'Load the cubes',
      note: 'What she leaves is an offering. Drag it to the truck, or call the truck over.',
      at: () => (Grove.drops[0] ? Grove.drops[0].x : 500),
      done: (g) => OFFER_ORDER.some((k) => (g.offerings[k] || 0) + (g.blessed[k] || 0) > 0),
    },
    {
      key: 'tree', icon: 'tree', title: 'Wake the seed',
      note: 'The seed in the middle of the plot is the Tree of Life. Click it.',
      at: () => Grove.SEED.x, done: (g) => !!(g.visited && g.visited.tree),
    },
    {
      key: 'map', icon: 'map', title: 'Read the signpost',
      note: 'It shows the mart, the ritual site, and the fog over the rest.',
      at: () => Grove.POST.x, done: (g) => !!(g.visited && g.visited.map),
    },
    {
      key: 'mart', icon: 'shop', title: 'Walk the mart',
      note: 'Seed, stock and stone. Basket first, counter after.',
      at: () => Grove.POST.x, done: (g) => !!(g.visited && g.visited.shop),
    },
    {
      key: 'god', icon: 'shrine', title: 'Call one of them',
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

  function check() {
    const s = step();
    if (!s) return;
    if (!s.done(G)) return;
    G.step++;
    flash = 1.6;
    cult.pose = 'point'; cult.t = 0; cult.hop = 1;
    Audio.play('chime');
    FX.sparkle(cult.x, cult.y - 40, 12, PAL.gold3);
    UI.refreshAll();           // a finished step can hand over a new tool
    UI.refreshNotebook();
    Main.save();
    if (finished()) UI.toast('the notebook is full', 'good');
  }

  function update(dt) {
    if (flash > 0) flash -= dt;
    cult.t += dt;
    if (cult.hop > 0) cult.hop = Math.max(0, cult.hop - dt * 1.6);
    const s = step();
    if (s) {
      const want = U.clamp(s.at(G), 60, Grove.W - 60);
      cult.tx = want + 46;
    }
    const dx = cult.tx - cult.x;
    if (Math.abs(dx) > 3) {
      cult.dir = dx > 0 ? 1 : -1;
      cult.x += U.clamp(dx, -52 * dt, 52 * dt);
      cult.pose = 'walk';
    } else if (cult.pose === 'walk') cult.pose = 'idle';
    if (cult.hop <= 0 && cult.pose === 'point') cult.pose = 'idle';
    check();
  }

  // She stands in the grove and points at whatever the step is about.
  function draw(g) {
    if (finished() || hidden) return;
    const bobF = Math.floor(cult.t * (cult.pose === 'walk' ? 7 : 3)) % 6;
    const img = Sprites.cultist(bobF, cult.pose === 'point' ? 'point' : 'idle');
    const lift = cult.pose === 'walk' ? Math.abs(Math.sin(cult.t * 9)) * 2 : 0;
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
    const s = step();
    if (s && cult.pose !== 'walk') {
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

  function state() {
    return {
      i: G.step, total: STEPS.length, steps: STEPS,
      step: step(), flash: flash > 0, hidden, done: finished(),
    };
  }
  function toggle() { hidden = !hidden; UI.refreshNotebook(); }
  return { init, update, draw, state, toggle, check, get cult() { return cult; }, STEPS };
})();
