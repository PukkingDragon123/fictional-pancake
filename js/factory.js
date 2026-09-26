// ---- Factory: machines, belts and the poop economy ------------------------------------------
// A grid over the grove floor where you stand machines and run conveyor belts
// between them. The chain it is built for:
//
//   wombats poop -> POOP HOPPER sucks the cubes up -> belt -> FERTILISER MILL
//   grinds a cube into a bag of fertiliser -> belt -> GROW HOUSE turns a bag
//   into carrots -> belt -> PICKUP POINT sells whatever reaches it.
//
// Every stage is worth more than the one before it, so a longer chain pays
// better. A SPLITTER shares a belt three ways, a STORAGE CRATE holds a queue,
// a WOMBAT FEEDER hands carrots to hungry wombats (who make more poop), a
// SPRINKLER waters the beds round it and a YARD LAMP lights the night.
//
// Buildings are bought into an inventory from the Build menu (B), placed from
// it with a ghost on the pointer, rotated with R, and picked back up.
// State lives in G.factory: { b: [{ k, c, r, d }], inv: { key: n } }.
const Factory = (() => {
  const T = 24, OY = 152, ROWS = 11;                   // tile size, top of the grid, rows down the floor
  const MS = 1.3;                                      // machines are drawn this much bigger than their art
  const DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]];     // right, down, left, up
  const INK = '#1a1420';
  let G = null;
  let grid = new Map();                                 // "c,r" -> building
  let mode = null;                                      // { key, rot } placing | { pick: true }
  let ghost = null, lastTile = null, t = 0, sold = [];

  // ---- the catalogue ------------------------------------------------------------------------
  const DEFS = {
    belt:      { name: 'Conveyor Belt', cat: 'factory', cost: 6,   blurb: 'Carries anything on it, one tile a moment, the way the arrows point. Drag to lay a run.' },
    hopper:    { name: 'Poop Hopper', cat: 'factory', cost: 60,  blurb: 'Sucks up any wombat cube nearby and sends it out the front.' },
    mill:      { name: 'Fertiliser Mill', cat: 'factory', cost: 150, blurb: 'Grinds one cube into a bag of fertiliser. Worth three times the cube.' },
    grow:      { name: 'Grow House', cat: 'factory', cost: 240, blurb: 'Feed it fertiliser and it grows carrots under glass. Two for every bag.' },
    depot:     { name: 'Pickup Point', cat: 'factory', cost: 120, blurb: 'The loading dock. Anything a belt brings here is sold on the spot.' },
    splitter:  { name: 'Splitter', cat: 'factory', cost: 35,  blurb: 'Shares what comes in between its front, its left and its right.' },
    chest:     { name: 'Storage Crate', cat: 'utility', cost: 45,  blurb: 'Holds up to twenty things and lets them out the front as there is room.' },
    feeder:    { name: 'Wombat Feeder', cat: 'utility', cost: 110, blurb: 'Takes carrots off a belt and feeds any hungry wombat nearby.' },
    sprinkler: { name: 'Sprinkler', cat: 'utility', cost: 90,  blurb: 'Waters the beds and grass around it every few seconds.' },
    lamp:      { name: 'Yard Lamp', cat: 'utility', cost: 40,  blurb: 'A lamp on a post. Lights the yard at night; the wombats like it.' },
    // one for each place you can buy out past the farm
    fishtrap:  { name: 'Fish Trap', cat: 'factory', cost: 320, need: 'lake', blurb: 'A wire trap off Still Lake. Catches a fish every little while, all on its own.' },
    shroomlog: { name: 'Mushroom Log', cat: 'factory', cost: 380, need: 'wood', blurb: 'A Blackwood log. Feed it fertiliser and it sprouts mushrooms, two a bag.' },
    beehive:   { name: 'Beehive', cat: 'factory', cost: 460, need: 'gully', blurb: 'Bees from Fern Gully. They make honey and ask for nothing.' },
  };
  const ORDER = ['belt', 'hopper', 'mill', 'grow', 'depot', 'splitter', 'fishtrap', 'shroomlog', 'beehive', 'chest', 'feeder', 'sprinkler', 'lamp'];
  const PRICE = { cube: 3, rich: 6, fert: 10, veg: 16, fish: 22, shroom: 15, honey: 20 };
  const unlocked = (k) => !DEFS[k].need || (typeof Explore !== 'undefined' && Explore.owned(DEFS[k].need));
  const priceOf = (it) => it.k === 'cube' ? (it.sub === 'rich' ? PRICE.rich : PRICE.cube) : PRICE[it.k] || 1;
  const NAMES = { cube: 'poop cube', fert: 'fertiliser', veg: 'carrot', fish: 'fish', shroom: 'mushroom', honey: 'jar of honey' };

  // ---- state -----------------------------------------------------------------------------------
  function init(g) {
    G = g;
    if (!G.factory) G.factory = { b: [], inv: {} };
    if (!G.factory.inv) G.factory.inv = {};
    grid = new Map();
    for (const b of G.factory.b) { if (!DEFS[b.k]) continue; fresh(b); grid.set(b.c + ',' + b.r, b); }
    G.factory.b = G.factory.b.filter((b) => DEFS[b.k]);
    mode = null; ghost = null; sold = [];
  }
  // the runtime parts of a building, never saved
  function fresh(b) {
    Object.defineProperty(b, 'rt', { value: { item: null, p: 0, inb: [], out: [], work: 0, spin: 0, turn: 0, flash: 0, cool: 0 }, enumerable: false, writable: true, configurable: true });
  }
  const at = (c, r) => grid.get(c + ',' + r) || null;
  const centre = (c, r) => ({ x: c * T + T / 2, y: OY + r * T + T / 2 });
  const tileOf = (x, y) => ({ c: Math.floor(x / T), r: Math.floor((y - OY) / T) });
  const front = (b, d = b.d) => at(b.c + DIRS[d][0], b.r + DIRS[d][1]);
  function canPlace(c, r) {
    if (r < 0 || r >= ROWS || c < 0 || c * T >= Grove.W) return 'off the floor';
    const { x, y } = centre(c, r);
    if (!inOwned(G, x)) return 'not your land';
    if (at(c, r)) return 'something is there';
    const tr = Grove.truck;
    if (Math.abs(x - tr.x) < 58 && y > tr.y - 44 && y < tr.y + 14) return 'the truck parks there';
    return null;
  }

  // ---- inventory -------------------------------------------------------------------------------
  const inv = (k) => (G.factory.inv[k] || 0);
  function buy(k, n = 1) {
    const d = DEFS[k]; if (!d) return false;
    if (!unlocked(k)) { Audio.play('error'); UI.toast('buy the land it comes from first', 'bad'); return false; }
    const cost = d.cost * n;
    if (G.wd < cost) { Audio.play('error'); UI.toast(`need <b>${cost} W$</b>`, 'bad'); return false; }
    G.wd -= cost;
    G.factory.inv[k] = inv(k) + n;
    Audio.play('cash'); UI.refreshHUD(); Main.save();
    return true;
  }
  function place(k, c, r, d) {
    if (inv(k) <= 0 || canPlace(c, r)) return false;
    const b = { k, c, r, d: d & 3 };
    fresh(b);
    G.factory.b.push(b); grid.set(c + ',' + r, b);
    G.factory.inv[k]--; if (!G.factory.inv[k]) delete G.factory.inv[k];
    const { x, y } = centre(c, r);
    FX.dust(x, y + 6, 6, PAL.soil3); Audio.play('place');
    G.stats.built = (G.stats.built || 0) + 1;
    return true;
  }
  function pickUp(b) {
    grid.delete(b.c + ',' + b.r);
    G.factory.b.splice(G.factory.b.indexOf(b), 1);
    G.factory.inv[b.k] = inv(b.k) + 1;
    const { x, y } = centre(b.c, b.r);
    FX.dust(x, y + 6, 6, PAL.soil3); Audio.play('click');
    UI.refreshHUD(); Main.save();
  }

  // ---- who takes what ------------------------------------------------------------------------------
  // `from` is the direction the item is travelling in when it arrives
  function accepts(b, it, from) {
    if (!b) return false;
    const rt = b.rt;
    switch (b.k) {
      case 'belt': return !rt.item && from !== ((b.d + 2) & 3);
      case 'splitter': return !rt.item;
      case 'mill': return it.k === 'cube' && rt.inb.length < 4 && from !== ((b.d + 2) & 3);
      case 'shroomlog': return it.k === 'fert' && rt.inb.length < 3 && from !== ((b.d + 2) & 3);
      case 'grow': return it.k === 'fert' && rt.inb.length < 3 && from !== ((b.d + 2) & 3);
      case 'depot': return true;
      case 'chest': return rt.inb.length < 20 && from !== ((b.d + 2) & 3);
      case 'feeder': return it.k === 'veg' && rt.inb.length < 6;
      default: return false;
    }
  }
  function give(b, it, from) {
    const rt = b.rt;
    if (b.k === 'belt' || b.k === 'splitter') { rt.item = it; rt.p = 0; return; }
    if (b.k === 'depot') { sell(b, it); return; }
    rt.inb.push(it);
  }
  // push one item out of `b` in direction d; true if it went
  function push(b, it, d) {
    const nb = front(b, d);
    if (!accepts(nb, it, d)) return false;
    give(nb, it, d);
    return true;
  }
  function sell(b, it) {
    const n = priceOf(it);
    G.wd += n;
    G.stats.factorySold = (G.stats.factorySold || 0) + 1;
    G.stats.factoryEarned = (G.stats.factoryEarned || 0) + n;
    const { x, y } = centre(b.c, b.r);
    sold.push({ x, y: y - 30, n, t: 0 });
    b.rt.flash = 0.4;
    if (Math.random() < 0.5) Audio.play('coin');
    UI.refreshHUD();
  }

  // ---- the tick -----------------------------------------------------------------------------------
  const SPEED = 1.6;                                    // tiles a second along a belt
  function update(dt) {
    t += dt;
    const drops = Grove.drops;
    for (const b of G.factory.b) {
      const rt = b.rt;
      rt.flash = Math.max(0, rt.flash - dt);
      switch (b.k) {
        case 'belt': case 'splitter':
          if (rt.item) {
            rt.p = Math.min(1, rt.p + dt * SPEED * (b.k === 'splitter' ? 1.4 : 1));
            if (rt.p >= 1) {
              if (b.k === 'belt') { if (push(b, rt.item, b.d)) rt.item = null; }
              else {
                // front, left, right in turn, starting after whichever went last
                for (let k = 0; k < 3; k++) {
                  const which = (rt.turn + k) % 3, d = [b.d, (b.d + 3) & 3, (b.d + 1) & 3][which];
                  if (push(b, rt.item, d)) { rt.item = null; rt.turn = which + 1; break; }
                }
              }
            }
          }
          break;
        case 'hopper': {
          rt.cool -= dt;
          if (rt.cool <= 0 && rt.out.length < 6 && drops && drops.length) {
            const { x, y } = centre(b.c, b.r);
            let best = null, bd = 96;
            for (const d of drops) { const dd = Math.hypot(d.x - x, d.y - y); if (dd < bd && d !== Grove.dragging) { bd = dd; best = d; } }
            if (best) {
              drops.splice(drops.indexOf(best), 1);
              rt.out.push({ k: 'cube', sub: best.type === 'rich' ? 'rich' : 'plain' });
              rt.suck = { x: best.x, y: best.y - 6, t: 0 };
              rt.cool = 0.5; Audio.play('pop');
              G.stats.gathered = (G.stats.gathered || 0) + 1;
            } else rt.cool = 0.3;
          }
          if (rt.suck) { rt.suck.t += dt * 3; if (rt.suck.t >= 1) rt.suck = null; }
          if (rt.out.length && push(b, rt.out[0], b.d)) rt.out.shift();
          break;
        }
        case 'fishtrap': case 'beehive': {
          const every = b.k === 'fishtrap' ? 14 : 18;
          if (rt.out.length < 4) { rt.work += dt; if (rt.work >= every) { rt.work = 0; rt.out.push({ k: b.k === 'fishtrap' ? 'fish' : 'honey' }); rt.flash = 0.4; } }
          if (rt.out.length && push(b, rt.out[0], b.d)) rt.out.shift();
          break;
        }
        case 'mill': case 'grow': case 'shroomlog': {
          const need = b.k === 'mill' ? 3.2 : b.k === 'grow' ? 7 : 6;
          if (rt.inb.length && rt.out.length < 4) {
            rt.work += dt; rt.spin += dt * 6;
            if (rt.work >= need) {
              rt.work = 0; rt.inb.shift();
              if (b.k === 'mill') rt.out.push({ k: 'fert' });
              else if (b.k === 'shroomlog') { rt.out.push({ k: 'shroom' }); rt.out.push({ k: 'shroom' }); }
              else { rt.out.push({ k: 'veg', sub: 'carrot' }); rt.out.push({ k: 'veg', sub: 'carrot' }); }
              rt.flash = 0.3;
            }
          }
          if (rt.out.length && push(b, rt.out[0], b.d)) rt.out.shift();
          break;
        }
        case 'chest':
          rt.cool -= dt;
          if (rt.inb.length && rt.cool <= 0 && push(b, rt.inb[0], b.d)) { rt.inb.shift(); rt.cool = 1 / SPEED; }
          break;
        case 'feeder': {
          rt.cool -= dt;
          if (rt.inb.length && rt.cool <= 0) {
            rt.cool = 1.2;
            const { x, y } = centre(b.c, b.r);
            const w = G.wombats.filter((q) => q.age !== 'baby' && q.stomach === 'empty' && Math.hypot(q.x - x, q.y - y) < 160)
              .sort((a, z) => Math.hypot(a.x - x, a.y - y) - Math.hypot(z.x - x, z.y - y))[0];
            if (w) {
              const it = rt.inb.shift();
              G.food[it.sub] = (G.food[it.sub] || 0) + 1;
              if (!Grove.feed(w, it.sub, true)) G.food[it.sub]--;
              else FX.float(w.x, w.y - 50, 'fed!', { color: PAL.gold4, size: 8 });
            }
          }
          break;
        }
        case 'sprinkler':
          rt.cool -= dt;
          if (rt.cool <= 0) {
            rt.cool = 4;
            const { x, y } = centre(b.c, b.r);
            World.water(x, y, 64);
            rt.spray = 1.2;
          }
          if (rt.spray) rt.spray = Math.max(0, rt.spray - dt);
          break;
      }
    }
    for (const s of sold) s.t += dt;
    sold = sold.filter((s) => s.t < 1.2);
  }

  // ---- drawing: the items ---------------------------------------------------------------------------
  function drawItem(g, it, x, y) {
    x = Math.round(x); y = Math.round(y);
    const R = (a, b2, w, h, c) => { g.fillStyle = c; g.fillRect(a, b2, w, h); };
    if (it.k === 'cube') {
      const s = it.sub === 'rich' ? 6 : 5;
      R(x - s / 2 - 1, y - s - 1, s + 2, s + 2, '#000'); R(x - s / 2, y - s, s, s, it.sub === 'rich' ? '#3b2a1b' : '#6a4a2c');
    } else if (it.k === 'fert') {
      R(x - 4, y - 8, 8, 8, INK); R(x - 3, y - 7, 6, 6, '#e8d8a8'); R(x - 3, y - 5, 6, 2, '#4a9a3a'); R(x - 2, y - 9, 4, 2, INK);
    } else if (it.k === 'fish') {
      R(x - 6, y - 5, 10, 5, INK); R(x - 5, y - 4, 8, 3, '#6a9ac8'); R(x - 5, y - 4, 8, 1, '#a8d0f0'); R(x + 3, y - 6, 3, 7, INK); R(x + 4, y - 5, 1, 5, '#6a9ac8'); R(x - 4, y - 4, 1, 1, INK);
    } else if (it.k === 'shroom') {
      R(x - 1, y - 5, 3, 5, INK); R(x, y - 5, 1, 4, '#f0e8d0'); R(x - 5, y - 9, 11, 5, INK); R(x - 4, y - 8, 9, 3, '#b86a3a'); R(x - 3, y - 8, 2, 1, '#e8a878');
    } else if (it.k === 'honey') {
      R(x - 4, y - 9, 8, 9, INK); R(x - 3, y - 8, 6, 7, '#f0a820'); R(x - 3, y - 8, 2, 7, '#ffd060'); R(x - 4, y - 10, 8, 2, '#c8402c');
    } else {
      const img = Props.get('produce', it.sub || 'carrot');
      g.drawImage(img, x - 7, y - 13, 14, 14);
    }
  }

  // ---- drawing: belts on the floor ------------------------------------------------------------------
  // The belt tile is cached per direction and per step of its scroll.
  const tileCache = new Map();
  function beltTile(d, s) {
    const key = d + ':' + s;
    let c = tileCache.get(key); if (c) return c;
    const o = Art.cv(T, T), g = o.g; c = o.c;
    const R = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
    // drawn pointing right, then turned
    g.save(); g.translate(T / 2, T / 2); g.rotate((d * Math.PI) / 2); g.translate(-T / 2, -T / 2);
    R(0, 2, T, 16, '#2a2a34');
    R(0, 4, T, 12, '#5a5a6a');
    for (let x = -8 + s; x < T; x += 8) {                                  // the chevrons, moving along
      for (let k = 0; k < 4; k++) { R(x + k, 6 + k, 2, 1, '#8a8aa0'); R(x + k, 13 - k, 2, 1, '#8a8aa0'); }
    }
    R(0, 2, T, 2, '#8a8a98'); R(0, 16, T, 2, '#1a1a22');                    // the rails
    for (let x = 2; x < T; x += 6) { R(x, 2, 1, 1, '#c8c8d4'); R(x, 17, 1, 1, '#4a4a58'); }
    g.restore();
    tileCache.set(key, c);
    return c;
  }
  function drawFloor(g, L, R) {
    const s = Math.floor(t * SPEED * 8) % 8;
    for (const b of G.factory.b) {
      const x = b.c * T, y = OY + b.r * T;
      if (x < L - T || x > R + T) continue;
      if (b.k === 'belt') g.drawImage(beltTile(b.d, s), x, y);
      else {
        // a concrete pad under every machine, and an arrow for which way it sends
        g.fillStyle = 'rgba(30,24,20,0.28)'; g.fillRect(x + 1, y + 3, T - 2, T - 3);
        g.fillStyle = '#a8a49a'; g.fillRect(x + 1, y + 1, T - 2, T - 3);
        g.fillStyle = '#c8c4b8'; g.fillRect(x + 1, y + 1, T - 2, 1);
        if (b.k !== 'lamp' && b.k !== 'sprinkler' && b.k !== 'depot' && b.k !== 'feeder') {
          const [dx, dy] = DIRS[b.d], ax = x + T / 2 + dx * 10, ay = y + T / 2 + dy * 10;
          g.fillStyle = '#f0c048';
          for (let k = 0; k < 3; k++) g.fillRect(Math.round(ax - dx * k - dy * k - 1), Math.round(ay - dy * k - dx * k - 1), 2, 2);
          for (let k = 0; k < 3; k++) g.fillRect(Math.round(ax - dx * k + dy * k - 1), Math.round(ay - dy * k + dx * k - 1), 2, 2);
        }
      }
    }
    // items riding the belts and splitters
    for (const b of G.factory.b) {
      if ((b.k !== 'belt' && b.k !== 'splitter') || !b.rt.item) continue;
      const { x, y } = centre(b.c, b.r), [dx, dy] = DIRS[b.d];
      const u = b.k === 'belt' ? b.rt.p - 0.5 : 0;
      drawItem(g, b.rt.item, x + dx * u * T, y + 6 + dy * u * T);
    }
  }

  // ---- drawing: the machines ------------------------------------------------------------------------
  const artCache = new Map();
  function art(k, d, f, lit) {
    const key = `${k}:${d}:${f}:${lit ? 1 : 0}`;
    let c = artCache.get(key); if (c) return c;
    const o = Art.cv(32, 44), g = o.g; c = o.c;
    const R = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
    const P = (x, y, col) => R(x, y, 1, 1, col);
    const E = (x, y, rx, ry, col) => Art.ell(g, x, y, rx, ry, col);
    const cx = 16, by = 42;
    const MET = ['#2e3a4a', '#4a5a6e', '#6e8098', '#a0b0c4'];
    switch (k) {
      case 'hopper': {
        // a green funnel on four legs with a chute out of the side it faces
        for (const lx of [8, 22]) R(lx, by - 12, 2, 12, MET[1]);
        R(9, by - 14, 14, 4, MET[1]); R(9, by - 14, 14, 1, MET[3]);
        Art.poly(g, [[3, by - 34], [29, by - 34], [21, by - 14], [11, by - 14]], '#2e7a3a');
        Art.poly(g, [[5, by - 33], [16, by - 33], [14, by - 15], [11, by - 15]], '#4ab050');
        R(3, by - 36, 26, 3, '#1e5a28'); R(3, by - 36, 26, 1, '#6ad070');
        E(16, by - 35, 10, 1.5, '#1a1a22');                                 // the mouth of it
        R(12, by - 27, 8, 6, '#f4f0e0'); R(13, by - 26, 6, 1, '#2e7a3a'); R(13, by - 24, 6, 1, '#2e7a3a');   // a label
        const [dx] = DIRS[d]; if (dx) R(dx > 0 ? 22 : 4, by - 12, 6, 4, MET[2]);
        if (f % 2) R(14, by - 38, 4, 2, 'rgba(200,220,255,0.6)');           // a breath of suction
        break;
      }
      case 'mill': {
        // a little brick mill with a grinding wheel on the side and a chimney
        R(5, by - 24, 22, 24, '#9a4a30'); R(5, by - 24, 22, 2, '#c86a48');
        for (let y = by - 20; y < by; y += 4) for (let x = 5 + ((y / 4) % 2) * 3; x < 27; x += 6) R(x, y, 1, 3, '#6a2a1a');
        Art.poly(g, [[3, by - 24], [29, by - 24], [22, by - 32], [10, by - 32]], '#5a3a2a');
        R(20, by - 38, 5, 8, '#6a6a74'); R(20, by - 38, 5, 1, '#9a9aa4');
        if (lit) for (let i = 0; i < 3; i++) E(22 + i * 2, by - 40 - i * 3 - (f % 3), 2 + i * 0.6, 1.6 + i * 0.5, 'rgba(230,230,230,0.75)');
        R(10, by - 14, 8, 14, '#3a2014'); R(11, by - 13, 6, 12, '#5a3420');  // the door
        // the wheel: spokes turning with f
        E(26, by - 12, 6, 6, MET[1]); E(26, by - 12, 4.5, 4.5, MET[2]);
        for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI + f * 0.4; Art.limb(g, 26 - Math.cos(a) * 5, by - 12 - Math.sin(a) * 5, 26 + Math.cos(a) * 5, by - 12 + Math.sin(a) * 5, 0.8, 0.8, MET[0]); }
        E(26, by - 12, 1.5, 1.5, '#e8c050');
        R(7, by - 22, 11, 5, '#f4f0e0'); Font.draw(g, 'FERT', 8, by - 22, { scale: 1, color: '#4a8a32' });
        break;
      }
      case 'grow': {
        // a glasshouse: white frame, pale green panes, carrots growing inside
        R(3, by - 20, 26, 20, '#cfe8e0');
        Art.poly(g, [[2, by - 20], [30, by - 20], [16, by - 34]], '#b8dcd4');
        for (const x of [3, 11, 20, 28]) R(x, by - 20, 1, 20, '#fbfbf4');
        R(3, by - 20, 26, 1, '#fbfbf4'); R(3, by - 10, 26, 1, '#fbfbf4');
        Art.line(g, 2, by - 20, 16, by - 34, '#fbfbf4', 1); Art.line(g, 30, by - 20, 16, by - 34, '#fbfbf4', 1);
        R(6, by - 25, 5, 3, 'rgba(255,255,255,0.7)');                       // a glint on the glass
        for (let i = 0; i < 5; i++) {                                         // what is growing in there
          const x = 6 + i * 5, h = 3 + ((i + f) % 3) + (lit ? 2 : 0);
          R(x, by - 2 - h, 1, h, '#3f8a32'); R(x - 1, by - 3 - h, 3, 1, '#6ab850');
          if (lit && i % 2) R(x - 1, by - 3, 3, 2, '#e0763a');
        }
        R(3, by - 2, 26, 2, '#6a4a2c');
        break;
      }
      case 'depot': {
        // a wooden loading dock with crates, a sign, and a flag on a pole
        R(1, by - 10, 30, 10, '#8a5a30'); R(1, by - 10, 30, 2, '#c08a50');
        for (let x = 3; x < 31; x += 6) R(x, by - 8, 1, 8, '#5a3a1e');
        R(4, by - 18, 9, 8, '#c8904c'); R(4, by - 18, 9, 1, '#e8b870'); R(8, by - 18, 1, 8, '#8a5a30');
        R(14, by - 16, 7, 6, '#b07838'); R(14, by - 16, 7, 1, '#d8a060');
        R(24, by - 38, 2, 28, '#5a3a1e');                                     // the pole
        Art.poly(g, [[26, by - 38], [31, by - 35 + (f % 2)], [26, by - 32]], '#e84a3a');
        R(2, by - 30, 20, 9, '#2e6a3a'); R(3, by - 29, 18, 7, '#3e8a4a');
        Font.draw(g, 'SELL', 4, by - 29, { scale: 1, color: '#fff4d0' });
        if (lit) R(2, by - 31, 20, 1, '#fff4a0');
        break;
      }
      case 'splitter': {
        R(6, by - 14, 20, 14, MET[1]); R(6, by - 14, 20, 2, MET[3]); R(6, by - 2, 20, 2, MET[0]);
        R(10, by - 11, 12, 6, '#1a1a22');
        const cols = ['#f0c048', '#6ab8ff', '#ff8a70'];
        for (let i = 0; i < 3; i++) R(11 + i * 4, by - 10, 2, 4, (f % 3) === i ? '#ffffff' : cols[i]);
        break;
      }
      case 'chest': {
        R(4, by - 18, 24, 18, '#a86a34'); R(4, by - 18, 24, 3, '#d8964c');
        for (const x of [4, 14, 26]) R(x, by - 18, 2, 18, '#5a3a1e');
        R(4, by - 10, 24, 2, '#5a3a1e'); R(14, by - 12, 4, 4, '#e8c050');
        break;
      }
      case 'feeder': {
        // a trough under a little roof, with a carrot sign
        R(3, by - 8, 26, 8, '#8a5a30'); R(4, by - 8, 24, 3, '#3a2a18'); R(3, by - 8, 26, 1, '#c08a50');
        for (const x of [4, 27]) R(x, by - 26, 2, 18, '#5a3a1e');
        Art.poly(g, [[1, by - 24], [31, by - 24], [16, by - 34]], '#c8402c'); R(1, by - 24, 30, 2, '#8a2a1a');
        const img = Props.get('produce', 'carrot'); g.drawImage(img, 9, by - 22, 14, 14);
        if (lit) for (let i = 0; i < 3; i++) R(8 + i * 6, by - 7, 4, 2, '#e0763a');
        break;
      }
      case 'sprinkler': {
        R(15, by - 16, 2, 16, MET[2]); R(12, by - 4, 8, 4, MET[1]);
        E(16, by - 17, 3, 2, MET[3]);
        const a = f * 0.9;
        R(16 + Math.cos(a) * 4 - 1, by - 18, 2, 2, '#2a6ad0');
        break;
      }
      case 'fishtrap': {
        // a wire cage on a little barrel float, with a fish or two inside
        E(16, by - 6, 13, 5, '#2a6a9a'); E(16, by - 7, 12, 4, '#4a90c0'); R(8, by - 8, 5, 1, '#a8d8f0');
        R(6, by - 26, 20, 18, '#8a8a98'); R(7, by - 25, 18, 16, '#3a4a5a');
        for (let x = 7; x < 25; x += 3) R(x, by - 25, 1, 16, '#9aa0b0');
        for (let y = by - 25; y < by - 9; y += 3) R(7, y, 18, 1, '#9aa0b0');
        R(11 + (f % 3), by - 18, 7, 3, '#6a9ac8'); R(17 + (f % 3), by - 19, 2, 5, '#6a9ac8');
        R(4, by - 28, 24, 3, '#a86a34'); R(15, by - 34, 2, 6, '#5a3a1e'); R(17, by - 34, 5, 3, '#e84a3a');
        break;
      }
      case 'shroomlog': {
        // a mossy log on its side, mushrooms coming out of the bark
        E(16, by - 8, 14, 7, '#5a3a1e'); R(2, by - 15, 28, 14, '#6a4424'); R(2, by - 15, 28, 3, '#8a5a30');
        E(29, by - 8, 4, 7, '#c8a070'); E(29, by - 8, 2.4, 4, '#8a6a40');
        for (let x = 4; x < 26; x += 5) R(x, by - 12, 1, 9, '#4a2c14');
        E(8, by - 15, 6, 2.4, '#4a8a32');
        const n = lit ? 4 : 2;
        for (let i = 0; i < n; i++) { const x = 8 + i * 6; R(x, by - 20, 2, 5, '#f0e8d0'); E(x + 1, by - 21, 4, 2.4, '#b86a3a'); R(x - 1, by - 22, 2, 1, '#e8a878'); }
        break;
      }
      case 'beehive': {
        // a white box hive on a stand, bees coming and going
        R(8, by - 6, 2, 6, '#5a3a1e'); R(22, by - 6, 2, 6, '#5a3a1e');
        for (let i = 0; i < 3; i++) { R(6, by - 12 - i * 7, 20, 6, i % 2 ? '#f4f0e0' : '#e8e0c8'); R(6, by - 12 - i * 7, 20, 1, '#ffffff'); }
        Art.poly(g, [[4, by - 26], [28, by - 26], [16, by - 34]], '#c8a060'); R(4, by - 26, 24, 2, '#8a6a30');
        R(12, by - 9, 8, 2, '#3a2a18');
        for (let i = 0; i < 4; i++) { const a = f * 0.9 + i * 1.6; const bx = 16 + Math.cos(a) * 12, by2 = by - 20 + Math.sin(a) * 8; R(bx, by2, 2, 1, '#2a1a08'); P(bx, by2 - 1, '#f8e040'); }
        break;
      }
      case 'lamp': {
        R(15, by - 30, 2, 30, '#3a3a44'); R(12, by - 3, 8, 3, '#3a3a44');
        R(11, by - 36, 10, 7, '#2a2a34'); R(12, by - 35, 8, 5, lit ? '#ffe070' : '#c8b060');
        R(10, by - 37, 12, 2, '#1a1a22');
        break;
      }
    }
    Art.outline(c, INK, 1);
    artCache.set(key, c);
    return c;
  }
  function drawMachine(g, b) {
    const { x, y } = centre(b.c, b.r), rt = b.rt;
    const night = typeof Sky !== 'undefined' ? 1 - Sky.light() : 0;
    const busy = (b.k === 'mill' || b.k === 'grow' || b.k === 'shroomlog') ? rt.inb.length > 0 : b.k === 'feeder' ? rt.inb.length > 0 : b.k === 'lamp' ? night > 0.4 : (b.k === 'fishtrap' || b.k === 'beehive') ? rt.out.length > 0 || rt.flash > 0 : rt.flash > 0;
    const f = Math.floor(t * (busy ? 8 : 2)) % 6;
    const img = art(b.k, b.d, f, busy);
    const mw = Math.round(32 * MS), mh = Math.round(44 * MS), foot = y + T / 2 - 2;
    g.drawImage(img, Math.round(x - mw / 2), Math.round(foot - mh), mw, mh);
    if (b.k === 'lamp' && night > 0.4) Art.glow(g, x, foot - 44, 56, '#ffe090', 0.28 * night, 5);
    if (b.k === 'hopper' && rt.suck) {                                           // a cube flying in
      const s = rt.suck, u = s.t;
      const px = U.lerp(s.x, x, u), py = U.lerp(s.y, foot - 50, u) - Math.sin(u * Math.PI) * 18;
      drawItem(g, { k: 'cube' }, px, py);
    }
    if (b.k === 'sprinkler' && rt.spray > 0) {
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2 + t * 3, rr = (1.2 - rt.spray) * 55;
        g.fillStyle = 'rgba(140,200,255,0.7)';
        g.fillRect(Math.round(x + Math.cos(a) * rr), Math.round(foot - 20 + Math.sin(a) * rr * 0.4 - Math.sin((1.2 - rt.spray) * 2.6) * 14), 2, 2);
      }
    }
    // a little count over anything with a queue in it
    const n = b.k === 'chest' ? rt.inb.length : (b.k === 'mill' || b.k === 'grow' || b.k === 'feeder' || b.k === 'shroomlog') ? rt.inb.length + rt.out.length : (b.k === 'fishtrap' || b.k === 'beehive') ? rt.out.length : 0;
    if (n > 0 && b.k !== 'belt') {
      const s = String(n), w2 = Font.width(s, 1) + 4;
      g.fillStyle = INK; g.fillRect(Math.round(x + 9), Math.round(foot - mh + 6), w2 + 2, 9);
      g.fillStyle = '#fff4d0'; g.fillRect(Math.round(x + 10), Math.round(foot - mh + 7), w2, 7);
      Font.draw(g, s, x + 12, foot - mh + 7, { scale: 1, color: INK });
    }
    // work progress bar on the mill and the grow house
    if (((b.k === 'mill' || b.k === 'grow' || b.k === 'shroomlog') && rt.inb.length) || b.k === 'fishtrap' || b.k === 'beehive') {
      const need = b.k === 'mill' ? 3.2 : b.k === 'grow' ? 7 : b.k === 'shroomlog' ? 6 : b.k === 'fishtrap' ? 14 : 18, u = Math.min(1, rt.work / need);
      g.fillStyle = INK; g.fillRect(Math.round(x - 12), Math.round(foot + 2), 24, 4);
      g.fillStyle = '#6aa84a'; g.fillRect(Math.round(x - 11), Math.round(foot + 3), Math.round(22 * u), 2);
    }
  }
  // the machines stand up and sort with everything else by their feet
  function sortables(g) {
    const out = [];
    for (const b of G.factory.b) if (b.k !== 'belt') out.push({ y: centre(b.c, b.r).y + T / 2 - 2, fn: () => drawMachine(g, b) });
    return out;
  }
  function drawOver(g) {
    // money coming off the pickup points
    for (const s of sold) {
      const a = 1 - s.t / 1.2;
      g.globalAlpha = a;
      Font.draw(g, '+' + s.n, s.x, s.y - s.t * 20, { scale: 1, color: '#ffe070', align: 'center', shadow: '#3a2a04' });
      g.globalAlpha = 1;
    }
    // the ghost of what you are placing, or the pick-up cursor
    if (!mode || !ghost) return;
    const { c, r } = ghost;
    if (r < -1 || r > ROWS) return;
    const x = c * T, y = OY + r * T;
    // the grid, faintly, around the pointer
    g.fillStyle = 'rgba(255,255,255,0.12)';
    for (let dc = -4; dc <= 4; dc++) for (let dr = -3; dr <= 3; dr++) {
      const rr = r + dr; if (rr < 0 || rr >= ROWS) continue;
      g.fillRect((c + dc) * T, OY + rr * T, T, 1); g.fillRect((c + dc) * T, OY + rr * T, 1, T);
    }
    if (mode.pick) {
      const b = at(c, r);
      g.fillStyle = b ? 'rgba(255,90,60,0.45)' : 'rgba(255,255,255,0.15)'; g.fillRect(x, y, T, T);
      return;
    }
    const bad = canPlace(c, r);
    g.fillStyle = bad ? 'rgba(255,60,40,0.4)' : 'rgba(120,255,120,0.3)'; g.fillRect(x, y, T, T);
    g.globalAlpha = 0.72;
    if (mode.key === 'belt') g.drawImage(beltTile(mode.rot, 0), x, y);
    else {
      const { x: mx, y: my } = centre(c, r);
      const mw = Math.round(32 * MS), mh = Math.round(44 * MS);
      g.drawImage(art(mode.key, mode.rot, 0, false), Math.round(mx - mw / 2), Math.round(my + T / 2 - 2 - mh), mw, mh);
      const [dx, dy] = DIRS[mode.rot];
      g.fillStyle = '#f0c048'; g.fillRect(Math.round(mx + dx * 14 - 2), Math.round(my + dy * 14 - 2), 4, 4);
    }
    g.globalAlpha = 1;
  }

  // ---- input ---------------------------------------------------------------------------------------
  function start(key) {
    if (key === 'pick') { mode = { pick: true }; }
    else { if (inv(key) <= 0) { Audio.play('error'); return; } mode = { key, rot: mode && mode.rot != null ? mode.rot : 0 }; }
    lastTile = null;
    UI.closePanels();
    refreshBar();
  }
  function stop() { mode = null; ghost = null; lastTile = null; refreshBar(); }
  const active = () => !!mode;
  function rotate() { if (mode && !mode.pick) { mode.rot = (mode.rot + 1) & 3; Audio.play('click'); refreshBar(); } }
  function pointer(x, y) { ghost = tileOf(x, y); }
  function press(x, y, first) {
    const { c, r } = tileOf(x, y);
    ghost = { c, r };
    if (mode.pick) {
      if (!first) return true;
      const b = at(c, r);
      if (b) pickUp(b); else Audio.play('error');
      refreshBar();
      return true;
    }
    const k = mode.key;
    if (!first) {
      // dragging a belt lays a run, turning each piece toward where you went
      if (k !== 'belt' || !lastTile || (lastTile.c === c && lastTile.r === r)) return true;
      const dc = Math.sign(c - lastTile.c), dr = Math.sign(r - lastTile.r);
      if (dc && dr) return true;
      const d = dc > 0 ? 0 : dc < 0 ? 2 : dr > 0 ? 1 : 3;
      const prev = at(lastTile.c, lastTile.r);
      if (prev && prev.k === 'belt') prev.d = d;
      mode.rot = d;
      if (place(k, c, r, d)) lastTile = { c, r };
      else if (at(c, r)) lastTile = { c, r };
    } else {
      const why = canPlace(c, r);
      if (why) { Audio.play('error'); UI.toast(why, 'bad'); return true; }
      if (place(k, c, r, mode.rot)) lastTile = { c, r };
    }
    if (inv(k) <= 0) { UI.toast(`out of <b>${DEFS[k].name}</b> &mdash; buy more in the Build menu (B)`, 'good'); stop(); }
    refreshBar(); UI.refreshHUD(); Main.save();
    return true;
  }
  function key(e) {
    if (!G || G.mode !== 'grove') return false;
    if (e.key === 'r' || e.key === 'R') { if (mode) { rotate(); return true; } return false; }
    if (e.key === 'Escape' && mode) { stop(); return true; }
    if (e.key === 'b' || e.key === 'B') { if (UI.anyPanel()) return false; openMenu(); return true; }
    return false;
  }
  function tipAt(x, y) {
    const { c, r } = tileOf(x, y), b = at(c, r);
    if (!b) return null;
    const d = DEFS[b.k], rt = b.rt;
    const bits = [];
    if (b.k === 'belt' && rt.item) bits.push(`carrying a ${NAMES[rt.item.k]}`);
    if (b.k === 'mill' || b.k === 'grow') bits.push(`${rt.inb.length} in, ${rt.out.length} out`);
    if (b.k === 'chest') bits.push(`${rt.inb.length} / 20`);
    if (b.k === 'feeder') bits.push(`${rt.inb.length} carrots`);
    if (b.k === 'depot') bits.push(`cube ${PRICE.cube} &middot; fertiliser ${PRICE.fert} &middot; carrot ${PRICE.veg}<br>fish ${PRICE.fish} &middot; mushroom ${PRICE.shroom} &middot; honey ${PRICE.honey}`);
    if (b.k === 'fishtrap' || b.k === 'beehive') bits.push(`${rt.out.length} waiting`);
    return `<b>${d.name}</b>${bits.length ? '<br>' + bits.join('<br>') : ''}<br><span class="dim">B: build menu</span>`;
  }

  // ---- the build menu --------------------------------------------------------------------------------
  let tab = 'factory';
  const iconCache = {};
  function iconURL(k) {
    if (iconCache[k]) return iconCache[k];
    const c = document.createElement('canvas'); c.width = 64; c.height = 64;
    const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    if (k === 'belt') { g.drawImage(beltTile(0, 3), 12, 12, 40, 40); }
    else g.drawImage(art(k, 0, 1, true), 9, 0, 46, 64);
    return (iconCache[k] = c.toDataURL());
  }
  function openMenu() {
    if (!G || G.mode !== 'grove') { UI.toast('the build menu is for the grove', 'bad'); return; }
    if (!G.arrived) { UI.toast('tidy the grove and meet your first wombat before you build', 'bad'); return; }
    stop();
    UI.openPanel('panel-build');
    renderMenu();
  }
  function renderMenu() {
    const el = document.getElementById('b-grid'); if (!el) return;
    document.querySelectorAll('[data-btab]').forEach((b) => b.classList.toggle('on', b.dataset.btab === tab));
    if (tab === 'decor') {
      const ks = Object.keys(G.crates || {}).filter((k) => FURN_BY_KEY[k] && G.crates[k] > 0);
      el.innerHTML = ks.length ? ks.map((k) => {
        const f = FURN_BY_KEY[k], img = Props.furniture(k);
        return `<div class="bcard"><div class="bpic"><img src="${img ? img.toDataURL() : ''}" alt=""></div><b>${f.name}</b><p>${f.blurb}</p>
          <div class="brow3"><span class="bhave">x${G.crates[k]}</span><button class="wbtn" data-bdecor="${k}">PLACE</button></div></div>`;
      }).join('') : `<p class="bempty">No furniture in crates. Captain Kirk's Ottoman Empire, in town, sells it.</p>`;
    } else {
      el.innerHTML = ORDER.filter((k) => DEFS[k].cat === tab).map((k) => {
        const d = DEFS[k], n = inv(k), can = G.wd >= d.cost;
        if (!unlocked(k)) {
          const pl = typeof Explore !== 'undefined' ? Explore.PLACES[d.need] : null;
          return `<div class="bcard locked"><div class="bpic"><img src="${iconURL(k)}" alt=""></div><b>${d.name}</b><p>${d.blurb}</p>
            <div class="brow3"><span class="block">${Icons.img('lock', 'sm')} buy ${pl ? pl.name : 'the land'} on the map</span></div></div>`;
        }
        return `<div class="bcard"><div class="bpic"><img src="${iconURL(k)}" alt=""></div><b>${d.name}</b><p>${d.blurb}</p>
          <div class="brow3"><span class="bprice">${Icons.img('wdollar', 'sm')} ${d.cost}</span><span class="bhave">${n ? 'x' + n : ''}</span></div>
          <div class="brow3"><button class="wbtn" data-bbuy="${k}" ${can ? '' : 'disabled'}>BUY${k === 'belt' ? ' 1' : ''}</button>
          ${k === 'belt' ? `<button class="wbtn" data-bbuy5="${k}" ${G.wd >= d.cost * 5 ? '' : 'disabled'}>BUY 5</button>` : ''}
          <button class="wbtn go" data-bplace="${k}" ${n ? '' : 'disabled'}>PLACE</button></div></div>`;
      }).join('');
    }
    const invEl = document.getElementById('b-inv');
    const keys = ORDER.filter((k) => inv(k) > 0);
    invEl.innerHTML = keys.length ? keys.map((k) => `<button class="binvi" data-bplace="${k}" title="${DEFS[k].name}"><img src="${iconURL(k)}" alt=""><i>${inv(k)}</i></button>`).join('')
      : '<span class="dim">empty &mdash; buy something above</span>';
    const earned = G.stats.factoryEarned || 0;
    document.getElementById('b-earned').textContent = earned ? `the factory has made ${U.fmt(earned)} W$` : 'hopper, belt, mill, grow house, belt, pickup point';
    el.querySelectorAll('[data-bbuy]').forEach((b) => b.onclick = () => { if (buy(b.dataset.bbuy, 1)) renderMenu(); });
    el.querySelectorAll('[data-bbuy5]').forEach((b) => b.onclick = () => { if (buy(b.dataset.bbuy5, 5)) renderMenu(); });
    document.querySelectorAll('#panel-build [data-bplace]').forEach((b) => b.onclick = () => start(b.dataset.bplace));
    el.querySelectorAll('[data-bdecor]').forEach((b) => b.onclick = () => {
      G.tool = 'build'; if (!G.owned) G.owned = {}; G.owned.build = true; if (!G.unlocked) G.unlocked = {}; G.unlocked.build = true;
      Grove.selectFurniture && Grove.selectFurniture(b.dataset.bdecor);
      UI.closePanels(); UI.refreshTray(); UI.refreshHUD();
      UI.toast('click the ground to set it down', 'good');
    });
  }
  function bindMenu() {
    document.querySelectorAll('[data-btab]').forEach((b) => b.onclick = () => { tab = b.dataset.btab; Audio.play('click'); renderMenu(); });
    const pick = document.getElementById('b-pick'); if (pick) pick.onclick = () => start('pick');
    const bb = document.getElementById('b-build'); if (bb) bb.onclick = () => openMenu();
    const pr = document.getElementById('pb-rot'); if (pr) pr.onclick = () => rotate();
    const ps = document.getElementById('pb-stop'); if (ps) ps.onclick = () => stop();
  }
  // the bar along the top while you are placing
  function refreshBar() {
    const bar = document.getElementById('placebar'); if (!bar) return;
    bar.hidden = !mode;
    if (!mode) return;
    const arrows = ['&rarr;', '&darr;', '&larr;', '&uarr;'];
    document.getElementById('pb-what').innerHTML = mode.pick ? '<b>PICK UP</b> click a building to put it back in your inventory'
      : `<b>${DEFS[mode.key].name}</b> x${inv(mode.key)} &nbsp; facing ${arrows[mode.rot]}${mode.key === 'belt' ? ' &nbsp; <span class="dim">hold and drag to lay a run</span>' : ''}`;
    document.getElementById('pb-rot').hidden = !!mode.pick;
  }
  return {
    init, update, drawFloor, sortables, drawOver, press, pointer, key, tipAt, active, start, stop, rotate, openMenu, renderMenu, bindMenu, buy, place,
    DEFS, ORDER, PRICE, get mode() { return mode; }, get grid() { return grid; }, T, OY, ROWS,
  };
})();
