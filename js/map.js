// ---- The map: parchment, fog, and places to go ---------------------------
const Atlas = (() => {
  let G = null;
  const VW = 640, VH = 360;
  let sheet = null, hover = null;
  const fog = [];
  let travel = null;

  // A road map, drawn the way a phone draws one: pale land, green parks, blue
  // water, a grid of white roads with a yellow motorway through it, and blocks
  // of buildings in between. Pixel art, but the same language.
  const LAND = '#eceae2', LAND2 = '#e2dfd4', PARK = '#c8e2b6', PARK2 = '#b2d49c';
  const WATER = '#a9d7e8', WATER2 = '#8fc6dc', ROAD = '#ffffff', ROAD2 = '#d8d5cc';
  const HWY = '#f7d06a', HWY2 = '#e0a83c', BLD = '#dcd8cd', BLD2 = '#c9c4b6';
  const MINK = '#5a5750', MINK2 = '#8b8780';

  function sheetOf() {
    if (sheet) return sheet;
    const { c, g } = Art.cv(VW, VH);
    const r = Art.rng(4242);
    g.fillStyle = LAND; g.fillRect(0, 0, VW, VH);
    for (let i = 0; i < 2400; i++) {                     // paper grain, barely there
      g.fillStyle = r() < 0.5 ? LAND2 : '#f4f2ec';
      g.fillRect(Math.floor(r() * VW), Math.floor(r() * VH), 1, 1);
    }
    // ---- water: a bay along the bottom right and a river running into it ---
    const bay = [];
    for (let x = 0; x <= VW; x += 8) bay.push([x, 296 + Math.sin(x * 0.021) * 16 + Math.sin(x * 0.065) * 5]);
    Art.poly(g, bay.concat([[VW, VH], [0, VH]]), WATER);
    for (const [x, y] of bay) { g.fillStyle = WATER2; g.fillRect(x - 4, Math.round(y), 9, 3); }
    let rx = 470, ry = 0;
    for (let i = 0; i < 60; i++) {
      const nx = rx + Math.sin(i * 0.31) * 7 - 1, ny = ry + 6;
      Art.line(g, rx, ry, nx, ny, WATER, 7);
      Art.line(g, rx, ry, nx, ny, WATER2, 3);
      rx = nx; ry = ny;
      if (ny > 300) break;
    }
    // ---- parks -------------------------------------------------------------
    const parks = [[60, 60, 118, 86], [250, 34, 96, 64], [40, 168, 84, 72], [512, 108, 106, 78], [330, 186, 78, 58]];
    for (const [px, py, pw, ph] of parks) {
      g.fillStyle = PARK; g.fillRect(px, py, pw, ph);
      g.fillStyle = PARK2;
      for (let i = 0; i < pw * ph * 0.02; i++) g.fillRect(px + Math.floor(r() * pw), py + Math.floor(r() * ph), 2, 2);
      for (let i = 0; i < 9; i++) {                      // a few trees in each
        const tx = px + 6 + r() * (pw - 12), ty = py + 6 + r() * (ph - 12);
        Art.ell(g, tx, ty, 4, 4, '#8fbf74'); Art.ell(g, tx - 1, ty - 1, 2.4, 2.4, '#a9d68c');
      }
    }
    // ---- the street grid ---------------------------------------------------
    const cols = [36, 96, 158, 224, 288, 352, 416, 480, 548, 610];
    const rows = [40, 92, 144, 196, 248, 300];
    const road = (x, y, w, h) => {
      g.fillStyle = ROAD2; g.fillRect(x - 1, y - 1, w + 2, h + 2);
      g.fillStyle = ROAD; g.fillRect(x, y, w, h);
    };
    for (const x of cols) road(x, 8, 5, VH - 40);
    for (const y of rows) road(8, y, VW - 16, 5);
    // a couple of lanes at an angle, so it is not a chessboard
    for (const [x0, y0, x1, y1] of [[0, 214, 300, 96], [352, 320, 640, 148]]) {
      Art.line(g, x0, y0, x1, y1, ROAD2, 7);
      Art.line(g, x0, y0, x1, y1, ROAD, 5);
    }
    // ---- the motorway ------------------------------------------------------
    let hx = -10, hy = 132;
    const hpts = [];
    for (let i = 0; i <= 46; i++) { hpts.push([hx, hy]); hx += 14; hy += Math.sin(i * 0.26) * 7 + 1.6; }
    for (let i = 0; i < hpts.length - 1; i++) {
      Art.line(g, hpts[i][0], hpts[i][1], hpts[i + 1][0], hpts[i + 1][1], HWY2, 11);
      Art.line(g, hpts[i][0], hpts[i][1], hpts[i + 1][0], hpts[i + 1][1], HWY, 8);
      if (i % 2 === 0) Art.line(g, hpts[i][0], hpts[i][1], hpts[i + 1][0], hpts[i + 1][1], '#fff6d2', 2);
    }
    // ---- city blocks between the roads ------------------------------------
    for (let i = 0; i < 240; i++) {
      const bx = 14 + Math.floor(r() * (VW - 40)), by = 16 + Math.floor(r() * (VH - 90));
      const bw = 8 + Math.floor(r() * 16), bh = 7 + Math.floor(r() * 13);
      const d = g.getImageData(bx + bw / 2, by + bh / 2, 1, 1).data;
      if (d[0] > 240 && d[1] > 240) continue;            // keep off the roads
      if (d[0] === 169 || d[1] === 215) continue;        // and off the water
      g.fillStyle = BLD2; g.fillRect(bx, by, bw, bh);
      g.fillStyle = BLD; g.fillRect(bx, by, bw - 1, bh - 1);
      g.fillStyle = '#b9b4a6'; g.fillRect(bx, by + bh - 2, bw, 1);
    }
    // ---- labels, in the flat grey a map uses -------------------------------
    for (const [lx, ly, tx2] of [[112, 104, 'NORTH FERN'], [292, 66, 'KING PARK'], [560, 150, 'EAST HILL'],
                                  [470, 330, 'THE BAY'], [84, 210, 'OLD MILL'], [214, 258, 'MIDDEN']]) {
      Font.draw(g, tx2, lx, ly, { scale: 1, color: MINK, align: 'center', shadow: 'rgba(255,255,255,0.85)', shadowDist: -1 });
    }
    sheet = c;
    return c;
  }

  function init(g) {
    G = g;
    fog.length = 0;
    const r = Art.rng(1717);
    for (let i = 0; i < 90; i++) fog.push({ x: r() * VW, y: r() * VH, r: 22 + r() * 34, ph: r() * TAU, sp: 0.1 + r() * 0.3 });
  }
  function enter() { hover = null; travel = null; Audio.setMode('pen'); }

  // the route: a blue ribbon with a white casing, the way a phone draws one
  function pathBetween(g, a, b, t) {
    const n = Math.max(8, Math.round(Math.hypot(b.x - a.x, b.y - a.y) / 8));
    const pt = (k) => ({ x: U.lerp(a.x, b.x, k), y: U.lerp(a.y, b.y, k) - Math.sin(k * Math.PI) * 16 });
    for (const [w, col] of [[8, '#ffffff'], [5, '#2f7ad0']]) {
      let p = pt(0);
      for (let i = 1; i <= n; i++) { const q = pt(i / n); Art.line(g, p.x, p.y, q.x, q.y, col, w); p = q; }
    }
    for (let i = 0; i < n; i++) {                        // the chevrons running along it
      const k = ((i / n) + (t * 0.18) % (1 / n)) % 1;
      if (((i - Math.floor(t * 5)) % 4 + 4) % 4) continue;
      const p = pt(k), q = pt(Math.min(1, k + 0.03));
      const dx = q.x - p.x, dy = q.y - p.y, L = Math.hypot(dx, dy) || 1;
      Art.line(g, p.x, p.y, p.x + (dx / L) * 4, p.y + (dy / L) * 4, '#bcdcff', 2);
    }
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
    travel = { t: 0, site: s };
    Audio.play('whoosh');
    FX.shake(1.4);
  }
  function hoverAt(x, y) {
    hover = siteAt(x, y);
    if (!hover) return null;
    if (!unlocked(hover)) return `<b>?</b><br>${hover.gate && !hover.gate(G) ? hover.why : hover.need + ' gods must answer first'}`;
    return `<b>${hover.name}</b>`;
  }
  function update(dt) {
    if (!travel) return;
    travel.t += dt;
    if (travel.t > 0.62) { const m = travel.site.mode; travel = null; Main.setMode(m); }
  }

  function render(g) {
    const t = G.time;
    g.drawImage(sheetOf(), 0, 0);
    // paths
    const home = SITES[0];
    for (const s of SITES) if (s !== home && unlocked(s)) pathBetween(g, home, s, t);

    for (const s of SITES) {
      const open = unlocked(s);
      const hot = hover === s && open;
      const bob = hot ? Math.sin(t * 6) * 1.6 : 0;
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
      const a = Math.max(cover, edge * 0.85);
      if (a <= 0.02) continue;
      const gr = g.createRadialGradient(x, y, 0, x, y, f.r);
      gr.addColorStop(0, `rgba(74,66,84,${(0.5 * a).toFixed(3)})`);
      gr.addColorStop(1, 'rgba(74,66,84,0)');
      g.fillStyle = gr;
      g.fillRect(x - f.r, y - f.r, f.r * 2, f.r * 2);
    }
    g.restore();

    // title banner
    banner(g, 'THE GROVE AND BEYOND', 320, 24);

    if (travel) {
      const k = U.clamp(travel.t / 0.62, 0, 1);
      const s = travel.site;
      const rad = U.lerp(Math.hypot(VW, VH), 0, U.easeIn(k));
      g.save();
      g.fillStyle = '#0b0810';
      g.beginPath();
      g.rect(0, 0, VW, VH);
      g.arc(s.x, s.y, Math.max(0, rad), 0, TAU, true);
      g.fill('evenodd');
      g.restore();
      g.globalAlpha = k * 0.6; g.fillStyle = PAL.gold3;
      g.beginPath(); g.arc(s.x, s.y, Math.max(0, rad), 0, TAU); g.lineWidth = 3; g.strokeStyle = PAL.gold3; g.stroke();
      g.globalAlpha = 1;
    }
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
    g.fillStyle = '#ffffff'; g.fillRect(VW - 44, 48, 26, 26);
    g.fillStyle = '#1c1008'; g.fillRect(VW - 46, 46, 30, 2); g.fillRect(VW - 46, 74, 30, 2);
    g.fillStyle = '#1c1008'; g.fillRect(VW - 46, 46, 2, 30); g.fillRect(VW - 18, 46, 2, 30);
    g.fillStyle = '#e04a3c'; Art.poly(g, [[VW - 31, 52], [VW - 27, 62], [VW - 35, 62]], '#e04a3c');
    g.fillStyle = '#5a5750'; Art.poly(g, [[VW - 31, 70], [VW - 27, 62], [VW - 35, 62]], '#5a5750');
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
