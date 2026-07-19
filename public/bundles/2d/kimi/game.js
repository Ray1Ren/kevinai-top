/* ============================================================
 * Sling Siege · 弹弓攻城
 * 原创弹弓物理小游戏 —— 原生 JS + Canvas + Web Audio，零依赖零联网
 * 世界观：橡果工坊的投石手用「星火石」轰击齿轮哨兵搭建的废铁堡垒
 * ============================================================ */
(function () {
'use strict';

/* ---------------- 常量配置 ---------------- */
var WORLD_W = 1280;
var WORLD_H = 720;
var IS_EN = new URLSearchParams(window.location.search).get('lang') === 'en';
var GROUND_Y = 640;              // 地面表面 y
var GRAVITY = 1500;              // px/s^2
var FIXED_DT = 1 / 120;          // 物理固定步长
var POWER = 7.2;                 // 拉力 -> 初速度系数
var MAX_PULL = 170;              // 最大拉伸距离 px
var SLING_X = 205;               // 弹弓位置
var SLING_Y = GROUND_Y - 118;    // 皮兜静止位置
var FORK_TOP_Y = GROUND_Y - 132;
var PROJECTILE_R = 16;
var ABILITY_RADIUS = 150;        // 雷霆震荡半径
var MAX_PARTICLES = 420;
var RESTITUTION_VEL = 55;        // 低于该法向接近速度不产生弹性

var STORE_KEY_HS = 'slingsiege_highscore_v1';
var STORE_KEY_UNLOCK = 'slingsiege_unlocked_v1';
var STORE_KEY_MUTE = 'slingsiege_muted_v1';

/* ---------------- 小工具 ---------------- */
function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
function lerp(a, b, t) { return a + (b - a) * t; }
function rand(a, b) { return a + Math.random() * (b - a); }
function randInt(a, b) { return Math.floor(rand(a, b + 1)); }
function dist2(x1, y1, x2, y2) { var dx = x2 - x1, dy = y2 - y1; return dx * dx + dy * dy; }

var Storage = {
  get: function (key, defVal) {
    try {
      var v = window.localStorage.getItem(key);
      return v === null ? defVal : JSON.parse(v);
    } catch (e) { return defVal; }
  },
  set: function (key, val) {
    try { window.localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* 私密模式等场景静默 */ }
  }
};

/* ---------------- 程序化音效（Web Audio） ---------------- */
var Sound = (function () {
  var ctx = null;
  var master = null;
  var muted = !!Storage.get(STORE_KEY_MUTE, false);

  function ensure() {
    if (ctx) return true;
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
    } catch (e) { ctx = null; return false; }
    return true;
  }

  function resume() {
    if (!ensure()) return;
    if (ctx.state === 'suspended') { ctx.resume(); }
  }

  function now() { return ctx.currentTime; }

  // 基础：单音
  function tone(opt) {
    if (muted || !ensure()) return;
    var t0 = now() + (opt.delay || 0);
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.type = opt.type || 'sine';
    osc.frequency.setValueAtTime(opt.freq || 440, t0);
    if (opt.freqEnd) osc.frequency.exponentialRampToValueAtTime(Math.max(1, opt.freqEnd), t0 + (opt.dur || 0.2));
    var vol = opt.vol || 0.3;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + (opt.attack || 0.005));
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + (opt.dur || 0.2));
    osc.connect(gain); gain.connect(master);
    osc.start(t0); osc.stop(t0 + (opt.dur || 0.2) + 0.05);
  }

  // 基础：噪声
  function noise(opt) {
    if (muted || !ensure()) return;
    var t0 = now() + (opt.delay || 0);
    var dur = opt.dur || 0.2;
    var len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var data = buf.getChannelData(0);
    for (var i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    var src = ctx.createBufferSource();
    src.buffer = buf;
    var filter = ctx.createBiquadFilter();
    filter.type = opt.filterType || 'bandpass';
    filter.frequency.setValueAtTime(opt.freq || 800, t0);
    if (opt.freqEnd) filter.frequency.exponentialRampToValueAtTime(Math.max(20, opt.freqEnd), t0 + dur);
    filter.Q.value = opt.q || 0.8;
    var gain = ctx.createGain();
    var vol = opt.vol || 0.3;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + (opt.attack || 0.004));
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter); filter.connect(gain); gain.connect(master);
    src.start(t0); src.stop(t0 + dur + 0.02);
  }

  return {
    resume: resume,
    isMuted: function () { return muted; },
    toggleMute: function () {
      muted = !muted;
      Storage.set(STORE_KEY_MUTE, muted);
      return muted;
    },
    click: function () { tone({ type: 'triangle', freq: 620, freqEnd: 880, dur: 0.07, vol: 0.18 }); },
    stretch: function (ratio) {
      tone({ type: 'sawtooth', freq: 60 + ratio * 50, dur: 0.05, vol: 0.05 });
    },
    launch: function () {
      noise({ dur: 0.28, freq: 500, freqEnd: 2400, vol: 0.35, q: 1.2 });
      tone({ type: 'triangle', freq: 180, freqEnd: 520, dur: 0.18, vol: 0.22 });
    },
    thud: function (s) {
      var v = clamp(s, 0.1, 1);
      tone({ type: 'sine', freq: 120, freqEnd: 45, dur: 0.16 + v * 0.1, vol: 0.4 * v });
      noise({ dur: 0.1, freq: 300, vol: 0.25 * v, filterType: 'lowpass' });
    },
    crack: function (s) { // 木头碎裂
      var v = clamp(s, 0.15, 1);
      noise({ dur: 0.09, freq: 1800, vol: 0.35 * v, q: 0.6 });
      noise({ dur: 0.16, freq: 700, vol: 0.3 * v, delay: 0.03 });
      tone({ type: 'square', freq: 220, freqEnd: 90, dur: 0.1, vol: 0.14 * v });
    },
    stone: function (s) { // 石头撞击
      var v = clamp(s, 0.15, 1);
      noise({ dur: 0.12, freq: 420, vol: 0.4 * v, filterType: 'lowpass' });
      tone({ type: 'sine', freq: 95, freqEnd: 50, dur: 0.14, vol: 0.3 * v });
      tone({ type: 'triangle', freq: 1400, freqEnd: 900, dur: 0.04, vol: 0.1 * v });
    },
    clank: function () { // 金属哨兵受击
      tone({ type: 'square', freq: 1180, freqEnd: 700, dur: 0.08, vol: 0.16 });
      tone({ type: 'square', freq: 1770, freqEnd: 1100, dur: 0.1, vol: 0.1, delay: 0.015 });
      noise({ dur: 0.06, freq: 3200, vol: 0.12, q: 2 });
    },
    robotDie: function () { // 哨兵报废：下落哨音 + 弹簧
      tone({ type: 'square', freq: 900, freqEnd: 160, dur: 0.35, vol: 0.22 });
      tone({ type: 'triangle', freq: 200, freqEnd: 800, dur: 0.3, vol: 0.18, delay: 0.1 });
      noise({ dur: 0.25, freq: 900, freqEnd: 250, vol: 0.2, delay: 0.05 });
    },
    ability: function () { // 雷霆震荡
      tone({ type: 'sawtooth', freq: 220, freqEnd: 60, dur: 0.5, vol: 0.3 });
      tone({ type: 'sine', freq: 70, freqEnd: 38, dur: 0.55, vol: 0.42 });
      noise({ dur: 0.45, freq: 2500, freqEnd: 300, vol: 0.3 });
      tone({ type: 'triangle', freq: 1500, freqEnd: 2600, dur: 0.18, vol: 0.12 });
    },
    pop: function () { tone({ type: 'triangle', freq: 520, freqEnd: 980, dur: 0.12, vol: 0.2 }); },
    win: function () {
      var notes = [523, 659, 784, 1047, 784, 1047];
      for (var i = 0; i < notes.length; i++) {
        tone({ type: 'triangle', freq: notes[i], dur: 0.22, vol: 0.24, delay: i * 0.11 });
      }
      noise({ dur: 0.5, freq: 4000, vol: 0.06, delay: 0.3, q: 0.4 });
    },
    lose: function () {
      var notes = [392, 330, 262, 196];
      for (var i = 0; i < notes.length; i++) {
        tone({ type: 'sawtooth', freq: notes[i], dur: 0.34, vol: 0.16, delay: i * 0.22 });
      }
    },
    denied: function () { tone({ type: 'square', freq: 180, dur: 0.08, vol: 0.1 }); }
  };
})();

/* ============================================================
 * 迷你刚体物理引擎
 * 圆（发射物/哨兵）+ 有向盒（木/石块、地面）
 * 顺序冲量求解 + 摩擦 + 位置校正 + 休眠
 * ============================================================ */
var Phys = (function () {

  var nextBodyId = 1;

  function makeBody(opt) {
    var b = {
      id: nextBodyId++,
      kind: opt.kind || 'block',      // block | guard | projectile | ground
      shape: opt.shape || 'box',      // box | circle
      x: opt.x, y: opt.y,
      vx: 0, vy: 0,
      angle: opt.angle || 0, av: 0,
      w: opt.w || 0, h: opt.h || 0,   // box 尺寸
      r: opt.r || 0,                  // circle 半径
      restitution: opt.restitution != null ? opt.restitution : 0.08,
      friction: opt.friction != null ? opt.friction : 0.6,
      isStatic: !!opt.isStatic,
      hp: opt.hp || 1, maxHp: opt.hp || 1,
      mat: opt.mat || 'wood',         // wood | stone | metal | ember
      dead: false,
      sleepTime: 0, sleeping: false,
      grounded: false,
      lastImpact: 0                   // 本步受到的最大冲击（用于伤害/音效）
    };
    if (b.isStatic) {
      b.mass = 0; b.invMass = 0; b.inertia = 0; b.invInertia = 0;
    } else {
      b.mass = opt.mass || 1;
      b.invMass = 1 / b.mass;
      if (b.shape === 'circle') {
        b.inertia = 0.5 * b.mass * b.r * b.r;
      } else {
        b.inertia = b.mass * (b.w * b.w + b.h * b.h) / 12;
      }
      b.invInertia = 1 / b.inertia;
    }
    return b;
  }

  /* ---------- 形状辅助 ---------- */
  function boxCorners(b) {
    var c = Math.cos(b.angle), s = Math.sin(b.angle);
    var hw = b.w / 2, hh = b.h / 2;
    return [
      { x: b.x + c * hw - s * hh, y: b.y + s * hw + c * hh },
      { x: b.x - c * hw - s * hh, y: b.y - s * hw + c * hh },
      { x: b.x - c * hw + s * hh, y: b.y - s * hw - c * hh },
      { x: b.x + c * hw + s * hh, y: b.y + s * hw - c * hh }
    ];
  }

  function boxAxes(b) {
    var c = Math.cos(b.angle), s = Math.sin(b.angle);
    return [{ x: c, y: s }, { x: -s, y: c }];
  }

  // 点是否在 OBB 内
  function pointInBox(b, px, py) {
    var dx = px - b.x, dy = py - b.y;
    var c = Math.cos(b.angle), s = Math.sin(b.angle);
    var lx = c * dx + s * dy;
    var ly = -s * dx + c * dy;
    return Math.abs(lx) <= b.w / 2 && Math.abs(ly) <= b.h / 2;
  }

  /* ---------- 碰撞检测：返回 contact 数组 ---------- */
  // contact: { a, b, px, py, nx, ny, pen }  法线 n 由 a 指向 b

  function circleVsCircle(a, b) {
    var dx = b.x - a.x, dy = b.y - a.y;
    var rr = a.r + b.r;
    var d2 = dx * dx + dy * dy;
    if (d2 >= rr * rr) return null;
    var d = Math.sqrt(d2) || 0.0001;
    var nx = dx / d, ny = dy / d;
    return [{
      a: a, b: b,
      nx: nx, ny: ny,
      pen: rr - d,
      px: a.x + nx * (a.r - (rr - d) / 2),
      py: a.y + ny * (a.r - (rr - d) / 2)
    }];
  }

  // circle a vs box b
  function circleVsBox(a, b) {
    var c = Math.cos(b.angle), s = Math.sin(b.angle);
    var dx = a.x - b.x, dy = a.y - b.y;
    var lx = c * dx + s * dy;   // 圆心在盒局部坐标
    var ly = -s * dx + c * dy;
    var hw = b.w / 2, hh = b.h / 2;
    var qx = clamp(lx, -hw, hw);
    var qy = clamp(ly, -hh, hh);
    var ddx = lx - qx, ddy = ly - qy;
    var d2 = ddx * ddx + ddy * ddy;
    var nx, ny, pen, px, py;
    if (d2 > 1e-9) {
      if (d2 >= a.r * a.r) return null;
      var d = Math.sqrt(d2);
      var lnx = ddx / d, lny = ddy / d;   // 局部法线：盒 -> 圆
      // 转回世界；contact 法线需从 b(盒) 指向 a(圆)，调用方会按 a/b 顺序调整
      nx = c * lnx - s * lny;
      ny = s * lnx + c * lny;
      pen = a.r - d;
      px = b.x + c * qx - s * qy;
      py = b.y + s * qx + c * qy;
      return [{ a: a, b: b, nx: nx, ny: ny, pen: pen, px: px, py: py, nFromBoxToCircle: true }];
    }
    // 圆心陷入盒内：沿最小穿透轴推出
    var pushX = hw - Math.abs(lx);
    var pushY = hh - Math.abs(ly);
    var lnx2, lny2, pen2;
    if (pushX < pushY) { lnx2 = lx >= 0 ? 1 : -1; lny2 = 0; pen2 = pushX + a.r; }
    else { lnx2 = 0; lny2 = ly >= 0 ? 1 : -1; pen2 = pushY + a.r; }
    nx = c * lnx2 - s * lny2;
    ny = s * lnx2 + c * lny2;
    return [{ a: a, b: b, nx: nx, ny: ny, pen: pen2, px: a.x - nx * a.r * 0.5, py: a.y - ny * a.r * 0.5, nFromBoxToCircle: true }];
  }

  // OBB vs OBB：SAT + 参考面裁剪（最多 2 个接触点）
  function boxVsBox(a, b) {
    var axesA = boxAxes(a), axesB = boxAxes(b);
    var dx = b.x - a.x, dy = b.y - a.y;
    var best = { pen: Infinity, nx: 0, ny: 0, refIsA: true };
    var i, axis, d, rA, rB, pen;

    for (i = 0; i < 2; i++) {
      axis = axesA[i];
      d = dx * axis.x + dy * axis.y;
      rA = (i === 0 ? a.w : a.h) / 2;
      rB = b.w / 2 * Math.abs(axis.x * axesB[0].x + axis.y * axesB[0].y) +
           b.h / 2 * Math.abs(axis.x * axesB[1].x + axis.y * axesB[1].y);
      pen = rA + rB - Math.abs(d);
      if (pen < 0) return null;
      if (pen < best.pen) {
        var sign = d >= 0 ? 1 : -1;
        best = { pen: pen, nx: axis.x * sign, ny: axis.y * sign, refIsA: true, axisIndex: i };
      }
    }
    for (i = 0; i < 2; i++) {
      axis = axesB[i];
      d = dx * axis.x + dy * axis.y;
      rB = (i === 0 ? b.w : b.h) / 2;
      rA = a.w / 2 * Math.abs(axis.x * axesA[0].x + axis.y * axesA[0].y) +
           a.h / 2 * Math.abs(axis.x * axesA[1].x + axis.y * axesA[1].y);
      pen = rA + rB - Math.abs(d);
      if (pen < 0) return null;
      // 微小偏好让参考面稳定，减少抖动
      if (pen < best.pen - 0.05) {
        var sign2 = d >= 0 ? 1 : -1;
        best = { pen: pen, nx: axis.x * sign2, ny: axis.y * sign2, refIsA: false, axisIndex: i };
      }
    }

    var nx = best.nx, ny = best.ny;
    var ref = best.refIsA ? a : b;
    var inc = best.refIsA ? b : a;
    // nr：由 ref 指向 inc 的面法线（contact 的 n 必须保持 a->b 方向）
    var nrx = best.refIsA ? nx : -nx;
    var nry = best.refIsA ? ny : -ny;

    // 参考面：ref 上与 nr 对齐的面
    var refAxes = boxAxes(ref);
    var axisIdx = best.refIsA ? best.axisIndex : best.axisIndex;
    var rawAxis = refAxes[axisIdx];
    var axisSign = (rawAxis.x * nrx + rawAxis.y * nry) >= 0 ? 1 : -1;
    var halfMain = (axisIdx === 0 ? ref.w : ref.h) / 2;
    var tan = refAxes[1 - axisIdx];               // 参考面切向
    var halfTan = (axisIdx === 0 ? ref.h : ref.w) / 2;
    var fcx = ref.x + rawAxis.x * axisSign * halfMain;   // 参考面中心
    var fcy = ref.y + rawAxis.y * axisSign * halfMain;
    // 侧平面顶点
    var v1x = fcx + tan.x * halfTan, v1y = fcy + tan.y * halfTan;
    var v2x = fcx - tan.x * halfTan, v2y = fcy - tan.y * halfTan;

    // 入射面：inc 上与 nr 最反向的面
    var incAxes = boxAxes(inc);
    var bestDot = Infinity, incAxisIdx = 0, incSign = 1;
    for (i = 0; i < 2; i++) {
      var dPos = incAxes[i].x * nrx + incAxes[i].y * nry;
      if (dPos < bestDot) { bestDot = dPos; incAxisIdx = i; incSign = 1; }
      if (-dPos < bestDot) { bestDot = -dPos; incAxisIdx = i; incSign = -1; }
    }
    var incAxis = incAxes[incAxisIdx];
    var incHalfMain = (incAxisIdx === 0 ? inc.w : inc.h) / 2;
    var incTan = incAxes[1 - incAxisIdx];
    var incHalfTan = (incAxisIdx === 0 ? inc.h : inc.w) / 2;
    var icx = inc.x + incAxis.x * incSign * incHalfMain;
    var icy = inc.y + incAxis.y * incSign * incHalfMain;
    var seg = [
      { x: icx + incTan.x * incHalfTan, y: icy + incTan.y * incHalfTan },
      { x: icx - incTan.x * incHalfTan, y: icy - incTan.y * incHalfTan }
    ];

    // 用参考面两侧平面裁剪入射线段（保留位于两侧平面之间的点）
    function clipSegment(pts, cnx, cny, px, py) {
      // 保留 dot(n, X - P) >= 0 的部分
      if (pts.length === 1) {
        var dd = cnx * (pts[0].x - px) + cny * (pts[0].y - py);
        return dd >= 0 ? pts : [];
      }
      var out = [];
      var d0 = cnx * (pts[0].x - px) + cny * (pts[0].y - py);
      var d1 = cnx * (pts[1].x - px) + cny * (pts[1].y - py);
      if (d0 >= 0) out.push(pts[0]);
      if (d1 >= 0) out.push(pts[1]);
      if (d0 * d1 < 0) {
        var t = d0 / (d0 - d1);
        out.push({ x: pts[0].x + t * (pts[1].x - pts[0].x), y: pts[0].y + t * (pts[1].y - pts[0].y) });
      }
      return out;
    }
    var clipped = clipSegment(seg, -tan.x, -tan.y, v1x, v1y);
    if (clipped.length > 0) clipped = clipSegment(clipped, tan.x, tan.y, v2x, v2y);

    var contacts = [];
    for (i = 0; i < clipped.length; i++) {
      var p = clipped[i];
      var sep = nrx * (p.x - fcx) + nry * (p.y - fcy);   // <=0 表示穿透
      if (sep <= 0.5) {
        contacts.push({
          a: a, b: b, nx: nx, ny: ny,
          pen: Math.max(0, -sep),
          px: p.x - nrx * sep * 0.5, py: p.y - nry * sep * 0.5
        });
      }
    }
    if (contacts.length === 0) {
      // 退化情形（几乎不会触发）：小穿透中心点，限制冲击
      contacts.push({
        a: a, b: b, nx: nx, ny: ny, pen: Math.min(best.pen, 1),
        px: (a.x + b.x) / 2, py: (a.y + b.y) / 2
      });
    }
    return contacts;
  }

  function detect(a, b) {
    if (a.isStatic && b.isStatic) return null;
    var cs = null;
    if (a.shape === 'circle' && b.shape === 'circle') {
      cs = circleVsCircle(a, b);
    } else if (a.shape === 'circle' && b.shape === 'box') {
      cs = circleVsBox(a, b);
      if (cs) { // 法线当前是 盒->圆，即 b->a，翻转为 a->b
        for (var i = 0; i < cs.length; i++) { cs[i].nx = -cs[i].nx; cs[i].ny = -cs[i].ny; }
      }
    } else if (a.shape === 'box' && b.shape === 'circle') {
      cs = circleVsBox(b, a); // 法线 盒->圆 即 a->b，无需翻转
      if (cs) { // 但 circleVsBox 内部记录的 a/b 是 (圆, 盒)，需要换回外层顺序 (盒, 圆)
        for (var i = 0; i < cs.length; i++) { cs[i].a = a; cs[i].b = b; }
      }
    } else {
      cs = boxVsBox(a, b);
    }
    return cs;
  }

  /* ---------- 世界 ---------- */
  function World() {
    this.bodies = [];
    this.contacts = [];
    this.onImpact = null;   // (contact, impactSpeed) 回调，用于伤害与音效
  }

  World.prototype.add = function (b) { this.bodies.push(b); return b; };

  World.prototype.removeDead = function () {
    for (var i = this.bodies.length - 1; i >= 0; i--) {
      if (this.bodies[i].dead) this.bodies.splice(i, 1);
    }
  };

  World.prototype.wakeAll = function () {
    for (var i = 0; i < this.bodies.length; i++) {
      var b = this.bodies[i];
      if (b.sleeping) { b.sleeping = false; b.sleepTime = 0; }
    }
  };

  World.prototype.allQuiet = function () {
    for (var i = 0; i < this.bodies.length; i++) {
      var b = this.bodies[i];
      if (b.isStatic || b.dead || b.kind === 'projectile') continue;
      if (!b.sleeping) return false;
    }
    return true;
  };

  World.prototype.step = function (dt) {
    var bodies = this.bodies;
    var i, j, b;

    // 重置每步状态
    for (i = 0; i < bodies.length; i++) { bodies[i].lastImpact = 0; bodies[i].grounded = false; }

    // 重力 + 积分速度（休眠体跳过）
    for (i = 0; i < bodies.length; i++) {
      b = bodies[i];
      if (b.isStatic || b.sleeping || b.dead) continue;
      b.vy += GRAVITY * dt;
      // 空气阻力（极轻微，帮助收敛）
      b.vx *= (1 - 0.02 * dt);
      b.vy *= (1 - 0.02 * dt);
      b.av *= (1 - 0.1 * dt);
    }

    // 碰撞检测
    var contacts = [];
    for (i = 0; i < bodies.length; i++) {
      var a = bodies[i];
      if (a.dead) continue;
      for (j = i + 1; j < bodies.length; j++) {
        var bb = bodies[j];
        if (bb.dead) continue;
        if (a.isStatic && bb.isStatic) continue;
        if (a.sleeping && bb.sleeping) continue;
        // 粗略 AABB 排除
        var ra = a.shape === 'circle' ? a.r : Math.sqrt(a.w * a.w + a.h * a.h) / 2;
        var rb = bb.shape === 'circle' ? bb.r : Math.sqrt(bb.w * bb.w + bb.h * bb.h) / 2;
        if (dist2(a.x, a.y, bb.x, bb.y) > (ra + rb) * (ra + rb)) continue;
        var cs = detect(a, bb);
        if (cs) for (var k = 0; k < cs.length; k++) contacts.push(cs[k]);
      }
    }
    this.contacts = contacts;

    // 记录冲击（伤害/音效用），并唤醒被撞的休眠体
    for (i = 0; i < contacts.length; i++) {
      var c = contacts[i];
      var rvx = (c.b.vx + (-c.b.av) * 0) - c.a.vx;   // 简化：用质心速度
      var rvy = c.b.vy - c.a.vy;
      var vn = rvx * c.nx + rvy * c.ny;              // <0 表示接近
      var impact = Math.max(0, -vn);
      if (impact > c.a.lastImpact) c.a.lastImpact = impact;
      if (impact > c.b.lastImpact) c.b.lastImpact = impact;
      if (impact > 25) {
        if (c.a.sleeping) { c.a.sleeping = false; c.a.sleepTime = 0; }
        if (c.b.sleeping) { c.b.sleeping = false; c.b.sleepTime = 0; }
      }
      if (this.onImpact && impact > 1) this.onImpact(c, impact);
    }

    // 速度求解（顺序冲量）
    var solver = [];
    for (i = 0; i < contacts.length; i++) {
      var ct = contacts[i];
      var rax = ct.px - ct.a.x, ray = ct.py - ct.a.y;
      var rbx = ct.px - ct.b.x, rby = ct.py - ct.b.y;
      var ran = rax * ct.ny - ray * ct.nx;
      var rbn = rbx * ct.ny - rby * ct.nx;
      var kn = ct.a.invMass + ct.b.invMass + ct.a.invInertia * ran * ran + ct.b.invInertia * rbn * rbn;
      // 切向
      var tx = -ct.ny, ty = ct.nx;
      var rat = rax * ty - ray * tx;
      var rbt = rbx * ty - rby * tx;
      var kt = ct.a.invMass + ct.b.invMass + ct.a.invInertia * rat * rat + ct.b.invInertia * rbt * rbt;
      // 初速度求弹性目标
      var rvx2 = (ct.b.vx - ct.b.av * rby) - (ct.a.vx - ct.a.av * ray);
      var rvy2 = (ct.b.vy + ct.b.av * rbx) - (ct.a.vy + ct.a.av * rax);
      var vn0 = rvx2 * ct.nx + rvy2 * ct.ny;
      var e = Math.min(ct.a.restitution, ct.b.restitution);
      var restBias = (vn0 < -RESTITUTION_VEL) ? -e * vn0 : 0;
      solver.push({
        c: ct, rax: rax, ray: ray, rbx: rbx, rby: rby,
        kn: kn > 0 ? 1 / kn : 0, kt: kt > 0 ? 1 / kt : 0,
        restBias: restBias, sumN: 0
      });
    }

    var ITER = 10;
    for (var it = 0; it < ITER; it++) {
      for (i = 0; i < solver.length; i++) {
        var s = solver[i];
        var cc = s.c;
        var A = cc.a, B = cc.b;
        // 法向
        var rvx3 = (B.vx - B.av * s.rby) - (A.vx - A.av * s.ray);
        var rvy3 = (B.vy + B.av * s.rbx) - (A.vy + A.av * s.rax);
        var vn = rvx3 * cc.nx + rvy3 * cc.ny;
        var lambda = s.kn * (-vn + s.restBias);
        var oldSum = s.sumN;
        s.sumN = Math.max(0, oldSum + lambda);
        lambda = s.sumN - oldSum;
        var Px = lambda * cc.nx, Py = lambda * cc.ny;
        if (!A.isStatic) {
          A.vx -= Px * A.invMass; A.vy -= Py * A.invMass;
          A.av -= A.invInertia * (s.rax * Py - s.ray * Px);
        }
        if (!B.isStatic) {
          B.vx += Px * B.invMass; B.vy += Py * B.invMass;
          B.av += B.invInertia * (s.rbx * Py - s.rby * Px);
        }
        // 切向摩擦
        var tx2 = -cc.ny, ty2 = cc.nx;
        var rvx4 = (B.vx - B.av * s.rby) - (A.vx - A.av * s.ray);
        var rvy4 = (B.vy + B.av * s.rbx) - (A.vy + A.av * s.rax);
        var vt = rvx4 * tx2 + rvy4 * ty2;
        var mu = Math.sqrt(cc.a.friction * cc.b.friction);
        var lt = s.kt * (-vt);
        var maxF = mu * s.sumN;
        lt = clamp(lt, -maxF, maxF);
        var Fx = lt * tx2, Fy = lt * ty2;
        if (!A.isStatic) {
          A.vx -= Fx * A.invMass; A.vy -= Fy * A.invMass;
          A.av -= A.invInertia * (s.rax * Fy - s.ray * Fx);
        }
        if (!B.isStatic) {
          B.vx += Fx * B.invMass; B.vy += Fy * B.invMass;
          B.av += B.invInertia * (s.rbx * Fy - s.rby * Fx);
        }
      }
    }

    // 积分位置 + 地面标记
    for (i = 0; i < bodies.length; i++) {
      b = bodies[i];
      if (b.isStatic || b.sleeping || b.dead) continue;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.angle += b.av * dt;
      // NaN 防御
      if (!isFinite(b.x) || !isFinite(b.y) || !isFinite(b.angle)) {
        b.x = clamp(b.x || WORLD_W / 2, 0, WORLD_W);
        b.y = clamp(b.y || WORLD_H / 2, -500, WORLD_H);
        b.vx = 0; b.vy = 0; b.av = 0; b.angle = 0;
      }
    }

    // 位置校正（线性投影，2 轮）
    for (var pass = 0; pass < 2; pass++) {
      for (i = 0; i < contacts.length; i++) {
        var cp = contacts[i];
        var A2 = cp.a, B2 = cp.b;
        if (A2.dead || B2.dead) continue;
        var penNow = cp.pen;
        if (penNow <= 0.4) continue;
        var totalInv = A2.invMass + B2.invMass;
        if (totalInv <= 0) continue;
        var corr = Math.max(0, penNow - 0.4) * 0.42 / totalInv;
        if (!A2.isStatic && !A2.sleeping) { A2.x -= cp.nx * corr * A2.invMass; A2.y -= cp.ny * corr * A2.invMass; }
        if (!B2.isStatic && !B2.sleeping) { B2.x += cp.nx * corr * B2.invMass; B2.y += cp.ny * corr * B2.invMass; }
      }
    }

    // 标记着地 & 休眠
    for (i = 0; i < contacts.length; i++) {
      var g = contacts[i];
      markGrounded(g.a, g.b, g.nx, g.ny);
      markGrounded(g.b, g.a, -g.nx, -g.ny);
    }
    for (i = 0; i < bodies.length; i++) {
      b = bodies[i];
      if (b.isStatic || b.dead || b.kind === 'projectile') continue;
      if (b.sleeping) continue;
      var sp2 = b.vx * b.vx + b.vy * b.vy;
      if (sp2 < 100 && Math.abs(b.av) < 0.25) {
        b.sleepTime += dt;
        if (b.sleepTime > 0.45) {
          b.sleeping = true;
          b.vx = 0; b.vy = 0; b.av = 0;
        }
      } else {
        b.sleepTime = 0;
      }
    }
  };

  function markGrounded(body, other, nx, ny) {
    // 法线从 other 指向 body，若朝上则认为 body 被支撑
    if (ny < -0.45 && other.kind === 'ground') body.grounded = true;
  }

  return {
    makeBody: makeBody,
    World: World,
    boxCorners: boxCorners
  };
})();

/* ============================================================
 * 关卡数据 —— 三个布局实质不同的堡垒
 * 坐标为逻辑坐标（1280×720），y 为块中心
 * ============================================================ */
function wood(x, y, w, h, angle) {
  return { kind: 'block', shape: 'box', mat: 'wood', x: x, y: y, w: w, h: h, angle: angle || 0, hp: 70, density: 0.0016, restitution: 0.06, friction: 0.62 };
}
function stone(x, y, w, h, angle) {
  return { kind: 'block', shape: 'box', mat: 'stone', x: x, y: y, w: w, h: h, angle: angle || 0, hp: 190, density: 0.0032, restitution: 0.04, friction: 0.7 };
}
function crate(x, y, size) {
  return { kind: 'block', shape: 'box', mat: 'wood', x: x, y: y, w: size, h: size, angle: 0, hp: 85, density: 0.0018, restitution: 0.06, friction: 0.6, crate: true };
}
function guard(x, y) {
  return { kind: 'guard', shape: 'circle', mat: 'metal', x: x, y: y, r: 22, hp: 100, mass: 6, restitution: 0.25, friction: 0.55 };
}

var LEVELS = [
  {
    name: IS_EN ? 'Timber Outpost' : '木栅哨站',
    shots: 3,
    hint: IS_EN ? 'Hit it head-on or lift the roof' : '直接轰，或者掀了屋顶',
    build: function () {
      var g = GROUND_Y;
      return [
        // 矮木墙 ×2 + 顶板（棚子）
        wood(905, g - 60, 20, 120),
        wood(1035, g - 60, 20, 120),
        wood(970, g - 130, 170, 20),
        // 哨兵：一个在墙前暴露，一个在棚下
        guard(845, g - 22),
        guard(970, g - 22)
      ];
    }
  },
  {
    name: IS_EN ? 'Twin-Tower Depot' : '双塔仓库',
    shots: 4,
    hint: IS_EN ? 'Break the timber tower first; mind the stone beam' : '先拆木塔，小心石梁',
    build: function () {
      var g = GROUND_Y;
      return [
        // 左木塔：两柱 + 板 + 箱 + 塔顶哨兵
        wood(800, g - 90, 20, 180),
        wood(880, g - 90, 20, 180),
        wood(840, g - 190, 130, 20),
        crate(840, g - 230, 60),
        guard(840, g - 282),
        // 中间地面哨兵
        guard(950, g - 22),
        // 右混合塔：石柱脚 + 木柱 + 石梁 + 木顶 + 双哨兵
        stone(1050, g - 35, 26, 70),
        stone(1160, g - 35, 26, 70),
        wood(1050, g - 125, 20, 110),
        wood(1160, g - 125, 20, 110),
        stone(1105, g - 192, 160, 24),
        wood(1105, g - 213, 100, 18),
        guard(1105, g - 22),
        guard(1105, g - 244)
      ];
    }
  },
  {
    name: IS_EN ? 'Stone Throne' : '石垒王座',
    shots: 4,
    hint: IS_EN ? 'The stone base is tough. Hit the timber beams or stun the guards' : '石基很硬，攻木梁或震晕他们',
    build: function () {
      var g = GROUND_Y;
      return [
        // 石基金字塔（下排 3 块，上排 2 块）
        stone(900, g - 30, 60, 60),
        stone(960, g - 30, 60, 60),
        stone(1020, g - 30, 60, 60),
        stone(930, g - 90, 60, 60),
        stone(990, g - 90, 60, 60),
        // 石堆顶上的哨兵
        guard(960, g - 142),
        // 木柱撑起平台
        wood(920, g - 190, 20, 140),
        wood(1000, g - 190, 20, 140),
        wood(960, g - 270, 210, 20),
        crate(905, g - 308, 55),
        crate(1015, g - 308, 55),
        guard(960, g - 302),
        // 顶层凉亭：立柱 + 顶板 + 哨兵
        wood(890, g - 335, 18, 110),
        wood(1030, g - 335, 18, 110),
        wood(960, g - 399, 200, 18),
        guard(960, g - 430),
        // 右侧独立瞭望塔
        stone(1150, g - 30, 70, 60),
        stone(1150, g - 95, 26, 70),
        wood(1150, g - 139, 90, 18),
        guard(1150, g - 170)
      ];
    }
  }
];

/* ============================================================
 * 粒子 / 飘字 / 震屏
 * ============================================================ */
var FX = (function () {
  var particles = [];
  var texts = [];
  var shake = { mag: 0, t: 0, dur: 0 };
  var rings = [];

  function add(p) {
    if (particles.length >= MAX_PARTICLES) particles.shift();
    particles.push(p);
  }

  function burst(x, y, n, opt) {
    for (var i = 0; i < n; i++) {
      var a = rand(0, Math.PI * 2);
      var sp = rand(opt.spMin || 40, opt.spMax || 220);
      add({
        x: x, y: y,
        vx: Math.cos(a) * sp + (opt.vx || 0),
        vy: Math.sin(a) * sp + (opt.vy || 0),
        life: rand(opt.lifeMin || 0.3, opt.lifeMax || 0.8),
        age: 0,
        size: rand(opt.sMin || 2, opt.sMax || 5),
        color: opt.colors[randInt(0, opt.colors.length - 1)],
        grav: opt.grav != null ? opt.grav : 900,
        drag: opt.drag != null ? opt.drag : 0.5,
        shape: opt.shape || 'rect',
        spin: rand(-6, 6),
        angle: rand(0, Math.PI * 2)
      });
    }
  }

  return {
    dust: function (x, y, n) {
      burst(x, y, n, { colors: ['#c9b58f', '#a8977a', '#8f8268'], spMin: 30, spMax: 140, lifeMin: 0.3, lifeMax: 0.7, sMin: 3, sMax: 7, shape: 'circle', grav: 250, drag: 2 });
    },
    wood: function (x, y, n, vx) {
      burst(x, y, n, { colors: ['#b07a3e', '#8a5a28', '#d09a52', '#6e451e'], spMin: 60, spMax: 320, vx: vx || 0, sMin: 2, sMax: 6, lifeMin: 0.4, lifeMax: 0.9 });
    },
    stone: function (x, y, n) {
      burst(x, y, n, { colors: ['#9aa0ad', '#7c8290', '#c0c6d2'], spMin: 50, spMax: 260, sMin: 2, sMax: 6, lifeMin: 0.35, lifeMax: 0.8 });
    },
    metal: function (x, y, n) {
      burst(x, y, n, { colors: ['#ffd35c', '#e8eef7', '#f7a84b', '#9fb2c8'], spMin: 80, spMax: 380, sMin: 2, sMax: 5, lifeMin: 0.4, lifeMax: 1.0, shape: 'circle', grav: 700 });
    },
    spark: function (x, y, vx, vy) {
      add({
        x: x + rand(-3, 3), y: y + rand(-3, 3),
        vx: vx * 0.05 + rand(-25, 25), vy: vy * 0.05 + rand(-25, 25),
        life: rand(0.2, 0.5), age: 0, size: rand(1.5, 3.5),
        color: Math.random() < 0.5 ? '#ffd35c' : '#ff9a3c',
        grav: 0, drag: 2, shape: 'circle', spin: 0, angle: 0
      });
    },
    confetti: function (x, y, n) {
      burst(x, y, n, { colors: ['#ffd35c', '#ff7a6b', '#7be3a8', '#7ab8ff', '#d79bff'], spMin: 120, spMax: 480, sMin: 3, sMax: 7, lifeMin: 0.8, lifeMax: 1.6, grav: 500, drag: 1 });
    },
    shockRing: function (x, y, r) {
      rings.push({ x: x, y: y, r: 10, maxR: r, age: 0, life: 0.45 });
    },
    text: function (x, y, str, color) {
      texts.push({ x: x, y: y, str: str, color: color || '#ffd35c', age: 0, life: 1.1 });
    },
    shake: function (mag, dur) {
      if (mag > shake.mag) { shake.mag = mag; shake.t = 0; shake.dur = dur; }
    },
    getShakeOffset: function () {
      if (shake.t >= shake.dur || shake.mag <= 0) return { x: 0, y: 0 };
      var k = 1 - shake.t / shake.dur;
      return { x: rand(-1, 1) * shake.mag * k, y: rand(-1, 1) * shake.mag * k };
    },
    update: function (dt) {
      var i;
      for (i = particles.length - 1; i >= 0; i--) {
        var p = particles[i];
        p.age += dt;
        if (p.age >= p.life) { particles.splice(i, 1); continue; }
        p.vy += p.grav * dt;
        p.vx *= (1 - p.drag * dt);
        p.vy *= (1 - p.drag * dt);
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.angle += p.spin * dt;
      }
      for (i = texts.length - 1; i >= 0; i--) {
        var t = texts[i];
        t.age += dt;
        t.y -= 45 * dt;
        if (t.age >= t.life) texts.splice(i, 1);
      }
      for (i = rings.length - 1; i >= 0; i--) {
        var rg = rings[i];
        rg.age += dt;
        rg.r = lerp(10, rg.maxR, 1 - Math.pow(1 - rg.age / rg.life, 2));
        if (rg.age >= rg.life) rings.splice(i, 1);
      }
      if (shake.mag > 0) {
        shake.t += dt;
        if (shake.t >= shake.dur) shake.mag = 0;
      }
    },
    render: function (ctx) {
      var i;
      for (i = 0; i < particles.length; i++) {
        var p = particles[i];
        var alpha = 1 - p.age / p.life;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        if (p.shape === 'circle') {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * (0.5 + alpha * 0.5), 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.angle);
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
          ctx.restore();
        }
      }
      ctx.globalAlpha = 1;
      for (i = 0; i < rings.length; i++) {
        var rg = rings[i];
        var a2 = 1 - rg.age / rg.life;
        ctx.globalAlpha = a2 * 0.9;
        ctx.strokeStyle = '#ffe9a0';
        ctx.lineWidth = 6 * a2 + 1;
        ctx.beginPath();
        ctx.arc(rg.x, rg.y, rg.r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = a2 * 0.35;
        ctx.strokeStyle = '#ffb13c';
        ctx.lineWidth = 14 * a2 + 2;
        ctx.beginPath();
        ctx.arc(rg.x, rg.y, rg.r * 0.85, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.textAlign = 'center';
      ctx.font = '900 22px "PingFang SC", "Microsoft YaHei", sans-serif';
      for (i = 0; i < texts.length; i++) {
        var t2 = texts[i];
        ctx.globalAlpha = 1 - t2.age / t2.life;
        ctx.strokeStyle = 'rgba(0,0,0,0.6)';
        ctx.lineWidth = 4;
        ctx.strokeText(t2.str, t2.x, t2.y);
        ctx.fillStyle = t2.color;
        ctx.fillText(t2.str, t2.x, t2.y);
      }
      ctx.globalAlpha = 1;
    },
    clear: function () {
      particles.length = 0;
      texts.length = 0;
      rings.length = 0;
      shake.mag = 0;
    }
  };
})();

/* ============================================================
 * 游戏主状态机
 * phase: menu | aim | flying | settling | win | lose | complete
 * ============================================================ */
var Game = (function () {
  var world = null;
  var groundBody = null;
  var phase = 'menu';
  var paused = false;
  var levelIndex = 0;            // 0-based
  var score = 0;
  var levelStartScore = 0;
  var shotsLeft = 0;
  var projectile = null;         // 当前发射物 body
  var abilityReady = false;      // 本次发射是否还能触发能力
  var abilityArmed = false;      // 触发后到落地前的标记（视觉强化）
  var pull = { x: 0, y: 0 };     // 当前拖拽向量（皮兜偏移）
  var aiming = false;
  var flightTimer = 0;           // 发射后的计时
  var settleTimer = 0;
  var phaseTimer = 0;            // 当前 phase 总时长（看门狗）
  var trail = [];                // 拖尾
  var banner = null;             // 关卡横幅 {title, hint, t}
  var unlocked = clamp(Storage.get(STORE_KEY_UNLOCK, 1), 1, LEVELS.length);
  var highScore = Storage.get(STORE_KEY_HS, 0);
  var lastStretchSfx = 0;
  var pouchPos = { x: SLING_X, y: SLING_Y };

  /* ---------- 构建世界 ---------- */
  function buildWorld(idx) {
    world = new Phys.World();
    world.onImpact = onImpact;
    groundBody = Phys.makeBody({
      kind: 'ground', shape: 'box', isStatic: true,
      x: WORLD_W / 2, y: GROUND_Y + 160, w: WORLD_W * 3, h: 320,
      friction: 0.85, restitution: 0.05, hp: 1e9
    });
    world.add(groundBody);
    var parts = LEVELS[idx].build();
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      var opt = {
        kind: p.kind, shape: p.shape, mat: p.mat,
        x: p.x, y: p.y, angle: p.angle,
        w: p.w, h: p.h, r: p.r,
        hp: p.hp, friction: p.friction, restitution: p.restitution,
        crate: p.crate
      };
      if (p.kind === 'block') opt.mass = p.w * p.h * p.density;
      if (p.kind === 'guard') opt.mass = p.mass;
      var b = Phys.makeBody(opt);
      b.crate = !!p.crate;
      world.add(b);
    }
    projectile = null;
    trail = [];
    FX.clear();
  }

  function bodiesOf(kind) {
    var out = [];
    if (!world) return out;
    for (var i = 0; i < world.bodies.length; i++) {
      var b = world.bodies[i];
      if (!b.dead && b.kind === kind) out.push(b);
    }
    return out;
  }

  function guardsLeft() {
    return bodiesOf('guard').length;
  }

  /* ---------- 关卡 / 回合流 ---------- */
  function loadLevel(idx, keepScore) {
    levelIndex = clamp(idx, 0, LEVELS.length - 1);
    if (!keepScore) { score = 0; }
    levelStartScore = score;
    shotsLeft = LEVELS[levelIndex].shots;
    pull.x = 0; pull.y = 0;
    aiming = false;
    abilityReady = false;
    abilityArmed = false;
    flightTimer = 0; settleTimer = 0; phaseTimer = 0;
    buildWorld(levelIndex);
    banner = { title: LEVELS[levelIndex].name, hint: LEVELS[levelIndex].hint, t: 0 };
    setPhase('aim');
    UI.sync();
  }

  function setPhase(p) {
    phase = p;
    phaseTimer = 0;
    UI.onPhase(p);
  }

  function startGame() {
    score = 0;
    loadLevel(0, true);
  }

  function restartLevel() {
    score = levelStartScore;
    loadLevel(levelIndex, true);
  }

  function nextLevel() {
    if (levelIndex + 1 >= LEVELS.length) {
      setPhase('complete');
      return;
    }
    loadLevel(levelIndex + 1, true);
  }

  function pause() {
    if (phase === 'menu' || phase === 'win' || phase === 'lose' || phase === 'complete') return;
    paused = true;
    UI.onPause(true);
  }

  function resume() {
    paused = false;
    UI.onPause(false);
  }

  /* ---------- 瞄准与发射 ---------- */
  function pouchRest() { return { x: SLING_X, y: SLING_Y }; }

  function currentPouch() {
    if (phase === 'aim') return { x: SLING_X + pull.x, y: SLING_Y + pull.y };
    return pouchPos;
  }

  function setAim(dx, dy) {
    if (phase !== 'aim') return false;
    var len = Math.sqrt(dx * dx + dy * dy);
    if (len > MAX_PULL) {
      dx = dx / len * MAX_PULL;
      dy = dy / len * MAX_PULL;
    }
    pull.x = dx; pull.y = dy;
    aiming = (dx * dx + dy * dy) > 100;
    // 拉伸吱嘎声（节流）
    var nowT = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    if (aiming && nowT - lastStretchSfx > 90) {
      lastStretchSfx = nowT;
      Sound.stretch(Math.sqrt(dx * dx + dy * dy) / MAX_PULL);
    }
    return true;
  }

  function launch() {
    if (phase !== 'aim') return false;
    var px = pull.x, py = pull.y;
    if (px * px + py * py < 100) { px = -70; py = 30; }  // 未瞄准时的默认小发射
    var b = Phys.makeBody({
      kind: 'projectile', shape: 'circle', mat: 'ember',
      x: SLING_X + px, y: SLING_Y + py,
      r: PROJECTILE_R, mass: 10,
      restitution: 0.32, friction: 0.5, hp: 1e9
    });
    b.vx = -px * POWER;
    b.vy = -py * POWER;
    world.add(b);
    projectile = b;
    pouchPos.x = b.x; pouchPos.y = b.y;
    shotsLeft--;
    abilityReady = true;
    abilityArmed = false;
    aiming = false;
    pull.x = 0; pull.y = 0;
    flightTimer = 0;
    trail = [];
    banner = null;
    Sound.launch();
    FX.dust(SLING_X, SLING_Y + 20, 8);
    setPhase('flying');
    UI.sync();
    return true;
  }

  /* ---------- 空中能力：雷霆震荡 ---------- */
  function activateAbility() {
    if (!abilityReady || !projectile || projectile.dead) return false;
    if (phase !== 'flying') return false;
    abilityReady = false;
    abilityArmed = true;
    var p = projectile;
    FX.shockRing(p.x, p.y, ABILITY_RADIUS);
    FX.shake(9, 0.4);
    Sound.ability();
    // 范围冲击：冲量 + 伤害
    for (var i = 0; i < world.bodies.length; i++) {
      var b = world.bodies[i];
      if (b.isStatic || b.dead || b === p) continue;
      var dx = b.x - p.x, dy = b.y - p.y;
      var d = Math.sqrt(dx * dx + dy * dy);
      if (d > ABILITY_RADIUS + (b.r || Math.max(b.w, b.h) / 2)) continue;
      if (b.sleeping) { b.sleeping = false; b.sleepTime = 0; }
      var fall = clamp(1 - d / (ABILITY_RADIUS + 40), 0.15, 1);
      var nx = d > 1 ? dx / d : 0, ny = d > 1 ? dy / d : -1;
      var imp = 520 * fall;
      b.vx += nx * imp * b.invMass * 10;
      b.vy += (ny * imp - 160 * fall) * b.invMass * 10;
      b.av += rand(-1.5, 1.5) * fall;
      if (b.kind === 'guard') {
        damageBody(b, 130 * fall, p.x, p.y, 'ability');
      } else if (b.kind === 'block') {
        damageBody(b, (b.mat === 'stone' ? 55 : 95) * fall, p.x, p.y, 'ability');
      }
    }
    // 给发射物自身一个向下的小推进，视觉更炸
    p.vy += 120;
    FX.spark(p.x, p.y, 0, 0);
    for (var s = 0; s < 24; s++) FX.spark(p.x + rand(-8, 8), p.y + rand(-8, 8), rand(-300, 300), rand(-300, 300));
    UI.sync();
    return true;
  }

  /* ---------- 伤害 ---------- */
  function damageBody(b, dmg, srcX, srcY, cause) {
    if (b.dead || b.isStatic) return;
    if (b.sleeping) { b.sleeping = false; b.sleepTime = 0; }
    b.hp -= dmg;
    if (b.kind === 'guard') {
      if (b.hp > 0) {
        Sound.clank();
        FX.metal(b.x, b.y - 10, 5);
      }
    }
    if (b.hp <= 0) {
      b.dead = true;
      onBodyDestroyed(b, cause);
    }
  }

  function onBodyDestroyed(b, cause) {
    if (b.kind === 'guard') {
      score += 500;
      FX.metal(b.x, b.y, 26);
      FX.text(b.x, b.y - 34, '+500', '#ffd35c');
      FX.shake(5, 0.3);
      Sound.robotDie();
    } else if (b.kind === 'block') {
      var pts = b.mat === 'stone' ? 100 : 50;
      score += pts;
      if (b.mat === 'stone') {
        FX.stone(b.x, b.y, 18);
        Sound.stone(0.9);
      } else {
        FX.wood(b.x, b.y, 16, 0);
        Sound.crack(0.9);
      }
      FX.text(b.x, b.y - 20, '+' + pts, b.mat === 'stone' ? '#c0c6d2' : '#d09a52');
    }
    // 支撑被毁，唤醒所有休眠体重新结算
    world.wakeAll();
    world.removeDead();
    UI.sync();
  }

  // 碰撞回调：根据冲击力度结算伤害与音效
  function onImpact(contact, impact) {
    var a = contact.a, b = contact.b;
    var pairs = [[a, b], [b, a]];
    for (var i = 0; i < 2; i++) {
      var self = pairs[i][0], other = pairs[i][1];
      if (self.dead || self.isStatic) continue;
      if (self.kind === 'projectile') continue;
      var safe = 130;   // 低于此速度不受伤
      if (impact <= safe) continue;
      var energy = (impact - safe);
      if (self.kind === 'guard') {
        var mult = other.kind === 'projectile' ? 0.055 : (other.kind === 'block' ? 0.045 : 0.02);
        var dmgG = energy * other.mass * mult / 10;
        if (other.isStatic) dmgG = energy * self.mass * 0.012;
        if (dmgG > 4) damageBody(self, dmgG, other.x, other.y, 'impact');
      } else if (self.kind === 'block') {
        var multB = other.kind === 'projectile' ? 0.03 : 0.012;
        var stoneFactor = self.mat === 'stone' ? 0.45 : 1;
        var dmgB = energy * other.mass * multB * stoneFactor / 10;
        if (other.isStatic) dmgB = energy * self.mass * 0.004 * stoneFactor;
        if (dmgB > 6) damageBody(self, dmgB, other.x, other.y, 'impact');
      }
    }
    // 撞击音效与烟尘（取质心近似点）
    if (impact > 90) {
      var ix = contact.px, iy = contact.py;
      var s = clamp(impact / 700, 0.15, 1);
      var hasStone = a.mat === 'stone' || b.mat === 'stone';
      var hasGuard = a.kind === 'guard' || b.kind === 'guard';
      var hasProj = a.kind === 'projectile' || b.kind === 'projectile';
      if (hasGuard) Sound.clank();
      else if (hasStone) Sound.stone(s);
      else Sound.crack(s * 0.8);
      if (hasProj && impact > 200) {
        FX.dust(ix, iy, 6);
        FX.shake(clamp(impact / 220, 1, 6), 0.25);
      }
      if ((a.kind === 'block' && b.kind === 'block') || hasStone) FX.dust(ix, iy, 3);
    }
  }

  /* ---------- 主更新 ---------- */
  function update(dt) {
    phaseTimer += dt;

    if (banner) {
      banner.t += dt;
      if (banner.t > 2.6) banner = null;
    }

    if (phase === 'flying' || phase === 'settling') {
      flightTimer += dt;
    }

    // 物理推进（菜单/结算界面也让世界静置，不推）
    if (phase === 'aim' || phase === 'flying' || phase === 'settling') {
      world.step(dt);

      // 发射物拖尾 + 火花
      if (projectile && !projectile.dead && phase === 'flying') {
        trail.push({ x: projectile.x, y: projectile.y });
        if (trail.length > 26) trail.shift();
        var spd = Math.sqrt(projectile.vx * projectile.vx + projectile.vy * projectile.vy);
        if (spd > 200) FX.spark(projectile.x, projectile.y, projectile.vx, projectile.vy);
        if (abilityArmed) FX.spark(projectile.x + rand(-6, 6), projectile.y + rand(-6, 6), rand(-150, 150), rand(-150, 150));
      }
    }

    // 回合收尾判定
    if (phase === 'flying') {
      var done = false;
      if (!projectile || projectile.dead) done = true;
      else {
        var sp = Math.sqrt(projectile.vx * projectile.vx + projectile.vy * projectile.vy);
        var out = projectile.x < -80 || projectile.x > WORLD_W + 160 || projectile.y > WORLD_H + 120 || projectile.y < -900;
        if (out) done = true;
        else if (sp < 26 && projectile.grounded) done = true;
        else if (flightTimer > 7) done = true;   // 超时兜底
      }
      if (done) {
        if (projectile && !projectile.dead) {
          FX.dust(projectile.x, projectile.y, 5);
          projectile.dead = true;
          world.removeDead();
        }
        projectile = null;
        abilityArmed = false;
        setPhase('settling');
        settleTimer = 0;
      }
    } else if (phase === 'settling') {
      settleTimer += dt;
      if (world.allQuiet() || settleTimer > 3.5) {
        endRound();
      }
    }

    // 看门狗：任何进行中的 phase 超过 15 秒强制收束
    if ((phase === 'flying' || phase === 'settling') && phaseTimer > 15) {
      if (projectile && !projectile.dead) { projectile.dead = true; world.removeDead(); }
      projectile = null;
      endRound();
    }

    FX.update(dt);
  }

  function endRound() {
    if (guardsLeft() === 0) {
      // 过关：剩余弹药奖励
      var bonus = shotsLeft * 200;
      score += bonus;
      winBonus = bonus;
      if (levelIndex + 1 >= LEVELS.length) {
        saveProgress();
        setPhase('complete');
        Sound.win();
      } else {
        unlock(levelIndex + 2);
        saveProgress();
        setPhase('win');
        Sound.win();
      }
      FX.confetti(WORLD_W * 0.75, 260, 60);
      FX.confetti(WORLD_W * 0.6, 320, 40);
    } else if (shotsLeft <= 0) {
      saveProgress();
      setPhase('lose');
      Sound.lose();
    } else {
      setPhase('aim');
    }
    UI.sync();
  }

  var winBonus = 0;
  function getWinBonus() { return winBonus; }

  function unlock(lv) {
    if (lv > unlocked) {
      unlocked = clamp(lv, 1, LEVELS.length);
      Storage.set(STORE_KEY_UNLOCK, unlocked);
    }
  }

  function saveProgress() {
    if (score > highScore) {
      highScore = score;
      Storage.set(STORE_KEY_HS, highScore);
    }
  }

  /* ---------- 手动时钟 ---------- */
  var manualClock = false;
  var accumulator = 0;

  function stepManual(ms) {
    if (paused) return false;
    var total = 0;
    var remaining = ms / 1000;
    var guard = 0;
    while (remaining > 1e-9 && guard < 4000) {
      var dt = Math.min(FIXED_DT, remaining);
      update(dt);
      remaining -= dt;
      total += dt;
      guard++;
    }
    return true;
  }

  function frame(realDt) {
    if (manualClock || paused) return;
    accumulator += Math.min(realDt, 0.05);
    var steps = 0;
    while (accumulator >= FIXED_DT && steps < 12) {
      update(FIXED_DT);
      accumulator -= FIXED_DT;
      steps++;
    }
    if (steps >= 12) accumulator = 0;
  }

  /* ---------- 对外只读快照 ---------- */
  function snapshot() {
    var targets = bodiesOf('guard').map(function (b) {
      return { id: b.id, x: Math.round(b.x * 10) / 10, y: Math.round(b.y * 10) / 10, r: b.r, hp: Math.round(b.hp), defeated: false };
    });
    var blocks = bodiesOf('block').map(function (b) {
      return {
        id: b.id, x: Math.round(b.x * 10) / 10, y: Math.round(b.y * 10) / 10,
        w: b.w, h: b.h, angle: Math.round(b.angle * 1000) / 1000,
        hp: Math.round(b.hp), type: b.mat
      };
    });
    var proj = null;
    if (projectile && !projectile.dead) {
      proj = {
        x: Math.round(projectile.x * 10) / 10,
        y: Math.round(projectile.y * 10) / 10,
        vx: Math.round(projectile.vx * 10) / 10,
        vy: Math.round(projectile.vy * 10) / 10,
        active: true,
        abilityReady: abilityReady
      };
    }
    return {
      phase: phase,
      paused: paused,
      level: levelIndex + 1,
      levelName: LEVELS[levelIndex].name,
      score: score,
      highScore: highScore,
      unlocked: unlocked,
      shotsLeft: shotsLeft,
      abilityReady: abilityReady,
      guardsLeft: guardsLeft(),
      projectile: proj,
      targets: targets,
      blocks: blocks
    };
  }

  return {
    // 状态查询
    getPhase: function () { return phase; },
    isPaused: function () { return paused; },
    getWorld: function () { return world; },
    getProjectile: function () { return projectile; },
    getTrail: function () { return trail; },
    getPull: function () { return pull; },
    isAiming: function () { return aiming; },
    setAiming: function (v) { aiming = v; },
    isAbilityArmed: function () { return abilityArmed; },
    isAbilityReady: function () { return abilityReady; },
    getBanner: function () { return banner; },
    getLevelIndex: function () { return levelIndex; },
    getScore: function () { return score; },
    getHighScore: function () { return highScore; },
    getUnlocked: function () { return unlocked; },
    getShotsLeft: function () { return shotsLeft; },
    getWinBonus: getWinBonus,
    guardsLeft: guardsLeft,
    pouchRest: pouchRest,
    currentPouch: currentPouch,
    // 动作
    startGame: startGame,
    loadLevel: loadLevel,
    restartLevel: restartLevel,
    nextLevel: nextLevel,
    pause: pause,
    resume: resume,
    setAim: setAim,
    launch: launch,
    activateAbility: activateAbility,
    forceHit: function (targetId) {
      var gs = bodiesOf('guard');
      for (var i = 0; i < gs.length; i++) {
        if (gs[i].id === targetId) {
          damageBody(gs[i], 99999, gs[i].x - 50, gs[i].y, 'force');
          // 立刻结算胜负（测试可重复验证）
          if (phase === 'aim' || phase === 'flying' || phase === 'settling') {
            if (guardsLeft() === 0) {
              if (projectile && !projectile.dead) { projectile.dead = true; world.removeDead(); }
              projectile = null;
              endRound();
            } else if (shotsLeft <= 0 && phase === 'aim') {
              endRound();
            }
          }
          return true;
        }
      }
      return false;
    },
    damageBody: damageBody,
    // 时钟
    setManualClock: function (enabled) { manualClock = !!enabled; accumulator = 0; },
    isManualClock: function () { return manualClock; },
    step: stepManual,
    frame: frame,
    update: update,
    snapshot: snapshot,
    toMenu: function () {
      saveProgress();
      banner = null;
      setPhase('menu');
      buildWorld(levelIndex);   // 菜单背景里摆一个静态堡垒
      paused = false;
    }
  };
})();

/* ============================================================
 * UI：DOM HUD 与覆盖层
 * ============================================================ */
var UI = (function () {
  var el = {};
  var ids = ['hud-level', 'hud-score', 'hud-ammo', 'btn-mute', 'btn-restart', 'btn-pause',
    'menu-overlay', 'pause-overlay', 'win-overlay', 'lose-overlay', 'complete-overlay',
    'btn-start', 'btn-resume', 'btn-pause-restart', 'btn-pause-menu',
    'btn-next', 'btn-win-replay', 'btn-win-menu',
    'btn-retry', 'btn-lose-menu', 'btn-complete-replay', 'btn-complete-menu',
    'win-score', 'win-bonus', 'lose-left', 'complete-score', 'complete-best',
    'menu-best', 'level-dots'];

  function $(id) { return document.getElementById(id); }

  function init() {
    for (var i = 0; i < ids.length; i++) el[ids[i]] = $(ids[i]);
    bind('btn-start', function () { Game.startGame(); });
    bind('btn-resume', function () { Game.resume(); });
    bind('btn-pause', function () { Game.isPaused() ? Game.resume() : Game.pause(); });
    bind('btn-restart', function () { Game.restartLevel(); });
    bind('btn-pause-restart', function () { Game.resume(); Game.restartLevel(); });
    bind('btn-pause-menu', function () { Game.resume(); Game.toMenu(); });
    bind('btn-next', function () { Game.nextLevel(); });
    bind('btn-win-replay', function () { Game.restartLevel(); });
    bind('btn-win-menu', function () { Game.toMenu(); });
    bind('btn-retry', function () { Game.restartLevel(); });
    bind('btn-lose-menu', function () { Game.toMenu(); });
    bind('btn-complete-replay', function () { Game.startGame(); });
    bind('btn-complete-menu', function () { Game.toMenu(); });
    bind('btn-mute', function () {
      var m = Sound.toggleMute();
      el['btn-mute'].textContent = m ? '🔇' : '🔊';
    });
    el['btn-mute'].textContent = Sound.isMuted() ? '🔇' : '🔊';
  }

  function bind(id, fn) {
    el[id].addEventListener('click', function (ev) {
      ev.preventDefault();
      Sound.resume();
      Sound.click();
      fn();
    });
  }

  function hideAllOverlays() {
    el['menu-overlay'].classList.add('hidden');
    el['pause-overlay'].classList.add('hidden');
    el['win-overlay'].classList.add('hidden');
    el['lose-overlay'].classList.add('hidden');
    el['complete-overlay'].classList.add('hidden');
  }

  function rebuildDots() {
    var dots = el['level-dots'];
    dots.innerHTML = '';
    var unlocked = Game.getUnlocked();
    for (var i = 0; i < LEVELS.length; i++) {
      (function (idx) {
        var b = document.createElement('button');
        b.className = 'level-dot' + (idx + 1 > unlocked ? ' locked' : '');
        b.textContent = idx + 1 > unlocked ? '🔒' : String(idx + 1);
        b.title = LEVELS[idx].name;
        if (idx + 1 <= unlocked) {
          b.addEventListener('click', function () {
            Sound.resume(); Sound.click();
            Game.loadLevel(idx, false);
          });
        } else {
          b.addEventListener('click', function () { Sound.denied(); });
        }
        dots.appendChild(b);
      })(i);
    }
  }

  return {
    init: init,
    sync: function () {
      if (!el['hud-level']) return;
      var s = Game.snapshot();
      el['hud-level'].textContent = '关卡 ' + s.level + ' · ' + s.levelName;
      el['hud-score'].textContent = s.score;
      el['hud-ammo'].textContent = s.shotsLeft;
    },
    onPhase: function (phase) {
      if (!el['menu-overlay']) return;
      hideAllOverlays();
      if (phase === 'menu') {
        rebuildDots();
        el['menu-best'].textContent = '最高分 ' + Game.getHighScore() + ' · 已解锁 ' + Game.getUnlocked() + ' 关';
        el['menu-overlay'].classList.remove('hidden');
      } else if (phase === 'win') {
        el['win-score'].textContent = Game.getScore();
        el['win-bonus'].textContent = '剩余弹药奖励 +' + Game.getWinBonus();
        el['win-overlay'].classList.remove('hidden');
      } else if (phase === 'lose') {
        el['lose-left'].textContent = Game.guardsLeft();
        el['lose-overlay'].classList.remove('hidden');
      } else if (phase === 'complete') {
        el['complete-score'].textContent = Game.getScore();
        el['complete-best'].textContent = '历史最高 ' + Game.getHighScore();
        el['complete-overlay'].classList.remove('hidden');
      }
      el['btn-pause'].textContent = Game.isPaused() ? '▶' : '⏸';
    },
    onPause: function (paused) {
      if (!el['pause-overlay']) return;
      el['pause-overlay'].classList.toggle('hidden', !paused);
      el['btn-pause'].textContent = paused ? '▶' : '⏸';
    }
  };
})();

/* ============================================================
 * 渲染器：黄昏山谷 + 弹弓 + 堡垒 + 角色，全部 Canvas 矢量绘制
 * ============================================================ */
var Render = (function () {
  var canvas = null, ctx = null;
  var bgTime = 0;

  // 预生成的确定性装饰（避免每帧随机闪烁）
  var stars = [];
  var grassTufts = [];
  var flowers = [];
  var clouds = [];
  var initialized = false;

  function seededRand(seed) {
    var s = seed;
    return function () {
      s = (s * 1664525 + 1013904223) % 4294967296;
      return s / 4294967296;
    };
  }

  function init(cv) {
    canvas = cv;
    ctx = canvas.getContext('2d');
    var r1 = seededRand(20260717);
    var i;
    for (i = 0; i < 70; i++) stars.push({ x: r1() * WORLD_W, y: r1() * 300, r: r1() * 1.6 + 0.4, tw: r1() * Math.PI * 2 });
    var r2 = seededRand(778899);
    for (i = 0; i < 90; i++) grassTufts.push({ x: r2() * WORLD_W, h: 6 + r2() * 10, lean: r2() * 0.6 - 0.3, c: r2() });
    var r3 = seededRand(334455);
    for (i = 0; i < 16; i++) flowers.push({ x: 60 + r3() * (WORLD_W - 120), c: r3() });
    for (i = 0; i < 5; i++) clouds.push({ x: r1() * WORLD_W, y: 60 + r1() * 150, s: 0.6 + r1() * 0.9, v: 4 + r1() * 7 });
    resize();
    initialized = true;
  }

  function resize() {
    if (!canvas) return;
    var rect = canvas.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = Math.max(1, Math.round(rect.width * dpr));
    var h = Math.max(1, Math.round(rect.height * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
  }

  /* ---------- 背景 ---------- */
  function drawSky() {
    var g = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
    g.addColorStop(0, '#231a45');
    g.addColorStop(0.45, '#5c3a63');
    g.addColorStop(0.78, '#c96a54');
    g.addColorStop(1, '#f2a35e');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, WORLD_W, GROUND_Y + 2);
    // 星星（上半部，随时间微闪）
    ctx.fillStyle = '#fff';
    for (var i = 0; i < stars.length; i++) {
      var st = stars[i];
      var a = 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(bgTime * 1.5 + st.tw));
      var fade = clamp(1 - st.y / 320, 0, 1);
      ctx.globalAlpha = a * fade;
      ctx.beginPath();
      ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawSun() {
    var sx = 1035, sy = 150;
    var glow = ctx.createRadialGradient(sx, sy, 10, sx, sy, 180);
    glow.addColorStop(0, 'rgba(255, 224, 150, 0.85)');
    glow.addColorStop(0.35, 'rgba(255, 190, 110, 0.35)');
    glow.addColorStop(1, 'rgba(255, 170, 90, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(sx, sy, 180, 0, Math.PI * 2); ctx.fill();
    var core = ctx.createRadialGradient(sx - 12, sy - 12, 4, sx, sy, 52);
    core.addColorStop(0, '#fff6d8');
    core.addColorStop(1, '#ffc164');
    ctx.fillStyle = core;
    ctx.beginPath(); ctx.arc(sx, sy, 52, 0, Math.PI * 2); ctx.fill();
  }

  function drawClouds() {
    ctx.fillStyle = 'rgba(255, 215, 190, 0.35)';
    for (var i = 0; i < clouds.length; i++) {
      var c = clouds[i];
      var x = (c.x + bgTime * c.v) % (WORLD_W + 260) - 130;
      ctx.beginPath();
      ctx.ellipse(x, c.y, 52 * c.s, 16 * c.s, 0, 0, Math.PI * 2);
      ctx.ellipse(x + 30 * c.s, c.y + 6 * c.s, 36 * c.s, 12 * c.s, 0, 0, Math.PI * 2);
      ctx.ellipse(x - 32 * c.s, c.y + 7 * c.s, 30 * c.s, 10 * c.s, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function ridge(color, base, amp, freq, phase) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    for (var x = 0; x <= WORLD_W; x += 16) {
      var y = base - Math.abs(Math.sin(x * freq + phase)) * amp - Math.sin(x * freq * 2.7 + phase * 2) * amp * 0.25;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(WORLD_W, GROUND_Y);
    ctx.closePath();
    ctx.fill();
  }

  function drawMountains() {
    ridge('#3a2a55', 470, 130, 0.004, 1.2);
    ridge('#2c2044', 540, 100, 0.006, 4.0);
    // 树线剪影
    ctx.fillStyle = '#241a38';
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    for (var x = 0; x <= WORLD_W; x += 22) {
      var h = 26 + Math.abs(Math.sin(x * 0.05)) * 30 + Math.sin(x * 0.13) * 8;
      ctx.lineTo(x, GROUND_Y - 40 - h);
      ctx.lineTo(x + 11, GROUND_Y - 40);
    }
    ctx.lineTo(WORLD_W, GROUND_Y);
    ctx.closePath();
    ctx.fill();
  }

  function drawGround() {
    var g = ctx.createLinearGradient(0, GROUND_Y, 0, WORLD_H);
    g.addColorStop(0, '#5d8a48');
    g.addColorStop(0.12, '#4a7038');
    g.addColorStop(0.35, '#5a4630');
    g.addColorStop(1, '#3a2c1e');
    ctx.fillStyle = g;
    ctx.fillRect(0, GROUND_Y, WORLD_W, WORLD_H - GROUND_Y);
    // 草皮亮边
    ctx.fillStyle = '#79a85c';
    ctx.fillRect(0, GROUND_Y, WORLD_W, 5);
    // 草丛
    for (var i = 0; i < grassTufts.length; i++) {
      var t = grassTufts[i];
      ctx.strokeStyle = t.c > 0.5 ? '#86b364' : '#6b9a4e';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(t.x, GROUND_Y + 2);
      ctx.quadraticCurveTo(t.x + t.lean * 8, GROUND_Y - t.h * 0.6, t.x + t.lean * 14, GROUND_Y - t.h);
      ctx.stroke();
    }
    // 小花
    for (i = 0; i < flowers.length; i++) {
      var f = flowers[i];
      ctx.fillStyle = f.c > 0.5 ? '#ffd35c' : '#ff9d9d';
      ctx.beginPath();
      ctx.arc(f.x, GROUND_Y - 3, 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /* ---------- 弹弓 ---------- */
  var FORK_L = { x: SLING_X - 26, y: FORK_TOP_Y };
  var FORK_R = { x: SLING_X + 26, y: FORK_TOP_Y };

  function woodStroke(width, color) {
    ctx.lineCap = 'round';
    ctx.lineWidth = width;
    ctx.strokeStyle = color;
  }

  function drawSlingBack(pouch) {
    // 后臂 + 后皮筋（在发射物后面）
    woodStroke(15, '#6e451e');
    ctx.beginPath();
    ctx.moveTo(SLING_X, GROUND_Y + 6);
    ctx.lineTo(SLING_X - 6, GROUND_Y - 60);
    ctx.lineTo(FORK_L.x, FORK_L.y);
    ctx.stroke();
    if (pouch) {
      woodStroke(7, '#8a3d2a');
      ctx.beginPath();
      ctx.moveTo(FORK_L.x, FORK_L.y);
      ctx.lineTo(pouch.x - 8, pouch.y);
      ctx.stroke();
    }
  }

  function drawSlingFront(pouch) {
    // 主干 + 前臂 + 前皮筋 + 皮兜
    woodStroke(17, '#8a5a28');
    ctx.beginPath();
    ctx.moveTo(SLING_X, GROUND_Y + 6);
    ctx.lineTo(SLING_X + 4, GROUND_Y - 62);
    ctx.lineTo(FORK_R.x, FORK_R.y);
    ctx.stroke();
    // 木纹高光
    woodStroke(5, 'rgba(255, 214, 150, 0.35)');
    ctx.beginPath();
    ctx.moveTo(SLING_X - 3, GROUND_Y - 6);
    ctx.lineTo(SLING_X + 2, GROUND_Y - 58);
    ctx.stroke();
    if (pouch) {
      woodStroke(7, '#a84f33');
      ctx.beginPath();
      ctx.moveTo(FORK_R.x, FORK_R.y);
      ctx.lineTo(pouch.x + 8, pouch.y);
      ctx.stroke();
      // 皮兜
      ctx.save();
      ctx.translate(pouch.x, pouch.y);
      ctx.fillStyle = '#5d3620';
      ctx.strokeStyle = '#3c2212';
      ctx.lineWidth = 2;
      roundRect(-16, -7, 32, 14, 6);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  /* ---------- 方块 ---------- */
  function drawBlock(b) {
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(b.angle);
    var w = b.w, h = b.h;
    var hpRatio = clamp(b.hp / b.maxHp, 0, 1);
    if (b.mat === 'stone') {
      var g = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
      g.addColorStop(0, '#aab2c2');
      g.addColorStop(0.5, '#878fa0');
      g.addColorStop(1, '#646c7e');
      ctx.fillStyle = g;
      ctx.strokeStyle = '#454b58';
      ctx.lineWidth = 2.5;
      roundRect(-w / 2, -h / 2, w, h, 5);
      ctx.fill(); ctx.stroke();
      // 凿痕
      ctx.strokeStyle = 'rgba(60, 66, 80, 0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-w * 0.28, -h * 0.18); ctx.lineTo(-w * 0.05, -h * 0.05);
      ctx.moveTo(w * 0.1, h * 0.12); ctx.lineTo(w * 0.32, h * 0.22);
      ctx.stroke();
      // 顶部受光
      ctx.fillStyle = 'rgba(255,255,255,0.14)';
      roundRect(-w / 2 + 3, -h / 2 + 2, w - 6, h * 0.28, 4);
      ctx.fill();
    } else {
      var gw = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
      gw.addColorStop(0, '#c98d4e');
      gw.addColorStop(0.5, '#a96f35');
      gw.addColorStop(1, '#7e5223');
      ctx.fillStyle = gw;
      ctx.strokeStyle = '#54340f';
      ctx.lineWidth = 2.5;
      roundRect(-w / 2, -h / 2, w, h, 4);
      ctx.fill(); ctx.stroke();
      // 木纹：沿长边的三条线
      ctx.strokeStyle = 'rgba(90, 55, 18, 0.55)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      var long = w >= h;
      for (var gi = -1; gi <= 1; gi++) {
        if (long) {
          ctx.moveTo(-w / 2 + 6, gi * h * 0.22);
          ctx.bezierCurveTo(-w * 0.15, gi * h * 0.22 + 3, w * 0.15, gi * h * 0.22 - 3, w / 2 - 6, gi * h * 0.22);
        } else {
          ctx.moveTo(gi * w * 0.22, -h / 2 + 6);
          ctx.bezierCurveTo(gi * w * 0.22 + 3, -h * 0.15, gi * w * 0.22 - 3, h * 0.15, gi * w * 0.22, h / 2 - 6);
        }
      }
      ctx.stroke();
      if (b.crate) {
        // 木箱：边框 + 交叉撑
        ctx.strokeStyle = '#5d3a12';
        ctx.lineWidth = 3.5;
        ctx.strokeRect(-w / 2 + 4, -h / 2 + 4, w - 8, h - 8);
        ctx.beginPath();
        ctx.moveTo(-w / 2 + 5, -h / 2 + 5); ctx.lineTo(w / 2 - 5, h / 2 - 5);
        ctx.moveTo(w / 2 - 5, -h / 2 + 5); ctx.lineTo(-w / 2 + 5, h / 2 - 5);
        ctx.stroke();
      }
      // 钉子
      ctx.fillStyle = '#3d2508';
      ctx.beginPath();
      ctx.arc(-w / 2 + 7, -h / 2 + 7, 2, 0, Math.PI * 2);
      ctx.arc(w / 2 - 7, h / 2 - 7, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    // 损伤裂纹
    if (hpRatio < 0.66) {
      ctx.strokeStyle = 'rgba(30, 20, 12, 0.75)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-w * 0.3, -h * 0.4);
      ctx.lineTo(-w * 0.1, -h * 0.1);
      ctx.lineTo(-w * 0.25, h * 0.15);
      ctx.lineTo(-w * 0.05, h * 0.42);
      ctx.stroke();
    }
    if (hpRatio < 0.33) {
      ctx.strokeStyle = 'rgba(25, 15, 8, 0.85)';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(w * 0.32, -h * 0.42);
      ctx.lineTo(w * 0.12, -h * 0.05);
      ctx.lineTo(w * 0.3, h * 0.2);
      ctx.lineTo(w * 0.08, h * 0.45);
      ctx.stroke();
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      roundRect(-w / 2, -h / 2, w, h, 4);
      ctx.fill();
    }
    ctx.restore();
  }

  /* ---------- 齿轮哨兵（原创铁皮机器人） ---------- */
  function drawGuard(b) {
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(b.angle);
    var hpRatio = clamp(b.hp / b.maxHp, 0, 1);
    // 影子
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(0, b.r - 1, b.r * 0.8, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    // 发条钥匙（背部，持续转动）
    var keyA = bgTime * 3 + b.id;
    ctx.save();
    ctx.translate(0, -4);
    ctx.rotate(keyA);
    ctx.strokeStyle = '#d8b45c';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(0, -6);
    ctx.stroke();
    ctx.fillStyle = '#e8c86c';
    ctx.beginPath();
    ctx.ellipse(-5, -9, 4.5, 6, 0, 0, Math.PI * 2);
    ctx.ellipse(5, -9, 4.5, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // 铁皮身体（圆角方桶）
    var bodyG = ctx.createLinearGradient(-18, -20, 18, 20);
    bodyG.addColorStop(0, '#c7d2e2');
    bodyG.addColorStop(0.5, '#93a2b8');
    bodyG.addColorStop(1, '#66738a');
    ctx.fillStyle = bodyG;
    ctx.strokeStyle = '#3e485c';
    ctx.lineWidth = 2.5;
    roundRect(-17, -19, 34, 38, 9);
    ctx.fill(); ctx.stroke();
    // 铆钉
    ctx.fillStyle = '#4d586e';
    var rivets = [[-11, -13], [11, -13], [-11, 13], [11, 13]];
    for (var i = 0; i < rivets.length; i++) {
      ctx.beginPath(); ctx.arc(rivets[i][0], rivets[i][1], 1.8, 0, Math.PI * 2); ctx.fill();
    }
    // 胸口齿轮标
    ctx.strokeStyle = 'rgba(62, 72, 92, 0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 8, 5.5, 0, Math.PI * 2);
    for (var ti = 0; ti < 6; ti++) {
      var ta = ti * Math.PI / 3;
      ctx.moveTo(Math.cos(ta) * 5.5, 8 + Math.sin(ta) * 5.5);
      ctx.lineTo(Math.cos(ta) * 8, 8 + Math.sin(ta) * 8);
    }
    ctx.stroke();
    // 面罩 + 独眼
    ctx.fillStyle = '#2c3444';
    roundRect(-12, -15, 24, 13, 6);
    ctx.fill();
    var eyeColor = hpRatio > 0.5 ? '#7ef0ff' : (hpRatio > 0.25 ? '#ffb14d' : '#ff5c4d');
    var flicker = hpRatio <= 0.25 ? (Math.sin(bgTime * 20 + b.id) > -0.2 ? 1 : 0.2) : 1;
    ctx.save();
    ctx.shadowColor = eyeColor;
    ctx.shadowBlur = 8;
    ctx.fillStyle = eyeColor;
    ctx.globalAlpha = flicker;
    ctx.beginPath();
    ctx.arc(0, -8.5, 4.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // 天线
    ctx.strokeStyle = '#4d586e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(8, -19); ctx.lineTo(13, -27);
    ctx.stroke();
    ctx.fillStyle = '#ff8a5c';
    ctx.beginPath();
    ctx.arc(13, -28, 2.6 + Math.sin(bgTime * 4 + b.id) * 0.7, 0, Math.PI * 2);
    ctx.fill();
    // 手臂短桩
    ctx.fillStyle = '#7e8ba0';
    ctx.strokeStyle = '#3e485c';
    ctx.lineWidth = 2;
    roundRect(-22, -4, 6, 12, 3); ctx.fill(); ctx.stroke();
    roundRect(16, -4, 6, 12, 3); ctx.fill(); ctx.stroke();
    ctx.restore();
    // 血条（仅受伤后显示，不随身体旋转）
    if (hpRatio < 1) {
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      roundRect(b.x - 20, b.y - b.r - 16, 40, 6, 3);
      ctx.fill();
      ctx.fillStyle = hpRatio > 0.5 ? '#7be3a8' : (hpRatio > 0.25 ? '#ffc84d' : '#ff6b5c');
      roundRect(b.x - 20, b.y - b.r - 16, 40 * hpRatio, 6, 3);
      ctx.fill();
    }
  }

  /* ---------- 星火石（发射物） ---------- */
  function drawEmber(x, y, r, armed) {
    ctx.save();
    var glowR = armed ? r * 3.2 : r * 2.2;
    var glow = ctx.createRadialGradient(x, y, r * 0.3, x, y, glowR);
    glow.addColorStop(0, armed ? 'rgba(255, 240, 170, 0.9)' : 'rgba(255, 210, 120, 0.75)');
    glow.addColorStop(1, 'rgba(255, 150, 60, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(x, y, glowR, 0, Math.PI * 2); ctx.fill();
    var core = ctx.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.1, x, y, r);
    if (armed) {
      core.addColorStop(0, '#fffbe0');
      core.addColorStop(0.55, '#ffd35c');
      core.addColorStop(1, '#ff7a2e');
    } else {
      core.addColorStop(0, '#ffe9b0');
      core.addColorStop(0.55, '#f7a84b');
      core.addColorStop(1, '#c95f1e');
    }
    ctx.fillStyle = core;
    ctx.strokeStyle = '#7e3a10';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    // 表面裂纹状的种壳纹
    ctx.strokeStyle = 'rgba(126, 58, 16, 0.65)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x - r * 0.5, y - r * 0.2);
    ctx.quadraticCurveTo(x, y + r * 0.15, x + r * 0.45, y - r * 0.3);
    ctx.moveTo(x - r * 0.3, y + r * 0.45);
    ctx.quadraticCurveTo(x + r * 0.1, y + r * 0.3, x + r * 0.5, y + r * 0.5);
    ctx.stroke();
    // 嫩芽小叶
    ctx.fillStyle = '#7be3a8';
    ctx.beginPath();
    ctx.ellipse(x + 2, y - r - 2, 6, 3, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /* ---------- 瞄准辅助 ---------- */
  function drawAimUI(pouch) {
    var pull = Game.getPull();
    var ratio = clamp(Math.sqrt(pull.x * pull.x + pull.y * pull.y) / MAX_PULL, 0, 1);
    // 轨迹预测点
    if (Game.isAiming() && ratio > 0.02) {
      var vx = -pull.x * POWER, vy = -pull.y * POWER;
      var px = pouch.x, py = pouch.y;
      var dt = 1 / 30;
      ctx.fillStyle = '#ffe9a0';
      for (var i = 0; i < 40; i++) {
        vy += GRAVITY * dt;
        px += vx * dt;
        py += vy * dt;
        if (py > GROUND_Y) break;
        if (i % 2 === 0) {
          ctx.globalAlpha = 0.85 * (1 - i / 44);
          ctx.beginPath();
          ctx.arc(px, py, 4.2 - i * 0.05, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    }
    // 力度环
    if (ratio > 0.02 && Game.getPhase() === 'aim') {
      var col = ratio < 0.4 ? '#7be3a8' : (ratio < 0.75 ? '#ffc84d' : '#ff6b5c');
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.arc(pouch.x, pouch.y, PROJECTILE_R + 12, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = col;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(pouch.x, pouch.y, PROJECTILE_R + 12, -Math.PI / 2, -Math.PI / 2 + ratio * Math.PI * 2);
      ctx.stroke();
    }
  }

  /* ---------- 拖尾 ---------- */
  function drawTrail() {
    var trail = Game.getTrail();
    if (trail.length < 2) return;
    for (var i = 1; i < trail.length; i++) {
      var a = i / trail.length;
      ctx.strokeStyle = 'rgba(255, ' + Math.floor(lerp(120, 220, a)) + ', 70, ' + (a * 0.55) + ')';
      ctx.lineWidth = lerp(2, 9, a);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(trail[i - 1].x, trail[i - 1].y);
      ctx.lineTo(trail[i].x, trail[i].y);
      ctx.stroke();
    }
  }

  /* ---------- 横幅 & 提示 ---------- */
  function drawBanner() {
    var banner = Game.getBanner ? Game.getBanner() : null;
    if (!banner) return;
    var t = banner.t;
    var alpha = t < 0.3 ? t / 0.3 : (t > 2.0 ? clamp(1 - (t - 2.0) / 0.6, 0, 1) : 1);
    if (alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(20, 12, 36, 0.72)';
    roundRect(WORLD_W / 2 - 240, 92, 480, 108, 16);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 211, 92, 0.5)';
    ctx.lineWidth = 2;
    roundRect(WORLD_W / 2 - 240, 92, 480, 108, 16);
    ctx.stroke();
    ctx.fillStyle = '#ffd35c';
    ctx.font = '900 34px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillText((IS_EN ? 'Level ' : '第 ') + (Game.getLevelIndex() + 1) + (IS_EN ? ' · ' : ' 关 · ') + banner.title, WORLD_W / 2, 138);
    ctx.fillStyle = '#e8dcf5';
    ctx.font = '400 20px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillText(banner.hint, WORLD_W / 2, 176);
    ctx.restore();
  }

  var abilityHintT = -1;
  var lastPhaseForHint = '';
  function drawAbilityHint(proj) {
    if (Game.getPhase() === 'flying') {
      if (lastPhaseForHint !== 'flying') abilityHintT = 0;
      if (abilityHintT >= 0) abilityHintT += 1 / 60;
    } else {
      abilityHintT = -1;
    }
    lastPhaseForHint = Game.getPhase();
    if (!proj || !Game.isAbilityReady()) return;
    if (abilityHintT < 0 || abilityHintT > 3.2) return;
    var pulse = 0.6 + 0.4 * Math.sin(bgTime * 8);
    ctx.save();
    ctx.globalAlpha = clamp(3.2 - abilityHintT, 0, 1);
    ctx.strokeStyle = 'rgba(255, 233, 160, ' + (0.5 + 0.4 * pulse) + ')';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(proj.x, proj.y, PROJECTILE_R + 10 + pulse * 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.font = '700 22px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 4;
    var msg = IS_EN ? 'Click / Space · Shockwave!' : '点击 / 空格 · 雷霆震荡！';
    ctx.strokeText(msg, WORLD_W / 2, 66);
    ctx.fillStyle = '#ffe9a0';
    ctx.fillText(msg, WORLD_W / 2, 66);
    ctx.restore();
  }

  /* ---------- 主绘制 ---------- */
  function frame(dt) {
    if (!initialized) return;
    bgTime += dt;
    var s = canvas.width / WORLD_W;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    var sh = FX.getShakeOffset();
    ctx.setTransform(s, 0, 0, s, sh.x * s, sh.y * s);

    drawSky();
    drawSun();
    drawClouds();
    drawMountains();
    drawGround();

    var world = Game.getWorld();
    var phase = Game.getPhase();
    var pouch = (phase === 'aim') ? Game.currentPouch() : Game.pouchRest();

    // 弹弓后臂（在最底层）
    var loaded = phase === 'aim';
    drawSlingBack(loaded ? pouch : null);

    // 实体
    if (world) {
      var bodies = world.bodies;
      for (var i = 0; i < bodies.length; i++) {
        var b = bodies[i];
        if (b.dead) continue;
        if (b.kind === 'block') drawBlock(b);
        else if (b.kind === 'guard') drawGuard(b);
      }
    }

    // 待发的星火石 / 飞行中的星火石
    var proj = Game.getProjectile();
    if (loaded) drawEmber(pouch.x, pouch.y, PROJECTILE_R, false);
    if (proj && !proj.dead) drawEmber(proj.x, proj.y, PROJECTILE_R, Game.isAbilityArmed());

    // 弹弓前臂与皮兜
    drawSlingFront(loaded ? pouch : null);

    if (phase === 'aim') drawAimUI(pouch);
    drawTrail();
    FX.render(ctx);
    drawBanner();
    if (proj && !proj.dead) drawAbilityHint(proj);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  return { init: init, frame: frame, resize: resize };
})();

/* ============================================================
 * 输入：指针（鼠标+触摸统一）与键盘
 * ============================================================ */
var Input = (function () {
  var canvas = null;
  var dragging = false;
  var activePointerId = null;

  function toWorld(ev) {
    var rect = canvas.getBoundingClientRect();
    return {
      x: (ev.clientX - rect.left) * (WORLD_W / rect.width),
      y: (ev.clientY - rect.top) * (WORLD_H / rect.height)
    };
  }

  function onDown(ev) {
    Sound.resume();
    if (Game.isPaused()) return;
    var phase = Game.getPhase();
    var p = toWorld(ev);
    if (phase === 'flying') {
      Game.activateAbility();
      return;
    }
    if (phase !== 'aim') return;
    var rest = Game.pouchRest();
    var grabR = 110;   // 宽松的抓取半径，手机也好按
    if (dist2(p.x, p.y, rest.x, rest.y) <= grabR * grabR) {
      dragging = true;
      activePointerId = ev.pointerId != null ? ev.pointerId : 'mouse';
      Game.setAim(p.x - rest.x, p.y - rest.y);
      ev.preventDefault();
    }
  }

  function onMove(ev) {
    if (!dragging) return;
    if (activePointerId !== null && ev.pointerId != null && ev.pointerId !== activePointerId) return;
    var p = toWorld(ev);
    var rest = Game.pouchRest();
    Game.setAim(p.x - rest.x, p.y - rest.y);
    ev.preventDefault();
  }

  function onUp(ev) {
    if (!dragging) return;
    if (activePointerId !== null && ev.pointerId != null && ev.pointerId !== activePointerId) return;
    dragging = false;
    activePointerId = null;
    if (Game.getPhase() === 'aim' && Game.isAiming()) {
      Game.launch();
    } else {
      Game.setAim(0, 0);
    }
    ev.preventDefault();
  }

  function onKey(ev) {
    if (ev.code === 'Space') {
      ev.preventDefault();
      Sound.resume();
      if (Game.isPaused()) { Game.resume(); return; }
      var phase = Game.getPhase();
      if (phase === 'flying') Game.activateAbility();
      else if (phase === 'menu') Game.startGame();
    } else if (ev.code === 'KeyP' || ev.code === 'Escape') {
      var ph = Game.getPhase();
      if (ph !== 'menu' && ph !== 'win' && ph !== 'lose' && ph !== 'complete') {
        Game.isPaused() ? Game.resume() : Game.pause();
      }
    } else if (ev.code === 'KeyR') {
      var ph2 = Game.getPhase();
      if (ph2 !== 'menu') Game.restartLevel();
    }
  }

  function init(cv) {
    canvas = cv;
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp);
    canvas.addEventListener('contextmenu', function (ev) { ev.preventDefault(); });
    window.addEventListener('keydown', onKey);
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) {
        var ph = Game.getPhase();
        if (ph === 'aim' || ph === 'flying' || ph === 'settling') Game.pause();
      }
    });
    window.addEventListener('resize', function () { Render.resize(); });
  }

  return { init: init };
})();

/* ============================================================
 * 主循环 + 启动
 * ============================================================ */
(function boot() {
  function start() {
    var canvas = document.getElementById('game-canvas');
    if (!canvas) return;
    UI.init();
    Render.init(canvas);
    Input.init(canvas);
    Game.toMenu();
    UI.sync();

    var last = null;
    function tick(ts) {
      if (last === null) last = ts;
      var dt = Math.min((ts - last) / 1000, 0.1);
      last = ts;
      try {
        Game.frame(dt);
        Render.frame(dt);
      } catch (err) {
        // 渲染/逻辑异常不应让页面崩溃；记录后继续
        if (window.console && console.error) console.error('[SlingSiege]', err);
      }
      window.requestAnimationFrame(tick);
    }
    window.requestAnimationFrame(tick);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();

/* ============================================================
 * 统一测试接口
 * ============================================================ */
window.__SLINGSHOT_TEST__ = {
  snapshot: function () { return Game.snapshot(); },
  start: function () { Game.startGame(); return true; },
  restart: function () { Game.restartLevel(); return true; },
  loadLevel: function (level) {
    var idx = clamp(Math.round(level || 1), 1, LEVELS.length) - 1;
    Game.loadLevel(idx, false);
    return true;
  },
  pause: function () { Game.pause(); return true; },
  resume: function () { Game.resume(); return true; },
  setManualClock: function (enabled) { Game.setManualClock(enabled); return true; },
  step: function (ms) { return Game.step(ms); },
  aim: function (dx, dy) { return Game.setAim(dx, dy); },
  launch: function () { return Game.launch(); },
  activateAbility: function () { return Game.activateAbility(); },
  forceHit: function (targetId) { return Game.forceHit(targetId); }
};

})();
