// ---- Visual effects: particles, floaters, camera, cinematics ---------------
const FX = (() => {
  const particles = [];
  const floaters = [];
  const confetti = [];
  const rings = [];
  const bolts = [];
  const tendrils = [];
  const cam = { x: 320, y: 180, zoom: 1, tx: 320, ty: 180, tzoom: 1, shake: 0, shakeX: 0, shakeY: 0, punch: 0 };
  const cine = {
    letterbox: 0, tLetterbox: 0,   // 0..1
    flash: 0, flashColor: '#fff',
    slowmo: 1, tSlowmo: 1,
    vignette: 0, tVignette: 0,
    freeze: 0,
    titles: [],   // {text, sub, t, dur, color, size, style}
    desat: 0, tDesat: 0,
    hitstop: 0,
  };

  function spawn(o) { particles.push(Object.assign({ x: 0, y: 0, vx: 0, vy: 0, life: 1, maxLife: 1, size: 2, color: '#fff', gravity: 0, drag: 0, type: 'rect', rot: 0, vr: 0, layer: 0 }, o, { maxLife: o.life || 1 })); }
  function burst(x, y, n, opts = {}) {
    for (let i = 0; i < n; i++) {
      const a = U.rand(0, TAU), sp = U.rand(opts.speedMin || 30, opts.speed || 120);
      spawn({ x, y, vx: Math.cos(a) * sp + (opts.vx || 0), vy: Math.sin(a) * sp + (opts.vy || 0), life: U.rand(0.3, opts.life || 0.8), size: U.rand(1, opts.size || 3), color: Array.isArray(opts.color) ? U.pick(opts.color) : (opts.color || '#fff'), gravity: opts.gravity ?? 200, drag: opts.drag || 1, type: opts.type || 'rect', layer: opts.layer || 0 });
    }
  }
  function dust(x, y, n = 8, color = '#c9b899') { for (let i = 0; i < n; i++) spawn({ x: x + U.rand(-10, 10), y, vx: U.rand(-60, 60), vy: U.rand(-40, -5), life: U.rand(0.4, 0.9), size: U.rand(2, 5), color, gravity: -20, drag: 2, type: 'circle' }); }
  function hearts(x, y, n = 3) { for (let i = 0; i < n; i++) spawn({ x: x + U.rand(-8, 8), y: y + U.rand(-4, 4), vx: U.rand(-15, 15), vy: U.rand(-50, -25), life: U.rand(0.7, 1.1), size: U.rand(3, 5), color: U.pick(['#ff5c8a', '#ff8fb0', '#ff3366']), gravity: -10, drag: 1, type: 'heart' }); }
  function sparkle(x, y, n = 6, color = '#fff2a8') { for (let i = 0; i < n; i++) spawn({ x: x + U.rand(-10, 10), y: y + U.rand(-10, 10), vx: U.rand(-20, 20), vy: U.rand(-40, -10), life: U.rand(0.4, 0.8), size: U.rand(2, 4), color, gravity: 0, type: 'star' }); }
  function float(x, y, text, o = {}) { floaters.push({ x, y, text, life: o.life || 1.2, maxLife: o.life || 1.2, color: o.color || '#fff', size: o.size || 8, vy: o.vy ?? -30, vx: o.vx || 0, world: o.world ?? false, outline: o.outline ?? true }); }
  // ---- the dissolve ---------------------------------------------------------
  // The screen goes out in chunky blocks, but the blocks do not simply appear:
  // each one lights up gold first, sheds a spark, and only then goes dark. A
  // ring of light sweeps out from the middle ahead of them, motes drift up
  // through the dark, and the whole thing comes back the same way in reverse.
  let curtain = null;
  const CELL = 16;
  const ORD = new Map();                       // cell key -> its two shuffle keys
  const MOTES = [];
  function cellOrder(cols, rows) {
    const k = cols + 'x' + rows;
    let o = ORD.get(k);
    if (o) return o;
    const r = Art.rng(4211 + cols * 131 + rows);
    const cells = [];
    for (let cy = 0; cy < rows; cy++) {
      for (let cx = 0; cx < cols; cx++) {
        // a spiral out of the middle, jittered so it still reads as scattered
        const dx = (cx + 0.5) / cols - 0.5, dy = (cy + 0.5) / rows - 0.5;
        const d = Math.sqrt(dx * dx + dy * dy) / 0.72;
        const a2 = (Math.atan2(dy, dx) + Math.PI) / TAU;
        cells.push({ cx, cy, in: d * 0.62 + a2 * 0.24 + r() * 0.3, out: r() * 0.7 + (1 - d) * 0.4, ph: r() * TAU });
      }
    }
    const norm = (key) => {
      const s2 = cells.slice().sort((a, b) => a[key] - b[key]);
      s2.forEach((c, i) => { c[key] = i / (s2.length - 1 || 1); });
    };
    norm('in'); norm('out');
    o = cells;
    ORD.set(k, o);
    return o;
  }
  function trees(onShut, onDone) {
    curtain = { t: 0, shut: 0.72, hold: 0.26, open: 0.6, fired: false, onShut, onDone };
    MOTES.length = 0;
    for (let i = 0; i < 46; i++) {
      MOTES.push({ x: Math.random(), y: Math.random(), sp: 0.1 + Math.random() * 0.28,
        ph: Math.random() * TAU, r: 1 + Math.random() * 2.4, hue: Math.random() < 0.35 ? 1 : 0 });
    }
  }
  const SPARK = ['#fff4c8', '#f5cd5c', '#d8a52f'];
  const GLOW = ['#b98ef0', '#79dced', '#f5cd5c'];
  function drawTrees(g, W, H) {
    if (!curtain) return;
    const c = curtain;
    let cover, phase;
    if (c.t < c.shut) { cover = c.t / c.shut; phase = 'in'; }
    else if (c.t < c.shut + c.hold) { cover = 1; phase = 'in'; }
    else { cover = 1 - (c.t - c.shut - c.hold) / c.open; phase = 'out'; }
    cover = U.clamp(cover, 0, 1);
    if (cover <= 0) return;
    const cols = Math.ceil(W / CELL), rows = Math.ceil(H / CELL);
    const cells = cellOrder(cols, rows);
    const e = phase === 'in' ? U.easeInOut(cover) : cover;
    // the wavefront, running just ahead of the blocks
    const cx0 = W / 2, cy0 = H / 2, maxR = Math.hypot(W, H) / 2;
    if (cover < 1) {
      const rad = (phase === 'in' ? e : 1 - e) * maxR * 1.25;
      const ring = g.createRadialGradient(cx0, cy0, Math.max(0, rad - 40), cx0, cy0, rad + 18);
      ring.addColorStop(0, 'rgba(185,142,240,0)');
      ring.addColorStop(0.7, `rgba(185,142,240,${(0.16 * (1 - Math.abs(cover - 0.5) * 1.4)).toFixed(3)})`);
      ring.addColorStop(1, 'rgba(121,220,237,0)');
      g.fillStyle = ring; g.fillRect(0, 0, W, H);
    }
    for (const cel of cells) {
      const k = cel[phase];
      const p = phase === 'in' ? e - k : (1 - e) - (1 - k);
      if (p <= 0) continue;
      const x = cel.cx * CELL, y = cel.cy * CELL;
      if (p < 0.1) {                           // it lights up before it goes out
        const q = p / 0.1;
        const m = Math.round(CELL * (0.42 - q * 0.34));
        g.fillStyle = SPARK[Math.floor(q * 3) % 3];
        g.fillRect(x + m, y + m, CELL - m * 2, CELL - m * 2);
      } else if (p < 0.2) {                    // then dims through violet
        const q = (p - 0.1) / 0.1;
        g.fillStyle = q < 0.5 ? '#6a4a9a' : '#2a1f3c';
        g.fillRect(x, y, CELL, CELL);
      } else {
        g.fillStyle = '#07060e';
        g.fillRect(x, y, CELL, CELL);
        // a few of them keep a single ember burning in the corner
        if ((cel.cx * 7 + cel.cy * 5) % 11 === 0) {
          const a2 = 0.25 + 0.25 * Math.sin(c.t * 7 + cel.ph);
          g.fillStyle = `rgba(185,142,240,${a2.toFixed(2)})`;
          g.fillRect(x + 6, y + 6, 2, 2);
        }
      }
    }
    // motes rising through the dark of it
    if (cover > 0.25) {
      const a2 = Math.min(1, (cover - 0.25) / 0.3);
      for (const m of MOTES) {
        const my = ((m.y - c.t * m.sp) % 1 + 1) % 1;
        const mx = m.x + Math.sin(c.t * 1.6 + m.ph) * 0.02;
        const tw = 0.45 + 0.55 * Math.sin(c.t * 5 + m.ph);
        g.fillStyle = `rgba(${m.hue ? '121,220,237' : '245,205,92'},${(a2 * tw * 0.85).toFixed(2)})`;
        const px = Math.round(mx * W), py = Math.round(my * H);
        g.fillRect(px, py, m.r, m.r);
        g.fillStyle = `rgba(${m.hue ? '121,220,237' : '245,205,92'},${(a2 * tw * 0.22).toFixed(2)})`;
        g.fillRect(px - 2, py - 2, m.r + 4, m.r + 4);
      }
    }
    // and a soft bloom held over the whole thing at the darkest point
    if (cover > 0.92) {
      const b = (cover - 0.92) / 0.08;
      const gr = g.createRadialGradient(cx0, cy0, 4, cx0, cy0, maxR);
      gr.addColorStop(0, `rgba(94,66,140,${(b * 0.3).toFixed(2)})`);
      gr.addColorStop(1, 'rgba(10,8,20,0)');
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
    }
  }

  // A comic-book word on a jagged starburst  // A comic-book word on a jagged starburst  // A comic-book word on a jagged starburst: the game's loudest small reward.
  const comics = [];
  const COMIC_INK = { pow: '#ffe98a', zap: '#8fe6ff', yay: '#c9f58a', bad: '#ff9a9a' };
  function comic(x, y, text, o = {}) {
    comics.push({
      x, y, text: String(text).toUpperCase(), t: 0, life: o.life || 0.85,
      ink: o.ink || COMIC_INK.pow, edge: o.edge || '#ff7a3c',
      spikes: 9 + Math.floor(Math.random() * 4), rot: U.rand(-0.16, 0.16),
      r: o.r || 0, world: o.world ?? false, vy: o.vy ?? -22,
    });
    if (comics.length > 14) comics.shift();
  }
  function drawComics(g, world) {
    for (const c of comics) {
      if (c.world !== world) continue;
      const k = c.t / c.life;
      const pop = k < 0.22 ? U.lerp(0.3, 1.14, k / 0.22) : k < 0.36 ? U.lerp(1.14, 1, (k - 0.22) / 0.14) : 1;
      const a = k > 0.72 ? 1 - (k - 0.72) / 0.28 : 1;
      const w = c.r || (Font.advance(c.text.length, 1) / 2 + 11);
      g.save();
      g.globalAlpha = a;
      g.translate(Math.round(c.x), Math.round(c.y + c.vy * c.t));
      g.rotate(c.rot + Math.sin(c.t * 18) * 0.02 * (1 - k));
      g.scale(pop, pop);
      const pts = [];
      for (let i = 0; i < c.spikes * 2; i++) {
        const ang = (i / (c.spikes * 2)) * TAU - Math.PI / 2;
        const rr = (i % 2 ? 0.62 : 1) * (i % 4 === 1 ? 1.06 : 1);
        pts.push([Math.cos(ang) * w * rr, Math.sin(ang) * w * 0.72 * rr]);
      }
      g.beginPath();
      g.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
      g.closePath();
      g.fillStyle = '#120c18'; g.translate(2, 3); g.fill(); g.translate(-2, -3);
      g.fillStyle = c.edge; g.fill();
      g.save(); g.scale(0.78, 0.78); g.fillStyle = c.ink; g.fill(); g.restore();
      g.lineJoin = 'miter'; g.lineWidth = 2; g.strokeStyle = '#120c18'; g.stroke();
      Font.draw(g, c.text, 0, -3, { scale: 1, color: '#120c18', align: 'center' });
      g.restore();
    }
    g.globalAlpha = 1;
  }

  function confettiBurst(x, y, n = 60) { for (let i = 0; i < n; i++) confetti.push({ x, y, vx: U.rand(-160, 160), vy: U.rand(-320, -80), life: U.rand(1.5, 3), rot: U.rand(0, TAU), vr: U.rand(-8, 8), w: U.rand(3, 6), h: U.rand(2, 4), color: U.pick(['#ff5c8a', '#ffd23f', '#3fe0ff', '#7dff3f', '#c77dff', '#ff9a3f']) }); }

  // A jagged bolt with a couple of forks, alive for a few frames.
  function lightning(x0, y0, x1, y1, opts = {}) {
    const seg = opts.seg || 14, spread = opts.spread || 26;
    const pts = [];
    for (let i = 0; i <= seg; i++) {
      const t = i / seg;
      const j = i === 0 || i === seg ? 0 : (Math.random() - 0.5) * spread * (1 - Math.abs(t - 0.5));
      pts.push([U.lerp(x0, x1, t) + j, U.lerp(y0, y1, t) + (Math.random() - 0.5) * 6]);
    }
    const forks = [];
    for (let k = 0; k < (opts.forks ?? 2); k++) {
      const i = 3 + Math.floor(Math.random() * (seg - 6));
      const fp = [pts[i]];
      const dir = Math.random() < 0.5 ? -1 : 1;
      for (let j = 1; j <= 4; j++) fp.push([pts[i][0] + dir * j * U.rand(6, 13), pts[i][1] + j * U.rand(6, 15)]);
      forks.push(fp);
    }
    bolts.push({ pts, forks, life: opts.life || 0.22, maxLife: opts.life || 0.22, color: opts.color || '#fdf3dc', glow: opts.glow || 'rgba(185,142,240,0.55)', w: opts.w || 2 });
  }
  // Roots that push out of the ground and keep growing.
  function root(x, y, opts = {}) {
    const dir = opts.dir ?? (Math.random() < 0.5 ? -1 : 1);
    tendrils.push({
      x, y, len: 0, target: opts.len || U.rand(40, 90), dir,
      curve: U.rand(0.4, 1.2) * dir, rise: opts.rise ?? U.rand(0.7, 1.25),
      w: opts.w || U.rand(2.5, 5), life: opts.life || 3.4, maxLife: opts.life || 3.4,
      speed: opts.speed || U.rand(70, 150), color: opts.color || '#412e20', tip: opts.tip || '#5d4430',
    });
  }
  function ring(x, y, r, color) { rings.push({ x, y, r0: r * 0.3, r1: r, life: 0.35, maxLife: 0.35, color: color || 'rgba(255,248,230,0.7)' }); }
  function shake(a) { if (cam.noShake) return; cam.shake = Math.min(20, cam.shake + a); }
  function punch(a = 0.08) { cam.punch = Math.min(0.3, cam.punch + a); }
  function flash(color = '#ffffff', a = 0.8) { cine.flash = Math.max(cine.flash, a); cine.flashColor = color; }
  function title(text, o = {}) { cine.titles.push({ text, sub: o.sub || '', t: 0, dur: o.dur || 2, color: o.color || '#fff', size: o.size || 26, style: o.style || 'slam', y: o.y ?? 0.42, delay: o.delay || 0, shakeAmt: o.shake || 0 }); }
  function setSlowmo(v, instant) { cine.tSlowmo = v; if (instant) cine.slowmo = v; }
  function letterbox(on) { cine.tLetterbox = on ? 1 : 0; }
  function vignette(v) { cine.tVignette = v; }
  function freeze(t) { cine.freeze = Math.max(cine.freeze, t); }
  function hitstop(t) { cine.hitstop = Math.max(cine.hitstop, t); }

  // dt = real seconds
  function update(dt) {
    updateCoins(dt);
    if (curtain) {
      curtain.t += dt;
      if (!curtain.fired && curtain.t >= curtain.shut) { curtain.fired = true; if (curtain.onShut) curtain.onShut(); }
      if (curtain.t >= curtain.shut + curtain.hold + curtain.open) { const d = curtain.onDone; curtain = null; if (d) d(); }
    }
    for (let i = comics.length - 1; i >= 0; i--) { comics[i].t += dt; if (comics[i].t >= comics[i].life) comics.splice(i, 1); }
    // camera smoothing
    cam.x = U.lerp(cam.x, cam.tx, 1 - Math.pow(0.001, dt));
    cam.y = U.lerp(cam.y, cam.ty, 1 - Math.pow(0.001, dt));
    cam.zoom = U.lerp(cam.zoom, cam.tzoom * (1 + cam.punch), 1 - Math.pow(0.002, dt));
    cam.punch *= Math.pow(0.01, dt);
    cam.shake *= Math.pow(0.02, dt);
    if (cam.shake < 0.05) cam.shake = 0;
    cam.shakeX = U.rand(-1, 1) * cam.shake; cam.shakeY = U.rand(-1, 1) * cam.shake;
    // cinema
    cine.letterbox = U.lerp(cine.letterbox, cine.tLetterbox, 1 - Math.pow(0.02, dt));
    cine.flash = Math.max(0, cine.flash - dt * 2.5);
    cine.slowmo = U.lerp(cine.slowmo, cine.tSlowmo, 1 - Math.pow(0.01, dt));
    cine.vignette = U.lerp(cine.vignette, cine.tVignette, 1 - Math.pow(0.02, dt));
    cine.desat = U.lerp(cine.desat, cine.tDesat, 1 - Math.pow(0.02, dt));
    cine.freeze = Math.max(0, cine.freeze - dt);
    cine.hitstop = Math.max(0, cine.hitstop - dt);
    for (let i = cine.titles.length - 1; i >= 0; i--) { const t = cine.titles[i]; if (t.delay > 0) { t.delay -= dt; continue; } t.t += dt; if (t.t > t.dur) cine.titles.splice(i, 1); }
  }
  // dt = game (possibly slowed) seconds
  function updateWorld(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= dt; if (p.life <= 0) { particles.splice(i, 1); continue; }
      p.vy += p.gravity * dt; const d = Math.max(0, 1 - p.drag * dt); p.vx *= d; p.vy *= d;
      p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
    }
    for (let i = floaters.length - 1; i >= 0; i--) { const f = floaters[i]; f.life -= dt; if (f.life <= 0) { floaters.splice(i, 1); continue; } f.y += f.vy * dt; f.x += f.vx * dt; f.vy *= Math.max(0, 1 - 2 * dt); }
    for (let i = rings.length - 1; i >= 0; i--) { const r = rings[i]; r.life -= dt; if (r.life <= 0) rings.splice(i, 1); }
    for (let i = bolts.length - 1; i >= 0; i--) { bolts[i].life -= dt; if (bolts[i].life <= 0) bolts.splice(i, 1); }
    for (let i = tendrils.length - 1; i >= 0; i--) {
      const t = tendrils[i];
      t.life -= dt;
      if (t.life <= 0) { tendrils.splice(i, 1); continue; }
      if (t.len < t.target) t.len = Math.min(t.target, t.len + t.speed * dt);
    }
    for (let i = confetti.length - 1; i >= 0; i--) { const c = confetti[i]; c.life -= dt; if (c.life <= 0) { confetti.splice(i, 1); continue; } c.vy += 300 * dt; c.vx *= Math.max(0, 1 - 1.5 * dt); c.vy *= Math.max(0, 1 - 1.5 * dt); c.x += c.vx * dt; c.y += c.vy * dt; c.rot += c.vr * dt; }
  }

  function drawParticles(g, layer = 0, worldOnly = false) {
    if (layer === 0) { drawTendrils(g); drawRings(g); drawBolts(g); }
    for (const p of particles) {
      if (p.layer !== layer) continue;
      const a = U.clamp(p.life / p.maxLife, 0, 1);
      g.globalAlpha = a;
      g.fillStyle = p.color;
      const s = p.size;
      if (p.type === 'circle') { g.beginPath(); g.arc(p.x, p.y, s, 0, TAU); g.fill(); }
      else if (p.type === 'heart') { g.fillRect(p.x - s, p.y - s / 2, s, s); g.fillRect(p.x, p.y - s / 2, s, s); g.fillRect(p.x - s / 2, p.y + s / 2, s, s / 2); g.fillRect(p.x - s, p.y, s * 2, s / 2); }
      else if (p.type === 'star') { g.fillRect(p.x - s, p.y - 1, s * 2, 2); g.fillRect(p.x - 1, p.y - s, 2, s * 2); }
      else if (p.type === 'leaf') { g.save(); g.translate(p.x, p.y); g.rotate(p.rot); g.fillRect(-s, -s / 3, s * 2, s / 1.5); g.restore(); }
      else g.fillRect(Math.round(p.x - s / 2), Math.round(p.y - s / 2), Math.round(s), Math.round(s));
    }
    g.globalAlpha = 1;
  }
  function drawBolts(g) {
    for (const b of bolts) {
      const a = U.clamp(b.life / b.maxLife, 0, 1);
      g.save();
      g.lineCap = 'round'; g.lineJoin = 'round';
      for (const pass of [{ c: b.glow, w: b.w * 4, al: a * 0.5 }, { c: b.color, w: b.w, al: a }]) {
        g.globalAlpha = pass.al; g.strokeStyle = pass.c; g.lineWidth = pass.w;
        g.beginPath();
        g.moveTo(b.pts[0][0], b.pts[0][1]);
        for (const p of b.pts) g.lineTo(p[0], p[1]);
        for (const f of b.forks) { g.moveTo(f[0][0], f[0][1]); for (const p of f) g.lineTo(p[0], p[1]); }
        g.stroke();
      }
      g.restore();
      g.globalAlpha = 1;
    }
  }
  function drawTendrils(g) {
    for (const t of tendrils) {
      const fade = U.clamp(t.life / t.maxLife, 0, 1);
      g.globalAlpha = Math.min(1, fade * 2.2);
      const steps = Math.max(2, Math.round(t.len / 3));
      let px = t.x, py = t.y;
      for (let i = 1; i <= steps; i++) {
        const s = (i / steps) * t.len;
        const nx = t.x + Math.sin(s * 0.05 * t.curve) * s * 0.42 * t.dir;
        const ny = t.y - s * t.rise;
        const w = Math.max(1, t.w * (1 - i / steps) + 1);
        g.fillStyle = i > steps - 3 ? t.tip : t.color;
        const n = Math.max(1, Math.round(Math.hypot(nx - px, ny - py)));
        for (let k = 0; k <= n; k++) g.fillRect(Math.round(U.lerp(px, nx, k / n) - w / 2), Math.round(U.lerp(py, ny, k / n) - w / 2), Math.round(w), Math.round(w));
        px = nx; py = ny;
      }
      g.globalAlpha = 1;
    }
  }
  function drawRings(g) {
    for (const r of rings) {
      const t = 1 - r.life / r.maxLife;
      g.globalAlpha = (1 - t) * 0.8;
      g.strokeStyle = r.color; g.lineWidth = Math.max(1, 3 * (1 - t));
      g.beginPath(); g.ellipse(r.x, r.y, U.lerp(r.r0, r.r1, t), U.lerp(r.r0, r.r1, t) * 0.4, 0, 0, TAU); g.stroke();
    }
    g.globalAlpha = 1;
  }
  function drawFloaters(g, world) {
    for (const f of floaters) {
      if (f.world !== world) continue;
      const a = U.clamp(f.life / f.maxLife * 2, 0, 1);
      g.globalAlpha = a;
      Font.draw(g, String(f.text), Math.round(f.x), Math.round(f.y) - 3, {
        scale: Font.scaleFor(f.size), color: f.color, align: 'center',
        shadow: f.outline ? '#1b1210' : null, shadowDist: 1,
      });
    }
    g.globalAlpha = 1;
  }
  // ---- coins flying to the wallet ------------------------------------------
  // Money that lands somewhere in the world does not simply appear in the
  // counter: a coin arcs up out of wherever it was earned, curves across the
  // frame, and knocks the chip in the corner as it goes in.
  const coins = [];
  const PURSE = { x: 56, y: 26 };
  function coinBurst(x, y, n, world) {
    for (let i = 0; i < Math.min(9, n); i++) {
      coins.push({
        x, y, t: -i * 0.055, life: 0.62 + Math.random() * 0.2, world: !!world,
        ax: x + U.rand(-26, 26), ay: y - U.rand(24, 54),   // the arc's high point
        sp: 1 + Math.random() * 0.3, ph: Math.random() * TAU,
      });
    }
    if (coins.length > 60) coins.splice(0, coins.length - 60);
  }
  function updateCoins(dt) {
    for (let i = coins.length - 1; i >= 0; i--) {
      const c = coins[i];
      c.t += dt * c.sp;
      if (c.t >= c.life) {
        coins.splice(i, 1);
        if (typeof UI !== 'undefined' && UI.pingPurse) UI.pingPurse();
      }
    }
  }
  function drawCoins(g, world) {
    for (const c of coins) {
      if (c.world !== !!world || c.t < 0) continue;
      const k = U.clamp(c.t / c.life, 0, 1);
      // a quadratic through the arc point, into the corner
      const px = world ? PURSE.x : PURSE.x, py = world ? PURSE.y : PURSE.y;
      const u = U.easeIn(k);
      const x = (1 - u) * (1 - u) * c.x + 2 * (1 - u) * u * c.ax + u * u * px;
      const y = (1 - u) * (1 - u) * c.y + 2 * (1 - u) * u * c.ay + u * u * py;
      const s = 1 - k * 0.45;
      const spin = Math.abs(Math.cos(c.t * 11 + c.ph));
      g.globalAlpha = k > 0.86 ? (1 - k) / 0.14 : 1;
      Art.ell(g, x, y, 4.4 * s * (0.28 + spin * 0.72), 4.4 * s, '#8a5a12');
      Art.ell(g, x, y, 3.4 * s * (0.28 + spin * 0.72), 3.4 * s, '#f2cf3a');
      if (spin > 0.4) Art.ell(g, x - 0.8 * s, y - 0.9 * s, 1.1 * s * spin, 1 * s, '#fff2c0');
      g.globalAlpha = 1;
    }
  }
  function drawConfetti(g) {
    for (const c of confetti) {
      g.save(); g.translate(c.x, c.y); g.rotate(c.rot); g.fillStyle = c.color; g.globalAlpha = U.clamp(c.life, 0, 1); g.fillRect(-c.w / 2, -c.h / 2, c.w, c.h); g.restore();
    }
    g.globalAlpha = 1;
  }
  // Screen-space cinematic overlay
  function drawCinema(g, W, H) {
    if (cine.vignette > 0.01) {
      const grd = g.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.85);
      grd.addColorStop(0, 'rgba(0,0,0,0)'); grd.addColorStop(1, `rgba(0,0,0,${0.85 * cine.vignette})`);
      g.fillStyle = grd; g.fillRect(0, 0, W, H);
    }
    if (cine.desat > 0.01) { g.fillStyle = `rgba(90,90,110,${0.35 * cine.desat})`; g.fillRect(0, 0, W, H); }
    if (cine.letterbox > 0.01) {
      const h = Math.round(H * 0.11 * cine.letterbox);
      g.fillStyle = '#000'; g.fillRect(0, 0, W, h); g.fillRect(0, H - h, W, h);
    }
    for (const t of cine.titles) {
      if (t.delay > 0) continue;
      const p = t.t / t.dur;
      let scale = 1, alpha = 1, dx = 0;
      if (t.style === 'slam') { const q = Math.min(1, t.t / 0.18); scale = U.lerp(2.6, 1, U.easeOut(q)); alpha = q; if (p > 0.8) alpha = 1 - (p - 0.8) / 0.2; }
      else if (t.style === 'slide') { const q = Math.min(1, t.t / 0.3); dx = U.lerp(-W, 0, U.easeOut(q)); if (p > 0.8) dx = U.lerp(0, W, U.easeIn((p - 0.8) / 0.2)); }
      else if (t.style === 'fade') { alpha = Math.min(1, t.t / 0.4) * (p > 0.75 ? 1 - (p - 0.75) / 0.25 : 1); }
      const y = H * t.y;
      g.save(); g.globalAlpha = U.clamp(alpha, 0, 1);
      g.translate(W / 2 + dx + U.rand(-1, 1) * t.shakeAmt, y + U.rand(-1, 1) * t.shakeAmt); g.scale(scale, scale);
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = `bold ${t.size}px "Press Start 2P", monospace`;
      g.lineWidth = 6; g.strokeStyle = '#1b1210'; g.strokeText(t.text, 0, 0);
      g.fillStyle = t.color; g.fillText(t.text, 0, 0);
      if (t.sub) { g.font = `bold ${Math.round(t.size * 0.42)}px "Press Start 2P", monospace`; g.lineWidth = 4; g.strokeText(t.sub, 0, t.size * 0.9); g.fillStyle = '#fff'; g.fillText(t.sub, 0, t.size * 0.9); }
      g.restore();
    }
    if (cine.flash > 0.01) { g.fillStyle = cine.flashColor; g.globalAlpha = Math.min(1, cine.flash); g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
  }
  function clearComics() { comics.length = 0; }
  function clear() { particles.length = 0; floaters.length = 0; confetti.length = 0; rings.length = 0; bolts.length = 0; tendrils.length = 0; }

  // All canvas text is bitmap text: hard-edged at any scale, never antialiased.
  function pixelText(g, text, x, y, o = {}) {
    const size = o.size && o.size > 3 ? o.size : (o.size || 1) * 7;
    const scale = o.scale || Font.scaleFor(size);
    const opts = { scale, color: o.color || PAL.cream, align: o.align || 'center', track: o.track };
    if (o.ink !== false) { opts.shadow = o.inkColor || 'rgba(14,10,18,0.92)'; opts.shadowDist = o.ink === 'ring' ? scale : scale; }
    if (o.baseline === 'middle') y -= Font.height(scale) / 2;
    return Font.draw(g, text, x, y, opts);
  }

  return { cam, cine, pixelText, spawn, burst, dust, hearts, sparkle, float, coinBurst, drawCoins, confettiBurst, ring, lightning, root, shake, punch, flash, title, setSlowmo, letterbox, vignette, freeze, hitstop, update, updateWorld, drawParticles, drawFloaters, drawComics, comic, COMIC_INK, drawConfetti, drawCinema, drawTrees, trees, get curtaining() { return !!curtain; }, clear, clearComics, particles };
})();
