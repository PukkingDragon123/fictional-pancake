// ---- A bitmap font, drawn a pixel at a time -------------------------------
// Browser text rasterisers antialias, and antialiased glyphs on a canvas that
// is then scaled up go soft. So the game does not use them. Every glyph here
// is five by seven pixels, one hex pair per row, blitted as whole blocks: at
// any integer scale the letters stay hard-edged.
const Font = (() => {
  const CW = 5, CH = 7;
  const G = {
    'A': '0E11111F111111', 'B': '1E11111E11111E', 'C': '0E111010101 10E'.replace(' ', ''),
    'D': '1C121111111 21C'.replace(' ', ''), 'E': '1F10101E10101F', 'F': '1F10101E101010',
    'G': '0E11101711110F', 'H': '1111111F111111', 'I': '0E040404040 40E'.replace(' ', ''),
    'J': '0702020202120C', 'K': '1112141814 1211'.replace(' ', ''), 'L': '1010101010101F',
    'M': '111B1515111111', 'N': '1119151311 1111'.replace(' ', ''), 'O': '0E111111111 10E'.replace(' ', ''),
    'P': '1E11111E101010', 'Q': '0E111111151 20D'.replace(' ', ''), 'R': '1E11111E141211',
    'S': '0F10100E01011E', 'T': '1F040404040404', 'U': '1111111111110E',
    'V': '1111111111 0A04'.replace(' ', ''), 'W': '1111111515 1B11'.replace(' ', ''),
    'X': '11110A040A1111', 'Y': '11110A04040404', 'Z': '1F010204081 01F'.replace(' ', ''),
    '0': '0E111315191 10E'.replace(' ', ''), '1': '040C040404040E', '2': '0E110102 04081F'.replace(' ', ''),
    '3': '1F020402011 10E'.replace(' ', ''), '4': '02060A121F0202', '5': '1F101E0101110E',
    '6': '060810 1E11110E'.replace(' ', ''), '7': '1F010204080808', '8': '0E11110E11110E',
    '9': '0E11110F01020C',
    'a': '00000E010F110F', 'b': '10101E1111111E', 'c': '00000E1010110E',
    'd': '01010F1111110F', 'e': '00000E111F100E', 'f': '060908 1C080808'.replace(' ', ''),
    'g': '00000F110F010E', 'h': '10101E11111111', 'i': '04000C040404 0E'.replace(' ', ''),
    'j': '02000602021 20C'.replace(' ', ''), 'k': '1010121418 1412'.replace(' ', ''), 'l': '0C04040404040E',
    'm': '00001A1515 1515'.replace(' ', ''), 'n': '00001E11111111', 'o': '00000E1111110E',
    'p': '00001E111E1010', 'q': '00000F110F0101', 'r': '0000161910 1010'.replace(' ', ''),
    's': '00000F100E011E', 't': '08081C0808 0906'.replace(' ', ''), 'u': '000011111113 0D'.replace(' ', ''),
    'v': '00001111110A04', 'w': '000011151515 0A'.replace(' ', ''), 'x': '0000110A040A11',
    'y': '00001111 0F010E'.replace(' ', ''), 'z': '00001F0204081F',
    ' ': '00000000000000', '.': '0000000000 0C0C'.replace(' ', ''), ',': '000000000C0408',
    '!': '04040404040004', '?': '0E1101020400 04'.replace(' ', ''), ':': '000C0C000C0C00',
    '-': '0000001F000000', '/': '01020204080810', '+': '000404 1F040400'.replace(' ', ''),
    '%': '111202040809 11'.replace(' ', ''), '$': '040F140E051E04', '(': '02040808080402',
    ')': '08040202020408', '*': '000A041F040A00', "'": '04040800000000',
    '"': '0A0A0000000000', '<': '02040810080402', '>': '08040201020408',
    '=': '00001F001F0000', '#': '0A1F0A0A1F0A00', '&': '0C121408151 20D'.replace(' ', ''),
    ';': '000C0C000C0408', '_': '0000000000001F', '|': '04040404040404',
  };
  const MISS = '1F111111 11111F'.replace(' ', '');
  const rows = (ch) => {
    const h = G[ch] || G[ch.toUpperCase()] || MISS;
    const out = [];
    for (let i = 0; i < 7; i++) out.push(parseInt(h.substr(i * 2, 2), 16));
    return out;
  };

  // one small canvas per glyph, per scale, per colour: a string is then just
  // a handful of blits instead of a few hundred rectangles
  const cache = new Map();
  function glyph(ch, s, col) {
    const key = ch + '|' + s + '|' + col;
    let c = cache.get(key);
    if (c) return c;
    const r = rows(ch);
    const o = document.createElement('canvas');
    o.width = CW * s; o.height = CH * s;
    const g = o.getContext('2d');
    g.fillStyle = col;
    for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) if (r[y] & (1 << (CW - 1 - x))) g.fillRect(x * s, y * s, s, s);
    cache.set(key, o);
    return o;
  }
  const scaleFor = (size) => Math.max(1, Math.round((size || 7) / 7));
  const advance = (s, track) => (CW + (track == null ? 1 : track)) * s;
  function width(text, s, track) { return text.length ? text.length * advance(s, track) - (track == null ? 1 : track) * s : 0; }
  const height = (s) => CH * s;

  // x, y is the top left of the first glyph unless `align` moves it
  function draw(g, text, x, y, o) {
    o = o || {};
    const s = o.scale || scaleFor(o.size);
    const track = o.track == null ? 1 : o.track;
    const w = width(String(text), s, track);
    let px = Math.round(o.align === 'center' ? x - w / 2 : o.align === 'right' ? x - w : x);
    const py = Math.round(y);
    const str = String(text);
    if (o.shadow) {
      const d = o.shadowDist || s;
      let sx = px;
      for (const ch of str) { g.drawImage(glyph(ch, s, o.shadow), sx + d, py + d); sx += advance(s, track); }
    }
    const col = o.color || '#fdf6e0';
    for (const ch of str) { g.drawImage(glyph(ch, s, col), px, py); px += advance(s, track); }
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
  return { draw, width, height, wrap, scaleFor, advance, CW, CH };
})();
