// ---- The map: parchment, fog, and places to go ---------------------------
const Atlas = (() => {
  let G = null;
  const VW = 640, VH = 360;
  let sheet = null, hover = null;
  const fog = [];
  let travel = null;

  // A road map of the district, drawn the way a phone draws one: dark land,
  // forest blocks, water, a grid of lit streets through the town, a highway
  // running the length of it, and the buildings packed in between.
  const LAND = '#3a4232', LAND2 = '#444c3a', SCRUB = '#333b2c';
  const FOR0 = '#1d2a1c', FOR1 = '#2a3d27', FOR2 = '#365030', FOR3 = '#48693c';
  const WATER = '#2a5a7e', WATER2 = '#3b7ba4', WATER3 = '#63a8c8';
  const HWY0 = '#3a2c10', HWY1 = '#8a6a1c', HWY2 = '#d8a52f', HWY3 = '#f2cf62';
  const RD0 = '#2e3128', RD1 = '#7e8270', RD2 = '#b6b9a6', RD3 = '#e4e6d6';
  const ST0 = '#2a2d24', ST1 = '#6e7260', ST2 = '#a4a892';
  const BLD0 = '#22261e', BLD1 = '#4e5544', BLD2 = '#697259', BLD3 = '#8d976f';
  const LIT = '#d8b23a';

  // The network. The highway runs the length of the district; everything else
  // hangs off it. Points are map pixels, so a road ends where its place is.
  const MAINROAD = [[-24, 330], [110, 312], [236, 296], [352, 268], [452, 238], [556, 200], [664, 178]];
  const HIGHWAY = MAINROAD;            // the old name, kept for the traffic that crawls it
  const ROADS = [
    [[176, 236], [200, 258], [228, 274], [236, 296]],                      // the grove road
    [[330, 296], [318, 288], [300, 282], [284, 286], [236, 296]],          // into town
    [[424, 132], [436, 172], [448, 206], [452, 238]],                      // up to the ritual site
    [[548, 232], [556, 218], [556, 200]],                                  // the stack turn-off
    [[96, 104], [114, 150], [140, 194], [162, 218], [176, 236]],           // the quarry track
    [[566, 78], [584, 112], [600, 148], [592, 176], [556, 200]],           // the lake road
    [[292, 58], [332, 72], [376, 96], [408, 116], [424, 132]],             // the deepwood road
    [[292, 58], [230, 76], [172, 112], [128, 136], [114, 150]],            // and the back way round
  ];
  // The town: a grid of streets either side of the Mart.
  const TOWN = { x0: 258, x1: 404, y0: 252, y1: 330, gx: 28, gy: 24 };

  function poly(g, pts, col, w) {
    for (let i = 0; i < pts.length - 1; i++) Art.line(g, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], col, w);
    for (let i = 1; i < pts.length - 1; i++) Art.ell(g, pts[i][0], pts[i][1], w / 2, w / 2, col);
  }
  function dashed(g, pts, col, w, on, off) {
    let carry = 0, draw = true;
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
      const L = Math.hypot(x1 - x0, y1 - y0) || 1;
      for (let d = 0; d < L; d++) {
        const u = d / L;
        if (draw) { g.fillStyle = col; g.fillRect(Math.round(U.lerp(x0, x1, u)), Math.round(U.lerp(y0, y1, u)), w, w); }
        if (++carry >= (draw ? on : off)) { carry = 0; draw = !draw; }
      }
    }
  }

  // ---- the sheet -----------------------------------------------------------
  // It is a map somebody drew by hand: aged paper, ink that wobbles, hills put
  // in with hachures, forest drawn tree by tree, hatching in the water. Nothing
  // on it is ruler-straight and nothing on it is a flat fill.
  const PAPER0 = '#c8b58c', PAPER1 = '#d8c69e', PAPER2 = '#b9a37a', PAPER3 = '#e6d7b2';
  const INK = '#2e2418', INK2 = '#4a3a26', INK3 = '#6b5740';
  const SEA0 = '#7d9aa2', SEA1 = '#9dbac0', SEA2 = '#5f7f8a';
  const LEAF = '#4f6b3a', LEAF2 = '#3c5530', LEAF3 = '#6b8a4c';
  const ROOF = '#9a5236', ROOF2 = '#7a3c26';

  // a hand's worth of wobble: the same point always wobbles the same way
  function wob(x, y, amp, seed) {
    const n = Math.sin((x * 12.9898 + y * 78.233 + seed * 3.17)) * 43758.5453;
    return (n - Math.floor(n) - 0.5) * 2 * amp;
  }
  // an inked line: walked a pixel at a time, drifting off true the way a nib does
  function ink(g, x0, y0, x1, y1, col, w, amp, seed) {
    const L = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0)));
    for (let i = 0; i <= L; i++) {
      const u = i / L;
      const x = U.lerp(x0, x1, u) + wob(i * 0.7, seed, amp, seed);
      const y = U.lerp(y0, y1, u) + wob(seed, i * 0.7, amp, seed + 9);
      g.fillStyle = col;
      g.fillRect(Math.round(x), Math.round(y), w, w);
    }
  }
  function inkPath(g, pts, col, w, amp, seed) {
    for (let i = 0; i < pts.length - 1; i++) ink(g, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], col, w, amp, seed + i * 5);
  }
  // hatching: parallel strokes at 45 degrees inside a test function
  function hatch(g, x0, y0, x1, y1, step, col, inside, jitter, seed) {
    const r2 = Art.rng(seed);
    for (let d = -(y1 - y0); d < (x1 - x0); d += step) {
      let run = 0;
      for (let k = 0; k < (x1 - x0) + (y1 - y0); k++) {
        const x = Math.round(x0 + d + k * 0.7), y = Math.round(y0 + k * 0.7);
        if (x < x0 || x > x1 || y > y1) break;
        if (!inside(x, y)) { run = 0; continue; }
        run++;
        if (jitter && (run % 9) === 0) continue;     // the nib skips
        g.fillStyle = col;
        g.fillRect(x + Math.round((r2() - 0.5) * 1.2), y, 1, 1);
      }
    }
  }
  // a cartographer's tree: a trunk and three lobes of scribble
  function mapTree(g, x, y, s, seed) {
    const r2 = Art.rng(seed);
    g.fillStyle = INK2;
    g.fillRect(Math.round(x), Math.round(y - s * 0.4), 1, Math.round(s * 0.8));
    for (let i = 0; i < 3; i++) {
      const cx = x + (i - 1) * s * 0.52, cy = y - s * (0.55 + (i === 1 ? 0.35 : 0));
      const rr = s * (i === 1 ? 0.62 : 0.48);
      Art.ell(g, cx, cy, rr, rr * 0.86, LEAF2);
      Art.ell(g, cx - rr * 0.2, cy - rr * 0.2, rr * 0.7, rr * 0.6, r2() < 0.5 ? LEAF : LEAF3);
    }
    // a few scratches over it so it reads as drawn, not stamped
    for (let i = 0; i < 4; i++) {
      g.fillStyle = LEAF2;
      g.fillRect(Math.round(x + (r2() - 0.5) * s * 1.8), Math.round(y - s * (0.3 + r2() * 0.9)), 1 + Math.round(r2() * 2), 1);
    }
  }
  // a hill, drawn as hachures: short strokes fanning down from a ridge line
  function hill(g, x, y, w, h, seed) {
    const r2 = Art.rng(seed);
    for (let i = -w; i <= w; i += 3) {
      const u = i / w;
      const top = y - h * Math.sqrt(Math.max(0, 1 - u * u));
      const len = 3 + (1 - Math.abs(u)) * h * 0.55;
      g.fillStyle = INK2;
      for (let k = 0; k < len; k++) g.fillRect(Math.round(x + i + k * 0.18 * Math.sign(u || 1)), Math.round(top + k), 1, 1);
      if (r2() < 0.5) { g.fillStyle = INK3; g.fillRect(Math.round(x + i + 1), Math.round(top + 1), 1, Math.round(len * 0.5)); }
    }
    // the ridge itself, inked over the top of the strokes
    let px = x - w, py = y;
    for (let i = -w; i <= w; i += 2) {
      const u = i / w, nx = x + i, ny = y - h * Math.sqrt(Math.max(0, 1 - u * u));
      ink(g, px, py, nx, ny, INK, 1, 0.5, seed + i);
      px = nx; py = ny;
    }
  }

  function sheetOf() {
    if (sheet) return sheet;
    const { c, g } = Art.cv(VW, VH);
    const r = Art.rng(4242);
    // ---- the paper --------------------------------------------------------
    g.fillStyle = PAPER0; g.fillRect(0, 0, VW, VH);
    for (let i = 0; i < 9000; i++) {                    // the tooth of the stock
      const x = Math.floor(r() * VW), y = Math.floor(r() * VH), k = r();
      g.fillStyle = k < 0.42 ? PAPER1 : k < 0.72 ? PAPER2 : k < 0.92 ? PAPER3 : '#a8916a';
      g.fillRect(x, y, 1, 1);
    }
    for (let i = 0; i < 40; i++) {                      // fibres in the pulp
      const x = r() * VW, y = r() * VH, L = 5 + r() * 16, a = r() * TAU;
      g.fillStyle = r() < 0.5 ? '#efe0bc' : '#9c8663';
      for (let k = 0; k < L; k++) g.fillRect(Math.round(x + Math.cos(a) * k), Math.round(y + Math.sin(a) * k), 1, 1);
    }
    for (let i = 0; i < 16; i++) {                      // tea stains and foxing
      const x = r() * VW, y = r() * VH, rr = 12 + r() * 40;
      const oa = g.globalAlpha;
      for (let k = 4; k >= 1; k--) { g.globalAlpha = oa * 0.05; Art.ell(g, x, y, rr * (k / 4), rr * (k / 4) * 0.7, '#8a6f45'); }
      g.globalAlpha = oa;
    }
    for (let i = 0; i < 70; i++) {                      // specks of age
      g.fillStyle = 'rgba(96,74,44,0.35)';
      g.fillRect(Math.floor(r() * VW), Math.floor(r() * VH), 1 + (r() < 0.2 ? 1 : 0), 1);
    }
    // two folds, where the sheet lived in somebody's pocket
    for (const fx of [VW / 3, (VW * 2) / 3]) {
      for (let y = 0; y < VH; y++) {
        g.fillStyle = 'rgba(120,98,62,0.2)'; g.fillRect(Math.round(fx + wob(y, 3, 1.4, 7)), y, 1, 1);
        g.fillStyle = 'rgba(248,238,212,0.22)'; g.fillRect(Math.round(fx + wob(y, 3, 1.4, 7)) + 1, y, 1, 1);
      }
    }
    for (let x = 0; x < VW; x++) {
      const fy = VH / 2 + wob(x, 11, 1.4, 13);
      g.fillStyle = 'rgba(120,98,62,0.16)'; g.fillRect(x, Math.round(fy), 1, 1);
      g.fillStyle = 'rgba(248,238,212,0.18)'; g.fillRect(x, Math.round(fy) + 1, 1, 1);
    }
    // ---- the ground under it all: hachured hills and scratchy heath --------
    const HILLS = [[92, 118, 58, 26], [196, 88, 44, 20], [470, 96, 52, 24],
                   [552, 268, 46, 22], [300, 190, 40, 18], [122, 268, 38, 17]];
    for (let i = 0; i < HILLS.length; i++) hill(g, HILLS[i][0], HILLS[i][1], HILLS[i][2], HILLS[i][3], 300 + i * 97);
    // grass tufts and heather scribbled over the open ground
    for (let i = 0; i < 900; i++) {
      const x = Math.floor(r() * VW), y = Math.floor(r() * VH), k = r();
      if (k < 0.55) { g.fillStyle = INK3; g.fillRect(x, y, 2, 1); g.fillRect(x + 1, y - 1, 1, 1); }
      else if (k < 0.82) { g.fillStyle = '#7c8a5c'; g.fillRect(x, y, 1, 1); g.fillRect(x + 2, y, 1, 1); }
      else { g.fillStyle = '#8a7a58'; g.fillRect(x, y, 1, 1); }
    }
    // field boundaries: dry-stone walls drawn as broken ink, never a grid
    for (let i = 0; i < 26; i++) {
      const x0 = r() * VW, y0 = r() * VH;
      let x = x0, y = y0, a = r() * TAU;
      const segs = 2 + Math.floor(r() * 3);
      for (let k = 0; k < segs; k++) {
        const L = 24 + r() * 52;
        const nx = x + Math.cos(a) * L, ny = y + Math.sin(a) * L;
        for (let d = 0; d < L; d += 3) {               // broken, the way a wall reads
          const u = d / L;
          g.fillStyle = INK2;
          g.fillRect(Math.round(U.lerp(x, nx, u) + wob(d, k, 0.9, i)), Math.round(U.lerp(y, ny, u) + wob(k, d, 0.9, i + 3)), 2, 1);
        }
        x = nx; y = ny; a += (r() - 0.5) * 1.2;
      }
    }
    // ---- forest, drawn tree by tree ---------------------------------------
    const BLOCKS = [[60, 40, 150, 90], [250, 20, 130, 70], [470, 30, 160, 80],
                    [20, 150, 120, 110], [400, 120, 120, 90], [520, 250, 140, 100],
                    [120, 280, 110, 70], [300, 160, 90, 70]];
    for (let bi = 0; bi < BLOCKS.length; bi++) {
      const [bx, by, bw, bh] = BLOCKS[bi];
      // a wobbly ink outline round the wood, the way a surveyor rings one
      const pts = [];
      for (let a = 0; a < TAU; a += 0.42) {
        pts.push([bx + bw / 2 + Math.cos(a) * bw * 0.56, by + bh / 2 + Math.sin(a) * bh * 0.6]);
      }
      pts.push(pts[0]);
      inkPath(g, pts, INK2, 1, 1.6, 40 + bi * 13);
      const n = Math.round((bw * bh) / 420);
      const trees = [];
      for (let i = 0; i < n; i++) trees.push([bx + r() * bw, by + r() * bh, 5 + r() * 4]);
      trees.sort((p, q) => p[1] - q[1]);               // draw back to front
      for (let i = 0; i < trees.length; i++) mapTree(g, trees[i][0], trees[i][1], trees[i][2], bi * 100 + i);
    }
    // ---- water: an inked shore with hatching inside it ---------------------
    const lake = (x, y) => { const dx = (x - 586) / 50, dy = (y - 66) / 28; return dx * dx + dy * dy < 1; };
    for (let y = 36; y < 96; y++) for (let x = 534; x < 640; x++) {
      if (!lake(x, y)) continue;
      g.fillStyle = ((x + y) % 7 === 0) ? SEA1 : SEA0;
      g.fillRect(x, y, 1, 1);
    }
    hatch(g, 534, 36, 639, 96, 5, SEA2, lake, true, 61);
    for (let a = 0; a < TAU; a += 0.06) {              // the shoreline, inked
      const x = 586 + Math.cos(a) * 50, y = 66 + Math.sin(a) * 28;
      g.fillStyle = INK; g.fillRect(Math.round(x + wob(a * 30, 1, 1.5, 21)), Math.round(y + wob(1, a * 30, 1.5, 22)), 1, 1);
    }
    for (let i = 0; i < 5; i++) {                      // ripple ticks, drawn in
      const y = 48 + i * 9;
      for (let x = 548; x < 626; x += 9) {
        if (!lake(x, y)) continue;
        g.fillStyle = SEA2; g.fillRect(x, y, 4, 1); g.fillRect(x + 5, y + 1, 3, 1);
      }
    }
    const river = [[586, 88], [560, 126], [530, 160], [516, 200], [522, 250], [540, 300], [560, 358]];
    inkPath(g, river, INK, 3, 1.1, 71);                // banks
    for (let i = 0; i < river.length - 1; i++) {
      const [x0, y0] = river[i], [x1, y1] = river[i + 1], L = Math.hypot(x1 - x0, y1 - y0);
      for (let d = 0; d < L; d++) {
        const u = d / L, x = U.lerp(x0, x1, u), y = U.lerp(y0, y1, u);
        g.fillStyle = SEA0; g.fillRect(Math.round(x + wob(d, 2, 1, 71)) - 1, Math.round(y), 3, 1);
        if (d % 6 < 3) { g.fillStyle = SEA1; g.fillRect(Math.round(x + wob(d, 2, 1, 71)), Math.round(y), 1, 1); }
      }
    }
    // ---- the town, drawn as little roofs -----------------------------------
    const T = TOWN;
    for (let x = T.x0; x <= T.x1; x += T.gx) inkPath(g, [[x, T.y0], [x, T.y1]], INK2, 1, 1.2, x);
    for (let y = T.y0; y <= T.y1; y += T.gy) inkPath(g, [[T.x0, y], [T.x1, y]], INK2, 1, 1.2, y + 400);
    for (let x = T.x0; x < T.x1; x += T.gx) {
      for (let y = T.y0; y < T.y1; y += T.gy) {
        const n = 2 + Math.floor(r() * 3);
        for (let i = 0; i < n; i++) {
          const bw = 6 + r() * 6, bh = 4 + r() * 4;
          const bx = Math.round(x + 5 + r() * (T.gx - 10 - bw)), by = Math.round(y + 5 + r() * (T.gy - 10 - bh));
          const W2 = Math.round(bw), H2 = Math.round(bh);
          g.fillStyle = INK2; g.fillRect(bx - 1, by - 1, W2 + 2, H2 + 2);      // the ink round it
          g.fillStyle = r() < 0.4 ? ROOF : ROOF2; g.fillRect(bx, by, W2, H2);
          g.fillStyle = '#c47a52'; g.fillRect(bx, by, W2, 1);                  // sun on the ridge
          for (let k = 2; k < H2; k += 2) { g.fillStyle = 'rgba(46,36,24,0.35)'; g.fillRect(bx, by + k, W2, 1); }
        }
      }
    }
    // ---- the roads: two inked edges with a pale metalled middle ------------
    for (const p of ROADS.concat([HIGHWAY])) {
      inkPath(g, p, INK, 5, 1.1, 800);
      inkPath(g, p, '#e0d2ae', 3, 1.1, 800);
      for (let i = 0; i < p.length - 1; i++) {         // the centre line, ticked in by hand
        const [x0, y0] = p[i], [x1, y1] = p[i + 1], L = Math.hypot(x1 - x0, y1 - y0);
        for (let d = 0; d < L; d += 9) {
          const u = d / L;
          g.fillStyle = INK3;
          g.fillRect(Math.round(U.lerp(x0, x1, u) + wob(d, i, 1, 800)), Math.round(U.lerp(y0, y1, u) + wob(i, d, 1, 809)), 3, 1);
        }
      }
    }
    // farmsteads strung along them, each one a roof with a yard wall
    for (const p of ROADS) {
      for (let i = 1; i < p.length - 1; i++) {
        if (r() < 0.45) continue;
        const sd = r() < 0.5 ? -1 : 1;
        const bx = Math.round(p[i][0] + sd * (10 + r() * 11)), by = Math.round(p[i][1] + (r() - 0.5) * 16);
        const bw = Math.round(8 + r() * 6), bh = Math.round(6 + r() * 5);
        g.fillStyle = INK; g.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
        g.fillStyle = r() < 0.5 ? ROOF : ROOF2; g.fillRect(bx, by, bw, bh);
        g.fillStyle = '#c47a52'; g.fillRect(bx, by, bw, 1);
        for (let k = 0; k < 10; k++) {                 // the yard wall round it
          const a = (k / 10) * TAU;
          g.fillStyle = INK2;
          g.fillRect(Math.round(bx + bw / 2 + Math.cos(a) * (bw * 0.9 + 4)), Math.round(by + bh / 2 + Math.sin(a) * (bh * 0.9 + 4)), 2, 1);
        }
      }
    }
    // ---- the names, hand-lettered with a ruled underline -------------------
    for (const [lx, ly, tx2, col] of [
      [330, 246, 'WOMBAT FLAT', '#3a2c1c'], [112, 74, 'FERN GULLY', '#46351f'],
      [512, 44, 'STILL LAKE', '#2d4a52'], [248, 128, 'THE SCRUB', '#46351f'],
      [560, 292, 'BLACKWOOD', '#46351f'], [128, 320, 'STONE FLAT', '#46351f'],
      [452, 340, 'THE FLATS', '#46351f']]) {
      const w = Font.width(tx2, 1);
      const oa = g.globalAlpha; g.globalAlpha = 0.5;
      Art.rect(g, lx - w / 2 - 4, ly - 3, w + 8, 12, '#e4d6b2');      // paper cleared behind it
      g.globalAlpha = oa;
      Font.draw(g, tx2, lx, ly, { scale: 1, color: col, align: 'center' });
      ink(g, lx - w / 2, ly + 9, lx + w / 2, ly + 9, col, 1, 0.8, lx);
    }
    // ---- the chrome a drawn map wears -------------------------------------
    // a compass, as a four-point star cut with a diamond rose. No circles.
    const cx2 = 52, cy2 = 86;
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * TAU - Math.PI / 2, b2 = a + Math.PI / 4;
      Art.poly(g, [[cx2 + Math.cos(a) * 26, cy2 + Math.sin(a) * 26],
                   [cx2 + Math.cos(b2) * 8, cy2 + Math.sin(b2) * 8],
                   [cx2 + Math.cos(a + Math.PI / 2) * 26, cy2 + Math.sin(a + Math.PI / 2) * 26],
                   [cx2, cy2]], k % 2 ? INK2 : '#e0d2ae');
    }
    inkPath(g, [[cx2, cy2 - 30], [cx2 - 6, cy2 - 18], [cx2 + 6, cy2 - 18], [cx2, cy2 - 30]], INK, 1, 0.6, 5);
    Art.poly(g, [[cx2, cy2 - 29], [cx2 - 4, cy2 - 19], [cx2 + 4, cy2 - 19]], '#a8402c');
    Font.draw(g, 'N', cx2, cy2 - 42, { scale: 1, color: INK, align: 'center' });
    // a ruled border with a torn inner edge
    for (let i = 0; i < 2; i++) {
      const m = 4 + i * 4;
      inkPath(g, [[m, m], [VW - m, m], [VW - m, VH - m], [m, VH - m], [m, m]], i ? INK2 : INK, 1, 0.9, 900 + i * 7);
    }
    sheet = c;
    return c;
  }

  const eyes = [], bats = [], drift = [];
  function init(g) {
    G = g;
    fog.length = 0; eyes.length = 0; bats.length = 0; drift.length = 0;
    const r = Art.rng(1717);
    for (let i = 0; i < 90; i++) fog.push({ x: r() * VW, y: r() * VH, r: 22 + r() * 34, ph: r() * TAU, sp: 0.1 + r() * 0.3 });
    for (let i = 0; i < 22; i++) eyes.push({ x: r() * VW, y: r() * VH, ph: r() * TAU, sp: 0.3 + r() * 0.6, on: 0 });
    for (let i = 0; i < 7; i++) bats.push({ x: r() * VW, y: 20 + r() * (VH - 60), ph: r() * TAU, sp: 16 + r() * 24, amp: 12 + r() * 26 });
    for (let i = 0; i < 40; i++) drift.push({ x: r() * VW, y: r() * VH, ph: r() * TAU, sp: 0.2 + r() * 0.5 });
    TRAFFIC.length = 0;
    for (let i = 0; i < 9; i++) TRAFFIC.push({ u: r(), sp: 0.012 + r() * 0.018, dir: r() < 0.5 ? 1 : -1 });
  }
  function enter() { hover = null; travel = null; Audio.setMode('pen'); }

  // Traffic, crawling the highway while you decide where to go.
  const TRAFFIC = [];
  function hwyAt(u) {
    const P = HIGHWAY;
    let tot = 0; const seg = [];
    for (let i = 0; i < P.length - 1; i++) { const L = Math.hypot(P[i + 1][0] - P[i][0], P[i + 1][1] - P[i][1]); seg.push(L); tot += L; }
    let d = u * tot;
    for (let i = 0; i < seg.length; i++) {
      if (d <= seg[i]) {
        const k = d / seg[i];
        return { x: U.lerp(P[i][0], P[i + 1][0], k), y: U.lerp(P[i][1], P[i + 1][1], k),
          a: Math.atan2(P[i + 1][1] - P[i][1], P[i + 1][0] - P[i][0]) };
      }
      d -= seg[i];
    }
    const n = P.length - 1;
    return { x: P[n][0], y: P[n][1], a: 0 };
  }

  function siteAt(x, y) {
    for (const s of SITES) if (Math.abs(x - s.x) < 26 && Math.abs(y - s.y) < 26) return s;
    return null;
  }
  function click(x, y) {
    if (travel) return;
    const s = siteAt(x, y);
    if (!s) return;
    if (!unlocked(s)) { Audio.play('error'); UI.toast(s.gate && !s.gate(G) ? s.why : 'fog', 'bad'); return; }
    if (!s.mode) { Audio.play('error'); return; }
    const from = whereAmI();
    travel = { site: s };
    Audio.play('rumble');
    FX.shake(1.4);
    Drive.start({
      to: s.name, from: from.name, km: kmBetween(from, s), dur: 3.1,
      onDone: () => {
        const m = s.mode;
        G.lastSite = m;
        travel = null;
        Main.setMode(m);
      },
    });
  }
  function hoverAt(x, y) {
    hover = siteAt(x, y);
    if (!hover) return null;
    if (!unlocked(hover)) return `<b>?</b><br>${hover.gate && !hover.gate(G) ? hover.why : hover.need + ' gods must answer first'}`;
    return `<b>${hover.name}</b>`;
  }
  // Where the truck is parked right now: the last place you were, or the grove.
  function whereAmI() {
    const byMode = SITES.find((s) => s.mode === (G.lastSite || 'grove'));
    return byMode || SITES[0];
  }
  // How far it is, in the money of the map: a straight line scaled to km.
  const kmBetween = (a, b) => Math.max(3, Math.round(Math.hypot(b.x - a.x, b.y - a.y) / 11));
  function update(dt) {
    Drive.update(dt);
  }

  function render(g) {
    if (Drive.active()) { Drive.render(g); return; }
    const t = G.time;
    g.drawImage(sheetOf(), 0, 0);
    // headlights crawling the highway
    for (const v of TRAFFIC) {
      const u = ((v.u + t * v.sp * v.dir) % 1 + 1) % 1;
      const p = hwyAt(u);
      const c = v.dir > 0 ? 'rgba(255,232,168,' : 'rgba(255,120,96,';
      g.fillStyle = c + '0.22)'; Art.ell(g, p.x, p.y, 5, 5);
      g.fillStyle = c + '0.85)'; g.fillRect(Math.round(p.x) - 1, Math.round(p.y) - 1, 2, 2);
    }

    for (const s of SITES) {
      const open = unlocked(s);
      const hot = hover === s && open;
      // every pin breathes; the one under the pointer bounces properly
      const bob = hot ? Math.sin(t * 9) * 3.2 - 1.5 : Math.sin(t * 1.7 + s.x * 0.07) * 1.3;
      drawPin(g, s, open, hot, bob, t);
    }

    // fog over the locked half
    g.save();
    for (const f of fog) {
      const x = f.x + Math.sin(t * f.sp + f.ph) * 9;
      const y = f.y + Math.cos(t * f.sp * 0.8 + f.ph) * 5;
      let cover = 0;
      for (const s of SITES) {
        if (unlocked(s)) continue;
        const d = Math.hypot(x - s.x, y - s.y);
        if (d < 120) cover = Math.max(cover, 1 - d / 120);
      }
      const edge = Math.max(0, 1 - Math.min(x, VW - x, y, VH - y) / 70);
      const a = Math.max(cover, edge * 0.5);
      if (a <= 0.02) continue;
      Art.glow(g, x, y, f.r, '#3a3646', 0.5 * a, 4);
    }
    g.restore();

    // ---- things moving in the dark ----------------------------------------
    for (const e of eyes) {                      // pairs of eyes, out under the canopy
      let lit = 1e9;
      for (const s2 of SITES) if (unlocked(s2)) lit = Math.min(lit, Math.hypot(e.x - s2.x, e.y - s2.y));
      if (lit < 54) { e.on *= 0.9; continue; }   // they keep clear of the places you know
      e.on = Math.sin(t * e.sp + e.ph) > 0.93 ? 1 : e.on * 0.92;
      if (e.on < 0.05) continue;
      g.fillStyle = `rgba(226,176,96,${(e.on * 0.85).toFixed(2)})`;
      g.fillRect(Math.round(e.x), Math.round(e.y), 2, 2);
      g.fillRect(Math.round(e.x) + 4, Math.round(e.y), 2, 2);
      g.fillStyle = `rgba(226,176,96,${(e.on * 0.2).toFixed(2)})`;
      g.fillRect(Math.round(e.x) - 2, Math.round(e.y) - 2, 10, 6);
    }
    for (const b of bats) {                      // something crossing the canopy
      const x = ((b.x + t * b.sp) % (VW + 40)) - 20;
      const y = b.y + Math.sin(t * 2.2 + b.ph) * b.amp;
      const flap = Math.sin(t * 16 + b.ph) * 2.4;
      g.fillStyle = 'rgba(8,10,8,0.8)';
      g.fillRect(Math.round(x), Math.round(y), 2, 2);
      g.fillRect(Math.round(x) - 3, Math.round(y - flap), 3, 1);
      g.fillRect(Math.round(x) + 2, Math.round(y - flap), 3, 1);
    }
    for (const d of drift) {                     // spores riding the cold air
      const x = d.x + Math.sin(t * d.sp + d.ph) * 16;
      const y = d.y - ((t * 7 * d.sp) % VH);
      g.fillStyle = `rgba(150,176,150,${(0.12 + 0.16 * Math.sin(t * 2 + d.ph)).toFixed(2)})`;
      g.fillRect(Math.round(x), Math.round((y + VH) % VH), 1, 1);
    }
    // ---- the grade: a cold wood, lit only where you have been -------------
    g.save();
    g.globalCompositeOperation = 'soft-light';
    g.fillStyle = '#16346a'; g.globalAlpha = 0.5; g.fillRect(0, 0, VW, VH);
    g.restore();
    g.save();
    g.globalCompositeOperation = 'screen';
    for (const s2 of SITES) {
      if (!unlocked(s2)) continue;
      // a dithered warm patch, not a bullseye: hard rings read as targets here
      const oa = g.globalAlpha;
      for (let i = 5; i >= 1; i--) {
        const k = i / 5;
        g.globalAlpha = oa * 0.085 * (1 - (i - 1) / 5.5);
        Art.ell(g, s2.x, s2.y, 62 * k, 54 * k, '#ffce82');
      }
      g.globalAlpha = oa;
    }
    g.restore();
    // the vignette, dithered so the falloff bands instead of blurring
    Art.vignette(g, VW, VH, '#020403', 0.66, 2.2, 0.34);

    // title banner
    banner(g, 'THE GROVE AND BEYOND', 320, 24);


    FX.drawParticles(g, 0);
  }

  // the chrome a phone map wears: a search bar, a compass, a scale
  function banner(g, text, cx, cy) {
    g.fillStyle = 'rgba(40,40,44,0.16)'; g.fillRect(12, 12, VW - 24, 30);
    g.fillStyle = '#1c1008'; g.fillRect(10, 8, VW - 20, 28);
    g.fillStyle = '#ffffff'; g.fillRect(12, 10, VW - 24, 24);
    g.fillStyle = '#e6e3da'; g.fillRect(12, 31, VW - 24, 3);
    // the little magnifier
    g.fillStyle = '#5a5750';
    g.fillRect(24, 16, 8, 2); g.fillRect(24, 24, 8, 2); g.fillRect(22, 18, 2, 6); g.fillRect(32, 18, 2, 6);
    g.fillRect(34, 26, 2, 2); g.fillRect(36, 28, 2, 2);
    Font.draw(g, text, 46, 16, { scale: 2, color: '#3c3a35', align: 'left' });
    // compass, top right
    const cy3 = VH - 92;
    g.fillStyle = '#ffffff'; g.fillRect(VW - 44, cy3, 26, 26);
    g.fillStyle = '#1c1008'; g.fillRect(VW - 46, cy3 - 2, 30, 2); g.fillRect(VW - 46, cy3 + 26, 30, 2);
    g.fillStyle = '#1c1008'; g.fillRect(VW - 46, cy3 - 2, 2, 30); g.fillRect(VW - 18, cy3 - 2, 2, 30);
    g.fillStyle = '#e04a3c'; Art.poly(g, [[VW - 31, cy3 + 4], [VW - 27, cy3 + 14], [VW - 35, cy3 + 14]], '#e04a3c');
    g.fillStyle = '#5a5750'; Art.poly(g, [[VW - 31, cy3 + 22], [VW - 27, cy3 + 14], [VW - 35, cy3 + 14]], '#5a5750');
    // scale bar, bottom right
    g.fillStyle = 'rgba(255,255,255,0.85)'; g.fillRect(VW - 96, VH - 26, 84, 14);
    g.fillStyle = '#3c3a35'; g.fillRect(VW - 90, VH - 16, 60, 2); g.fillRect(VW - 90, VH - 20, 2, 6); g.fillRect(VW - 32, VH - 20, 2, 6);
    Font.draw(g, '2 km', VW - 26, VH - 24, { scale: 1, color: '#3c3a35', align: 'left' });
  }

  function drawPin(g, s, open, hot, bob, t) {
    const x = Math.round(s.x), y = Math.round(s.y + bob);
    const col = open ? (s.mode === 'grove' ? '#3f8f4a' : s.mode === 'shop' ? '#2f7ad0' : '#e04a3c') : '#8b8780';
    const dark = open ? (s.mode === 'grove' ? '#286633' : s.mode === 'shop' ? '#1c56a0' : '#a52f26') : '#66635d';
    g.fillStyle = 'rgba(40,40,44,0.22)';                     // the marker's shadow on the paper
    Art.ell(g, x + 3, y + 15, 9, 3, 'rgba(40,40,44,0.22)');
    if (hot) {
      g.globalAlpha = 0.2 + Math.sin(t * 6) * 0.08;
      g.fillStyle = col; g.fillRect(x - 18, y - 20, 36, 36);
      g.globalAlpha = 1;
    }
    // the teardrop: a round head over a point
    g.fillStyle = '#1c1008';
    Art.ell(g, x, y - 4, 12, 12, '#1c1008');
    Art.poly(g, [[x - 8, y + 1], [x + 8, y + 1], [x, y + 16]], '#1c1008');
    Art.ell(g, x, y - 4, 10, 10, dark);
    Art.poly(g, [[x - 6.5, y], [x + 6.5, y], [x, y + 14]], dark);
    Art.ell(g, x, y - 5, 9, 9, col);
    Art.ell(g, x - 3, y - 8, 3.4, 2.6, 'rgba(255,255,255,0.4)');
    if (!open) { Icons.blit(g, 'lock', x - 8, y - 13, 1); }
    else {
      Art.ell(g, x, y - 5, 5.6, 5.6, '#ffffff');
      Icons.blit(g, s.icon, x - 7, y - 12, 0.9);
    }
    if (s.key === 'ritual' && open) {
      const p = 0.5 + 0.5 * Math.sin(t * 3);
      g.globalAlpha = 0.3 + p * 0.3;
      g.fillStyle = PAL.div4; g.fillRect(x - 15 - p * 2, y - 20 - p * 2, 30 + p * 4, 4);
      g.globalAlpha = 1;
    }
    // the label sits on a white chip, like a place name on a phone map
    const label = s.name.toUpperCase();
    const w = Font.width(label, 1) + 8;
    g.fillStyle = 'rgba(255,255,255,0.92)'; g.fillRect(x - w / 2, y + 18, w, 11);
    g.fillStyle = '#c9c4b6'; g.fillRect(x - w / 2, y + 28, w, 1);
    Font.draw(g, label, x, y + 21, { scale: 1, color: open ? '#3c3a35' : '#8b8780', align: 'center' });
  }

  return { init, enter, update, render, click, hover: hoverAt, get busy() { return !!travel; } };
})();
