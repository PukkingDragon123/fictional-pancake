// ---- The drive: the road between one place and the next --------------------
// Every journey on the map is actually driven, through the same painted
// country as the title screen (see scenery.js): a sign coming up with the
// distance on it, the odd car the other way, and the farm wagon bouncing
// along with a wombat in the back.
const Drive = (() => {
  const VW = 640, VH = 360;

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
    const sp = t * 170;
    // the same country the title screen drives through, in the afternoon sun
    Scenery.paint(g, sp + (run.km || 0) * 97, {
      road: 296, t,
      onRoad: (g2, R) => {
        for (const c of run.cars) {                      // something coming the other way
          const img = Art.tinted(Props.get('truck'), c.col, 0.45);
          const sc = 0.9, w = img.width * sc, h = img.height * sc, y = R + 22;
          g2.fillStyle = 'rgba(0,0,0,0.25)'; Art.ell(g2, c.x, y + 2, w * 0.42, 3);
          g2.drawImage(img, Math.round(c.x - w / 2), Math.round(y - h + 6), Math.round(w), Math.round(h));
        }
      },
    });
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
    // ---- the car, bouncing down the road ------------------------------------
    Scenery.car(g, 210 + Math.sin(t * 0.8) * 20, 330, t, { wombat: true });
    // ---- the dash: where you are going, and how far is left ---------------
    if (run.title) {
      Font.draw(g, run.title, VW / 2, 22, { scale: 2, color: '#f0d2a0', align: 'center', shadow: 'rgba(0,0,0,0.6)' });
      if (run.sub) Font.draw(g, run.sub, VW / 2, 42, { scale: 1, color: '#c9a9c0', align: 'center', shadow: 'rgba(0,0,0,0.6)' });
    } else {
      // a parchment card in the oak frame, like everything else you read
      const bw = 210, bx = VW / 2 - bw / 2, by = 16;
      g.fillStyle = 'rgba(40,20,8,0.3)'; g.fillRect(bx - 8, by - 2, bw + 16, 42);
      g.fillStyle = '#3b1f10'; g.fillRect(bx - 8, by - 6, bw + 16, 42);
      g.fillStyle = '#c47a3c'; g.fillRect(bx - 6, by - 4, bw + 12, 38);
      g.fillStyle = '#fcefd0'; g.fillRect(bx - 3, by - 1, bw + 6, 32);
      Font.draw(g, 'TO ' + run.to, VW / 2, by + 2, { scale: 1, color: '#6d2e12', align: 'center' });
      g.fillStyle = '#d8c09a'; g.fillRect(bx, by + 14, bw, 6);
      g.fillStyle = '#6ea83e'; g.fillRect(bx, by + 14, Math.round(bw * k), 6);
      g.fillStyle = '#a8d46c'; g.fillRect(bx, by + 14, Math.round(bw * k), 2);
      Font.draw(g, Math.max(0, Math.round(run.km * (1 - k))) + ' km', VW / 2, by + 22, { scale: 1, color: '#9a6a3c', align: 'center' });
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
