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
  // The whole map is drawn on a 320x180 canvas and blown up 2x, so one art
  // pixel is a fat 2x2 block and everything has to be a simple, chunky, cute
  // shape. Soft greens, round trees, little red roofs, and as many small
  // living things tucked into it as will fit.
  const HW = 320, HH = 180;
  // The wood at night, drawn from above: everything is a deep cold green and
  // the only warm light on the sheet comes out of a window or a lamp.
  const G0 = '#20361f', G1 = '#28401f', G2 = '#2f4c26', G3 = '#39592c';   // grass
  const GD = '#182a17', GD2 = '#0f1d10';                                  // grass shade
  const W0 = '#14384e', W1 = '#1e5068', W2 = '#2f7288', W3 = '#5fa0b4';   // water
  const SAND = '#4a4636', SAND2 = '#343224';
  const RD = '#5a5340', RDE = '#2e2b1e';                                  // paths
  const OUT = '#0b1409';                                                  // the one dark line
  const TR0 = '#0f1f10', TR1 = '#183018', TR2 = '#224222', TR3 = '#315c2d';
  const BLOS = '#6a4a62', BLOS2 = '#9e7a92';                              // pale ghost blossom
  const PIN0 = '#0c1a12', PIN1 = '#142a1a', PIN2 = '#1e3d26';
  const RF = ['#5a2a24', '#5c3826', '#43304e', '#26405c', '#5c4a24'];     // roof colours
  const WALL = '#4a4234', WALL2 = '#332e24';
  const LAMP = '#ffcf6a', LAMP2 = '#f0a83a';                              // lamplight

  // a chunky round tree: outline, body, a lit cap and a stubby trunk
  function cuteTree(q, x, y, s, kind, seed) {
    x = Math.round(x); y = Math.round(y);
    q.fillStyle = 'rgba(40,58,32,0.25)';                       // the shadow it sits in
    Art.ell(q, x + 1, y + 1, s * 0.9, s * 0.34, 'rgba(40,58,32,0.25)');
    Art.rect(q, x - 1, y - s * 0.7, 2, s * 0.8, '#6b4a2c');     // trunk
    Art.rect(q, x - 1, y - s * 0.7, 1, s * 0.8, '#8a6440');
    if (kind === 'pine') {
      for (let i = 0; i < 3; i++) {
        const w = s * (1.1 - i * 0.28), yy = y - s * (0.7 + i * 0.62);
        Art.poly(q, [[x - w, yy], [x + w, yy], [x, yy - s * 0.85]], PIN0);
        Art.poly(q, [[x - w + 1, yy - 0.6], [x + w - 1, yy - 0.6], [x, yy - s * 0.72]], PIN1);
        Art.poly(q, [[x - w * 0.5, yy - 0.8], [x - 0.2, yy - 0.8], [x - 0.6, yy - s * 0.6]], PIN2);
      }
      return;
    }
    const lob = kind === 'blossom' ? BLOS : TR2;
    const lob2 = kind === 'blossom' ? BLOS2 : TR3;
    Art.ell(q, x, y - s * 1.25, s * 1.15, s * 1.05, kind === 'blossom' ? '#3d2a3c' : TR0);
    Art.ell(q, x, y - s * 1.3, s * 1.0, s * 0.9, kind === 'blossom' ? '#4f3a50' : TR1);
    Art.ell(q, x - s * 0.22, y - s * 1.55, s * 0.68, s * 0.55, lob);
    Art.ell(q, x - s * 0.36, y - s * 1.7, s * 0.4, s * 0.3, lob2);
    if (kind === 'fruit') {                                    // a few berries
      const r2 = Art.rng(seed);
      for (let i = 0; i < 3; i++) Art.rect(q, x + (r2() - 0.5) * s * 1.4, y - s * (0.9 + r2() * 0.8), 2, 2, '#8a2f38');
    }
  }
  // a rounded green hill with a lit crown and a couple of tufts on it
  function cuteHill(q, x, y, w, h, seed) {
    const r2 = Art.rng(seed);
    Art.ell(q, x, y, w, h, GD);
    Art.ell(q, x, y - 1, w - 1, h - 1, G1);
    Art.ellBand(q, x - 1, y - 1, w - 2, h - 2, G2, 0, 0.5);
    Art.ell(q, x - w * 0.3, y - h * 0.6, w * 0.3, h * 0.28, G3);
    for (let i = 0; i < 5; i++) {                              // tufts on the slope
      const tx = x + (r2() - 0.5) * w * 1.5, ty = y - h * 0.2 + r2() * h * 0.7;
      Art.rect(q, tx, ty, 1, 2, GD2); Art.rect(q, tx + 1, ty - 1, 1, 2, GD2); Art.rect(q, tx + 2, ty, 1, 2, GD2);
    }
  }
  // a tiny house: walls, a coloured roof, a door, a window, and smoke
  function cuteHouse(q, x, y, w, h, ri, seed) {
    x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
    const roof = RF[ri % RF.length];
    Art.rect(q, x - 1, y - 1, w + 2, h + 2, OUT);
    Art.rect(q, x, y, w, h, WALL);
    Art.rect(q, x, y + h - 2, w, 2, WALL2);
    Art.poly(q, [[x - 2, y], [x + w + 2, y], [x + w - 1, y - h * 0.75 - 1], [x + 1, y - h * 0.75 - 1]], OUT);
    Art.poly(q, [[x - 1, y - 1], [x + w + 1, y - 1], [x + w - 1, y - h * 0.75], [x + 1, y - h * 0.75]], roof);
    Art.poly(q, [[x - 1, y - 1], [x + w + 1, y - 1], [x + w, y - 2], [x, y - 2]], U.shade(roof, -0.25));
    Art.rect(q, x + 1, y - h * 0.75, w - 2, 1, U.shade(roof, 0.28));
    Art.rect(q, x + 1, y + h - 3, 2, 3, '#241a12');             // the door
    // the windows are the only warm thing out here, so they glow
    Art.rect(q, x + w - 4, y + 1, 2, 2, LAMP);
    Art.rect(q, x + w - 5, y, 4, 4, 'rgba(255,207,106,0.22)');
    Art.rect(q, x + w - 6, y - 1, 6, 6, 'rgba(255,207,106,0.1)');
    if (w > 8) { Art.rect(q, x + 1, y + 1, 2, 2, LAMP2); Art.rect(q, x, y, 4, 4, 'rgba(240,168,58,0.18)'); }
    Art.rect(q, x + w - 3, y - h * 0.75 - 3, 2, 3, '#1e1810');  // the chimney
    for (let i = 0; i < 3; i++) {                              // smoke going up
      const sx = x + w - 3 + ((i % 2) ? 1 : -1), sy = y - h * 0.75 - 5 - i * 3;
      Art.ell(q, sx, sy, 1.4 + i * 0.5, 1.2 + i * 0.4, 'rgba(180,186,190,0.45)');
    }
  }
  // the animals. Each one is four or five pixels and that is all it needs.
  function wombat(q, x, y) {
    Art.ell(q, x, y, 4.4, 3.2, '#5e442e'); Art.ell(q, x - 1, y - 1, 3, 1.8, '#7a5a3c');
    Art.rect(q, x + 3, y - 2, 3, 3, '#5e442e'); Art.rect(q, x + 3, y - 3, 1, 1, '#4a3424');
    Art.rect(q, x + 5, y - 1, 1, 1, '#ffcf6a');                 // one eye catching the light
    Art.rect(q, x - 2, y + 2, 1, 2, '#8a5c3c'); Art.rect(q, x + 2, y + 2, 1, 2, '#8a5c3c');
  }
  function duck(q, x, y) {
    Art.ell(q, x, y, 3.4, 2.4, '#b4b0a2'); Art.rect(q, x + 2, y - 3, 2, 3, '#b4b0a2');
    Art.rect(q, x + 4, y - 2, 2, 1, '#c08a2a'); Art.rect(q, x + 3, y - 3, 1, 1, '#141008');
  }
  function bird(q, x, y) {
    Art.rect(q, x, y, 2, 1, '#4a4438'); Art.rect(q, x + 2, y - 1, 2, 1, '#4a4438');
    Art.rect(q, x + 4, y, 2, 1, '#4a4438');
  }
  // the toadstools glow out here, which is either lovely or a warning
  function mushroom(q, x, y, col) {
    Art.rect(q, x - 1, y - 3, 6, 6, 'rgba(120,200,180,0.08)');
    Art.rect(q, x, y, 2, 2, '#9c9480'); Art.ell(q, x + 1, y - 1, 2.6, 1.8, col);
    Art.rect(q, x, y - 2, 1, 1, '#d8f4e8');
  }
  function flower(q, x, y, col) {
    Art.rect(q, x, y, 1, 2, '#1d3a1c');
    Art.rect(q, x - 1, y - 1, 3, 1, col); Art.rect(q, x, y - 2, 1, 2, col);
    Art.rect(q, x, y - 1, 1, 1, '#8ad8c0');
  }

  function sheetOf() {
    if (sheet) return sheet;
    const { c, g } = Art.cv(VW, VH);
    const hc = Art.cv(HW, HH), q = hc.g;
    const r = Art.rng(4242);
    const H = (v) => v / 2;                       // full-map coords -> half-res coords

    // ---- the grass, in soft patches ---------------------------------------
    q.fillStyle = G1; q.fillRect(0, 0, HW, HH);
    for (let i = 0; i < 90; i++) {                // meadows of a lighter green
      const x = r() * HW, y = r() * HH, w = 10 + r() * 34;
      Art.ell(q, x, y, w, w * (0.4 + r() * 0.3), r() < 0.55 ? G2 : G0);
    }
    for (let i = 0; i < 26; i++) Art.ell(q, r() * HW, r() * HH, 8 + r() * 18, 5 + r() * 8, G3);
    for (let i = 0; i < 1600; i++) {              // grass blades, everywhere
      const x = Math.floor(r() * HW), y = Math.floor(r() * HH), k = r();
      if (k < 0.5) { q.fillStyle = GD; q.fillRect(x, y, 1, 2); q.fillRect(x + 1, y + 1, 1, 1); }
      else if (k < 0.82) { q.fillStyle = G3; q.fillRect(x, y, 2, 1); }
      else { q.fillStyle = GD2; q.fillRect(x, y, 1, 1); }
    }
    // hedgerows: short dark dashes that wander, so the fields read without a grid
    for (let i = 0; i < 22; i++) {
      let x = r() * HW, y = r() * HH, a = r() * TAU;
      for (let k = 0; k < 40; k++) {
        a += (r() - 0.5) * 0.5;
        x += Math.cos(a) * 2; y += Math.sin(a) * 2;
        Art.ell(q, x, y, 1.8, 1.4, GD2);
        if (k % 3 === 0) Art.ell(q, x, y - 1, 1.4, 1, TR2);
      }
    }
    // ---- rolling hills -----------------------------------------------------
    const HILLS = [[92, 118, 34, 15], [196, 88, 26, 12], [470, 96, 30, 14],
                   [552, 268, 26, 12], [300, 190, 24, 11], [122, 268, 22, 10]];
    for (let i = 0; i < HILLS.length; i++) cuteHill(q, H(HILLS[i][0]), H(HILLS[i][1]) + 6, HILLS[i][2], HILLS[i][3], 300 + i * 97);

    // ---- woods, drawn tree by tree ----------------------------------------
    const BLOCKS = [[60, 40, 150, 90], [250, 20, 130, 70], [470, 30, 160, 80],
                    [20, 150, 120, 110], [400, 120, 120, 90], [520, 250, 140, 100],
                    [120, 280, 110, 70], [300, 160, 90, 70]];
    const canopy = [];
    for (let bi = 0; bi < BLOCKS.length; bi++) {
      const bx = H(BLOCKS[bi][0]), by = H(BLOCKS[bi][1]), bw = H(BLOCKS[bi][2]), bh = H(BLOCKS[bi][3]);
      const n = Math.round((bw * bh) / 54);
      for (let i = 0; i < n; i++) {
        const k = r();
        canopy.push([bx + r() * bw, by + r() * bh, 3.4 + r() * 2.4,
          k < 0.16 ? 'pine' : k < 0.26 ? 'blossom' : k < 0.34 ? 'fruit' : 'round', bi * 100 + i]);
      }
    }
    for (let i = 0; i < 40; i++) {                // a few standing on their own
      const k = r();
      canopy.push([r() * HW, r() * HH, 3 + r() * 2, k < 0.3 ? 'blossom' : k < 0.5 ? 'pine' : 'round', 9000 + i]);
    }
    canopy.sort((p2, q2) => p2[1] - q2[1]);       // back to front, so they overlap right
    for (const [x, y, s2, kind, seed] of canopy) cuteTree(q, x, y, s2, kind, seed);

    // ---- the lake, with a beach and things living on it --------------------
    const LX2 = H(586), LY2 = H(66), LRX = 27, LRY = 16;
    Art.ell(q, LX2, LY2, LRX + 3, LRY + 2, SAND2);
    Art.ell(q, LX2, LY2, LRX + 2, LRY + 1, SAND);
    Art.ell(q, LX2, LY2, LRX, LRY, W0);
    Art.ell(q, LX2, LY2 - 1, LRX - 2, LRY - 2, W1);
    Art.ell(q, LX2 - 4, LY2 - 3, LRX * 0.5, LRY * 0.4, W2);
    for (let y = LY2 - LRY + 2; y < LY2 + LRY - 1; y += 3) {     // ripple ticks
      for (let x = LX2 - LRX + 3; x < LX2 + LRX - 3; x += 7) {
        const dx = (x - LX2) / LRX, dy = (y - LY2) / LRY;
        if (dx * dx + dy * dy > 0.7) continue;
        Art.rect(q, x + ((y % 6) ? 2 : 0), y, 3, 1, W3);
      }
    }
    for (let i = 0; i < 5; i++) {                                // lily pads
      const a = (i / 5) * TAU, lx = LX2 + Math.cos(a) * LRX * 0.6, ly = LY2 + Math.sin(a) * LRY * 0.6;
      Art.ell(q, lx, ly, 3, 2, TR1); Art.ell(q, lx, ly, 2.2, 1.4, TR2);
      if (i % 2) Art.rect(q, lx, ly - 1, 2, 2, '#7a6a80');
    }
    duck(q, LX2 - 8, LY2 + 3);
    // a lamp on the end of the jetty, and its reflection on the water
    Art.rect(q, LX2 - LRX + 2, LY2 + 1, 1, 6, '#2a2418');
    Art.rect(q, LX2 - LRX + 1, LY2 - 1, 3, 3, '#ffcf6a');
    for (let k = 4; k >= 1; k--) {
      const oa = q.globalAlpha; q.globalAlpha = 0.09 * (1 - (k - 1) / 4.4);
      Art.ell(q, LX2 - LRX + 2, LY2 + 1, 5 * k, 3.4 * k, '#ffcf6a');
      q.globalAlpha = oa;
    }
    duck(q, LX2 + 6, LY2 - 4);
    // a little jetty with a boat tied to it
    Art.rect(q, LX2 - LRX - 2, LY2 + 6, 10, 2, '#9a7448');
    Art.rect(q, LX2 - LRX - 2, LY2 + 6, 10, 1, '#c29a66');
    Art.poly(q, [[LX2 - LRX + 8, LY2 + 9], [LX2 - LRX + 16, LY2 + 9], [LX2 - LRX + 14, LY2 + 12], [LX2 - LRX + 10, LY2 + 12]], '#b06a3a');
    Art.rect(q, LX2 - LRX + 11, LY2 + 4, 1, 5, '#8a6440');
    Art.poly(q, [[LX2 - LRX + 12, LY2 + 4], [LX2 - LRX + 17, LY2 + 7], [LX2 - LRX + 12, LY2 + 8]], '#f4f0e4');

    // ---- the river, with stepping stones and a bridge ----------------------
    const river = [[586, 88], [560, 126], [530, 160], [516, 200], [522, 250], [540, 300], [560, 358]];
    for (let i = 0; i < river.length - 1; i++) {
      const [x0, y0] = river[i], [x1, y1] = river[i + 1];
      const L = Math.hypot(H(x1 - x0), H(y1 - y0));
      for (let d = 0; d <= L; d++) {
        const u = d / L, x = U.lerp(H(x0), H(x1), u), y = U.lerp(H(y0), H(y1), u);
        Art.ell(q, x, y, 4, 2.4, SAND2);
      }
    }
    for (let i = 0; i < river.length - 1; i++) {
      const [x0, y0] = river[i], [x1, y1] = river[i + 1];
      const L = Math.hypot(H(x1 - x0), H(y1 - y0));
      for (let d = 0; d <= L; d++) {
        const u = d / L, x = U.lerp(H(x0), H(x1), u), y = U.lerp(H(y0), H(y1), u);
        Art.ell(q, x, y, 2.6, 1.6, W0);
        Art.ell(q, x, y - 0.4, 1.8, 1, W1);
        if ((d + i * 7) % 9 === 0) Art.rect(q, x - 1, y, 2, 1, W3);
      }
    }
    Art.rect(q, H(546) - 8, H(378) / 2, 16, 4, '#9a7448');        // the bridge on the main road
    Art.rect(q, H(546) - 8, H(378) / 2, 16, 1, '#c29a66');
    for (let i = 0; i < 4; i++) Art.rect(q, H(546) - 7 + i * 4, H(378) / 2 - 2, 1, 2, '#7a5636');

    // ---- the roads: cream tracks with a soft dark edge ---------------------
    const roadPath = (p, w, col) => {
      for (let i = 0; i < p.length - 1; i++) {
        const [x0, y0] = p[i], [x1, y1] = p[i + 1];
        const L = Math.max(1, Math.hypot(H(x1 - x0), H(y1 - y0)));
        for (let d = 0; d <= L; d++) {
          const u = d / L;
          Art.ell(q, U.lerp(H(x0), H(x1), u), U.lerp(H(y0), H(y1), u), w, w * 0.8, col);
        }
      }
    };
    for (const p of ROADS.concat([HIGHWAY])) { roadPath(p, 3.4, RDE); roadPath(p, 2.4, RD); }
    for (const p of ROADS.concat([HIGHWAY])) {   // little stones set in the track
      for (let i = 0; i < p.length - 1; i++) {
        const [x0, y0] = p[i], [x1, y1] = p[i + 1], L = Math.hypot(H(x1 - x0), H(y1 - y0));
        for (let d = 0; d < L; d += 5) {
          const u = d / L;
          Art.rect(q, U.lerp(H(x0), H(x1), u), U.lerp(H(y0), H(y1), u) + ((d / 5) % 2 ? 1 : -1), 2, 1, '#f4e8c8');
        }
      }
    }
    // ---- the town: a huddle of little houses -------------------------------
    const T = TOWN;
    for (let x = T.x0; x <= T.x1; x += T.gx) roadPath([[x, T.y0], [x, T.y1]], 1.8, RD);
    for (let y = T.y0; y <= T.y1; y += T.gy) roadPath([[T.x0, y], [T.x1, y]], 1.8, RD);
    let hi = 0;
    for (let x = T.x0; x < T.x1; x += T.gx) {
      for (let y = T.y0; y < T.y1; y += T.gy) {
        const n = 1 + Math.floor(r() * 2);
        for (let i = 0; i < n; i++) {
          const bw = 7 + Math.floor(r() * 4), bh = 5 + Math.floor(r() * 3);
          cuteHouse(q, H(x) + 3 + r() * (H(T.gx) - 4 - bw), H(y) + 5 + r() * (H(T.gy) - 6 - bh), bw, bh, hi++, i);
        }
      }
    }
    // farmsteads along the roads, each with a little fenced paddock
    for (const p of ROADS) {
      for (let i = 1; i < p.length - 1; i++) {
        if (r() < 0.5) continue;
        const sd = r() < 0.5 ? -1 : 1;
        const bx = H(p[i][0]) + sd * (7 + r() * 6), by = H(p[i][1]) + (r() - 0.5) * 9;
        cuteHouse(q, bx, by, 8 + Math.floor(r() * 3), 6, hi++, i);
        for (let k = 0; k < 10; k++) {                            // the paddock fence
          const a = (k / 10) * TAU;
          Art.rect(q, bx + 4 + Math.cos(a) * 12, by + 3 + Math.sin(a) * 8, 1, 2, '#a58050');
        }
        wombat(q, bx + 4 + (r() - 0.5) * 12, by + 4 + (r() - 0.5) * 8);
        if (r() < 0.5) wombat(q, bx + 2 + (r() - 0.5) * 12, by + 6 + (r() - 0.5) * 6);
      }
    }
    // ---- the small living things -------------------------------------------
    // they graze in the open, never on top of a wood
    const inWood = (x, y) => BLOCKS.some(([bx, by, bw, bh]) =>
      x > H(bx) - 4 && x < H(bx + bw) + 4 && y > H(by) - 4 && y < H(by + bh) + 4);
    const openSpot = () => {
      for (let k = 0; k < 24; k++) {
        const x = 12 + r() * (HW - 24), y = 12 + r() * (HH - 24);
        if (!inWood(x, y)) return [x, y];
      }
      return null;
    };
    for (let i = 0; i < 16; i++) { const p2 = openSpot(); if (p2) wombat(q, p2[0], p2[1]); }
    for (let i = 0; i < 26; i++) mushroom(q, r() * HW, r() * HH, ['#7a3a4a', '#6a5a2a', '#5a4a72'][i % 3]);
    for (let i = 0; i < 80; i++) flower(q, r() * HW, r() * HH, ['#7a5a72', '#6a6a3a', '#5a4a72', '#8a9088'][i % 4]);
    for (let i = 0; i < 14; i++) bird(q, r() * HW, 4 + r() * (HH * 0.5));
    // a campfire out in the scrub, with somebody's tent next to it
    {
      const cx3 = 118, cy3 = 70;
      for (let k = 4; k >= 1; k--) {                              // the light it throws
        const oa = q.globalAlpha; q.globalAlpha = 0.09 * (1 - (k - 1) / 4.4);
        Art.ell(q, cx3, cy3 + 1, 6 * k, 4.4 * k, '#e0a84a');
        q.globalAlpha = oa;
      }
      Art.poly(q, [[cx3 - 7, cy3 + 4], [cx3, cy3 - 5], [cx3 + 7, cy3 + 4]], '#e0a84a');
      Art.poly(q, [[cx3 - 5, cy3 + 4], [cx3, cy3 - 3], [cx3 + 5, cy3 + 4]], '#ffeaa8');
      Art.rect(q, cx3 - 7, cy3 + 4, 14, 1, '#3a2a18');
      Art.rect(q, cx3 + 10, cy3 + 2, 6, 1, '#2a1e12');
      Art.poly(q, [[cx3 + 10, cy3 + 2], [cx3 + 13, cy3 - 3], [cx3 + 16, cy3 + 2]], '#5a3226');
      Art.rect(q, cx3 + 12, cy3 - 1, 2, 3, '#ffcf6a');
    }
    // mist pooling in the low ground between the woods
    for (let i = 0; i < 30; i++) {
      const mx = r() * HW, my = r() * HH, mw = 12 + r() * 26;
      const oa = q.globalAlpha; q.globalAlpha = 0.12 + r() * 0.1;
      Art.ell(q, mx, my, mw, mw * 0.3, '#8aa8a0');
      Art.ell(q, mx - mw * 0.3, my + 1.4, mw * 0.5, mw * 0.2, '#a4c0b8');
      q.globalAlpha = oa;
    }
    // clouds drifting over the whole thing, so there is sky in it
    for (let i = 0; i < 7; i++) {
      const cx3 = r() * HW, cy3 = r() * HH, cw = 9 + r() * 12;
      const oa = q.globalAlpha; q.globalAlpha = 0.16;
      Art.ell(q, cx3, cy3, cw, cw * 0.4, '#8f9cb4');
      Art.ell(q, cx3 - cw * 0.4, cy3 - 1.4, cw * 0.5, cw * 0.3, '#a8b4c8');
      q.globalAlpha = oa * 0.3;
      Art.ell(q, cx3 + 3, cy3 + 4, cw, cw * 0.4, '#070c08');       // and their shadow on the grass
      q.globalAlpha = oa;
    }

    // ---- blow it up ---------------------------------------------------------
    g.imageSmoothingEnabled = false;
    g.drawImage(hc.c, 0, 0, VW, VH);

    // ---- the names, at full resolution so they stay readable ---------------
    for (const [lx, ly, tx2, col] of [
      [330, 246, 'WOMBAT FLAT', '#9cb88a'], [112, 74, 'FERN GULLY', '#9cb88a'],
      [512, 44, 'STILL LAKE', '#8ab4c8'], [248, 128, 'THE SCRUB', '#9cb88a'],
      [560, 292, 'BLACKWOOD', '#9cb88a'], [128, 320, 'STONE FLAT', '#9cb88a'],
      [452, 340, 'THE FLATS', '#9cb88a']]) {
      const w = Font.width(tx2, 1);
      Art.rect(g, lx - w / 2 - 5, ly - 4, w + 10, 14, 'rgba(2,8,4,0.5)');
      Art.rect(g, lx - w / 2 - 4, ly - 4, w + 8, 13, '#22301e');
      Art.rect(g, lx - w / 2 - 4, ly - 4, w + 8, 2, '#3a4c33');
      Art.rect(g, lx - w / 2 - 4, ly + 7, w + 8, 2, '#131c11');
      Font.draw(g, tx2, lx, ly, { scale: 1, color: col, align: 'center' });
    }
    // a four-point compass rose, chunky enough to match the rest
    const cx2 = 52, cy2 = 274;
    Art.rect(g, cx2 - 30, cy2 - 42, 60, 74, 'rgba(2,8,4,0.5)');
    Art.rect(g, cx2 - 29, cy2 - 42, 58, 72, '#22301e');
    Art.rect(g, cx2 - 29, cy2 - 42, 58, 3, '#3a4c33');
    Art.rect(g, cx2 - 29, cy2 + 27, 58, 3, '#131c11');
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * TAU - Math.PI / 2;
      Art.poly(g, [[cx2 + Math.cos(a) * 22, cy2 + Math.sin(a) * 22],
                   [cx2 + Math.cos(a + 2.2) * 7, cy2 + Math.sin(a + 2.2) * 7],
                   [cx2 + Math.cos(a - 2.2) * 7, cy2 + Math.sin(a - 2.2) * 7]], k ? '#4e6244' : '#8a3028');
      Art.poly(g, [[cx2 + Math.cos(a) * 19, cy2 + Math.sin(a) * 19],
                   [cx2 + Math.cos(a + 2.2) * 4.6, cy2 + Math.sin(a + 2.2) * 4.6],
                   [cx2 + Math.cos(a - 2.2) * 4.6, cy2 + Math.sin(a - 2.2) * 4.6]], k ? '#9cb88a' : '#d05a4a');
    }
    Art.rect(g, cx2 - 4, cy2 - 4, 8, 8, '#131c11');
    Art.rect(g, cx2 - 3, cy2 - 3, 6, 6, '#9cb88a');
    Font.draw(g, 'N', cx2, cy2 - 38, { scale: 1, color: '#9cb88a', align: 'center' });
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
      // a fat hop when you point at one, a slow float when you do not, and a
      // squash at the bottom of each so the whole board feels springy
      const ph = t * (hot ? 7 : 1.7) + s.x * 0.07;
      const raw = Math.abs(Math.sin(ph));
      const bob = hot ? -raw * 7 : Math.sin(ph) * 1.8;
      const sq = hot ? (1 - raw) * 0.26 : 0;
      drawPin(g, s, open, hot, bob, t, sq);
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
    g.fillStyle = '#1a3a6a'; g.globalAlpha = 0.46; g.fillRect(0, 0, VW, VH);
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
    Art.vignette(g, VW, VH, '#04100a', 0.72, 2.2, 0.3);

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

  function drawPin(g, s, open, hot, bob, t, sq = 0) {
    const x = Math.round(s.x), y = Math.round(s.y + bob);
    if (sq > 0.001) {                          // squash about the pin's point
      g.save();
      g.translate(x, s.y + 16); g.scale(1 + sq, 1 - sq); g.translate(-x, -(s.y + 16));
    }
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
    if (sq > 0.001) g.restore();
    // the label sits on a little card, and it does not squash with the pin
    const ly = Math.round(s.y) + 18;
    const label = s.name.toUpperCase();
    const w = Font.width(label, 1) + 10;
    Art.rect(g, x - w / 2 - 1, ly - 1, w + 2, 14, 'rgba(24,34,18,0.35)');
    Art.rect(g, x - w / 2, ly, w, 12, '#ffffff');
    Art.rect(g, x - w / 2, ly + 10, w, 2, '#d0cabc');
    Font.draw(g, label, x, ly + 3, { scale: 1, color: open ? '#3c3a35' : '#8b8780', align: 'center' });
  }

  return { init, enter, update, render, click, hover: hoverAt, get busy() { return !!travel; } };
})();
