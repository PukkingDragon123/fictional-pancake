// ---- Utility helpers ------------------------------------------------------
const TAU = Math.PI * 2;
const U = {
  clamp: (v, a, b) => (v < a ? a : v > b ? b : v),
  lerp: (a, b, t) => a + (b - a) * t,
  rand: (a = 0, b = 1) => a + Math.random() * (b - a),
  randi: (a, b) => Math.floor(a + Math.random() * (b - a + 1)),
  pick: (arr) => arr[Math.floor(Math.random() * arr.length)],
  chance: (p) => Math.random() < p,
  sign: (v) => (v < 0 ? -1 : 1),
  dist: (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay),
  easeOut: (t) => 1 - Math.pow(1 - t, 3),
  easeIn: (t) => t * t * t,
  easeInOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  bounce: (t) => {
    const n1 = 7.5625, d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  },
  // Money formatting: $1.2K, $3.4M
  fmt(n) {
    n = Math.floor(n);
    const abs = Math.abs(n);
    if (abs >= 1e12) return (n / 1e12).toFixed(2) + 'T';
    if (abs >= 1e9) return (n / 1e9).toFixed(2) + 'B';
    if (abs >= 1e6) return (n / 1e6).toFixed(2) + 'M';
    if (abs >= 1e4) return (n / 1e3).toFixed(1) + 'K';
    return String(n);
  },
  money(n) { return '$' + U.fmt(n); },
  time(s) {
    s = Math.max(0, Math.ceil(s));
    if (s < 60) return s + 's';
    return Math.floor(s / 60) + 'm ' + (s % 60) + 's';
  },
  shade(hex, amt) {
    // hex '#rrggbb', amt in -1..1
    const n = parseInt(hex.slice(1), 16);
    let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    const f = (c) => U.clamp(Math.round(amt > 0 ? c + (255 - c) * amt : c * (1 + amt)), 0, 255);
    r = f(r); g = f(g); b = f(b);
    return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
  },
  mix(a, b, f) {
    const n1 = parseInt(a.slice(1), 16), n2 = parseInt(b.slice(1), 16);
    const r = Math.round(U.lerp((n1 >> 16) & 255, (n2 >> 16) & 255, f));
    const g = Math.round(U.lerp((n1 >> 8) & 255, (n2 >> 8) & 255, f));
    const bl = Math.round(U.lerp(n1 & 255, n2 & 255, f));
    return '#' + ((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1);
  },
  rgba(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  },
  uid: (() => { let i = 1; return () => i++; })(),
};
