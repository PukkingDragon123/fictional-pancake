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
  // Seen from above: canopy, clearings cut into it, dirt tracks between them,
  // and a creek running through. No streets out here.
  const CAN0 = '#080f0c', CAN1 = '#0e1a12', CAN2 = '#15281a', CAN3 = '#1e3a23', CAN4 = '#2c5230';
  const GRASS = '#33502f', GRASS2 = '#28422a', DIRT = '#6b5338', DIRT2 = '#4c3a26', DIRT3 = '#8a6c48';
  const WATER = '#1e4a66', WATER2 = '#37708f', ROCK = '#3d3a38', MINK = '#111c14';
  const BONE = '#b8b0a0', BONE2 = '#7d766a';

  function sheetOf() {
    if (sheet) return sheet;
    const { c, g } = Art.cv(VW, VH);
    const r = Art.rng(4242);
    g.fillStyle = CAN1; g.fillRect(0, 0, VW, VH);
    for (let i = 0; i < 3000; i++) { g.fillStyle = r() < 0.5 ? CAN0 : CAN2; g.fillRect(Math.floor(r() * VW), Math.floor(r() * VH), 2, 2); }
    // ---- the clearings each place sits in ---------------------------------
    for (const s2 of SITES) {
      const rad = 40 + r() * 16;
      for (let k = 0; k < 22; k++) {
        const a2 = r() * TAU, d = Math.sqrt(r()) * rad;
        Art.ell(g, s2.x + Math.cos(a2) * d, s2.y + Math.sin(a2) * d * 0.8, 15 + r() * 9, 11 + r() * 7, GRASS2);
      }
      Art.ell(g, s2.x, s2.y + 2, rad * 0.8, rad * 0.58, GRASS);
      for (let k = 0; k < 26; k++) { g.fillStyle = r() < 0.5 ? '#8dbf66' : '#66904a'; g.fillRect(s2.x - rad + r() * rad * 2, s2.y - rad * 0.6 + r() * rad * 1.2, 2, 2); }
    }
    // ---- the creek ---------------------------------------------------------
    let wx = -10, wy = 84;
    const wpts = [];
    for (let i = 0; i <= 40; i++) { wpts.push([wx, wy]); wx += 17; wy += Math.sin(i * 0.34) * 13 + 3.6; }
    for (let i = 0; i < wpts.length - 1; i++) {
      Art.line(g, wpts[i][0], wpts[i][1], wpts[i + 1][0], wpts[i + 1][1], '#2f5f78', 13);
      Art.line(g, wpts[i][0], wpts[i][1], wpts[i + 1][0], wpts[i + 1][1], WATER, 9);
      if (i % 2 === 0) Art.line(g, wpts[i][0], wpts[i][1] - 2, wpts[i + 1][0], wpts[i + 1][1] - 2, WATER2, 2);
    }
    // ---- the canopy: crowns, thicker the further from a clearing -----------
    for (let i = 0; i < 1100; i++) {
      const x = r() * VW, y = r() * VH;
      let near = 1e9;
      for (const s2 of SITES) near = Math.min(near, Math.hypot(x - s2.x, (y - s2.y) * 1.25));
      if (near < 46 && r() < 0.94) continue;
      const d = g.getImageData(Math.floor(U.clamp(x, 0, VW - 1)), Math.floor(U.clamp(y, 0, VH - 1)), 1, 1).data;
      if (d[2] > 90 && d[2] > d[1]) continue;                   // keep out of the creek
      const s3 = 7 + r() * 9;
      Art.ell(g, x + 1, y + 2, s3, s3 * 0.86, CAN0);
      Art.ell(g, x, y, s3, s3 * 0.86, r() < 0.45 ? CAN2 : CAN1);
      Art.ell(g, x - s3 * 0.28, y - s3 * 0.3, s3 * 0.56, s3 * 0.46, r() < 0.3 ? CAN4 : CAN3);
      if (r() < 0.14) Art.ell(g, x + s3 * 0.3, y + s3 * 0.2, s3 * 0.3, s3 * 0.24, CAN0);
    }
    // ---- rocks, logs and ferns in the open ---------------------------------
    for (let i = 0; i < 70; i++) {
      const x = r() * VW, y = r() * VH;
      let near = 1e9;
      for (const s2 of SITES) near = Math.min(near, Math.hypot(x - s2.x, (y - s2.y) * 1.25));
      if (near > 52) continue;
      if (r() < 0.4) { Art.ell(g, x, y + 1, 5, 4, '#5d5850'); Art.ell(g, x, y, 5, 4, ROCK); Art.ell(g, x - 1.4, y - 1.2, 2.4, 1.8, '#9a9286'); }
      else if (r() < 0.5) { g.fillStyle = '#5d4430'; g.fillRect(x - 9, y, 18, 5); g.fillStyle = '#7d5f42'; g.fillRect(x - 9, y, 18, 2); }
      else for (let f = -2; f <= 2; f++) Art.limb(g, x, y + 3, x + f * 5, y - 4, 2, 1, f % 2 ? '#3f7a2c' : '#58a04e');
    }
    // ---- things you would rather not have found ---------------------------
    for (let i = 0; i < 26; i++) {
      const x = r() * VW, y = r() * VH;
      let near = 1e9;
      for (const s2 of SITES) near = Math.min(near, Math.hypot(x - s2.x, (y - s2.y) * 1.25));
      if (near < 40 || near > 120) continue;
      if (r() < 0.45) {                                   // a ribcage in the leaf litter
        Art.ell(g, x, y, 7, 4, '#10140f');
        for (let k = -3; k <= 3; k++) {
          g.fillStyle = k % 2 ? BONE2 : BONE;
          g.fillRect(Math.round(x + k * 2), Math.round(y - 3 + Math.abs(k) * 0.5), 1, 6 - Math.abs(k));
        }
        g.fillStyle = BONE; g.fillRect(Math.round(x - 8), Math.round(y - 1), 4, 3);
      } else if (r() < 0.5) {                             // a burnt stump, still black
        Art.ell(g, x, y + 2, 7, 3, '#060907');
        Art.ell(g, x, y, 6, 4, '#171410');
        Art.ell(g, x, y - 1, 4.6, 2.8, '#241d16');
        for (let k = 0; k < 3; k++) g.fillStyle = '#0a0806', g.fillRect(Math.round(x - 3 + k * 3), Math.round(y - 6), 2, 6);
      } else {                                            // a cairn someone stacked and left
        for (let k = 0; k < 4; k++) Art.ell(g, x + (k % 2 ? 1 : -1), y - k * 3, 5 - k * 0.8, 2.4 - k * 0.3, k % 2 ? ROCK : '#4c4844');
      }
    }
    // ---- a few place names, scratched into the canopy ---------------------
    for (const [lx, ly, tx2] of [[112, 62, 'FERN GULLY'], [300, 200, 'THE SCRUB'],
                                  [566, 292, 'BLACKWOOD'], [86, 316, 'STONE FLAT'], [470, 40, 'HIGH RIDGE']]) {
      Font.draw(g, tx2, lx, ly, { scale: 1, color: '#5f7a52', align: 'center', shadow: 'rgba(4,8,4,0.95)' });
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
  }
  function enter() { hover = null; travel = null; Audio.setMode('pen'); }

  // a track worn into the forest floor, with boot prints going along it
  // Tracks join one place to the next, not everything to the grove. Each leg
  // has its own sag so the web reads as a walked network, not a fan.
  const TRAILS = [
    ['grove', 'mart', 26], ['grove', 'quarry', -30], ['grove', 'ritual', -22],
    ['ritual', 'deep', 24], ['ritual', 'lake', -18], ['ritual', 'stack', 30],
    ['mart', 'stack', 22],
  ];
  function pathBetween(g, a, b, bend, t) {
    const n = Math.max(12, Math.round(Math.hypot(b.x - a.x, b.y - a.y) / 5));
    const pt = (k) => {
      const s2 = Math.sin(k * Math.PI), w2 = Math.sin(k * Math.PI * 3) * 4;
      return {
        x: U.lerp(a.x, b.x, k) - (b.y - a.y) / Math.hypot(b.x - a.x, b.y - a.y || 1) * s2 * bend + w2,
        y: U.lerp(a.y, b.y, k) + (b.x - a.x) / Math.hypot(b.x - a.x, b.y - a.y || 1) * s2 * bend,
      };
    };
    for (const [w, col] of [[8, '#5d4a33'], [6, '#8b6942'], [3, '#b9905c']]) {
      let p = pt(0);
      for (let i = 1; i <= n; i++) { const q = pt(i / n); Art.line(g, p.x, p.y, q.x, q.y, col, w); p = q; }
    }
    for (let i = 1; i < n; i += 3) {                      // grit worn into the middle
      const p = pt(i / n);
      g.fillStyle = DIRT3; g.fillRect(Math.round(p.x) + (i % 4 ? 0 : -1), Math.round(p.y) - 1, 1, 1);
    }
    for (let i = 0; i < 4; i++) {                         // boots, walking the track
      const k = ((i / 4) + t * 0.09) % 1;
      const p = pt(k);
      g.fillStyle = 'rgba(26,18,10,0.7)';
      g.fillRect(Math.round(p.x) - 2, Math.round(p.y) - 1, 2, 3);
      g.fillRect(Math.round(p.x) + 1, Math.round(p.y) + 2, 2, 3);
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
    const byKey = Object.fromEntries(SITES.map((s) => [s.key, s]));
    for (const [ak, bk, bend] of TRAILS) {
      const a = byKey[ak], b = byKey[bk];
      if (a && b && unlocked(a) && unlocked(b)) pathBetween(g, a, b, bend, t);
    }

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
