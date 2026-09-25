# Wombat Farm

A cozy pixel-art farm game: take over a run-down wombat farm from Jim, the old
caretaker. Tidy the overgrown garden, grow veg, feed the wombats who move in, and sell
the little square cubes they leave (or spread them on the beds as fertiliser). No build
step, no dependencies: open `index.html`, or serve the folder.

```
python3 -m http.server 8000   # then visit http://localhost:8000
```

`wombat-gods.html` is a generated single-file build (every stylesheet and script
inlined). Rebuild it with `python3 build.py` after changing anything in `js/` or `css/`.

## Playing

The game opens with the drive in: through the forest, down the one street of Wombat
Creek, and up to the farm gate where Jim is waiting.

1. **Meet Jim.** You start with your hands and W$300. Jim hands you his old sickle and
   teaches each job in a dialogue box with his portrait. Every job unlocks the tool
   it needs, which you then buy at Wombat Mart (click the truck). An arrow points at
   whatever the job is about, and the toolbar slot you need glows. A phone is W$80; its
   apps come from the App Store on the phone itself.
2. **Tidy up.** Cut the weeds with the sickle, have the ants take the old logs, and sow
   grass inside the rope. A tidy garden brings your first wombat.
3. **Grow.** Hoe a bed, sow seed on it, water it, and pick it with the hand when it glows.
4. **Feed.** Put a bowl down with the feed tool. She eats, wanders off, and leaves a cube.
5. **Sell or spread.** Load cubes into the truck and sell them to Jim, who pays more for a
   load. Or spread one on a planted bed with the Poo Scoop: it grows twice as fast.
6. **Shape the land.** The shovel is a brush: dig down with the left button, heap up
   hills with the right. Water poured into a hole stays and flows along any dug channel,
   so you can make ponds and creeks. Frogs move in.

Jim tells you what to do next in a speech bubble and chats if you click him. Neighbours
wander in now and then, the weather changes on its own, and a day is twelve minutes long.

## Controls

| Input | What it does |
| --- | --- |
| 1&ndash;0 or click the toolbar | Pick a tool |
| Right-click or Tab | Open the tool tray |
| Shovel: hold left | Dig down |
| Shovel: hold right or Shift | Heap up a hill |
| Watering can over a hole | Fill it with water |
| `[` `]` or wheel | Brush size |
| Drag bare ground, arrows, A/D | Look around the garden |
| M | Map |
| P | Phone |
| H | How to play |
| Esc | Back / title screen / skip the drive in |

## Code

- `js/main.js` - state, the save, input and the main loop
- `js/grove.js` - the garden scene: wombats, tools, the truck, plots
- `js/world.js` - the painted ground, grass, weeds, crops, trees and fertiliser
- `js/wild.js` - the shovel's height field and flowing water, critters, visiting neighbours
- `js/guide.js` - Jim: the jobs, his lessons, the tools each job unlocks, the pointer arrow
- `js/talk.js`, `js/portraits.js` - the dialogue box and the big 64x64 faces with moods
- `js/uikit.js`, `css/theme.css` - the soft cream-and-mint interface, on canvas and in HTML
- `js/iconart.js` - the hand-drawn 16x16 tool and item icons
- `js/scenery.js` - the painted country: ranges, fields, forest, village, road, the car
- `js/menu.js` - the title screen, driving through the forest
- `js/intro.js` - the drive into Wombat Creek and up to the farm gate
- `js/map.js`, `js/drive.js`, `js/shop.js`, `js/nursery.js` - the other scenes
- `js/phone.js`, `js/ui.js` - the white phone and its App Store, the HUD and toolbar
- `js/art.js`, `js/sprites.js`, `js/props.js`, `js/icons.js`, `js/tex.js`, `js/fx.js` - the art
- `js/data.js` - crops, tools, prices, apps and furniture
