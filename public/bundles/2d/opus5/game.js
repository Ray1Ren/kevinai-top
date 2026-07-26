/* ============================================================================
 * Sling Siege / 弹弓攻城
 * 原创单页 Canvas 弹弓物理游戏。纯原生 HTML/CSS/JS + Canvas 2D + Web Audio。
 * 无外部资源、无网络请求、无第三方依赖。
 *
 * 角色与设定均为原创：玩家用「共鸣晶核」轰击沙丘要塞里的「石甲哨兵」。
 *
 * 测试接口：window.__SLINGSHOT_TEST__
 *   aim(dx, dy) 中 (dx,dy) 为从弹弓锚点“向后拉”的偏移（dx 通常为负值）；
 *   为兼容把参数当作发射方向传入的用法，dx>0 时会自动取反向量。
 * ==========================================================================*/
(function () {
  'use strict';

  var P = window.SlingPhysics;

  /* ----------------------------------------------------------- 常量 ---- */

  var WORLD_H = 900;
  var GROUND_Y = 780;
  /* 相机关注区：世界里真正有内容的纵向范围（天空之上/地下深处不必占屏） */
  var VIEW_TOP = 168;
  var VIEW_BOTTOM = 838;
  var VIEW_H = VIEW_BOTTOM - VIEW_TOP;
  var SLING_X = 200;
  var SLING_Y = 620;          // 皮筋锚点（弹丸静止位置）
  var MAX_PULL = 150;
  var LAUNCH_K = 10.2;        // 拉伸量 → 初速（默认值，实际按关卡射程标定）
  var MAX_SPEED = 1560;       // 硬上限
  var GRAVITY = 1800;
  var FIXED = 1 / 120;

  var MAT = {
    wood: {
      key: 'wood', label: '沙木梁', hp: 340, density: 0.0011, friction: 0.62,
      rest: 0.05, take: 1.0, impact: 0.8, score: 130,
      fill: ['#a46a3c', '#7b4a26'], edge: '#4b2c16', grain: 'rgba(58,32,14,0.5)'
    },
    stone: {
      key: 'stone', label: '砂岩块', hp: 900, density: 0.0023, friction: 0.72,
      rest: 0.03, take: 0.55, impact: 1.4, score: 210,
      fill: ['#8d97a8', '#5d6675'], edge: '#39404d', grain: 'rgba(30,36,46,0.45)'
    },
    crystal: {
      key: 'crystal', label: '共鸣晶', hp: 140, density: 0.0009, friction: 0.42,
      rest: 0.06, take: 1.7, impact: 0.7, score: 300,
      fill: ['rgba(168,240,255,0.88)', 'rgba(64,168,208,0.72)'], edge: '#bff4ff', grain: 'rgba(255,255,255,0.5)'
    },
    steel: {
      key: 'steel', label: '铜甲块', hp: 999999, density: 0.0038, friction: 0.52,
      rest: 0.08, take: 0, impact: 1.5, score: 0, indestructible: true,
      fill: ['#b98d55', '#7d5b31'], edge: '#4a3418', grain: 'rgba(40,28,12,0.5)'
    }
  };

  var AMMO = {
    spike: {
      key: 'spike', label: '锥核', ability: '俯冲', radius: 20, density: 0.0076,
      color: '#4fe0ff', glow: 'rgba(79,224,255,0.85)',
      desc: '飞行中触发：加速下压，穿透力更强'
    },
    split: {
      key: 'split', label: '裂核', ability: '三裂', radius: 21, density: 0.0064,
      color: '#ab8bff', glow: 'rgba(171,139,255,0.85)',
      desc: '飞行中触发：分裂为三枚碎核，覆盖更广'
    },
    blast: {
      key: 'blast', label: '震核', ability: '爆震', radius: 22, density: 0.0072,
      color: '#ffb257', glow: 'rgba(255,178,87,0.85)',
      desc: '飞行中触发：原地爆炸，掀开掩体'
    }
  };

  /* --------------------------------------------------------- 关卡定义 ---- */
  /* 每关的 build(ax, gy) 以 ax = 要塞左侧基准 x、gy = 地面 y 生成布局。
     blocks: [x, y, w, h, material, angle]（x,y 为块中心） */

  var LEVELS = [
    {
      id: 1,
      name: '沙丘哨站',
      hint: '瞄准木架上的哨兵，一发满力就够',
      ammo: ['spike', 'spike', 'spike', 'spike'],
      guardHp: 100,
      build: function (ax, gy) {
        return {
          statics: [],
          blocks: [
            [ax + 60, gy - 75, 22, 150, 'wood'],
            [ax + 190, gy - 75, 22, 150, 'wood'],
            [ax + 125, gy - 163, 196, 26, 'wood'],
            [ax + 125, gy - 30, 40, 60, 'crystal'],
            [ax + 345, gy - 24, 48, 48, 'wood'],
            [ax + 345, gy - 72, 48, 48, 'wood']
          ],
          guards: [
            [ax + 125, gy - 203],
            [ax + 265, gy - 27]
          ]
        };
      }
    },
    {
      id: 2,
      name: '双塔关隘',
      hint: '连桥是承重点；铜甲挡不住高抛与三裂',
      ammo: ['spike', 'split', 'spike', 'split', 'spike'],
      guardHp: 110,
      build: function (ax, gy) {
        return {
          statics: [],
          blocks: [
            /* 左塔 */
            [ax + 70, gy - 20, 92, 40, 'stone'],
            [ax + 45, gy - 105, 22, 130, 'wood'],
            [ax + 95, gy - 105, 22, 130, 'wood'],
            [ax + 70, gy - 183, 112, 26, 'stone'],
            /* 右塔 */
            [ax + 290, gy - 20, 92, 40, 'stone'],
            [ax + 265, gy - 105, 22, 130, 'wood'],
            [ax + 315, gy - 105, 22, 130, 'wood'],
            [ax + 290, gy - 183, 112, 26, 'stone'],
            /* 连桥 */
            [ax + 180, gy - 206, 232, 20, 'wood'],
            /* 地面陈设 */
            [ax + 205, gy - 30, 42, 60, 'crystal'],
            [ax + 360, gy - 46, 38, 92, 'steel']
          ],
          guards: [
            [ax + 180, gy - 243],
            [ax + 150, gy - 27],
            [ax + 408, gy - 27]
          ]
        };
      }
    },
    {
      id: 3,
      name: '悬空要塞',
      hint: '掩体顶盖厚，先用震核掀开；平台上的哨兵要平射',
      ammo: ['spike', 'blast', 'split', 'spike', 'blast', 'split', 'spike'],
      guardHp: 120,
      build: function (ax, gy) {
        return {
          statics: [
            /* 悬空石台（不可破坏地形） */
            [ax + 300, 520, 268, 26]
          ],
          blocks: [
            /* 地面掩体 */
            [ax + 50, gy - 55, 24, 110, 'wood'],
            [ax + 190, gy - 55, 24, 110, 'wood'],
            [ax + 120, gy - 122, 190, 24, 'stone'],
            [ax + 120, gy - 146, 60, 24, 'crystal'],
            /* 平台上的塔 */
            [ax + 240, 443, 22, 130, 'wood'],
            [ax + 360, 443, 22, 130, 'wood'],
            [ax + 300, 365, 152, 26, 'stone'],
            /* 远端掩体 */
            [ax + 400, gy - 44, 38, 88, 'steel'],
            [ax + 500, gy - 30, 42, 60, 'crystal'],
            [ax + 500, gy - 84, 42, 48, 'wood']
          ],
          guards: [
            [ax + 90, gy - 27],
            [ax + 148, gy - 27],
            [ax + 300, 325],
            [ax + 448, gy - 27]
          ]
        };
      }
    }
  ];

  /* --------------------------------------------------------- 游戏状态 ---- */

  var G = {
    phase: 'title',        // title | aim | flight | settle | clear | fail | complete
    paused: false,
    manualClock: false,
    muted: false,
    level: 1,
    levelName: '',
    score: 0,
    scoreAtLevelStart: 0,
    levelScore: 0,
    best: 0,
    unlocked: 1,
    shotIndex: 0,
    ammoQueue: [],
    world: null,
    ground: null,
    statics: [],
    blocks: [],
    guards: [],
    projectiles: [],
    anchorX: 1130,
    worldW: 1600,
    extentX: 1600,
    launchSpeed: 1500,
    launchK: LAUNCH_K,
    aim: { x: 0, y: 0 },
    dragging: false,
    pointerId: null,
    abilityUsed: false,
    abilityKind: 'spike',
    pendingResult: null,
    resultTimer: 0,
    settleTimer: 0,
    acc: 0,
    time: 0,
    shake: 0,
    flash: 0,
    flashColor: '255,255,255',
    particles: [],
    floats: [],
    lastBonus: 0,
    lastBase: 0,
    toastTimer: 0,
    cam: { x: 0, y: 0, scale: 1, ty: 0 },
    cssW: 1, cssH: 1, dpr: 1,
    seq: 0,
    lastImpactSound: 0,
    bg: null,
    bgKey: '',
    started: false
  };

  var canvas = null, ctx = null, stage = null;
  var dom = {};

  /* -------------------------------------------------------- 工具函数 ---- */

  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function hash01(i, salt) {
    var x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
    return x - Math.floor(x);
  }
  function nowSec() { return G.time; }

  function store(key, val) {
    try { window.localStorage.setItem('slingsiege.' + key, String(val)); } catch (e) { /* 隐私模式忽略 */ }
  }
  function read(key) {
    try { return window.localStorage.getItem('slingsiege.' + key); } catch (e) { return null; }
  }

  function loadSave() {
    var b = parseInt(read('best'), 10);
    if (isFinite(b) && b > 0) G.best = b;
    var u = parseInt(read('unlocked'), 10);
    if (isFinite(u) && u >= 1) G.unlocked = clamp(u, 1, LEVELS.length);
    G.muted = read('muted') === '1';
  }
  function saveBest() {
    if (G.score > G.best) { G.best = G.score; store('best', G.best); }
  }
  function saveUnlocked(lv) {
    if (lv > G.unlocked) { G.unlocked = clamp(lv, 1, LEVELS.length); store('unlocked', G.unlocked); }
  }

  /* ------------------------------------------------------------ 音频 ---- */

  var Audio2 = {
    ctx: null,
    master: null,
    noise: null,
    stretch: null,
    ready: false,

    ensure: function () {
      if (this.ready) {
        if (this.ctx && this.ctx.state === 'suspended') { this.ctx.resume(); }
        return true;
      }
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      try {
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.85;
        var comp = this.ctx.createDynamicsCompressor();
        comp.threshold.value = -16;
        comp.ratio.value = 8;
        this.master.connect(comp);
        comp.connect(this.ctx.destination);

        var len = Math.floor(this.ctx.sampleRate * 1.2);
        var buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        var d = buf.getChannelData(0);
        for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
        this.noise = buf;
        this.ready = true;
        return true;
      } catch (e) {
        this.ready = false;
        return false;
      }
    },

    on: function () { return !G.muted && this.ready && this.ctx; },

    tone: function (o) {
      if (!this.on()) return;
      var t = this.ctx.currentTime + (o.delay || 0);
      var osc = this.ctx.createOscillator();
      var g = this.ctx.createGain();
      osc.type = o.type || 'sine';
      osc.frequency.setValueAtTime(o.freq, t);
      if (o.to) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.to), t + o.dur);
      var peak = (o.gain != null ? o.gain : 0.2);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(peak, t + Math.min(0.02, o.dur * 0.25));
      g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
      osc.connect(g); g.connect(this.master);
      osc.start(t); osc.stop(t + o.dur + 0.03);
    },

    burst: function (o) {
      if (!this.on()) return;
      var t = this.ctx.currentTime + (o.delay || 0);
      var src = this.ctx.createBufferSource();
      src.buffer = this.noise;
      src.playbackRate.value = o.rate || 1;
      var f = this.ctx.createBiquadFilter();
      f.type = o.filter || 'bandpass';
      f.frequency.setValueAtTime(o.freq || 900, t);
      if (o.freqTo) f.frequency.exponentialRampToValueAtTime(Math.max(40, o.freqTo), t + o.dur);
      f.Q.value = o.q != null ? o.q : 1.1;
      var g = this.ctx.createGain();
      var peak = o.gain != null ? o.gain : 0.24;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(peak, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
      src.connect(f); f.connect(g); g.connect(this.master);
      src.start(t); src.stop(t + o.dur + 0.03);
    },

    stretchStart: function () {
      if (!this.on() || this.stretch) return;
      var t = this.ctx.currentTime;
      var osc = this.ctx.createOscillator();
      var g = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(70, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.035, t + 0.08);
      var f = this.ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 700;
      osc.connect(f); f.connect(g); g.connect(this.master);
      osc.start(t);
      this.stretch = { osc: osc, gain: g };
    },
    stretchUpdate: function (p) {
      if (!this.stretch || !this.on()) return;
      var t = this.ctx.currentTime;
      this.stretch.osc.frequency.linearRampToValueAtTime(70 + p * 190, t + 0.04);
      this.stretch.gain.gain.linearRampToValueAtTime(0.02 + p * 0.05, t + 0.04);
    },
    stretchStop: function () {
      if (!this.stretch) return;
      var s = this.stretch;
      this.stretch = null;
      if (!this.ctx) return;
      var t = this.ctx.currentTime;
      try {
        s.gain.gain.cancelScheduledValues(t);
        s.gain.gain.setValueAtTime(s.gain.gain.value, t);
        s.gain.gain.linearRampToValueAtTime(0.0001, t + 0.08);
        s.osc.stop(t + 0.12);
      } catch (e) { /* 已停止 */ }
    },

    launch: function () {
      this.burst({ freq: 1500, freqTo: 320, dur: 0.22, gain: 0.2, q: 0.8, filter: 'bandpass' });
      this.tone({ freq: 420, to: 140, dur: 0.18, type: 'triangle', gain: 0.16 });
    },
    ability: function (kind) {
      if (kind === 'spike') {
        this.burst({ freq: 2600, freqTo: 500, dur: 0.3, gain: 0.2, q: 0.7 });
        this.tone({ freq: 900, to: 220, dur: 0.24, type: 'sawtooth', gain: 0.12 });
      } else if (kind === 'split') {
        this.tone({ freq: 780, to: 1180, dur: 0.1, type: 'square', gain: 0.11 });
        this.tone({ freq: 980, to: 1420, dur: 0.1, type: 'square', gain: 0.1, delay: 0.06 });
        this.tone({ freq: 1180, to: 1720, dur: 0.1, type: 'square', gain: 0.09, delay: 0.12 });
      } else {
        this.burst({ freq: 260, freqTo: 60, dur: 0.5, gain: 0.32, q: 0.6, filter: 'lowpass' });
        this.tone({ freq: 120, to: 40, dur: 0.42, type: 'sine', gain: 0.22 });
      }
    },
    impact: function (mat, strength) {
      var t = Date.now();
      if (t - this.lastImpactAt < 45) return;
      this.lastImpactAt = t;
      var g = clamp(strength / 900, 0.06, 0.3);
      if (mat === 'stone' || mat === 'steel') {
        this.burst({ freq: 300, freqTo: 120, dur: 0.16, gain: g, q: 0.9, filter: 'lowpass' });
      } else if (mat === 'crystal') {
        this.tone({ freq: 1500, to: 900, dur: 0.14, type: 'sine', gain: g * 0.7 });
      } else {
        this.burst({ freq: 700, freqTo: 260, dur: 0.13, gain: g, q: 1.4 });
      }
    },
    breakBlock: function (mat) {
      if (mat === 'crystal') {
        this.tone({ freq: 1900, to: 620, dur: 0.3, type: 'triangle', gain: 0.16 });
        this.burst({ freq: 3200, freqTo: 1200, dur: 0.26, gain: 0.13, q: 1.6 });
      } else if (mat === 'stone') {
        this.burst({ freq: 420, freqTo: 90, dur: 0.4, gain: 0.28, q: 0.7, filter: 'lowpass' });
      } else {
        this.burst({ freq: 900, freqTo: 200, dur: 0.3, gain: 0.24, q: 1.2 });
      }
    },
    guardHit: function () {
      this.tone({ freq: 300, to: 190, dur: 0.12, type: 'square', gain: 0.12 });
      this.burst({ freq: 600, freqTo: 220, dur: 0.14, gain: 0.16, q: 1.1 });
    },
    guardDown: function () {
      this.tone({ freq: 520, to: 330, dur: 0.12, type: 'triangle', gain: 0.18 });
      this.tone({ freq: 330, to: 200, dur: 0.16, type: 'triangle', gain: 0.16, delay: 0.1 });
      this.burst({ freq: 380, freqTo: 90, dur: 0.42, gain: 0.24, q: 0.8, filter: 'lowpass', delay: 0.04 });
    },
    win: function () {
      var seq = [523, 659, 784, 1046];
      for (var i = 0; i < seq.length; i++) {
        this.tone({ freq: seq[i], dur: 0.34, type: 'triangle', gain: 0.16, delay: i * 0.11 });
      }
    },
    lose: function () {
      this.tone({ freq: 320, to: 150, dur: 0.5, type: 'sawtooth', gain: 0.14 });
      this.tone({ freq: 240, to: 110, dur: 0.6, type: 'sine', gain: 0.12, delay: 0.12 });
    },
    ui: function () { this.tone({ freq: 640, to: 880, dur: 0.08, type: 'triangle', gain: 0.1 }); },
    levelStart: function () {
      this.tone({ freq: 380, to: 620, dur: 0.2, type: 'triangle', gain: 0.12 });
      this.tone({ freq: 620, to: 780, dur: 0.22, type: 'sine', gain: 0.1, delay: 0.12 });
    },
    lastImpactAt: 0
  };

  /* ------------------------------------------------------- 关卡构建 ---- */

  function computeLayout() {
    var aspect = G.cssH > 0 ? G.cssW / G.cssH : 1.78;
    G.worldW = Math.round(clamp(VIEW_H * aspect, 980, 1600));
    G.anchorX = G.worldW - 470;
  }

  function buildLevel(n) {
    var def = LEVELS[clamp(n, 1, LEVELS.length) - 1];
    computeLayout();

    var world = new P.World({ gravity: GRAVITY, iterations: 10, impactThreshold: 62 });
    world.onImpact = onImpact;

    G.world = world;
    G.blocks = [];
    G.guards = [];
    G.statics = [];
    G.projectiles = [];
    G.particles.length = 0;
    G.floats.length = 0;
    G.aim.x = 0; G.aim.y = 0;
    G.dragging = false;
    G.pointerId = null;
    G.abilityUsed = false;
    G.pendingResult = null;
    G.resultTimer = 0;
    G.settleTimer = 0;
    G.acc = 0;
    G.shotIndex = 0;
    G.level = def.id;
    G.levelName = def.name;
    G.ammoQueue = def.ammo.slice();
    G.scoreAtLevelStart = G.score;
    G.levelScore = 0;
    G.seq = 0;

    var layout = def.build(G.anchorX, GROUND_Y);

    var maxRight = G.anchorX + 200;
    var i, s, b, g;

    for (i = 0; i < layout.blocks.length; i++) {
      maxRight = Math.max(maxRight, layout.blocks[i][0] + layout.blocks[i][2] * 0.5);
    }
    for (i = 0; i < layout.statics.length; i++) {
      maxRight = Math.max(maxRight, layout.statics[i][0] + layout.statics[i][2] * 0.5);
    }
    for (i = 0; i < layout.guards.length; i++) {
      maxRight = Math.max(maxRight, layout.guards[i][0] + 40);
    }
    G.extentX = Math.max(G.worldW, Math.round(maxRight + 70));

    /* 按“满力约等于打到最远目标”标定发射力度：
       桌面世界宽、要塞远，手机世界窄、要塞近，这样两端手感一致，
       玩家永远是「满力打最远、收力打近处」。 */
    var reach = Math.max(320, maxRight - SLING_X + 60);
    G.launchSpeed = clamp(Math.sqrt(reach * GRAVITY), 620, MAX_SPEED);
    G.launchK = G.launchSpeed / MAX_PULL;

    /* 地面 */
    G.ground = world.create({
      shape: 'poly', kind: 'ground', isStatic: true,
      x: G.extentX * 0.5, y: GROUND_Y + 260,
      hw: G.extentX * 0.5 + 900, hh: 260,
      friction: 0.86, restitution: 0.02,
      data: { type: 'ground', gid: 'ground' }
    });

    /* 静态地形（悬空石台等） */
    for (i = 0; i < layout.statics.length; i++) {
      s = layout.statics[i];
      var sb = world.create({
        shape: 'poly', kind: 'platform', isStatic: true,
        x: s[0], y: s[1], hw: s[2] * 0.5, hh: s[3] * 0.5,
        friction: 0.8, restitution: 0.02,
        data: { type: 'platform', gid: 'plat' + i }
      });
      G.statics.push({ id: 'plat' + i, body: sb, w: s[2], h: s[3] });
    }

    /* 可破坏结构块 */
    for (i = 0; i < layout.blocks.length; i++) {
      b = layout.blocks[i];
      var mat = MAT[b[4]] || MAT.wood;
      var body = world.create({
        shape: 'poly', kind: 'block',
        x: b[0], y: b[1], angle: b[5] || 0,
        hw: b[2] * 0.5, hh: b[3] * 0.5,
        density: mat.density, friction: mat.friction, restitution: mat.rest,
        linearDamping: 0.2, angularDamping: 0.6,
        data: { type: 'block', gid: 'blk' + i, mat: mat.key }
      });
      var rec = {
        id: 'blk' + i, body: body, mat: mat.key, w: b[2], h: b[3],
        spawnX: b[0], spawnY: b[1],
        hp: mat.hp, maxHp: mat.hp, alive: true, indestructible: !!mat.indestructible,
        flash: 0
      };
      body.data.rec = rec;
      G.blocks.push(rec);
    }

    /* 石甲哨兵 */
    for (i = 0; i < layout.guards.length; i++) {
      g = layout.guards[i];
      var gb = world.create({
        shape: 'circle', kind: 'guard', radius: 27,
        x: g[0], y: g[1],
        density: 0.0016, friction: 0.92, restitution: 0.05,
        linearDamping: 0.5, angularDamping: 7.5,
        data: { type: 'guard', gid: 'gd' + i }
      });
      var grec = {
        id: 'gd' + i, body: gb, hp: def.guardHp, maxHp: def.guardHp,
        spawnX: g[0], spawnY: g[1],
        alive: true, flash: 0, blink: hash01(i, 3) * 4
      };
      gb.data.rec = grec;
      G.guards.push(grec);
    }

    /* 预热并冻结：先让结构在重力下落定，再统一进入休眠。
       这样开局画面绝对静止（不会自己沉降或倒塌），被撞击时才唤醒。*/
    world.onImpact = null;
    for (i = 0; i < 90; i++) world.step(FIXED);
    for (i = 0; i < world.bodies.length; i++) {
      var bd = world.bodies[i];
      if (bd.isStatic) continue;
      bd.vx = 0; bd.vy = 0; bd.av = 0;
      bd.awake = false;
      bd.sleepTimer = 0;
    }
    world.onImpact = onImpact;

    updateCameraImmediate();
    syncHud();
    updateDock();
  }

  function guardsAlive() {
    var n = 0;
    for (var i = 0; i < G.guards.length; i++) if (G.guards[i].alive) n++;
    return n;
  }
  function shotsLeft() { return Math.max(0, G.ammoQueue.length - G.shotIndex); }
  function currentAmmoKey() { return G.ammoQueue[G.shotIndex] || G.ammoQueue[G.ammoQueue.length - 1] || 'spike'; }
  function currentAmmo() { return AMMO[currentAmmoKey()] || AMMO.spike; }

  /* --------------------------------------------------------- 伤害系统 ---- */

  function factorFor(otherType, otherMat, targetType) {
    if (otherType === 'projectile') return 1.5;
    if (otherType === 'guard') return 0.55;
    if (otherType === 'ground' || otherType === 'platform') return targetType === 'guard' ? 0.42 : 0.9;
    if (otherType === 'block') {
      var m = MAT[otherMat];
      return m ? m.impact : 0.8;
    }
    return 0.9;
  }

  function massFactor(other, target) {
    var om = other.mass > 0 ? other.mass : target.mass;
    if (!(target.mass > 0)) return 1;
    return clamp(om / target.mass, 0.35, 2.2);
  }

  function onImpact(im) {
    var a = im.a, b = im.b;
    resolveHit(a, b, im);
    resolveHit(b, a, im);

    /* 撞击表现（取参与方里“最响”的材质） */
    var mat = 'wood';
    if (a.data.type === 'block') mat = a.data.mat;
    else if (b.data.type === 'block') mat = b.data.mat;
    else if (a.data.type === 'ground' || b.data.type === 'ground') mat = 'stone';

    if (im.speed > 150) {
      Audio2.impact(mat, im.speed);
      var n = clamp(Math.round(im.speed / 190), 1, 7);
      spawnBurst(im.x, im.y, n, im.speed, mat);
      if (im.speed > 480) {
        addShake(clamp(im.speed / 240, 1.2, 8));
        pushParticle({ kind: 'ring', x: im.x, y: im.y, r: 6, vr: 240, life: 0.28, color: '255,240,210' });
      }
    }
  }

  function resolveHit(target, other, im) {
    if (target.removed || !target.data) return;
    var t = target.data.type;
    if (t === 'block') {
      var rec = target.data.rec;
      if (!rec || !rec.alive || rec.indestructible) return;
      var m = MAT[rec.mat];
      var dmg = (im.speed - 100) * 0.30 * m.take *
        factorFor(other.data.type, other.data.mat, 'block') * massFactor(other, target);
      if (dmg > 4) damageBlock(rec, dmg, im.x, im.y);
    } else if (t === 'guard') {
      var grec = target.data.rec;
      if (!grec || !grec.alive) return;
      var dg = (im.speed - 110) * 0.40 *
        factorFor(other.data.type, other.data.mat, 'guard') * massFactor(other, target);
      if (dg > 3) damageGuard(grec, dg, im.x, im.y);
    }
  }

  function damageBlock(rec, dmg, x, y) {
    rec.hp -= dmg;
    rec.flash = 1;
    if (rec.body) rec.body.wake();
    if (rec.hp <= 0) destroyBlock(rec, x, y);
  }

  function destroyBlock(rec, x, y) {
    if (!rec.alive) return;
    var m = MAT[rec.mat];
    rec.alive = false;
    var bx = rec.body ? rec.body.x : x;
    var by = rec.body ? rec.body.y : y;
    var ang = rec.body ? rec.body.angle : 0;
    if (rec.body) {
      G.world.remove(rec.body);
      G.world.wakeArea(bx, by, Math.max(rec.w, rec.h) + 130);
      rec.body = null;
    }
    addScore(m.score, bx, by - 12, '+' + m.score, m.key === 'crystal' ? '#9ef0ff' : '#ffd9a3');
    Audio2.breakBlock(rec.mat);
    spawnDebris(bx, by, rec.w, rec.h, ang, rec.mat);
    addShake(rec.mat === 'stone' ? 5 : 3);
  }

  function damageGuard(rec, dmg, x, y) {
    if (!rec.alive) return;
    rec.hp -= dmg;
    rec.flash = 1;
    if (rec.body) rec.body.wake();
    if (rec.hp <= 0) {
      defeatGuard(rec, x, y);
    } else {
      Audio2.guardHit();
      pushParticle({ kind: 'ring', x: x, y: y, r: 4, vr: 170, life: 0.24, color: '255,190,120' });
      spawnBurst(x, y, 4, 320, 'guard');
    }
  }

  function defeatGuard(rec, x, y) {
    if (!rec.alive) return;
    rec.alive = false;
    rec.hp = 0;
    var gx = rec.body ? rec.body.x : x;
    var gy = rec.body ? rec.body.y : y;
    if (rec.body) {
      G.world.remove(rec.body);
      G.world.wakeArea(gx, gy, 150);
      rec.body = null;
    }
    addScore(1000, gx, gy - 30, '+1000', '#7ff0b6');
    Audio2.guardDown();
    addShake(7);
    G.flash = Math.max(G.flash, 0.35);
    G.flashColor = '160,255,210';
    for (var i = 0; i < 22; i++) {
      var a = Math.PI * 2 * (i / 22) + hash01(i, 7);
      var sp = 130 + hash01(i, 11) * 320;
      pushParticle({
        kind: 'debris', x: gx, y: gy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 90,
        size: 4 + hash01(i, 13) * 6, life: 0.7 + hash01(i, 17) * 0.7,
        color: i % 3 === 0 ? '182,128,60' : '110,120,138', spin: (hash01(i, 19) - 0.5) * 16
      });
    }
    pushParticle({ kind: 'ring', x: gx, y: gy, r: 10, vr: 420, life: 0.42, color: '150,255,205' });

    if (guardsAlive() === 0 && G.pendingResult === null &&
      G.phase !== 'clear' && G.phase !== 'complete' && G.phase !== 'fail') {
      G.pendingResult = 'win';
      G.resultTimer = 0.9;
    }
  }

  function addScore(v, x, y, text, color) {
    G.score += v;
    G.levelScore += v;
    if (text) {
      G.floats.push({ x: x, y: y, vy: -60, life: 1.05, max: 1.05, text: text, color: color || '#fff' });
      if (G.floats.length > 40) G.floats.shift();
    }
    syncHud();
  }

  function addShake(v) { G.shake = Math.min(16, G.shake + v); }

  /* --------------------------------------------------------- 粒子系统 ---- */

  function pushParticle(p) {
    if (G.particles.length > 720) G.particles.shift();
    p.life = p.life || 0.5;
    p.max = p.life;
    p.kind = p.kind || 'spark';
    p.vx = p.vx || 0; p.vy = p.vy || 0;
    p.size = p.size || 3;
    p.rot = p.rot || 0;
    p.spin = p.spin || 0;
    p.color = p.color || '255,255,255';
    G.particles.push(p);
    return p;
  }

  function spawnBurst(x, y, n, speed, mat) {
    var col = '255,226,170';
    if (mat === 'stone') col = '190,198,212';
    else if (mat === 'crystal') col = '170,240,255';
    else if (mat === 'guard') col = '255,180,120';
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2;
      var sp = 60 + Math.random() * clamp(speed * 0.5, 80, 460);
      pushParticle({
        kind: 'spark', x: x, y: y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40,
        size: 1.6 + Math.random() * 2.4, life: 0.22 + Math.random() * 0.3, color: col
      });
    }
    pushParticle({ kind: 'dust', x: x, y: y, vx: 0, vy: -26, size: 12 + Math.random() * 14, life: 0.5, color: '210,190,160' });
  }

  function spawnDebris(x, y, w, h, ang, mat) {
    var col = mat === 'stone' ? '134,146,164' : mat === 'crystal' ? '160,238,255'
      : mat === 'steel' ? '186,142,86' : '150,98,56';
    var n = clamp(Math.round((w + h) / 22), 6, 16);
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2;
      var sp = 80 + Math.random() * 340;
      pushParticle({
        kind: mat === 'crystal' ? 'shard' : 'debris',
        x: x + (Math.random() - 0.5) * w * 0.8,
        y: y + (Math.random() - 0.5) * h * 0.8,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 120,
        size: 3 + Math.random() * Math.min(11, (w + h) / 12),
        life: 0.6 + Math.random() * 0.8, color: col,
        rot: ang, spin: (Math.random() - 0.5) * 14
      });
    }
    for (var j = 0; j < 4; j++) {
      pushParticle({
        kind: 'dust', x: x + (Math.random() - 0.5) * w, y: y + (Math.random() - 0.5) * h,
        vx: (Math.random() - 0.5) * 70, vy: -30 - Math.random() * 50,
        size: 14 + Math.random() * 20, life: 0.55 + Math.random() * 0.4, color: '206,186,156'
      });
    }
  }

  function updateParticles(dt) {
    var arr = G.particles, i, p;
    for (i = arr.length - 1; i >= 0; i--) {
      p = arr[i];
      p.life -= dt;
      if (p.life <= 0) { arr.splice(i, 1); continue; }
      if (p.kind === 'ring') {
        p.r += p.vr * dt;
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.spin * dt;
      if (p.kind === 'dust') {
        p.vx *= 0.94; p.vy *= 0.94; p.size += dt * 26;
      } else {
        p.vy += (p.kind === 'spark' ? 700 : 1500) * dt;
        p.vx *= 0.995;
        if (p.y > GROUND_Y - 2 && p.vy > 0) {
          p.y = GROUND_Y - 2;
          p.vy *= -0.32;
          p.vx *= 0.6;
          p.spin *= 0.5;
          if (Math.abs(p.vy) < 24) { p.vy = 0; p.vx *= 0.2; }
        }
      }
    }
    var f = G.floats;
    for (i = f.length - 1; i >= 0; i--) {
      f[i].life -= dt;
      f[i].y += f[i].vy * dt;
      f[i].vy *= 0.96;
      if (f[i].life <= 0) f.splice(i, 1);
    }
  }

  /* ------------------------------------------------------ 发射与能力 ---- */

  function nockPos() {
    return { x: SLING_X + G.aim.x, y: SLING_Y + G.aim.y };
  }
  function pullLen() { return Math.hypot(G.aim.x, G.aim.y); }
  function power() { return clamp(pullLen() / MAX_PULL, 0, 1); }

  function launchVelocity() {
    var k = G.launchK || LAUNCH_K;
    var cap = Math.min(MAX_SPEED, G.launchSpeed || MAX_SPEED);
    var vx = -G.aim.x * k;
    var vy = -G.aim.y * k;
    var sp = Math.hypot(vx, vy);
    if (sp > cap) { vx = vx / sp * cap; vy = vy / sp * cap; }
    return { x: vx, y: vy };
  }

  function setAim(dx, dy) {
    /* dx>0 视为“发射方向”，自动取反，兼容不同调用习惯 */
    if (dx > 0) { dx = -dx; dy = -dy; }
    var len = Math.hypot(dx, dy);
    if (len > MAX_PULL) { dx = dx / len * MAX_PULL; dy = dy / len * MAX_PULL; }
    if (dx > 0) dx = 0;
    G.aim.x = dx;
    G.aim.y = dy;
    updatePowerUi();
  }

  function canAim() {
    return G.phase === 'aim' && !G.paused && G.pendingResult === null;
  }

  function launch() {
    if (G.phase !== 'aim' || G.paused || G.pendingResult !== null) return false;
    if (shotsLeft() <= 0) return false;
    if (pullLen() < 8) setAim(-MAX_PULL * 0.92, -MAX_PULL * 0.42);

    var ammo = currentAmmo();
    var np = nockPos();
    var v = launchVelocity();

    var body = G.world.create({
      shape: 'circle', kind: 'projectile', radius: ammo.radius,
      x: np.x, y: np.y, vx: v.x, vy: v.y,
      density: ammo.density, friction: 0.5, restitution: 0.26,
      linearDamping: 0.05, angularDamping: 2.4,
      data: { type: 'projectile', gid: 'proj' + (G.seq++) }
    });
    var rec = {
      id: body.data.gid, body: body, type: ammo.key, radius: ammo.radius,
      life: 0, restTimer: 0, trail: [], main: true
    };
    body.data.rec = rec;
    G.projectiles = [rec];

    G.abilityKind = ammo.key;
    G.abilityUsed = false;
    G.shotIndex++;
    G.phase = 'flight';
    G.settleTimer = 0;
    Audio2.stretchStop();
    Audio2.launch();
    addShake(2.6);

    /* 发射反馈：皮筋能量释放 */
    for (var i = 0; i < 14; i++) {
      var a = Math.atan2(v.y, v.x) + (Math.random() - 0.5) * 1.1;
      pushParticle({
        kind: 'spark', x: np.x, y: np.y,
        vx: Math.cos(a) * (120 + Math.random() * 260), vy: Math.sin(a) * (120 + Math.random() * 260),
        size: 1.8 + Math.random() * 2.2, life: 0.2 + Math.random() * 0.22,
        color: ammo.key === 'split' ? '190,160,255' : ammo.key === 'blast' ? '255,200,140' : '150,235,255'
      });
    }
    pushParticle({ kind: 'ring', x: np.x, y: np.y, r: 8, vr: 300, life: 0.26, color: '170,235,255' });

    G.aim.x = 0; G.aim.y = 0;
    updatePowerUi();
    syncHud();
    updateDock();
    return true;
  }

  function mainProjectile() {
    for (var i = 0; i < G.projectiles.length; i++) {
      if (G.projectiles[i].body) return G.projectiles[i];
    }
    return null;
  }

  function activateAbility() {
    if (G.phase !== 'flight' || G.paused || G.abilityUsed) return false;
    var pr = mainProjectile();
    if (!pr || !pr.body) return false;
    G.abilityUsed = true;
    var kind = G.abilityKind;
    Audio2.ability(kind);

    if (kind === 'spike') {
      var b = pr.body;
      var sp = Math.hypot(b.vx, b.vy);
      var dirx = sp > 1 ? b.vx / sp : 1;
      /* 冲刺 + 下压：早按会加速前冲、晚按变成俯冲重击，两种时机都不会废掉这一发 */
      b.vx = dirx * Math.max(sp, 520) * 1.42;
      b.vy = b.vy + 300;
      var s2 = Math.hypot(b.vx, b.vy);
      if (s2 > 2100) { b.vx = b.vx / s2 * 2100; b.vy = b.vy / s2 * 2100; }
      b.wake();
      pushParticle({ kind: 'ring', x: b.x, y: b.y, r: 8, vr: 520, life: 0.34, color: '150,235,255' });
      for (var i = 0; i < 18; i++) {
        pushParticle({
          kind: 'spark', x: b.x, y: b.y,
          vx: (Math.random() - 0.5) * 260, vy: -Math.random() * 240,
          size: 2 + Math.random() * 2.6, life: 0.24 + Math.random() * 0.24, color: '150,235,255'
        });
      }
      addShake(3.4);
      G.flash = Math.max(G.flash, 0.16);
      G.flashColor = '150,235,255';

    } else if (kind === 'split') {
      var b0 = pr.body;
      var bx = b0.x, by = b0.y, bvx = b0.vx, bvy = b0.vy;
      G.world.remove(b0);
      pr.body = null;
      G.projectiles = [];
      var angs = [-0.36, 0, 0.36];
      for (var k = 0; k < 3; k++) {
        var ca = Math.cos(angs[k]), sa = Math.sin(angs[k]);
        var nvx = (bvx * ca - bvy * sa) * 1.04;
        var nvy = (bvx * sa + bvy * ca) * 1.04;
        var nb = G.world.create({
          shape: 'circle', kind: 'projectile', radius: 13,
          x: bx + ca * 6 - sa * 6, y: by + sa * 10 + ca * 6,
          vx: nvx, vy: nvy,
          density: 0.0082, friction: 0.5, restitution: 0.3,
          linearDamping: 0.05, angularDamping: 2.4,
          data: { type: 'projectile', gid: 'proj' + (G.seq++) }
        });
        var nrec = { id: nb.data.gid, body: nb, type: 'split', radius: 13, life: 0, restTimer: 0, trail: [], main: k === 1 };
        nb.data.rec = nrec;
        G.projectiles.push(nrec);
      }
      pushParticle({ kind: 'ring', x: bx, y: by, r: 6, vr: 440, life: 0.3, color: '190,160,255' });
      for (var j = 0; j < 20; j++) {
        var aa = Math.random() * Math.PI * 2;
        pushParticle({
          kind: 'shard', x: bx, y: by,
          vx: Math.cos(aa) * (90 + Math.random() * 200), vy: Math.sin(aa) * (90 + Math.random() * 200),
          size: 3 + Math.random() * 4, life: 0.3 + Math.random() * 0.3, color: '190,160,255',
          spin: (Math.random() - 0.5) * 12
        });
      }
      addShake(2.4);

    } else {
      var bb = pr.body;
      var ex = bb.x, ey = bb.y;
      G.world.remove(bb);
      pr.body = null;
      G.projectiles = [];
      explode(ex, ey, 205, 640, 260);
    }
    updateAbilityHint();
    return true;
  }

  function explode(x, y, radius, power2, dmg) {
    var list = G.world.queryRadius(x, y, radius + 60);
    for (var i = 0; i < list.length; i++) {
      var b = list[i];
      if (b.isStatic) continue;
      var dx = b.x - x, dy = b.y - y;
      var d = Math.hypot(dx, dy) || 1;
      if (d > radius + 40) continue;
      var falloff = clamp(1 - d / (radius + 40), 0, 1);
      var nx = dx / d, ny = dy / d;
      b.wake();
      var imp = power2 * falloff * b.mass;
      b.applyImpulse(nx * imp, ny * imp - imp * 0.25, b.x + nx * 4, b.y + ny * 4);
      var dd = dmg * falloff * falloff;
      if (b.data.type === 'block' && b.data.rec && b.data.rec.alive && !b.data.rec.indestructible) {
        damageBlock(b.data.rec, dd * (MAT[b.data.rec.mat] ? MAT[b.data.rec.mat].take : 1) * 2.1, b.x, b.y);
      } else if (b.data.type === 'guard' && b.data.rec && b.data.rec.alive) {
        damageGuard(b.data.rec, dd * 0.62, b.x, b.y);
      }
    }
    pushParticle({ kind: 'ring', x: x, y: y, r: 12, vr: 900, life: 0.42, color: '255,190,120' });
    pushParticle({ kind: 'ring', x: x, y: y, r: 6, vr: 520, life: 0.5, color: '255,240,200' });
    for (var k = 0; k < 40; k++) {
      var a = Math.random() * Math.PI * 2;
      var sp = 140 + Math.random() * 520;
      pushParticle({
        kind: k % 3 === 0 ? 'debris' : 'spark', x: x, y: y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        size: 2 + Math.random() * 5, life: 0.3 + Math.random() * 0.55,
        color: k % 4 === 0 ? '255,240,200' : '255,168,86', spin: (Math.random() - 0.5) * 14
      });
    }
    for (var m = 0; m < 8; m++) {
      pushParticle({
        kind: 'dust', x: x + (Math.random() - 0.5) * 90, y: y + (Math.random() - 0.5) * 90,
        vx: (Math.random() - 0.5) * 120, vy: -40 - Math.random() * 90,
        size: 20 + Math.random() * 26, life: 0.6 + Math.random() * 0.5, color: '226,196,150'
      });
    }
    addShake(11);
    G.flash = Math.max(G.flash, 0.42);
    G.flashColor = '255,215,160';
  }

  /* ------------------------------------------------------- 状态推进 ---- */

  function stepPhysics(dt) {
    G.acc += dt;
    var steps = 0;
    while (G.acc >= FIXED && steps < 400) {
      G.world.step(FIXED);
      G.acc -= FIXED;
      steps++;
    }
    if (G.acc > FIXED * 6) G.acc = 0;
  }

  function updateProjectiles(dt) {
    for (var i = G.projectiles.length - 1; i >= 0; i--) {
      var pr = G.projectiles[i];
      if (!pr.body) { G.projectiles.splice(i, 1); continue; }
      var b = pr.body;
      pr.life += dt;

      pr.trail.push(b.x, b.y);
      if (pr.trail.length > 40) pr.trail.splice(0, pr.trail.length - 40);

      /* 落地后的滚动衰减：圆形弹丸不会无休止滚下去，回合能干净收尾 */
      if (b.y + b.radius > GROUND_Y - 2 && pr.life > 0.2) {
        b.vx *= Math.max(0, 1 - 3.6 * dt);
        b.av *= Math.max(0, 1 - 5.5 * dt);
      }

      var sp = Math.hypot(b.vx, b.vy);
      if (sp > 240) {
        pushParticle({
          kind: 'spark', x: b.x, y: b.y,
          vx: (Math.random() - 0.5) * 40, vy: (Math.random() - 0.5) * 40,
          size: 1.4 + Math.random() * 1.8, life: 0.18 + Math.random() * 0.16,
          color: pr.type === 'split' ? '190,160,255' : pr.type === 'blast' ? '255,200,140' : '150,235,255'
        });
      }

      if (sp < 62) pr.restTimer += dt; else pr.restTimer = 0;

      var out = b.x < -240 || b.x > G.extentX + 150 || b.y > WORLD_H + 420;
      if (out || pr.restTimer > 0.36 || pr.life > 6.5) {
        G.world.remove(b);
        pr.body = null;
        G.projectiles.splice(i, 1);
        if (!out) {
          spawnBurst(b.x, b.y, 4, 160, 'wood');
        }
      }
    }
  }

  function worldCalm() {
    var bs = G.world.bodies;
    for (var i = 0; i < bs.length; i++) {
      var b = bs[i];
      if (b.isStatic || b.removed || !b.awake) continue;
      if (Math.hypot(b.vx, b.vy) > 26 || Math.abs(b.av) > 0.35) return false;
    }
    return true;
  }

  function resolveTurn() {
    if (G.pendingResult !== null) return;
    if (guardsAlive() === 0) {
      G.pendingResult = 'win';
      G.resultTimer = 0.5;
      return;
    }
    if (shotsLeft() <= 0) {
      G.pendingResult = 'lose';
      G.resultTimer = 0.7;
      return;
    }
    G.phase = 'aim';
    G.abilityUsed = false;
    G.settleTimer = 0;
    G.aim.x = 0; G.aim.y = 0;
    updatePowerUi();
    updateDock();
    updateAbilityHint();
    syncHud();
  }

  function finishWin() {
    var bonus = shotsLeft() * 400 + 1500;
    G.lastBase = G.levelScore;
    G.lastBonus = bonus;
    G.score += bonus;
    G.levelScore += bonus;
    saveBest();
    var isLast = G.level >= LEVELS.length;
    saveUnlocked(Math.min(LEVELS.length, G.level + 1));
    G.phase = isLast ? 'complete' : 'clear';
    G.pendingResult = null;
    Audio2.win();
    G.flash = Math.max(G.flash, 0.3);
    G.flashColor = '190,255,225';
    for (var i = 0; i < 40; i++) {
      pushParticle({
        kind: 'spark', x: G.anchorX + Math.random() * 320, y: GROUND_Y - Math.random() * 320,
        vx: (Math.random() - 0.5) * 200, vy: -120 - Math.random() * 260,
        size: 2 + Math.random() * 3, life: 0.8 + Math.random() * 0.7,
        color: i % 2 ? '150,255,205' : '255,235,180'
      });
    }
    syncHud();
    showPanel(isLast ? 'complete' : 'clear');
    updateDock();
    updateAbilityHint();
  }

  function finishLose() {
    G.phase = 'fail';
    G.pendingResult = null;
    saveBest();
    Audio2.lose();
    syncHud();
    showPanel('fail');
    updateDock();
    updateAbilityHint();
  }

  function updateStateMachine(dt) {
    if (G.pendingResult !== null) {
      G.resultTimer -= dt;
      if (G.resultTimer <= 0) {
        if (G.pendingResult === 'win') finishWin();
        else finishLose();
      }
      return;
    }

    if (G.phase === 'flight') {
      if (G.projectiles.length === 0) {
        G.phase = 'settle';
        G.settleTimer = 0;
        updateAbilityHint();
        updateDock();
      }
    } else if (G.phase === 'settle') {
      G.settleTimer += dt;
      if ((G.settleTimer > 0.45 && worldCalm()) || G.settleTimer > 3.4) {
        resolveTurn();
      }
    }
  }

  function updateFx(dt) {
    G.shake = Math.max(0, G.shake - dt * 26);
    G.flash = Math.max(0, G.flash - dt * 1.9);
    for (var i = 0; i < G.blocks.length; i++) {
      if (G.blocks[i].flash > 0) G.blocks[i].flash = Math.max(0, G.blocks[i].flash - dt * 3.4);
    }
    for (var j = 0; j < G.guards.length; j++) {
      if (G.guards[j].flash > 0) G.guards[j].flash = Math.max(0, G.guards[j].flash - dt * 2.6);
    }
    if (G.toastTimer > 0) {
      G.toastTimer -= dt;
      if (G.toastTimer <= 0) dom.toast.hidden = true;
    }
    /* 掉出世界的守卫视为被击败 */
    for (var k = 0; k < G.guards.length; k++) {
      var g = G.guards[k];
      if (g.alive && g.body && g.body.y > WORLD_H + 320) defeatGuard(g, g.body.x, WORLD_H);
    }
  }

  function advance(dt) {
    if (G.paused) return;
    if (dt <= 0) return;
    G.time += dt;
    if (G.world) {
      stepPhysics(dt);
      updateProjectiles(dt);
      updateStateMachine(dt);
    }
    updateParticles(dt);
    updateFx(dt);
    updateCamera(dt);
  }

  /* ------------------------------------------------------------ 相机 ---- */

  function baseCam() {
    var scale = Math.min(G.cssW / G.extentX, G.cssH / VIEW_H);
    if (!isFinite(scale) || scale <= 0) scale = 0.5;
    var visW = G.cssW / scale;
    var visH = G.cssH / scale;
    return {
      scale: scale,
      x: (G.extentX - visW) * 0.5,
      y: VIEW_BOTTOM - visH
    };
  }

  function updateCameraImmediate() {
    var b = baseCam();
    G.cam.scale = b.scale;
    G.cam.x = b.x;
    G.cam.y = b.y;
    G.cam.ty = b.y;
  }

  function updateCamera(dt) {
    var b = baseCam();
    G.cam.scale = b.scale;
    G.cam.x = b.x;
    var desired = b.y;
    var pr = mainProjectile();
    if (pr && pr.body) {
      var top = pr.body.y - 90;
      if (top < desired) desired = Math.max(top, -WORLD_H);
    }
    G.cam.ty = desired;
    G.cam.y = lerp(G.cam.y, desired, Math.min(1, dt * 6));
  }

  function screenToWorld(clientX, clientY) {
    var r = canvas.getBoundingClientRect();
    var s = G.cam.scale || 1;
    return {
      x: G.cam.x + (clientX - r.left) / s,
      y: G.cam.y + (clientY - r.top) / s
    };
  }

  /* ------------------------------------------------------------ 绘制 ---- */

  function resize() {
    if (!stage) return;
    var r = stage.getBoundingClientRect();
    G.cssW = Math.max(1, Math.round(r.width));
    G.cssH = Math.max(1, Math.round(r.height));
    G.dpr = Math.min(2.5, window.devicePixelRatio || 1);
    canvas.width = Math.max(1, Math.round(G.cssW * G.dpr));
    canvas.height = Math.max(1, Math.round(G.cssH * G.dpr));
    updateCameraImmediate();
  }

  function buildBackground() {
    /* key 不含跟随相机的 y：天空/远景作为固定天空盒，飞行时不必重建 */
    var base = baseCam();
    var key = G.cssW + 'x' + G.cssH + 'x' + base.scale.toFixed(3) + 'x' + G.extentX;
    if (G.bg && G.bgKey === key) return G.bg;
    var c = G.bg && G.bg.width === canvas.width && G.bg.height === canvas.height ? G.bg
      : document.createElement('canvas');
    c.width = canvas.width;
    c.height = canvas.height;
    var g = c.getContext('2d');
    g.setTransform(G.dpr, 0, 0, G.dpr, 0, 0);
    var w = G.cssW, h = G.cssH;

    /* 天空 */
    var sky = g.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#0a1226');
    sky.addColorStop(0.34, '#1d2b4d');
    sky.addColorStop(0.62, '#4b3f63');
    sky.addColorStop(0.82, '#a86a56');
    sky.addColorStop(1, '#e59a56');
    g.fillStyle = sky;
    g.fillRect(0, 0, w, h);

    /* 星点 */
    for (var i = 0; i < 60; i++) {
      var sxp = hash01(i, 1) * w;
      var syp = hash01(i, 2) * h * 0.42;
      var al = 0.15 + hash01(i, 3) * 0.55;
      g.fillStyle = 'rgba(220,235,255,' + al.toFixed(2) + ')';
      g.fillRect(sxp, syp, 1.4, 1.4);
    }

    var s = base.scale;
    var horizon = (GROUND_Y - base.y) * s;

    /* 落日 */
    var sunX = w * 0.74, sunY = horizon - h * 0.14;
    var halo = g.createRadialGradient(sunX, sunY, 4, sunX, sunY, Math.max(60, h * 0.42));
    halo.addColorStop(0, 'rgba(255,214,150,0.75)');
    halo.addColorStop(0.35, 'rgba(255,150,90,0.22)');
    halo.addColorStop(1, 'rgba(255,120,70,0)');
    g.fillStyle = halo;
    g.beginPath(); g.arc(sunX, sunY, Math.max(60, h * 0.42), 0, Math.PI * 2); g.fill();
    var sunG = g.createLinearGradient(0, sunY - 30, 0, sunY + 30);
    sunG.addColorStop(0, '#fff0cf');
    sunG.addColorStop(1, '#ff9f52');
    g.fillStyle = sunG;
    g.beginPath(); g.arc(sunX, sunY, Math.max(16, h * 0.055), 0, Math.PI * 2); g.fill();

    /* 远景沙丘（两层） */
    function dunes(baseY, amp, wavelen, color, seed) {
      g.fillStyle = color;
      g.beginPath();
      g.moveTo(-4, h + 4);
      for (var x = -4; x <= w + 4; x += 8) {
        var y = baseY
          + Math.sin((x / wavelen) + seed) * amp
          + Math.sin((x / (wavelen * 0.41)) + seed * 2.3) * amp * 0.4;
        g.lineTo(x, y);
      }
      g.lineTo(w + 4, h + 4);
      g.closePath();
      g.fill();
    }
    dunes(horizon - h * 0.075, h * 0.032, w * 0.34, 'rgba(58,52,80,0.85)', 1.2);

    /* 远处要塞剪影（压低压小，避免和前景要塞抢视线） */
    g.fillStyle = 'rgba(44,42,66,0.62)';
    var fx = w * 0.2, fy = horizon - h * 0.012;
    for (var t = 0; t < 6; t++) {
      var bw = w * (0.011 + hash01(t, 9) * 0.008);
      var bh = h * (0.024 + hash01(t, 11) * 0.042);
      var bx2 = fx + t * w * 0.036;
      g.fillRect(bx2, fy - bh, bw, bh + h * 0.02);
      g.beginPath();
      g.moveTo(bx2 - 1.5, fy - bh);
      g.lineTo(bx2 + bw * 0.5, fy - bh - h * 0.016);
      g.lineTo(bx2 + bw + 1.5, fy - bh);
      g.closePath();
      g.fill();
    }

    dunes(horizon - h * 0.028, h * 0.02, w * 0.22, 'rgba(72,58,74,0.95)', 3.7);

    G.bg = c;
    G.bgKey = key;
    return c;
  }

  function drawGround(g) {
    var left = G.cam.x - 200;
    var right = G.cam.x + G.cssW / G.cam.scale + 200;

    var grad = g.createLinearGradient(0, GROUND_Y - 10, 0, WORLD_H + 200);
    grad.addColorStop(0, '#d9a866');
    grad.addColorStop(0.12, '#b5824a');
    grad.addColorStop(0.5, '#7d5533');
    grad.addColorStop(1, '#42291a');
    g.fillStyle = grad;
    g.fillRect(left, GROUND_Y, right - left, WORLD_H + 320 - GROUND_Y);

    /* 顶部亮沙边 */
    g.fillStyle = 'rgba(255,222,168,0.85)';
    g.fillRect(left, GROUND_Y - 3, right - left, 5);

    /* 沙纹 */
    g.strokeStyle = 'rgba(96,62,36,0.35)';
    g.lineWidth = 2;
    g.beginPath();
    for (var i = 0; i < 46; i++) {
      var x = left + hash01(i, 21) * (right - left);
      var y = GROUND_Y + 10 + hash01(i, 22) * 44;
      var len = 30 + hash01(i, 23) * 90;
      g.moveTo(x, y);
      g.lineTo(x + len, y + 3);
    }
    g.stroke();

    /* 小石子 */
    for (var j = 0; j < 22; j++) {
      var rx = left + hash01(j, 31) * (right - left);
      var ry = GROUND_Y + 4 + hash01(j, 32) * 30;
      var rr = 2 + hash01(j, 33) * 4;
      g.fillStyle = 'rgba(74,52,34,0.55)';
      g.beginPath(); g.ellipse(rx, ry, rr, rr * 0.7, 0, 0, Math.PI * 2); g.fill();
    }
  }

  function pathBody(g, b) {
    var wv = b.worldVerts;
    g.beginPath();
    g.moveTo(wv[0].x, wv[0].y);
    for (var i = 1; i < wv.length; i++) g.lineTo(wv[i].x, wv[i].y);
    g.closePath();
  }

  function drawPlatform(g, rec) {
    var b = rec.body;
    g.save();
    g.translate(b.x, b.y);
    g.rotate(b.angle);
    var w = rec.w, h = rec.h;
    var grad = g.createLinearGradient(0, -h / 2, 0, h / 2);
    grad.addColorStop(0, '#77808f');
    grad.addColorStop(0.25, '#5d6675');
    grad.addColorStop(1, '#343b48');
    g.fillStyle = grad;
    g.beginPath();
    g.moveTo(-w / 2, -h / 2);
    g.lineTo(w / 2, -h / 2);
    g.lineTo(w / 2 + 10, h / 2);
    g.lineTo(-w / 2 - 10, h / 2);
    g.closePath();
    g.fill();
    g.strokeStyle = 'rgba(20,26,34,0.9)';
    g.lineWidth = 2;
    g.stroke();
    g.fillStyle = 'rgba(255,226,178,0.5)';
    g.fillRect(-w / 2, -h / 2, w, 3);
    /* 悬空底部锯齿岩 */
    g.fillStyle = '#2c333f';
    for (var i = 0; i < 7; i++) {
      var px = -w / 2 + (i + 0.5) * (w / 7);
      var d = 8 + hash01(i, 41) * 20;
      g.beginPath();
      g.moveTo(px - w / 20, h / 2);
      g.lineTo(px, h / 2 + d);
      g.lineTo(px + w / 20, h / 2);
      g.closePath();
      g.fill();
    }
    g.restore();
  }

  function drawBlock(g, rec) {
    var b = rec.body;
    if (!b) return;
    var m = MAT[rec.mat];
    var w = rec.w, h = rec.h;
    g.save();
    g.translate(b.x, b.y);
    g.rotate(b.angle);

    var grad = g.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
    grad.addColorStop(0, m.fill[0]);
    grad.addColorStop(1, m.fill[1]);
    g.fillStyle = grad;

    var r = Math.min(5, Math.min(w, h) * 0.22);
    roundRect(g, -w / 2, -h / 2, w, h, r);
    g.fill();

    if (rec.mat === 'crystal') {
      g.save();
      roundRect(g, -w / 2, -h / 2, w, h, r);
      g.clip();
      g.strokeStyle = 'rgba(255,255,255,0.55)';
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(-w / 2, h / 2); g.lineTo(w / 2, -h / 2);
      g.moveTo(-w / 2 + w * 0.4, h / 2); g.lineTo(w / 2, h / 2 - h * 0.4);
      g.stroke();
      g.restore();
      g.shadowColor = 'rgba(120,230,255,0.75)';
      g.shadowBlur = 14;
    } else if (rec.mat === 'wood') {
      g.strokeStyle = m.grain;
      g.lineWidth = 1.6;
      g.beginPath();
      var lines = Math.max(2, Math.floor(Math.min(w, h) / 12));
      for (var i = 1; i <= lines; i++) {
        var t = -0.5 + i / (lines + 1);
        if (w >= h) { g.moveTo(-w / 2 + 3, t * h); g.lineTo(w / 2 - 3, t * h + (hash01(i, 51) - 0.5) * 3); }
        else { g.moveTo(t * w, -h / 2 + 3); g.lineTo(t * w + (hash01(i, 52) - 0.5) * 3, h / 2 - 3); }
      }
      g.stroke();
    } else if (rec.mat === 'stone') {
      g.fillStyle = m.grain;
      for (var k = 0; k < 8; k++) {
        var sx = (hash01(k, 61) - 0.5) * (w - 8);
        var sy = (hash01(k, 62) - 0.5) * (h - 8);
        var sr = 1.6 + hash01(k, 63) * 3.4;
        g.beginPath(); g.ellipse(sx, sy, sr, sr * 0.8, 0, 0, Math.PI * 2); g.fill();
      }
    } else if (rec.mat === 'steel') {
      g.fillStyle = 'rgba(255,232,190,0.45)';
      var cols = Math.max(1, Math.floor(w / 22)), rows = Math.max(1, Math.floor(h / 22));
      for (var cx = 0; cx < cols; cx++) {
        for (var cy = 0; cy < rows; cy++) {
          var px = -w / 2 + (cx + 0.5) * (w / cols);
          var py = -h / 2 + (cy + 0.5) * (h / rows);
          g.beginPath(); g.arc(px, py, 2.2, 0, Math.PI * 2); g.fill();
        }
      }
    }

    /* 高光与描边 */
    g.shadowBlur = 0;
    g.fillStyle = 'rgba(255,255,255,0.16)';
    g.fillRect(-w / 2 + 2, -h / 2 + 2, w - 4, Math.min(4, h * 0.18));
    g.strokeStyle = m.edge;
    g.lineWidth = 2;
    roundRect(g, -w / 2, -h / 2, w, h, r);
    g.stroke();

    /* 损伤裂纹 */
    var dmgRatio = rec.indestructible ? 1 : rec.hp / rec.maxHp;
    if (dmgRatio < 0.86) {
      var cracks = Math.round((1 - dmgRatio) * 5) + 1;
      g.strokeStyle = 'rgba(20,10,4,0.6)';
      g.lineWidth = 1.6;
      g.beginPath();
      for (var c = 0; c < cracks; c++) {
        var ox = (hash01(c + rec.id.length, 71) - 0.5) * w * 0.7;
        var oy = (hash01(c, 72) - 0.5) * h * 0.7;
        g.moveTo(ox, oy);
        g.lineTo(ox + (hash01(c, 73) - 0.5) * w * 0.4, oy + (hash01(c, 74) - 0.5) * h * 0.5);
        g.lineTo(ox + (hash01(c, 75) - 0.5) * w * 0.5, oy + (hash01(c, 76) - 0.5) * h * 0.6);
      }
      g.stroke();
    }
    if (rec.flash > 0) {
      g.fillStyle = 'rgba(255,240,210,' + (rec.flash * 0.5).toFixed(3) + ')';
      roundRect(g, -w / 2, -h / 2, w, h, r);
      g.fill();
    }
    g.restore();
  }

  function roundRect(g, x, y, w, h, r) {
    r = Math.min(r, w * 0.5, h * 0.5);
    g.beginPath();
    g.moveTo(x + r, y);
    g.lineTo(x + w - r, y);
    g.quadraticCurveTo(x + w, y, x + w, y + r);
    g.lineTo(x + w, y + h - r);
    g.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    g.lineTo(x + r, y + h);
    g.quadraticCurveTo(x, y + h, x, y + h - r);
    g.lineTo(x, y + r);
    g.quadraticCurveTo(x, y, x + r, y);
    g.closePath();
  }

  /* 原创守卫：石甲哨兵 —— 不规则石壳 + 铜盔 + 单只琥珀光眼 */
  function drawGuard(g, rec, idx) {
    var b = rec.body;
    if (!b || !rec.alive) return;
    var r = b.radius;
    var hurt = 1 - rec.hp / rec.maxHp;
    var breathe = 1 + Math.sin(G.time * 2.2 + idx) * 0.02;

    g.save();
    g.translate(b.x, b.y);
    g.rotate(b.angle * 0.35);
    g.scale(breathe, 2 - breathe);

    /* 影子 */
    g.fillStyle = 'rgba(0,0,0,0.28)';
    g.beginPath(); g.ellipse(0, r * 0.95, r * 0.9, r * 0.24, 0, 0, Math.PI * 2); g.fill();

    /* 脚 */
    g.fillStyle = '#3b4553';
    g.fillRect(-r * 0.62, r * 0.6, r * 0.42, r * 0.42);
    g.fillRect(r * 0.2, r * 0.6, r * 0.42, r * 0.42);

    /* 石壳 */
    var shell = g.createRadialGradient(-r * 0.32, -r * 0.4, r * 0.16, 0, 0, r * 1.12);
    shell.addColorStop(0, '#8d97a8');
    shell.addColorStop(0.55, '#666f80');
    shell.addColorStop(1, '#3f4757');
    g.fillStyle = shell;
    g.beginPath();
    var pts = 11;
    for (var i = 0; i < pts; i++) {
      var a = (i / pts) * Math.PI * 2;
      var rad = r * (0.9 + hash01(i + idx * 7, 81) * 0.18);
      var px = Math.cos(a) * rad, py = Math.sin(a) * rad * 0.98;
      if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
    }
    g.closePath();
    g.fill();
    g.strokeStyle = '#262d39';
    g.lineWidth = 2.4;
    g.stroke();

    /* 铜盔 */
    g.fillStyle = '#b6803c';
    g.beginPath();
    g.ellipse(0, -r * 0.62, r * 0.72, r * 0.34, 0, Math.PI, Math.PI * 2);
    g.fill();
    g.strokeStyle = '#6d4a1d';
    g.lineWidth = 1.8;
    g.stroke();
    g.fillStyle = '#d9a35a';
    g.fillRect(-r * 0.08, -r * 1.16, r * 0.16, r * 0.34);

    /* 侧铜钉 */
    g.fillStyle = '#8d6229';
    g.beginPath(); g.arc(-r * 0.78, r * 0.02, r * 0.14, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(r * 0.78, r * 0.02, r * 0.14, 0, Math.PI * 2); g.fill();

    /* 裂纹（受伤） */
    if (hurt > 0.12) {
      g.strokeStyle = 'rgba(18,22,30,0.75)';
      g.lineWidth = 1.8;
      g.beginPath();
      var nc = Math.round(hurt * 4) + 1;
      for (var c = 0; c < nc; c++) {
        var a0 = hash01(c + idx, 91) * Math.PI * 2;
        g.moveTo(Math.cos(a0) * r * 0.2, Math.sin(a0) * r * 0.2);
        g.lineTo(Math.cos(a0) * r * 0.62, Math.sin(a0) * r * 0.62 + 3);
        g.lineTo(Math.cos(a0 + 0.4) * r * 0.9, Math.sin(a0 + 0.4) * r * 0.86);
      }
      g.stroke();
    }

    /* 单眼（朝左，面向弹弓） */
    g.rotate(-b.angle * 0.35);
    var blink = Math.sin(G.time * 1.5 + rec.blink);
    var eyeH = blink > 0.965 ? r * 0.08 : r * 0.3;
    var eyeCol = hurt > 0.55 ? '#ff6a5e' : '#ffc14d';
    var eyeGlow = hurt > 0.55 ? 'rgba(255,90,80,0.8)' : 'rgba(255,190,90,0.8)';
    g.save();
    g.shadowColor = eyeGlow;
    g.shadowBlur = 14 + Math.sin(G.time * 6) * 4;
    g.fillStyle = eyeCol;
    g.beginPath();
    g.ellipse(-r * 0.16, -r * 0.06, r * 0.34, eyeH, 0, 0, Math.PI * 2);
    g.fill();
    g.restore();
    g.fillStyle = 'rgba(40,18,6,0.9)';
    g.beginPath();
    g.ellipse(-r * 0.22, -r * 0.06, r * 0.12, eyeH * 0.62, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = 'rgba(255,255,255,0.85)';
    g.beginPath();
    g.ellipse(-r * 0.3, -r * 0.18, r * 0.08, r * 0.06, 0, 0, Math.PI * 2);
    g.fill();

    if (rec.flash > 0) {
      g.fillStyle = 'rgba(255,120,90,' + (rec.flash * 0.5).toFixed(3) + ')';
      g.beginPath(); g.arc(0, 0, r * 1.06, 0, Math.PI * 2); g.fill();
    }
    g.restore();

    /* 血条 */
    if (rec.hp < rec.maxHp) {
      var bw = r * 1.8, bh = 6;
      var hx = b.x - bw / 2, hy = b.y - r - 20;
      g.fillStyle = 'rgba(8,12,20,0.75)';
      roundRect(g, hx - 1, hy - 1, bw + 2, bh + 2, 3); g.fill();
      var ratio = clamp(rec.hp / rec.maxHp, 0, 1);
      g.fillStyle = ratio > 0.5 ? '#7ce6a4' : ratio > 0.25 ? '#ffd166' : '#ff6f75';
      roundRect(g, hx, hy, bw * ratio, bh, 3); g.fill();
    }
  }

  function drawSling(g) {
    var ax = SLING_X, ay = SLING_Y;
    var np = nockPos();
    var showNock = (G.phase === 'aim' || G.phase === 'title') && shotsLeft() > 0 && G.pendingResult === null;
    var ammo = currentAmmo();

    /* 地基土堆 */
    g.fillStyle = 'rgba(90,60,36,0.9)';
    g.beginPath();
    g.ellipse(ax, GROUND_Y + 4, 62, 16, 0, 0, Math.PI * 2);
    g.fill();

    /* 主杆 */
    var poleGrad = g.createLinearGradient(ax - 14, 0, ax + 14, 0);
    poleGrad.addColorStop(0, '#8b5c31');
    poleGrad.addColorStop(0.5, '#a97544');
    poleGrad.addColorStop(1, '#6d4526');
    g.fillStyle = poleGrad;
    g.strokeStyle = '#442a14';
    g.lineWidth = 2;

    /* 后叉 */
    g.save();
    g.beginPath();
    g.moveTo(ax - 9, GROUND_Y + 2);
    g.lineTo(ax + 9, GROUND_Y + 2);
    g.lineTo(ax + 6, ay + 42);
    g.lineTo(ax - 6, ay + 42);
    g.closePath();
    g.fill(); g.stroke();

    /* 两个叉臂 */
    function arm(dx) {
      g.beginPath();
      g.moveTo(ax + dx * 0.4 - 5, ay + 46);
      g.lineTo(ax + dx * 0.4 + 5, ay + 46);
      g.lineTo(ax + dx + 5, ay - 34);
      g.lineTo(ax + dx - 5, ay - 30);
      g.closePath();
      g.fill(); g.stroke();
      /* 叉头绑绳 */
      g.save();
      g.strokeStyle = '#3a2410';
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(ax + dx - 7, ay - 24);
      g.lineTo(ax + dx + 7, ay - 22);
      g.moveTo(ax + dx - 7, ay - 16);
      g.lineTo(ax + dx + 7, ay - 14);
      g.stroke();
      g.restore();
    }
    arm(-26);
    arm(26);
    g.restore();

    var topL = { x: ax - 26, y: ay - 32 };
    var topR = { x: ax + 26, y: ay - 32 };

    /* 皮筋（后侧） */
    g.save();
    g.lineCap = 'round';
    g.strokeStyle = 'rgba(120,220,255,0.9)';
    g.shadowColor = 'rgba(90,210,255,0.8)';
    g.shadowBlur = 10;
    g.lineWidth = 7;
    g.beginPath();
    g.moveTo(topR.x, topR.y);
    g.lineTo(np.x + 6, np.y);
    g.stroke();
    g.restore();

    if (showNock) drawCrystal(g, np.x, np.y, ammo.radius, ammo, G.time * 1.4, 1);

    /* 皮筋（前侧） */
    g.save();
    g.lineCap = 'round';
    g.strokeStyle = 'rgba(90,200,240,0.95)';
    g.shadowColor = 'rgba(90,210,255,0.85)';
    g.shadowBlur = 10;
    g.lineWidth = 7;
    g.beginPath();
    g.moveTo(topL.x, topL.y);
    g.lineTo(np.x - 6, np.y);
    g.stroke();
    g.restore();

    /* 剩余弹药堆 */
    var left = shotsLeft();
    for (var i = 0; i < Math.min(left - (showNock ? 1 : 0), 5); i++) {
      var kx = ax - 78 - i * 26;
      var ky = GROUND_Y - 12;
      var a2 = AMMO[G.ammoQueue[G.shotIndex + 1 + i]] || AMMO.spike;
      drawCrystal(g, kx, ky, 12, a2, G.time * 0.6 + i, 0.75);
    }
  }

  function drawCrystal(g, x, y, r, ammo, rot, alpha) {
    g.save();
    g.translate(x, y);
    g.rotate(rot);
    g.globalAlpha = alpha;
    g.shadowColor = ammo.glow;
    g.shadowBlur = 18;
    var grad = g.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.15, 0, 0, r * 1.1);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.4, ammo.color);
    grad.addColorStop(1, 'rgba(20,40,60,0.95)');
    g.fillStyle = grad;
    g.beginPath();
    for (var i = 0; i < 6; i++) {
      var a = (i / 6) * Math.PI * 2;
      var rr = r * (i % 2 === 0 ? 1 : 0.84);
      var px = Math.cos(a) * rr, py = Math.sin(a) * rr;
      if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
    }
    g.closePath();
    g.fill();
    g.shadowBlur = 0;
    g.strokeStyle = 'rgba(255,255,255,0.8)';
    g.lineWidth = 1.6;
    g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.75)';
    g.beginPath();
    g.moveTo(0, -r * 0.55);
    g.lineTo(r * 0.3, 0);
    g.lineTo(0, r * 0.5);
    g.lineTo(-r * 0.3, 0);
    g.closePath();
    g.fill();
    g.restore();
  }

  function drawProjectiles(g) {
    for (var i = 0; i < G.projectiles.length; i++) {
      var pr = G.projectiles[i];
      if (!pr.body) continue;
      var ammo = AMMO[pr.type] || AMMO.spike;

      /* 拖尾 */
      var t = pr.trail;
      if (t.length >= 4) {
        g.save();
        g.lineCap = 'round';
        for (var k = 0; k + 3 < t.length; k += 2) {
          var a = (k / t.length) * 0.55;
          g.strokeStyle = 'rgba(' + hexToRgb(ammo.color) + ',' + a.toFixed(3) + ')';
          g.lineWidth = pr.radius * 0.35 + (k / t.length) * pr.radius * 1.1;
          g.beginPath();
          g.moveTo(t[k], t[k + 1]);
          g.lineTo(t[k + 2], t[k + 3]);
          g.stroke();
        }
        g.restore();
      }

      var b = pr.body;
      var spin = Math.atan2(b.vy, b.vx);
      drawCrystal(g, b.x, b.y, pr.radius, ammo, b.angle + spin * 0.2, 1);

      /* 能力未使用时的脉冲提示环 */
      if (!G.abilityUsed && G.phase === 'flight' && pr.main) {
        var pulse = 1 + Math.sin(G.time * 12) * 0.16;
        g.save();
        g.strokeStyle = 'rgba(' + hexToRgb(ammo.color) + ',0.75)';
        g.lineWidth = 2.4;
        g.beginPath();
        g.arc(b.x, b.y, pr.radius * 1.9 * pulse, 0, Math.PI * 2);
        g.stroke();
        g.restore();
      }
    }
  }

  function hexToRgb(hex) {
    var h = hex.replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255].join(',');
  }

  function drawTrajectory(g) {
    if (G.phase !== 'aim' || pullLen() < 10) return;
    var v = launchVelocity();
    var np = nockPos();
    var x = np.x, y = np.y, vx = v.x, vy = v.y;
    var dt = 0.038;
    g.save();
    for (var i = 0; i < 46; i++) {
      x += vx * dt;
      vy += GRAVITY * dt;
      y += vy * dt;
      if (y > GROUND_Y - 6 || x > G.extentX + 200) break;
      var a = clamp(1 - i / 46, 0.12, 0.85);
      var rr = i < 3 ? 4.4 : 3.4 - i * 0.03;
      g.fillStyle = 'rgba(180,240,255,' + a.toFixed(3) + ')';
      g.beginPath();
      g.arc(x, y, Math.max(1.4, rr), 0, Math.PI * 2);
      g.fill();
    }
    g.restore();

    /* 拉伸方向线 + 力度弧 */
    var p = power();
    g.save();
    g.setLineDash([7, 7]);
    g.strokeStyle = 'rgba(255,214,150,0.75)';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(np.x, np.y);
    g.lineTo(SLING_X + (-G.aim.x) * 0.55, SLING_Y + (-G.aim.y) * 0.55);
    g.stroke();
    g.setLineDash([]);

    var ang = Math.atan2(-G.aim.y, -G.aim.x);
    g.strokeStyle = 'rgba(120,235,255,0.85)';
    g.lineWidth = 5;
    g.beginPath();
    g.arc(np.x, np.y, 44, ang - 0.5, ang - 0.5 + p * 1.0);
    g.stroke();

    g.fillStyle = 'rgba(235,250,255,0.95)';
    g.font = '700 20px system-ui, -apple-system, "PingFang SC", sans-serif';
    g.textAlign = 'center';
    g.fillText(Math.round(p * 100) + '%', np.x, np.y - 56);
    g.restore();
  }

  function drawParticles(g) {
    var arr = G.particles;
    for (var i = 0; i < arr.length; i++) {
      var p = arr[i];
      var a = clamp(p.life / p.max, 0, 1);
      if (p.kind === 'ring') {
        g.save();
        g.strokeStyle = 'rgba(' + p.color + ',' + (a * 0.8).toFixed(3) + ')';
        g.lineWidth = 2 + a * 4;
        g.beginPath();
        g.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        g.stroke();
        g.restore();
      } else if (p.kind === 'dust') {
        g.fillStyle = 'rgba(' + p.color + ',' + (a * 0.3).toFixed(3) + ')';
        g.beginPath();
        g.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        g.fill();
      } else if (p.kind === 'debris') {
        g.save();
        g.translate(p.x, p.y);
        g.rotate(p.rot);
        g.fillStyle = 'rgba(' + p.color + ',' + a.toFixed(3) + ')';
        g.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.8);
        g.restore();
      } else if (p.kind === 'shard') {
        g.save();
        g.translate(p.x, p.y);
        g.rotate(p.rot);
        g.fillStyle = 'rgba(' + p.color + ',' + a.toFixed(3) + ')';
        g.beginPath();
        g.moveTo(0, -p.size);
        g.lineTo(p.size * 0.7, p.size * 0.6);
        g.lineTo(-p.size * 0.7, p.size * 0.6);
        g.closePath();
        g.fill();
        g.restore();
      } else {
        g.fillStyle = 'rgba(' + p.color + ',' + a.toFixed(3) + ')';
        g.beginPath();
        g.arc(p.x, p.y, p.size * (0.5 + a * 0.5), 0, Math.PI * 2);
        g.fill();
      }
    }

    for (var j = 0; j < G.floats.length; j++) {
      var f = G.floats[j];
      var fa = clamp(f.life / f.max, 0, 1);
      g.save();
      g.globalAlpha = fa;
      g.font = '800 24px system-ui, -apple-system, "PingFang SC", sans-serif';
      g.textAlign = 'center';
      g.lineWidth = 4;
      g.strokeStyle = 'rgba(6,10,18,0.8)';
      g.strokeText(f.text, f.x, f.y);
      g.fillStyle = f.color;
      g.fillText(f.text, f.x, f.y);
      g.restore();
    }
  }

  function render() {
    if (!ctx) return;
    var g = ctx;
    g.setTransform(G.dpr, 0, 0, G.dpr, 0, 0);
    g.clearRect(0, 0, G.cssW, G.cssH);

    /* 背景（缓存） */
    var bg = buildBackground();
    g.save();
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.drawImage(bg, 0, 0);
    g.restore();

    /* 云（动态、轻量） */
    g.save();
    g.setTransform(G.dpr, 0, 0, G.dpr, 0, 0);
    for (var c = 0; c < 4; c++) {
      var cw = G.cssW * (0.26 + hash01(c, 101) * 0.2);
      var cx = ((G.time * (5 + c * 3) + hash01(c, 102) * G.cssW * 2) % (G.cssW + cw * 2)) - cw;
      var cy = G.cssH * (0.08 + hash01(c, 103) * 0.22);
      g.fillStyle = 'rgba(226,206,222,' + (0.05 + hash01(c, 104) * 0.07).toFixed(3) + ')';
      g.beginPath();
      g.ellipse(cx, cy, cw * 0.5, cw * 0.09, 0, 0, Math.PI * 2);
      g.fill();
    }
    g.restore();

    /* 世界 */
    g.save();
    if (G.shake > 0.05) {
      g.translate((Math.random() * 2 - 1) * G.shake, (Math.random() * 2 - 1) * G.shake);
    }
    g.scale(G.cam.scale, G.cam.scale);
    g.translate(-G.cam.x, -G.cam.y);

    drawGround(g);
    for (var i = 0; i < G.statics.length; i++) drawPlatform(g, G.statics[i]);
    for (var j = 0; j < G.blocks.length; j++) if (G.blocks[j].alive) drawBlock(g, G.blocks[j]);
    for (var k = 0; k < G.guards.length; k++) drawGuard(g, G.guards[k], k);
    drawSling(g);
    drawTrajectory(g);
    drawProjectiles(g);
    drawParticles(g);

    g.restore();

    /* 闪光 */
    if (G.flash > 0.01) {
      g.save();
      g.setTransform(G.dpr, 0, 0, G.dpr, 0, 0);
      g.fillStyle = 'rgba(' + G.flashColor + ',' + (G.flash * 0.32).toFixed(3) + ')';
      g.fillRect(0, 0, G.cssW, G.cssH);
      g.restore();
    }
  }

  /* -------------------------------------------------------------- UI ---- */

  var hudCache = {};
  function setText(el, v) {
    if (!el) return;
    var s = String(v);
    if (hudCache[el.id] !== s) { el.textContent = s; hudCache[el.id] = s; }
  }

  function syncHud() {
    setText(dom.statLevel, G.level + '/' + LEVELS.length);
    setText(dom.statScore, G.score);
    setText(dom.statBest, Math.max(G.best, G.score));
    setText(dom.statGuards, guardsAlive() + '/' + G.guards.length);

    /* 弹药点阵 */
    var want = G.ammoQueue.length;
    if (dom.ammoRow.childElementCount !== want) {
      dom.ammoRow.textContent = '';
      for (var i = 0; i < want; i++) {
        var s = document.createElement('span');
        s.className = 'ammo-pip';
        dom.ammoRow.appendChild(s);
      }
    }
    for (var j = 0; j < want; j++) {
      var el = dom.ammoRow.children[j];
      var cls = 'ammo-pip t-' + G.ammoQueue[j] + (j < G.shotIndex ? ' spent' : '');
      if (el.className !== cls) el.className = cls;
    }
  }

  function updatePowerUi() {
    var p = Math.round(power() * 100);
    if (dom.powerFill) dom.powerFill.style.width = p + '%';
    setText(dom.powerVal, p + '%');
  }

  function updateDock() {
    var ammo = currentAmmo();
    var chipCls = 'chip t-' + ammo.key;
    if (dom.dockChip.className !== chipCls) dom.dockChip.className = chipCls;
    setText(dom.dockName, ammo.label + ' · ' + ammo.ability);
    setText(dom.dockDesc, ammo.desc);

    var hint = '拖动左侧晶核向后蓄力';
    if (G.phase === 'flight') hint = G.abilityUsed ? '能力已释放，看它砸下去' : '现在按 Space / 点击画面 → 【' + ammo.ability + '】';
    else if (G.phase === 'settle') hint = '结构正在崩塌……';
    else if (G.phase === 'clear') hint = '关卡通过，可进入下一关';
    else if (G.phase === 'fail') hint = '弹药耗尽，重玩本关再试';
    else if (G.phase === 'complete') hint = '三关全清，挑战更高总分';
    else if (G.phase === 'title') hint = '点击「开始攻城」进入第一关';
    setText(dom.dockHint, hint);
  }

  function updateAbilityHint() {
    var show = G.phase === 'flight' && !G.abilityUsed && !G.paused && G.projectiles.length > 0;
    if (dom.abilityHint.hidden === !show) return;
    dom.abilityHint.hidden = !show;
    if (show) {
      dom.abilityHint.lastElementChild.textContent = '点击画面 / 空格 → ' + currentAmmoName();
    }
  }
  function currentAmmoName() {
    var a = AMMO[G.abilityKind] || currentAmmo();
    return a.label + '·' + a.ability;
  }

  function toast(text, dur) {
    dom.toast.textContent = text;
    dom.toast.hidden = false;
    G.toastTimer = dur || 2.2;
  }

  function showPanel(name) {
    var panels = dom.overlay.querySelectorAll('.panel');
    for (var i = 0; i < panels.length; i++) {
      panels[i].hidden = panels[i].getAttribute('data-panel') !== name;
    }
    dom.overlay.hidden = !name;

    if (name === 'title') {
      setText(dom.titleBest, Math.max(G.best, G.score));
      setText(dom.titleUnlocked, G.unlocked);
      buildLevelSelect();
    } else if (name === 'clear') {
      setText(dom.clearLevel, G.level);
      setText(dom.clearBase, G.lastBase);
      setText(dom.clearBonus, G.lastBonus);
      setText(dom.clearTotal, G.score);
    } else if (name === 'fail') {
      setText(dom.failGuards, guardsAlive());
      setText(dom.failScore, G.levelScore);
    } else if (name === 'complete') {
      setText(dom.doneTotal, G.score);
      setText(dom.doneBest, Math.max(G.best, G.score));
    }
  }

  function buildLevelSelect() {
    dom.levelSelect.textContent = '';
    for (var i = 0; i < LEVELS.length; i++) {
      var lv = LEVELS[i];
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'lv-btn';
      btn.textContent = '第 ' + lv.id + ' 关 ';
      var sp = document.createElement('span');
      sp.textContent = lv.name;
      btn.appendChild(sp);
      if (lv.id > G.unlocked) {
        btn.disabled = true;
        btn.title = '尚未解锁';
      } else {
        btn.setAttribute('data-level', String(lv.id));
      }
      dom.levelSelect.appendChild(btn);
    }
  }

  /* ------------------------------------------------------- 流程控制 ---- */

  function startGame(level) {
    Audio2.ensure();
    G.started = true;
    G.score = 0;
    G.paused = false;
    setPauseUi(false);
    enterLevel(level || 1);
  }

  function enterLevel(n) {
    buildLevel(n);
    G.phase = 'aim';
    G.paused = false;
    setPauseUi(false);
    showPanel(null);
    updatePowerUi();
    updateAbilityHint();
    updateDock();
    var def = LEVELS[clamp(n, 1, LEVELS.length) - 1];
    toast('第 ' + def.id + ' 关 · ' + def.name + ' — ' + def.hint, 3.2);
    Audio2.levelStart();
  }

  function restartLevel() {
    G.score = G.scoreAtLevelStart;
    enterLevel(G.level);
  }

  function nextLevel() {
    if (G.level >= LEVELS.length) { backToTitle(); return; }
    enterLevel(G.level + 1);
  }

  function backToTitle() {
    G.phase = 'title';
    G.paused = false;
    setPauseUi(false);
    buildLevel(1);
    G.phase = 'title';
    showPanel('title');
    updateDock();
    updateAbilityHint();
  }

  function setPauseUi(on) {
    dom.btnPause.textContent = on ? '继续' : '暂停';
    dom.btnPause.setAttribute('aria-pressed', on ? 'true' : 'false');
  }

  function pause() {
    if (G.paused) return false;
    if (G.phase === 'title' || G.phase === 'clear' || G.phase === 'fail' || G.phase === 'complete') return false;
    G.paused = true;
    Audio2.stretchStop();
    G.dragging = false;
    setPauseUi(true);
    showPanel('paused');
    updateAbilityHint();
    return true;
  }

  function resume() {
    if (!G.paused) return false;
    G.paused = false;
    setPauseUi(false);
    showPanel(null);
    updateAbilityHint();
    return true;
  }

  function togglePause() {
    if (G.paused) resume(); else pause();
  }

  function setMuted(m) {
    G.muted = !!m;
    store('muted', G.muted ? '1' : '0');
    dom.btnMute.textContent = G.muted ? '静音中' : '音效开';
    dom.btnMute.setAttribute('aria-pressed', G.muted ? 'true' : 'false');
    if (G.muted) Audio2.stretchStop();
  }

  /* ------------------------------------------------------------ 输入 ---- */

  function onPointerDown(e) {
    if (G.paused) return;
    Audio2.ensure();

    if (G.phase === 'flight') {
      if (!G.abilityUsed) { activateAbility(); updateDock(); }
      return;
    }
    if (!canAim() || shotsLeft() <= 0) return;

    var wp = screenToWorld(e.clientX, e.clientY);
    G.dragging = true;
    G.pointerId = e.pointerId;
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* 忽略 */ }
    setAim(wp.x - SLING_X, wp.y - SLING_Y);
    Audio2.stretchStart();
    e.preventDefault();
  }

  function onPointerMove(e) {
    if (!G.dragging || e.pointerId !== G.pointerId) return;
    var wp = screenToWorld(e.clientX, e.clientY);
    setAim(wp.x - SLING_X, wp.y - SLING_Y);
    Audio2.stretchUpdate(power());
    e.preventDefault();
  }

  function onPointerUp(e) {
    if (!G.dragging || e.pointerId !== G.pointerId) return;
    G.dragging = false;
    G.pointerId = null;
    try { canvas.releasePointerCapture(e.pointerId); } catch (err) { /* 忽略 */ }
    Audio2.stretchStop();
    if (pullLen() >= 14) {
      launch();
      updateAbilityHint();
    } else {
      G.aim.x = 0; G.aim.y = 0;
      updatePowerUi();
    }
  }

  function onKeyDown(e) {
    var k = e.key;
    if (k === ' ' || k === 'Spacebar' || e.code === 'Space') {
      e.preventDefault();
      Audio2.ensure();
      if (G.phase === 'title') { startGame(1); return; }
      if (G.paused) return;
      if (G.phase === 'flight' && !G.abilityUsed) { activateAbility(); updateDock(); }
      return;
    }
    if (k === 'p' || k === 'P') { togglePause(); return; }
    if (k === 'r' || k === 'R') {
      if (G.phase !== 'title') { Audio2.ui(); restartLevel(); }
      return;
    }
    if (k === 'm' || k === 'M') { setMuted(!G.muted); return; }
  }

  function bindUi() {
    dom.btnStart.addEventListener('click', function () { Audio2.ensure(); Audio2.ui(); startGame(1); });
    dom.btnPause.addEventListener('click', function () { Audio2.ensure(); Audio2.ui(); togglePause(); });
    dom.btnRestart.addEventListener('click', function () {
      Audio2.ensure(); Audio2.ui();
      if (G.phase === 'title') startGame(1); else restartLevel();
    });
    dom.btnMute.addEventListener('click', function () { Audio2.ensure(); setMuted(!G.muted); Audio2.ui(); });

    dom.btnNext.addEventListener('click', function () { Audio2.ui(); nextLevel(); });
    dom.btnReplay.addEventListener('click', function () { Audio2.ui(); restartLevel(); });
    dom.btnRetry.addEventListener('click', function () { Audio2.ui(); restartLevel(); });
    dom.btnHome.addEventListener('click', function () { Audio2.ui(); backToTitle(); });
    dom.btnHome2.addEventListener('click', function () { Audio2.ui(); backToTitle(); });
    dom.btnHome3.addEventListener('click', function () { Audio2.ui(); backToTitle(); });
    dom.btnFromScratch.addEventListener('click', function () { Audio2.ui(); startGame(1); });
    dom.btnResume.addEventListener('click', function () { Audio2.ui(); resume(); });
    dom.btnRestart2.addEventListener('click', function () { Audio2.ui(); restartLevel(); });

    dom.levelSelect.addEventListener('click', function (e) {
      var t = e.target;
      while (t && t !== dom.levelSelect && !t.getAttribute('data-level')) t = t.parentNode;
      if (!t || t === dom.levelSelect) return;
      var lv = parseInt(t.getAttribute('data-level'), 10);
      if (!isFinite(lv)) return;
      Audio2.ensure(); Audio2.ui();
      G.started = true;
      G.score = 0;
      enterLevel(lv);
    });

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);
    canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('blur', function () { Audio2.stretchStop(); G.dragging = false; });
  }

  /* ------------------------------------------------------- 主循环 ---- */

  var lastTs = 0;
  function frame(ts) {
    window.requestAnimationFrame(frame);
    var dt = lastTs ? (ts - lastTs) / 1000 : 1 / 60;
    lastTs = ts;
    if (dt > 0.05) dt = 0.05;
    if (!G.manualClock) advance(dt);
    render();
  }

  /* ------------------------------------------------------- 测试接口 ---- */

  function snapPhase() { return G.paused ? 'paused' : G.phase; }

  function snapshot() {
    var pr = mainProjectile();
    var i;

    var targets = [];
    for (i = 0; i < G.guards.length; i++) {
      var gr = G.guards[i];
      targets.push({
        id: gr.id,
        type: 'guard',
        alive: !!gr.alive,
        hp: Math.round(Math.max(0, gr.hp) * 100) / 100,
        maxHp: gr.maxHp,
        x: gr.body ? Math.round(gr.body.x * 100) / 100 : null,
        y: gr.body ? Math.round(gr.body.y * 100) / 100 : null,
        spawnX: gr.spawnX, spawnY: gr.spawnY,
        r: gr.body ? gr.body.radius : 27
      });
    }

    var blocks = [];
    for (i = 0; i < G.blocks.length; i++) {
      var bk = G.blocks[i];
      blocks.push({
        id: bk.id,
        material: bk.mat,
        alive: !!bk.alive,
        indestructible: !!bk.indestructible,
        hp: Math.round(Math.max(0, bk.hp) * 100) / 100,
        maxHp: bk.maxHp,
        w: bk.w, h: bk.h,
        spawnX: bk.spawnX, spawnY: bk.spawnY,
        x: bk.body ? Math.round(bk.body.x * 100) / 100 : null,
        y: bk.body ? Math.round(bk.body.y * 100) / 100 : null,
        angle: bk.body ? Math.round(bk.body.angle * 1000) / 1000 : null
      });
    }

    var projectiles = [];
    for (i = 0; i < G.projectiles.length; i++) {
      var p = G.projectiles[i];
      if (!p.body) continue;
      projectiles.push({
        id: p.id, type: p.type,
        x: Math.round(p.body.x * 100) / 100,
        y: Math.round(p.body.y * 100) / 100,
        vx: Math.round(p.body.vx * 100) / 100,
        vy: Math.round(p.body.vy * 100) / 100,
        r: p.radius,
        life: Math.round(p.life * 1000) / 1000
      });
    }

    return {
      phase: snapPhase(),
      stage: G.phase,
      paused: !!G.paused,
      manualClock: !!G.manualClock,
      muted: !!G.muted,
      started: !!G.started,
      level: G.level,
      levelName: G.levelName,
      levelCount: LEVELS.length,
      score: G.score,
      levelScore: G.levelScore,
      best: Math.max(G.best, G.score),
      unlocked: G.unlocked,
      shotsLeft: shotsLeft(),
      shotsTotal: G.ammoQueue.length,
      shotsUsed: G.shotIndex,
      ammo: { current: currentAmmoKey(), queue: G.ammoQueue.slice() },
      abilityKind: G.abilityKind,
      abilityUsed: !!G.abilityUsed,
      abilityReady: G.phase === 'flight' && !G.abilityUsed && projectiles.length > 0,
      aim: {
        dx: Math.round(G.aim.x * 100) / 100,
        dy: Math.round(G.aim.y * 100) / 100,
        pull: Math.round(pullLen() * 100) / 100,
        power: Math.round(power() * 1000) / 1000
      },
      projectile: projectiles.length ? projectiles[(pr && projectiles.length > 1) ? 0 : 0] : null,
      projectiles: projectiles,
      targets: targets,
      blocks: blocks,
      guardsAlive: guardsAlive(),
      guardsTotal: G.guards.length,
      blocksAlive: (function () { var n = 0; for (var q = 0; q < G.blocks.length; q++) if (G.blocks[q].alive) n++; return n; })(),
      pendingResult: G.pendingResult,
      particles: G.particles.length,
      debug: {
        bodies: G.world ? G.world.bodies.length : 0,
        arbiters: G.world ? G.world.arbiters.size : 0,
        floats: G.floats.length,
        audioReady: !!Audio2.ready,
        audioState: Audio2.ctx ? Audio2.ctx.state : 'none'
      },
      time: Math.round(G.time * 1000) / 1000,
      world: {
        width: G.worldW, height: WORLD_H, extentX: G.extentX,
        groundY: GROUND_Y, slingX: SLING_X, slingY: SLING_Y,
        anchorX: G.anchorX, maxPull: MAX_PULL, gravity: GRAVITY,
        launchSpeed: Math.round(G.launchSpeed)
      },
      view: {
        cssW: G.cssW, cssH: G.cssH,
        scale: Math.round(G.cam.scale * 10000) / 10000,
        camX: Math.round(G.cam.x * 100) / 100,
        camY: Math.round(G.cam.y * 100) / 100,
        viewTop: VIEW_TOP, viewBottom: VIEW_BOTTOM
      }
    };
  }

  function testStep(ms) {
    var total = Number(ms);
    if (!isFinite(total) || total <= 0) total = 16.6667;
    if (G.paused) return snapshot();          // 暂停时不推进任何状态
    total = Math.min(total, 20000);
    var remain = total / 1000;
    var slice = 1 / 60;
    var guard = 0;
    while (remain > 1e-6 && guard < 4000) {
      var d = Math.min(slice, remain);
      advance(d);
      remain -= d;
      guard++;
    }
    return snapshot();
  }

  var TestApi = {
    snapshot: snapshot,

    start: function (level) {
      startGame(level ? clamp(level | 0, 1, LEVELS.length) : 1);
      return snapshot();
    },
    restart: function () {
      if (G.phase === 'title') startGame(1); else restartLevel();
      return snapshot();
    },
    loadLevel: function (level) {
      var lv = clamp(parseInt(level, 10) || 1, 1, LEVELS.length);
      G.started = true;
      enterLevel(lv);
      return snapshot();
    },
    nextLevel: function () { nextLevel(); return snapshot(); },
    backToTitle: function () { backToTitle(); return snapshot(); },

    pause: function () { pause(); return snapshot(); },
    resume: function () { resume(); return snapshot(); },

    setManualClock: function (on) {
      G.manualClock = !!on;
      G.acc = 0;
      return snapshot();
    },
    step: function (ms) { return testStep(ms); },

    aim: function (dx, dy) {
      if (G.phase === 'aim' && !G.paused) {
        setAim(Number(dx) || 0, Number(dy) || 0);
      }
      return snapshot();
    },
    launch: function () {
      var ok = launch();
      updateAbilityHint();
      return { ok: !!ok, snapshot: snapshot() };
    },
    activateAbility: function () {
      var ok = activateAbility();
      updateDock();
      updateAbilityHint();
      return { ok: !!ok, snapshot: snapshot() };
    },
    forceHit: function (targetId) {
      var target = null, i;
      if (targetId != null) {
        for (i = 0; i < G.guards.length; i++) {
          if (G.guards[i].id === targetId) { target = G.guards[i]; break; }
        }
      }
      if (!target) {
        for (i = 0; i < G.guards.length; i++) {
          if (G.guards[i].alive) { target = G.guards[i]; break; }
        }
      }
      if (!target || !target.alive) {
        return { ok: false, reason: 'no-alive-target', snapshot: snapshot() };
      }
      var x = target.body ? target.body.x : 0;
      var y = target.body ? target.body.y : 0;
      var before = G.score;
      damageGuard(target, target.hp + 1, x, y);
      /* 供自动化测试即时验证：全灭时直接结算，无需等待动画延迟 */
      if (guardsAlive() === 0 && G.pendingResult === 'win') {
        G.pendingResult = null;
        finishWin();
      }
      return {
        ok: true, targetId: target.id, defeated: !target.alive,
        scoreGain: G.score - before, snapshot: snapshot()
      };
    },

    setMuted: function (m) { setMuted(m); return snapshot(); },
    getLevels: function () {
      return LEVELS.map(function (l) {
        return { id: l.id, name: l.name, ammo: l.ammo.slice(), guardHp: l.guardHp };
      });
    },
    version: '1.0.0'
  };

  /* ---------------------------------------------------------- 启动 ---- */

  function boot() {
    canvas = document.getElementById('game');
    stage = document.getElementById('stage');
    if (!canvas || !stage) return;
    ctx = canvas.getContext('2d');

    dom = {
      overlay: document.getElementById('overlay'),
      toast: document.getElementById('toast'),
      abilityHint: document.getElementById('abilityHint'),
      statLevel: document.getElementById('statLevel'),
      statScore: document.getElementById('statScore'),
      statBest: document.getElementById('statBest'),
      statGuards: document.getElementById('statGuards'),
      ammoRow: document.getElementById('ammoRow'),
      btnPause: document.getElementById('btnPause'),
      btnRestart: document.getElementById('btnRestart'),
      btnMute: document.getElementById('btnMute'),
      btnStart: document.getElementById('btnStart'),
      btnNext: document.getElementById('btnNext'),
      btnReplay: document.getElementById('btnReplay'),
      btnRetry: document.getElementById('btnRetry'),
      btnHome: document.getElementById('btnHome'),
      btnHome2: document.getElementById('btnHome2'),
      btnHome3: document.getElementById('btnHome3'),
      btnFromScratch: document.getElementById('btnFromScratch'),
      btnResume: document.getElementById('btnResume'),
      btnRestart2: document.getElementById('btnRestart2'),
      levelSelect: document.getElementById('levelSelect'),
      titleBest: document.getElementById('titleBest'),
      titleUnlocked: document.getElementById('titleUnlocked'),
      clearLevel: document.getElementById('clearLevel'),
      clearBase: document.getElementById('clearBase'),
      clearBonus: document.getElementById('clearBonus'),
      clearTotal: document.getElementById('clearTotal'),
      failGuards: document.getElementById('failGuards'),
      failScore: document.getElementById('failScore'),
      doneTotal: document.getElementById('doneTotal'),
      doneBest: document.getElementById('doneBest'),
      dockChip: document.getElementById('dockChip'),
      dockName: document.getElementById('dockName'),
      dockDesc: document.getElementById('dockDesc'),
      dockHint: document.getElementById('dockHint'),
      powerFill: document.getElementById('powerFill'),
      powerVal: document.getElementById('powerVal')
    };

    loadSave();
    setMuted(G.muted);
    resize();

    if (window.ResizeObserver) {
      var ro = new ResizeObserver(function () { resize(); });
      ro.observe(stage);
    } else {
      window.addEventListener('resize', resize);
    }
    window.addEventListener('orientationchange', function () { setTimeout(resize, 220); });

    bindUi();

    /* 标题界面背后就是真实的第 1 关场景 */
    buildLevel(1);
    G.phase = 'title';
    showPanel('title');
    updateDock();
    updatePowerUi();

    /* URL 参数（测试/分享用）：?auto=1&level=2 直接进入指定关卡 */
    try {
      var q = new URLSearchParams(window.location.search);
      if (q.get('auto') === '1') {
        var lv = clamp(parseInt(q.get('level'), 10) || 1, 1, LEVELS.length);
        startGame(lv);
      }
    } catch (e) { /* 忽略 */ }

    window.requestAnimationFrame(frame);
    window.__SLINGSHOT_TEST__ = TestApi;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
