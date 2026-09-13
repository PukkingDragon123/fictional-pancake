#!/usr/bin/env python3
"""Build a TrueType font out of the game's 5x7 bitmap glyphs.

The canvas draws text by blitting those glyphs directly; the DOM cannot. So the
same table is compiled into a real font here and embedded in the stylesheet, and
every letter in the game — canvas or DOM — is then the same letter.

Each glyph row is a hex pair and bit 4 is the leftmost of five columns. Runs of
set pixels in a row become one rectangular contour; every point is on-curve.
"""
import json
import math
import struct
import sys

UPM = 1000
PX = 100                      # one bitmap pixel, in font units
ROWS, COLS = 7, 5
ADV = (COLS + 1) * PX         # the advance the canvas uses: five wide plus a gap
ASC, DESC = 800, -200


def rows_of(hexstr):
    return [int(hexstr[i * 2:i * 2 + 2], 16) for i in range(ROWS)]


def rects(hexstr):
    """Merge each row's set pixels into horizontal runs."""
    out = []
    for r, bits in enumerate(rows_of(hexstr)):
        run = None
        for c in range(COLS):
            on = bits & (1 << (COLS - 1 - c))
            if on and run is None:
                run = c
            elif not on and run is not None:
                out.append((run, c, r))
                run = None
        if run is not None:
            out.append((run, COLS, r))
    return out


def glyf_for(hexstr):
    """A simple glyph: one four-point contour per run."""
    rs = rects(hexstr)
    if not rs:
        return b'', 0, 0, 0, 0
    xs, ys, flags, ends = [], [], [], []
    for (c0, c1, r) in rs:
        x0, x1 = c0 * PX, c1 * PX
        y1 = (ROWS - r) * PX
        y0 = y1 - PX
        for (px, py) in ((x0, y0), (x0, y1), (x1, y1), (x1, y0)):
            xs.append(px)
            ys.append(py)
            flags.append(1)
        ends.append(len(xs) - 1)
    xmin, xmax, ymin, ymax = min(xs), max(xs), min(ys), max(ys)
    d = struct.pack('>hhhhh', len(ends), xmin, ymin, xmax, ymax)
    d += b''.join(struct.pack('>H', e) for e in ends)
    d += struct.pack('>H', 0)                      # no instructions
    d += bytes(flags)
    prev = 0
    for x in xs:
        d += struct.pack('>h', x - prev)
        prev = x
    prev = 0
    for y in ys:
        d += struct.pack('>h', y - prev)
        prev = y
    if len(d) % 4:
        d += b'\x00' * (4 - len(d) % 4)
    return d, xmin, ymin, xmax, ymax


def checksum(data):
    if len(data) % 4:
        data = data + b'\x00' * (4 - len(data) % 4)
    return sum(struct.unpack('>%dI' % (len(data) // 4), data)) & 0xFFFFFFFF


def build(glyphs, miss):
    codes = sorted(set(ord(k) for k in glyphs if len(k) == 1))
    order = [chr(c) for c in codes]
    every = [None] + order

    glyf = b''
    loca = [0]
    boxes = []
    for ch in every:                               # glyph 0 is .notdef: the missing box
        hx = miss if ch is None else glyphs[ch]
        d, x0, y0, x1, y1 = glyf_for(hx)
        glyf += d
        loca.append(len(glyf))
        boxes.append((x0, y0, x1, y1))
    n = len(every)

    xmin = min(b[0] for b in boxes)
    ymin = min(b[1] for b in boxes)
    xmax = max(b[2] for b in boxes)
    ymax = max(b[3] for b in boxes)

    long_loca = loca[-1] > 0x1FFFF
    if long_loca:
        loca_t = b''.join(struct.pack('>I', v) for v in loca)
    else:
        loca_t = b''.join(struct.pack('>H', v // 2) for v in loca)

    head = struct.pack('>IIIIHHQQhhhhHHhhh',
                       0x00010000, 0x00010000, 0, 0x5F0F3CF5,
                       0b1011, UPM, 0, 0,
                       xmin, ymin, xmax, ymax, 0, 8, 2,
                       1 if long_loca else 0, 0)
    hhea = struct.pack('>IhhhHhhhhhhhhhhhH',
                       0x00010000, ASC, DESC, 0, ADV, xmin, ymin, xmax,
                       1, 0, 0, 0, 0, 0, 0, 0, n)
    hmtx = b''.join(struct.pack('>Hh', ADV, 0) for _ in range(n))
    max_pts = max(len(rects(miss if c is None else glyphs[c])) * 4 for c in every)
    max_ctr = max(len(rects(miss if c is None else glyphs[c])) for c in every)
    maxp = struct.pack('>IHHHHHHHHHHHHHH', 0x00010000, n, max_pts, max_ctr,
                       0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0)

    # ---- cmap format 4: one segment per contiguous run of codepoints -------
    segs = []
    s = p = codes[0]
    for c in codes[1:]:
        if c == p + 1:
            p = c
            continue
        segs.append((s, p))
        s = p = c
    segs.append((s, p))
    segs.append((0xFFFF, 0xFFFF))
    segc = len(segs)
    ends_ = b''.join(struct.pack('>H', e) for (_, e) in segs)
    starts = b''.join(struct.pack('>H', a) for (a, _) in segs)
    deltas = b''
    gid = 1
    for (a, e) in segs:
        if a == 0xFFFF:
            deltas += struct.pack('>H', 1)
        else:
            deltas += struct.pack('>H', (gid - a) & 0xFFFF)
            gid += e - a + 1
    ranges = b''.join(struct.pack('>H', 0) for _ in segs)
    sr = 2 * (2 ** int(math.log2(segc)))
    sub = struct.pack('>HHHHHHH', 4, 16 + segc * 8, 0, segc * 2, sr,
                      int(math.log2(sr // 2)), segc * 2 - sr)
    sub += ends_ + struct.pack('>H', 0) + starts + deltas + ranges
    cmap = struct.pack('>HH', 0, 2)
    cmap += struct.pack('>HHI', 3, 1, 4 + 2 * 8)
    cmap += struct.pack('>HHI', 0, 3, 4 + 2 * 8)
    cmap += sub

    names = [(1, 'WombatPixel'), (2, 'Regular'), (3, 'WombatPixel-Regular'),
             (4, 'WombatPixel'), (5, 'Version 1.0'), (6, 'WombatPixel-Regular')]
    recs, strs = b'', b''
    for nid, txt in names:
        data = txt.encode('utf-16-be')
        recs += struct.pack('>HHHHHH', 3, 1, 0x409, nid, len(data), len(strs))
        strs += data
    name = struct.pack('>HHH', 0, len(names), 6 + len(names) * 12) + recs + strs

    post = struct.pack('>IIhhIIIII', 0x00030000, 0, 0, 0, 0, 0, 0, 0, 0)

    os2 = struct.pack('>HhHHHhhhhhhhhhh', 4, ADV, 400, 5, 0,
                      0, 0, 0, 0, 0, 0, 0, 0, 0, 0)
    os2 += b'\x00' * 10                                    # panose
    os2 += struct.pack('>IIII', 0, 0, 0, 0)                # unicode ranges
    os2 += b'WPIX'
    os2 += struct.pack('>HHHhhhHHH', 0, codes[0], codes[-1],
                       ASC, DESC, 0, ASC, -DESC, ADV)

    tables = {b'OS/2': os2, b'cmap': cmap, b'glyf': glyf, b'head': head,
              b'hhea': hhea, b'hmtx': hmtx, b'loca': loca_t, b'maxp': maxp,
              b'name': name, b'post': post}
    tags = sorted(tables)
    numt = len(tags)
    sr2 = 16 * (2 ** int(math.log2(numt)))
    out = struct.pack('>IHHHH', 0x00010000, numt, sr2,
                      int(math.log2(sr2 // 16)), numt * 16 - sr2)
    offset = 12 + numt * 16
    recs = b''
    body = b''
    for t in tags:
        d = tables[t]
        pad = (4 - len(d) % 4) % 4
        recs += t + struct.pack('>III', checksum(d), offset, len(d))
        body += d + b'\x00' * pad
        offset += len(d) + pad
    return out + recs + body


if __name__ == '__main__':
    data = json.load(open(sys.argv[1]))
    ttf = build(data['G'], data['MISS'])
    open(sys.argv[2], 'wb').write(ttf)
    print('wrote', sys.argv[2], len(ttf), 'bytes')
