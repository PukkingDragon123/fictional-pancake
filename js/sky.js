// ---- The sky ----------------------------------------------------------------
// One clock and one weather front, shared by every outdoor scene, so the grove,
// the map and the title screen are all the same afternoon. Real time: a day is
// twelve minutes and the weather drifts through it on its own.
//
// Everything asks this module three questions:
//   Sky.light()    0 at midnight, 1 at noon — the amount of daylight
//   Sky.tint()     the colour the hour paints over a scene
//   Sky.wet()      0..1, how hard it is raining right now
const Sky = (() => {
  let G = null;
  const DAY = 720;                       // seconds in a full day
  let clock = DAY * 0.34;                // start mid-morning, which is cosy
  let front = null, nextFront = 0;
  const drops = [], flakes = [], clouds = [];
  let t = 0, thunder = 0, flash = 0;

  // ---- what the weather can be ---------------------------------------------
  // `cover` dims the light, `wet` waters the ground, `wind` bends the grass.
  const WEATHER = {
    clear:  { name: 'Clear',        icon: 'eye',     cover: 0,    wet: 0,    wind: 0.3, mins: 3, blurb: 'not a cloud in it' },
    fair:   { name: 'Fair',         icon: 'eye',     cover: 0.12, wet: 0,    wind: 0.5, mins: 4, blurb: 'a few clouds going over' },
    cloudy: { name: 'Cloudy',       icon: 'eye',     cover: 0.34, wet: 0,    wind: 0.7, mins: 4, blurb: 'grey and soft' },
    mist:   { name: 'Misty',        icon: 'eye',     cover: 0.26, wet: 0.08, wind: 0.1, mins: 3, blurb: 'you can taste it' },
    drizzle:{ name: 'Drizzle',      icon: 't_water', cover: 0.42, wet: 0.35, wind: 0.5, mins: 3, blurb: 'soft rain, all day' },
    rain:   { name: 'Rain',         icon: 't_water', cover: 0.58, wet: 0.8,  wind: 0.9, mins: 3, blurb: 'proper rain' },
    storm:  { name: 'Storm',        icon: 't_water', cover: 0.74, wet: 1,    wind: 1.6, mins: 2, blurb: 'get them inside' },
  };
  // what usually follows what, so the weather has a shape instead of flickering
  const NEXT = {
    clear:   ['fair', 'fair', 'clear', 'mist'],
    fair:    ['clear', 'cloudy', 'fair', 'mist'],
    cloudy:  ['fair', 'drizzle', 'rain', 'mist', 'cloudy'],
    mist:    ['fair', 'cloudy', 'drizzle'],
    drizzle: ['cloudy', 'rain', 'fair'],
    rain:    ['drizzle', 'storm', 'cloudy'],
    storm:   ['rain', 'rain', 'cloudy'],
  };

  function init(g) {
    G = g;
    const s = G.sky || {};
    clock = typeof s.clock === 'number' ? s.clock : DAY * 0.34;
    front = WEATHER[s.weather] ? s.weather : 'fair';
    nextFront = WEATHER[front].mins * 60;
    clouds.length = 0;
    const r = Art.rng(9021);
    for (let i = 0; i < 16; i++) {
      clouds.push({ x: r() * 1200, y: 10 + r() * 120, w: 50 + r() * 130, h: 12 + r() * 20, sp: 4 + r() * 10, a: 0.1 + r() * 0.2, lay: i % 3 });
    }
  }
  function save() { if (G) G.sky = { clock: +clock.toFixed(1), weather: front }; }

  function update(dt) {
    t += dt;
    clock = (clock + dt) % DAY;
    nextFront -= dt;
    if (nextFront <= 0) {
      const opts = NEXT[front] || ['fair'];
      front = opts[Math.floor(Math.random() * opts.length)];
      nextFront = WEATHER[front].mins * 60;
      if (G) UI.toast(`<b>${WEATHER[front].name}</b> &mdash; ${WEATHER[front].blurb}`, '');
      // somebody always has something to say about the weather
    }
    const w = wet();
    // rain: a column of drops falling across the whole screen
    const want = Math.round(w * 150);
    while (drops.length < want) drops.push({ x: Math.random() * 700, y: Math.random() * 400, v: 260 + Math.random() * 220, l: 5 + Math.random() * 9, a: 0.2 + Math.random() * 0.4 });
    while (drops.length > want) drops.pop();
    for (const d of drops) {
      d.y += d.v * dt; d.x += wind() * 40 * dt;
      if (d.y > 380) { d.y = -10; d.x = Math.random() * 700; }
      if (d.x > 660) d.x -= 680;
    }
    for (const c of clouds) { c.x -= c.sp * (0.4 + wind()) * dt; if (c.x < -c.w - 40) c.x = 700 + Math.random() * 300; }
    if (front === 'storm') {
      thunder -= dt;
      if (thunder <= 0) { thunder = 4 + Math.random() * 9; flash = 0.5; Audio.play('thunder'); }
      flash = Math.max(0, flash - dt * 2.4);
    } else { flash = 0; }
  }

  // ---- what everyone asks ---------------------------------------------------
  const hour = () => (clock / DAY) * 24;
  // daylight: up at 6, down at 19, with a soft shoulder either side
  function light() {
    const h = hour();
    if (h < 5 || h > 21) return 0;
    if (h < 7) return (h - 5) / 2;
    if (h > 19) return 1 - (h - 19) / 2;
    return 1;
  }
  const cover = () => WEATHER[front].cover;
  const wet = () => WEATHER[front].wet;
  const wind = () => WEATHER[front].wind;
  const isNight = () => light() < 0.3;
  const weather = () => front;
  const def = () => WEATHER[front];
  function clockText() {
    const h = Math.floor(hour()), m = Math.floor((hour() % 1) * 60);
    const ap = h < 12 ? 'am' : 'pm';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${String(m).padStart(2, '0')}${ap}`;
  }
  function partOfDay() {
    const h = hour();
    return h < 5 ? 'night' : h < 8 ? 'dawn' : h < 12 ? 'morning' : h < 16 ? 'afternoon' : h < 19 ? 'evening' : h < 22 ? 'dusk' : 'night';
  }
  // the wash the hour paints over a scene: warm at dawn, blue at night
  // The light over the wood. It leans warm through the middle of the day and
  // the night is lifted off the floor: a wood at midnight should still be a
  // place you can see your wombats in, not a black screen with eyes in it.
  const TINTS = {
    night:     ['#1a2c56', 0.46],
    dawn:      ['#ffb488', 0.24],
    morning:   ['#fff4cc', 0.14],
    afternoon: ['#ffeec0', 0.1],
    evening:   ['#ffbc82', 0.2],
    dusk:      ['#7e5c9c', 0.3],
  };
  function tint() {
    const [col, a] = TINTS[partOfDay()] || TINTS.afternoon;
    return { col, a: a + cover() * 0.16 };
  }

  // ---- painting it ----------------------------------------------------------
  // Drawn over a scene, in screen space, after everything else.
  function drawOver(g, W, H) {
    const tn = tint();
    if (tn.a > 0.01) {
      g.save();
      g.globalCompositeOperation = partOfDay() === 'night' || partOfDay() === 'dusk' ? 'multiply' : 'soft-light';
      g.globalAlpha = tn.a;
      g.fillStyle = tn.col; g.fillRect(0, 0, W, H);
      g.restore();
    }
    // mist sits low and slow and is the coziest thing in the game
    if (front === 'mist' || front === 'drizzle' || front === 'storm') {
      const a = front === 'mist' ? 0.22 : 0.1;
      const oa = g.globalAlpha;
      for (let i = 0; i < 6; i++) {
        const my = H * 0.42 + i * (H * 0.1);
        const mx = ((t * (5 + i * 2)) % (W + 300)) - 150;
        g.globalAlpha = oa * a * (0.6 + 0.4 * Math.sin(t * 0.3 + i));
        Art.ell(g, mx, my, 180, 16 + i * 3, '#d4dce0');
        Art.ell(g, mx + 220, my + 6, 140, 12 + i * 2, '#c8d4d8');
      }
      g.globalAlpha = oa;
    }
    // rain
    if (drops.length) {
      const lean = wind() * 3;
      for (const d of drops) {
        g.fillStyle = `rgba(190,214,230,${d.a.toFixed(2)})`;
        for (let k = 0; k < d.l; k++) g.fillRect(Math.round(d.x + k * lean * 0.2), Math.round(d.y + k), 1, 1);
      }
      // and it lands: little splash ticks along the bottom
      for (let i = 0; i < Math.round(wet() * 16); i++) {
        const sx = (i * 97 + Math.floor(t * 3) * 53) % W;
        const sy = H - 20 + ((i * 31) % 18);
        g.fillStyle = 'rgba(200,226,238,0.4)';
        g.fillRect(sx, sy, 3, 1); g.fillRect(sx + 1, sy - 1, 1, 1);
      }
    }
    if (flash > 0.01) { g.fillStyle = `rgba(226,236,255,${(flash * 0.5).toFixed(2)})`; g.fillRect(0, 0, W, H); }
  }
  // Clouds drawn behind a scene's trees, in world space. Same blocky pixel
  // cloud the transition uses, so the sky matches the curtain.
  function drawClouds(g, W, H, scroll = 0, alpha = 1) {
    const n = front === 'clear' ? 3 : front === 'fair' ? 7 : 16;
    const oa = g.globalAlpha;
    const dark = cover() > 0.4;
    for (let i = 0; i < n; i++) {
      const c = clouds[i];
      if (!c.prof) { c.prof = FX.cloudShape(2300 + i * 53); c.px = 2 + Math.round(c.w / 34); }
      const x = c.x - scroll * (0.2 + c.lay * 0.12);
      g.globalAlpha = oa * alpha * (c.a + cover() * 0.35) * 1.6;
      FX.pixelCloud(g, x, c.y, c.prof, c.px, dark);
    }
    g.globalAlpha = oa;
  }

  // the moon and the sun, for scenes that want one
  function drawSun(g, x, y) {
    const l = light();
    if (l > 0.15) {
      Art.glow(g, x, y, 60, '#ffe9a8', 0.22 * l, 7);
      Art.ell(g, x, y, 11, 11, '#ffe9a8');
      Art.ell(g, x - 3, y - 3, 5, 4, '#fffce0');
    } else {
      Art.glow(g, x, y, 46, '#c2f4ff', 0.2, 6);
      Art.ell(g, x, y, 9, 9, '#dff0f8');
      Art.ell(g, x + 3, y - 2, 3, 2.6, '#b0c8d8');
      Art.ell(g, x - 2, y + 3, 2, 1.8, '#b0c8d8');
    }
  }

  return {
    init, save, update, drawOver, drawClouds, drawSun,
    light, cover, wet, wind, isNight, weather, def, tint, hour, clockText, partOfDay,
    set(w) { if (WEATHER[w]) { front = w; nextFront = WEATHER[w].mins * 60; } },
    setHour(h) { clock = (h / 24) * DAY; },
    WEATHER, DAY,
  };
})();
