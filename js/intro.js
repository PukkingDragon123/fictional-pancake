// ---- How you got the job --------------------------------------------------
// A cold open in four beats: a phone in a dark bedroom, a feed of wombat clips
// you scroll and like, the post that changes the week, then the flight and the
// drive out to the grove. Click or press a key to skip.
const Intro = (() => {
  let G = null;
  const VW = 640, VH = 360;
  let phase = 'phone', t = 0, done = false;
  let card = 0, slide = 0, dragY = 0, dragging = false, from = 0;
  let thumb = { x: 470, y: 300, tx: 470, ty: 300, press: 0 };
  const hearts = [], sparks = [];
  let skipT = 0, applyR = null, heartR = null;

  // ---- the clips -----------------------------------------------------------
  // Each one is a tiny loop drawn in the video window: pixel wombats, doing
  // exactly the things people film them doing.
  const CLIPS = [
    { cap: 'she found the good grass', tag: '@fernbottom', likes: 24100, kind: 'graze' },
    { cap: 'RUNNING WOMBAT. thats it thats the post', tag: '@tassie.daily', likes: 91300, kind: 'run' },
    { cap: 'bath night for bertie', tag: '@wombat.rescue', likes: 152800, kind: 'bath' },
    { cap: 'joey checks the weather', tag: '@burrowcam', likes: 68400, kind: 'joey' },
    { job: true, cap: 'HIRING: WOMBAT CARETAKER', tag: '@grove.tas', likes: 12, kind: 'job' },
  ];

  function init(g) { G = g; }
  function enter() {
    phase = 'phone'; t = 0; card = 0; slide = 0; done = false;
    thumb = { x: 470, y: 300, tx: 470, ty: 300, press: 0 };
    hearts.length = 0; sparks.length = 0;
    CLIPS.forEach((c) => { c.liked = false; });
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

  // ---- input ---------------------------------------------------------------
  function press(x, y) {
    skipT = 0;
    if (phase !== 'phone') { next(); return; }
    const c = CLIPS[card];
    thumb.tx = x; thumb.ty = y; thumb.press = 1;
    if (c.job && applyR && x > applyR.x && x < applyR.x + applyR.w && y > applyR.y - 6 && y < applyR.y + applyR.h + 6) { Audio.play('cash'); phase = 'plane'; t = 0; return; }
    if (!c.job && heartR && x > heartR.x - 6 && x < heartR.x + 52 && y > heartR.y - 8 && y < heartR.y + 30) { like(); return; }
    dragging = true; from = y; dragY = 0;
  }
  function move(x, y) {
    thumb.tx = x; thumb.ty = y;
    if (dragging) dragY = y - from;
  }
  function release() {
    thumb.press = 0;
    if (!dragging) return;
    dragging = false;
    if (dragY < -26 && card < CLIPS.length - 1) { card++; slide = 1; Audio.play('whoosh'); }
    else if (dragY > 26 && card > 0) { card--; slide = -1; Audio.play('whoosh'); }
    dragY = 0;
  }
  function like() {
    const c = CLIPS[card];
    if (c.liked) return;
    c.liked = true; c.likes++;
    Audio.play('pop');
    for (let i = 0; i < 12; i++) hearts.push({ x: 262 + U.rand(-8, 8), y: 258, vx: U.rand(-40, 40), vy: U.rand(-90, -40), t: 0 });
  }
  function next() {
    if (phase === 'phone') { phase = 'plane'; t = 0; }
    else if (phase === 'plane') { phase = 'drive'; t = 0; }
    else if (phase === 'drive') { phase = 'arrive'; t = 0; }
    else finish();
  }
  function skip() { finish(); }

  function update(dt) {
    t += dt; skipT += dt;
    thumb.x = U.lerp(thumb.x, thumb.tx, 1 - Math.pow(0.001, dt));
    thumb.y = U.lerp(thumb.y, thumb.ty, 1 - Math.pow(0.001, dt));
    thumb.press = Math.max(0, thumb.press - dt * 3);
    if (slide) { slide -= Math.sign(slide) * dt * 4; if (Math.abs(slide) < 0.05) slide = 0; }
    for (let i = hearts.length - 1; i >= 0; i--) {
      const h = hearts[i]; h.t += dt; h.vy += 40 * dt; h.x += h.vx * dt; h.y += h.vy * dt;
      if (h.t > 1.1) hearts.splice(i, 1);
    }
    if (phase === 'plane' && t > 4.4) { phase = 'drive'; t = 0; }
    if (phase === 'drive' && t > 5.0) { phase = 'arrive'; t = 0; }
    if (phase === 'arrive' && t > 2.0) finish();
  }

  // ---- the bedroom ---------------------------------------------------------
  function bedroom(g) {
    g.fillStyle = '#171026'; g.fillRect(0, 0, VW, VH);
    // a window with a cold moon
    g.fillStyle = '#1e2a4a'; g.fillRect(40, 26, 150, 120);
    g.fillStyle = '#2c3f6b'; g.fillRect(44, 30, 142, 112);
    g.fillStyle = '#e8eeff'; Art.ell(g, 150, 62, 13, 13, '#e8eeff');
    g.fillStyle = '#cdd8f2'; Art.ell(g, 155, 58, 5, 5, '#cdd8f2');
    for (let i = 0; i < 22; i++) { const sx = 48 + (i * 47) % 134, sy = 34 + (i * 29) % 104; g.fillStyle = i % 3 ? '#8ea4d8' : '#ffffff'; g.fillRect(sx, sy, 1, 1); }
    g.fillStyle = '#120b1c'; g.fillRect(44, 84, 142, 3); g.fillRect(112, 30, 3, 112);
    g.fillStyle = '#2a1c3c'; g.fillRect(34, 20, 162, 6); g.fillRect(34, 146, 162, 8);
    // a poster of a wombat on the wall
    g.fillStyle = '#3a2a52'; g.fillRect(452, 40, 116, 96);
    g.fillStyle = '#d8c49a'; g.fillRect(456, 44, 108, 88);
    Sprites.blit(g, 510, 118, 'idle', 0, 'brown', 1, 'adult', 1.5);
    Font.draw(g, 'WOMBATS', 510, 50, { scale: 2, color: '#6b3d12', align: 'center' });
    Font.draw(g, 'OF TASMANIA', 510, 122, { scale: 1, color: '#8a5c33', align: 'center' });
    // the bed you are lying on
    g.fillStyle = '#241a38'; g.fillRect(0, 250, VW, VH - 250);
    g.fillStyle = '#33264e'; g.fillRect(0, 250, VW, 10);
    for (let i = 0; i < 5; i++) { g.fillStyle = '#2b2042'; g.fillRect(-20 + i * 150, 262, 130, 8); }
    // the room lit by the screen
    const gr = g.createLinearGradient(0, 90, 0, 330);
    gr.addColorStop(0, 'rgba(120,180,255,0)'); gr.addColorStop(0.5, 'rgba(120,180,255,0.12)'); gr.addColorStop(1, 'rgba(120,180,255,0)');
    g.fillStyle = gr; g.fillRect(0, 90, VW, 240);
    g.fillStyle = 'rgba(10,6,18,0.55)'; g.fillRect(0, 0, VW, VH);
  }

  // ---- the phone -----------------------------------------------------------
  const PX = 220, PY = 26, PW = 200, PH = 316;
  function phoneBody(g) {
    const n = 6;
    g.fillStyle = '#0a0710';
    g.fillRect(PX - 8 + n, PY - 8, PW + 16 - n * 2, PH + 16);
    g.fillRect(PX - 8, PY - 8 + n, PW + 16, PH + 16 - n * 2);
    g.fillStyle = '#3a3648';
    g.fillRect(PX - 5 + n, PY - 5, PW + 10 - n * 2, PH + 10);
    g.fillRect(PX - 5, PY - 5 + n, PW + 10, PH + 10 - n * 2);
    g.fillStyle = '#57536a'; g.fillRect(PX - 5, PY - 5 + n, 2, PH + 10 - n * 2);
    g.fillStyle = '#0a0710'; g.fillRect(PX - 2, PY - 2, PW + 4, PH + 4);
  }
  function statusBar(g) {
    g.fillStyle = '#101018'; g.fillRect(PX, PY, PW, 14);
    Font.draw(g, '23:41', PX + 8, PY + 4, { scale: 1, color: '#cfd6e8', align: 'left' });
    for (let i = 0; i < 4; i++) { g.fillStyle = '#cfd6e8'; g.fillRect(PX + PW - 44 + i * 4, PY + 9 - i * 2, 3, 3 + i * 2); }
    g.fillStyle = '#cfd6e8'; g.fillRect(PX + PW - 24, PY + 4, 14, 7);
    g.fillStyle = '#101018'; g.fillRect(PX + PW - 22, PY + 6, 10, 3);
    g.fillStyle = '#7de08a'; g.fillRect(PX + PW - 22, PY + 6, 7, 3);
  }
  function clipArt(g, kind, x, y, w, h, tt) {
    g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
    const step = Math.floor(tt * 8);
    if (kind === 'job') {
      g.fillStyle = '#1f3a24'; g.fillRect(x, y, w, h);
      for (let i = 0; i < 70; i++) { g.fillStyle = ['#2c5230', '#3a6b3c', '#1a2e1e'][i % 3]; g.fillRect(x + (i * 37) % w, y + (i * 53) % h, 3, 3); }
      g.fillStyle = '#4a7a48'; g.fillRect(x, y + h - 26, w, 26);
      Sprites.blit(g, x + w * 0.34, y + h - 8, 'graze', step, 'brown', 1, 'adult', 1.3);
      Sprites.blit(g, x + w * 0.66, y + h - 6, 'idle', step, 'sand', -1, 'joey', 1.1);
      g.fillStyle = 'rgba(10,6,18,0.5)'; g.fillRect(x, y, w, 26);
      Font.draw(g, 'WOMBAT GROVE, TAS', x + w / 2, y + 9, { scale: 1, color: '#ffe497', align: 'center' });
    } else if (kind === 'graze') {
      g.fillStyle = '#5d8f45'; g.fillRect(x, y, w, h);
      g.fillStyle = '#79ae58'; g.fillRect(x, y, w, h * 0.5);
      for (let i = 0; i < 90; i++) { g.fillStyle = i % 2 ? '#4a7a38' : '#8cc169'; g.fillRect(x + (i * 29) % w, y + h * 0.4 + (i * 17) % (h * 0.6), 2, 4); }
      Sprites.blit(g, x + w / 2, y + h - 10, 'graze', step, 'brown', 1, 'adult', 1.9);
    } else if (kind === 'run') {
      g.fillStyle = '#6b5a3a'; g.fillRect(x, y, w, h);
      g.fillStyle = '#8a7a52'; g.fillRect(x, y, w, h * 0.45);
      for (let i = 0; i < 8; i++) { g.fillStyle = 'rgba(255,255,255,0.16)'; g.fillRect(x + ((i * 61 - tt * 240) % (w + 40)) - 20, y + 20 + (i * 23) % (h - 40), 22, 2); }
      Sprites.blit(g, x + w * 0.45 + Math.sin(tt * 6) * 6, y + h - 12, 'run', step, 'sand', 1, 'adult', 2.1);
      for (let i = 0; i < 5; i++) { g.fillStyle = 'rgba(180,150,110,0.5)'; g.fillRect(x + w * 0.2 - i * 9, y + h - 14 + (i % 2) * 3, 5, 3); }
    } else if (kind === 'bath') {
      g.fillStyle = '#cfd8e0'; g.fillRect(x, y, w, h);
      g.fillStyle = '#b4c0cc'; g.fillRect(x, y + h * 0.55, w, h * 0.45);
      g.fillStyle = '#e8eef4'; g.fillRect(x + 14, y + h - 52, w - 28, 44);
      g.fillStyle = '#7fc6e0'; g.fillRect(x + 18, y + h - 44, w - 36, 30);
      Sprites.blit(g, x + w / 2, y + h - 20, 'sit', step % 3, 'grey', 1, 'adult', 1.7);
      for (let i = 0; i < 9; i++) {
        const bx = x + 22 + (i * 31) % (w - 44), by = y + h - 18 - ((tt * 26 + i * 14) % 44);
        g.fillStyle = 'rgba(255,255,255,0.8)'; g.fillRect(bx, by, 3, 3);
      }
    } else {
      g.fillStyle = '#3a2a1c'; g.fillRect(x, y, w, h);
      g.fillStyle = '#4f3a26'; g.fillRect(x, y + h * 0.5, w, h * 0.5);
      g.fillStyle = '#241810'; Art.ell(g, x + w / 2, y + h - 6, w * 0.34, h * 0.3, '#241810');
      const peek = Math.sin(tt * 2) > 0 ? 2 : 6;
      Sprites.blit(g, x + w / 2, y + h - 10 + peek, 'idle', step, 'soot', 1, 'joey', 1.6);
      g.fillStyle = '#6b8f45'; for (let i = 0; i < 14; i++) g.fillRect(x + (i * 23) % w, y + h * 0.5 + (i % 3) * 5, 3, 7);
    }
    g.restore();
  }
  function feedCard(g, i, off) {
    const c = CLIPS[i];
    const x = PX + 6, y = PY + 20 + off, w = PW - 12, h = 272;
    if (y > PY + PH || y + h < PY) return;
    g.fillStyle = '#15151e'; g.fillRect(x, y, w, h);
    // the account line
    g.fillStyle = '#23232f'; g.fillRect(x, y, w, 18);
    g.fillStyle = c.job ? '#7de08a' : '#e0705a'; g.fillRect(x + 4, y + 3, 12, 12);
    g.fillStyle = '#15151e'; g.fillRect(x + 6, y + 5, 8, 8);
    Font.draw(g, c.tag, x + 21, y + 6, { scale: 1, color: '#e6e6f0', align: 'left' });
    // the clip
    clipArt(g, c.kind, x, y + 18, w, 168, t + i);
    if (!c.job) {                                  // the play bar along the foot of the clip
      g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(x + 4, y + 180, w - 8, 2);
      g.fillStyle = '#ffffff'; g.fillRect(x + 4, y + 180, (w - 8) * ((t * 0.22 + i * 0.3) % 1), 2);
    }
    // the action row
    const ay = y + 190;
    if (c.job) {
      Font.draw(g, 'WOMBAT', x + 6, ay + 2, { scale: 2, color: '#ffe497', align: 'left' });
      Font.draw(g, 'CARETAKER', x + 6, ay + 18, { scale: 2, color: '#ffe497', align: 'left' });
      Font.draw(g, 'live in. feed them. that is', x + 6, ay + 36, { scale: 1, color: '#b9b6c6', align: 'left' });
      Font.draw(g, 'the whole job. start monday.', x + 6, ay + 46, { scale: 1, color: '#b9b6c6', align: 'left' });
      const bob = Math.round(Math.sin(t * 4) * 2);
      const bx = x + 10, by = ay + 58 + bob, bw = w - 20, bh = 30;
      applyR = { x: bx, y: by, w: bw, h: bh };
      g.fillStyle = '#0a2e14'; g.fillRect(bx, by + 4, bw, bh);
      g.fillStyle = '#2f8f42'; g.fillRect(bx, by, bw, bh);
      g.fillStyle = '#7de08a'; g.fillRect(bx, by, bw, 8);
      Font.draw(g, 'APPLY', bx + bw / 2, by + 10, { scale: 2, color: '#06210c', align: 'center' });
    } else {
      const hx = x + 8, hy = ay + 2;
      heartR = { x: hx, y: hy };
      drawHeart(g, hx, hy, c.liked ? '#e0405a' : '#2c2c3a', c.liked);
      Font.draw(g, fmt(c.likes), hx + 20, hy + 4, { scale: 1, color: c.liked ? '#ff8fa0' : '#9a97a8', align: 'left' });
      Font.draw(g, 'TAP THE HEART', hx + 74, hy + 4, { scale: 1, color: '#55536a', align: 'left' });
      const lines = Font.wrap(c.cap, w - 14, 1);
      lines.slice(0, 3).forEach((l, k) => Font.draw(g, l, x + 7, ay + 26 + k * 11, { scale: 1, color: '#cfccdc', align: 'left' }));
      Font.draw(g, 'SWIPE UP FOR MORE', x + w / 2, y + h - 14, { scale: 1, color: '#4a4860', align: 'center' });
    }
  }
  // a proper pixel heart, seven across and six down
  const HEART = ['0110110', '1111111', '1111111', '0111110', '0011100', '0001000'];
  function drawHeart(g, x, y, col, big) {
    const s = big ? 2 : 2;
    g.fillStyle = col;
    HEART.forEach((row, ry) => { for (let rx = 0; rx < row.length; rx++) if (row[rx] === '1') g.fillRect(x + rx * s, y + ry * s, s, s); });
    if (big) { g.fillStyle = '#ff9db0'; g.fillRect(x + s, y + s, s * 2, s); }
  }
  const fmt = (n) => (n >= 1000 ? (n / 1000).toFixed(1) + 'K' : String(n));

  function hand(g) {
    // the heel of your hand in the corner, with a thumb reaching across
    const SK = '#c08a68', SK2 = '#a8725a', SK3 = '#d8a487', SKD = '#8a5a46';
    g.fillStyle = SK2; g.fillRect(452, 330, 196, 34);
    g.fillStyle = SK; g.fillRect(456, 334, 188, 30);
    g.fillStyle = SK3; g.fillRect(456, 334, 188, 5);
    for (let i = 0; i < 3; i++) { g.fillStyle = SKD; g.fillRect(506 + i * 34, 340, 3, 24); }   // knuckle creases
    const tx = Math.round(thumb.x), ty = Math.round(thumb.y + thumb.press * 2);
    const jx = 496, jy = 344;                                   // where the thumb leaves the hand
    const mx = U.lerp(jx, tx, 0.45) + 22, my = U.lerp(jy, ty, 0.45) + 6;   // it bends, it is not a stick
    Art.limb(g, jx, jy, mx, my, 40, 27, SK2);
    Art.limb(g, mx, my, tx + 5, ty + 8, 27, 16, SK2);
    Art.limb(g, jx, jy, mx, my, 34, 22, SK);
    Art.limb(g, mx, my, tx + 4, ty + 7, 22, 12, SK);
    Art.limb(g, jx - 8, jy - 11, mx - 6, my - 9, 9, 5, SK3);
    Art.ell(g, tx + 4, ty + 7, 10, 9, SK2);
    Art.ell(g, tx + 4, ty + 6, 8.6, 7.6, SK);
    Art.ell(g, tx + 2, ty + 3.6, 5, 4, SK3);
    g.fillStyle = '#f0d2bc'; g.fillRect(tx, ty + 1, 6, 5);       // the nail
    g.fillStyle = '#d8a487'; g.fillRect(tx, ty + 1, 6, 1);
    if (thumb.press > 0.2) {                        // the tap ring, square like everything else
      const k = 1 - thumb.press;
      g.globalAlpha = thumb.press * 0.5; g.fillStyle = '#ffffff';
      const r = 6 + k * 16;
      g.fillRect(tx - r, ty - r, r * 2, 2); g.fillRect(tx - r, ty + r, r * 2, 2);
      g.fillRect(tx - r, ty - r, 2, r * 2); g.fillRect(tx + r, ty - r, 2, r * 2);
      g.globalAlpha = 1;
    }
  }

  // ---- the flight ----------------------------------------------------------
  function plane(g) {
    const k = U.clamp(t / 4.4, 0, 1);
    const sky = g.createLinearGradient(0, 0, 0, VH);
    sky.addColorStop(0, '#222a5e'); sky.addColorStop(0.45, '#8a5a8e'); sky.addColorStop(0.75, '#e08a5a'); sky.addColorStop(1, '#f6cf8a');
    g.fillStyle = sky; g.fillRect(0, 0, VW, VH);
    g.fillStyle = '#ffe9a8'; Art.ell(g, 110, 236, 26, 26, '#ffe9a8');
    for (let i = 0; i < 40; i++) { const sx = (i * 79) % VW, sy = (i * 37) % 120; g.fillStyle = 'rgba(255,255,255,0.6)'; g.fillRect(sx, sy, 1, 1); }
    // cloud decks, sliding past at two speeds
    for (const [sp, yy, col, h] of [[36, 200, 'rgba(255,214,190,0.75)', 16], [70, 246, 'rgba(255,236,214,0.9)', 22]]) {
      for (let i = 0; i < 10; i++) {
        const cx = ((i * 96 - t * sp) % (VW + 200)) - 100;
        for (let k2 = 0; k2 < 5; k2++) Art.ell(g, cx + k2 * 20, yy + Math.abs(k2 - 2) * 4, 22, h, col);
      }
    }
    // the sea below
    g.fillStyle = '#2b5f8a'; g.fillRect(0, 300, VW, 60);
    for (let i = 0; i < 60; i++) { g.fillStyle = 'rgba(255,255,255,0.2)'; g.fillRect(((i * 53 - t * 30) % VW + VW) % VW, 306 + (i * 13) % 48, 7, 1); }
    // the aeroplane
    const px = U.lerp(-200, VW + 200, U.easeInOut(k)), py = 150 + Math.sin(t * 1.2) * 7;
    const pw = 205, ph = 70;
    g.save(); g.translate(px, py);
    Art.castShadow(g, planeImg(), 0, 154, pw, ph, { alpha: 0.14, lean: 0.2, squash: 0.18 });
    g.drawImage(planeImg(), -pw / 2, -ph / 2, pw, ph);
    g.restore();
    for (let i = 0; i < 26; i++) {                  // the contrail
      const cx = px - 96 - i * 13, a = (1 - i / 26) * 0.5;
      g.fillStyle = `rgba(255,255,255,${a.toFixed(2)})`;
      g.fillRect(cx, py + 7 + Math.sin(i * 0.5 + t) * 2, 11, 4);
    }
    banner(g, 'SYDNEY', 'HOBART', k);
  }
  let planeC = null;
  function planeImg() {
    if (planeC) return planeC;
    const { c, g } = Art.cv(128, 44);
    Art.poly(g, [[6, 24], [26, 14], [96, 12], [120, 20], [120, 26], [96, 32], [24, 32]], '#e8eaf0');   // fuselage
    Art.poly(g, [[6, 24], [24, 18], [24, 30]], '#cdd2de');
    Art.poly(g, [[46, 20], [76, 2], [92, 2], [74, 20]], '#cdd2de');                                     // tail
    Art.poly(g, [[40, 22], [70, 22], [58, 40], [40, 34]], '#b9bfcd');                                   // near wing
    Art.poly(g, [[44, 18], [78, 10], [70, 8], [44, 16]], '#dfe3ec');                                    // far wing
    Art.rect(g, 52, 24, 16, 8, '#3a4358'); Art.rect(g, 52, 24, 16, 3, '#5a657f');                        // engine
    for (let i = 0; i < 9; i++) Art.rect(g, 34 + i * 7, 20, 3, 3, '#7ec8e8');                            // windows
    Art.poly(g, [[10, 22], [20, 19], [20, 24], [10, 25]], '#7ec8e8');                                    // cockpit
    Art.rect(g, 6, 26, 114, 2, '#c1912a');                                                               // a gold stripe
    Art.outline(c, '#1c1008', 1);
    planeC = c; return c;
  }
  function banner(g, a, b, k) {
    const y = 62;
    g.fillStyle = 'rgba(12,8,20,0.6)'; g.fillRect(120, y - 10, 400, 42);
    g.fillStyle = '#1c1008'; g.fillRect(120, y - 10, 400, 2); g.fillRect(120, y + 30, 400, 2);
    Font.draw(g, a, 148, y - 2, { scale: 2, color: '#ffe497', align: 'left' });
    Font.draw(g, b, 492, y - 2, { scale: 2, color: '#ffe497', align: 'right' });
    g.fillStyle = '#5a5468'; g.fillRect(214, y + 4, 212, 2);
    const dx = 214 + 212 * k;
    g.fillStyle = '#ffe497'; g.fillRect(214, y + 4, 212 * k, 2);
    g.fillStyle = '#ffffff'; g.fillRect(Math.round(dx) - 3, y + 1, 7, 7);
    Font.draw(g, 'TASMANIA', 320, y + 16, { scale: 1, color: '#cfc4e0', align: 'center' });
  }

  // ---- the drive -----------------------------------------------------------
  function drive(g) {
    const k = U.clamp(t / 5.0, 0, 1);
    const sp = t * 150;
    const sky = g.createLinearGradient(0, 0, 0, 210);
    sky.addColorStop(0, '#3e2b62'); sky.addColorStop(0.6, '#9a5f7a'); sky.addColorStop(1, '#f0b070');
    g.fillStyle = sky; g.fillRect(0, 0, VW, 210);
    g.fillStyle = '#ffd9a0'; Art.ell(g, 520, 172, 30, 30, '#ffd9a0');
    g.fillStyle = '#24321f'; g.fillRect(0, 206, VW, VH - 206);      // the forest floor
    for (let i = 0; i < 260; i++) { g.fillStyle = i % 3 ? '#1c2818' : '#2e3f26'; g.fillRect((i * 67) % VW, 212 + (i * 41) % (VH - 212), 3, 2); }
    // three ranks of forest, each sliding at its own rate
    for (const [d, yy, col, lit, rate, w] of [[0, 196, '#2a3f36', '#37543f', 26, 46], [1, 206, '#20332c', '#2a4436', 52, 38], [2, 218, '#16241f', '#1d3128', 96, 30]]) {
      for (let i = 0; i < 28; i++) {
        const x = ((i * w * 1.7 - sp * rate / 100) % (VW + 200) + VW + 200) % (VW + 200) - 100;
        const h = 46 + ((i * 37) % 40) + d * 6;
        Art.limb(g, x, yy, x, yy - h * 0.5, 7 - d * 1.5, 4, '#241a12');
        Art.ell(g, x, yy - h * 0.62, w * 0.5, h * 0.46, col);
        Art.ell(g, x - w * 0.14, yy - h * 0.74, w * 0.32, h * 0.3, lit);
      }
    }
    // the road, running away to a vanishing point
    g.fillStyle = '#2e2a26'; Art.poly(g, [[240, 214], [400, 214], [700, VH], [-60, VH]], '#2e2a26');
    g.fillStyle = '#3a352f'; Art.poly(g, [[248, 216], [392, 216], [660, VH], [-20, VH]], '#3a352f');
    g.fillStyle = '#6b6258'; Art.poly(g, [[240, 214], [246, 214], [-60, VH], [-90, VH]], '#6b6258');
    g.fillStyle = '#6b6258'; Art.poly(g, [[394, 214], [400, 214], [730, VH], [700, VH]], '#6b6258');
    for (let i = 0; i < 9; i++) {                    // the dashes coming at you
      const q = ((i / 9) + (t * 0.5) % (1 / 9)) % 1;
      const e = q * q;
      const y = U.lerp(216, VH + 20, e), w2 = U.lerp(2, 16, e), h2 = U.lerp(3, 26, e);
      g.fillStyle = '#e8dfa8'; g.fillRect(320 - w2 / 2, y, w2, h2);
    }
    // the sign
    const sy = -60 + k * 520;
    if (sy > -40 && sy < VH) {
      const s2 = 0.5 + (sy + 60) / 420;
      g.fillStyle = '#3a2a18'; g.fillRect(470 + s2 * 30, sy, 7 * s2, 90 * s2);
      g.fillStyle = '#1c1008'; g.fillRect(430 + s2 * 10, sy - 40 * s2, 120 * s2, 44 * s2);
      g.fillStyle = '#2f6f3a'; g.fillRect(433 + s2 * 10, sy - 37 * s2, 114 * s2, 38 * s2);
      Font.draw(g, 'WOMBAT GROVE', 490 + s2 * 10, sy - 30 * s2, { scale: Math.max(1, Math.round(s2 * 1.4)), color: '#ffffff', align: 'center' });
      Font.draw(g, '5 km', 490 + s2 * 10, sy - 14 * s2, { scale: Math.max(1, Math.round(s2)), color: '#bfe8c6', align: 'center' });
    }
    // the cab you are sitting in
    g.fillStyle = '#1a1016'; g.fillRect(0, 0, VW, 26); g.fillRect(0, VH - 52, VW, 52);
    g.fillStyle = '#1a1016'; g.fillRect(0, 0, 38, VH); g.fillRect(VW - 38, 0, 38, VH);
    g.fillStyle = '#2a1c26'; g.fillRect(38, 22, VW - 76, 5); g.fillRect(34, VH - 56, VW - 68, 6);
    // the wheel
    g.fillStyle = '#241820'; g.fillRect(180, VH - 44, 280, 12);
    g.fillStyle = '#33232e'; g.fillRect(180, VH - 44, 280, 5);
    g.fillStyle = '#241820'; g.fillRect(300, VH - 34, 40, 34);
    // a mirror with a Wombachu hanging from it
    g.fillStyle = '#1c1008'; g.fillRect(96, 26, 74, 30);
    g.fillStyle = '#5f6e82'; g.fillRect(99, 29, 68, 24);
    g.fillStyle = '#3f4c5e'; g.fillRect(99, 29, 68, 9);
    const sw2 = Math.sin(t * 2.2) * 5;
    Sprites.wombachu(g, 133 + sw2, 74, 1.5);
    Font.draw(g, 'TASMANIA', 320, 8, { scale: 1, color: '#6b5a72', align: 'center' });
  }

  // ---- pulling up ----------------------------------------------------------
  function arrive(g) {
    drive(g);
    const k = U.clamp(t / 2.0, 0, 1);
    g.fillStyle = `rgba(10,6,16,${k.toFixed(2)})`; g.fillRect(0, 0, VW, VH);
    if (k > 0.35) Font.draw(g, 'WOMBAT GROVE', 320, 160, { scale: 3, color: '#ffe497', align: 'center', shadow: '#000' });
    if (k > 0.55) Font.draw(g, 'day one', 320, 196, { scale: 2, color: '#c2a176', align: 'center', shadow: '#000' });
  }

  function render(g) {
    if (phase === 'phone') {
      bedroom(g);
      phoneBody(g);
      g.save(); g.beginPath(); g.rect(PX, PY, PW, PH); g.clip();
      g.fillStyle = '#0d0d14'; g.fillRect(PX, PY, PW, PH);
      const off = (dragging ? dragY : 0) + slide * 288;
      feedCard(g, card, off);
      if (card + 1 < CLIPS.length) feedCard(g, card + 1, off + 288);
      if (card > 0) feedCard(g, card - 1, off - 288);
      statusBar(g);
      for (const h of hearts) { g.globalAlpha = 1 - h.t / 1.1; drawHeart(g, h.x, h.y, '#ff6b86', false); g.globalAlpha = 1; }
      g.restore();
      // the dots down the side, one per post
      for (let i = 0; i < CLIPS.length; i++) {
        g.fillStyle = i === card ? '#ffe497' : 'rgba(255,255,255,0.25)';
        g.fillRect(PX + PW + 8, PY + 120 + i * 10, 4, i === card ? 8 : 4);
      }
      hand(g);
    } else if (phase === 'plane') plane(g);
    else if (phase === 'drive') drive(g);
    else arrive(g);

    if (skipT > 2.2 && phase !== 'arrive') {
      g.fillStyle = 'rgba(10,6,16,0.6)'; g.fillRect(VW - 104, VH - 24, 96, 16);
      Font.draw(g, 'ESC TO SKIP', VW - 56, VH - 20, { scale: 1, color: '#9a94a8', align: 'center' });
    }
    FX.drawParticles(g, 0);
  }

  return { init, enter, update, render, press, move, release, skip, get phase() { return phase; } };
})();
