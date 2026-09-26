// ---- Kit: the interface, drawn on the canvas -----------------------------------
// The same boxes the HTML panels wear (css/theme.css), for everything painted
// straight into the picture: the title screen, the captions on the drive in,
// the travel card, the signs and the speech tags. Farm-game boxes, cut from
// whole pixels: a dark line with its corners knocked off, a bevelled orange
// frame lit on the top and left, an inner line, and warm parchment inside.
// Nothing is round.
const Kit = (() => {
  const C = {
    line: '#4a1e0e', inner: '#7a3414',
    frameL: '#ffb858', frame: '#e07a30', frameM: '#c8622a', frameD: '#a0461a',
    paper: '#ffe3a4', paperL: '#fff4cc', paperD: '#f2c47a',
    ink: '#5a2610', ink2: '#8a5028',
    // the accents: grass green, sunflower, tomato, sky
    mint: '#5cc03c', mintL: '#a8ec6a', mintD: '#2f8a26', mintDD: '#1a5a14', mintW: '#fff4cc',
    sun: '#ffc81c', sunL: '#fff08a', sunD: '#c8840c',
    coral: '#e8402c', coralD: '#a01e14', sky: '#3aa0f0',
    shadow: 'rgba(60,20,4,0.32)',
  };
  const R = (g, x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
  // a rectangle with a single pixel knocked off each corner: the only
  // "rounding" a pixel box is allowed
  function rr(g, x, y, w, h, r, col) {
    x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
    const n = r >= 5 ? 2 : r > 0 ? 1 : 0;
    g.fillStyle = col;
    g.fillRect(x + n, y, w - n * 2, h);
    g.fillRect(x, y + n, w, h - n * 2);
    if (n === 2) { g.fillRect(x + 1, y + 1, w - 2, h - 2); }
  }
  // the box: every card, panel and plaque on the canvas
  function card(g, x, y, w, h, o = {}) {
    x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
    const hot = o.ring, fr = hot ? ['#fff08a', '#ffc81c', '#f0a010', '#c8840c'] : [C.frameL, C.frame, C.frameM, C.frameD];
    if (o.shadow !== false) rr(g, x + 2, y + 3, w, h, 2, C.shadow);
    rr(g, x, y, w, h, 2, C.line);
    R(g, x + 1, y + 1, w - 2, h - 2, fr[1]);
    R(g, x + 2, y + 1, w - 4, 1, fr[0]); R(g, x + 1, y + 2, 1, h - 4, fr[0]);          // lit top and left
    R(g, x + 2, y + h - 2, w - 4, 1, fr[3]); R(g, x + w - 2, y + 2, 1, h - 4, fr[3]);  // shaded foot and right
    R(g, x + 3, y + h - 3, w - 6, 1, fr[2]);
    R(g, x + 3, y + 3, w - 6, h - 6, C.inner);                                           // the inner line
    R(g, x + 4, y + 4, w - 8, h - 8, o.fill || C.paper);
    R(g, x + 4, y + 4, w - 8, 1, o.top || C.paperL);
    R(g, x + 4, y + h - 5, w - 8, 1, o.low || C.paperD);
    // a nub of brass in each corner of the frame
    for (const [cx, cy] of [[x + 1, y + 1], [x + w - 3, y + 1], [x + 1, y + h - 3], [x + w - 3, y + h - 3]]) { R(g, cx, cy, 2, 2, '#ffd070'); R(g, cx + 1, cy + 1, 1, 1, C.frameD); }
  }
  // a button: a small box that lifts under the pointer and sinks when pressed
  function button(g, b, label, sub, o = {}) {
    const hot = !!o.hot, kind = o.kind || 'paper';
    const fill = kind === 'sun' ? [C.sun, C.sunL, C.sunD, '#5a3404'] : kind === 'coral' ? [C.coral, '#ff8a70', C.coralD, '#ffffff']
      : kind === 'mint' ? [C.mint, C.mintL, C.mintD, '#ffffff'] : [C.paper, C.paperL, C.paperD, C.ink];
    const lift = hot ? -2 : 0;
    const x = b.x, y = b.y + lift, w = b.w, h = b.h;
    rr(g, x + 2, b.y + 4, w, h, 2, C.shadow);
    rr(g, x, y, w, h, 2, C.line);
    R(g, x + 1, y + 1, w - 2, h - 2, hot ? '#ffcc5a' : C.frame);
    R(g, x + 2, y + 1, w - 4, 1, C.frameL); R(g, x + 2, y + h - 2, w - 4, 1, C.frameD);
    R(g, x + 3, y + 3, w - 6, h - 6, C.inner);
    R(g, x + 4, y + 4, w - 8, h - 8, hot ? U.shade(fill[0], 0.12) : fill[0]);
    R(g, x + 4, y + 4, w - 8, 2, fill[1]); R(g, x + 4, y + h - 6, w - 8, 2, fill[2]);
    const sc = o.scale || 2;
    const cy = y + (sub ? 7 : Math.round((h - sc * 7) / 2));
    const ink = fill[3];
    if (ink === '#ffffff') Font.draw(g, label, x + w / 2 + 1, cy + 1, { scale: sc, color: 'rgba(60,20,4,0.6)', align: 'center' });
    Font.draw(g, label, x + w / 2, cy, { scale: sc, color: ink, align: 'center' });
    if (sub) Font.draw(g, sub, x + w / 2, cy + sc * 7 + 4, { scale: 1, color: kind === 'paper' ? C.ink2 : ink, align: 'center' });
  }
  // a little plaque with a title on it, for the top of a box
  function tab(g, x, y, w, h, text, o = {}) {
    x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
    rr(g, x, y, w, h, 1, C.line);
    R(g, x + 1, y + 1, w - 2, h - 2, o.col || C.frameM);
    R(g, x + 1, y + 1, w - 2, 1, C.frameL);
    R(g, x + 1, y + h - 2, w - 2, 1, C.frameD);
    const sc = o.scale || 1;
    const ty = y + Math.round((h - sc * 7) / 2);
    Font.draw(g, text, x + w / 2 + 1, ty + 1, { scale: sc, color: C.line, align: 'center' });
    Font.draw(g, text, x + w / 2, ty, { scale: sc, color: '#fff4cc', align: 'center' });
  }
  // a tag for a short label or a price
  function pill(g, x, y, text, o = {}) {
    const w = Font.width(text, 1) + 10;
    rr(g, x, y, w, 13, 1, C.line);
    R(g, x + 1, y + 1, w - 2, 11, o.col || C.sun);
    R(g, x + 1, y + 1, w - 2, 1, 'rgba(255,255,255,0.5)');
    R(g, x + 1, y + 11, w - 2, 1, 'rgba(0,0,0,0.2)');
    Font.draw(g, text, x + w / 2, y + 3, { scale: 1, color: o.ink || '#5a3404', align: 'center' });
    return w;
  }
  // a speech tag over somebody's head, with a stepped tail pointing down at them
  function bubble(g, x, y, text, o = {}) {
    const maxW = o.maxW || 140;
    const lines = Font.wrap(text, maxW, 1);
    const w = Math.max(40, ...lines.map((l) => Font.width(l, 1))) + 14, h = lines.length * 10 + 9;
    const bx = Math.round(U.clamp(x - w / 2, 4, 636 - w)), by = Math.round(y - h);
    rr(g, bx + 2, by + 3, w, h, 1, C.shadow);
    rr(g, bx, by, w, h, 1, C.line);
    R(g, bx + 1, by + 1, w - 2, h - 2, o.fill || '#fff8e0');
    R(g, bx + 1, by + h - 3, w - 2, 2, C.paperD);
    const tx = Math.round(U.clamp(x, bx + 6, bx + w - 8));
    R(g, tx - 3, by + h - 1, 7, 2, o.fill || '#fff8e0'); R(g, tx - 4, by + h - 1, 1, 2, C.line); R(g, tx + 4, by + h - 1, 1, 2, C.line);
    R(g, tx - 2, by + h + 1, 5, 2, o.fill || '#fff8e0'); R(g, tx - 3, by + h + 1, 1, 2, C.line); R(g, tx + 3, by + h + 1, 1, 2, C.line);
    R(g, tx - 1, by + h + 3, 3, 1, C.line);
    lines.forEach((l, i) => Font.draw(g, l, bx + 7, by + 5 + i * 10, { scale: 1, color: C.ink }));
  }
  return { C, rr, card, button, tab, pill, bubble };
})();
