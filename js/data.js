// ---- Balance data. Icon keys everywhere, almost no prose. -----------------
const CUBE_SIZE = 24;

// Offerings: what a wombat leaves behind, and what you stack at the shrine.
const OFFERINGS = {
  plain: { key: 'plain', name: 'Plain', icon: 'o_plain', mark: '', w: 1, h: 1, density: 1, friction: 0.62, restitution: 0.02, adhesion: 0, value: 6, color: '#553d27' },
  rich:  { key: 'rich', name: 'Rich', icon: 'o_rich', mark: '', w: 1.45, h: 1.45, density: 1, friction: 0.66, restitution: 0.02, adhesion: 0, value: 13, color: '#3b2a1b' },
  resin: { key: 'resin', name: 'Resin', icon: 'o_resin', mark: 'sticky', w: 1, h: 1, density: 1, friction: 1.3, restitution: 0, adhesion: 1600, value: 11, color: '#a97c1e' },
  husk:  { key: 'husk', name: 'Husk', icon: 'o_husk', mark: 'light', w: 1, h: 1, density: 0.4, friction: 0.7, restitution: 0.04, adhesion: 0, value: 8, color: '#d8c69c' },
  stone: { key: 'stone', name: 'Stone', icon: 'o_stone', mark: 'stone', w: 1, h: 1, density: 2.6, friction: 0.88, restitution: 0, adhesion: 0, value: 10, color: '#443e52' },
  slab:  { key: 'slab', name: 'Slab', icon: 'o_slab', mark: 'slab', w: 2.4, h: 0.6, density: 1, friction: 0.72, restitution: 0.02, adhesion: 0, value: 15, color: '#436f2f' },
  gold:  { key: 'gold', name: 'Gilded', icon: 'o_gold', mark: 'gold', w: 1, h: 1, density: 1.9, friction: 0.58, restitution: 0.02, adhesion: 0, value: 48, sell: 60, color: '#d8a52f' },
  rune:  { key: 'rune', name: 'Rune', icon: 'o_rune', mark: 'rune', w: 1, h: 1, density: 1.2, friction: 0.8, restitution: 0.02, adhesion: 400, value: 70, sell: 90, color: '#563391' },
};
const OFFER_ORDER = ['plain', 'rich', 'resin', 'husk', 'stone', 'slab', 'gold', 'rune'];

// Crops you sow into the ground with a dragged brush.
const CROPS = [
  { key: 'ashgrass',  name: 'Ashgrass',  icon: 'c_ashgrass',  seed: 2,   grow: 26,  yield: 2, offering: 'plain', hap: 3,  restore: 0,    color: '#84bb59' },
  { key: 'sunroot',   name: 'Sunroot',   icon: 'c_sunroot',   seed: 8,   grow: 40,  yield: 2, offering: 'rich',  hap: 7,  restore: 0.08, color: '#d8a52f' },
  { key: 'resinbud',  name: 'Resinbud',  icon: 'c_resinbud',  seed: 14,  grow: 46,  yield: 2, offering: 'resin', hap: 8,  restore: 0.14, color: '#a97c1e' },
  { key: 'duskhusk',  name: 'Duskhusk',  icon: 'c_duskhusk',  seed: 12,  grow: 38,  yield: 2, offering: 'husk',  hap: 5,  restore: 0.14, color: '#cfc4b0' },
  { key: 'ironbulb',  name: 'Ironbulb',  icon: 'c_ironbulb',  seed: 20,  grow: 56,  yield: 2, offering: 'stone', hap: 4,  restore: 0.24, color: '#625a72' },
  { key: 'broadleaf', name: 'Broadleaf', icon: 'c_broadleaf', seed: 24,  grow: 52,  yield: 2, offering: 'slab',  hap: 7,  restore: 0.32, color: '#436f2f' },
  { key: 'goldwheat', name: 'Goldwheat', icon: 'c_goldwheat', seed: 46,  grow: 70,  yield: 2, offering: 'gold',  hap: 12, restore: 0.5,  color: '#f5cd5c' },
  { key: 'runeberry', name: 'Runeberry', icon: 'c_runeberry', seed: 90,  grow: 80,  yield: 2, offering: 'rune',  hap: 14, restore: 0.7,  god: 'demewombra', color: '#8354c9' },
];
const CROP_BY_KEY = Object.fromEntries(CROPS.map((c) => [c.key, c]));

// Brushes. Everything is painted or dragged; nothing snaps to a grid.
const TOOLS = [
  { key: 'hand',  name: 'Hand',    icon: 't_hand',  radius: 0,  desc: 'Pet, harvest, pick up.' },
  { key: 'sickle', name: 'Sickle', icon: 't_sickle', radius: 22, desc: 'Clear weeds.' },
  { key: 'net',   name: 'Net',     icon: 't_net',   radius: 24, desc: 'Catch bugs.' },
  { key: 'hoe',   name: 'Hoe',     icon: 't_hoe',   radius: 15, desc: 'Till soil.' },
  { key: 'moss',  name: 'Moss',    icon: 't_moss',  radius: 19, desc: 'Sow grass. Restores the forest.' },
  { key: 'seed',  name: 'Seeds',   icon: 't_seed',  radius: 13, desc: 'Sow the chosen crop on tilled soil.' },
  { key: 'water', name: 'Water',   icon: 't_water', radius: 22, desc: 'Water crops.' },
  { key: 'pair',  name: 'Pair',    icon: 't_pair',  radius: 0,  locked: 'nest', desc: 'Pair two adults.' },
];

// ---- The ten Wombat Gods -------------------------------------------------
// Each wants a specific stack of offerings. Summoning grants a standing
// blessing and drops an artifact you can pawn.
const GODS = [
  {
    key: 'demewombra', name: 'Demewombra', title: 'Of the Harvest', crown: 'sheaf',
    color: '#5d9440', eye: '#f5cd5c', glyph: 'g_harvest', artIcon: 'a_sheaf', artifact: 'Golden Sheaf', artValue: 220,
    blessing: 'Crops ripen twice as fast.', ritual: { plain: 6, rich: 2 }, tier: 1,
  },
  {
    key: 'burrowseidon', name: 'Burrowseidon', title: 'Of Deep Water', crown: 'trident',
    color: '#3fa8ba', eye: '#c2f4ff', glyph: 'g_tide', artIcon: 'a_shell', artifact: 'Tide Shell', artValue: 260,
    blessing: 'Rain waters the whole grove.', ritual: { plain: 6, husk: 3 }, tier: 1,
  },
  {
    key: 'apollowomb', name: 'Apollowomb', title: 'Of Sun and Song', crown: 'rays',
    color: '#f5cd5c', eye: '#fff3c4', glyph: 'g_sun', artIcon: 'a_lyre', artifact: 'Sun Lyre', artValue: 300,
    blessing: 'Wombats digest half again as fast.', ritual: { rich: 4, resin: 2 }, tier: 2,
  },
  {
    key: 'artewombis', name: 'Artewombis', title: 'Of Moon and Hunt', crown: 'crescent',
    color: '#79dced', eye: '#ffffff', glyph: 'g_moon', artIcon: 'a_bow', artifact: 'Moon Bow', artValue: 340,
    blessing: 'Bugs keep out of the grove.', ritual: { husk: 5, resin: 2 }, tier: 2,
  },
  {
    key: 'wombeus', name: 'Wombeus', title: 'Of the Storm', crown: 'bolt',
    color: '#d8a52f', eye: '#ffffff', glyph: 'g_storm', artIcon: 'a_acorn', artifact: 'Thunder Acorn', artValue: 420,
    blessing: 'Lightning seeds grass across bare ground.', ritual: { stone: 4, gold: 1, rich: 3 }, tier: 3,
  },
  {
    key: 'hephaeswomb', name: 'Hephaeswomb', title: 'Of the Forge', crown: 'hammer',
    color: '#b8412c', eye: '#f5cd5c', glyph: 'g_forge', artIcon: 'a_ember', artifact: 'Forge Ember', artValue: 380,
    blessing: 'Every brush works twice as wide.', ritual: { stone: 6, slab: 2 }, tier: 3,
  },
  {
    key: 'athenwomb', name: 'Athenwomb', title: 'Of Quiet Wisdom', crown: 'laurel',
    color: '#84bb59', eye: '#c2f4ff', glyph: 'g_wisdom', artIcon: 'a_owl', artifact: 'Owl Totem', artValue: 460,
    blessing: 'One more fruit ripens on the Tree.', ritual: { slab: 4, resin: 4 }, tier: 4,
  },
  {
    key: 'aphrowombite', name: 'Aphrowombite', title: 'Of Fond Company', crown: 'heart',
    color: '#e0705a', eye: '#ffe1ea', glyph: 'g_love', artIcon: 'a_locket', artifact: 'Heart Locket', artValue: 520,
    blessing: 'Every pairing brings twins.', ritual: { rich: 6, gold: 2 }, tier: 4,
  },
  {
    key: 'chonkades', name: 'Chonkades', title: 'Of the Under-Burrow', crown: 'helm',
    color: '#625a72', eye: '#b98ef0', glyph: 'g_under', artIcon: 'a_obsidian', artifact: 'Obsidian Cube', artValue: 640,
    blessing: 'Gold seams surface in tilled soil.', ritual: { stone: 8, gold: 3 }, tier: 5,
  },
  {
    key: 'wombonysus', name: 'Wombonysus', title: 'Of the Long Feast', crown: 'vine',
    color: '#8354c9', eye: '#e6d6ff', glyph: 'g_feast', artIcon: 'a_chalice', artifact: 'Vine Chalice', artValue: 800,
    blessing: 'Offerings at the shrine pay double.', ritual: { rune: 3, gold: 4, slab: 3 }, tier: 5,
  },
];
const GOD_BY_KEY = Object.fromEntries(GODS.map((g) => [g.key, g]));

// ---- Tree of Knowledge: skills hang as fruit on the root network ---------
// `at` is the restoration fraction the fruit needs before it ripens.
const FRUITS = [
  { key: 'broadbrush', root: 0, i: 0, cost: 60,   at: 0.02, icon: 'f_brush',  name: 'Broad Brush',  desc: 'Every brush reaches wider.' },
  { key: 'deeproots',  root: 0, i: 1, cost: 180,  at: 0.12, icon: 'f_roots',  name: 'Deep Roots',   desc: 'Grass spreads on its own.' },
  { key: 'quickseed',  root: 0, i: 2, cost: 420,  at: 0.25, icon: 'f_seed',   name: 'Quick Seed',   desc: 'Crops ripen a third faster.' },
  { key: 'greenwake',  root: 0, i: 3, cost: 900,  at: 0.45, icon: 'f_wake',   name: 'Green Wake',   desc: 'Walking wombats leave grass behind.' },
  { key: 'softpaws',   root: 1, i: 0, cost: 80,   at: 0.04, icon: 'f_paw',    name: 'Soft Paws',    desc: 'Petting soothes twice as much.' },
  { key: 'deepgut',    root: 1, i: 1, cost: 220,  at: 0.14, icon: 'f_gut',    name: 'Deep Gut',     desc: 'Digestion runs a quarter faster.' },
  { key: 'twinfall',   root: 1, i: 2, cost: 520,  at: 0.28, icon: 'f_twin',   name: 'Twin Fall',    desc: 'Offerings sometimes come in pairs.' },
  { key: 'longlife',   root: 1, i: 3, cost: 1100, at: 0.5,  icon: 'f_heart',  name: 'Fond Herd',    desc: 'Joeys grow up twice as quickly.' },
  { key: 'steadyclaw', root: 2, i: 0, cost: 90,   at: 0.06, icon: 'f_claw',   name: 'Steady Claw',  desc: 'The shrine crane is slower and level.' },
  { key: 'wideplinth', root: 2, i: 1, cost: 260,  at: 0.16, icon: 'f_plinth', name: 'Wide Plinth',  desc: 'A broader shrine plinth.' },
  { key: 'seersight',  root: 2, i: 2, cost: 600,  at: 0.3,  icon: 'f_eye',    name: 'Seer Sight',   desc: 'A landing guide, and a fourth blessing to choose from.' },
  { key: 'godtongue',  root: 2, i: 3, cost: 1300, at: 0.55, icon: 'f_tongue', name: 'God Tongue',   desc: 'Rituals need one fewer of each offering.' },
];
const ROOT_NAMES = ['Soil', 'Beast', 'Rite'];

// ---- Things to buy with W$ ------------------------------------------------
const UPGRADES = [
  { key: 'shrine',  name: 'Shrine',   icon: 'u_shrine',  base: 260, mult: 2.3,  max: 5, desc: (l) => `Plinth ${l}. Taller stacks stand.` },
  { key: 'burrow',  name: 'Burrow',   icon: 'u_burrow',  base: 150, mult: 2.25, max: 6, desc: (l) => `Room for ${2 + l} wombats.` },
  { key: 'trough',  name: 'Trough',   icon: 'u_trough',  base: 240, mult: 2.1,  max: 4, desc: (l) => l ? `Feeds one wombat every ${(15 / l).toFixed(0)}s.` : 'Feeds hungry wombats.' },
  { key: 'cart',    name: 'Cart',     icon: 'u_cart',    base: 170, mult: 2.4,  max: 3, desc: (l) => l >= 3 ? 'Instant pickup, +10% value.' : l ? `Gathers after ${(4 / l).toFixed(1)}s.` : 'Gathers offerings for you.' },
  { key: 'seats',   name: 'Seats',    icon: 'u_seats',   base: 320, mult: 1.95, max: 8, desc: (l) => `Seats ${30 + l * 26}. Favour +${l * 12}%.` },
];
const DECOR = [
  { key: 'nest',    name: 'Nest',      icon: 'd_nest',    cost: 300,  unlocks: 'pair', desc: 'Pair two adults to breed.', spot: [0.16, 0.62] },
  { key: 'brazier', name: 'Brazier',   icon: 'd_brazier', cost: 220,  hap: 0.4, desc: 'Warmth. Happier wombats.', spot: [0.34, 0.2] },
  { key: 'stones',  name: 'Standing Stones', icon: 'd_stones', cost: 700, favor: 0.15, desc: 'Rituals gather a bigger crowd.', spot: [0.76, 0.18] },
  { key: 'pool',    name: 'Still Pool', icon: 'd_pool',   cost: 520,  hap: 0.6, desc: 'Cool water. Much happier wombats.', spot: [0.86, 0.5] },
  { key: 'idol',    name: 'Old Idol',  icon: 'd_idol',    cost: 1400, favor: 0.3, desc: 'The gods notice sooner.', spot: [0.58, 0.14] },
];
const WOMBAT_PRICE = (n) => Math.round(180 * Math.pow(2.5, Math.max(0, n - 1)));

// ---- Shrine run: obstacles, goals, cupid blessings ------------------------
const OBSTACLES = [
  { key: 'censer', name: 'Censer', from: 4, desc: 'A swinging censer.' },
  { key: 'gust',   name: 'Gust',   from: 6, desc: 'Wind across the grove.' },
  { key: 'stones', name: 'Falling stone', from: 9, desc: 'Debris from the canopy.' },
  { key: 'tremor', name: 'Tremor', from: 13, desc: 'The ground shifts.' },
];
const GOALS = [
  { key: 'reach',  gen: (n) => ({ text: `Reach ${n}`, need: n, kind: 'height', pay: 40 * n }) },
  { key: 'run',    gen: (n) => ({ text: `${n} in a row`, need: n, kind: 'streak', pay: 55 * n }) },
  { key: 'centre', gen: (n) => ({ text: `${n} centred`, need: n, kind: 'centre', pay: 70 * n }) },
  { key: 'heavy',  gen: (n) => ({ text: `${n} stone`, need: n, kind: 'stone', pay: 60 * n }) },
];
const CUPID_BOONS = [
  { key: 'slow',   name: 'Held Breath', icon: 'b_slow',   dur: 12, desc: 'Time crawls.' },
  { key: 'magnet', name: 'Lodestone',   icon: 'b_magnet', dur: 14, desc: 'Offerings drift to centre.' },
  { key: 'tacky',  name: 'Sap Hands',   icon: 'b_tacky',  dur: 16, desc: 'Everything clings.' },
  { key: 'double', name: 'Rich Favour', icon: 'b_double', dur: 12, desc: 'Double pay.' },
  { key: 'shield', name: 'Ward',        icon: 'b_shield', dur: 18, desc: 'One fall forgiven.' },
  { key: 'feather', name: 'Light Fall', icon: 'b_feather', dur: 14, desc: 'Offerings drift down.' },
];

// ---- Breeding -------------------------------------------------------------
const TRAITS = [
  { key: 'gut',   name: 'Gut',   min: 0.7, max: 1.4 },   // digestion multiplier
  { key: 'calm',  name: 'Calm',  min: 0.6, max: 1.5 },   // happiness decay resistance
  { key: 'luck',  name: 'Luck',  min: 0.6, max: 1.6 },   // premium offering chance
];
const GROW_TIME = { baby: 95, juvenile: 150 };
const RARE_CHANCE = 0.07;

const NAMES = ['Wilbur', 'Doris', 'Chonk', 'Beans', 'Mabel', 'Gus', 'Pudding', 'Winnie', 'Bruce', 'Nugget', 'Sheila', 'Tubs', 'Barnaby', 'Pip', 'Marge', 'Otis', 'Bramble', 'Kip', 'Nella', 'Dot'];
const RESTORE_TARGET = 108000;  // painted grass pixels that count as a whole forest
                                // (the ground is about 150k, so this is most of it)
