// ---- Kit: the interface, drawn on the canvas -----------------------------------
// The same soft cards and mint buttons the HTML panels wear (css/theme.css),
// for the places the interface is painted straight into the picture: the
// title screen, the captions on the drive in, the travel card, the dialogue.
const Kit = (() => {
  const C = {
    line: '#2c4048', ink: '#36505a', ink2: '#6a8088',
    paper: '#fffaf0', white: '#ffffff', lip: '#efe4cc', lip2: '#d9cbae',
    mint: '#7fd1a8', mintL: '#c8f2dc', mintD: '#4fae84', mintDD: '#2f7d5c', mintW: '#eef8f2',
    sun: '#ffc23a', sunL: '#fff1b8', sunD: '#c7861a',
    coral: '#ff7a5c', coralD: '#b8442c', sky: '#5ab4e8',
    shadow: 'rgba(44,64,72,0.22)',
  };
  // a filled rectangle with its corners rounded off in whole pixels
  function rr(g, x, y, w, h, r, col) {
    x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
    r = Math.min(r, Math.floor(h / 2), Math.floor(w / 2));
    g.fillStyle = col;
    for (let i = 0; i < r; i++) {
      const d = r - Math.round(Math.sqrt(r * r - (r - i - 0.5) * (r - i - 0.5)));
      g.fillRect(x + d, y + i, w - d * 2, 1);
      g.fillRect(x + d, y + h - 1 - i, w - d * 2, 1);
    }
    g.fillRect(x, y + r, w, h - r * 2);
  }
  // a card: slate line, a fill, a white lit edge and a lip underneath
  function card(g, x, y, w, h, o = {}) {
    const r = o.r == null ? 6 : o.r;
    if (o.shadow !== false) rr(g, x, y + 4, w, h, r, C.shadow);
    rr(g, x, y, w, h, r, o.line || C.line);
    rr(g, x + 2, y + 2, w - 4, h - 4, r - 1, o.lip || C.lip);
    rr(g, x + 2, y + 2, w - 4, h - 7, r - 1, o.fill || C.paper);
    if (o.ring) { rr(g, x + 2, y + 2, w - 4, h - 4, r - 1, o.ring); rr(g, x + 4, y + 4, w - 8, h - 9, r - 2, o.fill || C.paper); }
    g.fillStyle = o.top || C.white; g.fillRect(Math.round(x + r), Math.round(y + 2), Math.round(w - r * 2), 1);
  }
  // a button: mint (or sun, or coral), it lifts under the pointer and sinks when pressed
  function button(g, b, label, sub, o = {}) {
    const hot = !!o.hot, kind = o.kind || 'mint';
    const P = kind === 'sun' ? [C.sun, C.sunL, C.sunD, '#4a3304'] : kind === 'coral' ? [C.coral, '#ffc2b2', C.coralD, '#ffffff']
      : kind === 'plain' ? [C.white, C.white, '#b8ccc4', C.ink] : [C.mint, C.mintL, C.mintDD, '#173a2e'];
    const lift = hot ? -2 : 0;
    const x = b.x, y = b.y + lift, w = b.w, h = b.h;
    rr(g, x, b.y + 5, w, h, 7, C.shadow);
    rr(g, x, y, w, h + 3, 7, C.line);
    rr(g, x + 2, y + 2, w - 4, h - 1, 6, P[2]);
    rr(g, x + 2, y + 2, w - 4, h - 4, 6, hot ? U.shade(P[0], 0.12) : P[0]);
    g.fillStyle = P[1]; g.fillRect(x + 7, y + 3, w - 14, 2);
    const sc = o.scale || 2;
    const cy = y + (sub ? 7 : Math.round((h - sc * 7) / 2));
    Font.draw(g, label, x + w / 2, cy, { scale: sc, color: P[3], align: 'center' });
    if (sub) Font.draw(g, sub, x + w / 2, cy + sc * 7 + 4, { scale: 1, color: kind === 'sun' ? '#7a5510' : '#2f6a52', align: 'center' });
  }
  // a mint tab with a title on it, for the top of a card
  function tab(g, x, y, w, h, text, o = {}) {
    rr(g, x, y, w, h + 2, 6, C.line);
    rr(g, x + 2, y + 2, w - 4, h - 2, 5, C.mintDD);
    rr(g, x + 2, y + 2, w - 4, h - 4, 5, o.col || C.mintD);
    g.fillStyle = '#9fe0bf'; g.fillRect(x + 6, y + 3, w - 12, 1);
    const sc = o.scale || 1;
    Font.draw(g, text, x + w / 2, y + Math.round((h - sc * 7) / 2) + 1, { scale: sc, color: C.mintDD, align: 'center' });
    Font.draw(g, text, x + w / 2, y + Math.round((h - sc * 7) / 2), { scale: sc, color: '#ffffff', align: 'center' });
  }
  // a pill for a small label or a price
  function pill(g, x, y, text, o = {}) {
    const w = Font.width(text, 1) + 10;
    rr(g, x, y, w, 13, 6, C.line);
    rr(g, x + 1, y + 1, w - 2, 11, 5, o.col || C.sun);
    Font.draw(g, text, x + w / 2, y + 3, { scale: 1, color: o.ink || '#4a3304', align: 'center' });
    return w;
  }
  return { C, rr, card, button, tab, pill };
})();
