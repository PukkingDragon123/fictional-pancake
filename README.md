# Wombat Cube Tycoon

A 2D pixel-art incremental / tycoon / physics-stacking game. No build step, no dependencies:
open `index.html` in a browser (or serve the folder with any static server).

```
python3 -m http.server 8000   # then visit http://localhost:8000
```

## The loop

1. **Pen** – feed your wombats (select a food, click a wombat). They digest, then poop a **cube**.
   Different foods make different cubes: Iron (heavy), Sticky (glue), Feather (light), Slab (wide),
   Ice (slippery), Gold (valuable), Bouncy (chaos), Pebble (tiny x2), Big.
2. **Pet** wombats (click with no food selected) to raise happiness and shave seconds off digestion.
   Happy wombats digest faster and produce **premium** cubes. Over-petting makes them grumpy.
3. Buy **toys**, **decorations**, **facilities** (auto trough, cube conveyor, vet, grandstand,
   compost lab, pen expansion) and more **wombats** in the shop.
4. **Tower** – start a run and drop cubes from the swinging crane onto the platform.
   Real rigid-body physics: mass, friction, restitution and adhesion all matter.
   Height draws a crowd, the crowd pays per second, every settled cube pays out.
5. Every 5 settled cubes: pick a **roguelike perk**. Every 10: **Stack Power** up (money multiplier
   and friction). Wind gusts start around 6 high, earthquakes around 12.
6. Cubes that fall off cost a life. Out of lives = **collapse** (slow-mo, letterbox, the works).
   **Cash out** any time to bank a bonus. Runs award **skill points** for the permanent skill tree
   (Husbandry / Engineering / Showbiz).

## Controls

| Where | Key / Mouse |
| --- | --- |
| Pen | Click wombat: pet / feed. Click cube: collect. `1-9` select food, `0`/`P` pet mode |
| Tower | Click / `Space` drop, `1-9` pick cube, `R` rotate cube, `C` cash out |
| Anywhere | `Tab` switch view, `S` shop, `K` skills, `Esc` close |

Progress autosaves to `localStorage`; wombats keep digesting while you are away (up to 2 hours).

## Code map

- `js/physics.js` – small impulse-based rigid-body engine (oriented boxes, warm-started sequential
  impulses, split-impulse position correction, speculative contacts, friction, restitution, adhesion).
- `js/pen.js` – wombat simulation and pen rendering. `js/tower.js` – runs, crane, crowd, hazards, perks.
- `js/fx.js` – particles, camera, screen shake, slow-mo, letterbox, title cards.
- `js/audio.js` – WebAudio synth SFX and a tiny chiptune sequencer. `js/data.js` – all balance data.
- `js/ui.js` – HUD, hotbars, shop, skill tree, modals. `js/main.js` – state, save/load, game loop.
