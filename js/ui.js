// ---- Interface: money, a tool dock, and almost nothing else --------------
const UI = (() => {
  let G = null;
  const $ = (id) => document.getElementById(id);
  const ic = (n, cls = '') => Icons.img(n, cls);

  function toast(msg, kind = '') {
    const t = document.createElement('div');
    t.className = 'toast ' + kind; t.innerHTML = msg;
    $('toasts').appendChild(t);
    setTimeout(() => { t.style.transition = 'opacity .4s'; t.style.opacity = '0'; }, 2400);
    setTimeout(() => t.remove(), 2900);
  }

  // ---- the only number on screen -----------------------------------------
  let lastWd = null;
  function bumpMoney() { const m = $('money'); m.classList.remove('bump'); void m.offsetWidth; m.classList.add('bump'); }
  function refreshHUD() {
    if (lastWd !== null && G.wd !== lastWd) bumpMoney();
    lastWd = G.wd;
    $('s-wd').textContent = U.fmt(G.wd);
    const truck = $('b-truck');
    truck.hidden = G.mode !== 'grove';
    truck.classList.toggle('on', Grove.truck.parked);
    $('b-back').hidden = G.mode === 'grove';
    refreshList();
    refreshNotebook();
  }

  // ---- the clean-up list, a paper pinned to the fence ---------------------
  function refreshList() {
    const box = $('checklist');
    if (G.mode !== 'grove' || G.arrived) { box.hidden = true; return; }
    box.hidden = false;
    const ts = Grove.tasks();
    box.innerHTML = `<div class="tape"></div><h4>TO DO</h4>` + ts.map((t) => {
      const p = U.clamp(t.at / t.need, 0, 1);
      return `<div class="task ${t.done ? 'done' : ''}" data-k="${t.key}">
        <span class="box">${t.done ? '<i></i>' : ''}</span>
        ${ic(t.icon)}
        <span class="bar"><i style="width:${Math.round(p * 100)}%"></i></span>
        <b>${Math.max(0, Math.round(t.at))}<small>/${t.need}</small></b></div>`;
    }).join('') + '<div class="tear"></div>';
  }

  function refreshNotebook() { }           // the cultist speaks for herself now

  // ---- the tool wheel: right-click (or Tab) and the tools ring the cursor --
  const WHEEL_TOOLS = ['drag', 'food', 'sickle', 'destroy', 'hoe', 'seed', 'moss', 'water', 'pair'];
  let wheelRing = 'tools', wheelAt = { x: 320, y: 180 };
  function frameScale() { return $('frame').clientWidth / 640; }
  function openWheel(sx, sy, ring = 'tools') {
    if (G.mode !== 'grove') return;
    wheelAt = { x: U.clamp(sx, 84, 556), y: U.clamp(sy, 70, 300) };
    wheelRing = ring;
    renderWheel();
    Audio.play('click');
  }
  function closeWheel() { $('wheel').hidden = true; }
  function wheelOpen() { return !$('wheel').hidden; }
  function renderWheel() {
    const w = $('wheel');
    const k = frameScale();
    w.hidden = false;
    w.style.left = (wheelAt.x * k) + 'px'; w.style.top = (wheelAt.y * k) + 'px';
    w.innerHTML = '';
    let items;
    if (wheelRing === 'tools') {
      items = WHEEL_TOOLS.map((key) => {
        const t = TOOL_BY_KEY[key], lk = !unlocked(G, key);
        return { icon: t.icon, on: G.tool === key, locked: lk, tip: lk ? `<b>${t.name}</b><br><span class="warn">${GATE_WHY[key] || 'not yet'}</span>` : `<b>${t.name}</b>${TIERS[key] ? `<br><span class="dim">${tierOf(G, key).name}</span>` : ''}<br>${t.desc}`,
          act: () => {
            if (lk) { Audio.play('error'); toast(GATE_WHY[key] || 'not yet', 'bad'); return; }
            G.tool = key; Grove.clearPair(); Audio.play('click');
            if (key === 'food') { wheelRing = 'food'; renderWheel(); return; }
            if (key === 'seed') { wheelRing = 'seed'; renderWheel(); return; }
            closeWheel(); refreshHUD();
          } };
      });
    } else {
      const food = wheelRing === 'food';
      items = CROPS.map((c) => {
        const n = (food ? G.food : G.seeds)[c.key] || 0;
        const on = food ? G.selFood === c.key : G.selSeed === c.key;
        return { icon: c.icon, on, n, out: n === 0, tip: `<b>${c.name}</b><br>${n} ${food ? 'to feed' : 'seed'}`,
          act: () => {
            if (!n) { Audio.play('error'); toast(food ? 'grow it first' : 'buy seed at the mart', 'bad'); return; }
            if (food) G.selFood = c.key; else G.selSeed = c.key;
            Audio.play('click'); closeWheel(); refreshHUD();
          } };
      });
      if (food) items.unshift({ icon: 't_hand', on: !G.selFood, tip: '<b>Pet</b><br>hurries digestion', act: () => { G.selFood = null; Audio.play('click'); closeWheel(); refreshHUD(); } });
      items.push({ icon: 'back', tip: '<b>Back</b>', act: () => { wheelRing = 'tools'; renderWheel(); } });
    }
    const R = items.length > 8 ? 74 : 62;
    items.forEach((it, idx) => {
      const a = -Math.PI / 2 + (idx / items.length) * TAU;
      const el = document.createElement('button');
      el.className = 'spoke' + (it.on ? ' on' : '') + (it.locked ? ' locked' : '') + (it.out ? ' out' : '');
      el.style.left = Math.round(Math.cos(a) * R) + 'px'; el.style.top = Math.round(Math.sin(a) * R) + 'px';
      el.style.animationDelay = (idx * 22) + 'ms';
      el.innerHTML = `${ic(it.icon)}${it.n != null ? `<span class="n">${it.n}</span>` : ''}${it.locked ? `<span class="lk">${ic('lock', 'sm')}</span>` : ''}`;
      el.onclick = (e) => { e.stopPropagation(); it.act(); };
      el.onmouseenter = (e) => showTip(e, it.tip);
      el.onmouseleave = hideTip;
      w.appendChild(el);
    });
    const hub = document.createElement('div');
    hub.className = 'hub';
    hub.innerHTML = ic(wheelRing === 'tools' ? TOOL_BY_KEY[G.tool].icon : wheelRing === 'food' ? 't_food' : 't_seed', 'lg');
    hub.onclick = (e) => { e.stopPropagation(); closeWheel(); };
    w.appendChild(hub);
  }
  // the badge in the corner shows the tool in hand and opens the wheel for touch
  function refreshTray() {
    const b = $('b-tool');
    b.hidden = G.mode !== 'grove';
    const t = TOOL_BY_KEY[G.tool] || TOOLS[0];
    b.firstElementChild.src = Icons.url(t.icon);
    if (wheelOpen()) renderWheel();
  }
  function pickTool() { }

  // ---- shrine -------------------------------------------------------------
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
    const box2 = $('offer-slots');
    box2.innerHTML = '';
    offerSlots(box2, (k, e) => Ritual.stage(k, e.shiftKey ? 5 : 1));
  }
  function offerSlots(box, onClick, keys) {
    let i = 0;
    for (const k of OFFER_ORDER) {
      const plain = G.offerings[k] || 0, bl = G.blessed[k] || 0;
      if (plain + bl === 0) continue;
      i++;
      const def = OFFERINGS[k];
      const el = document.createElement('button');
      el.className = 'chip' + (keys && G.selOffer === k ? ' on' : '');
      el.innerHTML = `${ic(def.icon)}${keys ? `<span class="k">${i}</span>` : ''}<span class="n">${plain + bl}${bl ? `<em>+${bl}</em>` : ''}</span>`;
      el.onclick = (e) => onClick(k, e);
      el.onmouseenter = (e) => showTip(e, `<b>${def.name}</b><br>${def.value} at the stack${def.sell ? `<br>${def.sell} W$ pawned` : ''}${bl ? '<br><b>blessed</b> pays double' : ''}`);
      el.onmouseleave = hideTip;
      box.appendChild(el);
    }
    if (!i) box.innerHTML = '<span class="empty">no offerings</span>';
  }
  function refreshKnow() { refreshHUD(); }

  // ---- the stack ----------------------------------------------------------
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
  function onRunStart() { $('rite-card').hidden = true; $('rite-read').hidden = true; $('rite-tray').hidden = false; refreshRunHUD(); refreshOfferTray(); }
  function onRunPlay() { $('rite-read').hidden = false; refreshRunHUD(); }
  function hideRunHUD() { $('rite-read').hidden = true; }
  function onRunEnd() { refreshRiteCard(); refreshHUD(); refreshOfferTray(); }
  function refreshRiteCard() {
    const n = Tower.total();
    $('rite-card').hidden = Tower.active || G.mode !== 'rite';
    $('rite-tray').hidden = !Tower.active || G.mode !== 'rite';
    $('b-start').disabled = n === 0;
    $('rite-n').textContent = n;
    refreshOfferTray();
  }
  function refreshOfferTray() {
    const box = $('rite-slots');
    if (!box) return;
    box.innerHTML = '';
    offerSlots(box, (k) => { G.selOffer = k; Audio.play('click'); refreshOfferTray(); }, true);
  }

  // ---- store basket -------------------------------------------------------
  function refreshBasket() {
    const n = Shop.basket.length;
    $('s-basket').textContent = n;
    $('b-basket').classList.toggle('full', n > 0);
    if (!$('panel-basket').hidden) renderBasket();
  }
  function openBasket() { openPanel('panel-basket'); }
  function renderBasket() {
    const rows = Shop.lines();
    let h = '';
    if (!rows.length) h = `<div class="empty2">${ic('basket', 'xl')}<p>the basket is empty</p></div>`;
    else {
      h = '<div class="blist">';
      for (const r of rows) {
        h += `<div class="brow">${ic(r.p.icon, 'lg')}<span class="bn">${r.p.name}</span><span class="bq">x${r.n}</span>
          <span class="bp">${ic('wdollar', 'sm')}${U.fmt(r.sum)}</span>
          <button class="bx" data-id="${r.p.id}">${ic('close', 'sm')}</button></div>`;
      }
      h += '</div>';
    }
    const t = Shop.total();
    h += `<div class="btotal">${ic('wdollar')}<b>${U.fmt(t)}</b><span class="dim">of ${U.fmt(G.wd)}</span></div>
      <div class="brow2">
        <button class="act" id="b-pay" ${!rows.length || t > G.wd ? 'disabled' : ''}>${ic('check')}</button>
        <button class="wbtn" id="b-clear">${ic('close', 'sm')}</button>
        <button class="wbtn" id="b-sell">${ic('wdollar', 'sm')} sell</button>
      </div>`;
    $('basket-body').innerHTML = h;
    $('basket-body').querySelectorAll('.bx').forEach((b) => b.onclick = () => { Shop.removeLine(b.dataset.id); renderBasket(); });
    const pay = $('b-pay');
    if (pay) pay.onclick = () => { Shop.checkout(); Audio.play('till'); closePanels(); renderBasket(); };
    $('b-clear').onclick = () => { Shop.clear(); renderBasket(); };
    $('b-sell').onclick = () => { openPanel('panel-pawn'); };
  }

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
  const PANELS = ['panel-basket', 'panel-pawn', 'panel-help'];
  function openPanel(id) {
    closePanels(); $(id).hidden = false; G.paused = true; Audio.play('click');
    if (id === 'panel-basket') renderBasket();
    if (id === 'panel-pawn') renderPawn();
  }
  function closePanels() {
    for (const id of PANELS) $(id).hidden = true;
    if ($('modal').hidden && !Ritual.active) G.paused = false;
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
        <div class="act2">${n ? price(def.sell, `data-s="off" data-k="${k}" data-n="1"`) + (n > 1 ? price(def.sell * n, `data-s="off" data-k="${k}" data-n="${n}"`, 'all') : '') : '<button class="buy" disabled>&mdash;</button>'}</div></div>`;
    }
    for (const god of GODS) {
      const n = G.artifacts[god.key] || 0;
      if (!n) continue;
      any = true;
      h += `<div class="item have"><div class="pic">${ic(god.artIcon, 'xl')}</div>
        <h3>${god.artifact} <span class="lv">${n}</span></h3><p>${god.artValue} each</p>
        <div class="act2">${price(god.artValue, `data-s="art" data-k="${god.key}" data-n="1"`)}</div></div>`;
    }
    if (!any) h += `<div class="item"><div class="pic">${ic('wdollar', 'xl')}</div><h3>Nothing to sell</h3><p>Gilded and rune offerings, and the gifts of gods.</p></div>`;
    $('pawn-body').innerHTML = h + '</div>';
    $('pawn-body').querySelectorAll('button.buy').forEach((b) => { if (!b.disabled) b.onclick = () => pawnAct(b.dataset); });
  }
  function price(cost, attrs, label) { return `<button class="buy" ${attrs}>${ic('wdollar', 'sm')}${label ? label + ' ' : ''}${U.fmt(cost)}</button>`; }
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
    renderPawn(); refreshHUD(); Main.save();
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
    $('b-ok').onclick = () => { m.hidden = true; G.paused = false; Audio.play('click'); refreshAll(); refreshRitual(); };
  }
  function showSummary(s) {
    const m = $('modal'), c = $('mcard');
    c.innerHTML = `<h2 style="color:${s.cashed ? 'var(--m4)' : 'var(--redL)'}">${s.cashed ? U.fmt(s.earned) + ' W$' : s.peak.toFixed(1)}</h2>
      <div class="sum">
        <span>${ic('u_seats', 'sm')}</span><span class="v">${s.peak.toFixed(1)}</span>
        <span>${ic('offering', 'sm')}</span><span class="v">${s.settled}/${s.used}</span>
        <span>${ic('wombat', 'sm')}</span><span class="v">${s.crowd}</span>
        <span>${ic('eye', 'sm')}</span><span class="v">${s.goals}/3</span>
        <span>${ic('wdollar', 'sm')}</span><span class="v">${U.fmt(s.earned)}</span>
      </div>
      <button class="act" id="b-ok2"><img class="ico" src="${Icons.url('close')}" alt=""></button>`;
    m.hidden = false; G.paused = true;
    $('b-ok2').onclick = () => { m.hidden = true; G.paused = false; Audio.play('click'); refreshRiteCard(); refreshHUD(); };
  }

  function hideAll() {
    closeWheel(); $('checklist').hidden = true; $('b-tool').hidden = true;
    $('ov-shrine').hidden = true; $('ov-rite').hidden = true; $('ov-shop').hidden = true;
    $('b-truck').hidden = true; $('b-back').hidden = true;
  }
  function refreshAll() { refreshHUD(); refreshTray(); if (G.mode === 'shrine') refreshRitual(); if (G.mode === 'rite') refreshRiteCard(); }

  // ---- setup --------------------------------------------------------------
  function init(g) {
    G = g;
    document.querySelectorAll('img[data-ico]').forEach((el) => { el.src = Icons.url(el.dataset.ico); });
    $('b-back').onclick = () => { Audio.play('click'); Main.back(); };
    $('b-truck').onclick = () => { Grove.callTruck(); refreshHUD(); };
    $('b-tool').onclick = (e) => { e.stopPropagation(); if (wheelOpen()) closeWheel(); else openWheel(560, 250); };
    $('b-help').onclick = () => openPanel('panel-help');
    $('b-sound').onclick = () => {
      const m = Audio.toggleMute(); G.muted = m;
      $('b-sound').firstElementChild.src = Icons.url(m ? 'mute' : 'sound');
      Main.save();
    };
    $('b-basket').onclick = () => openBasket();
    $('b-music').onclick = () => { const on = Audio.toggleMusic(); G.musicOff = !on; $('b-music').textContent = on ? 'music' : 'muted'; Main.save(); };
    let armed = 0;
    $('b-reset').onclick = () => {
      const b = $('b-reset');
      if (Date.now() < armed) { Main.reset(); return; }
      armed = Date.now() + 4000; b.textContent = 'sure?'; Audio.play('alarm');
      setTimeout(() => { if (Date.now() >= armed) { b.textContent = 'reset'; armed = 0; } }, 4100);
    };
    document.querySelectorAll('[data-close]').forEach((b) => b.onclick = () => { closePanels(); Audio.play('click'); });
    $('b-summon').onclick = () => Ritual.summon();
    $('b-unstage').onclick = () => Ritual.clearStage();
    $('b-start').onclick = () => { if (Tower.total()) Tower.newRun(); };
    $('b-cash').onclick = () => Tower.cashOut();
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closePanels(); });
    $('b-sound').firstElementChild.src = Icons.url(G.muted ? 'mute' : 'sound');
    $('b-music').textContent = G.musicOff ? 'muted' : 'music';
  }
  function setMode(mode) {
    $('ov-shrine').hidden = mode !== 'shrine';
    $('ov-rite').hidden = mode !== 'rite';
    $('ov-shop').hidden = mode !== 'shop';
    closeWheel();
    refreshTray(); refreshHUD();
    if (mode === 'shrine') refreshRitual();
    if (mode === 'rite') refreshRiteCard();
    if (mode === 'shop') refreshBasket();
  }
  function anyPanel() { return PANELS.some((id) => !$(id).hidden) || !$('modal').hidden; }

  return {
    init, toast, refreshHUD, bumpMoney, refreshTray, refreshAll, refreshList, refreshNotebook, openWheel, closeWheel, wheelOpen, refreshRitual, refreshKnow,
    refreshRunHUD, refreshRiteCard, refreshBasket, openBasket,
    onRunStart, onRunPlay, onRunEnd, hideRunHUD, hideAll, showBlessing, showSummary,
    showTip, hideTip, place, setMode, openPanel, closePanels, anyPanel,
  };
})();
