// ---- Interface: ribbon, trays, market, warren, readouts, modals -----------
const UI = (() => {
  let G = null;
  const $ = (id) => document.getElementById(id);
  let shopTab = 'seeds';
  let pairPick = [];

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
  const cropOpen = (c) => (G.stats.earned || 0) >= c.unlock;
  const owned = (t) => G.tools[t] !== undefined;

  // ---- ribbon -------------------------------------------------------------
  function refreshHUD() {
    $('hud-money').textContent = U.fmt(G.money);
    $('hud-offer').textContent = U.fmt(OFFER_ORDER.reduce((s, k) => s + (G.offerings[k] || 0), 0));
    $('hud-fruit').textContent = U.fmt(G.fruitBank);
    $('hud-favour').textContent = U.fmt(G.favour);
    $('hud-restore').textContent = Math.round(World.restoration()) + '%';
    $('hud-best').textContent = G.record;
    const rp = $('pip-roots'), ready = Knowledge.ready();
    rp.hidden = ready === 0; rp.textContent = ready;
    const sp = $('pip-shrine'), rites = GODS.filter((gd) => Ritual.canSummon(gd)).length;
    sp.hidden = rites === 0; sp.textContent = rites;
  }

  // ---- trays --------------------------------------------------------------
  function refreshToolBar() {
    const box = $('slots-tool');
    box.innerHTML = '';
    for (let i = 0; i < TOOLS.length; i++) {
      const t = TOOLS[i];
      const have = owned(t.key);
      const el = document.createElement('button');
      el.className = 'slot' + (G.selTool === t.key && have ? ' on' : '') + (have ? '' : ' locked');
      el.innerHTML = `<img class="ico lg" src="${Icons.url(t.icon)}" alt="">
        <span class="nm">${t.name}</span><span class="ct">${have ? (G.tools[t.key] ? 'L' + (G.tools[t.key] + 1) : t.verb) : U.money(t.base)}</span>
        <span class="key">${i + 1}</span>`;
      el.onmouseenter = (e) => showTip(e, `<b>${t.name}</b><br>${t.desc(G.tools[t.key] || 0)}${have ? '' : '<br><span class="warn">Buy it at the Market</span>'}`);
      el.onmousemove = (e) => positionTip(e.clientX, e.clientY);
      el.onmouseleave = hideTip;
      el.onclick = () => {
        if (!have) { openShop('tools'); return; }
        G.selTool = G.selTool === t.key ? null : t.key;
        Audio.play('click'); refreshToolBar(); Main.save();
      };
      box.appendChild(el);
    }
    // the "no tool" hand, for petting and picking things up
    const hand = document.createElement('button');
    hand.className = 'slot' + (G.selTool ? '' : ' on');
    hand.innerHTML = `<img class="ico lg" src="${Icons.url('f_paws')}" alt=""><span class="nm">Hand</span><span class="ct">Pet</span><span class="key">0</span>`;
    hand.onmouseenter = (e) => showTip(e, '<b>Hand</b><br>Pet a wombat, or pick up an offering.');
    hand.onmouseleave = hideTip;
    hand.onclick = () => { G.selTool = null; Audio.play('click'); refreshToolBar(); Main.save(); };
    box.appendChild(hand);

    const sel = $('sel-seed');
    const open = CROPS.filter(cropOpen);
    sel.innerHTML = open.map((c) => `<option value="${c.key}"${G.selSeed === c.key ? ' selected' : ''}>${c.name} — ${U.money(c.seed)}</option>`).join('');
    sel.onchange = () => { G.selSeed = sel.value; Main.save(); };
    const sowing = G.selTool === 'pouch';
    $('lbl-seed').hidden = !sowing; sel.hidden = !sowing;
  }

  function refreshOfferBar() {
    const box = $('slots-offer');
    if (!box) return;
    box.innerHTML = '';
    let n = 0;
    for (const k of OFFER_ORDER) {
      const have = G.offerings[k] || 0;
      if (!have) continue;
      const def = OFFERINGS[k];
      const bless = G.blessed[k] || 0;
      n++;
      const el = document.createElement('button');
      el.className = 'slot' + (G.selOffer === k ? ' on' : '') + (bless ? ' prem' : '');
      el.innerHTML = `<img class="ico lg" src="${Icons.url(def.icon)}" alt="">
        <span class="nm">${def.name}</span><span class="ct">${have}${bless ? ` <b class="g">${bless}</b>` : ''}</span><span class="key">${n}</span>`;
      el.onmouseenter = (e) => showTip(e, offerTip(def, bless));
      el.onmousemove = (e) => positionTip(e.clientX, e.clientY);
      el.onmouseleave = hideTip;
      el.onclick = () => { G.selOffer = k; Audio.play('click'); refreshOfferBar(); };
      box.appendChild(el);
    }
    if (!n) box.innerHTML = '<span class="empty">Nothing stored. The wombats are working on it.</span>';
  }
  function offerTip(def, bless) {
    return `<b>${def.name}</b> &middot; ${U.money(def.value)}<br>${def.desc}
      <br><span class="dim">weight ${def.density.toFixed(1)} &middot; grip ${def.friction.toFixed(2)}${def.adhesion ? ' &middot; clings' : ''}</span>
      ${bless ? `<br><span class="good">${bless} blessed &mdash; worth double</span>` : ''}`;
  }

  function refreshRootHUD() {
    $('k-fruit').textContent = U.fmt(G.fruitBank);
    const grown = FRUIT_SKILLS.filter((s) => G.fruit[s.key]).length;
    $('k-grown').textContent = grown + '/' + FRUIT_SKILLS.length;
    const next = FRUIT_SKILLS.find((s) => Knowledge.state(s) === 'buy');
    $('k-note').textContent = next ? next.name + ' is ready' : 'Crops give fruit when eaten';
  }
  function refreshShrineHUD() {
    const n = Object.keys(G.gods || {}).length;
    $('s-awake').textContent = n + '/10';
    $('s-favour').textContent = U.fmt(G.favour);
    const ready = GODS.filter((gd) => Ritual.canSummon(gd));
    $('s-note').textContent = ready.length ? ready[0].name + ' can be called' : 'Offerings pay for a rite';
  }
  function refreshRunHUD() {
    const R = Tower.R;
    $('r-height').textContent = R.height.toFixed(1);
    $('r-crowd').textContent = Tower.crowdSize;
    $('r-power').textContent = 'x' + R.power.toFixed(2);
    $('r-earned').textContent = U.money(R.earned);
    $('r-lives').innerHTML = hearts(R.lives, R.maxLives);
    $('r-perks').innerHTML = R.blessings.map((k) => {
      const p = CUPID_BLESSINGS.find((x) => x.key === k);
      return p ? `<img src="${Icons.url(p.icon)}" alt="" title="${p.name}">` : '';
    }).join('');
  }
  function onRunStart() { $('run-card').hidden = true; $('run-read').hidden = true; refreshRunHUD(); }
  function onRunPlay() { $('run-read').hidden = false; refreshRunHUD(); }
  function hideRunHUD() { $('run-read').hidden = true; }
  function onRunEnd() { refreshRunCard(); refreshHUD(); refreshOfferBar(); }
  function refreshRunCard() {
    const card = $('run-card');
    card.hidden = Tower.active;
    if (Tower.active) return;
    const n = Tower.total();
    $('btn-start').disabled = n === 0;
    $('run-note').innerHTML = n === 0
      ? 'No offerings stored. Feed the grove first.'
      : `<b>${n}</b> offering${n === 1 ? '' : 's'} on the shelf. ${U.pick(TIPS)}`;
  }

  // ---- tooltip ------------------------------------------------------------
  function showTip(e, html) { const t = $('tooltip'); t.innerHTML = html; t.hidden = false; positionTip(e.clientX, e.clientY); }
  function positionTip(cx, cy) {
    const t = $('tooltip'), r = t.getBoundingClientRect();
    let x = cx + 14, y = cy + 16;
    if (x + r.width > window.innerWidth - 8) x = cx - r.width - 12;
    if (y + r.height > window.innerHeight - 8) y = cy - r.height - 12;
    t.style.left = x + 'px'; t.style.top = y + 'px';
  }
  function hideTip() { $('tooltip').hidden = true; }

  // ---- panels -------------------------------------------------------------
  function openPanel(id) { closePanels(); $(id).hidden = false; G.paused = true; Audio.play('click'); }
  function closePanels() {
    for (const id of ['panel-shop', 'panel-help', 'panel-warren']) $(id).hidden = true;
    G.paused = false;
  }
  function openShop(tab) { if (tab) shopTab = tab; openPanel('panel-shop'); renderShop(); }
  function warrenOpen() { return !$('panel-warren').hidden; }
  function spend(cost) {
    if (G.money < cost) { toast('Not enough. ' + U.money(cost) + ' needed.', 'bad'); Audio.play('error'); return false; }
    G.money -= cost; Audio.play('buy'); return true;
  }
  function priceBtn(label, cost, attrs) { return `<button class="buy" ${attrs}>${Icons.img('coin', 'sm')}${label ? label + ' ' : ''}${U.fmt(cost)}</button>`; }

  function renderShop() {
    for (const b of $('shop-tabs').children) b.classList.toggle('active', b.dataset.tab === shopTab);
    const body = $('shop-body');
    let h = '';
    if (shopTab === 'seeds') {
      h += '<p class="lead">Seeds go into tilled soil. What a wombat eats decides what it leaves.</p>';
      for (const c of CROPS) {
        const open = cropOpen(c);
        const off = OFFERINGS[c.offering];
        h += `<div class="item ${open ? '' : 'off'}">
          <img class="ico xl" src="${Icons.url(c.icon)}" alt="">
          <div class="txt"><b>${c.name}</b><span>${c.desc}</span>
            <span class="dim">${c.grow}s to ripen &middot; leaves ${off.name}${c.fruit ? ' &middot; ' + c.fruit + ' fruit' : ''}</span></div>
          <div class="act">${open
            ? `<span class="dim">${U.money(c.seed)} a seed</span>${G.selSeed === c.key ? '<span class="tag on">sowing</span>' : `<button class="buy" data-act="seed" data-k="${c.key}">Choose</button>`}`
            : `<span class="tag">${U.money(c.unlock)} earned</span>`}</div></div>`;
      }
    } else if (shopTab === 'tools') {
      h += '<p class="lead">The brush. Radius is the only upgrade, and the only one that matters.</p>';
      for (const t of TOOLS) {
        const have = owned(t.key);
        const lvl = have ? G.tools[t.key] : -1;
        const maxed = lvl >= t.max;
        const cost = have ? toolCost(t, lvl + 1) : t.base;
        h += `<div class="item">
          <img class="ico xl" src="${Icons.url(t.icon)}" alt="">
          <div class="txt"><b>${t.name}</b>${have ? `<span class="lv">L${lvl + 1}</span>` : ''}<span>${t.desc(Math.max(0, lvl))}</span></div>
          <div class="act">${maxed ? '<span class="tag on">full</span>' : priceBtn(have ? 'Widen' : 'Buy', cost, `data-act="tool" data-k="${t.key}"`)}</div></div>`;
      }
    } else {
      const n = G.wombats.length, cap = Grove.capacity();
      h += `<p class="lead">${n} of ${cap} in the warren. A bought wombat is a stranger; a bred one is yours.</p>`;
      h += `<div class="item">
        <img class="ico xl" src="${Icons.url('warren')}" alt="">
        <div class="txt"><b>Another wombat</b><span>Wild caught. Whatever coat and traits it happens to have.</span></div>
        <div class="act">${n >= cap ? '<span class="tag">warren full</span>' : priceBtn('', WOMBAT_COST(n), 'data-act="wombat"')}</div></div>`;
      h += `<div class="item">
        <img class="ico xl" src="${Icons.url('t_trowel')}" alt="">
        <div class="txt"><b>Dig the warren out</b><span>Room for ${WARREN_CAP((G.warren || 0) + 1)} wombats, up from ${cap}.</span></div>
        <div class="act">${priceBtn('', WARREN_COST(G.warren || 0), 'data-act="warren"')}</div></div>`;
      for (const gd of GODS.filter((x) => Ritual.awake(x.key))) {
        const got = Ritual.owned(gd.artifact.key);
        h += `<div class="item ${got ? '' : ''}">
          <img class="ico xl" src="${Icons.url('favour')}" alt="">
          <div class="txt"><b>${gd.artifact.name}</b><span>${gd.artifact.desc}</span><span class="dim">${gd.name}'s</span></div>
          <div class="act">${got ? '<span class="tag on">kept</span>'
            : `<button class="buy" data-act="relic" data-k="${gd.key}">${Icons.img('favour', 'sm')}${Ritual.relicCost(gd)}</button>`}</div></div>`;
      }
    }
    body.innerHTML = h;
    body.querySelectorAll('[data-act]').forEach((b) => b.onclick = () => shopAction(b.dataset));
  }
  function shopAction(d) {
    if (d.act === 'seed') { G.selSeed = d.k; G.selTool = 'pouch'; Audio.play('click'); refreshToolBar(); }
    else if (d.act === 'tool') {
      const t = TOOL_BY_KEY[d.k];
      const have = owned(t.key);
      const lvl = have ? G.tools[t.key] : -1;
      const cost = have ? toolCost(t, lvl + 1) : t.base;
      if (!spend(cost)) return;
      G.tools[t.key] = lvl + 1;
      if (!have) { G.selTool = t.key; toast(`<b>${t.name}</b> &mdash; ${t.desc(0)}`, 'good'); }
      refreshToolBar();
    } else if (d.act === 'wombat') {
      if (G.wombats.length >= Grove.capacity()) { toast('The warren is full.', 'bad'); return; }
      const c = WOMBAT_COST(G.wombats.length);
      if (!spend(c)) return;
      const w = Grove.addWombat();
      toast(`<b>${w.name}</b> moves in.`, 'good');
    } else if (d.act === 'warren') {
      if (!spend(WARREN_COST(G.warren || 0))) return;
      G.warren = (G.warren || 0) + 1;
      toast('The warren goes deeper. Room for ' + Grove.capacity() + '.', 'good');
    } else if (d.act === 'relic') {
      Ritual.buyRelic(GOD_BY_KEY[d.k]);
    }
    renderShop(); refreshHUD(); Main.save();
  }

  // ---- warren -------------------------------------------------------------
  function renderWarren() {
    const body = $('warren-body');
    const cap = Grove.capacity();
    let h = `<p class="lead">${G.wombats.length} of ${cap}. Pick two grown wombats to pair them. Traits pass down; a trait both parents carry almost always does.</p>`;
    h += '<div class="warren">';
    for (const w of G.wombats) {
      const fur = Sprites.furOf(w.fur);
      const age = Sprites.AGES[w.age];
      const p = Breeding.pairOf(w);
      const picked = pairPick.indexOf(w.id) >= 0;
      const traits = (w.traits || []).map((t) => {
        const d = TRAIT_BY_KEY[t];
        return d ? `<span class="trait" style="border-color:${d.color};color:${d.color}" title="${d.desc}">${d.name}</span>` : '';
      }).join('') || '<span class="trait dimtrait">no traits</span>';
      h += `<div class="wcard ${picked ? 'picked' : ''} ${p ? 'paired' : ''}" data-id="${w.id}">
        <div class="whead"><b>${w.name}</b><span class="dim">${age.name} &middot; ${fur.name}${fur.rare ? ' ★' : ''}</span></div>
        <div class="wbars">
          <span class="bar"><i style="width:${Math.round(w.hap)}%;background:${w.hap > 60 ? PAL.moss3 : w.hap > 25 ? PAL.gold : PAL.redL}"></i></span>
          <span class="dim">${w.stomach === 'digesting' ? 'digesting' : w.stomach === 'ready' ? 'about to go' : 'hungry'}</span>
        </div>
        <div class="traits">${traits}</div>
        ${w.sire ? `<div class="dim sm">out of ${w.dam} by ${w.sire}</div>` : ''}
        ${p ? `<div class="pairbar"><i style="width:${Math.round(Breeding.progress(p) * 100)}%"></i></div><div class="dim sm">paired</div>` : ''}
        <div class="wact">
          ${p ? `<button class="buy sm" data-act="unpair" data-id="${w.id}">Separate</button>`
             : `<button class="buy sm" data-act="pick" data-id="${w.id}">${picked ? 'Chosen' : 'Choose'}</button>`}
          ${Breeding.canRetire(w) ? `<button class="buy sm bone" data-act="retire" data-id="${w.id}">Into the bone</button>` : ''}
        </div></div>`;
    }
    h += '</div>';
    if (pairPick.length === 2) h += '<div class="row"><button class="big" id="btn-pair">Pair them</button></div>';
    if (G.remembered && G.remembered.length) {
      h += '<h3>Remembered</h3><p class="dim">' + G.remembered.map((r) => r.name).join(', ') + '</p>';
    }
    body.innerHTML = h;
    body.querySelectorAll('[data-act]').forEach((b) => b.onclick = () => warrenAction(b.dataset));
    const pb = $('btn-pair');
    if (pb) pb.onclick = () => {
      const a = G.wombats.find((w) => w.id === +pairPick[0]);
      const b = G.wombats.find((w) => w.id === +pairPick[1]);
      if (Breeding.pair(a, b)) pairPick = [];
      renderWarren(); Main.save();
    };
  }
  function warrenAction(d) {
    const w = G.wombats.find((x) => x.id === +d.id);
    if (!w) return;
    if (d.act === 'pick') {
      const i = pairPick.indexOf(w.id);
      if (i >= 0) pairPick.splice(i, 1);
      else { pairPick.push(w.id); if (pairPick.length > 2) pairPick.shift(); }
      Audio.play('click');
    } else if (d.act === 'unpair') {
      const p = Breeding.pairOf(w);
      if (p) Breeding.unpair(p);
      Audio.play('click');
    } else if (d.act === 'retire') {
      Breeding.retire(w);
    }
    renderWarren();
  }

  // ---- modals -------------------------------------------------------------
  function showGod(gd) {
    const m = $('modal'), c = $('modal-card');
    const on = Ritual.awake(gd.key);
    const rank = Ritual.rankMet(gd);
    const bill = Object.keys(gd.ritual).map((k) => {
      const need = gd.ritual[k], have = G.offerings[k] || 0;
      return `<span class="k">${OFFERINGS[k].name}</span><span class="v ${have >= need ? 'g' : 'r'}">${have} / ${need}</span>`;
    }).join('');
    c.innerHTML = `<h2 style="color:${gd.trim}">${rank || on ? gd.name : 'Something sleeping'}</h2>
      <p class="dim">${rank || on ? gd.title + ' &middot; ' + gd.domain : 'It has not heard enough of you yet.'}</p>
      ${rank || on ? `<p class="verse">${gd.verse}</p>` : ''}
      ${on ? `<div class="sum"><span class="k">Blessing</span><span class="v g">${gd.blessing.name}</span></div>
              <p>${gd.blessing.desc}</p>
              <div class="sum"><span class="k">Artifact</span><span class="v">${gd.artifact.name}</span></div>
              <p>${gd.artifact.desc} ${Ritual.owned(gd.artifact.key) ? '<span class="good">Kept.</span>' : `<span class="dim">${Ritual.relicCost(gd)} favour at the Market.</span>`}</p>`
        : rank ? `<div class="sum">${bill}</div>
              <p class="dim">Wakes: ${gd.blessing.name} &mdash; ${gd.blessing.desc}</p>`
        : `<div class="sum"><span class="k">Favour earned, all told</span><span class="v ${(G.favourEver || 0) >= gd.favour ? 'g' : 'r'}">${Math.floor(G.favourEver || 0)} / ${gd.favour}</span></div>`}
      <div class="row">
        ${!on && rank ? `<button class="big" id="btn-rite" ${Ritual.canSummon(gd) ? '' : 'disabled'}>Perform the rite</button>` : ''}
        <button class="wbtn" id="btn-godclose">Close</button>
      </div>`;
    m.hidden = false; G.paused = true;
    const close = () => { m.hidden = true; G.paused = false; refreshShrineHUD(); refreshHUD(); };
    $('btn-godclose').onclick = () => { close(); Audio.play('click'); };
    const rb = $('btn-rite');
    if (rb) rb.onclick = () => { if (Ritual.summon(gd)) { close(); Main.save(); } };
  }

  function showBlessings(picks, pick) {
    const m = $('modal'), c = $('modal-card');
    const cupra = !!(G.gods && G.gods.cupra);
    c.innerHTML = `<h2>${cupra ? 'A cupid offers' : 'The shrine offers'}</h2>
      <p>${Tower.R.settled} offerings standing.</p>
      <div class="perks">${picks.map((p, i) => `<div class="perk ${p.rare ? 'rare' : ''}" data-i="${i}">
        <img src="${Icons.url(p.icon)}" alt=""><span class="nm">${p.name}</span><span class="ds">${p.desc}</span></div>`).join('')}</div>`;
    m.hidden = false;
    c.querySelectorAll('.perk').forEach((el) => el.onclick = () => { m.hidden = true; Audio.play('buy'); pick(picks[+el.dataset.i]); });
  }

  function showSummary(s) {
    const m = $('modal'), c = $('modal-card');
    const bl = s.blessings.map((k) => {
      const p = CUPID_BLESSINGS.find((x) => x.key === k);
      return p ? `<img src="${Icons.url(p.icon)}" alt="" title="${p.name}" style="width:22px;height:22px;image-rendering:pixelated;vertical-align:middle">` : '';
    }).join(' ') || '&mdash;';
    c.innerHTML = `<h2 style="color:${s.cashed ? PAL.moss4 : PAL.redL}">${s.cashed ? 'Taken up' : 'It came down'}</h2>
      <p>${s.cashed ? 'A clean end. The pilgrims go home fed.' : 'The pilgrims loved it anyway.'}</p>
      <div class="sum">
        <span class="k">Tallest</span><span class="v">${s.peak.toFixed(1)}</span>
        <span class="k">Standing / offered</span><span class="v">${s.settled} / ${s.used}</span>
        <span class="k">Lost</span><span class="v">${s.lost}</span>
        <span class="k">Pilgrims</span><span class="v">${s.crowd}</span>
        <span class="k">Goal</span><span class="v ${s.goal && s.goal.done ? 'g' : ''}">${s.goal ? s.goal.def.name + (s.goal.done ? ' ✓' : ' —') : '&mdash;'}</span>
        <span class="k">Blessings</span><span class="v">${bl}</span>
        <span class="k">Bonus</span><span class="v g">${s.cashed ? '+' + U.money(s.bonus) : '&mdash;'}</span>
        <span class="k">Taken</span><span class="v g">+${U.money(s.earned)}</span>
      </div>
      <button class="big" id="btn-ok">Back to the grove</button>`;
    m.hidden = false; G.paused = true;
    $('btn-ok').onclick = () => { m.hidden = true; G.paused = false; Audio.play('click'); refreshRunCard(); refreshHUD(); Main.setMode('grove'); };
  }

  // ---- setup --------------------------------------------------------------
  function init(g) {
    G = g;
    document.querySelectorAll('img[data-ico]').forEach((el) => { el.src = Icons.url(el.dataset.ico); });
    document.querySelectorAll('.tab').forEach((b) => b.onclick = () => Main.setMode(b.dataset.mode));
    $('btn-shop').onclick = () => openShop();
    $('btn-warren').onclick = () => { pairPick = []; openPanel('panel-warren'); renderWarren(); };
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
    $('tray-tool').hidden = mode !== 'grove';
    $('tray-offer').hidden = mode !== 'tower';
    $('ov-tower').hidden = mode !== 'tower';
    $('ov-roots').hidden = mode !== 'roots';
    $('ov-shrine').hidden = mode !== 'shrine';
    refreshRunCard(); refreshOfferBar(); refreshToolBar();
    if (mode === 'roots') refreshRootHUD();
    if (mode === 'shrine') refreshShrineHUD();
  }
  function anyPanelOpen() { return !$('panel-shop').hidden || !$('panel-help').hidden || !$('panel-warren').hidden || !$('modal').hidden; }

  return {
    init, toast, refreshHUD, refreshToolBar, refreshOfferBar, refreshRootHUD, refreshShrineHUD,
    refreshRunHUD, refreshRunCard, onRunStart, onRunPlay, onRunEnd, hideRunHUD,
    showGod, showBlessings, showSummary, showTip, hideTip, positionTip,
    setMode, openShop, closePanels, anyPanelOpen, renderWarren, warrenOpen,
  };
})();
