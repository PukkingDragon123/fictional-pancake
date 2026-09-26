# Wombat Farm

A cozy pixel-art farm game: take over a run-down wombat farm from Momo, the old
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
Creek, and up to the farm gate where Momo is waiting.

1. **Meet Momo.** You start with your hands and W$300. Momo hands you her old sickle and
   teaches each job in a dialogue box with her portrait. Every job unlocks the tool
   it needs, which you then buy at Wombat Mart (click the truck). An arrow points at
   whatever the job is about, and the toolbar slot you need glows.
2. **Tidy up.** Cut the weeds with the sickle, have the ants take the old logs, and sow
   grass inside the rope. A tidy garden brings your first wombat.
3. **Grow.** Hoe a bed, sow seed on it, water it, and pick it with the hand when it glows.
4. **Feed.** Put a bowl down with the feed tool. She eats, wanders off, and leaves a cube.
5. **Sell or spread.** Load cubes into the truck and sell them to Momo, who pays more for a
   load. Or spread one on a planted bed with the Poo Scoop: it grows twice as fast.
6. **Shape the land.** The shovel is a brush: dig down with the left button, heap up
   hills with the right. Water poured into a hole stays and flows along any dug channel,
   so you can make ponds and creeks. Frogs move in.

7. **Furnish it.** Captain Kirk's Ottoman Empire, in town (Kirk is a robot in an I ♥ KIRK T-shirt), sells every piece of furniture:
   ottomans, a Chesterfield, a captain's armchair, lamps, rugs, a hammock, a ship's wheel,
   and the garden things too. Click the Captain to open his catalogue: his face on the
   left, the stock on the right in two tabs, and one click buys a piece.

8. **Build a factory.** Press B for the Build menu: buy machines into an inventory, place
   them on your land, turn them with R, pick them back up. A Poop Hopper sucks up cubes,
   conveyor belts carry them to a Fertiliser Mill (a bag is worth three cubes), then a Grow
   House (two carrots a bag), then a Pickup Point sells whatever arrives. Splitters, Storage
   Crates, a Wombat Feeder that hands carrots to hungry wombats, Sprinklers and Yard Lamps
   help out.
9. **Go exploring.** Still Lake, Blackwood and Fern Gully are on the map: long painted places
   to drag along, with things lying about to pick up for W$ (new ones each day). Each is for
   sale; buy it and you find twice as much there, and it unlocks a building of its own: a Fish
   Trap, a Mushroom Log or a Beehive.

Momo tells you what to do next in a speech bubble and chats if you click her. Momo is a cheerful girl in a wombat onesie. Shaz from
the mart, Groot and Captain Kirk drop by now and then, the weather changes on its own, and a day is twelve minutes long.

The clock under your purse shows the time, the day and the weather. The picture goes
through a WebGL shader pass (soft glow on lights, a warm and cool colour grade, a fixed
paper-and-canvas grain, a blue cast at night). Turn it off with SHADERS in How to Play
if your machine struggles; without WebGL the game simply draws without it.

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
| B | Build menu (R rotates, Esc stops placing) |
| H | How to play |
| Esc | Back / title screen / skip the drive in |

## Code

- `js/main.js` - state, the save, input and the main loop
- `js/grove.js` - the garden scene: wombats, tools, the truck, plots
- `js/world.js` - the painted ground, grass, weeds, crops, trees and fertiliser
- `js/wild.js` - the shovel's height field and flowing water, critters, and visitors: Shaz, Groot and Captain Kirk
- `js/guide.js` - Momo: the jobs, his lessons, the tools each job unlocks, the pointer arrow
- `js/talk.js`, `js/portraits.js` - the dialogue box and the big 64x64 faces with moods
- `js/uikit.js`, `css/theme.css` - the pixel farm-game interface, on canvas and in HTML
- `js/iconart.js` - the hand-drawn 16x16 tool and item icons
- `js/scenery.js` - the painted country: ranges, fields, forest, village, road, the car
- `js/menu.js` - the title screen, driving through the forest
- `js/intro.js` - the drive into Wombat Creek and up to the farm gate
- `js/ottoman.js` - Captain Kirk's Ottoman Empire and his catalogue
- `js/kirk.js` - Captain Kirk, the robot: his figure and his portrait
- `js/jimgirl.js`, `js/busts.js` - Momo in her onesie, and portraits for Shaz and Groot
- `js/factory.js` - the machines, belts, the Build menu and the poop economy
- `js/explore.js` - Still Lake, Blackwood and Fern Gully
- `js/shader.js` - the WebGL pass over the finished picture: glow, colour grade, paper grain, night tint, vignette
- `js/furnart.js` - the furniture, drawn pixel by pixel
- `js/map.js`, `js/drive.js`, `js/shop.js`, `js/nursery.js` - the other scenes
- `js/ui.js` - the HUD, the toolbar and the panels
- `js/art.js`, `js/sprites.js`, `js/props.js`, `js/icons.js`, `js/tex.js`, `js/fx.js` - the art
- `js/data.js` - crops, tools, prices, apps and furniture

## itch.io art

`promo/cover.gif` (630x500) and `promo/banner.gif` (960x320) are looping pixel GIFs painted
with the game's own sprites: the cover is the title with Momo and the wombats, the banner is
Momo, Groot, Shaz and Captain Kirk dancing and singing together. `promo/*.png` are stills. To redraw them, run
`node promo/render.js` (it needs Playwright).
