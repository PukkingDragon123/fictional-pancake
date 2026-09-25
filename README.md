# Wombat Farm

A small, cozy pixel-art farm on one screen. No build step, no dependencies: open
`index.html`, or serve the folder.

```
python3 -m http.server 8000   # then visit http://localhost:8000
```

`wombat-gods.html` is a generated single-file build (the stylesheet and every script
inlined). Rebuild it with `python3 build.py` after changing anything in `js/` or `css/`.

## Playing

Till, water, plant, pick, sell. Feed and pet the wombats and they dig up coins and
leave the best fertiliser there is. A paper note at the top always says what to try next.

| Key | Tool | What it does |
| --- | --- | --- |
| 1 | Hand | Pet a wombat, drag one to carry it, click ripe veg to pick it |
| 2 | Hoe | Drag to till grass; right-click to put the grass back |
| 3 | Watering can | Drag over soil; crops only grow while their soil is wet |
| 4 | Seeds | Click tilled soil to plant (Q / E or the tray picks carrot, cabbage, pumpkin) |
| 5 | Veg basket | Click a wombat to feed it, or drop veg on the grass for them to find |
| 6 | Fertiliser | Wombat poo on a tile makes its crop grow twice as fast |
| 7 | Shovel | Hold to raise the land, right-click (or Shift) to lower it; low enough is a pond |

`[` `]` or the mouse wheel change the brush size of the hoe, can and shovel. Coins and poo
are picked up just by moving the pointer over them. Click the farm stand to sell veg, buy
seeds and adopt more wombats; click the house (or the bed button) after dusk to sleep
through the night. `M` toggles sound.

## Code

- `js/util.js` - small maths and colour helpers
- `js/font.js` - a 5x7 bitmap font, so text stays crisp at any scale
- `js/store.js` - the save: localStorage, plus the artifact's own store when published
- `js/sound.js` - synthesised sound effects and a quiet music box
- `js/look.js` - the palette and every sprite, drawn once into cached canvases
- `js/farm.js` - the game: the land, crops, wombats, the stand, the interface
