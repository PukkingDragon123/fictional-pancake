// ---- Mr Biscuit: the caretaker, a pug in a suit ----------------------------------------------
// A very round fawn pug who walks on his back legs and dresses for work: a
// charcoal three-button suit (straining at the middle button), a white shirt,
// a burgundy tie and a folded pocket square. Round tortoiseshell glasses sit
// on the black mask of his face, over big wet eyes with a pale rim; his ears
// fold forward, his brow wrinkles, his tongue pokes out when he is pleased,
// and his tail curls up behind him. He knows everything about wombats.
//
// Pug.sprite(f, t, pose, mood) draws the 52x84 figure (feet at y 81, centre x
// 26, the box every guide sprite has used). Pug.bust(mood, t, talking) is his
// 64x64 dialogue portrait. The view is three-quarters, turned to the right;
// the game flips him to walk left.
const Pug = (() => {
  const cache = new Map();
  const INK = '#0b0806';
  const FUR = ['#7a5634', '#a07a50', '#c29e70', '#dcbd8e', '#ecd6ae'];     // fawn, dark to light
  const MASK = ['#140e0b', '#261b15', '#3a2b22', '#54423a'];               // the black of the face and ears
  const SUIT = ['#1d2027', '#2a2e37', '#393e4a', '#4d5361', '#646b7a'];    // charcoal wool
  const SHIRT = ['#a9a69f', '#cfccc4', '#ebe8e1'];
  const TIE = ['#4a1418', '#6e2226', '#8f3533', '#a84a44'];
  const GLASS = ['#3a2414', '#6a4222', '#9a6634'];                          // tortoiseshell
  const SHOE = ['#140d09', '#2e1f16', '#4a3526'];
  const TONGUE = ['#9a4a52', '#c86a70', '#e0949a'];
  const TAU = Math.PI * 2;
  const kit = (g) => {
    const R = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
    return { R, P: (x, y, col) => R(x, y, 1, 1, col), E: (x, y, rx, ry, col) => Art.ell(g, x, y, rx, ry, col) };
  };

  // ---- the face -------------------------------------------------------------------------------
  // eye kinds: open, wide, happy (a squeezed arc), shut, narrow (a heavy lid)
  const FACE = {
    idle: ['open', 'tongue'], talk: ['open', 'open'], happy: ['happy', 'tongue'], proud: ['narrow', 'smirk'], laugh: ['happy', 'grin'],
    cross: ['narrow', 'frown'], worry: ['wide', 'wobble'], shock: ['wide', 'o'], think: ['open', 'flat'],
    tired: ['shut', 'flat'], sly: ['narrow', 'smirk'], sad: ['open', 'frown'], curious: ['wide', 'flat'], surprise: ['wide', 'o'],
  };
  // (cx, cy) is the eye's centre; s is the scale (1 on the figure, about 2 on the portrait)
  function eye(k, cx, cy, s, kind, look) {
    const { R, P, E } = k;
    const r = 2.6 * s;
    if (kind === 'happy') {
      for (let i = -Math.round(r); i <= Math.round(r); i++) R(cx + i, cy - Math.round(Math.cos(i / r * 1.3) * s * 1.4) + Math.round(s * 0.4), 1, Math.max(1, Math.round(s * 0.8)), MASK[0]);
      return;
    }
    if (kind === 'shut') { R(cx - r, cy, r * 2 + 1, Math.max(1, Math.round(s * 0.8)), MASK[0]); return; }
    // a pale rim, the dark wet eye, a glint and a smaller one below
    E(cx, cy, r + s * 0.9, r + s * 0.8, '#e8e0d0');
    E(cx, cy, r + s * 0.3, r + s * 0.2, '#b8ab98');
    const lx = look === 'side' ? s : kind === 'wide' ? 0 : s * 0.4;
    E(cx + lx, cy + s * 0.2, r * (kind === 'wide' ? 0.8 : 0.95), r * (kind === 'wide' ? 0.8 : 0.95), '#2a1a10');
    E(cx + lx, cy + s * 0.3, r * 0.55, r * 0.55, '#0c0806');
    R(cx + lx - r * 0.55, cy - r * 0.55, Math.max(1, Math.round(s * 1.2)), Math.max(1, Math.round(s * 1.2)), '#fffaf0');
    P(cx + lx + r * 0.4, cy + r * 0.35, '#8a7a6a');
    if (kind === 'narrow') R(cx - r - s, cy - r - s, r * 2 + s * 2 + 1, r * 0.9 + s, FUR[1]);     // the heavy lid
  }
  function mouth(k, cx, y, kind, s) {
    const { R, P } = k;
    const u = Math.max(1, Math.round(s));
    switch (kind) {
      case 'tongue':                                                  // the classic pug: a bit of tongue out
        R(cx - u * 3, y, u * 6, u, MASK[0]);
        R(cx - u, y + u, u * 3, u * 2, TONGUE[1]); R(cx, y + u, u, u * 2, TONGUE[0]); R(cx - u, y + u * 3, u * 3, u, TONGUE[0]);
        P(cx - u + 1, y + u, TONGUE[2]);
        break;
      case 'open':
        R(cx - u * 2, y, u * 4, u * 2 + 1, MASK[0]); R(cx - u, y + u, u * 2, u + 1, TONGUE[1]);
        break;
      case 'grin':
        R(cx - u * 4, y, u * 8, u * 2 + 1, MASK[0]); R(cx - u * 2, y + u, u * 4, u + 1, TONGUE[1]);
        R(cx - u * 3, y, u, u, '#e8e0d0'); R(cx + u * 2, y, u, u, '#e8e0d0');       // two little bottom teeth
        break;
      case 'o': R(cx - u, y - 1, u * 2 + 1, u * 2 + 1, MASK[0]); break;
      case 'frown': R(cx - u * 3, y + u, u * 6, u, MASK[0]); R(cx - u * 4, y + u * 2, u, u, MASK[0]); R(cx + u * 3, y + u * 2, u, u, MASK[0]); break;
      case 'wobble': for (let i = -u * 3; i <= u * 3; i++) P(cx + i, y + (((i % 2) + 2) % 2), MASK[0]); break;
      case 'smirk': R(cx - u * 3, y + u, u * 5, u, MASK[0]); R(cx + u * 2, y, u * 2, u, MASK[0]); break;
      default: R(cx - u * 3, y + u, u * 6, u, MASK[0]);
    }
  }
  // the brow: pugs think with their foreheads
  function brow(k, cx, y, s, mood) {
    const { R } = k;
    const w = Math.round(9 * s);
    const rows = mood === 'cross' ? [[-1, 0.6], [1, 0.4]] : mood === 'worry' || mood === 'sad' ? [[0, 0.5], [2, 0.7]] : [[0, 0.5], [2, 0.35]];
    for (const [dy, len] of rows) {
      const ww = Math.round(w * len);
      R(cx - ww / 2, y + dy * s, ww, Math.max(1, Math.round(s * 0.7)), FUR[0]);
    }
    if (mood === 'cross') { R(cx - w * 0.9, y + s * 2, w * 0.7, Math.max(1, s * 0.8), FUR[0]); R(cx + w * 0.2, y + s * 2, w * 0.7, Math.max(1, s * 0.8), FUR[0]); }
    if (mood === 'worry' || mood === 'sad') { R(cx - w * 0.9, y + s * 3, w * 0.5, Math.max(1, s * 0.8), FUR[0]); R(cx + w * 0.4, y + s * 3, w * 0.5, Math.max(1, s * 0.8), FUR[0]); }
  }
  function glasses(k, lx, rx, y, r, s) {
    const { R } = k;
    for (const x of [lx, rx]) {
      for (let d = 0; d < Math.max(1, Math.round(s * 0.8)); d += 0.5) Art.ring(k.g, x, y, r - d, r - d, GLASS[d ? 0 : 1], 1);
      R(x - r * 0.6, y - r + s * 0.4, Math.max(1, Math.round(s)), Math.max(1, Math.round(s)), GLASS[2]);
    }
    R(lx + r, y - s * 0.6, rx - lx - r * 2, Math.max(1, Math.round(s * 0.8)), GLASS[0]);     // the bridge
  }

  // ---- the figure -------------------------------------------------------------------------------
  function sprite(f, t, pose, mood) {
    const key = `${f}:${pose}:${mood}`;
    let c = cache.get(key); if (c) return c;
    const o = Art.cv(52, 84), g = o.g; c = o.c;
    const k = kit(g); k.g = g;
    const { R, P, E } = k;
    const S2 = Math.sin(t * TAU), A2 = Math.abs(Math.sin(t * TAU * 2));
    // hands are offsets from the shoulder; negative y is up
    let bob = 0, step = 0, sit = 0, sway = 0, tilt = 0, eyes = null, jig = 0;
    let hl = [-3, 8], hr = [3, 8];                        // at rest the paws hang down by his middle
    switch (pose) {
      case 'idle': bob = [0, 0, 1, 1, 0, 0][f] || 0; hl = [-3, 8 + S2 * 0.5]; hr = [3, 8 - S2 * 0.5]; jig = [0, 0, 1, 1, 0, 0][f] || 0; break;
      case 'walk': case 'run': {
        const q = pose === 'run' ? 1.4 : 1;                 // a waddle: the whole pug rocks side to side
        bob = -A2 * 1.6 * q; step = S2 * 2 * q; sway = S2 * 1.2 * q; hl = [-3 + S2 * 2 * q, 7.5 - Math.abs(S2) * q]; hr = [3 - S2 * 2 * q, 7.5 - Math.abs(S2) * q]; jig = Math.round(A2); break;
      }
      case 'turn': break;
      case 'jump': bob = [1, -7, -11, -7, 1][f] || 0; hl = [-8, -9]; hr = [8, -9]; jig = f === 2 ? -1 : 1; break;
      case 'cheer': bob = [0, -3, -5, -5, -3, 0][f] || 0; hl = [-7, -12]; hr = [7, -12]; eyes = 'happy'; jig = bob < -3 ? -1 : 1; break;
      case 'laugh': bob = [0, -1, -2, -2, -1, 0][f] || 0; hl = [-2, 6]; hr = [2, 6]; tilt = S2 * 1.2; eyes = 'happy'; jig = f % 2; break;
      case 'clap': { const q = f % 2 ? 1 : 3; hl = [7 - q, 3]; hr = [-7 + q, 3]; eyes = 'happy'; break; }
      case 'wave': hr = [9, -11 + Math.round(Math.sin(t * TAU * 2) * 3)]; break;
      case 'point': hr = [13, -1]; break;
      case 'cast': hr = [8, -12]; hl = [-5, 5]; bob = f >= 3 ? -1 : 0; break;
      case 'shrug': { const q = [0, 4, 5, 2][f] || 0; hl = [-6 - q, 6 - q]; hr = [6 + q, 6 - q]; break; }
      case 'nod': bob = [0, 1, 2, 2, 1, 0][f] || 0; break;
      case 'shake': tilt = Math.sin(t * TAU * 2) * 1.6; break;
      case 'bow': bob = [0, 2, 4, 2, 0][f] || 0; hl = [-1, 8]; hr = [1, 8]; eyes = 'shut'; break;
      case 'hurt': bob = [2, 1, 0][f] || 0; hl = [-7, 2]; hr = [7, 2]; eyes = 'wide'; break;
      case 'sulk': bob = 1; hl = [-1, 8]; hr = [1, 8]; break;
      case 'sit': sit = 1; hl = [-3, 6]; hr = [3, 6]; break;
      case 'sleep': sit = 1; hl = [-2, 8]; hr = [2, 8]; eyes = 'shut'; tilt = 1.5; break;
    }
    const [eyeKind, mouthKind] = FACE[mood] || FACE.idle;
    const ek = eyes || eyeKind;
    const mk = pose === 'hurt' ? 'o' : pose === 'laugh' || pose === 'cheer' ? 'grin' : pose === 'sleep' ? 'flat' : mouthKind;
    const cx = 26 + Math.round(sway), y0 = Math.round(bob) + (sit ? 8 : 0);

    // ---- the curly tail, peeking out behind the left hip
    E(cx - 11, 58 + y0, 3.4, 3.4, FUR[1]); E(cx - 11, 58 + y0, 2.2, 2.2, FUR[3]); E(cx - 11, 58 + y0, 1, 1, FUR[1]);

    // ---- legs: short trousers over fat little legs, and polished shoes
    const hipY = 68 + y0;
    for (const s2 of [-1, 1]) {
      if (sit) {
        const fx = cx + s2 * 6;
        E(fx, hipY + 1, 6, 4, SUIT[1]); E(fx, hipY, 5, 3, SUIT[2]);
        E(fx + s2, hipY + 4, 4, 2.4, SHOE[1]); R(fx + s2 - 2, hipY + 3, 3, 1, SHOE[2]);
        continue;
      }
      const fx = cx + s2 * 4 + step * s2, lift = step * s2 > 1 ? 2 : 0;
      R(fx - 3.5, hipY, 7, 8 - lift, SUIT[1]); R(fx - 3.5, hipY, 1, 8 - lift, SUIT[2]); R(fx + 2.5, hipY, 1, 8 - lift, SUIT[0]);
      R(fx - 0.5, hipY + 1, 1, 6 - lift, SUIT[0]);                                        // the crease
      E(fx + 1, hipY + 10 - lift, 4.6, 2.4, SHOE[1]); R(fx - 3, hipY + 11 - lift, 9, 2, SHOE[0]);
      R(fx - 1, hipY + 9 - lift, 3, 1, SHOE[2]); P(fx + 3, hipY + 9 - lift, '#6a5242');     // the shine
    }

    // ---- arms: suit sleeves, a shirt cuff, a fawn paw
    const shY = 53 + y0;                                  // his arms come out of the middle of him, not up under the chin
    const arm = (s2, hand) => {
      // a soft noodle arm: one smooth curve from shoulder to paw, bowed outward,
      // sagging with its own weight and trailing a beat behind the paw (follow-through)
      const sx = cx + s2 * 8.5, hx = sx + hand[0] * 0.9, hy = shY + hand[1] - (hand[1] < 5 ? 5 : 0);   // raised paws keep their old height
      const lag = Math.sin(t * TAU * 2 - 1.1 + s2 * 0.6) * 1.3;
      const len = Math.hypot(hx - sx, hy - shY) || 1;
      const nx = -(hy - shY) / len * s2, ny = (hx - sx) / len * s2;          // outward normal
      const bow = 2.2 + Math.max(0, 9 - len) * 0.25;
      const kx = (sx + hx) / 2 + nx * -bow * s2 * s2 + s2 * bow * 0.6 + lag * 0.6, ky = (shY + hy) / 2 + 1.6 + Math.abs(lag) * 0.5;
      const at = (u) => [(1 - u) * (1 - u) * sx + 2 * (1 - u) * u * kx + u * u * hx, (1 - u) * (1 - u) * shY + 2 * (1 - u) * u * ky + u * u * hy];
      const N = 14;
      for (const [col, w0, off] of [[SUIT[1], 3.2, 0], [SUIT[2], 2.2, -0.5], [SUIT[3], 0.9, -1.1]])
        for (let i = 0; i <= N; i++) { const u = i / N, [x, y] = at(u); if (u > 0.86) break; E(x + off * 0.6, y + off, w0 - u * 0.7, w0 - u * 0.7, col); }
      const [ux, uy] = at(0.84);
      E(ux, uy, 2.3, 2, SHIRT[1]); E(ux - 0.3, uy - 0.4, 1.6, 1.2, SHIRT[2]);        // the cuff
      // a round mitten paw with a pink bean
      E(hx, hy + 0.8, 3.3, 3.1, FUR[1]); E(hx - 0.3, hy + 0.4, 2.7, 2.5, FUR[3]); E(hx - 1.1, hy - 0.5, 1.1, 1, FUR[4]);
      E(hx + 0.4, hy + 1.6, 1.1, 0.8, '#c8868a');
    };

    // ---- the body: a very round suit
    const by = 58 + y0 + jig * 0.5;
    E(cx, by, 12.5, 12, SUIT[0]);
    E(cx, by - 0.5, 11.8, 11.3, SUIT[1]);
    E(cx - 3, by - 3, 7.5, 7, SUIT[2]);
    E(cx - 6, by - 6, 5, 3, SUIT[3]);
    R(cx - 10, by + 8, 20, 1, SUIT[0]);                                                 // where it sits on the waist
    // the shirt front in a V, pushed out by the belly
    Art.poly(g, [[cx - 5, 46 + y0], [cx + 5, 46 + y0], [cx + 6, by + 2], [cx + 3, by + 9], [cx - 3, by + 9], [cx - 6, by + 2]], SHIRT[1]);
    E(cx - 0.5, by + 1, 5.2, 7, SHIRT[1]); E(cx - 1.5, by - 1, 3, 4.5, SHIRT[2]);
    R(cx + 3, by - 2, 1, 9, SHIRT[0]);                                                  // the shadow on the round of it
    // the lapels
    Art.poly(g, [[cx - 6, 46 + y0], [cx - 3, 46 + y0], [cx - 1, by - 4], [cx - 5, by + 1]], SUIT[3]);
    Art.poly(g, [[cx + 3, 46 + y0], [cx + 6, 46 + y0], [cx + 5, by + 1], [cx + 1, by - 4]], SUIT[2]);
    // the tie, short and wide, riding up on the belly
    R(cx - 1.5, 46 + y0, 3, 3, TIE[2]); R(cx - 1, 46 + y0, 1, 2, TIE[3]);
    Art.poly(g, [[cx - 2, 49 + y0], [cx + 2, 49 + y0], [cx + 3, by + 3], [cx, by + 6], [cx - 3, by + 3]], TIE[1]);
    R(cx - 1, 50 + y0, 1, by - 47 - y0, TIE[2]);
    for (let i = 0; i < 3; i++) P(cx + 1, 52 + y0 + i * 3, TIE[0]);                   // a small pattern
    // the jacket closing below the tie, the straining button, the pocket square
    Art.poly(g, [[cx - 6, by + 2], [cx + 6, by + 2], [cx + 5, by + 9], [cx - 5, by + 9]], SUIT[1]);
    R(cx - 5, by + 2, 10, 1, SUIT[3]);
    for (const dx of [-3, -1, 1, 3]) P(cx + dx, by + 1, SHIRT[0]);                    // the pull lines
    E(cx, by + 4, 1.2, 1.2, '#1a1410'); P(cx - 0.5, by + 3.5, '#6a6258');              // the button
    R(cx + 6, 50 + y0, 3, 1, SUIT[0]); R(cx + 6, 49 + y0, 2, 1, SHIRT[2]); P(cx + 8, 48 + y0, SHIRT[2]);
    arm(-1, hl); if (pose !== 'clap') arm(1, hr);

    // ---- the head: wide, flat-faced, turned a touch to the right
    const hx = cx + 1 + tilt, hy = 30 + y0 + jig * 0.5;
    // the rolls of the neck, where the collar holds them in
    E(hx, hy + 13, 11, 4, FUR[1]); E(hx, hy + 12, 10, 3.2, FUR[2]);
    R(hx - 7, hy + 14, 14, 2, SHIRT[2]); R(hx - 1, hy + 14, 2, 1, TIE[2]);            // the collar
    E(hx, hy, 15, 12.5, FUR[1]);
    E(hx - 0.5, hy - 0.8, 14, 11.6, FUR[2]);
    E(hx - 3, hy - 4, 9, 6, FUR[3]);
    E(hx - 5, hy - 7, 4, 2.2, FUR[4]);
    // the ears' folds, drawn over the head
    // the ears: soft black flaps, folded forward and hanging at the sides
    Art.poly(g, [[hx - 13, hy - 11], [hx - 8, hy - 11], [hx - 10, hy - 6], [hx - 15, hy - 2], [hx - 17, hy - 7]], MASK[1]);
    Art.poly(g, [[hx + 8, hy - 11], [hx + 13, hy - 11], [hx + 17, hy - 7], [hx + 15, hy - 2], [hx + 10, hy - 6]], MASK[1]);
    R(hx - 13, hy - 10, 4, 1, MASK[3]); R(hx + 9, hy - 10, 4, 1, MASK[3]);
    // the mask: the black face that pugs are born with, darkest at the muzzle
    E(hx + 1, hy + 4, 9, 7, MASK[2]); E(hx + 1, hy + 5, 7.5, 5.5, MASK[1]);
    E(hx - 6, hy - 1, 4.4, 4, MASK[2]); E(hx + 7, hy - 1, 4.4, 4, MASK[2]);
    brow(k, hx + 1, hy - 8, 1, mood);
    // the eyes, set wide, and the glasses over them
    const look = mood === 'think' ? 'side' : null;
    eye(k, hx - 5.5, hy - 1, 1, ek, look);
    eye(k, hx + 7, hy - 1, 1, ek, look);
    glasses(k, hx - 5.5, hx + 7, hy - 1, 4.4, 1);
    // the nose: a flat black button with a wrinkle over it, then the mouth
    R(hx - 1, hy + 2, 5, 3, MASK[0]); P(hx, hy + 2, MASK[3]); P(hx + 2, hy + 3, MASK[3]);
    R(hx - 2, hy + 1, 7, 1, FUR[0]);
    R(hx + 1, hy + 5, 1, 2, MASK[0]);                                                   // the line down the lip
    mouth(k, hx + 1.5, hy + 7, mk, 1);
    // a few whisker dots on the muzzle
    for (const [dx, dy] of [[-4, 5], [-5, 6], [6, 5], [7, 6]]) P(hx + dx, hy + dy, MASK[3]);
    if (pose === 'clap') arm(1, hr);                                                    // the hands meet in front
    if (pose === 'sleep') Font.draw(g, 'z', cx + 15, hy - 20, { scale: 1, color: '#9aa2c8' });
    Art.outline(c, INK, 1);
    cache.set(key, c);
    return c;
  }

  // ---- the portrait -----------------------------------------------------------------------------
  function bust(mood = 'talk', t = 0, talking = false) {
    const blink = (t % 3.6) > 3.45, open = talking && Math.floor(t * 9) % 2 === 0;
    const key = `b:${mood}:${blink ? 1 : 0}:${open ? 1 : 0}`;
    let c = cache.get(key); if (c) return c;
    const o = Art.cv(64, 64), g = o.g; c = o.c;
    const k = kit(g); k.g = g;
    const { R, P, E } = k;
    const cx = 32;
    // shoulders: the jacket, the lapels, the shirt, the tie, the pocket square
    E(cx, 66, 30, 13, SUIT[1]); E(cx - 8, 60, 14, 6, SUIT[2]); E(cx - 14, 58, 6, 3, SUIT[3]);
    Art.poly(g, [[cx - 9, 52], [cx + 9, 52], [cx + 5, 64], [cx - 5, 64]], SHIRT[1]);
    Art.poly(g, [[cx - 12, 52], [cx - 7, 52], [cx - 3, 64], [cx - 9, 64]], SUIT[3]);
    Art.poly(g, [[cx + 7, 52], [cx + 12, 52], [cx + 9, 64], [cx + 3, 64]], SUIT[2]);
    R(cx - 3, 52, 6, 4, TIE[2]); R(cx - 2, 52, 2, 3, TIE[3]);
    Art.poly(g, [[cx - 3, 56], [cx + 3, 56], [cx + 4, 64], [cx - 4, 64]], TIE[1]);
    R(cx - 1, 57, 1, 7, TIE[2]);
    R(cx + 15, 58, 7, 2, SUIT[0]); Art.poly(g, [[cx + 15, 58], [cx + 18, 54], [cx + 20, 58]], SHIRT[2]);
    // neck rolls over the collar
    E(cx, 50, 18, 5, FUR[1]); E(cx, 49, 17, 4, FUR[2]);
    R(cx - 12, 51, 24, 2, SHIRT[2]); R(cx - 12, 53, 24, 1, SHIRT[0]);
    // the head
    E(cx, 30, 26, 21, FUR[1]);
    E(cx - 1, 29, 25, 20, FUR[2]);
    E(cx - 5, 23, 15, 10, FUR[3]);
    E(cx - 9, 17, 7, 3.5, FUR[4]);
    Art.poly(g, [[cx - 22, 10], [cx - 12, 10], [cx - 15, 19], [cx - 25, 28], [cx - 29, 18]], MASK[1]);
    Art.poly(g, [[cx + 12, 10], [cx + 22, 10], [cx + 29, 18], [cx + 25, 28], [cx + 15, 19]], MASK[1]);
    R(cx - 22, 11, 8, 1, MASK[3]); R(cx + 14, 11, 8, 1, MASK[3]); R(cx - 25, 16, 2, 6, MASK[2]); R(cx + 23, 16, 2, 6, MASK[2]);
    // the mask
    E(cx, 39, 14, 10, MASK[3]); E(cx, 40, 12, 8, MASK[2]); E(cx, 41, 9, 6, MASK[1]);
    E(cx - 11, 30, 8, 7.5, MASK[3]); E(cx + 11, 30, 8, 7.5, MASK[3]);
    // the brow wrinkles
    brow(k, cx, 14, 2, mood);
    R(cx - 6, 20, 12, 1, FUR[0]); R(cx - 4, 21, 8, 1, FUR[1]);
    // eyes and glasses
    const [ek0, mk0] = FACE[mood] || FACE.talk;
    const ek = blink ? 'shut' : ek0, mk = open ? 'open' : mk0;
    const look = mood === 'think' ? 'side' : null;
    eye(k, cx - 11, 30, 2, ek, look);
    eye(k, cx + 11, 30, 2, ek, look);
    glasses(k, cx - 11, cx + 11, 30, 8.5, 2);
    // the nose, the wrinkle over it, the lip line and mouth
    R(cx - 5, 34, 10, 5, MASK[0]); R(cx - 4, 34, 3, 1, MASK[3]); R(cx - 3, 36, 2, 2, '#050302'); R(cx + 2, 36, 2, 2, '#050302');
    R(cx - 7, 32, 14, 1, FUR[0]);
    R(cx, 39, 1, 3, MASK[0]);
    mouth(k, cx, 42, mk, 2);
    for (const [dx, dy] of [[-8, 40], [-10, 42], [-7, 43], [8, 40], [10, 42], [7, 43]]) R(cx + dx, dy, 1, 1, MASK[3]);
    if (mood === 'proud' || mood === 'happy') { R(cx + 24, 18, 1, 3, '#fff4d0'); R(cx + 23, 19, 3, 1, '#fff4d0'); }   // a glint of pride
    Art.outline(c, INK, 1);
    cache.set(key, c);
    return c;
  }
  return { sprite, bust };
})();
