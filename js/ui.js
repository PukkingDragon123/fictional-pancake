// ---- DOM UI: HUD, hotbars, shop, skill tree, modals -----------------------
const UI = (() => {
  let G = null;
  const $ = (id) => document.getElementById(id);
  let shopTab = 'food';

  function toast(msg, kind = '') {
    const t = document.createElement('div'); t.className = 'toast ' + kind; t.innerHTML = msg;
    $('toasts').appendChild(t); setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity 0.4s'; }, 2600); setTimeout(() => t.remove(), 3100);
  }
  function swatch(def, cls = 'cube-swatch') { return `<span class="${cls}" style="background:${def.color}"></span>`; }
  function cubeIcon(def) { const cls = def.key === 'slab' ? 'wide' : def.key === 'tiny' ? 'small' : def.key === 'big' ? 'large' : ''; return `<span class="cube-ico ${cls}" style="background:${def.color}"></span>`; }

  // ---- HUD -----------------------------------------------------------------
  function refreshHUD() {
    $('hud-money').textContent = U.money(G.money);
    $('hud-cubes').textContent = Tower.totalCubes();
    $('hud-sp').textContent = G.sp;
    $('hud-record').textContent = G.record;
    const inc = Tower.active && Tower.R.incomeRate ? `+${U.money(Tower.R.incomeRate)}/s` : '';
    $('hud-income').textContent = inc;
    const avail = SKILLS.some((s) => !G.skills[s.key] && canBuySkill(s));
    $('sp-badge').hidden = !avail; $('sp-badge').textContent = G.sp;
  }
  function refreshHotbar() {
    const bar = $('food-hotbar'); bar.innerHTML = '';
    for (const f of FOODS) {
      if (!G.unlockedFoods[f.key]) continue;
      const n = G.food[f.key] || 0;
      const el = document.createElement('div');
      el.className = 'slot' + (G.selectedFood === f.key ? ' active' : '') + (n === 0 ? ' empty' : '');
      el.innerHTML = `<span>${f.icon}</span><span class="count">${n}</span>`;
      el.title = f.name;
      el.onclick = () => { if (n === 0) { toast(`No ${f.name}. Buy more in the shop ($${f.cost} each).`, 'bad'); Audio.play('error'); openShop('food'); return; } G.selectedFood = G.selectedFood === f.key ? null : f.key; Audio.play('click'); refreshHotbar(); };
      el.onmouseenter = (e) => showTip(e, `<b>${f.icon} ${f.name}</b><br>${f.desc}<br><span style="color:#b9a9c9">Digest ${f.digest}s • +${f.hap} happy • makes ${CUBES[f.cube].name}${f.count ? ' x' + f.count : ''}</span>`);
      el.onmouseleave = hideTip;
      bar.appendChild(el);
    }
    const hand = document.createElement('div'); hand.className = 'slot' + (!G.selectedFood ? ' active' : ''); hand.innerHTML = '<span>🤚</span>'; hand.title = 'Pet mode'; hand.onclick = () => { G.selectedFood = null; Audio.play('click'); refreshHotbar(); };
    hand.onmouseenter = (e) => showTip(e, '<b>🤚 Pet mode</b><br>Click a wombat to pet it. +happiness, faster digestion.<br><span style="color:#ff6b6b">Don\'t overdo it.</span>'); hand.onmouseleave = hideTip;
    bar.prepend(hand);
    // trough
    const tc = $('trough-ctl'); tc.hidden = !(G.fac.trough > 0);
    if (!tc.hidden) {
      const sel = $('trough-food'); const cur = sel.value;
      sel.innerHTML = '<option value="">(off)</option>' + FOODS.filter((f) => G.unlockedFoods[f.key]).map((f) => `<option value="${f.key}" ${G.troughFood === f.key ? 'selected' : ''}>${f.icon} ${f.name} (${G.food[f.key] || 0})</option>`).join('');
      sel.onchange = () => { G.troughFood = sel.value || null; Audio.play('click'); };
    }
  }
  function refreshCubeBar() {
    const bar = $('cube-hotbar'); bar.innerHTML = '';
    let idx = 0;
    for (const k of CUBE_ORDER) {
      const def = CUBES[k]; const n = G.cubes[k] || 0, p = G.premium[k] || 0;
      if (n + p === 0) continue;
      idx++;
      const el = document.createElement('div');
      el.className = 'slot' + (G.selectedCube === k ? ' active' : '');
      el.innerHTML = `${cubeIcon(def)}<span class="key">${idx <= 9 ? idx : ''}</span><span class="count">${n + p}${p ? ' <span style="color:#ffd23f">★' + p + '</span>' : ''}</span>`;
      el.onclick = () => { G.selectedCube = k; Audio.play('click'); refreshCubeBar(); };
      el.onmouseenter = (e) => showTip(e, `<b>${swatch(def)} ${def.name}</b><br>${def.desc}<br><span style="color:#b9a9c9">Size ${def.w}x${def.h} • Density ${def.density} • Friction ${def.friction}${def.adhesion ? ' • Sticky' : ''}${def.restitution > 0.3 ? ' • Bouncy' : ''}<br>Base value $${def.value}${p ? ' • ★ premium x2' : ''}</span>`);
      el.onmouseleave = hideTip;
      bar.appendChild(el);
    }
    if (idx === 0) bar.innerHTML = '<span class="hint">No cubes. Feed your wombats!</span>';
  }
  function refreshRunHUD() {
    const R = Tower.R; if (!R.active) return;
    $('run-height').textContent = R.height.toFixed(1) + ' / ' + Math.floor(R.peak);
    $('run-crowd').textContent = Tower.crowdSize + ' 👥';
    $('run-power').textContent = 'x' + R.power.toFixed(2);
    $('run-earned').textContent = U.money(R.earned);
    $('run-lives').textContent = '❤'.repeat(Math.max(0, R.lives)) + '♡'.repeat(Math.max(0, R.maxLives - R.lives));
    $('run-perks').innerHTML = R.perks.map((k) => { const p = PERKS.find((q) => q.key === k); return `<span title="${p.name}: ${p.desc}">${p.icon}</span>`; }).join('');
  }
  function onRunStart() { $('run-start').hidden = true; $('run-hud').hidden = true; refreshRunHUD(); }
  function onRunPlay() { $('run-hud').hidden = false; refreshRunHUD(); }
  function hideRunHUD() { $('run-hud').hidden = true; }
  function onRunEnd() { refreshStartCard(); refreshHUD(); refreshCubeBar(); }
  function refreshStartCard() {
    const n = Tower.totalCubes();
    $('run-start').hidden = Tower.active || G.mode !== 'tower';
    $('btn-start-run').disabled = n === 0;
    $('run-start-info').innerHTML = n === 0 ? 'You have <b style="color:#ff4b4b">no cubes</b>. Go feed some wombats first.' : `You have <b style="color:#ffd23f">${n}</b> cubes ready. Best tower: <b>${G.record}</b>. Runs: ${G.runs || 0}.`;
  }

  // ---- tooltip -------------------------------------------------------------
  function showTip(e, html) { const t = $('tooltip'); t.innerHTML = html; t.hidden = false; positionTip(e.clientX, e.clientY); }
  function positionTip(cx, cy) { const t = $('tooltip'); const st = $('stage').getBoundingClientRect(); let x = cx - st.left + 14, y = cy - st.top - t.offsetHeight - 10; if (x + t.offsetWidth > st.width) x = st.width - t.offsetWidth - 6; if (y < 0) y = cy - st.top + 18; t.style.left = x + 'px'; t.style.top = y + 'px'; }
  function hideTip() { $('tooltip').hidden = true; }

  // ---- panels --------------------------------------------------------------
  function openPanel(id) { closePanels(); $(id).hidden = false; G.paused = true; Audio.play('click'); }
  function closePanels() { for (const id of ['panel-shop', 'panel-skills', 'panel-help']) $(id).hidden = true; if (!$('modal').hidden) return; G.paused = false; }
  function openShop(tab) { if (tab) shopTab = tab; openPanel('panel-shop'); renderShop(); }
  function openSkills() { openPanel('panel-skills'); renderSkills(); }

  function buy(cost) { if (G.money < cost) { toast('Not enough money!', 'bad'); Audio.play('error'); return false; } G.money -= cost; Audio.play('buy'); refreshHUD(); return true; }
  function renderShop() {
    for (const b of $('shop-tabs').children) b.classList.toggle('active', b.dataset.tab === shopTab);
    const body = $('shop-body'); let html = '<div class="shop-grid">';
    if (shopTab === 'food') {
      for (const f of FOODS) {
        const un = G.unlockedFoods[f.key]; const def = CUBES[f.cube];
        html += `<div class="card ${un ? 'owned' : 'locked'}"><h3><span class="ico">${f.icon}</span>${f.name}</h3><p>${f.desc}</p><p>${swatch(def)} ${def.name}${f.count ? ' x' + f.count : ''} • digest ${f.digest}s • +${f.hap} happy</p>
          <div class="row">${un ? `<span class="have">Have: ${G.food[f.key] || 0}</span><span><button class="buy" data-act="food" data-key="${f.key}" data-n="1">+1 $${f.cost}</button> <button class="buy" data-act="food" data-key="${f.key}" data-n="10">+10 $${f.cost * 10}</button></span>` : `<button class="buy alt" data-act="unlock" data-key="${f.key}">🔓 Research $${f.unlock}</button>`}</div></div>`;
      }
    } else if (shopTab === 'wombats') {
      const n = G.wombats.length, cap = Pen.wombatCap(), cost = WOMBAT_COST(n);
      html += `<div class="card"><h3><span class="ico">🐾</span>Adopt a Wombat</h3><p>Another poop machine. Each wombat digests independently. Pen capacity: ${n}/${cap}.</p><div class="row"><span class="have">${n >= cap ? 'Pen full - expand in Facilities' : ''}</span><button class="buy" data-act="wombat" ${n >= cap ? 'disabled' : ''}>Adopt $${U.fmt(cost)}</button></div></div>`;
      for (const w of G.wombats) html += `<div class="card owned"><h3><span class="ico">🐾</span>${w.name}</h3><p>Happiness ${Math.round(w.hap)}/${Pen.hapCap()} • ${w.stomach === 'empty' ? 'hungry' : w.stomach}</p></div>`;
    } else if (shopTab === 'facilities') {
      for (const f of FACILITIES) {
        const l = G.fac[f.key] || 0, cost = Math.round(f.base * Math.pow(f.mult, l)), maxed = l >= f.max;
        html += `<div class="card ${l > 0 ? 'owned' : ''}"><h3><span class="ico">${f.icon}</span>${f.name} <span class="lvl">Lv ${l}/${f.max}</span></h3><p>${f.desc(l)}</p><div class="row"><span></span><button class="buy" data-act="fac" data-key="${f.key}" ${maxed ? 'disabled' : ''}>${maxed ? 'MAXED' : (l === 0 ? 'Build' : 'Upgrade') + ' $' + U.fmt(cost)}</button></div></div>`;
      }
    } else if (shopTab === 'toys') {
      for (const t of TOYS) { const own = G.toys[t.key]; html += `<div class="card ${own ? 'owned' : ''}"><h3><span class="ico">${t.icon}</span>${t.name}</h3><p>${t.desc}</p><div class="row"><span></span><button class="buy" data-act="toy" data-key="${t.key}" ${own ? 'disabled' : ''}>${own ? 'OWNED' : 'Buy $' + U.fmt(t.cost)}</button></div></div>`; }
    } else if (shopTab === 'decor') {
      for (const d of DECOS) { const own = G.decos[d.key]; html += `<div class="card ${own ? 'owned' : ''}"><h3><span class="ico">${d.icon}</span>${d.name}</h3><p>${d.desc}</p><div class="row"><span></span><button class="buy" data-act="deco" data-key="${d.key}" ${own ? 'disabled' : ''}>${own ? 'OWNED' : 'Buy $' + U.fmt(d.cost)}</button></div></div>`; }
      html += `<div class="card"><h3><span class="ico">📊</span>Pen Stats</h3><p>Max happiness: ${Pen.hapCap()}<br>Crowd appeal: x${Pen.appeal().toFixed(1)}</p></div>`;
    }
    body.innerHTML = html + '</div>';
    body.querySelectorAll('button.buy').forEach((b) => b.onclick = () => shopAction(b.dataset));
  }
  function shopAction(d) {
    switch (d.act) {
      case 'food': { const f = FOOD_BY_KEY[d.key], n = +d.n; if (buy(f.cost * n)) { G.food[f.key] = (G.food[f.key] || 0) + n; } break; }
      case 'unlock': { const f = FOOD_BY_KEY[d.key]; if (buy(f.unlock)) { G.unlockedFoods[f.key] = true; G.food[f.key] = (G.food[f.key] || 0) + 3; toast(`${f.icon} ${f.name} researched! 3 free samples added.`, 'good'); } break; }
      case 'wombat': { const n = G.wombats.length; if (n >= Pen.wombatCap()) return; if (buy(WOMBAT_COST(n))) { const w = Pen.addWombat(); toast(`🐾 ${w.name} joins the pen!`, 'good'); FX.confettiBurst(320, 150, 30); } break; }
      case 'fac': { const f = FACILITIES.find((x) => x.key === d.key); const l = G.fac[f.key] || 0; if (l >= f.max) return; if (buy(Math.round(f.base * Math.pow(f.mult, l)))) { G.fac[f.key] = l + 1; toast(`${f.icon} ${f.name} → Lv ${l + 1}`, 'good'); if (f.key === 'trough' && !G.troughFood) G.troughFood = 'grass'; } break; }
      case 'toy': { const t = TOYS.find((x) => x.key === d.key); if (G.toys[t.key]) return; if (buy(t.cost)) { G.toys[t.key] = true; toast(`${t.icon} ${t.name} placed in the pen!`, 'good'); } break; }
      case 'deco': { const x = DECOS.find((y) => y.key === d.key); if (G.decos[x.key]) return; if (buy(x.cost)) { G.decos[x.key] = true; toast(`${x.icon} ${x.name} installed!`, 'good'); } break; }
    }
    renderShop(); refreshHotbar(); refreshHUD(); Main.save();
  }

  function canBuySkill(s) {
    if (G.skills[s.key]) return false;
    if (G.sp < s.cost) return false;
    if (s.tier > 1) { const prev = SKILLS.find((q) => q.branch === s.branch && q.tier === s.tier - 1); if (!G.skills[prev.key]) return false; }
    return true;
  }
  function renderSkills() {
    $('skills-sp').textContent = G.sp + ' SP';
    let html = '';
    for (const br of ['husbandry', 'engineering', 'showbiz']) {
      html += `<div class="branch ${br}"><h3>${BRANCH_NAMES[br]}</h3>`;
      const nodes = SKILLS.filter((s) => s.branch === br).sort((a, b) => a.tier - b.tier);
      nodes.forEach((s, i) => {
        const owned = !!G.skills[s.key]; const prevOwned = i === 0 || G.skills[nodes[i - 1].key];
        const cls = owned ? 'owned' : (prevOwned ? (G.sp >= s.cost ? 'avail' : '') : 'locked');
        if (i > 0) html += `<div class="link ${owned || prevOwned ? 'on' : ''}"></div>`;
        html += `<div class="node ${cls}" data-key="${s.key}"><span class="ico">${s.icon}</span><div><div class="nm">${s.name}</div><div class="ds">${s.desc}</div></div><span class="cost">${owned ? '✓' : s.cost + ' SP'}</span></div>`;
      });
      html += '</div>';
    }
    $('skills-body').innerHTML = html;
    $('skills-body').querySelectorAll('.node').forEach((n) => n.onclick = () => {
      const s = SKILLS.find((q) => q.key === n.dataset.key);
      if (G.skills[s.key]) return;
      if (!canBuySkill(s)) { Audio.play('error'); toast(G.sp < s.cost ? 'Not enough skill points. Stack taller towers!' : 'Unlock the previous skill first.', 'bad'); return; }
      G.sp -= s.cost; G.skills[s.key] = true; Audio.play('levelup'); toast(`${s.icon} ${s.name} learned!`, 'good'); FX.confettiBurst(320, 120, 30);
      renderSkills(); refreshHUD(); Main.save();
    });
  }

  // ---- modals --------------------------------------------------------------
  function showPerks(picks, onPick) {
    const m = $('modal'), c = $('modal-card');
    c.innerHTML = `<h2>✨ CHOOSE A PERK</h2><p>${Tower.R.settled} cubes settled. The tower grows stronger.</p><div class="perks">${picks.map((p, i) => `<div class="perk ${p.rarity === 2 ? 'rare' : ''}" data-i="${i}"><span class="ico">${p.icon}</span><span class="nm">${p.name}</span><span class="ds">${p.desc}</span></div>`).join('')}</div>`;
    m.hidden = false;
    c.querySelectorAll('.perk').forEach((el) => el.onclick = () => { m.hidden = true; Audio.play('buy'); onPick(picks[+el.dataset.i]); });
  }
  function showSummary(s) {
    const m = $('modal'), c = $('modal-card');
    const perks = s.perks.map((k) => PERKS.find((p) => p.key === k).icon).join(' ') || '—';
    c.innerHTML = `<h2 style="color:${s.cashed ? '#7dff3f' : '#ff4b4b'}">${s.cashed ? '💵 CASHED OUT' : '💥 TOWER COLLAPSED'}</h2>
      <p>${s.cashed ? 'A clean exit. The crowd goes home happy.' : 'Gravity: 1. You: 0. The crowd still had fun.'}</p>
      <div class="summary">
        <span class="k">Peak height</span><span class="v">${s.peak.toFixed(1)} cubes</span>
        <span class="k">Cubes settled / used</span><span class="v">${s.settled} / ${s.cubesUsed}</span>
        <span class="k">Cubes lost</span><span class="v">${s.lost}</span>
        <span class="k">Peak crowd</span><span class="v">${s.crowd}</span>
        <span class="k">Perks</span><span class="v">${perks}</span>
        <span class="k">Cash-out bonus</span><span class="v good">${s.cashed ? '+' + U.money(s.bonus) : '—'}</span>
        <span class="k">Total earned</span><span class="v good">+${U.money(s.earned)}</span>
        <span class="k">Skill points</span><span class="v blue">+${s.sp} ⭐</span>
      </div>
      <button class="big" id="btn-summary-ok">CONTINUE</button>`;
    m.hidden = false; G.paused = true;
    $('btn-summary-ok').onclick = () => { m.hidden = true; G.paused = false; Audio.play('click'); refreshStartCard(); refreshHUD(); };
  }

  function init(g) {
    G = g;
    document.querySelectorAll('.tab').forEach((b) => b.onclick = () => Main.setMode(b.dataset.mode));
    $('btn-shop').onclick = () => openShop();
    $('btn-skills').onclick = () => openSkills();
    $('btn-help').onclick = () => openPanel('panel-help');
    $('btn-mute').onclick = () => { const m = Audio.toggleMute(); $('btn-mute').textContent = m ? '🔇' : '🔊'; G.muted = m; Main.save(); };
    $('btn-music').onclick = () => { const on = Audio.toggleMusic(); $('btn-music').textContent = on ? '🎵 Music: ON' : '🎵 Music: OFF'; G.musicOff = !on; Main.save(); };
    $('btn-reset').onclick = () => { if (confirm('Reset ALL progress? This cannot be undone.')) Main.reset(); };
    document.querySelectorAll('.close').forEach((b) => b.onclick = () => { closePanels(); Audio.play('click'); });
    for (const b of $('shop-tabs').children) b.onclick = () => { shopTab = b.dataset.tab; Audio.play('click'); renderShop(); };
    $('btn-start-run').onclick = () => { if (Tower.totalCubes() === 0) return; Tower.newRun(); };
    $('btn-cashout').onclick = () => Tower.cashOut();
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closePanels(); } });
    $('btn-mute').textContent = G.muted ? '🔇' : '🔊';
    $('btn-music').textContent = G.musicOff ? '🎵 Music: OFF' : '🎵 Music: ON';
  }
  function setMode(mode) {
    document.querySelectorAll('.tab').forEach((b) => b.classList.toggle('active', b.dataset.mode === mode));
    $('pen-bar').hidden = mode !== 'pen'; $('tower-bar').hidden = mode !== 'tower';
    $('tower-overlay').hidden = mode !== 'tower';
    refreshStartCard(); refreshCubeBar(); refreshHotbar();
  }
  function anyPanelOpen() { return !$('panel-shop').hidden || !$('panel-skills').hidden || !$('panel-help').hidden || !$('modal').hidden; }

  return { init, toast, refreshHUD, refreshHotbar, refreshCubeBar, refreshRunHUD, refreshStartCard, onRunStart, onRunPlay, onRunEnd, hideRunHUD, showPerks, showSummary, showTip, hideTip, positionTip, setMode, openShop, openSkills, closePanels, anyPanelOpen, canBuySkill };
})();
