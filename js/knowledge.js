// ---- The root network: fruit skills growing downward -----------------------
// A cross-section of the ground under the shrine. Three roots run down through
// the soil; each skill is a fruit hanging off one of them. You scroll down into
// the dark, which is the opposite of a skill tree and the point of this one.
const Knowledge = (() => {
  const VW = 640, VH = 360;
  const WORLD_H = 1000;
  const LANE = [138, 320, 502];
  let G = null;
  let cam = { y: 0, ty: 0 };
  let veins = null;

  const openRoots = () => Object.keys(G.gods || {}).length;
  const rootOpen = (r) => openRoots() >= ROOTS[r].gods;
  const owned = (k) => !!(G.fruit && G.fruit[k]);
  function costOf(sk) { return Math.max(1, sk.cost - ((G.relics && G.relics.ear) ? 1 : 0)); }
  function prereqOk(sk) {
    if (sk.slot === 0) return true;
    const prev = FRUIT_SKILLS.find((s) => s.root === sk.root && s.slot === sk.slot - 1);
    return !prev || owned(prev.key);
  }
  function state(sk) {
    if (owned(sk.key)) return 'own';
    if (!rootOpen(sk.root)) return 'shut';
    if (!prereqOk(sk)) return 'locked';
    return (G.fruitBank || 0) >= costOf(sk) ? 'buy' : 'poor';
  }
  function nodePos(sk) {
    // Roots wander as they descend, so no two nodes sit on the same vertical.
    const y = 150 + sk.slot * 168;
    const wig = Math.sin(sk.slot * 1.7 + sk.root * 2.1) * 34;
    return { x: LANE[sk.root] + wig, y };
  }

  function buy(sk) {
    const st = state(sk);
    if (st === 'own') return false;
    if (st === 'shut') { UI.toast(`${ROOTS[sk.root].name} opens when ${ROOTS[sk.root].gods} gods are awake.`, 'bad'); Audio.play('error'); return false; }
    if (st === 'locked') { UI.toast('The root above it is still bare.', 'bad'); Audio.play('error'); return false; }
    const c = costOf(sk);
    if ((G.fruitBank || 0) < c) { UI.toast(`${c} fruit. You have ${Math.floor(G.fruitBank)}.`, 'bad'); Audio.play('error'); return false; }
    G.fruitBank -= c;
    G.fruit[sk.key] = true;
    G.stats.learned++;
    const p = nodePos(sk);
    FX.sparkle(p.x, p.y - cam.y, 18, PAL.moss4);
    FX.confettiBurst(p.x, p.y - cam.y, 24);
    UI.toast(`<b>${sk.name}</b> &mdash; ${sk.desc}`, 'good');
    Audio.play('levelup');
    UI.refreshHUD(); UI.refreshRootHUD();
    return true;
  }

  // ---- scene --------------------------------------------------------------
  function buildVeins() {
    // Static hair-roots and stones in the soil, drawn once at world size.
    const { c, g } = Art.cv(VW, WORLD_H);
    const r = Art.rng(313);
    g.fillStyle = PAL.soil0; g.fillRect(0, 0, VW, WORLD_H);
    for (let i = 0; i < 5200; i++) {
      const x = Math.floor(r() * VW), y = Math.floor(r() * WORLD_H);
      g.fillStyle = r() < 0.5 ? U.shade(PAL.soil0, 0.12) : U.shade(PAL.soil0, -0.25);
      g.fillRect(x, y, 1, 1);
    }
    for (let i = 0; i < 60; i++) {
      const x = r() * VW, y = r() * WORLD_H;
      Art.ell(g, x, y, 3 + r() * 7, 2 + r() * 4, PAL.stone0);
      Art.ellBand(g, x, y, 3 + r() * 7, 2 + r() * 4, PAL.stone1, 0, 0.4);
    }
    for (let i = 0; i < 220; i++) {
      const x = r() * VW, y = r() * WORLD_H, len = 12 + r() * 40, a = r() * TAU;
      Art.limb(g, x, y, x + Math.cos(a) * len, y + Math.sin(a) * len, 2, 1, U.shade(PAL.bark1, 0.1));
    }
    // deeper is darker
    for (let y = 0; y < WORLD_H; y += 4) {
      g.globalAlpha = U.clamp((y - 300) / 1400, 0, 0.5);
      g.fillStyle = PAL.ink; g.fillRect(0, y, VW, 4);
      g.globalAlpha = 1;
    }
    veins = c;
  }

  function drawRoot(g, r, t) {
    const col = ROOTS[r].color;
    const open = rootOpen(r);
    const pts = [{ x: LANE[r], y: -40 }];
    for (let s = 0; s < 5; s++) {
      const sk = FRUIT_SKILLS.find((k) => k.root === r && k.slot === s);
      pts.push(nodePos(sk));
    }
    pts.push({ x: LANE[r] + Math.sin(9.4 + r * 2.1) * 40, y: WORLD_H - 40 });
    for (let i = 0; i + 1 < pts.length; i++) {
      const w0 = 15 - i * 2, w1 = 15 - (i + 1) * 2;
      Art.limb(g, pts[i].x, pts[i].y - cam.y, pts[i + 1].x, pts[i + 1].y - cam.y, w0, w1, open ? PAL.bark2 : PAL.bark0);
      Art.limb(g, pts[i].x - w0 * 0.25, pts[i].y - cam.y, pts[i + 1].x - w1 * 0.25, pts[i + 1].y - cam.y, w0 * 0.35, w1 * 0.35, open ? PAL.bark3 : PAL.bark1);
      // hairs
      for (let h = 0; h < 4; h++) {
        const p = (h + 0.5) / 4;
        const x = U.lerp(pts[i].x, pts[i + 1].x, p), y = U.lerp(pts[i].y, pts[i + 1].y, p) - cam.y;
        const s = h % 2 ? 1 : -1;
        Art.limb(g, x, y, x + s * (10 + h * 4), y + 8 + h * 3, 2, 1, open ? PAL.bark1 : PAL.bark0);
      }
    }
    if (open) {
      // sap running down a living root
      for (let i = 0; i < 6; i++) {
        const p = ((t * 0.12 + i / 6) % 1);
        const y = -40 + p * (WORLD_H + 40) - cam.y;
        if (y < -10 || y > VH + 10) continue;
        Art.rect(g, LANE[r] + Math.sin(p * 9 + r * 2.1) * 34, y, 2, 3, U.shade(col, 0.3));
      }
    }
  }

  function drawNode(g, sk, t) {
    const p = nodePos(sk), y = p.y - cam.y;
    if (y < -60 || y > VH + 60) return;
    const st = state(sk);
    const col = ROOTS[sk.root].color;
    const R = 21;
    // stalk
    Art.limb(g, p.x, y - R - 6, p.x, y - R + 2, 3, 2, PAL.bark2);
    if (st === 'shut') {
      Art.ell(g, p.x, y, R * 0.6, R * 0.7, PAL.stone0);
      Art.rect(g, p.x - 4, y - 3, 8, 8, PAL.stone1);
      Art.rect(g, p.x - 2, y - 7, 4, 5, PAL.stone2);
      Art.rect(g, p.x - 1, y, 2, 3, PAL.ink);
      return;
    }
    const ripe = st === 'own';
    const glow = st === 'buy';
    if (glow) {
      g.globalAlpha = 0.35 + 0.2 * Math.sin(t * 4 + sk.slot);
      Art.ditherDisc(g, p.x, y, R + 12, PAL.moss3, 0.5, 1);
      g.globalAlpha = 1;
    }
    // the fruit itself
    const body = ripe ? U.shade(col, 0.25) : U.shade(col, -0.35);
    Art.ell(g, p.x, y, R, R * 1.06, body);
    Art.ellBand(g, p.x, y, R, R * 1.06, U.shade(body, 0.25), 0, 0.32);
    Art.ellBand(g, p.x, y, R, R * 1.06, U.shade(body, -0.3), 0.76, 1);
    Art.speckle(g, p.x, y, R - 4, R - 4, U.shade(body, ripe ? 0.4 : -0.15), 14, sk.slot * 7 + sk.root);
    if (ripe) { Art.rect(g, p.x - R * 0.45, y - R * 0.5, 3, 3, PAL.bone4); }
    // icon
    const img = Icons.canvas(sk.icon);
    if (img) g.drawImage(img, Math.round(p.x - 12), Math.round(y - 12), 24, 24);
    // cost, or a tick
    g.font = '8px "Press Start 2P", monospace';
    g.textAlign = 'center';
    const label = ripe ? '' : costOf(sk) + ' fruit';
    if (label) {
      g.fillStyle = PAL.ink; g.fillText(label, p.x + 1, y + R + 15);
      g.fillStyle = st === 'buy' ? PAL.moss4 : PAL.bone1; g.fillText(label, p.x, y + R + 14);
    }
    g.fillStyle = PAL.ink; g.fillText(sk.name, p.x + 1, y - R - 9);
    g.fillStyle = ripe ? PAL.moss4 : PAL.bone2; g.fillText(sk.name, p.x, y - R - 10);
    g.textAlign = 'left';
  }

  // The shrine floor and the three root names. Drawn after the roots so a
  // trunk can never cross the lettering.
  function drawHeader(g) {
    if (cam.y >= 160) return;
    const y = 34 - cam.y;
    Art.rect(g, 0, 0, VW, Math.max(0, y), PAL.ink);
    Art.rect(g, 0, Math.max(0, y - 4), VW, 4, PAL.stone1);
    Art.rect(g, 0, Math.max(0, y - 4), VW, 1, PAL.stone3);
    g.font = '8px "Press Start 2P", monospace';
    g.textAlign = 'center';
    for (let i = 0; i < 3; i++) {
      // A dark plate behind each name, so it reads as a plaque on the stone.
      const w = ROOTS[i].name.length * 8 + 12;
      Art.rect(g, LANE[i] - w / 2, y + 8, w, 26, U.rgba(PAL.ink, 0.82));
      g.fillStyle = PAL.ink;
      g.fillText(ROOTS[i].name.toUpperCase(), LANE[i] + 1, y + 19);
      g.fillStyle = rootOpen(i) ? ROOTS[i].color : PAL.stone2;
      g.fillText(ROOTS[i].name.toUpperCase(), LANE[i], y + 18);
      g.fillStyle = rootOpen(i) ? PAL.bone1 : PAL.stone1;
      g.fillText(rootOpen(i) ? ROOTS[i].note : ROOTS[i].gods + ' gods', LANE[i], y + 30);
    }
    g.textAlign = 'left';
  }

  function render(g) {
    const t = G.time;
    if (!veins) buildVeins();
    g.drawImage(veins, 0, -Math.round(cam.y));
    // the stump the roots come down from
    for (let r = 0; r < 3; r++) drawRoot(g, r, t);
    for (const sk of FRUIT_SKILLS) drawNode(g, sk, t);
    drawHeader(g);
    // depth marker down the side
    g.font = '8px "Press Start 2P", monospace';
    g.fillStyle = U.rgba(PAL.bone1, 0.5);
    g.fillText(Math.round(cam.y / 10) + 'm', 8, VH - 10);
    FX.drawParticles(g, 0);
    FX.drawFloaters(g, true);
  }

  function nodeAt(x, y) {
    for (const sk of FRUIT_SKILLS) {
      const p = nodePos(sk);
      if (U.dist(x, y + cam.y, p.x, p.y) < 24) return sk;
    }
    return null;
  }
  function click(x, y) {
    const sk = nodeAt(x, y);
    if (!sk) return;
    buy(sk);
  }
  function hover(x, y) {
    const sk = nodeAt(x, y);
    if (!sk) return null;
    const st = state(sk);
    const tail = st === 'own' ? '<span class="good">Grown</span>'
      : st === 'shut' ? `<span class="warn">${ROOTS[sk.root].name} needs ${ROOTS[sk.root].gods} gods awake</span>`
      : st === 'locked' ? '<span class="warn">Grow the fruit above it first</span>'
      : `${costOf(sk)} fruit &middot; you have ${Math.floor(G.fruitBank)}`;
    return `<b>${sk.name}</b><br>${sk.desc}<br>${tail}`;
  }
  function scroll(dy) { cam.ty = U.clamp(cam.ty + dy, 0, WORLD_H - VH); }
  function update(dt) { cam.y += (cam.ty - cam.y) * Math.min(1, dt * 9); }
  function focus() {
    // Open on the shallowest thing you could actually buy.
    const next = FRUIT_SKILLS.find((s) => state(s) === 'buy') || FRUIT_SKILLS.find((s) => state(s) !== 'own');
    cam.ty = next ? U.clamp(nodePos(next).y - VH * 0.55, 0, WORLD_H - VH) : 0;
  }

  return {
    init(state2) { G = state2; veins = null; cam.y = cam.ty = 0; },
    enter() { focus(); cam.y = cam.ty; Audio.setMode('roots'); UI.refreshRootHUD(); },
    update, render, click, hover, scroll, buy, state, costOf, rootOpen, focus,
    ready: () => FRUIT_SKILLS.filter((s) => state(s) === 'buy').length,
  };
})();
