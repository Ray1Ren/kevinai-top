/* ============================================================================
 * Sling Siege — 自研 2D 刚体物理引擎（无任何外部依赖）
 * 支持：凸多边形 / 圆形刚体、SAT 碰撞、接触点裁剪、序列冲量求解、
 *       摩擦、弹性、Baumgarte 位置偏置、休眠、冲击回调（用于伤害判定）。
 * 坐标系：x 向右、y 向下（与 canvas 一致），角度为弧度顺时针。
 * ==========================================================================*/
(function (global) {
  'use strict';

  var EPS = 1e-9;
  var SLOP = 0.55;          // 允许穿透量，避免抖动
  var BIAS = 0.22;          // 位置修正强度
  var REST_THRESHOLD = 110; // 低于此接近速度不计弹性
  var SLEEP_LIN = 9;
  var SLEEP_ANG = 0.055;
  var SLEEP_TIME = 0.7;
  var WAKE_SPEED = 34;

  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }

  function rectVerts(hw, hh) {
    // 顶点顺序保证 normal = (edge.y, -edge.x) 指向外侧（y 向下坐标系）
    return [
      { x: -hw, y: -hh },
      { x: hw, y: -hh },
      { x: hw, y: hh },
      { x: -hw, y: hh }
    ];
  }

  var bodySeq = 0;

  // ---------------------------------------------------------------- Body ----

  function Body(o) {
    bodySeq += 1;
    this.id = bodySeq;
    this.shape = o.shape || 'poly';
    this.kind = o.kind || 'block';
    this.x = o.x || 0;
    this.y = o.y || 0;
    this.angle = o.angle || 0;
    this.vx = o.vx || 0;
    this.vy = o.vy || 0;
    this.av = o.av || 0;
    this.isStatic = !!o.isStatic;
    this.restitution = o.restitution != null ? o.restitution : 0.06;
    this.friction = o.friction != null ? o.friction : 0.6;
    this.linearDamping = o.linearDamping != null ? o.linearDamping : 0.16;
    this.angularDamping = o.angularDamping != null ? o.angularDamping : 0.55;
    this.density = o.density != null ? o.density : 0.0012;
    this.radius = o.radius || 0;
    this.hw = o.hw || 0;
    this.hh = o.hh || 0;
    this.allowSleep = o.allowSleep !== false;
    this.awake = true;
    this.sleepTimer = 0;
    this.removed = false;
    this.gravityScale = o.gravityScale != null ? o.gravityScale : 1;
    this.data = o.data || {};

    this.localVerts = null;
    this.localNormals = null;
    this.worldVerts = null;
    this.worldNormals = null;

    if (this.shape === 'poly') {
      this.localVerts = (o.verts || rectVerts(this.hw, this.hh)).map(function (v) {
        return { x: v.x, y: v.y };
      });
      this.localNormals = [];
      this.worldVerts = [];
      this.worldNormals = [];
      for (var i = 0; i < this.localVerts.length; i++) {
        var a = this.localVerts[i];
        var b = this.localVerts[(i + 1) % this.localVerts.length];
        var ex = b.x - a.x, ey = b.y - a.y;
        var len = Math.hypot(ex, ey) || 1;
        this.localNormals.push({ x: ey / len, y: -ex / len });
        this.worldVerts.push({ x: 0, y: 0 });
        this.worldNormals.push({ x: 0, y: 0 });
      }
    }

    this.minx = 0; this.miny = 0; this.maxx = 0; this.maxy = 0;
    this.computeMass();
    this.sync();
  }

  Body.prototype.computeMass = function () {
    if (this.isStatic) {
      this.mass = 0; this.invMass = 0; this.inertia = 0; this.invInertia = 0;
      return;
    }
    if (this.shape === 'circle') {
      var area = Math.PI * this.radius * this.radius;
      this.mass = area * this.density;
      this.inertia = 0.5 * this.mass * this.radius * this.radius;
    } else {
      var v = this.localVerts, n = v.length;
      var area2 = 0, inum = 0;
      for (var i = 0; i < n; i++) {
        var p = v[i], q = v[(i + 1) % n];
        var cr = p.x * q.y - q.x * p.y;
        area2 += cr;
        inum += cr * (p.x * p.x + p.x * q.x + q.x * q.x + p.y * p.y + p.y * q.y + q.y * q.y);
      }
      var ar = Math.abs(area2) * 0.5;
      this.mass = ar * this.density;
      this.inertia = Math.abs(inum) / 12 * this.density;
    }
    this.invMass = this.mass > EPS ? 1 / this.mass : 0;
    this.invInertia = this.inertia > EPS ? 1 / this.inertia : 0;
  };

  Body.prototype.sync = function () {
    if (this.shape === 'circle') {
      this.minx = this.x - this.radius; this.maxx = this.x + this.radius;
      this.miny = this.y - this.radius; this.maxy = this.y + this.radius;
      return;
    }
    var c = Math.cos(this.angle), s = Math.sin(this.angle);
    var lv = this.localVerts, wv = this.worldVerts, n = lv.length;
    var minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity;
    for (var i = 0; i < n; i++) {
      var p = lv[i];
      var wx = this.x + p.x * c - p.y * s;
      var wy = this.y + p.x * s + p.y * c;
      wv[i].x = wx; wv[i].y = wy;
      if (wx < minx) minx = wx;
      if (wx > maxx) maxx = wx;
      if (wy < miny) miny = wy;
      if (wy > maxy) maxy = wy;
    }
    var ln = this.localNormals, wn = this.worldNormals;
    for (var j = 0; j < n; j++) {
      wn[j].x = ln[j].x * c - ln[j].y * s;
      wn[j].y = ln[j].x * s + ln[j].y * c;
    }
    this.minx = minx; this.maxx = maxx; this.miny = miny; this.maxy = maxy;
  };

  Body.prototype.wake = function () {
    if (this.isStatic) return;
    this.awake = true;
    this.sleepTimer = 0;
  };

  Body.prototype.speed = function () { return Math.hypot(this.vx, this.vy); };

  Body.prototype.applyImpulse = function (ix, iy, px, py) {
    if (this.isStatic) return;
    this.wake();
    this.vx += ix * this.invMass;
    this.vy += iy * this.invMass;
    if (px != null) {
      var rx = px - this.x, ry = py - this.y;
      this.av += (rx * iy - ry * ix) * this.invInertia;
    }
  };

  // --------------------------------------------------------- collisions ----

  function support(body, dx, dy) {
    // 返回多边形在方向 (dx,dy) 上最远的顶点索引
    var best = -Infinity, bi = 0, wv = body.worldVerts;
    for (var i = 0; i < wv.length; i++) {
      var d = wv[i].x * dx + wv[i].y * dy;
      if (d > best) { best = d; bi = i; }
    }
    return bi;
  }

  function leastPenetration(A, B) {
    // 找 A 的面中分离度最大（最浅穿透）的一个
    var bestSep = -Infinity, bestIdx = 0;
    var wn = A.worldNormals, wv = A.worldVerts;
    for (var i = 0; i < wn.length; i++) {
      var n = wn[i];
      var si = support(B, -n.x, -n.y);
      var s = B.worldVerts[si];
      var v = wv[i];
      var sep = (s.x - v.x) * n.x + (s.y - v.y) * n.y;
      if (sep > bestSep) { bestSep = sep; bestIdx = i; }
    }
    return { sep: bestSep, idx: bestIdx };
  }

  function clipSegment(p1, p2, nx, ny, offset, out) {
    var d1 = nx * p1.x + ny * p1.y - offset;
    var d2 = nx * p2.x + ny * p2.y - offset;
    var count = 0;
    if (d1 <= 0) { out[count].x = p1.x; out[count].y = p1.y; count++; }
    if (d2 <= 0) { out[count].x = p2.x; out[count].y = p2.y; count++; }
    if (d1 * d2 < 0 && count < 2) {
      var t = d1 / (d1 - d2);
      out[count].x = p1.x + t * (p2.x - p1.x);
      out[count].y = p1.y + t * (p2.y - p1.y);
      count++;
    }
    return count;
  }

  var _clipA = [{ x: 0, y: 0 }, { x: 0, y: 0 }];
  var _clipB = [{ x: 0, y: 0 }, { x: 0, y: 0 }];

  function polyPoly(A, B, m) {
    var pa = leastPenetration(A, B);
    if (pa.sep > 0) return 0;
    var pb = leastPenetration(B, A);
    if (pb.sep > 0) return 0;

    var ref, inc, faceIdx, flip;
    if (pb.sep > pa.sep * 0.98 + 0.06) {
      ref = B; inc = A; faceIdx = pb.idx; flip = true;
    } else {
      ref = A; inc = B; faceIdx = pa.idx; flip = false;
    }

    var rn = ref.worldNormals[faceIdx];
    var v1 = ref.worldVerts[faceIdx];
    var v2 = ref.worldVerts[(faceIdx + 1) % ref.worldVerts.length];

    // incident face：法向最反向于参考面法向
    var minDot = Infinity, ii = 0;
    for (var i = 0; i < inc.worldNormals.length; i++) {
      var d = inc.worldNormals[i].x * rn.x + inc.worldNormals[i].y * rn.y;
      if (d < minDot) { minDot = d; ii = i; }
    }
    var i1 = inc.worldVerts[ii];
    var i2 = inc.worldVerts[(ii + 1) % inc.worldVerts.length];

    // 侧平面裁剪
    var ex = v2.x - v1.x, ey = v2.y - v1.y;
    var el = Math.hypot(ex, ey) || 1;
    var tx = ex / el, ty = ey / el;

    var n1 = clipSegment(i1, i2, -tx, -ty, -(tx * v1.x + ty * v1.y), _clipA);
    if (n1 < 2) return 0;
    var n2 = clipSegment(_clipA[0], _clipA[1], tx, ty, tx * v2.x + ty * v2.y, _clipB);
    if (n2 < 2) return 0;

    var refC = rn.x * v1.x + rn.y * v1.y;
    var count = 0;
    for (var k = 0; k < 2; k++) {
      var p = _clipB[k];
      var sep = (rn.x * p.x + rn.y * p.y) - refC;
      if (sep <= 0) {
        m.points[count].x = p.x;
        m.points[count].y = p.y;
        m.points[count].sep = sep;
        count++;
      }
    }
    if (!count) return 0;
    m.normal.x = flip ? -rn.x : rn.x;
    m.normal.y = flip ? -rn.y : rn.y;
    m.count = count;
    return count;
  }

  function circleCircle(A, B, m) {
    var dx = B.x - A.x, dy = B.y - A.y;
    var dist = Math.hypot(dx, dy);
    var r = A.radius + B.radius;
    if (dist >= r) return 0;
    var nx, ny;
    if (dist < EPS) { nx = 0; ny = -1; dist = 0; } else { nx = dx / dist; ny = dy / dist; }
    m.normal.x = nx; m.normal.y = ny;
    m.count = 1;
    m.points[0].x = A.x + nx * (A.radius - (r - dist) * 0.5);
    m.points[0].y = A.y + ny * (A.radius - (r - dist) * 0.5);
    m.points[0].sep = dist - r;
    return 1;
  }

  // C: circle, P: poly。法向输出为 “从 C 指向 P”，flip 时反向（保证 normal: A→B）
  function circlePoly(C, P, m, flip) {
    var c = Math.cos(P.angle), s = Math.sin(P.angle);
    var dx = C.x - P.x, dy = C.y - P.y;
    var lx = dx * c + dy * s;
    var ly = -dx * s + dy * c;

    var lv = P.localVerts, ln = P.localNormals, n = lv.length;
    var best = -Infinity, bi = 0;
    for (var i = 0; i < n; i++) {
      var sep = ln[i].x * (lx - lv[i].x) + ln[i].y * (ly - lv[i].y);
      if (sep > C.radius) return 0;
      if (sep > best) { best = sep; bi = i; }
    }

    var nx, ny, penDepth, cx, cy;
    var a = lv[bi], b = lv[(bi + 1) % n];

    if (best < EPS) {
      // 圆心在多边形内部
      nx = -ln[bi].x; ny = -ln[bi].y;         // 从圆心指向多边形内部方向的反面 → 指向面
      penDepth = C.radius - best;
      cx = lx - ln[bi].x * best;
      cy = ly - ln[bi].y * best;
    } else {
      var e1x = b.x - a.x, e1y = b.y - a.y;
      var w1 = (lx - a.x) * e1x + (ly - a.y) * e1y;
      var w2 = (lx - b.x) * (-e1x) + (ly - b.y) * (-e1y);
      if (w1 <= 0) {
        var d1 = Math.hypot(lx - a.x, ly - a.y);
        if (d1 > C.radius) return 0;
        nx = (a.x - lx) / (d1 || 1); ny = (a.y - ly) / (d1 || 1);
        penDepth = C.radius - d1;
        cx = a.x; cy = a.y;
      } else if (w2 <= 0) {
        var d2 = Math.hypot(lx - b.x, ly - b.y);
        if (d2 > C.radius) return 0;
        nx = (b.x - lx) / (d2 || 1); ny = (b.y - ly) / (d2 || 1);
        penDepth = C.radius - d2;
        cx = b.x; cy = b.y;
      } else {
        nx = -ln[bi].x; ny = -ln[bi].y;
        penDepth = C.radius - best;
        cx = lx + nx * best;
        cy = ly + ny * best;
      }
    }

    // 回到世界坐标
    var wnx = nx * c - ny * s;
    var wny = nx * s + ny * c;
    var wcx = P.x + cx * c - cy * s;
    var wcy = P.y + cx * s + cy * c;

    m.normal.x = flip ? -wnx : wnx;
    m.normal.y = flip ? -wny : wny;
    m.count = 1;
    m.points[0].x = wcx;
    m.points[0].y = wcy;
    m.points[0].sep = -penDepth;
    return 1;
  }

  function collide(A, B, m) {
    if (A.shape === 'circle') {
      if (B.shape === 'circle') return circleCircle(A, B, m);
      return circlePoly(A, B, m, false);
    }
    if (B.shape === 'circle') return circlePoly(B, A, m, true);
    return polyPoly(A, B, m);
  }

  // ------------------------------------------------------------ Arbiter ----

  function ContactPoint() {
    this.x = 0; this.y = 0; this.sep = 0;
    this.pn = 0; this.pt = 0;
    this.rax = 0; this.ray = 0; this.rbx = 0; this.rby = 0;
    this.massN = 0; this.massT = 0;
    this.bias = 0; this.targetVn = 0;
  }

  function Arbiter(a, b) {
    this.a = a; this.b = b;
    this.count = 0;
    this.normal = { x: 0, y: 0 };
    this.points = [new ContactPoint(), new ContactPoint()];
    this.friction = Math.sqrt(a.friction * b.friction);
    this.restitution = Math.max(a.restitution, b.restitution);
    this.approach = 0;
    this.isNew = true;
    this.touched = true;
  }

  Arbiter.prototype.merge = function (m) {
    var old = [];
    for (var i = 0; i < this.count; i++) {
      old.push({ x: this.points[i].x, y: this.points[i].y, pn: this.points[i].pn, pt: this.points[i].pt });
    }
    this.normal.x = m.normal.x;
    this.normal.y = m.normal.y;
    this.count = m.count;
    for (var j = 0; j < m.count; j++) {
      var p = this.points[j];
      p.x = m.points[j].x; p.y = m.points[j].y; p.sep = m.points[j].sep;
      p.pn = 0; p.pt = 0;
      var bestD = 144, bi = -1;   // 12px 内视为同一接触点，继承冲量（warm start）
      for (var k = 0; k < old.length; k++) {
        var ddx = old[k].x - p.x, ddy = old[k].y - p.y;
        var d2 = ddx * ddx + ddy * ddy;
        if (d2 < bestD) { bestD = d2; bi = k; }
      }
      if (bi >= 0) { p.pn = old[bi].pn; p.pt = old[bi].pt; }
    }
  };

  Arbiter.prototype.preStep = function (invDt) {
    var a = this.a, b = this.b, n = this.normal;
    var tx = -n.y, ty = n.x;
    this.approach = 0;
    for (var i = 0; i < this.count; i++) {
      var p = this.points[i];
      p.rax = p.x - a.x; p.ray = p.y - a.y;
      p.rbx = p.x - b.x; p.rby = p.y - b.y;

      var rnA = p.rax * n.y - p.ray * n.x;
      var rnB = p.rbx * n.y - p.rby * n.x;
      var kn = a.invMass + b.invMass + a.invInertia * rnA * rnA + b.invInertia * rnB * rnB;
      p.massN = kn > EPS ? 1 / kn : 0;

      var rtA = p.rax * ty - p.ray * tx;
      var rtB = p.rbx * ty - p.rby * tx;
      var kt = a.invMass + b.invMass + a.invInertia * rtA * rtA + b.invInertia * rtB * rtB;
      p.massT = kt > EPS ? 1 / kt : 0;

      var pen = -p.sep;
      p.bias = BIAS * invDt * Math.max(0, pen - SLOP);

      var dvx = (b.vx - b.av * p.rby) - (a.vx - a.av * p.ray);
      var dvy = (b.vy + b.av * p.rbx) - (a.vy + a.av * p.rax);
      var vn = dvx * n.x + dvy * n.y;
      p.targetVn = vn < -REST_THRESHOLD ? -this.restitution * vn : 0;
      if (vn < this.approach) this.approach = vn;
    }
  };

  Arbiter.prototype.warmStart = function () {
    var a = this.a, b = this.b, n = this.normal;
    var tx = -n.y, ty = n.x;
    for (var i = 0; i < this.count; i++) {
      var p = this.points[i];
      var px = p.pn * n.x + p.pt * tx;
      var py = p.pn * n.y + p.pt * ty;
      a.vx -= px * a.invMass; a.vy -= py * a.invMass;
      a.av -= (p.rax * py - p.ray * px) * a.invInertia;
      b.vx += px * b.invMass; b.vy += py * b.invMass;
      b.av += (p.rbx * py - p.rby * px) * b.invInertia;
    }
  };

  Arbiter.prototype.solve = function () {
    var a = this.a, b = this.b, n = this.normal;
    var tx = -n.y, ty = n.x;
    for (var i = 0; i < this.count; i++) {
      var p = this.points[i];

      var dvx = (b.vx - b.av * p.rby) - (a.vx - a.av * p.ray);
      var dvy = (b.vy + b.av * p.rbx) - (a.vy + a.av * p.rax);
      var vn = dvx * n.x + dvy * n.y;
      var dPn = p.massN * (-vn + p.targetVn + p.bias);
      var newPn = Math.max(p.pn + dPn, 0);
      dPn = newPn - p.pn;
      p.pn = newPn;

      var nx = dPn * n.x, ny = dPn * n.y;
      a.vx -= nx * a.invMass; a.vy -= ny * a.invMass;
      a.av -= (p.rax * ny - p.ray * nx) * a.invInertia;
      b.vx += nx * b.invMass; b.vy += ny * b.invMass;
      b.av += (p.rbx * ny - p.rby * nx) * b.invInertia;

      dvx = (b.vx - b.av * p.rby) - (a.vx - a.av * p.ray);
      dvy = (b.vy + b.av * p.rbx) - (a.vy + a.av * p.rax);
      var vt = dvx * tx + dvy * ty;
      var dPt = p.massT * (-vt);
      var maxPt = this.friction * p.pn;
      var newPt = clamp(p.pt + dPt, -maxPt, maxPt);
      dPt = newPt - p.pt;
      p.pt = newPt;

      var fx = dPt * tx, fy = dPt * ty;
      a.vx -= fx * a.invMass; a.vy -= fy * a.invMass;
      a.av -= (p.rax * fy - p.ray * fx) * a.invInertia;
      b.vx += fx * b.invMass; b.vy += fy * b.invMass;
      b.av += (p.rbx * fy - p.rby * fx) * b.invInertia;
    }
  };

  // -------------------------------------------------------------- World ----

  function World(o) {
    o = o || {};
    this.bodies = [];
    this.gravity = o.gravity != null ? o.gravity : 1800;
    this.iterations = o.iterations != null ? o.iterations : 10;
    this.impactThreshold = o.impactThreshold != null ? o.impactThreshold : 62;
    this.onImpact = null;
    this.arbiters = new Map();
    this._m = { count: 0, normal: { x: 0, y: 0 }, points: [{ x: 0, y: 0, sep: 0 }, { x: 0, y: 0, sep: 0 }] };
    this._impacts = [];
    this._dirty = false;
  }

  World.prototype.add = function (body) {
    this.bodies.push(body);
    return body;
  };

  World.prototype.create = function (opts) {
    return this.add(new Body(opts));
  };

  World.prototype.remove = function (body) {
    body.removed = true;
    this._dirty = true;
  };

  World.prototype.clear = function () {
    this.bodies.length = 0;
    this.arbiters.clear();
    this._impacts.length = 0;
    this._dirty = false;
  };

  World.prototype.wakeArea = function (x, y, r) {
    var r2 = r * r;
    for (var i = 0; i < this.bodies.length; i++) {
      var b = this.bodies[i];
      if (b.isStatic || b.removed) continue;
      var dx = b.x - x, dy = b.y - y;
      if (dx * dx + dy * dy <= r2) b.wake();
    }
  };

  World.prototype.queryRadius = function (x, y, r) {
    var out = [], r2 = r * r;
    for (var i = 0; i < this.bodies.length; i++) {
      var b = this.bodies[i];
      if (b.removed) continue;
      var dx = b.x - x, dy = b.y - y;
      if (dx * dx + dy * dy <= r2) out.push(b);
    }
    return out;
  };

  World.prototype._pairKey = function (a, b) {
    return a.id < b.id ? a.id * 100000 + b.id : b.id * 100000 + a.id;
  };

  World.prototype._cleanup = function () {
    if (!this._dirty) return;
    var kept = [];
    for (var i = 0; i < this.bodies.length; i++) {
      if (!this.bodies[i].removed) kept.push(this.bodies[i]);
    }
    this.bodies = kept;
    var self = this;
    var dead = [];
    this.arbiters.forEach(function (arb, key) {
      if (arb.a.removed || arb.b.removed) dead.push(key);
    });
    for (var k = 0; k < dead.length; k++) self.arbiters.delete(dead[k]);
    this._dirty = false;
  };

  World.prototype.step = function (dt) {
    if (dt <= 0) return;
    this._cleanup();

    var bodies = this.bodies, i, b;
    var invDt = 1 / dt;

    // 1) 速度积分
    for (i = 0; i < bodies.length; i++) {
      b = bodies[i];
      if (b.isStatic || !b.awake) continue;
      b.vy += this.gravity * b.gravityScale * dt;
      var ld = 1 / (1 + dt * b.linearDamping);
      var ad = 1 / (1 + dt * b.angularDamping);
      b.vx *= ld; b.vy *= ld; b.av *= ad;
    }

    // 2) 碰撞检测（O(n^2) AABB 粗筛，体量小足够）
    var arbiters = this.arbiters;
    arbiters.forEach(function (arb) { arb.touched = false; });

    var m = this._m;
    for (i = 0; i < bodies.length; i++) {
      var A = bodies[i];
      for (var j = i + 1; j < bodies.length; j++) {
        var B = bodies[j];
        if (A.isStatic && B.isStatic) continue;
        var aSleep = A.isStatic || !A.awake;
        var bSleep = B.isStatic || !B.awake;
        if (aSleep && bSleep) continue;
        if (A.maxx < B.minx || B.maxx < A.minx || A.maxy < B.miny || B.maxy < A.miny) continue;

        m.count = 0;
        if (!collide(A, B, m)) continue;

        // 唤醒：仅当对侧确实在动，避免静止堆叠反复唤醒
        if (!A.awake && !A.isStatic && (B.isStatic ? false : B.speed() > WAKE_SPEED)) A.wake();
        if (!B.awake && !B.isStatic && (A.isStatic ? false : A.speed() > WAKE_SPEED)) B.wake();

        var key = this._pairKey(A, B);
        var arb = arbiters.get(key);
        if (!arb) {
          arb = new Arbiter(A, B);
          arb.merge(m);
          arb.isNew = true;
          arbiters.set(key, arb);
        } else {
          arb.merge(m);
          arb.isNew = false;
        }
        arb.touched = true;
      }
    }

    var dead = [];
    arbiters.forEach(function (arb, key) { if (!arb.touched) dead.push(key); });
    for (i = 0; i < dead.length; i++) arbiters.delete(dead[i]);

    // 3) 求解
    var list = [];
    arbiters.forEach(function (arb) { list.push(arb); });
    for (i = 0; i < list.length; i++) list[i].preStep(invDt);
    for (i = 0; i < list.length; i++) list[i].warmStart();
    for (var it = 0; it < this.iterations; it++) {
      for (i = 0; i < list.length; i++) list[i].solve();
    }

    // 4) 位置积分
    for (i = 0; i < bodies.length; i++) {
      b = bodies[i];
      if (b.isStatic || !b.awake) continue;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.angle += b.av * dt;
      b.sync();
    }

    // 5) 休眠管理
    for (i = 0; i < bodies.length; i++) {
      b = bodies[i];
      if (b.isStatic || !b.awake) continue;
      if (!b.allowSleep) continue;
      if (Math.abs(b.vx) < SLEEP_LIN && Math.abs(b.vy) < SLEEP_LIN && Math.abs(b.av) < SLEEP_ANG) {
        b.sleepTimer += dt;
        if (b.sleepTimer > SLEEP_TIME) {
          b.awake = false;
          b.vx = 0; b.vy = 0; b.av = 0;
        }
      } else {
        b.sleepTimer = 0;
      }
    }

    // 6) 冲击回调（只在新接触时触发，避免持续挤压刷伤害）
    if (this.onImpact) {
      var impacts = this._impacts;
      impacts.length = 0;
      var thr = this.impactThreshold;
      arbiters.forEach(function (arb) {
        if (!arb.isNew || arb.count === 0) return;
        var speed = -arb.approach;
        if (speed < thr) return;
        impacts.push({
          a: arb.a, b: arb.b, speed: speed,
          x: arb.points[0].x, y: arb.points[0].y,
          nx: arb.normal.x, ny: arb.normal.y
        });
      });
      for (i = 0; i < impacts.length; i++) {
        var im = impacts[i];
        if (im.a.removed || im.b.removed) continue;
        this.onImpact(im);
      }
    }
  };

  global.SlingPhysics = {
    Body: Body,
    World: World,
    rectVerts: rectVerts,
    clamp: clamp
  };
})(window);
