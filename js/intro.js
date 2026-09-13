// ---- How you got the job --------------------------------------------------
// Six beats: your room at midnight, a feed of wombat clips you scroll and
// like, the post that changes the week, a chat with whoever runs the grove, a
// website that should have been a warning, then the flight and the drive.
// Escape skips the lot; it only plays once.
const Intro = (() => {
  let G = null;
  const VW = 640, VH = 360;
  let phase = 'phone', t = 0, done = false;
  let card = 0, off = 0, dragY = 0, dragging = false, from = 0;
  const hearts = [], pops = [];
  let skipT = 0, applyR = null, heartR = null;
  let lastTap = 0, lastTapX = 0, lastTapY = 0;   // for the double-tap like
  let chatStep = 0, chatT = 0, replyR = null, linkR = null;
  let webT = 0, acceptR = null, popupOn = 2, closeR = null;   // two popups to get past
  let dodge = 0, dodgeX = 0;                                  // the close button runs once

  const CLIPS = [
    { cap: 'she found the good grass', tag: '@fernbottom', likes: 24100, kind: 'graze' },
    { cap: 'RUNNING WOMBAT. thats it thats the post', tag: '@tassie.daily', likes: 91300, kind: 'run' },
    { cap: 'bath night for bertie', tag: '@wombat.rescue', likes: 152800, kind: 'bath' },
    { cap: 'joey checks the weather', tag: '@burrowcam', likes: 68400, kind: 'joey' },
    { job: true, cap: 'HIRING: WOMBAT CARETAKER', tag: '@grove.tas', likes: 12, kind: 'job' },
  ];
  // the conversation, one bubble at a time
  const CHAT = [
    { who: 'her', s: 'you saw the post' },
    { who: 'her', s: 'good. most people scroll past' },
    { who: 'you', s: 'is the job real' },
    { who: 'her', s: 'realer than your job' },
    { who: 'her', s: 'eleven wombats. one grove. it has gone to seed' },
    { who: 'you', s: 'what is the pay' },
    { who: 'her', s: 'W$300 to start. the rest you grow' },
    { who: 'her', s: 'sign here. do not read it' },
    { who: 'link', s: 'grove-tas-hiring-realjob.biz' },
  ];

  function init(g) { G = g; }
  function enter() {
    phase = 'phone'; t = 0; card = 0; off = 0; done = false;
    chatStep = 0; chatT = 0; webT = 0; popupOn = 2; dodge = 0; dodgeX = 0; linkR = null;
    hearts.length = 0; pops.length = 0;
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
  const hit = (r, x, y, pad) => r && x > r.x - (pad || 0) && x < r.x + r.w + (pad || 0) && y > r.y - (pad || 0) && y < r.y + r.h + (pad || 0);
  function comic(x, y, n, col) { for (let i = 0; i < n; i++) pops.push({ x, y, a: U.rand(0, TAU), r: 0, t: 0, c: col || '#ffe497' }); }

  // ---- input ---------------------------------------------------------------
  function press(x, y) {
    skipT = 0;
    if (phase === 'chat') {
      if (linkR && hit(linkR, x, y, 8)) { Audio.play('whoosh'); comic(x, y, 10, '#7fc6e0'); phase = 'web'; webT = 0; popupOn = 2; dodge = 0; dodgeX = 0; return; }
      if (hit(replyR, x, y, 6)) { chatStep = Math.min(CHAT.length, chatStep + 1); chatT = 0; Audio.play('click'); comic(x, y, 6); }
      return;
    }
    if (phase === 'web') {
      if (popupOn && hit(closeR, x, y, 5)) {
        // the first one dodges your finger once before it will close
        if (popupOn === 2 && dodge < 1) { dodge = 1; Audio.play('error'); return; }
        popupOn--; dodge = 0; dodgeX = 0;
        Audio.play('click'); comic(x, y, 6, '#ff6b86'); return;
      }
      if (!popupOn && hit(acceptR, x, y, 6)) { Audio.play('cash'); comic(x, y, 14); phase = 'plane'; t = 0; }
      return;
    }
    if (phase !== 'phone') { next(); return; }
    const c = CLIPS[card];
    if (c.job && hit(applyR, x, y, 6)) { Audio.play('cash'); comic(x, y, 14); phase = 'chat'; chatStep = 1; chatT = 0; linkR = null; return; }
    if (!c.job && heartR && x > heartR.x - 8 && x < heartR.x + 56 && y > heartR.y - 10 && y < heartR.y + 30) { like(); return; }
    // double-tap anywhere on the clip to like it, the way a phone does
    const now = performance.now();
    const near = Math.abs(x - lastTapX) < 26 && Math.abs(y - lastTapY) < 26;
    if (!c.job && now - lastTap < 340 && near && y > SY + 30 && y < SY + SH - 80) {
      lastTap = 0;
      like(x, y);
      return;
    }
    lastTap = now; lastTapX = x; lastTapY = y;
    dragging = true; from = y;
  }
  function move(x, y) { if (dragging) dragY = y - from; }
  function release() {
    if (!dragging) return;
    dragging = false;
    const last = CLIPS.length - 1;
    if (dragY < -26 && card < last) { card++; off = dragY + 300; Audio.play('whoosh'); }
    else if (dragY > 26 && card > 0) { card--; off = dragY - 300; Audio.play('whoosh'); }
    else off = dragY;
    dragY = 0;
  }
  function like(px, py) {
    const c = CLIPS[card];
    const hx = px == null ? heartR.x + 8 : px, hy = py == null ? heartR.y + 4 : py;
    if (c.liked) {                                     // already liked: still pop, just no count
      burstT = 0.7; burstX = hx; burstY = hy;
      for (let i = 0; i < 6; i++) hearts.push({ x: hx + U.rand(-6, 6), y: hy, vx: U.rand(-30, 30), vy: U.rand(-80, -40), t: 0 });
      return;
    }
    c.liked = true; c.likes++;
    Audio.play('pop');
    burstT = 0.7; burstX = hx; burstY = hy;
    for (let i = 0; i < 14; i++) hearts.push({ x: hx + U.rand(-8, 8), y: hy, vx: U.rand(-46, 46), vy: U.rand(-104, -46), t: 0 });
    comic(hx, hy, 8, '#ff6b86');
  }
  // the big heart a double-tap throws up over the clip
  let burstT = 0, burstX = 0, burstY = 0;
  function drawLikeBurst(g) {
    if (burstT <= 0) return;
    const k = 1 - burstT / 0.7;
    const s = k < 0.3 ? U.lerp(0.3, 1.25, k / 0.3) : k < 0.45 ? U.lerp(1.25, 1, (k - 0.3) / 0.15) : 1;
    const a = k > 0.6 ? 1 - (k - 0.6) / 0.4 : 1;
    g.save();
    g.globalAlpha = a;
    g.translate(burstX, burstY - k * 14);
    g.scale(s, s);
    for (const [dx, dy, r, col] of [[0, 1, 0, '#7a1030'], [0, 0, 0, '#ff4d74'], [-3, -3, 0, '#ff8aa4']]) {
      Art.ell(g, -6 + dx, -5 + dy, 7, 7, col);
      Art.ell(g, 6 + dx, -5 + dy, 7, 7, col);
      Art.poly(g, [[-12 + dx, -2 + dy], [12 + dx, -2 + dy], [0 + dx, 13 + dy]], col);
      if (r === 0 && col === '#ff8aa4') break;
    }
    Art.ell(g, -5, -7, 3, 2.4, '#ffd0da');
    g.restore();
    g.globalAlpha = 1;
  }
  function next() {
    if (phase === 'plane') { phase = 'drive'; t = 0; }
    else if (phase === 'drive') { phase = 'arrive'; t = 0; }
    else if (phase === 'arrive') finish();
  }
  function skip() { finish(); }

  function update(dt) {
    if (burstT > 0) burstT = Math.max(0, burstT - dt);
    t += dt; skipT += dt; chatT += dt; webT += dt;
    off = Math.abs(off) < 1 ? 0 : off * Math.pow(0.0008, dt);
    for (let i = hearts.length - 1; i >= 0; i--) {
      const h = hearts[i]; h.t += dt; h.vy += 46 * dt; h.x += h.vx * dt; h.y += h.vy * dt;
      if (h.t > 1.1) hearts.splice(i, 1);
    }
    for (let i = pops.length - 1; i >= 0; i--) { const p = pops[i]; p.t += dt; p.r += dt * 150; if (p.t > 0.4) pops.splice(i, 1); }
    if (phase === 'chat' && chatT > 0.85 && chatStep < CHAT.length) { chatStep++; chatT = 0; Audio.play('click'); }
    if (phase === 'plane' && t > 4.4) { phase = 'drive'; t = 0; }
    if (phase === 'drive' && t > 5.6) { phase = 'arrive'; t = 0; }
    if (phase === 'arrive' && t > 2.0) finish();
  }

  // ---- your room -----------------------------------------------------------
  function poster(g, x, y, w, h, paper, frame, fn) {
    g.fillStyle = frame; g.fillRect(x - 3, y - 3, w + 6, h + 6);
    g.fillStyle = '#0f0a18'; g.fillRect(x - 4, y - 4, w + 8, 2);
    g.fillStyle = paper; g.fillRect(x, y, w, h);
    fn(x, y, w, h);
  }
  // a sewn wombat: low, wide, a blunt head and two round ears
  function plush(g, x, y, s, fur, hat) {
    Art.ell(g, x, y + 1.5 * s, 10 * s, 2.6 * s, 'rgba(0,0,0,0.32)');
    Art.ell(g, x - 1 * s, y - 4 * s, 9.5 * s, 5.4 * s, fur.d);          // body
    Art.ell(g, x - 1 * s, y - 4.8 * s, 8.6 * s, 4.6 * s, fur.b);
    Art.ell(g, x - 3.4 * s, y - 6.4 * s, 4.2 * s, 2.2 * s, fur.l);
    g.fillStyle = fur.d;                                                 // paws
    g.fillRect(x - 7 * s, y - 1.4 * s, 2.6 * s, 2.6 * s); g.fillRect(x + 1 * s, y - 1.4 * s, 2.6 * s, 2.6 * s);
    Art.ell(g, x + 6.4 * s, y - 6.6 * s, 4.8 * s, 4.2 * s, fur.d);       // head
    Art.ell(g, x + 6.4 * s, y - 7 * s, 4.2 * s, 3.6 * s, fur.b);
    Art.ell(g, x + 4 * s, y - 9.6 * s, 1.9 * s, 1.7 * s, fur.d);         // ears
    Art.ell(g, x + 8.8 * s, y - 9.8 * s, 1.9 * s, 1.7 * s, fur.d);
    Art.ell(g, x + 4 * s, y - 9.6 * s, 1 * s, 0.9 * s, fur.l);
    Art.ell(g, x + 8.8 * s, y - 9.8 * s, 1 * s, 0.9 * s, fur.l);
    g.fillStyle = '#1a1208';
    g.fillRect(x + 4.6 * s, y - 7.6 * s, 1.1 * s, 1.1 * s); g.fillRect(x + 7.8 * s, y - 7.8 * s, 1.1 * s, 1.1 * s);
    Art.ell(g, x + 9.6 * s, y - 6 * s, 1.5 * s, 1.1 * s, '#2a1c18');     // snout
    g.fillStyle = fur.l; g.fillRect(x + 5.2 * s, y - 4.4 * s, 4 * s, 0.8 * s);   // a stitched smile
    if (hat) { g.fillStyle = hat; g.fillRect(x + 3 * s, y - 11.4 * s, 7 * s, 1.8 * s); g.fillRect(x + 4.6 * s, y - 12.8 * s, 4 * s, 1.8 * s); }
  }
  const FUR1 = { l: '#d8a487', b: '#b07f5e', d: '#8a5f45' };
  const FUR2 = { l: '#cfc6bb', b: '#a89c90', d: '#7e7468' };
  const FUR3 = { l: '#f2e0a8', b: '#d8bf74', d: '#a89049' };
  function bedroom(g) {
    g.fillStyle = '#241a44'; g.fillRect(0, 0, VW, VH);
    g.fillStyle = '#2b2050'; g.fillRect(0, 0, VW, 258);
    for (let x = 0; x < VW; x += 26) { g.fillStyle = 'rgba(255,255,255,0.025)'; g.fillRect(x, 0, 12, 258); }
    g.fillStyle = '#1d1638'; g.fillRect(0, 252, VW, 8);
    // ---- left: the window, a gum outside, and a shelf of toys -------------
    g.fillStyle = '#140d26'; g.fillRect(14, 16, 150, 116);
    g.fillStyle = '#1b2748'; g.fillRect(18, 20, 142, 108);
    for (let i = 0; i < 30; i++) { const sx = 22 + (i * 47) % 134, sy = 24 + (i * 31) % 100; g.fillStyle = i % 3 ? '#7f95cc' : '#ffffff'; g.fillRect(sx, sy, 1, 1); }
    Art.ell(g, 128, 48, 13, 13, '#e8eeff'); Art.ell(g, 132, 44, 5, 5, '#cdd8f2');
    g.fillStyle = '#0d1428'; g.fillRect(44, 86, 8, 42);
    for (const [ox, oy, r] of [[36, 82, 17], [58, 76, 19], [48, 64, 15]]) Art.ell(g, ox, oy, r, r * 0.66, '#12203a');
    g.fillStyle = '#0f0a18'; g.fillRect(10, 12, 158, 5); g.fillRect(10, 128, 158, 7); g.fillRect(86, 20, 5, 108);
    g.globalAlpha = 0.1; g.fillStyle = '#9fb6ff'; Art.poly(g, [[18, 128], [160, 128], [200, 252], [0, 252]], '#9fb6ff'); g.globalAlpha = 1;
    g.fillStyle = '#2e2140'; g.fillRect(8, 176, 176, 9);
    g.fillStyle = '#3d2c56'; g.fillRect(8, 176, 176, 3);
    g.fillStyle = '#241a34'; g.fillRect(14, 185, 7, 7); g.fillRect(172, 185, 7, 7);
    plush(g, 32, 176, 1.6, FUR1, '#e04a3c');
    plush(g, 84, 176, 1.4, FUR2, null);
    plush(g, 132, 176, 1.5, FUR3, '#4fa6be');
    // a little stand with the Wombachu on it
    g.fillStyle = '#b8891a'; g.fillRect(160, 156, 22, 20); g.fillStyle = '#f2cf3a'; g.fillRect(162, 158, 18, 16);
    Sprites.wombachu(g, 171, 166, 0.85);
    // ---- right: posters, a desk, a lamp -----------------------------------
    poster(g, 440, 22, 116, 96, '#d8c49a', '#3a2a52', (x, y, w, h) => {
      Sprites.blit(g, x + w / 2, y + h - 16, 'idle', 0, 'brown', 1, 'adult', 1.5);
      Font.draw(g, 'WOMBATS', x + w / 2, y + 8, { scale: 2, color: '#6b3d12', align: 'center' });
      Font.draw(g, 'OF TASMANIA', x + w / 2, y + h - 12, { scale: 1, color: '#8a5c33', align: 'center' });
    });
    poster(g, 568, 26, 62, 78, '#e8d2a0', '#4a3a22', (x, y, w, h) => {
      Font.draw(g, 'TOP 10', x + w / 2, y + 6, { scale: 1, color: '#8a5c33', align: 'center' });
      Font.draw(g, 'CUBES', x + w / 2, y + 18, { scale: 2, color: '#6b3d12', align: 'center' });
      for (let i = 0; i < 5; i++) { g.fillStyle = '#8a6134'; g.fillRect(x + 8 + i * 10, y + 40, 7, 7); g.fillStyle = '#a3763f'; g.fillRect(x + 8 + i * 10, y + 40, 7, 2); }
      for (let i = 0; i < 5; i++) { g.fillStyle = '#8a6134'; g.fillRect(x + 8 + i * 10, y + 54, 7, 7); g.fillStyle = '#a3763f'; g.fillRect(x + 8 + i * 10, y + 54, 7, 2); }
    });
    poster(g, 440, 132, 78, 62, '#2a3f6b', '#1c2a44', (x, y, w, h) => {
      for (let i = 0; i < 24; i++) { g.fillStyle = 'rgba(255,255,255,0.5)'; g.fillRect(x + (i * 29) % w, y + (i * 17) % h, 1, 1); }
      Sprites.blit(g, x + w / 2, y + h - 8, 'happy', Math.floor(t * 3), 'starlit', 1, 'adult', 1.1);
      Font.draw(g, 'BELIEVE', x + w / 2, y + 6, { scale: 1, color: '#cdd8f2', align: 'center' });
    });
    g.fillStyle = '#241a34'; g.fillRect(430, 206, 210, 11);
    g.fillStyle = '#3a2a52'; g.fillRect(430, 206, 210, 4);
    g.fillStyle = '#2a1f3c'; g.fillRect(446, 217, 9, 42); g.fillRect(614, 217, 9, 42);
    g.fillStyle = '#4fa6be'; g.fillRect(462, 188, 18, 18); g.fillStyle = '#8fd4e4'; g.fillRect(462, 188, 18, 4);
    g.fillStyle = '#8fd4e4'; g.fillRect(480, 193, 5, 8);
    g.fillStyle = '#d8c49a'; g.fillRect(498, 196, 30, 10); g.fillStyle = '#efdcb4'; g.fillRect(498, 196, 30, 3);   // a notebook
    g.fillStyle = '#3a2a52'; g.fillRect(586, 162, 7, 44);
    g.fillStyle = '#e8c060'; Art.poly(g, [[572, 162], [606, 162], [612, 136], [566, 136]], '#e8c060');
    g.fillStyle = '#f6dc98'; Art.poly(g, [[570, 140], [608, 140], [610, 136], [566, 136]], '#f6dc98');
    g.globalAlpha = 0.15; g.fillStyle = '#ffe497'; Art.poly(g, [[566, 138], [612, 138], [640, 216], [520, 216]], '#ffe497'); g.globalAlpha = 1;
    // ---- string lights across the top -------------------------------------
    for (let i = 0; i < 22; i++) {
      const lx = 10 + i * 29, ly = 8 + Math.sin(i * 0.9) * 5;
      g.fillStyle = '#3a3050'; g.fillRect(lx, ly, 29, 1);
      const on = (Math.floor(t * 2 + i * 0.6) % 5) !== 0;
      const col = ['#ffd36b', '#ff8fb0', '#8fd4e4'][i % 3];
      if (on) { g.globalAlpha = 0.2; g.fillStyle = col; g.fillRect(lx + 7, ly - 5, 14, 15); g.globalAlpha = 1; }
      g.fillStyle = on ? col : '#4a4060'; g.fillRect(lx + 12, ly + 1, 3, 5);
    }
    // ---- the bed you are lying on -----------------------------------------
    g.fillStyle = '#33254f'; g.fillRect(0, 258, VW, VH - 258);
    g.fillStyle = '#402f63'; g.fillRect(0, 258, VW, 12);
    for (let i = 0; i < 6; i++) { g.fillStyle = '#3a2b5a'; g.fillRect(-20 + i * 128, 278, 108, 11); }
    g.fillStyle = '#493873'; g.fillRect(0, 300, 210, 60);
    for (let i = 0; i < 5; i++) { g.fillStyle = '#55438a'; g.fillRect(8 + i * 40, 306 + (i % 2) * 9, 32, 6); }
    g.fillStyle = '#493873'; g.fillRect(440, 296, 200, 64);
    for (let i = 0; i < 4; i++) { g.fillStyle = '#55438a'; g.fillRect(452 + i * 46, 304 + (i % 2) * 9, 36, 6); }
    plush(g, 96, 350, 1.9, FUR1, null);
    plush(g, 560, 348, 1.6, FUR3, '#e04a3c');
    // the glow of the screen over everything
    const gr = g.createLinearGradient(0, 70, 0, 350);
    gr.addColorStop(0, 'rgba(140,190,255,0)'); gr.addColorStop(0.5, 'rgba(150,200,255,0.16)'); gr.addColorStop(1, 'rgba(140,190,255,0)');
    g.fillStyle = gr; g.fillRect(0, 70, VW, 280);
    g.fillStyle = 'rgba(12,7,22,0.4)'; g.fillRect(0, 0, VW, VH);
  }

  // ---- the phone -----------------------------------------------------------
  const PX = 232, PY = 14, PW = 176, PH = 334;
  const SX = PX + 6, SY = PY + 6, SW = PW - 12, SH = PH - 12;
  function phoneBody(g) {
    const n = 10;
    // the steel rail, chamfered rather than rounded
    for (const [inset, col] of [[-6, '#0a0710'], [-3, '#8d93a6'], [-1, '#d6dae6']]) {
      const x = PX + inset, y = PY + inset, w = PW - inset * 2, h = PH - inset * 2;
      g.fillStyle = col;
      g.fillRect(x + n, y, w - n * 2, h);
      g.fillRect(x, y + n, w, h - n * 2);
      g.fillRect(x + 4, y + 4, w - 8, h - 8);
    }
    g.fillStyle = '#6f7484'; g.fillRect(PX - 3, PY + n, 2, PH - n * 2);
    g.fillStyle = '#b9bfd0'; g.fillRect(PX - 6, PY + 52, 3, 22); g.fillRect(PX - 6, PY + 84, 3, 34);   // side buttons
    g.fillStyle = '#b9bfd0'; g.fillRect(PX + PW + 3, PY + 70, 3, 42);
    g.fillStyle = '#05040a'; g.fillRect(PX, PY, PW, PH);                                              // the glass
    g.fillStyle = '#0d0d14'; g.fillRect(SX, SY, SW, SH);
  }
  function phoneChrome(g, dark) {
    // the island, the bar, and a sheen down the glass
    g.fillStyle = '#05040a'; g.fillRect(PX + PW / 2 - 26, SY + 3, 52, 13);
    g.fillStyle = '#171722'; g.fillRect(PX + PW / 2 + 14, SY + 6, 6, 6);
    Font.draw(g, '23:41', SX + 8, SY + 5, { scale: 1, color: dark ? '#1c1c26' : '#cfd6e8', align: 'left' });
    for (let i = 0; i < 4; i++) { g.fillStyle = dark ? '#1c1c26' : '#cfd6e8'; g.fillRect(SX + SW - 40 + i * 4, SY + 10 - i * 2, 3, 3 + i * 2); }
    g.fillStyle = dark ? '#1c1c26' : '#cfd6e8'; g.fillRect(SX + SW - 22, SY + 5, 14, 7);
    g.fillStyle = '#7de08a'; g.fillRect(SX + SW - 20, SY + 7, 6, 3);
    g.fillStyle = dark ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.55)';
    g.fillRect(PX + PW / 2 - 30, SY + SH - 8, 60, 4);                                                  // home indicator
    g.globalAlpha = 0.05; g.fillStyle = '#ffffff';
    Art.poly(g, [[PX + 14, PY], [PX + 58, PY], [PX + 20, PY + PH], [PX - 2, PY + PH]], '#ffffff');
    g.globalAlpha = 1;
  }

  // ---- the clips -----------------------------------------------------------
  function clipArt(g, kind, x, y, w, h, tt) {
    g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
    const step = Math.floor(tt * 8);
    if (kind === 'job') {
      g.fillStyle = '#1f3a24'; g.fillRect(x, y, w, h);
      for (let i = 0; i < 80; i++) { g.fillStyle = ['#2c5230', '#3a6b3c', '#1a2e1e'][i % 3]; g.fillRect(x + (i * 37) % w, y + (i * 53) % h, 3, 3); }
      g.fillStyle = '#4a7a48'; g.fillRect(x, y + h - 28, w, 28);
      g.fillStyle = '#5d8f45'; g.fillRect(x, y + h - 28, w, 4);
      Sprites.blit(g, x + w * 0.32, y + h - 8, 'graze', step, 'brown', 1, 'adult', 1.3);
      Sprites.blit(g, x + w * 0.68, y + h - 6, 'idle', step, 'sand', -1, 'joey', 1.1);
      g.fillStyle = 'rgba(10,6,18,0.55)'; g.fillRect(x, y, w, 24);
      Font.draw(g, 'WOMBAT GROVE, TAS', x + w / 2, y + 8, { scale: 1, color: '#ffe497', align: 'center' });
    } else if (kind === 'graze') {
      g.fillStyle = '#5d8f45'; g.fillRect(x, y, w, h);
      g.fillStyle = '#79ae58'; g.fillRect(x, y, w, h * 0.42);
      g.fillStyle = '#8cc169'; g.fillRect(x, y + h * 0.42 - 4, w, 4);
      for (let i = 0; i < 110; i++) { g.fillStyle = i % 2 ? '#4a7a38' : '#8cc169'; g.fillRect(x + (i * 29) % w, y + h * 0.38 + (i * 17) % (h * 0.62), 2, 4); }
      Sprites.blit(g, x + w / 2, y + h - 12, 'graze', step, 'brown', 1, 'adult', 1.9);
    } else if (kind === 'run') {
      g.fillStyle = '#6b5a3a'; g.fillRect(x, y, w, h);
      g.fillStyle = '#8a7a52'; g.fillRect(x, y, w, h * 0.42);
      for (let i = 0; i < 10; i++) { g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(x + ((i * 61 - tt * 280) % (w + 50)) - 25, y + 18 + (i * 23) % (h - 36), 26, 2); }
      Sprites.blit(g, x + w * 0.46 + Math.sin(tt * 6) * 6, y + h - 14, 'run', step, 'sand', 1, 'adult', 2.1);
      for (let i = 0; i < 6; i++) { g.fillStyle = 'rgba(190,160,120,0.5)'; g.fillRect(x + w * 0.22 - i * 10, y + h - 16 + (i % 2) * 3, 6, 3); }
    } else if (kind === 'bath') {
      g.fillStyle = '#cfd8e0'; g.fillRect(x, y, w, h);
      for (let i = 0; i < 40; i++) { g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(x + (i % 8) * 22, y + Math.floor(i / 8) * 22, 20, 20); }
      g.fillStyle = '#b4c0cc'; g.fillRect(x, y + h * 0.58, w, h * 0.42);
      g.fillStyle = '#e8eef4'; g.fillRect(x + 12, y + h - 56, w - 24, 48);
      g.fillStyle = '#7fc6e0'; g.fillRect(x + 16, y + h - 48, w - 32, 34);
      g.fillStyle = '#a9dcee'; g.fillRect(x + 16, y + h - 48, w - 32, 4);
      Sprites.blit(g, x + w / 2, y + h - 20, 'sit', step % 3, 'grey', 1, 'adult', 1.7);
      for (let i = 0; i < 11; i++) {
        const bx = x + 20 + (i * 31) % (w - 40), by = y + h - 18 - ((tt * 26 + i * 14) % 48);
        g.fillStyle = 'rgba(255,255,255,0.85)'; g.fillRect(bx, by, 3, 3);
      }
    } else {
      g.fillStyle = '#3a2a1c'; g.fillRect(x, y, w, h);
      g.fillStyle = '#4f3a26'; g.fillRect(x, y + h * 0.48, w, h * 0.52);
      g.fillStyle = '#5f4830'; g.fillRect(x, y + h * 0.48, w, 4);
      Art.ell(g, x + w / 2, y + h - 4, w * 0.32, h * 0.3, '#241810');
      const peek = Math.sin(tt * 2) > 0 ? 2 : 6;
      Sprites.blit(g, x + w / 2, y + h - 10 + peek, 'idle', step, 'soot', 1, 'joey', 1.6);
      g.fillStyle = '#6b8f45'; for (let i = 0; i < 18; i++) g.fillRect(x + (i * 23) % w, y + h * 0.48 + (i % 3) * 5, 3, 7);
    }
    g.restore();
  }
  const HEART = ['0110110', '1111111', '1111111', '0111110', '0011100', '0001000'];
  function drawHeart(g, x, y, col, lit) {
    const s = 2;
    g.fillStyle = col;
    HEART.forEach((row, ry) => { for (let rx = 0; rx < row.length; rx++) if (row[rx] === '1') g.fillRect(x + rx * s, y + ry * s, s, s); });
    if (lit) { g.fillStyle = '#ff9db0'; g.fillRect(x + s, y + s, s * 2, s); }
  }
  const fmt = (n) => (n >= 1000 ? (n / 1000).toFixed(1) + 'K' : String(n));

  function feedCard(g, i, o) {
    const c = CLIPS[i];
    const x = SX + 4, y = SY + 22 + o, w = SW - 8, h = 284;
    if (y > SY + SH || y + h < SY) return;
    g.fillStyle = '#15151e'; g.fillRect(x, y, w, h);
    g.fillStyle = '#23232f'; g.fillRect(x, y, w, 18);
    g.fillStyle = c.job ? '#7de08a' : '#7fa8c0'; g.fillRect(x + 4, y + 3, 12, 12);
    g.fillStyle = '#15151e'; g.fillRect(x + 6, y + 5, 8, 8);
    Font.draw(g, c.tag, x + 21, y + 6, { scale: 1, color: '#e6e6f0', align: 'left' });
    clipArt(g, c.kind, x, y + 18, w, 170, t + i);
    if (!c.job) {
      g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(x + 4, y + 182, w - 8, 2);
      g.fillStyle = '#ffffff'; g.fillRect(x + 4, y + 182, (w - 8) * ((t * 0.22 + i * 0.3) % 1), 2);
    }
    const ay = y + 192;
    if (c.job) {
      Font.draw(g, 'WOMBAT', x + 6, ay + 2, { scale: 2, color: '#ffe497', align: 'left' });
      Font.draw(g, 'CARETAKER', x + 6, ay + 18, { scale: 2, color: '#ffe497', align: 'left' });
      Font.draw(g, 'live in. feed them. that', x + 6, ay + 36, { scale: 1, color: '#b9b6c6', align: 'left' });
      Font.draw(g, 'is the whole job.', x + 6, ay + 46, { scale: 1, color: '#b9b6c6', align: 'left' });
      const bob = Math.round(Math.sin(t * 4) * 2);
      const bx = x + 8, by = ay + 58 + bob, bw = w - 16, bh = 28;
      applyR = { x: bx, y: by, w: bw, h: bh };
      g.fillStyle = '#0a2e14'; g.fillRect(bx, by + 4, bw, bh);
      g.fillStyle = '#2f8f42'; g.fillRect(bx, by, bw, bh);
      g.fillStyle = '#7de08a'; g.fillRect(bx, by, bw, 7);
      Font.draw(g, 'APPLY', bx + bw / 2, by + 9, { scale: 2, color: '#06210c', align: 'center' });
    } else {
      const hx = x + 8, hy = ay + 2;
      heartR = { x: hx, y: hy };
      drawHeart(g, hx, hy, c.liked ? '#e0405a' : '#2c2c3a', c.liked);
      Font.draw(g, fmt(c.likes), hx + 20, hy + 4, { scale: 1, color: c.liked ? '#ff8fa0' : '#9a97a8', align: 'left' });
      Font.draw(g, 'DOUBLE TAP', x + w - 7, hy + 4, { scale: 1, color: '#55536a', align: 'right' });
      Font.wrap(c.cap, w - 14, 1).slice(0, 3).forEach((l, k) => Font.draw(g, l, x + 7, ay + 26 + k * 11, { scale: 1, color: '#cfccdc', align: 'left' }));
      Font.draw(g, 'SWIPE UP', x + w / 2, y + h - 16, { scale: 1, color: '#4a4860', align: 'center' });
    }
  }

  // ---- the chat ------------------------------------------------------------
  function chat(g) {
    g.fillStyle = '#0e1116'; g.fillRect(SX, SY, SW, SH);
    g.fillStyle = '#1b2028'; g.fillRect(SX, SY + 18, SW, 24);
    g.fillStyle = '#6b4a94'; g.fillRect(SX + 6, SY + 22, 16, 16);
    g.fillStyle = '#ffe497'; g.fillRect(SX + 10, SY + 27, 3, 3); g.fillRect(SX + 16, SY + 27, 3, 3);
    Font.draw(g, 'GROVE KEEPER', SX + 27, SY + 24, { scale: 1, color: '#e6e6f0', align: 'left' });
    Font.draw(g, 'online', SX + 27, SY + 33, { scale: 1, color: '#7de08a', align: 'left' });
    const shown = Math.min(chatStep, CHAT.length);
    g.save(); g.beginPath(); g.rect(SX, SY + 42, SW, SH - 42); g.clip();
    let y = SY + 50 - Math.max(0, shown - 6) * 26;
    for (let i = 0; i < shown; i++) {
      const m = CHAT[i];
      const lines = Font.wrap(m.s, SW - 56, 1);
      const bw = Math.max(...lines.map((l) => Font.width(l, 1))) + 14;
      const bh = lines.length * 11 + 10;
      const mine = m.who === 'you';
      const bx = m.who === 'link' ? SX + 10 : mine ? SX + SW - 8 - bw : SX + 8;
      const pop = i === chatStep - 1 ? 1 + Math.max(0, 0.25 - chatT) * 1.2 : 1;
      g.save(); g.translate(bx + bw / 2, y + bh / 2); g.scale(pop, pop); g.translate(-bx - bw / 2, -y - bh / 2);
      if (m.who === 'link') {
        g.fillStyle = '#1a2a3c'; g.fillRect(SX + 8, y - 2, SW - 16, bh + 22);
        g.fillStyle = '#2f5f8a'; g.fillRect(SX + 8, y - 2, SW - 16, 3);
        Font.draw(g, 'grove-tas-hiring', SX + 16, y + 4, { scale: 1, color: '#7fc6e0', align: 'left' });
        Font.draw(g, '-realjob.biz', SX + 16, y + 15, { scale: 1, color: '#7fc6e0', align: 'left' });
        g.fillStyle = '#4a90c8'; g.fillRect(SX + 16, y + 25, 96, 1);
        const bob = Math.round(Math.sin(t * 5) * 2);
        linkR = { x: SX + 8, y: y - 2, w: SW - 16, h: bh + 34 };
        Font.draw(g, 'TAP TO OPEN', SX + SW / 2, y + 30 + bob, { scale: 1, color: '#ffe497', align: 'center' });
        y += bh + 30;
      } else {
        g.fillStyle = mine ? '#2f6f9e' : '#2a2433'; g.fillRect(bx, y, bw, bh);
        g.fillStyle = mine ? '#4a92c6' : '#3a3346'; g.fillRect(bx, y, bw, 2);
        g.fillStyle = mine ? '#1c4a6e' : '#1c1826'; g.fillRect(bx, y + bh - 2, bw, 2);
        lines.forEach((l, k) => Font.draw(g, l, bx + 7, y + 5 + k * 11, { scale: 1, color: mine ? '#e8f4ff' : '#d6d2e2', align: 'left' }));
        y += bh + 6;
      }
      g.restore();
    }
    if (chatStep < CHAT.length && CHAT[chatStep] && CHAT[chatStep].who !== 'you') {
      g.fillStyle = '#2a2433'; g.fillRect(SX + 8, y, 34, 16);
      for (let i = 0; i < 3; i++) { const up = Math.max(0, Math.sin(t * 7 - i * 0.7)) * 3; g.fillStyle = '#7a7490'; g.fillRect(SX + 14 + i * 8, y + 9 - up, 4, 4); }
    }
    g.restore();
    if (chatStep < CHAT.length) {
      replyR = { x: SX + 8, y: SY + SH - 30, w: SW - 16, h: 20 };
      g.fillStyle = '#1b2028'; g.fillRect(replyR.x, replyR.y, replyR.w, replyR.h);
      Font.draw(g, 'TAP TO REPLY', SX + SW / 2, replyR.y + 6, { scale: 1, color: '#7a7490', align: 'center' });
    }
  }

  // ---- the website ---------------------------------------------------------
  function web(g) {
    const blink = Math.floor(webT * 3) % 2;
    g.fillStyle = '#101a3a'; g.fillRect(SX, SY, SW, SH);
    for (let i = 0; i < 60; i++) { g.fillStyle = i % 2 ? '#17244a' : '#0d1530'; g.fillRect(SX, SY + i * 6, SW, 3); }
    // the browser bar
    g.fillStyle = '#2a2a34'; g.fillRect(SX, SY + 18, SW, 16);
    g.fillStyle = '#3f3f4c'; g.fillRect(SX + 4, SY + 21, SW - 8, 10);
    Font.draw(g, 'grove-tas-hiring.biz.ru', SX + 15, SY + 23, { scale: 1, color: '#b9b6c6', align: 'left' });
    g.fillStyle = '#e04a3c'; g.fillRect(SX + 6, SY + 22, 6, 7);            // NOT SECURE
    Font.draw(g, '!', SX + 9, SY + 23, { scale: 1, color: '#ffffff', align: 'center' });
    let y = SY + 40;
    // a banner that will not sit still
    g.fillStyle = blink ? '#e0405a' : '#f2cf3a'; g.fillRect(SX + 4, y, SW - 8, 22);
    Font.draw(g, 'CONGRATULATIONS!!', SX + SW / 2 + Math.sin(webT * 9) * 2, y + 7, { scale: 1, color: blink ? '#ffffff' : '#3a2606', align: 'center' });
    y += 28;
    Font.draw(g, 'YOU ARE VISITOR', SX + SW / 2, y, { scale: 1, color: '#7de08a', align: 'center' });
    Font.draw(g, '000000001', SX + SW / 2, y + 12, { scale: 2, color: '#7de08a', align: 'center' });
    Font.draw(g, 'AS SEEN ON TELEVISION*', SX + SW / 2, y + 30, { scale: 1, color: '#5f5c74', align: 'center' });
    y += 42;
    g.fillStyle = '#1c2a52'; g.fillRect(SX + 6, y, SW - 12, 62);
    g.fillStyle = '#3a5a9a'; g.fillRect(SX + 6, y, SW - 12, 2);
    Font.draw(g, 'WOMBAT CARETAKER', SX + SW / 2, y + 6, { scale: 1, color: '#ffe497', align: 'center' });
    Font.draw(g, 'NO EXPERIENCE, NO INTERVIEW', SX + SW / 2, y + 20, { scale: 1, color: '#cfccdc', align: 'center' });
    Font.draw(g, 'NO BACKGROUND CHECK', SX + SW / 2, y + 31, { scale: 1, color: '#cfccdc', align: 'center' });
    Font.draw(g, 'ONE (1) GROVE INCLUDED', SX + SW / 2, y + 42, { scale: 1, color: '#cfccdc', align: 'center' });
    y += 70;
    // the small print that scrolls past
    g.save(); g.beginPath(); g.rect(SX + 6, y, SW - 12, 14); g.clip();
    Font.draw(g, 'BY SIGNING YOU ACCEPT THE WOMBATS AND WHATEVER THEY DO AND WAIVE ALL CLAIM TO YOUR PREVIOUS LIFE   ', SX + 6 + ((-webT * 30) % 700), y + 3, { scale: 1, color: '#6a6880', align: 'left' });
    g.restore();
    y += 20;
    const bob = Math.round(Math.sin(webT * 5) * 2);
    acceptR = { x: SX + 10, y: y + bob, w: SW - 20, h: 34 };
    g.fillStyle = '#0a2e14'; g.fillRect(acceptR.x, acceptR.y + 5, acceptR.w, acceptR.h);
    g.fillStyle = blink ? '#3fbf5a' : '#2f8f42'; g.fillRect(acceptR.x, acceptR.y, acceptR.w, acceptR.h);
    g.fillStyle = '#7de08a'; g.fillRect(acceptR.x, acceptR.y, acceptR.w, 8);
    Font.draw(g, 'I ACCEPT', acceptR.x + acceptR.w / 2, acceptR.y + 12, { scale: 2, color: '#06210c', align: 'center' });
    Font.draw(g, 'YOU AGREE TO EVERYTHING', SX + SW / 2, acceptR.y + 42, { scale: 1, color: '#7a7490', align: 'center' });
    y = acceptR.y + 56;
    // a countdown that never actually runs out
    g.fillStyle = '#2a1030'; g.fillRect(SX + 6, y, SW - 12, 22);
    g.fillStyle = '#5a2050'; g.fillRect(SX + 6, y, SW - 12, 2);
    const secs = 59 - Math.floor(webT * 1.4) % 60;
    Font.draw(g, 'OFFER ENDS IN', SX + 12, y + 8, { scale: 1, color: '#d89ad0', align: 'left' });
    Font.draw(g, `00:${String(secs).padStart(2, '0')}`, SX + SW - 12, y + 6, { scale: 2, color: blink ? '#ff6a6a' : '#ffd06a', align: 'right' });
    y += 28;
    // testimonials from people who definitely exist
    for (const [who, what] of [['b.wombat44', '"i have 9 wombats now"'], ['grove_fan', '"my family is gone"'], ['t. keeper', '"best decision ever!!"']]) {
      g.fillStyle = '#16224a'; g.fillRect(SX + 6, y, SW - 12, 20);
      Art.ell(g, SX + 15, y + 10, 6, 6, '#3a5a9a');
      Font.draw(g, who.toUpperCase(), SX + 25, y + 3, { scale: 1, color: '#7de08a', align: 'left' });
      Font.draw(g, what.toUpperCase(), SX + 25, y + 11, { scale: 1, color: '#9a97ae', align: 'left' });
      for (let st = 0; st < 5; st++) { g.fillStyle = '#f2cf3a'; g.fillRect(SX + SW - 18 - st * 6, y + 4, 4, 4); }
      y += 24;
    }
    // three buttons that are all the same button
    for (const [lab, col] of [['DOWNLOAD', '#2f6f9f'], ['FREE WOMBAT', '#8a2f7f'], ['CLICK HERE', '#9f5a1f']]) {
      g.fillStyle = col; g.fillRect(SX + 8, y, SW - 16, 18);
      g.fillStyle = U.shade(col, 0.4); g.fillRect(SX + 8, y, SW - 16, 3);
      Font.draw(g, lab, SX + SW / 2, y + 6, { scale: 1, color: '#ffffff', align: 'center' });
      y += 22;
    }
    Font.draw(g, 'C 1998 GROVE TAS PTY LTD', SX + SW / 2, y + 4, { scale: 1, color: '#4a4860', align: 'center' });
    Font.draw(g, '*NOT SEEN ON TELEVISION', SX + SW / 2, y + 13, { scale: 1, color: '#3a3850', align: 'center' });
    Font.draw(g, 'NOT A REGISTERED EMPLOYER', SX + SW / 2, y + 22, { scale: 1, color: '#3a3850', align: 'center' });
    // the popups you have to get past first. The second one dodges your finger.
    if (popupOn) {
      g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillRect(SX, SY, SW, SH);
      if (popupOn === 2) alertBox(g, 'ALERT', SY + 74, [
        ['11 WOMBATS ARE', 1, '#2a2433'],
        ['WAITING IN YOUR AREA', 1, '#2a2433'],
        ['RIGHT NOW', 2, '#c02030'],
      ], true);
      else winBox(g, SY + 92);
    }
  }
  // A grey system dialog with a tiny red X. The X moves the first time you
  // reach for it, which is the whole joke.
  function alertBox(g, title, py, lines, wombats) {
    const px = SX + 10, pw = SW - 20, ph = wombats ? 104 : 84;
    const jog = dodge ? -38 : 0;   // it shuffles left, still just reachable
    g.fillStyle = '#0a0710'; g.fillRect(px - 3, py - 3, pw + 6, ph + 6);
    g.fillStyle = '#d8d4e0'; g.fillRect(px, py, pw, ph);
    g.fillStyle = '#2f5f8a'; g.fillRect(px, py, pw, 14);
    Font.draw(g, title, px + 5, py + 4, { scale: 1, color: '#ffffff', align: 'left' });
    for (const bx of [px + pw - 38, px + pw - 26]) {                  // dead minimise/maximise
      g.fillStyle = '#b4b0bc'; g.fillRect(bx, py + 2, 11, 10);
      g.fillStyle = '#6a6678'; g.fillRect(bx + 2, py + 8, 7, 2);
    }
    closeR = { x: px + pw - 14 + jog, y: py + 2, w: 11, h: 10 };
    g.fillStyle = '#e04a3c'; g.fillRect(closeR.x, closeR.y, closeR.w, closeR.h);
    g.fillStyle = '#ff8a7c'; g.fillRect(closeR.x, closeR.y, closeR.w, 2);
    Font.draw(g, 'x', closeR.x + 5, closeR.y + 2, { scale: 1, color: '#ffffff', align: 'center' });
    let ly = py + 20;
    for (const [txt, sc, col] of lines) {
      Font.draw(g, txt, px + pw / 2, ly, { scale: sc, color: col, align: 'center' });
      ly += sc === 2 ? 18 : 12;
    }
    if (wombats) {
      Sprites.blit(g, px + pw / 2 - 22, py + ph - 6, 'happy', Math.floor(webT * 8), 'pale', 1, 'adult', 1.1);
      Sprites.blit(g, px + pw / 2 + 24, py + ph - 6, 'idle', Math.floor(webT * 6), 'brown', -1, 'adult', 1);
    }
    if (dodge) Font.draw(g, 'NICE TRY', px + pw / 2, py + ph - 12, { scale: 1, color: '#c02030', align: 'center' });
  }
  // The second one is a prize draw you have definitely already won.
  function winBox(g, py) {
    const px = SX + 8, pw = SW - 16, ph = 120;
    const blink = Math.floor(webT * 4) % 2;
    g.fillStyle = '#0a0710'; g.fillRect(px - 3, py - 3, pw + 6, ph + 6);
    g.fillStyle = '#f2ead8'; g.fillRect(px, py, pw, ph);
    g.fillStyle = blink ? '#c02030' : '#8a1020'; g.fillRect(px, py, pw, 14);
    Font.draw(g, 'SYSTEM MESSAGE', px + 5, py + 4, { scale: 1, color: '#ffffff', align: 'left' });
    closeR = { x: px + pw - 14, y: py + 2, w: 11, h: 10 };
    g.fillStyle = '#e04a3c'; g.fillRect(closeR.x, closeR.y, closeR.w, closeR.h);
    Font.draw(g, 'x', closeR.x + 5, closeR.y + 2, { scale: 1, color: '#ffffff', align: 'center' });
    Font.draw(g, 'YOUR PHONE IS', px + pw / 2, py + 22, { scale: 1, color: '#2a2433', align: 'center' });
    Font.draw(g, blink ? 'INFECTED' : 'INFECTED!', px + pw / 2, py + 34, { scale: 2, color: '#c02030', align: 'center' });
    Font.draw(g, 'WITH 3 WOMBATS', px + pw / 2, py + 54, { scale: 1, color: '#2a2433', align: 'center' });
    // a progress bar that has been at 99% since 1998
    g.fillStyle = '#0a0710'; g.fillRect(px + 14, py + 68, pw - 28, 12);
    g.fillStyle = '#cfcbd8'; g.fillRect(px + 15, py + 69, pw - 30, 10);
    g.fillStyle = '#3fbf5a'; g.fillRect(px + 15, py + 69, (pw - 30) * 0.99, 10);
    Font.draw(g, '99%', px + pw / 2, py + 71, { scale: 1, color: '#06210c', align: 'center' });
    Font.draw(g, 'SCANNING... PLEASE WAIT', px + pw / 2, py + 86, { scale: 1, color: '#6a6678', align: 'center' });
    Font.draw(g, 'DO NOT CLOSE THIS WINDOW', px + pw / 2, py + 100, { scale: 1, color: blink ? '#c02030' : '#8a8496', align: 'center' });
  }

  // ---- the flight ----------------------------------------------------------
  function plane(g) {
    const k = U.clamp(t / 4.4, 0, 1);
    const sky = g.createLinearGradient(0, 0, 0, VH);
    sky.addColorStop(0, '#222a5e'); sky.addColorStop(0.45, '#8a5a8e'); sky.addColorStop(0.75, '#e08a5a'); sky.addColorStop(1, '#f6cf8a');
    g.fillStyle = sky; g.fillRect(0, 0, VW, VH);
    g.fillStyle = '#ffe9a8'; Art.ell(g, 110, 236, 26, 26, '#ffe9a8');
    for (let i = 0; i < 40; i++) { const sx = (i * 79) % VW, sy = (i * 37) % 120; g.fillStyle = 'rgba(255,255,255,0.6)'; g.fillRect(sx, sy, 1, 1); }
    for (const [sp, yy, col, h] of [[36, 200, 'rgba(255,214,190,0.75)', 16], [70, 246, 'rgba(255,236,214,0.9)', 22]]) {
      for (let i = 0; i < 10; i++) {
        const cx = ((i * 96 - t * sp) % (VW + 200)) - 100;
        for (let k2 = 0; k2 < 5; k2++) Art.ell(g, cx + k2 * 20, yy + Math.abs(k2 - 2) * 4, 22, h, col);
      }
    }
    g.fillStyle = '#2b5f8a'; g.fillRect(0, 300, VW, 60);
    for (let i = 0; i < 60; i++) { g.fillStyle = 'rgba(255,255,255,0.2)'; g.fillRect(((i * 53 - t * 30) % VW + VW) % VW, 306 + (i * 13) % 48, 7, 1); }
    const px = U.lerp(-200, VW + 200, U.easeInOut(k)), py = 150 + Math.sin(t * 1.2) * 7;
    const pw = 205, ph = 70;
    g.save(); g.translate(px, py);
    Art.castShadow(g, planeImg(), 0, 154, pw, ph, { alpha: 0.14, lean: 0.2, squash: 0.18 });
    g.drawImage(planeImg(), -pw / 2, -ph / 2, pw, ph);
    g.restore();
    for (let i = 0; i < 26; i++) {
      const cx = px - 96 - i * 13, a = (1 - i / 26) * 0.5;
      g.fillStyle = `rgba(255,255,255,${a.toFixed(2)})`;
      g.fillRect(cx, py + 7 + Math.sin(i * 0.5 + t) * 2, 11, 4);
    }
    routeBanner(g, 'SYDNEY', 'HOBART', k);
  }
  let planeC = null;
  function planeImg() {
    if (planeC) return planeC;
    const { c, g } = Art.cv(128, 44);
    Art.poly(g, [[6, 24], [26, 14], [96, 12], [120, 20], [120, 26], [96, 32], [24, 32]], '#e8eaf0');
    Art.poly(g, [[6, 24], [24, 18], [24, 30]], '#cdd2de');
    Art.poly(g, [[46, 20], [76, 2], [92, 2], [74, 20]], '#cdd2de');
    Art.poly(g, [[40, 22], [70, 22], [58, 40], [40, 34]], '#b9bfcd');
    Art.poly(g, [[44, 18], [78, 10], [70, 8], [44, 16]], '#dfe3ec');
    Art.rect(g, 52, 24, 16, 8, '#3a4358'); Art.rect(g, 52, 24, 16, 3, '#5a657f');
    for (let i = 0; i < 9; i++) Art.rect(g, 34 + i * 7, 20, 3, 3, '#7ec8e8');
    Art.poly(g, [[10, 22], [20, 19], [20, 24], [10, 25]], '#7ec8e8');
    Art.rect(g, 6, 26, 114, 2, '#c1912a');
    Art.outline(c, '#1c1008', 1);
    planeC = c; return c;
  }
  function routeBanner(g, a, b, k) {
    const y = 62;
    g.fillStyle = 'rgba(12,8,20,0.6)'; g.fillRect(120, y - 10, 400, 42);
    g.fillStyle = '#1c1008'; g.fillRect(120, y - 10, 400, 2); g.fillRect(120, y + 30, 400, 2);
    Font.draw(g, a, 148, y - 2, { scale: 2, color: '#ffe497', align: 'left' });
    Font.draw(g, b, 492, y - 2, { scale: 2, color: '#ffe497', align: 'right' });
    g.fillStyle = '#5a5468'; g.fillRect(214, y + 4, 212, 2);
    g.fillStyle = '#ffe497'; g.fillRect(214, y + 4, 212 * k, 2);
    g.fillStyle = '#ffffff'; g.fillRect(Math.round(214 + 212 * k) - 3, y + 1, 7, 7);
    Font.draw(g, 'TASMANIA', 320, y + 16, { scale: 1, color: '#cfc4e0', align: 'center' });
  }

  // ---- the drive: the truck, seen from the side ----------------------------
  // The same vehicle that is parked in your grove, facing the way it travels.
  function truckImg() { return Art.flip(Props.get('truck')); }

  function drive(g) {
    const k = U.clamp(t / 5.6, 0, 1);
    const sp = t * 108;
    const sky = g.createLinearGradient(0, 0, 0, 250);
    sky.addColorStop(0, '#3e2b62'); sky.addColorStop(0.5, '#9a5f7a'); sky.addColorStop(1, '#f0b070');
    g.fillStyle = sky; g.fillRect(0, 0, VW, 250);
    g.fillStyle = '#ffd9a0'; Art.ell(g, 470, 176, 34, 34, '#ffd9a0');
    g.globalAlpha = 0.25; g.fillStyle = '#ffd9a0'; Art.ell(g, 470, 176, 54, 54, '#ffd9a0'); g.globalAlpha = 1;
    // far hills
    for (let i = 0; i < 9; i++) { const hx = ((i * 120 - sp * 0.06) % (VW + 260)) - 130; Art.ell(g, hx, 224, 110, 44, '#5b4a72'); }
    g.fillStyle = '#5b4a72'; g.fillRect(0, 220, VW, 70);
    g.fillStyle = '#4d3e62'; g.fillRect(0, 246, VW, 44);
    g.fillStyle = '#3f3352'; g.fillRect(0, 266, VW, 24);
    // three ranks of the grove's own trees, each at its own speed
    const RANKS = [[0.22, 252, 0.8, 0.3], [0.5, 272, 1.1, 0.5], [1.0, 296, 1.5, 0.7]];
    RANKS.forEach(([rate, yy, sc, sh], ri) => {
      const n = 9 + ri * 3;
      for (let i = 0; i < n; i++) {
        const span = VW + 340;
        const x = ((i * (span / n) - sp * rate) % span + span) % span - 170;
        const kind = ['gnarl', 'oak', 'pine', 'birch'][(i + ri) % 4];
        const img = Props.get('tree', `${kind}|${(i * 3 + ri) % 6}|${sh.toFixed(2)}`);
        const w = img.width * sc, h = img.height * sc;
        g.drawImage(img, Math.round(x - w / 2), Math.round(yy - h), Math.round(w), Math.round(h));
      }
    });
    // ferns along the verge
    for (let i = 0; i < 26; i++) {
      const x = ((i * 46 - sp * 1.5) % (VW + 100) + VW + 100) % (VW + 100) - 50;
      for (let f = -2; f <= 2; f++) Art.limb(g, x, 292, x + f * 11, 274 - Math.abs(f) * 3, 4, 1, f % 2 ? '#2f5a34' : '#3d7040');
    }
    // the road
    g.fillStyle = '#3a352f'; g.fillRect(0, 288, VW, VH - 288);
    g.fillStyle = '#4a443c'; g.fillRect(0, 288, VW, 5);
    g.fillStyle = '#2a251f'; g.fillRect(0, 340, VW, 20);
    for (let i = 0; i < 14; i++) { const dx = ((i * 64 - sp * 2.2) % (VW + 80) + VW + 80) % (VW + 80) - 40; g.fillStyle = '#e8dfa8'; g.fillRect(dx, 318, 30, 4); }
    for (let i = 0; i < 40; i++) { const dx = ((i * 31 - sp * 2.4) % VW + VW) % VW; g.fillStyle = 'rgba(0,0,0,0.2)'; g.fillRect(dx, 296 + (i * 13) % 40, 9, 2); }
    // roadside marker posts, flicking past
    for (let i = 0; i < 4; i++) {
      const x = ((i * 240 - sp * 2.1) % (VW + 240) + VW + 240) % (VW + 240) - 120;
      g.fillStyle = '#1a120c'; g.fillRect(x, 276, 5, 20);
      g.fillStyle = '#cfc4a8'; g.fillRect(x + 1, 277, 3, 18);
      g.fillStyle = '#e04a36'; g.fillRect(x + 1, 279, 3, 4);
    }
    // the sign going by
    const sx = VW + 60 - k * 900;
    if (sx > -120 && sx < VW + 60) {
      g.fillStyle = '#3a2a18'; g.fillRect(sx + 26, 230, 8, 62);
      g.fillStyle = '#1c1008'; g.fillRect(sx - 4, 192, 76, 42);
      g.fillStyle = '#2f6f3a'; g.fillRect(sx, 196, 68, 34);
      Font.draw(g, 'WOMBAT', sx + 34, 202, { scale: 1, color: '#ffffff', align: 'center' });
      Font.draw(g, 'GROVE', sx + 34, 212, { scale: 1, color: '#ffffff', align: 'center' });
      Font.draw(g, '5 km', sx + 34, 222, { scale: 1, color: '#bfe8c6', align: 'center' });
    }
    // the truck itself, bouncing down the road
    const img = truckImg();
    const tw = img.width * 1.5, th = img.height * 1.5;
    const tx = 210 + Math.sin(t * 0.8) * 20, ty = 316 + Math.abs(Math.sin(t * 9)) * 3;
    // exhaust, coughing out of the back of it
    for (let i = 0; i < 12; i++) {
      const k = ((t * 1.6 + i * 0.14) % 1);
      const px = tx - tw / 2 - 6 - k * 90;
      const py = ty - 10 - k * 22 + Math.sin(k * 7 + i) * 4;
      const a = (1 - k) * 0.4;
      if (a < 0.02) continue;
      g.fillStyle = `rgba(150,146,140,${a.toFixed(2)})`;
      Art.ell(g, px, py, 4 + k * 16, 3 + k * 12, g.fillStyle);
      g.fillStyle = `rgba(196,192,186,${(a * 0.5).toFixed(2)})`;
      Art.ell(g, px - 2, py - 2, 2 + k * 8, 1.6 + k * 6, g.fillStyle);
    }
    Art.castShadow(g, img, tx, ty + 10, tw, th, { alpha: 0.34, lean: 0.3, squash: 0.14 });
    g.drawImage(img, Math.round(tx - tw / 2), Math.round(ty - th + 12), Math.round(tw), Math.round(th));
    // dust kicked off the back wheels
    for (let i = 0; i < 9; i++) {
      const dx = tx - tw / 2 - i * 14 - (t * 60) % 14, a = (1 - i / 9) * 0.38;
      g.fillStyle = `rgba(196,170,130,${a.toFixed(2)})`;
      Art.ell(g, dx, ty + 6 - (i % 3) * 4, 8 + i, 4 + i * 0.6, g.fillStyle);
    }
    // a blurred verge tearing past the bottom of frame
    for (let i = 0; i < 18; i++) {
      const x = ((i * 44 - sp * 3.4) % (VW + 120) + VW + 120) % (VW + 120) - 60;
      const c2 = ['#24402a', '#2f5a34', '#1b3020'][i % 3];
      g.fillStyle = c2;
      g.fillRect(x, 348, 30 + (i % 4) * 12, 12);
      for (let f = -2; f <= 2; f++) Art.limb(g, x + 14, 356, x + 14 + f * 9, 342 - Math.abs(f) * 2, 5, 2, f % 2 ? c2 : U.shade(c2, 0.25));
    }
    g.fillStyle = 'rgba(12,8,20,0.35)'; g.fillRect(0, 354, VW, VH - 354);
    for (let i = 0; i < 7; i++) {
      const ly = 236 + i * 14, lx = ((i * 90 - t * 420) % (VW + 160) + VW + 160) % (VW + 160) - 80;
      g.fillStyle = 'rgba(255,255,255,0.16)'; g.fillRect(lx, ly, 40 + (i % 3) * 18, 2);
    }
    Font.draw(g, 'TASMANIA', 320, 22, { scale: 2, color: '#f0d2a0', align: 'center', shadow: 'rgba(0,0,0,0.6)' });
    Font.draw(g, 'two hours from the airport', 320, 42, { scale: 1, color: '#c9a9c0', align: 'center', shadow: 'rgba(0,0,0,0.6)' });
  }

  function arrive(g) {
    drive(g);
    const k = U.clamp(t / 2.0, 0, 1);
    g.fillStyle = `rgba(10,6,16,${k.toFixed(2)})`; g.fillRect(0, 0, VW, VH);
    if (k > 0.35) Font.draw(g, 'WOMBAT GROVE', 320, 160, { scale: 3, color: '#ffe497', align: 'center', shadow: '#000' });
    if (k > 0.55) Font.draw(g, 'day one', 320, 196, { scale: 2, color: '#c2a176', align: 'center', shadow: '#000' });
  }

  function render(g) {
    if (phase === 'phone' || phase === 'chat' || phase === 'web') {
      bedroom(g);
      phoneBody(g);
      g.save(); g.beginPath(); g.rect(SX, SY, SW, SH); g.clip();
      if (phase === 'phone') {
        const o = (dragging ? dragY : 0) + off;
        feedCard(g, card, o);
        if (card + 1 < CLIPS.length) feedCard(g, card + 1, o + 300);
        if (card > 0) feedCard(g, card - 1, o - 300);
        for (const h of hearts) { g.globalAlpha = 1 - h.t / 1.1; drawHeart(g, h.x, h.y, '#ff6b86', false); g.globalAlpha = 1; }
        drawLikeBurst(g);
      } else if (phase === 'chat') chat(g);
      else web(g);
      g.restore();
      phoneChrome(g, phase === 'web');
      if (phase === 'phone') for (let i = 0; i < CLIPS.length; i++) {
        g.fillStyle = i === card ? '#ffe497' : 'rgba(255,255,255,0.25)';
        g.fillRect(PX + PW + 12, PY + 126 + i * 10, 4, i === card ? 8 : 4);
      }
    } else if (phase === 'plane') plane(g);
    else if (phase === 'drive') drive(g);
    else arrive(g);

    // comic pops, wherever you tapped
    for (const p of pops) {
      const a = 1 - p.t / 0.4;
      g.fillStyle = `rgba(255,228,151,${a.toFixed(2)})`;
      const x = p.x + Math.cos(p.a) * p.r, y = p.y + Math.sin(p.a) * p.r;
      const s = Math.round(2 + a * 3);
      g.fillStyle = p.c; g.globalAlpha = a; g.fillRect(Math.round(x), Math.round(y), s, s); g.globalAlpha = 1;
    }
    if (skipT > 2.2 && phase !== 'arrive') {
      g.fillStyle = 'rgba(10,6,16,0.6)'; g.fillRect(VW - 104, VH - 24, 96, 16);
      Font.draw(g, 'ESC TO SKIP', VW - 56, VH - 20, { scale: 1, color: '#9a94a8', align: 'center' });
    }
    FX.drawParticles(g, 0);
  }

  // a way in for tests and for the skip key
  function go(p) { phase = p; t = 0; webT = 0; chatT = 0; if (p === 'chat') { chatStep = 1; linkR = null; } if (p === 'web') { popupOn = 2; dodge = 0; dodgeX = 0; } }
  return { init, enter, update, render, press, move, release, skip, go, get phase() { return phase; } };
})();
