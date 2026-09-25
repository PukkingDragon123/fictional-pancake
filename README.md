# Wombat Farm

A cozy pixel-art farm game: tidy an overgrown garden, grow veg, feed the wombats who
move in, and sell the little square cubes they leave to your neighbour, Aunt Fern, for
her compost heap. No build step, no dependencies: open `index.html`, or serve the folder.

```
python3 -m http.server 8000   # then visit http://localhost:8000
```

`wombat-gods.html` is a generated single-file build (every stylesheet and script
inlined). Rebuild it with `python3 build.py` after changing anything in `js/` or `css/`.

## Playing

1. **Tidy up.** Cut the weeds with the sickle, send the ants for the old logs, and sow
   grass inside the rope. A tidy garden brings your first wombat.
2. **Grow.** Hoe a bed, sow seed on it, water it, and pick it with the hand when it glows.
3. **Feed.** Put a bowl down with the feed tool. She eats, wanders off, and leaves a cube.
4. **Sell.** Drag the cubes into the truck, then click Aunt Fern (later, her cottage) to
   sell them. She pays more for a load than for one.
5. **Spend.** Click the truck for the map: Wombat Mart for furniture and more wombats, and
   Groot's Cellar for seed, saplings and garden things.

Aunt Fern tells you what to do next in a speech bubble and chats if you click her.
Neighbours wander in now and then, the weather changes on its own, and a day is twelve
minutes long.

## Controls

| Input | What it does |
| --- | --- |
| Right-click or Tab | Open the tool tray |
| 1&ndash;9 | Hand, Feed, Sickle, Hoe, Seeds, Watering can, Grass, Shovel, Build |
| Shovel: hold left | Raise a hill |
| Shovel: hold right or Shift | Dig a pond |
| `[` `]` or wheel | Brush size |
| Drag bare ground, arrows, A/D | Look around the garden |
| M | Map |
| P | Phone |
| H | How to play |
| Esc | Back / title screen |

## Code

- `js/main.js` - state, save slots, input and the main loop
- `js/grove.js` - the garden scene: wombats, tools, the truck, plots
- `js/world.js` - the painted ground, grass, weeds, crops and trees
- `js/wild.js` - hills and ponds from the shovel, critters, visiting neighbours
- `js/guide.js` - Aunt Fern: the step-by-step jobs, chatter and her cottage
- `js/menu.js` - the title screen at the farm gate
- `js/map.js`, `js/shop.js`, `js/nursery.js`, `js/den.js`, `js/intro.js` - the other scenes
- `js/phone.js`, `js/talk.js`, `js/ui.js` - the phone, conversations and HUD
- `js/art.js`, `js/sprites.js`, `js/props.js`, `js/icons.js`, `js/tex.js`, `js/fx.js` - the art
- `js/data.js` - crops, tools, prices and furniture
