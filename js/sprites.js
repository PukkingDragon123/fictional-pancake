// ---- Procedural creatures: wombats, spectators, ringmaster, cubes ----------
const Sprites = (() => {
  const S = 2;                 // screen pixels per art pixel
  const WW = 40, WH = 30;      // wombat art size; anchor at (20, 27) = feet centre
  const CW = 30, CH = 40;      // climbing wombat art size; anchor (15, 38)
  const cache = new Map();

  // ---- Wombat -------------------------------------------------------------
  // Pose curves are computed, not hand-keyed, so a pose reads the same at any
  // frame count and new poses only need their own numbers.
  const POSES = { idle: 4, walk: 8, eat: 4, sleep: 2, strain: 4, happy: 4 };
  function poseParams(pose, f) {
    const n = POSES[pose] || 1, t = f / n;
    const p = { bob: 0, squash: 0, headDip: 0, chew: 0, legLift: [0, 0, 0, 0], eyes: 'open', mouth: 'flat', ear: 0, tail: 0, blush: false, sweat: false, tuck: false };
    switch (pose) {
      case 'idle':
        p.bob = Math.sin(t * TAU) * 0.6;
        p.squash = Math.sin(t * TAU) * 0.03;
        p.ear = f === 2 ? 1 : 0;
        p.eyes = f === 3 ? 'blink' : 'open';
        p.tail = Math.sin(t * TAU) * 1;
        break;
      case 'walk': {
        p.bob = -Math.abs(Math.sin(t * TAU * 2)) * 1.4;
        p.squash = Math.sin(t * TAU * 2) * 0.05;
        const a = Math.sin(t * TAU), b = Math.sin(t * TAU + Math.PI);
        p.legLift = [Math.max(0, a) * 3.2, Math.max(0, b) * 3.2, Math.max(0, b) * 3.2, Math.max(0, a) * 3.2];
        p.tail = a * 1.5;
        break;
      }
      case 'eat':
        p.headDip = 3.5; p.chew = Math.abs(Math.sin(t * TAU)) * 1.2;
        p.mouth = 'open'; p.eyes = 'happy'; p.bob = Math.sin(t * TAU) * 0.4;
        break;
      case 'sleep':
        p.squash = 0.16; p.bob = 2.2; p.tuck = true; p.eyes = 'shut'; p.ear = -1;
        p.headDip = 2.5 + (f ? 0.4 : 0);
        break;
      case 'strain':
        p.squash = 0.14 + (f % 2) * 0.05; p.eyes = 'squeeze'; p.mouth = 'grit';
        p.blush = true; p.sweat = f % 2 === 0; p.tail = 3; p.bob = 1.2;
        break;
      case 'happy':
        p.bob = -Math.abs(Math.sin(t * TAU)) * 3; p.squash = -0.06;
        p.eyes = 'happy'; p.mouth = 'smile'; p.ear = 1; p.tail = Math.sin(t * TAU * 2) * 2.5;
        break;
    }
    return p;
  }

  function drawWombat(g, fur, pose, f) {
    const p = poseParams(pose, f);
    const GY = 27;                                  // ground line in art pixels
    const bcy = 13.5 + p.bob, brx = 12.5 + p.squash * 11, bry = 8 * (1 - p.squash);
    const hcx = 29, hcy = 12.5 + p.bob + p.headDip;

    // --- legs (behind the body, front pair lighter for depth) ---
    const legs = [[10.5, 0, fur.dark], [15, 1, fur.dark], [22.5, 2, fur.base], [27, 3, fur.base]];
    for (const [lx, i, col] of legs) {
      const lift = p.tuck ? 0 : p.legLift[i];
      const top = p.tuck ? GY - 3 : 20 - lift * 0.4;
      const h = GY - top - lift;
      if (h <= 0) continue;
      Art.rect(g, lx, top, 4, h, col);
      Art.rect(g, lx, top, 1, h, U.shade(col, 0.22));
      Art.rect(g, lx - 0.5, GY - lift - 2, 5, 2, fur.dark);          // paw
      if (!p.tuck) { Art.rect(g, lx, GY - lift, 1, 1, PAL.ink); Art.rect(g, lx + 2, GY - lift, 1, 1, PAL.ink); }
    }
    // --- tail nub, poking past the rump ---
    Art.ell(g, 4.6, bcy + 1.5 - p.tail * 0.4, 2.4, 2.8, fur.dark);
    // --- ears (back one first) ---
    const earY = 6 + p.bob + p.ear * -1 + (p.ear < 0 ? 4 : 0);
    Art.ell(g, 24.5, earY + 1, 2.5, 2.7, fur.dark);
    Art.ell(g, 31, earY - 0.5, 3, 3.1, fur.base);
    Art.ell(g, 31.2, earY, 1.6, 1.7, fur.ear);
    // --- barrel body ---
    Art.ell(g, 18, bcy, brx, bry, fur.base);
    Art.ellBand(g, 18, bcy, brx, bry, fur.dark, 0.66, 1);
    Art.ellBand(g, 18, bcy, brx, bry, fur.light, 0, 0.2);
    // --- head, merged into the shoulders ---
    Art.ell(g, hcx, hcy, 7.5, 6.8, fur.base);
    Art.ellBand(g, hcx, hcy, 7.5, 6.8, fur.light, 0, 0.26);
    Art.ellBand(g, hcx, hcy, 7.5, 6.8, fur.dark, 0.8, 1);
    // --- snout: short and blunt, reading as part of the head ---
    const scx = 34.2, scy = hcy + 2.6, sry = 3.2 + p.chew * 0.4;
    Art.ell(g, scx, scy, 3.7, sry, fur.base);
    Art.ellBand(g, scx, scy, 3.7, sry, U.shade(fur.light, 0.15), 0, 0.34);
    Art.ellBand(g, scx, scy, 3.7, sry, fur.dark, 0.78, 1);
    // --- belly patch ---
    if (!p.tuck) Art.ell(g, 19.5, bcy + 5.5, 8, 3, fur.belly);
    // --- fur texture ---
    Art.speckle(g, 18, bcy, brx - 2, bry - 1.5, fur.dark, 15, 7);
    Art.speckle(g, 18, bcy - 3.5, brx - 3, 2.5, fur.light, 9, 13);
    Art.speckle(g, hcx - 1, hcy, 5.5, 4.5, fur.light, 5, 21);
    // crown tuft
    Art.rect(g, hcx - 2, hcy - 7.2, 1, 2, fur.dark);
    Art.rect(g, hcx, hcy - 7.6, 1, 2, fur.dark);
    Art.rect(g, hcx + 2, hcy - 7.2, 1, 2, fur.dark);

    // --- face ---
    const ex = 30.5, ey = hcy - 1.5;
    if (p.eyes === 'open') {
      Art.rect(g, ex, ey, 2, 3, PAL.ink); Art.rect(g, ex, ey, 1, 1, PAL.cream);
      Art.rect(g, ex - 4.5, ey + 0.5, 2, 2.5, PAL.ink); Art.rect(g, ex - 4.5, ey + 0.5, 1, 1, PAL.cream);
    } else if (p.eyes === 'blink' || p.eyes === 'shut') {
      Art.rect(g, ex - 0.5, ey + 1, 3, 1, PAL.ink); Art.rect(g, ex - 5, ey + 1.5, 3, 1, PAL.ink);
    } else if (p.eyes === 'happy') {
      Art.rect(g, ex, ey + 1, 1, 1, PAL.ink); Art.rect(g, ex + 1, ey, 2, 1, PAL.ink); Art.rect(g, ex + 3, ey + 1, 1, 1, PAL.ink);
      Art.rect(g, ex - 5, ey + 1.5, 1, 1, PAL.ink); Art.rect(g, ex - 4, ey + 0.5, 2, 1, PAL.ink); Art.rect(g, ex - 2, ey + 1.5, 1, 1, PAL.ink);
    } else if (p.eyes === 'squeeze') {
      Art.rect(g, ex, ey, 1, 1, PAL.ink); Art.rect(g, ex + 1, ey + 1, 2, 1, PAL.ink); Art.rect(g, ex + 3, ey, 1, 1, PAL.ink);
      Art.rect(g, ex - 5, ey + 0.5, 1, 1, PAL.ink); Art.rect(g, ex - 4, ey + 1.5, 2, 1, PAL.ink); Art.rect(g, ex - 2, ey + 0.5, 1, 1, PAL.ink);
    }
    // brow, so the eyes sit in a face rather than on it
    Art.rect(g, ex - 1, ey - 1.5, 4, 1, fur.dark);
    // nose pad at the tip
    Art.rect(g, scx + 1.6, scy - 1.6, 2, 2, PAL.ink);
    Art.rect(g, scx + 1.6, scy - 1.6, 1, 1, '#7a5a50');
    // mouth, tucked under the nose
    if (p.mouth === 'open') {
      Art.rect(g, scx, scy + 1, 3, 2, PAL.ink);
      Art.rect(g, scx, scy + 1, 1, 1, PAL.cream); Art.rect(g, scx + 2, scy + 1, 1, 1, PAL.cream);
    } else if (p.mouth === 'smile') {
      Art.rect(g, scx - 0.5, scy + 1.6, 3, 1, PAL.ink); Art.rect(g, scx + 2.5, scy + 1, 1, 1, PAL.ink);
      Art.rect(g, scx + 0.5, scy + 2.4, 1, 1, PAL.cream);
    } else if (p.mouth === 'grit') {
      Art.rect(g, scx - 1, scy + 1, 4, 2, PAL.ink);
      for (let i = 0; i < 3; i++) Art.rect(g, scx - 0.6 + i * 1.4, scy + 1, 1, 2, PAL.cream);
    } else {
      Art.rect(g, scx + 0.5, scy + 1.6, 2, 1, U.shade(fur.dark, -0.2));
    }
    // a single whisker tick either side of the muzzle
    Art.rect(g, scx + 2.4, scy + 0.4, 2, 1, fur.belly);
    if (p.blush) { Art.rect(g, 31, hcy + 2.5, 2, 1, PAL.redL); Art.rect(g, 25.5, hcy + 3, 2, 1, PAL.redL); }
    if (p.sweat) { Art.rect(g, 22, hcy - 8.5, 1, 2, PAL.water2); Art.rect(g, 34, hcy - 9, 1, 2, PAL.water2); }
  }

  function drawWombatClimb(g, fur, f) {
    const sway = Math.sin((f / 4) * TAU) * 1.2;
    const bcx = 15 + sway * 0.4, bcy = 22;
    // hind paws gripping
    Art.rect(g, bcx - 7, bcy + 8, 4, 3, fur.dark); Art.rect(g, bcx + 3, bcy + 8, 4, 3, fur.dark);
    // body (vertical)
    Art.ell(g, bcx, bcy, 8.5, 11, fur.base);
    Art.ellBand(g, bcx, bcy, 8.5, 11, fur.dark, 0.6, 1);
    Art.ellBand(g, bcx, bcy, 8.5, 11, fur.light, 0, 0.22);
    Art.ell(g, bcx, bcy + 2, 5.5, 6, fur.belly);
    Art.speckle(g, bcx, bcy, 7, 9, fur.dark, 14, 5);
    // front paws up on the bark
    const grip = Math.max(0, Math.sin((f / 4) * TAU)) * 2;
    Art.rect(g, bcx - 9, bcy - 8 - grip, 4, 3, fur.base); Art.rect(g, bcx + 5, bcy - 6 + grip, 4, 3, fur.base);
    // head looking up
    const hcy = bcy - 12 + sway * 0.2;
    Art.ell(g, bcx + 0.5, hcy, 7, 6.5, fur.base);
    Art.ellBand(g, bcx + 0.5, hcy, 7, 6.5, fur.light, 0, 0.3);
    Art.ell(g, bcx - 4.5, hcy - 5, 2.6, 2.8, fur.base); Art.ell(g, bcx + 5, hcy - 5, 2.6, 2.8, fur.base);
    Art.ell(g, bcx - 4.5, hcy - 5, 1.4, 1.5, fur.ear); Art.ell(g, bcx + 5, hcy - 5, 1.4, 1.5, fur.ear);
    Art.ell(g, bcx + 0.5, hcy + 2, 4, 3, fur.light);
    Art.rect(g, bcx - 2.5, hcy - 1, 2, 2, PAL.ink); Art.rect(g, bcx + 1.5, hcy - 1, 2, 2, PAL.ink);
    Art.rect(g, bcx - 2, hcy - 1, 1, 1, PAL.cream); Art.rect(g, bcx + 2, hcy - 1, 1, 1, PAL.cream);
    Art.rect(g, bcx - 0.5, hcy + 1, 2, 2, PAL.ink);
    Art.rect(g, bcx - 1, hcy + 4, 3, 1, PAL.ink);
    // tail
    Art.ell(g, bcx, bcy + 12, 2.2, 2.6, fur.dark);
  }

  function wombat(pose, frame, palIdx, facing) {
    const n = POSES[pose] || 1;
    const f = ((frame % n) + n) % n;
    const key = `w:${pose}:${f}:${palIdx}:${facing}`;
    let img = cache.get(key);
    if (img) return img;
    const { c, g } = Art.cv(WW + 4, WH + 2);
    drawWombat(g, FUR[palIdx % FUR.length], pose, f);
    Art.outline(c, PAL.ink);
    Art.underShade(c);
    img = facing < 0 ? Art.flip(c) : c;
    cache.set(key, img);
    return img;
  }
  function wombatClimb(frame, palIdx) {
    const f = ((frame % 4) + 4) % 4;
    const key = `wc:${f}:${palIdx}`;
    let img = cache.get(key);
    if (img) return img;
    const { c, g } = Art.cv(CW + 4, CH + 2);
    drawWombatClimb(g, FUR[palIdx % FUR.length], f);
    Art.outline(c, PAL.ink);
    img = c; cache.set(key, img);
    return img;
  }
  // Blit helpers: (x, y) is the ground point under the wombat's feet
  function blitWombat(g, x, y, pose, frame, palIdx, facing, scale = S) {
    const img = wombat(pose, frame, palIdx, facing);
    const ax = facing < 0 ? (img.width - 20 - 2) : 20 + 2;
    g.drawImage(img, Math.round(x - ax * scale), Math.round(y - 28 * scale), img.width * scale, img.height * scale);
  }
  function blitClimb(g, x, y, frame, palIdx, scale = S) {
    const img = wombatClimb(frame, palIdx);
    g.drawImage(img, Math.round(x - 17 * scale), Math.round(y - 38 * scale), img.width * scale, img.height * scale);
  }

  // ---- Spectators ---------------------------------------------------------
  const SKIN = ['#f0c8a0', '#e0a878', '#c08858', '#8f5f3c', '#6b432a', '#f8dcc0'];
  const HAIR = ['#3b2a1f', '#1c1512', '#7a4a26', '#c9a04a', '#8a2f24', '#5a5a66', '#e8d0a0'];
  const SHIRT = ['#c4442f', '#3f9e94', '#f2c14e', '#4a6fae', '#7a4a9e', '#4a8f3a', '#d87a3a', '#e8e0d0', '#2f4f6f', '#b04a7a'];
  const HAT = [null, 'cap', 'top', 'bow', 'cone'];
  const PEOPLE = 20;
  const PPOSE = { idle: 2, clap: 2, cheer: 2, jump: 2 };

  function drawPerson(g, v, pose, f) {
    const r = Art.rng(v * 7919 + 13);
    const skin = SKIN[Math.floor(r() * SKIN.length)];
    const hair = HAIR[Math.floor(r() * HAIR.length)];
    const shirt = SHIRT[Math.floor(r() * SHIRT.length)];
    const pants = ['#3a4a6a', '#4a3a2a', '#2f2f3a', '#6a4a3a'][Math.floor(r() * 4)];
    const hat = HAT[Math.floor(r() * HAT.length)];
    const kid = r() < 0.25;
    const sc = kid ? 0.78 : 1;
    const bx = 7, base = 21;
    const hop = pose === 'jump' ? (f ? 3 : 0) : 0;
    const bh = Math.round(8 * sc), hh = Math.round(6 * sc);
    const by = base - hop - Math.round(5 * sc);        // body bottom
    // legs
    Art.rect(g, bx - 2, by, 2, Math.round(5 * sc), pants);
    Art.rect(g, bx + 1, by, 2, Math.round(5 * sc), pants);
    Art.rect(g, bx - 2, base - hop - 1, 2, 1, PAL.ink2);
    Art.rect(g, bx + 1, base - hop - 1, 2, 1, PAL.ink2);
    // torso
    Art.rect(g, bx - 3, by - bh, 6, bh, shirt);
    Art.rect(g, bx - 3, by - bh, 6, 1, U.shade(shirt, 0.25));
    Art.rect(g, bx - 3, by - 2, 6, 2, U.shade(shirt, -0.2));
    // arms by pose
    const armCol = skin;
    if (pose === 'cheer' || (pose === 'jump' && f)) {
      Art.rect(g, bx - 5, by - bh - 3, 2, 5, armCol); Art.rect(g, bx + 3, by - bh - 3, 2, 5, armCol);
    } else if (pose === 'clap') {
      const cl = f ? 1 : 2;
      Art.rect(g, bx - 4 + cl, by - bh + 1, 2, 3, armCol); Art.rect(g, bx + 2 - cl, by - bh + 1, 2, 3, armCol);
    } else {
      Art.rect(g, bx - 5, by - bh + 1, 2, 5, armCol); Art.rect(g, bx + 3, by - bh + 1, 2, 5, armCol);
    }
    // head
    const hy = by - bh - hh;
    Art.ell(g, bx, hy + hh / 2, Math.round(3.4 * sc), hh / 2 + 0.6, skin);
    Art.rect(g, bx - 2, hy + 2, 1, 1, PAL.ink); Art.rect(g, bx + 1, hy + 2, 1, 1, PAL.ink);
    if (pose === 'cheer' || pose === 'jump') Art.rect(g, bx - 1, hy + 4, 2, 1, PAL.ink);
    // hair
    Art.rect(g, bx - 3, hy, 6, 2, hair);
    if (r() < 0.5) { Art.rect(g, bx - 4, hy + 1, 1, 3, hair); Art.rect(g, bx + 3, hy + 1, 1, 3, hair); }
    // hat
    if (hat === 'cap') { Art.rect(g, bx - 3, hy - 1, 6, 2, shirt); Art.rect(g, bx + 3, hy, 3, 1, U.shade(shirt, -0.2)); }
    else if (hat === 'top') { Art.rect(g, bx - 4, hy - 1, 8, 1, PAL.ink2); Art.rect(g, bx - 2, hy - 5, 4, 4, PAL.ink2); Art.rect(g, bx - 2, hy - 3, 4, 1, PAL.red); }
    else if (hat === 'bow') { Art.rect(g, bx - 1, hy - 2, 2, 2, PAL.red); Art.rect(g, bx - 3, hy - 1, 2, 1, PAL.red); Art.rect(g, bx + 1, hy - 1, 2, 1, PAL.red); }
    else if (hat === 'cone') { for (let i = 0; i < 4; i++) Art.rect(g, bx - 2 + i * 0.5, hy - 1 - i, 4 - i, 1, i % 2 ? PAL.gold : PAL.red); }
  }
  function person(v, pose, f) {
    const key = `p:${v}:${pose}:${f}`;
    let img = cache.get(key);
    if (img) return img;
    const { c, g } = Art.cv(16, 24);
    drawPerson(g, v, pose, f);
    Art.outline(c, PAL.ink, 0.85);
    cache.set(key, c); return c;
  }

  function drawRingmaster(g, f) {
    const bx = 11, base = 33;
    const bob = f % 2 ? 0 : 1;
    // legs + boots
    Art.rect(g, bx - 3, base - 9 - bob, 3, 8, '#2f2a3a'); Art.rect(g, bx + 1, base - 9 - bob, 3, 8, '#2f2a3a');
    Art.rect(g, bx - 4, base - 2 - bob, 4, 2, PAL.ink2); Art.rect(g, bx + 1, base - 2 - bob, 4, 2, PAL.ink2);
    // coat tails
    Art.rect(g, bx - 5, base - 16 - bob, 10, 8, PAL.red);
    Art.rect(g, bx - 5, base - 9 - bob, 3, 3, PAL.redD); Art.rect(g, bx + 3, base - 9 - bob, 3, 3, PAL.redD);
    // torso
    Art.rect(g, bx - 4, base - 22 - bob, 9, 8, PAL.red);
    Art.rect(g, bx - 1, base - 22 - bob, 3, 8, PAL.cream);   // shirt front
    for (let i = 0; i < 3; i++) Art.rect(g, bx, base - 21 - bob + i * 2.5, 1, 1, PAL.gold);
    Art.rect(g, bx - 4, base - 22 - bob, 9, 1, PAL.goldL);
    // arms: one raised presenting
    Art.rect(g, bx - 6, base - 25 - bob, 2, 6, PAL.red);
    Art.rect(g, bx + 5, base - 21 - bob, 2, 6, PAL.red);
    Art.rect(g, bx - 6, base - 27 - bob, 2, 2, SKIN[0]);
    // head
    const hy = base - 30 - bob;
    Art.ell(g, bx, hy + 3, 3.6, 3.8, SKIN[1]);
    Art.rect(g, bx - 2, hy + 2, 1, 1, PAL.ink); Art.rect(g, bx + 1, hy + 2, 1, 1, PAL.ink);
    Art.rect(g, bx - 1, hy + 5, 3, 1, PAL.ink);            // moustache
    Art.rect(g, bx - 2, hy + 4, 1, 1, PAL.ink2); Art.rect(g, bx + 2, hy + 4, 1, 1, PAL.ink2);
    // top hat
    Art.rect(g, bx - 5, hy - 1, 10, 1, PAL.ink2);
    Art.rect(g, bx - 3, hy - 7, 6, 6, PAL.ink2);
    Art.rect(g, bx - 3, hy - 3, 6, 1, PAL.red);
    Art.rect(g, bx - 3, hy - 7, 6, 1, '#4a4458');
  }
  function ringmaster(f) {
    const key = `rm:${f % 2}`;
    let img = cache.get(key); if (img) return img;
    const { c, g } = Art.cv(24, 36);
    drawRingmaster(g, f % 2);
    Art.outline(c, PAL.ink);
    cache.set(key, c); return c;
  }

  // ---- Cubes --------------------------------------------------------------
  // Drawn live (they rotate), pixel-bevelled with per-type markings.
  function drawCube(g, def, w, h, opts = {}) {
    const col = opts.color || def.color;
    const px = Math.max(1, Math.round(Math.min(w, h) / 10));
    const x0 = -w / 2, y0 = -h / 2;
    g.fillStyle = col; g.fillRect(x0, y0, w, h);
    g.fillStyle = U.shade(col, 0.3); g.fillRect(x0, y0, w, px); g.fillRect(x0, y0, px, h);
    g.fillStyle = U.shade(col, 0.5); g.fillRect(x0, y0, px * 2, px);
    g.fillStyle = U.shade(col, -0.32); g.fillRect(x0, y0 + h - px, w, px); g.fillRect(x0 + w - px, y0, px, h);
    g.fillStyle = U.shade(col, -0.15);
    for (let i = 0; i < 4; i++) g.fillRect(Math.round(x0 + px * 2 + ((i * 13) % Math.max(1, w - px * 4))), Math.round(y0 + px * 2 + ((i * 7) % Math.max(1, h - px * 4))), px, px);
    switch (def.key) {
      case 'sticky':
        g.fillStyle = U.shade(col, 0.45);
        g.fillRect(x0 + px, y0 + h - px * 3, px * 2, px * 3);
        g.fillRect(x0 + w - px * 4, y0 + h - px * 2, px * 2, px * 2);
        g.fillRect(x0 + w / 2 - px, y0 + h - px * 4, px, px * 4);
        break;
      case 'ice':
        g.fillStyle = 'rgba(255,255,255,0.6)';
        g.fillRect(x0 + px * 2, y0 + px * 2, px * 2, px * 5); g.fillRect(x0 + px * 2, y0 + px * 2, px * 5, px * 2);
        g.fillStyle = 'rgba(255,255,255,0.3)'; g.fillRect(x0 + w - px * 4, y0 + h - px * 5, px * 2, px * 3);
        break;
      case 'gold':
        g.fillStyle = PAL.goldL; g.fillRect(x0 + px * 2, y0 + px * 2, px * 2, px * 2);
        g.fillStyle = U.shade(col, -0.25); g.fillRect(-px * 2, -px * 2, px * 4, px * 4);
        g.fillStyle = PAL.goldL; g.fillRect(-px, -px * 2, px * 2, px);
        break;
      case 'heavy':
        g.fillStyle = U.shade(col, 0.38);
        for (let i = 0; i < 4; i++) g.fillRect((i % 2 ? 1 : -1) * (w / 2 - px * 3) - px / 2, (i < 2 ? -1 : 1) * (h / 2 - px * 3) - px / 2, px, px);
        g.fillStyle = U.shade(col, -0.2); g.fillRect(x0 + px * 3, y0 + h / 2 - px / 2, w - px * 6, px);
        break;
      case 'light':
        g.fillStyle = U.shade(col, 0.5);
        g.fillRect(-px / 2, y0 + px * 2, px, h - px * 4);
        for (let i = 1; i < 4; i++) { g.fillRect(-px * 2, y0 + px * 2 + i * px * 1.6, px * 1.5, px); g.fillRect(px / 2, y0 + px * 2.8 + i * px * 1.6, px * 1.5, px); }
        break;
      case 'slab':
        g.fillStyle = U.shade(col, -0.25);
        for (let i = 1; i < 4; i++) g.fillRect(x0 + (w / 4) * i - px / 2, y0 + px, px, h - px * 2);
        break;
    }
    if (opts.face) {
      const e = Math.max(1, Math.round(w / 9));
      g.fillStyle = PAL.ink; g.fillRect(-w / 4 - e / 2, -h / 8, e, e); g.fillRect(w / 4 - e / 2, -h / 8, e, e);
      g.fillStyle = PAL.cream; g.fillRect(-w / 4 - e / 2, -h / 8, e / 2, e / 2); g.fillRect(w / 4 - e / 2, -h / 8, e / 2, e / 2);
      g.fillStyle = PAL.ink; g.fillRect(-w / 8, h / 6, w / 4, e * 0.7);
    }
    if (opts.outline) { g.strokeStyle = opts.outline; g.lineWidth = Math.max(1, px); g.strokeRect(x0, y0, w, h); }
  }

  return {
    S, POSES, wombat, wombatClimb, blitWombat, blitClimb, person, ringmaster, drawCube,
    PEOPLE, PPOSE,
    init() { /* sprites build lazily on first use */ },
    clear() { cache.clear(); },
  };
})();
