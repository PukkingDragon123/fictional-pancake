// ---- The cult: devotion, rank and the omen of the day ----------------------
// The grove had a goal and no ladder to it. This is the ladder. Everything you
// already do — feeding them, selling what they leave, getting a tower high
// enough for something to reach — pays devotion, devotion buys rank, and each
// rank hands you something that changes how the rest of it plays.
//
// On top of that, every day the hooded one reads an omen off whatever he reads
// omens off. It lasts the day, it is half good and half not, and it is the
// reason no two days in the wood are quite the same.
const Cult = (() => {
  let G = null;

  // ---- the ladder ---------------------------------------------------------
  const RANKS = [
    { key: 'stray',   name: 'Stray',      at: 0,    perk: 'Nobody has noticed you yet.' },
    { key: 'novice',  name: 'Novice',     at: 40,   perk: 'The hooded one pays 10% more for a cube.', pay: 0.10 },
    { key: 'acolyte', name: 'Acolyte',    at: 140,  perk: 'Wombats stay happy a third longer.', calm: 0.33 },
    { key: 'deacon',  name: 'Deacon',     at: 340,  perk: 'Seed comes up half again as fast.', grow: 0.5 },
    { key: 'warden',  name: 'Warden',     at: 700,  perk: 'The hooded one pays 25% more, and the beds never dry.', pay: 0.25, wet: 1 },
    { key: 'vessel',  name: 'Vessel',     at: 1300, perk: 'Every cube she leaves is blessed.', bless: 1 },
    { key: 'hollow',  name: 'The Hollow', at: 2400, perk: 'They come when you call. All of them.', favor: 1 },
  ];
  // ---- the omens ----------------------------------------------------------
  // Each is one line you can act on, and one number that actually changes.
  const OMENS = [
    { key: 'fat',    name: 'A Fat Moon',      icon: 'ph_moon', good: 1, line: 'Everything she leaves is worth a quarter more today.', pay: 0.25 },
    { key: 'green',  name: 'The Green Hour',  icon: 'ph_garden', good: 1, line: 'Seed doubles its speed until dark.', grow: 1 },
    { key: 'kind',   name: 'A Kind Wind',     icon: 'ph_sun', good: 1, line: 'Nothing gets bored and nothing gets thirsty today.', calm: 1 },
    { key: 'gilt',   name: 'Gilt Morning',    icon: 'ph_larder', good: 1, line: 'One in six cubes comes out gilded.', gilt: 1 },
    { key: 'deep',   name: 'The Deep Listens', icon: 'ph_bell', good: 1, line: 'Devotion counts double while it lasts.', dev: 1 },
    { key: 'sour',   name: 'Sour Ground',     icon: 'ph_rain', good: 0, line: 'The beds drink twice as fast. Keep the can handy.', thirsty: 1 },
    { key: 'hungry', name: 'A Hungry Day',    icon: 'ph_herd', good: 0, line: 'They eat through it faster and sulk sooner.', hungry: 1 },
    { key: 'quiet',  name: 'The Quiet',       icon: 'ph_jobs', good: 0, line: 'He is not buying well today. A fifth off everything.', pay: -0.2 },
    { key: 'crows',  name: 'Too Many Crows',  icon: 'ph_places', good: 0, line: 'Something is taking the fruit. Pick it early.', crows: 1 },
  ];
  const RANK_BY_KEY = Object.fromEntries(RANKS.map((r) => [r.key, r]));
  const OMEN_BY_KEY = Object.fromEntries(OMENS.map((o) => [o.key, o]));

  function init(g) {
    G = g;
    if (typeof G.devotion !== 'number') G.devotion = 0;
    if (!G.rank) G.rank = 'stray';
    if (!G.omen || typeof G.omenDay !== 'number') roll(true);
  }

  // ---- devotion ------------------------------------------------------------
  const rank = () => RANK_BY_KEY[G.rank] || RANKS[0];
  const rankIndex = () => Math.max(0, RANKS.findIndex((r) => r.key === G.rank));
  const nextRank = () => RANKS[rankIndex() + 1] || null;
  function progress() {
    const n = nextRank();
    if (!n) return 1;
    const cur = rank().at;
    return U.clamp((G.devotion - cur) / (n.at - cur), 0, 1);
  }
  // Every perk of every rank you have passed is yours; they stack.
  function perk(key) {
    let v = 0;
    for (let i = 0; i <= rankIndex(); i++) v += RANKS[i][key] || 0;
    const o = omen();
    if (o && o[key]) v += o[key];
    return v;
  }
  function has(key) { return perk(key) > 0; }

  function give(n, why) {
    if (!G || !n) return;
    const o = omen();
    const mult = o && o.dev ? 2 : 1;
    G.devotion += n * mult;
    // one gift can carry you past more than one rank, and each is announced
    let up = null;
    for (let guard = 0; guard < RANKS.length; guard++) {
      const n2 = nextRank();
      if (!n2 || G.devotion < n2.at) break;
      G.rank = n2.key; up = n2;
      UI.toast(`<b>${n2.name}</b> &mdash; ${n2.perk}`, 'good');
    }
    if (up) {
      Audio.play('bless'); Audio.play('chime');
      FX.title(up.name.toUpperCase(), { size: 18, color: PAL.div4, dur: 2.6, style: 'slam', sub: 'the cult knows your name' });
      FX.confettiBurst(320, 150, 70);
      Main.save();
    }
    UI.refreshHUD();
  }

  // ---- the omen ------------------------------------------------------------
  function omen() { return OMEN_BY_KEY[G.omen] || null; }
  function dayNumber() { return Math.floor((G.time || 0) / 720); }
  function roll(silent) {
    const pool = OMENS.filter((o) => o.key !== G.omen);
    const o = pool[Math.floor(Math.random() * pool.length)];
    G.omen = o.key;
    G.omenDay = dayNumber();
    if (silent) return;
    Audio.play(o.good ? 'chime' : 'growl');
    UI.toast(`<b>${o.name}</b> &mdash; ${o.line}`, o.good ? 'good' : 'bad');
  }
  function update() {
    if (!G) return;
    if (dayNumber() !== G.omenDay) roll(false);
  }

  // ---- what the rest of the game asks --------------------------------------
  // A multiplier on what the hooded one pays, which is where most of the
  // money in this game comes from.
  function payMult() { return 1 + perk('pay'); }
  // How much slower a wombat gets bored and thirsty.
  function calmMult() { return 1 / (1 + perk('calm')) * (has('hungry') ? 1.6 : 1); }
  // How much faster things grow.
  function growMult() { return 1 + perk('grow'); }
  // Whether beds hold their water.
  function dryMult() { return has('thirsty') ? 2 : (has('wet') ? 0 : 1); }
  // Whether what she leaves comes out blessed, and whether it comes out gilded.
  function blessed() { return has('bless') || (has('gilt') && Math.random() < 0.17); }

  return {
    init, update, give, roll, omen, rank, nextRank, progress, perk, has,
    payMult, calmMult, growMult, dryMult, blessed,
    get devotion() { return G ? G.devotion : 0; },
    RANKS, OMENS,
  };
})();
