'use strict';
/* ============================================================
 * Sling Siege · 弹弓攻城
 * 原创弹弓物理小游戏：黄昏峡谷里，燧石弹弓手对决锈甲虫帮。
 * 原生 Canvas + Web Audio，无外部资源、无依赖。
 * ============================================================ */
(() => {

/* ==================== 常量 ==================== */
const IS_ENGLISH = new URLSearchParams(window.location.search).get('lang') === 'en';
const WORLD_W = 1280;
const WORLD_H = 720;
const GROUND_Y = 624;            // 地面顶面
const GRAVITY = 1400;            // px/s^2
const DT = 1 / 120;              // 固定物理步长
const MAX_PULL = 130;            // 最大拉伸距离(px)
const LAUNCH_K = 7.4;            // 拉伸→初速系数
const MAX_SPEED = 1180;
const SHOT_R = 16;

// 弹弓几何（世界坐标）
const SLING = {
  baseX: 192, baseY: GROUND_Y,
  jointX: 192, jointY: 462,
  tipL: { x: 170, y: 396 },
  tipR: { x: 216, y: 392 },
};
const ANCHOR = { x: 193, y: 452 }; // 皮兜静止位置 = 瞄准锚点

// 材质表：密度/弹性/摩擦/血量/受伤阈值/受伤系数
const MAT = {
  wood:  { density: 0.00115, rest: 0.08, fric: 0.55, hp: 40, thr: 130, dk: 0.018 },
  stone: { density: 0.00260, rest: 0.04, fric: 0.68, hp: 120, thr: 280, dk: 0.010 },
  flesh: { density: 0.00140, rest: 0.10, fric: 0.50, hp: 60, thr: 140, dk: 0.026 },
  jar:   { density: 0.00090, rest: 0.20, fric: 0.40, hp: 24, thr: 70,  dk: 0.080 },
  shot:  { density: 0.00750, rest: 0.25, fric: 0.45, hp: 1e30, thr: 1e30, dk: 0 },
};

const SCORE = { hitGuard: 50, killGuard: 500, breakBlock: 80, breakJar: 60, shotBonus: 150 };
const STORE_KEYS = { best: 'slingsiege_best', unlocked: 'slingsiege_unlocked', muted: 'slingsiege_muted' };

/* ==================== 工具 ==================== */
const clamp = (v, a, b) => v < a ? a : (v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const hypot = Math.hypot;
// 确定性伪随机（关卡布景/纹理用，避免物理不确定性）
function seededRand(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
// 影响物理的随机源（爆炸角速度等）：独立可存档，保证测试可重复
let fxRandState = { s: 1 };
function fxRand() {
  fxRandState.s = (fxRandState.s * 1664525 + 1013904223) >>> 0;
  return fxRandState.s / 4294967296;
}

/* ==================== 存档 ==================== */
const Store = {
  get(k, d) {
    try {
      const v = window.localStorage.getItem(k);
      return v === null ? d : JSON.parse(v);
    } catch (e) { return d; }
  },
  set(k, v) {
    try { window.localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* 隐私模式忽略 */ }
  },
};

/* ==================== 程序化音效（Web Audio） ==================== */
const AudioSys = (() => {
  let ctx = null, master = null, noiseBuf = null;
  let muted = !!Store.get(STORE_KEYS.muted, false);
  const lastPlay = {};

  function ensure() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
    } catch (e) { ctx = null; master = null; }
  }
  function resume() {
    ensure();
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
  }
  function tone(o) {
    if (!ctx || muted) return;
    try {
      const t = ctx.currentTime + (o.delay || 0);
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = o.type || 'sine';
      osc.frequency.setValueAtTime(Math.max(1, o.f0), t);
      if (o.f1) osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.f1), t + o.dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(o.vol || 0.3, t + (o.a || 0.006));
      g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
      osc.connect(g); g.connect(master);
      osc.start(t); osc.stop(t + o.dur + 0.05);
    } catch (e) { /* 忽略 */ }
  }
  function noise(o) {
    if (!ctx || muted) return;
    try {
      if (!noiseBuf) {
        noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
        const d = noiseBuf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      }
      const t = ctx.currentTime + (o.delay || 0);
      const src = ctx.createBufferSource();
      src.buffer = noiseBuf; src.loop = true;
      const f = ctx.createBiquadFilter();
      f.type = o.type || 'lowpass';
      f.frequency.setValueAtTime(Math.max(20, o.f0 || 800), t);
      if (o.f1) f.frequency.exponentialRampToValueAtTime(Math.max(20, o.f1), t + o.dur);
      f.Q.value = o.q || 0.8;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(o.vol || 0.3, t + (o.a || 0.01));
      g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
      src.connect(f); f.connect(g); g.connect(master);
      src.start(t); src.stop(t + o.dur + 0.05);
    } catch (e) { /* 忽略 */ }
  }

  // name: 事件名；mag: 0..1 强度（撞击类用）
  function play(name, mag) {
    if (!ctx || muted) return;
    const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    if (lastPlay[name] && now - lastPlay[name] < 45) return; // 同类音效节流
    lastPlay[name] = now;
    const m = mag === undefined ? 1 : clamp(mag, 0, 1);
    switch (name) {
      case 'ui':      tone({ type: 'square', f0: 660, f1: 880, dur: 0.06, vol: 0.12 }); break;
      case 'launch':
        tone({ type: 'triangle', f0: 280, f1: 65, dur: 0.18, vol: 0.4 });
        noise({ type: 'bandpass', f0: 500, f1: 2600, dur: 0.24, vol: 0.24, q: 1.6 });
        break;
      case 'ability':
        tone({ type: 'sawtooth', f0: 240, f1: 980, dur: 0.16, vol: 0.22 });
        noise({ type: 'bandpass', f0: 900, f1: 3200, dur: 0.18, vol: 0.16, q: 2 });
        break;
      case 'wood':
        noise({ type: 'lowpass', f0: 900, dur: 0.09, vol: 0.10 + 0.3 * m });
        tone({ type: 'triangle', f0: 190, f1: 90, dur: 0.07, vol: 0.14 + 0.2 * m });
        break;
      case 'stone':
        noise({ type: 'highpass', f0: 1800, dur: 0.05, vol: 0.08 + 0.22 * m });
        tone({ type: 'sine', f0: 110, f1: 60, dur: 0.09, vol: 0.12 + 0.22 * m });
        break;
      case 'guard':
        tone({ type: 'square', f0: 540, f1: 250, dur: 0.11, vol: 0.16 + 0.12 * m });
        break;
      case 'guardDie':
        tone({ type: 'square', f0: 620, dur: 0.06, vol: 0.16 });
        tone({ type: 'square', f0: 460, dur: 0.06, vol: 0.15, delay: 0.07 });
        tone({ type: 'square', f0: 300, dur: 0.1, vol: 0.15, delay: 0.14 });
        noise({ type: 'lowpass', f0: 700, dur: 0.16, vol: 0.14, delay: 0.05 });
        break;
      case 'break':
        noise({ type: 'lowpass', f0: 1400, f1: 300, dur: 0.2, vol: 0.22 + 0.2 * m });
        tone({ type: 'triangle', f0: 140, f1: 55, dur: 0.14, vol: 0.18 });
        break;
      case 'boom':
        noise({ type: 'lowpass', f0: 2800, f1: 90, dur: 0.55, vol: 0.5 });
        tone({ type: 'sine', f0: 70, f1: 28, dur: 0.45, vol: 0.5 });
        break;
      case 'thud':
        noise({ type: 'lowpass', f0: 500, dur: 0.08, vol: 0.1 + 0.2 * m });
        break;
      case 'win':
        [523, 659, 784, 1046].forEach((f, i) =>
          tone({ type: 'triangle', f0: f, dur: 0.16, vol: 0.2, delay: i * 0.11 }));
        break;
      case 'lose':
        [392, 330, 262].forEach((f, i) =>
          tone({ type: 'triangle', f0: f, dur: 0.22, vol: 0.18, delay: i * 0.16 }));
        break;
    }
  }
  return {
    play, resume,
    get muted() { return muted; },
    toggle() { muted = !muted; Store.set(STORE_KEYS.muted, muted); return muted; },
  };
})();

/* ==================== 物理引擎（刚体 + 冲量求解） ==================== */
let bodySeq = 0;

function makeBody(o) {
  const mat = MAT[o.mat];
  const b = {
    id: o.id || ('x' + (bodySeq++)),
    kind: o.kind,            // 'block' | 'guard' | 'shot' | 'jar' | 'ground'
    mat: o.mat,
    shape: o.shape,          // 'rect' | 'circle'
    x: o.x, y: o.y, angle: o.angle || 0,
    vx: 0, vy: 0, va: 0,
    w: o.w || 0, h: o.h || 0, r: o.r || 0,
    static: !!o.static,
    rest: mat.rest, fric: mat.fric,
    hp: (o.hp !== undefined ? o.hp : mat.hp),
    thr: mat.thr, dk: mat.dk,
    sleeping: false, sleepT: 0,
    dead: false,
    hitFlash: 0,
    walkT: Math.random() * 6.28, // 守卫腿部摆动相位
  };
  b.maxHp = b.hp;
  const area = b.shape === 'circle' ? Math.PI * b.r * b.r : b.w * b.h;
  b.mass = b.static ? 0 : Math.max(0.5, area * mat.density);
  b.invMass = b.static ? 0 : 1 / b.mass;
  const inertia = b.shape === 'circle'
    ? 0.5 * b.mass * b.r * b.r
    : b.mass * (b.w * b.w + b.h * b.h) / 12;
  b.invI = b.static ? 0 : 1 / inertia;
  return b;
}

function bodyRadius(b) { // 粗略外接半径（宽相剔除用）
  return b.shape === 'circle' ? b.r : 0.5 * hypot(b.w, b.h);
}
function effInvMass(b) { return (b.static || b.sleeping) ? 0 : b.invMass; }
function effInvI(b) { return (b.static || b.sleeping) ? 0 : b.invI; }
function wake(b) {
  if (b.sleeping) { b.sleeping = false; b.sleepT = 0; }
}

// ---- 矩形顶点/轴 ----
function rectCorners(b) {
  const c = Math.cos(b.angle), s = Math.sin(b.angle);
  const hw = b.w / 2, hh = b.h / 2;
  return [
    { x: b.x + (-hw * c + hh * s), y: b.y + (-hw * s - hh * c) },
    { x: b.x + ( hw * c + hh * s), y: b.y + ( hw * s - hh * c) },
    { x: b.x + ( hw * c - hh * s), y: b.y + ( hw * s + hh * c) },
    { x: b.x + (-hw * c - hh * s), y: b.y + (-hw * s + hh * c) },
  ];
}
function rectAxes(b) {
  const c = Math.cos(b.angle), s = Math.sin(b.angle);
  return [{ x: c, y: s }, { x: -s, y: c }];
}
function pointInRect(b, px, py, margin) {
  const c = Math.cos(b.angle), s = Math.sin(b.angle);
  const dx = px - b.x, dy = py - b.y;
  const lx = dx * c + dy * s, ly = -dx * s + dy * c;
  const m = margin || 0;
  return Math.abs(lx) <= b.w / 2 + m && Math.abs(ly) <= b.h / 2 + m;
}

// ---- 窄相碰撞：输出接触点数组 {px,py,nx,ny,pen}，法线一律 a→b ----
function collideBodies(a, b, out) {
  if (a.shape === 'circle' && b.shape === 'circle') return circleCircle(a, b, out);
  if (a.shape === 'circle' && b.shape === 'rect') return circleRect(a, b, out, false);
  if (a.shape === 'rect' && b.shape === 'circle') return circleRect(b, a, out, true);
  return rectRect(a, b, out);
}

function circleCircle(a, b, out) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const rr = a.r + b.r;
  const d2 = dx * dx + dy * dy;
  if (d2 >= rr * rr) return 0;
  const d = Math.sqrt(d2) || 0.0001;
  const nx = dx / d, ny = dy / d;
  out.push({ px: a.x + nx * a.r, py: a.y + ny * a.r, nx, ny, pen: rr - d, a, b });
  return 1;
}

// c: 圆，r: 矩形；flip=true 时法线翻成 a=r → b=c
function circleRect(c, r, out, flip) {
  const ca = Math.cos(r.angle), sa = Math.sin(r.angle);
  const dx = c.x - r.x, dy = c.y - r.y;
  const lx = dx * ca + dy * sa;
  const ly = -dx * sa + dy * ca;
  const hw = r.w / 2, hh = r.h / 2;
  const clx = clamp(lx, -hw, hw), cly = clamp(ly, -hh, hh);
  let nx, ny, pen, px, py;
  if (clx === lx && cly === ly) {
    // 圆心在矩形内部：沿最浅穿透面弹出
    const ox = hw - Math.abs(lx), oy = hh - Math.abs(ly);
    let lnx = 0, lny = 0;
    if (ox < oy) { lnx = lx >= 0 ? 1 : -1; pen = ox + c.r; }
    else { lny = ly >= 0 ? 1 : -1; pen = oy + c.r; }
    nx = lnx * ca - lny * sa; ny = lnx * sa + lny * ca;
    px = c.x - nx * c.r * 0.5; py = c.y - ny * c.r * 0.5;
  } else {
    const ddx = lx - clx, ddy = ly - cly;
    const d2 = ddx * ddx + ddy * ddy;
    if (d2 >= c.r * c.r) return 0;
    const d = Math.sqrt(d2) || 0.0001;
    const lnx = ddx / d, lny = ddy / d;
    nx = lnx * ca - lny * sa; ny = lnx * sa + lny * ca;
    pen = c.r - d;
    px = r.x + clx * ca - cly * sa;
    py = r.y + clx * sa + cly * ca;
  }
  // 计算出的法线方向是 矩形→圆形
  // flip=true：a=矩形、b=圆形，a→b 即当前方向，保持
  // flip=false：a=圆形、b=矩形，a→b 需取反
  if (!flip) { nx = -nx; ny = -ny; }
  out.push({ px, py, nx, ny, pen, a: flip ? r : c, b: flip ? c : r });
  return 1;
}

// SAT 求法线与穿透，接触点取“互相包含的顶点”
function rectRect(a, b, out) {
  const cornersA = rectCorners(a), cornersB = rectCorners(b);
  const axes = rectAxes(a).concat(rectAxes(b));
  let minOv = Infinity, best = null;
  for (let i = 0; i < 4; i++) {
    const ax = axes[i];
    let minA = Infinity, maxA = -Infinity, minB = Infinity, maxB = -Infinity;
    for (const p of cornersA) { const d = p.x * ax.x + p.y * ax.y; if (d < minA) minA = d; if (d > maxA) maxA = d; }
    for (const p of cornersB) { const d = p.x * ax.x + p.y * ax.y; if (d < minB) minB = d; if (d > maxB) maxB = d; }
    const ov = Math.min(maxA, maxB) - Math.max(minA, minB);
    if (ov < 0) return 0;
    if (ov < minOv) { minOv = ov; best = ax; }
  }
  let nx = best.x, ny = best.y;
  if ((b.x - a.x) * nx + (b.y - a.y) * ny < 0) { nx = -nx; ny = -ny; }
  let n = 0;
  for (const p of cornersB) {
    if (pointInRect(a, p.x, p.y, 0.5)) { out.push({ px: p.x, py: p.y, nx, ny, pen: minOv, a, b }); n++; }
  }
  for (const p of cornersA) {
    if (pointInRect(b, p.x, p.y, 0.5)) { out.push({ px: p.x, py: p.y, nx, ny, pen: minOv, a, b }); n++; }
  }
  if (n === 0) { // 退化情形（十字交叉等）：取质心中点
    out.push({ px: (a.x + b.x) / 2, py: (a.y + b.y) / 2, nx, ny, pen: minOv, a, b });
    n = 1;
  }
  return n;
}

/* ==================== 世界 ==================== */
let bodies = [];
let contacts = [];
let parts = [];        // 粒子
let texts = [];        // 漂浮文字
let rings = [];        // 冲击波环
let pendingBooms = []; // 延迟爆炸（油桶连锁）

const POS_BETA = 0.2;
const SLOP = 0.5;
const ITERATIONS = 10;

function stepPhysics(dt) {
  // 1) 重力
  for (const b of bodies) {
    if (b.static || b.sleeping || b.dead) continue;
    b.vy += GRAVITY * dt;
    // 限速防爆
    const sp = hypot(b.vx, b.vy);
    if (sp > 2400) { b.vx *= 2400 / sp; b.vy *= 2400 / sp; }
    b.va = clamp(b.va, -22, 22);
  }

  // 2) 碰撞检测
  contacts.length = 0;
  const n = bodies.length;
  for (let i = 0; i < n; i++) {
    const a = bodies[i];
    if (a.dead) continue;
    for (let j = i + 1; j < n; j++) {
      const b = bodies[j];
      if (b.dead) continue;
      if ((a.static || a.sleeping) && (b.static || b.sleeping)) continue;
      // 宽相：外接圆
      const rr = bodyRadius(a) + bodyRadius(b) + 1;
      const dx = b.x - a.x, dy = b.y - a.y;
      if (dx * dx + dy * dy > rr * rr) continue;
      // 睡眠体被高速物体撞上 → 唤醒
      if (a.sleeping && (b.vx * b.vx + b.vy * b.vy > 3600)) wake(a);
      if (b.sleeping && (a.vx * a.vx + a.vy * a.vy > 3600)) wake(b);
      collideBodies(a, b, contacts);
    }
  }

  // 3) 预处理接触
  for (const c of contacts) {
    const a = c.a, b = c.b;
    c.rax = c.px - a.x; c.ray = c.py - a.y;
    c.rbx = c.px - b.x; c.rby = c.py - b.y;
    const am = effInvMass(a), bm = effInvMass(b);
    const ai = effInvI(a), bi = effInvI(b);
    const ran = c.rax * c.ny - c.ray * c.nx;
    const rbn = c.rbx * c.ny - c.rby * c.nx;
    c.kn = am + bm + ai * ran * ran + bi * rbn * rbn;
    const tx = -c.ny, ty = c.nx;
    const rat = c.rax * ty - c.ray * tx;
    const rbt = c.rbx * ty - c.rby * tx;
    c.kt = am + bm + ai * rat * rat + bi * rbt * rbt;
    const dvx = (b.vx - b.va * c.rby) - (a.vx - a.va * c.ray);
    const dvy = (b.vy + b.va * c.rbx) - (a.vy + a.va * c.rax);
    c.vn0 = dvx * c.nx + dvy * c.ny;
    let bias = POS_BETA / dt * Math.max(0, c.pen - SLOP);
    if (c.vn0 < -70) {
      const e = Math.sqrt(a.rest * b.rest);
      bias = Math.max(bias, -e * c.vn0);
    }
    c.bias = Math.min(bias, 260); // 偏置限速，防暴冲
    c.Pn = 0; c.Pt = 0;
  }

  // 4) 速度求解（顺序冲量 + 累积）
  for (let it = 0; it < ITERATIONS; it++) {
    for (const c of contacts) {
      const a = c.a, b = c.b;
      // 法向
      let dvx = (b.vx - b.va * c.rby) - (a.vx - a.va * c.ray);
      let dvy = (b.vy + b.va * c.rbx) - (a.vy + a.va * c.rax);
      const vn = dvx * c.nx + dvy * c.ny;
      let dL = (c.bias - vn) / c.kn;
      const newPn = Math.max(c.Pn + dL, 0);
      dL = newPn - c.Pn; c.Pn = newPn;
      applyImpulse(a, b, c, dL * c.nx, dL * c.ny);
      // 切向摩擦
      dvx = (b.vx - b.va * c.rby) - (a.vx - a.va * c.ray);
      dvy = (b.vy + b.va * c.rbx) - (a.vy + a.va * c.rax);
      const tx = -c.ny, ty = c.nx;
      const vt = dvx * tx + dvy * ty;
      dL = -vt / c.kt;
      const maxF = Math.sqrt(a.fric * b.fric) * c.Pn;
      const newPt = clamp(c.Pt + dL, -maxF, maxF);
      dL = newPt - c.Pt; c.Pt = newPt;
      applyImpulse(a, b, c, dL * tx, dL * ty);
    }
  }

  // 5) 冲击伤害 + 撞击音效（伤害要求足够法向接近速度，持续挤压不再每步结算）
  for (const c of contacts) {
    const impact = c.Pn;
    if (impact > 160) {
      wake(c.a); wake(c.b);
      const mag = clamp(impact / 2600, 0, 1);
      const noisy = c.a.kind === 'shot' || c.b.kind === 'shot' || mag > 0.3;
      if (noisy && (c.a.kind !== 'ground' && c.b.kind !== 'ground' || mag > 0.35)) {
        const other = c.a.kind === 'shot' ? c.b : (c.b.kind === 'shot' ? c.a : (c.a.mat === 'stone' || c.b.mat === 'stone' ? (c.a.mat === 'stone' ? c.a : c.b) : c.a));
        AudioSys.play(other.mat === 'stone' ? 'stone' : (other.kind === 'guard' ? 'guard' : (other.mat === 'wood' ? 'wood' : 'thud')), mag);
      } else if (mag > 0.4) {
        AudioSys.play('thud', mag);
      }
    }
    if (c.vn0 < -80) {
      applyImpactDamage(c.a, impact, c);
      applyImpactDamage(c.b, impact, c);
    }
  }

  // 6) 积分位置
  for (const b of bodies) {
    if (b.static || b.sleeping || b.dead) continue;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.angle += b.va * dt;
  }

  // 7) 视觉计时（含睡眠体）+ 睡眠管理
  for (const b of bodies) {
    if (b.static || b.dead) continue;
    const sp2 = b.vx * b.vx + b.vy * b.vy;
    b.hitFlash = Math.max(0, b.hitFlash - dt * 5);
    b.walkT += dt * (1 + Math.min(6, Math.sqrt(sp2) / 40));
    if (b.sleeping) continue;
    if (sp2 < 49 && Math.abs(b.va) < 0.14) {
      b.sleepT += dt;
      if (b.sleepT > 0.55) { b.sleeping = true; b.vx = b.vy = b.va = 0; }
    } else {
      b.sleepT = 0;
    }
  }

  // 8) 出界清理
  for (const b of bodies) {
    if (b.dead || b.static) continue;
    if (b.y > WORLD_H + 220 || b.x < -320 || b.x > WORLD_W + 320) {
      if (b.kind === 'guard') { killBody(b, 'fell'); }
      else if (b.kind === 'shot') { b.dead = true; }
      else b.dead = true;
    }
  }

  // 9) 延迟爆炸
  for (let i = pendingBooms.length - 1; i >= 0; i--) {
    pendingBooms[i].t -= dt;
    if (pendingBooms[i].t <= 0) {
      const bo = pendingBooms.splice(i, 1)[0];
      const ex = bo.excludeShot ? (bodies.find(x => x.kind === 'shot') || null) : (bo.exclude || null);
      explode(bo.x, bo.y, bo.r, bo.dmg, bo.power, ex);
    }
  }

  // 10) 尸体清扫
  if (bodies.some(b => b.dead)) bodies = bodies.filter(b => !b.dead);
}

function applyImpulse(a, b, c, ix, iy) {
  const am = effInvMass(a), bm = effInvMass(b);
  if (am > 0) {
    a.vx -= ix * am; a.vy -= iy * am;
    a.va -= effInvI(a) * (c.rax * iy - c.ray * ix);
  }
  if (bm > 0) {
    b.vx += ix * bm; b.vy += iy * bm;
    b.va += effInvI(b) * (c.rbx * iy - c.rby * ix);
  }
}

function applyImpactDamage(b, impact, c) {
  if (b.hp >= 1e29 || b.dead || impact <= b.thr) return;
  let dmg = (impact - b.thr) * b.dk;
  const other = c.a === b ? c.b : c.a;
  if (other.kind === 'shot') {
    dmg *= 1.3;                          // 燧石弹直击加成
    if (other.empowered) dmg *= 2.2;     // 裂地坠击强化
  } else if (b.kind === 'guard') {
    dmg = Math.min(dmg, 34);             // 压砸伤害封顶，避免一次倒塌全灭
  }
  damageBody(b, dmg, other);
}

function damageBody(b, dmg, source) {
  if (b.dead || b.hp >= 1e29 || dmg <= 0) return;
  b.hp -= dmg;
  b.hitFlash = 1;
  wake(b);
  if (b.kind === 'guard') {
    Game.addPopup(b.x, b.y - b.r - 8, dmg >= b.hp ? '' : '-' + Math.min(999, Math.round(dmg * 2)), '#ffe8c8');
    if (b.hp > 0) { Game.addScore(SCORE.hitGuard, b.x, b.y - b.r - 20); AudioSys.play('guard', 0.7); }
  }
  if (b.hp <= 0) killBody(b, source && source.kind === 'shot' ? 'shot' : 'crush');
}

function killBody(b, cause) {
  if (b.dead) return;
  b.dead = true;
  if (b.kind === 'guard') {
    Game.defeatedGuards[b.id] = { id: b.id, x: round1(b.x), y: round1(b.y), hp: 0, defeated: true };
    Game.addScore(SCORE.killGuard, b.x, b.y - 30);
    spawnPoof(b.x, b.y, '#c16532');
    spawnStars(b.x, b.y - 10);
    AudioSys.play('guardDie');
    Game.shake(0.35);
  } else if (b.kind === 'jar') {
    Game.addScore(SCORE.breakJar, b.x, b.y - 20);
    // 油桶爆炸（轻微延迟，方便连锁）；气浪不推发射物，防止一弹连锁清场
    pendingBooms.push({ x: b.x, y: b.y, r: 120, dmg: 115, power: 1500, t: 0.06, excludeShot: true });
    spawnDebris(b.x, b.y, '#a8542c', 10);
  } else if (b.kind === 'block') {
    Game.addScore(SCORE.breakBlock, b.x, b.y - 14);
    spawnDebris(b.x, b.y, b.mat === 'stone' ? '#8d8579' : '#a06a35', b.mat === 'stone' ? 9 : 12);
    AudioSys.play('break', 0.8);
    if (b.mat === 'stone') Game.shake(0.3);
  }
}

// 爆炸：径向冲量 + 伤害
function explode(x, y, radius, dmg, power, exclude) {
  AudioSys.play('boom');
  Game.shake(0.85);
  spawnExplosion(x, y, radius);
  rings.push({ x, y, r: 10, maxR: radius * 1.15, life: 0.42, maxLife: 0.42 });
  for (const b of bodies) {
    if (b.dead || b.static || b === exclude) continue;
    const br = bodyRadius(b);
    const dx = b.x - x, dy = b.y - y;
    const d = hypot(dx, dy) || 0.001;
    if (d > radius + br) continue;
    const f = clamp(1 - d / (radius + br), 0, 1);
    wake(b);
    if (!b.static) {
      const imp = power * f;
      b.vx += (dx / d) * imp * b.invMass;
      b.vy += (dy / d - 0.45) * imp * b.invMass; // 略带上掀
      b.va += (fxRand() - 0.5) * 6 * f;
    }
    damageBody(b, dmg * f, null);
  }
}

/* ==================== 粒子 / 漂浮文字 ==================== */
function spawnPart(p) {
  if (parts.length >= 420) return;
  parts.push(Object.assign({
    vx: 0, vy: 0, g: 1, life: 0.6, maxLife: 0.6,
    size: 3, color: '#fff', kind: 'dot',
    rot: Math.random() * 6.28, vr: (Math.random() - 0.5) * 10,
  }, p));
}
function spawnDebris(x, y, color, n) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * 6.28, sp = 60 + Math.random() * 260;
    spawnPart({
      x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 120,
      life: 0.5 + Math.random() * 0.5, size: 2.5 + Math.random() * 4.5,
      color, kind: 'chip',
    });
  }
}
function spawnPoof(x, y, color) {
  for (let i = 0; i < 10; i++) {
    const a = Math.random() * 6.28, sp = 30 + Math.random() * 90;
    spawnPart({
      x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40,
      g: 0.15, life: 0.5 + Math.random() * 0.35, size: 6 + Math.random() * 9,
      color, kind: 'smoke',
    });
  }
}
function spawnStars(x, y) {
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + (i - 2.5) * 0.5;
    spawnPart({
      x, y, vx: Math.cos(a) * (90 + Math.random() * 70), vy: Math.sin(a) * (120 + Math.random() * 80),
      g: 0.5, life: 0.7 + Math.random() * 0.3, size: 4 + Math.random() * 3,
      color: '#ffd75e', kind: 'star',
    });
  }
}
function spawnExplosion(x, y, radius) {
  for (let i = 0; i < 26; i++) {
    const a = Math.random() * 6.28, sp = 80 + Math.random() * 340;
    spawnPart({
      x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60,
      g: 0.4, life: 0.35 + Math.random() * 0.4, size: 4 + Math.random() * 7,
      color: ['#ffdd66', '#ff9d45', '#e2692e', '#8a3f1f'][i % 4], kind: 'dot',
    });
  }
  for (let i = 0; i < 12; i++) {
    const a = Math.random() * 6.28, sp = 30 + Math.random() * 120;
    spawnPart({
      x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 70,
      g: 0.1, life: 0.7 + Math.random() * 0.5, size: 9 + Math.random() * 13,
      color: '#3a3136', kind: 'smoke',
    });
  }
  for (let i = 0; i < 10; i++) {
    const a = Math.random() * 6.28, sp = 300 + Math.random() * 420;
    spawnPart({
      x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      g: 0.7, life: 0.3 + Math.random() * 0.2, size: 2,
      color: '#ffe9b0', kind: 'spark',
    });
  }
}
function spawnDust(x, y, n) {
  for (let i = 0; i < (n || 6); i++) {
    const a = Math.random() * 6.28, sp = 20 + Math.random() * 80;
    spawnPart({
      x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 30,
      g: 0.25, life: 0.4 + Math.random() * 0.4, size: 4 + Math.random() * 6,
      color: '#b9926b', kind: 'smoke',
    });
  }
}
function updateParts(dt) {
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    p.life -= dt;
    if (p.life <= 0) { parts.splice(i, 1); continue; }
    p.vy += GRAVITY * 0.55 * p.g * dt;
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.rot += p.vr * dt;
    if (p.kind !== 'smoke' && p.y > GROUND_Y - 2) { p.y = GROUND_Y - 2; p.vy *= -0.35; p.vx *= 0.7; }
  }
}
function updateTexts(dt) {
  for (let i = texts.length - 1; i >= 0; i--) {
    const t = texts[i];
    t.life -= dt; t.y -= 34 * dt;
    if (t.life <= 0) texts.splice(i, 1);
  }
}
function updateRings(dt) {
  for (let i = rings.length - 1; i >= 0; i--) {
    const r = rings[i];
    r.life -= dt;
    r.r = lerp(r.maxR, 10, Math.max(0, r.life / r.maxLife));
    if (r.life <= 0) rings.splice(i, 1);
  }
}

/* ==================== 关卡定义 ==================== */
// 所有坐标为世界坐标（1280×720），地面顶面 y=624。
const LEVELS = [
  {
    name: '枯木哨塔', shots: 4, seed: 11,
    build(add) {
      add.block(846, 559, 24, 130, 'wood');
      add.block(966, 559, 24, 130, 'wood');
      add.block(906, 483, 180, 22, 'wood');
      add.guard(906, 448, 24, 45);
      add.guard(884, 598, 26, 45);
      add.jar(936, 606, 18);
    },
  },
  {
    name: '双层水塔', shots: 4, seed: 27,
    build(add) {
      add.block(850, 596, 56, 56, 'stone');
      add.block(962, 596, 56, 56, 'stone');
      add.block(850, 513, 22, 110, 'wood');
      add.block(962, 513, 22, 110, 'wood');
      add.block(906, 448, 170, 20, 'wood');
      add.block(872, 390, 22, 96, 'wood');
      add.block(940, 390, 22, 96, 'wood');
      add.block(906, 329, 150, 26, 'stone');
      add.guard(906, 292, 24);
      add.guard(906, 414, 24);
      add.guard(906, 598, 26);
    },
  },
  {
    name: '石门要塞', shots: 5, seed: 43,
    build(add) {
      // 左侧木哨楼
      add.block(786, 569, 22, 110, 'wood');
      add.block(854, 569, 22, 110, 'wood');
      add.block(820, 504, 150, 20, 'wood');
      add.block(794, 449, 22, 90, 'wood');
      add.block(846, 449, 22, 90, 'wood');
      add.block(820, 394, 140, 20, 'wood');
      add.jar(820, 604, 20);
      add.guard(820, 360, 24);
      add.guard(820, 470, 24);
      // 右侧石门
      add.block(940, 549, 44, 150, 'stone');
      add.block(1080, 549, 44, 150, 'stone');
      add.block(1010, 459, 170, 30, 'stone');
      add.jar(1040, 606, 18);
      add.guard(990, 598, 26);
      add.guard(1010, 420, 24);
    },
  },
];

let castleCenter = 950;
let autoAbilityX = 0; // 自检钩子：发射物飞过该 x 时自动触发能力（0=关闭）

function buildLevel(idx) {
  bodies = [];
  parts.length = 0; texts.length = 0; rings.length = 0; pendingBooms.length = 0;
  contacts.length = 0;
  fxRandState.s = (idx * 777 + 1) >>> 0;
  const ground = makeBody({
    id: 'ground', kind: 'ground', mat: 'stone', shape: 'rect',
    x: WORLD_W / 2, y: GROUND_Y + 68, w: WORLD_W + 900, h: 136, static: true, hp: 1e30,
  });
  bodies.push(ground);
  let bi = 0, gi = 0, ji = 0;
  const add = {
    block(x, y, w, h, mat, angle) {
      const b = makeBody({ id: 'B' + (bi++), kind: 'block', mat, shape: 'rect', x, y, w, h, angle: angle || 0 });
      bodies.push(b); return b;
    },
    guard(x, y, r, hp) {
      const b = makeBody({ id: 'G' + (gi++), kind: 'guard', mat: 'flesh', shape: 'circle', x, y, r, hp: hp || (55 + idx * 10) });
      bodies.push(b); return b;
    },
    jar(x, y, r) {
      const b = makeBody({ id: 'J' + (ji++), kind: 'jar', mat: 'jar', shape: 'circle', x, y, r });
      bodies.push(b); return b;
    },
  };
  LEVELS[idx - 1].build(add);
  let sx = 0, n = 0;
  for (const b of bodies) { if (b.kind !== 'ground') { sx += b.x; n++; } }
  castleCenter = n ? sx / n : 950;
}

/* ==================== 游戏状态 ==================== */
const Game = {
  phase: 'menu',           // menu | aiming | flying | settling | levelclear | gameover | victory
  level: 1,
  score: 0,
  scoreAtLevelStart: 0,
  shotsLeft: 0,
  paused: false,
  shot: null,
  abilityUsed: false,
  pull: { x: 0, y: 0 },
  dragging: false,
  turnTime: 0,
  settleTime: 0,
  winTimer: 0,
  overlayTimer: -1,
  pendingOverlay: null,
  trauma: 0,
  bandWobble: 0,
  snapAnim: null,
  everLaunched: false,
  defeatedGuards: {},
  best: Store.get(STORE_KEYS.best, 0),
  unlocked: clamp(Store.get(STORE_KEYS.unlocked, 1), 1, LEVELS.length),

  addScore(n, x, y) {
    this.score += n;
    if (x !== undefined) this.addPopup(x, y, '+' + n, '#ffd75e');
    UI.dirtyHud = true;
  },
  addPopup(x, y, txt, color) {
    if (!txt || texts.length >= 24) return;
    texts.push({ x, y, txt, color, life: 0.9, maxLife: 0.9 });
  },
  shake(v) { this.trauma = Math.min(1, this.trauma + v); },
};

function aliveGuards() {
  let n = 0;
  for (const b of bodies) if (b.kind === 'guard' && !b.dead) n++;
  return n;
}
function dynamicsCalm() {
  for (const b of bodies) {
    if (b.static || b.dead || b.sleeping || b.kind === 'ground') continue;
    if (b.vx * b.vx + b.vy * b.vy > 81) return false;
  }
  return true;
}
function forceCalm() {
  for (const b of bodies) {
    if (b.static || b.dead || b.kind === 'ground') continue;
    if (b.vx * b.vx + b.vy * b.vy < 2500) { b.sleeping = true; b.vx = b.vy = b.va = 0; }
  }
}

function loadShot() {
  Game.shot = makeBody({ id: 'shot', kind: 'shot', mat: 'shot', shape: 'circle', x: ANCHOR.x, y: ANCHOR.y, r: SHOT_R });
  Game.shot.loaded = true; // 待发射：不入物理世界
  Game.shot.trail = [];
  Game.shot.popT = 0;
  Game.abilityUsed = false;
}

function aim(dx, dy) {
  if (Game.phase !== 'aiming' || !Game.shot || !Game.shot.loaded) return null;
  const len = hypot(dx, dy);
  if (len > MAX_PULL) { dx *= MAX_PULL / len; dy *= MAX_PULL / len; }
  Game.pull.x = dx; Game.pull.y = dy;
  Game.shot.x = ANCHOR.x + dx;
  Game.shot.y = ANCHOR.y + dy;
  Game.snapAnim = null;
  return { dx: Game.pull.x, dy: Game.pull.y };
}

function launchShot() {
  const s = Game.shot;
  if (Game.phase !== 'aiming' || !s || !s.loaded) return false;
  const pullLen = hypot(Game.pull.x, Game.pull.y);
  if (pullLen < 18) return false;
  let vx = -Game.pull.x * LAUNCH_K;
  let vy = -Game.pull.y * LAUNCH_K;
  const sp = hypot(vx, vy);
  if (sp > MAX_SPEED) { vx *= MAX_SPEED / sp; vy *= MAX_SPEED / sp; }
  s.loaded = false;
  s.vx = vx; s.vy = vy;
  s.va = -Game.pull.x * 0.02;
  bodies.push(s);
  Game.shotsLeft--;
  Game.phase = 'flying';
  Game.turnTime = 0; Game.settleTime = 0;
  Game.dragging = false;
  Game.bandWobble = 1;
  Game.everLaunched = true;
  Game.pull.x = 0; Game.pull.y = 0;
  AudioSys.play('launch');
  UI.hideHint();
  UI.dirtyHud = true;
  return true;
}

function activateAbility() {
  const s = Game.shot;
  if (Game.phase !== 'flying' || Game.abilityUsed || !s || s.dead || s.loaded) return false;
  Game.abilityUsed = true;
  s.empowered = true;
  s.vy = Math.max(s.vy, 0) + 820;
  s.vx *= 0.4;
  rings.push({ x: s.x, y: s.y, r: 8, maxR: 60, life: 0.3, maxLife: 0.3, color: '255,211,122' });
  Game.shake(0.2);
  AudioSys.play('ability');
  UI.showHintOnce('裂地坠击！');
  return true;
}

// 强化弹首次触地/触物 → 冲击波
function checkEmpoweredImpact() {
  const s = Game.shot;
  if (!s || !s.empowered || s.dead || s.loaded) return;
  for (const c of contacts) {
    if (c.a === s || c.b === s) {
      explode(s.x, s.y, 90, 32, 1080, s);
      rings.push({ x: s.x, y: s.y, r: 12, maxR: 150, life: 0.4, maxLife: 0.4, color: '255,211,122' });
      spawnDust(s.x, s.y, 10);
      s.dead = true;
      Game.shake(0.55);
      break;
    }
  }
}

function endTurn() {
  const s = Game.shot;
  if (s && !s.loaded && !s.dead) {
    spawnDust(s.x, Math.min(s.y, GROUND_Y), 5);
    s.dead = true;
  }
  bodies = bodies.filter(b => !b.dead);
  Game.pull.x = 0; Game.pull.y = 0;
  Game.dragging = false;
  if (aliveGuards() === 0) { onLevelClear(); return; }
  if (Game.shotsLeft > 0) {
    loadShot();
    Game.phase = 'aiming';
    UI.dirtyHud = true;
  } else {
    onGameOver();
  }
}

function onLevelClear() {
  const last = Game.level >= LEVELS.length;
  const bonus = Game.shotsLeft * SCORE.shotBonus;
  if (bonus > 0) Game.addScore(bonus, castleCenter, 300);
  Game.phase = last ? 'victory' : 'levelclear';
  Game.unlocked = clamp(Math.max(Game.unlocked, Game.level + 1), 1, LEVELS.length);
  Store.set(STORE_KEYS.unlocked, Game.unlocked);
  if (Game.score > Game.best) { Game.best = Game.score; Store.set(STORE_KEYS.best, Game.best); }
  AudioSys.play('win');
  UI.toast(last ? '峡谷光复！' : '哨塔告破！');
  Game.overlayTimer = 1.2;
  Game.pendingOverlay = last ? 'victory' : 'clear';
}

function onGameOver() {
  Game.phase = 'gameover';
  if (Game.score > Game.best) { Game.best = Game.score; Store.set(STORE_KEYS.best, Game.best); }
  AudioSys.play('lose');
  UI.toast('弹药耗尽……');
  Game.overlayTimer = 1.1;
  Game.pendingOverlay = 'over';
}

function beginLevel(n) {
  Game.level = clamp(Math.round(n) || 1, 1, LEVELS.length);
  genRidges(LEVELS[Game.level - 1].seed);
  buildLevel(Game.level);
  Game.defeatedGuards = {};
  Game.shotsLeft = LEVELS[Game.level - 1].shots;
  Game.phase = 'aiming';
  Game.pull.x = 0; Game.pull.y = 0;
  Game.dragging = false;
  Game.turnTime = 0; Game.settleTime = 0; Game.winTimer = 0;
  Game.overlayTimer = -1; Game.pendingOverlay = null;
  Game.trauma = 0;
  loadShot();
  Cam.snapToSling();
  UI.onLevelBegin();
}

function startCampaign() {
  Game.score = 0;
  Game.scoreAtLevelStart = 0;
  beginLevel(1);
}
function restartLevel() {
  Game.score = Game.scoreAtLevelStart;
  beginLevel(Game.level);
}
function nextLevel() {
  Game.scoreAtLevelStart = Game.score;
  beginLevel(Game.level + 1);
}
function toMenu() {
  Game.phase = 'menu';
  Game.paused = false;
  buildLevel(Game.level);
  Game.shot = null;
  UI.showStart();
}

/* ==================== 相机 ==================== */
const Cam = {
  cw: WORLD_W, ch: WORLD_H,
  s: 1, ox: 0, oy: 0,
  x: 0, tx: 0,
  dynamic: false,
  resize(w, h) {
    this.cw = w; this.ch = h;
    const base = Math.min(w / WORLD_W, h / WORLD_H);
    this.dynamic = base < 0.55;
    if (!this.dynamic) {
      this.s = base;
      this.x = 0; this.tx = 0;
      this.ox = (w - WORLD_W * base) / 2;
      this.oy = (h - WORLD_H * base) / 2;
    } else {
      this.s = clamp(base * 1.6, base, h / WORLD_H);
      this.oy = (h - WORLD_H * this.s) / 2;
      this.ox = 0;
      this.x = clamp(this.x, this.minX(), this.maxX());
      this.tx = clamp(this.tx, this.minX(), this.maxX());
    }
  },
  viewW() { return this.cw / this.s; },
  minX() { return Math.min(0, WORLD_W - this.viewW()); },
  maxX() { return Math.max(0, WORLD_W - this.viewW()); },
  snapToSling() { this.x = this.tx = clamp(0, this.minX(), this.maxX()); },
  update(dt) {
    if (!this.dynamic) return;
    let target = this.tx;
    if (Game.phase === 'flying' && Game.shot && !Game.shot.dead && !Game.shot.loaded) {
      target = clamp(Game.shot.x - this.viewW() * 0.38, this.minX(), this.maxX());
      this.tx = target;
    } else if (Game.phase === 'settling' || Game.phase === 'levelclear' || Game.phase === 'gameover' || Game.phase === 'victory') {
      this.tx = clamp(castleCenter - this.viewW() * 0.5, this.minX(), this.maxX());
      target = this.tx;
    }
    const k = Math.min(1, dt * 5.5);
    this.x += (target - this.x) * k;
  },
  panBy(dxScreen) {
    if (!this.dynamic) return;
    this.tx = clamp(this.tx - dxScreen / this.s, this.minX(), this.maxX());
    this.x = this.tx;
  },
  toWorld(cx, cy, rect) {
    const sx = cx - rect.left, sy = cy - rect.top;
    return { x: (sx - this.ox) / this.s + this.x, y: (sy - this.oy) / this.s };
  },
};

/* ==================== 回合状态机 + 每步逻辑 ==================== */
function stepSim(dt) {
  if (Game.phase === 'flying' || Game.phase === 'settling') Game.turnTime += dt;

  // 松手回弹动画
  if (Game.snapAnim) {
    const sn = Game.snapAnim;
    sn.t += dt / 0.13;
    if (sn.t >= 1) { Game.snapAnim = null; if (Game.shot && Game.shot.loaded) { Game.shot.x = ANCHOR.x; Game.shot.y = ANCHOR.y; } Game.pull.x = 0; Game.pull.y = 0; }
    else if (Game.shot && Game.shot.loaded) {
      Game.shot.x = lerp(sn.fx, ANCHOR.x, sn.t);
      Game.shot.y = lerp(sn.fy, ANCHOR.y, sn.t);
      Game.pull.x = Game.shot.x - ANCHOR.x;
      Game.pull.y = Game.shot.y - ANCHOR.y;
    }
  }
  Game.bandWobble = Math.max(0, Game.bandWobble - dt * 3);
  if (Game.shot && Game.shot.loaded) Game.shot.popT = Math.min(1, (Game.shot.popT || 0) + dt * 5);

  stepPhysics(dt);
  checkEmpoweredImpact();

  // 拖尾
  const s = Game.shot;
  if (s && !s.loaded && !s.dead && (Game.phase === 'flying' || Game.phase === 'settling')) {
    s.trail.push({ x: s.x, y: s.y });
    if (s.trail.length > 26) s.trail.shift();
    if (s.empowered) {
      spawnPart({
        x: s.x + (Math.random() - 0.5) * 8, y: s.y + (Math.random() - 0.5) * 8,
        vx: (Math.random() - 0.5) * 40, vy: -30 - Math.random() * 40,
        g: 0.1, life: 0.35, size: 2.5 + Math.random() * 2, color: '#ffb347', kind: 'dot',
      });
    }
  }

  updateParts(dt);
  updateTexts(dt);
  updateRings(dt);
  Game.trauma = Math.max(0, Game.trauma - dt * 1.7);
  Cam.update(dt);

  // --- 回合流转 ---
  if (Game.phase === 'flying') {
    if (autoAbilityX > 0 && s && !s.dead && !s.loaded && s.x >= autoAbilityX) {
      activateAbility();
      autoAbilityX = 0;
    }
    const sh = Game.shot;
    const gone = !sh || sh.dead || sh.x < -120 || sh.x > WORLD_W + 140 || sh.y > WORLD_H + 100;
    if (gone || sh.sleeping || Game.turnTime > 6.5) {
      if (Game.turnTime > 6.5) forceCalm();
      Game.phase = 'settling';
      Game.settleTime = 0;
    }
  }
  if (Game.phase === 'settling') {
    if (dynamicsCalm()) Game.settleTime += dt; else Game.settleTime = 0;
    if (Game.turnTime > 7) forceCalm();
    if (Game.settleTime > 0.6 || Game.turnTime > 9) endTurn();
  }
  // 胜利判定（守卫全灭，进行中任意阶段）
  if (Game.phase === 'aiming' || Game.phase === 'flying' || Game.phase === 'settling') {
    if (aliveGuards() === 0) {
      Game.winTimer += dt;
      if (Game.winTimer > 0.6) onLevelClear();
    } else Game.winTimer = 0;
  }
  // 结算浮层延迟弹出
  if (Game.overlayTimer > 0) {
    Game.overlayTimer -= dt;
    if (Game.overlayTimer <= 0) UI.showResult(Game.pendingOverlay);
  }
}

/* ==================== 输入 ==================== */
let panState = null;

function pointerPos(e) {
  const rect = canvas.getBoundingClientRect();
  return Cam.toWorld(e.clientX, e.clientY, rect);
}

function onPointerDown(e) {
  AudioSys.resume();
  if (Game.paused) return;
  const p = pointerPos(e);
  if (Game.phase === 'aiming' && Game.shot && Game.shot.loaded) {
    const d = hypot(p.x - Game.shot.x, p.y - Game.shot.y);
    if (d < 105) {
      Game.dragging = true;
      Game.snapAnim = null;
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* 忽略 */ }
      aim(p.x - ANCHOR.x, p.y - ANCHOR.y);
      e.preventDefault();
      return;
    }
    if (Cam.dynamic) {
      panState = { x: e.clientX };
      e.preventDefault();
    }
  } else if (Game.phase === 'flying') {
    activateAbility();
    e.preventDefault();
  }
}
function onPointerMove(e) {
  if (Game.dragging && Game.phase === 'aiming') {
    const p = pointerPos(e);
    aim(p.x - ANCHOR.x, p.y - ANCHOR.y);
    e.preventDefault();
  } else if (panState) {
    Cam.panBy(e.clientX - panState.x);
    panState.x = e.clientX;
    e.preventDefault();
  }
}
function onPointerUp(e) {
  if (Game.dragging) {
    Game.dragging = false;
    const pullLen = hypot(Game.pull.x, Game.pull.y);
    if (pullLen >= 18) {
      launchShot();
    } else if (Game.shot && Game.shot.loaded) {
      Game.snapAnim = { fx: Game.shot.x, fy: Game.shot.y, t: 0 };
      AudioSys.play('ui');
    }
    e.preventDefault();
  }
  panState = null;
}

function onKeyDown(e) {
  if (e.code === 'Space') {
    if (Game.phase === 'flying') { AudioSys.resume(); activateAbility(); }
    else if (Game.phase === 'menu') { AudioSys.resume(); pressStart(); }
    e.preventDefault();
  } else if (e.code === 'KeyP' || e.code === 'Escape') {
    if (Game.phase !== 'menu') togglePause();
  } else if (e.code === 'KeyR') {
    if (Game.phase !== 'menu') { AudioSys.play('ui'); hideOverlays(); restartLevel(); }
  } else if (e.code === 'KeyM') {
    UI.setMute(AudioSys.toggle());
  }
}

function togglePause() {
  if (Game.paused) { Game.paused = false; UI.hidePause(); }
  else if (Game.phase !== 'menu') { Game.paused = true; UI.showPause(); }
  UI.dirtyHud = true;
}

/* ==================== 渲染 ==================== */
let canvas = null, ctx = null, dpr = 1;
let bgCache = null, vigCache = null;
let ridgesFar = [], ridgesNear = [];

const FLINT_JITTER = [1, 0.86, 1.04, 0.9, 1.08, 0.88, 1.02, 0.94];

function genRidges(seed) {
  const rnd = seededRand(seed * 997 + 7);
  ridgesFar = []; ridgesNear = [];
  let x = -320;
  while (x < 1750) {
    const w = 90 + rnd() * 150;
    const y = 400 + rnd() * 110;
    ridgesFar.push({ x, y });
    ridgesFar.push({ x: x + w * 0.4, y: y - 14 - rnd() * 30 });
    ridgesFar.push({ x: x + w * 0.7, y: y - 14 - rnd() * 30 });
    x += w;
  }
  x = -320;
  while (x < 1750) {
    const w = 120 + rnd() * 190;
    const y = 490 + rnd() * 90;
    ridgesNear.push({ x, y });
    ridgesNear.push({ x: x + w * 0.45, y: y - 10 - rnd() * 26 });
    x += w;
  }
}

function buildBackground() {
  if (!canvas || typeof document === 'undefined') return;
  const w = Cam.cw, h = Cam.ch;
  bgCache = document.createElement('canvas');
  bgCache.width = Math.max(1, Math.round(w * dpr));
  bgCache.height = Math.max(1, Math.round(h * dpr));
  const g = bgCache.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  // 黄昏天空
  const sky = g.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#241832');
  sky.addColorStop(0.42, '#4a2440');
  sky.addColorStop(0.68, '#8a3a3a');
  sky.addColorStop(0.86, '#e2803a');
  sky.addColorStop(1, '#f2a54a');
  g.fillStyle = sky;
  g.fillRect(0, 0, w, h);
  // 星星
  const rnd = seededRand(99);
  g.fillStyle = '#ffe8c8';
  for (let i = 0; i < 70; i++) {
    const sx = rnd() * w, sy = rnd() * h * 0.4;
    g.globalAlpha = 0.15 + rnd() * 0.5;
    g.fillRect(sx, sy, rnd() < 0.2 ? 2 : 1, rnd() < 0.2 ? 2 : 1);
  }
  g.globalAlpha = 1;
  // 落日
  const sunX = w * 0.78, sunY = h * 0.30;
  const glow = g.createRadialGradient(sunX, sunY, 8, sunX, sunY, h * 0.34);
  glow.addColorStop(0, 'rgba(255,210,122,0.9)');
  glow.addColorStop(0.25, 'rgba(255,170,90,0.35)');
  glow.addColorStop(1, 'rgba(255,150,80,0)');
  g.fillStyle = glow;
  g.fillRect(0, 0, w, h);
  g.fillStyle = '#ffe9b0';
  g.beginPath(); g.arc(sunX, sunY, h * 0.052, 0, 6.29); g.fill();
  // 云
  for (let i = 0; i < 5; i++) {
    const cx = rnd() * w, cy = h * (0.12 + rnd() * 0.3), cw = 60 + rnd() * 130;
    g.globalAlpha = 0.10 + rnd() * 0.1;
    g.fillStyle = '#ffd9a0';
    g.beginPath();
    g.ellipse(cx, cy, cw, cw * 0.16, 0, 0, 6.29);
    g.ellipse(cx + cw * 0.3, cy - cw * 0.07, cw * 0.5, cw * 0.11, 0, 0, 6.29);
    g.fill();
  }
  g.globalAlpha = 1;
}

function buildVignette() {
  if (!canvas || typeof document === 'undefined') return;
  const w = Cam.cw, h = Cam.ch;
  vigCache = document.createElement('canvas');
  vigCache.width = Math.max(1, Math.round(w * dpr));
  vigCache.height = Math.max(1, Math.round(h * dpr));
  const g = vigCache.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const v = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.72);
  v.addColorStop(0, 'rgba(18,8,16,0)');
  v.addColorStop(1, 'rgba(18,8,16,0.38)');
  g.fillStyle = v;
  g.fillRect(0, 0, w, h);
}

function drawRidge(points, color, parallax) {
  ctx.save();
  ctx.translate(Cam.x * (1 - parallax), 0);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(points[0].x - 60, GROUND_Y + 80);
  for (const p of points) ctx.lineTo(p.x, p.y);
  ctx.lineTo(points[points.length - 1].x + 60, GROUND_Y + 80);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawGround() {
  const g = ctx.createLinearGradient(0, GROUND_Y, 0, WORLD_H + 40);
  g.addColorStop(0, '#7a4a2c');
  g.addColorStop(0.25, '#5d3722');
  g.addColorStop(1, '#3a2114');
  ctx.fillStyle = g;
  ctx.fillRect(-400, GROUND_Y, WORLD_W + 800, 1700); // 向下延伸，覆盖移动端相机视野
  // 顶面高光
  ctx.fillStyle = '#a3673a';
  ctx.fillRect(-400, GROUND_Y, WORLD_W + 800, 3);
  // 纹理（按关卡种子确定性生成）
  const rnd = seededRand(LEVELS[Game.level - 1].seed * 31 + 5);
  ctx.strokeStyle = 'rgba(40,22,12,0.5)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 46; i++) {
    const x = -200 + rnd() * (WORLD_W + 400);
    const y = GROUND_Y + 8 + rnd() * 70;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 8 + rnd() * 22, y + rnd() * 4 - 2);
    ctx.stroke();
  }
  // 石砾与草簇
  for (let i = 0; i < 34; i++) {
    const x = -200 + rnd() * (WORLD_W + 400);
    if (rnd() < 0.5) {
      ctx.fillStyle = rnd() < 0.5 ? '#8a5a34' : '#6b4423';
      ctx.beginPath();
      ctx.ellipse(x, GROUND_Y - 1.5, 2 + rnd() * 4, 1.5 + rnd() * 2, 0, 0, 6.29);
      ctx.fill();
    } else {
      ctx.strokeStyle = '#4d5a2a';
      ctx.lineWidth = 1.6;
      for (let k = 0; k < 3; k++) {
        ctx.beginPath();
        ctx.moveTo(x + k * 3 - 3, GROUND_Y);
        ctx.lineTo(x + k * 3 - 3 + (rnd() * 6 - 3), GROUND_Y - 6 - rnd() * 7);
        ctx.stroke();
      }
    }
  }
}

function drawSlingTrunk() {
  ctx.save();
  ctx.lineCap = 'round';
  // 主干
  ctx.strokeStyle = '#5a3218';
  ctx.lineWidth = 17;
  ctx.beginPath();
  ctx.moveTo(SLING.baseX + 4, SLING.baseY + 4);
  ctx.quadraticCurveTo(SLING.baseX - 10, 540, SLING.jointX, SLING.jointY);
  ctx.stroke();
  ctx.strokeStyle = '#6e4423';
  ctx.lineWidth = 13;
  ctx.beginPath();
  ctx.moveTo(SLING.baseX, SLING.baseY);
  ctx.quadraticCurveTo(SLING.baseX - 12, 540, SLING.jointX, SLING.jointY);
  ctx.stroke();
  // 左杈
  ctx.lineWidth = 11;
  ctx.strokeStyle = '#5a3218';
  ctx.beginPath();
  ctx.moveTo(SLING.jointX, SLING.jointY);
  ctx.quadraticCurveTo(178, 430, SLING.tipL.x, SLING.tipL.y + 4);
  ctx.stroke();
  ctx.strokeStyle = '#6e4423';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(SLING.jointX, SLING.jointY);
  ctx.quadraticCurveTo(178, 430, SLING.tipL.x, SLING.tipL.y);
  ctx.stroke();
  // 右杈
  ctx.strokeStyle = '#5a3218';
  ctx.lineWidth = 11;
  ctx.beginPath();
  ctx.moveTo(SLING.jointX, SLING.jointY);
  ctx.quadraticCurveTo(210, 426, SLING.tipR.x, SLING.tipR.y + 4);
  ctx.stroke();
  ctx.strokeStyle = '#7c5228';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(SLING.jointX, SLING.jointY);
  ctx.quadraticCurveTo(210, 426, SLING.tipR.x, SLING.tipR.y);
  ctx.stroke();
  // 树皮纹理
  ctx.strokeStyle = 'rgba(40,20,8,0.55)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(186, 590); ctx.lineTo(193, 572); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(190, 540); ctx.lineTo(197, 524); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(186, 496); ctx.lineTo(192, 484); ctx.stroke();
  ctx.restore();
}

// 皮筋：loaded 时连到发射物，否则垂在锚点
function drawBands(front) {
  const s = Game.shot;
  const loaded = s && s.loaded && !s.dead && (Game.phase === 'aiming');
  let px = ANCHOR.x, py = ANCHOR.y;
  if (loaded) { px = s.x; py = s.y; }
  const wob = Game.bandWobble;
  ctx.save();
  ctx.lineCap = 'round';
  const drawBand = (tip, off) => {
    const sag = loaded ? 0 : 10 + Math.sin(performanceNow() * 0.02) * 2 + wob * 10 * Math.sin(performanceNow() * 0.06);
    const mx = (tip.x + px) / 2, my = (tip.y + py) / 2 + sag;
    ctx.strokeStyle = '#5e1c22';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(tip.x, tip.y + off);
    ctx.quadraticCurveTo(mx, my, px, py + off * 0.4);
    ctx.stroke();
    ctx.strokeStyle = '#8e2f35';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(tip.x, tip.y + off);
    ctx.quadraticCurveTo(mx, my, px, py + off * 0.4);
    ctx.stroke();
  };
  if (!front) drawBand(SLING.tipL, 2);
  else drawBand(SLING.tipR, -2);
  // 皮兜
  if (loaded && front) {
    ctx.fillStyle = '#4a2c18';
    ctx.beginPath();
    ctx.ellipse(px, py + 6, 17, 8, 0, 0, 6.29);
    ctx.fill();
    ctx.strokeStyle = '#2e1a0e';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  ctx.restore();
}

function performanceNow() {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

function drawFlint(x, y, r, rot, empowered, scale, popT) {
  ctx.save();
  ctx.translate(x, y);
  const sc = (scale || 1) * (popT !== undefined ? (0.4 + 0.6 * popT) : 1);
  ctx.scale(sc, sc);
  if (empowered) {
    const pulse = 0.75 + 0.25 * Math.sin(performanceNow() * 0.02);
    const glow = ctx.createRadialGradient(0, 0, r * 0.4, 0, 0, r * 2.6);
    glow.addColorStop(0, 'rgba(255,157,69,' + (0.55 * pulse) + ')');
    glow.addColorStop(1, 'rgba(255,157,69,0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(0, 0, r * 2.6, 0, 6.29); ctx.fill();
  }
  ctx.rotate(rot);
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2;
    const rr = r * FLINT_JITTER[i];
    if (i === 0) ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
    else ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fillStyle = '#3b3b46';
  ctx.fill();
  ctx.strokeStyle = '#23232c';
  ctx.lineWidth = 2;
  ctx.stroke();
  // 高光
  ctx.strokeStyle = 'rgba(150,150,170,0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.62, Math.PI * 1.05, Math.PI * 1.55);
  ctx.stroke();
  // 熔纹
  ctx.strokeStyle = empowered ? '#ffd75e' : 'rgba(255,157,69,0.65)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-r * 0.45, -r * 0.1);
  ctx.lineTo(-r * 0.1, r * 0.12);
  ctx.lineTo(r * 0.28, -r * 0.2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-r * 0.15, r * 0.5);
  ctx.lineTo(r * 0.1, r * 0.28);
  ctx.stroke();
  ctx.restore();
}

function drawTrail(s) {
  if (!s.trail || s.trail.length < 2) return;
  ctx.save();
  for (let i = 0; i < s.trail.length; i++) {
    const p = s.trail[i];
    const f = i / s.trail.length;
    ctx.globalAlpha = f * 0.4;
    ctx.fillStyle = s.empowered ? '#ffb347' : '#d8c2a8';
    ctx.beginPath();
    ctx.arc(p.x, p.y, SHOT_R * (0.25 + f * 0.6), 0, 6.29);
    ctx.fill();
  }
  ctx.restore();
}

function drawBlock(b) {
  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.rotate(b.angle);
  const hw = b.w / 2, hh = b.h / 2;
  const hpRatio = clamp(b.hp / b.maxHp, 0, 1);
  if (b.mat === 'wood') {
    ctx.fillStyle = '#a06a35';
    ctx.fillRect(-hw, -hh, b.w, b.h);
    ctx.strokeStyle = '#7c5228';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(-hw, -hh, b.w, b.h);
    // 木纹
    ctx.strokeStyle = 'rgba(124,82,40,0.6)';
    ctx.lineWidth = 1.5;
    if (b.w >= b.h) {
      ctx.beginPath(); ctx.moveTo(-hw + 6, -hh * 0.35); ctx.lineTo(hw - 6, -hh * 0.35 + 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-hw + 6, hh * 0.4); ctx.lineTo(hw - 6, hh * 0.4 - 2); ctx.stroke();
      ctx.fillStyle = '#5e3a1c';
      ctx.beginPath(); ctx.arc(-hw + 8, 0, 2, 0, 6.29); ctx.arc(hw - 8, 0, 2, 0, 6.29); ctx.fill();
    } else {
      ctx.beginPath(); ctx.moveTo(-hw * 0.35, -hh + 6); ctx.lineTo(-hw * 0.35 + 2, hh - 6); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(hw * 0.4, -hh + 6); ctx.lineTo(hw * 0.4 - 2, hh - 6); ctx.stroke();
      ctx.fillStyle = '#5e3a1c';
      ctx.beginPath(); ctx.arc(0, -hh + 8, 2, 0, 6.29); ctx.arc(0, hh - 8, 2, 0, 6.29); ctx.fill();
    }
  } else {
    ctx.fillStyle = '#857d72';
    ctx.fillRect(-hw, -hh, b.w, b.h);
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(-hw, -hh, b.w, 4);
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fillRect(-hw, hh - 4, b.w, 4);
    ctx.strokeStyle = '#6f675e';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(-hw, -hh, b.w, b.h);
    ctx.strokeStyle = 'rgba(87,80,74,0.7)';
    ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(-hw * 0.4, -hh * 0.5); ctx.lineTo(hw * 0.1, hh * 0.1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(hw * 0.5, -hh * 0.2); ctx.lineTo(hw * 0.2, hh * 0.55); ctx.stroke();
  }
  // 损伤裂纹
  if (hpRatio < 0.66) {
    ctx.strokeStyle = b.mat === 'wood' ? '#3a2114' : '#4c453f';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-hw * 0.6, -hh * 0.8);
    ctx.lineTo(-hw * 0.2, -hh * 0.1);
    ctx.lineTo(-hw * 0.5, hh * 0.6);
    ctx.stroke();
  }
  if (hpRatio < 0.33) {
    ctx.beginPath();
    ctx.moveTo(hw * 0.5, -hh * 0.7);
    ctx.lineTo(hw * 0.15, 0);
    ctx.lineTo(hw * 0.55, hh * 0.75);
    ctx.stroke();
  }
  if (b.hitFlash > 0) {
    ctx.globalAlpha = b.hitFlash * 0.45;
    ctx.fillStyle = '#fff';
    ctx.fillRect(-hw, -hh, b.w, b.h);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

function drawJar(b) {
  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.rotate(b.angle * 0.3);
  const r = b.r;
  ctx.fillStyle = '#b3622e';
  ctx.beginPath();
  ctx.ellipse(0, 1, r * 0.95, r * 1.02, 0, 0, 6.29);
  ctx.fill();
  ctx.strokeStyle = '#7c3a1c';
  ctx.lineWidth = 2;
  ctx.stroke();
  // 罐口
  ctx.fillStyle = '#8a4420';
  ctx.fillRect(-r * 0.38, -r * 1.28, r * 0.76, r * 0.42);
  ctx.strokeRect(-r * 0.38, -r * 1.28, r * 0.76, r * 0.42);
  // 火焰纹
  ctx.strokeStyle = '#ffd75e';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, r * 0.5);
  ctx.quadraticCurveTo(-r * 0.4, 0, 0, -r * 0.25);
  ctx.quadraticCurveTo(r * 0.35, r * 0.05, 0, r * 0.5);
  ctx.stroke();
  if (b.hitFlash > 0) {
    ctx.globalAlpha = b.hitFlash * 0.5;
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.ellipse(0, 0, r, r * 1.1, 0, 0, 6.29); ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

function drawBeetle(b) {
  ctx.save();
  ctx.translate(b.x, b.y);
  const r = b.r;
  const moving = (b.vx * b.vx + b.vy * b.vy) > 100;
  const wig = moving ? 1 : 0.25;
  ctx.rotate(Math.sin(b.walkT * 1.7) * 0.03 * wig);
  if (b.hitFlash > 0.4) ctx.scale(1.06, 0.92);
  // 腿
  ctx.strokeStyle = '#5a2d18';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  for (let side = -1; side <= 1; side += 2) {
    for (let i = 0; i < 3; i++) {
      const lx = side * (r * 0.25 + i * r * 0.22);
      const sw = Math.sin(b.walkT * 9 + i * 2.1 + side) * 3.5 * wig;
      ctx.beginPath();
      ctx.moveTo(lx * 0.7, r * 0.35);
      ctx.lineTo(lx + sw, r * 0.92);
      ctx.stroke();
    }
  }
  // 壳
  const grad = ctx.createLinearGradient(0, -r, 0, r * 0.6);
  grad.addColorStop(0, '#d07438');
  grad.addColorStop(0.6, '#a8542c');
  grad.addColorStop(1, '#7e3a1c');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, r, Math.PI, 0);
  ctx.quadraticCurveTo(r * 0.6, r * 0.42, 0, r * 0.42);
  ctx.quadraticCurveTo(-r * 0.6, r * 0.42, -r, 0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#5e2a12';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  // 壳板缝
  ctx.strokeStyle = 'rgba(94,42,18,0.65)';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(0, -r);
  ctx.quadraticCurveTo(-r * 0.15, -r * 0.4, -r * 0.08, r * 0.1);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.62, Math.PI * 1.15, Math.PI * 1.85);
  ctx.stroke();
  // 铜绿斑
  ctx.fillStyle = 'rgba(63,143,122,0.4)';
  ctx.beginPath(); ctx.ellipse(r * 0.42, -r * 0.42, r * 0.2, r * 0.13, 0.5, 0, 6.29); ctx.fill();
  ctx.beginPath(); ctx.ellipse(-r * 0.5, -r * 0.2, r * 0.14, r * 0.1, -0.4, 0, 6.29); ctx.fill();
  // 铆钉
  ctx.fillStyle = '#e8b98a';
  for (let i = 0; i < 5; i++) {
    const a = Math.PI + (i + 0.5) / 5 * Math.PI;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * r * 0.86, Math.sin(a) * r * 0.86 + r * 0.06, 1.8, 0, 6.29);
    ctx.fill();
  }
  // 眼睛（朝左=弹弓方向）
  const blink = (b.walkT % 3.7) < 0.12 ? 0.15 : 1;
  const lookX = -2.2, lookY = 1.2;
  const eyePos = [[-r * 0.38, r * 0.02], [-r * 0.02, r * 0.04]];
  for (const [ex, ey] of eyePos) {
    if (b.sleeping) {
      ctx.strokeStyle = '#241832';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(ex - r * 0.13, ey); ctx.lineTo(ex + r * 0.13, ey); ctx.stroke();
    } else {
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.ellipse(ex, ey, r * 0.16, r * 0.16 * blink, 0, 0, 6.29);
      ctx.fill();
      if (blink > 0.5) {
        ctx.fillStyle = '#241832';
        ctx.beginPath();
        ctx.arc(ex + lookX, ey + lookY, r * 0.075, 0, 6.29);
        ctx.fill();
      }
    }
  }
  // 受击闪白 / 低血裂纹
  if (b.hp < b.maxHp * 0.5) {
    ctx.strokeStyle = 'rgba(46,26,14,0.8)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(r * 0.3, -r * 0.75);
    ctx.lineTo(r * 0.1, -r * 0.35);
    ctx.lineTo(r * 0.4, -r * 0.1);
    ctx.stroke();
  }
  if (b.hitFlash > 0) {
    ctx.globalAlpha = b.hitFlash * 0.5;
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.29); ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

function drawParts() {
  for (const p of parts) {
    const f = p.life / p.maxLife;
    ctx.save();
    ctx.globalAlpha = clamp(f, 0, 1) * (p.kind === 'smoke' ? 0.4 : 0.9);
    ctx.fillStyle = p.color;
    if (p.kind === 'chip') {
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
    } else if (p.kind === 'smoke') {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (1.6 - f * 0.6), 0, 6.29);
      ctx.fill();
    } else if (p.kind === 'spark') {
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - p.vx * 0.03, p.y - p.vy * 0.03);
      ctx.stroke();
    } else if (p.kind === 'star') {
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        ctx.moveTo(0, -p.size);
        ctx.quadraticCurveTo(0, 0, p.size, 0);
        ctx.quadraticCurveTo(0, 0, 0, p.size);
        ctx.quadraticCurveTo(0, 0, -p.size, 0);
        ctx.quadraticCurveTo(0, 0, 0, -p.size);
      }
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, 6.29);
      ctx.fill();
    }
    ctx.restore();
  }
}

function drawAimUI() {
  if (Game.phase !== 'aiming' || !Game.shot || !Game.shot.loaded) return;
  const pullLen = hypot(Game.pull.x, Game.pull.y);
  // 最大拉伸范围（极淡）
  ctx.save();
  ctx.globalAlpha = 0.08;
  ctx.strokeStyle = '#ffe8c8';
  ctx.setLineDash([6, 8]);
  ctx.beginPath();
  ctx.arc(ANCHOR.x, ANCHOR.y, MAX_PULL, 0, 6.29);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
  if (pullLen < 18) {
    // 待机动画：提示光圈
    const pulse = 0.5 + 0.5 * Math.sin(performanceNow() * 0.005);
    ctx.save();
    ctx.globalAlpha = 0.25 + 0.35 * pulse;
    ctx.strokeStyle = '#ffd27a';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(Game.shot.x, Game.shot.y, SHOT_R + 8 + pulse * 5, 0, 6.29);
    ctx.stroke();
    ctx.restore();
    return;
  }
  // 轨迹预测点
  let vx = -Game.pull.x * LAUNCH_K;
  let vy = -Game.pull.y * LAUNCH_K;
  const sp = hypot(vx, vy);
  if (sp > MAX_SPEED) { vx *= MAX_SPEED / sp; vy *= MAX_SPEED / sp; }
  let px = Game.shot.x, py = Game.shot.y;
  const step = 1 / 30;
  ctx.save();
  for (let i = 0; i < 44; i++) {
    vy += GRAVITY * step;
    px += vx * step; py += vy * step;
    if (py > GROUND_Y - 3 || px > WORLD_W + 40) break;
    if (i % 3 === 0) {
      const f = 1 - i / 44;
      ctx.globalAlpha = 0.15 + f * 0.65;
      ctx.fillStyle = '#ffe8c8';
      ctx.beginPath();
      ctx.arc(px, py, 2.2 + f * 2.6, 0, 6.29);
      ctx.fill();
    }
  }
  ctx.restore();
}

function render() {
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, Cam.cw, Cam.ch);
  if (bgCache) ctx.drawImage(bgCache, 0, 0, Cam.cw, Cam.ch);

  const tr = Game.trauma * Game.trauma;
  const shx = (Math.random() - 0.5) * 2 * 15 * tr;
  const shy = (Math.random() - 0.5) * 2 * 11 * tr;

  ctx.save();
  ctx.translate(Cam.ox + shx, Cam.oy + shy);
  ctx.scale(Cam.s, Cam.s);
  ctx.translate(-Cam.x, 0);

  // 远景（视差）
  if (ridgesFar.length) drawRidge(ridgesFar, '#472a44', 0.25);
  if (ridgesNear.length) drawRidge(ridgesNear, '#5c3038', 0.5);
  drawGround();
  drawSlingTrunk();
  drawBands(false);

  for (const b of bodies) {
    if (b.dead || b.kind === 'ground') continue;
    if (b.kind === 'block') drawBlock(b);
    else if (b.kind === 'jar') drawJar(b);
    else if (b.kind === 'guard') drawBeetle(b);
    else if (b.kind === 'shot') {
      drawTrail(b);
      drawFlint(b.x, b.y, b.r, b.angle, b.empowered, 1);
    }
  }
  // 待发射的燧石弹
  const s = Game.shot;
  if (s && s.loaded && !s.dead && (Game.phase === 'aiming')) {
    drawFlint(s.x, s.y, s.r, 0, false, 1, s.popT);
  }
  drawBands(true);
  drawParts();

  // 冲击波环
  for (const r of rings) {
    ctx.save();
    ctx.globalAlpha = clamp(r.life / r.maxLife, 0, 1) * 0.75;
    ctx.strokeStyle = 'rgba(' + (r.color || '255,232,200') + ',1)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(r.x, r.y, r.r, 0, 6.29);
    ctx.stroke();
    ctx.restore();
  }

  // 漂浮文字
  ctx.save();
  ctx.textAlign = 'center';
  ctx.font = '900 21px "Trebuchet MS", "PingFang SC", sans-serif';
  for (const t of texts) {
    ctx.globalAlpha = clamp(t.life / t.maxLife, 0, 1);
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(20,10,8,0.85)';
    ctx.strokeText(t.txt, t.x, t.y);
    ctx.fillStyle = t.color;
    ctx.fillText(t.txt, t.x, t.y);
  }
  ctx.restore();

  drawAimUI();
  ctx.restore();

  if (vigCache) ctx.drawImage(vigCache, 0, 0, Cam.cw, Cam.ch);

  // 空中能力可用提示（画面底部，世界外提示条）
  if (Game.phase === 'flying' && !Game.abilityUsed && Game.shot && !Game.shot.dead) {
    ctx.save();
    ctx.globalAlpha = 0.55 + 0.35 * Math.sin(performanceNow() * 0.008);
    ctx.fillStyle = '#ffe8c8';
    ctx.font = '700 15px "PingFang SC", "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(IS_ENGLISH ? 'Tap / Space → Groundbreaker Dive' : '点击屏幕 / 空格 → 裂地坠击', Cam.cw / 2, Cam.ch - 18);
    ctx.restore();
  }

  // 移动端瞄准且城堡在视野外时，右缘给方向提示（空白处拖动可平移查看）
  if (Cam.dynamic && Game.phase === 'aiming' && castleCenter > Cam.x + Cam.viewW() - 16) {
    ctx.save();
    const pulse = 0.5 + 0.5 * Math.sin(performanceNow() * 0.006);
    ctx.globalAlpha = 0.45 + 0.4 * pulse;
    ctx.fillStyle = '#ffd27a';
    const ax = Cam.cw - 22, ay = Cam.ch * 0.44;
    ctx.beginPath();
    ctx.moveTo(ax - 8, ay - 10);
    ctx.lineTo(ax + 8, ay);
    ctx.lineTo(ax - 8, ay + 10);
    ctx.closePath();
    ctx.fill();
    ctx.font = '700 12px "PingFang SC", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(IS_ENGLISH ? 'Watchtower' : '哨塔方向', ax - 14, ay + 4);
    ctx.restore();
  }
}

/* ==================== UI（DOM） ==================== */
const UI = {
  els: {},
  dirtyHud: true,
  hintSticky: false,
  hintTimer: 0,
  lastShotsKey: '',

  cache() {
    const ids = ['hud', 'hud-level', 'hud-score', 'hud-shots', 'btn-pause', 'btn-restart', 'btn-mute',
      'toast', 'hint', 'ov-start', 'ov-pause', 'ov-result',
      'btn-start', 'level-chips', 'start-best',
      'btn-resume', 'btn-pause-retry', 'btn-pause-menu',
      'result-title', 'result-sub', 'result-score', 'btn-next', 'btn-retry', 'btn-menu'];
    for (const id of ids) this.els[id] = document.getElementById(id);
  },

  toast(txt) {
    const el = this.els['toast'];
    if (!el) return;
    el.textContent = txt;
    el.classList.remove('hidden');
    el.style.animation = 'none';
    void el.offsetWidth; // 重启动画
    el.style.animation = '';
  },

  showHint(txt, sticky) {
    const el = this.els['hint'];
    if (!el) return;
    this.hintSticky = !!sticky;
    this.hintTimer = sticky ? -1 : 1.6;
    el.textContent = txt;
    el.classList.remove('hidden');
  },
  showHintOnce(txt) { this.showHint(txt, false); },
  hideHint() {
    const el = this.els['hint'];
    if (el) el.classList.add('hidden');
    this.hintSticky = false;
    this.hintTimer = 0;
  },

  onLevelBegin() {
    if (this.els['hud']) this.els['hud'].classList.remove('hidden');
    hideOverlays();
    this.toast('第 ' + Game.level + ' 关 · ' + LEVELS[Game.level - 1].name);
    if (Game.level === 1 && !Game.everLaunched) {
      this.showHint('按住燧石向后拖拽，松手发射', true);
    } else {
      this.hideHint();
    }
    this.dirtyHud = true;
    this.lastShotsKey = '';
  },

  updateHud() {
    const L = LEVELS[Game.level - 1];
    if (this.els['hud-level']) this.els['hud-level'].textContent = '第 ' + Game.level + ' 关 · ' + L.name;
    if (this.els['hud-score']) this.els['hud-score'].textContent = '得分 ' + Game.score;
    const key = Game.level + ':' + Game.shotsLeft + ':' + L.shots;
    if (this.els['hud-shots'] && key !== this.lastShotsKey) {
      this.lastShotsKey = key;
      let html = '';
      for (let i = 0; i < L.shots; i++) html += '<span class="shot-dot' + (i < Game.shotsLeft ? '' : ' spent') + '"></span>';
      this.els['hud-shots'].innerHTML = html;
    }
    if (this.els['btn-pause']) this.els['btn-pause'].textContent = Game.paused ? '继续' : '暂停';
    this.dirtyHud = false;
  },

  setMute(m) {
    if (this.els['btn-mute']) this.els['btn-mute'].textContent = m ? '音效 关' : '音效 开';
  },

  showStart() {
    if (this.els['hud']) this.els['hud'].classList.add('hidden');
    hideOverlays();
    if (this.els['ov-start']) this.els['ov-start'].classList.remove('hidden');
    if (this.els['start-best']) {
      this.els['start-best'].textContent = Game.best > 0
        ? '最高分 ' + Game.best + ' · 已解锁至第 ' + Game.unlocked + ' 关'
        : '全新的峡谷，等你开战';
    }
    // 选关
    const chips = this.els['level-chips'];
    if (chips) {
      chips.innerHTML = '';
      for (let i = 1; i <= LEVELS.length; i++) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'chip' + (i <= Game.unlocked ? '' : ' locked');
        b.textContent = i <= Game.unlocked ? ('第 ' + i + ' 关 · ' + LEVELS[i - 1].name) : ('第 ' + i + ' 关 🔒');
        if (i <= Game.unlocked) {
          b.addEventListener('click', () => {
            AudioSys.resume(); AudioSys.play('ui');
            Game.score = 0; Game.scoreAtLevelStart = 0;
            beginLevel(i);
          });
        }
        chips.appendChild(b);
      }
    }
  },

  showPause() { if (this.els['ov-pause']) this.els['ov-pause'].classList.remove('hidden'); },
  hidePause() { if (this.els['ov-pause']) this.els['ov-pause'].classList.add('hidden'); },

  showResult(kind) {
    if (!kind) return;
    hideOverlays();
    const title = this.els['result-title'], sub = this.els['result-sub'],
      score = this.els['result-score'], next = this.els['btn-next'];
    const levelScore = Game.score - Game.scoreAtLevelStart;
    if (kind === 'clear') {
      title.textContent = '哨塔告破！';
      sub.textContent = '第 ' + Game.level + ' 关完成' + (Game.shotsLeft > 0 ? ' · 剩余弹药奖励 +' + Game.shotsLeft * SCORE.shotBonus : '');
      score.textContent = '总分 ' + Game.score;
      next.textContent = '下 一 关';
      next.classList.remove('hidden');
    } else if (kind === 'victory') {
      title.textContent = '峡谷光复！';
      sub.textContent = '三座哨塔全部攻破，锈甲虫帮被赶跑啦！\n本关得分 ' + levelScore;
      score.textContent = '总分 ' + Game.score + ' · 最高分 ' + Game.best;
      next.textContent = '从 头 再 来';
      next.classList.remove('hidden');
    } else {
      title.textContent = '弹药耗尽……';
      const left = aliveGuards();
      sub.textContent = '还剩 ' + left + ' 只锈甲虫躲在塔里\n调整角度，再来一次！';
      score.textContent = '本关得分 ' + levelScore;
      next.classList.add('hidden');
    }
    if (this.els['ov-result']) this.els['ov-result'].classList.remove('hidden');
  },
};

function hideOverlays() {
  for (const id of ['ov-start', 'ov-pause', 'ov-result']) {
    const el = UI.els[id];
    if (el) el.classList.add('hidden');
  }
}

function pressStart() {
  AudioSys.resume();
  AudioSys.play('ui');
  hideOverlays();
  startCampaign();
}

/* ==================== 主循环 ==================== */
let lastFrameT = 0, acc = 0, manualClock = false;

function frame(tms) {
  requestAnimationFrame(frame);
  const t = tms / 1000;
  let dt = Math.min(0.05, t - (lastFrameT || t));
  lastFrameT = t;
  if (!manualClock && !Game.paused) {
    acc += dt;
    let guardN = 0;
    while (acc >= DT && guardN++ < 8) { stepSim(DT); acc -= DT; }
    if (guardN >= 8) acc = 0;
    tickHint(dt);
  }
  if (UI.dirtyHud) UI.updateHud();
  render();
}

function tickHint(dt) {
  if (UI.hintTimer > 0) {
    UI.hintTimer -= dt;
    if (UI.hintTimer <= 0 && !UI.hintSticky) UI.hideHint();
  }
}

/* ==================== 启动 ==================== */
function resize() {
  const w = Math.max(320, window.innerWidth || WORLD_W);
  const h = Math.max(240, window.innerHeight || WORLD_H);
  dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  Cam.resize(w, h);
  buildBackground();
  buildVignette();
}

function bindOnce() {
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerUp);
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', resize);

  const on = (id, fn) => { const el = UI.els[id]; if (el) el.addEventListener('click', fn); };
  on('btn-start', pressStart);
  on('btn-pause', () => { AudioSys.play('ui'); togglePause(); });
  on('btn-restart', () => {
    AudioSys.play('ui');
    Game.paused = false; UI.hidePause(); hideOverlays(); restartLevel();
  });
  on('btn-mute', () => UI.setMute(AudioSys.toggle()));
  on('btn-resume', () => { AudioSys.play('ui'); togglePause(); });
  on('btn-pause-retry', () => {
    AudioSys.play('ui');
    Game.paused = false; UI.hidePause(); hideOverlays(); restartLevel();
  });
  on('btn-pause-menu', () => { AudioSys.play('ui'); toMenu(); });
  on('btn-next', () => {
    AudioSys.play('ui');
    hideOverlays();
    if (Game.phase === 'victory') startCampaign();
    else nextLevel();
  });
  on('btn-retry', () => { AudioSys.play('ui'); hideOverlays(); restartLevel(); });
  on('btn-menu', () => { AudioSys.play('ui'); toMenu(); });
}

function boot() {
  canvas = document.getElementById('game');
  ctx = canvas.getContext('2d');
  UI.cache();
  resize();
  bindOnce();
  UI.setMute(AudioSys.muted);
  genRidges(LEVELS[0].seed);
  buildLevel(1);
  UI.showStart();
  requestAnimationFrame(frame);

  // —— 本地自检辅助（URL 参数，不影响正常游玩）——
  try {
    const q = new URLSearchParams((window.location && window.location.search) || '');
    const lv = parseInt(q.get('level') || '1', 10);
    if (q.get('auto')) {
      pressStart();
      if (lv > 1) { Game.score = 0; Game.scoreAtLevelStart = 0; beginLevel(lv); }
      if (q.get('fire')) {
        const ax = parseInt(q.get('ax') || '-98', 10);
        const ay = parseInt(q.get('ay') || '46', 10);
        const ab = parseInt(q.get('ab') || '0', 10);
        setTimeout(() => { aim(ax, ay); launchShot(); }, 500);
        if (ab > 0) autoAbilityX = ab; // 世界 x 阈值，飞到即触发能力
      }
      if (q.get('aimonly')) setTimeout(() => { aim(parseInt(q.get('ax') || '-98', 10), parseInt(q.get('ay') || '46', 10)); }, 400);
    }
    if (q.get('diag')) {
      setTimeout(() => {
        try {
          document.title = JSON.stringify({
            errs: window.__SLING_ERRS || [],
            sw: document.documentElement.scrollWidth,
            iw: window.innerWidth,
            ph: Game.phase,
          });
        } catch (e) { /* 忽略 */ }
      }, 1300);
    }
  } catch (e) { /* 忽略 */ }
}

window.addEventListener('error', (e) => {
  try { (window.__SLING_ERRS = window.__SLING_ERRS || []).push(String(e.message)); } catch (err) { /* 忽略 */ }
});

/* ==================== 统一测试接口 ==================== */
const round1 = (v) => Math.round(v * 10) / 10;
const round3 = (v) => Math.round(v * 1000) / 1000;

const api = {
  snapshot() {
    const s = Game.shot;
    return {
      phase: Game.phase,
      paused: Game.paused,
      level: Game.level,
      levelName: LEVELS[Game.level - 1].name,
      score: Game.score,
      shotsLeft: Game.shotsLeft,
      best: Game.best,
      unlocked: Game.unlocked,
      abilityUsed: Game.abilityUsed,
      guardsAlive: aliveGuards(),
      camera: { x: round1(Cam.x), s: round3(Cam.s), ox: round1(Cam.ox), oy: round1(Cam.oy), dynamic: Cam.dynamic },
      projectile: s && !s.dead ? {
        x: round1(s.x), y: round1(s.y),
        vx: round1(s.vx), vy: round1(s.vy),
        loaded: !!s.loaded,
        empowered: !!s.empowered,
        active: !s.loaded,
      } : null,
      targets: bodies.filter(b => b.kind === 'guard').map(b => ({
        id: b.id, x: round1(b.x), y: round1(b.y),
        hp: Math.max(0, Math.round(b.hp)), defeated: !!b.dead,
      })).concat(
        Object.keys(Game.defeatedGuards)
          .filter(id => !bodies.some(b => b.id === id))
          .map(id => Game.defeatedGuards[id])
      ),
      blocks: bodies.filter(b => b.kind === 'block' || b.kind === 'jar').map(b => ({
        id: b.id, type: b.kind === 'jar' ? 'jar' : b.mat,
        x: round1(b.x), y: round1(b.y), angle: round3(b.angle),
        hp: Math.max(0, Math.round(b.hp)), asleep: !!b.sleeping, destroyed: !!b.dead,
      })),
    };
  },
  start() { pressStart(); return api.snapshot(); },
  restart() {
    Game.paused = false; UI.hidePause(); hideOverlays();
    restartLevel();
    return api.snapshot();
  },
  loadLevel(n) {
    Game.paused = false; UI.hidePause(); hideOverlays();
    Game.score = 0; Game.scoreAtLevelStart = 0;
    beginLevel(n);
    return api.snapshot();
  },
  pause() {
    if (!Game.paused && Game.phase !== 'menu') { Game.paused = true; UI.showPause(); UI.dirtyHud = true; }
    return api.snapshot();
  },
  resume() {
    if (Game.paused) { Game.paused = false; UI.hidePause(); UI.dirtyHud = true; }
    return api.snapshot();
  },
  setManualClock(enabled) { manualClock = !!enabled; return manualClock; },
  step(ms) {
    if (Game.paused) return api.snapshot(); // 暂停时不推进
    const n = Math.max(0, Math.round(((ms || 0) / 1000) / DT));
    for (let i = 0; i < n; i++) stepSim(DT);
    tickHint(n * DT);
    if (UI.dirtyHud) UI.updateHud();
    render();
    return api.snapshot();
  },
  aim(dx, dy) { return aim(dx, dy); },
  launch() { return launchShot(); },
  activateAbility() { return activateAbility(); },
  forceHit(targetId) {
    if (Game.phase === 'menu') return false;
    const b = bodies.find(x => x.id === targetId);
    if (!b || b.dead || b.kind === 'ground') return false;
    damageBody(b, 99999, null);
    return true;
  },
  // 供自动化测试做分支搜索：完整保存/恢复物理与游戏状态
  _save() {
    return JSON.stringify({
      bodies,
      shot: Game.shot,
      pull: Game.pull,
      fx: fxRandState.s,
      game: {
        phase: Game.phase, level: Game.level, score: Game.score,
        scoreAtLevelStart: Game.scoreAtLevelStart, shotsLeft: Game.shotsLeft,
        abilityUsed: Game.abilityUsed, dragging: false,
        turnTime: Game.turnTime, settleTime: Game.settleTime, winTimer: Game.winTimer,
        overlayTimer: Game.overlayTimer, pendingOverlay: Game.pendingOverlay,
        trauma: Game.trauma, bandWobble: Game.bandWobble, everLaunched: Game.everLaunched,
        defeatedGuards: Game.defeatedGuards,
      },
    });
  },
  _restore(str) {
    const d = JSON.parse(str);
    bodies = d.bodies;
    Game.shot = d.shot;
    Game.pull = d.pull;
    Object.assign(Game, d.game);
    fxRandState.s = d.fx;
    parts.length = 0; texts.length = 0; rings.length = 0;
    pendingBooms.length = 0; contacts.length = 0;
    return true;
  },
};
window.__SLINGSHOT_TEST__ = api;

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
}

})();
