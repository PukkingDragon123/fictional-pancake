// ---- Game data definitions ------------------------------------------------
const CUBE_SIZE = 24; // base cube size in world px

const CUBES = {
  normal: { key: 'normal', name: 'Poop Cube', w: 1, h: 1, density: 1, friction: 0.6, restitution: 0.02, adhesion: 0, value: 5, color: '#8a5a2b', desc: 'A perfectly ordinary cube of wombat poop. Reliable.' },
  big:    { key: 'big', name: 'Big Cube', w: 1.45, h: 1.45, density: 1, friction: 0.65, restitution: 0.02, adhesion: 0, value: 12, color: '#6e4520', desc: 'Huge surface area. Great foundation, heavy to place high.' },
  sticky: { key: 'sticky', name: 'Sticky Cube', w: 1, h: 1, density: 1, friction: 1.3, restitution: 0, adhesion: 1600, value: 10, color: '#c58a2a', desc: 'Clings to whatever it touches. Glue for your tower.' },
  light:  { key: 'light', name: 'Feather Cube', w: 1, h: 1, density: 0.4, friction: 0.7, restitution: 0.05, adhesion: 0, value: 7, color: '#d9c19a', desc: 'Very light. Barely stresses what it lands on. Wind loves it.' },
  heavy:  { key: 'heavy', name: 'Iron Cube', w: 1, h: 1, density: 2.6, friction: 0.85, restitution: 0, adhesion: 0, value: 9, color: '#4a4a52', desc: 'Dense and grippy. Anchors a base, crushes a weak top.' },
  tiny:   { key: 'tiny', name: 'Pebble Cube', w: 0.6, h: 0.6, density: 1, friction: 0.7, restitution: 0.05, adhesion: 0, value: 3, color: '#9a6a3b', desc: 'Small filler. Good for wedging gaps.' },
  bouncy: { key: 'bouncy', name: 'Bouncy Cube', w: 1, h: 1, density: 0.8, friction: 0.5, restitution: 0.7, adhesion: 0, value: 16, color: '#c04ea0', desc: 'Bounces. Terrifying. The crowd goes wild.' },
  slab:   { key: 'slab', name: 'Slab', w: 2.4, h: 0.6, density: 1, friction: 0.7, restitution: 0.02, adhesion: 0, value: 14, color: '#5a7a3a', desc: 'Wide and flat. Bridges wobbly tops into a new floor.' },
  ice:    { key: 'ice', name: 'Ice Cube', w: 1, h: 1, density: 0.9, friction: 0.05, restitution: 0.1, adhesion: 0, value: 28, color: '#a8e0f5', desc: 'Slippery as sin. Big money if it stays put.' },
  gold:   { key: 'gold', name: 'Gold Cube', w: 1, h: 1, density: 1.9, friction: 0.55, restitution: 0.02, adhesion: 0, value: 45, color: '#e8b923', desc: 'Pure profit. Heavy-ish. Place when the tower is safe.' },
};
const CUBE_ORDER = ['normal', 'tiny', 'big', 'sticky', 'light', 'heavy', 'slab', 'bouncy', 'ice', 'gold'];

const FOODS = [
  { key: 'grass', name: 'Grass', icon: '🌿', cost: 1, unlock: 0, digest: 22, cube: 'normal', hap: 2, desc: 'Cheap. Boring. Produces a standard cube.' },
  { key: 'carrot', name: 'Carrot', icon: '🥕', cost: 4, unlock: 0, digest: 11, cube: 'normal', hap: 6, desc: 'Fast digestion. Same cube, twice as quick.' },
  { key: 'pebblenuts', name: 'Pebble Nuts', icon: '🥜', cost: 7, unlock: 60, digest: 14, cube: 'tiny', count: 2, hap: 4, desc: 'Produces TWO tiny pebble cubes.' },
  { key: 'sweetpotato', name: 'Sweet Potato', icon: '🍠', cost: 12, unlock: 90, digest: 28, cube: 'big', hap: 8, desc: 'A hearty meal -> one BIG cube.' },
  { key: 'honeyoats', name: 'Honey Oats', icon: '🍯', cost: 15, unlock: 160, digest: 26, cube: 'sticky', hap: 10, desc: 'Sticky in, sticky out. Produces a Sticky Cube.' },
  { key: 'fern', name: 'Feather Fern', icon: '🌱', cost: 10, unlock: 140, digest: 18, cube: 'light', hap: 5, desc: 'Airy leaves -> a Feather Cube.' },
  { key: 'ironroot', name: 'Iron Root', icon: '🪨', cost: 18, unlock: 300, digest: 34, cube: 'heavy', hap: 3, desc: 'Mineral-rich root -> an Iron Cube.' },
  { key: 'mushroom', name: 'Shelf Mushroom', icon: '🍄', cost: 20, unlock: 450, digest: 30, cube: 'slab', hap: 7, desc: 'Flat fungus -> a wide Slab.' },
  { key: 'berries', name: 'Bounce Berries', icon: '🫐', cost: 16, unlock: 400, digest: 20, cube: 'bouncy', hap: 12, desc: 'Sugar rush -> a Bouncy Cube. Yikes.' },
  { key: 'frostmelon', name: 'Frost Melon', icon: '🍈', cost: 28, unlock: 800, digest: 30, cube: 'ice', hap: 9, desc: 'Chilled to the core -> an Ice Cube.' },
  { key: 'goldcorn', name: 'Golden Corn', icon: '🌽', cost: 45, unlock: 1400, digest: 40, cube: 'gold', hap: 14, desc: 'Rich diet -> a Gold Cube. Ka-ching.' },
];
const FOOD_BY_KEY = Object.fromEntries(FOODS.map((f) => [f.key, f]));

const TOYS = [
  { key: 'ball', name: 'Rubber Ball', icon: '⚽', cost: 80, regen: 0.45, desc: '+0.45 happiness/s pen-wide. Wombats chase it.', pos: [0.72, 0.55] },
  { key: 'tunnel', name: 'Burrow Tunnel', icon: '🕳️', cost: 220, regen: 0.6, digest: 0.06, desc: '+0.6 happiness/s, +6% digestion speed.', pos: [0.25, 0.3] },
  { key: 'log', name: 'Scratch Log', icon: '🪵', cost: 420, regen: 0.8, desc: '+0.8 happiness/s. Very scratchable.', pos: [0.5, 0.72] },
  { key: 'mud', name: 'Mud Bath', icon: '🛁', cost: 800, regen: 1.0, sticky: 0.25, desc: '+1.0 happiness/s. Sticky cubes +25% adhesion.', pos: [0.85, 0.28] },
  { key: 'tramp', name: 'Trampoline', icon: '🤸', cost: 1600, regen: 1.3, bouncy: 0.5, desc: '+1.3 happiness/s. Bouncy cubes worth +50%.', pos: [0.12, 0.7] },
];
const DECOS = [
  { key: 'flowers', name: 'Flower Beds', icon: '🌸', cost: 60, appeal: 1, cap: 6, desc: '+6 max happiness, +10% crowd appeal.' },
  { key: 'paint', name: 'Fence Paint', icon: '🎨', cost: 180, appeal: 1, cap: 6, desc: 'A fresh red coat. +6 max happiness, +10% appeal.' },
  { key: 'lights', name: 'Fairy Lights', icon: '✨', cost: 350, appeal: 2, cap: 6, desc: 'Glows at night. +6 max happiness, +20% appeal.' },
  { key: 'fountain', name: 'Fountain', icon: '⛲', cost: 900, appeal: 2, cap: 8, desc: 'Splashy. +8 max happiness, +20% appeal.' },
  { key: 'statue', name: 'Golden Wombat Statue', icon: '🏆', cost: 2400, appeal: 3, cap: 10, desc: 'Majestic. +10 max happiness, +30% appeal.' },
];
const FACILITIES = [
  { key: 'pen', name: 'Pen Expansion', icon: '🏗️', base: 120, mult: 2.3, max: 6, desc: (l) => `Wombat capacity: ${2 + l}. Next: ${3 + l}.` },
  { key: 'trough', name: 'Auto Trough', icon: '🥣', base: 260, mult: 2.1, max: 5, desc: (l) => l === 0 ? 'Automatically feeds hungry wombats the food you select.' : `Feeds a hungry wombat every ${(16 / l).toFixed(1)}s.` },
  { key: 'conveyor', name: 'Cube Conveyor', icon: '🛤️', base: 150, mult: 2.5, max: 3, desc: (l) => l === 0 ? 'Auto-collects cubes after a few seconds.' : l < 3 ? `Collects cubes in ${(4 / l).toFixed(1)}s. Next: faster.` : 'Instant collection, +10% cube value.' },
  { key: 'vet', name: 'Wombat Vet', icon: '💉', base: 200, mult: 2.2, max: 5, desc: (l) => `Happiness decays ${l * 15}% slower.` },
  { key: 'stand', name: 'Grandstand', icon: '🏟️', base: 300, mult: 1.95, max: 8, desc: (l) => `Crowd cap ${40 + l * 40}, crowd income +${l * 12}%.` },
  { key: 'lab', name: 'Compost Lab', icon: '🧪', base: 450, mult: 2.15, max: 8, desc: (l) => `Cube value +${l * 15}%.` },
];
const WOMBAT_COST = (n) => Math.round(150 * Math.pow(2.6, n - 1)); // n = index of new wombat (1 = second)

const SKILLS = [
  // branch, tier, key, name, cost, desc
  { branch: 'husbandry', tier: 1, key: 'gentle', name: 'Gentle Hands', cost: 1, icon: '🤲', desc: 'Petting gives +60% happiness and shaves an extra 1.5s off digestion.' },
  { branch: 'husbandry', tier: 2, key: 'stomach', name: 'Iron Stomach', cost: 2, icon: '🫃', desc: 'All wombats digest 25% faster.' },
  { branch: 'husbandry', tier: 3, key: 'double', name: 'Double Dump', cost: 3, icon: '💩', desc: '18% chance a wombat poops two cubes.' },
  { branch: 'husbandry', tier: 4, key: 'zen', name: 'Zen Wombats', cost: 4, icon: '🧘', desc: 'Happiness decays 40% slower and wombats never get grumpy from over-petting.' },
  { branch: 'husbandry', tier: 5, key: 'goldengut', name: 'Golden Gut', cost: 6, icon: '👑', desc: 'Premium cubes are worth x3 and happen 2x as often.' },
  { branch: 'engineering', tier: 1, key: 'crane', name: 'Steady Crane', cost: 1, icon: '🏗️', desc: 'Crane moves 25% slower and cubes drop without angle jitter.' },
  { branch: 'engineering', tier: 2, key: 'guide', name: 'Landing Guide', cost: 2, icon: '🎯', desc: 'Shows a drop guide line under the crane.' },
  { branch: 'engineering', tier: 3, key: 'widebase', name: 'Wide Base', cost: 3, icon: '🧱', desc: 'Platform is 35% wider.' },
  { branch: 'engineering', tier: 4, key: 'gyro', name: 'Gyro Stabilizers', cost: 4, icon: '🌀', desc: 'All cubes get angular damping and +15% friction.' },
  { branch: 'engineering', tier: 5, key: 'bullet', name: 'Bullet Time', cost: 6, icon: '⏱️', desc: 'Time slows automatically whenever the tower wobbles dangerously.' },
  { branch: 'showbiz', tier: 1, key: 'hype', name: 'Hype Man', cost: 1, icon: '📣', desc: 'Crowd gathers 35% faster and larger.' },
  { branch: 'showbiz', tier: 2, key: 'merch', name: 'Merch Stand', cost: 2, icon: '👕', desc: 'Crowd income +30%.' },
  { branch: 'showbiz', tier: 3, key: 'scout', name: 'Talent Scout', cost: 3, icon: '🔭', desc: 'Choose from 4 perks instead of 3.' },
  { branch: 'showbiz', tier: 4, key: 'headstart', name: 'Head Start', cost: 4, icon: '🚀', desc: 'Every run starts with a free random perk.' },
  { branch: 'showbiz', tier: 5, key: 'legend', name: 'Living Legend', cost: 6, icon: '🌟', desc: 'Cash-out bonus x2 and +2 skill points per run.' },
];
const BRANCH_NAMES = { husbandry: 'Husbandry', engineering: 'Engineering', showbiz: 'Showbiz' };

const PERKS = [
  { key: 'glue', name: 'Gorilla Glue', icon: '🧴', desc: 'Every cube gains adhesion. Everything clings a little.', rarity: 1 },
  { key: 'feather', name: 'Feather Fall', icon: '🪶', desc: 'Dropped cubes fall 40% slower until they touch something.', rarity: 1 },
  { key: 'hypetrain', name: 'Hype Train', icon: '🚂', desc: 'Crowd income x1.7.', rarity: 1 },
  { key: 'bedrock', name: 'Bedrock', icon: '🪨', desc: 'The lowest 3 settled cubes fuse to the platform.', rarity: 2 },
  { key: 'windbreak', name: 'Windbreaker', icon: '🧥', desc: 'Wind gusts are 70% weaker.', rarity: 1 },
  { key: 'net', name: 'Safety Net', icon: '🥅', desc: '+2 cubes may fall off before the run ends.', rarity: 1 },
  { key: 'goldrush', name: 'Gold Rush', icon: '💰', desc: 'Gold cubes worth x2. Your next 3 cubes pay like gold.', rarity: 2 },
  { key: 'bigboned', name: 'Big Boned', icon: '🦴', desc: 'All future cubes are 15% larger.', rarity: 1 },
  { key: 'slowhands', name: 'Slow Hands', icon: '🐢', desc: 'Crane moves 40% slower.', rarity: 1 },
  { key: 'encore', name: 'Encore', icon: '🎭', desc: 'The first collapse is forgiven: falling cubes vanish, the standing ones stay.', rarity: 2 },
  { key: 'magnet', name: 'Magnet', icon: '🧲', desc: 'Falling cubes drift toward the tower center.', rarity: 1 },
  { key: 'taxbreak', name: 'Tax Break', icon: '🧾', desc: 'Placement pay x1.6.', rarity: 1 },
  { key: 'surge', name: 'Crowd Surge', icon: '🌊', desc: '+40 spectators instantly.', rarity: 1 },
  { key: 'rubber', name: 'Rubber Floor', icon: '🟪', desc: 'Cubes lose all bounce. Bouncy cubes become safe money.', rarity: 1 },
  { key: 'deepfreeze', name: 'Deep Freeze', icon: '🧊', desc: 'Ice cubes get normal friction but keep their value.', rarity: 1 },
  { key: 'momentum', name: 'Momentum', icon: '📈', desc: 'Stack Power bonus per cube doubled (8% -> 16%).', rarity: 2 },
  { key: 'heavymetal', name: 'Heavy Metal', icon: '🎸', desc: 'Iron cubes pay x3 and get +30% friction.', rarity: 1 },
  { key: 'calm', name: 'Calm Skies', icon: '🌤️', desc: 'No earthquakes this run.', rarity: 1 },
];

const WOMBAT_NAMES = ['Wilbur', 'Doris', 'Chonk', 'Beans', 'Mabel', 'Gus', 'Pudding', 'Winnie', 'Bruce', 'Nugget', 'Sheila', 'Tubs', 'Barnaby', 'Pip', 'Otis', 'Lumpy'];

const TIPS = [
  'Iron cubes on the bottom, Feather cubes on top. Physics is real.',
  'Sticky cubes are glue. One every few layers saves towers.',
  'A Slab can turn a wobbly top into a fresh flat floor.',
  'Ice and Gold pay huge. Place them only when the tower is calm.',
  'Happy wombats digest faster and poop premium cubes.',
  'Wind starts around 6 cubes high. Perks can tame it.',
  'Cash out before the tower cashes you out.',
  'Every 5 settled cubes: pick a perk. Every 10: Stack Power up.',
  'Over-petting makes wombats grumpy. Unless they are Zen.',
  'Press 1-9 to swap cubes quickly. Space drops.',
];
