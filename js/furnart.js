// ---- Furniture, drawn properly -------------------------------------------------------
// The Captain's stock, each piece painted pixel by pixel at a size that leaves
// room for the details that sell it: deep diamond tufting and a button in
// every dimple, gold piping, pleated aprons, rolled arms, brass nailheads,
// turned legs, fringe on the lamp shade and the rug. Everything is lit from
// the upper left, three or four tones to a colour. Props uses these in place
// of its own sketches whenever a key is in here.
const FurnArt = (() => {
  const R = (g, x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
  const P = (g, x, y, c) => R(g, x, y, 1, 1, c);
  const E = (g, x, y, rx, ry, c) => Art.ell(g, x, y, rx, ry, c);
  const VEL = ['#3e0812', '#6e1020', '#a41c34', '#d63a50', '#ff7a86'];
  const OXB = ['#2a0808', '#4e1010', '#7a1c18', '#a2322a', '#cc5a44'];
  const LEA = ['#0c2a18', '#16482a', '#246a3e', '#3e9258', '#78c88a'];
  const GLD = ['#5a3606', '#9a6410', '#d8a024', '#ffdc6a', '#fff4b8'];
  const WDD = ['#261204', '#442410', '#6a3a1a', '#925428', '#bc7a40'];
  const KNT = ['#08302e', '#0e5450', '#187c74', '#34a898', '#7ad8c8'];

  // a turned leg or a ball foot in gold or wood
  function foot(g, x, y, h, ramp) {
    R(g, x, y, 4, h, ramp[1]); R(g, x, y, 2, h, ramp[2]); P(g, x, y, ramp[3]);
    E(g, x + 2, y + h - 1, 2.6, 1.8, ramp[1]); P(g, x + 1, y + h - 2, ramp[3]);
  }
  // deep diamond tufting across a panel: a button in each dimple, pleats between
  function tuft(g, x0, y0, w, h, ramp, step = 7) {
    for (let row = 0, y = y0 + 3; y < y0 + h - 2; y += step * 0.72, row++) {
      for (let x = x0 + 3 + (row % 2 ? step / 2 : 0); x < x0 + w - 2; x += step) {
        // the dimple, the pleat lines running off it, the button in it
        P(g, x - 1, y, ramp[0]); P(g, x + 1, y, ramp[0]); P(g, x, y - 1, ramp[0]);
        for (let k = 1; k < 3; k++) { P(g, x - k - 1, y - k, ramp[1]); P(g, x + k + 1, y - k, ramp[1]); }
        P(g, x - 2, y + 1, ramp[3]); P(g, x + 2, y + 1, ramp[3]);
        R(g, x, y, 1, 1, ramp[0]); P(g, x - 1, y - 1, ramp[4]);
      }
    }
  }
  // a row of brass nailheads
  function nails(g, x0, x1, y, step = 3) { for (let x = x0; x <= x1; x += step) { P(g, x, y, GLD[3]); P(g, x + 1, y, GLD[1]); } }
  // gold piping along an edge
  function piping(g, x, y, w) { R(g, x, y, w, 1, GLD[3]); R(g, x, y + 1, w, 1, GLD[1]); for (let i = x + 1; i < x + w; i += 3) P(g, i, y, GLD[4]); }

  const A = {
    ottoman: (g, w, h) => ottomanOf(g, w, h, VEL, GLD),
    lostottoman: (g, w, h) => {
      ottomanOf(g, w, h, ['#6a5a24', '#a08c3e', '#cab45a', '#e2d27a', '#f6ecb0'], ['#5a5a52', '#7a7a70', '#a4a498', '#cacac0', '#eeeee6']);
      for (let i = 0; i < 30; i++) P(g, 3 + (i * 7) % (w - 6), 3 + (i * 5) % (h - 10), i % 3 ? '#8a7a36' : '#f6ecb0');   // carpet pile
      E(g, w * 0.66, h * 0.52, 5, 2, 'rgba(90,70,20,0.45)');                                                // a damp patch
    },
    pouf: (g, w, h) => {
      const cx = w / 2, top = 5;
      E(g, cx, h - 5, w / 2 - 1, 4, KNT[0]);
      R(g, 1, top + 1, w - 2, h - top - 6, KNT[1]);
      // chunky cable knit: plaited columns, lit on their left
      for (let x = 2; x < w - 2; x += 5) {
        for (let y = top + 2; y < h - 6; y += 3) {
          R(g, x, y, 3, 2, KNT[2]); P(g, x, y, KNT[3]); P(g, x + 2, y + 1, KNT[1]);
        }
        R(g, x + 3, top + 2, 1, h - top - 8, KNT[0]);
      }
      R(g, 1, top + 1, 3, h - top - 6, 'rgba(255,255,255,0.12)');
      R(g, w - 5, top + 1, 4, h - top - 6, 'rgba(0,0,0,0.22)');
      E(g, cx, top + 1, w / 2 - 1, 4, KNT[2]); E(g, cx - 2, top, w / 2 - 5, 2.4, KNT[3]);
      E(g, cx, top + 1, 2, 1.4, GLD[2]); P(g, cx - 1, top, GLD[4]);
    },
    armchair: (g, w, h) => {
      const L = LEA;
      // the tall back, deep buttoned, with the wings curving forward
      R(g, 6, 2, w - 12, h - 18, L[1]);
      R(g, 7, 2, w - 14, 2, L[3]);
      tuft(g, 8, 4, w - 16, h - 22, L, 6);
      for (const s of [0, 1]) {
        const x = s ? w - 9 : 1;
        R(g, x, 6, 8, h - 20, L[s ? 1 : 2]); E(g, x + 4, 7, 4, 4, L[s ? 1 : 3]); R(g, x + (s ? 0 : 1), 8, 2, h - 24, L[s ? 0 : 4]);
      }
      // rolled arms with scrolled fronts and a line of nailheads
      for (const s of [0, 1]) {
        const x = s ? w - 10 : 0;
        R(g, x, h - 22, 10, 12, L[s ? 1 : 2]);
        E(g, x + 5, h - 22, 5, 3, L[s ? 2 : 3]); R(g, x + 1, h - 23, 8, 1, L[4]);
        E(g, x + 5, h - 16, 3, 3, L[0]); E(g, x + 5, h - 16, 2, 2, L[s ? 2 : 3]);     // the scroll
        nails(g, x + 1, x + 8, h - 11);
      }
      // the seat cushion, plump
      R(g, 9, h - 17, w - 18, 7, L[2]); R(g, 9, h - 17, w - 18, 2, L[4]); R(g, 9, h - 11, w - 18, 1, L[0]);
      R(g, w / 2, h - 16, 1, 5, L[1]);
      // the skirt and the turned legs
      R(g, 2, h - 10, w - 4, 4, L[1]); nails(g, 3, w - 5, h - 9, 3);
      foot(g, 4, h - 6, 6, WDD); foot(g, w - 8, h - 6, 6, WDD);
    },
    sofa: (g, w, h) => {
      const L = OXB;
      // a Chesterfield: back and arms the same height, all of it buttoned
      R(g, 8, 4, w - 16, h - 18, L[1]);
      R(g, 8, 4, w - 16, 2, L[3]);
      tuft(g, 10, 6, w - 20, h - 22, L, 7);
      piping(g, 8, 3, w - 16);
      for (const s of [0, 1]) {
        const x = s ? w - 12 : 0;
        R(g, x, 8, 12, h - 18, L[s ? 1 : 2]);
        E(g, x + 6, 9, 6, 4, L[s ? 2 : 3]); R(g, x + 2, 6, 8, 1, L[4]);
        // the pleated fan on the front of the roll
        for (let k = 0; k < 5; k++) { const a = Math.PI * (0.15 + k * 0.18); P(g, x + 6 + Math.cos(a) * 3, 10 + Math.sin(a) * 3, L[0]); }
        E(g, x + 6, 11, 1.5, 1.5, L[0]);
        tuft(g, x + 1, 14, 10, h - 26, L, 5);
      }
      // three seat cushions
      for (let i = 0; i < 3; i++) {
        const cw = (w - 24) / 3, x = 12 + i * cw;
        R(g, x, h - 16, cw - 1, 7, L[2]); R(g, x, h - 16, cw - 1, 2, L[4]); R(g, x, h - 10, cw - 1, 1, L[0]);
        P(g, x + 1, h - 15, '#ffb0a0');
      }
      R(g, 2, h - 9, w - 4, 4, L[1]); nails(g, 3, w - 5, h - 8, 3);
      for (const x of [4, w / 2 - 2, w - 8]) { E(g, x + 2, h - 3, 2.6, 2.4, GLD[1]); P(g, x + 1, h - 4, GLD[3]); }
    },
    rug: (g, w, h) => {
      const C = { r0: '#5a0e16', r1: '#9a1c24', r2: '#c83a30', gold: '#e8a830', navy: '#16306a', navy2: '#28509a', cream: '#f4e2b8', grn: '#2a6a4a' };
      R(g, 3, 1, w - 6, h - 2, C.r0);
      R(g, 4, 2, w - 8, h - 4, C.navy);                       // the outer border
      for (let x = 6; x < w - 6; x += 4) { P(g, x, 3, C.gold); P(g, x + 2, h - 4, C.gold); }
      R(g, 7, 4, w - 14, h - 8, C.r1);                        // the field
      for (let y = 5; y < h - 5; y += 2) for (let x = 9 + (y % 4 ? 2 : 0); x < w - 9; x += 5) P(g, x, y, C.r2);
      // the medallion in the middle, and a corner piece at each end
      const cx = w / 2, cy = h / 2;
      Art.poly(g, [[cx, cy - 5], [cx + 12, cy], [cx, cy + 5], [cx - 12, cy]], C.navy2);
      Art.poly(g, [[cx, cy - 3], [cx + 7, cy], [cx, cy + 3], [cx - 7, cy]], C.gold);
      R(g, cx - 1, cy - 1, 3, 2, C.cream); P(g, cx, cy - 2, C.grn); P(g, cx, cy + 1, C.grn);
      for (const x of [12, w - 14]) { Art.poly(g, [[x, cy - 3], [x + 3, cy], [x, cy + 3], [x - 3, cy]], C.gold); P(g, x, cy, C.r0); }
      // the fringe at each end
      for (let y = 2; y < h - 2; y += 2) { R(g, 0, y, 3, 1, C.cream); R(g, w - 3, y, 3, 1, C.cream); }
    },
    lamp: (g, w, h) => {
      const cx = Math.floor(w / 2);
      // the base: a brass dish on three feet
      E(g, cx, h - 3, 8, 2.6, GLD[0]); E(g, cx, h - 4, 7, 2, GLD[2]); E(g, cx - 2, h - 5, 3, 1, GLD[4]);
      // the pole: turned brass, with a knop halfway
      R(g, cx - 1, 22, 3, h - 26, GLD[1]); R(g, cx - 1, 22, 1, h - 26, GLD[3]);
      E(g, cx, h * 0.6, 2.6, 2, GLD[2]); P(g, cx - 1, h * 0.6 - 1, GLD[4]);
      // the shade: pleated silk, glowing, fringed
      Art.poly(g, [[2, 22], [w - 2, 22], [w - 5, 3], [5, 3]], '#8a1a3a');
      Art.poly(g, [[3, 21], [cx, 21], [cx - 1, 4], [6, 4]], '#d0385e');
      Art.poly(g, [[cx, 21], [w - 3, 21], [w - 6, 4], [cx + 1, 4]], '#a8264a');
      for (let x = 5; x < w - 4; x += 2) R(g, x, 5, 1, 16, 'rgba(0,0,0,0.12)');          // the pleats
      R(g, 5, 3, w - 10, 1, '#ff9ab4'); R(g, 3, 21, w - 6, 1, '#6a0e28');
      for (let x = 2; x < w - 2; x += 2) { R(g, x, 22, 1, 3 + (x % 4 ? 1 : 0), GLD[2]); P(g, x, 22, GLD[4]); }
      E(g, cx, 21, 6, 1.4, 'rgba(255,240,170,0.8)');                                     // light spilling from under it
    },
    shelf: (g, w, h) => {
      // the carcass: a crown on top, a plinth below, the back in shadow
      R(g, 0, 3, w, h - 3, WDD[1]); R(g, 0, 3, 2, h - 3, WDD[3]); R(g, w - 2, 3, 2, h - 3, WDD[0]);
      R(g, -0, 0, w, 4, WDD[2]); R(g, 0, 0, w, 1, WDD[4]); R(g, 0, h - 4, w, 4, WDD[2]); R(g, 0, h - 4, w, 1, WDD[3]);
      R(g, 3, 4, w - 6, h - 8, '#1e0e04');
      const BK = [['#b82a2a', '#e04a3a'], ['#1c4a98', '#3a70c8'], ['#d8a020', '#f4c840'], ['#2a7a48', '#48a468'], ['#7a3a98', '#a060c0'], ['#d86a2a', '#f08a48'], ['#e8dcc0', '#ffffff'], ['#3a2a1a', '#5a4430']];
      const rows = 4, rh = (h - 8) / rows;
      for (let r = 0; r < rows; r++) {
        const y1 = 4 + (r + 1) * rh;
        R(g, 3, y1 - 2, w - 6, 2, WDD[3]); R(g, 3, y1 - 2, w - 6, 1, WDD[4]);
        let x = 4, i = r * 5;
        while (x < w - 6) {
          if (r === 1 && x > w - 16 && x < w - 8) {                                         // a globe on one shelf
            E(g, x + 4, y1 - 7, 4, 4, '#2a6ab8'); E(g, x + 3, y1 - 8, 2, 2, '#4ac070'); P(g, x + 2, y1 - 9, '#ffffff'); R(g, x + 3, y1 - 3, 3, 1, GLD[2]); x += 9; continue;
          }
          const bw = 2 + (i * 7) % 3, bh = Math.min(rh - 3, 7 + (i * 5) % 4), col = BK[i % BK.length];
          const lean = r === 2 && i % 7 === 3;
          if (lean) { Art.poly(g, [[x, y1 - 2], [x + 2, y1 - 2], [x + 5, y1 - 2 - bh + 1], [x + 3, y1 - 2 - bh]], col[0]); x += 6; i++; continue; }
          R(g, x, y1 - 2 - bh, bw, bh, col[0]); R(g, x, y1 - 2 - bh, 1, bh, col[1]);
          P(g, x, y1 - bh + 1, GLD[3]); if (bw > 2) P(g, x + 1, y1 - bh + 1, GLD[3]);        // gold lettering
          x += bw + (i % 4 === 0 ? 1 : 0); i++;
        }
      }
      // a pot plant on the crown
      R(g, w - 12, -1, 7, 4, '#b8603a'); for (const [dx, dy] of [[-2, -4], [1, -6], [4, -4], [2, -3]]) E(g, w - 9 + dx, -1 + dy, 2.4, 1.6, '#3a8a3a');
    },
    hammock: (g, w, h) => {
      // two stout posts with a cap each
      for (const x of [2, w - 8]) { R(g, x, 3, 6, h - 3, WDD[2]); R(g, x, 3, 2, h - 3, WDD[4]); R(g, x + 5, 3, 1, h - 3, WDD[0]); R(g, x - 1, 1, 8, 3, WDD[1]); }
      const sag = (u) => 9 + Math.sin(u * Math.PI) * 16;
      // the ropes out to the rings
      for (const [x0, x1] of [[7, 14], [w - 7, w - 14]]) Art.limb(g, x0, 6, x1, sag(x0 < w / 2 ? 0.08 : 0.92), 1, 1, '#c8a060');
      // the cloth: a fat sagging band in stripes, lit along its top edge
      for (let x = 12; x < w - 12; x++) {
        const u = (x - 12) / (w - 24), y = sag(0.08 + u * 0.84);
        const c = Math.floor(x / 5) % 2 ? '#f4e0a0' : '#d8503a';
        R(g, x, y, 1, 8, c); P(g, x, y, '#fff4d0'); R(g, x, y + 7, 1, 1, '#7a2a14');
        if (x % 3 === 0) R(g, x, y + 8, 1, 2, '#c8a060');                                    // fringe
      }
      // a cushion in it
      const cu = sag(0.4);
      E(g, w * 0.36, cu + 1, 7, 3, '#3a70c8'); E(g, w * 0.35, cu, 5, 2, '#6a98e0');
    },
    deck: (g, w, h) => {
      // seen from the front, leaning back: two rails, a slung canvas in
      // wide stripes that bellies where you sit, arms, a front bar, splayed legs
      const top = 2, seat = h - 11;
      const lx = (y) => 5 + (y - top) * 0.1, rx = (y) => w - 6 - (y - top) * 0.1;
      const ST = [['#c8402c', '#e8604a', '#9a2a1c'], ['#f8f0dc', '#ffffff', '#d8ccb0'], ['#2a6ad0', '#5a90e8', '#1a4a9a']];
      for (let y = top + 1; y < seat + 3; y++) {
        const sag = y > seat - 8 ? Math.round(Math.sin(((y - (seat - 8)) / 11) * Math.PI) * 2) : 0;
        const x0 = lx(y) + 2, x1 = rx(y) - 1;
        for (let x = Math.round(x0); x < x1; x++) {
          const k = Math.floor((x - x0) / 4) % 3, cc = ST[k === 2 ? 0 : k === 1 ? 1 : 2];
          const lit = y < top + 4 ? 1 : (y > seat - 2 + sag ? 2 : 0);
          R(g, x, y + sag * 0, 1, 1, cc[lit]);
        }
      }
      // the belly of the sling, shaded under the sitter
      for (let x = Math.round(lx(seat) + 3); x < rx(seat) - 2; x++) P(g, x, seat - 4, 'rgba(0,0,0,0.12)');
      // the rails, lit on the left
      for (const f of [lx, rx]) for (let y = top; y < h - 1; y++) { R(g, f(y), y, 2, 1, WDD[3]); P(g, f(y), y, WDD[4]); }
      R(g, lx(top) - 1, top - 1, 4, 2, WDD[3]); R(g, rx(top) - 1, top - 1, 4, 2, WDD[3]);
      // the arms, reaching forward
      R(g, 1, seat - 7, 8, 2, WDD[3]); R(g, 1, seat - 7, 8, 1, WDD[4]);
      R(g, w - 9, seat - 7, 8, 2, WDD[3]); R(g, w - 9, seat - 7, 8, 1, WDD[4]);
      R(g, 2, seat - 5, 2, h - seat + 4, WDD[2]); R(g, w - 4, seat - 5, 2, h - seat + 4, WDD[2]);
      // the front bar the canvas wraps round, and a brass stud each end
      R(g, lx(seat), seat + 2, rx(seat) - lx(seat) + 2, 3, WDD[2]); R(g, lx(seat), seat + 2, rx(seat) - lx(seat) + 2, 1, WDD[4]);
      P(g, lx(seat) + 1, seat + 3, GLD[3]); P(g, rx(seat), seat + 3, GLD[3]);
      R(g, 1, h - 2, w - 2, 1, WDD[1]);
    },
    helm: (g, w, h) => {
      const cx = w / 2, cy = 19, rO = 18, rI = 11;
      R(g, cx - 4, cy + 4, 8, h - cy - 8, WDD[2]); R(g, cx - 4, cy + 4, 2, h - cy - 8, WDD[4]);
      R(g, cx - 11, h - 5, 22, 5, WDD[1]); R(g, cx - 11, h - 5, 22, 1, WDD[3]);
      for (let i = 0; i < 8; i++) {                                                                   // spokes ending in turned handles
        const a = (i / 8) * TAU;
        Art.limb(g, cx, cy, cx + Math.cos(a) * (rO + 4), cy + Math.sin(a) * (rO + 4), 2.4, 2.4, WDD[3]);
        E(g, cx + Math.cos(a) * (rO + 5), cy + Math.sin(a) * (rO + 5), 2.4, 2.4, WDD[4]);
      }
      // the rim: a wooden ring with brass bands
      for (let k = 0; k < 64; k++) {
        const a = (k / 64) * TAU;
        for (let r2 = rI; r2 <= rI + 3; r2++) P(g, cx + Math.cos(a) * r2, cy + Math.sin(a) * r2, r2 === rI + 3 ? WDD[1] : a > 3.4 && a < 5.6 ? WDD[4] : WDD[3]);
      }
      for (let k = 0; k < 8; k++) { const a = (k / 8) * TAU + 0.39; E(g, cx + Math.cos(a) * (rI + 1.5), cy + Math.sin(a) * (rI + 1.5), 1.4, 1.4, GLD[2]); }
      E(g, cx, cy, 4, 4, GLD[1]); E(g, cx - 1, cy - 1, 2.4, 2.4, GLD[3]); P(g, cx - 2, cy - 2, GLD[4]);
    },
    anchor: (g, w, h) => {
      const cx = Math.floor(w / 2), IR = ['#24242c', '#3c3c48', '#5c5c6c', '#8a8a9c'], RU = '#a8501c';
      // the ring at the top, the stock across, the shank down, the arms and flukes
      for (let k = 0; k < 40; k++) { const a = (k / 40) * TAU; R(g, cx + Math.cos(a) * 4.5 - 1, 6 + Math.sin(a) * 4.5 - 1, 2, 2, a > 3 && a < 5 ? IR[3] : IR[1]); }
      R(g, cx - 12, 13, 24, 4, IR[1]); R(g, cx - 12, 13, 24, 1, IR[3]); E(g, cx - 12, 15, 2, 2.4, IR[2]); E(g, cx + 12, 15, 2, 2.4, IR[2]);
      R(g, cx - 2, 10, 5, h - 18, IR[1]); R(g, cx - 2, 10, 2, h - 18, IR[3]);
      for (let i = 0; i <= 16; i++) { const u = i / 16, a = Math.PI * (0.08 + u * 0.84); R(g, cx + Math.cos(a) * 15 - 2, h - 20 + Math.sin(a) * 14 - 2, 5, 5, IR[u < 0.5 ? 1 : 2]); }
      for (const s of [-1, 1]) Art.poly(g, [[cx + s * 16, h - 20], [cx + s * 10, h - 23], [cx + s * 13, h - 13]], IR[2]);
      for (let i = 0; i < 14; i++) R(g, cx - 12 + (i * 7) % 24, 12 + (i * 11) % (h - 14), 2, 1, RU);   // rust
      // a turn of old rope round the shank
      for (let i = 0; i < 6; i++) R(g, cx - 4, 20 + i * 2, 9, 1, i % 2 ? '#c8a060' : '#e8c880');
    },
  };
  function ottomanOf(g, w, h, L, F) {
    // ball feet, a pleated apron with piping, and a deep buttoned top that
    // rolls over the edge
    foot(g, 4, h - 6, 6, F); foot(g, w - 8, h - 6, 6, F);
    R(g, 1, 10, w - 2, h - 16, L[1]);
    for (let x = 2; x < w - 2; x += 3) { R(g, x, 12, 1, h - 19, L[2]); P(g, x + 1, 12, L[0]); }
    piping(g, 1, h - 7, w - 2);
    R(g, 0, 3, w, 9, L[2]); R(g, 1, 2, w - 2, 1, L[3]); R(g, 2, 1, w - 4, 1, L[4]);
    R(g, 0, 10, w, 2, L[1]);
    tuft(g, 1, 2, w - 2, 9, L, 7);
    piping(g, 0, 11, w);
    R(g, w - 3, 3, 3, 8, 'rgba(0,0,0,0.2)');
  }
  // ---- the garden pieces from the shop in the village --------------------------------
  const PAL = ['#6a4020', '#94602c', '#c08a48', '#e0b46c', '#f6d898'];   // split, weathered pine
  const STN = ['#2e2c34', '#4c4a56', '#6e6c7a', '#9694a2', '#c4c2cc'];   // field stone
  const MOS = ['#2e4a1c', '#4a7a2a', '#78a840'];
  const IRN = ['#1a1a20', '#34343e', '#5a5a68', '#8a8a9a'];
  // a mossy tuft and a pale mushroom at the foot of things
  function moss(g, x, y, n = 5) { for (let i = 0; i < n; i++) { P(g, x + i, y - (i % 2), MOS[1]); P(g, x + i, y, MOS[0]); } P(g, x + 1, y - 1, MOS[2]); }
  function shroom(g, x, y) { R(g, x, y - 2, 1, 2, '#f0e8d0'); R(g, x - 1, y - 3, 3, 1, '#d04a3a'); P(g, x, y - 3, '#ff9a8a'); }
  // a plank seen from above-front: a lit top face with grain, and a darker edge
  function plank(g, x, y, w, top, edge, ramp) {
    R(g, x, y, w, top, ramp[3]); R(g, x, y, w, 1, ramp[4]);
    for (let i = 0; i < w; i += 7) { R(g, x + i + 2, y + 1 + (i % 2), 4, 1, ramp[2]); }
    R(g, x, y + top, w, edge, ramp[1]); R(g, x, y + top + edge - 1, w, 1, ramp[0]);
    P(g, x + 3, y + top + 1, ramp[0]); P(g, x + w - 5, y + top + 1, ramp[0]);   // nail heads
  }
  // a stone block with a lit top and left edge, a crack and a chip
  function stone(g, x, y, w, h, ramp = STN) {
    R(g, x, y, w, h, ramp[2]); R(g, x, y, w, 1, ramp[4]); R(g, x, y, 1, h, ramp[3]);
    R(g, x, y + h - 1, w, 1, ramp[0]); R(g, x + w - 1, y, 1, h, ramp[1]);
    if (w > 5) { P(g, x + (w >> 1), y + 2, ramp[1]); P(g, x + (w >> 1) + 1, y + 3, ramp[1]); }
  }
  Object.assign(A, {
    bench: (g, w, h) => {
      // a split log on two rounds, bark on the front, rings on the ends
      for (const lx of [7, w - 18]) {
        R(g, lx, 12, 11, h - 13, WDD[2]);
        for (let i = 1; i < 11; i += 3) R(g, lx + i, 13, 1, h - 15, WDD[1]);
        R(g, lx, 12, 2, h - 13, WDD[3]); R(g, lx, h - 2, 11, 1, WDD[0]);
      }
      R(g, 2, 6, w - 4, 5, PAL[3]); R(g, 2, 6, w - 4, 1, PAL[4]);
      for (let x = 5; x < w - 6; x += 6) R(g, x, 8 + (x % 2), 4, 1, PAL[2]);
      R(g, 1, 11, w - 2, 6, WDD[2]);
      for (let x = 3; x < w - 3; x += 3) { R(g, x, 12, 1, 4, WDD[1]); P(g, x + 1, 11, WDD[3]); }
      R(g, 1, 16, w - 2, 1, WDD[0]);
      for (const ex of [3, w - 4]) { E(g, ex, 11, 2.6, 5, PAL[3]); E(g, ex, 11, 1.6, 3.4, PAL[2]); P(g, ex, 11, PAL[1]); }
      // a cushion somebody left out, and a bit of the wood coming back
      R(g, 12, 3, 12, 4, '#c8503a'); R(g, 12, 3, 12, 1, '#e8806a'); P(g, 18, 5, '#8a2a1a');
      moss(g, 6, h - 2); shroom(g, w - 5, h - 1);
    },
    table: (g, w, h) => {
      // two trestles and a thick top, a gingham runner, a jug and a pie
      const ty = 12;
      for (const lx of [8, w - 16]) {
        Art.limb(g, lx, ty + 6, lx + 8, h - 2, 1.6, 1.6, WDD[2]); Art.limb(g, lx + 8, ty + 6, lx, h - 2, 1.6, 1.6, WDD[3]);
        R(g, lx - 2, h - 3, 12, 2, WDD[1]);
      }
      R(g, 10, h - 11, w - 20, 2, WDD[2]); R(g, 10, h - 11, w - 20, 1, WDD[3]);   // the stretcher
      plank(g, 1, ty, w - 2, 4, 4, PAL);
      for (let x = 12; x < w - 12; x += 12) R(g, x, ty, 1, 4, PAL[2]);            // plank joins
      // gingham runner, hanging over the front
      for (let x = 18; x < w - 18; x++) for (let y = ty; y < ty + 9; y++) {
        const c = ((x >> 1) + (y >> 1)) % 2 ? '#e84a4a' : '#fff4e8';
        if (y < ty + 4 || (y < ty + 9 - ((x % 5) === 0 ? 1 : 0))) P(g, x, y, c);
      }
      R(g, 18, ty + 8, w - 36, 1, '#a02a2a');
      // the jug
      R(g, 22, ty - 9, 7, 9, '#4a7ac8'); R(g, 22, ty - 9, 2, 9, '#7aa8e8'); R(g, 23, ty - 10, 5, 1, '#2a4a8a');
      R(g, 29, ty - 7, 2, 1, '#2a4a8a'); R(g, 30, ty - 7, 1, 4, '#2a4a8a'); R(g, 23, ty - 6, 5, 1, '#fff4e8');
      // the pie, steaming a bit
      E(g, w - 26, ty - 1, 7, 2.5, '#c88a3a'); E(g, w - 26, ty - 2, 6, 2, '#e8b060');
      for (let i = -4; i <= 4; i += 2) P(g, w - 26 + i, ty - 2, '#a86a2a');
      P(g, w - 28, ty - 6, 'rgba(255,255,255,0.6)'); P(g, w - 27, ty - 8, 'rgba(255,255,255,0.45)'); P(g, w - 24, ty - 7, 'rgba(255,255,255,0.5)');
    },
    lantern: (g, w, h) => {
      // a post with an arm, and a candle lantern hanging off it
      const px = 5;
      stone(g, 1, h - 5, 11, 5);
      R(g, px, 4, 4, h - 9, WDD[2]); R(g, px, 4, 1, h - 9, WDD[3]); R(g, px + 3, 4, 1, h - 9, WDD[1]);
      R(g, px - 1, 3, 15, 2, WDD[3]); R(g, px - 1, 3, 15, 1, WDD[4]); R(g, px + 3, 5, 3, 1, WDD[2]); R(g, px + 4, 6, 1, 1, WDD[2]);
      const lx = w - 7;
      R(g, lx, 5, 1, 3, IRN[2]);                                   // the ring
      g.fillStyle = 'rgba(255,220,120,0.18)'; E(g, lx, 17, 8, 9);   // the glow in the glass
      R(g, lx - 4, 8, 9, 2, IRN[1]); R(g, lx - 3, 7, 7, 1, IRN[2]); // the roof
      R(g, lx - 4, 10, 9, 11, IRN[1]);
      R(g, lx - 3, 11, 3, 9, '#ffd860'); R(g, lx + 1, 11, 3, 9, '#ffc040');
      R(g, lx - 2, 12, 1, 3, '#fff6c0');
      R(g, lx, 10, 1, 11, IRN[1]);
      R(g, lx - 1, 15, 2, 4, '#fff8e0'); P(g, lx - 1, 13, '#ff8a20'); P(g, lx, 14, '#ffe080');   // the candle
      R(g, lx - 4, 21, 9, 2, IRN[1]); R(g, lx - 2, 23, 5, 1, IRN[2]);
      moss(g, 1, h - 5, 4);
    },
    barrel: (g, w, h) => {
      // oak staves bellied out, three iron hoops with rivets, rain on top, a tap
      for (let y = 4; y < h - 1; y++) {
        const u = (y - 4) / (h - 5), bul = Math.round(Math.sin(u * Math.PI) * 2);
        const x0 = 3 - bul, x1 = w - 3 + bul;
        for (let x = x0; x < x1; x++) {
          const k = Math.floor((x - x0) / 5);
          const edge = (x - x0) % 5 === 0;
          const lit = x < x0 + 3 ? 4 : x > x1 - 5 ? 1 : 3 - (k % 2);
          P(g, x, y, edge ? WDD[1] : WDD[lit]);
        }
      }
      for (const hy of [7, (h >> 1) + 1, h - 6]) {
        const bul = Math.round(Math.sin(((hy - 4) / (h - 5)) * Math.PI) * 2);
        R(g, 3 - bul, hy, w - 6 + bul * 2, 2, IRN[1]); R(g, 3 - bul, hy, w - 6 + bul * 2, 1, IRN[3]);
        for (let x = 5 - bul; x < w - 4 + bul; x += 6) P(g, x, hy + 1, IRN[3]);
      }
      E(g, w / 2, 4, w / 2 - 3, 3, WDD[1]); E(g, w / 2, 4, w / 2 - 5, 2, '#3a7ab8');
      R(g, w / 2 - 6, 3, 4, 1, '#a8dcf8'); P(g, w / 2 + 3, 4, '#7ab8e8');
      // the tap, with a drip
      R(g, w - 6, h - 12, 5, 2, '#d8a024'); R(g, w - 3, h - 10, 2, 2, '#b08018'); P(g, w - 2, h - 7, '#7ab8e8');
    },
    trough2: (g, w, h) => {
      // one block of stone, hollowed: a lip, water with the sky in it, moss
      R(g, 2, 5, w - 4, h - 6, STN[2]);
      for (let x = 2; x < w - 2; x += 9) R(g, x, 9, 1, h - 11, STN[1]);          // tool marks
      R(g, 2, h - 2, w - 4, 1, STN[0]);
      R(g, 1, 3, w - 2, 4, STN[3]); R(g, 1, 3, w - 2, 1, STN[4]);                // the lip
      R(g, 4, 4, w - 8, 3, '#2e6aa0'); R(g, 4, 4, w - 8, 1, '#4a8ac0');
      R(g, 8, 5, 6, 1, '#b8e4f8'); R(g, w - 16, 5, 3, 1, '#8ac8f0');
      R(g, 1, 7, w - 2, 1, STN[1]);
      // a chip out of the corner and a lick of moss up the side
      R(g, w - 5, 3, 3, 2, STN[1]); moss(g, 3, h - 2, 7); moss(g, w - 14, h - 2, 4);
      for (let i = 0; i < 4; i++) P(g, 2, 8 + i * 3, MOS[1]);
    },
    scare: (g, w, h) => {
      // a sack head with button eyes and a stitched grin, a straw hat, a
      // checked shirt with a patch, straw at the cuffs, and a crow on the arm
      const cx = w >> 1;
      R(g, cx - 1, 20, 3, h - 20, WDD[2]); R(g, cx - 1, 20, 1, h - 20, WDD[3]);
      R(g, 2, 24, w - 4, 3, WDD[2]); R(g, 2, 24, w - 4, 1, WDD[3]);
      // shirt
      for (let y = 22; y < 40; y++) for (let x = cx - 8; x <= cx + 8; x++) P(g, x, y, ((x >> 1) + (y >> 1)) % 2 ? '#c84a3a' : '#a0302a');
      for (let y = 23; y < 29; y++) for (let x = 3; x < w - 3; x++) if (x < cx - 8 || x > cx + 8) P(g, x, y, ((x >> 1) + (y >> 1)) % 2 ? '#c84a3a' : '#a0302a');
      R(g, cx + 2, 31, 5, 5, '#4a7ac8'); P(g, cx + 2, 31, '#fff'); P(g, cx + 6, 35, '#fff');   // the patch
      R(g, cx - 1, 23, 2, 16, '#6a1a14');
      for (const sx of [1, w - 3]) for (let i = 0; i < 4; i++) R(g, sx + (i % 2), 23 + i * 2, 2, 1, '#f0c848');
      for (let i = 0; i < 5; i++) R(g, cx - 6 + i * 3, 40, 1, 3 + (i % 2), '#f0c848');
      // the head
      E(g, cx, 14, 7, 7, '#d8b880'); E(g, cx - 2, 12, 4, 4, '#ecd4a0');
      R(g, cx - 4, 12, 2, 2, IRN[0]); R(g, cx + 2, 12, 2, 2, IRN[0]); P(g, cx - 4, 12, '#fff'); P(g, cx + 2, 12, '#fff');
      for (let i = -3; i <= 3; i++) P(g, cx + i, 17 + (Math.abs(i) === 3 ? -1 : 0), '#6a3a1a');
      for (let i = -2; i <= 2; i += 2) P(g, cx + i, 18, '#6a3a1a');
      P(g, cx - 6, 15, '#e88a7a'); P(g, cx + 6, 15, '#e88a7a');
      R(g, cx - 3, 20, 7, 2, '#8a5a2a');                        // the twine at the neck
      // the hat
      R(g, cx - 11, 7, 23, 2, '#e0b448'); R(g, cx - 11, 7, 23, 1, '#f8d870');
      R(g, cx - 6, 2, 13, 5, '#d0a038'); R(g, cx - 6, 2, 13, 1, '#f0cc60'); R(g, cx - 6, 5, 13, 1, '#c8403a');
      // the crow, not scared in the least
      const bx = w - 6;
      E(g, bx, 21, 3, 2.4, IRN[0]); E(g, bx + 1, 18, 2, 2, IRN[0]); P(g, bx + 1, 18, '#fff');
      R(g, bx + 3, 18, 2, 1, '#e0a020'); R(g, bx - 4, 21, 2, 1, IRN[0]);
    },
    hive: (g, w, h) => {
      // a coiled straw skep on a little wooden stand, bees coming and going
      R(g, 3, h - 7, w - 6, 3, WDD[3]); R(g, 3, h - 7, w - 6, 1, WDD[4]);
      R(g, 5, h - 4, 3, 4, WDD[2]); R(g, w - 8, h - 4, 3, 4, WDD[2]);
      const cx = w / 2, top = 5, bot = h - 7;
      for (let y = top, row = 0; y < bot; y += 3, row++) {
        const u = (y - top) / (bot - top), rw = Math.round(3 + Math.sin(Math.min(1, u * 1.3) * Math.PI / 2) * (w / 2 - 4));
        R(g, cx - rw, y, rw * 2, 3, '#d8a840'); R(g, cx - rw, y, rw * 2, 1, '#f8d880'); R(g, cx - rw, y + 2, rw * 2, 1, '#a87820');
        for (let x = cx - rw + 2 + (row % 2) * 2; x < cx + rw - 1; x += 4) P(g, x, y + 1, '#b88a28');
      }
      R(g, cx - 1, 2, 3, 3, '#c89838'); P(g, cx, 2, '#f8d880');
      E(g, cx, bot - 3, 3, 2, '#3a2008'); R(g, cx - 4, bot - 1, 9, 1, WDD[3]);
      for (const [bx, by] of [[3, 8], [w - 5, 12], [w - 8, 3]]) { R(g, bx, by, 2, 1, '#2a1a08'); P(g, bx, by - 1, '#f8e040'); P(g, bx + 1, by - 1, '#ffffff'); }
    },
    arch: (g, w, h) => {
      // two bent willow posts meeting overhead, with a climbing rose all over it
      const L = 6, Rt = w - 7, top = 6, spring = 24;
      for (const x of [L, Rt]) { R(g, x, spring, 4, h - spring, WDD[2]); R(g, x, spring, 1, h - spring, WDD[3]); for (let y = spring + 3; y < h; y += 6) P(g, x + 2, y, WDD[1]); }
      const cx = w / 2, rx = (Rt - L) / 2, ry = spring - top;
      for (let i = 0; i <= 40; i++) {
        const a = Math.PI + (i / 40) * Math.PI, x = cx + Math.cos(a) * rx + 0.5, y = spring + Math.sin(a) * ry;
        R(g, x, y, 4, 4, WDD[2]); P(g, x, y, WDD[3]);
      }
      // the rose: a twining stem, leaves, and blooms in three pinks
      const rng = Art.rng(7);
      for (let i = 0; i <= 60; i++) {
        const u = i / 60, side = u < 0.5 ? 0 : 1;
        let x, y;
        if (u < 0.25) { x = L + 2 + Math.sin(u * 40) * 3; y = h - 2 - (u / 0.25) * (h - spring); }
        else if (u < 0.75) { const a = Math.PI + ((u - 0.25) / 0.5) * Math.PI; x = cx + Math.cos(a) * rx + 2 + Math.sin(u * 40) * 2; y = spring + Math.sin(a) * ry + 2; }
        else { x = Rt + 2 + Math.sin(u * 40) * 3; y = spring + ((u - 0.75) / 0.25) * (h - spring - 20); }
        P(g, x, y, MOS[0]);
        if (i % 2 === 0) { R(g, x + (rng() < 0.5 ? -2 : 1), y, 2, 2, MOS[1]); P(g, x + 1, y - 1, MOS[2]); }
        if (i % 5 === 0 && (u < 0.2 || u > 0.18)) {
          const pk = ['#e84a78', '#ff7aa0', '#c82a5a'][i % 3], bx = x + (rng() - 0.5) * 5, by = y + (rng() - 0.5) * 4;
          E(g, bx, by, 2.2, 2, pk); P(g, bx, by - 1, '#ffd0e0'); P(g, bx, by, U.shade(pk, -0.3));
        }
        void side;
      }
      stone(g, L - 2, h - 3, 8, 3); stone(g, Rt - 2, h - 3, 8, 3);
    },
    well: (g, w, h) => {
      // a round of fitted stone, a shingled roof on two posts, a winch and a bucket
      const ring = h - 20;
      for (let row = 0; row < 3; row++) for (let x = 2 + (row % 2) * 4, i = 0; x < w - 2; x += 8, i++) {
        stone(g, x, ring + row * 6, Math.min(8, w - 2 - x), 6);
      }
      R(g, 1, ring - 2, w - 2, 3, STN[3]); R(g, 1, ring - 2, w - 2, 1, STN[4]);
      R(g, 5, ring - 1, w - 10, 1, '#1a2a3a');
      moss(g, 3, h - 1, 6); moss(g, w - 12, h - 1, 5);
      // posts and roof
      for (const x of [5, w - 9]) { R(g, x, 12, 4, ring - 12, WDD[2]); R(g, x, 12, 1, ring - 12, WDD[3]); }
      for (let r = 0; r < 4; r++) {
        const y = 3 + r * 3, inset = 12 - r * 4;
        R(g, 1 + inset, y, w - 2 - inset * 2, 4, r % 2 ? '#a83a2a' : '#c84a34');
        for (let x = 1 + inset + (r % 2) * 3; x < w - 1 - inset; x += 5) R(g, x, y + 3, 1, 1, '#6a1a14');
        R(g, 1 + inset, y, w - 2 - inset * 2, 1, '#e87a5a');
      }
      R(g, w / 2 - 2, 1, 4, 2, '#8a2a1a');
      // winch, crank, rope and bucket
      R(g, 9, 17, w - 18, 3, WDD[3]); R(g, 9, 17, w - 18, 1, WDD[4]);
      for (let x = 14; x < w - 14; x += 3) P(g, x, 18, '#d8b880');
      R(g, w - 9, 18, 5, 1, IRN[2]); R(g, w - 5, 18, 1, 5, IRN[2]); R(g, w - 6, 22, 3, 2, WDD[2]);
      R(g, w / 2, 20, 1, ring - 30, '#d8b880');
      const by = ring - 11;
      R(g, w / 2 - 4, by, 9, 7, WDD[2]); R(g, w / 2 - 4, by, 2, 7, WDD[3]); R(g, w / 2 - 4, by + 1, 9, 1, IRN[2]); R(g, w / 2 - 4, by + 5, 9, 1, IRN[2]);
      R(g, w / 2 - 3, by - 1, 7, 1, '#4a8ac0');
    },
    statue: (g, w, h) => {
      // a stone wombat, sitting up, carved by somebody who had it described to
      // them: very round, very pleased, a bit too many teeth
      stone(g, 2, h - 12, w - 4, 12);
      R(g, 4, h - 9, w - 8, 1, STN[1]);
      const cx = w / 2, by = h - 22;
      E(g, cx, by, 13, 11, STN[2]); E(g, cx - 3, by - 3, 8, 7, STN[3]); E(g, cx - 5, by - 5, 3, 3, STN[4]);
      E(g, cx, by - 13, 10, 8, STN[2]); E(g, cx - 3, by - 15, 6, 4, STN[3]);
      E(g, cx - 8, by - 20, 3, 3, STN[2]); E(g, cx + 8, by - 20, 3, 3, STN[2]); P(g, cx - 8, by - 20, STN[1]); P(g, cx + 8, by - 20, STN[1]);
      R(g, cx - 5, by - 14, 2, 2, STN[0]); R(g, cx + 3, by - 14, 2, 2, STN[0]);
      E(g, cx, by - 10, 3.5, 2.4, STN[1]); R(g, cx - 2, by - 11, 4, 1, STN[0]);
      R(g, cx - 2, by - 7, 5, 1, STN[0]); for (let i = -2; i <= 2; i++) P(g, cx + i, by - 6, STN[4]);
      E(g, cx - 7, by + 1, 3, 3, STN[3]); E(g, cx + 7, by + 1, 3, 3, STN[2]);    // paws
      E(g, cx, by + 3, 6, 4, STN[3]);                                             // belly
      moss(g, 4, h - 12, 6); moss(g, cx + 4, by - 20, 3);
      for (let i = 0; i < 6; i++) P(g, 3 + i * 5, h - 4 - (i % 2), MOS[1]);
    },
    firepit: (g, w, h) => {
      // a ring of stones round a heap of ash, crossed logs, a small fire
      const cy = h - 7;
      E(g, w / 2, cy, w / 2 - 3, 5, '#3a3030'); E(g, w / 2, cy, w / 2 - 8, 3, '#6a5a50');
      Art.limb(g, 10, cy + 1, w - 12, cy - 5, 2.4, 2.4, WDD[2]); Art.limb(g, 12, cy - 5, w - 10, cy + 1, 2.4, 2.4, WDD[3]);
      E(g, w - 10, cy + 1, 1.6, 2, PAL[3]); E(g, 12, cy - 5, 1.6, 2, PAL[3]);
      // flames, three tongues
      Art.poly(g, [[w / 2 - 8, cy - 1], [w / 2 - 4, cy - 12], [w / 2, cy - 5], [w / 2 + 3, cy - 16], [w / 2 + 6, cy - 6], [w / 2 + 8, cy - 10], [w / 2 + 9, cy - 1]], '#e85020');
      Art.poly(g, [[w / 2 - 5, cy - 1], [w / 2 - 2, cy - 8], [w / 2 + 1, cy - 4], [w / 2 + 3, cy - 11], [w / 2 + 6, cy - 2]], '#ffa020');
      Art.poly(g, [[w / 2 - 1, cy - 1], [w / 2 + 2, cy - 6], [w / 2 + 4, cy - 1]], '#fff080');
      P(g, w / 2 - 7, cy - 15, '#ffb040'); P(g, w / 2 + 10, cy - 18, '#ff8020');
      // the stones, front row drawn over the fire's foot
      for (let i = 0; i < 9; i++) {
        const a = Math.PI * (i / 8), x = w / 2 - Math.cos(a) * (w / 2 - 5), y = cy + Math.sin(a) * 4 - 1;
        E(g, x, y, 4, 3, STN[2]); E(g, x - 1, y - 1, 2.4, 1.6, STN[3]); P(g, x - 1, y - 2, STN[4]);
      }
      for (const x of [5, w - 6]) { E(g, x, cy - 3, 3.4, 2.6, STN[2]); P(g, x - 1, cy - 5, STN[4]); }
    },
    shrine2: (g, w, h) => {
      // a little house on a pole, with a red roof, a round door, a perch and
      // whoever lives there looking out
      const cx = w >> 1;
      stone(g, cx - 6, h - 4, 12, 4);
      R(g, cx - 2, 26, 4, h - 30, WDD[2]); R(g, cx - 2, 26, 1, h - 30, WDD[3]);
      R(g, cx - 7, 30, 14, 2, WDD[2]); Art.limb(g, cx - 6, 32, cx - 1, 38, 1, 1, WDD[2]); Art.limb(g, cx + 6, 32, cx + 1, 38, 1, 1, WDD[2]);
      R(g, cx - 9, 10, 18, 18, '#e8c890'); R(g, cx - 9, 10, 2, 18, '#f8e0b0'); R(g, cx + 7, 10, 2, 18, '#c8a060');
      for (let y = 13; y < 28; y += 4) R(g, cx - 9, y, 18, 1, '#c8a060');
      // the roof, stepped, with a dab of snow-white trim
      for (let r = 0; r < 6; r++) R(g, cx - 12 + r * 2, 11 - r * 2, 24 - r * 4, 2, r % 2 ? '#c8403a' : '#e0584a');
      R(g, cx - 13, 11, 26, 1, '#fff4e8'); R(g, cx - 1, 0, 2, 2, '#8a2a1a');
      // the door, the bird in it, and the perch
      E(g, cx, 18, 4, 4, '#2a1a10');
      E(g, cx, 19, 2.8, 2.6, '#6a9ad8'); P(g, cx - 1, 18, '#ffffff'); P(g, cx - 1, 18, IRN[0]); P(g, cx + 1, 18, IRN[0]);
      R(g, cx - 1, 20, 2, 1, '#f0a020'); E(g, cx, 21.5, 2, 1, '#f8e8d0');
      R(g, cx - 1, 24, 3, 1, WDD[1]); R(g, cx + 2, 24, 3, 1, WDD[3]);
      // a flower in a tin at the foot
      R(g, cx + 5, h - 7, 4, 3, IRN[2]); R(g, cx + 6, h - 11, 1, 4, MOS[1]); E(g, cx + 6.5, h - 12, 1.6, 1.6, '#f8d040');
    },
  });
  return { A, has: (k) => !!A[k] };
})();
