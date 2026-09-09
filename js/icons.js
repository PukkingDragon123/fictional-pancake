// ---- Procedural pixel icons for the interface (no emoji anywhere) ----------
// Sixteen pixels square, drawn with three primitives, cached as canvases and as
// data URLs so the same icon can go on the canvas or into an <img> in a panel.
const Icons = (() => {
  const SZ = 16, urls = new Map(), canvases = new Map();
  const I = PAL.ink, C = PAL.bone4, B1 = PAL.bone1, B2 = PAL.bone2, B3 = PAL.bone3;
  const A0 = PAL.ash0, A1 = PAL.ash1, A2 = PAL.ash2, A3 = PAL.ash3, A4 = PAL.ash4;
  const M1 = PAL.moss1, M2 = PAL.moss2, M3 = PAL.moss3, M4 = PAL.moss4;
  const S0 = PAL.soil0, S1 = PAL.soil1, S2 = PAL.soil2, S3 = PAL.soil3;
  const V1 = PAL.vio1, V2 = PAL.vio2, V3 = PAL.vio3, V4 = PAL.vio4;
  const G = PAL.gold, GL = PAL.goldL, GD = PAL.goldD;
  const T0 = PAL.stone0, T1 = PAL.stone1, T2 = PAL.stone2, T3 = PAL.stone3;
  const RD = PAL.blood, RL = PAL.bloodL, TE = PAL.teal, TL = PAL.tealL;
  const K0 = PAL.bark0, K1 = PAL.bark1, K2 = PAL.bark2, K3 = PAL.bark3;
  const W2 = PAL.wood2, W3 = PAL.wood3, W4 = PAL.wood4;

  const DEF = {
    // --- interface ---
    coin: (d) => { d.E(8, 9, 6.5, 6.5, GD); d.E(8, 8, 6, 6, G); d.E(7, 7, 3, 3, GL); d.R(5, 5, 2, 2, GD); d.R(6, 7, 4, 1, GD); d.R(7, 4, 1, 8, GD); d.R(9, 4, 1, 8, GD); },
    offering: (d) => { d.R(2, 8, 6, 6, S0); d.R(2, 8, 6, 1, S1); d.R(8, 8, 6, 6, A1); d.R(8, 8, 6, 1, A2); d.R(5, 2, 6, 6, S1); d.R(5, 2, 6, 1, S2); d.R(9, 6, 2, 2, S0); },
    fruit: (d) => { d.E(8, 10, 5, 5.4, M2); d.E(6.5, 8.5, 2, 2, M3); d.R(7, 3, 2, 4, K2); d.L(9, 5, 13, 2, M1, 1); d.E(12, 3, 2.4, 1.6, M3); },
    favour: (d) => { for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; d.R(8 + Math.cos(a) * 6, 8 + Math.sin(a) * 6, 1, 1, i % 2 ? V4 : GL); } d.E(8, 8, 3.4, 3.4, V2); d.E(7, 7, 1.4, 1.4, V4); },
    restore: (d) => { d.R(1, 11, 14, 4, A1); d.R(1, 11, 8, 4, M1); d.R(1, 11, 8, 1, M3); d.L(4, 10, 4, 4, M2, 1); d.L(4, 6, 1, 3, M3, 1); d.L(4, 7, 7, 4, M3, 1); d.L(11, 10, 11, 6, A3, 1); },
    trophy: (d) => { d.R(4, 2, 8, 6, T2); d.E(8, 8, 4, 3, T3); d.R(2, 3, 2, 3, T1); d.R(12, 3, 2, 3, T1); d.R(7, 11, 2, 2, T1); d.R(4, 13, 8, 2, K1); d.R(6, 4, 2, 2, GL); },
    shop: (d) => { d.R(1, 6, 14, 8, K1); d.R(1, 6, 14, 1, K2); for (let i = 0; i < 4; i++) { d.R(1 + i * 4, 2, 2, 4, A1); d.R(3 + i * 4, 2, 2, 4, B2); } d.R(1, 2, 14, 1, K0); d.R(5, 9, 6, 5, K0); d.R(6, 10, 4, 4, B1); },
    grove: (d) => { d.R(7, 9, 2, 6, K2); d.E(8, 6, 6, 5, M1); d.E(7, 5, 4, 3.5, M2); d.E(6, 4, 2, 2, M4); d.R(2, 13, 12, 2, S1); d.R(2, 13, 12, 1, M1); },
    shrine: (d) => { d.R(2, 13, 12, 2, T1); d.R(3, 5, 2, 8, T2); d.R(7, 5, 2, 8, T2); d.R(11, 5, 2, 8, T2); d.R(2, 3, 12, 2, T3); d.R(1, 5, 14, 1, T0); d.E(8, 8, 2.4, 2.4, V3); },
    roots: (d) => { d.R(1, 1, 14, 3, S2); d.L(5, 4, 3, 15, K2, 1); d.L(8, 4, 9, 15, K2, 1); d.L(11, 4, 13, 15, K2, 1); d.E(4, 9, 2, 2.2, M2); d.E(9, 11, 2, 2.2, M3); d.E(12, 8, 2, 2.2, M2); },
    tower: (d) => { d.R(2, 12, 12, 3, T1); d.R(2, 12, 12, 1, T2); d.R(4, 8, 8, 4, A2); d.R(4, 8, 8, 1, A3); d.R(5, 4, 6, 4, S1); d.R(5, 4, 6, 1, S2); d.R(6, 1, 4, 3, G); d.R(6, 1, 4, 1, GL); },
    warren: (d) => { d.E(8, 12, 7, 5, S1); d.E(8, 11, 6, 4, S2); d.E(8, 13, 3, 3, I); d.E(4, 6, 2.4, 2.4, A3); d.E(11, 5, 2.4, 2.4, A2); d.R(3, 3, 1, 2, B2); d.R(13, 2, 1, 2, B2); },
    brush: (d) => { d.L(3, 14, 9, 5, K2, 2); d.R(8, 3, 5, 5, A3); d.R(8, 3, 5, 1, A4); d.E(11, 8, 2.4, 2, V3); },
    sound: (d) => { d.R(2, 6, 3, 4, B2); d.L(5, 6, 8, 3, B2, 1); d.L(5, 9, 8, 12, B2, 1); d.R(5, 6, 3, 4, B2); d.R(10, 6, 1, 1, TL); d.R(11, 5, 1, 3, TL); d.R(13, 4, 1, 5, TL); },
    mute: (d) => { d.R(2, 6, 3, 4, B2); d.L(5, 6, 8, 3, B2, 1); d.L(5, 9, 8, 12, B2, 1); d.R(5, 6, 3, 4, B2); d.L(10, 4, 14, 10, RL, 1); d.L(14, 4, 10, 10, RL, 1); },
    help: (d) => { d.R(4, 2, 8, 3, B2); d.R(10, 4, 3, 4, B2); d.R(7, 7, 3, 3, B2); d.R(7, 12, 3, 3, B2); d.R(3, 4, 3, 2, B2); },
    heart: (d) => { d.E(5.5, 6, 3.2, 3.2, RD); d.E(10.5, 6, 3.2, 3.2, RD); d.E(8, 9, 4.5, 4.5, RD); d.E(5, 5, 1.4, 1.4, RL); },
    close: (d) => { d.L(3, 3, 12, 12, C, 2); d.L(12, 3, 3, 12, C, 2); },
    plus: (d) => { d.R(7, 3, 2, 10, C); d.R(3, 7, 10, 2, C); },
    lock: (d) => { d.R(4, 7, 8, 7, T1); d.R(4, 7, 8, 1, T2); d.R(6, 3, 4, 4, T0); d.R(7, 9, 2, 3, I); },
    skull: (d) => { d.E(8, 7, 5.5, 5, B3); d.R(5, 6, 3, 3, I); d.R(9, 6, 3, 3, I); d.R(7, 10, 2, 2, I); d.R(4, 12, 8, 2, B2); for (let i = 0; i < 4; i++) d.R(5 + i * 2, 12, 1, 2, I); },

    // --- tools ---
    t_censer: (d) => { d.R(7, 1, 2, 4, K2); d.E(8, 9, 5, 4.5, T2); d.E(8, 8, 4, 3.4, T1); d.R(3, 6, 10, 1, T3); d.R(6, 11, 4, 3, T0); d.R(7, 5, 1, 2, V4); d.R(9, 4, 1, 2, V3); },
    t_trowel: (d) => { d.L(4, 14, 8, 8, K2, 2); d.E(10, 5, 4, 5, T2); d.E(10, 5, 3, 4, T3); d.R(3, 13, 3, 2, K1); },
    t_pouch: (d) => { d.E(8, 10, 5.5, 5, K1); d.E(8, 9, 4.5, 4, K2); d.R(5, 4, 6, 3, K0); d.R(4, 6, 8, 1, K3); d.R(6, 9, 2, 2, M3); d.R(9, 11, 2, 2, M2); },
    t_can: (d) => { d.R(4, 6, 7, 8, T1); d.R(4, 6, 7, 1, T2); d.R(11, 7, 4, 2, T1); d.R(5, 3, 4, 3, T0); d.R(13, 10, 1, 2, TL); d.R(14, 12, 1, 2, TL); d.R(12, 12, 1, 2, TL); },
    t_sickle: (d) => { d.L(3, 14, 7, 9, K2, 2); for (let i = 0; i < 8; i++) { const a = 3.6 + (i / 8) * 2.4; d.R(9 + Math.cos(a) * 5, 7 + Math.sin(a) * 5, 2, 2, B3); } d.R(2, 13, 3, 2, K1); },

    // --- crops ---
    c_ashgrass: (d) => { for (let i = 0; i < 4; i++) { const x = 3 + i * 3; d.L(x, 14, x + (i % 2 ? 2 : -2), 5 + (i % 2), A3, 1); } d.E(8, 14, 6, 2, A1); },
    c_tuber: (d) => { d.E(8, 9, 6, 5, A2); d.E(7, 8, 4.5, 3.5, A3); d.E(6, 7, 2, 1.5, A4); d.R(5, 10, 1, 1, A0); d.R(10, 8, 1, 1, A0); d.R(4, 4, 3, 2, M1); },
    c_moonfern: (d) => { d.L(8, 15, 8, 3, M1, 1); for (let i = 0; i < 5; i++) { const y = 4 + i * 2.2, w = 2 + i * 0.8; d.L(8, y, 8 - w, y - 1, B2, 1); d.L(8, y, 8 + w, y - 1, M3, 1); } d.R(6, 1, 4, 2, B3); },
    c_bloodbeet: (d) => { d.E(8, 10, 5, 5, RD); d.E(7, 9, 3, 3, RL); d.L(8, 5, 6, 1, M2, 1); d.L(8, 5, 10, 1, M1, 1); d.R(7, 14, 2, 2, RD); },
    c_gourd: (d) => { d.E(8, 10, 5.5, 4.5, GD); d.E(8, 6, 3.4, 3, G); d.R(7, 2, 2, 3, M1); for (let i = 0; i < 3; i++) d.R(5 + i * 3, 9, 1, 4, GL); },
    c_ironroot: (d) => { d.E(8, 9, 5.5, 5, T1); d.E(7, 8, 3.5, 3, T2); d.R(2, 6, 3, 2, T0); d.R(11, 10, 3, 2, T0); d.R(6, 3, 1, 4, K1); d.R(9, 2, 1, 5, K2); },
    c_shelfcap: (d) => { d.E(8, 7, 7, 4, M1); d.E(6, 6, 3, 2, M3); d.R(5, 4, 2, 2, B3); d.R(10, 6, 2, 2, B3); d.R(6, 10, 4, 5, B2); d.R(6, 10, 1, 5, B1); },
    c_bonemelon: (d) => { d.E(8, 9, 6, 5.4, B2); d.E(8, 9, 5, 4.4, B3); for (let i = 0; i < 4; i++) d.R(4 + i * 3, 5, 1, 9, B1); d.R(7, 2, 2, 3, M1); },
    c_glasscorn: (d) => { d.E(8, 9, 4, 6, G); for (let y = 4; y < 15; y += 2) for (let x = 5; x < 11; x += 2) d.R(x + (y % 4 ? 0 : 1), y, 1, 1, GL); d.L(4, 12, 2, 4, M1, 1); d.L(12, 12, 14, 4, M2, 1); },

    // --- offerings ---
    o_husk: (d) => { d.R(3, 4, 10, 10, '#6b5f52'); d.R(3, 4, 10, 2, '#8a7d6c'); d.R(3, 4, 2, 10, '#8a7d6c'); d.R(3, 12, 10, 2, '#4a4038'); },
    o_boulder: (d) => { d.R(1, 2, 14, 13, A2); d.R(1, 2, 14, 2, A3); d.R(1, 2, 2, 13, A3); d.R(1, 13, 14, 2, A0); d.R(6, 7, 3, 3, A1); },
    o_resin: (d) => { d.R(3, 3, 10, 10, GD); d.R(3, 3, 10, 2, G); d.R(4, 11, 3, 4, GL); d.R(9, 12, 2, 3, GL); d.R(7, 13, 1, 3, GL); },
    o_pith: (d) => { d.R(3, 4, 10, 10, B2); d.R(3, 4, 10, 2, B3); d.R(7, 6, 2, 7, C); for (let i = 0; i < 3; i++) { d.R(5, 7 + i * 2, 2, 1, C); d.R(9, 8 + i * 2, 2, 1, C); } },
    o_iron: (d) => { d.R(3, 4, 10, 10, T1); d.R(3, 4, 10, 2, T2); d.R(4, 5, 1, 1, T3); d.R(11, 5, 1, 1, T3); d.R(4, 11, 1, 1, T3); d.R(11, 11, 1, 1, T3); d.R(5, 8, 6, 1, T0); },
    o_slab: (d) => { d.R(1, 6, 14, 5, M1); d.R(1, 6, 14, 1, M2); for (let i = 1; i < 4; i++) d.R(1 + i * 3.5, 7, 1, 3, PAL.moss0); d.R(1, 10, 14, 1, PAL.moss0); },
    o_ossuary: (d) => { d.R(3, 4, 10, 10, B1); d.R(3, 4, 10, 2, B2); d.R(4, 8, 8, 2, B3); d.R(5, 5, 2, 8, B3); d.R(9, 5, 2, 8, B3); },
    o_reliquary: (d) => { d.R(3, 4, 10, 10, GD); d.R(3, 4, 10, 2, G); d.R(5, 6, 2, 2, GL); d.R(6, 8, 4, 4, GD); d.R(7, 8, 2, 1, GL); d.R(11, 11, 2, 2, GL); },
    o_sacrament: (d) => { d.R(3, 3, 10, 11, V1); d.R(3, 3, 10, 2, V2); d.R(7, 5, 2, 8, V4); d.R(5, 7, 6, 2, V4); d.R(7, 7, 2, 2, PAL.halo); },

    // --- fruit skills ---
    f_broad: (d) => { d.L(3, 13, 8, 6, K2, 2); d.E(11, 5, 4.5, 4, A3); d.R(1, 1, 3, 1, V4); d.R(12, 12, 3, 1, V4); },
    f_compost: (d) => { d.E(8, 11, 6, 4, S1); d.E(8, 10, 5, 3, S2); d.R(5, 4, 2, 6, M1); d.R(9, 5, 2, 5, M2); d.E(8, 3, 2.4, 1.6, M3); },
    f_volunteer: (d) => { d.E(5, 11, 2.4, 2.6, M2); d.E(11, 12, 2, 2.2, M3); d.L(5, 9, 5, 4, M1, 1); d.L(11, 10, 11, 6, M1, 1); d.E(5, 3, 2, 1.6, M4); d.E(11, 5, 1.6, 1.4, M4); },
    f_orchard: (d) => { d.R(7, 9, 2, 6, K2); d.E(8, 6, 6, 5, M2); d.R(5, 5, 2, 2, GL); d.R(10, 7, 2, 2, GL); d.R(2, 13, 12, 2, M1); },
    f_well: (d) => { d.E(8, 11, 6, 4, T1); d.E(8, 10, 5, 3, PAL.water1); d.R(4, 2, 1, 4, TL); d.R(8, 1, 1, 5, TL); d.R(12, 3, 1, 3, TL); },
    f_paws: (d) => { d.E(8, 10, 4, 3.5, A3); d.E(4, 5, 1.8, 2, A3); d.E(7, 4, 1.8, 2.2, A3); d.E(10, 4, 1.8, 2.2, A3); d.E(13, 6, 1.8, 2, A3); d.E(8, 10, 2, 1.6, RL); },
    f_gut: (d) => { d.E(8, 9, 6, 5.4, A2); d.E(8, 9, 4, 3.4, RD); d.E(7, 8, 1.6, 1.4, RL); d.R(6, 2, 4, 3, A3); },
    f_litter: (d) => { d.E(5, 10, 3.2, 3, A3); d.E(11, 10, 3.2, 3, A2); d.R(4, 8, 1, 1, I); d.R(10, 8, 1, 1, I); d.E(8, 3, 2.4, 2.2, RL); },
    f_lineage: (d) => { d.E(4, 4, 2.4, 2.4, A3); d.E(12, 4, 2.4, 2.4, A2); d.L(4, 6, 8, 10, B2, 1); d.L(12, 6, 8, 10, B2, 1); d.E(8, 12, 2.6, 2.6, GL); },
    f_twindrop: (d) => { d.R(2, 8, 5, 5, S1); d.R(2, 8, 5, 1, S2); d.R(9, 8, 5, 5, S0); d.R(9, 8, 5, 1, S1); d.R(6, 2, 4, 4, GL); },
    f_claw: (d) => { d.R(2, 3, 12, 2, T1); d.R(7, 5, 2, 4, I); d.R(4, 9, 8, 4, K2); d.R(4, 9, 8, 1, K3); d.R(3, 13, 2, 2, B3); d.R(11, 13, 2, 2, B3); },
    f_guide: (d) => { d.R(5, 2, 6, 5, S1); d.R(5, 2, 6, 1, S2); for (let y = 8; y < 14; y += 2) { d.R(4, y, 1, 1, TL); d.R(11, y, 1, 1, TL); } d.R(4, 14, 8, 1, TL); },
    f_altar: (d) => { d.R(1, 7, 14, 4, T2); d.R(1, 7, 14, 1, T3); d.R(4, 11, 8, 4, T1); d.R(6, 3, 4, 4, V2); d.R(1, 5, 1, 2, V4); d.R(14, 5, 1, 2, V4); },
    f_gyro: (d) => { d.E(8, 8, 6.5, 6.5, T1); d.E(8, 8, 4, 4, T0); d.E(8, 8, 1.6, 1.6, V4); d.R(1, 7, 3, 2, T3); d.R(12, 7, 3, 2, T3); },
    f_choir: (d) => { d.E(4, 8, 2.4, 2.6, B2); d.E(8, 6, 2.4, 2.6, B3); d.E(12, 8, 2.4, 2.6, B2); d.R(3, 4, 3, 1, GL); d.R(7, 2, 3, 1, GL); d.R(11, 4, 3, 1, GL); d.R(1, 12, 14, 2, V2); },

    // --- cupid blessings ---
    b_sap: (d) => { d.E(8, 6, 4.5, 4, GD); d.R(6, 9, 2, 5, G); d.R(9, 10, 2, 4, G); d.E(7, 14, 1.6, 1.4, GL); },
    b_feather: (d) => { d.L(11, 2, 5, 13, B3, 2); for (let i = 0; i < 5; i++) { const t = i / 5; d.L(10 - t * 5, 3 + t * 9, 6 - t * 4, 2 + t * 9, C, 1); } },
    b_tithe: (d) => { d.E(8, 10, 6, 4.4, GD); d.E(8, 9, 5, 3.4, G); d.R(5, 3, 2, 2, GL); d.R(9, 2, 2, 2, GL); d.R(7, 4, 2, 2, GL); },
    b_bedrock: (d) => { d.R(1, 9, 14, 6, T0); d.R(1, 9, 14, 1, T2); for (let i = 0; i < 4; i++) d.R(2 + i * 3.5, 10, 1, 5, T1); d.R(5, 3, 6, 5, A2); d.R(5, 3, 6, 1, A3); },
    b_net: (d) => { for (let i = 0; i < 5; i++) { d.L(1 + i * 3.5, 5, 1 + i * 3.5, 14, B2, 1); d.L(1, 5 + i * 2, 15, 5 + i * 2, B2, 1); } d.R(5, 1, 6, 4, S1); },
    b_gilding: (d) => { d.R(3, 4, 10, 10, GD); d.R(3, 4, 10, 2, G); d.R(6, 7, 4, 4, GL); d.R(1, 1, 2, 2, GL); d.R(13, 12, 2, 2, GL); },
    b_swell: (d) => { d.R(2, 2, 12, 12, S1); d.R(2, 2, 12, 2, S2); d.R(1, 7, 3, 2, GL); d.R(12, 7, 3, 2, GL); },
    b_slow: (d) => { d.E(8, 8, 6.5, 6.5, T1); d.E(8, 8, 5, 5, T0); d.R(7, 4, 2, 5, C); d.R(8, 8, 4, 2, C); },
    b_encore: (d) => { d.E(8, 9, 6, 5.4, V2); d.E(8, 9, 4, 3.4, V4); d.R(3, 2, 2, 3, V4); d.R(11, 2, 2, 3, V4); d.R(7, 1, 2, 3, PAL.halo); },
    b_lode: (d) => { d.R(3, 3, 4, 8, A2); d.R(9, 3, 4, 8, A2); d.R(3, 3, 10, 3, A3); d.R(3, 11, 4, 3, RD); d.R(9, 11, 4, 3, TE); },
    b_placing: (d) => { d.R(4, 8, 8, 6, A3); d.R(4, 8, 8, 1, A4); d.R(6, 2, 4, 5, B2); d.R(6, 2, 4, 1, B3); d.R(2, 14, 12, 1, T2); },
    b_still: (d) => { d.L(1, 5, 9, 5, B2, 1); d.L(1, 9, 11, 9, B2, 1); d.L(1, 13, 7, 13, B2, 1); d.L(11, 3, 14, 6, RL, 1); d.L(14, 3, 11, 6, RL, 1); },

    // --- obstacles ---
    x_gust: (d) => { d.L(1, 4, 11, 4, B2, 1); d.L(9, 2, 12, 5, B3, 1); d.L(1, 8, 14, 8, B2, 1); d.L(12, 6, 15, 9, B3, 1); d.L(1, 12, 9, 12, B1, 1); },
    x_fall: (d) => { for (let i = 0; i < 6; i++) d.R(2 + ((i * 5) % 12), 1 + i * 2, 2, 2, i % 2 ? A2 : A3); d.R(2, 13, 12, 2, A1); },
    x_root: (d) => { d.L(2, 15, 6, 8, K2, 2); d.L(6, 8, 5, 2, K2, 1); d.L(6, 8, 10, 4, K1, 1); d.L(10, 4, 13, 1, K1, 1); d.E(6, 8, 1.6, 1.6, M2); },
    x_spike: (d) => { d.L(8, 14, 8, 1, B3, 1); d.L(8, 1, 5, 14, B2, 1); d.L(8, 1, 11, 14, B2, 1); d.R(3, 13, 10, 2, T1); },
    x_quake: (d) => { d.R(1, 10, 14, 5, T1); d.R(1, 10, 14, 1, T2); d.L(5, 10, 7, 15, I, 1); d.L(10, 10, 8, 15, I, 1); d.L(2, 6, 5, 3, B2, 1); d.L(11, 6, 14, 3, B2, 1); },
  };

  function build(name) {
    const fn = DEF[name];
    if (!fn) return null;
    const { c, g } = Art.cv(SZ, SZ);
    const d = {
      g,
      R: (x, y, w, h, col) => Art.rect(g, x, y, w, h, col),
      E: (x, y, rx, ry, col) => Art.ell(g, x, y, rx, ry, col),
      L: (x0, y0, x1, y1, col, t) => Art.line(g, x0, y0, x1, y1, col, t || 1),
    };
    fn(d);
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
  // <img> markup for panels and hotbars
  function img(name, cls = '', extra = '') {
    return `<img class="ico ${cls}" src="${url(name)}" alt="" ${extra}>`;
  }
  // draw straight onto the game canvas
  function blit(g, name, x, y, scale = 1) {
    const c = canvas(name);
    if (c) g.drawImage(c, Math.round(x), Math.round(y), SZ * scale, SZ * scale);
  }
  return { url, img, blit, canvas, names: () => Object.keys(DEF) };
})();
