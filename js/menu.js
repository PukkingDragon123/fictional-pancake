// ---- The title screen -----------------------------------------------------
// A dead forest at night with one lantern burning in it, and stone wombats
// standing in the dark watching you pick a save. Everything here is drawn on
// the game canvas; the DOM HUD is hidden while this is up.
const Menu = (() => {
  const VW = 640, VH = 360;
  const GROUND = 196;               // the cards take the lower third

  let G = null;                       // the settings bag, not a save
  let slots = { 1: null, 2: null, 3: null };
  let t = 0, page = 'slots', hover = null, confirm = null;
  let cards = [], buttons = [];
  let onStart = null;
  let lanternT = 0;

  // ---- the wood -----------------------------------------------------------
  const TRUNK0 = '#0b0f0c', TRUNK1 = '#151d16', TRUNK2 = '#22301f', TRUNK3 = '#33452c';
  const MIST = 'rgba(150,176,150,';
  const LIGHT = '#ffd98a';

  const R = Art.rng(90210);
  const trees = [];
  for (let d = 0; d < 4; d++) {
    const n = [5, 6, 8, 10][d];
    for (let i = 0; i < n; i++) {
      const w = [46, 34, 24, 15][d] * (0.75 + R() * 0.6);
      trees.push({
        d, x: (i + 0.5) * (VW / n) + (R() - 0.5) * (VW / n) * 0.8,
        w, h: [330, 290, 250, 210][d] * (0.7 + R() * 0.5),
        lean: (R() - 0.5) * 0.26, sway: R() * TAU,
        forks: Array.from({ length: 3 + Math.floor(R() * 2) }, () => ({
          k: 0.3 + R() * 0.55, side: R() < 0.5 ? -1 : 1, len: 0.22 + R() * 0.3, rise: 0.5 + R() * 0.6,
        })),
      });
    }
  }
  // Front statues frame the cards; the back pair stand out in the wood.
  const STATUES_BACK = [
    { x: 84, y: 190, s: 0.62, turn: 1 }, { x: 236, y: 182, s: 0.5, turn: -1 },
    { x: 430, y: 184, s: 0.52, turn: 1 }, { x: 566, y: 192, s: 0.66, turn: -1 },
  ];
  const STATUES_FRONT = [
    { x: 34, y: 352, s: 1.35, turn: 1 }, { x: 608, y: 356, s: 1.4, turn: -1 },
  ];
  const motes = [];
  for (let i = 0; i < 40; i++) motes.push({ x: R() * VW, y: 120 + R() * 240, ph: R() * TAU, sp: 0.2 + R() * 0.5 });
  const eyes = [];
  for (let i = 0; i < 7; i++) eyes.push({ x: 30 + R() * (VW - 60), y: 150 + R() * 70, ph: R() * TAU, on: 0 });

  function init(settings, saves, start) {
    G = settings; slots = saves; onStart = start;
  }
  function setSlots(s) { slots = s; }
  function enter() { t = 0; page = 'slots'; confirm = null; hover = null; Audio.setMode('menu'); }

  // ---- a stone wombat ------------------------------------------------------
  // Weathered granite, mossed at the base, one chipped ear. The lantern picks
  // out whichever side faces it.
  function statue(g, s2) {
    const { x, y, s, turn } = s2;
    const S0 = '#0f1115', S1 = '#262b32', S2 = '#343a43', S3 = '#454c56', S4 = '#5e656f';
    const lit = x < 330 ? 1 : -1;                       // the lantern is left of centre
    g.save();
    g.translate(x, y); g.scale(s * turn, s);
    // plinth
    Art.poly(g, [[-22, 0], [22, 0], [18, -12], [-18, -12]], S0);
    Art.poly(g, [[-20, -1], [20, -1], [16.5, -11], [-16.5, -11]], S1);
    Art.rect(g, -16.5, -11, 33, 2, S2);
    for (let i = -3; i <= 3; i++) Art.rect(g, i * 5, -10, 1, 9, S0);
    // body: a squat block of a wombat
    Art.ell(g, 0, -26, 19, 16, S0);
    Art.ell(g, 0, -27, 17.5, 14.5, S1);
    Art.ell(g, -6 * lit, -32, 9, 7, S2);
    Art.ell(g, -9 * lit, -35, 4.5, 3.4, S3);
    // legs, blocked in
    for (const lx of [-12, 10]) { Art.rect(g, lx, -14, 7, 14, S0); Art.rect(g, lx + 1, -13, 5, 13, S1); }
    // head: blunt and square, the way a wombat's is
    Art.ell(g, 14, -34, 10.5, 9.5, S0);
    Art.ell(g, 14, -35, 9.5, 8.5, S1);
    Art.ell(g, 11, -38.5, 4.6, 3.6, S2);
    Art.ell(g, 9.5, -40, 2, 1.5, S3);
    Art.ell(g, 8.5, -42.5, 4, 3.8, S0); Art.ell(g, 8.5, -43, 2.9, 2.7, S2);   // near ear
    Art.ell(g, 18.5, -42, 3.8, 3.6, S0); Art.ell(g, 19, -42, 1.8, 2.2, S1);   // far ear, chipped
    Art.ell(g, 20, -31.5, 4.6, 3.8, S0); Art.ell(g, 20, -32.2, 3.8, 3.1, S2); // short snout
    Art.rect(g, 21.6, -33.2, 2, 1.4, S0);
    // carved eyes, hollow
    Art.ell(g, 12, -36.5, 1.7, 1.9, '#07080b');
    Art.ell(g, 17.6, -36, 1.5, 1.7, '#07080b');
    // weather: cracks, chips, moss
    Art.rect(g, -4, -34, 1, 12, S0);
    Art.rect(g, 4, -24, 6, 1, S0);
    g.globalAlpha = 0.55;
    Art.speckle(g, -2, -16, 18, 9, '#3f5a34', 0.22, 3);
    Art.speckle(g, 0, -3, 20, 5, '#2f4a2a', 0.3, 5);
    g.globalAlpha = 1;
    Art.rect(g, -16.5, -11, 33, 1, S3);
    g.restore();
  }

  function drawStatues(g, list) {
    for (const s2 of list.slice().sort((a, b) => a.y - b.y)) {
      const away = s2.x < 214 ? -1 : 1;                 // shadows thrown away from the lantern
      Art.poly(g, [[s2.x - 20 * s2.s, s2.y], [s2.x + 20 * s2.s, s2.y],
                   [s2.x + away * 56 * s2.s, s2.y + 13 * s2.s], [s2.x + away * 24 * s2.s, s2.y + 13 * s2.s]],
               'rgba(0,0,0,0.45)');
      statue(g, s2);
    }
  }

  // ---- the scene ----------------------------------------------------------
  function scene(g) {
    const lx = 214, ly = 112;                            // where the lantern hangs
    const flick = 0.82 + 0.18 * Math.sin(t * 9) + 0.06 * Math.sin(t * 23);
    // night sky, cold and starless near the canopy
    const sky = g.createLinearGradient(0, 0, 0, GROUND);
    sky.addColorStop(0, '#05070a'); sky.addColorStop(0.55, '#0a1016'); sky.addColorStop(1, '#141d1c');
    g.fillStyle = sky; g.fillRect(0, 0, VW, GROUND);
    for (let i = 0; i < 36; i++) {
      const sx = (i * 173) % VW, sy = (i * 61) % 120;
      g.fillStyle = `rgba(190,214,238,${(0.14 + 0.2 * Math.abs(Math.sin(t * 0.7 + i))).toFixed(2)})`;
      g.fillRect(sx, sy, 1, 1);
    }
    // ground: wet black earth
    const grd = g.createLinearGradient(0, GROUND - 10, 0, VH);
    grd.addColorStop(0, '#141c14'); grd.addColorStop(1, '#080c09');
    g.fillStyle = grd; g.fillRect(0, GROUND - 10, VW, VH - GROUND + 10);

    // ---- the wood, four ranks deep -----------------------------------------
    for (let d = 0; d < 4; d++) {
      const col = [TRUNK0, TRUNK1, TRUNK2, TRUNK3][d];
      const rim = [TRUNK1, TRUNK2, TRUNK3, '#48603d'][d];
      for (const tr of trees) {
        if (tr.d !== d) continue;
        const sway = Math.sin(t * 0.45 + tr.sway) * (0.8 + d * 0.7);
        const base = GROUND + 18 + d * 16;
        const top = base - tr.h;
        const dx = tr.lean * tr.h + sway;
        const tipX = tr.x + dx, tipY = top;
        // a flare of roots at the foot
        for (let r = -2; r <= 2; r++) {
          Art.limb(g, tr.x, base - 2, tr.x + r * tr.w * 0.62, base + 12, tr.w * 0.3, 1.6, col);
        }
        Art.limb(g, tr.x, base, tipX, tipY, tr.w, tr.w * 0.22, col);
        // the lit edge: one narrow strip down the lantern side
        const lightX = 214;
        const sgn = tr.x < lightX ? 1 : -1;
        const near = U.clamp(1 - Math.abs(tr.x - lightX) / 420, 0, 1);
        if (near > 0.02) {
          g.globalAlpha = 0.5 * near;
          Art.limb(g, tr.x + sgn * tr.w * 0.36, base, tipX + sgn * tr.w * 0.1, tipY + tr.h * 0.1, tr.w * 0.2, 0.8, rim);
          g.globalAlpha = 1;
        }
        // dead limbs, forking upward and out
        for (const f of tr.forks) {
          const bx = U.lerp(tr.x, tipX, f.k), by = U.lerp(base, tipY, f.k);
          const w0 = tr.w * (1 - f.k) * 0.5 + 1.5;
          const ex = bx + f.side * tr.h * f.len, ey = by - tr.h * f.len * f.rise;
          Art.limb(g, bx, by, ex, ey, w0, w0 * 0.3, col);
          Art.limb(g, ex, ey, ex + f.side * tr.h * f.len * 0.5, ey - tr.h * f.len * 0.5, w0 * 0.3, 0.8, col);
          Art.limb(g, ex, ey, ex + f.side * tr.h * f.len * 0.2, ey - tr.h * f.len * 0.72, w0 * 0.3, 0.8, col);
        }
      }
      if (d === 1) {                                     // eyes in the middle distance
        for (const e of eyes) {
          e.on = Math.sin(t * 0.7 + e.ph) > 0.955 ? 1 : e.on * 0.9;
          if (e.on < 0.05) continue;
          g.fillStyle = `rgba(240,196,120,${(e.on * 0.85).toFixed(2)})`;
          g.fillRect(e.x, e.y, 2, 2); g.fillRect(e.x + 5, e.y, 2, 2);
        }
      }
    }
    // ---- mist lying between the trunks -------------------------------------
    for (let i = 0; i < 6; i++) {
      const mx = ((i * 140 + t * 5) % (VW + 300)) - 150;
      const a = 0.05 + 0.03 * Math.sin(t * 0.4 + i);
      const mg = g.createLinearGradient(0, GROUND - 60, 0, GROUND + 24);
      mg.addColorStop(0, MIST + '0)'); mg.addColorStop(0.6, MIST + a.toFixed(3) + ')'); mg.addColorStop(1, MIST + '0)');
      g.fillStyle = mg; g.fillRect(mx, GROUND - 60, 200, 90);
    }

    drawStatues(g, STATUES_BACK);



    // ---- the lantern, and the one warm thing in the picture -----------------
    const glow = g.createRadialGradient(lx, ly + 10, 6, lx, ly + 10, 210 * flick);
    glow.addColorStop(0, `rgba(255,216,140,${(0.34 * flick).toFixed(2)})`);
    glow.addColorStop(0.45, 'rgba(240,170,90,0.09)');
    glow.addColorStop(1, 'rgba(240,170,90,0)');
    g.fillStyle = glow; g.fillRect(lx - 220, ly - 190, 440, 420);
    g.fillStyle = '#1a1410'; g.fillRect(lx - 1, 0, 2, ly - 14);       // the chain
    for (let i = 0; i < 6; i++) { g.fillStyle = '#4a4038'; g.fillRect(lx - 2, 12 + i * 24, 4, 3); }
    g.fillStyle = '#0c0a08'; g.fillRect(lx - 9, ly - 15, 18, 4);      // cap
    g.fillStyle = '#57493a'; g.fillRect(lx - 8, ly - 14, 16, 2);
    g.fillStyle = '#0c0a08'; g.fillRect(lx - 8, ly - 11, 16, 22);     // body
    g.fillStyle = `rgba(255,226,164,${(0.9 * flick).toFixed(2)})`; g.fillRect(lx - 6, ly - 9, 12, 18);
    g.fillStyle = '#fff6dc'; Art.ell(g, lx, ly + 1, 3, 5.4);
    g.fillStyle = '#0c0a08';
    g.fillRect(lx - 8, ly - 1, 16, 1); g.fillRect(lx - 1, ly - 11, 2, 22);
    g.fillRect(lx - 9, ly + 11, 18, 4);
    g.fillStyle = '#57493a'; g.fillRect(lx - 8, ly + 12, 16, 2);
    // motes riding the warm air
    for (const m of motes) {
      const mx = m.x + Math.sin(t * m.sp + m.ph) * 22;
      const my = m.y - ((t * 10 * m.sp) % 240);
      const d2 = Math.hypot(mx - lx, my - ly);
      const a = U.clamp(1 - d2 / 230, 0, 1) * (0.3 + 0.5 * (Math.sin(t * 2 + m.ph) * 0.5 + 0.5));
      if (a < 0.02) continue;
      g.fillStyle = `rgba(255,214,150,${a.toFixed(2)})`;
      g.fillRect(Math.round(mx), Math.round(my), 1, 1);
    }
    // the grade: cold everywhere the lantern does not reach
    g.save();
    g.globalCompositeOperation = 'soft-light';
    g.fillStyle = '#1c3a6a'; g.globalAlpha = 0.42; g.fillRect(0, 0, VW, VH);
    g.restore();
    const vg = g.createRadialGradient(VW / 2, VH * 0.5, VH * 0.3, VW / 2, VH * 0.5, VH * 1.05);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.82)');
    g.fillStyle = vg; g.fillRect(0, 0, VW, VH);
  }

  // ---- panels --------------------------------------------------------------
  function plaque(g, x, y, w, h, hot, tone) {
    g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillRect(x + 3, y + 4, w, h);
    g.fillStyle = '#0a0810'; g.fillRect(x, y, w, h);
    g.fillStyle = tone || '#3f2a18'; g.fillRect(x + 2, y + 2, w - 4, h - 4);
    Tex.fill(g, 'darkwood', x + 2, y + 2, w - 4, h - 4, 0.7);
    g.fillStyle = hot ? 'rgba(255,216,140,0.22)' : 'rgba(255,226,180,0.08)';
    g.fillRect(x + 2, y + 2, w - 4, 2);
    g.fillStyle = 'rgba(0,0,0,0.34)'; g.fillRect(x + 2, y + h - 6, w - 4, 4);
    g.strokeStyle = hot ? '#f5cd5c' : '#241a12'; g.lineWidth = 1;
    g.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);
    for (const nx of [x + 7, x + w - 8]) {
      g.fillStyle = '#1a1218'; g.fillRect(nx - 1, y + 6, 3, 3);
      g.fillStyle = '#7f7688'; g.fillRect(nx - 1, y + 6, 2, 2);
    }
  }

  function summary(d) {
    if (!d) return null;
    const wombats = (d.wombats || []).length;
    const gods = Object.keys(d.summoned || {}).length;
    const plots = Object.keys(d.plots || { home: 1 }).length;
    const played = Math.max(0, Math.round((d.time || 0)));
    return { wd: d.wd || 0, wombats, gods, plots, played, at: d.lastSave || 0, done: !!d.introDone };
  }
  const ago = (ms) => {
    if (!ms) return '';
    const s = Math.max(0, (Date.now() - ms) / 1000);
    if (s < 90) return 'NOW';
    if (s < 5400) return Math.round(s / 60) + 'M';
    if (s < 172800) return Math.round(s / 3600) + 'H';
    return Math.round(s / 86400) + 'D';
  };

  function drawSlots(g) {
    cards = []; buttons = [];
    const CW2 = 150, CH2 = 118, y = 200;
    for (let i = 0; i < 3; i++) {
      const n = i + 1, x = 82 + i * (CW2 + 14);
      const d = summary(slots[n]);
      const hot = hover === 'slot' + n;
      cards.push({ id: 'slot' + n, n, x, y, w: CW2, h: CH2 });
      plaque(g, x, y + (hot ? -2 : 0), CW2, CH2, hot, d ? '#4a3018' : '#2f2418');
      const yy = y + (hot ? -2 : 0);
      Font.draw(g, 'GROVE ' + n, x + 12, yy + 12, { scale: 2, color: d ? '#f5cd5c' : '#8e8272', shadow: '#160c06' });
      if (!d) {
        Font.draw(g, 'EMPTY', x + CW2 / 2, yy + 48, { scale: 2, color: '#8e8272', align: 'center', shadow: '#160c06' });
        Font.draw(g, 'START A NEW GROVE', x + CW2 / 2, yy + 70, { scale: 1, color: '#6f675a', align: 'center' });
        Font.draw(g, 'CLICK OR PRESS ' + n, x + CW2 / 2, yy + 86, { scale: 1, color: '#8a7f6a', align: 'center' });
      } else {
        Font.draw(g, ago(d.at), x + CW2 - 11, yy + 15, { scale: 1, color: '#a8987c', align: 'right' });
        const rows = [
          ['wdollar', String(d.wd)],
          ['wombat', d.wombats + (d.wombats === 1 ? ' WOMBAT' : ' WOMBATS')],
          ['shrine', d.gods + ' / 10 GODS'],
          ['grove', d.plots + (d.plots === 1 ? ' PLOT' : ' PLOTS')],
        ];
        rows.forEach(([ico, txt], r) => {
          const ry = yy + 32 + r * 16;
          g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(x + 9, ry - 2, CW2 - 18, 15);
          Icons.blit(g, ico, x + 12, ry - 1, 0.85);
          Font.draw(g, txt, x + 30, ry + 2, { scale: 1, color: '#efe0c2' });
        });
        const bx = x + 9, by = yy + CH2 - 20;
        buttons.push({ id: 'del' + n, n, x: bx, y: by, w: 46, h: 14, kind: 'del' });
        const dh = hover === 'del' + n;
        g.fillStyle = dh ? '#8a2f24' : '#2a1a16'; g.fillRect(bx, by, 46, 14);
        g.strokeStyle = dh ? '#e07a6a' : '#4a3028'; g.lineWidth = 1; g.strokeRect(bx + 0.5, by + 0.5, 45, 13);
        Font.draw(g, 'ERASE', bx + 23, by + 4, { scale: 1, color: dh ? '#ffd9cf' : '#9a7a70', align: 'center' });
        Font.draw(g, d.done ? 'CONTINUE' : 'IN THE INTRO', x + CW2 - 9, by + 4, { scale: 1, color: '#c9b68a', align: 'right' });
      }
    }
    // the bar under the cards
    const bw = 148, bx2 = VW / 2 - bw - 7, by2 = 328;
    buttons.push({ id: 'settings', x: bx2, y: by2, w: bw, h: 26, kind: 'page' });
    buttons.push({ id: 'about', x: VW / 2 + 8, y: by2, w: bw, h: 26, kind: 'page' });
    barButton(g, buttons[buttons.length - 2], 'SETTINGS');
    barButton(g, buttons[buttons.length - 1], 'HOW TO PLAY');
  }

  function barButton(g, b, label) {
    const hot = hover === b.id;
    plaque(g, b.x, b.y + (hot ? -1 : 0), b.w, b.h, hot);
    Font.draw(g, label, b.x + b.w / 2, b.y + (hot ? -1 : 0) + 9, {
      scale: 1, color: hot ? '#ffe9a8' : '#c9b68a', align: 'center', shadow: '#160c06',
    });
  }

  const SETTINGS = [
    { key: 'muted', name: 'SOUND', on: 'ON', off: 'MUTED', inv: true },
    { key: 'musicOff', name: 'MUSIC', on: 'ON', off: 'OFF', inv: true },
    { key: 'shake', name: 'SCREEN SHAKE', on: 'ON', off: 'OFF' },
    { key: 'bigText', name: 'BIG TEXT', on: 'ON', off: 'OFF' },
  ];
  function drawSettings(g) {
    cards = []; buttons = [];
    const PW = 420, PX = (VW - PW) / 2, PY = 88, PH = 216;
    plaque(g, PX, PY, PW, PH, false);
    Font.draw(g, 'SETTINGS', VW / 2, PY + 12, { scale: 2, color: '#f5cd5c', align: 'center', shadow: '#160c06' });
    SETTINGS.forEach((s2, i) => {
      const ry = PY + 44 + i * 30;
      const val = s2.inv ? !G[s2.key] : !!G[s2.key];
      const hot = hover === 'set:' + s2.key;
      buttons.push({ id: 'set:' + s2.key, x: PX + 14, y: ry, w: PW - 28, h: 24, kind: 'toggle', k: s2.key });
      g.fillStyle = hot ? 'rgba(255,216,140,0.14)' : 'rgba(0,0,0,0.3)';
      g.fillRect(PX + 14, ry, PW - 28, 24);
      Font.draw(g, s2.name, PX + 26, ry + 8, { scale: 1, color: '#efe0c2' });
      const tx = PX + PW - 92, tw = 66;
      g.fillStyle = '#0a0810'; g.fillRect(tx, ry + 4, tw, 16);
      g.fillStyle = val ? '#3f8f4a' : '#5a4038'; g.fillRect(tx + 1, ry + 5, tw - 2, 14);
      const kx = val ? tx + tw - 20 : tx + 2;
      g.fillStyle = '#efe0c2'; g.fillRect(kx, ry + 6, 18, 12);
      Font.draw(g, val ? s2.on : s2.off, val ? tx + 16 : tx + tw - 16, ry + 9, {
        scale: 1, align: 'center', color: val ? '#dff5d8' : '#d8bdb2',
      });
    });
    const dy = PY + PH - 40;
    buttons.push({ id: 'wipe', x: PX + 14, y: dy, w: PW - 28, h: 26, kind: 'wipe' });
    const wh = hover === 'wipe';
    g.fillStyle = wh ? '#8a2f24' : '#2a1a16'; g.fillRect(PX + 14, dy, PW - 28, 26);
    g.strokeStyle = wh ? '#e07a6a' : '#4a3028'; g.lineWidth = 1; g.strokeRect(PX + 14.5, dy + 0.5, PW - 29, 25);
    Font.draw(g, 'ERASE ALL THREE GROVES', VW / 2, dy + 9, { scale: 1, color: wh ? '#ffd9cf' : '#9a7a70', align: 'center' });
    backButton(g);
  }

  const HELP = [
    'CUT the weeds inside the rope. Big ones take a few swings.',
    'HAUL the rubble, then SOW grass and WATER it until it takes.',
    'A wombat turns up. Feed it, pet it, and it leaves you offerings.',
    'DRAG offerings to your truck. Click the truck to open the map.',
    'The MART sells seeds, tools, upgrades and more wombats.',
    'Stack offerings at the GREAT STACK to summon a god.',
    'The land either side of your grove is for sale. Buy it.',
  ];
  function drawAbout(g) {
    cards = []; buttons = [];
    const PW = 470, PX = (VW - PW) / 2, PY = 86, PH = 168;
    plaque(g, PX, PY, PW, PH, false);
    Font.draw(g, 'HOW TO PLAY', VW / 2, PY + 12, { scale: 2, color: '#f5cd5c', align: 'center', shadow: '#160c06' });
    let y = PY + 40;
    for (const line of HELP) {
      const wrapped = Font.wrap(line.toUpperCase(), PW - 46, 1);
      for (const w of wrapped) { Font.draw(g, w, PX + 34, y, { scale: 1, color: '#efe0c2' }); y += 9; }
      g.fillStyle = '#f5cd5c'; g.fillRect(PX + 24, y - wrapped.length * 9 + 2, 3, 3);
      y += 6;
    }
    backButton(g);
  }
  function backButton(g) {
    const b = { id: 'back', x: VW / 2 - 60, y: 314, w: 120, h: 26, kind: 'page' };
    buttons.push(b);
    barButton(g, b, 'BACK');
  }

  function drawConfirm(g) {
    g.fillStyle = 'rgba(6,4,10,0.72)'; g.fillRect(0, 0, VW, VH);
    const PW = 340, PX = (VW - PW) / 2, PY = 116, PH = 128;
    plaque(g, PX, PY, PW, PH, false, '#3a1a16');
    Font.draw(g, 'ARE YOU SURE?', VW / 2, PY + 14, { scale: 2, color: '#ff9a8a', align: 'center', shadow: '#160c06' });
    const lines = Font.wrap(confirm.text.toUpperCase(), PW - 40, 1);
    lines.forEach((l, i) => Font.draw(g, l, VW / 2, PY + 46 + i * 11, { scale: 1, color: '#efe0c2', align: 'center' }));
    Font.draw(g, 'THIS CANNOT BE UNDONE', VW / 2, PY + 72, { scale: 1, color: '#b08078', align: 'center' });
    const by = PY + PH - 34;
    buttons.push({ id: 'yes', x: PX + 18, y: by, w: 140, h: 24, kind: 'confirm' });
    buttons.push({ id: 'no', x: PX + PW - 158, y: by, w: 140, h: 24, kind: 'confirm' });
    for (const [id, lab, col] of [['yes', 'ERASE IT', '#8a2f24'], ['no', 'KEEP IT', '#2a3a24']]) {
      const b = buttons.find((q) => q.id === id), hot = hover === id;
      g.fillStyle = hot ? U.shade(col, 0.4) : col; g.fillRect(b.x, b.y, b.w, b.h);
      g.fillStyle = 'rgba(255,255,255,0.16)'; g.fillRect(b.x, b.y, b.w, 2);
      g.strokeStyle = hot ? '#f5cd5c' : '#0a0810'; g.lineWidth = 1; g.strokeRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1);
      Font.draw(g, lab, b.x + b.w / 2, b.y + 8, { scale: 1, color: '#fff0dc', align: 'center' });
    }
  }

  // ---- title ---------------------------------------------------------------
  function title(g) {
    const y = 32 + Math.sin(t * 1.4) * 2;
    for (let i = 5; i > 0; i--) {
      Font.draw(g, 'WOMBAT GODS', VW / 2 + i * 0.6, y + i * 1.2, {
        scale: 4, align: 'center', color: `rgba(24,12,8,${(0.5 - i * 0.07).toFixed(2)})`,
      });
    }
    Font.draw(g, 'WOMBAT GODS', VW / 2, y, { scale: 4, align: 'center', color: '#f5cd5c', shadow: '#2a1608', shadowDist: 2 });
    Font.draw(g, 'THE GROVE IS DEAD. BRING IT BACK.', VW / 2, y + 34, { scale: 1, align: 'center', color: '#9ab08e' });
  }

  // ---- loop ---------------------------------------------------------------
  function update(dt) { t += dt; lanternT += dt; }
  function render(g) {
    scene(g);
    title(g);
    if (page === 'slots') drawSlots(g);
    else if (page === 'settings') drawSettings(g);
    else drawAbout(g);
    drawStatues(g, STATUES_FRONT);        // two big ones framing the whole thing
    if (confirm) drawConfirm(g);
  }

  // ---- input ---------------------------------------------------------------
  const inside = (b, x, y) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
  function hitAt(x, y) {
    for (const b of buttons) if (inside(b, x, y)) return b;
    if (!confirm) for (const c of cards) if (inside(c, x, y)) return c;
    return null;
  }
  function move(x, y) { const h = hitAt(x, y); hover = h ? h.id : null; }
  function press(x, y) {
    const h = hitAt(x, y);
    if (!h) { if (confirm) { confirm = null; Audio.play('click'); } return; }
    Audio.play('click');
    if (confirm) {
      if (h.id === 'yes') { confirm.go(); }
      confirm = null;
      return;
    }
    if (h.kind === 'del') {
      confirm = { text: `Grove ${h.n} and everything in it`, go: () => onStart({ erase: h.n }) };
      return;
    }
    if (h.kind === 'wipe') {
      confirm = { text: 'all three groves, every wombat, every god', go: () => onStart({ eraseAll: true }) };
      return;
    }
    if (h.kind === 'toggle') { onStart({ toggle: h.k }); return; }
    if (h.id === 'settings') { page = 'settings'; return; }
    if (h.id === 'about') { page = 'about'; return; }
    if (h.id === 'back') { page = 'slots'; return; }
    if (h.id && h.id.startsWith('slot')) { onStart({ play: h.n }); return; }
  }
  function key(k) {
    if (k === 'Escape') { if (confirm) confirm = null; else if (page !== 'slots') page = 'slots'; return true; }
    if (page === 'slots' && !confirm && (k === '1' || k === '2' || k === '3')) { onStart({ play: +k }); return true; }
    return false;
  }

  return { init, enter, update, render, press, move, key, setSlots, get page() { return page; } };
})();
