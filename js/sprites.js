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
  const CW = 40, CH = 66, CX = 20, CGY = 63;
  function cultist(frame, pose = 'idle') {
    const n = CULT_POSES[pose] || 1, f = ((frame % n) + n) % n, t = f / n;
    const key = `cult:${f}:${pose}`;
    let img = cache.get(key); if (img) return img;
    const { c, g } = Art.cv(CW, CH);
    // a deep violet-brown habit, gold trim, one teal clasp
    const R0 = '#140d1c', R1 = '#241730', R2 = '#372447', R3 = '#4d3660', R4 = '#6a4d82';
    const GOLD = '#c1912a', GOLD2 = '#f2cf62', TEAL = '#4fa6be', TEAL2 = '#8fd4e4';
    const VOID = '#0b0710', WINE = '#5c2a3a';
    const SK0 = '#7a5344', SK1 = '#a8735c', SK2 = '#d0a186', SK3 = '#e8c4a6';
    const S = Math.sin(t * TAU);
    let bob = 0, lean = 0, flare = 0, hemUp = 0, armL = 0, armR = 0, view = 'front';
    let sit = 0, lie = 0, hurt = 0, staff = 0, spark = 0, stride = 0, clasp = 1;
    switch (pose) {
      case 'idle': bob = [0, 0, 1, 1, 0, 0][f]; armL = S * 0.5; armR = -S * 0.5; break;
      case 'walk': lean = 1.2; stride = S; flare = Math.abs(S) * 2; bob = -Math.abs(Math.sin(t * TAU * 2)) * 1.2;
        armL = -S * 3; armR = S * 3; clasp = 0; break;
      case 'run': lean = 4.5; stride = S * 1.7; flare = 3 + Math.abs(S) * 2.5; hemUp = 5;
        bob = -Math.abs(Math.sin(t * TAU * 2)) * 2.4; armL = -S * 5 - 2; armR = S * 5 - 2; clasp = 0; break;
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

    // ---- the skeleton this figure is built on ------------------------------
    const y0 = bob;
    const headTop = (sit ? 16 : 4) + y0;        // crown of the hood
    const chin = headTop + 14;                  // where the head ends
    const shoulder = chin + 3;                  // y of the shoulder line
    const waist = shoulder + 15;
    const hip = shoulder + 20;
    const hem = (sit ? 62 : CGY) - hemUp;
    const shW = sit ? 8 : 7;                    // half-width at the shoulders
    const hipW = sit ? 11 : 6.6;
    const hemW = (sit ? 14 : 10.4) + flare;

    // ---- boots, when the hem lifts off them --------------------------------
    if (hemUp > 1 || stride) {
      for (const s of [-1, 1]) {
        const sx = CX + s * 3.6 + stride * s * 3.4;
        Art.rect(g, sx - 2.6, hem - 5, 5.2, 6, '#2a1b18');
        Art.rect(g, sx - 3.4, CGY - 3.2, 7, 3.4, '#1c110f');
        Art.rect(g, sx - 2.6, hem - 5, 5.2, 1.4, '#4a3128');
      }
    }
    // ---- the robe: shoulders to the floor, a slight A, cut with folds -------
    const robe = (x0, x1, col) => Art.poly(g, [
      [CX + x0 * shW, shoulder], [CX + x1 * shW, shoulder],
      [CX + x1 * hemW, hem], [CX + x0 * hemW, hem]], col);
    robe(-1, 1, R2);
    robe(-1, -0.42, R3);                                       // lit side
    robe(0.46, 1, R1);                                         // shadow side
    robe(-1, -0.82, R4);                                       // rim light down the left edge
    for (let i = -2; i <= 2; i++) {                            // vertical folds
      const k = i / 2.6;
      Art.poly(g, [
        [CX + k * shW + S * 0.4, waist], [CX + k * shW + 1.2 + S * 0.4, waist],
        [CX + k * hemW + 1.2, hem], [CX + k * hemW, hem]], i % 2 ? R0 : R4);
    }
    Art.rect(g, CX - hemW, hem - 3, hemW * 2, 3, R0);          // the hem itself
    Art.rect(g, CX - hemW, hem - 4.4, hemW * 2, 1.8, GOLD);   // one gold band
    Art.rect(g, CX - hemW, hem - 4.4, hemW * 2, 0.8, GOLD2);
    for (let i = 2; i < hemW * 2 - 1; i += 4.6) Art.rect(g, CX - hemW + i, hem - 2.6, 1.8, 1.6, GOLD);

    // ---- torso -------------------------------------------------------------
    Art.poly(g, [[CX - shW, shoulder], [CX + shW, shoulder], [CX + hipW, hip], [CX - hipW, hip]], R2);
    Art.poly(g, [[CX - shW, shoulder], [CX - shW * 0.34, shoulder], [CX - hipW * 0.3, hip], [CX - hipW, hip]], R3);
    Art.rect(g, CX - shW, shoulder, 1.6, hip - shoulder, R4);

    // ---- arms: upper arm, forearm, and a bare hand at the cuff -------------
    if (!sit || clasp) {
      for (const [s, sw] of [[-1, armL], [1, armR]]) {
        const sxp = CX + s * (shW - 1.2), syp = shoulder + 2;
        const inward = clasp ? 2.6 : 0;
        const ex = CX + s * (hipW - 0.6 - inward) + s * 0.6, ey = waist + 6 + sw;
        const mx = CX + s * (shW + 1.8), myy = (syp + ey) / 2 + 1;
        Art.limb(g, sxp, syp, mx, myy, 6.4, 5.4, R0);            // ink under the sleeve
        Art.limb(g, mx, myy, ex, ey, 5.4, 4.4, R0);
        Art.limb(g, sxp, syp, mx, myy, 4.8, 4, s < 0 ? R4 : R3);
        Art.limb(g, mx, myy, ex, ey, 4, 3.4, s < 0 ? R4 : R3);
        Art.limb(g, sxp + s * 1.6, syp, mx + s * 1.6, myy, 1.3, 1.1, R0);   // the shadowed inner edge
        Art.limb(g, sxp - s * 1.3, syp, mx - s * 1.3, myy, 1.4, 1.2, s < 0 ? '#8a6aa4' : R4);
        Art.rect(g, ex - 1.9, ey - 0.8, 3.8, 1.5, GOLD);         // the cuff
        Art.rect(g, ex - 1.9, ey - 0.8, 3.8, 0.7, GOLD2);
        Art.ell(g, ex, ey + 2.4, 1.9, 2.2, SK1);                 // the hand
        Art.ell(g, ex - 0.3, ey + 2, 1.5, 1.8, SK2);
        Art.ell(g, ex - 0.7, ey + 1.5, 0.8, 0.8, SK3);
      }
    }
    // a rope cord knotted at the waist, worn over the sleeves
    Art.rect(g, CX - hipW - 1, waist, hipW * 2 + 2, 1.8, GOLD);
    Art.rect(g, CX - hipW - 1, waist, hipW * 2 + 2, 0.8, GOLD2);
    Art.rect(g, CX - hipW - 1, waist + 1.8, hipW * 2 + 2, 0.6, '#7a5210');
    Art.ell(g, CX - 0.6, waist + 1, 2.2, 2, GOLD);
    Art.ell(g, CX - 1, waist + 0.6, 1.2, 1.1, GOLD2);
    for (const [tx, tl] of [[-2.2, 5.4], [0.8, 4.2]]) {
      Art.rect(g, CX + tx, waist + 2.4, 1.3, tl + S * 0.6, GOLD);
      Art.rect(g, CX + tx - 0.2, waist + 2.4 + tl + S * 0.6, 1.7, 1.6, GOLD2);
    }

    // ---- a short shoulder cape --------------------------------------------
    const my = shoulder - 1;
    Art.ell(g, CX, my + 4, shW + 2, 6, R0);
    Art.ell(g, CX, my + 3.2, shW + 1.4, 5.4, R2);
    Art.ell(g, CX - 3.2, my + 2, shW * 0.56, 3.8, R4);
    Art.ell(g, CX + 3.6, my + 3.6, shW * 0.46, 3.2, R1);
    Art.ellBand(g, CX, my + 3.6, shW + 1.8, 6, GOLD, 0.86, 1);
    if (view !== 'back') {                                       // a teal clasp and amulet
      Art.ell(g, CX, my + 1, 2.4, 2, TEAL);
      Art.ell(g, CX - 0.4, my + 0.6, 1.2, 1, TEAL2);
      Art.rect(g, CX - 0.5, my + 3, 1, 3.4, GOLD);
      Art.ell(g, CX, my + 7.4, 2.6, 2.6, GOLD);
      Art.ell(g, CX, my + 7.4, 1.5, 1.5, WINE);
      Art.rect(g, CX - 1.2, my + 6.4, 1, 1, GOLD2);
    }

    // ---- the hood, and the face inside it ----------------------------------
    const hx = view === 'quarter' ? CX + 1.6 : CX;
    const faceY = headTop + 8;
    Art.poly(g, [[CX + 0.4, headTop - 0.5], [CX + 6.8, headTop + 9], [CX - 6, headTop + 9]], R1);   // the peak
    Art.poly(g, [[CX + 0.4, headTop - 0.5], [CX + 2.8, headTop + 5.5], [CX - 2, headTop + 5.5]], R2);
    Art.ell(g, CX, headTop + 8, 6.8, 7, R2);                     // the cowl
    Art.ell(g, CX - 3, headTop + 6, 3.4, 4.2, R3);
    Art.ell(g, CX + 3.6, headTop + 9, 3.2, 4, R1);
    Art.rect(g, CX - 6.6, headTop + 5, 1.2, 4.6, R4);            // rim light
    Art.poly(g, [[CX - 6.4, headTop + 12], [CX + 6.4, headTop + 12], [CX + 5, chin + 1], [CX - 5, chin + 1]], R1);
    if (view === 'back') {
      Art.ell(g, CX, headTop + 11, 6.4, 6.4, R1);
      Art.rect(g, CX - 3.4, headTop + 7, 7, 1.2, GOLD);
    } else {
      Art.ell(g, hx, faceY + 1, 4.2, 5.2, VOID);                 // the shadow of the hood
      Art.ellBand(g, hx, faceY + 1, 4.9, 5.9, GOLD, 0, 1);       // gold edge of the opening
      Art.ell(g, hx, faceY + 1, 4.2, 5.2, VOID);
      // a human face, mostly in shadow: cheek, nose, jaw, mouth
      Art.ell(g, hx, faceY + 3, 3, 3, SK0);
      Art.ell(g, hx - 0.4, faceY + 3.1, 2.5, 2.6, SK1);
      Art.ell(g, hx - 0.9, faceY + 2.8, 1.5, 1.5, SK2);
      Art.rect(g, hx - 0.5, faceY + 1.9, 1.2, 1.7, SK2);         // the bridge of the nose
      Art.rect(g, hx - 1, faceY + 4.1, 2.4, 0.8, SK0);           // the mouth
      const ey = faceY + (hurt > 0 ? -0.4 : 0.4);
      if (pose === 'hurt') { Art.rect(g, hx - 3.4, ey, 2.6, 1.2, GOLD2); Art.rect(g, hx + 1, ey, 2.6, 1.2, GOLD2); }
      else {
        Art.ell(g, hx - 1.7, ey + 0.5, 2.1, 1.8, 'rgba(255,226,120,0.2)');
        Art.ell(g, hx + 1.9, ey + 0.5, 2.1, 1.8, 'rgba(255,226,120,0.2)');
        Art.rect(g, hx - 2.8, ey - 0.3, 2.2, 2.2, 'rgba(255,232,150,0.42)');
        Art.rect(g, hx + 0.8, ey - 0.3, 2.2, 2.2, 'rgba(255,232,150,0.42)');
        Art.rect(g, hx - 2.5, ey, 1.6, 1.6, '#fff8d8'); Art.rect(g, hx + 1.1, ey, 1.6, 1.6, '#fff8d8');
        Art.rect(g, hx - 2.5, ey, 1.6, 0.7, '#ffffff'); Art.rect(g, hx + 1.1, ey, 1.6, 0.7, '#ffffff');
        if (f === 4 && pose === 'idle') Art.rect(g, hx - 2.8, ey - 0.3, 6, 2.2, VOID);
      }
    }

    // ---- casting: a staff crowned with a cross, and sparks ------------------
    if (staff > 0) {
      const sx = CX + hipW + 3, top = waist - 22 + (1 - staff) * 6;
      Art.rect(g, sx, top, 2, hem - 2 - top, '#6a4a2a');
      Art.rect(g, sx, top, 0.8, hem - 2 - top, '#96703f');
      Art.rect(g, sx - 2.4, top - 6, 6.6, 2, GOLD); Art.rect(g, sx, top - 10, 2, 9, GOLD);
      Art.ell(g, sx + 1, top - 10, 2.2, 2.2, GOLD2);
      for (let i = 0; i < spark * 4; i++) {
        const a = i * 1.7 + f, r = 7 + spark * 3.4;
        Art.rect(g, sx + 1 + Math.cos(a) * r, top - 6 + Math.sin(a) * r * 0.7, 1.6, 1.6, i % 2 ? GOLD2 : TEAL2);
      }
    }
    g.restore();
    Art.outline(c, '#0a0810', 1);
    cache.set(key, c);
    return c;
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
    if (opts.outline) { g.strokeStyle = opts.outline; g.lineWidth = Math.max(1, px); g.strokeRect(x0, y0, w, h); }
  }

  return { S, AGE, POSES, CULT_POSES, wombat, blit, shadow, furOf, cupid, godForm, artifact, drawCube, ant, crow, owl, mascot, cultist, init() { }, clear: () => cache.clear() };
})();
