// ---- Procedural wombats, gods and cupids -----------------------------------
// One drawing routine builds every wombat. Age is a coordinate scale about the
// feet, so joeys are the same animal with a bigger head; pelts are swapped
// palettes; poses are computed curves rather than hand-keyed frames.
const Sprites = (() => {
  const S = 1.45;                 // world pixels per art pixel: a wombat is a small animal
  const AW = 44, AH = 30;         // art canvas
  const PAD = 12;                 // headroom above, for poses that rear up
  const AX = 22, GY = 27;         // anchor: feet centre / ground line
  const cache = new Map();

  const AGE = { baby: { k: 0.62, head: 1.2, name: 'Joey' }, juvenile: { k: 0.78, head: 1.1, name: 'Juvenile' }, adult: { k: 1, head: 1, name: 'Adult' } };
  // Every animation on the sheet, plus the few the grove itself needs.
  // Frame counts. They are high on purpose: the walk is a real four-beat gait
  // and it wants the frames to read as one, not as a flick between two poses.
  const POSES = { idle: 10, walk: 12, run: 10, turn: 6, jump: 7, hurt: 5, sit: 8, lie: 4, sleep: 6, eat: 10, graze: 8, dig: 10, happy: 8, pray: 10, bite: 8 };

  // ---- the gait --------------------------------------------------------------
  // One leg through one cycle. `u` is where in the cycle this leg is: the first
  // two fifths it is in the air swinging forward, the rest it is planted and
  // being pushed back under the animal. That split is what makes a walk read as
  // a walk instead of four legs waving.
  const SWING = 0.4;
  function step(u, reach, lift) {
    u = ((u % 1) + 1) % 1;
    if (u < SWING) {
      const k = u / SWING;
      return { lift: Math.sin(k * Math.PI) * lift, fwd: U.lerp(-reach, reach, U.easeInOut(k)), knee: Math.sin(k * Math.PI) };
    }
    const k = (u - SWING) / (1 - SWING);
    return { lift: 0, fwd: U.lerp(reach, -reach, k), knee: 0 };
  }
  function pose(name, f) {
    const n = POSES[name] || 1, t = f / n;
    const p = {
      bob: 0, squash: 0, headDip: 0, headFwd: 0, front: 0, rear: 0, jaw: 0, ear: 0, blink: 0,
      leg: [0, 0, 0, 0], legX: [0, 0, 0, 0], knee: [0, 0, 0, 0],
      tuck: 0, sit: 0, lie: 0, sleep: 0, view: 'side', tilt: 0, hurt: 0, reach: 0, z: 0,
      tail: 0, breathe: 0, earFlop: 0, headSw: 0,
    };
    const s = Math.sin(t * TAU);
    // legs are ordered [rear far, rear near, front far, front near]
    const gait = (reach, lift, phase) => {
      for (let i = 0; i < 4; i++) {
        const st = step(t + phase[i], reach, lift);
        p.leg[i] = st.lift; p.legX[i] = st.fwd; p.knee[i] = st.knee;
      }
    };
    switch (name) {
      case 'idle': {
        // standing: it breathes, the ears twitch, it blinks once a cycle
        p.breathe = Math.sin(t * TAU) * 0.6;
        p.bob = p.breathe * 0.5;
        p.squash = Math.sin(t * TAU) * 0.018;
        p.blink = f === 4 ? 1 : 0;
        p.ear = f === 1 || f === 7 ? 1 : 0;
        p.earFlop = Math.sin(t * TAU * 2) * 0.3;
        p.tail = Math.sin(t * TAU * 0.5) * 0.4;
        p.headSw = Math.sin(t * TAU + 1) * 0.4;
        break;
      }
      case 'walk': {
        // a wombat walks diagonally: near hind and far fore come through together
        gait(2.3, 3.2, [0, 0.5, 0.55, 0.05]);
        p.bob = -Math.abs(Math.sin(t * TAU * 2)) * 1.1;
        p.tilt = Math.sin(t * TAU * 2) * 0.02;
        p.headDip = Math.sin(t * TAU * 2 + 0.6) * 0.9 - 0.3;
        p.headSw = Math.sin(t * TAU) * 0.8;
        p.tail = Math.sin(t * TAU * 2) * 0.8;
        p.earFlop = Math.sin(t * TAU * 2 + 1) * 0.7;
        p.breathe = Math.sin(t * TAU) * 0.3;
        break;
      }
      case 'run': {
        // a bound: the two hind legs together, then the two fore
        gait(3.6, 5, [0, 0.06, 0.48, 0.54]);
        const air = Math.sin(t * TAU);
        p.bob = -Math.abs(air) * 3.2;
        p.front = 1 + air * 0.6; p.rear = -air * 0.5;
        p.headFwd = 2 + air * 0.8;
        p.squash = -0.05 + Math.sin(t * TAU * 2) * 0.07;
        p.tilt = air * 0.06;
        p.earFlop = 1 + Math.sin(t * TAU * 2) * 0.6;
        p.tail = Math.sin(t * TAU * 2) * 1.4;
        break;
      }
      case 'turn': p.view = ['side', 'quarter', 'back', 'back', 'quarter', 'side'][f]; break;
      case 'jump': {
        const lift = [0, -5, -12, -15, -12, -5, 0][f];
        p.bob = lift; p.tuck = f >= 2 && f <= 4 ? 1 : f === 1 || f === 5 ? 0.5 : 0;
        p.squash = f === 0 ? 0.16 : f === 6 ? 0.2 : f === 3 ? -0.12 : -0.05;
        p.tilt = f < 3 ? -0.16 : f > 3 ? 0.16 : 0;
        p.ear = f >= 2 && f <= 4 ? 1 : 0; p.earFlop = f < 3 ? -1 : 1;
        break;
      }
      case 'hurt': p.hurt = [1, 0.8, 0.55, 0.3, 0][f]; p.tilt = 0.26 * p.hurt; p.blink = f < 4 ? 1 : 0; p.bob = -p.hurt * 2; p.earFlop = -p.hurt; break;
      case 'sit': {
        p.sit = 1; p.breathe = Math.sin(t * TAU) * 0.7; p.bob = p.breathe * 0.5;
        p.blink = f === 5 ? 1 : 0; p.ear = f === 2 ? 1 : 0;
        p.earFlop = Math.sin(t * TAU) * 0.4; p.headSw = Math.sin(t * TAU * 0.5) * 0.6;
        break;
      }
      case 'lie': p.lie = 1; p.breathe = Math.sin(t * TAU) * 0.8; p.blink = f === 2 ? 1 : 0; p.earFlop = Math.sin(t * TAU) * 0.3; break;
      // Asleep she does not bob up and down in the air. The breath swells the
      // barrel and nothing else moves but the ears and the z drifting off her.
      case 'sleep': p.lie = 1; p.sleep = 1; p.blink = 1; p.z = t; p.breathe = Math.sin(t * TAU); p.earFlop = Math.sin(t * TAU) * 0.5; break;
      case 'eat': {
        // head down, then a proper chew with the jaw and the ears
        p.headDip = 6.4 + Math.sin(t * TAU) * 0.8; p.headFwd = 2.4; p.front = 3.2; p.rear = -1;
        p.jaw = Math.abs(Math.sin(t * TAU * 3)) * 1.5;
        p.bob = 0.3 + Math.sin(t * TAU * 3) * 0.3;
        p.earFlop = Math.sin(t * TAU * 3) * 0.6;
        p.blink = f === 6 ? 1 : 0;
        break;
      }
      case 'graze': p.headDip = 6.2 + Math.sin(t * TAU) * 1.2; p.headFwd = 2; p.front = 2.6; p.jaw = Math.abs(Math.sin(t * TAU * 2)) * 0.9; p.headSw = Math.sin(t * TAU) * 1.4; break;
      case 'dig': {
        const a = Math.sin(t * TAU * 2), b = Math.sin(t * TAU * 2 + Math.PI);
        p.leg = [0, 0, Math.max(0, a) * 6, Math.max(0, b) * 6];
        p.legX = [0, 0, Math.max(0, a) * 2.4, Math.max(0, b) * 2.4];
        p.knee = [0, 0, Math.max(0, a), Math.max(0, b)];
        p.headDip = 4.4 + Math.sin(t * TAU * 2) * 0.8; p.headFwd = 1.6; p.front = 3.6; p.rear = -2.4; p.jaw = 0.4;
        p.bob = Math.sin(t * TAU * 2) * 0.6;
        break;
      }
      case 'happy': {
        const lift = [0, -4, -7, -8, -7, -4, -1, 0][f];
        p.bob = lift; p.tuck = lift < -5 ? 0.7 : 0; p.ear = 1; p.jaw = 0.9;
        p.squash = f === 0 || f === 7 ? 0.14 : -0.06;
        p.earFlop = lift < -4 ? -1.2 : 0.6; p.tail = Math.sin(t * TAU * 2) * 1.6;
        break;
      }
      case 'pray': p.sit = 1; p.reach = 0.6 + s * 0.22; p.bob = s * 0.4; p.blink = f === 6 ? 1 : 0; p.ear = 1; p.breathe = s * 0.4; break;
      case 'bite': p.sit = 1; p.reach = 1; p.jaw = f > 3 ? 1.5 : 0.2; p.bob = -s * 0.5; p.ear = 1; break;
    }
    return p;
  }

  // ---- the wombat ---------------------------------------------------------
  // Drawn pixel for pixel after the reference sheet. The face is turned toward
  // you in three-quarters, so both bead eyes show over one big dark square
  // muzzle; two small square ears; the back slopes down to a round rump; four
  // short dark legs. Flat colours, a few blocky shadows, one dark line.
  //
  // The art is authored facing left, as it is on the sheet, and mirrored.
  //   o line   b fur   l light   s shade   m muzzle   e eye   c cheek
  //   i inner ear   j lip (a tongue when the mouth is open)
  const TPL_SIDE = [
    '..ooo.......ooo.............',
    '.oiio......oiiio............',
    '.obibooooooobibo............',
    '.obbbbbbbbbbbbbbooo.........',
    'obbllbbbbbbbbbbbbbbooo......',
    'oblllbbbbbbbbbbbbbbbbboo....',
    'obllbbbbbbbbbbbsbbbbbbbbo...',
    'obbbbbbbbbbbbbbsbbbbbllbbo..',
    'obbeebbbbbbeebbsbbbbbbbbbbo.',
    'obbeebbbbbbeebsbbbbbbbbbbbo.',
    'obbbbbbbbbbbbbsbbbbbbbbbbbo.',
    'obccbmmmmmmbccsbbbbbbbbbbbo.',
    'occcbmmmmmmbccsbbbbbbbbbbbo.',
    'obccbmmmmmmbcbsbbbbbbbbbbbo.',
    'obbbbmmmmmmbbbsbbbbbbbbbbso.',
    'obbbbljjjjlbbssbbbbbbbbbbso.',
    '.obbssssssssssbbbbbbbbbbbso.',
    '..oobbbbbbbbbbbbbbbbbbbbsso.',
    '...obbbbbbbbbbbbbbbbbbbbsso.',
    '...osbbbbbbbbbbbbbbbbbbssso.',
    '...ossssssssssssssssssssso..',
    '...ooooooooooooooooooooooo..',
  ];
  const HEAD_X = 15;                          // columns left of this are the head
  const LEGS_SIDE = [3, 9, 16, 22];           // front far, front near, hind far, hind near
  const mirrorRows = (half) => half.map((r) => r + r.split('').reverse().join(''));
  const TPL_FRONT = mirrorRows([
    '..ooo.....',
    '.oiio.....',
    '.obibooooo',
    'obbbbbbbbb',
    'obllbbbbbb',
    'obbbbbbbbb',
    'obbeebbbbb',
    'obbeebbbbb',
    'obbbbbbbbb',
    'occcbbbmmm',
    'occcbbbmmm',
    'obccbbbmmm',
    'obbbbbbmmm',
    'obbbbbbljj',
    '.obsssssss',
    'obsbbbbbbb',
    'obsbbbbbll',
    'obsbbbbbll',
    'obsbbbbbll',
    'obssbbbbbb',
    'obssbbbbbs',
    'osssssssss',
    'oooooooooo',
  ]);
  const TPL_BACK = mirrorRows([
    '..ooo.....',
    '.obbo.....',
    '.obbbooooo',
    'obbbbbbbbb',
    'obllbbbbbb',
    'obbbbbbbbb',
    'obbbbbbbbb',
    'obbbbbbbbs',
    'obbbbbbbbb',
    'obbbbbbbbb',
    'obbbbbbbbb',
    'obsbbbbbbb',
    'obsbbbbbbb',
    'obsbbbbbss',
    'obssbbbbso',
    'obssbbbbbo',
    'obsssbbbbb',
    'osssssssss',
    'oooooooooo',
  ]);
  const TPL_LIE = [
    '..ooo.......ooo................',
    '.oiio......oiiio...............',
    '.obibooooooobiboooooooooooo....',
    '.obbbbbbbbbbbbbbbbbbbbbbbbbboo.',
    'obbllbbbbbbbbbbsbbbbbbbbbllbbbo',
    'obbeebbbbbbeebbsbbbbbbbbbbbbbbo',
    'obbeebbbbbbeebsbbbbbbbbbbbbbbbo',
    'occcbmmmmmmbccsbbbbbbbbbbbbbbbo',
    'occcbmmmmmmbccsbbbbbbbbbbbbbbso',
    'obbbbmmmmmmbbbsbbbbbbbbbbbbbsso',
    'obbbbljjjjlbbssbbbbbbbbbbbbssso',
    '.osssssssssssssssssssssssssssso',
    '..ooooooooooooooooooooooooooooo',
  ];

  function drawWombat(g, fur, name, f, ageKey) {
    const p = pose(name, f);
    const A = AGE[ageKey] || AGE.adult;
    const K = A.k;
    const PX = (x, y, col) => Art.rect(g, AX + (x - AX) * K, GY + (y - GY) * K, K + 0.02, K + 0.02, col);
    const ear = U.mix(fur.light, '#f2b294', 0.45);
    const COL = { o: fur.ink, b: fur.base, l: fur.light, s: fur.mid, m: fur.nose, c: fur.light, i: ear, j: fur.light, e: fur.ink, d: fur.dark, D: fur.deep };
    const shut = p.blink || p.sleep || p.hurt > 0.5;
    const happyEye = name === 'happy';
    const jaw = p.jaw > 0.6;
    // Lay a template down. `hx` is how many columns count as the head, which
    // can be dipped or pushed forward on its own for eating and digging.
    const lay = (rows, x0, y0, o = {}) => {
      const w = rows[0].length;
      for (let y = 0; y < rows.length; y++) {
        const row = rows[y];
        for (let x = 0; x < row.length; x++) {
          let ch = row[x];
          if (ch === '.' || ch === ' ') continue;
          const head = o.headCols != null && x < o.headCols;
          const dy = head ? (o.headDy || 0) : 0;
          if (ch === 'e') {
            // a bead, or a shut eye: the top row goes to fur, the bottom stays dark
            const top = y < rows.length && rows[y - 1] && rows[y - 1][x] !== 'e';
            if (shut) ch = top ? 'b' : 'o';
            else if (happyEye) ch = top ? 'o' : 'b';
          }
          let col = COL[ch] || fur.base;
          if (ch === 'j' && jaw) col = y % 2 ? '#c4566a' : fur.ink;
          // a shine in each eye, top outer corner
          const xx = o.mirror ? x0 + (w - 1 - x) : x0 + x;
          PX(xx, y0 + y + dy, col);
        }
      }
    };
    // a short leg: a dark column with a line round it and a darker foot
    const leg = (x, top, len, lift, fx) => {
      const y1 = top + len - lift;
      for (let y = top; y <= y1; y++) {
        PX(x - 1 + fx, y, fur.ink); PX(x + 3 + fx, y, fur.ink);
        for (let k = 0; k < 3; k++) PX(x + k + fx, y, y >= y1 - 1 ? fur.dark : y <= top + 1 ? fur.mid : U.mix(fur.mid, fur.dark, 0.5));
      }
      for (let k = -1; k < 4; k++) PX(x + k + fx, y1 + 1, fur.ink);
    };
    const zzz = () => {
      for (let i = 0; i < 3; i++) {
        const u = (p.z + i / 3) % 1;
        if (u > 0.86) continue;
        const zx = AX + 8 + u * 6, zy = GY - 20 - u * 12, zc = u > 0.58 ? '#d8d4ff' : '#b8b0f0';
        for (let k = 0; k < 3; k++) { PX(zx + k, zy, zc); PX(zx + k, zy + 2, zc); }
        PX(zx + 1, zy + 1, zc);
      }
    };
    const stars = () => {
      if (p.hurt <= 0) return;
      for (let i = 0; i < 3; i++) { const a = p.hurt * 4 + i * 2.1; PX(AX + 4 + Math.cos(a) * 6, GY - 26 + Math.sin(a) * 2, PAL.gold3); }
    };
    const bob = Math.round(p.bob || 0);

    // ---- the turn: straight at you, or straight away ------------------------
    if (p.view === 'quarter' || p.view === 'back') {
      const rows = p.view === 'back' ? TPL_BACK : TPL_FRONT;
      const x0 = AX - 10, y0 = GY - rows.length - 3;
      for (const lx of [2, 6, 12, 16]) leg(x0 + lx, y0 + rows.length - 2, 3, 0, 0);
      lay(rows, x0, y0);
      if (p.view === 'back') { PX(AX - 1, y0 + 14, fur.ink); PX(AX, y0 + 14, fur.ink); PX(AX - 1, y0 + 15, fur.dark); PX(AX, y0 + 15, fur.dark); }
      return;
    }
    // ---- sitting up, facing you ---------------------------------------------
    if (p.sit) {
      const rows = TPL_FRONT;
      const x0 = AX - 10, y0 = GY - rows.length - 2 + Math.round(p.breathe * 0.4);
      for (const lx of [2, 15]) leg(x0 + lx, y0 + rows.length - 2, 2, 0, 0);
      lay(rows, x0, y0);
      // the front paws in its lap, raised a little when it reaches
      const py = y0 + 14 - Math.round((p.reach || 0) * 3);
      for (const px of [x0 + 5, x0 + 12]) { PX(px, py, fur.ink); PX(px + 1, py, fur.ink); PX(px + 2, py, fur.ink); PX(px, py + 1, fur.dark); PX(px + 1, py + 1, fur.dark); PX(px + 2, py + 1, fur.dark); }
      stars();
      return;
    }
    // ---- lying down ------------------------------------------------------------
    if (p.lie) {
      const rows = TPL_LIE;
      const x0 = AX - 15, y0 = GY - rows.length + 1 - Math.round(Math.max(0, p.breathe) * 0.5);
      lay(rows, x0, y0, { mirror: true });
      if (p.sleep) zzz();
      return;
    }
    // ---- the side view, and everything that walks ------------------------------
    const rows = TPL_SIDE;
    const W2 = rows[0].length;
    const x0 = AX - 14 + Math.round((p.headFwd || 0) * 0.3);
    const legLen = 4;
    const y0 = GY - rows.length - legLen + bob;
    const headDy = Math.round(Math.min(4, (p.headDip || 0) * 0.5));
    // legs first, so the body sits on them; far pair a step back
    if (p.tuck < 1) {
      LEGS_SIDE.forEach((lx, i) => {
        // the pose table orders legs [rear far, rear near, front far, front near]
        const pi = [2, 3, 0, 1][i];
        const lift = Math.round(U.clamp((p.leg[pi] || 0) * 0.6 + p.tuck * 3, 0, 3));
        const fx = Math.round(U.clamp(-(p.legX[pi] || 0) * 0.45, -2, 2));
        leg(x0 + (W2 - 1 - lx) - 2, y0 + rows.length - 2, legLen + (bob < 0 ? -bob : 0), lift, fx);
      });
    }
    lay(rows, x0, y0, { mirror: true, headCols: HEAD_X, headDy });
    stars();
  }

  function wombatKey(name, f, pelt, facing, age) { return `w:${name}:${f}:${pelt}:${facing}:${age}`; }
  function wombat(name, frame, pelt, facing, age = 'adult') {
    const n = POSES[name] || 1;
    const f = ((frame % n) + n) % n;
    const key = wombatKey(name, f, pelt, facing, age);
    let img = cache.get(key);
    if (img) return img;
    const { c, g } = Art.cv(AW + 4, AH + 2 + PAD);
    const fur = typeof pelt === 'string' ? (FUR_BY_KEY[pelt] || FUR[0]) : FUR[pelt % FUR.length];
    g.save(); g.translate(0, PAD);
    drawWombat(g, fur, name, f, age);
    g.restore();
    img = facing < 0 ? Art.flip(c) : c;
    cache.set(key, img);
    return img;
  }
  // (x, y) is the ground point under the feet
  function blit(g, x, y, name, frame, pelt, facing, age = 'adult', scale = S, squash = 0) {
    const img = wombat(name, frame, pelt, facing, age);
    const dw = img.width * scale * (1 - squash * 0.45);
    const dh = img.height * scale * (1 + squash);
    const ax = (facing < 0 ? img.width - AX : AX) / img.width;
    g.drawImage(img, Math.round(x - dw * ax), Math.round(y + 2 - dh * (GY + PAD + 1) / img.height), dw, dh);
  }
  // the same sprite, laid flat on the ground and leaning away from the sun
  function shadow(g, x, y, name, frame, pelt, facing, age = 'adult', scale = S, squash = 0) {
    const img = wombat(name, frame, pelt, facing, age);
    const dw = img.width * scale * (1 - squash * 0.45);
    const dh = img.height * scale * (1 + squash);
    const ax = (facing < 0 ? img.width - AX : AX) / img.width;
    Art.castShadow(g, img, x, y + 1, dw, dh, { alpha: 0.3, lean: 0.6, squash: 0.28, anchor: ax });
  }
  function furOf(pelt) { return typeof pelt === 'string' ? (FUR_BY_KEY[pelt] || FUR[0]) : FUR[pelt % FUR.length]; }

  // ---- Aunt Fern: the neighbour, in a long knitted dress and a hood --------
  // Human proportions, not a cone: narrow shoulders, a long dress with a
  // slight flare, arms that hang and swing, and a round kind face looking out
  // of a hood with a pair of knitted wombat ears on it.
  const CULT_POSES = { idle: 6, walk: 6, run: 6, turn: 6, jump: 5, cast: 6, hurt: 3, sit: 3, sleep: 4,
    laugh: 6, shrug: 4, clap: 6, point: 4, nod: 6, shake: 6, bow: 5, wave: 6, cheer: 6, sulk: 4 };
  const CW = 52, CH = 84, CX = 26, CGY = 81;   // wide enough for the robe, tall enough for the cowl
  // ---- what the face is doing --------------------------------------------
  // One place for every expression the guide can wear, so new dialogue can ask
  // for a mood by name and get eyes and a mouth that match.
  const FACES = {
    idle:   { eye: 'narrow', brow: -0.5, mouth: 'smirk' },
    talk:   { eye: 'open',  brow: 0.4,   mouth: 'open' },
    happy:  { eye: 'happy', brow: 0.5,   mouth: 'grin' },
    proud:  { eye: 'squint', brow: 0.6,  mouth: 'grin' },
    cross:  { eye: 'narrow', brow: -0.8, mouth: 'frown' },
    worry:  { eye: 'wide',  brow: -0.4,  mouth: 'wobble' },
    shock:  { eye: 'wide',  brow: 0.9,   mouth: 'o' },
    think:  { eye: 'look',  brow: 0.2,   mouth: 'flat' },
    tired:  { eye: 'shut',  brow: -0.2,  mouth: 'wobble' },
    sly:    { eye: 'narrow', brow: 0.5,  mouth: 'smirk' },
  };
  let faceMood = 'sly';
  function setFace(m) { if (FACES[m] && m !== faceMood) { faceMood = m; } }
  // Under the hood there is nothing but shadow and two lights. The mood table
  // still drives them: the eye shape and the brow angle carry the whole
  // performance, because there is no face left to read.
  // Two white lights in the dark of the hood. The mood table still drives them:
  // the eye shape and the brow angle carry the whole performance, because
  // there is nothing else in there to read.
  function expressions(g, hx, faceY, pose, f, hurt) {
    const GL0 = 'rgba(240,140,130,0.45)', GL1 = '#2a1810', GL2 = '#3a2418', GL3 = '#4a2e1e';
    let m = FACES[faceMood] || FACES.idle;
    if (hurt > 0) m = FACES.shock;
    else if (pose === 'cast') m = FACES.proud;
    else if (pose === 'sleep') m = FACES.tired;
    const ey = faceY + 1;
    const blink = pose === 'idle' && f === 3;
    const shut = m.eye === 'shut' || blink;
    const sep = 3.8;
    // A tight halo on each one. Anything wider and the two of them run
    // together into a single band and he reads as a man in ski goggles.
    for (const s2 of [-1, 1]) Art.ell(g, hx + s2 * (sep + 1.6), ey + 2.6, 1.8, 1.1, GL0);   // rosy cheeks
    if (shut) {
      for (const s2 of [-1, 1]) {
        Art.rect(g, hx + s2 * sep - 1.6, ey, 3.2, 1, GL1);
        Art.rect(g, hx + s2 * sep - 1.1, ey, 2.2, 1, GL2);
      }
      return;
    }
    for (const s2 of [-1, 1]) {
      const ex = hx + s2 * sep;
      if (m.eye === 'happy') {                       // two curved slits, turned up
        Art.poly(g, [[ex - 2, ey + 1.1], [ex, ey - 1.5], [ex + 2, ey + 1.1], [ex, ey + 0.1]], GL1);
        Art.poly(g, [[ex - 1.4, ey + 0.7], [ex, ey - 0.9], [ex + 1.4, ey + 0.7], [ex, ey - 0.1]], GL3);
        continue;
      }
      const rw = m.eye === 'wide' ? 1.5 : m.eye === 'narrow' ? 1.2 : 1.3;
      const rh = m.eye === 'wide' ? 1.8 : m.eye === 'narrow' ? 1 : 1.5;
      const off = m.eye === 'look' ? 0.9 : 0;
      Art.ell(g, ex, ey, rw + 0.5, rh + 0.5, GL1);
      Art.ell(g, ex + off, ey, rw, rh, GL2);
      Art.ell(g, ex + off, ey, rw * 0.66, rh * 0.62, GL3);
      Art.rect(g, ex + off - rw * 0.5, ey - rh * 0.5, 1, 1, '#ffffff');
    }
    // Each eye gets its own short brow, angled by the mood. It used to be one
    // bar across both of them, which made him look like a man in ski goggles.
    for (const s2 of [-1, 1]) {
      const bx = hx + s2 * sep;
      const tilt = m.brow * s2 * 1.1;
      Art.poly(g, [[bx - 1.9, ey - 3.4 - tilt], [bx + 1.9, ey - 3.4 + tilt],
                   [bx + 1.9, ey - 2.5 + tilt], [bx - 1.9, ey - 2.5 - tilt]], 'rgba(150,140,130,0.8)');
    }
    // and a thin mouth of light, when the mood has one
    const MO = '#8a3a2e';
    if (m.mouth === 'o' || m.mouth === 'open') Art.ell(g, hx, ey + 4.4, 1.2, 1.3, MO);
    else if (m.mouth === 'grin') {
      Art.poly(g, [[hx - 2.4, ey + 3.8], [hx + 2.4, ey + 3.8], [hx + 1.4, ey + 5.2], [hx - 1.4, ey + 5.2]], MO);
      Art.rect(g, hx - 1.2, ey + 4.6, 2.4, 0.8, '#e07a6a');
    } else if (m.mouth === 'smirk') Art.poly(g, [[hx - 1.8, ey + 4], [hx + 1.8, ey + 4], [hx + 0.8, ey + 5], [hx - 0.8, ey + 5]], MO);
    else if (m.mouth === 'frown') Art.poly(g, [[hx - 2.2, ey + 5.2], [hx, ey + 3.9], [hx + 2.2, ey + 5.2], [hx, ey + 4.6]], MO);
    else if (m.mouth === 'wobble') { for (let i = -1; i <= 1; i++) Art.rect(g, hx + i * 1.6 - 0.7, ey + 4.4 + (i % 2 ? 0.9 : 0), 1.4, 1, MO); }
    else Art.rect(g, hx - 1.2, ey + 4.4, 2.4, 1, MO);
  }

  function cultist(frame, pose = 'idle') {
    const n = CULT_POSES[pose] || 1, f = ((frame % n) + n) % n, t = f / n;
    const key = `cult:${f}:${pose}:${faceMood}`;
    let img = cache.get(key); if (img) return img;
    const { c, g } = Art.cv(CW, CH);
    // A big man in a wombat-skin cowl and a robe to the floor. Nothing of him
    // shows but two hands and two lights where his eyes should be.
    // a sage-green knitted dress, a cream wool hood with wombat ears, a
    // red gingham apron tie, and a pair of good brown garden boots
    const ROBE0 = '#35593a', ROBE1 = '#4f8050', ROBE2 = '#679c63', ROBE3 = '#8bbd7a';
    const FUR0 = '#b08a62', FUR1 = '#d2ad82', FUR2 = '#ecd0a6';
    const SASH0 = '#b0403e', SASH1 = '#e06a5e', SASH2 = '#ffa898';
    const BOOT0 = '#4a3222', BOOT1 = '#6e4a30', BOOT2 = '#9a6e48';
    const BRD0 = '#6a5630';
    const GOLD = '#f2e0b0', GOLD2 = '#fff6dc', TEAL2 = '#ffd45e';
    const VOID = '#f2c8a2';
    const SK0 = '#c9906a', SK1 = '#e6b08a', SK2 = '#f6cfa8';
    const S = Math.sin(t * TAU);
    let bob = 0, lean = 0, flare = 0, hemUp = 0, armL = 0, armR = 0, view = 'front';
    let sit = 0, lie = 0, hurt = 0, staff = 0, spark = 0, stride = 0, clasp = 1;
    switch (pose) {
      case 'idle': bob = [0, 0, 1, 1, 0, 0][f]; armL = S * 0.5; armR = -S * 0.5; break;
      case 'walk': stride = S * 1.6; flare = Math.abs(S) * 0.9; bob = -Math.abs(Math.sin(t * TAU * 2)) * 2.2;
        armL = -S * 2.6; armR = S * 2.6; clasp = 0; break;
      case 'run': lean = 1.6; stride = S * 1.9; flare = 1.6 + Math.abs(S) * 1.2; hemUp = 5;
        bob = -Math.abs(Math.sin(t * TAU * 2)) * 3.4; armL = -S * 4 - 2; armR = S * 4 - 2; clasp = 0; break;
      case 'turn': view = ['front', 'quarter', 'back', 'back', 'quarter', 'front'][f]; break;
      case 'jump': bob = [1, -9, -15, -9, 1][f]; hemUp = [0, 4, 7, 4, 0][f]; flare = [0, 2, 3, 2, 0][f];
        armL = armR = [0, -6, -9, -6, 0][f]; clasp = 0; break;
      case 'cast': staff = Math.min(1, f / 2); spark = f >= 3 ? f - 2 : 0;
        armL = -2 - staff * 2; armR = -7 - staff * 9; bob = f >= 3 ? -1 : 0; clasp = 0; break;
      case 'hurt': hurt = [1, 0.6, 0.2][f]; lean = -3.5 * hurt; bob = hurt * 1.8; clasp = 0; break;
      case 'sit': sit = 1; bob = [0, 0.5, 0][f]; clasp = 1; break;
      case 'sleep': lie = 1; break;
      // ---- the cuter half of him -------------------------------------------
      case 'laugh': bob = [0, -2, -3, -3, -2, 0][f]; lean = S * 1.4;
        armL = -4 - Math.abs(S) * 3; armR = -4 - Math.abs(S) * 3; clasp = 0; break;
      case 'shrug': bob = [0, -1, -1, 0][f]; armL = [0, -6, -7, -2][f]; armR = [0, -6, -7, -2][f];
        flare = [0, 0.6, 0.8, 0.2][f]; clasp = 0; break;
      case 'clap': bob = [0, -1, 0, -1, 0, -1][f];
        armL = [-6, -3, -6, -3, -6, -3][f]; armR = [-6, -3, -6, -3, -6, -3][f]; clasp = 0; break;
      case 'point': armR = -16; armL = 0; bob = [0, -1, -1, 0][f]; clasp = 0; break;
      case 'nod': bob = [0, 1.6, 2.4, 2.4, 1.6, 0][f]; break;
      case 'shake': lean = Math.sin(t * TAU * 2) * 2.2; bob = [0, 0, 1, 1, 0, 0][f]; break;
      case 'bow': bob = [0, 3, 5, 3, 0][f]; lean = [0, 2, 3.4, 2, 0][f]; hemUp = [0, 1, 2, 1, 0][f]; break;
      case 'wave': armR = -14 - Math.abs(Math.sin(t * TAU * 2)) * 6; bob = [0, -1, -1, 0, -1, -1][f]; clasp = 0; break;
      case 'cheer': bob = [0, -4, -7, -7, -4, 0][f]; armL = -18; armR = -18;
        flare = [0, 1.4, 2.2, 2.2, 1.4, 0][f]; hemUp = [0, 2, 4, 4, 2, 0][f]; clasp = 0; break;
      case 'sulk': bob = [1.4, 1.4, 2, 2][f]; lean = -1.2; armL = 2; armR = 2; clasp = 1; break;
    }
    g.save();
    if (lean) { g.translate(CX, CGY); g.transform(1, 0, lean * 0.05, 1, 0, 0); g.translate(-CX, -CGY); }

    if (lie) {
      // curled up on his side with the cowl for a pillow, which is the single
      // cutest thing a seven-foot hooded stranger can do
      const by = CGY - 10 + Math.sin(f * 1.6) * 0.6;
      Art.ell(g, 30, by + 5, 17, 5, 'rgba(0,0,0,0.3)');                      // shadow
      Art.ell(g, 30, by, 17, 8, ROBE0);                                      // the heap of robe
      Art.ell(g, 30, by - 1, 15.4, 6.8, ROBE1);
      Art.ellBand(g, 30, by - 2, 14, 6, ROBE2, 0, 0.5);
      for (let i = 0; i < 5; i++) Art.rect(g, 20 + i * 5, by + 2, 2.4, 2, SASH1);   // the sash folds
      Art.ell(g, 44, by + 2, 6, 3.4, ROBE1);                                 // the hem trailing off
      Art.ell(g, 14, by - 3, 10, 8.4, FUR0);                                 // the cowl, as a pillow
      Art.ell(g, 14, by - 4, 8.8, 7.2, FUR1);
      Art.ell(g, 12, by - 6, 4, 2.6, FUR2);
      Art.ell(g, 13, by - 1.5, 5.4, 4.4, SK1);                               // her face, fast asleep
      for (const s2 of [-1, 1]) Art.rect(g, 12.4 + s2 * 2.2 - 1, by - 2, 2, 1, '#3a2418');
      Art.ell(g, 12.4, by + 0.6, 1.4, 0.8, 'rgba(240,140,130,0.6)');
      Art.ell(g, 12, by - 9, 3.6, 2.4, FUR2);                                // an ear flopped over
      Art.ell(g, 22, by + 3, 3, 2.2, SK1);                                   // a hand tucked under
      const zs = [[26, 16], [31, 10], [36, 5]][f % 3];                       // and three sleepy Zs
      const za = 0.85 - (f % 3) * 0.2;
      g.globalAlpha = za;
      Font.draw(g, 'z', zs[0], zs[1], { scale: 1, color: '#fff6dc' });
      g.globalAlpha = 1;
      g.restore(); Art.outline(c, '#000000', 1); cache.set(key, c); return c;
    }

    // ---- the skeleton ------------------------------------------------------
    // Still a big man underneath, but nothing of him shows except his hands
    // and whatever the hood lets out. Every joint is a point; the robe is hung
    // off them.
    const y0 = bob;
    const hoodTop = (sit ? 22 : 10) + y0;
    const headTop = hoodTop + 4;                // crown of the skull, inside the hood
    const chin    = headTop + 12;
    const neckBot = chin + 4;
    const shoulder = neckBot;
    const chestY  = shoulder + 7;
    const waist   = shoulder + 16;
    const hip     = sit ? shoulder + 18 : shoulder + 23;
    const hem     = (sit ? hip + 14 : CGY - 1) - hemUp;
    const shW = 13;                             // half-width at the shoulders
    const chW = 14;
    const blW = 15.4 + flare * 0.25;            // the belly, the widest part by a long way
    const hipW = 14.6;
    const hemW = 18.4 + flare * 1.1;            // where the robe meets the floor

    // the skirt: a tapered sweep with a ragged, weighted hem
    const skirt = (k, col) => Art.poly(g, [
      [CX - hipW * k, hip], [CX + hipW * k, hip],
      [CX + hemW * k, hem], [CX - hemW * k, hem]], col);
    skirt(1.06, ROBE0);
    skirt(1, ROBE1);
    Art.poly(g, [[CX - hipW, hip], [CX - hipW * 0.2, hip],
                 [CX - hemW * 0.26, hem], [CX - hemW, hem]], ROBE2);      // the lit side
    Art.poly(g, [[CX + hipW * 0.45, hip], [CX + hipW, hip],
                 [CX + hemW, hem], [CX + hemW * 0.5, hem]], ROBE0);       // and the shadowed one
    for (let i = -3; i <= 3; i++) {                                        // folds hanging straight
      if (!i) continue;
      const u = i / 3.4;
      Art.limb(g, CX + u * hipW * 0.8, hip + 1, CX + u * hemW * 0.86 + stride * u * 0.7, hem - 1,
        1.4, 2.2, i % 2 ? ROBE0 : ROBE2);
    }
    // Two boots, out in front of the hem rather than buried behind it. He has
    // feet; you should be able to see them when he uses them.
    if (!sit && Math.abs(stride) > 0.25) {
      for (const s2 of [-1, 1]) {
        const lift = stride * s2 > 0 ? 1.6 : 0;
        const fx = CX + s2 * 5.5 + stride * s2 * 4.5;
        Art.rect(g, fx - 4.2, hem - 3.5 - lift, 8.4, 5.4, '#100c14');
        Art.rect(g, fx - 4, hem - 3 - lift, 8, 4.4, BOOT1);
        Art.rect(g, fx - 4, hem - 3 - lift, 8, 1.4, BOOT2);
        Art.rect(g, fx - 4.8, hem + 1 - lift, 9.6, 1.8, '#100c14');
      }
    }
    for (let i = 0; i < 9; i++) {                                          // the ragged hem
      const u = (i / 8 - 0.5) * 2;
      const hx2 = CX + u * hemW;
      Art.poly(g, [[hx2 - 2, hem - 1], [hx2 + 2, hem - 1], [hx2 + 1, hem + 1.6 + (i % 2) * 1.2]], ROBE0);
    }
    Art.rect(g, CX - hemW, hem - 2.4, hemW * 2, 1.2, ROBE3);              // a band of trim
    for (let i = -2; i <= 2; i++) Art.rect(g, CX + i * 5 - 0.8, hem - 3.4, 1.6, 1.6, GOLD);

    // ---- the body of the robe ----------------------------------------------
    const torso = (k, col) => Art.poly(g, [
      [CX - shW * k, shoulder], [CX + shW * k, shoulder],
      [CX + chW * k, chestY], [CX + blW * k, waist + 2],
      [CX + hipW * k, hip + 1], [CX - hipW * k, hip + 1],
      [CX - blW * k, waist + 2], [CX - chW * k, chestY]], col);
    torso(1.06, ROBE0);
    torso(1, ROBE1);
    Art.poly(g, [[CX - shW, shoulder], [CX - shW * 0.34, shoulder],
                 [CX - blW * 0.3, waist + 2], [CX - blW, waist + 2],
                 [CX - chW, chestY]], ROBE2);                             // the lit side
    Art.rect(g, CX - shW + 0.6, shoulder, 1.6, waist - shoulder, ROBE3);  // rim light
    Art.ell(g, CX, waist + 1, blW - 1, 7, ROBE1);                         // the belly's swell
    Art.ell(g, CX - 3.4, waist - 2, blW * 0.42, 3.4, ROBE2);
    // the sash, wound twice and knotted on his left, with two tails hanging
    Art.rect(g, CX - blW - 0.6, waist - 1, blW * 2 + 1.2, 5.4, SASH0);
    Art.rect(g, CX - blW - 0.6, waist - 1, blW * 2 + 1.2, 1.4, SASH1);
    Art.rect(g, CX - blW - 0.6, waist + 3.6, blW * 2 + 1.2, 0.8, '#3a1018');
    Art.ell(g, CX - 4.4, waist + 1.6, 3.4, 3, SASH1);                     // the knot
    Art.ell(g, CX - 4.4, waist + 1, 2, 1.6, SASH2);
    for (const [tx, tl] of [[-8.4, 9], [-5.6, 6.4]]) {                     // the tails
      Art.rect(g, CX + tx, waist + 3.4, 2.1, tl + flare, SASH0);
      Art.rect(g, CX + tx, waist + 3.4, 0.8, tl + flare, SASH1);
      Art.rect(g, CX + tx - 0.3, waist + 3.4 + tl + flare, 2.7, 1.3, GOLD);
    }

    // ---- arms: bell sleeves, and whatever he lets out of them ---------------
    if (!sit || clasp) {
      for (const [s2, sw] of [[-1, armL], [1, armR]]) {
        const sxp = CX + s2 * (shW - 2), syp = shoulder + 2;
        const inward = clasp ? 3.6 : 0;
        const ex = CX + s2 * (blW + 1.6 - inward), ey = chestY + 13 + sw * 0.4;
        const hxx = CX + s2 * (hipW + 1.6 - inward * 1.6) + sw * 0.3;
        const hyy = hip + 1 + sw;
        Art.limb(g, sxp, syp, ex, ey, 7.4, 7.8, ROBE0);                   // the sleeve, widening
        Art.limb(g, sxp, syp, ex, ey, 6.2, 6.6, s2 < 0 ? ROBE2 : ROBE1);
        Art.limb(g, sxp - s2 * 1.4, syp, ex - s2 * 1.4, ey, 2, 2.2, s2 < 0 ? ROBE3 : ROBE2);
        Art.ell(g, ex, ey + 1, 4.4, 2.6, ROBE0);                          // the cuff's dark mouth
        Art.ell(g, ex, ey + 0.6, 3.6, 1.9, '#0b0710');
        Art.rect(g, ex - 4.4, ey - 2.4, 8.8, 1.4, GOLD);                  // gold at the cuff
        // just the fingers, coming out of the dark of the cuff
        Art.limb(g, ex, ey + 1, hxx, hyy, 2.6, 2.2, SK0);
        Art.ell(g, hxx, hyy + 1.6, 2.1, 2.4, SK0);
        Art.ell(g, hxx - s2 * 0.3, hyy + 1.4, 1.6, 1.9, SK1);
        Art.ell(g, hxx - s2 * 0.7, hyy + 0.9, 0.8, 0.8, SK2);
        for (let k2 = 0; k2 < 3; k2++) Art.rect(g, hxx - 1.5 + k2 * 1.2, hyy + 2.8, 0.9, 1.3, SK0);
      }
    }

    // ---- the mantle over his shoulders, and the sigil on it -----------------
    Art.ell(g, CX - shW - 0.4, shoulder + 2, 5.6, 4.6, ROBE0);             // the shoulders under it
    Art.ell(g, CX + shW + 0.4, shoulder + 2, 5.6, 4.6, ROBE0);
    Art.poly(g, [[CX - shW - 2.6, shoulder - 1], [CX + shW + 2.6, shoulder - 1],
                 [CX + shW + 1.4, chestY + 4], [CX, chestY + 8], [CX - shW - 1.4, chestY + 4]], ROBE0);
    Art.poly(g, [[CX - shW - 1.8, shoulder - 0.2], [CX + shW + 1.8, shoulder - 0.2],
                 [CX + shW + 0.8, chestY + 3], [CX, chestY + 6.6], [CX - shW - 0.8, chestY + 3]], ROBE2);
    Art.ell(g, CX - shW + 0.6, shoulder + 1.6, 5, 3.8, ROBE3);             // light catching each shoulder
    Art.ell(g, CX + shW - 0.6, shoulder + 1.8, 4.4, 3.4, ROBE1);
    Art.poly(g, [[CX - shW - 1.8, shoulder - 0.2], [CX - 3, shoulder - 0.2],
                 [CX - 4, chestY + 5], [CX - shW - 0.8, chestY + 3]], ROBE3);
    for (let i = 0; i < 9; i++) {                                          // a scalloped edge
      const u = (i / 8 - 0.5) * 2;
      const sx2 = CX + u * (shW + 1.4);
      const sy2 = chestY + 4 - Math.abs(u) + (1 - Math.abs(u)) * 3.4;
      Art.ell(g, sx2, sy2, 2, 1.6, ROBE0);
      Art.rect(g, sx2 - 0.5, sy2 + 0.8, 1, 1.8, GOLD);
    }
    if (view !== 'back') {
      // a knitted daisy brooch pinned on the front
      const py = chestY - 1;
      for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; Art.ell(g, CX + Math.cos(a) * 2.6, py + Math.sin(a) * 2.4, 1.7, 1.6, '#fffaf0'); }
      Art.ell(g, CX, py, 1.8, 1.7, '#f2c23a');
      Art.rect(g, CX - 0.8, py - 0.8, 1, 1, '#fff2a0');
    }

    // ---- the cowl, and the two lights inside it -----------------------------
    // A wombat's head worn as a hood. It is drawn from the back forward: the
    // dome, then the dark it makes, then whatever is burning in the dark, then
    // the snout pulled down over the top of the opening as a brim.
    // Mood is carried by how he holds his head: FACES is still the table, but
    // the brow value tips the cowl and the eye shape sets how far it is pulled
    // down over the opening.
    const mood = FACES[hurt > 0 ? 'shock' : pose === 'cast' ? 'proud' : pose === 'sleep' ? 'tired' : faceMood] || FACES.idle;
    const tip = U.clamp(mood.brow, -1, 1);
    const hx = (view === 'quarter' ? CX + 1.6 : CX) + tip * 0.9;
    const domeY = hoodTop + 5 - tip * 1.2 + (mood.eye === 'shut' ? 1.4 : 0);
    const faceY = domeY + 3.8;
    for (const s2 of [-1, 1]) {                    // ears: small, round, set on top
      const ex2 = hx + s2 * 8, ey2 = domeY - 6.8;
      Art.ell(g, ex2, ey2, 3.6, 3.8, ROBE0);
      Art.ell(g, ex2, ey2 - 0.2, 2.8, 2.9, FUR1);
      Art.ell(g, ex2 - s2 * 0.4, ey2 + 0.4, 1.5, 1.5, '#2a1a12');
      Art.ell(g, ex2 - s2 * 0.8, ey2 - 1, 1, 0.9, FUR2);
    }
    // The cowl drapes onto the shoulders. Without this the head sits in the
    // air above the mantle with a gap under it.
    Art.poly(g, [[hx - 9, domeY + 2], [hx + 9, domeY + 2],
                 [CX + shW + 1, shoulder + 3], [CX - shW - 1, shoulder + 3]], ROBE0);
    Art.poly(g, [[hx - 8, domeY + 2], [hx + 8, domeY + 2],
                 [CX + shW, shoulder + 2], [CX - shW, shoulder + 2]], ROBE1);
    Art.poly(g, [[hx - 8, domeY + 2], [hx - 2, domeY + 2],
                 [CX - 5, shoulder + 2], [CX - shW, shoulder + 2]], ROBE2);
    for (let i = -2; i <= 2; i++) {                                        // folds down the back of it
      if (!i) continue;
      Art.limb(g, hx + i * 3.4, domeY + 4, CX + i * (shW * 0.42), shoulder + 1, 1.2, 1.8, i % 2 ? ROBE0 : ROBE2);
    }
    Art.ell(g, hx, domeY + 1.8, 11.8, 11, ROBE0);                          // the cowl
    Art.ell(g, hx, domeY + 0.8, 10.9, 9.9, FUR0);
    Art.ell(g, hx - 3.4, domeY - 4.2, 5.4, 3.6, FUR1);                     // light on the crown
    Art.ell(g, hx - 4.6, domeY - 5.2, 2.7, 1.5, FUR2);
    Art.speckle(g, hx, domeY - 1.2, 10, 7.4, FUR1, 26, 91);                // coarse fur
    // the muzzle, high on the face where a wombat's is
    Art.ell(g, hx, domeY - 2.4, 5.4, 3.6, ROBE0);
    Art.ell(g, hx, domeY - 2.8, 4.6, 2.9, FUR0);
    Art.ell(g, hx - 1.6, domeY - 3.8, 2, 1.1, FUR1);
    Art.ell(g, hx, domeY - 1.4, 2.4, 1.5, '#100a12');                      // the nose
    Art.ell(g, hx - 0.9, domeY - 1.9, 1, 0.6, '#3a2c34');
    if (view === 'back') {
      Art.ell(g, hx, domeY + 4, 7, 6, FUR0);
      Art.ell(g, hx, domeY + 4, 6, 5, ROBE1);
    } else {
      // The opening: a hole cut in the front of the head. There is nothing in
      // it. Whatever mood he is in comes out of the set of his shoulders and
      // the tilt of the hood, because there is no face under there to read.
      Art.ell(g, hx, faceY, 8.6, 8, FUR0);                                 // the wool rim
      Art.ell(g, hx, faceY + 0.4, 7.4, 6.9, SK0);                          // and her face in it
      Art.ell(g, hx, faceY + 0.6, 6.8, 6.3, VOID);
      Art.ell(g, hx - 1.8, faceY - 1.4, 3, 2, SK2);
      for (let i = -2; i <= 2; i++) Art.ell(g, hx + i * 2.6, faceY - 5 + Math.abs(i) * 0.6, 2, 1.7, i % 2 ? '#d8d2c8' : '#ece8e0');   // grey curls
      expressions(g, hx, faceY - 0.6, pose, f, hurt);
    }
    // the sides of the cowl, closing in on the opening
    for (const s2 of [-1, 1]) {
      Art.ell(g, hx + s2 * 10.6, faceY - 1.4, 2.8, 6, ROBE0);
      Art.ell(g, hx + s2 * 10.8, faceY - 1.8, 2.1, 5.2, FUR0);
      Art.ell(g, hx + s2 * 11, faceY - 3.6, 1.1, 2.1, FUR1);
    }
    // a little carved wombat on a cord either side of the opening, instead of
    // the two hanging teeth, which read as drips coming off his chin
    for (const s2 of [-1, 1]) {
      const tx2 = hx + s2 * 10.2, ty2 = faceY + 3.4;
      Art.rect(g, tx2 - 0.4, ty2 - 4, 0.8, 4, '#6a5a3a');
      Art.ell(g, tx2, ty2 + 1.4, 2, 1.6, '#8a6440');
      Art.ell(g, tx2 - s2 * 1.2, ty2 + 0.4, 1.3, 1.1, '#a8804e');
      Art.rect(g, tx2 - s2 * 1.8, ty2 - 0.4, 0.9, 0.9, '#8a6440');
      Art.rect(g, tx2 - s2 * 1.7, ty2 + 0.4, 0.6, 0.6, '#2a1a14');
    }

    // ---- waving a sunflower about ------------------------------------------
    if (staff > 0) {
      const sx = CX + hipW + 3, top = shoulder - 12 + (1 - staff) * 6;
      Art.rect(g, sx - 1, top, 3, hem - 12 - top, '#2e5a24');
      Art.rect(g, sx, top, 1.4, hem - 12 - top, '#5e9a3e');
      Art.ell(g, sx - 3, top + 14, 3.4, 1.6, '#5e9a3e');                  // a leaf
      for (let i = 0; i < 10; i++) {                                       // the petals
        const a = i / 10 * TAU + f * 0.2;
        Art.ell(g, sx + 0.5 + Math.cos(a) * 4.6, top - 5 + Math.sin(a) * 4.4, 2, 1.8, i % 2 ? '#f2c23a' : '#ffd95c');
      }
      Art.ell(g, sx + 0.5, top - 5, 3, 2.9, '#7a4a22');
      Art.rect(g, sx - 0.6, top - 6.4, 1.2, 1.2, '#a06a34');
      for (let i = 0; i < spark * 2; i++) {
        const a = i * 1.9 + f, r = 9 + spark * 2.6;
        Art.rect(g, sx + 0.5 + Math.cos(a) * r, top - 5 + Math.sin(a) * r * 0.7, 1.4, 1.4, i % 2 ? GOLD2 : TEAL2);
      }
    }
    g.restore();
    Art.outline(c, '#000000', 1);
    cache.set(key, c);
    return c;
  }

  // ---- Jim ------------------------------------------------------------------
  // The caretaker who shows you the job. A big friendly bloke: swept ginger
  // hair under a red sweatband, black-rimmed glasses, ginger stubble, a grey
  // check fleece with a thick cream collar, a pink shirt over a good belly,
  // brown shorts, and freckled, hairy legs.
  function jim(frame, pose = 'idle') {
    const n = CULT_POSES[pose] || 1, f = ((frame % n) + n) % n, t = f / n;
    const key = `jim:${f}:${pose}:${faceMood}`;
    let img = cache.get(key); if (img) return img;
    const { c, g } = Art.cv(CW, CH);
    const SKIN = '#eeb088', SKIN0 = '#c98460', SKIN2 = '#f8cca4', FRECK = '#c8703a';
    const HAIR = '#e8962e', HAIR0 = '#b8661c', HAIR2 = '#ffc05a';
    const BAND = '#d8342a', BAND2 = '#ff6a50';
    const FLE = '#8e9098', FLE0 = '#6a6c74', FLE2 = '#b4b6bc';
    const COL = '#f4ecdc', COL0 = '#d4c8b4';
    const SHIRT = '#e57e9c', SHIRT0 = '#c05a7c', SHIRT2 = '#ffa6be';
    const SHORT = '#8a6440', SHORT0 = '#664628';
    const SHOE = '#4a3426', SOLE = '#e8e0d0';
    const S2 = Math.sin(t * TAU);
    let bob = 0, stride = 0, armL = 0, armR = 0, sit = 0, lie = 0, lean = 0, hurt = 0, wave = 0, point = 0;
    switch (pose) {
      case 'idle': bob = [0, 0, 1, 1, 0, 0][f]; armL = S2 * 0.6; armR = -S2 * 0.6; break;
      case 'walk': stride = S2 * 3; bob = -Math.abs(Math.sin(t * TAU * 2)) * 1.6; armL = -S2 * 3; armR = S2 * 3; break;
      case 'run': stride = S2 * 4.4; bob = -Math.abs(Math.sin(t * TAU * 2)) * 2.6; armL = -S2 * 5; armR = S2 * 5; lean = 1; break;
      case 'jump': bob = [1, -8, -13, -8, 1][f]; armL = armR = [0, -6, -10, -6, 0][f]; break;
      case 'cheer': bob = [0, -3, -6, -6, -3, 0][f]; armL = armR = -14; break;
      case 'laugh': bob = [0, -1, -2, -2, -1, 0][f]; lean = S2; break;
      case 'clap': armL = armR = [-5, -2, -5, -2, -5, -2][f]; break;
      case 'wave': wave = 1; armR = -12 - Math.abs(Math.sin(t * TAU * 2)) * 5; break;
      case 'point': point = 1; armR = -9; break;
      case 'cast': wave = 1; armR = -14; bob = f >= 3 ? -1 : 0; break;
      case 'shrug': armL = armR = [0, -5, -6, -2][f]; break;
      case 'nod': bob = [0, 1, 2, 2, 1, 0][f]; break;
      case 'shake': lean = Math.sin(t * TAU * 2) * 1.6; break;
      case 'bow': bob = [0, 2, 4, 2, 0][f]; break;
      case 'hurt': hurt = [1, 0.6, 0.2][f]; bob = hurt * 1.5; break;
      case 'sulk': bob = 1; armL = armR = 2; break;
      case 'sit': sit = 1; break;
      case 'sleep': sit = 1; lie = 1; break;
    }
    g.save();
    if (lean) { g.translate(CX, CGY); g.transform(1, 0, lean * 0.04, 1, 0, 0); g.translate(-CX, -CGY); }
    const y0 = bob + (sit ? 10 : 0);
    const R = (x, y, w, h, col) => Art.rect(g, x, y, w, h, col);
    const E = (x, y, rx, ry, col) => Art.ell(g, x, y, rx, ry, col);
    // ---- legs and shoes ---------------------------------------------------
    const hipY = 58 + y0;
    for (const s2 of [-1, 1]) {
      const fx = CX + s2 * 7 + (sit ? s2 * 2 : stride * s2 * 0.6);
      if (sit) {
        // sat down: thighs forward, shins hanging
        R(fx - 5, hipY - 1, 10, 7, SHORT); R(fx - 5, hipY + 5, 10, 1, SHORT0);
        R(fx - 3.5, hipY + 6, 7, 12, SKIN); R(fx + 1.5, hipY + 6, 2, 12, SKIN0);
        for (let i = 0; i < 4; i++) R(fx - 2 + (i % 2) * 3, hipY + 8 + i * 3, 1, 1, FRECK);
        R(fx - 4, hipY + 18, 9, 4, SHOE); R(fx - 4, hipY + 21, 9, 1, SOLE);
        continue;
      }
      const lift = stride * s2 > 1 ? 1.5 : 0;
      R(fx - 3.5, hipY + 4, 7, CGY - hipY - 8 - lift, SKIN);                       // the leg
      R(fx + 1.5, hipY + 4, 2, CGY - hipY - 8 - lift, SKIN0);
      for (let i = 0; i < 5; i++) R(fx - 2 + (i % 2) * 3, hipY + 6 + i * 3.4, 1, 1.4, FRECK);   // hairy
      R(fx - 4.5, CGY - 5 - lift, 10, 4, SHOE); R(fx - 4.5, CGY - 2 - lift, 10, 2, SOLE);       // the shoe
      R(fx - 2, CGY - 5 - lift, 3, 1, '#7a5a44');
    }
    // ---- shorts -------------------------------------------------------------
    if (!sit) {
      R(CX - 13, hipY - 4, 26, 10, SHORT);
      R(CX - 13, hipY + 4, 26, 2, SHORT0);
      R(CX - 1, hipY, 2, 6, SHORT0);
    }
    // ---- body: a pink shirt over a round belly, the fleece open over it -----
    const chestY = 33 + y0;
    E(CX, chestY + 14, 14.5, 13, SHIRT0);                           // the belly
    E(CX, chestY + 13, 13.5, 12, SHIRT);
    E(CX - 4, chestY + 9, 5, 4, SHIRT2);
    R(CX - 7, chestY + 4, 14, 3, SHIRT0);                             // a fold across the chest
    for (const s2 of [-1, 1]) {                                       // the fleece, open at the front
      Art.poly(g, [[CX + s2 * 7, chestY - 4], [CX + s2 * 16, chestY - 2], [CX + s2 * 17.5, chestY + 24], [CX + s2 * 11, chestY + 26], [CX + s2 * 9, chestY + 10]], FLE);
      Art.poly(g, [[CX + s2 * 14, chestY - 1], [CX + s2 * 16, chestY - 2], [CX + s2 * 17.5, chestY + 24], [CX + s2 * 15, chestY + 25]], s2 < 0 ? FLE2 : FLE0);
      for (let i = 0; i < 5; i++) R(CX + s2 * (10 + (i % 2) * 3), chestY + 2 + i * 5, 2, 1, FLE0);   // the check in it
    }
    // ---- arms -------------------------------------------------------------------
    for (const [s2, sw] of [[-1, armL], [1, armR]]) {
      const sx = CX + s2 * 15, sy = chestY;
      const up = (s2 > 0 && (wave || point)) || (pose === 'cheer' || pose === 'jump');
      const hx = up ? sx + (point ? 10 : 4) : sx + s2 * 2 + sw * 0.3, hy = up ? sy - 10 + (point ? 8 : 0) : sy + 22 + sw * 0.6;
      Art.limb(g, sx, sy, hx, hy - 3, 5.2, 4.6, FLE0);
      Art.limb(g, sx, sy, hx, hy - 3, 4.4, 3.8, FLE);
      Art.limb(g, U.lerp(sx, hx, 0.6), U.lerp(sy, hy, 0.6), hx, hy, 3.6, 3.2, SKIN);   // the forearm, hairy
      R(U.lerp(sx, hx, 0.8), U.lerp(sy, hy, 0.8), 1, 1, FRECK);
      E(hx, hy + 1, 3, 2.8, SKIN); E(hx - 0.6, hy, 1.6, 1.4, SKIN2);
      if (up && wave) { for (let i = 0; i < 3; i++) R(hx - 2 + i * 1.6, hy - 4, 1.2, 3, SKIN); }
    }
    // ---- the big cream collar ----------------------------------------------------
    for (let i = 0; i < 9; i++) {
      const u = (i / 8 - 0.5) * 2;
      E(CX + u * 13, chestY - 2 + Math.abs(u) * 2, 4.4, 3.8, COL0);
      E(CX + u * 13, chestY - 3 + Math.abs(u) * 2, 3.8, 3.2, COL);
    }
    // ---- the head ------------------------------------------------------------------
    const hx = CX, hy = 18 + y0;
    E(hx, hy + 1, 11.5, 12, SKIN0);
    E(hx, hy, 11, 11.4, SKIN);
    E(hx - 3, hy - 3, 5, 4, SKIN2);
    E(hx - 11, hy + 1, 2.2, 3, SKIN0); E(hx + 11, hy + 1, 2.2, 3, SKIN0);    // ears
    // stubble along the jaw and chin
    for (let i = 0; i < 26; i++) {
      const a = Math.PI * (0.1 + (i / 25) * 0.8);
      R(hx + Math.cos(a) * 9.2 - 0.5, hy + 2 + Math.sin(a) * 8.6, 1.4, 1.4, i % 3 ? '#d8884a' : HAIR0);
    }
    for (let i = 0; i < 10; i++) R(hx - 5 + i, hy + 9 + (i % 2), 1.2, 1.2, '#d8884a');
    // the face: eyes, then the glasses over them
    expressions(g, hx, hy + 1, pose, f, hurt);
    for (const s2 of [-1, 1]) {
      const gx = hx + s2 * 4.2, gy = hy + 1;
      R(gx - 3.6, gy - 2.6, 7.2, 1.2, '#1e1814'); R(gx - 3.6, gy + 1.8, 7.2, 1.2, '#1e1814');
      R(gx - 3.6, gy - 2.6, 1.2, 5.6, '#1e1814'); R(gx + 2.4, gy - 2.6, 1.2, 5.6, '#1e1814');
      R(gx - 2.2, gy - 1.4, 1.6, 1, 'rgba(255,255,255,0.7)');
    }
    R(hx - 0.8, hy, 1.6, 1, '#1e1814');                                  // the bridge
    for (const s2 of [-1, 1]) R(hx + s2 * 7.8, hy - 1, s2 * 3, 1, '#1e1814');
    // hair: swept over, spilling out above and below the band
    E(hx, hy - 8, 12, 6, HAIR0);
    E(hx - 1, hy - 9, 11, 5, HAIR);
    for (let i = 0; i < 6; i++) Art.poly(g, [[hx - 10 + i * 4, hy - 9], [hx - 7 + i * 4, hy - 16 - (i % 2) * 2], [hx - 4 + i * 4, hy - 9]], i % 2 ? HAIR : HAIR2);
    E(hx - 10, hy - 3, 3, 5, HAIR); E(hx + 10, hy - 3, 3, 5, HAIR0);
    // the red sweatband
    R(hx - 11.5, hy - 7, 23, 4, BAND); R(hx - 11.5, hy - 7, 23, 1.2, BAND2); R(hx - 11.5, hy - 3.8, 23, 0.8, '#8a1a14');
    if (lie) {
      const zs = [[36, 10], [40, 5], [44, 0]][f % 3];
      g.globalAlpha = 0.85 - (f % 3) * 0.2;
      Font.draw(g, 'z', zs[0], zs[1] + 6, { scale: 1, color: '#fff6dc' });
      g.globalAlpha = 1;
    }
    g.restore();
    Art.outline(c, '#1a100a', 1);
    cache.set(key, c);
    return c;
  }

  // ---- Shaz, on the till ---------------------------------------------------
  // A chibi shark in a store cap and a navy suit, drawn small on purpose: the
  // whole sprite is 36x46 art pixels and the shop blows it up, so every pixel
  // is a fat block and the shapes have to be simple enough to read that way.
  // Full body now — head, suit, arms, little legs, and a tail that wags.
  const KW = 36, KH = 46, CXK = 18, KGY = 45;
  const SH0 = '#3f7ba6', SH1 = '#63a6cf', SH2 = '#93c9e6', SH3 = '#cdeaf6';   // hide
  const BEL = '#f4f8f2', BEL2 = '#ccdad6';                                    // belly
  const SU0 = '#0f2238', SU1 = '#1a3a58', SU2 = '#2a5478';                    // suit
  const TI0 = '#8f2230', TI1 = '#c0392f';                                     // tie
  const CP0 = '#10381a', CP1 = '#1c6030', CP2 = '#2f8f42', CP3 = '#63c974';   // cap
  const KINK = '#0d1a26';

  function cashier(frame, pose = 'idle') {
    const n = { idle: 6, talk: 6, happy: 6, wave: 6, walk: 6, think: 4, cross: 6,
      cheer: 6, surprise: 4, sleepy: 4, sad: 4 }[pose] || 6;
    const f = ((frame % n) + n) % n, t = f / n;
    const key = `shaz:${f}:${pose}`;
    let img = cache.get(key); if (img) return img;
    const { c, g } = Art.cv(KW, KH);
    const S = Math.sin(t * TAU);

    // Everything is driven off five numbers so the whole body squashes and
    // stretches together. That is the entire secret of a bouncy sprite.
    let bob = 0, sq = 0, lean = 0, armL = 0, armR = 0, step = 0, tail = 0;
    let eyes = 'open', mouth = 'flat', brow = 0, tilt = 0;
    switch (pose) {
      case 'idle':                                   // a slow breath, ears to tail
        bob = [0, -1, -1, 0, 0, 0][f]; sq = [0, -0.06, -0.04, 0, 0.04, 0.02][f];
        tail = S * 2; eyes = f === 4 ? 'shut' : 'open'; break;
      case 'walk':                                   // two-beat bounce, feet alternating
        bob = [-2, -3, -1, -2, -3, -1][f]; sq = [0.06, -0.08, 0.1, 0.06, -0.08, 0.1][f];
        step = [1, 0, -1, -1, 0, 1][f]; lean = 0.6; tail = S * 3;
        armL = -S * 4; armR = S * 4; break;
      case 'talk':
        bob = [0, -1, 0, -1, 0, -1][f]; sq = [0, -0.05, 0, -0.05, 0, -0.05][f];
        mouth = ['open', 'wide', 'small', 'open', 'wide', 'small'][f];
        armR = -3 - Math.abs(S) * 3; lean = S * 0.5; tail = S * 3; brow = 0.5; break;
      case 'happy':
        bob = [0, -2, -3, -3, -2, 0][f]; sq = [0.1, -0.1, -0.06, -0.06, -0.1, 0.1][f];
        mouth = 'grin'; eyes = 'happy'; armL = -3; armR = -3; tail = S * 4; break;
      case 'wave':
        bob = [0, -1, -2, -2, -1, 0][f]; sq = [0.05, -0.06, -0.04, -0.04, -0.06, 0.05][f];
        mouth = 'grin'; eyes = 'happy'; tail = S * 4;
        armR = -8 - Math.abs(Math.sin(t * TAU * 2)) * 4; break;
      case 'cheer':
        bob = [0, -3, -5, -5, -3, 0][f]; sq = [0.16, -0.14, -0.08, -0.08, -0.14, 0.16][f];
        mouth = 'wide'; eyes = 'happy'; armL = -12; armR = -12; tail = S * 5; break;
      case 'think':
        bob = [0, 0, -1, -1][f]; eyes = 'narrow'; brow = 0.8; tilt = -2;
        mouth = 'small'; armR = -9; tail = S * 1.4; break;
      case 'cross':
        bob = [0, 0, -1, -1, 0, 0][f]; eyes = 'narrow'; brow = -1.4; mouth = 'flat';
        lean = S * 0.5; armL = -4; armR = -4; tail = S * 4; sq = Math.abs(S) * 0.05; break;
      case 'surprise':
        bob = [0, -3, -1, -1][f]; sq = [0.1, -0.16, -0.04, -0.04][f];
        eyes = 'wide'; brow = 1.4; mouth = 'open'; armL = -6; armR = -6; tail = 4; break;
      case 'sleepy':
        bob = [0, 0, 1, 1][f]; sq = [0, 0, 0.05, 0.05][f];
        eyes = 'shut'; brow = -0.3; tilt = 2; mouth = 'small'; tail = S * 0.8; break;
      case 'sad':
        bob = [1, 1, 0, 0][f]; sq = [0.06, 0.06, 0.03, 0.03][f];
        eyes = 'droop'; brow = -0.5; tilt = 1.6; mouth = 'frown';
        armL = 2; armR = 2; tail = -1; break;
    }
    // squash is applied about the feet: wider and shorter, or thinner and taller
    const XS = 1 + sq, YS = 1 - sq;
    const at = (x, y) => [CXK + (x - CXK) * XS + lean, KGY - (KGY - y) * YS + bob];
    const R = (x, y, w, h, col) => { const [ax, ay] = at(x, y); Art.rect(g, ax, ay, w * XS, h * YS, col); };
    const E = (x, y, rx, ry, col) => { const [ax, ay] = at(x, y); Art.ell(g, ax, ay, rx * XS, ry * YS, col); };
    const P = (pts, col) => Art.poly(g, pts.map(([x, y]) => at(x, y)), col);

    const hipY = 34, footY = KGY;

    // ---- the tail, behind everything ---------------------------------------
    P([[CXK + 5, 26], [CXK + 13 + tail, 20 + tail * 0.4], [CXK + 15 + tail, 27 + tail * 0.4], [CXK + 6, 31]], SH0);
    P([[CXK + 6, 26.6], [CXK + 12 + tail, 21.6 + tail * 0.4], [CXK + 13 + tail, 26 + tail * 0.4], [CXK + 7, 30]], SH1);

    // ---- legs and shoes ----------------------------------------------------
    for (const sd of [-1, 1]) {
      const lift = step * sd > 0 ? 2 : 0;
      const lx = CXK + sd * 4;
      R(lx - 2.6, hipY - 1, 5.2, 5, SU0);                       // trouser
      R(lx - 2.6, hipY - 1, 2.2, 5, SU1);
      R(lx - 2, hipY + 4, 4, footY - hipY - 7 - lift, SH1);     // a bare blue shin
      R(lx - 2, hipY + 4, 1.6, footY - hipY - 7 - lift, SH2);
      R(lx - 4, footY - 3 - lift, 8, 3, KINK);                  // the shoe
      R(lx - 4, footY - 3 - lift, 8, 1.2, '#43505e');
      R(lx - 4, footY - 3 - lift, 5, 1, '#6b7a8a');
    }

    // ---- the suit ----------------------------------------------------------
    P([[CXK - 8, 19], [CXK + 8, 19], [CXK + 9, hipY + 1], [CXK - 9, hipY + 1]], SU0);
    P([[CXK - 3, 19], [CXK + 3, 19], [CXK + 3, hipY + 1], [CXK - 3, hipY + 1]], BEL);   // the shirt
    P([[CXK - 8, 19], [CXK - 3, 19], [CXK - 1, 25], [CXK - 4, hipY + 1], [CXK - 9, hipY + 1]], SU1);
    P([[CXK + 8, 19], [CXK + 3, 19], [CXK + 1, 25], [CXK + 4, hipY + 1], [CXK + 9, hipY + 1]], SU0);
    R(CXK - 8, 19, 2, hipY - 18, SU2);                          // the lapel light
    P([[CXK - 2, 19], [CXK + 2, 19], [CXK + 1, 22], [CXK - 1, 22]], TI0);   // the tie
    P([[CXK - 1.6, 22], [CXK + 1.6, 22], [CXK + 2.4, 30], [CXK, 32], [CXK - 2.4, 30]], TI0);
    P([[CXK - 1.2, 22.4], [CXK + 1.2, 22.4], [CXK + 1.8, 29.6], [CXK, 31], [CXK - 1.8, 29.6]], TI1);
    R(CXK + 4, 23, 4, 5, '#1d2230');                            // her name badge
    R(CXK + 4.6, 23.6, 2.8, 3.8, '#fffdf0');
    R(CXK + 4.6, 23.6, 2.8, 1.2, '#c9581f');

    // ---- arms --------------------------------------------------------------
    for (const sd of [-1, 1]) {
      const sw = sd < 0 ? armL : armR;
      const ax0 = CXK + sd * 7, ay0 = 21;
      const ax1 = CXK + sd * 10, ay1 = 31 + sw;
      const [p0, p1] = [at(ax0, ay0), at(ax1, ay1)];
      Art.limb(g, p0[0], p0[1], p1[0], p1[1], 5 * XS, 4 * XS, sd < 0 ? SU1 : SU0);
      E(ax1, ay1 + 2, 2.6, 2.4, SH1);                           // the hand
      E(ax1 - sd * 0.6, ay1 + 1.6, 2, 1.8, SH2);
    }

    // ---- the head: one big block with a snout under it ---------------------
    const hy = 11 + tilt * 0.2, hx = CXK + tilt * 0.3;
    P([[hx + 4, hy - 4], [hx + 13, hy - 13], [hx + 10, hy - 2]], SH0);        // dorsal fin
    P([[hx + 5, hy - 4], [hx + 11.6, hy - 11], [hx + 9.2, hy - 3]], SH1);
    for (const sd of [-1, 1]) {                                              // side fins
      P([[hx + sd * 9, hy - 1], [hx + sd * 14, hy + 2], [hx + sd * 9, hy + 5]], SH0);
      P([[hx + sd * 9, hy - 0.2], [hx + sd * 12.6, hy + 2], [hx + sd * 9, hy + 4]], SH1);
    }
    E(hx, hy, 10, 8, SH0);                                                   // skull
    E(hx, hy - 0.4, 9, 7.2, SH1);
    Art.ellBand(g, ...at(hx - 0.6, hy - 2.2), 7 * XS, 5 * YS, SH2, 0, 0.55);
    E(hx - 4, hy - 4, 2.6, 1.6, SH3);                                        // the shine
    // the snout and the pale jaw under it
    P([[hx - 9, hy + 3], [hx + 9, hy + 3], [hx + 6, hy + 9], [hx - 6, hy + 9]], SH1);
    P([[hx - 8, hy + 4.6], [hx + 8, hy + 4.6], [hx + 5.6, hy + 9.2], [hx - 5.6, hy + 9.2]], BEL);
    P([[hx - 8, hy + 4.6], [hx + 8, hy + 4.6], [hx + 7.6, hy + 5.6], [hx - 7.6, hy + 5.6]], BEL2);
    R(hx - 2.4, hy + 4, 1.2, 1, KINK); R(hx + 1.2, hy + 4, 1.2, 1, KINK);    // nostrils
    for (const sd of [-1, 1]) for (let i = 0; i < 3; i++) {                  // gills
      R(hx + sd * (6 + i * 1.6) - (sd < 0 ? 1 : 0), hy - 0.4, 1, 3, '#27486a');
    }

    // ---- the cap -----------------------------------------------------------
    E(hx, hy - 7, 9.6, 4.4, CP0);
    E(hx, hy - 7.6, 8.8, 3.8, CP1);
    E(hx - 3, hy - 9.4, 3.4, 1.4, CP2);
    R(hx - 9.6, hy - 5.4, 19.2, 2.2, CP0);                                   // the band
    R(hx - 9.6, hy - 5.4, 19.2, 0.9, CP2);
    P([[hx - 10.6, hy - 3.4], [hx + 10.6, hy - 3.4], [hx + 8, hy - 1], [hx - 8, hy - 1]], '#08240f');
    P([[hx - 10, hy - 3.8], [hx + 10, hy - 3.8], [hx + 7.6, hy - 1.8], [hx - 7.6, hy - 1.8]], CP1);
    P([[hx - 10, hy - 3.8], [hx + 10, hy - 3.8], [hx + 8.8, hy - 2.8], [hx - 8.8, hy - 2.8]], CP2);
    E(hx, hy - 7.4, 2.4, 1.5, CP3);                                          // the store wombat
    E(hx + 1.8, hy - 8.2, 1.5, 1.3, CP3);
    R(hx + 1.1, hy - 9.4, 0.8, 1, CP3); R(hx + 2.4, hy - 9.4, 0.8, 1, CP3);

    // ---- eyes --------------------------------------------------------------
    for (const sd of [-1, 1]) {
      const ex = hx + sd * 4.2, ey = hy + 0.6;
      const rw = eyes === 'wide' ? 3.6 : eyes === 'narrow' ? 3 : 3.2;
      const rh = eyes === 'wide' ? 3.8 : eyes === 'narrow' ? 1.4 : eyes === 'droop' ? 2.2 : 3.2;
      if (eyes === 'happy') {
        P([[ex - 2.8, ey + 1.4], [ex, ey - 1.8], [ex + 2.8, ey + 1.4], [ex, ey - 0.2]], KINK);
      } else if (eyes === 'shut') {
        R(ex - 2.6, ey - 0.4, 5.2, 1.2, KINK);
        R(ex - 1.6, ey + 1, 3.2, 0.8, '#3d5a6e');
      } else {
        E(ex, ey, rw, rh, BEL);
        E(ex + sd * 0.4, ey + (eyes === 'droop' ? 0.8 : 0), rw - 1.1, Math.min(rh - 0.8, 2.4), KINK);
        E(ex - 0.8, ey - 1, 1, 0.9, '#ffffff');
      }
      if (brow) {
        const b0 = ey - rh - 1.4 - brow * 1.2, bt = sd * brow * 1.4;
        P([[ex - 3.4, b0 - bt], [ex + 3.4, b0 + bt], [ex + 3.4, b0 + bt + 1.2], [ex - 3.4, b0 - bt + 1.2]], '#27486a');
      }
    }
    E(hx - 7, hy + 3.4, 2.2, 1.2, 'rgba(232,132,140,0.5)');                  // blush
    E(hx + 7, hy + 3.4, 2.2, 1.2, 'rgba(232,132,140,0.5)');

    // ---- the mouth, across the pale jaw ------------------------------------
    const my = hy + 6.6;
    const teeth = (x0m, x1m, yTop, down) => {
      for (let x = x0m; x < x1m - 1; x += 2) P([[x, yTop], [x + 1.8, yTop], [x + 0.9, yTop + (down ? 1.4 : -1.4)]], '#fdf6ea');
    };
    if (mouth === 'open' || mouth === 'wide') {
      const w2 = mouth === 'wide' ? 5 : 3.8, h2 = mouth === 'wide' ? 2.6 : 1.8;
      P([[hx - w2, my - h2], [hx + w2, my - h2], [hx + w2 * 0.7, my + h2], [hx - w2 * 0.7, my + h2]], '#5a2430');
      teeth(hx - w2 + 0.3, hx + w2 - 0.3, my - h2, true);
      E(hx, my + h2 - 0.6, w2 * 0.4, 0.7, '#c4566a');
    } else if (mouth === 'grin') {
      P([[hx - 5.4, my - 1.4], [hx + 5.4, my - 1.4], [hx + 3.8, my + 1.6], [hx - 3.8, my + 1.6]], '#5a2430');
      teeth(hx - 5.1, hx + 5.1, my - 1.4, true);
      R(hx - 3.8, my + 1, 7.6, 0.7, '#fdf6ea');
    } else if (mouth === 'small') {
      E(hx, my, 1.2, 1, '#5a2430');
    } else if (mouth === 'frown') {
      P([[hx - 4, my + 1.2], [hx, my - 1.2], [hx + 4, my + 1.2], [hx, my + 0.2]], '#3d5a6e');
    } else {
      R(hx - 4.4, my - 0.4, 8.8, 1, '#3d5a6e');
      P([[hx + 3.2, my - 0.4], [hx + 5, my - 0.4], [hx + 4.1, my + 1]], '#fdf6ea');
      P([[hx - 5, my - 0.4], [hx - 3.2, my - 0.4], [hx - 4.1, my + 1]], '#fdf6ea');
    }
    Art.outline(c, '#000000', 1);
    cache.set(key, c);
    return c;
  }

  // ---- Groot, who runs the cellar ------------------------------------------
  // A tall kind tree. Bark laid in overlapping plates, moss in the seams,
  // flowers growing out of his shoulders and head, and a face made of three
  // soft marks in the grain. He is never not pleased to see you.
  const GW = 56, GH = 92, GX = 28, GGY = 89;
  const BK0 = '#3b2a18', BK1 = '#5a4326', BK2 = '#7c5f38', BK3 = '#a0804f', BK4 = '#c2a172';
  const MOSS0 = '#2f5a2a', MOSS1 = '#4a8a3c', MOSS2 = '#79b45c';
  const PETAL = ['#e8768f', '#f0c04a', '#c98ad8', '#f2ece0', '#7fc9e8'];
  function grootPlate(g, x, y, w, h, col, lit) {
    Art.ell(g, x, y, w, h, BK0);
    Art.ell(g, x, y - 0.4, w - 0.9, h - 0.9, col);
    Art.ell(g, x - w * 0.25, y - h * 0.3, w * 0.42, h * 0.34, lit);
    for (let i = -1; i <= 1; i++) Art.limb(g, x - w * 0.7, y + i * h * 0.4, x + w * 0.7, y + i * h * 0.4 + 0.6, 0.7, 0.5, BK0);
  }
  // He only ever says one thing, so the face has to carry the meaning. Every
  // mood below is a different set of brows, eyes and mouth on the same head.
  function groot(frame, pose = 'idle') {
    const n = { idle: 6, walk: 6, talk: 6, point: 4, wave: 6, happy: 6, sad: 4, cross: 6,
      curious: 4, proud: 6, worry: 6, laugh: 6, sleepy: 4 }[pose] || 6;
    const f = ((frame % n) + n) % n, t = f / n;
    const key = `groot:${f}:${pose}`;
    let img = cache.get(key); if (img) return img;
    const { c, g } = Art.cv(GW, GH);
    const S = Math.sin(t * TAU);
    let bob = 0, stride = 0, armR = 0, armL = 0, mouth = 'smile', lean = 0, sway = 0;
    let eyes = 'open', brow = 0, tilt = 0;           // brow: + is raised, - is knitted
    switch (pose) {
      case 'idle': bob = [0, 0, 1, 1, 0, 0][f]; sway = S * 0.5; armL = S * 1.2; armR = -S * 1.2;
        eyes = f === 3 ? 'shut' : 'open'; break;
      case 'walk': stride = S * 4.2; bob = -Math.abs(Math.sin(t * TAU * 2)) * 2.4;
        armL = -S * 5; armR = S * 5; sway = S * 0.8; break;
      case 'talk': bob = [0, 1, 0, 1, 0, 1][f]; mouth = f % 2 ? 'open' : 'wide';
        armR = -6 - Math.abs(S) * 5; armL = S * 2; sway = S * 0.7; brow = 0.6; break;
      case 'point': mouth = 'smile'; armR = -20; bob = [0, 1, 1, 0][f]; brow = 1; break;
      case 'wave': mouth = 'wide'; eyes = 'happy'; armR = -22 - Math.abs(Math.sin(t * TAU * 2)) * 5;
        bob = [0, 1, 1, 0, 1, 1][f]; break;
      // ---- the moods ------------------------------------------------------
      case 'happy': mouth = 'wide'; eyes = 'happy'; bob = [0, 1, 2, 2, 1, 0][f];
        armL = -4 - Math.abs(S) * 3; armR = -4 - Math.abs(S) * 3; break;
      case 'sad': mouth = 'frown'; eyes = 'droop'; brow = -0.4; bob = [1, 1, 0, 0][f];
        tilt = 1.4; armL = 3; armR = 3; break;
      case 'cross': mouth = 'flat'; eyes = 'narrow'; brow = -1.4;
        bob = [0, 0, 1, 1, 0, 0][f]; lean = S * 0.6; armL = -3; armR = -3; break;
      case 'curious': mouth = 'small'; eyes = 'wide'; brow = 1.2; tilt = -2.2;
        bob = [0, 1, 1, 0][f]; armR = -5; break;
      case 'proud': mouth = 'smile'; eyes = 'narrow'; brow = 0.8;
        bob = [0, 1, 2, 2, 1, 0][f]; armL = -7; armR = -7; break;
      case 'worry': mouth = 'wobble'; eyes = 'wide'; brow = 0.4; tilt = Math.sin(t * TAU * 2) * 1.6;
        bob = [0, 1, 0, 1, 0, 1][f]; armL = -2; armR = -2; break;
      case 'laugh': mouth = 'wide'; eyes = 'happy'; brow = 0.9;
        bob = [0, 2, 3, 2, 1, 0][f]; tilt = -1.4; armL = -6; armR = -6; break;
      case 'sleepy': mouth = 'small'; eyes = 'shut'; brow = -0.2; tilt = 2.4;
        bob = [0, 0, 1, 1][f]; armL = 2; armR = 2; break;
    }
    const y0 = bob;
    const headY = 20 + y0, chin = headY + 13;
    const shoulder = chin + 5, chestY = shoulder + 10, hip = shoulder + 28;
    const knee = hip + 13, ankle = GGY - 3;
    const shW = 13, chW = 12, hipW = 9;
    // ---- legs: two trunks ---------------------------------------------------
    for (const s2 of [-1, 1]) {
      const lx = GX + s2 * 6.4, fx = GX + s2 * 8 + stride * s2;
      const ky = knee - Math.max(0, stride * s2) * 1.1;
      Art.limb(g, lx, hip, U.lerp(lx, fx, 0.55), ky, 7.4, 6, BK0);
      Art.limb(g, lx, hip, U.lerp(lx, fx, 0.55), ky, 6, 4.8, s2 < 0 ? BK2 : BK1);
      Art.limb(g, U.lerp(lx, fx, 0.55), ky, fx, ankle, 6, 5.2, BK0);
      Art.limb(g, U.lerp(lx, fx, 0.55), ky, fx, ankle, 4.8, 4.2, s2 < 0 ? BK2 : BK1);
      for (let i = 0; i < 3; i++) grootPlate(g, fx + (i % 2 ? 1 : -1), ankle - 16 + i * 5.5, 3.4, 2.2, BK2, BK3);
      // roots for feet
      Art.ell(g, fx, ankle + 1, 8, 3.4, BK0);
      Art.ell(g, fx, ankle, 7, 2.8, BK1);
      for (let i = -2; i <= 2; i++) Art.limb(g, fx, ankle - 1, fx + i * 3.4, ankle + 2.6, 1.8, 1, BK1);
      Art.ell(g, fx - 2, ankle - 1, 3, 1.4, MOSS0);
    }
    // ---- torso: overlapping plates of bark ---------------------------------
    g.save();
    if (sway) { g.translate(GX, GGY); g.transform(1, 0, sway * 0.02, 1, 0, 0); g.translate(-GX, -GGY); }
    Art.poly(g, [[GX - shW, shoulder], [GX + shW, shoulder],
                 [GX + chW, chestY], [GX + hipW, hip], [GX - hipW, hip], [GX - chW, chestY]], BK0);
    Art.poly(g, [[GX - shW + 1, shoulder + 1], [GX + shW - 1, shoulder + 1],
                 [GX + chW - 1, chestY], [GX + hipW - 1, hip - 1], [GX - hipW + 1, hip - 1], [GX - chW + 1, chestY]], BK1);
    for (let r = 0; r < 5; r++) {                                    // the plates
      const yy = shoulder + 3 + r * 5.4;
      const w = U.lerp(shW, hipW, r / 4.6);
      for (let i = -1; i <= 1; i++) {
        grootPlate(g, GX + i * w * 0.58, yy, w * 0.42, 2.8, i < 0 ? BK2 : BK1, i < 0 ? BK3 : BK2);
      }
    }
    for (let i = 0; i < 6; i++) {                                    // moss in the seams
      const a2 = i * 1.7;
      Art.ell(g, GX + Math.cos(a2) * shW * 0.6, shoulder + 6 + (i % 4) * 5.4, 2.6, 1.6, i % 2 ? MOSS0 : MOSS1);
    }
    // ---- arms: branches ----------------------------------------------------
    for (const [s2, sw] of [[-1, armL], [1, armR]]) {
      const sx = GX + s2 * (shW - 2), sy = shoulder + 3;
      const ex = GX + s2 * (shW + 7), ey = chestY + 10 + sw * 0.7;
      const hxx = GX + s2 * (shW + 8), hyy = hip - 5 + sw * 1.3;
      Art.limb(g, sx, sy, ex, ey, 6.4, 5, BK0);
      Art.limb(g, sx, sy, ex, ey, 5, 3.8, s2 < 0 ? BK2 : BK1);
      Art.limb(g, ex, ey, hxx, hyy, 5, 3.6, BK0);
      Art.limb(g, ex, ey, hxx, hyy, 3.8, 2.6, s2 < 0 ? BK2 : BK1);
      // twiggy fingers
      for (let i = -1; i <= 1; i++) {
        Art.limb(g, hxx, hyy, hxx + s2 * 2.6 + i * 1.6, hyy + 5 + Math.abs(i), 1.8, 0.9, BK1);
        Art.limb(g, hxx + s2 * 2.6 + i * 1.6, hyy + 5 + Math.abs(i), hxx + s2 * 3.4 + i * 2.4, hyy + 8, 1, 0.6, BK2);
      }
      // a sprig growing out of each elbow
      Art.limb(g, ex, ey - 2, ex + s2 * 4, ey - 7, 1.2, 0.7, MOSS0);
      Art.ell(g, ex + s2 * 4.6, ey - 8, 2.6, 2, MOSS1);
      Art.ell(g, ex + s2 * 4, ey - 8.8, 1.4, 1, MOSS2);
    }
    // ---- flowers on the shoulders -------------------------------------------
    for (let i = 0; i < 4; i++) {
      const s2 = i < 2 ? -1 : 1;
      const fx = GX + s2 * (7 + (i % 2) * 5), fy = shoulder - 1 - (i % 2) * 3;
      Art.limb(g, fx, fy + 4, fx + s2, fy - 3, 1.2, 0.7, MOSS0);
      const col = PETAL[i % PETAL.length];
      for (let k = 0; k < 5; k++) {
        const a2 = (k / 5) * TAU + i;
        Art.ell(g, fx + s2 + Math.cos(a2) * 2.4, fy - 3 + Math.sin(a2) * 2.4, 1.8, 1.8, col);
      }
      Art.ell(g, fx + s2, fy - 3, 1.5, 1.5, '#f5e6a8');
    }
    g.restore();
    // ---- the head ------------------------------------------------------------
    const hx = GX;
    Art.limb(g, hx, chin - 1, hx, shoulder + 1, 5.4, 6.4, BK0);
    Art.ell(g, hx, headY + 1, 11.4, 12.4, BK0);
    Art.ell(g, hx - 0.4, headY + 0.6, 10.2, 11.2, BK1);
    Art.ell(g, hx - 3.4, headY - 3, 4.4, 4, BK2);                     // the light on his brow
    Art.ell(g, hx - 4.4, headY - 4.4, 2, 1.4, BK3);
    for (let i = 0; i < 7; i++) {                                     // the grain of him
      const yy = headY - 8 + i * 2.8;
      Art.limb(g, hx - 9 + (i % 2), yy, hx + 9 - (i % 2), yy + 0.8, 0.8, 0.5, BK0);
    }
    Art.ell(g, hx - 8, headY + 5, 3, 2, MOSS0);                       // moss on his jaw
    Art.ell(g, hx + 7.4, headY + 3, 2.4, 1.6, MOSS0);
    // bark spikes for hair, with flowers in them
    for (let i = -3; i <= 3; i++) {
      const sx = hx + i * 2.8, top = headY - 12 - (3 - Math.abs(i)) * 2.4;
      Art.limb(g, sx, headY - 6, sx + i * 0.9, top, 2.4, 1.2, BK0);
      Art.limb(g, sx, headY - 6, sx + i * 0.9, top, 1.6, 0.7, i % 2 ? BK2 : BK1);
      if (Math.abs(i) !== 1) {
        const col = PETAL[(i + 3) % PETAL.length];
        for (let k = 0; k < 5; k++) {
          const a2 = (k / 5) * TAU + i * 0.7;
          Art.ell(g, sx + i * 0.9 + Math.cos(a2) * 1.9, top + Math.sin(a2) * 1.9, 1.5, 1.5, col);
        }
        Art.ell(g, sx + i * 0.9, top, 1.2, 1.2, '#f5e6a8');
      }
    }
    // the face: two kind eyes under bark brows, which do most of the talking
    for (const sd of [-1, 1]) {
      const exx = hx + sd * 4 + tilt * 0.4;
      const rw = eyes === 'wide' ? 3.8 : eyes === 'narrow' ? 3.2 : 3.2;
      const rh = eyes === 'wide' ? 4 : eyes === 'narrow' ? 1.8 : eyes === 'droop' ? 2.6 : 3.4;
      if (eyes === 'happy') {                              // two upturned arcs
        Art.poly(g, [[exx - 3.4, headY + 1.4], [exx, headY - 2.6], [exx + 3.4, headY + 1.4],
                     [exx, headY - 0.6]], '#2a1c10');
      } else if (eyes === 'shut') {
        Art.rect(g, exx - 3, headY - 0.6, 6, 1.4, '#2a1c10');
        Art.rect(g, exx - 2, headY + 1, 4, 1, '#4a3418');
      } else {
        Art.ell(g, exx, headY - 0.4, rw, rh, '#2a1c10');
        Art.ell(g, exx, headY - 0.4, rw - 0.8, rh - 0.8, '#6a4a22');
        const look = eyes === 'droop' ? 1 : 0;
        Art.ell(g, exx + sd * 0.3, headY - 0.2 + look, 1.4, Math.min(1.6, rh - 0.6), '#150e08');
        Art.ell(g, exx - 0.7, headY - 1.2 + look, 0.9, 0.9, '#fff6e0');
      }
      // the brow ridge, tilted by the mood
      const b0 = headY - 4.6 - brow * 1.4, bt = sd * brow * 1.5;
      Art.poly(g, [[exx - 3.4, b0 - bt], [exx + 3.4, b0 + bt],
                   [exx + 3.4, b0 + bt + 1.4], [exx - 3.4, b0 - bt + 1.4]], BK0);
    }
    Art.ell(g, hx, headY + 3.4, 2.4, 1.8, BK0);                       // the bump of a nose
    const my = headY + 8.2;
    if (mouth === 'open') { Art.ell(g, hx, my, 3.2, 2.6, '#2a1c10'); Art.ell(g, hx, my + 0.8, 2.2, 1.2, '#7a3a34'); }
    else if (mouth === 'wide') {
      Art.poly(g, [[hx - 5, my - 1.6], [hx + 5, my - 1.6], [hx + 3.2, my + 2.6], [hx - 3.2, my + 2.6]], '#2a1c10');
      Art.rect(g, hx - 4.4, my - 1.4, 8.8, 1.4, '#e8dcc4');
    } else if (mouth === 'frown') {
      Art.poly(g, [[hx - 4.6, my + 2], [hx, my - 1.8], [hx + 4.6, my + 2], [hx, my + 0.2]], '#2a1c10');
    } else if (mouth === 'flat') {
      Art.rect(g, hx - 4.6, my - 0.6, 9.2, 1.6, '#2a1c10');
    } else if (mouth === 'small') {
      Art.ell(g, hx, my, 1.8, 1.5, '#2a1c10');
    } else if (mouth === 'wobble') {
      for (let i = -2; i <= 2; i++) Art.rect(g, hx + i * 2 - 1, my - 0.6 + (i % 2 ? 1.2 : 0), 2, 1.4, '#2a1c10');
    } else {
      Art.poly(g, [[hx - 5.4, my - 2], [hx, my + 2.2], [hx + 5.4, my - 2], [hx, my + 0.2]], '#2a1c10');
      Art.poly(g, [[hx - 3.6, my - 1], [hx, my + 1.2], [hx + 3.6, my - 1], [hx, my + 0.2]], '#7a3a34');
    }
    Art.outline(c, '#000000', 1);
    cache.set(key, c);
    return c;
  }

  // ---- the Wombachu charm -------------------------------------------------
  // A wombat done up as the electric mouse: yellow, black-tipped ears, red
  // cheeks and a lightning tail. It hangs from the cultist's neck on a chain.
  const WOMB_Y = '#f2cf3a', WOMB_Y2 = '#ffe98a', WOMB_D = '#b8891a';
  const CHAIN = '#c1912a', CHAIN2 = '#f2cf62';
  function wombachu(g, x, y, s) {
    Art.rect(g, x - 0.5, y - 6 * s, 1, 4 * s, CHAIN);             // the chain
    Art.rect(g, x - 1, y - 3 * s, 2, 1, CHAIN2);
    // ears, black at the tips
    for (const d of [-1, 1]) {
      Art.poly(g, [[x + d * 1.6 * s, y - 1.4 * s], [x + d * 3.4 * s, y - 5.2 * s], [x + d * 4.2 * s, y - 3.4 * s]], WOMB_Y);
      Art.poly(g, [[x + d * 3.1 * s, y - 4.3 * s], [x + d * 3.4 * s, y - 5.2 * s], [x + d * 4.2 * s, y - 3.4 * s]], '#1a1208');
    }
    Art.ell(g, x + 4.6 * s, y + 1.4 * s, 1.6 * s, 1.1 * s, WOMB_Y);   // the bolt of a tail
    Art.poly(g, [[x + 4 * s, y + 1.6 * s], [x + 6.6 * s, y - 0.6 * s], [x + 5.4 * s, y + 0.6 * s], [x + 6.8 * s, y + 1.4 * s], [x + 4.6 * s, y + 2.6 * s]], WOMB_Y2);
    Art.ell(g, x, y + 0.4 * s, 3.6 * s, 3.2 * s, WOMB_D);             // the body
    Art.ell(g, x, y, 3.4 * s, 3 * s, WOMB_Y);
    Art.ell(g, x - 0.9 * s, y - 0.9 * s, 1.9 * s, 1.5 * s, WOMB_Y2);
    Art.ell(g, x - 2.1 * s, y + 0.9 * s, 1 * s, 0.8 * s, '#e04a3c');  // the cheeks
    Art.ell(g, x + 2.1 * s, y + 0.9 * s, 1 * s, 0.8 * s, '#e04a3c');
    Art.rect(g, x - 1.5 * s, y - 0.5 * s, 0.9 * s, 0.9 * s, '#1a1208');
    Art.rect(g, x + 0.7 * s, y - 0.5 * s, 0.9 * s, 0.9 * s, '#1a1208');
    Art.rect(g, x - 0.4 * s, y + 0.8 * s, 0.9 * s, 0.7 * s, '#1a1208');  // the snout
  }

  // ---- ant movers ---------------------------------------------------------
  function ant(frame, carrying) {
    const f = frame % 4;
    const key = `ant:${f}:${carrying ? 1 : 0}`;
    let img = cache.get(key); if (img) return img;
    const { c, g } = Art.cv(20, 18);
    const A = '#2a1c22', B = '#45303a', C = '#5e424e';
    const step = [0, 1, 0, -1][f];
    const by = 11;
    // six legs, alternating tripod
    for (let i = 0; i < 3; i++) {
      const lx = 5 + i * 4;
      const up = (i % 2 === 0 ? step : -step);
      Art.line(g, lx, by, lx - 3, by + 5 - up, A, 1);
      Art.line(g, lx, by, lx + 3, by + 5 + up, A, 1);
    }
    Art.ell(g, 5, by - 1, 3.4, 3, B);      // abdomen
    Art.ell(g, 4, by - 2, 2, 1.6, C);
    Art.ell(g, 9.5, by - 1.5, 2.2, 2, A);  // thorax
    Art.ell(g, 13, by - 2.5, 2.8, 2.6, B); // head
    Art.rect(g, 14.4, by - 4, 1, 1, PAL.cream);
    Art.line(g, 14, by - 4.4, 17, by - 7 - step, A, 1);
    Art.line(g, 13, by - 4.6, 15, by - 8 + step, A, 1);
    if (carrying) {
      Art.rect(g, 4, 1, 13, 6, PAL.stone2);
      Art.rect(g, 4, 1, 13, 1.6, PAL.stone4);
      Art.rect(g, 4, 5.6, 13, 1.6, PAL.stone1);
      Art.line(g, 7, 7, 6, by - 3, A, 1);
      Art.line(g, 13, 7, 13, by - 4, A, 1);
    }
    Art.outline(c, '#000000', 1);
    cache.set(key, c); return c;
  }
  // ---- forest birds -------------------------------------------------------
  function crow(frame, perched) {
    const f = frame % 4;
    const key = `crow:${f}:${perched ? 1 : 0}`;
    let img = cache.get(key); if (img) return img;
    const { c, g } = Art.cv(24, 18);
    const K = '#14121c', K2 = '#262232', K3 = '#3a3448';
    if (perched) {
      Art.ell(g, 11, 10, 6, 5.4, K2);
      Art.ell(g, 10, 8.6, 4, 3.4, K3);
      Art.ell(g, 15, 6, 3.6, 3.2, K2);          // head
      Art.rect(g, 18, 6, 4, 1.8, '#6b5a2a');    // beak
      Art.rect(g, 16.4, 5, 1.4, 1.4, '#d8a52f');
      Art.limb(g, 7, 12, 3, 6 + (f % 2), 3, 1.4, K);  // tail
      Art.rect(g, 9, 14, 1.4, 3, '#6b5a2a'); Art.rect(g, 12, 14, 1.4, 3, '#6b5a2a');
    } else {
      const flap = [0, -3, 0, 3][f];
      Art.ell(g, 12, 9, 5, 3, K2);
      Art.ell(g, 16, 7.6, 3, 2.6, K2);
      Art.rect(g, 19, 7.6, 3.4, 1.4, '#6b5a2a');
      Art.rect(g, 17.4, 6.6, 1.2, 1.2, '#d8a52f');
      Art.limb(g, 9, 9, 3, 11, 3, 1.2, K);
      Art.poly(g, [[11, 8], [4, 4 + flap], [2, 8 + flap], [10, 11]], K2);
      Art.poly(g, [[13, 8], [20, 4 - flap], [22, 8 - flap], [14, 11]], K3);
    }
    Art.outline(c, '#000000', 1);
    cache.set(key, c); return c;
  }
  function owl(frame) {
    const f = frame % 4;
    const key = `owl:${f}`;
    let img = cache.get(key); if (img) return img;
    const { c, g } = Art.cv(24, 26);
    const B = '#5a4a3a', B2 = '#43372b', L = '#78654e';
    Art.ell(g, 12, 16, 8, 8.4, B);
    Art.ell(g, 12, 18, 5.4, 5, L);
    Art.speckle(g, 12, 16, 7, 7, B2, 22, 5);
    Art.ell(g, 12, 8, 8.4, 7, B);              // head
    Art.rect(g, 4.6, 2.4, 4, 4, B); Art.rect(g, 15.4, 2.4, 4, 4, B);   // tufts
    const blink = f === 3;
    for (const sd of [-1, 1]) {
      Art.ell(g, 12 + sd * 4, 8, 3.4, 3.4, L);
      if (blink) Art.rect(g, 12 + sd * 4 - 2.4, 8, 5, 1.4, B2);
      else { Art.ell(g, 12 + sd * 4, 8, 2.4, 2.4, '#f5cd5c'); Art.ell(g, 12 + sd * 4, 8, 1.2, 1.4, PAL.ink); }
    }
    Art.poly(g, [[12, 10], [10, 13], [14, 13]], '#d8a52f');
    Art.rect(g, 8, 23, 2.4, 3, '#d8a52f'); Art.rect(g, 13.6, 23, 2.4, 3, '#d8a52f');
    Art.outline(c, '#000000', 1);
    cache.set(key, c); return c;
  }
  // ---- shop mascot: a lollipop with a wombat face -------------------------
  function mascot(frame) {
    const f = frame % 4;
    const key = `masc:${f}`;
    let img = cache.get(key); if (img) return img;
    const { c, g } = Art.cv(40, 56);
    const tilt = [0, 1, 0, -1][f];
    Art.rect(g, 18 + tilt, 30, 4, 24, PAL.cream);
    Art.rect(g, 18 + tilt, 30, 1.6, 24, '#cfc4b0');
    Art.ell(g, 20 + tilt, 20, 18, 18, PAL.ink);
    Art.ell(g, 20 + tilt, 20, 16.4, 16.4, '#e8708a');
    for (let i = 0; i < 6; i++) {
      const a = i * 1.05 + f * 0.12;
      Art.limb(g, 20 + tilt, 20, 20 + tilt + Math.cos(a) * 15, 20 + Math.sin(a) * 15, 4.4, 2.4, '#ffd2dc');
    }
    Art.ell(g, 20 + tilt, 20, 10, 10, '#fdf3dc');
    // wombat face
    Art.rect(g, 13 + tilt, 15, 3, 3.4, PAL.ink);
    Art.rect(g, 24 + tilt, 15, 3, 3.4, PAL.ink);
    Art.ell(g, 20 + tilt, 23, 5.4, 4, '#bd8763');
    Art.rect(g, 17 + tilt, 21.4, 6, 2.4, '#6b4030');
    Art.rect(g, 17 + tilt, 25, 7, 2, '#4a2c20');
    Art.rect(g, 10 + tilt, 9, 5, 4.4, '#bd8763');
    Art.rect(g, 25 + tilt, 9, 5, 4.4, '#bd8763');
    Art.outline(c, '#000000', 1);
    cache.set(key, c); return c;
  }

  // ---- cupid: a fat wombat with small wings, hovering ---------------------
  function cupid(frame, tint) {
    const f = frame % 4;
    const key = `cu:${f}:${tint || 0}`;
    let img = cache.get(key); if (img) return img;
    const { c, g } = Art.cv(34, 26);
    const fur = FUR[0];
    const flap = [0, 2, 3, 1][f];
    // wings behind
    for (const side of [-1, 1]) {
      const wx = 17 + side * 7;
      Art.ell(g, wx, 9 - flap * 0.6, 5 - flap * 0.7, 4.4 + flap * 0.5, PAL.cream);
      Art.ell(g, wx, 9 - flap * 0.6, 3.4 - flap * 0.5, 3 + flap * 0.4, '#e8dcc4');
      Art.rect(g, wx - 1, 6 - flap * 0.5, 2, 2, PAL.cream);
    }
    // round body
    Art.ell(g, 17, 15, 8.6, 7.4, fur.base);
    Art.ellBand(g, 17, 15, 8.6, 7.4, fur.dark, 0.7, 1);
    Art.ellBand(g, 17, 15, 8.6, 7.4, fur.light, 0, 0.2);
    Art.ell(g, 17, 18, 5.4, 2.6, fur.belly);
    // head
    Art.ell(g, 17, 9.6, 5.6, 4.9, fur.base);
    Art.ellBand(g, 17, 9.6, 5.6, 4.9, fur.light, 0, 0.24);
    Art.ell(g, 13.6, 6.4, 2, 2.1, fur.dark);
    Art.ell(g, 20.4, 6.4, 2, 2.1, fur.base);
    Art.rect(g, 15.2, 9.4, 1, 1, PAL.ink);
    Art.rect(g, 19, 9.4, 1, 1, PAL.ink);
    Art.ell(g, 17.2, 11.4, 2.2, 1.8, fur.light);
    Art.rect(g, 16.6, 10.8, 1.6, 1.2, fur.nose);
    Art.rect(g, 16.4, 12.4, 2, 1, PAL.ink);
    // stubby limbs and a tiny bow
    Art.ell(g, 11.6, 17.4, 2.2, 2.4, fur.dark);
    Art.ell(g, 22.6, 16.6, 2.2, 2.4, fur.base);
    Art.limb(g, 24, 12, 26, 21, 1.6, 1.6, PAL.bark2);
    Art.line(g, 25, 12, 25, 21, PAL.cream, 1);
    Art.ell(g, 17, 22.4, 2, 1.9, fur.dark);
    // halo
    Art.ell(g, 17, 2.6, 4.6, 1.7, tint || PAL.gold3);
    Art.ell(g, 17, 2.6, 3, 0.9, 'rgba(0,0,0,0)');
    Art.outline(c, '#000000', 1);
    cache.set(key, c); return c;
  }

  // ---- god form: front-facing, looming, per-god regalia -------------------
  function godForm(god, frame) {
    const f = frame % 4;
    const key = `god:${god.key}:${f}`;
    let img = cache.get(key); if (img) return img;
    const W = 68, H = 60;
    const { c, g } = Art.cv(W, H);
    const cx = W / 2, base = H - 3;
    const breathe = [0, 1, 1.4, 0.6][f];
    const dark = U.shade(god.color, -0.5), mid = god.color, lite = U.shade(god.color, 0.35);

    // hind legs / seated mass
    Art.ell(g, cx - 13, base - 7, 7, 6.5, dark);
    Art.ell(g, cx + 13, base - 7, 7, 6.5, dark);
    // enormous body
    Art.ell(g, cx, base - 19 + breathe * 0.3, 21, 17 - breathe * 0.3, mid);
    Art.ellBand(g, cx, base - 19, 21, 17, dark, 0.68, 1);
    Art.ellBand(g, cx, base - 19, 21, 17, lite, 0, 0.2);
    Art.ell(g, cx, base - 13, 13, 8, U.shade(god.color, 0.16));
    // chest emblem
    Art.ell(g, cx, base - 22, 6.5, 6, U.shade(god.color, -0.3));
    Art.ell(g, cx, base - 22, 4.6, 4.2, PAL.gold3);
    Art.ell(g, cx, base - 22, 2.6, 2.4, PAL.gold4);
    // arms
    Art.ell(g, cx - 20, base - 22, 5.4, 8, mid);
    Art.ell(g, cx + 20, base - 22, 5.4, 8, mid);
    Art.ell(g, cx - 22, base - 15, 4, 3.6, dark);
    Art.ell(g, cx + 22, base - 15, 4, 3.6, dark);
    // broad head
    const hy = base - 40 - breathe * 0.4;
    Art.ell(g, cx, hy, 15, 12.5, mid);
    Art.ellBand(g, cx, hy, 15, 12.5, lite, 0, 0.22);
    Art.ellBand(g, cx, hy, 15, 12.5, dark, 0.8, 1);
    Art.ell(g, cx - 11, hy - 8, 4.6, 4.8, mid);
    Art.ell(g, cx + 11, hy - 8, 4.6, 4.8, mid);
    Art.ell(g, cx - 11, hy - 8, 2.6, 2.7, U.shade(god.color, -0.2));
    Art.ell(g, cx + 11, hy - 8, 2.6, 2.7, U.shade(god.color, -0.2));
    // muzzle
    Art.ell(g, cx, hy + 6, 7.6, 5, U.shade(god.color, 0.18));
    Art.rect(g, cx - 2, hy + 3.4, 4, 2.4, PAL.ink);
    Art.rect(g, cx - 3, hy + 8, 6, 1.6, PAL.ink);
    // glowing eyes
    for (const s of [-1, 1]) {
      Art.ell(g, cx + s * 6, hy - 1, 3.2, 2.8, PAL.cream);
      Art.ell(g, cx + s * 6, hy - 1, 2, 1.8, god.eye || PAL.gold4);
    }
    // regalia
    drawRegalia(g, god, cx, hy, base, f);
    Art.outline(c, '#000000', 1);
    cache.set(key, c); return c;
  }
  function drawRegalia(g, god, cx, hy, base, f) {
    const gold = PAL.gold3, goldL = PAL.gold4, goldD = PAL.gold1;
    switch (god.crown) {
      case 'bolt':
        for (let i = -2; i <= 2; i++) Art.rect(g, cx + i * 5 - 1, hy - 15 - Math.abs(i) * -1, 2, 5, i % 2 ? gold : goldL);
        Art.rect(g, cx - 12, hy - 12, 24, 2.4, goldD);
        Art.line(g, cx + 20, hy - 6, cx + 26, hy + 8, goldL, 2);
        Art.line(g, cx + 26, hy + 8, cx + 21, hy + 6, goldL, 2);
        Art.line(g, cx + 21, hy + 6, cx + 28, hy + 20, goldL, 2);
        break;
      case 'laurel':
        for (let i = -4; i <= 4; i++) { if (!i) continue; Art.ell(g, cx + i * 3.4, hy - 12 + Math.abs(i) * 0.8, 2, 1.2, PAL.moss3); }
        Art.rect(g, cx - 2, hy - 14, 4, 2, PAL.moss4);
        break;
      case 'trident':
        Art.rect(g, cx - 12, hy - 12, 24, 2.4, PAL.cyan2);
        Art.limb(g, cx + 24, hy - 16, cx + 24, base - 4, 2.2, 2.2, PAL.cyan1);
        for (let i = -1; i <= 1; i++) Art.rect(g, cx + 24 + i * 4 - 1, hy - 24, 2, 9, PAL.cyan3);
        Art.rect(g, cx + 19, hy - 16, 11, 2, PAL.cyan3);
        break;
      case 'horns':
        for (const s of [-1, 1]) {
          Art.limb(g, cx + s * 9, hy - 10, cx + s * 15, hy - 21, 3.4, 1.2, PAL.stone4);
          Art.limb(g, cx + s * 15, hy - 21, cx + s * 11, hy - 27, 1.2, 0.9, PAL.stone3);
        }
        break;
      case 'sheaf':
        for (let i = -3; i <= 3; i++) Art.limb(g, cx + i * 2, hy - 11, cx + i * 4.5, hy - 22 - Math.abs(i), 1.6, 0.9, gold);
        for (let i = -3; i <= 3; i++) Art.ell(g, cx + i * 4.5, hy - 22 - Math.abs(i), 1.6, 2.2, goldL);
        Art.rect(g, cx - 8, hy - 12, 16, 2, goldD);
        break;
      case 'crescent':
        Art.ell(g, cx, hy - 17, 7.5, 7, PAL.cyan4);
        Art.ell(g, cx + 3, hy - 18, 6.5, 6, 'rgba(0,0,0,0)');
        Art.limb(g, cx - 24, hy - 6, cx - 24, hy + 16, 2, 2, PAL.bark2);
        Art.line(g, cx - 24, hy - 6, cx - 20, hy + 5, PAL.cream, 1);
        Art.line(g, cx - 24, hy + 16, cx - 20, hy + 5, PAL.cream, 1);
        break;
      case 'rays':
        for (let i = 0; i < 9; i++) {
          const a = -Math.PI + (i / 8) * Math.PI;
          Art.limb(g, cx + Math.cos(a) * 12, hy - 6 + Math.sin(a) * 10, cx + Math.cos(a) * 22, hy - 6 + Math.sin(a) * 19, 2.4, 0.8, i % 2 ? gold : goldL);
        }
        break;
      case 'helm':
        Art.ell(g, cx, hy - 11, 15, 6, PAL.stone3);
        Art.rect(g, cx - 15, hy - 11, 30, 3, PAL.stone4);
        Art.rect(g, cx - 2, hy - 22, 4, 11, PAL.red2);
        Art.ell(g, cx, hy - 23, 4, 3, PAL.red3);
        break;
      case 'hammer':
        Art.limb(g, cx - 26, hy + 2, cx - 26, base - 6, 2.4, 2.4, PAL.bark2);
        Art.rect(g, cx - 33, hy - 2, 15, 9, PAL.stone3);
        Art.rect(g, cx - 33, hy - 2, 15, 2.4, PAL.stone4);
        Art.rect(g, cx - 12, hy - 12, 24, 2.4, PAL.red1);
        break;
      case 'heart':
        Art.ell(g, cx - 3, hy - 14, 3.4, 3.2, PAL.red3);
        Art.ell(g, cx + 3, hy - 14, 3.4, 3.2, PAL.red3);
        Art.ell(g, cx, hy - 11, 4.6, 4.4, PAL.red2);
        for (let i = -3; i <= 3; i++) if (i) Art.ell(g, cx + i * 3.6, hy - 11.5 + Math.abs(i) * 0.7, 1.8, 1.1, '#e8a0c0');
        break;
      case 'vine':
        for (let i = -4; i <= 4; i++) { Art.ell(g, cx + i * 3.2, hy - 12 + Math.abs(i) * 0.6, 2.2, 1.4, PAL.moss2); if (i % 2) Art.ell(g, cx + i * 3.2, hy - 15, 1.6, 1.6, PAL.div3); }
        Art.ell(g, cx + 22, hy + 8, 5, 5.5, PAL.gold2);
        Art.ell(g, cx + 22, hy + 6, 4, 2, PAL.div4);
        break;
    }
  }

  // ---- artifact icons drawn big, for the reward flourish ------------------
  function artifact(god, size = 3) {
    const key = `art:${god.key}:${size}`;
    let img = cache.get(key); if (img) return img;
    const { c, g } = Art.cv(20, 20);
    Icons.blit(g, god.artIcon, 2, 2, 1);
    cache.set(key, c); return c;
  }

  // ---- cubes (offerings) --------------------------------------------------
  function drawCube(g, def, w, h, opts = {}) {
    const col = opts.color || def.color;
    const px = Math.max(1, Math.round(Math.min(w, h) / 10));
    const x0 = -w / 2, y0 = -h / 2;
    g.fillStyle = col; g.fillRect(x0, y0, w, h);
    g.fillStyle = U.shade(col, 0.3); g.fillRect(x0, y0, w, px); g.fillRect(x0, y0, px, h);
    g.fillStyle = U.shade(col, 0.5); g.fillRect(x0, y0, px * 2, px);
    g.fillStyle = U.shade(col, -0.34); g.fillRect(x0, y0 + h - px, w, px); g.fillRect(x0 + w - px, y0, px, h);
    // ---- surface: it is a compressed brick of chewed grass, so it says so ----
    // A stable per-cube noise (no Math.random, the thing has to hold still) laid
    // down in four passes: grain, fibres, pits and crumbs off the edges.
    const seed = Math.round(w * 31 + h * 7 + (def.mark ? def.mark.length * 97 : 0));
    let n = seed | 0;
    const rnd = () => { n = (n * 1664525 + 1013904223) & 0x7fffffff; return n / 0x7fffffff; };
    const iw = Math.max(1, Math.round(w - px * 2)), ih = Math.max(1, Math.round(h - px * 2));
    const GRAIN = [U.shade(col, -0.2), U.shade(col, -0.1), U.shade(col, 0.14), U.shade(col, 0.24)];
    for (let i = 0; i < Math.round(iw * ih * 0.3); i++) {   // grain
      g.fillStyle = GRAIN[(rnd() * 4) | 0];
      g.fillRect(Math.round(x0 + px + rnd() * iw), Math.round(y0 + px + rnd() * ih), 1, 1);
    }
    for (let i = 0; i < Math.max(5, Math.round(iw * 0.55)); i++) {   // straw and leaf fibres
      const fx = Math.round(x0 + px + rnd() * (iw - 3)), fy = Math.round(y0 + px + rnd() * (ih - 2));
      const len = 2 + ((rnd() * 3) | 0), k = rnd();
      g.fillStyle = k < 0.42 ? '#6f7a3e' : k < 0.72 ? '#8d8a52' : U.shade(col, 0.34);
      if (rnd() < 0.62) g.fillRect(fx, fy, len, 1); else g.fillRect(fx, fy, 1, len);
      if (rnd() < 0.4) { g.fillStyle = U.shade(col, -0.34); g.fillRect(fx, fy + 1, len, 1); }
    }
    for (let i = 0; i < 5; i++) {                            // pits, each with a lit lower lip
      const pw = px * (1 + ((rnd() * 2) | 0)), ph2 = px;
      const dx2 = Math.round(x0 + px * 1.5 + rnd() * Math.max(1, iw - pw - px));
      const dy2 = Math.round(y0 + px * 1.5 + rnd() * Math.max(1, ih - ph2 * 2 - px));
      g.fillStyle = U.shade(col, -0.4); g.fillRect(dx2, dy2, pw, ph2);
      g.fillStyle = U.shade(col, 0.3); g.fillRect(dx2, dy2 + ph2, pw, 1);
    }
    g.fillStyle = U.shade(col, -0.5);                        // knocked-off lower corners
    g.fillRect(Math.round(x0), Math.round(y0 + h - px), px, px);
    g.fillRect(Math.round(x0 + w - px), Math.round(y0 + h - px), px, px);
    g.fillStyle = U.shade(col, 0.42);                        // and a lit chip off the top right
    g.fillRect(Math.round(x0 + w - px * 2), Math.round(y0), px, px);
    switch (def.mark) {
      case 'sticky':
        g.fillStyle = U.shade(col, 0.45);
        g.fillRect(x0 + px, y0 + h - px * 3, px * 2, px * 3);
        g.fillRect(x0 + w - px * 4, y0 + h - px * 2, px * 2, px * 2);
        break;
      case 'rune':
        g.fillStyle = PAL.div4;
        g.fillRect(x0 + px * 2, y0 + px * 3, px, px * 4); g.fillRect(x0 + px * 2, y0 + px * 3, px * 3, px);
        g.fillRect(x0 + w - px * 4, y0 + h - px * 5, px, px * 3);
        break;
      case 'gold':
        g.fillStyle = PAL.gold4; g.fillRect(x0 + px * 2, y0 + px * 2, px * 2, px * 2);
        g.fillStyle = U.shade(col, -0.25); g.fillRect(-px * 2, -px * 2, px * 4, px * 4);
        g.fillStyle = PAL.gold4; g.fillRect(-px, -px * 2, px * 2, px);
        break;
      case 'stone':
        g.fillStyle = U.shade(col, 0.34);
        for (let i = 0; i < 4; i++) g.fillRect((i % 2 ? 1 : -1) * (w / 2 - px * 3) - px / 2, (i < 2 ? -1 : 1) * (h / 2 - px * 3) - px / 2, px, px);
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
    if (opts.blessed) {
      // sparks over the top of it, not two dots on the front: a blessed cube
      // is lit from above, it is not looking at you.
      const e = Math.max(1, Math.round(w / 9));
      g.fillStyle = PAL.div5;
      g.fillRect(-w / 6 - e / 2, y0 - e * 2, e, e);
      g.fillRect(w / 5 - e / 2, y0 - e * 3, e, e);
      g.fillRect(-e / 2, y0 - e * 4, e, e);
    }
    if (opts.outline) {                                      // a pixel border, never a stroke
      const o = Math.max(1, Math.round(px));
      g.fillStyle = opts.outline;
      g.fillRect(x0, y0, w, o); g.fillRect(x0, y0 + h - o, w, o);
      g.fillRect(x0, y0, o, h); g.fillRect(x0 + w - o, y0, o, h);
    }
  }
  // ---- villagers -------------------------------------------------------------
  // The people who live down the road. One routine builds all of them: a chibi
  // human on two stubby legs, and a table of kits says what they wear, what
  // they are carrying and what colour they are. They walk, they talk, they wave.
  const VW2 = 30, VH2 = 46, VX = 15, VGY = 45;
  const VILLAGERS = {
    bee: { name: 'Maud', skin: '#e8bd92', hair: '#8a6a3a', shirt: '#f2ece0', pants: '#6b5a44',
      hat: 'veil', prop: 'hive', why: 'with a jar of something' },
    fish: { name: 'Errol', skin: '#c9955f', hair: '#3a3028', shirt: '#4a7a9a', pants: '#3a4a58',
      hat: 'bucket', prop: 'rod', why: 'back from the lake' },
    post: { name: 'Bev', skin: '#e0b088', hair: '#a8462c', shirt: '#c9581f', pants: '#2f3a4a',
      hat: 'cap', prop: 'sack', why: 'with the post' },
    bake: { name: 'Nonna', skin: '#d8a878', hair: '#cfc4b0', shirt: '#f0e0c8', pants: '#8a4520',
      hat: 'kerchief', prop: 'tray', why: 'with a tray of something hot' },
    bota: { name: 'Dr Finch', skin: '#a87850', hair: '#2e2a26', shirt: '#7a9a5a', pants: '#4a5238',
      hat: 'wide', prop: 'press', why: 'looking for a plant' },
    bard: { name: 'Little Ash', skin: '#f0cba0', hair: '#f5cd5c', shirt: '#7a58a8', pants: '#4a3a6a',
      hat: 'none', prop: 'lute', why: 'with a song about you' },
    ranger: { name: 'The Ranger', skin: '#d8a878', hair: '#5a4030', shirt: '#8a7a4a', pants: '#4a4a30',
      hat: 'wide', prop: 'press', why: 'doing the rounds' },
    // the three behind the counters in town
    grimm: { name: 'Grimm', skin: '#c9b8a8', hair: '#2a2630', shirt: '#2e2436', pants: '#1c1822',
      hat: 'cap', prop: 'sack', why: 'behind the pawnshop counter' },
    joiner: { name: 'Odger', skin: '#d8a878', hair: '#8a6a3a', shirt: '#9a6a3a', pants: '#5a3a1c',
      hat: 'none', prop: 'press', why: 'up to the elbows in shavings' },
    warren: { name: 'Mrs Warren', skin: '#e0b088', hair: '#b8b0a0', shirt: '#2f5a44', pants: '#3a4438',
      hat: 'wide', prop: 'hive', why: 'minding the livestock' },
  };
  function villager(kind, frame, pose = 'idle') {
    const K = VILLAGERS[kind] || VILLAGERS.bee;
    const n = { idle: 6, walk: 8, talk: 6, wave: 6 }[pose] || 6;
    const f = ((frame % n) + n) % n, t = f / n;
    const key = `vil:${kind}:${f}:${pose}`;
    let img = cache.get(key); if (img) return img;
    const { c, g } = Art.cv(VW2, VH2);
    const S2 = Math.sin(t * TAU);
    let bob = 0, sq = 0, step = 0, armL = 0, armR = 0, lean = 0, blink = 0, mouth = 0;
    switch (pose) {
      case 'idle': bob = [0, -1, -1, 0, 0, 0][f]; sq = S2 * 0.03; armL = S2 * 1.4; blink = f === 4 ? 1 : 0; break;
      case 'walk': bob = [-2, -3, -1, 0, -2, -3, -1, 0][f]; step = [2, 1, -1, -2, -2, -1, 1, 2][f];
        armL = -step * 1.2; armR = step * 1.2; lean = 0.4; sq = f % 2 ? -0.05 : 0.05; break;
      case 'talk': bob = S2 * 0.8; armR = -2 - S2 * 2.4; mouth = f % 2; blink = f === 3 ? 1 : 0; break;
      case 'wave': bob = -1; armR = -7 - Math.abs(S2) * 3; mouth = 1; break;
    }
    const cx = VX + lean, by = VGY + bob;
    const SK = K.skin, SKD = U.shade(K.skin, -0.24);
    const SH = K.shirt, SHD = U.shade(K.shirt, -0.26), SHL = U.shade(K.shirt, 0.2);
    const PT = K.pants, PTD = U.shade(K.pants, -0.26);
    // legs
    for (const d of [-1, 1]) {
      const lx = cx + d * 3.4 + (d > 0 ? step : -step) * 0.7;
      Art.rect(g, lx - 2, by - 12, 4, 12, PTD);
      Art.rect(g, lx - 2, by - 12, 3, 11, PT);
      Art.rect(g, lx - 3, by - 2, 6, 3, '#2a2018');              // a boot
      Art.rect(g, lx - 3, by - 2, 5, 1, '#4a3c2e');
    }
    // body: a rounded tunic, wider at the hem
    const bh = 15 * (1 - sq), bw = 7.6 * (1 + sq * 0.5);
    Art.ell(g, cx, by - 12 - bh * 0.5, bw + 0.8, bh * 0.5 + 0.8, PAL.ink);
    Art.ell(g, cx, by - 12 - bh * 0.5, bw, bh * 0.5, SHD);
    Art.rect(g, cx - bw, by - 14, bw * 2, 3, SHD);
    Art.ell(g, cx, by - 13 - bh * 0.5, bw - 1, bh * 0.44, SH);
    Art.ell(g, cx - bw * 0.35, by - 15 - bh * 0.5, bw * 0.4, bh * 0.22, SHL);
    // arms
    for (const [d, sw] of [[-1, armL], [1, armR]]) {
      const ax = cx + d * (bw - 0.6), ay = by - 12 - bh * 0.72;
      Art.limb(g, ax, ay, ax + d * 2.4, ay + 8 + sw, 2.6, 2, SHD);
      Art.limb(g, ax, ay, ax + d * 2.2, ay + 7 + sw, 1.8, 1.4, SH);
      Art.ell(g, ax + d * 2.6, ay + 9 + sw, 1.8, 1.8, SK);        // a hand
    }
    // head
    const hy = by - 12 - bh - 6;
    Art.ell(g, cx, hy, 6.4, 6.2, PAL.ink);
    Art.ell(g, cx, hy, 5.8, 5.6, SK);
    Art.ell(g, cx - 1.6, hy - 1.6, 2.4, 2, U.shade(SK, 0.18));
    Art.ell(g, cx, hy + 4.6, 2.4, 1.6, SKD);                      // a chin
    // hair
    Art.ell(g, cx, hy - 2.4, 6, 4, K.hair);
    Art.ell(g, cx - 4.4, hy - 0.4, 2, 3, K.hair);
    Art.ell(g, cx + 4.4, hy - 0.4, 2, 3, K.hair);
    // face
    if (blink) { Art.rect(g, cx - 3.4, hy - 0.4, 2.4, 1, '#2a1a14'); Art.rect(g, cx + 1.2, hy - 0.4, 2.4, 1, '#2a1a14'); }
    else {
      Art.ell(g, cx - 2.2, hy - 0.2, 1.3, 1.5, '#fdf3dc');
      Art.ell(g, cx + 2.2, hy - 0.2, 1.3, 1.5, '#fdf3dc');
      Art.ell(g, cx - 2.1, hy, 0.8, 1, '#241a14');
      Art.ell(g, cx + 2.3, hy, 0.8, 1, '#241a14');
    }
    Art.ell(g, cx - 3.8, hy + 1.8, 1.4, 1, 'rgba(224,112,90,0.5)');
    Art.ell(g, cx + 3.8, hy + 1.8, 1.4, 1, 'rgba(224,112,90,0.5)');
    if (mouth) { Art.ell(g, cx, hy + 2.6, 1.6, 1.4, '#5a2a24'); Art.rect(g, cx - 1, hy + 2, 2, 1, '#fdf3dc'); }
    else Art.rect(g, cx - 1.2, hy + 2.6, 2.4, 1, '#5a2a24');
    // what is on their head
    switch (K.hat) {
      case 'veil':
        Art.ell(g, cx, hy - 4.6, 7.6, 2.4, '#f2ece0');
        Art.rect(g, cx - 7.6, hy - 5.4, 15.2, 2, '#e0d8c8');
        g.globalAlpha = 0.5; Art.ell(g, cx, hy, 6.6, 6.4, '#dfe6ea'); g.globalAlpha = 1;
        for (let i = 0; i < 8; i++) Art.rect(g, cx - 6 + i * 1.6, hy - 3 + (i % 3) * 2.4, 1, 1, '#b8c0c8');
        break;
      case 'bucket':
        Art.ell(g, cx, hy - 4, 7.2, 2.6, '#4a5a48');
        Art.rect(g, cx - 5.4, hy - 7.6, 10.8, 4, '#5c6e58');
        Art.rect(g, cx - 5.4, hy - 7.6, 10.8, 1, '#7a8c72');
        break;
      case 'cap':
        Art.rect(g, cx - 5.4, hy - 6.4, 10.8, 3.4, '#2f3a4a');
        Art.ell(g, cx, hy - 6.6, 5.6, 2.6, '#3a4a5c');
        Art.rect(g, cx - 1, hy - 8.4, 2, 2, '#c9581f');
        Art.rect(g, cx + 1, hy - 3.6, 7, 1.6, '#2f3a4a');           // the peak
        break;
      case 'kerchief':
        Art.ell(g, cx, hy - 3.4, 6.4, 4, '#c94a5a');
        Art.rect(g, cx - 6.4, hy - 3.4, 12.8, 2, '#a83a48');
        for (let i = 0; i < 5; i++) Art.rect(g, cx - 5 + i * 2.4, hy - 5 + (i % 2), 1, 1, '#f0e0c8');
        Art.poly(g, [[cx + 5, hy - 2], [cx + 9, hy + 1], [cx + 5, hy + 2]], '#a83a48');
        break;
      case 'wide':
        Art.ell(g, cx, hy - 3.6, 10.4, 3, '#8a6a3a');
        Art.ell(g, cx, hy - 4, 9.6, 2.4, '#a8834a');
        Art.ell(g, cx, hy - 6.4, 5, 3.4, '#8a6a3a');
        Art.rect(g, cx - 5, hy - 5.4, 10, 1.4, '#5a4424');
        break;
    }
    // and what they are carrying
    const px = cx + (bw - 0.6) + 2.6, py = by - 12 - 15 * 0.72 + 9 + armR;
    switch (K.prop) {
      case 'hive':
        for (let i = 0; i < 4; i++) Art.ell(g, px + 2, py + 2 - i * 2.2, 5 - i * 0.7, 1.6, i % 2 ? '#d8a52f' : '#c08f22');
        Art.rect(g, px - 1, py - 6, 6, 1, '#8a6a3a');
        for (let i = 0; i < 3; i++) { Art.ell(g, px - 4 + i * 5, py - 9 - (i % 2) * 3, 1.4, 1.2, '#f5cd5c'); }
        break;
      case 'rod':
        for (let i = 0; i < 22; i++) Art.rect(g, px + i * 0.5, py - i * 1.1, 1, 2, '#6b4a2c');
        Art.rect(g, px + 10, py - 22, 1, 12, '#b8c0c8');
        Art.ell(g, px + 10, py - 10, 1.6, 2.2, '#8fd4e4');
        break;
      case 'sack':
        Art.ell(g, px + 2, py, 5, 5.4, '#8a6a3a');
        Art.ell(g, px + 2, py, 4.2, 4.6, '#a8834a');
        Art.rect(g, px, py - 5, 4, 2, '#6b4a2c');
        Art.rect(g, px, py - 1, 4, 3, '#f0e0c8');
        break;
      case 'tray':
        Art.rect(g, px - 5, py, 12, 2, '#8a6a3a');
        Art.rect(g, px - 5, py, 12, 1, '#a8834a');
        for (let i = 0; i < 3; i++) Art.ell(g, px - 3 + i * 3.4, py - 1.4, 1.6, 1.4, '#c9a15c');
        for (let i = 0; i < 3; i++) { g.globalAlpha = 0.35; Art.ell(g, px - 3 + i * 3.4, py - 5 - (i % 2), 1.6, 2, '#e8e0d0'); g.globalAlpha = 1; }
        break;
      case 'press':
        Art.rect(g, px - 2, py - 4, 8, 9, '#6b4a2c');
        Art.rect(g, px - 2, py - 4, 8, 1.4, '#a8834a');
        Art.rect(g, px - 2, py, 8, 1, '#4a3220');
        Art.ell(g, px + 2, py - 6, 2.4, 1.6, '#5d9440');
        break;
      case 'lute':
        Art.ell(g, px + 1, py, 4.6, 5.4, '#8a5a2a');
        Art.ell(g, px + 1, py, 3.8, 4.6, '#b07a3a');
        Art.ell(g, px + 1, py - 0.6, 1.8, 1.8, '#3a2418');
        for (let i = 0; i < 12; i++) Art.rect(g, px + 1, py - 5 - i, 1, 1, '#6b4a2c');
        for (let i = 0; i < 3; i++) Art.rect(g, px - 0.6 + i, py - 16, 1, 3, '#cfc4b0');
        break;
    }
    Art.outline(c, '#000000', 1);
    cache.set(key, c);
    return c;
  }

  return { S, AGE, POSES, CULT_POSES, KW, KH, cashier, villager, VILLAGERS, VW2, VH2, GW, GH, GX, GGY, groot, wombat, blit, shadow, wombachu, furOf, cupid, godForm, artifact, drawCube, ant, crow, owl, mascot, cultist: jim, jim, setFace, get face() { return faceMood; }, FACES, init() { }, clear: () => cache.clear() };
})();
