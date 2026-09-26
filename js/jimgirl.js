// ---- Momo: the caretaker, in her wombat onesie ------------------------------------------
// A chibi anime girl: big head, huge sparkly teal eyes, soft pink hair with a
// fringe and long locks, and brown wombat pyjamas with the hood up. The hood
// has round ears and a little wombat face of its own (two button eyes and a
// big soft nose) sitting over her fringe; the onesie has a cream tummy, paw
// mittens and paw feet with toe beans, and a stubby tail.
//
// JimGirl.sprite(f, t, pose, mood) draws the 52x84 figure (feet at y 81, the
// same box the old Momo used, so everything that draws him still lines up).
// JimGirl.bust(mood, t, talking) is her 64x64 dialogue portrait.
const JimGirl = (() => {
  const cache = new Map();
  const INK = '#2a1420';
  const SKIN = ['#e8a88a', '#ffd6c0', '#fff0e4'];
  const HAIR = ['#a8466a', '#d8688e', '#f494b4', '#ffc8da'];
  const ONE = ['#4e2e1c', '#6e4428', '#8e5c38', '#b07a4e', '#cc9a6a'];      // the onesie, dark to light
  const BELLY = ['#d8b88c', '#f0d8b0', '#fff0d4'];
  const LINE = '#f4b4bc';                                                     // the hood's pink lining
  const IRIS = ['#0e3a4a', '#1a6a78', '#2aa8a8', '#7ae8d8'];
  const BLUSH = '#ff8aa0';
  const TAU = Math.PI * 2;

  // ---- eyes ---------------------------------------------------------------------------------
  // (x, y) is the top-left of the eye box; s is 1 for the figure and 1.6 for the portrait
  function eye(g, x, y, s, kind, look, R, P) {
    const w = Math.round(5 * s), h = Math.round(7 * s);
    if (kind === 'happy') {                                  // ^ ^
      for (let i = 0; i < w; i++) { const d = Math.abs(i - (w - 1) / 2); R(x + i, y + Math.round(h * 0.35 + d * 0.9 * s) - Math.round(s), 1, Math.max(1, Math.round(s)), INK); }
      return;
    }
    if (kind === 'shut') { R(x, y + Math.round(h * 0.6), w, Math.max(1, Math.round(s)), INK); R(x - 1, y + Math.round(h * 0.6) - 1, 1, 1, INK); return; }
    const top = kind === 'narrow' ? Math.round(h * 0.35) : kind === 'squint' ? Math.round(h * 0.25) : 0;
    const ew = kind === 'wide' ? w : w, eh = h - top;
    R(x, y + top, ew, eh, '#ffffff');                        // the white
    const ix = x + (look === 'side' ? Math.round(s) : 0), iy = y + top;
    const iw = kind === 'wide' ? Math.max(3, Math.round(3.4 * s)) : w - Math.max(1, Math.round(s * 0.6));
    const ixx = kind === 'wide' ? x + Math.round((w - iw) / 2) : ix;
    R(ixx, iy, iw, eh, IRIS[2]);                             // the iris, dark at the top, light at the foot
    R(ixx, iy, iw, Math.max(1, Math.round(eh * 0.35)), IRIS[1]);
    R(ixx, iy + eh - Math.max(1, Math.round(eh * 0.25)), iw, Math.max(1, Math.round(eh * 0.25)), IRIS[3]);
    R(ixx + Math.round(iw / 2 - s * 0.8), iy + Math.round(eh * 0.3), Math.max(1, Math.round(s * 1.6)), Math.max(1, Math.round(eh * 0.45)), IRIS[0]);   // the pupil
    R(ixx, iy, Math.max(2, Math.round(s * 2)), Math.max(2, Math.round(s * 2)), '#ffffff');                    // the big glint
    P(ixx + iw - Math.max(1, Math.round(s)), iy + eh - Math.max(2, Math.round(s * 2)), '#ffffff');                // the small one
    R(x - Math.round(s * 0.6), y + top - 1, w + Math.round(s), Math.max(1, Math.round(s)), INK);                  // the lash line
    R(x + w - 1, y + top - 1 - Math.round(s * 0.6), Math.max(1, Math.round(s * 0.8)), 1, INK);                  // a flick at the corner
  }
  function mouth(g, cx, y, kind, s, R, P) {
    const u = Math.max(1, Math.round(s));
    switch (kind) {
      case 'open': R(cx - u, y, u * 3, u * 2, '#8a2a3a'); R(cx - u, y + u, u * 3, u, '#ff8a9a'); break;
      case 'grin': R(cx - u * 2, y, u * 5, u * 2, '#8a2a3a'); R(cx - u * 2, y, u * 5, u, '#ffffff'); R(cx - u, y + u, u * 3, u, '#ff8a9a'); break;
      case 'o': R(cx - u, y - u + 1, u * 2 + 1, u * 2 + 1, '#8a2a3a'); break;
      case 'frown': R(cx - u, y + u, u * 3, u, INK); P(cx - u - 1, y + u + 1, INK); P(cx + u * 2, y + u + 1, INK); break;
      case 'wobble': for (let i = -u * 2; i <= u * 2; i++) P(cx + i, y + ((i + 10) % 2), INK); break;
      case 'flat': R(cx - u, y + u, u * 3, 1, INK); break;
      case 'smirk': R(cx - u, y + u, u * 3, 1, INK); P(cx + u * 2, y, INK); break;
      default:                                                    // the cat mouth: w
        P(cx - u * 2, y, INK); P(cx - u, y + u, INK); P(cx, y, INK); P(cx + u, y + u, INK); P(cx + u * 2, y, INK);
    }
  }
  const FACE = {
    idle: ['open', 'cat'], talk: ['open', 'open'], happy: ['happy', 'grin'], proud: ['squint', 'grin'], laugh: ['happy', 'open'],
    cross: ['narrow', 'frown'], worry: ['wide', 'wobble'], shock: ['wide', 'o'], think: ['open', 'flat'],
    tired: ['shut', 'wobble'], sly: ['narrow', 'smirk'], sad: ['narrow', 'frown'],
  };

  // ---- the figure -------------------------------------------------------------------------------
  function sprite(f, t, pose, mood) {
    const key = `${f}:${pose}:${mood}`;
    let c = cache.get(key); if (c) return c;
    const o = Art.cv(52, 84), g = o.g; c = o.c;
    const R = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
    const P = (x, y, col) => R(x, y, 1, 1, col);
    const E = (x, y, rx, ry, col) => Art.ell(g, x, y, rx, ry, col);
    const S2 = Math.sin(t * TAU), A2 = Math.abs(Math.sin(t * TAU * 2));
    // hands are offsets from the shoulder; negative y is up
    let bob = 0, step = 0, sit = 0, lean = 0, tilt = 0, eyes = null;
    let hl = [-4, 13], hr = [4, 13];
    switch (pose) {
      case 'idle': bob = [0, 0, 1, 1, 0, 0][f] || 0; hl = [-4, 13 + S2 * 0.6]; hr = [4, 13 - S2 * 0.6]; break;
      case 'walk': case 'run': {
        const k = pose === 'run' ? 1.4 : 1;
        bob = -A2 * 2 * k; step = S2 * 2.2 * k; hl = [-5, 11 - S2 * 3 * k]; hr = [5, 11 + S2 * 3 * k]; lean = pose === 'run' ? 1 : 0; break;
      }
      case 'turn': bob = 0; break;
      case 'jump': bob = [1, -8, -13, -8, 1][f] || 0; hl = [-8, -12]; hr = [8, -12]; break;
      case 'cheer': bob = [0, -3, -6, -6, -3, 0][f] || 0; hl = [-7, -15]; hr = [7, -15]; eyes = 'happy'; break;
      case 'laugh': bob = [0, -1, -2, -2, -1, 0][f] || 0; hl = [-3, 8]; hr = [3, 8]; tilt = S2 * 1.2; eyes = 'happy'; break;
      case 'clap': { const k = f % 2 ? 1 : 3; hl = [7 - k, 5]; hr = [-7 + k, 5]; eyes = 'happy'; break; }
      case 'wave': hr = [9, -13 + Math.round(Math.sin(t * TAU * 2) * 3)]; break;
      case 'point': hr = [14, -2]; break;
      case 'cast': hr = [8, -15]; hl = [-6, 6]; bob = f >= 3 ? -1 : 0; break;
      case 'shrug': { const k = [0, 4, 5, 2][f] || 0; hl = [-6 - k, 8 - k]; hr = [6 + k, 8 - k]; break; }
      case 'nod': bob = [0, 1, 2, 2, 1, 0][f] || 0; break;
      case 'shake': tilt = Math.sin(t * TAU * 2) * 1.6; break;
      case 'bow': bob = [0, 2, 4, 2, 0][f] || 0; hl = [-2, 12]; hr = [2, 12]; eyes = 'shut'; break;
      case 'hurt': bob = [2, 1, 0][f] || 0; hl = [-7, 4]; hr = [7, 4]; eyes = 'wide'; break;
      case 'sulk': bob = 1; hl = [-2, 11]; hr = [2, 11]; break;
      case 'sit': sit = 1; hl = [-5, 12]; hr = [5, 12]; break;
      case 'sleep': sit = 1; hl = [-3, 11]; hr = [3, 11]; eyes = 'shut'; tilt = 1.5; break;
    }
    const [eyeKind, mouthKind] = FACE[mood] || FACE.idle;
    const ek = eyes || (pose === 'hurt' ? 'wide' : eyeKind), mk = pose === 'hurt' ? 'o' : pose === 'laugh' || pose === 'cheer' ? 'open' : pose === 'sleep' ? 'flat' : mouthKind;
    const cx = 26, y0 = Math.round(bob) + (sit ? 9 : 0);
    g.save();
    if (lean) { g.translate(cx, 81); g.transform(1, 0, 0.06, 1, 0, 0); g.translate(-cx, -81); }

    // ---- long hair behind everything, and the tail
    R(cx - 15, 30 + y0, 6, 22, HAIR[1]); R(cx + 9, 30 + y0, 6, 22, HAIR[1]);
    R(cx - 15, 30 + y0, 2, 21, HAIR[2]); R(cx + 13, 31 + y0, 2, 20, HAIR[0]);
    for (const x of [cx - 15, cx - 12, cx + 9, cx + 12]) R(x, 51 + y0, 3, 2, HAIR[1]);
    E(cx + 9, 62 + y0, 2.6, 2.6, ONE[1]); E(cx + 9, 61 + y0, 1.6, 1.6, ONE[3]);

    // ---- legs and paw feet
    const hipY = 66 + y0;
    for (const s2 of [-1, 1]) {
      if (sit) {
        const fx = cx + s2 * 6;
        E(fx, hipY + 2, 5, 4, ONE[2]); E(fx, hipY + 1, 4, 3, ONE[3]);
        E(fx + s2 * 2, hipY + 5, 4, 3, ONE[1]);                      // the paw, toes at you
        for (let k = -1; k <= 1; k++) P(fx + s2 * 2 + k * 2, hipY + 5, BELLY[1]);
        continue;
      }
      const fx = cx + s2 * 3.5 + step * s2, lift = step * s2 > 1 ? 2 : 0;
      R(fx - 2.5, hipY, 5, 11 - lift, ONE[2]); R(fx - 2.5, hipY, 1, 10 - lift, ONE[3]); R(fx + 1.5, hipY, 1, 10 - lift, ONE[1]);
      E(fx + s2 * 0.5, hipY + 12 - lift, 3.8, 2.4, ONE[1]); E(fx + s2 * 0.5, hipY + 11 - lift, 3.2, 1.8, ONE[2]);   // the paw foot
      R(fx - 2.5 + s2 * 0.5, hipY + 13 - lift, 5, 1, ONE[0]);
      for (let k = -1; k <= 1; k++) P(fx + s2 * 0.5 + k * 1.5, hipY + 10 - lift, BELLY[1]);           // toe beans
    }

    // ---- the far arm (only when it crosses in front does the order matter)
    const shY = 45 + y0;
    const arm = (s2, hand) => {
      const sx = cx + s2 * 6.5, hx = sx + hand[0] * 0.9, hy = shY + hand[1];
      // a slim sleeve, a touch fuller at the shoulder, with a lit edge and a cream cuff
      Art.limb(g, sx, shY, hx, hy, 3.2, 2.4, ONE[0]);
      Art.limb(g, sx, shY, hx, hy, 2.4, 1.7, ONE[2]);
      Art.limb(g, sx - 0.6, shY - 0.5, hx - 0.5, hy - 0.5, 1, 0.7, ONE[3]);
      const cx2 = sx + (hx - sx) * 0.84, cy2 = shY + (hy - shY) * 0.84;
      E(cx2, cy2, 2.4, 1.6, BELLY[0]); E(cx2, cy2 - 0.3, 1.9, 1.1, BELLY[1]);
      // the paw: round, with a pink bean and three toe beans
      E(hx, hy + 1.2, 3, 2.9, ONE[0]); E(hx, hy + 0.8, 2.5, 2.4, ONE[2]); E(hx - 0.8, hy, 1.2, 1, ONE[3]);
      E(hx, hy + 1.6, 1.1, 0.9, '#f4a0b0');
      for (const d of [-1.2, 0, 1.2]) P(hx + d, hy - 0.4, '#f4a0b0');
    };

    // ---- the body: the onesie, round, with a cream tummy and a zip
    // slim: narrow shoulders, a waist, a little flare at the hip
    E(cx, 50 + y0, 7.5, 7, ONE[1]); E(cx, 60 + y0, 8, 7, ONE[1]); R(cx - 6, 50 + y0, 12, 10, ONE[1]);
    E(cx, 50 + y0, 6.8, 6.2, ONE[2]); E(cx, 60 + y0, 7.2, 6.2, ONE[2]); R(cx - 5.4, 50 + y0, 10.8, 10, ONE[2]);
    E(cx - 3, 48 + y0, 3, 4, ONE[3]);
    E(cx, 57 + y0, 4, 6, BELLY[0]); E(cx, 56.5 + y0, 3.4, 5.4, BELLY[1]); E(cx - 1, 54 + y0, 1.6, 2, BELLY[2]);
    R(cx, 44 + y0, 1, 20, ONE[0]); R(cx - 1, 46 + y0, 3, 2, '#e8c050');           // the zip and its pull
    if (!(pose === 'clap')) { arm(-1, hl); arm(1, hr); }

    // ---- the head: the hood first, then the face inside it
    const hy = 24 + y0, tl = tilt;
    // hood ears, round, with pink insides
    for (const s2 of [-1, 1]) { E(cx + s2 * 13 + tl, hy - 13, 5, 5, ONE[1]); E(cx + s2 * 13 + tl, hy - 13, 3, 3, LINE); }
    E(cx + tl, hy, 19, 18, ONE[1]);
    E(cx + tl, hy - 1, 18, 17, ONE[2]);
    E(cx - 6 + tl, hy - 9, 8, 5, ONE[3]);                                          // light on the crown of it
    // the hood's own little wombat face, over her fringe
    E(cx + tl, hy - 12, 5, 3, ONE[0]); E(cx - 1 + tl, hy - 13, 2, 1, ONE[1]);    // its nose
    for (const s2 of [-1, 1]) { R(cx + s2 * 8 - 1 + tl, hy - 14, 2, 2, INK); P(cx + s2 * 8 - 1 + tl, hy - 14, '#ffffff'); }
    // the lining round the opening, then the face
    E(cx + tl, hy + 4, 14, 13, LINE);
    E(cx + tl, hy + 4, 12.5, 12, SKIN[1]);
    E(cx - 4 + tl, hy + 1, 5, 4, SKIN[2]);
    // the fringe: long points coming down over the brow, and side locks
    const fr = [[-12, 5], [-9, 8], [-5, 6], [-2, 9], [1, 7], [4, 9], [7, 6], [10, 8]];
    R(cx - 12 + tl, hy - 8, 24, 5, HAIR[1]);
    for (const [dx, len] of fr) {
      R(cx + dx + tl, hy - 4, 3, len - 2, HAIR[1]); R(cx + dx + 1 + tl, hy - 4, 1, len - 1, HAIR[2]);
      P(cx + dx + 1 + tl, hy - 4 + len - 1, HAIR[1]);
    }
    R(cx - 11 + tl, hy - 7, 20, 1, HAIR[3]);                                        // the shine band
    for (const s2 of [-1, 1]) {
      const lx = s2 < 0 ? cx - 13 + tl : cx + 10 + tl;
      R(lx, hy - 2, 3, 16, HAIR[1]); R(lx + (s2 < 0 ? 0 : 2), hy - 2, 1, 15, s2 < 0 ? HAIR[2] : HAIR[0]);
      R(lx, hy + 14, 3, 2, HAIR[0]);
    }
    // eyes, blush, mouth
    const ey = hy + 3;
    eye(g, cx - 9 + tl, ey, 1, ek, mood === 'think' ? 'side' : null, R, P);
    eye(g, cx + 4 + tl, ey, 1, ek, mood === 'think' ? 'side' : null, R, P);
    R(cx - 11 + tl, ey + 8, 4, 2, BLUSH); R(cx + 7 + tl, ey + 8, 4, 2, BLUSH);
    P(cx - 10 + tl, ey + 8, '#ffc0cc'); P(cx + 8 + tl, ey + 8, '#ffc0cc');
    mouth(g, cx + tl, ey + 10, mk, 1, R, P);
    if (pose === 'clap') { arm(-1, hl); arm(1, hr); }                             // the hands meet in front
    if (pose === 'sleep') { Font.draw(g, 'z', cx + 14, hy - 20, { scale: 1, color: '#8a8ad8' }); }
    g.restore();
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
    const R = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
    const P = (x, y, col) => R(x, y, 1, 1, col);
    const E = (x, y, rx, ry, col) => Art.ell(g, x, y, rx, ry, col);
    const cx = 32;
    // long hair behind
    R(8, 30, 9, 30, HAIR[1]); R(47, 30, 9, 30, HAIR[1]); R(8, 30, 3, 30, HAIR[2]); R(53, 30, 3, 30, HAIR[0]);
    // shoulders: the onesie, a cream collar of tummy and the zip
    E(cx, 64, 28, 12, ONE[1]); E(cx, 64, 27, 11, ONE[2]); E(cx - 10, 58, 8, 4, ONE[3]);
    E(cx, 66, 12, 8, BELLY[1]); R(cx, 54, 1, 10, ONE[0]); R(cx - 1, 56, 3, 3, '#e8c050'); P(cx, 57, '#fff0a0');
    // the hood: ears, the round of it, the wombat face on the front
    for (const s2 of [-1, 1]) { E(cx + s2 * 19, 9, 7, 7, ONE[1]); E(cx + s2 * 19, 9, 4, 4, LINE); }
    E(cx, 30, 27, 26, ONE[1]);
    E(cx, 29, 26, 25, ONE[2]);
    E(cx - 9, 16, 11, 6, ONE[3]);
    E(cx, 12, 7, 4, ONE[0]); E(cx - 2, 11, 3, 1.4, ONE[1]);                        // its nose
    for (const s2 of [-1, 1]) { R(cx + s2 * 12 - 2, 9, 3, 3, INK); P(cx + s2 * 12 - 2, 9, '#ffffff'); }
    // the lining and the face
    E(cx, 37, 21, 20, LINE);
    E(cx, 37, 19, 19, SKIN[1]);
    E(cx - 6, 32, 8, 6, SKIN[2]);
    R(cx - 3, 45, 6, 1, SKIN[0]);                                                  // the soft line of the chin
    // the fringe
    R(cx - 18, 19, 36, 5, HAIR[1]);
    const fr = [[-18, 9], [-14, 13], [-9, 10], [-5, 14], [-1, 11], [3, 14], [8, 10], [12, 13], [16, 9]];
    for (const [dx, len] of fr) {
      R(cx + dx, 24, 4, len - 3, HAIR[1]); R(cx + dx + 1, 24, 2, len - 2, HAIR[2]);
      R(cx + dx + 1, 24 + len - 3, 2, 1, HAIR[1]);
    }
    R(cx - 16, 20, 30, 1, HAIR[3]); R(cx - 12, 21, 8, 1, HAIR[3]);                 // the shine band
    for (const s2 of [-1, 1]) {                                                    // side locks
      const lx = s2 < 0 ? cx - 20 : cx + 15;
      R(lx, 26, 5, 26, HAIR[1]); R(lx + (s2 < 0 ? 1 : 3), 26, 1, 25, s2 < 0 ? HAIR[2] : HAIR[0]);
      R(lx + 1, 51, 3, 3, HAIR[1]);
    }
    const [ek0, mk0] = FACE[mood] || FACE.talk;
    const ek = blink ? 'shut' : ek0, mk = open ? 'open' : mk0;
    eye(g, cx - 15, 29, 1.95, ek, mood === 'think' ? 'side' : null, R, P);
    eye(g, cx + 5, 29, 1.95, ek, mood === 'think' ? 'side' : null, R, P);
    if (mood === 'cross') { R(cx - 15, 28, 9, 1, INK); R(cx + 6, 28, 9, 1, INK); }
    if (mood === 'worry' || mood === 'sad') { R(cx - 14, 27, 4, 1, INK); R(cx - 10, 26, 3, 1, INK); R(cx + 7, 26, 3, 1, INK); R(cx + 10, 27, 4, 1, INK); }
    // blush, with the anime hatching
    R(cx - 18, 44, 7, 3, BLUSH); R(cx + 11, 44, 7, 3, BLUSH);
    for (let i = 0; i < 3; i++) { P(cx - 17 + i * 2, 44, '#ffc0cc'); P(cx + 12 + i * 2, 44, '#ffc0cc'); }
    mouth(g, cx, 48, mk, 1.6, R, P);
    if (mood === 'happy' || mood === 'proud') { P(cx + 22, 18, '#ffffff'); R(cx + 21, 19, 3, 1, '#ffffff'); P(cx + 22, 20, '#ffffff'); }   // a sparkle
    Art.outline(c, INK, 1);
    cache.set(key, c);
    return c;
  }
  return { sprite, bust };
})();
