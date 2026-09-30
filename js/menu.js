// ---- The title screen -----------------------------------------------------
// The farm car driving through the forest on a sunny afternoon, with a wombat
// looking out of the window. The trees, the fence, the signposts and the odd
// shop go past at their own speeds while you decide what to do.
const Menu = (() => {
  const VW = 640, VH = 360;
  const HORIZON = 238, ROAD = 300;

  let G = null;                         // the settings bag, not a save
  let t = 0, page = 'home', hover = null, confirm = null;
  let buttons = [];
  let onAct = null;
  let hasSave = false;

  function init(settings, saved, act) { G = settings; hasSave = !!saved; onAct = act; }
  function setSave(v) { hasSave = !!v; }
  function enter() { t = 0; page = 'home'; confirm = null; hover = null; rumour = Math.floor(Math.random() * RUMOURS.length); Audio.setMode('menu'); }

  // ---- the kit -----------------------------------------------------------
  // The same interface the rest of the game wears, drawn on the canvas: a
  // tan parchment page held in a cover of dark oiled wood, teal iron brackets
  // bolted over the corners, a red ribbon down one edge, wood plank banners
  // for the headings and beaten gold for anything you can press. Corners are
  // cut in one step, never curved.
  // The same warm wood and sage-green iron the rest of the interface wears.
  const KIT = {
    ink: '#1a110b',
    t0: '#241509', t1: '#3f2712', t2: '#6a4020', t3: '#a46b36', t4: '#c68c4c',
    i0: '#8a5a0a', i1: '#c89418', i2: '#e0b02a', i3: '#f2c536', i4: '#ffe680',
    p0: '#9c7f4e', p1: '#c09b62', p2: '#edd3a2', p3: '#f6e4ba', p4: '#fffae8',
    g0: '#7a4c06', g1: '#bd8410', g2: '#efb625', g3: '#ffd95c', g4: '#fff3b8',
    d0: '#1e3a1c', d2: '#4a8a3e', d3: '#6fb85a', d4: '#a8e08a',
    rib: '#d84428', rib0: '#902418',
  };
  // a box with one step cut out of each corner
  function cut(g, x, y, w, h, col, c = 3) {
    Art.rect(g, x + c, y, w - c * 2, h, col);
    Art.rect(g, x, y + c, w, h - c * 2, col);
  }
  // the page: a wooden cover, a parchment leaf inside it, four iron brackets
  // bolted over the corners and a ribbon hanging out of the top
  function board(g, x, y, w, h) { Kit.card(g, x, y, w, h, { r: 10 }); }
  // the heading: a plank of dark wood with an iron cap hammered on each end
  function plate(g, x, y, w, h, text, scale = 2) { Kit.tab(g, x, y, w, h, text, { scale: Math.min(scale, 2) }); }
  // the name of the game, on the biggest plate there is

  // ---- gold-cornered frames ------------------------------------------------
  // The frame every panel, slot and button on the title uses: one dark line,
  // a gold border lit along the top and shaded along the bottom, a warm brown
  // inside, and a small gold scroll curled into each corner.
  const GF = { ink: '#1a100a', g0: '#8a5a0a', g1: '#c89418', g2: '#f2c536', g3: '#ffe680',
    b0: '#4a2a14', b1: '#6a3e1e', b2: '#84522a', b3: '#9c6636' };
  function curl(g, x, y, sx, sy) {
    // a 6x6 scroll, mirrored into whichever corner it sits in
    const px = (a, b, w, h, c) => Art.rect(g, sx > 0 ? x + a : x - a - w, sy > 0 ? y + b : y - b - h, w, h, c);
    px(-1, -1, 8, 3, GF.ink); px(-1, -1, 3, 8, GF.ink); px(3, 3, 4, 4, GF.ink);
    px(0, 0, 6, 1, GF.g3); px(0, 0, 1, 6, GF.g3); px(1, 1, 5, 1, GF.g2); px(1, 1, 1, 5, GF.g2);
    px(4, 4, 2, 2, GF.g2); px(4, 4, 1, 1, GF.g3); px(2, 2, 1, 1, GF.g1);
  }
  function goldFrame(g, x, y, w, h, o = {}) {
    Kit.card(g, x, y, w, h, { fill: o.fill && o.fill !== GF.b1 ? o.fill : Kit.C.paper, ring: o.hot ? Kit.C.mint : null, r: o.r });
  }
  function goldButton(g, b, label, sub, kind) {
    Kit.button(g, b, label, sub, { hot: hover === b.id, kind: kind || (b.id === 'enter' ? 'mint' : 'paper') });
  }

  // ---- the forest going past -----------------------------------------------
  const BIRDS = [];
  (() => { const r = Art.rng(606); for (let i = 0; i < 6; i++) BIRDS.push({ x: r() * VW, y: 30 + r() * 80, sp: 14 + r() * 20, ph: r() * TAU, s: 0.7 + r() * 0.5 }); })();
  // Along the verge, every so often: a signpost, a letterbox, and once a lap
  // the corner shop itself.
  const LAP = 2600;
  const VERGE = [
    { at: 160, kind: 'sign', text: 'WOMBAT FARM', sub: '3 km' },
    { at: 700, kind: 'mart' },
    { at: 1250, kind: 'box' },
    { at: 1650, kind: 'sign', text: "GROOT'S CELLAR", sub: 'seed & saplings' },
    { at: 2150, kind: 'sign', text: 'SLOW', sub: 'wombats crossing' },
  ];
  const wrap = (v, span) => ((v % span) + span) % span;

  function bird(g, b) {
    const x = wrap(b.x - t * b.sp, VW + 60) - 30, y = b.y + Math.sin(t * 0.8 + b.ph) * 8;
    const flap = Math.sin(t * 9 + b.ph), w = 5 * b.s, up = flap * 3 * b.s;
    g.fillStyle = '#3a3440';
    g.fillRect(Math.round(x - w), Math.round(y - up), Math.round(w), 1);
    g.fillRect(Math.round(x), Math.round(y - up), Math.round(w), 1);
    g.fillRect(Math.round(x - 1), Math.round(y), 2, 1);
  }


  function vergeThing(g, v, x) {
    const y = ROAD - 4;
    if (v.kind === 'sign') {
      const w = Math.max(Font.width(v.text, 1), Font.width(v.sub, 1)) + 16;
      Art.rect(g, x - 2, y - 44, 5, 46, GF.ink); Art.rect(g, x - 1, y - 44, 3, 46, '#8a5a34');
      cut(g, x - w / 2 - 2, y - 72, w + 4, 30, GF.ink, 3);
      cut(g, x - w / 2, y - 70, w, 26, '#2f7a3e', 2);
      Art.rect(g, x - w / 2 + 2, y - 70, w - 4, 2, '#4fa45a');
      Font.draw(g, v.text, x, y - 66, { scale: 1, color: '#ffffff', align: 'center' });
      Font.draw(g, v.sub, x, y - 55, { scale: 1, color: '#c8f0cc', align: 'center' });
    } else if (v.kind === 'box') {
      Art.rect(g, x - 2, y - 28, 4, 30, GF.ink); Art.rect(g, x - 1, y - 28, 2, 30, '#8a5a34');
      cut(g, x - 10, y - 40, 20, 14, GF.ink, 2); cut(g, x - 9, y - 39, 18, 12, '#c8584a', 2);
      Art.rect(g, x + 8, y - 44, 2, 8, GF.ink); Art.rect(g, x + 10, y - 44, 5, 4, '#ffd95c');
    } else if (v.kind === 'mart' && typeof Scenery !== 'undefined') {
      const b = Scenery.building('mart');
      g.drawImage(b.img, Math.round(x - b.w / 2), Math.round(ROAD + 2 - b.h));
      // Mr Biscuit minds the shop: he stands at the mart's door and waves as you go by
      if (typeof Sprites !== 'undefined') {
        Sprites.setFace('happy');
        const px = Math.round(x + b.w / 2 + 14), near = Math.abs(px - VW * 0.42) < 170;
        const img = Sprites.jim(Math.floor(t * 6), near ? 'wave' : 'idle');
        g.fillStyle = 'rgba(30,40,20,0.3)'; Art.ell(g, px, ROAD + 1, 14, 3);
        g.drawImage(img, px - 26, ROAD + 1 - 81);
      }
    } else if (v.kind === 'mart') {
      // the corner shop, set back from the road: cream walls, a stripy awning
      const w = 150, h = 74, x0 = x - w / 2, y0 = y - h - 6;
      Art.rect(g, x0 - 2, y0 - 2, w + 4, h + 4, GF.ink);
      Art.rect(g, x0, y0, w, h, '#f2e6cc');
      Art.rect(g, x0, y0, w, 3, '#fff6e0');
      for (let i = 0; i < 10; i++) Art.rect(g, x0 + i * 15, y0 + 18, 15, 10, i % 2 ? '#fff4e0' : '#e0583c');
      Art.rect(g, x0, y0 + 28, w, 2, '#b8422c');
      cut(g, x0 + 20, y0 + 3, w - 40, 14, '#c0302c', 2);
      Font.draw(g, 'WOMBAT MART', x, y0 + 7, { scale: 1, color: '#fff6dc', align: 'center' });
      for (const wx of [x0 + 10, x0 + w - 52]) { Art.rect(g, wx, y0 + 36, 42, 26, GF.ink); Art.rect(g, wx + 2, y0 + 38, 38, 22, '#9fd8f0'); Art.rect(g, wx + 4, y0 + 40, 10, 3, '#e8f8ff'); }
      Art.rect(g, x - 11, y0 + 36, 22, h - 36, GF.ink); Art.rect(g, x - 9, y0 + 38, 18, h - 38, '#6a8ab0');
      Art.rect(g, x0 - 6, y0 - 4, w + 12, 4, GF.ink); Art.rect(g, x0 - 4, y0 - 3, w + 8, 2, '#c8584a');
    }
  }

  function scene(g) {
    const sp = t * 90;
    // the country, painted once and sliding past; the signs and the shop on the verge
    Scenery.paint(g, sp, {
      road: ROAD, t,
      between: (g2) => {
        for (const v of VERGE) {
          const x = wrap(v.at - sp, LAP) - 200;
          if (x > -200 && x < VW + 200) vergeThing(g2, v, x);
        }
      },
    });
    for (const b of BIRDS) bird(g, b);
    // ---- the car, with a wombat looking out of the window ------------------
    const img = Art.flip(Props.get('truck'));
    const tw = img.width * 1.35, th = img.height * 1.35;
    const tx = 200 + Math.sin(t * 0.5) * 14, ty = 334 + Math.abs(Math.sin(t * 8)) * 2;
    for (let i = 0; i < 9; i++) {                                // dust off the back wheels
      const e = ((t * 1.4 + i * 0.11) % 1);
      const a = (1 - e) * 0.4;
      Art.ell(g, tx - tw / 2 - 4 - e * 80, ty - 4 - e * 14, 5 + e * 12, 3 + e * 8, `rgba(226,200,160,${a.toFixed(2)})`);
    }
    Art.castShadow(g, img, tx, ty + 8, tw, th, { alpha: 0.3, lean: 0.3, squash: 0.14 });
    g.drawImage(img, Math.round(tx - tw / 2), Math.round(ty - th + 10), Math.round(tw), Math.round(th));
    const wf = Math.floor(t * 6);
    // she rides in the back seat, head out of the window, clipped to the glass
    const wy = ty - th + 10;
    g.save(); g.beginPath(); g.rect(tx - tw * 0.36, wy + th * 0.14, tw * 0.62, th * 0.25); g.clip();
    Sprites.blit(g, tx - tw * 0.08, wy + th * 0.44 + Math.abs(Math.sin(t * 8)), 'idle', wf, 'brown', 1, 'adult', 0.95);
    g.restore();
  }

  // ---- the home page ---------------------------------------------------------
  // The name on a gold-cornered board, and three buttons down the right.
  // the name, one letter at a time on a wave: a dark outline, a two-tone fill, a glint
  function logo(g, text, cx, y, sc, top, low, line, ph) {
    const W = Font.width(text, sc);
    let x = cx - W / 2;
    [...text].forEach((ch, i) => {
      const yy = Math.round(y + Math.sin(t * 2.2 - i * 0.55 + ph) * 2);
      const cw = Font.width(ch, sc);
      for (const [ox, oy] of [[-2, 0], [2, 0], [0, -2], [0, 2], [-1, -1], [1, -1], [-1, 1], [1, 1], [2, 2], [0, 4], [2, 4], [1, 4], [-1, 3], [3, 3]])
        Font.draw(g, ch, x + ox, yy + oy, { scale: sc, color: line });
      Font.draw(g, ch, x, yy, { scale: sc, color: top });
      g.save(); g.beginPath(); g.rect(x - 2, yy + Math.round(sc * 3.6), cw + 4, sc * 5); g.clip();
      Font.draw(g, ch, x, yy, { scale: sc, color: low }); g.restore();
      g.fillStyle = 'rgba(255,255,255,0.85)'; g.fillRect(Math.round(x), yy, sc - 1, sc - 1);
      x += Font.width(text.slice(0, i + 1), sc) - Font.width(text.slice(0, i), sc);
    });
  }
  // a chunky button: a dark line, a coloured face lit on top and shaded underneath,
  // an icon on its own darker plate, and the words beside it. It lifts under the pointer.
  // ---- the title screen's own pixel pieces ----------------------------------------------------
  const RR = (g, x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
  const WAL = ['#2a1c12', '#45301d', '#62452b', '#7a5838', '#9a7650'];
  const LIN = ['#b8a882', '#d8cbae', '#ece3cf', '#f6f0e2'];
  // a walnut plank: a dark line, grain, a lit top edge and brass nails at the ends
  function plank(g, x, y, w, h, o = {}) {
    RR(g, x + 1, y, w - 2, h, WAL[0]); RR(g, x, y + 1, w, h - 2, WAL[0]);
    RR(g, x + 1, y + 1, w - 2, h - 2, o.col || WAL[2]);
    RR(g, x + 1, y + 1, w - 2, 1, WAL[4]); RR(g, x + 1, y + h - 3, w - 2, 2, WAL[1]);
    const r = Art.rng(Math.round(x * 7 + y * 13));
    for (let i = 0; i < w / 5; i++) RR(g, x + 3 + r() * (w - 10), y + 3 + Math.floor(r() * (h - 7)), 3 + r() * 8, 1, r() < 0.5 ? WAL[1] : WAL[3]);
    if (!o.noNails) for (const nx of [x + 4, x + w - 6]) for (const ny of h > 30 ? [y + 4, y + h - 7] : [y + (h - 2) / 2 - 1]) { RR(g, nx, ny, 2, 2, '#e6c887'); RR(g, nx + 1, ny + 1, 1, 1, '#8a6a2e'); }
  }
  // the three menu icons, drawn by hand at 20 x 20
  function menuIcon(g, kind, x, y, hot) {
    const R = (xx, yy, w, h, c) => RR(g, x + xx, y + yy, w, h, c);
    const E = (xx, yy, rx, ry, c) => Art.ell(g, x + xx, y + yy, rx, ry, c);
    if (kind === 'wombat') {                       // a wombat face, looking at you
      E(4, 5, 3.4, 3, '#2a1c12'); E(16, 5, 3.4, 3, '#2a1c12'); E(4, 5, 2.4, 2, '#8a6242'); E(16, 5, 2.4, 2, '#8a6242'); E(4, 5.5, 1.2, 1, '#c89a8a'); E(16, 5.5, 1.2, 1, '#c89a8a');
      E(10, 11, 9, 8, '#2a1c12'); E(10, 11, 8, 7, '#8a6242'); E(8, 8, 4, 3, '#a47a56');
      E(10, 14, 4.6, 3.4, '#2a1c12'); E(10, 13.6, 3.8, 2.6, '#3a2a22'); R(8, 12, 2, 1, '#6a5a50');
      for (const ex of [5, 14]) { R(ex, 9, 2, 2, '#140e0b'); R(ex, 9, 1, 1, '#fffaf0'); }
      if (hot) { R(3, 13, 2, 1, '#c07a64'); R(15, 13, 2, 1, '#c07a64'); }
    } else if (kind === 'gear') {                  // a brass cog
      const a0 = t * (hot ? 2 : 0.4);
      for (let i = 0; i < 8; i++) { const a = a0 + (i / 8) * TAU; E(10 + Math.cos(a) * 7.5, 10 + Math.sin(a) * 7.5, 2.2, 2.2, '#2a1c12'); }
      E(10, 10, 7.4, 7.4, '#2a1c12');
      for (let i = 0; i < 8; i++) { const a = a0 + (i / 8) * TAU; E(10 + Math.cos(a) * 7.5, 10 + Math.sin(a) * 7.5, 1.4, 1.4, '#a88440'); }
      E(10, 10, 6.4, 6.4, '#a88440'); E(9, 9, 5, 5, '#c9a256'); E(8, 7.5, 2.4, 1.6, '#e6c887');
      E(10, 10, 2.6, 2.6, '#2a1c12'); E(10, 10, 1.6, 1.6, '#62452b');
    } else if (kind === 'book') {                  // an open book, the farmer's almanac
      R(1, 4, 18, 13, '#2a1c12'); R(2, 5, 7, 11, '#ece3cf'); R(11, 5, 7, 11, '#f6f0e2');
      R(9, 4, 2, 14, '#2a1c12'); R(2, 16, 16, 2, '#8e3a34'); R(1, 17, 18, 1, '#2a1c12');
      for (let i = 0; i < 4; i++) { R(3, 7 + i * 2, 5, 1, '#b8a882'); R(12, 7 + i * 2, i === 3 ? 3 : 5, 1, '#b8a882'); }
      R(14, 2, 2, 6, '#8e3a34'); R(14, 8, 1, 1, '#8e3a34'); R(15, 8, 1, 1, '#2a1c12');
    }
  }
  function menuButton(g, b, label, sub, icon, kind) {
    const hot = hover === b.id, go = kind === 'go';
    const lift = hot ? -1 : 0, x = b.x + (hot ? 3 : 0), y = b.y + lift, w = b.w, h = b.h;
    RR(g, x + 2, b.y + 4, w, h, 'rgba(20,12,6,0.4)');                          // its shadow
    // a linen card on a walnut edge; the first one is a moss-green board
    RR(g, x + 1, y, w - 2, h, WAL[0]); RR(g, x, y + 1, w, h - 2, WAL[0]);
    const face = go ? (hot ? '#6e8e4a' : '#56743a') : hot ? LIN[3] : LIN[2];
    RR(g, x + 1, y + 1, w - 2, h - 2, go ? '#3a5226' : LIN[0]);
    RR(g, x + 2, y + 2, w - 4, h - 5, face);
    RR(g, x + 2, y + 2, w - 4, 1, go ? '#8aa868' : '#fffaf0');
    // the icon, in a sunk brass-rimmed window
    const ps = Math.min(h - 8, 30), ix = x + 5, iy = y + (h - 3 - ps) / 2;
    RR(g, ix, iy, ps, ps, WAL[0]); RR(g, ix + 1, iy + 1, ps - 2, ps - 2, hot ? '#e6c887' : '#c9a256');
    RR(g, ix + 2, iy + 2, ps - 4, ps - 4, go ? '#dfe6cc' : '#e2d7bf'); RR(g, ix + 2, iy + 2, ps - 4, 1, go ? '#b8c89a' : '#c7b894');
    menuIcon(g, icon, ix + (ps - 20) / 2, iy + (ps - 20) / 2 + (hot ? Math.round(Math.sin(t * 10)) : 0), hot);
    // the words
    const tx = ix + ps + (w - ps - 12) / 2 + 3, sc = 2;
    const ty = y + (sub ? 6 : Math.round((h - 3 - sc * 6) / 2));
    const ink = go ? '#f6f0e2' : '#2e241a';
    if (go) Font.draw(g, label, tx + 1, ty + 1, { scale: sc, color: '#1f2a12', align: 'center' });
    Font.draw(g, label, tx, ty, { scale: sc, color: ink, align: 'center' });
    if (sub) Font.draw(g, sub, tx, ty + sc * 6 + 5, { scale: 1, color: go ? '#dfe6cc' : '#6e5e48', align: 'center' });
    if (hot) {                                                                   // a little arrow nudging in
      const ax = x - 9 + Math.round(Math.sin(t * 8)), ay = y + h / 2 - 4;
      for (let i = 0; i < 4; i++) RR(g, ax + i, ay + i, 1, 8 - i * 2, '#2a1c12');
      for (let i = 0; i < 3; i++) RR(g, ax + i, ay + i + 1, 1, 6 - i * 2, '#e6c887');
    }
  }
  function drawHome(g) {
    buttons = [];
    // the name, carved into a walnut sign hung from two ropes
    const LX = 214, sway = Math.sin(t * 0.9) * 0.6;
    for (const rx of [LX - 110, LX + 110]) { RR(g, rx, 0, 2, 16, '#c8b48a'); RR(g, rx + 1, 0, 1, 16, '#8a7454'); }
    plank(g, LX - 132 + sway, 12, 264, 96);
    RR(g, LX - 126 + sway, 18, 252, 84, WAL[1]); RR(g, LX - 125 + sway, 19, 250, 82, WAL[2]);
    for (let i = 0; i < 12; i++) RR(g, LX - 120 + sway + ((i * 53) % 240), 24 + ((i * 29) % 72), 6 + (i % 4) * 5, 1, i % 2 ? WAL[1] : WAL[3]);
    logo(g, 'WOMBAT', LX + sway, 24, 5, '#efe0b8', '#c9a256', '#1f150e', 0);
    logo(g, 'FARM', LX + sway, 64, 5, '#b8c89a', '#6e8a4e', '#141c0c', 1.6);
    const sub = 'a cozy little farm in the bush', sw = Font.width(sub, 1) + 22;
    RR(g, LX - sw / 2 + 12, 104, 1, 8, '#8a7454'); RR(g, LX + sw / 2 - 13, 104, 1, 8, '#8a7454');
    RR(g, LX - sw / 2, 111, sw, 15, WAL[0]); RR(g, LX - sw / 2 + 1, 112, sw - 2, 13, LIN[2]); RR(g, LX - sw / 2 + 1, 112, sw - 2, 1, LIN[3]); RR(g, LX - sw / 2 + 1, 123, sw - 2, 2, LIN[1]);
    Font.draw(g, sub, LX, 115, { scale: 1, color: '#2e241a', align: 'center' });
    // the menu: a walnut board with the three choices on it
    const sl = (typeof Main !== 'undefined' && Main.slotList) ? Main.slotList()[0] : null;
    const bx = 444, bw = 176;
    plank(g, bx - 10, 100, bw + 20, 166, { noNails: false });
    RR(g, bx - 4, 106, bw + 8, 154, WAL[1]);
    const play = { id: 'enter', x: bx, y: 110, w: bw, h: 54 };
    const set = { id: 'settings', x: bx, y: 172, w: bw, h: 38 };
    const help = { id: 'help', x: bx, y: 216, w: bw, h: 38 };
    buttons.push(play, set, help);
    menuButton(g, play, hasSave ? 'CONTINUE' : 'NEW FARM',
      hasSave && sl && !sl.empty ? `day ${sl.day || 1} - ${sl.wombats} ${sl.wombats === 1 ? 'wombat' : 'wombats'}` : 'a wombat is waiting', 'wombat', 'go');
    menuButton(g, set, 'Settings', null, 'gear');
    menuButton(g, help, 'How to play', null, 'book');
    // the tip of the day, on a linen strip at the bottom
    const line = RUMOURS[rumour % RUMOURS.length];
    const lw = Font.width(line, 1) + 30;
    RR(g, VW / 2 - lw / 2, VH - 27, lw, 20, WAL[0]); RR(g, VW / 2 - lw / 2 + 1, VH - 26, lw - 2, 18, LIN[2]); RR(g, VW / 2 - lw / 2 + 1, VH - 26, lw - 2, 1, LIN[3]);
    RR(g, VW / 2 - lw / 2 + 1, VH - 10, lw - 2, 2, LIN[1]);
    Menu_tipIcon(g, VW / 2 - lw / 2 + 6, VH - 22);
    Font.draw(g, line, VW / 2 + 5, VH - 21, { scale: 1, color: Kit.C.ink, align: 'center' });
  }
  // a small lit bulb for "did you know"
  function Menu_tipIcon(g, x, y) {
    Art.ell(g, x + 3, y + 3, 3, 3, '#2a1c12'); Art.ell(g, x + 3, y + 3, 2.2, 2.2, '#e6c887'); RR(g, x + 2, y + 2, 1, 1, '#fffaf0');
    RR(g, x + 2, y + 6, 3, 2, '#62452b');
  }

  // which drops four pixels when the pointer is over it. It is the same button
  // the panels use, drawn with rectangles instead of CSS.
  function plaque(g, x, y, w, h, hot) { Kit.rr(g, x, y, w, h + 3, 6, Kit.C.line); Kit.rr(g, x + 2, y + 2, w - 4, h - 3, 5, hot ? '#fff4cc' : Kit.C.paper); }
  function bigButton(g, b, label, sub, scale) {
    Kit.button(g, b, label, sub, { hot: hover === b.id, scale: scale || 2 });
  }

  // ---- the things living on the title screen ------------------------------
  // An owl on a bough that blinks and turns its head, a lantern that swings on
  // its chain, a signpost at the edge of the clearing, and one line of rumour
  // under the buttons that changes every time you come back.
  const RUMOURS = [
    'wombats sleep sixteen hours a day. goals.',
    'Mr Biscuit says the pumpkins have never been bigger',
    'the mart shuts at six but Shaz never leaves',
    'a wombat can dig a whole burrow in one night',
    'Groot grows the best carrots in the district',
    'the lottery has paid out twice. both times to the same man.',
    'square. every single one of them. square.',
    'water the beds in the morning and they grow all day',
    'a happy wombat leaves the good cubes',
    'the frogs move in the minute you dig a pond',
  ];
  let rumour = 0;
  const HELP = [
    ['t_drag', 'Start with your hands', 'Mr Biscuit gives you his old sickle. Everything else you unlock by doing jobs, then buy at Wombat Mart.'],
    ['t_sickle', 'Tidy the garden', 'Cut the weeds, have the ants take the old logs, and sow grass. A tidy patch brings a wombat.'],
    ['t_hoe', 'Grow something', 'Hoe a bed, sow seed on it, water it, and pick it with the hand when it glows.'],
    ['t_food', 'Feed a wombat', 'Put a bowl down. She eats, has a wander, and leaves a little cube behind.'],
    ['t_scoop', 'Cubes are fertiliser', 'Spread one on a bed with the poo scoop and it grows twice as fast. Or sell them to Mr Biscuit.'],
    ['t_shovel', 'Shape the land', 'Hold to dig down, right-click to heap up. Water a hole and it fills into a pond or a creek.'],
  ];

  function drawHelp(g) {
    buttons = [];
    const PW = 500, PX = (VW - PW) / 2, PY = 20, PH = 322;
    board(g, PX, PY, PW, PH);
    plate(g, PX + 14, PY + 12, PW - 28, 26, 'HOW TO PLAY');
    const BW = PW - 74;                       // what a line of body has room for
    HELP.forEach(([ico, title, body], i) => {
      const ry = PY + 44 + i * 40;
      Kit.rr(g, PX + 16, ry - 3, PW - 32, 38, 5, i % 2 ? '#fff4cc' : '#ffe9b8');
      Art.rect(g, PX + 16, ry - 3, PW - 32, 1, KIT.p4);
      Icons.blit(g, ico, PX + 20, ry + 4, 1.2);
      Font.draw(g, title, PX + 50, ry, { scale: 1, color: Kit.C.frameD });
      Font.wrap(body, BW, 1).slice(0, 2).forEach((ln, j) => {
        Font.draw(g, ln, PX + 50, ry + 11 + j * 10, { scale: 1, color: Kit.C.ink2 });
      });
    });
    const by = PY + PH - 34;
    buttons.push({ id: 'back', x: PX + 14, y: by, w: PW - 28, h: 26 });
    plaque(g, PX + 14, by, PW - 28, 26, hover === 'back');
    Font.draw(g, 'BACK', VW / 2, by + 9, { scale: 1, color: '#173a2e', align: 'center' });
  }

  const SETTINGS = [
    { key: 'muted', name: 'SOUND', on: 'ON', off: 'MUTED', inv: true },
    { key: 'musicOff', name: 'MUSIC', on: 'ON', off: 'OFF', inv: true },
    { key: 'shake', name: 'SCREEN SHAKE', on: 'ON', off: 'OFF' },
    { key: 'bigText', name: 'BIG TEXT', on: 'ON', off: 'OFF' },
  ];
  function drawSettings(g) {
    buttons = [];
    const PW = 424, PX = (VW - PW) / 2, PY = 80, PH = 224;
    board(g, PX, PY, PW, PH);
    plate(g, PX + 14, PY + 12, PW - 28, 26, 'SETTINGS');
    SETTINGS.forEach((s2, i) => {
      const ry = PY + 42 + i * 30;
      const val = s2.inv ? !G[s2.key] : !!G[s2.key];
      const hot = hover === 'set:' + s2.key;
      buttons.push({ id: 'set:' + s2.key, x: PX + 14, y: ry, w: PW - 28, h: 24, kind: 'toggle', k: s2.key });
      Kit.rr(g, PX + 16, ry, PW - 32, 24, 5, hot ? '#fff4cc' : '#ffe9b8');
      Art.rect(g, PX + 16, ry, PW - 32, 1, KIT.p4);
      Font.draw(g, s2.name, PX + 28, ry + 9, { scale: 1, color: Kit.C.ink });
      const tx = PX + PW - 96, tw = 68;
      Kit.rr(g, tx - 2, ry + 3, tw + 4, 18, 8, Kit.C.line);
      Kit.rr(g, tx, ry + 5, tw, 14, 7, val ? Kit.C.mint : '#c8b89a');
      const kx = val ? tx + tw - 20 : tx + 2;
      Kit.rr(g, kx, ry + 6, 18, 12, 6, '#ffffff');
      Font.draw(g, val ? s2.on : s2.off, val ? tx + 22 : tx + tw - 22, ry + 9, {
        scale: 1, align: 'center', color: val ? '#ffffff' : Kit.C.ink,
      });
    });
    const dy = PY + PH - 42;
    buttons.push({ id: 'wipe', x: PX + 14, y: dy, w: PW - 28, h: 28, kind: 'wipe' });
    const wh = hover === 'wipe';
    Kit.rr(g, PX + 14, dy, PW - 28, 30, 7, Kit.C.line);
    Kit.rr(g, PX + 16, dy + 2, PW - 32, 24, 6, wh ? '#ff9278' : Kit.C.coral);
    Font.draw(g, 'RESET ALL DATA', VW / 2, dy + 6, { scale: 1, color: '#fff2e0', align: 'center' });
    Font.draw(g, hasSave ? 'ERASES YOUR FARM AND STARTS OVER' : 'NOTHING SAVED YET', VW / 2, dy + 17, {
      scale: 1, color: wh ? '#ffd9c0' : '#e8b898', align: 'center',
    });
    backButton(g);
  }
  function backButton(g) {
    const b = { id: 'back', x: VW / 2 - 70, y: 316, w: 140, h: 28 };
    buttons.push(b);
    bigButton(g, b, 'BACK', null, 2);
  }

  function drawConfirm(g) {
    g.fillStyle = 'rgba(44,64,72,0.5)'; g.fillRect(0, 0, VW, VH);
    const PW = 344, PX = (VW - PW) / 2, PY = 112, PH = 136;
    board(g, PX, PY, PW, PH);
    plate(g, PX + 14, PY + 12, PW - 28, 26, 'ARE YOU SURE?');
    const lines = Font.wrap(confirm.text.toUpperCase(), PW - 44, 1);
    lines.forEach((l, i) => Font.draw(g, l, VW / 2, PY + 50 + i * 11, { scale: 1, color: Kit.C.ink, align: 'center' }));
    Font.draw(g, 'THIS CANNOT BE UNDONE', VW / 2, PY + 78, { scale: 1, color: Kit.C.coralD, align: 'center' });
    const by = PY + PH - 34;
    buttons.push({ id: 'yes', x: PX + 18, y: by, w: 140, h: 24, kind: 'confirm' });
    buttons.push({ id: 'no', x: PX + PW - 158, y: by, w: 140, h: 24, kind: 'confirm' });
    for (const [id, lab, kind] of [['yes', 'ERASE IT', 'coral'], ['no', 'KEEP IT', 'mint']]) {
      const b = buttons.find((q) => q.id === id);
      Kit.button(g, b, lab, null, { hot: hover === id, kind, scale: 1 });
    }
  }

  // Fireflies over the floor of the wood, and low mist rolling through it.
  function update(dt) { t += dt; }
  function render(g) {
    scene(g);
    if (page === 'home') drawHome(g);
    else { g.fillStyle = 'rgba(40,24,12,0.35)'; g.fillRect(0, 0, VW, VH); }
    if (page === 'help') drawHelp(g);
    else if (page === 'settings') drawSettings(g);
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
      confirm = { text: 'your farm and every wombat on it', go: () => onAct({ wipe: true }) };
      return;
    }
    // picking a grove, or burning one
    if (h.id.startsWith('slot:')) { onAct({ slot: +h.id.slice(5) }); Audio.play('click'); return; }
    if (h.id.startsWith('wipe:')) {
      const n = +h.id.slice(5);
      confirm = { text: 'farm ' + n + ' and every wombat on it', go: () => onAct({ wipeSlot: n }) };
      return;
    }
    if (h.id === 'settings') { page = 'settings'; return; }
    if (h.id === 'help') { page = 'help'; return; }
    if (h.id === 'back') { page = 'home'; return; }
    if (h.id === 'enter') onAct({ play: true });
  }
  function key(k) {
    if (k === 'Escape') { if (confirm) confirm = null; else if (page !== 'home') page = 'home'; return true; }
    if (page === 'home' && !confirm && (k === 'Enter' || k === ' ')) { onAct({ play: true }); return true; }
    return false;
  }

  // the title screen's moving country on its own, for the itch.io art
  function sceneAt(g, time) { const o = t; t = time; scene(g); t = o; }
  return { init, enter, update, render, press, move, key, setSave, sceneAt, get page() { return page; } };
})();
