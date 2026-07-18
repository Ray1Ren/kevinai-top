/* ============================================================
 * Breach Point / 破门点
 * 原创低多边形海港仓库拆弹训练场 · 3D 第一人称拆弹小游戏
 * 仅使用原生 JS + Web Audio + 本地 Three.js r147，无外部资源
 * ============================================================ */
(function () {
'use strict';

/* ---------------- 工具 ---------------- */
function $(id) { return document.getElementById(id); }
function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
function lerp(a, b, t) { return a + (b - a) * t; }
function rand(a, b) { return a + Math.random() * (b - a); }
function dist2D(ax, az, bx, bz) { var dx = ax - bx, dz = az - bz; return Math.sqrt(dx * dx + dz * dz); }
function round3(v) { return Math.round(v * 1000) / 1000; }

/* ---------------- 常量 ---------------- */
var EYE = 1.6;                 // 视线高度
var PLAYER_RADIUS = 0.38;
var PLAYER_SPEED = 4.8;
var MAP_BOUND = 44.0;          // 可活动范围（周界墙内侧）
var MAG_SIZE = 12;
var START_RESERVE = 36;
var FIRE_INTERVAL = 0.14;      // 射速限制（秒/发）
var RELOAD_TIME = 1.5;
var MISSION_TIME = 75;         // 任务倒计时（秒）
var DEFUSE_RANGE = 2.8;        // 拆弹距离（XZ 平面）
var DEFUSE_TIME = 2.0;         // 连续拆除所需秒数（≥1.5）
var ENEMY_HP = 100;
var DMG_BODY = 34;
var DMG_HEAD = 68;
var PLAYER_MAX_HP = 100;
var STORAGE_KEY = 'breachpoint.bestTime.v1';

/* ---------------- 全局状态 ---------------- */
var G = {
  phase: 'menu',          // menu | playing | won | lost
  paused: false,
  manual: false,          // 测试用手动时钟
  timeLeft: MISSION_TIME,
  timeUsed: 0,
  hp: PLAYER_MAX_HP,
  ammo: MAG_SIZE,
  reserve: START_RESERVE,
  reloading: false,
  reloadT: 0,
  fireCd: 0,
  defuseProgress: 0,
  defuseTickT: 0,
  cleared: false,
  yaw: 0,                 // yaw=0 朝 -Z（北，装置方向）
  pitch: 0,
  recoil: 0,
  shake: 0,
  noiseT: 0,              // 玩家开枪噪音（惊动敌人）
  alarmPlayed: false,
  muted: false,
  reducedMotion: false,
  dragMode: false,        // Pointer Lock 被拒时的拖拽降级
  lockActive: false,
  suppressAutoPause: false,
  isTouch: false,
  stats: { shots: 0, hits: 0, kills: 0 },
  loseReason: ''
};

var renderer, scene, camera;
var playerPos;            // THREE.Vector3，相机（眼）位置
var enemies = [];
var colliders = [];       // {x1,z1,x2,z2} XZ 盒碰撞
var solidMeshes = [];     // 参与子弹/视线射线的网格
var device = null;        // 装置 {pos, group, light, ring, beam}
var weaponGroup, muzzleFlash, muzzleLight;
var raycaster;            // 复用射线器
var tmpV1, tmpV2, tmpV3;

/* ============================================================
 * 程序化音频（Web Audio，无任何外部音频文件）
 * ============================================================ */
var AudioSys = {
  ctx: null, master: null,
  init: function () {
    if (this.ctx) return;
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = G.muted ? 0 : 0.5;
      this.master.connect(this.ctx.destination);
    } catch (e) { this.ctx = null; }
  },
  resume: function () {
    if (this.ctx && this.ctx.state === 'suspended') { this.ctx.resume(); }
  },
  setMuted: function (m) {
    G.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.5;
  },
  tone: function (freq, dur, type, vol, slideTo, delay) {
    if (!this.ctx || G.muted) return;
    try {
      var t0 = this.ctx.currentTime + (delay || 0);
      var o = this.ctx.createOscillator();
      var g = this.ctx.createGain();
      o.type = type || 'square';
      o.frequency.setValueAtTime(freq, t0);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
      g.gain.setValueAtTime(vol || 0.2, t0);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      o.connect(g); g.connect(this.master);
      o.start(t0); o.stop(t0 + dur + 0.02);
    } catch (e) {}
  },
  noise: function (dur, filterFreq, vol, delay) {
    if (!this.ctx || G.muted) return;
    try {
      var t0 = this.ctx.currentTime + (delay || 0);
      var len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
      var buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      var data = buf.getChannelData(0);
      for (var i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      var src = this.ctx.createBufferSource(); src.buffer = buf;
      var f = this.ctx.createBiquadFilter();
      f.type = 'bandpass'; f.frequency.value = filterFreq; f.Q.value = 0.8;
      var g = this.ctx.createGain(); g.gain.setValueAtTime(vol || 0.4, t0);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      src.connect(f); f.connect(g); g.connect(this.master);
      src.start(t0);
    } catch (e) {}
  },
  shoot: function () { this.noise(0.09, 2400, 0.5); this.tone(150, 0.08, 'square', 0.28, 55); },
  enemyShoot: function () { this.noise(0.08, 1100, 0.3); this.tone(95, 0.1, 'square', 0.2, 45); },
  dryFire: function () { this.tone(1500, 0.035, 'square', 0.12); },
  hit: function () { this.tone(1150, 0.05, 'sine', 0.3, 1500); },
  kill: function () { this.tone(700, 0.07, 'sine', 0.3); this.tone(1150, 0.09, 'sine', 0.3, null, 0.06); },
  hurt: function () { this.tone(170, 0.18, 'sawtooth', 0.35, 70); this.noise(0.12, 420, 0.25); },
  reload: function () {
    this.tone(480, 0.05, 'square', 0.22);
    this.tone(640, 0.05, 'square', 0.22, null, 0.45);
    this.tone(920, 0.06, 'square', 0.26, null, 1.15);
  },
  defuseTick: function (p) { this.tone(1000 + p * 700, 0.04, 'sine', 0.18); },
  alarm: function () { this.tone(880, 0.14, 'square', 0.16); this.tone(880, 0.14, 'square', 0.16, null, 0.22); },
  win: function () {
    var seq = [523, 659, 784, 1047];
    for (var i = 0; i < seq.length; i++) this.tone(seq[i], 0.22, 'sine', 0.3, null, i * 0.13);
  },
  lose: function () {
    var seq = [320, 262, 208, 156];
    for (var i = 0; i < seq.length; i++) this.tone(seq[i], 0.3, 'sawtooth', 0.2, null, i * 0.16);
  }
};

/* ============================================================
 * 输入：键盘 / 鼠标（Pointer Lock + 拖拽降级）/ 触屏
 * ============================================================ */
var Input = {
  keys: {},
  fireHeld: false,
  interactHeld: false,
  lookDX: 0, lookDY: 0,       // 每帧消费的视角增量
  stickX: 0, stickY: 0        // 触屏摇杆 -1..1
};
var MOUSE_SENS = 0.0023;
var TOUCH_SENS = 0.0042;

function isGameKey(code) {
  return code === 'KeyW' || code === 'KeyA' || code === 'KeyS' || code === 'KeyD' ||
    code === 'KeyR' || code === 'KeyE' || code === 'KeyM' || code === 'ArrowUp' ||
    code === 'ArrowDown' || code === 'ArrowLeft' || code === 'ArrowRight';
}

function bindInput() {
  window.addEventListener('keydown', function (e) {
    if (isGameKey(e.code)) e.preventDefault();
    if (e.repeat) return;
    Input.keys[e.code] = true;
    if (e.code === 'KeyR') startReload();
    if (e.code === 'KeyE') Input.interactHeld = true;
    if (e.code === 'KeyM') toggleMute();
    if (e.code === 'Escape') {
      // Pointer Lock 下 Esc 由浏览器解锁，pointerlockchange 会触发暂停
      if (!G.lockActive && G.phase === 'playing') {
        if (G.paused) resumeGame(); else pauseGame();
      }
    }
  });
  window.addEventListener('keyup', function (e) {
    Input.keys[e.code] = false;
    if (e.code === 'KeyE') Input.interactHeld = false;
  });
  window.addEventListener('blur', function () {
    Input.keys = {}; Input.fireHeld = false; Input.interactHeld = false;
  });

  var container = $('game-container');

  container.addEventListener('mousedown', function (e) {
    if (e.button !== 0 || G.phase !== 'playing' || G.paused) return;
    if (G.lockActive) { Input.fireHeld = true; return; }
    // 拖拽降级模式：按下开始拖拽，松开时若几乎未移动则视为点射
    dragState.active = true;
    dragState.moved = 0;
    dragState.lastX = e.clientX; dragState.lastY = e.clientY;
  });
  window.addEventListener('mousemove', function (e) {
    if (G.lockActive) {
      Input.lookDX += e.movementX || 0;
      Input.lookDY += e.movementY || 0;
    } else if (dragState.active) {
      var dx = e.clientX - dragState.lastX, dy = e.clientY - dragState.lastY;
      dragState.lastX = e.clientX; dragState.lastY = e.clientY;
      dragState.moved += Math.abs(dx) + Math.abs(dy);
      Input.lookDX += dx; Input.lookDY += dy;
    }
  });
  window.addEventListener('mouseup', function (e) {
    if (e.button !== 0) return;
    if (G.lockActive) { Input.fireHeld = false; return; }
    if (dragState.active) {
      if (dragState.moved < 5 && G.phase === 'playing' && !G.paused) playerShoot();
      dragState.active = false;
    }
  });

  // Pointer Lock 状态跟踪
  document.addEventListener('pointerlockchange', function () {
    G.lockActive = document.pointerLockElement === container;
    if (!G.lockActive) {
      Input.fireHeld = false;
      // 游戏中非主动解锁（Esc）→ 自动暂停
      if (G.phase === 'playing' && !G.paused && !G.suppressAutoPause && !G.isTouch) pauseGame();
      G.suppressAutoPause = false;
    }
  });
  document.addEventListener('pointerlockerror', function () {
    G.dragMode = true;
    showHint('浏览器拒绝了鼠标锁定：按住左键拖拽观察，单击射击', 4);
  });

  bindTouch();
}

var dragState = { active: false, moved: 0, lastX: 0, lastY: 0 };

function requestAim() {
  if (G.isTouch) return;
  var container = $('game-container');
  try {
    var p = container.requestPointerLock && container.requestPointerLock();
    if (p && p.catch) p.catch(function () {
      G.dragMode = true;
      showHint('鼠标锁定不可用：按住左键拖拽观察，单击射击', 4);
    });
  } catch (e) {
    G.dragMode = true;
    showHint('鼠标锁定不可用：按住左键拖拽观察，单击射击', 4);
  }
}

function releaseAim() {
  if (document.pointerLockElement) {
    G.suppressAutoPause = true;
    document.exitPointerLock();
  }
}

/* ---------------- 触屏 ---------------- */
function bindTouch() {
  var stickZone = $('stick-zone');
  var knob = $('stick-knob');
  var stickId = null, baseCX = 0, baseCY = 0;
  var lookId = null, lookLX = 0, lookLY = 0;
  var STICK_R = 46;

  function stickCenter() {
    var base = $('stick-base').getBoundingClientRect();
    baseCX = base.left + base.width / 2;
    baseCY = base.top + base.height / 2;
  }

  stickZone.addEventListener('touchstart', function (e) {
    e.preventDefault();
    if (stickId !== null) return;
    var t = e.changedTouches[0];
    stickId = t.identifier;
    stickCenter();
  }, { passive: false });

  stickZone.addEventListener('touchmove', function (e) {
    e.preventDefault();
    for (var i = 0; i < e.changedTouches.length; i++) {
      var t = e.changedTouches[i];
      if (t.identifier !== stickId) continue;
      var dx = clamp((t.clientX - baseCX) / STICK_R, -1, 1);
      var dy = clamp((t.clientY - baseCY) / STICK_R, -1, 1);
      Input.stickX = dx; Input.stickY = dy;
      knob.style.transform = 'translate(' + dx * 30 + 'px,' + dy * 30 + 'px)';
    }
  }, { passive: false });

  function stickEnd(e) {
    for (var i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === stickId) {
        stickId = null; Input.stickX = 0; Input.stickY = 0;
        knob.style.transform = '';
      }
    }
  }
  stickZone.addEventListener('touchend', stickEnd);
  stickZone.addEventListener('touchcancel', stickEnd);

  // 右半屏拖拽观察（绑定在整个容器上，排除按钮与摇杆）
  var container = $('game-container');
  container.addEventListener('touchstart', function (e) {
    if (G.phase !== 'playing' || G.paused) return;
    for (var i = 0; i < e.changedTouches.length; i++) {
      var t = e.changedTouches[i];
      if (t.clientX < window.innerWidth * 0.45) continue;
      if (lookId !== null) continue;
      lookId = t.identifier; lookLX = t.clientX; lookLY = t.clientY;
    }
  }, { passive: true });
  container.addEventListener('touchmove', function (e) {
    for (var i = 0; i < e.changedTouches.length; i++) {
      var t = e.changedTouches[i];
      if (t.identifier !== lookId) continue;
      Input.lookDX += (t.clientX - lookLX) * (TOUCH_SENS / MOUSE_SENS);
      Input.lookDY += (t.clientY - lookLY) * (TOUCH_SENS / MOUSE_SENS);
      lookLX = t.clientX; lookLY = t.clientY;
    }
  }, { passive: true });
  function lookEnd(e) {
    for (var i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === lookId) lookId = null;
    }
  }
  container.addEventListener('touchend', lookEnd);
  container.addEventListener('touchcancel', lookEnd);

  function holdButton(id, on, off) {
    var el = $(id);
    el.addEventListener('touchstart', function (e) { e.preventDefault(); on(); }, { passive: false });
    el.addEventListener('touchend', function (e) { e.preventDefault(); off(); }, { passive: false });
    el.addEventListener('touchcancel', function () { off(); });
  }
  holdButton('btn-fire', function () { Input.fireHeld = true; }, function () { Input.fireHeld = false; });
  holdButton('btn-interact-t', function () { Input.interactHeld = true; }, function () { Input.interactHeld = false; });
  $('btn-reload-t').addEventListener('touchstart', function (e) { e.preventDefault(); startReload(); }, { passive: false });
}

/* ============================================================
 * 场景搭建：低多边形海港仓库拆弹训练场（全部程序化几何体）
 * ============================================================ */
function lambert(color, opts) {
  // 注意：emissive 等 Color 属性必须交给构造器 setValues 做类型转换，
  // 不能直接给 material.emissive 赋数字（会毁掉 Color 实例导致渲染成黑色）
  return new THREE.MeshLambertMaterial(Object.assign({ color: color }, opts || {}));
}

function makeBox(w, h, d, color, x, y, z, opts) {
  var mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), lambert(color, opts));
  mesh.position.set(x, y, z);
  return mesh;
}

/* 注册一个实心盒：视觉网格 + XZ 碰撞 + 子弹遮挡 */
function addSolid(mesh, collide, blockRay) {
  scene.add(mesh);
  if (collide) {
    mesh.updateMatrixWorld();
    var b = new THREE.Box3().setFromObject(mesh);
    colliders.push({ x1: b.min.x, z1: b.min.z, x2: b.max.x, z2: b.max.z });
  }
  if (blockRay !== false) solidMeshes.push(mesh);
  return mesh;
}

/* 简易画布纹理（程序化生成，非外部资源）：警示条纹 */
function hazardTexture() {
  var c = document.createElement('canvas'); c.width = c.height = 64;
  var g = c.getContext('2d');
  g.fillStyle = '#c9a52a'; g.fillRect(0, 0, 64, 64);
  g.fillStyle = '#22252a';
  for (var i = -64; i < 128; i += 32) {
    g.beginPath(); g.moveTo(i, 64); g.lineTo(i + 16, 64); g.lineTo(i + 80, 0); g.lineTo(i + 64, 0); g.closePath(); g.fill();
  }
  var t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/* 场地高台（deck）与坡道（ramp）区域定义 —— 用于地面高度函数 */
var DECK = { x1: 18, z1: -16, x2: 30, z2: -4, h: 1.4 };
var RAMP = { x1: 22, z1: -4, x2: 26, z2: 2, len: 6 }; // 沿 +z 从 deck 降到地面

function groundHeightAt(x, z) {
  if (x >= DECK.x1 && x <= DECK.x2 && z >= DECK.z1 && z <= DECK.z2) return DECK.h;
  if (x >= RAMP.x1 && x <= RAMP.x2 && z > RAMP.z1 && z <= RAMP.z2) {
    var t = clamp((RAMP.z2 - z) / RAMP.len, 0, 1);
    return DECK.h * t;
  }
  return 0;
}

function buildWorld() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x93aec6);          // 港区晨空
  scene.fog = new THREE.Fog(0x93aec6, 55, 210);

  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 400);
  camera.rotation.order = 'YXZ';

  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputEncoding = THREE.sRGBEncoding;
  $('game-container').appendChild(renderer.domElement);

  /* 灯光：半球环境光 + 暖色日光（带阴影） */
  scene.add(new THREE.HemisphereLight(0xcfe0ee, 0x4c4a3c, 0.85));
  var sun = new THREE.DirectionalLight(0xffe2b0, 0.95);
  sun.position.set(38, 52, 26);
  sun.castShadow = true;
  sun.shadow.mapSize.set(G.reducedMotion ? 512 : 1024, G.reducedMotion ? 512 : 1024);
  sun.shadow.camera.left = -60; sun.shadow.camera.right = 60;
  sun.shadow.camera.top = 60; sun.shadow.camera.bottom = -60;
  sun.shadow.camera.far = 160;
  scene.add(sun);

  /* 地面（混凝土岛）与远处水面 */
  var ground = new THREE.Mesh(new THREE.PlaneGeometry(140, 140), lambert(0x74806f));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  solidMeshes.push(ground); // 子弹可打在地面

  var water = new THREE.Mesh(new THREE.PlaneGeometry(500, 500), lambert(0x27506b, { emissive: 0x0a1a26 }));
  water.rotation.x = -Math.PI / 2;
  water.position.y = -0.7;
  scene.add(water);

  /* 地面标线：进场引导线与装置区标识（一眼知道往北走） */
  var lineMat = lambert(0xd8b23a, { emissive: 0x2a2005 });
  for (var i = 0; i < 4; i++) {
    var stripe = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 5), lineMat);
    stripe.rotation.x = -Math.PI / 2;
    stripe.position.set(0, 0.02, 30 - i * 14);
    scene.add(stripe);
  }
  var padMark = new THREE.Mesh(new THREE.RingGeometry(3.4, 4.0, 40), lambert(0xd8b23a, { emissive: 0x332805 }));
  padMark.rotation.x = -Math.PI / 2;
  padMark.position.set(0, 0.02, -35);
  scene.add(padMark);

  /* 周界围墙（不出图） */
  var wallColor = 0x8b8578;
  addSolid(makeBox(92, 4, 1, wallColor, 0, 2, -45.5), false);
  addSolid(makeBox(92, 4, 1, wallColor, 0, 2, 45.5), false);
  addSolid(makeBox(1, 4, 92, wallColor, -45.5, 2, 0), false);
  addSolid(makeBox(1, 4, 92, wallColor, 45.5, 2, 0), false);
  // 墙顶压顶条，增强剪影
  scene.add(makeBox(92, 0.25, 1.3, 0x6e6a5f, 0, 4.1, -45.5));
  scene.add(makeBox(92, 0.25, 1.3, 0x6e6a5f, 0, 4.1, 45.5));

  /* 大门（南侧出生点装饰门框） */
  addSolid(makeBox(1.2, 4.6, 1.2, 0x5c6670, -4.2, 2.3, 42), true);
  addSolid(makeBox(1.2, 4.6, 1.2, 0x5c6670, 4.2, 2.3, 42), true);
  scene.add(makeBox(9.6, 0.8, 1.2, 0x5c6670, 0, 4.6, 42));

  /* ============ 仓库（北侧，装置所在） ============ */
  buildWarehouse();

  /* ============ 集装箱堆场（双通路 + 中央连接） ============ */
  buildContainers();

  /* ============ 木箱掩体 ============ */
  var crates = [
    [5, -18, 1.2], [-5, -19, 1.2], [12, -16, 1.0], [-14, -16, 1.0],
    [3, 4, 1.1], [-3, 6, 0.9], [14, 14, 1.2], [-10, 14, 1.1],
    [24, -14, 1.0], [-22, 2, 1.2], [8, 22, 1.3], [-8, 24, 1.0],
    [-6.5, -30, 1.1], [6.5, -36, 1.1]
  ];
  for (var ci = 0; ci < crates.length; ci++) {
    var s = crates[ci][2];
    addSolid(makeBox(s, s, s, 0xa9824e, crates[ci][0], s / 2, crates[ci][1]), true).castShadow = true;
  }

  /* ============ 高台与坡道（高低层次） ============ */
  buildPlatform();

  /* ============ 远处地标：灯塔 + 港口吊机 ============ */
  buildLandmarks();

  /* ============ 拆弹装置 ============ */
  buildDevice();

  /* ============ 武器视模 ============ */
  buildWeapon();
}

function buildWarehouse() {
  var wall = 0x7d8a94, wallDark = 0x66727c;
  var H = 6, T = 0.45;
  // 南墙（带门洞 x∈[-2.6,2.6]）
  addSolid(makeBox(12 - 2.6, H, T, wall, -(2.6 + (12 - 2.6) / 2), H / 2, -22), true).castShadow = true;
  addSolid(makeBox(12 - 2.6, H, T, wall, 2.6 + (12 - 2.6) / 2, H / 2, -22), true).castShadow = true;
  // 门楣
  scene.add(makeBox(5.2, H - 4.2, T, wallDark, 0, 4.2 + (H - 4.2) / 2, -22));
  solidMeshes.push(scene.children[scene.children.length - 1]);
  // 北墙
  addSolid(makeBox(24, H, T, wall, 0, H / 2, -40), true).castShadow = true;
  // 西墙
  addSolid(makeBox(T, H, 18, wall, -12, H / 2, -31), true).castShadow = true;
  // 东墙（带侧门 z∈[-32,-29]）
  addSolid(makeBox(T, H, 9, wall, 12, H / 2, -35.5), true).castShadow = true;   // z[-40,-31]
  addSolid(makeBox(T, H, 6, wall, 12, H / 2, -25), true).castShadow = true;    // z[-28,-22]
  // 东墙门楣
  var lintel = makeBox(T, H - 3.6, 3, wallDark, 12, 3.6 + (H - 3.6) / 2, -29.5);
  scene.add(lintel); solidMeshes.push(lintel);
  // 北半部分屋顶（保留南半开天井采光）
  var roof = makeBox(24.5, 0.35, 9.5, 0x59646e, 0, H + 0.17, -35.7);
  scene.add(roof); solidMeshes.push(roof); roof.castShadow = true;
  // 屋顶支撑柱
  addSolid(makeBox(0.5, H, 0.5, wallDark, -11.6, H / 2, -31.2), true);
  addSolid(makeBox(0.5, H, 0.5, wallDark, 11.6, H / 2, -31.2), true);
  // 外墙竖肋（波纹板意象）
  for (var i = -10; i <= 10; i += 4) {
    scene.add(makeBox(0.28, H, 0.28, wallDark, i, H / 2, -40.35));
  }
  // 室内工作灯
  var lamp = new THREE.PointLight(0xffd9a0, 0.9, 26, 2);
  lamp.position.set(0, 4.6, -34);
  scene.add(lamp);
  scene.add(makeBox(0.5, 0.18, 0.5, 0xffe6b0, 0, 4.4, -34, { emissive: 0xffe6b0 }));
}

function buildContainers() {
  var palette = [0x9c4a34, 0x3a6b8a, 0x4f7a4a, 0xb08830, 0x6a7076];
  // [x, z, rotY(0=沿x,1=沿z), 颜色序号, 层]
  var defs = [
    [0, -12, 1, 1, 0],      // 中央纵向 —— 分出左右两条通路
    [-16, -12, 0, 0, 0],
    [16, -12, 0, 3, 0],
    [-8, 0, 1, 2, 0],
    [8, 0, 1, 0, 0],
    [0, 10, 0, 4, 0],
    [-20, 8, 0, 1, 0], [-20, 8, 0, 3, 1],  // 双层叠放
    [20, 6, 0, 2, 0],
    [-26, -2, 1, 4, 0],
    [26, -8, 1, 0, 0],
    [12, 24, 1, 2, 0],
    [-14, 26, 0, 0, 0]
  ];
  for (var i = 0; i < defs.length; i++) {
    var d = defs[i];
    var L = 6.06, W = 2.44, Hc = 2.59;
    var w = d[2] === 0 ? L : W, dep = d[2] === 0 ? W : L;
    var y = Hc / 2 + d[4] * Hc;
    var box = makeBox(w, Hc, dep, palette[d[3]], d[0], y, d[1]);
    box.castShadow = true;
    addSolid(box, d[4] === 0, true);   // 上层箱体不参与移动碰撞（XZ 已由底层覆盖）
    if (d[4] === 0 && d[2] === 0) colliders[colliders.length - 1] = { x1: d[0] - L / 2, z1: d[1] - W / 2, x2: d[0] + L / 2, z2: d[1] + W / 2 };
    // 箱体端门框细节
    var door = makeBox(w + 0.06, Hc * 0.82, dep * 0.4, 0x2c3238, d[0], y, d[1] + (d[2] === 0 ? dep / 2 : 0) - (d[2] === 0 ? 0 : 0));
    if (d[2] !== 0) door.position.set(d[0], y, d[1] + dep / 2);
    scene.add(door);
  }
}

function buildPlatform() {
  var deckColor = 0x7c8288;
  var w = DECK.x2 - DECK.x1, d = DECK.z2 - DECK.z1;
  var cx = (DECK.x1 + DECK.x2) / 2, cz = (DECK.z1 + DECK.z2) / 2;
  // 实心台体：子弹可挡，移动靠地面高度函数 + 台阶限制
  var block = makeBox(w, DECK.h, d, deckColor, cx, DECK.h / 2, cz);
  block.castShadow = true;
  scene.add(block); solidMeshes.push(block);
  // 防滑条纹
  for (var i = 0; i < 3; i++) {
    var s = new THREE.Mesh(new THREE.PlaneGeometry(w - 1, 0.18), lambert(0xd8b23a));
    s.rotation.x = -Math.PI / 2;
    s.position.set(cx, DECK.h + 0.01, DECK.z1 + 2 + i * 4);
    scene.add(s);
  }
  // 坡道（斜面网格，挡子弹；行走高度由 groundHeightAt 提供）
  var rampLen = Math.sqrt(RAMP.len * RAMP.len + DECK.h * DECK.h);
  var ramp = new THREE.Mesh(new THREE.BoxGeometry(RAMP.x2 - RAMP.x1, 0.25, rampLen + 0.6), lambert(0x8a6f3f));
  ramp.position.set((RAMP.x1 + RAMP.x2) / 2, DECK.h / 2 - 0.06, (RAMP.z1 + RAMP.z2) / 2);
  ramp.rotation.x = Math.atan2(DECK.h, RAMP.len);
  ramp.castShadow = true;
  scene.add(ramp); solidMeshes.push(ramp);
  // 护栏（西/北/东边，南边坡道开口）
  var rail = lambert(0xc7a03a);
  function railSeg(w2, d2, x, z) {
    var r = new THREE.Mesh(new THREE.BoxGeometry(w2, 0.9, d2), rail);
    r.position.set(x, DECK.h + 0.45, z);
    scene.add(r); solidMeshes.push(r);
  }
  railSeg(0.12, d, DECK.x1 + 0.06, cz);
  railSeg(0.12, d, DECK.x2 - 0.06, cz);
  railSeg(w, 0.12, cx, DECK.z1 + 0.06);
  railSeg((DECK.x1 + DECK.x2) / 2 - cx + (RAMP.x1 - DECK.x1), 0.12, (DECK.x1 + RAMP.x1) / 2, DECK.z2 - 0.06);
  railSeg((DECK.x2 - RAMP.x2), 0.12, (RAMP.x2 + DECK.x2) / 2, DECK.z2 - 0.06);
}

function buildLandmarks() {
  /* 灯塔（西南角外海）—— 旋转光束地标 */
  var lg = new THREE.Group();
  var white = lambert(0xd8d4c8), red = lambert(0xa03c30);
  for (var i = 0; i < 5; i++) {
    var seg = new THREE.Mesh(new THREE.CylinderGeometry(1.7 - i * 0.14, 1.85 - i * 0.14, 3.2, 10), i % 2 ? red : white);
    seg.position.y = 1.6 + i * 3.2;
    lg.add(seg);
  }
  var lampRoom = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.3, 1.8, 8), lambert(0x2c3238));
  lampRoom.position.y = 17.2; lg.add(lampRoom);
  var lampGlow = new THREE.Mesh(new THREE.SphereGeometry(0.75, 10, 8),
    new THREE.MeshBasicMaterial({ color: 0xffe9a8 }));
  lampGlow.position.y = 17.2; lg.add(lampGlow);
  var cap = new THREE.Mesh(new THREE.ConeGeometry(1.35, 1.4, 8), red);
  cap.position.y = 18.8; lg.add(cap);
  // 旋转光束
  var beam = new THREE.Mesh(new THREE.ConeGeometry(2.6, 22, 10, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xfff2c0, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false }));
  beam.rotation.z = Math.PI / 2;
  beam.position.x = 11;
  var beamPivot = new THREE.Group();
  beamPivot.position.y = 17.2;
  beamPivot.add(beam);
  lg.add(beamPivot);
  lg.position.set(-58, 0, -58);
  scene.add(lg);
  G.beamPivot = beamPivot;

  /* 港口吊机（东侧墙外水面） */
  function crane(x, z, h, color) {
    var g = new THREE.Group();
    var m = lambert(color);
    var leg1 = new THREE.Mesh(new THREE.BoxGeometry(1.4, h, 1.4), m); leg1.position.set(-4, h / 2, 0);
    var leg2 = leg1.clone(); leg2.position.x = 4;
    var top = new THREE.Mesh(new THREE.BoxGeometry(13, 1.4, 2), m); top.position.set(0, h + 0.7, 0);
    var arm = new THREE.Mesh(new THREE.BoxGeometry(2, 1, 16), m); arm.position.set(0, h + 1.6, -6);
    var cable = new THREE.Mesh(new THREE.BoxGeometry(0.12, 5, 0.12), lambert(0x222222));
    cable.position.set(0, h - 1, -11);
    var hook = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), lambert(0x333a40));
    hook.position.set(0, h - 3.6, -11);
    g.add(leg1); g.add(leg2); g.add(top); g.add(arm); g.add(cable); g.add(hook);
    g.position.set(x, 0, z);
    scene.add(g);
  }
  crane(58, -26, 17, 0xb08a34);
  crane(64, 12, 21, 0x7a8894);

  /* 远处泊船剪影 */
  var ship = new THREE.Group();
  var hull = new THREE.Mesh(new THREE.BoxGeometry(26, 4, 7), lambert(0x3c4a56));
  hull.position.y = 1.2;
  var bridge = new THREE.Mesh(new THREE.BoxGeometry(4, 4.5, 5), lambert(0x5a6a76));
  bridge.position.set(-9, 5, 0);
  ship.add(hull); ship.add(bridge);
  ship.position.set(85, -0.5, -6);
  scene.add(ship);
}

function buildDevice() {
  var group = new THREE.Group();
  // 警示条纹基座
  var baseMat = new THREE.MeshLambertMaterial({ map: hazardTexture() });
  var base = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.5, 1.3), baseMat);
  base.position.y = 0.25;
  group.add(base);
  // 装置主体（琥珀色发光箱体 + 黑色面板）
  var body = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.6, 0.6), lambert(0x3a3f46, { emissive: 0x141210 }));
  body.position.y = 0.85;
  group.add(body);
  var core = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.34, 0.1),
    new THREE.MeshBasicMaterial({ color: 0xffb42c }));
  core.position.set(0, 0.88, 0.31);
  group.add(core);
  // 顶部警示灯
  var blink = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8),
    new THREE.MeshBasicMaterial({ color: 0xff4030 }));
  blink.position.set(0, 1.32, 0);
  group.add(blink);
  var mast = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.22, 6), lambert(0x222222));
  mast.position.y = 1.2;
  group.add(mast);
  group.position.set(0, 0, -35);
  scene.add(group);
  // 交互光圈
  var ring = new THREE.Mesh(new THREE.RingGeometry(DEFUSE_RANGE - 0.18, DEFUSE_RANGE, 48),
    new THREE.MeshBasicMaterial({ color: 0xffb42c, transparent: true, opacity: 0.4, side: THREE.DoubleSide, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(0, 0.03, -35);
  scene.add(ring);
  // 远距可见的目标光柱（目标标记）
  var beam = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.85, 34, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffc850, transparent: true, opacity: 0.13, side: THREE.DoubleSide, depthWrite: false }));
  beam.position.set(0, 17, -35);
  scene.add(beam);

  device = {
    x: 0, y: 0.9, z: -35,
    group: group, blink: blink, core: core, ring: ring, beam: beam,
    state: 'armed'      // armed | defused
  };
}

function buildWeapon() {
  weaponGroup = new THREE.Group();
  var dark = lambert(0x252a30), mid = lambert(0x3c4650);
  var receiver = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.1, 0.36), dark);
  var barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.24, 8), mid);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.02, -0.28);
  var grip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.14, 0.07), mid);
  grip.position.set(0, -0.1, 0.1);
  grip.rotation.x = 0.3;
  var sight = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.045, 0.05), dark);
  sight.position.set(0, 0.075, -0.05);
  var accent = new THREE.Mesh(new THREE.BoxGeometry(0.078, 0.03, 0.1), lambert(0x35d0c0, { emissive: 0x0c3532 }));
  accent.position.set(0, -0.02, -0.1);
  weaponGroup.add(receiver); weaponGroup.add(barrel); weaponGroup.add(grip);
  weaponGroup.add(sight); weaponGroup.add(accent);

  // 枪口闪光（面片 + 点光）
  muzzleFlash = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.16),
    new THREE.MeshBasicMaterial({ color: 0xffd98a, transparent: true, opacity: 0, depthWrite: false }));
  muzzleFlash.position.set(0, 0.02, -0.42);
  weaponGroup.add(muzzleFlash);
  muzzleLight = new THREE.PointLight(0xffc36b, 0, 5, 2);
  muzzleLight.position.set(0, 0, -0.5);
  weaponGroup.add(muzzleLight);

  weaponGroup.position.set(0.24, -0.22, -0.5);
  weaponGroup.rotation.y = -0.04;
  camera.add(weaponGroup);
  scene.add(camera);
}

/* ============================================================
 * 敌人：原创低多边形守卫（巡逻/警觉/追击/攻击/受击/死亡）
 * ============================================================ */
var ENEMY_DEFS = [
  { id: 'E1', x: -24, z: -14, wp: [[-24, -14], [-24, 10], [-10, 16]], color: 0xb0502e },
  { id: 'E2', x: 24, z: 12, wp: [[24, 12], [10, 16], [16, -2]], color: 0xa84438 },
  { id: 'E3', x: 24, z: -10, wp: [[20, -13], [28, -6]], color: 0x8f3b2b },          // 高台哨卫
  { id: 'E4', x: 0, z: -28, wp: [[-6, -30], [6, -30], [0, -24.5]], color: 0xc05a28 }, // 仓库内守卫
  { id: 'E5', x: 4, z: -6, wp: [[4, -6], [-6, 2], [6, 8]], color: 0x9c4f2f }
];

function buildEnemyMesh(color) {
  var g = new THREE.Group();
  var cloth = lambert(color);
  var dark = lambert(0x2b2f36);
  var skin = lambert(0xc9a184);

  var legL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.5, 0.16), dark);
  legL.position.set(-0.11, 0.25, 0);
  var legR = legL.clone(); legR.position.x = 0.11;
  var torso = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.62, 0.27), cloth);
  torso.position.y = 0.81;
  var vest = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.34, 0.31), dark);
  vest.position.y = 0.88;
  var head = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.26, 0.26), skin);
  head.position.y = 1.3;
  var cap = new THREE.Mesh(new THREE.BoxGeometry(0.29, 0.09, 0.29), dark);
  cap.position.y = 1.46;
  var gun = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.09, 0.6), dark);
  gun.position.set(0.26, 1.02, 0.22);
  var arm = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.34, 0.11), cloth);
  arm.position.set(0.28, 1.06, 0.02);
  arm.rotation.x = -0.9;
  // 状态指示灯（头顶菱形）：灰=巡逻 黄=警觉 红=交战
  var indicator = new THREE.Mesh(new THREE.OctahedronGeometry(0.1),
    new THREE.MeshBasicMaterial({ color: 0x777777 }));
  indicator.position.y = 1.78;

  g.add(legL); g.add(legR); g.add(torso); g.add(vest); g.add(head);
  g.add(cap); g.add(gun); g.add(arm); g.add(indicator);
  g.traverse(function (o) { if (o.isMesh) o.castShadow = true; });

  torso.userData.part = 'body';
  vest.userData.part = 'body';
  head.userData.part = 'head';
  cap.userData.part = 'head';
  return { group: g, torso: torso, vest: vest, head: head, cap: cap, indicator: indicator, clothMat: cloth };
}

function spawnEnemies() {
  for (var i = 0; i < enemies.length; i++) scene.remove(enemies[i].parts.group);
  enemies = [];
  for (var d = 0; d < ENEMY_DEFS.length; d++) {
    var def = ENEMY_DEFS[d];
    var parts = buildEnemyMesh(def.color);
    var e = {
      id: def.id,
      def: def,
      parts: parts,
      x: def.x, z: def.z,
      facing: rand(0, Math.PI * 2),
      hp: ENEMY_HP,
      state: 'patrol',      // patrol|alert|chase|attack|stagger|dead
      alive: true,
      wpIndex: 0,
      stateT: 0,
      fireT: rand(0.5, 1.5),
      strafeDir: Math.random() < 0.5 ? -1 : 1,
      strafeT: rand(1, 2),
      losT: rand(0, 0.2),   // 视线检测错峰
      losOk: false,
      lostT: 0,
      flash: 0,
      deathT: 0,
      hitMeshes: []
    };
    var self = e;
    [parts.torso, parts.vest, parts.head, parts.cap].forEach(function (m) {
      m.userData.eid = self.id;
      self.hitMeshes.push(m);
    });
    parts.group.position.set(e.x, groundHeightAt(e.x, e.z), e.z);
    scene.add(parts.group);
    enemies.push(e);
  }
}

function enemyById(id) {
  for (var i = 0; i < enemies.length; i++) if (enemies[i].id === id) return enemies[i];
  return null;
}

function aliveEnemies() {
  var n = 0;
  for (var i = 0; i < enemies.length; i++) if (enemies[i].alive) n++;
  return n;
}

/* 视线检测：两点间无实心遮挡 */
function losClear(ax, ay, az, bx, by, bz) {
  tmpV1.set(bx - ax, by - ay, bz - az);
  var dist = tmpV1.length();
  if (dist < 0.001) return true;
  tmpV1.multiplyScalar(1 / dist);
  raycaster.set(tmpV2.set(ax, ay, az), tmpV1);
  raycaster.near = 0.01;
  raycaster.far = dist - 0.05;
  var hits = raycaster.intersectObjects(solidMeshes, false);
  return hits.length === 0;
}

function enemySetState(e, s) {
  e.state = s;
  e.stateT = 0;
  var ind = e.parts.indicator;
  if (s === 'patrol') ind.material.color.setHex(0x777777);
  else if (s === 'alert') ind.material.color.setHex(0xffd23c);
  else if (s === 'chase' || s === 'attack') ind.material.color.setHex(0xff4030);
  else if (s === 'dead') ind.visible = false;
}

function damageEnemy(e, dmg, part, hitPoint) {
  if (!e.alive) return;
  e.hp -= dmg;
  e.flash = 1;
  spawnSparks(hitPoint.x, hitPoint.y, hitPoint.z, 'enemy');
  if (e.hp <= 0) {
    e.alive = false;
    enemySetState(e, 'dead');
    e.deathT = 0;
    G.stats.kills++;
    AudioSys.kill();
    showHitmarker(true);
    if (aliveEnemies() === 0) {
      G.cleared = true;
      setObjective('defuse');
      showBanner('区域已肃清！前往北侧仓库，拆除发光装置', 4);
    }
  } else {
    // 受击：短暂硬直并立即警觉
    enemySetState(e, 'stagger');
    e.losOk = true;
    AudioSys.hit();
    showHitmarker(false);
  }
}

function updateEnemy(e, dt) {
  var grp = e.parts.group;

  if (!e.alive) {
    // 死亡倒地
    if (e.deathT < 0.5) {
      e.deathT += dt;
      grp.rotation.x = -Math.PI / 2 * Math.min(1, e.deathT / 0.45);
      grp.position.y = groundHeightAt(e.x, e.z) + 0.1 * Math.min(1, e.deathT / 0.45);
    }
    return;
  }

  // 受击闪白
  if (e.flash > 0) {
    e.flash = Math.max(0, e.flash - dt * 4);
    e.parts.clothMat.emissive.setRGB(e.flash * 0.7, e.flash * 0.25, e.flash * 0.15);
  }

  e.stateT += dt;
  e.fireT -= dt;
  var px = playerPos.x, pz = playerPos.z;
  var dx = px - e.x, dz = pz - e.z;
  var dist = Math.sqrt(dx * dx + dz * dz);

  // 视线（错峰检测，敌人眼高 1.45 + 地面）
  e.losT -= dt;
  if (e.losT <= 0) {
    e.losT = 0.18;
    var gy = groundHeightAt(e.x, e.z);
    e.losOk = losClear(e.x, gy + 1.45, e.z, px, playerPos.y - 0.15, pz);
  }

  // 感知：视锥内 + 视线通畅，或被枪声惊动
  var noticed = false;
  if (e.losOk && dist < 28) {
    if (dist < 6) noticed = true;
    else {
      var fx = Math.sin(e.facing), fz = Math.cos(e.facing);
      var dot = (dx * fx + dz * fz) / (dist || 1);
      if (dot > 0.42) noticed = true;
    }
  }
  var heard = G.noiseT > 0 && dist < 32;

  switch (e.state) {
    case 'patrol': {
      if (noticed || heard) { enemySetState(e, 'alert'); break; }
      var wp = e.def.wp[e.wpIndex];
      var wx = wp[0] - e.x, wz = wp[1] - e.z;
      var wd = Math.sqrt(wx * wx + wz * wz);
      if (wd < 0.5) {
        e.wpIndex = (e.wpIndex + 1) % e.def.wp.length;
      } else {
        e.facing = lerpAngle(e.facing, Math.atan2(wx, wz), dt * 5);
        moveEntity(e, Math.sin(e.facing) * 1.7 * dt, Math.cos(e.facing) * 1.7 * dt);
      }
      break;
    }
    case 'alert': {
      e.facing = lerpAngle(e.facing, Math.atan2(dx, dz), dt * 8);
      if (e.stateT > 0.75) enemySetState(e, 'chase');
      break;
    }
    case 'chase': {
      if (e.losOk) e.lostT = 0; else e.lostT += dt;
      if (e.lostT > 5) { enemySetState(e, 'patrol'); break; }
      e.facing = lerpAngle(e.facing, Math.atan2(dx, dz), dt * 6);
      if (dist < 13 && e.losOk) { enemySetState(e, 'attack'); break; }
      // 朝玩家推进（视线丢失时朝最后方向）
      moveEntity(e, Math.sin(e.facing) * 3.0 * dt, Math.cos(e.facing) * 3.0 * dt);
      break;
    }
    case 'attack': {
      if (e.losOk) e.lostT = 0; else e.lostT += dt;
      if (e.lostT > 1.4 || dist > 17) { enemySetState(e, 'chase'); break; }
      e.facing = lerpAngle(e.facing, Math.atan2(dx, dz), dt * 8);
      // 横向游走寻找射击位置
      e.strafeT -= dt;
      if (e.strafeT <= 0) { e.strafeT = rand(0.9, 1.8); e.strafeDir *= -1; }
      var sx = Math.cos(e.facing) * e.strafeDir, sz = -Math.sin(e.facing) * e.strafeDir;
      if (dist > 7) moveEntity(e, sx * 1.5 * dt, sz * 1.5 * dt);
      // 开火
      if (e.fireT <= 0 && e.losOk) {
        e.fireT = rand(1.05, 1.65);
        enemyShoot(e, dist);
      }
      break;
    }
    case 'stagger': {
      if (e.stateT > 0.32) enemySetState(e, e.losOk ? 'attack' : 'chase');
      break;
    }
  }

  // 与玩家保持最小间距
  if (dist < 0.9 && dist > 0.001) {
    e.x -= dx / dist * (0.9 - dist);
    e.z -= dz / dist * (0.9 - dist);
  }

  grp.position.set(e.x, groundHeightAt(e.x, e.z), e.z);
  grp.rotation.y = e.facing;
  // 行走摆动
  if (e.state === 'patrol' || e.state === 'chase') {
    grp.position.y += Math.abs(Math.sin(e.stateT * 8)) * 0.05;
  }
}

function lerpAngle(a, b, t) {
  var d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * Math.min(1, t);
}

/* 敌人开火：曳光 + 枪口闪光 + 按距离命中判定 */
function enemyShoot(e, dist) {
  var gy = groundHeightAt(e.x, e.z);
  var mx = e.x + Math.sin(e.facing) * 0.55;
  var my = gy + 1.1;
  var mz = e.z + Math.cos(e.facing) * 0.55;
  var p = dist < 8 ? 0.55 : (dist < 16 ? 0.38 : 0.24);
  var hit = Math.random() < p;
  var tx = playerPos.x, ty = playerPos.y - 0.1, tz = playerPos.z;
  if (!hit) {
    tx += rand(-1.6, 1.6); ty += rand(-0.9, 0.9); tz += rand(-1.6, 1.6);
  }
  spawnTracer(mx, my, mz, tx, ty, tz, 0xff6a4a);
  flashAt(mx, my, mz);
  AudioSys.enemyShoot();
  if (hit) damagePlayer(rand(6, 10), e.x, e.z);
}

/* ============================================================
 * 玩家武器：射击 / 换弹 / 空仓反馈
 * ============================================================ */
function playerShoot() {
  if (G.phase !== 'playing' || G.paused) return false;
  if (G.fireCd > 0 || G.reloading) return false;
  if (G.ammo <= 0) {
    G.fireCd = 0.24;
    AudioSys.dryFire();
    showHint('弹匣已空 — 按 R 换弹', 1.6);
    return false;
  }
  G.fireCd = FIRE_INTERVAL;
  G.ammo--;
  G.stats.shots++;
  G.noiseT = 0.6; // 枪声惊动附近敌人

  // 后坐与镜头反馈
  G.recoil = Math.min(0.05, G.recoil + 0.02);
  G.pitch += 0.011;
  if (!G.reducedMotion) G.shake = Math.min(0.5, G.shake + 0.12);

  // 枪口闪光
  muzzleFlash.material.opacity = 0.95;
  muzzleFlash.rotation.z = Math.random() * Math.PI;
  muzzleFlash.scale.setScalar(rand(0.8, 1.3));
  muzzleLight.intensity = 2.2;

  // 命中射线：敌人和实心遮挡取最近者（不能隔墙命中）
  scene.updateMatrixWorld();
  raycaster.setFromCamera(ZERO_NDC, camera);
  raycaster.near = 0.05;
  raycaster.far = 120;
  var targets = [];
  for (var i = 0; i < enemies.length; i++) {
    if (enemies[i].alive) targets = targets.concat(enemies[i].hitMeshes);
  }
  var allHits = raycaster.intersectObjects(targets.concat(solidMeshes), false);
  var endPoint = null;
  if (allHits.length > 0) {
    var h = allHits[0];
    endPoint = h.point;
    if (h.object.userData.eid) {
      var e = enemyById(h.object.userData.eid);
      var part = h.object.userData.part;
      G.stats.hits++;
      damageEnemy(e, part === 'head' ? DMG_HEAD : DMG_BODY, part, h.point);
    } else {
      spawnSparks(h.point.x, h.point.y, h.point.z, 'wall');
    }
  } else {
    endPoint = tmpV3.copy(raycaster.ray.direction).multiplyScalar(90).add(camera.position);
  }

  // 曳光从枪口出发
  var mw = muzzleWorldPos();
  spawnTracer(mw.x, mw.y, mw.z, endPoint.x, endPoint.y, endPoint.z, 0xffe08a);
  AudioSys.shoot();
  return true;
}

var ZERO_NDC = new THREE.Vector2(0, 0);

function muzzleWorldPos() {
  return weaponGroup.localToWorld(tmpV1.set(0, 0.02, -0.42));
}

function startReload() {
  if (G.phase !== 'playing' || G.paused) return;
  if (G.reloading || G.ammo >= MAG_SIZE || G.reserve <= 0) return;
  G.reloading = true;
  G.reloadT = RELOAD_TIME;
  AudioSys.reload();
  showHint('换弹中…', RELOAD_TIME);
}

function finishReload() {
  var need = MAG_SIZE - G.ammo;
  var take = Math.min(need, G.reserve);
  G.ammo += take;
  G.reserve -= take;
  G.reloading = false;
}

/* ============================================================
 * 特效池：曳光 / 火花（减少每帧分配）
 * ============================================================ */
var tracers = [];
var sparks = [];
var flashPool = [];

function initFxPools() {
  var i;
  for (i = 0; i < 20; i++) {
    var t = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.025, 1),
      new THREE.MeshBasicMaterial({ color: 0xffe08a, transparent: true, opacity: 0 }));
    t.visible = false;
    scene.add(t);
    tracers.push({ mesh: t, life: 0, max: 0.09 });
  }
  var sparkGeo = new THREE.BoxGeometry(0.05, 0.05, 0.05);
  for (i = 0; i < 48; i++) {
    var s = new THREE.Mesh(sparkGeo, new THREE.MeshBasicMaterial({ color: 0xffc26b }));
    s.visible = false;
    scene.add(s);
    sparks.push({ mesh: s, vel: new THREE.Vector3(), life: 0 });
  }
  for (i = 0; i < 6; i++) {
    var f = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.34),
      new THREE.MeshBasicMaterial({ color: 0xffb36a, transparent: true, opacity: 0, depthWrite: false }));
    f.visible = false;
    scene.add(f);
    flashPool.push({ mesh: f, life: 0 });
  }
}

function spawnTracer(x1, y1, z1, x2, y2, z2, color) {
  for (var i = 0; i < tracers.length; i++) {
    var t = tracers[i];
    if (t.life > 0) continue;
    t.life = t.max;
    t.mesh.visible = true;
    t.mesh.material.color.setHex(color);
    t.mesh.material.opacity = 0.9;
    tmpV1.set(x2 - x1, y2 - y1, z2 - z1);
    var len = tmpV1.length();
    t.mesh.position.set((x1 + x2) / 2, (y1 + y2) / 2, (z1 + z2) / 2);
    t.mesh.scale.set(1, 1, Math.max(0.1, len));
    t.mesh.lookAt(x2, y2, z2);
    return;
  }
}

function spawnSparks(x, y, z, kind) {
  var n = G.reducedMotion ? 4 : 9;
  var color = kind === 'enemy' ? 0xff5a3c : 0xffc26b;
  for (var i = 0, c = 0; i < sparks.length && c < n; i++) {
    var s = sparks[i];
    if (s.life > 0) continue;
    c++;
    s.life = rand(0.2, 0.38);
    s.mesh.visible = true;
    s.mesh.material.color.setHex(color);
    s.mesh.position.set(x, y, z);
    s.vel.set(rand(-1.8, 1.8), rand(0.5, 3), rand(-1.8, 1.8));
  }
}

function flashAt(x, y, z) {
  for (var i = 0; i < flashPool.length; i++) {
    var f = flashPool[i];
    if (f.life > 0) continue;
    f.life = 0.07;
    f.mesh.visible = true;
    f.mesh.material.opacity = 0.9;
    f.mesh.position.set(x, y, z);
    f.mesh.lookAt(camera.position);
    return;
  }
}

function updateFx(dt) {
  var i;
  for (i = 0; i < tracers.length; i++) {
    var t = tracers[i];
    if (t.life <= 0) continue;
    t.life -= dt;
    t.mesh.material.opacity = Math.max(0, t.life / t.max) * 0.9;
    if (t.life <= 0) t.mesh.visible = false;
  }
  for (i = 0; i < sparks.length; i++) {
    var s = sparks[i];
    if (s.life <= 0) continue;
    s.life -= dt;
    s.vel.y -= 9 * dt;
    s.mesh.position.addScaledVector(s.vel, dt);
    if (s.mesh.position.y < 0.03) { s.mesh.position.y = 0.03; s.vel.y *= -0.4; }
    if (s.life <= 0) s.mesh.visible = false;
  }
  for (i = 0; i < flashPool.length; i++) {
    var f = flashPool[i];
    if (f.life <= 0) continue;
    f.life -= dt;
    if (f.life <= 0) { f.mesh.visible = false; f.mesh.material.opacity = 0; }
  }
  // 枪口闪光衰减
  if (muzzleFlash.material.opacity > 0) {
    muzzleFlash.material.opacity = Math.max(0, muzzleFlash.material.opacity - dt * 14);
  }
  if (muzzleLight.intensity > 0) {
    muzzleLight.intensity = Math.max(0, muzzleLight.intensity - dt * 22);
  }
  // 装置警示灯闪烁 + 光柱旋转 + 灯塔光束
  if (device) {
    var bl = (Math.sin(performance.now() * 0.008) > 0);
    device.blink.material.color.setHex(device.state === 'defused' ? 0x3cff70 : (bl ? 0xff4030 : 0x551512));
    device.ring.rotation.z += dt * 0.6;
    device.beam.rotation.y += dt * 0.5;
    var pulse = 0.1 + 0.05 * Math.sin(performance.now() * 0.004);
    device.beam.material.opacity = device.state === 'defused' ? 0.03 : pulse;
  }
  if (G.beamPivot && !G.reducedMotion) G.beamPivot.rotation.y += dt * 0.5;
}

/* ============================================================
 * 移动与碰撞（玩家与敌人共用）
 * ============================================================ */
function collideCircle(x, z, r) {
  // 返回修正后的位置（推出所有碰撞盒）
  for (var i = 0; i < colliders.length; i++) {
    var c = colliders[i];
    var nx = clamp(x, c.x1, c.x2);
    var nz = clamp(z, c.z1, c.z2);
    var dx = x - nx, dz = z - nz;
    var d2 = dx * dx + dz * dz;
    if (d2 < r * r) {
      if (d2 > 1e-9) {
        var d = Math.sqrt(d2);
        x = nx + dx / d * r;
        z = nz + dz / d * r;
      } else {
        // 圆心在盒内：沿最近边推出
        var pushL = x - c.x1 + r, pushR = c.x2 - x + r;
        var pushU = z - c.z1 + r, pushD = c.z2 - z + r;
        var m = Math.min(pushL, pushR, pushU, pushD);
        if (m === pushL) x = c.x1 - r;
        else if (m === pushR) x = c.x2 + r;
        else if (m === pushU) z = c.z1 - r;
        else z = c.z2 + r;
      }
    }
  }
  x = clamp(x, -MAP_BOUND, MAP_BOUND);
  z = clamp(z, -MAP_BOUND, MAP_BOUND);
  return { x: x, z: z };
}

/* 玩家位移：含台阶限制（不能直接走上 1.4m 高台侧面） */
function movePlayer(dx, dz) {
  var curG = playerPos.y - EYE;
  var nx = playerPos.x + dx, nz = playerPos.z + dz;
  var res = collideCircle(nx, nz, PLAYER_RADIUS);
  var newG = groundHeightAt(res.x, res.z);
  if (newG - curG > 0.6) {
    // 台阶过高：分轴尝试滑动
    var rx = collideCircle(playerPos.x + dx, playerPos.z, PLAYER_RADIUS);
    if (groundHeightAt(rx.x, rx.z) - curG <= 0.6) { playerPos.x = rx.x; }
    var rz = collideCircle(playerPos.x, playerPos.z + dz, PLAYER_RADIUS);
    if (groundHeightAt(playerPos.x, rz.z) - curG <= 0.6) { playerPos.z = rz.z; }
    return;
  }
  playerPos.x = res.x;
  playerPos.z = res.z;
}

/* 敌人位移（同一碰撞规则） */
function moveEntity(e, dx, dz) {
  var gy = groundHeightAt(e.x, e.z);
  var res = collideCircle(e.x + dx, e.z + dz, 0.4);
  if (groundHeightAt(res.x, res.z) - gy > 0.6) {
    var rx = collideCircle(e.x + dx, e.z, 0.4);
    if (groundHeightAt(rx.x, rx.z) - gy <= 0.6) { e.x = rx.x; e.z = rx.z; return; }
    var rz = collideCircle(e.x, e.z + dz, 0.4);
    if (groundHeightAt(rz.x, rz.z) - gy <= 0.6) { e.x = rz.x; e.z = rz.z; return; }
    return;
  }
  e.x = res.x; e.z = res.z;
}

/* ============================================================
 * 玩家受伤 / 死亡
 * ============================================================ */
function damagePlayer(amount, srcX, srcZ) {
  if (G.phase !== 'playing' || G.paused) return;
  G.hp = Math.max(0, G.hp - amount);
  AudioSys.hurt();
  if (!G.reducedMotion) G.shake = Math.min(0.7, G.shake + 0.3);
  // 受伤红晕
  vignetteT = 1;
  // 方向提示
  if (srcX !== undefined && srcX !== null) {
    var world = Math.atan2(srcX - playerPos.x, srcZ - playerPos.z);
    var fwd = Math.atan2(-Math.sin(G.yaw), -Math.cos(G.yaw));
    dmgDirAngle = world - fwd;
    dmgDirT = 1;
  }
  if (G.hp <= 0) endGame(false, '生命归零，训练失败');
}

/* ============================================================
 * 任务目标 / 拆除装置
 * ============================================================ */
function setObjective(state) {
  G.objectiveState = state; // 'eliminate' | 'defuse' | 'complete' | 'failed'
}

function nearDevice() {
  return dist2D(playerPos.x, playerPos.z, device.x, device.z) <= DEFUSE_RANGE;
}

function updateDefuse(dt) {
  if (G.objectiveState !== 'defuse') return;
  var near = nearDevice();
  if (near && Input.interactHeld) {
    G.defuseProgress += dt / DEFUSE_TIME;
    G.defuseTickT -= dt;
    if (G.defuseTickT <= 0) {
      G.defuseTickT = 0.24;
      AudioSys.defuseTick(G.defuseProgress);
    }
    if (G.defuseProgress >= 1) {
      G.defuseProgress = 1;
      device.state = 'defused';
      device.core.material.color.setHex(0x3cff70);
      setObjective('complete');
      endGame(true);
      return;
    }
  } else {
    // 松开或离开：进度回退
    G.defuseProgress = Math.max(0, G.defuseProgress - dt * 0.5);
  }
}

/* ============================================================
 * 游戏状态机
 * ============================================================ */
function resetRun() {
  G.timeLeft = MISSION_TIME;
  G.timeUsed = 0;
  G.hp = PLAYER_MAX_HP;
  G.ammo = MAG_SIZE;
  G.reserve = START_RESERVE;
  G.reloading = false;
  G.reloadT = 0;
  G.fireCd = 0;
  G.defuseProgress = 0;
  G.defuseTickT = 0;
  G.cleared = false;
  G.recoil = 0; G.shake = 0; G.noiseT = 0;
  G.alarmPlayed = false;
  G.stats = { shots: 0, hits: 0, kills: 0 };
  G.loseReason = '';
  Input.fireHeld = false;
  Input.interactHeld = false;
  Input.stickX = 0; Input.stickY = 0;
  setObjective('eliminate');

  // 玩家出生位姿：南门，面朝北侧仓库装置
  playerPos.set(0, EYE, 38);
  G.yaw = 0; G.pitch = 0;

  // 敌人复位
  spawnEnemies();

  // 装置复位
  device.state = 'armed';
  device.core.material.color.setHex(0xffb42c);

  // 清理特效
  var i;
  for (i = 0; i < tracers.length; i++) { tracers[i].life = 0; tracers[i].mesh.visible = false; }
  for (i = 0; i < sparks.length; i++) { sparks[i].life = 0; sparks[i].mesh.visible = false; }
  for (i = 0; i < flashPool.length; i++) { flashPool[i].life = 0; flashPool[i].mesh.visible = false; }
  vignetteT = 0; dmgDirT = 0;
}

function startGame() {
  AudioSys.init();
  AudioSys.resume();
  resetRun();
  G.phase = 'playing';
  G.paused = false;
  $('start-screen').classList.add('hidden');
  $('end-screen').classList.add('hidden');
  $('pause-screen').classList.add('hidden');
  $('hud').classList.remove('hidden');
  if (G.isTouch) $('touch-controls').classList.remove('hidden');
  requestAim();
  showBanner('肃清守卫（' + aliveEnemies() + '名）→ 拆除北侧仓库的发光装置', 4.5);
  updateHUD(true);
}

function pauseGame() {
  if (G.phase !== 'playing' || G.paused) return;
  G.paused = true;
  Input.fireHeld = false;
  Input.interactHeld = false;
  releaseAim();
  $('pause-screen').classList.remove('hidden');
}

function resumeGame() {
  if (G.phase !== 'playing' || !G.paused) return;
  G.paused = false;
  $('pause-screen').classList.add('hidden');
  requestAim();
}

function goMenu() {
  G.phase = 'menu';
  G.paused = false;
  releaseAim();
  $('pause-screen').classList.add('hidden');
  $('end-screen').classList.add('hidden');
  $('hud').classList.add('hidden');
  $('touch-controls').classList.add('hidden');
  $('start-screen').classList.remove('hidden');
  refreshBestRecord();
}

function endGame(win, reason) {
  if (G.phase !== 'playing') return;
  G.phase = win ? 'won' : 'lost';
  G.paused = false;
  Input.fireHeld = false;
  Input.interactHeld = false;
  if (!win) {
    G.loseReason = reason || '';
    setObjective('failed');
  }
  releaseAim();
  if (win) AudioSys.win(); else AudioSys.lose();

  // 结算面板
  var acc = G.stats.shots > 0 ? Math.round(G.stats.hits / G.stats.shots * 100) : 0;
  var score = G.stats.kills * 150 + G.stats.hits * 10 + (win ? Math.round(Math.max(0, G.timeLeft)) * 5 : 0);
  $('end-title').textContent = win ? '任务完成' : '任务失败';
  $('end-title').className = 'panel-title ' + (win ? 'win' : 'lose');
  $('end-sub').textContent = win
    ? '装置已拆除，海港仓库区安全。'
    : (reason || '任务失败') + '。';
  var bestNote = '';
  if (win) {
    var prev = loadBest();
    if (prev === null || G.timeUsed < prev) {
      saveBest(G.timeUsed);
      bestNote = ' ★ 新纪录';
    }
  }
  $('end-stats').innerHTML =
    row('用时', G.timeUsed.toFixed(1) + ' 秒' + bestNote) +
    row('击杀', G.stats.kills + ' / ' + enemies.length) +
    row('命中', G.stats.hits + ' / ' + G.stats.shots) +
    row('命中率', acc + '%') +
    row('剩余生命', Math.round(G.hp)) +
    row('得分', score);
  function row(k, v) { return '<div class="row"><span class="k">' + k + '</span><span class="v">' + v + '</span></div>'; }
  $('end-screen').classList.remove('hidden');
  refreshBestRecord();
}

/* ---------------- 最佳纪录（localStorage） ---------------- */
function loadBest() {
  try {
    var v = localStorage.getItem(STORAGE_KEY);
    if (v === null) return null;
    var n = parseFloat(v);
    return isFinite(n) ? n : null;
  } catch (e) { return null; }
}
function saveBest(t) {
  try { localStorage.setItem(STORAGE_KEY, String(t)); } catch (e) {}
}
function refreshBestRecord() {
  var b = loadBest();
  $('best-record').textContent = b === null
    ? '暂无通关纪录 — 来创下第一个纪录'
    : '最佳通关时间：' + b.toFixed(1) + ' 秒';
}

/* ============================================================
 * HUD
 * ============================================================ */
var vignetteT = 0, dmgDirT = 0, dmgDirAngle = 0;
var hudCache = {};
var hintT = 0, bannerT = 0;

function showHint(text, secs) {
  $('hint').textContent = text;
  hintT = secs || 2;
}
function showBanner(text, secs) {
  var b = $('banner');
  b.textContent = text;
  b.classList.remove('hidden');
  bannerT = secs || 3;
}
function showHitmarker(kill) {
  var h = $('hitmarker');
  h.classList.remove('show', 'kill');
  void h.offsetWidth; // 重启动画
  if (kill) h.classList.add('kill');
  h.classList.add('show');
}

function setText(id, v) {
  if (hudCache[id] === v) return;
  hudCache[id] = v;
  $(id).textContent = v;
}

function updateHUD(force) {
  // 生命
  var hp = Math.round(G.hp);
  setText('health-num', String(hp));
  var fill = $('health-fill');
  var pct = clamp(G.hp, 0, 100);
  if (hudCache.hpW !== pct || force) {
    hudCache.hpW = pct;
    fill.style.width = pct + '%';
    fill.className = pct > 55 ? '' : (pct > 25 ? 'mid' : 'low');
  }
  // 弹药
  setText('ammo-mag', String(G.ammo));
  setText('ammo-reserve', '/ ' + G.reserve);
  var magEl = $('ammo-mag');
  if (hudCache.magEmpty !== (G.ammo === 0) || force) {
    hudCache.magEmpty = G.ammo === 0;
    magEl.className = G.ammo === 0 ? 'empty' : '';
    magEl.id = 'ammo-mag';
  }
  // 敌人
  var left = aliveEnemies();
  setText('enemies-left', left > 0 ? '剩余敌人 ' + left : '区域已肃清');
  // 目标
  var objText = G.objectiveState === 'eliminate' ? '肃清区域守卫'
    : G.objectiveState === 'defuse' ? '拆除仓库内的发光装置'
    : G.objectiveState === 'complete' ? '装置已拆除' : '任务失败';
  setText('objective-text', objText);
  // 倒计时
  var t = Math.max(0, G.timeLeft);
  setText('timer', t.toFixed(1));
  var timerEl = $('timer');
  if (hudCache.tlow !== (t <= 15) || force) {
    hudCache.tlow = t <= 15;
    timerEl.className = t <= 15 ? 'low' : '';
    timerEl.id = 'timer';
  }
  // 目标方向箭头
  var arrow = $('obj-arrow');
  if (G.phase === 'playing' && G.objectiveState !== 'complete' && G.objectiveState !== 'failed') {
    arrow.classList.remove('hidden');
    var ang = Math.atan2(device.x - playerPos.x, device.z - playerPos.z);
    var fwd = Math.atan2(-Math.sin(G.yaw), -Math.cos(G.yaw));
    var rel = ang - fwd;
    arrow.style.transform = 'translateX(-50%) rotate(' + (-rel * 180 / Math.PI) + 'deg)';
  } else {
    arrow.classList.add('hidden');
  }
  // 拆除进度环
  var dw = $('defuse-wrap');
  var showDefuse = G.objectiveState === 'defuse' && (nearDevice() || G.defuseProgress > 0);
  if (showDefuse) {
    dw.classList.remove('hidden');
    $('defuse-ring').style.background =
      'conic-gradient(var(--accent) ' + (G.defuseProgress * 360) + 'deg, rgba(255,255,255,0.14) 0deg)';
    $('defuse-label').textContent = Input.interactHeld ? '拆除中…' : '长按 E 拆除';
  } else {
    dw.classList.add('hidden');
  }
  // 受伤反馈
  var vg = $('vignette');
  vg.style.opacity = clamp(vignetteT, 0, 0.9);
  var di = $('dmg-indicator');
  if (dmgDirT > 0) {
    di.classList.remove('hidden');
    di.style.opacity = dmgDirT;
    di.style.transform = 'rotate(' + (dmgDirAngle * 180 / Math.PI) + 'deg)';
  } else {
    di.classList.add('hidden');
  }
  // 情境提示
  if (G.reloading) setText('hint', '换弹中…');
  else if (G.objectiveState === 'defuse' && nearDevice() && !Input.interactHeld) setText('hint', G.isTouch ? '按住「拆除」按钮' : '长按 E 拆除装置');
  else if (G.objectiveState === 'eliminate' && nearDevice()) setText('hint', '先肃清全部守卫');
  // 低血量常驻红晕
  if (G.hp < 30 && G.phase === 'playing') vg.style.opacity = Math.max(parseFloat(vg.style.opacity) || 0, 0.35);
}

function updateHintTimers(dt) {
  if (hintT > 0) {
    hintT -= dt;
    if (hintT <= 0) $('hint').textContent = '';
  }
  if (bannerT > 0) {
    bannerT -= dt;
    if (bannerT <= 0) $('banner').classList.add('hidden');
  }
  if (vignetteT > 0) vignetteT -= dt * 1.6;
  if (dmgDirT > 0) dmgDirT -= dt * 1.1;
}

function toggleMute() {
  AudioSys.init();
  AudioSys.setMuted(!G.muted);
  $('btn-mute').textContent = G.muted ? '🔇' : '🔊';
}

/* ============================================================
 * 主更新循环
 * ============================================================ */
function update(dt) {
  if (G.phase !== 'playing' || G.paused) return;

  G.timeUsed += dt;
  G.timeLeft -= dt;
  if (G.timeLeft <= 0) {
    G.timeLeft = 0;
    endGame(false, '倒计时结束，装置引爆');
    updateHUD(true);
    return;
  }
  if (G.timeLeft <= 15 && !G.alarmPlayed) {
    G.alarmPlayed = true;
    AudioSys.alarm();
    showBanner('警告：剩余 15 秒！', 2.5);
  }

  // 冷却与换弹
  if (G.fireCd > 0) G.fireCd -= dt;
  if (G.reloading) {
    G.reloadT -= dt;
    if (G.reloadT <= 0) finishReload();
  }
  if (G.noiseT > 0) G.noiseT -= dt;
  if (G.recoil > 0) G.recoil = Math.max(0, G.recoil - dt * 0.25);
  if (G.shake > 0) G.shake = Math.max(0, G.shake - dt * 2.4);

  // 视角增量（鼠标/触屏拖拽）
  var sens = G.isTouch ? TOUCH_SENS : MOUSE_SENS;
  G.yaw -= Input.lookDX * sens;
  G.pitch -= Input.lookDY * sens;
  G.pitch = clamp(G.pitch, -1.45, 1.45);
  Input.lookDX = 0; Input.lookDY = 0;

  // 移动输入
  var f = 0, r = 0;
  if (Input.keys['KeyW'] || Input.keys['ArrowUp']) f += 1;
  if (Input.keys['KeyS'] || Input.keys['ArrowDown']) f -= 1;
  if (Input.keys['KeyD'] || Input.keys['ArrowRight']) r += 1;
  if (Input.keys['KeyA'] || Input.keys['ArrowLeft']) r -= 1;
  f += -Input.stickY;
  r += Input.stickX;
  var len = Math.sqrt(f * f + r * r);
  if (len > 1) { f /= len; r /= len; }
  if (f !== 0 || r !== 0) {
    var sin = Math.sin(G.yaw), cos = Math.cos(G.yaw);
    var dx = (-sin * f + cos * r) * PLAYER_SPEED * dt;
    var dz = (-cos * f - sin * r) * PLAYER_SPEED * dt;
    movePlayer(dx, dz);
  }

  // 持续开火（按住左键/开火键）
  if (Input.fireHeld) playerShoot();

  // 敌人 AI
  for (var i = 0; i < enemies.length; i++) updateEnemy(enemies[i], dt);

  // 拆除
  updateDefuse(dt);

  // 特效与 HUD
  updateFx(dt);
  updateHintTimers(dt);
  updateHUD(false);
}

/* 相机同步（含地面高度平滑、后坐、震动） */
var camGroundY = 0;
function syncCamera(dt) {
  var gy = groundHeightAt(playerPos.x, playerPos.z);
  camGroundY = dt ? lerp(camGroundY, gy, Math.min(1, dt * 10)) : gy;
  if (Math.abs(camGroundY - gy) > 1.2) camGroundY = gy; // 跌落时快速贴合
  playerPos.y = camGroundY + EYE;

  camera.position.copy(playerPos);
  if (G.shake > 0 && !G.reducedMotion) {
    camera.position.x += (Math.random() - 0.5) * 0.05 * G.shake;
    camera.position.y += (Math.random() - 0.5) * 0.05 * G.shake;
  }
  camera.rotation.y = G.yaw;
  camera.rotation.x = G.pitch + G.recoil;
  camera.rotation.z = 0;
  // 武器后坐位移
  if (weaponGroup) {
    weaponGroup.position.z = -0.5 + G.recoil * 1.6;
    weaponGroup.rotation.x = G.recoil * 1.2;
  }
  camera.updateMatrixWorld();
}

/* ---------------- rAF 主循环（唯一） ---------------- */
var lastT = 0;
function frame(now) {
  requestAnimationFrame(frame);
  if (!lastT) lastT = now;
  var dt = Math.min(0.05, (now - lastT) / 1000);
  lastT = now;
  // 手动时钟模式下，真实 rAF 不推进玩法状态
  if (!G.manual) update(dt);
  syncCamera(dt);
  renderer.render(scene, camera);
}

/* ============================================================
 * 统一测试接口 window.__BREACH_TEST__
 * ============================================================ */
function stepGame(ms) {
  if (!G.manual) return;
  if (G.phase !== 'playing' || G.paused) return; // 暂停时 step 不推进
  var remain = Math.max(0, ms);
  while (remain > 0) {
    var h = Math.min(50, remain);
    update(h / 1000);
    remain -= h;
    if (G.phase !== 'playing') break;
  }
  syncCamera(0);
}

window.__BREACH_TEST__ = {
  snapshot: function () {
    return {
      phase: G.phase,
      paused: G.paused,
      timeLeft: round3(G.timeLeft),
      timeUsed: round3(G.timeUsed),
      player: {
        x: round3(playerPos.x), y: round3(playerPos.y), z: round3(playerPos.z),
        yaw: round3(G.yaw), pitch: round3(G.pitch),
        hp: round3(G.hp), ammo: G.ammo, reserve: G.reserve, reloading: G.reloading
      },
      enemies: enemies.map(function (e) {
        return {
          id: e.id, x: round3(e.x), y: round3(groundHeightAt(e.x, e.z)), z: round3(e.z),
          hp: round3(e.hp), state: e.state, alive: e.alive
        };
      }),
      objective: {
        state: G.objectiveState,
        progress: round3(G.defuseProgress),
        x: device.x, y: device.y, z: device.z
      },
      stats: {
        shots: G.stats.shots, hits: G.stats.hits, kills: G.stats.kills,
        best: loadBest()
      },
      renderer: {
        isWebGL: renderer instanceof THREE.WebGLRenderer,
        width: renderer.domElement.width,
        height: renderer.domElement.height,
        threeRevision: THREE.REVISION
      }
    };
  },
  start: function () { startGame(); },
  restart: function () { startGame(); },
  pause: function () { pauseGame(); },
  resume: function () { resumeGame(); },
  setManualClock: function (enabled) { G.manual = !!enabled; },
  step: function (ms) { stepGame(ms); },
  setPlayerPose: function (pose) {
    if (!pose) return;
    if (typeof pose.x === 'number') playerPos.x = clamp(pose.x, -MAP_BOUND, MAP_BOUND);
    if (typeof pose.z === 'number') playerPos.z = clamp(pose.z, -MAP_BOUND, MAP_BOUND);
    var res = collideCircle(playerPos.x, playerPos.z, PLAYER_RADIUS);
    playerPos.x = res.x; playerPos.z = res.z;
    if (typeof pose.yaw === 'number') G.yaw = pose.yaw;
    if (typeof pose.pitch === 'number') G.pitch = clamp(pose.pitch, -1.45, 1.45);
    camGroundY = groundHeightAt(playerPos.x, playerPos.z);
    playerPos.y = camGroundY + EYE;
    syncCamera(0);
  },
  move: function (forward, right, ms) {
    var f = clamp(Number(forward) || 0, -1, 1);
    var r = clamp(Number(right) || 0, -1, 1);
    var remain = Math.max(0, ms || 0);
    while (remain > 0) {
      var h = Math.min(50, remain) / 1000;
      remain -= h * 1000;
      var sin = Math.sin(G.yaw), cos = Math.cos(G.yaw);
      movePlayer((-sin * f + cos * r) * PLAYER_SPEED * h, (-cos * f - sin * r) * PLAYER_SPEED * h);
    }
    var gy = groundHeightAt(playerPos.x, playerPos.z);
    camGroundY = gy;
    playerPos.y = gy + EYE;
    syncCamera(0);
  },
  aimAtEnemy: function (id) {
    var e = enemyById(id);
    if (!e) return false;
    var gy = groundHeightAt(e.x, e.z);
    var tx = e.x, ty = gy + 1.1, tz = e.z;
    var dx = tx - playerPos.x, dy = ty - playerPos.y, dz = tz - playerPos.z;
    G.pitch = clamp(Math.atan2(dy, Math.sqrt(dx * dx + dz * dz)), -1.45, 1.45);
    G.yaw = Math.atan2(-dx, -dz);
    syncCamera(0);
    return true;
  },
  shoot: function () { return playerShoot(); },
  reload: function () { startReload(); },
  damagePlayer: function (amount) { damagePlayer(amount, null, null); },
  eliminateEnemy: function (id) {
    var e = enemyById(id);
    if (!e || !e.alive) return false;
    damageEnemy(e, 99999, 'body', { x: e.x, y: groundHeightAt(e.x, e.z) + 1, z: e.z });
    return true;
  },
  interact: function (ms) {
    if (G.phase !== 'playing' || G.paused) return;
    var prev = Input.interactHeld;
    Input.interactHeld = true;
    var remain = Math.max(0, ms || 0);
    while (remain > 0) {
      var h = Math.min(50, remain);
      updateDefuse(h / 1000);
      remain -= h;
      if (G.phase !== 'playing') break;
    }
    Input.interactHeld = prev;
    updateHUD(true);
  }
};

/* ============================================================
 * 初始化
 * ============================================================ */
function onResize() {
  var w = window.innerWidth, h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
}

function bindUI() {
  $('btn-start').addEventListener('click', function () { startGame(); });
  $('btn-resume').addEventListener('click', function () { resumeGame(); });
  $('btn-restart-p').addEventListener('click', function () { startGame(); });
  $('btn-restart-e').addEventListener('click', function () { startGame(); });
  $('btn-menu-p').addEventListener('click', function () { goMenu(); });
  $('btn-menu-e').addEventListener('click', function () { goMenu(); });
  $('btn-pause').addEventListener('click', function () {
    if (G.phase !== 'playing') return;
    if (G.paused) resumeGame(); else pauseGame();
  });
  $('btn-restart').addEventListener('click', function () { if (G.phase === 'playing') startGame(); });
  $('btn-mute').addEventListener('click', toggleMute);
  $('btn-mute-p').addEventListener('click', toggleMute);
  document.addEventListener('visibilitychange', function () {
    if (document.hidden && G.phase === 'playing' && !G.paused) pauseGame();
  });
  window.addEventListener('resize', onResize);
}

function init() {
  G.reducedMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  G.isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  if (G.isTouch) document.body.classList.add('touch');

  playerPos = new THREE.Vector3(0, EYE, 38);
  raycaster = new THREE.Raycaster();
  tmpV1 = new THREE.Vector3();
  tmpV2 = new THREE.Vector3();
  tmpV3 = new THREE.Vector3();

  buildWorld();
  initFxPools();
  spawnEnemies();
  setObjective('eliminate');
  bindInput();
  bindUI();
  refreshBestRecord();
  syncCamera(0);
  onResize();
  requestAnimationFrame(frame);
}

try {
  if (!window.THREE) throw new Error('Three.js 未加载');
  init();
} catch (err) {
  var fe = $('fatal-error');
  fe.classList.remove('hidden');
  fe.innerHTML = '初始化失败：' + (err && err.message ? err.message : err) +
    '<br>请确认通过本地 HTTP 服务打开页面，且浏览器支持 WebGL。';
}

})();
