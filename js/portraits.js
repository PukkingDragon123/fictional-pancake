// ---- Portraits: big faces for the dialogue box --------------------------------
// A head-and-shoulders bust at 64x64, the way a farming game shows whoever is
// talking to you: front on, lit from the upper left, with a face for every
// mood (happy, laughing, thinking, cross, shocked, sly, worried, tired), eyes
// that blink, and a mouth that moves while the words are coming out.
//
// One painter does everybody. A spec says what they look like: skin, hair and
// how it is cut, what is on their head, glasses, stubble, what they wear.
const Portraits = (() => {
  const S = 64;
  const cache = new Map();

  // ---- who looks like what --------------------------------------------------
  const SPECS = {
    // Jim: heavyset, messy ginger-blond hair sticking up over a red headband,
    // thick black glasses, ginger stubble, a grey check fleece with a big
    // cream sherpa collar over a pink shirt.
    jim: {
      skin: ['#ffdcbc', '#f4c29c', '#d9976e', '#b8734e'], blush: '#f2a08c',
      hair: ['#ffd27a', '#f0a23a', '#c8741e', '#8a4a14'], cut: 'spiky',
      band: ['#ff7a66', '#dc3a2c', '#a02418'], glasses: '#1e1814', stubble: '#c47a3c',
      brow: '#b8661e', wide: 1.12, doubleChin: true,
      top: 'fleece', cloth: ['#b4b6be', '#92949c', '#74767e', '#5a5c64'], shirt: ['#ffa6bc', '#e57e9c', '#b8566e'],
      collar: ['#fffaf0', '#f0e6d2', '#d4c6aa'],
    },
  };
  // Captain Clark: weathered, a huge white beard, a white peaked cap with a
  // gold anchor, a navy double-breasted coat with brass buttons
  SPECS.clark = {
    skin: ['#ffd2b0', '#f0b48c', '#d08a66', '#a8674a'], blush: '#f08c7c',
    hair: ['#ffffff', '#ecebe4', '#c8c6bc', '#8a887e'], cut: 'short', hat: 'captain', beard: true,
    brow: '#d8d6cc', wide: 1.06,
    top: 'coat', cloth: ['#2c4c9c', '#1c3470', '#132554', '#0a1638'], shirt: null, collar: null,
  };
  // the villagers are drawn from their own kits
  function specFor(key) {
    if (SPECS[key]) return SPECS[key];
    const K = typeof Sprites !== 'undefined' && Sprites.VILLAGERS ? Sprites.VILLAGERS[key] : null;
    if (!K) return null;
    const sk = K.skin, hr = K.hair, sh = K.shirt;
    const spec = {
      skin: [U.shade(sk, 0.14), sk, U.shade(sk, -0.14), U.shade(sk, -0.28)], blush: U.mix(sk, '#f08080', 0.35),
      hair: [U.shade(hr, 0.22), hr, U.shade(hr, -0.16), U.shade(hr, -0.32)],
      cut: 'short',
      hat: K.hat, brow: U.shade(hr, -0.2), wide: 1,
      top: 'shirt', cloth: [U.shade(sh, 0.18), sh, U.shade(sh, -0.14), U.shade(sh, -0.28)], shirt: null,
      collar: null, glasses: null, stubble: null,
    };
    return spec;
  }

  // ---- the faces -----------------------------------------------------------------
  // brows as [inner lift, outer lift] each side; eyes; mouth
  const FACES = {
    talk:  { bl: [0, 0], br: [0, 0], eyes: 'open', mouth: 'neutral' },
    idle:  { bl: [0, 0], br: [0, 0], eyes: 'open', mouth: 'smile' },
    happy: { bl: [1, 1], br: [1, 1], eyes: 'happy', mouth: 'grin' },
    laugh: { bl: [2, 1], br: [2, 1], eyes: 'closed', mouth: 'laugh' },
    proud: { bl: [2, 2], br: [2, 2], eyes: 'open', mouth: 'grin' },
    think: { bl: [3, 2], br: [0, -1], eyes: 'up', mouth: 'side' },
    worry: { bl: [3, -1], br: [3, -1], eyes: 'open', mouth: 'frown' },
    sad:   { bl: [3, -1], br: [3, -1], eyes: 'half', mouth: 'frown' },
    cross: { bl: [-2, 1], br: [-2, 1], eyes: 'half', mouth: 'frown' },
    shock: { bl: [3, 3], br: [3, 3], eyes: 'wide', mouth: 'o' },
    sly:   { bl: [0, 0], br: [-2, 1], eyes: 'half', mouth: 'smirk' },
    tired: { bl: [0, -1], br: [0, -1], eyes: 'half', mouth: 'flat' },
  };
  const faceOf = (m) => FACES[m] || FACES.talk;

  // ---- drawing helpers --------------------------------------------------------------
  function painter(g) {
    const R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
    const P = (x, y, c) => R(x, y, 1, 1, c);
    // a filled ellipse by rows, so every edge is whole pixels
    const E = (cx, cy, rx, ry, c) => {
      g.fillStyle = c;
      for (let y = Math.ceil(cy - ry); y <= Math.floor(cy + ry); y++) {
        const t = (y + 0.5 - cy) / ry;
        if (Math.abs(t) > 1) continue;
        const w = rx * Math.sqrt(1 - t * t);
        g.fillRect(Math.round(cx - w), y, Math.round(cx + w) - Math.round(cx - w), 1);
      }
    };
    return { R, P, E };
  }

  // ---- the bust -------------------------------------------------------------------------
  function bust(spec, mood, blink, talk) {
    const { c, g } = Art.cv(S, S);
    const { R, P, E } = painter(g);
    const F = faceOf(mood);
    const sk = spec.skin, hr = spec.hair, W = spec.wide || 1;
    const OUT = '#3a2830';
    const cx = 32;

    // shoulders first, everything else sits on them
    const cl = spec.cloth;
    E(cx, 76, 33 * W, 25, OUT);
    E(cx, 76, 32 * W, 24, cl[1]);
    E(cx - 10, 70, 16 * W, 12, cl[0]);
    E(cx + 18, 78, 14, 18, cl[2]);
    if (spec.top === 'coat') {                             // a double-breasted coat: lapels, two rows of brass
      g.fillStyle = cl[3];
      g.beginPath(); g.moveTo(cx - 11, 50); g.lineTo(cx, S); g.lineTo(cx + 11, 50); g.lineTo(cx + 6, 50); g.lineTo(cx, 58); g.lineTo(cx - 6, 50); g.fill();
      R(cx - 5, 50, 10, 8, '#f4f2ea');
      for (const [dx, y] of [[-8, 55], [8, 55], [-9, 61], [9, 61]]) { E(cx + dx, y, 1.8, 1.8, '#a87008'); P(cx + dx - 1, y - 1, '#ffe070'); }
      for (let x = 6; x < 20; x += 3) { P(cx - 22 + x, 54, '#e0a010'); P(cx + 22 - x, 54, '#e0a010'); }   // braid on the shoulders
    }
    if (spec.top === 'fleece') {                           // the check of the fleece
      for (let y = 50; y < S; y++) for (let x = 0; x < S; x++) {
        const d = g.getImageData(x, y, 1, 1).data;
        if (d[3] === 0 || (d[0] === 0x3a && d[1] === 0x28)) continue;
        if (x % 6 === 0 || y % 6 === 2) P(x, y, (x + y) % 12 < 6 ? cl[2] : cl[3]);
        else if ((x % 6 === 3) && (y % 6 === 5)) P(x, y, cl[0]);
      }
    }
    // the shirt showing at the neck
    if (spec.shirt) {
      g.fillStyle = spec.shirt[1];
      g.beginPath(); g.moveTo(cx - 10, 50); g.lineTo(cx + 10, 50); g.lineTo(cx + 5, S); g.lineTo(cx - 5, S); g.fill();
      R(cx - 9, 51, 3, 3, spec.shirt[0]);
      for (let y = 54; y < S; y += 3) P(cx, y, spec.shirt[2]);               // buttons
    }
    // the neck, shaded under the chin
    R(cx - 7 * W, 42, 14 * W, 12, sk[2]);
    R(cx - 7 * W, 42, 5, 12, sk[1]);
    // the collar: a thick cream sherpa roll round the neck and down the front
    if (spec.collar) {
      const co = spec.collar;
      const bumps = [[-14, 51, 4], [-9, 50, 4], [9, 50, 4], [14, 51, 4], [-17, 55, 4], [17, 55, 4], [-11, 56, 4], [11, 56, 4], [-9, 61, 4], [9, 61, 4], [-14, 60, 3], [14, 60, 3]];
      for (const [dx, y, r] of bumps) E(cx + dx * W, y, r + 1, r, OUT);
      for (const [dx, y, r] of bumps) E(cx + dx * W, y, r, r - 1, co[1]);
      for (const [dx, y, r] of bumps) E(cx + dx * W - 1, y - 1, r - 2, r - 3, co[0]);
      for (const [dx, y] of bumps) { P(cx + dx * W + 2, y + 2, co[2]); P(cx + dx * W - 2, y + 1, co[2]); }
    } else {
      // a plain collar on a shirt
      g.fillStyle = cl[3];
      g.beginPath(); g.moveTo(cx - 8, 47); g.lineTo(cx, 55); g.lineTo(cx + 8, 47); g.lineTo(cx + 10, 50); g.lineTo(cx, 58); g.lineTo(cx - 10, 50); g.fill();
      g.fillStyle = cl[0];
      g.beginPath(); g.moveTo(cx - 8, 47); g.lineTo(cx, 54); g.lineTo(cx - 3, 56); g.lineTo(cx - 10, 49); g.fill();
    }

    // hair that falls behind the head
    if (spec.cut === 'long' || spec.cut === 'bob') {
      E(cx, 32, 18 * W, spec.cut === 'long' ? 20 : 16, OUT);
      E(cx, 32, 17 * W, spec.cut === 'long' ? 19 : 15, hr[2]);
    }
    if (spec.cut === 'bun') { E(cx, 8, 7, 6, OUT); E(cx, 8, 6, 5, hr[1]); E(cx - 2, 6, 3, 2, hr[0]); }

    // ears
    for (const s2 of [-1, 1]) {
      E(cx + s2 * 17.5 * W, 30, 3.5, 5, OUT);
      E(cx + s2 * 17.5 * W, 30, 2.6, 4, sk[s2 < 0 ? 1 : 2]);
      P(cx + s2 * 17.5 * W, 30, sk[3]); P(cx + s2 * 17.5 * W, 31, sk[3]);
    }
    // the head: a round face and a heavier jaw, outlined, lit from the left
    E(cx, 26, 17 * W + 1, 18, OUT);
    E(cx, 35, 16 * W + 1, 12, OUT);
    E(cx, 26, 17 * W, 17, sk[1]);
    E(cx, 35, 16 * W, 11, sk[1]);
    E(cx + 7, 30, 11 * W, 16, sk[2]);                   // the shaded side
    E(cx - 2, 28, 14 * W, 16, sk[1]);
    E(cx - 6, 21, 7, 5, sk[0]);                         // the lit forehead and cheek
    E(cx - 10, 34, 3, 2, sk[0]);
    E(cx + 1, 45, 9 * W, 2, sk[2]);                     // under the chin
    // stubble along the jaw and round the mouth
    if (spec.stubble) {
      for (let y = 34; y < 47; y++) for (let x = 12; x < 52; x++) {
        const inJaw = ((x - cx) / (16 * W)) ** 2 + ((y - 35) / 11) ** 2 < 0.94;
        if (!inJaw) continue;
        if (y < 39 && Math.abs(x - cx) < 10) continue;
        if (y >= 39 && y <= 44 && Math.abs(x - cx) < 6) continue;
        if ((x * 3 + y * 5) % 4 === 0 || ((x + y) % 5 === 0 && y > 40)) P(x, y, spec.stubble);
      }
    }
    // a big white sea-captain's beard, from ear to ear, with the moustache over it
    if (spec.beard) {
      const bh = spec.hair;
      E(cx, 45, 17 * W, 10, OUT); E(cx, 45, 16 * W, 9, bh[1]);
      for (const s2 of [-1, 1]) { E(cx + s2 * 14 * W, 37, 3, 7, OUT); E(cx + s2 * 14 * W, 37, 2, 6, bh[1]); }   // sideburns
      E(cx - 4, 42, 9, 5, bh[0]);
      // strands combed down through it, darker toward the tips
      for (let x = cx - 13; x <= cx + 13; x += 3) { const d = Math.abs(x - cx); P(x, 47 + (d < 8 ? 2 : 0), bh[2]); P(x, 48 + (d < 8 ? 2 : 0), bh[2]); P(x + 1, 45, bh[2]); }
      for (let i = 0; i < 14; i++) P(cx - 12 + (i * 5) % 24, 42 + (i * 3) % 10, bh[2]);
      for (const s2 of [-1, 1]) { E(cx + s2 * 5, 39, 6, 2.5, OUT); E(cx + s2 * 5, 39, 5, 1.8, bh[0]); }   // moustache
    }
    // a double chin, stubbled, tucked under the jaw
    if (spec.doubleChin) {
      E(cx, 47, 12 * W, 4, OUT); E(cx, 46.5, 11 * W, 3, sk[2]); E(cx - 1, 46, 10 * W, 2, sk[1]);
      for (let i = 0; i < 9; i++) P(cx - 9 + i * 2, 46 + (i % 2), spec.stubble || sk[3]);
    }
    // cheeks
    if (F.mouth === 'grin' || F.mouth === 'laugh' || F.eyes === 'happy') { E(cx - 11, 36, 3, 1.5, spec.blush); E(cx + 11, 36, 3, 1.5, spec.blush); }

    // ---- the hair on top ------------------------------------------------------------
    E(cx, 14, 18 * W + 1, 9, OUT);
    E(cx, 14, 18 * W, 8, hr[1]);
    E(cx - 5, 11, 10, 4, hr[0]);
    for (let x = cx - 18; x <= cx + 18; x++) P(x, 21 - Math.round(Math.abs(x - cx) * 0.12), hr[2]);
    if (spec.cut === 'spiky') {
      // tufts sticking up every which way
      const tufts = [[-16, 8, -5], [-11, 3, -3], [-5, 0, -1], [1, -1, 1], [7, 1, 2], [12, 4, 3], [17, 9, 5]];
      for (const [dx, ty, lean] of tufts) {
        const bx = cx + dx * W;
        g.fillStyle = OUT;
        g.beginPath(); g.moveTo(bx - 4, 14); g.lineTo(bx + lean, ty - 1); g.lineTo(bx + 4, 14); g.fill();
        g.fillStyle = hr[1];
        g.beginPath(); g.moveTo(bx - 3, 14); g.lineTo(bx + lean, ty + 1); g.lineTo(bx + 3, 14); g.fill();
        P(bx + lean * 0.5 - 1, ty + 4, hr[0]); P(bx + lean * 0.5 - 1, ty + 5, hr[0]);
      }
      // a few strands falling over the band onto the forehead
      for (const [dx, len] of [[-7, 4], [-2, 5], [4, 4], [9, 3]]) for (let i = 0; i < len; i++) P(cx + dx * W + (i > 2 ? 1 : 0), 18 + i, i % 2 ? hr[2] : hr[1]);
      // sides, over the ears
      for (const s2 of [-1, 1]) { E(cx + s2 * 16 * W, 20, 3, 6, OUT); E(cx + s2 * 16 * W, 20, 2, 5, hr[2]); }
    } else if (spec.cut === 'bob' || spec.cut === 'long') {
      for (const s2 of [-1, 1]) { E(cx + s2 * 14 * W, 28, 4, 12, OUT); E(cx + s2 * 14 * W, 28, 3, 11, hr[1]); }
      E(cx - 5, 18, 10, 5, hr[1]); E(cx - 7, 16, 5, 2, hr[0]);
    } else {
      // short: a fringe swept to one side
      g.fillStyle = hr[1];
      g.beginPath(); g.moveTo(cx - 15, 20); g.lineTo(cx + 6, 17); g.lineTo(cx - 2, 23); g.lineTo(cx - 13, 24); g.fill();
      for (const s2 of [-1, 1]) { E(cx + s2 * 14 * W, 22, 2.5, 5, OUT); E(cx + s2 * 14 * W, 22, 1.8, 4, hr[2]); }
    }
    // the headband, curving round the forehead
    if (spec.band) {
      for (let x = cx - 18 * W; x <= cx + 18 * W; x++) {
        const y = 13 + Math.round(((x - cx) / (18 * W)) ** 2 * 3);
        R(x, y - 1, 1, 6, OUT);
        R(x, y, 1, 4, spec.band[1]);
        P(x, y, spec.band[0]);
        P(x, y + 3, spec.band[2]);
      }
      // the knot and its tails poking out on his left
      E(cx + 18 * W, 16, 3, 3, OUT); E(cx + 18 * W, 16, 2, 2, spec.band[1]);
      R(cx + 19 * W, 17, 4, 2, spec.band[2]); R(cx + 20 * W, 19, 3, 2, spec.band[1]);
    }
    // hats for the villagers
    if (spec.hat === 'cap') { E(cx, 14, 16, 7, OUT); E(cx, 14, 15, 6, spec.cloth[2]); R(cx - 18, 18, 22, 3, OUT); R(cx - 17, 18, 20, 2, spec.cloth[3]); E(cx - 4, 11, 6, 2, spec.cloth[1]); }
    if (spec.hat === 'wide') { E(cx, 15, 25, 4, OUT); E(cx, 15, 24, 3, '#c8a060'); E(cx, 10, 13, 7, OUT); E(cx, 10, 12, 6, '#d8b070'); R(cx - 12, 13, 24, 2, '#8a5a2a'); }
    if (spec.hat === 'kerchief') { E(cx, 13, 16, 7, OUT); E(cx, 13, 15, 6, '#d84a3a'); for (let i = 0; i < 8; i++) P(cx - 12 + i * 3, 12 + (i % 2), '#fff0e0'); }
    if (spec.hat === 'bucket') { E(cx, 15, 20, 4, OUT); E(cx, 15, 19, 3, '#6a8a5a'); E(cx, 10, 13, 7, OUT); E(cx, 10, 12, 6, '#7a9a6a'); }
    if (spec.hat === 'captain') {
      E(cx, 11, 21 * W, 7, OUT); E(cx, 11, 20 * W, 6, '#ffffff'); E(cx - 6, 9, 10, 3, '#ffffff');
      E(cx + 6, 12, 12, 3, '#e4e4ec');
      R(cx - 18 * W, 13, 36 * W, 6, OUT); R(cx - 17 * W, 14, 34 * W, 4, '#1c2a5a'); R(cx - 17 * W, 14, 34 * W, 1, '#3a4a8a');
      E(cx, 16, 3, 3, '#e0a010'); P(cx - 1, 15, '#fff0a0'); R(cx - 1, 17, 3, 1, '#a87008');   // the anchor badge
      R(cx - 16 * W, 19, 32 * W, 3, OUT); R(cx - 15 * W, 19, 30 * W, 2, '#141418'); R(cx - 12, 19, 14, 1, '#4a4a58');
    }
    if (spec.hat === 'veil') { E(cx, 12, 17, 7, OUT); E(cx, 12, 16, 6, '#f2ece0'); for (let x = cx - 18; x <= cx + 18; x += 2) R(x, 16, 1, 10, 'rgba(242,236,224,0.55)'); }

    // ---- the face ---------------------------------------------------------------------
    const ey = 28, ex = 8 * W;
    // brows
    for (const [s2, br] of [[-1, F.bl], [1, F.br]]) {
      const inner = cx + s2 * 3, outer = cx + s2 * (ex + 5);
      for (let i = 0; i <= 6; i++) {
        const x = Math.round(U.lerp(inner, outer, i / 6));
        const y = Math.round(ey - 8 - U.lerp(br[0], br[1], i / 6) * 0.8);
        R(x, y, 1, 2, spec.brow);
      }
    }
    // eyes
    for (const s2 of [-1, 1]) {
      const x = Math.round(cx + s2 * ex), look = F.eyes === 'up' ? -1 : 0;
      const shut = blink || F.eyes === 'closed';
      if (shut) { R(x - 2, ey + 1, 5, 1, '#2a1a18'); P(x - 3, ey, '#2a1a18'); P(x + 3, ey, '#2a1a18'); }
      else if (F.eyes === 'happy') { P(x - 2, ey + 1, '#2a1a18'); R(x - 1, ey, 3, 1, '#2a1a18'); P(x + 2, ey + 1, '#2a1a18'); }
      else if (F.eyes === 'half') { R(x - 2, ey, 5, 1, '#2a1a18'); R(x - 1, ey + 1, 3, 1, '#2a1a18'); R(x - 2, ey - 1, 5, 1, sk[2]); }
      else if (F.eyes === 'wide') { R(x - 2, ey - 2, 5, 5, '#ffffff'); R(x - 1, ey - 1, 3, 3, '#2a1a18'); P(x, ey - 1, '#ffffff'); }
      else { R(x - 2, ey - 1 + look, 4, 4, '#ffffff'); R(x - 1, ey - 1 + look, 2, 3, '#2a1a18'); P(x - 1, ey - 1 + look, '#ffffff'); R(x - 2, ey - 2, 5, 1, sk[3]); }
    }
    // glasses: thick black frames, a glint across each lens
    if (spec.glasses) {
      const gl = spec.glasses;
      for (const s2 of [-1, 1]) {
        const x0 = Math.round(cx + s2 * ex - 6), y0 = ey - 5;
        R(x0, y0, 13, 2, gl); R(x0, y0 + 9, 13, 2, gl); R(x0, y0, 2, 11, gl); R(x0 + 11, y0, 2, 11, gl);
        g.fillStyle = 'rgba(210,236,255,0.28)'; g.fillRect(x0 + 2, y0 + 2, 9, 7);
        P(x0 + 3, y0 + 3, 'rgba(255,255,255,0.9)'); P(x0 + 4, y0 + 3, 'rgba(255,255,255,0.7)'); P(x0 + 3, y0 + 4, 'rgba(255,255,255,0.6)');
      }
      R(cx - 2, ey - 2, 4, 2, gl);                                  // the bridge
      for (const s2 of [-1, 1]) R(s2 < 0 ? cx - ex - 10 * W : cx + ex + 7, ey - 3, 4 * W, 2, gl);   // the arms
    }
    // nose: a little shaded button
    R(cx - 1, 34, 3, 3, sk[2]); R(cx - 2, 36, 5, 1, sk[3]); P(cx - 1, 34, sk[0]);

    // mouth
    const my = 41;
    const M = talk && F.mouth !== 'laugh' ? (F.mouth === 'frown' ? 'talkfrown' : 'talk') : F.mouth;
    const dark = '#6a2a2a', lip = '#9a4a3a', tongue = '#e0707a', teeth = '#fffaf0';
    switch (M) {
      case 'smile': R(cx - 3, my, 7, 1, lip); P(cx - 4, my - 1, lip); P(cx + 4, my - 1, lip); break;
      case 'grin': R(cx - 4, my - 1, 9, 3, dark); R(cx - 3, my - 1, 7, 1, teeth); R(cx - 2, my + 1, 5, 1, tongue); P(cx - 5, my - 2, lip); P(cx + 5, my - 2, lip); break;
      case 'laugh': R(cx - 4, my - 1, 9, 5, dark); R(cx - 3, my - 1, 7, 1, teeth); R(cx - 2, my + 2, 5, 2, tongue); P(cx - 5, my - 2, lip); P(cx + 5, my - 2, lip); break;
      case 'frown': R(cx - 3, my + 1, 7, 1, lip); P(cx - 4, my + 2, lip); P(cx + 4, my + 2, lip); break;
      case 'o': R(cx - 2, my - 1, 4, 4, dark); R(cx - 1, my + 1, 2, 1, tongue); break;
      case 'side': R(cx, my, 5, 1, lip); P(cx + 5, my - 1, lip); break;
      case 'smirk': R(cx - 2, my + 1, 6, 1, lip); P(cx + 4, my, lip); P(cx + 5, my - 1, lip); break;
      case 'flat': R(cx - 3, my, 7, 1, lip); break;
      case 'talk': R(cx - 3, my - 1, 7, 3, dark); R(cx - 2, my - 1, 5, 1, teeth); R(cx - 1, my + 1, 3, 1, tongue); break;
      case 'talkfrown': R(cx - 3, my, 7, 3, dark); R(cx - 1, my + 2, 3, 1, tongue); break;
      default: R(cx - 3, my, 7, 1, lip);
    }
    return c;
  }

  // ---- the one call everybody makes -------------------------------------------------------
  // `t` drives the blink; `talking` flaps the mouth.
  function get(key, mood, t = 0, talking = false) {
    if ((key === 'clark' || key === 'villager:clark') && typeof Kirk !== 'undefined') return Kirk.bust(mood, t, talking);
    const spec = specFor(key);
    if (!spec) return null;
    const blink = (t % 3.6) > 3.45;
    const mouth = talking && Math.floor(t * 9) % 2 === 0;
    const k = `${key}|${mood}|${blink ? 1 : 0}|${mouth ? 1 : 0}`;
    let c = cache.get(k);
    if (!c) { c = bust(spec, mood, blink, mouth); cache.set(k, c); }
    return c;
  }
  const has = (key) => !!specFor(key);
  return { get, has, FACES, SPECS };
})();
