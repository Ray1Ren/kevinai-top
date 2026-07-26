/* ============================================================
   Breach Point / 破门点
   原创低多边形海港仓库 3D 第一人称拆弹训练场
   仅依赖本地预置 Three.js r147 (MIT)。无外部资源、无网络请求。
   ------------------------------------------------------------
   Part 1 / 4 : 配置 · 工具 · DOM · 音频
   ============================================================ */
'use strict';
var BP = (function () {

  /* ===================== 配置 ===================== */
  var VERSION = '1.0.0';
  var CFG = {
    mission: { time: 75, defuseTime: 1.5, defuseRange: 2.9, grace: 1.8, decay: 1.0 },
    player: {
      hp: 100, radius: 0.42, height: 1.8, eye: 1.62,
      speed: 5.7, slow: 2.9, accel: 42, friction: 15,
      gravity: 24, step: 0.56, fov: 76
    },
    weapon: {
      magSize: 12, reserveStart: 36, fireInterval: 0.115, reloadTime: 1.55,
      dmgBody: 30, dmgHead: 66, range: 92,
      spreadBase: 0.0042, spreadMove: 0.011, spreadShot: 0.0055,
      spreadMax: 0.052, spreadRecover: 0.075,
      recoilPitch: 0.026, recoilYaw: 0.0095, kick: 0.06
    },
    enemy: {
      hp: 80, speedPatrol: 2.25, speedChase: 3.35,
      view: 27, fov: 2.05, radius: 0.5, height: 1.85, eye: 1.6,
      dmg: 8, burst: 3, shotGap: 0.3, burstGap: 2.3,
      reaction: 0.55, memory: 4.5,
      hitBase: 0.6, hitFalloff: 0.021, hitMoveMalus: 0.13,
      keepMin: 4.2, keepMax: 13.5
    },
    bounds: { x0: -23.4, x1: 23.4, z0: -19.4, z1: 27.7 },
    spawn: { x: 0.6, z: 25.4, yaw: 0 },
    sens: { mouse: 0.0022, touch: 0.0042, drag: 0.0032 }
  };

  var LS_BEST = 'breachpoint.v1.best';
  var LS_MUTE = 'breachpoint.v1.muted';

  /* ===================== 小工具 ===================== */
  var TAU = Math.PI * 2;
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function r4(v) { return Math.round(v * 1e4) / 1e4; }
  function r2(v) { return Math.round(v * 100) / 100; }
  function num(v, d) { v = Number(v); return isFinite(v) ? v : d; }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function pick(arr) { return arr[(Math.random() * arr.length) | 0]; }
  function dist2(ax, az, bx, bz) { var dx = ax - bx, dz = az - bz; return Math.sqrt(dx * dx + dz * dz); }
  function angDiff(a, b) { var d = (a - b) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; }
  function smooth(t) { return t * t * (3 - 2 * t); }

  function lsGet(k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { window.localStorage.setItem(k, v); } catch (e) { } }

  /* ===================== DOM ===================== */
  var $ = function (id) { return document.getElementById(id); };
  var D = {};
  function grabDom() {
    [
      'gl', 'hud', 'vignette', 'lowhp', 'dmg-top', 'dmg-bottom', 'dmg-left', 'dmg-right',
      'markers', 'hp-fill', 'hp-value', 'timer', 'enemies-left', 'objective-line', 'objective-text',
      'hud-controls', 'btn-pause', 'btn-mute', 'btn-restart', 'crosshair', 'hitmarker',
      'ammo-mag', 'ammo-reserve', 'reload-track', 'reload-bar', 'ammo-hint',
      'defuse-panel', 'defuse-ring', 'defuse-pct', 'defuse-text',
      'killfeed', 'toast', 'fallback-hint',
      'touch', 'look-pad', 'stick', 'stick-knob', 'tbtn-fire', 'tbtn-reload', 'tbtn-interact',
      'screen-menu', 'btn-start', 'best-menu',
      'screen-pause', 'btn-resume', 'btn-restart2', 'btn-quit',
      'screen-result', 'result-code', 'result-title', 'result-sub', 'result-stats', 'result-best',
      'btn-again', 'btn-menu', 'fatal', 'fatal-msg'
    ].forEach(function (id) { D[id] = $(id); });
  }

  function show(el, on) { if (el) el.classList[on ? 'remove' : 'add']('hidden'); }

  /* ===================== 程序化音频 ===================== */
  var Audio2 = {
    ctx: null, master: null, comp: null, amb: null, ambGain: null,
    muted: (lsGet(LS_MUTE) === '1'), ready: false, noise: null, failed: false,

    init: function () {
      if (this.ready || this.failed) return this.ready;
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) { this.failed = true; return false; }
      try {
        var ctx = new AC();
        this.ctx = ctx;
        var comp = ctx.createDynamicsCompressor();
        comp.threshold.value = -16; comp.knee.value = 22;
        comp.ratio.value = 5; comp.attack.value = 0.004; comp.release.value = 0.16;
        var master = ctx.createGain();
        master.gain.value = this.muted ? 0 : 0.62;
        master.connect(comp); comp.connect(ctx.destination);
        this.master = master; this.comp = comp;

        // 复用噪声缓冲
        var len = Math.floor(ctx.sampleRate * 1.2);
        var buf = ctx.createBuffer(1, len, ctx.sampleRate);
        var d = buf.getChannelData(0);
        for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
        this.noise = buf;

        this.buildAmbience();
        this.ready = true;
        return true;
      } catch (e) { this.failed = true; return false; }
    },

    resume: function () {
      if (!this.init()) return;
      if (this.ctx.state === 'suspended') { try { this.ctx.resume(); } catch (e) { } }
    },

    buildAmbience: function () {
      var ctx = this.ctx, g = ctx.createGain();
      g.gain.value = 0; g.connect(this.master);
      this.ambGain = g;
      // 海港低频涌动
      var o1 = ctx.createOscillator(); o1.type = 'sine'; o1.frequency.value = 46;
      var o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = 69.5;
      var og = ctx.createGain(); og.gain.value = 0.5;
      o1.connect(og); o2.connect(og);
      // 风噪
      var ns = ctx.createBufferSource(); ns.buffer = this.noise; ns.loop = true;
      var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 340; lp.Q.value = 0.6;
      var ng = ctx.createGain(); ng.gain.value = 0.22;
      ns.connect(lp); lp.connect(ng);
      og.connect(g); ng.connect(g);
      try { o1.start(); o2.start(); ns.start(); } catch (e) { }
      this.amb = { o1: o1, o2: o2, ns: ns };
    },

    setAmbient: function (on) {
      if (!this.ready || !this.ambGain) return;
      var t = this.ctx.currentTime;
      this.ambGain.gain.cancelScheduledValues(t);
      this.ambGain.gain.setTargetAtTime(on ? 0.16 : 0.0, t, 0.25);
    },

    setMuted: function (m) {
      this.muted = !!m;
      lsSet(LS_MUTE, this.muted ? '1' : '0');
      if (this.ready) {
        var t = this.ctx.currentTime;
        this.master.gain.cancelScheduledValues(t);
        this.master.gain.setTargetAtTime(this.muted ? 0 : 0.62, t, 0.03);
      }
    },

    /* --- 基础发声块 --- */
    _noiseBurst: function (o) {
      var ctx = this.ctx, t = ctx.currentTime + (o.delay || 0);
      var src = ctx.createBufferSource(); src.buffer = this.noise;
      src.playbackRate.value = o.rate || 1;
      var f = ctx.createBiquadFilter();
      f.type = o.type || 'bandpass';
      f.frequency.value = o.freq || 1200;
      f.Q.value = o.q || 1;
      var g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0002, o.gain || 0.3), t + (o.atk || 0.004));
      g.gain.exponentialRampToValueAtTime(0.0001, t + (o.dur || 0.12));
      src.connect(f); f.connect(g);
      if (o.sweepTo) f.frequency.exponentialRampToValueAtTime(o.sweepTo, t + (o.dur || 0.12));
      g.connect(o.dest || this.master);
      src.start(t, o.offset || (Math.random() * 0.5)); src.stop(t + (o.dur || 0.12) + 0.03);
      return g;
    },

    _tone: function (o) {
      var ctx = this.ctx, t = ctx.currentTime + (o.delay || 0);
      var osc = ctx.createOscillator(); osc.type = o.type || 'sine';
      osc.frequency.setValueAtTime(o.f0 || 220, t);
      if (o.f1) osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.f1), t + (o.dur || 0.15));
      var g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0002, o.gain || 0.2), t + (o.atk || 0.006));
      g.gain.exponentialRampToValueAtTime(0.0001, t + (o.dur || 0.15));
      osc.connect(g); g.connect(o.dest || this.master);
      osc.start(t); osc.stop(t + (o.dur || 0.15) + 0.03);
      return g;
    },

    _spatial: function (pan, lowpass) {
      var ctx = this.ctx;
      var node;
      if (ctx.createStereoPanner) { node = ctx.createStereoPanner(); node.pan.value = clamp(pan || 0, -1, 1); }
      else { node = ctx.createGain(); }
      var out = node;
      if (lowpass) {
        var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = lowpass;
        node.connect(lp); lp.connect(this.master); return { input: node, out: lp };
      }
      node.connect(this.master);
      return { input: node, out: out };
    },

    /* --- 具体音效 --- */
    shot: function () {
      if (!this.ready) return;
      this._noiseBurst({ freq: 2400, q: 0.55, gain: 0.5, dur: 0.1, type: 'bandpass', sweepTo: 700 });
      this._noiseBurst({ freq: 620, q: 0.9, gain: 0.34, dur: 0.16, type: 'lowpass' });
      this._tone({ type: 'square', f0: 168, f1: 44, gain: 0.24, dur: 0.11 });
      this._noiseBurst({ freq: 3400, q: 3.2, gain: 0.1, dur: 0.34, delay: 0.05, type: 'bandpass' });
    },
    enemyShot: function (pan, dist) {
      if (!this.ready) return;
      var sp = this._spatial(pan, clamp(4200 - dist * 95, 700, 4200));
      var g = clamp(0.34 - dist * 0.008, 0.06, 0.34);
      this._noiseBurst({ freq: 1700, q: 0.6, gain: g, dur: 0.1, sweepTo: 480, dest: sp.input });
      this._tone({ type: 'square', f0: 128, f1: 40, gain: g * 0.5, dur: 0.1, dest: sp.input });
    },
    hitMark: function (headshot) {
      if (!this.ready) return;
      this._tone({ type: 'triangle', f0: headshot ? 1750 : 1220, f1: headshot ? 900 : 700, gain: 0.2, dur: 0.075, atk: 0.002 });
      this._noiseBurst({ freq: 5200, q: 2, gain: 0.11, dur: 0.05 });
    },
    kill: function () {
      if (!this.ready) return;
      this._tone({ type: 'triangle', f0: 640, f1: 300, gain: 0.2, dur: 0.2 });
      this._tone({ type: 'sine', f0: 190, f1: 82, gain: 0.24, dur: 0.3, delay: 0.03 });
      this._noiseBurst({ freq: 900, q: 0.7, gain: 0.16, dur: 0.26, type: 'lowpass', delay: 0.02 });
    },
    impact: function (pan) {
      if (!this.ready) return;
      var sp = this._spatial(pan);
      this._noiseBurst({ freq: 3100, q: 1.6, gain: 0.13, dur: 0.07, dest: sp.input });
    },
    hurt: function () {
      if (!this.ready) return;
      this._tone({ type: 'sine', f0: 132, f1: 52, gain: 0.32, dur: 0.28 });
      this._noiseBurst({ freq: 460, q: 0.8, gain: 0.24, dur: 0.19, type: 'lowpass' });
    },
    reloadOut: function () {
      if (!this.ready) return;
      this._noiseBurst({ freq: 2100, q: 4, gain: 0.14, dur: 0.05 });
      this._tone({ type: 'square', f0: 300, f1: 150, gain: 0.07, dur: 0.05 });
    },
    reloadIn: function () {
      if (!this.ready) return;
      this._noiseBurst({ freq: 1500, q: 3, gain: 0.17, dur: 0.07, delay: 0.02 });
      this._noiseBurst({ freq: 3300, q: 5, gain: 0.12, dur: 0.05, delay: 0.14 });
      this._tone({ type: 'square', f0: 420, f1: 180, gain: 0.08, dur: 0.06, delay: 0.15 });
    },
    empty: function () {
      if (!this.ready) return;
      this._noiseBurst({ freq: 2600, q: 7, gain: 0.13, dur: 0.04 });
      this._tone({ type: 'square', f0: 780, f1: 420, gain: 0.05, dur: 0.04 });
    },
    alarm: function () {
      if (!this.ready) return;
      for (var i = 0; i < 2; i++) {
        this._tone({ type: 'sawtooth', f0: 700, f1: 690, gain: 0.1, dur: 0.13, delay: i * 0.2 });
        this._tone({ type: 'sawtooth', f0: 470, f1: 462, gain: 0.09, dur: 0.13, delay: i * 0.2 + 0.1 });
      }
    },
    cleared: function () {
      if (!this.ready) return;
      [0, 0.11, 0.22].forEach(function (d, i) {
        Audio2._tone({ type: 'triangle', f0: 520 + i * 180, f1: 520 + i * 180, gain: 0.15, dur: 0.16, delay: d });
      });
    },
    beep: function (p) {
      if (!this.ready) return;
      this._tone({ type: 'square', f0: 620 + p * 700, f1: 620 + p * 700, gain: 0.09, dur: 0.06 });
    },
    win: function () {
      if (!this.ready) return;
      var seq = [392, 523, 659, 784, 1046];
      seq.forEach(function (f, i) {
        Audio2._tone({ type: 'triangle', f0: f, f1: f, gain: 0.17, dur: 0.34, delay: i * 0.115 });
        Audio2._tone({ type: 'sine', f0: f / 2, f1: f / 2, gain: 0.1, dur: 0.4, delay: i * 0.115 });
      });
      this._noiseBurst({ freq: 6000, q: 1, gain: 0.07, dur: 0.7, delay: 0.05 });
    },
    lose: function () {
      if (!this.ready) return;
      var seq = [392, 330, 262, 196];
      seq.forEach(function (f, i) {
        Audio2._tone({ type: 'sawtooth', f0: f, f1: f * 0.97, gain: 0.13, dur: 0.42, delay: i * 0.17 });
      });
      this._tone({ type: 'sine', f0: 110, f1: 44, gain: 0.26, dur: 1.1, delay: 0.2 });
    }
  };

  /* 暴露给后续分片 */
  return {
    VERSION: VERSION, CFG: CFG, LS_BEST: LS_BEST, LS_MUTE: LS_MUTE,
    TAU: TAU, clamp: clamp, lerp: lerp, r4: r4, r2: r2, num: num, rnd: rnd, pick: pick,
    dist2: dist2, angDiff: angDiff, smooth: smooth, lsGet: lsGet, lsSet: lsSet,
    $: $, D: D, grabDom: grabDom, show: show, Audio2: Audio2
  };
})();

/* ============================================================
   Part 2 / 4 : 渲染器 · 材质 · 关卡几何 · 碰撞 · 特效池
   ============================================================ */
(function (BP) {
  'use strict';
  var CFG = BP.CFG, clamp = BP.clamp, rnd = BP.rnd;

  var W = BP.World = {
    renderer: null, scene: null, camera: null, sun: null,
    colliders: [], decorGroup: null, fxGroup: null,
    quality: { shadows: true, particles: 1, shake: 1, dpr: 1 },
    device: null, enemyMeshes: [], weapon: null,
    ready: false, contextLost: false
  };

  /* ---------- 几何缓存 ---------- */
  var geoCache = {};
  function boxGeo(w, h, d) {
    var k = 'b' + w + '_' + h + '_' + d;
    if (!geoCache[k]) geoCache[k] = new THREE.BoxGeometry(w, h, d);
    return geoCache[k];
  }
  function cylGeo(rt, rb, h, seg) {
    var k = 'c' + rt + '_' + rb + '_' + h + '_' + seg;
    if (!geoCache[k]) geoCache[k] = new THREE.CylinderGeometry(rt, rb, h, seg || 8);
    return geoCache[k];
  }
  W.boxGeo = boxGeo; W.cylGeo = cylGeo;

  /* ---------- 材质 ---------- */
  var M = {};
  function std(color, rough, metal, flat) {
    return new THREE.MeshStandardMaterial({
      color: color, roughness: rough == null ? 0.92 : rough,
      metalness: metal == null ? 0.05 : metal, flatShading: flat !== false
    });
  }
  function basic(color, opts) {
    var o = { color: color };
    if (opts) for (var k in opts) o[k] = opts[k];
    return new THREE.MeshBasicMaterial(o);
  }
  function emis(color, inten) {
    var m = std(color, 0.6, 0.0);
    m.emissive = new THREE.Color(color);
    m.emissiveIntensity = inten == null ? 0.8 : inten;
    return m;
  }
  W.M = M;

  function buildMaterials() {
    M.groundA = std(0x8a8d88, 0.98, 0.02);
    M.groundB = std(0x767a78, 0.98, 0.02);
    M.groundWet = std(0x4a565f, 0.42, 0.12);
    M.floorIn = std(0x555f68, 0.96, 0.03);
    M.curb = std(0x9aa4a6, 0.95, 0.02);

    M.wall = std(0x8b9498, 0.95, 0.03);
    M.wallPanel = std(0x74807f, 0.95, 0.03);
    M.wallRust = std(0x8a6a4a, 0.96, 0.04);
    M.windowDark = std(0x1b262e, 0.5, 0.2);
    M.wallIn = std(0x6d7a84, 0.94, 0.03);
    M.wallTrim = std(0xbcc6c8, 0.9, 0.05);
    M.perim = std(0x8b949a, 0.96, 0.03);
    M.roof = std(0x4c5a66, 0.9, 0.12);
    M.beam = std(0x394653, 0.8, 0.25);

    M.conA = std(0xc06630, 0.86, 0.14);   // 锈橙
    M.conB = std(0x2c7c78, 0.86, 0.14);   // 青绿
    M.conC = std(0x4a5c7c, 0.86, 0.14);   // 钢蓝
    M.conD = std(0x8a8f52, 0.86, 0.14);   // 橄榄
    M.conRib = std(0x2b3238, 0.85, 0.2);

    M.crate = std(0xa97b42, 0.95, 0.02);
    M.crateEdge = std(0x7d5628, 0.95, 0.02);
    M.pallet = std(0x8d6a3a, 0.96, 0.02);
    M.barrel = std(0xb8433a, 0.7, 0.3);
    M.barrelB = std(0x3f6f8a, 0.7, 0.3);
    M.sand = std(0x9a8f6d, 0.98, 0.0);

    M.metal = std(0x8b959c, 0.45, 0.6);
    M.metalDark = std(0x39424a, 0.55, 0.55);
    M.rail = std(0xd7a13c, 0.72, 0.25);
    M.hazard = std(0xd8b23a, 0.9, 0.05);

    M.water = std(0x143444, 0.28, 0.35);
    M.hull = std(0x3a4652, 0.8, 0.25);
    M.hullRed = std(0x7b3830, 0.85, 0.15);
    M.far = std(0x415767, 0.95, 0.05);
    M.farDark = std(0x2c3d4c, 0.95, 0.05);

    M.glowCyan = basic(0x8df3ff, { fog: false });
    M.glowCyanSoft = basic(0x5fd8ee, { transparent: true, opacity: 0.3, fog: false, depthWrite: false });
    M.glowAmber = basic(0xffb03a, { fog: false });
    M.glowRed = basic(0xff5a3c, { fog: false });
    M.glowWhite = basic(0xfff4de, { fog: false });
    M.paintY = basic(0xd9b03c, { transparent: true, opacity: 0.85 });
    M.paintC = basic(0x63eaff, { transparent: true, opacity: 0.55 });
    M.shadowBlob = basic(0x000000, { transparent: true, opacity: 0.26, depthWrite: false });

    M.eBody = std(0x2b3550, 0.85, 0.1);
    M.eAccent = std(0xd8621f, 0.8, 0.1);
    M.eLimb = std(0x212a3d, 0.88, 0.08);
    M.eBoot = std(0x14181f, 0.9, 0.1);
    M.eVisor = basic(0xff6144, { fog: false });

    M.gunBody = std(0x4c565e, 0.48, 0.55);
    M.gunPart = std(0x323b42, 0.55, 0.5);
    M.gunAccent = std(0x487f8c, 0.5, 0.4);
    M.glove = std(0x2a3138, 0.9, 0.05);
    M.flash = basic(0xfff0c0, { transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  }

  /* ---------- 添加实体盒 ---------- */
  function addBox(o) {
    var w = o.w, h = o.h, d = o.d;
    var mesh = new THREE.Mesh(boxGeo(w, h, d), o.mat);
    mesh.position.set(o.x, o.y + h / 2, o.z);
    if (o.rotY) mesh.rotation.y = o.rotY;
    mesh.castShadow = o.cast !== false;
    mesh.receiveShadow = o.receive !== false;
    (o.parent || W.decorGroup).add(mesh);
    if (o.collide !== false && !o.rotY) {
      W.colliders.push({
        x0: o.x - w / 2, x1: o.x + w / 2,
        y0: o.y, y1: o.y + h,
        z0: o.z - d / 2, z1: o.z + d / 2,
        ray: o.ray !== false, tag: o.tag || ''
      });
    }
    return mesh;
  }
  W.addBox = addBox;

  function addPlate(x, y, z, w, d, mat, rotY) {
    var m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
    m.rotation.x = -Math.PI / 2;
    if (rotY) m.rotation.z = rotY;
    m.position.set(x, y, z);
    m.receiveShadow = false;
    W.decorGroup.add(m);
    return m;
  }

  /* ---------- 实例化（降低 draw call） ---------- */
  var instBuckets = {}, unitBox = null, flatPlane = null;
  function inst(key, mat, cx, cy, cz, rotY, sx, sy, sz, geo, cast) {
    if (!unitBox) unitBox = new THREE.BoxGeometry(1, 1, 1);
    var b = instBuckets[key];
    if (!b) b = instBuckets[key] = { mat: mat, geo: geo || unitBox, items: [], cast: cast !== false };
    b.items.push([cx, cy, cz, rotY || 0, sx == null ? 1 : sx, sy == null ? 1 : sy, sz == null ? 1 : sz]);
  }
  function addBlob(x, z, w, d) {
    if (!flatPlane) { flatPlane = new THREE.PlaneGeometry(1, 1); flatPlane.rotateX(-Math.PI / 2); }
    inst('blob', M.shadowBlob, x, 0.012, z, 0, w, 1, d, flatPlane, false);
  }
  function flushInst() {
    var mtx = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    var pos = new THREE.Vector3(), scl = new THREE.Vector3();
    for (var k in instBuckets) {
      var b = instBuckets[k];
      if (!b.items.length) continue;
      var im = new THREE.InstancedMesh(b.geo, b.mat, b.items.length);
      im.castShadow = !!b.cast; im.receiveShadow = false; im.frustumCulled = false;
      for (var i = 0; i < b.items.length; i++) {
        var it = b.items[i];
        e.set(0, it[3], 0); q.setFromEuler(e);
        pos.set(it[0], it[1], it[2]); scl.set(it[4], it[5], it[6]);
        mtx.compose(pos, q, scl);
        im.setMatrixAt(i, mtx);
      }
      im.instanceMatrix.needsUpdate = true;
      W.decorGroup.add(im);
    }
    instBuckets = {};
  }
  W.flushInst = flushInst;

  function addCyl(x, y, z, rt, rb, h, mat, seg, parent) {
    var m = new THREE.Mesh(cylGeo(rt, rb, h, seg || 8), mat);
    m.position.set(x, y + h / 2, z);
    m.castShadow = true; m.receiveShadow = true;
    (parent || W.decorGroup).add(m);
    return m;
  }

  /* ---------- 集装箱（带棱纹） ---------- */
  function container(x, z, y, w, d, mat, alongX) {
    var h = 2.6;
    addBox({ x: x, y: y, z: z, w: w, h: h, d: d, mat: mat, tag: 'container' });
    // 端板 + 棱纹
    var n = Math.floor((alongX ? w : d) / 0.62);
    for (var i = 0; i < n; i++) {
      var t = (i + 0.5) / n - 0.5;
      var ry = y + 0.18 + (h - 0.42) / 2;
      if (alongX) {
        inst('conRib', M.conRib, x + t * w, ry, z + d / 2 + 0.035, 0, 0.1, h - 0.42, 0.07, null, false);
        inst('conRib', M.conRib, x + t * w, ry, z - d / 2 - 0.035, 0, 0.1, h - 0.42, 0.07, null, false);
      } else {
        inst('conRib', M.conRib, x + w / 2 + 0.035, ry, z + t * d, 0, 0.07, h - 0.42, 0.1, null, false);
        inst('conRib', M.conRib, x - w / 2 - 0.035, ry, z + t * d, 0, 0.07, h - 0.42, 0.1, null, false);
      }
    }
    // 顶部 / 底部边框
    inst('conRib', M.conRib, x, y + h - 0.04, z, 0, w + 0.09, 0.1, d + 0.09, null, false);
    inst('conRib', M.conRib, x, y + 0.05, z, 0, w + 0.09, 0.1, d + 0.09, null, false);
    if (y < 0.05) addBlob(x, z, w + 1.5, d + 1.5);
  }

  /* ---------- 木箱堆 ---------- */
  function crate(x, z, y, s, rot) {
    var m = addBox({ x: x, y: y, z: z, w: s, h: s, d: s, mat: M.crate, tag: 'crate' });
    if (rot) m.rotation.y = rot;
    // 加固条
    var e = s * 0.11;
    inst('crateEdge', M.crateEdge, x, y + s - e / 2, z, rot || 0, s + 0.03, e, s + 0.03, null, false);
    inst('crateEdge', M.crateEdge, x, y + e / 2, z, rot || 0, s + 0.03, e, s + 0.03, null, false);
    if (y < 0.05) addBlob(x, z, s + 1.0, s + 1.0);
  }

  function barrel(x, z, mat) {
    addBox({ x: x, y: 0, z: z, w: 0.84, h: 1.1, d: 0.84, mat: mat, tag: 'barrel', receive: false });
    var b = addCyl(x, 0, z, 0.44, 0.44, 1.1, mat, 10);
    b.material = mat;
    addCyl(x, 0.3, z, 0.46, 0.46, 0.07, M.metalDark, 10);
    addCyl(x, 0.74, z, 0.46, 0.46, 0.07, M.metalDark, 10);
    addBlob(x, z, 1.5, 1.5);
  }

  function pallet(x, z, rotY) {
    var g = new THREE.Group();
    g.position.set(x, 0, z); g.rotation.y = rotY || 0;
    for (var i = -1; i <= 1; i++) {
      var m = new THREE.Mesh(boxGeo(1.25, 0.09, 0.16), M.pallet);
      m.position.set(0, 0.15, i * 0.42); m.castShadow = false; m.receiveShadow = true; g.add(m);
    }
    for (var j = -1; j <= 1; j++) {
      var m2 = new THREE.Mesh(boxGeo(0.14, 0.15, 1.05), M.pallet);
      m2.position.set(j * 0.5, 0.07, 0); m2.castShadow = false; g.add(m2);
    }
    W.decorGroup.add(g);
  }

  function sandbagWall(x, z, len, alongX) {
    var rows = 3, per = Math.max(2, Math.round(len / 0.62));
    for (var r = 0; r < rows; r++) {
      for (var i = 0; i < per - (r % 2 ? 1 : 0); i++) {
        var off = (i + 0.5 + (r % 2 ? 0.5 : 0)) / per - 0.5;
        var px = alongX ? x + off * len : x;
        var pz = alongX ? z : z + off * len;
        inst('sand', M.sand, px, 0.15 + r * 0.29, pz, rnd(-0.09, 0.09),
          alongX ? 0.6 : 0.5, 0.3, alongX ? 0.5 : 0.6);
      }
    }
    W.colliders.push({
      x0: (alongX ? x - len / 2 : x - 0.3), x1: (alongX ? x + len / 2 : x + 0.3),
      y0: 0, y1: 0.9,
      z0: (alongX ? z - 0.3 : z - len / 2), z1: (alongX ? z + 0.3 : z + len / 2),
      ray: true, tag: 'sandbag'
    });
    addBlob(x, z, alongX ? len + 0.9 : 1.4, alongX ? 1.4 : len + 0.9);
  }

  function shelfRack(x, z, len, alongZ) {
    var h = 4.2;
    for (var i = 0; i < 4; i++) {
      var t = i / 3 - 0.5;
      var px = alongZ ? x : x + t * len, pz = alongZ ? z + t * len : z;
      addBox({ x: px - (alongZ ? 0.45 : 0), y: 0, z: pz - (alongZ ? 0 : 0.45), w: 0.16, h: h, d: 0.16, mat: M.metalDark, tag: 'rack' });
      addBox({ x: px + (alongZ ? 0.45 : 0), y: 0, z: pz + (alongZ ? 0 : 0.45), w: 0.16, h: h, d: 0.16, mat: M.metalDark, tag: 'rack' });
    }
    [1.35, 2.7].forEach(function (sy) {
      addBox({
        x: x, y: sy, z: z,
        w: alongZ ? 1.1 : len, h: 0.12, d: alongZ ? len : 1.1,
        mat: M.metal, tag: 'shelf'
      });
    });
    // 货物
    for (var k = 0; k < 4; k++) {
      var tt = (k + 0.5) / 4 - 0.5;
      var cx = alongZ ? x : x + tt * len, cz = alongZ ? z + tt * len : z;
      var box = new THREE.Mesh(boxGeo(0.8, 0.62, 0.8), k % 2 ? M.crate : M.conD);
      box.position.set(cx, 1.47 + 0.31, cz); box.castShadow = true; W.decorGroup.add(box);
      if (k % 2 === 0) {
        var b2 = new THREE.Mesh(boxGeo(0.72, 0.55, 0.72), M.crate);
        b2.position.set(cx, 2.82 + 0.27, cz); b2.castShadow = true; W.decorGroup.add(b2);
      }
    }
  }

  /* ---------- 天空 ---------- */
  function buildSky() {
    var geo = new THREE.SphereGeometry(430, 26, 18);
    var pos = geo.attributes.position, n = pos.count;
    var colors = new Float32Array(n * 3);
    var zen = new THREE.Color(0x1a3350), mid = new THREE.Color(0x557f9b), hor = new THREE.Color(0xd8935a);
    var sunA = new THREE.Vector3(0.42, 0.34, 0.84).normalize();
    var v = new THREE.Vector3(), c = new THREE.Color();
    for (var i = 0; i < n; i++) {
      v.set(pos.getX(i), pos.getY(i), pos.getZ(i)).normalize();
      var t = clamp(v.y * 1.35 + 0.1, -1, 1);
      if (t > 0) { c.copy(mid).lerp(zen, Math.pow(t, 0.7)); }
      else { c.copy(mid).lerp(hor, Math.pow(-t * 1.35, 0.55)); }
      var g = Math.max(0, v.dot(sunA));
      var glow = Math.pow(g, 9) * 0.85 + Math.pow(g, 2.2) * 0.16;
      c.r = clamp(c.r + glow * 1.0, 0, 1);
      c.g = clamp(c.g + glow * 0.72, 0, 1);
      c.b = clamp(c.b + glow * 0.34, 0, 1);
      colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    var mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
      vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false
    }));
    mesh.frustumCulled = false;
    W.scene.add(mesh);

    // 云带（扁平低多边形）
    var cloudMat = new THREE.MeshBasicMaterial({ color: 0xb99f8e, transparent: true, opacity: 0.17, fog: false, depthWrite: false });
    for (var k = 0; k < 14; k++) {
      var a = (k / 14) * Math.PI * 2 + 0.3;
      var r = 210 + (k % 3) * 42;
      inst('cloud', cloudMat, Math.cos(a) * r, 64 + (k % 5) * 15, Math.sin(a) * r, -a,
        105 + (k % 4) * 40, 2.2, 26, null, false);
    }
  }

  /* ---------- 地面 / 水面 ---------- */
  function buildGround() {
    var dock = new THREE.Mesh(new THREE.PlaneGeometry(112, 116, 8, 8), M.groundA);
    dock.rotation.x = -Math.PI / 2; dock.position.set(0, 0, 3);
    dock.receiveShadow = true; W.scene.add(dock);

    // 混凝土板块拼色
    var patches = [
      [-14, 18, 22, 20], [12, 20, 20, 18], [-18, -6, 12, 22], [16, -8, 14, 24],
      [0, 12, 10, 10], [-6, -12, 16, 10]
    ];
    patches.forEach(function (p) { addPlate(p[0], 0.008, p[1], p[2], p[3], M.groundB); });
    // 仓库内地面
    addPlate(0, 0.014, -5, 26, 22, M.floorIn);
    // 积水
    addPlate(-7.5, 0.02, 19.5, 5.2, 3.1, M.groundWet);
    addPlate(9.5, 0.02, -9.5, 4.4, 3.6, M.groundWet);
    addPlate(3.0, 0.02, 12.0, 3.6, 2.4, M.groundWet);

    // 水面
    var water = new THREE.Mesh(new THREE.PlaneGeometry(620, 620, 1, 1), M.water);
    water.rotation.x = -Math.PI / 2; water.position.set(0, -1.5, -60);
    W.scene.add(water); W.water = water;
    // 码头边缘
    addBox({ x: 0, y: -1.5, z: -60.5, w: 112, h: 1.55, d: 6, mat: M.curb, collide: false, cast: false });
  }

  /* ---------- 导引线 / 地面标识 ---------- */
  function buildMarkings() {
    // 从出生点通往大门的黄色导引线
    for (var z = 24; z >= 7; z -= 2.4) {
      addPlate(0, 0.03, z, 0.52, 1.35, M.paintY);
    }
    // 大门内继续到装置
    for (var z2 = 4.4; z2 >= -1.6; z2 -= 2.2) {
      addPlate(0, 0.045, z2, 0.44, 1.2, M.paintC);
    }
    // 箭头
    function arrow(x, z) {
      var g = new THREE.Group();
      var a = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.5), M.paintY);
      a.rotation.x = -Math.PI / 2; a.rotation.z = Math.PI / 4;
      a.position.set(0, 0.032, 0); a.scale.set(0.72, 0.72, 1);
      g.add(a); g.position.set(x, 0, z); W.decorGroup.add(g);
    }
    arrow(0, 21.6); arrow(0, 14.4);
    // 危险条纹（大门口）
    for (var i = -3; i <= 3; i++) {
      addPlate(i * 0.85, 0.034, 6.6, 0.42, 1.5, M.paintY);
    }
    // 装置周围警戒环
    var ring = new THREE.Mesh(new THREE.RingGeometry(2.5, 2.95, 28), M.paintC);
    ring.rotation.x = -Math.PI / 2; ring.position.set(0, 0.05, -4);
    W.decorGroup.add(ring);
  }

  /* ---------- 外围墙 ---------- */
  function buildPerimeter() {
    var h = 6;
    // 南 / 北 / 西 / 东
    addBox({ x: 0, y: 0, z: 28.5, w: 49, h: h, d: 1, mat: M.perim, tag: 'perim' });
    addBox({ x: 0, y: 0, z: -20.5, w: 49, h: h, d: 1, mat: M.perim, tag: 'perim' });
    addBox({ x: -24.5, y: 0, z: 4, w: 1, h: h, d: 48, mat: M.perim, tag: 'perim' });
    addBox({ x: 24.5, y: 0, z: 4, w: 1, h: h, d: 48, mat: M.perim, tag: 'perim' });
    // 墙顶压条 + 立柱
    addBox({ x: 0, y: h, z: 28.5, w: 49, h: 0.3, d: 1.3, mat: M.wallTrim, collide: false });
    addBox({ x: 0, y: h, z: -20.5, w: 49, h: 0.3, d: 1.3, mat: M.wallTrim, collide: false });
    addBox({ x: -24.5, y: h, z: 4, w: 1.3, h: 0.3, d: 48, mat: M.wallTrim, collide: false });
    addBox({ x: 24.5, y: h, z: 4, w: 1.3, h: 0.3, d: 48, mat: M.wallTrim, collide: false });
    var pcy = (h + 0.5) / 2;
    for (var i = -11; i <= 11; i++) {
      inst('perimPost', M.wall, i * 2.1, pcy, 28.5, 0, 0.42, h + 0.5, 1.25, null, false);
      inst('perimPost', M.wall, i * 2.1, pcy, -20.5, 0, 0.42, h + 0.5, 1.25, null, false);
    }
    for (var j = -11; j <= 11; j++) {
      inst('perimPost', M.wall, -24.5, pcy, 4 + j * 2.05, 0, 1.25, h + 0.5, 0.42, null, false);
      inst('perimPost', M.wall, 24.5, pcy, 4 + j * 2.05, 0, 1.25, h + 0.5, 0.42, null, false);
    }
    // 内侧横向压条（打破大面积暗墙）
    [1.6, 3.5, 5.0].forEach(function (by) {
      inst('perimBand', M.wallTrim, 0, by, 27.9, 0, 48, 0.16, 0.12, null, false);
      inst('perimBand', M.wallTrim, 0, by, -19.9, 0, 48, 0.16, 0.12, null, false);
      inst('perimBand', M.wallTrim, -23.9, by, 4, 0, 0.12, 0.16, 47, null, false);
      inst('perimBand', M.wallTrim, 23.9, by, 4, 0, 0.12, 0.16, 47, null, false);
    });

    // 场地照明灯柱
    [[-22, 24], [22, 24], [-22, -17], [22, -17]].forEach(function (p) {
      addBox({ x: p[0], y: 0, z: p[1], w: 0.3, h: 8.4, d: 0.3, mat: M.metalDark, tag: 'pole' });
      var head = new THREE.Mesh(boxGeo(1.5, 0.34, 0.8), M.metal);
      head.position.set(p[0] + (p[0] < 0 ? 0.75 : -0.75), 8.5, p[1]);
      head.castShadow = true; W.decorGroup.add(head);
      var lamp = new THREE.Mesh(boxGeo(1.25, 0.1, 0.6), M.glowWhite);
      lamp.position.set(p[0] + (p[0] < 0 ? 0.75 : -0.75), 8.3, p[1]);
      W.decorGroup.add(lamp);
    });
  }

  /* ---------- 仓库 ---------- */
  function buildWarehouse() {
    var H = 7, T = 0.5;
    var xW = -13, xE = 13, zS = 6, zN = -16;
    // 南墙（大门 x -3.2..3.2）
    addBox({ x: -8.1, y: 0, z: zS, w: 9.8, h: H, d: T, mat: M.wall, tag: 'wall' });
    addBox({ x: 8.1, y: 0, z: zS, w: 9.8, h: H, d: T, mat: M.wall, tag: 'wall' });
    addBox({ x: 0, y: 4.3, z: zS, w: 6.4, h: H - 4.3, d: T, mat: M.wall, tag: 'wall' });
    // 北墙（小门 x 6..9）
    addBox({ x: -3.5, y: 0, z: zN, w: 19, h: H, d: T, mat: M.wall, tag: 'wall' });
    addBox({ x: 11, y: 0, z: zN, w: 4, h: H, d: T, mat: M.wall, tag: 'wall' });
    addBox({ x: 7.5, y: 3.0, z: zN, w: 3, h: H - 3.0, d: T, mat: M.wall, tag: 'wall' });
    // 西墙（侧门 z -5.5..-2）
    addBox({ x: xW, y: 0, z: -10.75, w: T, h: H, d: 10.5, mat: M.wall, tag: 'wall' });
    addBox({ x: xW, y: 0, z: 2, w: T, h: H, d: 8, mat: M.wall, tag: 'wall' });
    addBox({ x: xW, y: 3.0, z: -3.75, w: T, h: H - 3.0, d: 3.5, mat: M.wall, tag: 'wall' });
    // 东墙（侧门 z -1..2.5）
    addBox({ x: xE, y: 0, z: -8.5, w: T, h: H, d: 15, mat: M.wall, tag: 'wall' });
    addBox({ x: xE, y: 0, z: 4.25, w: T, h: H, d: 3.5, mat: M.wall, tag: 'wall' });
    addBox({ x: xE, y: 3.0, z: 0.75, w: T, h: H - 3.0, d: 3.5, mat: M.wall, tag: 'wall' });

    // 墙裙 + 顶部压条
    [[-8.1, zS, 9.8, T], [8.1, zS, 9.8, T], [-3.5, zN, 19, T], [11, zN, 4, T]].forEach(function (s) {
      addBox({ x: s[0], y: 0, z: s[1], w: s[2] + 0.1, h: 0.9, d: s[3] + 0.16, mat: M.wallIn, collide: false, cast: false });
      addBox({ x: s[0], y: H - 0.3, z: s[1], w: s[2] + 0.16, h: 0.34, d: s[3] + 0.2, mat: M.wallTrim, collide: false, cast: false });
    });
    [[xW, -10.75, 10.5], [xW, 2, 8], [xE, -8.5, 15], [xE, 4.25, 3.5]].forEach(function (s) {
      addBox({ x: s[0], y: 0, z: s[1], w: T + 0.16, h: 0.9, d: s[2] + 0.1, mat: M.wallIn, collide: false, cast: false });
      addBox({ x: s[0], y: H - 0.3, z: s[1], w: T + 0.2, h: 0.34, d: s[2] + 0.16, mat: M.wallTrim, collide: false, cast: false });
    });
    // 南立面细节：横向饰带 / 高窗 / 标号牌 / 锈迹
    function facade() {
      [[-8.1, 9.8], [8.1, 9.8]].forEach(function (sg) {
        // 腰线
        inst('facadeBand', M.wallPanel, sg[0], 2.35, zS + 0.3, 0, sg[1] - 0.4, 0.34, 0.14, null, false);
        inst('facadeBand', M.wallPanel, sg[0], 4.65, zS + 0.3, 0, sg[1] - 0.4, 0.26, 0.14, null, false);
        // 高窗（3 扇）
        for (var wi = -1; wi <= 1; wi++) {
          inst('facadeWin', M.windowDark, sg[0] + wi * 2.7, 5.5, zS + 0.32, 0, 1.7, 0.9, 0.14, null, false);
          inst('facadeBand', M.wallPanel, sg[0] + wi * 2.7, 5.5, zS + 0.36, 0, 0.1, 0.9, 0.1, null, false);
        }
        // 竖向锈迹
        for (var ri = 0; ri < 4; ri++) {
          inst('facadeRust', M.wallRust, sg[0] + (ri - 1.5) * (sg[1] / 4.6), 3.3, zS + 0.29,
            0, 0.22, 4.2, 0.09, null, false);
        }
      });
      // 标号牌：17
      inst('signPlate', M.metalDark, -6.4, 3.5, zS + 0.34, 0, 2.6, 1.5, 0.12, null, false);
      var digits = [
        [0.32, 0.0], [0.32, 0.34], [0.32, -0.34],                    // 1
        [1.05, 0.5], [1.35, 0.16], [1.2, -0.2], [1.05, -0.5]         // 7
      ];
      digits.forEach(function (dg) {
        inst('signInk', M.hazard, -6.4 - 0.85 + dg[0], 3.5 + dg[1], zS + 0.41,
          0, dg[0] > 0.8 ? 0.62 : 0.16, 0.16, 0.06, null, false);
      });
      // 排水管
      [-12.4, -3.9, 3.9, 12.4].forEach(function (px) {
        inst('pipe', M.metalDark, px, 3.5, zS + 0.34, 0, 0.16, 7, 0.16, null, false);
      });
    }
    facade();

    // 门框高亮
    function frame(x, z, w, d) {
      addBox({ x: x, y: 0, z: z, w: w, h: 0.24, d: d, mat: M.hazard, collide: false, cast: false });
    }
    frame(-3.45, 6, 0.6, 0.85); frame(3.45, 6, 0.6, 0.85);
    // 屋顶（四段，中间留天窗缝）
    var segs = [[-13.75, -4.6], [-9.3, -4.6], [-4.5, -4.6], [0.2, -4.6], [4.4, -3.4]];
    var zsegs = [[-13.9, 3.8], [-9.4, 4.0], [-4.6, 4.0], [0.4, 4.2], [4.7, 2.4]];
    zsegs.forEach(function (s) {
      addBox({ x: 0, y: H, z: s[0], w: 26.6, h: 0.35, d: s[1], mat: M.roof, tag: 'roof' });
    });
    // 屋顶桁架
    for (var i = -5; i <= 5; i++) {
      inst('beam', M.beam, i * 2.4, H - 0.25, -5, 0, 0.16, 0.5, 22, null, false);
    }
    addBox({ x: 0, y: H - 0.95, z: -5, w: 26.2, h: 0.2, d: 0.34, mat: M.beam, collide: false, cast: false });
    // 屋顶警示灯塔
    addBox({ x: 0, y: H + 0.35, z: -4, w: 0.26, h: 1.7, d: 0.26, mat: M.metalDark, collide: false });
    var beaconLamp = new THREE.Mesh(cylGeo(0.3, 0.3, 0.42, 10), M.glowAmber);
    beaconLamp.position.set(0, H + 2.2, -4); W.decorGroup.add(beaconLamp);
    W.roofBeacon = beaconLamp;
  }

  /* ---------- 二层走道 + 楼梯 ---------- */
  function buildCatwalk() {
    var top = 3.3;
    // 走道板（下方可通行 —— 真实高低层次）
    addBox({ x: 0, y: top - 0.22, z: -13.4, w: 25.4, h: 0.22, d: 5, mat: M.metal, tag: 'catwalk' });
    // 花纹板
    addPlate(0, top + 0.005, -13.4, 25.2, 4.8, M.groundB);
    // 支柱
    [-11, -6.2, -1.4, 3.4, 8.2, 11.8].forEach(function (px) {
      addBox({ x: px, y: 0, z: -11.2, w: 0.28, h: top - 0.22, d: 0.28, mat: M.metalDark, tag: 'pillar' });
    });
    // 栏杆（纯视觉，不阻挡子弹与移动，避免卡住）
    function rail(x, z, len, alongX) {
      var n = Math.max(2, Math.round(len / 1.5));
      for (var i = 0; i <= n; i++) {
        var t = i / n - 0.5;
        var px = alongX ? x + t * len : x, pz = alongX ? z : z + t * len;
        var p = new THREE.Mesh(boxGeo(0.07, 1.0, 0.07), M.rail);
        p.position.set(px, top + 0.5, pz); p.castShadow = false; W.decorGroup.add(p);
      }
      var bar = new THREE.Mesh(boxGeo(alongX ? len : 0.08, 0.08, alongX ? 0.08 : len), M.rail);
      bar.position.set(x, top + 1.0, z); bar.castShadow = false; W.decorGroup.add(bar);
      var bar2 = new THREE.Mesh(boxGeo(alongX ? len : 0.06, 0.06, alongX ? 0.06 : len), M.rail);
      bar2.position.set(x, top + 0.55, z); bar2.castShadow = false; W.decorGroup.add(bar2);
    }
    rail(-2.6, -10.95, 19.4, true);       // 内侧（东端留出楼梯口）
    rail(-12.6, -13.4, 4.6, false);
    // 楼梯（10 级，每级 0.33m，可正常走上去）
    for (var s = 0; s < 10; s++) {
      addBox({
        x: 11.1, y: 0, z: -6.5 - s * 0.46,
        w: 2.6, h: 0.33 * (s + 1), d: 0.46,
        mat: s % 2 ? M.metal : M.metalDark, tag: 'stair'
      });
    }
    // 楼梯侧板
    addBox({ x: 12.5, y: 0, z: -8.8, w: 0.14, h: 3.3, d: 4.8, mat: M.metalDark, collide: false, cast: false });
    // 走道上的补给箱（掩体）
    crate(-9.5, -13.6, top, 1.0);
    crate(2.2, -14.2, top, 1.0);
    addBox({ x: 6.6, y: top, z: -12.6, w: 1.5, h: 0.85, d: 1.1, mat: M.conB, tag: 'cwbox' });
  }

  /* ---------- 集装箱 / 木箱布局 ---------- */
  function buildProps() {
    // === 南侧堆场（出生区）===
    container(-9, 14, 0, 6, 2.5, M.conA, true);
    container(-9.6, 14.4, 2.6, 6, 2.5, M.conC, true);
    container(9, 16.5, 0, 6, 2.5, M.conB, true);
    container(-17.5, 7, 0, 2.5, 9, M.conC, false);
    container(18, 9, 0, 2.5, 9, M.conD, false);
    container(-20, 22, 0, 2.5, 7, M.conA, false);
    container(20.5, 23, 0, 2.5, 7, M.conB, false);
    container(-15.5, 0.5, 0, 2.5, 6, M.conB, false);
    container(16.5, -2, 0, 2.5, 6, M.conA, false);

    crate(3.2, 19.2, 0, 1.3); crate(4.4, 20.1, 0, 1.15, 0.3); crate(3.4, 19.4, 1.3, 1.0);
    crate(-4.2, 10.4, 0, 1.25); crate(-5.3, 11.2, 0, 1.1, -0.25);
    crate(13.6, 21.4, 0, 1.3); crate(14.7, 20.6, 0, 1.15, 0.4); crate(13.7, 21.5, 1.3, 0.95);
    crate(-13.2, 19.8, 0, 1.2);
    barrel(5.6, 11.2, M.barrel); barrel(6.4, 11.8, M.barrelB); barrel(5.9, 12.4, M.barrel);
    barrel(-11.6, 22.4, M.barrelB); barrel(-12.3, 23.0, M.barrel);
    barrel(20.0, 15.5, M.barrel); barrel(19.3, 16.1, M.barrelB);
    pallet(-2.4, 22.0, 0.3); pallet(7.4, 22.4, -0.2); pallet(-6.8, 16.6, 0.1);

    sandbagWall(-5.6, 17.2, 3.4, true);
    sandbagWall(7.0, 10.4, 3.0, true);
    sandbagWall(-19.5, 15.0, 3.2, false);
    sandbagWall(19.2, 19.5, 3.0, false);

    // 装卸平台（南墙外，第二处高低层次）
    addBox({ x: 7.2, y: 0, z: 7.6, w: 6.2, h: 1.12, d: 2.9, mat: M.curb, tag: 'dock' });
    addBox({ x: 7.2, y: 0, z: 9.45, w: 4.4, h: 0.75, d: 0.8, mat: M.curb, tag: 'dockstep' });
    addBox({ x: 7.2, y: 0, z: 10.2, w: 4.4, h: 0.38, d: 0.8, mat: M.curb, tag: 'dockstep' });
    for (var i = -3; i <= 3; i++) {
      addBox({ x: 7.2 + i * 0.9, y: 1.12, z: 6.35, w: 0.5, h: 0.12, d: 0.3, mat: M.hazard, collide: false, cast: false });
    }
    crate(9.2, 7.4, 1.12, 1.0);

    // === 仓库内部 ===
    container(-8.5, -7.5, 0, 6, 2.5, M.conB, true);
    container(-9.5, 1.5, 0, 5, 2.5, M.conA, true);
    container(7.5, -3.0, 0, 2.5, 6, M.conC, false);
    container(-3.2, -13.2, 0, 5, 2.4, M.conD, true);
    crate(2.6, -6.4, 0, 1.3); crate(3.7, -7.2, 0, 1.15, 0.35); crate(2.7, -6.5, 1.3, 1.0);
    crate(-3.4, -2.4, 0, 1.2); crate(4.6, -10.4, 0, 1.3); crate(5.7, -10.9, 0, 1.1, -0.3);
    crate(-11.2, -3.8, 0, 1.25);
    barrel(-6.0, 3.4, M.barrelB); barrel(-6.8, 4.0, M.barrel);
    barrel(11.0, 3.2, M.barrel);
    pallet(-1.6, 2.6, 0.2); pallet(9.8, -1.0, -0.3);
    shelfRack(-12.0, -1.0, 7.0, true);
    addBox({ x: 3.3, y: 0, z: 2.6, w: 2.4, h: 1.0, d: 1.2, mat: M.curb, tag: 'lowcover' });
    addBox({ x: -6.4, y: 0, z: -10.6, w: 2.6, h: 1.0, d: 1.2, mat: M.curb, tag: 'lowcover' });

    // 悬挂灯具（视觉）
    [[-7, -4], [0, -8.5], [7, -4]].forEach(function (p) {
      addBox({ x: p[0], y: 5.9, z: p[1], w: 0.1, h: 1.1, d: 0.1, mat: M.metalDark, collide: false, cast: false });
      var shade = new THREE.Mesh(cylGeo(0.16, 0.72, 0.44, 10), M.metalDark);
      shade.position.set(p[0], 5.72, p[1]);
      shade.castShadow = false; W.decorGroup.add(shade);
      var bulb = new THREE.Mesh(cylGeo(0.6, 0.6, 0.06, 10), M.glowWhite);
      bulb.position.set(p[0], 5.49, p[1]); W.decorGroup.add(bulb);
    });
  }

  /* ---------- 远景地标 ---------- */
  function buildDistant() {
    function crane(x, z, s, rot) {
      var g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot || 0; g.scale.setScalar(s || 1);
      function part(px, py, pz, w, h, d, mat) {
        var m = new THREE.Mesh(boxGeo(w, h, d), mat || M.far);
        m.position.set(px, py, pz); g.add(m); return m;
      }
      [-4.2, 4.2].forEach(function (ox) {
        part(ox, 11, -3.4, 1.2, 22, 1.2);
        part(ox, 11, 3.4, 1.2, 22, 1.2);
        part(ox, 21.5, 0, 1.1, 1.1, 8);
      });
      part(0, 22.6, 0, 11, 1.5, 9, M.farDark);
      part(2, 26, 0, 3.2, 6.6, 6.2, M.farDark);
      part(-14, 25.4, 0, 32, 1.1, 2.4, M.far);
      part(14, 25.4, 0, 14, 1.1, 2.4, M.far);
      part(-1.5, 30.4, 0, 5, 9, 2.0, M.far);
      part(-8, 23.4, 0, 1.6, 3.0, 1.6, M.farDark);
      var lamp = new THREE.Mesh(boxGeo(1.0, 1.0, 1.0), M.glowRed);
      lamp.position.set(0, 31.5, 0); g.add(lamp);
      W.scene.add(g);
    }
    crane(-40, -46, 1.0, 0.22);
    crane(37, -54, 0.86, -0.34);
    crane(-8, -78, 0.7, 0.1);

    // 远洋货船
    var ship = new THREE.Group(); ship.position.set(-6, 0, -74);
    function sp(px, py, pz, w, h, d, mat) {
      var m = new THREE.Mesh(boxGeo(w, h, d), mat || M.hull);
      m.position.set(px, py, pz); ship.add(m); return m;
    }
    sp(0, 1.2, 0, 74, 7.5, 15);
    sp(0, -2.4, 0, 70, 4, 13.5, M.hullRed);
    sp(0, 5.4, 0, 72, 1.0, 14.6, M.farDark);
    sp(28, 9.5, 0, 12, 9, 12.4, M.far);
    sp(28, 15.5, 0, 9.5, 3.4, 9.5, M.farDark);
    sp(24, 18.5, 0, 1.0, 3.4, 1.0, M.far);
    var funnel = new THREE.Mesh(boxGeo(4.2, 6.2, 4.4), M.hullRed);
    funnel.position.set(31, 19, 0); ship.add(funnel);
    for (var i = 0; i < 9; i++) {
      for (var j = 0; j < 3; j++) {
        var mats = [M.conA, M.conB, M.conC, M.conD];
        var c = new THREE.Mesh(boxGeo(6.0, 2.6, 12.4), mats[(i + j) % 4]);
        c.position.set(-30 + i * 6.4, 6.9 + j * 2.7, 0); ship.add(c);
      }
    }
    W.scene.add(ship);

    // 灯塔
    var lh = new THREE.Group(); lh.position.set(48, 0, 16);
    var tower = new THREE.Mesh(cylGeo(1.5, 2.6, 17, 10), M.wallTrim);
    tower.position.y = 8.5; lh.add(tower);
    for (var b = 0; b < 3; b++) {
      var band = new THREE.Mesh(cylGeo(2.0 - b * 0.16, 2.2 - b * 0.16, 1.5, 10), M.hullRed);
      band.position.y = 3.0 + b * 5.2; lh.add(band);
    }
    var cab = new THREE.Mesh(cylGeo(1.9, 1.9, 2.2, 10), M.metalDark);
    cab.position.y = 18.1; lh.add(cab);
    var lens = new THREE.Mesh(cylGeo(1.5, 1.5, 1.3, 10), M.glowAmber);
    lens.position.y = 18.1; lh.add(lens);
    var cap = new THREE.Mesh(new THREE.ConeGeometry(2.2, 1.7, 10), M.hullRed);
    cap.position.y = 20.1; lh.add(cap);
    W.scene.add(lh); W.lighthouse = lens;

    // 远处仓储 / 城市轮廓
    var sil = [
      [-62, -30, 26, 11, 16], [-30, -34, 20, 8, 14], [30, -32, 24, 13, 15],
      [58, -24, 22, 9, 18], [-70, 6, 18, 14, 22], [64, -2, 20, 10, 20],
      [-52, 20, 16, 8, 14], [56, 34, 20, 11, 16], [-30, 44, 18, 9, 20], [20, 46, 22, 12, 18]
    ];
    sil.forEach(function (s, i) {
      var m = new THREE.Mesh(boxGeo(s[2], s[3], s[4]), i % 2 ? M.far : M.farDark);
      m.position.set(s[0], s[3] / 2 - 0.4, s[1]); W.scene.add(m);
      if (i % 3 === 0) {
        var t = new THREE.Mesh(boxGeo(1.1, 7, 1.1), M.far);
        t.position.set(s[0] + 4, s[3] + 3, s[1]); W.scene.add(t);
      }
    });
    // 远山脊
    for (var k = 0; k < 7; k++) {
      var ridge = new THREE.Mesh(new THREE.ConeGeometry(34 + k * 6, 22 + (k % 3) * 12, 4), M.farDark);
      ridge.position.set(-150 + k * 52, 4, -190 - (k % 2) * 34);
      ridge.rotation.y = k * 0.7; W.scene.add(ridge);
    }
    // 油罐
    [[-58, 38], [-44, 42]].forEach(function (p) {
      var tank = new THREE.Mesh(cylGeo(9, 9, 11, 12), M.far);
      tank.position.set(p[0], 5.5, p[1]); W.scene.add(tank);
      var top = new THREE.Mesh(new THREE.ConeGeometry(9.2, 3, 12), M.farDark);
      top.position.set(p[0], 12.4, p[1]); W.scene.add(top);
    });
  }

  /* ---------- 灯光 ---------- */
  function buildLights() {
    var hemi = new THREE.HemisphereLight(0x93bcd8, 0x4b4238, 0.76);
    W.scene.add(hemi);
    var amb = new THREE.AmbientLight(0x3a5064, 0.4);
    W.scene.add(amb);

    var sun = new THREE.DirectionalLight(0xffcb95, 1.18);
    sun.position.set(34, 44, 58);
    sun.target.position.set(0, 0, 0);
    W.scene.add(sun.target);
    if (W.quality.shadows) {
      sun.castShadow = true;
      sun.shadow.mapSize.width = 1536; sun.shadow.mapSize.height = 1536;
      var c = sun.shadow.camera;
      c.left = -32; c.right = 32; c.top = 34; c.bottom = -30; c.near = 8; c.far = 150;
      sun.shadow.bias = -0.0009;
      sun.shadow.normalBias = 0.022;
    }
    W.scene.add(sun); W.sun = sun;

    // 仓库内补光
    var l1 = new THREE.PointLight(0xffdca6, 1.05, 21, 2);
    l1.position.set(-6.5, 5.4, -4); W.scene.add(l1);
    var l2 = new THREE.PointLight(0xffdca6, 1.05, 21, 2);
    l2.position.set(6.5, 5.4, -4); W.scene.add(l2);
    var l3 = new THREE.PointLight(0xbfd8ea, 0.55, 18, 2);
    l3.position.set(0, 5.4, -12); W.scene.add(l3);
  }

  /* ---------- 目标装置 ---------- */
  function buildDevice() {
    var g = new THREE.Group();
    g.position.set(0, 0, -4);
    // 底座托盘
    var pad = new THREE.Mesh(boxGeo(3.0, 0.16, 3.0), M.metalDark);
    pad.position.y = 0.08; pad.receiveShadow = true; g.add(pad);
    W.colliders.push({ x0: -1.5, x1: 1.5, y0: 0, y1: 0.16, z0: -5.5, z1: -2.5, ray: false, tag: 'pad' });

    var body = new THREE.Mesh(boxGeo(1.15, 0.62, 0.82), M.gunBody);
    body.position.y = 0.47; body.castShadow = true; g.add(body);
    var lid = new THREE.Mesh(boxGeo(1.22, 0.1, 0.9), M.metalDark);
    lid.position.y = 0.82; g.add(lid);
    // 四角支腿
    [[-0.48, -0.3], [0.48, -0.3], [-0.48, 0.3], [0.48, 0.3]].forEach(function (p) {
      var leg = new THREE.Mesh(boxGeo(0.12, 0.18, 0.12), M.metalDark);
      leg.position.set(p[0], 0.25, p[1]); g.add(leg);
    });
    // 发光核心
    var core = new THREE.Mesh(cylGeo(0.27, 0.27, 0.56, 12), M.glowCyan);
    core.position.set(0, 1.12, 0); g.add(core);
    var cage1 = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.035, 6, 12), M.metal);
    cage1.position.set(0, 1.12, 0); cage1.rotation.x = Math.PI / 2; g.add(cage1);
    var cage2 = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.035, 6, 12), M.metal);
    cage2.position.set(0, 1.38, 0); cage2.rotation.x = Math.PI / 2; g.add(cage2);
    // 天线
    var ant = new THREE.Mesh(boxGeo(0.05, 0.9, 0.05), M.metalDark);
    ant.position.set(0.42, 1.35, 0.28); g.add(ant);
    var tip = new THREE.Mesh(boxGeo(0.11, 0.11, 0.11), M.glowRed);
    tip.position.set(0.42, 1.86, 0.28); g.add(tip);
    // 面板
    var panel = new THREE.Mesh(boxGeo(0.66, 0.3, 0.05), M.glowAmber);
    panel.position.set(0, 0.55, 0.43); g.add(panel);
    // 旋转环
    var ring = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.045, 6, 18), M.glowCyan);
    ring.position.set(0, 1.12, 0); ring.rotation.x = Math.PI / 2.3; g.add(ring);
    // 光柱
    var beam = new THREE.Mesh(cylGeo(0.13, 0.13, 5.2, 8), M.glowCyanSoft);
    beam.position.set(0, 3.6, 0); g.add(beam);
    var beam2 = new THREE.Mesh(cylGeo(0.5, 0.1, 4.4, 10), M.glowCyanSoft);
    beam2.position.set(0, 3.2, 0); beam2.material = new THREE.MeshBasicMaterial({
      color: 0x63eaff, transparent: true, opacity: 0.075, fog: false, depthWrite: false, side: THREE.DoubleSide
    });
    g.add(beam2);
    // 光源
    var pl = new THREE.PointLight(0x7fe8ff, 1.7, 15, 2);
    pl.position.set(0, 1.2, 0); g.add(pl);

    W.decorGroup.add(g);
    W.device = { group: g, core: core, ring: ring, tip: tip, light: pl, beam: beam, panel: panel, x: 0, y: 0.16, z: -4 };
  }

  /* ---------- 敵人网格 ---------- */
  W.buildEnemyMesh = function () {
    var g = new THREE.Group();
    var mats = {
      body: M.eBody.clone(), accent: M.eAccent.clone(),
      limb: M.eLimb.clone(), visor: M.eVisor.clone()
    };
    mats.body.emissive = new THREE.Color(0x000000);
    mats.accent.emissive = new THREE.Color(0x000000);
    mats.limb.emissive = new THREE.Color(0x000000);

    function part(px, py, pz, w, h, d, mat, parent) {
      var m = new THREE.Mesh(boxGeo(w, h, d), mat);
      m.position.set(px, py, pz);
      m.castShadow = true; m.receiveShadow = false;
      (parent || g).add(m); return m;
    }
    // 腿
    var legL = new THREE.Group(); legL.position.set(-0.15, 0.86, 0); g.add(legL);
    part(0, -0.43, 0, 0.21, 0.86, 0.23, mats.limb, legL);
    part(0, -0.83, 0.03, 0.23, 0.13, 0.31, M.eBoot, legL);
    var legR = new THREE.Group(); legR.position.set(0.15, 0.86, 0); g.add(legR);
    part(0, -0.43, 0, 0.21, 0.86, 0.23, mats.limb, legR);
    part(0, -0.83, 0.03, 0.23, 0.13, 0.31, M.eBoot, legR);
    // 躯干
    var torso = new THREE.Group(); torso.position.set(0, 0.86, 0); g.add(torso);
    part(0, 0.33, 0, 0.58, 0.66, 0.34, mats.body, torso);
    part(0, 0.4, 0.2, 0.44, 0.42, 0.1, mats.accent, torso);   // 胸甲
    part(0, 0.62, 0, 0.68, 0.2, 0.36, mats.body, torso);      // 肩
    part(0, 0.05, 0, 0.5, 0.2, 0.3, mats.limb, torso);        // 腰
    part(-0.2, 0.55, -0.2, 0.16, 0.12, 0.12, mats.accent, torso);
    // 头
    var head = new THREE.Group(); head.position.set(0, 0.78, 0); torso.add(head);
    part(0, 0.15, 0, 0.29, 0.3, 0.3, mats.limb, head);
    part(0, 0.2, 0, 0.33, 0.16, 0.33, mats.body, head);       // 头盔
    var visor = part(0, 0.13, 0.17, 0.22, 0.09, 0.03, mats.visor, head);
    // 手臂
    var armL = new THREE.Group(); armL.position.set(-0.36, 1.34, 0); g.add(armL);
    part(0, -0.26, 0, 0.16, 0.54, 0.17, mats.limb, armL);
    part(0, -0.55, 0.06, 0.15, 0.14, 0.16, M.glove, armL);
    var armR = new THREE.Group(); armR.position.set(0.36, 1.34, 0); g.add(armR);
    part(0, -0.26, 0, 0.16, 0.54, 0.17, mats.limb, armR);
    part(0, -0.55, 0.06, 0.15, 0.14, 0.16, M.glove, armR);
    // 枪
    var gun = new THREE.Group(); gun.position.set(0.02, -0.5, 0.1); armR.add(gun);
    part(0, 0, -0.06, 0.07, 0.09, 0.44, M.gunPart, gun);
    part(0, 0.03, -0.3, 0.05, 0.05, 0.2, M.gunPart, gun);
    part(0, -0.09, 0.02, 0.05, 0.16, 0.07, M.gunPart, gun);
    var eFlash = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.5), M.flash.clone());
    eFlash.position.set(0, 0.03, -0.42); eFlash.scale.setScalar(0.001);
    gun.add(eFlash);
    // 警觉标
    var alertMark = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.3, 4), M.glowRed);
    alertMark.position.set(0, 2.35, 0); alertMark.rotation.x = Math.PI;
    alertMark.visible = false; g.add(alertMark);
    // 肩灯
    var lamp = new THREE.Mesh(boxGeo(0.08, 0.08, 0.08), M.glowRed);
    lamp.position.set(0.2, 1.5, 0.16); g.add(lamp);

    // 接触阴影
    var blob = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.2), M.shadowBlob);
    blob.rotation.x = -Math.PI / 2; blob.position.y = 0.02; g.add(blob);

    g.visible = false;
    W.decorGroup.add(g);
    return {
      group: g, legL: legL, legR: legR, torso: torso, head: head,
      armL: armL, armR: armR, gun: gun, visor: visor, mats: mats,
      alertMark: alertMark, lamp: lamp, flash: eFlash, blob: blob
    };
  };

  /* ---------- 第一人称武器 ---------- */
  function buildWeapon() {
    var g = new THREE.Group();
    g.position.set(0.196, -0.183, -0.68);
    g.rotation.set(0.026, -0.075, 0.012);
    g.scale.setScalar(0.54);
    function part(px, py, pz, w, h, d, mat) {
      var m = new THREE.Mesh(boxGeo(w, h, d), mat);
      m.position.set(px, py, pz); g.add(m); return m;
    }
    part(0, 0, 0.03, 0.088, 0.115, 0.46, M.gunBody);          // 机匣
    part(0, 0.072, 0.03, 0.07, 0.03, 0.4, M.gunPart);         // 上导轨
    part(0, 0.005, -0.31, 0.05, 0.05, 0.24, M.gunPart);       // 枪管
    part(0, 0.005, -0.45, 0.062, 0.062, 0.07, M.gunPart);     // 消焰器
    part(0, -0.008, -0.15, 0.075, 0.078, 0.2, M.gunAccent);   // 护木
    part(0, -0.15, 0.02, 0.07, 0.2, 0.1, M.gunPart);          // 弹匣
    part(0, -0.06, 0.19, 0.06, 0.09, 0.12, M.gunPart);        // 握把
    part(0, 0.01, 0.3, 0.07, 0.1, 0.16, M.gunBody);           // 枪托
    part(0, 0.105, 0.02, 0.045, 0.04, 0.13, M.gunPart);       // 瞄具
    var dot = part(0, 0.105, -0.05, 0.014, 0.014, 0.014, M.glowCyan);
    part(0, -0.075, -0.13, 0.05, 0.07, 0.09, M.gunAccent);    // 前握把
    // 手
    part(0.028, -0.115, -0.13, 0.085, 0.1, 0.14, M.glove);
    part(-0.02, -0.115, 0.17, 0.085, 0.1, 0.13, M.glove);

    // 顶部棱线 / 侧面亮条：暗场下保持轮廓可读
    part(0, 0.09, 0.03, 0.094, 0.012, 0.44, M.metal);
    part(0.048, 0.02, -0.13, 0.008, 0.03, 0.2, M.gunAccent);
    part(-0.048, 0.02, -0.13, 0.008, 0.03, 0.2, M.gunAccent);

    var flash = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.6), M.flash.clone());
    flash.position.set(0, 0.005, -0.53); flash.scale.setScalar(0.001);
    g.add(flash);
    var flash2 = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.6), flash.material);
    flash2.position.set(0, 0.005, -0.53); flash2.rotation.z = Math.PI / 2;
    flash2.scale.setScalar(0.001); g.add(flash2);
    var mLight = new THREE.PointLight(0xffd08a, 0, 9, 2);
    mLight.position.set(0, 0.02, -0.6); g.add(mLight);

    g.traverse(function (o) { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; o.frustumCulled = false; } });
    W.camera.add(g);
    W.weapon = {
      group: g, flash: flash, flash2: flash2, light: mLight, dot: dot,
      base: g.position.clone(), baseRot: g.rotation.clone()
    };
  }

  /* ---------- 特效池 ---------- */
  function buildFx() {
    var fx = W.fxGroup = new THREE.Group();
    W.scene.add(fx);

    // 曳光
    W.tracers = [];
    for (var i = 0; i < 16; i++) {
      var geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
      var mat = new THREE.LineBasicMaterial({
        color: 0xffdf9a, transparent: true, opacity: 0, depthWrite: false,
        blending: THREE.AdditiveBlending, fog: false
      });
      var line = new THREE.Line(geo, mat);
      line.frustumCulled = false; line.visible = false;
      fx.add(line);
      W.tracers.push({ line: line, mat: mat, geo: geo, life: 0, max: 0.075 });
    }

    // 火花粒子
    var N = 260;
    W.sparkN = N;
    var sgeo = new THREE.BufferGeometry();
    var sp = new Float32Array(N * 3), sc = new Float32Array(N * 3);
    for (var k = 0; k < N; k++) { sp[k * 3 + 1] = -999; }
    sgeo.setAttribute('position', new THREE.BufferAttribute(sp, 3));
    sgeo.setAttribute('color', new THREE.BufferAttribute(sc, 3));
    var smat = new THREE.PointsMaterial({
      size: 0.085, vertexColors: true, transparent: true, opacity: 0.95,
      blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true, fog: false
    });
    var pts = new THREE.Points(sgeo, smat);
    pts.frustumCulled = false; fx.add(pts);
    W.sparks = { geo: sgeo, pts: pts, pos: sp, col: sc, vel: new Float32Array(N * 3), life: new Float32Array(N), cursor: 0 };

    // 弹孔
    W.decals = [];
    var dgeo = new THREE.PlaneGeometry(0.17, 0.17);
    for (var d = 0; d < 28; d++) {
      var dmat = new THREE.MeshBasicMaterial({ color: 0x14181c, transparent: true, opacity: 0, depthWrite: false });
      var dm = new THREE.Mesh(dgeo, dmat);
      dm.visible = false; fx.add(dm);
      W.decals.push({ mesh: dm, mat: dmat, life: 0 });
    }
    W.decalCursor = 0; W.tracerCursor = 0;
  }

  /* ---------- 渲染器 ---------- */
  W.init = function () {
    var canvas = BP.D.gl;
    var renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas: canvas, antialias: true, alpha: false,
        powerPreference: 'high-performance', stencil: false
      });
    } catch (e) { return false; }
    if (!renderer) return false;

    var isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) ||
      (navigator.maxTouchPoints > 1 && Math.min(window.innerWidth, window.innerHeight) < 820);
    var reduce = false;
    try { reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { }
    var cores = navigator.hardwareConcurrency || 4;

    W.isMobile = isMobile;
    W.reduceMotion = reduce;
    W.quality.shadows = !isMobile && cores > 4;
    W.quality.particles = isMobile ? 0.45 : (reduce ? 0.55 : 1);
    W.quality.shake = reduce ? 0.22 : 1;
    W.quality.dpr = Math.min(window.devicePixelRatio || 1, isMobile ? 2 : 1.75);

    renderer.setPixelRatio(W.quality.dpr);
    renderer.shadowMap.enabled = W.quality.shadows;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x6f8896, 1);
    W.renderer = renderer;

    canvas.addEventListener('webglcontextlost', function (ev) {
      ev.preventDefault(); W.contextLost = true;
    }, false);
    canvas.addEventListener('webglcontextrestored', function () { W.contextLost = false; }, false);

    var scene = W.scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x718e9d, 34, 190);

    var cam = W.camera = new THREE.PerspectiveCamera(CFG.player.fov, 16 / 9, 0.055, 620);
    cam.rotation.order = 'YXZ';
    scene.add(cam);

    W.decorGroup = new THREE.Group();
    scene.add(W.decorGroup);

    buildMaterials();
    buildSky();
    buildGround();
    buildPerimeter();
    buildWarehouse();
    buildCatwalk();
    buildProps();
    buildMarkings();
    buildDistant();
    buildDevice();
    buildLights();
    buildWeapon();
    buildFx();
    flushInst();

    W.resize();
    W.ready = true;
    return true;
  };

  W.resize = function () {
    if (!W.renderer) return;
    var w = Math.max(2, window.innerWidth | 0);
    var h = Math.max(2, window.innerHeight | 0);
    var el = BP.D.gl;
    if (el && el.parentElement) {
      w = Math.max(2, el.parentElement.clientWidth || w);
      h = Math.max(2, el.parentElement.clientHeight || h);
    }
    var aspect = w / h;
    W.camera.aspect = aspect;
    // 竖屏时适度加大纵向 FOV，避免横向视野过窄
    var wideNeed = 2 * Math.atan(Math.tan(32 * Math.PI / 180) / Math.max(0.3, aspect)) * 180 / Math.PI;
    W.camera.fov = Math.min(88, Math.max(CFG.player.fov, wideNeed));
    W.camera.updateProjectionMatrix();
    W.renderer.setSize(w, h, false);
    W.viewW = w; W.viewH = h;
    W.fitWeapon(aspect);
  };

  /* 视模型随画幅比例微调，避免竖屏时占据过多画面 */
  W.fitWeapon = function (aspect) {
    var wp = W.weapon;
    if (!wp) return;
    var narrow = aspect < 1.15;
    var sc = narrow ? 0.44 : 0.54;
    wp.base.set(narrow ? 0.152 : 0.196, narrow ? -0.15 : -0.183, narrow ? -0.74 : -0.68);
    wp.group.scale.setScalar(sc);
    wp.group.position.copy(wp.base);
  };

  /* ===================== 碰撞 / 射线 ===================== */
  var EPS = 1e-9;
  function rayAABB(ox, oy, oz, dx, dy, dz, c, maxT) {
    var t0 = 0, t1 = maxT, ax = 0, sg = 0, ta, tb, inv, s;
    inv = 1 / (Math.abs(dx) < EPS ? (dx < 0 ? -EPS : EPS) : dx);
    ta = (c.x0 - ox) * inv; tb = (c.x1 - ox) * inv; s = -1;
    if (ta > tb) { var t = ta; ta = tb; tb = t; s = 1; }
    if (ta > t0) { t0 = ta; ax = 1; sg = s; }
    if (tb < t1) t1 = tb;
    if (t0 > t1) return null;

    inv = 1 / (Math.abs(dy) < EPS ? (dy < 0 ? -EPS : EPS) : dy);
    ta = (c.y0 - oy) * inv; tb = (c.y1 - oy) * inv; s = -1;
    if (ta > tb) { var t2 = ta; ta = tb; tb = t2; s = 1; }
    if (ta > t0) { t0 = ta; ax = 2; sg = s; }
    if (tb < t1) t1 = tb;
    if (t0 > t1) return null;

    inv = 1 / (Math.abs(dz) < EPS ? (dz < 0 ? -EPS : EPS) : dz);
    ta = (c.z0 - oz) * inv; tb = (c.z1 - oz) * inv; s = -1;
    if (ta > tb) { var t3 = ta; ta = tb; tb = t3; s = 1; }
    if (ta > t0) { t0 = ta; ax = 3; sg = s; }
    if (tb < t1) t1 = tb;
    if (t0 > t1) return null;

    if (t0 <= 0.0001 || t0 >= maxT) return null;
    return {
      t: t0,
      nx: ax === 1 ? sg : 0,
      ny: ax === 2 ? sg : 0,
      nz: ax === 3 ? sg : 0
    };
  }
  W.rayAABB = rayAABB;

  /* 射线与地图求交，返回最近命中 */
  W.rayWorld = function (ox, oy, oz, dx, dy, dz, maxT) {
    var cs = W.colliders, best = null, bt = maxT;
    for (var i = 0; i < cs.length; i++) {
      var c = cs[i];
      if (!c.ray) continue;
      var r = rayAABB(ox, oy, oz, dx, dy, dz, c, bt);
      if (r) { bt = r.t; best = r; best.tag = c.tag; }
    }
    // 地面
    if (dy < -EPS) {
      var tg = (0 - oy) / dy;
      if (tg > 0.0001 && tg < bt) { best = { t: tg, nx: 0, ny: 1, nz: 0, tag: 'ground' }; }
    }
    return best;
  };

  /* 视线是否被实体阻挡 */
  W.blocked = function (ax, ay, az, bx, by, bz) {
    var dx = bx - ax, dy = by - ay, dz = bz - az;
    var len = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (len < 1e-5) return false;
    dx /= len; dy /= len; dz /= len;
    var cs = W.colliders;
    for (var i = 0; i < cs.length; i++) {
      var c = cs[i];
      if (!c.ray) continue;
      if (rayAABB(ax, ay, az, dx, dy, dz, c, len - 0.02)) return true;
    }
    return false;
  };

  /* 地面高度（可站立面） */
  W.groundAt = function (x, z, feet, radius, step) {
    var g = 0, cs = W.colliders, lim = feet + step + 0.02;
    for (var i = 0; i < cs.length; i++) {
      var c = cs[i];
      if (x + radius <= c.x0 || x - radius >= c.x1) continue;
      if (z + radius <= c.z0 || z - radius >= c.z1) continue;
      if (c.y1 <= lim && c.y1 > g) g = c.y1;
    }
    return g;
  };

  /* 单轴推出式移动 */
  W.moveAxis = function (ent, dx, dz, radius, height, step) {
    var cs = W.colliders, i, c;
    if (dx !== 0) {
      ent.x += dx;
      for (i = 0; i < cs.length; i++) {
        c = cs[i];
        if (c.y1 <= ent.y + step + 0.001 || c.y0 >= ent.y + height) continue;
        if (ent.x + radius <= c.x0 || ent.x - radius >= c.x1) continue;
        if (ent.z + radius <= c.z0 || ent.z - radius >= c.z1) continue;
        ent.x = dx > 0 ? c.x0 - radius : c.x1 + radius;
      }
    }
    if (dz !== 0) {
      ent.z += dz;
      for (i = 0; i < cs.length; i++) {
        c = cs[i];
        if (c.y1 <= ent.y + step + 0.001 || c.y0 >= ent.y + height) continue;
        if (ent.x + radius <= c.x0 || ent.x - radius >= c.x1) continue;
        if (ent.z + radius <= c.z0 || ent.z - radius >= c.z1) continue;
        ent.z = dz > 0 ? c.z0 - radius : c.z1 + radius;
      }
    }
  };

  /* 解除嵌入 */
  W.depenetrate = function (ent, radius, height, step) {
    var cs = W.colliders;
    for (var pass = 0; pass < 3; pass++) {
      var moved = false;
      for (var i = 0; i < cs.length; i++) {
        var c = cs[i];
        if (c.y1 <= ent.y + step + 0.001 || c.y0 >= ent.y + height) continue;
        if (ent.x + radius <= c.x0 || ent.x - radius >= c.x1) continue;
        if (ent.z + radius <= c.z0 || ent.z - radius >= c.z1) continue;
        var px1 = (c.x1 + radius) - ent.x, px0 = ent.x - (c.x0 - radius);
        var pz1 = (c.z1 + radius) - ent.z, pz0 = ent.z - (c.z0 - radius);
        var m = Math.min(px1, px0, pz1, pz0);
        if (m === px1) ent.x = c.x1 + radius;
        else if (m === px0) ent.x = c.x0 - radius;
        else if (m === pz1) ent.z = c.z1 + radius;
        else ent.z = c.z0 - radius;
        moved = true;
      }
      if (!moved) break;
    }
  };

  /* ===================== 特效播放 ===================== */
  W.spawnTracer = function (ax, ay, az, bx, by, bz, color, life) {
    var t = W.tracers[W.tracerCursor % W.tracers.length];
    W.tracerCursor++;
    var p = t.geo.attributes.position.array;
    p[0] = ax; p[1] = ay; p[2] = az; p[3] = bx; p[4] = by; p[5] = bz;
    t.geo.attributes.position.needsUpdate = true;
    t.geo.computeBoundingSphere();
    t.mat.color.setHex(color == null ? 0xffdf9a : color);
    t.mat.opacity = 0.95;
    t.life = 0; t.max = life || 0.075;
    t.line.visible = true;
  };

  W.spawnSparks = function (x, y, z, nx, ny, nz, n, color, speed) {
    var s = W.sparks;
    n = Math.max(1, Math.round(n * W.quality.particles));
    var col = new THREE.Color(color == null ? 0xffc46a : color);
    for (var i = 0; i < n; i++) {
      var k = s.cursor % W.sparkN; s.cursor++;
      s.pos[k * 3] = x; s.pos[k * 3 + 1] = y; s.pos[k * 3 + 2] = z;
      var sp = (speed || 4.2) * (0.35 + Math.random());
      s.vel[k * 3] = (nx + rnd(-0.85, 0.85)) * sp;
      s.vel[k * 3 + 1] = (ny + rnd(-0.2, 1.0)) * sp;
      s.vel[k * 3 + 2] = (nz + rnd(-0.85, 0.85)) * sp;
      s.life[k] = rnd(0.22, 0.5);
      s.col[k * 3] = col.r; s.col[k * 3 + 1] = col.g; s.col[k * 3 + 2] = col.b;
    }
    s.geo.attributes.position.needsUpdate = true;
    s.geo.attributes.color.needsUpdate = true;
  };

  W.spawnDecal = function (x, y, z, nx, ny, nz) {
    var d = W.decals[W.decalCursor % W.decals.length];
    W.decalCursor++;
    d.mesh.position.set(x + nx * 0.012, y + ny * 0.012, z + nz * 0.012);
    d.mesh.lookAt(x + nx, y + ny, z + nz);
    d.mesh.rotation.z = Math.random() * 6.283;
    d.mesh.visible = true;
    d.mat.opacity = 0.85;
    d.life = 7;
  };

  W.updateFx = function (dt) {
    var i, t;
    for (i = 0; i < W.tracers.length; i++) {
      t = W.tracers[i];
      if (!t.line.visible) continue;
      t.life += dt;
      var k = 1 - t.life / t.max;
      if (k <= 0) { t.line.visible = false; t.mat.opacity = 0; }
      else t.mat.opacity = k * 0.95;
    }
    var s = W.sparks, changed = false;
    for (i = 0; i < W.sparkN; i++) {
      if (s.life[i] <= 0) continue;
      s.life[i] -= dt;
      if (s.life[i] <= 0) {
        s.pos[i * 3 + 1] = -999; s.col[i * 3] = 0; s.col[i * 3 + 1] = 0; s.col[i * 3 + 2] = 0;
        changed = true; continue;
      }
      s.vel[i * 3 + 1] -= 15 * dt;
      s.pos[i * 3] += s.vel[i * 3] * dt;
      s.pos[i * 3 + 1] += s.vel[i * 3 + 1] * dt;
      s.pos[i * 3 + 2] += s.vel[i * 3 + 2] * dt;
      if (s.pos[i * 3 + 1] < 0.02) { s.pos[i * 3 + 1] = 0.02; s.vel[i * 3 + 1] *= -0.32; s.vel[i * 3] *= 0.6; s.vel[i * 3 + 2] *= 0.6; }
      changed = true;
    }
    if (changed) { s.geo.attributes.position.needsUpdate = true; s.geo.attributes.color.needsUpdate = true; }

    for (i = 0; i < W.decals.length; i++) {
      var d = W.decals[i];
      if (!d.mesh.visible) continue;
      d.life -= dt;
      if (d.life <= 0) { d.mesh.visible = false; d.mat.opacity = 0; }
      else if (d.life < 1.4) d.mat.opacity = 0.85 * (d.life / 1.4);
    }
  };

  W.clearFx = function () {
    for (var i = 0; i < W.tracers.length; i++) { W.tracers[i].line.visible = false; W.tracers[i].mat.opacity = 0; }
    var s = W.sparks;
    for (var k = 0; k < W.sparkN; k++) { s.life[k] = 0; s.pos[k * 3 + 1] = -999; s.col[k * 3] = 0; s.col[k * 3 + 1] = 0; s.col[k * 3 + 2] = 0; }
    s.geo.attributes.position.needsUpdate = true; s.geo.attributes.color.needsUpdate = true;
    for (var d = 0; d < W.decals.length; d++) { W.decals[d].mesh.visible = false; W.decals[d].mat.opacity = 0; W.decals[d].life = 0; }
  };

})(BP);

/* ============================================================
   Part 3 / 4 : 玩法状态 · 玩家 · 武器 · 敌人 AI · 目标 · HUD
   ============================================================ */
(function (BP) {
  'use strict';
  var CFG = BP.CFG, W = BP.World, D = BP.D, A = BP.Audio2;
  var clamp = BP.clamp, lerp = BP.lerp, r4 = BP.r4, rnd = BP.rnd, dist2 = BP.dist2, angDiff = BP.angDiff;

  var G = BP.Game = {};

  /* ---------- 敌人配置 ---------- */
  var ENEMY_DEFS = [
    {
      id: 0, name: '靶员 A-01', x: -15, z: 18, y: 0, yaw: 2.4,
      zone: { x0: -22.4, x1: -2.5, z0: 7.6, z1: 27 },
      wp: [[-15, 18], [-20.5, 11], [-11, 9], [-13, 21.6]]
    },
    {
      id: 1, name: '靶员 B-02', x: 14, z: 20, y: 0, yaw: -2.6,
      zone: { x0: 2.5, x1: 22.4, z0: 7.6, z1: 27 },
      wp: [[14, 20], [20.5, 13.5], [11, 11], [15, 23]]
    },
    {
      id: 2, name: '靶员 C-03', x: -8, z: -1, y: 0, yaw: 0.9,
      zone: { x0: -12.1, x1: -1, z0: -15.1, z1: 5.2 },
      wp: [[-8, -1], [-11.5, -12.6], [-4.5, -9.5], [-10.5, 4]]
    },
    {
      id: 3, name: '靶员 D-04', x: 9, z: 2.5, y: 0, yaw: -1.2,
      zone: { x0: 1, x1: 12.1, z0: -15.1, z1: 5.2 },
      wp: [[9, 2.5], [11, -4], [4, -12], [2, 0]]
    },
    {
      id: 4, name: '哨位 E-05', x: -5, z: -13.4, y: 3.3, yaw: 1.5708,
      zone: { x0: -11.6, x1: 11.5, z0: -15.3, z1: -11.5 },
      wp: [[-11.2, -13.4], [9, -13.4], [0, -14.4]]
    }
  ];
  G.ENEMY_DEFS = ENEMY_DEFS;

  /* ---------- 状态 ---------- */
  var S = G.state = {
    phase: 'menu',       // menu | playing | won | lost
    paused: false,
    manual: false,
    timeLeft: CFG.mission.time,
    elapsed: 0,
    started: false,
    alarmed: false,
    endReason: '',
    player: null,
    enemies: [],
    objective: null,
    stats: null,
    fx: null
  };

  function newPlayer() {
    return {
      x: CFG.spawn.x, y: 0, z: CFG.spawn.z, vy: 0, vx: 0, vz: 0,
      yaw: CFG.spawn.yaw, pitch: 0,
      hp: CFG.player.hp,
      ammo: CFG.weapon.magSize, reserve: CFG.weapon.reserveStart,
      reloadT: 0, fireCd: 0, spread: CFG.weapon.spreadBase,
      recoilP: 0, recoilY: 0, kick: 0,
      onGround: true, bob: 0, speed: 0,
      hurtT: 0, hurtDir: 0, shakeT: 0, shakeMag: 0,
      flashT: 0, hitMarkT: 0, hitMarkKill: false,
      aimAssist: false, emptyT: 0
    };
  }

  function newObjective() {
    return { state: 'locked', progress: 0, x: 0, y: 0.16, z: -4, beepAt: 0 };
  }

  function newStats() {
    return {
      shotsFired: 0, shotsHit: 0, hits: 0, headshots: 0, kills: 0,
      damageTaken: 0, damageDealt: 0, score: 0, timeUsed: 0
    };
  }

  /* ---------- 敌人对象 ---------- */
  function makeEnemy(def, i) {
    var mesh = W.enemyMeshes[i] || (W.enemyMeshes[i] = W.buildEnemyMesh());
    return {
      id: def.id, name: def.name, def: def, mesh: mesh,
      x: def.x, y: def.y, z: def.z, yaw: def.yaw,
      hp: CFG.enemy.hp, alive: true, state: 'patrol',
      alerted: false, wpIdx: 0, wpWait: 0,
      spotT: 0, lostT: 0, hitT: 0, deadT: 0,
      burstLeft: 0, shotT: 0, cycleT: rnd(0, 1.1),
      lastX: def.x, lastZ: def.z, walkPhase: rnd(0, 6.28),
      moving: false, flashT: 0, strafe: (i % 2 ? 1 : -1), strafeT: 0,
      stuckT: 0, px: def.x, pz: def.z, deathRot: 0
    };
  }

  function resetEnemies() {
    S.enemies = ENEMY_DEFS.map(makeEnemy);
    S.enemies.forEach(function (e) {
      var m = e.mesh;
      m.group.visible = true;
      m.group.position.set(e.x, e.y, e.z);
      m.group.rotation.set(0, e.yaw, 0);
      m.group.scale.setScalar(1);
      m.alertMark.visible = false;
      m.flash.scale.setScalar(0.001);
      m.mats.body.emissive.setHex(0x000000);
      m.mats.accent.emissive.setHex(0x000000);
      m.mats.limb.emissive.setHex(0x000000);
      m.blob.visible = true;
    });
  }

  /* ---------- 复位 ---------- */
  G.reset = function () {
    S.player = newPlayer();
    S.objective = newObjective();
    S.stats = newStats();
    S.timeLeft = CFG.mission.time;
    S.elapsed = 0;
    S.alarmed = false;
    S.endReason = '';
    resetEnemies();
    W.clearFx();
    var p = S.player;
    p.y = W.groundAt(p.x, p.z, 0.2, 0.3, CFG.player.step);
    G.syncCamera();
    G.hudFull();
    BP.show(D['defuse-panel'], false);
    D['killfeed'].innerHTML = '';
    setVis(D['vignette'], 0); setVis(D['lowhp'], 0);
    ['dmg-top', 'dmg-bottom', 'dmg-left', 'dmg-right'].forEach(function (k) { setVis(D[k], 0); });
  };

  function setVis(el, o) { if (el) el.style.opacity = o; }

  /* ---------- 相机同步 ---------- */
  G.syncCamera = function () {
    var p = S.player, cam = W.camera;
    if (!cam || !p) return;
    cam.position.set(p.x, p.y + CFG.player.eye, p.z);
    cam.rotation.set(p.pitch, p.yaw, 0);
  };

  /* ===================== 玩家移动 ===================== */
  G.movePlayer = function (dt, fwd, right, slow) {
    var p = S.player, C = CFG.player;
    var sinY = Math.sin(p.yaw), cosY = Math.cos(p.yaw);
    // forward = (-sin, 0, -cos)；right = (cos, 0, -sin)
    var wishX = (-sinY) * fwd + cosY * right;
    var wishZ = (-cosY) * fwd + (-sinY) * right;
    var len = Math.hypot(wishX, wishZ);
    if (len > 1e-4) { wishX /= len; wishZ /= len; } else { wishX = 0; wishZ = 0; }
    var maxSpd = slow ? C.slow : C.speed;

    if (len > 1e-4) {
      p.vx += wishX * C.accel * dt;
      p.vz += wishZ * C.accel * dt;
    }
    // 摩擦
    var sp = Math.hypot(p.vx, p.vz);
    if (sp > 0) {
      var drop = C.friction * dt * (len > 1e-4 ? 0.55 : 1.9);
      var ns = Math.max(0, sp - drop * Math.max(1.2, sp * 0.5));
      if (sp > 0.0001) { p.vx *= ns / sp; p.vz *= ns / sp; }
      sp = Math.hypot(p.vx, p.vz);
    }
    if (sp > maxSpd) { p.vx *= maxSpd / sp; p.vz *= maxSpd / sp; sp = maxSpd; }
    p.speed = sp;

    W.moveAxis(p, p.vx * dt, p.vz * dt, C.radius, C.height, C.step);
    p.x = clamp(p.x, CFG.bounds.x0, CFG.bounds.x1);
    p.z = clamp(p.z, CFG.bounds.z0, CFG.bounds.z1);

    // 垂直
    var g = W.groundAt(p.x, p.z, p.y, 0.3, C.step);
    if (p.y <= g + 0.001) {
      p.y = g; p.vy = 0; p.onGround = true;
    } else if (p.y < g) {
      p.y = g; p.vy = 0; p.onGround = true;
    } else {
      p.vy -= C.gravity * dt;
      p.y += p.vy * dt;
      if (p.y <= g) { p.y = g; p.vy = 0; p.onGround = true; }
      else p.onGround = false;
    }
    if (p.y < 0) { p.y = 0; p.vy = 0; p.onGround = true; }

    // 步伐晃动
    if (p.onGround && sp > 0.4) p.bob += dt * sp * 1.5;
  };

  /* ===================== 武器 ===================== */
  function aimDir(p, spread) {
    var yaw = p.yaw + p.recoilY, pitch = clamp(p.pitch + p.recoilP, -1.5, 1.5);
    if (spread > 0) {
      var a = Math.random() * 6.28318, r = spread * Math.sqrt(Math.random());
      yaw += Math.cos(a) * r; pitch += Math.sin(a) * r;
    }
    var cp = Math.cos(pitch);
    return { x: -Math.sin(yaw) * cp, y: Math.sin(pitch), z: -Math.cos(yaw) * cp };
  }

  /* 射线与敌人求交 */
  function rayEnemies(ox, oy, oz, dx, dy, dz, maxT) {
    var best = null, bt = maxT;
    for (var i = 0; i < S.enemies.length; i++) {
      var e = S.enemies[i];
      if (!e.alive) continue;
      // 头部球
      var hx = e.x, hy = e.y + 1.72, hz = e.z, hr = 0.26;
      var mx = ox - hx, my = oy - hy, mz = oz - hz;
      var b = mx * dx + my * dy + mz * dz;
      var c = mx * mx + my * my + mz * mz - hr * hr;
      var disc = b * b - c;
      if (disc >= 0) {
        var t = -b - Math.sqrt(disc);
        if (t > 0.05 && t < bt) { bt = t; best = { e: e, t: t, head: true }; }
      }
      // 身体 AABB
      var box = { x0: e.x - 0.35, x1: e.x + 0.35, y0: e.y + 0.06, y1: e.y + 1.62, z0: e.z - 0.29, z1: e.z + 0.29 };
      var r = W.rayAABB(ox, oy, oz, dx, dy, dz, box, bt);
      if (r) { bt = r.t; best = { e: e, t: r.t, head: false }; }
    }
    return best;
  }
  G.rayEnemies = rayEnemies;

  G.canFire = function () {
    var p = S.player;
    if (S.phase !== 'playing' || S.paused || p.hp <= 0) return 'phase';
    if (p.reloadT > 0) return 'reloading';
    if (p.ammo <= 0) return 'empty';
    if (p.fireCd > 0) return 'cooldown';
    return '';
  };

  G.fire = function (fromApi) {
    var p = S.player, Wc = CFG.weapon;
    var why = G.canFire();
    if (why === 'cooldown' && fromApi) { p.fireCd = 0; why = ''; }
    if (why) {
      if (why === 'empty' && p.emptyT <= 0) {
        A.empty(); p.emptyT = 0.3;
        D['ammo-hint'].textContent = p.reserve > 0 ? '弹匣空了 — 按 R 换弹' : '备弹耗尽';
        flashHint();
      }
      return { fired: false, reason: why, ammo: p.ammo, reserve: p.reserve };
    }

    p.ammo--;
    p.fireCd = Wc.fireInterval;
    S.stats.shotsFired++;

    var useSpread = p.aimAssist ? 0 : p.spread;
    p.aimAssist = false;
    var d = aimDir(p, useSpread);
    var ox = p.x, oy = p.y + CFG.player.eye, oz = p.z;

    var wallHit = W.rayWorld(ox, oy, oz, d.x, d.y, d.z, Wc.range);
    var eHit = rayEnemies(ox, oy, oz, d.x, d.y, d.z, wallHit ? wallHit.t : Wc.range);

    var endT = Wc.range, res = { fired: true, reason: '', hit: 'none', ammo: p.ammo, reserve: p.reserve };
    if (eHit) {
      endT = eHit.t;
      var dmg = eHit.head ? Wc.dmgHead : Wc.dmgBody;
      S.stats.shotsHit++; S.stats.hits++;
      if (eHit.head) S.stats.headshots++;
      res.hit = 'enemy'; res.enemyId = eHit.e.id; res.headshot = !!eHit.head; res.damage = dmg;
      res.distance = r4(endT);
      G.hurtEnemy(eHit.e, dmg, eHit.head, ox + d.x * endT, oy + d.y * endT, oz + d.z * endT);
    } else if (wallHit) {
      endT = wallHit.t;
      res.hit = 'wall'; res.distance = r4(endT); res.surface = wallHit.tag || '';
      var ix = ox + d.x * endT, iy = oy + d.y * endT, iz = oz + d.z * endT;
      W.spawnSparks(ix, iy, iz, wallHit.nx, wallHit.ny, wallHit.nz, 7, 0xffc46a, 3.6);
      W.spawnDecal(ix, iy, iz, wallHit.nx, wallHit.ny, wallHit.nz);
      A.impact(clamp(d.x * Math.cos(p.yaw) - d.z * Math.sin(p.yaw), -1, 1) * 0.3);
    }

    // 枪口 + 曳光
    var muz = muzzleWorld();
    W.spawnTracer(muz.x, muz.y, muz.z, ox + d.x * endT, oy + d.y * endT, oz + d.z * endT, 0xffe6a8, 0.07);
    p.flashT = 0.048;
    // 后坐
    p.recoilP += Wc.recoilPitch * rnd(0.82, 1.2);
    p.recoilY += Wc.recoilYaw * (Math.random() < 0.5 ? -1 : 1) * rnd(0.6, 1.25);
    p.kick = Math.min(1, p.kick + 1);
    p.spread = Math.min(Wc.spreadMax, p.spread + Wc.spreadShot);
    p.shakeT = Math.max(p.shakeT, 0.06); p.shakeMag = Math.max(p.shakeMag, 0.0022 * W.quality.shake);
    A.shot();
    G.hudAmmo();
    return res;
  };

  function muzzleWorld() {
    var wp = W.weapon;
    if (!wp) { var p0 = S.player; return { x: p0.x, y: p0.y + CFG.player.eye, z: p0.z }; }
    var v = new THREE.Vector3(0, 0.005, -0.52);
    wp.group.localToWorld(v);
    return v;
  }

  G.reload = function () {
    var p = S.player;
    if (S.phase !== 'playing' || S.paused || p.hp <= 0) return false;
    if (p.reloadT > 0) return false;
    if (p.reserve <= 0) {
      if (p.ammo <= 0) { D['ammo-hint'].textContent = '备弹耗尽'; flashHint(); }
      return false;
    }
    if (p.ammo >= CFG.weapon.magSize) return false;
    p.reloadT = CFG.weapon.reloadTime;
    A.reloadOut();
    D['reload-track'].classList.add('on');
    D['ammo-hint'].textContent = '换弹中…';
    return true;
  };

  function finishReload() {
    var p = S.player, need = CFG.weapon.magSize - p.ammo;
    var give = Math.min(need, p.reserve);
    p.ammo += give; p.reserve -= give;
    p.reloadT = 0;
    A.reloadIn();
    D['reload-track'].classList.remove('on');
    D['ammo-hint'].textContent = '左键射击 · R 换弹';
    G.hudAmmo();
  }

  /* ===================== 敌人受伤 / 死亡 ===================== */
  G.hurtEnemy = function (e, dmg, head, ix, iy, iz) {
    if (!e.alive) return;
    e.hp -= dmg;
    S.stats.damageDealt += dmg;
    e.alerted = true;
    W.spawnSparks(ix, iy, iz, 0, 0.25, 0, head ? 12 : 8, head ? 0xff8a5a : 0xff5a45, 3.2);
    var p = S.player;
    p.hitMarkT = 0.2; p.hitMarkKill = false;
    A.hitMark(!!head);
    e.mesh.mats.body.emissive.setHex(0x8a2b18);
    e.mesh.mats.limb.emissive.setHex(0x8a2b18);
    if (e.hp <= 0) { G.killEnemy(e, head); }
    else {
      if (e.state !== 'attack') e.state = 'hit';
      e.hitT = 0.22;
      G.hudEnemies();
    }
  };

  G.killEnemy = function (e, head) {
    if (!e.alive) return;
    e.alive = false; e.hp = 0; e.state = 'dead'; e.deadT = 0;
    e.mesh.alertMark.visible = false;
    S.stats.kills++;
    var p = S.player;
    p.hitMarkT = 0.32; p.hitMarkKill = true;
    A.kill();
    feed((head ? '爆头 · ' : '') + '<b>' + e.name + '</b> 已倒下', head ? 'crit' : '');
    G.hudEnemies();
    if (G.aliveCount() === 0) G.onCleared();
  };

  G.aliveCount = function () {
    var n = 0;
    for (var i = 0; i < S.enemies.length; i++) if (S.enemies[i].alive) n++;
    return n;
  };

  G.onCleared = function () {
    if (S.objective.state === 'locked') S.objective.state = 'ready';
    A.cleared();
    toast('区域已清空 —— 前往 <i>青色标记</i> 处，长按 <b>E</b> 拆除装置', 3.4);
    feed('<b>清场完成</b> · 目标解锁', 'info');
  };

  /* ===================== 玩家受伤 ===================== */
  G.damagePlayer = function (amount, srcX, srcZ) {
    var p = S.player;
    if (S.phase !== 'playing' || p.hp <= 0) return;
    amount = clamp(BP.num(amount, 0), 0, 1000);
    if (amount <= 0) return;
    p.hp = Math.max(0, p.hp - amount);
    S.stats.damageTaken += amount;
    p.hurtT = 0.85;
    if (srcX != null) {
      var ang = Math.atan2(srcX - p.x, srcZ - p.z);
      p.hurtDir = angDiff(ang, p.yaw + Math.PI);
    } else p.hurtDir = 0;
    p.shakeT = Math.max(p.shakeT, 0.22);
    p.shakeMag = Math.max(p.shakeMag, 0.006 * W.quality.shake);
    A.hurt();
    G.hudHp();
    if (p.hp <= 0) G.lose('战斗失能');
  };

  /* ===================== 敌人 AI ===================== */
  function inZone(e, x, z) {
    var z0 = e.def.zone;
    return { x: clamp(x, z0.x0, z0.x1), z: clamp(z, z0.z0, z0.z1) };
  }

  function enemyCanSee(e) {
    var p = S.player, C = CFG.enemy;
    if (p.hp <= 0) return false;
    var d = dist2(e.x, e.z, p.x, p.z);
    if (d > C.view) return false;
    if (!e.alerted) {
      // 敌人前向为 (-sin yaw, -cos yaw)
      var fx = -Math.sin(e.yaw), fz = -Math.cos(e.yaw);
      var dx = (p.x - e.x) / Math.max(0.001, d), dz = (p.z - e.z) / Math.max(0.001, d);
      if (fx * dx + fz * dz < Math.cos(C.fov * 0.5)) return false;
    }
    return !W.blocked(e.x, e.y + C.eye, e.z, p.x, p.y + CFG.player.eye, p.z);
  }

  function stepToward(e, tx, tz, dt, speed) {
    var C = CFG.enemy;
    var dx = tx - e.x, dz = tz - e.z;
    var d = Math.hypot(dx, dz);
    if (d < 0.05) return false;
    var base = Math.atan2(dx, dz);
    var offs = [0, 0.45, -0.45, 0.95, -0.95, 1.5, -1.5, 2.2, -2.2];
    var chosen = null;
    for (var i = 0; i < offs.length; i++) {
      var a = base + offs[i];
      var sx = Math.sin(a), sz = Math.cos(a);
      if (!W.blocked(e.x, e.y + 0.95, e.z, e.x + sx * 1.5, e.y + 0.95, e.z + sz * 1.5)) { chosen = { x: sx, z: sz }; break; }
    }
    if (!chosen) chosen = { x: Math.sin(base), z: Math.cos(base) };
    var step = Math.min(speed * dt, d);
    W.moveAxis(e, chosen.x * step, chosen.z * step, C.radius, C.height, 0.6);
    var cl = inZone(e, e.x, e.z);
    e.x = cl.x; e.z = cl.z;
    e.yaw = Math.atan2(-chosen.x, -chosen.z);
    return true;
  }

  function faceTarget(e, tx, tz, dt, rate) {
    var want = Math.atan2(-(tx - e.x), -(tz - e.z));
    var d = angDiff(want, e.yaw);
    e.yaw += clamp(d, -(rate || 5) * dt, (rate || 5) * dt);
  }

  function enemyFire(e) {
    var p = S.player, C = CFG.enemy;
    var d = dist2(e.x, e.z, p.x, p.z);
    var ex = e.x, ey = e.y + C.eye, ez = e.z;
    // 枪口世界位置（估算）
    var fx = -Math.sin(e.yaw), fz = -Math.cos(e.yaw);
    var mx = ex + fx * 0.42 + (-fz) * 0.22, my = e.y + 1.3, mz = ez + fz * 0.42 + fx * 0.22;
    e.flashT = 0.05;

    var chance = clamp(C.hitBase - d * C.hitFalloff - (p.speed > 2.2 ? C.hitMoveMalus : 0), 0.1, 0.86);
    var hit = Math.random() < chance;
    var tx, ty, tz;
    if (hit) {
      tx = p.x; ty = p.y + CFG.player.eye - 0.15; tz = p.z;
      G.damagePlayer(C.dmg, e.x, e.z);
    } else {
      var a = Math.random() * 6.28, r = rnd(0.5, 1.5);
      tx = p.x + Math.cos(a) * r; ty = p.y + CFG.player.eye + rnd(-0.5, 0.8); tz = p.z + Math.sin(a) * r;
      // 打在附近的墙上
      var ddx = tx - mx, ddy = ty - my, ddz = tz - mz;
      var L = Math.hypot(ddx, ddy, ddz) || 1;
      var wh = W.rayWorld(mx, my, mz, ddx / L, ddy / L, ddz / L, L + 6);
      if (wh) {
        tx = mx + ddx / L * wh.t; ty = my + ddy / L * wh.t; tz = mz + ddz / L * wh.t;
        W.spawnSparks(tx, ty, tz, wh.nx, wh.ny, wh.nz, 5, 0xffb070, 3.0);
        W.spawnDecal(tx, ty, tz, wh.nx, wh.ny, wh.nz);
      }
    }
    W.spawnTracer(mx, my, mz, tx, ty, tz, 0xff8a4a, 0.09);
    var pan = clamp((p.x - e.x) * Math.cos(p.yaw) - (p.z - e.z) * Math.sin(p.yaw), -12, 12) / 12;
    A.enemyShot(-pan, d);
  }

  function animateEnemy(e, dt) {
    var m = e.mesh;
    if (!e.alive) {
      e.deadT += dt;
      var t = Math.min(1, e.deadT / 0.7);
      var s = BP.smooth(t);
      m.group.rotation.x = -1.42 * s;
      m.group.rotation.z = e.strafe * 0.3 * s;
      m.group.position.set(e.x, e.y + 0.02 - 0.12 * s, e.z);
      m.group.rotation.y = e.yaw;
      m.blob.visible = false;
      if (e.deadT > 6) m.group.visible = false;
      // 受击闪光收敛
      m.mats.body.emissive.multiplyScalar(Math.max(0, 1 - dt * 5));
      m.mats.limb.emissive.multiplyScalar(Math.max(0, 1 - dt * 5));
      return;
    }
    m.group.position.set(e.x, e.y, e.z);
    m.group.rotation.set(0, e.yaw, 0);

    var moved = dist2(e.x, e.z, e.px, e.pz);
    e.px = e.x; e.pz = e.z;
    var spd = dt > 0 ? moved / dt : 0;
    e.moving = spd > 0.35;
    if (e.moving) e.walkPhase += dt * (4.2 + spd * 1.5);
    else e.walkPhase += dt * 0.6;

    var sw = Math.sin(e.walkPhase) * (e.moving ? 0.62 : 0.05);
    m.legL.rotation.x = sw; m.legR.rotation.x = -sw;
    m.torso.rotation.y = Math.sin(e.walkPhase * 0.5) * (e.moving ? 0.08 : 0.03);
    m.torso.position.y = 0.86 + Math.abs(Math.cos(e.walkPhase)) * (e.moving ? 0.035 : 0.008);

    var aiming = (e.state === 'attack' || e.state === 'spot');
    var wantArm = aiming ? -1.42 : (e.moving ? -0.65 : -0.35);
    m.armR.rotation.x = lerp(m.armR.rotation.x, wantArm, Math.min(1, dt * 9));
    m.armL.rotation.x = lerp(m.armL.rotation.x, aiming ? -1.3 : (e.moving ? -0.5 + sw * 0.4 : -0.25), Math.min(1, dt * 9));
    m.armL.rotation.z = lerp(m.armL.rotation.z, aiming ? 0.42 : 0.06, Math.min(1, dt * 9));
    m.armR.rotation.z = lerp(m.armR.rotation.z, aiming ? -0.2 : -0.05, Math.min(1, dt * 9));

    m.alertMark.visible = (e.state === 'spot' || e.state === 'chase' || e.state === 'attack' || e.state === 'search');
    if (m.alertMark.visible) {
      m.alertMark.position.y = 2.32 + Math.sin(S.elapsed * 6) * 0.07;
      m.alertMark.rotation.y += dt * 3;
    }
    // 枪口闪光
    if (e.flashT > 0) {
      e.flashT -= dt;
      var f = Math.max(0, e.flashT / 0.05);
      m.flash.scale.setScalar(0.001 + f * 1.1);
      m.flash.material.opacity = f;
      m.flash.rotation.z += 1.1;
    } else m.flash.scale.setScalar(0.001);
    // 受击闪光衰减
    m.mats.body.emissive.multiplyScalar(Math.max(0, 1 - dt * 6));
    m.mats.limb.emissive.multiplyScalar(Math.max(0, 1 - dt * 6));
  }

  G.updateEnemy = function (e, dt) {
    var C = CFG.enemy, p = S.player;
    if (!e.alive) { animateEnemy(e, dt); return; }

    var d = dist2(e.x, e.z, p.x, p.z);
    var see = enemyCanSee(e);
    if (see) { e.lastX = p.x; e.lastZ = p.z; e.lostT = 0; }
    else e.lostT += dt;

    var grace = S.elapsed < CFG.mission.grace;

    switch (e.state) {
      case 'patrol': {
        var wp = e.def.wp[e.wpIdx % e.def.wp.length];
        if (e.wpWait > 0) { e.wpWait -= dt; faceTarget(e, wp[0], wp[1], dt, 2.2); }
        else {
          stepToward(e, wp[0], wp[1], dt, C.speedPatrol);
          if (dist2(e.x, e.z, wp[0], wp[1]) < 1.1) { e.wpIdx++; e.wpWait = rnd(0.4, 1.3); }
        }
        if (see) { e.state = 'spot'; e.spotT = 0; e.alerted = true; if (!S.alarmed) { S.alarmed = true; A.alarm(); feed('<b>被发现</b> · 敌方进入战斗', 'crit'); } }
        break;
      }
      case 'spot': {
        faceTarget(e, p.x, p.z, dt, 7);
        e.spotT += dt;
        if (e.spotT >= C.reaction) { e.state = 'attack'; e.burstLeft = C.burst; e.shotT = 0.05; }
        if (!see && e.lostT > 0.8) { e.state = 'search'; }
        break;
      }
      case 'chase': {
        var tx = see ? p.x : e.lastX, tz = see ? p.z : e.lastZ;
        if (see && d < C.keepMax && d > C.keepMin) { e.state = 'attack'; e.burstLeft = C.burst; e.shotT = 0.12; break; }
        if (see && d <= C.keepMin) {
          // 太近：后退寻找射击位
          stepToward(e, e.x - (p.x - e.x), e.z - (p.z - e.z), dt, C.speedChase * 0.75);
          faceTarget(e, p.x, p.z, dt, 6);
          if (d > C.keepMin * 0.8) { e.state = 'attack'; e.burstLeft = C.burst; e.shotT = 0.2; }
          break;
        }
        stepToward(e, tx, tz, dt, C.speedChase);
        if (!see && e.lostT > 1.2) e.state = 'search';
        break;
      }
      case 'attack': {
        faceTarget(e, p.x, p.z, dt, 7.5);
        // 侧向游走
        e.strafeT -= dt;
        if (e.strafeT <= 0) { e.strafeT = rnd(0.7, 1.7); e.strafe = Math.random() < 0.5 ? 1 : -1; }
        var fx = -Math.sin(e.yaw), fz = -Math.cos(e.yaw);
        var rx = fz * e.strafe, rz = -fx * e.strafe;
        if (see && d > 5) W.moveAxis(e, rx * 1.15 * dt, rz * 1.15 * dt, C.radius, C.height, 0.6);
        var cl = inZone(e, e.x, e.z); e.x = cl.x; e.z = cl.z;

        if (!see) {
          if (e.lostT > 0.6) { e.state = 'chase'; }
          break;
        }
        if (d > C.keepMax) { e.state = 'chase'; break; }
        if (grace) break;
        e.shotT -= dt;
        if (e.shotT <= 0) {
          if (e.burstLeft > 0) {
            enemyFire(e);
            e.burstLeft--;
            e.shotT = C.shotGap;
            if (e.burstLeft <= 0) e.shotT = C.burstGap * rnd(0.85, 1.2);
          } else { e.burstLeft = C.burst; e.shotT = 0.08; }
        }
        break;
      }
      case 'hit': {
        e.hitT -= dt;
        faceTarget(e, p.x, p.z, dt, 5);
        if (e.hitT <= 0) { e.state = see ? 'attack' : 'chase'; e.burstLeft = C.burst; e.shotT = 0.25; }
        break;
      }
      case 'search': {
        stepToward(e, e.lastX, e.lastZ, dt, C.speedPatrol * 1.2);
        if (see) { e.state = 'spot'; e.spotT = C.reaction * 0.45; }
        else if (e.lostT > C.memory) { e.state = 'patrol'; e.wpWait = 0.3; }
        break;
      }
    }

    // 垂直贴地
    var g = W.groundAt(e.x, e.z, e.y, 0.34, 0.65);
    if (e.y > g) e.y = Math.max(g, e.y - 9 * dt);
    else e.y = g;

    animateEnemy(e, dt);
  };

  /* ===================== 目标装置 ===================== */
  G.updateObjective = function (dt, holding) {
    var o = S.objective, p = S.player, M = CFG.mission;
    var cleared = G.aliveCount() === 0;
    var d = dist2(p.x, p.z, o.x, o.z);
    var inRange = (d <= M.defuseRange) && Math.abs(p.y - o.y) <= 2.6;
    if (o.state === 'done') return;
    if (!cleared) { o.state = 'locked'; o.progress = Math.max(0, o.progress - dt / M.decay); return; }

    if (holding && inRange && p.hp > 0) {
      o.state = 'defusing';
      var before = o.progress;
      o.progress = Math.min(1, o.progress + dt / M.defuseTime);
      var stepBeep = Math.floor(o.progress * 6);
      if (stepBeep > Math.floor(before * 6)) A.beep(o.progress);
      if (o.progress >= 1) { o.state = 'done'; o.progress = 1; G.win(); }
    } else {
      if (o.progress > 0) o.progress = Math.max(0, o.progress - dt / M.decay);
      o.state = 'ready';
    }
  };

  /* ===================== 胜负 ===================== */
  function bestRead() {
    var raw = BP.lsGet(BP.LS_BEST);
    if (!raw) return { time: null, score: 0, wins: 0 };
    try {
      var o = JSON.parse(raw);
      return { time: (typeof o.time === 'number' ? o.time : null), score: o.score || 0, wins: o.wins || 0 };
    } catch (e) { return { time: null, score: 0, wins: 0 }; }
  }
  function bestWrite(b) { BP.lsSet(BP.LS_BEST, JSON.stringify(b)); }
  G.best = bestRead;

  function computeScore(won) {
    var st = S.stats;
    var acc = st.shotsFired > 0 ? st.shotsHit / st.shotsFired : 0;
    var sc = st.kills * 180 + Math.round(acc * 240) + Math.max(0, Math.round(S.timeLeft * 22))
      - Math.round(st.damageTaken * 1.2) + (won ? 500 : 0);
    return Math.max(0, sc);
  }

  G.win = function () {
    if (S.phase !== 'playing') return;
    S.phase = 'won';
    S.stats.timeUsed = CFG.mission.time - S.timeLeft;
    S.stats.score = computeScore(true);
    S.endReason = '装置已安全拆除';
    var b = bestRead(), rec = [];
    if (b.time == null || S.stats.timeUsed < b.time) { b.time = Math.round(S.stats.timeUsed * 100) / 100; rec.push('最快用时'); }
    if (S.stats.score > b.score) { b.score = S.stats.score; rec.push('最高分'); }
    b.wins = (b.wins || 0) + 1;
    bestWrite(b);
    S.newRecord = rec;
    A.win(); A.setAmbient(false);
    G.showResult(true);
  };

  G.lose = function (reason) {
    if (S.phase !== 'playing') return;
    S.phase = 'lost';
    S.stats.timeUsed = CFG.mission.time - S.timeLeft;
    S.stats.score = computeScore(false);
    S.endReason = reason || '任务失败';
    S.newRecord = [];
    A.lose(); A.setAmbient(false);
    G.showResult(false);
  };

  /* ===================== 主更新 ===================== */
  G.update = function (dt) {
    if (S.phase !== 'playing' || S.paused) return;
    var p = S.player, Wc = CFG.weapon;
    S.elapsed += dt;

    // 倒计时
    S.timeLeft -= dt;
    if (S.timeLeft <= 0) { S.timeLeft = 0; G.lose('倒计时结束'); return; }

    // 玩家输入移动
    var IN = BP.Input;
    var mv = IN ? IN.moveVec() : { f: 0, r: 0, slow: false };
    G.movePlayer(dt, mv.f, mv.r, mv.slow);

    // 武器计时
    if (p.fireCd > 0) p.fireCd = Math.max(0, p.fireCd - dt);
    if (p.emptyT > 0) p.emptyT -= dt;
    if (p.reloadT > 0) {
      p.reloadT -= dt;
      if (p.reloadT <= 0) finishReload();
    }
    // 连发
    if (IN && IN.wantFire() && p.hp > 0) G.fire(false);

    // 后坐恢复
    p.recoilP = lerp(p.recoilP, 0, Math.min(1, dt * 9));
    p.recoilY = lerp(p.recoilY, 0, Math.min(1, dt * 9));
    p.kick = Math.max(0, p.kick - dt * 7.5);
    var moveSpread = Math.min(Wc.spreadMove, p.speed * 0.0022);
    p.spread = Math.max(Wc.spreadBase + moveSpread, p.spread - Wc.spreadRecover * dt);
    if (p.flashT > 0) p.flashT -= dt;
    if (p.hurtT > 0) p.hurtT -= dt;
    if (p.hitMarkT > 0) p.hitMarkT -= dt;
    if (p.shakeT > 0) p.shakeT -= dt; else p.shakeMag = 0;

    // 敌人
    for (var i = 0; i < S.enemies.length; i++) G.updateEnemy(S.enemies[i], dt);

    // 目标
    G.updateObjective(dt, !!(IN && IN.wantInteract()));

    // 特效
    W.updateFx(dt);
    // 装置动画
    if (W.device) {
      W.device.ring.rotation.z += dt * 1.35;
      W.device.ring.rotation.y += dt * 0.6;
      var pulse = 0.6 + 0.4 * Math.sin(S.elapsed * 3.4);
      W.device.light.intensity = (S.objective.state === 'locked' ? 0.9 : 1.9) * (0.65 + pulse * 0.45);
      W.device.core.material = S.objective.state === 'locked' ? W.M.glowAmber : W.M.glowCyan;
      W.device.tip.visible = Math.sin(S.elapsed * 8) > 0;
    }
    if (W.roofBeacon) W.roofBeacon.visible = Math.sin(S.elapsed * 4.2) > -0.2;
    if (W.lighthouse) W.lighthouse.visible = Math.sin(S.elapsed * 1.5) > -0.4;
    if (W.water) W.water.position.y = -1.5 + Math.sin(S.elapsed * 0.7) * 0.06;

    // 提示计时
    if (S.toastT > 0) { S.toastT -= dt; if (S.toastT <= 0) setVis(D['toast'], 0); }

    G.hudTick();
  };

  /* ===================== 渲染 ===================== */
  var _v3 = null;
  G.render = function () {
    if (!W.ready || W.contextLost) return;
    if (!_v3) _v3 = new THREE.Vector3();
    var p = S.player, cam = W.camera;

    if (S.phase === 'menu') {
      var t = W.menuT || 0;
      var a = 0.5 + Math.sin(t * 0.09) * 0.22;
      cam.position.set(Math.sin(a) * 21 + 1, 7.6, Math.cos(a) * 21 + 12);
      cam.lookAt(0, 2.6, -2);
    } else {
      var shake = 0;
      if (p.shakeT > 0) shake = p.shakeMag * (p.shakeT / 0.22 > 1 ? 1 : p.shakeT / 0.22) * 60;
      var bobY = Math.sin(p.bob * 2) * 0.032 * (W.reduceMotion ? 0.3 : 1);
      var bobX = Math.cos(p.bob) * 0.026 * (W.reduceMotion ? 0.3 : 1);
      cam.position.set(
        p.x + bobX * 0.4 + rnd(-shake, shake),
        p.y + CFG.player.eye + bobY + rnd(-shake, shake),
        p.z + rnd(-shake, shake)
      );
      cam.rotation.set(
        clamp(p.pitch + p.recoilP, -1.5, 1.5),
        p.yaw + p.recoilY,
        Math.sin(p.bob) * 0.008 + p.recoilY * 0.4
      );
      // 武器姿态
      var wp = W.weapon;
      if (wp) {
        var sway = clamp(p.speed / CFG.player.speed, 0, 1);
        wp.group.position.set(
          wp.base.x + Math.cos(p.bob) * 0.011 * sway - p.recoilY * 0.35,
          wp.base.y + Math.sin(p.bob * 2) * 0.009 * sway - p.kick * 0.008,
          wp.base.z + p.kick * CFG.weapon.kick
        );
        var rl = p.reloadT > 0 ? (1 - Math.abs(p.reloadT / CFG.weapon.reloadTime - 0.5) * 2) : 0;
        wp.group.rotation.set(
          wp.baseRot.x - p.kick * 0.16 - rl * 0.75,
          wp.baseRot.y + Math.sin(p.bob) * 0.012 * sway + rl * 0.3,
          wp.baseRot.z + rl * 0.35
        );
        var fl = p.flashT > 0 ? p.flashT / 0.048 : 0;
        wp.flash.scale.setScalar(0.001 + fl * 1.35);
        wp.flash2.scale.setScalar(0.001 + fl * 0.95);
        wp.flash.material.opacity = fl * 0.95;
        wp.flash.rotation.z += 0.8;
        wp.light.intensity = fl * 7;
      }
    }
    W.renderer.render(W.scene, cam);
    G.hudMarkers();
  };

  /* ===================== HUD ===================== */
  var lastHud = {};
  function txt(el, v) { if (el && lastHud[el.id] !== v) { el.textContent = v; lastHud[el.id] = v; } }

  G.hudFull = function () { G.hudHp(); G.hudAmmo(); G.hudEnemies(); G.hudTick(); };

  G.hudHp = function () {
    var p = S.player, pct = clamp(p.hp / CFG.player.hp, 0, 1);
    D['hp-fill'].style.width = (pct * 100).toFixed(1) + '%';
    D['hp-fill'].className = pct < 0.3 ? 'crit' : (pct < 0.6 ? 'warn' : '');
    txt(D['hp-value'], String(Math.ceil(p.hp)));
  };

  G.hudAmmo = function () {
    var p = S.player;
    txt(D['ammo-mag'], String(p.ammo));
    txt(D['ammo-reserve'], String(p.reserve));
    D['ammo-mag'].className = 'ammo-big' + (p.ammo === 0 ? ' empty' : (p.ammo <= 4 ? ' low' : ''));
  };

  G.hudEnemies = function () {
    var n = G.aliveCount();
    txt(D['enemies-left'], String(n));
    D['enemies-left'].className = 'big-num' + (n === 0 ? ' clear' : '');
  };

  function flashHint() {
    var el = D['ammo-hint'];
    el.classList.remove('blink');
    void el.offsetWidth;
    el.classList.add('blink');
  }
  G.flashHint = flashHint;

  function feed(html, cls) {
    var d = document.createElement('div');
    d.className = 'kf' + (cls ? ' ' + cls : '');
    d.innerHTML = html;
    D['killfeed'].appendChild(d);
    while (D['killfeed'].children.length > 4) D['killfeed'].removeChild(D['killfeed'].firstChild);
    window.setTimeout(function () { if (d.parentNode) d.parentNode.removeChild(d); }, 3200);
  }
  G.feed = feed;

  function toast(html, secs) {
    D['toast'].innerHTML = html;
    setVis(D['toast'], 1);
    S.toastT = secs || 3;
  }
  G.toast = toast;

  G.hudTick = function () {
    var p = S.player, o = S.objective;
    txt(D['timer'], S.timeLeft.toFixed(1));
    D['timer'].className = 'big-num' + (S.timeLeft <= 15 ? ' urgent' : '');

    // 目标文案
    var n = G.aliveCount(), line = '', ready = false;
    if (o.state === 'done') { line = '任务完成 · 装置已拆除'; ready = true; }
    else if (n > 0) { line = '清除武装靶员 · 剩余 ' + n + ' 名'; }
    else {
      ready = true;
      var d = dist2(p.x, p.z, o.x, o.z);
      if (d <= CFG.mission.defuseRange) line = '长按 E 拆除装置';
      else line = '前往青色标记 · 距离 ' + d.toFixed(1) + ' m';
    }
    txt(D['objective-text'], line);
    D['objective-line'].className = ready ? 'ready' : '';

    // 准星
    var ch = D['crosshair'];
    var pxPerRad = (W.viewH || 720) * 0.5 / Math.tan(CFG.player.fov * Math.PI / 360);
    ch.style.setProperty('--gap', (4 + p.spread * pxPerRad).toFixed(1) + 'px');
    var hot = false, usable = false;
    // 中心射线：判断准星是否指向敌人 / 装置
    var d0 = { x: -Math.sin(p.yaw) * Math.cos(p.pitch), y: Math.sin(p.pitch), z: -Math.cos(p.yaw) * Math.cos(p.pitch) };
    var ox = p.x, oy = p.y + CFG.player.eye, oz = p.z;
    var wh = W.rayWorld(ox, oy, oz, d0.x, d0.y, d0.z, 60);
    var eh = G.rayEnemies(ox, oy, oz, d0.x, d0.y, d0.z, wh ? wh.t : 60);
    if (eh) hot = true;
    if (o.state !== 'locked' && dist2(p.x, p.z, o.x, o.z) <= CFG.mission.defuseRange) usable = true;
    ch.className = (hot ? 'hot ' : '') + (usable ? 'usable' : '');

    // 命中标记
    var hm = D['hitmarker'];
    hm.style.opacity = p.hitMarkT > 0 ? Math.min(1, p.hitMarkT * 5).toFixed(2) : 0;
    hm.className = p.hitMarkKill ? 'kill' : '';

    // 换弹条
    if (p.reloadT > 0) {
      D['reload-bar'].style.width = ((1 - p.reloadT / CFG.weapon.reloadTime) * 100).toFixed(1) + '%';
    } else D['reload-bar'].style.width = '0%';

    // 受伤反馈
    var hv = p.hurtT > 0 ? clamp(p.hurtT / 0.85, 0, 1) : 0;
    setVis(D['vignette'], (hv * 0.85).toFixed(2));
    var lowp = clamp(1 - p.hp / 40, 0, 1);
    setVis(D['lowhp'], (lowp * (0.45 + 0.25 * Math.sin(S.elapsed * 4))).toFixed(2));
    var dir = p.hurtDir;
    var arrows = { 'dmg-top': Math.abs(dir) < 0.8, 'dmg-bottom': Math.abs(dir) > 2.35, 'dmg-left': dir >= 0.8 && dir <= 2.35, 'dmg-right': dir <= -0.8 && dir >= -2.35 };
    for (var k in arrows) setVis(D[k], arrows[k] ? (hv * 0.9).toFixed(2) : 0);

    // 拆弹面板
    var showDef = (o.state !== 'locked' && (dist2(p.x, p.z, o.x, o.z) <= CFG.mission.defuseRange + 1.6 || o.progress > 0));
    BP.show(D['defuse-panel'], showDef);
    if (showDef) {
      D['defuse-ring'].style.setProperty('--p', (o.progress * 100).toFixed(1));
      txt(D['defuse-pct'], Math.round(o.progress * 100) + '%');
      D['defuse-text'].innerHTML = o.state === 'defusing' ? '拆除中 · 保持按住 <b>E</b>'
        : (dist2(p.x, p.z, o.x, o.z) <= CFG.mission.defuseRange ? '长按 <b>E</b> 拆除装置' : '再靠近一些');
    }
  };

  /* 世界标记投影 */
  var markerPool = [];
  /* 复用固定数量的标记 DOM，避免重开后节点堆积 */
  function getMarker(i) {
    if (!markerPool[i]) {
      var d = document.createElement('div');
      d.className = 'mk';
      d.innerHTML = '<div class="mk-shape"></div><div class="mk-label"></div>';
      D['markers'].appendChild(d);
      markerPool[i] = { el: d, shape: d.firstChild, label: d.lastChild };
    }
    return markerPool[i];
  }

  G.hudMarkers = function () {
    if (S.phase !== 'playing') { for (var q = 0; q < markerPool.length; q++) markerPool[q].el.style.display = 'none'; return; }
    var cam = W.camera, w = W.viewW || 1, h = W.viewH || 1, idx = 0, p = S.player;

    function place(wx, wy, wz, cls, label, always) {
      _v3.set(wx, wy, wz).project(cam);
      var behind = _v3.z > 1 || _v3.z < -1;
      var sx = (_v3.x * 0.5 + 0.5) * w, sy = (-_v3.y * 0.5 + 0.5) * h;
      var edge = false;
      if (behind || sx < 26 || sx > w - 26 || sy < 26 || sy > h - 26) {
        if (!always) return;
        edge = true;
        if (behind) { sx = w - sx; sy = h - 24; }
        sx = clamp(sx, 26, w - 26); sy = clamp(sy, 34, h - 34);
      }
      var m = getMarker(idx++);
      m.el.style.display = 'flex';
      m.el.className = 'mk' + (cls ? ' ' + cls : '') + (edge ? ' edge' : '');
      m.el.style.transform = 'translate(' + (sx | 0) + 'px,' + (sy | 0) + 'px) translate(-50%,-50%)';
      if (m.label.textContent !== label) m.label.textContent = label;
    }

    // 目标装置
    var o = S.objective;
    var od = dist2(p.x, p.z, o.x, o.z);
    if (o.state !== 'done') {
      place(o.x, 2.15, o.z, '', (o.state === 'locked' ? '装置 · 锁定 ' : '拆除目标 ') + od.toFixed(0) + 'm', true);
    }
    // 敌人（可见或已警觉）
    for (var i = 0; i < S.enemies.length; i++) {
      var e = S.enemies[i];
      if (!e.alive) continue;
      var d = dist2(e.x, e.z, p.x, p.z);
      if (d > 34) continue;
      var vis = !W.blocked(p.x, p.y + CFG.player.eye, p.z, e.x, e.y + 1.3, e.z);
      if (!vis && !(e.alerted && d < 22)) continue;
      place(e.x, e.y + 2.05, e.z, 'enemy', d.toFixed(0) + 'm', e.alerted && !vis);
    }
    for (var j = idx; j < markerPool.length; j++) markerPool[j].el.style.display = 'none';
  };

  /* ===================== 结算层 ===================== */
  G.showResult = function (won) {
    var st = S.stats;
    var acc = st.shotsFired > 0 ? (st.shotsHit / st.shotsFired * 100) : 0;
    D['result-code'].textContent = won ? 'MISSION CLEAR' : 'MISSION FAILED';
    D['result-title'].textContent = won ? '任务完成' : '任务失败';
    D['result-title'].className = 'title-cn small-cn' + (won ? '' : ' lose');
    D['result-sub'].textContent = won
      ? '装置已安全拆除，训练场恢复安全。'
      : (S.endReason + ' —— 再试一次，注意利用集装箱掩体。');
    var b = bestRead();
    D['result-stats'].innerHTML =
      stat('用时', st.timeUsed.toFixed(1) + 's', won ? 'hi' : '') +
      stat('得分', String(st.score), 'cy') +
      stat('击杀', st.kills + '/' + S.enemies.length, '') +
      stat('命中率', acc.toFixed(0) + '%', '') +
      stat('爆头', String(st.headshots), '') +
      stat('受到伤害', String(Math.round(st.damageTaken)), '');
    var rec = (S.newRecord && S.newRecord.length) ? '　★ 新纪录：' + S.newRecord.join(' / ') : '';
    D['result-best'].innerHTML = '历史最佳：<b>' + (b.time == null ? '—' : b.time.toFixed(1) + 's')
      + '</b> · 最高分 <b>' + b.score + '</b> · 通关 <b>' + (b.wins || 0) + '</b> 次' + rec;
    BP.show(D['screen-result'], true);
    G.exitLock();
    BP.show(D['touch'], false);
  };

  function stat(label, value, cls) {
    return '<div class="stat' + (cls ? ' ' + cls : '') + '"><i>' + label + '</i><b>' + value + '</b></div>';
  }

  G.updateMenuBest = function () {
    var b = bestRead();
    D['best-menu'].innerHTML = (b.time == null)
      ? '暂无记录 · 目标：75 秒内清场并拆除'
      : '历史最佳：<b>' + b.time.toFixed(1) + 's</b> · 最高分 <b>' + b.score + '</b> · 通关 <b>' + (b.wins || 0) + '</b> 次';
  };

  G.exitLock = function () {
    try { if (document.pointerLockElement) document.exitPointerLock(); } catch (e) { }
  };

})(BP);

/* ============================================================
   Part 4 / 4 : 输入 · 阶段控制 · 主循环 · 测试接口 · 启动
   ============================================================ */
(function (BP) {
  'use strict';
  var CFG = BP.CFG, W = BP.World, D = BP.D, A = BP.Audio2, G = BP.Game, S = BP.Game.state;
  var clamp = BP.clamp, r4 = BP.r4, dist2 = BP.dist2;

  /* ===================== 输入 ===================== */
  var IN = BP.Input = {
    keys: {}, fireHeld: false, interactHeld: false,
    dragMode: false, dragging: false, dragX: 0, dragY: 0, dragMoved: 0, dragStart: 0,
    touch: { active: false, id: -1, ox: 0, oy: 0, dx: 0, dy: 0 },
    look: { id: -1, x: 0, y: 0 },
    tFire: false, tInteract: false,
    isTouch: false
  };

  IN.moveVec = function () {
    var f = 0, r = 0;
    if (this.keys['KeyW'] || this.keys['ArrowUp']) f += 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) f -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) r += 1;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) r -= 1;
    if (this.touch.active) { r += this.touch.dx; f += -this.touch.dy; }
    return { f: clamp(f, -1, 1), r: clamp(r, -1, 1), slow: !!(this.keys['ShiftLeft'] || this.keys['ShiftRight']) };
  };
  IN.wantFire = function () { return this.fireHeld || this.tFire; };
  IN.wantInteract = function () { return this.interactHeld || this.tInteract; };
  IN.releaseAll = function () {
    this.keys = {}; this.fireHeld = false; this.interactHeld = false;
    this.tFire = false; this.tInteract = false;
    this.touch.active = false; this.touch.id = -1; this.touch.dx = 0; this.touch.dy = 0;
    this.look.id = -1; this.dragging = false;
    knob(0, 0);
    if (D['tbtn-fire']) D['tbtn-fire'].classList.remove('on');
    if (D['tbtn-interact']) D['tbtn-interact'].classList.remove('on');
  };

  function knob(dx, dy) {
    if (D['stick-knob']) D['stick-knob'].style.transform = 'translate(' + (dx * 34).toFixed(1) + 'px,' + (dy * 34).toFixed(1) + 'px)';
  }

  function look(dx, dy, sens) {
    var p = S.player;
    if (!p || S.phase !== 'playing' || S.paused) return;
    p.yaw -= dx * sens;
    p.pitch = clamp(p.pitch - dy * sens, -1.45, 1.45);
    if (p.yaw > Math.PI) p.yaw -= BP.TAU; else if (p.yaw < -Math.PI) p.yaw += BP.TAU;
  }

  /* ---------- 键盘 ---------- */
  var GAME_KEYS = {
    KeyW: 1, KeyA: 1, KeyS: 1, KeyD: 1, KeyR: 1, KeyE: 1, KeyM: 1, KeyP: 1, KeyF: 1,
    Space: 1, ArrowUp: 1, ArrowDown: 1, ArrowLeft: 1, ArrowRight: 1, Tab: 1
  };

  function onKeyDown(ev) {
    var c = ev.code;
    if (GAME_KEYS[c] && S.phase === 'playing') ev.preventDefault();
    if (ev.repeat) {
      if (c === 'KeyE') IN.interactHeld = true;
      return;
    }
    IN.keys[c] = true;
    if (c === 'Escape') { togglePause(); return; }
    if (S.phase !== 'playing') {
      if (c === 'Enter' || c === 'Space') {
        if (S.phase === 'menu') G.start();
        else if (S.phase === 'won' || S.phase === 'lost') G.restart();
      }
      return;
    }
    if (S.paused) return;
    if (c === 'KeyR') G.reload();
    else if (c === 'KeyE') IN.interactHeld = true;
    else if (c === 'KeyM') toggleMute();
    else if (c === 'KeyP') togglePause();
    else if ((c === 'Space' || c === 'KeyF') && IN.dragMode) { IN.fireHeld = true; }
  }
  function onKeyUp(ev) {
    var c = ev.code;
    IN.keys[c] = false;
    if (c === 'KeyE') IN.interactHeld = false;
    if (c === 'Space' || c === 'KeyF') IN.fireHeld = false;
  }

  /* ---------- 鼠标 ---------- */
  function onMouseMove(ev) {
    if (document.pointerLockElement === D['gl']) {
      look(ev.movementX || 0, ev.movementY || 0, CFG.sens.mouse);
    } else if (IN.dragging) {
      var dx = ev.clientX - IN.dragX, dy = ev.clientY - IN.dragY;
      IN.dragX = ev.clientX; IN.dragY = ev.clientY;
      IN.dragMoved += Math.abs(dx) + Math.abs(dy);
      look(dx, dy, CFG.sens.drag);
    }
  }
  function isUiTarget(el) {
    if (!el || !el.closest) return false;
    return !!el.closest('button, .screen, #touch-buttons, #stick, .hud-buttons');
  }
  function onMouseDown(ev) {
    if (S.phase !== 'playing' || S.paused) return;
    if (isUiTarget(ev.target)) return;
    if (ev.button === 0) {
      if (document.pointerLockElement === D['gl']) { IN.fireHeld = true; }
      else {
        IN.dragging = true; IN.dragX = ev.clientX; IN.dragY = ev.clientY;
        IN.dragMoved = 0; IN.dragStart = performance.now();
        if (!IN.dragMode) requestLock();
      }
      ev.preventDefault();
    } else if (ev.button === 2) { ev.preventDefault(); }
  }
  function onMouseUp(ev) {
    if (ev.button !== 0) return;
    IN.fireHeld = false;
    if (IN.dragging) {
      IN.dragging = false;
      var quick = (performance.now() - IN.dragStart) < 260 && IN.dragMoved < 8;
      if (quick && IN.dragMode && S.phase === 'playing' && !S.paused) G.fire(false);
    }
  }

  /* ---------- 指针锁定 ---------- */
  var lockWanted = false;
  function requestLock() {
    var el = D['gl'];
    lockWanted = true;
    try {
      var pr = el.requestPointerLock ? el.requestPointerLock() : null;
      if (pr && pr.catch) pr.catch(function () { enableDragMode(); });
    } catch (e) { enableDragMode(); }
    window.setTimeout(function () {
      if (lockWanted && S.phase === 'playing' && !S.paused && document.pointerLockElement !== el) enableDragMode();
    }, 700);
  }
  function enableDragMode() {
    if (IN.dragMode) return;
    IN.dragMode = true;
    lockWanted = false;
    D['fallback-hint'].textContent = '指针锁定不可用：按住左键拖拽转视角，轻点左键或按 空格 / F 射击';
    BP.show(D['fallback-hint'], true);
  }
  function onLockChange() {
    var locked = document.pointerLockElement === D['gl'];
    if (locked) {
      IN.dragMode = false; lockWanted = false;
      BP.show(D['fallback-hint'], false);
    } else if (S.phase === 'playing' && !S.paused && !IN.isTouch && !lockWanted) {
      G.pause();
    }
  }

  function detectTouch() {
    var coarse = false;
    try { coarse = window.matchMedia('(pointer: coarse)').matches; } catch (e) { }
    return ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || coarse ||
      (window.innerWidth <= 560 && window.innerHeight >= window.innerWidth);
  }
  BP.detectTouch = detectTouch;

  /* ---------- 触摸 ---------- */
  function setupTouch() {
    var stick = D['stick'], pad = D['look-pad'];
    function stickStart(ev) {
      for (var i = 0; i < ev.changedTouches.length; i++) {
        var t = ev.changedTouches[i];
        if (IN.touch.id === -1) {
          IN.touch.id = t.identifier; IN.touch.active = true;
          IN.touch.ox = t.clientX; IN.touch.oy = t.clientY;
          IN.touch.dx = 0; IN.touch.dy = 0;
        }
      }
      ev.preventDefault();
    }
    function stickMove(ev) {
      for (var i = 0; i < ev.changedTouches.length; i++) {
        var t = ev.changedTouches[i];
        if (t.identifier === IN.touch.id) {
          var dx = (t.clientX - IN.touch.ox) / 46, dy = (t.clientY - IN.touch.oy) / 46;
          var L = Math.hypot(dx, dy);
          if (L > 1) { dx /= L; dy /= L; }
          IN.touch.dx = dx; IN.touch.dy = dy; knob(dx, dy);
        }
      }
      ev.preventDefault();
    }
    function stickEnd(ev) {
      for (var i = 0; i < ev.changedTouches.length; i++) {
        if (ev.changedTouches[i].identifier === IN.touch.id) {
          IN.touch.id = -1; IN.touch.active = false; IN.touch.dx = 0; IN.touch.dy = 0; knob(0, 0);
        }
      }
      ev.preventDefault();
    }
    stick.addEventListener('touchstart', stickStart, { passive: false });
    stick.addEventListener('touchmove', stickMove, { passive: false });
    stick.addEventListener('touchend', stickEnd, { passive: false });
    stick.addEventListener('touchcancel', stickEnd, { passive: false });
    // 鼠标拖动摇杆（窄窗口 / 无触摸设备的兜底）
    var mDown = false;
    stick.addEventListener('mousedown', function (ev) {
      mDown = true; IN.touch.active = true; IN.touch.ox = ev.clientX; IN.touch.oy = ev.clientY;
      IN.touch.dx = 0; IN.touch.dy = 0; ev.preventDefault(); ev.stopPropagation();
    });
    window.addEventListener('mousemove', function (ev) {
      if (!mDown) return;
      var dx = (ev.clientX - IN.touch.ox) / 46, dy = (ev.clientY - IN.touch.oy) / 46;
      var L = Math.hypot(dx, dy);
      if (L > 1) { dx /= L; dy /= L; }
      IN.touch.dx = dx; IN.touch.dy = dy; knob(dx, dy);
    });
    window.addEventListener('mouseup', function () {
      if (!mDown) return;
      mDown = false; IN.touch.active = false; IN.touch.dx = 0; IN.touch.dy = 0; knob(0, 0);
    });

    pad.addEventListener('touchstart', function (ev) {
      for (var i = 0; i < ev.changedTouches.length; i++) {
        var t = ev.changedTouches[i];
        if (IN.look.id === -1) { IN.look.id = t.identifier; IN.look.x = t.clientX; IN.look.y = t.clientY; }
      }
      ev.preventDefault();
    }, { passive: false });
    pad.addEventListener('touchmove', function (ev) {
      for (var i = 0; i < ev.changedTouches.length; i++) {
        var t = ev.changedTouches[i];
        if (t.identifier === IN.look.id) {
          look(t.clientX - IN.look.x, t.clientY - IN.look.y, CFG.sens.touch);
          IN.look.x = t.clientX; IN.look.y = t.clientY;
        }
      }
      ev.preventDefault();
    }, { passive: false });
    function padEnd(ev) {
      for (var i = 0; i < ev.changedTouches.length; i++) {
        if (ev.changedTouches[i].identifier === IN.look.id) IN.look.id = -1;
      }
      ev.preventDefault();
    }
    pad.addEventListener('touchend', padEnd, { passive: false });
    pad.addEventListener('touchcancel', padEnd, { passive: false });

    function hold(el, on, off) {
      el.addEventListener('touchstart', function (ev) { on(); el.classList.add('on'); ev.preventDefault(); }, { passive: false });
      el.addEventListener('touchend', function (ev) { off(); el.classList.remove('on'); ev.preventDefault(); }, { passive: false });
      el.addEventListener('touchcancel', function (ev) { off(); el.classList.remove('on'); ev.preventDefault(); }, { passive: false });
      el.addEventListener('mousedown', function (ev) { on(); el.classList.add('on'); ev.preventDefault(); });
      el.addEventListener('mouseup', function () { off(); el.classList.remove('on'); });
      el.addEventListener('mouseleave', function () { off(); el.classList.remove('on'); });
    }
    hold(D['tbtn-fire'], function () { IN.tFire = true; }, function () { IN.tFire = false; });
    hold(D['tbtn-interact'], function () { IN.tInteract = true; }, function () { IN.tInteract = false; });
    D['tbtn-reload'].addEventListener('touchstart', function (ev) { G.reload(); ev.preventDefault(); }, { passive: false });
    D['tbtn-reload'].addEventListener('click', function (ev) { G.reload(); ev.preventDefault(); });
  }

  /* ===================== 阶段控制 ===================== */
  function hudVisible(on) { D['hud'].style.display = on ? '' : 'none'; }

  G.start = function (fromApi) {
    if (S.phase === 'playing') return;
    G.reset();
    S.phase = 'playing';
    S.paused = false;
    S.started = true;
    IN.releaseAll();
    BP.show(D['screen-menu'], false);
    BP.show(D['screen-pause'], false);
    BP.show(D['screen-result'], false);
    hudVisible(true);
    BP.show(D['hud-controls'], true);
    BP.show(D['touch'], IN.isTouch);
    D['btn-pause'].textContent = '暂停';
    if (!fromApi) { A.resume(); }
    A.setAmbient(true);
    if (!fromApi && !IN.isTouch) requestLock();
    G.toast('突入 <b>十七号仓库</b>：沿黄色导引线向北 · 清除 <b>5</b> 名靶员 · 然后长按 <i>E</i> 拆除装置', 5);
    G.feed('<b>行动开始</b> · 75 秒', 'info');
    G.hudFull();
  };

  G.restart = function (fromApi) {
    S.phase = 'menu';
    G.start(fromApi);
  };

  G.pause = function () {
    if (S.phase !== 'playing' || S.paused) return;
    S.paused = true;
    IN.releaseAll();
    BP.show(D['screen-pause'], true);
    D['btn-pause'].textContent = '继续';
    A.setAmbient(false);
    G.exitLock();
  };

  G.resume = function (fromApi) {
    if (S.phase !== 'playing' || !S.paused) return;
    S.paused = false;
    BP.show(D['screen-pause'], false);
    D['btn-pause'].textContent = '暂停';
    A.setAmbient(true);
    if (!fromApi && !IN.isTouch) requestLock();
  };

  function togglePause() {
    if (S.phase !== 'playing') return;
    if (S.paused) G.resume(); else G.pause();
  }

  G.toMenu = function () {
    S.phase = 'menu'; S.paused = false;
    IN.releaseAll();
    G.exitLock();
    BP.show(D['screen-pause'], false);
    BP.show(D['screen-result'], false);
    BP.show(D['screen-menu'], true);
    BP.show(D['touch'], false);
    BP.show(D['hud-controls'], false);
    hudVisible(false);
    A.setAmbient(false);
    G.updateMenuBest();
  };

  function toggleMute() {
    A.setMuted(!A.muted);
    D['btn-mute'].textContent = A.muted ? '♪ 关' : '♪ 开';
    D['btn-mute'].classList[A.muted ? 'add' : 'remove']('muted');
  }

  /* ===================== 主循环 ===================== */
  var raf = 0, lastT = 0, running = false;
  var fpsAcc = 0, fpsN = 0, qualityChecked = false;

  function stepGameplay(dt) {
    var left = dt, guard = 0;
    while (left > 1e-6 && guard++ < 4000) {
      var s = Math.min(left, 1 / 60);
      G.update(s);
      left -= s;
      if (S.phase !== 'playing' || S.paused) break;
    }
  }
  G.stepGameplay = stepGameplay;

  function frame(now) {
    raf = window.requestAnimationFrame(frame);
    var dt = (now - lastT) / 1000;
    lastT = now;
    if (!isFinite(dt) || dt < 0) dt = 0;
    if (dt > 0.25) dt = 0.25;

    if (S.phase === 'menu') W.menuT = (W.menuT || 0) + (W.reduceMotion ? 0 : dt);
    if (!S.manual && S.phase === 'playing' && !S.paused) stepGameplay(dt);

    G.render();

    // 自适应画质（仅首次）
    if (!qualityChecked && S.phase === 'playing') {
      fpsAcc += dt; fpsN++;
      if (fpsAcc > 3.2) {
        qualityChecked = true;
        var fps = fpsN / fpsAcc;
        if (fps < 42 && W.quality.dpr > 1) {
          W.quality.dpr = 1; W.renderer.setPixelRatio(1); W.resize();
          W.quality.particles *= 0.6;
        }
      }
    }
  }

  function startLoop() {
    if (running) return;
    running = true;
    lastT = performance.now();
    raf = window.requestAnimationFrame(frame);
  }

  /* ===================== 测试接口 ===================== */
  function snapshot() {
    var p = S.player, o = S.objective, st = S.stats, cam = W.camera;
    var gl = null, isWebGL = false;
    try { gl = W.renderer ? W.renderer.getContext() : null; isWebGL = !!gl; } catch (e) { isWebGL = false; }
    var acc = st.shotsFired > 0 ? st.shotsHit / st.shotsFired : 0;
    var od = dist2(p.x, p.z, o.x, o.z);
    var alive = G.aliveCount();
    var b = G.best();
    return {
      version: BP.VERSION,
      phase: S.phase,
      paused: !!S.paused,
      manualClock: !!S.manual,
      timeLeft: r4(Math.max(0, S.timeLeft)),
      timeLimit: CFG.mission.time,
      elapsed: r4(S.elapsed),
      endReason: S.endReason || '',
      player: {
        x: r4(p.x), y: r4(p.y), z: r4(p.z),
        yaw: r4(p.yaw), pitch: r4(p.pitch),
        hp: r4(p.hp), maxHp: CFG.player.hp,
        ammo: p.ammo | 0, reserve: p.reserve | 0, magSize: CFG.weapon.magSize,
        reloading: p.reloadT > 0,
        reloadLeft: r4(Math.max(0, p.reloadT)),
        alive: p.hp > 0,
        onGround: !!p.onGround,
        eyeY: r4(p.y + CFG.player.eye),
        speed: r4(p.speed),
        spread: r4(p.spread),
        fireCooldown: r4(Math.max(0, p.fireCd)),
        fireInterval: CFG.weapon.fireInterval
      },
      enemies: S.enemies.map(function (e) {
        return {
          id: e.id, name: e.name,
          x: r4(e.x), y: r4(e.y), z: r4(e.z),
          hp: r4(Math.max(0, e.hp)), maxHp: CFG.enemy.hp,
          state: e.state, alive: !!e.alive, alerted: !!e.alerted,
          yaw: r4(e.yaw), distance: r4(dist2(e.x, e.z, p.x, p.z))
        };
      }),
      objective: {
        state: o.state,
        progress: r4(o.progress),
        x: r4(o.x), y: r4(o.y), z: r4(o.z),
        range: CFG.mission.defuseRange,
        distance: r4(od),
        inRange: od <= CFG.mission.defuseRange,
        cleared: alive === 0,
        enemiesLeft: alive,
        defuseTime: CFG.mission.defuseTime
      },
      stats: {
        shotsFired: st.shotsFired | 0,
        shotsHit: st.shotsHit | 0,
        hits: st.hits | 0,
        headshots: st.headshots | 0,
        kills: st.kills | 0,
        accuracy: r4(acc),
        damageTaken: r4(st.damageTaken),
        damageDealt: r4(st.damageDealt),
        score: st.score | 0,
        timeUsed: r4(S.phase === 'playing' ? (CFG.mission.time - S.timeLeft) : st.timeUsed),
        best: { time: b.time == null ? null : r4(b.time), score: b.score | 0, wins: b.wins | 0 }
      },
      renderer: {
        isWebGL: isWebGL,
        width: W.viewW | 0,
        height: W.viewH | 0,
        threeRevision: String(THREE.REVISION),
        pixelRatio: r4(W.renderer ? W.renderer.getPixelRatio() : 0),
        drawCalls: W.renderer ? (W.renderer.info.render.calls | 0) : 0,
        triangles: W.renderer ? (W.renderer.info.render.triangles | 0) : 0,
        colliders: W.colliders.length,
        contextLost: !!W.contextLost,
        fov: r4(cam ? cam.fov : 0),
        shadows: !!(W.renderer && W.renderer.shadowMap.enabled)
      },
      input: { dragFallback: !!IN.dragMode, touch: !!IN.isTouch, pointerLocked: document.pointerLockElement === D['gl'] }
    };
  }

  function findEnemy(id) {
    for (var i = 0; i < S.enemies.length; i++) {
      if (S.enemies[i].id === id || String(S.enemies[i].id) === String(id)) return S.enemies[i];
    }
    return null;
  }

  var TEST = {
    version: BP.VERSION,
    snapshot: snapshot,
    config: function () { return JSON.parse(JSON.stringify(CFG)); },

    start: function () { G.start(true); return snapshot(); },
    restart: function () { G.restart(true); return snapshot(); },
    pause: function () { G.pause(); return snapshot(); },
    resume: function () { G.resume(true); return snapshot(); },
    toMenu: function () { G.toMenu(); return snapshot(); },

    setManualClock: function (on) { S.manual = !!on; lastT = performance.now(); return !!S.manual; },
    isManualClock: function () { return !!S.manual; },

    step: function (ms) {
      var t = clamp(BP.num(ms, 0), 0, 20000);
      if (S.phase === 'playing' && !S.paused && t > 0) stepGameplay(t / 1000);
      return snapshot();
    },

    setPlayerPose: function (pose) {
      pose = pose || {};
      var p = S.player, C = CFG.player;
      if (pose.x != null) p.x = clamp(BP.num(pose.x, p.x), CFG.bounds.x0, CFG.bounds.x1);
      if (pose.z != null) p.z = clamp(BP.num(pose.z, p.z), CFG.bounds.z0, CFG.bounds.z1);
      if (pose.yaw != null) p.yaw = BP.num(pose.yaw, p.yaw);
      if (pose.pitch != null) p.pitch = clamp(BP.num(pose.pitch, p.pitch), -1.45, 1.45);
      if (pose.y != null) p.y = clamp(BP.num(pose.y, p.y), 0, 20);
      W.depenetrate(p, C.radius, C.height, C.step);
      p.x = clamp(p.x, CFG.bounds.x0, CFG.bounds.x1);
      p.z = clamp(p.z, CFG.bounds.z0, CFG.bounds.z1);
      var g = W.groundAt(p.x, p.z, p.y + 0.4, 0.3, C.step);
      if (p.y < g) p.y = g;
      if (p.y < 0) p.y = 0;
      p.vx = 0; p.vz = 0; p.vy = 0; p.speed = 0;
      G.syncCamera();
      if (S.phase === 'playing') G.hudTick();
      return snapshot();
    },

    move: function (forward, right, ms) {
      var f = clamp(BP.num(forward, 0), -1, 1);
      var r = clamp(BP.num(right, 0), -1, 1);
      var t = clamp(BP.num(ms, 0), 0, 10000) / 1000;
      if (S.phase !== 'playing' || S.paused) return snapshot();
      var guard = 0;
      while (t > 1e-6 && guard++ < 700) {
        var s = Math.min(t, 1 / 60);
        G.movePlayer(s, f, r, false);
        t -= s;
      }
      G.syncCamera();
      G.hudTick();
      return snapshot();
    },

    aimAtEnemy: function (id) {
      var e = findEnemy(id);
      if (!e) return false;
      var p = S.player;
      var dx = e.x - p.x, dy = (e.y + 1.2) - (p.y + CFG.player.eye), dz = e.z - p.z;
      var h = Math.hypot(dx, dz) || 1e-5;
      p.yaw = Math.atan2(-dx, -dz);
      p.pitch = clamp(Math.atan2(dy, h), -1.45, 1.45);
      p.recoilP = 0; p.recoilY = 0;
      p.spread = CFG.weapon.spreadBase;
      p.aimAssist = true;
      G.syncCamera();
      return true;
    },

    aimAt: function (x, y, z) {
      var p = S.player;
      var dx = BP.num(x, 0) - p.x, dy = BP.num(y, 0) - (p.y + CFG.player.eye), dz = BP.num(z, 0) - p.z;
      var h = Math.hypot(dx, dz) || 1e-5;
      p.yaw = Math.atan2(-dx, -dz);
      p.pitch = clamp(Math.atan2(dy, h), -1.45, 1.45);
      p.recoilP = 0; p.recoilY = 0; p.aimAssist = true;
      G.syncCamera();
      return true;
    },

    shoot: function () { return G.fire(true); },
    reload: function () { return G.reload(); },

    damagePlayer: function (amount) {
      G.damagePlayer(BP.num(amount, 0), null, null);
      return snapshot();
    },

    eliminateEnemy: function (id) {
      if (id == null) {
        S.enemies.slice().forEach(function (e) { if (e.alive) G.killEnemy(e, false); });
        return snapshot();
      }
      var e = findEnemy(id);
      if (!e || !e.alive) return snapshot();
      G.killEnemy(e, false);
      return snapshot();
    },

    interact: function (ms) {
      var t = clamp(BP.num(ms, 0), 0, 20000) / 1000;
      if (S.phase !== 'playing' || S.paused) return snapshot();
      var guard = 0;
      while (t > 1e-6 && guard++ < 1300) {
        var s = Math.min(t, 1 / 60);
        G.updateObjective(s, true);
        t -= s;
        if (S.phase !== 'playing') break;
      }
      if (S.phase === 'playing') G.hudTick();
      return snapshot();
    },

    setMuted: function (m) {
      A.setMuted(!!m);
      D['btn-mute'].textContent = A.muted ? '♪ 关' : '♪ 开';
      D['btn-mute'].classList[A.muted ? 'add' : 'remove']('muted');
      return A.muted;
    },
    enemyIds: function () { return S.enemies.map(function (e) { return e.id; }); },
    clearBest: function () { BP.lsSet(BP.LS_BEST, ''); G.updateMenuBest(); return true; }
  };

  /* ===================== 启动 ===================== */
  function bindUI() {
    D['btn-start'].addEventListener('click', function () { A.resume(); G.start(); });
    D['btn-pause'].addEventListener('click', function () { togglePause(); });
    D['btn-mute'].addEventListener('click', function () { A.resume(); toggleMute(); });
    D['btn-restart'].addEventListener('click', function () { G.restart(); });
    D['btn-resume'].addEventListener('click', function () { G.resume(); });
    D['btn-restart2'].addEventListener('click', function () { G.restart(); });
    D['btn-quit'].addEventListener('click', function () { G.toMenu(); });
    D['btn-again'].addEventListener('click', function () { G.restart(); });
    D['btn-menu'].addEventListener('click', function () { G.toMenu(); });

    window.addEventListener('resize', function () {
      W.resize();
      var t = detectTouch();
      if (t !== IN.isTouch) {
        IN.isTouch = t;
        document.body.classList[t ? 'add' : 'remove']('touch');
      }
      BP.show(D['touch'], IN.isTouch && S.phase === 'playing');
    }, false);
    window.addEventListener('orientationchange', function () { window.setTimeout(function () { W.resize(); }, 220); }, false);
    window.addEventListener('keydown', onKeyDown, false);
    window.addEventListener('keyup', onKeyUp, false);
    window.addEventListener('mousemove', onMouseMove, false);
    document.addEventListener('mousedown', onMouseDown, false);
    window.addEventListener('mouseup', onMouseUp, false);
    D['gl'].addEventListener('contextmenu', function (e) { e.preventDefault(); }, false);
    D['look-pad'].addEventListener('contextmenu', function (e) { e.preventDefault(); }, false);
    document.addEventListener('pointerlockchange', onLockChange, false);
    document.addEventListener('pointerlockerror', function () { enableDragMode(); }, false);
    window.addEventListener('blur', function () { IN.releaseAll(); G.pause(); }, false);
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) { IN.releaseAll(); G.pause(); }
    }, false);
    setupTouch();
  }

  function boot() {
    BP.grabDom();
    if (typeof THREE === 'undefined' || !THREE.WebGLRenderer) {
      BP.show(D['fatal'], true);
      D['fatal-msg'].textContent = '未能加载本地 Three.js 运行库。';
      return;
    }
    var ok = false;
    try { ok = W.init(); } catch (e) { ok = false; }
    if (!ok || !W.renderer) {
      BP.show(D['fatal'], true);
      D['fatal-msg'].textContent = '当前浏览器 / 设备无法创建 WebGL 上下文，无法运行本作。';
      return;
    }

    IN.isTouch = detectTouch();
    if (IN.isTouch) document.body.classList.add('touch');

    G.reset();
    G.toMenu();
    bindUI();
    D['btn-mute'].textContent = A.muted ? '♪ 关' : '♪ 开';
    D['btn-mute'].classList[A.muted ? 'add' : 'remove']('muted');
    startLoop();

    window.__BREACH_TEST__ = TEST;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else boot();

})(BP);
