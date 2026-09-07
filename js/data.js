// ---- Balance data. Short labels, icon keys, no emoji. ---------------------
const CUBE_SIZE = 24;

const CUBES = {
  normal: { key: 'normal', name: 'Plain Cube', icon: 'c_normal', w: 1, h: 1, density: 1, friction: 0.62, restitution: 0.02, adhesion: 0, value: 6, compost: 4, color: '#7a5230', desc: 'Dependable. Stacks square.' },
  big:    { key: 'big', name: 'Big Cube', icon: 'c_big', w: 1.45, h: 1.45, density: 1, friction: 0.66, restitution: 0.02, adhesion: 0, value: 13, compost: 8, color: '#5a3a22', desc: 'Broad footing. Heavy up high.' },
  sticky: { key: 'sticky', name: 'Sticky Cube', icon: 'c_sticky', w: 1, h: 1, density: 1, friction: 1.3, restitution: 0, adhesion: 1600, value: 11, compost: 7, color: '#c58a2a', desc: 'Clings to what it lands on.' },
  light:  { key: 'light', name: 'Light Cube', icon: 'c_light', w: 1, h: 1, density: 0.4, friction: 0.7, restitution: 0.04, adhesion: 0, value: 8, compost: 5, color: '#d9c19a', desc: 'Barely presses down. Wind bait.' },
  heavy:  { key: 'heavy', name: 'Iron Cube', icon: 'c_heavy', w: 1, h: 1, density: 2.6, friction: 0.88, restitution: 0, adhesion: 0, value: 10, compost: 7, color: '#5a5a66', desc: 'Anchors a base. Crushes a weak top.' },
  slab:   { key: 'slab', name: 'Slab', icon: 'c_slab', w: 2.4, h: 0.6, density: 1, friction: 0.72, restitution: 0.02, adhesion: 0, value: 15, compost: 9, color: '#5a7a3a', desc: 'Turns a wobbly top into a floor.' },
  gold:   { key: 'gold', name: 'Gold Cube', icon: 'c_gold', w: 1, h: 1, density: 1.9, friction: 0.58, restitution: 0.02, adhesion: 0, value: 48, compost: 20, color: '#f2c14e', desc: 'Pure profit. Place it somewhere safe.' },
};
const CUBE_ORDER = ['normal', 'big', 'sticky', 'light', 'heavy', 'slab', 'gold'];

const FOODS = [
  { key: 'grass',    name: 'Grass',      icon: 'grass',    cost: 1,  unlock: 0,    digest: 20, cube: 'normal', hap: 2,  desc: 'Cheap filler.' },
  { key: 'carrot',   name: 'Carrot',     icon: 'carrot',   cost: 4,  unlock: 0,    digest: 10, cube: 'normal', hap: 6,  desc: 'Same cube, twice as fast.' },
  { key: 'fern',     name: 'Fern',       icon: 'fern',     cost: 9,  unlock: 90,   digest: 16, cube: 'light',  hap: 5,  desc: 'Airy leaves.' },
  { key: 'potato',   name: 'Sweet Yam',  icon: 'potato',   cost: 12, unlock: 170,  digest: 26, cube: 'big',    hap: 8,  desc: 'A big meal.' },
  { key: 'honey',    name: 'Honey Oats', icon: 'honey',    cost: 16, unlock: 280,  digest: 24, cube: 'sticky', hap: 10, desc: 'Sticky in, sticky out.' },
  { key: 'ironroot', name: 'Iron Root',  icon: 'ironroot', cost: 20, unlock: 450,  digest: 30, cube: 'heavy',  hap: 3,  desc: 'Mineral heavy.' },
  { key: 'mushroom', name: 'Shelf Cap',  icon: 'mushroom', cost: 24, unlock: 700,  digest: 28, cube: 'slab',   hap: 7,  desc: 'Grows flat and wide.' },
  { key: 'corn',     name: 'Gold Corn',  icon: 'corn',     cost: 45, unlock: 1200, digest: 36, cube: 'gold',   hap: 14, desc: 'A rich diet pays.' },
];
const FOOD_BY_KEY = Object.fromEntries(FOODS.map((f) => [f.key, f]));

// One-off farm purchases. `spot` is a fraction of the paddock for placement.
const FARM_ITEMS = [
  { key: 'ball',      name: 'Rubber Ball',  icon: 'ball',      cost: 70,   regen: 0.5, desc: 'Happiness ticks up.',          spot: [0.74, 0.42] },
  { key: 'flowerbed', name: 'Flower Beds',  icon: 'flowerbed', cost: 140,  cap: 8, appeal: 0.15, desc: 'Nicer pen, bigger crowds.', spot: [0.10, 0.30] },
  { key: 'tunnel',    name: 'Burrow',       icon: 'tunnel',    cost: 320,  regen: 0.7, digest: 0.08, desc: 'Happiness and faster digestion.', spot: [0.28, 0.22] },
  { key: 'lantern',   name: 'Lanterns',     icon: 'lantern',   cost: 620,  cap: 8, appeal: 0.25, desc: 'Warm light. Crowds come at night.', spot: [0.5, 0.1] },
  { key: 'mud',       name: 'Mud Bath',     icon: 'mud',       cost: 1100, regen: 1.0, sticky: 0.3, desc: 'Best happiness. Stickier cubes.', spot: [0.86, 0.24] },
];
const FACILITIES = [
  { key: 'fence',     name: 'Pen Fence',   icon: 'fence',     base: 130, mult: 2.35, max: 6, desc: (l) => `Room for ${2 + l} wombats.` },
  { key: 'trough',    name: 'Feed Trough', icon: 'trough',    base: 250, mult: 2.1,  max: 4, desc: (l) => l ? `Feeds one wombat every ${(15 / l).toFixed(0)}s.` : 'Feeds hungry wombats for you.' },
  { key: 'barrow',    name: 'Cube Barrow', icon: 'barrow',    base: 160, mult: 2.4,  max: 3, desc: (l) => l >= 3 ? 'Instant pickup, +10% cube value.' : l ? `Picks up cubes after ${(4 / l).toFixed(1)}s.` : 'Collects dropped cubes for you.' },
  { key: 'bleachers', name: 'Bleachers',   icon: 'bleachers', base: 320, mult: 1.95, max: 8, desc: (l) => `Seats ${40 + l * 40}. Ticket income +${l * 12}%.` },
];
const WOMBAT_COST = (n) => Math.round(160 * Math.pow(2.55, n - 1));

// ---- The Wombat Tree ------------------------------------------------------
const TREE_STAGES = [
  { name: 'Seedling', xp: 0,    note: 'A stem in fresh soil.' },
  { name: 'Sapling',  xp: 45,   note: 'The first bough reaches out.' },
  { name: 'Young',    xp: 140,  note: 'A second bough, higher up.' },
  { name: 'Grown',    xp: 330,  note: 'The crown bough opens.' },
  { name: 'Grand',    xp: 650,  note: 'Full canopy. Deep shade.' },
  { name: 'Ancient',  xp: 1100, note: 'Golden leaves. It remembers.' },
];
const XP_PER_ACORN = 18;
const BOUGH_NAMES = ['Roots', 'Limbs', 'Crown'];
const BOUGH_NOTE = ['Wombat care', 'Building', 'The show'];

// bough 0..2, slot 0..3, cost in acorns. Bough b needs tree stage b+1.
const SKILLS = [
  { key: 'paws',   bough: 0, slot: 0, cost: 1, icon: 's_paw',    name: 'Gentle Paws',  desc: 'Petting gives more, and cuts 3s off digestion.' },
  { key: 'gut',    bough: 0, slot: 1, cost: 2, icon: 's_gut',    name: 'Deep Gut',     desc: 'Every wombat digests 25% faster.' },
  { key: 'twin',   bough: 0, slot: 2, cost: 3, icon: 's_twin',   name: 'Twin Drop',    desc: '20% chance of a second cube.' },
  { key: 'calm',   bough: 0, slot: 3, cost: 4, icon: 's_calm',   name: 'Calm Herd',    desc: 'Happiness fades 40% slower. Never grumpy.' },
  { key: 'claw',   bough: 1, slot: 0, cost: 1, icon: 's_claw',   name: 'Steady Claw',  desc: 'Slower crane. Cubes drop level.' },
  { key: 'guide',  bough: 1, slot: 1, cost: 2, icon: 's_guide',  name: 'Drop Guide',   desc: 'Shows where the cube will land.' },
  { key: 'base',   bough: 1, slot: 2, cost: 3, icon: 's_base',   name: 'Wide Base',    desc: 'The pedestal is 35% wider.' },
  { key: 'gyro',   bough: 1, slot: 3, cost: 4, icon: 's_gyro',   name: 'Gyro Grip',    desc: 'Cubes resist spin and grip 15% harder.' },
  { key: 'voice',  bough: 2, slot: 0, cost: 1, icon: 's_voice',  name: 'Big Voice',    desc: 'Crowds arrive faster and larger.' },
  { key: 'cart',   bough: 2, slot: 1, cost: 2, icon: 's_cart',   name: 'Merch Cart',   desc: 'Ticket income +30%.' },
  { key: 'eye',    bough: 2, slot: 2, cost: 3, icon: 's_eye',    name: 'Talent Eye',   desc: 'Four perks to choose from, not three.' },
  { key: 'legend', bough: 2, slot: 3, cost: 4, icon: 's_legend', name: 'Legend',       desc: 'Double cash-out. Compost gives +50%.' },
];

const PERKS = [
  { key: 'glue',    name: 'Tree Sap',    icon: 'p_glue',    rare: 0, desc: 'Every cube clings a little.' },
  { key: 'feather', name: 'Feather Fall', icon: 'p_feather', rare: 0, desc: 'Cubes fall slowly until they touch.' },
  { key: 'hype',    name: 'Hype Wagon',  icon: 'p_hype',    rare: 0, desc: 'Ticket income x1.7.' },
  { key: 'bedrock', name: 'Bedrock',     icon: 'p_bedrock', rare: 1, desc: 'The lowest three cubes fuse down.' },
  { key: 'net',     name: 'Safety Net',  icon: 'p_net',     rare: 0, desc: 'Two more cubes may fall.' },
  { key: 'goldrush', name: 'Gold Rush',  icon: 'p_gold',    rare: 1, desc: 'Your next three cubes pay like gold.' },
  { key: 'big',     name: 'Big Boned',   icon: 'p_big',     rare: 0, desc: 'Future cubes are 15% larger.' },
  { key: 'slow',    name: 'Slow Hands',  icon: 'p_slow',    rare: 0, desc: 'The crane moves 40% slower.' },
  { key: 'encore',  name: 'Encore',      icon: 'p_encore',  rare: 1, desc: 'One collapse is forgiven.' },
  { key: 'magnet',  name: 'Lodestone',   icon: 'p_magnet',  rare: 0, desc: 'Falling cubes drift to centre.' },
  { key: 'tax',     name: 'Tax Break',   icon: 'p_tax',     rare: 0, desc: 'Placement pay x1.6.' },
  { key: 'calm',    name: 'Calm Air',    icon: 'p_calm',    rare: 0, desc: 'No wind for the rest of the run.' },
];

const WOMBAT_NAMES = ['Wilbur', 'Doris', 'Chonk', 'Beans', 'Mabel', 'Gus', 'Pudding', 'Winnie', 'Bruce', 'Nugget', 'Sheila', 'Tubs', 'Barnaby', 'Pip'];
const TIPS = [
  'Iron low, Light high.',
  'A Slab makes a fresh floor.',
  'Sticky cubes hold a lean together.',
  'Happy wombats drop premium cubes.',
  'Wind starts around six high.',
  'Cash out before the tower does.',
  'Compost cubes to grow the tree.',
];
