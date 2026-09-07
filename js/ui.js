// ---- Interface: ribbon, trays, shop, readouts, modals --------------------
const UI = (() => {
  let G = null;
  const $ = (id) => document.getElementById(id);
  let shopTab = 'feed';

  function toast(msg, kind = '') {
    const t = document.createElement('div');
    t.className = 'toast ' + kind; t.innerHTML = msg;
    $('toasts').appendChild(t);
    setTimeout(() => { t.style.transition = 'opacity 0.4s'; t.style.opacity = '0'; }, 2600);
    setTimeout(() => t.remove(), 3100);
  }
  function hearts(n, max) {
    let h = '';
    for (let i = 0; i < max; i++) h += `<img src="${Icons.url('heart')}" alt="" style="width:13px;height:13px;image-rendering:pixelated;vertical-align:-2px;opacity:${i < n ? 1 : 0.28}">`;
    return h;
  }

  // ---- ribbon -------------------------------------------------------------
  function refreshHUD() {
    $('hud-money').textContent = U.fmt(G.money);
    $('hud-cubes').textContent = Tower.total();
    $('hud-acorns').textContent = Tree.acorns();
    $('hud-best').textContent = G.record;
    $('hud-inc').textContent = Tower.active && Tower.R.incomeRate ? '+' + U.fmt(Tower.R.incomeRate) + '/s' : '';
    const spendable = SKILLS.some((s) => Tree.state(s) === 'ready');
    const pip = $('pip-tree');
    pip.hidden = !spendable;
    pip.textContent = Tree.acorns();
  }

  function refreshFeedBar() {
    const box = $('slots-feed');
    box.innerHTML = '';
    const hand = document.createElement('div');
    hand.className = 'slot' + (!G.selFood ? ' active' : '');
    hand.innerHTML = Icons.img('paw');
    hand.onclick = () => { G.selFood = null; Audio.play('click'); refreshFeedBar(); };
    hand.onmouseenter = (e) => showTip(e, '<b>Pet</b><br>Click a wombat to pet it. Faster digestion, more happiness.<br>Do not overdo it.');
    hand.onmouseleave = hideTip;
    box.appendChild(hand);
    let i = 0;
    for (const f of FOODS) {
      if (!G.unlocked[f.key]) continue;
      i++;
      const n = G.food[f.key] || 0;
      const el = document.createElement('div');
      el.className = 'slot' + (G.selFood === f.key ? ' active' : '') + (n === 0 ? ' out' : '');
      el.innerHTML = `${Icons.img(f.icon)}<span class="k">${i}</span><span class="n">${n}</span>`;
      el.onclick = () => {
        if (n === 0) { toast('No ' + f.name + ' left.', 'bad'); Audio.play('error'); openShop('feed'); return; }
        G.selFood = G.selFood === f.key ? null : f.key; Audio.play('click'); refreshFeedBar();
      };
      el.onmouseenter = (e) => showTip(e, `<b>${f.name}</b><br>${f.desc}<br>Makes a <b>${CUBES[f.cube].name}</b> in ${f.digest}s &middot; +${f.hap} happy`);
      el.onmouseleave = hideTip;
      box.appendChild(el);
    }
    const on = (G.fac.trough || 0) > 0;
    $('lbl-trough').hidden = !on; $('sel-trough').hidden = !on;
    if (on) {
      const sel = $('sel-trough');
      sel.innerHTML = '<option value="">off</option>' + FOODS.filter((f) => G.unlocked[f.key])
        .map((f) => `<option value="${f.key}"${G.troughFood === f.key ? ' selected' : ''}>${f.name} (${G.food[f.key] || 0})</option>`).join('');
      sel.onchange = () => { G.troughFood = sel.value || null; Audio.play('click'); Main.save(); };
    }
  }

  function refreshCubeBar() {
    const box = $('slots-cube');
    box.innerHTML = '';
    let i = 0;
    for (const k of CUBE_ORDER) {
      const def = CUBES[k], n = G.cubes[k] || 0, p = G.premium[k] || 0;
      if (n + p === 0) continue;
      i++;
      const el = document.createElement('div');
      el.className = 'slot' + (G.selCube === k ? ' active' : '');
      el.innerHTML = `${Icons.img(def.icon)}<span class="k">${i}</span><span class="n">${n + p}${p ? `<em>+${p}</em>` : ''}</span>`;
      el.onclick = () => { G.selCube = k; Audio.play('click'); refreshCubeBar(); };
      el.onmouseenter = (e) => showTip(e, cubeTip(def, p));
      el.onmouseleave = hideTip;
      box.appendChild(el);
    }
    if (!i) box.innerHTML = '<span class="label">barn empty &mdash; go and feed someone</span>';
  }
  function cubeTip(def, prem) {
    const traits = [];
    if (def.density >= 1.8) traits.push('heavy');
    if (def.density <= 0.5) traits.push('very light');
    if (def.adhesion) traits.push('sticky');
    if (def.friction >= 0.85) traits.push('grippy');
    if (def.friction <= 0.6) traits.push('slippery');
    if (def.w > 1.2) traits.push('wide');
    return `<b>${def.name}</b><br>${def.desc}<br>Pays ${U.money(def.value)} &middot; compost +${def.compost}${traits.length ? '<br><span class="dim" style="color:#6a4a30">' + traits.join(', ') + '</span>' : ''}${prem ? '<br><b>' + prem + ' premium</b> (double pay)' : ''}`;
  }

  function refreshCompostBar() {
    const box = $('slots-compost');
    box.innerHTML = '';
    let any = 0;
    for (const k of CUBE_ORDER) {
      const def = CUBES[k], n = G.cubes[k] || 0, p = G.premium[k] || 0;
      if (n + p === 0) continue;
      any++;
      const el = document.createElement('div');
      el.className = 'slot';
      el.innerHTML = `${Icons.img(def.icon)}<span class="n">${n + p}${p ? `<em>+${p}</em>` : ''}</span>`;
      el.onclick = (e) => {
        const many = e.shiftKey ? 10 : 1;
        let done = 0;
        for (let c = 0; c < many; c++) {
          if ((G.cubes[k] || 0) > 0) { if (Tree.compost(k, false)) done++; }
          else if ((G.premium[k] || 0) > 0) { if (Tree.compost(k, true)) done++; }
          else break;
        }
        if (!done) Audio.play('error');
      };
      el.onmouseenter = (e) => showTip(e, `<b>${def.name}</b><br>Compost for <b>+${def.compost}</b> growth${p ? ' (premium: +' + def.compost * 2 + ')' : ''}<br>Click one &middot; Shift-click ten`);
      el.onmouseleave = hideTip;
      box.appendChild(el);
    }
    if (!any) box.innerHTML = '<span class="label">no cubes to compost</span>';
    const inf = Tree.info();
    $('lbl-compost').textContent = inf.next ? `${TREE_STAGES[inf.stage + 1].name.toUpperCase()} AT ${inf.next}` : 'FULLY GROWN';
  }

  function refreshTreeHUD() {
    const inf = Tree.info();
    $('t-stage').textContent = inf.name;
    $('t-meter').style.width = Math.round(inf.frac * 100) + '%';
    $('t-acorns').textContent = inf.acorns;
    const ready = SKILLS.filter((s) => Tree.state(s) === 'ready').length;
    $('t-note').textContent = ready ? `${ready} skill${ready > 1 ? 's' : ''} within reach` : inf.next ? 'Compost cubes to grow it' : 'Every bough has grown';
    refreshCompostBar();
  }

  function refreshRunHUD() {
    const R = Tower.R;
    if (!R.active) return;
    $('r-height').textContent = R.height.toFixed(1);
    $('r-crowd').textContent = Tower.crowdSize;
    $('r-power').textContent = 'x' + R.power.toFixed(2);
    $('r-earned').textContent = U.fmt(R.earned);
    $('r-lives').innerHTML = hearts(R.lives, R.maxLives);
    $('r-perks').innerHTML = R.perks.map((k) => {
      const p = PERKS.find((q) => q.key === k);
      return `<img src="${Icons.url(p.icon)}" alt="" title="${p.name}: ${p.desc}">`;
    }).join('');
  }
  function onRunStart() { $('run-card').hidden = true; $('run-read').hidden = true; refreshRunHUD(); }
  function onRunPlay() { $('run-read').hidden = false; refreshRunHUD(); }
  function hideRunHUD() { $('run-read').hidden = true; }
  function onRunEnd() { refreshRunCard(); refreshHUD(); refreshCubeBar(); }
  function refreshRunCard() {
    const n = Tower.total();
    $('run-card').hidden = Tower.active || G.mode !== 'tower';
    $('btn-start').disabled = n === 0;
    $('run-note').innerHTML = n === 0
      ? 'The barn is empty. Feed a wombat first.'
      : `${n} cube${n > 1 ? 's' : ''} ready. Best tower so far: ${G.record}.`;
  }

  // ---- tooltip ------------------------------------------------------------
  function showTip(e, html) { const t = $('tooltip'); t.innerHTML = html; t.hidden = false; positionTip(e.clientX, e.clientY); }
  function positionTip(cx, cy) {
    const t = $('tooltip'), st = $('frame').getBoundingClientRect();
    let x = cx - st.left + 14, y = cy - st.top - t.offsetHeight - 12;
    if (x + t.offsetWidth > st.width) x = st.width - t.offsetWidth - 6;
    if (x < 4) x = 4;
    if (y < 4) y = cy - st.top + 20;
    t.style.left = x + 'px'; t.style.top = y + 'px';
  }
  function hideTip() { $('tooltip').hidden = true; }

  // ---- panels -------------------------------------------------------------
  function openPanel(id) { closePanels(); $(id).hidden = false; G.paused = true; Audio.play('click'); }
  function closePanels() {
    for (const id of ['panel-shop', 'panel-help']) $(id).hidden = true;
    if ($('modal').hidden) G.paused = false;
  }
  function openShop(tab) { if (tab) shopTab = tab; openPanel('panel-shop'); renderShop(); }
  function spend(cost) {
    if (G.money < cost) { toast('Not enough coins.', 'bad'); Audio.play('error'); return false; }
    G.money -= cost; Audio.play('buy'); refreshHUD(); return true;
  }
  function priceBtn(label, cost, attrs) { return `<button class="buy" ${attrs}>${Icons.img('coin', 'sm')}${label ? label + ' ' : ''}${U.fmt(cost)}</button>`; }

  function renderShop() {
    for (const b of $('shop-tabs').children) b.classList.toggle('active', b.dataset.tab === shopTab);
    const body = $('shop-body');
    let h = '<div class="grid">';
    if (shopTab === 'feed') {
      for (const f of FOODS) {
        const open = G.unlocked[f.key];
        h += `<div class="item ${open ? '' : 'shut'}">
          <div class="pic">${Icons.img(f.icon, 'xl')}</div>
          <h3>${f.name}</h3>
          <p>${f.desc} Makes a ${CUBES[f.cube].name}.</p>
          <div class="act">${open
            ? `<span class="own">have ${G.food[f.key] || 0}</span>${priceBtn('', f.cost, `data-act="food" data-key="${f.key}" data-n="1"`)}${priceBtn('10x', f.cost * 10, `data-act="food" data-key="${f.key}" data-n="10"`)}`
            : `<button class="buy alt" data-act="seed" data-key="${f.key}">${Icons.img('coin', 'sm')}Plant ${U.fmt(f.unlock)}</button>`}</div>
        </div>`;
      }
    } else if (shopTab === 'wombats') {
      const n = G.wombats.length, cap = Pen.wombatCap(), cost = WOMBAT_COST(n);
      h += `<div class="item">
        <div class="pic">${Icons.img('wombat', 'xl')}</div>
        <h3>Adopt a wombat <span class="lv">${n}/${cap}</span></h3>
        <p>${n >= cap ? 'The pen is full. Build more fence.' : 'Another one, digesting on its own schedule.'}</p>
        <div class="act">${priceBtn('', cost, `data-act="wombat" ${n >= cap ? 'disabled' : ''}`)}</div>
      </div>`;
      for (const w of G.wombats) {
        const st = w.stomach === 'empty' ? 'hungry' : w.stomach === 'digesting' ? 'digesting' : 'about to go';
        h += `<div class="item have">
          <div class="pic">${Icons.img('wombat', 'xl')}</div>
          <h3>${w.name}</h3>
          <p>${st} &middot; happy ${Math.round(w.hap)}/${Pen.hapCap()}</p>
        </div>`;
      }
    } else {
      for (const f of FACILITIES) {
        const l = G.fac[f.key] || 0, cost = Math.round(f.base * Math.pow(f.mult, l)), maxed = l >= f.max;
        h += `<div class="item ${l ? 'have' : ''}">
          <div class="pic">${Icons.img(f.icon, 'xl')}</div>
          <h3>${f.name} <span class="lv">${l}/${f.max}</span></h3>
          <p>${f.desc(l)}</p>
          <div class="act">${maxed ? '<button class="buy" disabled>done</button>' : priceBtn(l ? 'Upgrade' : 'Build', cost, `data-act="fac" data-key="${f.key}"`)}</div>
        </div>`;
      }
      for (const it of FARM_ITEMS) {
        const own = !!G.farm[it.key];
        h += `<div class="item ${own ? 'have' : ''}">
          <div class="pic">${Icons.img(it.icon, 'xl')}</div>
          <h3>${it.name}</h3>
          <p>${it.desc}</p>
          <div class="act">${own ? '<button class="buy" disabled>in the pen</button>' : priceBtn('', it.cost, `data-act="item" data-key="${it.key}"`)}</div>
        </div>`;
      }
    }
    body.innerHTML = h + '</div>';
    body.querySelectorAll('button.buy').forEach((b) => { if (!b.disabled) b.onclick = () => shopAction(b.dataset); });
  }
  function shopAction(d) {
    switch (d.act) {
      case 'food': { const f = FOOD_BY_KEY[d.key], n = +d.n; if (spend(f.cost * n)) G.food[f.key] = (G.food[f.key] || 0) + n; break; }
      case 'seed': { const f = FOOD_BY_KEY[d.key]; if (spend(f.unlock)) { G.unlocked[f.key] = true; G.food[f.key] = (G.food[f.key] || 0) + 3; toast(f.name + ' planted. Three in the barn.', 'good'); } break; }
      case 'wombat': {
        const n = G.wombats.length;
        if (n >= Pen.wombatCap()) return;
        if (spend(WOMBAT_COST(n))) { const w = Pen.addWombat(); toast(w.name + ' moves in.', 'good'); FX.confettiBurst(320, 150, 26); }
        break;
      }
      case 'fac': {
        const f = FACILITIES.find((x) => x.key === d.key), l = G.fac[f.key] || 0;
        if (l >= f.max) return;
        if (spend(Math.round(f.base * Math.pow(f.mult, l)))) {
          G.fac[f.key] = l + 1;
          toast(f.name + ' now level ' + (l + 1) + '.', 'good');
          if (f.key === 'trough' && !G.troughFood) G.troughFood = 'grass';
        }
        break;
      }
      case 'item': {
        const it = FARM_ITEMS.find((x) => x.key === d.key);
        if (G.farm[it.key]) return;
        if (spend(it.cost)) { G.farm[it.key] = true; toast(it.name + ' set up in the pen.', 'good'); }
        break;
      }
    }
    renderShop(); refreshFeedBar(); refreshHUD(); Main.save();
  }

  // ---- modals -------------------------------------------------------------
  function showPerks(picks, pick) {
    const m = $('modal'), c = $('modal-card');
    c.innerHTML = `<h2>Pick a perk</h2><p>${Tower.R.settled} cubes standing.</p>
      <div class="perks">${picks.map((p, i) => `<div class="perk ${p.rare ? 'rare' : ''}" data-i="${i}">
        <img src="${Icons.url(p.icon)}" alt=""><span class="nm">${p.name}</span><span class="ds">${p.desc}</span></div>`).join('')}</div>`;
    m.hidden = false;
    c.querySelectorAll('.perk').forEach((el) => el.onclick = () => { m.hidden = true; Audio.play('buy'); pick(picks[+el.dataset.i]); });
  }
  function showSummary(s) {
    const m = $('modal'), c = $('modal-card');
    const perks = s.perks.map((k) => `<img src="${Icons.url(PERKS.find((p) => p.key === k).icon)}" alt="" style="width:22px;height:22px;image-rendering:pixelated;vertical-align:middle">`).join(' ') || '&mdash;';
    c.innerHTML = `<h2 style="color:${s.cashed ? '#2f6b1f' : '#a12a1a'}">${s.cashed ? 'Cashed out' : 'It came down'}</h2>
      <p>${s.cashed ? 'A clean exit. The crowd goes home happy.' : 'The crowd loved it anyway.'}</p>
      <div class="sum">
        <span class="k">Tallest</span><span class="v">${s.peak.toFixed(1)}</span>
        <span class="k">Cubes standing / used</span><span class="v">${s.settled} / ${s.used}</span>
        <span class="k">Cubes lost</span><span class="v">${s.lost}</span>
        <span class="k">Crowd</span><span class="v">${s.crowd}</span>
        <span class="k">Perks</span><span class="v">${perks}</span>
        <span class="k">Cash-out bonus</span><span class="v g">${s.cashed ? '+' + U.money(s.bonus) : '&mdash;'}</span>
        <span class="k">Takings</span><span class="v g">+${U.money(s.earned)}</span>
      </div>
      <button class="big" id="btn-ok">Back to the farm</button>`;
    m.hidden = false; G.paused = true;
    $('btn-ok').onclick = () => { m.hidden = true; G.paused = false; Audio.play('click'); refreshRunCard(); refreshHUD(); Main.setMode('pen'); };
  }

  // ---- setup --------------------------------------------------------------
  function init(g) {
    G = g;
    document.querySelectorAll('img[data-ico]').forEach((el) => { el.src = Icons.url(el.dataset.ico); });
    document.querySelectorAll('.tab').forEach((b) => b.onclick = () => Main.setMode(b.dataset.mode));
    $('btn-shop').onclick = () => openShop();
    $('btn-help').onclick = () => openPanel('panel-help');
    $('btn-sound').onclick = () => {
      const muted = Audio.toggleMute();
      G.muted = muted;
      $('btn-sound').firstElementChild.src = Icons.url(muted ? 'mute' : 'sound');
      Main.save();
    };
    $('btn-music').onclick = () => { const on = Audio.toggleMusic(); G.musicOff = !on; $('btn-music').textContent = on ? 'Music: on' : 'Music: off'; Main.save(); };
    let armed = 0;
    $('btn-reset').onclick = () => {
      const b = $('btn-reset');
      if (Date.now() < armed) { Main.reset(); return; }
      armed = Date.now() + 4000;
      b.textContent = 'Click again to erase';
      Audio.play('alarm');
      setTimeout(() => { if (Date.now() >= armed) { b.textContent = 'Reset save'; armed = 0; } }, 4100);
    };
    document.querySelectorAll('[data-close]').forEach((b) => b.onclick = () => { closePanels(); Audio.play('click'); });
    for (const b of $('shop-tabs').children) b.onclick = () => { shopTab = b.dataset.tab; Audio.play('click'); renderShop(); };
    $('btn-start').onclick = () => { if (Tower.total()) Tower.newRun(); };
    $('btn-cash').onclick = () => Tower.cashOut();
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closePanels(); });
    $('btn-sound').firstElementChild.src = Icons.url(G.muted ? 'mute' : 'sound');
    $('btn-music').textContent = G.musicOff ? 'Music: off' : 'Music: on';
  }
  function setMode(mode) {
    document.querySelectorAll('.tab').forEach((b) => b.classList.toggle('active', b.dataset.mode === mode));
    $('tray-feed').hidden = mode !== 'pen';
    $('tray-compost').hidden = mode !== 'tree';
    $('tray-cube').hidden = mode !== 'tower';
    $('ov-tower').hidden = mode !== 'tower';
    $('ov-tree').hidden = mode !== 'tree';
    refreshRunCard(); refreshCubeBar(); refreshFeedBar();
    if (mode === 'tree') refreshTreeHUD();
  }
  function anyPanelOpen() { return !$('panel-shop').hidden || !$('panel-help').hidden || !$('modal').hidden; }

  return {
    init, toast, refreshHUD, refreshFeedBar, refreshCubeBar, refreshCompostBar, refreshTreeHUD,
    refreshRunHUD, refreshRunCard, onRunStart, onRunPlay, onRunEnd, hideRunHUD,
    showPerks, showSummary, showTip, hideTip, positionTip, setMode, openShop, closePanels, anyPanelOpen,
  };
})();
