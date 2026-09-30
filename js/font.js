// ---- A bitmap font, drawn a pixel at a time -------------------------------
// Browser text rasterisers antialias, and antialiased glyphs on a canvas that
// is then scaled up go soft. So the game does not use them. This is "Biscuit",
// the game's own round little pixel face: capitals six pixels tall, a four
// pixel x-height, true two-row descenders and proportional widths (an i is
// one pixel, an m is five), every corner rounded off. Each glyph is [width,
// eight hex pairs], one per row, bit 4 the leftmost column. At any integer
// scale the letters stay hard-edged. tools/mkfont.py compiles the same table
// into the TTF the page's own text uses, so canvas and DOM match.
const Font = (() => {
  const CW = 5, CH = 8;
  const G = {
    " ": [3, "0000000000000000"], "!": [1, "1010101000100000"], "\"": [3, "1414000000000000"], "#": [5, "0A1F0A1F0A000000"],
    "$": [5, "0F140E051E040000"], "%": [5, "191A040816060000"], "&": [5, "0C120C15120D0000"], "'": [1, "1010000000000000"],
    "(": [2, "0810101010080000"], ")": [2, "1008080808100000"], "*": [3, "0014081400000000"], "+": [3, "00081C0800000000"],
    ",": [2, "0000000000081000"], "-": [3, "0000001C00000000"], ".": [1, "0000000000100000"], "/": [3, "0404080810100000"],
    "0": [4, "0C12161A120C0000"], "1": [3, "08180808081C0000"], "2": [4, "0C120408101E0000"], "3": [4, "1C020C02021C0000"],
    "4": [4, "12121E0202020000"], "5": [4, "1E101C02021C0000"], "6": [4, "0C101C12120C0000"], "7": [4, "1E02040808080000"],
    "8": [4, "0C120C12120C0000"], "9": [4, "0C12120E020C0000"], ":": [1, "0000100000100000"], ";": [2, "0000080000081000"],
    "<": [3, "0004081008040000"], "=": [3, "00001C001C000000"], ">": [3, "0010080408100000"], "?": [4, "0C12040800080000"],
    "@": [5, "0E111717100E0000"], "A": [4, "0C12121E12120000"], "B": [4, "1C121C12121C0000"], "C": [4, "0C121010120C0000"],
    "D": [4, "1C121212121C0000"], "E": [4, "1E101C10101E0000"], "F": [4, "1E101C1010100000"], "G": [4, "0C121016120E0000"],
    "H": [4, "12121E1212120000"], "I": [3, "1C080808081C0000"], "J": [4, "06020202120C0000"], "K": [4, "1214181412120000"],
    "L": [4, "10101010101E0000"], "M": [5, "111B151111110000"], "N": [4, "121A161212120000"], "O": [4, "0C121212120C0000"],
    "P": [4, "1C12121C10100000"], "Q": [4, "0C121212140A0000"], "R": [4, "1C12121C14120000"], "S": [4, "0E100C02021C0000"],
    "T": [5, "1F04040404040000"], "U": [4, "12121212120C0000"], "V": [5, "1111110A0A040000"], "W": [5, "111115151B110000"],
    "X": [5, "11110A040A110000"], "Y": [5, "11110A0404040000"], "Z": [4, "1E020408101E0000"], "[": [2, "1810101010180000"],
    "]": [2, "1808080808180000"], "_": [4, "0000000000001E00"], "a": [4, "00000E12120E0000"], "b": [4, "10101C12121C0000"],
    "c": [3, "00000C10100C0000"], "d": [4, "02020E12120E0000"], "e": [4, "00000C1E100E0000"], "f": [3, "0C101C1010100000"],
    "g": [4, "00000E12120E020C"], "h": [4, "10101C1212120000"], "i": [1, "1000101010100000"], "j": [3, "04000C0404040418"],
    "k": [4, "101012141C120000"], "l": [2, "1010101010080000"], "m": [5, "00001A1515150000"], "n": [4, "00001C1212120000"],
    "o": [4, "00000C12120C0000"], "p": [4, "00001C12121C1010"], "q": [4, "00000E12120E0202"], "r": [3, "0000141810100000"],
    "s": [4, "00000E18061C0000"], "t": [3, "08081C0808040000"], "u": [4, "00001212120E0000"], "v": [5, "000011110A040000"],
    "w": [5, "00001115150A0000"], "x": [4, "0000120C0C120000"], "y": [4, "00001212120E020C"], "z": [4, "00001E04081E0000"],
    "|": [1, "0010101010101010"],
  };
  const MISS = [4, 'F09090909090F000'];
  const get = (ch) => G[ch] || G[ch.toUpperCase()] || MISS;
  const rows = (ch) => {
    const h = get(ch)[1];
    const out = [];
    for (let i = 0; i < CH; i++) out.push(parseInt(h.substr(i * 2, 2), 16));
    return out;
  };
  // one small canvas per glyph, per scale, per colour
  const cache = new Map();
  function glyph(ch, s, col) {
    const key = ch + '|' + s + '|' + col;
    let c = cache.get(key);
    if (c) return c;
    const r = rows(ch), w = get(ch)[0];
    const o = document.createElement('canvas');
    o.width = Math.max(1, w * s); o.height = CH * s;
    const g = o.getContext('2d');
    g.fillStyle = col;
    for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) if (r[y] & (1 << (CW - 1 - x))) g.fillRect(x * s, y * s, s, s);
    cache.set(key, o);
    return o;
  }
  const scaleFor = (size) => Math.max(1, Math.round((size || 7) / 7));
  // the advance of one character; advance(s) alone is a typical letter, for rough sums
  const adv = (ch, s, track) => (get(ch)[0] + (track == null ? 1 : track)) * s;
  const advance = (s, track) => (4 + (track == null ? 1 : track)) * s;
  function width(text, s, track) {
    const str = String(text);
    if (!str.length) return 0;
    let w = 0;
    for (const ch of str) w += adv(ch, s, track);
    return w - (track == null ? 1 : track) * s;
  }
  const height = (s) => CH * s;

  // x, y is the top left of the first glyph unless `align` moves it
  function draw(g, text, x, y, o) {
    o = o || {};
    const s = o.scale || scaleFor(o.size);
    const track = o.track == null ? 1 : o.track;
    const str = String(text);
    const w = width(str, s, track);
    let px = Math.round(o.align === 'center' ? x - w / 2 : o.align === 'right' ? x - w : x);
    const py = Math.round(y);
    if (o.shadow) {
      const d = o.shadowDist || s;
      let sx = px;
      for (const ch of str) { g.drawImage(glyph(ch, s, o.shadow), sx + d, py + d); sx += adv(ch, s, track); }
    }
    const col = o.color || '#fdf6e0';
    for (const ch of str) { g.drawImage(glyph(ch, s, col), px, py); px += adv(ch, s, track); }
    return w;
  }
  // wrap to a pixel width, not a guess at character counts
  function wrap(text, maxW, s, track) {
    const words = String(text).split(' '), lines = [];
    let line = '';
    for (const w of words) {
      const test = line ? line + ' ' + w : w;
      if (width(test, s, track) > maxW && line) { lines.push(line); line = w; } else line = test;
    }
    if (line) lines.push(line);
    return lines;
  }
  return { draw, width, height, wrap, scaleFor, advance, adv, CW, CH, G };
})();
