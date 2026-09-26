// A small animated GIF encoder: median-cut palette shared by every frame,
// LZW-compressed frames, and the NETSCAPE loop block so it plays forever.
// Used by promo/render.js to make the itch.io cover and banner.
(function (root) {
  function palette(frames) {
    // bin every pixel to 5 bits a channel, then median-cut the bins to 256
    const counts = new Uint32Array(32768);
    for (const d of frames) for (let i = 0; i < d.length; i += 4) counts[((d[i] >> 3) << 10) | ((d[i + 1] >> 3) << 5) | (d[i + 2] >> 3)]++;
    const bins = [];
    for (let k = 0; k < 32768; k++) if (counts[k]) bins.push(k);
    const ch = (k, c) => (c === 0 ? k >> 10 : c === 1 ? (k >> 5) & 31 : k & 31);
    let boxes = [bins];
    while (boxes.length < 256) {
      let best = -1, bestScore = 0, bestC = 0;
      boxes.forEach((b, i) => {
        if (b.length < 2) return;
        let n = 0; const lo = [31, 31, 31], hi = [0, 0, 0];
        for (const k of b) { n += counts[k]; for (let c = 0; c < 3; c++) { const v = ch(k, c); if (v < lo[c]) lo[c] = v; if (v > hi[c]) hi[c] = v; } }
        const rg = [hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]], c = rg.indexOf(Math.max(...rg));
        const score = rg[c] * Math.sqrt(n);
        if (score > bestScore) { bestScore = score; best = i; bestC = c; }
      });
      if (best < 0) break;
      const b = boxes[best].sort((a, z) => ch(a, bestC) - ch(z, bestC));
      let tot = 0; for (const k of b) tot += counts[k];
      let acc = 0, cut = 1;
      for (let i = 0; i < b.length - 1; i++) { acc += counts[b[i]]; if (acc >= tot / 2) { cut = i + 1; break; } }
      boxes.splice(best, 1, b.slice(0, cut), b.slice(cut));
    }
    const pal = [];
    for (const b of boxes) {
      let n = 0, r = 0, g = 0, bl = 0;
      for (const k of b) { const w = counts[k]; n += w; r += ((k >> 10) * 8 + 4) * w; g += (((k >> 5) & 31) * 8 + 4) * w; bl += ((k & 31) * 8 + 4) * w; }
      pal.push([Math.round(r / n), Math.round(g / n), Math.round(bl / n)]);
    }
    while (pal.length < 256) pal.push([0, 0, 0]);
    const map = new Int16Array(32768).fill(-1);
    const near = (k) => {
      const r = (k >> 10) * 8 + 4, g = ((k >> 5) & 31) * 8 + 4, b = (k & 31) * 8 + 4;
      let bi = 0, bd = 1e9;
      for (let i = 0; i < pal.length; i++) { const p = pal[i], d = (p[0] - r) ** 2 * 2 + (p[1] - g) ** 2 * 3 + (p[2] - b) ** 2; if (d < bd) { bd = d; bi = i; } }
      return bi;
    };
    return { pal, index: (k) => (map[k] >= 0 ? map[k] : (map[k] = near(k))) };
  }
  function lzw(ix, out) {
    const min = 8, CLEAR = 256, EOI = 257;
    let size = min + 1, next = EOI + 1, table = new Map();
    const bytes = []; let cur = 0, bits = 0;
    const emit = (code) => { cur |= code << bits; bits += size; while (bits >= 8) { bytes.push(cur & 255); cur >>>= 8; bits -= 8; } };
    emit(CLEAR);
    let code = ix[0];
    for (let i = 1; i < ix.length; i++) {
      const k = ix[i], key = (code << 8) | k, v = table.get(key);
      if (v !== undefined) { code = v; continue; }
      emit(code);
      if (next === 4096) { emit(CLEAR); next = EOI + 1; size = min + 1; table = new Map(); }
      else { if (next >= (1 << size)) size++; table.set(key, next++); }
      code = k;
    }
    emit(code); emit(EOI);
    if (bits > 0) bytes.push(cur & 255);
    out.push(min);
    for (let i = 0; i < bytes.length; i += 255) { const n = Math.min(255, bytes.length - i); out.push(n); for (let j = 0; j < n; j++) out.push(bytes[i + j]); }
    out.push(0);
  }
  // frames: array of RGBA Uint8ClampedArray (w*h*4); delay in hundredths of a second
  function encode(frames, w, h, delay) {
    const { pal, index } = palette(frames);
    const o = [];
    const s = (str) => { for (const c of str) o.push(c.charCodeAt(0)); };
    const u16 = (v) => { o.push(v & 255, (v >> 8) & 255); };
    s('GIF89a'); u16(w); u16(h); o.push(0xf7, 0, 0);
    for (const p of pal) o.push(p[0], p[1], p[2]);
    o.push(0x21, 0xff, 0x0b); s('NETSCAPE2.0'); o.push(3, 1, 0, 0, 0);
    for (const d of frames) {
      o.push(0x21, 0xf9, 4, 0x04); u16(delay); o.push(0, 0);
      o.push(0x2c); u16(0); u16(0); u16(w); u16(h); o.push(0);
      const ix = new Uint8Array(w * h);
      for (let i = 0, p = 0; i < ix.length; i++, p += 4) ix[i] = index(((d[p] >> 3) << 10) | ((d[p + 1] >> 3) << 5) | (d[p + 2] >> 3));
      lzw(ix, o);
    }
    o.push(0x3b);
    return new Uint8Array(o);
  }
  root.GifEnc = { encode };
})(typeof window !== 'undefined' ? window : globalThis);
