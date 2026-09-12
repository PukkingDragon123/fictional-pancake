# Wombat Gods

A pixel-art game about restoring a dead forest and summoning the wombat gods who
live under it. No build step, no dependencies: open `index.html`, or serve the folder.

```
python3 -m http.server 8000   # then visit http://localhost:8000
```

`wombat-gods.html` is a generated single-file build (every stylesheet and script
inlined). Rebuild it with `python3 build.py` after changing anything in `js/` or `css/`.

## The grove

You inherit an empty, ash-grey plot with no wombats on it: fallen trees, ruins, weeds,
bugs, and a dark forest pressing in behind with crows and owls in it. The grove is wider
than the window - drag bare ground, roll the wheel, or press the arrow keys and the
camera pans, with five layers of trees drifting past at their own rates. Everything you
do to the ground is painted, not placed. There is no tile grid anywhere.

Nothing on screen is a widget if it can be a thing instead: money is a leather coin tag,
the clean-up list is a paper taped to the corner, the tools sit in a leather belt with
stitched loops over slate pockets, the flyout is a canvas pouch, and every panel is a page
in a spiral notebook. Every surface follows the same rule the good pixel-art farms use:
one thick black line around it, a light bevel on the upper left, a dark one on the lower
right, and a warm fill. Nothing is rounded. Buttons squash when pressed, the money tag
bumps when coins land, ticks pop onto the list. The tools are:

- **Hand** drags poop cubes to the truck, pets wombats, harvests, and opens the store,
  the signpost map and the Tree of Life seed.
- **Food** opens every food you have grown, so you can pick what to feed.
- **Farm** opens the four ground brushes: **hoe** tills, **seed** sows the crop you pick,
  **grass** scatters sprouts, **water** feeds them. Sprouts and crops both take time and
  watering; grass does not appear the instant you drag.
- **Sickle** cuts weeds. There are a hundred and ninety of them - thistles, brambles, dry
  tussocks and nettles - chest high, and each takes a few swings: a weed has two to four
  points of health, shakes and sheds leaves when hit, and shows its pips while you work
  it. The rusty sickle you start with does one point a swing. Every weed that comes out
  drops a coin that arcs into your purse, and that is how you afford a better one.
- **Haul** calls an ant moving company. Five ants march in, shoulder the wreck and carry
  it off; it costs W$ per piece.
- **Pair** unlocks with a nest.

You do not have to tidy the whole plot. A rope on stakes marks out a clearing in the
middle - about fifty weeds, four wrecks, and the grass to grow back over it - and the
paper list in the corner tracks just that. Finish it and the screen letterboxes, the
camera pushes in, and one wombat walks into the grove. The weeds beyond the rope are
yours to cut for coin whenever you like.

## Tools have ranks

Sickle, hoe and watering can each come in three ranks - Rusty, Iron, Moon; Stick, Iron,
Broad; Tin, Copper, Rain - and the mart's TOOLS aisle sells the next one up. Higher ranks
swing wider, and the sickle hits harder.

## The cultist

A hooded figure in a charcoal robe - gold hem, gold cuffs, a gold cross on the chest, and
nothing but black inside the hood - follows you around the grove, walks or runs to whatever
needs doing, raises a staff and casts when you finish a step, and sits down if you dawdle.
Nine animations (idle, walk, run, turn, jump, cast, hurt, sit, sleep), all on
`sheets/cultist.png`. She keeps a pocket notebook, and Her notebook sits in the corner of the
screen: the step you are on, a sketch of the tool, a line of advice, and the steps behind
it struck through and ticked in red. Twelve of them, from cutting the first weed to
calling the first god. Fold it shut with the minus if you would rather work it out.

Brushes interpolate along the drag, so a fast sweep paints a continuous band.

## Poop, the truck, the map and the store

Fed wombats leave stackable cubes on the ground. Drag them into the truck, or press the
truck button to call it over. The signpost opens a fogged parchment **map**: the grove,
**Wombat Mart**, the Ritual Site and the Great Stack are yours, the rest is under fog
until enough gods answer.

Wombat Mart is a convenience store, striped sign and all. The glass doors slide apart on
a lit interior, and inside are signed aisles - SEEDS, BUILD, YARD, ADOPT - of gondola
shelving with price tags on every shelf lip, a cooler wall of bottles, a basket stack, a
slushie machine and a checkout counter with a wombat behind it. Swipe sideways to walk
the aisles, click a product into the basket, and pay at the counter.

## Wombats

Drawn to a sprite sheet: a fat rounded loaf of a body, the head a rounded bump on the
front carrying a big dark nose block and two dot eyes, small round ears, four stubby legs
ending in dark paws, a darker dithered saddle along the back, salmon-brown fur, and one
black line around the lot. Fifteen animations - idle, walk, run, turn (side to back to
side), jump, hurt, sit, lie down, sleep, eat, graze, dig, happy, pray, bite - every frame
of which is laid out in `sheets/wombat.png`. Feed one and it leaves an **offering**; pet it
to hurry that along. Happy wombats leave blessed ones.

Buy a **nest** and the pair tool unlocks. Pair two content adults and a joey arrives,
growing baby to juvenile to adult. Traits (gut, calm, luck) are inherited from both
parents with drift; the pelt comes from one of them, with a chance of a rare variant:
pale, gilded, mossgrown, or starlit.

## The gods

Ten of them, each wanting a particular stack of offerings at the shrine. Stage the
offerings, then summon. The rite is a seven-beat cutscene: the light dies, roots tear
out of the ground, a rune circle spins up, lightning strikes the altar, and the god
rises out of the glare. Each grants a standing blessing and drops an artifact.

| God | Domain | Blessing |
| --- | --- | --- |
| Demewombra | Harvest | Crops ripen twice as fast |
| Burrowseidon | Deep water | Rain waters the whole grove |
| Apollowomb | Sun and song | Wombats digest half again as fast |
| Artewombis | Moon and hunt | Rare pelts come twice as often |
| Wombeus | Storm | Lightning seeds grass across bare ground |
| Hephaeswomb | Forge | Every brush works twice as wide |
| Athenwomb | Wisdom | One more fruit ripens on the Tree |
| Aphrowombite | Fond company | Every pairing brings twins |
| Chonkades | The under-burrow | Gold seams surface in tilled soil |
| Wombonysus | The long feast | Offerings at the shrine pay double |

## W$ and the Tree of Life

Gilded and rune offerings, and the gods' artifacts, sell for **W$** at the store counter.
W$ buys seed, wombats, burrows, troughs, carts, seating, decorations - and the ants.

A small magical seed sits in the middle of the plot. Click it and the view becomes the
**Tree of Life** - a proper skill tree. Three branches (SOIL, BEAST, RITE) of four ranks,
each rank a plaque with a big icon, its name, its cost and its state, joined by limbs with
sap running up the ones that are open. A rank only opens when the rank below it has been
eaten and the forest has come back far enough to ripen it. Pick one and the card along the
bottom gives you the full description and the LEARN button; buy it and a wombat walks up
the branch and eats the fruit, crumbs and all. Drag to pan, wheel to zoom.

## Locks

Almost nothing is handed over at the start. You begin with a hand and a sickle; the ants
arrive once the weeds are down, the ground brushes once the wrecks are gone, the seed,
water and food tools once the grass is in. The map is fog except your own grove until the
mart, the ritual site and the great stack each earn their place on it. The cultist's
notebook always names what opens the next thing.

## The Rite

Stack offerings on the shrine plinth with a swinging crane. Real rigid-body physics:
mass, friction, restitution and adhesion all matter. Height draws a congregation that
pays per second. Three combo goals roll each run. A swinging censer, gusts, falling
stone and tremors arrive with height. Fat wombat cupids drift past — catch one for a
timed blessing. Leave with the money before it comes down.

## Controls

| Where | Keys |
| --- | --- |
| Grove | Drag to use the brush, drag bare ground to pan. `1`-`7` tools, arrows pan, `M` map |
| Shrine | Click an offering to stage it, shift-click for five |
| Tree of Life | Drag to pan, wheel or `+`/`-` to zoom. Click a fruit |
| Mart | Drag sideways to walk the aisles. Click a product, then the counter |
| Rite | `Space` drop, `1`-`9` pick, `R` turn, `C` cash out. Click a cupid |
| Anywhere | `Esc` back or close, `H` help |

## Code map

- One sun, upper left, and one black line. Every prop leaves `Props.cached` with ordered
  dither grain over its lower half, its top edge lit, its underside darkened, and a solid
  black outline, so the whole scene agrees about where the light is and where the edges are.
- `js/art.js` - pixel primitives (snapped ellipses, scanline polygons, ink outlines) and
  the palette: barren ash, living moss, divine violet and gold.
- `js/world.js` - the gridless ground. Two painted offscreen layers stamped by
  pre-rendered dithered brushes; weeds, bugs, crops and blades at float positions;
  coverage measured by downsampling the paint layer.
- `js/sprites.js` - one routine draws every wombat. Age is a coordinate scale about the
  feet, pelts are palette swaps, poses are computed curves. Also the cultist, gods, cupids,
  ants, crows, owls and the mascot.
- `sheet.html` - open it to see every character, every pose, every frame, labelled; the
  PNGs in `sheets/` are exported from it.
- `js/props.js` - dead and living trees, fallen logs, ruins, the carved stone altar, the
  store, the truck, crops, and the Tree of Life generator, which returns the artwork
  together with the seat of every fruit.
- `js/icons.js` - every interface icon, drawn as pixel art. The game uses no emoji.
- `js/physics.js` - impulse-based rigid bodies: warm-started sequential impulses,
  split-impulse position correction, speculative contacts, adhesion, and a sleep
  threshold that clears solver jitter in tall stacks.
- `js/grove.js`, `js/ritual.js`, `js/knowledge.js`, `js/map.js`, `js/shop.js`,
  `js/tower.js` - the six scenes.
- `js/fx.js` - particles, camera, shake, slow motion, lightning, growing roots.
- `js/audio.js` - WebAudio effects and a modal chiptune sequencer.
- `js/data.js` - all balance data. `js/ui.js` - interface. `js/main.js` - state and loop.
