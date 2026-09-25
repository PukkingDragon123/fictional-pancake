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
  let hotSig = '';
  function refreshHUD() {
    if (G.mode === 'intro') { $('checklist').hidden = true; return; }
    if (lastWd !== null && G.wd !== lastWd) bumpMoney();
    lastWd = G.wd;
    $('s-wd').textContent = U.fmt(G.wd);
    $('b-back').hidden = G.mode === 'grove';
    $('b-phone').classList.toggle('nophone', !owns(G, 'phone'));
    const dot = $('b-phone-dot');
    if (dot) {
      const jobs = (typeof Phone !== 'undefined') ? Phone.careList().length + Phone.gardenJobs().length + Phone.unread() : 0;
      dot.hidden = jobs === 0;
      dot.textContent = jobs > 9 ? '9+' : String(jobs);
    }
    {
      // The head-up belongs to the game, not the title screen or the intro.
      const off = G.mode === 'menu' || G.mode === 'intro';
      $('money').hidden = off;
      $('mini').hidden = off;
      $('side').hidden = off;
      $('zoomer').hidden = off || G.mode !== 'grove';
      if (off) $('checklist').hidden = true;
    }
    refreshList();
    refreshNotebook();
    const cq = Guide.current();
    const sig = [G.mode, G.tool, G.selSeed, G.selFood, G.seeds[G.selSeed], G.food[G.selFood], G.step, G.decor && G.decor.nest, Object.keys(G.owned || {}).length,
      Object.keys(G.unlocked || {}).length, Object.keys(G.newTools || {}).join(','), cq && G.lessons && G.lessons[cq.key] ? cq.tool : ''].join('|');
    if (sig !== hotSig) { hotSig = sig; renderHotbar(); }
  }

  // ---- the job card -------------------------------------------------------
  // Always in the corner of the grove: whatever Jim wants next, and once
  // he has shown you round, the daily round itself, ticked off as you go.
  function refreshList() {
    const box = $('checklist');
    if (G.mode !== 'grove') { box.hidden = true; return; }
    box.hidden = false;
    const q = Guide.current();
    let html = '';
    if (q) {
      html += `<h4>${ic(q.icon, 'sm')} <span>${q.title}</span></h4><p class="jnote">${q.note}</p>`;
      if (!G.arrived) {
        html += Grove.tasks().map((t) => {
          const p = U.clamp(t.at / t.need, 0, 1);
          return `<div class="task ${t.done ? 'done' : ''}"><span class="qmark">${ic(t.done ? 'q_done' : t.icon)}</span>
            <span class="tbody"><b class="tname">${t.name}</b><span class="bar"><i style="width:${Math.round(p * 100)}%"></i></span></span>
            <b class="tnum">${Math.max(0, Math.round(t.at))}<small>/${t.need}</small></b></div>`;
        }).join('');
      }
      html += `<div class="tfoot">job ${q.i + 1} of ${q.total}${q.reward ? ` &middot; ${ic('wdollar', 'sm')} ${q.reward}` : ''}</div>`;
    } else {
      const food = CROPS.reduce((n, c) => n + (G.food[c.key] || 0), 0);
      const growing = (World.crops || []).length;
      const hungry = G.wombats.filter((w) => w.stomach === 'empty' && w.age !== 'baby').length;
      const cubes = OFFER_ORDER.reduce((n, k) => n + (G.offerings[k] || 0) + (G.blessed[k] || 0), 0);
      const loose = Grove.drops.length;
      const row = (icon, name, sub, done) => `<div class="task ${done ? 'done' : ''}"><span class="qmark">${ic(done ? 'q_done' : icon)}</span>
        <span class="tbody"><b class="tname">${name}</b><small class="tsub">${sub}</small></span></div>`;
      html += `<h4>${ic('t_seed', 'sm')} <span>The daily round</span></h4>`;
      html += row('t_seed', 'Grow veg', growing ? `${growing} growing, ${food} picked` : 'hoe a bed and sow it', food > 0);
      html += row('t_food', 'Feed the wombats', hungry ? `${hungry} hungry` : 'everyone is full', hungry === 0);
      html += row('truck', 'Load the truck', loose ? `${loose} cubes on the ground` : 'nothing lying about', loose === 0);
      html += row('wdollar', 'Sell to Jim', cubes ? `${cubes} cubes in the truck` : 'truck is empty', cubes === 0);
    }
    box.innerHTML = html;
  }

  function refreshNotebook() { }           // Jim speaks for himself now

  // ---- the tool wheel: right-click (or Tab) and the tools ring the cursor --
  // Twenty of them is too many for one grid. They come in four bands, each
  // with its name over it, in the order you learn them.
  const WHEEL_BANDS = [
    ['HANDS', ['drag', 'food', 'destroy', 'pair', 'build']],
    ['GARDEN', ['sickle', 'hoe', 'seed', 'moss', 'water', 'fert', 'shovel']],
  ];
  const WHEEL_TOOLS = WHEEL_BANDS.reduce((a2, b2) => a2.concat(b2[1]), []);
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
        const hk = HOTKEYS.indexOf(key);
        return { icon: t.icon, rune: hk >= 0 ? String(hk + 1) : '', on: G.tool === key, locked: lk, tip: lk ? `<b>${t.name}</b><br><span class="warn">${whyLocked(key, G)}</span>` : `<b>${t.name}</b>${TIERS[key] ? `<br><span class="dim">${tierOf(G, key).name}</span>` : ''}<br>${t.desc}${t.cost ? `<br>${Icons.img('wdollar', 'sm')} ${U.fmt(t.cost)} each` : ''}`,
          act: () => {
            if (lk) { Audio.play('error'); toast(whyLocked(key, G), 'bad'); return; }
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
    const cols0 = wheelRing === 'tools' ? 6 : 4;
    const spoke = (it) => {
      const el = document.createElement('button');
      el.className = 'spoke' + (it.on ? ' on' : '') + (it.locked ? ' locked' : '') + (it.out ? ' out' : '') + (it.magic ? ' magic' : '');
      el.innerHTML = `${ic(it.icon)}${it.rune ? `<span class="rn">${it.rune}</span>` : ''}` +
        `${it.n != null ? `<span class="n">${it.n}</span>` : ''}${it.locked ? `<span class="lk">${ic('lock', 'sm')}</span>` : ''}`;
      el.onclick = (e) => { e.stopPropagation(); it.act(); };
      el.onmouseenter = (e) => showTip(e, it.tip);
      el.onmouseleave = hideTip;
      return el;
    };
    let grid = null;
    if (wheelRing === 'tools') {
      // one band at a time, each with its name cut over it
      let i0 = 0;
      for (const [label, keys] of WHEEL_BANDS) {
        const lab = document.createElement('div');
        lab.className = 'trayband';
        lab.textContent = label;
        tray.appendChild(lab);
        const gr = document.createElement('div');
        gr.className = 'traygrid';
        gr.style.gridTemplateColumns = `repeat(${cols0}, 50px)`;
        for (let n = 0; n < keys.length; n++) gr.appendChild(spoke(items[i0 + n]));
        i0 += keys.length;
        tray.appendChild(gr);
        grid = gr;
      }
    } else {
      grid = document.createElement('div');
      grid.className = 'traygrid';
      items.forEach((it) => grid.appendChild(spoke(it)));
      tray.appendChild(grid);
    }
    w.appendChild(tray);
    // keep the whole tray on screen, opening down-right of the cursor by default
    const fw = $('frame').clientWidth, fh = $('frame').clientHeight;
    const cols = cols0;
    const cw = wheelRing === 'tools' ? 50 : 58;
    if (wheelRing !== 'tools') grid.style.gridTemplateColumns = `repeat(${cols}, ${cw}px)`;
    const tw = cols * cw + (cols - 1) * 7 + 22 + 8, th = tray.offsetHeight || 240;
    let px = wheelAt.x * k + 14, py = wheelAt.y * k + 14;
    if (px + tw > fw - 8) px = wheelAt.x * k - tw - 14;
    if (py + th > fh - 8) py = Math.max(8, fh - th - 8);
    w.style.left = Math.max(8, Math.round(px)) + 'px';
    w.style.top = Math.max(8, Math.round(py)) + 'px';
  }
  // the badge in the corner shows the tool in hand and opens the wheel for touch
  function refreshTray() {
    $('b-tool').hidden = true;
    renderHotbar();
    if (wheelOpen()) renderWheel();
  }
  // ---- the hotbar -----------------------------------------------------------
  // A row of gold-cornered slots along the bottom, one per tool, numbered for
  // the keys. Click one to hold it; click the seeds or the feed bowl again to
  // choose what is in it.
  // one line under the name of the tool in your hand, so you never have to
  // wonder what the buttons do
  const TOOL_HINT = {
    drag: 'click to pick up, pet or harvest',
    sickle: 'sweep over weeds',
    destroy: 'click junk and the ants take it',
    moss: 'brush on bare ground',
    water: 'water beds &middot; pour into a hole for a pond',
    hoe: 'brush a bed into the ground',
    seed: 'click a bed to sow &middot; click again to choose',
    food: 'click to put a bowl down',
    fert: 'click a planted bed &middot; uses one cube',
    shovel: 'hold to dig &middot; right-click to heap up',
    build: 'click to place &middot; click it again to pick up',
  };
  function renderHotbar() {
    const bar = $('hotbar');
    if (!bar) return;
    bar.hidden = G.mode !== 'grove';
    if (bar.hidden) return;
    const pick = G.tool === 'seed' ? G.selSeed : G.tool === 'food' ? G.selFood : null;
    const cur = TOOL_BY_KEY[G.tool];
    const slots = HOTKEYS.map((key, i) => {
      const t = TOOL_BY_KEY[key], lk = !unlocked(G, key), on = G.tool === key;
      let extra = '';
      if (key === 'seed' && G.selSeed) extra = `<span class="hs">${ic(CROP_BY_KEY[G.selSeed] ? CROP_BY_KEY[G.selSeed].icon : 't_seed', 'sm')}<b>${G.seeds[G.selSeed] || 0}</b></span>`;
      if (key === 'food' && G.selFood) extra = `<span class="hs">${ic(CROP_BY_KEY[G.selFood] ? CROP_BY_KEY[G.selFood].icon : 't_food', 'sm')}<b>${G.food[G.selFood] || 0}</b></span>`;
      // a tool you have not bought yet shows what it costs, so the bar is also the shopping list
      const shopDef = TOOL_SHOP_BY_KEY[key];
      const tag = lk ? (shopDef && taught(G, key) ? `<span class="pt">W$${shopDef.price}</span>` : `<span class="lk">${ic('lock', 'sm')}</span>`) : '';
      const cur2 = Guide.current();
      const want = !lk && cur2 && cur2.tool === key && G.lessons && G.lessons[cur2.key] && G.tool !== key;
      const fresh = !lk && G.newTools && G.newTools[key];
      return `<button class="hslot${on ? ' on' : ''}${lk ? ' locked' : ''}${lk && !taught(G, key) ? ' sealed' : ''}${want ? ' want' : ''}${fresh ? ' new' : ''}" data-k="${key}"><i class="hn">${i < 10 ? '1234567890'[i] : ''}</i>${ic(t.icon)}${extra}${tag}</button>`;
    }).join('');
    const hint = cur ? (TOOL_HINT[cur.key] || '') : '';
    bar.innerHTML = `<div class="hbname">${cur ? `<b>${cur.name}</b>${hint ? `<small>${hint}</small>` : ''}` : ''}</div><div class="hbrow">${slots}</div>`;
    void pick;
    bar.querySelectorAll('.hslot').forEach((el) => {
      const key = el.dataset.k, t = TOOL_BY_KEY[key], lk = !unlocked(G, key);
      el.onclick = (e) => {
        e.stopPropagation();
        if (lk) { Audio.play('error'); toast(whyLocked(key, G), 'bad'); return; }
        const r = el.getBoundingClientRect(), fr = $('frame').getBoundingClientRect(), k = frameScale();
        const sx = (r.left - fr.left) / k, sy = (r.top - fr.top) / k - 150;
        if ((key === 'seed' || key === 'food') && (G.tool === key || !(key === 'seed' ? G.selSeed : G.selFood))) {
          G.tool = key; openWheel(sx, sy, key === 'seed' ? 'seed' : 'food'); renderHotbar(); return;
        }
        G.tool = key; if (G.newTools) delete G.newTools[key]; Grove.clearPair(); Audio.play('click'); closeWheel(); renderHotbar();
      };
      el.onmouseenter = (e) => showTip(e, `<b>${t.name}</b> <span class="dim">${HOTKEYS.indexOf(key) < 10 ? '[' + '1234567890'[HOTKEYS.indexOf(key)] + ']' : ''}</span><br>${lk ? `<span class="warn">${whyLocked(key, G)}</span>` : t.desc}`);
      el.onmouseleave = hideTip;
    });
  }
  // The frame everything wears: a soft rounded card with one slate line round
  // it, a white lit edge along the top and a little lip underneath, so it sits
  // on the picture like a paper tag. Painted once into a small canvas and
  // handed to CSS as a nine-slice border image.
  //   base    white chips on the HUD        paper  cream cards and panels
  //   hot     base, with a mint ring        sel    base, with a sunny ring
  //   slot    a pale mint well on the bar   slotsel the well for the tool in hand
  function goldFrameURL(kind) {
    const P2 = 2, N = 15, R0 = 4;                // 15 art pixels a side, rounded by 4
    const c = document.createElement('canvas'); c.width = c.height = N * P2;
    const g = c.getContext('2d');
    const K = {
      base:    { line: '#2c4048', ring: null, ring2: null, fill: '#ffffff', top: '#ffffff', lip: '#d6e4de', lip2: '#b8ccc4' },
      paper:   { line: '#2c4048', ring: null, ring2: null, fill: '#fffaf0', top: '#ffffff', lip: '#efe4cc', lip2: '#d9cbae' },
      hot:     { line: '#2c4048', ring: '#7fd1a8', ring2: '#bff0d8', fill: '#ffffff', top: '#ffffff', lip: '#d6e4de', lip2: '#b8ccc4' },
      sel:     { line: '#2c4048', ring: '#ffc23a', ring2: '#ffe38a', fill: '#fff9e0', top: '#ffffff', lip: '#f4e2a8', lip2: '#e2c46c' },
      slot:    { line: '#9fbdb1', ring: null, ring2: null, fill: '#eef8f2', top: '#d4e9dd', lip: '#f8fdfa', lip2: '#f8fdfa', inset: true },
      slotsel: { line: '#c7861a', ring: '#ffc23a', ring2: '#ffe38a', fill: '#fff4c8', top: '#fff9e0', lip: '#ffe9a0', lip2: '#f5d470' },
    }[kind] || null;
    const k = K || { line: '#2c4048', fill: '#fffaf0', top: '#fff', lip: '#efe4cc', lip2: '#d9cbae' };
    // inside a rounded square of side n starting at o, radius r?
    const inside = (x, y, o, n, r) => {
      const x0 = o, y0 = o, x1 = o + n - 1, y1 = o + n - 1;
      if (x < x0 || y < y0 || x > x1 || y > y1) return false;
      const cx = x < x0 + r ? x0 + r : x > x1 - r ? x1 - r : x;
      const cy = y < y0 + r ? y0 + r : y > y1 - r ? y1 - r : y;
      return (x - cx) * (x - cx) + (y - cy) * (y - cy) <= r * r + r * 0.6;
    };
    const px = (x, y, col) => { g.fillStyle = col; g.fillRect(x * P2, y * P2, P2, P2); };
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      if (!inside(x, y, 0, N, R0)) continue;
      let col = k.line;
      if (inside(x, y, 1, N - 2, R0 - 1)) {
        col = k.fill;
        if (k.ring && !inside(x, y, 2, N - 4, R0 - 1)) col = y < 4 ? k.ring2 : k.ring;
        else if (k.inset) { if (y <= 2) col = k.top; }
        else {
          if (y === (k.ring ? 2 : 1) || (y === 2 && !k.ring)) col = y === 1 || k.ring ? k.top : col;
          if (y >= N - 3) col = y === N - 2 ? k.lip2 : k.lip;              // the lip it stands on
        }
      }
      px(x, y, col);
    }
    return c.toDataURL();
  }
  function pickTool() { }

  // ---- "you got a new tool" -------------------------------------------------
  // A card that drops into the middle of the picture when Jim hands you
  // something or the mart starts stocking it. They queue, one at a time.
  const unlockQ = [];
  function unlockCard(key, gift) { unlockQ.push({ key, gift }); if (unlockQ.length === 1) showUnlock(); }
  const unlockIdle = () => unlockQ.length === 0;
  function showUnlock() {
    const u = unlockQ[0], el = $('unlock');
    if (!u || !el) return;
    const t = TOOL_BY_KEY[u.key], sd = TOOL_SHOP_BY_KEY[u.key], phone = u.key === 'phone';
    const name = phone ? 'A Phone' : (sd && sd.name) || (t ? t.name : u.key);
    const icon = phone ? 'ph_key' : t ? t.icon : 'lock';
    const price = phone ? PHONE_PRICE : sd ? sd.price : 0;
    const what = phone ? 'Jobs, your herd, texts, and an App Store.' : t ? t.desc : '';
    el.innerHTML = `<div class="ucard ${u.gift ? 'gift' : ''}">
      <div class="uhead">${u.gift ? 'YOU GOT' : 'NEW AT WOMBAT MART'}</div>
      <div class="upic">${ic(icon, 'xl')}</div>
      <b class="uname">${name}</b>
      <p class="utext">${what}</p>
      <p class="uhow">${u.gift ? `It is on your toolbar. Press <b>${Math.max(1, HOTKEYS.indexOf(u.key) + 1)}</b> to pick it.` : `Drive to the mart and buy it for ${ic('wdollar', 'sm')} <b>W$${price}</b>.`}</p>
      <button class="act go" id="u-ok">GOT IT</button></div>`;
    el.hidden = false;
    Audio.play(u.gift ? 'levelup' : 'perk');
    $('u-ok').onclick = (e) => {
      e.stopPropagation();
      el.hidden = true; unlockQ.shift(); Audio.play('click');
      if (unlockQ.length) setTimeout(showUnlock, 160);
      refreshHUD();
    };
  }

  // ---- shrine -------------------------------------------------------------
  // The shrine has no interface. Everything it has to say is cut into the
  // walls of the shaft, so there is nothing here to refresh.
  function refreshRitual() { }
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
      el.onmouseenter = (e) => showTip(e, `<b>${def.name}</b><br>${poopPrice(def.key, 1)} W$ from Jim${bl ? '<br><b>blessed</b>' : ''}`);
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

  // Jim buys the cubes off you at his shed.
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
    if ($('modal').hidden) G.paused = false;
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

  // Jim buys every cube they leave for his compost heap, and pays more
  // for a load than for one. The mart counter buys them at the same rate.
  let pawnMode = 'shop';
  function openPawn(mode) { pawnMode = mode || 'shop'; openPanel('panel-pawn'); }
  function renderPawn() {
    const fern = pawnMode === 'cult';
    const head = $('panel-pawn').querySelector('.ptitle');
    if (head) head.textContent = fern ? 'JIM BUYS' : 'SELL';
    let h = `<p class="pnote">${fern ? 'Every cube goes on his compost heap, whatever kind. The more you bring at once, the better the rate.' : 'The counter buys cubes for the garden centre.'}</p><div class="grid">`;
    let any = false;
    for (const k of OFFER_ORDER) {
      const def = OFFERINGS[k];
      const n = (G.offerings[k] || 0) + (G.blessed[k] || 0);
      if (!n && !fern) continue;
      const each = poopPrice(k, 1);
      const lot = poopPrice(k, n) * n;
      any = any || n > 0;
      h += `<div class="item ${n ? 'have' : ''}"><div class="pic">${ic(def.icon, 'xl')}</div>
        <h3>${def.name} <span class="lv">${n}</span></h3><p>${each} each${n > 1 ? ` &middot; ${poopPrice(k, n)} for a load` : ''}</p>
        <div class="act2">${n ? price(each, `data-s="off" data-k="${k}" data-n="1"`) + (n > 1 ? price(lot, `data-s="off" data-k="${k}" data-n="${n}"`, 'all') : '') : '<button class="buy" disabled>&mdash;</button>'}</div></div>`;
    }
    if (!any) h += `<div class="item"><div class="pic">${ic('o_plain', 'xl')}</div><h3>Nothing in the truck</h3><p>Feed a wombat, wait, and drag what she leaves into the back of the truck.</p></div>`;
    $('pawn-body').innerHTML = h + '</div>';
    $('pawn-body').querySelectorAll('button.buy').forEach((b) => { if (!b.disabled) b.onclick = () => pawnAct(b.dataset); });
  }
  function price(cost, attrs, label) { return `<button class="buy" ${attrs}>${ic('wdollar', 'sm')}${label ? label + ' ' : ''}${U.fmt(cost)}</button>`; }
  function pawnAct(d) {
    const n = +d.n;
    let sold = 0;
    for (let i = 0; i < n; i++) {
      if ((G.offerings[d.k] || 0) > 0) G.offerings[d.k]--;
      else if ((G.blessed[d.k] || 0) > 0) G.blessed[d.k]--;
      else break;
      sold++;
    }
    const each = poopPrice(d.k, sold);
    G.wd += each * sold;
    G.stats.sold = (G.stats.sold || 0) + sold;
    FX.coinBurst(320, 200, 6);
    if (pawnMode === 'cult') {
      Guide.paid(each * sold);
      if (sold >= 5) setTimeout(() => Phone.push('cultist', `${sold} in one go! the pumpkins r gonna be massive this year`), 3000);
    }
    Audio.play('sell');
    renderPawn(); refreshHUD(); Main.save();
  }

  // ---- modals -------------------------------------------------------------
  function hideAll() {
    closeWheel(); $('checklist').hidden = true; $('b-tool').hidden = true;
    $('ov-shop').hidden = true; $('ov-nursery').hidden = true;
    $('b-back').hidden = true;
  }
  function refreshAll() { refreshHUD(); refreshTray(); }

  // ---- setup --------------------------------------------------------------
  function init(g) {
    G = g;
    Tex.install();                         // wood, paper, metal and gold, painted not faked
    for (const k of ['base', 'hot', 'sel', 'paper', 'slot', 'slotsel']) document.documentElement.style.setProperty('--gf-' + k, `url(${goldFrameURL(k)})`);
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
    if ($('hotbar')) $('hotbar').hidden = mode !== 'grove';
    $('ov-shop').hidden = mode !== 'shop';
    $('ov-nursery').hidden = mode !== 'nursery';
    closeWheel();
    refreshTray(); refreshHUD();
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
    onRunStart, onRunPlay, onRunEnd, hideRunHUD, hideAll, pingPurse,
    showTip, hideTip, place, setMode, openPanel, openPawn, closePanels, anyPanel, refreshZoom, openWombat, unlockCard, unlockIdle,
  };
})();
