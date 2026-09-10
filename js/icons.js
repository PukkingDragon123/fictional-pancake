// ---- Procedural pixel icons. The interface uses no emoji and little text. --
const Icons = (() => {
  const SZ = 16, urls = new Map(), canvases = new Map();
  const I = PAL.ink, C = PAL.cream, B = PAL.bone;
  const G1 = PAL.gold1, G2 = PAL.gold2, G3 = PAL.gold3, G4 = PAL.gold4;
  const M1 = PAL.moss1, M2 = PAL.moss2, M3 = PAL.moss3, M4 = PAL.moss4;
  const S1 = PAL.stone1, S2 = PAL.stone2, S3 = PAL.stone3, S4 = PAL.stone4;
  const D2 = PAL.div2, D3 = PAL.div3, D4 = PAL.div4, D5 = PAL.div5;
  const K1 = PAL.bark1, K2 = PAL.bark2, K3 = PAL.bark3;
  const W1 = PAL.water1, W2 = PAL.water2, W3 = PAL.water3;
  const R1 = PAL.red1, R2 = PAL.red2, R3 = PAL.red3;
  const Y1 = PAL.cyan1, Y2 = PAL.cyan2, Y3 = PAL.cyan3;
  const E1 = PAL.soil1, E2 = PAL.soil2, E3 = PAL.soil3;

  function cube(d, col, x, y, w, h) {
    d.R(x, y, w, h, col);
    d.R(x, y, w, 2, U.shade(col, 0.32));
    d.R(x, y + h - 2, w, 2, U.shade(col, -0.32));
    d.R(x + w - 2, y, 2, h, U.shade(col, -0.2));
    d.R(x + 2, y + 3, 2, 2, U.shade(col, -0.12));
  }
  function pot(d, col) { d.E(8, 11, 5.5, 4.5, col); d.E(7, 10, 3, 2.4, U.shade(col, 0.3)); }

  const DEF = {
    // --- currency and counters ---
    wdollar: (d) => { d.E(8, 9, 6.5, 6.5, G1); d.E(8, 8, 6, 6, G2); d.E(7, 7, 3, 2.6, G4); d.R(6, 4, 1, 9, G1); d.R(9, 4, 1, 9, G1); d.R(5, 6, 6, 1, G1); d.R(5, 10, 6, 1, G1); },
    offering: (d) => { cube(d, E2, 3, 7, 7, 7); cube(d, E1, 8, 4, 6, 6); d.R(4, 5, 2, 2, M3); },
    leaf: (d) => { d.L(3, 14, 12, 4, M1, 1); for (let i = 0; i < 5; i++) { const t = i / 5, x = U.lerp(4, 12, t), y = U.lerp(13, 4, t); d.L(x, y, x - 3 + i * 0.6, y - 2, M3, 1); d.L(x, y, x + 3 - i * 0.4, y + 1, M2, 1); } d.E(11, 4, 2, 2, M4); },
    eye: (d) => { d.E(8, 8, 7, 4.5, C); d.E(8, 8, 4, 4, D3); d.E(8, 8, 2, 2, I); d.E(6.6, 6.6, 1, 1, C); d.L(1, 4, 3, 6, I, 1); d.L(15, 4, 13, 6, I, 1); },
    wombat: (d) => { d.E(7, 10, 6, 4.6, K3); d.E(12, 9, 3.6, 3.2, K3); d.E(10.6, 6, 1.6, 1.7, K2); d.E(13.6, 5.6, 1.6, 1.7, K3); d.R(13, 8, 1, 1, I); d.R(11, 8.4, 1, 1, I); d.E(15, 10, 2, 1.6, PAL.bark3); d.R(15.4, 9.4, 1.4, 1, I); d.R(3, 13, 2, 2, K1); d.R(8, 13, 2, 2, K1); d.E(1.8, 9.4, 1.4, 1.5, K2); },
    // --- interface ---
    sound: (d) => { d.R(2, 6, 3, 4, S4); d.L(5, 6, 8, 3, S4, 1); d.L(5, 9, 8, 12, S4, 1); d.R(5, 6, 3, 4, S4); d.R(10, 6, 1, 1, Y2); d.R(11, 5, 1, 3, Y2); d.R(13, 4, 1, 5, Y2); },
    mute: (d) => { d.R(2, 6, 3, 4, S4); d.L(5, 6, 8, 3, S4, 1); d.L(5, 9, 8, 12, S4, 1); d.R(5, 6, 3, 4, S4); d.L(10, 4, 14, 10, R2, 1); d.L(14, 4, 10, 10, R2, 1); },
    close: (d) => { d.L(3, 3, 12, 12, C, 2); d.L(12, 3, 3, 12, C, 2); },
    lock: (d) => { d.R(4, 7, 8, 7, S2); d.R(4, 7, 8, 1, S3); d.R(6, 3, 4, 4, S1); d.R(7, 9, 2, 3, I); },
    heart: (d) => { d.E(5.5, 6, 3.2, 3.2, R2); d.E(10.5, 6, 3.2, 3.2, R2); d.E(8, 9, 4.5, 4.5, R2); d.E(5, 5, 1.4, 1.4, R3); },
    shop: (d) => { d.R(1, 6, 14, 9, K1); d.R(1, 6, 14, 1, K2); for (let i = 0; i < 5; i++) d.R(1 + i * 3, 2, 3, 4, i % 2 ? R1 : PAL.parch0); d.R(1, 2, 14, 1, K2); d.R(5, 9, 6, 6, K2); d.E(12, 9, 1.6, 1.4, G2); },
    grove: (d) => { d.R(7, 9, 2, 6, K1); d.E(8, 6, 6, 5, M1); d.E(7, 5, 4, 3.4, M2); d.E(6, 4, 2, 2, M4); d.R(2, 13, 12, 2, M2); },
    tree: (d) => { d.R(7, 2, 2, 5, K1); d.L(8, 7, 3, 14, K2, 2); d.L(8, 7, 13, 14, K2, 2); d.L(8, 7, 8, 15, K2, 2); d.E(4, 12, 2, 2, D3); d.E(12, 12, 2, 2, G3); d.E(8, 14, 2, 2, R2); },
    shrine: (d) => { d.R(1, 12, 14, 3, S1); d.R(3, 9, 10, 3, S2); d.R(4, 6, 8, 3, S3); d.R(1, 3, 3, 9, S2); d.R(12, 3, 3, 9, S2); d.E(2.5, 2, 2, 2, G3); d.E(13.5, 2, 2, 2, G3); d.R(6, 3, 4, 2, D3); },
    // --- tools ---
    t_hand: (d) => { d.E(8, 11, 4, 3.4, K3); d.E(4.6, 6, 1.7, 2, K3); d.E(7, 5, 1.7, 2, K3); d.E(9.6, 5, 1.7, 2, K3); d.E(12, 7, 1.7, 2, K3); d.E(8, 11, 2, 1.4, R3); },
    t_sickle: (d) => { d.L(3, 14, 8, 9, K2, 2); for (let i = 0; i < 7; i++) { const a = -0.4 + i * 0.42; d.R(8 + Math.cos(a) * 6, 8 + Math.sin(a) * 6, 2, 2, S4); } d.E(11, 4, 2, 2, C); },
    t_net: (d) => { d.L(2, 14, 7, 9, K2, 2); d.E(10, 6, 5.5, 5.5, S3); d.E(10, 6, 4, 4, 'rgba(0,0,0,0)'); for (let i = -3; i <= 3; i += 2) { d.R(10 + i, 2, 1, 8, C); d.R(6, 6 + i, 8, 1, C); } },
    t_hoe: (d) => { d.L(3, 14, 11, 5, K2, 2); d.R(9, 2, 6, 3, S3); d.R(12, 2, 3, 6, S3); d.R(9, 2, 6, 1, S4); },
    t_moss: (d) => { d.R(1, 11, 14, 4, E2); for (let i = 0; i < 6; i++) { const x = 2 + i * 2.4; d.R(x, 6 + (i % 2), 1, 6, M2); d.R(x + 1, 4 + (i % 3), 1, 5, M3); } d.E(12, 4, 2, 1.6, M4); },
    t_seed: (d) => { d.E(8, 10, 6, 5, PAL.parch0); d.R(2, 5, 12, 3, K2); d.E(6, 10, 1.6, 2, K3); d.E(9.6, 11, 1.6, 2, K3); d.E(8, 8, 1.4, 1.8, K1); d.R(2, 5, 12, 1, K3); },
    t_water: (d) => { d.R(3, 7, 8, 7, S3); d.R(3, 7, 8, 1, S4); d.R(11, 6, 4, 2, S3); d.L(11, 8, 15, 5, S3, 2); d.R(4, 4, 5, 3, S2); for (let i = 0; i < 3; i++) d.R(14 + (i % 2), 8 + i * 2, 1, 2, W2); },
    t_pair: (d) => { d.E(5, 8, 3.4, 3.4, R2); d.E(11, 8, 3.4, 3.4, R3); d.E(5, 7, 1.2, 1.2, C); d.R(7, 7, 2, 2, R3); d.R(4, 12, 8, 1, K2); },
    // --- crops ---
    c_ashgrass: (d) => { for (let i = 0; i < 5; i++) { const x = 3 + i * 2.4; d.R(x, 6 + (i % 2) * 2, 1, 8, M2); d.R(x, 5 + (i % 2) * 2, 1, 2, M4); } d.R(1, 13, 14, 2, E2); },
    c_sunroot: (d) => { d.R(7, 8, 2, 6, M1); d.E(8, 6, 4.5, 4.5, G2); d.E(6.5, 4.5, 2, 1.8, G4); d.R(3, 9, 3, 1, M2); d.R(10, 10, 3, 1, M2); d.R(1, 13, 14, 2, E2); },
    c_resinbud: (d) => { d.R(7, 7, 2, 7, M1); d.E(8, 5, 3, 4, G1); d.E(7.4, 4, 1.4, 2, G3); d.R(10, 7, 1, 4, G2); d.R(1, 13, 14, 2, E2); },
    c_duskhusk: (d) => { d.R(7, 7, 2, 7, M1); d.E(8, 5, 2.6, 4.2, B); d.E(9, 5, 1, 2.6, PAL.boneD); d.R(4, 9, 3, 1, M2); d.R(1, 13, 14, 2, E2); },
    c_ironbulb: (d) => { d.R(7, 8, 2, 6, M1); d.E(8, 6, 4.5, 3.4, S3); d.E(6.6, 5, 2, 1.4, S4); d.R(6, 3, 1, 3, M2); d.R(9, 3, 1, 3, M2); d.R(1, 13, 14, 2, E2); },
    c_broadleaf: (d) => { d.R(7, 8, 2, 6, M1); d.E(8, 6, 7, 3, M2); d.R(1, 6, 14, 1, M4); d.E(4, 5, 2, 1.4, M3); d.E(12, 5, 2, 1.4, M3); d.R(1, 13, 14, 2, E2); },
    c_goldwheat: (d) => { d.R(7, 7, 2, 8, M1); for (let i = 0; i < 4; i++) d.E(8, 3 + i * 2.4, 2.4, 1.6, i % 2 ? G3 : G2); d.R(4, 9, 3, 1, M2); d.R(1, 13, 14, 2, E2); },
    c_runeberry: (d) => { d.R(7, 8, 2, 6, M1); d.E(5.5, 5, 2.6, 2.6, D3); d.E(10.5, 5, 2.6, 2.6, D2); d.E(8, 3, 2.6, 2.6, D4); d.R(5, 4, 1, 1, D5); d.R(1, 13, 14, 2, E2); },
    // --- offerings ---
    o_plain: (d) => cube(d, E2, 3, 3, 10, 10),
    o_rich: (d) => cube(d, E1, 1, 1, 14, 14),
    o_resin: (d) => { cube(d, G1, 3, 3, 10, 10); d.R(4, 12, 2, 3, G3); d.R(9, 12, 2, 2, G3); },
    o_husk: (d) => { cube(d, PAL.parch0, 3, 4, 10, 8); d.R(7, 5, 2, 6, C); },
    o_stone: (d) => { cube(d, S2, 3, 3, 10, 10); d.R(5, 5, 1, 1, S4); d.R(10, 5, 1, 1, S4); d.R(5, 10, 1, 1, S4); d.R(10, 10, 1, 1, S4); },
    o_slab: (d) => { cube(d, M2, 1, 6, 14, 5); d.R(5, 7, 1, 3, M1); d.R(9, 7, 1, 3, M1); },
    o_gold: (d) => { cube(d, G2, 3, 3, 10, 10); d.R(6, 6, 4, 4, G1); d.R(7, 6, 2, 1, G4); },
    o_rune: (d) => { cube(d, D2, 3, 3, 10, 10); d.R(6, 5, 1, 6, D4); d.R(6, 5, 4, 1, D4); d.R(9, 8, 1, 3, D5); },
    // --- god glyphs ---
    g_harvest: (d) => { for (let i = -2; i <= 2; i++) { d.L(8, 14, 8 + i * 2.6, 4 + Math.abs(i), G2, 1); d.E(8 + i * 2.6, 4 + Math.abs(i), 1.4, 2, G3); } d.R(4, 11, 8, 2, G1); },
    g_tide: (d) => { d.R(7, 5, 2, 10, Y1); for (const s of [-1, 0, 1]) d.R(8 + s * 4 - 1, 2, 2, 5, Y3); d.R(3, 5, 10, 2, Y2); d.E(8, 14, 4, 1.6, W2); },
    g_sun: (d) => { d.E(8, 8, 4, 4, G3); d.E(8, 8, 2.4, 2.4, G4); for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; d.R(8 + Math.cos(a) * 6, 8 + Math.sin(a) * 6, 2, 2, G2); } },
    g_moon: (d) => { d.E(8, 8, 6.5, 6.5, Y3); d.E(11, 6.5, 5.5, 5.5, 'rgba(0,0,0,0)'); d.R(2, 2, 1, 1, C); d.R(13, 12, 1, 1, C); },
    g_storm: (d) => { d.E(6, 6, 4, 3, S3); d.E(10, 6, 4, 2.6, S4); d.L(9, 8, 6, 12, G3, 2); d.L(6, 12, 9, 11, G3, 2); d.L(9, 11, 6, 15, G4, 2); },
    g_forge: (d) => { d.R(2, 3, 8, 5, S3); d.R(2, 3, 8, 1, S4); d.L(9, 6, 14, 14, K2, 2); d.E(5, 12, 3, 2, R2); d.E(5, 11, 1.6, 1.4, G3); },
    g_wisdom: (d) => { d.E(8, 9, 5.5, 5, K2); d.E(5.6, 7, 2.4, 2.4, C); d.E(10.4, 7, 2.4, 2.4, C); d.R(5, 6.6, 1, 1, I); d.R(10, 6.6, 1, 1, I); d.R(7.4, 9, 1.6, 2, G2); for (let i = -3; i <= 3; i += 2) d.E(8 + i * 1.6, 2.6, 1.4, 1, M3); },
    g_love: (d) => { d.E(5.5, 6, 3.4, 3.4, R2); d.E(10.5, 6, 3.4, 3.4, R2); d.E(8, 9.5, 4.8, 4.8, R2); d.E(5, 5, 1.4, 1.4, R3); d.R(2, 2, 2, 2, PAL.parch0); },
    g_under: (d) => { d.E(8, 8, 6.5, 6, S2); d.R(1.5, 7, 13, 2, S4); d.R(6, 2, 4, 5, S3); d.E(6, 9, 1.6, 1.6, D4); d.E(10, 9, 1.6, 1.6, D4); d.R(5, 13, 6, 2, S1); },
    g_feast: (d) => { d.E(8, 6, 5, 3.4, G2); d.R(7, 9, 2, 4, G1); d.R(4, 13, 8, 2, G2); d.E(4, 3, 2, 1.6, D3); d.E(12, 3, 2, 1.6, M3); d.E(8, 2, 2, 1.6, D4); },
    // --- artifacts ---
    a_sheaf: (d) => { for (let i = -2; i <= 2; i++) { d.L(8, 15, 8 + i * 3, 3 + Math.abs(i) * 1.4, G2, 2); d.E(8 + i * 3, 3 + Math.abs(i) * 1.4, 1.8, 2.4, G3); } d.R(4, 10, 8, 2, R1); },
    a_shell: (d) => { d.E(8, 10, 7, 6, PAL.parch1); for (let i = -3; i <= 3; i++) d.L(8, 15, 8 + i * 2.2, 4, PAL.parch0, 1); d.E(8, 14, 2.4, 1.4, W2); },
    a_lyre: (d) => { d.L(4, 14, 3, 4, G2, 2); d.L(12, 14, 13, 4, G2, 2); d.R(2, 3, 12, 2, G3); d.R(3, 13, 10, 2, G1); for (let i = 0; i < 4; i++) d.R(4 + i * 2.4, 5, 1, 8, G4); },
    a_bow: (d) => { d.L(5, 2, 11, 8, Y2, 2); d.L(11, 8, 5, 14, Y2, 2); d.L(5, 2, 5, 14, C, 1); d.R(2, 7, 12, 1, S4); d.R(12, 6, 3, 3, C); },
    a_acorn: (d) => { d.E(8, 10, 4.6, 5.2, K3); d.E(8, 11, 3, 3.4, PAL.dead3); d.E(8, 5, 5.6, 3, K1); d.E(8, 4.6, 5, 2.4, K2); d.R(7, 1, 2, 3, K1); d.L(11, 7, 14, 3, G3, 1); },
    a_ember: (d) => { d.E(8, 11, 5.5, 4.5, S2); d.E(8, 10, 4, 3.4, R1); d.E(8, 9, 2.6, 2.6, R3); d.E(8, 7.6, 1.4, 1.8, G3); d.R(2, 14, 12, 2, S1); },
    a_owl: (d) => { d.E(8, 10, 5.5, 5.5, K2); d.E(5.6, 8, 2.6, 2.6, PAL.parch1); d.E(10.4, 8, 2.6, 2.6, PAL.parch1); d.R(5, 7.6, 1, 1, I); d.R(10, 7.6, 1, 1, I); d.R(7.4, 10, 1.6, 2, G2); d.R(4, 3, 2, 3, K1); d.R(10, 3, 2, 3, K1); },
    a_locket: (d) => { d.R(7, 1, 2, 4, G2); d.E(8, 9, 5.5, 5.5, G2); d.E(8, 9, 4, 4, G3); d.E(6.6, 8, 2.2, 2.2, R2); d.E(9.4, 8, 2.2, 2.2, R2); d.E(8, 10.4, 3, 3, R2); },
    a_obsidian: (d) => { cube(d, PAL.stone0, 3, 3, 10, 10); d.R(5, 5, 2, 2, D3); d.R(9, 9, 2, 2, D4); d.L(4, 12, 12, 4, D2, 1); },
    a_chalice: (d) => { d.E(8, 6, 5.5, 4, G2); d.E(8, 5, 4.4, 3, D3); d.E(7, 4.4, 2, 1.2, D5); d.R(7, 9, 2, 4, G1); d.E(8, 14, 4.5, 2, G2); },
    // --- fruit skills ---
    f_brush: (d) => { d.L(4, 14, 10, 6, K2, 2); d.E(11, 4, 3.4, 3.4, M3); d.E(11, 4, 2, 2, M4); },
    f_roots: (d) => { d.R(7, 1, 2, 5, K2); for (const s of [-1, 1]) { d.L(8, 6, 8 + s * 5, 11, K2, 2); d.L(8 + s * 5, 11, 8 + s * 7, 15, K1, 1); } d.L(8, 6, 8, 15, K2, 2); d.E(8, 3, 2.6, 2, M3); },
    f_seed: (d) => { d.E(8, 10, 3.4, 4.4, PAL.parch0); d.L(8, 6, 8, 2, M2, 1); d.E(6.6, 3, 2, 1.4, M3); d.E(9.4, 2.4, 2, 1.4, M4); },
    f_wake: (d) => { for (let i = 0; i < 4; i++) { d.E(3 + i * 3.4, 12 - i, 2, 1.4, M2); d.R(3 + i * 3.4, 9 - i, 1, 4, M3); } d.E(13, 4, 2, 1.6, M4); },
    f_paw: (d) => { d.E(8, 11, 4, 3.4, K3); d.E(4.6, 6, 1.7, 2, K3); d.E(7, 5, 1.7, 2, K3); d.E(9.6, 5, 1.7, 2, K3); d.E(12, 7, 1.7, 2, K3); },
    f_gut: (d) => { d.E(8, 9, 5.5, 5, R3); d.E(8, 9, 4, 3.6, PAL.parch0); d.L(5, 9, 11, 9, R2, 1); d.L(6, 6, 6, 12, R2, 1); d.L(10, 6, 10, 12, R2, 1); },
    f_twin: (d) => { cube(d, E2, 2, 7, 6, 6); cube(d, E2, 8, 4, 6, 6); d.R(12, 11, 3, 3, G3); },
    f_heart: (d) => { d.E(5.5, 6, 3.2, 3.2, R2); d.E(10.5, 6, 3.2, 3.2, R2); d.E(8, 9, 4.5, 4.5, R2); d.E(4, 12, 2, 2, R3); },
    f_claw: (d) => { d.R(2, 2, 12, 2, S1); d.R(7, 4, 2, 5, S3); d.R(4, 9, 8, 2, S4); d.R(4, 9, 2, 5, S3); d.R(10, 9, 2, 5, S3); },
    f_plinth: (d) => { d.R(1, 10, 14, 4, S2); d.R(1, 10, 14, 1, S4); d.R(5, 4, 6, 6, E2); d.R(5, 4, 6, 1, E3); },
    f_eye: (d) => { d.E(8, 8, 7, 4.5, C); d.E(8, 8, 4, 4, Y2); d.E(8, 8, 2, 2, I); d.E(6.6, 6.6, 1, 1, C); },
    f_tongue: (d) => { d.E(8, 8, 6, 5.5, D2); d.E(8, 9, 3.4, 3.4, R2); d.R(7, 2, 2, 3, D4); d.R(3, 4, 2, 2, D3); d.R(11, 4, 2, 2, D3); },
    // --- upgrades ---
    u_shrine: (d) => { d.R(1, 12, 14, 3, S1); d.R(3, 9, 10, 3, S2); d.R(4, 6, 8, 3, S3); d.R(1, 3, 3, 9, S2); d.R(12, 3, 3, 9, S2); d.E(2.5, 2, 2, 2, G3); d.E(13.5, 2, 2, 2, G3); },
    u_burrow: (d) => { d.E(8, 14, 7.5, 7, E2); d.E(8, 14, 6, 5.5, E1); d.E(8, 15, 3, 4, PAL.stone0); d.E(4, 6, 3, 2, M2); d.E(12, 6, 3, 2, M3); },
    u_trough: (d) => { d.R(1, 7, 14, 6, K2); d.R(1, 7, 14, 1, K3); d.R(3, 8, 10, 3, M3); d.R(2, 13, 2, 2, K1); d.R(12, 13, 2, 2, K1); d.E(8, 4, 3, 2, M4); },
    u_cart: (d) => { d.R(3, 5, 10, 5, K2); d.R(3, 5, 10, 1, K3); d.E(5, 12, 2.5, 2.5, S1); d.E(5, 12, 1, 1, S3); d.R(12, 8, 3, 1, K1); d.R(3, 3, 8, 2, E2); },
    u_seats: (d) => { for (let i = 0; i < 4; i++) d.R(1 + i, 5 + i * 2.5, 14 - i * 2, 2, i % 2 ? K1 : K2); d.R(2, 3, 2, 2, R2); d.R(6, 2, 2, 2, D3); d.R(10, 3, 2, 2, G2); },
    // --- decorations ---
    d_nest: (d) => { d.E(8, 11, 7, 4, PAL.dead1); d.E(8, 10, 5.4, 2.8, PAL.dead2); d.E(8, 10, 3.4, 1.8, E1); for (let i = 0; i < 5; i++) d.L(2 + i * 3, 9 + (i % 2), 5 + i * 2.4, 13, PAL.dead3, 1); },
    d_brazier: (d) => { d.R(7, 9, 2, 5, S2); d.R(4, 14, 8, 2, S1); d.E(8, 8, 5, 2.6, S3); d.E(8, 6, 3.4, 2.6, R2); d.E(8, 4.6, 2, 2, G3); },
    d_stones: (d) => { for (let i = 0; i < 3; i++) { const h = [9, 12, 7][i]; d.R(2 + i * 5, 14 - h, 4, h, S2); d.R(2 + i * 5, 14 - h, 1.4, h, S3); d.R(3, 14 - h + 3, 1, 1, D3); } d.R(1, 14, 14, 2, S1); },
    d_pool: (d) => { d.E(8, 9, 7, 5, S1); d.E(8, 9, 5.6, 3.8, W1); d.E(8, 8.6, 4.4, 2.8, W2); d.E(6, 8, 2, 1, W3); d.E(2, 13, 2, 1.2, S2); d.E(13, 13, 2, 1.2, S2); },
    d_idol: (d) => { d.R(4, 13, 8, 3, S1); d.E(8, 9, 5, 5, S2); d.E(4.6, 4.6, 2, 2, S2); d.E(11.4, 4.6, 2, 2, S2); d.E(8, 5.4, 4, 3.6, S3); d.R(6.4, 5, 1, 1, D4); d.R(9.4, 5, 1, 1, D4); d.R(5, 10, 6, 1, M2); },
    // --- cupid boons ---
    b_slow: (d) => { d.E(8, 8, 6.5, 6.5, PAL.parch1); d.E(8, 8, 5, 5, C); d.R(7, 4, 2, 5, I); d.R(8, 8, 4, 2, I); d.R(7, 1, 2, 2, S2); },
    b_magnet: (d) => { d.R(3, 3, 4, 8, R2); d.R(9, 3, 4, 8, S3); d.E(8, 4, 5, 4, R2); d.E(8, 4, 2.6, 2, PAL.parch1); d.R(3, 11, 4, 3, S4); d.R(9, 11, 4, 3, R3); },
    b_tacky: (d) => { d.R(5, 2, 6, 4, S3); d.R(4, 6, 8, 8, G1); d.R(4, 6, 8, 1, G3); d.R(5, 13, 2, 3, G2); },
    b_double: (d) => { d.E(5.5, 9, 4.4, 4.4, G2); d.E(10.5, 7, 4.4, 4.4, G3); d.E(4.6, 8, 1.6, 1.6, G4); d.E(9.6, 6, 1.6, 1.6, G4); },
    b_shield: (d) => { d.L(3, 3, 8, 2, S3, 2); d.L(13, 3, 8, 2, S3, 2); d.R(3, 3, 10, 6, S3); d.L(3, 9, 8, 15, S3, 2); d.L(13, 9, 8, 15, S3, 2); d.R(5, 5, 6, 5, D3); d.R(7, 6, 2, 4, D5); },
    b_feather: (d) => { d.L(4, 14, 12, 3, C, 1); for (let i = 0; i < 6; i++) { const t = i / 6, x = U.lerp(4, 12, t), y = U.lerp(14, 3, t); d.L(x, y, x - 3 + i * 0.4, y - 1, PAL.parch1, 1); d.L(x, y, x + 2, y + 1, PAL.parch0, 1); } },
  };

  function build(name) {
    const fn = DEF[name];
    if (!fn) return null;
    const { c, g } = Art.cv(SZ, SZ);
    fn({
      g,
      R: (x, y, w, h, col) => Art.rect(g, x, y, w, h, col),
      E: (x, y, rx, ry, col) => Art.ell(g, x, y, rx, ry, col),
      L: (x0, y0, x1, y1, col, t) => Art.line(g, x0, y0, x1, y1, col, t || 1),
    });
    return c;
  }
  function canvas(name) {
    let c = canvases.get(name);
    if (c === undefined) { c = build(name); canvases.set(name, c); }
    return c;
  }
  function url(name) {
    let u = urls.get(name);
    if (u !== undefined) return u;
    const c = canvas(name);
    if (!c) { urls.set(name, ''); return ''; }
    const { c: big, g } = Art.cv(SZ * 2, SZ * 2);
    g.imageSmoothingEnabled = false;
    g.drawImage(c, 0, 0, SZ * 2, SZ * 2);
    u = big.toDataURL();
    urls.set(name, u);
    return u;
  }
  function img(name, cls = '', extra = '') { return `<img class="ico ${cls}" src="${url(name)}" alt="" ${extra}>`; }
  function blit(g, name, x, y, scale = 1) {
    const c = canvas(name);
    if (c) g.drawImage(c, Math.round(x), Math.round(y), SZ * scale, SZ * scale);
  }
  return { url, img, blit, canvas, names: () => Object.keys(DEF) };
})();
