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
      name: 'Aunt Fern', sub: 'your neighbour',
      bg: ['#4f8050', '#2f5a2a'],
      draw(mood, t) {
        Sprites.setFace(mood || 'happy');
        const pose = mood === 'happy' ? 'laugh' : mood === 'cross' ? 'shake'
          : mood === 'shock' ? 'jump' : mood === 'proud' ? 'cheer'
            : mood === 'think' ? 'idle' : mood === 'tired' ? 'sulk' : 'idle';
        return { img: Sprites.cultist(Math.floor(t * 5), pose), sc: 1.7, dy: 0 };
      },
    },
    shaz: {
      name: 'Shaz', sub: 'nineteen years on this till',
      bg: ['#1b3a52', '#0e1e2c'],
      draw(mood, t) {
        const pose = { happy: 'happy', talk: 'talk', cross: 'cross', think: 'think',
          shock: 'surprise', proud: 'cheer', tired: 'sleepy', worry: 'sad' }[mood] || 'talk';
        return { img: Sprites.cashier(Math.floor(t * 6), pose), sc: 2.1, dy: 0 };
      },
    },
    groot: {
      name: 'Groot', sub: 'he grows all of it',
      bg: ['#233318', '#121c0d'],
      draw(mood, t) {
        const pose = { happy: 'happy', talk: 'talk', cross: 'cross', think: 'curious',
          shock: 'worry', proud: 'proud', tired: 'sleepy', worry: 'sad' }[mood] || 'talk';
        return { img: Sprites.groot(Math.floor(t * 5), pose), sc: 1.6, dy: 0 };
      },
    },
  };

  SPEAKERS.kid = {
    name: 'A Kid', sub: 'on a bike',
    bg: ['#5a8ab0', '#2f5a7a'],
    draw(mood, t) { return { img: Sprites.wombat(mood === 'happy' ? 'happy' : 'idle', Math.floor(t * 5), 'sand', 1, 'juvenile'), sc: 2.4, dy: 0 }; },
  };
  // Every villager is the same speaker with a different kit, so one entry
  // covers the lot: `villager:bee`, `villager:post`, and so on.
  for (const key of Object.keys(Sprites.VILLAGERS)) {
    const K = Sprites.VILLAGERS[key];
    SPEAKERS['villager:' + key] = {
      name: K.name, sub: K.why,
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
    G.paused = true;
    Audio.play('click');
    go(tree.start);
    if (!raf) raf = requestAnimationFrame(tick);
  }
  function close() {
    if (!cur) return;
    const cb = cur.onClose;
    cur = null;
    $('panel-talk').hidden = true;
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

  // ---- drawing ------------------------------------------------------------
  function render() {
    if (!cur) return;
    const sp = SPEAKERS[cur.who];
    const n = cur.tree.nodes[cur.node] || {};
    $('talk-name').textContent = sp.name;
    $('talk-sub').textContent = (typeof n.sub === 'function' ? n.sub() : n.sub) || sp.sub;
    $('talk-line').textContent = full.slice(0, typed);
    $('talk-line').classList.toggle('typing', typed < full.length);
    const list = $('talk-opts');
    list.innerHTML = '';
    const opts = (n.opts || []).filter((o) => !o.if || o.if());
    const shown = opts.length ? opts : [{ q: 'Right. Thanks.', end: true }];
    shown.forEach((o, i) => {
      const b = document.createElement('button');
      b.className = 'topt' + (o.end || (!o.to && !o.act) ? ' end' : '');
      const q = typeof o.q === 'function' ? o.q() : o.q;
      b.innerHTML = `<span class="tnum">${i + 1}</span><span class="tq">${q}</span>`;
      b.onclick = () => choose(o);
      list.appendChild(b);
    });
  }
  function tick(ms) {
    if (!cur) { raf = 0; return; }
    raf = requestAnimationFrame(tick);
    portraitT = ms / 1000;
    // the line types itself on, which is what makes it feel like talking
    if (typed < full.length) {
      typed = Math.min(full.length, typed + 2);
      $('talk-line').textContent = full.slice(0, typed);
      if (typed >= full.length) $('talk-line').classList.remove('typing');
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
    // the backdrop: two flat bands and a floor, so the portrait has a room
    Art.vband(g, 0, 0, W, H, sp.bg[0], sp.bg[1], 6);
    Art.rect(g, 0, H - 18, W, 18, sp.bg[1]);
    Art.rect(g, 0, H - 18, W, 2, 'rgba(255,255,255,0.08)');
    for (let i = 0; i < 26; i++) {              // dust in the light
      const dx = (i * 37) % W, dy = (H - ((i * 53 + portraitT * 14) % H)) | 0;
      g.fillStyle = 'rgba(255,244,214,0.18)';
      g.fillRect(dx, dy, 1, 1);
    }
    const d = sp.draw(n.mood || 'talk', portraitT);
    const w = d.img.width * d.sc, h = d.img.height * d.sc;
    g.fillStyle = 'rgba(0,0,0,0.3)';
    Art.ell(g, W / 2, H - 14, w * 0.3, 4);
    g.drawImage(d.img, Math.round(W / 2 - w / 2), Math.round(H - 12 - h + d.dy), Math.round(w), Math.round(h));
  }

  // ---- keys ---------------------------------------------------------------
  function key(e) {
    if (!cur) return false;
    if (e.key === 'Escape') { close(); return true; }
    const n = cur.tree.nodes[cur.node] || {};
    const opts = (n.opts || []).filter((o) => !o.if || o.if());
    const i = parseInt(e.key, 10) - 1;
    if (i >= 0 && i < Math.max(1, opts.length)) { choose(opts[i] || { end: true }); return true; }
    if (e.key === ' ' || e.key === 'Enter') { if (typed < full.length) { typed = full.length; render(); } return true; }
    return false;
  }

  return { init, open, close, isOpen, key, SPEAKERS };
})();
