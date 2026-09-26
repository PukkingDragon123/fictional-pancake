// The itch.io cover and banner, painted with the game's own sprites and UI kit.
// Each scene is a function of u in [0,1) so the loop closes on itself.
(function () {
  const TAU = Math.PI * 2;
  const R = (g, x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
  const blit = (g, img, x, y, s = 1, flip = false, sy = 1) => {
    const w = Math.round(img.width * s), h = Math.round(img.height * s * sy);
    g.save(); g.translate(Math.round(x), Math.round(y));
    if (flip) g.scale(-1, 1);
    g.drawImage(img, -Math.round(w / 2), -h, w, h); g.restore();
  };
  // the title, one letter at a time on a wave, dark outline, two-tone fill
  function title(g, text, cx, y, sc, u, o = {}) {
    const W = Font.width(text, sc);
    let x = cx - W / 2;
    const chars = [...text];
    chars.forEach((ch, i) => {
      const cw = Font.width(ch, sc) + (i < chars.length - 1 ? Font.width(text.slice(0, i + 2), sc) - Font.width(text.slice(0, i + 1), sc) - Font.width(ch, sc) : 0);
      const dy = Math.round(Math.sin(u * TAU * 2 - i * 0.55) * (o.wave ?? 2));
      const yy = y + dy;
      for (const [ox, oy] of [[-2, 0], [2, 0], [0, -2], [0, 2], [-1, -1], [1, -1], [-1, 1], [1, 1], [2, 2], [0, 3], [2, 3], [1, 3]])
        Font.draw(g, ch, x + ox, yy + oy, { scale: sc, color: o.line || '#4a1e0e' });
      Font.draw(g, ch, x, yy, { scale: sc, color: o.top || '#ffe08a' });
      g.save(); g.beginPath(); g.rect(x - 2, yy + Math.round(sc * 3.6), cw + 4, sc * 5); g.clip();
      Font.draw(g, ch, x, yy, { scale: sc, color: o.low || '#f0a040' }); g.restore();
      g.fillStyle = 'rgba(255,255,255,0.8)'; g.fillRect(Math.round(x), yy, Math.max(1, sc - 1), Math.max(1, sc - 1));
      x += Font.width(text.slice(0, i + 1), sc) - Font.width(text.slice(0, i), sc);
    });
  }
  function note(g, x, y, col, big) {
    R(g, x - 1, y - 1, big ? 5 : 4, big ? 4 : 3, '#2a1206');
    R(g, x, y, big ? 3 : 2, big ? 2 : 1, col);
    R(g, x + (big ? 2 : 1), y - (big ? 8 : 6), 1, big ? 8 : 6, '#2a1206');
    R(g, x + (big ? 2 : 1), y - (big ? 8 : 6), big ? 4 : 3, 2, '#2a1206');
  }
  function heart(g, x, y, col) {
    const px = [[1, 0], [2, 0], [4, 0], [5, 0], [0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [2, 4], [3, 4], [4, 4], [3, 5]];
    for (const [a, b] of px) R(g, x + a, y + b, 1, 1, col);
    R(g, x + 1, y + 1, 1, 1, '#ffffff');
  }
  function sparkle(g, x, y, s, col) {
    R(g, x - s, y, s * 2 + 1, 1, col); R(g, x, y - s, 1, s * 2 + 1, col); R(g, x, y, 1, 1, '#ffffff');
  }
  function cube(g, x, y, s) { g.save(); g.translate(Math.round(x), Math.round(y - s / 2)); Sprites.drawCube(g, { color: '#6a4628' }, s, s, {}); g.restore(); }
  function hills(g, W, y, cols, u, amp) {
    cols.forEach((c, k) => {
      g.fillStyle = c;
      for (let x = 0; x < W; x++) {
        const h = Math.sin(x / (60 + k * 30) + k * 2) * amp + Math.sin(x / 23 + k) * amp * 0.25;
        g.fillRect(x, Math.round(y + k * 10 - h), 1, 400);
      }
    });
  }
  function trees(g, W, base, n, seed, sh, sc) {
    const r = Art.rng(seed), K = ['oak', 'pine', 'oak', 'birch', 'oak'];
    for (let i = 0; i < n; i++) {
      const img = Props.get('tree', `${K[Math.floor(r() * K.length)]}|${Math.floor(r() * 6)}|${sh.toFixed(2)}`);
      const s = sc * (0.85 + r() * 0.3);
      blit(g, img, (i / n) * W + r() * (W / n) * 0.8, base + Math.floor(r() * 4), s);
    }
  }
  function cloud(g, x, y, s) {
    for (const [dx, dy, rx, ry] of [[0, 0, 14, 6], [-10, 2, 9, 5], [11, 2, 10, 5], [3, -4, 9, 6]]) Art.ell(g, x + dx * s, y + dy * s, rx * s, ry * s, '#ffffff');
    R(g, x - 18 * s, y + 5 * s, 38 * s, 2, '#dcecf8');
  }

  // ---- the cover: 315 x 250, shown at 2x -------------------------------------------------
  function cover(g, u) {
    const W = 315, H = 250, GY = 196;
    Art.vramp(g, 0, 0, W, GY, [[0, '#7ab8e8'], [0.65, '#bfe0f0'], [1, '#fbe8c8']], 10);
    // the sun, turning slowly
    const sx = 296, sy = 26;
    Art.glow(g, sx, sy, 60, '#fff0b0', 0.35, 5);
    for (let i = 0; i < 12; i++) { const a = u * TAU / 6 + (i / 12) * TAU; Art.limb(g, sx + Math.cos(a) * 20, sy + Math.sin(a) * 20, sx + Math.cos(a) * 28, sy + Math.sin(a) * 28, 1.4, 0.6, '#ffe070'); }
    Art.ell(g, sx, sy, 16, 16, '#ffd860'); Art.ell(g, sx - 3, sy - 3, 11, 11, '#fff0a0');
    cloud(g, 52 + Math.sin(u * TAU) * 6, 104 + Math.sin(u * TAU * 2) * 1, 1);
    cloud(g, 200 + Math.sin(u * TAU + 2) * 6, 92, 0.8);
    hills(g, W, 158, ['#9ccc7c', '#7ab85a'], u, 8);
    trees(g, W, 178, 9, 31, 0.15, 0.52);
    // the meadow
    R(g, 0, GY - 8, W, H, '#6aa84a'); R(g, 0, GY - 8, W, 2, '#8ac860');
    for (let i = 0; i < 90; i++) { const x = (i * 53) % W, y = GY - 4 + ((i * 29) % (H - GY)); R(g, x, y, 1, 2, i % 3 ? '#5a9a3e' : '#8ac860'); }
    for (let i = 0; i < 18; i++) {
      const x = (i * 71 + 13) % W, y = GY + 4 + ((i * 37) % (H - GY - 10)), c = ['#ffffff', '#f8d040', '#f07aa0', '#b88ae8'][i % 4];
      R(g, x, y - 2, 1, 2, '#3f7a32'); R(g, x - 1, y - 3, 3, 1, c); R(g, x, y - 4, 1, 3, c); R(g, x, y - 3, 1, 1, '#f8a020');
    }
    // cubes on the grass
    cube(g, 62, GY + 22, 7); cube(g, 72, GY + 25, 5); cube(g, 250, GY + 30, 7); cube(g, 152, GY + 40, 6);
    // Jim, waving at you, belly and all
    const jf = Math.floor(u * 12) % 6;
    g.fillStyle = 'rgba(40,60,20,0.3)'; Art.ell(g, 158, GY + 12, 18, 4);
    blit(g, Sprites.jim(jf, 'wave'), 158, GY + 15, 1);
    // wombats hopping round his feet
    const WB = [['brown', 88, 1, 0], ['grey', 230, -1, 0.33], ['sand', 116, 1, 0.66], ['pale', 202, -1, 0.15]];
    for (const [pelt, x, face, off] of WB) {
      const ph = (u * 3 + off) % 1, hop = Math.abs(Math.sin(ph * Math.PI)) * 10;
      const land = ph < 0.08 || ph > 0.92;
      g.fillStyle = 'rgba(40,60,20,0.3)'; Art.ell(g, x, GY + 34, 15 - hop * 0.4, 3.5);
      blit(g, Sprites.wombat('happy', Math.floor(u * 16 + off * 8) % 8, pelt, face, 'adult'), x, GY + 40 - hop, 1.15, false, land ? 0.94 : 1);
    }
    // hearts floating up
    for (let i = 0; i < 5; i++) {
      const v = (u + i / 5) % 1, x = 80 + i * 40 + Math.sin(v * TAU + i) * 5, y = GY - 10 - v * 70;
      if (v < 0.85) heart(g, Math.round(x), Math.round(y), ['#f06080', '#f890a8'][i % 2]);
    }
    for (let i = 0; i < 7; i++) { const v = (u * 2 + i / 7) % 1; if (v < 0.5) sparkle(g, (i * 97 + 20) % W, 60 + (i * 41) % 100, v < 0.25 ? 2 : 1, '#fff8c0'); }
    // the name, big, on a wave
    const tw = Font.width('WOMBAT', 6);
    title(g, 'WOMBAT', W / 2, 14, 6, u, { wave: 2 });
    title(g, 'FARM', W / 2, 62, 6, (u + 0.5) % 1, { wave: 2, top: '#c8f08a', low: '#6aa84a', line: '#1c3a12' });
    void tw;
    Kit.tab(g, W / 2 - 62, 112, 124, 16, 'a cozy little grove', { col: Kit.C.coral });
  }

  // ---- the banner: 480 x 160, shown at 2x: everybody dancing and singing ------------------------
  // the whole cast: Groot, Shaz, Jim in the middle, Captain Clark
  const BAND = [
    { key: 'groot', x: 118, sc: 0.95, poses: ['happy', 'wave'], sprite: (f, p) => Sprites.groot(f, p), note: 72 },
    { key: 'shaz', x: 196, sc: 1.25, poses: ['cheer', 'wave'], sprite: (f, p) => Sprites.cashier(f, p), note: 58 },
    { key: 'jim', x: 282, sc: 0.95, poses: ['cheer', 'clap'], sprite: (f, p) => Sprites.jim(f, p), note: 86 },
    { key: 'clark', x: 364, sc: 1.55, poses: ['wave', 'talk'], sprite: (f, p) => Sprites.villager('clark', f, p), note: 72 },
  ];
  function banner(g, u) {
    const W = 480, H = 160, GY = 140;
    Art.vramp(g, 0, 0, W, GY, [[0, '#4a5aa8'], [0.5, '#c078a8'], [1, '#f8b878']], 10);
    for (let i = 0; i < 26; i++) { const tw = (u * 4 + i * 0.37) % 1; if (tw < 0.6) R(g, (i * 67) % W, (i * 23) % 44, 1, 1, tw < 0.3 ? '#ffffff' : '#c8c8f0'); }
    Art.ell(g, 440, 24, 10, 10, '#fff4d0'); Art.ell(g, 444, 21, 8, 8, '#d8a8c0');
    hills(g, W, 104, ['#4a6a58', '#3a5a40'], u, 6);
    trees(g, W, 124, 13, 77, 0.45, 0.5);
    R(g, 0, GY - 12, W, H, '#5a8a3a'); R(g, 0, GY - 12, W, 2, '#7aaa4a');
    for (let i = 0; i < 60; i++) R(g, (i * 41) % W, GY - 8 + (i * 13) % 28, 1, 2, i % 2 ? '#4a7a32' : '#7aaa4a');
    // a string of fairy lights, blinking on the beat
    const beat = Math.floor(u * 8);
    const ly = (x) => 44 + Math.abs(Math.sin((x / W) * Math.PI * 3)) * -10 + 10;
    for (let x = 0; x < W; x += 2) R(g, x, ly(x), 2, 1, '#2a1a20');
    for (let i = 0; i < 30; i++) {
      const x = 8 + i * 16, y = ly(x) + 1;
      const col = ['#ff6a6a', '#ffd84a', '#6ae08a', '#6ab8ff', '#e08aff'][i % 5], on = (i + beat) % 2 === 0;
      if (on) Art.glow(g, x, y + 2, 9, col, 0.35, 3);
      R(g, x - 1, y, 3, 4, on ? col : U.shade(col, -0.45)); if (on) R(g, x - 1, y, 1, 1, '#ffffff');
    }
    // a little stage of planks for them to dance on
    R(g, 70, GY - 4, 340, 10, '#2a1406'); R(g, 72, GY - 4, 336, 8, '#a86a34'); R(g, 72, GY - 4, 336, 2, '#d8964c');
    for (let x = 90; x < 408; x += 24) R(g, x, GY - 2, 1, 6, '#6a3a18');
    // the plaque with the name on it, on the beat
    const pb = Math.abs(Math.sin(u * Math.PI * 8)) * 1.5;
    Kit.card(g, W / 2 - 110, 4 - pb, 220, 40, {});
    title(g, 'WOMBAT FARM', W / 2, 13 - Math.round(pb), 3, u, { wave: 1 });
    // the band: bouncing on the beat, turning each bar, singing
    BAND.forEach((m, i) => {
      const ph = (u * 8 + (i % 2) * 0.5) % 1, hop = Math.abs(Math.sin(ph * Math.PI)) * 6;
      const bar = Math.floor(u * 4), flip = m.key !== 'jim' && (bar + i) % 2 === 1;
      const squash = ph < 0.1 || ph > 0.9 ? 0.93 : 1;
      const sway = Math.sin(u * TAU * 4 + i) * 3;
      g.fillStyle = 'rgba(20,10,0,0.35)'; Art.ell(g, m.x + sway, GY - 3, 12 - hop * 0.6, 2.5);
      const pose = m.poses[(Math.floor(u * 8) + i) % 2];
      blit(g, m.sprite(Math.floor(u * 24) % 6, pose), m.x + sway, GY - 1 - hop, m.sc, flip, squash);
      for (let j = 0; j < 3; j++) {
        const v = (u * 2 + i * 0.21 + j / 3) % 1;
        if (v > 0.8) continue;
        const nx = m.x + 10 + Math.sin(v * TAU * 1.5 + i) * 6, ny = GY - m.note - v * 30;
        note(g, Math.round(nx), Math.round(ny), ['#ffd84a', '#ff8aa8', '#8ae0ff', '#b8f07a'][(i + j) % 4], j === 0);
      }
    });
    // wombats along the front, bopping, on their short little legs
    const WB = [['brown', 40, 0], ['grey', 88, 0.5], ['sand', 164, 0.25], ['pale', 240, 0.75], ['soot', 318, 0.1], ['brown', 396, 0.6], ['sand', 444, 0.35]];
    WB.forEach(([pelt, x, off], i) => {
      const ph = (u * 8 + off) % 1, hop = Math.abs(Math.sin(ph * Math.PI)) * 4;
      g.fillStyle = 'rgba(20,30,20,0.35)'; Art.ell(g, x, H - 4, 10, 2);
      blit(g, Sprites.wombat('happy', Math.floor(u * 16) % 8, pelt, (Math.floor(u * 4) + i) % 2 ? 1 : -1, 'adult'), x, H + 3 - hop, 0.7);
    });
    // and the words, a line at a time over whoever has them
    const LY = ['I am Groot!', 'la la la!', 'WOMBAT FARM!', 'yo ho ho!'];
    const li = Math.floor(u * 4) % 4, m = BAND[li];
    Kit.bubble(g, m.x, GY - m.note - 6, LY[li], { maxW: 120 });
  }

  // render frames of a scene at 2x and hand back RGBA for the encoder
  function frames(scene, w, h, n) {
    const lo = document.createElement('canvas'); lo.width = w; lo.height = h;
    const lg = lo.getContext('2d'); lg.imageSmoothingEnabled = false;
    const hi = document.createElement('canvas'); hi.width = w * 2; hi.height = h * 2;
    const hg = hi.getContext('2d'); hg.imageSmoothingEnabled = false;
    const out = [];
    for (let i = 0; i < n; i++) {
      lg.clearRect(0, 0, w, h); scene(lg, i / n);
      hg.drawImage(lo, 0, 0, w * 2, h * 2);
      out.push(hg.getImageData(0, 0, w * 2, h * 2).data);
    }
    return { out, still: hi.toDataURL('image/png') };
  }
  window.Promo = { cover, banner, frames };
})();
