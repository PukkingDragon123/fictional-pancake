// ---- Cast: Shaz, Groot and Captain Kirk, redrawn to stand beside Mr Biscuit ----------------
// Same hand as the pug: muted, real-world materials in four or five tones,
// one dark line round everything, and the soft "noodle" arm -- a single curve
// from shoulder to hand that bows out, sags with its own weight and trails a
// beat behind the hand. Every figure keeps the canvas box its old sprite had,
// so everywhere that draws them still lines up.
//
//   Cast.shaz(f, t, pose)   36 x 46, feet at y 45 -- the bull shark on the Wombat Mart till
//   Cast.groot(f, t, pose)  56 x 92, feet at y 89 -- the tree who sells seed
//   Cast.kirk(f, t, pose)   30 x 46, feet at y 45 -- the robot captain and his furniture
//   Cast.bust(key, mood, t, talking)   their 64 x 64 portraits
const Cast = (() => {
  const cache = new Map();
  const TAU = Math.PI * 2;
  const INK = '#1c130d';
  const kit = (g) => {
    const R = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
    return { g, R, P: (x, y, col) => R(x, y, 1, 1, col), E: (x, y, rx, ry, col) => Art.ell(g, x, y, rx, ry, col) };
  };

  // ---- poses -------------------------------------------------------------------------------------
  // Hands are given as a direction from the shoulder in arm-lengths: x outward, y down.
  // [0.2, 1] hangs at the side; [0.6, -1] is up in the air.
  function rig(pose, f, t) {
    const S = Math.sin(t * TAU), A = Math.abs(Math.sin(t * TAU * 2)), W2 = Math.sin(t * TAU * 2);
    const p = { bob: 0, step: 0, hl: [0.22, 0.97], hr: [0.22, 0.97], eyes: 'open', mouth: 'smile', tilt: 0, brow: 0 };
    switch (pose) {
      case 'idle': p.bob = [0, 0, -1, -1, 0, 0][f % 6] || 0; p.hl = [0.24, 0.96 + S * 0.03]; p.hr = [0.24, 0.96 - S * 0.03];
        p.eyes = f % 6 === 4 ? 'shut' : 'open'; break;
      case 'walk': case 'run': {
        const k = pose === 'run' ? 1.4 : 1;
        p.bob = -A * 1.5 * k; p.step = S * k; p.hl = [0.25, 0.95 - S * 0.25 * k]; p.hl[0] += S * 0.3; p.hr = [0.25 - S * 0.3, 0.95 + S * 0.05]; break;
      }
      case 'talk': p.bob = f % 2 ? -1 : 0; p.mouth = f % 2 ? 'open' : 'talk'; p.hr = [0.75, 0.25 - Math.abs(S) * 0.3]; p.brow = 0.5; break;
      case 'happy': p.bob = [0, -1, -2, -2, -1, 0][f % 6] || 0; p.mouth = 'grin'; p.eyes = 'happy'; p.hl = [0.55, 0.6]; p.hr = [0.55, 0.6]; break;
      case 'wave': p.bob = -1; p.mouth = 'grin'; p.eyes = 'happy'; p.hr = [0.55 + W2 * 0.25, -0.95]; break;
      case 'cheer': p.bob = [0, -2, -4, -4, -2, 0][f % 6] || 0; p.mouth = 'grin'; p.eyes = 'happy'; p.hl = [0.5, -1]; p.hr = [0.5, -1]; break;
      case 'think': p.eyes = 'side'; p.mouth = 'flat'; p.brow = 0.8; p.tilt = -1; p.hr = [-0.35, -0.2]; break;
      case 'cross': p.eyes = 'narrow'; p.mouth = 'frown'; p.brow = -1; p.hl = [-0.55, 0.45]; p.hr = [-0.55, 0.5]; break;
      case 'surprise': case 'shock': p.bob = [0, -3, -1, -1][f % 4] || 0; p.eyes = 'wide'; p.mouth = 'o'; p.brow = 1.2; p.hl = [0.85, -0.35]; p.hr = [0.85, -0.35]; break;
      case 'sleepy': case 'tired': p.eyes = 'shut'; p.mouth = 'flat'; p.tilt = 1.5; p.bob = [0, 0, 1, 1][f % 4] || 0; p.hl = [0.15, 1]; p.hr = [0.15, 1]; break;
      case 'sad': p.eyes = 'sad'; p.mouth = 'frown'; p.brow = -0.4; p.tilt = 1; p.bob = 1; p.hl = [0.1, 1]; p.hr = [0.1, 1]; break;
      case 'point': p.hr = [1.05, -0.05]; p.brow = 0.8; break;
      case 'curious': p.eyes = 'wide'; p.mouth = 'o'; p.brow = 1; p.tilt = -1.5; p.hr = [0.6, 0.3]; break;
      case 'proud': p.eyes = 'narrow'; p.mouth = 'grin'; p.brow = 0.6; p.hl = [-0.1, 0.7]; p.hr = [-0.1, 0.7]; p.bob = [0, -1, -1, 0, 0, 0][f % 6] || 0; break;
      case 'worry': p.eyes = 'wide'; p.mouth = 'wobble'; p.brow = 0.5; p.tilt = W2; p.hl = [-0.25, 0.55]; p.hr = [-0.25, 0.55]; break;
      case 'laugh': p.eyes = 'happy'; p.mouth = 'grin'; p.tilt = -1; p.bob = [0, -1, -2, -1, 0, 0][f % 6] || 0; p.hl = [-0.1, 0.6]; p.hr = [-0.1, 0.6]; break;
    }
    return p;
  }
  // the noodle arm: a quadratic curve, bowed outward, sagging, trailing behind the hand
  function arm(k, s2, sx, sy, dir, L, w, cols, t, lagAmt = 1) {
    const hx = sx + s2 * dir[0] * L, hy = sy + dir[1] * L;
    const lag = Math.sin(t * TAU * 2 - 1.1 + s2 * 0.6) * 0.12 * L * lagAmt;
    const kx = (sx + hx) / 2 + s2 * L * 0.22 + lag, ky = (sy + hy) / 2 + L * 0.12 + Math.abs(lag) * 0.4;
    const at = (u) => [(1 - u) * (1 - u) * sx + 2 * (1 - u) * u * kx + u * u * hx, (1 - u) * (1 - u) * sy + 2 * (1 - u) * u * ky + u * u * hy];
    const N = Math.max(10, Math.round(L * 1.4));
    cols.forEach((col, j) => {
      const ww = w * (1 - j * 0.34), off = -j * 0.5;
      for (let i = 0; i <= N; i++) { const u = i / N, [x, y] = at(u); if (u > 0.9) break; k.E(x + off, y + off, ww * (1 - u * 0.2), ww * (1 - u * 0.2), col); }
    });
    return { hx, hy, at };
  }
  // eyes and mouths, at any scale s
  function eye(k, cx, cy, s, kind, iris, white = '#ece6da') {
    const { R, E } = k;
    const r = 1.8 * s;
    if (kind === 'happy') { for (let i = -Math.round(r); i <= Math.round(r); i++) R(cx + i, cy - Math.round(Math.cos(i / r * 1.3) * s * 1.2) + Math.round(s * 0.4), 1, Math.max(1, Math.round(s * 0.7)), INK); return; }
    if (kind === 'shut') { R(cx - r, cy, r * 2 + 1, Math.max(1, Math.round(s * 0.7)), INK); return; }
    const rr = kind === 'wide' ? r * 1.15 : r;
    E(cx, cy, rr + s * 0.5, rr + s * 0.5, white);
    const ox = kind === 'side' ? s * 0.8 : 0;
    E(cx + ox, cy + s * 0.2, rr * 0.75, rr * 0.8, iris);
    E(cx + ox, cy + s * 0.3, rr * 0.4, rr * 0.4, '#0c0806');
    R(cx + ox - rr * 0.5, cy - rr * 0.5, Math.max(1, Math.round(s)), Math.max(1, Math.round(s)), '#fffaf0');
    if (kind === 'narrow') R(cx - rr - s, cy - rr - s, rr * 2 + s * 2 + 1, rr + s * 0.6, k.lid);
    if (kind === 'sad') for (let i = 0; i <= rr * 2 + 1; i++) R(cx - rr + i, cy - rr - s + Math.round(i * 0.25), 1, Math.max(1, s * 0.7), k.lid);
  }
  function mouth(k, cx, y, kind, s, teeth) {
    const { R, P } = k;
    const u = Math.max(1, Math.round(s));
    switch (kind) {
      case 'talk': R(cx - u * 2, y, u * 4, u + 1, INK); break;
      case 'open': R(cx - u * 2, y, u * 4, u * 2 + 1, INK); R(cx - u, y + u, u * 2, u, '#9a4a52'); if (teeth) R(cx - u * 2, y, u * 4, 1, '#e8e0d0'); break;
      case 'grin': R(cx - u * 3, y, u * 6, u * 2 + 1, INK); R(cx - u * 2, y + u, u * 4, u, '#9a4a52'); R(cx - u * 3, y, u * 6, 1, teeth ? '#e8e0d0' : INK); break;
      case 'o': R(cx - u, y - 1, u * 2 + 1, u * 2 + 1, INK); break;
      case 'frown': R(cx - u * 2, y + u, u * 4, 1, INK); P(cx - u * 2 - 1, y + u + 1, INK); P(cx + u * 2, y + u + 1, INK); break;
      case 'wobble': for (let i = -u * 2; i <= u * 2; i++) P(cx + i, y + (((i % 2) + 2) % 2), INK); break;
      case 'flat': R(cx - u * 2, y + u, u * 4, 1, INK); break;
      default: R(cx - u * 2, y + u, u * 4, 1, INK); P(cx - u * 2 - 1, y + u - 1, INK); P(cx + u * 2, y + u - 1, INK);
    }
  }
  function frame(name, f, t, pose, w, h, draw) {
    const key = `${name}:${f}:${pose}`;
    let c = cache.get(key); if (c) return c;
    const o = Art.cv(w, h); c = o.c;
    draw(kit(o.g), rig(pose, f, t));
    Art.outline(c, INK, 1);
    cache.set(key, c);
    return c;
  }

  // ---- Shaz ---------------------------------------------------------------------------------------
  const SH = ['#26313c', '#3a4856', '#526272', '#6e8090', '#8ea0ae'];
  const BELLY = ['#a9aea8', '#c9cbc3', '#e2e2da'];
  const SUIT = ['#151a26', '#20283a', '#2e384e', '#424e66'];
  const CAP = ['#1e3222', '#2e4a32', '#436646', '#5c8060'];
  const TIE = ['#5a1a1c', '#7e2a28', '#a04038'];
  function shaz(f, t, pose) {
    return frame('shaz', f, t, pose, 36, 46, (k, p) => {
      const { R, P, E, g } = k; k.lid = SH[2];
      const cx = 18, y0 = Math.round(p.bob);
      // the tail, sweeping out behind the left leg
      const tw = Math.sin(t * TAU) * 1.5;
      Art.poly(g, [[cx - 6, 36 + y0], [cx - 3, 39 + y0], [cx - 13 + tw, 44], [cx - 14 + tw, 38]], SH[1]);
      Art.poly(g, [[cx - 12 + tw, 38], [cx - 17 + tw, 33], [cx - 14 + tw, 40]], SH[1]);
      // legs: trousers and shoes
      for (const s2 of [-1, 1]) {
        const lx = cx + s2 * 3 + p.step * s2 * 1.5, lift = p.step * s2 > 0.5 ? 1 : 0;
        R(lx - 2, 37 + y0, 4, 7 - lift - y0, SUIT[1]); R(lx - 2, 37 + y0, 1, 6 - y0, SUIT[2]);
        E(lx + 0.5, 44 - lift, 3, 1.6, '#1a120c'); R(lx - 1, 43 - lift, 2, 1, '#4a3a2e');
      }
      // body: the suit, a pale shirt V, the tie, the badge
      E(cx, 32 + y0, 8, 7, SUIT[0]); E(cx, 31.5 + y0, 7.4, 6.5, SUIT[1]); E(cx - 2, 29.5 + y0, 4.5, 3.5, SUIT[2]);
      Art.poly(g, [[cx - 3, 25 + y0], [cx + 3, 25 + y0], [cx + 1, 34 + y0], [cx - 1, 34 + y0]], BELLY[2]);
      R(cx - 1, 26 + y0, 2, 7, TIE[1]); P(cx - 1, 26 + y0, TIE[2]); R(cx - 1, 33 + y0, 2, 1, TIE[0]);
      R(cx + 3, 29 + y0, 3, 2, '#c9a256'); P(cx + 3, 29 + y0, '#e6d4a0');
      // arms: suit sleeves ending in fins
      const hand = (a) => { E(a.hx, a.hy + 0.5, 2.2, 1.6, SH[2]); E(a.hx - 0.4, a.hy, 1.4, 0.9, SH[3]); };
      for (const [s2, d] of [[-1, p.hl], [1, p.hr]]) hand(arm(k, s2, cx + s2 * 6, 27 + y0, d, 8, 1.9, [SUIT[1], SUIT[2], SUIT[3]], t));
      // the head: a big blunt shark head, pale underneath
      const hx = cx + p.tilt * 0.5, hy = 15 + y0;
      E(hx, hy, 11, 9.5, SH[1]); E(hx - 0.5, hy - 0.5, 10.3, 8.8, SH[2]); E(hx - 3, hy - 4, 6, 3.5, SH[3]); E(hx - 4, hy - 6, 2.5, 1.2, SH[4]);
      E(hx, hy + 4, 8.5, 5, BELLY[0]); E(hx, hy + 3.6, 7.8, 4.3, BELLY[1]); E(hx - 2, hy + 2.6, 3, 1.5, BELLY[2]);
      for (const x of [-9, -7]) R(hx + x, hy - 1 + (x + 9) / 2, 1, 3, SH[0]);     // gills
      for (const x of [7, 9]) R(hx + x, hy - 1 + (9 - x) / 2, 1, 3, SH[0]);
      // the cap, with the fin through it
      E(hx, hy - 7, 9.5, 4, CAP[1]); R(hx - 9, hy - 7, 18, 3, CAP[1]); E(hx - 3, hy - 9, 4, 1.6, CAP[2]);
      R(hx - 10, hy - 5, 20, 2, CAP[0]); R(hx - 10, hy - 5, 20, 1, CAP[2]);
      Art.poly(g, [[hx + 1, hy - 9], [hx + 6, hy - 9], [hx + 4, hy - 16]], SH[1]); Art.poly(g, [[hx + 2, hy - 9], [hx + 5, hy - 9], [hx + 4, hy - 14]], SH[2]);
      R(hx - 5, hy - 10, 3, 2, '#e6d4a0');
      // the face
      eye(k, hx - 4.5, hy - 0.5, 1, p.eyes, '#1a1612');
      eye(k, hx + 4.5, hy - 0.5, 1, p.eyes, '#1a1612');
      if (p.brow < -0.3) { R(hx - 7, hy - 3, 4, 1, INK); R(hx + 3, hy - 3, 4, 1, INK); }
      mouth(k, hx, hy + 4, p.mouth, 1, true);
      if (p.mouth === 'smile' || p.mouth === 'grin') for (const dx of [-2, 0, 2]) P(hx + dx, hy + 6, '#e8e0d0');
    });
  }

  // ---- Groot --------------------------------------------------------------------------------------
  const BARK = ['#281b12', '#3e2c1d', '#56402b', '#6e553b', '#8a6f52'];
  const MOSS = ['#2c3e1e', '#40582a', '#5a7440', '#7a9058'];
  const PETAL = ['#c8a0a8', '#d8c080', '#e6e2d6', '#a8b0c8'];
  function groot(f, t, pose) {
    return frame('groot', f, t, pose, 56, 92, (k, p) => {
      const { R, P, E, g } = k; k.lid = BARK[2];
      const cx = 28, y0 = Math.round(p.bob);
      // legs: two root-trunks that spread into toes of root at the ground
      for (const s2 of [-1, 1]) {
        const lx = cx + s2 * 5 + p.step * s2 * 3, lift = p.step * s2 > 0.5 ? 2 : 0;
        Art.limb(g, cx + s2 * 4, 58 + y0, lx, 86 - lift, 4.2, 3.4, BARK[1]);
        Art.limb(g, cx + s2 * 4 - 1, 58 + y0, lx - 1, 86 - lift, 2.4, 1.8, BARK[2]);
        R(lx - 1 - 0.5, 62 + y0, 1, 20, BARK[3]);
        for (const [dx, len] of [[-5, 4], [-1, 3], [3, 5]]) Art.limb(g, lx, 86 - lift, lx + dx * 1.1, 89 - lift, 1.8, 0.8, BARK[1]);
      }
      // the trunk of him: a tapering torso of bark, grain running down, moss on one side
      Art.poly(g, [[cx - 11, 34 + y0], [cx + 11, 34 + y0], [cx + 8, 60 + y0], [cx - 8, 60 + y0]], BARK[1]);
      Art.poly(g, [[cx - 9, 35 + y0], [cx + 7, 35 + y0], [cx + 5, 59 + y0], [cx - 7, 59 + y0]], BARK[2]);
      E(cx - 3, 42 + y0, 4, 6, BARK[3]); E(cx - 4, 39 + y0, 2, 2, BARK[4]);
      for (const [x, a, b] of [[-6, 36, 20], [-2, 38, 18], [3, 36, 22], [6, 40, 14]]) R(cx + x, a + y0, 1, b, BARK[0]);
      E(cx + 3, 50 + y0, 2.4, 1.8, BARK[0]); E(cx + 3, 50 + y0, 1.2, 0.8, BARK[4]);        // a knot
      E(cx + 7, 38 + y0, 4, 3, MOSS[1]); E(cx + 7, 37 + y0, 2.6, 1.8, MOSS[2]); E(cx - 7, 56 + y0, 3, 2, MOSS[1]);
      // branch arms, long and bendy, with twig fingers and a leaf or two
      const hand = (a, s2) => {
        for (const [dx, dy] of [[1.6, 1.2], [0.4, 2.2], [-1, 1.6]]) Art.limb(g, a.hx, a.hy, a.hx + dx * s2 * 1.4, a.hy + dy * 1.4, 1.1, 0.5, BARK[2]);
        E(a.hx + s2 * 2.5, a.hy - 1.5, 2, 1.2, MOSS[2]);
      };
      for (const [s2, d] of [[-1, p.hl], [1, p.hr]]) {
        const a = arm(k, s2, cx + s2 * 10, 37 + y0, d, 20, 2.6, [BARK[1], BARK[2], BARK[3]], t, 1.2);
        const [mx, my] = a.at(0.5); E(mx + s2, my - 1, 1.8, 1.1, MOSS[2]);                   // a leaf on the elbow
        hand(a, s2);
      }
      // the head: a rounded stump, taller than wide
      const hx = cx + p.tilt * 0.6, hy = 20 + y0;
      E(hx, hy, 11, 13, BARK[1]); E(hx - 0.5, hy - 0.5, 10.2, 12.2, BARK[2]); E(hx - 3, hy - 5, 5, 6, BARK[3]); E(hx - 4, hy - 8, 2, 2.4, BARK[4]);
      for (const [x, a, b] of [[-7, -6, 14], [-4, -10, 8], [5, -8, 16], [8, -3, 10]]) R(hx + x, hy + a, 1, b, BARK[0]);
      R(hx - 2, hy + 12, 4, 3, BARK[1]);                                                        // the neck
      // the crown: moss and small flowers, and a sprout
      E(hx, hy - 11, 11, 4, MOSS[0]); E(hx, hy - 11.5, 10.5, 3.4, MOSS[1]);
      for (let i = 0; i < 6; i++) E(hx - 9 + i * 3.6, hy - 13 + (i % 2) * 2, 2.4, 1.8, MOSS[i % 2 ? 1 : 2]);
      for (const [x, y, c] of [[-7, -13, PETAL[0]], [-1, -15, PETAL[1]], [5, -13, PETAL[2]], [9, -10, PETAL[3]]]) {
        for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) P(hx + x + dx, hy + y + dy, c);
        P(hx + x, hy + y, '#b88a3a');
      }
      R(hx + 2, hy - 20, 1, 5, MOSS[1]); E(hx + 1, hy - 20, 1.6, 0.8, MOSS[3]); E(hx + 4, hy - 19, 1.6, 0.8, MOSS[3]);
      // the face: a heavy brow, kind green eyes, a wide wooden mouth
      R(hx - 8, hy - 3 - Math.max(0, p.brow), 7, 2, BARK[0]); R(hx + 1, hy - 3 - Math.max(0, p.brow), 7, 2, BARK[0]);
      if (p.brow < -0.3) { P(hx - 2, hy - 2, BARK[0]); P(hx + 1, hy - 2, BARK[0]); }
      eye(k, hx - 4.5, hy + 1, 1.1, p.eyes, '#4a7a3a', '#d8d0bc');
      eye(k, hx + 4.5, hy + 1, 1.1, p.eyes, '#4a7a3a', '#d8d0bc');
      R(hx - 1, hy + 4, 2, 2, BARK[1]);                                                          // the nose, a nub
      mouth(k, hx, hy + 7, p.mouth, 1, false);
    });
  }

  // ---- Captain Kirk -------------------------------------------------------------------------------
  const STEEL = ['#30363e', '#4a525c', '#68717c', '#8c959f', '#b4bcc4'];
  const SHIRT = ['#b8b2a4', '#d6d0c2', '#ece8de'];
  const NAVY = ['#141a28', '#1f283c', '#2e3a52'];
  const HAIR = ['#2e1c12', '#4a2e1c', '#6a4428'];
  const LED = '#8ad8c4';
  function kirk(f, t, pose) {
    return frame('kirk', f, t, pose, 30, 46, (k, p) => {
      const { R, P, E } = k; k.lid = STEEL[2];
      const cx = 15, y0 = Math.round(p.bob);
      // legs: navy trousers over pistons, and heavy boots
      for (const s2 of [-1, 1]) {
        const lx = cx + s2 * 3 + p.step * s2 * 1.5, lift = p.step * s2 > 0.5 ? 1 : 0;
        R(lx - 2, 34 + y0, 4, 9 - lift - y0, NAVY[1]); R(lx - 2, 34 + y0, 1, 8 - y0, NAVY[2]);
        R(lx - 2, 42 - lift, 5, 3, '#1a140e'); R(lx - 1, 42 - lift, 2, 1, '#4a3e32');
      }
      // body: the I-heart-KIRK tee over a steel frame
      R(cx - 6, 22 + y0, 12, 13, SHIRT[1]); R(cx - 6, 22 + y0, 12, 2, SHIRT[2]); R(cx + 4, 24 + y0, 2, 11, SHIRT[0]);
      R(cx - 6, 34 + y0, 12, 1, SHIRT[0]);
      R(cx - 4, 26 + y0, 1, 3, INK); R(cx - 2, 26 + y0, 1, 1, '#a8403a'); R(cx - 3, 26 + y0, 3, 1, '#a8403a'); R(cx - 3, 27 + y0, 3, 1, '#a8403a'); P(cx - 2, 28 + y0, '#a8403a');   // I heart
      for (let i = 0; i < 4; i++) R(cx - 4 + i * 2, 30 + y0, 1, 2, NAVY[1]);                 // KIRK, as it would read at this size
      R(cx - 3, 22 + y0, 6, 1, STEEL[2]);                                                        // the neck ring
      // arms: jointed steel, bowing softly all the same, with white gloves
      const hand = (a) => { E(a.hx, a.hy + 0.5, 2, 1.9, '#e6e2d8'); E(a.hx - 0.5, a.hy, 1.2, 1, '#fffaf0'); };
      for (const [s2, d] of [[-1, p.hl], [1, p.hr]]) {
        const a = arm(k, s2, cx + s2 * 6.5, 24 + y0, d, 9, 1.6, [STEEL[1], STEEL[3], STEEL[4]], t, 0.7);
        const [mx, my] = a.at(0.5); E(mx, my, 1.4, 1.4, STEEL[0]);                               // the elbow bolt
        hand(a);
      }
      // the head: a rounded steel box with a screen for a face, and his hair
      const hx = cx + Math.round(p.tilt * 0.4), hy = 11 + y0;
      R(hx - 8, hy - 7, 16, 14, STEEL[1]); R(hx - 7, hy - 8, 14, 16, STEEL[1]);
      R(hx - 7, hy - 7, 14, 13, STEEL[2]); R(hx - 7, hy - 7, 14, 2, STEEL[3]); R(hx - 6, hy - 6, 4, 1, STEEL[4]);
      R(hx - 10, hy - 2, 2, 5, STEEL[2]); R(hx + 8, hy - 2, 2, 5, STEEL[2]);                      // ear bolts
      R(hx - 6, hy - 3, 12, 8, '#121c20'); R(hx - 6, hy - 3, 12, 1, '#243238');                  // the screen
      // the fringe and sideburns, glued on, slightly lopsided
      R(hx - 8, hy - 9, 16, 3, HAIR[1]); R(hx - 8, hy - 9, 16, 1, HAIR[2]); R(hx - 8, hy - 6, 2, 5, HAIR[1]); R(hx + 6, hy - 6, 2, 5, HAIR[1]);
      for (const x of [-6, -3, 1, 4]) R(hx + x, hy - 6, 2, 1, HAIR[0]);
      R(hx + 7, hy - 11, 1, 3, STEEL[3]); E(hx + 7.5, hy - 11.5, 1, 1, f % 3 === 0 ? '#e8b060' : '#a86a30');   // antenna
      // LED eyes and mouth on the screen
      const ek = p.eyes;
      for (const ex of [-3, 2]) {
        if (ek === 'happy') { R(hx + ex, hy - 1, 2, 1, LED); P(hx + ex - 1, hy, LED); P(hx + ex + 2, hy, LED); }
        else if (ek === 'shut' || ek === 'narrow') R(hx + ex - 0.5, hy, 3, 1, LED);
        else if (ek === 'wide') R(hx + ex - 0.5, hy - 1.5, 3, 3, LED);
        else R(hx + ex, hy - 1, 2, 2, LED);
      }
      const mk = p.mouth;
      if (mk === 'grin' || mk === 'open') { R(hx - 2, hy + 2, 5, 2, LED); R(hx - 1, hy + 3, 3, 1, '#121c20'); }
      else if (mk === 'o') R(hx - 0.5, hy + 2, 2, 2, LED);
      else if (mk === 'frown') { R(hx - 2, hy + 3, 5, 1, LED); P(hx - 2, hy + 4, LED); P(hx + 2, hy + 4, LED); }
      else if (mk === 'talk') R(hx - 2, hy + 2 + (f % 2), 5, 1, LED);
      else { R(hx - 2, hy + 3, 5, 1, LED); P(hx - 3, hy + 2, LED); P(hx + 3, hy + 2, LED); }
    });
  }

  // ---- portraits ----------------------------------------------------------------------------------
  const MOODMAP = {
    talk: 'talk', idle: 'idle', happy: 'happy', laugh: 'laugh', proud: 'proud', think: 'think', worry: 'worry', sad: 'sad',
    cross: 'cross', shock: 'surprise', sly: 'proud', tired: 'sleepy', curious: 'curious', surprise: 'surprise', sleepy: 'sleepy',
  };
  function bust(key, mood = 'talk', t = 0, talking = false) {
    const blink = (t % 3.8) > 3.64, open = talking && Math.floor(t * 9) % 2 === 0;
    const ck = `b:${key}:${mood}:${blink ? 1 : 0}:${open ? 1 : 0}`;
    let c = cache.get(ck); if (c) return c;
    const o = Art.cv(64, 64); c = o.c;
    const k = kit(o.g), p = rig(MOODMAP[mood] || 'talk', 0, 0);
    if (blink) p.eyes = 'shut';
    if (open) p.mouth = 'open';
    ({ shaz: bustShaz, groot: bustGroot, clark: bustKirk })[key](k, p);
    Art.outline(c, INK, 1);
    cache.set(ck, c);
    return c;
  }
  function bustShaz(k, p) {
    const { R, P, E, g } = k; k.lid = SH[2];
    const cx = 32;
    E(cx, 66, 30, 13, SUIT[1]); E(cx - 10, 59, 12, 5, SUIT[2]);
    Art.poly(g, [[cx - 8, 50], [cx + 8, 50], [cx + 3, 64], [cx - 3, 64]], BELLY[2]);
    Art.poly(g, [[cx - 11, 51], [cx - 6, 51], [cx - 2, 64], [cx - 8, 64]], SUIT[3]);
    Art.poly(g, [[cx + 6, 51], [cx + 11, 51], [cx + 8, 64], [cx + 2, 64]], SUIT[2]);
    R(cx - 2, 51, 4, 3, TIE[2]); Art.poly(g, [[cx - 2, 54], [cx + 2, 54], [cx + 3, 64], [cx - 3, 64]], TIE[1]);
    R(cx + 14, 57, 7, 4, '#c9a256'); R(cx + 15, 58, 5, 1, '#8a6a2e');
    // the head
    E(cx, 31, 26, 22, SH[1]); E(cx - 1, 30, 25, 21, SH[2]); E(cx - 7, 21, 13, 7, SH[3]); E(cx - 10, 17, 5, 2, SH[4]);
    E(cx, 42, 19, 10, BELLY[0]); E(cx, 41, 18, 9, BELLY[1]); E(cx - 5, 38, 8, 3, BELLY[2]);
    for (const x of [8, 11, 14]) R(x, 32 + (x - 8) / 3, 1, 6, SH[0]);
    for (const x of [49, 52, 55]) R(x, 34 - (x - 49) / 3, 1, 6, SH[0]);
    E(cx, 14, 21, 8, CAP[1]); R(cx - 21, 14, 42, 5, CAP[1]); E(cx - 6, 10, 9, 3, CAP[2]);
    R(cx - 23, 18, 46, 3, CAP[0]); R(cx - 23, 18, 46, 1, CAP[3]);
    Art.poly(g, [[cx + 2, 11], [cx + 13, 11], [cx + 9, -1]], SH[1]); Art.poly(g, [[cx + 4, 10], [cx + 11, 10], [cx + 9, 2]], SH[2]);
    R(cx - 12, 8, 8, 5, '#e6d4a0'); R(cx - 10, 10, 4, 1, CAP[0]);
    eye(k, cx - 11, 29, 2.2, p.eyes, '#1a1612');
    eye(k, cx + 11, 29, 2.2, p.eyes, '#1a1612');
    if (p.brow < -0.3) { R(cx - 16, 23, 10, 2, INK); R(cx + 6, 23, 10, 2, INK); }
    if (p.brow > 0.3) { R(cx - 15, 21, 8, 1, SH[0]); R(cx + 7, 21, 8, 1, SH[0]); }
    mouth(k, cx, 42, p.mouth, 2, true);
    if (p.mouth === 'smile' || p.mouth === 'grin') for (let i = -3; i <= 3; i++) R(cx + i * 2, 45, 1, 2, '#e8e0d0');
  }
  function bustGroot(k, p) {
    const { R, P, E } = k; k.lid = BARK[2];
    const cx = 32;
    E(cx, 68, 28, 15, BARK[1]); E(cx - 10, 60, 10, 5, BARK[2]); E(cx + 14, 60, 8, 5, MOSS[1]); E(cx + 13, 59, 5, 3, MOSS[2]);
    E(cx, 34, 21, 24, BARK[1]); E(cx - 1, 33, 20, 23, BARK[2]); E(cx - 6, 22, 9, 11, BARK[3]); E(cx - 8, 16, 3, 4, BARK[4]);
    for (const [x, a, b] of [[-15, 18, 30], [-10, 12, 36], [10, 14, 34], [15, 20, 26], [0, 50, 8]]) R(cx + x, a, 1, b, BARK[0]);
    E(cx + 12, 46, 4, 3, BARK[0]); E(cx + 12, 46, 2, 1.5, BARK[4]);
    E(cx, 12, 22, 8, MOSS[0]); E(cx, 11, 21, 7, MOSS[1]);
    for (let i = 0; i < 9; i++) E(12 + i * 5, 6 + (i % 2) * 3, 4, 3, MOSS[i % 2 ? 1 : 2]);
    for (const [x, y, col] of [[18, 8, PETAL[0]], [30, 4, PETAL[1]], [42, 7, PETAL[2]], [50, 12, PETAL[3]], [12, 14, PETAL[1]]]) {
      for (const [dx, dy] of [[-2, 0], [2, 0], [0, -2], [0, 2]]) E(x + dx, y + dy, 1.5, 1.5, col);
      E(x, y, 1.1, 1.1, '#b88a3a');
    }
    R(38, 0, 1, 5, MOSS[0]); E(36, 1, 2, 1, MOSS[3]); E(41, 2, 2, 1, MOSS[3]);
    R(cx - 17, 24 - Math.max(0, p.brow) * 2, 14, 3, BARK[0]); R(cx + 3, 24 - Math.max(0, p.brow) * 2, 14, 3, BARK[0]);
    eye(k, cx - 10, 31, 2.3, p.eyes, '#4a7a3a', '#d8d0bc');
    eye(k, cx + 10, 31, 2.3, p.eyes, '#4a7a3a', '#d8d0bc');
    R(cx - 3, 37, 5, 4, BARK[1]); R(cx - 2, 37, 2, 1, BARK[3]);
    mouth(k, cx, 45, p.mouth, 2, false);
    void P;
  }
  function bustKirk(k, p) {
    const { R, P, E } = k;
    const cx = 32;
    E(cx, 68, 30, 14, SHIRT[1]); E(cx - 12, 60, 10, 4, SHIRT[2]); R(cx - 6, 50, 12, 4, STEEL[2]);
    R(cx - 12, 57, 3, 5, INK); R(cx - 7, 57, 6, 2, '#a8403a'); R(cx - 5, 56, 2, 1, '#a8403a'); R(cx - 2, 56, 2, 1, '#a8403a'); R(cx - 6, 59, 4, 1, '#a8403a'); R(cx - 5, 60, 2, 1, '#a8403a');
    for (const [i, ch] of ['K', 'I', 'R', 'K'].entries()) Font.draw(k.g, ch, cx + 1 + i * 6, 56, { scale: 1, color: NAVY[1] });
    // the head
    R(cx - 21, 12, 42, 36, STEEL[1]); R(cx - 19, 10, 38, 40, STEEL[1]);
    R(cx - 19, 12, 38, 35, STEEL[2]); R(cx - 19, 12, 38, 4, STEEL[3]); R(cx - 17, 14, 12, 2, STEEL[4]);
    R(cx - 25, 24, 4, 12, STEEL[2]); R(cx + 21, 24, 4, 12, STEEL[2]); R(cx - 24, 26, 2, 2, STEEL[4]); R(cx + 22, 26, 2, 2, STEEL[4]);
    R(cx - 16, 20, 32, 22, '#121c20'); R(cx - 16, 20, 32, 2, '#243238'); R(cx + 12, 22, 2, 6, '#1e2a30');
    for (const [x, y] of [[-18, 14], [16, 14], [-18, 44], [16, 44]]) R(cx + x, y, 2, 2, STEEL[0]);
    R(cx - 21, 6, 42, 8, HAIR[1]); R(cx - 21, 6, 42, 2, HAIR[2]); R(cx - 21, 14, 5, 14, HAIR[1]); R(cx + 16, 14, 5, 14, HAIR[1]);
    for (const x of [-16, -9, -2, 6, 12]) R(cx + x, 14, 4, 2, HAIR[0]);
    R(cx + 17, 0, 2, 6, STEEL[3]); E(cx + 18, 1, 2.2, 2.2, '#e8b060');
    const ek = p.eyes;
    for (const ex of [-10, 4]) {
      if (ek === 'happy') { R(ex + cx, 27, 6, 2, LED); R(ex + cx - 2, 29, 2, 2, LED); R(ex + cx + 6, 29, 2, 2, LED); }
      else if (ek === 'shut' || ek === 'narrow') R(ex + cx - 1, 29, 8, 2, LED);
      else if (ek === 'wide') R(ex + cx - 1, 25, 8, 8, LED);
      else { R(ex + cx, 26, 6, 6, LED); R(ex + cx + 1, 27, 2, 2, '#d8fff4'); }
    }
    if (p.brow < -0.3) { R(cx - 12, 23, 8, 1, LED); R(cx + 4, 23, 8, 1, LED); }
    const mk = p.mouth;
    if (mk === 'grin' || mk === 'open') { R(cx - 7, 35, 14, 4, LED); R(cx - 5, 37, 10, 1, '#121c20'); }
    else if (mk === 'o') R(cx - 2, 35, 4, 4, LED);
    else if (mk === 'frown') { R(cx - 6, 37, 12, 2, LED); R(cx - 8, 39, 2, 2, LED); R(cx + 6, 39, 2, 2, LED); }
    else if (mk === 'wobble') for (let i = -6; i < 6; i += 2) R(cx + i, 36 + (i / 2 & 1), 2, 2, LED);
    else { R(cx - 6, 37, 12, 2, LED); R(cx - 8, 35, 2, 2, LED); R(cx + 6, 35, 2, 2, LED); }
    void P;
  }
  const has = (key) => key === 'shaz' || key === 'groot' || key === 'clark' || key === 'villager:clark';
  return { shaz, groot, kirk, bust: (key, ...a) => bust(key === 'villager:clark' ? 'clark' : key, ...a), has };
})();
