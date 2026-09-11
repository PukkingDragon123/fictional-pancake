// ---- Procedural wombats, gods and cupids -----------------------------------
// One drawing routine builds every wombat. Age is a coordinate scale about the
// feet, so joeys are the same animal with a bigger head; pelts are swapped
// palettes; poses are computed curves rather than hand-keyed frames.
const Sprites = (() => {
  const S = 2;                    // screen pixels per art pixel
  const AW = 44, AH = 30;         // art canvas
  const PAD = 12;                 // headroom above, for poses that rear up
  const AX = 22, GY = 27;         // anchor: feet centre / ground line
  const cache = new Map();

  const AGE = { baby: { k: 0.62, head: 1.24, name: 'Joey' }, juvenile: { k: 0.78, head: 1.12, name: 'Juvenile' }, adult: { k: 1, head: 1, name: 'Adult' } };
  const POSES = { idle: 6, walk: 8, run: 6, eat: 6, graze: 4, sleep: 2, dig: 6, happy: 6, pray: 6, bite: 6 };

  function pose(name, f) {
    const n = POSES[name] || 1, t = f / n;
    const p = {
      bob: 0, roll: 0, squash: 0, headDip: 0, headFwd: 0, front: 0, headTurn: 0, jaw: 0, ear: 0, blink: 0,
      leg: [0, 0, 0, 0], rear: 0, sit: 0, reach: 0, tuck: 0, sway: 0,
    };
    const s = Math.sin(t * TAU), c = Math.cos(t * TAU);
    switch (name) {
      case 'idle':
        p.bob = s * 0.45; p.squash = s * 0.025;
        p.ear = f === 2 ? 1 : 0; p.blink = f === 4 ? 1 : 0;
        p.headTurn = f >= 3 ? 0.6 : 0;
        break;
      case 'walk': {
        // diagonal gait: front-left swings with back-right
        const a = Math.sin(t * TAU), b = Math.sin(t * TAU + Math.PI);
        p.leg = [Math.max(0, a) * 5, Math.max(0, b) * 5, Math.max(0, b) * 5, Math.max(0, a) * 5];
        p.bob = -Math.abs(Math.sin(t * TAU * 2)) * 2.1;
        p.roll = a * 1.1;
        p.headDip = Math.abs(Math.sin(t * TAU * 2)) * 1.6 - 0.6;
        p.headFwd = a * 1.2;
        p.squash = Math.sin(t * TAU * 2) * 0.05;
        break;
      }
      case 'run': {
        const a = Math.sin(t * TAU), b = Math.sin(t * TAU + Math.PI * 0.55);
        p.leg = [Math.max(0, a) * 7, Math.max(0, a) * 6.4, Math.max(0, b) * 7, Math.max(0, b) * 6.4];
        p.bob = -Math.abs(Math.sin(t * TAU)) * 3.6;
        p.squash = -0.09 + Math.sin(t * TAU * 2) * 0.09;
        p.headDip = 2.4; p.headFwd = 2.6; p.front = 1.4; p.roll = a * 1.2;
        break;
      }
      case 'eat':
        // muzzle right down on the ground, shoulders dropped, jaw working
        p.headDip = 8.2; p.headFwd = 2.6; p.front = 3.6; p.rear = -1.2;
        p.jaw = Math.abs(Math.sin(t * TAU * 2)) * 1.4;
        p.bob = 0.5 + s * 0.3; p.ear = f % 3 === 0 ? 1 : 0;
        break;
      case 'graze':
        p.headDip = 7.6; p.headFwd = 2.2; p.front = 3.2;
        p.sway = s * 2.6; p.bob = 0.4;
        p.jaw = f % 2 ? 0.7 : 0;
        break;
      case 'sleep':
        p.tuck = 1; p.squash = 0.14 + (f ? 0.03 : 0); p.bob = 2.1;
        p.headDip = 3.4; p.ear = -1; p.blink = 1;
        break;
      case 'dig': {
        // rump up, shoulders down, front paws scrabbling
        const a = Math.sin(t * TAU * 2), b = Math.sin(t * TAU * 2 + Math.PI);
        p.leg = [0, 0, Math.max(0, a) * 7, Math.max(0, b) * 7];
        p.headDip = 5.4; p.headFwd = 1.8; p.front = 4.2; p.rear = -2.6;
        p.bob = 0.8; p.jaw = 0.4; p.squash = 0.05;
        break;
      }
      case 'happy':
        p.bob = -Math.abs(Math.sin(t * TAU)) * 4.2;
        p.squash = -0.05 - Math.sin(t * TAU) * 0.07;
        p.ear = 1; p.roll = Math.sin(t * TAU * 2) * 0.6; p.jaw = 0.8;
        p.leg = [1.5, 1.5, 1.5, 1.5].map((v, i) => v * Math.max(0, Math.sin(t * TAU)));
        break;
      case 'pray':
        p.sit = 1; p.reach = 0.55 + s * 0.2; p.headDip = -1.2;
        p.bob = s * 0.5; p.blink = f === 3 ? 1 : 0; p.ear = 1;
        break;
      case 'bite':
        p.sit = 1; p.reach = 1; p.headDip = -2.4 + (f > 2 ? 1.2 : 0);
        p.jaw = f > 2 ? 1.4 : 0.2; p.bob = -s * 0.6; p.ear = 1;
        break;
    }
    return p;
  }

  // ---- the wombat ---------------------------------------------------------
  // Built from stacked blocks rather than ellipses: a heavy rounded brick of a
  // body, a squared head that merges straight into it with no neck, a big dark
  // snout, square eyes, and four stubby legs with clear gaps between them.
  // Proportions taken from the reference: the head is over 40% of the total
  // length and nearly as tall as the body, the snout is a heavy dark block,
  // and four thick stubby legs leave clear gaps between the pairs.
  // Fur mottling, given in body-relative units (0..1 across, 0..1 down).
  const PATCH = [
    [0.14, 0.28, 0.20, 0.20, 1], [0.42, 0.16, 0.22, 0.18, 1], [0.68, 0.34, 0.18, 0.20, -1],
    [0.26, 0.62, 0.24, 0.18, -1], [0.58, 0.66, 0.20, 0.16, -1], [0.84, 0.20, 0.14, 0.18, 1],
  ];

  function drawWombat(g, fur, name, f, ageKey) {
    const p = pose(name, f);
    const A = AGE[ageKey] || AGE.adult;
    const K = A.k, HK = A.head;
    const X = (x) => AX + (x - AX) * K;
    const Y = (y) => GY + (y - GY) * K;
    const L = (v) => Math.max(1, v * K);
    const R = (x, y, w, h, col) => Art.rect(g, X(x), Y(y), L(w), L(h), col);

    const sit = p.sit, tuck = p.tuck;
    const lift = p.bob;
    // ---- the body box -------------------------------------------------------
    const bw = 26 - sit * 10;
    const bh = (13 + sit * 7 + (tuck ? 1 : 0)) * (1 - p.squash * 0.55);
    const bx = 4 + sit * 5;
    const legLen = tuck ? 0.5 : 7 - sit * 2;
    const by = GY - legLen - bh + lift;
    // the spine tilts: shoulders drop to eat and dig, the rump lifts
    const tiltAt = (t) => U.lerp(-p.rear, p.front, t) * 0.55;
    const corner = (i) => {
      const d = Math.min(i, bw - 1 - i);
      return d < 1 ? 3 : d < 2 ? 1.6 : d < 3 ? 0.6 : 0;
    };

    // ---- legs, behind the body ---------------------------------------------
    if (!tuck) {
      const legs = sit
        ? [[bx + 1, 0], [bx + bw - 7, 1]]
        : [[bx + 1, 0], [bx + 7, 1], [bx + bw - 12, 2], [bx + bw - 6, 3]];
      for (const [lx, i] of legs) {
        const lf = p.leg[i] || 0;
        const swing = (i >= 2 ? 1 : -1) * lf * 0.3;
        const t = (lx - bx) / bw;
        const top = by + bh + tiltAt(t) - 2;
        const h = GY - top - lf;
        if (h <= 1) continue;
        R(lx + swing, top, 5.6, h, fur.mid);
        R(lx + swing, top, 1.4, h, fur.base);                    // lit edge
        R(lx + swing + 4.2, top, 1.4, h, fur.dark);              // shaded edge
        R(lx + swing - 0.5, GY - lf - 2.8, 6.6, 2.8, fur.dark);  // paw
        R(lx + swing - 0.5, GY - lf - 1.2, 6.6, 1.2, fur.deep);
        R(lx + swing + 0.4, GY - lf - 0.9, 1, 0.9, fur.ink);     // claws
        R(lx + swing + 2.6, GY - lf - 0.9, 1, 0.9, fur.ink);
        R(lx + swing + 4.8, GY - lf - 0.9, 1, 0.9, fur.ink);
      }
    }

    // ---- the body, drawn as tilted columns ---------------------------------
    for (let i = 0; i < bw; i++) {
      const t = (i + 0.5) / bw;
      const ins = corner(i);
      const top = by + tiltAt(t) + ins;
      const h = bh - ins * 2;
      if (h <= 1) continue;
      R(bx + i, top, 1, h, fur.base);
      R(bx + i, top, 1, Math.min(2, h * 0.3), fur.light);             // sun on the back
      R(bx + i, top + h - h * 0.34, 1, h * 0.2, fur.mid);             // turn of the flank
      R(bx + i, top + h - h * 0.16, 1, h * 0.16, fur.dark);           // belly shade
    }
    // mottling
    for (const [px, py, pw, ph, d] of PATCH) {
      const i = px * bw;
      const t = (i + pw * bw * 0.5) / bw;
      R(bx + i, by + tiltAt(t) + py * bh, pw * bw, ph * bh * 0.6, d > 0 ? fur.light : fur.mid);
    }
    if (fur.moss) { R(bx + 4, by + tiltAt(0.2) - 1, 7, 2.4, PAL.moss3); R(bx + 13, by + tiltAt(0.5) - 1.4, 5, 2.4, PAL.moss2); }
    if (fur.stars) { R(bx + 5, by + 5, 1, 1, PAL.div5); R(bx + 12, by + 8, 1, 1, PAL.cream); R(bx + 18, by + 6, 1, 1, PAL.div4); }
    // tail nub
    if (!tuck && !sit) R(bx - 2.2, by + tiltAt(0) + bh * 0.5, 2.8, 3.6, fur.dark);

    // ---- the head, always overlapping the shoulders ------------------------
    const hw = 15 * HK, hh = 14 * HK;
    const shoulder = by + tiltAt(1);
    const hx = sit ? bx + bw / 2 - 15 * HK / 2 + 2 : bx + bw - 5 + p.headFwd * 0.8;
    const hy = shoulder + bh - hh - 1.5 + p.headDip - sit * (hh * 0.8);
    const hcorner = (i) => { const d = Math.min(i, hw - 1 - i); return d < 1 ? 3 : d < 2 ? 1.6 : d < 3 ? 0.6 : 0; };

    // ears first, so the skull overlaps their base
    const earLift = p.ear < 0 ? 2.6 : -p.ear * 0.8;
    for (const [ex, w2] of [[hx + 1.5, 4.4], [hx + hw - 6, 4.8]]) {
      R(ex, hy - 3.2 + earLift, w2 * HK, 4.6 * HK, fur.mid);
      R(ex + 0.8, hy - 2.2 + earLift, (w2 - 1.8) * HK, 2.6 * HK, fur.ear || fur.dark);
      R(ex, hy - 3.2 + earLift, w2 * HK, 1.2 * HK, fur.base);
    }
    for (let i = 0; i < hw; i++) {
      const ins = hcorner(i);
      const top = hy + ins, h = hh - ins * 2;
      if (h <= 1) continue;
      R(hx + i, top, 1, h, fur.base);
      R(hx + i, top, 1, Math.min(2.2, h * 0.28), fur.light);
      R(hx + i, top + h - h * 0.2, 1, h * 0.2, fur.mid);
    }
    if (sit) R(hx + 1, hy + hh - 1, hw - 2, 1.2, fur.dark);
    else R(hx - 0.6, hy + 2.4, 1, hh - 4, fur.dark);
    // cheek, a shade lighter, so the face reads against the body
    R(hx + 1.5, hy + 3.4 * HK, 5.5 * HK, 5 * HK, fur.light);
    R(hx + hw - 8, hy + 2.6 * HK, 5 * HK, 4 * HK, fur.light);

    // ---- muzzle, nose, mouth -----------------------------------------------
    const sw = 9.5 * HK, shh = 6.4 * HK;
    const sx = hx + hw - sw + 1.2, sy = hy + hh - shh - 0.6 + p.jaw * 0.5;
    R(sx + 1, sy, sw - 2, 1.4, fur.mid);
    R(sx, sy + 1.2, sw, shh - 2.4, fur.dark);
    R(sx + 1, sy + shh - 1.4, sw - 2, 1.4, fur.deep);
    R(sx + sw - 5, sy + 1.2, 4, 2.6, fur.nose);                  // the big nose pad
    R(sx + sw - 4.6, sy + 1.4, 3.2, 1.2, fur.ink);
    if (p.jaw > 0.6) {                                           // an open mouth
      R(sx + 1.4, sy + shh - 0.8, sw - 3, 2.8, fur.ink);
      R(sx + 2.2, sy + shh - 0.2, 1.6, 1.4, PAL.cream);
      R(sx + 5.2, sy + shh - 0.2, 1.6, 1.4, PAL.cream);
    } else {
      R(sx + 1.6, sy + shh - 0.6, sw - 3.4, 1.2, fur.ink);
    }

    // ---- eyes ---------------------------------------------------------------
    const eyeCol = fur.eye || fur.ink;
    const ey = hy + 4.6 * HK;
    const eyes = [[hx + 2.6, 1]];
    if (p.headTurn < 0.3) eyes.push([hx + hw - 8.6, 0]);
    for (const [ex, glint] of eyes) {
      if (p.blink) { R(ex - 0.2, ey + 1.4, 3.4 * HK, 1.2 * HK, fur.deep); continue; }
      R(ex, ey, 2.8 * HK, 3 * HK, eyeCol);
      R(ex + 0.4, ey + 0.4, 1 * HK, 1 * HK, PAL.cream);
      if (glint && fur.glow) R(ex - 1, ey - 1, 4.8 * HK, 5 * HK, U.rgba(fur.glow, 0.3));
    }

    // ---- front paws when sitting up ----------------------------------------
    if (sit) {
      const py2 = hy + hh + 0.5 - p.reach * 3.4;
      for (const [px2, dy] of [[hx - 1.5, 0], [hx + 6, -1]]) {
        R(px2, py2 + dy, 5, 4.4, fur.mid);
        R(px2, py2 + dy, 5, 1.2, fur.base);
        R(px2, py2 + dy + 3.2, 5, 1.2, fur.ink);
      }
    }
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
  function furOf(pelt) { return typeof pelt === 'string' ? (FUR_BY_KEY[pelt] || FUR[0]) : FUR[pelt % FUR.length]; }

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

  return { S, AGE, POSES, wombat, blit, furOf, cupid, godForm, artifact, drawCube, ant, crow, owl, mascot, init() { }, clear: () => cache.clear() };
})();
