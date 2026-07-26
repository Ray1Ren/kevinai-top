/* ============================================================
 * Breach Point · 破门点 — 原创 3D 第一人称拆弹训练小游戏
 * 原生 JS + Three.js r147(本地 vendor),无外部资源。
 * ============================================================ */
(function () {
  'use strict';

  // ---------- 常量 ----------
  var EYE = 1.62;          // 眼睛离脚高度
  var PLAYER_R = 0.42;     // 玩家碰撞半径
  var SPEED = 4.6;         // 移动速度 m/s
  var MAG_SIZE = 12;
  var RESERVE_START = 24;
  var FIRE_CD = 0.15;      // 射速限制
  var RELOAD_TIME = 1.4;
  var SHOT_DMG = 12;
  var ROUND_TIME = 75;
  var DEFUSE_TIME = 1.5;
  var DEFUSE_DIST = 2.8;
  var MAP = { x0: -23.4, x1: 23.4, z0: -26.9, z1: 26.9 };

  var reducedMotion = false;
  try {
    reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (e) { /* 忽略 */ }
  var isTouch = false;
  try {
    isTouch = ('ontouchstart' in window) || (window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
  } catch (e) { /* 忽略 */ }

  // ---------- DOM ----------
  function $(id) { return document.getElementById(id); }
  var el = {
    viewport: $('viewport'), hud: $('hud'),
    timer: $('hud-timer'), objective: $('hud-objective'), enemies: $('hud-enemies'),
    hpFill: $('hp-fill'), hpNum: $('hp-num'),
    ammoMag: $('ammo-mag'), ammoRes: $('ammo-res'), ammoState: $('ammo-state'),
    crosshair: $('crosshair'), hitmarker: $('hitmarker'), objMarker: $('obj-marker'),
    vignette: $('vignette'), lowhp: $('lowhp'),
    dmg: { t: $('dmg-t'), b: $('dmg-b'), l: $('dmg-l'), r: $('dmg-r') },
    interactWrap: $('interact-wrap'), interactText: $('interact-text'), interactFill: $('interact-fill'),
    toast: $('toast'),
    ovMenu: $('ov-menu'), ovPause: $('ov-pause'), ovEnd: $('ov-end'),
    endTitle: $('end-title'), endSub: $('end-sub'), endStats: $('end-stats'),
    menuBest: $('menu-best'),
    btnStart: $('btn-start'), btnResume: $('btn-resume'), btnRestartP: $('btn-restart-p'),
    btnMuteP: $('btn-mute-p'), btnAgain: $('btn-again'), btnMenu: $('btn-menu'),
    btnPause: $('btn-pause'), btnMute: $('btn-mute'),
    touchUI: $('touch-ui'), stick: $('stick'), stickNub: $('stick-nub'),
    lookArea: $('look-area'), tbFire: $('tb-fire'), tbReload: $('tb-reload'), tbAct: $('tb-act')
  };

  // ---------- 游戏状态 ----------
  var phase = 'menu';           // menu | playing | won | lost
  var paused = false;
  var manualClock = false;
  var gameTime = 0;
  var timeLeft = ROUND_TIME;

  var player = {
    x: 0, z: 23, feet: 0, yaw: 0, pitch: 0,
    hp: 100, alive: true,
    ammo: MAG_SIZE, reserve: RESERVE_START,
    reloading: false, reloadT: 0, fireCd: 0, dryCd: 0,
    speed2d: 0, bobPhase: 0
  };

  var objective = { state: 'locked', progress: 0, x: 0, y: 0.9, z: -22.4 };
  var stats = { shots: 0, hits: 0, kills: 0, timeUsed: 0, damageTaken: 0 };
  var best = null;
  try {
    var b = localStorage.getItem('breachpoint_best_v1');
    if (b !== null && isFinite(parseFloat(b))) best = parseFloat(b);
  } catch (e) { /* 隐私模式等 */ }

  var input = { f: 0, r: 0, fire: false, interact: false, keys: {} };
  var muted = false;

  // HUD 瞬态计时(全部走游戏时钟,暂停即冻结)
  var fx = { hitmarkerT: 0, hitmarkerKill: false, vignetteT: 0, dmgT: [0, 0, 0, 0], toastT: 0, fireT: 0 };
  var recoilV = 0, shakeT = 0, muzzleT = 0, beepAcc = 0, lastWholeSec = ROUND_TIME;

  // ---------- Three.js 基础 ----------
  var scene, camera, renderer, gunGroup, gunFlash, muzzleLight;
  var vTmp = null, vTmp2 = null;

  var colliders = [];   // {x0,x1,y0,y1,z0,z1,sight}
  var surfaces = [];    // 可站立面 {x0,x1,z0,z1,y} 或 {ramp:true, yAt(z)}
  var enemies = [];
  var sparkPool = [], tracerPool = [];
  var deviceGroup = null, deviceLamp = null, devicePillar = null, deviceRing = null;

  function addCollider(x0, x1, y0, y1, z0, z1, sight) {
    colliders.push({ x0: x0, x1: x1, y0: y0, y1: y1, z0: z0, z1: z1, sight: sight !== false });
  }

  function makeBox(cx, cy, cz, sx, sy, sz, color, opt) {
    opt = opt || {};
    var geo = new THREE.BoxGeometry(sx, sy, sz);
    var mat = opt.mat || new THREE.MeshLambertMaterial({ color: color });
    var m = new THREE.Mesh(geo, mat);
    m.position.set(cx, cy, cz);
    if (opt.rx) m.rotation.x = opt.rx;
    if (opt.ry) m.rotation.y = opt.ry;
    m.castShadow = opt.cast !== false;
    m.receiveShadow = opt.receive !== false;
    scene.add(m);
    if (opt.collide) {
      addCollider(cx - sx / 2, cx + sx / 2, cy - sy / 2, cy + sy / 2, cz - sz / 2, cz + sz / 2, opt.sight);
    }
    return m;
  }

  // ---------- 数学工具 ----------
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function angNorm(a) { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; }
  function lerpAngle(a, b, t) { return a + angNorm(b - a) * clamp(t, 0, 1); }
  function dist2(ax, az, bx, bz) { var dx = ax - bx, dz = az - bz; return Math.sqrt(dx * dx + dz * dz); }

  // 射线与 AABB 相交(slab 法),返回进入距离,未命中返回 Infinity
  function rayAABB(ox, oy, oz, dx, dy, dz, b) {
    var tmin = 0, tmax = Infinity, t1, t2, tmp;
    var o = [ox, oy, oz], d = [dx, dy, dz];
    var lo = [b.x0, b.y0, b.z0], hi = [b.x1, b.y1, b.z1];
    for (var i = 0; i < 3; i++) {
      if (Math.abs(d[i]) < 1e-9) {
        if (o[i] < lo[i] || o[i] > hi[i]) return Infinity;
      } else {
        t1 = (lo[i] - o[i]) / d[i]; t2 = (hi[i] - o[i]) / d[i];
        if (t1 > t2) { tmp = t1; t1 = t2; t2 = tmp; }
        if (t1 > tmin) tmin = t1;
        if (t2 < tmax) tmax = t2;
        if (tmin > tmax) return Infinity;
      }
    }
    return tmin >= 0 ? tmin : (tmax >= 0 ? 0 : Infinity);
  }

  // 线段视线是否被实体阻挡
  function segBlocked(ax, ay, az, bx, by, bz) {
    var dx = bx - ax, dy = by - ay, dz = bz - az;
    var len = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (len < 1e-6) return false;
    var ix = dx / len, iy = dy / len, iz = dz / len;
    for (var i = 0; i < colliders.length; i++) {
      var c = colliders[i];
      if (!c.sight) continue;
      var t = rayAABB(ax, ay, az, ix, iy, iz, c);
      if (t < len - 0.05) return true;
    }
    return false;
  }

  function groundHeightAt(x, z, feet) {
    var h = 0;
    for (var i = 0; i < surfaces.length; i++) {
      var s = surfaces[i];
      if (x >= s.x0 && x <= s.x1 && z >= s.z0 && z <= s.z1) {
        var y = s.ramp ? s.yAt(z) : s.y;
        if (y > h) h = y;
      }
    }
    return h;
  }

  // 膨胀查询:实体圆覆盖范围内的最高可站面(用于登台阶判定)
  function groundHeightAtR(x, z, r) {
    var h = 0;
    for (var i = 0; i < surfaces.length; i++) {
      var s = surfaces[i];
      if (x >= s.x0 - r && x <= s.x1 + r && z >= s.z0 - r && z <= s.z1 + r) {
        var y = s.ramp ? s.yAt(clamp(z, s.z0, s.z1)) : s.y;
        if (y > h) h = y;
      }
    }
    return h;
  }

  function hitsSolid(px, pz, feet, r) {
    for (var i = 0; i < colliders.length; i++) {
      var c = colliders[i];
      if (c.y0 >= feet + 1.5 || c.y1 <= feet + 0.25) continue;
      if (px > c.x0 - r && px < c.x1 + r && pz > c.z0 - r && pz < c.z1 + r) return true;
    }
    return false;
  }

  // 分轴滑动移动(支持 0.65m 内登台阶),返回是否产生位移
  function slideMove(ent, dx, dz, r, dt) {
    // 若当前已陷入实体(异常状态),允许移动以便脱困
    var escape = hitsSolid(ent.x, ent.z, ent.feet, r - 0.03);
    function tryAxis(nx, nz) {
      if (escape || !hitsSolid(nx, nz, ent.feet, r)) {
        var g = groundHeightAt(nx, nz, ent.feet);
        if (g <= ent.feet + 0.65) { ent.x = nx; ent.z = nz; return true; }
        return false;
      }
      // 被阻挡:尝试登上台阶/平台(目标地面高差 ≤0.65 且抬脚后不再碰撞)
      var g2 = groundHeightAtR(nx, nz, r + 0.01);
      if (g2 > ent.feet && g2 <= ent.feet + 0.65 && !hitsSolid(nx, nz, g2, r)) {
        ent.x = nx; ent.z = nz; ent.feet = g2;
        return true;
      }
      return false;
    }
    var moved = false;
    var nx = clamp(ent.x + dx, MAP.x0 + r, MAP.x1 - r);
    if (nx !== ent.x && tryAxis(nx, ent.z)) moved = true;
    var nz = clamp(ent.z + dz, MAP.z0 + r, MAP.z1 - r);
    if (nz !== ent.z && tryAxis(ent.x, nz)) moved = true;
    // 贴地/下落
    var g = groundHeightAt(ent.x, ent.z, ent.feet);
    if (g > ent.feet) ent.feet = g;
    else ent.feet = Math.max(g, ent.feet - 14 * dt);
    return moved;
  }

  // ---------- 音频(全程序化 Web Audio) ----------
  var actx = null, masterGain = null;

  function initAudio() {
    if (actx) { if (actx.state === 'suspended') { actx.resume().catch(function () {}); } return; }
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      actx = new AC();
      masterGain = actx.createGain();
      masterGain.gain.value = muted ? 0 : 0.8;
      masterGain.connect(actx.destination);
    } catch (e) { actx = null; }
  }

  function tone(type, f0, f1, dur, vol, pan) {
    if (!actx || !masterGain) return;
    try {
      var t0 = actx.currentTime;
      var osc = actx.createOscillator();
      var g = actx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(Math.max(20, f0), t0);
      if (f1 && f1 !== f0) osc.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + dur);
      g.gain.setValueAtTime(vol, t0);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      var dest = masterGain;
      if (pan !== undefined && actx.createStereoPanner) {
        var p = actx.createStereoPanner(); p.pan.value = clamp(pan, -1, 1);
        p.connect(masterGain); dest = p;
      }
      osc.connect(g); g.connect(dest);
      osc.start(t0); osc.stop(t0 + dur + 0.02);
    } catch (e) { /* 音频失败不影响玩法 */ }
  }

  function noiseBurst(dur, vol, fCenter, pan) {
    if (!actx || !masterGain) return;
    try {
      var t0 = actx.currentTime;
      var len = Math.max(1, Math.floor(actx.sampleRate * dur));
      var buf = actx.createBuffer(1, len, actx.sampleRate);
      var data = buf.getChannelData(0);
      for (var i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      var src = actx.createBufferSource(); src.buffer = buf;
      var f = actx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = fCenter; f.Q.value = 0.9;
      var g = actx.createGain(); g.gain.setValueAtTime(vol, t0);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      var dest = masterGain;
      if (pan !== undefined && actx.createStereoPanner) {
        var p = actx.createStereoPanner(); p.pan.value = clamp(pan, -1, 1);
        p.connect(masterGain); dest = p;
      }
      src.connect(f); f.connect(g); g.connect(dest);
      src.start(t0);
    } catch (e) { /* 忽略 */ }
  }

  var sfx = {
    shot: function () { noiseBurst(0.12, 0.5, 850); tone('square', 150, 55, 0.11, 0.4); },
    enemyShot: function (pan) { noiseBurst(0.13, 0.34, 480, pan); tone('square', 110, 45, 0.12, 0.22, pan); },
    dry: function () { tone('square', 1900, 1400, 0.035, 0.18); },
    reload: function () {
      tone('square', 1100, 900, 0.04, 0.2);
      setTimeout(function () { tone('square', 800, 650, 0.05, 0.2); }, 480);
      setTimeout(function () { tone('square', 1500, 1200, 0.05, 0.25); }, 1050);
    },
    hit: function () { tone('sine', 1350, 950, 0.055, 0.3); },
    kill: function () { tone('sine', 700, 1500, 0.13, 0.35); },
    hurt: function () { tone('sawtooth', 230, 85, 0.22, 0.4); noiseBurst(0.1, 0.2, 300); },
    alert: function (pan) { tone('square', 520, 940, 0.13, 0.2, pan); },
    clear: function () { tone('sine', 620, 620, 0.1, 0.3); setTimeout(function () { tone('sine', 930, 930, 0.16, 0.3); }, 130); },
    beep: function (f) { tone('sine', f, f, 0.05, 0.26); },
    tick: function () { tone('square', 1050, 1050, 0.03, 0.2); },
    win: function () {
      tone('sine', 660, 660, 0.16, 0.3);
      setTimeout(function () { tone('sine', 830, 830, 0.16, 0.3); }, 160);
      setTimeout(function () { tone('sine', 990, 990, 0.34, 0.32); }, 320);
    },
    lose: function () { tone('sawtooth', 320, 130, 0.7, 0.35); }
  };

  function setMuted(m) {
    muted = m;
    if (masterGain) masterGain.gain.value = muted ? 0 : 0.8;
    el.btnMute.classList.toggle('off', muted);
    el.btnMuteP.textContent = muted ? '声音:关' : '声音:开';
  }

  // ---------- 场景搭建 ----------
  function buildWorld() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xa9c6d8);
    scene.fog = new THREE.Fog(0xa9c6d8, 28, 95);

    camera = new THREE.PerspectiveCamera(75, 1, 0.05, 240);
    scene.add(camera);

    // 灯光
    var hemi = new THREE.HemisphereLight(0xcfe5f2, 0x4a4a42, 0.75);
    scene.add(hemi);
    var sun = new THREE.DirectionalLight(0xffedd0, 0.85);
    sun.position.set(18, 32, 12);
    sun.castShadow = true;
    sun.shadow.mapSize.set(isTouch ? 1024 : 2048, isTouch ? 1024 : 2048);
    sun.shadow.camera.left = -34; sun.shadow.camera.right = 34;
    sun.shadow.camera.top = 34; sun.shadow.camera.bottom = -34;
    sun.shadow.camera.near = 2; sun.shadow.camera.far = 80;
    sun.shadow.bias = -0.0015;
    scene.add(sun);
    var wLight = new THREE.PointLight(0xffe7c4, 1.05, 28, 1.6);
    wLight.position.set(0, 4.1, -19);
    scene.add(wLight);

    // 地面(码头混凝土)
    var ground = new THREE.Mesh(
      new THREE.PlaneGeometry(120, 130),
      new THREE.MeshLambertMaterial({ color: 0x6e797f })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // 地面色块(旧油渍/补丁,增加层次)
    var patches = [
      [-8, 8, 12, 9, 0x606b71], [10, -2, 9, 7, 0x657076], [-14, -4, 7, 10, 0x5c676e],
      [4, 18, 8, 6, 0x677278], [14, 12, 7, 8, 0x606b71]
    ];
    patches.forEach(function (p) {
      var m = new THREE.Mesh(new THREE.PlaneGeometry(p[2], p[3]),
        new THREE.MeshLambertMaterial({ color: p[4] }));
      m.rotation.x = -Math.PI / 2; m.position.set(p[0], 0.012, p[1]);
      m.receiveShadow = true; scene.add(m);
    });

    // 引导黄线(开局指路)
    function laneDash(x0, z0, x1, z1) {
      var dx = x1 - x0, dz = z1 - z0;
      var len = Math.sqrt(dx * dx + dz * dz);
      var n = Math.floor(len / 1.5);
      var mat = new THREE.MeshBasicMaterial({ color: 0xe8c23a });
      for (var i = 0; i < n; i++) {
        var t = i / n;
        var m = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.8), mat);
        m.rotation.x = -Math.PI / 2;
        m.rotation.z = Math.atan2(dx, dz);
        m.position.set(x0 + dx * t, 0.02, z0 + dz * t);
        scene.add(m);
      }
    }
    laneDash(0, 21, 0, -3);
    laneDash(0, -3, -9.5, -5);      // 分支:西坡道
    laneDash(0.5, -3, 11, -14);     // 分支:东门方向

    // 边界墙(码头护墙)
    var wallC = 0x76838a;
    makeBox(-24, 2.5, 0, 1.2, 5, 55, wallC, { collide: true });
    makeBox(24, 2.5, 0, 1.2, 5, 55, wallC, { collide: true });
    makeBox(0, 2.5, 27.5, 49.5, 5, 1.2, wallC, { collide: true });
    makeBox(0, 2.5, -27.5, 49.5, 5, 1.2, wallC, { collide: true });
    // 墙顶深色压条(纯装饰)
    makeBox(-24, 5.05, 0, 1.4, 0.25, 55, 0x5c676b, { cast: false });
    makeBox(24, 5.05, 0, 1.4, 0.25, 55, 0x5c676b, { cast: false });
    makeBox(0, 5.05, 27.5, 49.8, 0.25, 1.4, 0x5c676b, { cast: false });
    makeBox(0, 5.05, -27.5, 49.8, 0.25, 1.4, 0x5c676b, { cast: false });

    // ===== 主仓库(装置所在) =====
    var whWall = 0x4e6472, whTrim = 0xc2643a;
    // 南墙三段 + 两个门洞(A: x -5..-1,B: x 5..9)
    makeBox(-9, 2.25, -13, 8, 4.5, 0.6, whWall, { collide: true });
    makeBox(2, 2.25, -13, 6, 4.5, 0.6, whWall, { collide: true });
    makeBox(11, 2.25, -13, 4, 4.5, 0.6, whWall, { collide: true });
    makeBox(-3, 3.75, -13, 4, 1.5, 0.6, whWall, { collide: true });   // 门楣 A
    makeBox(7, 3.75, -13, 4, 1.5, 0.6, whWall, { collide: true });    // 门楣 B
    // 门框描边
    makeBox(-5.15, 1.5, -13, 0.3, 3, 0.75, whTrim, { cast: false });
    makeBox(-0.85, 1.5, -13, 0.3, 3, 0.75, whTrim, { cast: false });
    makeBox(4.85, 1.5, -13, 0.3, 3, 0.75, whTrim, { cast: false });
    makeBox(9.15, 1.5, -13, 0.3, 3, 0.75, whTrim, { cast: false });
    // 东墙两段 + 门洞(z -21..-17)
    makeBox(13, 2.25, -23, 0.6, 4.5, 4, whWall, { collide: true });
    makeBox(13, 2.25, -15, 0.6, 4.5, 4, whWall, { collide: true });
    makeBox(13, 3.75, -19, 0.6, 1.5, 4, whWall, { collide: true });   // 东门楣
    makeBox(13, 1.5, -21.15, 0.75, 3, 0.3, whTrim, { cast: false });
    makeBox(13, 1.5, -16.85, 0.75, 3, 0.3, whTrim, { cast: false });
    // 西墙 / 北墙 / 屋顶
    makeBox(-13, 2.25, -19, 0.6, 4.5, 12.6, whWall, { collide: true });
    makeBox(0, 2.25, -25, 26.6, 4.5, 0.6, whWall, { collide: true });
    makeBox(0, 4.72, -19, 27.2, 0.45, 13.2, 0x3d4f5a, { collide: false, cast: false });
    addCollider(-13.6, 13.6, 4.5, 4.95, -25.6, -12.4, true); // 屋顶只挡视线
    // 支柱与内部堆货
    makeBox(-5, 2.25, -19, 0.7, 4.5, 0.7, 0x6b7f8c, { collide: true });
    makeBox(5, 2.25, -19, 0.7, 4.5, 0.7, 0x6b7f8c, { collide: true });
    makeBox(-9.5, 0.9, -22.5, 1.8, 1.8, 1.8, 0x9a7748, { collide: true });
    makeBox(-8, 0.6, -21.2, 1.2, 1.2, 1.2, 0x8a6a40, { collide: true });
    makeBox(9.5, 0.75, -15.6, 1.5, 1.5, 1.5, 0x9a7748, { collide: true });
    makeBox(-11.9, 1.5, -17.5, 0.9, 3, 5.5, 0x71583c, { collide: true }); // 靠墙货架

    // ===== 装卸平台 + 坡道(高低层次) =====
    makeBox(0, 0.6, -10.95, 22, 1.2, 3.5, 0x5f6a72, { collide: true });
    surfaces.push({ x0: -11, x1: 11, z0: -12.7, z1: -9.2, y: 1.2 });
    // 平台前沿警示条
    makeBox(0, 1.14, -9.28, 22, 0.12, 0.16, 0xe8c23a, { cast: false });
    // 南门门槛台阶(0.6m 两级步高,衔接平台 1.2m 与仓库地面)
    [-3, 7].forEach(function (cx) {
      makeBox(cx, 0.3, -12.98, 3.9, 0.6, 0.85, 0x59646c, { collide: false });
      surfaces.push({ x0: cx - 1.95, x1: cx + 1.95, z0: -13.4, z1: -12.55, y: 0.6 });
    });
    // 西侧坡道
    var rampLen = Math.sqrt(4.2 * 4.2 + 1.2 * 1.2);
    makeBox(-9.6, 0.48, -7.1, 2.8, 0.24, rampLen, 0x66717a,
      { rx: Math.atan2(1.2, 4.2), collide: false });
    surfaces.push({
      ramp: true, x0: -11, x1: -8.2, z0: -9.2, z1: -5,
      yAt: function (z) { return 1.2 * clamp((-5 - z) / 4.2, 0, 1); }
    });

    // ===== 集装箱与掩体 =====
    var boxColors = [0x3f7d8c, 0xc26a3a, 0x8c4a3f, 0x5d7550];
    function container(cx, cz, alongX, color, cy) {
      cy = cy || 1.3;
      var sx = alongX ? 6 : 2.4, sz = alongX ? 2.4 : 6;
      makeBox(cx, cy, cz, sx, 2.6, sz, color, { collide: cy < 2 });
      if (cy >= 2) addCollider(cx - sx / 2, cx + sx / 2, cy - 1.3, cy + 1.3, cz - sz / 2, cz + sz / 2, true);
      // 角柱装饰
      var dark = new THREE.MeshLambertMaterial({ color: 0x2c3438 });
      [[-sx / 2 + 0.1, -sz / 2 + 0.1], [sx / 2 - 0.1, -sz / 2 + 0.1], [-sx / 2 + 0.1, sz / 2 - 0.1], [sx / 2 - 0.1, sz / 2 - 0.1]]
        .forEach(function (o) {
          var p = new THREE.Mesh(new THREE.BoxGeometry(0.22, 2.62, 0.22), dark);
          p.position.set(cx + o[0], cy, cz + o[1]); p.castShadow = false; scene.add(p);
        });
    }
    container(-7, 3, false, boxColors[0]);
    container(7, 0, true, boxColors[1]);
    container(7.4, 0.25, true, boxColors[2], 3.9);   // 叠层
    container(0, 9, true, boxColors[3]);
    container(-5, -6, false, boxColors[1]);
    container(12, -6, false, boxColors[0]);

    // 木箱与桶
    function crate(x, z, s, y) {
      makeBox(x, (y || 0) + s / 2, z, s, s, s, 0x9a7748, { collide: !y });
      if (y) addCollider(x - s / 2, x + s / 2, y, y + s, z - s / 2, z + s / 2, true);
    }
    crate(-2, -1, 1.3); crate(3, 13, 1.3); crate(3, 13, 1.1, 1.3);
    crate(2.5, -3.5, 1.2); crate(-10.5, 16, 1.4); crate(-1.6, 15.5, 1.2);
    crate(-3.2, 21, 1.3); crate(3.2, 21, 1.3); crate(11, 14, 1.3);
    function barrel(x, z, color) {
      var m = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 1.1, 10),
        new THREE.MeshLambertMaterial({ color: color }));
      m.position.set(x, 0.55, z); m.castShadow = true; m.receiveShadow = true; scene.add(m);
      addCollider(x - 0.45, x + 0.45, 0, 1.1, z - 0.45, z + 0.45, true);
    }
    barrel(10, 10, 0x5f7d8c); barrel(10.9, 10.4, 0xb0563c); barrel(-11, 2, 0xb0563c);
    barrel(-10.4, 2.8, 0x5f7d8c); barrel(11.5, -11.5, 0x6d6a58);

    // 灯柱(装饰)
    [[-18, 18], [18, 18], [-18, -6], [18, -6]].forEach(function (p) {
      var pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 5.2, 8),
        new THREE.MeshLambertMaterial({ color: 0x44504f }));
      pole.position.set(p[0], 2.6, p[1]); pole.castShadow = true; scene.add(pole);
      var lamp = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.22, 0.55),
        new THREE.MeshLambertMaterial({ color: 0x333a3c, emissive: 0xffe9b8, emissiveIntensity: 0.9 }));
      lamp.position.set(p[0], 5.15, p[1]); scene.add(lamp);
    });

    // ===== 远景地标 =====
    // 海面
    var sea = new THREE.Mesh(new THREE.PlaneGeometry(220, 90),
      new THREE.MeshLambertMaterial({ color: 0x2e4f63 }));
    sea.rotation.x = -Math.PI / 2; sea.position.set(0, -0.35, -78); scene.add(sea);
    // 龙门吊(港口起重机)
    var crane = 0x8f6a52;
    makeBox(-16, 9, -56, 1.5, 18, 1.5, crane, { cast: false });
    makeBox(16, 9, -56, 1.5, 18, 1.5, crane, { cast: false });
    makeBox(-16, 9, -49, 1.5, 18, 1.5, crane, { cast: false });
    makeBox(16, 9, -49, 1.5, 18, 1.5, crane, { cast: false });
    makeBox(0, 18.2, -52.5, 38, 2.4, 9, crane, { cast: false });
    makeBox(10, 16.6, -52.5, 2, 1.8, 22, 0xa5522e, { cast: false });
    // 远处堆场剪影
    makeBox(-33, 2.6, 6, 10, 5.2, 18, 0x64707a, { cast: false });
    makeBox(33, 2, -2, 9, 4, 22, 0x6a7680, { cast: false });
    makeBox(33, 4.6, 2, 9, 1.6, 6, 0x5d6a74, { cast: false });

    // ===== 爆炸装置 =====
    deviceGroup = new THREE.Group();
    deviceGroup.position.set(objective.x, 0, objective.z);
    var base = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 0.95),
      new THREE.MeshLambertMaterial({ color: 0x3a4145 }));
    base.position.y = 0.25; base.castShadow = true; deviceGroup.add(base);
    var body = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.85, 0.7),
      new THREE.MeshLambertMaterial({ color: 0x22282c }));
    body.position.y = 0.92; body.castShadow = true; deviceGroup.add(body);
    [-0.45, 0.45].forEach(function (ox) {
      var stripe = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.87, 0.74),
        new THREE.MeshLambertMaterial({ color: 0xd98a2b }));
      stripe.position.set(ox, 0.92, 0); deviceGroup.add(stripe);
    });
    deviceLamp = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8),
      new THREE.MeshBasicMaterial({ color: 0xff4433 }));
    deviceLamp.position.y = 1.48; deviceGroup.add(deviceLamp);
    devicePillar = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 7, 12, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0xff4433, transparent: true, opacity: 0.13,
        blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false
      }));
    devicePillar.position.y = 3.9; deviceGroup.add(devicePillar);
    deviceRing = new THREE.Mesh(new THREE.RingGeometry(2.45, 2.75, 36),
      new THREE.MeshBasicMaterial({
        color: 0x3dff8a, transparent: true, opacity: 0.0,
        blending: THREE.AdditiveBlending, depthWrite: false
      }));
    deviceRing.rotation.x = -Math.PI / 2; deviceRing.position.y = 0.04; deviceGroup.add(deviceRing);
    scene.add(deviceGroup);
    addCollider(-0.8, 0.8, 0, 1.35, objective.z - 0.5, objective.z + 0.5, true);

    // ===== 特效池 =====
    var sparkGeo = new THREE.BoxGeometry(0.055, 0.055, 0.055);
    var sparkMatA = new THREE.MeshBasicMaterial({ color: 0xffd27a });
    var sparkMatB = new THREE.MeshBasicMaterial({ color: 0xff7a55 });
    for (var i = 0; i < 48; i++) {
      var sp = new THREE.Mesh(sparkGeo, i % 2 ? sparkMatA : sparkMatB);
      sp.visible = false; scene.add(sp);
      sparkPool.push({ mesh: sp, life: 0, life0: 1, vx: 0, vy: 0, vz: 0 });
    }
    var tracerGeo = new THREE.BoxGeometry(1, 1, 1);
    var tracerMatP = new THREE.MeshBasicMaterial({
      color: 0xffe9a8, transparent: true, opacity: 0.85,
      blending: THREE.AdditiveBlending, depthWrite: false
    });
    var tracerMatE = new THREE.MeshBasicMaterial({
      color: 0xff6a55, transparent: true, opacity: 0.8,
      blending: THREE.AdditiveBlending, depthWrite: false
    });
    for (var j = 0; j < 16; j++) {
      var tr = new THREE.Mesh(tracerGeo, j % 2 ? tracerMatP : tracerMatE);
      tr.visible = false; scene.add(tr);
      tracerPool.push({ mesh: tr, life: 0, isEnemy: j % 2 === 1 });
    }

    // ===== 第一人称武器模型 =====
    gunGroup = new THREE.Group();
    var gunDark = new THREE.MeshLambertMaterial({ color: 0x2e353a });
    var gunMid = new THREE.MeshLambertMaterial({ color: 0x47525a });
    var gb = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.1, 0.36), gunDark);
    gb.position.set(0, 0, 0); gunGroup.add(gb);
    var barrelM = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.032, 0.2), gunMid);
    barrelM.position.set(0, 0.022, -0.26); gunGroup.add(barrelM);
    var grip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.13, 0.08), gunMid);
    grip.position.set(0, -0.1, 0.1); grip.rotation.x = 0.35; gunGroup.add(grip);
    var sight = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.035, 0.06), gunDark);
    sight.position.set(0, 0.075, -0.05); gunGroup.add(sight);
    gunFlash = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.24),
      new THREE.MeshBasicMaterial({
        color: 0xffd894, transparent: true, opacity: 0.95,
        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
      }));
    gunFlash.position.set(0, 0.022, -0.4); gunFlash.visible = false; gunGroup.add(gunFlash);
    gunGroup.scale.setScalar(0.44);
    gunGroup.position.set(0.19, -0.155, -0.3);
    camera.add(gunGroup);
    muzzleLight = new THREE.PointLight(0xffc98a, 0, 9, 2);
    muzzleLight.position.set(0, 0, -1);
    camera.add(muzzleLight);

    vTmp = new THREE.Vector3(); vTmp2 = new THREE.Vector3();
  }

  // ---------- 敌人 ----------
  var ENEMY_DEFS = [
    { id: 1, x: -10.5, z: 10, wps: [[-10.5, 10], [-10.5, -2], [-6.5, -3.5]], chaser: true },
    { id: 2, x: 10.5, z: 6, wps: [[10.5, 6], [9.5, -3.5], [11.2, 2]], chaser: true },
    { id: 3, x: 6, z: -10.7, wps: [[6, -10.7], [-6, -10.7]], hold: true, baseFeet: 1.2, bounds: { x0: -10.6, x1: 10.6, z0: -12.3, z1: -9.5 } },
    { id: 4, x: -6, z: -19, wps: [[-6, -19], [6, -19], [0, -16.2]], hold: true, bounds: { x0: -11.4, x1: 11.4, z0: -24.2, z1: -13.8 } },
    { id: 5, x: 2, z: 6, wps: [[2, 6], [-3, 2.5], [3.5, -1]], chaser: true }
  ];

  var sharedEnemyGeo = null;

  function makeEnemyMesh(e) {
    if (!sharedEnemyGeo) {
      sharedEnemyGeo = {
        leg: new THREE.BoxGeometry(0.17, 0.85, 0.22),
        torso: new THREE.BoxGeometry(0.6, 0.72, 0.34),
        vest: new THREE.BoxGeometry(0.66, 0.46, 0.4),
        head: new THREE.BoxGeometry(0.3, 0.3, 0.3),
        cap: new THREE.BoxGeometry(0.34, 0.1, 0.34),
        gun: new THREE.BoxGeometry(0.09, 0.11, 0.68),
        flash: new THREE.PlaneGeometry(0.32, 0.32)
      };
    }
    var g = sharedEnemyGeo;
    var grp = new THREE.Group();
    e.matBody = new THREE.MeshLambertMaterial({ color: 0x3a4145 });
    e.matVest = new THREE.MeshLambertMaterial({ color: 0xc84f2e, emissive: 0x220a04 });
    e.matSkin = new THREE.MeshLambertMaterial({ color: 0xc9a284 });
    var mLegL = new THREE.Mesh(g.leg, e.matBody); mLegL.position.set(-0.14, 0.425, 0);
    var mLegR = new THREE.Mesh(g.leg, e.matBody); mLegR.position.set(0.14, 0.425, 0);
    var torso = new THREE.Mesh(g.torso, e.matBody); torso.position.y = 1.21;
    var vest = new THREE.Mesh(g.vest, e.matVest); vest.position.y = 1.18;
    var head = new THREE.Mesh(g.head, e.matSkin); head.position.y = 1.73;
    var cap = new THREE.Mesh(g.cap, e.matVest); cap.position.y = 1.92;
    var gun = new THREE.Mesh(g.gun, e.matBody); gun.position.set(0.16, 1.32, -0.42);
    grp.add(mLegL, mLegR, torso, vest, head, cap, gun);
    grp.traverse(function (o) { if (o.isMesh) { o.castShadow = true; } });
    e.flashMesh = new THREE.Mesh(g.flash, new THREE.MeshBasicMaterial({
      color: 0xffd894, transparent: true, opacity: 0.9,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
    }));
    e.flashMesh.position.set(0.16, 1.32, -0.82); e.flashMesh.visible = false;
    grp.add(e.flashMesh);
    e.legL = mLegL; e.legR = mLegR;
    e.group = grp;
    scene.add(grp);
  }

  function createEnemies() {
    ENEMY_DEFS.forEach(function (d) {
      var e = {
        id: d.id, def: d, x: d.x, z: d.z, feet: d.baseFeet || 0,
        yaw: 0, hp: 30, alive: true, state: 'patrol',
        wpIndex: 1, stateT: 0, lostT: 0, attackCd: 1.2,
        lastSeenX: 0, lastSeenZ: 0, combatT: 0,
        strafeDir: 1, strafeT: 0, flashT: 0, muzzleFlashT: 0,
        deadT: 0, walkPhase: 0
      };
      makeEnemyMesh(e);
      enemies.push(e);
    });
  }

  function resetEnemy(e) {
    var d = e.def;
    e.x = d.x; e.z = d.z; e.feet = d.baseFeet || 0;
    e.yaw = 0; e.hp = 30; e.alive = true; e.state = 'patrol';
    e.wpIndex = 1 % d.wps.length; e.stateT = 0; e.lostT = 0;
    e.attackCd = 1.2; e.combatT = 0; e.strafeDir = 1; e.strafeT = 0;
    e.flashT = 0; e.muzzleFlashT = 0; e.deadT = 0; e.walkPhase = 0;
    e.group.visible = true;
    e.group.rotation.set(0, 0, 0);
    e.group.position.set(e.x, e.feet, e.z);
    e.matBody.color.setHex(0x3a4145);
    e.matVest.color.setHex(0xc84f2e);
    e.matSkin.color.setHex(0xc9a284);
    e.matBody.emissive.setHex(0x000000);
  }

  function aliveEnemyCount() {
    var n = 0;
    for (var i = 0; i < enemies.length; i++) if (enemies[i].alive) n++;
    return n;
  }

  function enemyEye(e) { return e.feet + 1.7; }
  function playerEye() { return player.feet + EYE; }

  function canSeePlayer(e) {
    if (!player.alive) return false;
    var dx = player.x - e.x, dz = player.z - e.z;
    var dist = Math.sqrt(dx * dx + dz * dz);
    if (dist > 32) return false;
    if (e.state === 'patrol' || e.state === 'search') {
      var dirYaw = Math.atan2(-dx, -dz);
      if (Math.abs(angNorm(dirYaw - e.yaw)) > 1.05) return false; // 约 120° FOV
    }
    return !segBlocked(e.x, enemyEye(e), e.z, player.x, playerEye(), player.z);
  }

  function alertEnemiesNear(x, z, radius) {
    enemies.forEach(function (e) {
      if (!e.alive) return;
      if (e.state === 'patrol' || e.state === 'search') {
        if (dist2(e.x, e.z, x, z) < radius) {
          e.state = 'alert'; e.stateT = 0;
          e.lastSeenX = player.x; e.lastSeenZ = player.z;
        }
      }
    });
  }

  function moveEnemyToward(e, tx, tz, speed, dt) {
    var d = e.def;
    if (d.bounds) { tx = clamp(tx, d.bounds.x0, d.bounds.x1); tz = clamp(tz, d.bounds.z0, d.bounds.z1); }
    var dx = tx - e.x, dz = tz - e.z;
    var len = Math.sqrt(dx * dx + dz * dz);
    if (len < 0.05) return true;
    var vx = dx / len * speed * dt, vz = dz / len * speed * dt;
    slideMove(e, vx, vz, 0.5, dt);
    if (d.bounds) { e.x = clamp(e.x, d.bounds.x0, d.bounds.x1); e.z = clamp(e.z, d.bounds.z0, d.bounds.z1); }
    e.walkPhase += speed * dt * 2.4;
    var wantYaw = Math.atan2(-dx, -dz);
    e.yaw = lerpAngle(e.yaw, wantYaw, dt * 8);
    return len < 0.5;
  }

  function facePlayer(e, dt) {
    var wantYaw = Math.atan2(-(player.x - e.x), -(player.z - e.z));
    e.yaw = lerpAngle(e.yaw, wantYaw, dt * 10);
  }

  function enemyFire(e) {
    var dx = player.x - e.x, dz = player.z - e.z;
    var dist = Math.sqrt(dx * dx + dz * dz);
    var justSpotted = e.combatT < 1.0;
    var chance = clamp(0.78 - dist * 0.016 - player.speed2d * 0.05 - (justSpotted ? 0.3 : 0), 0.08, 0.85);
    // 枪口世界位置
    var c = Math.cos(e.yaw), s = Math.sin(e.yaw);
    var ox = 0.16, oz = -0.8;
    var mx = e.x + ox * c + oz * s, mz = e.z - ox * s + oz * c;
    var my = e.feet + 1.32;
    var relYaw = angNorm(Math.atan2(-(e.x - player.x), -(e.z - player.z)) - player.yaw);
    var pan = clamp(Math.sin(relYaw) * -1, -1, 1);
    var hit = Math.random() < chance;
    var ex, ey, ez;
    if (hit) {
      ex = player.x; ey = playerEye() - 0.15; ez = player.z;
      hurtPlayer(8 + Math.random() * 5, e);
    } else {
      // 打偏:目标点附近随机偏移
      var offA = Math.random() * Math.PI * 2, offR = 0.7 + Math.random() * 0.9;
      ex = player.x + Math.cos(offA) * offR;
      ey = playerEye() + (Math.random() - 0.4) * 1.2;
      ez = player.z + Math.sin(offA) * offR;
      spawnSparksAt(ex, Math.max(0.1, ey), ez, false, 2);
    }
    spawnTracer(mx, my, mz, ex, ey, ez, true);
    e.muzzleFlashT = 0.055;
    sfx.enemyShot(pan);
  }

  function updateEnemy(e, dt) {
    if (!e.alive) {
      if (e.deadT < 0.6) {
        e.deadT += dt;
        var t = Math.min(1, e.deadT / 0.5);
        e.group.rotation.x = -t * Math.PI / 2;
        var dark = 1 - t * 0.45;
        e.matVest.color.setRGB(0.78 * dark, 0.31 * dark, 0.18 * dark);
      }
      return;
    }
    e.flashT = Math.max(0, e.flashT - dt);
    e.muzzleFlashT = Math.max(0, e.muzzleFlashT - dt);
    e.matBody.emissive.setHex(e.flashT > 0 ? 0x66201a : 0x000000);
    e.flashMesh.visible = e.muzzleFlashT > 0;
    e.attackCd -= dt;

    var seen = canSeePlayer(e);
    if (seen) { e.lastSeenX = player.x; e.lastSeenZ = player.z; e.lostT = 0; }
    else e.lostT += dt;
    var dist = dist2(e.x, e.z, player.x, player.z);

    switch (e.state) {
      case 'patrol': {
        var wp = e.def.wps[e.wpIndex];
        if (moveEnemyToward(e, wp[0], wp[1], 1.6, dt)) {
          e.wpIndex = (e.wpIndex + 1) % e.def.wps.length;
        }
        if (seen) {
          e.state = 'alert'; e.stateT = 0; e.combatT = 0;
          var relYaw = angNorm(Math.atan2(-(e.x - player.x), -(e.z - player.z)) - player.yaw);
          sfx.alert(clamp(Math.sin(relYaw) * -1, -1, 1));
        }
        break;
      }
      case 'alert': {
        e.stateT += dt;
        facePlayer(e, dt);
        if (e.stateT > 0.55) {
          if (seen) { e.state = 'attack'; e.combatT = 0; e.attackCd = 0.35 + Math.random() * 0.3; }
          else if (e.def.chaser) e.state = 'chase';
          else e.state = 'search', e.stateT = 0;
        }
        break;
      }
      case 'chase': {
        var arrived = moveEnemyToward(e, e.lastSeenX, e.lastSeenZ, 3.2, dt);
        e.walkPhase += dt * 3;
        if (seen && dist < 17) { e.state = 'attack'; e.combatT = 0; }
        else if (arrived && !seen) { e.state = 'search'; e.stateT = 0; }
        break;
      }
      case 'search': {
        e.stateT += dt;
        e.yaw += dt * 1.8;
        if (seen) { e.state = 'attack'; e.combatT = 0; }
        else if (e.stateT > 2.6) { e.state = 'patrol'; }
        break;
      }
      case 'attack': {
        e.combatT += dt;
        facePlayer(e, dt);
        if (!seen) {
          if (e.lostT > 0.9) {
            e.state = e.def.chaser ? 'chase' : 'search';
            e.stateT = 0;
          }
        } else {
          if (e.def.chaser && dist > 17) { e.state = 'chase'; break; }
          // 寻找射击位置:小幅侧移
          e.strafeT -= dt;
          if (e.strafeT <= 0) {
            e.strafeDir = Math.random() < 0.4 ? 0 : (Math.random() < 0.5 ? -1 : 1);
            e.strafeT = 1.4 + Math.random() * 1.2;
          }
          if (e.strafeDir !== 0) {
            var pdx = player.x - e.x, pdz = player.z - e.z;
            var pl = Math.max(0.001, Math.sqrt(pdx * pdx + pdz * pdz));
            var sx = -pdz / pl * e.strafeDir, sz = pdx / pl * e.strafeDir;
            slideMove(e, sx * 1.5 * dt, sz * 1.5 * dt, 0.5, dt);
            if (e.def.bounds) {
              e.x = clamp(e.x, e.def.bounds.x0, e.def.bounds.x1);
              e.z = clamp(e.z, e.def.bounds.z0, e.def.bounds.z1);
            }
            e.walkPhase += dt * 4;
          }
          if (e.attackCd <= 0 && dist < 30) {
            e.attackCd = 1.05 + Math.random() * 0.5;
            enemyFire(e);
          }
        }
        break;
      }
      case 'hit': {
        e.stateT += dt;
        if (e.stateT > 0.24) { e.state = 'attack'; e.combatT = 0.6; }
        break;
      }
    }

    // 应用变换与走路动画
    e.group.position.set(e.x, e.feet, e.z);
    e.group.rotation.y = e.yaw;
    var swing = (e.state === 'patrol' || e.state === 'chase' || e.strafeDir !== 0) ? Math.sin(e.walkPhase) * 0.55 : 0;
    e.legL.rotation.x = swing;
    e.legR.rotation.x = -swing;
  }

  function damageEnemy(e, amount) {
    if (!e.alive) return;
    e.hp -= amount;
    e.flashT = 0.13;
    if (e.hp <= 0) {
      e.hp = 0; e.alive = false; e.state = 'dead'; e.deadT = 0;
      stats.kills++;
      fx.hitmarkerT = 0.16; fx.hitmarkerKill = true;
      sfx.kill();
      if (aliveEnemyCount() === 0 && phase === 'playing') {
        objective.state = 'ready';
        showToast('敌人已全部清除 — 前往仓库拆除装置!', 3.2);
        sfx.clear();
      }
    } else {
      if (e.state !== 'hit') { e.state = 'hit'; e.stateT = 0; }
      e.lastSeenX = player.x; e.lastSeenZ = player.z; e.lostT = 0;
      fx.hitmarkerT = 0.13; fx.hitmarkerKill = false;
      sfx.hit();
    }
  }

  // ---------- 特效 ----------
  function spawnSparksAt(x, y, z, onEnemy, count) {
    if (reducedMotion) count = Math.max(1, Math.floor(count / 2));
    var used = 0;
    for (var i = 0; i < sparkPool.length && used < count; i++) {
      var s = sparkPool[i];
      if (s.life > 0) continue;
      s.life = s.life0 = 0.22 + Math.random() * 0.2;
      s.mesh.visible = true;
      s.mesh.position.set(x, y, z);
      var a = Math.random() * Math.PI * 2, up = Math.random() * 3 + 1.2, sp = 1.5 + Math.random() * 2.5;
      s.vx = Math.cos(a) * sp; s.vz = Math.sin(a) * sp; s.vy = up;
      s.mesh.scale.setScalar(1);
      used++;
    }
  }

  function spawnTracer(x0, y0, z0, x1, y1, z1, isEnemy) {
    for (var i = 0; i < tracerPool.length; i++) {
      var t = tracerPool[i];
      if (t.life > 0 || t.isEnemy !== !!isEnemy) continue;
      var dx = x1 - x0, dy = y1 - y0, dz = z1 - z0;
      var len = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (len < 0.1) return;
      t.life = 0.06;
      t.mesh.visible = true;
      t.mesh.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
      t.mesh.scale.set(0.03, 0.03, len);
      vTmp.set(x1, y1, z1);
      t.mesh.lookAt(vTmp);
      return;
    }
  }

  function updateParticles(dt) {
    for (var i = 0; i < sparkPool.length; i++) {
      var s = sparkPool[i];
      if (s.life <= 0) continue;
      s.life -= dt;
      if (s.life <= 0) { s.mesh.visible = false; continue; }
      s.vy -= 10 * dt;
      s.mesh.position.x += s.vx * dt;
      s.mesh.position.y += s.vy * dt;
      s.mesh.position.z += s.vz * dt;
      s.mesh.scale.setScalar(Math.max(0.1, s.life / s.life0));
    }
    for (var j = 0; j < tracerPool.length; j++) {
      var t = tracerPool[j];
      if (t.life <= 0) continue;
      t.life -= dt;
      if (t.life <= 0) t.mesh.visible = false;
    }
  }

  // ---------- 玩家:移动 / 射击 / 受伤 ----------
  function movePlayer(dt, f, r) {
    var len = Math.sqrt(f * f + r * r);
    if (len < 0.001) { player.speed2d = 0; return; }
    if (len > 1) { f /= len; r /= len; }
    var sinY = Math.sin(player.yaw), cosY = Math.cos(player.yaw);
    // forward = (-sin, -cos), right = (cos, -sin)
    var dx = (-sinY * f + cosY * r) * SPEED * dt;
    var dz = (-cosY * f - sinY * r) * SPEED * dt;
    slideMove(player, dx, dz, PLAYER_R, dt);
    player.speed2d = SPEED * Math.min(1, len);
    player.bobPhase += dt * 9.5 * Math.min(1, len);
  }

  function gunTipWorld(out) {
    out.set(0.19, -0.14, -0.8);
    camera.localToWorld(out);
    return out;
  }

  function tryFire() {
    if (phase !== 'playing' || paused || !player.alive) return false;
    if (player.reloading || player.fireCd > 0) return false;
    if (player.ammo <= 0) {
      if (player.dryCd <= 0) {
        player.dryCd = 0.28;
        sfx.dry();
        showToast(isTouch ? '弹匣已空 — 点「换弹」按钮' : '弹匣已空 — 按 R 换弹', 1.4);
      }
      return false;
    }
    player.ammo--;
    player.fireCd = FIRE_CD;
    stats.shots++;

    // 视线射线(移动时轻微扩散)
    var spread = (player.speed2d > 0.5 ? 0.011 : 0.003);
    var yaw = player.yaw + (Math.random() - 0.5) * spread;
    var pitch = player.pitch + (Math.random() - 0.5) * spread;
    var cp = Math.cos(pitch);
    var dx = -Math.sin(yaw) * cp, dy = Math.sin(pitch), dz = -Math.cos(yaw) * cp;
    var ox = player.x, oy = playerEye(), oz = player.z;

    // 与实体求最近距离
    var tWall = Infinity;
    for (var i = 0; i < colliders.length; i++) {
      var t = rayAABB(ox, oy, oz, dx, dy, dz, colliders[i]);
      if (t < tWall) tWall = t;
    }
    var hitEnemy = null, tHit = tWall;
    for (var j = 0; j < enemies.length; j++) {
      var e = enemies[j];
      if (!e.alive) continue;
      var box = { x0: e.x - 0.5, x1: e.x + 0.5, y0: e.feet, y1: e.feet + 2.0, z0: e.z - 0.5, z1: e.z + 0.5 };
      var te = rayAABB(ox, oy, oz, dx, dy, dz, box);
      if (te < tHit) { tHit = te; hitEnemy = e; }
    }
    var range = Math.min(tHit, 120);
    var hx = ox + dx * range, hy = oy + dy * range, hz = oz + dz * range;

    if (hitEnemy) {
      stats.hits++;
      damageEnemy(hitEnemy, SHOT_DMG);
      spawnSparksAt(hx, hy, hz, true, 5);
    } else if (isFinite(tWall) && tHit < 120) {
      spawnSparksAt(hx, hy, hz, false, 4);
    }

    gunTipWorld(vTmp2);
    spawnTracer(vTmp2.x, vTmp2.y, vTmp2.z, hx, hy, hz, false);

    // 反馈
    recoilV += reducedMotion ? 0.005 : 0.011;
    shakeT = reducedMotion ? 0.03 : 0.07;
    muzzleT = 0.05;
    fx.fireT = 0.09;
    sfx.shot();
    alertEnemiesNear(player.x, player.z, 17);
    return true;
  }

  function doReload() {
    if (phase !== 'playing' || paused || !player.alive) return;
    if (player.reloading || player.ammo >= MAG_SIZE || player.reserve <= 0) return;
    player.reloading = true;
    player.reloadT = RELOAD_TIME;
    sfx.reload();
  }

  function hurtPlayer(amount, srcEnemy) {
    if (phase !== 'playing' || !player.alive) return;
    amount = Math.max(0, amount);
    player.hp -= amount;
    stats.damageTaken += amount;
    fx.vignetteT = 0.55;
    sfx.hurt();
    if (srcEnemy) {
      var relYaw = angNorm(Math.atan2(-(srcEnemy.x - player.x), -(srcEnemy.z - player.z)) - player.yaw);
      // relYaw ≈ 0 前方 / ±π 后方 / +右 -左
      var a = Math.abs(relYaw);
      if (a < Math.PI / 4) fx.dmgT[0] = 0.9;                 // 前(顶部)
      else if (a > Math.PI * 3 / 4) fx.dmgT[1] = 0.9;        // 后(底部)
      else if (relYaw > 0) fx.dmgT[3] = 0.9;                 // 右
      else fx.dmgT[2] = 0.9;                                 // 左
    } else {
      fx.dmgT[0] = fx.dmgT[1] = fx.dmgT[2] = fx.dmgT[3] = 0.6;
    }
    if (player.hp <= 0) {
      player.hp = 0;
      player.alive = false;
      endRound(false, 'dead');
    }
  }

  // ---------- 拆弹 ----------
  function defuseStep(dt, held) {
    if (phase !== 'playing') return;
    var o = objective;
    if (o.state === 'locked') {
      if (held && dist2(player.x, player.z, o.x, o.z) < DEFUSE_DIST + 0.8) {
        showToast('仍有敌人活动 — 先清场再拆除!', 1.6);
      }
      return;
    }
    if (o.state === 'defused') return;
    var near = player.alive && dist2(player.x, player.z, o.x, o.z) < DEFUSE_DIST;
    if (held && near) {
      if (o.state !== 'defusing') o.state = 'defusing';
      o.progress = Math.min(1, o.progress + dt / DEFUSE_TIME);
      beepAcc += dt;
      if (beepAcc > 0.16) { beepAcc = 0; sfx.beep(560 + o.progress * 620); }
      if (o.progress >= 1) {
        o.state = 'defused';
        endRound(true, 'defused');
      }
    } else if (o.state === 'defusing') {
      // 松开/离开:进度回退
      o.progress = Math.max(0, o.progress - dt * 0.7);
      if (o.progress <= 0) { o.progress = 0; o.state = 'ready'; }
    }
  }

  // ---------- 回合流程 ----------
  function resetGame() {
    gameTime = 0;
    timeLeft = ROUND_TIME;
    lastWholeSec = ROUND_TIME;
    player.x = 0; player.z = 23; player.feet = 0;
    player.yaw = 0; player.pitch = 0;
    player.hp = 100; player.alive = true;
    player.ammo = MAG_SIZE; player.reserve = RESERVE_START;
    player.reloading = false; player.reloadT = 0;
    player.fireCd = 0; player.dryCd = 0; player.speed2d = 0; player.bobPhase = 0;
    objective.state = 'locked'; objective.progress = 0;
    stats.shots = 0; stats.hits = 0; stats.kills = 0; stats.timeUsed = 0; stats.damageTaken = 0;
    enemies.forEach(resetEnemy);
    sparkPool.forEach(function (s) { s.life = 0; s.mesh.visible = false; });
    tracerPool.forEach(function (t) { t.life = 0; t.mesh.visible = false; });
    fx.hitmarkerT = 0; fx.vignetteT = 0; fx.toastT = 0; fx.fireT = 0;
    fx.dmgT = [0, 0, 0, 0];
    recoilV = 0; shakeT = 0; muzzleT = 0; beepAcc = 0;
    input.fire = false; input.interact = false; input.f = 0; input.r = 0;
    el.interactWrap.hidden = true;
    el.objMarker.hidden = true;
  }

  function startRound() {
    resetGame();
    phase = 'playing';
    paused = false;
    el.ovMenu.hidden = true;
    el.ovPause.hidden = true;
    el.ovEnd.hidden = true;
    el.hud.hidden = false;
    showToast(isTouch ? '清除 5 名敌人,然后到仓库内按住「拆除」按钮!' : '清除 5 名敌人,然后在仓库内长按 E 拆除装置!', 3.6);
    updateHUD();
  }

  function endRound(win, reason) {
    if (phase !== 'playing') return;
    phase = win ? 'won' : 'lost';
    paused = false;
    stats.timeUsed = Math.round((ROUND_TIME - timeLeft) * 10) / 10;
    input.fire = false; input.interact = false;
    fx.dmgT = [0, 0, 0, 0]; fx.vignetteT = 0;
    try { if (document.pointerLockElement) document.exitPointerLock(); } catch (e) { /* 忽略 */ }

    var newBest = false;
    if (win) {
      if (best === null || stats.timeUsed < best) {
        best = stats.timeUsed;
        newBest = true;
        try { localStorage.setItem('breachpoint_best_v1', String(best)); } catch (e) { /* 忽略 */ }
      }
      sfx.win();
    } else {
      sfx.lose();
    }

    el.endTitle.textContent = win ? '任务完成 · CLEAR' : '任务失败 · FAILED';
    el.endTitle.classList.toggle('fail', !win);
    el.endSub.textContent = win
      ? '装置已拆除,码头恢复安全。'
      : (reason === 'time' ? '倒计时归零,装置引爆。' : '你被敌人击倒了。');
    var acc = stats.shots > 0 ? Math.round(stats.hits / stats.shots * 100) : 0;
    var lines = [
      '用时  ' + stats.timeUsed.toFixed(1) + ' s',
      '击杀  ' + stats.kills + ' / ' + enemies.length,
      '命中率  ' + acc + '%(' + stats.hits + '/' + stats.shots + ')'
    ];
    if (best !== null) {
      lines.push((newBest ? '<span class="rec">★ 新纪录!</span> ' : '') + '最佳通关  ' + best.toFixed(1) + ' s');
    }
    el.endStats.innerHTML = lines.join('<br>');
    el.ovEnd.hidden = false;
    updateMenuBest();
    updateHUD();
  }

  function pauseGame(showUI) {
    if (phase !== 'playing' || paused) return;
    paused = true;
    input.fire = false;
    if (showUI !== false) el.ovPause.hidden = false;
    try { if (document.pointerLockElement) document.exitPointerLock(); } catch (e) { /* 忽略 */ }
  }

  function resumeGame() {
    if (phase !== 'playing' || !paused) return;
    paused = false;
    el.ovPause.hidden = true;
    if (!isTouch && !manualClock) requestLock();
  }

  function updateMenuBest() {
    el.menuBest.textContent = best === null ? '最佳通关:--' : '最佳通关:' + best.toFixed(1) + ' s';
  }

  // ---------- 输入 ----------
  var pointerLockFailed = false, dragLook = null;

  function requestLock() {
    var c = renderer.domElement;
    try {
      var p = c.requestPointerLock && c.requestPointerLock();
      if (p && p.catch) p.catch(function () { onLockFail(); });
    } catch (e) { onLockFail(); }
  }

  function onLockFail() {
    if (pointerLockFailed) return;
    pointerLockFailed = true;
    showToast('指针锁定不可用:按住鼠标拖动视角,点按射击', 3.2);
  }

  function applyLook(dxPx, dyPx) {
    var sens = 0.0023;
    player.yaw = angNorm(player.yaw - dxPx * sens);
    player.pitch = clamp(player.pitch - dyPx * sens, -1.45, 1.45);
  }

  function bindEvents() {
    var c = renderer.domElement;

    document.addEventListener('pointerlockchange', function () {
      if (!document.pointerLockElement && phase === 'playing' && !paused && !manualClock && !isTouch) {
        pauseGame(true);
      }
    });
    document.addEventListener('pointerlockerror', function () { onLockFail(); });

    document.addEventListener('keydown', function (ev) {
      var k = ev.code;
      if (k === 'KeyW' || k === 'KeyA' || k === 'KeyS' || k === 'KeyD' ||
          k === 'ArrowUp' || k === 'ArrowDown' || k === 'ArrowLeft' || k === 'ArrowRight' ||
          k === 'KeyE' || k === 'KeyR' || k === 'Space') {
        ev.preventDefault();
      }
      if (input.keys[k]) return;
      input.keys[k] = true;
      if (k === 'KeyR') doReload();
      if (k === 'KeyE') input.interact = true;
      if (k === 'Escape') {
        if (phase === 'playing') { if (paused) resumeGame(); else pauseGame(true); }
      }
    });
    document.addEventListener('keyup', function (ev) {
      input.keys[ev.code] = false;
      if (ev.code === 'KeyE') input.interact = false;
    });
    window.addEventListener('blur', function () {
      input.keys = {};
      input.fire = false; input.interact = false;
      if (phase === 'playing' && !paused && !manualClock) pauseGame(true);
    });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden && phase === 'playing' && !paused && !manualClock) pauseGame(true);
    });

    // 鼠标
    c.addEventListener('mousemove', function (ev) {
      if (document.pointerLockElement === c) {
        applyLook(ev.movementX || 0, ev.movementY || 0);
      } else if (dragLook) {
        var dx = ev.clientX - dragLook.x, dy = ev.clientY - dragLook.y;
        if (Math.abs(dx) + Math.abs(dy) > 6) dragLook.moved = true;
        applyLook(dx, dy);
        dragLook.x = ev.clientX; dragLook.y = ev.clientY;
      }
    });
    c.addEventListener('mousedown', function (ev) {
      if (ev.button !== 0 || phase !== 'playing' || paused || isTouch) return;
      if (document.pointerLockElement === c) {
        input.fire = true;
        tryFire();
      } else {
        // 降级拖拽模式:按下开始拖视角,若几乎未移动则视为点击射击
        dragLook = { x: ev.clientX, y: ev.clientY, moved: false };
        if (!pointerLockFailed) requestLock();
      }
    });
    window.addEventListener('mouseup', function (ev) {
      if (ev.button !== 0) return;
      input.fire = false;
      if (dragLook) {
        if (!dragLook.moved && phase === 'playing' && !paused) tryFire();
        dragLook = null;
      }
    });
    c.addEventListener('contextmenu', function (ev) { ev.preventDefault(); });

    // 界面按钮
    el.btnStart.addEventListener('click', function () {
      initAudio();
      startRound();
      if (!isTouch) requestLock();
    });
    el.btnAgain.addEventListener('click', function () {
      initAudio();
      startRound();
      if (!isTouch) requestLock();
    });
    el.btnMenu.addEventListener('click', function () {
      phase = 'menu';
      paused = false;
      el.ovEnd.hidden = true;
      el.hud.hidden = true;
      el.ovMenu.hidden = false;
      updateMenuBest();
    });
    el.btnResume.addEventListener('click', function () { resumeGame(); });
    el.btnRestartP.addEventListener('click', function () {
      el.ovPause.hidden = true;
      startRound();
      if (!isTouch) requestLock();
    });
    el.btnPause.addEventListener('click', function () {
      if (phase !== 'playing') return;
      if (paused) resumeGame(); else pauseGame(true);
    });
    el.btnMute.addEventListener('click', function () { setMuted(!muted); });
    el.btnMuteP.addEventListener('click', function () { setMuted(!muted); });

    // 触摸控制
    if (isTouch) {
      el.touchUI.hidden = false;
      var stickId = null, lookId = null, lookLast = null;
      var stickRect = null;

      el.stick.addEventListener('touchstart', function (ev) {
        ev.preventDefault();
        if (stickId !== null) return;
        var t = ev.changedTouches[0];
        stickId = t.identifier;
        stickRect = el.stick.getBoundingClientRect();
        stickMove(t);
      }, { passive: false });

      function stickMove(t) {
        var cx = stickRect.left + stickRect.width / 2;
        var cy = stickRect.top + stickRect.height / 2;
        var dx = clamp((t.clientX - cx) / 46, -1, 1);
        var dy = clamp((t.clientY - cy) / 46, -1, 1);
        input.r = dx;
        input.f = -dy;
        el.stickNub.style.transform = 'translate(-50%,-50%) translate(' + dx * 30 + 'px,' + dy * 30 + 'px)';
      }

      window.addEventListener('touchmove', function (ev) {
        for (var i = 0; i < ev.changedTouches.length; i++) {
          var t = ev.changedTouches[i];
          if (t.identifier === stickId) { ev.preventDefault(); stickMove(t); }
          else if (t.identifier === lookId && lookLast) {
            ev.preventDefault();
            applyLook((t.clientX - lookLast.x) * 1.5, (t.clientY - lookLast.y) * 1.5);
            lookLast = { x: t.clientX, y: t.clientY };
          }
        }
      }, { passive: false });

      window.addEventListener('touchend', function (ev) {
        for (var i = 0; i < ev.changedTouches.length; i++) {
          var t = ev.changedTouches[i];
          if (t.identifier === stickId) {
            stickId = null; input.f = 0; input.r = 0;
            el.stickNub.style.transform = 'translate(-50%,-50%)';
          }
          if (t.identifier === lookId) { lookId = null; lookLast = null; }
        }
      });
      window.addEventListener('touchcancel', function () {
        stickId = null; lookId = null; lookLast = null;
        input.f = 0; input.r = 0;
        el.stickNub.style.transform = 'translate(-50%,-50%)';
      });

      el.lookArea.addEventListener('touchstart', function (ev) {
        ev.preventDefault();
        if (lookId !== null) return;
        var t = ev.changedTouches[0];
        lookId = t.identifier;
        lookLast = { x: t.clientX, y: t.clientY };
      }, { passive: false });

      function bindHold(btn, down, up) {
        btn.addEventListener('touchstart', function (ev) {
          ev.preventDefault(); btn.classList.add('on'); down();
        }, { passive: false });
        btn.addEventListener('touchend', function (ev) {
          ev.preventDefault(); btn.classList.remove('on'); if (up) up();
        }, { passive: false });
        btn.addEventListener('touchcancel', function () {
          btn.classList.remove('on'); if (up) up();
        });
      }
      bindHold(el.tbFire, function () { initAudio(); input.fire = true; tryFire(); },
        function () { input.fire = false; });
      bindHold(el.tbReload, function () { doReload(); }, null);
      bindHold(el.tbAct, function () { input.interact = true; }, function () { input.interact = false; });
    }

    window.addEventListener('resize', onResize);
  }

  // ---------- HUD ----------
  function showToast(text, dur) {
    el.toast.textContent = text;
    el.toast.hidden = false;
    fx.toastT = dur || 2.4;
  }

  function updateHUD() {
    // 计时
    var tSec = Math.max(0, Math.ceil(timeLeft));
    el.timer.textContent = String(tSec);
    el.timer.classList.toggle('low', timeLeft <= 15 && phase === 'playing');
    // 目标
    var remain = aliveEnemyCount();
    if (objective.state === 'locked') el.objective.textContent = '目标:清除敌人(剩 ' + remain + ')';
    else if (objective.state === 'defused') el.objective.textContent = '装置已拆除';
    else el.objective.textContent = isTouch ? '目标:按住「拆除」钮拆除装置' : '目标:长按 E 拆除仓库内装置';
    el.enemies.textContent = '敌人 ' + remain;
    // 生命
    el.hpFill.style.width = clamp(player.hp, 0, 100) + '%';
    el.hpFill.classList.toggle('low', player.hp <= 35);
    el.hpNum.textContent = String(Math.max(0, Math.round(player.hp)));
    // 弹药
    el.ammoMag.textContent = String(player.ammo);
    el.ammoMag.classList.toggle('empty', player.ammo === 0 && !player.reloading);
    el.ammoRes.textContent = String(player.reserve);
    if (player.reloading) { el.ammoState.textContent = '换弹中…'; el.ammoState.classList.add('warn'); }
    else if (player.ammo === 0 && player.reserve === 0) { el.ammoState.textContent = '弹药耗尽'; el.ammoState.classList.add('warn'); }
    else if (player.ammo === 0) { el.ammoState.textContent = isTouch ? '点「换弹」' : '按 R 换弹'; el.ammoState.classList.add('warn'); }
    else { el.ammoState.textContent = '已上膛'; el.ammoState.classList.remove('warn'); }
    // 瞬态
    el.crosshair.classList.toggle('fire', fx.fireT > 0);
    if (fx.hitmarkerT > 0) {
      el.hitmarker.classList.add('show');
      el.hitmarker.classList.toggle('kill', fx.hitmarkerKill);
    } else {
      el.hitmarker.classList.remove('show');
    }
    el.vignette.style.opacity = fx.vignetteT > 0 ? String(Math.min(1, fx.vignetteT * 2)) : '0';
    el.lowhp.style.opacity = (player.alive && player.hp < 35 && phase === 'playing')
      ? String((1 - player.hp / 35) * 0.85) : '0';
    el.dmg.t.style.opacity = String(Math.min(1, fx.dmgT[0] * 1.4));
    el.dmg.b.style.opacity = String(Math.min(1, fx.dmgT[1] * 1.4));
    el.dmg.l.style.opacity = String(Math.min(1, fx.dmgT[2] * 1.4));
    el.dmg.r.style.opacity = String(Math.min(1, fx.dmgT[3] * 1.4));
    if (fx.toastT <= 0 && !el.toast.hidden) el.toast.hidden = true;
    // 拆弹交互
    var showInteract = false;
    if (phase === 'playing' && (objective.state === 'ready' || objective.state === 'defusing')) {
      var near = dist2(player.x, player.z, objective.x, objective.z) < DEFUSE_DIST + 0.7;
      if (near) {
        showInteract = true;
        el.interactText.textContent = objective.state === 'defusing'
          ? '拆除中… ' + Math.round(objective.progress * 100) + '%'
          : (isTouch ? '按住「拆除」按钮拆除装置' : '长按 E 拆除装置');
        el.interactFill.style.width = (objective.progress * 100) + '%';
      }
    }
    el.interactWrap.hidden = !showInteract;
    if (isTouch) el.tbAct.classList.toggle('ready', objective.state === 'ready' || objective.state === 'defusing');
  }

  // 屏幕目标标记(投影)
  function updateObjMarker() {
    var show = phase === 'playing' && (objective.state === 'ready' || objective.state === 'defusing');
    if (!show) { el.objMarker.hidden = true; return; }
    vTmp.set(objective.x, 1.6, objective.z);
    vTmp.project(camera);
    if (vTmp.z > 1 || vTmp.z < -1) { el.objMarker.hidden = true; return; }
    var w = el.viewport.clientWidth, h = el.viewport.clientHeight;
    var sx = (vTmp.x * 0.5 + 0.5) * w;
    var sy = (-vTmp.y * 0.5 + 0.5) * h;
    if (sx < -40 || sx > w + 40 || sy < -40 || sy > h + 40) { el.objMarker.hidden = true; return; }
    el.objMarker.hidden = false;
    el.objMarker.style.left = sx + 'px';
    el.objMarker.style.top = sy + 'px';
  }

  // ---------- 更新主体 ----------
  function tickTimers(dt) {
    fx.hitmarkerT = Math.max(0, fx.hitmarkerT - dt);
    fx.vignetteT = Math.max(0, fx.vignetteT - dt);
    fx.fireT = Math.max(0, fx.fireT - dt);
    fx.toastT = Math.max(0, fx.toastT - dt);
    for (var i = 0; i < 4; i++) fx.dmgT[i] = Math.max(0, fx.dmgT[i] - dt * 1.3);
    recoilV *= Math.exp(-8 * dt);
    shakeT = Math.max(0, shakeT - dt);
    muzzleT = Math.max(0, muzzleT - dt);
    player.fireCd = Math.max(0, player.fireCd - dt);
    player.dryCd = Math.max(0, player.dryCd - dt);
  }

  function updateWeapon(dt) {
    if (player.reloading) {
      player.reloadT -= dt;
      if (player.reloadT <= 0) {
        player.reloading = false;
        var need = MAG_SIZE - player.ammo;
        var take = Math.min(need, player.reserve);
        player.ammo += take;
        player.reserve -= take;
      }
    }
    if (input.fire) tryFire();
  }

  function update(dt) {
    gameTime += dt;
    timeLeft -= dt;
    if (timeLeft <= 0) {
      timeLeft = 0;
      endRound(false, 'time');
      return;
    }
    if (timeLeft <= 5.5 && Math.ceil(timeLeft) < lastWholeSec) {
      lastWholeSec = Math.ceil(timeLeft);
      sfx.tick();
    }
    tickTimers(dt);

    // 键盘输入合成
    if (!isTouch) {
      var f = 0, r = 0;
      if (input.keys['KeyW'] || input.keys['ArrowUp']) f += 1;
      if (input.keys['KeyS'] || input.keys['ArrowDown']) f -= 1;
      if (input.keys['KeyD'] || input.keys['ArrowRight']) r += 1;
      if (input.keys['KeyA'] || input.keys['ArrowLeft']) r -= 1;
      input.f = f; input.r = r;
    }
    movePlayer(dt, input.f, input.r);
    updateWeapon(dt);
    for (var i = 0; i < enemies.length; i++) updateEnemy(enemies[i], dt);
    defuseStep(dt, input.interact);
    updateParticles(dt);
    updateHUD();
  }

  // ---------- 渲染 ----------
  function syncCamera() {
    camera.position.set(player.x, playerEye(), player.z);
    camera.rotation.order = 'YXZ';
    camera.rotation.y = player.yaw;
    camera.rotation.x = player.pitch + recoilV;
    camera.rotation.z = 0;
    if (shakeT > 0) {
      var amp = (reducedMotion ? 0.006 : 0.02) * (shakeT / 0.07);
      camera.position.x += (Math.random() - 0.5) * amp;
      camera.position.y += (Math.random() - 0.5) * amp;
    }
    // 武器摆动
    var bob = Math.sin(player.bobPhase) * (player.speed2d > 0.3 ? 0.008 : 0);
    var bobY = Math.abs(Math.cos(player.bobPhase)) * (player.speed2d > 0.3 ? 0.006 : 0);
    gunGroup.position.set(0.19 + bob, -0.155 - bobY, -0.3);
    if (player.reloading) {
      var pr = 1 - player.reloadT / RELOAD_TIME;
      gunGroup.rotation.x = Math.sin(pr * Math.PI) * 0.7;
    } else {
      gunGroup.rotation.x = 0;
    }
    if (recoilV > 0.0005) gunGroup.position.z = -0.3 + recoilV * 2.0;
    gunFlash.visible = muzzleT > 0;
    if (gunFlash.visible) gunFlash.rotation.z = Math.random() * Math.PI;
    muzzleLight.intensity = muzzleT > 0 ? 2.4 : 0;
  }

  var menuOrbitT = 0;

  function render(realDt) {
    if (phase === 'menu') {
      menuOrbitT += realDt || 0.016;
      var a = menuOrbitT * 0.1;
      camera.position.set(Math.sin(a) * 30, 13, Math.cos(a) * 30 + 2);
      camera.rotation.order = 'YXZ';
      camera.lookAt(0, 1.2, -8);
    } else {
      syncCamera();
    }
    // 装置动画(用 gameTime,暂停即冻结;menu 下用轨道时间)
    var pulseT = phase === 'menu' ? menuOrbitT : gameTime;
    var pulse = 0.5 + Math.sin(pulseT * 4.5) * 0.5;
    var armed = objective.state === 'locked';
    var col = armed ? 0xff4433 : (objective.state === 'defused' ? 0x3dff8a : 0x35d977);
    deviceLamp.material.color.setHex(col);
    deviceLamp.scale.setScalar(0.8 + pulse * 0.45);
    devicePillar.material.color.setHex(col);
    devicePillar.material.opacity = 0.09 + pulse * 0.08;
    deviceRing.material.opacity = (objective.state === 'ready' || objective.state === 'defusing')
      ? 0.25 + pulse * 0.3 : 0;
    updateObjMarker();
    renderer.render(scene, camera);
  }

  // ---------- 主循环 ----------
  var lastFrameT = 0;

  function frame(t) {
    requestAnimationFrame(frame);
    var dt = Math.min((t - lastFrameT) / 1000, 0.05);
    if (!(dt > 0)) dt = 0.016;
    lastFrameT = t;
    if (!manualClock && phase === 'playing' && !paused) {
      update(dt);
    }
    render(dt);
  }

  function onResize() {
    var w = el.viewport.clientWidth || window.innerWidth || 1;
    var h = el.viewport.clientHeight || window.innerHeight || 1;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  // ---------- 测试接口 ----------
  function stepManual(ms) {
    if (!isFinite(ms) || ms <= 0) return;
    if (paused || phase !== 'playing') { render(0); return; }
    var remain = ms / 1000;
    while (remain > 1e-6 && phase === 'playing' && !paused) {
      var dt = Math.min(remain, 1 / 60);
      update(dt);
      remain -= dt;
    }
    render(0);
  }

  window.__BREACH_TEST__ = {
    snapshot: function () {
      var size = new THREE.Vector2();
      renderer.getSize(size);
      var gl = null;
      try { gl = renderer.getContext(); } catch (e) { gl = null; }
      return {
        phase: phase,
        paused: paused,
        manualClock: manualClock,
        timeLeft: Math.round(timeLeft * 1000) / 1000,
        player: {
          x: player.x, y: playerEye(), z: player.z,
          yaw: player.yaw, pitch: player.pitch,
          hp: player.hp, ammo: player.ammo, reserve: player.reserve,
          reloading: player.reloading, alive: player.alive
        },
        enemies: enemies.map(function (e) {
          return { id: e.id, x: e.x, y: e.feet, z: e.z, hp: e.hp, state: e.state, alive: e.alive };
        }),
        objective: {
          state: objective.state,
          progress: Math.round(objective.progress * 1000) / 1000,
          x: objective.x, y: objective.y, z: objective.z
        },
        stats: {
          shots: stats.shots, hits: stats.hits, kills: stats.kills,
          timeUsed: stats.timeUsed, damageTaken: Math.round(stats.damageTaken * 10) / 10,
          best: best
        },
        renderer: {
          isWebGL: !!(gl && (typeof WebGLRenderingContext !== 'undefined' && gl instanceof WebGLRenderingContext ||
                    typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext)),
          width: size.x, height: size.y,
          threeRevision: THREE.REVISION
        }
      };
    },
    start: function () {
      if (phase === 'menu' || phase === 'won' || phase === 'lost') startRound();
      return phase;
    },
    restart: function () { startRound(); return phase; },
    pause: function () { pauseGame(true); return paused; },
    resume: function () { resumeGame(); return paused; },
    setManualClock: function (enabled) {
      manualClock = !!enabled;
      return manualClock;
    },
    step: function (ms) {
      if (!manualClock) return false;
      stepManual(ms);
      return true;
    },
    setPlayerPose: function (pose) {
      if (!pose || phase !== 'playing') return false;
      if (isFinite(pose.x)) player.x = clamp(pose.x, MAP.x0 + PLAYER_R, MAP.x1 - PLAYER_R);
      if (isFinite(pose.z)) player.z = clamp(pose.z, MAP.z0 + PLAYER_R, MAP.z1 - PLAYER_R);
      player.feet = groundHeightAt(player.x, player.z, 10);
      if (isFinite(pose.yaw)) player.yaw = angNorm(pose.yaw);
      if (isFinite(pose.pitch)) player.pitch = clamp(pose.pitch, -1.45, 1.45);
      syncCamera();
      render(0);
      return true;
    },
    move: function (forward, right, ms) {
      if (phase !== 'playing' || paused) return false;
      forward = clamp(isFinite(forward) ? forward : 0, -1, 1);
      right = clamp(isFinite(right) ? right : 0, -1, 1);
      var remain = (isFinite(ms) ? ms : 16) / 1000;
      while (remain > 1e-6) {
        var dt = Math.min(remain, 1 / 60);
        movePlayer(dt, forward, right);
        remain -= dt;
      }
      syncCamera();
      render(0);
      return true;
    },
    aimAtEnemy: function (id) {
      var e = null;
      for (var i = 0; i < enemies.length; i++) if (enemies[i].id === id) { e = enemies[i]; break; }
      if (!e || !e.alive) return false;
      var dx = e.x - player.x;
      var dy = (e.feet + 1.2) - playerEye();
      var dz = e.z - player.z;
      player.yaw = Math.atan2(-dx, -dz);
      player.pitch = clamp(Math.atan2(dy, Math.sqrt(dx * dx + dz * dz)), -1.45, 1.45);
      syncCamera();
      return true;
    },
    shoot: function () { return tryFire(); },
    reload: function () { doReload(); return player.reloading; },
    damagePlayer: function (amount) {
      if (!isFinite(amount)) return player.hp;
      hurtPlayer(amount, null);
      return player.hp;
    },
    eliminateEnemy: function (id) {
      for (var i = 0; i < enemies.length; i++) {
        if (enemies[i].id === id && enemies[i].alive) {
          damageEnemy(enemies[i], 9999);
          return true;
        }
      }
      return false;
    },
    interact: function (ms) {
      if (phase !== 'playing' || paused) return objective.progress;
      var remain = (isFinite(ms) ? ms : 0) / 1000;
      while (remain > 1e-6 && phase === 'playing') {
        var dt = Math.min(remain, 1 / 60);
        defuseStep(dt, true);
        remain -= dt;
      }
      render(0);
      return objective.progress;
    }
  };

  // ---------- 启动 ----------
  function init() {
    try {
      renderer = new THREE.WebGLRenderer({ antialias: !isTouch, powerPreference: 'high-performance' });
    } catch (e) {
      var err = document.createElement('div');
      err.style.cssText = 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;color:#fff;background:#0b141a;padding:24px;text-align:center;';
      err.textContent = '当前浏览器无法创建 WebGL 上下文,无法运行本游戏。';
      document.body.appendChild(err);
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isTouch ? 1.5 : 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    el.viewport.appendChild(renderer.domElement);

    buildWorld();
    createEnemies();
    resetGame();
    updateMenuBest();
    bindEvents();
    onResize();
    if (isTouch) document.body.classList.add('touch');
    requestAnimationFrame(function (t) { lastFrameT = t; requestAnimationFrame(frame); });
  }

  init();
})();
