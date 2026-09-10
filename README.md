# Wombat Gods

A pixel-art game about restoring a dead forest and summoning the wombat gods who
live under it. No build step, no dependencies: open `index.html`, or serve the folder.

```
python3 -m http.server 8000   # then visit http://localhost:8000
```

`wombat-gods.html` is a generated single-file build (every stylesheet and script
inlined). Rebuild it with `python3 build.py` after changing anything in `js/` or `css/`.

## The grove

You inherit an ash-grey grove: bare trees, weeds, bugs, deadfall. Everything you do to
the ground is painted, not placed. There is no tile grid anywhere.

- **Sickle** clears weeds, **net** catches bugs, both by sweeping over them.
- **Moss** sows grass wherever you drag. That is what restores the forest, and the sky,
  the treeline and the earth all change colour as the fraction climbs.
- **Hoe** tills soil, **seeds** sow a crop along the drag, **water** speeds it up.
- **Hand** harvests a ripe crop, pets a wombat, feeds it, or picks up an offering.

Brushes interpolate along the drag, so a fast sweep paints a continuous band.

## Wombats

Chunky, fat, black-outlined, with single-pixel eyes. Ten poses, all computed rather
than keyed: idle, walk, run, eat, graze, sleep, dig, happy, pray, bite. Feed one and it
leaves an **offering**; pet it to hurry that along. Happy wombats leave blessed ones.

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
| Artewombis | Moon and hunt | Bugs keep out of the grove |
| Wombeus | Storm | Lightning seeds grass across bare ground |
| Hephaeswomb | Forge | Every brush works twice as wide |
| Athenwomb | Wisdom | One more fruit ripens on the Tree |
| Aphrowombite | Fond company | Every pairing brings twins |
| Chonkades | The under-burrow | Gold seams surface in tilled soil |
| Wombonysus | The long feast | Offerings at the shrine pay double |

## W$ and the Tree of Knowledge

Gilded and rune offerings, and the gods' artifacts, pawn for **W$** at the stall. W$ buys
seed, wombats, burrows, troughs, carts, seating, and decorations.

Click the tree to climb down into its roots. Twelve skills hang there as fruit, ripening
at thresholds of forest restored. Buy one and a wombat walks over, sits up on its
haunches and eats it, crumbs and all.

## The Rite

Stack offerings on the shrine plinth with a swinging crane. Real rigid-body physics:
mass, friction, restitution and adhesion all matter. Height draws a congregation that
pays per second. Three combo goals roll each run. A swinging censer, gusts, falling
stone and tremors arrive with height. Fat wombat cupids drift past — catch one for a
timed blessing. Leave with the money before it comes down.

## Controls

| Where | Keys |
| --- | --- |
| Grove | Drag to use the brush. `1`-`8` pick a tool |
| Shrine | Click an offering to stage it, shift-click for five |
| Roots | Drag or scroll to climb. Click a fruit |
| Rite | `Space` drop, `1`-`9` pick, `R` turn, `C` cash out. Click a cupid |
| Anywhere | `Tab` next place, `B` buy, `H` help, `Esc` close |

## Code map

- `js/art.js` - pixel primitives (snapped ellipses, scanline polygons, ink outlines) and
  the palette: barren ash, living moss, divine violet and gold.
- `js/world.js` - the gridless ground. Two painted offscreen layers stamped by
  pre-rendered dithered brushes; weeds, bugs, crops and blades at float positions;
  coverage measured by downsampling the paint layer.
- `js/sprites.js` - one routine draws every wombat. Age is a coordinate scale about the
  feet, pelts are palette swaps, poses are computed curves. Also gods and cupids.
- `js/props.js` - dead and living trees, shrine, decorations, crops, and the root network
  generator, which returns the artwork together with the seat of every fruit.
- `js/icons.js` - every interface icon, drawn as pixel art. The game uses no emoji.
- `js/physics.js` - impulse-based rigid bodies: warm-started sequential impulses,
  split-impulse position correction, speculative contacts, adhesion, and a sleep
  threshold that clears solver jitter in tall stacks.
- `js/grove.js`, `js/ritual.js`, `js/knowledge.js`, `js/tower.js` - the four scenes.
- `js/fx.js` - particles, camera, shake, slow motion, lightning, growing roots.
- `js/audio.js` - WebAudio effects and a modal chiptune sequencer.
- `js/data.js` - all balance data. `js/ui.js` - interface. `js/main.js` - state and loop.
