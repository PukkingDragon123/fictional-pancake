# Wombat Cube Tycoon

The land is dead. Ten gods sleep under the ash. You have a censer, a trowel and some
wombats, and wombats are, it turns out, how a world comes back.

A pixel-art restoration game with a gridless painted world, inherited genetics and a
rigid-body stacking minigame. No build step, no dependencies: open `index.html` in a
browser, or serve the folder with any static server.

```
python3 -m http.server 8000   # then visit http://localhost:8000
```

`wombat-cube-tycoon.html` is a generated single-file build of the whole game (every
stylesheet and script inlined) for sharing or opening straight from disk. Rebuild it with
`python3 build.py` after changing anything under `js/` or `css/`.

## Four places

**The Grove.** The main scene, and a sandbox rather than a farm. There is no tile grid
anywhere in it: the ground is three painted layers and every tool stamps a dithered disc
wherever the cursor happens to be, so a field is whatever shape you drew. Sweep ash with
the censer, till the bare ground with the trowel, sow a seed into the soil, water it,
reap it. Wombats find ripe crops by themselves and eat them, and **eating is what restores
the ground** — the moss is painted under the animal, not under the crop, so the grove
comes back along the paths the herd actually walks. What a wombat leaves behind is an
offering. Click it to store it; click a wombat with an empty hand to pet it.

**The Shrine.** Ten alcoves cut into the rock, one per god, each holding a shrouded shape
until its rite is paid. A rite costs offerings; a god only listens once you have earned
enough favour all told, which is how the order of waking is set without a tech tree.
Waking one runs a short cutscene and grants a blessing that applies everywhere — settled
soil, faster crops, night work, a fatter tithe. Each god also keeps an artifact, bought
later with favour at the Market.

**The Roots.** A cross-section of the ground beneath the shrine. Three roots run down
into the dark and fifteen skills hang off them as fruit, bought with fruit rather than
money. A root only opens once enough gods are awake, so knowledge and worship advance
together. Scroll down; the deeper it gets, the darker it gets.

**The Tower.** Stack your offerings on the altar under a swinging hoist. Real rigid-body
physics: mass, friction, restitution and adhesion all matter, so Ironstone belongs low,
Pith high, Resin holds a lean and a Slab turns a wobbling top into a floor. Height brings
pilgrims and pilgrims pay per second. Obstacles arrive by height rather than by clock — a
gust at five, ashfall at seven, a grasping root at ten, bone spikes at thirteen, a deep
quake at sixteen — so the run gets harder only because it is going well. Every run carries
one combo goal, and goals are the main source of favour. Every five offerings placed, a
cupid offers you a blessing. Take it up before it comes down.

## The warren

Wombats age from joey to young to adult to elder, and they breed. A joey draws its traits
from the union of its parents': a trait both parents carry passes on almost always, one
parent about half the time, with a small chance of something neither of them had. Coats
work the same way, and two carriers of the same rare coat breed true. Twelve traits, eight
coats, four of them rare. There is no way to buy a good line — only to breed one.

Nothing dies on its own. Once Marrow is awake you may send an elder into the bone, which
leaves Ossuaries and puts its name on the shrine wall, but that is always your hand.

## Currency

- **W$** buys seeds, tools, wombats and warren space.
- **Offerings** are what the wombats leave. They pay for rites and they are the blocks you
  stack.
- **Fruit** comes off crops as they are eaten and buys the root network.
- **Favour** comes off offerings, tower goals and cash-outs. Two numbers are tracked: what
  you can spend on artifacts, and what you have earned all told, which is what the gods
  listen for.

## Controls

`1`–`5` pick a brush, `0` the empty hand, `Tab` cycles the four places, `S` the Market,
`W` the Warren, `H` help. In the tower: `Space` drops, `1`–`9` pick an offering, `R` turns
it, `C` takes it up.

## How it is put together

Fifteen ES5-ish IIFE modules under `js/`, loaded in dependency order by `index.html`. No
framework, no bundler, no emoji — every icon and every creature is drawn from code at
runtime.

| file | what it owns |
| --- | --- |
| `util.js` | small maths and formatting helpers |
| `art.js` | the palette, pixel drawing primitives, ordered dithering |
| `sprites.js` | wombats (ten poses, four ages, eight coats), gods, cupids, pilgrims, offerings |
| `icons.js` | every interface icon, drawn 16×16 from three primitives |
| `world.js` | the gridless ground: three painted layers and the free entities on them |
| `physics.js` | rigid bodies, contacts, friction, adhesion |
| `data.js` | all balance: gods, crops, tools, offerings, traits, skills, goals, prices |
| `fx.js` | particles, floaters, camera, cinematics |
| `breeding.js` | pairing, inheritance, joeys, elders, cupids |
| `grove.js` | the grove scene, the herd's day, the brush |
| `ritual.js` | the shrine, the ten niches, the summoning cutscene |
| `knowledge.js` | the root network |
| `tower.js` | the stacking runs, obstacles, goals, blessings |
| `ui.js` | ribbon, trays, market, warren, readouts, modals |
| `main.js` | state, save/load, input, the loop |

### The gridless world

`world.js` holds three offscreen canvases the size of the play field — ash on top, soil and
moss beneath — plus a wet layer. A tool call is one `Art.ditherDisc` stamp: coverage falls
from 1 at the centre to 0 at the rim and each pixel survives only if its coverage beats its
threshold in an 8×8 Bayer matrix, so a soft brush comes out hand-stippled rather than
blurred, and overlapping strokes build an irregular edge. Sampling the ground is a
one-pixel read, not a cell lookup. Coverage for the restoration figure is measured by
shrinking the moss layer onto an 80×30 canvas once every 1.4 seconds instead of counting
155,000 pixels a frame.

Everything standing on the ground — weeds, bones, rocks, crops, tufts, flowers, bugs,
saplings — is a free entity at a float position, drawn back to front by `y` in one pass
that the wombats and dropped offerings are merged into. Two crops can sit two pixels apart
and nothing snaps.

Saves store the three layers as 80×30 coverage bytes rather than as pixels and re-stamp
them on load, which keeps a save around 15 kB. The reloaded grove is the same shape, if not
the same speckle.

### Drawing

Every sprite is built once on a small canvas at one art-pixel per canvas pixel, given a
hard one-pixel black outline by a per-pixel pass, then cached and blitted with smoothing
off. Poses are computed from numbers rather than hand-keyed, so a new pose is a case in a
switch. A joey is not a shrunk adult — the head keeps most of its size while the barrel and
legs lose theirs. Gods are drawn entirely from their row in `data.js`, so ten gods are ten
rows of data rather than ten sprites.

The palette is three ramps and a rule: ash and bone for the dead land, moss for anything
you have brought back, violet and gold for the gods and nothing else. Divine light always
reads as divine because it appears nowhere else.
