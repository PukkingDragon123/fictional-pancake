// ---- The Wombat Tree: grown with compost, climbed for skills --------------
const Tree = (() => {
  let G = null;
  const VW = 640, VH = 360;
  const TW = 300, TH = 460, S = 2;              // art size, blit scale
  const OX = (VW - TW * S) / 2;                 // 20
  const WORLD_H = TH * S + 40;                  // 960
  const SEED = 1337;
  const cam = { y: WORLD_H - VH, ty: WORLD_H - VH, vy: 0 };
  let layout = null, hoverNode = -1, climbAnim = 0, glow = 0, stageFlash = 0;
  const motes = [];

  function ensureLayout() { if (!layout) layout = Props.buildTree(TW, TH, 5, SEED); return layout; }
  function anchorFor(sk) {
    const a = ensureLayout().anchors.filter((an) => an.bough === sk.bough)[sk.slot];
    return a ? { x: OX + a.x * S, y: a.y * S } : { x: VW / 2, y: 200 };
  }
  function stageOf(xp) { let s = 0; for (let i = 0; i < TREE_STAGES.length; i++) if (xp >= TREE_STAGES[i].xp) s = i; return s; }
  function info() {
    const t = G.tree;
    const stage = stageOf(t.xp);
    const next = TREE_STAGES[stage + 1] || null;
    const prev = TREE_STAGES[stage];
    return {
      stage, name: TREE_STAGES[stage].name, note: TREE_STAGES[stage].note,
      xp: t.xp, next: next ? next.xp : null,
      frac: next ? U.clamp((t.xp - prev.xp) / (next.xp - prev.xp), 0, 1) : 1,
      acorns: acorns(),
    };
  }
  function acorns() { return Math.max(0, Math.floor(G.tree.xp / XP_PER_ACORN) - G.tree.spent); }
  function syncStage() { G.tree.stage = stageOf(G.tree.xp); return G.tree.stage; }
  function boughOpen(b) { return stageOf(G.tree.xp) >= b + 1; }
  function owned(k) { return !!G.skills[k]; }
  function prereqOk(sk) {
    if (sk.slot === 0) return true;
    const prev = SKILLS.find((s) => s.bough === sk.bough && s.slot === sk.slot - 1);
    return !prev || owned(prev.key);
  }
  function state(sk) {
    if (owned(sk.key)) return 'owned';
    if (!boughOpen(sk.bough)) return 'ungrown';
    if (!prereqOk(sk)) return 'locked';
    return acorns() >= sk.cost ? 'ready' : 'short';
  }

  // ---- growing ------------------------------------------------------------
  function compost(type, usePremium) {
    const def = CUBES[type];
    if (!def) return false;
    const bag = usePremium ? G.premium : G.cubes;
    if ((bag[type] || 0) <= 0) return false;
    bag[type]--;
    let xp = def.compost * (usePremium ? 2 : 1);
    if (G.skills.legend) xp = Math.round(xp * 1.5);
    const before = stageOf(G.tree.xp), beforeAc = acorns();
    G.tree.xp += xp;
    G.stats.composted = (G.stats.composted || 0) + 1;
    const after = syncStage();
    Audio.play('plop');
    for (let i = 0; i < 8; i++) motes.push({ x: VW / 2 + U.rand(-24, 24), y: WORLD_H - 30, vy: -U.rand(40, 90), life: U.rand(1.2, 2.2), col: U.pick([PAL.leaf2, PAL.leaf3, PAL.goldL]) });
    FX.float(VW / 2 + U.rand(-30, 30), VH - 90, '+' + xp, { color: PAL.leaf3, size: 9 });
    glow = 1;
    if (acorns() > beforeAc) { Audio.play('coin'); FX.float(VW / 2, VH - 130, '+1 acorn', { color: PAL.goldL, size: 9 }); }
    if (after > before) {
      layout = null; stageFlash = 1;
      Audio.play('levelup'); FX.flash(PAL.goldL, 0.35); FX.punch(0.1); FX.shake(3);
      FX.title(TREE_STAGES[after].name.toUpperCase(), { size: 20, color: PAL.goldL, dur: 2, sub: TREE_STAGES[after].note });
      FX.confettiBurst(VW / 2, VH * 0.4, 50);
      UI.toast('The tree is now a ' + TREE_STAGES[after].name + '.', 'good');
    }
    UI.refreshHUD(); UI.refreshCompostBar(); UI.refreshTreeHUD();
    Main.save();
    return true;
  }
  function buy(sk) {
    const st = state(sk);
    if (st === 'owned') return;
    if (st === 'ungrown') { Audio.play('error'); UI.toast('This bough has not grown yet. Compost more.', 'bad'); return; }
    if (st === 'locked') { Audio.play('error'); UI.toast('Take the skill below it first.', 'bad'); return; }
    if (st === 'short') { Audio.play('error'); UI.toast('Not enough acorns.', 'bad'); return; }
    G.tree.spent += sk.cost;
    G.skills[sk.key] = true;
    Audio.play('perk'); FX.punch(0.08);
    const a = anchorFor(sk);
    FX.sparkle(a.x, a.y - cam.y, 14, PAL.goldL);
    FX.title(sk.name.toUpperCase(), { size: 16, color: PAL.leaf3, dur: 1.5, sub: sk.desc });
    UI.refreshHUD(); UI.refreshTreeHUD();
    Main.save();
  }

  // ---- view ---------------------------------------------------------------
  function focusStage() {
    // park the view on the highest grown bough so new skills are in frame
    const st = stageOf(G.tree.xp);
    if (st <= 0) { cam.ty = WORLD_H - VH; return; }
    const b = Math.min(2, st - 1);
    const a = ensureLayout().anchors.filter((an) => an.bough === b)[1];
    cam.ty = U.clamp((a ? a.y * S : WORLD_H) - VH * 0.55, 0, WORLD_H - VH);
  }
  function enter() { ensureLayout(); focusStage(); cam.y = cam.ty; Audio.setMode('pen'); UI.refreshTreeHUD(); UI.refreshCompostBar(); }
  function scroll(dy) { cam.ty = U.clamp(cam.ty + dy, 0, WORLD_H - VH); }

  function update(dt) {
    cam.y = U.lerp(cam.y, cam.ty, 1 - Math.pow(0.002, dt));
    climbAnim += dt;
    glow = Math.max(0, glow - dt * 1.4);
    stageFlash = Math.max(0, stageFlash - dt * 0.7);
    for (let i = motes.length - 1; i >= 0; i--) {
      const m = motes[i];
      m.life -= dt; if (m.life <= 0) { motes.splice(i, 1); continue; }
      m.y += m.vy * dt; m.x += Math.sin(m.life * 4 + m.y * 0.05) * 12 * dt; m.vy *= 1 - 0.3 * dt;
    }
  }

  function nodeAt(mx, my) {
    for (let i = 0; i < SKILLS.length; i++) {
      const a = anchorFor(SKILLS[i]);
      const sy = a.y - cam.y;
      if (Math.abs(mx - a.x) < 15 && Math.abs(my - (sy + 10)) < 15) return i;
    }
    return -1;
  }
  function click(x, y) {
    const i = nodeAt(x, y);
    if (i >= 0) { buy(SKILLS[i]); return; }
    // clicking the trunk climbs toward that point
    scroll((y - VH / 2) * 0.9);
  }
  function hover(x, y) {
    hoverNode = nodeAt(x, y);
    if (hoverNode < 0) return null;
    const sk = SKILLS[hoverNode], st = state(sk);
    const tail = st === 'owned' ? '<span class="good">Taken</span>'
      : st === 'ungrown' ? `<span class="warn">Grows at ${TREE_STAGES[sk.bough + 1].name}</span>`
      : st === 'locked' ? '<span class="warn">Take the one below first</span>'
      : `${sk.cost} acorn${sk.cost > 1 ? 's' : ''}${st === 'short' ? ' <span class="warn">(short)</span>' : ''}`;
    return `<b>${sk.name}</b><br>${sk.desc}<br>${tail}`;
  }

  function render(g) {
    const st = stageOf(G.tree.xp);
    // sky behind the canopy: cooler and deeper the higher you climb
    const high = 1 - cam.y / (WORLD_H - VH);
    const top = ['#8ec8e8', '#a8d8ee', '#c8e8f6'][0];
    for (let i = 0; i < 10; i++) {
      const f = i / 9;
      g.fillStyle = i === 0 ? '#6fb8dc' : `rgb(${Math.round(U.lerp(111, 210, f * 0.9 + high * 0.1))},${Math.round(U.lerp(184, 232, f))},${Math.round(U.lerp(220, 246, f))})`;
      g.fillRect(0, Math.round((VH * i) / 10), VW, Math.ceil(VH / 10) + 1);
    }
    // sun shafts through the leaves
    g.save(); g.globalAlpha = 0.05 + high * 0.05; g.fillStyle = PAL.cream;
    for (let i = 0; i < 5; i++) { g.save(); g.translate(80 + i * 130, -40); g.rotate(0.32); g.fillRect(0, 0, 26, VH * 1.7); g.restore(); }
    g.restore();
    // far canopy silhouettes for depth
    g.fillStyle = 'rgba(52,96,44,0.4)';
    for (let i = 0; i < 7; i++) {
      const cx = ((i * 173 + 40) % (VW + 120)) - 60;
      const cy = ((i * 311) % WORLD_H) - cam.y * 0.55;
      Art.ell(g, cx, cy, 60, 34);
    }

    // ground at the foot of the trunk
    const groundY = WORLD_H - 24 - cam.y;
    if (groundY < VH + 40) {
      g.fillStyle = PAL.grass2; g.fillRect(0, groundY, VW, VH - groundY + 40);
      g.fillStyle = PAL.grass1; for (let i = 0; i < 6; i++) Art.ell(g, i * 118 + 20, groundY + 8, 74, 14);
      g.fillStyle = PAL.soil1; Art.ell(g, VW / 2, groundY + 14, 130, 20);
      g.fillStyle = PAL.soil2; Art.ell(g, VW / 2, groundY + 12, 120, 16);
      g.fillStyle = PAL.grass0;
      for (let i = 0; i < 26; i++) { const gx = (i * 47) % VW; g.fillRect(gx, groundY - 3, 1, 4); g.fillRect(gx + 2, groundY - 4, 1, 5); }
      g.drawImage(Props.get('compost'), VW / 2 + 110, groundY - 20);
      g.drawImage(Props.get('crate'), VW / 2 - 150, groundY - 12);
      g.drawImage(Props.get('rock', 1), VW / 2 + 60, groundY - 6);
    }

    // the tree
    const visual = Props.buildTree(TW, TH, st, SEED);
    const c = visual.canvas;
    if (stageFlash > 0) { g.save(); g.globalAlpha = stageFlash * 0.5; g.filter = 'none'; }
    g.drawImage(c, OX, Math.round(-cam.y), TW * S, TH * S);
    if (stageFlash > 0) g.restore();

    // ghost branches toward boughs that have not grown yet
    const lay = ensureLayout();
    for (let b = 0; b < 3; b++) {
      if (boughOpen(b)) continue;
      const seats = lay.anchors.filter((a) => a.bough === b);
      g.save(); g.globalAlpha = 0.3; g.strokeStyle = PAL.cream; g.setLineDash([3, 5]); g.lineWidth = 1;
      g.beginPath();
      g.moveTo(VW / 2, (lay.baseY * S) - cam.y - 40);
      for (const a of seats) { g.moveTo(VW / 2, OX + 0 + (a.y * S) - cam.y); g.lineTo(OX + a.x * S, (a.y * S) - cam.y); }
      g.stroke(); g.setLineDash([]); g.restore();
    }

    // climbing wombat: rides the middle of the view up the trunk
    const wy = U.clamp(cam.y + VH * 0.6, 120, WORLD_H - 40);
    const trunkX = VW / 2 + Math.sin(wy * 0.01) * 6;
    Sprites.blitClimb(g, trunkX + 16, wy - cam.y, Math.floor(climbAnim * 4) % 4, G.wombats.length ? G.wombats[0].pal : 0, 2);

    // rising compost motes
    for (const m of motes) {
      g.globalAlpha = U.clamp(m.life, 0, 1) * 0.9;
      g.fillStyle = m.col;
      g.fillRect(Math.round(m.x), Math.round(m.y - cam.y), 2, 2);
    }
    g.globalAlpha = 1;

    // skill seats
    for (let i = 0; i < SKILLS.length; i++) drawNode(g, SKILLS[i], i);

    // edge hints that there is more tree above or below
    g.font = '7px "Press Start 2P", monospace'; g.textAlign = 'center';
    if (cam.ty > 4) { const p = Math.abs(Math.sin(G.time * 3)) * 2; g.fillStyle = PAL.cream; tri(g, VW - 22, 16 - p, 6, -1); }
    if (cam.ty < WORLD_H - VH - 4) { const p = Math.abs(Math.sin(G.time * 3)) * 2; g.fillStyle = PAL.cream; tri(g, VW - 22, VH - 16 + p, 6, 1); }

    FX.drawParticles(g, 0);
    FX.drawFloaters(g, false);
  }
  function tri(g, x, y, r, dir) {
    for (let i = 0; i < r; i++) g.fillRect(x - (r - i), y + dir * i, (r - i) * 2, 1);
  }

  function drawNode(g, sk, i) {
    const a = anchorFor(sk);
    const x = a.x, y = a.y - cam.y + 10;
    if (y < -40 || y > VH + 40) return;
    const st = state(sk);
    const hov = hoverNode === i;
    const pulse = 0.5 + 0.5 * Math.sin(G.time * 3 + i);

    if (st === 'ungrown') {
      g.globalAlpha = 0.42;
      Art.ell(g, x, y, 7, 8, PAL.stone0);
      g.globalAlpha = 1;
      Icons.blit(g, 'lock', x - 8, y - 8, 1);
      return;
    }
    // tether to the branch
    g.fillStyle = PAL.bark1; g.fillRect(x - 1, y - 16, 2, 8);
    // glow for an affordable skill
    if (st === 'ready') {
      const rad = 20 + pulse * 5;
      const grd = g.createRadialGradient(x, y, 2, x, y, rad);
      grd.addColorStop(0, `rgba(255,225,140,${0.4 + 0.2 * pulse})`); grd.addColorStop(1, 'rgba(255,225,140,0)');
      g.fillStyle = grd; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    // pod
    const bodyCol = st === 'owned' ? PAL.leaf2 : st === 'ready' ? PAL.gold : PAL.wood3;
    const capCol = st === 'owned' ? PAL.leaf0 : st === 'ready' ? PAL.goldD : PAL.bark1;
    Art.ell(g, x, y + 2, 9, 10, PAL.ink);
    Art.ell(g, x, y + 2, 8, 9, bodyCol);
    Art.ell(g, x - 2, y, 4, 4, U.shade(bodyCol, 0.3));
    Art.ell(g, x, y - 6, 9, 4.5, capCol);
    g.fillStyle = capCol; g.fillRect(x - 1, y - 12, 2, 4);
    if (st === 'owned') { Art.ell(g, x - 8, y - 4, 4, 2.5, PAL.leaf3); Art.ell(g, x + 8, y - 3, 4, 2.5, PAL.leaf3); }
    // skill glyph
    Icons.blit(g, sk.icon, x - 6, y - 4, 0.75);
    // cost pips for anything not yet taken
    if (st !== 'owned') {
      for (let k = 0; k < sk.cost; k++) {
        g.fillStyle = st === 'ready' ? PAL.goldL : PAL.wood4;
        g.fillRect(x - sk.cost * 2 + k * 4, y + 13, 3, 3);
        g.fillStyle = PAL.ink; g.fillRect(x - sk.cost * 2 + k * 4, y + 16, 3, 1);
      }
    }
    // name plate, only for the hovered or affordable seat
    if (hov || st === 'ready') {
      g.font = '7px "Press Start 2P", monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
      const label = sk.name;
      const tw = g.measureText(label).width;
      const py = y + 24, side = x > VW / 2 ? -1 : 1;
      const px = U.clamp(x, tw / 2 + 12, VW - tw / 2 - 12);
      g.fillStyle = PAL.ink; g.fillRect(px - tw / 2 - 6, py - 7, tw + 12, 14);
      g.fillStyle = hov ? PAL.wood3 : PAL.wood2; g.fillRect(px - tw / 2 - 5, py - 6, tw + 10, 12);
      g.fillStyle = PAL.cream; g.fillText(label, px, py);
    }
  }

  return { init(g) { G = g; syncStage(); }, enter, syncStage, update, render, click, hover, scroll, compost, buy, info, acorns, state, boughOpen, focusStage,
    get camY() { return cam.y; } };
})();
