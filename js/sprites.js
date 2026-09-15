// ---- Procedural wombats, gods and cupids -----------------------------------
// One drawing routine builds every wombat. Age is a coordinate scale about the
// feet, so joeys are the same animal with a bigger head; pelts are swapped
// palettes; poses are computed curves rather than hand-keyed frames.
const Sprites = (() => {
  const S = 1.1;                  // world pixels per art pixel: a wombat is a small animal
  const AW = 44, AH = 30;         // art canvas
  const PAD = 12;                 // headroom above, for poses that rear up
  const AX = 22, GY = 27;         // anchor: feet centre / ground line
  const cache = new Map();

  const AGE = { baby: { k: 0.62, head: 1.2, name: 'Joey' }, juvenile: { k: 0.78, head: 1.1, name: 'Juvenile' }, adult: { k: 1, head: 1, name: 'Adult' } };
  // Every animation on the sheet, plus the few the grove itself needs.
  const POSES = { idle: 4, walk: 8, run: 6, turn: 6, jump: 5, hurt: 4, sit: 3, lie: 2, sleep: 3, eat: 6, graze: 4, dig: 6, happy: 5, pray: 6, bite: 6 };

  function pose(name, f) {
    const n = POSES[name] || 1, t = f / n;
    const p = {
      bob: 0, squash: 0, headDip: 0, headFwd: 0, front: 0, rear: 0, jaw: 0, ear: 0, blink: 0,
      leg: [0, 0, 0, 0], tuck: 0, sit: 0, lie: 0, sleep: 0, view: 'side', tilt: 0, hurt: 0, reach: 0, z: 0,
    };
    const s = Math.sin(t * TAU);
    switch (name) {
      case 'idle': p.bob = s * 0.5; p.blink = f === 3 ? 1 : 0; p.ear = f === 1 ? 1 : 0; break;
      case 'walk': {
        const a = Math.sin(t * TAU), b = Math.sin(t * TAU + Math.PI);
        p.leg = [Math.max(0, a) * 4, Math.max(0, b) * 4, Math.max(0, b) * 4, Math.max(0, a) * 4];
        p.bob = -Math.abs(Math.sin(t * TAU * 2)) * 1.4;
        p.headDip = Math.abs(Math.sin(t * TAU * 2)) * 1.2 - 0.5;
        break;
      }
      case 'run': {
        const a = Math.sin(t * TAU), b = Math.sin(t * TAU + Math.PI * 0.6);
        p.leg = [Math.max(0, a) * 6, Math.max(0, a) * 5, Math.max(0, b) * 6, Math.max(0, b) * 5];
        p.bob = -Math.abs(Math.sin(t * TAU)) * 3; p.front = 1.2; p.headFwd = 2; p.squash = -0.06 + Math.sin(t * TAU * 2) * 0.06;
        break;
      }
      case 'turn': p.view = ['side', 'quarter', 'back', 'back', 'quarter', 'side'][f]; p.blink = f === 1 || f === 4 ? 0 : 0; break;
      case 'jump': {
        const lift = [0, -9, -14, -9, 0][f];
        p.bob = lift; p.tuck = f === 2 ? 1 : f === 1 || f === 3 ? 0.5 : 0;
        p.squash = f === 0 ? 0.16 : f === 4 ? 0.2 : f === 2 ? -0.12 : -0.05;
        p.tilt = f === 1 ? -0.18 : f === 3 ? 0.18 : 0; p.ear = f === 2 ? 1 : 0;
        break;
      }
      case 'hurt': p.hurt = [1, 0.7, 0.4, 0][f]; p.tilt = 0.28 * p.hurt; p.blink = f < 3 ? 1 : 0; p.bob = -p.hurt * 2; break;
      case 'sit': p.sit = 1; p.bob = s * 0.4; p.blink = f === 2 ? 1 : 0; break;
      case 'lie': p.lie = 1; p.bob = f ? 0.6 : 0; break;
      case 'sleep': p.lie = 1; p.sleep = 1; p.blink = 1; p.z = f; p.bob = f === 1 ? 0.6 : 0; break;
      case 'eat': p.headDip = 7; p.headFwd = 2.4; p.front = 3.2; p.rear = -1; p.jaw = Math.abs(Math.sin(t * TAU * 2)) * 1.4; p.bob = 0.4; break;
      case 'graze': p.headDip = 6.5; p.headFwd = 2; p.front = 2.6; p.jaw = f % 2 ? 0.8 : 0; break;
      case 'dig': {
        const a = Math.sin(t * TAU * 2), b = Math.sin(t * TAU * 2 + Math.PI);
        p.leg = [0, 0, Math.max(0, a) * 6, Math.max(0, b) * 6];
        p.headDip = 4.6; p.headFwd = 1.6; p.front = 3.6; p.rear = -2.4; p.jaw = 0.4;
        break;
      }
      case 'happy': {
        const lift = [0, -5, -8, -5, 0][f];
        p.bob = lift; p.tuck = f === 2 ? 0.6 : 0; p.ear = 1; p.jaw = 0.8; p.squash = f === 0 || f === 4 ? 0.12 : -0.06;
        break;
      }
      case 'pray': p.sit = 1; p.reach = 0.6 + s * 0.2; p.bob = s * 0.4; p.blink = f === 3 ? 1 : 0; p.ear = 1; break;
      case 'bite': p.sit = 1; p.reach = 1; p.jaw = f > 2 ? 1.4 : 0.2; p.bob = -s * 0.5; p.ear = 1; break;
    }
    return p;
  }

  // ---- the wombat ---------------------------------------------------------
  // Drawn to the sheet: a fat rounded loaf of a body, the head a rounded bump
  // on the front that carries a big dark nose block and two dot eyes, small
  // round ears, four stubby legs ending in dark paws, a darker dithered saddle
  // along the back, and one black line around the lot.
  function drawWombat(g, fur, name, f, ageKey) {
    const p = pose(name, f);
    const A = AGE[ageKey] || AGE.adult;
    const K = A.k, HK = A.head;
    const X = (x) => AX + (x - AX) * K;
    const Y = (y) => GY + (y - GY) * K;
    const L = (v) => Math.max(1, v * K);
    const R = (x, y, w, h, col) => Art.rect(g, X(x), Y(y), L(w), L(h), col);
    const E = (x, y, rx, ry, col) => Art.ell(g, X(x), Y(y), Math.max(0.6, rx * K), Math.max(0.6, ry * K), col);
    const saddle = (cx, cy, rx, ry) => {
      Art.speckle(g, X(cx), Y(cy), rx * K, ry * K, fur.mid, Math.round(rx * ry * 0.55), 7);
      Art.speckle(g, X(cx), Y(cy - ry * 0.4), rx * K * 0.9, ry * K * 0.5, fur.dark, Math.round(rx * ry * 0.2), 13);
    };
    const paws = (x, y, w) => { R(x, y, w, 2.2, fur.deep); R(x, y + 1.4, w, 1, fur.ink); };
    const eye = (x, y, closed) => { if (closed) R(x - 0.4, y + 0.6, 3, 1, fur.ink); else R(x, y, 2, 2, fur.ink); };
    const nose = (x, y, w, h) => { E(x + w / 2, y + h / 2, w / 2, h / 2, fur.nose); R(x + 1, y + h - 0.6, w - 2, 1, fur.ink); if (p.jaw > 0.6) { R(x + 1, y + h + 0.4, w - 2.4, 1.6, fur.ink); R(x + 1.6, y + h + 0.6, 1.2, 1, PAL.cream); } };
    const ears = (lx, rx, y, lift) => {
      E(lx, y - lift * 0.8, 2.6 * HK, 2.6 * HK, fur.mid); E(lx, y + 0.4 - lift * 0.8, 1.4 * HK, 1.4 * HK, fur.dark);
      E(rx, y - lift, 2.6 * HK, 2.6 * HK, fur.base); E(rx, y + 0.4 - lift, 1.4 * HK, 1.4 * HK, fur.mid);
    };
    const glow = () => {
      if (fur.moss) { E(16, 8, 4, 1.8, PAL.moss3); E(24, 7.5, 3, 1.6, PAL.moss2); }
      if (fur.stars) { R(14, 12, 1, 1, PAL.div5); R(20, 10, 1, 1, PAL.cream); R(26, 13, 1, 1, PAL.div4); }
    };

    // ---- turn frames: the back and the three-quarter view -------------------
    if (p.view === 'back') {
      E(22, 15.5, 11.5, 8.5, fur.base);
      R(11, 12, 22, 9, fur.base);
      saddle(22, 12, 9, 4);
      E(22, 7.5, 7.5 * HK, 6.5 * HK, fur.base);                 // the back of the head
      ears(17, 27, 2.5, 0);
      E(22, 20.5, 1.6, 1.4, fur.dark);                          // the tail dot
      for (const lx of [10, 17, 24, 31]) { R(lx, 21, 5, 6, fur.mid); paws(lx - 0.5, 24.8, 6); }
      glow();
      return;
    }
    if (p.view === 'quarter') {
      E(21, 15.5, 11, 8, fur.base); R(11, 11, 20, 10, fur.base);
      saddle(19, 12, 8, 4);
      E(27, 12.5, 8 * HK, 7.5 * HK, fur.base);                  // face turned toward us
      E(29, 15, 5.5 * HK, 4.5 * HK, fur.light);
      ears(21, 31, 6, 0);
      eye(24, 11, p.blink); eye(30, 11, p.blink);
      nose(24.5, 14, 6.5, 4.5);
      for (const lx of [10, 16, 23, 29]) { R(lx, 21, 5, 6, fur.mid); paws(lx - 0.5, 24.8, 6); }
      glow();
      return;
    }

    // ---- lying flat, asleep or not ------------------------------------------
    if (p.lie) {
      E(19, 20.5 + p.bob, 14, 6, fur.base);
      R(6, 18 + p.bob, 26, 6, fur.base);
      saddle(18, 18, 11, 3);
      E(30, 18.5 + p.bob, 8 * HK, 6 * HK, fur.base);
      E(32, 20, 5 * HK, 3.5 * HK, fur.light);
      ears(25, 33, 13 + p.bob, 0);
      eye(29.5, 17 + p.bob, p.blink);
      nose(33.5, 19 + p.bob, 6.5, 4.5);
      R(7, 24.5, 6, 2.2, fur.deep); R(14, 25, 5, 1.6, fur.deep); R(25, 25, 5, 1.6, fur.deep);
      if (p.sleep) {                                             // the z, drifting up
        const zx = 36 + p.z * 1.2, zy = 4 - p.z * 3;
        R(zx, zy, 4, 1, PAL.div4); R(zx + 2, zy + 1, 1, 1, PAL.div4); R(zx + 1, zy + 2, 1, 1, PAL.div4); R(zx, zy + 3, 4, 1, PAL.div4);
      }
      glow();
      return;
    }

    // ---- sitting up on the rump ---------------------------------------------
    if (p.sit) {
      const by = 14 + p.bob;
      E(20, by + 2, 9.5, 10.5, fur.base);                        // a tall pear of a body
      E(19, by + 8, 10.5, 6, fur.base);
      E(19, by + 6, 6.5, 6, fur.light);                          // pale belly
      saddle(16, by - 1, 6, 5);
      R(12, 23.6, 6, 3, fur.deep); R(22, 23.6, 6, 3, fur.deep);  // rear feet splayed
      R(12, 25.6, 6, 1, fur.ink); R(22, 25.6, 6, 1, fur.ink);
      E(23, by - 8, 7.5 * HK, 6.8 * HK, fur.base);               // head on top
      ears(18, 27, by - 14.6, p.ear);
      eye(21, by - 9.5, p.blink); eye(26.5, by - 9.5, p.blink);
      nose(23, by - 6.5, 6.5, 4.5);
      const py = by + 4 - p.reach * 3;                          // front paws held up
      E(15, py, 2.6, 2.4, fur.mid); E(23, py - 1, 2.6, 2.4, fur.base);
      R(13.5, py + 1, 3, 1, fur.ink); R(21.5, py, 3, 1, fur.ink);
      glow();
      return;
    }

    // ---- the side view everything else uses ----------------------------------
    const bob = p.bob;
    g.save();
    if (p.tilt) { g.translate(X(20), Y(20)); g.rotate(-p.tilt); g.translate(-X(20), -Y(20)); }
    const sq = p.squash, bw = 13 * (1 + sq * 0.6), bh = 7.5 * (1 - sq);
    const by = 15.5 + bob + (7.5 - bh);
    const tiltF = (t) => U.lerp(-p.rear, p.front, t) * 0.5;
    // legs first, so the belly overlaps their tops
    if (p.tuck < 1) {
      const legs = [[9, 0], [15, 1], [24, 2], [30, 3]];
      for (const [lx, i] of legs) {
        const lf = (p.leg[i] || 0) + p.tuck * 4;
        const swing = (i >= 2 ? 1 : -1) * (p.leg[i] || 0) * 0.35;
        const top = by + bh - 4 + tiltF((lx - 7) / 26) + bob * 0.2;
        const floor = Math.min(GY, by + bh + 4.5);            // airborne legs hang from the body
        const h = floor - top - lf;
        if (h > 1.2) {
          R(lx + swing, top, 5, h, i % 2 ? fur.mid : fur.base);
          R(lx + swing + 3.6, top, 1.4, h, fur.dark);
          paws(lx + swing - 0.4, floor - lf - 2.2, 6);
        }
      }
    }
    // body: a brick of a loaf with the corners knocked off, not a ball
    const slab = (x, y, w, h, col) => { R(x + 2, y, w - 4, h, col); R(x + 1, y + 1, w - 2, h - 2, col); R(x, y + 2, w, h - 4, col); };
    const bx0 = 20 - bw, bw2 = bw * 2, by0 = by - bh, bh2 = bh * 2;
    slab(bx0, by0 - p.rear * 0.5, bw2, bh2, fur.base);
    slab(bx0 - 1, by0 + 1, 8, bh2 - 1, fur.base);                   // the rump
    R(bx0 + 3, by0 + bh2 - 4, bw2 - 6, 3, fur.light);              // belly band
    R(bx0 + 2, by0, bw2 - 4, 1.2, fur.light);                      // sun along the back
    saddle(18, by - bh * 0.35, 10, bh * 0.55);
    R(bx0 - 2, by - 1, 1.6, 3, fur.mid);                          // the tail nub
    // head: a squared bump on the front, rising above the back
    const hx = 30 + p.headFwd, hy = 13 + bob + p.headDip + p.front * 0.6;
    const hw = 8.5 * HK, hh = 7.5 * HK;
    slab(hx - hw, hy - hh, hw * 2, hh * 2, fur.base);
    R(hx - hw + 2, hy - hh, hw * 2 - 4, 1.2, fur.light);
    R(hx - 2.5, hy + 0.5, 6.5 * HK, 4.5 * HK, fur.light);          // cheek
    Art.speckle(g, X(hx - 2), Y(hy - 3), 5 * K, 2.5 * K, fur.mid, 6, 3);
    ears(hx - 5, hx + 3, hy - 7.2 * HK, p.ear);
    eye(hx - 1.5, hy - 2.2, p.blink);
    nose(hx + 3, hy + 0.6, 7, 4.8);
    if (p.hurt > 0) {                                             // little stars over the head
      for (let i = 0; i < 3; i++) { const a = p.hurt * 4 + i * 2.1; R(hx - 3 + Math.cos(a) * 7, hy - 9 + Math.sin(a) * 2, 1.4, 1.4, PAL.gold3); }
    }
    glow();
    g.restore();
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
    Art.outline(c, PAL.ink);
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

  // ---- the cultist: a tall hooded human, six and a half heads high ---------
  // Human proportions, not a cone: narrow shoulders, a long straight robe with
  // a slight flare, arms that hang and swing, bare hands at the cuffs, and a
  // face you can half see in the shadow of the hood.
  const CULT_POSES = { idle: 6, walk: 6, run: 6, turn: 6, jump: 5, cast: 6, hurt: 3, sit: 3, sleep: 3 };
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
  function expressions(g, hx, faceY, pose, f, hurt) {
    const GL0 = '#3d2a08', GL1 = '#a8761a', GL2 = '#ffcf4a', GL3 = '#fff2c0';
    let m = FACES[faceMood] || FACES.idle;
    if (hurt > 0) m = FACES.shock;
    else if (pose === 'cast') m = FACES.proud;
    else if (pose === 'sleep') m = FACES.tired;
    const ey = faceY + 1.2;
    const blink = pose === 'idle' && f === 3;
    const shut = m.eye === 'shut' || blink;
    // the glow each eye throws on the inside of the hood
    for (const s2 of [-1, 1]) {
      const ex = hx + s2 * 2.8;
      const r = shut ? 2 : m.eye === 'wide' ? 5 : 4;
      Art.ell(g, ex, ey, r, r * 0.85, 'rgba(168,118,26,0.28)');
      Art.ell(g, ex, ey, r * 0.62, r * 0.55, 'rgba(255,207,74,0.22)');
    }
    if (shut) {
      for (const s2 of [-1, 1]) {
        Art.rect(g, hx + s2 * 2.8 - 1.8, ey, 3.6, 0.9, GL1);
        Art.rect(g, hx + s2 * 2.8 - 1.2, ey, 2.4, 0.9, GL2);
      }
      return;
    }
    for (const s2 of [-1, 1]) {
      const ex = hx + s2 * 2.8;
      if (m.eye === 'happy') {                       // two curved slits, turned up
        Art.poly(g, [[ex - 2.1, ey + 1.1], [ex, ey - 1.5], [ex + 2.1, ey + 1.1], [ex, ey + 0.1]], GL1);
        Art.poly(g, [[ex - 1.5, ey + 0.7], [ex, ey - 0.9], [ex + 1.5, ey + 0.7], [ex, ey - 0.1]], GL2);
        continue;
      }
      const rw = m.eye === 'wide' ? 2.3 : m.eye === 'narrow' ? 2.4 : 2;
      const rh = m.eye === 'wide' ? 2.4 : m.eye === 'narrow' ? 0.9 : m.eye === 'squint' ? 1.2 : 1.9;
      const off = m.eye === 'look' ? 0.8 : 0;
      Art.ell(g, ex, ey, rw + 0.5, rh + 0.5, GL0);
      Art.ell(g, ex + off, ey, rw, rh, GL1);
      Art.ell(g, ex + off, ey, rw * 0.68, rh * 0.66, GL2);
      Art.ell(g, ex + off - 0.4, ey - rh * 0.25, rw * 0.3, rh * 0.3, GL3);
    }
    // the brow is a bar of shadow biting down over the lights
    for (const s2 of [-1, 1]) {
      const bx = hx + s2 * 2.8;
      const tilt = m.brow * s2 * 1.5;
      Art.poly(g, [[bx - 3, ey - 4.2 - tilt], [bx + 3, ey - 4.2 + tilt],
                   [bx + 3, ey - 2.2 + tilt], [bx - 3, ey - 2.2 - tilt]], 'rgba(6,4,10,0.85)');
    }
    // and a thin mouth of light, when the mood has one
    if (m.mouth === 'o' || m.mouth === 'open') Art.ell(g, hx, ey + 5.4, 1.3, 1.5, 'rgba(168,118,26,0.55)');
    else if (m.mouth === 'grin') Art.rect(g, hx - 2, ey + 5.4, 4, 0.9, 'rgba(168,118,26,0.5)');
  }

  function cultist(frame, pose = 'idle') {
    const n = CULT_POSES[pose] || 1, f = ((frame % n) + n) % n, t = f / n;
    const key = `cult:${f}:${pose}:${faceMood}`;
    let img = cache.get(key); if (img) return img;
    const { c, g } = Art.cv(CW, CH);
    // A big man in a wombat-skin cowl and a robe to the floor. Nothing of him
    // shows but two hands and two lights where his eyes should be.
    const ROBE0 = '#140d18', ROBE1 = '#24162a', ROBE2 = '#37233f', ROBE3 = '#4d3457';
    const FUR0 = '#33231a', FUR1 = '#54392a', FUR2 = '#77543a';
    const SASH0 = '#5e1a24', SASH1 = '#8f2c38', SASH2 = '#b84a50';
    const BOOT0 = '#0f0c12', BOOT1 = '#241c26', BOOT2 = '#3a2c3e';
    const BRD0 = '#6a5630';
    const GOLD = '#c1912a', GOLD2 = '#f2cf62', TEAL2 = '#8fd4e4';
    const VOID = '#05030a';
    const SK0 = '#5e4034', SK1 = '#8a6148', SK2 = '#ab8264';
    const S = Math.sin(t * TAU);
    let bob = 0, lean = 0, flare = 0, hemUp = 0, armL = 0, armR = 0, view = 'front';
    let sit = 0, lie = 0, hurt = 0, staff = 0, spark = 0, stride = 0, clasp = 1;
    switch (pose) {
      case 'idle': bob = [0, 0, 1, 1, 0, 0][f]; armL = S * 0.5; armR = -S * 0.5; break;
      case 'walk': stride = S * 1.7; flare = Math.abs(S) * 2.4; bob = -Math.abs(Math.sin(t * TAU * 2)) * 1.8;
        armL = -S * 5.5; armR = S * 5.5; clasp = 0; break;
      case 'run': lean = 2.2; stride = S * 1.9; flare = 3 + Math.abs(S) * 2.5; hemUp = 4;
        bob = -Math.abs(Math.sin(t * TAU * 2)) * 3; armL = -S * 8 - 3; armR = S * 8 - 3; clasp = 0; break;
      case 'turn': view = ['front', 'quarter', 'back', 'back', 'quarter', 'front'][f]; break;
      case 'jump': bob = [1, -9, -15, -9, 1][f]; hemUp = [0, 4, 7, 4, 0][f]; flare = [0, 2, 3, 2, 0][f];
        armL = armR = [0, -6, -9, -6, 0][f]; clasp = 0; break;
      case 'cast': staff = Math.min(1, f / 2); spark = f >= 3 ? f - 2 : 0;
        armL = -2 - staff * 2; armR = -7 - staff * 9; bob = f >= 3 ? -1 : 0; clasp = 0; break;
      case 'hurt': hurt = [1, 0.6, 0.2][f]; lean = -3.5 * hurt; bob = hurt * 1.8; clasp = 0; break;
      case 'sit': sit = 1; bob = [0, 0.5, 0][f]; clasp = 1; break;
      case 'sleep': lie = 1; break;
    }
    g.save();
    if (lean) { g.translate(CX, CGY); g.transform(1, 0, lean * 0.05, 1, 0, 0); g.translate(-CX, -CGY); }

    if (lie) {                                        // curled on her side, hood to the left
      Art.ell(g, 24, 56, 15, 5.5, R1); Art.ell(g, 24, 55, 13.5, 4.6, R2); Art.ell(g, 22, 53.5, 8, 3, R3);
      for (let i = 0; i < 6; i++) Art.rect(g, 12 + i * 4.6, 59, 2.6, 2, GOLD);
      Art.ell(g, 10, 53, 7.5, 6.4, R2); Art.ell(g, 10, 52, 6.4, 5.4, R1); Art.ell(g, 9, 54, 3.8, 3.6, VOID);
      Art.rect(g, 7, 54, 1.8, 1, GOLD2); Art.rect(g, 10.2, 54, 1.8, 1, GOLD2);
      Art.ell(g, 10, 48, 3.2, 2.2, R3);
      Art.ell(g, 17, 57.5, 2.6, 1.8, SK2);                                  // a hand tucked under
      const zx = 22 + f * 2, zy = 40 - f * 4;
      Art.rect(g, zx, zy, 4, 1, GOLD2); Art.rect(g, zx + 2, zy + 1, 1, 1, GOLD2);
      Art.rect(g, zx + 1, zy + 2, 1, 1, GOLD2); Art.rect(g, zx, zy + 3, 4, 1, GOLD2);
      g.restore(); Art.outline(c, '#0a0810', 1); cache.set(key, c); return c;
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

    // ---- the robe, from the hem up -----------------------------------------
    // Two boots under the hem, and only when he is moving enough to show them.
    if (!sit && Math.abs(stride) > 0.3) {
      for (const s2 of [-1, 1]) {
        const fx = CX + s2 * 4 + stride * s2 * 5;
        Art.rect(g, fx - 3.4, hem - 3, 6.8, 4, BOOT0);
        Art.rect(g, fx - 3.4, hem - 3, 6.8, 1, BOOT2);
      }
    }
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
      Art.limb(g, CX + u * hipW * 0.8, hip + 1, CX + u * hemW * 0.86 + stride * u * 2, hem - 1,
        1.4, 2.2, i % 2 ? ROBE0 : ROBE2);
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
      // the sigil: a gold seal with a wombat's head knocked out of it
      const py = chestY - 1;
      Art.ell(g, CX, py, 5, 4.6, ROBE0);
      Art.ell(g, CX, py, 4.2, 3.9, GOLD);
      Art.ell(g, CX - 1.2, py - 1.4, 1.8, 1.4, GOLD2);
      Art.ell(g, CX - 2.2, py - 1.6, 1.3, 1.3, ROBE0);                     // its two ears
      Art.ell(g, CX + 2.2, py - 1.6, 1.3, 1.3, ROBE0);
      Art.ell(g, CX, py + 0.4, 2.3, 2, ROBE0);                             // the head
      Art.ell(g, CX, py + 1.4, 1.3, 1, GOLD);                              // and the snout
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
    const domeY = hoodTop + 3 - tip * 1.2 + (mood.eye === 'shut' ? 1.4 : 0);
    const faceY = domeY + 3.8;
    for (const s2 of [-1, 1]) {                                            // ears, pricked
      const ex2 = hx + s2 * 9.2, ey2 = domeY - 5.6;
      Art.ell(g, ex2, ey2, 4.8, 5.2, ROBE0);
      Art.ell(g, ex2, ey2, 3.8, 4, FUR1);
      Art.ell(g, ex2 - s2 * 0.5, ey2 + 0.5, 2, 2.1, '#2a1a12');
      Art.ell(g, ex2 - s2 * 1, ey2 - 1.4, 1.3, 1.2, FUR2);
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
      Art.ell(g, hx, faceY, 8.4, 7.2, FUR0);                               // the fur rim
      Art.ell(g, hx, faceY + 0.3, 7.6, 6.5, ROBE0);
      Art.ell(g, hx, faceY + 0.6, 6.8, 5.8, '#0a0610');
      Art.ell(g, hx, faceY + 0.9, 6, 5.1, VOID);
      Art.ell(g, hx, faceY + 1.4, 4.8, 3.9, '#000000');
      // one faint ring of light caught on the lip of it, and no more
      Art.ellBand(g, hx, faceY - 0.2, 8, 6.9, 'rgba(112,78,48,0.55)', 0.4, 0.62);
      Art.ellBand(g, hx, faceY, 8.2, 7, 'rgba(48,32,20,0.6)', 0.86, 1);
    }
    // the sides of the cowl, closing in on the opening
    for (const s2 of [-1, 1]) {
      Art.ell(g, hx + s2 * 9.4, faceY - 1.4, 3, 6.2, ROBE0);
      Art.ell(g, hx + s2 * 9.6, faceY - 1.8, 2.3, 5.4, FUR0);
      Art.ell(g, hx + s2 * 9.8, faceY - 3.6, 1.2, 2.2, FUR1);
    }
    // two teeth of the skull hanging either side, on cords
    for (const s2 of [-1, 1]) {
      const tx2 = hx + s2 * 10.4, ty2 = faceY + 2.6;
      Art.rect(g, tx2 - 0.4, ty2 - 3, 0.8, 3.4, '#6a5a3a');
      Art.poly(g, [[tx2 - 1.4, ty2 + 0.4], [tx2 + 1.4, ty2 + 0.4], [tx2, ty2 + 4.4]], '#d8cfae');
      Art.poly(g, [[tx2 - 0.8, ty2 + 0.8], [tx2 + 0.2, ty2 + 0.8], [tx2 - 0.2, ty2 + 3]], '#f2ead0');
    }

    // ---- casting: a bone stave crowned with a wombat skull -----------------
    if (staff > 0) {
      const sx = CX + hipW + 3, top = shoulder - 16 + (1 - staff) * 6;
      Art.rect(g, sx - 1, top, 3, hem - 2 - top, '#241a14');
      Art.rect(g, sx, top, 1.6, hem - 2 - top, '#6a5a3a');
      for (let i = 0; i < 5; i++) Art.rect(g, sx - 1.6, top + 10 + i * 9, 4.2, 1.4, '#3a2c1c');
      Art.rect(g, sx - 3.4, top - 1, 7.8, 2, GOLD);
      Art.ell(g, sx + 0.5, top - 6, 4.2, 3.6, '#d8cfae');                 // the skull
      Art.ell(g, sx + 0.5, top - 4, 2.8, 2.4, '#e8e0c4');
      Art.ell(g, sx - 2.8, top - 8.4, 1.8, 1.8, '#d8cfae');
      Art.ell(g, sx + 3.8, top - 8.4, 1.8, 1.8, '#d8cfae');
      Art.rect(g, sx - 1.4, top - 6.6, 1.5, 1.6, '#0e0a12');
      Art.rect(g, sx + 1.1, top - 6.6, 1.5, 1.6, '#0e0a12');
      const glow = 0.3 + spark * 0.2;
      Art.ell(g, sx + 0.5, top - 6, 8 * glow, 7 * glow, 'rgba(255,207,74,0.2)');
      for (let i = 0; i < spark * 4; i++) {
        const a = i * 1.7 + f, r = 8 + spark * 3.6;
        Art.rect(g, sx + 0.5 + Math.cos(a) * r, top - 6 + Math.sin(a) * r * 0.7, 1.6, 1.6, i % 2 ? GOLD2 : TEAL2);
      }
    }
    g.restore();
    Art.outline(c, '#0a0810', 1);
    cache.set(key, c);
    return c;
  }

  // ---- Shaz, on the till ---------------------------------------------------
  // A woman in her fifties who has worked here nineteen years and has never
  // once stopped talking about wombats. Seen from the counter up: polo shirt,
  // apron, a lanyard she has covered in enamel pins, and a mug.
  const KW = 72, KH = 84;
  function cashier(frame, pose = 'idle') {
    const n = { idle: 4, talk: 6, happy: 4, wave: 6 }[pose] || 4;
    const f = ((frame % n) + n) % n, t = f / n;
    const key = `shaz:${f}:${pose}`;
    let img = cache.get(key); if (img) return img;
    const { c, g } = Art.cv(KW, KH);
    const S = Math.sin(t * TAU);
    const CXK = 36;
    const SK0 = '#a87050', SK1 = '#d09a72', SK2 = '#e8bb92', SK3 = '#f7dcbc';
    const HAIR0 = '#4a4650', HAIR1 = '#6f6a76', HAIR2 = '#9a95a2', HAIR3 = '#c4c0ca';
    const POLO0 = '#14421f', POLO1 = '#1e6330', POLO2 = '#2f8f42', POLO3 = '#5fc46c';
    const APR0 = '#7a2a12', APR1 = '#a83f1c', APR2 = '#d0632c';
    const INK = '#1a1620';
    let bob = 0, lean = 0, armR = 0, mouth = 'flat', brow = 0;
    switch (pose) {
      case 'idle': bob = [0, 0, 1, 0][f]; mouth = f === 2 ? 'small' : 'flat'; break;
      case 'talk': bob = [0, 1, 0, 1, 0, 1][f]; mouth = ['open', 'wide', 'small', 'open', 'wide', 'flat'][f];
        lean = S * 0.6; armR = -2 - Math.abs(S) * 3; brow = 0.4; break;
      case 'happy': bob = [0, 1, 2, 1][f]; mouth = 'grin'; brow = 0.6; armR = -4; break;
      case 'wave': bob = [0, 1, 1, 0, 1, 1][f]; mouth = 'grin'; brow = 0.5;
        armR = -12 - Math.abs(Math.sin(t * TAU * 2)) * 4; break;
    }
    const y0 = -bob;
    const shoulder = 40 + y0, chestY = shoulder + 10, waist = shoulder + 26;
    const headY = shoulder - 16 + y0 * 0, faceY = headY;
    // ---- the apron and the body ------------------------------------------
    Art.poly(g, [[CXK - 22, shoulder], [CXK + 22, shoulder], [CXK + 26, waist + 16], [CXK - 26, waist + 16]], POLO0);
    Art.poly(g, [[CXK - 20, shoulder + 1], [CXK + 20, shoulder + 1], [CXK + 24, waist + 16], [CXK - 24, waist + 16]], POLO1);
    Art.poly(g, [[CXK - 20, shoulder + 1], [CXK - 6, shoulder + 1], [CXK - 10, waist + 16], [CXK - 24, waist + 16]], POLO2);
    Art.rect(g, CXK - 21, shoulder + 1, 2, waist + 14 - shoulder, POLO3);
    // the collar
    Art.poly(g, [[CXK - 9, shoulder - 1], [CXK, shoulder + 7], [CXK + 9, shoulder - 1], [CXK + 5, shoulder - 4], [CXK - 5, shoulder - 4]], POLO0);
    Art.poly(g, [[CXK - 7, shoulder - 1], [CXK, shoulder + 5], [CXK + 7, shoulder - 1]], SK1);
    // the apron over the front of it
    Art.poly(g, [[CXK - 15, chestY], [CXK + 15, chestY], [CXK + 20, waist + 16], [CXK - 20, waist + 16]], APR0);
    Art.poly(g, [[CXK - 14, chestY + 1], [CXK + 14, chestY + 1], [CXK + 19, waist + 16], [CXK - 19, waist + 16]], APR1);
    Art.poly(g, [[CXK - 14, chestY + 1], [CXK - 5, chestY + 1], [CXK - 9, waist + 16], [CXK - 19, waist + 16]], APR2);
    Art.rect(g, CXK - 15, chestY, 30, 2, APR0);
    for (const sd of [-1, 1]) Art.limb(g, CXK + sd * 7, chestY, CXK + sd * 16, shoulder + 1, 2.4, 1.8, APR1);
    Art.rect(g, CXK - 11, waist + 2, 22, 9, APR0);                      // the pouch
    Art.rect(g, CXK - 11, waist + 2, 22, 1.6, APR2);
    Art.rect(g, CXK - 6, waist + 4, 3, 6, '#d8d2c2');                   // a pen and a docket in it
    Art.rect(g, CXK + 2, waist + 3, 6, 7, '#fffdf0');
    // ---- the lanyard, and the pins she has covered it with ---------------
    for (const sd of [-1, 1]) Art.limb(g, CXK + sd * 6, shoulder + 2, CXK + sd * 2, chestY + 6, 2, 1.6, '#2a3a46');
    Art.rect(g, CXK - 3, chestY + 5, 7, 9, '#1d2230');                  // the badge itself
    Art.rect(g, CXK - 2, chestY + 6, 5, 7, '#fffdf0');
    Art.rect(g, CXK - 2, chestY + 6, 5, 2, '#c9581f');
    const PINS = ['#d8b23a', '#b8496a', '#2f6f9f', '#8a6a3a', '#7a4f9a'];
    for (let i = 0; i < 5; i++) {
      const px = CXK - 14 + (i % 3) * 5, py = chestY + 2 + Math.floor(i / 3) * 5;
      Art.ell(g, px, py, 2.4, 2.4, '#1a1620');
      Art.ell(g, px, py, 1.8, 1.8, PINS[i]);
      Art.ell(g, px - 0.5, py - 0.5, 0.8, 0.6, '#fff8e0');
    }
    // a small wombat embroidered on the polo, because of course
    Art.ell(g, CXK + 12, chestY + 4, 4, 2.8, POLO3);
    Art.ell(g, CXK + 15, chestY + 2.6, 2.4, 2.2, POLO3);
    Art.rect(g, CXK + 14, chestY + 0.6, 1, 1.2, POLO3);
    Art.rect(g, CXK + 16.4, chestY + 0.6, 1, 1.2, POLO3);
    Art.rect(g, CXK + 15.6, chestY + 2.4, 0.8, 0.8, POLO0);
    // ---- arms: one on the counter, one doing whatever she is saying -------
    Art.limb(g, CXK - 19, shoulder + 4, CXK - 26, waist + 12, 7, 5.4, POLO1);
    Art.limb(g, CXK - 20, shoulder + 4, CXK - 26, waist + 10, 4, 3, POLO2);
    Art.ell(g, CXK - 27, waist + 14, 4, 3.4, SK0);
    Art.ell(g, CXK - 27, waist + 13, 3.2, 2.8, SK1);
    const ex = CXK + 22, ey = waist + 10 + armR;
    Art.limb(g, CXK + 19, shoulder + 4, ex, ey, 7, 5.4, POLO0);
    Art.limb(g, CXK + 20, shoulder + 4, ex, ey, 4.4, 3.2, POLO1);
    Art.ell(g, ex + 1, ey + 4, 4.2, 3.6, SK0);
    Art.ell(g, ex + 1, ey + 3.4, 3.4, 2.9, SK1);
    for (let k = 0; k < 3; k++) Art.rect(g, ex - 1.4 + k * 1.8, ey + 5.4, 1.2, 1.8, SK0);
    // ---- neck and head ----------------------------------------------------
    const hx = CXK + lean;
    Art.limb(g, hx, faceY + 10, hx, shoulder + 2, 5, 6, SK0);
    Art.ell(g, hx, shoulder + 1, 6, 2.2, '#8a5a40');
    Art.ell(g, hx, faceY + 12, 9.6, 6, SK0);                            // the jaw
    Art.ell(g, hx, faceY + 6, 10.5, 11.5, SK0);                         // the skull
    Art.ell(g, hx - 0.4, faceY + 5.6, 9.6, 10.6, SK1);
    Art.ell(g, hx - 4, faceY + 2.4, 4.4, 4, SK2);                       // the lit temple
    Art.ell(g, hx + 5, faceY + 4.4, 3, 3.4, SK1);
    Art.ell(g, hx, faceY + 8, 2.6, 2.2, SK2);                           // the nose
    Art.rect(g, hx - 1, faceY + 5.6, 2, 3.2, SK2);
    Art.ell(g, hx - 10.4, faceY + 7, 2.4, 3, SK0);                      // ears, with studs in
    Art.ell(g, hx + 10.4, faceY + 7, 2.4, 3, SK0);
    Art.ell(g, hx - 10.4, faceY + 9.6, 1.1, 1.1, '#d8b23a');
    Art.ell(g, hx + 10.4, faceY + 9.6, 1.1, 1.1, '#d8b23a');
    // the hair: greying, pinned up, with a strand escaping
    Art.ell(g, hx, faceY + 0.6, 11.4, 8.4, HAIR0);
    Art.ell(g, hx - 0.6, faceY - 0.4, 10.4, 7.4, HAIR1);
    Art.ell(g, hx - 4, faceY - 2.2, 5, 3.4, HAIR2);
    Art.ell(g, hx - 5, faceY - 3, 2.4, 1.4, HAIR3);
    Art.ell(g, hx + 2, faceY - 7.6, 6, 5, HAIR0);                       // the bun
    Art.ell(g, hx + 2, faceY - 7.8, 5, 4, HAIR1);
    Art.ell(g, hx + 0.6, faceY - 9, 2.4, 1.6, HAIR2);
    Art.rect(g, hx + 4.4, faceY - 7.6, 5, 1.4, '#d8b23a');              // a clip through the bun
    Art.limb(g, hx - 9.4, faceY + 0.6, hx - 11.6, faceY + 9, 2, 1.2, HAIR1);
    Art.ell(g, hx - 10.6, faceY + 2.6, 2.6, 4.6, HAIR0);
    Art.ell(g, hx + 10, faceY + 2.6, 2.4, 4.4, HAIR0);
    // the glasses, on a chain
    for (const sd of [-1, 1]) {
      Art.ell(g, hx + sd * 4.4, faceY + 4.4, 4, 3.6, '#2a3038');
      Art.ell(g, hx + sd * 4.4, faceY + 4.4, 3.2, 2.9, '#cfe2ea');
    }
    Art.rect(g, hx - 1.2, faceY + 4, 2.4, 1.2, '#2a3038');
    Art.rect(g, hx - 10.4, faceY + 3.6, 2.6, 1.2, '#2a3038');
    Art.rect(g, hx + 7.8, faceY + 3.6, 2.6, 1.2, '#2a3038');
    for (const sd of [-1, 1]) Art.limb(g, hx + sd * 9.4, faceY + 6, hx + sd * 11.4, faceY + 12, 1, 0.8, '#8a95a0');
    // the eyes behind them, and the brows over the top
    for (const sd of [-1, 1]) {
      const exx = hx + sd * 4.4;
      if (pose === 'happy' || pose === 'wave') {
        Art.poly(g, [[exx - 2.4, faceY + 5.4], [exx, faceY + 3], [exx + 2.4, faceY + 5.4], [exx, faceY + 4.4]], INK);
      } else {
        Art.ell(g, exx, faceY + 4.4, 1.8, 1.8, '#fdf6ea');
        Art.ell(g, exx + sd * 0.3, faceY + 4.6, 1.1, 1.2, INK);
        Art.rect(g, exx - 0.7, faceY + 3.6, 0.7, 0.7, '#fdf6ea');
      }
      Art.poly(g, [[exx - 3, faceY + 0.6 - brow * sd * 0.6], [exx + 3, faceY + 0.6 + brow * sd * 0.6],
                   [exx + 3, faceY + 2 + brow * sd * 0.6], [exx - 3, faceY + 2 - brow * sd * 0.6]], HAIR0);
    }
    // the mouth, always going
    const my = faceY + 11;
    if (mouth === 'open') { Art.ell(g, hx, my, 2.6, 2.4, '#5a2430'); Art.ell(g, hx, my - 0.8, 2, 1, '#fdf6ea'); }
    else if (mouth === 'wide') { Art.ell(g, hx, my, 3.4, 3, '#5a2430'); Art.ell(g, hx, my - 1, 2.6, 1.1, '#fdf6ea'); Art.ell(g, hx, my + 1.8, 1.8, 0.9, '#c2607a'); }
    else if (mouth === 'grin') {
      Art.poly(g, [[hx - 4, my - 1.4], [hx + 4, my - 1.4], [hx + 2.6, my + 2.2], [hx - 2.6, my + 2.2]], '#5a2430');
      Art.rect(g, hx - 3.4, my - 1.2, 6.8, 1.4, '#fdf6ea');
    } else if (mouth === 'small') { Art.ell(g, hx, my, 1.6, 1.4, '#5a2430'); }
    else { Art.rect(g, hx - 2.6, my - 0.4, 5.2, 1.2, '#8a4048'); }
    Art.ell(g, hx - 5.4, my - 1, 2.2, 1.4, 'rgba(198,110,120,0.35)');    // a bit of colour
    Art.ell(g, hx + 5.4, my - 1, 2.2, 1.4, 'rgba(198,110,120,0.35)');
    Art.outline(c, '#0a0810', 1);
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
    Art.outline(c, PAL.ink, 0.85);
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
    Art.outline(c, '#05040a', 0.8);
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
    Art.outline(c, PAL.ink, 0.8);
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
    Art.outline(c, PAL.ink, 0.8);
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
    Art.outline(c, PAL.ink, 0.9);
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
    Art.outline(c, PAL.ink, 0.95);
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
    g.fillStyle = U.shade(col, -0.16);
    for (let i = 0; i < 4; i++) g.fillRect(Math.round(x0 + px * 2 + ((i * 13) % Math.max(1, w - px * 4))), Math.round(y0 + px * 2 + ((i * 7) % Math.max(1, h - px * 4))), px, px);
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
      const e = Math.max(1, Math.round(w / 9));
      g.fillStyle = PAL.div5; g.fillRect(-w / 4 - e / 2, -h / 8, e, e); g.fillRect(w / 4 - e / 2, -h / 8, e, e);
    }
    // every cube has a little face on it. It is a lump of poop and it is happy.
    if (opts.face) cubeFace(g, opts.face, w, h, px);
    if (opts.outline) { g.strokeStyle = opts.outline; g.lineWidth = Math.max(1, px); g.strokeRect(x0, y0, w, h); }
  }
  function cubeFace(g, mood, w, h, px) {
    const e = Math.max(1.4, px * 1.15);
    const ex = Math.min(w * 0.22, e * 2.4), ey = -h * 0.1;
    const dark = '#1a1016', white = '#fdf3dc';
    for (const s of [-1, 1]) {
      if (mood === 'blink') { g.fillStyle = dark; g.fillRect(-ex * 0 + s * ex - e, ey, e * 2, e * 0.7); continue; }
      g.fillStyle = white; g.fillRect(s * ex - e, ey - e, e * 2, e * 2);
      g.fillStyle = dark;
      const look = mood === 'fall' ? -e * 0.4 : mood === 'ready' ? e * 0.3 : 0;
      g.fillRect(s * ex - e * 0.4 + look, ey - e * 0.4, e * 0.9, e * 1.1);
    }
    g.fillStyle = dark;
    const my = ey + e * 2.1;
    if (mood === 'fall') { g.fillRect(-e, my - e * 0.3, e * 2, e * 1.5); g.fillStyle = '#c26b7a'; g.fillRect(-e * 0.5, my + e * 0.6, e, e * 0.5); }
    else if (mood === 'ready') { g.fillRect(-e * 1.1, my, e * 2.2, e * 0.6); g.fillRect(-e * 1.6, my - e * 0.5, e * 0.6, e * 0.6); g.fillRect(e, my - e * 0.5, e * 0.6, e * 0.6); }
    else { g.fillRect(-e * 1.2, my, e * 2.4, e * 0.6); g.fillRect(-e * 1.8, my - e * 0.6, e * 0.6, e * 0.6); g.fillRect(e * 1.2, my - e * 0.6, e * 0.6, e * 0.6); }
    if (mood !== 'fall') {                                    // a blush on each cheek
      g.fillStyle = 'rgba(200,110,120,0.42)';
      g.fillRect(-ex - e * 1.9, ey + e * 0.9, e * 1.5, e * 0.8);
      g.fillRect(ex + e * 0.4, ey + e * 0.9, e * 1.5, e * 0.8);
    }
  }

  return { S, AGE, POSES, CULT_POSES, KW, KH, cashier, wombat, blit, shadow, wombachu, furOf, cupid, godForm, artifact, drawCube, ant, crow, owl, mascot, cultist, setFace, get face() { return faceMood; }, FACES, init() { }, clear: () => cache.clear() };
})();
