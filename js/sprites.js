// ---- Pixel-art sprite factory ---------------------------------------------
const Sprites = (() => {
  const cache = {};
  function make(rows, palette, scale = 1) {
    const h = rows.length, w = rows[0].length;
    const c = document.createElement('canvas'); c.width = w * scale; c.height = h * scale;
    const g = c.getContext('2d');
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const ch = rows[y][x];
      if (ch === '.' || !palette[ch]) continue;
      g.fillStyle = palette[ch];
      g.fillRect(x * scale, y * scale, scale, scale);
    }
    return c;
  }
  function flip(img) {
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const g = c.getContext('2d'); g.translate(img.width, 0); g.scale(-1, 1); g.drawImage(img, 0, 0);
    return c;
  }
  function tint(img, color) {
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0);
    g.globalCompositeOperation = 'source-atop'; g.fillStyle = color; g.fillRect(0, 0, c.width, c.height);
    return c;
  }

  // Wombat, facing right. 22x14
  const WOMBAT_PAL = { b: '#8b6a45', l: '#a98b62', d: '#5c4530', k: '#1b1210', w: '#f4efe6', n: '#3a2a20', p: '#c98a7a', e: '#6b5136' };
  const WOMBAT = [
    '......................',
    '....bbbbbbbbb.....ee..',
    '..bbbbbbbbbbbbb..epee.',
    '.bbbbbbbbbbbbbbbbbbbb.',
    '.bbbbbbbbbbbbbbbbbbbbb',
    'bbbbbbbbbbbbbbbbbwkbbb',
    'bbbbbbbbbbbbbbbbbbbbbn',
    'bbbbbbbbbbbbbbbbbbbbnn',
    'bbbbbbbbbbbbbbbbbbbbbn',
    '.bbbbbbbbbbbbbbbbbbbb.',
    '.bblllllllllllllbbbb..',
    '..dd...dd....dd...dd..',
    '..dd...dd....dd...dd..',
    '......................',
  ];
  const WOMBAT_WALK = [
    '......................',
    '....bbbbbbbbb.....ee..',
    '..bbbbbbbbbbbbb..epee.',
    '.bbbbbbbbbbbbbbbbbbbb.',
    '.bbbbbbbbbbbbbbbbbbbbb',
    'bbbbbbbbbbbbbbbbbwkbbb',
    'bbbbbbbbbbbbbbbbbbbbbn',
    'bbbbbbbbbbbbbbbbbbbbnn',
    'bbbbbbbbbbbbbbbbbbbbbn',
    '.bbbbbbbbbbbbbbbbbbbb.',
    '.bblllllllllllllbbbb..',
    '.dd...dd.......dd..dd.',
    'dd.....dd.....dd....dd',
    '......................',
  ];
  const WOMBAT_SLEEP = [
    '......................',
    '......................',
    '....bbbbbbbbb.....ee..',
    '..bbbbbbbbbbbbb..epee.',
    '.bbbbbbbbbbbbbbbbbbbb.',
    '.bbbbbbbbbbbbbbbbbbbbb',
    'bbbbbbbbbbbbbbbbbkkbbb',
    'bbbbbbbbbbbbbbbbbbbbbn',
    'bbbbbbbbbbbbbbbbbbbbnn',
    'bbbbbbbbbbbbbbbbbbbbbn',
    '.bbbbbbbbbbbbbbbbbbbb.',
    '.bblllllllllllllbbbb..',
    '.dddd..dddd..dddd.ddd.',
    '......................',
  ];
  const WOMBAT_HAPPY = [
    '......................',
    '....bbbbbbbbb.....ee..',
    '..bbbbbbbbbbbbb..epee.',
    '.bbbbbbbbbbbbbbbbbbbb.',
    '.bbbbbbbbbbbbbbbbbbbbb',
    'bbbbbbbbbbbbbbbbbkwbbb',
    'bbbbbbbbbbbbbbbbbpbbbn',
    'bbbbbbbbbbbbbbbbbbbbnn',
    'bbbbbbbbbbbbbbbbbbkbbn',
    '.bbbbbbbbbbbbbbbbbbbb.',
    '.bblllllllllllllbbbb..',
    '..dd...dd....dd...dd..',
    '..dd...dd....dd...dd..',
    '......................',
  ];
  // Crowd person 6x11 (colored by tint for shirt)
  const PERSON_PAL = { s: '#e8b98a', h: '#3b2a1f', t: '#ffffff', l: '#2b3a5a' };
  const PERSON = [
    '.hhhh.',
    '.ssss.',
    '.ssss.',
    '..ss..',
    'tttttt',
    'tttttt',
    'tttttt',
    '.tttt.',
    '.llll.',
    '.l..l.',
    '.l..l.',
  ];
  const SHIRTS = ['#e04b4b', '#4b8be0', '#4be07a', '#e0c04b', '#c04be0', '#e0884b', '#4bd6e0', '#f0f0f0', '#7a5cff'];

  const S = {};
  S.init = function () {
    const sc = 2;
    S.wombat = make(WOMBAT, WOMBAT_PAL, sc); S.wombatL = flip(S.wombat);
    S.wombatWalk = make(WOMBAT_WALK, WOMBAT_PAL, sc); S.wombatWalkL = flip(S.wombatWalk);
    S.wombatSleep = make(WOMBAT_SLEEP, WOMBAT_PAL, sc); S.wombatSleepL = flip(S.wombatSleep);
    S.wombatHappy = make(WOMBAT_HAPPY, WOMBAT_PAL, sc); S.wombatHappyL = flip(S.wombatHappy);
    S.people = SHIRTS.map((col) => {
      const rows = PERSON; const pal = Object.assign({}, PERSON_PAL, { t: col });
      return make(rows, pal, 1);
    });
    S.peopleHat = SHIRTS.map((col) => make(PERSON, Object.assign({}, PERSON_PAL, { t: col, h: U.pick(['#222', '#a33', '#37a', '#c93', '#3b2a1f']) }), 1));
  };
  S.make = make; S.flip = flip; S.tint = tint;

  // ---- Procedural cube drawing (pixel bevel style) ----
  // draws centered at (0,0) in current transform, size w x h
  S.drawCube = function (g, def, w, h, opts = {}) {
    const col = opts.color || def.color;
    const px = Math.max(1, Math.round(w / 12)); // bevel thickness
    g.fillStyle = col; g.fillRect(-w / 2, -h / 2, w, h);
    g.fillStyle = U.shade(col, 0.28); g.fillRect(-w / 2, -h / 2, w, px); g.fillRect(-w / 2, -h / 2, px, h);
    g.fillStyle = U.shade(col, -0.35); g.fillRect(-w / 2, h / 2 - px, w, px); g.fillRect(w / 2 - px, -h / 2, px, h);
    // texture speckles
    g.fillStyle = U.shade(col, -0.15);
    const n = def.key === 'ice' ? 0 : 3;
    for (let i = 0; i < n; i++) {
      const sx = -w / 2 + px * 2 + ((i * 7 + 3) % Math.max(1, (w - px * 4))) , sy = -h / 2 + px * 2 + ((i * 11 + 5) % Math.max(1, (h - px * 4)));
      g.fillRect(Math.floor(sx), Math.floor(sy), px, px);
    }
    // type-specific decorations
    switch (def.key) {
      case 'sticky':
        g.fillStyle = U.shade(col, 0.45);
        g.fillRect(-w / 2 + px, h / 2 - px * 3, px * 2, px * 3); g.fillRect(w / 2 - px * 4, h / 2 - px * 2, px * 2, px * 2);
        g.fillRect(-px, h / 2 - px * 4, px, px * 4);
        break;
      case 'ice':
        g.fillStyle = 'rgba(255,255,255,0.55)'; g.fillRect(-w / 2 + px * 2, -h / 2 + px * 2, px * 2, px * 5); g.fillRect(-w / 2 + px * 2, -h / 2 + px * 2, px * 5, px * 2);
        break;
      case 'gold':
        g.fillStyle = '#fff6c2'; g.fillRect(-w / 2 + px * 2, -h / 2 + px * 2, px * 2, px * 2); g.fillRect(w / 2 - px * 5, h / 2 - px * 5, px, px);
        g.fillStyle = U.shade(col, -0.2); g.fillRect(-px * 2, -px * 2, px * 4, px * 4); g.fillStyle = '#fff6c2'; g.fillRect(-px, -px * 2, px * 2, px);
        break;
      case 'heavy':
        g.fillStyle = U.shade(col, 0.35);
        for (let i = 0; i < 4; i++) g.fillRect((i % 2 ? 1 : -1) * (w / 2 - px * 3) - px / 2, (i < 2 ? -1 : 1) * (h / 2 - px * 3) - px / 2, px, px);
        break;
      case 'bouncy':
        g.fillStyle = U.shade(col, 0.4); g.fillRect(-w / 2 + px * 2, -px / 2, w - px * 4, px);
        break;
      case 'light':
        g.fillStyle = U.shade(col, 0.5); g.fillRect(-px, -h / 2 + px * 2, px, h - px * 4); g.fillRect(-px * 3, -px, px * 5, px);
        break;
      case 'slab':
        g.fillStyle = U.shade(col, -0.25); for (let i = 1; i < 4; i++) g.fillRect(-w / 2 + (w / 4) * i - px / 2, -h / 2 + px, px, h - px * 2);
        break;
    }
    // face (premium cubes get a face)
    if (opts.face) {
      const ex = Math.max(1, Math.round(w / 8));
      g.fillStyle = '#1b1210'; g.fillRect(-w / 4 - ex / 2, -h / 6, ex, ex); g.fillRect(w / 4 - ex / 2, -h / 6, ex, ex);
      g.fillRect(-w / 6, h / 6, w / 3, ex / 1.5);
    }
    if (opts.outline) { g.strokeStyle = opts.outline; g.lineWidth = 2; g.strokeRect(-w / 2, -h / 2, w, h); }
  };

  return S;
})();
