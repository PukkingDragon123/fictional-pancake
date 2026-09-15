// ---- The drive: the road between one place and the next --------------------
// Every journey on the map is actually driven. The same scene serves the
// opening (the long haul in from the airport) and every hop between sites:
// parallax ranks of the grove's own trees, power lines, a sign coming up with
// the distance on it, oncoming traffic, and the Fortuner bouncing along in
// front of it all.
const Drive = (() => {
  const VW = 640, VH = 360;
  const ROAD = 288, HORIZON = 250;
  let run = null;

  // the only thing the caller has to decide is where to and how long for
  function start(o) {
    run = {
      t: 0, dur: o.dur || 3.2, to: (o.to || '').toUpperCase(), from: (o.from || '').toUpperCase(),
      km: o.km || 12, sub: o.sub || '', onDone: o.onDone || null, done: false,
      fade: o.fade !== false, title: o.title || '',
      cars: [], dust: [],
    };
    Audio.play('whoosh');
  }
  function stop() { run = null; }
  const active = () => !!run;
  const progress = () => (run ? U.clamp(run.t / run.dur, 0, 1) : 0);

  function update(dt) {
    if (!run) return;
    run.t += dt;
    // something coming the other way, now and then
    if (run.cars.length < 2 && Math.random() < dt * 0.55 && progress() < 0.8) {
      run.cars.push({ x: VW + 140, sp: 230 + Math.random() * 150, lane: Math.random() < 0.5 ? 0 : 1,
        col: U.pick(['#7a4030', '#3f5a3a', '#6a5a2a', '#4a3a5a', '#6a6a6a']) });
    }
    for (let i = run.cars.length - 1; i >= 0; i--) {
      const c = run.cars[i]; c.x -= c.sp * dt;
      if (c.x < -180) run.cars.splice(i, 1);
    }
    for (let i = run.dust.length - 1; i >= 0; i--) {
      const d = run.dust[i]; d.t += dt; d.x += d.vx * dt; d.y += d.vy * dt;
      if (d.t > d.life) run.dust.splice(i, 1);
    }
    if (!run.done && run.t >= run.dur + 0.55) {
      run.done = true;
      const f = run.onDone; run = null;
      if (f) f();
    }
  }

  // ---- the scene -----------------------------------------------------------
  function render(g) { if (run) paint(g, run); }
  // The scene, given nothing but a state object: the intro drives the same road.
  function paint(g, run) {
    const t = run.t, k = U.clamp(run.t / run.dur, 0, 1);
    const sp = t * 128;
    // ---- sky: dusk going over to night as the drive goes on ---------------
    const night = U.clamp(k * 1.15, 0, 1);
    const sky = g.createLinearGradient(0, 0, 0, HORIZON + 20);
    sky.addColorStop(0, U.mix('#3e2b62', '#0b0a1e', night));
    sky.addColorStop(0.52, U.mix('#9a5f7a', '#221a3e', night));
    sky.addColorStop(1, U.mix('#f0b070', '#4a3358', night));
    g.fillStyle = sky; g.fillRect(0, 0, VW, HORIZON + 20);
    // stars coming out behind it
    if (night > 0.25) {
      g.fillStyle = `rgba(255,248,224,${((night - 0.25) * 0.9).toFixed(2)})`;
      for (let i = 0; i < 60; i++) {
        const sx = (i * 149) % VW, sy = (i * 73) % 180;
        if ((i * 37) % 5 === 0 && Math.sin(t * 3 + i) < 0) continue;
        g.fillRect(sx, sy, 2, 2);
      }
    }
    // the sun going down, becoming the moon
    const sunY = 172 + night * 26;
    g.globalAlpha = 0.24;
    g.fillStyle = U.mix('#ffd9a0', '#cfe4f2', night);
    Art.ell(g, 470, sunY, 52, 52, g.fillStyle);
    g.globalAlpha = 1;
    g.fillStyle = U.mix('#ffd9a0', '#dcecf6', night);
    Art.ell(g, 470, sunY, 32, 32, g.fillStyle);
    if (night > 0.5) {
      g.fillStyle = 'rgba(150,178,196,0.5)';
      Art.ell(g, 478, sunY - 9, 7, 7); Art.ell(g, 460, sunY + 8, 5, 5);
    }
    // ---- a mountain range, then the hills, then the ridge -----------------
    const mts = U.mix('#4a3a66', '#1a1630', night);
    for (let i = 0; i < 7; i++) {
      const mx = ((i * 190 - sp * 0.02) % (VW + 400) + VW + 400) % (VW + 400) - 200;
      Art.poly(g, [[mx - 110, HORIZON - 12], [mx - 30, 150 + (i % 3) * 16], [mx + 20, 178],
                   [mx + 60, 142 + (i % 2) * 22], [mx + 130, HORIZON - 12]], mts);
      Art.poly(g, [[mx - 30, 150 + (i % 3) * 16], [mx - 8, 170], [mx + 6, 163]],
        U.mix('#8d7ea8', '#3a3254', night));
    }
    const hill = U.mix('#5b4a72', '#1f1a34', night);
    for (let i = 0; i < 9; i++) { const hx = ((i * 120 - sp * 0.06) % (VW + 260) + VW + 260) % (VW + 260) - 130; Art.ell(g, hx, 224, 110, 44, hill); }
    g.fillStyle = hill; g.fillRect(0, 220, VW, 70);
    g.fillStyle = U.mix('#4d3e62', '#191430', night); g.fillRect(0, 246, VW, 44);
    g.fillStyle = U.mix('#3f3352', '#140f28', night); g.fillRect(0, 266, VW, 24);
    // ---- power lines, striding along the far verge ------------------------
    for (let i = 0; i < 5; i++) {
      const px = ((i * 170 - sp * 0.42) % (VW + 340) + VW + 340) % (VW + 340) - 170;
      const pole = U.mix('#2e2438', '#120e20', night);
      g.fillStyle = pole; g.fillRect(px, 176, 4, 82);
      g.fillStyle = pole; g.fillRect(px - 12, 182, 28, 3); g.fillRect(px - 9, 192, 22, 3);
      for (const [o, y0] of [[-11, 184], [13, 184], [-8, 194], [11, 194]]) {
        g.strokeStyle = `rgba(30,24,44,${(0.5 + night * 0.4).toFixed(2)})`;
        g.lineWidth = 1; g.beginPath();
        g.moveTo(px + o, y0); g.quadraticCurveTo(px + o + 85, y0 + 14, px + o + 170, y0); g.stroke();
      }
    }
    // ---- three ranks of the grove's own trees -----------------------------
    const RANKS = [[0.22, 254, 0.5, 0.62], [0.5, 272, 0.72, 0.74], [1.0, 292, 1, 0.84]];
    RANKS.forEach(([rate, yy, sc, sh], ri) => {
      const n = 9 + ri * 3;
      for (let i = 0; i < n; i++) {
        const span = VW + 340;
        const x = ((i * (span / n) - sp * rate) % span + span) % span - 170;
        const kind = ['gnarl', 'oak', 'pine', 'birch'][(i + ri) % 4];
        const img = Props.get('tree', `${kind}|${(i * 3 + ri) % 6}|${Math.min(0.94, sh + night * 0.08).toFixed(2)}`);
        const w = img.width * sc, h = img.height * sc;
        g.drawImage(img, Math.round(x - w / 2), Math.round(yy - h), Math.round(w), Math.round(h));
      }
    });
    // a post-and-wire fence between the trees and the road
    for (let i = 0; i < 16; i++) {
      const x = ((i * 64 - sp * 1.3) % (VW + 140) + VW + 140) % (VW + 140) - 70;
      g.fillStyle = '#2a2018'; g.fillRect(x, 276, 3, 18);
      g.fillStyle = '#463726'; g.fillRect(x, 276, 1.4, 18);
    }
    g.fillStyle = 'rgba(70,55,38,0.8)'; g.fillRect(0, 280, VW, 1); g.fillRect(0, 287, VW, 1);
    // the same scrub that chokes the grove, growing along the verge
    for (let i = 0; i < 18; i++) {
      const x = ((i * 60 - sp * 1.5) % (VW + 140) + VW + 140) % (VW + 140) - 70;
      const img = Props.get('weed', i % 6);
      const sc = 0.62 + (i % 3) * 0.1;
      g.drawImage(img, Math.round(x - img.width * sc / 2), Math.round(298 - img.height * sc),
                  Math.round(img.width * sc), Math.round(img.height * sc));
    }
    // ---- the road ---------------------------------------------------------
    g.fillStyle = '#3a352f'; g.fillRect(0, ROAD, VW, VH - ROAD);
    g.fillStyle = '#4a443c'; g.fillRect(0, ROAD, VW, 5);
    g.fillStyle = '#2a251f'; g.fillRect(0, 340, VW, 20);
    for (let i = 0; i < 14; i++) { const dx = ((i * 64 - sp * 2.2) % (VW + 80) + VW + 80) % (VW + 80) - 40; g.fillStyle = '#e8dfa8'; g.fillRect(dx, 318, 30, 4); }
    for (let i = 0; i < 40; i++) { const dx = ((i * 31 - sp * 2.4) % VW + VW) % VW; g.fillStyle = 'rgba(0,0,0,0.2)'; g.fillRect(dx, 296 + (i * 13) % 40, 9, 2); }
    g.fillStyle = 'rgba(232,223,168,0.5)'; g.fillRect(0, 300, VW, 2); g.fillRect(0, 336, VW, 2);
    // roadside marker posts, flicking past
    for (let i = 0; i < 4; i++) {
      const x = ((i * 240 - sp * 2.1) % (VW + 240) + VW + 240) % (VW + 240) - 120;
      g.fillStyle = '#1a120c'; g.fillRect(x, 276, 5, 20);
      g.fillStyle = '#cfc4a8'; g.fillRect(x + 1, 277, 3, 18);
      g.fillStyle = '#e04a36'; g.fillRect(x + 1, 279, 3, 4);
    }
    // ---- oncoming traffic, headlights first -------------------------------
    for (const c of run.cars) {
      const y = 300 + c.lane * 6, sc = 0.34 + c.lane * 0.08;
      // coming the other way, and not all of them are this one's colour
      const img = Art.flip(Art.tinted(Props.get('truck'), c.col, 0.45));
      const w = img.width * sc, h = img.height * sc;
      const beam = g.createRadialGradient(c.x - w * 0.4, y - 4, 2, c.x - w * 0.4, y - 4, 54);
      beam.addColorStop(0, `rgba(255,240,196,${(0.18 + night * 0.3).toFixed(2)})`); beam.addColorStop(1, 'rgba(255,240,196,0)');
      g.fillStyle = beam; g.fillRect(c.x - w * 0.4 - 56, y - 60, 112, 112);
      g.fillStyle = 'rgba(0,0,0,0.3)'; Art.ell(g, c.x, y + 3, w * 0.42, 3);
      g.drawImage(img, Math.round(c.x - w / 2), Math.round(y - h + 6), Math.round(w), Math.round(h));
    }
    // ---- the sign coming up, with the distance on it ----------------------
    const sx = VW + 80 - k * (VW + 280);
    if (sx > -140 && sx < VW + 80) {
      g.fillStyle = '#2a1e10'; g.fillRect(sx + 30, 232, 7, 62);
      g.fillStyle = '#3a2a18'; g.fillRect(sx + 31, 232, 3, 62);
      g.fillStyle = '#12180f'; g.fillRect(sx - 6, 186, 92, 50);
      g.fillStyle = '#1f6b34'; g.fillRect(sx - 2, 190, 84, 42);
      g.fillStyle = '#2f8a44'; g.fillRect(sx - 2, 190, 84, 2);
      g.fillStyle = '#e8f4ea'; g.fillRect(sx + 2, 194, 76, 1);
      g.fillRect(sx + 2, 227, 76, 1); g.fillRect(sx + 2, 194, 1, 34); g.fillRect(sx + 77, 194, 1, 34);
      Font.draw(g, run.to, sx + 40, 200, { scale: 1, color: '#ffffff', align: 'center' });
      Font.draw(g, Math.max(1, Math.round(run.km * (1 - k))) + ' km', sx + 40, 214, { scale: 1, color: '#bfe8c6', align: 'center' });
    }
    // ---- the truck, bouncing down the road --------------------------------
    const img = Art.flip(Props.get('truck'));
    const tw = img.width * 1.5, th = img.height * 1.5;
    const tx = 210 + Math.sin(t * 0.8) * 20, ty = 316 + Math.abs(Math.sin(t * 9)) * 3;
    for (let i = 0; i < 12; i++) {                                // exhaust
      const e = ((t * 1.6 + i * 0.14) % 1);
      const px = tx - tw / 2 - 6 - e * 90;
      const py = ty - 10 - e * 22 + Math.sin(e * 7 + i) * 4;
      const a = (1 - e) * 0.4;
      if (a < 0.02) continue;
      g.fillStyle = `rgba(150,146,140,${a.toFixed(2)})`;
      Art.ell(g, px, py, 4 + e * 16, 3 + e * 12, g.fillStyle);
      g.fillStyle = `rgba(196,192,186,${(a * 0.5).toFixed(2)})`;
      Art.ell(g, px - 2, py - 2, 2 + e * 8, 1.6 + e * 6, g.fillStyle);
    }
    // its own headlights, reaching down the road
    const hx = tx + tw * 0.46;
    const hb = g.createLinearGradient(hx, ty - 8, hx + 210, ty + 16);
    hb.addColorStop(0, `rgba(255,238,184,${(0.14 + night * 0.28).toFixed(2)})`);
    hb.addColorStop(1, 'rgba(255,238,184,0)');
    g.fillStyle = hb;
    Art.poly(g, [[hx, ty - 12], [hx + 230, ty - 34], [hx + 230, ty + 30], [hx, ty - 2]], hb);
    Art.castShadow(g, img, tx, ty + 10, tw, th, { alpha: 0.34, lean: 0.3, squash: 0.14 });
    g.drawImage(img, Math.round(tx - tw / 2), Math.round(ty - th + 12), Math.round(tw), Math.round(th));
    for (let i = 0; i < 9; i++) {                                 // dust off the back wheels
      const dx = tx - tw / 2 - i * 14 - (t * 60) % 14, a = (1 - i / 9) * 0.38;
      g.fillStyle = `rgba(196,170,130,${a.toFixed(2)})`;
      Art.ell(g, dx, ty + 6 - (i % 3) * 4, 8 + i, 4 + i * 0.6, g.fillStyle);
    }
    // ---- the near verge tearing past the bottom of frame ------------------
    for (let i = 0; i < 10; i++) {
      const x = ((i * 84 - sp * 3.4) % (VW + 220) + VW + 220) % (VW + 220) - 110;
      const w2 = Props.get('weed', (i * 2) % 6);
      const sc = 1.15 + (i % 3) * 0.25;
      g.drawImage(w2, Math.round(x - w2.width * sc / 2), Math.round(378 - w2.height * sc),
                  Math.round(w2.width * sc), Math.round(w2.height * sc));
    }
    g.fillStyle = 'rgba(12,8,20,0.42)'; g.fillRect(0, 330, VW, VH - 330);
    for (let i = 0; i < 7; i++) {                                 // speed streaks
      const ly = 236 + i * 14, lx = ((i * 90 - t * 420) % (VW + 160) + VW + 160) % (VW + 160) - 80;
      g.fillStyle = 'rgba(255,255,255,0.16)'; g.fillRect(lx, ly, 40 + (i % 3) * 18, 2);
    }
    // ---- the dash: where you are going, and how far is left ---------------
    if (run.title) {
      Font.draw(g, run.title, VW / 2, 22, { scale: 2, color: '#f0d2a0', align: 'center', shadow: 'rgba(0,0,0,0.6)' });
      if (run.sub) Font.draw(g, run.sub, VW / 2, 42, { scale: 1, color: '#c9a9c0', align: 'center', shadow: 'rgba(0,0,0,0.6)' });
    } else {
      const bw = 210, bx = VW / 2 - bw / 2, by = 18;
      g.fillStyle = 'rgba(10,8,16,0.72)'; g.fillRect(bx - 3, by - 3, bw + 6, 34);
      g.fillStyle = 'rgba(232,223,168,0.25)'; g.fillRect(bx - 3, by - 3, bw + 6, 1);
      Font.draw(g, 'TO ' + run.to, VW / 2, by, { scale: 1, color: '#f5cd5c', align: 'center' });
      g.fillStyle = '#2a251f'; g.fillRect(bx, by + 13, bw, 6);
      g.fillStyle = '#6ea83e'; g.fillRect(bx, by + 13, Math.round(bw * k), 6);
      g.fillStyle = '#a8d46c'; g.fillRect(bx, by + 13, Math.round(bw * k), 2);
      Font.draw(g, Math.max(0, Math.round(run.km * (1 - k))) + ' km', VW / 2, by + 22, { scale: 1, color: '#cfc4a8', align: 'center' });
    }
    // ---- arriving ---------------------------------------------------------
    if (run.fade && run.t > run.dur) {
      const f = U.clamp((run.t - run.dur) / 0.55, 0, 1);
      g.fillStyle = `rgba(8,6,14,${f.toFixed(2)})`; g.fillRect(0, 0, VW, VH);
      if (f > 0.35) Font.draw(g, run.to, VW / 2, 156, { scale: 2, color: '#f5cd5c', align: 'center', shadow: '#000' });
    }
  }

  return { start, stop, update, render, paint, active, progress, get run() { return run; } };
})();
