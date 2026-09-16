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

  function sheetOf() {
    if (sheet) return sheet;
    const { c, g } = Art.cv(VW, VH);
    const r = Art.rng(4242);
    // ---- the land ---------------------------------------------------------
    g.fillStyle = LAND; g.fillRect(0, 0, VW, VH);
    for (let i = 0; i < 2600; i++) { g.fillStyle = r() < 0.5 ? SCRUB : LAND2; g.fillRect(Math.floor(r() * VW), Math.floor(r() * VH), 2, 2); }
    // ---- forest, in blocks, the way a map shows it ------------------------
    const BLOCKS = [[60, 40, 150, 90], [250, 20, 130, 70], [470, 30, 160, 80],
                    [20, 150, 120, 110], [400, 120, 120, 90], [520, 250, 140, 100],
                    [120, 280, 110, 70], [300, 160, 90, 70]];
    for (const [bx, by, bw, bh] of BLOCKS) {
      for (let i = 0; i < (bw * bh) / 34; i++) {
        const x = bx + r() * bw, y = by + r() * bh;
        const s3 = 5 + r() * 6;
        Art.ell(g, x + 1, y + 1.6, s3, s3 * 0.84, FOR0);
        Art.ell(g, x, y, s3, s3 * 0.84, r() < 0.45 ? FOR2 : FOR1);
        Art.ell(g, x - s3 * 0.3, y - s3 * 0.3, s3 * 0.5, s3 * 0.42, r() < 0.3 ? FOR3 : FOR2);
      }
    }
    // ---- water: a lake up north and a river down to the sea --------------
    Art.ell(g, 586, 66, 52, 30, '#0d2237');
    Art.ell(g, 586, 66, 48, 26, WATER);
    Art.ell(g, 580, 62, 36, 17, WATER2);
    Art.ell(g, 572, 58, 18, 8, WATER3);
    const river = [[586, 88], [560, 126], [530, 160], [516, 200], [522, 250], [540, 300], [560, 358]];
    poly(g, river, '#0d2237', 11); poly(g, river, WATER, 8);
    dashed(g, river, WATER3, 1, 4, 5);
    // ---- the street grid through town ------------------------------------
    const T = TOWN;
    for (let x = T.x0; x <= T.x1; x += T.gx) {
      poly(g, [[x, T.y0], [x, T.y1]], ST0, 7);
      poly(g, [[x, T.y0], [x, T.y1]], ST1, 5);
      poly(g, [[x, T.y0], [x, T.y1]], ST2, 1);
    }
    for (let y = T.y0; y <= T.y1; y += T.gy) {
      poly(g, [[T.x0, y], [T.x1, y]], ST0, 7);
      poly(g, [[T.x0, y], [T.x1, y]], ST1, 5);
      poly(g, [[T.x0, y], [T.x1, y]], ST2, 1);
    }
    // the blocks between the streets, built up
    for (let x = T.x0; x < T.x1; x += T.gx) {
      for (let y = T.y0; y < T.y1; y += T.gy) {
        const n = 2 + Math.floor(r() * 3);
        for (let i = 0; i < n; i++) {
          const bw = 6 + r() * 9, bh = 5 + r() * 7;
          const bx = x + 5 + r() * (T.gx - 10 - bw), by = y + 5 + r() * (T.gy - 10 - bh);
          g.fillStyle = BLD0; g.fillRect(Math.round(bx), Math.round(by + 1), Math.round(bw), Math.round(bh));
          g.fillStyle = r() < 0.4 ? BLD2 : BLD1; g.fillRect(Math.round(bx), Math.round(by), Math.round(bw), Math.round(bh));
          g.fillStyle = BLD3; g.fillRect(Math.round(bx), Math.round(by), Math.round(bw), 1);
          if (r() < 0.45) { g.fillStyle = LIT; g.fillRect(Math.round(bx + 1), Math.round(by + 2), 1, 1); }
        }
      }
    }
    // ---- the roads --------------------------------------------------------
    // The main road through the district is drawn like every other road. It was
    // a gold motorway band and nobody could tell what it was.
    for (const p of ROADS.concat([HIGHWAY])) {
      poly(g, p, RD0, 9);
      poly(g, p, RD1, 7);
      poly(g, p, RD2, 3);
      dashed(g, p, RD3, 1, 3, 5);
    }
    // ---- farms and sheds strung along the roads --------------------------
    for (const p of ROADS) {
      for (let i = 1; i < p.length - 1; i++) {
        if (r() < 0.45) continue;
        const sd = r() < 0.5 ? -1 : 1;
        const bx = p[i][0] + sd * (9 + r() * 10), by = p[i][1] + (r() - 0.5) * 14;
        const bw = 7 + r() * 6, bh = 6 + r() * 5;
        g.fillStyle = BLD0; g.fillRect(Math.round(bx), Math.round(by + 1), Math.round(bw), Math.round(bh));
        g.fillStyle = BLD1; g.fillRect(Math.round(bx), Math.round(by), Math.round(bw), Math.round(bh));
        g.fillStyle = BLD2; g.fillRect(Math.round(bx), Math.round(by), Math.round(bw), 1);
        if (r() < 0.5) { g.fillStyle = LIT; g.fillRect(Math.round(bx + bw - 2), Math.round(by + 2), 1, 1); }
      }
    }
    // ---- the names on it --------------------------------------------------
    for (const [lx, ly, tx2, col] of [
      [330, 246, 'WOMBAT FLAT', '#9aa88a'], [112, 74, 'FERN GULLY', '#7a8a6e'],
      [512, 44, 'STILL LAKE', '#6f9ab0'], [248, 128, 'THE SCRUB', '#7a8a6e'],
      [560, 292, 'BLACKWOOD', '#7a8a6e'], [128, 320, 'STONE FLAT', '#7a8a6e'],
      [452, 340, 'THE FLATS', '#7a8a6e']]) {
      Font.draw(g, tx2, lx, ly, { scale: 1, color: col, align: 'center', shadow: 'rgba(4,8,4,0.95)' });
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
      const gr = g.createRadialGradient(x, y, 0, x, y, f.r);
      gr.addColorStop(0, `rgba(58,54,70,${(0.42 * a).toFixed(3)})`);
      gr.addColorStop(1, 'rgba(58,54,70,0)');
      g.fillStyle = gr;
      g.fillRect(x - f.r, y - f.r, f.r * 2, f.r * 2);
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
      const wl = g.createRadialGradient(s2.x, s2.y, 4, s2.x, s2.y, 92);
      wl.addColorStop(0, 'rgba(255,206,130,0.24)');
      wl.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = wl; g.fillRect(s2.x - 96, s2.y - 96, 192, 192);
    }
    g.restore();
    const vg = g.createRadialGradient(VW / 2, VH / 2, VH * 0.32, VW / 2, VH / 2, VH * 1.06);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(2,4,3,0.88)');
    g.fillStyle = vg; g.fillRect(0, 0, VW, VH);

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
