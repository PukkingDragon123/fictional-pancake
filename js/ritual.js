// ---- The shrine: staging offerings, and the summoning ---------------------
const Ritual = (() => {
  let G = null;
  const W = 640, H = 360;
  const CX = 320, BASE = 268;
  // The cutscene is a timeline. Each beat owns a slice of the elapsed time.
  const BEATS = [
    ['dark', 0.9], ['roots', 1.7], ['charge', 1.5], ['strike', 0.7], ['reveal', 2.6], ['bless', 2.4], ['out', 1.0],
  ];
  const TOTAL = BEATS.reduce((a, b) => a + b[1], 0);
  const scene = { on: false, t: 0, god: null, beat: '', beatT: 0, boltT: 0, rune: 0, shown: false, motes: [] };

  function need(god) {
    const cut = G.fruits.godtongue ? 1 : 0;
    const out = {};
    for (const k in god.ritual) out[k] = Math.max(1, god.ritual[k] - cut);
    return out;
  }
  function staged() { return G.staged || (G.staged = {}); }
  function held(type) { return (G.offerings[type] || 0) + (G.blessed[type] || 0); }
  function meets(god) {
    const n = need(god), s = staged();
    for (const k in n) if ((s[k] || 0) < n[k]) return false;
    return true;
  }
  function available() { return GODS.filter((g) => !G.summoned[g.key]); }
  function readyGod() { return available().find(meets) || null; }
  function stage(type, n = 1) {
    let done = 0;
    for (let i = 0; i < n; i++) {
      if ((G.offerings[type] || 0) > 0) G.offerings[type]--;
      else if ((G.blessed[type] || 0) > 0) G.blessed[type]--;
      else break;
      staged()[type] = (staged()[type] || 0) + 1;
      done++;
    }
    if (done) { Audio.play('place'); UI.refreshHUD(); UI.refreshTray(); UI.refreshRitual(); }
    else Audio.play('error');
  }
  function unstage(type) {
    const s = staged();
    if (!s[type]) return;
    s[type]--;
    if (!s[type]) delete s[type];
    G.offerings[type] = (G.offerings[type] || 0) + 1;
    Audio.play('click'); UI.refreshHUD(); UI.refreshTray(); UI.refreshRitual();
  }
  function clearStage() {
    const s = staged();
    for (const k in s) { G.offerings[k] = (G.offerings[k] || 0) + s[k]; delete s[k]; }
    UI.refreshHUD(); UI.refreshTray(); UI.refreshRitual();
  }

  function summonGod(god) {
    if (!god || scene.on) return;
    scene.on = true; scene.t = 0; scene.god = god; scene.shown = false; scene.motes.length = 0;
    G.paused = true;
    FX.clear();
    FX.letterbox(true);
    Audio.play('growl');
    UI.hideAll();
  }
  function skip() { if (scene.on) scene.t = Math.max(scene.t, TOTAL - 1.0); }

  function finish() {
    const god = scene.god;
    scene.on = false;
    G.paused = false;
    G.summoned[god.key] = true;
    G.blessings[god.key] = true;
    G.artifacts[god.key] = (G.artifacts[god.key] || 0) + 1;
    G.stats.summons = (G.stats.summons || 0) + 1;
    Cult.give(120 + god.tier * 60);     // a god answering is worth a rank on its own
    if (god.key === 'demewombra') G.seeds.runeberry = (G.seeds.runeberry || 0) + 3;
    FX.setSlowmo(1, true); FX.vignette(0); FX.letterbox(false); FX.cine.tDesat = 0;
    Audio.setMode('pen');
    UI.showBlessing(god);
    Main.save();
  }

  function beatAt(t) {
    let acc = 0;
    for (const [name, dur] of BEATS) {
      if (t < acc + dur) return [name, (t - acc) / dur];
      acc += dur;
    }
    return ['out', 1];
  }

  function update(dt, realDt) {
    if (!scene.on) { if (G && G.mode === 'shrine') updateClimb(dt); return; }
    scene.t += realDt;
    const [beat, p] = beatAt(scene.t);
    const changed = beat !== scene.beat;
    scene.beat = beat; scene.beatT = p;
    if (changed) onBeat(beat);
    if (beat === 'roots' && Math.random() < realDt * 17) {
      const a = Math.random() * TAU, r = 70 + Math.random() * 90;
      FX.root(CX + Math.cos(a) * r, BASE + Math.sin(a) * 22, { len: U.rand(48, 118), rise: U.rand(0.8, 1.5), w: U.rand(3, 6.5), life: 7 });
      FX.dust(CX + Math.cos(a) * r, BASE + Math.sin(a) * 22, 4, PAL.soil2);
    }
    if (beat === 'charge') {
      if (Math.random() < realDt * 26) {
        const a = Math.random() * TAU, r = 120 + Math.random() * 90;
        scene.motes.push({ x: CX + Math.cos(a) * r, y: BASE - 40 + Math.sin(a) * 60, life: 1.2, col: U.pick([PAL.div4, PAL.div5, PAL.cyan3, scene.god.color]) });
      }
      FX.shake(0.6);
    }
    if (beat === 'strike') {
      scene.boltT -= realDt;
      if (scene.boltT <= 0) {
        scene.boltT = 0.09;
        FX.lightning(CX + U.rand(-70, 70), -20, CX + U.rand(-26, 26), BASE - 60, { color: PAL.cream, glow: U.rgba(scene.god.color, 0.6), w: U.rand(2, 3.4), forks: 3 });
        FX.flash(PAL.cream, 0.7); FX.shake(9);
      }
    }
    if (beat === 'reveal' && Math.random() < realDt * 14) {
      FX.spawn({ x: CX + U.rand(-90, 90), y: BASE + 10, vx: U.rand(-8, 8), vy: -U.rand(30, 90), life: U.rand(1, 2), size: 2, color: U.pick([scene.god.color, PAL.div5, PAL.gold3]), gravity: -6 });
    }
    for (let i = scene.motes.length - 1; i >= 0; i--) {
      const m = scene.motes[i];
      m.life -= realDt;
      if (m.life <= 0) { scene.motes.splice(i, 1); continue; }
      const tx = CX, ty = BASE - 70;
      m.x = U.lerp(m.x, tx, 1 - Math.pow(0.04, realDt));
      m.y = U.lerp(m.y, ty, 1 - Math.pow(0.04, realDt));
    }
    scene.rune += realDt * (beat === 'charge' ? 1.6 : beat === 'strike' ? 4 : 0.5);
    if (scene.t >= TOTAL) finish();
  }
  function onBeat(beat) {
    const god = scene.god;
    switch (beat) {
      case 'dark': FX.vignette(0.9); FX.cine.tDesat = 0.7; Audio.play('wind'); Audio.setMode('tower'); break;
      case 'roots': Audio.play('rumble'); FX.shake(3); break;
      case 'charge': Audio.play('chant'); FX.setSlowmo(0.85); break;
      case 'strike': Audio.play('thunder'); FX.hitstop(0.16); FX.punch(0.2); break;
      case 'reveal':
        Audio.play('chime'); Audio.play('bless');
        FX.flash(U.rgba(god.color, 0.8), 0.6); FX.punch(0.14); FX.shake(6);
        FX.cine.tDesat = 0;
        FX.title(god.name.toUpperCase(), { size: 22, color: god.color, dur: 2.4, sub: god.title, style: 'slam' });
        break;
      case 'bless':
        Audio.play('cheer', 1);
        FX.confettiBurst(CX, 150, 90);
        for (let i = 0; i < 3; i++) FX.ring(CX, BASE - 60, 60 + i * 40, U.rgba(god.color, 0.5));
        break;
      case 'out': FX.setSlowmo(1); FX.vignette(0.2); break;
    }
  }

  // ---- shrine mode (staging) ---------------------------------------------
  // ==== THE CLIMB =========================================================
  // The shrine is not a table you lay offerings on any more. It is a shaft cut
  // down into the rock with an altar at the bottom of it and nothing above but
  // dark. What the wombats leave is the only thing in this world the gods will
  // take, so you throw it down the hole and you build with it, and if you can
  // get a tower of the stuff high enough that something up there can reach it,
  // something up there reaches down.
  //
  // There is no interface on this scene. Everything you need to know is cut
  // into the walls: the height in notches, what you have left hanging on a
  // chain, and how far the next god is by which candles are lit. If you want
  // to know how you are doing, look up.
  const SHAFT = 268;                       // the well, inside face to inside face
  const LX = (W - SHAFT) / 2, RX = LX + SHAFT;
  const CUBIT = 24;                        // one notch cut in the wall
  const HAND_UP = 128;                     // how far above the camera the hand sits
  const PX = 3;                            // the block everything in here is drawn in

  const S = {
    world: null, bodies: [], hand: null, next: null,
    camY: 0, tCam: 0, top: 0, best: 0, settle: 0,
    eyes: [], tallow: [], sparks: [],
    dread: 0, heart: 0, t: 0, shake: 0,
    toppleT: 0, lastTop: 0, grantT: 0, entered: false,
  };

  // How high a god has to be able to reach. It comes off what it used to ask
  // for, so a god that wanted a lot of cubes still wants a lot of cubes.
  function climbOf(god) {
    const n = Object.values(god.ritual).reduce((a, b) => a + b, 0);
    return Math.max(4, Math.round(n * 1.15) + god.tier * 2);
  }
  function nextGod() {
    return GODS.filter((g2) => !G.summoned[g2.key]).sort((a, b) => climbOf(a) - climbOf(b))[0] || null;
  }
  // everything still in the truck, in the order it will come to hand
  function bag() {
    const out = [];
    for (const k of OFFER_ORDER) {
      const n = (G.offerings[k] || 0) + (G.blessed[k] || 0);
      for (let i = 0; i < n; i++) out.push(k);
    }
    return out;
  }
  function bagCount() { return OFFER_ORDER.reduce((n, k) => n + (G.offerings[k] || 0) + (G.blessed[k] || 0), 0); }
  function takeFromBag(k) {
    if ((G.offerings[k] || 0) > 0) { G.offerings[k]--; return false; }
    if ((G.blessed[k] || 0) > 0) { G.blessed[k]--; return true; }
    return null;
  }

  // ---- the shaft ----------------------------------------------------------
  function enter() {
    S.world = new Physics.World();
    S.world.gravity = 1150;
    S.world.iterations = 12;
    S.world.maxFall = 900;
    S.world.onImpact = (a, b, imp) => {
      if (imp > 26) { Audio.play('thud'); FX.shake(Math.min(4, imp / 90)); }
    };
    S.bodies.length = 0; S.sparks.length = 0;
    S.camY = 0; S.tCam = 0; S.top = 0; S.best = 0; S.settle = 0; S.t = 0;
    S.dread = 0; S.heart = 0; S.toppleT = 0; S.lastTop = 0; S.grantT = 0;
    S.hand = null; S.next = null; S.entered = true;
    // the altar, and the two walls, are the only things that do not move
    const floor = new Physics.Body({ x: W / 2, y: 26, width: SHAFT - 8, height: 52, isStatic: true, friction: 0.95 });
    const wl = new Physics.Body({ x: LX - 40, y: -4000, width: 80, height: 9000, isStatic: true, friction: 0.5 });
    const wr = new Physics.Body({ x: RX + 40, y: -4000, width: 80, height: 9000, isStatic: true, friction: 0.5 });
    S.world.add(floor); S.world.add(wl); S.world.add(wr);
    // the things in the wall that watch you
    S.eyes.length = 0;
    const r = Art.rng(0x5e1f);
    for (let i = 0; i < 90; i++) {
      S.eyes.push({
        y: -40 - i * 46 - r() * 30,
        x: r() < 0.5 ? LX - 10 - r() * 22 : RX + 10 + r() * 22,
        open: 0, want: 0, wait: r() * 9, sz: 1 + Math.round(r() * 1.6),
      });
    }
    S.tallow.length = 0;
    for (let i = 0; i < 80; i++) S.tallow.push({ y: -i * 60 - r() * 40, x: r() < 0.5 ? LX + 3 : RX - 6, len: 8 + r() * 26 });
    deal();
    Audio.setMode('tower');
    Audio.play('wind');
    FX.vignette(0.55);
  }
  function leave() { S.entered = false; FX.vignette(0); }

  // ---- what is in your hand ------------------------------------------------
  function deal() {
    const b = bag();
    if (!b.length) { S.hand = null; S.next = null; return; }
    // the chain feeds you the plainest first, so the good stuff is yours to spend
    const k = S.next || b[0];
    S.hand = { key: k, x: W / 2, angle: 0, drop: 0, wob: 0 };
    const rest = b.slice();
    const i = rest.indexOf(k); if (i >= 0) rest.splice(i, 1);
    S.next = rest.length ? rest[0] : null;
  }
  function cycle(dir) {
    // the chain has more than one kind on it: pull a different one down
    const kinds = [...new Set(bag())];
    if (kinds.length < 2 || !S.hand) return;
    let i = kinds.indexOf(S.hand.key);
    i = (i + dir + kinds.length) % kinds.length;
    S.hand.key = kinds[i];
    Audio.play('click');
  }
  function drop() {
    if (!S.hand || S.grantT > 0) return;
    const k = S.hand.key, def = OFFERINGS[k];
    const bl = takeFromBag(k);
    if (bl === null) { deal(); return; }
    const sc = 21;
    const b = new Physics.Body({
      x: S.hand.x, y: S.camY - HAND_UP, angle: S.hand.angle,
      width: def.w * sc, height: def.h * sc,
      density: def.density, friction: def.friction,
      restitution: def.restitution, adhesion: def.adhesion,
      angularDamping: 0.4,
    });
    b.userData = { def, blessed: bl, lit: 0 };
    S.world.add(b);
    S.bodies.push(b);
    Audio.play('place');
    FX.shake(0.6);
    S.hand = null;
    setTimeout(() => { if (S.entered) deal(); }, 90);
    UI.refreshHUD();
  }

  // the highest point of anything that is settled and is part of the tower
  function towerTop() {
    let top = 0;
    for (const b of S.bodies) {
      if (b.speed > 28) continue;                       // still in the air, does not count
      const t = b.aabb().minY;
      if (t < top) top = t;
    }
    return top;
  }
  const notches = (y) => Math.max(0, Math.floor(-y / CUBIT));

  function updateClimb(dt) {
    if (!S.entered || !S.world) return;
    S.t += dt;
    const sub = Math.min(3, Math.ceil(dt / 0.0125));
    for (let i = 0; i < sub; i++) S.world.step(dt / sub);
    // anything that falls out of the shaft is gone
    for (let i = S.bodies.length - 1; i >= 0; i--) {
      if (S.bodies[i].y > 260) { S.world.remove(S.bodies[i]); S.bodies.splice(i, 1); }
    }
    S.top = towerTop();
    const h = notches(S.top);
    if (h > S.best) {
      S.best = h;
      Cult.give(2);                     // every notch of the climb is noticed
      if (h % 5 === 0) { Audio.play('chime'); FX.flash('#2a1030', 0.18); }
      S.dread = Math.min(1, S.best / 34);
    }
    // the camera rides a little above the top of the tower
    S.tCam = Math.min(0, S.top + 96);
    S.camY = U.lerp(S.camY, S.tCam, 1 - Math.pow(0.0015, dt));
    if (S.hand) {
      S.hand.wob = Math.sin(S.t * 2.4) * 1.6;
      S.hand.drop = Math.max(0, S.hand.drop - dt * 4);
    }
    // the heart in the rock, quicker the higher you are
    S.heart += dt * (1.1 + S.dread * 1.9);
    if (S.heart >= 1) { S.heart -= 1; if (S.dread > 0.25) Audio.play('rumble', 0.2 + S.dread * 0.3); }
    // the eyes
    for (const e of S.eyes) {
      e.wait -= dt;
      if (e.wait <= 0) { e.want = e.want > 0.5 ? 0 : 1; e.wait = e.want ? U.rand(1.4, 5) : U.rand(2, 8); }
      e.open = U.lerp(e.open, e.want * Math.min(1, S.dread * 1.6), 1 - Math.pow(0.02, dt));
    }
    // has the tower gone over?
    if (S.top > S.lastTop + CUBIT * 1.5 && S.bodies.length > 3) {
      Audio.play('rumble'); FX.shake(6); FX.flash('#1a0408', 0.3);
      S.lastTop = S.top;
    } else if (S.top < S.lastTop) S.lastTop = S.top;
    // is anything up there able to reach?
    if (S.grantT > 0) { S.grantT -= dt; if (S.grantT <= 0) grant(); return; }
    const god = nextGod();
    if (god && S.best >= climbOf(god) && settled()) {
      S.grantT = 1.5;
      Audio.play('growl'); FX.shake(5); FX.vignette(0.85);
    }
    for (let i = S.sparks.length - 1; i >= 0; i--) {
      const sp = S.sparks[i];
      sp.life -= dt; sp.x += sp.vx * dt; sp.y += sp.vy * dt; sp.vy += 60 * dt;
      if (sp.life <= 0) S.sparks.splice(i, 1);
    }
  }
  function settled() {
    for (const b of S.bodies) if (b.speed > 20) return false;
    return true;
  }
  // something up there reaches down and takes the lot
  function grant() {
    const god = nextGod();
    if (!god) return;
    for (const b of S.bodies) S.world.remove(b);
    S.bodies.length = 0;
    S.top = 0; S.best = 0; S.lastTop = 0; S.tCam = 0;
    summonGod(god);
  }

  // ---- drawing the shaft ---------------------------------------------------
  // Every surface in here is cut in three-pixel blocks and every edge is a hard
  // black line. It is a hole in the ground; it is not supposed to be pretty.
  const ROCK = ['#0a0508', '#150b10', '#221219', '#2e1a22', '#3d232c'];
  function wallCol(y, seed) {
    const r = Art.rng(Math.round(y / 6) * 977 + seed);
    return ROCK[1 + Math.floor(r() * 3)];
  }
  function renderClimb(g) {
    const cam = Math.round(S.camY);
    const off = H / 2 - cam;                      // world y + off = screen y
    g.fillStyle = '#050306'; g.fillRect(0, 0, W, H);
    // the back of the shaft, lit only near the altar and by whatever is burning
    const topRow = Math.floor((cam - H / 2) / PX) * PX;
    for (let y = topRow; y < cam + H / 2 + PX; y += PX) {
      const sy = Math.round(y + off);
      const d = U.clamp(1 - (-y) / 900, 0.1, 1);
      g.fillStyle = U.mix('#0a0509', '#241521', d);
      g.fillRect(LX, sy, SHAFT, PX);
    }
    // the sigil scratched into the back wall, brighter the higher you get
    sigil(g, W / 2, Math.round(-CUBIT * 6 + off), 0.12 + S.dread * 0.5);
    // grease and tallow running down it
    for (const t of S.tallow) {
      const sy = Math.round(t.y + off);
      if (sy < -40 || sy > H + 40) continue;
      g.fillStyle = 'rgba(180,150,110,0.14)';
      g.fillRect(Math.round(t.x), sy, PX, Math.round(t.len));
    }
    // the two walls, hewn, with a notch cut at every cubit
    for (let y = topRow; y < cam + H / 2 + PX; y += PX) {
      const sy = Math.round(y + off);
      const jitL = (Art.rng(Math.round(y / PX) * 131)() * 3 | 0) * PX;
      const jitR = (Art.rng(Math.round(y / PX) * 577)() * 3 | 0) * PX;
      g.fillStyle = wallCol(y, 11); g.fillRect(0, sy, LX - jitL, PX);
      g.fillStyle = wallCol(y, 29); g.fillRect(RX + jitR, sy, W - RX - jitR, PX);
      g.fillStyle = '#000000';
      g.fillRect(LX - jitL - PX, sy, PX, PX); g.fillRect(RX + jitR, sy, PX, PX);
    }
    // the notches: one cut per cubit, a deep one every five, and a candle in
    // the niche beside every fifth. This is the only score there is.
    const n0 = Math.max(0, notches(cam + H / 2) - 2), n1 = notches(cam - H / 2) + 2;
    for (let n = n0; n <= n1; n++) {
      if (n === 0) continue;
      const sy = Math.round(-n * CUBIT + off);
      const five = n % 5 === 0;
      const reached = n <= S.best;
      const col = reached ? (five ? '#f2c936' : '#a9750d') : (five ? '#4a3a2a' : '#2e2420');
      g.fillStyle = col;
      g.fillRect(LX - (five ? 21 : 12), sy, five ? 21 : 12, PX);
      g.fillRect(RX, sy, five ? 21 : 12, PX);
      if (five) {
        candle(g, LX - 27, sy, reached, n);
        candle(g, RX + 24, sy, reached, n + 7);
      }
    }
    // the eyes in the rock
    for (const e of S.eyes) {
      if (e.open < 0.04) continue;
      const sy = Math.round(e.y + off);
      if (sy < -20 || sy > H + 20) continue;
      const hgt = Math.max(PX, Math.round(e.open * e.sz * 5 / PX) * PX);
      g.fillStyle = '#000000'; g.fillRect(Math.round(e.x) - PX, sy - PX, e.sz * 4 + PX * 2, hgt + PX * 2);
      g.fillStyle = `rgba(226,60,40,${(0.45 + e.open * 0.5).toFixed(2)})`;
      g.fillRect(Math.round(e.x), sy, e.sz * 4, hgt);
      g.fillStyle = '#ffd0b0';
      g.fillRect(Math.round(e.x) + PX, sy + Math.max(0, hgt - PX * 2), PX, Math.min(PX, hgt));
    }
    // the altar at the bottom
    altar(g, off);
    // the tower
    for (const b of S.bodies) drawBlock(g, b, off);
    // the chain down the left with what you have left hung on it
    chain(g, off);
    // what is in your hand, and the shaft of light it will fall down
    if (S.hand) {
      const hx = Math.round(S.hand.x), hy = Math.round(S.camY - HAND_UP + S.hand.wob + off);
      const def = OFFERINGS[S.hand.key];
      for (let y = hy + 16; y < H; y += 12) {
        g.fillStyle = 'rgba(242,201,54,0.13)';
        g.fillRect(hx - PX, y, PX * 2, PX * 2);
      }
      g.save();
      g.translate(hx, hy); g.rotate(S.hand.angle);
      Sprites.drawCube(g, def, def.w * 21, def.h * 21, { outline: '#f2c936' });
      g.restore();
    }
    // The dark closes in the higher you are. Not a soft oval: bands of black
    // stepped in from each edge, so even the darkness is made of pixels.
    const v = 0.3 + S.dread * 0.45 + Math.sin(S.heart * TAU) * 0.04;
    const bands = 9, step = 9;
    for (let i = 0; i < bands; i++) {
      const a2 = (v * (i + 1)) / bands;
      g.fillStyle = `rgba(0,0,0,${Math.min(1, a2 * 0.5).toFixed(3)})`;
      const d = (bands - i) * step;
      g.fillRect(0, 0, W, d - step);            // top
      g.fillRect(0, H - d + step, W, d - step); // bottom
      g.fillRect(0, 0, d - step, H);            // left
      g.fillRect(W - d + step, 0, d - step, H); // right
    }
    if (S.grantT > 0) {
      const k = 1 - S.grantT / 1.5;
      g.fillStyle = `rgba(0,0,0,${(k * 0.85).toFixed(2)})`;
      g.fillRect(0, 0, W, H);
      maw(g, W / 2, 40 - (1 - k) * 30, k);
    }
    if (!bagCount() && !S.bodies.length) {
      // nothing to build with and nothing built: the one line the wall says
      carve(g, 'BRING WHAT SHE LEAVES', W / 2, H / 2 + 40);
    }
  }
  // a block of the tower
  function drawBlock(g, b, off) {
    const d = b.userData || {};
    const def = d.def || OFFERINGS.plain;
    const sy = Math.round(b.y + off);
    if (sy < -60 || sy > H + 60) return;
    g.save();
    g.translate(Math.round(b.x), sy);
    g.rotate(b.angle);
    Sprites.drawCube(g, def, b.width, b.height, { blessed: d.blessed, outline: '#000000' });
    g.restore();
  }
  // the altar: a slab of black stone with a gutter round it
  function altar(g, off) {
    const y = Math.round(off);
    if (y > H + 70 || y < -90) return;
    g.fillStyle = '#000000'; g.fillRect(LX - 12, y - 3, SHAFT + 24, 60);
    g.fillStyle = '#241722'; g.fillRect(LX - 9, y, SHAFT + 18, 54);
    g.fillStyle = '#3a2634'; g.fillRect(LX - 9, y, SHAFT + 18, PX * 2);
    g.fillStyle = '#150c14'; g.fillRect(LX - 9, y + 48, SHAFT + 18, 6);
    for (let x = LX; x < RX; x += 24) { g.fillStyle = '#1a101a'; g.fillRect(x, y + PX * 2, PX, 46); }
    // the gutter, and what has run down it
    g.fillStyle = '#4a0d14'; g.fillRect(LX - 6, y + PX * 2, SHAFT + 12, PX);
    for (let i = 0; i < 7; i++) {
      const x = LX + 14 + i * 38;
      g.fillStyle = 'rgba(122,16,26,0.7)'; g.fillRect(x, y + PX * 3, PX, 8 + (i % 3) * 7);
    }
    // the relics you have already been given, stood along the back of it
    const got = GODS.filter((gd) => G.summoned[gd.key]);
    got.slice(0, 8).forEach((gd, i) => {
      const x = Math.round(LX + 16 + i * 30);
      g.fillStyle = '#000000'; g.fillRect(x - PX, y - 15, 18 + PX * 2, 18);
      g.fillStyle = gd.color; g.fillRect(x, y - 12, 14, 14);
      g.fillStyle = U.shade(gd.color, 0.4); g.fillRect(x, y - 12, 14, PX);
      g.fillStyle = gd.eye; g.fillRect(x + 5, y - 7, PX, PX);
    });
  }
  // a tallow candle in a niche. Lit if you have been past it.
  function candle(g, x, y, lit, seed) {
    x = Math.round(x); y = Math.round(y);
    g.fillStyle = '#000000'; g.fillRect(x - PX, y - 20, 9 + PX * 2, 23);
    g.fillStyle = lit ? '#e8dcc0' : '#4a4238'; g.fillRect(x, y - 17, 9, 17);
    g.fillStyle = lit ? '#fff4d8' : '#5a5246'; g.fillRect(x, y - 17, PX, 17);
    if (!lit) return;
    const f = Math.sin(S.t * 9 + seed * 1.7);
    const fy = y - 20 - (f > 0 ? PX : 0);
    g.fillStyle = '#7a2a08'; g.fillRect(x + PX, fy - PX, PX, PX * 2);
    g.fillStyle = '#f2a01c'; g.fillRect(x + PX, fy, PX, PX);
    g.fillStyle = '#ffe98a'; g.fillRect(x + PX, fy + PX, PX, PX);
  }
  // the chain of what you have left, hanging down the wall beside you
  function chain(g, off) {
    const b = bag();
    const x = LX + 7;
    for (let i = 0; i < Math.min(14, b.length); i++) {
      const y = Math.round(S.camY - HAND_UP + 26 + i * 22 + off);
      if (y < -20 || y > H + 20) continue;
      g.fillStyle = '#000000'; g.fillRect(x - 2, y - 10, 4, 10);
      g.fillStyle = i % 2 ? '#5a4d38' : '#8a7752'; g.fillRect(x - 1, y - 9, 2, 8);
      const def = OFFERINGS[b[i]];
      g.save(); g.translate(x, y + 5);
      Sprites.drawCube(g, def, 13, 11, { outline: '#000000' });
      g.restore();
    }
  }
  // the thing that opens when a god leans down
  function maw(g, cx, cy, k) {
    const w = Math.round(80 + k * 190), h = Math.round(20 + k * 90);
    g.fillStyle = '#12000a'; g.fillRect(cx - w / 2, cy, w, h);
    g.fillStyle = '#000000'; g.fillRect(cx - w / 2 + PX, cy + PX, w - PX * 2, h - PX * 2);
    const teeth = Math.round(w / 18);
    for (let i = 0; i < teeth; i++) {
      const tx = Math.round(cx - w / 2 + 6 + i * 18), th = 9 + (i % 3) * 6;
      g.fillStyle = '#e8dcc0'; g.fillRect(tx, cy + PX, 9, th);
      g.fillRect(tx, cy + h - PX - th, 9, th);
      g.fillStyle = '#000000'; g.fillRect(tx + 9, cy + PX, PX, th);
    }
    for (let i = 0; i < 4; i++) {
      const ex = cx - 60 + i * 40;
      g.fillStyle = `rgba(226,60,40,${(k * 0.9).toFixed(2)})`;
      g.fillRect(ex, cy - 22, 10, 6);
    }
  }
  // the mark scratched on the back wall
  function sigil(g, cx, cy, a) {
    const R = 74;
    g.save();
    g.globalAlpha = U.clamp(a, 0, 1);
    const pts = [];
    for (let i = 0; i < 5; i++) { const t = -Math.PI / 2 + (i * 4 * Math.PI) / 5; pts.push([cx + Math.cos(t) * R, cy + Math.sin(t) * R]); }
    g.fillStyle = '#c42a1e';
    for (let i = 0; i < 5; i++) {
      const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % 5];
      const n = Math.round(Math.hypot(x1 - x0, y1 - y0) / PX);
      for (let j = 0; j <= n; j++) g.fillRect(Math.round(U.lerp(x0, x1, j / n) / PX) * PX, Math.round(U.lerp(y0, y1, j / n) / PX) * PX, PX, PX);
    }
    for (let i = 0; i < 44; i++) {
      const t = (i / 44) * TAU;
      g.fillRect(Math.round((cx + Math.cos(t) * R) / PX) * PX, Math.round((cy + Math.sin(t) * R) / PX) * PX, PX, PX);
    }
    g.restore();
  }
  // words cut into the rock, which is the only writing in this scene
  function carve(g, text, cx, cy) {
    Font.draw(g, text, cx, cy + 1, { scale: 1, color: '#000000', align: 'center' });
    Font.draw(g, text, cx, cy, { scale: 1, color: '#6b4a3a', align: 'center' });
  }

  // ---- input ---------------------------------------------------------------
  function move(x) { if (S.hand) S.hand.x = U.clamp(x, LX + 14, RX - 14); }
  function press(x, y, right) {
    if (!S.hand) return;
    if (right) { S.hand.angle += Math.PI / 2; Audio.play('click'); return; }
    S.hand.x = U.clamp(x, LX + 14, RX - 14);
    drop();
  }
  function wheel(dir) { cycle(dir > 0 ? 1 : -1); }
  function keyDown(k) {
    if (!S.entered) return false;
    if (k === 'ArrowLeft' || k === 'a' || k === 'A') { move((S.hand ? S.hand.x : W / 2) - 12); return true; }
    if (k === 'ArrowRight' || k === 'd' || k === 'D') { move((S.hand ? S.hand.x : W / 2) + 12); return true; }
    if (k === 'ArrowUp' || k === 'w' || k === 'W') { if (S.hand) { S.hand.angle += Math.PI / 2; Audio.play('click'); } return true; }
    if (k === 'ArrowDown' || k === 's' || k === 'S' || k === ' ') { drop(); return true; }
    if (k === 'q' || k === 'Q') { cycle(-1); return true; }
    if (k === 'e' || k === 'E') { cycle(1); return true; }
    return false;
  }

  // the old staging API is gone, but the guide and the atlas still ask these
  function staged() { return {}; }
  function need(god) { return god.ritual; }
  function meets() { return false; }
  function available() { return GODS.filter((g2) => !G.summoned[g2.key]); }
  function held(type) { return (G.offerings[type] || 0) + (G.blessed[type] || 0); }
  function readyGod() { return null; }
  function stage() { }
  function unstage() { }
  function clearStage() { }

  function renderScene(g) {
    const god = scene.god, beat = scene.beat, p = scene.beatT;
    const dark = beat === 'dark' ? p : 1;
    // sky torn open above the grove
    for (let i = 0; i < 9; i++) {
      const a = i / 8;
      g.fillStyle = U.mix(U.mix('#0d0a14', '#1b1030', dark), U.mix('#241d2a', god.color, 0.16 * dark), a);
      g.fillRect(0, Math.round((H * i) / 9), W, Math.ceil(H / 9) + 1);
    }
    // silhouetted forest
    g.fillStyle = '#0b0810';
    for (let i = 0; i < 7; i++) { const img = Props.get('tree', `${['gnarl', 'dead', 'pine'][i % 3]}|${i % 3}|0.62`); g.globalAlpha = 0.85; g.drawImage(img, i * 100 - 26, 26, img.width * 1.3, img.height * 1.3); }
    g.globalAlpha = 1;
    g.fillStyle = '#141019'; g.fillRect(0, 262, W, H - 262);
    // rune circle brightening through the rite
    const heat = beat === 'dark' ? p * 0.3 : beat === 'roots' ? 0.3 + p * 0.3 : beat === 'charge' ? 0.6 + p * 0.4 : 1;
    g.save();
    for (const r of [110, 84, 58]) Art.ring(g, CX, BASE + 8, r, r * 0.34, U.rgba(god.color, 0.35 * heat), 3);
    g.translate(CX, BASE + 8); g.scale(1, 0.34); g.rotate(scene.rune);
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * TAU;
      g.fillStyle = U.rgba(PAL.div5, 0.6 * heat);
      g.fillRect(Math.cos(a) * 98 - 4, Math.sin(a) * 98 - 4, 8, 8);
    }
    g.restore();
    // ground glow
    Art.glow(g, CX, BASE, 190, god.color, 0.4 * heat, 6);

    // shrine
    const img = Props.get('shrine', G.up.shrine || 0);
    const s = 1.7;
    g.drawImage(img, Math.round(CX - (img.width * s) / 2), Math.round(BASE - img.height * s + 10), img.width * s, img.height * s);

    // the god rises out of the light
    if (beat === 'reveal' || beat === 'bless' || beat === 'out') {
      const rise = beat === 'reveal' ? U.easeOut(Math.min(1, p * 1.5)) : 1;
      const gi = Sprites.godForm(god, Math.floor(G.time * 3));
      const gs = 2.6;
      const gw = gi.width * gs, gh = gi.height * gs;
      const gy = U.lerp(BASE + 50, BASE - 74, rise);
      // aura
      Art.glow(g, CX, gy - gh / 2, 150, god.color, 0.45, 6);
      // shafts
      g.save();
      g.globalAlpha = 0.22 + 0.1 * Math.sin(G.time * 3);
      g.fillStyle = U.rgba(god.color, 1);
      for (let i = 0; i < 9; i++) {
        g.save(); g.translate(CX, gy - gh * 0.55); g.rotate(G.time * 0.2 + (i / 9) * TAU);
        g.beginPath(); g.moveTo(0, 0); g.lineTo(-9, -300); g.lineTo(9, -300); g.closePath(); g.fill();
        g.restore();
      }
      g.restore();
      g.save();
      g.globalAlpha = rise;
      g.drawImage(gi, Math.round(CX - gw / 2), Math.round(gy - gh), gw, gh);
      g.restore();
      if (beat === 'bless') {
        const ap = U.easeOut(Math.min(1, p * 2));
        const ay = U.lerp(gy - gh * 0.5, BASE - 30, ap);
        const glow = 0.5 + 0.5 * Math.sin(G.time * 6);
        Art.glow(g, CX, ay, 34, PAL.gold4, 0.6 * glow, 4);
        Icons.blit(g, god.artIcon, CX - 16, ay - 16, 2);
      }
    }
    // motes drawn in world order
    for (const m of scene.motes) {
      g.globalAlpha = U.clamp(m.life, 0, 1);
      g.fillStyle = m.col;
      g.fillRect(Math.round(m.x), Math.round(m.y), 2, 2);
    }
    g.globalAlpha = 1;
    FX.drawParticles(g, 0);
    FX.drawFloaters(g, false);
    FX.drawComics(g, false);
    // rain of light during the strike
    if (beat === 'strike') {
      for (let i = 0; i < 30; i++) {
        const x = (i * 97 + G.time * 900) % W;
        Art.line(g, x, 0, x - 6, H, U.rgba(PAL.cream, 0.35), 1);
      }
    }
  }

  return {
    init(g) { G = g; G.staged = {}; },
    enter, leave, update, renderShrine: renderClimb, renderScene, skip,
    summon() { }, stage, unstage, clearStage, move, press, wheel, keyDown,
    staged, readyGod, meets, need, available, held, climbOf, nextGod,
    get height() { return S.best; },
    get active() { return scene.on; },
    get god() { return scene.god; },
  };
})();
