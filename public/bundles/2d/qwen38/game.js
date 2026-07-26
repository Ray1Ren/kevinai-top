/* ============================================================
   Sling Siege · 弹弓攻城
   原创单页物理攻城游戏 —— 纯原生 HTML/CSS/JS + Canvas + Web Audio
   ============================================================ */
(() => {
'use strict';

/* ---------- 常量与工具 ---------- */
const W = 1280, H = 720;
const GRAV = 1500;
const DT = 1 / 120;
const GROUND_Y = 640;
const ANCHOR = { x: 168, y: 482 };
const TIPS = [{ x: 146, y: 458 }, { x: 190, y: 458 }];
const MAX_PULL = 96;
const POWER_K = 11.6;
const TAU = Math.PI * 2;
const FONT_D = 'Impact, "Arial Black", "PingFang SC", "Microsoft YaHei", sans-serif';

const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const r1 = (v) => Math.round(v * 10) / 10;
const r2 = (v) => Math.round(v * 100) / 100;

function mulberry(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* 隐私模式下静默 */ } }
};

/* ---------- 程序化音效 ---------- */
const AudioSys = {
  ctx: null, master: null, _nb: null,
  muted: store.get('ss.muted', false),
  ensure() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {}); return; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.9;
      this.master.connect(this.ctx.destination);
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer(); src.loop = true;
      const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 210;
      const g = this.ctx.createGain(); g.gain.value = 0.03;
      src.connect(f); f.connect(g); g.connect(this.master); src.start();
    } catch (e) { this.ctx = null; }
  },
  noiseBuffer() {
    if (this._nb) return this._nb;
    const len = this.ctx.sampleRate;
    const b = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this._nb = b; return b;
  },
  setMuted(m) { this.muted = m; store.set('ss.muted', m); if (this.master) this.master.gain.value = m ? 0 : 0.9; },
  tone(o) {
    if (!this.ctx) return;
    try {
      const f = o.f || 440, f2 = o.f2 || 0, t = o.t || 0.15, type = o.type || 'sine', v = o.v || 0.2, at = o.at || 0;
      const now = this.ctx.currentTime + at;
      const osc = this.ctx.createOscillator(), g = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(f, now);
      if (f2) osc.frequency.exponentialRampToValueAtTime(Math.max(20, f2), now + t);
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(v, now + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, now + t);
      osc.connect(g); g.connect(this.master);
      osc.start(now); osc.stop(now + t + 0.03);
    } catch (e) { /* 忽略音频错误 */ }
  },
  noise(o) {
    if (!this.ctx) return;
    try {
      const t = o.t || 0.2, v = o.v || 0.3, f = o.f || 800, q = o.q || 1, at = o.at || 0, type = o.type || 'lowpass';
      const now = this.ctx.currentTime + at;
      const src = this.ctx.createBufferSource(); src.buffer = this.noiseBuffer();
      const fl = this.ctx.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(v, now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + t);
      src.connect(fl); fl.connect(g); g.connect(this.master);
      src.start(now); src.stop(now + t + 0.03);
    } catch (e) { /* 忽略音频错误 */ }
  },
  creak(p) { this.tone({ f: 110 + p * 170, f2: 85 + p * 120, t: 0.09, type: 'sawtooth', v: 0.045 }); },
  launch() { this.noise({ t: 0.28, v: 0.5, f: 1400, type: 'bandpass', q: 0.7 }); this.tone({ f: 300, f2: 90, t: 0.25, type: 'triangle', v: 0.24 }); },
  thud(i) { const v = clamp(0.07 + i * 0.3, 0.07, 0.5); this.tone({ f: 110, f2: 45, t: 0.16, type: 'sine', v }); this.noise({ t: 0.09, v: v * 0.7, f: 300 }); },
  woodBreak() { this.noise({ t: 0.22, v: 0.5, f: 1800, type: 'highpass' }); this.tone({ f: 220, f2: 80, t: 0.12, type: 'square', v: 0.12 }); },
  stoneBreak() { this.noise({ t: 0.3, v: 0.55, f: 520 }); this.tone({ f: 90, f2: 40, t: 0.2, type: 'sine', v: 0.3 }); },
  guardHit() { this.tone({ f: 520, f2: 300, t: 0.09, type: 'square', v: 0.12 }); },
  guardDown() { [660, 520, 392, 262].forEach((f, i) => this.tone({ f, t: 0.12, type: 'square', v: 0.14, at: i * 0.07 })); this.noise({ t: 0.2, v: 0.2, f: 900, at: 0.05 }); },
  ability() { this.tone({ f: 400, f2: 1500, t: 0.3, type: 'sawtooth', v: 0.15 }); this.noise({ t: 0.35, v: 0.3, f: 2400, type: 'highpass' }); },
  load() { this.tone({ f: 340, f2: 540, t: 0.12, type: 'triangle', v: 0.15 }); },
  win() { [523, 659, 784, 1046, 1318].forEach((f, i) => this.tone({ f, t: 0.22, type: 'triangle', v: 0.2, at: i * 0.11 })); },
  lose() { [392, 330, 262, 196].forEach((f, i) => this.tone({ f, t: 0.3, type: 'sawtooth', v: 0.11, at: i * 0.16 })); },
  click() { this.tone({ f: 700, f2: 500, t: 0.06, type: 'square', v: 0.08 }); }
};

/* ---------- 物理引擎 ---------- */
class Body {
  constructor(o) {
    this.shape = o.shape;
    this.x = o.x; this.y = o.y;
    this.w = o.w || 0; this.h = o.h || 0; this.r = o.r || 0;
    this.angle = o.angle || 0;
    this.vx = o.vx || 0; this.vy = o.vy || 0; this.va = o.va || 0;
    this.static = !!o.static;
    const dens = o.density != null ? o.density : 1;
    const area = this.shape === 'circle' ? Math.PI * this.r * this.r : this.w * this.h;
    this.mass = this.static ? 0 : dens * area;
    this.invM = this.static ? 0 : 1 / this.mass;
    this.invI = this.static ? 0 : (this.shape === 'circle'
      ? 2 / (this.mass * this.r * this.r)
      : 12 / (this.mass * (this.w * this.w + this.h * this.h)));
    this.rest = o.rest != null ? o.rest : 0.25;
    this.fric = o.fric != null ? o.fric : 0.45;
    this.hp = o.hp != null ? o.hp : Infinity;
    this.maxHp = this.hp;
    this.mat = o.mat || 'wood';
    this.kind = o.kind || 'block';
    this.id = o.id || '';
    this.dead = false;
    this.hurtT = 0;
    this.touched = false;
    this.life = o.life != null ? o.life : Infinity;
    this.seed = Math.floor(Math.random() * 1e9);
  }
  aabb() {
    if (this.shape === 'circle') return { x1: this.x - this.r, y1: this.y - this.r, x2: this.x + this.r, y2: this.y + this.r };
    const c = Math.cos(this.angle), s = Math.sin(this.angle);
    const ex = (Math.abs(c) * this.w + Math.abs(s) * this.h) / 2;
    const ey = (Math.abs(s) * this.w + Math.abs(c) * this.h) / 2;
    return { x1: this.x - ex, y1: this.y - ey, x2: this.x + ex, y2: this.y + ey };
  }
  speed() { return Math.hypot(this.vx, this.vy); }
}

function cornersOf(b) {
  const c = Math.cos(b.angle), s = Math.sin(b.angle), hw = b.w / 2, hh = b.h / 2;
  const p = [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]];
  return p.map(q => ({ x: b.x + c * q[0] - s * q[1], y: b.y + s * q[0] + c * q[1] }));
}
function faceNormals(C) {
  const N = [];
  for (let i = 0; i < 4; i++) {
    const p = C[i], q = C[(i + 1) % 4];
    const dx = q.x - p.x, dy = q.y - p.y, l = Math.hypot(dx, dy) || 1;
    N.push({ x: dy / l, y: -dx / l });
  }
  return N;
}
function clipSeg(p1, p2, nx, ny, off) {
  const d1 = nx * p1.x + ny * p1.y - off;
  const d2 = nx * p2.x + ny * p2.y - off;
  const out = [];
  if (d1 <= 0) out.push(p1);
  if (d2 <= 0) out.push(p2);
  if (d1 * d2 < 0) {
    const t = d1 / (d1 - d2);
    out.push({ x: p1.x + t * (p2.x - p1.x), y: p1.y + t * (p2.y - p1.y) });
  }
  if (out.length < 2) return out.length === 1 ? [out[0], out[0]] : null;
  return [out[0], out[1]];
}

function circleCircle(a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const rr = a.r + b.r, d2 = dx * dx + dy * dy;
  if (d2 > rr * rr) return null;
  const d = Math.sqrt(d2) || 0.0001;
  const nx = dx / d, ny = dy / d;
  return { nx, ny, points: [{ x: a.x + nx * a.r, y: a.y + ny * a.r, pen: rr - d, jn: 0, jt: 0 }] };
}

/* 返回 n 从 box 指向 circle */
function circleVsBox(ci, bx) {
  const c = Math.cos(bx.angle), s = Math.sin(bx.angle);
  const dx = ci.x - bx.x, dy = ci.y - bx.y;
  const lx = c * dx + s * dy, ly = -s * dx + c * dy;
  const hw = bx.w / 2, hh = bx.h / 2;
  const qx = clamp(lx, -hw, hw), qy = clamp(ly, -hh, hh);
  let ox = lx - qx, oy = ly - qy;
  const d2 = ox * ox + oy * oy;
  let nlx, nly, pen, plx, ply;
  if (d2 > 1e-9) {
    const d = Math.sqrt(d2);
    nlx = ox / d; nly = oy / d; pen = ci.r - d; plx = qx; ply = qy;
  } else {
    const px = hw - Math.abs(lx), py = hh - Math.abs(ly);
    if (px < py) { nlx = lx > 0 ? 1 : -1; nly = 0; pen = ci.r + px; plx = lx > 0 ? hw : -hw; ply = ly; }
    else { nlx = 0; nly = ly > 0 ? 1 : -1; pen = ci.r + py; plx = lx; ply = ly > 0 ? hh : -hh; }
  }
  if (pen <= 0) return null;
  return {
    nx: c * nlx - s * nly, ny: s * nlx + c * nly,
    px: bx.x + c * plx - s * ply, py: bx.y + s * plx + c * ply, pen
  };
}

function boxBox(a, b) {
  const aC = cornersOf(a), bC = cornersOf(b);
  const ca = Math.cos(a.angle), sa = Math.sin(a.angle);
  const cb = Math.cos(b.angle), sb = Math.sin(b.angle);
  const axes = [[ca, sa], [-sa, ca], [cb, sb], [-sb, cb]];
  let best = Infinity, bax = 0, bay = 0;
  for (const [ax, ay] of axes) {
    let aMin = Infinity, aMax = -Infinity, bMin = Infinity, bMax = -Infinity;
    for (const p of aC) { const d = p.x * ax + p.y * ay; if (d < aMin) aMin = d; if (d > aMax) aMax = d; }
    for (const p of bC) { const d = p.x * ax + p.y * ay; if (d < bMin) bMin = d; if (d > bMax) bMax = d; }
    if (aMax < bMin || bMax < aMin) return null;
    const o = Math.min(aMax, bMax) - Math.max(aMin, bMin);
    if (o < best) { best = o; bax = ax; bay = ay; }
  }
  let nx = bax, ny = bay;
  if ((b.x - a.x) * nx + (b.y - a.y) * ny < 0) { nx = -nx; ny = -ny; }
  const aN = faceNormals(aC), bN = faceNormals(bC);
  let bestA = -Infinity, bestB = -Infinity, ia = 0, ib = 0;
  for (let i = 0; i < 4; i++) {
    const da = aN[i].x * nx + aN[i].y * ny; if (da > bestA) { bestA = da; ia = i; }
    const db = -(bN[i].x * nx + bN[i].y * ny); if (db > bestB) { bestB = db; ib = i; }
  }
  let refC, incC, incN, refIdx;
  if (bestA > bestB) { refC = aC; incC = bC; incN = bN; refIdx = ia; }
  else { refC = bC; incC = aC; incN = aN; refIdx = ib; }
  let incBest = Infinity, incI = 0;
  for (let i = 0; i < 4; i++) {
    const d = incN[i].x * nx + incN[i].y * ny;
    if (d < incBest) { incBest = d; incI = i; }
  }
  const r1p = refC[refIdx], r2p = refC[(refIdx + 1) % 4];
  const i1 = incC[incI], i2 = incC[(incI + 1) % 4];
  let dx = r2p.x - r1p.x, dy = r2p.y - r1p.y;
  const rl = Math.hypot(dx, dy) || 1; dx /= rl; dy /= rl;
  let seg = clipSeg(i1, i2, -dx, -dy, -(dx * r1p.x + dy * r1p.y));
  if (seg) seg = clipSeg(seg[0], seg[1], dx, dy, dx * r2p.x + dy * r2p.y);
  const points = [];
  if (seg) {
    for (const p of seg) {
      const sep = (p.x - r1p.x) * nx + (p.y - r1p.y) * ny;
      if (sep <= 0.01) points.push({ x: p.x, y: p.y, pen: Math.max(-sep, best * 0.5), jn: 0, jt: 0 });
    }
  }
  if (points.length === 0) {
    points.push({ x: (i1.x + i2.x) / 2, y: (i1.y + i2.y) / 2, pen: best, jn: 0, jt: 0 });
  }
  return { nx, ny, points };
}

function collide(a, b) {
  let res = null;
  if (a.shape === 'circle' && b.shape === 'circle') res = circleCircle(a, b);
  else if (a.shape === 'circle' && b.shape === 'box') {
    const r = circleVsBox(a, b);
    if (r) res = { nx: -r.nx, ny: -r.ny, points: [{ x: r.px, y: r.py, pen: r.pen, jn: 0, jt: 0 }] };
  } else if (a.shape === 'box' && b.shape === 'circle') {
    const r = circleVsBox(b, a);
    if (r) res = { nx: r.nx, ny: r.ny, points: [{ x: r.px, y: r.py, pen: r.pen, jn: 0, jt: 0 }] };
  } else res = boxBox(a, b);
  if (!res) return null;
  const c = {
    a, b, nx: res.nx, ny: res.ny, points: res.points,
    rest: Math.min(a.rest, b.rest),
    fric: Math.sqrt(a.fric * b.fric),
    tx: -res.ny, ty: res.nx, maxVn: 0
  };
  return c;
}

function solveVelocity(cons, iterations) {
  for (let it = 0; it < iterations; it++) {
    for (const c of cons) {
      const a = c.a, b = c.b;
      const im = a.invM + b.invM;
      if (im === 0) continue;
      for (const p of c.points) {
        const rax = p.x - a.x, ray = p.y - a.y, rbx = p.x - b.x, rby = p.y - b.y;
        let rvx = (b.vx - b.va * rby) - (a.vx - a.va * ray);
        let rvy = (b.vy + b.va * rbx) - (a.vy + a.va * rax);
        const vn = rvx * c.nx + rvy * c.ny;
        if (vn < 0) {
          const raCn = rax * c.ny - ray * c.nx;
          const rbCn = rbx * c.ny - rby * c.nx;
          const km = im + raCn * raCn * a.invI + rbCn * rbCn * b.invI;
          let j = -(1 + c.rest) * vn / km;
          if (c.points.length > 1) j *= 0.5;
          const j0 = p.jn; p.jn = Math.max(j0 + j, 0); j = p.jn - j0;
          const jx = c.nx * j, jy = c.ny * j;
          a.vx -= jx * a.invM; a.vy -= jy * a.invM; a.va -= (rax * jy - ray * jx) * a.invI;
          b.vx += jx * b.invM; b.vy += jy * b.invM; b.va += (rbx * jy - rby * jx) * b.invI;
          if (-vn > c.maxVn) c.maxVn = -vn;
        }
        rvx = (b.vx - b.va * rby) - (a.vx - a.va * ray);
        rvy = (b.vy + b.va * rbx) - (a.vy + a.va * rax);
        const vt = rvx * c.tx + rvy * c.ty;
        const raCt = rax * c.ty - ray * c.tx;
        const rbCt = rbx * c.ty - rby * c.tx;
        const kt = im + raCt * raCt * a.invI + rbCt * rbCt * b.invI;
        let jt = -vt / kt;
        if (c.points.length > 1) jt *= 0.5;
        const maxT = c.fric * p.jn;
        const jt0 = p.jt; p.jt = clamp(jt0 + jt, -maxT, maxT); jt = p.jt - jt0;
        const fx = c.tx * jt, fy = c.ty * jt;
        a.vx -= fx * a.invM; a.vy -= fy * a.invM; a.va -= (rax * fy - ray * fx) * a.invI;
        b.vx += fx * b.invM; b.vy += fy * b.invM; b.va += (rbx * fy - rby * fx) * b.invI;
      }
    }
  }
}

function solvePosition(cons, iterations) {
  const PERC = 0.34, SLOP = 0.4;
  for (let it = 0; it < iterations; it++) {
    for (const c of cons) {
      const a = c.a, b = c.b;
      const im = a.invM + b.invM;
      if (im === 0) continue;
      let maxPen = 0;
      for (const p of c.points) if (p.pen > maxPen) maxPen = p.pen;
      const corr = Math.max(maxPen - SLOP, 0) * PERC / im;
      a.x -= c.nx * corr * a.invM; a.y -= c.ny * corr * a.invM;
      b.x += c.nx * corr * b.invM; b.y += c.ny * corr * b.invM;
    }
  }
}

/* ---------- 世界与游戏状态 ---------- */
const world = {
  bodies: [], guards: [], blocks: [], statics: [], shotBodies: [],
  particles: [], floaters: [], rings: [], trail: [], flags: []
};
const game = {
  phase: 'title', prevPhase: 'ready',
  level: 1, score: 0, shotsLeft: 0,
  best: clamp(store.get('ss.best', 0) | 0, 0, 99999999),
  unlocked: clamp(store.get('ss.unlocked', 1) | 0, 1, 3),
  abilityUsed: true,
  dragPos: { x: ANCHOR.x, y: ANCHOR.y },
  projBody: null,
  flyT: 0, settleT: 0, quietT: 0, winT: -1,
  time: 0, shake: 0, lastCreak: 0,
  manualClock: false, lastBonus: 0
};

/* ---------- 关卡数据 ---------- */
const LEVELS = [
  {
    name: '前哨关门', shots: 3,
    terrain: [{ x: 640, y: 680, w: 1400, h: 80 }],
    blocks: [
      { mat: 'wood', x: 835, y: 585, w: 22, h: 110 },
      { mat: 'wood', x: 945, y: 585, w: 22, h: 110 },
      { mat: 'wood', x: 890, y: 520, w: 170, h: 20 },
      { mat: 'wood', x: 1080, y: 618, w: 44, h: 44 },
      { mat: 'wood', x: 1080, y: 574, w: 44, h: 44 }
    ],
    guards: [{ x: 890, y: 622 }, { x: 890, y: 492 }],
    flags: [{ x: 962, y: 510 }]
  },
  {
    name: '双栅营地', shots: 3,
    terrain: [
      { x: 640, y: 680, w: 1400, h: 80 },
      { x: 600, y: 600, w: 160, h: 80 }
    ],
    blocks: [
      { mat: 'wood', x: 760, y: 595, w: 18, h: 90 },
      { mat: 'wood', x: 782, y: 595, w: 18, h: 90 },
      { mat: 'wood', x: 804, y: 595, w: 18, h: 90 },
      { mat: 'stone', x: 988, y: 619, w: 42, h: 42 },
      { mat: 'stone', x: 1032, y: 619, w: 42, h: 42 },
      { mat: 'wood', x: 1010, y: 589, w: 130, h: 18 },
      { mat: 'wood', x: 978, y: 545, w: 18, h: 70 },
      { mat: 'wood', x: 1042, y: 545, w: 18, h: 70 },
      { mat: 'wood', x: 1010, y: 502, w: 110, h: 16 },
      { mat: 'stone', x: 1096, y: 610, w: 28, h: 60 }
    ],
    guards: [{ x: 852, y: 622 }, { x: 1010, y: 563 }, { x: 1136, y: 622 }],
    flags: [{ x: 1058, y: 494 }]
  },
  {
    name: '悬崖堡', shots: 4,
    terrain: [
      { x: 640, y: 680, w: 1400, h: 80 },
      { x: 990, y: 620, w: 580, h: 200 }
    ],
    blocks: [
      { mat: 'wood', x: 582, y: 616, w: 16, h: 48 },
      { mat: 'wood', x: 662, y: 616, w: 16, h: 48 },
      { mat: 'wood', x: 622, y: 584, w: 96, h: 16 },
      { mat: 'stone', x: 880, y: 477, w: 30, h: 86 },
      { mat: 'stone', x: 970, y: 477, w: 30, h: 86 },
      { mat: 'stone', x: 925, y: 421, w: 150, h: 26 },
      { mat: 'wood', x: 1060, y: 480, w: 18, h: 80 },
      { mat: 'wood', x: 1120, y: 480, w: 18, h: 80 },
      { mat: 'wood', x: 1090, y: 432, w: 100, h: 16 },
      { mat: 'stone', x: 1196, y: 488, w: 28, h: 64 }
    ],
    guards: [{ x: 622, y: 622 }, { x: 925, y: 502 }, { x: 1090, y: 406 }, { x: 1240, y: 502 }],
    flags: [{ x: 862, y: 408 }, { x: 1132, y: 424 }]
  }
];
const LEVEL_COUNT = LEVELS.length;

function makeBlock(def, id) {
  const stone = def.mat === 'stone';
  const b = new Body({
    shape: 'box', x: def.x, y: def.y, w: def.w, h: def.h,
    density: stone ? 1.7 : 0.9,
    rest: stone ? 0.12 : 0.18,
    fric: stone ? 0.55 : 0.5,
    hp: stone ? 210 : (def.w >= 40 && def.h >= 40 ? 70 : 90),
    mat: def.mat, kind: 'block', id
  });
  const rng = mulberry(b.seed);
  b.cracks = [];
  for (let i = 0; i < 3; i++) {
    const pts = [];
    let cx = (rng() - 0.5) * def.w * 0.9, cy = -def.h / 2;
    pts.push([cx, cy]);
    const steps = 3 + Math.floor(rng() * 2);
    for (let s = 0; s < steps; s++) {
      cx += (rng() - 0.5) * def.w * 0.5;
      cy += def.h / steps;
      pts.push([clamp(cx, -def.w / 2 + 2, def.w / 2 - 2), Math.min(cy, def.h / 2 - 1)]);
    }
    b.cracks.push(pts);
  }
  return b;
}

function makeGuard(x, y, id) {
  const g = new Body({
    shape: 'circle', x, y, r: 16, density: 1.1, rest: 0.15, fric: 0.5,
    hp: 100, kind: 'guard', mat: 'guard', id
  });
  g.blinkT = rand(1.5, 4);
  g.keyAng = rand(0, TAU);
  g.nudgeCool = 0;
  return g;
}

function buildLevel(n) {
  const L = LEVELS[n - 1];
  world.bodies.length = 0; world.guards.length = 0; world.blocks.length = 0;
  world.statics.length = 0; world.shotBodies.length = 0;
  world.particles.length = 0; world.floaters.length = 0;
  world.rings.length = 0; world.trail.length = 0;
  world.flags = (L.flags || []).map(f => ({ x: f.x, y: f.y, seed: Math.random() * 10 }));
  game.shotsLeft = L.shots;
  game.projBody = null; game.abilityUsed = true;
  game.flyT = 0; game.settleT = 0; game.quietT = 0; game.winT = -1;
  resetDragPos();

  for (const t of L.terrain) {
    const s = new Body({ shape: 'box', x: t.x, y: t.y, w: t.w, h: t.h, static: true, kind: 'ground', mat: 'rock', rest: 0.2, fric: 0.6 });
    const rng = mulberry(s.seed);
    const bb = s.aabb();
    s.tufts = [];
    for (let x = bb.x1 + 10; x < bb.x2 - 6; x += 18 + rng() * 22) {
      s.tufts.push({ x, h: 5 + rng() * 9, lean: (rng() - 0.5) * 6 });
    }
    s.pebbles = [];
    for (let i = 0; i < s.w / 40; i++) {
      s.pebbles.push({ x: bb.x1 + rng() * s.w, y: bb.y1 + 12 + rng() * Math.max(10, s.h - 20), r: 1.5 + rng() * 2.5 });
    }
    world.statics.push(s);
    world.bodies.push(s);
  }
  let bi = 1;
  for (const def of L.blocks) {
    const b = makeBlock(def, 'b' + bi++);
    world.blocks.push(b);
    world.bodies.push(b);
  }
  let gi = 1;
  for (const def of L.guards) {
    const g = makeGuard(def.x, def.y, 'g' + gi++);
    world.guards.push(g);
    world.bodies.push(g);
  }
}

/* ---------- 伤害与摧毁 ---------- */
function addShake(v) { game.shake = Math.min(10, Math.max(game.shake, v)); }

function addFloater(x, y, txt, color) {
  world.floaters.push({ x, y, txt, color, t: 0, life: 1.1 });
}

function hurtGuard(g, dmg, src) {
  if (g.dead) return;
  let d = dmg;
  if (src && src.kind === 'projectile') d += 60;
  else if (src && src.kind === 'shard') d += 40;
  if (d < 18 && g.nudgeCool > 0) return;
  g.nudgeCool = 0.28;
  g.hp -= d;
  g.hurtT = 0.3;
  if (d >= 18) {
    addFloater(g.x, g.y - 22, '-' + Math.round(d), '#ff9d6b');
    AudioSys.guardHit();
  }
  if (g.hp <= 0) killGuard(g);
}

function killGuard(g) {
  if (g.dead) return;
  g.dead = true; g.hp = 0;
  game.score += 500;
  addFloater(g.x, g.y - 26, '+500', '#ffd27a');
  rivetBurst(g.x, g.y);
  world.rings.push({ x: g.x, y: g.y, r: 6, max: 66, t: 0, life: 0.42, color: '255,190,90' });
  addShake(4);
  AudioSys.guardDown();
  bumpScore();
  updateHud();
  beginWin();
}

function damageBlock(bl, dmg) {
  if (bl.dead) return;
  bl.hp -= dmg;
  bl.hurtT = 0.25;
  if (bl.hp <= 0) destroyBlock(bl);
}

function destroyBlock(bl) {
  if (bl.dead) return;
  bl.dead = true; bl.hp = 0;
  const stone = bl.mat === 'stone';
  const pts = stone ? 100 : 60;
  game.score += pts;
  addFloater(bl.x, bl.y - 14, '+' + pts, stone ? '#c9d6e6' : '#ffcf8a');
  if (stone) stoneBurst(bl.x, bl.y, bl.w, bl.h); else woodBurst(bl.x, bl.y, bl.w, bl.h);
  addShake(3);
  if (stone) AudioSys.stoneBreak(); else AudioSys.woodBreak();
  bumpScore();
}

function impactDamage(body, vn, other) {
  if (body.dead || body.static) return;
  if (body.kind === 'guard') {
    if (vn > 230) hurtGuard(body, (vn - 230) * 0.6, other);
    else if (other.kind === 'projectile' || other.kind === 'shard') hurtGuard(body, 6, other);
    return;
  }
  if (body.kind === 'block') {
    const stone = body.mat === 'stone';
    const thr = stone ? 480 : 330;
    if (vn > thr) damageBlock(body, (vn - thr) * (stone ? 0.45 : 0.5));
  }
}

function handleImpact(c) {
  const vn = c.maxVn;
  if (vn > 110) {
    const p = c.points[0];
    if (p) dustPuff(p.x, p.y, Math.min(6, 2 + vn / 240));
    AudioSys.thud(Math.min(1, vn / 1000));
    if (vn > 520) addShake(Math.min(7, vn / 180));
  }
  impactDamage(c.a, vn, c.b);
  impactDamage(c.b, vn, c.a);
}

/* ---------- 物理步进 ---------- */
function physicsStep(dt) {
  const bodies = world.bodies;
  for (const b of bodies) {
    if (b.static || b.dead) continue;
    b.vy += GRAV * dt;
    b.vx *= 0.9995; b.vy *= 0.9995; b.va *= 0.998;
    const sp = b.speed();
    if (sp > 2400) { b.vx *= 2400 / sp; b.vy *= 2400 / sp; }
    b.va = clamp(b.va, -24, 24);
    if (sp < 3 && Math.abs(b.va) < 0.15) b.va *= 0.8;
  }
  const cons = [];
  for (let i = 0; i < bodies.length; i++) {
    const a = bodies[i];
    if (a.dead) continue;
    const ab = a.aabb();
    for (let j = i + 1; j < bodies.length; j++) {
      const b = bodies[j];
      if (b.dead || (a.static && b.static)) continue;
      const bb = b.aabb();
      if (ab.x1 > bb.x2 || bb.x1 > ab.x2 || ab.y1 > bb.y2 || bb.y1 > ab.y2) continue;
      const c = collide(a, b);
      if (c) cons.push(c);
    }
  }
  solveVelocity(cons, 10);
  for (const b of bodies) {
    if (b.static || b.dead) continue;
    b.x += b.vx * dt; b.y += b.vy * dt; b.angle += b.va * dt;
    if (!isFinite(b.x) || !isFinite(b.y)) { b.dead = true; continue; }
    if (b.kind === 'projectile' || b.kind === 'shard') {
      for (const c of cons) {
        if (c.a === b || c.b === b) { b.touched = true; break; }
      }
    }
    if (!b.static && (b.x < -160 || b.x > W + 200 || b.y > H + 140)) {
      if (b.kind === 'guard') killGuard(b);
      b.dead = true;
    }
  }
  solvePosition(cons, 2);
  for (const c of cons) handleImpact(c);
  world.bodies = world.bodies.filter(b => !b.dead);
}

function worldQuiet() {
  for (const b of world.bodies) {
    if (b.static || b.dead) continue;
    if (b.speed() > 16 || Math.abs(b.va) > 0.6) return false;
  }
  return true;
}

function shotActive() {
  for (const s of world.shotBodies) {
    if (s.dead) continue;
    if (s.kind === 'shard') { if (s.life > 0) return true; continue; }
    if (s.x < -100 || s.x > W + 140 || s.y > H + 100) continue;
    if (s.touched && s.speed() < 26) continue;
    return true;
  }
  return false;
}

/* ---------- 回合与阶段流转 ---------- */
function resetDragPos() { game.dragPos = { x: ANCHOR.x, y: ANCHOR.y }; }

function doLaunch() {
  const dx = ANCHOR.x - game.dragPos.x, dy = ANCHOR.y - game.dragPos.y;
  const pull = Math.hypot(dx, dy);
  if (pull < 14 || game.shotsLeft <= 0) { game.phase = 'ready'; resetDragPos(); return null; }
  const b = new Body({
    shape: 'circle', x: game.dragPos.x, y: game.dragPos.y, r: 17,
    density: 3.4, rest: 0.32, fric: 0.25, kind: 'projectile', hp: Infinity
  });
  b.vx = dx * POWER_K; b.vy = dy * POWER_K;
  world.bodies.push(b);
  game.projBody = b;
  world.shotBodies.length = 0;
  world.shotBodies.push(b);
  game.shotsLeft--;
  game.abilityUsed = false;
  game.flyT = 0; game.quietT = 0;
  game.phase = 'fly';
  world.trail.length = 0;
  AudioSys.launch();
  addShake(3);
  updateHud();
  return b;
}

function tryAbility() {
  const p = game.projBody;
  if (game.phase !== 'fly' || game.abilityUsed || !p || p.dead) return false;
  game.abilityUsed = true;
  const sp = Math.max(420, p.speed() * 1.05);
  const base = Math.atan2(p.vy, p.vx);
  for (const da of [-0.34, 0, 0.34]) {
    const s = new Body({
      shape: 'circle', x: p.x, y: p.y, r: 9, density: 3.0, rest: 0.35, fric: 0.3,
      kind: 'shard', hp: Infinity
    });
    s.vx = Math.cos(base + da) * sp;
    s.vy = Math.sin(base + da) * sp;
    s.life = 2.6;
    world.bodies.push(s);
    world.shotBodies.push(s);
  }
  p.dead = true;
  world.rings.push({ x: p.x, y: p.y, r: 8, max: 96, t: 0, life: 0.5, color: '90,235,220' });
  world.rings.push({ x: p.x, y: p.y, r: 4, max: 60, t: 0, life: 0.4, color: '255,210,122' });
  spawnSparks(p.x, p.y, 16);
  addShake(7);
  AudioSys.ability();
  hideAbilityHint();
  return true;
}

function beginWin() {
  if (game.winT > 0 || game.phase === 'clear' || game.phase === 'fail' || game.phase === 'title') return;
  game.winT = 0.6;
}

function endTurn() {
  world.shotBodies.length = 0;
  const alive = world.guards.some(g => !g.dead);
  if (!alive) { beginWin(); return; }
  if (game.shotsLeft > 0) {
    game.phase = 'ready';
    game.projBody = null;
    resetDragPos();
    AudioSys.load();
    updateHud();
  } else {
    doFail();
  }
}

function showClear() {
  game.phase = 'clear';
  const bonus = game.shotsLeft * 300;
  game.score += bonus;
  game.lastBonus = bonus;
  if (game.level < LEVEL_COUNT) game.unlocked = Math.max(game.unlocked, game.level + 1);
  game.best = Math.max(game.best, game.score);
  store.set('ss.best', game.best);
  store.set('ss.unlocked', game.unlocked);
  $('clearTitle').textContent = game.level < LEVEL_COUNT ? '胜利 · 堡垒告破！' : '胜利 · 三堡尽下！';
  $('clearLv').textContent = '第 ' + game.level + ' 关 · ' + LEVELS[game.level - 1].name;
  $('clearBonus').textContent = '剩余弹药 ×' + game.shotsLeft + '  ·  +' + bonus;
  $('clearScore').textContent = game.score;
  $('btnNext').textContent = game.level < LEVEL_COUNT ? '下一关 →' : '从头再来';
  spawnConfetti();
  AudioSys.win();
  syncOverlays();
  updateHud();
}

function doFail() {
  game.phase = 'fail';
  game.best = Math.max(game.best, game.score);
  store.set('ss.best', game.best);
  $('failLv').textContent = '第 ' + game.level + ' 关 · ' + LEVELS[game.level - 1].name;
  const left = world.guards.filter(g => !g.dead).length;
  $('failInfo').textContent = '还有 ' + left + ' 名发条守卫在堡垒上耀武扬威。';
  AudioSys.lose();
  syncOverlays();
}

function loadLevel(n) {
  game.level = clamp(n, 1, LEVEL_COUNT);
  buildLevel(game.level);
  game.phase = 'ready';
  syncOverlays();
  updateHud();
  showToast('第 ' + game.level + ' 关 · ' + LEVELS[game.level - 1].name,
    '目标：击退全部发条守卫 · 弹药 ×' + game.shotsLeft);
}

function startRun(fromLevel) {
  game.score = 0;
  loadLevel(fromLevel);
}

function toTitle() {
  game.phase = 'title';
  buildLevel(1);
  syncOverlays();
  updateTitleMeta();
}

/* ---------- 计时更新 ---------- */
function update(dt) {
  game.time += dt;
  game.shake *= Math.exp(-5.5 * dt);
  if (game.shake < 0.05) game.shake = 0;

  for (const g of world.guards) {
    if (g.dead) continue;
    g.blinkT -= dt;
    if (g.blinkT < -0.12) g.blinkT = rand(2.2, 4.2);
    g.keyAng += dt * (g.hurtT > 0 ? 14 : 1.3);
    if (g.hurtT > 0) g.hurtT -= dt;
    if (g.nudgeCool > 0) g.nudgeCool -= dt;
  }
  for (const b of world.blocks) if (b.hurtT > 0) b.hurtT -= dt;

  for (const s of world.bodies) {
    if (s.kind === 'shard' && !s.dead) {
      s.life -= dt;
      if (s.life <= 0) { s.dead = true; poof(s.x, s.y); }
    }
  }

  const p = game.projBody;
  if (game.phase === 'fly' && p && !p.dead) {
    world.trail.push({ x: p.x, y: p.y });
    if (world.trail.length > 26) world.trail.shift();
  }

  updateParticles(dt);
  updateFloaters(dt);
  updateRings(dt);

  if (game.winT > 0) {
    game.winT -= dt;
    if (game.winT <= 0) { game.winT = -1; showClear(); }
  }

  if (game.phase === 'fly') {
    game.flyT += dt;
    if ((!shotActive() && game.flyT > 0.3) || game.flyT > 6.5) {
      game.phase = 'settle';
      game.settleT = 0; game.quietT = 0;
      hideAbilityHint();
    }
  } else if (game.phase === 'settle') {
    game.settleT += dt;
    if (worldQuiet()) game.quietT += dt; else game.quietT = 0;
    if (game.quietT > 0.5 || game.settleT > 4.5) endTurn();
  }
}

/* ---------- 粒子 / 拖尾 / 浮动文字 ---------- */
function spawnP(o) {
  if (world.particles.length > 420) world.particles.shift();
  world.particles.push(Object.assign({
    x: 0, y: 0, vx: 0, vy: 0, t: 0, life: 0.7, grav: 1, size: 4,
    spin: 0, ang: rand(0, TAU), type: 'spark', color: '255,200,120'
  }, o));
}
function updateParticles(dt) {
  const arr = world.particles;
  for (let i = arr.length - 1; i >= 0; i--) {
    const p = arr[i];
    p.t += dt;
    if (p.t >= p.life) { arr.splice(i, 1); continue; }
    p.vy += 1100 * p.grav * dt;
    p.x += p.vx * dt; p.y += p.vy * dt; p.ang += p.spin * dt;
    if (p.type !== 'smoke' && p.y > GROUND_Y + 34 && p.vy > 0) {
      p.y = GROUND_Y + 34; p.vy *= -0.4; p.vx *= 0.7;
    }
  }
}
function updateFloaters(dt) {
  for (let i = world.floaters.length - 1; i >= 0; i--) {
    const f = world.floaters[i];
    f.t += dt; f.y -= 46 * dt;
    if (f.t >= f.life) world.floaters.splice(i, 1);
  }
}
function updateRings(dt) {
  for (let i = world.rings.length - 1; i >= 0; i--) {
    const r = world.rings[i];
    r.t += dt;
    if (r.t >= r.life) world.rings.splice(i, 1);
  }
}
function dustPuff(x, y, n) {
  for (let i = 0; i < n; i++) {
    spawnP({ x, y, vx: rand(-70, 70), vy: rand(-120, -20), life: rand(0.3, 0.6), grav: 0.25, size: rand(3, 7), type: 'dust', color: '196,170,130' });
  }
}
function spawnSparks(x, y, n) {
  for (let i = 0; i < n; i++) {
    const a = rand(0, TAU), sp = rand(120, 460);
    spawnP({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: rand(0.25, 0.55), grav: 0.5, size: rand(2, 4.5), type: 'spark', color: Math.random() < 0.5 ? '90,235,220' : '255,210,122' });
  }
}
function woodBurst(x, y, w, h) {
  for (let i = 0; i < 9; i++) {
    spawnP({ x: x + rand(-w / 2, w / 2), y: y + rand(-h / 2, h / 2), vx: rand(-220, 220), vy: rand(-320, -60), life: rand(0.5, 0.9), grav: 1, size: rand(3, 7), spin: rand(-9, 9), type: 'chip', color: '150,98,44' });
  }
  dustPuff(x, y, 5);
}
function stoneBurst(x, y, w, h) {
  for (let i = 0; i < 9; i++) {
    spawnP({ x: x + rand(-w / 2, w / 2), y: y + rand(-h / 2, h / 2), vx: rand(-200, 200), vy: rand(-300, -40), life: rand(0.5, 1), grav: 1, size: rand(3.5, 8), spin: rand(-7, 7), type: 'chunk', color: '139,147,163' });
  }
  dustPuff(x, y, 6);
}
function rivetBurst(x, y) {
  for (let i = 0; i < 10; i++) {
    spawnP({ x, y: y - 4, vx: rand(-240, 240), vy: rand(-360, -80), life: rand(0.5, 0.9), grav: 1, size: rand(2, 3.6), type: 'rivet', color: '159,176,192' });
  }
  for (let i = 0; i < 5; i++) {
    spawnP({ x: x + rand(-8, 8), y: y + rand(-8, 8), vx: rand(-30, 30), vy: rand(-70, -20), life: rand(0.4, 0.8), grav: -0.15, size: rand(5, 9), type: 'smoke', color: '170,180,190' });
  }
}
function poof(x, y) {
  for (let i = 0; i < 6; i++) {
    spawnP({ x, y, vx: rand(-90, 90), vy: rand(-120, -10), life: rand(0.25, 0.5), grav: 0.1, size: rand(3, 6), type: 'spark', color: '255,190,110' });
  }
}
function spawnConfetti() {
  const colors = ['255,210,122', '90,235,220', '255,140,90', '200,220,255'];
  for (let i = 0; i < 70; i++) {
    spawnP({
      x: rand(200, W - 120), y: rand(-60, 120),
      vx: rand(-90, 90), vy: rand(40, 200),
      life: rand(1.2, 2.2), grav: 0.25, size: rand(3, 6),
      spin: rand(-8, 8), type: 'confetti', color: colors[i % colors.length]
    });
  }
}

/* ---------- 渲染 ---------- */
const canvas = $('game');
const ctx = canvas.getContext('2d');
let renderScale = 1;

function fitCanvas() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const cw = canvas.clientWidth || 1280;
  canvas.width = Math.round(cw * dpr);
  canvas.height = Math.round(cw * dpr * 9 / 16);
  renderScale = canvas.width / W;
}

const STARS = [];
for (let i = 0; i < 64; i++) STARS.push({ x: rand(0, W), y: rand(8, 235), r: rand(0.6, 1.7), ph: rand(0, TAU), sp: rand(0.6, 2) });
const CLOUDS = [
  { x: 120, y: 120, s: 1.2, sp: 7 },
  { x: 520, y: 70, s: 0.85, sp: 11 },
  { x: 880, y: 150, s: 1.4, sp: 5 },
  { x: 1180, y: 90, s: 1, sp: 9 }
];
const FLIES = [];
for (let i = 0; i < 13; i++) FLIES.push({ bx: rand(80, W - 60), by: rand(470, 628), ph: rand(0, TAU), sp: rand(0.5, 1.4), amp: rand(14, 42) });
const MTN_FAR = [], MTN_MID = [];
(function () {
  const rng = mulberry(77);
  let x = -60;
  while (x < W + 80) { MTN_FAR.push({ x, y: 330 - rng() * 130 }); x += 90 + rng() * 90; }
  x = -40;
  while (x < W + 80) { MTN_MID.push({ x, y: 420 - rng() * 90 }); x += 70 + rng() * 80; }
})();

function groundYAt(x) {
  let gy = GROUND_Y;
  for (const b of world.statics) {
    const bb = b.aabb();
    if (x >= bb.x1 && x <= bb.x2 && bb.y1 < gy) gy = bb.y1;
  }
  return gy;
}

function drawSky() {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#0d1f33');
  g.addColorStop(0.42, '#31345c');
  g.addColorStop(0.62, '#8a4a44');
  g.addColorStop(0.78, '#d97b35');
  g.addColorStop(1, '#f0a54e');
  ctx.fillStyle = g;
  ctx.fillRect(-20, -20, W + 40, H + 40);

  for (const s of STARS) {
    const a = (0.25 + 0.55 * Math.abs(Math.sin(game.time * s.sp + s.ph))) * (1 - s.y / 260);
    ctx.fillStyle = 'rgba(235,240,255,' + a.toFixed(3) + ')';
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, TAU); ctx.fill();
  }

  const sg = ctx.createRadialGradient(1005, 285, 8, 1005, 285, 200);
  sg.addColorStop(0, 'rgba(255,236,190,0.95)');
  sg.addColorStop(0.22, 'rgba(255,200,120,0.55)');
  sg.addColorStop(1, 'rgba(255,170,80,0)');
  ctx.fillStyle = sg;
  ctx.beginPath(); ctx.arc(1005, 285, 200, 0, TAU); ctx.fill();
  ctx.fillStyle = '#ffe9bd';
  ctx.beginPath(); ctx.arc(1005, 285, 42, 0, TAU); ctx.fill();
}

function drawMountains(camX) {
  ctx.fillStyle = '#241f3f';
  ctx.beginPath();
  ctx.moveTo(-80, H);
  for (const p of MTN_FAR) ctx.lineTo(p.x + camX * 0.35, p.y);
  ctx.lineTo(W + 80, H);
  ctx.closePath(); ctx.fill();

  ctx.fillStyle = '#3a2733';
  ctx.beginPath();
  ctx.moveTo(-80, H);
  for (const p of MTN_MID) ctx.lineTo(p.x + camX * 0.6, p.y);
  ctx.lineTo(W + 80, H);
  ctx.closePath(); ctx.fill();
}

function drawClouds(camX) {
  ctx.fillStyle = 'rgba(255,196,140,0.13)';
  for (const c of CLOUDS) {
    const x = ((c.x + game.time * c.sp + camX * 0.2) % (W + 400)) - 200;
    ctx.beginPath();
    ctx.ellipse(x, c.y, 90 * c.s, 20 * c.s, 0, 0, TAU);
    ctx.ellipse(x + 55 * c.s, c.y - 12 * c.s, 60 * c.s, 16 * c.s, 0, 0, TAU);
    ctx.ellipse(x - 60 * c.s, c.y + 6 * c.s, 52 * c.s, 13 * c.s, 0, 0, TAU);
    ctx.fill();
  }
}

function drawFireflies() {
  for (const f of FLIES) {
    const x = f.bx + Math.sin(game.time * f.sp + f.ph) * f.amp;
    const y = f.by + Math.cos(game.time * f.sp * 0.8 + f.ph) * f.amp * 0.4;
    const a = 0.25 + 0.5 * Math.abs(Math.sin(game.time * 2.2 + f.ph));
    ctx.fillStyle = 'rgba(190,255,210,' + a.toFixed(3) + ')';
    ctx.shadowColor = 'rgba(140,255,190,0.9)';
    ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.arc(x, y, 1.7, 0, TAU); ctx.fill();
    ctx.shadowBlur = 0;
  }
}

function drawTerrain() {
  for (const s of world.statics) {
    const bb = s.aabb();
    const g = ctx.createLinearGradient(0, bb.y1, 0, Math.min(bb.y2, H + 20));
    g.addColorStop(0, '#4d3826');
    g.addColorStop(1, '#241811');
    ctx.fillStyle = g;
    ctx.fillRect(bb.x1, bb.y1, bb.x2 - bb.x1, Math.min(bb.y2, H + 30) - bb.y1);
    ctx.fillStyle = '#8f9a52';
    ctx.fillRect(bb.x1, bb.y1, bb.x2 - bb.x1, 5);
    ctx.fillStyle = 'rgba(220,205,130,0.5)';
    ctx.fillRect(bb.x1, bb.y1, bb.x2 - bb.x1, 1.6);
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 1;
    for (const pb of s.pebbles) {
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.beginPath(); ctx.arc(pb.x, pb.y, pb.r, 0, TAU); ctx.fill();
    }
    ctx.strokeStyle = '#a8b263';
    ctx.lineWidth = 1.6;
    for (const t of s.tufts) {
      ctx.beginPath();
      ctx.moveTo(t.x, bb.y1 + 2);
      ctx.quadraticCurveTo(t.x + t.lean * 0.4, bb.y1 - t.h * 0.6, t.x + t.lean, bb.y1 - t.h);
      ctx.stroke();
    }
  }
}

function drawFlags() {
  for (const f of world.flags) {
    ctx.strokeStyle = '#5d4426';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(f.x, f.y - 34); ctx.stroke();
    const w1 = Math.sin(game.time * 5 + f.seed) * 3;
    const w2 = Math.sin(game.time * 5 + f.seed + 1.4) * 4;
    ctx.fillStyle = '#c8542e';
    ctx.beginPath();
    ctx.moveTo(f.x, f.y - 34);
    ctx.quadraticCurveTo(f.x + 14, f.y - 32 + w1, f.x + 26, f.y - 28 + w2);
    ctx.lineTo(f.x, f.y - 22);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,220,150,0.8)';
    ctx.beginPath(); ctx.arc(f.x + 8, f.y - 28 + w1 * 0.4, 2, 0, TAU); ctx.fill();
  }
}

function drawSlingshotBack() {
  ctx.fillStyle = '#2c1e12';
  ctx.beginPath(); ctx.ellipse(170, 641, 46, 12, 0, 0, TAU); ctx.fill();

  ctx.lineCap = 'round';
  ctx.strokeStyle = '#4e331a';
  ctx.lineWidth = 15;
  ctx.beginPath();
  ctx.moveTo(174, 646);
  ctx.quadraticCurveTo(152, 560, TIPS[0].x, TIPS[0].y);
  ctx.stroke();
  ctx.strokeStyle = '#7a5426';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(172, 640);
  ctx.quadraticCurveTo(152, 562, TIPS[0].x + 1, TIPS[0].y + 4);
  ctx.stroke();

  ctx.strokeStyle = '#4e331a';
  ctx.lineWidth = 16;
  ctx.beginPath();
  ctx.moveTo(166, 646);
  ctx.lineTo(170, 560);
  ctx.stroke();
}

function drawSlingshotFront() {
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#5d3d1e';
  ctx.lineWidth = 15;
  ctx.beginPath();
  ctx.moveTo(170, 646);
  ctx.quadraticCurveTo(192, 556, TIPS[1].x, TIPS[1].y);
  ctx.stroke();
  ctx.strokeStyle = '#8a5f30';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(170, 640);
  ctx.quadraticCurveTo(191, 558, TIPS[1].x - 1, TIPS[1].y + 4);
  ctx.stroke();
}

function pouchPos() {
  if (game.phase === 'ready' || game.phase === 'drag') return game.dragPos;
  return null;
}

function drawBands() {
  const pp = pouchPos();
  ctx.lineCap = 'round';
  if (pp) {
    ctx.strokeStyle = '#33241588';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(TIPS[0].x, TIPS[0].y);
    ctx.lineTo(pp.x, pp.y);
    ctx.stroke();
  } else {
    ctx.strokeStyle = '#3a2a1c';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(TIPS[0].x, TIPS[0].y);
    ctx.quadraticCurveTo(ANCHOR.x, ANCHOR.y + 26, TIPS[1].x, TIPS[1].y);
    ctx.stroke();
  }
}

function drawBandFront() {
  const pp = pouchPos();
  if (!pp) return;
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#3a2a1c';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(TIPS[1].x, TIPS[1].y);
  ctx.lineTo(pp.x + 3, pp.y);
  ctx.stroke();
  ctx.strokeStyle = '#7a5a34';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(TIPS[1].x, TIPS[1].y);
  ctx.lineTo(pp.x + 3, pp.y);
  ctx.stroke();
  ctx.fillStyle = '#54401f';
  ctx.beginPath();
  ctx.ellipse(pp.x + 2, pp.y + 2, 12, 8, 0.3, 0, TAU);
  ctx.fill();
}

function drawRuneStone(x, y, r, ang, pulse) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang || 0);
  const glowA = 0.28 + (pulse ? 0.14 * Math.sin(game.time * 7) : 0);
  const g = ctx.createRadialGradient(0, 0, r * 0.2, 0, 0, r * 2.3);
  g.addColorStop(0, 'rgba(80,230,215,' + glowA + ')');
  g.addColorStop(1, 'rgba(80,230,215,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(0, 0, r * 2.3, 0, TAU); ctx.fill();
  const bg = ctx.createRadialGradient(-r * 0.4, -r * 0.4, r * 0.2, 0, 0, r);
  bg.addColorStop(0, '#dcbc8e');
  bg.addColorStop(0.6, '#a97f47');
  bg.addColorStop(1, '#6f4d24');
  ctx.fillStyle = bg;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#3f2c12';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = 'rgba(60,40,16,0.5)';
  ctx.beginPath(); ctx.arc(r * 0.42, r * 0.3, r * 0.13, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(-r * 0.3, r * 0.5, r * 0.09, 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(90,235,220,0.95)';
  ctx.lineWidth = Math.max(1.6, r * 0.13);
  ctx.shadowColor = '#39d0c4';
  ctx.shadowBlur = 9;
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.52);
  ctx.lineTo(r * 0.4, 0);
  ctx.lineTo(0, r * 0.52);
  ctx.lineTo(-r * 0.4, 0);
  ctx.closePath();
  ctx.moveTo(0, -r * 0.52);
  ctx.lineTo(0, r * 0.52);
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.restore();
}

function drawShard(s) {
  const a = clamp(s.life / 0.6, 0, 1);
  ctx.save();
  ctx.globalAlpha = a;
  const g = ctx.createRadialGradient(s.x, s.y, 1, s.x, s.y, s.r * 2.6);
  g.addColorStop(0, 'rgba(255,220,140,0.9)');
  g.addColorStop(1, 'rgba(255,150,60,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(s.x, s.y, s.r * 2.6, 0, TAU); ctx.fill();
  ctx.translate(s.x, s.y);
  ctx.rotate(s.angle);
  ctx.fillStyle = '#ffd27a';
  ctx.strokeStyle = '#c97f22';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(s.r, 0);
  ctx.lineTo(0, s.r * 0.7);
  ctx.lineTo(-s.r, 0);
  ctx.lineTo(0, -s.r * 0.7);
  ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.restore();
  ctx.globalAlpha = 1;
}

function drawTrail() {
  const n = world.trail.length;
  for (let i = 0; i < n; i++) {
    const t = world.trail[i];
    const k = i / n;
    ctx.fillStyle = 'rgba(120,235,215,' + (k * 0.4).toFixed(3) + ')';
    ctx.beginPath();
    ctx.arc(t.x, t.y, 2 + k * 5, 0, TAU);
    ctx.fill();
  }
}

function drawBlock(b) {
  if (b.dead) return;
  const stone = b.mat === 'stone';
  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.rotate(b.angle);
  const hw = b.w / 2, hh = b.h / 2;
  if (stone) {
    const g = ctx.createLinearGradient(-hw, -hh, hw, hh);
    g.addColorStop(0, '#9aa3b4');
    g.addColorStop(1, '#6d7687');
    ctx.fillStyle = g;
  } else {
    const g = ctx.createLinearGradient(-hw, -hh, hw, hh);
    g.addColorStop(0, '#c08a48');
    g.addColorStop(1, '#8f622c');
    ctx.fillStyle = g;
  }
  ctx.fillRect(-hw, -hh, b.w, b.h);
  ctx.strokeStyle = stone ? '#464e5e' : '#5d3d18';
  ctx.lineWidth = 2;
  ctx.strokeRect(-hw, -hh, b.w, b.h);
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-hw + 2, -hh + 2);
  ctx.lineTo(hw - 2, -hh + 2);
  ctx.stroke();

  if (stone) {
    ctx.strokeStyle = 'rgba(40,46,60,0.55)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-hw + 2, 0);
    ctx.lineTo(hw - 2, 0);
    ctx.moveTo(0, -hh + 2);
    ctx.lineTo(0, 0);
    ctx.moveTo(-hw * 0.5, 0);
    ctx.lineTo(-hw * 0.5, hh - 2);
    ctx.moveTo(hw * 0.5, 0);
    ctx.lineTo(hw * 0.5, hh - 2);
    ctx.stroke();
  } else {
    ctx.strokeStyle = 'rgba(90,58,22,0.5)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    if (b.h >= b.w) {
      for (let i = 1; i <= 2; i++) { ctx.moveTo(-hw + 3 + (b.w - 6) * i / 3, -hh + 3); ctx.lineTo(-hw + 3 + (b.w - 6) * i / 3, hh - 3); }
    } else {
      for (let i = 1; i <= 2; i++) { ctx.moveTo(-hw + 3, -hh + 3 + (b.h - 6) * i / 3); ctx.lineTo(hw - 3, -hh + 3 + (b.h - 6) * i / 3); }
    }
    ctx.stroke();
    ctx.fillStyle = 'rgba(50,32,10,0.8)';
    for (const [nx, ny] of [[-hw + 4, -hh + 4], [hw - 4, -hh + 4], [-hw + 4, hh - 4], [hw - 4, hh - 4]]) {
      ctx.beginPath(); ctx.arc(nx, ny, 1.5, 0, TAU); ctx.fill();
    }
  }

  const dmg = 1 - b.hp / b.maxHp;
  if (dmg > 0.3) {
    ctx.strokeStyle = 'rgba(20,14,8,0.75)';
    ctx.lineWidth = 1.6;
    const n = dmg > 0.65 ? 3 : 1 + (dmg > 0.45 ? 1 : 0);
    for (let ci = 0; ci < n; ci++) {
      const pts = b.cracks[ci];
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let k = 1; k < pts.length; k++) ctx.lineTo(pts[k][0], pts[k][1]);
      ctx.stroke();
    }
  }
  if (b.hurtT > 0) {
    ctx.fillStyle = 'rgba(255,255,255,' + (b.hurtT * 1.6).toFixed(3) + ')';
    ctx.fillRect(-hw, -hh, b.w, b.h);
  }
  ctx.restore();
}

function drawGuard(g) {
  if (g.dead) return;
  const resting = g.speed() < 20;
  const bob = resting ? Math.sin(game.time * 2.1 + g.seed % 10) * 1.3 : 0;
  const x = g.x, y = g.y + bob;
  ctx.save();
  ctx.translate(x, y);

  ctx.save();
  ctx.translate(13, -2);
  ctx.rotate(g.keyAng);
  ctx.strokeStyle = '#8d6a2f';
  ctx.lineWidth = 2.6;
  ctx.beginPath(); ctx.arc(0, -4.5, 4, 0, TAU); ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 4.5, 4, 0, TAU); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(0, 8); ctx.stroke();
  ctx.restore();

  ctx.fillStyle = '#4a5563';
  ctx.beginPath(); ctx.ellipse(-6, 15, 5, 3.4, 0, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.ellipse(6, 15, 5, 3.4, 0, 0, TAU); ctx.fill();

  const bg = ctx.createRadialGradient(-5, -6, 3, 0, 0, 17);
  bg.addColorStop(0, '#b9c6d2');
  bg.addColorStop(0.65, '#7e8b9a');
  bg.addColorStop(1, '#525e6d');
  ctx.fillStyle = bg;
  ctx.beginPath(); ctx.arc(0, 0, 16, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#333d4a';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#39434f';
  ctx.beginPath(); ctx.arc(0, 0, 16, Math.PI * 1.05, Math.PI * 1.95); ctx.lineTo(0, -8); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#c8542e';
  ctx.beginPath(); ctx.arc(0, -15.5, 3, 0, TAU); ctx.fill();

  ctx.fillStyle = '#5d6a78';
  for (const [rx, ry] of [[-11, 4], [11, 4], [-8, 11], [8, 11]]) {
    ctx.beginPath(); ctx.arc(rx, ry, 1.7, 0, TAU); ctx.fill();
  }

  const hpFrac = g.hp / g.maxHp;
  if (hpFrac < 0.6) {
    ctx.strokeStyle = 'rgba(30,36,44,0.7)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-13, -4); ctx.lineTo(-8, 1); ctx.lineTo(-12, 6);
    ctx.stroke();
  }

  const blink = g.blinkT < 0 ? 0.15 : 1;
  const threat = game.projBody && !game.projBody.dead && Math.abs(game.projBody.x - x) < 320;
  ctx.fillStyle = threat ? '#ffde7a' : '#ffc95e';
  ctx.shadowColor = '#ffbe3c';
  ctx.shadowBlur = 6;
  ctx.beginPath();
  ctx.ellipse(-5.5, -1, 2.7, 2.7 * blink, 0, 0, TAU);
  ctx.ellipse(3.5, -1, 2.7, 2.7 * blink, 0, 0, TAU);
  ctx.fill();
  ctx.shadowBlur = 0;
  if (threat && blink === 1) {
    ctx.strokeStyle = '#39434f';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-8.5, -6); ctx.lineTo(-3, -4.4);
    ctx.moveTo(6.5, -6); ctx.lineTo(1, -4.4);
    ctx.stroke();
  }

  ctx.strokeStyle = '#39434f';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(-1, 6, 4, Math.PI * 0.15, Math.PI * 0.85);
  ctx.stroke();

  if (g.hurtT > 0) {
    ctx.fillStyle = 'rgba(255,255,255,' + (g.hurtT * 1.8).toFixed(3) + ')';
    ctx.beginPath(); ctx.arc(0, 0, 16, 0, TAU); ctx.fill();
  }
  ctx.restore();
}

function drawAimUI() {
  const pp = game.dragPos;
  const dx = ANCHOR.x - pp.x, dy = ANCHOR.y - pp.y;
  const pull = Math.hypot(dx, dy);
  const power = clamp(pull / MAX_PULL, 0, 1);
  const vx = dx * POWER_K, vy = dy * POWER_K;

  ctx.strokeStyle = 'rgba(240,230,210,0.25)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([5, 6]);
  ctx.beginPath();
  ctx.moveTo(ANCHOR.x, ANCHOR.y);
  ctx.lineTo(pp.x, pp.y);
  ctx.stroke();
  ctx.setLineDash([]);

  if (pull > 10) {
    let px = pp.x, py = pp.y;
    for (let i = 1; i <= 30; i++) {
      const t = i * 0.045;
      const x = pp.x + vx * t;
      const y = pp.y + vy * t + 0.5 * GRAV * t * t;
      if (y > groundYAt(x) - 8) {
        ctx.strokeStyle = 'rgba(120,235,215,0.8)';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(x, groundYAt(x) - 4, 9, 0, TAU); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x - 13, groundYAt(x) - 4); ctx.lineTo(x + 13, groundYAt(x) - 4); ctx.stroke();
        break;
      }
      const k = 1 - i / 34;
      ctx.fillStyle = 'rgba(120,235,215,' + (0.85 * k).toFixed(3) + ')';
      ctx.beginPath();
      ctx.arc(x, y, 2.2 + 3.4 * k, 0, TAU);
      ctx.fill();
      px = x; py = y;
    }
  }

  const bx = ANCHOR.x - 62, by = ANCHOR.y + 96;
  ctx.fillStyle = 'rgba(10,16,26,0.72)';
  ctx.fillRect(bx - 6, by - 6, 136, 26);
  ctx.strokeStyle = 'rgba(232,163,61,0.5)';
  ctx.lineWidth = 1;
  ctx.strokeRect(bx - 6, by - 6, 136, 26);
  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  ctx.fillRect(bx, by, 124, 7);
  const hue = 160 - 140 * power;
  ctx.fillStyle = 'hsl(' + hue + ',82%,58%)';
  ctx.fillRect(bx, by, 124 * power, 7);
  ctx.fillStyle = '#e8dcc4';
  ctx.font = '11px ' + FONT_D;
  ctx.textAlign = 'left';
  ctx.fillText('力度 ' + Math.round(power * 100) + '%', bx, by + 17);
}

function drawAbilityRing() {
  const p = game.projBody;
  if (game.phase !== 'fly' || game.abilityUsed || !p || p.dead) return;
  const rr = 27 + 5 * Math.sin(game.time * 8);
  ctx.strokeStyle = 'rgba(90,235,220,0.75)';
  ctx.lineWidth = 2;
  ctx.setLineDash([7, 7]);
  ctx.beginPath();
  ctx.arc(p.x, p.y, rr, game.time * 2, game.time * 2 + TAU);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawParticles() {
  for (const p of world.particles) {
    const k = 1 - p.t / p.life;
    if (p.type === 'spark') {
      ctx.fillStyle = 'rgba(' + p.color + ',' + (0.9 * k).toFixed(3) + ')';
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (0.5 + k * 0.5), 0, TAU); ctx.fill();
    } else if (p.type === 'dust' || p.type === 'smoke') {
      ctx.fillStyle = 'rgba(' + p.color + ',' + (0.34 * k).toFixed(3) + ')';
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (1.6 - k * 0.6), 0, TAU); ctx.fill();
    } else if (p.type === 'chip' || p.type === 'confetti') {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.ang);
      ctx.fillStyle = 'rgba(' + p.color + ',' + (0.95 * k).toFixed(3) + ')';
      ctx.fillRect(-p.size, -p.size * 0.5, p.size * 2, p.size);
      ctx.restore();
    } else if (p.type === 'chunk') {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.ang);
      ctx.fillStyle = 'rgba(' + p.color + ',' + (0.95 * k).toFixed(3) + ')';
      ctx.beginPath();
      ctx.moveTo(p.size, 0);
      ctx.lineTo(0, p.size * 0.8);
      ctx.lineTo(-p.size, 0.2 * p.size);
      ctx.lineTo(-0.2 * p.size, -p.size * 0.8);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    } else if (p.type === 'rivet') {
      ctx.fillStyle = 'rgba(' + p.color + ',' + (0.95 * k).toFixed(3) + ')';
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, TAU); ctx.fill();
    }
  }
}

function drawFloaters() {
  ctx.textAlign = 'center';
  ctx.font = 'bold 21px ' + FONT_D;
  for (const f of world.floaters) {
    const a = 1 - f.t / f.life;
    ctx.strokeStyle = 'rgba(16,10,4,' + (0.8 * a).toFixed(3) + ')';
    ctx.lineWidth = 4;
    ctx.strokeText(f.txt, f.x, f.y);
    ctx.fillStyle = f.color;
    ctx.globalAlpha = a;
    ctx.fillText(f.txt, f.x, f.y);
    ctx.globalAlpha = 1;
  }
}

function drawRings() {
  for (const r of world.rings) {
    const k = r.t / r.life;
    const ease = 1 - (1 - k) * (1 - k);
    ctx.strokeStyle = 'rgba(' + r.color + ',' + (1 - k).toFixed(3) + ')';
    ctx.lineWidth = 3.4 * (1 - k) + 0.6;
    ctx.beginPath();
    ctx.arc(r.x, r.y, lerp(r.r, r.max, ease), 0, TAU);
    ctx.stroke();
  }
}

function drawWaitingAmmo() {
  const waiting = Math.max(0, game.shotsLeft - (game.phase === 'ready' || game.phase === 'drag' ? 1 : 0));
  for (let i = 0; i < waiting; i++) {
    const x = 118 - i * 26, y = 630 + (i % 2) * 4;
    ctx.fillStyle = '#8a6a3c';
    ctx.strokeStyle = '#4d3210';
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(x, y, 9, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(90,235,220,0.5)';
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(x, y - 4); ctx.lineTo(x, y + 4); ctx.stroke();
  }
}

function render() {
  ctx.setTransform(renderScale, 0, 0, renderScale, 0, 0);
  let sx = 0, sy = 0;
  if (game.shake > 0.1) { sx = rand(-1, 1) * game.shake; sy = rand(-1, 1) * game.shake; }
  ctx.translate(sx, sy);

  const p = game.projBody;
  const camX = (p && !p.dead) ? clamp((p.x - 500) * 0.05, -14, 28) : 0;

  drawSky();
  drawMountains(camX);
  drawClouds(camX);
  drawFireflies();
  drawTerrain();
  drawFlags();
  drawWaitingAmmo();
  drawSlingshotBack();
  drawBands();
  drawTrail();
  for (const b of world.blocks) drawBlock(b);
  for (const g of world.guards) drawGuard(g);
  for (const b of world.bodies) {
    if (b.kind === 'shard' && !b.dead) drawShard(b);
  }
  const pp = pouchPos();
  if (pp) {
    drawRuneStone(pp.x, pp.y, 17, 0, game.phase === 'ready');
  } else if (p && !p.dead) {
    drawRuneStone(p.x, p.y, p.r, p.angle, !game.abilityUsed);
  }
  drawAbilityRing();
  drawBandFront();
  drawSlingshotFront();
  if (game.phase === 'drag') drawAimUI();
  drawParticles();
  drawRings();
  drawFloaters();

  const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, H * 0.95);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(6,8,14,0.42)');
  ctx.fillStyle = vg;
  ctx.fillRect(-20, -20, W + 40, H + 40);
}

/* ---------- 输入 ---------- */
let activePointer = null;

function toWorld(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) * (W / (rect.width || 1)),
    y: (e.clientY - rect.top) * (H / (rect.height || 1))
  };
}

function setDrag(x, y) {
  let dx = x - ANCHOR.x, dy = y - ANCHOR.y;
  const len = Math.hypot(dx, dy);
  if (len > MAX_PULL) { dx *= MAX_PULL / len; dy *= MAX_PULL / len; }
  game.dragPos = {
    x: Math.max(30, ANCHOR.x + dx),
    y: Math.min(GROUND_Y - 14, ANCHOR.y + dy)
  };
  const now = performance.now();
  if (now - game.lastCreak > 110) {
    game.lastCreak = now;
    AudioSys.creak(Math.hypot(dx, dy) / MAX_PULL);
  }
}

function pullRatio() {
  return clamp(Math.hypot(ANCHOR.x - game.dragPos.x, ANCHOR.y - game.dragPos.y) / MAX_PULL, 0, 1);
}

canvas.addEventListener('pointerdown', (e) => {
  AudioSys.ensure();
  if (game.phase === 'fly') { tryAbility(); return; }
  if (game.phase !== 'ready') return;
  const w = toWorld(e);
  const pp = game.dragPos;
  if (Math.hypot(w.x - pp.x, w.y - pp.y) < 92) {
    activePointer = e.pointerId;
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* 旧浏览器忽略 */ }
    game.phase = 'drag';
    setDrag(w.x, w.y);
  }
});
canvas.addEventListener('pointermove', (e) => {
  if (game.phase !== 'drag' || e.pointerId !== activePointer) return;
  const w = toWorld(e);
  setDrag(w.x, w.y);
});
function endDrag(e) {
  if (game.phase !== 'drag' || (e && e.pointerId !== activePointer)) return;
  activePointer = null;
  const pull = Math.hypot(ANCHOR.x - game.dragPos.x, ANCHOR.y - game.dragPos.y);
  if (pull < 14) { game.phase = 'ready'; resetDragPos(); return; }
  doLaunch();
}
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', (e) => {
  if (e.pointerId === activePointer) {
    activePointer = null;
    if (game.phase === 'drag') { game.phase = 'ready'; resetDragPos(); }
  }
});
canvas.addEventListener('contextmenu', (e) => e.preventDefault());

window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    e.preventDefault();
    if (game.phase === 'fly') tryAbility();
  } else if (e.code === 'KeyP') {
    togglePause();
  } else if (e.code === 'KeyR') {
    if (game.phase !== 'title') loadLevel(game.level);
  } else if (e.code === 'KeyM') {
    toggleMute();
  }
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden && isRunningPhase(game.phase)) {
    game.prevPhase = game.phase;
    game.phase = 'pause';
    syncOverlays();
  }
});

/* ---------- UI 绑定 ---------- */
const OVERLAYS = { title: 'ovTitle', clear: 'ovClear', fail: 'ovFail', pause: 'ovPause' };

function isRunningPhase(ph) { return ph === 'ready' || ph === 'drag' || ph === 'fly' || ph === 'settle'; }

function syncOverlays() {
  for (const k in OVERLAYS) {
    const el = $(OVERLAYS[k]);
    if (k === game.phase) el.classList.remove('hidden');
    else el.classList.add('hidden');
  }
  if (game.phase === 'title') $('hud').classList.add('hidden');
  else $('hud').classList.remove('hidden');
  if (game.phase !== 'fly') hideAbilityHint();
  refreshLevelSelect();
}

function showAbilityHint() { $('abilityHint').classList.remove('hidden'); }
function hideAbilityHint() { $('abilityHint').classList.add('hidden'); }

let toastTimer = 0;
function showToast(title, sub) {
  $('toastTitle').textContent = title;
  $('toastSub').textContent = sub || '';
  const t = $('toast');
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 1900);
}

function bumpScore() {
  const chip = $('scoreVal').parentElement;
  chip.classList.remove('bump');
  void chip.offsetWidth;
  chip.classList.add('bump');
}

function updateHud() {
  $('levelChip').textContent = '第 ' + game.level + ' 关 · ' + LEVELS[game.level - 1].name;
  const alive = world.guards.filter(g => !g.dead).length;
  $('guardVal').textContent = alive;
  $('scoreVal').textContent = game.score;
  const pips = $('ammoPips');
  pips.innerHTML = '';
  const L = LEVELS[game.level - 1];
  for (let i = 0; i < L.shots; i++) {
    const s = document.createElement('span');
    s.className = 'pip' + (i < game.shotsLeft ? '' : ' used');
    pips.appendChild(s);
  }
  if (game.phase === 'fly' && !game.abilityUsed) showAbilityHint();
}

function updateTitleMeta() {
  $('bestVal').textContent = game.best;
  $('unlockedVal').textContent = game.unlocked;
  refreshLevelSelect();
}

function refreshLevelSelect() {
  for (let i = 1; i <= LEVEL_COUNT; i++) {
    const btn = $('btnLv' + i);
    if (i <= game.unlocked) btn.classList.remove('locked');
    else btn.classList.add('locked');
  }
}

function togglePause() {
  if (isRunningPhase(game.phase)) {
    game.prevPhase = game.phase;
    game.phase = 'pause';
    syncOverlays();
  } else if (game.phase === 'pause') {
    game.phase = game.prevPhase;
    syncOverlays();
  }
}

function toggleMute() {
  AudioSys.ensure();
  AudioSys.setMuted(!AudioSys.muted);
  $('icSndOn').classList.toggle('hidden', AudioSys.muted);
  $('icSndOff').classList.toggle('hidden', !AudioSys.muted);
}

function bindClick(id, fn) {
  $(id).addEventListener('click', (e) => {
    AudioSys.ensure();
    AudioSys.click();
    fn(e);
    e.currentTarget.blur();
  });
}

bindClick('btnStart', () => startRun(1));
bindClick('btnLv1', () => { if (game.unlocked >= 1) startRun(1); });
bindClick('btnLv2', () => { if (game.unlocked >= 2) startRun(2); });
bindClick('btnLv3', () => { if (game.unlocked >= 3) startRun(3); });
bindClick('btnPause', togglePause);
bindClick('btnRestart', () => { if (game.phase !== 'title') loadLevel(game.level); });
bindClick('btnMute', toggleMute);
bindClick('btnNext', () => {
  if (game.level < LEVEL_COUNT) loadLevel(game.level + 1);
  else startRun(1);
});
bindClick('btnReplayClear', () => loadLevel(game.level));
bindClick('btnMenuClear', toTitle);
bindClick('btnRetry', () => loadLevel(game.level));
bindClick('btnMenuFail', toTitle);
bindClick('btnResume', togglePause);
bindClick('btnRestartPause', () => loadLevel(game.level));
bindClick('btnMenuPause', toTitle);

/* ---------- 主循环 ---------- */
let acc = 0;
let lastT = performance.now();

function advanceSim(sec) {
  acc += sec;
  let n = 0;
  while (acc >= DT && n < 140) {
    physicsStep(DT);
    update(DT);
    acc -= DT;
    n++;
  }
  if (n >= 140) acc = 0;
}

function frame(now) {
  requestAnimationFrame(frame);
  let dt = (now - lastT) / 1000;
  lastT = now;
  if (dt > 0.1) dt = 0.1;
  if (!game.manualClock && game.phase !== 'pause') advanceSim(dt);
  render();
}

/* ---------- 测试接口 ---------- */
const api = {
  snapshot() {
    const p = game.projBody;
    return {
      phase: game.phase,
      level: game.level,
      levelName: LEVELS[game.level - 1].name,
      score: game.score,
      shotsLeft: game.shotsLeft,
      muted: AudioSys.muted,
      bestScore: game.best,
      unlockedLevel: game.unlocked,
      abilityAvailable: game.phase === 'fly' && !game.abilityUsed,
      projectile: (p && !p.dead)
        ? { x: r1(p.x), y: r1(p.y), vx: r1(p.vx), vy: r1(p.vy), abilityUsed: game.abilityUsed, kind: p.kind }
        : null,
      targets: world.guards.map(g => ({
        id: g.id, x: r1(g.x), y: r1(g.y),
        hp: Math.max(0, Math.round(g.hp)), maxHp: Math.round(g.maxHp), alive: !g.dead
      })),
      blocks: world.blocks.map(b => ({
        id: b.id, material: b.mat, x: r1(b.x), y: r1(b.y), angle: r2(b.angle),
        hp: Math.max(0, Math.round(b.hp)), maxHp: Math.round(b.maxHp), alive: !b.dead
      }))
    };
  },
  start() { AudioSys.ensure(); startRun(1); return api.snapshot(); },
  restart() { loadLevel(game.level); return api.snapshot(); },
  loadLevel(n) {
    const lv = clamp(Math.round(Number(n)) || 1, 1, LEVEL_COUNT);
    loadLevel(lv);
    return api.snapshot();
  },
  pause() {
    if (isRunningPhase(game.phase)) {
      game.prevPhase = game.phase;
      game.phase = 'pause';
      syncOverlays();
    }
    return game.phase;
  },
  resume() {
    if (game.phase === 'pause') {
      game.phase = game.prevPhase;
      syncOverlays();
    }
    return game.phase;
  },
  setManualClock(enabled) { game.manualClock = !!enabled; return game.manualClock; },
  step(ms) {
    if (game.phase === 'pause') return false;
    advanceSim(clamp(Number(ms) || 0, 0, 1000) / 1000);
    return true;
  },
  aim(dx, dy) {
    if (game.phase !== 'ready' && game.phase !== 'drag') return null;
    if (game.phase === 'ready') game.phase = 'drag';
    setDrag(ANCHOR.x + (Number(dx) || 0), ANCHOR.y + (Number(dy) || 0));
    return {
      x: r1(game.dragPos.x - ANCHOR.x),
      y: r1(game.dragPos.y - ANCHOR.y),
      power: r2(pullRatio())
    };
  },
  launch() {
    if (game.phase === 'ready') api.aim(-72, -46);
    if (game.phase !== 'drag') return null;
    const b = doLaunch();
    return b ? { vx: r1(b.vx), vy: r1(b.vy) } : null;
  },
  activateAbility() { return tryAbility(); },
  forceHit(targetId) {
    const g = world.guards.find(x => x.id === targetId);
    if (!g || g.dead) return false;
    hurtGuard(g, g.hp + 999, null);
    return true;
  }
};
window.__SLINGSHOT_TEST__ = api;

/* ---------- 启动 ---------- */
fitCanvas();
window.addEventListener('resize', fitCanvas);
$('icSndOn').classList.toggle('hidden', AudioSys.muted);
$('icSndOff').classList.toggle('hidden', !AudioSys.muted);
toTitle();
requestAnimationFrame(frame);

})();
