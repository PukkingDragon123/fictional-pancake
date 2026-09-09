// ---- The shrine: ten niches, and what it costs to fill one -----------------
// Ten alcoves cut into the rock. A sleeping god is a shrouded shape; a woken
// one stands in its niche for the rest of the game. Summoning runs a short
// cutscene rather than a dialog, because a god arriving should interrupt you.
const Ritual = (() => {
  const W = 640, H = 360;
  let G = null;
  let sel = null;
  let cut = null;                 // the cutscene, or null
  let candles = [];

  // Two rows of five, sized so the lower row's name plate still clears the
  // chamber floor at y = H - 26.
  function niche(i) {
    const col = i % 5, row = Math.floor(i / 5);
    return { x: 42 + col * 120, y: 30 + row * 140, w: 96, h: 106 };
  }
  const awake = (k) => !!(G.gods && G.gods[k]);
  const owned = (k) => !!(G.relics && G.relics[k]);
  const have = (t) => (G.offerings && G.offerings[t]) || 0;

  function billMet(gd) {
    for (const k of Object.keys(gd.ritual)) if (have(k) < gd.ritual[k]) return false;
    return true;
  }
  function rankMet(gd) { return (G.favourEver || 0) >= gd.favour; }
  function canSummon(gd) { return !awake(gd.key) && rankMet(gd) && billMet(gd); }
  function relicCost(gd) { return Math.max(40, Math.round(gd.favour * 0.6) + 60); }

  // ---- summoning ----------------------------------------------------------
  function summon(gd) {
    if (awake(gd.key)) return false;
    if (!rankMet(gd)) { UI.toast(`${gd.name} will not hear you yet. ${gd.favour} favour earned, all told.`, 'bad'); Audio.play('error'); return false; }
    if (!billMet(gd)) { UI.toast('The rite is not paid for.', 'bad'); Audio.play('error'); return false; }
    for (const k of Object.keys(gd.ritual)) G.offerings[k] -= gd.ritual[k];
    G.gods[gd.key] = true;
    G.stats.gods++;
    cut = { god: gd, t: 0, phase: 'gather', motes: [] };
    for (let i = 0; i < 60; i++) cut.motes.push({ a: U.rand(0, TAU), r: U.rand(60, 260), s: U.rand(0.4, 1.4), y: U.rand(0, H) });
    FX.letterbox(true); FX.setSlowmo(0.35); FX.vignette(0.7);
    Audio.play('whoosh');
    UI.refreshHUD(); UI.refreshOfferBar();
    return true;
  }
  function buyRelic(gd) {
    if (!awake(gd.key) || owned(gd.artifact.key)) return false;
    const c = relicCost(gd);
    if ((G.favour || 0) < c) { UI.toast(`${c} favour buys it. You have ${Math.floor(G.favour)}.`, 'bad'); Audio.play('error'); return false; }
    G.favour -= c;
    G.relics[gd.artifact.key] = true;
    UI.toast(`<b>${gd.artifact.name}</b> &mdash; ${gd.artifact.desc}`, 'good');
    FX.confettiBurst(W / 2, 120, 40);
    Audio.play('levelup');
    UI.refreshHUD();
    return true;
  }
  const pending = () => !!cut;

  // ---- update -------------------------------------------------------------
  function update(dt) {
    for (let i = candles.length - 1; i >= 0; i--) { candles[i].t += dt; if (candles[i].t > 3) candles.splice(i, 1); }
    if (!cut) return;
    cut.t += dt;
    if (cut.phase === 'gather' && cut.t > 2.1) {
      cut.phase = 'rise'; cut.t = 0;
      FX.flash(PAL.vio4, 0.9); FX.shake(9);
      Audio.play('record');
    } else if (cut.phase === 'rise' && cut.t > 2.4) {
      cut.phase = 'reveal'; cut.t = 0;
      FX.title(cut.god.name.toUpperCase(), { sub: cut.god.title, size: 20, dur: 3.4, color: cut.god.trim, style: 'fade' });
      FX.confettiBurst(W / 2, 140, 50);
    } else if (cut.phase === 'reveal' && cut.t > 3.6) {
      const gd = cut.god;
      cut = null;
      FX.letterbox(false); FX.setSlowmo(1); FX.vignette(0);
      UI.toast(`<b>${gd.blessing.name}</b> &mdash; ${gd.blessing.desc}`, 'good');
      if (gd.key === 'vessa') FX.title('THE GROVE IS FINISHED', { sub: 'and it was never going to be the same one', size: 15, dur: 4, color: PAL.goldL });
      UI.refreshHUD();
    }
  }

  // ---- drawing ------------------------------------------------------------
  function drawChamber(g) {
    // Rock face, cut back into darkness. All flat fills and dither, no gradients.
    g.fillStyle = PAL.stone0; g.fillRect(0, 0, W, H);
    const r = Art.rng(11);
    for (let i = 0; i < 700; i++) {
      const x = Math.floor(r() * W), y = Math.floor(r() * H);
      g.fillStyle = r() < 0.5 ? U.shade(PAL.stone0, -0.2) : PAL.stone1;
      g.fillRect(x, y, 1, 1);
    }
    for (let i = 0; i < 40; i++) {
      const x = r() * W, y = r() * H;
      Art.ditherDisc(g, x, y, 8 + r() * 26, U.shade(PAL.stone0, -0.25), 0.5, 1);
    }
    // floor
    Art.rect(g, 0, H - 26, W, 26, PAL.stone1);
    Art.rect(g, 0, H - 26, W, 2, PAL.stone2);
    for (let i = 0; i < 16; i++) Art.rect(g, i * 40 + 6, H - 24, 2, 22, U.shade(PAL.stone1, -0.2));
  }

  function drawNiche(g, i, t) {
    const gd = GODS[i], n = niche(i);
    const on = awake(gd.key);
    const hot = sel === i;
    // alcove
    Art.rect(g, n.x, n.y, n.w, n.h, PAL.stone0);
    Art.rect(g, n.x, n.y, n.w, 3, PAL.stone2);
    Art.rect(g, n.x, n.y, 3, n.h, U.shade(PAL.stone1, -0.1));
    Art.rect(g, n.x + n.w - 3, n.y, 3, n.h, U.shade(PAL.stone0, -0.2));
    Art.ditherDisc(g, n.x + n.w / 2, n.y + n.h * 0.45, n.w * 0.55, PAL.ink, 0.4, 0.5);
    if (on) {
      g.globalAlpha = 0.5 + 0.2 * Math.sin(t * 2 + i);
      Art.ditherDisc(g, n.x + n.w / 2, n.y + n.h * 0.42, 40, gd.trim, 0.4, 1);
      g.globalAlpha = 1;
      Sprites.blitGod(g, n.x + n.w / 2, n.y + n.h - 6, gd.key, gd, Math.floor(t * 3), 1);
    } else {
      // A shrouded shape, and the shape is enough. Its proportions come off the
      // god's own numbers, so no two sleepers stand the same way.
      const cx = n.x + n.w / 2, base = n.y + n.h - 6;
      const hgt = 66 + (i % 3) * 8, wid = 17 + (i % 4) * 2;
      const sh = U.shade(PAL.stone1, -0.28), sh2 = U.shade(PAL.stone1, -0.14);
      Art.poly(g, [[cx - 7, base - hgt], [cx + 7, base - hgt], [cx + wid, base], [cx - wid, base]], sh);
      Art.poly(g, [[cx - 7, base - hgt], [cx - 2, base - hgt], [cx + 3, base], [cx - wid, base]], U.shade(PAL.stone0, 0.06));
      Art.ell(g, cx, base - hgt - 2, 9, 10, sh2);
      for (let k = 0; k < 5; k++) Art.line(g, cx - 10 + k * 5, base - hgt * 0.75, cx - 14 + k * 7, base - 3, U.shade(PAL.stone0, -0.05));
      Art.rect(g, cx - 10, base - hgt * 0.5, 20, 2, PAL.ash1);
      if (gd.mask === 'antler' || gd.halo === 'horns') { Art.line(g, cx - 5, base - hgt - 8, cx - 9, base - hgt - 16, sh2); Art.line(g, cx + 5, base - hgt - 8, cx + 9, base - hgt - 16, sh2); }
    }
    // plinth and plate
    Art.rect(g, n.x + 6, n.y + n.h - 6, n.w - 12, 6, PAL.stone2);
    Art.rect(g, n.x + 6, n.y + n.h - 6, n.w - 12, 2, PAL.stone3);
    // candles: lit for a woken god, unlit for a payable rite, dark otherwise
    const lit = on ? 2 : canSummon(gd) ? 1 : 0;
    for (let k = 0; k < 2; k++) {
      const cx = n.x + 12 + k * (n.w - 24), cy = n.y + n.h - 8;
      Art.rect(g, cx - 1, cy - 8, 3, 8, PAL.bone2);
      if (lit) {
        const f = Math.sin(t * 7 + k + i) * 0.5;
        Art.rect(g, cx, cy - 11 + f, 1, 3, lit === 2 ? PAL.goldL : PAL.vio4);
        g.globalAlpha = 0.35;
        Art.ditherDisc(g, cx, cy - 10, 7, lit === 2 ? PAL.gold : PAL.vio2, 0.6, 1);
        g.globalAlpha = 1;
      }
    }
    if (hot) {
      g.strokeStyle = PAL.goldL; g.lineWidth = 2;
      g.strokeRect(n.x - 1, n.y - 1, n.w + 2, n.h + 2);
    }
    // name plate
    const label = on ? gd.name : rankMet(gd) ? gd.name : '???';
    g.font = '8px "Press Start 2P", monospace';
    g.textAlign = 'center';
    g.fillStyle = PAL.ink; g.fillText(label, n.x + n.w / 2 + 1, n.y + n.h + 15);
    g.fillStyle = on ? gd.trim : rankMet(gd) ? PAL.bone2 : PAL.stone2;
    g.fillText(label, n.x + n.w / 2, n.y + n.h + 14);
    g.textAlign = 'left';
  }

  function drawCutscene(g) {
    const gd = cut.god, t = cut.t;
    g.fillStyle = U.rgba(PAL.ink, 0.72); g.fillRect(0, 0, W, H);
    const cx = W / 2, base = H - 54;   // clear of the letterbox bar
    if (cut.phase === 'gather') {
      // the offerings you paid, drawn in and burned
      const p = U.clamp(t / 2.1, 0, 1);
      for (const m of cut.motes) {
        const r = m.r * (1 - U.easeIn(p));
        const x = cx + Math.cos(m.a + t * 0.6) * r, y = base - 60 + Math.sin(m.a + t * 0.6) * r * 0.5;
        Art.rect(g, x, y, 1 + (m.s > 1 ? 1 : 0), 1 + (m.s > 1 ? 1 : 0), p > 0.6 ? PAL.vio4 : PAL.bone3);
      }
      g.globalAlpha = p * 0.7;
      Art.ditherDisc(g, cx, base - 60, 20 + p * 40, gd.trim, 0.5, 1);
      g.globalAlpha = 1;
    } else {
      const p = cut.phase === 'rise' ? U.clamp(t / 2.4, 0, 1) : 1;
      const rise = U.easeOut(p);
      // rays
      for (let i = 0; i < 18; i++) {
        const a = (i / 18) * TAU + t * 0.25;
        g.globalAlpha = 0.16 + 0.1 * Math.sin(t * 3 + i);
        Art.line(g, cx, base - 120, cx + Math.cos(a) * 400, base - 120 + Math.sin(a) * 400, gd.trim);
        g.globalAlpha = 1;
      }
      g.globalAlpha = 0.6;
      Art.ditherDisc(g, cx, base - 110, 70 + Math.sin(t * 2) * 6, gd.robe1, 0.6, 1);
      g.globalAlpha = 1;
      Sprites.blitGod(g, cx, base + (1 - rise) * 200, gd.key, gd, Math.floor(t * 4), 2);
      if (cut.phase === 'reveal') {
        g.font = '8px "Press Start 2P", monospace';
        g.textAlign = 'center';
        const lines = wrap(gd.verse, 46);
        for (let i = 0; i < lines.length; i++) {
          g.fillStyle = PAL.ink; g.fillText(lines[i], cx + 1, H - 26 + i * 12 + 1);
          g.fillStyle = PAL.bone3; g.fillText(lines[i], cx, H - 26 + i * 12);
        }
        g.textAlign = 'left';
      }
    }
  }
  function wrap(s, n) {
    const out = [], words = s.split(' ');
    let line = '';
    for (const w of words) {
      if ((line + ' ' + w).trim().length > n) { out.push(line.trim()); line = w; }
      else line += ' ' + w;
    }
    if (line.trim()) out.push(line.trim());
    return out.slice(0, 3);
  }

  function render(g) {
    const t = G.time;
    drawChamber(g);
    for (let i = 0; i < GODS.length; i++) drawNiche(g, i, t);
    FX.drawParticles(g, 0);
    if (cut) drawCutscene(g);
    FX.drawFloaters(g, true);
  }

  // ---- input --------------------------------------------------------------
  function at(x, y) {
    for (let i = 0; i < GODS.length; i++) {
      const n = niche(i);
      if (x >= n.x && x <= n.x + n.w && y >= n.y && y <= n.y + n.h + 14) return i;
    }
    return -1;
  }
  function click(x, y) {
    if (cut) return;
    const i = at(x, y);
    if (i < 0) { sel = null; return; }
    sel = i;
    Audio.play('click');
    UI.showGod(GODS[i]);
  }
  function hover(x, y) {
    if (cut) return null;
    const i = at(x, y);
    if (i < 0) return null;
    const gd = GODS[i];
    if (!rankMet(gd)) return `<b>???</b><br><span class="dim">Sleeping. ${gd.favour} favour earned, all told, before it stirs.</span>`;
    if (awake(gd.key)) return `<b>${gd.name}</b> <span class="dim">${gd.title}</span><br><span class="good">${gd.blessing.name}</span> &mdash; ${gd.blessing.desc}`;
    const bill = Object.keys(gd.ritual).map((k) => `${have(k)}/${gd.ritual[k]} ${OFFERINGS[k].name}`).join('<br>');
    return `<b>${gd.name}</b> <span class="dim">${gd.title}</span><br>${bill}`;
  }

  return {
    init(state) { G = state; sel = null; cut = null; },
    enter() { sel = null; Audio.setMode('shrine'); },
    update, render, click, hover, summon, buyRelic, pending,
    canSummon, rankMet, billMet, relicCost, awake, owned,
    get selected() { return sel === null ? null : GODS[sel]; },
  };
})();
