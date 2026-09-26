// ---- Captain Kirk: the robot who runs the Ottoman Empire ------------------------------
// A tin captain: a riveted steel box of a head with a screen for a face and two
// cyan eyes on it, a proper peaked cap, and a thick brown quiff and sideburns
// sticking out from under it that nobody has ever asked about. He wears a
// T-shirt that says I <3 KIRK, because he does.
//
// Kirk.sprite(frame, pose) is the 30x46 figure (same box as the villagers);
// Kirk.bust(mood, t, talking) is the 64x64 dialogue portrait.
const Kirk = (() => {
  const cache = new Map();
  const R = (g, x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
  const P = (g, x, y, c) => R(g, x, y, 1, 1, c);
  const INK = '#1a1420';
  const STEEL = ['#2a3244', '#4a5874', '#7486a8', '#a8b8d4', '#dce6f6'];
  const HAIR = ['#4a2410', '#7a4018', '#b06428', '#e0983e'];
  const SHIRT = ['#c8c0b0', '#e8e2d6', '#fbf8f0'];
  const HEART = ['#9a1a2a', '#e03a4a', '#ff8a94'];
  const NAVY = ['#0e1634', '#1c2a5a', '#2c4288'];
  const GOLD = ['#8a5a0e', '#e0a828', '#ffe27a'];
  const EYE = ['#0a3a4a', '#2ad8f0', '#c8fcff'];
  // a 3x3 alphabet, only as much of it as the shirt needs
  const MINI = {
    K: ['101', '110', '101'], I: ['111', '010', '111'], R: ['110', '111', '101'],
  };
  const MINI5 = {                                   // 3x5, for the portrait
    K: ['101', '101', '110', '101', '101'], I: ['111', '010', '010', '010', '111'], R: ['110', '101', '110', '101', '101'],
  };
  function word(g, s, x, y, col, font = MINI) {
    for (const ch of s) {
      const rows = font[ch];
      if (rows) rows.forEach((row, j) => [...row].forEach((b, i) => { if (b === '1') P(g, x + i, y + j, col); }));
      x += 4;
    }
  }
  function heart(g, x, y, big) {
    const px = big
      ? ['01100110', '11111111', '11111111', '01111110', '00111100', '00011000']
      : ['0101', '1111', '0110'];
    px.forEach((row, j) => [...row].forEach((b, i) => { if (b === '1') P(g, x + i, y + j, j === 0 && big ? HEART[2] : HEART[1]); }));
    if (big) { P(g, x + 1, y + 1, HEART[2]); for (let i = 2; i < 6; i++) P(g, x + i, y + 5 - (i > 3 ? 1 : 0), HEART[0]); }
  }

  // ---- the figure -------------------------------------------------------------------------
  function sprite(frame, pose = 'idle') {
    const n = { idle: 6, walk: 8, talk: 6, wave: 6 }[pose] || 6;
    const f = ((frame % n) + n) % n, t = f / n, S2 = Math.sin(t * Math.PI * 2);
    const key = `k:${f}:${pose}`;
    let c = cache.get(key); if (c) return c;
    const o = Art.cv(30, 46), g = o.g; c = o.c;
    let bob = 0, step = 0, armL = 0, armR = 0, blink = 0, mouth = 0, blip = f % 3 === 0;
    switch (pose) {
      case 'idle': bob = [0, -1, -1, 0, 0, 0][f]; armL = S2 * 1.2; blink = f === 4 ? 1 : 0; break;
      case 'walk': bob = [-1, -2, -1, 0, -1, -2, -1, 0][f]; step = [2, 1, -1, -2, -2, -1, 1, 2][f]; armL = -step; armR = step; break;
      case 'talk': bob = Math.round(S2 * 0.6); armR = -2 - S2 * 2; mouth = f % 2 + 1; blink = f === 3 ? 1 : 0; break;
      case 'wave': bob = -1; armR = -9 - Math.abs(S2) * 3; mouth = 2; break;
    }
    const cx = 15, by = 45 + bob;
    // legs: steel pistons in navy trousers, and big boots
    for (const d of [-1, 1]) {
      const lx = cx + d * 3 + (d > 0 ? step : -step) * 0.6;
      R(g, lx - 2, by - 10, 4, 9, NAVY[1]); R(g, lx - 2, by - 10, 1, 9, NAVY[2]);
      R(g, lx - 3, by - 2, 6, 2, STEEL[1]); R(g, lx - 3, by - 2, 6, 1, STEEL[3]);
    }
    // arms, behind the shirt: steel tubes, a ball joint, a three-finger claw
    const arm = (d, sw) => {
      const ax = cx + d * 7, ay = by - 21;
      const hx = ax + d * 2, hy = ay + 9 + sw, ex = ax + d * 1.4, ey = ay + (hy - ay) * 0.5;
      // two steel segments with a gold elbow bolt, and a white cartoon glove
      Art.limb(g, ax, ay, ex, ey, 2, 1.7, STEEL[1]); Art.limb(g, ex, ey, hx, hy, 1.8, 1.5, STEEL[1]);
      Art.limb(g, ax - d * 0.4, ay, ex - d * 0.4, ey, 0.8, 0.7, STEEL[3]); Art.limb(g, ex - d * 0.4, ey, hx - d * 0.4, hy, 0.7, 0.6, STEEL[3]);
      P(g, ex, ey, GOLD[1]);
      Art.ell(g, hx, hy + 1.5, 2.4, 2.2, '#f4f4f0'); Art.ell(g, hx - 0.6, hy + 1, 1.2, 1, '#ffffff');
      R(g, hx - 2, hy - 0.5, 4, 1, '#c8c8d0');                                       // the glove's cuff
    };
    arm(-1, armL);
    if (pose !== 'wave') arm(1, armR);
    // the T-shirt: I <3 KIRK
    R(g, cx - 7, by - 23, 14, 13, SHIRT[1]);
    R(g, cx - 7, by - 23, 14, 1, SHIRT[2]); R(g, cx - 7, by - 12, 14, 2, SHIRT[0]);
    R(g, cx - 9, by - 23, 3, 4, SHIRT[1]); R(g, cx + 6, by - 23, 3, 4, SHIRT[1]);      // sleeves
    R(g, cx - 2, by - 23, 4, 1, STEEL[2]);                                               // the neck ring
    P(g, cx - 5, by - 20, HEART[0]); P(g, cx - 5, by - 19, HEART[0]); P(g, cx - 5, by - 18, HEART[0]);   // I
    heart(g, cx - 3, by - 20, false);
    word(g, 'KIRK', cx - 7, by - 16, NAVY[1]);
    if (pose === 'wave') {                                                                // the waving arm, up past the cap
      const ax = cx + 7, ay = by - 21;
      Art.limb(g, ax, ay, ax + 4, ay + armR, 1.8, 1.6, STEEL[1]); Art.limb(g, ax, ay, ax + 4, ay + armR, 1, 0.8, STEEL[3]);
      Art.ell(g, ax + 4, ay + armR - 1, 2, 2, STEEL[2]); P(g, ax + 3, ay + armR - 2, STEEL[4]);
    }
    // the head: a riveted box with a screen for a face
    const hx0 = cx - 7, hy0 = by - 37;
    R(g, cx - 2, hy0 + 11, 4, 3, STEEL[1]);                                             // the neck
    // hair first, so the head sits in front of the sideburns
    R(g, hx0 - 3, hy0, 4, 10, HAIR[1]); R(g, hx0 + 13, hy0, 4, 10, HAIR[1]);
    R(g, hx0 - 3, hy0 + 1, 1, 8, HAIR[2]); R(g, hx0 + 16, hy0 + 2, 1, 7, HAIR[0]);
    for (let y = hy0 + 2; y < hy0 + 10; y += 3) { P(g, hx0 - 2, y, HAIR[3]); P(g, hx0 + 14, y, HAIR[3]); }
    R(g, hx0, hy0, 14, 12, STEEL[2]);
    R(g, hx0, hy0, 14, 1, STEEL[4]); R(g, hx0, hy0, 1, 12, STEEL[3]); R(g, hx0 + 13, hy0, 1, 12, STEEL[1]); R(g, hx0, hy0 + 11, 14, 1, STEEL[0]);
    for (const [rx, ry] of [[1, 1], [12, 1], [1, 10], [12, 10]]) P(g, hx0 + rx, hy0 + ry, STEEL[0]);
    R(g, hx0 + 2, hy0 + 3, 10, 7, INK);                                                  // the screen
    R(g, hx0 + 2, hy0 + 3, 10, 1, '#2a2a3a');
    if (blink) { R(g, hx0 + 3, hy0 + 5, 3, 1, EYE[1]); R(g, hx0 + 8, hy0 + 5, 3, 1, EYE[1]); }
    else { R(g, hx0 + 4, hy0 + 4, 2, 2, EYE[1]); R(g, hx0 + 8, hy0 + 4, 2, 2, EYE[1]); P(g, hx0 + 4, hy0 + 4, EYE[2]); P(g, hx0 + 8, hy0 + 4, EYE[2]); }
    if (mouth === 2) { R(g, hx0 + 5, hy0 + 7, 4, 2, EYE[1]); R(g, hx0 + 6, hy0 + 8, 2, 1, EYE[0]); }
    else if (mouth === 1) R(g, hx0 + 4, hy0 + 8, 6, 1, EYE[1]);
    else { R(g, hx0 + 4, hy0 + 8, 6, 1, EYE[1]); P(g, hx0 + 4, hy0 + 7, EYE[1]); P(g, hx0 + 9, hy0 + 7, EYE[1]); }
    // ear bolts, and an aerial with a light on it
    R(g, hx0 - 1, hy0 + 5, 1, 3, GOLD[1]); R(g, hx0 + 14, hy0 + 5, 1, 3, GOLD[1]);
    R(g, hx0 + 14, hy0 - 4, 1, 9, STEEL[1]); R(g, hx0 + 13, hy0 - 6, 3, 2, blip ? '#ff4a4a' : '#8a1a1a');
    // the quiff, bursting out from under the peak
    R(g, hx0 + 2, hy0 - 1, 6, 2, HAIR[2]); R(g, hx0 + 3, hy0 - 2, 3, 1, HAIR[3]); P(g, hx0 + 7, hy0 + 1, HAIR[1]);
    // the cap
    R(g, hx0 - 1, hy0 - 6, 16, 4, SHIRT[2]); R(g, hx0, hy0 - 7, 14, 1, SHIRT[2]); R(g, hx0 - 1, hy0 - 3, 16, 1, SHIRT[0]);
    R(g, hx0 - 1, hy0 - 2, 16, 2, NAVY[1]);
    R(g, hx0 + 8, hy0, 8, 1, INK);                                                         // the peak, tipped
    R(g, hx0 + 6, hy0 - 3, 3, 2, GOLD[1]); P(g, hx0 + 6, hy0 - 3, GOLD[2]);
    // the fringe, hanging over the top of the screen
    for (let i = 0; i < 5; i++) { const x = hx0 + i * 3, len = 2 + (i % 2); R(g, x, hy0, 3, len, HAIR[2]); P(g, x + 1, hy0, HAIR[3]); P(g, x + 2, hy0 + len - 1, HAIR[0]); }
    Art.outline(c, INK, 1);
    cache.set(key, c);
    return c;
  }

  // ---- the portrait -------------------------------------------------------------------------
  const EYES = {                 // what the screen shows for each mood
    talk: 'open', idle: 'open', happy: 'arc', laugh: 'arc', proud: 'arc', think: 'up', worry: 'open', sad: 'half',
    cross: 'half', shock: 'wide', sly: 'half', tired: 'half',
  };
  const MOUTH = {
    talk: 'line', idle: 'smile', happy: 'grin', laugh: 'open', proud: 'grin', think: 'line', worry: 'wave', sad: 'frown',
    cross: 'frown', shock: 'o', sly: 'smirk', tired: 'line',
  };
  function bust(mood = 'talk', t = 0, talking = false) {
    const blink = (t % 3.6) > 3.45, open = talking && Math.floor(t * 9) % 2 === 0, blip = Math.floor(t * 2) % 2 === 0;
    const key = `b:${mood}:${blink ? 1 : 0}:${open ? 1 : 0}:${blip ? 1 : 0}`;
    let c = cache.get(key); if (c) return c;
    const o = Art.cv(64, 64), g = o.g; c = o.c;
    // shoulders and the shirt, with the whole slogan on it
    R(g, 6, 50, 52, 14, SHIRT[1]); R(g, 6, 50, 52, 1, SHIRT[2]); R(g, 6, 50, 3, 14, SHIRT[0]); R(g, 55, 50, 3, 14, SHIRT[0]);
    R(g, 26, 47, 12, 4, STEEL[1]); R(g, 24, 50, 16, 2, STEEL[2]);                       // neck and its ring
    P(g, 17, 55, HEART[0]); for (let y = 54; y < 59; y++) P(g, 18, y, HEART[0]); P(g, 19, 55, HEART[0]);
    for (let x = 17; x <= 19; x++) { P(g, x, 54, HEART[0]); P(g, x, 58, HEART[0]); }
    heart(g, 22, 54, true);
    word(g, 'KIRK', 32, 54, NAVY[1], MINI5);
    // sideburns and a thick brown mop out of both sides
    for (const [x, d] of [[2, 1], [52, -1]]) {
      for (let y = 10; y < 44; y += 5) Art.ell(g, x + 5, y + 2, 5, 3.6, HAIR[1]);     // fluffy curls down each side
      for (let y = 10; y < 44; y += 5) { R(g, x + 3, y, 4, 1, HAIR[3]); R(g, x + 2, y + 4, 6, 1, HAIR[0]); }
    }
    // the head
    R(g, 10, 14, 44, 34, STEEL[2]);
    R(g, 10, 14, 44, 2, STEEL[4]); R(g, 10, 14, 2, 34, STEEL[3]); R(g, 52, 14, 2, 34, STEEL[1]); R(g, 10, 46, 44, 2, STEEL[0]);
    for (let x = 12; x < 52; x += 8) P(g, x, 45, STEEL[1]);
    for (const [rx, ry] of [[13, 17], [50, 17], [13, 43], [50, 43]]) { R(g, rx - 1, ry - 1, 2, 2, STEEL[0]); P(g, rx - 1, ry - 1, STEEL[4]); }
    // ear bolts
    R(g, 7, 26, 3, 8, GOLD[1]); R(g, 7, 26, 3, 1, GOLD[2]); R(g, 54, 26, 3, 8, GOLD[0]);
    // the screen, with a glint across one corner
    R(g, 15, 20, 34, 22, INK); R(g, 16, 21, 32, 20, '#141424');
    R(g, 17, 22, 6, 1, '#3a3a52'); P(g, 17, 23, '#3a3a52');
    const e = blink ? 'shut' : (EYES[mood] || 'open');
    for (const ex of [23, 37]) {
      if (e === 'shut') R(g, ex - 1, 29, 6, 2, EYE[1]);
      else if (e === 'arc') { R(g, ex, 27, 4, 2, EYE[1]); R(g, ex - 1, 29, 2, 2, EYE[1]); R(g, ex + 3, 29, 2, 2, EYE[1]); }
      else if (e === 'half') { R(g, ex - 1, 29, 6, 3, EYE[1]); R(g, ex - 1, 29, 6, 1, EYE[0]); }
      else if (e === 'wide') { R(g, ex - 1, 25, 6, 7, EYE[1]); R(g, ex + 1, 27, 2, 3, EYE[2]); }
      else if (e === 'up') { R(g, ex, 25, 4, 4, EYE[1]); P(g, ex + 1, 25, EYE[2]); }
      else { R(g, ex, 26, 4, 5, EYE[1]); R(g, ex, 26, 2, 2, EYE[2]); }
    }
    if (mood === 'cross') { R(g, 21, 24, 7, 1, EYE[1]); R(g, 36, 24, 7, 1, EYE[1]); }
    if (mood === 'worry' || mood === 'sad') { R(g, 21, 24, 3, 1, EYE[1]); R(g, 24, 23, 3, 1, EYE[1]); R(g, 37, 23, 3, 1, EYE[1]); R(g, 40, 24, 3, 1, EYE[1]); }
    const m = open ? 'open' : (MOUTH[mood] || 'line');
    const M = (x, y, w, h) => R(g, x, y, w, h, EYE[1]);
    if (m === 'open') { M(27, 34, 10, 5); R(g, 29, 36, 6, 2, EYE[0]); }
    else if (m === 'o') { M(29, 34, 6, 5); R(g, 31, 35, 2, 3, INK); }
    else if (m === 'grin') { M(25, 36, 14, 2); M(24, 34, 2, 2); M(38, 34, 2, 2); }
    else if (m === 'smile') { M(27, 37, 10, 1); P(g, 26, 36, EYE[1]); P(g, 37, 36, EYE[1]); }
    else if (m === 'frown') { M(27, 36, 10, 1); P(g, 26, 37, EYE[1]); P(g, 37, 37, EYE[1]); }
    else if (m === 'wave') { for (let x = 25; x < 39; x++) P(g, x, 36 + (Math.floor(x / 2) % 2), EYE[1]); }
    else if (m === 'smirk') { M(29, 36, 8, 1); P(g, 37, 35, EYE[1]); }
    else M(26, 36, 12, 1);
    // blush pixels, because he is a friendly machine
    if (e === 'arc') { R(g, 17, 33, 3, 1, '#f06a8a'); R(g, 44, 33, 3, 1, '#f06a8a'); }
    // an aerial, poking up past the cap, with a light on the end
    R(g, 50, 2, 2, 12, STEEL[1]); R(g, 48, 0, 6, 4, blip ? '#ff4a4a' : '#9a1a1a'); P(g, 49, 0, '#ffc0c0');
    // the cap: white crown, navy band, gold badge, black peak
    R(g, 8, 2, 46, 8, SHIRT[2]); R(g, 11, 0, 40, 2, SHIRT[2]); R(g, 8, 8, 46, 2, SHIRT[0]);
    R(g, 8, 9, 46, 3, NAVY[1]); R(g, 8, 9, 46, 1, NAVY[2]);
    R(g, 10, 12, 30, 2, INK); R(g, 12, 12, 26, 1, '#3a3a4a');
    R(g, 27, 4, 8, 6, GOLD[1]); R(g, 28, 5, 6, 4, GOLD[2]); R(g, 30, 6, 2, 2, GOLD[0]);
    // a big brown fringe spilling out under the peak and over the top of the screen
    for (let i = 0; i < 9; i++) {
      const x = 11 + i * 4.6, len = 5 + (i % 3 === 1 ? 3 : i % 2) + (i === 3 ? 2 : 0);
      R(g, x, 13, 5, len, HAIR[1]); R(g, x + 1, 13, 2, len - 1, HAIR[2]); P(g, x + 1, 14, HAIR[3]);
      R(g, x + 1, 13 + len, 3, 1, HAIR[1]); P(g, x + 4, 13 + len - 1, HAIR[0]);
    }
    Art.outline(c, INK, 1);
    cache.set(key, c);
    return c;
  }
  return { sprite, bust };
})();
