'use strict';
/* ================================================================
   破门点 BREACH POINT — 原创低多边形海港仓库第一人称拆弹训练
   仅依赖预置 vendor/three.min.js (r147)，无任何外部资源。
   ================================================================ */
(function () {

/* ---------- 0. 工具与配置 ---------- */
const T = window.THREE;
const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const rnd = (a, b) => a + Math.random() * (b - a);
const normA = (a) => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; };
const r3 = (v) => Math.round(v * 1000) / 1000;
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const IS_TOUCH = matchMedia('(pointer: coarse)').matches || ('ontouchstart' in window);

const CFG = {
  matchTime: 75,
  eyeH: 1.62,
  speed: 5.1,
  radius: 0.45,
  sens: 0.0022,
  touchSens: 0.0042,
  pitchLim: 1.45,
  magSize: 12,
  reserveStart: 36,
  fireInterval: 0.115,
  reloadTime: 1.5,
  bodyDmg: 12,
  headDmg: 24,
  enemyHP: 36,
  defuseMs: 2000,
  defuseRange: 3.4,
  boltSpeed: 26,
  boltDmg: 8,
  playerHP: 100,
  bounds: 43.0,
  detectRange: 33,
  attackRange: 17,
};

const DEVICE_POS = { x: 0, y: 2.2, z: -34 };
const SPAWN = { x: 0, z: 36, yaw: 0 };

/* ---------- 1. DOM ---------- */
const canvas = $('scene');
const el = {
  hud: $('hud'), hpFill: $('hpFill'), hpNum: $('hpNum'),
  objText: $('objText'), compassArrow: $('compassArrow'), compassDist: $('compassDist'),
  timer: $('timer'), enemyPips: $('enemyPips'),
  crosshair: $('crosshair'), hitmark: $('hitmark'),
  ammoMag: $('ammoMag'), ammoRes: $('ammoRes'), reloadBar: $('reloadBar'), reloadHint: $('reloadHint'),
  btnPause: $('btnPause'), btnRestart: $('btnRestart'), btnMute: $('btnMute'),
  toast: $('toast'), hintDrag: $('hintDrag'),
  touchUI: $('touchUI'), stickZone: $('stickZone'), stickBase: $('stickBase'), stickNub: $('stickNub'),
  lookZone: $('lookZone'), btnFire: $('btnFire'), btnReloadT: $('btnReloadT'), btnInteract: $('btnInteract'),
  vignette: $('vignette'), dmgFlash: $('dmgFlash'),
  menu: $('menu'), bestLine: $('bestLine'), btnStart: $('btnStart'),
  pauseOv: $('pauseOv'), pauseReason: $('pauseReason'),
  btnResume: $('btnResume'), btnRestartP: $('btnRestartP'), btnMuteP: $('btnMuteP'), btnMenuP: $('btnMenuP'),
  endOv: $('endOv'), endCard: $('endCard'), endTitle: $('endTitle'), endReason: $('endReason'),
  endStats: $('endStats'), endRecord: $('endRecord'), btnAgain: $('btnAgain'), btnMenuE: $('btnMenuE'),
  fatal: $('fatal'), fatalMsg: $('fatalMsg'),
};

/* ---------- 2. 全局状态 ---------- */
const S = {
  phase: 'boot',            // menu | playing | won | lost
  paused: false,
  manualClock: false,
  timeLeft: CFG.matchTime,
  elapsed: 0,
  hp: CFG.playerHP,
  ammo: CFG.magSize,
  reserve: CFG.reserveStart,
  reloading: false,
  reloadT: 0,
  fireCd: 0,
  dryT: 0,
  autoReloadT: 0,
  yaw: 0,
  pitch: 0,
  recoil: 0,
  shakeT: 0,
  shakeAmp: 0,
  bobPhase: 0,
  bobAmp: 0,
  firing: false,
  interactHeld: false,
  defuse: 0,
  objState: 'locked',       // locked | ready | defusing | complete
  kills: 0, shots: 0, hits: 0, headshots: 0, dmgTaken: 0,
  warn10: false,
  tickAcc: 0,
  flashT: 0,
  plLocked: false,
  dragLook: false,
  plError: false,
  muted: false,
  endTimer: null,
  toastTimer: null,
};
const player = { x: SPAWN.x, y: 0, z: SPAWN.z };
const keys = Object.create(null);
const joy = { f: 0, r: 0 };
let best = { time: null, score: null };
try {
  const bt = parseFloat(localStorage.getItem('bp3d.bestTime'));
  const bs = parseInt(localStorage.getItem('bp3d.bestScore'), 10);
  if (isFinite(bt) && bt > 0) best.time = bt;
  if (isFinite(bs)) best.score = bs;
} catch (e) { /* localStorage 不可用时静默 */ }

/* ---------- 3. 程序化音效 (Web Audio) ---------- */
const AudioSys = {
  ctx: null, master: null, noise: null,
  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = S.muted ? 0 : 0.5;
      this.master.connect(this.ctx.destination);
      const len = this.ctx.sampleRate;
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.noise = buf;
    } catch (e) { this.ctx = null; }
  },
  setMuted(m) {
    S.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.5;
  },
  tone(type, f0, f1, dur, vol, when) {
    if (!this.ctx || S.muted) return;
    when = when || 0;
    try {
      const t = this.ctx.currentTime + when;
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(Math.max(f0, 1), t);
      if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(f1, 1), t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(Math.max(vol, 0.0002), t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(this.master);
      o.start(t); o.stop(t + dur + 0.03);
    } catch (e) { /* 忽略音频异常 */ }
  },
  noiseBurst(dur, vol, fType, f0, q, when) {
    if (!this.ctx || S.muted || !this.noise) return;
    when = when || 0;
    try {
      const t = this.ctx.currentTime + when;
      const src = this.ctx.createBufferSource();
      src.buffer = this.noise; src.loop = true;
      const f = this.ctx.createBiquadFilter();
      f.type = fType; f.frequency.value = f0; f.Q.value = q || 1;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(Math.max(vol, 0.0002), t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(f); f.connect(g); g.connect(this.master);
      src.start(t); src.stop(t + dur + 0.03);
    } catch (e) { /* 忽略音频异常 */ }
  },
  shoot() { this.noiseBurst(0.13, 0.5, 'highpass', 850, 0.8); this.tone('triangle', 170, 46, 0.1, 0.34); },
  enemyShoot(dist) {
    const v = 0.4 * clamp(1 - dist / 70, 0.12, 1);
    this.noiseBurst(0.11, v, 'bandpass', 620, 1.4);
    this.tone('square', 240, 90, 0.07, v * 0.5);
  },
  hit() { this.tone('square', 920, 700, 0.05, 0.22); },
  headshot() { this.tone('triangle', 1420, 1100, 0.12, 0.26); this.tone('triangle', 1900, 1500, 0.1, 0.14, 0.03); },
  hurt() { this.tone('sine', 130, 55, 0.2, 0.4); this.noiseBurst(0.14, 0.24, 'lowpass', 420, 0.8); },
  reloadA() { this.noiseBurst(0.05, 0.2, 'highpass', 1800, 1); this.noiseBurst(0.06, 0.18, 'highpass', 1200, 1, 0.16); },
  reloadB() { this.noiseBurst(0.06, 0.24, 'highpass', 1500, 1); this.tone('square', 520, 380, 0.05, 0.12, 0.05); },
  dry() { this.tone('square', 760, 620, 0.03, 0.12); },
  detect(dist) {
    const v = 0.2 * clamp(1 - dist / 55, 0.15, 1);
    this.tone('sawtooth', 520, 940, 0.14, v);
  },
  alarm() {
    this.tone('square', 680, 680, 0.16, 0.16);
    this.tone('square', 520, 520, 0.16, 0.16, 0.19);
    this.tone('square', 680, 680, 0.16, 0.16, 0.38);
    this.tone('square', 520, 520, 0.16, 0.16, 0.57);
  },
  warnBeep() { this.tone('square', 880, 880, 0.09, 0.15); this.tone('square', 880, 880, 0.09, 0.15, 0.2); },
  tick() { this.tone('square', 1050, 990, 0.04, 0.1); },
  unlock() { this.tone('triangle', 660, 660, 0.1, 0.2); this.tone('triangle', 990, 990, 0.14, 0.2, 0.11); },
  win() { [523, 659, 784, 1046].forEach((f, i) => this.tone('triangle', f, f, 0.22, 0.24, i * 0.13)); },
  lose() { [330, 262, 208, 156].forEach((f, i) => this.tone('sawtooth', f, f * 0.97, 0.3, 0.18, i * 0.17)); },
};

/* ---------- 4. 渲染器 / 场景 / 相机 ---------- */
let renderer = null, isWebGL = false;
const scene = new T.Scene();
scene.fog = new T.Fog(0x26394a, 42, 175);
const camera = new T.PerspectiveCamera(72, 1, 0.08, 420);
camera.rotation.order = 'YXZ';
scene.add(camera);

function fitRenderer() {
  if (!renderer) return;
  const w = Math.max(1, window.innerWidth), h = Math.max(1, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, IS_TOUCH ? 1.6 : 2));
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

try {
  renderer = new T.WebGLRenderer({ canvas, antialias: !IS_TOUCH, powerPreference: 'high-performance' });
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  isWebGL = true;
} catch (e) {
  isWebGL = false;
}

/* 灯光 */
const hemi = new T.HemisphereLight(0xbcd3de, 0x33302a, 0.88);
scene.add(hemi);
const sun = new T.DirectionalLight(0xffcf9e, 1.06);
sun.position.set(38, 52, 18);
sun.castShadow = isWebGL;
sun.shadow.mapSize.set(IS_TOUCH ? 1024 : 2048, IS_TOUCH ? 1024 : 2048);
sun.shadow.camera.left = -64; sun.shadow.camera.right = 64;
sun.shadow.camera.top = 64; sun.shadow.camera.bottom = -64;
sun.shadow.camera.near = 4; sun.shadow.camera.far = 170;
sun.shadow.bias = -0.0006;
sun.shadow.normalBias = 0.02;
scene.add(sun);
scene.add(sun.target);
sun.target.position.set(0, 0, -6);

/* ---------- 5. 天空 / 远景 / 环境 ---------- */
const skyMat = new T.ShaderMaterial({
  side: T.BackSide, depthWrite: false, fog: false,
  uniforms: {
    cTop: { value: new T.Color(0x0d2135) },
    cMid: { value: new T.Color(0x2e5266) },
    cBot: { value: new T.Color(0xd08a50) },
  },
  vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: [
    'varying vec3 vP;',
    'uniform vec3 cTop; uniform vec3 cMid; uniform vec3 cBot;',
    'void main(){',
    '  float h = normalize(vP).y;',
    '  vec3 c = h > 0.14 ? mix(cMid, cTop, smoothstep(0.14, 0.72, h)) : mix(cBot, cMid, smoothstep(-0.06, 0.14, h));',
    '  gl_FragColor = vec4(c, 1.0);',
    '}',
  ].join('\n'),
});
const skyDome = new T.Mesh(new T.SphereGeometry(320, 20, 12), skyMat);
scene.add(skyDome);

const sunDisc = new T.Mesh(
  new T.CircleGeometry(10, 20),
  new T.MeshBasicMaterial({ color: 0xffdcae, fog: false })
);
sunDisc.position.set(-210, 52, -110);
sunDisc.lookAt(0, 20, 0);
scene.add(sunDisc);
const sunHalo = new T.Mesh(
  new T.CircleGeometry(26, 20),
  new T.MeshBasicMaterial({ color: 0xffb46a, fog: false, transparent: true, opacity: 0.22, blending: T.AdditiveBlending, depthWrite: false })
);
sunHalo.position.copy(sunDisc.position).multiplyScalar(0.995);
sunHalo.lookAt(0, 20, 0);
scene.add(sunHalo);

/* 材质缓存 */
const matCache = {};
function lam(color, extra) {
  const key = color + (extra ? JSON.stringify(extra) : '');
  if (!matCache[key]) {
    const m = new T.MeshLambertMaterial({ color });
    if (extra) Object.assign(m, extra);
    matCache[key] = m;
  }
  return matCache[key];
}
const unitBox = new T.BoxGeometry(1, 1, 1);

/* 碰撞体与视线遮挡列表 */
const colliders = [];
const losMeshes = [];
const world = new T.Group();
scene.add(world);

function addBox(cx, cy, cz, sx, sy, sz, color, o) {
  o = o || {};
  const mesh = new T.Mesh(unitBox, o.mat || lam(color));
  mesh.scale.set(sx, sy, sz);
  mesh.position.set(cx, cy, cz);
  mesh.castShadow = o.cast !== false;
  mesh.receiveShadow = true;
  (o.parent || world).add(mesh);
  if (o.collide !== false) {
    colliders.push({
      minX: cx - sx / 2, maxX: cx + sx / 2,
      minY: cy - sy / 2, maxY: cy + sy / 2,
      minZ: cz - sz / 2, maxZ: cz + sz / 2,
    });
  }
  if (o.los !== false) losMeshes.push(mesh);
  return mesh;
}

/* 地面（顶点色微变化 + 平面着色） */
const groundGeo = new T.PlaneGeometry(340, 340, 22, 22);
{
  const pos = groundGeo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const base = new T.Color(0x3d4a52);
  for (let i = 0; i < pos.count; i++) {
    const c = base.clone().offsetHSL(0, 0, rnd(-0.022, 0.022));
    colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
  }
  groundGeo.setAttribute('color', new T.BufferAttribute(colors, 3));
}
const ground = new T.Mesh(groundGeo, new T.MeshLambertMaterial({ vertexColors: true }));
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
world.add(ground);

/* 西侧海面（低多边形动浪） */
const waterGeo = new T.PlaneGeometry(120, 260, 18, 34);
const water = new T.Mesh(waterGeo, new T.MeshLambertMaterial({
  color: 0x1d3a48, transparent: true, opacity: 0.94, flatShading: true,
}));
water.rotation.x = -Math.PI / 2;
water.position.set(-106, -0.35, 0);
world.add(water);
const waterBase = waterGeo.attributes.position.array.slice();

/* 浮标 */
const buoys = [];
[[-58, -20], [-72, 14], [-64, 34]].forEach((p) => {
  const g = new T.Group();
  const b = new T.Mesh(new T.ConeGeometry(0.55, 1.5, 6), lam(0xc04434));
  b.position.y = 0.55; b.castShadow = false;
  g.add(b);
  g.position.set(p[0], -0.2, p[1]);
  world.add(g);
  buoys.push(g);
});

/* 远处地标：灯塔（旋转光束） */
const lhGroup = new T.Group();
lhGroup.position.set(-74, 0, -8);
{
  const base = new T.Mesh(new T.CylinderGeometry(3.4, 4.2, 3, 8), lam(0x2a3640));
  base.position.y = 1.5; lhGroup.add(base);
  const tower = new T.Mesh(new T.CylinderGeometry(1.5, 2.4, 15, 8), lam(0xe6e0d2));
  tower.position.y = 10; lhGroup.add(tower);
  const band = new T.Mesh(new T.CylinderGeometry(1.95, 2.1, 2.6, 8), lam(0xc04434));
  band.position.y = 11.5; lhGroup.add(band);
  const lamp = new T.Mesh(new T.BoxGeometry(1.8, 1.6, 1.8), new T.MeshBasicMaterial({ color: 0xffe9b0 }));
  lamp.position.y = 18.2; lhGroup.add(lamp);
  const roof = new T.Mesh(new T.ConeGeometry(1.7, 1.6, 6), lam(0x22303a));
  roof.position.y = 19.6; lhGroup.add(roof);
}
world.add(lhGroup);
const lhBeam = new T.Mesh(
  new T.ConeGeometry(7, 30, 10, 1, true),
  new T.MeshBasicMaterial({ color: 0xffe2a0, transparent: true, opacity: 0.09, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, fog: false })
);
lhBeam.rotation.z = Math.PI / 2;
lhBeam.position.x = 15;
const lhBeamPivot = new T.Group();
lhBeamPivot.position.set(-74, 18.2, -8);
lhBeamPivot.add(lhBeam);
world.add(lhBeamPivot);

/* 远处地标：港口起重机剪影 */
function makeCrane(x, z, ry) {
  const g = new T.Group();
  const m = lam(0x18262f);
  const mk = (sx, sy, sz, px, py, pz) => {
    const b = new T.Mesh(unitBox, m);
    b.scale.set(sx, sy, sz); b.position.set(px, py, pz); b.castShadow = false;
    g.add(b);
  };
  mk(2.4, 30, 2.4, 0, 15, 0);
  mk(30, 1.6, 1.8, 9, 29, 0);
  mk(9, 1.4, 1.6, -8, 28.4, 0);
  mk(0.35, 8, 0.35, 16, 24.6, 0);
  mk(3.4, 2.2, 2.6, -10, 26.6, 0);
  mk(1.2, 1.2, 6, 0, 1.2, 0);
  g.position.set(x, 0, z);
  g.rotation.y = ry;
  world.add(g);
}
makeCrane(-60, -48, 0.5);
makeCrane(56, -62, -0.7);

/* 远处地标：停泊货船 */
{
  const g = new T.Group();
  const hull = new T.Mesh(unitBox, lam(0x20313a));
  hull.scale.set(9, 3.4, 30); hull.position.y = 1.2; g.add(hull);
  const bridge = new T.Mesh(unitBox, lam(0x3a4c58));
  bridge.scale.set(6, 4.4, 4); bridge.position.set(0, 4.6, -10); g.add(bridge);
  const cols = [0xa34a2e, 0x2e6f6a, 0xb98a2f, 0x35586e, 0x8a3030];
  for (let i = 0; i < 5; i++) {
    const c = new T.Mesh(unitBox, lam(cols[i]));
    c.scale.set(5.4, 2.2, 3.6); c.position.set(0, 3.9, -4 + i * 4.2); g.add(c);
  }
  g.position.set(-92, -0.4, 30);
  g.rotation.y = 0.35;
  world.add(g);
}

/* 漂移云 */
const clouds = [];
for (let i = 0; i < 5; i++) {
  const g = new T.Group();
  const n = 2 + Math.floor(Math.random() * 2);
  for (let j = 0; j < n; j++) {
    const p = new T.Mesh(new T.IcosahedronGeometry(rnd(4, 7), 0), lam(0xc7d2d8));
    p.scale.set(1.9, 0.55, 1);
    p.position.set(j * rnd(6, 9), rnd(-1, 1), rnd(-3, 3));
    p.castShadow = false;
    g.add(p);
  }
  g.position.set(rnd(-140, 60), rnd(44, 66), rnd(-150, -60));
  world.add(g);
  clouds.push(g);
}

/* ---------- 6. 地图布局（碰撞 + 视线） ---------- */
/* 周长界：南/北/东为高围栏，西为低堤岸（可眺望海面） */
addBox(0, 1.7, 44.2, 90, 3.4, 0.8, 0x37454f);
addBox(0, 1.7, -44.2, 90, 3.4, 0.8, 0x37454f);
addBox(44.2, 1.7, 0, 0.8, 3.4, 90, 0x37454f);
addBox(-44.2, 0.575, 0, 0.8, 1.15, 90, 0x4d5b64);
/* 围栏立柱装饰（西侧低堤上方无遮挡） */
for (let z = -40; z <= 40; z += 8) addBox(44.05, 1.9, z, 0.34, 3.8, 0.34, 0x2b3841, { collide: false, los: false, cast: false });

/* 仓库：x∈[10,40] z∈[-22,6]，西门 z∈[-12,-6]，南门 x∈[20,26] */
addBox(15, 3, 6, 10, 6, 0.7, 0x4a5b66);
addBox(33, 3, 6, 14, 6, 0.7, 0x4a5b66);
addBox(10, 3, -17, 0.7, 6, 10, 0x4a5b66);
addBox(10, 3, 0, 0.7, 6, 12, 0x4a5b66);
addBox(25, 3, -22, 30, 6, 0.7, 0x4a5b66);
addBox(40, 3, -8, 0.7, 6, 28, 0x4a5b66);
addBox(25, 6.3, -8, 31, 0.6, 29, 0x2c3640, { collide: false });           /* 屋顶（遮挡视线） */
addBox(25, 5.6, 6.42, 30, 0.5, 0.12, 0xff8a2a, { collide: false, los: false, cast: false }); /* 檐口色带 */
/* 仓库内立柱与货物 */
[[17, -15], [31, -15], [17, -1], [31, -1]].forEach((p) => addBox(p[0], 3, p[1], 0.8, 6, 0.8, 0x39464f));
addBox(22, 1.1, -10, 2.2, 2.2, 2.2, 0x8a6b42);
addBox(34.5, 1.2, -5, 2, 2.4, 2, 0x35586e);
addBox(15, 0.8, -3.5, 1.6, 1.6, 1.6, 0x7d5f3b);
addBox(26, 0.75, -18.5, 1.5, 1.5, 1.5, 0x8a6b42);
/* 仓库内照明条（发光装饰） */
addBox(24, 5.7, -8, 10, 0.12, 0.5, 0xd8e6ec, { mat: new T.MeshBasicMaterial({ color: 0xd8e6ec }), collide: false, los: false, cast: false });

/* 集装箱（西侧场院 + 东侧零散） */
const ctnCols = [0xa34a2e, 0x2e6f6a, 0xb98a2f, 0x35586e, 0x8a3030, 0x5a6e35];
function container(cx, cz, sx, sz, h, ci) {
  return addBox(cx, h / 2, cz, sx, h, sz, ctnCols[ci % ctnCols.length]);
}
container(-27, -11, 2.6, 7, 2.5, 0);    /* A */
container(-15, -14, 2.6, 7, 2.5, 1);    /* B — 狙击手高台 */
container(-27, 4, 2.6, 8, 5.0, 3);      /* C 双层 */
container(-13, 3, 2.6, 6, 2.5, 2);      /* D */
container(-34, -3, 2.6, 5, 2.5, 4);     /* E */
container(33, 16, 7, 2.6, 2.5, 5);      /* F */
container(35, -30, 2.6, 6, 2.5, 0);     /* G */
container(18, 24, 2.6, 5, 2.5, 3);      /* H */

/* 中央广场木箱与掩体 */
addBox(-4, 0.75, 12, 1.5, 1.5, 1.5, 0x8a6b42);
addBox(4, 0.6, 7, 1.8, 1.2, 1.4, 0x7d5f3b);
addBox(-7, 0.75, -6, 1.5, 1.5, 1.5, 0x8a6b42);
addBox(7, 0.65, -3, 1.3, 1.3, 1.3, 0x7d5f3b);
addBox(0, 0.8, 22, 1.6, 1.6, 1.6, 0x8a6b42);
addBox(-13, 0.75, 20, 1.5, 1.5, 1.5, 0x7d5f3b);
addBox(12, 0.7, 17, 1.4, 1.4, 1.4, 0x8a6b42);
addBox(-9, 0.7, -20, 1.4, 1.4, 1.4, 0x7d5f3b);
addBox(10, 0.75, -21, 1.5, 1.5, 1.5, 0x8a6b42);
addBox(-2, 0.52, 16, 3.2, 1.05, 0.5, 0x55636b);
addBox(9, 0.52, 12, 0.5, 1.05, 3, 0x55636b);

/* 油桶与叉车（ spawn 广场道具） */
addBox(-8, 0.55, 29, 1.4, 1.1, 1.4, 0x7a4a33);
{
  const g = new T.Group();
  const body = new T.Mesh(unitBox, lam(0xd9973b));
  body.scale.set(1.5, 1.2, 2.2); body.position.y = 0.85; body.castShadow = true; g.add(body);
  const cab = new T.Mesh(unitBox, lam(0x22303a));
  cab.scale.set(1.3, 1.0, 1.0); cab.position.set(0, 1.9, 0.45); cab.castShadow = true; g.add(cab);
  const mast = new T.Mesh(unitBox, lam(0x39464f));
  mast.scale.set(1.3, 2.4, 0.16); mast.position.set(0, 1.2, -1.25); g.add(mast);
  for (const s of [-0.45, 0.45]) {
    const fork = new T.Mesh(unitBox, lam(0x39464f));
    fork.scale.set(0.16, 0.08, 1.5); fork.position.set(s, 0.12, -1.9); g.add(fork);
  }
  g.position.set(15, 0, 32);
  world.add(g);
}
colliders.push({ minX: 15 - 0.85, maxX: 15 + 0.85, minY: 0, maxY: 2.4, minZ: 32 - 1.25, maxZ: 32 + 1.25 });

/* 北侧栈台（高低层次）+ 坡道 x∈[-3.5,3.5] z∈[-26,-19] */
addBox(-6.25, 1.1, -33, 5.5, 2.2, 14, 0x55636b);
addBox(6.25, 1.1, -33, 5.5, 2.2, 14, 0x55636b);
addBox(0, 1.06, -39.7, 7, 2.12, 0.6, 0x4d5b64, { collide: false, los: false }); /* 北缘基座装饰 */
addBox(0, 2.26, -26.15, 7.2, 0.1, 0.34, 0xffb454, { collide: false, los: false, cast: false }); /* 坡道入口警示条 */
/* 栏杆（装饰） */
for (const rx of [-8.8, 8.8]) {
  for (let rz = -39; rz <= -27; rz += 3) {
    addBox(rx, 2.75, rz, 0.1, 1.1, 0.1, 0x39464f, { collide: false, los: false, cast: false });
  }
  addBox(rx, 3.25, -33, 0.1, 0.08, 13.5, 0x39464f, { collide: false, los: false, cast: false });
}
for (let rx = -8; rx <= 8; rx += 3.2) {
  addBox(rx, 2.75, -39.85, 0.1, 1.1, 0.1, 0x39464f, { collide: false, los: false, cast: false });
}
addBox(0, 3.25, -39.85, 17.8, 0.08, 0.1, 0x39464f, { collide: false, los: false, cast: false });

/* 东侧了望塔与栈桥（视觉层次） */
addBox(14, 1.5, -24.5, 0.45, 3, 0.45, 0x39464f);
addBox(14, 1.5, -29.5, 0.45, 3, 0.45, 0x39464f);
addBox(14, 3.1, -27, 2.2, 0.35, 10, 0x4a5b66, { collide: false });
addBox(14, 1.5, -33, 3, 3, 3, 0x55636b);
addBox(14, 3.55, -33, 3.4, 0.18, 3.4, 0xff8a2a, { collide: false, los: false, cast: false });
addBox(14, 4.1, -33, 0.14, 1.1, 0.14, 0x22303a, { collide: false, los: false, cast: false });
addBox(14, 4.45, -33, 0.5, 0.34, 0.5, 0xffd9a0, { mat: new T.MeshBasicMaterial({ color: 0xffd9a0 }), collide: false, los: false, cast: false });

/* 灯杆 */
const lampMat = lam(0x223038);
[[-13, 26], [13, 26], [-13, -13], [13, -13]].forEach((p) => {
  const pole = new T.Mesh(new T.CylinderGeometry(0.09, 0.12, 4.4, 6), lampMat);
  pole.position.set(p[0], 2.2, p[1]); pole.castShadow = true;
  world.add(pole);
  const head = new T.Mesh(unitBox, lam(0x223038));
  head.scale.set(0.7, 0.16, 0.3); head.position.set(p[0], 4.42, p[1]); world.add(head);
  const bulb = new T.Mesh(new T.SphereGeometry(0.12, 6, 5), new T.MeshBasicMaterial({ color: 0xffd9a0 }));
  bulb.position.set(p[0], 4.3, p[1]); world.add(bulb);
  colliders.push({ minX: p[0] - 0.16, maxX: p[0] + 0.16, minY: 0, maxY: 4.4, minZ: p[1] - 0.16, maxZ: p[1] + 0.16 });
});
/* 广场与栈台点光源 */
const plazaLight = new T.PointLight(0xffc27a, 0.5, 34, 2);
plazaLight.position.set(0, 4.6, 24);
scene.add(plazaLight);

/* 出生点引导箭头（指向北侧栈台） */
const chevrons = [];
{
  const shape = new T.Shape();
  shape.moveTo(0, 0.55); shape.lineTo(-0.5, -0.35); shape.lineTo(0, -0.1); shape.lineTo(0.5, -0.35); shape.closePath();
  const geo = new T.ShapeGeometry(shape);
  [28, 20, 12].forEach((z) => {
    const m = new T.Mesh(geo, new T.MeshBasicMaterial({
      color: 0x3fe0ff, transparent: true, opacity: 0.34, depthWrite: false, side: T.DoubleSide,
    }));
    m.rotation.x = -Math.PI / 2;
    m.position.set(0, 0.03, z);
    world.add(m);
    chevrons.push(m);
  });
}

/* ---------- 7. 起爆装置 + 信标 ---------- */
const device = new T.Group();
device.position.set(DEVICE_POS.x, DEVICE_POS.y, DEVICE_POS.z);
{
  const ped = new T.Mesh(unitBox, lam(0x22303a));
  ped.scale.set(1.3, 0.55, 1.3); ped.position.y = 0.28; ped.castShadow = true; ped.receiveShadow = true;
  device.add(ped);
  for (const s of [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]]) {
    const leg = new T.Mesh(unitBox, lam(0x39464f));
    leg.scale.set(0.14, 0.2, 0.14); leg.position.set(s[0] * 1.1, 0.06, s[1] * 1.1);
    device.add(leg);
  }
  const screen = new T.Mesh(new T.PlaneGeometry(0.5, 0.26), new T.MeshBasicMaterial({ color: 0xff4d4d }));
  screen.position.set(0, 0.34, 0.66);
  device.add(screen);
  device.userData.screen = screen;
}
scene.add(device);
const deviceCore = new T.Mesh(
  new T.IcosahedronGeometry(0.42, 0),
  new T.MeshLambertMaterial({ color: 0x0c3038, emissive: 0x35e0ff, emissiveIntensity: 0.9, flatShading: true })
);
deviceCore.position.y = 1.05;
device.add(deviceCore);
const deviceLight = new T.PointLight(0x35e0ff, 1.1, 15, 2);
deviceLight.position.y = 1.6;
device.add(deviceLight);
const progressPillar = new T.Mesh(
  unitBox,
  new T.MeshBasicMaterial({ color: 0x3fe0ff, transparent: true, opacity: 0.75, blending: T.AdditiveBlending, depthWrite: false })
);
progressPillar.scale.set(0.16, 0.001, 0.16);
progressPillar.position.set(0.95, 0.56, 0);
progressPillar.visible = false;
device.add(progressPillar);
/* 信标光柱（远处可见） */
const beacon = new T.Mesh(
  new T.CylinderGeometry(0.55, 0.9, 16, 10, 1, true),
  new T.MeshBasicMaterial({ color: 0x3fe0ff, transparent: true, opacity: 0.14, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, fog: false })
);
beacon.position.y = 8.5;
device.add(beacon);
const beaconRing = new T.Mesh(
  new T.TorusGeometry(1.15, 0.05, 6, 24),
  new T.MeshBasicMaterial({ color: 0x3fe0ff, transparent: true, opacity: 0.6, blending: T.AdditiveBlending, depthWrite: false, fog: false })
);
beaconRing.rotation.x = Math.PI / 2;
beaconRing.position.y = 2.6;
device.add(beaconRing);
const beaconGem = new T.Mesh(
  new T.OctahedronGeometry(0.5, 0),
  new T.MeshBasicMaterial({ color: 0x9ff2ff, transparent: true, opacity: 0.9, fog: false })
);
beaconGem.position.y = 6.4;
device.add(beaconGem);

/* ---------- 8. 武器（第一人称视角模型） ---------- */
const weapon = new T.Group();
camera.add(weapon);
const muzzle = new T.Object3D();
{
  const steel = lam(0x232a30), steel2 = lam(0x39464f), accent = lam(0xff8a2a);
  const receiver = new T.Mesh(unitBox, steel); receiver.scale.set(0.09, 0.12, 0.44); receiver.position.set(0, 0, -0.05); weapon.add(receiver);
  const handguard = new T.Mesh(unitBox, steel2); handguard.scale.set(0.075, 0.09, 0.3); handguard.position.set(0, -0.005, -0.36); weapon.add(handguard);
  const stripe = new T.Mesh(unitBox, accent); stripe.scale.set(0.078, 0.028, 0.24); stripe.position.set(0, 0.036, -0.36); weapon.add(stripe);
  const barrel = new T.Mesh(new T.CylinderGeometry(0.021, 0.021, 0.3, 8), steel);
  barrel.rotation.x = Math.PI / 2; barrel.position.set(0, 0.012, -0.62); weapon.add(barrel);
  const brake = new T.Mesh(new T.CylinderGeometry(0.032, 0.032, 0.08, 8), steel2);
  brake.rotation.x = Math.PI / 2; brake.position.set(0, 0.012, -0.79); weapon.add(brake);
  const mag = new T.Mesh(unitBox, steel2); mag.scale.set(0.06, 0.24, 0.13); mag.position.set(0, -0.16, 0.02); mag.rotation.x = 0.28; weapon.add(mag);
  const grip = new T.Mesh(unitBox, steel); grip.scale.set(0.05, 0.15, 0.07); grip.position.set(0, -0.12, 0.16); grip.rotation.x = -0.3; weapon.add(grip);
  const stock = new T.Mesh(unitBox, steel2); stock.scale.set(0.07, 0.11, 0.24); stock.position.set(0, -0.01, 0.3); weapon.add(stock);
  const butt = new T.Mesh(unitBox, accent); butt.scale.set(0.075, 0.13, 0.04); butt.position.set(0, -0.01, 0.43); weapon.add(butt);
  const sight = new T.Mesh(unitBox, steel); sight.scale.set(0.03, 0.06, 0.09); sight.position.set(0, 0.09, -0.02); weapon.add(sight);
  const dot = new T.Mesh(new T.PlaneGeometry(0.014, 0.014), new T.MeshBasicMaterial({ color: 0x3fe0ff, transparent: true, opacity: 0.95 }));
  dot.position.set(0, 0.095, -0.066); weapon.add(dot);
  muzzle.position.set(0, 0.012, -0.84);
  weapon.add(muzzle);
}
weapon.position.set(0.26, -0.25, -0.42);
weapon.rotation.y = -0.02;
const WEAPON_BASE = weapon.position.clone();

/* 枪口闪光 */
const muzzleFlash = new T.Group();
{
  const fm = new T.MeshBasicMaterial({ color: 0xffd9a0, transparent: true, opacity: 0.95, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, fog: false });
  const p1 = new T.Mesh(new T.PlaneGeometry(0.36, 0.36), fm);
  const p2 = new T.Mesh(new T.PlaneGeometry(0.36, 0.36), fm);
  p2.rotation.z = Math.PI / 2;
  const core = new T.Mesh(new T.SphereGeometry(0.06, 6, 5), new T.MeshBasicMaterial({ color: 0xfff2d0, fog: false }));
  muzzleFlash.add(p1, p2, core);
}
muzzleFlash.visible = false;
muzzle.add(muzzleFlash);
const muzzleLight = new T.PointLight(0xffa040, 0, 9, 2);
muzzle.add(muzzleLight);
let muzzleT = 0;

/* ---------- 9. 粒子 / 曳光 / 弹道池 ---------- */
const raycaster = new T.Raycaster();
raycaster.near = 0.05;

const tracers = [];
{
  const geo = new T.BoxGeometry(0.032, 0.032, 1);
  for (let i = 0; i < 8; i++) {
    const m = new T.Mesh(geo, new T.MeshBasicMaterial({ color: 0xffcf7a, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, fog: false }));
    m.visible = false;
    scene.add(m);
    tracers.push({ mesh: m, life: 0 });
  }
}
function spawnTracer(from, to) {
  let t = tracers.find((x) => x.life <= 0);
  if (!t) t = tracers[0];
  const dir = new T.Vector3().subVectors(to, from);
  const len = dir.length();
  if (len < 0.4) return;
  t.mesh.visible = true;
  t.mesh.position.copy(from).addScaledVector(dir, 0.5);
  t.mesh.lookAt(to);
  t.mesh.scale.set(1, 1, len);
  t.mesh.material.opacity = 0.85;
  t.life = 0.07;
}

const sparks = [];
{
  const geo = new T.TetrahedronGeometry(0.055, 0);
  const n = REDUCED ? 14 : 28;
  for (let i = 0; i < n; i++) {
    const m = new T.Mesh(geo, new T.MeshBasicMaterial({ color: 0xffc46a, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false, fog: false }));
    m.visible = false;
    scene.add(m);
    sparks.push({ mesh: m, life: 0, vx: 0, vy: 0, vz: 0 });
  }
}
const _sv = new T.Vector3();
function spawnSparks(point, normal, color, count) {
  let spawned = 0;
  for (const s of sparks) {
    if (spawned >= count) break;
    if (s.life > 0) continue;
    s.life = rnd(0.18, 0.34);
    s.mesh.visible = true;
    s.mesh.position.copy(point);
    if (color !== undefined) s.mesh.material.color.setHex(color);
    _sv.set(rnd(-1, 1), rnd(-1, 1), rnd(-1, 1)).multiplyScalar(0.6);
    if (normal) _sv.add(normal);
    _sv.normalize().multiplyScalar(rnd(1.6, 4.2));
    s.vx = _sv.x; s.vy = _sv.y + 1.4; s.vz = _sv.z;
    s.mesh.material.opacity = 1;
    spawned++;
  }
}

/* 敌人弹道（可感知的光弹） */
const bolts = [];
{
  const geo = new T.SphereGeometry(0.075, 6, 5);
  for (let i = 0; i < 10; i++) {
    const m = new T.Mesh(geo, new T.MeshBasicMaterial({ color: 0xff9a3d, fog: false }));
    m.visible = false;
    scene.add(m);
    bolts.push({ mesh: m, life: 0, dx: 0, dy: 0, dz: 0 });
  }
}
function spawnBolt(from, dir) {
  let b = bolts.find((x) => x.life <= 0);
  if (!b) b = bolts[0];
  b.mesh.visible = true;
  b.mesh.position.copy(from);
  b.dx = dir.x; b.dy = dir.y; b.dz = dir.z;
  b.life = 2.0;
}

/* ---------- 10. 敌人 ---------- */
const ENEMY_DEFS = [
  { name: '场院哨兵', wp: [[-20, -2, 0], [-20, -19, 0], [-10, -19, 0], [-10, -2, 0]] },
  { name: '门岗', wp: [[22, 10, 0], [22, 3, 0]] },
  { name: '库内哨兵', wp: [[16, -17, 0], [33, -17, 0], [33, -3, 0], [16, -3, 0]] },
  { name: '栈台哨兵', wp: [[-7, -17.5, 0], [7, -17.5, 0]] },
  { name: '高台哨兵', wp: [[-15, -16.5, 2.5], [-15, -11.5, 2.5]], perch: true },
];

const enemies = [];
const enemyParts = [];
const _v1 = new T.Vector3(), _v2 = new T.Vector3(), _v3 = new T.Vector3();

function makeEnemy(def, id) {
  const g = new T.Group();
  const armor = new T.MeshLambertMaterial({ color: 0x3c5560 });
  const dark = new T.MeshLambertMaterial({ color: 0x22303a });
  const strap = new T.MeshLambertMaterial({ color: 0xb98a2f });
  const skin = new T.MeshLambertMaterial({ color: 0x2a3640 });
  const visorMat = new T.MeshLambertMaterial({ color: 0x331503, emissive: 0xff7a26, emissiveIntensity: 0.95 });

  const mk = (mat, sx, sy, sz, x, y, z) => {
    const m = new T.Mesh(unitBox, mat);
    m.scale.set(sx, sy, sz); m.position.set(x, y, z);
    m.castShadow = true;
    g.add(m);
    return m;
  };
  /* 腿（髋部枢轴） */
  const legL = new T.Group(); legL.position.set(-0.12, 0.64, 0);
  const legR = new T.Group(); legR.position.set(0.12, 0.64, 0);
  const ll = mk(dark, 0.17, 0.62, 0.2, 0, -0.31, 0); legL.add(ll);
  const lr = mk(dark, 0.17, 0.62, 0.2, 0, -0.31, 0); legR.add(lr);
  g.add(legL, legR);
  /* 躯干 */
  const torso = mk(armor, 0.52, 0.6, 0.32, 0, 0.95, 0);
  mk(strap, 0.44, 0.14, 0.34, 0, 1.14, 0);
  mk(dark, 0.4, 0.26, 0.1, 0, 0.92, 0.17);
  /* 头 */
  const head = mk(skin, 0.27, 0.27, 0.27, 0, 1.44, 0);
  const visor = mk(visorMat, 0.23, 0.09, 0.05, 0, 1.45, 0.135);
  mk(armor, 0.31, 0.1, 0.31, 0, 1.6, 0);
  /* 手臂 + 步枪 */
  const armR = new T.Group(); armR.position.set(0.31, 1.2, 0);
  const ar = mk(armor, 0.13, 0.5, 0.13, 0, -0.24, 0); armR.add(ar);
  const rifle = mk(dark, 0.07, 0.1, 0.62, 0, -0.47, 0.22); armR.add(rifle);
  const eMuzzle = new T.Object3D(); eMuzzle.position.set(0, -0.45, 0.58); armR.add(eMuzzle);
  const eFlash = new T.Mesh(
    new T.PlaneGeometry(0.3, 0.3),
    new T.MeshBasicMaterial({ color: 0xffc46a, transparent: true, opacity: 0.95, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, fog: false })
  );
  eFlash.visible = false;
  eMuzzle.add(eFlash);
  g.add(armR);
  const armL = new T.Group(); armL.position.set(-0.31, 1.2, 0);
  const al = mk(armor, 0.13, 0.5, 0.13, 0, -0.24, 0); armL.add(al);
  armL.rotation.x = -0.5;
  g.add(armL);
  /* 警戒标记 “!” */
  const marker = new T.Group();
  const markMat = new T.MeshBasicMaterial({ color: 0xffd23d, fog: false });
  const mb = new T.Mesh(unitBox, markMat); mb.scale.set(0.07, 0.26, 0.07); mb.position.y = 0; marker.add(mb);
  const md = new T.Mesh(unitBox, markMat); md.scale.set(0.07, 0.07, 0.07); md.position.y = -0.22; marker.add(md);
  marker.position.y = 2.05;
  marker.visible = false;
  g.add(marker);

  /* 命中部位登记 */
  const register = (mesh, part) => { mesh.userData.eid = id; mesh.userData.part = part; enemyParts.push(mesh); };
  register(head, 'head'); register(visor, 'head'); register(torso, 'body');
  register(ll, 'body'); register(lr, 'body'); register(ar, 'body'); register(rifle, 'body');

  scene.add(g);
  const e = {
    id, def, group: g, legL, legR, armR, marker, eMuzzle, eFlash,
    mats: [armor, dark, strap, skin, visorMat],
    x: def.wp[0][0], y: def.wp[0][2], z: def.wp[0][1],
    hp: CFG.enemyHP, alive: true,
    state: 'patrol', prev: 'patrol',
    wpIndex: 0, face: 0, walkPhase: Math.random() * 6,
    losT: Math.random() * 0.12, canSee: false,
    reactionT: 0, burstLeft: 0, fireT: 0, burstCd: 0,
    hitFlashT: 0, hitT: 0, deadT: 0,
    lastKnown: { x: 0, z: 0 }, searchT: 0,
    stuckT: 0, detourT: 0, detourX: 0, detourZ: 0,
    flashT: 0,
  };
  g.position.set(e.x, e.y, e.z);
  return e;
}
ENEMY_DEFS.forEach((d, i) => enemies.push(makeEnemy(d, i)));

function resetEnemy(e) {
  e.x = e.def.wp[0][0]; e.y = e.def.wp[0][2]; e.z = e.def.wp[0][1];
  e.hp = CFG.enemyHP; e.alive = true;
  e.state = 'patrol'; e.prev = 'patrol';
  e.wpIndex = 0; e.walkPhase = Math.random() * 6;
  e.losT = rnd(0, 0.12); e.canSee = false;
  e.reactionT = 0; e.burstLeft = 0; e.fireT = 0; e.burstCd = rnd(0, 0.6);
  e.hitFlashT = 0; e.hitT = 0; e.deadT = 0; e.searchT = 0;
  e.stuckT = 0; e.detourT = 0; e.flashT = 0;
  e.group.visible = true;
  e.group.rotation.set(0, rnd(-Math.PI, Math.PI), 0);
  e.group.position.set(e.x, e.y, e.z);
  e.marker.visible = false;
  e.eFlash.visible = false;
}

/* ---------- 11. 移动 / 碰撞 / 地面高度 ---------- */
function circleBlocked(x, z, r, feetY) {
  for (let i = 0; i < colliders.length; i++) {
    const c = colliders[i];
    if (c.maxY <= feetY + 0.35 || c.minY >= feetY + 1.5) continue;
    const cx = clamp(x, c.minX, c.maxX), cz = clamp(z, c.minZ, c.maxZ);
    const dx = x - cx, dz = z - cz;
    if (dx * dx + dz * dz < r * r) return true;
  }
  return false;
}
function groundHeightAt(x, z) {
  let h = 0;
  if (x > -9 && x < 9 && z > -40 && z < -26) h = 2.2;                       /* 栈台顶面 */
  else if (x > -3.5 && x < 3.5 && z > -26 && z < -19) h = 2.2 * ((-19 - z) / 7); /* 坡道 */
  return h;
}
function moveWithCollision(p, dx, dz, r) {
  const nx = clamp(p.x + dx, -CFG.bounds, CFG.bounds);
  if (!circleBlocked(nx, p.z, r, p.y)) p.x = nx;
  const nz = clamp(p.z + dz, -CFG.bounds, CFG.bounds);
  if (!circleBlocked(p.x, nz, r, p.y)) p.z = nz;
}
function snapGround(p, dt) {
  const gh = groundHeightAt(p.x, p.z);
  const diff = gh - p.y;
  if (diff > 0) p.y += Math.min(diff, Math.max(0.42, dt * 8));
  else if (diff < 0) p.y += diff * Math.min(1, dt * 11);
  if (p.y < 0) p.y = 0;
}
function movePlayer(dt, f, r) {
  f = clamp(f, -1, 1); r = clamp(r, -1, 1);
  let len = Math.hypot(f, r);
  if (len > 1) { f /= len; r /= len; len = 1; }
  const sin = Math.sin(S.yaw), cos = Math.cos(S.yaw);
  const vx = (-sin * f + cos * r) * CFG.speed;
  const vz = (-cos * f - sin * r) * CFG.speed;
  moveWithCollision(player, vx * dt, vz * dt, CFG.radius);
  snapGround(player, dt);
  const moving = len > 0.05 ? 1 : 0;
  S.bobAmp = lerp(S.bobAmp, moving, Math.min(1, dt * 8));
  if (moving) S.bobPhase += dt * 9.5;
}

/* ---------- 12. 相机 ---------- */
function syncCamera() {
  camera.position.set(player.x, player.y + CFG.eyeH, player.z);
  let sx = 0, sy = 0;
  if (S.shakeT > 0 && !REDUCED) {
    const a = S.shakeAmp * (S.shakeT > 0 ? 1 : 0);
    sx = rnd(-a, a); sy = rnd(-a, a);
  }
  camera.rotation.set(clamp(S.pitch + sx, -CFG.pitchLim, CFG.pitchLim), S.yaw + sy, 0);
}
function addShake(amp, dur) {
  if (REDUCED) return;
  S.shakeAmp = Math.max(S.shakeAmp, amp);
  S.shakeT = Math.max(S.shakeT, dur);
}

/* ---------- 13. 视线 / 战斗 ---------- */
function losClear(from, to) {
  _v1.subVectors(to, from);
  const dist = _v1.length();
  if (dist < 0.01) return true;
  raycaster.set(from, _v1.normalize());
  raycaster.far = dist - 0.15;
  const hits = raycaster.intersectObjects(losMeshes, false);
  raycaster.far = 200;
  return hits.length === 0;
}

const shootTargets = losMeshes.concat(enemyParts);
const hitN = new T.Vector3();

function fireWeapon() {
  if (S.phase !== 'playing' || S.paused) return { fired: false };
  if (S.reloading) return { fired: false };
  if (S.fireCd > 0) return { fired: false };
  if (S.ammo <= 0) {
    if (S.dryT <= 0) { AudioSys.dry(); S.dryT = 0.28; }
    if (S.reserve > 0 && S.autoReloadT <= 0) S.autoReloadT = 0.4;
    return { fired: false };
  }
  S.ammo--;
  S.fireCd = CFG.fireInterval;
  S.shots++;
  /* 后坐 */
  S.pitch = clamp(S.pitch + 0.011, -CFG.pitchLim, CFG.pitchLim);
  S.yaw += rnd(-0.0028, 0.0028);
  S.recoil = 1;
  addShake(0.006, 0.06);
  /* 枪口闪光 */
  muzzleT = 0.05;
  muzzleFlash.visible = true;
  muzzleFlash.rotation.z = rnd(0, Math.PI);
  muzzleFlash.scale.setScalar(rnd(0.8, 1.25));
  muzzleLight.intensity = 6;
  AudioSys.shoot();
  /* 射线（先同步全场景矩阵，保证任意时机命中判定确定） */
  scene.updateMatrixWorld();
  const from = muzzle.getWorldPosition(_v2.clone());
  raycaster.setFromCamera({ x: 0, y: 0 }, camera);
  raycaster.far = 160;
  const hits = raycaster.intersectObjects(shootTargets, false);
  let impact = null, hitEnemy = null, part = null;
  for (const h of hits) {
    const ud = h.object.userData;
    if (ud && ud.eid !== undefined) {
      const e = enemies[ud.eid];
      if (!e.alive) continue;      /* 跳过尸体，继续找后面的目标 */
      hitEnemy = e; part = ud.part; impact = h.point;
      break;
    }
    impact = h.point;
    if (h.face) hitN.copy(h.face.normal).transformDirection(h.object.matrixWorld);
    break;
  }
  if (!impact) {
    impact = raycaster.ray.at(120, _v3.clone());
  }
  spawnTracer(from, impact);
  if (hitEnemy) {
    S.hits++;
    const isHead = part === 'head';
    if (isHead) S.headshots++;
    damageEnemy(hitEnemy, isHead ? CFG.headDmg : CFG.bodyDmg);
    spawnSparks(impact, null, isHead ? 0xff6a4d : 0xffc46a, REDUCED ? 3 : 6);
    showHitmark(isHead);
    if (isHead) AudioSys.headshot(); else AudioSys.hit();
  } else {
    spawnSparks(impact, hitN, 0xffc46a, REDUCED ? 2 : 4);
  }
  if (S.ammo === 0 && S.reserve > 0) S.autoReloadT = 0.45;
  return { fired: true, ammo: S.ammo, reserve: S.reserve };
}

function showHitmark(head) {
  el.hitmark.classList.remove('show', 'head');
  void el.hitmark.offsetWidth;
  el.hitmark.classList.add('show');
  if (head) el.hitmark.classList.add('head');
}

function startReload() {
  if (S.phase !== 'playing' || S.paused) return false;
  if (S.reloading || S.ammo >= CFG.magSize || S.reserve <= 0) return false;
  S.reloading = true;
  S.reloadT = CFG.reloadTime;
  AudioSys.reloadA();
  return true;
}
function completeReload() {
  const take = Math.min(CFG.magSize - S.ammo, S.reserve);
  S.ammo += take;
  S.reserve -= take;
  S.reloading = false;
  S.reloadT = 0;
  AudioSys.reloadB();
}

function damageEnemy(e, dmg) {
  if (!e.alive) return;
  e.hp -= dmg;
  e.hitFlashT = 0.13;
  if (e.hp <= 0) {
    killEnemy(e, false);
  } else {
    if (e.state !== 'hit') { e.prev = e.state; e.state = 'hit'; }
    e.hitT = 0.22;
    if (e.state === 'patrol' || e.state === 'search') alertEnemy(e, true);
    /* 枪声警报传播 */
    propagateAlert(e.x, e.z);
  }
}
function killEnemy(e, silent) {
  if (!e.alive) return;
  e.alive = false;
  e.hp = 0;
  e.state = 'dead';
  e.deadT = 0;
  e.marker.visible = false;
  e.eFlash.visible = false;
  S.kills++;
  if (!silent) spawnSparks(_v1.set(e.x, e.y + 1.2, e.z), null, 0xff6a4d, REDUCED ? 4 : 8);
  clearCheck();
}
function propagateAlert(x, z) {
  for (const o of enemies) {
    if (!o.alive || o.state === 'dead') continue;
    const d = Math.hypot(o.x - x, o.z - z);
    if (d < 26 && (o.state === 'patrol' || o.state === 'search')) alertEnemy(o, false);
  }
}
function alertEnemy(e, immediate) {
  if (!e.alive) return;
  e.lastKnown.x = player.x; e.lastKnown.z = player.z;
  if (e.state === 'patrol' || e.state === 'search') {
    e.state = 'alert';
    e.reactionT = immediate ? rnd(0.25, 0.45) : rnd(0.5, 0.85);
    e.marker.visible = true;
    AudioSys.detect(Math.hypot(e.x - player.x, e.z - player.z));
  } else if (e.state === 'alert') {
    e.reactionT = Math.min(e.reactionT, immediate ? 0.2 : e.reactionT);
  }
}

function clearCheck() {
  const alive = enemies.filter((e) => e.alive).length;
  if (alive === 0 && S.objState === 'locked') {
    S.objState = 'ready';
    device.userData.screen.material.color.setHex(0x35e0ff);
    AudioSys.unlock();
    toast('哨兵已全部清除 — 登上栈台，长按 E 拆除装置', 'cy', 4200);
  }
}

/* ---------- 14. 玩家受击 ---------- */
function applyDamage(amount) {
  if (S.phase !== 'playing' || S.paused) return { hp: S.hp, dead: false };
  amount = Math.max(0, amount);
  S.hp = Math.max(0, S.hp - amount);
  S.dmgTaken += amount;
  S.flashT = 0.55;
  addShake(0.02, 0.22);
  AudioSys.hurt();
  if (S.hp <= 0) {
    endGame(false, '生命归零 — 突入失败');
    return { hp: 0, dead: true };
  }
  return { hp: S.hp, dead: false };
}

/* ---------- 15. 敌人 AI ---------- */
const _eye = new T.Vector3(), _peye = new T.Vector3();
function enemyEye(e) { return _eye.set(e.x, e.y + 1.55, e.z); }
function playerEye() { return _peye.set(player.x, player.y + CFG.eyeH, player.z); }

function updateEnemy(e, dt, menuMode) {
  if (!e.alive) {
    /* 死亡动画：向后倒下 → 沉入地面 */
    e.deadT += dt;
    const fall = Math.min(1, e.deadT / 0.38);
    e.group.rotation.x = -fall * Math.PI / 2 * 0.92;
    if (e.deadT > 1.5) {
      e.group.position.y -= dt * 0.9;
      if (e.group.position.y < e.y - 1.6) e.group.visible = false;
    }
    return;
  }
  const px = player.x - e.x, pz = player.z - e.z;
  const dist = Math.hypot(px, pz);
  e.hitFlashT = Math.max(0, e.hitFlashT - dt);
  e.flashT = Math.max(0, e.flashT - dt);
  e.eFlash.visible = e.flashT > 0;
  /* 受击红闪 */
  const flashOn = e.hitFlashT > 0;
  for (const m of e.mats) m.emissive.setHex(flashOn ? 0xb02015 : 0x000000);
  if (e.mats[4]) e.mats[4].emissive.setHex(flashOn ? 0xff2010 : 0xff7a26);

  /* 视线检测（节流） */
  e.losT -= dt;
  if (e.losT <= 0) {
    e.losT = 0.12;
    if (!menuMode && dist < CFG.detectRange + 4) {
      e.canSee = losClear(enemyEye(e), playerEye());
    } else e.canSee = false;
  }

  if (menuMode) {
    patrolStep(e, dt);
    syncEnemy(e, dt, 1.5);
    e.group.position.set(e.x, e.y, e.z);
    e.group.rotation.y = e.face;
    return;
  }

  const angleTo = Math.atan2(px, pz);
  const facing = Math.abs(normA(angleTo - e.face)) < 1.9;
  /* 巡逻中发现玩家 */
  if (e.state === 'patrol' && e.canSee && (facing || dist < 9)) {
    alertEnemy(e, false);
  }

  switch (e.state) {
    case 'patrol':
      patrolStep(e, dt);
      syncEnemy(e, dt, 1.5);
      break;
    case 'alert':
      e.face = turnToward(e.face, angleTo, dt * 6);
      e.reactionT -= dt;
      e.marker.position.y = 2.05 + Math.sin(performance.now() * 0.012) * 0.06;
      if (e.reactionT <= 0) {
        e.marker.visible = false;
        e.state = 'chase';
      }
      syncEnemy(e, dt, 0);
      break;
    case 'chase': {
      e.lastKnown.x = player.x; e.lastKnown.z = player.z;
      const reach = e.def.perch ? 34 : CFG.attackRange;
      if (e.canSee && dist < reach) { e.state = 'attack'; e.burstLeft = 0; e.burstCd = rnd(0.25, 0.7); break; }
      /* 高台哨兵不下台：打不到就原地警戒 */
      if (e.def.perch) { e.state = (e.canSee && dist < 36) ? 'attack' : 'search'; e.searchT = 2.2; break; }
      let tx, tz, sp;
      if (e.canSee) { tx = player.x; tz = player.z; sp = 3.3; }
      else { tx = e.lastKnown.x; tz = e.lastKnown.z; sp = 2.6; }
      if (e.detourT > 0) { e.detourT -= dt; tx = e.detourX; tz = e.detourZ; }
      const ddx = tx - e.x, ddz = tz - e.z;
      const dd = Math.hypot(ddx, ddz);
      if (dd > 0.6) {
        e.face = turnToward(e.face, Math.atan2(ddx, ddz), dt * 7);
        const ox = e.x, oz = e.z;
        moveWithCollision(e, (ddx / dd) * sp * dt, (ddz / dd) * sp * dt, 0.4);
        const moved = Math.hypot(e.x - ox, e.z - oz);
        if (moved < sp * dt * 0.25) {
          e.stuckT += dt;
          if (e.stuckT > 0.5) {
            e.stuckT = 0; e.detourT = 0.9;
            const side = Math.random() < 0.5 ? 1 : -1;
            e.detourX = e.x + (-ddz / dd) * side * 3.5;
            e.detourZ = e.z + (ddx / dd) * side * 3.5;
          }
        } else e.stuckT = 0;
        if (!e.def.perch) snapGround(e, dt);
        syncEnemy(e, dt, sp);
      } else if (!e.canSee) {
        e.state = 'search'; e.searchT = 3.6;
      }
      break;
    }
    case 'attack': {
      e.face = turnToward(e.face, angleTo, dt * 8);
      if (!e.canSee) { e.state = 'chase'; break; }
      if (dist > (e.def.perch ? 36 : CFG.attackRange + 5)) { e.state = 'chase'; break; }
      e.burstCd -= dt;
      if (e.burstCd <= 0) {
        if (e.burstLeft <= 0) e.burstLeft = 3;
        e.fireT -= dt;
        if (e.fireT <= 0) {
          fireBolt(e);
          e.burstLeft--;
          e.fireT = 0.17;
          if (e.burstLeft <= 0) e.burstCd = rnd(1.35, 2.25);
        }
      }
      /* 瞄准姿态 */
      e.armR.rotation.x = lerp(e.armR.rotation.x, -1.32, Math.min(1, dt * 10));
      syncEnemy(e, dt, 0);
      break;
    }
    case 'hit':
      e.hitT -= dt;
      e.face = turnToward(e.face, angleTo, dt * 9);
      if (e.hitT <= 0) e.state = (e.prev === 'attack' || e.prev === 'chase') ? e.prev : 'chase';
      syncEnemy(e, dt, 0);
      break;
    case 'search': {
      e.searchT -= dt;
      e.face += dt * 1.3;
      if (e.canSee && facing) alertEnemy(e, true);
      else if (e.searchT <= 0) e.state = 'patrol';
      syncEnemy(e, dt, 0);
      break;
    }
  }
  if (e.state !== 'attack') {
    e.armR.rotation.x = lerp(e.armR.rotation.x, -0.22, Math.min(1, dt * 6));
  }
  e.group.position.set(e.x, e.y, e.z);
  e.group.rotation.y = e.face;
}

function patrolStep(e, dt) {
  const wp = e.def.wp[e.wpIndex];
  const tx = wp[0], tz = wp[1], ty = wp[2];
  const dx = tx - e.x, dz = tz - e.z;
  const d = Math.hypot(dx, dz);
  if (d < 0.5) {
    e.wpIndex = (e.wpIndex + 1) % e.def.wp.length;
    return;
  }
  e.face = turnToward(e.face, Math.atan2(dx, dz), dt * 5);
  moveWithCollision(e, (dx / d) * 1.5 * dt, (dz / d) * 1.5 * dt, 0.4);
  e.y = lerp(e.y, ty, Math.min(1, dt * 6));
}
function syncEnemy(e, dt, speed) {
  if (speed > 0.1) {
    e.walkPhase += dt * speed * 2.4;
    const s = Math.sin(e.walkPhase) * 0.55;
    e.legL.rotation.x = s;
    e.legR.rotation.x = -s;
  } else {
    e.legL.rotation.x = lerp(e.legL.rotation.x, 0, Math.min(1, dt * 8));
    e.legR.rotation.x = lerp(e.legR.rotation.x, 0, Math.min(1, dt * 8));
  }
}
function turnToward(cur, target, max) {
  const d = normA(target - cur);
  return cur + clamp(d, -max, max);
}

function fireBolt(e) {
  e.group.updateMatrixWorld(true);
  const from = e.eMuzzle.getWorldPosition(_v1.clone());
  /* 瞄准玩家胸口，带提前量与散布 */
  const spread = 0.07 + Math.hypot(player.x - e.x, player.z - e.z) * 0.013;
  const aim = _v2.set(
    player.x + rnd(-spread, spread),
    player.y + 1.25 + rnd(-spread, spread) * 0.7,
    player.z + rnd(-spread, spread)
  );
  const dir = aim.sub(from).normalize();
  from.addScaledVector(dir, 0.4);
  spawnBolt(from, dir);
  e.flashT = 0.06;
  AudioSys.enemyShoot(Math.hypot(player.x - e.x, player.z - e.z));
}

function updateBolts(dt) {
  const chestY = player.y + 1.25;
  for (const b of bolts) {
    if (b.life <= 0) continue;
    b.life -= dt;
    const step = CFG.boltSpeed * dt;
    b.mesh.position.x += b.dx * step;
    b.mesh.position.y += b.dy * step;
    b.mesh.position.z += b.dz * step;
    const p = b.mesh.position;
    if (b.life <= 0 || p.y < 0.02) { b.life = 0; b.mesh.visible = false; continue; }
    /* 命中玩家 */
    const dx = p.x - player.x, dy = p.y - chestY, dz = p.z - player.z;
    if (dx * dx + dy * dy + dz * dz < 0.55) {
      b.life = 0; b.mesh.visible = false;
      spawnSparks(p, null, 0xff6a4d, REDUCED ? 3 : 5);
      applyDamage(CFG.boltDmg);
      continue;
    }
    /* 命中掩体 */
    if (pointBlocked(p.x, p.y, p.z)) {
      b.life = 0; b.mesh.visible = false;
      spawnSparks(p, null, 0xffc46a, REDUCED ? 2 : 4);
    }
  }
}
function pointBlocked(x, y, z) {
  for (let i = 0; i < colliders.length; i++) {
    const c = colliders[i];
    if (x > c.minX && x < c.maxX && y > c.minY && y < c.maxY && z > c.minZ && z < c.maxZ) return true;
  }
  return false;
}

/* ---------- 16. 粒子更新 ---------- */
function updateFx(dt) {
  for (const t of tracers) {
    if (t.life <= 0) continue;
    t.life -= dt;
    t.mesh.material.opacity = Math.max(0, t.life / 0.07) * 0.85;
    if (t.life <= 0) t.mesh.visible = false;
  }
  for (const s of sparks) {
    if (s.life <= 0) continue;
    s.life -= dt;
    s.vy -= 9 * dt;
    s.mesh.position.x += s.vx * dt;
    s.mesh.position.y += s.vy * dt;
    s.mesh.position.z += s.vz * dt;
    s.mesh.material.opacity = clamp(s.life / 0.3, 0, 1);
    if (s.life <= 0 || s.mesh.position.y < 0) s.mesh.visible = false;
  }
  if (muzzleT > 0) {
    muzzleT -= dt;
    if (muzzleT <= 0) { muzzleFlash.visible = false; muzzleLight.intensity = 0; }
  }
  S.recoil = Math.max(0, S.recoil - dt * 9);
  S.shakeT = Math.max(0, S.shakeT - dt);
  if (S.shakeT <= 0) S.shakeAmp = 0;
}

/* ---------- 17. 主更新（玩法推进，仅 playing 且未暂停时） ---------- */
function update(dt) {
  /* 倒计时 */
  S.timeLeft -= dt;
  S.elapsed = CFG.matchTime - S.timeLeft;
  if (S.timeLeft <= 10 && !S.warn10) {
    S.warn10 = true;
    AudioSys.warnBeep();
    toast('剩余 10 秒！', 'red', 2200);
  }
  if (S.timeLeft <= 0) {
    S.timeLeft = 0;
    endGame(false, '倒计时结束 — 装置起爆');
    return;
  }
  /* 移动输入 */
  let f = joy.f, r = joy.r;
  if (keys['w'] || keys['arrowup']) f += 1;
  if (keys['s'] || keys['arrowdown']) f -= 1;
  if (keys['d'] || keys['arrowright']) r += 1;
  if (keys['a'] || keys['arrowleft']) r -= 1;
  movePlayer(dt, f, r);
  /* 武器节奏 */
  S.fireCd = Math.max(0, S.fireCd - dt);
  S.dryT = Math.max(0, S.dryT - dt);
  if (S.firing) fireWeapon();
  if (S.reloading) {
    S.reloadT -= dt;
    if (S.reloadT <= 0) completeReload();
  } else if (S.autoReloadT > 0) {
    S.autoReloadT -= dt;
    if (S.autoReloadT <= 0 && S.ammo < CFG.magSize && S.reserve > 0) startReload();
  }
  /* 敌人 */
  for (const e of enemies) updateEnemy(e, dt, false);
  updateBolts(dt);
  updateFx(dt);
  /* 拆弹 */
  updateDefuse(dt);
  /* HUD / 相机 */
  syncCamera();
  syncHud();
}

function updateDefuse(dt) {
  const cleared = enemies.every((e) => !e.alive);
  const d = Math.hypot(player.x - DEVICE_POS.x, player.z - DEVICE_POS.z);
  const inRange = cleared && d <= CFG.defuseRange && Math.abs(player.y - DEVICE_POS.y) < 1.2;
  if (inRange && S.interactHeld && S.objState !== 'complete') {
    if (S.objState !== 'defusing') S.objState = 'defusing';
    S.defuse = Math.min(1, S.defuse + dt * 1000 / CFG.defuseMs);
    S.tickAcc += dt;
    if (S.tickAcc > 0.24) { S.tickAcc = 0; AudioSys.tick(); }
    if (S.defuse >= 1) {
      S.objState = 'complete';
      endGame(true, '装置已安全拆除');
      return;
    }
  } else {
    S.tickAcc = 0;
    if (S.defuse > 0) {
      S.defuse = Math.max(0, S.defuse - dt * 0.75);
      if (S.defuse <= 0 && S.objState === 'defusing') S.objState = 'ready';
    } else if (S.objState === 'defusing') {
      S.objState = cleared ? 'ready' : 'locked';
    }
    /* 未清场时尝试交互的提示 */
    if (S.interactHeld && !cleared && d <= CFG.defuseRange + 1.5 && S.dryT <= 0) {
      S.dryT = 1.2;
      AudioSys.dry();
      toast('装置仍被锁定 — 先清除所有哨兵！', 'red', 1800);
    }
  }
  progressPillar.visible = S.defuse > 0.005;
  progressPillar.scale.y = Math.max(0.001, S.defuse * 1.5);
  progressPillar.position.y = 0.56 + (S.defuse * 1.5) / 2;
}

/* ---------- 18. HUD 同步 ---------- */
const hudCache = {};
function setTxt(node, v) {
  if (hudCache[node.id] !== v) { hudCache[node.id] = v; node.textContent = v; }
}
let pipsBuilt = false;
function buildPips() {
  if (pipsBuilt) return;
  pipsBuilt = true;
  for (let i = 0; i < ENEMY_DEFS.length; i++) el.enemyPips.appendChild(document.createElement('i'));
}
function syncHud() {
  const hp = Math.ceil(S.hp);
  setTxt(el.hpNum, String(hp));
  el.hpFill.style.width = hp + '%';
  el.hpFill.className = hp <= 25 ? 'low' : hp <= 55 ? 'mid' : '';
  el.hpNum.className = 'mono' + (hp <= 25 ? ' low' : '');
  const total = Math.ceil(Math.max(0, S.timeLeft));
  const mm = Math.floor(total / 60), ss = total % 60;
  setTxt(el.timer, mm + ':' + String(ss).padStart(2, '0'));
  el.timer.className = 'mono' + (S.timeLeft <= 10 ? ' warn' : '');
  setTxt(el.ammoMag, String(S.ammo));
  setTxt(el.ammoRes, String(S.reserve));
  el.ammoMag.className = 'mono' + (S.ammo === 0 ? ' dry' : '');
  el.reloadBar.firstElementChild.style.width = S.reloading ? ((1 - S.reloadT / CFG.reloadTime) * 100) + '%' : '0%';
  if (S.reloading && el.reloadHint.hidden) el.reloadHint.hidden = false;
  if (!S.reloading && !el.reloadHint.hidden) el.reloadHint.hidden = true;
  /* 敌人存活指示 */
  const pips = el.enemyPips.children;
  for (let i = 0; i < pips.length; i++) {
    const down = !enemies[i].alive;
    if (pips[i].classList.contains('down') !== down) pips[i].classList.toggle('down', down);
  }
  /* 目标文本 */
  const alive = enemies.filter((e) => e.alive).length;
  let obj;
  if (S.objState === 'locked') obj = '清除哨兵 <span class="hl">' + (ENEMY_DEFS.length - alive) + '/' + ENEMY_DEFS.length + '</span>';
  else if (S.objState === 'defusing') obj = '拆除中 <span class="cy">' + Math.round(S.defuse * 100) + '%</span>';
  else if (S.objState === 'complete') obj = '<span class="cy">装置已拆除</span>';
  else obj = '前往栈台 · 长按 <span class="hl">E</span> 拆除';
  if (hudCache.obj !== obj) { hudCache.obj = obj; el.objText.innerHTML = obj; }
  /* 罗盘 */
  const dx = DEVICE_POS.x - player.x, dz = DEVICE_POS.z - player.z;
  const rel = normA(S.yaw + Math.PI - Math.atan2(dx, dz));
  el.compassArrow.style.transform = 'translate(-50%,-50%) rotate(' + (rel * 180 / Math.PI).toFixed(1) + 'deg)';
  setTxt(el.compassDist, Math.round(Math.hypot(dx, dz)) + 'm');
  /* 受伤红晕 */
  const lowHp = S.hp < 40 ? (1 - S.hp / 40) * 0.6 : 0;
  el.vignette.style.opacity = String(clamp(lowHp + S.flashT * 0.5, 0, 0.85));
  el.vignette.classList.toggle('pulse', S.hp < 25 && S.hp > 0);
  S.flashT = Math.max(0, S.flashT - 0.03);
  el.dmgFlash.style.opacity = String(clamp(S.flashT, 0, 0.6));
  /* 准星扩散 */
  el.crosshair.classList.toggle('spread', S.fireCd > 0 || S.reloading);
}

/* ---------- 19. 提示 ---------- */
function toast(text, kind, ms) {
  el.toast.textContent = text;
  el.toast.className = kind || '';
  el.toast.hidden = false;
  requestAnimationFrame(() => el.toast.classList.add('on'));
  clearTimeout(S.toastTimer);
  S.toastTimer = setTimeout(() => {
    el.toast.classList.remove('on');
    setTimeout(() => { el.toast.hidden = true; }, 260);
  }, ms || 2600);
}

/* ---------- 20. 流程控制 ---------- */
function resetGame() {
  clearTimeout(S.endTimer);
  S.timeLeft = CFG.matchTime;
  S.elapsed = 0;
  S.hp = CFG.playerHP;
  S.ammo = CFG.magSize;
  S.reserve = CFG.reserveStart;
  S.reloading = false; S.reloadT = 0;
  S.fireCd = 0; S.dryT = 0; S.autoReloadT = 0;
  S.yaw = SPAWN.yaw; S.pitch = 0;
  S.recoil = 0; S.shakeT = 0; S.shakeAmp = 0;
  S.bobPhase = 0; S.bobAmp = 0;
  S.firing = false; S.interactHeld = false;
  S.defuse = 0; S.objState = 'locked';
  S.kills = 0; S.shots = 0; S.hits = 0; S.headshots = 0; S.dmgTaken = 0;
  S.warn10 = false; S.tickAcc = 0; S.flashT = 0;
  player.x = SPAWN.x; player.y = 0; player.z = SPAWN.z;
  joy.f = 0; joy.r = 0;
  for (const e of enemies) resetEnemy(e);
  for (const b of bolts) { b.life = 0; b.mesh.visible = false; }
  for (const s of sparks) { s.life = 0; s.mesh.visible = false; }
  for (const t of tracers) { t.life = 0; t.mesh.visible = false; }
  muzzleFlash.visible = false; muzzleLight.intensity = 0; muzzleT = 0;
  device.userData.screen.material.color.setHex(0xff4d4d);
  progressPillar.visible = false;
  el.vignette.style.opacity = '0';
  el.dmgFlash.style.opacity = '0';
  el.vignette.classList.remove('pulse');
  buildPips();
  syncCamera();
  syncHud();
}

function beginGame() {
  AudioSys.ensure();
  resetGame();
  S.phase = 'playing';
  S.paused = false;
  el.menu.hidden = true;
  el.pauseOv.hidden = true;
  el.endOv.hidden = true;
  el.hud.hidden = false;
  document.body.classList.remove('phase-menu');
  toast('① 清除 5 名哨兵 ② 登上北侧栈台长按 E 拆除（75 秒）', '', 4200);
  if (!IS_TOUCH) tryLock();
  syncCamera();
}

function toMenu() {
  clearTimeout(S.endTimer);
  S.phase = 'menu';
  S.paused = false;
  S.firing = false; S.interactHeld = false;
  el.hud.hidden = true;
  el.pauseOv.hidden = true;
  el.endOv.hidden = true;
  el.menu.hidden = false;
  document.body.classList.add('phase-menu');
  if (document.pointerLockElement === canvas) document.exitPointerLock();
  refreshBestLine();
}

function pauseGame(reason) {
  if (S.phase !== 'playing' || S.paused) return false;
  S.paused = true;
  S.firing = false;
  S.interactHeld = false;
  el.pauseReason.textContent = reason || '';
  el.pauseOv.hidden = false;
  if (document.pointerLockElement === canvas) document.exitPointerLock();
  return true;
}
function resumeGame() {
  if (S.phase !== 'playing' || !S.paused) return false;
  S.paused = false;
  el.pauseOv.hidden = true;
  if (!IS_TOUCH && !S.plError) tryLock();
  return true;
}

function computeScore(won) {
  let s = S.hits * 10 + S.headshots * 15 + S.kills * 120 - Math.round(S.dmgTaken) * 2;
  if (won) s += Math.round(Math.max(0, S.timeLeft) * 8);
  return Math.max(0, Math.round(s));
}

function endGame(won, reason) {
  if (S.phase !== 'playing') return;
  S.phase = won ? 'won' : 'lost';
  S.firing = false;
  S.interactHeld = false;
  if (document.pointerLockElement === canvas) document.exitPointerLock();
  if (won) AudioSys.win(); else AudioSys.lose();
  const score = computeScore(won);
  const elapsed = CFG.matchTime - Math.max(0, S.timeLeft);
  let record = false;
  if (won && (best.time === null || elapsed < best.time)) { best.time = Math.round(elapsed * 10) / 10; record = true; }
  if (best.score === null || score > best.score) { best.score = score; record = true; }
  try {
    if (best.time !== null) localStorage.setItem('bp3d.bestTime', String(best.time));
    if (best.score !== null) localStorage.setItem('bp3d.bestScore', String(best.score));
  } catch (e) { /* 忽略 */ }
  S.endTimer = setTimeout(() => {
    if (S.phase !== 'won' && S.phase !== 'lost') return;
    el.endTitle.textContent = won ? '任务完成' : '任务失败';
    el.endTitle.className = 'ovTitle ' + (won ? 'win' : 'lose');
    el.endReason.textContent = reason || '';
    const acc = S.shots > 0 ? Math.round(S.hits / S.shots * 100) : 0;
    const rows = [
      ['用时', elapsed.toFixed(1) + ' s'],
      ['命中率', acc + '% (' + S.hits + '/' + S.shots + ')'],
      ['击杀', S.kills + ' / ' + ENEMY_DEFS.length],
      ['爆头', String(S.headshots)],
      ['承受伤害', String(Math.round(S.dmgTaken))],
      ['得分', String(score)],
      ['最佳纪录', (best.time !== null ? best.time + 's' : '--') + ' · ' + (best.score !== null ? best.score + '分' : '--')],
    ];
    el.endStats.innerHTML = rows.map((r) => '<div class="srow"><span>' + r[0] + '</span><b>' + r[1] + '</b></div>').join('');
    el.endRecord.hidden = !record;
    el.endOv.hidden = false;
  }, won ? 500 : 750);
}

function refreshBestLine() {
  if (best.time !== null || best.score !== null) {
    el.bestLine.hidden = false;
    el.bestLine.textContent = '最佳纪录 — 用时 ' + (best.time !== null ? best.time + 's' : '--') +
      ' · 得分 ' + (best.score !== null ? best.score : '--');
  } else el.bestLine.hidden = true;
}

/* ---------- 21. 输入：键盘 / 鼠标 / 指针锁定 ---------- */
window.addEventListener('keydown', (ev) => {
  const k = ev.key.toLowerCase();
  if (S.phase === 'playing' && !ev.repeat) {
    if (k === 'r') startReload();
    if (k === 'e') S.interactHeld = true;
  }
  if (k === 'escape' || k === 'p') {
    if (S.phase === 'playing') {
      /* 刚因 Esc 退出指针锁而暂停时，忽略紧随其后的同一次 Esc */
      const justUnlocked = k === 'escape' && performance.now() - unlockStamp < 350;
      if (S.paused) { if (!justUnlocked) resumeGame(); }
      else pauseGame('手动暂停');
      ev.preventDefault();
      return;
    }
  }
  if (k === 'm') toggleMute();
  if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) {
    if (S.phase === 'playing') keys[k] = true;
    if (k.startsWith('arrow') || k === ' ') ev.preventDefault();
  }
});
window.addEventListener('keyup', (ev) => {
  const k = ev.key.toLowerCase();
  keys[k] = false;
  if (k === 'e') S.interactHeld = false;
});
window.addEventListener('blur', () => {
  for (const k in keys) keys[k] = false;
  S.firing = false; S.interactHeld = false;
  if (S.phase === 'playing' && !S.paused) pauseGame('窗口失焦，已自动暂停');
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden && S.phase === 'playing' && !S.paused) pauseGame('页面切换，已自动暂停');
});

/* 鼠标视角 */
let mouseDown = false, mouseDownT = 0, mouseMoved = 0, lastMX = 0, lastMY = 0;
let unlockStamp = 0;
document.addEventListener('pointerlockchange', () => {
  const locked = document.pointerLockElement === canvas;
  S.plLocked = locked;
  if (!locked) {
    unlockStamp = performance.now();
    /* 锁定意外丢失（例如 Esc）→ 暂停 */
    if (S.phase === 'playing' && !S.paused) pauseGame('已退出鼠标锁定');
  }
});
document.addEventListener('pointerlockerror', () => {
  S.plError = true;
  enableDragLook();
});
function enableDragLook() {
  S.dragLook = true;
  el.hintDrag.hidden = false;
  el.touchUI.hidden = false;   /* 复用触屏按钮作为降级操作 */
  if (!IS_TOUCH) {
    el.stickZone.style.display = 'none';
    el.lookZone.style.display = 'none';
  }
  document.body.classList.add('draglook');
}
function tryLock() {
  if (!('pointerLockElement' in document)) { enableDragLook(); return; }
  try {
    const p = canvas.requestPointerLock();
    if (p && typeof p.catch === 'function') p.catch(() => { S.plError = true; enableDragLook(); });
  } catch (e) {
    S.plError = true;
    enableDragLook();
  }
}
function applyLook(dx, dy, sens) {
  S.yaw -= dx * sens;
  S.pitch = clamp(S.pitch - dy * sens, -CFG.pitchLim, CFG.pitchLim);
}
document.addEventListener('mousemove', (ev) => {
  if (S.phase !== 'playing' || S.paused) return;
  if (S.plLocked) {
    applyLook(ev.movementX || 0, ev.movementY || 0, CFG.sens);
  } else if (S.dragLook && mouseDown) {
    const dx = ev.clientX - lastMX, dy = ev.clientY - lastMY;
    applyLook(dx, dy, CFG.sens * 1.35);
    mouseMoved += Math.abs(dx) + Math.abs(dy);
    lastMX = ev.clientX; lastMY = ev.clientY;
  }
});
canvas.addEventListener('mousedown', (ev) => {
  if (ev.button !== 0) return;
  if (S.phase !== 'playing' || S.paused) return;
  AudioSys.ensure();
  if (S.plLocked) {
    S.firing = true;
  } else if (S.dragLook) {
    mouseDown = true;
    mouseDownT = performance.now();
    mouseMoved = 0;
    lastMX = ev.clientX; lastMY = ev.clientY;
  }
});
window.addEventListener('mouseup', (ev) => {
  if (ev.button !== 0) return;
  S.firing = false;
  if (S.dragLook && mouseDown) {
    mouseDown = false;
    const quick = performance.now() - mouseDownT < 260 && mouseMoved < 7;
    if (quick && S.phase === 'playing' && !S.paused) fireWeapon();
  }
});
canvas.addEventListener('contextmenu', (ev) => ev.preventDefault());

/* ---------- 22. 输入：触摸 ---------- */
let stickTouch = null, lookTouch = null;
const stickOrigin = { x: 0, y: 0 };
el.stickZone.addEventListener('touchstart', (ev) => {
  ev.preventDefault();
  if (S.phase !== 'playing') return;
  for (const t of ev.changedTouches) {
    if (stickTouch === null) {
      stickTouch = t.identifier;
      stickOrigin.x = t.clientX; stickOrigin.y = t.clientY;
      el.stickBase.hidden = false;
      el.stickBase.style.left = t.clientX + 'px';
      el.stickBase.style.top = t.clientY + 'px';
    }
  }
}, { passive: false });
el.stickZone.addEventListener('touchmove', (ev) => {
  ev.preventDefault();
  for (const t of ev.changedTouches) {
    if (t.identifier !== stickTouch) continue;
    let dx = t.clientX - stickOrigin.x, dy = t.clientY - stickOrigin.y;
    const len = Math.hypot(dx, dy), max = 52;
    if (len > max) { dx = dx / len * max; dy = dy / len * max; }
    el.stickNub.style.transform = 'translate(calc(-50% + ' + dx + 'px), calc(-50% + ' + dy + 'px))';
    joy.r = dx / max; joy.f = -dy / max;
  }
}, { passive: false });
function stickEnd(ev) {
  for (const t of ev.changedTouches) {
    if (t.identifier === stickTouch) {
      stickTouch = null;
      joy.f = 0; joy.r = 0;
      el.stickBase.hidden = true;
      el.stickNub.style.transform = 'translate(-50%,-50%)';
    }
  }
}
el.stickZone.addEventListener('touchend', stickEnd);
el.stickZone.addEventListener('touchcancel', stickEnd);

el.lookZone.addEventListener('touchstart', (ev) => {
  ev.preventDefault();
  for (const t of ev.changedTouches) {
    if (lookTouch === null) {
      lookTouch = t.identifier;
      lastMX = t.clientX; lastMY = t.clientY;
    }
  }
}, { passive: false });
el.lookZone.addEventListener('touchmove', (ev) => {
  ev.preventDefault();
  if (S.phase !== 'playing' || S.paused) return;
  for (const t of ev.changedTouches) {
    if (t.identifier !== lookTouch) continue;
    applyLook(t.clientX - lastMX, t.clientY - lastMY, CFG.touchSens);
    lastMX = t.clientX; lastMY = t.clientY;
  }
}, { passive: false });
function lookEnd(ev) {
  for (const t of ev.changedTouches) if (t.identifier === lookTouch) lookTouch = null;
}
el.lookZone.addEventListener('touchend', lookEnd);
el.lookZone.addEventListener('touchcancel', lookEnd);

function holdButton(btn, onDown, onUp) {
  btn.addEventListener('pointerdown', (ev) => {
    ev.preventDefault();
    btn.setPointerCapture(ev.pointerId);
    btn.classList.add('active');
    AudioSys.ensure();
    onDown();
  });
  const up = (ev) => {
    ev.preventDefault();
    btn.classList.remove('active');
    onUp();
  };
  btn.addEventListener('pointerup', up);
  btn.addEventListener('pointercancel', up);
  btn.addEventListener('lostpointercapture', () => { btn.classList.remove('active'); onUp(); });
}
holdButton(el.btnFire, () => { if (S.phase === 'playing' && !S.paused) S.firing = true; }, () => { S.firing = false; });
holdButton(el.btnInteract, () => { if (S.phase === 'playing' && !S.paused) S.interactHeld = true; }, () => { S.interactHeld = false; });
el.btnReloadT.addEventListener('pointerdown', (ev) => { ev.preventDefault(); AudioSys.ensure(); startReload(); });

/* ---------- 23. 按钮 ---------- */
function toggleMute() {
  AudioSys.ensure();
  AudioSys.setMuted(!S.muted);
  el.btnMute.classList.toggle('muted', S.muted);
}
el.btnStart.addEventListener('click', () => beginGame());
el.btnPause.addEventListener('click', () => { if (S.phase === 'playing') { S.paused ? resumeGame() : pauseGame('手动暂停'); } });
el.btnRestart.addEventListener('click', () => { if (S.phase !== 'menu') beginGame(); });
el.btnMute.addEventListener('click', toggleMute);
el.btnResume.addEventListener('click', () => resumeGame());
el.btnRestartP.addEventListener('click', () => beginGame());
el.btnMuteP.addEventListener('click', toggleMute);
el.btnMenuP.addEventListener('click', () => toMenu());
el.btnAgain.addEventListener('click', () => beginGame());
el.btnMenuE.addEventListener('click', () => toMenu());

window.addEventListener('resize', fitRenderer);
window.addEventListener('orientationchange', fitRenderer);

/* ---------- 24. 主循环（单一 rAF，永不叠加） ---------- */
let lastFrame = performance.now();
let menuT = 0;
function frame(now) {
  requestAnimationFrame(frame);
  let dt = (now - lastFrame) / 1000;
  lastFrame = now;
  dt = clamp(dt, 0, 0.05);
  if (S.phase === 'playing' && !S.paused && !S.manualClock) {
    update(dt);
  } else if (S.phase === 'menu') {
    /* 菜单巡航镜头 + 敌人巡逻（装饰） */
    menuT += dt;
    const a = menuT * 0.07;
    camera.position.set(Math.sin(a) * 46, 24 + Math.sin(menuT * 0.21) * 3, Math.cos(a) * 46 + 6);
    camera.lookAt(0, 1.5, -8);
    for (const e of enemies) updateEnemy(e, dt, true);
  }
  /* 环境动画（装饰，不影响玩法状态） */
  ambient(dt, now / 1000);
  if (isWebGL) renderer.render(scene, camera);
}
function ambient(dt, t) {
  /* 海面 */
  if (!REDUCED) {
    const pos = waterGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = waterBase[i * 3], y = waterBase[i * 3 + 1];
      pos.setZ(i, Math.sin(x * 0.32 + t * 1.15) * 0.13 + Math.sin(y * 0.21 + t * 0.72) * 0.1);
    }
    pos.needsUpdate = true; /* flatShading 由片元导数计算法线，无需重算顶点法线 */
  }
  for (let i = 0; i < buoys.length; i++) {
    buoys[i].position.y = -0.2 + Math.sin(t * 1.3 + i * 2.1) * 0.14;
    buoys[i].rotation.z = Math.sin(t * 0.9 + i) * 0.08;
  }
  for (const c of clouds) {
    c.position.x += dt * 0.55;
    if (c.position.x > 90) c.position.x = -160;
  }
  lhBeamPivot.rotation.y += dt * 0.75;
  /* 装置信标 */
  const ready = S.objState !== 'locked';
  const pulse = 0.75 + Math.sin(t * (ready ? 4.2 : 2.4)) * 0.25;
  deviceCore.material.emissiveIntensity = (ready ? 1.15 : 0.75) * pulse;
  deviceCore.rotation.y += dt * (ready ? 1.6 : 0.7);
  deviceCore.position.y = 1.05 + Math.sin(t * 2.2) * 0.05;
  beacon.material.opacity = (ready ? 0.2 : 0.12) * pulse;
  beaconRing.rotation.z += dt * 1.2;
  beaconRing.position.y = 2.6 + ((t * 0.8) % 1) * 3.2;
  beaconRing.material.opacity = 0.6 * (1 - ((t * 0.8) % 1));
  beaconGem.rotation.y += dt * 2.2;
  /* 引导箭头呼吸 */
  for (let i = 0; i < chevrons.length; i++) {
    chevrons[i].material.opacity = 0.2 + 0.2 * (0.5 + 0.5 * Math.sin(t * 3 - i * 0.9));
  }
  /* 武器摆动（玩法相关但纯视觉，暂停时冻结） */
  if (S.phase === 'playing' && !S.paused) {
    const bob = Math.sin(S.bobPhase) * 0.009 * S.bobAmp * (REDUCED ? 0.3 : 1);
    const bob2 = Math.cos(S.bobPhase * 0.5) * 0.006 * S.bobAmp * (REDUCED ? 0.3 : 1);
    weapon.position.set(WEAPON_BASE.x + bob2, WEAPON_BASE.y + bob, WEAPON_BASE.z + S.recoil * 0.055);
    weapon.rotation.x = S.recoil * 0.05 + (S.reloading ? Math.sin(Math.min(1, 1 - S.reloadT / CFG.reloadTime) * Math.PI) * 0.5 : 0);
  }
}

/* ---------- 25. 测试接口 __BREACH_TEST__ ---------- */
function snapshot() {
  return {
    phase: S.phase,
    paused: S.paused,
    timeLeft: Math.round(Math.max(0, S.timeLeft) * 100) / 100,
    player: {
      x: r3(player.x), y: r3(player.y), z: r3(player.z),
      yaw: r3(normA(S.yaw)), pitch: r3(S.pitch),
      hp: Math.round(S.hp), ammo: S.ammo, reserve: S.reserve, reloading: S.reloading,
    },
    enemies: enemies.map((e) => ({
      id: e.id, x: r3(e.x), y: r3(e.y), z: r3(e.z),
      hp: Math.max(0, Math.round(e.hp)), state: e.state, alive: e.alive,
    })),
    objective: {
      state: S.objState,
      progress: Math.round(S.defuse * 1000) / 1000,
      x: DEVICE_POS.x, y: DEVICE_POS.y, z: DEVICE_POS.z,
    },
    stats: {
      shots: S.shots, hits: S.hits, headshots: S.headshots, kills: S.kills,
      damageTaken: Math.round(S.dmgTaken),
      score: computeScore(S.phase === 'won'),
      elapsed: Math.round(S.elapsed * 100) / 100,
    },
    renderer: {
      isWebGL,
      width: isWebGL ? renderer.domElement.width : 0,
      height: isWebGL ? renderer.domElement.height : 0,
      threeRevision: T.REVISION,
    },
  };
}
function apiSetPlayerPose(pose) {
  if (S.phase !== 'playing' || !pose) return false;
  /* 先设定高度，保证碰撞过滤使用正确脚底高度 */
  if (typeof pose.y === 'number') player.y = clamp(pose.y, 0, 6);
  if (typeof pose.x === 'number') player.x = clamp(pose.x, -CFG.bounds, CFG.bounds);
  if (typeof pose.z === 'number') player.z = clamp(pose.z, -CFG.bounds, CFG.bounds);
  /* 推出碰撞体 */
  for (let guard = 0; guard < 8 && circleBlocked(player.x, player.z, CFG.radius, player.y); guard++) {
    let pushed = false;
    for (const c of colliders) {
      if (c.maxY <= player.y + 0.35 || c.minY >= player.y + 1.5) continue;
      const cx = clamp(player.x, c.minX, c.maxX), cz = clamp(player.z, c.minZ, c.maxZ);
      const dx = player.x - cx, dz = player.z - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 < CFG.radius * CFG.radius) {
        if (d2 < 1e-9) { player.x = c.maxX + CFG.radius + 0.02; }
        else {
          const d = Math.sqrt(d2), push = (CFG.radius - d) + 0.02;
          player.x += dx / d * push; player.z += dz / d * push;
        }
        pushed = true;
      }
    }
    if (!pushed) break;
  }
  player.x = clamp(player.x, -CFG.bounds, CFG.bounds);
  player.z = clamp(player.z, -CFG.bounds, CFG.bounds);
  const gh = groundHeightAt(player.x, player.z);
  player.y = (typeof pose.y === 'number') ? Math.max(clamp(pose.y, 0, 6), gh) : gh;
  if (typeof pose.yaw === 'number') S.yaw = pose.yaw;
  if (typeof pose.pitch === 'number') S.pitch = clamp(pose.pitch, -CFG.pitchLim, CFG.pitchLim);
  syncCamera();
  return true;
}
function apiAimAtEnemy(id) {
  if (S.phase !== 'playing') return false;
  const e = enemies[Number(id)];
  if (!e || !e.alive) return false;
  const dx = e.x - player.x, dz = e.z - player.z;
  const hd = Math.hypot(dx, dz);
  S.yaw = Math.atan2(-dx, -dz);
  /* 瞄准躯干中心，保证测试期望确定（头部判定仍可用于真实瞄准） */
  S.pitch = clamp(Math.atan2((e.y + 1.0) - (player.y + CFG.eyeH), hd), -CFG.pitchLim, CFG.pitchLim);
  syncCamera();
  return { yaw: r3(normA(S.yaw)), pitch: r3(S.pitch) };
}
function apiInteract(ms) {
  if (S.phase !== 'playing' || S.paused || typeof ms !== 'number' || ms < 0) return S.defuse;
  const cleared = enemies.every((e) => !e.alive);
  const d = Math.hypot(player.x - DEVICE_POS.x, player.z - DEVICE_POS.z);
  const inRange = cleared && d <= CFG.defuseRange && Math.abs(player.y - DEVICE_POS.y) < 1.2;
  if (!inRange || S.objState === 'complete') return S.defuse;
  S.objState = 'defusing';
  S.defuse = Math.min(1, S.defuse + ms / CFG.defuseMs);
  if (S.defuse >= 1) {
    S.objState = 'complete';
    endGame(true, '装置已安全拆除');
  }
  return S.defuse;
}
window.__BREACH_TEST__ = {
  version: '1.0',
  snapshot,
  start() { if (S.phase !== 'playing') beginGame(); return S.phase; },
  restart() { beginGame(); return S.phase; },
  pause() { pauseGame('测试暂停'); return S.paused; },
  resume() { resumeGame(); return S.paused; },
  setManualClock(enabled) { S.manualClock = !!enabled; return S.manualClock; },
  step(ms) {
    if (S.phase !== 'playing' || S.paused || typeof ms !== 'number' || ms <= 0) return 0;
    let remaining = ms;
    while (remaining > 0 && S.phase === 'playing' && !S.paused) {
      const h = Math.min(remaining, 50);
      update(h / 1000);
      remaining -= h;
    }
    return ms - Math.max(0, remaining);
  },
  setPlayerPose: apiSetPlayerPose,
  move(forward, right, ms) {
    if (S.phase !== 'playing' || S.paused) return { x: r3(player.x), y: r3(player.y), z: r3(player.z) };
    movePlayer(Math.max(0, ms) / 1000, Number(forward) || 0, Number(right) || 0);
    syncCamera();
    return { x: r3(player.x), y: r3(player.y), z: r3(player.z) };
  },
  aimAtEnemy: apiAimAtEnemy,
  shoot() { return fireWeapon(); },
  reload() { return startReload(); },
  damagePlayer(amount) { return applyDamage(Number(amount) || 0); },
  eliminateEnemy(id) {
    if (S.phase !== 'playing' || S.paused) return false;
    const e = enemies[Number(id)];
    if (!e || !e.alive) return false;
    killEnemy(e, true);
    return true;
  },
  interact: apiInteract,
};

/* ---------- 26. 启动 ---------- */
function fatal(msg) {
  el.fatalMsg.textContent = msg;
  el.fatal.hidden = false;
}
try {
  if (!T) throw new Error('Three.js 未加载');
  if (!isWebGL) {
    fatal('当前环境无法创建 WebGL 渲染器，请更换浏览器后重试。');
  }
  fitRenderer();
  buildPips();
  refreshBestLine();
  resetGame();
  S.phase = 'menu';
  el.hud.hidden = true;
  el.menu.hidden = false;
  if (IS_TOUCH) el.touchUI.hidden = false;
  requestAnimationFrame((t) => { lastFrame = t; frame(t); });
} catch (err) {
  fatal(err && err.message ? err.message : String(err));
}

})();
