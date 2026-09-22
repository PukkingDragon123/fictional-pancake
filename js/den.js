// ---- The Den: your own room, at night --------------------------------------
// One long wall you scroll along. A desk with a lamp on it, a window with the
// rain coming down it and the town out there, a sofa nobody has tidied, a
// television nobody is watching, and a rug that is the only warm thing in the
// picture. Everything in it moves a little: the rain, the lights over the
// road, the tube flickering, the lamp guttering, the motes in the lamplight.
const Den = (() => {
  let G = null;
  const W = 640, H = 360;
  const RW = 1180;                       // how long the wall is
  const FLOOR = 250;                     // where the skirting meets the boards
  let camX = 0, tCam = 0, t = 0, hover = null;
  const rain = [], motes = [], lights = [];
  let tvT = 0, tvFrame = 0, lampFlick = 1, steam = [];

  // ---- the palette ----------------------------------------------------------
  // A cold room with two warm lamps in it. Everything is one of these.
  const C = {
    wall0: '#141a33', wall1: '#1d2547', wall2: '#28325c', wall3: '#36426f',
    dark: '#0b0e1d', line: '#060812',
    wood0: '#241a2c', wood1: '#33273e', wood2: '#443252', wood3: '#573f66',
    warm0: '#6b3f18', warm1: '#a86a22', warm2: '#e0992f', warm3: '#ffcf6a', warm4: '#fff0c0',
    teal0: '#0e3a3a', teal1: '#1c6a62', teal2: '#2fa38f', teal3: '#5fe0c0',
    sofa0: '#123a3c', sofa1: '#1d5a56', sofa2: '#2a7a6e', sofa3: '#3f9c88',
    rug0: '#5e2a10', rug1: '#9c4d17', rug2: '#d2842a', rug3: '#f0b457',
    leaf0: '#17331f', leaf1: '#25552f', leaf2: '#3a7d42',
    glass0: '#0c1430', glass1: '#16224a', glass2: '#20336a',
  };
  const PXD = 2;                          // the block the whole room is drawn in

  function init(g) { G = g; }
  function enter() {
    camX = 0; tCam = 0; t = 0; hover = null;
    rain.length = 0; motes.length = 0; lights.length = 0; steam.length = 0;
    const r = Art.rng(80808);
    for (let i = 0; i < 150; i++) rain.push({ x: r() * 520, y: r() * 200, v: 150 + r() * 190, l: 5 + r() * 11 });
    for (let i = 0; i < 46; i++) motes.push({ x: r() * RW, y: 60 + r() * 190, ph: r() * TAU, sp: 2 + r() * 6, a: 0.2 + r() * 0.45 });
    // the town out of the window: a skyline of lit squares that come and go
    for (let i = 0; i < 130; i++) {
      lights.push({ x: r() * 520, y: r() * 150, w: 2 + Math.floor(r() * 2) * 2, on: r() < 0.55, ph: r() * 40, warm: r() < 0.75 });
    }
    Audio.setMode('pen');
  }
  function leave() { }

  // ---- the clock -------------------------------------------------------------
  function update(dt) {
    t += dt;
    camX = U.lerp(camX, tCam, 1 - Math.pow(0.002, dt));
    for (const d of rain) {
      d.y += d.v * dt; d.x -= 16 * dt;
      if (d.y > 200) { d.y = -12; d.x = Math.random() * 520; }
      if (d.x < -10) d.x += 530;
    }
    for (const m of motes) { m.ph += dt * 0.5; }
    tvT -= dt;
    if (tvT <= 0) { tvT = 0.08 + Math.random() * 0.2; tvFrame = (tvFrame + 1) % 6; }
    lampFlick = 1 - Math.max(0, Math.sin(t * 0.7 + Math.sin(t * 3.1)) * 0.04) - (Math.random() < 0.006 ? 0.18 : 0);
    for (const l of lights) if (Math.random() < dt * 0.06) l.on = !l.on;
    // steam off the mug on the desk
    if (Math.random() < dt * 5) steam.push({ x: 246 + U.rand(-1, 1), y: 196, t: 0, ph: Math.random() * TAU });
    for (let i = steam.length - 1; i >= 0; i--) {
      const s = steam[i]; s.t += dt; s.y -= 11 * dt;
      if (s.t > 2.1) steam.splice(i, 1);
    }
  }

  // ---- drawing ---------------------------------------------------------------
  const R = (g, x, y, w, h, col) => { g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
  // a box with a lit top and a dark base, which is nine tenths of this room
  function box(g, x, y, w, h, base, lit, dk) {
    R(g, x - PXD, y - PXD, w + PXD * 2, h + PXD * 2, C.line);
    R(g, x, y, w, h, base);
    R(g, x, y, w, PXD, lit);
    R(g, x, y + h - PXD, w, PXD, dk);
    R(g, x, y, PXD, h, U.mix(base, lit, 0.5));
    R(g, x + w - PXD, y, PXD, h, dk);
  }

  function render(g) {
    const off = -Math.round(camX);
    // ---- the wall ----------------------------------------------------------
    for (let y = 0; y < FLOOR; y += PXD) {
      const k = y / FLOOR;
      R(g, 0, y, W, PXD, U.mix(C.wall0, C.wall2, U.easeOut(k)));
    }
    g.save();
    g.translate(off, 0);
    // the picture rail and the skirting run the length of it
    R(g, 0, 40, RW, PXD, C.wall3);
    R(g, 0, 42, RW, PXD, C.wall0);
    // ---- the floor ---------------------------------------------------------
    for (let y = FLOOR; y < H; y += PXD) {
      const k = (y - FLOOR) / (H - FLOOR);
      R(g, 0, y, RW, PXD, U.mix(C.wood0, C.wood2, k));
    }
    for (let x = 0; x < RW; x += 34) {                 // the boards
      R(g, x, FLOOR, PXD, H - FLOOR, C.dark);
      R(g, x + PXD, FLOOR, PXD, H - FLOOR, C.wood3);
    }
    // the ends of the boards, staggered, rather than a line all the way across
    for (let y = FLOOR + 18; y < H; y += 30) {
      for (let x = ((y / 30) % 2) * 68; x < RW; x += 136) R(g, x, y, 34, PXD, 'rgba(6,8,18,0.45)');
    }
    R(g, 0, FLOOR - 8, RW, 8, C.wood1);                // the skirting
    R(g, 0, FLOOR - 8, RW, PXD, C.wood3);
    R(g, 0, FLOOR, RW, PXD, C.dark);

    // the light on the wall behind everything, so the room has a warm end
    lampPool(g, 250, 196, 210, lampFlick * 1.15);
    lampPool(g, 990, 190, 150, 0.8, C.teal3);
    bookcase(g, 16);
    picture(g, 208, 76);
    desk(g, 170);
    window_(g, 400);
    sill(g, 700);
    sofa(g, 640);
    radiator(g, 880);
    telly(g, 960);
    rug(g, 720);
    chair(g, 1108);
    // ---- the light in the room ---------------------------------------------
    // and again over the top of it, which is what makes the amber sit on the
    // furniture rather than behind it
    lampPool(g, 252, 206, 150, lampFlick * 0.85);     // the desk lamp
    lampPool(g, 990, 200, 110, 0.6, C.teal3);         // the tube
    // the light lying along the floorboards under each
    for (let i = 0; i < 6; i++) {
      const w2 = 170 - i * 22;
      g.fillStyle = U.rgba(C.warm2, 0.05 * lampFlick);
      g.fillRect(252 - w2 / 2, FLOOR + 4 + i * 16, w2, 14);
      g.fillStyle = U.rgba(C.teal3, 0.035);
      g.fillRect(990 - (w2 - 40) / 2, FLOOR + 4 + i * 16, w2 - 40, 14);
    }
    for (const m of motes) {
      const x = m.x + Math.cos(m.ph) * 12, y = m.y + Math.sin(m.ph * 0.8) * 8;
      const near = Math.max(0, 1 - Math.hypot(x - 250, y - 214) / 150);
      if (near < 0.05) continue;
      R(g, x, y, PXD, PXD, U.rgba(C.warm4, m.a * near * (0.5 + 0.5 * Math.sin(t * 2 + m.ph))));
    }
    g.restore();
    // ---- the night over the top of it --------------------------------------
    g.fillStyle = 'rgba(10,14,40,0.28)'; g.fillRect(0, 0, W, H);
    vign(g);
    if (hover) {
      Font.draw(g, hover.tip, W / 2, H - 26, { scale: 1, color: '#000000', align: 'center' });
      Font.draw(g, hover.tip, W / 2, H - 27, { scale: 1, color: C.warm3, align: 'center' });
    }
  }
  // a soft pool of light, in steps, because nothing here is a gradient
  // A pool of light, in eight hard steps. It is the whole reason to be in
  // this room, so it is not subtle: the desk end is amber and the far end is
  // the blue the rest of the flat is.
  function lampPool(g, cx, cy, r, k, col) {
    const c0 = col || C.warm3;
    // fourteen thin steps rather than eight fat ones, so the edge of the pool
    // is a stair and not a box drawn on the wall
    for (let i = 14; i >= 1; i--) {
      const f = i / 14;
      const rw = Math.round((r * f) / PXD) * PXD;
      const rh = Math.round((r * 0.56 * Math.pow(f, 1.35)) / PXD) * PXD;
      g.fillStyle = U.rgba(c0, 0.03 * k);
      g.fillRect(Math.round(cx - rw), Math.round(cy - rh), rw * 2, rh * 2);
    }
  }
  function vign(g) {
    for (let i = 0; i < 8; i++) {
      const d = (8 - i) * 9;
      g.fillStyle = `rgba(6,8,22,${(0.05).toFixed(2)})`;
      g.fillRect(0, 0, W, d); g.fillRect(0, H - d, W, d);
      g.fillRect(0, 0, d, H); g.fillRect(W - d, 0, d, H);
    }
  }

  // ---- the things in it ------------------------------------------------------
  function bookcase(g, x) {
    box(g, x, 52, 128, 198, C.wood1, C.wood3, C.dark);
    for (let s = 0; s < 4; s++) {
      const y = 76 + s * 44;
      R(g, x + 4, y, 120, 4, C.wood2);
      R(g, x + 4, y, 120, PXD, C.wood3);
      // books, leaning
      const r = Art.rng(s * 91 + 7);
      let bx = x + 8;
      while (bx < x + 116) {
        const bw = 5 + Math.floor(r() * 5), bh = 20 + Math.floor(r() * 12);
        const col = ['#7a2430', '#1d4a6a', '#3f6a2a', '#8a6a1a', '#4a2a6a', '#8a3a1a'][Math.floor(r() * 6)];
        R(g, bx, y - bh, bw, bh, col);
        R(g, bx, y - bh, bw, PXD, U.shade(col, 0.35));
        R(g, bx, y - bh + 5, bw, PXD, U.shade(col, 0.5));
        bx += bw + 1;
      }
      if (s === 1) { R(g, x + 92, y - 16, 14, 16, C.warm1); R(g, x + 92, y - 16, 14, PXD, C.warm3); }
    }
    // a plant trailing off the top of it
    plant(g, x + 22, 52, 1.3, true);
  }
  function picture(g, x, y) {
    box(g, x, y, 62, 74, '#2a1e12', '#4e3a22', C.dark);
    R(g, x + 5, y + 5, 52, 64, '#101a2e');
    R(g, x + 5, y + 5, 52, 26, '#16243e');
    // a lamp post on an empty road at night, which is what is always in these
    R(g, x + 5, y + 46, 52, 23, '#0b1322');
    for (let i = 0; i < 6; i++) R(g, x + 27, y + 48 + i * 4, 4, 2, '#3f5f7a');
    R(g, x + 40, y + 24, 3, 24, '#26405e');
    R(g, x + 36, y + 20, 11, 5, '#26405e');
    R(g, x + 38, y + 25, 7, 3, '#ffcf6a');
    for (let i = 1; i < 5; i++) {
      R(g, x + 41 - i * 3, y + 25 + i * 5, i * 6, 4, U.rgba('#ffcf6a', 0.1));
    }
    R(g, x + 12, y + 30, 3, 16, '#1c2c46');
    R(g, x + 19, y + 34, 3, 12, '#1c2c46');
  }
  function desk(g, x) {
    // the tower, with a light on it
    box(g, x - 62, 158, 44, 92, '#1a1f30', '#2e3648', C.dark);
    R(g, x - 56, 168, 32, 4, '#0d1120');
    R(g, x - 56, 176, 32, 4, '#0d1120');
    const blink = (Math.floor(t * 2) % 2) ? '#5fe0c0' : '#2fa38f';
    R(g, x - 52, 232, 6, 6, blink);
    // the desk itself
    box(g, x - 8, 196, 130, 8, C.wood2, C.wood3, C.dark);
    R(g, x + 2, 204, 8, 46, C.wood1);
    R(g, x + 104, 204, 8, 46, C.wood1);
    R(g, x + 6, 214, 100, 6, C.wood1);            // a shelf under it with papers on
    for (let i = 0; i < 4; i++) R(g, x + 12 + i * 22, 208, 16, 6, '#c9b894');
    // the monitor, warm and on
    box(g, x + 14, 130, 70, 56, '#181d2c', '#2c3446', C.dark);
    const scan = Math.floor(t * 30) % 8;
    for (let yy = 0; yy < 46; yy += PXD) {
      const lit = yy === scan * PXD ? 0.9 : 0.55 + 0.25 * Math.sin(yy * 0.4 + t);
      R(g, x + 19, 135 + yy, 60, PXD, U.rgba(C.warm2, lit));
    }
    R(g, x + 22, 140, 44, PXD, C.warm4);
    R(g, x + 22, 148, 32, PXD, C.warm3);
    R(g, x + 22, 156, 40, PXD, C.warm3);
    R(g, x + 40, 186, 18, 8, '#242a3a');
    R(g, x + 30, 194, 38, 4, '#2e3648');
    // the lamp
    R(g, x + 100, 168, 4, 30, '#2e3648');
    R(g, x + 92, 158, 22, 4, '#2e3648');
    box(g, x + 88, 146, 26, 14, '#3a4258', '#586278', C.dark);
    R(g, x + 92, 158, 18, 4, U.rgba(C.warm4, lampFlick));
    // a mug, steaming
    R(g, x + 74, 188, 12, 10, '#b8c4d8');
    R(g, x + 74, 188, 12, PXD, '#e0e8f4');
    R(g, x + 86, 191, 4, 4, '#b8c4d8');
    for (const s of steam) {
      const a = U.clamp(1 - s.t / 2.1, 0, 1) * 0.5;
      R(g, s.x + Math.sin(s.t * 3 + s.ph) * 4, s.y - s.t * 12, PXD, PXD, U.rgba('#dfe8f4', a));
    }
  }
  function window_(g, x) {
    const WW = 230, WH = 176;
    box(g, x, 46, WW, WH, '#2a3454', '#465478', C.dark);
    // the night, the rain and the town
    R(g, x + 6, 52, WW - 12, WH - 12, C.glass0);
    for (let y = 0; y < WH - 12; y += PXD) {
      R(g, x + 6, 52 + y, WW - 12, PXD, U.mix(C.glass0, C.glass2, y / (WH - 12)));
    }
    g.save();
    g.beginPath(); g.rect(x + 6, 52, WW - 12, WH - 12); g.clip();
    // the blocks across the road
    for (let i = 0; i < 7; i++) {
      const bw = 26 + ((i * 37) % 30), bx = x + 2 + i * 33, bh = 60 + ((i * 53) % 70);
      R(g, bx, 52 + (WH - 12) - bh, bw, bh, i % 2 ? '#101a36' : '#0c142c');
      R(g, bx, 52 + (WH - 12) - bh, bw, PXD, '#1a2648');
    }
    for (const l of lights) {
      if (!l.on) continue;
      R(g, x + 8 + l.x * 0.42, 60 + l.y * 0.62, l.w, PXD * 2, l.warm ? U.rgba(C.warm3, 0.85) : U.rgba('#9fd0ff', 0.7));
    }
    // and the rain down the glass
    for (const d of rain) {
      const rx = x + 8 + d.x * 0.42, ry = 52 + d.y * 0.62;
      for (let k = 0; k < d.l; k++) R(g, rx - k * 0.2, ry + k, 1, 1, 'rgba(150,190,240,0.30)');
    }
    g.restore();
    // the blind, half down, and the glazing bars
    for (let i = 0; i < 9; i++) R(g, x + 6, 52 + i * 5, WW - 12, PXD, 'rgba(190,210,245,0.13)');
    R(g, x + WW / 2 - 3, 52, 6, WH - 12, '#2a3454');
    R(g, x + WW / 2 - 3, 52, PXD, WH - 12, '#465478');
    R(g, x + 6, 110, WW - 12, 5, '#2a3454');
    R(g, x + 6, 110, WW - 12, PXD, '#465478');
    // the sill
    box(g, x - 6, 218, WW + 12, 8, C.wood2, C.wood3, C.dark);
  }
  function sofa(g, x) {
    box(g, x - 130, 186, 190, 46, C.sofa1, C.sofa3, C.sofa0);    // the seat
    box(g, x - 130, 150, 190, 40, C.sofa0, C.sofa2, '#09201f');  // the back
    box(g, x - 140, 168, 18, 62, C.sofa1, C.sofa3, C.sofa0);     // the arms
    box(g, x + 52, 168, 18, 62, C.sofa1, C.sofa3, C.sofa0);
    for (let i = 0; i < 3; i++) R(g, x - 118 + i * 62, 186, PXD, 44, C.sofa0);
    // the cushion somebody threw at it, and the blanket nobody folded
    box(g, x - 96, 160, 34, 28, '#c2621e', '#f0a03a', '#7a3408');
    R(g, x - 90, 166, 22, PXD, '#ffcf6a');
    for (let i = 0; i < 9; i++) {
      const bx = x - 40 + i * 9, by = 176 + Math.sin(i * 0.8) * 4;
      R(g, bx, by, 10, 46 - i * 2, i % 2 ? '#8a6a3a' : '#a8854c');
      R(g, bx, by, 10, PXD, '#c9a86a');
    }
    R(g, x - 132, 230, 194, 4, '#071a1a');
    for (const fx of [x - 128, x + 54]) { R(g, fx, 232, 10, 12, C.wood1); R(g, fx, 232, 10, PXD, C.wood3); }
  }
  function sill(g, x) {
    for (let i = 0; i < 3; i++) plant(g, x - 240 + i * 74, 218, 0.9 + i * 0.16, false);
  }
  function plant(g, x, baseY, s, trail) {
    const pw = Math.round(16 * s), ph = Math.round(14 * s);
    box(g, x - pw / 2, baseY - ph, pw, ph, '#6a3a24', '#96563a', '#3a1c12');
    const r = Art.rng(Math.round(x * 13));
    const n = 7 + Math.floor(r() * 5);
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (i / (n - 1) - 0.5) * 2.3;
      const len = (16 + r() * 16) * s;
      const sway = Math.sin(t * 0.8 + i + x * 0.01) * 2.2;
      const ex = x + Math.cos(a) * len + sway, ey = baseY - ph + Math.sin(a) * len;
      Art.limb(g, x, baseY - ph, ex, ey, 3 * s, 1.6 * s, i % 2 ? C.leaf1 : C.leaf2);
      R(g, ex - 2 * s, ey - 2 * s, 5 * s, 4 * s, i % 3 ? C.leaf2 : C.leaf1);
    }
    if (trail) for (let i = 0; i < 4; i++) {
      const tx = x - 10 + i * 7;
      const dl = 24 + (i % 3) * 16;
      for (let k = 0; k < dl; k += 4) R(g, tx + Math.sin(k * 0.3 + t * 0.6 + i) * 2, baseY - ph + k, PXD, 3, C.leaf1);
    }
  }
  function radiator(g, x) {
    box(g, x - 60, 196, 96, 44, '#2a3450', '#44507a', C.dark);
    for (let i = 0; i < 9; i++) R(g, x - 54 + i * 10, 202, 5, 32, '#1c2440');
    R(g, x - 60, 240, 96, 4, C.dark);
  }
  function telly(g, x) {
    box(g, x - 46, 206, 104, 44, C.wood1, C.wood3, C.dark);   // the stand
    R(g, x - 40, 216, 42, 22, '#141a2c');
    R(g, x + 8, 216, 42, 22, '#141a2c');
    box(g, x - 40, 128, 92, 78, '#2c3244', '#4a5268', C.dark); // the set
    // the tube
    const sx = x - 32, sy = 136, sw = 76, sh = 58;
    R(g, sx, sy, sw, sh, '#041614');
    const r = Art.rng(tvFrame * 77 + 3);
    for (let y = 0; y < sh; y += PXD) {
      const band = Math.sin((y + tvFrame * 6) * 0.22) * 0.5 + 0.5;
      R(g, sx, sy + y, sw, PXD, U.rgba(C.teal1, 0.5 + band * 0.4));
    }
    // something moving on it
    for (let i = 0; i < 5; i++) {
      const bw = 8 + Math.floor(r() * 22);
      R(g, sx + 4 + r() * (sw - bw - 8), sy + 6 + r() * (sh - 16), bw, 5, U.rgba(C.teal3, 0.8));
    }
    R(g, sx, sy + ((Math.floor(t * 14) * 7) % sh), sw, PXD, 'rgba(255,255,255,0.14)');
    for (let y = 0; y < sh; y += 4) R(g, sx, sy + y, sw, PXD, 'rgba(0,0,0,0.22)');
    // knobs, and the speaker beside it
    R(g, x + 44, 146, 6, 6, '#6a7288'); R(g, x + 44, 158, 6, 6, '#6a7288');
    box(g, x - 86, 190, 26, 60, '#20263a', '#39415c', C.dark);
    R(g, x - 80, 200, 14, 14, '#0d1120'); R(g, x - 80, 222, 14, 20, '#0d1120');
  }
  function chair(g, x) {
    box(g, x - 36, 120, 58, 120, '#151a28', '#262d42', '#080a14');
    R(g, x - 30, 130, 46, 6, '#1e2434');
    box(g, x - 44, 236, 74, 10, '#101420', '#222a3c', '#070912');
    R(g, x - 10, 246, 8, 24, '#101420');
  }
  function rug(g, x) {
    const RX = x - 180, RY = 262, RWd = 330, RH = 78;
    R(g, RX - PXD, RY - PXD, RWd + PXD * 2, RH + PXD * 2, '#2a1206');
    for (let y = 0; y < RH; y += PXD) {
      R(g, RX, RY + y, RWd, PXD, U.mix(C.rug1, C.rug2, 1 - Math.abs(y / RH - 0.4) * 1.3));
    }
    R(g, RX + 8, RY + 8, RWd - 16, RH - 16, C.rug1);
    R(g, RX + 14, RY + 14, RWd - 28, RH - 28, C.rug2);
    // a pattern of diamonds and stars through the middle
    for (let i = 0; i < 9; i++) {
      const cx = RX + 28 + i * 34, cy = RY + RH / 2;
      for (let k = -8; k <= 8; k += PXD) {
        const ww = Math.round((8 - Math.abs(k)) / PXD) * PXD * 2;
        R(g, cx - ww / 2, cy + k, ww, PXD, i % 2 ? C.rug0 : C.rug3);
      }
      if (i % 2) { R(g, cx - 2, cy - 12, 4, 24, C.rug3); R(g, cx - 12, cy - 2, 24, 4, C.rug3); }
    }
    for (let i = 0; i < RWd; i += 6) { R(g, RX + i, RY - 4, 4, 4, C.rug1); R(g, RX + i, RY + RH, 4, 4, C.rug1); }
  }

  // ---- what you can do in here ------------------------------------------------
  // Two things: sleep the night off, and look at what the gods have left you.
  const SPOTS = [
    { key: 'sofa', x: 510, y: 200, w: 200, h: 90, tip: 'sit down and let the night go by' },
    { key: 'tv',   x: 900, y: 128, w: 100, h: 90, tip: 'the news is all wombats' },
    { key: 'desk', x: 170, y: 128, w: 110, h: 80, tip: 'your papers' },
  ];
  function spotAt(x, y) {
    const wx = x + camX;
    return SPOTS.find((s) => wx > s.x && wx < s.x + s.w && y > s.y && y < s.y + s.h) || null;
  }
  function press(x, y) {
    const s = spotAt(x, y);
    if (!s) return;
    if (s.key === 'sofa') {
      Audio.play('chime');
      Sky.setHour(7.2);
      FX.flash('#0b0e1d', 0.7);
      UI.toast('you sat down for a minute and it was morning', 'good');
      for (const w of G.wombats) { w.bored = Math.max(0, w.bored - 40); w.hap = Math.min(100, w.hap + 8); }
      Cult.give(4);
      Main.save();
      return;
    }
    if (s.key === 'tv') {
      Audio.play('click');
      const n = Object.keys(G.summoned || {}).length;
      UI.toast(n ? `<b>${n}</b> of them have answered you` : 'nothing on. nothing ever is.', n ? 'good' : '');
      return;
    }
    if (s.key === 'desk') { Audio.play('click'); Phone.toggle(); }
  }
  function move(x, y) {
    hover = spotAt(x, y);
    if (x < 110) tCam = Math.max(0, tCam - (110 - x) * 0.07);
    else if (x > W - 110) tCam = Math.min(RW - W, tCam + (x - (W - 110)) * 0.07);
  }
  function hoverTip(x, y) { move(x, y); return hover ? `<b>${hover.tip}</b>` : null; }
  function wheel(d) { tCam = U.clamp(tCam + d * 0.9, 0, RW - W); }
  function release() { }

  return { init, enter, leave, update, render, press, move, release, wheel, hover: hoverTip };
})();
