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
    if (G.mode === 'intro') { $('checklist').hidden = true; return; }
    if (lastWd !== null && G.wd !== lastWd) bumpMoney();
    lastWd = G.wd;
    $('s-wd').textContent = U.fmt(G.wd);
    $('b-back').hidden = G.mode === 'grove';
    const dot = $('b-phone-dot');
    if (dot) {
      const jobs = (typeof Phone !== 'undefined') ? Phone.careList().length + Phone.gardenJobs().length + Phone.unread() : 0;
      dot.hidden = jobs === 0;
    }
    refreshList();
    refreshNotebook();
  }

  // ---- the clean-up list, a paper pinned to the fence ---------------------
  function refreshList() {
    const box = $('checklist');
    if (G.mode !== 'grove' || G.arrived) { box.hidden = true; return; }
    box.hidden = false;
    const ts = Grove.tasks();
    const left = ts.filter((t) => !t.done).length;
    box.innerHTML = `<h4>TO DO</h4>` + ts.map((t) => {
      const p = U.clamp(t.at / t.need, 0, 1);
      const at = Math.max(0, Math.round(t.at));
      return `<div class="task ${t.done ? 'done' : ''}" data-k="${t.key}">
        <div class="trow">
          <span class="box">${t.done ? '<i></i>' : ''}</span>
          ${ic(t.icon)}
          <b class="tname">${t.name || t.key}</b>
          <b class="tnum">${at}<small>/${t.need}</small></b>
        </div>
        <div class="bar"><i style="width:${Math.round(p * 100)}%"></i></div></div>`;
    }).join('') + `<div class="tfoot">${left ? left + (left === 1 ? ' JOB LEFT' : ' JOBS LEFT') : 'ALL DONE'}</div>`;
  }

  function refreshNotebook() { }           // the cultist speaks for herself now

  // ---- the tool wheel: right-click (or Tab) and the tools ring the cursor --
  const WHEEL_TOOLS = ['drag', 'food', 'sickle', 'destroy', 'hoe', 'seed', 'moss', 'water', 'pair', 'mound', 'pond'];
  let wheelRing = 'tools', wheelAt = { x: 320, y: 180 };
  function frameScale() { return $('frame').clientWidth / 640; }
  function openWheel(sx, sy, ring = 'tools') {
    if (G.mode !== 'grove') return;
    wheelAt = { x: U.clamp(sx, 10, 630), y: U.clamp(sy, 10, 350) };
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
    w.innerHTML = '';
    let items, title;
    if (wheelRing === 'tools') {
      title = 'TOOLS';
      items = WHEEL_TOOLS.map((key) => {
        const t = TOOL_BY_KEY[key], lk = !unlocked(G, key);
        return { icon: t.icon, on: G.tool === key, locked: lk, tip: lk ? `<b>${t.name}</b><br><span class="warn">${GATE_WHY[key] || 'not yet'}</span>` : `<b>${t.name}</b>${TIERS[key] ? `<br><span class="dim">${tierOf(G, key).name}</span>` : ''}<br>${t.desc}${t.cost ? `<br>${Icons.img('wdollar', 'sm')} ${U.fmt(t.cost)} each` : ''}`,
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
      title = food ? 'FEED' : 'SEED';
      // The picker says what each one actually does: how many you have, what it
      // grows into, how long it takes, and what the wombat leaves afterwards.
      items = CROPS.map((c) => {
        const n = (food ? G.food : G.seeds)[c.key] || 0;
        const on = food ? G.selFood === c.key : G.selSeed === c.key;
        const off = OFFERINGS[c.offering];
        const tip = food
          ? `<b>${c.name}</b>${c.magic ? ' <span class="warn">magical</span>' : ''}<br>
             <span class="dim">you have</span> <b>${n}</b><br>
             ${ic(off.icon, 'sm')} leaves <b>${off.name}</b> &middot; worth ${off.value}<br>
             ${ic('heart', 'sm')} +${c.hap} happiness`
          : `<b>${c.name}</b>${c.magic ? ' <span class="warn">magical</span>' : ''}<br>
             <span class="dim">seed in hand</span> <b>${n}</b><br>
             grows in <b>${c.grow}s</b> &middot; <b>${c.yield}</b> a plant<br>
             ${ic(off.icon, 'sm')} feeds for <b>${off.name}</b>`;
        return { icon: c.icon, on, n, out: n === 0, magic: !!c.magic, tip,
          act: () => {
            if (!n) { Audio.play('error'); toast(food ? 'grow it first' : "buy seed at Groot's cellar", 'bad'); return; }
            if (food) G.selFood = c.key; else G.selSeed = c.key;
            Audio.play('click'); closeWheel(); refreshHUD();
          } };
      });
      // whatever you have most of, first; the empties fall to the bottom
      items.sort((a, b2) => (b2.n || 0) - (a.n || 0));
      if (food) items.unshift({ icon: 't_hand', on: !G.selFood, tip: '<b>Pet</b><br>hurries digestion', act: () => { G.selFood = null; Audio.play('click'); closeWheel(); refreshHUD(); } });
      items.push({ icon: 'back', tip: '<b>Back</b>', act: () => { wheelRing = 'tools'; renderWheel(); } });
    }
    // a square tray, three to a row, that opens beside the cursor
    const tray = document.createElement('div');
    tray.className = 'tray';
    const head = document.createElement('div');
    head.className = 'trayhead';
    head.innerHTML = `<span>${title}</span><i class="hq">?</i><b>x</b>`;
    head.onclick = (e) => {
      e.stopPropagation();
      if (e.target.classList.contains('hq')) { closeWheel(); openPanel('panel-help'); return; }
      if (wheelRing === 'tools') closeWheel(); else { wheelRing = 'tools'; renderWheel(); }
    };
    tray.appendChild(head);
    const grid = document.createElement('div');
    grid.className = 'traygrid';
    items.forEach((it, idx) => {
      const el = document.createElement('button');
      el.className = 'spoke' + (it.on ? ' on' : '') + (it.locked ? ' locked' : '') + (it.out ? ' out' : '') + (it.magic ? ' magic' : '');
      el.innerHTML = `${ic(it.icon)}${it.n != null ? `<span class="n">${it.n}</span>` : ''}${it.locked ? `<span class="lk">${ic('lock', 'sm')}</span>` : ''}`;
      el.onclick = (e) => { e.stopPropagation(); it.act(); };
      el.onmouseenter = (e) => showTip(e, it.tip);
      el.onmouseleave = hideTip;
      grid.appendChild(el);
    });
    tray.appendChild(grid);
    w.appendChild(tray);
    // keep the whole tray on screen, opening down-right of the cursor by default
    const fw = $('frame').clientWidth, fh = $('frame').clientHeight;
    const cols = wheelRing === 'tools' ? 3 : 4;
    grid.style.gridTemplateColumns = `repeat(${cols}, 58px)`;
    const tw = cols * 58 + (cols - 1) * 7 + 22 + 8, th = tray.offsetHeight || 240;
    let px = wheelAt.x * k + 14, py = wheelAt.y * k + 14;
    if (px + tw > fw - 8) px = wheelAt.x * k - tw - 14;
    if (py + th > fh - 8) py = Math.max(8, fh - th - 8);
    w.style.left = Math.max(8, Math.round(px)) + 'px';
    w.style.top = Math.max(8, Math.round(py)) + 'px';
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
      el.onmouseenter = (e) => showTip(e, `<b>${def.name}</b><br>${poopPrice(def.key, 1)} W$ from the hooded one${def.sell ? `<br>${def.sell} W$ pawned at the mart` : ''}${bl ? '<br><b>blessed</b>' : ''}`);
      el.onmouseleave = hideTip;
      box.appendChild(el);
    }
    if (!i) box.innerHTML = '<span class="empty">no offerings</span>';
  }
  function refreshKnow() { refreshHUD(); }
  // a coin has just landed in the wallet: knock it
  let purseT = 0;
  function pingPurse() {
    const el = $('money');
    if (!el) return;
    el.classList.remove('ping');
    void el.offsetWidth;
    el.classList.add('ping');
    clearTimeout(purseT);
    purseT = setTimeout(() => el.classList.remove('ping'), 320);
  }

  // The stack is gone: the hooded one buys the cubes off you at his hut now.
  function refreshRunHUD() { }
  function onRunStart() { }
  function onRunPlay() { }
  function hideRunHUD() { }
  function onRunEnd() { refreshHUD(); }
  function refreshRiteCard() { }

  // ---- store basket -------------------------------------------------------
  // Two shops share this panel, so everything below asks which one you are in.
  const store = () => (G && G.mode === 'nursery' ? Nursery : Shop);
  function refreshBasket() {
    const n = store().basket.length;
    const chip = G && G.mode === 'nursery' ? 'n-basket' : 's-basket';
    const btn = G && G.mode === 'nursery' ? 'b-basket2' : 'b-basket';
    if ($(chip)) $(chip).textContent = n;
    if ($(btn)) $(btn).classList.toggle('full', n > 0);
    if (!$('panel-basket').hidden) renderBasket();
  }
  function openBasket() { openPanel('panel-basket'); }
  function renderBasket() {
    const St = store();
    const rows = St.lines();
    const t = St.total();
    const afford = t <= G.wd;
    let h = '';
    if (!rows.length) h = `<div class="empty2">${ic('basket', 'xl')}<p>THE BASKET IS EMPTY</p><span>${G.mode === 'nursery' ? 'walk the dome and click a pot' : 'swipe the aisles and click what you want'}</span></div>`;
    else {
      h = '<div class="blist">';
      for (const r of rows) {
        const each = Math.round(r.sum / r.n);
        h += `<div class="brow${r.deal ? ' deal' : ''}">
          <span class="bico">${ic(r.p.icon, 'lg')}</span>
          <span class="bn">${r.p.name}${r.deal ? '<em>HALF PRICE</em>' : `<em>${U.fmt(each)} each</em>`}</span>
          <span class="bstep"><button class="bm" data-id="${r.p.id}">-</button><b>${r.n}</b><button class="bp2" data-id="${r.p.id}">+</button></span>
          <span class="bp">${U.fmt(r.sum)}</span>
          <button class="bx" data-id="${r.p.id}" title="remove">${ic('close', 'sm')}</button></div>`;
      }
      h += '</div>';
    }
    const pct = G.wd > 0 ? Math.min(100, (t / G.wd) * 100) : 100;
    h += `<div class="btotal">
        <span class="tl">TOTAL</span>
        <b class="${afford ? '' : 'over'}">${ic('wdollar', 'sm')}${U.fmt(t)}</b>
        <span class="wallet">${U.fmt(G.wd)} in hand</span>
        <span class="tbar"><i style="width:${pct.toFixed(0)}%" class="${afford ? '' : 'over'}"></i></span>
      </div>
      <div class="brow2">
        <button class="act go big" id="b-pay" ${!rows.length || !afford ? 'disabled' : ''}>${ic('check')}<span>${afford ? 'PAY ' + U.fmt(t) : 'NOT ENOUGH'}</span></button>
        <button class="wbtn" id="b-clear">${ic('close', 'sm')}CLEAR</button>
        ${G.mode === 'nursery' ? '' : `<button class="wbtn" id="b-sell">${ic('wdollar', 'sm')}SELL</button>`}
      </div>`;
    $('basket-body').innerHTML = h;
    $('basket-body').querySelectorAll('.bx').forEach((b) => b.onclick = () => { St.removeLine(b.dataset.id); Audio.play('click'); renderBasket(); });
    $('basket-body').querySelectorAll('.bm').forEach((b) => b.onclick = () => { St.removeOne(b.dataset.id); Audio.play('click'); renderBasket(); });
    $('basket-body').querySelectorAll('.bp2').forEach((b) => b.onclick = () => { St.addById(b.dataset.id); renderBasket(); });
    const pay = $('b-pay');
    if (pay) pay.onclick = () => { St.checkout(); Audio.play('till'); closePanels(); renderBasket(); };
    $('b-clear').onclick = () => { St.clear(); Audio.play('click'); renderBasket(); };
    if ($('b-sell')) $('b-sell').onclick = () => { openPawn('shop'); };
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
  const PANELS = ['panel-basket', 'panel-pawn', 'panel-help', 'panel-talk', 'panel-wombat', 'panel-phone'];
  function openPanel(id) {
    closePanels(); $(id).hidden = false; G.paused = true; Audio.play('click');
    if (id === 'panel-basket') renderBasket();
    if (id === 'panel-pawn') renderPawn();
  }
  function closePanels() {
    if (Talk.isOpen()) Talk.close();
    for (const id of PANELS) $(id).hidden = true;
    if ($('modal').hidden && !Ritual.active) G.paused = false;
  }

  // ---- the adoption papers ------------------------------------------------
  // What you get before you spend three hundred dollars on an animal: a big
  // portrait that keeps moving, its traits as bars against the average, and
  // one line of whatever is wrong with it.
  let pupI = -1, pupRaf = 0, pupT = 0;
  const TRAIT_BLURB = {
    gut: ['slow to digest — fewer cubes', 'ordinary appetite', 'digests fast — more cubes'],
    calm: ['loses heart quickly', 'even-tempered', 'contented, whatever happens'],
    luck: ['nothing ever goes its way', 'average fortune', 'turns up the good stuff'],
  };
  function openWombat(w, i) {
    pupI = i;
    openPanel('panel-wombat');
    renderWombat(w);
    if (!pupRaf) pupRaf = requestAnimationFrame(pupTick);
  }
  function pupTick(ms) {
    if ($('panel-wombat').hidden) { pupRaf = 0; return; }
    pupRaf = requestAnimationFrame(pupTick);
    pupT = ms / 1000;
    paintPup();
  }
  function paintPup() {
    const cv = $('wombat-pic');
    const list = Shop.cagePups;
    const w = list && list[pupI];
    if (!cv || !w) return;
    const g = cv.getContext('2d');
    g.imageSmoothingEnabled = false;
    const W = cv.width, H = cv.height;
    // a corner of its pen, so the portrait has somewhere to stand
    Art.vband(g, 0, 0, W, H, '#6a4f34', '#8a6a48', 5);
    Art.rect(g, 0, H - 30, W, 30, '#a8873f');
    const rr = Art.rng(12);
    for (let i = 0; i < 180; i++) {
      const sx = rr() * W, sy = H - 30 + rr() * 30, k = rr();
      Art.rect(g, sx, sy, 3 + Math.round(rr() * 4), 1, k < 0.4 ? '#c2a15c' : k < 0.7 ? '#8a6c2e' : '#d8bd7a');
    }
    Art.rect(g, 0, H - 30, W, 2, '#d8bd7a');
    {                                        // a lamp cone down the back board
      const oa = g.globalAlpha;
      for (let k = 5; k >= 1; k--) {
        const r2 = k / 5;
        g.globalAlpha = oa * 0.07 * (1 - (k - 1) / 5.2);
        Art.poly(g, [[W / 2 - 10, 0], [W / 2 + 10, 0], [W / 2 + 10 + 50 * r2, 130 * r2], [W / 2 - 10 - 50 * r2, 130 * r2]], '#ffdc8a');
      }
      g.globalAlpha = oa;
    }
    const dir = Math.sin(pupT * 0.5) > 0 ? 1 : -1;
    const f = Math.floor(pupT * 4);
    const bob = Math.abs(Math.sin(pupT * 2)) * 2;
    Sprites.shadow(g, W / 2, H - 14, 'idle', f, w.pelt, dir, w.age, 1.9, 0);
    Sprites.blit(g, W / 2, H - 14 - bob, 'idle', f, w.pelt, dir, w.age, 1.9, 0);
    if (Math.sin(pupT * 1.3) > 0.9) FX.pixelText && null;
  }
  function traitRow(key, v) {
    const pct = Math.round(((v - 0.6) / 0.9) * 100);
    const cls = v > 1.15 ? ' hi' : v < 0.85 ? ' lo' : '';
    const blurb = TRAIT_BLURB[key][v > 1.15 ? 2 : v < 0.85 ? 0 : 1];
    const name = (TRAITS.find((t) => t.key === key) || { name: key }).name;
    return `<div class="dstat" title="${blurb}"><span class="dk">${name}</span>`
      + `<span class="dbar${cls}"><i style="width:${U.clamp(pct, 4, 100)}%"></i></span>`
      + `<span class="dv">${v.toFixed(2)}</span></div>`
      + `<div class="dtag" style="margin:-2px 0 4px 70px">${blurb}</div>`;
  }
  function renderWombat(w) {
    const fur = Sprites.furOf(w.pelt);
    const room = G.wombats.length < Grove.capacity();
    const afford = G.wd >= w.price;
    const age = w.age === 'adult' ? 'Adult' : w.age === 'juvenile' ? 'Juvenile' : 'Baby';
    $('wombat-body').innerHTML = `
      <div class="drow">
        <div class="dpic"><canvas id="wombat-pic" width="150" height="132"></canvas></div>
        <div class="dinfo">
          <div class="dname">${w.name}</div>
          <div class="dtag">${fur.name} &middot; ${age} &middot; ${w.tag}</div>
          ${traitRow('gut', w.traits.gut)}
          ${traitRow('calm', w.traits.calm)}
          ${traitRow('luck', w.traits.luck)}
        </div>
      </div>
      <div class="dnote"><b>Note from the keeper:</b> ${w.quirk}${fur.rare ? ' <span class="warn">Rare coat &mdash; priced accordingly.</span>' : ''}</div>
      <div class="drow2">
        <span class="dprice">${Icons.img('wdollar')} ${U.fmt(w.price)}</span>
        <button class="wbtn" id="b-pup-back">BACK</button>
        <button class="act go" id="b-pup-take"${room && afford ? '' : ' disabled'}>${!room ? 'NO ROOM' : !afford ? 'TOO DEAR' : 'TAKE ' + w.name.toUpperCase() + ' HOME'}</button>
      </div>`;
    $('b-pup-back').onclick = () => { closePanels(); Audio.play('click'); };
    $('b-pup-take').onclick = () => { if (Shop.adoptPup(pupI)) closePanels(); };
    paintPup();
  }

  // Two people buy things off you: the pawn counter at the mart, which only
  // wants the gilded and the rune, and the hooded one, who wants every cube
  // you have and pays more the more you bring.
  let pawnMode = 'shop';
  function openPawn(mode) { pawnMode = mode || 'shop'; openPanel('panel-pawn'); }
  function renderPawn() {
    const cult = pawnMode === 'cult';
    const head = $('panel-pawn').querySelector('.ptitle');
    if (head) head.textContent = cult ? 'THE HOODED ONE BUYS' : 'SELL';
    let h = cult ? `<p class="pnote">He takes the lot &mdash; every cube she leaves, whatever kind. The more you bring at once, the better the rate.</p><div class="grid">` : '<div class="grid">';
    let any = false;
    for (const k of OFFER_ORDER) {
      const def = OFFERINGS[k];
      if (!cult && !def.sell) continue;
      const n = (G.offerings[k] || 0) + (G.blessed[k] || 0);
      const each = cult ? poopPrice(k, 1) : def.sell;
      const lot = cult ? poopPrice(k, n) * n : def.sell * n;
      any = any || n > 0;
      h += `<div class="item ${n ? 'have' : ''}"><div class="pic">${ic(def.icon, 'xl')}</div>
        <h3>${def.name} <span class="lv">${n}</span></h3><p>${each} each${cult && n > 1 ? ` &middot; ${poopPrice(k, n)} for a load` : ''}</p>
        <div class="act2">${n ? price(each, `data-s="off" data-k="${k}" data-n="1"`) + (n > 1 ? price(lot, `data-s="off" data-k="${k}" data-n="${n}"`, 'all') : '') : '<button class="buy" disabled>&mdash;</button>'}</div></div>`;
    }
    if (cult) {
      $('pawn-body').innerHTML = h + (any ? '' : `<div class="item"><div class="pic">${ic('o_plain', 'xl')}</div><h3>Nothing in the truck</h3><p>Feed a wombat, wait, and drag what she leaves into the back.</p></div>`) + '</div>';
      $('pawn-body').querySelectorAll('button.buy').forEach((b) => { if (!b.disabled) b.onclick = () => pawnAct(b.dataset); });
      return;
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
      const each = pawnMode === 'cult' ? poopPrice(d.k, sold) : def.sell;
      G.wd += each * sold;
      G.stats.sold = (G.stats.sold || 0) + sold;
      FX.coinBurst(320, 200, 6);
      if (pawnMode === 'cult') {
        Guide.paid(each * sold);
        if (sold >= 5) setTimeout(() => Phone.push('cultist', `${sold} in one go. The order thanks you. I thank you more.`), 3000);
      }
    } else {
      const god = GOD_BY_KEY[d.k];
      if ((G.artifacts[d.k] || 0) < n) return;
      G.artifacts[d.k] -= n;
      G.wd += god.artValue * n;
      FX.coinBurst(320, 200, 8);
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
  function hideAll() {
    closeWheel(); $('checklist').hidden = true; $('b-tool').hidden = true;
    $('ov-shrine').hidden = true; $('ov-shop').hidden = true; $('ov-nursery').hidden = true;
    $('b-back').hidden = true;
  }
  function refreshAll() { refreshHUD(); refreshTray(); if (G.mode === 'shrine') refreshRitual(); }

  // ---- setup --------------------------------------------------------------
  function init(g) {
    G = g;
    Tex.install();                         // wood, paper, metal and gold, painted not faked
    document.querySelectorAll('img[data-ico]').forEach((el) => { el.src = Icons.url(el.dataset.ico); });
    $('b-back').onclick = () => { Audio.play('click'); Main.back(); };
    $('b-zin').onclick = () => { Audio.play('click'); Grove.zoomBy(1.24); refreshZoom(); };
    $('b-zout').onclick = () => { Audio.play('click'); Grove.zoomBy(1 / 1.24); refreshZoom(); };
    $('b-tool').onclick = (e) => { e.stopPropagation(); if (wheelOpen()) closeWheel(); else openWheel(470, 120); };
    $('b-basket').onclick = () => openBasket();
    if ($('b-basket2')) $('b-basket2').onclick = () => openBasket();
    $('b-music').onclick = () => { const on = Audio.toggleMusic(); G.musicOff = !on; $('b-music').textContent = on ? 'MUSIC' : 'MUTED'; Main.save(); };
    let armed = 0;
    $('b-reset').onclick = () => {
      const b = $('b-reset');
      if (Date.now() < armed) { Main.reset(); return; }
      armed = Date.now() + 4000; b.textContent = 'SURE?'; Audio.play('alarm');
      setTimeout(() => { if (Date.now() >= armed) { b.textContent = 'RESET'; armed = 0; } }, 4100);
    };
    document.querySelectorAll('[data-close]').forEach((b) => b.onclick = () => { closePanels(); Audio.play('click'); });
    // the phone: a button in the corner, and P from anywhere
    $('b-phone').onclick = () => Phone.toggle();
    $('ph-close').onclick = () => Phone.close();
    $('ph-home-btn').onclick = () => Phone.open('home');
    $('ph-back').onclick = () => Phone.back();
    $('b-summon').onclick = () => Ritual.summon();
    $('b-unstage').onclick = () => Ritual.clearStage();
    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
      if (Talk.isOpen() && Talk.key(e)) { e.preventDefault(); return; }
      if (Phone.isOpen() && Phone.key(e)) { e.preventDefault(); return; }
      if ((e.key === 'p' || e.key === 'P') && G.mode !== 'intro' && G.mode !== 'menu' && !Talk.isOpen()) { Phone.toggle(); e.preventDefault(); return; }
      if (e.key === 'Escape') { if (G.mode === 'intro') Intro.skip(); else closePanels(); }
    });
    $('b-music').textContent = G.musicOff ? 'MUTED' : 'MUSIC';
  }
  function setMode(mode) {
    const intro = mode === 'intro' || mode === 'menu';
    $('money').hidden = intro; $('mini').hidden = intro; $('side').hidden = intro;
    $('zoomer').hidden = mode !== 'grove';
    if (intro) { closeWheel(); $('checklist').hidden = true; }
    $('ov-shrine').hidden = mode !== 'shrine';
    $('ov-shop').hidden = mode !== 'shop';
    $('ov-nursery').hidden = mode !== 'nursery';
    closeWheel();
    refreshTray(); refreshHUD();
    if (mode === 'shrine') refreshRitual();
    if (mode === 'shop' || mode === 'nursery') refreshBasket();
  }
  // the zoom column follows the camera so the nub always tells the truth
  function refreshZoom() {
    const bar = $('zbar'), nub = $('znub');
    if (!bar || !nub || $('zoomer').hidden) return;
    const f = U.clamp(Grove.zoomFrac(), 0, 1);
    nub.style.bottom = Math.round(f * (bar.clientHeight - 10)) + 'px';
  }
  function anyPanel() { return PANELS.some((id) => !$(id).hidden) || !$('modal').hidden; }

  return {
    init, toast, refreshHUD, bumpMoney, refreshTray, refreshAll, refreshList, refreshNotebook, openWheel, closeWheel, wheelOpen, refreshRitual, refreshKnow,
    refreshRunHUD, refreshRiteCard, refreshBasket, openBasket,
    onRunStart, onRunPlay, onRunEnd, hideRunHUD, hideAll, showBlessing, pingPurse,
    showTip, hideTip, place, setMode, openPanel, openPawn, closePanels, anyPanel, refreshZoom, openWombat,
  };
})();
