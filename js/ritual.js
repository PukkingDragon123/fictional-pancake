// ---- The shrine: staging offerings, and the summoning ---------------------
const Ritual = (() => {
  let G = null;
  const W = 640, H = 360;
  const CX = 320, BASE = 268;
  // The cutscene is a timeline. Each beat owns a slice of the elapsed time.
  const BEATS = [
    ['dark', 0.9], ['roots', 1.7], ['charge', 1.5], ['strike', 0.7], ['reveal', 2.6], ['bless', 2.4], ['out', 1.0],
  ];
  const TOTAL = BEATS.reduce((a, b) => a + b[1], 0);
  const scene = { on: false, t: 0, god: null, beat: '', beatT: 0, boltT: 0, rune: 0, shown: false, motes: [] };

  function need(god) {
    const cut = G.fruits.godtongue ? 1 : 0;
    const out = {};
    for (const k in god.ritual) out[k] = Math.max(1, god.ritual[k] - cut);
    return out;
  }
  function staged() { return G.staged || (G.staged = {}); }
  function held(type) { return (G.offerings[type] || 0) + (G.blessed[type] || 0); }
  function meets(god) {
    const n = need(god), s = staged();
    for (const k in n) if ((s[k] || 0) < n[k]) return false;
    return true;
  }
  function available() { return GODS.filter((g) => !G.summoned[g.key]); }
  function readyGod() { return available().find(meets) || null; }
  function stage(type, n = 1) {
    let done = 0;
    for (let i = 0; i < n; i++) {
      if ((G.offerings[type] || 0) > 0) G.offerings[type]--;
      else if ((G.blessed[type] || 0) > 0) G.blessed[type]--;
      else break;
      staged()[type] = (staged()[type] || 0) + 1;
      done++;
    }
    if (done) { Audio.play('place'); UI.refreshHUD(); UI.refreshTray(); UI.refreshRitual(); }
    else Audio.play('error');
  }
  function unstage(type) {
    const s = staged();
    if (!s[type]) return;
    s[type]--;
    if (!s[type]) delete s[type];
    G.offerings[type] = (G.offerings[type] || 0) + 1;
    Audio.play('click'); UI.refreshHUD(); UI.refreshTray(); UI.refreshRitual();
  }
  function clearStage() {
    const s = staged();
    for (const k in s) { G.offerings[k] = (G.offerings[k] || 0) + s[k]; delete s[k]; }
    UI.refreshHUD(); UI.refreshTray(); UI.refreshRitual();
  }

  function summon() {
    const god = readyGod();
    if (!god || scene.on) { Audio.play('error'); return; }
    const n = need(god), s = staged();
    for (const k in n) { s[k] -= n[k]; if (s[k] <= 0) delete s[k]; }
    scene.on = true; scene.t = 0; scene.god = god; scene.shown = false; scene.motes.length = 0;
    G.paused = true;
    FX.clear();
    FX.letterbox(true);
    Audio.play('growl');
    UI.hideAll();
  }
  function skip() { if (scene.on) scene.t = Math.max(scene.t, TOTAL - 1.0); }

  function finish() {
    const god = scene.god;
    scene.on = false;
    G.paused = false;
    G.summoned[god.key] = true;
    G.blessings[god.key] = true;
    G.artifacts[god.key] = (G.artifacts[god.key] || 0) + 1;
    G.stats.summons = (G.stats.summons || 0) + 1;
    if (god.key === 'demewombra') G.seeds.runeberry = (G.seeds.runeberry || 0) + 3;
    FX.setSlowmo(1, true); FX.vignette(0); FX.letterbox(false); FX.cine.tDesat = 0;
    Audio.setMode('pen');
    UI.showBlessing(god);
    Main.save();
  }

  function beatAt(t) {
    let acc = 0;
    for (const [name, dur] of BEATS) {
      if (t < acc + dur) return [name, (t - acc) / dur];
      acc += dur;
    }
    return ['out', 1];
  }

  function update(dt, realDt) {
    if (!scene.on) return;
    scene.t += realDt;
    const [beat, p] = beatAt(scene.t);
    const changed = beat !== scene.beat;
    scene.beat = beat; scene.beatT = p;
    if (changed) onBeat(beat);
    if (beat === 'roots' && Math.random() < realDt * 17) {
      const a = Math.random() * TAU, r = 70 + Math.random() * 90;
      FX.root(CX + Math.cos(a) * r, BASE + Math.sin(a) * 22, { len: U.rand(48, 118), rise: U.rand(0.8, 1.5), w: U.rand(3, 6.5), life: 7 });
      FX.dust(CX + Math.cos(a) * r, BASE + Math.sin(a) * 22, 4, PAL.soil2);
    }
    if (beat === 'charge') {
      if (Math.random() < realDt * 26) {
        const a = Math.random() * TAU, r = 120 + Math.random() * 90;
        scene.motes.push({ x: CX + Math.cos(a) * r, y: BASE - 40 + Math.sin(a) * 60, life: 1.2, col: U.pick([PAL.div4, PAL.div5, PAL.cyan3, scene.god.color]) });
      }
      FX.shake(0.6);
    }
    if (beat === 'strike') {
      scene.boltT -= realDt;
      if (scene.boltT <= 0) {
        scene.boltT = 0.09;
        FX.lightning(CX + U.rand(-70, 70), -20, CX + U.rand(-26, 26), BASE - 60, { color: PAL.cream, glow: U.rgba(scene.god.color, 0.6), w: U.rand(2, 3.4), forks: 3 });
        FX.flash(PAL.cream, 0.7); FX.shake(9);
      }
    }
    if (beat === 'reveal' && Math.random() < realDt * 14) {
      FX.spawn({ x: CX + U.rand(-90, 90), y: BASE + 10, vx: U.rand(-8, 8), vy: -U.rand(30, 90), life: U.rand(1, 2), size: 2, color: U.pick([scene.god.color, PAL.div5, PAL.gold3]), gravity: -6 });
    }
    for (let i = scene.motes.length - 1; i >= 0; i--) {
      const m = scene.motes[i];
      m.life -= realDt;
      if (m.life <= 0) { scene.motes.splice(i, 1); continue; }
      const tx = CX, ty = BASE - 70;
      m.x = U.lerp(m.x, tx, 1 - Math.pow(0.04, realDt));
      m.y = U.lerp(m.y, ty, 1 - Math.pow(0.04, realDt));
    }
    scene.rune += realDt * (beat === 'charge' ? 1.6 : beat === 'strike' ? 4 : 0.5);
    if (scene.t >= TOTAL) finish();
  }
  function onBeat(beat) {
    const god = scene.god;
    switch (beat) {
      case 'dark': FX.vignette(0.9); FX.cine.tDesat = 0.7; Audio.play('wind'); Audio.setMode('tower'); break;
      case 'roots': Audio.play('rumble'); FX.shake(3); break;
      case 'charge': Audio.play('chant'); FX.setSlowmo(0.85); break;
      case 'strike': Audio.play('thunder'); FX.hitstop(0.16); FX.punch(0.2); break;
      case 'reveal':
        Audio.play('chime'); Audio.play('bless');
        FX.flash(U.rgba(god.color, 0.8), 0.6); FX.punch(0.14); FX.shake(6);
        FX.cine.tDesat = 0;
        FX.title(god.name.toUpperCase(), { size: 22, color: god.color, dur: 2.4, sub: god.title, style: 'slam' });
        break;
      case 'bless':
        Audio.play('cheer', 1);
        FX.confettiBurst(CX, 150, 90);
        for (let i = 0; i < 3; i++) FX.ring(CX, BASE - 60, 60 + i * 40, U.rgba(god.color, 0.5));
        break;
      case 'out': FX.setSlowmo(1); FX.vignette(0.2); break;
    }
  }

  // ---- shrine mode (staging) ---------------------------------------------
  function renderShrine(g) {
    const f = World.fraction();
    // dusk: deep indigo overhead falling to a warm band at the treeline
    const SKYK = ['#140d28', '#211444', '#3a1f5e', '#5b2c66', '#8a4159', '#c06a4a'];
    for (let i = 0; i < 12; i++) {
      const t = i / 11, seg = t * (SKYK.length - 1);
      const a = SKYK[Math.floor(seg)], b2 = SKYK[Math.min(SKYK.length - 1, Math.floor(seg) + 1)];
      g.fillStyle = U.mix(a, b2, seg - Math.floor(seg));
      g.fillRect(0, Math.round((250 * i) / 12), W, Math.ceil(250 / 12) + 1);
    }
    // a few early stars
    g.fillStyle = PAL.cream;
    for (let i = 0; i < 34; i++) {
      const sx = (i * 173) % W, sy = (i * 71) % 150;
      g.globalAlpha = 0.25 + 0.45 * Math.sin(G.time * 1.7 + i);
      g.fillRect(sx, sy, 2, 2);
    }
    g.globalAlpha = 1;
    // low moon
    g.fillStyle = 'rgba(194,244,255,0.1)'; Art.ell(g, 92, 62, 34, 34);
    g.fillStyle = '#c2f4ff'; Art.ell(g, 92, 62, 17, 17);
    g.fillStyle = '#8ab6c9'; Art.ell(g, 99, 55, 6, 6); Art.ell(g, 86, 70, 4, 4);
    for (let i = 0; i < 8; i++) {
      const img = Props.get('tree', `${['oak', 'pine', 'gnarl', 'birch'][i % 4]}|${i % 4}|${(f > 0.5 ? 0.3 : 0.52).toFixed(2)}`);
      g.globalAlpha = 0.55;
      g.drawImage(img, i * 88 - 26, 128, img.width * 1.25, img.height * 1.25);
    }
    g.globalAlpha = 1;
    g.fillStyle = U.mix('#2e2a1c', '#31502a', f); g.fillRect(0, 250, W, H - 250);
    g.fillStyle = U.mix('#3a3324', '#3f5a2c', f); g.fillRect(0, 250, W, 4);
    g.fillStyle = 'rgba(0,0,0,0.2)'; for (let i = 0; i < 30; i++) g.fillRect((i * 71) % W, 258 + ((i * 53) % 90), 8, 2);
    // rune circle
    g.save();
    g.translate(CX, BASE + 6); g.scale(1, 0.34); g.rotate(G.time * 0.24);
    for (const r of [96, 74]) {
      g.strokeStyle = U.rgba(PAL.div3, 0.5); g.lineWidth = 2;
      g.beginPath(); g.arc(0, 0, r, 0, TAU); g.stroke();
    }
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU;
      g.fillStyle = U.rgba(PAL.div4, 0.6);
      g.fillRect(Math.cos(a) * 85 - 3, Math.sin(a) * 85 - 3, 6, 6);
    }
    g.restore();
    // shrine, large
    const img = Props.get('shrine', G.up.shrine || 0);
    const s = 1.7;
    g.drawImage(img, Math.round(CX - (img.width * s) / 2), Math.round(BASE - img.height * s + 10), img.width * s, img.height * s);
    // staged offerings stacked on the altar
    const set = staged();
    let i = 0;
    for (const k in set) for (let n = 0; n < set[k]; n++) {
      const def = OFFERINGS[k];
      const px = CX - 54 + (i % 12) * 9.5, py = BASE - 58 - Math.floor(i / 12) * 10;
      g.save(); g.translate(px, py);
      g.rotate(Math.sin(G.time * 2 + i) * 0.04);
      Sprites.drawCube(g, def, 9, 9, {});
      g.restore();
      i++;
    }
    // two wombats keep vigil
    Sprites.blit(g, CX - 92, BASE + 6, 'pray', Math.floor(G.time * 3), 'brown', 1, 'adult', 2);
    Sprites.blit(g, CX + 92, BASE + 6, 'pray', Math.floor(G.time * 3 + 2), 'sand', -1, 'adult', 2);
    const god = readyGod();
    if (god) {
      const p = 0.5 + 0.5 * Math.sin(G.time * 3);
      const gy = BASE - 96;
      const rad = 52 + p * 12;
      const grd = g.createRadialGradient(CX, gy, 3, CX, gy, rad);
      grd.addColorStop(0, U.rgba(god.color, 0.4 + p * 0.2)); grd.addColorStop(1, U.rgba(god.color, 0));
      g.fillStyle = grd; g.fillRect(CX - rad, gy - rad, rad * 2, rad * 2);
      Icons.blit(g, god.glyph, CX - 12, gy - 12 - p * 3, 1.5);
      for (let k = 0; k < 3; k++) {
        const a = G.time * 1.2 + k * 2.1;
        g.fillStyle = U.rgba(god.color, 0.8);
        Art.ell(g, CX + Math.cos(a) * 34, gy + Math.sin(a) * 16, 2.4, 2.4);
      }
    }
    FX.drawParticles(g, 0);
    FX.drawFloaters(g, false);
    FX.drawComics(g, false);
  }

  // ---- the summoning ------------------------------------------------------
  function renderScene(g) {
    const god = scene.god, beat = scene.beat, p = scene.beatT;
    const dark = beat === 'dark' ? p : 1;
    // sky torn open above the grove
    for (let i = 0; i < 9; i++) {
      const a = i / 8;
      g.fillStyle = U.mix(U.mix('#0d0a14', '#1b1030', dark), U.mix('#241d2a', god.color, 0.16 * dark), a);
      g.fillRect(0, Math.round((H * i) / 9), W, Math.ceil(H / 9) + 1);
    }
    // silhouetted forest
    g.fillStyle = '#0b0810';
    for (let i = 0; i < 7; i++) { const img = Props.get('tree', `${['gnarl', 'dead', 'pine'][i % 3]}|${i % 3}|0.62`); g.globalAlpha = 0.85; g.drawImage(img, i * 100 - 26, 26, img.width * 1.3, img.height * 1.3); }
    g.globalAlpha = 1;
    g.fillStyle = '#141019'; g.fillRect(0, 262, W, H - 262);
    // rune circle brightening through the rite
    const heat = beat === 'dark' ? p * 0.3 : beat === 'roots' ? 0.3 + p * 0.3 : beat === 'charge' ? 0.6 + p * 0.4 : 1;
    g.save();
    g.translate(CX, BASE + 8); g.scale(1, 0.34); g.rotate(scene.rune);
    for (const r of [110, 84, 58]) {
      g.strokeStyle = U.rgba(god.color, 0.35 * heat); g.lineWidth = 3;
      g.beginPath(); g.arc(0, 0, r, 0, TAU); g.stroke();
    }
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * TAU;
      g.fillStyle = U.rgba(PAL.div5, 0.6 * heat);
      g.fillRect(Math.cos(a) * 98 - 4, Math.sin(a) * 98 - 4, 8, 8);
    }
    g.restore();
    // ground glow
    const gg = g.createRadialGradient(CX, BASE, 6, CX, BASE, 190);
    gg.addColorStop(0, U.rgba(god.color, 0.4 * heat)); gg.addColorStop(1, U.rgba(god.color, 0));
    g.fillStyle = gg; g.fillRect(CX - 190, BASE - 190, 380, 380);

    // shrine
    const img = Props.get('shrine', G.up.shrine || 0);
    const s = 1.7;
    g.drawImage(img, Math.round(CX - (img.width * s) / 2), Math.round(BASE - img.height * s + 10), img.width * s, img.height * s);

    // the god rises out of the light
    if (beat === 'reveal' || beat === 'bless' || beat === 'out') {
      const rise = beat === 'reveal' ? U.easeOut(Math.min(1, p * 1.5)) : 1;
      const gi = Sprites.godForm(god, Math.floor(G.time * 3));
      const gs = 2.6;
      const gw = gi.width * gs, gh = gi.height * gs;
      const gy = U.lerp(BASE + 50, BASE - 74, rise);
      // aura
      const ag = g.createRadialGradient(CX, gy - gh / 2, 10, CX, gy - gh / 2, 150);
      ag.addColorStop(0, U.rgba(god.color, 0.45)); ag.addColorStop(1, U.rgba(god.color, 0));
      g.fillStyle = ag; g.fillRect(CX - 150, gy - gh / 2 - 150, 300, 300);
      // shafts
      g.save();
      g.globalAlpha = 0.22 + 0.1 * Math.sin(G.time * 3);
      g.fillStyle = U.rgba(god.color, 1);
      for (let i = 0; i < 9; i++) {
        g.save(); g.translate(CX, gy - gh * 0.55); g.rotate(G.time * 0.2 + (i / 9) * TAU);
        g.beginPath(); g.moveTo(0, 0); g.lineTo(-9, -300); g.lineTo(9, -300); g.closePath(); g.fill();
        g.restore();
      }
      g.restore();
      g.save();
      g.globalAlpha = rise;
      g.drawImage(gi, Math.round(CX - gw / 2), Math.round(gy - gh), gw, gh);
      g.restore();
      if (beat === 'bless') {
        const ap = U.easeOut(Math.min(1, p * 2));
        const ay = U.lerp(gy - gh * 0.5, BASE - 30, ap);
        const glow = 0.5 + 0.5 * Math.sin(G.time * 6);
        const ag2 = g.createRadialGradient(CX, ay, 2, CX, ay, 34);
        ag2.addColorStop(0, U.rgba(PAL.gold4, 0.6 * glow)); ag2.addColorStop(1, U.rgba(PAL.gold4, 0));
        g.fillStyle = ag2; g.fillRect(CX - 34, ay - 34, 68, 68);
        Icons.blit(g, god.artIcon, CX - 16, ay - 16, 2);
      }
    }
    // motes drawn in world order
    for (const m of scene.motes) {
      g.globalAlpha = U.clamp(m.life, 0, 1);
      g.fillStyle = m.col;
      g.fillRect(Math.round(m.x), Math.round(m.y), 2, 2);
    }
    g.globalAlpha = 1;
    FX.drawParticles(g, 0);
    FX.drawFloaters(g, false);
    FX.drawComics(g, false);
    // rain of light during the strike
    if (beat === 'strike') {
      g.strokeStyle = U.rgba(PAL.cream, 0.35); g.lineWidth = 1;
      for (let i = 0; i < 30; i++) {
        const x = (i * 97 + G.time * 900) % W;
        g.beginPath(); g.moveTo(x, 0); g.lineTo(x - 6, H); g.stroke();
      }
    }
  }

  return {
    init(g) { G = g; if (!G.staged) G.staged = {}; },
    update, renderShrine, renderScene, summon, skip, stage, unstage, clearStage,
    staged, readyGod, meets, need, available, held,
    get active() { return scene.on; },
    get god() { return scene.god; },
  };
})();
