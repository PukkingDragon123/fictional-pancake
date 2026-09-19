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
  // Every app on the home screen, in the order they sit on it. `tint` is the
  // icon's own colour, the way every phone gives an app one.
  const APPS = [
    { key: 'quests', name: 'Jobs', icon: 't_sickle', tint: ['#f7c53f', '#b07a10'] },
    { key: 'herd', name: 'Herd', icon: 'wombat', tint: ['#d79a76', '#8a5138'] },
    { key: 'garden', name: 'Garden', icon: 'c_broadleaf', tint: ['#7fce63', '#2f7a30'] },
    { key: 'sky', name: 'Weather', icon: 't_water', tint: ['#6fc4ec', '#1f6fae'] },
    { key: 'photos', name: 'Photos', icon: 'camera', tint: ['#ff9a6a', '#c4386a'] },
    { key: 'purse', name: 'Wallet', icon: 'wdollar', tint: ['#3a3f52', '#14161f'] },
    { key: 'camera', name: 'Camera', icon: 'camera', tint: ['#4a4f6a', '#1a1c28'] },
    { key: 'feed', name: 'Wombagram', icon: 'heart', tint: ['#ff7aa8', '#8a2f5e'] },
    { key: 'settings', name: 'Settings', icon: 'gear', tint: ['#a9b0bd', '#5c636f'] },
    { key: 'help', name: 'Tips', icon: 'basket', tint: ['#c49bff', '#6b3fc4'] },
  ];
  const DOCK = ['messages', 'map', 'quests', 'herd'];
  const ALL = APPS.concat([
    { key: 'messages', name: 'Messages', icon: 'msg', tint: ['#5ce06a', '#1f9a34'] },
    { key: 'map', name: 'Places', icon: 'map', tint: ['#7fd6b0', '#1f7a6a'] },
  ]);
  const APP_BY_KEY = Object.fromEntries(ALL.map((a) => [a.key, a]));
  const TITLE = Object.fromEntries(ALL.map((a) => [a.key, a.name]));

  function init(g) { G = g; }

  // ---- the wallpaper -----------------------------------------------------------
  // Painted once, in the same pixels as the game: the grove at dusk from the
  // top of the ridge, with the moon up and the lamp on in somebody's window.
  let wallURL = null;
  function wallpaper() {
    if (wallURL) return wallURL;
    // Drawn small and blown up, so every pixel in it is four on the screen.
    const W2 = 110, H2 = 238;
    const { c, g } = Art.cv(W2, H2);
    const r = Art.rng(31337);
    const HZ = Math.round(H2 * 0.58);
    const BANDS = ['#151033', '#1c1640', '#271e4f', '#372660', '#4e2f6a', '#6d3c68', '#8e4a62', '#b9675a', '#dd9a62', '#f6d089'];
    for (let i = 0; i < BANDS.length; i++) {
      g.fillStyle = BANDS[i];
      g.fillRect(0, Math.round((HZ * i) / BANDS.length), W2, Math.ceil(HZ / BANDS.length) + 1);
    }
    // stars, thicker toward the top
    for (let i = 0; i < 60; i++) {
      const x = Math.round(r() * W2), y = Math.round(r() * r() * HZ * 0.8);
      g.fillStyle = r() < 0.35 ? '#ffffff' : '#cfd6f2';
      g.fillRect(x, y, 1, 1);
    }
    // the moon: a crescent, stepped, four blocks to a step
    const mx = 74, my = 30, mr = 11;
    for (let yy = -mr; yy <= mr; yy++) {
      const w = Math.round(Math.sqrt(Math.max(0, mr * mr - yy * yy)));
      if (w < 1) continue;
      g.fillStyle = '#f2ecff'; g.fillRect(mx - w, my + yy, w * 2, 1);
    }
    for (let yy = -mr; yy <= mr; yy++) {                 // the bite out of it
      const w = Math.round(Math.sqrt(Math.max(0, mr * mr - yy * yy)));
      const w2 = Math.round(Math.sqrt(Math.max(0, mr * mr - (yy * 0.95) * (yy * 0.95))));
      if (w < 1) continue;
      g.fillStyle = BANDS[Math.min(BANDS.length - 1, Math.max(0, Math.floor(((my + yy) / HZ) * BANDS.length)))];
      g.fillRect(mx - w + 5, my + yy, w2 * 2, 1);
    }
    for (const [dx, dy, rr] of [[-6, -2, 2], [-4, 5, 1]]) {   // a couple of seas
      g.fillStyle = '#d3c6ec';
      g.fillRect(mx + dx - rr, my + dy - rr, rr * 2 + 1, rr * 2 + 1);
    }
    // three ranks of conifer, each lower, darker and bigger
    const RANK = [['#3a3358', 0.00, 10, 7], ['#241f3e', 0.045, 15, 9], ['#141324', 0.1, 22, 12]];
    RANK.forEach(([col, off, hgt, wid]) => {
      const baseY = Math.round(HZ + off * H2);
      g.fillStyle = col;
      let x = -4;
      while (x < W2 + 6) {
        const w = Math.max(3, Math.round(wid * (0.6 + r() * 0.8)));
        const h = Math.round(hgt * (0.7 + r() * 0.8));
        const steps = Math.max(3, Math.round(h / 3));
        for (let i = 0; i < steps; i++) {
          const ww = Math.max(1, Math.round((w * (steps - i)) / steps / 2));
          g.fillRect(x - ww, baseY - h + Math.round((h * i) / steps), ww * 2, Math.ceil(h / steps) + 1);
        }
        g.fillRect(x - 1, baseY - 3, 2, 3);                 // a trunk
        x += Math.max(3, Math.round(w * 0.7));
      }
      g.fillRect(0, baseY, W2, H2 - baseY);
    });
    // the ground, and grass through it
    const gy = Math.round(HZ + 0.1 * H2);
    for (let i = 0; i < 7; i++) {
      g.fillStyle = U.mix('#101a12', '#223522', i / 6);
      g.fillRect(0, gy + Math.round(((H2 - gy) * i) / 7), W2, Math.ceil((H2 - gy) / 7) + 1);
    }
    for (let i = 0; i < 260; i++) {
      const x = Math.round(r() * W2), y = gy + Math.round(r() * (H2 - gy));
      g.fillStyle = ['#1e3320', '#284523', '#33542a'][Math.floor(r() * 3)];
      g.fillRect(x, y, 2, 1);
    }
    // a hut with the lamp on
    const hx = 30, hy = gy + Math.round((H2 - gy) * 0.4);
    g.fillStyle = '#0b1210'; g.fillRect(hx - 14, hy - 16, 28, 17);
    g.fillStyle = '#241c14'; g.fillRect(hx - 13, hy - 15, 26, 15);
    for (let i = 0; i < 5; i++) { g.fillStyle = '#17110c'; g.fillRect(hx - 13, hy - 14 + i * 3, 26, 1); }
    for (let i = 0; i < 7; i++) { g.fillStyle = i % 2 ? '#2a2118' : '#1c150f'; g.fillRect(hx - 18 + i * 1.4, hy - 17 - i * 2, 36 - i * 2.8, 2); }
    g.fillStyle = '#3a2a1c'; g.fillRect(hx - 5, hy - 10, 7, 10);   // the door
    g.fillStyle = '#f5cd5c'; g.fillRect(hx + 4, hy - 11, 7, 6);    // the window
    g.fillStyle = '#fff2c8'; g.fillRect(hx + 5, hy - 10, 5, 4);
    for (let i = 0; i < 6; i++) { g.fillStyle = `rgba(245,205,92,${(0.09 - i * 0.013).toFixed(3)})`; g.fillRect(hx - 2 - i * 4, hy - 16 - i * 4, 22 + i * 8, 16 + i * 8); }
    // a fence running away down the right
    for (let i = 0; i < 6; i++) {
      const fy = gy + 8 + i * 14, fx = 96 + i * 3;
      g.fillStyle = '#1a1510'; g.fillRect(fx, fy - 12, 3, 13);
      if (i < 5) { g.fillStyle = '#24190f'; g.fillRect(fx, fy - 9, 5, 2); g.fillRect(fx, fy - 5, 5, 2); }
    }
    // and a wombat asleep in the foreground
    try {
      const img = Sprites.wombat('sleep', 1, 'brown', 1, 'adult');
      const sc = 1.3, w = Math.round(img.width * sc), h = Math.round(img.height * sc);
      g.drawImage(img, Math.round(W2 * 0.56 - w / 2), Math.round(H2 * 0.94 - h), w, h);
    } catch (e) { }
    wallURL = c.toDataURL('image/png');
    return wallURL;
  }

  // ---- opening and closing --------------------------------------------------
  // ---- the lock screen -------------------------------------------------------
  // The phone comes out of your pocket locked, with the time across it and
  // whatever has happened since you last looked stacked underneath. Swipe it,
  // or press anything, and it opens.
  let locked = true;
  function notifications() {
    const out = [];
    const q = Guide.current();
    if (q) out.push({ app: 'Jobs', icon: 't_sickle', title: q.title, body: q.where });
    const th = threads();
    for (const k of Object.keys(th)) {
      const un = th[k].filter((m) => m.f === 't' && !m.seen);
      if (!un.length) continue;
      out.push({ app: 'Messages', icon: 'msg', title: PEOPLE[k].name, body: un[un.length - 1].text, go: 'messages' });
    }
    for (const c of careList().slice(0, 2)) out.push({ app: 'Herd', icon: c.icon, title: c.what, body: c.where, go: 'herd' });
    for (const j of gardenJobs().slice(0, 2)) out.push({ app: 'Garden', icon: j.icon, title: j.what, body: j.where, go: 'garden' });
    const d = Sky.def();
    out.push({ app: 'Weather', icon: d.icon, title: d.name, body: d.blurb, go: 'sky' });
    return out.slice(0, 6);
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
    app = which || 'home';
    $('panel-phone').hidden = false;
    const wall = $('panel-phone').querySelector('.phwall');
    if (wall && !wall.dataset.on) { wall.style.backgroundImage = `url(${wallpaper()})`; wall.dataset.on = '1'; }
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
  function toggle() { if (isOpen()) close(); else open(); }
  function tick(ms) {
    if (!isOpen()) { raf = 0; return; }
    raf = requestAnimationFrame(tick);
    t = ms / 1000;
    const c = $('ph-clock');
    if (c) c.textContent = clock24();
  }

  // ---- little pieces everyone uses ------------------------------------------
  const bar = (v, max, col) => `<div class="phbar"><i style="width:${Math.round(U.clamp(v / max, 0, 1) * 100)}%;background:${col}"></i></div>`;
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
      <h5>${Sky.partOfDay().toUpperCase()} &middot; ${esc(d.name).toUpperCase()}</h5>
      <p>${q ? esc(q.title) : 'Nothing owing. The wood is yours.'}</p>
      <div class="phwrow">
        <span>${ic('wdollar', 'sm')} ${U.fmt(G.wd)}</span>
        <span>${ic('wombat', 'sm')} ${G.wombats.length}</span>
        <span>${ic('c_broadleaf', 'sm')} ${(World.crops || []).length}</span>
      </div>`;
    $('ph-grid').innerHTML = APPS.map((a) => appIcon(a, b[a.key])).join('');
    $('ph-dock').innerHTML = DOCK.map((k) => appIcon(APP_BY_KEY[k], b[k])).join('');
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

  // ---- messages --------------------------------------------------------------
  // Everyone in the district has your number. Threads live in the save, new
  // lines arrive as things happen, and you can text back — badly.
  const PEOPLE = {
    cultist: { name: 'The Hooded One', sub: 'no surname given' },
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
    cultist: ['You have my number now. Do not lose it.', 'Anything square, I will buy. Any hour.'],
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
        <div class="phset"><span>Wombat OS<small>version 38, built in a wood</small></span></div>
        <div class="phset"><span>Storage<small>${(World.crops || []).length} plants &middot; ${G.wombats.length} wombats &middot; ${Object.keys(G.summoned || {}).length} gods</small></span></div>
        <div class="phset"><span>Time in the grove<small>${U.time(Math.round(G.time || 0))}</small></span></div>
      </div>
      <div class="phsub">DANGER</div>
      <div class="phgroup">
        <div class="phset"><span>Erase this grove<small>everything, permanently</small></span>
          <button class="phgo" data-wipe="1" id="ph-wipe">ERASE</button></div>
      </div>`;
  }

  // ---- photos ------------------------------------------------------------------
  function photos() {
    const roll = (G.shots || []).length
      ? `<div class="phsub">CAMERA ROLL</div><div class="phphotos">${(G.shots || []).map((sh) => `<div class="phphoto"><img src="${sh.url}" alt=""></div>`).join('')}</div>`
      : `<div class="phsub">CAMERA ROLL</div><div class="phcard"><p>Nothing yet. Open Camera and press the button.</p></div>`;
    if (!G.wombats.length) return roll;
    return roll + `<div class="phsub">${G.wombats.length} PORTRAIT${G.wombats.length > 1 ? 'S' : ''}</div>
      <div class="phphotos">${G.wombats.map((w) => `<div class="phphoto" data-shot="${w.id}"><em>${esc(w.name)}</em></div>`).join('')}</div>
      <div class="phsub">FAVOURITES</div>
      <div class="phcard"><p>Every one of them, obviously.</p></div>`;
  }

  // ---- tips --------------------------------------------------------------------
  function help() {
    const TIPS = [
      ['t_sickle', 'The tool tray', 'Right-click, or press Tab. Pick one and it rides with the pointer.'],
      ['t_hoe', 'Beds', 'Hoe bare soil, sow on it, water it, pick it when it glows.'],
      ['c_broadleaf', 'Three kinds of plant', 'Crops are picked once. Trees take minutes and fruit forever. Magical seed wants one strange thing and sulks until it gets it.'],
      ['wombat', 'Carrying', 'Drag a wombat and she comes off the ground. The pond is a drink, a hill is a sit, the truck means she is coming with you.'],
      ['wdollar', 'Cubes', 'The hooded one buys every one of them, and pays better for a load.'],
      ['map', 'Getting about', 'Places will drive you anywhere from where you are standing.'],
    ];
    return TIPS.map(([i, t2, b]) => `<div class="phcard"><div class="phcardh">${ic(i)}<b>${esc(t2)}</b></div><p>${esc(b)}</p></div>`).join('');
  }

  // ---- the camera --------------------------------------------------------------
  // It photographs whatever is on the screen behind the phone, which is the
  // whole point of a camera. Shots go in Photos and can be posted.
  function camera() {
    return `<div class="phcam">
        <div class="phviewfinder" id="ph-vf"></div>
        <div class="phcamrow">
          <span class="phdim">${(G.shots || []).length} in the roll</span>
          <button class="phshutter" id="ph-shutter"></button>
          <span class="phdim">wombat cam</span>
        </div>
      </div>`;
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
  // ---- the feed ------------------------------------------------------------------
  // Everyone in the district posts about your wombats. Your own shots go in
  // among theirs, and the likes climb while you watch.
  const FEED = [
    { who: 'shaz', text: 'day off. drove out to the grove again. NO REGRETS', likes: 412 },
    { who: 'bee', text: 'the clover came good this year. thank the wombats', likes: 88 },
    { who: 'bard', text: 'new song. four verses. the wombats of the grove 🎵', likes: 1204 },
    { who: 'bota', text: 'Unconfirmed sighting below the tree line. Investigating.', likes: 37 },
    { who: 'post', text: 'nothing in the post for the grove. again. lovely walk though', likes: 51 },
    { who: 'cultist', text: 'Cubes bought. Cash paid. No questions asked. Open all hours.', likes: 9 },
  ];
  function feed() {
    const mine = (G.shots || []).map((sh, i) => `
      <div class="phpost">
        <div class="phposth"><i class="phava2" data-ava="me"></i><b>you</b><span class="phdim">just now</span></div>
        <img class="phshot" src="${sh.url}" alt="">
        <div class="phlikes" data-like="${i}">${ic('heart', 'sm')} ${sh.likes + 24}</div>
      </div>`).join('');
    const theirs = FEED.map((f) => `
      <div class="phpost">
        <div class="phposth"><i class="phava2" data-ava="${f.who}"></i><b>${esc(PEOPLE[f.who] ? PEOPLE[f.who].name : f.who)}</b></div>
        <p>${esc(f.text)}</p>
        <div class="phlikes">${ic('heart', 'sm')} ${f.likes}</div>
      </div>`).join('');
    return (mine || '') + theirs;
  }

  // ---- drawing --------------------------------------------------------------
  const BODY = { quests, herd, map: places, garden, sky, purse, messages, settings, photos, help, camera, feed };
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
    scr.innerHTML = (BODY[app] || help)();
    scr.scrollTop = 0;
    // the bits that need a canvas painting into them
    scr.querySelectorAll('[data-ava]').forEach((el) => el.appendChild(avatar(el.dataset.ava)));
    scr.querySelectorAll('[data-shot]').forEach((el) => {
      const w = G.wombats.find((x) => String(x.id) === el.dataset.shot);
      if (!w) return;
      const c = document.createElement('canvas');
      c.width = 60; c.height = 48;
      const g2 = c.getContext('2d'); g2.imageSmoothingEnabled = false;
      const poses = ['idle', 'happy', 'sit', 'graze', 'sleep'];
      const img = Sprites.wombat(poses[(w.name.length + w.x | 0) % poses.length], 2, w.pelt, 1, w.age);
      g2.fillStyle = '#4a6a3a'; g2.fillRect(0, 0, 60, 48);
      g2.fillStyle = '#5d8a44'; g2.fillRect(0, 34, 60, 14);
      g2.drawImage(img, Math.round(30 - img.width / 2), Math.round(42 - img.height));
      el.insertBefore(c, el.firstChild);
    });
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
    scr.querySelectorAll('[data-ava]').forEach((el) => {
      if (el.dataset.ava === 'me') { el.style.background = '#4a7a3a'; return; }
      el.appendChild(avatar(el.dataset.ava));
    });
    scr.querySelectorAll('[data-like]').forEach((el) => el.onclick = () => {
      const sh2 = (G.shots || [])[+el.dataset.like];
      if (sh2) { sh2.likes += 1 + Math.floor(Math.random() * 9); Audio.play('pop'); render(); }
    });
    wire(scr);
  }
  function wire(scr) {
    scr.querySelectorAll('[data-app]').forEach((b) => b.onclick = () => {
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
