// ---- Little sounds ----------------------------------------------------------
// Everything is synthesised: short soft blips for the tools and a quiet music
// box that noodles over four gentle chords. Nothing plays until the first click.
const Sound = (() => {
  let ac = null, master = null, musicBus = null, muted = false, musicOn = true, nextNote = 0, step = 0;

  function wake() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    try {
      ac = new (window.AudioContext || window.webkitAudioContext)();
      master = ac.createGain(); master.gain.value = muted ? 0 : 0.5; master.connect(ac.destination);
      musicBus = ac.createGain(); musicBus.gain.value = 0.16; musicBus.connect(master);
    } catch (e) { ac = null; }
  }
  function tone(f, dur, o = {}) {
    if (!ac || muted) return;
    const t = ac.currentTime + (o.at || 0);
    const osc = ac.createOscillator(), g = ac.createGain();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(f, t);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + dur);
    const v = o.vol == null ? 0.3 : o.vol;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + (o.attack || 0.008));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g); g.connect(o.bus || master);
    osc.start(t); osc.stop(t + dur + 0.05);
  }
  function noise(dur, o = {}) {
    if (!ac || muted) return;
    const t = ac.currentTime + (o.at || 0);
    const n = Math.floor(ac.sampleRate * dur);
    const buf = ac.createBuffer(1, n, ac.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = ac.createBufferSource(); src.buffer = buf;
    const f = ac.createBiquadFilter(); f.type = o.filter || 'lowpass'; f.frequency.value = o.freq || 900; f.Q.value = o.q || 1;
    const g = ac.createGain(); g.gain.value = o.vol == null ? 0.2 : o.vol;
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t);
  }

  const FX = {
    click: () => tone(880, 0.06, { type: 'triangle', vol: 0.12 }),
    tab:   () => { tone(660, 0.05, { type: 'triangle', vol: 0.1 }); tone(990, 0.06, { type: 'triangle', vol: 0.08, at: 0.04 }); },
    till:  () => noise(0.09, { freq: 500, vol: 0.22 }),
    water: () => noise(0.18, { filter: 'bandpass', freq: 2400, q: 0.8, vol: 0.12 }),
    plant: () => { tone(520, 0.08, { type: 'triangle', vol: 0.14 }); tone(780, 0.1, { type: 'sine', vol: 0.1, at: 0.05 }); },
    raise: () => tone(300 + Math.random() * 40, 0.07, { type: 'triangle', to: 420, vol: 0.1 }),
    lower: () => tone(320 + Math.random() * 40, 0.07, { type: 'triangle', to: 210, vol: 0.1 }),
    dig:   () => noise(0.12, { freq: 380, vol: 0.2 }),
    pop:   () => tone(600, 0.09, { type: 'sine', to: 1100, vol: 0.18 }),
    coin:  () => { tone(1320, 0.07, { type: 'square', vol: 0.05 }); tone(1760, 0.14, { type: 'square', vol: 0.05, at: 0.06 }); },
    harvest: () => { tone(523, 0.08, { type: 'triangle', vol: 0.15 }); tone(659, 0.08, { type: 'triangle', vol: 0.15, at: 0.06 }); tone(784, 0.14, { type: 'triangle', vol: 0.15, at: 0.12 }); },
    pet:   () => { tone(900, 0.08, { type: 'sine', to: 1300, vol: 0.14 }); tone(1200, 0.1, { type: 'sine', to: 1500, vol: 0.1, at: 0.08 }); },
    eat:   () => { noise(0.05, { freq: 1400, vol: 0.12 }); noise(0.05, { freq: 1200, vol: 0.12, at: 0.12 }); },
    plop:  () => tone(220, 0.12, { type: 'sine', to: 110, vol: 0.2 }),
    sell:  () => { [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.12, { type: 'triangle', vol: 0.12, at: i * 0.06 })); },
    buy:   () => { tone(659, 0.08, { type: 'triangle', vol: 0.13 }); tone(988, 0.12, { type: 'triangle', vol: 0.13, at: 0.07 }); },
    nope:  () => { tone(220, 0.1, { type: 'triangle', vol: 0.12 }); tone(180, 0.14, { type: 'triangle', vol: 0.12, at: 0.08 }); },
    splash: () => noise(0.25, { filter: 'bandpass', freq: 1200, q: 0.6, vol: 0.14 }),
    fert:  () => { tone(700, 0.08, { type: 'sine', vol: 0.1 }); tone(1050, 0.12, { type: 'sine', vol: 0.08, at: 0.05 }); },
    hello: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, { type: 'triangle', vol: 0.1, at: i * 0.09 })); },
  };
  function play(name) { if (FX[name]) FX[name](); }

  // the music box: two notes a beat, picked from each chord, now and then a rest
  const CHORDS = [[60, 64, 67, 71], [57, 60, 64, 67], [65, 69, 72, 76], [62, 65, 67, 71]];
  const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
  function music() {
    if (!ac || muted || !musicOn) return;
    const beat = 0.42;
    while (nextNote < ac.currentTime + 0.3) {
      const chord = CHORDS[Math.floor(step / 8) % CHORDS.length];
      const at = nextNote - ac.currentTime;
      if (step % 8 === 0) tone(hz(chord[0] - 12), beat * 6, { type: 'sine', vol: 0.35, bus: musicBus, at: Math.max(0, at), attack: 0.02 });
      if (Math.random() < 0.78) {
        const n = chord[Math.floor(Math.random() * chord.length)] + (Math.random() < 0.3 ? 12 : 0);
        tone(hz(n), beat * 2.2, { type: 'triangle', vol: 0.28, bus: musicBus, at: Math.max(0, at) });
      }
      nextNote += beat; step++;
    }
  }
  function tick() { if (ac && nextNote < ac.currentTime) nextNote = ac.currentTime + 0.05; music(); }
  function setMuted(m) { muted = m; if (master) master.gain.value = m ? 0 : 0.5; }

  return { wake, play, tick, setMuted, get muted() { return muted; } };
})();
