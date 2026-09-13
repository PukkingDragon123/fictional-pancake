// ---- The title screen -----------------------------------------------------
// The same wood the game is set in, at night: the grove's own tree art, mossed
// stone wombats, one lantern, and a wombat in the middle distance quietly
// leaving you a cube. Two doors out of here — ENTER and SETTINGS.
const Menu = (() => {
  const VW = 640, VH = 360;
  const HORIZON = 168;                  // where the canopy meets the floor

  let G = null;                         // the settings bag, not a save
  let t = 0, page = 'home', hover = null, confirm = null;
  let buttons = [];
  let onAct = null;
  let hasSave = false;

  const MIST = 'rgba(146,172,146,';

  // ---- the wood ------------------------------------------------------------
  // Five ranks of the grove's own trees, darkened further the deeper they sit.
  const R = Art.rng(90210);
  const RANKS = [
    { n: 7, y: 156, s: 1.0, sh: 0.44 },
    { n: 6, y: 180, s: 1.3, sh: 0.56 },
    { n: 5, y: 210, s: 1.7, sh: 0.7 },
    { n: 4, y: 252, s: 2.2, sh: 0.84 },
    { n: 3, y: 344, s: 3.2, sh: 0.93 },
  ];
  const KINDS = ['gnarl', 'oak', 'pine', 'birch', 'gnarl'];
  const wood = [];
  RANKS.forEach((rk, d) => {
    for (let i = 0; i < rk.n; i++) {
      wood.push({
        d, x: (i + 0.5) * (VW / rk.n) + (R() - 0.5) * (VW / rk.n) * 0.7,
        y: rk.y + (R() - 0.5) * 10, s: rk.s * (0.82 + R() * 0.34), sh: rk.sh,
        kind: KINDS[Math.floor(R() * KINDS.length)], v: Math.floor(R() * 6),
        sway: R() * TAU,
      });
    }
  });
  // Statues: four back in the wood, two big ones framing the frame.
  const STATUES_BACK = [
    { x: 64, y: 238, s: 0.62, turn: 1 }, { x: 232, y: 222, s: 0.46, turn: -1 },
    { x: 448, y: 224, s: 0.48, turn: 1 }, { x: 586, y: 242, s: 0.66, turn: -1 },
  ];
  const STATUES_FRONT = [
    { x: 20, y: 300, s: 0.95, turn: 1 }, { x: 614, y: 352, s: 1.3, turn: -1 },
  ];
  const motes = [];
  for (let i = 0; i < 44; i++) motes.push({ x: R() * VW, y: 110 + R() * 250, ph: R() * TAU, sp: 0.2 + R() * 0.5 });
  const eyes = [];
  for (let i = 0; i < 10; i++) eyes.push({ x: 24 + R() * (VW - 48), y: 150 + R() * 92, ph: R() * TAU, on: 0 });
  const ferns = [];
  for (let i = 0; i < 26; i++) ferns.push({ x: R() * VW, y: 262 + R() * 88, s: 0.5 + R() * 0.8, ph: R() * TAU });

  // ---- the wombat who is doing something about it -------------------------
  // A loop: trots in, squats, strains, drops a cube, trots off. The cube stays
  // where it fell until the next lap, so the clearing slowly fills up.
  const cubes = [];
  const wb = { x: 130, y: 338, dir: 1, state: 'walk', tx: 220, st: 0, anim: 0 };
  function wombatLoop(dt) {
    wb.anim += dt * 9;
    wb.st += dt;
    if (wb.state === 'walk') {
      const dx = wb.tx - wb.x;
      wb.dir = dx < 0 ? -1 : 1;
      wb.x += Math.sign(dx) * 24 * dt;
      if (Math.abs(dx) < 4) { wb.state = 'squat'; wb.st = 0; }
    } else if (wb.state === 'squat' && wb.st > 1.1) { wb.state = 'strain'; wb.st = 0; }
    else if (wb.state === 'strain' && wb.st > 1.3) {
      wb.state = 'drop'; wb.st = 0;
      cubes.push({ x: wb.x - wb.dir * 13, y: wb.y, z: 6, vz: -26, t: 0, sq: 0.5 });
      if (cubes.length > 5) cubes.shift();
    } else if (wb.state === 'drop' && wb.st > 0.7) {
      wb.state = 'walk'; wb.st = 0;
      wb.tx = 70 + R() * 180; wb.y = 328 + R() * 18;
    }
    for (const c of cubes) {
      c.t += dt;
      if (c.z > 0 || c.vz < 0) { c.vz += 180 * dt; c.z += c.vz * dt; if (c.z >= 0) { c.z = 0; c.vz = 0; c.sq = 0.4; } }
      c.sq = Math.max(0, c.sq - dt * 2.4);
    }
  }
  function drawWombat(g) {
    const pose = wb.state === 'walk' ? 'walk' : wb.state === 'drop' ? 'happy' : 'sit';
    const f = Math.floor(wb.anim);
    const s = 1.5;
    // a little effort while it works
    const push = wb.state === 'strain' ? Math.sin(t * 22) * 0.9 : 0;
    Sprites.shadow(g, wb.x, wb.y, pose, f, 'brown', wb.dir, 'adult', s);
    g.save();
    g.translate(push, 0);
    Sprites.blit(g, wb.x, wb.y, pose, f, 'brown', wb.dir, 'adult', s);
    g.restore();
    if (wb.state === 'strain') {
      const a = 0.4 + 0.4 * Math.sin(t * 14);
      Font.draw(g, '!', wb.x - wb.dir * 16, wb.y - 30, { scale: 1, color: `rgba(255,214,150,${a.toFixed(2)})`, align: 'center' });
      Font.draw(g, '!', wb.x - wb.dir * 21, wb.y - 26, { scale: 1, color: `rgba(255,214,150,${(a * 0.6).toFixed(2)})`, align: 'center' });
    }
    for (const c of cubes) {
      const sq = c.sq;
      g.save();
      g.translate(c.x, c.y + c.z);
      g.fillStyle = 'rgba(0,0,0,0.4)'; Art.ell(g, 0, 1, 8, 3);
      g.scale(1 + sq * 0.5, 1 - sq * 0.45);
      Sprites.drawCube(g, OFFERINGS.plain, 16, 16, {});
      g.restore();
      if (c.t < 0.4) {                                    // a puff where it landed
        const a = 1 - c.t / 0.4;
        g.fillStyle = `rgba(150,130,100,${(a * 0.5).toFixed(2)})`;
        Art.ell(g, c.x - 9, c.y + 1, 7 * (1 + c.t * 3), 3, g.fillStyle);
        Art.ell(g, c.x + 9, c.y + 1, 6 * (1 + c.t * 3), 3, g.fillStyle);
      }
    }
  }

  function init(settings, saved, act) { G = settings; hasSave = !!saved; onAct = act; }
  function setSave(v) { hasSave = !!v; }
  function enter() { t = 0; page = 'home'; confirm = null; hover = null; Audio.setMode('menu'); }

  // ---- a stone wombat ------------------------------------------------------
  function statue(g, s2) {
    const { x, y, s, turn } = s2;
    const S0 = '#0f1115', S1 = '#262b32', S2 = '#343a43', S3 = '#454c56';
    const lit = x < 330 ? 1 : -1;
    g.save();
    g.translate(x, y); g.scale(s * turn, s);
    Art.poly(g, [[-22, 0], [22, 0], [18, -12], [-18, -12]], S0);
    Art.poly(g, [[-20, -1], [20, -1], [16.5, -11], [-16.5, -11]], S1);
    Art.rect(g, -16.5, -11, 33, 2, S2);
    for (let i = -3; i <= 3; i++) Art.rect(g, i * 5, -10, 1, 9, S0);
    Art.ell(g, 0, -26, 19, 16, S0);
    Art.ell(g, 0, -27, 17.5, 14.5, S1);
    Art.ell(g, -6 * lit, -32, 9, 7, S2);
    Art.ell(g, -9 * lit, -35, 4.5, 3.4, S3);
    for (const lx of [-12, 10]) { Art.rect(g, lx, -14, 7, 14, S0); Art.rect(g, lx + 1, -13, 5, 13, S1); }
    Art.ell(g, 14, -34, 10.5, 9.5, S0);
    Art.ell(g, 14, -35, 9.5, 8.5, S1);
    Art.ell(g, 11, -38.5, 4.6, 3.6, S2);
    Art.ell(g, 9.5, -40, 2, 1.5, S3);
    Art.ell(g, 8.5, -42.5, 4, 3.8, S0); Art.ell(g, 8.5, -43, 2.9, 2.7, S2);
    Art.ell(g, 18.5, -42, 3.8, 3.6, S0); Art.ell(g, 19, -42, 1.8, 2.2, S1);
    Art.ell(g, 20, -31.5, 4.6, 3.8, S0); Art.ell(g, 20, -32.2, 3.8, 3.1, S2);
    Art.rect(g, 21.6, -33.2, 2, 1.4, S0);
    Art.ell(g, 12, -36.5, 1.7, 1.9, '#07080b');
    Art.ell(g, 17.6, -36, 1.5, 1.7, '#07080b');
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
      const away = s2.x < 214 ? -1 : 1;
      Art.poly(g, [[s2.x - 20 * s2.s, s2.y], [s2.x + 20 * s2.s, s2.y],
                   [s2.x + away * 56 * s2.s, s2.y + 13 * s2.s], [s2.x + away * 24 * s2.s, s2.y + 13 * s2.s]],
               'rgba(0,0,0,0.45)');
      statue(g, s2);
    }
  }

  // ---- the scene -----------------------------------------------------------
  const LX = 196, LY = 96;                              // the lantern
  function scene(g) {
    const flick = 0.82 + 0.18 * Math.sin(t * 9) + 0.06 * Math.sin(t * 23);
    const sky = g.createLinearGradient(0, 0, 0, HORIZON);
    sky.addColorStop(0, '#04060a'); sky.addColorStop(0.6, '#080e14'); sky.addColorStop(1, '#10181a');
    g.fillStyle = sky; g.fillRect(0, 0, VW, HORIZON);
    for (let i = 0; i < 30; i++) {
      const sx = (i * 173) % VW, sy = (i * 61) % 96;
      g.fillStyle = `rgba(180,206,232,${(0.1 + 0.18 * Math.abs(Math.sin(t * 0.7 + i))).toFixed(2)})`;
      g.fillRect(sx, sy, 1, 1);
    }
    const grd = g.createLinearGradient(0, HORIZON - 8, 0, VH);
    grd.addColorStop(0, '#172016'); grd.addColorStop(0.5, '#101810'); grd.addColorStop(1, '#070b08');
    g.fillStyle = grd; g.fillRect(0, HORIZON - 8, VW, VH - HORIZON + 8);

    // the wood, back to front, using the grove's own trees
    for (let d = 0; d < RANKS.length; d++) {
      for (const tr of wood) {
        if (tr.d !== d) continue;
        const img = Props.get('tree', `${tr.kind}|${tr.v}|${tr.sh.toFixed(2)}`);
        const w = img.width * tr.s, h = img.height * tr.s;
        const sway = Math.sin(t * 0.4 + tr.sway) * (1.4 - d * 0.2);
        g.drawImage(img, Math.round(tr.x - w / 2 + sway), Math.round(tr.y - h), Math.round(w), Math.round(h));
      }
      if (d === 1) {
        for (const e of eyes) {
          e.on = Math.sin(t * 0.7 + e.ph) > 0.955 ? 1 : e.on * 0.9;
          if (e.on < 0.05) continue;
          g.fillStyle = `rgba(240,196,120,${(e.on * 0.9).toFixed(2)})`;
          g.fillRect(e.x, e.y, 2, 2); g.fillRect(e.x + 5, e.y, 2, 2);
        }
      }
      if (d === 1) drawStatues(g, STATUES_BACK);

    }
    // ferns along the floor
    for (const f of ferns) {
      const sw = Math.sin(t * 0.9 + f.ph) * 1.4;
      for (let b = -2; b <= 2; b++) {
        Art.limb(g, f.x, f.y, f.x + b * 8 * f.s + sw, f.y - 13 * f.s - Math.abs(b) * 1.5, 2.6 * f.s, 0.8,
                 b % 2 ? '#16301a' : '#1e3f21');
      }
    }
    // moss hanging out of the canopy, moving just enough to be noticed
    for (let i = 0; i < 9; i++) {
      const hx = 30 + ((i * 137) % (VW - 60));
      const hl = 30 + ((i * 53) % 70);
      const sw2 = Math.sin(t * 0.6 + i) * 3;
      for (let k = 0; k < hl; k += 3) {
        const a = 1 - k / hl;
        g.fillStyle = `rgba(46,70,48,${(0.5 * a).toFixed(2)})`;
        g.fillRect(Math.round(hx + sw2 * (k / hl)), 96 + k, 2, 3);
      }
    }
    // mist lying between the trunks
    for (let i = 0; i < 7; i++) {
      const mx = ((i * 130 + t * 5) % (VW + 300)) - 150;
      const a = 0.05 + 0.035 * Math.sin(t * 0.4 + i);
      const mg = g.createLinearGradient(0, HORIZON - 30, 0, HORIZON + 70);
      mg.addColorStop(0, MIST + '0)'); mg.addColorStop(0.55, MIST + a.toFixed(3) + ')'); mg.addColorStop(1, MIST + '0)');
      g.fillStyle = mg; g.fillRect(mx, HORIZON - 30, 210, 104);
    }
    g.save();                                   // warm light thrown onto the wood
    g.globalCompositeOperation = 'screen';
    const moon = g.createRadialGradient(VW * 0.82, 10, 10, VW * 0.82, 10, 320);   // cold moonlight, upper right
    moon.addColorStop(0, 'rgba(128,168,214,0.3)');
    moon.addColorStop(0.5, 'rgba(90,124,170,0.09)');
    moon.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = moon; g.fillRect(0, 0, VW, VH);
    const warm = g.createRadialGradient(LX, LY + 30, 8, LX, LY + 30, 250 * flick);
    warm.addColorStop(0, 'rgba(255,206,130,0.5)');
    warm.addColorStop(0.4, 'rgba(210,150,80,0.2)');
    warm.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = warm; g.fillRect(0, 0, VW, VH);
    g.restore();
    lantern(g, flick);
    wombatShadowPass(g); drawWombat(g);
    for (const m of motes) {
      const mx = m.x + Math.sin(t * m.sp + m.ph) * 22;
      const my = m.y - ((t * 10 * m.sp) % 250);
      const d2 = Math.hypot(mx - LX, my - LY);
      const a = U.clamp(1 - d2 / 240, 0, 1) * (0.3 + 0.5 * (Math.sin(t * 2 + m.ph) * 0.5 + 0.5));
      if (a < 0.02) continue;
      g.fillStyle = `rgba(255,214,150,${a.toFixed(2)})`;
      g.fillRect(Math.round(mx), Math.round(my), 1, 1);
    }
    g.save();
    g.globalCompositeOperation = 'soft-light';
    g.fillStyle = '#14305a'; g.globalAlpha = 0.44; g.fillRect(0, 0, VW, VH);
    g.restore();
    g.fillStyle = 'rgba(6,10,14,0.14)'; g.fillRect(0, 0, VW, VH);     // the night on top of it all
    const vg = g.createRadialGradient(LX, VH * 0.4, VH * 0.16, VW / 2, VH * 0.5, VH * 1.08);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(0.55, 'rgba(0,0,0,0.28)'); vg.addColorStop(1, 'rgba(0,0,0,0.86)');
    g.fillStyle = vg; g.fillRect(0, 0, VW, VH);
  }
  function wombatShadowPass(g) {
    for (const c of cubes) { g.fillStyle = 'rgba(0,0,0,0.35)'; Art.ell(g, c.x, c.y + 2, 9, 3); }
  }
  function lantern(g, flick) {
    const glow = g.createRadialGradient(LX, LY + 10, 6, LX, LY + 10, 230 * flick);
    glow.addColorStop(0, `rgba(255,216,140,${(0.36 * flick).toFixed(2)})`);
    glow.addColorStop(0.45, 'rgba(240,170,90,0.1)');
    glow.addColorStop(1, 'rgba(240,170,90,0)');
    g.fillStyle = glow; g.fillRect(LX - 240, LY - 200, 480, 460);
    g.fillStyle = '#1a1410'; g.fillRect(LX - 1, 0, 2, LY - 14);
    for (let i = 0; i < 5; i++) { g.fillStyle = '#4a4038'; g.fillRect(LX - 2, 10 + i * 22, 4, 3); }
    g.fillStyle = '#0c0a08'; g.fillRect(LX - 9, LY - 15, 18, 4);
    g.fillStyle = '#57493a'; g.fillRect(LX - 8, LY - 14, 16, 2);
    g.fillStyle = '#0c0a08'; g.fillRect(LX - 8, LY - 11, 16, 22);
    g.fillStyle = `rgba(255,226,164,${(0.9 * flick).toFixed(2)})`; g.fillRect(LX - 6, LY - 9, 12, 18);
    g.fillStyle = '#fff6dc'; Art.ell(g, LX, LY + 1, 3, 5.4);
    g.fillStyle = '#0c0a08';
    g.fillRect(LX - 8, LY - 1, 16, 1); g.fillRect(LX - 1, LY - 11, 2, 22);
    g.fillRect(LX - 9, LY + 11, 18, 4);
    g.fillStyle = '#57493a'; g.fillRect(LX - 8, LY + 12, 16, 2);
  }

  // ---- plates --------------------------------------------------------------
  function plaque(g, x, y, w, h, hot, tone) {
    g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(x + 3, y + 4, w, h);
    g.fillStyle = '#0a0810'; g.fillRect(x, y, w, h);
    g.fillStyle = tone || '#3f2a18'; g.fillRect(x + 2, y + 2, w - 4, h - 4);
    Tex.fill(g, 'darkwood', x + 2, y + 2, w - 4, h - 4, 0.7);
    g.fillStyle = hot ? 'rgba(255,216,140,0.24)' : 'rgba(255,226,180,0.08)';
    g.fillRect(x + 2, y + 2, w - 4, 2);
    g.fillStyle = 'rgba(0,0,0,0.36)'; g.fillRect(x + 2, y + h - 6, w - 4, 4);
    g.strokeStyle = hot ? '#f5cd5c' : '#241a12'; g.lineWidth = 1;
    g.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);
    for (const nx of [x + 7, x + w - 8]) {
      g.fillStyle = '#1a1218'; g.fillRect(nx - 1, y + 6, 3, 3);
      g.fillStyle = '#7f7688'; g.fillRect(nx - 1, y + 6, 2, 2);
    }
  }
  function bigButton(g, b, label, sub, scale) {
    const hot = hover === b.id;
    const lift = hot ? -2 : 0;
    plaque(g, b.x, b.y + lift, b.w, b.h, hot, hot ? '#513club'.slice(0, 7) : '#3f2a18');
    const cy = b.y + lift + (sub ? 10 : (b.h - (scale || 2) * 7) / 2);
    Font.draw(g, label, b.x + b.w / 2, cy, {
      scale: scale || 2, color: hot ? '#ffe9a8' : '#e0c88e', align: 'center', shadow: '#160c06', shadowDist: 2,
    });
    if (sub) Font.draw(g, sub, b.x + b.w / 2, cy + (scale || 2) * 7 + 5, { scale: 1, color: hot ? '#c9b68a' : '#8d7f66', align: 'center' });
    if (hot) {                                            // two lantern-lit ticks
      Font.draw(g, '>', b.x + 10, cy + ((scale || 2) - 1) * 3, { scale: scale || 2, color: '#f5cd5c' });
      Font.draw(g, '<', b.x + b.w - 10 - Font.width('<', scale || 2), cy + ((scale || 2) - 1) * 3, { scale: scale || 2, color: '#f5cd5c' });
    }
  }

  function drawHome(g) {
    buttons = [];
    const BW = 236, BX = (VW - BW) / 2;
    buttons.push({ id: 'enter', x: BX, y: 232, w: BW, h: 46 });
    buttons.push({ id: 'settings', x: BX, y: 288, w: BW, h: 32 });
    bigButton(g, buttons[0], hasSave ? 'ENTER THE GROVE' : 'ENTER THE GROVE', hasSave ? 'CONTINUE WHERE YOU LEFT OFF' : 'A NEW WOOD, A NEW WOMBAT', 2);
    bigButton(g, buttons[1], 'SETTINGS', null, 2);
  }

  const SETTINGS = [
    { key: 'muted', name: 'SOUND', on: 'ON', off: 'MUTED', inv: true },
    { key: 'musicOff', name: 'MUSIC', on: 'ON', off: 'OFF', inv: true },
    { key: 'shake', name: 'SCREEN SHAKE', on: 'ON', off: 'OFF' },
    { key: 'bigText', name: 'BIG TEXT', on: 'ON', off: 'OFF' },
  ];
  function drawSettings(g) {
    buttons = [];
    const PW = 420, PX = (VW - PW) / 2, PY = 84, PH = 216;
    plaque(g, PX, PY, PW, PH, false);
    Font.draw(g, 'SETTINGS', VW / 2, PY + 12, { scale: 2, color: '#f5cd5c', align: 'center', shadow: '#160c06' });
    SETTINGS.forEach((s2, i) => {
      const ry = PY + 42 + i * 30;
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
    const dy = PY + PH - 42;
    buttons.push({ id: 'wipe', x: PX + 14, y: dy, w: PW - 28, h: 28, kind: 'wipe' });
    const wh = hover === 'wipe';
    g.fillStyle = wh ? '#8a2f24' : '#2a1a16'; g.fillRect(PX + 14, dy, PW - 28, 28);
    g.strokeStyle = wh ? '#e07a6a' : '#4a3028'; g.lineWidth = 1; g.strokeRect(PX + 14.5, dy + 0.5, PW - 29, 27);
    Font.draw(g, 'RESET ALL DATA', VW / 2, dy + 6, { scale: 1, color: wh ? '#ffd9cf' : '#9a7a70', align: 'center' });
    Font.draw(g, hasSave ? 'ERASES YOUR GROVE AND STARTS OVER' : 'NOTHING SAVED YET', VW / 2, dy + 17, {
      scale: 1, color: wh ? '#e0a89c' : '#6a534c', align: 'center',
    });
    backButton(g);
  }
  function backButton(g) {
    const b = { id: 'back', x: VW / 2 - 70, y: 316, w: 140, h: 28 };
    buttons.push(b);
    bigButton(g, b, 'BACK', null, 2);
  }

  function drawConfirm(g) {
    g.fillStyle = 'rgba(6,4,10,0.74)'; g.fillRect(0, 0, VW, VH);
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

  function title(g) {
    const y = 34 + Math.sin(t * 1.4) * 2;
    for (let i = 5; i > 0; i--) {
      Font.draw(g, 'WOMBAT GODS', VW / 2 + i * 0.6, y + i * 1.2, {
        scale: 4, align: 'center', color: `rgba(24,12,8,${(0.5 - i * 0.07).toFixed(2)})`,
      });
    }
    Font.draw(g, 'WOMBAT GODS', VW / 2, y, { scale: 4, align: 'center', color: '#f5cd5c', shadow: '#2a1608', shadowDist: 2 });
    Font.draw(g, 'THE GROVE IS DEAD. BRING IT BACK.', VW / 2, y + 34, { scale: 1, align: 'center', color: '#8fa886' });
  }

  function update(dt) { t += dt; wombatLoop(dt); }
  function render(g) {
    scene(g);
    title(g);
    if (page === 'home') drawHome(g);
    else drawSettings(g);
    drawStatues(g, STATUES_FRONT);
    if (confirm) drawConfirm(g);
  }

  const inside = (b, x, y) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
  function hitAt(x, y) { for (const b of buttons) if (inside(b, x, y)) return b; return null; }
  function move(x, y) { const h = hitAt(x, y); hover = h ? h.id : null; }
  function press(x, y) {
    const h = hitAt(x, y);
    if (!h) { if (confirm) { confirm = null; Audio.play('click'); } return; }
    Audio.play('click');
    if (confirm) { if (h.id === 'yes') confirm.go(); confirm = null; return; }
    if (h.kind === 'toggle') { onAct({ toggle: h.k }); return; }
    if (h.kind === 'wipe') {
      confirm = { text: 'your grove, every wombat and every god', go: () => onAct({ wipe: true }) };
      return;
    }
    if (h.id === 'settings') { page = 'settings'; return; }
    if (h.id === 'back') { page = 'home'; return; }
    if (h.id === 'enter') onAct({ play: true });
  }
  function key(k) {
    if (k === 'Escape') { if (confirm) confirm = null; else if (page !== 'home') page = 'home'; return true; }
    if (page === 'home' && !confirm && (k === 'Enter' || k === ' ')) { onAct({ play: true }); return true; }
    return false;
  }

  return { init, enter, update, render, press, move, key, setSave, get page() { return page; } };
})();
