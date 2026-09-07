# Wombat Cube Tycoon

A cozy pixel-art farming and physics-stacking game. No build step, no dependencies:
open `index.html` in a browser, or serve the folder with any static server.

```
python3 -m http.server 8000   # then visit http://localhost:8000
```

`wombat-cube-tycoon.html` is a generated single-file build of the whole game (every
stylesheet and script inlined) for sharing or opening straight from disk. Rebuild it with
`python3 build.py` after changing anything under `js/` or `css/`.

## Three places

**The Farm.** Pick a feed and click a wombat. It digests, then leaves a cube. Click with no
feed selected to pet it, which speeds digestion and keeps it happy; happy wombats leave
premium cubes worth double. Over-petting makes them grumpy. Buy fence, trough, barrow and
bleachers, plus a ball, burrow, mud bath, flower beds and lanterns. Day turns to night.

**The Wombat Tree.** A sapling stands in the middle of the paddock. Compost cubes into it to
make it grow, and it pays you in acorns. Click it to climb: the view pans up the trunk, and
skills sit on the boughs as acorn pods. Each bough only appears once the tree reaches the
matching size, so growth and power advance together. Twelve skills across Roots, Limbs and
Crown.

**The Big Top.** Start a show and drop cubes from the swinging crane onto the pedestal. Real
rigid-body physics: mass, friction, restitution and adhesion all matter. Height draws a
crowd and the crowd pays per second. Every five settled cubes you pick a perk; every ten,
your pay multiplier and grip rise. Wind starts around six high, the drum roll shakes the
pedestal at twelve. Cubes that fall off cost a life. Cash out before it comes down.

## Cubes

| Cube | From | Good for |
| --- | --- | --- |
| Plain | Grass, Carrot | Everything |
| Big | Sweet Yam | A broad footing |
| Sticky | Honey Oats | Holding a lean together |
| Light | Fern | Safe weight up high |
| Iron | Iron Root | Anchoring the base |
| Slab | Shelf Cap | Starting a fresh floor |
| Gold | Gold Corn | Payday, once the tower is calm |

## Controls

| Where | Keys |
| --- | --- |
| Farm | Click a wombat to pet or feed. Click a cube to pick it up. `1`-`9` feed, `0` pet |
| Tree | Drag or scroll to climb, `Up`/`Down` too. Click a pod to spend acorns |
| Big Top | `Space` drop, `1`-`9` pick a cube, `R` turn it, `C` cash out |
| Anywhere | `Tab` next place, `S` shop, `H` help, `Esc` close |

Progress autosaves to `localStorage`, and wombats keep digesting while you are away, up to
two hours.

## Code map

- `js/art.js` - pixel drawing primitives (snapped ellipses, scanline polygons, ink outlines)
  and the shared palette.
- `js/sprites.js` - the procedural wombat (seven poses, four pelts, climbing frames),
  spectators, the ringmaster, and cube faces.
- `js/props.js` - the tree generator, which returns both the artwork and the branch seats
  its skills hang from, plus farm and big-top scenery.
- `js/icons.js` - every interface icon, drawn as pixel art. The game uses no emoji.
- `js/physics.js` - a small impulse-based rigid-body engine for oriented boxes: warm-started
  sequential impulses, split-impulse position correction, speculative contacts, friction,
  restitution, adhesion, and a sleep threshold that clears solver jitter in tall stacks.
- `js/pen.js`, `js/tree.js`, `js/tower.js` - the three scenes and their simulation.
- `js/fx.js` - particles, camera, shake, slow motion, letterbox, title cards.
- `js/audio.js` - WebAudio synth effects and a two-mood chiptune sequencer.
- `js/data.js` - all balance numbers. `js/ui.js` - interface. `js/main.js` - state and loop.
