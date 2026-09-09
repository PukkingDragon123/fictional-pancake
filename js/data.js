// ---- Balance data: gods, crops, tools, fruit, traits, offerings ------------
// Prices are in W$. Everything the game can name lives here, so the scene
// modules stay about behaviour and this file stays about design.
const CUBE_SIZE = 24;

// ---- Offerings ------------------------------------------------------------
// What a wombat leaves behind after it eats. They are dung, and they are also
// the only currency the gods accept, which nobody in the grove finds strange.
const OFFERINGS = {
  husk:      { key: 'husk',      name: 'Husk',       icon: 'o_husk',      mark: 'plain',  w: 1,    h: 1,    density: 1,   friction: 0.62, restitution: 0.02, adhesion: 0,    value: 7,  fruit: 1, color: '#6b5f52', desc: 'Dependable. Sits square.' },
  boulder:   { key: 'boulder',   name: 'Boulder',    icon: 'o_boulder',   mark: 'wide',   w: 1.45, h: 1.45, density: 1,   friction: 0.66, restitution: 0.02, adhesion: 0,    value: 15, fruit: 2, color: '#4e4757', desc: 'Broad footing. Heavy up high.' },
  resin:     { key: 'resin',     name: 'Resin',      icon: 'o_resin',     mark: 'sticky', w: 1,    h: 1,    density: 1,   friction: 1.3,  restitution: 0,    adhesion: 1600, value: 13, fruit: 2, color: '#a2761a', desc: 'Clings to whatever it lands on.' },
  pith:      { key: 'pith',      name: 'Pith',       icon: 'o_pith',      mark: 'light',  w: 1,    h: 1,    density: 0.4, friction: 0.7,  restitution: 0.04, adhesion: 0,    value: 9,  fruit: 1, color: '#c0b8a6', desc: 'Barely presses down. Gust bait.' },
  iron:      { key: 'iron',      name: 'Ironstone',  icon: 'o_iron',      mark: 'iron',   w: 1,    h: 1,    density: 2.6, friction: 0.88, restitution: 0,    adhesion: 0,    value: 12, fruit: 2, color: '#4b4753', desc: 'Anchors a base. Crushes a weak top.' },
  slab:      { key: 'slab',      name: 'Slab',       icon: 'o_slab',      mark: 'slab',   w: 2.4,  h: 0.6,  density: 1,   friction: 0.72, restitution: 0.02, adhesion: 0,    value: 17, fruit: 2, color: '#3a7a38', desc: 'Turns a wobbling top into a floor.' },
  ossuary:   { key: 'ossuary',   name: 'Ossuary',    icon: 'o_ossuary',   mark: 'bone',   w: 1.1,  h: 1.1,  density: 1.4, friction: 0.8,  restitution: 0,    adhesion: 400,  value: 26, fruit: 3, color: '#948d80', desc: 'Left by elders. The dead hold on.' },
  reliquary: { key: 'reliquary', name: 'Reliquary',  icon: 'o_reliquary', mark: 'gold',   w: 1,    h: 1,    density: 1.9, friction: 0.58, restitution: 0.02, adhesion: 0,    value: 58, fruit: 4, color: '#e6b73c', desc: 'Pure favour. Put it somewhere safe.' },
  sacrament: { key: 'sacrament', name: 'Sacrament',  icon: 'o_sacrament', mark: 'holy',   w: 1.1,  h: 1.1,  density: 0.9, friction: 0.95, restitution: 0,    adhesion: 900,  value: 96, fruit: 6, color: '#6a35ab', desc: 'Only a blessed wombat can leave one.' },
};
const OFFER_ORDER = ['husk', 'boulder', 'resin', 'pith', 'iron', 'slab', 'ossuary', 'reliquary', 'sacrament'];

// ---- Crops ----------------------------------------------------------------
// Sown into tilled soil with the seed pouch. A crop grows in place, a wombat
// walks over and eats it, and some hours later the crop comes back as an
// offering. `restore` is how much moss the crop leaves in the ground when it
// is eaten, which is the whole restoration loop in one number.
const CROPS = [
  { key: 'ashgrass',  name: 'Ashgrass',   icon: 'c_ashgrass',  seed: 2,   grow: 14, digest: 18, offering: 'husk',      hap: 2,  fruit: 0, restore: 0.5, unlock: 0,    desc: 'Grows in anything. Tastes of nothing.' },
  { key: 'tuber',     name: 'Grey Tuber', icon: 'c_tuber',     seed: 6,   grow: 20, digest: 11, offering: 'husk',      hap: 6,  fruit: 1, restore: 0.7, unlock: 0,    desc: 'The same husk, twice as fast.' },
  { key: 'moonfern',  name: 'Moonfern',   icon: 'c_moonfern',  seed: 11,  grow: 26, digest: 16, offering: 'pith',      hap: 5,  fruit: 1, restore: 0.9, unlock: 120,  desc: 'Airy fronds. Opens at dusk.' },
  { key: 'bloodbeet', name: 'Bloodbeet',  icon: 'c_bloodbeet', seed: 16,  grow: 30, digest: 26, offering: 'boulder',   hap: 8,  fruit: 1, restore: 1.1, unlock: 260,  desc: 'A heavy meal. Stains the soil red.' },
  { key: 'gourd',     name: 'Combgourd',  icon: 'c_gourd',     seed: 22,  grow: 34, digest: 24, offering: 'resin',     hap: 10, fruit: 1, restore: 1.2, unlock: 430,  desc: 'Sticky in, sticky out.' },
  { key: 'ironroot',  name: 'Ironroot',   icon: 'c_ironroot',  seed: 28,  grow: 40, digest: 30, offering: 'iron',      hap: 3,  fruit: 2, restore: 1.0, unlock: 640,  desc: 'Pulls metal up out of the ash.' },
  { key: 'shelfcap',  name: 'Shelf Cap',  icon: 'c_shelfcap',  seed: 34,  grow: 44, digest: 28, offering: 'slab',      hap: 7,  fruit: 2, restore: 1.4, unlock: 900,  desc: 'Grows flat and wide, like a shelf.' },
  { key: 'bonemelon', name: 'Bonemelon',  icon: 'c_bonemelon', seed: 52,  grow: 52, digest: 34, offering: 'ossuary',   hap: 9,  fruit: 3, restore: 1.6, unlock: 1300, desc: 'Rinds like a ribcage. Elders love it.' },
  { key: 'glasscorn', name: 'Glass Corn', icon: 'c_glasscorn', seed: 80,  grow: 60, digest: 38, offering: 'reliquary', hap: 14, fruit: 4, restore: 2.0, unlock: 1900, desc: 'A rich diet pays a rich tithe.' },
];
const CROP_BY_KEY = Object.fromEntries(CROPS.map((c) => [c.key, c]));

// ---- Tools ----------------------------------------------------------------
// The brush. Each tool paints the ground with a dithered stamp; level buys
// radius, and radius is the only thing that ever makes the grove feel faster.
const TOOLS = [
  { key: 'censer', name: 'Censer',     icon: 't_censer', base: 0,   mult: 2.2, max: 4, r: [22, 28, 36, 46, 58], cost: 0, verb: 'Sweep', desc: (l) => `Burns ash off a ${[22, 28, 36, 46, 58][l]}px patch.` },
  { key: 'trowel', name: 'Trowel',     icon: 't_trowel', base: 40,  mult: 2.4, max: 4, r: [16, 21, 27, 34, 43], cost: 0, verb: 'Till',  desc: (l) => `Turns bare ground into soil, ${[16, 21, 27, 34, 43][l]}px at a stroke.` },
  { key: 'pouch',  name: 'Seed Pouch', icon: 't_pouch',  base: 90,  mult: 2.6, max: 3, r: [1, 2, 3, 5],         cost: 0, verb: 'Sow',   desc: (l) => `Sows ${[1, 2, 3, 5][l]} seed${l ? 's' : ''} a stroke.` },
  { key: 'can',    name: 'Rain Can',   icon: 't_can',    base: 160, mult: 2.5, max: 3, r: [26, 34, 44, 58],     cost: 0, verb: 'Water', desc: (l) => `Crops in a ${[26, 34, 44, 58][l]}px circle grow at double speed.` },
  { key: 'sickle', name: 'Sickle',     icon: 't_sickle', base: 220, mult: 2.5, max: 3, r: [20, 26, 34, 44],     cost: 0, verb: 'Reap',  desc: (l) => `Cuts weeds and lifts ripe crops in a ${[20, 26, 34, 44][l]}px sweep.` },
];
const TOOL_BY_KEY = Object.fromEntries(TOOLS.map((t) => [t.key, t]));
const toolRadius = (key, lvl) => { const t = TOOL_BY_KEY[key]; return t.r[Math.min(lvl, t.r.length - 1)]; };
const toolCost = (t, lvl) => Math.round(t.base * Math.pow(t.mult, lvl));

// ---- The ten ---------------------------------------------------------------
// Each god sleeps under the ash until its ritual is paid. `ritual` is the
// offering bill; `favour` is what the shrine needs banked first, which is how
// the order of summoning is gated without a hard tech tree.
const GODS = [
  {
    key: 'bhur', name: 'Bhur', title: 'the Ash Mother', domain: 'Soil',
    robe0: '#4e4757', robe1: '#37313f', trim: '#8b8397', skin: '#c0b8a6',
    mask: 'veil', halo: 'disc', arms: 2, holds: 'bowl',
    verse: 'She lay down over the fields so nothing green would see what happened next.',
    favour: 0, ritual: { husk: 6, pith: 2 },
    blessing: { key: 'settled', name: 'Settled Ground', desc: 'Tilled soil never returns to ash.' },
    artifact: { key: 'ashbowl', name: 'Ashen Bowl', desc: 'The censer sweeps twice as wide.' },
  },
  {
    key: 'velun', name: 'Velun', title: 'the Green Ache', domain: 'Growth',
    robe0: '#265229', robe1: '#17321c', trim: '#82cd63', skin: '#93bd7c',
    mask: 'antler', halo: 'thorn', arms: 2, holds: 'seed',
    verse: 'It hurts, coming back. Velun is the name for the hurting.',
    favour: 120, ritual: { husk: 10, boulder: 4 },
    blessing: { key: 'quicken', name: 'Quickening', desc: 'Every crop grows 40% faster.' },
    artifact: { key: 'greenpin', name: 'Thorn Pin', desc: 'Seeds cost half.' },
  },
  {
    key: 'marrow', name: 'Marrow', title: 'the Bone King', domain: 'Death',
    robe0: '#37313f', robe1: '#241f2a', trim: '#e2dac6', skin: '#948d80',
    mask: 'skull', halo: 'ring', arms: 2, holds: 'staff',
    verse: 'He keeps every wombat that ever was, and lends a few back.',
    favour: 300, ritual: { ossuary: 3, iron: 4 },
    blessing: { key: 'relic', name: 'Kept Bones', desc: 'An elder that passes leaves an Ossuary and its name is remembered.' },
    artifact: { key: 'tally', name: 'Bone Tally', desc: 'Elders keep working at full speed.' },
  },
  {
    key: 'ixi', name: 'Ixi', title: 'the Small Thunder', domain: 'Storm',
    robe0: '#3d1d66', robe1: '#210f38', trim: '#cfa8ff', skin: '#9b62e0',
    mask: 'eye', halo: 'ring', arms: 4, holds: 'staff',
    verse: 'Not a big storm. A storm the size of a paddock, and only ever yours.',
    favour: 520, ritual: { pith: 8, resin: 5 },
    blessing: { key: 'rain', name: 'Kept Rain', desc: 'Rain waters the whole grove every so often.' },
    artifact: { key: 'rod', name: 'Bright Rod', desc: 'The rain can never be used up.' },
  },
  {
    key: 'ombra', name: 'Ombra', title: 'the Long Shadow', domain: 'Night',
    robe0: '#241f2a', robe1: '#0d0a0c', trim: '#6a35ab', skin: '#4e4757',
    mask: 'void', halo: 'horns', arms: 2, holds: null,
    verse: 'Wombats were always a night animal. Ombra only gave the night back.',
    favour: 780, ritual: { iron: 6, boulder: 6 },
    blessing: { key: 'nightwork', name: 'Night Work', desc: 'Wombats digest at full speed after dark.' },
    artifact: { key: 'shade', name: 'Cut Shade', desc: 'Offerings are worth 20% more at night.' },
  },
  {
    key: 'sella', name: 'Sella', title: 'the Gilded Sow', domain: 'Wealth',
    robe0: '#a2761a', robe1: '#6f4d10', trim: '#ffe7a4', skin: '#e6b73c',
    mask: 'sun', halo: 'disc', arms: 2, holds: 'bowl',
    verse: 'She counts. That is the whole of her worship: she counts, and she approves.',
    favour: 1100, ritual: { reliquary: 3, resin: 6 },
    blessing: { key: 'tithe', name: 'Fat Tithe', desc: 'Every offering sells for 35% more.' },
    artifact: { key: 'scale', name: 'Gilded Scale', desc: 'The tower pays double on a cash out.' },
  },
  {
    key: 'nuru', name: 'Nuru', title: 'the Root Listener', domain: 'Knowledge',
    robe0: '#1d3a44', robe1: '#122730', trim: '#6cc6cc', skin: '#589aa6',
    mask: 'eye', halo: 'thorn', arms: 4, holds: 'staff',
    verse: 'Roots talk constantly. Nuru is simply the first to sit still long enough.',
    favour: 1500, ritual: { slab: 6, ossuary: 4 },
    blessing: { key: 'listen', name: 'Listening', desc: 'Every harvest yields one extra fruit.' },
    artifact: { key: 'ear', name: 'Root Ear', desc: 'Fruit skills cost one fruit less.' },
  },
  {
    key: 'cupra', name: 'Cupra', title: 'the Twinned Heart', domain: 'Love',
    robe0: '#7c2230', robe1: '#4a121c', trim: '#d4576b', skin: '#d4576b',
    mask: 'veil', halo: 'ring', arms: 4, holds: 'bowl',
    verse: 'Two wombats, one burrow. Cupra asks for nothing more complicated than that.',
    favour: 2000, ritual: { resin: 8, reliquary: 4 },
    blessing: { key: 'cupids', name: 'Her Cupids', desc: 'Cupids attend the tower and offer blessings mid-run.' },
    artifact: { key: 'knot', name: 'Heart Knot', desc: 'Pairs raise joeys in half the time.' },
  },
  {
    key: 'tolem', name: 'Tolem', title: 'the Stone Patient', domain: 'Stone',
    robe0: '#4b4753', robe1: '#33303a', trim: '#8a8492', skin: '#67626f',
    mask: 'skull', halo: 'disc', arms: 2, holds: 'staff',
    verse: 'Tolem has been holding something up since before there was anything to hold.',
    favour: 2700, ritual: { iron: 10, slab: 8 },
    blessing: { key: 'grip', name: 'Patient Grip', desc: 'Offerings in the tower grip 30% harder.' },
    artifact: { key: 'plinth', name: 'Old Plinth', desc: 'The altar is half again as wide.' },
  },
  {
    key: 'vessa', name: 'Vessa', title: 'the Last Bloom', domain: 'Rebirth',
    robe0: '#6a35ab', robe1: '#3d1d66', trim: '#ffe7a4', skin: '#cfa8ff',
    mask: 'sun', halo: 'thorn', arms: 4, holds: 'seed',
    verse: 'She was the first to leave and she is, by arrangement, the last to come back.',
    favour: 3600, ritual: { sacrament: 1, reliquary: 6, ossuary: 6 },
    blessing: { key: 'bloom', name: 'The Last Bloom', desc: 'A blessed wombat may leave a Sacrament. The grove is finished.' },
    artifact: { key: 'seedcase', name: 'First Seedcase', desc: 'Every crop yields as though it were Glass Corn.' },
  },
];
const GOD_BY_KEY = Object.fromEntries(GODS.map((gd) => [gd.key, gd]));
const GOD_ORDER = GODS.map((gd) => gd.key);

// ---- Traits ---------------------------------------------------------------
// Inherited by joeys, one gene each from either parent, with a small chance of
// something neither parent had. `rare` drives both how often a wild wombat has
// one and how it is coloured in the warren.
const TRAITS = [
  { key: 'stout',   name: 'Stout',    rare: 0, color: '#8b8397', desc: 'Offerings are 20% more valuable.',       eff: { value: 0.2 } },
  { key: 'swift',   name: 'Swift',    rare: 0, color: '#6cc6cc', desc: 'Walks and digests 20% faster.',          eff: { digest: 0.2, speed: 0.35 } },
  { key: 'hungry',  name: 'Hungry',   rare: 0, color: '#d4576b', desc: 'Finds its own crops without being led.', eff: { forage: 1 } },
  { key: 'gentle',  name: 'Gentle',   rare: 0, color: '#82cd63', desc: 'Happiness fades half as fast.',          eff: { calm: 0.5 } },
  { key: 'deep',    name: 'Deepdig',  rare: 0, color: '#75593c', desc: 'Restores twice as much soil as it walks.', eff: { restore: 1 } },
  { key: 'fecund',  name: 'Fecund',   rare: 1, color: '#b8384a', desc: 'Raises joeys 40% faster.',               eff: { breed: 0.4 } },
  { key: 'bright',  name: 'Bright',   rare: 1, color: '#ffe7a4', desc: 'Harvests one extra fruit.',              eff: { fruit: 1 } },
  { key: 'stubborn',name: 'Stubborn', rare: 1, color: '#4b4753', desc: 'Never grumpy, and never hurries.',        eff: { calm: 1, digest: -0.1 } },
  { key: 'longlive',name: 'Longlived',rare: 1, color: '#c0b8a6', desc: 'Ages half as fast.',                     eff: { age: 0.5 } },
  { key: 'holy',    name: 'Hallowed', rare: 2, color: '#9b62e0', desc: 'Can leave a Sacrament once Vessa wakes.', eff: { holy: 1 } },
  { key: 'golden',  name: 'Golden',   rare: 2, color: '#e6b73c', desc: 'One offering in six is a Reliquary.',    eff: { gold: 1 } },
  { key: 'twinned', name: 'Twinned',  rare: 2, color: '#cfa8ff', desc: 'Always bears two joeys.',                eff: { twins: 1 } },
];
const TRAIT_BY_KEY = Object.fromEntries(TRAITS.map((t) => [t.key, t]));

// ---- The root network -----------------------------------------------------
// Bought with fruit, not money. Three roots run down from the shrine; a root
// only opens once that many gods are awake, so knowledge and worship advance
// together instead of racing.
const ROOTS = [
  { key: 'deep',  name: 'Deeproot',  note: 'The ground',   gods: 0, color: '#75593c' },
  { key: 'heart', name: 'Heartwood', note: 'The wombats',  gods: 2, color: '#b8384a' },
  { key: 'sky',   name: 'Skyroot',   note: 'The offerings', gods: 4, color: '#9b62e0' },
];
const FRUIT_SKILLS = [
  { key: 'broad',   root: 0, slot: 0, cost: 1, icon: 'f_broad',   name: 'Broad Stroke', desc: 'Every tool paints 30% wider.' },
  { key: 'compost', root: 0, slot: 1, cost: 2, icon: 'f_compost', name: 'Compost',      desc: 'Eaten crops restore twice as much soil.' },
  { key: 'volunteer', root: 0, slot: 2, cost: 3, icon: 'f_volunteer', name: 'Volunteers', desc: 'Ripe crops sometimes reseed themselves.' },
  { key: 'orchard', root: 0, slot: 3, cost: 4, icon: 'f_orchard', name: 'Orchard',      desc: 'Restored ground grows saplings that drop fruit.' },
  { key: 'wellspring', root: 0, slot: 4, cost: 6, icon: 'f_well', name: 'Wellspring',   desc: 'Watered ground stays watered.' },

  { key: 'paws',    root: 1, slot: 0, cost: 1, icon: 'f_paws',    name: 'Kind Paws',    desc: 'Petting gives more and cuts 3s off digestion.' },
  { key: 'gut',     root: 1, slot: 1, cost: 2, icon: 'f_gut',     name: 'Deep Gut',     desc: 'Every wombat digests 25% faster.' },
  { key: 'litter',  root: 1, slot: 2, cost: 3, icon: 'f_litter',  name: 'Litter',       desc: 'A pairing has a 25% chance of twins.' },
  { key: 'lineage', root: 1, slot: 3, cost: 4, icon: 'f_lineage', name: 'Lineage',      desc: 'Joeys inherit three traits instead of two.' },
  { key: 'twindrop', root: 1, slot: 4, cost: 6, icon: 'f_twindrop', name: 'Twin Drop',  desc: '25% chance of a second offering.' },

  { key: 'claw',    root: 2, slot: 0, cost: 1, icon: 'f_claw',    name: 'Steady Claw',  desc: 'The crane is slower and drops level.' },
  { key: 'guide',   root: 2, slot: 1, cost: 2, icon: 'f_guide',   name: 'Drop Guide',   desc: 'Shows where the offering will land.' },
  { key: 'altar',   root: 2, slot: 2, cost: 3, icon: 'f_altar',   name: 'Wide Altar',   desc: 'The altar is 35% wider.' },
  { key: 'gyro',    root: 2, slot: 3, cost: 4, icon: 'f_gyro',    name: 'Gyro Grip',    desc: 'Offerings resist spin and grip 15% harder.' },
  { key: 'choir',   root: 2, slot: 4, cost: 6, icon: 'f_choir',   name: 'Choir',        desc: 'Four cupid blessings to choose from, not three.' },
];

// ---- Tower: obstacles, goals, blessings ------------------------------------
// Obstacles arrive by height, so a run gets harder because it is getting
// better rather than because a timer said so.
const OBSTACLES = [
  { key: 'gust',   name: 'Ash Gust',    icon: 'x_gust',   from: 5,  desc: 'A sideways push that grows with height.' },
  { key: 'fall',   name: 'Ashfall',     icon: 'x_fall',   from: 7,  desc: 'Falling ash nudges whatever it lands on.' },
  { key: 'root',   name: 'Grasping Root', icon: 'x_root', from: 10, desc: 'A root gropes up the tower and tugs.' },
  { key: 'spike',  name: 'Bone Spike',  icon: 'x_spike',  from: 13, desc: 'Spikes rise from the altar floor.' },
  { key: 'quake',  name: 'Deep Quake',  icon: 'x_quake',  from: 16, desc: 'The whole shrine shudders.' },
];
// A goal is offered at the start of a run. Meeting it pays favour, which is
// the only way to afford the later gods.
const COMBO_GOALS = [
  { key: 'three_iron', name: 'Three Deep',   favour: 40,  desc: 'Place three Ironstones with nothing between them.' },
  { key: 'no_slab',    name: 'Unfloored',    favour: 55,  desc: 'Reach eight high without placing a Slab.' },
  { key: 'ten',        name: 'Ten Fold',     favour: 70,  desc: 'Reach ten high.' },
  { key: 'gold_top',   name: 'Crowned',      favour: 85,  desc: 'Finish with a Reliquary on top.' },
  { key: 'five_kinds', name: 'Five Kinds',   favour: 100, desc: 'Place five different offerings in one run.' },
  { key: 'clean',      name: 'Unspilt',      favour: 130, desc: 'Reach nine high without losing a single offering.' },
];
const CUPID_BLESSINGS = [
  { key: 'sap',     name: 'Tree Sap',    icon: 'b_sap',     rare: 0, desc: 'Every offering clings a little.' },
  { key: 'feather', name: 'Feather Fall', icon: 'b_feather', rare: 0, desc: 'Offerings fall slowly until they touch.' },
  { key: 'tithe',   name: 'Rich Tithe',  icon: 'b_tithe',   rare: 0, desc: 'Cash out pays x1.7.' },
  { key: 'bedrock', name: 'Bedrock',     icon: 'b_bedrock', rare: 1, desc: 'The lowest three offerings fuse down.' },
  { key: 'net',     name: 'Held Breath', icon: 'b_net',     rare: 0, desc: 'Two more offerings may fall.' },
  { key: 'gilding', name: 'Gilding',     icon: 'b_gilding', rare: 1, desc: 'Your next three offerings pay like Reliquaries.' },
  { key: 'swell',   name: 'Swell',       icon: 'b_swell',   rare: 0, desc: 'Future offerings are 15% larger.' },
  { key: 'slow',    name: 'Slow Hands',  icon: 'b_slow',    rare: 0, desc: 'The crane moves 40% slower.' },
  { key: 'encore',  name: 'Second Wind', icon: 'b_encore',  rare: 1, desc: 'One collapse is forgiven.' },
  { key: 'lode',    name: 'Lodestone',   icon: 'b_lode',    rare: 0, desc: 'Falling offerings drift to centre.' },
  { key: 'placing', name: 'Steady Hand', icon: 'b_placing', rare: 0, desc: 'Placement pay x1.6.' },
  { key: 'still',   name: 'Still Air',   icon: 'b_still',   rare: 0, desc: 'No gusts for the rest of the run.' },
];

// ---- Warren ---------------------------------------------------------------
const WOMBAT_COST = (n) => Math.round(180 * Math.pow(2.5, n - 1));
const WARREN_CAP = (l) => 4 + l * 2;
const WARREN_COST = (l) => Math.round(240 * Math.pow(2.4, l));
// Seconds a wombat spends in each stage. An adult stays an adult for a long
// time; the point of ageing is the elder, not the churn.
const AGE_SECONDS = { joey: 120, young: 240, adult: 1500 };
const PAIR_SECONDS = 150;
const RARE_CHANCE = [1, 0.06, 0.012];      // by FUR.rare tier
const TRAIT_CHANCE = [1, 0.18, 0.04];      // by TRAITS.rare tier
const MUTATE_CHANCE = 0.12;                // a joey gaining a trait neither parent had
const FAVOUR_PER_OFFERING = 1;
const RESTORE_TARGET = 100;                // percent of the grove
const XP_PER_FRUIT = 1;

const WOMBAT_NAMES = ['Wilbur', 'Doris', 'Chonk', 'Beans', 'Mabel', 'Gus', 'Pudding', 'Winnie', 'Bruce', 'Nugget', 'Sheila', 'Tubs', 'Barnaby', 'Pip', 'Ash', 'Cinder', 'Marrowen', 'Bramble', 'Fennel', 'Quill', 'Dot', 'Hob', 'Nan', 'Orrin'];
const TIPS = [
  'Ironstone low, Pith high.',
  'A Slab makes a fresh floor out of a bad one.',
  'Resin holds a lean together.',
  'Happy wombats leave richer offerings.',
  'Gusts start around five high.',
  'Cash out before the tower does it for you.',
  'Soil only stays soil where a wombat has fed.',
  'A god will not wake for offerings you have already sold.',
  'Elders work slower but leave Ossuaries.',
  'Pair two wombats with the same trait to fix it in the line.',
];
