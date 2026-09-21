// ---- Balance data. Icon keys everywhere, almost no prose. -----------------
const CUBE_SIZE = 30;          // one poop cube, and the game's unit of height

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

// ---- What you can grow ----------------------------------------------------
// Three kinds, and they play completely differently.
//
//   crop    a vegetable. Quick, cheap, forgiving. You pick it once and it is
//           gone. This is the bread and butter of feeding a wombat.
//   tree    a fruit tree. Slow, expensive, and it wants looking after — water
//           and a prune — but once it is established it fruits forever.
//   magic   something that should not be in a garden. Each one has a growing
//           requirement of its own and does something to the grove once grown.
//
// Every plant maps to an `offering`: what the wombat leaves after eating it.
const PLANT_KINDS = {
  crop:  { name: 'Crop',        icon: 't_seed',  blurb: 'quick, easy, picked once' },
  tree:  { name: 'Fruit Tree',  icon: 'c_broadleaf', blurb: 'slow, needs care, fruits forever' },
  magic: { name: 'Magical',     icon: 'c_runeberry', blurb: 'strange requirements, strange gifts' },
};
const CROPS = [
  // ---- vegetables ---------------------------------------------------------
  { kind: 'crop', key: 'ashgrass',  name: 'Ashgrass',  icon: 'c_ashgrass',  seed: 2,  grow: 26, yield: 2, offering: 'plain', hap: 3,  restore: 0,    color: '#84bb59', blurb: 'Hardy native grass. Grows in anything.' },
  { kind: 'crop', key: 'carrot',    name: 'Carrot',    icon: 'c_carrot',    seed: 6,  grow: 34, yield: 3, offering: 'rich',  hap: 6,  restore: 0.06, color: '#e0763a', blurb: 'Sweet, orange, and they will eat the tops as well.' },
  { kind: 'crop', key: 'cabbage',   name: 'Cabbage',   icon: 'c_cabbage',   seed: 9,  grow: 42, yield: 2, offering: 'slab',  hap: 8,  restore: 0.12, color: '#8fc47a', blurb: 'One cabbage will keep a wombat busy for an hour.' },
  { kind: 'crop', key: 'potato',    name: 'Potato',    icon: 'c_potato',    seed: 7,  grow: 46, yield: 4, offering: 'husk',  hap: 5,  restore: 0.1,  color: '#c9a46a', blurb: 'Four to a plant. Keeps in the shed for a year.' },
  { kind: 'crop', key: 'sunroot',   name: 'Sunroot',   icon: 'c_sunroot',   seed: 8,  grow: 40, yield: 2, offering: 'rich',  hap: 7,  restore: 0.08, color: '#d8a52f', blurb: 'A yellow tuber that tastes of honey and dirt.' },
  { kind: 'crop', key: 'pumpkin',   name: 'Pumpkin',   icon: 'c_pumpkin',   seed: 18, grow: 62, yield: 2, offering: 'stone', hap: 11, restore: 0.2,  color: '#e08a2a', blurb: 'Enormous. Takes its time. Worth it.' },
  { kind: 'crop', key: 'resinbud',  name: 'Resinbud',  icon: 'c_resinbud',  seed: 14, grow: 46, yield: 2, offering: 'resin', hap: 8,  restore: 0.14, color: '#a97c1e', blurb: 'Sticky. The cubes come out sticky too.' },
  { kind: 'crop', key: 'duskhusk',  name: 'Duskhusk',  icon: 'c_duskhusk',  seed: 12, grow: 38, yield: 2, offering: 'husk',  hap: 5,  restore: 0.14, color: '#cfc4b0', blurb: 'Pale husks that rattle when the wind gets up.' },
  { kind: 'crop', key: 'ironbulb',  name: 'Ironbulb',  icon: 'c_ironbulb',  seed: 20, grow: 56, yield: 2, offering: 'stone', hap: 4,  restore: 0.24, color: '#625a72', blurb: 'Heavy as a rock and about as popular.' },
  { kind: 'crop', key: 'broadleaf', name: 'Broadleaf', icon: 'c_broadleaf', seed: 24, grow: 52, yield: 2, offering: 'slab',  hap: 7,  restore: 0.32, color: '#436f2f', blurb: 'Big flat leaves. Good shade for a small wombat.' },
  { kind: 'crop', key: 'goldwheat', name: 'Goldwheat', icon: 'c_goldwheat', seed: 46, grow: 70, yield: 2, offering: 'gold',  hap: 12, restore: 0.5,  color: '#f5cd5c', blurb: 'Slow, expensive, and it pays.' },

  // ---- fruit trees --------------------------------------------------------
  // `fruitEvery` seconds between crops once grown, `thirsty` how fast it dries,
  // and they want pruning or the yield drops off.
  { kind: 'tree', key: 'apple',   name: 'Apple Tree',  icon: 'c_apple',   seed: 140, grow: 190, yield: 3, fruitEvery: 62, offering: 'rich',  hap: 14, restore: 1.2, thirsty: 1.3, leaf: '#4e7a3a', color: '#d8402f', blurb: 'Takes three minutes to establish. Then apples, forever.' },
  { kind: 'tree', key: 'plum',    name: 'Plum Tree',   icon: 'c_plum',    seed: 165, grow: 210, yield: 3, fruitEvery: 70, offering: 'resin', hap: 15, restore: 1.3, thirsty: 1.4, leaf: '#3f6a44', color: '#7a3f8a', blurb: 'Dark fruit, heavy branches, very happy wombats.' },
  { kind: 'tree', key: 'lemon',   name: 'Lemon Tree',  icon: 'c_lemon',   seed: 180, grow: 200, yield: 2, fruitEvery: 54, offering: 'gold',  hap: 12, restore: 1.1, thirsty: 1.7, leaf: '#5d8a3c', color: '#f0d04a', blurb: 'Thirsty. Sulks the moment you forget it.' },
  { kind: 'tree', key: 'fig',     name: 'Fig Tree',    icon: 'c_fig',     seed: 210, grow: 240, yield: 4, fruitEvery: 78, offering: 'slab',  hap: 17, restore: 1.6, thirsty: 1.1, leaf: '#4a7250', color: '#6a4a7a', blurb: 'The slowest and the best. Four figs a crop.' },
  { kind: 'tree', key: 'gumnut',  name: 'Gum Tree',    icon: 'c_gumnut',  seed: 120, grow: 170, yield: 3, fruitEvery: 58, offering: 'husk',  hap: 10, restore: 1.4, thirsty: 0.7, leaf: '#6f8f63', color: '#a8bfa0', blurb: 'Native. Drinks almost nothing. Smells like home.' },

  // ---- magical ------------------------------------------------------------
  // `need` is a condition that must hold or it stops growing; `effect` is what
  // it does to the grove once it is up.
  { kind: 'magic', key: 'runeberry',   name: 'Runeberry',   icon: 'c_runeberry',   seed: 90,  grow: 80, yield: 2, offering: 'rune',  hap: 14, restore: 0.7,  god: 'demewombra', color: '#8354c9',
    need: 'night',  effect: 'favour', blurb: 'Only swells after dark. The gods notice it.' },
  { kind: 'magic', key: 'mandrake',    name: 'Mandrake',    icon: 'c_mandrake',    seed: 120, grow: 66, yield: 2, offering: 'rune',  hap: 2,  restore: 0.6,  magic: 1, color: '#c9a86a',
    need: 'alone',  effect: 'scare',  blurb: 'Will not grow within sight of another plant. Screams.' },
  { kind: 'magic', key: 'moonbell',    name: 'Moonbell',    icon: 'c_moonbell',    seed: 70,  grow: 54, yield: 2, offering: 'husk',  hap: 16, restore: 0.42, magic: 1, color: '#9fd8e6',
    need: 'night',  effect: 'lull',   blurb: 'Opens at night. Anything sleeping near it sleeps better.' },
  { kind: 'magic', key: 'emberleaf',   name: 'Emberleaf',   icon: 'c_emberleaf',   seed: 84,  grow: 48, yield: 2, offering: 'gold',  hap: 9,  restore: 0.38, magic: 1, color: '#e0703c',
    need: 'dry',    effect: 'warm',   blurb: 'Do not water it. Everything near it grows quicker for the heat.' },
  { kind: 'magic', key: 'snapjaw',     name: 'Snapjaw',     icon: 'c_snapjaw',     seed: 96,  grow: 58, yield: 2, offering: 'slab',  hap: 4,  restore: 0.4,  magic: 1, color: '#4f9a42',
    need: 'bugs',   effect: 'hunt',   blurb: 'Needs something to eat. Eats it.' },
  { kind: 'magic', key: 'whisperfern', name: 'Whisperfern', icon: 'c_whisperfern', seed: 62,  grow: 44, yield: 2, offering: 'resin', hap: 13, restore: 0.5,  magic: 1, color: '#b98ef0',
    need: 'crowd',  effect: 'echo',   blurb: 'Wants company. Repeats whatever grows beside it.' },
  { kind: 'magic', key: 'dreamcap',    name: 'Dreamcap',    icon: 'c_dreamcap',    seed: 110, grow: 50, yield: 2, offering: 'husk',  hap: 18, restore: 0.45, magic: 1, color: '#c88ab0',
    need: 'shade',  effect: 'dream',  blurb: 'Grows in the dark under a tree. Everything nearby is content.' },
  { kind: 'magic', key: 'starthistle', name: 'Starthistle', icon: 'c_starthistle', seed: 130, grow: 64, yield: 2, offering: 'gold',  hap: 8,  restore: 0.55, magic: 1, color: '#f0e08a',
    need: 'wet',    effect: 'draw',   blurb: 'Keep it soaked. People come to look at it.' },
];
const PLANTS = CROPS;
const PLANTS_OF = (kind) => CROPS.filter((c) => c.kind === kind);
// what the magical ones each want, said plainly for the tooltip
const MAGIC_NEED = {
  night: 'only grows at night',
  alone: 'nothing else growing within a step',
  dry:   'never water it',
  bugs:  'wants a bug within reach',
  crowd: 'two or more plants beside it',
  shade: 'under the shade of a tree',
  wet:   'keep it wet the whole time',
};
const MAGIC_EFFECT = {
  favour: 'the gods answer sooner',
  scare:  'keeps the crows off the whole plot',
  lull:   'wombats asleep nearby wake up happier',
  warm:   'everything around it grows faster',
  hunt:   'eats the pests before they reach your beds',
  echo:   'plants beside it sometimes yield double',
  dream:  'everything within reach is quietly content',
  draw:   'visitors turn up more often',
};
const CROP_BY_KEY = Object.fromEntries(CROPS.map((c) => [c.key, c]));

// ---- Tools ---------------------------------------------------------------
// The dock holds seven. Farm opens a flyout with the four ground brushes.
const TOOLS = [
  { key: 'drag',    name: 'Hand',   icon: 't_drag',    radius: 0,  desc: 'Drag poop to the truck. Pet. Pick.' },
  { key: 'food',    name: 'Food',   icon: 't_food',    radius: 0,  desc: 'Pick a food, then put it on the ground.' },
  { key: 'farm',    name: 'Farm',   icon: 't_farm',    radius: 0,  sub: ['hoe', 'seed', 'moss', 'water'], desc: 'Hoe, seed, grass, water.' },
  { key: 'sickle',  name: 'Sickle', icon: 't_sickle',  radius: 22, desc: 'Cut the weeds.' },
  { key: 'destroy', name: 'Haul',   icon: 't_destroy', radius: 0,  desc: 'Ants carry it off, for a fee.' },
  { key: 'pair',    name: 'Pair',   icon: 't_pair',    radius: 0,  desc: 'Pair two adults.' },
];
const SUBTOOLS = [
  { key: 'hoe',   name: 'Hoe',   icon: 't_hoe',   radius: 15, desc: 'Till bare ground into beds.' },
  { key: 'seed',  name: 'Seed',  icon: 't_seed',  radius: 13, desc: 'Sow on tilled soil. Water it.' },
  { key: 'moss',  name: 'Grass', icon: 't_moss',  radius: 19, desc: 'Sow grass. It sprouts slowly.' },
  { key: 'water', name: 'Water', icon: 't_water', radius: 22, desc: 'Sprouts and crops drink.' },
  // ---- the terrain set ----------------------------------------------------
  // One tool, four things it does, the wheel picks which. Raising ground makes
  // a grassy hill; digging it out fills with water; levelling takes either back
  // down to flat; and the brush lays a different ground over the top.
  { key: 'terra', name: 'Terrain', icon: 'u_burrow', radius: 26, terra: true,
    desc: 'Raise, dig, level and lay ground. Wheel to change which.' },
  { key: 'build', name: 'Build',  icon: 'd_nest',  radius: 0,  desc: 'Stand furniture about the clearing. Click a piece to take it up again.' },
];
// Nothing is handed over at once. The cultist teaches a tool, then you own it.
const GATES = {
  drag: () => true,
  sickle: () => true,
  destroy: (g) => g.step >= 1,
  farm: (g) => g.step >= 2,
  terra: (g) => g.step >= 5,
  build: (g) => g.step >= 3,
  moss: (g) => g.step >= 2,
  hoe: (g) => g.step >= 3,
  seed: (g) => g.step >= 3,
  water: (g) => g.step >= 2,        // grass needs a drink before the wombat comes
  food: (g) => g.step >= 3,
  pair: (g) => !!g.decor.nest,
};
const GATE_WHY = {
  destroy: 'clear the weeds first',
  farm: 'the wrecks go first',
  moss: 'the wrecks go first',
  hoe: 'sow the grass first',
  seed: 'sow the grass first',
  water: 'the wrecks go first',
  food: 'sow the grass first',
  pair: 'needs a nest',
  terra: 'load the truck first',
  build: 'the grove first',
};
const unlocked = (g, key) => (GATES[key] ? GATES[key](g) : true);

const ALL_TOOLS = TOOLS.concat(SUBTOOLS);
const TOOL_BY_KEY = Object.fromEntries(ALL_TOOLS.map((t) => [t.key, t]));
const FARM_KEYS = TOOLS.find((t) => t.key === 'farm').sub;
const BRUSH_KEYS = ['sickle', 'hoe', 'seed', 'moss', 'water'];

// ---- The clearing: the small patch you actually have to tidy -------------
// ---- Plots ---------------------------------------------------------------
// You start with one small clearing. The land either side is fenced off and
// choked with weeds until you pay for it. Buying widens the camera, the ground
// you can work, and how many wombats will settle.
// Five plots across a long clearing. You start on the one in the middle and
// buy your way outward; the far two are a project.
const PLOTS = [
  { key: 'far_west', name: 'Old Quarry Side', x0: 4,    x1: 330,  cost: 2600 },
  { key: 'west',     name: 'Fern Hollow',     x0: 330,  x1: 690,  cost: 260 },
  { key: 'home',     name: 'Home Plot',       x0: 690,  x1: 1075, cost: 0 },
  { key: 'east',     name: 'Stone Ridge',     x0: 1075, x1: 1435, cost: 720 },
  { key: 'far_east', name: 'The Long Acre',   x0: 1435, x1: 1756, cost: 1800 },
];
const PLOT_BY_KEY = Object.fromEntries(PLOTS.map((p) => [p.key, p]));
const ownsPlot = (g, k) => !!(g.plots && g.plots[k]);
const plotAt = (x) => PLOTS.find((p) => x >= p.x0 && x < p.x1) || null;
const inOwned = (g, x) => { const p = plotAt(x); return !!p && ownsPlot(g, p.key); };
function ownedSpan(g) {
  let a = 1e9, b = -1e9;
  for (const p of PLOTS) if (ownsPlot(g, p.key)) { a = Math.min(a, p.x0); b = Math.max(b, p.x1); }
  return a > b ? { x0: PLOT_BY_KEY.home.x0, x1: PLOT_BY_KEY.home.x1 } : { x0: a, x1: b };
}
// The sign sits on the owned side of each buyable border, so you can reach it.
function plotSign(g, p) {
  const i = PLOTS.indexOf(p);
  if (ownsPlot(g, p.key)) return null;
  const left = PLOTS[i - 1], right = PLOTS[i + 1];
  if (right && ownsPlot(g, right.key)) return { x: p.x1 - 26, side: 1 };
  if (left && ownsPlot(g, left.key)) return { x: p.x0 + 26, side: -1 };
  return null;
}

const ZONE = { x: 860, y: 288, rx: 118, ry: 52 };
const inZone = (x, y) => ((x - ZONE.x) / ZONE.rx) ** 2 + ((y - ZONE.y) / ZONE.ry) ** 2 <= 1;
const ZONE_GRASS = 0.55;                 // how green the clearing has to be

// Weeds take hits. Thistle, bramble, tussock, nettle.
const WEED_HP = [3, 4, 2, 2];
const WEED_COIN = 1;                     // W$ that falls out of a cut weed

// Tools come in ranks; you start with junk and buy better at the mart.
const TIERS = {
  sickle: [
    { name: 'Rusty Sickle', dmg: 1, radius: 20, cost: 0 },
    { name: 'Iron Sickle', dmg: 2, radius: 26, cost: 90 },
    { name: 'Moon Sickle', dmg: 4, radius: 34, cost: 280 },
  ],
  hoe: [
    { name: 'Stick Hoe', radius: 13, cost: 0 },
    { name: 'Iron Hoe', radius: 19, cost: 110 },
    { name: 'Broad Hoe', radius: 26, cost: 320 },
  ],
  water: [
    { name: 'Tin Can', radius: 18, cost: 0 },
    { name: 'Copper Can', radius: 27, cost: 120 },
    { name: 'Rain Can', radius: 36, cost: 360 },
  ],
};
const tierIndex = (g, key) => Math.min(TIERS[key].length - 1, (g.tiers && g.tiers[key]) || 0);
const tierOf = (g, key) => TIERS[key][tierIndex(g, key)];
const nextTier = (g, key) => TIERS[key][tierIndex(g, key) + 1] || null;

// ---- The map. Fog lifts as gods answer. ----------------------------------
const SITES = [
  { key: 'grove',  name: 'The Grove',    x: 176, y: 236, icon: 'grove',   mode: 'grove',  need: 0 },
  { key: 'mart',   name: 'Wombat Mart',  x: 330, y: 296, icon: 'shop',    mode: 'shop',   need: 0, gate: (g) => g.step >= 3, why: 'the grove first' },
  { key: 'ritual', name: 'Ritual Site',  x: 424, y: 132, icon: 'shrine',  mode: 'shrine', need: 0, gate: (g) => OFFER_ORDER.some((k) => (g.offerings[k] || 0) + (g.blessed[k] || 0) > 0), why: 'bring an offering' },
  { key: 'nursery', name: 'Groot\'s Cellar', x: 236, y: 330, icon: 'c_ashgrass', mode: 'nursery', need: 0, gate: (g) => g.step >= 3, why: 'the grove first' },
  { key: 'quarry', name: 'Old Quarry',   x: 96,  y: 104, icon: 'o_stone', need: 3 },
  { key: 'lake',   name: 'Still Lake',   x: 566, y: 78,  icon: 'g_tide',  need: 5 },
  { key: 'deep',   name: 'The Deepwood', x: 292, y: 58,  icon: 'a_owl',   need: 8 },
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
    blessing: 'Rare pelts come twice as often.', ritual: { husk: 5, resin: 2 }, tier: 2,
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
  { key: 'steadyclaw', root: 2, i: 0, cost: 90,   at: 0.06, icon: 'f_claw',   name: 'Steady Claw',  desc: 'The crane is slower and hangs level.' },
  { key: 'wideplinth', root: 2, i: 1, cost: 260,  at: 0.16, icon: 'f_plinth', name: 'Wide Plinth',  desc: 'A broader plinth at the ritual site.' },
  { key: 'seersight',  root: 2, i: 2, cost: 600,  at: 0.3,  icon: 'f_eye',    name: 'Seer Sight',   desc: 'A fourth blessing may be held at once.' },
  { key: 'godtongue',  root: 2, i: 3, cost: 1300, at: 0.55, icon: 'f_tongue', name: 'God Tongue',   desc: 'Rituals need one fewer of each offering.' },
];
const ROOT_NAMES = ['Soil', 'Beast', 'Rite'];

// ---- Things to buy with W$ ------------------------------------------------
const UPGRADES = [
  { key: 'haggle',  name: 'Haggling', icon: 'u_seats',   base: 260, mult: 2.1,  max: 5, desc: (l) => l ? `He pays ${l * 8}% more for a cube.` : 'Learn what a cube is actually worth.' },
  { key: 'shade',   name: 'Shade Cloth', icon: 'u_cart',  base: 200, mult: 2.0,  max: 4, desc: (l) => l ? `Beds dry out ${l * 15}% slower.` : 'Keeps the sun off the beds.' },
  { key: 'toys',    name: 'Toy Box',  icon: 'd_nest',    base: 180, mult: 2.2,  max: 4, desc: (l) => l ? `Wombats get bored ${l * 16}% slower.` : 'Balls, logs and a knotted rope.' },
  { key: 'burrow',  name: 'Burrow',   icon: 'u_burrow',  base: 150, mult: 2.25, max: 6, desc: (l) => `Room for ${2 + l} wombats.` },
  { key: 'trough',  name: 'Trough',   icon: 'u_trough',  base: 240, mult: 2.1,  max: 4, desc: (l) => l ? `Feeds one wombat every ${(15 / l).toFixed(0)}s.` : 'Feeds hungry wombats.' },
  { key: 'cart',    name: 'Cart',     icon: 'u_cart',    base: 170, mult: 2.4,  max: 3, desc: (l) => l >= 3 ? 'Instant pickup, +10% value.' : l ? `Gathers after ${(4 / l).toFixed(1)}s.` : 'Gathers poop for you.' },
];
const DECOR = [
  { key: 'nest',    name: 'Nest',      icon: 'd_nest',    cost: 300,  unlocks: 'pair', desc: 'Pair two adults to breed.', spot: [0.16, 0.62] },
  { key: 'brazier', name: 'Brazier',   icon: 'd_brazier', cost: 220,  hap: 0.4, desc: 'Warmth. Happier wombats.', spot: [0.34, 0.2] },
  { key: 'stones',  name: 'Standing Stones', icon: 'd_stones', cost: 700, favor: 0.15, desc: 'Rituals gather a bigger crowd.', spot: [0.76, 0.18] },
  { key: 'pool',    name: 'Still Pool', icon: 'd_pool',   cost: 520,  hap: 0.6, desc: 'Cool water. Much happier wombats.', spot: [0.86, 0.5] },
  { key: 'idol',    name: 'Old Idol',  icon: 'd_idol',    cost: 1400, favor: 0.3, desc: 'The gods notice sooner.', spot: [0.58, 0.14] },
];
// Which of the above are garden-centre stock rather than corner-shop stock.
// The mart skips these; Groot's cellar sells them alongside the seed.
// What the terrain tool is set to do. Each has its own cost and its own undo.
const TERRA_MODES = [
  { key: 'raise', name: 'Raise', icon: 'u_burrow', cost: 120, r: 26, blurb: 'A grassy hill. They like to sit on top of one.' },
  { key: 'dig',   name: 'Dig',   icon: 'd_pool',   cost: 260, r: 24, blurb: 'Down to the water table. Frogs move in.' },
  { key: 'level', name: 'Level', icon: 't_hoe',    cost: 40,  r: 30, blurb: 'Flatten a hill or fill a hole back in.' },
  { key: 'earth', name: 'Earth', icon: 't_hoe',    cost: 0,   r: 20, paint: 'd', blurb: 'Bare earth.' },
  { key: 'sand',  name: 'Sand',  icon: 't_hoe',    cost: 0,   r: 20, paint: 's', blurb: 'Pale sand.' },
  { key: 'clay',  name: 'Clay',  icon: 't_hoe',    cost: 0,   r: 20, paint: 'c', blurb: 'Red clay.' },
  { key: 'ash',   name: 'Ash',   icon: 't_hoe',    cost: 0,   r: 20, paint: 'a', blurb: 'Cold ash. The cult likes it.' },
];

const GARDEN_UP = { trough: 1 };
const GARDEN_DEC = { nest: 1, pool: 1 };

const WOMBAT_PRICE = (n) => Math.round(180 * Math.pow(2.5, Math.max(0, n - 1)));

// ---- The Mart's prize machine --------------------------------------------
// A capsule machine by the till. You put a coin in, the drum turns, and you
// get whatever it feels like giving you. Weights are relative, not percentages.
// ---- what a corner shop actually sells ------------------------------------
// Real products with real labels, because a shelf of coloured rectangles is a
// placeholder and not a shop. Each one does a small thing when you get it home.
const SNACKS = [
  { key: 'cola',   name: 'Burrow Cola',      price: 14, form: 'can',    col: '#c02030', cap: '#f2cf3a',
    blurb: 'The original. 1.1 litres of sugar in a 375ml can, somehow.', effect: 'hap', amt: 9 },
  { key: 'lemon',  name: 'Dig Fizz Lemon',   price: 14, form: 'can',    col: '#d8b23a', cap: '#f4ec9a',
    blurb: 'Cloudy lemon. Shaz drinks four a shift and has never sat down.', effect: 'hap', amt: 9 },
  { key: 'dirt',   name: 'Dirt Water',       price: 9,  form: 'bottle', col: '#6a5030', cap: '#3a2a18',
    blurb: 'Mineral water, unfiltered, from the quarry. It is brown on purpose.', effect: 'hap', amt: 5 },
  { key: 'milk',   name: 'Flat Milk 2L',     price: 22, form: 'bottle', col: '#eef2f4', cap: '#2f6f9f',
    blurb: 'From the Flats. The date on the lid is a suggestion.', effect: 'hap', amt: 14 },
  { key: 'chips',  name: 'Bark Chips S&V',   price: 16, form: 'bag',    col: '#3f8f4a', cap: '#d8f0a0',
    blurb: 'Salt and vinegar. Ninety percent air, and that is the good part.', effect: 'hap', amt: 10 },
  { key: 'crisps', name: 'Root Crisps BBQ',  price: 16, form: 'bag',    col: '#c9581f', cap: '#ffd0a8',
    blurb: 'Barbecue. Turns your fingers orange for two days.', effect: 'hap', amt: 10 },
  { key: 'pie',    name: 'Hot Wombat Pie',   price: 28, form: 'pie',    col: '#c9a15c', cap: '#8a4520',
    blurb: 'No wombat in it. It is a shape of pie. It has been hot since Tuesday.', effect: 'cube', amt: 1 },
  { key: 'sausage', name: 'Sausage Roll x2', price: 24, form: 'pie',    col: '#d8b880', cap: '#a8462c',
    blurb: 'Two in the bag. The second one is for the drive home, which is four minutes.', effect: 'cube', amt: 1 },
  { key: 'bar',    name: 'Gumnut Bar',       price: 11, form: 'box',    col: '#7a4f9a', cap: '#c9a0e8',
    blurb: 'Nougat, caramel, and something the wrapper calls "gumnut crunch".', effect: 'hap', amt: 7 },
  { key: 'mints',  name: 'Bush Mints',       price: 8,  form: 'box',    col: '#2f6f9f', cap: '#bfe4f4',
    blurb: 'Eucalyptus mints. Clears the sinuses of everyone in the room but you.', effect: 'hap', amt: 5 },
  { key: 'biccy',  name: 'Scrub Biscuits',   price: 19, form: 'box',    col: '#8a4520', cap: '#e8c898',
    blurb: 'A whole packet. Nobody in this district has ever eaten fewer than a whole packet.', effect: 'hap', amt: 12 },
  { key: 'ticket', name: 'Scratchie',        price: 20, form: 'card',   col: '#b8342c', cap: '#f2cf3a',
    blurb: 'Scratch three matching wombats and win. You will not.', effect: 'scratch', amt: 0 },
];
const SNACK_BY_KEY = Object.fromEntries(SNACKS.map((s) => [s.key, s]));

// ---- the two machines by the till ----------------------------------------
// The gumball machine is a 1 W$ habit. Most of what comes out is worth about
// what you paid; once in a while it is not, and that is the whole appeal.
const GUM_COST = 1;
const GUMBALLS = [
  { key: 'dud',    w: 34, name: 'A chewed one',   col: '#8d8577', say: 'someone already had this' },
  { key: 'change', w: 26, name: 'A few coins',    col: '#d8b23a', say: '' },
  { key: 'sweet',  w: 16, name: 'Actually nice',  col: '#e0764a', say: '' },
  { key: 'seed',   w: 10, name: 'A seed inside',  col: '#4f9a42', say: '' },
  { key: 'cube',   w: 8,  name: 'A plain cube',   col: '#7a5636', say: '' },
  { key: 'silver', w: 4,  name: 'A silver one',   col: '#b4c0cc', say: '' },
  { key: 'gold',   w: 2,  name: 'A GOLD one',     col: '#f2cf3a', say: '' },
];
const GUM_TOTAL = GUMBALLS.reduce((a, p) => a + p.w, 0);
function rollGum() {
  let n = Math.random() * GUM_TOTAL;
  for (const p of GUMBALLS) { n -= p.w; if (n <= 0) return p; }
  return GUMBALLS[0];
}
// The lottery is three reels. Two alike pays a little, three alike pays what
// the symbol is worth, and three wombats is the roof.
const LOTTO_COST = 40;
const LOTTO_SYMS = [
  { key: 'grass',  w: 30, icon: 'c_ashgrass', pay: 3 },
  { key: 'seed',   w: 24, icon: 't_seed',     pay: 5 },
  { key: 'poop',   w: 18, icon: 'o_plain',    pay: 10 },
  { key: 'sickle', w: 13, icon: 't_sickle',   pay: 18 },
  { key: 'coin',   w: 9,  icon: 'wdollar',    pay: 40 },
  { key: 'wombat', w: 4,  icon: 'wombat',     pay: 150 },
];
const LOTTO_TOTAL = LOTTO_SYMS.reduce((a, p) => a + p.w, 0);
function rollLotto() {
  let n = Math.random() * LOTTO_TOTAL;
  for (const p of LOTTO_SYMS) { n -= p.w; if (n <= 0) return p; }
  return LOTTO_SYMS[0];
}

// Every Golden Wombat on the shelf pays a little more at the stack, for good.
// ---- What the hooded one pays for a cube ----------------------------------
// He buys the lot. The price is the offering's own worth plus a little for
// bulk: one cube is a curiosity, a truckload is a supply.
const trophyBonus = (g) => (g.trophies || 0) * 0.08;
const POOP_PRICE = { plain: 9, rich: 16, husk: 22, resin: 30, slab: 44, stone: 60, rune: 90, gold: 140 };
const poopPrice = (key, n, g) => {
  const base = POOP_PRICE[key] || 10;
  const bulk = 1 + Math.min(0.5, Math.max(0, n - 1) * 0.04);     // he pays more for a load
  const gg = g || (typeof window !== 'undefined' ? window.G : null) || {};
  const talk = 1 + ((gg.up || {}).haggle || 0) * 0.08;
  // your standing in the cult, and whatever the day is doing
  const faith = (typeof Cult !== 'undefined' && Cult.payMult) ? Cult.payMult() : 1;
  return Math.max(1, Math.round(base * bulk * talk * faith));
};

// ---- Breeding -------------------------------------------------------------
const TRAITS = [
  { key: 'gut',   name: 'Gut',   min: 0.7, max: 1.4 },   // digestion multiplier
  { key: 'calm',  name: 'Calm',  min: 0.6, max: 1.5 },   // happiness decay resistance
  { key: 'luck',  name: 'Luck',  min: 0.6, max: 1.6 },   // premium offering chance
];
const GROW_TIME = { baby: 95, juvenile: 150 };
const RARE_CHANCE = 0.07;

const NAMES = ['Wilbur', 'Doris', 'Chonk', 'Beans', 'Mabel', 'Gus', 'Pudding', 'Winnie', 'Bruce', 'Nugget', 'Sheila', 'Tubs', 'Barnaby', 'Pip', 'Marge', 'Otis', 'Bramble', 'Kip', 'Nella', 'Dot'];
const RESTORE_TARGET = 172000;  // painted grass pixels that count as a whole forest
                                // (the grove floor is about 238k, so this is most of it)

// ---- Furniture ------------------------------------------------------------
// Things you buy in town and stand about the grove wherever you like. Unlike
// DECOR, which has one fixed spot each and is really an upgrade wearing a hat,
// furniture is placed by hand, picked back up, and is worth what you paid for
// it minus a little. Most of it does something small; some of it is just nice.
const FURNITURE = [
  { key: 'bench',   name: 'Log Bench',     cost: 90,   w: 46, h: 20, hap: 0.10, blurb: 'Split log on two rounds. Somewhere to sit and watch them.' },
  { key: 'table',   name: 'Trestle Table', cost: 140,  w: 52, h: 26, hap: 0.08, blurb: 'Two trestles and a top. Every wood needs one.' },
  { key: 'lantern', name: 'Post Lantern',  cost: 180,  w: 16, h: 52, hap: 0.14, light: 1, blurb: 'A candle in a box on a post. Burns all night.' },
  { key: 'barrel',  name: 'Rain Barrel',   cost: 160,  w: 26, h: 30, water: 1,  blurb: 'Catches the rain. Beds near it dry out slower.' },
  { key: 'trough2', name: 'Stone Trough',  cost: 210,  w: 44, h: 18, thirst: 1, blurb: 'Cut from one block. They drink from it.' },
  { key: 'scare',   name: 'Scarecrow',     cost: 120,  w: 22, h: 54, blurb: 'Sack head, crossed sticks, one boot. Keeps the crows honest.' },
  { key: 'hive',    name: 'Bee Skep',      cost: 240,  w: 24, h: 26, hap: 0.10, blurb: 'Straw skep on a stand. Maud will be pleased.' },
  { key: 'arch',    name: 'Rose Arch',     cost: 320,  w: 56, h: 60, hap: 0.18, blurb: 'Bent willow with something climbing it.' },
  { key: 'well',    name: 'Old Well',      cost: 460,  w: 40, h: 46, water: 2,  blurb: 'Stone ring, a roof, a bucket on a rope. Deep.' },
  { key: 'statue',  name: 'Wombat Statue', cost: 780,  w: 32, h: 44, favor: 0.08, blurb: 'Carved by someone who had only had one described to them.' },
  { key: 'firepit', name: 'Fire Pit',      cost: 350,  w: 40, h: 18, hap: 0.22, light: 1, blurb: 'A ring of stones and a heap of ash. Sit round it.' },
  { key: 'shrine2', name: 'Wayside Shrine',cost: 900,  w: 28, h: 50, favor: 0.14, blurb: 'A box on a pole with something unpleasant inside it.' },
];
const FURN_BY_KEY = Object.fromEntries(FURNITURE.map((f) => [f.key, f]));

