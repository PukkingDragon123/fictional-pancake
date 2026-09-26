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
  // A phone out here is for three things: texting the neighbours, taking
  // pictures of the wombats, and Wombat Hop. Everything else you already know
  // from standing in the paddock.
  const APPS_ALL = [
    { key: 'messages', name: 'Messages', icon: 'ph_msg', tint: ['#7ee08a', '#2aa840'], blurb: 'Texts from the neighbours.' },
    { key: 'camera', name: 'Camera', icon: 'ph_camera', tint: ['#c8ccd4', '#6c7280'], blurb: 'Take a picture. Keep the roll.' },
    { key: 'games', name: 'Wombat Hop', icon: 'wombat', tint: ['#ffc060', '#e86a2a'], blurb: 'Hop the logs, grab the cubes.' },
  ];
  const installed = (k) => APPS_ALL.some((a) => a.key === k);
  const DOCK_KEYS = [];
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
    Hop.unmount();
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
    $('ph-dock').hidden = !dock.length;
    wire($('ph-home-view'));
  }

  // ---- jobs -----------------------------------------------------------------


  // ---- the herd -------------------------------------------------------------

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


  // ---- places ---------------------------------------------------------------


  // ---- the larder ------------------------------------------------------------
  // The money, what is in the back of the truck and what is on the shelf, on
  // one page. It replaces the wallet, the weather and the wombagram, none of
  // which said anything the grove was not already saying out loud.


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


  function games() {
    return `<div class="phgame"><canvas id="ph-hop" width="180" height="240"></canvas>
      <div class="phsub">JIM'S HIGH SCORE: 1,204 &middot; YOURS: ${G.hopBest || 0}</div></div>`;
  }
  const BODY = { messages, camera, games };
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
    scr.innerHTML = (BODY[app] || messages)();
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
    const hop = scr.querySelector('#ph-hop');
    if (hop) Hop.mount(hop, G); else Hop.unmount();
    const sh = scr.querySelector('#ph-shutter');
    if (sh) sh.onclick = () => { takeShot(); render(); };
    wire(scr);
  }
  function wire(scr) {
    scr.querySelectorAll('[data-app]').forEach((b) => b.onclick = () => {
      if (!installed(b.dataset.app)) { app = 'store'; render(); return; }
      app = b.dataset.app; chatWith = null; Audio.play('click'); render();
    });
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
    if (app === 'games' && Hop.key(e)) return true;
    const n = parseInt(e.key, 10) - 1;
    if (app === 'home' && n >= 0 && n < APPS.length) { app = APPS[n].key; Audio.play('click'); render(); return true; }
    return false;
  }

  return { init, open, close, toggle, back, isOpen, render, key, push, unread, gardenJobs, careOf, careList, APPS };
})();
