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
  // ---- into the wood --------------------------------------------------------
  // The camera pushes straight into the trees: the grove's own tree art,
  // scaling up out of the middle of frame and sliding past the edges, with the
  // light going out as the canopy closes over. The swap happens in the dark.
  let curtain = null;
  const WALKERS = [];
  {
    const r = Art.rng(7734);
    for (let i = 0; i < 26; i++) {
      WALKERS.push({
        a: r() * TAU,                       // which side of the path it passes on
        rad: 0.2 + r() * 0.95,              // how far off the centre line
        z: r(),                             // where it starts along the path
        lean: (r() - 0.5) * 0.5,
        br: Array.from({ length: 3 }, () => [0.3 + r() * 0.5, r() < 0.5 ? -1 : 1, 0.16 + r() * 0.22]),
      });
    }
  }
  function trees(onShut, onDone) {
    curtain = { t: 0, shut: 0.9, open: 1.14, fired: false, onShut, onDone };
  }
  function drawTrees(g, W, H) {
    if (!curtain) return;
    const c = curtain;
    const dark = c.t <= c.shut ? U.easeInOut(c.t / c.shut)
      : 1 - U.easeInOut(U.clamp((c.t - c.open) / (c.shut * 0.8), 0, 1));
    if (dark <= 0.002) return;
    const cx = W / 2, cy = H * 0.52;
    const bob = Math.sin(c.t * 11) * 3 * dark;             // the footfalls
    const roll = Math.sin(c.t * 5.5) * 0.008 * dark;
    g.save();
    g.translate(cx, cy + bob); g.rotate(roll); g.translate(-cx, -cy);
    // the way ahead falling into nothing
    const fk = U.clamp(dark * 1.8, 0, 1);
    const fade = g.createRadialGradient(cx, cy, 10, cx, cy, H * 0.95);
    fade.addColorStop(0, `rgba(10,16,12,${(fk * 0.3).toFixed(2)})`);
    fade.addColorStop(1, `rgba(4,7,5,${(fk * 0.92).toFixed(2)})`);
    g.fillStyle = fade; g.fillRect(-40, -40, W + 80, H + 80);
    // Trunks only, and only ones that pass to the side of the camera: a tree
    // scaled up in your face is a smear, so they stay at the edges and the
    // canopy is a separate band across the top. Far to near, so near overlaps.
    const alpha = U.clamp(dark * 2.4, 0, 1);
    const sorted = WALKERS.map((tr) => ({ tr, z: (tr.z + c.t * 0.55) % 1 })).sort((p, q) => p.z - q.z);
    for (const { tr, z } of sorted) {
      const persp = 0.16 + z * z * 3.4;
      const side = Math.cos(tr.a) < 0 ? -1 : 1;
      const off = (0.26 + tr.rad * 0.5) * W * persp;       // always clear of the middle
      const x = cx + side * off;
      const w = 40 * (0.7 + tr.rad) * persp;
      if (x + w < -20 || x - w > W + 20) continue;
      const base = cy + H * 0.85 * persp, top = cy - H * 1.1 * persp;
      const lean = tr.lean * (base - top) * 0.4;
      const sh = Math.round(42 + (1 - z) * 56);
      const bark = `rgb(${sh + 12},${sh + 4},${sh - 6})`;
      const lit = `rgb(${sh + 52},${sh + 38},${sh + 12})`;
      g.globalAlpha = U.clamp(z * 5, 0, 1) * alpha;
      Art.limb(g, x, base, x + lean, top, w, w * 0.42, '#0c1a0e');
      Art.limb(g, x, base, x + lean, top, w - 2, w * 0.34, bark);
      Art.limb(g, x - side * (w * 0.3), base, x + lean - side * (w * 0.24), top, w * 0.18, 1.4, lit);
      for (const [ky, bs, len] of tr.br) {                 // limbs, reaching inward
        const by = U.lerp(base, top, ky), bx = U.lerp(x, x + lean, ky);
        const L = len * H * persp * 0.8;
        Art.limb(g, bx, by, bx - side * L, by - L * 0.45, w * 0.32, 2, '#0c1a0e');
        Art.limb(g, bx, by, bx - side * L, by - L * 0.45, w * 0.22, 1.2, bark);
      }
      g.globalAlpha = 1;
    }
    // the canopy closing over, drawn as one soft band rather than blown-up leaves
    const ck = U.clamp(dark * 1.4, 0, 1);
    for (let i = 0; i < 16; i++) {
      const p = i / 15;
      const px = p * W + Math.sin(c.t * 1.6 + i) * 6;
      const drop = (H * 0.2 + Math.sin(i * 2.3) * 26) * ck;
      const r = 60 + Math.sin(i * 1.7) * 26;
      g.globalAlpha = alpha;
      Art.ell(g, px, -r * 0.5 + drop, r, r * 0.68, '#141f14');
      Art.ell(g, px - r * 0.2, -r * 0.62 + drop, r * 0.6, r * 0.4, '#22351f');
      g.globalAlpha = 1;
    }
    g.restore();
    // the last of the light going out
    if (dark > 0.94) {
      g.fillStyle = `rgba(4,7,5,${(((dark - 0.94) / 0.06) * 0.7).toFixed(2)})`;
      g.fillRect(0, 0, W, H);
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
    if (curtain) {
      curtain.t += dt;
      if (!curtain.fired && curtain.t >= curtain.shut) { curtain.fired = true; if (curtain.onShut) curtain.onShut(); }
      if (curtain.t >= curtain.open + curtain.shut) { const d = curtain.onDone; curtain = null; if (d) d(); }
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

  return { cam, cine, pixelText, spawn, burst, dust, hearts, sparkle, float, confettiBurst, ring, lightning, root, shake, punch, flash, title, setSlowmo, letterbox, vignette, freeze, hitstop, update, updateWorld, drawParticles, drawFloaters, drawComics, comic, COMIC_INK, drawConfetti, drawCinema, drawTrees, trees, get curtaining() { return !!curtain; }, clear, clearComics, particles };
})();
