// ---- Dialogue, and the choices in it ---------------------------------------
// The wood talks to you at the moments that matter: when a god answers, when
// the cult moves you up a rank, and the first time you take a word off one of
// them. It is drawn on the canvas like everything else — a dark room, whoever
// is speaking lit in the middle of it, the line typing itself out, and two or
// three things you can say back. What you say changes something.
const Rite = (() => {
  let G = null;
  const W = 640, H = 360;
  const PX = 3;
  let sc = null;              // the running scene
  let t = 0;

  function init(g) { G = g; }
  const active = () => !!sc;

  // ---- who is talking -------------------------------------------------------
  // Each speaker is a face drawn straight into the scene rather than an asset,
  // so a new one costs four lines instead of a sprite sheet.
  const WHO = {
    hood: { name: 'THE HOODED ONE', col: '#3d1f78', lit: '#9a5cf0', eye: '#e8402a' },
    god:  { name: '', col: '#1d0f38', lit: '#c898ff', eye: '#fff3b8' },
    wood: { name: 'THE WOOD', col: '#2f6122', lit: '#92dc5e', eye: '#ffd95c' },
  };

  // ---- the scenes -----------------------------------------------------------
  // A scene is a list of beats. A beat is a line, or a line with choices on it.
  // A choice carries `then`, which is run when you pick it, and may push a
  // reply beat of its own.
  const SCENES = {
    // the first time the cult moves you up
    rank: (rank) => ([
      { who: 'hood', say: 'You have been counted. They call you ' + rank.name + ' now.' },
      { who: 'hood', say: rank.perk },
      {
        who: 'hood', say: 'Say something. It is customary.',
        choices: [
          { text: 'I did it for the wombats.', tip: '+devotion',
            then: () => { Cult.give(20); }, reply: 'Then you will go further than most of them did.' },
          { text: 'What do I get?', tip: '+coin',
            then: () => { G.wd += 120; UI.pingPurse(); }, reply: 'Take it and stop asking.' },
          { text: 'Nothing.', tip: 'he likes this',
            then: () => { Cult.give(45); }, reply: 'Good. The quiet ones last.' },
        ],
      },
    ]),
    // a god has just taken your tower
    god: (god) => ([
      { who: 'god', name: god.name.toUpperCase(), col: god.color, say: 'SOMETHING VERY LARGE HAS NOTICED YOU.' },
      { who: 'god', name: god.name.toUpperCase(), col: god.color, say: god.blessing },
      {
        who: 'god', name: god.name.toUpperCase(), col: god.color,
        say: 'IT IS WILLING TO GIVE YOU ONE MORE THING.',
        choices: [
          { text: 'A relic I can sell.', tip: 'coin now',
            then: () => { G.wd += Math.round(god.artValue * 0.7); UI.pingPurse(); },
            reply: 'THEN TAKE THE GOLD AND BE COMMON.' },
          { text: 'One of your own wombats.', tip: 'a rare pelt',
            then: () => {
              const rare = FUR.filter((f) => f.rare >= 1);
              Grove.addWombat({ pelt: U.pick(rare).key });
            },
            reply: 'SHE IS YOURS. SHE WAS ALWAYS GOING TO BE.' },
          { text: 'Teach me something.', tip: '+120 devotion',
            then: () => { Cult.give(120); },
            reply: 'THE WORD IS LONG AND YOU WILL FORGET MOST OF IT.' },
        ],
      },
    ]),
    // the first time a god-word comes within reach
    learn: (key, title, line) => ([
      { who: 'wood', say: 'Something has come loose in your head.' },
      { who: 'wood', name: title, say: line },
      {
        who: 'wood', say: 'It is on the wheel with the rest of them now.',
        choices: [
          { text: 'Good.', then: () => { }, reply: 'It usually is, at first.' },
        ],
      },
    ]),
  };

  // ---- running one ----------------------------------------------------------
  function play(list, onDone) {
    if (sc) return;
    sc = { beats: list, i: 0, typed: 0, pick: -1, reply: null, onDone, done: false };
    t = 0;
    G.paused = true;
    FX.letterbox(true);
    Audio.play('chime');
  }
  function rank(r) { play(SCENES.rank(r)); }
  function god(gd) { play(SCENES.god(gd)); }
  function learn(key) {
    const s = SPELL_LEARN[key];
    if (!s) return;
    play(SCENES.learn(key, s[0], s[1]));
  }
  function beat() { return sc ? sc.beats[sc.i] : null; }
  function full() { const b = beat(); return b ? (sc.reply || b.say).length : 0; }

  function advance() {
    if (!sc) return;
    const b = beat();
    const text = sc.reply || b.say;
    if (sc.typed < text.length) { sc.typed = text.length; return; }   // first click fills the line
    if (sc.reply) { sc.reply = null; sc.typed = 0; sc.pick = -1; step(); return; }
    if (b.choices && sc.pick < 0) return;                             // waiting on you
    step();
  }
  function step() {
    sc.i++;
    sc.typed = 0;
    if (sc.i >= sc.beats.length) finish();
  }
  function choose(n) {
    const b = beat();
    if (!b || !b.choices || sc.reply) return;
    const c = b.choices[n];
    if (!c) return;
    sc.pick = n;
    Audio.play('click');
    try { c.then && c.then(); } catch (e) { }
    if (c.reply) { sc.reply = c.reply; sc.typed = 0; }
    else step();
  }
  function finish() {
    const done = sc.onDone;
    sc = null;
    G.paused = false;
    FX.letterbox(false);
    UI.refreshHUD();
    Main.save();
    if (done) done();
  }
  function skip() { if (sc) finish(); }

  function update(dt) {
    if (!sc) return;
    t += dt;
    const b = beat();
    if (!b) { finish(); return; }
    const text = sc.reply || b.say;
    if (sc.typed < text.length) sc.typed = Math.min(text.length, sc.typed + dt * 46);
  }

  // ---- drawing --------------------------------------------------------------
  function render(g) {
    if (!sc) return;
    const b = beat();
    if (!b) return;
    const who = WHO[b.who] || WHO.hood;
    const col = b.col || who.col;
    // the room goes out
    g.fillStyle = 'rgba(8,4,14,0.86)'; g.fillRect(0, 0, W, H);
    // a slow ring of runes behind whoever is talking
    ring(g, W / 2, 118, col);
    // the speaker
    face(g, W / 2, 118, who, col, b.who === 'god');
    // the name, cut across a plank of nothing
    const nm = b.name || who.name;
    if (nm) {
      Font.draw(g, nm, W / 2, 186, { scale: 2, color: '#000000', align: 'center' });
      Font.draw(g, nm, W / 2, 184, { scale: 2, color: b.col || who.lit, align: 'center' });
    }
    // the line, typing itself out
    const text = sc.reply || b.say;
    const shown = text.slice(0, Math.floor(sc.typed));
    const lines = Font.wrap(shown, 520, 1);
    lines.slice(0, 4).forEach((l, i) => {
      Font.draw(g, l, W / 2, 212 + i * 13, { scale: 1, color: '#000000', align: 'center' });
      Font.draw(g, l, W / 2, 211 + i * 13, { scale: 1, color: '#f6e4ba', align: 'center' });
    });
    // what you can say back
    const opts = (!sc.reply && b.choices && sc.typed >= text.length) ? b.choices : null;
    if (opts) {
      opts.forEach((c, i) => {
        const y = 246 + i * 26;
        const hot = sc.hover === i;
        g.fillStyle = '#000000'; g.fillRect(96, y - 3, 448, 23);
        g.fillStyle = hot ? '#3d1f78' : '#1d0f38'; g.fillRect(99, y, 442, 17);
        g.fillStyle = hot ? '#9a5cf0' : '#3d1f78'; g.fillRect(99, y, 442, 2);
        g.fillStyle = hot ? '#c898ff' : '#6b32bd'; g.fillRect(99, y, 3, 17);
        Font.draw(g, String(i + 1), 106, y + 5, { scale: 1, color: hot ? '#ffd95c' : '#6b32bd' });
        Font.draw(g, c.text, 118, y + 5, { scale: 1, color: hot ? '#fffae8' : '#c09b62' });
        if (c.tip) Font.draw(g, c.tip, 532, y + 5, { scale: 1, color: '#ffd95c', align: 'right' });
      });
    } else if (sc.typed >= text.length) {
      const bl = Math.floor(t * 3) % 2;
      Font.draw(g, bl ? '▼' : ' ', W / 2, 262, { scale: 1, color: '#ffd95c', align: 'center' });
    }
  }
  // a hood with nothing in it, or a god, which is a hood with too much in it
  function face(g, cx, cy, who, col, big) {
    const R = big ? 56 : 44;
    // the shoulders
    g.fillStyle = '#000000'; g.fillRect(cx - R - 3, cy - 3, R * 2 + 6, R + 9);
    g.fillStyle = col; g.fillRect(cx - R, cy, R * 2, R + 4);
    g.fillStyle = U.shade(col, 0.28); g.fillRect(cx - R, cy, R * 2, PX);
    // the hood
    for (let y = -R; y < 6; y += PX) {
      const k = (y + R) / (R + 6);
      const ww = Math.round((R * Math.sqrt(Math.max(0, 1 - Math.pow(1 - k, 2)))) / PX) * PX;
      g.fillStyle = '#000000'; g.fillRect(cx - ww - PX, cy + y, ww * 2 + PX * 2, PX);
      g.fillStyle = col; g.fillRect(cx - ww, cy + y, ww * 2, PX);
      if (k > 0.72) { g.fillStyle = U.shade(col, 0.3); g.fillRect(cx - ww, cy + y, PX * 2, PX); }
    }
    // a lit rim all the way round, so it is a hood and not a dome
    for (let y = -R; y < 6; y += PX) {
      const k = (y + R) / (R + 6);
      const ww = Math.round((R * Math.sqrt(Math.max(0, 1 - Math.pow(1 - k, 2)))) / PX) * PX;
      if (ww < PX) continue;
      g.fillStyle = U.shade(col, 0.42);
      g.fillRect(cx - ww, cy + y, PX * 2, PX);
      g.fillStyle = U.shade(col, -0.34);
      g.fillRect(cx + ww - PX * 2, cy + y, PX * 2, PX);
    }
    // the fold of cloth down the front of it
    g.fillStyle = U.shade(col, -0.26);
    g.fillRect(cx - PX, cy - R * 0.18, PX * 2, R * 0.7);
    // the dark inside it
    g.fillStyle = '#000000';
    g.fillRect(cx - R * 0.56, cy - R * 0.62, R * 1.12, R * 0.9);
    g.fillStyle = U.shade(col, -0.5);
    g.fillRect(cx - R * 0.6, cy - R * 0.66, R * 1.2, PX);
    g.fillRect(cx - R * 0.6, cy - R * 0.66, PX, R * 0.94);
    g.fillRect(cx + R * 0.6 - PX, cy - R * 0.66, PX, R * 0.94);
    // and the eyes in the dark
    const blink = Math.sin(t * 1.7) > 0.96 ? 0 : 1;
    if (blink) {
      const ey = cy - R * 0.28, ex = R * 0.26;
      g.fillStyle = who.eye;
      const n = big ? 3 : 1;
      for (let i = 0; i < n; i++) {
        const oy = ey - i * PX * 3;
        g.fillRect(cx - ex - PX, oy, PX * 2, PX * 2);
        g.fillRect(cx + ex - PX, oy, PX * 2, PX * 2);
      }
    }
  }
  // the runes turning slowly behind them
  function ring(g, cx, cy, col) {
    const R = 104;
    const n = 22;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + t * 0.25;
      const x = Math.round((cx + Math.cos(a) * R) / PX) * PX;
      const y = Math.round((cy + Math.sin(a) * R * 0.6) / PX) * PX;
      const lit = (Math.sin(t * 2 + i) + 1) / 2;
      g.fillStyle = U.rgba(U.shade(col, 0.5), 0.45 + lit * 0.55);
      g.fillRect(x, y, PX, PX * 2);
      if (i % 3 === 0) g.fillRect(x - PX, y + PX, PX * 3, PX);
    }
  }

  // ---- input ----------------------------------------------------------------
  function rowAt(y) {
    const b = beat();
    if (!b || !b.choices || sc.reply) return -1;
    const i = Math.floor((y - 243) / 26);
    return (i >= 0 && i < b.choices.length) ? i : -1;
  }
  function move(x, y) { if (sc) sc.hover = (x > 96 && x < 544) ? rowAt(y) : -1; }
  function press(x, y) {
    if (!sc) return;
    const i = (x > 96 && x < 544) ? rowAt(y) : -1;
    if (i >= 0) { choose(i); return; }
    advance();
  }
  function key(k) {
    if (!sc) return false;
    const b = beat();
    if (b && b.choices && !sc.reply && sc.typed >= full()) {
      const n = parseInt(k, 10) - 1;
      if (n >= 0 && n < b.choices.length) { choose(n); return true; }
    }
    if (k === ' ' || k === 'Enter' || k === 'Escape') { advance(); return true; }
    return false;
  }

  return { init, update, render, press, move, key, rank, god, learn, play, skip, active };
})();
