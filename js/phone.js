// ---- The phone ---------------------------------------------------------------
// Everything you would otherwise have to remember lives in here: what the
// Jim has asked for, how each wombat is doing, what is in the beds,
// what is in the truck and where you can drive. It opens over
// whatever scene you are in and pauses the world while it is up, because that
// is what a phone does to a person.
const Phone = (() => {
  let G = null;
  let app = 'home';
  let raf = 0, t = 0;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

  // ---- the apps -------------------------------------------------------------
  // Every app on the home screen, in the order they sit on it. `tint` is the
  // icon's own colour, the way every phone gives an app one.
  // The phone comes with four apps. The rest you get from the App Store,
  // for a few W$ each, once you have the money to spare.
  const APPS_ALL = [
    { key: 'quests', name: 'Jobs', icon: 'ph_jobs', tint: ['#ffb04a', '#f07a1c'], blurb: 'What Jim wants doing next, and the standing jobs.' },
    { key: 'store', name: 'App Store', icon: 'ph_key', tint: ['#4fb6ff', '#1a6cf0'], blurb: 'Get more apps.' },
    { key: 'herd', name: 'Herd', icon: 'ph_herd', tint: ['#d8a070', '#a06238'], blurb: 'How every wombat is doing, and where she is.' },
    { key: 'garden', name: 'Garden', icon: 'ph_garden', tint: ['#8ee06a', '#34a83a'], blurb: 'Every bed: what wants water, what is ready.' },
    { key: 'larder', name: 'Larder', icon: 'ph_larder', tint: ['#ffe07a', '#f0b020'], blurb: 'What is in the truck and the feed bin.' },
    { key: 'camera', name: 'Camera', icon: 'ph_camera', tint: ['#c8ccd4', '#7c828e'], blurb: 'Take a picture of the plot. Keep the roll.' },
    { key: 'map', name: 'Places', icon: 'ph_places', tint: ['#7fd4ff', '#2a8ae0'], blurb: 'Drive anywhere in the district from here.' },
    { key: 'settings', name: 'Settings', icon: 'ph_settings', tint: ['#b8bcc6', '#6e7480'], blurb: 'Sound, display, and starting over.' },
    { key: 'messages', name: 'Messages', icon: 'ph_msg', tint: ['#7ef08a', '#22b83a'], blurb: 'Texts from the neighbours.' },
  ];
  const installed = (k) => k === 'store' || !!(G && G.apps && G.apps[k]);
  const DOCK_KEYS = ['messages', 'map', 'quests', 'store'];
  let APPS = [];                                   // what is on the home screen right now
  const ALL = APPS_ALL;
  const APP_BY_KEY = Object.fromEntries(ALL.map((a) => [a.key, a]));
  const TITLE = Object.fromEntries(ALL.map((a) => [a.key, a.name]));

  function init(g) { G = g; }

  // ---- opening and closing --------------------------------------------------
  // ---- the lock screen -------------------------------------------------------
  // The phone comes out of your pocket locked, with the time across it and
  // whatever has happened since you last looked stacked underneath. Swipe it,
  // or press anything, and it opens.
  let locked = true;
  // Every notice wears the icon of the app it came out of, the way a notice
  // on a real phone does. Nothing here borrows a tool out of the grove.
  function notifications() {
    const out = [];
    const q = Guide.current();
    if (q) out.push({ app: 'Jobs', icon: 'ph_jobs', title: q.title, body: q.where, go: 'quests' });
    const th = threads();
    for (const k of Object.keys(th)) {
      const un = th[k].filter((m) => m.f === 't' && !m.seen);
      if (!un.length) continue;
      out.push({ app: 'Messages', icon: 'ph_msg', title: PEOPLE[k].name, body: un[un.length - 1].text, go: 'messages' });
    }
    for (const c of careList().slice(0, 2)) out.push({ app: 'Herd', icon: 'ph_herd', title: c.what, body: c.where, go: 'herd' });
    for (const j of gardenJobs().slice(0, 2)) out.push({ app: 'Garden', icon: 'ph_garden', title: j.what, body: j.where, go: 'garden' });
    const load = OFFER_ORDER.reduce((n, k) => n + (G.offerings[k] || 0) + (G.blessed[k] || 0), 0);
    if (load) out.push({ app: 'Larder', icon: 'ph_larder', title: load + ' in the truck', body: 'Jim buys these', go: 'larder' });
    return out.filter((x) => installed(x.go)).slice(0, 6);
  }
  function paintLock() {
    const el = $('ph-lock');
    if (!el) return;
    const n = notifications();
    el.innerHTML = `
      <div class="phlockclock">
        <b>${clock24()}</b>
        <span>${esc(Sky.partOfDay())} &middot; ${esc(Sky.def().name)}</span>
      </div>
      <div class="phnotes">${n.map((x) => `<button class="phnote" ${x.go ? `data-app="${x.go}"` : 'data-app="quests"'}>
        <i class="phnico">${ic(x.icon)}</i>
        <span class="phntx"><b>${esc(x.app)}</b><em>${esc(x.title)}</em><small>${esc(x.body)}</small></span>
      </button>`).join('')}</div>
      <div class="phswipe">SWIPE UP TO OPEN</div>`;
    el.querySelectorAll('[data-app]').forEach((b) => b.onclick = (e) => {
      e.stopPropagation();
      locked = false; app = b.dataset.app; Audio.play('click'); render();
    });
    el.onclick = () => { locked = false; app = 'home'; Audio.play('click'); render(); };
  }

  function open(which) {
    if (!G) return;
    UI.closePanels();
    if (which) locked = false;
    app = which && installed(which) ? which : 'home';
    $('panel-phone').hidden = false;
    G.paused = true;
    Audio.play('click');
    render();
    if (!raf) raf = requestAnimationFrame(tick);
  }
  // A 24-hour clock, the way a phone shows it
  function clock24() {
    const h = Math.floor(Sky.hour()), m = Math.floor((Sky.hour() % 1) * 60);
    return `${h}:${String(m).padStart(2, '0')}`;
  }
  function close() {
    if ($('panel-phone').hidden) return;
    relock();
    $('panel-phone').hidden = true;
    G.paused = false;
    cancelAnimationFrame(raf); raf = 0;
    Audio.play('click');
    UI.refreshAll();
  }
  const isOpen = () => !$('panel-phone').hidden;
  function toggle() {
    if (isOpen()) { close(); return; }
    if (!owns(G, 'phone')) { Audio.play('error'); UI.toast(`no phone yet &mdash; Wombat Mart sells them for W$${PHONE_PRICE}`, 'bad'); return; }
    open();
  }
  function tick(ms) {
    if (!isOpen()) { raf = 0; return; }
    raf = requestAnimationFrame(tick);
    t = ms / 1000;
    const c = $('ph-clock');
    if (c) c.textContent = clock24();
  }

  // ---- little pieces everyone uses ------------------------------------------
  const bar = (v, max, col) => `<div class="phbar2"><i style="width:${Math.round(U.clamp(v / max, 0, 1) * 100)}%;background:${col}"></i></div>`;
  const row = (inner, cls = '') => `<div class="phrow ${cls}">${inner}</div>`;
  const ic = (n, cls = '') => Icons.img(n, cls);

  // ---- the home screen ------------------------------------------------------
  // ---- the home screen -------------------------------------------------------
  // A widget across the top with the job in hand and the weather, then the grid,
  // then the dock. Badges are real counts of things that want doing.
  function badges() {
    const q = Guide.current();
    return {
      quests: q ? 1 : 0,
      herd: careList().length,
      garden: gardenJobs().length,
      larder: OFFER_ORDER.reduce((n, k) => n + (G.offerings[k] || 0) + (G.blessed[k] || 0), 0),
      messages: unread(),
    };
  }
  function appIcon(a, badge) {
    return `<button class="phapp" data-app="${a.key}">
      <i class="phico" style="--t1:${a.tint[0]};--t2:${a.tint[1]}">${ic(a.icon)}</i>
      <b>${a.name}</b>${badge ? `<i class="phdot">${badge > 99 ? '99' : badge}</i>` : ''}
    </button>`;
  }
  function paintHome() {
    const b = badges();
    const q = Guide.current();
    const d = Sky.def();
    $('ph-widget').innerHTML = `
      <h5>${ic(Sky.isNight() ? 'ph_moon' : Sky.wet() > 0.2 ? 'ph_rain' : 'ph_sun', 'sm')} ${Sky.partOfDay().toUpperCase()} &middot; ${esc(d.name).toUpperCase()}</h5>
      <p>${q ? esc(q.title) : 'Nothing owing. The wood is yours.'}</p>
      <div class="phwrow">
        <span>${ic('ph_larder', 'sm')} ${U.fmt(G.wd)}</span>
        <span>${ic('ph_herd', 'sm')} ${G.wombats.length}</span>
        <span>${ic('ph_garden', 'sm')} ${(World.crops || []).length}</span>
      </div>`;
    const dock = DOCK_KEYS.filter(installed);
    APPS = APPS_ALL.filter((a) => installed(a.key) && !dock.includes(a.key));
    $('ph-grid').innerHTML = APPS.map((a) => appIcon(a, b[a.key])).join('');
    $('ph-dock').innerHTML = dock.map((k) => appIcon(APP_BY_KEY[k], b[k])).join('');
    $('ph-dock').style.gridTemplateColumns = `repeat(${Math.max(1, dock.length)}, 1fr)`;
    wire($('ph-home-view'));
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
        <p>Jim has shown you everything. What happens next is up to you: more land, more wombats, more veg.</p></div>`;
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
    mart: 'Shaz on the till. Hardware, drinks, a gumball machine and a cage of wombats.',
    nursery: 'Groot. Seed, saplings, garden tools, a trough and a nest.',
    ottoman: "Captain Clark's furniture showroom. Ottomans, sofas, lamps, rugs. Do not go in the back room.",
  };
  function places() {
    const here = Atlas.whereAmI();
    return SITES.map((s) => {
      const open = Atlas.siteOpen(s);
      const km = Atlas.kmBetween(here, s);
      const now = s.mode === G.mode || (s.key === 'grove' && G.mode === 'grove');
      const why = !open ? (s.gate && !s.gate(G) ? s.why : 'not yet') : '';
      return `<div class="phcard site ${open ? '' : 'shut'}">
        <div class="phcardh">${ic(s.icon)}<b>${esc(open ? s.name : '???')}</b><span class="phdim">${now ? 'you are here' : km + ' km'}</span></div>
        <p>${esc(open ? (SITE_BLURB[s.key] || '') : why)}</p>
        ${open && s.mode && !now ? `<div class="phacts"><button class="phbtn go" data-go="${s.key}">DRIVE OVER</button></div>` : ''}
      </div>`;
    }).join('');
  }

  // ---- the larder ------------------------------------------------------------
  // The money, what is in the back of the truck and what is on the shelf, on
  // one page. It replaces the wallet, the weather and the wombagram, none of
  // which said anything the grove was not already saying out loud.
  function larder() {
    const offs = OFFER_ORDER.filter((k) => (G.offerings[k] || 0) + (G.blessed[k] || 0) > 0);
    const food = CROPS.filter((c) => (G.food[c.key] || 0) > 0);
    const d = Sky.def();
    let html = `<div class="phcard big"><div class="phcardh">${ic('ph_larder')}<b>${U.fmt(G.wd)} W$</b></div>
      <div class="phmeta"><span>earned ${U.fmt(Math.round(G.stats.earned || 0))}</span><span>${G.wombats.length} in the herd</span></div></div>
      ${row(`${ic(Sky.isNight() ? 'ph_moon' : Sky.wet() > 0.2 ? 'ph_rain' : 'ph_sun')}<b>${esc(d.name)}</b><span class="phdim">${esc(d.blurb)}</span>`)}`;
    if (offs.length) {
      html += `<div class="phsub">IN THE TRUCK</div>` + offs.map((k) => row(
        `${ic(OFFERINGS[k].icon)}<b>${esc(OFFERINGS[k].name)}</b><span class="phnum">${(G.offerings[k] || 0) + (G.blessed[k] || 0)}</span><span class="phdim">Jim buys these</span>`)).join('');
    }
    if (food.length) {
      html += `<div class="phsub">IN THE LARDER</div>` + food.map((c) => row(
        `${ic(c.icon)}<b>${esc(c.name)}</b><span class="phnum">${G.food[c.key]}</span><span class="phdim">+${c.hap} happy</span>`)).join('');
    }
    if (!offs.length && !food.length) html += `<div class="phsub">EMPTY</div>${row('<b>Nothing in the back and nothing in the larder.</b>')}`;
    return html;
  }

  // ---- messages --------------------------------------------------------------
  // Everyone in the district has your number. Threads live in the save, new
  // lines arrive as things happen, and you can text back — badly.
  const PEOPLE = {
    cultist: { name: 'Jim', sub: 'the old caretaker' },
    shaz: { name: 'Shaz', sub: 'Wombat Mart' },
    groot: { name: 'Groot', sub: 'the cellar' },
    bee: { name: 'Maud', sub: 'the hives' },
    fish: { name: 'Errol', sub: 'the lake' },
    post: { name: 'Bev', sub: 'the round' },
    bake: { name: 'Nonna', sub: 'the bakery' },
    bota: { name: 'Dr Finch', sub: 'botany' },
    bard: { name: 'Little Ash', sub: 'the Flats' },
  };
  // What each of them opens with, so the inbox is never empty.
  const SEED_MSGS = {
    cultist: ['oi its jim. got ur number off shaz', 'bring me the cubes, any hour. good for the veg'],
    shaz: ['hiii its shaz from the mart!! 😄', 'we got the good pies in. do not tell head office'],
    groot: ['I am Groot.'],
    bake: ['i left something on the fence post. eat it today not tomorrow'],
  };
  // The canned things you are able to say back, and what they say to that.
  const REPLIES = [
    { q: 'Thanks!', a: ['No trouble.', 'Any time.', 'You are very welcome.', 'I am Groot.'] },
    { q: 'How are you?', a: ['Tired. The usual.', 'Better for asking.', 'Up since four.', 'I am Groot!'] },
    { q: 'Come and see the wombats.', a: ['Try and stop me.', 'Sunday. I will bring something.', 'I was going to invite myself anyway.', 'I am Groot?'] },
    { q: 'Busy right now.', a: ['Understood.', 'Go on then.', 'I will leave you to it.', 'I am Groot.'] },
  ];
  function threads() {
    if (!G.msgs) G.msgs = {};
    for (const k of Object.keys(SEED_MSGS)) {
      if (!G.msgs[k]) G.msgs[k] = SEED_MSGS[k].map((text, i) => ({ f: 't', text, t: i }));
    }
    return G.msgs;
  }
  function unread() {
    const th = threads();
    return Object.keys(th).filter((k) => th[k].some((m) => m.f === 't' && !m.seen)).length;
  }
  // Anything in the game can drop somebody a line.
  function push(who, text) {
    if (!PEOPLE[who]) return;
    const th = threads();
    if (!th[who]) th[who] = [];
    th[who].push({ f: 't', text, t: Math.round((G.time || 0)) });
    if (th[who].length > 40) th[who].splice(0, th[who].length - 40);
    if (typeof UI !== 'undefined' && UI.refreshHUD) UI.refreshHUD();
  }
  // a little round portrait for the thread list
  function avatar(who) {
    const c = document.createElement('canvas');
    c.width = 40; c.height = 40;
    const g2 = c.getContext('2d'); g2.imageSmoothingEnabled = false;
    let img = null, sc = 1;
    if (who === 'cultist') { img = Sprites.cultist(2, 'idle'); sc = 40 / img.height * 1.9; }
    else if (who === 'shaz') { img = Sprites.cashier(2, 'talk'); sc = 40 / img.height * 1.9; }
    else if (who === 'groot') { img = Sprites.groot(2, 'talk'); sc = 40 / img.height * 1.9; }
    else if (Sprites.VILLAGERS[who]) { img = Sprites.villager(who, 2, 'talk'); sc = 40 / img.height * 2.1; }
    if (!img) return c;
    const w = img.width * sc, h = img.height * sc;
    g2.drawImage(img, Math.round(20 - w / 2), Math.round(30 - h * 0.62), Math.round(w), Math.round(h));
    return c;
  }
  let chatWith = null;
  function messages() {
    const th = threads();
    if (chatWith && th[chatWith]) {
      const list = th[chatWith];
      for (const m of list) m.seen = 1;
      return `<div class="phchat">${list.map((m) => `<div class="phmsg ${m.f === 't' ? 'them' : 'me'}">${esc(m.text)}</div>`).join('')}</div>
        <div class="phreplies">${REPLIES.map((r, i) => `<button class="phreply" data-reply="${i}">${esc(r.q)}</button>`).join('')}</div>`;
    }
    const keys = Object.keys(th).filter((k) => PEOPLE[k] && th[k].length);
    if (!keys.length) return `<div class="phcard big"><div class="phcardh"><b>No messages</b></div><p>Nobody has your number yet. Meet a few people.</p></div>`;
    return keys.map((k) => {
      const last = th[k][th[k].length - 1];
      const un = th[k].some((m) => m.f === 't' && !m.seen);
      return `<button class="phthread" data-chat="${k}">
        <span class="phava" data-ava="${k}"></span>
        <span class="phtx"><b>${esc(PEOPLE[k].name)}</b><small>${last.f === 'm' ? 'You: ' : ''}${esc(last.text)}</small></span>
        ${un ? '<i class="phunread"></i>' : ''}
      </button>`;
    }).join('');
  }

  // ---- settings ---------------------------------------------------------------
  function settings() {
    const st = Main.settings;
    const row = (k, name, sub, on) => `<div class="phset"><span>${esc(name)}<small>${esc(sub)}</small></span>
      <button class="phsw ${on ? 'on' : ''}" data-tog="${k}"><i></i></button></div>`;
    return `<div class="phsub">SOUND</div>
      <div class="phgroup">
        ${row('muted', 'Silent', 'everything off', st.muted)}
        ${row('musicOff', 'Music', 'the wood has a tune', !st.musicOff)}
      </div>
      <div class="phsub">DISPLAY</div>
      <div class="phgroup">
        ${row('shake', 'Screen shake', 'things land harder', st.shake !== false)}
        ${row('bigText', 'Larger text', 'for reading across a room', !!st.bigText)}
      </div>
      <div class="phsub">ABOUT</div>
      <div class="phgroup">
        <div class="phset"><span>Wombat OS<small>version 41, built in a wood</small></span></div>
        <div class="phset"><span>Storage<small>${(World.crops || []).length} plants &middot; ${G.wombats.length} wombats</small></span></div>
        <div class="phset"><span>Time in the grove<small>${U.time(Math.round(G.time || 0))}</small></span></div>
      </div>
      <div class="phsub">DANGER</div>
      <div class="phgroup">
        <div class="phset"><span>Erase this grove<small>everything, permanently</small></span>
          <button class="phgo" data-wipe="1" id="ph-wipe">ERASE</button></div>
      </div>`;
  }

  // ---- the camera --------------------------------------------------------------
  // It photographs whatever is on the screen behind the phone, which is the
  // whole point of a camera. The roll sits underneath the shutter.
  function camera() {
    const shots = G.shots || [];
    const roll = shots.length
      ? `<div class="phsub">THE ROLL</div><div class="phphotos">${shots.map((sh) => `<div class="phphoto"><img src="${sh.url}" alt=""></div>`).join('')}</div>`
      : '';
    return `<div class="phcam">
        <div class="phviewfinder" id="ph-vf"></div>
        <div class="phcamrow">
          <span class="phdim">${shots.length} in the roll</span>
          <button class="phshutter" id="ph-shutter"></button>
          <span class="phdim">wombat cam</span>
        </div>
      </div>${roll}`;
  }
  function takeShot() {
    try {
      const src = document.getElementById('game');
      const c = document.createElement('canvas');
      c.width = 160; c.height = 120;
      const g2 = c.getContext('2d');
      g2.imageSmoothingEnabled = false;
      g2.drawImage(src, 0, 0, 160, 120);
      if (!G.shots) G.shots = [];
      G.shots.unshift({ url: c.toDataURL('image/png'), t: Math.round(G.time || 0), likes: 0, cap: '' });
      if (G.shots.length > 12) G.shots.length = 12;
      Audio.play('click'); Audio.play('pop');
      UI.toast('<b>snap</b> &mdash; it is in your camera roll', 'good');
    } catch (e) { UI.toast('the camera would not focus', 'bad'); }
  }
  // ---- drawing --------------------------------------------------------------
  // ---- the app store -----------------------------------------------------------
  function store() {
    const list = APPS_ALL.filter((a) => a.key !== 'store');
    const have = list.filter((a) => installed(a.key)).length;
    let html = `<div class="phstorehead"><b>Today</b><small>${have} of ${list.length} apps on this phone &middot; W$${U.fmt(G.wd)} to spend</small></div>`;
    html += list.map((a) => {
      const own = installed(a.key), price = APP_PRICES[a.key] || 0;
      const btn = own ? `<button class="phget own" data-app="${a.key}">OPEN</button>`
        : `<button class="phget" data-buyapp="${a.key}">${price ? 'W$' + price : 'GET'}</button>`;
      return `<div class="phstoreitem">
        <i class="phico" style="--t1:${a.tint[0]};--t2:${a.tint[1]}">${ic(a.icon)}</i>
        <span class="phtx"><b>${esc(a.name)}</b><small>${esc(a.blurb)}</small></span>${btn}</div>`;
    }).join('');
    return html;
  }
  function buyApp(k) {
    const price = APP_PRICES[k] || 0;
    if (installed(k)) return;
    if (G.wd < price) { Audio.play('error'); UI.toast(`not enough &mdash; ${APP_BY_KEY[k].name} is W$${price}`, 'bad'); return; }
    G.wd -= price;
    if (!G.apps) G.apps = {};
    G.apps[k] = 1;
    Audio.play('cash');
    UI.toast(`<b>${APP_BY_KEY[k].name}</b> is on your phone`, 'good');
    UI.refreshHUD(); Main.save();
  }
  const BODY = { quests, herd, map: places, garden, larder, messages, settings, camera, store };
  function render() {
    const homeV = $('ph-home-view'), appV = $('ph-app-view'), lockV = $('ph-lock');
    if (!homeV || !appV) return;
    if (lockV) lockV.hidden = !locked;
    if (locked) { homeV.hidden = true; appV.hidden = true; paintLock(); return; }
    if (app === 'home') {
      homeV.hidden = false; appV.hidden = true;
      paintHome();
      return;
    }
    homeV.hidden = true; appV.hidden = false;
    const scr = $('ph-screen');
    $('ph-title').textContent = app === 'messages' && chatWith ? PEOPLE[chatWith].name : TITLE[app] || 'App';
    $('ph-back').textContent = app === 'messages' && chatWith ? '‹ Messages' : '‹ Home';
    scr.className = 'phscreen app-' + app;
    scr.innerHTML = (BODY[app] || quests)();
    scr.scrollTop = 0;
    // the bits that need a canvas painting into them
    scr.querySelectorAll('[data-ava]').forEach((el) => el.appendChild(avatar(el.dataset.ava)));
    // the viewfinder is a live picture of what is behind the phone
    const vf = scr.querySelector('#ph-vf');
    if (vf) {
      try {
        const src = document.getElementById('game');
        const c = document.createElement('canvas');
        c.width = 160; c.height = 120;
        const g2 = c.getContext('2d'); g2.imageSmoothingEnabled = false;
        g2.drawImage(src, 0, 0, 160, 120);
        vf.style.backgroundImage = `url(${c.toDataURL('image/png')})`;
      } catch (e) { }
    }
    const sh = scr.querySelector('#ph-shutter');
    if (sh) sh.onclick = () => { takeShot(); render(); };
    wire(scr);
  }
  function wire(scr) {
    scr.querySelectorAll('[data-app]').forEach((b) => b.onclick = () => {
      if (!installed(b.dataset.app)) { app = 'store'; render(); return; }
      app = b.dataset.app; chatWith = null; Audio.play('click'); render();
    });
    scr.querySelectorAll('[data-buyapp]').forEach((b) => b.onclick = () => { buyApp(b.dataset.buyapp); render(); });
    scr.querySelectorAll('[data-chat]').forEach((b) => b.onclick = () => { chatWith = b.dataset.chat; Audio.play('click'); render(); });
    scr.querySelectorAll('[data-reply]').forEach((b) => b.onclick = () => {
      const r = REPLIES[+b.dataset.reply];
      const th = threads();
      th[chatWith].push({ f: 'm', text: r.q, t: Math.round(G.time || 0) });
      Audio.play('click');
      render();
      setTimeout(() => {
        if (!isOpen() || app !== 'messages') return;
        const line = chatWith === 'groot' ? 'I am Groot.' : U.pick(r.a.filter((x) => x !== 'I am Groot.' && x !== 'I am Groot!' && x !== 'I am Groot?'));
        push(chatWith, line);
        if (isOpen() && app === 'messages') render();
      }, 900 + Math.random() * 900);
    });
    scr.querySelectorAll('[data-tog]').forEach((b) => b.onclick = () => {
      Main.menuAction({ toggle: b.dataset.tog });
      render();
    });
    const wipe = scr.querySelector('#ph-wipe');
    if (wipe) {
      let armed = 0;
      wipe.onclick = () => {
        if (Date.now() < armed) { Main.reset(); return; }
        armed = Date.now() + 4000; wipe.textContent = 'SURE?'; Audio.play('alarm');
        setTimeout(() => { if (Date.now() >= armed) wipe.textContent = 'ERASE'; }, 4100);
      };
    }
    scr.querySelectorAll('[data-go]').forEach((b) => b.onclick = () => {
      const s = SITES.find((x) => x.key === b.dataset.go);
      close();
      if (G.mode !== 'map') { Main.setMode('map'); setTimeout(() => Atlas.go(s), 260); }
      else Atlas.go(s);
    });
    scr.querySelectorAll('[data-find]').forEach((b) => b.onclick = () => {
      const w = G.wombats.find((x) => String(x.id) === b.dataset.find);
      if (!w) return;
      close();
      if (G.mode !== 'grove') { Main.setMode('grove'); }
      setTimeout(() => { Grove.panTo(w.x); FX.comic(w.x, w.y - 40, 'HERE!', { ink: '#d8f0a0', edge: '#5d9440', life: 0.9 }); }, 200);
    });
    scr.querySelectorAll('[data-papers]').forEach((b) => b.onclick = () => {
      const w = G.wombats.find((x) => String(x.id) === b.dataset.papers);
      if (w) { close(); UI.openWombat(w); }
    });
  }
  function back() {
    if (locked) { locked = false; app = 'home'; render(); return; }
    if (app === 'messages' && chatWith) { chatWith = null; render(); return; }
    app = 'home'; render();
  }
  // Putting it away locks it again, so it always comes out on the lock screen.
  function relock() { locked = true; chatWith = null; app = 'home'; }
  function key(e) {
    if (!isOpen()) return false;
    if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') { if (locked || app === 'home') close(); else back(); return true; }
    if (locked) { locked = false; app = 'home'; render(); return true; }
    const n = parseInt(e.key, 10) - 1;
    if (app === 'home' && n >= 0 && n < APPS.length) { app = APPS[n].key; Audio.play('click'); render(); return true; }
    return false;
  }

  return { init, open, close, toggle, back, isOpen, render, key, push, unread, gardenJobs, careOf, careList, APPS };
})();
