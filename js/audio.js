// ---- Procedural WebAudio sound + tiny chiptune sequencer ------------------
const Audio = (() => {
  let ctx = null, master = null, musicGain = null, sfxGain = null;
  let muted = false, musicOn = true;
  let musicMode = 'pen';
  let seqTimer = null, nextNoteTime = 0, step = 0;

  function ensure() {
    if (ctx) return true;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain(); master.gain.value = muted ? 0 : 0.6; master.connect(ctx.destination);
      sfxGain = ctx.createGain(); sfxGain.gain.value = 0.7; sfxGain.connect(master);
      musicGain = ctx.createGain(); musicGain.gain.value = musicOn ? 0.22 : 0; musicGain.connect(master);
      startMusic();
      return true;
    } catch (e) { return false; }
  }
  function resume() { if (ctx && ctx.state === 'suspended') ctx.resume(); }

  function tone({ freq = 440, type = 'square', dur = 0.1, vol = 0.3, attack = 0.005, decay, slide = 0, delay = 0, dest }) {
    if (!ctx) return;
    const t0 = ctx.currentTime + delay;
    const o = ctx.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t0 + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + (decay || dur));
    o.connect(g); g.connect(dest || sfxGain);
    o.start(t0); o.stop(t0 + (decay || dur) + 0.05);
  }
  function noise({ dur = 0.2, vol = 0.3, lp = 1200, hp = 0, delay = 0, decayCurve = 2 }) {
    if (!ctx) return;
    const t0 = ctx.currentTime + delay;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decayCurve);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp;
    const g = ctx.createGain(); g.gain.value = vol;
    src.connect(f);
    if (hp > 0) { const h = ctx.createBiquadFilter(); h.type = 'highpass'; h.frequency.value = hp; f.connect(h); h.connect(g); }
    else f.connect(g);
    g.connect(sfxGain);
    src.start(t0);
  }

  const SFX = {
    click: () => tone({ freq: 900, type: 'square', dur: 0.05, vol: 0.12 }),
    hover: () => tone({ freq: 1400, type: 'sine', dur: 0.03, vol: 0.05 }),
    hum: () => { tone({ freq: 60, type: 'sawtooth', dur: 1.35, vol: 0.035 }); tone({ freq: 120, type: 'sine', dur: 1.35, vol: 0.03 }); },
    blip: () => tone({ freq: 520 + Math.random() * 90, type: 'triangle', dur: 0.035, vol: 0.05 }),
    pet: () => { tone({ freq: 660, type: 'triangle', dur: 0.12, vol: 0.2, slide: 300 }); tone({ freq: 990, type: 'triangle', dur: 0.15, vol: 0.12, delay: 0.06, slide: 200 }); },
    eat: () => { for (let i = 0; i < 3; i++) noise({ dur: 0.08, vol: 0.25, lp: 900, delay: i * 0.11 }); },
    strain: () => tone({ freq: 180, type: 'sawtooth', dur: 0.5, vol: 0.12, slide: 80 }),
    plop: () => { tone({ freq: 240, type: 'sine', dur: 0.18, vol: 0.5, slide: -160 }); noise({ dur: 0.12, vol: 0.2, lp: 600 }); },
    pop: () => tone({ freq: 500, type: 'square', dur: 0.08, vol: 0.2, slide: 400 }),
    coin: () => { tone({ freq: 1320, type: 'square', dur: 0.07, vol: 0.15 }); tone({ freq: 1760, type: 'square', dur: 0.18, vol: 0.15, delay: 0.07 }); },
    cash: () => { [0, 4, 7, 12].forEach((n, i) => tone({ freq: 660 * Math.pow(2, n / 12), type: 'square', dur: 0.12, vol: 0.15, delay: i * 0.07 })); },
    thud: (p = 1) => { noise({ dur: 0.12 * p, vol: Math.min(0.6, 0.25 * p), lp: 400 + 300 * p }); tone({ freq: 90, type: 'sine', dur: 0.15, vol: Math.min(0.5, 0.3 * p), slide: -40 }); },
    place: () => tone({ freq: 520, type: 'triangle', dur: 0.1, vol: 0.2, slide: 260 }),
    whoosh: () => noise({ dur: 0.35, vol: 0.2, lp: 2500, hp: 400, decayCurve: 1 }),
    wind: () => noise({ dur: 1.4, vol: 0.18, lp: 900, hp: 200, decayCurve: 1 }),
    cheer: (n = 1) => { for (let i = 0; i < 4; i++) noise({ dur: 0.5, vol: 0.12 * n, lp: 3000, hp: 800, delay: i * 0.06, decayCurve: 1 }); },
    perk: () => { [0, 3, 7, 10, 14].forEach((n, i) => tone({ freq: 440 * Math.pow(2, n / 12), type: 'triangle', dur: 0.25, vol: 0.2, delay: i * 0.08 })); },
    record: () => { [0, 4, 7, 12, 16, 19, 24].forEach((n, i) => tone({ freq: 523 * Math.pow(2, n / 12), type: 'square', dur: 0.2, vol: 0.14, delay: i * 0.06 })); },
    collapse: () => { tone({ freq: 220, type: 'sawtooth', dur: 1.2, vol: 0.3, slide: -180 }); noise({ dur: 1.2, vol: 0.5, lp: 500, decayCurve: 1.5 }); noise({ dur: 0.6, vol: 0.3, lp: 300, delay: 0.3 }); },
    alarm: () => { tone({ freq: 880, type: 'square', dur: 0.12, vol: 0.12 }); tone({ freq: 660, type: 'square', dur: 0.12, vol: 0.12, delay: 0.14 }); },
    buy: () => { tone({ freq: 784, type: 'square', dur: 0.08, vol: 0.15 }); tone({ freq: 1175, type: 'square', dur: 0.15, vol: 0.15, delay: 0.08 }); },
    error: () => tone({ freq: 160, type: 'square', dur: 0.2, vol: 0.2, slide: -60 }),
    slowmo: () => tone({ freq: 400, type: 'sine', dur: 0.6, vol: 0.2, slide: -300 }),
    drum: () => { noise({ dur: 0.3, vol: 0.5, lp: 300 }); tone({ freq: 60, type: 'sine', dur: 0.4, vol: 0.5, slide: -30 }); },
    levelup: () => { [0, 7, 12, 19].forEach((n, i) => tone({ freq: 392 * Math.pow(2, n / 12), type: 'square', dur: 0.3, vol: 0.15, delay: i * 0.1 })); },
    bounce: () => tone({ freq: 300, type: 'sine', dur: 0.12, vol: 0.25, slide: 500 }),
    squeak: () => tone({ freq: 1200, type: 'triangle', dur: 0.1, vol: 0.12, slide: 600 }),
    snip: () => { noise({ dur: 0.07, vol: 0.22, lp: 5200, hp: 1800 }); tone({ freq: 2100, type: 'square', dur: 0.04, vol: 0.07 }); },
    pluck: () => { tone({ freq: 520, type: 'triangle', dur: 0.1, vol: 0.2, slide: 340 }); noise({ dur: 0.06, vol: 0.12, lp: 3000, hp: 900 }); },
    brush: () => noise({ dur: 0.12, vol: 0.1, lp: 2600, hp: 500, decayCurve: 1.4 }),
    dig: () => { noise({ dur: 0.16, vol: 0.2, lp: 900 }); tone({ freq: 120, type: 'sine', dur: 0.14, vol: 0.18, slide: -50 }); },
    splash: () => { noise({ dur: 0.2, vol: 0.16, lp: 4200, hp: 1200, decayCurve: 1.6 }); tone({ freq: 900, type: 'sine', dur: 0.12, vol: 0.08, slide: 500 }); },
    thunder: () => {
      noise({ dur: 1.8, vol: 0.55, lp: 420, decayCurve: 0.9 });
      noise({ dur: 0.5, vol: 0.4, lp: 2400, hp: 200, decayCurve: 2 });
      tone({ freq: 58, type: 'sine', dur: 1.6, vol: 0.45, slide: -22 });
      noise({ dur: 1.1, vol: 0.3, lp: 700, delay: 0.35, decayCurve: 1.2 });
    },
    rumble: () => { noise({ dur: 1.4, vol: 0.26, lp: 260, decayCurve: 1 }); tone({ freq: 44, type: 'sine', dur: 1.4, vol: 0.3, slide: -12 }); },
    chant: () => {
      [0, 3, 7].forEach((n, i) => {
        tone({ freq: 110 * Math.pow(2, n / 12), type: 'sawtooth', dur: 1.5, vol: 0.09, delay: i * 0.04, attack: 0.3, decay: 1.5 });
        tone({ freq: 220 * Math.pow(2, n / 12), type: 'sine', dur: 1.5, vol: 0.06, delay: i * 0.04, attack: 0.4, decay: 1.5 });
      });
    },
    chime: () => [0, 7, 12, 19, 24].forEach((n, i) => tone({ freq: 523 * Math.pow(2, n / 12), type: 'sine', dur: 1.1, vol: 0.12, delay: i * 0.07, decay: 1.1 })),
    bless: () => {
      [0, 4, 7, 11, 14].forEach((n, i) => tone({ freq: 330 * Math.pow(2, n / 12), type: 'triangle', dur: 0.9, vol: 0.13, delay: i * 0.1, decay: 0.9 }));
      noise({ dur: 1.2, vol: 0.1, lp: 6000, hp: 2400, decayCurve: 1, delay: 0.2 });
    },
    growl: () => { tone({ freq: 70, type: 'sawtooth', dur: 0.9, vol: 0.2, slide: 24 }); noise({ dur: 0.9, vol: 0.12, lp: 340 }); },
    sell: () => { tone({ freq: 660, type: 'square', dur: 0.07, vol: 0.14 }); tone({ freq: 990, type: 'square', dur: 0.09, vol: 0.13, delay: 0.07 }); tone({ freq: 1320, type: 'square', dur: 0.16, vol: 0.12, delay: 0.15 }); },
    hatch: () => { tone({ freq: 380, type: 'triangle', dur: 0.14, vol: 0.16, slide: 420 }); tone({ freq: 900, type: 'sine', dur: 0.2, vol: 0.12, delay: 0.12, slide: 300 }); noise({ dur: 0.1, vol: 0.1, lp: 3000 }); },
    munch: () => { for (let i = 0; i < 2; i++) noise({ dur: 0.07, vol: 0.2, lp: 800, delay: i * 0.13 }); },
    door: () => {
      noise({ dur: 0.5, vol: 0.16, lp: 700, decayCurve: 0.8 });
      tone({ freq: 180, type: 'sawtooth', dur: 0.45, vol: 0.07, slide: 70 });
      [0, 7].forEach((n, i) => tone({ freq: 1046 * Math.pow(2, n / 12), type: 'sine', dur: 0.7, vol: 0.12, delay: 0.34 + i * 0.09, decay: 0.7 }));
    },
    till: () => { tone({ freq: 1568, type: 'square', dur: 0.06, vol: 0.14 }); noise({ dur: 0.22, vol: 0.12, lp: 5200, hp: 1600, delay: 0.05 }); tone({ freq: 784, type: 'square', dur: 0.18, vol: 0.12, delay: 0.1 }); },
    scuttle: () => { for (let i = 0; i < 4; i++) noise({ dur: 0.04, vol: 0.07, lp: 4200, hp: 1400, delay: i * 0.07 }); },
  };

  // ---- Music: simple pattern sequencer -----------------------------------
  // Grove: aeolian, slow, mostly air. Shrine: the same root, driven.
  const PEN_BASS = [0, 0, -5, -5, 3, 3, -2, -2];
  const PEN_ARP = [[0, 3, 7], [0, 3, 7], [-5, 0, 3], [-5, 0, 3], [3, 7, 10], [3, 7, 10], [-2, 3, 7], [-2, 3, 7]];
  const TOWER_BASS = [0, 0, 0, 0, -5, -5, 3, 3];
  const TOWER_ARP = [[0, 3, 7], [0, 3, 7], [0, 3, 10], [0, 3, 10], [-5, 0, 7], [-5, 0, 7], [3, 7, 12], [3, 7, 12]];

  function schedule() {
    if (!ctx) return;
    const bpm = musicMode === 'tower' ? 124 : 74;
    const spb = 60 / bpm / 4; // 16th
    while (nextNoteTime < ctx.currentTime + 0.15) {
      const bar = Math.floor(step / 16) % 8;
      const s16 = step % 16;
      const root = 130.81 * (musicMode === 'tower' ? 1 : 1); // C3
      const bass = musicMode === 'tower' ? TOWER_BASS : PEN_BASS;
      const arp = musicMode === 'tower' ? TOWER_ARP : PEN_ARP;
      const t = nextNoteTime - ctx.currentTime;
      if (s16 % 4 === 0) tone({ freq: root * Math.pow(2, bass[bar] / 12) / 2, type: 'triangle', dur: spb * 3, vol: 0.35, delay: t, dest: musicGain });
      if (musicMode === 'tower' || s16 % 2 === 0) {
        const chord = arp[bar];
        const n = chord[(s16 >> 1) % 3] + (s16 % 8 >= 4 ? 12 : 0);
        tone({ freq: root * 2 * Math.pow(2, n / 12), type: musicMode === 'tower' ? 'square' : 'triangle', dur: spb * (musicMode === 'tower' ? 0.9 : 2.4), vol: musicMode === 'tower' ? 0.13 : 0.11, delay: t, attack: musicMode === 'tower' ? 0.005 : 0.12, dest: musicGain });
      }
      if (musicMode === 'tower' && (s16 === 0 || s16 === 8)) {
        // kick
        const t0 = ctx.currentTime + t;
        const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(120, t0); o.frequency.exponentialRampToValueAtTime(40, t0 + 0.15);
        const g = ctx.createGain(); g.gain.setValueAtTime(0.5, t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.2);
        o.connect(g); g.connect(musicGain); o.start(t0); o.stop(t0 + 0.25);
      }
      nextNoteTime += spb;
      step++;
    }
  }
  function startMusic() {
    if (seqTimer) return;
    nextNoteTime = ctx.currentTime + 0.1;
    seqTimer = setInterval(schedule, 50);
  }

  return {
    init() { return ensure(); },
    resume,
    play(name, arg) { if (!ctx || muted) return; try { SFX[name] && SFX[name](arg); } catch (e) { } },
    setMode(m) { if (musicMode !== m) { musicMode = m; step = 0; } },
    toggleMute() { muted = !muted; if (master) master.gain.value = muted ? 0 : 0.6; return muted; },
    toggleMusic() { musicOn = !musicOn; if (musicGain) musicGain.gain.value = musicOn ? 0.22 : 0; return musicOn; },
    get muted() { return muted; },
    get musicOn() { return musicOn; },
    setState(m, mu) { muted = !!m; musicOn = mu !== false; if (master) master.gain.value = muted ? 0 : 0.6; if (musicGain) musicGain.gain.value = musicOn ? 0.22 : 0; },
  };
})();
