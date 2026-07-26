/* ============================================================
   Sling Siege / 弹弓攻城
   Original slingshot physics game — vanilla JS + Canvas + Web Audio
   ============================================================ */
(function () {
'use strict';

// ================== CONSTANTS ==================
var WORLD_W = 1280;
var WORLD_H = 720;
var GROUND_Y = 620;
var GRAVITY = 0.42;
var LAUNCH_POWER = 0.165;
var MAX_DRAG = 150;
var MIN_DRAG = 12;
var BOUNCE = 0.38;
var GROUND_FRICTION = 0.80;
var AIR_FRICTION = 0.9985;
var REST_VEL = 0.35;
var PROJ_R = 17;
var SETTLE_TIMEOUT = 2800;
var MAX_PARTICLES = 550;
var ABILITY_RADIUS = 155;
var ABILITY_BLOCK_DMG = 28;
var PHYSICS_STEP_MS = 1000 / 60;

var BLOCK_TYPES = {
  wood:   { health: 32,  density: 0.7,  color: '#9b7023', dark: '#6b4f12', light: '#bd8e36', name: 'wood' },
  stone:  { health: 65,  density: 1.4,  color: '#7a7a7a', dark: '#555',    light: '#9a9a9a', name: 'stone' }
};

var SLING_X = 180;
var SLING_Y = 455;
var SLING_FORK_L = 158;
var SLING_FORK_R = 202;
var SLING_FORK_TOP = 440;

// ================== LEVELS ==================
var LEVELS = [
  {
    name: '开阔地',
    subtitle: 'The Clearing',
    shots: 3,
    sky: { top: '#1e1438', mid: '#c84d28', bot: '#f0b048' },
    guards: [
      { x: 860,  y: 594, r: 26, health: 2 },
      { x: 1020, y: 594, r: 26, health: 2 }
    ],
    blocks: [
      { x: 760, y: 570, w: 28, h: 50, type: 'wood' }
    ]
  },
  {
    name: '哨塔',
    subtitle: 'The Watchtower',
    shots: 4,
    sky: { top: '#2a1545', mid: '#a03d28', bot: '#e89030' },
    guards: [
      { x: 820,  y: 594, r: 26, health: 2 },
      { x: 1040, y: 594, r: 26, health: 2 },
      { x: 910,  y: 466, r: 23, health: 2 }
    ],
    blocks: [
      { x: 850, y: 570, w: 38, h: 50, type: 'stone' },
      { x: 932, y: 570, w: 38, h: 50, type: 'stone' },
      { x: 850, y: 520, w: 38, h: 50, type: 'wood' },
      { x: 932, y: 520, w: 38, h: 50, type: 'wood' },
      { x: 840, y: 490, w: 140, h: 30, type: 'wood' }
    ]
  },
  {
    name: '石壁堡垒',
    subtitle: 'The Stone Fortress',
    shots: 5,
    sky: { top: '#1a0a2e', mid: '#7a2818', bot: '#c06020' },
    guards: [
      { x: 840,  y: 596, r: 23, health: 3 },
      { x: 980,  y: 596, r: 23, health: 3 },
      { x: 910,  y: 498, r: 21, health: 3 },
      { x: 940,  y: 408, r: 20, health: 3 }
    ],
    blocks: [
      { x: 780,  y: 540, w: 32, h: 80, type: 'stone' },
      { x: 780,  y: 460, w: 32, h: 80, type: 'stone' },
      { x: 1068, y: 540, w: 32, h: 80, type: 'stone' },
      { x: 1068, y: 460, w: 32, h: 80, type: 'stone' },
      { x: 780,  y: 430, w: 320, h: 30, type: 'wood' },
      { x: 870,  y: 520, w: 80,  h: 18, type: 'wood' },
      { x: 870,  y: 538, w: 14,  h: 62, type: 'wood' },
      { x: 936,  y: 538, w: 14,  h: 62, type: 'wood' }
    ]
  }
];

// ================== AUDIO ==================
function AudioManager() {
  this.ctx = null;
  this.muted = false;
}
AudioManager.prototype.init = function () {
  if (!this.ctx) {
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (AC) this.ctx = new AC();
    } catch (e) { /* no audio */ }
  }
  if (this.ctx && this.ctx.state === 'suspended') {
    try { this.ctx.resume(); } catch (e) {}
  }
};
AudioManager.prototype._tone = function (freq, dur, type, vol) {
  if (!this.ctx || this.muted) return;
  try {
    var osc = this.ctx.createOscillator();
    var gain = this.ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.value = freq;
    var t = this.ctx.currentTime;
    gain.gain.setValueAtTime(vol || 0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + dur);
  } catch (e) {}
};
AudioManager.prototype._noise = function (dur, vol, filterFreq) {
  if (!this.ctx || this.muted) return;
  try {
    var len = Math.floor(this.ctx.sampleRate * dur);
    var buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    var src = this.ctx.createBufferSource();
    src.buffer = buf;
    var gain = this.ctx.createGain();
    var filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq || 1000;
    var t = this.ctx.currentTime;
    gain.gain.setValueAtTime(vol || 0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    src.start(t);
    src.stop(t + dur);
  } catch (e) {}
};
AudioManager.prototype.launch = function () {
  if (!this.ctx || this.muted) return;
  try {
    var osc = this.ctx.createOscillator();
    var gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    var t = this.ctx.currentTime;
    osc.frequency.setValueAtTime(350, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.18);
    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    osc.connect(gain); gain.connect(this.ctx.destination);
    osc.start(t); osc.stop(t + 0.18);
  } catch (e) {}
};
AudioManager.prototype.impact = function () { this._noise(0.08, 0.28, 250); };
AudioManager.prototype.blockBreak = function () { this._noise(0.14, 0.22, 700); };
AudioManager.prototype.guardHit = function () { this._tone(700, 0.08, 'square', 0.12); };
AudioManager.prototype.guardDefeated = function () {
  this._tone(1100, 0.05, 'square', 0.14);
  var self = this;
  setTimeout(function () { self._tone(750, 0.08, 'square', 0.11); }, 40);
  setTimeout(function () { self._tone(380, 0.12, 'square', 0.09); }, 80);
};
AudioManager.prototype.ability = function () {
  this._noise(0.25, 0.35, 180);
  this._tone(70, 0.25, 'sine', 0.3);
};
AudioManager.prototype.victory = function () {
  var notes = [523, 659, 784, 1047];
  var self = this;
  for (var i = 0; i < notes.length; i++) {
    (function (n, d) { setTimeout(function () { self._tone(n, 0.18, 'triangle', 0.18); }, d); })(notes[i], i * 90);
  }
};
AudioManager.prototype.defeat = function () {
  var notes = [380, 280, 180];
  var self = this;
  for (var i = 0; i < notes.length; i++) {
    (function (n, d) { setTimeout(function () { self._tone(n, 0.25, 'sawtooth', 0.13); }, d); })(notes[i], i * 130);
  }
};
AudioManager.prototype.click = function () { this._tone(600, 0.04, 'square', 0.08); };
AudioManager.prototype.transition = function () { this._tone(440, 0.1, 'triangle', 0.12); };

// ================== PARTICLES ==================
function spawnParticles(game, x, y, count, opts) {
  opts = opts || {};
  var color = opts.color || '#ffaa44';
  var speed = opts.speed || 4;
  var life = opts.life || 600;
  var size = opts.size || 4;
  var gravity = opts.gravity !== undefined ? opts.gravity : 0.15;
  for (var i = 0; i < count; i++) {
    if (game.particles.length >= MAX_PARTICLES) game.particles.shift();
    var ang = Math.random() * Math.PI * 2;
    var sp = speed * (0.3 + Math.random() * 0.7);
    game.particles.push({
      x: x, y: y,
      vx: Math.cos(ang) * sp,
      vy: Math.sin(ang) * sp - speed * 0.3,
      life: life * (0.6 + Math.random() * 0.4),
      maxLife: life,
      color: color,
      size: size * (0.5 + Math.random() * 0.8),
      gravity: gravity,
      rot: Math.random() * Math.PI * 2,
      vrot: (Math.random() - 0.5) * 0.2,
      type: opts.type || 'spark'
    });
  }
}

function updateParticles(game, dt) {
  var stepRatio = dt / PHYSICS_STEP_MS;
  var alive = [];
  for (var i = 0; i < game.particles.length; i++) {
    var p = game.particles[i];
    p.life -= dt;
    if (p.life <= 0) continue;
    p.vy += p.gravity * stepRatio;
    p.x += p.vx * stepRatio;
    p.y += p.vy * stepRatio;
    p.rot += p.vrot * stepRatio;
    p.vx *= 0.995;
    alive.push(p);
  }
  game.particles = alive;
}

function drawParticles(ctx, game) {
  for (var i = 0; i < game.particles.length; i++) {
    var p = game.particles[i];
    var alpha = Math.max(0, p.life / p.maxLife);
    ctx.globalAlpha = alpha;
    if (p.type === 'shard') {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size, -p.size * 0.5, p.size * 2, p.size);
      ctx.restore();
    } else if (p.type === 'ring') {
      ctx.strokeStyle = p.color;
      ctx.lineWidth = Math.max(1, p.size * alpha);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(0.5, p.size * alpha), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

// ================== UTILITY ==================
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function dist2(x1, y1, x2, y2) { var dx = x1 - x2, dy = y1 - y2; return dx * dx + dy * dy; }

function circleVsRect(cx, cy, cr, rx, ry, rw, rh) {
  var closestX = clamp(cx, rx, rx + rw);
  var closestY = clamp(cy, ry, ry + rh);
  var dx = cx - closestX;
  var dy = cy - closestY;
  var d2 = dx * dx + dy * dy;
  if (d2 < cr * cr) {
    var d = Math.sqrt(d2) || 0.01;
    return { hit: true, nx: dx / d, ny: dy / d, overlap: cr - d, cx: closestX, cy: closestY };
  }
  return { hit: false };
}

// ================== GAME ==================
function Game() {
  this.canvas = document.getElementById('game-canvas');
  this.ctx = this.canvas.getContext('2d');
  this.audio = new AudioManager();
  this.phase = 'menu'; // menu, aiming, flying, settling, win, lose, paused, transition, complete
  this.level = 1;
  this.score = 0;
  this.levelScore = 0;
  this.shotsLeft = 0;
  this.blocks = [];
  this.guards = [];
  this.projectile = { active: false, x: SLING_X, y: SLING_Y, vx: 0, vy: 0, r: PROJ_R, abilityUsed: false, trail: [], resting: false, restCount: 0, flyTime: 0 };
  this.dragging = false;
  this.dragX = SLING_X;
  this.dragY = SLING_Y;
  this.trajectory = [];
  this.particles = [];
  this.floatingTexts = [];
  this.shakeIntensity = 0;
  this.shakeDuration = 0;
  this.paused = false;
  this.manualClock = false;
  this.accumulator = 0;
  this.lastTime = 0;
  this.bgTime = 0;
  this.abilityEffects = [];
  this.highScore = 0;
  this.maxLevel = 1;
  this.transitionTimer = 0;
  this.settleTimer = 0;
  this._bindEvents();
  this._loadState();
  this._updateUI();
  this._showOverlay('title-screen');
  this._updateHighScoreDisplay();
  this.loop = this.loop.bind(this);
  requestAnimationFrame(this.loop);
}

// ---- Event Binding ----
Game.prototype._bindEvents = function () {
  var self = this;
  var canvas = this.canvas;

  // Pointer helpers
  function getPos(e) {
    var rect = canvas.getBoundingClientRect();
    var sx = WORLD_W / rect.width;
    var sy = WORLD_H / rect.height;
    var cx, cy;
    if (e.touches && e.touches.length > 0) {
      cx = e.touches[0].clientX; cy = e.touches[0].clientY;
    } else if (e.changedTouches && e.changedTouches.length > 0) {
      cx = e.changedTouches[0].clientX; cy = e.changedTouches[0].clientY;
    } else {
      cx = e.clientX; cy = e.clientY;
    }
    return { x: (cx - rect.left) * sx, y: (cy - rect.top) * sy };
  }

  function onDown(e) {
    self.audio.init();
    if (self.phase !== 'aiming') return;
    var pos = getPos(e);
    var dx = pos.x - SLING_X;
    var dy = pos.y - SLING_Y;
    if (dx * dx + dy * dy < 100 * 100) {
      self.dragging = true;
      self._updateDrag(pos.x, pos.y);
      e.preventDefault();
    }
  }
  function onMove(e) {
    if (!self.dragging) return;
    var pos = getPos(e);
    self._updateDrag(pos.x, pos.y);
    e.preventDefault();
  }
  function onUp(e) {
    if (!self.dragging) return;
    self.dragging = false;
    self._tryLaunch();
    e.preventDefault();
  }

  canvas.addEventListener('mousedown', onDown);
  canvas.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
  canvas.addEventListener('touchstart', onDown, { passive: false });
  canvas.addEventListener('touchmove', onMove, { passive: false });
  canvas.addEventListener('touchend', onUp, { passive: false });

  // Keyboard
  window.addEventListener('keydown', function (e) {
    if (e.code === 'Space' || e.key === ' ') {
      e.preventDefault();
      if (self.phase === 'flying') self.activateAbility();
    }
    if (e.key === 'p' || e.key === 'P') {
      if (self.phase === 'aiming' || self.phase === 'flying' || self.phase === 'settling') self.pause();
      else if (self.phase === 'paused') self.resume();
    }
  });

  // Click on canvas (for ability during flight)
  canvas.addEventListener('click', function () {
    self.audio.init();
    if (self.phase === 'flying') self.activateAbility();
  });

  // Button bindings
  this._btn('start-btn', function () { self.audio.init(); self.audio.click(); self.start(); });
  this._btn('pause-btn', function () { self.audio.click(); if (self.phase === 'paused') self.resume(); else self.pause(); });
  this._btn('restart-btn', function () { self.audio.click(); self.restart(); });
  this._btn('mute-btn', function () {
    self.audio.muted = !self.audio.muted;
    var btn = document.getElementById('mute-btn');
    btn.innerHTML = self.audio.muted ? '&#x2205;' : '&#x266B;';
    btn.title = self.audio.muted ? '取消静音' : '静音';
  });
  this._btn('resume-btn', function () { self.audio.click(); self.resume(); });
  this._btn('restart-pause-btn', function () { self.audio.click(); self.resume(); self.restart(); });
  this._btn('next-level-btn', function () { self.audio.click(); self._nextLevel(); });
  this._btn('replay-win-btn', function () { self.audio.click(); self.restart(); });
  this._btn('retry-btn', function () { self.audio.click(); self.restart(); });
  this._btn('restart-game-btn', function () { self.audio.click(); self.start(); });
  this._btn('restart-all-btn', function () { self.audio.click(); self.start(); });

  // Resize
  window.addEventListener('resize', function () { self._resizeCanvas(); });
  this._resizeCanvas();
};

Game.prototype._btn = function (id, fn) {
  var el = document.getElementById(id);
  if (el) el.addEventListener('click', fn);
};

Game.prototype._resizeCanvas = function () {
  var container = document.getElementById('game-container');
  var cw = container.clientWidth;
  var ch = container.clientHeight;
  var ratio = WORLD_W / WORLD_H;
  var w, h;
  if (cw / ch > ratio) { h = ch; w = h * ratio; }
  else { w = cw; h = w / ratio; }
  this.canvas.style.width = w + 'px';
  this.canvas.style.height = h + 'px';
};

// ---- Drag ----
Game.prototype._updateDrag = function (px, py) {
  var dx = px - SLING_X;
  var dy = py - SLING_Y;
  var d = Math.sqrt(dx * dx + dy * dy);
  if (d > MAX_DRAG) {
    dx = (dx / d) * MAX_DRAG;
    dy = (dy / d) * MAX_DRAG;
  }
  this.dragX = SLING_X + dx;
  this.dragY = SLING_Y + dy;
  this.projectile.x = this.dragX;
  this.projectile.y = this.dragY;
  this._calcTrajectory();
};

Game.prototype._calcTrajectory = function () {
  var pts = [];
  var x = this.projectile.x, y = this.projectile.y;
  var vx = (SLING_X - this.dragX) * LAUNCH_POWER;
  var vy = (SLING_Y - this.dragY) * LAUNCH_POWER;
  for (var i = 0; i < 90; i++) {
    vy += GRAVITY;
    x += vx;
    y += vy;
    if (i % 3 === 0) pts.push({ x: x, y: y, a: Math.max(0, 1 - i / 90) });
    if (y > GROUND_Y - 5 || x > WORLD_W || x < 0) break;
  }
  this.trajectory = pts;
};

Game.prototype._tryLaunch = function () {
  var dx = SLING_X - this.dragX;
  var dy = SLING_Y - this.dragY;
  var d = Math.sqrt(dx * dx + dy * dy);
  if (d < MIN_DRAG) {
    this.projectile.x = SLING_X;
    this.projectile.y = SLING_Y;
    this.trajectory = [];
    return;
  }
  this._doLaunch(dx, dy);
};

Game.prototype._doLaunch = function (dx, dy) {
  this.projectile.vx = dx * LAUNCH_POWER;
  this.projectile.vy = dy * LAUNCH_POWER;
  this.projectile.active = true;
  this.projectile.abilityUsed = false;
  this.projectile.trail = [];
  this.projectile.resting = false;
  this.projectile.restCount = 0;
  this.projectile.flyTime = 0;
  this.phase = 'flying';
  this.shotsLeft--;
  this.trajectory = [];
  this.audio.launch();
  this._shake(3, 80);
  this._updateUI();
  this._showAbilityHint();
};

// ---- Ability ----
Game.prototype.activateAbility = function () {
  if (this.phase !== 'flying' || !this.projectile.active || this.projectile.abilityUsed) return;
  this.projectile.abilityUsed = true;
  this._hideAbilityHint();

  var px = this.projectile.x;
  var py = this.projectile.y;

  // Damage guards
  for (var i = 0; i < this.guards.length; i++) {
    var g = this.guards[i];
    if (!g.alive) continue;
    var ddx = g.x - px, ddy = g.y - py;
    var dd = Math.sqrt(ddx * ddx + ddy * ddy);
    if (dd < ABILITY_RADIUS) {
      this._damageGuard(g, 1);
      var f = (1 - dd / ABILITY_RADIUS) * 7;
      if (dd > 0.1) { g.vx += (ddx / dd) * f; g.vy += (ddy / dd) * f; }
    }
  }

  // Damage/push blocks
  for (var j = 0; j < this.blocks.length; j++) {
    var b = this.blocks[j];
    if (b.destroyed) continue;
    var bx = b.x + b.w / 2, by = b.y + b.h / 2;
    var bdx = bx - px, bdy = by - py;
    var bd = Math.sqrt(bdx * bdx + bdy * bdy);
    if (bd < ABILITY_RADIUS) {
      this._damageBlock(b, ABILITY_BLOCK_DMG, bx, by);
      var bf = (1 - bd / ABILITY_RADIUS) * 5;
      if (bd > 0.1) { b.vx += (bdx / bd) * bf; b.vy += (bdy / bd) * bf; }
    }
  }

  // Visual
  this.abilityEffects.push({ x: px, y: py, r: 10, maxR: ABILITY_RADIUS, life: 400, maxLife: 400 });
  spawnParticles(this, px, py, 35, { color: '#ffcc44', speed: 8, life: 500, size: 5, gravity: 0.05, type: 'spark' });
  spawnParticles(this, px, py, 15, { color: '#ff6622', speed: 3, life: 700, size: 8, gravity: 0.02, type: 'spark' });
  this._shake(14, 280);
  this.audio.ability();

  // Boost projectile
  var sp = Math.sqrt(this.projectile.vx * this.projectile.vx + this.projectile.vy * this.projectile.vy);
  if (sp > 0.1) {
    this.projectile.vx *= 1.25;
    this.projectile.vy *= 1.25;
  }
};

// ---- Damage ----
Game.prototype._damageGuard = function (g, amount) {
  if (!g.alive) return;
  g.health -= amount;
  if (g.health <= 0) {
    g.alive = false;
    g.health = 0;
    this.score += 500;
    this.levelScore += 500;
    this._floatText(g.x, g.y - 30, '+500', '#ffdd44');
    spawnParticles(this, g.x, g.y, 20, { color: '#88ff88', speed: 5, life: 500, size: 4, gravity: 0.2, type: 'shard' });
    spawnParticles(this, g.x, g.y, 10, { color: '#44aaff', speed: 3, life: 600, size: 5, gravity: 0.1, type: 'spark' });
    this.audio.guardDefeated();
    this._shake(6, 180);
    this._updateUI();
  } else {
    spawnParticles(this, g.x, g.y, 8, { color: '#ff8844', speed: 4, life: 300, size: 3, gravity: 0.15, type: 'spark' });
    this.audio.guardHit();
    this._updateUI();
  }
};

Game.prototype._damageBlock = function (b, amount, hx, hy) {
  if (b.destroyed) return;
  b.health -= amount;
  if (b.health <= 0) {
    b.destroyed = true;
    this.score += 100;
    this.levelScore += 100;
    var cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    this._floatText(cx, cy - 15, '+100', '#ddbb44');
    var c = BLOCK_TYPES[b.type].color;
    spawnParticles(this, cx, cy, 15, { color: c, speed: 5, life: 500, size: 5, gravity: 0.25, type: 'shard' });
    this.audio.blockBreak();
    this._updateUI();
  } else if (hx !== undefined) {
    spawnParticles(this, hx, hy, 5, { color: BLOCK_TYPES[b.type].dark, speed: 3, life: 200, size: 2, gravity: 0.2, type: 'spark' });
  }
};

// ---- Floating Text ----
Game.prototype._floatText = function (x, y, text, color) {
  this.floatingTexts.push({ x: x, y: y, text: text, color: color, life: 1000, maxLife: 1000, vy: -0.8 });
};

// ---- Shake ----
Game.prototype._shake = function (intensity, duration) {
  this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
  this.shakeDuration = Math.max(this.shakeDuration, duration);
};

// ---- State Management ----
Game.prototype.start = function () {
  this.level = 1;
  this.score = 0;
  this.levelScore = 0;
  this._hideAllOverlays();
  this._loadLevel(1);
};

Game.prototype.restart = function () {
  this._hideAllOverlays();
  this.score -= this.levelScore;
  this.levelScore = 0;
  this._loadLevel(this.level);
};

Game.prototype._nextLevel = function () {
  this._hideAllOverlays();
  if (this.level >= LEVELS.length) {
    this._saveState();
    this.phase = 'complete';
    document.getElementById('complete-score').textContent = '最终分数: ' + this.score;
    this._showOverlay('complete-screen');
    return;
  }
  this.level++;
  this.levelScore = 0;
  this._loadLevel(this.level);
};

Game.prototype.loadLevel = function (n) {
  if (n < 1 || n > LEVELS.length) return;
  this._hideAllOverlays();
  this.level = n;
  this.levelScore = 0;
  this._loadLevel(n);
};

Game.prototype._loadLevel = function (n) {
  var data = LEVELS[n - 1];
  this.level = n;
  this.shotsLeft = data.shots;
  this.levelScore = 0;
  this.blocks = [];
  this.guards = [];
  this.particles = [];
  this.floatingTexts = [];
  this.abilityEffects = [];
  this.projectile = { active: false, x: SLING_X, y: SLING_Y, vx: 0, vy: 0, r: PROJ_R, abilityUsed: false, trail: [], resting: false, restCount: 0, flyTime: 0 };
  this.dragging = false;
  this.dragX = SLING_X;
  this.dragY = SLING_Y;
  this.trajectory = [];
  this.settleTimer = 0;

  for (var i = 0; i < data.blocks.length; i++) {
    var b = data.blocks[i];
    var bt = BLOCK_TYPES[b.type];
    this.blocks.push({
      id: i, x: b.x, y: b.y, w: b.w, h: b.h, type: b.type,
      vx: 0, vy: 0,
      health: bt.health, maxHealth: bt.health,
      density: bt.density, destroyed: false
    });
  }
  for (var j = 0; j < data.guards.length; j++) {
    var g = data.guards[j];
    this.guards.push({
      id: j, x: g.x, y: g.y, r: g.r, vx: 0, vy: 0,
      health: g.health, maxHealth: g.health, alive: true
    });
  }

  // Transition
  this.phase = 'transition';
  this.transitionTimer = 1400;
  document.getElementById('transition-level').textContent = '第 ' + n + ' 关';
  document.getElementById('transition-name').textContent = data.name + ' · ' + data.subtitle;
  this._showOverlay('transition-screen');
  this.audio.transition();
  this._updateUI();
  this._saveState();
};

Game.prototype.pause = function () {
  if (this.phase === 'paused' || this.phase === 'menu' || this.phase === 'win' || this.phase === 'lose' || this.phase === 'complete') return;
  this._prevPhase = this.phase;
  this.phase = 'paused';
  this.paused = true;
  this._showOverlay('pause-screen');
};

Game.prototype.resume = function () {
  if (this.phase !== 'paused') return;
  this._hideAllOverlays();
  this.phase = this._prevPhase || 'aiming';
  this.paused = false;
};

Game.prototype.setManualClock = function (enabled) {
  this.manualClock = !!enabled;
};

Game.prototype.step = function (ms) {
  if (this.paused || !this.manualClock) return;
  if (this.phase === 'paused' || this.phase === 'menu' || this.phase === 'win' || this.phase === 'lose' || this.phase === 'complete') return;
  this.update(ms);
};

// ---- Update ----
Game.prototype.update = function (dt) {
  this.bgTime += dt;

  // Transition
  if (this.phase === 'transition') {
    this.transitionTimer -= dt;
    if (this.transitionTimer <= 0) {
      this._hideAllOverlays();
      this.phase = 'aiming';
    }
    return;
  }

  // Physics
  if (this.phase === 'flying' || this.phase === 'settling') {
    this.accumulator += dt;
    var steps = 0;
    while (this.accumulator >= PHYSICS_STEP_MS && steps < 6) {
      this._physicsStep();
      this.accumulator -= PHYSICS_STEP_MS;
      steps++;
    }
    if (this.phase === 'flying') this._checkProjectileEnd();
    if (this.phase === 'settling') this._checkSettled(dt);
  }

  // Aiming drag update
  if (this.phase === 'aiming' && this.dragging) {
    // trajectory already calculated in _updateDrag
  }

  updateParticles(this, dt);

  // Ability effects
  for (var i = this.abilityEffects.length - 1; i >= 0; i--) {
    var ae = this.abilityEffects[i];
    ae.life -= dt;
    ae.r = ae.maxR * (1 - ae.life / ae.maxLife);
    if (ae.life <= 0) this.abilityEffects.splice(i, 1);
  }

  // Floating texts
  for (var j = this.floatingTexts.length - 1; j >= 0; j--) {
    var ft = this.floatingTexts[j];
    ft.life -= dt;
    ft.y += ft.vy * (dt / PHYSICS_STEP_MS);
    if (ft.life <= 0) this.floatingTexts.splice(j, 1);
  }

  // Shake
  if (this.shakeDuration > 0) {
    this.shakeDuration -= dt;
    if (this.shakeDuration <= 0) { this.shakeIntensity = 0; this.shakeDuration = 0; }
  }
};

// ---- Physics Step ----
Game.prototype._physicsStep = function () {
  // Projectile
  if (this.projectile.active && this.phase === 'flying') {
    var p = this.projectile;
    p.vy += GRAVITY;
    p.vx *= AIR_FRICTION;
    p.vy *= AIR_FRICTION;
    p.x += p.vx;
    p.y += p.vy;
    p.flyTime += PHYSICS_STEP_MS;

    // Trail
    p.trail.unshift({ x: p.x, y: p.y });
    if (p.trail.length > 14) p.trail.pop();

    // Ground collision
    if (p.y + p.r > GROUND_Y) {
      p.y = GROUND_Y - p.r;
      if (p.vy > 0) {
        var impactSp = Math.abs(p.vy);
        p.vy = -p.vy * BOUNCE;
        p.vx *= GROUND_FRICTION;
        spawnParticles(this, p.x, GROUND_Y, 6, { color: '#aa8844', speed: 3, life: 300, size: 3, gravity: 0.2, type: 'spark' });
        this.audio.impact();
        this._shake(2, 50);
        if (impactSp < 3 && Math.abs(p.vx) < 1.5) {
          p.resting = true;
        }
      }
    }

    // Block collisions
    for (var i = 0; i < this.blocks.length; i++) {
      var b = this.blocks[i];
      if (b.destroyed) continue;
      var col = circleVsRect(p.x, p.y, p.r, b.x, b.y, b.w, b.h);
      if (col.hit) {
        var speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        // Resolve overlap
        p.x += col.nx * col.overlap;
        p.y += col.ny * col.overlap;
        // Reflect velocity
        var dot = p.vx * col.nx + p.vy * col.ny;
        if (dot < 0) {
          p.vx -= (1 + BOUNCE) * dot * col.nx;
          p.vy -= (1 + BOUNCE) * dot * col.ny;
        }
        // Transfer momentum to block
        var massRatio = 1 / (1 + b.density * (b.w * b.h) * 0.001);
        b.vx += -col.nx * speed * massRatio * 0.6;
        b.vy += -col.ny * speed * massRatio * 0.6;
        // Damage
        var dmg = speed * (b.type === 'stone' ? 1.0 : 1.8);
        this._damageBlock(b, dmg, col.cx, col.cy);
        spawnParticles(this, col.cx, col.cy, 6, { color: '#ffaa44', speed: 4, life: 250, size: 3, gravity: 0.15, type: 'spark' });
        this.audio.impact();
        this._shake(speed > 15 ? 5 : 2, 80);
      }
    }

    // Guard collisions
    for (var j = 0; j < this.guards.length; j++) {
      var g = this.guards[j];
      if (!g.alive) continue;
      var dx = p.x - g.x, dy = p.y - g.y;
      var dd = Math.sqrt(dx * dx + dy * dy);
      var rSum = p.r + g.r;
      if (dd < rSum) {
        var nx = dd > 0.01 ? dx / dd : 1, ny = dd > 0.01 ? dy / dd : 0;
        var ov = rSum - dd;
        p.x += nx * ov * 0.5;
        p.y += ny * ov * 0.5;
        g.x -= nx * ov * 0.5;
        g.y -= ny * ov * 0.5;
        var sp2 = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        var dot2 = p.vx * nx + p.vy * ny;
        if (dot2 < 0) {
          p.vx -= (1 + BOUNCE) * dot2 * nx;
          p.vy -= (1 + BOUNCE) * dot2 * ny;
        }
        g.vx += -nx * sp2 * 0.3;
        g.vy += -ny * sp2 * 0.3;
        if (sp2 > 4) {
          this._damageGuard(g, 1);
        }
        spawnParticles(this, p.x, p.y, 5, { color: '#ff8844', speed: 3, life: 200, size: 2, gravity: 0.1, type: 'spark' });
        this._shake(3, 60);
      }
    }

    // Off-screen
    if (p.x > WORLD_W + 80 || p.x < -80 || p.y > WORLD_H + 80) {
      p.active = false;
    }
    // Resting
    if (p.resting || (Math.abs(p.vx) < 0.4 && Math.abs(p.vy) < 0.4 && p.y + p.r >= GROUND_Y - 2)) {
      p.restCount = (p.restCount || 0) + 1;
      if (p.restCount > 20) p.active = false;
    } else {
      p.restCount = 0;
    }
    // Timeout
    if (p.flyTime > 12000) p.active = false;
  }

  // Blocks physics
  for (var bi = 0; bi < this.blocks.length; bi++) {
    var blk = this.blocks[bi];
    if (blk.destroyed) continue;
    blk.vy += GRAVITY;
    blk.vx *= AIR_FRICTION;
    blk.vy *= AIR_FRICTION;
    blk.x += blk.vx;
    blk.y += blk.vy;
  }

  // Block-block collision (3 passes)
  for (var pass = 0; pass < 3; pass++) {
    for (var a = 0; a < this.blocks.length; a++) {
      var ba = this.blocks[a];
      if (ba.destroyed) continue;
      for (var c = a + 1; c < this.blocks.length; c++) {
        var bb = this.blocks[c];
        if (bb.destroyed) continue;
        var ox = Math.min(ba.x + ba.w, bb.x + bb.w) - Math.max(ba.x, bb.x);
        var oy = Math.min(ba.y + ba.h, bb.y + bb.h) - Math.max(ba.y, bb.y);
        if (ox > 0 && oy > 0) {
          var ma = ba.density * ba.w * ba.h;
          var mb = bb.density * bb.w * bb.h;
          var total = ma + mb;
          if (ox < oy) {
            var push = ox / 2;
            if (ba.x < bb.x) { ba.x -= push; bb.x += push; } else { ba.x += push; bb.x -= push; }
            var rvx = ba.vx - bb.vx;
            if (rvx > 0) { ba.vx *= 0.5; bb.vx *= 0.5; }
          } else {
            var push2 = oy / 2;
            if (ba.y < bb.y) { ba.y -= push2; bb.y += push2; } else { ba.y += push2; bb.y -= push2; }
            var rvy = ba.vy - bb.vy;
            if (rvy > 0 && ba.y < bb.y) { ba.vy = 0; bb.vy *= 0.5; }
            else if (rvy < 0 && ba.y > bb.y) { bb.vy = 0; ba.vy *= 0.5; }
          }
        }
      }
    }
  }

  // Block-ground collision
  for (var gi = 0; gi < this.blocks.length; gi++) {
    var blk2 = this.blocks[gi];
    if (blk2.destroyed) continue;
    if (blk2.y + blk2.h > GROUND_Y) {
      blk2.y = GROUND_Y - blk2.h;
      if (blk2.vy > 0) {
        var bSp = Math.abs(blk2.vy);
        blk2.vy = 0;
        blk2.vx *= GROUND_FRICTION;
        if (bSp > 5) {
          spawnParticles(this, blk2.x + blk2.w / 2, GROUND_Y, 3, { color: '#8b6914', speed: 2, life: 200, size: 2, gravity: 0.2, type: 'spark' });
        }
      }
    }
    if (Math.abs(blk2.vx) < REST_VEL && Math.abs(blk2.vy) < REST_VEL && blk2.y + blk2.h >= GROUND_Y - 1) {
      blk2.vx = 0; blk2.vy = 0;
    }
  }

  // Guard physics
  for (var gi2 = 0; gi2 < this.guards.length; gi2++) {
    var gd = this.guards[gi2];
    if (!gd.alive) continue;
    gd.vy += GRAVITY;
    gd.vx *= AIR_FRICTION;
    gd.vy *= AIR_FRICTION;
    gd.x += gd.vx;
    gd.y += gd.vy;

    // Guard-ground
    if (gd.y + gd.r > GROUND_Y) {
      gd.y = GROUND_Y - gd.r;
      if (gd.vy > 0) gd.vy = 0;
      gd.vx *= GROUND_FRICTION;
    }

    // Guard-block collision
    for (var bi2 = 0; bi2 < this.blocks.length; bi2++) {
      var blk3 = this.blocks[bi2];
      if (blk3.destroyed) continue;
      var gcol = circleVsRect(gd.x, gd.y, gd.r, blk3.x, blk3.y, blk3.w, blk3.h);
      if (gcol.hit) {
        gd.x += gcol.nx * gcol.overlap;
        gd.y += gcol.ny * gcol.overlap;
        var gdot = gd.vx * gcol.nx + gd.vy * gcol.ny;
        if (gdot < 0) {
          gd.vx -= (1 + 0.2) * gdot * gcol.nx;
          gd.vy -= (1 + 0.2) * gdot * gcol.ny;
        }
        // Block damages guard if moving fast
        var bSpeed = Math.sqrt(blk3.vx * blk3.vx + blk3.vy * blk3.vy);
        if (bSpeed > 6) {
          this._damageGuard(gd, 1);
        }
      }
    }

    if (Math.abs(gd.vx) < REST_VEL && Math.abs(gd.vy) < REST_VEL && gd.y + gd.r >= GROUND_Y - 1) {
      gd.vx = 0; gd.vy = 0;
    }
  }
};

// ---- Check End ----
Game.prototype._checkProjectileEnd = function () {
  if (this.projectile.active) return;
  this.phase = 'settling';
  this.settleTimer = 0;
};

Game.prototype._checkSettled = function (dt) {
  this.settleTimer += dt;
  var allRest = true;
  for (var i = 0; i < this.blocks.length; i++) {
    var b = this.blocks[i];
    if (b.destroyed) continue;
    if (Math.abs(b.vx) > 0.5 || Math.abs(b.vy) > 0.5) { allRest = false; break; }
  }
  if (allRest) {
    for (var j = 0; j < this.guards.length; j++) {
      var g = this.guards[j];
      if (!g.alive) continue;
      if (Math.abs(g.vx) > 0.5 || Math.abs(g.vy) > 0.5) { allRest = false; break; }
    }
  }
  if (allRest || this.settleTimer > SETTLE_TIMEOUT) {
    this._endTurn();
  }
};

Game.prototype._endTurn = function () {
  this.projectile.active = false;
  this.projectile.x = SLING_X;
  this.projectile.y = SLING_Y;
  this.projectile.vx = 0;
  this.projectile.vy = 0;
  this.projectile.trail = [];
  this.projectile.abilityUsed = false;
  this._hideAbilityHint();

  // Check win/lose
  var alive = 0;
  for (var i = 0; i < this.guards.length; i++) {
    if (this.guards[i].alive) alive++;
  }
  if (alive === 0) {
    this.phase = 'win';
    this.score += this.shotsLeft * 200;
    this.levelScore += this.shotsLeft * 200;
    this._saveState();
    document.getElementById('win-score').textContent = '得分: ' + this.levelScore + (this.shotsLeft > 0 ? ' (剩余弹药 +' + this.shotsLeft * 200 + ')' : '');
    if (this.level >= LEVELS.length) {
      document.getElementById('next-level-btn').textContent = '全线攻克';
    } else {
      document.getElementById('next-level-btn').textContent = '下一关';
    }
    this._showOverlay('win-screen');
    this.audio.victory();
    this._updateUI();
    return;
  }
  if (this.shotsLeft <= 0) {
    this.phase = 'lose';
    document.getElementById('lose-score').textContent = '得分: ' + this.score;
    this._showOverlay('lose-screen');
    this.audio.defeat();
    return;
  }
  this.phase = 'aiming';
  this._updateUI();
};

// ---- forceHit ----
Game.prototype.forceHit = function (targetId) {
  for (var i = 0; i < this.guards.length; i++) {
    if (this.guards[i].id === targetId && this.guards[i].alive) {
      this._damageGuard(this.guards[i], 999);
      // Check immediate win
      var alive = 0;
      for (var j = 0; j < this.guards.length; j++) { if (this.guards[j].alive) alive++; }
      if (alive === 0 && (this.phase === 'aiming' || this.phase === 'flying' || this.phase === 'settling')) {
        if (this.phase === 'flying' || this.phase === 'settling') {
          this.projectile.active = false;
        }
        this._endTurn();
      }
      return;
    }
  }
};

// ---- Test interface helpers ----
Game.prototype.aim = function (dx, dy) {
  if (this.phase !== 'aiming') return;
  this.dragging = true;
  this._updateDrag(SLING_X + dx, SLING_Y + dy);
};

Game.prototype.launch = function () {
  if (this.phase !== 'aiming' || !this.dragging) return;
  this.dragging = false;
  this._tryLaunch();
};

// ---- Snapshot ----
Game.prototype.snapshot = function () {
  var p = this.projectile;
  return {
    phase: this.phase,
    level: this.level,
    score: this.score,
    shotsLeft: this.shotsLeft,
    projectile: {
      active: p.active,
      x: Math.round(p.x * 100) / 100,
      y: Math.round(p.y * 100) / 100,
      vx: Math.round(p.vx * 100) / 100,
      vy: Math.round(p.vy * 100) / 100,
      abilityUsed: p.abilityUsed
    },
    targets: this.guards.map(function (g) {
      return {
        id: g.id,
        x: Math.round(g.x * 100) / 100,
        y: Math.round(g.y * 100) / 100,
        health: g.health,
        maxHealth: g.maxHealth,
        alive: g.alive,
        r: g.r
      };
    }),
    blocks: this.blocks.filter(function (b) { return !b.destroyed; }).map(function (b) {
      return {
        id: b.id,
        x: Math.round(b.x * 100) / 100,
        y: Math.round(b.y * 100) / 100,
        w: b.w,
        h: b.h,
        type: b.type,
        health: Math.round(b.health * 100) / 100,
        maxHealth: b.maxHealth
      };
    })
  };
};

// ---- localStorage ----
Game.prototype._saveState = function () {
  try {
    if (this.score > this.highScore) this.highScore = this.score;
    if (this.level > this.maxLevel) this.maxLevel = this.level;
    localStorage.setItem('slingsiege_highscore', String(this.highScore));
    localStorage.setItem('slingsiege_maxlevel', String(this.maxLevel));
  } catch (e) {}
};

Game.prototype._loadState = function () {
  try {
    var hs = localStorage.getItem('slingsiege_highscore');
    var ml = localStorage.getItem('slingsiege_maxlevel');
    this.highScore = hs ? parseInt(hs, 10) || 0 : 0;
    this.maxLevel = ml ? parseInt(ml, 10) || 1 : 1;
  } catch (e) {
    this.highScore = 0;
    this.maxLevel = 1;
  }
};

Game.prototype._updateHighScoreDisplay = function () {
  var el = document.getElementById('high-score-display');
  if (el) {
    el.textContent = this.highScore > 0 ? '最高分: ' + this.highScore : '';
  }
};

// ---- UI ----
Game.prototype._updateUI = function () {
  document.getElementById('level-display').textContent = this.level;
  document.getElementById('score-display').textContent = this.score;
  document.getElementById('ammo-display').textContent = this.shotsLeft;
  var hud = document.getElementById('hud');
  if (this.phase === 'menu') {
    hud.classList.add('hidden');
  } else {
    hud.classList.remove('hidden');
  }
};

Game.prototype._showOverlay = function (id) {
  this._hideAllOverlays();
  var el = document.getElementById(id);
  if (el) el.classList.remove('hidden');
  if (id !== 'title-screen') {
    var hud = document.getElementById('hud');
    if (hud) hud.classList.remove('hidden');
  }
};

Game.prototype._hideAllOverlays = function () {
  var overlays = document.querySelectorAll('.overlay');
  for (var i = 0; i < overlays.length; i++) {
    overlays[i].classList.add('hidden');
  }
  this._hideAbilityHint();
};

Game.prototype._showAbilityHint = function () {
  var el = document.getElementById('ability-hint');
  if (el) el.classList.remove('hidden');
};

Game.prototype._hideAbilityHint = function () {
  var el = document.getElementById('ability-hint');
  if (el) el.classList.add('hidden');
};

// ================== RENDER ==================
Game.prototype.render = function () {
  var ctx = this.ctx;
  ctx.clearRect(0, 0, WORLD_W, WORLD_H);

  ctx.save();
  // Screen shake
  if (this.shakeIntensity > 0 && this.shakeDuration > 0) {
    var sx = (Math.random() - 0.5) * this.shakeIntensity * 2;
    var sy = (Math.random() - 0.5) * this.shakeIntensity * 2;
    ctx.translate(sx, sy);
  }

  this._drawBackground(ctx);
  this._drawGround(ctx);
  this._drawSlingshot(ctx);
  this._drawBlocks(ctx);
  this._drawGuards(ctx);
  this._drawProjectile(ctx);
  this._drawTrajectory(ctx);
  drawParticles(ctx, this);
  this._drawAbilityEffects(ctx);
  this._drawFloatingTexts(ctx);

  ctx.restore();
};

Game.prototype._drawBackground = function (ctx) {
  var data = LEVELS[this.level - 1] || LEVELS[0];
  var sky = data.sky;
  var grad = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
  grad.addColorStop(0, sky.top);
  grad.addColorStop(0.55, sky.mid);
  grad.addColorStop(1, sky.bot);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, WORLD_W, GROUND_Y);

  // Sun
  var sunX = 920, sunY = 110;
  var sg = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, 90);
  sg.addColorStop(0, 'rgba(255,240,200,0.6)');
  sg.addColorStop(1, 'rgba(255,240,200,0)');
  ctx.fillStyle = sg;
  ctx.fillRect(sunX - 90, sunY - 90, 180, 180);
  ctx.fillStyle = 'rgba(255,225,160,0.85)';
  ctx.beginPath();
  ctx.arc(sunX, sunY, 32, 0, Math.PI * 2);
  ctx.fill();

  // Distant mountains
  ctx.fillStyle = 'rgba(40,30,65,0.5)';
  ctx.beginPath();
  ctx.moveTo(0, 430);
  for (var x = 0; x <= WORLD_W; x += 80) {
    var y = 430 + Math.sin(x * 0.008) * 50 + Math.sin(x * 0.025 + 1) * 25;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(WORLD_W, GROUND_Y);
  ctx.lineTo(0, GROUND_Y);
  ctx.closePath();
  ctx.fill();

  // Closer hills
  ctx.fillStyle = 'rgba(45,55,35,0.7)';
  ctx.beginPath();
  ctx.moveTo(0, 500);
  for (var x2 = 0; x2 <= WORLD_W; x2 += 60) {
    var y2 = 500 + Math.sin(x2 * 0.012 + 0.5) * 35 + Math.sin(x2 * 0.035) * 18;
    ctx.lineTo(x2, y2);
  }
  ctx.lineTo(WORLD_W, GROUND_Y);
  ctx.lineTo(0, GROUND_Y);
  ctx.closePath();
  ctx.fill();

  // Foreground hill (under slingshot)
  ctx.fillStyle = 'rgba(35,45,28,0.85)';
  ctx.beginPath();
  ctx.moveTo(0, 560);
  for (var x3 = 0; x3 <= 350; x3 += 30) {
    var y3 = 560 + Math.sin(x3 * 0.02) * 15 - x3 * 0.05;
    ctx.lineTo(x3, y3);
  }
  ctx.lineTo(350, GROUND_Y);
  ctx.lineTo(0, GROUND_Y);
  ctx.closePath();
  ctx.fill();
};

Game.prototype._drawGround = function (ctx) {
  var grad = ctx.createLinearGradient(0, GROUND_Y, 0, WORLD_H);
  grad.addColorStop(0, '#3d5a28');
  grad.addColorStop(0.08, '#3a2a18');
  grad.addColorStop(1, '#1a1008');
  ctx.fillStyle = grad;
  ctx.fillRect(0, GROUND_Y, WORLD_W, WORLD_H - GROUND_Y);

  // Grass strip
  ctx.fillStyle = '#4a6b2e';
  ctx.fillRect(0, GROUND_Y, WORLD_W, 6);
  // Grass blades
  ctx.strokeStyle = '#5a7b3e';
  ctx.lineWidth = 1;
  for (var x = 0; x < WORLD_W; x += 8) {
    var h = 3 + (Math.sin(x * 0.5) + 1) * 2;
    ctx.beginPath();
    ctx.moveTo(x, GROUND_Y);
    ctx.lineTo(x + 1, GROUND_Y - h);
    ctx.stroke();
  }
};

Game.prototype._drawSlingshot = function (ctx) {
  var baseY = GROUND_Y;

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(SLING_X, baseY + 4, 45, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  // Trunk
  ctx.strokeStyle = '#5a3e10';
  ctx.lineWidth = 16;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(SLING_X, baseY - 5);
  ctx.lineTo(SLING_X, SLING_FORK_TOP + 20);
  ctx.stroke();

  // Wood texture on trunk
  ctx.strokeStyle = '#3a280a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(SLING_X - 3, baseY - 5);
  ctx.lineTo(SLING_X - 3, SLING_FORK_TOP + 20);
  ctx.stroke();

  // Left prong
  ctx.strokeStyle = '#5a3e10';
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.moveTo(SLING_X, SLING_FORK_TOP + 20);
  ctx.lineTo(SLING_FORK_L, SLING_FORK_TOP);
  ctx.stroke();

  // Right prong
  ctx.beginPath();
  ctx.moveTo(SLING_X, SLING_FORK_TOP + 20);
  ctx.lineTo(SLING_FORK_R, SLING_FORK_TOP);
  ctx.stroke();

  // Band + projectile (when projectile is at slingshot)
  var projAtSling = !this.projectile.active;
  if (projAtSling) {
    var px, py;
    if (this.dragging && this.phase === 'aiming') {
      px = this.projectile.x;
      py = this.projectile.y;
    } else {
      px = SLING_X;
      py = SLING_Y;
    }
    var ddx = SLING_X - px, ddy = SLING_Y - py;
    var power = Math.min(1, Math.sqrt(ddx * ddx + ddy * ddy) / MAX_DRAG);
    var bandColor = power < 0.34 ? '#4a9a4a' : power < 0.67 ? '#cc9922' : '#cc4422';

    ctx.strokeStyle = power > 0.05 ? bandColor : '#444';
    ctx.lineWidth = power > 0.05 ? 5 : 4;
    ctx.beginPath();
    ctx.moveTo(SLING_FORK_L, SLING_FORK_TOP);
    ctx.lineTo(px, py);
    ctx.lineTo(SLING_FORK_R, SLING_FORK_TOP);
    ctx.stroke();

    // Pouch
    ctx.fillStyle = '#2a2a1a';
    ctx.beginPath();
    ctx.arc(px, py, 8, 0, Math.PI * 2);
    ctx.fill();

    // Projectile body at correct position
    this._drawProjectileBody(ctx, px, py);
  } else {
    // Relaxed band (projectile in flight)
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(SLING_FORK_L, SLING_FORK_TOP);
    ctx.lineTo(SLING_FORK_R, SLING_FORK_TOP);
    ctx.stroke();
  }
};

Game.prototype._drawProjectileBody = function (ctx, x, y) {
  var r = PROJ_R;
  var grad = ctx.createRadialGradient(x - 5, y - 5, 2, x, y, r);
  grad.addColorStop(0, '#6a6a7a');
  grad.addColorStop(0.6, '#3a3a4a');
  grad.addColorStop(1, '#1a1a2a');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();

  // Metallic band
  ctx.strokeStyle = '#7a7a8a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(x, y, r - 1, r * 0.28, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Highlight
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.beginPath();
  ctx.arc(x - 5, y - 6, 3.5, 0, Math.PI * 2);
  ctx.fill();

  // Outline
  ctx.strokeStyle = '#15151f';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
};

Game.prototype._drawProjectile = function (ctx) {
  var p = this.projectile;
  if (!p.active) return;

  // Trail
  for (var i = 0; i < p.trail.length; i++) {
    var t = p.trail[i];
    var a = (1 - i / p.trail.length) * 0.4;
    ctx.globalAlpha = a;
    ctx.fillStyle = '#c8b890';
    ctx.beginPath();
    ctx.arc(t.x, t.y, p.r * (0.25 + i / p.trail.length * 0.6), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  this._drawProjectileBody(ctx, p.x, p.y);

  // Ability glow
  if (!p.abilityUsed && this.phase === 'flying') {
    var pulse = 0.5 + Math.sin(this.bgTime * 0.01) * 0.3;
    ctx.strokeStyle = 'rgba(232,93,40,' + pulse + ')';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r + 5, 0, Math.PI * 2);
    ctx.stroke();
  }
};

Game.prototype._drawTrajectory = function (ctx) {
  if (this.phase !== 'aiming' || !this.dragging) return;
  for (var i = 0; i < this.trajectory.length; i++) {
    var pt = this.trajectory[i];
    ctx.globalAlpha = pt.a * 0.6;
    ctx.fillStyle = '#f0e8d0';
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 3.5 - i * 0.02, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
};

Game.prototype._drawBlocks = function (ctx) {
  for (var i = 0; i < this.blocks.length; i++) {
    var b = this.blocks[i];
    if (b.destroyed) continue;
    var bt = BLOCK_TYPES[b.type];
    var dmg = 1 - b.health / b.maxHealth;

    // Body with gradient
    var grad = ctx.createLinearGradient(b.x, b.y, b.x, b.y + b.h);
    grad.addColorStop(0, bt.light);
    grad.addColorStop(0.5, bt.color);
    grad.addColorStop(1, bt.dark);
    ctx.fillStyle = grad;
    ctx.fillRect(b.x, b.y, b.w, b.h);

    // Border
    ctx.strokeStyle = bt.dark;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1);

    // Texture
    if (b.type === 'wood') {
      ctx.strokeStyle = bt.dark;
      ctx.lineWidth = 1;
      for (var k = 1; k < 3; k++) {
        var ly = b.y + (b.h / 3) * k;
        ctx.beginPath();
        ctx.moveTo(b.x + 3, ly);
        ctx.lineTo(b.x + b.w - 3, ly);
        ctx.stroke();
      }
    } else {
      // Stone spots
      ctx.fillStyle = bt.dark;
      var seed = (b.id + 1) * 37;
      for (var s = 0; s < 4; s++) {
        var sx = b.x + 3 + ((seed * (s + 2)) % (b.w - 6));
        var sy = b.y + 3 + ((seed * (s + 5)) % (b.h - 6));
        ctx.beginPath();
        ctx.arc(sx, sy, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Damage cracks
    if (dmg > 0.25) {
      ctx.strokeStyle = 'rgba(0,0,0,0.55)';
      ctx.lineWidth = 1.5;
      var nCracks = Math.floor(dmg * 4) + 1;
      for (var c = 0; c < nCracks; c++) {
        var cx = b.x + b.w * (0.15 + c * 0.22);
        ctx.beginPath();
        ctx.moveTo(cx, b.y + 2);
        ctx.lineTo(cx + Math.sin(c * 2) * 4, b.y + b.h * 0.4);
        ctx.lineTo(cx - 3, b.y + b.h - 2);
        ctx.stroke();
      }
    }

    // Health bar (only when damaged)
    if (dmg > 0.05 && dmg < 0.95) {
      var bw = b.w * 0.8;
      var bh = 3;
      var bx = b.x + (b.w - bw) / 2;
      var by = b.y - 6;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
      ctx.fillStyle = dmg > 0.6 ? '#cc4422' : '#ccaa22';
      ctx.fillRect(bx, by, bw * (1 - dmg), bh);
    }
  }
};

Game.prototype._drawGuards = function (ctx) {
  for (var i = 0; i < this.guards.length; i++) {
    var g = this.guards[i];
    if (!g.alive) continue;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(g.x, g.y + g.r + 2, g.r * 0.8, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body
    var grad = ctx.createRadialGradient(g.x - 5, g.y - 5, 3, g.x, g.y, g.r);
    grad.addColorStop(0, '#5a5070');
    grad.addColorStop(0.6, '#3a3450');
    grad.addColorStop(1, '#2a2440');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(g.x, g.y, g.r, 0, Math.PI * 2);
    ctx.fill();

    // Border
    ctx.strokeStyle = '#1a1428';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Crystal facets
    ctx.strokeStyle = 'rgba(100,90,130,0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(g.x - g.r * 0.5, g.y - g.r * 0.3);
    ctx.lineTo(g.x + g.r * 0.3, g.y + g.r * 0.4);
    ctx.moveTo(g.x + g.r * 0.4, g.y - g.r * 0.4);
    ctx.lineTo(g.x - g.r * 0.3, g.y + g.r * 0.3);
    ctx.stroke();

    // Eyes
    var eyeColor = g.health < g.maxHealth ? '#ff5544' : '#22ff88';
    ctx.fillStyle = eyeColor;
    ctx.shadowColor = eyeColor;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(g.x - 6, g.y - 3, 2.5, 0, Math.PI * 2);
    ctx.arc(g.x + 6, g.y - 3, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Mouth (frown)
    ctx.strokeStyle = 'rgba(30,20,40,0.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(g.x, g.y + 5, 4, 0.2, Math.PI - 0.2);
    ctx.stroke();

    // Health bar
    if (g.health < g.maxHealth) {
      var bw2 = 38;
      var bh2 = 4;
      var bx2 = g.x - bw2 / 2;
      var by2 = g.y - g.r - 10;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(bx2 - 1, by2 - 1, bw2 + 2, bh2 + 2);
      ctx.fillStyle = '#cc3322';
      ctx.fillRect(bx2, by2, bw2 * (g.health / g.maxHealth), bh2);
    }
  }
};

Game.prototype._drawAbilityEffects = function (ctx) {
  for (var i = 0; i < this.abilityEffects.length; i++) {
    var ae = this.abilityEffects[i];
    var alpha = ae.life / ae.maxLife;
    ctx.globalAlpha = alpha * 0.6;
    ctx.strokeStyle = '#ffcc44';
    ctx.lineWidth = 4 * alpha;
    ctx.beginPath();
    ctx.arc(ae.x, ae.y, ae.r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = alpha * 0.3;
    ctx.fillStyle = '#ff8833';
    ctx.beginPath();
    ctx.arc(ae.x, ae.y, ae.r * 0.7, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
};

Game.prototype._drawFloatingTexts = function (ctx) {
  for (var i = 0; i < this.floatingTexts.length; i++) {
    var ft = this.floatingTexts[i];
    var alpha = ft.life / ft.maxLife;
    ctx.globalAlpha = alpha;
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = ft.color;
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 3;
    ctx.strokeText(ft.text, ft.x, ft.y);
    ctx.fillText(ft.text, ft.x, ft.y);
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';
};

// ---- Main Loop ----
Game.prototype.loop = function (timestamp) {
  if (this.lastTime === 0) this.lastTime = timestamp;
  var dt = timestamp - this.lastTime;
  this.lastTime = timestamp;
  if (dt > 100) dt = 100;

  if (!this.paused && !this.manualClock) {
    if (this.phase !== 'menu' && this.phase !== 'paused' && this.phase !== 'win' && this.phase !== 'lose' && this.phase !== 'complete') {
      this.update(dt);
    } else if (this.phase === 'menu' || this.phase === 'win' || this.phase === 'lose') {
      this.bgTime += dt;
      updateParticles(this, dt);
    }
  } else if (this.manualClock && !this.paused) {
    // Still render, but don't auto-update (step() handles updates)
    this.bgTime += dt;
  }

  this.render();
  requestAnimationFrame(this.loop);
};

// ================== INIT ==================
var game = new Game();

window.__SLINGSHOT_TEST__ = {
  snapshot: function () { return game.snapshot(); },
  start: function () { game.start(); },
  restart: function () { game.restart(); },
  loadLevel: function (level) { game.loadLevel(level); },
  pause: function () { game.pause(); },
  resume: function () { game.resume(); },
  setManualClock: function (enabled) { game.setManualClock(enabled); },
  step: function (ms) { game.step(ms); },
  aim: function (dx, dy) { game.aim(dx, dy); },
  launch: function () { game.launch(); },
  activateAbility: function () { game.activateAbility(); },
  forceHit: function (targetId) { game.forceHit(targetId); }
};

})();
