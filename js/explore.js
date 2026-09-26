// ---- Explore: places out past the farm you can walk, forage and buy ---------------------------
// Three of them, each a long painted panorama you drag along (the near ground
// moves at full speed, the hills and trees behind at their own):
//   STILL LAKE   a lake at golden hour: willows, a jetty, a moored boat, reeds,
//                lily pads, ducks going round, dragonflies over the water
//   BLACKWOOD    old dark pines, shafts of light through them, mossy logs, a
//                creek, glowing mushrooms, fireflies, an owl that blinks
//   FERN GULLY   a green gully between rock walls: a waterfall into a pool,
//                tree ferns, mist, crystals in the rock, butterflies
// Things lie about to be picked up (they pay W$ and go in your field guide)
// and come back each new day. Each place has a FOR SALE sign; buy it and you
// find twice as much there, and it unlocks its own building for the factory.
const Explore = (() => {
  const VW = 640, VH = 360, WW = 1700, GY = 300;          // world width; where the ground is
  let G = null, place = null, scroll = 0, tscroll = 0, t = 0, drag = null, moved = 0, hover = null, fade = 1;
  const layers = {};
  const TAU = Math.PI * 2;

  // ---- the places ------------------------------------------------------------------------------
  const PLACES = {
    lake: {
      name: 'Still Lake', cost: 900, unlock: 'fishtrap', seed: 101,
      blurb: 'Glassy water, willows, a jetty somebody built and forgot.',
      sky: [[0, '#6a8ad8'], [0.55, '#f0a8a0'], [1, '#ffd8a0']],
      finds: [['shell', 'River Shell', 4], ['stone', 'Skipping Stone', 3], ['feather', 'Duck Feather', 5], ['lily', 'Water Lily', 9], ['bottle', 'Message in a Bottle', 40]],
    },
    wood: {
      name: 'Blackwood', cost: 1400, unlock: 'shroomlog', seed: 202,
      blurb: 'Old pines, a cold creek, and things that glow after dark.',
      sky: [[0, '#1e3a4a'], [0.6, '#3e6a6a'], [1, '#8ab89a']],
      finds: [['mushroom', 'Wild Mushroom', 6], ['pinecone', 'Pine Cone', 3], ['moss', 'Soft Moss', 4], ['antler', 'Shed Antler', 25], ['truffle', 'Black Truffle', 45]],
    },
    gully: {
      name: 'Fern Gully', cost: 2200, unlock: 'beehive', seed: 303,
      blurb: 'A waterfall, a green pool, and ferns taller than you.',
      sky: [[0, '#5ab0e0'], [0.6, '#b0e4e8'], [1, '#e8f8d8']],
      finds: [['frond', 'Fern Frond', 3], ['berry', 'Wild Berries', 5], ['orchid', 'Rock Orchid', 12], ['lyre', 'Lyrebird Feather', 20], ['crystal', 'Gully Crystal', 30]],
    },
  };
  const owned = (k) => !!(G && G.lands && G.lands[k]);
  const day = () => Math.floor((G.time || 0) / 720);

  // ---- painting: done once per place into three canvases ------------------------------------------
  function paint(k) {
    if (layers[k]) return layers[k];
    const P = PLACES[k], r = Art.rng(P.seed);
    const farW = Math.ceil(VW + (WW - VW) * 0.3), midW = Math.ceil(VW + (WW - VW) * 0.6);
    const sky = Art.cv(VW, VH), far = Art.cv(farW, VH), mid = Art.cv(midW, VH), near = Art.cv(WW, VH);
    Art.vramp(sky.g, 0, 0, VW, VH, P.sky, 12);
    const R = (g, x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
    const ridge = (g, w, base, amp, f1, col, top, seed) => {
      for (let x = 0; x < w; x++) {
        const y = Math.round(base - Math.abs(Math.sin(x * f1 + seed)) * amp - Math.sin(x * f1 * 2.7 + seed * 2) * amp * 0.3);
        R(g, x, y, 1, VH - y, col); if (top) R(g, x, y, 1, 2, top);
      }
    };
    const tree = (g, kind, x, base, s, sh) => {
      const img = Props.get('tree', `${kind}|${Math.floor(r() * 6)}|${sh.toFixed(2)}`);
      const w = img.width * s, h = img.height * s;
      g.drawImage(img, Math.round(x - w / 2), Math.round(base - h), Math.round(w), Math.round(h));
    };
    if (k === 'lake') {
      // sun low on the water, two ranks of violet hills
      Art.glow(sky.g, 470, 150, 110, '#fff0c0', 0.5, 7); Art.ell(sky.g, 470, 150, 20, 20, '#fff4d0');
      ridge(far.g, farW, 196, 40, 0.008, '#8a7ab8', '#a898d0', 1);
      ridge(far.g, farW, 206, 22, 0.016, '#6a6aa8', '#8484c0', 4);
      // the far shore's treeline, then the water itself on the mid layer
      for (let x = 0; x < midW; x += 18) tree(mid.g, r() < 0.4 ? 'pine' : 'oak', x + r() * 10, 214, 0.32 + r() * 0.08, 0.35);
      R(mid.g, 0, 212, midW, 4, '#4a6a4a');
      // the lake: bands of colour, the sun's path, reflections of the far trees
      const WAT = ['#f0b0a0', '#d898a8', '#a888b8', '#7a80b8', '#5a74a8', '#4a6498'];
      for (let i = 0; i < 6; i++) R(near.g, 0, 216 + i * 12, WW, 12, WAT[i]);
      for (let x = 0; x < WW; x += 3) { const y = 222 + ((x * 7) % 60); R(near.g, x, y, 2 + (x % 5), 1, 'rgba(255,255,255,0.18)'); }
      // near shore: sand then grass
      R(near.g, 0, 288, WW, 8, '#e8c890'); R(near.g, 0, 288, WW, 2, '#fff0c0');
      R(near.g, 0, 296, WW, VH, '#6aa84a'); R(near.g, 0, 296, WW, 2, '#8ac860');
      for (let i = 0; i < 600; i++) R(near.g, r() * WW, 298 + r() * 60, 1, 2 + r() * 3, r() < 0.5 ? '#4a8a32' : '#8ac860');
      // willows along the shore
      for (const x of [140, 520, 1180, 1560]) {
        R(near.g, x - 3, 230, 6, 70, '#5a3a1e'); R(near.g, x - 3, 230, 2, 70, '#7a5230');
        for (let i = 0; i < 40; i++) {
          const a = -Math.PI / 2 + (r() - 0.5) * 2.4, L = 30 + r() * 30, sx = x + Math.cos(a) * 20, sy = 228 + Math.sin(a) * 18;
          for (let j = 0; j < L; j++) R(near.g, sx + Math.sin(j * 0.2 + i) * 2 + (sx - x) * j * 0.012, sy + j, 1, 1, j % 5 ? '#6aa84a' : '#9ad06a');
        }
      }
      // the jetty, with a boat tied to it
      const jx = 820;
      for (let i = 0; i < 9; i++) R(near.g, jx + i * 10, 262, 9, 4, i % 2 ? '#a8783e' : '#b8884a');
      R(near.g, jx, 266, 90, 2, '#5a3a1e');
      for (const px of [jx, jx + 40, jx + 86]) R(near.g, px, 262, 3, 30, '#5a3a1e');
      Art.poly(near.g, [[jx + 100, 262], [jx + 150, 262], [jx + 142, 272], [jx + 108, 272]], '#c84a3a');
      R(near.g, jx + 100, 262, 50, 2, '#f4f0e0'); R(near.g, jx + 118, 258, 14, 4, '#8a5a30');
      // reeds and lily pads
      for (let i = 0; i < 70; i++) {
        const x = r() * WW, h = 10 + r() * 16;
        R(near.g, x, 290 - h, 1, h, '#4a7a32'); if (r() < 0.4) R(near.g, x - 1, 290 - h, 3, 5, '#7a4a2a');
      }
      for (let i = 0; i < 26; i++) { const x = r() * WW, y = 250 + r() * 34; Art.ell(near.g, x, y, 6, 2.5, '#4a8a42'); R(near.g, x, y - 1, 3, 1, '#2e5a2a'); if (r() < 0.3) Art.ell(near.g, x + 2, y - 2, 2, 2, '#f8b0c8'); }
      // the near bank: flowers, bushes, rocks, a bench to sit and watch it from
      for (let i = 0; i < 70; i++) { const img = Props.get('flower', Math.floor(r() * 6)); near.g.drawImage(img, Math.round(r() * WW), 298 + Math.round(r() * 48)); }
      for (let i = 0; i < 20; i++) { const img = Props.get('rock', i % 3); near.g.drawImage(img, Math.round(r() * WW), 300 + Math.round(r() * 44)); }
      for (let i = 0; i < 14; i++) {
        const x = r() * WW, y = 318 + r() * 30;
        Art.ell(near.g, x, y, 18, 10, '#2e6a2a'); Art.ell(near.g, x - 3, y - 3, 14, 8, '#4a8a3a'); Art.ell(near.g, x - 6, y - 6, 7, 4, '#6aac4a');
        for (let j = 0; j < 4; j++) Art.ell(near.g, x - 10 + j * 7, y - 4 - (j % 2) * 3, 1.6, 1.6, j % 2 ? '#f8f0f8' : '#f890b0');
      }
      for (const bx of [380, 1320]) {
        R(near.g, bx, 306, 44, 4, '#a8783e'); R(near.g, bx, 306, 44, 1, '#d8a868'); R(near.g, bx, 298, 44, 3, '#a8783e');
        R(near.g, bx + 2, 310, 3, 10, '#5a3a1e'); R(near.g, bx + 39, 310, 3, 10, '#5a3a1e'); R(near.g, bx + 2, 298, 2, 12, '#5a3a1e'); R(near.g, bx + 40, 298, 2, 12, '#5a3a1e');
      }
    } else if (k === 'wood') {
      ridge(far.g, farW, 150, 30, 0.01, '#16303a', null, 2);
      for (let x = 0; x < farW; x += 14) tree(far.g, 'pine', x + r() * 8, 250, 0.5 + r() * 0.2, 0.75);
      for (let x = 0; x < midW; x += 30) tree(mid.g, r() < 0.8 ? 'pine' : 'gnarl', x + r() * 16, 280, 0.8 + r() * 0.3, 0.5);
      // the forest floor: needles, moss, the creek
      R(near.g, 0, 282, WW, VH, '#3a4a2a'); R(near.g, 0, 282, WW, 3, '#5a7a3a');
      for (let i = 0; i < 900; i++) R(near.g, r() * WW, 284 + r() * 76, 2, 1, ['#5a4a2a', '#4a6a2e', '#6a5a34', '#2e3a22'][Math.floor(r() * 4)]);
      for (let x = 0; x < WW; x++) { const y = 318 + Math.sin(x * 0.01) * 10; R(near.g, x, y, 1, 10, '#3a6a8a'); R(near.g, x, y, 1, 2, '#6aa0c0'); }
      for (let i = 0; i < 12; i++) { const img = Props.get('fallen', i % 3); near.g.drawImage(img, Math.round(r() * WW), 262 + Math.round(r() * 20)); }
      for (let i = 0; i < 40; i++) { const img = Props.get('rock', i % 3); near.g.drawImage(img, Math.round(r() * WW), 290 + Math.round(r() * 50)); }
      // big trunks right up close
      for (const x of [60, 420, 760, 1120, 1480]) {
        R(near.g, x - 14, 0, 28, 300, '#2a1a10'); R(near.g, x - 14, 0, 7, 300, '#4a3220'); R(near.g, x + 8, 0, 6, 300, '#1a100a');
        for (let y = 20; y < 290; y += 16) R(near.g, x - 10 + (y % 3) * 4, y, 6, 2, '#1a100a');
        for (let i = 0; i < 12; i++) Art.ell(near.g, x - 14 + r() * 6, 180 + r() * 110, 4, 3, '#4a7a32');
      }
      // ferns along the floor
      for (let i = 0; i < 60; i++) {
        const x = r() * WW, y = 284 + r() * 30;
        for (let j = 0; j < 6; j++) Art.limb(near.g, x, y, x + (j - 2.5) * 5, y - 10 - r() * 6, 1.2, 0.6, j % 2 ? '#3a7a32' : '#5a9a3e');
      }
    } else {
      // the rock walls of the gully: layered strata, cracks, moss on every ledge
      const ROCK = ['#4e5a50', '#5e6a5e', '#6e7a6c', '#808c7c', '#98a490'];
      for (let x = 0; x < farW; x++) {
        const top = Math.round(96 - Math.abs(Math.sin(x * 0.011 + 3)) * 44 - Math.sin(x * 0.03) * 8);
        for (let y = top; y < VH; y++) {
          const band = Math.floor((y + Math.sin(x * 0.02) * 4) / 14);
          R(far.g, x, y, 1, 1, ROCK[1 + (band % 3)]);
        }
        R(far.g, x, top, 1, 2, ROCK[4]);
        for (let band = Math.ceil(top / 14); band < 22; band++) {                // the lit lip of each ledge
          const y = Math.round(band * 14 - Math.sin(x * 0.02) * 4);
          if (y > top + 2) { R(far.g, x, y, 1, 1, ROCK[4]); R(far.g, x, y + 1, 1, 1, ROCK[0]); }
        }
      }
      for (let i = 0; i < 60; i++) {                                              // cracks running down
        let x = r() * farW, y = 90 + r() * 120;
        for (let j = 0; j < 14 + r() * 20; j++) { R(far.g, x, y, 1, 2, ROCK[0]); x += (r() - 0.5) * 2; y += 2; }
      }
      for (let i = 0; i < 220; i++) {                                             // moss sitting on the ledges
        const x = r() * farW, band = 7 + Math.floor(r() * 14), y = band * 14 - Math.sin(x * 0.02) * 4;
        Art.ell(far.g, x, y - 1, 4 + r() * 8, 2 + r() * 1.5, r() < 0.5 ? '#4a8a3a' : '#6aac4a');
      }
      for (let i = 0; i < 45; i++) {                                              // vines hanging off them
        const x = r() * farW, y0 = 100 + r() * 90, len = 20 + r() * 50;
        for (let j = 0; j < len; j++) { const xx = x + Math.sin(j * 0.2 + i) * 1.5; R(far.g, xx, y0 + j, 1, 1, '#3a7a32'); if (j % 5 === 0) R(far.g, xx - 1, y0 + j, 3, 2, '#6ab850'); }
      }
      // tree ferns: a shaggy trunk and a crown of long arching fronds with leaflets
      const frond = (g, x, y, a, len, droop, c1, c2) => {
        let px = x, py = y;
        for (let j = 0; j < len; j++) {
          const u = j / len, ang = a + droop * u * u;
          px += Math.cos(ang); py += Math.sin(ang);
          R(g, px, py, 1, 1, c1);
          if (j % 2 === 0 && u > 0.1) {                                          // a leaflet each side
            const l = Math.round((1 - u) * 6 + 2), na = ang + Math.PI / 2;
            for (let q = 1; q <= l; q++) { R(g, px + Math.cos(na) * q, py + Math.sin(na) * q + q * 0.4, 1, 1, c2); R(g, px - Math.cos(na) * q, py - Math.sin(na) * q + q * 0.4, 1, 1, c2); }
          }
        }
      };
      for (let x = 0; x < midW; x += 70) {
        const bx = x + r() * 30, base = 292, h = 80 + r() * 50;
        R(mid.g, bx - 4, base - h, 8, h, '#4a2e1c'); R(mid.g, bx - 4, base - h, 3, h, '#6a4630');
        for (let y = base - h; y < base; y += 5) R(mid.g, bx - 5 + (y % 2), y, 10, 2, '#3a2214');     // the shaggy stubs
        for (let j = 0; j < 11; j++) {
          const a = -Math.PI + (j / 10) * Math.PI;
          frond(mid.g, bx, base - h, a, 34 + r() * 14, (a < -Math.PI / 2 ? -1 : 1) * 1.1, '#2e6a2a', j % 2 ? '#4a9a3a' : '#6ab850');
        }
        Art.ell(mid.g, bx, base - h, 5, 3, '#3a7a32');
      }
      // the floor: lush green with stones, and the pool under the waterfall
      R(near.g, 0, 290, WW, VH, '#4a9a3a'); R(near.g, 0, 290, WW, 3, '#7ac860');
      for (let i = 0; i < 1400; i++) R(near.g, r() * WW, 292 + r() * 68, 1, 2 + r() * 4, r() < 0.5 ? '#3a8a2e' : '#8ad060');
      Art.ell(near.g, 1100, 312, 150, 26, '#2a7a8a'); Art.ell(near.g, 1100, 310, 140, 22, '#4aa0b0'); Art.ell(near.g, 1080, 305, 70, 8, '#8ad0d8');
      for (let i = 0; i < 60; i++) { const x = 960 + r() * 280; R(near.g, x, 286 + r() * 8, 2 + r() * 3, 1, '#c8f0f4'); }
      // the cliff the water comes off, in the same strata
      for (let x = 1040; x < 1160; x++) for (let y = 40; y < 300; y++) R(near.g, x, y, 1, 1, ROCK[1 + (Math.floor((y + Math.sin(x * 0.05) * 3) / 12) % 3)]);
      R(near.g, 1040, 40, 120, 3, ROCK[4]);
      for (let i = 0; i < 30; i++) Art.ell(near.g, 1040 + r() * 120, 60 + r() * 220, 5 + r() * 5, 2.5, r() < 0.5 ? '#4a8a3a' : '#6aac4a');
      for (let i = 0; i < 40; i++) { const img = Props.get('rock', i % 3); near.g.drawImage(img, Math.round(r() * WW), 292 + Math.round(r() * 50)); }
      for (let i = 0; i < 50; i++) { const img = Props.get('flower', Math.floor(r() * 6)); near.g.drawImage(img, Math.round(r() * WW), 290 + Math.round(r() * 50)); }
      // big fern clumps in the foreground
      for (let i = 0; i < 26; i++) {
        const x = r() * WW, y = 300 + r() * 50;
        for (let j = 0; j < 7; j++) { const a = -Math.PI + 0.3 + (j / 6) * (Math.PI - 0.6); frond(near.g, x, y, a, 18 + r() * 10, (a < -Math.PI / 2 ? -1 : 1) * 1.4, '#2e6a2a', j % 2 ? '#4a9a3a' : '#7ac860'); }
      }
    }
    layers[k] = { sky: sky.c, far: far.c, mid: mid.c, near: near.c };
    return layers[k];
  }

  // ---- the forage -----------------------------------------------------------------------------------
  function finds() {
    if (!G.forage) G.forage = {};
    const P = PLACES[place];
    let f = G.forage[place];
    if (!f || f.day !== day()) {
      const r = Art.rng(P.seed * 7 + day() * 13);
      const n = owned(place) ? 16 : 8, items = [];
      for (let i = 0; i < n; i++) {
        const roll = r();
        const idx = roll < 0.3 ? 0 : roll < 0.55 ? 1 : roll < 0.78 ? 2 : roll < 0.94 ? 3 : 4;
        items.push({ id: i, k: idx, x: 120 + r() * (WW - 240), y: (place === 'lake' ? 300 : 296) + r() * 44, taken: false });
      }
      f = G.forage[place] = { day: day(), items };
    }
    return f.items;
  }
  function findArt(g, k, i, x, y, tt) {
    const R = (a, b, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(a), Math.round(b), w, h); };
    const E = (a, b, rx, ry, c) => Art.ell(g, a, b, rx, ry, c);
    const bob = Math.round(Math.sin(tt * 3 + x) * 1.5);
    y += bob;
    // a sparkle, so it reads as something to pick up
    if (Math.floor(tt * 2 + x) % 3 === 0) { R(x + 6, y - 14, 1, 3, '#ffffff'); R(x + 5, y - 13, 3, 1, '#ffffff'); }
    const key = PLACES[k].finds[i][0];
    switch (key) {
      case 'shell': E(x, y - 3, 5, 3, '#1a1420'); E(x, y - 3, 4, 2.4, '#f0d0c0'); for (let j = -3; j <= 3; j += 2) R(x + j, y - 5, 1, 3, '#c8a098'); break;
      case 'stone': E(x, y - 3, 5, 3, '#1a1420'); E(x, y - 3, 4.2, 2.4, '#9a9aa8'); R(x - 2, y - 5, 3, 1, '#d8d8e0'); break;
      case 'feather': for (let j = 0; j < 9; j++) R(x - 4 + j, y - 2 - j * 0.6, 2, 2, j % 2 ? '#f4f0e8' : '#c8c0b0'); R(x - 5, y - 1, 1, 1, '#1a1420'); break;
      case 'lily': E(x, y - 2, 6, 2.5, '#2e6a2a'); for (let j = 0; j < 5; j++) E(x + (j - 2) * 2, y - 5 - (j % 2), 1.6, 2.4, '#f8b0c8'); E(x, y - 5, 1.4, 1.4, '#ffe070'); break;
      case 'bottle': R(x - 5, y - 6, 10, 5, '#1a1420'); R(x - 4, y - 5, 8, 3, '#7ac8a8'); R(x + 4, y - 5, 3, 2, '#c8a060'); R(x - 2, y - 4, 4, 1, '#fff4d0'); break;
      case 'mushroom': R(x - 1, y - 5, 2, 5, '#f0e8d0'); E(x, y - 6, 5, 3, '#1a1420'); E(x, y - 6, 4, 2.4, '#d8402c'); R(x - 2, y - 7, 1, 1, '#ffffff'); R(x + 1, y - 6, 1, 1, '#ffffff'); break;
      case 'pinecone': E(x, y - 4, 3, 5, '#1a1420'); E(x, y - 4, 2.4, 4.2, '#8a5a30'); for (let j = 0; j < 3; j++) R(x - 2, y - 7 + j * 3, 4, 1, '#5a3a1e'); break;
      case 'moss': E(x, y - 2, 6, 3, '#1a1420'); E(x, y - 2, 5, 2.4, '#5aa03e'); R(x - 2, y - 4, 3, 1, '#8ad060'); break;
      case 'antler': for (let j = 0; j < 10; j++) R(x - 5 + j, y - 2 - Math.abs(j - 5) * 0.8, 2, 2, '#e8dcc0'); R(x - 3, y - 7, 1, 3, '#e8dcc0'); R(x + 3, y - 7, 1, 3, '#e8dcc0'); break;
      case 'truffle': E(x, y - 3, 5, 4, '#1a1420'); E(x, y - 3, 4, 3.2, '#3a2a20'); R(x - 1, y - 5, 1, 1, '#6a5a4a'); R(x + 2, y - 3, 1, 1, '#6a5a4a'); break;
      case 'frond': for (let j = 0; j < 8; j++) { R(x - 4 + j, y - 1 - j, 1, 1, '#2e6a2a'); R(x - 5 + j, y - 3 - j, 3, 1, '#5ab050'); } break;
      case 'berry': for (const [dx, dy] of [[-2, 0], [2, 0], [0, -2], [0, 1]]) { E(x + dx, y - 3 + dy, 2.2, 2.2, '#1a1420'); E(x + dx, y - 3 + dy, 1.6, 1.6, '#8a2a8a'); } R(x - 1, y - 7, 2, 2, '#4a8a32'); break;
      case 'orchid': R(x, y - 8, 1, 8, '#4a8a32'); for (const [dx, dy] of [[-2, 0], [2, 0], [0, -2], [0, 2]]) E(x + dx, y - 9 + dy, 1.8, 1.8, '#e8a8f0'); E(x, y - 9, 1.2, 1.2, '#ffe070'); break;
      case 'lyre': for (let j = 0; j < 12; j++) R(x - 6 + j, y - 2 - Math.sin(j * 0.4) * 6, 2, 2, j % 3 ? '#8a6a4a' : '#e8d8b0'); break;
      case 'crystal': Art.poly(g, [[x - 4, y], [x - 2, y - 10], [x + 1, y], [x + 2, y - 7], [x + 5, y]], '#1a1420'); Art.poly(g, [[x - 3, y - 1], [x - 2, y - 8], [x, y - 1]], '#8ae0f0'); Art.poly(g, [[x + 1, y - 1], [x + 2, y - 5], [x + 4, y - 1]], '#c0f4ff'); break;
    }
  }
  function collect(it) {
    const P = PLACES[place], [key, name, value] = P.finds[it.k];
    it.taken = true;
    G.wd += value;
    if (!G.fieldGuide) G.fieldGuide = {};
    G.fieldGuide[key] = (G.fieldGuide[key] || 0) + 1;
    G.stats.foraged = (G.stats.foraged || 0) + 1;
    FX.float(it.x - scroll, it.y - 22, `+${value} ${name}`, { color: PAL.gold4, size: 8 });
    FX.sparkle(it.x - scroll, it.y - 8, 8, PAL.gold3);
    Audio.play(value >= 20 ? 'chime' : 'pop');
    if (value >= 20) UI.toast(`a rare find: <b>${name}</b> (+${value} W$)`, 'good');
    UI.refreshHUD(); Main.save();
  }

  // ---- the deed ------------------------------------------------------------------------------------------
  const SIGN_X = 260;
  function buyLand() {
    const P = PLACES[place];
    if (owned(place)) { UI.toast(`<b>${P.name}</b> is yours`, 'good'); return; }
    if (G.wd < P.cost) { Audio.play('error'); UI.toast(`need <b>${P.cost} W$</b> to buy ${P.name}`, 'bad'); return; }
    G.wd -= P.cost;
    if (!G.lands) G.lands = {};
    G.lands[place] = true;
    if (G.forage) delete G.forage[place];                 // a fresh, fuller day's finds
    Audio.play('levelup'); FX.confettiBurst(VW / 2, 120, 50);
    const b = Factory.DEFS[P.unlock];
    UI.toast(`<b>${P.name}</b> is yours! Twice the finds here, and the <b>${b ? b.name : 'new building'}</b> is in the Build menu`, 'good');
    UI.refreshHUD(); Main.save();
  }

  // ---- scene flow -----------------------------------------------------------------------------------
  function enter(k) {
    place = PLACES[k] ? k : 'lake';
    paint(place);
    scroll = tscroll = 0; t = 0; hover = null; fade = 1;
    Audio.setMode('pen');
    const P = PLACES[place];
    UI.toast(`<b>${P.name}</b> &mdash; ${P.blurb} Drag to look along it; click things to pick them up.`, 'good');
  }
  function update(dt) {
    t += dt; fade = Math.max(0, fade - dt * 2);
    scroll = U.lerp(scroll, tscroll, 1 - Math.pow(0.002, dt));
  }
  const itemAt = (x, y) => finds().find((it) => !it.taken && Math.abs(x - (it.x - scroll)) < 16 && Math.abs(y - (it.y - 8)) < 16);
  const overSign = (x, y) => Math.abs(x - (SIGN_X - scroll)) < 40 && y > 220 && y < 300;
  function press(x, y) { drag = { x, s: tscroll }; moved = 0; }
  function move(x) { if (!drag) return; moved = Math.max(moved, Math.abs(x - drag.x)); tscroll = U.clamp(drag.s - (x - drag.x), 0, WW - VW); scroll = tscroll; }
  function release(x, y) {
    const was = drag && moved > 6; drag = null;
    if (was) return;
    const it = itemAt(x, y);
    if (it) { collect(it); return; }
    if (overSign(x, y)) buyLand();
  }
  function hoverAt(x, y) {
    const it = itemAt(x, y);
    if (it) { const [, name, v] = PLACES[place].finds[it.k]; return `<b>${name}</b><br>${v} W$ &middot; click to pick it up`; }
    if (overSign(x, y)) {
      const P = PLACES[place], b = Factory.DEFS[P.unlock];
      return owned(place) ? `<b>${P.name}</b><br>yours` : `<b>${P.name}</b> &mdash; for sale<br>${P.cost} W$ &middot; twice the finds, and unlocks the <b>${b ? b.name : ''}</b>`;
    }
    return null;
  }
  function wheel(dy) { tscroll = U.clamp(tscroll + dy, 0, WW - VW); }

  // ---- drawing --------------------------------------------------------------------------------------
  function render(g) {
    const L = paint(place), P = PLACES[place];
    g.drawImage(L.sky, 0, 0);
    g.drawImage(L.far, -Math.round(scroll * 0.3), 0);
    if (place === 'lake') for (let i = 0; i < 5; i++) {                         // clouds going over
      const x = ((i * 170 + t * 6) % (VW + 200)) - 100;
      for (const [dx, dy, rx, ry] of [[0, 0, 22, 6], [-16, 3, 14, 5], [18, 3, 16, 5]]) Art.ell(g, x + dx, 60 + i * 14 + dy, rx, ry, 'rgba(255,240,240,0.7)');
    }
    g.drawImage(L.mid, -Math.round(scroll * 0.6), 0);
    g.drawImage(L.near, -Math.round(scroll), 0);
    const S = scroll;
    // ---- the moving parts of each place
    if (place === 'lake') {
      for (let i = 0; i < 40; i++) {                                          // glitter on the water
        const x = ((i * 97) % WW) - S, y = 222 + (i * 13) % 60;
        if (x < -4 || x > VW + 4) continue;
        const on = Math.sin(t * 3 + i * 1.7) > 0.6;
        if (on) { g.fillStyle = '#fff8e0'; g.fillRect(Math.round(x), y, 3, 1); }
      }
      for (let i = 0; i < 3; i++) {                                           // ducks paddling round
        const u = ((t * 0.02 + i * 0.33) % 1), x = 200 + u * (WW - 400) - S, y = 244 + i * 12 + Math.sin(t * 2 + i) * 1;
        if (x < -20 || x > VW + 20) continue;
        Art.ell(g, x, y, 6, 3, '#1a1420'); Art.ell(g, x, y, 5, 2.4, '#8a6a4a'); Art.ell(g, x + 4, y - 3, 2.4, 2.4, '#2a7a3a');
        g.fillStyle = '#f0a020'; g.fillRect(Math.round(x + 6), Math.round(y - 3), 2, 1);
        g.fillStyle = 'rgba(255,255,255,0.4)'; g.fillRect(Math.round(x - 8), Math.round(y + 3), 6, 1);
      }
      for (let i = 0; i < 4; i++) {                                           // dragonflies
        const x = ((i * 300 + Math.sin(t * 0.7 + i) * 80) % WW) - S, y = 250 + Math.sin(t * 1.9 + i * 2) * 14;
        g.fillStyle = '#2aa0c8'; g.fillRect(Math.round(x), Math.round(y), 4, 1);
        g.fillStyle = 'rgba(220,240,255,0.8)'; g.fillRect(Math.round(x + 1), Math.round(y - 1 - (Math.floor(t * 20) % 2)), 2, 1);
      }
    } else if (place === 'wood') {
      for (let i = 0; i < 5; i++) {                                           // shafts of light through the pines
        const x = 180 + i * 330 - S * 0.8;
        g.save(); g.globalAlpha = 0.07 + 0.03 * Math.sin(t * 0.5 + i);
        Art.poly(g, [[x, 0], [x + 30, 0], [x + 110, 300], [x + 50, 300]], '#fff4c0'); g.restore();
      }
      for (let i = 0; i < 30; i++) {                                          // fireflies
        const x = ((i * 61 + Math.sin(t * 0.6 + i) * 30) % WW) - S, y = 180 + (i * 37) % 110 + Math.sin(t + i) * 8;
        const p = 0.5 + 0.5 * Math.sin(t * 2.4 + i * 2.1);
        if (p < 0.3) continue;
        Art.glow(g, x, y, 6, '#d8ff70', 0.35 * p, 3);
        g.fillStyle = '#f0ffb0'; g.fillRect(Math.round(x), Math.round(y), 1, 1);
      }
      for (let i = 0; i < 16; i++) {                                          // mushrooms that glow
        const x = ((i * 113) % WW) - S, y = 292 + (i * 17) % 30;
        if (x < -10 || x > VW + 10) continue;
        Art.glow(g, x, y - 3, 8, '#80f0ff', 0.2 + 0.1 * Math.sin(t * 2 + i), 3);
        g.fillStyle = '#e8f0e0'; g.fillRect(Math.round(x), y - 3, 1, 3);
        Art.ell(g, x, y - 4, 3, 1.6, '#60d0e8');
      }
      const ox = 760 - S;                                                     // an owl on the big trunk
      if (ox > -20 && ox < VW + 20) {
        const img = Sprites.owl(Math.floor(t * 0.8) % 7 === 0 ? 3 : 0);
        g.drawImage(img, Math.round(ox - 12), 150);
      }
    } else {
      // the waterfall: moving stripes down the cliff, spray at the foot
      const fx = 1070 - S;
      if (fx > -80 && fx < VW + 20) {
        g.fillStyle = '#9ad8e8'; g.fillRect(Math.round(fx), 60, 60, 240);
        for (let i = 0; i < 14; i++) {
          const y = ((t * 90 + i * 22) % 240) + 60;
          g.fillStyle = i % 2 ? '#e8f8ff' : '#c0ecf8';
          g.fillRect(Math.round(fx + (i * 7) % 56), Math.round(y), 3, 14);
        }
        for (let i = 0; i < 20; i++) {
          const a = (i / 20) * Math.PI, rr = 10 + ((t * 30 + i * 7) % 30);
          g.fillStyle = 'rgba(255,255,255,0.6)'; g.fillRect(Math.round(fx + 30 + Math.cos(a) * rr * 1.8), Math.round(300 - Math.sin(a) * rr * 0.6), 2, 2);
        }
      }
      for (let i = 0; i < 8; i++) {                                           // mist drifting through
        const x = ((i * 240 + t * 8) % (WW + 200)) - 100 - S;
        g.save(); g.globalAlpha = 0.14; Art.ell(g, x, 270 + (i % 3) * 10, 90, 10, '#ffffff'); g.restore();
      }
      for (let i = 0; i < 10; i++) {                                          // butterflies
        const x = ((i * 170 + Math.sin(t * 0.5 + i) * 60) % WW) - S, y = 240 + Math.sin(t * 1.3 + i) * 30;
        const w = Math.floor(t * 12 + i) % 2 ? 3 : 1;
        g.fillStyle = ['#ffd84a', '#ff8ab0', '#8ad0ff'][i % 3];
        g.fillRect(Math.round(x - w), Math.round(y), w, 2); g.fillRect(Math.round(x + 1), Math.round(y), w, 2);
        g.fillStyle = '#1a1420'; g.fillRect(Math.round(x), Math.round(y), 1, 2);
      }
    }
    // ---- the finds
    for (const it of finds()) {
      if (it.taken) continue;
      const x = it.x - S;
      if (x < -12 || x > VW + 12) continue;
      g.save(); g.translate(Math.round(x), Math.round(it.y)); g.scale(2, 2);
      findArt(g, place, it.k, 0, 0, t + x * 0.01);
      g.restore();
    }
    // ---- the sign
    const sx = SIGN_X - S;
    if (sx > -60 && sx < VW + 60) {
      g.fillStyle = '#4a2a14'; g.fillRect(Math.round(sx - 2), 250, 4, 48);
      const yours = owned(place);
      Kit.card(g, sx - 44, 222, 88, 38, { fill: yours ? '#d8f0b8' : undefined });
      Font.draw(g, yours ? 'YOURS' : 'FOR SALE', sx, 229, { scale: 1, color: yours ? Kit.C.mintD : Kit.C.coralD, align: 'center' });
      Font.draw(g, yours ? P.name : `${P.cost} W$`, sx, 242, { scale: 1, color: Kit.C.ink, align: 'center' });
    }
    // ---- the name of the place, and how much of it there is still to find
    const left = finds().filter((it) => !it.taken).length;
    Kit.tab(g, 12, 60, 150, 18, P.name.toUpperCase(), { col: Kit.C.frameM });
    Font.draw(g, left ? `${left} things to find` : 'all found for today', 16, 82, { scale: 1, color: '#ffffff', shadow: '#1a1420' });
    if (fade > 0) { g.fillStyle = `rgba(20,10,4,${fade.toFixed(2)})`; g.fillRect(0, 0, VW, VH); }
    FX.drawParticles(g, 0); FX.drawConfetti(g); FX.drawFloaters(g, false);
  }
  return { init(g) { G = g; }, enter, update, render, press, move, release, hover: hoverAt, wheel, PLACES, owned, get place() { return place; } };
})();
