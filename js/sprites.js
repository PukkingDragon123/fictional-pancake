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

  const AGE = { baby: { k: 0.54, head: 1.28, name: 'Joey' }, juvenile: { k: 0.74, head: 1.13, name: 'Juvenile' }, adult: { k: 1, head: 1, name: 'Adult' } };
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
  function drawWombat(g, fur, name, f, ageKey) {
    const p = pose(name, f);
    const A = AGE[ageKey] || AGE.adult;
    const K = A.k, HK = A.head;
    // scale about the feet anchor so every age shares one coordinate design
    const X = (x) => AX + (x - AX) * K;
    const Y = (y) => GY + (y - GY) * K;
    const L = (v) => v * K;
    const R = (x, y, w, h, col) => Art.rect(g, X(x), Y(y), L(w), L(h), col);
    const E = (x, y, rx, ry, col) => Art.ell(g, X(x), Y(y), L(rx), L(ry), col);
    const EB = (x, y, rx, ry, col, a, b) => Art.ellBand(g, X(x), Y(y), L(rx), L(ry), col, a, b);
    const D = (x, y, col) => Art.rect(g, X(x), Y(y), Math.max(1, L(1)), Math.max(1, L(1)), col);

    const sit = p.sit;
    const bcy = 15 + p.bob - sit * 2.4;
    const brx = (13 + p.squash * 11) * (1 - sit * 0.34);
    const bry = 8.6 * (1 - p.squash) * (1 + sit * 0.34);
    const hx = 30.5 + sit * -1.5 + p.headTurn * 0.6 + p.headFwd;
    const hy = 15.2 + p.bob + p.headDip + p.front - sit * 12.5;
    const hr = 7 * HK, hry = 6.1 * HK;

    // --- legs behind the body ---
    if (!p.tuck) {
      const legs = [[10.5 + sit * 6, 0, fur.dark], [15.2 + sit * 6, 1, fur.dark], [23.6, 2, fur.base], [28.2, 3, fur.base]];
      for (const [lx, i, col] of legs) {
        if (sit > 0.5 && i >= 2) continue;      // front paws are drawn raised instead
        const lift = sit && i < 2 ? 0 : p.leg[i];
        const rear = i < 2 ? p.rear : 0;
        const top = 20.4 - rear * 0.8 + (i >= 2 ? p.front : 0);
        const h = GY - top - lift;
        if (h <= 0.5) continue;
        const swing = (i >= 2 ? 1 : -1) * lift * 0.25;
        R(lx + swing, top, 4.6, h, col);
        R(lx + swing, top, 1.2, h, U.shade(col, 0.18));
        R(lx + swing - 0.4, GY - lift - 2.2, 5.4, 2.2, fur.dark);
        D(lx + swing + 0.2, GY - lift - 0.6, PAL.ink);
        D(lx + swing + 2.4, GY - lift - 0.6, PAL.ink);
        D(lx + swing + 4.2, GY - lift - 0.6, PAL.ink);
      }
    }
    // --- fat barrel body, rump first so the silhouette reads as one lump ---
    const rollY = p.roll * 0.5;
    const rumpX = 12.5 + sit * 5.5;
    E(rumpX, bcy - 0.4 + rollY - p.rear * 0.5 + sit * 3, 9.6 * (1 - sit * 0.22), bry * 0.98, fur.base);
    E(19 + sit * 4, bcy + rollY * 0.4 + p.front * 0.35, brx, bry, fur.base);
    if (p.front > 0.5) E(25, bcy + p.front * 0.8, 8.6, bry * 0.88, fur.base);
    if (p.tuck) E(19, bcy + 1.6, brx * 1.04, bry * 0.86, fur.base);
    EB(19 + sit * 4, bcy + rollY * 0.4 + p.front * 0.35, brx, bry, fur.dark, 0.7, 1);
    EB(rumpX, bcy - 0.4 + rollY - p.rear * 0.5 + sit * 3, 9.6 * (1 - sit * 0.22), bry * 0.98, fur.dark, 0.72, 1);
    EB(19 + sit * 4, bcy + rollY * 0.4 + p.front * 0.35, brx, bry, fur.light, 0, 0.17);
    EB(rumpX, bcy - 0.4 + rollY - p.rear * 0.5 + sit * 3, 9.6 * (1 - sit * 0.22), bry * 0.98, fur.light, 0, 0.16);
    // a couple of broad fur patches, not noise
    E(15 + sit * 5, bcy + 2.4, 5.2, 2.6, U.shade(fur.base, -0.09));
    E(24 + sit * 2, bcy - 2.6, 4, 1.9, U.shade(fur.light, 0.05));
    if (fur.moss) { E(11, bcy - 5, 4.4, 1.9, PAL.moss2); E(17.5, bcy - 6.2, 3, 1.4, PAL.moss3); }
    if (fur.stars) { D(13, bcy - 4, PAL.div5); D(21, bcy - 5.5, PAL.cream); D(17, bcy + 1, PAL.div4); D(25, bcy + 3, PAL.div5); }

    // --- ears, set low and round ---
    const earY = 10.6 + p.bob + p.headDip * 0.72 + p.front * 0.8 - sit * 12.5 - p.ear * 1.1 + (p.ear < 0 ? 2.6 : 0);
    E(hx - 2.4 - p.headFwd * 0.3, earY + 0.6, 2.3 * HK, 2.4 * HK, fur.dark);
    E(hx + 2.6 - p.headFwd * 0.3, earY, 2.5 * HK, 2.6 * HK, fur.base);
    E(hx + 2.8 - p.headFwd * 0.3, earY + 0.4, 1.2 * HK, 1.3 * HK, U.shade(fur.belly, -0.12));
    // --- broad low head ---
    E(hx, hy, hr, hry, fur.base);
    EB(hx, hy, hr, hry, fur.light, 0, 0.22);
    EB(hx, hy, hr, hry, fur.dark, 0.82, 1);
    // --- blunt snout ---
    const scx = hx + 5.4 * HK, scy = hy + 2.4 + p.jaw * 0.4;
    E(scx, scy, 3.3 * HK, (2.7 + p.jaw * 0.5) * HK, fur.base);
    EB(scx, scy, 3.3 * HK, 2.7 * HK, U.shade(fur.light, 0.1), 0, 0.36);
    R(scx + 1.2, scy - 1.6, 2, 1.6, fur.nose);
    if (p.jaw > 0.6) { R(scx - 0.6, scy + 1.2, 3, 1.4, PAL.ink); D(scx - 0.4, scy + 1.3, PAL.cream); D(scx + 1.4, scy + 1.3, PAL.cream); }
    else R(scx - 0.2, scy + 1.5, 2.4, 0.9, U.shade(fur.dark, -0.2));
    // --- belly, only when standing ---
    if (!p.tuck) E(19 + sit * 4, bcy + 5.8 + sit * 1.5, 8.4 * (1 - sit * 0.3), 2.7 + sit * 2.4, fur.belly);
    // --- front paws raised when sitting up ---
    if (sit) {
      const ry2 = hy + 4.6 - p.reach * 3.2;
      E(hx - 4.2, ry2, 2.3, 2.6, fur.base);
      E(hx + 1.4, ry2 - 0.6, 2.3, 2.6, fur.light);
      D(hx - 4.6, ry2 + 1.8, PAL.ink); D(hx + 1, ry2 + 1.2, PAL.ink);
    }
    // --- 1px dot eyes, set on a lighter patch so a single pixel still reads ---
    const eyeCol = fur.eye || PAL.ink;
    if (!p.blink) {
      E(hx + 2.6, hy - 0.9, 1.7 * HK, 1.6 * HK, U.shade(fur.light, 0.22));
      D(hx + 2.6, hy - 0.9, eyeCol);
      if (p.headTurn < 0.3) {
        E(hx - 2.4, hy - 0.4, 1.7 * HK, 1.6 * HK, U.shade(fur.light, 0.22));
        D(hx - 2.4, hy - 0.4, eyeCol);
      }
    } else {
      R(hx + 2.2, hy - 0.6, 1.8, 0.9, U.shade(fur.dark, -0.25));
      if (p.headTurn < 0.3) R(hx - 2.8, hy - 0.1, 1.8, 0.9, U.shade(fur.dark, -0.25));
    }
    // --- stub tail ---
    if (!p.tuck) E(6.2, bcy + 3.4, 1.9, 1.9, fur.dark);
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

  return { S, AGE, POSES, wombat, blit, furOf, cupid, godForm, artifact, drawCube, init() { }, clear: () => cache.clear() };
})();
