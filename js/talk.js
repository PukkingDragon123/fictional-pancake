// ---- Conversations ---------------------------------------------------------
// Everybody in this game used to say one line at you and stop. This is a real
// dialogue panel: a portrait of whoever is speaking, what they just said, and
// a list of things you can ask them back. Pick one and they answer, which
// usually opens another few questions.
//
// A conversation is a plain object of nodes:
//   { start: 'hello', nodes: { hello: { say, mood, opts: [{ q, to, act, if }] } } }
// `to` moves to another node, `act` runs something, and a node with no options
// gets a single "Right." that closes the panel. Nothing here knows about any
// particular character: the speakers table at the bottom says how to draw a
// portrait and each scene hands in its own tree.
const Talk = (() => {
  let G = null;
  let cur = null;                 // { who, tree, node, onClose }
  let typed = 0;                  // characters of the current line revealed
  let full = '';
  let portraitT = 0;
  let raf = 0;

  const $ = (id) => document.getElementById(id);

  // ---- who can talk, and how their portrait is drawn ----------------------
  // Each returns a canvas for a given mood. They are cached by the sprite
  // modules already, so this is cheap to call every frame.
  const SPEAKERS = {
    cultist: {
      name: 'Jim', sub: 'the caretaker, in her onesie', face: 'jim',
      bg: ['#c9763c', '#7c4630'],
      draw(mood, t) {
        Sprites.setFace(mood || 'happy');
        const pose = mood === 'happy' ? 'laugh' : mood === 'cross' ? 'shake'
          : mood === 'shock' ? 'jump' : mood === 'proud' ? 'cheer'
            : mood === 'think' ? 'idle' : mood === 'tired' ? 'sulk' : 'idle';
        return { img: Sprites.cultist(Math.floor(t * 5), pose), sc: 1.7, dy: 0 };
      },
    },
    shaz: {
      name: 'Shaz', sub: 'nineteen years on this till', face: 'shaz',
      bg: ['#1b3a52', '#0e1e2c'],
      draw(mood, t) {
        const pose = { happy: 'happy', talk: 'talk', cross: 'cross', think: 'think',
          shock: 'surprise', proud: 'cheer', tired: 'sleepy', worry: 'sad' }[mood] || 'talk';
        return { img: Sprites.cashier(Math.floor(t * 6), pose), sc: 2.1, dy: 0 };
      },
    },
    groot: {
      name: 'Groot', sub: 'he grows all of it', face: 'groot',
      bg: ['#233318', '#121c0d'],
      draw(mood, t) {
        const pose = { happy: 'happy', talk: 'talk', cross: 'cross', think: 'curious',
          shock: 'worry', proud: 'proud', tired: 'sleepy', worry: 'sad' }[mood] || 'talk';
        return { img: Sprites.groot(Math.floor(t * 5), pose), sc: 1.6, dy: 0 };
      },
    },
  };


  // Every villager is the same speaker with a different kit, so one entry
  // covers the lot: `villager:bee`, `villager:post`, and so on.
  for (const key of Object.keys(Sprites.VILLAGERS)) {
    const K = Sprites.VILLAGERS[key];
    SPEAKERS['villager:' + key] = {
      name: K.name, sub: K.why, face: key,
      bg: ['#2f3c4a', '#181f28'],
      draw(mood, t) {
        const pose = { happy: 'wave', proud: 'wave', talk: 'talk', think: 'idle', cross: 'talk',
          shock: 'wave', tired: 'idle', worry: 'talk', sly: 'talk', sad: 'idle' }[mood] || 'talk';
        return { img: Sprites.villager(key, Math.floor(t * 5), pose), sc: 2.6, dy: 0 };
      },
    };
  }

  function init(g) { G = g; }

  // ---- opening and closing ------------------------------------------------
  function open(who, tree, onClose) {
    if (!SPEAKERS[who] || !tree) return;
    UI.closePanels();                       // this can close a conversation, so it goes first
    cur = { who, tree, node: tree.start, onClose };
    $('panel-talk').hidden = false;
    document.body.classList.add('talking');
    G.paused = true;
    Audio.play('click');
    go(tree.start);
    if (!raf) raf = requestAnimationFrame(tick);
  }
  // A run of pages with nothing to choose, like a lesson: click to go on.
  // Pages are strings or { say, mood }; the last one can carry options.
  function lesson(who, pages, onClose, lastOpts) {
    const nodes = {};
    pages.forEach((pg, i) => {
      const p2 = typeof pg === 'string' ? { say: pg } : pg;
      nodes['p' + i] = { say: p2.say, mood: p2.mood || 'talk', next: i < pages.length - 1 ? 'p' + (i + 1) : null,
        opts: i === pages.length - 1 ? lastOpts : null, page: [i + 1, pages.length] };
    });
    open(who, { start: 'p0', nodes }, onClose);
  }
  function close() {
    if (!cur) return;
    const cb = cur.onClose;
    cur = null;
    $('panel-talk').hidden = true;
    document.body.classList.remove('talking');
    G.paused = false;
    cancelAnimationFrame(raf); raf = 0;
    Audio.play('click');
    if (cb) cb();
  }
  const isOpen = () => !!cur;

  // ---- walking the tree ---------------------------------------------------
  function go(key) {
    if (!cur) return;
    const n = cur.tree.nodes[key];
    if (!n) { close(); return; }
    cur.node = key;
    full = typeof n.say === 'function' ? n.say() : n.say;
    typed = 0;
    if (n.enter) n.enter();
    render();
  }
  function choose(opt) {
    if (!cur) return;
    if (typed < full.length) { typed = full.length; render(); return; }   // skip the type-on
    Audio.play('click');
    if (opt.act) opt.act();
    if (opt.to) go(opt.to); else close();
  }
  // a click anywhere on the box: finish the line, or turn the page
  function advance() {
    if (!cur) return;
    if (typed < full.length) { typed = full.length; render(); return; }
    const n = cur.tree.nodes[cur.node] || {};
    const opts = (n.opts || []).filter((o) => !o.if || o.if());
    if (n.next) { Audio.play('click'); go(n.next); return; }
    if (!opts.length) { close(); }
  }

  // ---- drawing ------------------------------------------------------------
  const nodeOpts = (n) => (n.opts || []).filter((o) => !o.if || o.if());
  function render() {
    if (!cur) return;
    const sp = SPEAKERS[cur.who];
    const n = cur.tree.nodes[cur.node] || {};
    $('talk-name').textContent = sp.name;
    $('talk-sub').textContent = (typeof n.sub === 'function' ? n.sub() : n.sub) || sp.sub;
    $('talk-line').textContent = full.slice(0, typed);
    const done = typed >= full.length;
    $('talk-line').classList.toggle('typing', !done);
    const list = $('talk-opts');
    list.innerHTML = '';
    const opts = nodeOpts(n);
    // options only come up once the line has finished, like they do in a game
    list.hidden = !done || (!opts.length);
    if (done) opts.forEach((o, i) => {
      const b = document.createElement('button');
      b.className = 'dlg-opt' + (o.end || (!o.to && !o.act) ? ' end' : '');
      const q = typeof o.q === 'function' ? o.q() : o.q;
      b.innerHTML = `<span class="tnum">${i + 1}</span><span class="tq">${q}</span>`;
      b.onclick = (e) => { e.stopPropagation(); choose(o); };
      list.appendChild(b);
    });
    const nx = $('talk-next');
    nx.hidden = !done || opts.length > 0;
    nx.className = 'dlg-next' + (n.next ? '' : ' end');
    nx.textContent = n.page ? `${n.page[0]}/${n.page[1]}` : '';
  }
  function tick(ms) {
    if (!cur) { raf = 0; return; }
    raf = requestAnimationFrame(tick);
    portraitT = ms / 1000;
    // the line types itself on, which is what makes it feel like talking
    if (typed < full.length) {
      typed = Math.min(full.length, typed + 1);
      if (typed % 3 === 0 && full[typed - 1] !== ' ') Audio.play('blip');
      $('talk-line').textContent = full.slice(0, typed);
      if (typed >= full.length) render();
    }
    paintPortrait();
  }
  function paintPortrait() {
    const cv = $('talk-face');
    if (!cv || !cur) return;
    const sp = SPEAKERS[cur.who];
    const n = cur.tree.nodes[cur.node] || {};
    const g = cv.getContext('2d');
    g.imageSmoothingEnabled = false;
    const W = cv.width, H = cv.height;
    g.clearRect(0, 0, W, H);
    // a soft sky behind them, with a band of meadow at the shoulders
    Art.vband(g, 0, 0, W, H, '#5ab4ff', '#b8e4ff', 6);
    g.fillStyle = '#5cc03c'; g.fillRect(0, H - 14, W, 14);
    g.fillStyle = '#a8ec6a'; g.fillRect(0, H - 14, W, 2);
    const mood = n.mood || 'talk';
    const talking = typed < full.length;
    const face = sp.face && typeof Portraits !== 'undefined' ? Portraits.get(sp.face, mood, portraitT, talking) : null;
    if (face) { g.drawImage(face, 0, 0); return; }
    // anybody without a painted face stands in the frame as themselves
    const d = sp.draw(mood, portraitT);
    // cropped to head and shoulders, like the painted faces
    const sc = Math.max(1, Math.round(((H * 1.7) / d.img.height) * 2) / 2);
    const w = d.img.width * sc, h = d.img.height * sc;
    g.drawImage(d.img, Math.round(W / 2 - w / 2), Math.round(2 - h * 0.04 + d.dy), Math.round(w), Math.round(h));
  }
  function bind() {
    const box = $('talk-box');
    if (box && !box.dataset.on) { box.dataset.on = '1'; box.addEventListener('click', () => advance()); }
  }

  // ---- keys ---------------------------------------------------------------
  function key(e) {
    if (!cur) return false;
    if (e.key === 'Escape') { close(); return true; }
    const n = cur.tree.nodes[cur.node] || {};
    const opts = nodeOpts(n);
    const i = parseInt(e.key, 10) - 1;
    if (typed >= full.length && i >= 0 && i < opts.length) { choose(opts[i]); return true; }
    if (e.key === ' ' || e.key === 'Enter' || e.key === 'e' || e.key === 'E') { advance(); return true; }
    return false;
  }

  return { init: (g) => { init(g); bind(); }, open, lesson, close, isOpen, key, advance, SPEAKERS };
})();
