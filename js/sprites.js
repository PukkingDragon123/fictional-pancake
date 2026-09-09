// ---- Procedural creatures: wombats, gods, cupids, pilgrims, offerings ------
// Every sprite is built once on a small offscreen canvas at 1 art-pixel = 1
// canvas pixel, given a hard 1px black outline, then cached. Nothing here is
// hand-keyed: a pose is a set of numbers, so a new pose costs a case in a
// switch and nothing else.
const Sprites = (() => {
  const S = 2;                 // screen pixels per art pixel
  const WW = 40, WH = 32;      // wombat art size
  const AX = 19, AY = 29;      // anchor inside that box: the ground under the feet
  const CW = 30, CH = 42;      // climbing wombat
  const cache = new Map();

  // ---- Age stages ---------------------------------------------------------
  // A joey is not a shrunk adult: the head keeps most of its size while the
  // barrel and the legs lose theirs, which is what makes young animals read as
  // young. An elder is adult-sized but low-slung and grizzled.
  const AGES = {
    joey:  { key: 'joey',  name: 'Joey',  s: 0.60, head: 1.28, leg: 0.66, ear: 1.15 },
    young: { key: 'young', name: 'Young', s: 0.81, head: 1.12, leg: 0.86, ear: 1.06 },
    adult: { key: 'adult', name: 'Adult', s: 1.00, head: 1.00, leg: 1.00, ear: 1.00 },
    elder: { key: 'elder', name: 'Elder', s: 0.98, head: 1.03, leg: 0.86, ear: 0.94 },
  };
  const AGE_ORDER = ['joey', 'young', 'adult', 'elder'];

  // ---- Poses --------------------------------------------------------------
  const POSES = { idle: 4, walk: 8, eat: 4, sleep: 2, strain: 4, happy: 4, dig: 4, pray: 4, carry: 8, love: 4 };
  function poseParams(pose, f) {
    const n = POSES[pose] || 1, t = f / n;
    const p = {
      bob: 0, squash: 0, headDip: 0, headLift: 0, chew: 0, lean: 0, rear: 0,
      legLift: [0, 0, 0, 0], eyes: 'open', mouth: 'flat', ear: 0, tail: 0,
      blush: false, sweat: false, tuck: false, sit: false, paws: null, glow: 0,
    };
    switch (pose) {
      case 'idle':
        p.bob = Math.sin(t * TAU) * 0.6;
        p.squash = Math.sin(t * TAU) * 0.03;
        p.ear = f === 2 ? 1 : 0;
        p.eyes = f === 3 ? 'blink' : 'open';
        p.tail = Math.sin(t * TAU);
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
        p.headDip = 4; p.chew = Math.abs(Math.sin(t * TAU)) * 1.3;
        p.mouth = 'open'; p.eyes = 'happy'; p.bob = Math.sin(t * TAU) * 0.4;
        break;
      case 'sleep':
        p.squash = 0.18; p.bob = 2.4; p.tuck = true; p.eyes = 'shut'; p.ear = -1;
        p.headDip = 3 + (f ? 0.4 : 0);
        break;
      case 'strain':
        p.squash = 0.15 + (f % 2) * 0.05; p.eyes = 'squeeze'; p.mouth = 'grit';
        p.blush = true; p.sweat = f % 2 === 0; p.tail = 3; p.bob = 1.4;
        break;
      case 'happy':
        p.bob = -Math.abs(Math.sin(t * TAU)) * 3.2; p.squash = -0.07;
        p.eyes = 'happy'; p.mouth = 'smile'; p.ear = 1; p.tail = Math.sin(t * TAU * 2) * 2.5;
        break;
      case 'dig': {
        // Rump up, nose down, front paws alternating into the soil.
        const a = Math.sin(t * TAU);
        p.rear = 3; p.headDip = 5.5; p.eyes = 'squeeze'; p.mouth = 'grit';
        p.paws = { kind: 'dig', a };
        p.tail = 2.5 + a; p.bob = Math.abs(a) * 0.6;
        break;
      }
      case 'pray':
        // Sitting back on the haunches, paws together, face turned up.
        p.sit = true; p.headLift = 2.5 + (f === 2 ? 0.5 : 0);
        p.eyes = 'shut'; p.mouth = 'flat'; p.ear = -0.4;
        p.paws = { kind: 'clasp' }; p.glow = 0.4 + 0.3 * Math.sin(t * TAU);
        break;
      case 'carry': {
        const a = Math.sin(t * TAU);
        p.bob = -Math.abs(Math.sin(t * TAU * 2)) * 1.1;
        p.legLift = [Math.max(0, a) * 2.4, Math.max(0, -a) * 2.4, 0, 0];
        p.lean = -1.2; p.eyes = 'squeeze'; p.paws = { kind: 'hold' };
        break;
      }
      case 'love':
        p.eyes = 'heart'; p.mouth = 'smile'; p.blush = true; p.ear = 1;
        p.bob = Math.sin(t * TAU) * 1.2; p.lean = 1; p.tail = Math.sin(t * TAU * 2) * 2;
        break;
    }
    return p;
  }

  // ---- The wombat ---------------------------------------------------------
  // A fat barrel with a head pushed into its front end. No neck, no waist: the
  // silhouette is one heavy oval, which is the whole read at this size.
  function drawWombat(g, fur, pose, f, age, opts = {}) {
    const a = AGES[age] || AGES.adult;
    const p = poseParams(pose, f);
    const elder = age === 'elder';

    // The barrel is nearly as tall as it is wide -- that ratio is the whole
    // animal. The head is a second, smaller ball set high on its front, so the
    // silhouette has two humps rather than one long loaf.
    const legH = Math.max(2, 5 * a.leg * (p.sit ? 0.5 : 1));
    const brx = (11.6 + p.squash * 10) * a.s;
    const bry = (9.8 * (1 - p.squash)) * a.s * (p.sit ? 1.06 : 1);
    const bcx = AX - 2.5 + p.lean * 0.4;
    const bcy = AY - legH - bry + 1.5 + p.bob - (p.sit ? 1 : 0) - p.rear * 0.35;

    const hs = a.s * a.head;
    const hrx = 6.6 * hs, hry = 6.2 * hs;
    const hcx = bcx + brx * 0.82 + p.lean;
    const hcy = bcy - bry * 0.44 + p.headDip - p.headLift + p.rear * 1.2;

    // --- divine glow behind a praying wombat ---
    if (p.glow > 0) {
      g.globalAlpha = 0.5;
      Art.ditherDisc(g, hcx - 1, hcy - 2, 11 * p.glow + 6, PAL.vio3, 0.7, 0.9);
      g.globalAlpha = 1;
    }

    // --- back legs first, then the barrel, then the front pair on top ---
    // Two legs a side, set wide. Any more and at this size the underside turns
    // into a fringe.
    const feet = [
      [bcx - brx * 0.52, 0, fur.dark], [bcx + brx * 0.36, 1, fur.dark],
      [bcx - brx * 0.66, 2, fur.base], [bcx + brx * 0.52, 3, fur.base],
    ];
    function drawLegs(which) {
      for (const [lx, i, col] of feet) {
        if (which === 'back' ? i > 1 : i <= 1) continue;
        if (p.tuck) continue;
        const rearLift = p.rear && i > 1 ? 0 : p.rear;
        const lift = p.legLift[i] + rearLift;
        const w = Math.max(3, Math.round(4.8 * a.s));
        const top = bcy + bry * 0.6;
        const h = AY - top - lift;
        if (h <= 0) continue;
        Art.rect(g, lx - w / 2, top, w, h, col);
        Art.rect(g, lx - w / 2, top, 1, h, U.shade(col, 0.2));
        Art.rect(g, lx - w / 2 - 0.6, AY - lift - 2, w + 1.2, 2, fur.dark);
        // two claw ticks, the one bit of a wombat that is not soft
        Art.rect(g, lx - w / 2 + 0.5, AY - lift, 1, 1, PAL.bone1);
        Art.rect(g, lx + w / 2 - 1.5, AY - lift, 1, 1, PAL.bone1);
      }
    }
    drawLegs('back');

    // tail nub
    if (!p.tuck) Art.ell(g, bcx - brx - 0.6, bcy + bry * 0.35 - p.tail * 0.4, 2.5 * a.s, 2.9 * a.s, fur.dark);

    // ears, back one shaded
    const earR = 2.9 * hs * a.ear;
    const earY = hcy - hry * 0.94 + (p.ear < 0 ? 3 : p.ear * -1.2);
    Art.ell(g, hcx - hrx * 0.62, earY + 1.4, earR * 0.85, earR * 0.92, fur.dark);
    Art.ell(g, hcx + hrx * 0.3, earY, earR, earR * 1.06, fur.base);
    Art.ell(g, hcx + hrx * 0.32, earY + 0.4, earR * 0.5, earR * 0.54, fur.ear);

    // --- barrel ---
    Art.ell(g, bcx, bcy, brx, bry, fur.base);
    Art.ellBand(g, bcx, bcy, brx, bry, fur.dark, 0.68, 1);
    Art.ellBand(g, bcx, bcy, brx, bry, fur.light, 0, 0.2);
    if (!p.tuck) Art.ell(g, bcx + brx * 0.12, bcy + bry * 0.62, brx * 0.56, bry * 0.3, fur.belly);

    // --- head, sunk into the shoulders ---
    Art.ell(g, hcx, hcy, hrx, hry, fur.base);
    Art.ellBand(g, hcx, hcy, hrx, hry, fur.light, 0, 0.26);
    Art.ellBand(g, hcx, hcy, hrx, hry, fur.dark, 0.8, 1);

    // --- snout: short, blunt, part of the head rather than stuck on it ---
    const scx = hcx + hrx * 0.62, scy = hcy + hry * 0.44, sry = (2.9 + p.chew * 0.5) * hs;
    Art.ell(g, scx, scy, 3.2 * hs, sry, fur.base);
    Art.ellBand(g, scx, scy, 3.2 * hs, sry, U.shade(fur.light, 0.12), 0, 0.34);
    Art.ellBand(g, scx, scy, 3.2 * hs, sry, fur.dark, 0.78, 1);

    // --- coat texture ---
    Art.speckle(g, bcx, bcy, brx - 2, bry - 1.5, fur.dark, Math.round(18 * a.s), 7);
    Art.speckle(g, bcx, bcy - bry * 0.42, brx - 3, 2.4, fur.light, 10, 13);
    Art.speckle(g, hcx - 1, hcy, hrx - 2, hry - 2, fur.light, 5, 21);
    if (elder) {
      // grey at the muzzle and along the spine
      Art.speckle(g, hcx + hrx * 0.3, hcy + 1, 4, 3, PAL.bone2, 7, 31);
      Art.speckle(g, bcx, bcy - bry * 0.7, brx * 0.8, 1.6, PAL.bone1, 8, 37);
    }

    // --- rare-variant markings ---
    if (fur.key === 'moss') { for (let i = 0; i < 5; i++) Art.rect(g, bcx - brx * 0.5 + i * brx * 0.24, bcy - bry * 0.8 - (i % 2), 2, 2, PAL.moss3); }
    if (fur.key === 'bone') { for (let i = 0; i < 4; i++) Art.rect(g, bcx - brx * 0.3 + i * 3, bcy + bry * 0.1, 1, 4, U.shade(fur.dark, 0.1)); }
    if (fur.key === 'gilded') { Art.speckle(g, bcx, bcy, brx - 2, bry - 2, PAL.goldL, 9, 43); Art.rect(g, hcx - 1, hcy - hry - 1, 4, 1, PAL.gold); }
    if (fur.key === 'void') { Art.speckle(g, bcx, bcy, brx - 2, bry - 2, PAL.vio3, 8, 47); }

    // crown tuft: three coarse hairs, the silhouette's only spiky bit
    for (let i = 0; i < 3; i++) Art.rect(g, hcx - 2 + i * 2, hcy - hry * 1.06 - (i === 1 ? 0.6 : 0), 1, 2, fur.dark);

    // --- face: eyes are single dark pixels, which is why it reads as an animal
    //     and not a cartoon. A brow above each gives them a socket. ---
    const ex = hcx + hrx * 0.34, ey = hcy - hry * 0.2, ex2 = hcx - hrx * 0.3;
    // A one-pixel eye only reads if it has a light field behind it.
    Art.ell(g, ex, ey + 0.5, 2.2 * hs, 2 * hs, U.shade(fur.light, 0.22));
    Art.ell(g, ex2, ey + 1, 2 * hs, 1.9 * hs, U.shade(fur.light, 0.14));
    const eyeCol = fur.key === 'void' ? PAL.vio4 : PAL.ink;
    function dot(x, y) { Art.rect(g, x, y, 1, 1, eyeCol); }
    if (p.eyes === 'open') {
      dot(ex, ey); dot(ex2, ey + 0.5);
      Art.rect(g, ex - 1, ey - 2, 3, 1, fur.dark);
      Art.rect(g, ex2 - 1, ey - 1.5, 3, 1, fur.dark);
    } else if (p.eyes === 'blink' || p.eyes === 'shut') {
      Art.rect(g, ex - 0.5, ey + 0.5, 2, 1, PAL.ink); Art.rect(g, ex2 - 0.5, ey + 1, 2, 1, PAL.ink);
    } else if (p.eyes === 'happy') {
      Art.rect(g, ex - 1, ey + 0.5, 1, 1, PAL.ink); Art.rect(g, ex, ey - 0.5, 1, 1, PAL.ink); Art.rect(g, ex + 1, ey + 0.5, 1, 1, PAL.ink);
      Art.rect(g, ex2 - 1, ey + 1, 1, 1, PAL.ink); Art.rect(g, ex2, ey, 1, 1, PAL.ink); Art.rect(g, ex2 + 1, ey + 1, 1, 1, PAL.ink);
    } else if (p.eyes === 'squeeze') {
      Art.rect(g, ex - 1, ey - 0.5, 1, 1, PAL.ink); Art.rect(g, ex, ey + 0.5, 1, 1, PAL.ink); Art.rect(g, ex + 1, ey - 0.5, 1, 1, PAL.ink);
      Art.rect(g, ex2 - 1, ey, 1, 1, PAL.ink); Art.rect(g, ex2, ey + 1, 1, 1, PAL.ink); Art.rect(g, ex2 + 1, ey, 1, 1, PAL.ink);
    } else if (p.eyes === 'heart') {
      for (const hx of [ex - 1, ex2 - 1]) {
        Art.rect(g, hx, ey - 1, 1, 1, PAL.bloodL); Art.rect(g, hx + 2, ey - 1, 1, 1, PAL.bloodL);
        Art.rect(g, hx, ey, 3, 1, PAL.bloodL); Art.rect(g, hx + 1, ey + 1, 1, 1, PAL.bloodL);
      }
    }
    // nose pad
    Art.rect(g, scx + 1.4, scy - 1.6, 2, 2, PAL.ink);
    Art.rect(g, scx + 1.4, scy - 1.6, 1, 1, U.shade(fur.belly, -0.3));
    // mouth
    if (p.mouth === 'open') {
      Art.rect(g, scx - 0.4, scy + 1, 3, 2, PAL.ink);
      Art.rect(g, scx - 0.4, scy + 1, 1, 1, PAL.bone3); Art.rect(g, scx + 1.6, scy + 1, 1, 1, PAL.bone3);
    } else if (p.mouth === 'smile') {
      Art.rect(g, scx - 0.8, scy + 1.6, 3, 1, PAL.ink); Art.rect(g, scx + 2.2, scy + 1, 1, 1, PAL.ink);
    } else if (p.mouth === 'grit') {
      Art.rect(g, scx - 1.2, scy + 1, 4, 2, PAL.ink);
      for (let i = 0; i < 3; i++) Art.rect(g, scx - 0.8 + i * 1.4, scy + 1, 1, 2, PAL.bone3);
    } else {
      Art.rect(g, scx + 0.4, scy + 1.6, 2, 1, U.shade(fur.dark, -0.25));
    }
    // whisker tick
    Art.rect(g, scx + 2.6, scy + 0.2, 2, 1, fur.belly);
    if (elder) Art.rect(g, scx + 2.6, scy + 2, 3, 1, PAL.bone2);
    if (p.blush) { Art.rect(g, hcx + hrx * 0.5, hcy + hry * 0.34, 2, 1, PAL.bloodL); Art.rect(g, hcx - hrx * 0.5, hcy + hry * 0.4, 2, 1, PAL.bloodL); }
    if (p.sweat) { Art.rect(g, hcx - hrx - 1, hcy - hry - 1, 1, 2, PAL.water2); Art.rect(g, hcx + hrx + 1, hcy - hry - 2, 1, 2, PAL.water2); }

    drawLegs('front');

    // --- what the front paws are doing ---
    if (p.paws && p.paws.kind === 'dig') {
      const px = hcx + 1, py = AY - 2;
      Art.rect(g, px - 2, py - 2 - p.paws.a * 2, 4, 3, fur.light);
      Art.rect(g, px + 3, py - 1 + p.paws.a * 2, 4, 3, fur.base);
      for (let i = 0; i < 4; i++) Art.rect(g, px + U.rand(-6, 8), py - U.rand(0, 5), 1, 1, PAL.soil2);
    } else if (p.paws && p.paws.kind === 'clasp') {
      Art.rect(g, hcx - 1, hcy + hry * 0.9, 5, 4, fur.light);
      Art.rect(g, hcx - 1, hcy + hry * 0.9, 5, 1, U.shade(fur.light, 0.2));
      Art.rect(g, hcx + 1, hcy + hry * 0.9 + 1, 1, 2, fur.dark);
    } else if (p.paws && p.paws.kind === 'hold') {
      Art.rect(g, hcx + hrx * 0.3, hcy + hry * 0.8, 4, 3, fur.light);
      Art.rect(g, hcx - hrx * 0.4, hcy + hry * 0.9, 4, 3, fur.base);
    }
    if (p.sit) {
      // haunch, so a sitting wombat has somewhere to sit
      Art.ell(g, bcx - brx * 0.5, AY - 3.5 * a.s, 5 * a.s, 4 * a.s, fur.dark);
    }
  }

  function drawWombatClimb(g, fur, f) {
    const sway = Math.sin((f / 4) * TAU) * 1.2;
    const bcx = 15 + sway * 0.4, bcy = 24;
    Art.rect(g, bcx - 7, bcy + 8, 4, 3, fur.dark); Art.rect(g, bcx + 3, bcy + 8, 4, 3, fur.dark);
    Art.ell(g, bcx, bcy, 9, 11.5, fur.base);
    Art.ellBand(g, bcx, bcy, 9, 11.5, fur.dark, 0.6, 1);
    Art.ellBand(g, bcx, bcy, 9, 11.5, fur.light, 0, 0.22);
    Art.ell(g, bcx, bcy + 2, 5.5, 6, fur.belly);
    Art.speckle(g, bcx, bcy, 7, 9, fur.dark, 14, 5);
    const grip = Math.max(0, Math.sin((f / 4) * TAU)) * 2;
    Art.rect(g, bcx - 9, bcy - 8 - grip, 4, 3, fur.base); Art.rect(g, bcx + 5, bcy - 6 + grip, 4, 3, fur.base);
    const hcy = bcy - 13 + sway * 0.2;
    Art.ell(g, bcx + 0.5, hcy, 7, 6.5, fur.base);
    Art.ellBand(g, bcx + 0.5, hcy, 7, 6.5, fur.light, 0, 0.3);
    Art.ell(g, bcx - 4.5, hcy - 5, 2.6, 2.8, fur.base); Art.ell(g, bcx + 5, hcy - 5, 2.6, 2.8, fur.base);
    Art.ell(g, bcx - 4.5, hcy - 5, 1.4, 1.5, fur.ear); Art.ell(g, bcx + 5, hcy - 5, 1.4, 1.5, fur.ear);
    Art.ell(g, bcx + 0.5, hcy + 2.5, 4, 3, fur.light);
    Art.rect(g, bcx - 2, hcy - 1, 1, 1, PAL.ink); Art.rect(g, bcx + 2, hcy - 1, 1, 1, PAL.ink);
    Art.rect(g, bcx, hcy + 1.5, 2, 2, PAL.ink);
    Art.ell(g, bcx, bcy + 12, 2.2, 2.6, fur.dark);
  }

  function furOf(pal) { return typeof pal === 'string' ? (FUR_BY_KEY[pal] || FUR[0]) : FUR[(pal | 0) % FUR.length]; }

  function wombat(pose, frame, pal, facing, age = 'adult') {
    const n = POSES[pose] || 1;
    const f = ((frame % n) + n) % n;
    const fur = furOf(pal);
    const key = `w:${pose}:${f}:${fur.key}:${age}:${facing}`;
    let img = cache.get(key);
    if (img) return img;
    const { c, g } = Art.cv(WW, WH);
    drawWombat(g, fur, pose, f, age);
    Art.outline(c, PAL.ink);
    Art.underShade(c);
    img = facing < 0 ? Art.flip(c) : c;
    cache.set(key, img);
    return img;
  }
  function wombatClimb(frame, pal) {
    const f = ((frame % 4) + 4) % 4;
    const fur = furOf(pal);
    const key = `wc:${f}:${fur.key}`;
    let img = cache.get(key); if (img) return img;
    const { c, g } = Art.cv(CW, CH);
    drawWombatClimb(g, fur, f);
    Art.outline(c, PAL.ink);
    cache.set(key, c); return c;
  }
  // (x, y) is the ground point under the feet.
  function blitWombat(g, x, y, pose, frame, pal, facing, age = 'adult', scale = S) {
    const img = wombat(pose, frame, pal, facing, age);
    const ax = facing < 0 ? img.width - AX : AX;
    g.drawImage(img, Math.round(x - ax * scale), Math.round(y - AY * scale), img.width * scale, img.height * scale);
  }
  function blitClimb(g, x, y, frame, pal, scale = S) {
    const img = wombatClimb(frame, pal);
    g.drawImage(img, Math.round(x - 15 * scale), Math.round(y - 40 * scale), img.width * scale, img.height * scale);
  }

  // ---- Gods ---------------------------------------------------------------
  // A god is a tall robed column with no legs, a mask instead of a face and a
  // halo behind it. The whole figure is drawn from its def, so ten gods are ten
  // rows of data rather than ten sprites.
  const GW = 56, GH = 84;
  function drawGod(g, def, f) {
    const t = f / 4;
    const drift = Math.sin(t * TAU) * 1.2;
    const cx = GW / 2, base = GH - 2;
    const c0 = def.robe0, c1 = def.robe1, c2 = def.trim;

    // halo
    const hy = 22 + drift * 0.4;
    if (def.halo === 'ring') {
      for (let i = 0; i < 30; i++) {
        const an = (i / 30) * TAU;
        Art.rect(g, cx + Math.cos(an) * 17, hy + Math.sin(an) * 17 * 0.9, 1, 1, i % 2 ? PAL.halo : c2);
      }
    } else if (def.halo === 'disc') {
      Art.ditherDisc(g, cx, hy, 17, c2, 0.85, 0.7);
      Art.ditherDisc(g, cx, hy, 11, PAL.halo, 0.5, 0.9);
    } else if (def.halo === 'thorn') {
      for (let i = 0; i < 9; i++) {
        const an = (i / 9) * TAU + t * 0.4;
        Art.line(g, cx + Math.cos(an) * 9, hy + Math.sin(an) * 9, cx + Math.cos(an) * 19, hy + Math.sin(an) * 19, c2);
      }
    } else if (def.halo === 'horns') {
      Art.limb(g, cx - 6, hy - 2, cx - 13, hy - 12, 4, 1, c2);
      Art.limb(g, cx + 6, hy - 2, cx + 13, hy - 12, 4, 1, c2);
    }

    // robe: a column that flares to the ground and never shows a foot
    Art.poly(g, [[cx - 6, 26], [cx + 6, 26], [cx + 17, base], [cx - 17, base]], c0);
    Art.poly(g, [[cx - 6, 26], [cx - 1, 26], [cx + 4, base], [cx - 17, base]], c1);
    for (let y = 30; y < base; y += 3) Art.rect(g, cx - 15 + (y % 6), y, 1, 2, U.shade(c1, -0.25));
    Art.rect(g, cx - 17, base - 2, 34, 2, PAL.ink2);
    // sash
    Art.poly(g, [[cx - 9, 44], [cx + 9, 44], [cx + 10, 48], [cx - 10, 48]], c2);

    // arms, one raised
    const raise = Math.sin(t * TAU) * 2;
    Art.limb(g, cx - 7, 32, cx - 16, 44 - raise, 6, 3, c0);
    Art.limb(g, cx + 7, 32, cx + 16, 40 + raise, 6, 3, c0);
    Art.ell(g, cx - 17, 45 - raise, 2.6, 2.8, def.skin);
    Art.ell(g, cx + 17, 41 + raise, 2.6, 2.8, def.skin);
    if (def.arms === 4) {
      Art.limb(g, cx - 6, 38, cx - 14, 54 + raise, 5, 3, c1);
      Art.limb(g, cx + 6, 38, cx + 14, 52 - raise, 5, 3, c1);
      Art.ell(g, cx - 15, 55 + raise, 2.4, 2.6, def.skin);
      Art.ell(g, cx + 15, 53 - raise, 2.4, 2.6, def.skin);
    }

    // hood and mask
    Art.ell(g, cx, 24 + drift * 0.3, 10, 11, c0);
    Art.ellBand(g, cx, 24 + drift * 0.3, 10, 11, c1, 0.55, 1);
    const my = 25 + drift * 0.3;
    if (def.mask === 'skull') {
      Art.ell(g, cx, my, 6.5, 7, PAL.bone3);
      Art.rect(g, cx - 4, my - 1, 3, 3, PAL.ink); Art.rect(g, cx + 1, my - 1, 3, 3, PAL.ink);
      Art.rect(g, cx - 1, my + 3, 2, 2, PAL.ink);
      for (let i = 0; i < 4; i++) Art.rect(g, cx - 3 + i * 2, my + 5, 1, 2, PAL.ink);
    } else if (def.mask === 'sun') {
      Art.ell(g, cx, my, 6.5, 6.5, PAL.goldL);
      for (let i = 0; i < 8; i++) { const an = (i / 8) * TAU; Art.rect(g, cx + Math.cos(an) * 8, my + Math.sin(an) * 8, 2, 2, PAL.gold); }
      Art.rect(g, cx - 3, my - 1, 2, 1, PAL.ink); Art.rect(g, cx + 1, my - 1, 2, 1, PAL.ink);
    } else if (def.mask === 'void') {
      Art.ell(g, cx, my, 6.5, 7, PAL.ink);
      for (let i = 0; i < 3; i++) Art.rect(g, cx - 3 + i * 3, my - 1 + (i % 2), 1, 1, def.trim);
    } else if (def.mask === 'antler') {
      Art.ell(g, cx, my, 6, 6.6, def.skin);
      Art.limb(g, cx - 4, my - 5, cx - 10, my - 14, 2, 1, PAL.bone2);
      Art.limb(g, cx + 4, my - 5, cx + 10, my - 14, 2, 1, PAL.bone2);
      Art.rect(g, cx - 3, my - 1, 1, 1, PAL.ink); Art.rect(g, cx + 2, my - 1, 1, 1, PAL.ink);
    } else if (def.mask === 'eye') {
      Art.ell(g, cx, my, 6.5, 6.5, PAL.bone3);
      Art.ell(g, cx, my, 4, 3, def.trim);
      Art.rect(g, cx - 1, my - 1, 2, 2, PAL.ink);
    } else {                                       // 'veil'
      Art.ell(g, cx, my, 6.2, 6.8, U.shade(c0, -0.35));
      Art.rect(g, cx - 5, my - 1, 10, 1, c2);
      Art.rect(g, cx - 3, my + 1, 1, 1, def.trim); Art.rect(g, cx + 2, my + 1, 1, 1, def.trim);
    }

    // the thing it holds
    if (def.holds === 'staff') {
      Art.rect(g, cx + 17, 30, 2, base - 32, PAL.bark2);
      Art.ell(g, cx + 18, 28, 3.4, 3.6, c2);
    } else if (def.holds === 'bowl') {
      Art.ell(g, cx - 18, 47 - raise, 5, 2.6, c2);
      Art.ditherDisc(g, cx - 18, 44 - raise, 5, PAL.halo, 0.6, 1);
    } else if (def.holds === 'seed') {
      Art.ell(g, cx - 18, 42 - raise, 3, 3.4, PAL.moss3);
      Art.rect(g, cx - 18, 38 - raise, 1, 3, PAL.moss1);
    }

    // motes drifting up around the figure
    for (let i = 0; i < 7; i++) {
      const yy = base - 6 - ((i * 11 + f * 5) % (base - 20));
      Art.rect(g, cx + Math.sin(i * 2.1 + t * TAU) * 20, yy, 1, 1, i % 2 ? c2 : PAL.halo);
    }
  }
  function god(defKey, def, f) {
    const key = `g:${defKey}:${f % 4}`;
    let img = cache.get(key); if (img) return img;
    const { c, g } = Art.cv(GW, GH);
    drawGod(g, def, f % 4);
    Art.outline(c, PAL.ink, 0.9);
    cache.set(key, c); return c;
  }
  function blitGod(g, x, y, defKey, def, f, scale = S) {
    const img = god(defKey, def, f);
    g.drawImage(img, Math.round(x - (GW / 2) * scale), Math.round(y - (GH - 2) * scale), img.width * scale, img.height * scale);
  }

  // ---- Cupids -------------------------------------------------------------
  // Joey-sized, winged, and carrying a bow they are far too small to draw.
  const UW = 28, UH = 26;
  function drawCupid(g, tint, f) {
    const flap = f % 2 ? 0 : 1;
    const cx = 14, cy = 15;
    // wings behind
    for (const s of [-1, 1]) {
      Art.poly(g, [
        [cx + s * 5, cy - 3],
        [cx + s * 12, cy - 9 - flap * 3],
        [cx + s * 13, cy - 1 + flap],
        [cx + s * 6, cy + 2],
      ], PAL.bone3);
      Art.line(g, cx + s * 6, cy - 2, cx + s * 12, cy - 6 - flap * 2, PAL.bone1);
    }
    // fat little body
    Art.ell(g, cx, cy + 2, 7, 5.6, tint.base);
    Art.ellBand(g, cx, cy + 2, 7, 5.6, tint.dark, 0.66, 1);
    Art.ell(g, cx + 1, cy + 4, 4, 2.2, tint.belly);
    // head
    Art.ell(g, cx + 3, cy - 3, 5.2, 5, tint.base);
    Art.ell(g, cx - 1, cy - 7, 2.2, 2.3, tint.base);
    Art.ell(g, cx + 6, cy - 7, 2.2, 2.3, tint.base);
    Art.ell(g, cx + 6, cy - 7, 1.2, 1.2, tint.ear);
    Art.ell(g, cx + 6.5, cy - 1.6, 2.6, 2.2, tint.light);
    Art.rect(g, cx + 4, cy - 4, 1, 1, PAL.ink); Art.rect(g, cx + 1, cy - 3.6, 1, 1, PAL.ink);
    Art.rect(g, cx + 7, cy - 2.4, 2, 2, PAL.ink);
    Art.rect(g, cx + 2, cy - 1, 2, 1, PAL.bloodL); Art.rect(g, cx + 6, cy - 0.6, 2, 1, PAL.bloodL);
    // halo
    for (let i = 0; i < 12; i++) { const an = (i / 12) * TAU; Art.rect(g, cx + 3 + Math.cos(an) * 5, cy - 10 + Math.sin(an) * 2, 1, 1, PAL.goldL); }
    // bow
    Art.line(g, cx - 6, cy + 1, cx - 6, cy + 7, PAL.bark3);
    Art.line(g, cx - 7, cy + 2, cx - 7, cy + 6, PAL.bone2);
    Art.rect(g, cx - 5, cy + 3, 4, 1, PAL.bark2);
    Art.rect(g, cx - 1, cy + 2.5, 2, 2, PAL.bloodL);
  }
  function cupid(tintKey, f) {
    const key = `cu:${tintKey}:${f % 2}`;
    let img = cache.get(key); if (img) return img;
    const { c, g } = Art.cv(UW, UH);
    drawCupid(g, furOf(tintKey), f % 2);
    Art.outline(c, PAL.ink);
    cache.set(key, c); return c;
  }
  function blitCupid(g, x, y, tintKey, f, scale = S) {
    const img = cupid(tintKey, f);
    g.drawImage(img, Math.round(x - (UW / 2) * scale), Math.round(y - (UH / 2) * scale), img.width * scale, img.height * scale);
  }

  // ---- Pilgrims -----------------------------------------------------------
  // The crowd at the shrine: hooded, ash-robed, faceless except for two dots.
  const ROBE = ['#4a4453', '#3a3644', '#5b5162', '#6b6070', '#42505a', '#584a4a', '#2f2b38', '#6a6272'];
  const TRIM = ['#8b8397', '#c0b8a6', '#6a35ab', '#a2761a', '#3f8e94', '#7c2230'];
  const PPOSE = { idle: 2, clap: 2, cheer: 2, jump: 2 };
  const PEOPLE = 20;
  function drawPilgrim(g, v, pose, f) {
    const r = Art.rng(v * 7919 + 13);
    const robe = ROBE[Math.floor(r() * ROBE.length)];
    const trim = TRIM[Math.floor(r() * TRIM.length)];
    const small = r() < 0.28;
    const sc = small ? 0.8 : 1;
    const bx = 8, base = 22;
    const hop = pose === 'jump' ? (f ? 3 : 0) : 0;
    const by = base - hop;
    const bh = Math.round(13 * sc);
    // robe column
    Art.poly(g, [[bx - 3, by - bh], [bx + 3, by - bh], [bx + 5, by], [bx - 5, by]], robe);
    Art.poly(g, [[bx - 3, by - bh], [bx - 1, by - bh], [bx + 1, by], [bx - 5, by]], U.shade(robe, -0.22));
    Art.rect(g, bx - 5, by - 1, 10, 1, PAL.ink2);
    Art.rect(g, bx - 3, by - Math.round(bh * 0.45), 6, 1, trim);
    // sleeves
    if (pose === 'cheer' || (pose === 'jump' && f)) {
      Art.limb(g, bx - 3, by - bh + 3, bx - 7, by - bh - 3, 3, 2, robe);
      Art.limb(g, bx + 3, by - bh + 3, bx + 7, by - bh - 3, 3, 2, robe);
    } else if (pose === 'clap') {
      const cl = f ? 0 : 1;
      Art.limb(g, bx - 3, by - bh + 4, bx - 1 - cl, by - bh + 7, 3, 2, robe);
      Art.limb(g, bx + 3, by - bh + 4, bx + 1 + cl, by - bh + 7, 3, 2, robe);
    } else {
      Art.limb(g, bx - 3, by - bh + 3, bx - 5, by - 3, 3, 2, robe);
      Art.limb(g, bx + 3, by - bh + 3, bx + 5, by - 3, 3, 2, robe);
    }
    // hood, and the two dots inside it
    const hy = by - bh - Math.round(4 * sc);
    Art.ell(g, bx, hy + 3, 4.2 * sc, 4.6 * sc, robe);
    Art.ell(g, bx, hy + 4, 2.8 * sc, 3 * sc, PAL.ink);
    Art.rect(g, bx - 1.6, hy + 3, 1, 1, trim); Art.rect(g, bx + 0.8, hy + 3, 1, 1, trim);
    Art.rect(g, bx - 4, hy + 1, 8, 1, U.shade(robe, 0.2));
  }
  function pilgrim(v, pose, f) {
    const key = `pg:${v}:${pose}:${f}`;
    let img = cache.get(key); if (img) return img;
    const { c, g } = Art.cv(18, 26);
    drawPilgrim(g, v, pose, f);
    Art.outline(c, PAL.ink, 0.9);
    cache.set(key, c); return c;
  }

  // ---- Offerings ----------------------------------------------------------
  // Drawn live because they rotate. Markings come from def.mark so the data
  // file owns which offering looks like what.
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
    switch (def.mark) {
      case 'sticky':
        g.fillStyle = U.shade(col, 0.45);
        g.fillRect(x0 + px, y0 + h - px * 3, px * 2, px * 3);
        g.fillRect(x0 + w - px * 4, y0 + h - px * 2, px * 2, px * 2);
        g.fillRect(x0 + w / 2 - px, y0 + h - px * 4, px, px * 4);
        break;
      case 'gold':
        g.fillStyle = PAL.goldL; g.fillRect(x0 + px * 2, y0 + px * 2, px * 2, px * 2);
        g.fillStyle = U.shade(col, -0.25); g.fillRect(-px * 2, -px * 2, px * 4, px * 4);
        g.fillStyle = PAL.goldL; g.fillRect(-px, -px * 2, px * 2, px);
        break;
      case 'iron':
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
      case 'bone':
        g.fillStyle = PAL.bone3;
        g.fillRect(x0 + px * 2, y0 + h / 2 - px, w - px * 4, px * 2);
        g.fillRect(x0 + px * 2, y0 + px * 2, px * 2, h - px * 4);
        g.fillRect(x0 + w - px * 4, y0 + px * 2, px * 2, h - px * 4);
        break;
      case 'holy':
        g.fillStyle = PAL.vio4;
        g.fillRect(-px, y0 + px * 2, px * 2, h - px * 4);
        g.fillRect(x0 + px * 2, -px, w - px * 4, px * 2);
        g.fillStyle = PAL.halo; g.fillRect(-px / 2, -px / 2, px, px);
        break;
    }
    if (opts.face) {
      const e = Math.max(1, Math.round(w / 11));
      g.fillStyle = PAL.ink; g.fillRect(-w / 4 - e / 2, -h / 8, e, e); g.fillRect(w / 4 - e / 2, -h / 8, e, e);
      g.fillRect(-w / 8, h / 6, w / 4, e * 0.7);
    }
    if (opts.outline) { g.strokeStyle = opts.outline; g.lineWidth = Math.max(1, px); g.strokeRect(x0, y0, w, h); }
  }

  return {
    S, WW, WH, AX, AY, POSES, AGES, AGE_ORDER,
    wombat, wombatClimb, blitWombat, blitClimb, furOf,
    god, blitGod, cupid, blitCupid, pilgrim, drawCube,
    PEOPLE, PPOSE,
    init() { /* sprites build lazily on first use */ },
    clear() { cache.clear(); },
  };
})();
