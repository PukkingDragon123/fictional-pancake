// ---- Tiny 2D rigid-body engine (oriented boxes) ---------------------------
// Sequential-impulse solver with accumulated impulses and warm starting,
// in the spirit of Box2D-Lite. Extended with restitution and "adhesion"
// (negative normal impulse allowance) so sticky cubes can cling.
const Physics = (() => {
  const EDGE = { NONE: 0, E1: 1, E2: 2, E3: 3, E4: 4 };
  const FACE_A_X = 0, FACE_A_Y = 1, FACE_B_X = 2, FACE_B_Y = 3;

  class Body {
    constructor(o = {}) {
      this.id = U.uid();
      this.x = o.x || 0; this.y = o.y || 0; this.angle = o.angle || 0;
      this.vx = o.vx || 0; this.vy = o.vy || 0; this.w = o.w || 0; // w = angular velocity
      this.width = o.width || 20; this.height = o.height || 20;
      this.friction = o.friction ?? 0.6;
      this.restitution = o.restitution ?? 0;
      this.adhesion = o.adhesion || 0;      // force (mass units * px/s^2)
      this.angularDamping = o.angularDamping || 0;
      this.linearDamping = o.linearDamping || 0;
      this.gravityScale = o.gravityScale ?? 1;
      this.isStatic = !!o.isStatic;
      this.userData = o.userData || null;
      this.setMass(o.density ?? 1);
      this.pvx = 0; this.pvy = 0; this.pw = 0; // pseudo velocities (position correction only)
      this.contacts = 0; // number of touching bodies (updated each step)
      this.restTime = 0;
    }
    setMass(density) {
      if (this.isStatic) { this.mass = Infinity; this.invMass = 0; this.I = Infinity; this.invI = 0; this.density = 0; return; }
      this.density = density;
      this.mass = this.width * this.height * density / 1000;
      this.invMass = 1 / this.mass;
      this.I = this.mass * (this.width * this.width + this.height * this.height) / 12;
      this.invI = 1 / this.I;
    }
    get speed() { return Math.hypot(this.vx, this.vy); }
    // Axis-aligned bounds (for broadphase)
    aabb() {
      const c = Math.abs(Math.cos(this.angle)), s = Math.abs(Math.sin(this.angle));
      const hx = (this.width * c + this.height * s) / 2, hy = (this.width * s + this.height * c) / 2;
      return { minX: this.x - hx, maxX: this.x + hx, minY: this.y - hy, maxY: this.y + hy };
    }
    top() { return this.aabb().minY; }
    corners() {
      const c = Math.cos(this.angle), s = Math.sin(this.angle), hx = this.width / 2, hy = this.height / 2;
      return [[-hx, -hy], [hx, -hy], [hx, hy], [-hx, hy]].map(([px, py]) => [this.x + px * c - py * s, this.y + px * s + py * c]);
    }
    containsPoint(px, py) {
      const c = Math.cos(this.angle), s = Math.sin(this.angle), dx = px - this.x, dy = py - this.y;
      const lx = c * dx + s * dy, ly = -s * dx + c * dy;
      return Math.abs(lx) <= this.width / 2 && Math.abs(ly) <= this.height / 2;
    }
  }

  // ---- Collision ----------------------------------------------------------
  // fp packs feature edges: inEdge1 | inEdge2<<8 | outEdge1<<16 | outEdge2<<24
  function clipSegmentToLine(vOut, vIn, nx, ny, offset, clipEdge) {
    let numOut = 0;
    const d0 = nx * vIn[0].x + ny * vIn[0].y - offset;
    const d1 = nx * vIn[1].x + ny * vIn[1].y - offset;
    if (d0 <= 0) vOut[numOut++] = vIn[0];
    if (d1 <= 0) vOut[numOut++] = vIn[1];
    if (d0 * d1 < 0) {
      const t = d0 / (d0 - d1);
      const v = { x: vIn[0].x + t * (vIn[1].x - vIn[0].x), y: vIn[0].y + t * (vIn[1].y - vIn[0].y), fp: 0 };
      if (d0 > 0) v.fp = (clipEdge | (vIn[0].fp & 0xffff0000)) >>> 0;       // inEdge1 = clipEdge, inEdge2 = none
      else v.fp = ((vIn[1].fp & 0xffff) | (clipEdge << 16)) >>> 0;           // outEdge1 = clipEdge, outEdge2 = none
      vOut[numOut++] = v;
    }
    return numOut;
  }

  function computeIncidentEdge(c, hx, hy, px, py, cos, sin, nx, ny) {
    // n = -(RotT * normal)
    const lnx = -(cos * nx + sin * ny), lny = -(-sin * nx + cos * ny);
    let v0, v1, fp0, fp1;
    if (Math.abs(lnx) > Math.abs(lny)) {
      if (lnx > 0) { v0 = [hx, -hy]; fp0 = (EDGE.E3 << 8) | (EDGE.E4 << 24); v1 = [hx, hy]; fp1 = (EDGE.E4 << 8) | (EDGE.E1 << 24); }
      else { v0 = [-hx, hy]; fp0 = (EDGE.E1 << 8) | (EDGE.E2 << 24); v1 = [-hx, -hy]; fp1 = (EDGE.E2 << 8) | (EDGE.E3 << 24); }
    } else {
      if (lny > 0) { v0 = [hx, hy]; fp0 = (EDGE.E4 << 8) | (EDGE.E1 << 24); v1 = [-hx, hy]; fp1 = (EDGE.E1 << 8) | (EDGE.E2 << 24); }
      else { v0 = [-hx, -hy]; fp0 = (EDGE.E2 << 8) | (EDGE.E3 << 24); v1 = [hx, -hy]; fp1 = (EDGE.E3 << 8) | (EDGE.E4 << 24); }
    }
    c[0] = { x: px + cos * v0[0] - sin * v0[1], y: py + sin * v0[0] + cos * v0[1], fp: fp0 >>> 0 };
    c[1] = { x: px + cos * v1[0] - sin * v1[1], y: py + sin * v1[0] + cos * v1[1], fp: fp1 >>> 0 };
  }

  const MARGIN = 2.0; // speculative contact margin (px)
  // Returns array of contacts {x,y,nx,ny,sep,key}
  function collide(A, B) {
    const hAx = A.width / 2, hAy = A.height / 2, hBx = B.width / 2, hBy = B.height / 2;
    const ca = Math.cos(A.angle), sa = Math.sin(A.angle), cb = Math.cos(B.angle), sb = Math.sin(B.angle);
    const dpx = B.x - A.x, dpy = B.y - A.y;
    // dA = RotAT*dp, dB = RotBT*dp
    const dAx = ca * dpx + sa * dpy, dAy = -sa * dpx + ca * dpy;
    const dBx = cb * dpx + sb * dpy, dBy = -sb * dpx + cb * dpy;
    // C = RotAT * RotB
    const c11 = ca * cb + sa * sb, c12 = -ca * sb + sa * cb; // row1
    const c21 = -sa * cb + ca * sb, c22 = sa * sb + ca * cb; // row2
    const a11 = Math.abs(c11), a12 = Math.abs(c12), a21 = Math.abs(c21), a22 = Math.abs(c22);
    // faceA = |dA| - hA - absC*hB
    const fAx = Math.abs(dAx) - hAx - (a11 * hBx + a12 * hBy);
    const fAy = Math.abs(dAy) - hAy - (a21 * hBx + a22 * hBy);
    if (fAx > MARGIN || fAy > MARGIN) return null;
    // faceB = |dB| - absCT*hA - hB
    const fBx = Math.abs(dBx) - (a11 * hAx + a21 * hAy) - hBx;
    const fBy = Math.abs(dBy) - (a12 * hAx + a22 * hAy) - hBy;
    if (fBx > MARGIN || fBy > MARGIN) return null;

    let axis = FACE_A_X, sep = fAx, nx = dAx > 0 ? ca : -ca, ny = dAx > 0 ? sa : -sa;
    const relTol = 0.95, absTol = 0.01;
    if (fAy > relTol * sep + absTol * hAy) { axis = FACE_A_Y; sep = fAy; nx = dAy > 0 ? -sa : sa; ny = dAy > 0 ? ca : -ca; }
    if (fBx > relTol * sep + absTol * hBx) { axis = FACE_B_X; sep = fBx; nx = dBx > 0 ? cb : -cb; ny = dBx > 0 ? sb : -sb; }
    if (fBy > relTol * sep + absTol * hBy) { axis = FACE_B_Y; sep = fBy; nx = dBy > 0 ? -sb : sb; ny = dBy > 0 ? cb : -cb; }

    let fnx, fny, front, snx, sny, side, negSide, posSide, negEdge, posEdge;
    const inc = [null, null];
    switch (axis) {
      case FACE_A_X:
        fnx = nx; fny = ny; front = A.x * fnx + A.y * fny + hAx;
        snx = -sa; sny = ca; side = A.x * snx + A.y * sny; negSide = -side + hAy; posSide = side + hAy;
        negEdge = EDGE.E3; posEdge = EDGE.E1; computeIncidentEdge(inc, hBx, hBy, B.x, B.y, cb, sb, fnx, fny); break;
      case FACE_A_Y:
        fnx = nx; fny = ny; front = A.x * fnx + A.y * fny + hAy;
        snx = ca; sny = sa; side = A.x * snx + A.y * sny; negSide = -side + hAx; posSide = side + hAx;
        negEdge = EDGE.E2; posEdge = EDGE.E4; computeIncidentEdge(inc, hBx, hBy, B.x, B.y, cb, sb, fnx, fny); break;
      case FACE_B_X:
        fnx = -nx; fny = -ny; front = B.x * fnx + B.y * fny + hBx;
        snx = -sb; sny = cb; side = B.x * snx + B.y * sny; negSide = -side + hBy; posSide = side + hBy;
        negEdge = EDGE.E3; posEdge = EDGE.E1; computeIncidentEdge(inc, hAx, hAy, A.x, A.y, ca, sa, fnx, fny); break;
      default:
        fnx = -nx; fny = -ny; front = B.x * fnx + B.y * fny + hBy;
        snx = cb; sny = sb; side = B.x * snx + B.y * sny; negSide = -side + hBx; posSide = side + hBx;
        negEdge = EDGE.E2; posEdge = EDGE.E4; computeIncidentEdge(inc, hAx, hAy, A.x, A.y, ca, sa, fnx, fny); break;
    }
    const cp1 = [null, null], cp2 = [null, null];
    if (clipSegmentToLine(cp1, inc, -snx, -sny, negSide, negEdge) < 2) return null;
    if (clipSegmentToLine(cp2, cp1, snx, sny, posSide, posEdge) < 2) return null;
    const out = [];
    for (let i = 0; i < 2; i++) {
      const v = cp2[i];
      const s = fnx * v.x + fny * v.y - front;
      if (s <= MARGIN) {
        let key = v.fp >>> 0;
        if (axis === FACE_B_X || axis === FACE_B_Y) key = ((key & 0xffff) << 16) | ((key >>> 16) & 0xffff); // flip
        out.push({ x: v.x - s * fnx, y: v.y - s * fny, nx, ny, sep: s, key: key >>> 0, Pn: 0, Pt: 0 });
      }
    }
    return out.length ? out : null;
  }

  class Arbiter {
    constructor(a, b) {
      this.a = a; this.b = b;
      this.contacts = [];
      this.friction = Math.sqrt(a.friction * b.friction);
      this.restitution = Math.max(a.restitution, b.restitution);
      this.adhesion = Math.max(a.adhesion, b.adhesion);
      this.fresh = true;
    }
    update(newContacts, world) {
      const merged = [];
      let newImpulse = 0;
      for (const nc of newContacts) {
        const old = this.contacts.find((c) => c.key === nc.key);
        if (old) { nc.Pn = old.Pn; nc.Pt = old.Pt; }
        else nc.isNew = true;
        merged.push(nc);
      }
      this.contacts = merged;
      this.friction = Math.sqrt(this.a.friction * this.b.friction);
      this.adhesion = Math.max(this.a.adhesion, this.b.adhesion);
      this.restitution = Math.max(this.a.restitution, this.b.restitution);
    }
    preStep(invDt, world) {
      const A = this.a, B = this.b;
      const allowedPen = 0.08, biasFactor = 0.3;
      for (const c of this.contacts) {
        c.rAx = c.x - A.x; c.rAy = c.y - A.y; c.rBx = c.x - B.x; c.rBy = c.y - B.y;
        const rnA = c.rAx * c.nx + c.rAy * c.ny, rnB = c.rBx * c.nx + c.rBy * c.ny;
        let kN = A.invMass + B.invMass;
        kN += A.invI * ((c.rAx * c.rAx + c.rAy * c.rAy) - rnA * rnA) + B.invI * ((c.rBx * c.rBx + c.rBy * c.rBy) - rnB * rnB);
        c.massNormal = 1 / kN;
        const tx = c.ny, ty = -c.nx; // tangent = cross(n, 1)
        const rtA = c.rAx * tx + c.rAy * ty, rtB = c.rBx * tx + c.rBy * ty;
        let kT = A.invMass + B.invMass;
        kT += A.invI * ((c.rAx * c.rAx + c.rAy * c.rAy) - rtA * rtA) + B.invI * ((c.rBx * c.rBx + c.rBy * c.rBy) - rtB * rtB);
        c.massTangent = 1 / kT;
        c.bias = c.sep < 0 ? Math.min(60, -biasFactor * invDt * Math.min(0, c.sep + allowedPen)) : 0; // position-only (split impulse)
        c.vtarget = c.sep > 0 ? -c.sep * invDt : 0; // speculative: may approach only fast enough to close the gap this step
        c.Pnb = 0;
        c.rbias = 0;
        // restitution: relative normal velocity before solving
        if (this.restitution > 0) {
          const dvx = B.vx - B.w * c.rBy - A.vx + A.w * c.rAy;
          const dvy = B.vy + B.w * c.rBx - A.vy - A.w * c.rAx;
          const vn = dvx * c.nx + dvy * c.ny;
          if (vn < -40) c.rbias = -this.restitution * vn;
        }
        c.adhMax = this.adhesion / invDt; // impulse allowance per step
        // warm start
        const Px = c.Pn * c.nx + c.Pt * tx, Py = c.Pn * c.ny + c.Pt * ty;
        A.vx -= A.invMass * Px; A.vy -= A.invMass * Py; A.w -= A.invI * (c.rAx * Py - c.rAy * Px);
        B.vx += B.invMass * Px; B.vy += B.invMass * Py; B.w += B.invI * (c.rBx * Py - c.rBy * Px);
      }
    }
    applyImpulse() {
      const A = this.a, B = this.b;
      for (const c of this.contacts) {
        let dvx = B.vx - B.w * c.rBy - A.vx + A.w * c.rAy;
        let dvy = B.vy + B.w * c.rBx - A.vy - A.w * c.rAx;
        const vn = dvx * c.nx + dvy * c.ny;
        let dPn = c.massNormal * (-vn + c.rbias + c.vtarget + (this.velBias ? c.bias : 0));
        const Pn0 = c.Pn;
        c.Pn = Math.max(Pn0 + dPn, -c.adhMax);
        dPn = c.Pn - Pn0;
        let Px = dPn * c.nx, Py = dPn * c.ny;
        A.vx -= A.invMass * Px; A.vy -= A.invMass * Py; A.w -= A.invI * (c.rAx * Py - c.rAy * Px);
        B.vx += B.invMass * Px; B.vy += B.invMass * Py; B.w += B.invI * (c.rBx * Py - c.rBy * Px);
        // position correction via pseudo velocities (does not add energy)
        if (this.split && c.bias > 0) {
          const pdvx = B.pvx - B.pw * c.rBy - A.pvx + A.pw * c.rAy;
          const pdvy = B.pvy + B.pw * c.rBx - A.pvy - A.pw * c.rAx;
          const pvn = pdvx * c.nx + pdvy * c.ny;
          let dPnb = c.massNormal * (-pvn + c.bias);
          const Pnb0 = c.Pnb; c.Pnb = Math.max(Pnb0 + dPnb, 0); dPnb = c.Pnb - Pnb0;
          const Pbx = dPnb * c.nx, Pby = dPnb * c.ny;
          A.pvx -= A.invMass * Pbx; A.pvy -= A.invMass * Pby; A.pw -= A.invI * (c.rAx * Pby - c.rAy * Pbx);
          B.pvx += B.invMass * Pbx; B.pvy += B.invMass * Pby; B.pw += B.invI * (c.rBx * Pby - c.rBy * Pbx);
        }
        // friction
        dvx = B.vx - B.w * c.rBy - A.vx + A.w * c.rAy;
        dvy = B.vy + B.w * c.rBx - A.vy - A.w * c.rAx;
        const tx = c.ny, ty = -c.nx;
        const vt = dvx * tx + dvy * ty;
        let dPt = c.massTangent * (-vt);
        const maxPt = this.friction * Math.max(c.Pn, 0) + c.adhMax * 0.6;
        const Pt0 = c.Pt;
        c.Pt = U.clamp(Pt0 + dPt, -maxPt, maxPt);
        dPt = c.Pt - Pt0;
        Px = dPt * tx; Py = dPt * ty;
        A.vx -= A.invMass * Px; A.vy -= A.invMass * Py; A.w -= A.invI * (c.rAx * Py - c.rAy * Px);
        B.vx += B.invMass * Px; B.vy += B.invMass * Py; B.w += B.invI * (c.rBx * Py - c.rBy * Px);
      }
    }
  }

  class World {
    constructor() {
      this.bodies = [];
      this.arbiters = new Map();
      this.gravity = 900;
      this.iterations = 10;
      this.onImpact = null; // (a, b, impulse)
      this.forceFn = null;  // (body, dt) extra forces
      this.splitImpulse = true;
      this.maxFall = 0; // clamp downward speed (0 = off)
      this.restDamping = 0.93;
      this.settleDamp = 0.8;   // damping applied each step to once-settled bodies moving slowly
      this.settleSpeed = 60;    // below this speed a settled body is damped
      this.velBias = false; // legacy: bias inside velocity solve
    }
    add(b) { this.bodies.push(b); return b; }
    remove(b) {
      const i = this.bodies.indexOf(b); if (i >= 0) this.bodies.splice(i, 1);
      for (const [k, arb] of this.arbiters) if (arb.a === b || arb.b === b) this.arbiters.delete(k);
    }
    clear() { this.bodies.length = 0; this.arbiters.clear(); }
    step(dt) {
      const invDt = dt > 0 ? 1 / dt : 0;
      const bodies = this.bodies;
      for (const b of bodies) b.contacts = 0;
      // broadphase + narrowphase
      const boxes = bodies.map((b) => b.aabb());
      for (let i = 0; i < bodies.length; i++) {
        const bi = bodies[i], ai = boxes[i];
        for (let j = i + 1; j < bodies.length; j++) {
          const bj = bodies[j];
          if (bi.invMass === 0 && bj.invMass === 0) continue;
          const aj = boxes[j];
          const key = bi.id < bj.id ? bi.id * 1000003 + bj.id : bj.id * 1000003 + bi.id;
          if (ai.maxX < aj.minX || aj.maxX < ai.minX || ai.maxY < aj.minY || aj.maxY < ai.minY) { if (this.arbiters.has(key)) this.arbiters.delete(key); continue; }
          const contacts = collide(bi, bj);
          let arb = this.arbiters.get(key);
          if (contacts) {
            if (contacts.some((c) => c.sep <= 0.5)) { bi.contacts++; bj.contacts++; }
            if (!arb) { arb = new Arbiter(bi, bj); this.arbiters.set(key, arb); arb.justCreated = true; }
            else arb.justCreated = false;
            arb.update(contacts, this);
          } else if (arb) this.arbiters.delete(key);
        }
      }
      // integrate forces
      for (const b of bodies) {
        b.pvx = 0; b.pvy = 0; b.pw = 0;
        if (b.invMass === 0) continue;
        b.vy += this.gravity * b.gravityScale * dt;
        if (this.forceFn) this.forceFn(b, dt);
        if (this.maxFall > 0 && b.vy > this.maxFall) b.vy = this.maxFall;
        if (b.linearDamping) { const f = Math.max(0, 1 - b.linearDamping * dt); b.vx *= f; b.vy *= f; }
        if (b.angularDamping) b.w *= Math.max(0, 1 - b.angularDamping * dt);
      }
      // prestep
      for (const arb of this.arbiters.values()) arb.preStep(invDt, this);
      // solve
      for (const arb of this.arbiters.values()) { arb.split = this.splitImpulse; arb.velBias = this.velBias; }
      for (let it = 0; it < this.iterations; it++) for (const arb of this.arbiters.values()) arb.applyImpulse();
      // impact events
      if (this.onImpact) {
        for (const arb of this.arbiters.values()) {
          if (arb.justCreated) {
            let P = 0; for (const c of arb.contacts) P += Math.abs(c.Pn);
            this.onImpact(arb.a, arb.b, P * invDt, arb.contacts[0]);
          }
        }
      }
      // integrate velocities
      for (const b of bodies) {
        if (b.invMass === 0) continue;
        b.x += (b.vx + b.pvx) * dt; b.y += (b.vy + b.pvy) * dt; b.angle += (b.w + b.pw) * dt;
        if (Math.abs(b.vx) < 3 && Math.abs(b.vy) < 3 && Math.abs(b.w) < 0.08 && b.contacts > 0) b.restTime += dt; else b.restTime = 0;
        if (b.restTime > 0.4) b.settledOnce = true;
        // rest damping: bleeds off solver jitter in tall stacks
        if (this.restDamping < 1 && b.restTime > 0.3) { b.vx *= this.restDamping; b.vy *= this.restDamping; b.w *= this.restDamping; }
        // settled damping: once a body has come to rest, slow ripples die quickly; hard hits still move it
        if (b.settledOnce && this.settleDamp < 1 && b.contacts > 0) { const sp = Math.hypot(b.vx, b.vy) + Math.abs(b.w) * 10; if (sp < this.settleSpeed) { b.vx *= this.settleDamp; b.vy *= this.settleDamp; b.w *= this.settleDamp; } }
      }
    }
  }

  return { Body, World, collide };
})();
