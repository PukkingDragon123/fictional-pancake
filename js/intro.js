// ---- The opening: driving in -------------------------------------------------
// No phone this time. You have taken the job, the car is packed, and the
// opening is the drive itself: out of the forest, down the one street of
// Wombat Creek past the bakery and the mart and the pub, and up to the farm
// gate, where Jim is waiting to show you round.
//
// Hold the mouse to put your foot down; Esc skips the lot.
const Intro = (() => {
  const VW = 640, VH = 360, ROAD = 296;
  const CAR_X = 210;
  let G = null;
  let t = 0, d = 0, v = 0, fast = false, stopT = 0, out = 0, done = false, skipT = 0;
  const smoke = [];

  // Everything along the road, at its distance from the start. A thing at
  // `at` is on screen at x = at - d.
  const VILLAGE0 = 1250, VILLAGE1 = 2300;
  const STOP_D = 2560;                               // where the car pulls up
  const GATE_AT = STOP_D + 440;
  const ROW = [
    { at: 520, kind: 'sign', text: 'WOMBAT CREEK', sub: '2 km' },
    { at: 980, kind: 'box' },
    { at: 1140, kind: 'sign', text: 'WOMBAT CREEK', sub: 'pop. 212 and a lot of wombats' },
    { at: 1300, kind: 'house', v: 0 },
    { at: 1415, kind: 'lamp' },
    { at: 1480, kind: 'church' },
    { at: 1600, kind: 'shop', shop: 'bakery' },
    { at: 1735, kind: 'lamp' },
    { at: 1800, kind: 'shop', shop: 'post' },
    { at: 1950, kind: 'shop', shop: 'mart' },
    { at: 2095, kind: 'lamp' },
    { at: 2160, kind: 'shop', shop: 'pub' },
    { at: 2330, kind: 'house', v: 2 },
    { at: 2460, kind: 'house', v: 3 },
    { at: 2640, kind: 'sign', text: 'WOMBAT FARM', sub: 'next left' },
    { at: GATE_AT, kind: 'gate' },
  ];
  // wombats out on the footpath, going about their day
  const LOCALS = [{ at: 1560, sp: -8 }, { at: 1905, sp: 6 }, { at: 2230, sp: -5 }];
  // what gets said on the way, as a card in the corner
  const CAPTIONS = [
    { from: 0, to: 640, head: 'THE NEW JOB', lines: ['Caretaker wanted. Wombat farm, a bit run down.', 'Board, lodging, and wombats. Apply to Jim.'] },
    { from: 700, to: 1200, head: 'JIM, ON THE PHONE', lines: ['"Past the gum trees, through the village,', 'first gate on the left. Can\'t miss it."'] },
    { from: 1250, to: 2300, head: 'WOMBAT CREEK', lines: ['One street: a bakery, the post, the mart, the pub.', 'Everybody waves.'] },
  ];

  function init(g) { G = g; }
  function enter() {
    t = 0; d = 0; v = 190; fast = false; stopT = 0; out = 0; done = false; skipT = 0;
    smoke.length = 0;
    Audio.setMode('pen');
  }
  function finish() {
    if (done) return;
    done = true;
    G.introDone = true;
    Main.save();
    Main.setMode('grove');
    Main.openingBeats();
  }
  function skip() { finish(); }
  const stopped = () => d >= STOP_D - 0.5;

  // ---- input -----------------------------------------------------------------
  function press() {
    skipT = 0;
    if (stopped() && stopT > 0.8) { out = out || 0.001; Audio.play('door'); return; }
    fast = true;
  }
  function move() { }
  function release() { fast = false; }

  // ---- the drive -------------------------------------------------------------------
  function update(dt) {
    t += dt; skipT += dt;
    // cruising in the wood, slowing for the village, easing up to the gate
    let want = d < VILLAGE0 - 150 ? 210 : d < VILLAGE1 ? 125 : Math.max(16, 125 * U.clamp((STOP_D - d) / 220, 0, 1));
    if (fast && !stopped()) want *= 3;
    v = U.lerp(v, want, 1 - Math.pow(0.08, dt));
    d = Math.min(STOP_D, d + v * dt);
    if (stopped()) { v = 0; stopT += dt; }
    // chimney smoke from the cottages
    if (Math.random() < dt * 6) for (const th of ROW) {
      if (th.kind !== 'house') continue;
      const x = th.at - d;
      if (x < -60 || x > VW + 60) continue;
      const b = Scenery.building('house', th.v);
      smoke.push({ wx: th.at - b.w / 2 + b.smoke.x, y: ROAD - 6 - b.h + b.smoke.y, t: 0, r: 2 + Math.random() * 2 });
    }
    for (let i = smoke.length - 1; i >= 0; i--) { const s = smoke[i]; s.t += dt; s.y -= dt * 12; s.wx += dt * 6; if (s.t > 2.6) smoke.splice(i, 1); }
    if (out) { out += dt / 0.9; if (out >= 1) finish(); }
  }

  // ---- drawing -------------------------------------------------------------------------
  function sign(g, x, y, text, sub) {
    const w = Math.max(Font.width(text, 1), Font.width(sub, 1)) + 16;
    Art.rect(g, x - 2, y - 44, 5, 46, '#2a1a10'); Art.rect(g, x - 1, y - 44, 3, 46, '#8a5a34');
    Art.rect(g, x - w / 2 - 2, y - 72, w + 4, 30, '#1a110b');
    Art.rect(g, x - w / 2, y - 70, w, 26, '#2f7a3e');
    Art.rect(g, x - w / 2 + 2, y - 70, w - 4, 2, '#4fa45a');
    Art.rect(g, x - w / 2 + 2, y - 67, w - 4, 1, '#e8f4ea');
    Font.draw(g, text, x, y - 64, { scale: 1, color: '#ffffff', align: 'center' });
    Font.draw(g, sub, x, y - 54, { scale: 1, color: '#c8f0cc', align: 'center' });
  }
  function letterbox(g, x, y) {
    Art.rect(g, x - 2, y - 28, 4, 30, '#2a1a10'); Art.rect(g, x - 1, y - 28, 2, 30, '#8a5a34');
    Art.rect(g, x - 10, y - 40, 20, 14, '#1a110b'); Art.rect(g, x - 9, y - 39, 18, 12, '#c8584a');
    Art.rect(g, x - 9, y - 39, 18, 2, '#e07a6a');
    Art.rect(g, x + 8, y - 44, 2, 8, '#1a110b'); Art.rect(g, x + 10, y - 44, 5, 4, '#ffd95c');
  }
  // the farm gate: two big posts, a sign hung between them, the gate swung open
  function gate(g, x, y) {
    const W = 120;
    for (const px of [x - W / 2, x + W / 2]) {
      Art.rect(g, px - 5, y - 78, 10, 80, '#3a2616'); Art.rect(g, px - 4, y - 77, 8, 79, '#9a6a42');
      Art.rect(g, px - 4, y - 77, 2, 79, '#c49064'); Art.rect(g, px - 6, y - 82, 12, 5, '#3a2616');
    }
    Art.rect(g, x - W / 2 - 4, y - 74, W + 8, 6, '#3a2616'); Art.rect(g, x - W / 2 - 3, y - 73, W + 6, 4, '#8a5a34');
    for (const cx of [x - 26, x + 26]) Art.rect(g, cx, y - 68, 1, 8, '#4a4a4a');
    Art.rect(g, x - 44, y - 62, 88, 20, '#3a2616'); Art.rect(g, x - 42, y - 60, 84, 16, '#f2e0b8');
    Art.rect(g, x - 42, y - 60, 84, 2, '#fff4d8');
    Font.draw(g, 'WOMBAT FARM', x, y - 56, { scale: 1, color: '#6a3a1a', align: 'center' });
    // the gate itself, swung back against the fence
    for (let i = 0; i < 5; i++) Art.rect(g, x + W / 2 + 4, y - 36 + i * 7, 34, 3, i % 2 ? '#a07a52' : '#c49a6a');
    Art.limb(g, x + W / 2 + 4, y - 36, x + W / 2 + 38, y - 8, 2, 2, '#a07a52');
    // a dirt track going in
    Art.poly(g, [[x - 40, y + 2], [x + 40, y + 2], [x + 30, y - 4], [x - 30, y - 4]], '#c8a070');
  }
  function thing(g, th, x, R) {
    const y = R - 4;
    if (th.kind === 'sign') sign(g, x, y, th.text, th.sub);
    else if (th.kind === 'box') letterbox(g, x, y);
    else if (th.kind === 'lamp') Scenery.lamp(g, x, y, false);
    else if (th.kind === 'gate') gate(g, x, y);
    else {
      const b = th.kind === 'house' ? Scenery.building('house', th.v) : th.kind === 'church' ? Scenery.building('church') : Scenery.building(th.shop);
      g.drawImage(b.img, Math.round(x - b.w / 2), Math.round(R + 2 - b.h));
    }
  }
  function caption(g) {
    const c = CAPTIONS.find((q) => d >= q.from && d < q.to);
    if (!c) return;
    const a = U.clamp(Math.min((d - c.from) / 90, (c.to - d) / 90), 0, 1);
    if (a <= 0) return;
    const w = Math.max(...c.lines.map((l) => Font.width(l, 1))) + 26, h = 20 + c.lines.length * 12;
    const x = 16, y = 16 - (1 - a) * 10;
    g.globalAlpha = a;
    Art.rect(g, x - 2, y + 3, w + 4, h + 2, 'rgba(40,20,8,0.3)');
    Art.rect(g, x - 2, y - 2, w + 4, h + 4, '#3b1f10');
    Art.rect(g, x, y, w, h, '#c47a3c'); Art.rect(g, x, y, w, 1, '#e8a660');
    Art.rect(g, x + 3, y + 3, w - 6, h - 6, '#fcefd0'); Art.rect(g, x + 3, y + 3, w - 6, 1, '#fff8e4');
    Font.draw(g, c.head, x + 12, y + 8, { scale: 1, color: '#b0662e' });
    c.lines.forEach((l, i) => Font.draw(g, l, x + 12, y + 21 + i * 12, { scale: 1, color: '#5a2e16' }));
    g.globalAlpha = 1;
  }
  function bubble(g, x, y, lines) {
    const w = Math.max(...lines.map((l) => Font.width(l, 1))) + 20, h = 10 + lines.length * 12;
    const bx = Math.round(U.clamp(x - w / 2, 8, VW - w - 8)), by = Math.round(y - h);
    Art.rect(g, bx - 2, by - 2, w + 4, h + 4, '#3b1f10');
    Art.rect(g, bx, by, w, h, '#fffaf0');
    Art.rect(g, bx, by + h - 2, w, 2, '#ecdcc0');
    Art.poly(g, [[x - 6, by + h], [x + 4, by + h], [x - 2, by + h + 8]], '#3b1f10');
    Art.poly(g, [[x - 4, by + h], [x + 2, by + h], [x - 2, by + h + 5]], '#fffaf0');
    lines.forEach((l, i) => Font.draw(g, l, bx + 10, by + 6 + i * 12, { scale: 1, color: '#3a2410' }));
  }

  function render(g) {
    const R = ROAD;
    // the fence stops where the village starts and picks up again after it
    const vx0 = VILLAGE0 - 80 - d, vx1 = VILLAGE1 + 250 - d;
    Scenery.paint(g, d, {
      road: R, t,
      fenceGaps: [[vx0, vx1], [GATE_AT - 116 - d, GATE_AT + 64 - d]],
      between: (g2) => {
        for (const s of smoke) {
          const sx = s.wx - d, a = (1 - s.t / 2.6) * 0.55;
          Art.ell(g2, sx, s.y, s.r + s.t * 3, s.r + s.t * 2.4, `rgba(240,238,232,${a.toFixed(2)})`);
        }
        for (const th of ROW) {
          const x = th.at - d;
          if (x > -160 && x < VW + 160) thing(g2, th, x, R);
        }
        for (const l of LOCALS) {                                    // wombats on the footpath
          const wx = l.at + l.sp * t - d;
          if (wx < -40 || wx > VW + 40) continue;
          const dir = l.sp > 0 ? 1 : -1;
          Sprites.shadow(g2, wx, R - 6, 'walk', Math.floor(t * 9), 'brown', dir, 'adult', 0.8);
          Sprites.blit(g2, wx, R - 6, 'walk', Math.floor(t * 9), 'brown', dir, 'adult', 0.8);
        }
        // Jim at the gate, waving you in
        const jx = GATE_AT - d - 90;
        if (jx > -60 && jx < VW + 60) {
          Sprites.setFace('happy');
          const img = Sprites.jim(Math.floor(t * 6), stopped() ? 'wave' : 'idle');
          const s = 0.9, w = img.width * s, h = img.height * s;
          Art.castShadow(g2, img, jx, R - 4, w, h, { alpha: 0.28, lean: 0.4, squash: 0.2 });
          g2.drawImage(img, Math.round(jx - w / 2), Math.round(R - 2 - h), Math.round(w), Math.round(h));
        }
      },
    });
    Scenery.car(g, CAR_X, R + 34, t, { moving: !stopped(), wombat: true });
    caption(g);
    if (stopped() && stopT > 0.5) {
      const jx = GATE_AT - d - 90;
      bubble(g, jx, R - 84, stopT < 3.2 ? ['G\'day! You must be the new caretaker.', 'I\'m Jim. Welcome to Wombat Farm.'] : ['Bit of a mess, I\'ll be honest.', 'Come on in and I\'ll show you round.']);
      if (stopT > 1.4) {
        const a = 0.55 + 0.45 * Math.sin(t * 4);
        g.globalAlpha = a;
        Font.draw(g, 'CLICK TO GO IN', VW / 2, VH - 14, { scale: 1, color: '#fff6dc', align: 'center', shadow: '#3b1f10' });
        g.globalAlpha = 1;
      }
    }
    if (skipT > 1.5 && !stopped()) {
      Font.draw(g, 'HOLD TO DRIVE FASTER  -  ESC TO SKIP', VW - 12, VH - 12, { scale: 1, color: '#fff6dc', align: 'right', shadow: '#3b1f10' });
    }
    // fade in at the start, and out through the gate at the end
    const fin = U.clamp(1 - t / 1.2, 0, 1);
    if (fin > 0) { g.fillStyle = `rgba(20,12,6,${fin.toFixed(2)})`; g.fillRect(0, 0, VW, VH); }
    if (out) { g.fillStyle = `rgba(20,12,6,${U.clamp(out, 0, 1).toFixed(2)})`; g.fillRect(0, 0, VW, VH); }
    FX.drawParticles(g, 0);
  }

  // a way in for tests
  function go(p) { if (p === 'arrive') { d = STOP_D; stopT = 0; t = Math.max(t, 2); } else if (p === 'village') { d = 1500; t = Math.max(t, 2); } }
  return { init, enter, update, render, press, move, release, skip, go, get phase() { return stopped() ? 'arrive' : 'drive'; } };
})();
