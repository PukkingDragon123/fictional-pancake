// ---- The map: parchment, fog, and places to go ---------------------------
const Atlas = (() => {
  let G = null;
  const VW = 640, VH = 360;
  let sheet = null, hover = null;
  const fog = [];
  let travel = null;

  function sheetOf() {
    if (sheet) return sheet;
    const { c, g } = Art.cv(VW, VH);
    const r = Art.rng(4242);
    // parchment
    g.fillStyle = PAL.parch1; g.fillRect(0, 0, VW, VH);
    for (let i = 0; i < 2600; i++) {
      const x = Math.floor(r() * VW), y = Math.floor(r() * VH);
      g.fillStyle = ['#e7d3a8', '#cdb88c', '#f2e2bd'][Math.floor(r() * 3)];
      g.fillRect(x, y, 1 + (r() < 0.2 ? 1 : 0), 1);
    }
    // burnt edges
    for (let x = 0; x < VW; x++) {
      const t = Math.abs(x / VW - 0.5) * 2;
      const h = 6 + Math.floor(r() * 7) + t * 5;
      g.fillStyle = 'rgba(120,88,48,0.5)';
      g.fillRect(x, 0, 1, h); g.fillRect(x, VH - h, 1, h);
    }
    for (let y = 0; y < VH; y++) {
      const h = 8 + Math.floor(r() * 8);
      g.fillStyle = 'rgba(120,88,48,0.5)';
      g.fillRect(0, y, h, 1); g.fillRect(VW - h, y, h, 1);
    }
    // fold creases
    g.fillStyle = 'rgba(150,118,70,0.28)';
    g.fillRect(VW / 3, 0, 1, VH); g.fillRect((VW * 2) / 3, 0, 1, VH); g.fillRect(0, VH / 2, VW, 1);
    // coastline / river
    const ink = '#6d5330';
    let px = 20, py = 320;
    for (let i = 0; i < 90; i++) {
      const nx = px + 7, ny = 320 - Math.sin(i * 0.22) * 26 - i * 0.7;
      Art.line(g, px, py, nx, ny, '#7fa9b8', 2);
      px = nx; py = ny;
    }
    // hill ranges
    for (let i = 0; i < 16; i++) {
      const x = 40 + r() * 560, y = 60 + r() * 250;
      Art.line(g, x - 8, y, x, y - 7, ink, 1);
      Art.line(g, x, y - 7, x + 8, y, ink, 1);
    }
    // little forests
    for (let i = 0; i < 44; i++) {
      const x = 24 + r() * 590, y = 40 + r() * 290;
      Art.ell(g, x, y - 3, 3, 3.4, '#5d7d44');
      g.fillStyle = '#6d5330'; g.fillRect(Math.round(x), Math.round(y), 1, 3);
    }
    // compass rose
    const cx = 576, cy = 306;
    Art.ell(g, cx, cy, 18, 18, 'rgba(120,88,48,0.16)');
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * TAU - Math.PI / 2;
      Art.line(g, cx, cy, cx + Math.cos(a) * 15, cy + Math.sin(a) * 15, i === 0 ? '#b8412c' : ink, i === 0 ? 2 : 1);
    }
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * TAU + Math.PI / 4;
      Art.line(g, cx, cy, cx + Math.cos(a) * 8, cy + Math.sin(a) * 8, ink, 1);
    }
    Art.ell(g, cx, cy, 3, 3, ink);
    sheet = c;
    return c;
  }

  function unlocked(s) { return Object.keys(G.summoned).length >= (s.need || 0); }

  function init(g) {
    G = g;
    fog.length = 0;
    const r = Art.rng(1717);
    for (let i = 0; i < 90; i++) fog.push({ x: r() * VW, y: r() * VH, r: 22 + r() * 34, ph: r() * TAU, sp: 0.1 + r() * 0.3 });
  }
  function enter() { hover = null; travel = null; Audio.setMode('pen'); }

  function pathBetween(g, a, b, t) {
    const n = Math.max(6, Math.round(Math.hypot(b.x - a.x, b.y - a.y) / 11));
    for (let i = 1; i < n; i++) {
      const k = i / n;
      const x = U.lerp(a.x, b.x, k), y = U.lerp(a.y, b.y, k) - Math.sin(k * Math.PI) * 14;
      const on = ((k * n - t * 3) % 1 + 1) % 1;
      g.fillStyle = on < 0.55 ? 'rgba(109,83,48,0.85)' : 'rgba(109,83,48,0.28)';
      g.fillRect(Math.round(x) - 1, Math.round(y) - 1, 2, 2);
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
    if (!unlocked(s)) { Audio.play('error'); UI.toast('fog', 'bad'); return; }
    if (!s.mode) { Audio.play('error'); return; }
    travel = { t: 0, site: s };
    Audio.play('whoosh');
    FX.shake(1.4);
  }
  function hoverAt(x, y) {
    hover = siteAt(x, y);
    if (!hover) return null;
    if (!unlocked(hover)) return `<b>?</b><br>${hover.need} gods must answer first`;
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

  function banner(g, text, cx, cy) {
    const w = text.length * 6 + 26;
    g.fillStyle = '#c9ab72'; g.fillRect(cx - w / 2, cy - 9, w, 18);
    g.fillStyle = '#a98a52'; g.fillRect(cx - w / 2, cy + 6, w, 3);
    g.fillStyle = '#7c5f36'; g.fillRect(cx - w / 2 - 6, cy - 11, 6, 22); g.fillRect(cx + w / 2, cy - 11, 6, 22);
    FX.pixelText(g, text, cx, cy - 3, { color: '#4a3820', size: 1, align: 'center' });
  }

  function drawPin(g, s, open, hot, bob, t) {
    const x = Math.round(s.x), y = Math.round(s.y + bob);
    // ink circle
    g.fillStyle = 'rgba(109,83,48,0.2)';
    Art.ell(g, x, y + 12, 16, 5, 'rgba(109,83,48,0.2)');
    if (!open) {
      Art.ell(g, x, y, 13, 13, 'rgba(52,46,60,0.85)');
      Icons.blit(g, 'lock', x - 8, y - 8, 1);
      return;
    }
    if (hot) {
      g.globalAlpha = 0.35 + Math.sin(t * 6) * 0.12;
      Art.ell(g, x, y, 20, 20, PAL.gold3);
      g.globalAlpha = 1;
    }
    Art.ell(g, x, y, 15, 15, '#efdcb4');
    Art.ellBand(g, x, y, 15, 15, 2, '#6d5330');
    Icons.blit(g, s.icon, x - 11, y - 11, 1.4);
    if (s.key === 'ritual') {
      const p = 0.5 + 0.5 * Math.sin(t * 3);
      g.globalAlpha = 0.35 + p * 0.35;
      Art.ellBand(g, x, y, 19 + p * 2, 19 + p * 2, 1, PAL.div4);
      g.globalAlpha = 1;
    }
    FX.pixelText(g, s.name.toUpperCase(), x, y + 20, { color: '#4a3820', size: 1, align: 'center' });
  }

  return { init, enter, update, render, click, hover: hoverAt, get busy() { return !!travel; } };
})();
