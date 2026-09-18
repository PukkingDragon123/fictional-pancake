// ---- The phone ---------------------------------------------------------------
// Everything you would otherwise have to remember lives in here: what the
// hooded one has asked for, how each wombat is doing, what is in the beds, what
// the sky is doing, where you can drive and what is in the purse. It opens over
// whatever scene you are in and pauses the world while it is up, because that
// is what a phone does to a person.
const Phone = (() => {
  let G = null;
  let app = 'home';
  let raf = 0, t = 0;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

  // ---- the apps -------------------------------------------------------------
  const APPS = [
    { key: 'quests', name: 'Jobs', icon: 't_sickle', tint: '#d8a52f' },
    { key: 'herd', name: 'Herd', icon: 'wombat', tint: '#c98a6c' },
    { key: 'map', name: 'Places', icon: 'map', tint: '#57b6c9' },
    { key: 'garden', name: 'Garden', icon: 'c_broadleaf', tint: '#84bb59' },
    { key: 'sky', name: 'Sky', icon: 't_water', tint: '#9fd8e6' },
    { key: 'purse', name: 'Purse', icon: 'wdollar', tint: '#f5cd5c' },
  ];
  const TITLE = Object.fromEntries(APPS.map((a) => [a.key, a.name]));

  function init(g) { G = g; }

  // ---- opening and closing --------------------------------------------------
  function open(which) {
    if (!G) return;
    UI.closePanels();
    app = which || 'home';
    $('panel-phone').hidden = false;
    G.paused = true;
    Audio.play('click');
    render();
    if (!raf) raf = requestAnimationFrame(tick);
  }
  function close() {
    if ($('panel-phone').hidden) return;
    $('panel-phone').hidden = true;
    G.paused = false;
    cancelAnimationFrame(raf); raf = 0;
    Audio.play('click');
    UI.refreshAll();
  }
  const isOpen = () => !$('panel-phone').hidden;
  function toggle() { if (isOpen()) close(); else open('home'); }
  function tick(ms) {
    if (!isOpen()) { raf = 0; return; }
    raf = requestAnimationFrame(tick);
    t = ms / 1000;
    const c = $('ph-clock');
    if (c) c.textContent = Sky.clockText();
    const w = $('ph-wx');
    if (w) w.textContent = Sky.def().name;
  }

  // ---- little pieces everyone uses ------------------------------------------
  const bar = (v, max, col) => `<div class="phbar"><i style="width:${Math.round(U.clamp(v / max, 0, 1) * 100)}%;background:${col}"></i></div>`;
  const row = (inner, cls = '') => `<div class="phrow ${cls}">${inner}</div>`;
  const ic = (n, cls = '') => Icons.img(n, cls);

  // ---- the home screen ------------------------------------------------------
  function home() {
    const q = Guide.current();
    const needs = careList();
    const badge = { quests: q ? 1 : 0, herd: needs.length, garden: gardenJobs().length, map: 0, sky: 0, purse: 0 };
    return `<div class="phpage">
      <div class="phhead">
        <b>${Sky.partOfDay().toUpperCase()}</b>
        <span>${esc(Sky.def().blurb)}</span>
      </div>
      <div class="phgrid">${APPS.map((a) => `
        <button class="phapp" data-app="${a.key}" style="--tint:${a.tint}">
          ${ic(a.icon)}<b>${a.name}</b>
          ${badge[a.key] ? `<i class="phdot">${badge[a.key]}</i>` : ''}
        </button>`).join('')}</div>
      <div class="phnote">${q ? `<b>NOW:</b> ${esc(q.title)}` : '<b>NOW:</b> whatever you like'}</div>
    </div>`;
  }

  // ---- jobs -----------------------------------------------------------------
  function quests() {
    const q = Guide.current();
    const where = q ? (q.where || 'in the grove') : '';
    const list = G.mode === 'grove' && !G.arrived ? Grove.tasks() : [];
    let html = '';
    if (q) {
      html += `<div class="phcard big">
        <div class="phcardh">${ic(q.icon)}<b>${esc(q.title)}</b></div>
        <p>${esc(q.note)}</p>
        <div class="phmeta"><span>${ic('map', 'sm')} ${esc(where)}</span><span>${ic('wdollar', 'sm')} ${q.reward || 0} on the nail</span></div>
      </div>`;
    } else {
      html += `<div class="phcard big"><div class="phcardh">${ic('eye')}<b>Nothing owing</b></div>
        <p>The hooded one has run out of orders. What happens next is up to you: more land, more wombats, more gods.</p></div>`;
    }
    if (list.length) {
      html += `<div class="phsub">CLEAN-UP</div>` + list.map((ts) => row(
        `${ic(ts.icon)}<b>${esc(ts.name || ts.key)}</b><span class="phnum">${Math.round(ts.at)}/${ts.need}</span>`,
        ts.done ? 'done' : '') + bar(ts.at, ts.need, ts.done ? '#84bb59' : '#d8a52f')).join('');
    }
    const jobs = gardenJobs().concat(careList());
    if (jobs.length) {
      html += `<div class="phsub">STANDING JOBS</div>` + jobs.map((j) => row(`${ic(j.icon)}<b>${esc(j.what)}</b><span class="phdim">${esc(j.where)}</span>`)).join('');
    }
    return html;
  }

  // ---- the herd -------------------------------------------------------------
  function herd() {
    if (!G.wombats.length) return `<div class="phcard big"><div class="phcardh">${ic('wombat')}<b>Nobody yet</b></div><p>Clean the grove and one will come. After that the mart has a cage of them.</p></div>`;
    return G.wombats.map((w, i) => {
      const fur = Sprites.furOf(w.pelt);
      const age = Sprites.AGE[w.age].name;
      const care = careOf(w);
      return `<div class="phcard wom" data-wom="${w.id}">
        <div class="phcardh">${ic('wombat')}<b>${esc(w.name)}</b><span class="phdim">${esc(fur.name)} ${esc(age)}</span></div>
        <div class="phstat"><span>happy</span>${bar(w.hap, 100, w.hap > 60 ? '#84bb59' : w.hap > 30 ? '#d8a52f' : '#b8412c')}</div>
        <div class="phstat"><span>fed</span>${bar(w.stomach === 'empty' ? 6 : 100, 100, '#e0763a')}</div>
        <div class="phstat"><span>water</span>${bar(100 - (w.thirst || 0), 100, '#57b6c9')}</div>
        <div class="phstat"><span>play</span>${bar(100 - (w.bored || 0), 100, '#b98ef0')}</div>
        ${care.length ? `<div class="phwant">${care.map((c) => `<em>${esc(c)}</em>`).join('')}</div>` : '<div class="phok">wants for nothing</div>'}
        <div class="phacts"><button class="phbtn" data-find="${w.id}">FIND HER</button><button class="phbtn" data-papers="${w.id}">PAPERS</button></div>
      </div>`;
    }).join('');
  }
  // what one animal is short of right now
  function careOf(w) {
    const out = [];
    if (w.stomach === 'empty' && w.age !== 'baby') out.push('hungry');
    if ((w.thirst || 0) > 60) out.push('thirsty');
    if ((w.bored || 0) > 60) out.push('bored');
    if (w.hap < 30) out.push('miserable');
    if (w.gest > 0) out.push('expecting');
    return out;
  }
  function careList() {
    const out = [];
    for (const w of G.wombats) {
      for (const c of careOf(w)) {
        if (c === 'expecting') continue;
        out.push({ icon: c === 'thirsty' ? 't_water' : c === 'bored' ? 'heart' : 't_food', what: `${w.name} is ${c}`, where: c === 'thirsty' ? 'dig a pond or fill the trough' : c === 'bored' ? 'put a toy out, or go and pet her' : 'put a bowl down' });
      }
    }
    return out;
  }

  // ---- the garden -----------------------------------------------------------
  function gardenJobs() {
    const out = [];
    if (typeof World === 'undefined' || !World.crops) return out;
    for (const c of World.crops) {
      const def = CROP_BY_KEY[c.k];
      if (!def) continue;
      if (World.kindOf(c) === 'tree') {
        if (c.wild > 1) out.push({ icon: 't_sickle', what: `${def.name} wants pruning`, where: 'in the beds' });
        else if (c.fr > 0) out.push({ icon: 't_food', what: `${def.name} has ${c.fr} fruit on it`, where: 'pick it with the hand' });
        else if (c.thirst > 50) out.push({ icon: 't_water', what: `${def.name} is dry`, where: 'in the beds' });
      } else if (World.ripe(c)) out.push({ icon: 't_food', what: `${def.name} is ready`, where: 'pick it with the hand' });
      else if (def.kind === 'magic' && c.stall > 3) out.push({ icon: 'c_runeberry', what: `${def.name} is sulking`, where: MAGIC_NEED[def.need] || 'it wants something' });
      else if (c.thirst > 26) out.push({ icon: 't_water', what: `${def.name} is thirsty`, where: 'in the beds' });
    }
    return out.slice(0, 12);
  }
  function garden() {
    const beds = World.crops || [];
    const by = { crop: 0, tree: 0, magic: 0 };
    for (const c of beds) by[World.kindOf(c)]++;
    const jobs = gardenJobs();
    let html = `<div class="phcard big"><div class="phcardh">${ic('c_broadleaf')}<b>${beds.length} in the ground</b></div>
      <div class="phmeta"><span>${by.crop} crops</span><span>${by.tree} trees</span><span>${by.magic} magical</span></div></div>`;
    if (jobs.length) html += `<div class="phsub">WANTS DOING</div>` + jobs.map((j) => row(`${ic(j.icon)}<b>${esc(j.what)}</b><span class="phdim">${esc(j.where)}</span>`)).join('');
    const seeds = CROPS.filter((c) => (G.seeds[c.key] || 0) > 0);
    if (seeds.length) {
      html += `<div class="phsub">IN THE SEED TIN</div>` + seeds.map((c) => row(
        `${ic(c.icon)}<b>${esc(c.name)}</b><span class="phnum">${G.seeds[c.key]}</span><span class="phdim">${esc(c.kind === 'tree' ? `${c.grow}s to establish` : c.kind === 'magic' ? MAGIC_NEED[c.need] : `${c.grow}s`)}</span>`)).join('');
    }
    const growing = CROPS.filter((c) => beds.some((b) => b.k === c.key));
    if (growing.length) {
      html += `<div class="phsub">WHAT IS IN THE BEDS</div>` + growing.map((c) => {
        const mine = beds.filter((b) => b.k === c.key);
        const ready = mine.filter((b) => World.ripe(b)).length;
        return row(`${ic(c.icon)}<b>${esc(c.name)}</b><span class="phnum">${mine.length}</span><span class="phdim">${ready ? `${ready} ready` : esc(PLANT_KINDS[c.kind].blurb)}</span>`);
      }).join('');
    }
    return html;
  }

  // ---- places ---------------------------------------------------------------
  const SITE_BLURB = {
    grove: 'Your land. The wombats, the beds and the truck.',
    mart: 'Shaz on the till. Hardware, furniture, drinks, a gumball machine and a cage of wombats.',
    nursery: 'Groot. Seed of all three kinds, garden tools, a trough and a nest.',
    ritual: 'Stack an offering and call one of the ten down.',
    stack: 'Pile the cubes. The crowd tips for as long as it stands.',
    quarry: 'Shut. Something is still down there.',
    lake: 'Still water, a long way north.',
    deep: 'Nobody goes in. Nobody comes out saying much.',
  };
  function places() {
    const here = Atlas.whereAmI();
    return SITES.map((s) => {
      const open = Atlas.siteOpen(s);
      const km = Atlas.kmBetween(here, s);
      const now = s.mode === G.mode || (s.key === 'grove' && G.mode === 'grove');
      const why = !open ? (s.gate && !s.gate(G) ? s.why : `${s.need} gods must answer first`) : '';
      return `<div class="phcard site ${open ? '' : 'shut'}">
        <div class="phcardh">${ic(s.icon)}<b>${esc(open ? s.name : '???')}</b><span class="phdim">${now ? 'you are here' : km + ' km'}</span></div>
        <p>${esc(open ? (SITE_BLURB[s.key] || '') : why)}</p>
        ${open && s.mode && !now ? `<div class="phacts"><button class="phbtn go" data-go="${s.key}">DRIVE OVER</button></div>` : ''}
      </div>`;
    }).join('');
  }

  // ---- the sky --------------------------------------------------------------
  function sky() {
    const d = Sky.def();
    const light = Math.round(Sky.light() * 100);
    return `<div class="phcard big">
        <div class="phcardh">${ic(d.icon)}<b>${esc(d.name)}</b><span class="phdim">${Sky.clockText()}</span></div>
        <p>${esc(d.blurb)}</p>
        <div class="phstat"><span>daylight</span>${bar(light, 100, '#f5cd5c')}</div>
        <div class="phstat"><span>cloud</span>${bar(Sky.cover() * 100, 100, '#8b849c')}</div>
        <div class="phstat"><span>rain</span>${bar(Sky.wet() * 100, 100, '#57b6c9')}</div>
      </div>
      <div class="phsub">WHAT IT MEANS</div>
      ${row(`${ic('t_water')}<b>Rain waters the beds</b><span class="phdim">for nothing</span>`)}
      ${row(`${ic('c_runeberry')}<b>Some seed only grows at night</b><span class="phdim">moonbell, runeberry</span>`)}
      ${row(`${ic('c_emberleaf')}<b>Some seed hates the wet</b><span class="phdim">emberleaf</span>`)}
      <div class="phsub">THE DAY</div>
      ${row(`<b>${esc(Sky.partOfDay())}</b><span class="phdim">a full day is twelve minutes</span>`)}`;
  }

  // ---- the purse ------------------------------------------------------------
  function purse() {
    const offs = OFFER_ORDER.filter((k) => (G.offerings[k] || 0) + (G.blessed[k] || 0) > 0);
    const food = CROPS.filter((c) => (G.food[c.key] || 0) > 0);
    let html = `<div class="phcard big"><div class="phcardh">${ic('wdollar')}<b>${U.fmt(G.wd)} W$</b></div>
      <div class="phmeta"><span>earned ${U.fmt(Math.round(G.stats.earned || 0))}</span><span>${G.wombats.length} in the herd</span></div></div>`;
    if (offs.length) {
      html += `<div class="phsub">IN THE TRUCK</div>` + offs.map((k) => row(
        `${ic(OFFERINGS[k].icon)}<b>${esc(OFFERINGS[k].name)}</b><span class="phnum">${(G.offerings[k] || 0) + (G.blessed[k] || 0)}</span><span class="phdim">the hooded one buys these</span>`)).join('');
    }
    if (food.length) {
      html += `<div class="phsub">IN THE LARDER</div>` + food.map((c) => row(
        `${ic(c.icon)}<b>${esc(c.name)}</b><span class="phnum">${G.food[c.key]}</span><span class="phdim">+${c.hap} happy</span>`)).join('');
    }
    if (!offs.length && !food.length) html += `<div class="phsub">EMPTY</div>${row('<b>Nothing in the back and nothing in the larder.</b>')}`;
    return html;
  }

  // ---- drawing --------------------------------------------------------------
  const BODY = { home, quests, herd, map: places, garden, sky, purse };
  function render() {
    const scr = $('ph-screen');
    if (!scr) return;
    $('ph-title').textContent = app === 'home' ? 'WOMBAT OS' : TITLE[app].toUpperCase();
    $('ph-back').hidden = app === 'home';
    scr.className = 'phscreen app-' + app;
    scr.innerHTML = (BODY[app] || home)();
    scr.scrollTop = 0;
    wire(scr);
  }
  function wire(scr) {
    scr.querySelectorAll('[data-app]').forEach((b) => b.onclick = () => { app = b.dataset.app; Audio.play('click'); render(); });
    scr.querySelectorAll('[data-go]').forEach((b) => b.onclick = () => {
      const s = SITES.find((x) => x.key === b.dataset.go);
      close();
      if (G.mode !== 'map') { Main.setMode('map'); setTimeout(() => Atlas.go(s), 260); }
      else Atlas.go(s);
    });
    scr.querySelectorAll('[data-find]').forEach((b) => b.onclick = () => {
      const w = G.wombats.find((x) => x.id === b.dataset.find);
      if (!w) return;
      close();
      if (G.mode !== 'grove') { Main.setMode('grove'); }
      setTimeout(() => { Grove.panTo(w.x); FX.comic(w.x, w.y - 40, 'HERE!', { ink: '#d8f0a0', edge: '#5d9440', life: 0.9 }); }, 200);
    });
    scr.querySelectorAll('[data-papers]').forEach((b) => b.onclick = () => {
      const w = G.wombats.find((x) => x.id === b.dataset.papers);
      if (w) { close(); UI.openWombat(w); }
    });
  }
  function key(e) {
    if (!isOpen()) return false;
    if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') { if (app === 'home') close(); else { app = 'home'; render(); } return true; }
    const n = parseInt(e.key, 10) - 1;
    if (app === 'home' && n >= 0 && n < APPS.length) { app = APPS[n].key; Audio.play('click'); render(); return true; }
    return false;
  }

  return { init, open, close, toggle, isOpen, render, key, gardenJobs, careOf, careList, APPS };
})();
