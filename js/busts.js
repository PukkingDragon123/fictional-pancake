// ---- Busts: proper 64x64 dialogue portraits for Shaz and Groot ----------------------------
// Shaz is a friendly bull shark in the Wombat Mart cap and a navy suit with a
// red tie; Groot is bark and moss with a crown of flowers and kind green eyes.
// Both change face with the mood the dialogue asks for, blink, and talk.
const Busts = (() => {
  const cache = new Map();
  const INK = '#1a1420';
  const EYES = {
    talk: 'open', idle: 'open', happy: 'happy', laugh: 'happy', proud: 'happy', think: 'side', worry: 'wide', sad: 'sad',
    cross: 'cross', shock: 'wide', sly: 'half', tired: 'shut', curious: 'wide', surprise: 'wide', sleepy: 'shut',
  };
  const MOUTHS = {
    talk: 'open', idle: 'smile', happy: 'grin', laugh: 'grin', proud: 'grin', think: 'flat', worry: 'wobble', sad: 'frown',
    cross: 'frown', shock: 'o', sly: 'smirk', tired: 'flat', curious: 'o', surprise: 'o', sleepy: 'flat',
  };
  function kit(g) {
    const R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
    const P = (x, y, c) => R(x, y, 1, 1, c);
    const E = (x, y, rx, ry, c) => Art.ell(g, x, y, rx, ry, c);
    return { R, P, E };
  }
  // a big round cartoon eye; iris colours from the caller
  function eye(k, x, y, kind, iris) {
    const { R, P, E } = k;
    if (kind === 'happy') { for (let i = 0; i < 9; i++) { const d = Math.abs(i - 4); R(x + i, y + 2 + Math.round(d * 0.8), 1, 2, INK); } return; }
    if (kind === 'shut') { R(x, y + 5, 9, 2, INK); return; }
    E(x + 4.5, y + 4.5, 5, 5.5, INK);
    E(x + 4.5, y + 4.5, 4.2, 4.7, '#ffffff');
    const ox = kind === 'side' ? 1.5 : 0, r = kind === 'wide' ? 2.4 : 3.2;
    E(x + 4.5 + ox, y + 5, r, r + 0.4, iris[0]); E(x + 4.5 + ox, y + 5.5, r * 0.7, r * 0.7, iris[1]);
    R(x + 3 + ox, y + 2, 2, 2, '#ffffff'); P(x + 6 + ox, y + 7, '#ffffff');
    if (kind === 'half') R(x - 1, y - 1, 11, 5, k.lid);
    if (kind === 'cross') { for (let i = 0; i < 9; i++) R(x + i, y - 1 + Math.round(i * 0.35), 1, 2, INK); }
    if (kind === 'sad') { for (let i = 0; i < 9; i++) R(x + i, y + 1 - Math.round(i * 0.3), 1, 2, INK); }
  }
  function mouth(k, cx, y, kind, teeth) {
    const { R, P } = k;
    switch (kind) {
      case 'grin':
        R(cx - 8, y, 16, 5, INK); R(cx - 7, y + 1, 14, 3, '#9a2a3a');
        if (teeth) for (let i = 0; i < 7; i++) { R(cx - 7 + i * 2, y + 1, 1, 2, '#ffffff'); }
        else R(cx - 7, y + 1, 14, 1, '#ffffff');
        break;
      case 'open': R(cx - 4, y, 8, 5, INK); R(cx - 3, y + 1, 6, 3, '#9a2a3a'); R(cx - 2, y + 3, 4, 1, '#ff8a9a');
        if (teeth) for (let i = 0; i < 3; i++) R(cx - 3 + i * 2, y + 1, 1, 1, '#ffffff');
        break;
      case 'o': R(cx - 2, y - 1, 5, 6, INK); R(cx - 1, y, 3, 4, '#9a2a3a'); break;
      case 'frown': R(cx - 5, y + 2, 10, 1, INK); P(cx - 6, y + 3, INK); P(cx + 5, y + 3, INK); break;
      case 'wobble': for (let i = -5; i <= 5; i++) P(cx + i, y + 2 + ((i + 10) % 2), INK); break;
      case 'flat': R(cx - 4, y + 2, 8, 1, INK); break;
      case 'smirk': R(cx - 4, y + 2, 8, 1, INK); R(cx + 4, y + 1, 2, 1, INK); break;
      default: R(cx - 5, y + 2, 10, 1, INK); P(cx - 6, y + 1, INK); P(cx + 5, y + 1, INK);
        if (teeth) for (let i = 0; i < 4; i++) P(cx - 3 + i * 2, y + 3, '#ffffff');
    }
  }

  // ---- Shaz ---------------------------------------------------------------------------------------
  const SH = ['#2e4a6a', '#4a6e94', '#6a92ba', '#9ab8d8'], BELLY = ['#d8dce8', '#f4f6fa'];
  const CAP = ['#1e5a2e', '#2e8a44', '#4ab060'], SUIT = ['#141c3a', '#22305a', '#34467a'];
  function shaz(mood, t, talking) {
    const blink = (t % 3.8) > 3.64, open = talking && Math.floor(t * 9) % 2 === 0;
    const key = `s:${mood}:${blink ? 1 : 0}:${open ? 1 : 0}`;
    let c = cache.get(key); if (c) return c;
    const o = Art.cv(64, 64), k = kit(o.g); c = o.c; k.lid = SH[1];
    const { R, P, E } = k;
    // the suit, the white shirt collar and the red tie
    E(32, 66, 29, 14, SUIT[1]); E(22, 58, 8, 4, SUIT[2]);
    Art.poly(o.g, [[26, 52], [38, 52], [32, 64]], '#f4f6fa');
    Art.poly(o.g, [[30, 54], [34, 54], [35, 64], [29, 64]], '#c8302a'); R(30, 53, 4, 3, '#e84a3a');
    R(18, 60, 6, 2, '#e8c050');                                                     // the name badge
    // the head: a big round shark head, pale underneath
    E(32, 32, 25, 23, SH[1]); E(32, 31, 24, 22, SH[2]); E(24, 20, 10, 6, SH[3]);
    E(32, 44, 18, 11, BELLY[0]); E(32, 43, 17, 10, BELLY[1]);
    for (const x of [9, 12, 15]) R(x, 36 + (x - 9) / 3, 1, 5, SH[0]);              // the gills
    for (const x of [49, 52, 55]) R(x, 38 - (x - 49) / 3, 1, 5, SH[0]);
    // the cap, with the dorsal fin through a hole cut in the top
    E(32, 14, 21, 9, CAP[1]); R(11, 14, 42, 5, CAP[1]); E(26, 10, 10, 4, CAP[2]);
    R(9, 18, 46, 3, CAP[0]); R(30, 5, 12, 12, CAP[0]);
    Art.poly(o.g, [[33, 12], [44, 12], [40, -1]], SH[1]); Art.poly(o.g, [[35, 11], [42, 11], [40, 2]], SH[2]);
    R(22, 9, 9, 6, '#fff4d0'); R(24, 11, 5, 2, CAP[0]);                              // the W on the badge
    // face
    const ek = blink ? 'shut' : EYES[mood] || 'open', mk = open ? 'open' : MOUTHS[mood] || 'smile';
    eye(k, 16, 25, ek, ['#2a2a3a', '#0a0a14']);
    eye(k, 39, 25, ek, ['#2a2a3a', '#0a0a14']);
    R(13, 37, 6, 2, '#f08aa8'); R(45, 37, 6, 2, '#f08aa8');
    mouth(k, 32, 42, mk, true);
    Art.outline(c, INK, 1);
    cache.set(key, c);
    return c;
  }

  // ---- Groot --------------------------------------------------------------------------------------
  const BARK = ['#3a2412', '#5a3a1e', '#7a5430', '#9a7048'], MOSS = ['#2e5a22', '#4a8a32', '#7ab850'];
  function groot(mood, t, talking) {
    const blink = (t % 4.2) > 4.05, open = talking && Math.floor(t * 8) % 2 === 0;
    const key = `g:${mood}:${blink ? 1 : 0}:${open ? 1 : 0}`;
    let c = cache.get(key); if (c) return c;
    const o = Art.cv(64, 64), k = kit(o.g); c = o.c; k.lid = BARK[2];
    const { R, P, E } = k;
    // shoulders: bark with moss down one side
    E(32, 68, 28, 15, BARK[1]); E(20, 60, 9, 5, BARK[2]); E(46, 60, 8, 5, MOSS[1]); E(45, 59, 5, 3, MOSS[2]);
    // the head: a rounded stump of a head, taller than wide, with the grain running down it
    E(32, 34, 21, 24, BARK[1]); E(32, 33, 20, 23, BARK[2]); E(25, 22, 8, 10, BARK[3]);
    for (const [x, y0, len] of [[17, 18, 30], [22, 12, 38], [42, 14, 34], [47, 20, 26], [32, 50, 8]]) R(x, y0, 1, len, BARK[1]);
    E(44, 44, 4, 3, BARK[1]); E(44, 44, 2, 1.5, BARK[0]);                           // a knot
    // the crown: leaves, moss and flowers
    E(32, 12, 22, 8, MOSS[0]); E(32, 11, 21, 7, MOSS[1]);
    for (let i = 0; i < 9; i++) { const x = 12 + i * 5, y = 6 + (i % 2) * 3; E(x, y, 4, 3, MOSS[i % 2 ? 1 : 2]); }
    for (const [x, y, col] of [[18, 8, '#ff8ab0'], [30, 4, '#ffd84a'], [42, 7, '#ffffff'], [50, 12, '#ff8ab0'], [12, 14, '#ffd84a']]) {
      for (const [dx, dy] of [[-2, 0], [2, 0], [0, -2], [0, 2]]) E(x + dx, y + dy, 1.6, 1.6, col);
      E(x, y, 1.2, 1.2, '#f8a020');
    }
    // a sprout on top, because he is still growing
    R(38, 0, 1, 5, MOSS[0]); E(36, 1, 2, 1, MOSS[2]); E(41, 2, 2, 1, MOSS[2]);
    // face: kind green eyes, a mossy brow, a wide wooden smile
    const ek = blink ? 'shut' : EYES[mood] || 'open', mk = open ? 'open' : MOUTHS[mood] || 'smile';
    R(15, 23, 14, 2, BARK[0]); R(35, 23, 14, 2, BARK[0]);                               // the brow ridge
    eye(k, 17, 27, ek, ['#3aa84a', '#1a5a22']);
    eye(k, 38, 27, ek, ['#3aa84a', '#1a5a22']);
    R(14, 39, 6, 2, '#c8784a'); R(44, 39, 6, 2, '#c8784a');
    mouth(k, 32, 45, mk, false);
    Art.outline(c, INK, 1);
    cache.set(key, c);
    return c;
  }
  const has = (key) => key === 'shaz' || key === 'groot';
  function get(key, mood, t, talking) { return key === 'shaz' ? shaz(mood, t, talking) : groot(mood, t, talking); }
  return { has, get, shaz, groot };
})();
