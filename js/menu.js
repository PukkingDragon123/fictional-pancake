// ---- The title screen -----------------------------------------------------
// The same wood the game is set in, at night: the grove's own tree art, mossed
// stone wombats, one lantern, and a wombat in the middle distance quietly
// leaving you a cube. Two doors out of here — ENTER and SETTINGS.
const Menu = (() => {
  const VW = 640, VH = 360;
  const HORIZON = 168;                  // where the canopy meets the floor

  let G = null;                         // the settings bag, not a save
  let t = 0, page = 'home', hover = null, confirm = null;
  let buttons = [];
  let onAct = null;
  let hasSave = false;

  const MIST = 'rgba(146,172,146,';

  // ---- the wood ------------------------------------------------------------
  // Five ranks of the grove's own trees, darkened further the deeper they sit.
  const R = Art.rng(90210);
  const RANKS = [
    { n: 7, y: 156, s: 1.0, sh: 0.44 },
    { n: 6, y: 180, s: 1.3, sh: 0.56 },
    { n: 5, y: 210, s: 1.7, sh: 0.7 },
    { n: 4, y: 252, s: 2.2, sh: 0.84 },
    { n: 3, y: 344, s: 3.2, sh: 0.93 },
  ];
  const KINDS = ['gnarl', 'oak', 'pine', 'birch', 'gnarl'];
  const wood = [];
  RANKS.forEach((rk, d) => {
    for (let i = 0; i < rk.n; i++) {
      wood.push({
        d, x: (i + 0.5) * (VW / rk.n) + (R() - 0.5) * (VW / rk.n) * 0.7,
        y: rk.y + (R() - 0.5) * 10, s: rk.s * (0.82 + R() * 0.34), sh: rk.sh,
        kind: KINDS[Math.floor(R() * KINDS.length)], v: Math.floor(R() * 6),
        sway: R() * TAU,
      });
    }
  });
  // The undergrowth is the same stuff you have to clear in the grove.
  const scrub = [];
  for (let i = 0; i < 30; i++) {
    scrub.push({ x: R() * VW, y: 250 + R() * 106, s: 0.5 + R() * 0.9, v: Math.floor(R() * 6), ph: R() * TAU });
  }
  const motes = [];
  for (let i = 0; i < 44; i++) motes.push({ x: R() * VW, y: 110 + R() * 250, ph: R() * TAU, sp: 0.2 + R() * 0.5 });
  const eyes = [];
  for (let i = 0; i < 10; i++) eyes.push({ x: 24 + R() * (VW - 48), y: 150 + R() * 92, ph: R() * TAU, on: 0 });

  // ---- the wombat who is doing something about it -------------------------
  // A loop: trots in, squats, strains, drops a cube, trots off. The cube stays
  // where it fell until the next lap, so the clearing slowly fills up.
  const cubes = [];
  const wb = { x: 260, y: 340, dir: 1, state: 'walk', tx: 340, st: 0, anim: 0 };
  function wombatLoop(dt) {
    wb.anim += dt * 9;
    wb.st += dt;
    if (wb.state === 'walk') {
      const dx = wb.tx - wb.x;
      wb.dir = dx < 0 ? -1 : 1;
      wb.x += Math.sign(dx) * 24 * dt;
      if (Math.abs(dx) < 4) { wb.state = 'squat'; wb.st = 0; }
    } else if (wb.state === 'squat' && wb.st > 1.1) { wb.state = 'strain'; wb.st = 0; }
    else if (wb.state === 'strain' && wb.st > 1.3) {
      wb.state = 'drop'; wb.st = 0;
      cubes.push({ x: wb.x - wb.dir * 13, y: wb.y, z: 6, vz: -26, t: 0, sq: 0.5 });
      if (cubes.length > 5) cubes.shift();
    } else if (wb.state === 'drop' && wb.st > 0.7) {
      wb.state = 'walk'; wb.st = 0;
      wb.tx = 210 + R() * 190; wb.y = 330 + R() * 18;
    }
    for (const c of cubes) {
      c.t += dt;
      if (c.z > 0 || c.vz < 0) { c.vz += 180 * dt; c.z += c.vz * dt; if (c.z >= 0) { c.z = 0; c.vz = 0; c.sq = 0.4; } }
      c.sq = Math.max(0, c.sq - dt * 2.4);
    }
  }
  function drawWombat(g) {
    const pose = wb.state === 'walk' ? 'walk' : wb.state === 'drop' ? 'happy' : 'sit';
    const f = Math.floor(wb.anim);
    const s = 1.5;
    // a little effort while it works
    const push = wb.state === 'strain' ? Math.sin(t * 22) * 0.9 : 0;
    Sprites.shadow(g, wb.x, wb.y, pose, f, 'brown', wb.dir, 'adult', s);
    g.save();
    g.translate(push, 0);
    Sprites.blit(g, wb.x, wb.y, pose, f, 'brown', wb.dir, 'adult', s);
    g.restore();
    if (wb.state === 'strain') {
      const a = 0.4 + 0.4 * Math.sin(t * 14);
      Font.draw(g, '!', wb.x - wb.dir * 16, wb.y - 30, { scale: 1, color: `rgba(255,214,150,${a.toFixed(2)})`, align: 'center' });
      Font.draw(g, '!', wb.x - wb.dir * 21, wb.y - 26, { scale: 1, color: `rgba(255,214,150,${(a * 0.6).toFixed(2)})`, align: 'center' });
    }
    for (const c of cubes) {
      const sq = c.sq;
      g.save();
      g.translate(c.x, c.y + c.z);
      g.fillStyle = 'rgba(0,0,0,0.4)'; Art.ell(g, 0, 1, 8, 3);
      g.scale(1 + sq * 0.5, 1 - sq * 0.45);
      Sprites.drawCube(g, OFFERINGS.plain, 16, 16, { face: 'happy' });
      g.restore();
      if (c.t < 0.4) {                                    // a puff where it landed
        const a = 1 - c.t / 0.4;
        g.fillStyle = `rgba(150,130,100,${(a * 0.5).toFixed(2)})`;
        Art.ell(g, c.x - 9, c.y + 1, 7 * (1 + c.t * 3), 3, g.fillStyle);
        Art.ell(g, c.x + 9, c.y + 1, 6 * (1 + c.t * 3), 3, g.fillStyle);
      }
    }
  }

  function init(settings, saved, act) { G = settings; hasSave = !!saved; onAct = act; }
  function setSave(v) { hasSave = !!v; }
  function enter() { t = 0; page = 'home'; confirm = null; hover = null; Audio.setMode('menu'); }

  // The name of the game, cut into a stone lintel the god is holding up. The
  // letters are chiselled: a dark inset with a lit lower lip, the way carved
  // stone reads. Nothing else on this screen is text.
  function lintel(g) {
    const y = GOD.y - 82 * GOD.s;                       // held right up over its head
    const x0 = 14, x1 = VW - 14, h = 50;
    const S0 = '#090b0f', S1 = '#232932', S2 = '#323945', S3 = '#454d59', S4 = '#5a6270';
    const flick = redT > 0 ? U.clamp(redT / 0.6, 0, 1) * (0.62 + 0.38 * Math.sin(t * 26)) : 0;
    const top = y - h;
    // the slab, with a moulded lip top and bottom
    Art.poly(g, [[x0 - 8, top - 8], [x1 + 8, top - 8], [x1 + 4, top], [x0 - 4, top]], S0);
    Art.poly(g, [[x0 - 7, top - 7], [x1 + 7, top - 7], [x1 + 3.5, top - 1], [x0 - 3.5, top - 1]], S2);
    Art.rect(g, x0 - 7, top - 7, x1 - x0 + 14, 2, S3);
    Art.rect(g, x0 - 4, top, x1 - x0 + 8, h, S0);
    Art.rect(g, x0 - 2, top + 2, x1 - x0 + 4, h - 4, S1);
    Art.rect(g, x0 - 2, top + 2, x1 - x0 + 4, 3, S2);
    Art.rect(g, x0 - 2, top + h - 7, x1 - x0 + 4, 3, S0);
    Art.poly(g, [[x0 - 8, y + 8], [x1 + 8, y + 8], [x1 + 4, y], [x0 - 4, y]], S0);
    Art.poly(g, [[x0 - 7, y + 7], [x1 + 7, y + 7], [x1 + 3.5, y + 1], [x0 - 3.5, y + 1]], S1);
    Art.rect(g, x0 - 7, y + 1, x1 - x0 + 14, 2, S3);
    // weathering: a long crack and some chips before the letters go on
    Art.limb(g, x0 + 58, top + 4, x0 + 74, y - 6, 1.6, 0.6, S0);
    Art.rect(g, x1 - 90, top + 8, 2, 12, S0);
    g.globalAlpha = 0.4;
    Art.speckle(g, (x0 + x1) / 2, top + h / 2, (x1 - x0) / 2, h / 2 - 3, '#3f5a34', 0.05, 7);
    g.globalAlpha = 1;
    // the letters, chiselled in
    const cx = (x0 + x1) / 2, ty = top + 13;
    Font.draw(g, 'WOMBAT GODS', cx, ty + 3, { scale: 4, align: 'center', color: '#05070a' });   // the depth of the cut
    Font.draw(g, 'WOMBAT GODS', cx + 1, ty + 4, { scale: 4, align: 'center', color: S4 });      // the lit lower lip
    Font.draw(g, 'WOMBAT GODS', cx, ty + 1, { scale: 4, align: 'center', color: '#cdb98d' });   // lamplight in the groove
    Font.draw(g, 'WOMBAT GODS', cx, ty, { scale: 4, align: 'center', color: '#f0dcab' });
    // a bar of lamplight travelling along the cut letters
    const tw = Font.width('WOMBAT GODS', 4);
    const sweep = ((t * 90) % (tw + 340)) - 170;
    g.save();
    g.beginPath(); g.rect(cx - tw / 2 + sweep - 26, ty - 4, 52, 34); g.clip();
    Font.draw(g, 'WOMBAT GODS', cx, ty, { scale: 4, align: 'center', color: '#fff6d8' });
    Font.draw(g, 'WOMBAT GODS', cx, ty - 1, { scale: 4, align: 'center', color: '#ffffff' });
    g.restore();
    // when the eyes take, the cut glows with them
    if (flick > 0.02) {
      g.globalAlpha = flick * 0.75;
      Font.draw(g, 'WOMBAT GODS', cx, ty + 1.5, { scale: 4, align: 'center', color: '#ff3a26' });
      g.globalAlpha = 1;
    }
    // two iron rings the god's fists are hooked through
    for (const fx of [GOD.x - 26 * GOD.s, GOD.x + 26 * GOD.s]) {
      Art.ellBand(g, fx, y + 6, 9, 11, '#14171d', 0, 1);
      Art.ellBand(g, fx, y + 6, 7.6, 9.4, '#404854', 0.06, 0.44);
    }
  }

  // ---- WOMBATHENA, of the Bolt -------------------------------------------
  // A colossus of a wombat carved mid-flex: chest out, both arms up, stone
  // muscle everywhere. Every so often the carved eyes catch something and go
  // red, which is the only part of it that ever moves.
  const GOD = { x: 198, y: 338, s: 2.6 };
  let redT = 0, redNext = 2.5;
  function godStatue(g) {
    const { x, y, s } = GOD;
    const S0 = '#090b0f', S1 = '#1d2229', S2 = '#2a303a', S3 = '#3a414c', S4 = '#4e5661';
    const flick = redT > 0 ? U.clamp(redT / 0.6, 0, 1) * (0.62 + 0.38 * Math.sin(t * 26)) : 0;
    g.save();
    g.translate(x, y); g.scale(s, s);
    // plinth, carved with a row of cubes
    Art.poly(g, [[-30, 0], [30, 0], [25, -13], [-25, -13]], S0);
    Art.poly(g, [[-28, -1], [28, -1], [23.5, -12], [-23.5, -12]], S1);
    Art.rect(g, -23.5, -12, 47, 2, S2);
    for (let i = -4; i <= 4; i++) { Art.rect(g, i * 5 - 1.6, -10, 3.2, 3.2, S0); Art.rect(g, i * 5 - 1.6, -10, 3.2, 1, S2); }
    Art.rect(g, -23.5, -12, 47, 1, S3);
    // legs: short, planted wide, thick as columns
    for (const lx of [-13, 9]) {
      Art.poly(g, [[lx - 5, -12], [lx + 5, -12], [lx + 6, -26], [lx - 6, -26]], S0);
      Art.poly(g, [[lx - 4, -12.5], [lx + 4, -12.5], [lx + 5, -25], [lx - 5, -25]], S1);
      Art.rect(g, lx - 4, -25, 2, 12, S2);
      Art.ell(g, lx, -21, 4.4, 3.4, S2);                     // the calf
    }
    // a torso that tapers hard to the waist: the classic pose
    Art.poly(g, [[-9, -24], [9, -24], [17, -46], [-17, -46]], S0);
    Art.poly(g, [[-8, -24.5], [8, -24.5], [15.5, -45], [-15.5, -45]], S1);
    Art.poly(g, [[-15.5, -45], [-4, -45], [-6, -25], [-8, -25]], S2);   // lit flank
    // pectorals and a carved six-pack
    Art.ell(g, -6.5, -40, 6.4, 4.4, S2); Art.ell(g, 6.5, -40, 6.4, 4.4, S1);
    Art.ell(g, -7.5, -41.5, 4, 2.4, S3);
    Art.rect(g, -0.6, -45, 1.2, 20, S0);
    for (let r2 = 0; r2 < 3; r2++) {
      Art.rect(g, -6, -33 + r2 * 3.4, 12, 0.9, S0);
      Art.ell(g, -3.4, -34.4 + r2 * 3.4, 2.4, 1.2, S2);
      Art.ell(g, 3.4, -34.4 + r2 * 3.4, 2.4, 1.2, S1);
    }
    // arms up, fists clenched: both biceps balled
    for (const sd of [-1, 1]) {
      const sx = sd * 15, sy = -44;
      Art.limb(g, sx, sy, sx + sd * 9, sy - 16, 10, 8.4, S0);          // upper arm, driving up
      Art.limb(g, sx, sy - 0.6, sx + sd * 8.6, sy - 16, 8.4, 7, sd < 0 ? S2 : S1);
      Art.ell(g, sx + sd * 4.4, sy - 8, 7, 6, sd < 0 ? S3 : S2);       // the bicep, balled
      Art.ell(g, sx + sd * 3.4, sy - 10, 3.4, 2.6, sd < 0 ? S4 : S3);
      Art.limb(g, sx + sd * 9, sy - 16, sx + sd * 11, sy - 34, 8.4, 7, S0);      // forearm, straight up
      Art.limb(g, sx + sd * 8.6, sy - 16.4, sx + sd * 10.6, sy - 33.6, 7, 5.8, sd < 0 ? S2 : S1);
      Art.ell(g, sx + sd * 11, sy - 36, 6.4, 5.8, S0);                 // the fist
      Art.ell(g, sx + sd * 11, sy - 36.4, 5.6, 5, sd < 0 ? S3 : S2);
      for (let k = 0; k < 3; k++) Art.rect(g, sx + sd * 11 - 3.8 + k * 2.8, sy - 40, 1.8, 3, S0);
    }
    g.restore();
    lintel(g);
    g.save();
    g.translate(x, y); g.scale(s, s);
    // the head: a wombat's, but snarling, horned, and badly used
    Art.ell(g, 0, -52, 11.5, 10, S0);
    Art.ell(g, 0, -52.6, 10.4, 9, S1);
    Art.ell(g, -3.6, -56.4, 5.2, 4, S2);
    Art.ell(g, -5.2, -58, 2.2, 1.6, S3);
    // ears, torn: one has a bite out of it
    Art.poly(g, [[-11, -57], [-6, -61.5], [-4.5, -55]], S0);
    Art.poly(g, [[-10, -57], [-6.4, -60.4], [-5.4, -55.6]], S2);
    Art.poly(g, [[11, -56.6], [6.4, -61], [4.8, -54.8]], S0);
    Art.poly(g, [[10.2, -56.8], [7, -59.8], [5.8, -55.4]], S1);
    Art.poly(g, [[8.2, -59], [10.2, -58], [9.2, -56.4]], '#07080b');            // the bite
    // two short horns growing out of the brow
    for (const hs of [-1, 1]) {
      Art.poly(g, [[hs * 6.4, -58], [hs * 9.6, -66], [hs * 10.8, -64.4], [hs * 8.4, -56.6]], S0);
      Art.poly(g, [[hs * 6.8, -58], [hs * 9.4, -64.8], [hs * 10.2, -64], [hs * 8.2, -57]], hs < 0 ? S3 : S2);
    }
    // a heavy overhanging brow, which is most of the menace
    Art.poly(g, [[-10, -55.4], [10, -55.4], [9, -51.4], [-9, -51.4]], S0);
    Art.poly(g, [[-9.4, -55], [9.4, -55], [8.4, -52.6], [-8.4, -52.6]], S2);
    Art.poly(g, [[-9.4, -55], [-1, -55], [-1, -52.6], [-8.4, -52.6]], S3);
    // the snout, drawn back off the teeth
    Art.ell(g, 0, -45.5, 6, 4.4, S0); Art.ell(g, 0, -46.2, 5.2, 3.8, S2);
    Art.ell(g, -1.6, -47.4, 2.4, 1.6, S3);
    Art.rect(g, -1.6, -47.6, 3.2, 1.8, '#07080b');                              // nostrils
    Art.rect(g, -4.4, -44.6, 8.8, 1.2, '#07080b');                              // a hard flat mouth
    Art.rect(g, -4.4, -45.6, 1.6, 1, '#07080b');
    Art.rect(g, 2.8, -45.6, 1.6, 1, '#07080b');
    // scars, a chipped horn and an old crack across the cheek
    Art.limb(g, -8.4, -50, -4.6, -44.6, 1.1, 0.6, '#07080b');
    Art.limb(g, -8, -49.6, -4.4, -44.4, 0.6, 0.4, S3);
    Art.rect(g, 6, -53, 3.4, 0.9, '#07080b');
    // eyes: hollow, until they are not
    const eyeCol = flick > 0.02 ? U.mix('#3a0a06', '#ff2a1e', flick) : '#07080b';
    for (const es of [-1, 1]) {
      Art.poly(g, [[es * 1.8, -52.4], [es * 6, -51.6], [es * 5.4, -48.6], [es * 2, -49.4]], '#07080b');
      Art.poly(g, [[es * 2.2, -52], [es * 5.6, -51.4], [es * 5.1, -49], [es * 2.4, -49.6]], eyeCol);
      if (flick > 0.3) Art.poly(g, [[es * 3, -51.4], [es * 4.6, -51.1], [es * 4.4, -50], [es * 3.1, -50.3]], '#ffd0c4');
    }
    if (flick > 0.02) {
      g.globalAlpha = flick * 0.5;
      Art.ell(g, -3.6, -51.4, 4.4, 4.4, '#ff2a1e');
      Art.ell(g, 3.6, -51, 4.2, 4.2, '#ff2a1e');
      g.globalAlpha = 1;
    }
    // weather: cracks, chips, moss up the legs
    Art.rect(g, -12, -40, 0.9, 9, S0);
    Art.rect(g, 6, -30, 5, 0.9, S0);
    g.globalAlpha = 0.5;
    Art.speckle(g, 0, -16, 20, 7, '#3f5a34', 0.3, 3);
    Art.speckle(g, 0, -4, 26, 6, '#2f4a2a', 0.34, 5);
    g.globalAlpha = 1;
    g.restore();
    // the light it throws when the eyes take
    if (flick > 0.02) {
      Art.glow(g, x, y - 128, 54 * flick, '#ff3224', 0.3 * flick, 4);
    }
    // the name, cut into the plinth
  }

  // ---- the scene -----------------------------------------------------------
  const LX = 128, LY = 78;                              // the lantern
  function scene(g) {
    const flick = 0.82 + 0.18 * Math.sin(t * 9) + 0.06 * Math.sin(t * 23);
    Art.vramp(g, 0, 0, VW, HORIZON, [[0, '#04060a'], [0.6, '#080e14'], [1, '#10181a']], 9);
    for (let i = 0; i < 30; i++) {
      const sx = (i * 173) % VW, sy = (i * 61) % 96;
      g.fillStyle = `rgba(180,206,232,${(0.1 + 0.18 * Math.abs(Math.sin(t * 0.7 + i))).toFixed(2)})`;
      g.fillRect(sx, sy, 1, 1);
    }
    Art.vramp(g, 0, HORIZON - 8, VW, VH - HORIZON + 8, [[0, '#172016'], [0.5, '#101810'], [1, '#070b08']], 8);

    // the wood, back to front, using the grove's own trees
    for (let d = 0; d < RANKS.length; d++) {
      for (const tr of wood) {
        if (tr.d !== d) continue;
        const img = Props.get('tree', `${tr.kind}|${tr.v}|${tr.sh.toFixed(2)}`);
        const w = img.width * tr.s, h = img.height * tr.s;
        const sway = Math.sin(t * 0.4 + tr.sway) * (1.4 - d * 0.2);
        g.drawImage(img, Math.round(tr.x - w / 2 + sway), Math.round(tr.y - h), Math.round(w), Math.round(h));
      }
      if (d === 1) {
        for (const e of eyes) {
          e.on = Math.sin(t * 0.7 + e.ph) > 0.955 ? 1 : e.on * 0.9;
          if (e.on < 0.05) continue;
          g.fillStyle = `rgba(240,196,120,${(e.on * 0.9).toFixed(2)})`;
          g.fillRect(e.x, e.y, 2, 2); g.fillRect(e.x + 5, e.y, 2, 2);
        }
      }

    }
    // the same scrub you spend the game cutting, growing over everything
    for (const b2 of scrub.slice().sort((p, q) => p.y - q.y)) {
      const img = Props.get('weed', b2.v);
      const w = img.width * b2.s, h = img.height * b2.s;
      const sw = Math.sin(t * 0.8 + b2.ph) * 1.2;
      g.save();
      g.globalAlpha = 0.9;
      g.drawImage(img, Math.round(b2.x - w / 2 + sw), Math.round(b2.y - h), Math.round(w), Math.round(h));
      g.restore();
      g.fillStyle = 'rgba(6,10,8,0.5)';                  // press it back into the dark
      g.fillRect(Math.round(b2.x - w / 2 + sw), Math.round(b2.y - h), Math.round(w), Math.round(h));
    }
    // moss hanging out of the canopy, moving just enough to be noticed
    for (let i = 0; i < 9; i++) {
      const hx = 30 + ((i * 137) % (VW - 60));
      const hl = 30 + ((i * 53) % 70);
      const sw2 = Math.sin(t * 0.6 + i) * 3;
      for (let k = 0; k < hl; k += 3) {
        const a = 1 - k / hl;
        g.fillStyle = `rgba(46,70,48,${(0.5 * a).toFixed(2)})`;
        g.fillRect(Math.round(hx + sw2 * (k / hl)), 96 + k, 2, 3);
      }
    }
    // mist lying between the trunks
    for (let i = 0; i < 7; i++) {
      const mx = ((i * 130 + t * 5) % (VW + 300)) - 150;
      const a = 0.05 + 0.035 * Math.sin(t * 0.4 + i);
      const oa0 = g.globalAlpha;              // mist, banded from the middle out
      for (let j = 0; j < 9; j++) {
        g.globalAlpha = oa0 * a * 2.6 * Math.max(0, 1 - Math.abs(j - 4) / 4.4);
        Art.rect(g, mx, HORIZON - 30 + j * 12, 210, 13, '#92ac92');
      }
      g.globalAlpha = oa0;
    }
    g.save();                                   // warm light thrown onto the wood
    g.globalCompositeOperation = 'screen';
    // Cold moonlight from the upper right and the lantern's warmth from the
    // left, laid as broad diagonal washes. A radial glow this big reads as a
    // painted circle on the sky, which is what it looked like.
    const oa = g.globalAlpha;
    for (let i = 0; i < 7; i++) {
      g.globalAlpha = oa * 0.1 * (1 - i / 7);
      Art.rect(g, VW - 60 - i * 92, 0, 60 + i * 92, 46 + i * 34, '#80a8d6');
      g.globalAlpha = oa * 0.13 * (1 - i / 7) * flick;
      Art.rect(g, 0, 0, 90 + i * 64, 60 + i * 42, '#ffce82');
    }
    g.globalAlpha = oa;
    Art.glow(g, LX, LY + 24, 96 * flick, '#ffce82', 0.34, 9);
    g.restore();
    lantern(g, flick);
    godStatue(g);
    for (const m of motes) {
      const mx = m.x + Math.sin(t * m.sp + m.ph) * 22;
      const my = m.y - ((t * 10 * m.sp) % 250);
      const d2 = Math.hypot(mx - LX, my - LY);
      const a = U.clamp(1 - d2 / 240, 0, 1) * (0.3 + 0.5 * (Math.sin(t * 2 + m.ph) * 0.5 + 0.5));
      if (a < 0.02) continue;
      g.fillStyle = `rgba(255,214,150,${a.toFixed(2)})`;
      g.fillRect(Math.round(mx), Math.round(my), 1, 1);
    }
    g.save();
    g.globalCompositeOperation = 'soft-light';
    g.fillStyle = '#14305a'; g.globalAlpha = 0.44; g.fillRect(0, 0, VW, VH);
    g.restore();
    g.fillStyle = 'rgba(6,10,14,0.14)'; g.fillRect(0, 0, VW, VH);     // the night on top of it all
    Art.vignette(g, VW, VH, '#000000', 0.88, 2.4, 0.26);
  }
  function wombatShadowPass(g) {
    for (const c of cubes) { g.fillStyle = 'rgba(0,0,0,0.35)'; Art.ell(g, c.x, c.y + 2, 9, 3); }
  }
  function lantern(g, flick) {
    Art.glow(g, LX, LY + 10, 92 * flick, '#ffd88c', 0.34 * flick, 9);
    g.fillStyle = '#1a1410'; g.fillRect(LX - 1, 0, 2, LY - 14);
    for (let i = 0; i < 5; i++) { g.fillStyle = '#4a4038'; g.fillRect(LX - 2, 10 + i * 22, 4, 3); }
    g.fillStyle = '#0c0a08'; g.fillRect(LX - 9, LY - 15, 18, 4);
    g.fillStyle = '#57493a'; g.fillRect(LX - 8, LY - 14, 16, 2);
    g.fillStyle = '#0c0a08'; g.fillRect(LX - 8, LY - 11, 16, 22);
    g.fillStyle = `rgba(255,226,164,${(0.9 * flick).toFixed(2)})`; g.fillRect(LX - 6, LY - 9, 12, 18);
    g.fillStyle = '#fff6dc'; Art.ell(g, LX, LY + 1, 3, 5.4);
    g.fillStyle = '#0c0a08';
    g.fillRect(LX - 8, LY - 1, 16, 1); g.fillRect(LX - 1, LY - 11, 2, 22);
    g.fillRect(LX - 9, LY + 11, 18, 4);
    g.fillStyle = '#57493a'; g.fillRect(LX - 8, LY + 12, 16, 2);
  }

  // ---- plates --------------------------------------------------------------
  function plaque(g, x, y, w, h, hot, tone) {
    g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(x + 3, y + 4, w, h);
    g.fillStyle = '#0a0810'; g.fillRect(x, y, w, h);
    g.fillStyle = tone || '#3f2a18'; g.fillRect(x + 2, y + 2, w - 4, h - 4);
    Tex.fill(g, 'darkwood', x + 2, y + 2, w - 4, h - 4, 0.7);
    g.fillStyle = hot ? 'rgba(255,216,140,0.24)' : 'rgba(255,226,180,0.08)';
    g.fillRect(x + 2, y + 2, w - 4, 2);
    g.fillStyle = 'rgba(0,0,0,0.36)'; g.fillRect(x + 2, y + h - 6, w - 4, 4);
    g.strokeStyle = hot ? '#f5cd5c' : '#241a12'; g.lineWidth = 1;
    g.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);
    for (const nx of [x + 7, x + w - 8]) {
      g.fillStyle = '#1a1218'; g.fillRect(nx - 1, y + 6, 3, 3);
      g.fillStyle = '#7f7688'; g.fillRect(nx - 1, y + 6, 2, 2);
    }
  }
  function bigButton(g, b, label, sub, scale) {
    const hot = hover === b.id;
    const lift = hot ? -2 : 0;
    plaque(g, b.x, b.y + lift, b.w, b.h, hot, hot ? '#513club'.slice(0, 7) : '#3f2a18');
    const cy = b.y + lift + (sub ? 10 : (b.h - (scale || 2) * 7) / 2);
    Font.draw(g, label, b.x + b.w / 2, cy, {
      scale: scale || 2, color: hot ? '#ffe9a8' : '#e0c88e', align: 'center', shadow: '#160c06', shadowDist: 2,
    });
    if (sub) Font.draw(g, sub, b.x + b.w / 2, cy + (scale || 2) * 7 + 5, { scale: 1, color: hot ? '#c9b68a' : '#8d7f66', align: 'center' });
    if (hot) {                                            // two lantern-lit ticks
      Font.draw(g, '>', b.x + 10, cy + ((scale || 2) - 1) * 3, { scale: scale || 2, color: '#f5cd5c' });
      Font.draw(g, '<', b.x + b.w - 10 - Font.width('<', scale || 2), cy + ((scale || 2) - 1) * 3, { scale: scale || 2, color: '#f5cd5c' });
    }
  }

  function drawHome(g) {
    buttons = [];
    const BW = 250, BX = VW - BW - 30;
    buttons.push({ id: 'enter', x: BX, y: 214, w: BW, h: 50 });
    buttons.push({ id: 'settings', x: BX, y: 274, w: BW, h: 36 });
    bigButton(g, buttons[0], hasSave ? 'ENTER THE GROVE' : 'ENTER THE GROVE', hasSave ? 'CONTINUE WHERE YOU LEFT OFF' : 'A NEW WOOD, A NEW WOMBAT', 2);
    bigButton(g, buttons[1], 'SETTINGS', null, 2);
  }

  const SETTINGS = [
    { key: 'muted', name: 'SOUND', on: 'ON', off: 'MUTED', inv: true },
    { key: 'musicOff', name: 'MUSIC', on: 'ON', off: 'OFF', inv: true },
    { key: 'shake', name: 'SCREEN SHAKE', on: 'ON', off: 'OFF' },
    { key: 'bigText', name: 'BIG TEXT', on: 'ON', off: 'OFF' },
  ];
  function drawSettings(g) {
    buttons = [];
    const PW = 420, PX = (VW - PW) / 2, PY = 84, PH = 216;
    plaque(g, PX, PY, PW, PH, false);
    Font.draw(g, 'SETTINGS', VW / 2, PY + 12, { scale: 2, color: '#f5cd5c', align: 'center', shadow: '#160c06' });
    SETTINGS.forEach((s2, i) => {
      const ry = PY + 42 + i * 30;
      const val = s2.inv ? !G[s2.key] : !!G[s2.key];
      const hot = hover === 'set:' + s2.key;
      buttons.push({ id: 'set:' + s2.key, x: PX + 14, y: ry, w: PW - 28, h: 24, kind: 'toggle', k: s2.key });
      g.fillStyle = hot ? 'rgba(255,216,140,0.14)' : 'rgba(0,0,0,0.3)';
      g.fillRect(PX + 14, ry, PW - 28, 24);
      Font.draw(g, s2.name, PX + 26, ry + 8, { scale: 1, color: '#efe0c2' });
      const tx = PX + PW - 92, tw = 66;
      g.fillStyle = '#0a0810'; g.fillRect(tx, ry + 4, tw, 16);
      g.fillStyle = val ? '#3f8f4a' : '#5a4038'; g.fillRect(tx + 1, ry + 5, tw - 2, 14);
      const kx = val ? tx + tw - 20 : tx + 2;
      g.fillStyle = '#efe0c2'; g.fillRect(kx, ry + 6, 18, 12);
      Font.draw(g, val ? s2.on : s2.off, val ? tx + 16 : tx + tw - 16, ry + 9, {
        scale: 1, align: 'center', color: val ? '#dff5d8' : '#d8bdb2',
      });
    });
    const dy = PY + PH - 42;
    buttons.push({ id: 'wipe', x: PX + 14, y: dy, w: PW - 28, h: 28, kind: 'wipe' });
    const wh = hover === 'wipe';
    g.fillStyle = wh ? '#8a2f24' : '#2a1a16'; g.fillRect(PX + 14, dy, PW - 28, 28);
    g.strokeStyle = wh ? '#e07a6a' : '#4a3028'; g.lineWidth = 1; g.strokeRect(PX + 14.5, dy + 0.5, PW - 29, 27);
    Font.draw(g, 'RESET ALL DATA', VW / 2, dy + 6, { scale: 1, color: wh ? '#ffd9cf' : '#9a7a70', align: 'center' });
    Font.draw(g, hasSave ? 'ERASES YOUR GROVE AND STARTS OVER' : 'NOTHING SAVED YET', VW / 2, dy + 17, {
      scale: 1, color: wh ? '#e0a89c' : '#6a534c', align: 'center',
    });
    backButton(g);
  }
  function backButton(g) {
    const b = { id: 'back', x: VW / 2 - 70, y: 316, w: 140, h: 28 };
    buttons.push(b);
    bigButton(g, b, 'BACK', null, 2);
  }

  function drawConfirm(g) {
    g.fillStyle = 'rgba(6,4,10,0.74)'; g.fillRect(0, 0, VW, VH);
    const PW = 340, PX = (VW - PW) / 2, PY = 116, PH = 128;
    plaque(g, PX, PY, PW, PH, false, '#3a1a16');
    Font.draw(g, 'ARE YOU SURE?', VW / 2, PY + 14, { scale: 2, color: '#ff9a8a', align: 'center', shadow: '#160c06' });
    const lines = Font.wrap(confirm.text.toUpperCase(), PW - 40, 1);
    lines.forEach((l, i) => Font.draw(g, l, VW / 2, PY + 46 + i * 11, { scale: 1, color: '#efe0c2', align: 'center' }));
    Font.draw(g, 'THIS CANNOT BE UNDONE', VW / 2, PY + 72, { scale: 1, color: '#b08078', align: 'center' });
    const by = PY + PH - 34;
    buttons.push({ id: 'yes', x: PX + 18, y: by, w: 140, h: 24, kind: 'confirm' });
    buttons.push({ id: 'no', x: PX + PW - 158, y: by, w: 140, h: 24, kind: 'confirm' });
    for (const [id, lab, col] of [['yes', 'ERASE IT', '#8a2f24'], ['no', 'KEEP IT', '#2a3a24']]) {
      const b = buttons.find((q) => q.id === id), hot = hover === id;
      g.fillStyle = hot ? U.shade(col, 0.4) : col; g.fillRect(b.x, b.y, b.w, b.h);
      g.fillStyle = 'rgba(255,255,255,0.16)'; g.fillRect(b.x, b.y, b.w, 2);
      g.strokeStyle = hot ? '#f5cd5c' : '#0a0810'; g.lineWidth = 1; g.strokeRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1);
      Font.draw(g, lab, b.x + b.w / 2, b.y + 8, { scale: 1, color: '#fff0dc', align: 'center' });
    }
  }

  // Fireflies over the floor of the wood, and low mist rolling through it.
  const FLIES = [], DRIFT = [];
  function seedAir() {
    if (FLIES.length) return;
    const r = Art.rng(5150);
    for (let i = 0; i < 26; i++) {
      FLIES.push({ x: r() * VW, y: HORIZON + 20 + r() * (VH - HORIZON - 30), ph: r() * TAU,
        sp: 0.25 + r() * 0.5, rad: 8 + r() * 26, blink: 0.8 + r() * 2.6, off: r() * 4 });
    }
    for (let i = 0; i < 14; i++) {
      DRIFT.push({ x: r() * VW, y: VH - 6 - r() * 84, w: 90 + r() * 150, h: 14 + r() * 20,
        sp: 3 + r() * 9, a: 0.07 + r() * 0.1 });
    }
  }
  function drawAir(g) {
    // mist, low and slow
    for (const d of DRIFT) {
      const x = ((d.x + t * d.sp) % (VW + 300)) - 150;
      const y = d.y + Math.sin(t * 0.4 + d.x) * 3;
      const oa2 = g.globalAlpha;              // a mist puff, as four flat pixel ovals
      for (let i = 4; i >= 1; i--) {
        const k = i / 4;
        g.globalAlpha = oa2 * d.a * 0.55 * (1 - (i - 1) / 4) * 0.85;
        Art.ell(g, x, y, d.w * k, d.h * k, '#92ac92');
      }
      g.globalAlpha = oa2;
    }
    // and the fireflies through it
    for (const f of FLIES) {
      const x = f.x + Math.cos(t * f.sp + f.ph) * f.rad;
      const y = f.y + Math.sin(t * f.sp * 1.6 + f.ph) * f.rad * 0.4;
      const on = Math.sin((t + f.off) * (TAU / f.blink));
      if (on < 0.2) continue;
      const a = (on - 0.2) / 0.8;
      Art.glow(g, x, y, 9, '#e2f496', a * 0.4, 3);
      g.fillStyle = `rgba(244,255,190,${a.toFixed(2)})`;
      g.fillRect(Math.round(x), Math.round(y), 2, 2);
    }
  }
  function update(dt) {
    t += dt;
    seedAir();
    redT -= dt; redNext -= dt;                          // the god's eyes, now and then
    if (redNext <= 0) { redT = 0.9 + Math.random() * 0.8; redNext = 2.2 + Math.random() * 4.5; }
  }
  function render(g) {
    scene(g);
    seedAir();
    drawAir(g);
    if (page === 'home') drawHome(g);
    else drawSettings(g);
    if (confirm) drawConfirm(g);
  }

  const inside = (b, x, y) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
  function hitAt(x, y) { for (const b of buttons) if (inside(b, x, y)) return b; return null; }
  function move(x, y) { const h = hitAt(x, y); hover = h ? h.id : null; }
  function press(x, y) {
    const h = hitAt(x, y);
    if (!h) { if (confirm) { confirm = null; Audio.play('click'); } return; }
    Audio.play('click');
    if (confirm) { if (h.id === 'yes') confirm.go(); confirm = null; return; }
    if (h.kind === 'toggle') { onAct({ toggle: h.k }); return; }
    if (h.kind === 'wipe') {
      confirm = { text: 'your grove, every wombat and every god', go: () => onAct({ wipe: true }) };
      return;
    }
    if (h.id === 'settings') { page = 'settings'; return; }
    if (h.id === 'back') { page = 'home'; return; }
    if (h.id === 'enter') onAct({ play: true });
  }
  function key(k) {
    if (k === 'Escape') { if (confirm) confirm = null; else if (page !== 'home') page = 'home'; return true; }
    if (page === 'home' && !confirm && (k === 'Enter' || k === ' ')) { onAct({ play: true }); return true; }
    return false;
  }

  return { init, enter, update, render, press, move, key, setSave, get page() { return page; } };
})();
