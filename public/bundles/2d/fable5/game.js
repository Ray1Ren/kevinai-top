/* =========================================================
 * Sling Siege · 弹弓攻城
 * 原生 Canvas 弹弓物理小游戏(无任何外部依赖/资源)
 * ========================================================= */
(function () {
  'use strict';

  /* ---------------- 常量 ---------------- */
  var W = 1280, H = 720;
  var GROUND_Y = 640;
  var GRAVITY = 1150;            // px/s^2
  var LAUNCH_K = 10.5;           // 拉距 → 初速
  var MAX_PULL = 118;            // 最大拉距
  var MIN_PULL = 14;             // 低于该拉距不发射
  var PROJ_R = 15;
  var SLING = { x: 172, y: 508 };  // 皮筋锚点(叉口中心)
  var FIXED_DT = 1 / 120;        // 物理步长
  var SETTLE_TIME = 2.4;         // 发射后场面沉降上限
  var STOP_SPEED = 22;

  var MAT = {
    wood:  { hp: 62,  density: 1.0, color1: '#b07b3e', color2: '#8a5a26', score: 100 },
    stone: { hp: 150, density: 1.7, color1: '#9aa3ad', color2: '#6e7680', score: 150 },
    terrain: { hp: Infinity, density: 99, color1: '#6b5233', color2: '#4e3a22', score: 0 }
  };

  var GUARD_HP = 55;
  var GUARD_SCORE = 500;
  var AMMO_BONUS = 800;

  var LS_BEST = 'slingsiege_best_score';
  var LS_UNLOCK = 'slingsiege_unlocked_level';

  /* ---------------- 关卡数据 ---------------- */
  /* 坐标均为世界坐标,GROUND_Y=640 为地面 */
  var LEVELS = [
    { // 第 1 关:前哨小塔 —— 教学关
      name: '前哨木塔',
      shots: 5,
      hint: '按住星弹向左下拖拽蓄力,松手发射;飞行中点击可触发「天坠重击」',
      terrain: [],
      blocks: [
        { x: 848, y: 585, w: 26, h: 110, mat: 'wood' },
        { x: 952, y: 585, w: 26, h: 110, mat: 'wood' },
        { x: 900, y: 517, w: 190, h: 26, mat: 'wood' },
        { x: 900, y: 480, w: 60, h: 48, mat: 'wood' }
      ],
      guards: [
        { x: 760, y: 618, r: 22 },
        { x: 900, y: 560, r: 22 }
      ]
    },
    { // 第 2 关:双子堡 —— 高台 + 石件
      name: '双子堡',
      shots: 5,
      hint: '石块更结实,先撞塌支柱,或用重击从上方砸落',
      terrain: [
        { x: 1030, y: 610, w: 240, h: 60 }
      ],
      blocks: [
        // 左木塔
        { x: 730, y: 585, w: 26, h: 110, mat: 'wood' },
        { x: 820, y: 585, w: 26, h: 110, mat: 'wood' },
        { x: 775, y: 517, w: 160, h: 26, mat: 'wood' },
        { x: 775, y: 455, w: 26, h: 96, mat: 'wood' },
        { x: 775, y: 394, w: 120, h: 26, mat: 'wood' },
        // 右石塔(在高台上)
        { x: 990, y: 540, w: 30, h: 80, mat: 'stone' },
        { x: 1085, y: 540, w: 30, h: 80, mat: 'stone' },
        { x: 1038, y: 486, w: 170, h: 28, mat: 'stone' },
        { x: 1038, y: 440, w: 56, h: 60, mat: 'wood' }
      ],
      guards: [
        { x: 905, y: 618, r: 22 },
        { x: 775, y: 350, r: 20 },
        { x: 1038, y: 556, r: 20 }
      ]
    },
    { // 第 3 关:壳卫王城 —— 石墙掩体 + 土丘地形
      name: '壳卫王城',
      shots: 6,
      hint: '正面有土丘和石墙,试着抛高弧线,再用「天坠重击」砸穿屋顶',
      terrain: [
        { x: 620, y: 622, w: 190, h: 36 },   // 前置土丘,挡低平弹道
        { x: 618, y: 594, w: 110, h: 22 }
      ],
      blocks: [
        // 前石墙
        { x: 810, y: 590, w: 34, h: 100, mat: 'stone' },
        { x: 810, y: 505, w: 34, h: 70, mat: 'stone' },
        // 城内木架 + 石顶掩体(守卫躲在里面)
        { x: 900, y: 596, w: 24, h: 88, mat: 'wood' },
        { x: 1010, y: 596, w: 24, h: 88, mat: 'wood' },
        { x: 955, y: 536, w: 170, h: 26, mat: 'stone' },
        // 高塔
        { x: 1120, y: 585, w: 28, h: 110, mat: 'wood' },
        { x: 1196, y: 585, w: 28, h: 110, mat: 'wood' },
        { x: 1158, y: 517, w: 140, h: 24, mat: 'wood' },
        { x: 1158, y: 468, w: 34, h: 72, mat: 'stone' }
      ],
      guards: [
        { x: 770, y: 618, r: 21 },   // 墙脚
        { x: 955, y: 600, r: 21 },   // 石顶掩体内
        { x: 1158, y: 425, r: 19 },  // 高塔顶
        { x: 1090, y: 618, r: 21 }   // 城内地面
      ]
    }
  ];

  /* ---------------- DOM ---------------- */
  var canvas = document.getElementById('game');
  var ctx = canvas.getContext('2d');
  var el = {
    stage: document.getElementById('stage'),
    hud: document.getElementById('hud'),
    hudLevel: document.getElementById('hudLevel'),
    hudScore: document.getElementById('hudScore'),
    hudAmmo: document.getElementById('hudAmmo'),
    hint: document.getElementById('hint'),
    menu: document.getElementById('menu'),
    bestLine: document.getElementById('bestLine'),
    endPanel: document.getElementById('endPanel'),
    endTitle: document.getElementById('endTitle'),
    endInfo: document.getElementById('endInfo'),
    pausePanel: document.getElementById('pausePanel'),
    btnStart: document.getElementById('btnStart'),
    btnNext: document.getElementById('btnNext'),
    btnAgain: document.getElementById('btnAgain'),
    btnMenuBack: document.getElementById('btnMenuBack'),
    btnPause: document.getElementById('btnPause'),
    btnResume: document.getElementById('btnResume'),
    btnPauseRetry: document.getElementById('btnPauseRetry'),
    btnRetry: document.getElementById('btnRetry'),
    btnMute: document.getElementById('btnMute')
  };

  /* ---------------- 音频(程序化) ---------------- */
  var audio = {
    ctx: null,
    muted: false,
    ensure: function () {
      if (this.muted) return null;
      try {
        if (!this.ctx) {
          var AC = window.AudioContext || window.webkitAudioContext;
          if (!AC) return null;
          this.ctx = new AC();
        }
        if (this.ctx.state === 'suspended') this.ctx.resume();
        return this.ctx;
      } catch (e) { return null; }
    },
    tone: function (freq, dur, type, gain, slideTo) {
      var ac = this.ensure();
      if (!ac) return;
      try {
        var o = ac.createOscillator(), g = ac.createGain();
        o.type = type || 'sine';
        o.frequency.setValueAtTime(freq, ac.currentTime);
        if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(30, slideTo), ac.currentTime + dur);
        g.gain.setValueAtTime(gain || 0.15, ac.currentTime);
        g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + dur);
        o.connect(g); g.connect(ac.destination);
        o.start(); o.stop(ac.currentTime + dur + 0.02);
      } catch (e) {}
    },
    noise: function (dur, gain, lowpass) {
      var ac = this.ensure();
      if (!ac) return;
      try {
        var n = Math.floor(ac.sampleRate * dur);
        var buf = ac.createBuffer(1, n, ac.sampleRate);
        var d = buf.getChannelData(0);
        for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
        var src = ac.createBufferSource();
        src.buffer = buf;
        var g = ac.createGain();
        g.gain.value = gain || 0.2;
        var f = ac.createBiquadFilter();
        f.type = 'lowpass';
        f.frequency.value = lowpass || 1200;
        src.connect(f); f.connect(g); g.connect(ac.destination);
        src.start();
      } catch (e) {}
    },
    sLaunch: function () { this.tone(220, 0.22, 'sine', 0.2, 720); this.noise(0.08, 0.06, 3000); },
    sStretch: function (p) { this.tone(90 + p * 160, 0.05, 'triangle', 0.035); },
    sWood: function (v) { this.noise(0.1, Math.min(0.3, v * 0.001), 900); this.tone(180, 0.09, 'triangle', 0.12, 90); },
    sStone: function (v) { this.noise(0.14, Math.min(0.32, v * 0.001), 500); this.tone(95, 0.13, 'square', 0.1, 50); },
    sBreak: function () { this.noise(0.25, 0.28, 1500); this.tone(320, 0.16, 'sawtooth', 0.08, 70); },
    sGuard: function () { this.tone(520, 0.28, 'sawtooth', 0.16, 130); },
    sSlam: function () { this.noise(0.4, 0.4, 700); this.tone(70, 0.4, 'sine', 0.3, 35); },
    sWin: function () {
      var self = this;
      [523, 659, 784, 1047].forEach(function (f, i) {
        setTimeout(function () { self.tone(f, 0.28, 'triangle', 0.16); }, i * 130);
      });
    },
    sLose: function () {
      var self = this;
      [330, 262, 196].forEach(function (f, i) {
        setTimeout(function () { self.tone(f, 0.4, 'sine', 0.16, f * 0.8); }, i * 200);
      });
    },
    sClick: function () { this.tone(660, 0.06, 'square', 0.06); }
  };

  /* ---------------- 存档 ---------------- */
  function loadNum(key, def) {
    try {
      var v = parseInt(window.localStorage.getItem(key), 10);
      return isNaN(v) ? def : v;
    } catch (e) { return def; }
  }
  function saveNum(key, v) {
    try { window.localStorage.setItem(key, String(v)); } catch (e) {}
  }

  /* ---------------- 游戏状态 ---------------- */
  var state = {
    phase: 'menu',        // menu | ready | aiming | flying | settling | won | lost
    paused: false,
    level: 1,
    score: 0,
    levelStartScore: 0,
    shotsLeft: 0,
    bestScore: loadNum(LS_BEST, 0),
    unlocked: loadNum(LS_UNLOCK, 1),
    simTime: 0,
    settleTimer: 0,
    restTimer: 0,
    blocks: [],
    guards: [],
    proj: null,
    drag: null,           // {dx, dy} 相对锚点的拖拽偏移
    particles: [],
    floats: [],           // 飘分文字
    shakeT: 0,
    shakeMag: 0,
    flashT: 0,
    manualClock: false,
    idSeq: 1,
    winDelay: 0
  };

  function newProjectile() {
    return {
      x: SLING.x, y: SLING.y, vx: 0, vy: 0, r: PROJ_R,
      launched: false, resting: false,
      abilityUsed: false, slamArmed: false,
      trail: [], spin: 0
    };
  }

  /* ---------------- 关卡装载 ---------------- */
  function loadLevel(n) {
    n = Math.max(1, Math.min(LEVELS.length, n | 0));
    var def = LEVELS[n - 1];
    state.level = n;
    state.levelStartScore = state.score;
    state.shotsLeft = def.shots;
    state.blocks = [];
    state.guards = [];
    state.particles = [];
    state.floats = [];
    state.settleTimer = 0;
    state.restTimer = 0;
    state.shakeT = 0;
    state.flashT = 0;
    state.winDelay = 0;
    state.drag = null;
    state.proj = newProjectile();
    state.idSeq = 1;

    def.terrain.forEach(function (t) {
      state.blocks.push({
        id: state.idSeq++, x: t.x, y: t.y, w: t.w, h: t.h,
        vx: 0, vy: 0, angle: 0, angVel: 0,
        mat: 'terrain', hp: Infinity, maxHp: Infinity, static: true, dead: false
      });
    });
    def.blocks.forEach(function (b) {
      var m = MAT[b.mat];
      state.blocks.push({
        id: state.idSeq++, x: b.x, y: b.y, w: b.w, h: b.h,
        vx: 0, vy: 0, angle: 0, angVel: 0,
        mat: b.mat, hp: m.hp, maxHp: m.hp, static: false, dead: false,
        mass: (b.w * b.h / 2000) * m.density
      });
    });
    def.guards.forEach(function (g) {
      state.guards.push({
        id: state.idSeq++, x: g.x, y: g.y, r: g.r,
        vx: 0, vy: 0, hp: GUARD_HP, dead: false,
        hurtT: 0, blink: Math.random() * 3
      });
    });

    state.phase = 'ready';
    hideOverlays();
    el.hud.classList.remove('hidden');
    showHint(def.hint);
    updateHUD();
  }

  function showHint(text) {
    if (text) {
      el.hint.textContent = text;
      el.hint.classList.remove('hidden');
    } else {
      el.hint.classList.add('hidden');
    }
  }

  function hideOverlays() {
    el.menu.classList.add('hidden');
    el.endPanel.classList.add('hidden');
    el.pausePanel.classList.add('hidden');
  }

  /* ---------------- HUD ---------------- */
  function updateHUD() {
    el.hudLevel.textContent = '第 ' + state.level + ' 关 · ' + LEVELS[state.level - 1].name;
    el.hudScore.textContent = '分数 ' + state.score;
    var dots = '';
    for (var i = 0; i < state.shotsLeft; i++) dots += '●';
    el.hudAmmo.textContent = '弹药 ' + (dots || '无');
    el.btnMute.classList.toggle('off', audio.muted);
    el.btnPause.textContent = state.paused ? '▶' : '⏸';
  }

  function updateBestLine() {
    el.bestLine.textContent = '最高分 ' + state.bestScore + ' · 已解锁第 ' + state.unlocked + ' 关';
  }

  /* ---------------- 粒子 / 反馈 ---------------- */
  function spawnParticles(x, y, color, count, speed, size, life, grav) {
    for (var i = 0; i < count; i++) {
      var a = Math.random() * Math.PI * 2;
      var s = (0.3 + Math.random() * 0.7) * speed;
      state.particles.push({
        x: x, y: y,
        vx: Math.cos(a) * s, vy: Math.sin(a) * s - speed * 0.25,
        life: life * (0.5 + Math.random() * 0.5), maxLife: life,
        color: color, size: size * (0.5 + Math.random() * 0.8),
        grav: grav === undefined ? 600 : grav
      });
    }
  }

  function addFloat(x, y, text, color) {
    state.floats.push({ x: x, y: y, text: text, color: color || '#ffe9a8', life: 1.1 });
  }

  function shake(mag, t) {
    state.shakeMag = Math.max(state.shakeMag, mag);
    state.shakeT = Math.max(state.shakeT, t);
  }

  /* ---------------- 伤害与得分 ---------------- */
  function damageBlock(b, dmg, hx, hy) {
    if (b.static || b.dead || dmg <= 0) return;
    b.hp -= dmg;
    if (b.hp <= 0) {
      b.dead = true;
      var m = MAT[b.mat];
      state.score += m.score;
      addFloat(b.x, b.y - 20, '+' + m.score);
      spawnParticles(b.x, b.y, m.color1, 14, 260, 7, 0.8);
      spawnParticles(b.x, b.y, m.color2, 10, 180, 5, 0.7);
      audio.sBreak();
      shake(4, 0.18);
      updateHUD();
    } else {
      spawnParticles(hx || b.x, hy || b.y, MAT[b.mat].color2, 5, 140, 4, 0.5);
    }
  }

  function damageGuard(g, dmg, silent) {
    if (g.dead || dmg <= 0) return;
    g.hp -= dmg;
    g.hurtT = 0.35;
    if (g.hp <= 0) {
      g.dead = true;
      state.score += GUARD_SCORE;
      addFloat(g.x, g.y - 30, '+' + GUARD_SCORE, '#ffd889');
      spawnParticles(g.x, g.y, '#a06bd8', 22, 300, 7, 0.9);
      spawnParticles(g.x, g.y, '#e6d3ff', 12, 200, 4, 0.7);
      if (!silent) audio.sGuard();
      shake(5, 0.22);
      updateHUD();
      checkWin();
    } else if (!silent) {
      audio.sGuard();
    }
  }

  function aliveGuards() {
    return state.guards.filter(function (g) { return !g.dead; });
  }

  function checkWin() {
    if ((state.phase === 'won') || (state.phase === 'lost') || state.phase === 'menu') return;
    if (aliveGuards().length === 0) {
      var bonus = state.shotsLeft * AMMO_BONUS;
      state.score += bonus;
      state.phase = 'won';
      if (state.level < LEVELS.length && state.level + 1 > state.unlocked) {
        state.unlocked = state.level + 1;
        saveNum(LS_UNLOCK, state.unlocked);
      }
      if (state.score > state.bestScore) {
        state.bestScore = state.score;
        saveNum(LS_BEST, state.bestScore);
      }
      updateHUD();
      audio.sWin();
      showHint(null);
      showEndPanel(true, bonus);
    }
  }

  function failLevel() {
    if (state.phase === 'won' || state.phase === 'lost') return;
    state.phase = 'lost';
    if (state.score > state.bestScore) {
      state.bestScore = state.score;
      saveNum(LS_BEST, state.bestScore);
    }
    audio.sLose();
    showHint(null);
    showEndPanel(false, 0);
  }

  function showEndPanel(win, bonus) {
    el.endTitle.textContent = win ? '城 破 !' : '进 攻 受 挫';
    if (win) {
      var extra = bonus > 0 ? '(含剩余弹药奖励 +' + bonus + ')' : '';
      el.endInfo.innerHTML = '全部壳卫被击败!当前分数 <b>' + state.score + '</b> ' + extra +
        (state.level >= LEVELS.length ? '<br>你已攻下最后一座城,恭喜通关!' : '');
      el.btnNext.classList.toggle('hidden', state.level >= LEVELS.length);
    } else {
      el.endInfo.innerHTML = '弹药耗尽,还有 <b>' + aliveGuards().length + '</b> 名壳卫在城中。再试一次!';
      el.btnNext.classList.add('hidden');
    }
    el.endPanel.classList.remove('hidden');
  }

  /* ---------------- 发射与能力 ---------------- */
  function clampDrag(dx, dy) {
    var d = Math.sqrt(dx * dx + dy * dy);
    if (d > MAX_PULL) {
      dx = dx / d * MAX_PULL;
      dy = dy / d * MAX_PULL;
    }
    return { dx: dx, dy: dy };
  }

  function setAim(dx, dy) {
    if (state.phase !== 'ready' && state.phase !== 'aiming') return false;
    state.drag = clampDrag(dx, dy);
    state.phase = 'aiming';
    state.proj.x = SLING.x + state.drag.dx;
    state.proj.y = SLING.y + state.drag.dy;
    return true;
  }

  function launch() {
    if (state.phase !== 'aiming' || !state.drag) return false;
    var d = Math.sqrt(state.drag.dx * state.drag.dx + state.drag.dy * state.drag.dy);
    if (d < MIN_PULL) { // 太轻,弹回
      state.drag = null;
      state.phase = 'ready';
      state.proj.x = SLING.x; state.proj.y = SLING.y;
      return false;
    }
    var p = state.proj;
    p.vx = -state.drag.dx * LAUNCH_K;
    p.vy = -state.drag.dy * LAUNCH_K;
    p.launched = true;
    p.trail = [];
    state.drag = null;
    state.shotsLeft--;
    state.phase = 'flying';
    state.restTimer = 0;
    audio.sLaunch();
    showHint(null);
    updateHUD();
    return true;
  }

  function activateAbility() {
    var p = state.proj;
    if (state.phase !== 'flying' || !p.launched || p.abilityUsed) return false;
    p.abilityUsed = true;
    p.slamArmed = true;
    p.vy += 950;
    p.vx *= 1.15;
    state.flashT = 0.22;
    spawnParticles(p.x, p.y, '#ffe27a', 18, 260, 5, 0.6, 100);
    addFloat(p.x, p.y - 34, '天坠重击!', '#ffe27a');
    audio.tone(880, 0.18, 'square', 0.14, 220);
    shake(3, 0.12);
    return true;
  }

  function slamExplosion(x, y) {
    var R = 165;
    spawnParticles(x, y, '#ffdf7e', 30, 420, 8, 0.9);
    spawnParticles(x, y, '#ff9d4d', 18, 300, 6, 0.8);
    state.flashT = 0.3;
    shake(11, 0.4);
    audio.sSlam();
    state.blocks.forEach(function (b) {
      if (b.dead || b.static) return;
      var dx = b.x - x, dy = b.y - y;
      var d = Math.sqrt(dx * dx + dy * dy) || 1;
      if (d < R + Math.max(b.w, b.h) / 2) {
        var f = (1 - Math.min(1, d / (R + 40))) * 780;
        b.vx += dx / d * f;
        b.vy += dy / d * f - 160;
        b.angVel += (Math.random() - 0.5) * 5;
        damageBlock(b, 60 * (1 - d / (R + 60)), b.x, b.y);
      }
    });
    state.guards.forEach(function (g) {
      if (g.dead) return;
      var dx = g.x - x, dy = g.y - y;
      var d = Math.sqrt(dx * dx + dy * dy) || 1;
      if (d < R + g.r) {
        g.vx += dx / d * 560;
        g.vy += dy / d * 560 - 180;
        damageGuard(g, 60 * (1 - d / (R + 60)) + 12);
      }
    });
  }

  function endTurn() {
    if (state.phase === 'won' || state.phase === 'lost') return;
    if (aliveGuards().length === 0) { checkWin(); return; }
    if (state.shotsLeft <= 0) { failLevel(); return; }
    state.proj = newProjectile();
    state.phase = 'ready';
  }

  /* ---------------- 物理 ---------------- */
  function integrate(dt) {
    var i, b, g;
    // 方块
    for (i = 0; i < state.blocks.length; i++) {
      b = state.blocks[i];
      if (b.dead || b.static) continue;
      b.vy += GRAVITY * dt;
      b.vx *= (1 - 0.06 * dt);
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.angle += b.angVel * dt;
      b.angVel *= (1 - 1.6 * dt);
      b.angle *= (1 - 0.8 * dt); // 视觉倾斜缓慢回正,避免夸张穿插
    }
    // 守卫
    for (i = 0; i < state.guards.length; i++) {
      g = state.guards[i];
      if (g.dead) continue;
      g.vy += GRAVITY * dt;
      g.vx *= (1 - 1.2 * dt);
      g.x += g.vx * dt;
      g.y += g.vy * dt;
      if (g.hurtT > 0) g.hurtT -= dt;
      g.blink -= dt;
      if (g.blink < -0.15) g.blink = 2 + Math.random() * 2.5;
    }
    // 弹丸
    var p = state.proj;
    if (p && p.launched) {
      p.vy += GRAVITY * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.spin += p.vx * dt * 0.02;
      p.trail.push({ x: p.x, y: p.y, life: 0.45, slam: p.slamArmed });
      if (p.trail.length > 40) p.trail.shift();
    }
    if (p) {
      for (i = p.trail.length - 1; i >= 0; i--) {
        p.trail[i].life -= dt;
        if (p.trail[i].life <= 0) p.trail.splice(i, 1);
      }
    }
  }

  function collideBlockWorld(b) {
    // 地面
    var bottom = b.y + b.h / 2;
    if (bottom > GROUND_Y) {
      var impact = b.vy;
      b.y = GROUND_Y - b.h / 2;
      if (impact > 260) {
        damageBlock(b, (impact - 240) * 0.09, b.x, b.y + b.h / 2);
        if (!b.dead && impact > 300) audio[b.mat === 'stone' ? 'sStone' : 'sWood'](impact * 0.6);
      }
      b.vy = impact < 0 ? impact : -impact * 0.08;
      b.vx *= 0.82;
      b.angVel *= 0.8;
    }
    if (b.x - b.w / 2 < 40) { b.x = 40 + b.w / 2; b.vx = Math.abs(b.vx) * 0.3; }
    if (b.x + b.w / 2 > W + 240) { b.dead = true; }
  }

  function resolveBlockBlock(a, b) {
    var px = (a.w + b.w) / 2 - Math.abs(a.x - b.x);
    if (px <= 0) return;
    var py = (a.h + b.h) / 2 - Math.abs(a.y - b.y);
    if (py <= 0) return;

    var aM = a.static, bM = b.static;
    if (aM && bM) return;

    var sx = a.x < b.x ? -1 : 1;
    var sy = a.y < b.y ? -1 : 1;

    if (px < py) {
      // 水平分离
      var rvx = a.vx - b.vx;
      var imp = Math.abs(rvx);
      if (aM) { b.x -= sx * px; } else if (bM) { a.x += sx * px; }
      else { a.x += sx * px / 2; b.x -= sx * px / 2; }
      if ((sx === -1 && rvx > 0) || (sx === 1 && rvx < 0)) {
        var avg = (aM || bM) ? 0 : (a.vx + b.vx) / 2;
        if (!aM) { a.vx = aM || bM ? -a.vx * 0.1 : avg; a.angVel += sx * Math.min(3, imp * 0.004); }
        if (!bM) { b.vx = aM || bM ? -b.vx * 0.1 : avg; b.angVel -= sx * Math.min(3, imp * 0.004); }
        if (imp > 240) {
          damageBlock(a, (imp - 220) * 0.07);
          damageBlock(b, (imp - 220) * 0.07);
          if (imp > 280) audio.sWood(imp * 0.5);
        }
      }
    } else {
      // 垂直分离(堆叠主通道)
      var rvy = a.vy - b.vy;
      var impY = Math.abs(rvy);
      if (aM) { b.y -= sy * py; } else if (bM) { a.y += sy * py; }
      else { a.y += sy * py / 2; b.y -= sy * py / 2; }
      if ((sy === -1 && rvy > 0) || (sy === 1 && rvy < 0)) {
        if (!aM) a.vy = bM || aM ? 0 : (a.vy + b.vy) / 2;
        if (!bM) b.vy = aM || bM ? 0 : (a.vy + b.vy) / 2;
        // 上方块对下方块的摩擦
        if (!aM) a.vx *= 0.86;
        if (!bM) b.vx *= 0.86;
        if (impY > 260) {
          damageBlock(a, (impY - 240) * 0.08);
          damageBlock(b, (impY - 240) * 0.08);
          if (impY > 300) audio.sStone(impY * 0.5);
        }
      }
    }
  }

  function collideGuardWorld(g) {
    if (g.y + g.r > GROUND_Y) {
      var impact = g.vy;
      g.y = GROUND_Y - g.r;
      g.vy = 0;
      g.vx *= 0.75;
      if (impact > 430) damageGuard(g, (impact - 400) * 0.09);
    }
    if (g.x - g.r < 30) { g.x = 30 + g.r; g.vx = Math.abs(g.vx) * 0.4; }
    if (g.x + g.r > W - 4) { g.x = W - 4 - g.r; g.vx = -Math.abs(g.vx) * 0.4; }
  }

  function circleRect(cx, cy, r, b) {
    var nx = Math.max(b.x - b.w / 2, Math.min(cx, b.x + b.w / 2));
    var ny = Math.max(b.y - b.h / 2, Math.min(cy, b.y + b.h / 2));
    var dx = cx - nx, dy = cy - ny;
    var d2 = dx * dx + dy * dy;
    if (d2 >= r * r) return null;
    var d = Math.sqrt(d2);
    if (d < 0.0001) {
      // 圆心在矩形内:沿最浅方向推出
      var left = cx - (b.x - b.w / 2), right = (b.x + b.w / 2) - cx;
      var top = cy - (b.y - b.h / 2), bot = (b.y + b.h / 2) - cy;
      var m = Math.min(left, right, top, bot);
      if (m === left) return { nx: -1, ny: 0, depth: r + left };
      if (m === right) return { nx: 1, ny: 0, depth: r + right };
      if (m === top) return { nx: 0, ny: -1, depth: r + top };
      return { nx: 0, ny: 1, depth: r + bot };
    }
    return { nx: dx / d, ny: dy / d, depth: r - d };
  }

  function collideGuardBlocks(g) {
    for (var i = 0; i < state.blocks.length; i++) {
      var b = state.blocks[i];
      if (b.dead) continue;
      var hit = circleRect(g.x, g.y, g.r, b);
      if (!hit) continue;
      g.x += hit.nx * hit.depth;
      g.y += hit.ny * hit.depth;
      var rvx = g.vx - b.vx, rvy = g.vy - b.vy;
      var vn = rvx * hit.nx + rvy * hit.ny;
      if (vn < 0) {
        g.vx -= vn * hit.nx;
        g.vy -= vn * hit.ny;
        if (hit.ny < -0.5) g.vx = b.static ? g.vx * 0.8 : b.vx; // 站在块上跟随
        var blockSpeed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
        var relImpact = Math.abs(vn);
        if (!b.static && (relImpact > 190 || blockSpeed > 240)) {
          damageGuard(g, Math.max(relImpact, blockSpeed) * 0.11);
        }
      }
    }
  }

  function collideProjectile() {
    var p = state.proj;
    if (!p || !p.launched) return;
    var i, slammed = false;

    // 与方块
    for (i = 0; i < state.blocks.length; i++) {
      var b = state.blocks[i];
      if (b.dead) continue;
      var hit = circleRect(p.x, p.y, p.r, b);
      if (!hit) continue;
      p.x += hit.nx * hit.depth;
      p.y += hit.ny * hit.depth;
      var rvx = p.vx - b.vx, rvy = p.vy - b.vy;
      var vn = rvx * hit.nx + rvy * hit.ny;
      if (vn < 0) {
        var impact = Math.abs(vn);
        // 弹丸反弹(能量衰减)
        var e = 0.34;
        p.vx -= (1 + e) * vn * hit.nx;
        p.vy -= (1 + e) * vn * hit.ny;
        p.vx *= 0.86; p.vy *= 0.92;
        if (!b.static) {
          b.vx -= vn * hit.nx * 1.15;
          b.vy -= vn * hit.ny * 0.9;
          b.angVel += hit.nx * (Math.random() - 0.5) * 4 + (impact * 0.003) * (hit.nx >= 0 ? -1 : 1);
          damageBlock(b, Math.max(0, (impact - 120) * (b.mat === 'stone' ? 0.16 : 0.34)), p.x, p.y);
        }
        if (impact > 130) {
          spawnParticles(p.x, p.y, '#ffe9b8', 6, 160, 4, 0.4);
          shake(Math.min(6, impact * 0.008), 0.14);
          if (b.mat === 'stone' || b.mat === 'terrain') audio.sStone(impact); else audio.sWood(impact);
        }
        if (p.slamArmed) slammed = true;
      }
    }

    // 与守卫
    for (i = 0; i < state.guards.length; i++) {
      var g = state.guards[i];
      if (g.dead) continue;
      var dx = g.x - p.x, dy = g.y - p.y;
      var rr = g.r + p.r;
      var d2 = dx * dx + dy * dy;
      if (d2 < rr * rr) {
        var d = Math.sqrt(d2) || 1;
        var nx = dx / d, ny = dy / d;
        var overlap = rr - d;
        g.x += nx * overlap * 0.8;
        g.y += ny * overlap * 0.8;
        p.x -= nx * overlap * 0.2;
        p.y -= ny * overlap * 0.2;
        var rvx2 = p.vx - g.vx, rvy2 = p.vy - g.vy;
        var vn2 = rvx2 * nx + rvy2 * ny;
        if (vn2 > 0) {
          var imp = vn2;
          g.vx += nx * imp * 0.9;
          g.vy += ny * imp * 0.7 - 90;
          p.vx *= 0.55; p.vy *= 0.6;
          damageGuard(g, Math.max(8, (imp - 90) * 0.32));
          spawnParticles(p.x + nx * p.r, p.y + ny * p.r, '#e6d3ff', 8, 200, 5, 0.5);
          shake(4, 0.16);
          if (p.slamArmed) slammed = true;
        }
      }
    }

    // 地面
    if (p.y + p.r > GROUND_Y) {
      p.y = GROUND_Y - p.r;
      if (p.vy > 60) {
        spawnParticles(p.x, GROUND_Y, '#c9a86a', 8, 150, 4, 0.5);
        if (p.vy > 200) audio.sWood(p.vy * 0.5);
      }
      if (p.slamArmed) slammed = true;
      p.vy = -p.vy * 0.32;
      p.vx *= 0.72;
    }

    if (slammed && p.slamArmed) {
      p.slamArmed = false;
      slamExplosion(p.x, p.y);
      p.vx *= 0.3;
      p.vy = Math.min(p.vy, 0) * 0.3;
    }

    // 出界
    if (p.x > W + 260 || p.x < -260 || p.y > H + 300) {
      p.launched = false;
      p.resting = true;
      if (state.phase === 'flying') {
        state.phase = 'settling';
        state.settleTimer = 0;
      }
    }
  }

  function physicsStep(dt) {
    integrate(dt);

    // 迭代求解,自下而上有助于堆叠稳定
    var movers = state.blocks.slice().sort(function (a, b) { return (b.y + b.h / 2) - (a.y + a.h / 2); });
    for (var iter = 0; iter < 3; iter++) {
      var i, j;
      for (i = 0; i < movers.length; i++) {
        if (!movers[i].dead && !movers[i].static) collideBlockWorld(movers[i]);
      }
      for (i = 0; i < movers.length; i++) {
        if (movers[i].dead) continue;
        for (j = i + 1; j < movers.length; j++) {
          if (movers[j].dead) continue;
          resolveBlockBlock(movers[i], movers[j]);
        }
      }
      for (i = 0; i < state.guards.length; i++) {
        var g = state.guards[i];
        if (g.dead) continue;
        collideGuardWorld(g);
        collideGuardBlocks(g);
      }
      collideProjectile();
    }
  }

  function sceneCalm() {
    var maxV = 0, i;
    for (i = 0; i < state.blocks.length; i++) {
      var b = state.blocks[i];
      if (b.dead || b.static) continue;
      maxV = Math.max(maxV, Math.abs(b.vx), Math.abs(b.vy));
    }
    for (i = 0; i < state.guards.length; i++) {
      var g = state.guards[i];
      if (g.dead) continue;
      maxV = Math.max(maxV, Math.abs(g.vx), Math.abs(g.vy));
    }
    return maxV < 30;
  }

  /* ---------------- 主更新 ---------------- */
  function update(dt) {
    if (state.paused) return;
    if (state.phase === 'menu') return;
    state.simTime += dt;

    physicsStep(dt);

    // 粒子
    var i;
    for (i = state.particles.length - 1; i >= 0; i--) {
      var pt = state.particles[i];
      pt.vy += pt.grav * dt;
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.life -= dt;
      if (pt.life <= 0) state.particles.splice(i, 1);
    }
    for (i = state.floats.length - 1; i >= 0; i--) {
      var f = state.floats[i];
      f.y -= 42 * dt;
      f.life -= dt;
      if (f.life <= 0) state.floats.splice(i, 1);
    }
    if (state.shakeT > 0) state.shakeT -= dt; else state.shakeMag = 0;
    if (state.flashT > 0) state.flashT -= dt;

    // 回合推进
    var p = state.proj;
    if (state.phase === 'flying' && p && p.launched) {
      var sp = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      var grounded = p.y + p.r > GROUND_Y - 2;
      if (sp < STOP_SPEED && grounded) {
        state.restTimer += dt;
        if (state.restTimer > 0.45) {
          p.launched = false;
          p.resting = true;
          state.phase = 'settling';
          state.settleTimer = 0;
        }
      } else {
        state.restTimer = 0;
      }
      // 超时兜底:一发弹不会飞超过 12 秒
      if (state.simTime > 0 && p.launched) {
        p.flightT = (p.flightT || 0) + dt;
        if (p.flightT > 12) {
          p.launched = false;
          state.phase = 'settling';
          state.settleTimer = 0;
        }
      }
    } else if (state.phase === 'settling') {
      state.settleTimer += dt;
      if (state.settleTimer > 0.7 && (sceneCalm() || state.settleTimer > SETTLE_TIME)) {
        endTurn();
      }
    }
  }

  /* =========================================================
   * 渲染
   * ========================================================= */
  var clouds = [
    { x: 200, y: 100, s: 1.1, v: 9 },
    { x: 620, y: 60, s: 0.8, v: 14 },
    { x: 1000, y: 140, s: 1.35, v: 7 },
    { x: 1450, y: 90, s: 0.95, v: 11 }
  ];

  function draw() {
    ctx.save();
    ctx.clearRect(0, 0, W, H);

    // 屏幕震动
    if (state.shakeT > 0 && state.shakeMag > 0) {
      ctx.translate(
        (Math.random() - 0.5) * 2 * state.shakeMag,
        (Math.random() - 0.5) * 2 * state.shakeMag
      );
    }

    drawSky();
    drawGround();

    // 地形块(先画,像大地一部分)
    state.blocks.forEach(function (b) { if (b.static && !b.dead) drawBlock(b); });

    drawSlingBack();
    state.blocks.forEach(function (b) { if (!b.static && !b.dead) drawBlock(b); });
    state.guards.forEach(function (g) { if (!g.dead) drawGuard(g); });
    drawTrajectoryPreview();
    drawProjectile();
    drawSlingFront();
    drawParticles();
    drawFloats();

    // 能力闪光
    if (state.flashT > 0) {
      ctx.fillStyle = 'rgba(255, 236, 160, ' + (state.flashT * 0.9) + ')';
      ctx.fillRect(-20, -20, W + 40, H + 40);
    }

    ctx.restore();
  }

  function drawSky() {
    var gsky = ctx.createLinearGradient(0, 0, 0, H);
    gsky.addColorStop(0, '#7ec3e8');
    gsky.addColorStop(0.55, '#b9e0f2');
    gsky.addColorStop(1, '#e8d9ad');
    ctx.fillStyle = gsky;
    ctx.fillRect(0, 0, W, H);

    // 太阳
    ctx.fillStyle = 'rgba(255, 244, 200, 0.9)';
    ctx.beginPath();
    ctx.arc(1120, 92, 46, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 244, 200, 0.25)';
    ctx.beginPath();
    ctx.arc(1120, 92, 74, 0, Math.PI * 2);
    ctx.fill();

    // 云(用 simTime 漂移;暂停/手动时钟下静止)
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    clouds.forEach(function (c) {
      var cx = ((c.x - state.simTime * c.v) % (W + 360) + W + 360) % (W + 360) - 180;
      drawCloud(cx, c.y, c.s);
    });

    // 远山
    ctx.fillStyle = '#9db98a';
    ctx.beginPath();
    ctx.moveTo(0, 560);
    ctx.quadraticCurveTo(210, 420, 430, 545);
    ctx.quadraticCurveTo(650, 430, 900, 555);
    ctx.quadraticCurveTo(1100, 470, 1280, 550);
    ctx.lineTo(1280, 640); ctx.lineTo(0, 640);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(120, 150, 110, 0.55)';
    ctx.beginPath();
    ctx.moveTo(0, 600);
    ctx.quadraticCurveTo(320, 500, 640, 595);
    ctx.quadraticCurveTo(950, 515, 1280, 600);
    ctx.lineTo(1280, 640); ctx.lineTo(0, 640);
    ctx.closePath();
    ctx.fill();
  }

  function drawCloud(x, y, s) {
    ctx.beginPath();
    ctx.arc(x, y, 26 * s, 0, Math.PI * 2);
    ctx.arc(x + 26 * s, y - 12 * s, 20 * s, 0, Math.PI * 2);
    ctx.arc(x + 52 * s, y, 24 * s, 0, Math.PI * 2);
    ctx.arc(x + 24 * s, y + 8 * s, 20 * s, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawGround() {
    var gg = ctx.createLinearGradient(0, GROUND_Y, 0, H);
    gg.addColorStop(0, '#8a6f43');
    gg.addColorStop(0.12, '#6f5734');
    gg.addColorStop(1, '#4c3a20');
    ctx.fillStyle = gg;
    ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);
    // 草皮
    ctx.fillStyle = '#7ba85a';
    ctx.fillRect(0, GROUND_Y - 8, W, 12);
    ctx.fillStyle = '#93c06b';
    for (var x = 0; x < W; x += 22) {
      ctx.fillRect(x + (x * 13 % 9), GROUND_Y - 12, 3, 7);
    }
  }

  function drawBlock(b) {
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(b.angle);
    var m = MAT[b.mat];
    var hw = b.w / 2, hh = b.h / 2;

    var gb = ctx.createLinearGradient(-hw, -hh, hw, hh);
    gb.addColorStop(0, m.color1);
    gb.addColorStop(1, m.color2);
    ctx.fillStyle = gb;
    ctx.fillRect(-hw, -hh, b.w, b.h);

    ctx.strokeStyle = 'rgba(0,0,0,0.28)';
    ctx.lineWidth = 2;
    ctx.strokeRect(-hw, -hh, b.w, b.h);

    if (b.mat === 'wood') {
      ctx.strokeStyle = 'rgba(90, 55, 18, 0.45)';
      ctx.lineWidth = 1.5;
      if (b.w >= b.h) {
        for (var i = 1; i <= 2; i++) {
          ctx.beginPath();
          ctx.moveTo(-hw + 4, -hh + (b.h * i) / 3);
          ctx.lineTo(hw - 4, -hh + (b.h * i) / 3);
          ctx.stroke();
        }
      } else {
        ctx.beginPath();
        ctx.moveTo(0, -hh + 4); ctx.lineTo(0, hh - 4);
        ctx.stroke();
      }
    } else if (b.mat === 'stone') {
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fillRect(-hw + 3, -hh + 3, b.w - 6, 5);
      ctx.fillStyle = 'rgba(0,0,0,0.10)';
      ctx.fillRect(-hw + 5, hh - 9, b.w - 10, 5);
    } else {
      // 地形:草皮顶
      ctx.fillStyle = '#7ba85a';
      ctx.fillRect(-hw, -hh, b.w, 7);
    }

    // 裂纹(受伤)
    if (!b.static && b.hp < b.maxHp) {
      var dmgRatio = 1 - b.hp / b.maxHp;
      ctx.strokeStyle = 'rgba(30, 16, 5, ' + (0.25 + dmgRatio * 0.5) + ')';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(-hw * 0.5, -hh * 0.6);
      ctx.lineTo(-hw * 0.1, -hh * 0.1);
      ctx.lineTo(-hw * 0.45, hh * 0.4);
      if (dmgRatio > 0.5) {
        ctx.moveTo(hw * 0.5, -hh * 0.5);
        ctx.lineTo(hw * 0.15, hh * 0.05);
        ctx.lineTo(hw * 0.5, hh * 0.55);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawGuard(g) {
    ctx.save();
    ctx.translate(g.x, g.y);
    var hurt = g.hurtT > 0;

    // 阴影
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath();
    ctx.ellipse(0, g.r * 0.96, g.r * 0.9, g.r * 0.26, 0, 0, Math.PI * 2);
    ctx.fill();

    // 甲壳身体
    var gbody = ctx.createRadialGradient(-g.r * 0.3, -g.r * 0.4, g.r * 0.2, 0, 0, g.r * 1.1);
    gbody.addColorStop(0, hurt ? '#e8b8ff' : '#b98ae0');
    gbody.addColorStop(1, hurt ? '#8a4bb8' : '#6c3a99');
    ctx.fillStyle = gbody;
    ctx.beginPath();
    ctx.arc(0, 0, g.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(40, 16, 66, 0.7)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 甲壳纹
    ctx.strokeStyle = 'rgba(40, 16, 66, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, g.r * 0.15, g.r * 0.75, Math.PI * 0.15, Math.PI * 0.85);
    ctx.stroke();

    // 头盔
    ctx.fillStyle = '#c7ccd6';
    ctx.beginPath();
    ctx.arc(0, -g.r * 0.28, g.r * 0.78, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#98a0ad';
    ctx.fillRect(-g.r * 0.78, -g.r * 0.3, g.r * 1.56, g.r * 0.16);
    ctx.fillStyle = '#e8b64f';
    ctx.beginPath();
    ctx.arc(0, -g.r * 0.95, g.r * 0.14, 0, Math.PI * 2);
    ctx.fill();

    // 眼睛(会眨)
    var blinkNow = g.blink < 0;
    ctx.fillStyle = '#2a1140';
    if (blinkNow || hurt) {
      ctx.fillRect(-g.r * 0.42, -g.r * 0.02, g.r * 0.3, 2.5);
      ctx.fillRect(g.r * 0.12, -g.r * 0.02, g.r * 0.3, 2.5);
    } else {
      ctx.beginPath();
      ctx.arc(-g.r * 0.28, 0, g.r * 0.14, 0, Math.PI * 2);
      ctx.arc(g.r * 0.28, 0, g.r * 0.14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(-g.r * 0.24, -g.r * 0.05, g.r * 0.05, 0, Math.PI * 2);
      ctx.arc(g.r * 0.32, -g.r * 0.05, g.r * 0.05, 0, Math.PI * 2);
      ctx.fill();
    }

    // 嘴
    ctx.strokeStyle = '#2a1140';
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (hurt) {
      ctx.arc(0, g.r * 0.5, g.r * 0.22, Math.PI * 1.15, Math.PI * 1.85);
    } else {
      ctx.arc(0, g.r * 0.3, g.r * 0.24, Math.PI * 0.15, Math.PI * 0.85);
    }
    ctx.stroke();

    // 血条(受过伤才显示)
    if (g.hp < GUARD_HP) {
      var bw = g.r * 2;
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(-bw / 2, -g.r - 14, bw, 5);
      ctx.fillStyle = '#7ee27a';
      ctx.fillRect(-bw / 2, -g.r - 14, bw * Math.max(0, g.hp / GUARD_HP), 5);
    }
    ctx.restore();
  }

  var SLING_TOP_L = { x: SLING.x - 26, y: SLING.y - 6 };
  var SLING_TOP_R = { x: SLING.x + 26, y: SLING.y - 10 };

  function drawSlingBack() {
    // 底座土堆
    ctx.fillStyle = '#5d4728';
    ctx.beginPath();
    ctx.ellipse(SLING.x + 2, GROUND_Y, 52, 14, 0, 0, Math.PI * 2);
    ctx.fill();

    // 主干
    ctx.strokeStyle = '#6e4a22';
    ctx.lineWidth = 16;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(SLING.x + 4, GROUND_Y - 2);
    ctx.quadraticCurveTo(SLING.x + 2, SLING.y + 66, SLING.x, SLING.y + 40);
    ctx.stroke();
    // 右叉(后侧)
    ctx.strokeStyle = '#5f3f1c';
    ctx.lineWidth = 11;
    ctx.beginPath();
    ctx.moveTo(SLING.x, SLING.y + 42);
    ctx.quadraticCurveTo(SLING.x + 20, SLING.y + 10, SLING_TOP_R.x, SLING_TOP_R.y);
    ctx.stroke();

    // 后侧皮筋
    var pp = projAnchorPos();
    ctx.strokeStyle = '#7e3b2a';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(SLING_TOP_R.x, SLING_TOP_R.y);
    ctx.lineTo(pp.x + 6, pp.y);
    ctx.stroke();
  }

  function projAnchorPos() {
    var p = state.proj;
    if (p && !p.launched && !p.resting) return { x: p.x, y: p.y };
    return { x: SLING.x, y: SLING.y };
  }

  function drawSlingFront() {
    // 左叉(前侧)
    ctx.strokeStyle = '#7a5227';
    ctx.lineWidth = 12;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(SLING.x, SLING.y + 42);
    ctx.quadraticCurveTo(SLING.x - 18, SLING.y + 12, SLING_TOP_L.x, SLING_TOP_L.y);
    ctx.stroke();

    // 前侧皮筋 + 弹兜
    var p = state.proj;
    var pp = projAnchorPos();
    var pulled = state.phase === 'aiming' && state.drag;
    ctx.strokeStyle = '#93452f';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(SLING_TOP_L.x, SLING_TOP_L.y);
    ctx.lineTo(pp.x - 6, pp.y);
    ctx.stroke();
    if (p && !p.launched && !p.resting) {
      ctx.fillStyle = '#4d2a16';
      ctx.beginPath();
      ctx.ellipse(pp.x, pp.y + 3, 15, 9, pulled ? Math.atan2(state.drag.dy, state.drag.dx) : 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // 力度条
    if (pulled) {
      var d = Math.sqrt(state.drag.dx * state.drag.dx + state.drag.dy * state.drag.dy);
      var ratio = Math.min(1, d / MAX_PULL);
      var bx = SLING.x - 60, by = SLING.y - 120, bw2 = 120, bh2 = 12;
      ctx.fillStyle = 'rgba(12, 18, 30, 0.6)';
      ctx.fillRect(bx - 3, by - 3, bw2 + 6, bh2 + 6);
      var gp = ctx.createLinearGradient(bx, 0, bx + bw2, 0);
      gp.addColorStop(0, '#8fe08a');
      gp.addColorStop(0.6, '#ffd86b');
      gp.addColorStop(1, '#ff7a5c');
      ctx.fillStyle = gp;
      ctx.fillRect(bx, by, bw2 * ratio, bh2);
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(bx, by, bw2, bh2);
      ctx.fillStyle = '#fff8e2';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('力度 ' + Math.round(ratio * 100) + '%', bx + bw2 / 2, by - 8);
    }
  }

  function drawTrajectoryPreview() {
    if (state.phase !== 'aiming' || !state.drag) return;
    var d = Math.sqrt(state.drag.dx * state.drag.dx + state.drag.dy * state.drag.dy);
    if (d < MIN_PULL) return;
    var vx = -state.drag.dx * LAUNCH_K;
    var vy = -state.drag.dy * LAUNCH_K;
    var x = state.proj.x, y = state.proj.y;
    var stepT = 0.05;
    ctx.fillStyle = 'rgba(255, 250, 220, 0.85)';
    for (var i = 0; i < 26; i++) {
      vy += GRAVITY * stepT;
      x += vx * stepT;
      y += vy * stepT;
      if (y > GROUND_Y - 4) break;
      var alpha = 0.85 * (1 - i / 28);
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(x, y, i % 3 === 0 ? 5 : 3.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawProjectile() {
    var p = state.proj;
    if (!p) return;

    // 拖尾
    for (var i = 0; i < p.trail.length; i++) {
      var t = p.trail[i];
      var a = Math.max(0, t.life / 0.45);
      ctx.globalAlpha = a * 0.5;
      ctx.fillStyle = t.slam ? '#ffd86b' : '#9fd8ff';
      ctx.beginPath();
      ctx.arc(t.x, t.y, PROJ_R * a * 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (p.resting) return;

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.spin);

    // 星弹主体
    var gp = ctx.createRadialGradient(-5, -5, 3, 0, 0, PROJ_R + 2);
    gp.addColorStop(0, p.slamArmed ? '#fff3c2' : '#cfe8ff');
    gp.addColorStop(0.55, p.slamArmed ? '#ffc94d' : '#5f9fe0');
    gp.addColorStop(1, p.slamArmed ? '#d98a1f' : '#2f5f9e');
    ctx.fillStyle = gp;
    ctx.beginPath();
    ctx.arc(0, 0, PROJ_R, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(20, 40, 70, 0.65)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 星形刻纹
    ctx.strokeStyle = p.slamArmed ? 'rgba(120, 60, 0, 0.8)' : 'rgba(230, 245, 255, 0.85)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (var k = 0; k < 5; k++) {
      var a1 = -Math.PI / 2 + k * Math.PI * 2 / 5;
      var a2 = a1 + Math.PI * 2 / 5 * 2;
      ctx.moveTo(Math.cos(a1) * 7, Math.sin(a1) * 7);
      ctx.lineTo(Math.cos(a2) * 7, Math.sin(a2) * 7);
    }
    ctx.stroke();

    // 未用能力时的提示光环
    if (p.launched && !p.abilityUsed) {
      var pulse = 0.5 + 0.5 * Math.sin(state.simTime * 8);
      ctx.strokeStyle = 'rgba(255, 226, 122, ' + (0.35 + pulse * 0.4) + ')';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, PROJ_R + 6 + pulse * 3, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawParticles() {
    for (var i = 0; i < state.particles.length; i++) {
      var pt = state.particles[i];
      ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawFloats() {
    ctx.textAlign = 'center';
    ctx.font = 'bold 22px sans-serif';
    for (var i = 0; i < state.floats.length; i++) {
      var f = state.floats[i];
      ctx.globalAlpha = Math.max(0, Math.min(1, f.life));
      ctx.fillStyle = 'rgba(20, 14, 4, 0.55)';
      ctx.fillText(f.text, f.x + 1.5, f.y + 1.5);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;
  }

  /* =========================================================
   * 主循环 / 手动时钟
   * ========================================================= */
  var lastTs = 0;
  var accumulator = 0;

  function frame(ts) {
    if (!lastTs) lastTs = ts;
    var dt = Math.min(0.1, (ts - lastTs) / 1000);
    lastTs = ts;
    if (!state.manualClock) {
      accumulator += dt;
      var guard = 0;
      while (accumulator >= FIXED_DT && guard < 24) {
        update(FIXED_DT);
        accumulator -= FIXED_DT;
        guard++;
      }
      if (guard >= 24) accumulator = 0;
    }
    draw();
    window.requestAnimationFrame(frame);
  }

  function manualStep(ms) {
    if (state.paused) return; // 暂停时不得推进
    var remain = Math.max(0, ms) / 1000;
    var guard = 0;
    while (remain > 1e-9 && guard < 12000) {
      var s = Math.min(FIXED_DT, remain);
      update(s);
      remain -= s;
      guard++;
    }
    draw();
  }

  /* =========================================================
   * 输入
   * ========================================================= */
  var pointer = { down: false, id: null };

  function canvasPos(clientX, clientY) {
    var rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) / rect.width * W,
      y: (clientY - rect.top) / rect.height * H
    };
  }

  function pointerDown(x, y) {
    if (state.paused || state.phase === 'menu') return;
    var p = state.proj;
    if ((state.phase === 'ready' || state.phase === 'aiming') && p && !p.launched) {
      var dx = x - p.x, dy = y - p.y;
      // 允许在弹丸附近较大范围按下,方便触屏
      if (dx * dx + dy * dy < 68 * 68) {
        pointer.down = true;
        setAim(x - SLING.x, y - SLING.y);
        return;
      }
    }
    if (state.phase === 'flying') {
      activateAbility();
    }
  }

  function pointerMove(x, y) {
    if (!pointer.down) return;
    if (state.phase !== 'aiming' && state.phase !== 'ready') { pointer.down = false; return; }
    var old = state.drag;
    setAim(x - SLING.x, y - SLING.y);
    if (old && state.drag) {
      var delta = Math.abs(state.drag.dx - old.dx) + Math.abs(state.drag.dy - old.dy);
      if (delta > 7) {
        var d = Math.sqrt(state.drag.dx * state.drag.dx + state.drag.dy * state.drag.dy);
        audio.sStretch(d / MAX_PULL);
      }
    }
  }

  function pointerUp() {
    if (!pointer.down) return;
    pointer.down = false;
    if (state.phase === 'aiming') launch();
  }

  canvas.addEventListener('mousedown', function (e) {
    e.preventDefault();
    var p = canvasPos(e.clientX, e.clientY);
    pointerDown(p.x, p.y);
  });
  window.addEventListener('mousemove', function (e) {
    if (!pointer.down) return;
    var p = canvasPos(e.clientX, e.clientY);
    pointerMove(p.x, p.y);
  });
  window.addEventListener('mouseup', function () { pointerUp(); });

  canvas.addEventListener('touchstart', function (e) {
    e.preventDefault();
    var t = e.changedTouches[0];
    pointer.id = t.identifier;
    var p = canvasPos(t.clientX, t.clientY);
    pointerDown(p.x, p.y);
  }, { passive: false });
  canvas.addEventListener('touchmove', function (e) {
    e.preventDefault();
    for (var i = 0; i < e.changedTouches.length; i++) {
      var t = e.changedTouches[i];
      if (t.identifier === pointer.id) {
        var p = canvasPos(t.clientX, t.clientY);
        pointerMove(p.x, p.y);
      }
    }
  }, { passive: false });
  window.addEventListener('touchend', function (e) {
    for (var i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === pointer.id) pointerUp();
    }
  }, { passive: false });

  window.addEventListener('keydown', function (e) {
    if (e.code === 'Space') {
      e.preventDefault();
      if (state.phase === 'flying' && !state.paused) activateAbility();
    } else if (e.code === 'KeyP' || e.code === 'Escape') {
      if (state.phase !== 'menu') togglePause();
    } else if (e.code === 'KeyR') {
      if (state.phase !== 'menu') restartLevel();
    } else if (e.code === 'KeyM') {
      toggleMute();
    }
  });

  window.addEventListener('blur', function () {
    if (state.phase !== 'menu' && state.phase !== 'won' && state.phase !== 'lost' && !state.paused) {
      setPaused(true);
    }
  });

  /* =========================================================
   * 控制流
   * ========================================================= */
  function startGame() {
    audio.ensure();
    state.score = 0;
    loadLevel(1);
  }

  function restartLevel() {
    state.score = state.levelStartScore;
    setPaused(false);
    loadLevel(state.level);
  }

  function nextLevel() {
    if (state.level < LEVELS.length) loadLevel(state.level + 1);
  }

  function backToMenu() {
    state.phase = 'menu';
    state.paused = false;
    state.score = 0;
    hideOverlays();
    el.hud.classList.add('hidden');
    showHint(null);
    updateBestLine();
    el.menu.classList.remove('hidden');
  }

  function setPaused(v) {
    if (state.phase === 'menu') return;
    state.paused = !!v;
    el.pausePanel.classList.toggle('hidden', !state.paused);
    updateHUD();
  }

  function togglePause() {
    if (state.phase === 'won' || state.phase === 'lost') return;
    setPaused(!state.paused);
    audio.sClick();
  }

  function toggleMute() {
    audio.muted = !audio.muted;
    updateHUD();
  }

  el.btnStart.addEventListener('click', function () { audio.sClick(); startGame(); });
  el.btnNext.addEventListener('click', function () { audio.sClick(); nextLevel(); });
  el.btnAgain.addEventListener('click', function () { audio.sClick(); restartLevel(); });
  el.btnMenuBack.addEventListener('click', function () { audio.sClick(); backToMenu(); });
  el.btnPause.addEventListener('click', function () { togglePause(); });
  el.btnResume.addEventListener('click', function () { audio.sClick(); setPaused(false); });
  el.btnPauseRetry.addEventListener('click', function () { audio.sClick(); restartLevel(); });
  el.btnRetry.addEventListener('click', function () { audio.sClick(); restartLevel(); });
  el.btnMute.addEventListener('click', function () { toggleMute(); });

  /* ---------------- 画布自适应 ---------------- */
  function fitStage() {
    var vw = window.innerWidth, vh = window.innerHeight;
    var scale = Math.min(vw / W, vh / H);
    var w = Math.floor(W * scale), h = Math.floor(H * scale);
    el.stage.style.width = w + 'px';
    el.stage.style.height = h + 'px';
  }
  window.addEventListener('resize', fitStage);
  window.addEventListener('orientationchange', fitStage);

  /* =========================================================
   * 测试接口
   * ========================================================= */
  window.__SLINGSHOT_TEST__ = {
    snapshot: function () {
      var p = state.proj;
      return {
        phase: state.paused ? 'paused' : state.phase,
        rawPhase: state.phase,
        paused: state.paused,
        level: state.level,
        score: state.score,
        shotsLeft: state.shotsLeft,
        bestScore: state.bestScore,
        unlocked: state.unlocked,
        simTime: Math.round(state.simTime * 1000) / 1000,
        projectile: p ? {
          x: Math.round(p.x * 100) / 100,
          y: Math.round(p.y * 100) / 100,
          vx: Math.round(p.vx * 100) / 100,
          vy: Math.round(p.vy * 100) / 100,
          launched: p.launched,
          resting: p.resting,
          abilityUsed: p.abilityUsed
        } : null,
        targets: state.guards.map(function (g) {
          return {
            id: g.id,
            x: Math.round(g.x * 100) / 100,
            y: Math.round(g.y * 100) / 100,
            r: g.r,
            hp: Math.round(g.hp * 100) / 100,
            dead: g.dead
          };
        }),
        blocks: state.blocks.map(function (b) {
          return {
            id: b.id,
            x: Math.round(b.x * 100) / 100,
            y: Math.round(b.y * 100) / 100,
            w: b.w,
            h: b.h,
            mat: b.mat,
            hp: b.hp === Infinity ? -1 : Math.round(b.hp * 100) / 100,
            static: b.static,
            dead: b.dead
          };
        })
      };
    },
    start: function () { startGame(); return true; },
    restart: function () { restartLevel(); return true; },
    loadLevel: function (n) {
      if (typeof n !== 'number' || n < 1 || n > LEVELS.length) return false;
      setPaused(false);
      loadLevel(n);
      return true;
    },
    pause: function () { setPaused(true); return state.paused; },
    resume: function () { setPaused(false); return !state.paused; },
    setManualClock: function (enabled) {
      state.manualClock = !!enabled;
      accumulator = 0;
      return state.manualClock;
    },
    step: function (ms) {
      manualStep(typeof ms === 'number' ? ms : 16);
      return this.snapshot();
    },
    aim: function (dx, dy) {
      if (typeof dx !== 'number' || typeof dy !== 'number') return false;
      return setAim(dx, dy);
    },
    launch: function () { return launch(); },
    activateAbility: function () { return activateAbility(); },
    forceHit: function (targetId) {
      for (var i = 0; i < state.guards.length; i++) {
        var g = state.guards[i];
        if (g.id === targetId && !g.dead) {
          damageGuard(g, 99999, true);
          return true;
        }
      }
      return false;
    },
    levelCount: LEVELS.length
  };

  /* ---------------- 启动 ---------------- */
  fitStage();
  updateBestLine();
  window.requestAnimationFrame(frame);
})();
