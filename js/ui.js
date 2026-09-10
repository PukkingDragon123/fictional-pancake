// ---- Interface: icons and numbers, almost no words -----------------------
const UI = (() => {
  let G = null;
  const $ = (id) => document.getElementById(id);
  let shopTab = 'seeds';

  function toast(msg, kind = '') {
    const t = document.createElement('div');
    t.className = 'toast ' + kind; t.innerHTML = msg;
    $('toasts').appendChild(t);
    setTimeout(() => { t.style.transition = 'opacity .4s'; t.style.opacity = '0'; }, 2400);
    setTimeout(() => t.remove(), 2900);
  }
  const ic = (n, cls = '') => Icons.img(n, cls);

  // ---- ribbon -------------------------------------------------------------
  function refreshHUD() {
    $('s-wd').textContent = U.fmt(G.wd);
    $('s-off').textContent = OFFER_ORDER.reduce((s, k) => s + (G.offerings[k] || 0) + (G.blessed[k] || 0), 0);
    const f = World.fraction();
    $('s-forest').style.width = Math.round(f * 100) + '%';
    $('s-forestn').textContent = Math.round(f * 100) + '%';
    $('s-gods').textContent = Object.keys(G.summoned).length + '/' + GODS.length;
    $('pip-shrine').hidden = !Ritual.readyGod();
    $('pip-roots').hidden = Knowledge.ripeCount() === 0;
  }

  // ---- trays --------------------------------------------------------------
  function refreshTray() {
    const tools = $('slots-tools'), ctx = $('slots-ctx');
    tools.innerHTML = ''; ctx.innerHTML = '';
    const mode = G.mode;
    $('tray-tools').hidden = mode !== 'grove';
    if (mode === 'grove') {
      TOOLS.forEach((t, i) => {
        const locked = t.locked && !G.decor[t.locked];
        const el = document.createElement('div');
        el.className = 'slot' + (G.tool === t.key ? ' on' : '') + (locked ? ' locked' : '');
        el.innerHTML = `${ic(t.icon)}<span class="k">${i + 1}</span>`;
        el.onclick = () => {
          if (locked) { Audio.play('error'); toast('needs a nest', 'bad'); return; }
          G.tool = t.key; Grove.clearPair(); Audio.play('click'); refreshTray();
        };
        el.onmouseenter = (e) => showTip(e, `<b>${t.name}</b><br>${t.desc}`);
        el.onmouseleave = hideTip;
        tools.appendChild(el);
      });
      if (G.tool === 'seed') seedSlots(ctx);
      else if (G.tool === 'hand') foodSlots(ctx);
      else ctx.innerHTML = '<span class="empty">drag to paint</span>';
    } else if (mode === 'shrine') {
      offerSlots(ctx, (k, e) => Ritual.stage(k, e.shiftKey ? 5 : 1));
    } else if (mode === 'rite') {
      offerSlots(ctx, (k) => { G.selOffer = k; Audio.play('click'); refreshTray(); }, true);
    } else {
      ctx.innerHTML = '<span class="empty">click a fruit</span>';
    }
  }
  function seedSlots(box) {
    let any = 0;
    for (const c of CROPS) {
      if (c.god && !G.blessings[c.god] && !(G.seeds[c.key] > 0)) continue;
      const n = G.seeds[c.key] || 0;
      if (!n && !G.seen2) { /* still show so the player knows it exists */ }
      any++;
      const el = document.createElement('div');
      el.className = 'slot' + (G.selSeed === c.key ? ' on' : '') + (n === 0 ? ' out' : '');
      el.innerHTML = `${ic(c.icon)}<span class="n">${n}</span>`;
      el.onclick = () => {
        if (!n) { Audio.play('error'); openPanel('panel-shop'); shopTab = 'seeds'; renderShop(); return; }
        G.selSeed = c.key; Audio.play('click'); refreshTray();
      };
      el.onmouseenter = (e) => showTip(e, `<b>${c.name}</b><br>${ic(OFFERINGS[c.offering].icon, 'sm')} ${OFFERINGS[c.offering].name}<br>${c.grow}s`);
      el.onmouseleave = hideTip;
      box.appendChild(el);
    }
    if (!any) box.innerHTML = '<span class="empty">no seed</span>';
  }
  function foodSlots(box) {
    let any = 0;
    for (const c of CROPS) {
      const n = G.food[c.key] || 0;
      if (!n) continue;
      any++;
      const el = document.createElement('div');
      el.className = 'slot' + (G.selFood === c.key ? ' on' : '');
      el.innerHTML = `${ic(c.icon)}<span class="n">${n}</span>`;
      el.onclick = () => { G.selFood = G.selFood === c.key ? null : c.key; Audio.play('click'); refreshTray(); };
      el.onmouseenter = (e) => showTip(e, `<b>${c.name}</b><br>feed a wombat<br>+${c.hap}`);
      el.onmouseleave = hideTip;
      box.appendChild(el);
    }
    const paw = document.createElement('div');
    paw.className = 'slot' + (!G.selFood ? ' on' : '');
    paw.innerHTML = ic('t_hand');
    paw.onclick = () => { G.selFood = null; Audio.play('click'); refreshTray(); };
    paw.onmouseenter = (e) => showTip(e, '<b>Pet</b><br>hurries digestion');
    paw.onmouseleave = hideTip;
    box.prepend(paw);
    if (!any) box.appendChild(Object.assign(document.createElement('span'), { className: 'empty', textContent: 'harvest to feed' }));
  }
  function offerSlots(box, onClick, keys) {
    let i = 0;
    for (const k of OFFER_ORDER) {
      const plain = G.offerings[k] || 0, bl = G.blessed[k] || 0;
      if (plain + bl === 0) continue;
      i++;
      const def = OFFERINGS[k];
      const el = document.createElement('div');
      el.className = 'slot' + (keys && G.selOffer === k ? ' on' : '');
      el.innerHTML = `${ic(def.icon)}${keys ? `<span class="k">${i}</span>` : ''}<span class="n">${plain + bl}${bl ? `<em>+${bl}</em>` : ''}</span>`;
      el.onclick = (e) => onClick(k, e);
      el.onmouseenter = (e) => showTip(e, `<b>${def.name}</b><br>${def.value} at the rite${def.sell ? `<br>${def.sell} W$ pawned` : ''}${bl ? '<br><b>blessed</b> pays double' : ''}`);
      el.onmouseleave = hideTip;
      box.appendChild(el);
    }
    if (!i) box.innerHTML = '<span class="empty">no offerings</span>';
  }

  // ---- shrine overlay -----------------------------------------------------
  function refreshRitual() {
    const box = $('gods');
    box.innerHTML = '';
    const staged = Ritual.staged();
    for (const god of GODS) {
      const done = !!G.summoned[god.key];
      const need = Ritual.need(god);
      const ok = !done && Ritual.meets(god);
      const el = document.createElement('div');
      el.className = 'gcard' + (ok ? ' ready' : '') + (done ? ' done' : '');
      const rows = Object.keys(need).map((k) => {
        const have = staged[k] || 0;
        return `<span class="${have >= need[k] ? 'ok' : 'no'}">${ic(OFFERINGS[k].icon)}${have}/${need[k]}</span>`;
      }).join('');
      el.innerHTML = `${ic(god.glyph)}<div class="need">${done ? `<span class="ok">${ic(god.artIcon)}</span>` : rows}</div>`;
      el.onmouseenter = (e) => showTip(e, `<b>${god.name}</b><br><span class="dim">${god.title}</span><br>${god.blessing}${done ? '<br><span class="good">summoned</span>' : ''}`);
      el.onmouseleave = hideTip;
      el.onclick = () => { if (ok) Ritual.summon(); else Audio.play('error'); };
      box.appendChild(el);
    }
    $('b-summon').disabled = !Ritual.readyGod();
  }
  function refreshKnow() { refreshHUD(); }

  // ---- rite ---------------------------------------------------------------
  function refreshRunHUD() {
    const R = Tower.R;
    if (!R.active) return;
    $('r-h').textContent = R.height.toFixed(1);
    $('r-c').textContent = Tower.crowdSize;
    $('r-e').textContent = U.fmt(R.earned);
    let h = '';
    for (let i = 0; i < R.maxLives; i++) h += `<img src="${Icons.url('heart')}" alt="" style="opacity:${i < R.lives ? 1 : 0.25}">`;
    $('r-lives').innerHTML = h;
    $('r-goals').innerHTML = R.goals.map((gl) => `<div class="${gl.done ? 'done' : ''}">${gl.text} ${gl.done ? '' : `${gl.at}/${gl.need}`}</div>`).join('');
    $('r-boons').innerHTML = Object.keys(R.boons).map((k) => {
      const b = CUPID_BOONS.find((x) => x.key === k);
      return `<img src="${Icons.url(b.icon)}" alt="" title="${b.name}">`;
    }).join('');
  }
  function onRunStart() { $('rite-card').hidden = true; $('rite-read').hidden = true; refreshRunHUD(); }
  function onRunPlay() { $('rite-read').hidden = false; refreshRunHUD(); }
  function hideRunHUD() { $('rite-read').hidden = true; }
  function onRunEnd() { refreshRiteCard(); refreshHUD(); refreshTray(); }
  function refreshRiteCard() {
    const n = Tower.total();
    $('rite-card').hidden = Tower.active || G.mode !== 'rite';
    $('b-start').disabled = n === 0;
    $('rite-n').textContent = n;
  }
  function hideAll() { $('ov-shrine').hidden = true; $('ov-rite').hidden = true; $('tray-tools').hidden = true; $('tray-ctx').hidden = true; }

  // ---- tooltip ------------------------------------------------------------
  function showTip(e, html) { const t = $('tip'); t.innerHTML = html; t.hidden = false; place(e.clientX, e.clientY); }
  function place(cx, cy) {
    const t = $('tip'), st = $('frame').getBoundingClientRect();
    let x = cx - st.left + 14, y = cy - st.top - t.offsetHeight - 12;
    if (x + t.offsetWidth > st.width) x = st.width - t.offsetWidth - 6;
    if (x < 4) x = 4;
    if (y < 4) y = cy - st.top + 20;
    t.style.left = x + 'px'; t.style.top = y + 'px';
  }
  function hideTip() { $('tip').hidden = true; }

  // ---- panels -------------------------------------------------------------
  function openPanel(id) { closePanels(); $(id).hidden = false; G.paused = true; Audio.play('click'); if (id === 'panel-shop') renderShop(); if (id === 'panel-pawn') renderPawn(); }
  function closePanels() {
    for (const id of ['panel-shop', 'panel-pawn', 'panel-help']) $(id).hidden = true;
    if ($('modal').hidden && !Ritual.active) G.paused = false;
  }
  function spend(n) {
    if (G.wd < n) { Audio.play('error'); toast('not enough', 'bad'); return false; }
    G.wd -= n; Audio.play('buy'); refreshHUD(); return true;
  }
  function price(label, cost, attrs) { return `<button class="buy" ${attrs}>${ic('wdollar', 'sm')}${label ? label + ' ' : ''}${U.fmt(cost)}</button>`; }

  function renderShop() {
    for (const b of $('shop-tabs').children) b.classList.toggle('active', b.dataset.tab === shopTab);
    let h = '<div class="grid">';
    if (shopTab === 'seeds') {
      for (const c of CROPS) {
        const gated = c.god && !G.blessings[c.god];
        h += `<div class="item ${gated ? '' : 'have'}">
          <div class="pic">${ic(c.icon, 'xl')}</div>
          <h3>${c.name}</h3>
          <p>${ic(OFFERINGS[c.offering].icon, 'sm')} ${OFFERINGS[c.offering].name} &middot; ${c.grow}s</p>
          <div class="act2"><span class="own">${G.seeds[c.key] || 0}</span>${gated
            ? `<button class="buy" disabled>${ic('lock', 'sm')}</button>`
            : price('', c.seed, `data-a="seed" data-k="${c.key}" data-n="1"`) + price('10x', c.seed * 10, `data-a="seed" data-k="${c.key}" data-n="10"`)}</div>
        </div>`;
      }
    } else if (shopTab === 'wombats') {
      const n = G.wombats.length, cap = Grove.capacity(), cost = WOMBAT_PRICE(n);
      h += `<div class="item">
        <div class="pic">${ic('wombat', 'xl')}</div>
        <h3>Adopt <span class="lv">${n}/${cap}</span></h3>
        <p>${n >= cap ? 'Dig another burrow first.' : 'One more mouth, one more offering.'}</p>
        <div class="act2">${price('', cost, `data-a="womb" ${n >= cap ? 'disabled' : ''}`)}</div></div>`;
      for (const w of G.wombats) {
        const fur = Sprites.furOf(w.pelt);
        const t = TRAITS.map((tr) => `${tr.name} ${w.traits[tr.key].toFixed(2)}`).join(' &middot; ');
        h += `<div class="item have"><div class="pic">${ic('wombat', 'xl')}</div>
          <h3>${w.name} <span class="lv">${Sprites.AGE[w.age].name}</span></h3>
          <p>${fur.name}${fur.rare ? ' &#9670;' : ''}<br>${t}</p></div>`;
      }
    } else if (shopTab === 'build') {
      for (const u of UPGRADES) {
        const l = G.up[u.key] || 0, cost = Math.round(u.base * Math.pow(u.mult, l)), max = l >= u.max;
        h += `<div class="item ${l ? 'have' : ''}"><div class="pic">${ic(u.icon, 'xl')}</div>
          <h3>${u.name} <span class="lv">${l}/${u.max}</span></h3><p>${u.desc(l)}</p>
          <div class="act2">${max ? '<button class="buy" disabled>max</button>' : price('', cost, `data-a="up" data-k="${u.key}"`)}</div></div>`;
      }
    } else {
      for (const d of DECOR) {
        const own = !!G.decor[d.key];
        h += `<div class="item ${own ? 'have' : ''}"><div class="pic">${ic(d.icon, 'xl')}</div>
          <h3>${d.name}</h3><p>${d.desc}</p>
          <div class="act2">${own ? '<button class="buy" disabled>set</button>' : price('', d.cost, `data-a="dec" data-k="${d.key}"`)}</div></div>`;
      }
    }
    $('shop-body').innerHTML = h + '</div>';
    $('shop-body').querySelectorAll('button.buy').forEach((b) => { if (!b.disabled) b.onclick = () => shopAct(b.dataset); });
  }
  function shopAct(d) {
    switch (d.a) {
      case 'seed': { const c = CROP_BY_KEY[d.k], n = +d.n; if (spend(c.seed * n)) G.seeds[c.k || c.key] = (G.seeds[c.key] || 0) + n; break; }
      case 'womb': {
        const n = G.wombats.length;
        if (n >= Grove.capacity()) return;
        if (spend(WOMBAT_PRICE(n))) { const w = Grove.addWombat(); toast(w.name, 'good'); }
        break;
      }
      case 'up': {
        const u = UPGRADES.find((x) => x.key === d.k), l = G.up[u.key] || 0;
        if (l >= u.max) return;
        if (spend(Math.round(u.base * Math.pow(u.mult, l)))) { G.up[u.key] = l + 1; if (u.key === 'trough' && !G.troughFood) G.troughFood = 'ashgrass'; }
        break;
      }
      case 'dec': {
        const dd = DECOR.find((x) => x.key === d.k);
        if (G.decor[dd.key]) return;
        if (spend(dd.cost)) { G.decor[dd.key] = true; toast(dd.name, 'good'); }
        break;
      }
    }
    renderShop(); refreshTray(); refreshHUD(); Main.save();
  }

  function renderPawn() {
    let h = '<div class="grid">';
    let any = false;
    for (const k of OFFER_ORDER) {
      const def = OFFERINGS[k];
      if (!def.sell) continue;
      const n = (G.offerings[k] || 0) + (G.blessed[k] || 0);
      any = any || n > 0;
      h += `<div class="item ${n ? 'have' : ''}"><div class="pic">${ic(def.icon, 'xl')}</div>
        <h3>${def.name} <span class="lv">${n}</span></h3><p>${def.sell} each</p>
        <div class="act2">${n ? price('', def.sell, `data-s="off" data-k="${k}" data-n="1"`) + (n > 1 ? price('all', def.sell * n, `data-s="off" data-k="${k}" data-n="${n}"`) : '') : '<button class="buy" disabled>&mdash;</button>'}</div></div>`;
    }
    for (const god of GODS) {
      const n = G.artifacts[god.key] || 0;
      if (!n) continue;
      any = true;
      h += `<div class="item have"><div class="pic">${ic(god.artIcon, 'xl')}</div>
        <h3>${god.artifact} <span class="lv">${n}</span></h3><p>${god.artValue} each</p>
        <div class="act2">${price('', god.artValue, `data-s="art" data-k="${god.key}" data-n="1"`)}</div></div>`;
    }
    if (!any) h += `<div class="item"><div class="pic">${ic('wdollar', 'xl')}</div><h3>Nothing to pawn</h3><p>Gilded and rune offerings, and the gifts of gods.</p></div>`;
    $('pawn-body').innerHTML = h + '</div>';
    $('pawn-body').querySelectorAll('button.buy').forEach((b) => { if (!b.disabled) b.onclick = () => pawnAct(b.dataset); });
  }
  function pawnAct(d) {
    const n = +d.n;
    if (d.s === 'off') {
      const def = OFFERINGS[d.k];
      let sold = 0;
      for (let i = 0; i < n; i++) {
        if ((G.offerings[d.k] || 0) > 0) G.offerings[d.k]--;
        else if ((G.blessed[d.k] || 0) > 0) G.blessed[d.k]--;
        else break;
        sold++;
      }
      G.wd += def.sell * sold;
    } else {
      const god = GOD_BY_KEY[d.k];
      if ((G.artifacts[d.k] || 0) < n) return;
      G.artifacts[d.k] -= n;
      G.wd += god.artValue * n;
    }
    Audio.play('sell');
    renderPawn(); refreshHUD(); refreshTray(); Main.save();
  }

  // ---- modals -------------------------------------------------------------
  function showBlessing(god) {
    const m = $('modal'), c = $('mcard');
    c.innerHTML = `<h2 style="color:${god.color}">${god.name}</h2><p>${god.title}</p>
      <div class="mrow">
        <div class="cell">${ic(god.glyph, 'xl')}<span>${god.blessing}</span></div>
        <div class="cell">${ic(god.artIcon, 'xl')}<span>${god.artifact}</span></div>
      </div>
      <button class="act" id="b-ok"><img class="ico" src="${Icons.url('close')}" alt=""></button>`;
    m.hidden = false; G.paused = true;
    $('b-ok').onclick = () => { m.hidden = true; G.paused = false; Audio.play('click'); refreshHUD(); refreshTray(); refreshRitual(); };
  }
  function showSummary(s) {
    const m = $('modal'), c = $('mcard');
    c.innerHTML = `<h2 style="color:${s.cashed ? 'var(--m4)' : 'var(--redL)'}">${s.cashed ? U.money(s.earned).replace('$', '') + ' W$' : U.fmt(s.peak.toFixed(1))}</h2>
      <div class="sum">
        <span>${ic('u_seats', 'sm')}</span><span class="v">${s.peak.toFixed(1)}</span>
        <span>${ic('offering', 'sm')}</span><span class="v">${s.settled}/${s.used}</span>
        <span>${ic('wombat', 'sm')}</span><span class="v">${s.crowd}</span>
        <span>${ic('eye', 'sm')}</span><span class="v">${s.goals}/3</span>
        <span>${ic('wdollar', 'sm')}</span><span class="v">${U.fmt(s.earned)}</span>
      </div>
      <button class="act" id="b-ok2"><img class="ico" src="${Icons.url('close')}" alt=""></button>`;
    m.hidden = false; G.paused = true;
    $('b-ok2').onclick = () => { m.hidden = true; G.paused = false; Audio.play('click'); refreshRiteCard(); refreshHUD(); Main.setMode('grove'); };
  }

  // ---- setup --------------------------------------------------------------
  function init(g) {
    G = g;
    document.querySelectorAll('img[data-ico]').forEach((el) => { el.src = Icons.url(el.dataset.ico); });
    document.querySelectorAll('.tab').forEach((b) => b.onclick = () => Main.setMode(b.dataset.mode));
    $('b-shop').onclick = () => openPanel('panel-shop');
    $('b-pawn').onclick = () => openPanel('panel-pawn');
    $('b-help').onclick = () => openPanel('panel-help');
    $('b-sound').onclick = () => {
      const m = Audio.toggleMute(); G.muted = m;
      $('b-sound').firstElementChild.src = Icons.url(m ? 'mute' : 'sound');
      Main.save();
    };
    $('b-music').onclick = () => { const on = Audio.toggleMusic(); G.musicOff = !on; $('b-music').textContent = on ? 'music' : 'muted'; Main.save(); };
    let armed = 0;
    $('b-reset').onclick = () => {
      const b = $('b-reset');
      if (Date.now() < armed) { Main.reset(); return; }
      armed = Date.now() + 4000; b.textContent = 'sure?'; Audio.play('alarm');
      setTimeout(() => { if (Date.now() >= armed) { b.textContent = 'reset'; armed = 0; } }, 4100);
    };
    document.querySelectorAll('[data-close]').forEach((b) => b.onclick = () => { closePanels(); Audio.play('click'); });
    for (const b of $('shop-tabs').children) b.onclick = () => { shopTab = b.dataset.tab; Audio.play('click'); renderShop(); };
    $('b-summon').onclick = () => Ritual.summon();
    $('b-unstage').onclick = () => Ritual.clearStage();
    $('b-start').onclick = () => { if (Tower.total()) Tower.newRun(); };
    $('b-cash').onclick = () => Tower.cashOut();
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closePanels(); });
    $('b-sound').firstElementChild.src = Icons.url(G.muted ? 'mute' : 'sound');
    $('b-music').textContent = G.musicOff ? 'muted' : 'music';
  }
  function setMode(mode) {
    document.querySelectorAll('.tab').forEach((b) => b.classList.toggle('active', b.dataset.mode === mode));
    $('tray-tools').hidden = mode !== 'grove';
    $('tray-ctx').hidden = false;
    $('ov-shrine').hidden = mode !== 'shrine';
    $('ov-rite').hidden = mode !== 'rite';
    refreshTray(); refreshHUD();
    if (mode === 'shrine') refreshRitual();
    if (mode === 'rite') refreshRiteCard();
  }
  function anyPanel() { return !$('panel-shop').hidden || !$('panel-pawn').hidden || !$('panel-help').hidden || !$('modal').hidden; }

  return {
    init, toast, refreshHUD, refreshTray, refreshRitual, refreshKnow, refreshRunHUD, refreshRiteCard,
    onRunStart, onRunPlay, onRunEnd, hideRunHUD, hideAll, showBlessing, showSummary,
    showTip, hideTip, place, setMode, openPanel, closePanels, anyPanel,
  };
})();
