// ---- Procedural pixel icons for the interface (no emoji anywhere) ----------
const Icons = (() => {
  const SZ = 16, urls = new Map(), canvases = new Map();
  const W = PAL.wood2, WL = PAL.wood3, WD = PAL.wood1, I = PAL.ink, C = PAL.cream, G = PAL.gold, GL = PAL.goldL, GD = PAL.goldD, RD = PAL.red, RL = PAL.redL, T = PAL.teal, L1 = PAL.leaf1, L2 = PAL.leaf2, L3 = PAL.leaf3;

  const DEF = {
    // --- interface ---
    coin: (d) => { d.E(8, 9, 6.5, 6.5, GD); d.E(8, 8, 6, 6, G); d.E(7, 7, 3, 3, GL); d.R(6, 5, 1, 7, GD); d.R(9, 5, 1, 7, GD); d.R(5, 7, 6, 1, GD); },
    cubes: (d) => { d.R(2, 8, 6, 6, PAL.soil1); d.R(2, 8, 6, 1, PAL.soil2); d.R(8, 8, 6, 6, PAL.soil0); d.R(8, 8, 6, 1, PAL.soil1); d.R(5, 2, 6, 6, PAL.soil1); d.R(5, 2, 6, 1, PAL.soil2); d.R(9, 6, 2, 2, PAL.soil0); },
    acorn: (d) => { d.E(8, 10, 4.5, 5, PAL.wood3); d.E(8, 11, 3, 3.5, PAL.wood4); d.E(8, 5, 5.5, 3, PAL.bark1); d.E(8, 4.5, 5, 2.4, PAL.bark2); d.R(7, 1, 2, 3, PAL.bark0); d.R(6, 9, 1, 2, PAL.wood2); },
    trophy: (d) => { d.R(4, 2, 8, 6, G); d.E(8, 8, 4, 3, GL); d.R(2, 3, 2, 3, GD); d.R(12, 3, 2, 3, GD); d.R(7, 11, 2, 2, GD); d.R(4, 13, 8, 2, PAL.wood2); d.R(4, 13, 8, 1, PAL.wood3); d.R(6, 4, 2, 2, GL); },
    shop: (d) => { d.R(1, 6, 14, 8, W); d.R(1, 6, 14, 1, WL); for (let i = 0; i < 4; i++) { d.R(1 + i * 4, 2, 2, 4, RD); d.R(3 + i * 4, 2, 2, 4, C); } d.R(1, 2, 14, 1, WD); d.R(5, 9, 6, 5, WD); d.R(6, 10, 4, 4, PAL.parch0); },
    tree: (d) => { d.R(7, 9, 2, 6, PAL.bark2); d.E(8, 6, 6, 5, L1); d.E(7, 5, 4, 3.5, L2); d.E(6, 4, 2, 2, L3); d.R(6, 13, 4, 1, PAL.bark1); },
    tent: (d) => { for (let i = 0; i < 5; i++) { const x = 1 + i * 3; d.R(x, 7, 2, 7, i % 2 ? RD : C); } d.L(8, 1, 1, 8, RD, 1); d.L(8, 1, 15, 8, RD, 1); d.R(1, 7, 14, 1, GD); d.R(7, 0, 2, 2, G); d.R(6, 10, 4, 4, PAL.ink2); },
    paw: (d) => { d.E(8, 10, 4, 3.5, PAL.wood3); d.E(4, 5, 1.8, 2, PAL.wood3); d.E(7, 4, 1.8, 2.2, PAL.wood3); d.E(10, 4, 1.8, 2.2, PAL.wood3); d.E(13, 6, 1.8, 2, PAL.wood3); },
    sound: (d) => { d.R(2, 6, 3, 4, PAL.ink2); d.L(5, 6, 8, 3, PAL.ink2, 1); d.L(5, 9, 8, 12, PAL.ink2, 1); d.R(5, 6, 3, 4, PAL.ink2); d.R(10, 6, 1, 1, T); d.R(11, 5, 1, 3, T); d.R(13, 4, 1, 5, T); },
    mute: (d) => { d.R(2, 6, 3, 4, PAL.ink2); d.L(5, 6, 8, 3, PAL.ink2, 1); d.L(5, 9, 8, 12, PAL.ink2, 1); d.R(5, 6, 3, 4, PAL.ink2); d.L(10, 4, 14, 10, RD, 1); d.L(14, 4, 10, 10, RD, 1); },
    help: (d) => { d.R(4, 2, 8, 3, PAL.wood3); d.R(10, 4, 3, 4, PAL.wood3); d.R(7, 7, 3, 3, PAL.wood3); d.R(7, 12, 3, 3, PAL.wood3); d.R(3, 4, 3, 2, PAL.wood3); },
    heart: (d) => { d.E(5.5, 6, 3.2, 3.2, RD); d.E(10.5, 6, 3.2, 3.2, RD); d.E(8, 9, 4.5, 4.5, RD); d.E(5, 5, 1.4, 1.4, RL); },
    close: (d) => { d.L(3, 3, 12, 12, C, 2); d.L(12, 3, 3, 12, C, 2); },
    plus: (d) => { d.R(7, 3, 2, 10, C); d.R(3, 7, 10, 2, C); },
    lock: (d) => { d.R(4, 7, 8, 7, PAL.stone1); d.R(4, 7, 8, 1, PAL.stone2); d.R(6, 3, 4, 4, PAL.stone0); d.R(7, 9, 2, 3, PAL.ink2); },
    bowl: (d) => {
      d.E(8, 10, 7, 4.5, PAL.wood2);
      d.E(8, 9, 6, 3.4, PAL.wood0);
      d.E(8, 8.5, 5, 2.4, PAL.wood3);
      d.R(1, 9, 14, 1, PAL.wood3);
      d.R(6, 5, 2, 3, L1); d.R(9, 6, 2, 2, L2);
      d.E(8, 13.5, 5, 1.6, PAL.wood1);
    },
    // --- feed ---
    grass: (d) => { for (let i = 0; i < 4; i++) { const x = 3 + i * 3; d.L(x, 14, x + (i % 2 ? 2 : -2), 4 + (i % 2), L1, 1); d.L(x + 1, 14, x + 1, 6, L2, 1); } d.E(8, 14, 6, 2, PAL.soil1); },
    carrot: (d) => { d.L(8, 14, 8, 6, '#e07a2a', 3); d.R(6, 6, 5, 4, '#e07a2a'); d.R(6, 6, 5, 1, '#f09a4a'); d.R(7, 10, 3, 3, '#c05a1a'); d.R(5, 3, 2, 4, L2); d.R(8, 2, 2, 5, L1); d.R(10, 4, 2, 3, L2); },
    potato: (d) => { d.E(8, 9, 6, 5, '#b06a3a'); d.E(7, 8, 4.5, 3.5, '#c88a52'); d.E(6, 7, 2, 1.5, '#dba874'); d.R(5, 10, 1, 1, '#8a4a24'); d.R(10, 8, 1, 1, '#8a4a24'); d.R(4, 4, 3, 2, L1); },
    honey: (d) => { d.R(4, 4, 8, 9, GD); d.R(4, 4, 8, 5, G); d.R(4, 4, 8, 1, GL); d.R(3, 2, 10, 2, PAL.wood2); d.R(6, 13, 4, 2, PAL.wood1); d.R(7, 6, 1, 1, GL); d.L(12, 9, 13, 13, G, 1); },
    fern: (d) => { d.L(8, 15, 8, 3, L1, 1); for (let i = 0; i < 5; i++) { const y = 4 + i * 2.2, w = 2 + i * 0.8; d.L(8, y, 8 - w, y - 1, L2, 1); d.L(8, y, 8 + w, y - 1, L3, 1); } d.R(7, 14, 3, 1, PAL.soil1); },
    ironroot: (d) => { d.E(8, 9, 5.5, 5, PAL.stone1); d.E(7, 8, 3.5, 3, PAL.stone2); d.R(2, 6, 3, 2, PAL.stone0); d.R(11, 10, 3, 2, PAL.stone0); d.R(6, 3, 1, 4, PAL.bark1); d.R(9, 2, 1, 5, PAL.bark2); d.R(6, 8, 1, 1, PAL.stone0); },
    mushroom: (d) => { d.E(8, 7, 7, 4.5, RD); d.E(6, 6, 3, 2, RL); d.R(5, 4, 2, 2, C); d.R(10, 6, 2, 2, C); d.R(8, 5, 1, 1, C); d.R(6, 10, 4, 5, PAL.parch1); d.R(6, 10, 1, 5, PAL.parch0); },
    corn: (d) => { d.E(8, 9, 4, 6, G); for (let y = 4; y < 15; y += 2) for (let x = 5; x < 11; x += 2) d.R(x + (y % 4 ? 0 : 1), y, 1, 1, GL); d.L(4, 12, 2, 4, L1, 1); d.L(12, 12, 14, 4, L2, 1); d.R(7, 2, 2, 2, GD); },
    // --- cubes ---
    c_normal: (d) => cubeIcon(d, PAL.soil1, 3, 3, 10, 10),
    c_big: (d) => cubeIcon(d, PAL.soil0, 1, 1, 14, 14),
    c_sticky: (d) => { cubeIcon(d, '#c58a2a', 3, 3, 10, 10); d.R(4, 12, 2, 3, '#e0a840'); d.R(9, 12, 2, 2, '#e0a840'); },
    c_light: (d) => { cubeIcon(d, '#d9c19a', 3, 4, 10, 8); d.R(7, 5, 2, 6, '#f0e0c0'); },
    c_heavy: (d) => { cubeIcon(d, '#5a5a66', 3, 3, 10, 10); d.R(5, 5, 1, 1, PAL.stone2); d.R(10, 5, 1, 1, PAL.stone2); d.R(5, 10, 1, 1, PAL.stone2); d.R(10, 10, 1, 1, PAL.stone2); },
    c_slab: (d) => { cubeIcon(d, '#5a7a3a', 1, 6, 14, 5); d.R(5, 7, 1, 3, '#3f5a26'); d.R(9, 7, 1, 3, '#3f5a26'); },
    c_gold: (d) => { cubeIcon(d, G, 3, 3, 10, 10); d.R(6, 6, 4, 4, GD); d.R(7, 6, 2, 1, GL); d.R(4, 4, 1, 1, GL); },
    // --- farm ---
    fence: (d) => { d.R(1, 5, 14, 2, WL); d.R(1, 10, 14, 2, W); d.R(3, 2, 3, 13, W); d.R(3, 2, 1, 13, WL); d.R(10, 2, 3, 13, W); d.R(10, 2, 1, 13, WL); },
    trough: (d) => { d.R(1, 7, 14, 6, W); d.R(1, 7, 14, 1, WL); d.R(3, 8, 10, 3, PAL.water1); d.R(3, 8, 10, 1, PAL.water2); d.R(2, 13, 2, 2, WD); d.R(12, 13, 2, 2, WD); d.R(6, 3, 4, 4, G); },
    barrow: (d) => { d.R(3, 5, 10, 5, W); d.R(3, 5, 10, 1, WL); d.E(5, 12, 2.5, 2.5, PAL.ink2); d.E(5, 12, 1, 1, PAL.stone1); d.R(12, 8, 3, 1, WD); d.R(3, 3, 8, 2, PAL.soil1); },
    bleachers: (d) => { for (let i = 0; i < 4; i++) { d.R(1 + i, 5 + i * 2.5, 14 - i * 2, 2, i % 2 ? W : WL); } d.R(2, 3, 2, 2, RD); d.R(6, 2, 2, 2, T); d.R(10, 3, 2, 2, G); },
    ball: (d) => { d.E(8, 8, 6.5, 6.5, RD); d.E(6, 6, 2.5, 2.5, RL); d.R(1, 7, 14, 2, C); },
    tunnel: (d) => { d.E(8, 13, 7.5, 7, PAL.soil1); d.E(8, 13, 6, 5.5, PAL.soil2); d.E(8, 14, 3, 4, '#1a0f08'); d.E(4, 6, 3, 2, L1); d.E(12, 6, 3, 2, L2); },
    mud: (d) => { d.E(8, 10, 7, 4.5, PAL.soil0); d.E(8, 10, 5.5, 3.2, '#4a3020'); d.E(6, 9, 2, 1, '#6a4a30'); d.R(11, 6, 1, 2, '#8a6a48'); },
    flowerbed: (d) => { d.R(1, 10, 14, 5, PAL.soil1); d.R(1, 10, 14, 1, PAL.soil2); for (let i = 0; i < 4; i++) { const x = 3 + i * 3.3; d.R(x, 6, 1, 5, L1); d.R(x - 1, 4, 3, 2, i % 2 ? RD : G); d.R(x, 3, 1, 3, i % 2 ? RL : GL); } },
    lantern: (d) => { d.R(2, 2, 12, 1, WD); d.R(4, 3, 8, 2, PAL.ink2); d.R(4, 5, 8, 7, PAL.ink2); d.R(5, 6, 6, 5, GL); d.R(6, 7, 4, 3, C); d.R(4, 12, 8, 2, PAL.ink2); d.R(7, 14, 2, 2, WD); },
    wombat: (d) => { d.E(7, 9, 6, 4.5, PAL.wood3); d.E(12, 8, 3.5, 3, PAL.wood3); d.E(11, 5, 1.6, 1.6, PAL.wood2); d.E(13.6, 4.6, 1.6, 1.6, PAL.wood2); d.R(12, 7, 1.5, 1.5, I); d.R(14, 8, 2, 1, I); d.R(3, 12, 2, 2, PAL.wood1); d.R(8, 12, 2, 2, PAL.wood1); d.E(2, 8, 1.4, 1.6, PAL.wood2); },
    // --- skills ---
    s_paw: (d) => { d.E(8, 11, 4, 3.2, PAL.wood3); d.E(4.5, 6, 1.7, 2, PAL.wood3); d.E(7, 5, 1.7, 2, PAL.wood3); d.E(9.6, 5, 1.7, 2, PAL.wood3); d.E(12, 7, 1.7, 2, PAL.wood3); d.E(8, 11, 2, 1.4, RL); },
    s_gut: (d) => { d.E(8, 9, 5.5, 5, RL); d.E(8, 9, 4, 3.6, PAL.parch0); d.L(5, 9, 11, 9, RD, 1); d.L(6, 6, 6, 12, RD, 1); d.L(10, 6, 10, 12, RD, 1); },
    s_twin: (d) => { d.R(2, 7, 6, 6, PAL.soil1); d.R(2, 7, 6, 1, PAL.soil2); d.R(8, 4, 6, 6, PAL.soil1); d.R(8, 4, 6, 1, PAL.soil2); d.R(12, 12, 3, 3, GL); },
    s_calm: (d) => { d.E(8, 8, 6, 6, T); d.E(8, 8, 4, 4, PAL.tealL); d.E(8, 8, 2, 2, C); d.R(1, 7, 2, 2, T); d.R(13, 7, 2, 2, T); },
    s_claw: (d) => { d.R(2, 2, 12, 2, PAL.ink2); d.R(7, 4, 2, 5, PAL.stone1); d.R(4, 9, 8, 2, PAL.stone2); d.R(4, 9, 2, 5, PAL.stone1); d.R(10, 9, 2, 5, PAL.stone1); d.R(7, 12, 2, 3, PAL.soil1); },
    s_guide: (d) => { d.E(8, 8, 6.5, 6.5, T); d.E(8, 8, 4, 4, PAL.parch1); d.E(8, 8, 2, 2, RD); d.R(7, 0, 2, 3, T); d.R(7, 13, 2, 3, T); d.R(0, 7, 3, 2, T); d.R(13, 7, 3, 2, T); },
    s_base: (d) => { d.R(1, 10, 14, 4, PAL.stone1); d.R(1, 10, 14, 1, PAL.stone2); d.R(5, 4, 6, 6, PAL.soil1); d.R(5, 4, 6, 1, PAL.soil2); d.R(1, 14, 14, 1, PAL.stone0); },
    s_gyro: (d) => { d.E(8, 8, 7, 7, T); d.E(8, 8, 5, 5, PAL.parch1); d.E(8, 8, 3, 3, T); for (let i = 0; i < 3; i++) { const a = i * 2.1; d.R(8 + Math.cos(a) * 6, 8 + Math.sin(a) * 6, 2, 2, PAL.tealL); } },
    s_voice: (d) => { d.L(3, 8, 12, 3, G, 2); d.L(3, 8, 12, 13, G, 2); d.R(2, 6, 3, 5, GD); d.R(11, 2, 3, 12, GL); d.R(13, 6, 2, 4, GD); },
    s_cart: (d) => { d.R(2, 5, 12, 6, RD); d.R(2, 5, 12, 1, RL); for (let x = 3; x < 14; x += 3) d.R(x, 6, 1, 5, C); d.E(5, 13, 2.2, 2.2, PAL.ink2); d.E(11, 13, 2.2, 2.2, PAL.ink2); d.R(6, 2, 4, 3, G); },
    s_eye: (d) => { d.E(8, 8, 7, 4.5, C); d.E(8, 8, 4, 4, T); d.E(8, 8, 2, 2, I); d.E(6.5, 6.5, 1, 1, C); d.L(2, 4, 4, 6, PAL.ink2, 1); d.L(14, 4, 12, 6, PAL.ink2, 1); },
    s_legend: (d) => { d.R(7, 1, 2, 14, G); d.R(1, 7, 14, 2, G); d.L(3, 3, 13, 13, GL, 2); d.L(13, 3, 3, 13, GL, 2); d.E(8, 8, 3, 3, GD); d.E(8, 8, 2, 2, GL); },
    // --- perks ---
    p_glue: (d) => { d.R(5, 3, 6, 4, PAL.stone1); d.R(4, 7, 8, 8, '#c58a2a'); d.R(4, 7, 8, 1, '#e0a840'); d.R(6, 1, 4, 2, PAL.stone2); d.R(5, 13, 2, 3, '#e0a840'); },
    p_feather: (d) => { d.L(4, 14, 12, 3, C, 1); for (let i = 0; i < 6; i++) { const t = i / 6, x = U.lerp(4, 12, t), y = U.lerp(14, 3, t); d.L(x, y, x - 3 + i * 0.4, y - 1, PAL.parch1, 1); d.L(x, y, x + 2, y + 1, PAL.parch0, 1); } },
    p_hype: (d) => { d.R(2, 8, 12, 5, RD); d.R(2, 8, 12, 1, RL); d.E(5, 14, 1.8, 1.8, PAL.ink2); d.E(11, 14, 1.8, 1.8, PAL.ink2); d.R(3, 4, 4, 4, PAL.stone1); d.R(9, 2, 2, 4, C); d.R(11, 3, 2, 3, C); },
    p_bedrock: (d) => { d.R(1, 8, 14, 7, PAL.stone1); d.R(1, 8, 14, 1, PAL.stone2); d.R(5, 9, 1, 6, PAL.stone0); d.R(10, 9, 1, 6, PAL.stone0); d.R(4, 3, 8, 5, PAL.soil1); d.R(4, 3, 8, 1, PAL.soil2); },
    p_net: (d) => { d.R(1, 4, 14, 2, W); for (let x = 2; x < 15; x += 3) d.L(x, 6, x, 14, PAL.parch0, 1); for (let y = 7; y < 15; y += 3) d.R(1, y, 14, 1, PAL.parch0); d.R(1, 4, 2, 11, WD); d.R(13, 4, 2, 11, WD); },
    p_gold: (d) => { d.E(5, 11, 4, 4, G); d.E(11, 11, 4, 4, G); d.E(8, 6, 4, 4, G); d.E(4, 10, 1.5, 1.5, GL); d.E(7, 5, 1.5, 1.5, GL); },
    p_big: (d) => { d.R(1, 1, 8, 8, PAL.soil1); d.R(1, 1, 8, 1, PAL.soil2); d.R(9, 9, 6, 6, PAL.soil0); d.R(11, 4, 4, 2, GL); d.R(12, 2, 2, 4, GL); },
    p_slow: (d) => { d.E(8, 8, 6.5, 6.5, PAL.parch1); d.E(8, 8, 5, 5, C); d.R(7, 4, 2, 5, I); d.R(8, 8, 4, 2, I); d.R(7, 1, 2, 2, PAL.ink2); },
    p_encore: (d) => { d.E(5, 7, 3.5, 4, C); d.E(11, 7, 3.5, 4, PAL.parch0); d.R(4, 6, 1, 1, I); d.R(6, 6, 1, 1, I); d.R(10, 6, 1, 1, I); d.R(12, 6, 1, 1, I); d.R(4, 9, 3, 1, I); d.R(10, 9, 3, 1, I); d.R(2, 12, 12, 3, RD); },
    p_magnet: (d) => { d.R(3, 3, 4, 8, RD); d.R(9, 3, 4, 8, PAL.stone1); d.E(8, 4, 5, 4, RD); d.E(8, 4, 2.5, 2, PAL.parch1); d.R(3, 11, 4, 3, PAL.stone2); d.R(9, 11, 4, 3, RL); },
    p_tax: (d) => { d.R(3, 2, 10, 12, PAL.parch1); d.R(3, 2, 10, 1, C); for (let y = 5; y < 12; y += 2) d.R(5, y, 6, 1, PAL.stone1); d.R(3, 13, 10, 2, PAL.parch0); d.E(11, 11, 3, 3, G); },
    p_calm: (d) => { d.E(5, 9, 4, 3, C); d.E(9, 8, 5, 3.5, C); d.E(12, 10, 3, 2.5, PAL.parch1); d.E(4, 4, 3, 3, G); d.R(1, 3, 2, 1, GL); d.R(4, 1, 1, 2, GL); },
  };
  function cubeIcon(d, col, x, y, w, h) {
    d.R(x, y, w, h, col);
    d.R(x, y, w, 2, U.shade(col, 0.3));
    d.R(x, y + h - 2, w, 2, U.shade(col, -0.3));
    d.R(x + w - 2, y, 2, h, U.shade(col, -0.2));
    d.R(x + 2, y + 3, 2, 2, U.shade(col, -0.12));
  }

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
